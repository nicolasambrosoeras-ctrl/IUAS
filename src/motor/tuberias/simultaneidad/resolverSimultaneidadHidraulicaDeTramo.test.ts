// Tests de composicion: no repiten exhaustivamente la cobertura de
// agregarAportesHidraulicosDeTramo, determinarAEfectivo ni
// calcularSimultaneidadDeTramo (ya cubiertas en sus propios archivos) --
// verifican que la orquestacion las encadena correctamente sobre el mismo
// conjunto de aportes. Fixtures construidas directamente, sin topologia
// real, catalogo ni resolverAportesHidraulicosDeTramo.
import { describe, it, expect } from 'vitest'
import type { Artefacto, Local, UnidadFuncional } from '../../../modelo/proyecto'
import type { ArtefactoResuelto } from '../topologia/resolverArtefactosReferenciados'
import type { AporteHidraulicoDeTramo } from '../aporte/resolverAportesHidraulicosDeTramo'
import { resolverSimultaneidadHidraulicaDeTramo } from './resolverSimultaneidadHidraulicaDeTramo'

function aporteCon(
  unidadFuncionalId: string,
  idInstancia: string,
  cantidad: number,
  condicion: AporteHidraulicoDeTramo['condicion'],
  qu_lps: number,
): AporteHidraulicoDeTramo {
  const artefacto: Artefacto = { id: idInstancia, artefactoId: 'lavatorio', cantidad, origen: 'normativo' }
  const local: Local = { id: 'local-1', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto] }
  const unidadFuncional: UnidadFuncional = { id: unidadFuncionalId, nombre: unidadFuncionalId, locales: [local] }

  const artefactoResuelto: ArtefactoResuelto = {
    referencia: { tipo: 'artefacto', unidadFuncionalId, localId: local.id, artefactoId: idInstancia },
    unidadFuncional,
    local,
    artefacto,
  }

  return { artefactoResuelto, cantidad, condicion, qu_lps }
}

describe('resolverSimultaneidadHidraulicaDeTramo', () => {
  it('1. n=1: aEfectivo correcto, kc/k indeterminados, qc_lps=qmax_lps (CRIT-A4)', () => {
    const aportes = [aporteCon('uf-1', 'a-1', 1, 'total', 0.3)]

    const resultado = resolverSimultaneidadHidraulicaDeTramo('oficinaPrivada', aportes)

    expect(resultado.n).toBe(1)
    expect(resultado.aEfectivo).toBe(1)
    expect('estado' in resultado.kc && resultado.kc.estado).toBe('indeterminado')
    expect('estado' in resultado.k && resultado.k.estado).toBe('indeterminado')
    expect(resultado.qc_lps).toBe(0.3)
  })

  it('2. viviendaMultifamiliar, una UF, n>=2: aEfectivo=1, kc=1, k=kc, qc_lps=qmax_lps×k', () => {
    const aportes = [
      aporteCon('uf-1', 'a-1', 1, 'total', 0.2),
      aporteCon('uf-1', 'a-2', 1, 'aguaFria', 0.3),
    ]

    const resultado = resolverSimultaneidadHidraulicaDeTramo('viviendaMultifamiliar', aportes)

    if ('estado' in resultado.kc || 'estado' in resultado.k) {
      throw new Error('se esperaba Kc y K numéricos, no indeterminados')
    }
    expect(resultado.n).toBe(2)
    expect(resultado.aEfectivo).toBe(1)
    expect(resultado.kc.valor).toBe(1)
    expect(resultado.k.valor).toBe(1)
    expect(resultado.qc_lps).toBeCloseTo(0.5, 10)
  })

  it('3. viviendaMultifamiliar, más de una UF: aEfectivo=2, K>1 se conserva sin cap', () => {
    const aportes = [
      aporteCon('uf-1', 'a-1', 1, 'total', 0.2),
      aporteCon('uf-2', 'a-2', 1, 'aguaFria', 0.3),
    ]

    const resultado = resolverSimultaneidadHidraulicaDeTramo('viviendaMultifamiliar', aportes)

    if ('estado' in resultado.kc || 'estado' in resultado.k) {
      throw new Error('se esperaba Kc y K numéricos, no indeterminados')
    }
    expect(resultado.aEfectivo).toBe(2)
    expect(resultado.kc.valor).toBe(1)
    expect(resultado.k.valor).toBe(2)
    expect(resultado.k.valor).toBeGreaterThan(1)
    expect(resultado.qc_lps).toBeCloseTo(1.0, 10)
  })

  it('4. condiciones mixtas en el mismo conjunto: qmax_lps=Σ(cantidad×qu_lps) sin tratamiento por condicion, aEfectivo solo por UF', () => {
    const aportes = [
      aporteCon('uf-1', 'a-1', 1, 'total', 0.2),
      aporteCon('uf-1', 'a-2', 2, 'aguaFria', 0.08),
      aporteCon('uf-1', 'a-3', 1, 'aguaCaliente', 0.12),
    ]

    const resultado = resolverSimultaneidadHidraulicaDeTramo('viviendaMultifamiliar', aportes)

    if ('estado' in resultado.kc || 'estado' in resultado.k) {
      throw new Error('se esperaba Kc y K numéricos, no indeterminados')
    }
    const qmaxEsperado = 1 * 0.2 + 2 * 0.08 + 1 * 0.12
    const kcEsperado = 1 / Math.sqrt(4 - 1)

    // n = Σcantidad = 1+2+1 = 4: refleja cantidad, no cantidad de aportes (3).
    expect(resultado.n).toBe(4)
    expect(resultado.aEfectivo).toBe(1)
    expect(resultado.kc.valor).toBeCloseTo(kcEsperado, 10)
    expect(resultado.qc_lps).toBeCloseTo(qmaxEsperado * kcEsperado, 10)
  })

  it('5. vacío + viviendaMultifamiliar: propaga el error existente de determinarAEfectivo (ausencia de UF)', () => {
    expect(() => resolverSimultaneidadHidraulicaDeTramo('viviendaMultifamiliar', [])).toThrow(
      /UnidadFuncional/,
    )
  })

  it('6. vacío + otra tipología: propaga el error existente de Kc por n=0, sin validación propia', () => {
    expect(() => resolverSimultaneidadHidraulicaDeTramo('viviendaIndividual', [])).toThrow(/n debe ser/)
  })

  it('7. no muta el array de aportes ni sus objetos', () => {
    const aportes = [
      aporteCon('uf-1', 'a-1', 1, 'total', 0.2),
      aporteCon('uf-2', 'a-2', 1, 'aguaCaliente', 0.12),
    ]
    const copiaSuperficial = [...aportes]

    resolverSimultaneidadHidraulicaDeTramo('viviendaMultifamiliar', aportes)

    expect(aportes).toEqual(copiaSuperficial)
    expect(aportes[0]).toBe(copiaSuperficial[0])
    expect(aportes[1]).toBe(copiaSuperficial[1])
  })
})

// CRIT-A22 (Incremento correctivo 1): piso fisico de caudal individual --
// qc_lps final no puede ser menor al mayor qu_lps de los aportes
// participantes finales. Casos con valores de qu_lps sinteticos (1.5 =
// magnitud real de inodoroValvula, usada aca solo como numero de prueba,
// sin resolver catalogo/topologia real -- eso se cubre en el golden de
// integracion aparte).
describe('resolverSimultaneidadHidraulicaDeTramo — CRIT-A22 (piso de caudal individual)', () => {
  it('n=1 (equivalente A1): qcEstadistico=quMax=1.5, piso no se activa (no hace falta)', () => {
    const aportes = [aporteCon('uf-1', 'valvula', 1, 'total', 1.5)]

    const resultado = resolverSimultaneidadHidraulicaDeTramo('viviendaIndividual', aportes)

    expect(resultado.n).toBe(1)
    expect(resultado.qcEstadistico_lps).toBe(1.5)
    expect(resultado.quMaxParticipante_lps).toBe(1.5)
    expect(resultado.qc_lps).toBe(1.5)
    expect(resultado.pisoCaudalIndividualAplicado).toBe(false)
  })

  it('caso mínimo del cruce (n=3): válvula 1.5 + dos aportes de 0.2 -> Qc estadístico cae por debajo de 1.5, piso se activa', () => {
    const aportes = [
      aporteCon('uf-1', 'valvula', 1, 'total', 1.5),
      aporteCon('uf-1', 'otro-1', 1, 'total', 0.2),
      aporteCon('uf-1', 'otro-2', 1, 'total', 0.2),
    ]

    const resultado = resolverSimultaneidadHidraulicaDeTramo('viviendaIndividual', aportes)

    // Calculado de forma independiente: Qmax=1.9, Kc=1/sqrt(3-1), aEfectivo=1
    // (viviendaIndividual) -> qcEstadistico=1.9/sqrt(2)=1.3435028842544403...
    const qmaxEsperado = 1.9
    const kcEsperado = 1 / Math.sqrt(2)
    const qcEstadisticoEsperado = qmaxEsperado * kcEsperado

    expect(resultado.n).toBe(3)
    expect(resultado.qcEstadistico_lps).toBeCloseTo(qcEstadisticoEsperado, 10)
    expect(resultado.qcEstadistico_lps).toBeCloseTo(1.3435028842544403, 10)
    expect(resultado.quMaxParticipante_lps).toBe(1.5)
    expect(resultado.qc_lps).toBe(1.5)
    expect(resultado.pisoCaudalIndividualAplicado).toBe(true)
  })

  it('A4/A5 (equivalente, sintético): válvula + varios aportes pequeños de otros Locales, vivienda individual -> piso se activa', () => {
    const aportes = [
      aporteCon('uf-1', 'valvula', 1, 'total', 1.5),
      aporteCon('uf-1', 'cocina-1', 1, 'total', 0.2),
      aporteCon('uf-1', 'cocina-2', 1, 'total', 0.2),
      aporteCon('uf-1', 'lavadero-1', 1, 'total', 0.2),
      aporteCon('uf-1', 'lavadero-2', 1, 'total', 0.2),
      aporteCon('uf-1', 'jardin-1', 1, 'total', 0.2),
    ]

    const resultado = resolverSimultaneidadHidraulicaDeTramo('viviendaIndividual', aportes)

    // n=6, Qmax=2.5, Kc=1/sqrt(5), aEfectivo=1 -> qcEstadistico=2.5/sqrt(5)≈1.1180339887498949
    expect(resultado.qcEstadistico_lps).toBeCloseTo(1.1180339887498949, 10)
    expect(resultado.quMaxParticipante_lps).toBe(1.5)
    expect(resultado.qc_lps).toBe(1.5)
    expect(resultado.pisoCaudalIndividualAplicado).toBe(true)
  })

  it('A6 (multifamiliar, 2 UF): Qc estadístico ya supera quMax -> piso NO se activa, aEfectivo no se altera', () => {
    const aportes = [
      aporteCon('uf-1', 'valvula', 1, 'total', 1.5),
      aporteCon('uf-2', 'lavatorio', 1, 'total', 0.2),
    ]

    const resultado = resolverSimultaneidadHidraulicaDeTramo('viviendaMultifamiliar', aportes)

    // n=2, Qmax=1.7, Kc=1, aEfectivo=2 (>1 UF) -> qcEstadistico=1.7*1*2=3.4
    expect(resultado.aEfectivo).toBe(2)
    expect(resultado.qcEstadistico_lps).toBeCloseTo(3.4, 10)
    expect(resultado.quMaxParticipante_lps).toBe(1.5)
    expect(resultado.qc_lps).toBeCloseTo(3.4, 10)
    expect(resultado.qc_lps).toBe(resultado.qcEstadistico_lps)
    expect(resultado.pisoCaudalIndividualAplicado).toBe(false)
  })
})
