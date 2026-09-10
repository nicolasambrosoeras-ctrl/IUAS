// Resolución EN LOTE de la condición hidráulica topológica del par
// (Tramo, Artefacto) para TODOS los artefactos aguas abajo de un Tramo, en
// UN solo traversal DFS compartido (PERF-SCALE-01A).
//
// Antes de este slice, `determinarCondicionHidraulicaDeCaudal` se llamaba
// una vez por cada par (Tramo, Artefacto) evaluado durante una resolución
// -- y cada llamada reconstruía los mapas de nodos/salientes y hacía su
// propio DFS aguas abajo. Con N artefactos aguas abajo de un Tramo eso son
// N reconstrucciones de índice + N traversals sobre la MISMA subred para
// obtener N respuestas.
//
// Esta función hace el mismo DFS UNA vez: recorre la subred aguas abajo del
// Tramo con el mismo estado compuesto (nodoId, pasoPorACS) y el mismo
// criterio de deduplicación que el clasificador puntual, pero en vez de
// buscar UN artefacto objetivo, registra para CADA artefacto terminal
// alcanzado por qué rutas se lo alcanzó (con ACS / sin ACS). El mapeo final
// ruta -> condición es idéntico al del clasificador puntual:
//
//   alcanzado sin ACS y con ACS  -> 'total'
//   sólo sin ACS                 -> 'aguaFria'
//   sólo con ACS                 -> 'aguaCaliente'
//
// El resultado de `determinarCondicionHidraulicaDeCaudal(red, tramoId, X)`
// es exactamente `resolver...AguasAbajo(indice, tramoId).get(claveDe(X))`
// (o su `throw` de "no está aguas abajo" cuando la clave no está presente).
import type { Nodo, ReferenciaDeArtefacto } from '../../../modelo/redHidraulica'
import type { IndiceTopologico } from '../topologia/indiceTopologico'
import { registrarTraversalCondicionAguasAbajo } from '../topologia/instrumentacionTopologica'
import type { CondicionHidraulicaDeCaudal } from './resolverQuEfectivo'

// Clave estructural de una ReferenciaDeArtefacto: mismo criterio que
// obtenerArtefactosAguasAbajo (JSON.stringify de la tupla evita colisiones
// que un separador de texto simple no puede descartar -- el modelo no
// prohíbe separadores dentro de un id).
export function claveDeReferenciaDeArtefacto(referencia: ReferenciaDeArtefacto): string {
  return JSON.stringify([referencia.unidadFuncionalId, referencia.localId, referencia.artefactoId])
}

export type CondicionesHidraulicasAguasAbajo = ReadonlyMap<string, CondicionHidraulicaDeCaudal>

export function resolverCondicionesHidraulicasDeCaudalAguasAbajo(
  indice: IndiceTopologico,
  tramoId: string,
): CondicionesHidraulicasAguasAbajo {
  registrarTraversalCondicionAguasAbajo()

  const tramoInicial = indice.tramosPorId.get(tramoId)

  // Precondición imposible tras validarRedHidraulica: mismo criterio y
  // mismo texto que determinarCondicionHidraulicaDeCaudal.
  if (tramoInicial === undefined) {
    throw new Error(
      `resolverCondicionesHidraulicasDeCaudalAguasAbajo: no existe ningun tramo con id "${tramoId}"`,
    )
  }

  const rutasPorArtefacto = new Map<string, { sinACS: boolean; conACS: boolean }>()

  // Conservación de masa en el equipo de producción ACS: un Tramo ya
  // declarado 'AC' entrega quCaliente para todo artefacto aguas abajo, sin
  // analizar la ruta. Se modela sembrando la pila con pasoPorACS=true: todo
  // artefacto terminal alcanzado queda 'sólo con ACS' -> 'aguaCaliente',
  // igual que el retorno temprano del clasificador puntual.
  const pasoPorACSInicial = tramoInicial.red === 'AC'

  const estadosVisitados = new Set<string>()
  const pila: Array<{ nodoId: string; pasoPorACS: boolean }> = [
    { nodoId: tramoInicial.nodoDestinoId, pasoPorACS: pasoPorACSInicial },
  ]

  while (pila.length > 0) {
    const estado = pila.pop() as { nodoId: string; pasoPorACS: boolean }
    const claveEstado = `${estado.nodoId}|${estado.pasoPorACS ? 'acs' : 'directa'}`

    if (estadosVisitados.has(claveEstado)) {
      continue
    }
    estadosVisitados.add(claveEstado)

    const nodo: Nodo | undefined = indice.nodosPorId.get(estado.nodoId)
    if (nodo === undefined) {
      continue
    }

    const referencia = nodo.referencia

    // Un nodo que referencia un Artefacto es terminal: se registra la ruta
    // y no se atraviesa (mismo criterio que el clasificador puntual y que
    // obtenerArtefactosAguasAbajo).
    if (referencia !== undefined && referencia.tipo === 'artefacto') {
      const clave = claveDeReferenciaDeArtefacto(referencia)
      const rutas = rutasPorArtefacto.get(clave) ?? { sinACS: false, conACS: false }
      if (estado.pasoPorACS) {
        rutas.conACS = true
      } else {
        rutas.sinACS = true
      }
      rutasPorArtefacto.set(clave, rutas)
      continue
    }

    const pasoPorACSDesdeAqui =
      (referencia !== undefined && referencia.tipo === 'produccionACS') || estado.pasoPorACS

    const salientes = indice.tramosSalientesPorNodo.get(estado.nodoId) ?? []
    for (let indiceSaliente = salientes.length - 1; indiceSaliente >= 0; indiceSaliente -= 1) {
      const tramoSaliente = salientes[indiceSaliente]
      if (tramoSaliente !== undefined) {
        pila.push({ nodoId: tramoSaliente.nodoDestinoId, pasoPorACS: pasoPorACSDesdeAqui })
      }
    }
  }

  const condiciones = new Map<string, CondicionHidraulicaDeCaudal>()
  for (const [clave, rutas] of rutasPorArtefacto) {
    if (rutas.sinACS && rutas.conACS) {
      condiciones.set(clave, 'total')
    } else if (rutas.sinACS) {
      condiciones.set(clave, 'aguaFria')
    } else {
      condiciones.set(clave, 'aguaCaliente')
    }
  }
  return condiciones
}
