import { describe, it, expect } from 'vitest'
import type { Artefacto, ConfiguracionDeAbastecimiento, Proyecto } from '../../modelo/proyecto'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import { resolverEstadoModulo4 } from './resolverEstadoModulo4'

const ARTEFACTOS_UNA_UF: readonly Artefacto[] = [
  { id: 'a-1', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' },
  { id: 'a-2', artefactoId: 'inodoroDeposito', cantidad: 1, origen: 'normativo' },
]

function construirProyecto(opciones: {
  configuracionAbastecimiento?: ConfiguracionDeAbastecimiento
  artefactos?: readonly Artefacto[]
}): Proyecto {
  const { configuracionAbastecimiento, artefactos = ARTEFACTOS_UNA_UF } = opciones
  return {
    metadatos: {
      nombre: 'Proyecto de prueba',
      obra: 'Obra',
      comitente: 'Comitente',
      fecha: '2026-01-01',
      schemaVersion: '1.0.0',
      versionNormativa: 'eras-2023',
    },
    parametros: {
      tipoDeProyecto: 'viviendaIndividual',
      presionSobreAcera_m: 2,
      alturaArtefactoMasDesfavorable_m: 3,
    },
    unidadesFuncionales: [
      {
        id: 'uf-1',
        nombre: 'UF 1',
        locales: [{ id: 'local-1', tipo: 'bano', regimen: 'domiciliario', artefactos }],
      },
    ],
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'detallado',
      granularidadHidraulica: 'profesional',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
    ...(configuracionAbastecimiento !== undefined ? { configuracionAbastecimiento } : {}),
  }
}

function resolver(proyecto: Proyecto, qConexion_lps?: number) {
  return resolverEstadoModulo4({ proyecto, catalogoArtefactos, coeficientesMayoracion, qConexion_lps })
}

describe('resolverEstadoModulo4 (D-δ.63)', () => {
  it('E1: sin configuracionAbastecimiento -> noIniciado', () => {
    expect(resolver(construirProyecto({}))).toEqual({ estado: 'noIniciado' })
  })

  it('E2: directa -> evaluado + sinReservaPorTanque, sin necesitar Tc ni Qconexión', () => {
    const estado = resolver(construirProyecto({ configuracionAbastecimiento: { esquema: 'directa' } }))
    expect(estado).toEqual({
      estado: 'evaluado',
      resultado: { tipo: 'sinReservaPorTanque', esquema: 'directa' },
    })
  })

  it('E3: tanque + Tc ausente -> incompleto (faltaPeriodoConsumoMaximo)', () => {
    const estado = resolver(
      construirProyecto({ configuracionAbastecimiento: { esquema: 'tanqueElevado' } }),
      0.5,
    )
    expect(estado.estado).toBe('incompleto')
    if (estado.estado !== 'incompleto') throw new Error('inesperado')
    expect(estado.motivos.map((m) => m.tipo)).toContain('faltaPeriodoConsumoMaximo')
  })

  it('E4: tanque + Tc presente + falta Qconexión -> incompleto (faltaCaudalDeConexion)', () => {
    const estado = resolver(
      construirProyecto({
        configuracionAbastecimiento: { esquema: 'tanqueElevado', periodoConsumoMaximo_h: 2 },
      }),
      undefined,
    )
    expect(estado.estado).toBe('incompleto')
    if (estado.estado !== 'incompleto') throw new Error('inesperado')
    expect(estado.motivos.map((m) => m.tipo)).toEqual(['faltaCaudalDeConexion'])
  })

  it('E5: tanque + Qconexión + M1 sin artefactos computables -> incompleto (sinArtefactosComputables)', () => {
    const estado = resolver(
      construirProyecto({
        configuracionAbastecimiento: { esquema: 'tanqueElevado', periodoConsumoMaximo_h: 2 },
        artefactos: [{ id: 'a-1', artefactoId: 'lavatorio', cantidad: 1, origen: 'usuario' }],
      }),
      0.5,
    )
    expect(estado.estado).toBe('incompleto')
    if (estado.estado !== 'incompleto') throw new Error('inesperado')
    expect(estado.motivos.map((m) => m.tipo)).toContain('sinArtefactosComputables')
  })

  it('E6: tanque + todo disponible -> evaluado + reservaCalculada', () => {
    const estado = resolver(
      construirProyecto({
        configuracionAbastecimiento: { esquema: 'tanqueElevado', periodoConsumoMaximo_h: 2 },
      }),
      0.1,
    )
    expect(estado.estado).toBe('evaluado')
    if (estado.estado !== 'evaluado') throw new Error('inesperado')
    expect(estado.resultado.tipo).toBe('reservaCalculada')
    if (estado.resultado.tipo !== 'reservaCalculada') throw new Error('inesperado')
    expect(estado.resultado.esquema).toBe('tanqueElevado')
    expect(estado.resultado.reserva.deficit_lps).toBeGreaterThan(0)
    expect(estado.resultado.reserva.volumenReservaDiseno_m3).toBeGreaterThan(0)
  })

  it('E7: Qconexión >= Qc -> evaluado + reservaCalculada con V = 0 (NO sinReservaPorTanque)', () => {
    const estado = resolver(
      construirProyecto({
        configuracionAbastecimiento: { esquema: 'tanqueElevado', periodoConsumoMaximo_h: 3 },
      }),
      50,
    )
    expect(estado.estado).toBe('evaluado')
    if (estado.estado !== 'evaluado') throw new Error('inesperado')
    expect(estado.resultado.tipo).toBe('reservaCalculada')
    if (estado.resultado.tipo !== 'reservaCalculada') throw new Error('inesperado')
    expect(estado.resultado.reserva.deficit_lps).toBe(0)
    expect(estado.resultado.reserva.volumenReservaDiseno_m3).toBe(0)
  })

  it('E8: tanqueElevado y cisternaBombeoElevado -> misma Reserva Total Diaria de Diseño', () => {
    const config = (esquema: 'tanqueElevado' | 'cisternaBombeoElevado'): ConfiguracionDeAbastecimiento => ({
      esquema,
      periodoConsumoMaximo_h: 2,
    })
    const elevado = resolver(
      construirProyecto({ configuracionAbastecimiento: config('tanqueElevado') }),
      0.1,
    )
    const cisterna = resolver(
      construirProyecto({ configuracionAbastecimiento: config('cisternaBombeoElevado') }),
      0.1,
    )
    if (elevado.estado !== 'evaluado' || cisterna.estado !== 'evaluado') throw new Error('inesperado')
    if (elevado.resultado.tipo !== 'reservaCalculada' || cisterna.resultado.tipo !== 'reservaCalculada') {
      throw new Error('inesperado')
    }
    expect(cisterna.resultado.reserva.volumenReservaDiseno_m3).toBe(
      elevado.resultado.reserva.volumenReservaDiseno_m3,
    )
    expect(cisterna.resultado.esquema).toBe('cisternaBombeoElevado')
  })

  it('E9: el Qc usado es el exacto de M1, sin redondeo intermedio', () => {
    // Fixture del caso Golden G2: Qc exacto = √2/2 (impreso 0,71).
    const proyecto = construirProyecto({
      configuracionAbastecimiento: { esquema: 'tanqueElevado', periodoConsumoMaximo_h: 2 },
      artefactos: [
        { id: 'a-1', artefactoId: 'lavatorio', cantidad: 2, origen: 'normativo' },
        { id: 'a-2', artefactoId: 'banera', cantidad: 1, origen: 'normativo' },
        { id: 'a-3', artefactoId: 'inodoroDeposito', cantidad: 2, origen: 'normativo' },
        { id: 'a-4', artefactoId: 'bidet', cantidad: 1, origen: 'normativo' },
        { id: 'a-5', artefactoId: 'piletaDeCocina', cantidad: 1, origen: 'normativo' },
        { id: 'a-6', artefactoId: 'piletaDeLavar', cantidad: 1, origen: 'normativo' },
        { id: 'a-7', artefactoId: 'receptaculoDucha', cantidad: 1, origen: 'normativo' },
      ],
    })
    const estado = resolver(proyecto, 0.6)
    if (estado.estado !== 'evaluado' || estado.resultado.tipo !== 'reservaCalculada') {
      throw new Error('inesperado')
    }
    const qcExacto = Math.SQRT2 / 2
    expect(estado.resultado.reserva.qc_lps).toBeCloseTo(qcExacto, 12)
    expect(estado.resultado.reserva.volumenReservaDiseno_m3).toBeCloseTo((qcExacto - 0.6) * 3.6 * 2, 10)
    // Con Qc redondeado a 0,71 daría 0,792 m³: se comprueba que NO es ese valor.
    expect(estado.resultado.reserva.volumenReservaDiseno_m3).not.toBeCloseTo(0.792, 3)
  })

  it('E10: el estado no persiste nada en el Proyecto (función pura, resultado siempre recalculado)', () => {
    const proyecto = construirProyecto({
      configuracionAbastecimiento: { esquema: 'tanqueElevado', periodoConsumoMaximo_h: 2 },
    })
    const copia = structuredClone(proyecto)
    resolver(proyecto, 0.1)
    expect(proyecto).toEqual(copia)
    // Idempotencia: dos llamadas producen exactamente el mismo resultado.
    expect(resolver(proyecto, 0.1)).toEqual(resolver(proyecto, 0.1))
  })

  it('error: configuracionAbastecimiento persistida inválida (Tc fuera de rango) -> error, no incompleto', () => {
    const estado = resolver(
      construirProyecto({
        configuracionAbastecimiento: { esquema: 'tanqueElevado', periodoConsumoMaximo_h: 9 },
      }),
      0.1,
    )
    expect(estado.estado).toBe('error')
    if (estado.estado !== 'error') throw new Error('inesperado')
    expect(estado.problemas.map((p) => p.problema.codigo)).toEqual([
      'configuracionAbastecimientoPeriodoConsumoMaximoInvalido',
    ])
  })

  it('incompleto acumula todos los motivos faltantes a la vez', () => {
    const estado = resolver(
      construirProyecto({ configuracionAbastecimiento: { esquema: 'cisternaBombeoElevado' } }),
      undefined,
    )
    expect(estado.estado).toBe('incompleto')
    if (estado.estado !== 'incompleto') throw new Error('inesperado')
    expect(estado.motivos.map((m) => m.tipo).sort()).toEqual(
      ['faltaCaudalDeConexion', 'faltaPeriodoConsumoMaximo'].sort(),
    )
  })
})
