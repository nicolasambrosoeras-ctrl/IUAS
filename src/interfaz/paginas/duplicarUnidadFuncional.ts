// Duplicacion funcional profunda de una UnidadFuncional (UX-1). Vive fuera
// de MotorDemandaPantalla.tsx para poder testearse sin arrastrar React/JSX:
// vitest corre con environment 'node' (vite.config.ts), sin DOM ni
// testing-library configurados, y este archivo no necesita ninguno de los
// dos.
import type { Artefacto, Local, Proyecto, UnidadFuncional } from '../../modelo/proyecto'

// IDs unicos via crypto.randomUUID() (API nativa del navegador, sin
// dependencia nueva): un contador de modulo colisionaria con los IDs que ya
// trae el proyecto inicial (local-bano, artefacto-1, etc.). Movida aca desde
// MotorDemandaPantalla.tsx: es la misma funcion, reutilizada tal cual, no
// una nueva.
export function generarId(prefijo: string): string {
  return `${prefijo}-${crypto.randomUUID()}`
}

// Privadas a este archivo a proposito: no son una API generica de
// clonacion, son los dos pasos internos que necesita duplicarUnidadFuncional
// para reconstruir su arbol. No se exportan como abstraccion reutilizable
// para Locales (eso queda para cuando exista duplicarLocal como incremento
// propio).
function duplicarArtefacto(artefacto: Artefacto): Artefacto {
  return { ...artefacto, id: generarId('artefacto') }
}

function duplicarLocal(local: Local): Local {
  return { ...local, id: generarId('local'), artefactos: local.artefactos.map(duplicarArtefacto) }
}

export function duplicarUnidadFuncional(unidadFuncional: UnidadFuncional): UnidadFuncional {
  return {
    ...unidadFuncional,
    id: generarId('uf'),
    nombre: `${unidadFuncional.nombre} (copia)`,
    locales: unidadFuncional.locales.map(duplicarLocal),
  }
}

// Inserta la copia inmediatamente despues de la UF origen dentro de
// proyecto.unidadesFuncionales. Solo reconstruye ese array: el resto de
// Proyecto (incluido redHidraulica, si existe) se preserva por referencia
// via spread, sin tocarlo ni intentar repararlo.
export function duplicarUnidadFuncionalEnProyecto(
  proyecto: Proyecto,
  unidadFuncionalId: string,
): Proyecto {
  const unidadesFuncionales = proyecto.unidadesFuncionales.flatMap((uf) =>
    uf.id === unidadFuncionalId ? [uf, duplicarUnidadFuncional(uf)] : [uf],
  )
  return { ...proyecto, unidadesFuncionales }
}
