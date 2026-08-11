import { describe, it, expect } from 'vitest'
import type { MaterialTuberiaId } from '../../../modelo/proyecto'
import { catalogoMaterialesTuberia, obtenerMaterialTuberia, type MaterialTuberia } from './index'

describe('catalogoMaterialesTuberia', () => {
  it('tiene exactamente 6 materiales', () => {
    expect(catalogoMaterialesTuberia).toHaveLength(6)
  })

  it('todos los IDs son únicos', () => {
    const ids = catalogoMaterialesTuberia.map((material) => material.id)

    expect(new Set(ids).size).toBe(ids.length)
  })

  it('contiene exactamente los 6 IDs esperados', () => {
    const idsEsperados: readonly MaterialTuberiaId[] = ['ppr', 'pvc', 'pead', 'cobre', 'aceroGalvanizado', 'aceroCarbono']
    const ids = catalogoMaterialesTuberia.map((material) => material.id)

    expect(ids).toEqual(idsEsperados)
  })

  it('todos los coeficienteC son mayores a 0', () => {
    catalogoMaterialesTuberia.forEach((material) => {
      expect(material.coeficienteC).toBeGreaterThan(0)
    })
  })

  it('todas las rugosidadAbsoluta_mm son mayores a 0', () => {
    catalogoMaterialesTuberia.forEach((material) => {
      expect(material.rugosidadAbsoluta_mm).toBeGreaterThan(0)
    })
  })

  it('valores exactos adoptados para los seis materiales', () => {
    function buscar(id: MaterialTuberiaId): MaterialTuberia {
      const material = catalogoMaterialesTuberia.find((candidato) => candidato.id === id)
      if (material === undefined) {
        throw new Error(`fixture de test: no existe "${id}" en catalogoMaterialesTuberia`)
      }
      return material
    }

    expect(buscar('ppr').coeficienteC).toBe(150)
    expect(buscar('ppr').rugosidadAbsoluta_mm).toBe(0.007)

    expect(buscar('pvc').coeficienteC).toBe(150)
    expect(buscar('pvc').rugosidadAbsoluta_mm).toBe(0.0015)

    expect(buscar('pead').coeficienteC).toBe(150)
    expect(buscar('pead').rugosidadAbsoluta_mm).toBe(0.0213)

    expect(buscar('cobre').coeficienteC).toBe(140)
    expect(buscar('cobre').rugosidadAbsoluta_mm).toBe(0.0015)

    expect(buscar('aceroGalvanizado').coeficienteC).toBe(120)
    expect(buscar('aceroGalvanizado').rugosidadAbsoluta_mm).toBe(0.15)

    expect(buscar('aceroCarbono').coeficienteC).toBe(140)
    expect(buscar('aceroCarbono').rugosidadAbsoluta_mm).toBe(0.045)
  })
})

describe('obtenerMaterialTuberia', () => {
  it('resuelve correctamente los seis materiales del catálogo real', () => {
    const ids: readonly MaterialTuberiaId[] = ['ppr', 'pvc', 'pead', 'cobre', 'aceroGalvanizado', 'aceroCarbono']

    ids.forEach((id) => {
      const material = obtenerMaterialTuberia(id, catalogoMaterialesTuberia)
      expect(material.id).toBe(id)
    })
  })

  it('catálogo deliberadamente incompleto: ID válido ausente -> throw', () => {
    const catalogoIncompleto = catalogoMaterialesTuberia.filter((material) => material.id !== 'cobre')

    expect(() => obtenerMaterialTuberia('cobre', catalogoIncompleto)).toThrow(
      /no existe ningún MaterialTuberia con id "cobre"/,
    )
  })
})
