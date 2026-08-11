// Orquestacion de simultaneidad hidraulica por Tramo: compone
// agregarAportesHidraulicosDeTramo + determinarAEfectivo + calcularSimultaneidadDeTramo,
// y aplica sobre su resultado el piso fisico de caudal individual
// (CRIT-A22, Incremento correctivo 1): Qc final de diseño del Tramo no
// puede ser inferior al mayor qu efectivo individual que ese mismo Tramo
// debe poder abastecer. calcularSimultaneidadDeTramo (formula estadistica
// pura: Qmax/Kc/K/Qc estadistico) permanece intacta y ajena a este
// criterio -- el piso se aplica aca, un paso despues, sobre su resultado.
// qu maximo se calcula sobre exactamente el mismo array `aportes` que ya
// alimenta la agregacion y aEfectivo (universo final post CRIT-A8/
// condicion hidraulica/qu>0), nunca sobre catalogo bruto ni artefactos
// suprimidos. No resuelve topologia, catalogo, condicion hidraulica ni
// qu_lps -- recibe AporteHidraulicoDeTramo[] ya construidos. Garantiza
// por construccion (CRIT-A14) que agregacion, aEfectivo y el piso se
// calculan sobre exactamente el mismo conjunto de aportes.
import type { TipoDeProyecto } from '../../../modelo/proyecto'
import type { AporteHidraulicoDeTramo } from '../aporte/resolverAportesHidraulicosDeTramo'
import { agregarAportesHidraulicosDeTramo } from '../agregacion/agregarAportesHidraulicosDeTramo'
import { determinarAEfectivo } from './determinarAEfectivo'
import { calcularSimultaneidadDeTramo, type ResultadoSimultaneidadDeTramo } from './calcularSimultaneidadDeTramo'

// Amplia ResultadoSimultaneidadDeTramo (formula estadistica pura, sin
// cambios) con la trazabilidad del piso fisico: qc_lps pasa a significar
// el Qc FINAL de diseño (post-piso), nunca solo el estadistico -- por
// eso se reemplaza, no se agrega aparte, para que un consumidor que solo
// lea qc_lps (N1/N3) siga recibiendo el valor correcto sin cambios.
export type ResultadoSimultaneidadHidraulicaDeTramo = Omit<ResultadoSimultaneidadDeTramo, 'qc_lps'> & {
  readonly qcEstadistico_lps: number
  readonly quMaxParticipante_lps: number
  readonly qc_lps: number
  readonly pisoCaudalIndividualAplicado: boolean
}

export function resolverSimultaneidadHidraulicaDeTramo(
  tipoDeProyecto: TipoDeProyecto,
  aportes: readonly AporteHidraulicoDeTramo[],
): ResultadoSimultaneidadHidraulicaDeTramo {
  const agregacion = agregarAportesHidraulicosDeTramo(aportes)
  const aEfectivo = determinarAEfectivo(tipoDeProyecto, aportes)

  const resultadoEstadistico = calcularSimultaneidadDeTramo(agregacion, aEfectivo)
  const qcEstadistico_lps = resultadoEstadistico.qc_lps

  // CRIT-A22: qu maximo sobre los aportes PARTICIPANTES FINALES (mismo
  // array que ya determina n/Qmax/aEfectivo) -- nunca sobre catalogo
  // bruto ni artefactos ya suprimidos por CRIT-A8. `aportes` no puede
  // estar vacio aca: resolverHidraulicaDeTramo ya devuelve 'sinDemanda'
  // antes de llegar a este punto cuando no hay participantes.
  const quMaxParticipante_lps = Math.max(...aportes.map((aporte) => aporte.qu_lps))
  const pisoCaudalIndividualAplicado = quMaxParticipante_lps > qcEstadistico_lps
  const qc_lps = pisoCaudalIndividualAplicado ? quMaxParticipante_lps : qcEstadistico_lps

  return { ...resultadoEstadistico, qcEstadistico_lps, quMaxParticipante_lps, qc_lps, pisoCaudalIndividualAplicado }
}
