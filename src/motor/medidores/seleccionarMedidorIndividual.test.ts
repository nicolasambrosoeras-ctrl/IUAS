import { describe, it, expect } from 'vitest'
import {
  seleccionarMedidorIndividual,
  type AlcanceMedidorIndividual,
  type ConsumoDeAlcance,
} from './seleccionarMedidorIndividual'
import { seleccionarFilaTabla06PorCaudal } from '../../normativa/eras-2023/tabla-06-medidores'
import { calcularPerdidaCargaMedidor } from '../tuberias/perdidaCarga/calcularPerdidaCargaMedidor'
import { calcularCoeficienteDeSimultaneidad } from '../demanda/simultaneidad/calcularCoeficienteDeSimultaneidad'

function alcance(consumos: readonly ConsumoDeAlcance[], parcial?: Partial<AlcanceMedidorIndividual>): AlcanceMedidorIndividual {
  return {
    unidadFuncionalId: 'uf-1',
    servicioMedido: 'aguaFria',
    consumos,
    ...parcial,
  }
}

const c = (etiqueta: string, cantidad: number, qu_lps: number): ConsumoDeAlcance => ({ etiqueta, cantidad, qu_lps })

describe('seleccionarMedidorIndividual (M3-B2a, alcance declarado, simultaneidad total K=1 — CRIT-A33)', () => {
  it('1+2. Qunit = Σ cantidad·qu exacta, sin Kc/K/a (simultaneidad total)', () => {
    const r = seleccionarMedidorIndividual(
      alcance([c('lavatorio', 3, 0.08), c('bañera', 1, 0.12), c('pileta cocina', 2, 0.2)]),
    )
    // 3·0,08 + 1·0,12 + 2·0,20 = 0,24 + 0,12 + 0,40 = 0,76 l/s, sumado tal cual.
    expect(r.qunitTotal_lps).toBeCloseTo(0.76, 10)
    expect(r.nConsumos).toBe(6)
    expect(r.ambito).toBe('individual')
    expect(r.servicioMedido).toBe('aguaFria')
    expect(r.unidadFuncionalId).toBe('uf-1')
  })

  it('3+4. la selección sale de Tabla N°6 y C es el de la MISMA fila', () => {
    const r = seleccionarMedidorIndividual(alcance([c('varios', 1, 1.2)])) // 1,2 l/s = 4,32 m3/h
    if (r.tipo !== 'seleccionado') throw new Error('esperaba seleccionado')

    const fila = seleccionarFilaTabla06PorCaudal(r.qunitTotal_lps * 3.6)
    if (fila === 'fueraDeTabla06') throw new Error('fixture mal elegida')
    expect(r.dnMedidor_mm).toBe(fila.dnMedidor_mm)
    expect(r.capacidadMaxima_m3h).toBe(fila.capacidadMaxima_m3h)
    expect(r.caudalMedio_m3h).toBe(fila.caudalMedio_m3h)
    expect(r.qcProyectoTabla_m3h).toBe(fila.qcProyecto_m3h)
    // 4,32 m3/h -> primera fila con Qc_tabla >= 4,32 es DN32 (5), no DN25 (3,5).
    expect(r.dnMedidor_mm).toBe(32)
  })

  it('5. hf usa el MISMO Qunit como Qcl (fórmula (6), CRIT-A25)', () => {
    const r = seleccionarMedidorIndividual(alcance([c('a', 2, 0.3), c('b', 1, 0.2)])) // 0,8 l/s
    if (r.tipo !== 'seleccionado') throw new Error('esperaba seleccionado')

    expect(r.qcl_lpm).toBeCloseTo(r.qunitTotal_lps * 60, 10)
    expect(r.hfMedidor_mca).toBe(calcularPerdidaCargaMedidor(r.qunitTotal_lps * 60, r.capacidadMaxima_m3h))
  })

  it('6. un Qunit que ×3,6 cae exactamente en un umbral tabulado selecciona esa fila (no la siguiente)', () => {
    // 4 · (2,5/3,6) = 10/3,6 l/s -> ×3,6 = 10 m3/h exacto -> DN38 (umbral 10).
    const r = seleccionarMedidorIndividual(alcance([c('x', 4, 2.5 / 3.6)]))
    if (r.tipo !== 'seleccionado') throw new Error('esperaba seleccionado')
    expect(r.qcDiseno_m3h).toBeCloseTo(10, 9)
    expect(r.dnMedidor_mm).toBe(38)
    expect(r.capacidadMaxima_m3h).toBe(20)
  })

  it('7. Qunit por encima del dominio de Tabla N°6 (> 40 m3/h): fueraDeTabla06, sin extrapolar', () => {
    const r = seleccionarMedidorIndividual(alcance([c('mucho', 12, 1)])) // 12 l/s = 43,2 m3/h
    expect(r.tipo).toBe('fueraDeTabla06')
    if (r.tipo !== 'fueraDeTabla06') return
    expect(r.qunitTotal_lps).toBe(12)
    expect(r.qcMaximoCubierto_m3h).toBe(40)
    expect(r).not.toHaveProperty('hfMedidor_mca')
  })

  it('8. cambiar la cantidad/artefactos del alcance cambia Qunit y la selección', () => {
    const chico = seleccionarMedidorIndividual(alcance([c('lav', 2, 0.08)])) // 0,16 l/s -> 0,576 m3/h -> DN15
    const grande = seleccionarMedidorIndividual(alcance([c('lav', 2, 0.08), c('duchas', 10, 0.18)])) // +1,8 -> 1,96 l/s -> 7,056 m3/h -> DN38
    if (chico.tipo !== 'seleccionado' || grande.tipo !== 'seleccionado') throw new Error('esperaba seleccionado')

    expect(grande.qunitTotal_lps).toBeGreaterThan(chico.qunitTotal_lps)
    expect(grande.dnMedidor_mm).toBeGreaterThan(chico.dnMedidor_mm)
    expect(chico.dnMedidor_mm).toBe(15)
    expect(grande.dnMedidor_mm).toBe(38)
  })

  it('9. Qunit (K=1) ≠ Qc simultaneado (K<1): el medidor individual usa Qunit', () => {
    // 5 consumos de 0,10 l/s. K=1 -> Qunit = 0,50 l/s (1,8 m3/h -> DN19).
    const r = seleccionarMedidorIndividual(alcance([c('art', 5, 0.1)]))
    if (r.tipo !== 'seleccionado') throw new Error('esperaba seleccionado')
    expect(r.qunitTotal_lps).toBeCloseTo(0.5, 10)

    // Qc con simultaneidad estadística: Kc(5) = 1/√(5-1) = 0,5; con a=1
    // daría Qc ≈ 0,25 l/s (0,9 m3/h -> DN15). El motor NO usa ese valor.
    const { resultado: kc } = calcularCoeficienteDeSimultaneidad(5)
    if ('estado' in kc) throw new Error('Kc debería ser numérico para n=5')
    const qcSimultaneado_lps = 0.5 * kc.valor
    expect(qcSimultaneado_lps).toBeCloseTo(0.25, 10)
    expect(r.qunitTotal_lps).not.toBeCloseTo(qcSimultaneado_lps, 3)

    expect(r.dnMedidor_mm).toBe(19) // el de Qunit=0,5 l/s, no el de 0,25 l/s (DN15)
    expect(seleccionarFilaTabla06PorCaudal(qcSimultaneado_lps * 3.6)).not.toBe('fueraDeTabla06')
    expect((seleccionarFilaTabla06PorCaudal(qcSimultaneado_lps * 3.6) as { dnMedidor_mm: number }).dnMedidor_mm).toBe(15)
  })

  it('10. no hay cardinalidad de medidores por UF: el motor evalúa el alcance declarado y nada más', () => {
    // Dos llamadas independientes para la misma UF (p. ej. AF y AC) — el
    // motor no las relaciona ni impone "1 AF + 1 AC".
    const af = seleccionarMedidorIndividual(alcance([c('lav', 1, 0.08)], { servicioMedido: 'aguaFria' }))
    const ac = seleccionarMedidorIndividual(alcance([c('lav', 1, 0.12)], { servicioMedido: 'aguaCaliente' }))
    expect(af.servicioMedido).toBe('aguaFria')
    expect(ac.servicioMedido).toBe('aguaCaliente')
    expect(af.unidadFuncionalId).toBe(ac.unidadFuncionalId)
  })

  it('alcance sin consumos con caudal (vacío o todo 0): sinConsumo, no error', () => {
    const vacio = seleccionarMedidorIndividual(alcance([]))
    expect(vacio.tipo).toBe('sinConsumo')
    expect(vacio.qunitTotal_lps).toBe(0)
    expect(vacio.nConsumos).toBe(0)

    const todoCero = seleccionarMedidorIndividual(alcance([c('inodoro válvula en rama AC', 1, 0)]))
    expect(todoCero.tipo).toBe('sinConsumo')
    expect(todoCero.nConsumos).toBe(1)
  })

  it('cantidad no entera / <= 0: throw (precondición imposible)', () => {
    expect(() => seleccionarMedidorIndividual(alcance([c('x', 0, 0.1)]))).toThrow(/cantidad inválida/)
    expect(() => seleccionarMedidorIndividual(alcance([c('x', 1.5, 0.1)]))).toThrow(/cantidad inválida/)
    expect(() => seleccionarMedidorIndividual(alcance([c('x', -2, 0.1)]))).toThrow(/cantidad inválida/)
  })

  it('qu_lps negativo o no finito: throw (precondición imposible)', () => {
    expect(() => seleccionarMedidorIndividual(alcance([c('x', 1, -0.1)]))).toThrow(/qu_lps inválido/)
    expect(() => seleccionarMedidorIndividual(alcance([c('x', 1, Number.NaN)]))).toThrow(/qu_lps inválido/)
  })
})
