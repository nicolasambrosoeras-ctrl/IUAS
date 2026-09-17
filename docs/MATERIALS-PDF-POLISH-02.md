# MATERIALS-PDF-POLISH-02

## Objetivo

Pulido final del Listado de materiales: corregir problemas semánticos, de
trazabilidad y de paginación detectados en el PDF, **sin** tocar las
reglas constructivas DREZA, las cantidades resueltas, el margen
configurado, la topología hidráulica ni M1–M4. Es un slice de
presentación/lenguaje/snapshot-mínimo, no de cómputo.

## Problemas detectados y decisiones

### 1. Margen contradictorio en el detalle (brief §3)

El detalle de accesorios mostraba, por fila, `cantidadComputada →
cantidadCompra` (p. ej. `1 → 2`), lo que sugería erróneamente que el
margen se aplicaba **por fila/ubicación** y se podía sumar libremente
(9 filas `1 → 2` insinuaban 18 unidades, cuando el resumen ya agrupado
correctamente decía 10). Decisión: el resumen de compra pasa a ser la
**única** fuente de verdad para cantidades con margen. El detalle
eliminó por completo la columna de compra; sólo muestra "Cantidad base
[u]" — nunca prorratea ni redondea el margen por Local/red/fila. La
fórmula de compra (`ceil(base agrupada × factor)`) no se tocó.

### 2. Terminología ("computada" → "base")

"Cantidad computada" en Accesorios fue reemplazada por "Cantidad base"
(la cantidad puede venir de un accesorio explícito, una Tee inferida, o
una estimación DREZA — "computada" sugería un único origen). "Accesorios
computados" del resumen operativo pasó a "Accesorios considerados".
Tuberías conserva "Tuberías computadas": su longitud sí proviene
directamente y sin ambigüedad del modelo físico (`Tramo.longitud_m`).

### 3. Trazabilidad por ubicación (brief §5/§6)

El detalle mostraba únicamente `Sector: Red del local`, sin decir a qué
Local pertenecía cada fila — inutilizable con más de un Local. Se agregó
`UbicacionMaterial` (`resolverAccesoriosConstructivosDreza.ts`): Colector
principal (bloque único), Montante (con su nombre humano ya resuelto por
`nombreDeMontante`), o Local (identidad de UF + nombre propio del Local,
vía la nueva `etiquetaSoloLocal`, extraída de `etiquetaHumanaDeLocal`).
Se completa para **todos** los ítems de accesorios, incluidos los
`'definido'` (Tramo.accesorios explícito y Tee nodal real) — antes sólo
llevaban `sector`, nunca una ubicación identificable.

El detalle se reorganizó en **bloques por ubicación** (brief §6): 1)
Colector principal, 2) Montantes en el orden de `Proyecto.montantes`, 3)
Unidades funcionales en su orden, 4) Locales dentro de cada UF en su
orden; dentro de cada bloque, AF antes de AC y accesorios por etiqueta.
El título de cada bloque antepone la UF sólo si el proyecto tiene más de
una UF (única condición objetiva de "ambigüedad" — con una sola UF el
prefijo no aporta nada). El recorrido es 100% determinista: misma
entrada, misma salida siempre.

### 4. Paginación (brief §7)

El título de cada bloque es la **primera fila de la misma tabla** que su
encabezado de columnas y sus filas de datos (`colSpan` sobre las 5
columnas), con `headerRows: 2` — pdfMake repite ambas filas si la tabla
se parte entre páginas, así que el título nunca queda solo ni un
encabezado aparece recortado al inicio de página. `dontBreakRows: true`
impide que una fila de datos se divida a la mitad. Verificado
visualmente (ver más abajo): ningún bloque quedó partido de forma
incorrecta en 4 páginas reales, y estructuralmente en un proyecto de
escala (14 UF × 3 locales, 100+ accesorios, >10 bloques).

### 5. Estado del listado (brief §8)

"Listado parcial" (cuando `pendientes.length > 0`) pasó a "Con elementos
pendientes" — lenguaje coherente con el título "Elementos todavía no
definidos" que puede aparecer más abajo en la misma situación. La
condición (`pendientes.length > 0`) no cambió: no había una
contradicción lógica, sino de lenguaje entre dos secciones que decían
cosas distintas para la misma situación.

### 6. Copy de pendientes y notación interna (brief §9)

Reemplazados: `"Medición (Módulo 3 no está evaluado todavía)."` →
`"Medición: todavía no se seleccionó un medidor."`; `"Equipos y
almacenamiento (no hay componentes adoptados todavía)."` → `"Equipos y
almacenamiento: todavía no se adoptaron componentes."` (mismo texto para
la sección combinada y para la individual). También en el snapshot puro
(`resolverDatosDeListadoDeMateriales.ts`): `"...el cálculo de Módulo 3
está incompleto..."` → `"...el cálculo de medidores está
incompleto..."`; `"...no dimensionado por este módulo"` → `"...no
dimensionado automáticamente"`. Revisados uno por uno (brief: "no hacer
reemplazos globales a ciegas") — ningún otro texto público mencionaba
`Módulo`/`M1-M4`/`CRIT-`/`HYD-`/`ADR-`.

### 7. Branding (brief §10)

`"Caudal by DREZA"` → `"Caudal · DREZA"` en cabecera de primera página,
encabezado de páginas siguientes, título del documento y metadata PDF
(`info.title`). Cambio local a `generarDocumentoPdfMateriales.ts` (los
estilos `wordmark`/`wordmarkFirma` de esa cabecera no son compartidos con
`generarDocumentoPdf.ts`, la Memoria técnica) — se verificó que ese otro
documento no se vio afectado (no se tocó ningún archivo/estilo suyo).

### 8. Nombres de accesorios (brief §11)

`"Unión/cupla recta PPR"` → `"Cupla recta PPR"` (reserva "Unión doble
PPR" para conexiones desmontables, ya usado así junto al tanque). `"Tee
roscada"`/`"Codo terminal roscado"` → `"Tee roscada PPR"`/`"Codo terminal
roscado PPR"`, con la columna DN/configuración mostrando `"20 mm — rosca
a definir"` en vez de una configuración falsamente completa (el modelo no
determina el diámetro de rosca). "Sobrepaso" (sin DN unívoco, puede
cruzar AF y AC de distinto diámetro) muestra `"DN a definir"` en vez de
un guion sin explicación.

### 9. Observaciones y alcance (brief §12)

Reescrito para eliminar la contradicción ("únicamente elementos
explícitamente respaldados" + inclusión de estimaciones DREZA en la misma
sección). Texto nuevo: qué incluye el listado, cómo se aplica el margen
(nunca prorrateado por Local/red), qué es y qué no es la estimación
DREZA, y qué significa "Colector principal" — mismas 4 ideas sugeridas
por el brief, en minúsculas para "montantes"/"locales" cuando no son
títulos.

### 10. Resumen y detalle de accesorios (brief §13/§14)

Resumen: sin cambios de columnas (Accesorio, DN/configuración, Cantidad
base, Cantidad sugerida de compra) — sigue siendo la única fuente de
compra, sin ubicación/sector/origen (fragmentaría una misma compra
comercial). Detalle: Accesorio, Red, DN/configuración, Cantidad base,
Origen — la ubicación se expresa por el título del bloque, no por
columna. "Origen" se compactó a `"DREZA"`/`"Definido"` en el detalle (una
aclaración al pie explica el código una sola vez) para no repetir
"Estimado DREZA" en decenas de filas.

### 11. Artefactos previstos (brief §15)

La columna "Especificación" siempre estaba vacía para artefactos (el
modelo no tiene ese dato) — se omite esa columna en vez de mostrar una
columna íntegra de guiones o inventar "No especificada". Medidores y
Equipos y almacenamiento sí tienen especificación real y conservan la
columna sin cambios.

## Cambios de modelo/snapshot (mínimos, sólo para conservar ubicación)

- `resolverAccesoriosConstructivosDreza.ts`: nuevo tipo `UbicacionMaterial`
  (`SectorMaterial` ahora se deriva de él: `UbicacionMaterial['tipo']`).
  Las 3 funciones de sector completan `ubicacion` en cada ítem que
  producen. `resolverAccesoriosDeMontantesDreza` ya no recibe un callback
  de etiqueta -- importa `nombreDeMontante` directamente (mismo resultado,
  una dependencia menos).
- `resolverDatosDeListadoDeMateriales.ts`: `ItemAccesorioComputado` gana
  `ubicacion?: UbicacionMaterial`. `resolverSectorDeTramo` se generalizó a
  `resolverUbicacionDeTramo` (devuelve la ubicación completa; `sector` es
  simplemente `ubicacion.tipo`). Los accesorios `'definido'`
  (`Tramo.accesorios` explícito y Tee nodal real) ahora también reciben
  `sector`/`ubicacion`/`red` -- antes quedaban sin sector "a propósito";
  ahora hace falta para que ningún accesorio quede fuera de un bloque de
  ubicación en el detalle.
- `montantesDelProyecto.ts`: nueva `etiquetaSoloLocal(uf, local)` (nombre
  del Local sin sufijo de UF), extraída de `etiquetaHumanaDeLocal` sin
  cambiar su comportamiento externo.

**Deliberadamente NO cambiado:** la clave de agrupación de
`resolverUnionesRectasDreza` (uniones/cuplas rectas cada 4 m) sigue
agrupando por el **sector amplio** (Colector/Montante/Local), no por la
ubicación específica -- ver la nota extensa en el código. Se probó
agrupar por ubicación específica y el total de accesorios del proyecto de
referencia bajó de 88 a 86 (una cupla que hoy suma longitudes de dos
ubicaciones del mismo sector dejaría de alcanzar el umbral de 4 m si se
separara): eso viola brief §2/§18 ("no modificar cantidades resueltas",
"esos valores deben permanecer iguales"). Se revirtió a la agrupación por
sector ya cerrada en MATERIALS-ACCESSORIES-01. Costo aceptado: una cupla
que agregue Montantes/Locales distintos del mismo sector muestra la
ubicación del último Tramo agrupado -- imprecisión menor y preexistente,
no introducida por este slice.

## Discrepancia numérica encontrada (no introducida por este slice)

El brief cita el PDF de referencia con "Accesorios sugeridos de compra:
105 u". El valor real, verificado en el proyecto de ejemplo (`Vivienda
unifamiliar de ejemplo`, 10 % de margen) tanto en `HEAD` `16fb767`
(**antes** de cualquier cambio de este paquete) como después de todos los
cambios de este slice, es **104 u** (la base, 88 u, sí coincide
exactamente). La discrepancia de 1 unidad ya existía antes de este slice
y no se "corrigió" ajustando la fórmula de margen (brief §3: "no cambiar
la fórmula ni los totales") -- se documenta acá para que quede trazada,
y el test de totales invariantes (§16.E) usa el valor real verificado
(104 u), no el citado en el brief.

## Tests

`resolverDatosDeListadoDeMateriales.test.ts`: actualizado para las nuevas
etiquetas (`Tee roscada PPR`, `Codo terminal roscado PPR`, `Cupla recta
PPR`) y para que los ítems `'definido'` ahora incluyan `sector`/`red`/
`ubicacion` en las aserciones exactas.

`generarDocumentoPdfMateriales.test.ts`: actualizado (columna "Origen"
compacta, subtítulo "Detalle de accesorios por ubicación", "Con elementos
pendientes", aclaración final nueva) y con 5 describes nuevos:

- **Margen agrupado**: 9 unidades base + 10 % → resumen 10; el detalle
  nunca muestra una columna de cantidad de compra.
- **Trazabilidad por ubicación**: 2 UF con un Local homónimo ("Baño") en
  cada una -- ambos bloques quedan identificables y distintos
  (`"Vivienda — Baño 1"` / `"Departamento — Baño 1"`), más Toilette,
  Cocina y Lavadero de la primera UF; sin IDs técnicos en ningún texto.
- **Copy público**: ausencia de `Módulo 1-4`, `Caudal by DREZA`,
  `Unión/cupla`, `Cantidad computada [u]`, `CRIT-`, `HYD-`, `ADR-`;
  presencia de `Caudal · DREZA`, `Cupla recta PPR`, `Cantidad base [u]`.
- **Totales invariantes**: proyecto de referencia, 10 % → `65,00 m`,
  `71,50 m`, `88 u`, `104 u` (ver discrepancia documentada arriba).
- **Paginación**: proyecto de escala (14 UF × 3 locales, >100
  accesorios, >10 bloques) -- todas las tablas de bloque de ubicación
  (detectadas por su fila de título con `colSpan`) tienen `headerRows: 2`
  y `dontBreakRows: true`, con al menos 1 fila de datos.

## Validación visual (obligatoria, brief §18)

Generado el PDF real del proyecto de ejemplo (Vivienda unifamiliar, 10 %)
a través de la app corriendo contra el build local, descargado y
renderizado con el visor de PDF nativo de Microsoft Edge (Chromium de
Playwright no incluye PDFium: `chromium.launch({ channel: 'msedge' })`
como visor, no como app bajo prueba). Capturas de las 4 páginas
inspeccionadas manualmente. Confirmado:

- `Caudal · DREZA` visible en cabecera, encabezado de páginas 2-4 y
  metadata.
- `Estado: Listado completo` (proyecto sin pendientes).
- Resumen operativo: `65,00 m` → `71,50 m`; `88 u` → `104 u`.
- Resumen de compra de accesorios: columna "Cantidad base [u]", sin
  columna de compra en el detalle.
- Bloques identificables: "Colector principal", "Baño 1", "Cocina 1",
  "Lavadero 1", "Toilette 1", "Jardín 1" -- orden estable (Colector →
  Locales en su orden), cada uno con su tabla título+encabezado+filas.
- Ningún bloque partido de forma incorrecta entre páginas 1↔2, 2↔3, 3↔4;
  encabezados de columna repetidos completos donde correspondía; sin
  fragmentos huérfanos ni encabezados recortados al inicio de página.
- "3. Elementos todavía no definidos" con copy público ("Medición:
  todavía no se seleccionó un medidor.", "Equipos y almacenamiento:
  todavía no se adoptaron componentes.").
- "4. Artefactos previstos" sin columna Especificación.
- "5. Observaciones y alcance" con el texto nuevo, sin contradicciones,
  explicando Origen, margen agrupado, alcance de DREZA y "Colector
  principal".
- Pies de página y numeración (`Página N de 4`) correctos, sin
  superposición con las tablas.

El proyecto de escala (14 UF × 3 locales) se verificó **estructuralmente**
(headerRows/dontBreakRows sobre el docDefinition real, ver test de
paginación) en vez de renderizado a imagen: `pdfMake.createPdf(...).getBuffer()`
no completa bajo el entorno Node/vitest de este repo (probablemente
requiere APIs de browser no disponibles ahí) y generarlo a través de la
UI real habría requerido cargar manualmente un proyecto de 14 UF -- el
test estructural cubre exactamente la propiedad relevante (título+
encabezado nunca se separan, ninguna fila se parte) sobre >10 bloques
reales de ese proyecto.

## Fuera de alcance (confirmado sin cambios)

Fórmulas hidráulicas, topología, reglas constructivas DREZA (cantidades),
margen configurado, persistencia del proyecto (`.iuas`), M1–M4, el
defecto pendiente de "Presión sobre acera", URL `/IUAS/`, claves internas
históricas. `resolverTuberiasYAccesorios`/`resolverTees` sólo ganaron
campos de metadata (`sector`/`ubicacion`/`red`); ninguna cantidad
(`cantidadComputada`, `longitudComputada_m`) cambió de valor para ningún
proyecto ya probado.
