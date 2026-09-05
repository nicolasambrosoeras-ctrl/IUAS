// Equivalente de quitarConectividadFisicaDeLocal para la baja de una
// UnidadFuncional completa (D-δ.47): desconecta todos los artefactos de
// todos sus Locales antes de que la UF desaparezca de la jerarquía
// funcional, y poda al final la topología que haya quedado sin salida
// (cabeceras exclusivas de cada Local de esta UF).
import type { Proyecto } from '../../modelo/proyecto'
import { quitarConectividadFisicaDeArtefacto } from './quitarConectividadFisicaDeArtefacto'
import { podarNodosSinSalida } from './podarNodosSinSalida'

export function quitarConectividadFisicaDeUnidadFuncional(proyecto: Proyecto, unidadFuncionalId: string): Proyecto {
  const unidad = proyecto.unidadesFuncionales.find((uf) => uf.id === unidadFuncionalId)
  if (unidad === undefined) {
    return proyecto
  }

  const sinArtefactos = unidad.locales.reduce(
    (proyectoParcial, local) =>
      local.artefactos.reduce(
        (siguiente, artefacto) =>
          quitarConectividadFisicaDeArtefacto(siguiente, unidadFuncionalId, local.id, artefacto.id),
        proyectoParcial,
      ),
    proyecto,
  )

  if (sinArtefactos.redHidraulica === undefined) {
    return sinArtefactos
  }

  return { ...sinArtefactos, redHidraulica: podarNodosSinSalida(sinArtefactos.redHidraulica) }
}
