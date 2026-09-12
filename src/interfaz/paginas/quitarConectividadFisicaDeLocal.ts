// Sincronización Proyecto -> redHidraulica al eliminar un Local completo
// (D-δ.47). Sin esto, eliminar un Local con artefactos ya conectados deja
// referencias huérfanas que validarRedHidraulica detecta
// (redHidraulicaReferenciaArtefactoInvalida) y bloquea M1+M2 juntos sin
// ninguna forma de recuperación desde la UI -- mismo riesgo ya conocido
// para la baja de un Artefacto individual (quitarConectividadFisicaDeArtefacto),
// pero sin su mitigación porque nadie llamaba a esa función por cada
// artefacto del Local al eliminarlo entero.
//
// A diferencia de la baja de un solo Artefacto, acá el Local completo deja
// de existir: la cabecera de bifurcación que le pertenecía en exclusiva
// (p. ej. la tee AF de ese Local) no debe sobrevivir sin hijos -- se poda
// con podarNodosSinSalida después de desconectar todos sus artefactos.
import type { Proyecto } from '../../modelo/proyecto'
import { quitarConectividadFisicaDeArtefacto } from './quitarConectividadFisicaDeArtefacto'
import { podarNodosSinSalida } from './podarNodosSinSalida'
import { localesDeUnidadFuncional } from '../../motor/tuberias/geometria/resolverCotaHidraulicaDeArtefacto'

export function quitarConectividadFisicaDeLocal(
  proyecto: Proyecto,
  unidadFuncionalId: string,
  localId: string,
): Proyecto {
  const unidad = proyecto.unidadesFuncionales.find((uf) => uf.id === unidadFuncionalId)
  const local = unidad === undefined ? undefined : localesDeUnidadFuncional(unidad).find((l) => l.id === localId)
  if (local === undefined) {
    return proyecto
  }

  const sinArtefactos = local.artefactos.reduce(
    (proyectoParcial, artefacto) =>
      quitarConectividadFisicaDeArtefacto(proyectoParcial, unidadFuncionalId, localId, artefacto.id),
    proyecto,
  )

  if (sinArtefactos.redHidraulica === undefined) {
    return sinArtefactos
  }

  return { ...sinArtefactos, redHidraulica: podarNodosSinSalida(sinArtefactos.redHidraulica) }
}
