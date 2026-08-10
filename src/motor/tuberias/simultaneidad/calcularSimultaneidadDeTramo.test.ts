// La API no recibe Proyecto, TipoDeProyecto, catalogo, artefactos ni
// aportes -- solo AgregacionDeDemanda (n, qmax_lps) y aEfectivo ya
// resuelto. Esa independencia de contexto queda demostrada por la propia
// firma usada en cada test: ningun caso construye nada mas que eso.
import { describe, it, expect } from 'vitest'
import type { AgregacionDeDemanda } from '../agregacion/agregarAportesDeDemanda'
import { calcularSimultaneidadDeTramo } from './calcularSimultaneidadDeTramo'

describe('calcularSimultaneidadDeTramo — n=1 (CRIT-A4)', () => {
  const agregacion: AgregacionDeDemanda = { n: 1, qmax_lps: 0.35 }

  it('qc = qmax_lps, kc y k indeterminados', () => {
    const resultado = calcularSimultaneidadDeTramo(agregacion, 1)

    expect(resultado.qc_lps).toBe(0.35)
    expect('estado' in resultado.kc && resultado.kc.estado).toBe('indeterminado')
    expect('estado' in resultado.k && resultado.k.estado).toBe('indeterminado')
  })

  it('aEfectivo no altera qc: mismo qmax_lps con aEfectivo=1 y aEfectivo=4 da el mismo qc', () => {
    const conA1 = calcularSimultaneidadDeTramo(agregacion, 1)
    const conA4 = calcularSimultaneidadDeTramo(agregacion, 4)

    expect(conA1.qc_lps).toBe(agregacion.qmax_lps)
    expect(conA4.qc_lps).toBe(agregacion.qmax_lps)
  })
})

describe('calcularSimultaneidadDeTramo — n>=2', () => {
  it('n=2, a=1: Kc=1, K=1, Qc=Qmax', () => {
    const resultado = calcularSimultaneidadDeTramo({ n: 2, qmax_lps: 4 }, 1)

    if ('estado' in resultado.kc || 'estado' in resultado.k) {
      throw new Error('se esperaba Kc y K numéricos, no indeterminados')
    }
    expect(resultado.kc.valor).toBe(1)
    expect(resultado.k.valor).toBe(1)
    expect(resultado.qc_lps).toBe(4)
  })

  it('n=2, a=2: K=2, Qc=2×Qmax, sin cap (K>1 se conserva)', () => {
    const resultado = calcularSimultaneidadDeTramo({ n: 2, qmax_lps: 4 }, 2)

    if ('estado' in resultado.kc || 'estado' in resultado.k) {
      throw new Error('se esperaba Kc y K numéricos, no indeterminados')
    }
    expect(resultado.kc.valor).toBe(1)
    expect(resultado.k.valor).toBe(2)
    expect(resultado.qc_lps).toBe(8)
  })

  it('n=3: Kc = 1/raíz(2) y Qc = Qmax × Kc × aEfectivo', () => {
    const resultado = calcularSimultaneidadDeTramo({ n: 3, qmax_lps: 10 }, 2)

    if ('estado' in resultado.kc || 'estado' in resultado.k) {
      throw new Error('se esperaba Kc y K numéricos, no indeterminados')
    }
    expect(resultado.kc.valor).toBeCloseTo(1 / Math.sqrt(2), 10)
    expect(resultado.k.valor).toBeCloseTo((1 / Math.sqrt(2)) * 2, 10)
    expect(resultado.qc_lps).toBeCloseTo(10 * (1 / Math.sqrt(2)) * 2, 10)
  })

  it('n=6, a=3: composición correcta con n mayor', () => {
    const resultado = calcularSimultaneidadDeTramo({ n: 6, qmax_lps: 5 }, 3)

    if ('estado' in resultado.kc || 'estado' in resultado.k) {
      throw new Error('se esperaba Kc y K numéricos, no indeterminados')
    }
    const kcEsperado = 1 / Math.sqrt(5)
    expect(resultado.kc.valor).toBeCloseTo(kcEsperado, 10)
    expect(resultado.k.valor).toBeCloseTo(kcEsperado * 3, 10)
    expect(resultado.qc_lps).toBeCloseTo(5 * kcEsperado * 3, 10)
  })

  it('no redondea: preserva precisión de punto flotante', () => {
    const resultado = calcularSimultaneidadDeTramo({ n: 4, qmax_lps: 0.1 + 0.2 }, 1)

    if ('estado' in resultado.kc) {
      throw new Error('se esperaba Kc numérico, no indeterminado')
    }
    expect(resultado.kc.valor).toBeCloseTo(0.5774, 4)
    expect(resultado.qc_lps).not.toBe(0.3 * resultado.kc.valor)
    expect(resultado.qc_lps).toBeCloseTo(0.3 * resultado.kc.valor, 10)
  })
})

describe('calcularSimultaneidadDeTramo — n=0', () => {
  it('lanza excepción (misma precondición que calcularCoeficienteDeSimultaneidad)', () => {
    expect(() => calcularSimultaneidadDeTramo({ n: 0, qmax_lps: 0 }, 1)).toThrow()
  })
})

describe('calcularSimultaneidadDeTramo — no mutación', () => {
  it('no modifica la AgregacionDeDemanda recibida', () => {
    const agregacion: AgregacionDeDemanda = { n: 3, qmax_lps: 2.5 }
    const copia = { ...agregacion }

    calcularSimultaneidadDeTramo(agregacion, 2)

    expect(agregacion).toEqual(copia)
  })
})
