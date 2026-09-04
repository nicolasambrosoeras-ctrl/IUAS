import { describe, it, expect } from 'vitest'
import { tabla07PerdidasLocalizadas, obtenerKsDeAccesorio, type IdAccesorioTabla07 } from './index'

// Correspondencia normativa accesorio -> Ks (ERAS-2023 §2.12.1, Tabla N°7).
const CORRESPONDENCIA_ESPERADA: ReadonlyArray<readonly [IdAccesorioTabla07, number]> = [
  ['griferias', 9.18],
  ['curva45', 0.43],
  ['curva90', 0.81],
  ['codo90', 1.35],
  ['teePasoRecto', 1.0],
  ['teeSalidaLateral', 1.62],
  ['teeEntradaCentralSalidasLaterales', 3.0],
  ['llaveDePaso', 9.18],
  ['uniones', 0.1],
  ['valvulaEsclusa', 0.17],
  ['reducciones', 0.75],
  ['tuboSaliente', 1.0],
]

describe('tabla07PerdidasLocalizadas — tabla normativa', () => {
  it('contiene exactamente los 12 accesorios de Tabla N°7', () => {
    expect(tabla07PerdidasLocalizadas).toHaveLength(12)
  })

  it.each(CORRESPONDENCIA_ESPERADA)('%s corresponde a Ks=%f', (id, ksEsperado) => {
    const entrada = tabla07PerdidasLocalizadas.find((candidata) => candidata.id === id)

    expect(entrada).toBeDefined()
    expect(entrada?.ks).toBe(ksEsperado)
  })
})

describe('obtenerKsDeAccesorio', () => {
  it.each(CORRESPONDENCIA_ESPERADA)('%s -> Ks=%f', (id, ksEsperado) => {
    expect(obtenerKsDeAccesorio(id)).toBe(ksEsperado)
  })
})
