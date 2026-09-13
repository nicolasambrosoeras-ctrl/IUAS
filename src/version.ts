// Fuente única de la versión de la aplicación (PERSIST-01). Antes vivía
// duplicada como literal en calcularSimultaneidad.ts; ahora ambos lugares
// (metadatos de cálculo y el envelope .iuas) importan de acá. Distinta de
// `SCHEMA_VERSION_ACTUAL` (modelo/proyecto): esto versiona la APLICACIÓN,
// no la forma del dato.
export const VERSION_APP = '0.1.0';
