// Casos de prueba de calcularCoeficienteDeSimultaneidad. El caso n=4
// esta anclado al ejemplo resuelto de la Guia (Arquitectura Sec.14.2,
// Tabla N4): Kc = 0,5774 sin redondear. Convenciones Sec.10: ninguna
// formula entra al motor sin un caso tomado de la guia o calculado a mano.
import { describe, it, expect } from 'vitest'
import { calcularCoeficienteDeSimultaneidad } from './calcularCoeficienteDeSimultaneidad'

describe('calcularCoeficienteDeSimultaneidad', () => {
  it('para n=4 devuelve Kc = 0,5774 (Tabla N4, sin redondear)', () => {
    const { resultado, paso } = calcularCoeficienteDeSimultaneidad(4)

    if (!('valor' in resultado)) {
      throw new Error('se esperaba un resultado numerico, no indeterminado')
    }
    expect(resultado.valor).toBeCloseTo(0.5774, 4)
    expect(resultado.unidad).toBe('adimensional')

    expect(paso.formulaId).toBe('ERAS-2023 §2.9.2.2')
    expect(paso.entradas).toEqual([
      {
        simbolo: 'n',
        valor: 4,
        // 'conteo', no 'adimensional': n es un conteo de artefactos, no
        // un coeficiente. Corregido en Paso 5 al verificar el PDF real
        // (n se mostraba como "4,00", con decimales que no corresponden
        // a una cantidad discreta).
        unidad: 'conteo',
        procedencia: 'conteo de artefactos computables',
      },
    ])
    expect(paso.salida.resultado).toBe(resultado)
  })

  it('para n=1 devuelve el estado indeterminado explicito (D25)', () => {
    const { resultado, paso } = calcularCoeficienteDeSimultaneidad(1)

    if (!('estado' in resultado)) {
      throw new Error('se esperaba el estado indeterminado')
    }
    expect(resultado.estado).toBe('indeterminado')
    expect(resultado.motivo.length).toBeGreaterThan(0)
    expect(paso.salida.resultado).toBe(resultado)
  })

  it('rechaza n no entero o menor a 1 (invariante rota, no estado del dominio)', () => {
    expect(() => calcularCoeficienteDeSimultaneidad(0)).toThrow()
    expect(() => calcularCoeficienteDeSimultaneidad(-1)).toThrow()
    expect(() => calcularCoeficienteDeSimultaneidad(2.5)).toThrow()
  })
})
