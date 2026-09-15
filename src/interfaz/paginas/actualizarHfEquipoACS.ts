// Actualización inmutable de Proyecto.hfEquipoACS_mca (HYD-ACS-MANUAL-LOSS-01,
// D-δ.129): adopción manual, GLOBAL al Proyecto (no hay Tramo/UF que la
// posea -- ver comentario de campo en modelo/proyecto). Mismo patrón que
// actualizarConfiguracionHidraulica.ts: función pura, un único campo con
// semántica propia. `delete` explícito sobre una copia fresca (nunca muta
// el proyecto recibido, nunca deja `hfEquipoACS_mca: undefined` como valor
// de propiedad) para que la ausencia sea real y JSON.stringify no la
// serialice.
import type { Proyecto } from '../../modelo/proyecto'

export function conHfEquipoACS(proyecto: Proyecto, hfEquipoACS_mca: number | undefined): Proyecto {
  if (hfEquipoACS_mca === undefined) {
    const sinHfEquipoACS = { ...proyecto }
    delete sinHfEquipoACS.hfEquipoACS_mca
    return sinHfEquipoACS
  }
  return { ...proyecto, hfEquipoACS_mca }
}

// Decisión pura del <input> de "Pérdida del equipo ACS [m.c.a.]" ante un
// cambio de texto -- mismo criterio que resolverCambioDeLongitud
// (resolverResultadoDeTramoParaUi.ts), con una diferencia deliberada: acá
// SÍ persiste 0 como valor 'establecer' explícito (nunca lo distingue de
// otro número), exactamente igual que longitud_m -- la diferencia
// ausente/cero se preserva en la capa de arriba (conHfEquipoACS), no acá.
export type ResultadoDeCambioDeHfEquipoACS =
  | { readonly tipo: 'omitir' } // campo vacío: "no informado", nunca 0
  | { readonly tipo: 'establecer'; readonly hfEquipoACS_mca: number }
  | { readonly tipo: 'ignorar' } // NaN o negativo: no se persiste ningún cambio

export function resolverCambioDeHfEquipoACS(texto: string): ResultadoDeCambioDeHfEquipoACS {
  if (texto === '') {
    return { tipo: 'omitir' }
  }
  const hfEquipoACS_mca = Number(texto)
  if (Number.isNaN(hfEquipoACS_mca) || !Number.isFinite(hfEquipoACS_mca) || hfEquipoACS_mca < 0) {
    return { tipo: 'ignorar' }
  }
  return { tipo: 'establecer', hfEquipoACS_mca }
}
