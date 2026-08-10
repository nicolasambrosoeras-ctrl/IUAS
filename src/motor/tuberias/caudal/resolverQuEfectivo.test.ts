// La API no recibe Proyecto, Tramo, ArtefactoResuelto, AporteDeDemanda ni
// catalogo completo -- solo el ArtefactoNormativo puntual y la condicion.
// Esa independencia de contexto queda demostrada por la propia firma usada
// en cada test.
import { describe, it, expect } from 'vitest'
import type { ArtefactoNormativo } from '../../../normativa/eras-2023/catalogo-artefactos'
import { catalogoArtefactos } from '../../../normativa/eras-2023/catalogo-artefactos'
import { resolverQuEfectivo } from './resolverQuEfectivo'

function buscarEnCatalogo(id: string): ArtefactoNormativo {
  const artefacto = catalogoArtefactos.find((candidato) => candidato.id === id)
  if (artefacto === undefined) {
    throw new Error(`fixture de test: no existe "${id}" en catalogoArtefactos`)
  }
  return artefacto
}

describe('resolverQuEfectivo', () => {
  it("condición 'total': devuelve quTotal_lps", () => {
    const lavatorio = buscarEnCatalogo('lavatorio')

    expect(resolverQuEfectivo(lavatorio, 'total')).toBe(lavatorio.quTotal_lps)
    expect(resolverQuEfectivo(lavatorio, 'total')).toBe(0.2)
  })

  it("condición 'aguaFria': devuelve quFria_lps", () => {
    const lavatorio = buscarEnCatalogo('lavatorio')

    expect(resolverQuEfectivo(lavatorio, 'aguaFria')).toBe(0.08)
  })

  it("condición 'aguaCaliente': devuelve quCaliente_lps", () => {
    const lavatorio = buscarEnCatalogo('lavatorio')

    expect(resolverQuEfectivo(lavatorio, 'aguaCaliente')).toBe(0.12)
  })

  it("inodoroDeposito (fila ERAS 'Inodoro DAI'): preserva literalmente la desagregación del catálogo, sin corregirla", () => {
    // ERAS-2023 §2.9.1.2 publica esta fila como "Inodoro DAI": 0,20 / 0,08 /
    // 0,12. Es la misma terna que hoy tiene inodoroDeposito en el catálogo
    // IUAS. resolverQuEfectivo no corrige que un inodoro a depósito tenga
    // quCaliente_lps > 0 -- selecciona el dato tal como está.
    const inodoroDeposito = buscarEnCatalogo('inodoroDeposito')

    expect(inodoroDeposito.quTotal_lps).toBe(0.2)
    expect(inodoroDeposito.quFria_lps).toBe(0.08)
    expect(inodoroDeposito.quCaliente_lps).toBe(0.12)

    expect(resolverQuEfectivo(inodoroDeposito, 'total')).toBe(0.2)
    expect(resolverQuEfectivo(inodoroDeposito, 'aguaFria')).toBe(0.08)
    expect(resolverQuEfectivo(inodoroDeposito, 'aguaCaliente')).toBe(0.12)
  })

  it('artefacto exclusivamente frío (maquinaLavavajillas): AF y AC devuelven el valor actual del catálogo, sin inventar lógica', () => {
    const maquinaLavavajillas = buscarEnCatalogo('maquinaLavavajillas')

    expect(maquinaLavavajillas.quFria_lps).toBe(0.2)
    expect(maquinaLavavajillas.quCaliente_lps).toBe(0)
    expect(resolverQuEfectivo(maquinaLavavajillas, 'aguaFria')).toBe(0.2)
    expect(resolverQuEfectivo(maquinaLavavajillas, 'aguaCaliente')).toBe(0)
  })

  it('artefacto con quFria_lps=null en el catálogo (valvulaMingitorio): pedir aguaFria lanza excepción', () => {
    const valvulaMingitorio = buscarEnCatalogo('valvulaMingitorio')

    expect(valvulaMingitorio.quFria_lps).toBeNull()
    expect(() => resolverQuEfectivo(valvulaMingitorio, 'aguaFria')).toThrow(/valvulaMingitorio/)
  })

  it('artefacto con quCaliente_lps=null en el catálogo (valvulaMingitorio): pedir aguaCaliente lanza excepción', () => {
    const valvulaMingitorio = buscarEnCatalogo('valvulaMingitorio')

    expect(valvulaMingitorio.quCaliente_lps).toBeNull()
    expect(() => resolverQuEfectivo(valvulaMingitorio, 'aguaCaliente')).toThrow(/valvulaMingitorio/)
  })

  it('no muta el ArtefactoNormativo recibido', () => {
    const lavatorio = buscarEnCatalogo('lavatorio')
    const copia = { ...lavatorio }

    resolverQuEfectivo(lavatorio, 'total')
    resolverQuEfectivo(lavatorio, 'aguaFria')
    resolverQuEfectivo(lavatorio, 'aguaCaliente')

    expect(lavatorio).toEqual(copia)
  })
})
