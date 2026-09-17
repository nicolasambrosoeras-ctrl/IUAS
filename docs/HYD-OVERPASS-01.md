# HYD-OVERPASS-01 (D-δ.143) — Integrar el sobrepaso al modelo hidráulico y al catálogo

## Causa del defecto

Antes de este slice, `resolverAccesoriosConstructivosDreza.ts` generaba el
"Sobrepaso" como una fila genérica del listado de materiales: 1 por
Artefacto conectado a **cualquier** red del Local, sin distinguir AF de AC
(`red: undefined`) y sin DN (`dnComercial: undefined`, mostrado como
"DN a definir" desde MATERIALS-PDF-POLISH-02). No estaba vinculado a
ningún Tramo hidráulico real, así que:

- no aportaba `K` al balance de pérdidas localizadas (`hf`);
- no participaba de la selección de DN comercial;
- no tenía trazabilidad de catálogo/código comercial.

Es decir: una pieza física real (un tramo de caño que sale de pared/piso
para alimentar un artefacto) vivía exclusivamente como una aproximación de
compra, desconectada de la topología y del cálculo.

## Reglas AF/AC (sin cambios respecto del brief)

Un solo sobrepaso por Artefacto conectado, nunca dos por un Artefacto
AF+AC:

1. Artefacto con AF+AC → asignado a la rama terminal de **AC**.
2. Artefacto con AF solamente → asignado a AF.
3. Artefacto con AC solamente → asignado a AC.
4. Elementos no alimentados (sin terminal físico) no generan sobrepaso.

Implementado en `contarSobrepasosDeLocalPorRed`
(`motor/tuberias/topologia/`), **única fuente de verdad** consumida tanto
por el balance hidráulico (`resolverPerdidaLocalizadaEstimadaDeLocal.ts`)
como por Materials (`resolverAccesoriosConstructivosDreza.ts`) — ambos
consumidores no pueden divergir porque llaman a la misma función pura.

## Fuente oficial de DN y códigos

Manual Técnico Acqua System (Grupo Dema), extraído y verificado
directamente del PDF (`pdfjs-dist`, texto real, no asumido):

| DN | Código |
|---:|---|
| 20 mm | `08-084020000` |
| 25 mm | `08-084025000` |
| 32 mm | `08-084032000` |

Fuente: https://www.grupodema.com.ar/bundles/app/front/images/Manual-Acqua-System-03-03-2026.pdf
(pág. 51 del manual: "Sobrepaso fusión").

`catalogoSobrepasoAcquaSystem.ts` (`motor/tuberias/materialTuberia/`)
transcribe esta tabla y expone `resolverProductoSobrepasoAcquaSystem(dn)`,
que devuelve `{ tipo: 'resuelto', producto }` o `{ tipo: 'dnNoDisponible',
dnComercial }` — nunca un código inventado para un DN fuera de {20,25,32}.

## Procedencia exacta del `K` — decisión roja resuelta por el usuario

El manual **no publica** un coeficiente de resistencia propio para
"Sobrepaso fusión". Ante esto, la investigación (extracción del texto real
del manual, pág. 34: "Coeficiente de resistencia de carga para accesorios
Acqua System®") encontró que el catálogo interno tampoco tenía un id
"sobrepaso" en `tabla-07-perdidas-localizadas` (ERAS-2023): el candidato
más cercano por descripción física era `tuboSaliente` (Ks=1,00, "Salida de
pared/piso sin cambio de dirección adicional").

Se presentó esto al usuario como decisión roja (no se adoptó
unilateralmente). El usuario resolvió explícitamente:

1. **No identificar el sobrepaso con `tuboSaliente`** (ERAS-2023/Tabla N°7).
2. **Crear un catálogo de K diferenciado por sistema/material**:
   - Hierro y demás sistemas regidos por la Guía ERAS-2023: conservan
     `tabla-07-perdidas-localizadas` completa y sin cambios.
   - PPR Acqua System: catálogo propio (`catalogoKAccesoriosAcquaSystem.ts`),
     transcripción de la tabla oficial "Coeficiente de resistencia de carga
     para accesorios Acqua System®" (pág. 34 del manual, verificada dato
     por dato, incluyendo el ejemplo numérico resuelto de pág. 33: 10
     uniones × 0,25 + 10 codos 90° × 2,00 = 22,5 — confirma la
     correspondencia ítem↔valor).
3. **`K_sobrepaso = 1,20`**, adoptado por el usuario como equivalencia de
   ingeniería: dos cambios sucesivos de dirección, modelados como dos
   codos a 45° del propio catálogo Acqua System (ítem 4, Ks=0,60 cada
   uno) → `2 × 0,60 = 1,20`. Documentado explícitamente como valor
   **adoptado por el proyecto**, no publicado por el fabricante para esa
   pieza — revisable si Acqua System publica en el futuro un coeficiente
   propio.
4. IDs mantenidos separados: `tuboSaliente` (ERAS, sin cambios) y
   `sobrepaso` (nuevo, exclusivo del catálogo Acqua System — nunca
   accesible desde Tabla N°7).

## Catálogo Acqua System transcrito (`catalogoKAccesoriosAcquaSystem.ts`)

De las piezas ya representables como `AccesorioDeTramo`
(`uniones`, `curva45`, `curva90`, `codo90`, `llaveDePaso`, `valvulaEsclusa`,
`reducciones`, `tuboSaliente`), el manual publica coeficiente propio para:

| id | Producto Acqua System | Ks |
|---|---|---:|
| `uniones` | Unión normal | 0,25 |
| `reducciones` | Buje reducción de diámetros inmediatos | 0,55 |
| `codo90` | Codo a 90º | 2,00 |
| `curva90` | (mismo producto que `codo90` — Acqua no fabrica una curva distinta) | 2,00 |
| `curva45` | Codo a 45º | 0,60 |
| `sobrepaso` | Sobrepaso fusión (adoptado, ver arriba) | 1,20 |

**Cobertura parcial, a propósito** (documentado en el código, no oculto):

- `llaveDePaso` y `valvulaEsclusa`: el manual no publica un coeficiente
  propio → conservan el valor de Tabla N°7 (ERAS-2023) incluso bajo Acqua
  System. Nunca se inventa un valor.
- `reducciones`: el manual publica dos valores ("diámetros inmediatos"
  0,55 y "diámetros mediatos" 0,85, sin definir el límite exacto entre
  ambos en el texto disponible). Se adoptó el de "diámetros inmediatos"
  (un único escalón comercial, el caso más frecuente) como decisión de
  ingeniería de este slice — **decisión roja diferida**, documentada como
  limitación conocida (no como comportamiento cerrado): si un incremento
  futuro necesita distinguir el salto de diámetro de una reducción
  declarada, requiere revisar este punto.
- Las 8 filas de "Te" del manual (ítems 5/5a/6/6a/7/7a/8/8a) no se
  transcribieron: dependen de la combinación específica de diámetros de
  cada rama (gráfico no disponible como texto) y el modelo de dominio no
  representa Tee sobre `Tramo.accesorios` (viven en `Nodo.tee`, fuera de
  este catálogo, CRIT-A28) — no se fuerza una equivalencia sin base
  documentada.
- HYD-EST (`resolverPerdidaLocalizadaEstimadaDeLocal.ts`, D-δ.40/D-δ.45)
  sigue usando ÚNICAMENTE Tabla N°7 para sus constantes propias
  (`KS_ESTIMADO_TEE`/`KS_ESTIMADO_SINGULARIDAD_TERMINAL`/
  `KS_ESTIMADO_LLAVE_DE_PASO`): es una pérdida equivalente conservadora,
  documentada como decisión de producto cerrada (D-δ.40/D-δ.45), no una
  reconstrucción de accesorios físicos — fuera de alcance de este slice,
  no reabierta.

## Selección de catálogo (dominio hidráulico, no UI ni PDF)

`resolverKsDeAccesorioDeTramo(id, sistemaDeTuberiaId)`
(`motor/tuberias/perdidaCarga/`) decide el catálogo aplicable:
`sistemaDeTuberiaId === 'acquaSystemMagnumPn20'` y el id tiene cobertura
propia → catálogo Acqua System; en cualquier otro caso → Tabla N°7. Se
usa desde:

- `resolverPerdidaLocalizadaDeTramo.ts` (modo `detallado`, accesorios
  declarados explícitamente por el usuario en `Tramo.accesorios`) —
  ahora recibe `sistemaDeTuberiaId` como tercer parámetro.
- `resolverPerdidaLocalizadaEstimadaDeLocal.ts` (modo `estimado`, para el
  término de Sobrepaso).

La Tabla N°7 (`tabla-07-perdidas-localizadas/index.ts`) **no se modificó**
— sigue siendo la única fuente para hierro/cobre/PVC genérico/etc., y para
`llaveDePaso`/`valvulaEsclusa`/`tuboSaliente` incluso bajo Acqua System.

## Integración hidráulica

El Sobrepaso es una estimación (nunca un `AccesorioDeTramo` declarable):
se incorpora al mismo lugar que ya modela otras estimaciones análogas
(HYD-EST), gateado a `granularidadHidraulica === 'simplificada'` +
`metodoPerdidaLocalizada === 'estimado'` — el gate ya vigente para toda la
estimación DREZA (`MATERIALS-ACCESSORIES-01`). Adicionalmente, sólo tiene
incidencia hidráulica cuando `sistemaDeTuberiaId === 'acquaSystemMagnumPn20'`
(el producto no existe en ningún otro catálogo del dominio).

`resolverPerdidaLocalizadaEstimadaDeLocal.ts` ahora computa
`nSobrepaso = contarSobrepasosDeLocalPorRed(...)` para el mismo
`(Local, red)` que ya resuelve `nTeesEstimadas`/`nSingularidadTerminal`/
`nLlaveDePaso`, y agrega `nSobrepaso × Ks_sobrepaso` a
`ksEquivalenteEstimado` — **una sola vez**, sobre la MISMA `V_ref` del
Tramo representativo. Como HYD-EST ya opera por `(Local, red)` (nunca por
Tramo interno ni por camino), esto garantiza automáticamente:

- **ΣK incluye el Sobrepaso exactamente una vez** por `(Local, red)`.
- **Sólo los recorridos que atraviesan ese Tramo representativo** ven el
  incremento de `hf` (invariante preexistente de HYD-EST, no tocado).
- Su DN "comercial" (para el catálogo de materiales) se resuelve **a
  partir** del DN adoptado del Tramo, nunca al revés — no hay dependencia
  circular entre la estimación del accesorio y el dimensionamiento: la
  existencia y el `K` del Sobrepaso se conocen antes del cálculo (dependen
  sólo de topología: AF/AC del Artefacto), y el DN comercial se lee
  después, cuando el Tramo ya tiene DN adoptado.

## Materials — antiduplicación y arquitectura

`resolverAccesoriosConstructivosDreza.ts` (`resolverAccesoriosDeLocalesDreza`)
ya NO genera el Sobrepaso de forma independiente: consume
`contarSobrepasosDeLocalPorRed` (la misma función que usa el motor
hidráulico) y `resolverProductoSobrepasoAcquaSystem` (DN→código) para
producir, por cada `(Local, red)` con `nSobrepaso > 0`:

- si el DN del Tramo resuelve a 20/25/32 mm → un ítem "Sobrepaso fusión"
  con `red`, `dnComercial` real y `codigoComercial` trazable;
- si el DN no está en ese conjunto → un pendiente explícito
  (`"... — Sobrepaso fusión: Acqua System no comercializa DN <dn> para
  este producto (sólo 20/25/32 mm)"`), sin agregar la pieza ni inventar un
  código — el resto de los accesorios de esa red (llave/codos/tee) se
  siguen generando con normalidad.

No existe hoy en el modelo un "Sobrepaso explícito" declarable por el
usuario (`IdAccesorioDeTramo` no incluye `sobrepaso`; sólo existe como
estimación DREZA) — el requisito de "antiduplicación contra un explícito
equivalente" del brief original no tiene un mecanismo correspondiente que
probar en la arquitectura actual, y no se inventó uno para este slice
(alcance no pedido por el usuario en la decisión roja).

## Tratamiento de DN no disponible

Reutiliza la infraestructura existente de "pendiente" (`pendientes:
string[]`, ya usada por todo `resolverAccesoriosConstructivosDreza.ts`)
en vez de crear lógica especial en el PDF. `generarDocumentoPdfMateriales.ts`
no tiene ningún caso especial para Sobrepaso: la columna "DN /
configuración" muestra el `dnComercial` real cuando existe, o "—" cuando
el ítem no se generó (mismo criterio que cualquier otro accesorio del
listado). Se eliminó por completo el literal `"DN a definir"` (existía
sólo para el Sobrepaso genérico, ya removido).

## Resultados antes/después

**PDF de materiales** (proyecto de referencia, "Vivienda unifamiliar de
ejemplo", 10 % de margen):

| | Antes | Después |
|---|---|---|
| Etiqueta | `Sobrepaso` | `Sobrepaso fusión` |
| Red | `—` (indefinida) | `AF` / `AC` real, por artefacto |
| DN / configuración | `DN a definir` | `20 mm` (real, resuelto del Tramo) |
| Código comercial | no trazado | `08-084020000` (trazable en el snapshot) |
| Total base | 11 u (agregado, sin desglose) | 11 u (idéntico, ahora con desglose AF/AC por Local) |
| Accesorios considerados / compra | 88 u / 104 u | 88 u / 104 u (sin cambios) |

**Balance hidráulico** (mismo proyecto de referencia, terminal crítico,
`granularidadHidraulica: 'simplificada'` + `metodoPerdidaLocalizada:
'estimado'` + sistema Acqua System):

| | Antes | Después |
|---|---|---|
| Margen del terminal crítico | −19,437 m.c.a. | −20,047 m.c.a. |
| Incidencia del Sobrepaso en ΣK | 0 (no modelado) | `nSobrepaso × 1,20` por `(Local, red)` afectado |

El proyecto sigue NO CUMPLE en ambos casos (el defecto de "Presión sobre
acera" es preexistente y ajeno a este slice) — el cambio es exclusivamente
la incorporación de la pérdida localizada del Sobrepaso, ahora real en vez
de ausente.

## Decisiones rojas pendientes / diferidas

Todas las decisiones diferidas de esta sección quedaron **resueltas** por
`HYD-ACQUA-K-CATALOG-01` (D-δ.144, `docs/HYD-ACQUA-K-CATALOG-01.md`), a
partir de la extracción del texto real de la tabla oficial completa del
manual (pág. 34), que en el momento de cerrar este slice todavía no se
había transcrito íntegra:

- ~~`reducciones` bajo Acqua System: se adoptó "diámmetros inmediatos"
  (0,55) sin distinguir el salto de diámetro real~~ → cerrado:
  clasificación real por serie nominal comercial
  (`clasificarSaltoDeReduccion.ts`/`resolverKsDeReduccion.ts`).
- ~~Tee (3 variantes) bajo Acqua System: sin coeficiente propio
  transcrito~~ → la tabla oficial completa (8 configuraciones N°5-8a) ya
  está transcrita (`configuracionesTeeDetalladaAcquaSystem.ts`), aunque
  Tee real (`Nodo.tee`) sigue usando Tabla N°7 sin cambios (decisión
  explícita de HYD-ACQUA-K-CATALOG-01, no reabierta: falta relevar
  orientación de flujo real para poder seleccionar entre configuraciones).
  La Tee **estimada** de HYD-EST sí pasó a usar el valor oficial Acqua
  System (1,80, fila N°5) en vez de Tabla N°7 (3,00).
- ~~`llaveDePaso`/`valvulaEsclusa` bajo Acqua System: sin coeficiente
  propio publicado~~ → confirmado con la tabla completa: el fabricante
  efectivamente no publica coeficiente para estas piezas. Siguen
  conservando Tabla N°7, ahora catalogadas explícitamente con
  procedencia `fallbackNormativoERAS` en vez de resolverse por ausencia.

## QA

`tsc -b` limpio. `npm run build` limpio. Vitest: 2081/2081 (incluye 19
tests nuevos: `resolverKsDeAccesorioDeTramo.test.ts`,
`catalogoSobrepasoAcquaSystem.test.ts`, `contarSobrepasosDeLocalPorRed.test.ts`,
`hydOverpass01.proyectoDeEjemplo.test.ts`, más casos agregados a
`resolverDatosDeListadoDeMateriales.test.ts`/
`resolverPerdidaLocalizadaEstimadaDeLocal.test.ts`). ESLint: 11/0, idéntico
a la base. E2E dirigido (`materiales`, `hydEst`, `m2-resp-polish`,
`propagacion-a`) 13/13 contra build local (`IUAS_PREVIEW=1`). PDF del
proyecto de referencia generado y verificado por extracción de texto real
(`pdfjs-dist`) de las 4 páginas: sin `"DN a definir"` ni red `"—"` para
Sobrepaso, códigos/DN reales, totales invariantes (88 u / 104 u).

**Nota operativa (no introducida por este slice):** `PERF-SCALE-01C`
(`resolucionesDeDimensionamientoPorEdicion.regresion.test.ts`) sigue
siendo intermitente contra el timeout hardcodeado de 5000 ms bajo carga
del entorno (ya documentado como preexistente en
`docs/MATERIALS-PDF-POLISH-02.md`) — se optimizó
`contarSobrepasosDeLocalPorRed` a una sola pasada sobre nodos/tramos
(mismo patrón que `contarTerminalesFisicosDeLocal`) para no agregarle
costo, y se verificó que corre en ~5,3-6,1 s de forma aislada, la misma
magnitud que antes de este slice.
