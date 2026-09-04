// Desnivel (Δz) total de un camino hidraulico resuelto (raiz -> terminal),
// segundo eslabon del balance de presion de M2-B tras obtenerCaminoHaciaOrigen.
// Compone la primitiva pura calcularDiferenciaDeCota SIN reimplementar
// ninguna aritmetica de cotas.
//
// Endpoint-only, a proposito: para la carga estatica lo unico que importa
// es la diferencia de elevacion entre los dos extremos del camino
// (cota_terminal - cota_raiz). Las cotas de los nodos intermedios son
// irrelevantes para Δz_total -- sumar diferencias sucesivas
// (Σ (cota[i+1]-cota[i])) telescopa exactamente a cota_terminal-cota_raiz
// cuando todas las cotas estan presentes, pero exige TODAS las cotas del
// camino; la forma de extremos exige solo dos y mapea 1:1 a
// calcularDiferenciaDeCota(cotaRaiz, cotaTerminal). Se elige la forma de
// extremos por ser la mas limpia sobre la primitiva real del repo y la
// que pide menos dato. Un consumidor que en el futuro necesite el Δz
// por tramo debera agregarlo entonces, no ahora.
//
// Incompletitud explicita (mismo principio que la barrera de completitud
// de resolverBalanceDePresion / la cobertura fisica S1/S2): si a la raiz
// o al terminal les falta cota_m, NO se asume 0 -- se devuelve
// 'incompleto' con los nodos sin cota. Ausencia de cota_m nunca equivale
// a cota_m=0 (ver modelo/redHidraulica, CRIT-A20).
import type { CaminoHaciaOrigen } from '../topologia/obtenerCaminoHaciaOrigen'
import { calcularDiferenciaDeCota } from './calcularDiferenciaDeCota'

export type ResultadoDesnivelDeCamino =
  | {
      readonly tipo: 'resuelto'
      // Δz = cotaTerminal_m - cotaRaiz_m. Signo conservado: >0 = el
      // terminal esta mas alto que la raiz (el ascenso consume carga
      // estatica); <0 = mas bajo (aporta). Se pasa tal cual a
      // resolverBalanceDePresion como desnivel_m.
      readonly desnivel_m: number
      readonly cotaRaiz_m: number
      readonly cotaTerminal_m: number
    }
  | {
      readonly tipo: 'incompleto'
      // Ids de los nodos extremo (raiz, terminal, o ambos) sin cota_m.
      // Los nodos intermedios sin cota no aparecen: no son necesarios
      // para Δz de extremos.
      readonly nodosSinCota: readonly string[]
    }

export function resolverDesnivelDeCamino(camino: CaminoHaciaOrigen): ResultadoDesnivelDeCamino {
  const nodoRaiz = camino.nodos[0]
  const nodoTerminal = camino.nodos[camino.nodos.length - 1]

  if (nodoRaiz === undefined || nodoTerminal === undefined) {
    // Imposible: obtenerCaminoHaciaOrigen garantiza nodos.length >= 1 en
    // el resultado 'camino'. Chequeo para el angostamiento de tipos.
    throw new Error('resolverDesnivelDeCamino: el camino no contiene ningun nodo')
  }

  const nodosSinCota: string[] = []
  if (nodoRaiz.cota_m === undefined) {
    nodosSinCota.push(nodoRaiz.id)
  }
  // Camino de un solo nodo (raiz inmediata): raiz y terminal son el mismo
  // nodo; no se lo cuenta dos veces.
  if (nodoTerminal.id !== nodoRaiz.id && nodoTerminal.cota_m === undefined) {
    nodosSinCota.push(nodoTerminal.id)
  }

  if (nodosSinCota.length > 0) {
    return { tipo: 'incompleto', nodosSinCota }
  }

  const cotaRaiz_m = nodoRaiz.cota_m as number
  const cotaTerminal_m = nodoTerminal.cota_m as number

  return {
    tipo: 'resuelto',
    desnivel_m: calcularDiferenciaDeCota(cotaRaiz_m, cotaTerminal_m),
    cotaRaiz_m,
    cotaTerminal_m,
  }
}
