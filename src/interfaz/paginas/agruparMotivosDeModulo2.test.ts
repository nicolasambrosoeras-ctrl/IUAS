import { describe, it, expect } from 'vitest'
import type { DiagnosticoIncompletitudModulo2 } from '../../motor/modulo2/resolverEstadoModulo2'
import { agruparMotivosDeModulo2 } from './agruparMotivosDeModulo2'

describe('agruparMotivosDeModulo2', () => {
  it('sinTerminalesHidraulicos: una línea fija, sin cantidades inventadas', () => {
    const motivos: DiagnosticoIncompletitudModulo2[] = [{ tipo: 'sinTerminalesHidraulicos' }]

    expect(agruparMotivosDeModulo2(motivos)).toEqual(['El proyecto no tiene ningún terminal hidráulico conectado todavía.'])
  })

  it('coberturaFisicaIncompleta: cuenta los artefactos sin referencia de la única entrada (nunca ids)', () => {
    const motivos: DiagnosticoIncompletitudModulo2[] = [
      {
        tipo: 'coberturaFisicaIncompleta',
        artefactosSinReferencia: [
          { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'l1', artefactoId: 'a1' },
          { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'l1', artefactoId: 'a2' },
        ],
      },
    ]

    const resultado = agruparMotivosDeModulo2(motivos)

    expect(resultado).toContain('Faltan conectar físicamente 2 artefactos a la red hidráulica.')
    expect(resultado.some((linea) => linea.includes('uf-1') || linea.includes('a1'))).toBe(false)
  })

  it('desnivelIncompleto: deduplica nodosSinCota repetidos entre varios terminales antes de contar', () => {
    const motivos: DiagnosticoIncompletitudModulo2[] = [
      { tipo: 'desnivelIncompleto', nodoId: 't1', nodosSinCota: ['raiz', 'terminal1'] },
      { tipo: 'desnivelIncompleto', nodoId: 't2', nodosSinCota: ['raiz', 'terminal2'] },
    ]

    // 'raiz' se repite en ambos motivos -- el conjunto deduplicado es
    // {raiz, terminal1, terminal2} = 3, no 4 (suma ingenua).
    expect(agruparMotivosDeModulo2(motivos)).toEqual(['Faltan cotas de conexión en 3 puntos.'])
  })

  it('perdidaLocalizadaIncompleta: singular cuando el conjunto deduplicado de tramos es 1', () => {
    const motivos: DiagnosticoIncompletitudModulo2[] = [
      { tipo: 'perdidaLocalizadaIncompleta', nodoId: 't1', tramosNoResueltos: [{ tramoId: 'tramo-a', motivo: 'sinRelevar' }] },
    ]

    expect(agruparMotivosDeModulo2(motivos)).toEqual(['Falta relevar accesorios o tees en 1 tramo.'])
  })

  it('balanceIncompleto: cuenta terminales distintos (nodoId), no la cantidad de entradas', () => {
    const motivos: DiagnosticoIncompletitudModulo2[] = [
      { tipo: 'balanceIncompleto', nodoId: 't1', terminosFaltantes: ['hfMedidor'] },
      { tipo: 'balanceIncompleto', nodoId: 't2', terminosFaltantes: ['hfMedidor'] },
    ]

    expect(agruparMotivosDeModulo2(motivos)).toEqual(['Hay 2 terminales con el balance de presión todavía incompleto.'])
  })

  it('sinTerminalesConPresionMinimaPublicada: una línea fija', () => {
    const motivos: DiagnosticoIncompletitudModulo2[] = [{ tipo: 'sinTerminalesConPresionMinimaPublicada' }]

    expect(agruparMotivosDeModulo2(motivos)).toEqual(['Ningún terminal del proyecto tiene presión mínima normativa publicada para verificar.'])
  })

  it('combina múltiples tipos de motivo en líneas independientes, en un orden estable', () => {
    const motivos: DiagnosticoIncompletitudModulo2[] = [
      { tipo: 'presionDisponibleNoProvista' },
      { tipo: 'desnivelIncompleto', nodoId: 't1', nodosSinCota: ['a'] },
    ]

    expect(agruparMotivosDeModulo2(motivos)).toEqual([
      'Falta indicar el tipo de alimentación y sus datos.',
      'Faltan cotas de conexión en 1 punto.',
    ])
  })
})
