# MATERIALS-ACCESSORIES-01 (D-δ.141)

## Objetivo

Extender el Listado de materiales de Caudal con una **estimación
constructiva DREZA** de accesorios PPR, organizada por tres sectores
físicos (Colector principal, Montantes, Redes de los locales), más una
regla global de uniones/cuplas rectas cada ~4 m. La estimación sirve para
armar una lista de compra razonablemente conservadora — **no** es un
cómputo contractual exacto ni una exigencia reglamentaria.

## Decisión de dominio (cerrada por el usuario)

Esta estimación **reemplaza por completo** la composición física por
defecto de `ACCESSORIES-DEFAULTS-01` (D-δ.139): la vieja regla de Locales
(1 tee estimada genérica + 1 codo90 + 1 llave por Local+red) fue
eliminada del código; DREZA es ahora la única fuente de estimación
constructiva.

Para Montantes, `resolverTees()` sigue computando la Tee real ('definido')
de cualquier bifurcación de Montante que ya tenga `Nodo.tee` configurado
(en cualquier granularidad, sin cambios). La estimación DREZA de
Montantes **descuenta** esas derivaciones ya resueltas explícitamente al
calcular `teesMontante` (opción A, decidida por el usuario), en vez de
sumarlas de nuevo — evita duplicar la misma pieza física.

## Alcance de activación

Las tres funciones de sector (`resolverAccesoriosDeLocalesDreza`,
`resolverAccesoriosDeMontantesDreza`, `resolverAccesoriosDeColectorDreza`)
corren **exclusivamente** cuando `granularidadHidraulica === 'simplificada'`
**y** `metodoPerdidaLocalizada === 'estimado'` — el mismo gate que ya usaba
`ACCESSORIES-DEFAULTS-01`, ahora extendido a Montantes y Colector. Fuera
de ese gate ('detallado', o 'profesional'), el usuario releva sus propios
accesorios (`Tramo.accesorios`/`Nodo.tee`) y una estimación genérica
encima duplicaría piezas sin forma fiable de saber, por Tramo, qué ya está
cubierto.

`resolverUnionesRectasDreza` (uniones/cuplas cada 4 m) es la única regla
que corre **siempre**, independiente de ese gate: es un hecho de
empaquetado de la cañería PPR (barras de ~4 m), no una aproximación de
pérdida localizada. Sólo depende de `materialTuberiaId === 'ppr'`.

## Reglas implementadas

### Redes de los locales (`resolverAccesoriosConstructivosDreza.ts`)

Por cada `(Local, Red)` con `n` bocas hidráulicas (ponderadas por
`Artefacto.cantidad`, nunca por nodo — un Artefacto con `cantidad=3` pesa
3, no 1):

- 1 llave de paso esférica.
- 3 codos de recorrido (`codosRecorridoLocal = 3`, fijo).
- `teesRoscadas = max(0, n-1)`.
- `codoTerminalRoscado = n>0 ? 1 : 0` (no se suma dentro de los codos de
  recorrido: es un ítem separado).

Por cada Local (no por red): `sobrepasos = Σ Artefacto.cantidad` de cada
Artefacto conectado a **cualquier** red (AF y/o AC cuentan una sola vez).
Sin DN asignado (no hay una medida única cuando el Local tiene AF y AC de
distinto diámetro): denominación genérica "Sobrepaso".

DN de cada pieza de red: el DN comercial adoptado del Tramo representativo
de ese Local+red (mismo criterio que el resto de Materials — nunca
inventado; DN no resoluble → pendiente, sin agregar la pieza).

No hay colisión con Tees topológicas reales: en el modelo actual, un Local
nunca tiene `Nodo.tee` propio (las Tees reales sólo existen en
derivaciones de Montante), así que la tee roscada terminal nunca se
duplica contra una Tee común.

### Montantes

Por cada Montante con al menos 1 Local servido (`n`) y longitud física
total `L` (suma de `longitud_m` de sus segmentos, sólo los definidos):

- 1 llave de paso esférica.
- `derivacionesEsperadas = max(0, n-1)`; `teesMontante =
  max(0, derivacionesEsperadas - derivacionesYaResueltas)`, donde
  `derivacionesYaResueltas` cuenta las bifurcaciones del Montante que ya
  tienen `Nodo.tee` configurado (evita duplicar contra `resolverTees()`).
- 1 codo de último Local (`codoUltimoLocal`, siempre que `n>0`): es un
  punto físico distinto de cualquier Tee — el nodo "punta" 1→1 de un
  Montante nunca es una derivación configurable, así que nunca colisiona
  con una Tee real.
- `codosRecorridoMontante = floor(L/2)`.

Reducciones: nunca inferidas del cambio de DN entre segmentos (CRIT-A30);
sólo se computan si están declaradas explícitamente en
`Tramo.accesorios`.

### Colector principal

`Nsalidas` = cantidad de Montantes de esa red + cantidad de Locales
alimentados directamente por esa red (Locales cuyo representante no está
servido por ningún Montante de esa red) — se generaliza así el escenario
mixto; se reduce exactamente a los dos casos puros del brief (sólo
Montantes / sólo Locales directos).

- 1 llave de paso esférica (general).
- `teesDistribucion = max(0, Nsalidas-1)`; 1 codo de última salida
  (reemplaza la Tee de la última salida, nunca se suman ambas).
- 2 codos de recorrido (estimación fija del Colector — distinta de la
  regla "1 cada 2 m", exclusiva de Montantes).
- 1 Tee de alimentación ACS, sólo si el proyecto tiene una fila
  "Alimentación ACS" (nunca se infiere desde `hfEquipoACS`).
- 1 Tee de conexión de caño ruptor + 1 Unión doble PPR al tanque, sólo
  cuando el esquema de abastecimiento tiene tanque superior (`'tanqueElevado'`
  o `'cisternaBombeoElevado'` — misma condición que ya usa
  `resolverAlmacenamiento` para el tanque elevado).

### Uniones/cuplas rectas cada 4 m

`uniones = floor(longitudDelGrupo_m / 4)`, agrupado por Material + Red +
DN + **Sector** (para no unir, por ejemplo, el Colector con un Montante
del mismo DN, o AF con AC). Corre sobre el mismo criterio de "Tramo
computable" que el resto de Materials (longitud > 0 y DN resoluble),
siempre que el sistema adoptado sea PPR.

## Cambio de nombre: "Alimentación general" → "Colector principal"

`identificarFilasDistribucionGeneral()` (`identificarFilasDeModulo2.ts`)
ahora produce la etiqueta pública `ETIQUETA_COLECTOR_PRINCIPAL = 'Colector
principal'` para el Tramo raíz de toda la topología — el criterio
estructural que la identifica no cambió (el único Tramo cuyo
`nodoOrigenId` nunca es `nodoDestinoId` de otro Tramo). Es un cambio de
**lenguaje público**: se actualizaron los tests de copy que dependían del
string exacto (`identificarFilasDeModulo2.test.ts`,
`PanelDePresionCriticoUI.test.ts`, y los e2e `hydEst.spec.ts` /
`m2-resp-polish.spec.ts` / `propagacion-a.spec.ts`). No se tocaron
identificadores internos (`t-general`, claves, ADRs históricos ni
`ROADMAP.md`/`PENDIENTES-DE-ARQUITECTURA.md` anteriores a este slice).

## Modelo de salida

`ItemAccesorioComputado` (`resolverDatosDeListadoDeMateriales.ts`) gana
dos campos opcionales:

- `sector?: SectorMaterial` (`'colectorPrincipal' | 'montante' | 'local'`)
  — sólo lo completan los ítems que produce
  `resolverAccesoriosConstructivosDreza.ts`; los accesorios/Tee `'definido'`
  existentes no se re-sectorizan retroactivamente (`undefined` es un valor
  legítimo, no un pendiente).
- `red?: RedDeTramo` — AF/AC, cuando es unívoca (un Sobrepaso de Local no
  la tiene: puede cruzar AF y AC del mismo Local).

`origen` pasa de `'definido' | 'estimado'` a `'definido' | 'estimadoDreza'`
(la estimación de `ACCESSORIES-DEFAULTS-01` fue eliminada). El PDF agrega
una columna "Sector" a la tabla de detalle de Accesorios y renombra la
columna "Origen" a "Estimado DREZA"/"Definido".

## Fuera de alcance (igual que en `ACCESSORIES-DEFAULTS-01`, sin cambios)

Accesorios específicos de equipos de ACS, válvulas de seguridad de
termotanques/calderas, accesorios del conjunto de bombeo, accesorios
particulares del medidor, flotantes/limpieza/rebalse/ventilación del
tanque, soportes y abrazaderas, aislación térmica, flexibles, griferías,
accesorios de desagüe, SKUs/marcas/precios. Tampoco se infiere calefón,
termotanque, caldera, modelo de bomba ni colector prefabricado.

## Implementación

- `src/exportadores/pdf/resolverAccesoriosConstructivosDreza.ts` (nuevo):
  las 4 funciones puras por sector + la regla de uniones, `SectorMaterial`
  y `etiquetaSector`.
- `src/exportadores/pdf/resolverDatosDeListadoDeMateriales.ts`: elimina
  `resolverAccesoriosFisicosPorDefecto`; agrega `resolverSectorDeTramo`
  (clasificador reusado por la regla de uniones) y la orquestación de las
  4 funciones DREZA dentro de `resolverDatosDeListadoDeMateriales`.
- `src/exportadores/pdf/generarDocumentoPdfMateriales.ts`: columna
  "Sector" en el detalle de Accesorios; wording actualizado (composición
  aproximada → estimación constructiva DREZA); aclaración final sobre
  "Colector principal".
- `src/interfaz/paginas/identificarFilasDeModulo2.ts`: `ETIQUETA_COLECTOR_PRINCIPAL`
  exportada, usada en vez del literal "Alimentación general".

## Tests

`resolverDatosDeListadoDeMateriales.test.ts`: nuevos describes para
Locales (Casos A/B del brief, n=0, gates de granularidad/método, Caso I
de `cantidad>1`), Montantes (Caso C), Colector (Casos D/E), uniones cada
4 m (Caso F + no-mezcla AF/AC/DN/sector), CRIT-A30 (Caso H) y no
duplicación frente a Detailed (Caso G), más invariancia de `hf` de
HYD-EST. `generarDocumentoPdfMateriales.test.ts` actualizado para la
nueva columna "Sector" y el wording "Estimado DREZA".
`identificarFilasDeModulo2.test.ts` y `PanelDePresionCriticoUI.test.ts`
actualizados para "Colector principal".

## QA

`tsc -b` limpio. `npm run build` limpio. Vitest: 2057/2057 (suite
completa, sin el fallo preexistente de `PERF-SCALE-01C` en esta corrida).
ESLint: 11/0, idéntico a la base (ningún error nuevo). E2E dirigido
(`hydEst`, `m2-resp-polish`, `propagacion-a`, `materiales`) contra build
local: 26/26 — nota operativa: el harness E2E de este repo resuelve la
URL objetivo con `IUAS_BASE_URL` (`tests/e2e/qa/estado.ts`,
`baseUrlEfectiva`), que **no** lee `IUAS_PREVIEW`; para correr contra un
build local hace falta exportar ambas variables
(`IUAS_PREVIEW=1 IUAS_BASE_URL=http://localhost:4173/IUAS/`), no sólo
`IUAS_PREVIEW=1` como sugiere el comentario de `playwright.config.ts` —
quirk preexistente del harness, no introducido por este slice.

## Pendientes reales

Suite E2E completa (los 25 specs) corrida contra el build local en
background al momento de cerrar este documento — ver handoff para el
resultado final y para la verificación visual del PDF.
