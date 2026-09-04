// Cuenta terminales fisicos de una red (AF|AC) dentro de un Local
// (D-delta.40, modo estandar/estimado de perdidas localizadas): "cuantos
// Artefactos de ese Local estan efectivamente conectados a esa red en
// RedHidraulica". Inspeccion estructural directa (Nodo -> tramo entrante
// -> Tramo.red), mismo patron que determinarConectividadFisica (CRIT-A15,
// firme) -- pero esa funcion responde "esta esta referencia conectada a
// AF/AC/ambas" para UNA referencia puntual; esta responde "cuantas
// referencias distintas de este Local tienen terminal en esta red",
// agregando sobre todos los Artefactos del Local. No reutiliza
// determinarConectividadFisica: evita reconstruir, por cada Artefacto del
// Local, la misma lista de nodos/tramos ya recorrida.
//
// Un Artefacto con conectividad fisica AF+AC (CRIT-A15) tiene DOS Nodos
// terminales distintos en RedHidraulica -- misma referencia, cada uno
// alcanzado por un Tramo de red distinta -- asi que participa en el
// conteo de AMBAS redes por separado, nunca en las dos "por accidente" ni
// solo en una.
import type { RedDeTramo, RedHidraulica } from '../../../modelo/redHidraulica'

export function contarTerminalesFisicosDeLocal(
  redHidraulica: RedHidraulica,
  unidadFuncionalId: string,
  localId: string,
  red: RedDeTramo,
): number {
  const idsDeNodosTerminalesDeLocal = redHidraulica.nodos
    .filter(
      (nodo) =>
        nodo.referencia?.tipo === 'artefacto' &&
        nodo.referencia.unidadFuncionalId === unidadFuncionalId &&
        nodo.referencia.localId === localId,
    )
    .map((nodo) => nodo.id)
  const idsDeNodosTerminales = new Set(idsDeNodosTerminalesDeLocal)

  const idsDeNodosConectadosAEstaRed = new Set(
    redHidraulica.tramos
      .filter((tramo) => tramo.red === red && idsDeNodosTerminales.has(tramo.nodoDestinoId))
      .map((tramo) => tramo.nodoDestinoId),
  )

  return idsDeNodosConectadosAEstaRed.size
}
