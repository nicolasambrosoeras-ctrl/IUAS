import { describe, it, expect } from 'vitest'
import {
  calcularReservaDiaria,
  LPS_A_M3H,
  TC_MIN_H,
  TC_MAX_H,
} from './calcularReservaDiaria'

describe('calcularReservaDiaria (ERAS-2023 §2.10.2, CRIT-A35)', () => {
  it('déficit positivo: Dc = Qc − Qconexión, volumen = Dc[m³/h] · Tc', () => {
    const r = calcularReservaDiaria({ qc_lps: 1, qConexion_lps: 0.4, tc_h: 3 })
    expect(r.deficit_lps).toBeCloseTo(0.6, 10)
    expect(r.deficit_m3h).toBeCloseTo(0.6 * LPS_A_M3H, 10)
    expect(r.volumenReservaDiseno_m3).toBeCloseTo(0.6 * 3.6 * 3, 10)
  })

  it('pasa a través Qc, Qconexión y Tc sin alterarlos', () => {
    const r = calcularReservaDiaria({ qc_lps: 2.345, qConexion_lps: 1.111, tc_h: 2.5 })
    expect(r.qc_lps).toBe(2.345)
    expect(r.qConexion_lps).toBe(1.111)
    expect(r.tc_h).toBe(2.5)
  })

  it('Qconexión >= Qc: déficit 0 y volumen 0, sin error (resultado determinado)', () => {
    const igual = calcularReservaDiaria({ qc_lps: 0.8, qConexion_lps: 0.8, tc_h: 4 })
    expect(igual.deficit_lps).toBe(0)
    expect(igual.deficit_m3h).toBe(0)
    expect(igual.volumenReservaDiseno_m3).toBe(0)

    const sobra = calcularReservaDiaria({ qc_lps: 0.5, qConexion_lps: 2, tc_h: 1 })
    expect(sobra.deficit_lps).toBe(0)
    expect(sobra.volumenReservaDiseno_m3).toBe(0)
  })

  it('no redondea internamente: opera con el Qc exacto recibido', () => {
    // Qc exacto del caso G2 (√2/2). Con redondeo previo a 0,71 el volumen
    // daría 0,792 m³; sin redondear da 0,7712 m³ (valor publicado 0,77).
    const qcExacto = 0.7071067811865476
    const r = calcularReservaDiaria({ qc_lps: qcExacto, qConexion_lps: 0.6, tc_h: 2 })
    expect(r.volumenReservaDiseno_m3).toBeCloseTo((qcExacto - 0.6) * 3.6 * 2, 12)
    expect(r.volumenReservaDiseno_m3).not.toBeCloseTo(0.792, 3)
  })

  it('Tc en los extremos admitidos (1 h y 4 h) es válido', () => {
    expect(() => calcularReservaDiaria({ qc_lps: 1, qConexion_lps: 0, tc_h: TC_MIN_H })).not.toThrow()
    expect(() => calcularReservaDiaria({ qc_lps: 1, qConexion_lps: 0, tc_h: TC_MAX_H })).not.toThrow()
  })

  it('Tc fuera de [1, 4] h: throw', () => {
    expect(() => calcularReservaDiaria({ qc_lps: 1, qConexion_lps: 0, tc_h: 0.5 })).toThrow(
      /tc_h debe estar entre 1 y 4 horas/,
    )
    expect(() => calcularReservaDiaria({ qc_lps: 1, qConexion_lps: 0, tc_h: 5 })).toThrow(
      /tc_h debe estar entre 1 y 4 horas/,
    )
    expect(() => calcularReservaDiaria({ qc_lps: 1, qConexion_lps: 0, tc_h: Number.NaN })).toThrow(
      /tc_h debe estar entre 1 y 4 horas/,
    )
  })

  it('qc_lps negativo o no finito: throw', () => {
    expect(() => calcularReservaDiaria({ qc_lps: -0.1, qConexion_lps: 0, tc_h: 2 })).toThrow(
      /qc_lps debe ser un número finito >= 0/,
    )
    expect(() => calcularReservaDiaria({ qc_lps: Number.POSITIVE_INFINITY, qConexion_lps: 0, tc_h: 2 })).toThrow(
      /qc_lps debe ser un número finito >= 0/,
    )
  })

  it('qConexion_lps negativo o no finito: throw', () => {
    expect(() => calcularReservaDiaria({ qc_lps: 1, qConexion_lps: -1, tc_h: 2 })).toThrow(
      /qConexion_lps debe ser un número finito >= 0/,
    )
    expect(() => calcularReservaDiaria({ qc_lps: 1, qConexion_lps: Number.NaN, tc_h: 2 })).toThrow(
      /qConexion_lps debe ser un número finito >= 0/,
    )
  })

  it('qc_lps = 0 es válido (déficit 0)', () => {
    const r = calcularReservaDiaria({ qc_lps: 0, qConexion_lps: 0, tc_h: 2 })
    expect(r.deficit_lps).toBe(0)
    expect(r.volumenReservaDiseno_m3).toBe(0)
  })

  it('mayor Tc con el mismo déficit produce mayor volumen', () => {
    const corto = calcularReservaDiaria({ qc_lps: 1.5, qConexion_lps: 0.5, tc_h: 1 })
    const largo = calcularReservaDiaria({ qc_lps: 1.5, qConexion_lps: 0.5, tc_h: 4 })
    expect(largo.volumenReservaDiseno_m3).toBeCloseTo(corto.volumenReservaDiseno_m3 * 4, 10)
  })
})
