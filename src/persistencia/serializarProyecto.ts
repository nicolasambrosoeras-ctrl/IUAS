// Serializador puro de Proyecto -> ArchivoIuas (PERSIST-01, §17). No toca
// el navegador, no descarga nada, no muta el proyecto recibido y no
// calcula hidráulica: sólo envuelve el Proyecto (que ya excluye por
// diseño todo resultado derivado, ver modelo/proyecto) en el envelope
// versionado. La descarga a archivo vive aparte (exportarProyectoIuas.ts).
import type { Proyecto } from '../modelo/proyecto';
import { SCHEMA_VERSION_ARCHIVO_ACTUAL, type ArchivoIuas } from './formatoIuas';
import { VERSION_APP } from '../version';

export function serializarProyecto(
  proyecto: Proyecto,
  opciones?: { readonly ahora?: () => Date },
): ArchivoIuas {
  const ahora = opciones?.ahora ?? (() => new Date());
  return {
    format: 'IUAS',
    schemaVersion: SCHEMA_VERSION_ARCHIVO_ACTUAL,
    appVersion: VERSION_APP,
    exportedAt: ahora().toISOString(),
    proyecto,
  };
}
