# MATERIALS-POLISH-01 (D-δ.140)

## Objetivo

Cierre funcional/editorial del Listado de materiales: de salida técnica
del motor a documento operativo. No agrega reglas hidráulicas, no toca
ACCESSORIES-DEFAULTS-01, no agrega barras/rollos/marcas/precios.

## Hallazgo de arqueología: pendientes falsos por diseño de "simplificada"

Antes de tocar presentación, la arqueología (brief §4) comparó Materials
contra el proyecto fuente en una misma ejecución (proyecto de ejemplo +
`backfillLongitudesDePredimensionamiento`, igual que usa la Memoria
técnica) y encontró que **el listado nunca llegaba a "completo"**: un
proyecto de ejemplo perfectamente válido en Modo Rápido (simplificada +
estimado) generaba **20 pendientes**, incluyendo "Alimentación general —
longitud pendiente" y varias "Tee sin configurar"/"Derivación múltiple no
modelada".

Causa raíz: `resolverDatosDeListadoDeMateriales` (desde MATERIALS-01)
recorría **todos** los Tramos de `RedHidraulica.tramos` exigiéndoles
longitud/DN/Tee propios, sin distinguir -- en granularidad `'simplificada'`
-- entre el Tramo representativo de un (Local, red) y sus **ramales
internos** (los tramos hacia cada Artefacto puntual). El propio modelo de
dominio (`seleccionarTramosDeAcumulacion.ts`,
`backfillLongitudesDePredimensionamiento.ts`, D-δ.44) ya establece que
esos ramales **nunca** reciben longitud/accesorios propios en
simplificada -- Materials los estaba tratando como "dato faltante" cuando
en realidad son "dato que el modelo nunca pide". Lo mismo aplicaba a
cualquier bifurcación sin `Tramo.montanteId` (la forma normal en que
`'simplificada'` reparte la Distribución general hacia cada Local, y el
propio fan-out interno de un Local con varios artefactos): `resolverTees`
la marcaba como "Tee sin configurar"/"Derivación múltiple no modelada"
aunque ACCESSORIES-DEFAULTS-01 ya la cubre con su composición física
estimada.

Esto es exactamente el caso que el brief anticipaba en §10/§33 ("no
mostrar toda deuda topológica interna como pendiente de materiales"; "no
marcar PARCIAL simplemente porque no existe topología profesional") --
confirmado con evidencia real, no supuesto.

## Corrección (`resolverDatosDeListadoDeMateriales.ts`)

- **Tramos ramal** (puros de un Local pero no su representativo, vía
  `localUnicoDeTramo` -- ahora exportada desde
  `identificarTramoRepresentativoDeLocal.ts`): excluidos por completo de
  tuberías/pendientes en `'simplificada'`. En `'profesional'`, sin
  cambios: cada Tramo físico sigue exigiendo sus propios datos.
- **Bifurcaciones sin `montanteId`**: en `'simplificada'`, `resolverTees`
  ya no exige una Tee real ni reporta fan-out no modelado -- sólo una
  bifurcación de **Montante** real sigue exigiendo su Tee configurada, en
  cualquier granularidad.
- Ningún cambio de cálculo: HYD-EST, `hf`, DN y Qc quedan bit-a-bit
  idénticos (test de invariancia incluido, heredado de
  ACCESSORIES-DEFAULTS-01).

## Estado del listado

Nuevo campo `DatosComputoDeMateriales.estado: 'completo' | 'parcial'`,
derivado de `pendientes.length === 0`. Distinto del estado hidráulico
(CUMPLE/NO CUMPLE de Verificación) -- responde "¿Materials pudo computar
todo de forma inequívoca?", no "¿la instalación verifica presión?". Se
muestra en el encabezado del PDF ("Listado completo"/"Listado parcial") y,
si es parcial, con la aclaración breve pedida por el brief.

## Humanización de pendientes

Ningún pendiente expone `Tramo.id`/`Nodo.id`. Orden de resolución (nuevo
`IndiceDeHumanizacion` + `etiquetaHumanaDeTramoParaPendiente`):
Distribución general ("Alimentación general"/"Alimentación ACS", ya
derivada) → Tramo representativo de un (UF, Local) (misma
`etiquetaHumanaDeLocal` que ya usa la Memoria técnica) → Montante
(`nombreDeMontante`) → fallback neutro por red ("Tramo de agua fría/
caliente"). Nunca un ID técnico, ni siquiera como fallback.

## Reordenamiento y terminología del PDF

- Tuberías y Accesorios: "Resumen de compra" **primero**, "Detalle"
  **después** (antes era al revés en tuberías, y accesorios no tenía
  resumen).
- Columna "Extra [%]" eliminada de ambas tablas de detalle -- el margen ya
  figura una sola vez en el encabezado del documento.
- "Cantidad para compra" → "Cantidad sugerida de compra" en todas las
  tablas (todavía no se conoce empaquetado comercial real).
- Accesorios: resumen consolidado por (tipo + DN) **ignorando origen**,
  con el margen aplicado **una sola vez sobre el total consolidado**
  (`Math.ceil(totalComputado × factor)`) -- nunca sumando los `ceil`
  independientes de cada fila del detalle (ver test "4 estimados + 2
  definidos → 6 computado → ceil(6.6)=7, nunca 8").
- Medidores + Equipos y almacenamiento: si ambos están vacíos (M3/M4 sin
  iniciar), se combinan en una única sección "Elementos todavía no
  definidos" en vez de dos secciones numeradas completas.
- Numeración de secciones: contador dinámico (`siguienteNumero()`) que se
  ajusta solo según cuántas secciones realmente se combinen/omitan --
  nunca vuelve a saltear un número.
- Fecha del proyecto: de ISO crudo (`2026-08-07`) a es-AR
  ("7 de agosto de 2026") -- sólo el DISPLAY, el dato persistido no
  cambia.
- Observaciones y alcance: el título viaja en un bloque `unbreakable`
  junto con la primera nota pendiente (si existe) para evitar quedar
  huérfano al pie de página, sin volver toda la sección unbreakable.
- Resumen operativo debajo del encabezado: totales de tuberías/accesorios
  computados y sugeridos de compra, sólo cuando son computables.

## Fuera de alcance (documentado como futuro, no implementado)

- Humanizar "Elementos pendientes de definición" con Nivel explícito
  además de Local (`etiquetaHumanaDeLocal` no incluye Nivel -- se mantuvo
  consistente con el resto de los documentos en vez de introducir un
  formato nuevo sólo para Materials).
- MATERIALS-02: barras/rollos comerciales, marcas, códigos, precios,
  presupuesto, exportación XLSX/CSV.

## Tests

`resolverDatosDeListadoDeMateriales.test.ts`: nuevos describes de
coherencia (artefactos M1 == Materials, tuberías reconciliadas),
Estado del listado (completo/parcial, simplificada bien formada nunca
exige Detailed) y humanización (ningún pendiente con patrones de ID
interno). `generarDocumentoPdfMateriales.test.ts`: reescrito con
fixture backfilled, cubre orden resumen/detalle, ausencia de "Extra [%]",
terminología, Estado del listado, fecha humanizada, consolidación de
accesorios sin doble `ceil`, y ausencia de IDs internos en el documento
completo (incluso en el caso parcial, el peor caso para exponerlos).

## QA

`tsc -b` limpio, `e2e:typecheck` limpio, `build` limpio, `npx vitest run`
2048/2048 (sin el timeout preexistente de PERF-SCALE-01C esta corrida),
ESLint 11/0 idéntico a la base. E2E dirigido (materiales, report
regression, smoke, persistencia, montantes, modo de trabajo): 28/28
verdes.
