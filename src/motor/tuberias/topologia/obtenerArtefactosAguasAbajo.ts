// Traversal topologico puro: que Artefactos funcionales quedan aguas abajo
// de un Tramo, siguiendo la direccion nodoOrigenId -> nodoDestinoId. No
// aplica computabilidad, CRIT-A8, ni ninguna condicion de demanda: es solo
// la mitad topologica de CRIT-A11 (conjunto de consumos aguas abajo), no el
// criterio completo (ver PENDIENTES-DE-ARQUITECTURA.md, seccion D-delta).
import type { Proyecto } from '../../../modelo/proyecto'
import type { ReferenciaDeArtefacto } from '../../../modelo/redHidraulica'
import { crearIndiceTopologico, type IndiceTopologico } from './indiceTopologico'

export function obtenerArtefactosAguasAbajo(
  proyecto: Proyecto,
  tramoId: string,
  // PERF-SCALE-01D: índice topológico ya construido para ESTA resolución
  // (ver contextoDeCalculoM2.ts). Esta función construía su PROPIO índice
  // (nodosPorId/tramosSalientesPorNodo) desde cero en cada llamada --
  // redundante con el que resolverHidraulicaDeTramo ya arma/comparte para
  // el resto del cálculo del mismo Tramo. Ausente ⇒ comportamiento previo
  // byte a byte (se construye un índice nuevo acá): lo que siguen haciendo
  // el resto de los call sites (fuera del motor de presión de M2).
  indiceTopologico?: IndiceTopologico,
): readonly ReferenciaDeArtefacto[] {
  const { redHidraulica } = proyecto

  // Precondicion imposible tras validarRedHidraulica: ausencia de red no es
  // "cero artefactos", es un error de uso de esta funcion (mismo criterio
  // que n<1 en calcularCoeficienteDeSimultaneidad: defecto de programacion,
  // no estado previsible del dominio).
  if (redHidraulica === undefined) {
    throw new Error('obtenerArtefactosAguasAbajo requiere un proyecto con redHidraulica definida')
  }

  const indice = indiceTopologico ?? crearIndiceTopologico(redHidraulica)
  const tramoInicial = indice.tramosPorId.get(tramoId)

  if (tramoInicial === undefined) {
    throw new Error(`obtenerArtefactosAguasAbajo: no existe ningun tramo con id "${tramoId}"`)
  }

  const nodosPorId = indice.nodosPorId
  const tramosSalientesPorNodo = indice.tramosSalientesPorNodo

  const nodosVisitados = new Set<string>()
  const clavesDeParticipantesVistos = new Set<string>()
  const resultado: ReferenciaDeArtefacto[] = []

  // DFS iterativo con pila explicita: evita recursion y es trivial de
  // proteger contra ciclos con nodosVisitados (el modelo actual no los
  // prohibe; una futura recirculacion de ACS podria introducirlos).
  const pila: string[] = [tramoInicial.nodoDestinoId]

  while (pila.length > 0) {
    const nodoId = pila.pop() as string

    if (nodosVisitados.has(nodoId)) {
      continue
    }
    nodosVisitados.add(nodoId)

    const nodo = nodosPorId.get(nodoId)
    if (nodo === undefined) {
      continue
    }

    const referencia = nodo.referencia

    // Un nodo que referencia un Artefacto es terminal en este slice: se
    // registra el participante y no se expande mas alla (no se anticipan
    // artefactos hidraulicos en serie).
    if (referencia !== undefined && referencia.tipo === 'artefacto') {
      // JSON.stringify de la tupla evita colisiones que un separador de
      // texto simple ("a::b" + "c" vs. "a" + "b::c") no puede descartar,
      // ya que el modelo no prohibe "::" dentro de un id.
      const clave = JSON.stringify([referencia.unidadFuncionalId, referencia.localId, referencia.artefactoId])
      if (!clavesDeParticipantesVistos.has(clave)) {
        clavesDeParticipantesVistos.add(clave)
        resultado.push(referencia)
      }
      continue
    }

    // Nodo de produccion ACS o puramente topologico (bifurcacion, union,
    // sin referencia): continua el recorrido sin filtrar por Tramo.red.
    // Orden inverso al cargar la pila LIFO: el primer tramo declarado en
    // RedHidraulica.tramos queda arriba de la pila y se visita primero.
    const salientes = tramosSalientesPorNodo.get(nodoId) ?? []
    for (let indice = salientes.length - 1; indice >= 0; indice -= 1) {
      const tramoSaliente = salientes[indice]
      if (tramoSaliente !== undefined) {
        pila.push(tramoSaliente.nodoDestinoId)
      }
    }
  }

  return resultado
}
