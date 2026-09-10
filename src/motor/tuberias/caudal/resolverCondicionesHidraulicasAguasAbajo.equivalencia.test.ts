// PERF-SCALE-01A -- equivalencia EXACTA del traversal en lote
// (resolverCondicionesHidraulicasDeCaudalAguasAbajo) contra el clasificador
// puntual pre-slice (`clasificadorLegacy`, copiado VERBATIM del cuerpo que
// tenía determinarCondicionHidraulicaDeCaudal antes de este slice).
//
// Estrategia de brief §15: se conserva el clasificador legacy acá y se
// compara legacy vs lote para CADA par (Tramo, artefacto aguas abajo) sobre
// topologías diversas -- AF directa, AC, producción ACS, mixtos, ramales,
// reconvergencia directa+ACS, ciclos, dos UF con misma artefactoId -- más
// el fixture de escala completo (todos sus tramos × todos sus artefactos
// aguas abajo). Si el lote y el legacy divergen en cualquier par, esto
// falla.
import { describe, it, expect } from 'vitest'
import type { Nodo, RedHidraulica, ReferenciaDeArtefacto, Tramo } from '../../../modelo/redHidraulica'
import type { CondicionHidraulicaDeCaudal } from './resolverQuEfectivo'
import { crearIndiceTopologico } from '../topologia/indiceTopologico'
import {
  claveDeReferenciaDeArtefacto,
  resolverCondicionesHidraulicasDeCaudalAguasAbajo,
} from './resolverCondicionesHidraulicasAguasAbajo'
import { determinarCondicionHidraulicaDeCaudal } from './determinarCondicionHidraulicaDeCaudal'
import { obtenerArtefactosAguasAbajo } from '../topologia/obtenerArtefactosAguasAbajo'
import { generarProyectoDeEscala } from '../../../pruebas/escala/generarProyectoDeEscala'

// --- Clasificador puntual PRE-SLICE, verbatim (sólo para el test) --------
function esMismaReferencia(a: ReferenciaDeArtefacto, b: ReferenciaDeArtefacto): boolean {
  return a.unidadFuncionalId === b.unidadFuncionalId && a.localId === b.localId && a.artefactoId === b.artefactoId
}

function clasificadorLegacy(
  redHidraulica: RedHidraulica,
  tramoId: string,
  artefacto: ReferenciaDeArtefacto,
): CondicionHidraulicaDeCaudal {
  const tramoInicial = redHidraulica.tramos.find((tramo) => tramo.id === tramoId)
  if (tramoInicial === undefined) {
    throw new Error(`clasificadorLegacy: no existe ningun tramo con id "${tramoId}"`)
  }
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
  const estadosVisitados = new Set<string>()
  const pila: Array<{ nodoId: string; pasoPorACS: boolean }> = [
    { nodoId: tramoInicial.nodoDestinoId, pasoPorACS: false },
  ]
  while (pila.length > 0) {
    const estado = pila.pop() as { nodoId: string; pasoPorACS: boolean }
    const claveEstado = `${estado.nodoId}|${estado.pasoPorACS ? 'acs' : 'directa'}`
    if (estadosVisitados.has(claveEstado)) continue
    estadosVisitados.add(claveEstado)
    const nodo: Nodo | undefined = nodosPorId.get(estado.nodoId)
    if (nodo === undefined) continue
    const referencia = nodo.referencia
    if (referencia !== undefined && referencia.tipo === 'artefacto') {
      if (esMismaReferencia(referencia, artefacto)) {
        if (estado.pasoPorACS) hayRutaConACS = true
        else hayRutaSinACS = true
      }
      continue
    }
    const pasoPorACSDesdeAqui =
      (referencia !== undefined && referencia.tipo === 'produccionACS') || estado.pasoPorACS
    const salientes = tramosSalientesPorNodo.get(estado.nodoId) ?? []
    for (let indice = salientes.length - 1; indice >= 0; indice -= 1) {
      const tramoSaliente = salientes[indice]
      if (tramoSaliente !== undefined) {
        pila.push({ nodoId: tramoSaliente.nodoDestinoId, pasoPorACS: pasoPorACSDesdeAqui })
      }
    }
  }
  if (hayRutaSinACS && hayRutaConACS) return 'total'
  if (hayRutaSinACS) return 'aguaFria'
  if (hayRutaConACS) return 'aguaCaliente'
  throw new Error('clasificadorLegacy: el artefacto no está aguas abajo del tramo')
}
// -----------------------------------------------------------------------

function ref(uf: string, local: string, art: string): ReferenciaDeArtefacto {
  return { tipo: 'artefacto', unidadFuncionalId: uf, localId: local, artefactoId: art }
}

// Recolecta las referencias de artefacto distintas presentes en la red.
function referenciasDistintas(red: RedHidraulica): ReferenciaDeArtefacto[] {
  const vistas = new Map<string, ReferenciaDeArtefacto>()
  for (const nodo of red.nodos) {
    if (nodo.referencia?.tipo === 'artefacto') {
      vistas.set(claveDeReferenciaDeArtefacto(nodo.referencia), nodo.referencia)
    }
  }
  return [...vistas.values()]
}

// Conjunto de claves de artefacto aguas abajo de un tramo (DFS sólo-red,
// mismo criterio de terminalidad que el motor: un nodo con referencia de
// artefacto es terminal).
function artefactosAguasAbajoDe(red: RedHidraulica, tramoId: string): Set<string> {
  const indice = crearIndiceTopologico(red)
  const inicial = indice.tramosPorId.get(tramoId)!
  const visitados = new Set<string>()
  const pila = [inicial.nodoDestinoId]
  const claves = new Set<string>()
  while (pila.length > 0) {
    const nodoId = pila.pop()!
    if (visitados.has(nodoId)) continue
    visitados.add(nodoId)
    const nodo = indice.nodosPorId.get(nodoId)
    if (nodo === undefined) continue
    if (nodo.referencia?.tipo === 'artefacto') {
      claves.add(claveDeReferenciaDeArtefacto(nodo.referencia))
      continue
    }
    for (const t of indice.tramosSalientesPorNodo.get(nodoId) ?? []) pila.push(t.nodoDestinoId)
  }
  return claves
}

// Dos invariantes de equivalencia:
//  (A) el WRAPPER público determinarCondicionHidraulicaDeCaudal coincide
//      con el legacy para TODO par (tramo, artefacto) -- mismo valor o
//      ambos lanzan. Incluye el atajo de tramo AC (aguaCaliente sin validar
//      que el artefacto esté aguas abajo).
//  (B) el Map del traversal en LOTE coincide con el legacy para todo
//      artefacto que SÍ está aguas abajo del tramo (los únicos que el motor
//      consulta del lote). Para artefactos no aguas abajo el Map no tiene
//      la clave -- eso es correcto y esperado (el wrapper cubre ese caso).
function verificarEquivalencia(red: RedHidraulica): void {
  const indice = crearIndiceTopologico(red)
  const refs = referenciasDistintas(red)
  for (const tramo of red.tramos) {
    const lote = resolverCondicionesHidraulicasDeCaudalAguasAbajo(indice, tramo.id)
    const aguasAbajo = artefactosAguasAbajoDe(red, tramo.id)
    for (const referencia of refs) {
      const clave = claveDeReferenciaDeArtefacto(referencia)

      let delLegacy: CondicionHidraulicaDeCaudal | 'THROW'
      try {
        delLegacy = clasificadorLegacy(red, tramo.id, referencia)
      } catch {
        delLegacy = 'THROW'
      }

      // (A) wrapper ≡ legacy
      if (delLegacy === 'THROW') {
        expect(() => determinarCondicionHidraulicaDeCaudal(red, tramo.id, referencia), `wrapper ${tramo.id}/${clave}`).toThrow()
      } else {
        expect(determinarCondicionHidraulicaDeCaudal(red, tramo.id, referencia), `wrapper ${tramo.id}/${clave}`).toBe(delLegacy)
      }

      // (B) lote ≡ legacy para artefactos aguas abajo
      if (aguasAbajo.has(clave)) {
        expect(delLegacy, `precondición: legacy resuelve un aguas-abajo ${tramo.id}/${clave}`).not.toBe('THROW')
        expect(lote.get(clave), `lote ${tramo.id}/${clave}`).toBe(delLegacy)
      } else {
        expect(lote.get(clave), `lote no-aguas-abajo ${tramo.id}/${clave}`).toBeUndefined()
      }
    }
  }
}

describe('resolverCondicionesHidraulicasDeCaudalAguasAbajo — equivalencia con el clasificador legacy', () => {
  const lavatorio = ref('uf-1', 'local-bano', 'lavatorio')
  const inodoro = ref('uf-1', 'local-bano', 'inodoro')

  it('caso D central: tronco AF + split directo/ACS', () => {
    const red: RedHidraulica = {
      nodos: [
        { id: 'n0' },
        { id: 'n1' },
        { id: 'n2', referencia: lavatorio },
        { id: 'n3', referencia: { tipo: 'produccionACS' } },
        { id: 'n4', referencia: lavatorio },
      ],
      tramos: [
        { id: 't1', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
        { id: 't2', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF' },
        { id: 't3', nodoOrigenId: 'n1', nodoDestinoId: 'n3', red: 'AF' },
        { id: 't4', nodoOrigenId: 'n3', nodoDestinoId: 'n4', red: 'AC' },
      ],
    }
    verificarEquivalencia(red)
  })

  it('mismo tramo, dos artefactos distintos (inodoro AF exclusiva, lavatorio directa + ACS)', () => {
    const red: RedHidraulica = {
      nodos: [
        { id: 'n0' },
        { id: 'n1' },
        { id: 'n2', referencia: inodoro },
        { id: 'n3', referencia: lavatorio },
        { id: 'n4', referencia: { tipo: 'produccionACS' } },
        { id: 'n5', referencia: lavatorio },
      ],
      tramos: [
        { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
        { id: 't1', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF' },
        { id: 't2', nodoOrigenId: 'n1', nodoDestinoId: 'n3', red: 'AF' },
        { id: 't3', nodoOrigenId: 'n1', nodoDestinoId: 'n4', red: 'AF' },
        { id: 't4', nodoOrigenId: 'n4', nodoDestinoId: 'n5', red: 'AC' },
      ],
    }
    verificarEquivalencia(red)
  })

  it('reconvergencia directa + vía ACS en un nodo intermedio (no el artefacto): total', () => {
    const red: RedHidraulica = {
      nodos: [
        { id: 'n0' },
        { id: 'n1' },
        { id: 'n2' },
        { id: 'n3', referencia: { tipo: 'produccionACS' } },
        { id: 'n4' },
        { id: 'n5' },
        { id: 'n6', referencia: lavatorio },
      ],
      tramos: [
        { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
        { id: 't1', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF' },
        { id: 't2', nodoOrigenId: 'n1', nodoDestinoId: 'n3', red: 'AF' },
        { id: 't3', nodoOrigenId: 'n3', nodoDestinoId: 'n4', red: 'AC' },
        { id: 't4', nodoOrigenId: 'n2', nodoDestinoId: 'n5', red: 'AF' },
        { id: 't5', nodoOrigenId: 'n4', nodoDestinoId: 'n5', red: 'AC' },
        { id: 't6', nodoOrigenId: 'n5', nodoDestinoId: 'n6', red: 'AF' },
      ],
    }
    verificarEquivalencia(red)
  })

  it('ciclo en la topología: termina y clasifica igual que el legacy', () => {
    const red: RedHidraulica = {
      nodos: [{ id: 'n0' }, { id: 'n1' }, { id: 'n2' }, { id: 'n3', referencia: inodoro }],
      tramos: [
        { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
        { id: 't1', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF' },
        { id: 't2', nodoOrigenId: 'n2', nodoDestinoId: 'n1', red: 'AF' },
        { id: 't3', nodoOrigenId: 'n1', nodoDestinoId: 'n3', red: 'AF' },
      ],
    }
    verificarEquivalencia(red)
  })

  it('tramo AC directo (sin ancestro produccionACS): aguaCaliente', () => {
    const red: RedHidraulica = {
      nodos: [{ id: 'n0' }, { id: 'n1', referencia: lavatorio }],
      tramos: [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AC' }],
    }
    verificarEquivalencia(red)
  })

  it('dos UF con misma artefactoId/localId: la identidad completa las distingue', () => {
    const refUf1 = ref('uf-1', 'local-x', 'artefacto-x')
    const refUf2 = ref('uf-2', 'local-x', 'artefacto-x')
    const red: RedHidraulica = {
      nodos: [{ id: 'n0' }, { id: 'n1', referencia: refUf1 }, { id: 'n2', referencia: refUf2 }],
      tramos: [
        { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
        { id: 't1', nodoOrigenId: 'n0', nodoDestinoId: 'n2', red: 'AF' },
      ],
    }
    verificarEquivalencia(red)
  })

  it('fixture de escala (5 UF): TODO par (tramo × artefacto) — wrapper y lote ≡ legacy', () => {
    // 5 UF ya ejercita tronco compartido, N producciones ACS, ramales AF/AC
    // y reconvergencia -- la comparación exhaustiva par a par es O(tramos ×
    // refs × red), así que se acota el tamaño; la escala grande la cubre la
    // regresión estructural + la suite de pipeline completa.
    const proyecto = generarProyectoDeEscala({ cantidadUf: 5, localesPorUf: 3 })
    verificarEquivalencia(proyecto.redHidraulica!)
  }, 30000)

  it('coherencia lote ↔ obtenerArtefactosAguasAbajo: las claves del Map son exactamente los artefactos aguas abajo (para tramos AF)', () => {
    const proyecto = generarProyectoDeEscala({ cantidadUf: 3, localesPorUf: 2 })
    const red = proyecto.redHidraulica!
    const indice = crearIndiceTopologico(red)
    for (const tramo of red.tramos) {
      if (tramo.red === 'AC') continue
      const lote = resolverCondicionesHidraulicasDeCaudalAguasAbajo(indice, tramo.id)
      const aguasAbajo = new Set(
        obtenerArtefactosAguasAbajo(proyecto, tramo.id).map((r) => claveDeReferenciaDeArtefacto(r)),
      )
      expect(new Set(lote.keys())).toEqual(aguasAbajo)
    }
  })
})
