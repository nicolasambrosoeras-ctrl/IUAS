import { describe, it, expect } from 'vitest'
import type { DiagnosticoIncompletitudModulo2 } from '../../motor/modulo2/resolverEstadoModulo2'
import { agruparMotivosDeModulo2 } from './agruparMotivosDeModulo2'

describe('agruparMotivosDeModulo2', () => {
  it('sinTerminalesHidraulicos: una línea fija, sin cantidades inventadas', () => {
    const motivos: DiagnosticoIncompletitudModulo2[] = [{ tipo: 'sinTerminalesHidraulicos' }]

    expect(agruparMotivosDeModulo2(motivos, [])).toEqual(['El proyecto no tiene ningún terminal hidráulico conectado todavía.'])
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

    const resultado = agruparMotivosDeModulo2(motivos, [])

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
    expect(agruparMotivosDeModulo2(motivos, [])).toEqual(['Faltan cotas de conexión en 3 puntos.'])
  })

  it('unidadFuncionalSinCotaDeReferencia (D-δ.46): nombra la UF por su nombre, no por id técnico', () => {
    const motivos: DiagnosticoIncompletitudModulo2[] = [
      { tipo: 'unidadFuncionalSinCotaDeReferencia', unidadFuncionalId: 'uf-2' },
    ]
    const unidadesFuncionales = [
      { id: 'uf-1', nombre: 'Unidad funcional 1', niveles: [{ id: 'uf-1-nivel-1', nombre: 'Nivel 1', locales: [] }] },
      { id: 'uf-2', nombre: 'Unidad funcional 2', niveles: [{ id: 'uf-2-nivel-1', nombre: 'Nivel 1', locales: [] }] },
    ]

    const resultado = agruparMotivosDeModulo2(motivos, unidadesFuncionales)

    expect(resultado).toEqual(['Falta la cota hidráulica de referencia de Unidad funcional 2.'])
  })

  it('unidadFuncionalSinCotaDeReferencia: ya deduplicado aguas arriba, pero una sola línea por UF aunque se repita el id', () => {
    const motivos: DiagnosticoIncompletitudModulo2[] = [
      { tipo: 'unidadFuncionalSinCotaDeReferencia', unidadFuncionalId: 'uf-1' },
      { tipo: 'unidadFuncionalSinCotaDeReferencia', unidadFuncionalId: 'uf-1' },
    ]
    const unidadesFuncionales = [{ id: 'uf-1', nombre: 'Unidad funcional 1', niveles: [{ id: 'uf-1-nivel-1', nombre: 'Nivel 1', locales: [] }] }]

    expect(agruparMotivosDeModulo2(motivos, unidadesFuncionales)).toEqual([
      'Falta la cota hidráulica de referencia de Unidad funcional 1.',
    ])
  })

  it('perdidaLocalizadaIncompleta: singular cuando el conjunto deduplicado de tramos es 1', () => {
    const motivos: DiagnosticoIncompletitudModulo2[] = [
      { tipo: 'perdidaLocalizadaIncompleta', nodoId: 't1', tramosNoResueltos: [{ tramoId: 'tramo-a', motivo: 'sinRelevar' }] },
    ]

    expect(agruparMotivosDeModulo2(motivos, [])).toEqual(['Falta relevar accesorios o tees en 1 tramo.'])
  })

  it('perdidaLocalizadaIncompleta con motivo derivacionMultipleNoModelada (M2-TOPO-E): línea propia, sin ids ni enums', () => {
    const motivos: DiagnosticoIncompletitudModulo2[] = [
      {
        tipo: 'perdidaLocalizadaIncompleta',
        nodoId: 'term-1',
        tramosNoResueltos: [{ tramoId: 'tramo-x', motivo: 'derivacionMultipleNoModelada' }],
      },
      {
        tipo: 'perdidaLocalizadaIncompleta',
        nodoId: 'term-2',
        tramosNoResueltos: [{ tramoId: 'tramo-y', motivo: 'derivacionMultipleNoModelada' }],
      },
    ]

    expect(agruparMotivosDeModulo2(motivos, [])).toEqual([
      'En 2 tramos la pérdida localizada de una derivación múltiple todavía no está modelada.',
    ])
  })

  it('perdidaLocalizadaIncompleta: separa la línea de "relevar" de la de "derivación múltiple" cuando conviven', () => {
    const motivos: DiagnosticoIncompletitudModulo2[] = [
      {
        tipo: 'perdidaLocalizadaIncompleta',
        nodoId: 'term-1',
        tramosNoResueltos: [
          { tramoId: 'tramo-a', motivo: 'sinRelevar' },
          { tramoId: 'tramo-x', motivo: 'derivacionMultipleNoModelada' },
        ],
      },
    ]

    expect(agruparMotivosDeModulo2(motivos, [])).toEqual([
      'Falta relevar accesorios o tees en 1 tramo.',
      'En 1 tramo la pérdida localizada de una derivación múltiple todavía no está modelada.',
    ])
  })

  it('balanceIncompleto: cuenta terminales distintos (nodoId), no la cantidad de entradas', () => {
    const motivos: DiagnosticoIncompletitudModulo2[] = [
      { tipo: 'balanceIncompleto', nodoId: 't1', terminosFaltantes: ['hfMedidor'] },
      { tipo: 'balanceIncompleto', nodoId: 't2', terminosFaltantes: ['hfMedidor'] },
    ]

    expect(agruparMotivosDeModulo2(motivos, [])).toEqual(['Hay 2 terminales con el balance de presión todavía incompleto.'])
  })

  it('sinTerminalesConPresionMinimaPublicada: una línea fija', () => {
    const motivos: DiagnosticoIncompletitudModulo2[] = [{ tipo: 'sinTerminalesConPresionMinimaPublicada' }]

    expect(agruparMotivosDeModulo2(motivos, [])).toEqual(['Ningún terminal del proyecto tiene presión mínima normativa publicada para verificar.'])
  })

  it('combina múltiples tipos de motivo en líneas independientes, en un orden estable', () => {
    const motivos: DiagnosticoIncompletitudModulo2[] = [
      { tipo: 'presionDisponibleNoProvista' },
      { tipo: 'desnivelIncompleto', nodoId: 't1', nodosSinCota: ['a'] },
    ]

    expect(agruparMotivosDeModulo2(motivos, [])).toEqual([
      'Falta configurar el esquema de abastecimiento en el Módulo 4.',
      'Faltan cotas de conexión en 1 punto.',
    ])
  })
})
