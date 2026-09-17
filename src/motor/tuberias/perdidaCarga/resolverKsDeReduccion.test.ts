import { describe, it, expect } from 'vitest'
import { resolverKsDeReduccion } from './resolverKsDeReduccion'
import { SISTEMA_DE_TUBERIA_ACQUA_SYSTEM_ID } from './resolverKsDeAccesorioDeTramo'
import { obtenerKsDeAccesorio } from '../../../normativa/eras-2023/tabla-07-perdidas-localizadas'

const SISTEMA_NO_ACQUA = 'sistema-generico-no-acqua'

describe('resolverKsDeReduccion', () => {
  it('sistema NO Acqua System: siempre Tabla N°7 (0,75), sin importar el salto de diámetro -- comportamiento idéntico al de antes de este slice', () => {
    const resultado = resolverKsDeReduccion(SISTEMA_NO_ACQUA, '32 mm', '20 mm')
    expect(resultado).toEqual({ resultado: 'calculado', ks: obtenerKsDeAccesorio('reducciones'), catalogo: 'eras2023TablaN7', fuente: expect.any(String) })
  })

  it.each([
    ['25 mm', '20 mm', 0.55],
    ['32 mm', '25 mm', 0.55],
    ['32 mm', '20 mm', 0.85],
    ['50 mm', '40 mm', 0.55],
    ['50 mm', '32 mm', 0.85],
  ] as const)('Acqua System %s -> %s: K=%s', (dnPropio, dnAguasArriba, ksEsperado) => {
    const resultado = resolverKsDeReduccion(SISTEMA_DE_TUBERIA_ACQUA_SYSTEM_ID, dnPropio, dnAguasArriba)
    expect(resultado.resultado).toBe('calculado')
    if (resultado.resultado !== 'calculado') return
    expect(resultado.ks).toBeCloseTo(ksEsperado, 6)
    expect(resultado.catalogo).toBe('acquaSystem')
  })

  it('Acqua System, mismo DN: K=0 (no existe reducción, no es un dato faltante)', () => {
    const resultado = resolverKsDeReduccion(SISTEMA_DE_TUBERIA_ACQUA_SYSTEM_ID, '25 mm', '25 mm')
    expect(resultado).toEqual({ resultado: 'calculado', ks: 0, catalogo: 'acquaSystem', fuente: expect.any(String) })
  })

  it('Acqua System sin DN aguas arriba (sin Tramo padre): noClasificable, nunca un valor por defecto inventado', () => {
    const resultado = resolverKsDeReduccion(SISTEMA_DE_TUBERIA_ACQUA_SYSTEM_ID, '25 mm', undefined)
    expect(resultado).toEqual({ resultado: 'noClasificable' })
  })

  it('Acqua System con DN fuera de la serie nominal: noClasificable', () => {
    const resultado = resolverKsDeReduccion(SISTEMA_DE_TUBERIA_ACQUA_SYSTEM_ID, '17 mm', '20 mm')
    expect(resultado).toEqual({ resultado: 'noClasificable' })
  })
})
