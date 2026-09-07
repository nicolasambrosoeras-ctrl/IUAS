import { describe, it, expect } from 'vitest'
import { seleccionarMedidorGeneral } from './seleccionarMedidorGeneral'
import { calcularPerdidaCargaMedidor } from '../tuberias/perdidaCarga/calcularPerdidaCargaMedidor'

describe('seleccionarMedidorGeneral (M3-B1, ámbito general, ERAS-2023 §2.12 / Tabla N°6)', () => {
  it('Qc = 2,5 m3/h (0,694 l/s) selecciona DN19 con C=5 m3/h — emparejamiento de Tabla N°6, no del ejemplo oficial (CRIT-A32)', () => {
    const resultado = seleccionarMedidorGeneral(2.5 / 3.6)

    expect(resultado.tipo).toBe('seleccionado')
    if (resultado.tipo !== 'seleccionado') return
    expect(resultado.ambito).toBe('general')
    expect(resultado.dnMedidor_mm).toBe(19)
    // La fila DN19 de Tabla N°6 tiene C=5, NO C=7 (C=7 es DN25). El motor
    // toma C de la fila seleccionada — nunca el emparejamiento del ejemplo.
    expect(resultado.capacidadMaxima_m3h).toBe(5)
    expect(resultado.caudalMedio_m3h).toBe(3.75)
    expect(resultado.qcProyectoTabla_m3h).toBe(2.5)
  })

  it('reutiliza la primitiva calcularPerdidaCargaMedidor con C de la fila seleccionada (fórmula (6), CRIT-A25)', () => {
    const resultado = seleccionarMedidorGeneral(2.5 / 3.6)
    if (resultado.tipo !== 'seleccionado') throw new Error('esperaba seleccionado')

    expect(resultado.hfMedidor_mca).toBe(calcularPerdidaCargaMedidor(resultado.qcl_lpm, resultado.capacidadMaxima_m3h))
    // 0,036 · ( (2,5/3,6·60) / 5 )² ≈ 0,036 · (41,667/5)² ≈ 2,5 m.c.a.
    expect(resultado.hfMedidor_mca).toBeCloseTo(2.5, 2)
  })

  it('un Qc apenas superior al umbral de una fila salta al DN siguiente (no interpola)', () => {
    // 2,6 m3/h supera el umbral tabulado de DN19 (2,5) -> DN25 (C=7).
    const resultado = seleccionarMedidorGeneral(2.6 / 3.6)
    if (resultado.tipo !== 'seleccionado') throw new Error('esperaba seleccionado')
    expect(resultado.dnMedidor_mm).toBe(25)
    expect(resultado.capacidadMaxima_m3h).toBe(7)
  })

  it('Qc pequeño cae en la primera fila (DN15)', () => {
    const resultado = seleccionarMedidorGeneral(0.2) // 0,72 m3/h
    if (resultado.tipo !== 'seleccionado') throw new Error('esperaba seleccionado')
    expect(resultado.dnMedidor_mm).toBe(15)
    expect(resultado.capacidadMaxima_m3h).toBe(3)
  })

  it('Qc exactamente en el tope de la tabla (40 m3/h) sigue seleccionando DN75, no cae fuera por redondeo', () => {
    const resultado = seleccionarMedidorGeneral(40 / 3.6)
    expect(resultado.tipo).toBe('seleccionado')
    if (resultado.tipo !== 'seleccionado') return
    expect(resultado.dnMedidor_mm).toBe(75)
    expect(resultado.capacidadMaxima_m3h).toBe(80)
  })

  it('Qc por encima del dominio de Tabla N°6 (> 40 m3/h): fueraDeTabla06, sin extrapolar ni calcular hf', () => {
    const resultado = seleccionarMedidorGeneral(12) // 43,2 m3/h

    expect(resultado.tipo).toBe('fueraDeTabla06')
    if (resultado.tipo !== 'fueraDeTabla06') return
    expect(resultado.ambito).toBe('general')
    expect(resultado.qcDiseno_m3h).toBeCloseTo(43.2, 6)
    expect(resultado.qcMaximoCubierto_m3h).toBe(40)
    expect(resultado).not.toHaveProperty('hfMedidor_mca')
  })

  it('expone el Qc de diseño en ambas unidades para la memoria de cálculo', () => {
    const resultado = seleccionarMedidorGeneral(1)
    if (resultado.tipo !== 'seleccionado') throw new Error('esperaba seleccionado')
    expect(resultado.qcDiseno_lps).toBe(1)
    expect(resultado.qcDiseno_m3h).toBeCloseTo(3.6, 9)
    expect(resultado.qcl_lpm).toBeCloseTo(60, 9)
    // 3,6 m3/h: DN25 (umbral 3,5) NO alcanza; primera fila >= 3,6 es DN32.
    expect(resultado.dnMedidor_mm).toBe(32)
  })

  it('caudal de diseño <= 0 o no finito: throw (precondición imposible tras el motor de demanda)', () => {
    expect(() => seleccionarMedidorGeneral(0)).toThrow(/qcDiseno_lps debe ser un número mayor a 0/)
    expect(() => seleccionarMedidorGeneral(-0.5)).toThrow(/qcDiseno_lps debe ser un número mayor a 0/)
    expect(() => seleccionarMedidorGeneral(Number.POSITIVE_INFINITY)).toThrow(/qcDiseno_lps debe ser un número mayor a 0/)
    expect(() => seleccionarMedidorGeneral(Number.NaN)).toThrow(/qcDiseno_lps debe ser un número mayor a 0/)
  })
})
