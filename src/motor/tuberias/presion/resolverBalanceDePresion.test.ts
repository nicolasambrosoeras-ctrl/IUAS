import { describe, it, expect } from 'vitest'
import { resolverBalanceDePresion, type CoberturaDePerdidaLocalizada } from './resolverBalanceDePresion'

const HF_LOCALIZADA_COMPLETA_0_5: CoberturaDePerdidaLocalizada = { tipo: 'completa', hf_mca: 0.5 }
const HF_LOCALIZADA_AUSENTE: CoberturaDePerdidaLocalizada = { tipo: 'ausente' }

describe('resolverBalanceDePresion — barrera de completitud', () => {
  it('hfLocalizada ausente -> incompleto, nunca trata la ausencia como 0', () => {
    const resultado = resolverBalanceDePresion(
      20,
      3,
      { hfDistribuida_mca: 2, hfLocalizada: HF_LOCALIZADA_AUSENTE, hfMedidor_mca: 1 },
      0.6,
    )

    expect(resultado).toEqual({ tipo: 'incompleto', terminosFaltantes: ['hfLocalizada'] })
  })

  it('hfLocalizada parcial (p.ej. solo subconjunto CRIT-A28) -> sigue incompleto: un valor util no equivale a cobertura completa', () => {
    const resultado = resolverBalanceDePresion(
      20,
      3,
      { hfDistribuida_mca: 2, hfLocalizada: { tipo: 'parcial', hf_mca: 0.3 }, hfMedidor_mca: 1 },
      0.6,
    )

    expect(resultado).toEqual({ tipo: 'incompleto', terminosFaltantes: ['hfLocalizada'] })
  })

  it('falta hfMedidor_mca (medidor sin modelar) -> incompleto', () => {
    const resultado = resolverBalanceDePresion(
      20,
      3,
      { hfDistribuida_mca: 2, hfLocalizada: HF_LOCALIZADA_COMPLETA_0_5, hfMedidor_mca: undefined },
      0.6,
    )

    expect(resultado).toEqual({ tipo: 'incompleto', terminosFaltantes: ['hfMedidor'] })
  })

  it('faltan ambos -> incompleto, lista los dos', () => {
    const resultado = resolverBalanceDePresion(
      20,
      3,
      { hfDistribuida_mca: 2, hfLocalizada: HF_LOCALIZADA_AUSENTE, hfMedidor_mca: undefined },
      0.6,
    )

    expect(resultado).toEqual({ tipo: 'incompleto', terminosFaltantes: ['hfLocalizada', 'hfMedidor'] })
  })

  it('hfLocalizada parcial + hfMedidor SI provisto -> sigue incompleto (auditoria M2-C): suministrar el medidor no hace aparecer prematuramente balanceCompleto mientras Tabla N°7 no este cubierta por completo', () => {
    const resultado = resolverBalanceDePresion(
      20,
      3,
      { hfDistribuida_mca: 2, hfLocalizada: { tipo: 'parcial', hf_mca: 0.3 }, hfMedidor_mca: 1.3 },
      0.6,
    )

    expect(resultado).toEqual({ tipo: 'incompleto', terminosFaltantes: ['hfLocalizada'] })
  })

  it('hfLocalizada estimada (D-delta.40) + hfMedidor -> completo: "estimado" NO es sinonimo de "parcial", es otra metodologia completa dentro de si misma', () => {
    const resultado = resolverBalanceDePresion(
      20,
      3,
      { hfDistribuida_mca: 2, hfLocalizada: { tipo: 'estimada', hf_mca: 0.3 }, hfMedidor_mca: 1.3 },
      0.6,
    )

    expect(resultado.tipo).toBe('completo')
  })
})

describe('resolverBalanceDePresion — balance completo', () => {
  it('todos los términos presentes (hfLocalizada completa), cumple el mínimo: Presidual=12,791446683479947 m.c.a. >= Pmin=6 m.c.a.', () => {
    const resultado = resolverBalanceDePresion(
      20,
      3,
      { hfDistribuida_mca: 2.4085533165200532, hfLocalizada: { tipo: 'completa', hf_mca: 0.5 }, hfMedidor_mca: 1.3 },
      0.6,
    )

    if (resultado.tipo !== 'completo') {
      throw new Error('se esperaba completo')
    }
    expect(resultado.presionResidual_mca).toBeCloseTo(12.791446683479947, 9)
    expect(resultado.presionMinimaRequerida_mca).toBe(6)
    expect(resultado.cumpleMinimo).toBe(true)
  })

  it('todos los términos presentes con hfLocalizada ESTIMADA (D-delta.40): mismo Presidual que con completa a igual hf_mca -- el motor no distingue el origen metodologico del numero, solo su presencia', () => {
    const resultado = resolverBalanceDePresion(
      20,
      3,
      { hfDistribuida_mca: 2.4085533165200532, hfLocalizada: { tipo: 'estimada', hf_mca: 0.5 }, hfMedidor_mca: 1.3 },
      0.6,
    )

    if (resultado.tipo !== 'completo') {
      throw new Error('se esperaba completo')
    }
    expect(resultado.presionResidual_mca).toBeCloseTo(12.791446683479947, 9)
  })

  it('conversión kg/cm² -> m.c.a.: Pmin=1,5 kg/cm² (inodoroValvula) equivale a 15 m.c.a.', () => {
    const resultado = resolverBalanceDePresion(
      20,
      0,
      { hfDistribuida_mca: 1, hfLocalizada: { tipo: 'completa', hf_mca: 0 }, hfMedidor_mca: 0 },
      1.5,
    )

    if (resultado.tipo !== 'completo') {
      throw new Error('se esperaba completo')
    }
    expect(resultado.presionMinimaRequerida_mca).toBe(15)
  })

  it('no cumple el mínimo: Presidual negativo, Pmin=6 m.c.a. -> cumpleMinimo=false', () => {
    const resultado = resolverBalanceDePresion(
      5,
      3,
      { hfDistribuida_mca: 2, hfLocalizada: { tipo: 'completa', hf_mca: 0.5 }, hfMedidor_mca: 1 },
      0.6,
    )

    if (resultado.tipo !== 'completo') {
      throw new Error('se esperaba completo')
    }
    expect(resultado.presionResidual_mca).toBeCloseTo(-1.5, 9)
    expect(resultado.cumpleMinimo).toBe(false)
  })

  it('desnivel negativo (descenso) aporta carga en vez de consumirla', () => {
    const conAscenso = resolverBalanceDePresion(
      20,
      3,
      { hfDistribuida_mca: 1, hfLocalizada: { tipo: 'completa', hf_mca: 0 }, hfMedidor_mca: 0 },
      0.6,
    )
    const conDescenso = resolverBalanceDePresion(
      20,
      -3,
      { hfDistribuida_mca: 1, hfLocalizada: { tipo: 'completa', hf_mca: 0 }, hfMedidor_mca: 0 },
      0.6,
    )

    if (conAscenso.tipo !== 'completo' || conDescenso.tipo !== 'completo') {
      throw new Error('se esperaba completo en ambos')
    }
    expect(conDescenso.presionResidual_mca).toBeGreaterThan(conAscenso.presionResidual_mca)
    expect(conAscenso.presionResidual_mca).toBeCloseTo(16, 9)
    expect(conDescenso.presionResidual_mca).toBeCloseTo(22, 9)
  })
})

describe('resolverBalanceDePresion — validaciones', () => {
  it('presionMinimaRequerida_kgcm2 <= 0: throw', () => {
    expect(() =>
      resolverBalanceDePresion(
        20,
        0,
        { hfDistribuida_mca: 1, hfLocalizada: { tipo: 'completa', hf_mca: 0 }, hfMedidor_mca: 0 },
        0,
      ),
    ).toThrow(/presionMinimaRequerida_kgcm2 debe ser mayor a 0/)
  })

  it('hfDistribuida_mca negativa: throw', () => {
    expect(() =>
      resolverBalanceDePresion(
        20,
        0,
        { hfDistribuida_mca: -1, hfLocalizada: { tipo: 'completa', hf_mca: 0 }, hfMedidor_mca: 0 },
        0.6,
      ),
    ).toThrow(/hfDistribuida_mca no puede ser negativa/)
  })
})
