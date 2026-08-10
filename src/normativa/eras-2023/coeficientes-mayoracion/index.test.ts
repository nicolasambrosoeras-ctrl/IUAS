import { describe, it, expect } from 'vitest'
import { coeficientesMayoracion, obtenerCoeficienteABase, type TipoDeProyecto } from './index'

// Correspondencia normativa TipoDeProyecto -> a (ERAS-2023 §2.9.2.2). Cada
// tipología se prueba una por una: este test debe fallar si cualquiera de
// las 12 queda asignada al coeficiente incorrecto.
const CORRESPONDENCIA_ESPERADA: ReadonlyArray<readonly [TipoDeProyecto, 1 | 2 | 3 | 4]> = [
  ['oficinaPrivada', 1],
  ['viviendaIndividual', 1],
  ['viviendaMultifamiliar', 2],
  ['oficinaPublica', 2],
  ['centroEducativo', 2],
  ['edificioPublico', 3],
  ['aeropuerto', 3],
  ['centroDeSalud', 3],
  ['centroDeDetencion', 4],
  ['centroDeportivo', 4],
  ['centroComercial', 4],
  ['terminalDePasajeros', 4],
]

describe('coeficientesMayoracion — tabla normativa', () => {
  it('contiene exactamente las 12 tipologías', () => {
    expect(coeficientesMayoracion).toHaveLength(12)
  })

  it.each(CORRESPONDENCIA_ESPERADA)('%s corresponde a a=%i', (tipoDeProyecto, aEsperado) => {
    const entrada = coeficientesMayoracion.find((candidato) => candidato.id === tipoDeProyecto)

    expect(entrada).toBeDefined()
    expect(entrada?.a).toBe(aEsperado)
  })
})

describe('obtenerCoeficienteABase', () => {
  it.each(CORRESPONDENCIA_ESPERADA)('%s -> a=%i', (tipoDeProyecto, aEsperado) => {
    expect(obtenerCoeficienteABase(tipoDeProyecto)).toBe(aEsperado)
  })

  it('lanza excepción para una tipología inexistente en la tabla', () => {
    expect(() => obtenerCoeficienteABase('inexistente' as TipoDeProyecto)).toThrow()
  })
})
