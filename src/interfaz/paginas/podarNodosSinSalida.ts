// Poda iterativa de nodos puramente topológicos (sin `referencia`) que
// quedaron sin ningún tramo saliente -- p. ej. la cabecera de bifurcación
// de un Local/UF completo después de que quitarConectividadFisicaDeArtefacto
// desconectó, uno por uno, a todos sus artefactos (ver
// quitarConectividadFisicaDeLocal/quitarConectividadFisicaDeUnidadFuncional).
// A diferencia de la baja de UN artefacto (donde la cabecera se preserva a
// propósito porque el Local sigue existiendo y podría recibir un artefacto
// nuevo, ver quitarConectividadFisicaDeArtefacto.test.ts), acá el Local/UF
// completo desapareció: no hay ningún consumidor futuro que pueda reutilizar
// esa cabecera, así que dejarla viva sería topología muerta permanente,
// invisible para siempre a la UI (D-δ.47).
//
// Nunca toca un nodo con `referencia` (terminal de artefacto o
// produccionACS): esos sobreviven aunque queden sin salientes, por diseño
// ya testeado en quitarConectividadFisicaDeArtefacto.
import type { RedHidraulica } from '../../modelo/redHidraulica'

export function podarNodosSinSalida(redHidraulica: RedHidraulica): RedHidraulica {
  let nodos = redHidraulica.nodos
  let tramos = redHidraulica.tramos

  for (;;) {
    const idsConSalida = new Set(tramos.map((tramo) => tramo.nodoOrigenId))
    const idsAPodar = new Set(
      nodos.filter((nodo) => nodo.referencia === undefined && !idsConSalida.has(nodo.id)).map((nodo) => nodo.id),
    )
    if (idsAPodar.size === 0) {
      return { nodos, tramos }
    }
    nodos = nodos.filter((nodo) => !idsAPodar.has(nodo.id))
    tramos = tramos.filter((tramo) => !idsAPodar.has(tramo.nodoDestinoId))
  }
}
