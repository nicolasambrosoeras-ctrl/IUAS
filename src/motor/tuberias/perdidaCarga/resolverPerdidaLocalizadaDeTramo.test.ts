import { describe, it, expect } from 'vitest'
import type { AccesorioDeTramo } from '../../../modelo/redHidraulica'
import { obtenerKsDeAccesorio } from '../../../normativa/eras-2023/tabla-07-perdidas-localizadas'
import { calcularPerdidaCargaLocalizada } from './calcularPerdidaCargaLocalizada'
import { resolverPerdidaLocalizadaDeTramo } from './resolverPerdidaLocalizadaDeTramo'

function accesorio(tipo: AccesorioDeTramo['tipo'], cantidad: number): AccesorioDeTramo {
  return { tipo, cantidad }
}

describe('resolverPerdidaLocalizadaDeTramo', () => {
  it('accesorios undefined -> sinRelevar (no relevado, nunca hf_m=0)', () => {
    const resultado = resolverPerdidaLocalizadaDeTramo(undefined, 1.5)
    expect(resultado).toEqual({ tipo: 'sinRelevar' })
  })

  it('accesorios=[] -> calculada con ksTotal=0 y hf_m=0 (cero real, relevado sin accesorios)', () => {
    const resultado = resolverPerdidaLocalizadaDeTramo([], 1.5)
    expect(resultado).toEqual({ tipo: 'calculada', ksTotal: 0, hf_m: 0 })
  })

  it('un accesorio con Ks conocido: reutiliza CRIT-A26/Tabla N°7 sin reimplementar la fórmula', () => {
    const resultado = resolverPerdidaLocalizadaDeTramo([accesorio('codo90', 1)], 2)

    const ksEsperado = obtenerKsDeAccesorio('codo90')
    expect(resultado).toEqual({
      tipo: 'calculada',
      ksTotal: ksEsperado,
      hf_m: calcularPerdidaCargaLocalizada(ksEsperado, 2),
    })
  })

  it('suma de varios accesorios distintos: Ks_total = Σ Ks_tipo', () => {
    const resultado = resolverPerdidaLocalizadaDeTramo(
      [accesorio('codo90', 1), accesorio('llaveDePaso', 1), accesorio('uniones', 1)],
      1.8,
    )

    const ksEsperado =
      obtenerKsDeAccesorio('codo90') + obtenerKsDeAccesorio('llaveDePaso') + obtenerKsDeAccesorio('uniones')
    expect(resultado).toEqual({
      tipo: 'calculada',
      ksTotal: ksEsperado,
      hf_m: calcularPerdidaCargaLocalizada(ksEsperado, 1.8),
    })
  })

  it('cantidad multiplicativa: cantidad>1 equivale a repetir el mismo tipo cantidad veces', () => {
    const conCantidad = resolverPerdidaLocalizadaDeTramo([accesorio('codo90', 3)], 1.2)
    const repetido = resolverPerdidaLocalizadaDeTramo(
      [accesorio('codo90', 1), accesorio('codo90', 1), accesorio('codo90', 1)],
      1.2,
    )

    expect(conCantidad).toEqual(repetido)
    if (conCantidad.tipo !== 'calculada') throw new Error('se esperaba calculada')
    expect(conCantidad.ksTotal).toBeCloseTo(3 * obtenerKsDeAccesorio('codo90'), 12)
  })

  it('mismo Ks con distintas velocidades produce pérdida acorde a V² (composición de CRIT-A26)', () => {
    const bajaVelocidad = resolverPerdidaLocalizadaDeTramo([accesorio('curva90', 2)], 1)
    const altaVelocidad = resolverPerdidaLocalizadaDeTramo([accesorio('curva90', 2)], 2)

    if (bajaVelocidad.tipo !== 'calculada' || altaVelocidad.tipo !== 'calculada') {
      throw new Error('se esperaba calculada')
    }
    // V se duplica -> hf se cuadruplica (Js ∝ V²), mismo Ks_total en ambos.
    expect(altaVelocidad.hf_m).toBeCloseTo(4 * bajaVelocidad.hf_m, 12)
  })

  it('reducciones (CRIT-A30): usa la velocidad de ESTE Tramo (el lado menor/aguas abajo de la transición), igual que cualquier otro accesorio del subconjunto -- ninguna lógica especial de dos velocidades', () => {
    const resultado = resolverPerdidaLocalizadaDeTramo([accesorio('reducciones', 1)], 2.3)

    const ksEsperado = obtenerKsDeAccesorio('reducciones')
    expect(resultado).toEqual({
      tipo: 'calculada',
      ksTotal: ksEsperado,
      hf_m: calcularPerdidaCargaLocalizada(ksEsperado, 2.3),
    })
  })

  it('varios tipos con cantidad>1 combinan suma y multiplicación correctamente', () => {
    const resultado = resolverPerdidaLocalizadaDeTramo(
      [accesorio('codo90', 2), accesorio('curva45', 3), accesorio('tuboSaliente', 1)],
      1.5,
    )

    const ksEsperado =
      2 * obtenerKsDeAccesorio('codo90') + 3 * obtenerKsDeAccesorio('curva45') + 1 * obtenerKsDeAccesorio('tuboSaliente')
    expect(resultado).toEqual({
      tipo: 'calculada',
      ksTotal: ksEsperado,
      hf_m: calcularPerdidaCargaLocalizada(ksEsperado, 1.5),
    })
  })
})
