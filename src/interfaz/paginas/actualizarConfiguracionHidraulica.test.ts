import { describe, it, expect } from 'vitest'
import type { MaterialTuberiaId, Proyecto } from '../../modelo/proyecto'
import {
  conMaterialTuberia,
  conMetodoPerdidaDistribuida,
  conMetodoPerdidaLocalizada,
  conSistemaDeTuberia,
} from './actualizarConfiguracionHidraulica'

function proyectoDePrueba(
  metodo: 'hazenWilliams' | 'darcyWeisbach',
  materialTuberiaId: MaterialTuberiaId = 'ppr',
  sistemaDeTuberiaId = 'acquaSystemMagnumPn20',
): Proyecto {
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
    unidadesFuncionales: [{ id: 'uf-1', nombre: 'UF 1', locales: [] }],
    configuracionHidraulica: { metodoPerdidaDistribuida: metodo, metodoPerdidaLocalizada: 'detallado', granularidadHidraulica: 'profesional', materialTuberiaId, sistemaDeTuberiaId },
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

  it('cambiar Hazen-Williams -> Darcy-Weisbach conserva el materialTuberiaId existente', () => {
    const original = proyectoDePrueba('hazenWilliams', 'ppr')

    const actualizado = conMetodoPerdidaDistribuida(original, 'darcyWeisbach')

    expect(actualizado.configuracionHidraulica.materialTuberiaId).toBe('ppr')
  })
})

describe('conMetodoPerdidaLocalizada (D-delta.40)', () => {
  it('detallado -> estimado: actualiza el metodo, no muta el original', () => {
    const original = proyectoDePrueba('hazenWilliams')

    const actualizado = conMetodoPerdidaLocalizada(original, 'estimado')

    expect(actualizado.configuracionHidraulica.metodoPerdidaLocalizada).toBe('estimado')
    expect(original.configuracionHidraulica.metodoPerdidaLocalizada).toBe('detallado')
  })

  it('estimado -> detallado: simetrico', () => {
    const original: Proyecto = {
      ...proyectoDePrueba('hazenWilliams'),
      configuracionHidraulica: { ...proyectoDePrueba('hazenWilliams').configuracionHidraulica, metodoPerdidaLocalizada: 'estimado' },
    }

    const actualizado = conMetodoPerdidaLocalizada(original, 'detallado')

    expect(actualizado.configuracionHidraulica.metodoPerdidaLocalizada).toBe('detallado')
  })

  it('conserva metodoPerdidaDistribuida, materialTuberiaId y sistemaDeTuberiaId', () => {
    const original = proyectoDePrueba('darcyWeisbach', 'cobre', 'acquaSystemMagnumPn20')

    const actualizado = conMetodoPerdidaLocalizada(original, 'estimado')

    expect(actualizado.configuracionHidraulica.metodoPerdidaDistribuida).toBe('darcyWeisbach')
    expect(actualizado.configuracionHidraulica.materialTuberiaId).toBe('cobre')
    expect(actualizado.configuracionHidraulica.sistemaDeTuberiaId).toBe('acquaSystemMagnumPn20')
  })

  it('no altera metadatos, parametros, unidadesFuncionales ni redHidraulica -- cambiar de metodo no borra accesorios/tees ya persistidos', () => {
    const original = proyectoDePrueba('hazenWilliams')

    const actualizado = conMetodoPerdidaLocalizada(original, 'estimado')

    expect(actualizado.metadatos).toBe(original.metadatos)
    expect(actualizado.parametros).toBe(original.parametros)
    expect(actualizado.unidadesFuncionales).toBe(original.unidadesFuncionales)
    expect(actualizado.redHidraulica).toBe(original.redHidraulica)
  })
})

describe('conMaterialTuberia', () => {
  it('ppr -> pvc: actualiza el material, no muta el original', () => {
    const original = proyectoDePrueba('hazenWilliams', 'ppr')

    const actualizado = conMaterialTuberia(original, 'pvc')

    expect(actualizado.configuracionHidraulica.materialTuberiaId).toBe('pvc')
    expect(original.configuracionHidraulica.materialTuberiaId).toBe('ppr')
  })

  it('pvc -> cobre: otro cambio cualquiera', () => {
    const original = proyectoDePrueba('hazenWilliams', 'pvc')

    const actualizado = conMaterialTuberia(original, 'cobre')

    expect(actualizado.configuracionHidraulica.materialTuberiaId).toBe('cobre')
  })

  it('conserva metodoPerdidaDistribuida', () => {
    const original = proyectoDePrueba('darcyWeisbach', 'ppr')

    const actualizado = conMaterialTuberia(original, 'aceroCarbono')

    expect(actualizado.configuracionHidraulica.metodoPerdidaDistribuida).toBe('darcyWeisbach')
  })

  it('no altera metadatos, parametros, unidadesFuncionales ni redHidraulica; conserva su identidad referencial', () => {
    const original = proyectoDePrueba('hazenWilliams', 'ppr')

    const actualizado = conMaterialTuberia(original, 'pead')

    expect(actualizado.metadatos).toBe(original.metadatos)
    expect(actualizado.parametros).toBe(original.parametros)
    expect(actualizado.unidadesFuncionales).toBe(original.unidadesFuncionales)
    expect(actualizado.redHidraulica).toBe(original.redHidraulica)
  })
})

describe('conSistemaDeTuberia (D-delta.28)', () => {
  it('actualiza sistemaDeTuberiaId, no muta el original', () => {
    const original = proyectoDePrueba('hazenWilliams', 'ppr', 'acquaSystemMagnumPn20')

    const actualizado = conSistemaDeTuberia(original, 'otroSistemaFicticio')

    expect(actualizado.configuracionHidraulica.sistemaDeTuberiaId).toBe('otroSistemaFicticio')
    expect(original.configuracionHidraulica.sistemaDeTuberiaId).toBe('acquaSystemMagnumPn20')
  })

  it('conserva metodoPerdidaDistribuida y materialTuberiaId', () => {
    const original = proyectoDePrueba('darcyWeisbach', 'cobre', 'acquaSystemMagnumPn20')

    const actualizado = conSistemaDeTuberia(original, 'otroSistemaFicticio')

    expect(actualizado.configuracionHidraulica.metodoPerdidaDistribuida).toBe('darcyWeisbach')
    expect(actualizado.configuracionHidraulica.materialTuberiaId).toBe('cobre')
  })

  it('no valida existencia ni compatibilidad -- eso es responsabilidad exclusiva de validarConfiguracionHidraulica', () => {
    const original = proyectoDePrueba('hazenWilliams', 'ppr', 'acquaSystemMagnumPn20')

    const actualizado = conSistemaDeTuberia(original, 'sistemaInexistente')

    expect(actualizado.configuracionHidraulica.sistemaDeTuberiaId).toBe('sistemaInexistente')
  })

  it('no altera metadatos, parametros, unidadesFuncionales ni redHidraulica; conserva su identidad referencial', () => {
    const original = proyectoDePrueba('hazenWilliams', 'ppr', 'acquaSystemMagnumPn20')

    const actualizado = conSistemaDeTuberia(original, 'otroSistemaFicticio')

    expect(actualizado.metadatos).toBe(original.metadatos)
    expect(actualizado.parametros).toBe(original.parametros)
    expect(actualizado.unidadesFuncionales).toBe(original.unidadesFuncionales)
    expect(actualizado.redHidraulica).toBe(original.redHidraulica)
  })
})
