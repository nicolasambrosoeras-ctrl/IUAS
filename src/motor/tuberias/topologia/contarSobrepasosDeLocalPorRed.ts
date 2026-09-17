// HYD-OVERPASS-01: cuenta cuántos "Sobrepaso fusión" (Acqua System)
// corresponden a un (Local, red) puntual -- fuente única de verdad
// consumida tanto por el balance hidráulico (resolverPerdidaLocalizadaEstimadaDeLocal)
// como por el listado de materiales (resolverAccesoriosConstructivosDreza),
// para que ambos usen exactamente el mismo criterio y nunca puedan
// divergir ni duplicar.
//
// Reglas de asignación de red (decisión de dominio del usuario,
// HYD-OVERPASS-01): un Artefacto conectado a AMBAS redes (AF+AC) recibe
// un único sobrepaso, asignado a la rama terminal de AC (nunca genera 2).
// Un Artefacto conectado sólo a AF se asigna a AF; sólo a AC se asigna a
// AC. Ponderado por `Artefacto.cantidad` (un Artefacto con cantidad=3
// pesa 3, no 1 -- mismo criterio que el resto de la estimación DREZA).
import type { Local } from '../../../modelo/proyecto'
import type { RedDeTramo, RedHidraulica } from '../../../modelo/redHidraulica'

// PERF-SCALE: inspección de UNA sola pasada sobre nodos+tramos (mismo
// patrón que contarTerminalesFisicosDeLocal), en vez de invocar
// determinarConectividadFisica (que vuelve a recorrer TODA la red) una vez
// por Artefacto -- esta función se llama dentro de
// resolverPerdidaLocalizadaEstimadaDeLocal, en el camino caliente del
// solver iterativo (a diferencia de resolverAccesoriosConstructivosDreza,
// que corre una sola vez al exportar el PDF), así que el costo por
// llamada importa a escala de proyecto (14 UF × 3 locales).
export function contarSobrepasosDeLocalPorRed(
  redHidraulica: RedHidraulica,
  local: Local,
  unidadFuncionalId: string,
  localId: string,
  red: RedDeTramo,
): number {
  const artefactoIdPorNodo = new Map<string, string>()
  for (const nodo of redHidraulica.nodos) {
    if (
      nodo.referencia?.tipo === 'artefacto' &&
      nodo.referencia.unidadFuncionalId === unidadFuncionalId &&
      nodo.referencia.localId === localId
    ) {
      artefactoIdPorNodo.set(nodo.id, nodo.referencia.artefactoId)
    }
  }
  if (artefactoIdPorNodo.size === 0) {
    return 0
  }

  const redesPorArtefacto = new Map<string, Set<RedDeTramo>>()
  for (const tramo of redHidraulica.tramos) {
    const artefactoId = artefactoIdPorNodo.get(tramo.nodoDestinoId)
    if (artefactoId === undefined) {
      continue
    }
    const redes = redesPorArtefacto.get(artefactoId) ?? new Set<RedDeTramo>()
    redes.add(tramo.red)
    redesPorArtefacto.set(artefactoId, redes)
  }

  let total = 0
  for (const artefacto of local.artefactos) {
    const redes = redesPorArtefacto.get(artefacto.id)
    if (redes === undefined || redes.size === 0) {
      continue
    }
    // Regla de asignación (HYD-OVERPASS-01): AF+AC -> AC; sólo AF -> AF;
    // sólo AC -> AC. Nunca 2 sobrepasos por el mismo Artefacto.
    const redAsignada: RedDeTramo = redes.has('AF') && !redes.has('AC') ? 'AF' : 'AC'
    if (redAsignada === red) {
      total += artefacto.cantidad
    }
  }
  return total
}
