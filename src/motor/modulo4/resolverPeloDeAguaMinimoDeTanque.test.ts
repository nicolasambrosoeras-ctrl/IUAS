// CRIT-A39 (D-δ.79): pelo de agua mínimo efectivo del modo Rápido para el
// esquema 'tanqueElevado' simple. Golden: los valores esperados se derivan
// a mano de `desnivelConexion_m − 0,50`, sin invocar el propio helper.
import { describe, it, expect } from 'vitest'
import {
  HOLGURA_PELO_DE_AGUA_MINIMO_RAPIDO_M,
  resolverPeloDeAguaMinimoEfectivo,
} from './resolverPeloDeAguaMinimoDeTanque'

describe('resolverPeloDeAguaMinimoEfectivo (CRIT-A39)', () => {
  it('la holgura de la hipótesis del modo Rápido es 0,50 m', () => {
    expect(HOLGURA_PELO_DE_AGUA_MINIMO_RAPIDO_M).toBe(0.5)
  })

  it('Rápido + tanque elevado + alimentación 10 m → pelo efectivo 9,5 m', () => {
    const resultado = resolverPeloDeAguaMinimoEfectivo({
      esquema: 'tanqueElevado',
      granularidad: 'simplificada',
      desnivelConexion_m: 10,
    })
    expect(resultado).toEqual({
      tipo: 'derivadoRapido',
      cota_m: 9.5,
      desnivelAlimentacionTanque_m: 10,
    })
  })

  it('Rápido + tanque elevado + alimentación 12 m → pelo efectivo 11,5 m', () => {
    const resultado = resolverPeloDeAguaMinimoEfectivo({
      esquema: 'tanqueElevado',
      granularidad: 'simplificada',
      desnivelConexion_m: 12,
    })
    expect(resultado.tipo).toBe('derivadoRapido')
    if (resultado.tipo === 'derivadoRapido') {
      expect(resultado.cota_m).toBe(11.5)
      expect(resultado.desnivelAlimentacionTanque_m).toBe(12)
    }
  })

  it('Rápido + tanque elevado sin desnivel de alimentación → incompletoRapido (nunca 0)', () => {
    const resultado = resolverPeloDeAguaMinimoEfectivo({
      esquema: 'tanqueElevado',
      granularidad: 'simplificada',
      desnivelConexion_m: undefined,
    })
    expect(resultado).toEqual({ tipo: 'incompletoRapido' })
  })

  it('Profesional + tanque elevado → manual (usa el dato declarado, sin derivar)', () => {
    const resultado = resolverPeloDeAguaMinimoEfectivo({
      esquema: 'tanqueElevado',
      granularidad: 'profesional',
      // aun con el desnivel disponible, Profesional NO deriva.
      desnivelConexion_m: 10,
    })
    expect(resultado).toEqual({ tipo: 'manual' })
  })

  it('cambio de modo: el modo es lo único que cambia el tipo de resultado (el dato manual vive aparte, en Nodo.cota_m)', () => {
    const entradaComun = { esquema: 'tanqueElevado', desnivelConexion_m: 10 } as const
    expect(resolverPeloDeAguaMinimoEfectivo({ ...entradaComun, granularidad: 'simplificada' })).toEqual({
      tipo: 'derivadoRapido',
      cota_m: 9.5,
      desnivelAlimentacionTanque_m: 10,
    })
    expect(resolverPeloDeAguaMinimoEfectivo({ ...entradaComun, granularidad: 'profesional' })).toEqual({
      tipo: 'manual',
    })
  })

  it('esquema "directa" → noAplica (Pdisponible = Pacera, contrato histórico)', () => {
    expect(
      resolverPeloDeAguaMinimoEfectivo({ esquema: 'directa', granularidad: 'simplificada', desnivelConexion_m: 10 }),
    ).toEqual({ tipo: 'noAplica' })
  })

  it('esquema "cisternaBombeoElevado" → noAplica (no comparte la relación geométrica; sigue el dato manual)', () => {
    expect(
      resolverPeloDeAguaMinimoEfectivo({
        esquema: 'cisternaBombeoElevado',
        granularidad: 'simplificada',
        desnivelConexion_m: 10,
      }),
    ).toEqual({ tipo: 'noAplica' })
  })

  it('esquema ausente → noAplica', () => {
    expect(
      resolverPeloDeAguaMinimoEfectivo({ esquema: undefined, granularidad: 'simplificada', desnivelConexion_m: 10 }),
    ).toEqual({ tipo: 'noAplica' })
  })

  it('no aplica clamp: desnivel de alimentación bajo la acera → pelo aún más negativo', () => {
    const resultado = resolverPeloDeAguaMinimoEfectivo({
      esquema: 'tanqueElevado',
      granularidad: 'simplificada',
      desnivelConexion_m: -1,
    })
    expect(resultado.tipo).toBe('derivadoRapido')
    if (resultado.tipo === 'derivadoRapido') {
      expect(resultado.cota_m).toBe(-1.5)
    }
  })

  it('precisión interna completa: no redondea el resultado', () => {
    const resultado = resolverPeloDeAguaMinimoEfectivo({
      esquema: 'tanqueElevado',
      granularidad: 'simplificada',
      desnivelConexion_m: 10.123456789,
    })
    expect(resultado.tipo).toBe('derivadoRapido')
    if (resultado.tipo === 'derivadoRapido') {
      expect(resultado.cota_m).toBeCloseTo(9.623456789, 9)
    }
  })

  it('no muta ni persiste: es una función pura sobre datos escalares', () => {
    const entrada = { esquema: 'tanqueElevado', granularidad: 'simplificada', desnivelConexion_m: 10 } as const
    const copia = { ...entrada }
    resolverPeloDeAguaMinimoEfectivo(entrada)
    expect(entrada).toEqual(copia)
  })
})
