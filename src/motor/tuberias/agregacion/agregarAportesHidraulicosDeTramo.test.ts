import { describe, it, expect } from 'vitest'
import type { Artefacto, Local, UnidadFuncional } from '../../../modelo/proyecto'
import type { ArtefactoResuelto } from '../topologia/resolverArtefactosReferenciados'
import type { AporteHidraulicoDeTramo } from '../aporte/resolverAportesHidraulicosDeTramo'
import type { CondicionHidraulicaDeCaudal } from '../caudal/resolverQuEfectivo'
import { agregarAportesHidraulicosDeTramo } from './agregarAportesHidraulicosDeTramo'

// La agregación nunca mira artefactoResuelto ni condicion para la
// aritmética: alcanza con una instancia estructuralmente válida y estable
// para poder testear identidad/no-mutación si hiciera falta.
function artefactoResueltoDummy(): ArtefactoResuelto {
  const artefacto: Artefacto = { id: 'a', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }
  const local: Local = { id: 'local-1', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto] }
  const unidadFuncional: UnidadFuncional = {
    id: 'uf-1',
    nombre: 'UF 1',
    niveles: [{ id: 'uf-1-nivel-1', nombre: 'Nivel 1', locales: [local] }],
  }
  return {
    referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-1', artefactoId: 'a' },
    unidadFuncional,
    local,
    artefacto,
  }
}

function aporte(cantidad: number, condicion: CondicionHidraulicaDeCaudal, qu_lps: number): AporteHidraulicoDeTramo {
  return { artefactoResuelto: artefactoResueltoDummy(), cantidad, condicion, qu_lps }
}

describe('agregarAportesHidraulicosDeTramo', () => {
  it('un aporte: n y qmax_lps corresponden a ese único aporte', () => {
    const resultado = agregarAportesHidraulicosDeTramo([aporte(1, 'total', 0.2)])

    expect(resultado.n).toBe(1)
    expect(resultado.qmax_lps).toBeCloseTo(0.2, 10)
  })

  it('cantidad > 1: n suma la cantidad y qmax_lps usa cantidad × qu_lps (qu_lps unitario)', () => {
    const resultado = agregarAportesHidraulicosDeTramo([aporte(3, 'aguaFria', 0.2)])

    expect(resultado.n).toBe(3)
    expect(resultado.qmax_lps).toBeCloseTo(0.6, 10)
  })

  it('varios aportes: suma correcta de n y qmax_lps', () => {
    const resultado = agregarAportesHidraulicosDeTramo([
      aporte(1, 'total', 0.2),
      aporte(2, 'aguaFria', 0.08),
      aporte(3, 'aguaCaliente', 0.12),
    ])

    expect(resultado.n).toBe(6)
    expect(resultado.qmax_lps).toBeCloseTo(0.2 + 0.16 + 0.36, 10)
    expect(resultado.qmax_lps).toBeCloseTo(0.72, 10)
  })

  it('condiciones distintas en el mismo conjunto: se suman sin tratamiento especial por condicion', () => {
    const resultado = agregarAportesHidraulicosDeTramo([
      aporte(1, 'total', 0.3),
      aporte(1, 'aguaFria', 0.2),
      aporte(1, 'aguaCaliente', 0.12),
    ])

    expect(resultado.n).toBe(3)
    expect(resultado.qmax_lps).toBeCloseTo(0.62, 10)
  })

  it('mismo qu_lps con condicion distinta: la condicion no altera la aritmética', () => {
    const resultadoConTotal = agregarAportesHidraulicosDeTramo([aporte(1, 'total', 0.2)])
    const resultadoConAguaFria = agregarAportesHidraulicosDeTramo([aporte(1, 'aguaFria', 0.2)])

    expect(resultadoConTotal).toEqual(resultadoConAguaFria)
  })

  it('array vacío: devuelve {n: 0, qmax_lps: 0} sin excepción', () => {
    const resultado = agregarAportesHidraulicosDeTramo([])

    expect(resultado).toEqual({ n: 0, qmax_lps: 0 })
  })

  it('no redondea: preserva la precisión del cálculo', () => {
    const resultado = agregarAportesHidraulicosDeTramo([aporte(1, 'aguaFria', 0.1), aporte(1, 'aguaCaliente', 0.2)])

    // 0.1 + 0.2 en IEEE-754 no da exactamente 0.3; toBeCloseTo tolera el
    // ruido de representación sin introducir redondeo propio en el codigo.
    expect(resultado.qmax_lps).toBeCloseTo(0.3, 10)
    expect(resultado.qmax_lps).not.toBe(0.3)
  })

  it('no muta el array de entrada ni los objetos AporteHidraulicoDeTramo', () => {
    const aportes = [aporte(1, 'total', 0.2), aporte(2, 'aguaCaliente', 0.12)]
    const copiaSuperficial = [...aportes]

    agregarAportesHidraulicosDeTramo(aportes)

    expect(aportes).toEqual(copiaSuperficial)
    expect(aportes[0]).toBe(copiaSuperficial[0])
    expect(aportes[1]).toBe(copiaSuperficial[1])
  })
})
