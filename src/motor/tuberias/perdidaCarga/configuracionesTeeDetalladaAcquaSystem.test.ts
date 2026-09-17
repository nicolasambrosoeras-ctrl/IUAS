import { describe, it, expect } from 'vitest'
import { configuracionesTeeDetalladaAcquaSystem, obtenerConfiguracionTeeDetallada } from './configuracionesTeeDetalladaAcquaSystem'

describe('configuracionesTeeDetalladaAcquaSystem', () => {
  it('las 8 configuraciones oficiales (N°5 a 8a) están disponibles: 4 pares normal/reducida', () => {
    expect(configuracionesTeeDetalladaAcquaSystem.length).toBe(4)
  })

  it.each([
    ['distribucionDesdeExtremo', 'extremo A', 'extremo B + ramal', 1.8, 3.6, '5', '5a'],
    ['convergenciaHaciaExtremo', 'extremo A + ramal', 'extremo B', 1.3, 2.6, '6', '6a'],
    ['convergenciaHaciaRamal', 'extremos A + B', 'ramal', 4.2, 9.0, '7', '7a'],
    ['distribucionDesdeRamal', 'ramal', 'extremos A + B', 2.2, 5.0, '8', '8a'],
  ] as const)('%s: entradas=%s, salidas=%s, normal=%s, reducida=%s', (id, entradas, salidas, ksNormal, ksReducida, filaNormal, filaReducida) => {
    const configuracion = obtenerConfiguracionTeeDetallada(id)
    expect(configuracion.entradas).toBe(entradas)
    expect(configuracion.salidas).toBe(salidas)
    expect(configuracion.ksNormal).toBeCloseTo(ksNormal, 6)
    expect(configuracion.ksReducida).toBeCloseTo(ksReducida, 6)
    expect(configuracion.filaOficialNormal).toBe(filaNormal)
    expect(configuracion.filaOficialReducida).toBe(filaReducida)
  })

  it('una tee reducida detallada no suma además una reducción por el mismo cambio de sección -- los valores ya incluyen el efecto de la reducción de sección (ítems 5a/6a/7a/8a son piezas íntegras, no tee+buje)', () => {
    for (const configuracion of configuracionesTeeDetalladaAcquaSystem) {
      // La reducida siempre es mayor que la normal (incorpora el cambio
      // de sección dentro de la misma pieza) -- confirma que son valores
      // publicados independientes, no una composición aditiva que un
      // consumidor pudiera "completar" sumando un buje aparte.
      expect(configuracion.ksReducida).toBeGreaterThan(configuracion.ksNormal)
    }
  })

  it('obtenerConfiguracionTeeDetallada lanza para un id inexistente', () => {
    expect(() => obtenerConfiguracionTeeDetallada('inexistente' as never)).toThrow()
  })
})
