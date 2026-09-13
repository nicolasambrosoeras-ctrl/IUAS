// Autosave local del proyecto (PERSIST-01, §27-§33, §41). Usa
// `localStorage` con la MISMA ruta de serialización/parseo que el
// archivo .iuas exportado (§30): autosave y export/import ejercitan el
// mismo código, no hay un segundo formato paralelo.
//
// No usa IndexedDB (§28): no hay evidencia de que el proyecto exceda con
// holgura los límites prácticos de `localStorage` (ver
// persistencia/autosave.test.ts, que mide el tamaño de proyectos de
// ejemplo y de escala).
import type { Proyecto } from '../modelo/proyecto';
import { serializarProyecto } from './serializarProyecto';
import { parsearArchivoIuas, type ErrorParseoIuas } from './parsearArchivoIuas';

// Versionada (§29): si el envelope cambia de forma incompatible en el
// futuro, se puede introducir `...v2` sin heredar autosaves viejos
// incompatibles a ciegas (siguen convergiendo primero por
// `schemaVersion` del propio envelope, esto es sólo la clave física).
export const CLAVE_AUTOSAVE = 'iuas:project:autosave:v1';

export type ResultadoGuardadoAutosave = { readonly ok: true } | { readonly ok: false; readonly detalle: string };

export function guardarAutosaveDeProyecto(proyecto: Proyecto): ResultadoGuardadoAutosave {
  try {
    const archivo = serializarProyecto(proyecto);
    localStorage.setItem(CLAVE_AUTOSAVE, JSON.stringify(archivo, null, 2));
    return { ok: true };
  } catch (error) {
    // §41: localStorage puede rechazar setItem (cuota, modo privado,
    // deshabilitado). Nunca debe crashear la app ni la edición.
    return { ok: false, detalle: error instanceof Error ? error.message : String(error) };
  }
}

export type ResultadoLecturaAutosave =
  | { readonly tipo: 'vacio' }
  | { readonly tipo: 'valido'; readonly proyecto: Proyecto }
  | { readonly tipo: 'corrupto'; readonly error: ErrorParseoIuas };

export function leerAutosaveDeProyecto(): ResultadoLecturaAutosave {
  let textoCrudo: string | null;
  try {
    textoCrudo = localStorage.getItem(CLAVE_AUTOSAVE);
  } catch {
    // localStorage inaccesible (modo privado estricto, etc): tratar como
    // vacío -- no romper el arranque (§31).
    return { tipo: 'vacio' };
  }

  if (textoCrudo === null) {
    return { tipo: 'vacio' };
  }

  const resultado = parsearArchivoIuas(textoCrudo);
  if (!resultado.exito) {
    // §31: no se borra el autosave corrupto en silencio -- queda tal cual
    // en localStorage para poder diagnosticarlo; sólo se ignora al cargar.
    return { tipo: 'corrupto', error: resultado.error };
  }

  return { tipo: 'valido', proyecto: resultado.proyecto };
}

export function borrarAutosaveDeProyecto(): void {
  try {
    localStorage.removeItem(CLAVE_AUTOSAVE);
  } catch {
    // Sin infraestructura de storage: nada que borrar, nada que romper.
  }
}
