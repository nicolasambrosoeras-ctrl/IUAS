// D-δ.52 Parte B (CRIT-A15): al cambiar el tipo de catálogo de un
// Artefacto ya existente, reconcilia su conectividad física AF/AC POR
// CONJUNTOS -- sin desconectar y reconstruir todo. Compone primitivas ya
// cerradas, no reimplementa ninguna regla topológica:
//
//   redesActuales = las Redes en las que la instancia tiene terminal HOY
//                   (leído de redHidraulica).
//   redesNuevas   = las Redes que el tipo NUEVO necesita
//                   (determinarRedesFisicasPorPrecedente -- del PROPIO
//                   proyecto, nunca del catálogo, CRIT-A15). Si no hay
//                   precedente inequívoco, NO se toca la topología: solo
//                   queda el cambio funcional (brief §23/§24).
//
//   conservar (redesActuales ∩ redesNuevas): intactas -- nodos, tramos,
//     longitud, accesorios, override manual de DN se preservan (brief §16/
//     §A11/§A12).
//   eliminar  (redesActuales − redesNuevas): quitarConectividadFisicaDeArtefacto
//     acotado a esa Red + podarNodosSinSalida (limpia una cabecera de
//     bifurcación que quedó sin hijos -- brief §18/§21; la Alimentación
//     ACS compartida sobrevive porque tiene `referencia`, brief §21).
//   agregar   (redesNuevas − redesActuales): sincronizarConectividadFisicaDeArtefacto
//     (D-δ.49: bootstrap / retrofit / hermano según la topología
//     existente -- NO un cuarto algoritmo, brief §17/§22).
//
// Idempotente (brief §27): con redesActuales === redesNuevas no elimina ni
// agrega nada. El caller aplica el cambio funcional y ESTA reconciliación
// en un único updater, sin render intermedio inconsistente (brief §26).
import type { Proyecto } from '../../modelo/proyecto'
import type { RedDeTramo } from '../../modelo/redHidraulica'
import { determinarRedesFisicasPorPrecedente } from '../../motor/tuberias/topologia/determinarRedesFisicasPorPrecedente'
import { quitarConectividadFisicaDeArtefacto } from './quitarConectividadFisicaDeArtefacto'
import { podarNodosSinSalida } from './podarNodosSinSalida'
import { sincronizarConectividadFisicaDeArtefactoConRedesDeclaradas } from './sincronizarConectividadFisicaDeArtefacto'

export function reconciliarConectividadFisicaPorCambioDeArtefacto(
  // Proyecto con el nuevo `artefactoId` YA aplicado en la instancia.
  proyecto: Proyecto,
  unidadFuncionalId: string,
  localId: string,
  artefactoInstanciaId: string,
): Proyecto {
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    return proyecto
  }

  const unidadFuncional = proyecto.unidadesFuncionales.find((uf) => uf.id === unidadFuncionalId)
  const local = unidadFuncional?.locales.find((l) => l.id === localId)
  const artefacto = local?.artefactos.find((a) => a.id === artefactoInstanciaId)
  if (artefacto === undefined) {
    return proyecto
  }

  const idsNodosDeLaInstancia = new Set(
    redHidraulica.nodos
      .filter(
        (nodo) =>
          nodo.referencia?.tipo === 'artefacto' &&
          nodo.referencia.unidadFuncionalId === unidadFuncionalId &&
          nodo.referencia.localId === localId &&
          nodo.referencia.artefactoId === artefactoInstanciaId,
      )
      .map((nodo) => nodo.id),
  )
  const redesActuales = new Set<RedDeTramo>(
    redHidraulica.tramos.filter((tramo) => idsNodosDeLaInstancia.has(tramo.nodoDestinoId)).map((tramo) => tramo.red),
  )

  const precedente = determinarRedesFisicasPorPrecedente(proyecto, artefacto.artefactoId, artefactoInstanciaId)
  if (precedente.tipo !== 'determinado') {
    // No se puede determinar qué Redes necesita el tipo nuevo sin inferir
    // del catálogo (CRIT-A15): se deja SOLO el cambio funcional, la
    // topología física queda como estaba y la barrera de cobertura
    // (S1/S2) sigue siendo la única fuente de verdad sobre qué falta.
    return proyecto
  }
  const redesNuevas = new Set<RedDeTramo>(precedente.redes)

  let resultado = proyecto
  let seEliminoAlgo = false
  for (const red of redesActuales) {
    if (!redesNuevas.has(red)) {
      resultado = quitarConectividadFisicaDeArtefacto(resultado, unidadFuncionalId, localId, artefactoInstanciaId, red)
      seEliminoAlgo = true
    }
  }
  if (seEliminoAlgo && resultado.redHidraulica !== undefined) {
    resultado = { ...resultado, redHidraulica: podarNodosSinSalida(resultado.redHidraulica) }
  }

  const faltaAlgunaRed = [...redesNuevas].some((red) => !redesActuales.has(red))
  if (faltaAlgunaRed) {
    // Redes ya determinadas acá (excluyendo esta instancia del precedente):
    // se pasan declaradas -- la variante por precedente volvería a mirar
    // el proyecto y vería esta instancia con conectividad parcial,
    // dándole 'inconsistente'. La función es idempotente para las Redes
    // que ya tienen terminal (conserva su topología intacta).
    const sincronizacion = sincronizarConectividadFisicaDeArtefactoConRedesDeclaradas(
      resultado,
      unidadFuncionalId,
      localId,
      artefactoInstanciaId,
      [...redesNuevas],
    )
    if (sincronizacion.tipo === 'sincronizado') {
      resultado = sincronizacion.proyecto
    }
  }

  return resultado
}
