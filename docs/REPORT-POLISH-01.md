# REPORT-POLISH-01

Rediseño editorial/visual de la Memoria de cálculo (PDF) para nivel de
beta pública profesional. No agrega metodología hidráulica, no corrige
ningún cálculo, no toca `src/motor/`.

## Objetivo

La memoria ya contenía el desarrollo técnico correcto (M1-M4 + Verificación
como memoria de cálculo trazable, cerrado en REPORT-01A/B/C). Este slice
la transforma en un documento de ingeniería profesional: portada, resumen
ejecutivo, jerarquía editorial numerada, tablas legibles, mejores saltos
de página, identidad visual IUAS sobria, header/footer con paginación.

## Arquitectura preservada

El pipeline `Proyecto → resolverDatosDeInforme → DatosDeInforme →
construirDocDefinition → pdfMake → PDF` no cambió. `construirDocDefinition`
sigue siendo pura y testeable sin abrir el PDF; `generarDocumentoPdf`
sigue siendo el único punto con efecto. Ningún dato nuevo se calcula: los
dos campos agregados a `resolverDatosDeInforme.ts`
(`GrupoDeLocalDeInforme.unidadFuncionalNombre`, y el reagrupamiento por
`(unidadFuncionalId, localId)` en vez de por texto) son puramente
derivados de información ya resuelta, sin tocar ningún resolver del
motor. El test que garantiza "nunca se importa `motor/` desde
`generarDocumentoPdf.ts`" sigue verde sin cambios.

## Bug encontrado y corregido (no sólo estético)

`ENCABEZADO_TABLA_TUBERIA` era un array compartido reutilizado por
referencia como primera fila de **todas** las tablas de Tuberías (una por
Local, una por segmento de Montante, distribución general...). pdfMake
muta los nodos de una tabla durante el layout, así que a partir de la
segunda tabla que reutilizaba ese mismo array, el header quedaba en
blanco -- invisible antes de este slice porque no había fondo de header
que lo hiciera evidente. Corregido con un array nuevo (`[...array]`) en
cada llamada. Mismo hallazgo potencial revisado en los otros dos headers
de tabla (`ENCABEZADO_TABLA_VERIFICACION`, `ENCABEZADO_TABLA_MEDIDORES`):
se usan una sola vez cada uno, sin riesgo.

## Portada

Página separada: wordmark "IUAS" (tratamiento tipográfico, sin isotipo
inventado), "Memoria de cálculo", "Instalaciones internas de agua",
nombre del proyecto, Tipología (mismo helper que el subtítulo web de
BETA-UI-POLISH-01), Modo de trabajo (Rápido/Profesional,
`resolverModoDeTrabajo`), fecha de generación en formato es-AR legible.
Sin URLs, SHA, IDs técnicos ni menciones de "versión piloto". Sin número
de página visible (header/footer arrancan en la página 2).

## Resumen

Sección "Resumen del cálculo" inmediatamente después de la portada: 4-6
KPIs (Qc, cantidad de UF, esquema de abastecimiento, estado general
CUMPLE/NO CUMPLE/No evaluado, margen y terminal crítico si hay uno
determinado) -- todos leídos de `DatosDeInforme` ya resuelto, ningún
cálculo nuevo. Un KPI sin dato disponible muestra "No evaluado", nunca
`0`/`—`/`NaN`.

## Jerarquía

Numeración de secciones: 1. Demanda · 2. Tuberías (2.1 Distribución
general/secundaria · 2.2 Montantes · 2.3 Unidades funcionales — Locales ·
2.4 Desarrollo de cálculo) · 3. Medidores · 4. Abastecimiento y reserva ·
5. Verificación hidráulica · 6. Metodología y fuentes. El orden de
renderizado se reordenó (Medidores y Abastecimiento antes que
Verificación, que antes iba justo después de Tuberías) para que la
Verificación cierre como síntesis final -- reordena sólo el array de
render; cada sección sigue leyendo exactamente los mismos datos.

Dentro de Tuberías, los Locales de una misma Unidad Funcional ahora se
agrupan bajo un único encabezado de UF en vez de repetir "· Unidad
funcional X" en cada Local (antes: "Baño 1 · Unidad funcional 3", "Baño 2
· Unidad funcional 3", ... ahora: encabezado "Unidad funcional 3" una vez,
"Baño 1"/"Baño 2"/... debajo). Con proyectos grandes (14+ UF) esto reduce
sustancialmente la repetición visual sin perder ninguna fila de datos.

## Tablas

Layout compartido (`layoutTablaIuas`) aplicado a **todas** las tablas del
documento: header con fondo gris suave, líneas horizontales/verticales
finas en gris (sin grilla negra pesada), padding consistente. Encabezados
de tabla + su tabla (Local con artefactos en M1, Local/Montante en M2)
viajan en un bloque `unbreakable` para no dejar el título solo al final
de una página con la tabla recién en la siguiente.

## Fórmulas

Se corrigió un glyph roto real: la sustitución de velocidad (`A = π·Di²/4
... → V = Q/A ...`) usaba una flecha Unicode (→) que la fuente vfs de
pdfMake no renderiza (aparecía como un carácter "tofu" ilegible en medio
de la fórmula). Se separó en dos líneas -- corrige el glyph y además
mejora la composición fórmula/sustitución/resultado (ya un patrón
establecido en el resto del documento desde REPORT-01B/
FIX-REPORT-01B-VISUAL-01: ningún contenido matemático cambió).

## Verificación hidráulica

Banner grande CUMPLE/NO CUMPLE (verde/rojo con fondo tenue, texto en
mayúsculas -- nunca depende sólo del color) al inicio de la sección,
antes de la tabla resumen del terminal crítico y de su desarrollo
completo. El bloque terminal-crítico completo (banner implícito vía el
párrafo previo + tabla + desarrollo) sigue siendo `unbreakable` como
desde FIX-REPORT-01C-VISUAL-01.

## hfEquipoACS

Sin cambios de semántica: sigue mostrándose el término real cuando está
informado y aplica al camino AC, y la nota de alcance cuando está ausente
-- condicionado exactamente igual que antes (por `red === 'AC'` y
presencia del dato).

## Header/footer

Desde la página 2 (la portada no lleva): header con "IUAS — Memoria de
cálculo" a la izquierda y el nombre corto del proyecto a la derecha;
footer con "{proyecto} · {fecha}" a la izquierda y "Página X de Y" a la
derecha. Metadata del PDF (`info`): title/subject/author.

## Paginación

Implementada con las funciones dinámicas `header`/`footer` de pdfMake
(`(currentPage, pageCount) => ...`), devolviendo `undefined` en la página
1 (portada) y el contenido real desde la página 2.

## Proyectos incompletos

Bug de saltos de página desperdiciados corregido: antes, "Medidores" y
"Alimentación y reserva" forzaban `pageBreak: 'before'` **siempre**,
incluso cuando el módulo todavía no fue iniciado (una sola línea de
texto) -- dejaba páginas casi vacías (confirmado visualmente: 2 páginas
enteras sólo con "Módulo 3/4 todavía no fue iniciado" en el proyecto de
ejemplo recién cargado). Ahora el salto de página sólo se fuerza cuando
el módulo tiene contenido real que mostrar; el caso "no iniciado" fluye
en la misma página que la sección anterior.

## Escala

Medido con el fixture de escala `M` (14 UF, 3 Locales/UF, ~294
terminales), generado en Node vía el mismo pipeline puro
(`resolverDatosDeInforme` + `construirDocDefinition`) con el renderer de
pdfMake para servidor:

- Proyecto de ejemplo (1 UF): 7 páginas, ~72 KB, ~1,1-1,3 s.
- Proyecto de escala M (14 UF): 31 páginas, ~261 KB, ~3,3-3,9 s.

Sin threshold rígido: ambos tiempos son razonables para generación bajo
demanda. No se abrió ningún ticket de performance -- no hay evidencia de
que haga falta.

## Fuera de alcance

- Ningún esquema gráfico/árbol/grafo/diagrama de red (VIS-TOPO sigue
  descartado, no vuelve a aparecer en REPORT).
- REPORT sigue siendo sólo PDF programático (no DOCX/HTML/editable).
- No se tocó ninguna fórmula, default hidráulico, ni ningún archivo bajo
  `src/motor/`.
- No se unificó la lógica de numeración automática de Local entre
  M1/M2/PDF (deuda ya documentada en BETA-UI-POLISH-01, sigue igual).
- No se comprimió la tabla de sustitución de Qmax (lista cada término
  `qu(artefacto)` individual) aunque crece con la cantidad de artefactos:
  es la traza real del motor (`pasoQmax.entradas`), no una decisión de
  presentación -- comprimirla sería alterar contenido, no sólo layout.
