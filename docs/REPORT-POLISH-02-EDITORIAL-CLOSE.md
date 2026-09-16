# REPORT-POLISH-02-EDITORIAL-CLOSE

Cierre editorial de la Memoria de cálculo (PDF): corrige hallazgos
detectados al inspeccionar el PDF **real** generado después de
REPORT-POLISH-01. No repite el rediseño de ese slice, no agrega
metodología hidráulica, no corrige ningún cálculo, no toca `src/motor/`.

## Objetivo

REPORT-POLISH-01 rediseñó la memoria (portada, resumen, jerarquía
numerada, tablas). Este slice corrige seis hallazgos puntuales
detectados en el PDF real generado con ese rediseño ya aplicado.

## Hallazgo 1 — nombre de Local inconsistente en M1

M1 mostraba `Local: Baño` (sin ordinal) para más de un Local del mismo
tipo dentro de una UF, mientras el resto del mismo documento (M2,
Verificación) ya numeraba `Baño 2`/`Baño 3` vía `derivarOrdinalesDeLocal`
(`interfaz/paginas/identificarFilasDeModulo2.ts`). `renderizarLocal` en
`generarDocumentoPdf.ts` pasaba `ETIQUETA_TIPO_DE_LOCAL[local.tipo]`
(sólo el tipo, sin ordinal) como etiqueta automática a
`nombreVisibleDeLocal`. Corregido reutilizando el mismo
`derivarOrdinalesDeLocal` que ya usa el resto del PDF -- calculado una
vez por UF (sobre todos los Locales de todos sus Niveles, mismo orden
que `localesDeUnidadFuncional`) y pasado como ordinal a cada
`renderizarLocal`. Un nombre personalizado (`Local.nombre`) sigue
ganándole siempre al ordinal automático (`nombreVisibleDeLocal`, sin
cambios). No se tocó el helper compartido ni la semántica de
UX-HIERARCHY-POLISH-01.

## Hallazgo 2 — página huérfana en pérdidas localizadas

La sección 2.4 (Desarrollo de cálculo de M2) fluía como una lista plana
de nodos sueltos: el bloque de pérdida distribuida podía terminar una
página y el de pérdida localizada arrancar solo en la siguiente, con esa
página conteniendo casi únicamente `K total = ...` / `hf localizada =
...`. Corregido agrupando cada bloque lógico (velocidad + pérdida
distribuida; pérdida localizada) en su propio `stack` con
`unbreakable: true` -- cada uno viaja completo a la página siguiente si
no entra entero en la actual, en vez de partirse. No se hizo toda la
sección 2.4 unbreakable (podía ser grande).

## Hallazgo 3 — M4 forzaba página nueva incondicional

`renderizarSeccionM4` aplicaba `pageBreak: 'before'` siempre que M4 no
estuviera `'noIniciado'`, sin importar cuánto espacio quedara tras M3.
Retirado: el título de M4 ahora viaja en un `stack` `unbreakable` junto
con su primera línea de contexto ("Esquema de abastecimiento: ..."),
así nunca queda huérfano, pero sin forzar un salto si M4 entra a
continuación de M3 en la misma página. M3 no se tocó (su `pageBreak`
condicional viene de REPORT-POLISH-01 y no fue el hallazgo reportado).

## Hallazgo 4 — tabla de terminales: header separado del crítico y del cuerpo

`pageBreak: 'before'` incondicional antes de "Detalle de verificación
por terminal" separaba ese título de todo lo anterior aunque sobrara
espacio, y no evitaba que el título quedara solo si el salto ocurría de
todas formas. Corregido integrando el título como primera fila de la
propia tabla (`colSpan` sin bordes) y subiendo `headerRows` de 1 a 2
(título + encabezado de columnas): pdfMake nunca separa las
`headerRows` del resto de una tabla, así que título + encabezado +
primeras filas viajan siempre juntos -- en la página actual si entran,
o como unidad en la siguiente si no.

## Hallazgo 5 — exceso de rojo en la tabla de terminales

`estiloDeFilaVerificacion` coloreaba **toda la fila** de rojo
(`COLOR_NO_CONFORME`) si no cumplía, o si era la fila crítica
(independientemente de si cumplía). Con un proyecto donde todos los
terminales incumplen, la tabla completa quedaba roja y perdía
jerarquía. Nueva política: texto de fila en negro/gris por defecto; el
rojo (`valorNoConforme`) se aplica sólo a la celda de
margen/estado cuando el terminal realmente no cumple
(`estado === 'completo' && cumple === false`). Un terminal "no
evaluado" (`Pmin no definida / no evaluada`, fuera de alcance,
incompleto) nunca se colorea de rojo -- se trata como neutral, nunca
como incumplimiento. La fila crítica se distingue por peso
(`filaCritica`: bold) + fondo suave (`fillColor: COLOR_NO_CONFORME_SUAVE`,
el mismo tono ya usado en los banners CUMPLE/NO CUMPLE), no por
saturación de rojo -- sigue siendo identificable en blanco y negro.

## Hallazgo 6 — identificadores internos en el documento público

El PDF mostraba códigos de desarrollo (`CRIT-Axx`, `D-δ.xxx`) y nombres
de propiedad TypeScript (`quTotal_lps`, `qu(artefactoId)` con la clave
camelCase del catálogo) directamente en el copy visible. Corregido en
dos frentes:

- **Copy propio de `generarDocumentoPdf.ts`**: reescrito para usar
  "criterio IUAS" en vez del código específico (ej. `CRIT-A34` →
  `criterio IUAS`), y para citar la normativa externa sin el ID interno
  que la acompañaba (`Tabla N°7 ERAS-2023, D-δ.40/D-δ.45` → `Tabla N°7
  ERAS-2023; criterio IUAS de pérdidas localizadas estimadas`). Las
  referencias normativas externas (`ERAS-2023 §...`, `Tabla N°...`) se
  preservan intactas -- no se pierde trazabilidad normativa.
- **Copy que viene del motor** (`paso.nota`, `paso.criterioId`,
  `entrada.procedencia`, `entrada.simbolo`): sin tocar `src/motor/`
  (fuera de alcance de este slice), se humaniza en la capa de
  presentación. `humanizarCopyPublico` reemplaza `CRIT-Axx`/`D-δ.xxx`
  por "criterio IUAS" y `quTotal_lps` por "caudal unitario del
  catálogo" en el texto antes de renderizarlo; `humanizarSimboloDeEntrada`
  resuelve `qu(<artefactoId>)` contra el catálogo normativo
  (`catalogoArtefactos`) y muestra `qu(<nombre humano>)` (p.ej.
  `qu(Receptáculo de ducha)` en vez de `qu(receptaculoDucha)`). La línea
  `Criterio: <criterioId>` se reemplaza por `Particularidad: criterio
  IUAS` (evita el "Criterio: criterio IUAS" redundante).

Metodología y fuentes (sección 6) ya no promete ver "códigos de
criterio a lo largo del documento" (ahora que ya no aparecen) y agrega,
al final, una única nota compacta: "Los identificadores internos de
criterios y decisiones se conservan en la documentación técnica de
IUAS." -- sin listarlos.

## Corrección adicional detectada en el PDF real: casing de la normativa

`Proyecto.metadatos.versionNormativa` es un identificador de datos
persistido (`'eras-2023'`) -- nunca se reescribe el dato (identidad
intocable). Se humaniza sólo al mostrarlo (`humanizarVersionNormativa`,
`.toUpperCase()`), así "normativa eras-2023" pasa a "normativa
ERAS-2023" en el texto sin alterar el valor guardado.

## Header/footer

El nombre del proyecto aparecía dos veces (header derecha, footer
izquierda). El footer ya no lo repite: sólo fecha de generación (izq.)
+ "Página X de Y" (der.). El header no cambió (izquierda "IUAS —
Memoria de cálculo", derecha nombre del proyecto).

## Portada, resumen, jerarquía 1–6

No se tocaron -- ya aprobados conceptualmente en REPORT-POLISH-01 y
confirmados en la inspección del PDF real que motivó este slice.

## Tests

47 tests en `generarDocumentoPdf.test.ts` (34 preexistentes + 13
nuevos): dos Locales del mismo tipo con nombres distintos (ambos
aparecen, con ordinal UF-wide), Local con nombre personalizado (nunca
reemplazado por el ordinal), bloque de pérdida distribuida y bloque de
pérdida localizada como unidades `unbreakable` independientes, M4 sin
`pageBreak` incondicional, ausencia de `CRIT-A*`/`D-δ.*`/`quTotal_lps`
en todo el texto visible, símbolo humano en la tabla de pasos de M1
(`qu(<Nombre>)`, nunca `qu(camelCaseId)`), tabla de terminales con
`headerRows: 2` (título integrado) y sin `pageBreak` suelto, rojo sólo
en la celda que no cumple (nunca en "no evaluado"), fila crítica con
estilo `filaCritica` + `fillColor`, normativa mostrada como
`ERAS-2023` sin alterar el dato persistido. Tests preexistentes
actualizados donde el copy cambió (nota de `hfEquipoACS`, wording de
Metodología, estructura de la tabla de terminales).

## QA visual manual

PDF del proyecto de ejemplo generado end-to-end (descarga real vía
Playwright contra un build local, no simulado) e inspeccionado página
por página: nombres de Local consistentes en M1, `qu(<nombre humano>)`
en la tabla de pasos, sin `CRIT-A`/`D-δ.`/`quTotal_lps` visibles,
metodología con "ERAS-2023" bien casado, footer sin nombre de proyecto
duplicado. Segundo PDF con un proyecto multinivel (2 Locales "Baño" en
Niveles distintos de la misma UF + un Local con nombre personalizado)
confirma el fix del Hallazgo 1: `Baño principal` (personalizado) y
`Baño 2` (automático, nunca pisado por el personalizado) conviven
correctamente. `tsc -b`, `eslint`, `e2e:typecheck` y `build` limpios;
Vitest completo verde salvo el mismo test de performance preexistente y
ajeno a este slice (`resolucionesDeDimensionamientoPorEdicion.regresion.test.ts`,
timeout de 5 s sensible a la máquina).

## No tocado

`src/motor/`, fórmulas, DN, longitudes, `hfEquipoACS`, M3, M4
(cálculo), presión, la web (más allá de lo estrictamente necesario en
el PDF), portada, resumen, jerarquía 1–6.

## Estado

`REPORT-POLISH-02-EDITORIAL-CLOSE: CERRADO — pendiente validación
manual`.
