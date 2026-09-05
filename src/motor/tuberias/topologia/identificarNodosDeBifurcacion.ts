// Identifica, sobre toda la RedHidraulica, los Nodos que estructuralmente
// son una bifurcacion de tee (CRIT-A31): exactamente 1 Tramo entrante y 2
// Tramos salientes -- el unico alcance que ConfiguracionDeTee soporta hoy
// (D-δ.33). Traversal puro, sin logica de UI: mismo criterio estructural
// que ya usa validarRedHidraulica (salientes.length===2 && entrantes.length===1)
// y resolverClasificacionDeTee, pero a nivel de NODO completo (para
// ofrecer la superficie de configuracion), no de un Tramo saliente
// puntual (para clasificar su Ks). No decide si la tee ya esta
// configurada -- eso lo expone Nodo.tee tal cual, sin reinterpretarlo.
import type { RedHidraulica } from '../../../modelo/redHidraulica'

export type NodoDeBifurcacion = {
  readonly nodoId: string
  readonly tramoEntranteId: string
  readonly tramosSalientesIds: readonly [string, string]
}

export function identificarNodosDeBifurcacion(redHidraulica: RedHidraulica): readonly NodoDeBifurcacion[] {
  const resultado: NodoDeBifurcacion[] = []

  for (const nodo of redHidraulica.nodos) {
    const entrantes = redHidraulica.tramos.filter((tramo) => tramo.nodoDestinoId === nodo.id)
    const salientes = redHidraulica.tramos.filter((tramo) => tramo.nodoOrigenId === nodo.id)

    if (entrantes.length === 1 && salientes.length === 2) {
      resultado.push({
        nodoId: nodo.id,
        tramoEntranteId: entrantes[0]!.id,
        tramosSalientesIds: [salientes[0]!.id, salientes[1]!.id],
      })
    }
  }

  return resultado
}
