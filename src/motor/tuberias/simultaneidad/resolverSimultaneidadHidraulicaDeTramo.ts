// Orquestacion minima de simultaneidad hidraulica por Tramo: compone
// agregarAportesHidraulicosDeTramo + determinarAEfectivo + calcularSimultaneidadDeTramo,
// sin agregar logica propia. No resuelve topologia, catalogo, condicion
// hidraulica ni qu_lps -- recibe AporteHidraulicoDeTramo[] ya construidos.
// Garantiza por construccion (CRIT-A14) que agregacion y aEfectivo se
// calculan sobre exactamente el mismo conjunto de aportes: un futuro
// caller no puede pasarle un conjunto a la agregacion y otro distinto al
// aEfectivo, porque esta funcion solo recibe un unico array.
import type { TipoDeProyecto } from '../../../modelo/proyecto'
import type { AporteHidraulicoDeTramo } from '../aporte/resolverAportesHidraulicosDeTramo'
import { agregarAportesHidraulicosDeTramo } from '../agregacion/agregarAportesHidraulicosDeTramo'
import { determinarAEfectivo } from './determinarAEfectivo'
import { calcularSimultaneidadDeTramo, type ResultadoSimultaneidadDeTramo } from './calcularSimultaneidadDeTramo'

export function resolverSimultaneidadHidraulicaDeTramo(
  tipoDeProyecto: TipoDeProyecto,
  aportes: readonly AporteHidraulicoDeTramo[],
): ResultadoSimultaneidadDeTramo {
  const agregacion = agregarAportesHidraulicosDeTramo(aportes)
  const aEfectivo = determinarAEfectivo(tipoDeProyecto, aportes)

  return calcularSimultaneidadDeTramo(agregacion, aEfectivo)
}
