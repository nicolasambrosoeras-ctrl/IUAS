// PERF-SCALE-01E -- extraído de MotorDemandaPantalla.tsx (agregarUnidadFuncional)
// para poder testearse sin arrastrar React/JSX: mismo criterio que
// duplicarUnidadFuncional.ts (vitest corre con environment 'node', sin DOM).
//
// Construye una Unidad Funcional VACÍA (sin Locales, por lo tanto sin
// Artefactos/terminales/tramos/demanda) y la agrega al final del proyecto.
// Spread superficial de `unidadesFuncionales`: no toca redHidraulica,
// configuracionHidraulica, configuracionMedidores, configuracionAbastecimiento
// ni montantes -- una UF vacía no aporta ningún terminal físico nuevo, así
// que ninguna de esas subestructuras necesita reconstruirse (ver
// agregarUnidadFuncional.equivalencia.test.ts para la evidencia de que M2/M3/M4
// resuelven exactamente igual antes y después).
import type { Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import { generarId } from './generarId'
import { calcularCotaHidraulicaDefaultDeNivel } from './nivelUnidadFuncional'

// D-δ.46: nivel inicial por orden de creación (UF1→PB, UF2→Piso1...) -- solo
// un default de creación, el nivel sigue siendo completamente editable
// después (puede haber varias UF en un mismo piso, ninguna en otro,
// subsuelos, etc., ver PENDIENTES-DE-ARQUITECTURA.md D-δ.46).
export function crearUnidadFuncionalVacia(unidadesFuncionalesExistentes: readonly UnidadFuncional[]): UnidadFuncional {
  const nivel = unidadesFuncionalesExistentes.length
  return {
    id: generarId('uf'),
    nombre: `Unidad funcional ${unidadesFuncionalesExistentes.length + 1}`,
    nivel,
    cotaHidraulicaReferencia_m: calcularCotaHidraulicaDefaultDeNivel(nivel),
    locales: [],
  }
}

export function agregarUnidadFuncionalVaciaEnProyecto(
  proyecto: Proyecto,
): { readonly proyecto: Proyecto; readonly nuevaUf: UnidadFuncional } {
  const nuevaUf = crearUnidadFuncionalVacia(proyecto.unidadesFuncionales)
  return {
    proyecto: { ...proyecto, unidadesFuncionales: [...proyecto.unidadesFuncionales, nuevaUf] },
    nuevaUf,
  }
}
