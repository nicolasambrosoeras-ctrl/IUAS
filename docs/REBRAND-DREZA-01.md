# REBRAND-DREZA-01 (D-δ.138)

## Motivo

Todavía no existe un convenio con IUAS que autorice presentar esta
aplicación como producto o software IUAS, ni atribuirle documentos
generados (memoria técnica, listado de materiales) a esa institución. Por
lo tanto se retira la marca IUAS de toda superficie pública/vigente del
producto: interfaz web, metadata, favicon, memoria técnica, PDF de
materiales, copy técnico y documentación activa.

## Nueva arquitectura de marca

- **Producto:** Caudal
- **Marca / autor:** DREZA
- **Expresión principal:** "Caudal by DREZA" -- "Caudal" domina
  tipográficamente, "by DREZA" actúa como firma discreta, no como un
  segundo nombre de igual peso.

## UI

Header principal (`MotorDemandaPantalla.tsx`, `navegacionUI.css`):
reemplaza el antiguo `<h1>IUAS — Instalaciones internas</h1>` por una
composición de marca (`.marca-caudal`) con dos niveles tipográficos
("Caudal" ~2rem semibold, "by DREZA" pequeño y discreto) más un nuevo
subtítulo "Instalaciones internas de agua" y, debajo, el contexto del
proyecto -- tres niveles de jerarquía en vez de un único h1 homogéneo.
Conserva el verde `--color-primario: #1a6b53` existente, que ahora
también es el color de identidad de Caudal/DREZA.

Copy técnico neutralizado en toda la interfaz: "sugerida IUAS" -> "sugerida",
"Hipótesis IUAS del modo Rápido" -> "Criterio del modo Rápido",
"Configuración típica IUAS" -> "Configuración típica DREZA", mensajes de
error de importación/exportación ("no es un proyecto IUAS válido", "versión
más nueva de IUAS") reescritos sin atribución institucional.

## Metadata web

`index.html`: `<title>`, `meta description`, Open Graph (`og:title`,
`og:description`, `og:site_name`) actualizados a "Caudal by DREZA". El
favicon (`public/favicon.svg`) reemplaza la "I" blanca sobre verde por una
"C", con `aria-label="Caudal"`. La ruta servida (`%BASE_URL%favicon.svg`)
no cambió.

## PDF

**Memoria de cálculo** (`generarDocumentoPdf.ts`): portada con wordmark de
dos niveles ("Caudal" / "by DREZA"), header de páginas internas
"Caudal by DREZA — Memoria de cálculo", metadata (`title`/`author`) y
nombre de archivo (`Caudal_Memoria_de_calculo_<proyecto>.pdf`) actualizados.

**Listado de materiales** (`generarDocumentoPdfMateriales.ts`): mismo
tratamiento -- wordmark de dos niveles en el encabezado, header de página
"Caudal by DREZA — Listado de materiales", metadata con `author: 'DREZA'`
y nombre de archivo `Caudal_Listado_de_materiales_<proyecto>.pdf`.

## Criterios técnicos

Todas las referencias a "criterio IUAS" / "hipótesis IUAS" / "decisión
IUAS" en el copy público del PDF y en `CRITERIOS.md` (documentación activa
de criterios vigentes) pasan a "criterio DREZA" / "decisión DREZA". ERAS-2023
y sus referencias (Tabla N°, artículos, §) quedan exactamente iguales: DREZA
no reemplaza a ERAS, sólo reemplaza a IUAS como marca que adopta criterios
propios no normativos.

## Compatibilidad de persistencia

Sin cambios, deliberadamente. El formato de archivo sigue siendo `.iuas`
con el envelope `format: 'IUAS'` (`src/persistencia/formatoIuas.ts`,
`parsearArchivoIuas.ts`, `exportarProyectoIuas.ts`): un proyecto exportado
antes de este rebrand se sigue importando sin cambios, y el autosave
existente en `localStorage` (claves `iuas:project:...`) se sigue
recuperando igual. El único mensaje humano tocado es el de error de
importación, que ya no dice "proyecto IUAS válido" sino "archivo de
proyecto válido" -- el valor persistido (`format: 'IUAS'`) no se lee ni se
muestra al usuario.

## Legados internos IUAS permitidos

Quedan deliberadamente sin cambiar, por ser infraestructura o formato, no
branding público:

- extensión de archivo `.iuas` y envelope `format: 'IUAS'`;
- claves de `localStorage` con prefijo `iuas:`;
- repo de GitHub y ruta de GitHub Pages `/IUAS/` (`vite.config.ts`,
  `playwright.config.ts`, URLs de producción en tests E2E);
- variables de entorno `IUAS_BASE_URL`, `IUAS_PREVIEW`, `IUAS_FUZZ_*`;
- identificadores internos de código (`parsearArchivoIuas`,
  `alturasHidraulicasIuas.ts`, `layoutTablaIuas`, etc.) y comentarios
  técnicos que documentan decisiones tomadas cuando el proyecto se llamaba
  IUAS;
- documentación histórica (ADRs, handoffs, entradas cerradas de
  `ROADMAP.md` y `PENDIENTES-DE-ARQUITECTURA.md`) que describe decisiones
  ya tomadas bajo el nombre anterior -- no se reescribe la historia por
  cosmética.

## GitHub / URL pendiente

La beta pública sigue sirviéndose transitoriamente en
`https://nicolasambrosoeras-ctrl.github.io/IUAS/`. Renombrar el repo, la
ruta de Pages y eventualmente mudar a un dominio propio queda para un
slice de infraestructura separado (`DEPLOY-REBRAND-01`), fuera de alcance
de este rebrand de contenido.

## Fuera de alcance

Sin cambios de hidráulica, fórmulas, criterios numéricos, schema,
topología, versión de la aplicación (`0.4.0-beta.6` sin bump) ni de
`LICENSE` (sigue pendiente como `BETA-LICENSE-01`).

## Pendientes registrados

- **`PERSIST-REBRAND-01`**: estudiar una eventual transición del formato
  de archivo de `.iuas` a `.caudal` con compatibilidad hacia atrás. No se
  implementa en este slice.
- **`DEPLOY-REBRAND-01`**: rename de repo/URL de GitHub Pages y, si
  corresponde, dominio propio. No se implementa en este slice.

## Siguiente acción

`BETA-LICENSE-01` (MATERIALS-01 ya estaba implementado antes de este
slice, y quedó rebrandeado en el mismo).
