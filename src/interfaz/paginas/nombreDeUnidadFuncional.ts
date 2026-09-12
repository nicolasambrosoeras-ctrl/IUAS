// UX-02 / UI-01E (D-δ.77, FIX P2 §34-36): nombre HUMANO de una Unidad
// Funcional a partir de su id interno. Ninguna superficie orientada al
// usuario debe mostrar `uf-<uuid>`; el id sigue siendo la clave interna
// (props, keys, overrides), sólo cambia lo que se pinta.
//
// Se lee siempre del `Proyecto` actual: renombrar la UF o cambiar su
// nivel se refleja de inmediato, sin cachear. Fallback explícito y
// legible si el id no resuelve (nunca se muestra el uuid).
import type { Proyecto } from '../../modelo/proyecto'
import { nombreDeNivel } from './nivelUnidadFuncional'

export function nombreDeUnidadFuncional(proyecto: Proyecto, unidadFuncionalId: string): string {
  const uf = proyecto.unidadesFuncionales.find((candidata) => candidata.id === unidadFuncionalId)
  if (uf === undefined) {
    return 'Unidad funcional (no encontrada)'
  }
  // UI-M1-MULTINIVEL-01: con un único nivel (el caso histórico) se sigue
  // mostrando igual que antes; con 2+ niveles no hay un único nivel que
  // anexar al nombre.
  const primerNivel = uf.niveles[0]
  if (uf.niveles.length !== 1 || primerNivel === undefined || primerNivel.nivel === undefined) {
    return uf.nombre
  }
  return `${uf.nombre} · ${nombreDeNivel(primerNivel.nivel)}`
}
