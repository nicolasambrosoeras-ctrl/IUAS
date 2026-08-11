import { describe, it, expect } from 'vitest'
import type { Proyecto } from '../../modelo/proyecto'
import { conMetodoPerdidaDistribuida } from './actualizarConfiguracionHidraulica'

function proyectoDePrueba(metodo: 'hazenWilliams' | 'darcyWeisbach'): Proyecto {
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
      material: 'PVC',
    },
    unidadesFuncionales: [{ id: 'uf-1', nombre: 'UF 1', locales: [] }],
    configuracionHidraulica: { metodoPerdidaDistribuida: metodo },
  }
}

describe('conMetodoPerdidaDistribuida', () => {
  it('Hazen-Williams -> Darcy-Weisbach: actualiza el método, no muta el original', () => {
    const original = proyectoDePrueba('hazenWilliams')

    const actualizado = conMetodoPerdidaDistribuida(original, 'darcyWeisbach')

    expect(actualizado.configuracionHidraulica.metodoPerdidaDistribuida).toBe('darcyWeisbach')
    expect(original.configuracionHidraulica.metodoPerdidaDistribuida).toBe('hazenWilliams')
  })

  it('Darcy-Weisbach -> Hazen-Williams: simétrico', () => {
    const original = proyectoDePrueba('darcyWeisbach')

    const actualizado = conMetodoPerdidaDistribuida(original, 'hazenWilliams')

    expect(actualizado.configuracionHidraulica.metodoPerdidaDistribuida).toBe('hazenWilliams')
    expect(original.configuracionHidraulica.metodoPerdidaDistribuida).toBe('darcyWeisbach')
  })

  it('no altera metadatos, parametros, unidadesFuncionales ni redHidraulica; conserva su identidad referencial', () => {
    const original = proyectoDePrueba('hazenWilliams')

    const actualizado = conMetodoPerdidaDistribuida(original, 'darcyWeisbach')

    expect(actualizado.metadatos).toBe(original.metadatos)
    expect(actualizado.parametros).toBe(original.parametros)
    expect(actualizado.unidadesFuncionales).toBe(original.unidadesFuncionales)
    expect(actualizado.redHidraulica).toBe(original.redHidraulica)
  })
})
