import { describe, it, expect } from 'vitest'
import {
  tabla06Medidores,
  qcMaximoCubiertoPorTabla06_m3h,
  seleccionarFilaTabla06PorCaudal,
  type FilaTabla06Medidor,
} from './index'

// Correspondencia normativa DN -> (Qc proyecto, caudal medio, C) transcripta
// del texto oficial de ERAS-2023 §2.12, Tabla N°6.
const CORRESPONDENCIA_ESPERADA: ReadonlyArray<readonly [number, number, number, number]> = [
  // dn_mm, qcProyecto_m3h, caudalMedio_m3h, capacidadMaxima_m3h
  [15, 1.5, 2.25, 3],
  [19, 2.5, 3.75, 5],
  [25, 3.5, 5.25, 7],
  [32, 5, 7.5, 10],
  [38, 10, 15, 20],
  [50, 15, 22.5, 30],
  [60, 25, 37.5, 50],
  [75, 40, 60, 80],
]

describe('tabla06Medidores — tabla normativa (ERAS-2023 §2.12, Tabla N°6)', () => {
  it('contiene exactamente las 8 filas de Tabla N°6', () => {
    expect(tabla06Medidores).toHaveLength(8)
  })

  it.each(CORRESPONDENCIA_ESPERADA)(
    'DN%i mm -> Qc proyecto %f m3/h, caudal medio %f m3/h, C %f m3/h',
    (dn, qcProyecto, caudalMedio, capacidadMaxima) => {
      const fila = tabla06Medidores.find((candidata) => candidata.dnMedidor_mm === dn)
      expect(fila).toBeDefined()
      expect(fila?.qcProyecto_m3h).toBe(qcProyecto)
      expect(fila?.caudalMedio_m3h).toBe(caudalMedio)
      expect(fila?.capacidadMaxima_m3h).toBe(capacidadMaxima)
    },
  )

  it('las filas están ordenadas por DN y por Qc de proyecto crecientes', () => {
    for (let i = 1; i < tabla06Medidores.length; i += 1) {
      expect(tabla06Medidores[i]!.dnMedidor_mm).toBeGreaterThan(tabla06Medidores[i - 1]!.dnMedidor_mm)
      expect(tabla06Medidores[i]!.qcProyecto_m3h).toBeGreaterThan(tabla06Medidores[i - 1]!.qcProyecto_m3h)
    }
  })

  it('qcMaximoCubiertoPorTabla06_m3h es el Qc de proyecto de la última fila (40 m3/h)', () => {
    expect(qcMaximoCubiertoPorTabla06_m3h).toBe(40)
  })

  // INCONSISTENCIA OFICIAL (CRIT-A32): el ejemplo de la Guía empareja DN19
  // con C=7. La tabla asigna C=5 a DN19 y C=7 a DN25. El test fija la
  // versión de la TABLA como fuente de verdad -- si alguien "corrige" la
  // tabla para que coincida con el ejemplo, esto falla a propósito.
  it('DN19 tiene C=5 m3/h en la tabla (NO C=7; C=7 pertenece a DN25)', () => {
    const dn19 = tabla06Medidores.find((f) => f.dnMedidor_mm === 19)
    const dn25 = tabla06Medidores.find((f) => f.dnMedidor_mm === 25)
    expect(dn19?.capacidadMaxima_m3h).toBe(5)
    expect(dn25?.capacidadMaxima_m3h).toBe(7)
  })
})

describe('seleccionarFilaTabla06PorCaudal — regla literal de §2.12 (primera fila con Qc_tabla >= Qc)', () => {
  it('Qc = 2,5 m3/h selecciona la fila DN19 con C=5 m3/h (test normativo del emparejamiento correcto)', () => {
    const fila = seleccionarFilaTabla06PorCaudal(2.5)
    expect(fila).not.toBe('fueraDeTabla06')
    expect((fila as FilaTabla06Medidor).dnMedidor_mm).toBe(19)
    expect((fila as FilaTabla06Medidor).capacidadMaxima_m3h).toBe(5)
  })

  it('un caudal exactamente igual a un umbral tabulado selecciona esa misma fila (>=, no >)', () => {
    expect((seleccionarFilaTabla06PorCaudal(1.5) as FilaTabla06Medidor).dnMedidor_mm).toBe(15)
    expect((seleccionarFilaTabla06PorCaudal(3.5) as FilaTabla06Medidor).dnMedidor_mm).toBe(25)
    expect((seleccionarFilaTabla06PorCaudal(40) as FilaTabla06Medidor).dnMedidor_mm).toBe(75)
  })

  it('un caudal por debajo del umbral de una fila salta a la siguiente (no interpola DN)', () => {
    // 2,6 m3/h supera el umbral de DN19 (2,5) -> DN25.
    expect((seleccionarFilaTabla06PorCaudal(2.6) as FilaTabla06Medidor).dnMedidor_mm).toBe(25)
    // 0,9 m3/h -> primera fila (DN15).
    expect((seleccionarFilaTabla06PorCaudal(0.9) as FilaTabla06Medidor).dnMedidor_mm).toBe(15)
  })

  it('un caudal mayor a 40 m3/h queda fuera del dominio de Tabla N°6 (no extrapola)', () => {
    expect(seleccionarFilaTabla06PorCaudal(40.0001)).toBe('fueraDeTabla06')
    expect(seleccionarFilaTabla06PorCaudal(120)).toBe('fueraDeTabla06')
  })

  it('caudal <= 0 o no finito: throw (precondición imposible tras el motor de demanda)', () => {
    expect(() => seleccionarFilaTabla06PorCaudal(0)).toThrow(/qc_m3h debe ser un número mayor a 0/)
    expect(() => seleccionarFilaTabla06PorCaudal(-1)).toThrow(/qc_m3h debe ser un número mayor a 0/)
    expect(() => seleccionarFilaTabla06PorCaudal(Number.NaN)).toThrow(/qc_m3h debe ser un número mayor a 0/)
  })
})
