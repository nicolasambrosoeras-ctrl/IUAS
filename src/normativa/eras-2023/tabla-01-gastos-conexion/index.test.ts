import { describe, it, expect } from 'vitest'
import {
  columnasDeDiametroTabla01,
  diametroMinimoConexion_m,
  diametrosNominalesTabla01_m,
  esDiametroAdmisibleComoConexion,
  rangoPresionValida_m,
  resolverGastoTabla01,
  tablaGastosConexion,
  type FilaTablaGastos,
} from './index'

const CLAVES_DE_DIAMETRO = columnasDeDiametroTabla01.map((c) => c.clave)

describe('tablaGastosConexion — integridad del dataset (auditoría M4-D1)', () => {
  it('cubre presiones enteras contiguas de 4 a 35 m, sin huecos', () => {
    expect(tablaGastosConexion[0]?.presionDisponible_m).toBe(rangoPresionValida_m.min)
    expect(tablaGastosConexion[tablaGastosConexion.length - 1]?.presionDisponible_m).toBe(
      rangoPresionValida_m.max,
    )
    tablaGastosConexion.forEach((fila, indice) => {
      expect(fila.presionDisponible_m).toBe(rangoPresionValida_m.min + indice)
    })
  })

  it('el gasto crece (no decrece) con la presión, para cada diámetro', () => {
    for (const clave of CLAVES_DE_DIAMETRO) {
      for (let i = 1; i < tablaGastosConexion.length; i++) {
        const previa = tablaGastosConexion[i - 1] as FilaTablaGastos
        const actual = tablaGastosConexion[i] as FilaTablaGastos
        expect(actual[clave]).toBeGreaterThanOrEqual(previa[clave])
      }
    }
  })

  it('el gasto crece estrictamente con el diámetro, en cada fila', () => {
    for (const fila of tablaGastosConexion) {
      for (let i = 1; i < CLAVES_DE_DIAMETRO.length; i++) {
        const claveMenor = CLAVES_DE_DIAMETRO[i - 1] as (typeof CLAVES_DE_DIAMETRO)[number]
        const claveMayor = CLAVES_DE_DIAMETRO[i] as (typeof CLAVES_DE_DIAMETRO)[number]
        expect(fila[claveMayor]).toBeGreaterThan(fila[claveMenor])
      }
    }
  })

  it('los 8 diámetros nominales tabulados son 13/19/25/32/38/50/60/75 mm', () => {
    expect(diametrosNominalesTabla01_m).toEqual([0.013, 0.019, 0.025, 0.032, 0.038, 0.05, 0.06, 0.075])
  })
})

describe('resolverGastoTabla01 (ERAS-2023 §2.7, CRIT-A36)', () => {
  it('T1: resuelve cada diámetro tabulado en una presión exacta', () => {
    const filaP10 = tablaGastosConexion.find((f) => f.presionDisponible_m === 10) as FilaTablaGastos
    for (const { diametroNominal_m, clave } of columnasDeDiametroTabla01) {
      const r = resolverGastoTabla01({ diametroNominal_m, presionCalculo_m: 10 })
      expect(r.estado).toBe('resuelto')
      if (r.estado !== 'resuelto') throw new Error('inesperado')
      expect(r.qConexion_lps).toBe(filaP10[clave])
      expect(r.interpolacion.aplicada).toBe(false)
    }
  })

  it('T2/T3: presión mínima y máxima exactas -> resuelto sin interpolación', () => {
    const min = resolverGastoTabla01({ diametroNominal_m: 0.019, presionCalculo_m: rangoPresionValida_m.min })
    expect(min).toMatchObject({ estado: 'resuelto', qConexion_lps: 0.52 })
    if (min.estado === 'resuelto') expect(min.interpolacion.aplicada).toBe(false)

    const max = resolverGastoTabla01({ diametroNominal_m: 0.019, presionCalculo_m: rangoPresionValida_m.max })
    expect(max).toMatchObject({ estado: 'resuelto', qConexion_lps: 1.41 })
  })

  it('T4: interpolación lineal en una presión no tabulada (DN19, P = 5,25 m)', () => {
    const r = resolverGastoTabla01({ diametroNominal_m: 0.019, presionCalculo_m: 5.25 })
    expect(r.estado).toBe('resuelto')
    if (r.estado !== 'resuelto') throw new Error('inesperado')
    // q(5) = 0,60 ; q(6) = 0,66 ; fracción 0,25 -> 0,60 + 0,06·0,25 = 0,615
    expect(r.qConexion_lps).toBeCloseTo(0.6 + (0.66 - 0.6) * 0.25, 10)
    expect(r.qConexion_lps).toBeCloseTo(0.615, 6)
    expect(r.interpolacion).toEqual({
      aplicada: true,
      presionInferior_m: 5,
      presionSuperior_m: 6,
      gastoInferior_lps: 0.6,
      gastoSuperior_lps: 0.66,
    })
  })

  it('T4b: interpolación con fracción 0,6 (DN25, P = 7,6 m)', () => {
    const r = resolverGastoTabla01({ diametroNominal_m: 0.025, presionCalculo_m: 7.6 })
    if (r.estado !== 'resuelto') throw new Error('inesperado')
    // q(7) = 1,41 ; q(8) = 1,48 ; fracción 0,6 -> 1,41 + 0,07·0,6 = 1,452
    expect(r.qConexion_lps).toBeCloseTo(1.41 + (1.48 - 1.41) * 0.6, 10)
    expect(r.qConexion_lps).toBeCloseTo(1.452, 6)
  })

  it('un punto exactamente tabulado no se ve alterado por la lógica de interpolación', () => {
    const r = resolverGastoTabla01({ diametroNominal_m: 0.05, presionCalculo_m: 20 })
    if (r.estado !== 'resuelto') throw new Error('inesperado')
    expect(r.qConexion_lps).toBe(10.52)
    expect(r.interpolacion).toEqual({ aplicada: false, presionTabulada_m: 20 })
  })

  it('T5: diámetro no tabulado (DN22) -> diametroNoTabulado', () => {
    const r = resolverGastoTabla01({ diametroNominal_m: 0.022, presionCalculo_m: 10 })
    expect(r.estado).toBe('diametroNoTabulado')
    if (r.estado !== 'diametroNoTabulado') throw new Error('inesperado')
    expect(r.diametrosTabulados_m).toEqual(diametrosNominalesTabla01_m)
  })

  it('no interpola entre diámetros: DN entre 19 y 25 no "promedia" columnas', () => {
    expect(resolverGastoTabla01({ diametroNominal_m: 0.021, presionCalculo_m: 10 }).estado).toBe(
      'diametroNoTabulado',
    )
  })

  it('T6/T7: presión apenas fuera de rango -> fueraDeRangoDePresion, sin clamp', () => {
    const bajo = resolverGastoTabla01({ diametroNominal_m: 0.019, presionCalculo_m: 3.999 })
    expect(bajo).toMatchObject({ estado: 'fueraDeRangoDePresion', rango_m: rangoPresionValida_m })

    const alto = resolverGastoTabla01({ diametroNominal_m: 0.019, presionCalculo_m: 35.001 })
    expect(alto.estado).toBe('fueraDeRangoDePresion')

    // Casos citados en el brief: 2 m y 36 m.
    expect(resolverGastoTabla01({ diametroNominal_m: 0.019, presionCalculo_m: 2 }).estado).toBe(
      'fueraDeRangoDePresion',
    )
    expect(resolverGastoTabla01({ diametroNominal_m: 0.019, presionCalculo_m: 36 }).estado).toBe(
      'fueraDeRangoDePresion',
    )
  })

  it('presión <= 0 -> fueraDeRangoDePresion (no throw: es "fuera de rango")', () => {
    expect(resolverGastoTabla01({ diametroNominal_m: 0.019, presionCalculo_m: 0 }).estado).toBe(
      'fueraDeRangoDePresion',
    )
    expect(resolverGastoTabla01({ diametroNominal_m: 0.019, presionCalculo_m: -5 }).estado).toBe(
      'fueraDeRangoDePresion',
    )
  })

  it('T8: inputs no finitos -> throw (error de programación, no estado de dominio)', () => {
    expect(() => resolverGastoTabla01({ diametroNominal_m: 0.019, presionCalculo_m: Number.NaN })).toThrow(
      /presionCalculo_m debe ser un número finito/,
    )
    expect(() =>
      resolverGastoTabla01({ diametroNominal_m: 0.019, presionCalculo_m: Number.POSITIVE_INFINITY }),
    ).toThrow(/presionCalculo_m debe ser un número finito/)
    expect(() =>
      resolverGastoTabla01({ diametroNominal_m: Number.NaN, presionCalculo_m: 10 }),
    ).toThrow(/diametroNominal_m debe ser un número finito/)
  })

  it('T9: DN13 es válido para el resolver genérico de la tabla', () => {
    const r = resolverGastoTabla01({ diametroNominal_m: 0.013, presionCalculo_m: 5 })
    expect(r).toMatchObject({ estado: 'resuelto', qConexion_lps: 0.28 })
  })

  it('tolera ruido IEEE-754 en el diámetro (19 / 1000)', () => {
    const r = resolverGastoTabla01({ diametroNominal_m: 19 / 1000, presionCalculo_m: 5 })
    expect(r).toMatchObject({ estado: 'resuelto', qConexion_lps: 0.6 })
  })
})

describe('esDiametroAdmisibleComoConexion (§2.7: DN mínimo 0,019 m)', () => {
  it('T10: DN13 NO es admisible como conexión (por debajo del mínimo)', () => {
    expect(esDiametroAdmisibleComoConexion(0.013)).toBe(false)
  })

  it('T11: DN19 es el mínimo admisible como conexión', () => {
    expect(esDiametroAdmisibleComoConexion(diametroMinimoConexion_m)).toBe(true)
    expect(esDiametroAdmisibleComoConexion(0.019)).toBe(true)
  })

  it('todos los DN >= 19 mm tabulados son admisibles', () => {
    for (const { diametroNominal_m } of columnasDeDiametroTabla01) {
      expect(esDiametroAdmisibleComoConexion(diametroNominal_m)).toBe(diametroNominal_m >= 0.019)
    }
  })

  it('un DN no tabulado (aunque sea > 19 mm) no es admisible', () => {
    expect(esDiametroAdmisibleComoConexion(0.04)).toBe(false)
  })

  it('no elige ni asume un diámetro: sólo responde admisible / no admisible', () => {
    expect(esDiametroAdmisibleComoConexion(Number.NaN)).toBe(false)
  })
})

// Goldens G5 y G6 (CASOS-GOLDEN.md): los gastos de conexión que las
// planillas oficiales Tabla N°3 y Tabla N°4 usan como entrada de §2.10.2
// se reproducen exactamente desde Tabla N°1.
describe('resolverGastoTabla01 — Goldens G5/G6 (enlace Tabla N°1 -> Tabla N°3/N°4)', () => {
  it('G5: DN 0,019 m + presión 5 m -> Qconexión 0,60 l/s (usado en Tabla N°3)', () => {
    const r = resolverGastoTabla01({ diametroNominal_m: 0.019, presionCalculo_m: 5 })
    expect(r).toMatchObject({ estado: 'resuelto', qConexion_lps: 0.6 })
    if (r.estado === 'resuelto') expect(r.interpolacion.aplicada).toBe(false)
  })

  it('G6: DN 0,025 m + presión 5 m -> Qconexión 1,18 l/s (usado en Tabla N°4)', () => {
    const r = resolverGastoTabla01({ diametroNominal_m: 0.025, presionCalculo_m: 5 })
    expect(r).toMatchObject({ estado: 'resuelto', qConexion_lps: 1.18 })
  })
})
