import { describe, it, expect } from 'vitest'
import { calcularPerdidaCargaLocalizada } from './calcularPerdidaCargaLocalizada'
import { obtenerKsDeAccesorio } from '../../../normativa/eras-2023/tabla-07-perdidas-localizadas'

describe('calcularPerdidaCargaLocalizada (ERAS-2023 §2.12.1, Js=Ks·V²/2g)', () => {
  it('llave de paso (Ks=9,18, Tabla N°7), V=1,2280474004004271 m/s -> Js≈0,7056', () => {
    const ks = obtenerKsDeAccesorio('llaveDePaso')
    expect(ks).toBe(9.18)
    expect(calcularPerdidaCargaLocalizada(ks, 1.2280474004004271)).toBeCloseTo(0.7056249660471797, 9)
  })

  it('curva a 90º (Ks=0,81), V=2 m/s -> Js≈0,1651', () => {
    expect(calcularPerdidaCargaLocalizada(0.81, 2)).toBeCloseTo(0.1651376146788991, 9)
  })

  it('codo a 90º (Ks=1,35), V=1 m/s -> Js≈0,0688', () => {
    expect(calcularPerdidaCargaLocalizada(1.35, 1)).toBeCloseTo(0.06880733944954129, 9)
  })

  it('a Ks fijo, mayor velocidad produce mayor pérdida (V² creciente)', () => {
    const jsBajo = calcularPerdidaCargaLocalizada(1, 1)
    const jsAlto = calcularPerdidaCargaLocalizada(1, 2)
    expect(jsAlto).toBeGreaterThan(jsBajo)
  })

  it('coeficienteKs <= 0: throw', () => {
    expect(() => calcularPerdidaCargaLocalizada(0, 1)).toThrow(/coeficienteKs debe ser mayor a 0/)
    expect(() => calcularPerdidaCargaLocalizada(-1, 1)).toThrow(/coeficienteKs debe ser mayor a 0/)
  })

  it('velocidad_mps <= 0: throw', () => {
    expect(() => calcularPerdidaCargaLocalizada(1, 0)).toThrow(/velocidad_mps debe ser mayor a 0/)
    expect(() => calcularPerdidaCargaLocalizada(1, -1)).toThrow(/velocidad_mps debe ser mayor a 0/)
  })
})
