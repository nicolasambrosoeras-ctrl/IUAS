import { describe, it, expect } from 'vitest'
import { elegirElementoActivoTrasCambio } from './estadoDeElementoActivo'

describe('elegirElementoActivoTrasCambio -- UI-M2-GROUP-01 §7/§8/§15/§32', () => {
  it('sin cambios: conserva el activo actual', () => {
    expect(elegirElementoActivoTrasCambio(['a', 'b'], ['a', 'b'], 'a')).toBe('a')
  })

  it('agregar un elemento nuevo al final: el nuevo queda activo (§8, alta de UF/montante)', () => {
    expect(elegirElementoActivoTrasCambio(['a', 'b'], ['a', 'b', 'c'], 'a')).toBe('c')
  })

  it('duplicar (el nuevo se inserta en cualquier posición): igual el nuevo queda activo', () => {
    expect(elegirElementoActivoTrasCambio(['a', 'b'], ['a', 'nuevo', 'b'], 'a')).toBe('nuevo')
  })

  it('sin activo previo y sin cambios de ids: se autocorrige al primero de la lista (convención determinística, §29)', () => {
    expect(elegirElementoActivoTrasCambio(['a', 'b'], ['a', 'b'], undefined)).toBe('a')
  })

  it('eliminar un elemento que NO es el activo: el activo se mantiene', () => {
    expect(elegirElementoActivoTrasCambio(['a', 'b', 'c'], ['a', 'c'], 'c')).toBe('c')
  })

  it('eliminar el elemento activo: elige el que ocupaba su misma posición (§32, "siguiente")', () => {
    // b (índice 1) se elimina; en la posición 1 ahora queda "c".
    expect(elegirElementoActivoTrasCambio(['a', 'b', 'c'], ['a', 'c'], 'b')).toBe('c')
  })

  it('eliminar el elemento activo que era el último: cae al que queda en esa posición (anterior, §32)', () => {
    // c (índice 2, último) se elimina; ya no hay posición 2 -> usa el último disponible.
    expect(elegirElementoActivoTrasCambio(['a', 'b', 'c'], ['a', 'b'], 'c')).toBe('b')
  })

  it('se elimina la última UF/montante restante: no hay activo (transición a 0/1 elemento)', () => {
    expect(elegirElementoActivoTrasCambio(['a'], [], 'a')).toBe(undefined)
  })

  it('lista vacía sin cambios: sigue sin activo', () => {
    expect(elegirElementoActivoTrasCambio([], [], undefined)).toBe(undefined)
  })

  it('caso borde: activo apuntaba a un id que ya no existe y no hubo alta detectada -- se autocorrige de forma determinística', () => {
    // "x" nunca estuvo en idsAnteriores (estado corrupto/externo) -- no es
    // "nuevo" (no aparece en idsActuales), así que cae al criterio de
    // reposición determinística.
    expect(elegirElementoActivoTrasCambio(['a', 'b'], ['a', 'b'], 'x')).toBe('b')
  })
})
