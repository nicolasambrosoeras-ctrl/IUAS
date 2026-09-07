import { describe, it, expect } from 'vitest'
import { seleccionarMedidorGeneral } from './seleccionarMedidorGeneral'
import { calcularPerdidaCargaMedidor } from '../tuberias/perdidaCarga/calcularPerdidaCargaMedidor'
import { tabla06Medidores } from '../../normativa/eras-2023/tabla-06-medidores'
import { resolverMedidorAdoptado } from './resolverMedidorAdoptado'

// Recomendado de referencia: Qc = 2,5 m³/h -> DN19, C=5 (Tabla N°6).
const nucleo = (() => {
  const r = seleccionarMedidorGeneral(2.5 / 3.6)
  if (r.tipo !== 'seleccionado') throw new Error('fixture')
  return r
})()
const filaDN = (dn: number) => tabla06Medidores.find((f) => f.dnMedidor_mm === dn)!

describe('resolverMedidorAdoptado (D-δ.57)', () => {
  it('D2-1. sin override: adoptado = recomendado, origen automatico, criterio satisface', () => {
    const m = resolverMedidorAdoptado(nucleo, undefined)
    expect(m.adoptado.origen).toBe('automatico')
    expect(m.adoptado.criterioSeleccion).toBe('satisface')
    expect(m.adoptado.dnMedidor_mm).toBe(nucleo.dnMedidor_mm) // 19
    expect(m.adoptado.capacidadMaxima_m3h).toBe(nucleo.capacidadMaxima_m3h) // 5
    expect(m.adoptado.hfMedidor_mca).toBe(nucleo.hfMedidor_mca)
    expect(m.recomendado.dnMedidor_mm).toBe(19)
  })

  it('D2-3+D2-4. subir a DN25: C y hf pasan a los de ESA fila (hidráulicamente efectivo)', () => {
    const m = resolverMedidorAdoptado(nucleo, 25)
    expect(m.adoptado.origen).toBe('manual')
    expect(m.adoptado.dnMedidor_mm).toBe(25)
    expect(m.adoptado.capacidadMaxima_m3h).toBe(7) // C de DN25, no de DN19
    expect(m.adoptado.hfMedidor_mca).toBe(calcularPerdidaCargaMedidor(nucleo.qcl_lpm, 7))
    expect(m.adoptado.hfMedidor_mca).toBeLessThan(m.recomendado.hfMedidor_mca) // medidor mayor -> menos pérdida
    expect(m.adoptado.criterioSeleccion).toBe('satisface') // 3,5 m³/h >= 2,5
  })

  it('D2-5. el caudal de diseño NO cambia con la adopción', () => {
    const auto = resolverMedidorAdoptado(nucleo, undefined)
    const sube = resolverMedidorAdoptado(nucleo, 32)
    const baja = resolverMedidorAdoptado(nucleo, 15)
    expect(sube.qcDiseno_lps).toBe(auto.qcDiseno_lps)
    expect(baja.qcDiseno_lps).toBe(auto.qcDiseno_lps)
    expect(sube.qcl_lpm).toBe(auto.qcl_lpm)
    expect(baja.qcDiseno_m3h).toBe(auto.qcDiseno_m3h)
  })

  it('D2-7. bajar por debajo del recomendado: criterio inferiorAlRecomendado, hf se sigue calculando', () => {
    const m = resolverMedidorAdoptado(nucleo, 15) // umbral 1,5 m³/h < 2,5
    expect(m.adoptado.origen).toBe('manual')
    expect(m.adoptado.criterioSeleccion).toBe('inferiorAlRecomendado')
    expect(m.adoptado.capacidadMaxima_m3h).toBe(3)
    expect(m.adoptado.hfMedidor_mca).toBe(calcularPerdidaCargaMedidor(nucleo.qcl_lpm, 3))
    expect(m.adoptado.hfMedidor_mca).toBeGreaterThan(m.recomendado.hfMedidor_mca)
  })

  it('D2-12. anti-stale: DN, C, caudal medio, umbral y hf del adoptado son TODOS de la misma fila de Tabla N°6', () => {
    for (const dn of [15, 19, 25, 32, 38, 50, 60, 75]) {
      const m = resolverMedidorAdoptado(nucleo, dn)
      const fila = filaDN(dn)
      expect(m.adoptado.dnMedidor_mm).toBe(fila.dnMedidor_mm)
      expect(m.adoptado.capacidadMaxima_m3h).toBe(fila.capacidadMaxima_m3h)
      expect(m.adoptado.caudalMedio_m3h).toBe(fila.caudalMedio_m3h)
      expect(m.adoptado.qcProyectoTabla_m3h).toBe(fila.qcProyecto_m3h)
      expect(m.adoptado.hfMedidor_mca).toBe(calcularPerdidaCargaMedidor(nucleo.qcl_lpm, fila.capacidadMaxima_m3h))
    }
  })

  it('D2-6. adoptar el mismo DN que el recomendado: valores idénticos (origen manual, pero "Auto" lo limpia en la UI)', () => {
    const m = resolverMedidorAdoptado(nucleo, 19)
    expect(m.adoptado.dnMedidor_mm).toBe(19)
    expect(m.adoptado.hfMedidor_mca).toBe(m.recomendado.hfMedidor_mca)
    expect(m.adoptado.origen).toBe('manual')
  })

  it('DN adoptado que no existe en Tabla N°6 (dato corrupto): vuelve a automático, no lanza', () => {
    const m = resolverMedidorAdoptado(nucleo, 999)
    expect(m.adoptado.origen).toBe('automatico')
    expect(m.adoptado.dnMedidor_mm).toBe(19)
  })
})
