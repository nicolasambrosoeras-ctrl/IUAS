// Clasificador puro de condicion hidraulica para el par (Tramo, Artefacto):
// deriva 'total' | 'aguaFria' | 'aguaCaliente' exclusivamente de la
// topologia (RedHidraulica), sin consultar catalogo, ArtefactoNormativo ni
// calcular qu/demanda. La condicion NO es una propiedad del Tramo: un mismo
// Tramo puede rendir condiciones distintas segun el Artefacto evaluado (ver
// PENDIENTES-DE-ARQUITECTURA.md, analisis previo de CRIT-A14/D-delta).
import type { Nodo, RedHidraulica, ReferenciaDeArtefacto, Tramo } from '../../../modelo/redHidraulica'
import type { CondicionHidraulicaDeCaudal } from './resolverQuEfectivo'

function esMismaReferencia(a: ReferenciaDeArtefacto, b: ReferenciaDeArtefacto): boolean {
  return a.unidadFuncionalId === b.unidadFuncionalId && a.localId === b.localId && a.artefactoId === b.artefactoId
}

export function determinarCondicionHidraulicaDeCaudal(
  redHidraulica: RedHidraulica,
  tramoId: string,
  artefacto: ReferenciaDeArtefacto,
): CondicionHidraulicaDeCaudal {
  const tramoInicial = redHidraulica.tramos.find((tramo) => tramo.id === tramoId)

  // Precondicion imposible tras validarRedHidraulica: mismo criterio que
  // obtenerArtefactosAguasAbajo (tramoId inexistente es un error de uso,
  // no "ninguna condicion").
  if (tramoInicial === undefined) {
    throw new Error(`determinarCondicionHidraulicaDeCaudal: no existe ningun tramo con id "${tramoId}"`)
  }

  // Conservacion de masa en el equipo de produccion ACS:
  // Q_entrada_AF_equipo = Q_salida_AC. 'aguaCaliente' significa "seleccionar
  // quCaliente_lps", no "el fluido de este tramo ya esta fisicamente
  // caliente" -- por eso el tramo AF que alimenta directamente al equipo
  // tambien clasifica como 'aguaCaliente' via el traversal de abajo, y un
  // tramo ya declarado AC no necesita ese analisis: se resuelve de una.
  // No se exige aca que descienda de un nodo produccionACS -- esa
  // coherencia semantica es responsabilidad de la validacion de la red, no
  // de este clasificador (ver analisis previo, D-delta).
  if (tramoInicial.red === 'AC') {
    return 'aguaCaliente'
  }

  const nodosPorId = new Map(redHidraulica.nodos.map((nodo) => [nodo.id, nodo]))
  const tramosSalientesPorNodo = new Map<string, Tramo[]>()
  redHidraulica.tramos.forEach((tramo) => {
    const salientes = tramosSalientesPorNodo.get(tramo.nodoOrigenId) ?? []
    salientes.push(tramo)
    tramosSalientesPorNodo.set(tramo.nodoOrigenId, salientes)
  })

  let hayRutaSinACS = false
  let hayRutaConACS = false

  // Estado compuesto (nodoId, pasoPorACS): el mismo nodo puede necesitar
  // visitarse una vez sin haber pasado por produccionACS y otra vez
  // habiendolo hecho, porque ambas rutas pueden reconverger antes de llegar
  // al Artefacto evaluado -- eso es precisamente lo que distingue 'total'
  // de 'aguaFria'/'aguaCaliente'. Un Set<nodoId> simple (como el de
  // obtenerArtefactosAguasAbajo) perderia esa distincion.
  const estadosVisitados = new Set<string>()
  const pila: Array<{ nodoId: string; pasoPorACS: boolean }> = [
    { nodoId: tramoInicial.nodoDestinoId, pasoPorACS: false },
  ]

  while (pila.length > 0) {
    const estado = pila.pop() as { nodoId: string; pasoPorACS: boolean }
    const claveEstado = `${estado.nodoId}|${estado.pasoPorACS ? 'acs' : 'directa'}`

    if (estadosVisitados.has(claveEstado)) {
      continue
    }
    estadosVisitados.add(claveEstado)

    const nodo: Nodo | undefined = nodosPorId.get(estado.nodoId)
    if (nodo === undefined) {
      continue
    }

    const referencia = nodo.referencia

    // Un nodo que referencia un Artefacto es terminal: no se atraviesa,
    // coincida o no con el Artefacto buscado (mismo criterio que
    // obtenerArtefactosAguasAbajo).
    if (referencia !== undefined && referencia.tipo === 'artefacto') {
      if (esMismaReferencia(referencia, artefacto)) {
        if (estado.pasoPorACS) {
          hayRutaConACS = true
        } else {
          hayRutaSinACS = true
        }
      }
      continue
    }

    // Si este nodo ES produccionACS, todo lo aguas abajo de aca ya paso por
    // ACS -- sin esperar a cruzar el tramo siguiente. Si el propio
    // nodoDestinoId del tramo evaluado ya es produccionACS, este mismo
    // chequeo lo captura en la primera iteracion, sin caso especial previo
    // al bucle.
    const pasoPorACSDesdeAqui = (referencia !== undefined && referencia.tipo === 'produccionACS') || estado.pasoPorACS

    const salientes = tramosSalientesPorNodo.get(estado.nodoId) ?? []
    for (let indice = salientes.length - 1; indice >= 0; indice -= 1) {
      const tramoSaliente = salientes[indice]
      if (tramoSaliente !== undefined) {
        pila.push({ nodoId: tramoSaliente.nodoDestinoId, pasoPorACS: pasoPorACSDesdeAqui })
      }
    }
  }

  if (hayRutaSinACS && hayRutaConACS) {
    return 'total'
  }
  if (hayRutaSinACS) {
    return 'aguaFria'
  }
  if (hayRutaConACS) {
    return 'aguaCaliente'
  }

  throw new Error(
    `determinarCondicionHidraulicaDeCaudal: el artefacto (unidadFuncionalId="${artefacto.unidadFuncionalId}", ` +
      `localId="${artefacto.localId}", artefactoId="${artefacto.artefactoId}") no está aguas abajo del tramo "${tramoId}"`,
  )
}
