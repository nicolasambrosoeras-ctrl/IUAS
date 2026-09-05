import { describe, it, expect } from 'vitest'
import type { MaterialTuberiaId, MetodoPerdidaDistribuida, Proyecto } from '../../../modelo/proyecto'
import { catalogoMaterialesTuberia } from '../materialTuberia'
import { resolverParametroDePerdidaDistribuida } from './resolverParametroDePerdidaDistribuida'

function proyectoDePrueba(metodo: MetodoPerdidaDistribuida, materialTuberiaId: MaterialTuberiaId): Proyecto {
  return {
    metadatos: {
      nombre: 'Proyecto de prueba',
      obra: 'Obra de prueba',
      comitente: 'Comitente de prueba',
      fecha: '2026-01-01',
      schemaVersion: '1.0.0',
      versionNormativa: 'eras-2023',
    },
    parametros: {
      tipoDeProyecto: 'viviendaIndividual',
      presionSobreAcera_m: 2,
      alturaArtefactoMasDesfavorable_m: 3,
    },
    unidadesFuncionales: [],
    configuracionHidraulica: { metodoPerdidaDistribuida: metodo, metodoPerdidaLocalizada: 'detallado', granularidadHidraulica: 'profesional', materialTuberiaId, sistemaDeTuberiaId: 'acquaSystemMagnumPn20' },
  }
}

describe('resolverParametroDePerdidaDistribuida', () => {
  it('Hazen-Williams + PPR: devuelve coeficienteC=150, sin rugosidadAbsoluta_mm', () => {
    const proyecto = proyectoDePrueba('hazenWilliams', 'ppr')

    const resultado = resolverParametroDePerdidaDistribuida(proyecto, catalogoMaterialesTuberia)

    expect(resultado).toEqual({ metodo: 'hazenWilliams', coeficienteC: 150 })
    expect(resultado).not.toHaveProperty('rugosidadAbsoluta_mm')
  })

  it('Hazen-Williams + acero galvanizado: coeficienteC=120', () => {
    const proyecto = proyectoDePrueba('hazenWilliams', 'aceroGalvanizado')

    const resultado = resolverParametroDePerdidaDistribuida(proyecto, catalogoMaterialesTuberia)

    expect(resultado).toEqual({ metodo: 'hazenWilliams', coeficienteC: 120 })
  })

  it('Darcy-Weisbach + PPR: devuelve rugosidadAbsoluta_mm=0.007, sin coeficienteC', () => {
    const proyecto = proyectoDePrueba('darcyWeisbach', 'ppr')

    const resultado = resolverParametroDePerdidaDistribuida(proyecto, catalogoMaterialesTuberia)

    expect(resultado).toEqual({ metodo: 'darcyWeisbach', rugosidadAbsoluta_mm: 0.007 })
    expect(resultado).not.toHaveProperty('coeficienteC')
  })

  it('Darcy-Weisbach + PEAD: rugosidadAbsoluta_mm=0.0213', () => {
    const proyecto = proyectoDePrueba('darcyWeisbach', 'pead')

    const resultado = resolverParametroDePerdidaDistribuida(proyecto, catalogoMaterialesTuberia)

    expect(resultado).toEqual({ metodo: 'darcyWeisbach', rugosidadAbsoluta_mm: 0.0213 })
  })

  it('Darcy-Weisbach + acero al carbono: rugosidadAbsoluta_mm=0.045', () => {
    const proyecto = proyectoDePrueba('darcyWeisbach', 'aceroCarbono')

    const resultado = resolverParametroDePerdidaDistribuida(proyecto, catalogoMaterialesTuberia)

    expect(resultado).toEqual({ metodo: 'darcyWeisbach', rugosidadAbsoluta_mm: 0.045 })
  })

  it('catálogo incompleto: material referenciado por el Proyecto ausente -> throw', () => {
    const proyecto = proyectoDePrueba('hazenWilliams', 'cobre')
    const catalogoIncompleto = catalogoMaterialesTuberia.filter((material) => material.id !== 'cobre')

    expect(() => resolverParametroDePerdidaDistribuida(proyecto, catalogoIncompleto)).toThrow(
      /no existe ningún MaterialTuberia con id "cobre"/,
    )
  })
})
