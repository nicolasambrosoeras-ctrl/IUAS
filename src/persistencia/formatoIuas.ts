// Formato de archivo .iuas (PERSIST-01). Envelope versionado que envuelve
// un `Proyecto` para exportación/importación y autosave.
//
// Dos versiones DISTINTAS conviven acá, a propósito (§13/§14 del brief):
//   - `schemaVersion` (este archivo): versiona la forma del ENVELOPE
//     (`format`/`schemaVersion`/`appVersion`/`exportedAt`/`proyecto`).
//     Es independiente de la forma del `Proyecto` en sí.
//   - `proyecto.metadatos.schemaVersion` (modelo/proyecto): versiona la
//     forma del `Proyecto`. Ya tenía infraestructura de migración propia
//     (modelo/proyecto/migraciones), que este módulo reutiliza tal cual --
//     no se duplica ni se reemplaza.
//   - `appVersion`: versión de la aplicación que exportó (src/version.ts),
//     sin relación estructural con ninguna de las dos anteriores.
import type { Proyecto } from '../modelo/proyecto';

export const SCHEMA_VERSION_ARCHIVO_ACTUAL = 1;

export type ArchivoIuas = {
  readonly format: 'IUAS';
  readonly schemaVersion: number;
  readonly appVersion: string;
  readonly exportedAt: string;
  readonly proyecto: Proyecto;
};
