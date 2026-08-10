import { describe, it, expect } from 'vitest'
import type { Artefacto, Local, UnidadFuncional } from '../../../modelo/proyecto'
import type { ArtefactoResuelto } from '../topologia/resolverArtefactosReferenciados'
import type { AporteDeDemanda } from '../aporte/resolverAportesDeDemanda'
import { agregarAportesDeDemanda } from './agregarAportesDeDemanda'

// La agregación nunca mira artefactoResuelto: el contexto funcional es
// irrelevante en esta etapa, alcanza con una instancia estructuralmente
// válida y estable para poder testear identidad/no-mutación si hiciera falta.
function artefactoResueltoDummy(): ArtefactoResuelto {
  const artefacto: Artefacto = { id: 'a', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }
  const local: Local = { id: 'local-1', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto] }
  const unidadFuncional: UnidadFuncional = { id: 'uf-1', nombre: 'UF 1', locales: [local] }
  return {
    referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-1', artefactoId: 'a' },
    unidadFuncional,
    local,
    artefacto,
  }
}

function aporte(cantidad: number, quTotal_lps: number): AporteDeDemanda {
  return { artefactoResuelto: artefactoResueltoDummy(), cantidad, quTotal_lps }
}

describe('agregarAportesDeDemanda', () => {
  it('un aporte: n y qmax_lps corresponden a ese único aporte', () => {
    const resultado = agregarAportesDeDemanda([aporte(1, 0.2)])

    expect(resultado.n).toBe(1)
    expect(resultado.qmax_lps).toBeCloseTo(0.2, 10)
  })

  it('varios aportes: suma correcta de n y qmax_lps', () => {
    const resultado = agregarAportesDeDemanda([aporte(1, 0.2), aporte(1, 1.5)])

    expect(resultado.n).toBe(2)
    expect(resultado.qmax_lps).toBeCloseTo(1.7, 10)
  })

  it('cantidad > 1: n suma la cantidad y qmax_lps usa cantidad × quTotal_lps', () => {
    const resultado = agregarAportesDeDemanda([aporte(5, 0.2)])

    expect(resultado.n).toBe(5)
    expect(resultado.qmax_lps).toBeCloseTo(1.0, 10)
  })

  it('array vacío: devuelve {n: 0, qmax_lps: 0} sin excepción', () => {
    const resultado = agregarAportesDeDemanda([])

    expect(resultado).toEqual({ n: 0, qmax_lps: 0 })
  })

  it('no redondea: preserva la precisión del cálculo', () => {
    const resultado = agregarAportesDeDemanda([aporte(1, 0.1), aporte(1, 0.2)])

    // 0.1 + 0.2 en IEEE-754 no da exactamente 0.3; toBeCloseTo tolera el
    // ruido de representación sin introducir redondeo propio en el codigo.
    expect(resultado.qmax_lps).toBeCloseTo(0.3, 10)
    expect(resultado.qmax_lps).not.toBe(0.3)
  })

  it('el resultado no depende del orden de entrada', () => {
    const a = aporte(2, 0.3)
    const b = aporte(1, 1.5)
    const c = aporte(3, 0.08)

    const resultado1 = agregarAportesDeDemanda([a, b, c])
    const resultado2 = agregarAportesDeDemanda([c, a, b])

    expect(resultado1).toEqual(resultado2)
  })

  it('no muta el array de entrada', () => {
    const aportes = [aporte(1, 0.2), aporte(2, 1.5)]
    const copiaSuperficial = [...aportes]

    agregarAportesDeDemanda(aportes)

    expect(aportes).toEqual(copiaSuperficial)
    expect(aportes[0]).toBe(copiaSuperficial[0])
    expect(aportes[1]).toBe(copiaSuperficial[1])
  })
})
