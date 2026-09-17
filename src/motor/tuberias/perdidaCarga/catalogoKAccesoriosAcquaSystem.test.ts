import { describe, it, expect } from 'vitest'
import { catalogoKAccesoriosAcquaSystem, obtenerKsAcquaSystem, tieneKAcquaSystem } from './catalogoKAccesoriosAcquaSystem'

describe('catalogoKAccesoriosAcquaSystem', () => {
  it.each([
    ['uniones', 0.25, '1'],
    ['codo90', 2.0, '3'],
    ['curva90', 2.0, '3'],
    ['curva45', 0.6, '4'],
  ] as const)('%s: K=%s (fila oficial %s), procedencia oficialFabricante', (id, ks, numero) => {
    const fila = obtenerKsAcquaSystem(id)
    expect(fila.ks).toBeCloseTo(ks, 6)
    expect(fila.itemManual).toBe(numero)
    expect(fila.procedencia).toBe('oficialFabricante')
  })

  it('teeEstimadaDistributiva: K=1,80 (fila oficial N°5), procedencia oficialFabricanteSimplificado', () => {
    const fila = obtenerKsAcquaSystem('teeEstimadaDistributiva')
    expect(fila.ks).toBeCloseTo(1.8, 6)
    expect(fila.itemManual).toBe('5')
    expect(fila.procedencia).toBe('oficialFabricanteSimplificado')
  })

  it('sobrepaso: K=1,20, procedencia equivalenciaDocumentada (nunca oficialFabricante)', () => {
    const fila = obtenerKsAcquaSystem('sobrepaso')
    expect(fila.ks).toBeCloseTo(1.2, 6)
    expect(fila.procedencia).toBe('equivalenciaDocumentada')
    expect(fila.procedencia).not.toBe('oficialFabricante')
  })

  it.each(['llaveDePaso', 'valvulaEsclusa', 'tuboSaliente'] as const)(
    '%s: sin coeficiente propio Acqua System -- procedencia fallbackNormativoERAS',
    (id) => {
      const fila = obtenerKsAcquaSystem(id)
      expect(fila.procedencia).toBe('fallbackNormativoERAS')
    },
  )

  it('correspondencias: Tee roscada central = 0,80 (fila N°9), Terminal recto roscado = 0,40 (fila N°10), Codo terminal roscado = 2,20 (fila N°11)', () => {
    expect(obtenerKsAcquaSystem('teeConRoscaCentralMetalica').ks).toBeCloseTo(0.8, 6)
    expect(obtenerKsAcquaSystem('terminalRectoRoscado').ks).toBeCloseTo(0.4, 6)
    expect(obtenerKsAcquaSystem('codoTerminalRoscado').ks).toBeCloseTo(2.2, 6)
  })

  it('curva de radio amplio (curva90) no se confunde con el codo -- comparte K por ser la MISMA pieza física (Acqua no fabrica una curva distinta), nunca por coincidencia numérica no documentada', () => {
    const curva90 = obtenerKsAcquaSystem('curva90')
    const codo90 = obtenerKsAcquaSystem('codo90')
    expect(curva90.ks).toBe(codo90.ks)
    expect(curva90.itemManual).toBe(codo90.itemManual)
    expect(curva90.ambito).toContain('Acqua System no fabrica')
  })

  it('reducciones NO tiene entrada por identidad en este catálogo -- su K depende de contexto topológico (ver resolverKsDeReduccion.ts)', () => {
    expect(tieneKAcquaSystem('reducciones')).toBe(false)
  })

  it('toda fila trae fuente no vacía y referencia al manual oficial (salvo el sobrepaso, equivalencia documentada con su propio razonamiento)', () => {
    for (const fila of catalogoKAccesoriosAcquaSystem) {
      expect(fila.fuente.length).toBeGreaterThan(0)
    }
  })

  it('obtenerKsAcquaSystem lanza para un id inexistente', () => {
    expect(() => obtenerKsAcquaSystem('inexistente' as never)).toThrow()
  })
})
