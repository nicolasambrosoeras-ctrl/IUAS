import { describe, it, expect } from 'vitest'
import { catalogoArtefactos } from '../../../normativa/eras-2023/catalogo-artefactos'
import { resolverPresionMinimaDeArtefacto } from './resolverPresionMinimaDeArtefacto'

function artefactoDelCatalogo(id: string) {
  const artefacto = catalogoArtefactos.find((candidato) => candidato.id === id)
  if (artefacto === undefined) {
    throw new Error(`fixture de test inválido: no existe "${id}" en catalogoArtefactos`)
  }
  return artefacto
}

describe('resolverPresionMinimaDeArtefacto (ERAS-2023 §2.9.1.4)', () => {
  it('lavatorio: presionMinima_kgcm2=0,6', () => {
    expect(resolverPresionMinimaDeArtefacto(artefactoDelCatalogo('lavatorio'))).toBe(0.6)
  })

  it('inodoroValvula: presionMinima_kgcm2=1,5 (el mayor del catálogo doméstico)', () => {
    expect(resolverPresionMinimaDeArtefacto(artefactoDelCatalogo('inodoroValvula'))).toBe(1.5)
  })

  it('maquinaLavarropas: presionMinima_kgcm2=0,3 (el menor del catálogo)', () => {
    expect(resolverPresionMinimaDeArtefacto(artefactoDelCatalogo('maquinaLavarropas'))).toBe(0.3)
  })

  it('maquinaLavavajillas: presionMinima_kgcm2=null en el catálogo -> throw explícito, nunca 0', () => {
    const artefacto = artefactoDelCatalogo('maquinaLavavajillas')
    expect(artefacto.presionMinima_kgcm2).toBeNull()
    expect(() => resolverPresionMinimaDeArtefacto(artefacto)).toThrow(
      /el artefacto "maquinaLavavajillas" no tiene presionMinima_kgcm2 definida/,
    )
  })

  it('piletaDeCocinaIndustrial: presionMinima_kgcm2=null en el catálogo -> throw explícito', () => {
    const artefacto = artefactoDelCatalogo('piletaDeCocinaIndustrial')
    expect(artefacto.presionMinima_kgcm2).toBeNull()
    expect(() => resolverPresionMinimaDeArtefacto(artefacto)).toThrow(/no tiene presionMinima_kgcm2 definida/)
  })
})
