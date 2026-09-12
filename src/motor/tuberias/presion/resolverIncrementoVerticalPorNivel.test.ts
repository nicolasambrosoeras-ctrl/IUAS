// D-δ.50 (brief secciones 7-16, 42): longitud vertical tipica automatica
// por nivel de UF, DERIVADA (nunca persistida), EXCLUSIVA de
// granularidadHidraulica='simplificada'.
//
//   T4  PB           -> ΔLvertical = 0
//   T5  Piso1        -> ΔLvertical = 3
//   T6  Piso2        -> ΔLvertical = 6
//   T7  dos UFs mismo piso -> mismo incremento, no acumulativo
//   T8  AF Piso1  -> +3 en Alimentacion general
//   T9  AC Piso1  -> +3 en Alimentacion general Y +3 en Alimentacion ACS
//   T10 PB no se contamina al existir una UF de Piso1
//   T11 cambiar Piso1 -> Piso2 pasa 3 -> 6
//   +   profesional NO recibe incremento
import { describe, it, expect } from 'vitest'
import type { MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../../modelo/proyecto'
import type { Nodo, RedHidraulica, ReferenciaDeArtefacto, Tramo } from '../../../modelo/redHidraulica'
import { obtenerCaminoHaciaOrigen, type CaminoHaciaOrigen } from '../topologia/obtenerCaminoHaciaOrigen'
import { resolverIncrementoVerticalPorNivel } from './resolverIncrementoVerticalPorNivel'

function metadatos(): MetadatosProyecto {
  return {
    nombre: 'Proyecto ΔLvertical',
    obra: 'Obra',
    comitente: 'Comitente',
    fecha: '2026-09-07',
    schemaVersion: '1.0.0',
    versionNormativa: 'eras-2023',
  }
}

function parametros(): ParametrosProyecto {
  return { tipoDeProyecto: 'viviendaIndividual', presionSobreAcera_m: 0, alturaArtefactoMasDesfavorable_m: 0 }
}

function ref(uf: string, local: string, art: string): ReferenciaDeArtefacto {
  return { tipo: 'artefacto', unidadFuncionalId: uf, localId: local, artefactoId: art }
}

// Topologia minima con Alimentacion general (t-general) + Alimentacion ACS
// (t-af-acs) compartidas, un Local AF+AC por UF. Cada UF cuelga sus
// terminales de la MISMA raiz (n0 / n-acs), como el demo real.
function proyectoCon(
  unidadesFuncionales: readonly UnidadFuncional[],
  granularidadHidraulica: 'simplificada' | 'profesional' = 'simplificada',
): Proyecto {
  const nodos: Nodo[] = [
    { id: 'n-general' },
    { id: 'n0' },
    { id: 'n-acs', referencia: { tipo: 'produccionACS' } },
  ]
  const tramos: Tramo[] = [
    { id: 't-general', nodoOrigenId: 'n-general', nodoDestinoId: 'n0', red: 'AF', longitud_m: 5 },
    { id: 't-af-acs', nodoOrigenId: 'n0', nodoDestinoId: 'n-acs', red: 'AF', longitud_m: 4 },
  ]
  for (const uf of unidadesFuncionales) {
    for (const nivelDeUf of uf.niveles) {
    for (const local of nivelDeUf.locales) {
      for (const art of local.artefactos) {
        const nAf = `n-af-${uf.id}-${art.id}`
        nodos.push({ id: nAf, referencia: ref(uf.id, local.id, art.id) })
        tramos.push({ id: `t-af-${uf.id}-${art.id}`, nodoOrigenId: 'n0', nodoDestinoId: nAf, red: 'AF', longitud_m: 2 })
        const nAc = `n-ac-${uf.id}-${art.id}`
        nodos.push({ id: nAc, referencia: ref(uf.id, local.id, art.id) })
        tramos.push({ id: `t-ac-${uf.id}-${art.id}`, nodoOrigenId: 'n-acs', nodoDestinoId: nAc, red: 'AC', longitud_m: 2 })
      }
    }
    }
  }
  const redHidraulica: RedHidraulica = { nodos, tramos }
  return {
    metadatos: metadatos(),
    parametros: parametros(),
    unidadesFuncionales,
    redHidraulica,
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'estimado',
      granularidadHidraulica,
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

function uf(id: string, nivel: number | undefined): UnidadFuncional {
  return {
    id,
    nombre: id,
    niveles: [
      {
        id: `${id}-nivel-1`,
        nombre: 'Nivel 1',
        ...(nivel === undefined ? {} : { nivel, cotaHidraulicaReferencia_m: 1 + 3 * nivel }),
        locales: [
          {
            id: `${id}-local`,
            tipo: 'bano',
            regimen: 'domiciliario',
            artefactos: [{ id: `${id}-lav`, artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }],
          },
        ],
      },
    ],
  }
}

function caminoAF(proyecto: Proyecto, ufId: string): CaminoHaciaOrigen {
  const camino = obtenerCaminoHaciaOrigen(proyecto.redHidraulica!, `n-af-${ufId}-${ufId}-lav`)
  if (camino.tipo !== 'camino') throw new Error('camino AF no resoluble')
  return camino
}

function caminoAC(proyecto: Proyecto, ufId: string): CaminoHaciaOrigen {
  const camino = obtenerCaminoHaciaOrigen(proyecto.redHidraulica!, `n-ac-${ufId}-${ufId}-lav`)
  if (camino.tipo !== 'camino') throw new Error('camino AC no resoluble')
  return camino
}

describe('resolverIncrementoVerticalPorNivel (D-δ.50)', () => {
  it('T4: PB (nivel 0) -> ΔLvertical = 0, sin tramos con incremento', () => {
    const u = uf('uf-pb', 0)
    const proyecto = proyectoCon([u])

    const resultado = resolverIncrementoVerticalPorNivel(proyecto, caminoAF(proyecto, 'uf-pb'), u.niveles[0]!)

    expect(resultado.aplica).toBe(false)
    expect(resultado.deltaLVertical_m).toBe(0)
    expect(resultado.incrementoPorTramoId.size).toBe(0)
  })

  it('T5: Piso 1 (nivel 1) -> ΔLvertical = 3', () => {
    const u = uf('uf-p1', 1)
    const proyecto = proyectoCon([u])

    const resultado = resolverIncrementoVerticalPorNivel(proyecto, caminoAF(proyecto, 'uf-p1'), u.niveles[0]!)

    expect(resultado.deltaLVertical_m).toBe(3)
    expect(resultado.aplica).toBe(true)
  })

  it('T6: Piso 2 (nivel 2) -> ΔLvertical = 6', () => {
    const u = uf('uf-p2', 2)
    const proyecto = proyectoCon([u])

    const resultado = resolverIncrementoVerticalPorNivel(proyecto, caminoAF(proyecto, 'uf-p2'), u.niveles[0]!)

    expect(resultado.deltaLVertical_m).toBe(6)
  })

  it('T8: camino AF de Piso 1 -> +3 SOLO en Alimentacion general', () => {
    const u = uf('uf-p1', 1)
    const proyecto = proyectoCon([u])

    const resultado = resolverIncrementoVerticalPorNivel(proyecto, caminoAF(proyecto, 'uf-p1'), u.niveles[0]!)

    expect(resultado.tramosConIncremento).toEqual([
      { tramoId: 't-general', rol: 'alimentacionGeneral', incremento_m: 3 },
    ])
    expect(resultado.incrementoPorTramoId.get('t-general')).toBe(3)
    expect(resultado.incrementoPorTramoId.get('t-af-acs')).toBeUndefined()
  })

  it('T9: camino AC de Piso 1 -> +3 en Alimentacion general Y +3 en Alimentacion ACS', () => {
    const u = uf('uf-p1', 1)
    const proyecto = proyectoCon([u])

    const resultado = resolverIncrementoVerticalPorNivel(proyecto, caminoAC(proyecto, 'uf-p1'), u.niveles[0]!)

    expect(resultado.tramosConIncremento).toEqual([
      { tramoId: 't-general', rol: 'alimentacionGeneral', incremento_m: 3 },
      { tramoId: 't-af-acs', rol: 'alimentacionAcs', incremento_m: 3 },
    ])
    // Cada rol aparece UNA sola vez -- sin doble conteo adicional (brief AC).
    expect(resultado.tramosConIncremento).toHaveLength(2)
  })

  it('T7 / T11: dos UFs en el mismo piso usan el mismo incremento (no acumulativo); cambiar el nivel de una recalcula sin tocar a la otra', () => {
    const a = uf('uf-a', 2)
    const b = uf('uf-b', 2)
    const proyecto = proyectoCon([a, b])

    const incA = resolverIncrementoVerticalPorNivel(proyecto, caminoAF(proyecto, 'uf-a'), a.niveles[0]!)
    const incB = resolverIncrementoVerticalPorNivel(proyecto, caminoAF(proyecto, 'uf-b'), b.niveles[0]!)
    expect(incA.deltaLVertical_m).toBe(6)
    expect(incB.deltaLVertical_m).toBe(6) // NO 12: cada camino deriva de SU nivel

    // T11: uf-b pasa a Piso 3 -> 9; uf-a sigue en 6.
    const b3 = { ...b, niveles: [{ ...b.niveles[0]!, nivel: 3 }] }
    const proyecto3 = proyectoCon([a, b3])
    expect(
      resolverIncrementoVerticalPorNivel(proyecto3, caminoAF(proyecto3, 'uf-b'), b3.niveles[0]!).deltaLVertical_m,
    ).toBe(9)
    expect(
      resolverIncrementoVerticalPorNivel(proyecto3, caminoAF(proyecto3, 'uf-a'), a.niveles[0]!).deltaLVertical_m,
    ).toBe(6)
  })

  it('T10: la UF de PB no recibe incremento aunque el proyecto tenga otra UF en Piso 1', () => {
    const pb = uf('uf-pb', 0)
    const p1 = uf('uf-p1', 1)
    const proyecto = proyectoCon([pb, p1])

    const incPb = resolverIncrementoVerticalPorNivel(proyecto, caminoAF(proyecto, 'uf-pb'), pb.niveles[0]!)
    expect(incPb.deltaLVertical_m).toBe(0)
    expect(incPb.incrementoPorTramoId.size).toBe(0)
  })

  it('UF sin nivel clasificado -> sin incremento (ausencia != PB, pero tampoco deriva metros)', () => {
    const u = uf('uf-x', undefined)
    const proyecto = proyectoCon([u])

    const resultado = resolverIncrementoVerticalPorNivel(proyecto, caminoAF(proyecto, 'uf-x'), u.niveles[0]!)

    expect(resultado.aplica).toBe(false)
    expect(resultado.deltaLVertical_m).toBe(0)
  })

  it('profesional: NUNCA aplica incremento, aunque la UF tenga nivel cargado', () => {
    const u = uf('uf-p2', 2)
    const proyecto = proyectoCon([u], 'profesional')

    const resultado = resolverIncrementoVerticalPorNivel(proyecto, caminoAF(proyecto, 'uf-p2'), u.niveles[0]!)

    expect(resultado.aplica).toBe(false)
    expect(resultado.deltaLVertical_m).toBe(0)
    expect(resultado.incrementoPorTramoId.size).toBe(0)
    expect(resultado.nivel).toBe(2) // se expone como metadato
  })
})

// ------------------------------------------------------------------
// M2-TOPO-C (§37-§41): un camino que atraviesa un montante explícito NO
// recibe el +3·nivel automático de D-δ.50 -- el ascenso vertical ya lo
// modela la longitud real de los segmentos del montante. Cierra la
// limitación de doble conteo registrada en D-δ.92.
// ------------------------------------------------------------------

function conMontanteEn(
  proyecto: Proyecto,
  tramoId: string,
  opciones: { readonly quitarLongitud?: boolean } = {},
): Proyecto {
  return {
    ...proyecto,
    montantes: [{ id: 'm-1', red: 'AF' }],
    redHidraulica: {
      ...proyecto.redHidraulica!,
      tramos: proyecto.redHidraulica!.tramos.map((t) => {
        if (t.id !== tramoId) return t
        const base: Tramo = { ...t, montanteId: 'm-1' }
        if (opciones.quitarLongitud === true) {
          delete (base as { longitud_m?: number }).longitud_m
        }
        return base
      }),
    },
  }
}

describe('resolverIncrementoVerticalPorNivel — supresión por montante explícito (M2-TOPO-C)', () => {
  it('§37: el camino AF atraviesa un segmento con montanteId -> incremento anulado, marcado suprimidoPorMontante', () => {
    const u = uf('uf-p2', 2)
    const proyecto = conMontanteEn(proyectoCon([u]), 't-general')

    const resultado = resolverIncrementoVerticalPorNivel(proyecto, caminoAF(proyecto, 'uf-p2'), u.niveles[0]!)

    expect(resultado.aplica).toBe(false)
    expect(resultado.suprimidoPorMontante).toBe(true)
    expect(resultado.incrementoPorTramoId.size).toBe(0)
    expect(resultado.tramosConIncremento).toEqual([])
    // deltaLVertical_m conserva el valor de referencia (lo que habría sido).
    expect(resultado.deltaLVertical_m).toBe(6)
  })

  it('§37: también suprime el ascenso en el camino AC (que comparte t-general)', () => {
    const u = uf('uf-p1', 1)
    const proyecto = conMontanteEn(proyectoCon([u]), 't-general')

    const resultado = resolverIncrementoVerticalPorNivel(proyecto, caminoAC(proyecto, 'uf-p1'), u.niveles[0]!)

    expect(resultado.aplica).toBe(false)
    expect(resultado.suprimidoPorMontante).toBe(true)
    expect(resultado.incrementoPorTramoId.size).toBe(0)
  })

  it('§39: un segmento explícito SIN longitud NO reactiva el 3·nivel (el camino queda incompleto por otra vía)', () => {
    const u = uf('uf-p2', 2)
    const proyecto = conMontanteEn(proyectoCon([u]), 't-general', { quitarLongitud: true })

    const resultado = resolverIncrementoVerticalPorNivel(proyecto, caminoAF(proyecto, 'uf-p2'), u.niveles[0]!)

    expect(resultado.aplica).toBe(false)
    expect(resultado.suprimidoPorMontante).toBe(true)
    expect(resultado.incrementoPorTramoId.size).toBe(0)
  })

  it('§38: un montante en un tramo AF que NO está en el camino consultado no suprime nada', () => {
    const p1 = uf('uf-p1', 1)
    const p2 = uf('uf-p2', 2)
    // El montante cuelga del ramal terminal AF de uf-p2; el camino AF de
    // uf-p1 no lo atraviesa.
    const proyecto = conMontanteEn(proyectoCon([p1, p2]), 't-af-uf-p2-uf-p2-lav')

    const resultadoAF = resolverIncrementoVerticalPorNivel(proyecto, caminoAF(proyecto, 'uf-p1'), p1.niveles[0]!)
    expect(resultadoAF.aplica).toBe(true)
    expect(resultadoAF.suprimidoPorMontante).toBeFalsy()
    expect(resultadoAF.incrementoPorTramoId.size).toBeGreaterThan(0)
  })

  it('profesional + montante: sin cambios (el incremento ya era 0)', () => {
    const u = uf('uf-p2', 2)
    const proyecto = conMontanteEn(proyectoCon([u], 'profesional'), 't-general')

    const resultado = resolverIncrementoVerticalPorNivel(proyecto, caminoAF(proyecto, 'uf-p2'), u.niveles[0]!)

    expect(resultado.aplica).toBe(false)
    expect(resultado.deltaLVertical_m).toBe(0)
  })
})
