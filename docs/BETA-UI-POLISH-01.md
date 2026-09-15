# BETA-UI-POLISH-01

Micro-polish visual/copy final antes de REPORT-POLISH y beta. Seis
asperezas puntuales de la interfaz web, sin abrir funcionalidades nuevas
ni tocar hidráulica.

## Objetivo

Cerrar seis puntos sueltos detectados en el uso real de la interfaz
actual: redundancia en el header de Local, copy de longitudes de M2
desactualizado respecto de la convención `5 m + |Δz|` de Montantes,
`hfEquipoACS` visualmente desconectado de la fila que lo origina,
Montantes colapsadas todavía con margen para compactarse más, el nombre
del botón de exportación, y un subtítulo de header que podía afirmar
"Proyecto de ejemplo" sobre un proyecto que no lo era.

## Local header

El header colapsable de un Local mostraba nombre y tipo por separado
siempre, incluso cuando eran literalmente el mismo texto ("Baño · Baño ·
4 artefactos"). Nuevo helper puramente presentacional
(`resumenDeCabeceraDeLocal.ts`, deliberadamente separado del resolver de
dominio `nombreVisibleDeLocal.ts`) decide si el tipo es redundante contra
el nombre visible (comparación exacta por texto recortado, sin fuzzy
matching): si son iguales, el tipo se omite de la meta secundaria. Ejemplos:

- `Baño` (nombre) + `Baño` (tipo) → `Baño · 4 artefactos`.
- `Baño 1` (nombre numerado) + `Baño` (tipo) → `Baño 1 · Baño · 4 artefactos`.
- `Baño principal` (nombre personalizado) + `Baño` (tipo) → `Baño principal · Baño · 4 artefactos`.

No se tocó el nombre persistido, el Tipo, IDs ni el naming automático.

## Copy longitudes

Dos ubicaciones en `ResultadoHidraulicoDeTramo.tsx` (cabecera de modo
Rápido y nota de "Distribución general") simplificaban de más la
convención de longitudes, mezclando "5 m por segmento de montante" y
"+3,00 m/piso" de un modo que sugería doble conteo vertical en los
Tramos de Montante (que en realidad excluyen esa corrección, ver
`resolverIncrementoVerticalPorNivel`). Reescrito para reflejar con
precisión: `5 m por Local · 10 m de alimentación`; y, para Montantes,
"la longitud sugerida es 5 m de base + |Δz| entre cotas" — sin mencionar
+3 m/piso en el mismo párrafo. La nota de "Distribución general" aclara
que los segmentos de Montante ya incluyen `|Δz|` en su sugerencia, para
no sugerir que se suma dos veces. Cambio puramente de copy: no se tocó
`reconciliarMontante.ts`, `LONGITUD_BASE_SEGMENTO_MONTANTE_M`,
`resolverIncrementoVerticalPorNivel` ni ninguna longitud existente.

## hfEquipoACS

El input de "Pérdida de carga del equipo ACS" vivía suelto, después de
la nota de longitudes, sin relación visual con la fila "Alimentación
ACS" de la tabla de dimensionamiento que lo origina. Se reordenó (ahora
aparece inmediatamente después de la tabla, antes de la nota de
longitud) y se le dio un estilo de subfila liviana (`.m2-acs-subfila`:
fondo sutil, `margin-top: -1px` para solaparse con el borde inferior de
la tabla, sin card ni callout) para que se lea como continuación de esa
fila. Copy acortado: `Pérdida del equipo ACS [m.c.a.]` + ayuda breve
("Dato manual del fabricante. Se aplica una vez a los recorridos de
agua caliente."). El `aria-label` del input, su semántica, persistencia,
validación y balance no cambiaron — el `aria-label` se dejó igual a
propósito para que el E2E `hydAcsManualLoss.spec.ts` (que localiza el
input por su accessible name) siga verde sin tocarlo.

## Montantes

La card colapsada de Montante ya era razonablemente compacta desde
UI-M2-MONTANTE-COMPACT-01, pero seguía habiendo margen: el `padding`
vertical del toggle bajó de `var(--esp-sm)` (0.5rem) a `0.35rem`, su
`min-height` de `2.5rem` a `2.15rem`, y el `gap` entre Montantes de la
lista (`.constructor-montantes__lista`) de `var(--esp-md)` (1rem) a
`var(--esp-xs)` (0.25rem) — cada card conserva su propio borde
(`.ui-card`), así que sigue habiendo separación visible sin ocupar tanto
alto. El cuerpo expandido (`.montante-card__cuerpo`) no se tocó.

## Memoria técnica

El botón de exportación decía "Generar informe técnico PDF"; ahora dice
"Generar memoria técnica" (nomenclatura de producto, sin mencionar el
formato de salida en el copy). El `onClick` sigue llamando exactamente
a la misma función (`generarDocumentoPdf`); no se tocó ningún dato,
filename, `pdfMake` ni el resolver del informe. No había ningún
selector E2E ni unitario atado al texto anterior.

## Subtítulo de proyecto

El subtítulo del header general decidía mostrar "Proyecto de ejemplo —
vivienda unifamiliar" con una condición puramente heurística
(`unidadesFuncionales.length === 0` ⇒ "Proyecto vacío", cualquier otro
caso ⇒ "Proyecto de ejemplo"), sin ninguna fuente real de procedencia.
Un "Nuevo proyecto" con una UF agregada, o cualquier proyecto importado
con al menos una UF, disparaban la misma afirmación falsa.

En vez de agregar un booleano `esDemo` persistido, compararlo por
referencia contra `proyectoInicial`, o inferir por cantidad de UF (todo
explícitamente descartado por el brief), se reutiliza
`proyecto.parametros.tipoDeProyecto` — un campo YA existente, siempre
presente y editable por el usuario (misma tabla normativa
`coeficientesMayoracion` que alimenta el selector "Tipología de
proyecto"). Nuevo helper `nombreDeTipoDeProyecto.ts` resuelve el nombre
humano de ese tipo. El subtítulo pasa a ser, p. ej.,
`Vivienda individual · Todos los datos pueden modificarse.` — una
afirmación siempre verdadera sobre CUALQUIER proyecto (demo, nuevo o
importado), porque describe el proyecto real en pantalla en vez de
intentar adivinar su procedencia. No requirió nueva metadata ni
migración.

## Sin cambios hidráulicos

Ningún archivo bajo `src/motor/` se tocó en este slice. No se modificó
ninguna fórmula, default hidráulico, semántica de `hfEquipoACS`, la
convención `5 m + |Δz|` de Montantes, schema, persistencia, topología ni
la jerarquía UF/Nivel/Local cerrada en UX-HIERARCHY-POLISH-01. La suite
completa de Vitest (motor + UI) se mantiene verde sin cambios en los
resultados numéricos de ningún test existente.
