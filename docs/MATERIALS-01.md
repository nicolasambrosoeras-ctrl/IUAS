# MATERIALS-01 (D-δ.137)

## Objetivo

Agregar una segunda salida documental del proyecto, independiente de la
Memoria técnica: el **Listado de materiales**. Transforma los elementos
FÍSICAMENTE RESPALDADOS por el modelo actual (tuberías, accesorios
explícitamente modelados, medidores, componentes de almacenamiento y
artefactos sanitarios previstos) en un cómputo apto para presupuestar o
comprar, con un margen adicional de compra opcional que el usuario elige al
generar el documento.

Regla central: **CÓMPUTO TÉCNICO ≠ CANTIDAD PARA COMPRA**. El porcentaje de
margen no modifica el proyecto hidráulico, longitudes del modelo, DN,
pérdidas, presión ni la Memoria técnica -- es exclusivamente un parámetro de
generación del Listado de materiales.

## Arquitectura

Mismo patrón ADR-012 que la Memoria técnica (`resolverDatosDeInforme.ts` +
`generarDocumentoPdf.ts`), como una proyección **independiente y paralela**,
no una extensión de la Memoria:

```
Proyecto
   -> resolvers/motor existentes (resolverDiametroComercialDeTramo,
      resolverEstadoModulo3, etc. -- se INVOCAN de forma read-only, nunca se
      reimplementan ni se modifican)
   -> resolverDatosDeListadoDeMateriales(proyecto, catálogos)
      -> DatosComputoDeMateriales (snapshot PURO, cantidades COMPUTADAS,
         sin margen)
   -> aplicarMargenDeCompra(datos, porcentaje)
      -> DatosListadoDeMateriales (mismo snapshot + cantidades de COMPRA)
   -> construirDocDefinitionListadoMateriales(datos)
   -> pdfMake
   -> PDF
```

Archivos nuevos:

- `src/exportadores/pdf/resolverDatosDeListadoDeMateriales.ts`: resolver
  puro + `aplicarMargenDeCompra`.
- `src/exportadores/pdf/generarDocumentoPdfMateriales.ts`: renderer pdfMake
  + `generarDocumentoPdfMateriales(entrada)`.
- Botón y selector nuevos en `MotorDemandaPantalla.tsx`
  (`GenerarListadoDeMaterialesControl`), junto a "Generar memoria técnica".

`generarDocumentoPdf.ts` (Memoria técnica) exporta ahora sus primitivas
visuales (`COLOR_MARCA`, `COLOR_MARCA_FUERTE`, `COLOR_TEXTO_2`,
`layoutTablaIuas`, `sanitizarParaNombreDeArchivo`,
`formatearFechaDeGeneracion`) para que Materials reutilice la identidad IUAS
sin importar su `docDefinition` -- comparten estilo, no acoplamiento. Su
`construirDocDefinition`/`generarDocumentoPdf`/salida no cambiaron.

## Cantidad computada

La cantidad física derivada del modelo ANTES del margen de compra. Para
tuberías: suma de `Tramo.longitud_m` (longitud ADOPTADA/ALMACENADA) de los
Tramos del inventario plano `RedHidraulica.tramos` -- nunca la longitud
hidráulica efectiva de presión (que incorpora correcciones virtuales como
+3 m/piso).

## Longitud física

Fuente única: `Tramo.longitud_m`. Un segmento de Montante compartido por
varios Locales tiene una única entrada en `RedHidraulica.tramos`
(`Tramo.montanteId` referencia al Montante, nunca al revés) y se computa
**una sola vez** -- el resolver itera el inventario plano de Tramos, nunca
caminos hidráulicos hacia terminales (que sumarían la misma Montante una vez
por Local servido). Un Tramo con `longitud_m` ausente o ≤ 0 (CRIT-A20) se
excluye del cómputo y se declara en "Elementos pendientes de definición".

## Margen adicional

Parámetro de GENERACIÓN, no del Proyecto: `porcentajeExtraCompra` (0-100,
validado por `aplicarMargenDeCompra`, que lanza ante NaN/negativo/Infinity/
>100) nunca se persiste (no toca `schema`, `migraciones`, `autosave` ni
`.iuas`). Selector en UI: presets 0/5/10/15/20 % + "Personalizado" (input
numérico validado en el mismo rango), valor inicial 0 %.

- Tuberías: `longitudCompra_m = longitudComputada_m × (1 + p/100)`, sin
  redondear internamente (display: 2 decimales).
- Accesorios/Tees (piezas discretas): `cantidadCompra = ceil(cantidadComputada × (1 + p/100))`
  -- intencionalmente hacia arriba (1 pieza + 1 % → 2).
- Medidores, almacenamiento y artefactos: SIN margen (mostrar una columna
  "Extra 0 %" sugeriría que podría aplicarse).

Invariante verificado por tests: para cualquier `p`, `longitudComputada_m`/
`cantidadComputada` de la salida son idénticos a los de la entrada; sólo
cambian los campos `*Compra*`.

## Tuberías

Agrupación: Material (nombre comercial del catálogo, ej. "PPR") + Red (AF/AC,
nunca fusionadas) + DN comercial (`denominacionComercial` del catálogo, ej.
"20 mm" -- nunca `Di` real). El DN se resuelve invocando
`resolverDiametroComercialDeTramo` (motor, ya productivo) por cada Tramo; el
resultado `'conCandidato'` es el único que aporta al cómputo -- `'sinDemanda'`
y `'sinCandidatoAdmisible'` van a pendientes, nunca se inventa un DN. Se
agrega además un "Resumen consolidado de tuberías" (Material + DN, AF+AC
sumadas) sin perder el detalle AF/AC.

## Accesorios explícitos

Sólo `Tramo.accesorios` en modo `metodoPerdidaLocalizada === 'detallado'`
(tipo + cantidad + DN del Tramo asociado, agrupados por tipo+DN). El nombre
humano reutiliza `nombreDeAccesorio` (Tabla N°7, ya usado por el editor de
accesorios) -- ninguna etiqueta propia desincronizable.

## HYD-EST excluido

En modo `'estimado'` no se lee `Tramo.accesorios` en absoluto: los K's
estimados (tee=3,00, singularidad terminal=1,35, llave de paso=9,18) son una
fórmula de pérdida de carga agregada por (Local, Red), nunca un relevamiento
físico, y jamás se convierten en piezas de compra. Cubierto por test
negativo explícito.

## Tee nodal

Computable como pieza única ("Tee DN entrada × recta × lateral") sólo cuando
el nodo es una bifurcación real 1→2 con `Nodo.tee` configurado y el DN
comercial de sus 3 Tramos conectados resuelve `'conCandidato'`. CRIT-A30 se
preserva sin cambios: un cambio de DN entre Tramos consecutivos NUNCA genera
una "Reducción" inferida (sólo cuenta si está declarada explícitamente en
`Tramo.accesorios`). Dos casos van a "Elementos pendientes de definición" sin
inventar nada:

- `Nodo.tee === undefined` sobre una bifurcación real 1→2 ("Tee sin
  configurar").
- Fan-out 1→N con N≥3 ("Derivación múltiple no modelada -- requiere
  especificación"), mismo criterio que el motor de presión
  (`resolverClasificacionDeTee`).

## Medidores

Reutiliza `resolverEstadoModulo3` (mismo orquestador que M3, sin
reimplementar Tabla N°6 ni Qc): medidor general (si resuelto) + cada medidor
individual evaluado, con su DN adoptado. Si M3 no está iniciado o está en
error, la sección queda vacía (no bloquea el resto del listado); si está
`'incompleto'`, se listan los medidores parciales evaluados y se agrega un
pendiente. Sin margen de compra.

## Equipos

`ConfiguracionDeAbastecimiento` leída directamente (sin invocar
`resolverEstadoModulo4`, que no aporta datos adicionales para este cómputo):
`volumenTanqueElevadoAdoptado_m3` / `volumenTanqueBombeoAdoptado_m3` cuando
están definidos y son > 0, con el esquema (`tanqueElevado` /
`cisternaBombeoElevado`) filtrando cuáles aplican. El modelo no define
ningún dato de bomba (potencia, caudal, modelo): con esquema
`'cisternaBombeoElevado'` se agrega el pendiente "Sistema de bombeo
requerido -- no dimensionado por este módulo", nunca se inventa una
especificación comercial. Sin margen de compra.

## Artefactos

`Local.artefactos` con `origen === 'normativo'`, agrupados por nombre humano
del catálogo y sumando `cantidad` -- una sola vez por instancia física,
nunca desdoblado por AF/AC (un artefacto con conectividad `'ambas'` cuenta 1
vez, igual que ya garantiza `contribucionesCentral` en M3). Sin margen de
compra.

## Proyecto incompleto

El listado se genera aunque M3/M4 no estén iniciados o la Verificación no se
haya evaluado: esas secciones simplemente quedan vacías con una nota
("Módulo 3 (Medidores) no está evaluado todavía.", etc.) -- nunca se exige un
proyecto hidráulicamente completo. Un Tramo de M2 sin DN adoptable pasa a
"Elementos pendientes de definición" en vez de excluir todo el documento.

## PDF

Documento operativo, header compacto (sin portada extensa): IUAS / "Listado
de materiales" / "Instalaciones internas de agua" / Proyecto / Fecha /
Margen, y la tabla arranca en la misma página. Secciones: Tuberías (detalle +
consolidado), Accesorios, Medidores, Equipos y almacenamiento, Artefactos
previstos, Observaciones y alcance (con "Elementos pendientes de
definición" cuando corresponde). Metadata: title "IUAS — Listado de
materiales", subject "Instalaciones internas de agua", author "IUAS".
Filename: `IUAS_Listado_de_materiales_<proyecto>.pdf` (mismo sanitizador que
la Memoria).

## Fuera de alcance

- Transformar metros en barras/rollos comerciales (requiere catálogo
  comercial por fabricante/presentación).
- Marcas, códigos de producto, precios o presupuesto (este documento nunca
  dice "presupuesto").
- Dimensionar o especificar una bomba concreta.
- Export CSV/XLSX.

## MATERIALS-02 (futuro, sólo registrado)

Si se decide en el futuro: longitud comercial de barras/rollos y cantidad de
barras, marcas/familias, códigos de producto, precios, presupuesto, export
CSV/XLSX. No implementado en este slice.
