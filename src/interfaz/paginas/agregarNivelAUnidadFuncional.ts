// UI-M1-MULTINIVEL-01 -- extraído de MotorDemandaPantalla.tsx (agregarNivel)
// para poder testearse sin arrastrar React/JSX, mismo criterio que
// agregarUnidadFuncional.ts / duplicarUnidadFuncional.ts.
//
// Agrega un nuevo Nivel físico VACÍO (sin Locales) a una UF ya existente.
// Mismo default de creación que crearUnidadFuncionalVacia (sección 13 del
// brief: "no inventar alturas entre pisos" -- reutiliza la convención ya
// existente en vez de una nueva): nivel = orden de creación DENTRO de esta
// UF, cota = calcularCotaHidraulicaDefaultDeNivel(nivel). No copia Locales
// del nivel anterior ni crea ninguna topología M2 nueva (sección 24).
import type { Nivel, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import { generarId } from './generarId'
import { calcularCotaHidraulicaDefaultDeNivel, nombreDeNivel } from './nivelUnidadFuncional'

export function agregarNivelAUnidadFuncional(unidadFuncional: UnidadFuncional): UnidadFuncional {
  const siguiente = unidadFuncional.niveles.length
  const nuevoNivel: Nivel = {
    id: generarId('nivel'),
    nombre: nombreDeNivel(siguiente),
    nivel: siguiente,
    cotaHidraulicaReferencia_m: calcularCotaHidraulicaDefaultDeNivel(siguiente),
    locales: [],
  }
  return { ...unidadFuncional, niveles: [...unidadFuncional.niveles, nuevoNivel] }
}

export function agregarNivelAUnidadFuncionalEnProyecto(proyecto: Proyecto, unidadFuncionalId: string): Proyecto {
  const unidadFuncional = proyecto.unidadesFuncionales.find((uf) => uf.id === unidadFuncionalId)
  if (unidadFuncional === undefined) {
    return proyecto
  }
  const actualizada = agregarNivelAUnidadFuncional(unidadFuncional)
  return {
    ...proyecto,
    unidadesFuncionales: proyecto.unidadesFuncionales.map((uf) => (uf.id === unidadFuncionalId ? actualizada : uf)),
  }
}
