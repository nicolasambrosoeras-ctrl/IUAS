// GEOM-UX-01 (D-δ.86) §23 — jerarquía de cotas hidráulicas heredadas:
// UF (cota de piso) -> Local (override de piso, o hereda) -> Artefacto
// (override de altura, o Tabla IUAS) -> cota hidráulica efectiva DERIVADA.
import { describe, it, expect } from 'vitest'
import type { Artefacto, Local, Nivel } from '../../../modelo/proyecto'
import {
  resolverCotaPisoDeLocal,
  resolverAlturaHidraulicaDeArtefacto,
  resolverCotaHidraulicaEfectivaDeArtefacto,
} from './resolverCotaHidraulicaDeArtefacto'

const uf = (cotaHidraulicaReferencia_m?: number): Pick<Nivel, 'cotaHidraulicaReferencia_m'> => ({
  ...(cotaHidraulicaReferencia_m !== undefined ? { cotaHidraulicaReferencia_m } : {}),
})
const local = (cotaPiso_m?: number): Pick<Local, 'cotaPiso_m'> => ({
  ...(cotaPiso_m !== undefined ? { cotaPiso_m } : {}),
})
const art = (
  artefactoId: string,
  alturaHidraulicaSobrePiso_m?: number,
): Pick<Artefacto, 'artefactoId' | 'alturaHidraulicaSobrePiso_m'> => ({
  artefactoId,
  ...(alturaHidraulicaSobrePiso_m !== undefined ? { alturaHidraulicaSobrePiso_m } : {}),
})

describe('resolverCotaPisoDeLocal (herencia UF -> Local)', () => {
  it('Local sin override hereda la cota de piso de la UF', () => {
    expect(resolverCotaPisoDeLocal(uf(9), local())).toBe(9)
  })

  it('Local con override deja de seguir a la UF y usa su cota propia', () => {
    expect(resolverCotaPisoDeLocal(uf(9), local(9.5))).toBe(9.5)
  })

  it('restablecer el Local (borrar el override) vuelve a heredar la UF', () => {
    const personalizado = local(9.5)
    expect(resolverCotaPisoDeLocal(uf(9), personalizado)).toBe(9.5)
    const restablecido = local() // sin cotaPiso_m
    expect(resolverCotaPisoDeLocal(uf(9), restablecido)).toBe(9)
  })

  it('UF sin cota y Local sin override -> undefined (ausencia nunca es 0)', () => {
    expect(resolverCotaPisoDeLocal(uf(undefined), local())).toBeUndefined()
  })

  it('override 0 del Local es un valor válido y explícito (no equivale a ausencia)', () => {
    expect(resolverCotaPisoDeLocal(uf(9), local(0))).toBe(0)
  })
})

describe('resolverAlturaHidraulicaDeArtefacto (override -> Tabla IUAS)', () => {
  it('sin override usa la altura de referencia IUAS del tipo -- ducha 2,00', () => {
    expect(resolverAlturaHidraulicaDeArtefacto(art('receptaculoDucha'))).toBe(2.0)
  })

  it('sin override -- lavatorio 0,90 (default de la Tabla IUAS)', () => {
    expect(resolverAlturaHidraulicaDeArtefacto(art('lavatorio'))).toBe(0.9)
  })

  it('con override usa el valor del proyectista -- ducha personalizada a 2,15', () => {
    expect(resolverAlturaHidraulicaDeArtefacto(art('receptaculoDucha', 2.15))).toBe(2.15)
  })

  it('restablecer el artefacto (borrar el override) vuelve al default IUAS del tipo', () => {
    expect(resolverAlturaHidraulicaDeArtefacto(art('receptaculoDucha', 2.15))).toBe(2.15)
    expect(resolverAlturaHidraulicaDeArtefacto(art('receptaculoDucha'))).toBe(2.0)
  })

  it('tipo desconocido sin override -> undefined (nunca un default silencioso)', () => {
    expect(resolverAlturaHidraulicaDeArtefacto(art('noExisteEnCatalogo'))).toBeUndefined()
  })
})

describe('resolverCotaHidraulicaEfectivaDeArtefacto (piso efectivo + altura efectiva)', () => {
  it('UF +9,00 · Local hereda · lavatorio default 0,90 -> efectiva 9,90', () => {
    expect(resolverCotaHidraulicaEfectivaDeArtefacto(uf(9), local(), art('lavatorio'))).toBeCloseTo(9.9, 10)
  })

  it('cambiar la UF a +10,00 (Local sin override) -> lavatorio efectiva 10,90', () => {
    expect(resolverCotaHidraulicaEfectivaDeArtefacto(uf(10), local(), art('lavatorio'))).toBeCloseTo(10.9, 10)
  })

  it('Local override +9,50 -> lavatorio efectiva 10,40 (deja de seguir a la UF)', () => {
    expect(resolverCotaHidraulicaEfectivaDeArtefacto(uf(9), local(9.5), art('lavatorio'))).toBeCloseTo(10.4, 10)
  })

  it('restablecer el Local -> vuelve a heredar la UF (efectiva 9,90 otra vez)', () => {
    expect(resolverCotaHidraulicaEfectivaDeArtefacto(uf(9), local(9.5), art('lavatorio'))).toBeCloseTo(10.4, 10)
    expect(resolverCotaHidraulicaEfectivaDeArtefacto(uf(9), local(), art('lavatorio'))).toBeCloseTo(9.9, 10)
  })

  it('ducha default: UF +9,00 · Local hereda -> efectiva 11,00', () => {
    expect(resolverCotaHidraulicaEfectivaDeArtefacto(uf(9), local(), art('receptaculoDucha'))).toBeCloseTo(11, 10)
  })

  it('ducha override 2,15 -> efectiva 11,15 (usa 2,15, no 2,00)', () => {
    expect(resolverCotaHidraulicaEfectivaDeArtefacto(uf(9), local(), art('receptaculoDucha', 2.15))).toBeCloseTo(11.15, 10)
  })

  it('restablecer el artefacto -> vuelve a 2,00 (efectiva 11,00)', () => {
    expect(resolverCotaHidraulicaEfectivaDeArtefacto(uf(9), local(), art('receptaculoDucha', 2.15))).toBeCloseTo(11.15, 10)
    expect(resolverCotaHidraulicaEfectivaDeArtefacto(uf(9), local(), art('receptaculoDucha'))).toBeCloseTo(11, 10)
  })

  it('cambio de tipo con override viejo eliminado: ducha 2,15 -> bidet sin override -> default IUAS 0,40 (efectiva 9,40)', () => {
    // El caller (UI) borra alturaHidraulicaSobrePiso_m al cambiar el tipo;
    // acá se modela ese estado ya limpio: bidet sin override.
    expect(resolverCotaHidraulicaEfectivaDeArtefacto(uf(9), local(), art('bidet'))).toBeCloseTo(9.4, 10)
  })

  it('herencia viva: la efectiva NO se materializa -- cambiar la UF re-deriva todos los hijos sin editarlos', () => {
    const localHeredado = local()
    const lavatorio = art('lavatorio')
    const ducha = art('receptaculoDucha')
    // UF +9,00
    expect(resolverCotaHidraulicaEfectivaDeArtefacto(uf(9), localHeredado, lavatorio)).toBeCloseTo(9.9, 10)
    expect(resolverCotaHidraulicaEfectivaDeArtefacto(uf(9), localHeredado, ducha)).toBeCloseTo(11, 10)
    // UF -> +10,00: los mismos objetos (sin overrides) se re-derivan solos
    expect(resolverCotaHidraulicaEfectivaDeArtefacto(uf(10), localHeredado, lavatorio)).toBeCloseTo(10.9, 10)
    expect(resolverCotaHidraulicaEfectivaDeArtefacto(uf(10), localHeredado, ducha)).toBeCloseTo(12, 10)
  })

  it('falta la cota de piso (UF y Local sin cota) -> undefined, aunque la altura resuelva', () => {
    expect(resolverCotaHidraulicaEfectivaDeArtefacto(uf(undefined), local(), art('lavatorio'))).toBeUndefined()
  })

  it('falta la altura (tipo desconocido sin override) -> undefined, aunque el piso resuelva', () => {
    expect(resolverCotaHidraulicaEfectivaDeArtefacto(uf(9), local(), art('noExiste'))).toBeUndefined()
  })
})
