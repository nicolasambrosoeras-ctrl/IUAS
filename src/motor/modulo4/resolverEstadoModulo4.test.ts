import { describe, it, expect } from 'vitest'
import type { Artefacto, ConfiguracionDeAbastecimiento, Proyecto } from '../../modelo/proyecto'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import { resolverEstadoModulo4 } from './resolverEstadoModulo4'

// Conjunto de Tabla N°2 (caso Golden G2): Qc exacto = √2/2 ≈ 0,707 l/s,
// por encima del gasto de conexión de un DN19 en el rango de Tabla N°1
// (0,52–1,41 l/s) -> los casos con "todos los datos" producen un déficit
// real y positivo.
const ARTEFACTOS_UNA_UF: readonly Artefacto[] = [
  { id: 'a-1', artefactoId: 'lavatorio', cantidad: 2, origen: 'normativo' },
  { id: 'a-2', artefactoId: 'banera', cantidad: 1, origen: 'normativo' },
  { id: 'a-3', artefactoId: 'inodoroDeposito', cantidad: 2, origen: 'normativo' },
  { id: 'a-4', artefactoId: 'bidet', cantidad: 1, origen: 'normativo' },
  { id: 'a-5', artefactoId: 'piletaDeCocina', cantidad: 1, origen: 'normativo' },
  { id: 'a-6', artefactoId: 'piletaDeLavar', cantidad: 1, origen: 'normativo' },
  { id: 'a-7', artefactoId: 'receptaculoDucha', cantidad: 1, origen: 'normativo' },
]

type Conexion = {
  presionSobreAcera_m?: number
  diametroNominalConexion_m?: number
  desnivelConexion_m?: number
}

function construirProyecto(opciones: {
  configuracionAbastecimiento?: ConfiguracionDeAbastecimiento
  artefactos?: readonly Artefacto[]
  conexion?: Conexion
}): Proyecto {
  const { configuracionAbastecimiento, artefactos = ARTEFACTOS_UNA_UF, conexion = {} } = opciones
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
      presionSobreAcera_m: conexion.presionSobreAcera_m ?? 10,
      alturaArtefactoMasDesfavorable_m: 3,
      ...(conexion.diametroNominalConexion_m !== undefined
        ? { diametroNominalConexion_m: conexion.diametroNominalConexion_m }
        : {}),
      ...(conexion.desnivelConexion_m !== undefined
        ? { desnivelConexion_m: conexion.desnivelConexion_m }
        : {}),
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

function resolver(proyecto: Proyecto) {
  return resolverEstadoModulo4({ proyecto, catalogoArtefactos, coeficientesMayoracion })
}

// Conexión que, con presionSobreAcera_m = 10 y este desnivel, da una
// presión de cálculo dentro del rango de Tabla N°1.
const CONEXION_COMPLETA: Conexion = {
  presionSobreAcera_m: 10,
  diametroNominalConexion_m: 0.019,
  desnivelConexion_m: 3, // Pcalc = 10 - 3 = 7 m
}

describe('resolverEstadoModulo4 (D-δ.63 / D-δ.65)', () => {
  it('E1: sin configuracionAbastecimiento -> noIniciado', () => {
    expect(resolver(construirProyecto({}))).toEqual({ estado: 'noIniciado' })
  })

  it('E2: directa sin ningún dato de conexión -> evaluado + sinReservaPorTanque', () => {
    const estado = resolver(
      construirProyecto({ configuracionAbastecimiento: { esquema: 'directa' } }),
    )
    expect(estado).toEqual({
      estado: 'evaluado',
      resultado: { tipo: 'sinReservaPorTanque', esquema: 'directa' },
    })
  })

  it('E3: tanque sin diámetro de conexión -> incompleto (faltaDiametroConexion)', () => {
    const estado = resolver(
      construirProyecto({
        configuracionAbastecimiento: { esquema: 'tanqueElevado', periodoConsumoMaximo_h: 2 },
        conexion: { desnivelConexion_m: 3 },
      }),
    )
    expect(estado.estado).toBe('incompleto')
    if (estado.estado !== 'incompleto') throw new Error('inesperado')
    expect(estado.motivos.map((m) => m.tipo)).toContain('faltaDiametroConexion')
  })

  it('E4: tanque sin desnivel de conexión -> incompleto (faltaDesnivelConexion)', () => {
    const estado = resolver(
      construirProyecto({
        configuracionAbastecimiento: { esquema: 'tanqueElevado', periodoConsumoMaximo_h: 2 },
        conexion: { diametroNominalConexion_m: 0.019 },
      }),
    )
    expect(estado.estado).toBe('incompleto')
    if (estado.estado !== 'incompleto') throw new Error('inesperado')
    expect(estado.motivos.map((m) => m.tipo)).toContain('faltaDesnivelConexion')
  })

  it('E5: tanque sin Tc -> incompleto (faltaPeriodoConsumoMaximo)', () => {
    const estado = resolver(
      construirProyecto({
        configuracionAbastecimiento: { esquema: 'tanqueElevado' },
        conexion: CONEXION_COMPLETA,
      }),
    )
    expect(estado.estado).toBe('incompleto')
    if (estado.estado !== 'incompleto') throw new Error('inesperado')
    expect(estado.motivos.map((m) => m.tipo)).toEqual(['faltaPeriodoConsumoMaximo'])
  })

  it('E6: tanque con presión de cálculo fuera de Tabla N°1 -> incompleto (presionConexionFueraDeTabla), no error', () => {
    const estado = resolver(
      construirProyecto({
        configuracionAbastecimiento: { esquema: 'tanqueElevado', periodoConsumoMaximo_h: 2 },
        // Pcalc = 2 - 0 = 2 m, por debajo del mínimo (4 m) de la tabla.
        conexion: { presionSobreAcera_m: 2, diametroNominalConexion_m: 0.019, desnivelConexion_m: 0 },
      }),
    )
    expect(estado.estado).toBe('incompleto')
    if (estado.estado !== 'incompleto') throw new Error('inesperado')
    const motivo = estado.motivos.find((m) => m.tipo === 'presionConexionFueraDeTabla')
    expect(motivo).toBeDefined()
    if (motivo?.tipo !== 'presionConexionFueraDeTabla') throw new Error('inesperado')
    expect(motivo.presionCalculo_m).toBe(2)
    expect(motivo.rango_m).toEqual({ min: 4, max: 35 })
  })

  it('E7: tanque con todos los datos -> evaluado + reservaCalculada, con traza de conexión', () => {
    const estado = resolver(
      construirProyecto({
        configuracionAbastecimiento: { esquema: 'tanqueElevado', periodoConsumoMaximo_h: 2 },
        conexion: { presionSobreAcera_m: 10, diametroNominalConexion_m: 0.019, desnivelConexion_m: 5 }, // Pcalc = 5
      }),
    )
    expect(estado.estado).toBe('evaluado')
    if (estado.estado !== 'evaluado' || estado.resultado.tipo !== 'reservaCalculada') {
      throw new Error('inesperado')
    }
    const { conexion, reserva } = estado.resultado
    expect(conexion.presionSobreAcera_m).toBe(10)
    expect(conexion.desnivelConexion_m).toBe(5)
    expect(conexion.presionCalculo_m).toBe(5)
    expect(conexion.qConexion_lps).toBe(0.6) // Tabla N°1: DN19 / 5 m
    expect(conexion.interpolacion.aplicada).toBe(false)
    expect(reserva.qConexion_lps).toBe(0.6)
    expect(reserva.volumenReservaDiseno_m3).toBeGreaterThan(0)
  })

  it('E8: cisternaBombeoElevado completo -> evaluado + reservaCalculada', () => {
    const estado = resolver(
      construirProyecto({
        configuracionAbastecimiento: { esquema: 'cisternaBombeoElevado', periodoConsumoMaximo_h: 3 },
        conexion: CONEXION_COMPLETA,
      }),
    )
    expect(estado.estado).toBe('evaluado')
    if (estado.estado !== 'evaluado' || estado.resultado.tipo !== 'reservaCalculada') {
      throw new Error('inesperado')
    }
    expect(estado.resultado.esquema).toBe('cisternaBombeoElevado')
  })

  it('E9: Qconexión >= Qc -> reservaCalculada con V = 0 (NO sinReservaPorTanque)', () => {
    const estado = resolver(
      construirProyecto({
        configuracionAbastecimiento: { esquema: 'tanqueElevado', periodoConsumoMaximo_h: 3 },
        // DN75 / 35 m -> Qconexión 28,10 l/s, muy por encima del Qc del fixture.
        conexion: { presionSobreAcera_m: 35, diametroNominalConexion_m: 0.075, desnivelConexion_m: 0 },
      }),
    )
    expect(estado.estado).toBe('evaluado')
    if (estado.estado !== 'evaluado' || estado.resultado.tipo !== 'reservaCalculada') {
      throw new Error('inesperado')
    }
    expect(estado.resultado.reserva.deficit_lps).toBe(0)
    expect(estado.resultado.reserva.volumenReservaDiseno_m3).toBe(0)
  })

  it('E10: tanqueElevado y cisternaBombeoElevado con los mismos datos -> misma Reserva Total Diaria', () => {
    const datos = (esquema: 'tanqueElevado' | 'cisternaBombeoElevado') =>
      construirProyecto({
        configuracionAbastecimiento: { esquema, periodoConsumoMaximo_h: 2 },
        conexion: CONEXION_COMPLETA,
      })
    const elevado = resolver(datos('tanqueElevado'))
    const cisterna = resolver(datos('cisternaBombeoElevado'))
    if (elevado.estado !== 'evaluado' || cisterna.estado !== 'evaluado') throw new Error('inesperado')
    if (elevado.resultado.tipo !== 'reservaCalculada' || cisterna.resultado.tipo !== 'reservaCalculada') {
      throw new Error('inesperado')
    }
    expect(cisterna.resultado.reserva.volumenReservaDiseno_m3).toBe(
      elevado.resultado.reserva.volumenReservaDiseno_m3,
    )
  })

  it('descenso: desnivel negativo aumenta la presión de cálculo y el Qconexión (mismo DN)', () => {
    const base = resolver(
      construirProyecto({
        configuracionAbastecimiento: { esquema: 'cisternaBombeoElevado', periodoConsumoMaximo_h: 2 },
        conexion: { presionSobreAcera_m: 5, diametroNominalConexion_m: 0.019, desnivelConexion_m: 0 },
      }),
    )
    const conDescenso = resolver(
      construirProyecto({
        configuracionAbastecimiento: { esquema: 'cisternaBombeoElevado', periodoConsumoMaximo_h: 2 },
        conexion: { presionSobreAcera_m: 5, diametroNominalConexion_m: 0.019, desnivelConexion_m: -2 }, // Pcalc = 7
      }),
    )
    if (base.estado !== 'evaluado' || conDescenso.estado !== 'evaluado') throw new Error('inesperado')
    if (base.resultado.tipo !== 'reservaCalculada' || conDescenso.resultado.tipo !== 'reservaCalculada') {
      throw new Error('inesperado')
    }
    expect(conDescenso.resultado.conexion.presionCalculo_m).toBe(7)
    expect(conDescenso.resultado.conexion.qConexion_lps).toBeGreaterThan(
      base.resultado.conexion.qConexion_lps,
    )
    // Más caudal de conexión -> menor (o igual) reserva requerida por déficit.
    expect(conDescenso.resultado.reserva.volumenReservaDiseno_m3).toBeLessThanOrEqual(
      base.resultado.reserva.volumenReservaDiseno_m3,
    )
  })

  it('E: DN de conexión no admisible (DN13) persistido -> error estructural, no incompleto', () => {
    const estado = resolver(
      construirProyecto({
        configuracionAbastecimiento: { esquema: 'tanqueElevado', periodoConsumoMaximo_h: 2 },
        conexion: { diametroNominalConexion_m: 0.013, desnivelConexion_m: 3 },
      }),
    )
    expect(estado.estado).toBe('error')
    if (estado.estado !== 'error') throw new Error('inesperado')
    expect(estado.problemas.map((p) => p.problema.codigo)).toContain(
      'parametrosDiametroNominalConexionNoAdmisible',
    )
  })

  it('E: desnivel de conexión no finito persistido -> error estructural', () => {
    const estado = resolver(
      construirProyecto({
        configuracionAbastecimiento: { esquema: 'tanqueElevado', periodoConsumoMaximo_h: 2 },
        conexion: { diametroNominalConexion_m: 0.019, desnivelConexion_m: Number.NaN },
      }),
    )
    expect(estado.estado).toBe('error')
    if (estado.estado !== 'error') throw new Error('inesperado')
    expect(estado.problemas.map((p) => p.problema.codigo)).toContain('parametrosDesnivelConexionNoFinito')
  })

  it('directa no se bloquea por datos de conexión ausentes ni por un DN inválido persistido', () => {
    const conDnInvalido = resolver(
      construirProyecto({
        configuracionAbastecimiento: { esquema: 'directa' },
        conexion: { diametroNominalConexion_m: 0.013 },
      }),
    )
    // El DN inválido persistido sí es error estructural (dato corrupto),
    // pero eso es independiente del esquema.
    expect(conDnInvalido.estado).toBe('error')

    const sinDatos = resolver(construirProyecto({ configuracionAbastecimiento: { esquema: 'directa' } }))
    expect(sinDatos).toEqual({
      estado: 'evaluado',
      resultado: { tipo: 'sinReservaPorTanque', esquema: 'directa' },
    })
  })

  it('incompleto acumula todos los motivos faltantes a la vez', () => {
    const estado = resolver(
      construirProyecto({ configuracionAbastecimiento: { esquema: 'cisternaBombeoElevado' } }),
    )
    expect(estado.estado).toBe('incompleto')
    if (estado.estado !== 'incompleto') throw new Error('inesperado')
    expect(estado.motivos.map((m) => m.tipo).sort()).toEqual(
      ['faltaDesnivelConexion', 'faltaDiametroConexion', 'faltaPeriodoConsumoMaximo'].sort(),
    )
  })

  it('el estado no persiste nada en el Proyecto (función pura, idempotente)', () => {
    const proyecto = construirProyecto({
      configuracionAbastecimiento: { esquema: 'tanqueElevado', periodoConsumoMaximo_h: 2 },
      conexion: CONEXION_COMPLETA,
    })
    const copia = structuredClone(proyecto)
    resolver(proyecto)
    expect(proyecto).toEqual(copia)
    expect(resolver(proyecto)).toEqual(resolver(proyecto))
  })

  it('interpolación de Tabla N°1 propagada end-to-end (Pcalc no entero)', () => {
    const estado = resolver(
      construirProyecto({
        configuracionAbastecimiento: { esquema: 'tanqueElevado', periodoConsumoMaximo_h: 2 },
        // Pcalc = 8 - 1,5 = 6,5 m -> interpola entre 6 y 7 m.
        conexion: { presionSobreAcera_m: 8, diametroNominalConexion_m: 0.019, desnivelConexion_m: 1.5 },
      }),
    )
    if (estado.estado !== 'evaluado' || estado.resultado.tipo !== 'reservaCalculada') {
      throw new Error('inesperado')
    }
    const { conexion } = estado.resultado
    expect(conexion.presionCalculo_m).toBe(6.5)
    expect(conexion.interpolacion.aplicada).toBe(true)
    // Tabla N°1 DN19: q(6) = 0,66 ; q(7) = 0,72 ; fracción 0,5 -> 0,69.
    expect(conexion.qConexion_lps).toBeCloseTo(0.69, 10)
    expect(conexion.qConexion_lps).not.toBe(0.66)
    expect(conexion.qConexion_lps).not.toBe(0.72)
  })
})
