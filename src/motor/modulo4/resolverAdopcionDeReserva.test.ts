import { describe, it, expect } from 'vitest'
import { resolverAdopcionDeReserva } from './resolverAdopcionDeReserva'

describe('resolverAdopcionDeReserva — directa', () => {
  it('devuelve noAplica e ignora cualquier volumen', () => {
    expect(
      resolverAdopcionDeReserva({
        esquema: 'directa',
        volumenReservaRequerido_m3: 5,
        volumenTanqueElevadoAdoptado_m3: 3,
        volumenTanqueBombeoAdoptado_m3: 2,
      }),
    ).toEqual({ tipo: 'noAplica' })
  })
})

describe('resolverAdopcionDeReserva — tanqueElevado (un solo tanque)', () => {
  it('T1: adoptado ausente -> sinAdopcion', () => {
    expect(
      resolverAdopcionDeReserva({ esquema: 'tanqueElevado', volumenReservaRequerido_m3: 1 }),
    ).toEqual({ tipo: 'sinAdopcion', volumenRequerido_m3: 1 })
  })

  it('T2: adoptado 0,9 < requerido 1 -> insuficiente, diferencia −0,1', () => {
    const r = resolverAdopcionDeReserva({
      esquema: 'tanqueElevado',
      volumenReservaRequerido_m3: 1,
      volumenTanqueElevadoAdoptado_m3: 0.9,
    })
    expect(r).toMatchObject({ tipo: 'verificada', estado: 'insuficiente', volumenAdoptado_m3: 0.9 })
    if (r.tipo === 'verificada') expect(r.diferencia_m3).toBeCloseTo(-0.1, 12)
  })

  it('T3: adoptado 1 = requerido 1 -> suficiente, diferencia 0', () => {
    const r = resolverAdopcionDeReserva({
      esquema: 'tanqueElevado',
      volumenReservaRequerido_m3: 1,
      volumenTanqueElevadoAdoptado_m3: 1,
    })
    expect(r).toMatchObject({ tipo: 'verificada', estado: 'suficiente', diferencia_m3: 0 })
  })

  it('T4: adoptado 2 > requerido 1 -> suficiente, sin penalizar sobredimensionamiento', () => {
    const r = resolverAdopcionDeReserva({
      esquema: 'tanqueElevado',
      volumenReservaRequerido_m3: 1,
      volumenTanqueElevadoAdoptado_m3: 2,
    })
    expect(r).toMatchObject({ tipo: 'verificada', estado: 'suficiente', diferencia_m3: 1 })
  })

  it('T5: requerido 0 y adoptado 0 -> suficiente RESPECTO DE LA RTD (no afirma "tanque no requerido")', () => {
    const r = resolverAdopcionDeReserva({
      esquema: 'tanqueElevado',
      volumenReservaRequerido_m3: 0,
      volumenTanqueElevadoAdoptado_m3: 0,
    })
    expect(r).toEqual({
      tipo: 'verificada',
      volumenRequerido_m3: 0,
      volumenAdoptado_m3: 0,
      diferencia_m3: 0,
      estado: 'suficiente',
    })
  })

  it('el volumen de tanque de bombeo se ignora en tanqueElevado', () => {
    const r = resolverAdopcionDeReserva({
      esquema: 'tanqueElevado',
      volumenReservaRequerido_m3: 1,
      volumenTanqueElevadoAdoptado_m3: 1,
      volumenTanqueBombeoAdoptado_m3: 999,
    })
    expect(r.tipo).toBe('verificada')
    expect(r).not.toHaveProperty('totalAdoptado_m3')
  })
})

describe('resolverAdopcionDeReserva — cisternaBombeoElevado (dos tanques, §2.11.3)', () => {
  it('C1: faltan ambos -> adopcionIncompleta, señala ambos', () => {
    expect(
      resolverAdopcionDeReserva({ esquema: 'cisternaBombeoElevado', volumenReservaRequerido_m3: 3 }),
    ).toEqual({
      tipo: 'adopcionIncompleta',
      volumenRequerido_m3: 3,
      faltaTanqueBombeo: true,
      faltaTanqueElevado: true,
    })
  })

  it('C2: falta sólo el inferior -> identifica el inferior', () => {
    const r = resolverAdopcionDeReserva({
      esquema: 'cisternaBombeoElevado',
      volumenReservaRequerido_m3: 3,
      volumenTanqueElevadoAdoptado_m3: 2,
    })
    expect(r).toEqual({
      tipo: 'adopcionIncompleta',
      volumenRequerido_m3: 3,
      faltaTanqueBombeo: true,
      faltaTanqueElevado: false,
    })
  })

  it('C3: falta sólo el superior -> identifica el superior', () => {
    const r = resolverAdopcionDeReserva({
      esquema: 'cisternaBombeoElevado',
      volumenReservaRequerido_m3: 3,
      volumenTanqueBombeoAdoptado_m3: 1,
    })
    expect(r).toMatchObject({ tipo: 'adopcionIncompleta', faltaTanqueBombeo: false, faltaTanqueElevado: true })
  })

  it('C4: total suficiente pero inferior < 1/3 VRTD -> global insuficiente', () => {
    const r = resolverAdopcionDeReserva({
      esquema: 'cisternaBombeoElevado',
      volumenReservaRequerido_m3: 3,
      volumenTanqueBombeoAdoptado_m3: 0.5,
      volumenTanqueElevadoAdoptado_m3: 2.5,
    })
    expect(r).toMatchObject({
      tipo: 'verificadaDistribuida',
      minimoPorTanque_m3: 1,
      totalAdoptado_m3: 3,
      tanqueBombeoCumpleMinimo: false,
      tanqueElevadoCumpleMinimo: true,
      totalCumple: true,
      estado: 'insuficiente',
    })
  })

  it('C5: ambos >= 1/3 VRTD pero total < VRTD -> global insuficiente', () => {
    const r = resolverAdopcionDeReserva({
      esquema: 'cisternaBombeoElevado',
      volumenReservaRequerido_m3: 3,
      volumenTanqueBombeoAdoptado_m3: 1,
      volumenTanqueElevadoAdoptado_m3: 1,
    })
    expect(r).toMatchObject({
      tipo: 'verificadaDistribuida',
      tanqueBombeoCumpleMinimo: true,
      tanqueElevadoCumpleMinimo: true,
      totalCumple: false,
      estado: 'insuficiente',
    })
  })

  it('C6: 1 + 2 = 3 exacto -> suficiente', () => {
    const r = resolverAdopcionDeReserva({
      esquema: 'cisternaBombeoElevado',
      volumenReservaRequerido_m3: 3,
      volumenTanqueBombeoAdoptado_m3: 1,
      volumenTanqueElevadoAdoptado_m3: 2,
    })
    expect(r).toMatchObject({ tipo: 'verificadaDistribuida', estado: 'suficiente', totalCumple: true })
  })

  it('C7: 2 + 1 = 3 exacto -> suficiente', () => {
    const r = resolverAdopcionDeReserva({
      esquema: 'cisternaBombeoElevado',
      volumenReservaRequerido_m3: 3,
      volumenTanqueBombeoAdoptado_m3: 2,
      volumenTanqueElevadoAdoptado_m3: 1,
    })
    expect(r).toMatchObject({ tipo: 'verificadaDistribuida', estado: 'suficiente' })
  })

  it('C8: 2 + 3 sobredimensionado -> suficiente, sin exigir suma exacta', () => {
    const r = resolverAdopcionDeReserva({
      esquema: 'cisternaBombeoElevado',
      volumenReservaRequerido_m3: 3,
      volumenTanqueBombeoAdoptado_m3: 2,
      volumenTanqueElevadoAdoptado_m3: 3,
    })
    expect(r).toMatchObject({ tipo: 'verificadaDistribuida', estado: 'suficiente', totalAdoptado_m3: 5 })
  })

  it('C9: inferior 1 m³ (25% del total adoptado) sigue cumpliendo -- se mide contra VRTD, NO contra el total', () => {
    const r = resolverAdopcionDeReserva({
      esquema: 'cisternaBombeoElevado',
      volumenReservaRequerido_m3: 3,
      volumenTanqueBombeoAdoptado_m3: 1,
      volumenTanqueElevadoAdoptado_m3: 3,
    })
    expect(r).toMatchObject({
      tipo: 'verificadaDistribuida',
      tanqueBombeoCumpleMinimo: true, // 1 >= 3/3, aunque 1/(1+3) = 25%
      estado: 'suficiente',
    })
  })

  it('VRTD = 0: mínimos y total triviales satisfechos, sin afirmar "tanque no requerido"', () => {
    const r = resolverAdopcionDeReserva({
      esquema: 'cisternaBombeoElevado',
      volumenReservaRequerido_m3: 0,
      volumenTanqueBombeoAdoptado_m3: 0,
      volumenTanqueElevadoAdoptado_m3: 0,
    })
    expect(r).toMatchObject({
      tipo: 'verificadaDistribuida',
      minimoPorTanque_m3: 0,
      tanqueBombeoCumpleMinimo: true,
      tanqueElevadoCumpleMinimo: true,
      totalCumple: true,
      estado: 'suficiente',
    })
  })
})
