import { describe, it, expect } from 'vitest'
import type { MaterialTuberiaId, Proyecto } from '../../modelo/proyecto'
import type { SistemaDeTuberiaCatalogado } from '../../motor/tuberias/sistemaDeTuberia'
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
    unidadesFuncionales: [{ id: 'uf-1', nombre: 'UF 1', niveles: [{ id: 'uf-1-nivel-1', nombre: 'Nivel 1', locales: [] }] }],
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

describe('conMaterialTuberia (D-delta.47: sincroniza sistemaDeTuberiaId para nunca dejar un par incompatible)', () => {
  const catalogoDePrueba: readonly SistemaDeTuberiaCatalogado[] = [
    { id: 'sistema-ppr-a', denominacion: 'Sistema PPR A', materialTuberiaId: 'ppr', fabricante: 'Fabricante', referenciaFuenteDimensiones: 'Fuente', entradas: [] },
    { id: 'sistema-ppr-b', denominacion: 'Sistema PPR B', materialTuberiaId: 'ppr', fabricante: 'Fabricante', referenciaFuenteDimensiones: 'Fuente', entradas: [] },
    { id: 'sistema-pvc-a', denominacion: 'Sistema PVC A', materialTuberiaId: 'pvc', fabricante: 'Fabricante', referenciaFuenteDimensiones: 'Fuente', entradas: [] },
  ]

  it('ppr -> pvc: adopta el primer sistema compatible con pvc, no muta el original', () => {
    const original = proyectoDePrueba('hazenWilliams', 'ppr', 'sistema-ppr-a')

    const actualizado = conMaterialTuberia(original, 'pvc', catalogoDePrueba)

    expect(actualizado.configuracionHidraulica.materialTuberiaId).toBe('pvc')
    expect(actualizado.configuracionHidraulica.sistemaDeTuberiaId).toBe('sistema-pvc-a')
    expect(original.configuracionHidraulica.materialTuberiaId).toBe('ppr')
    expect(original.configuracionHidraulica.sistemaDeTuberiaId).toBe('sistema-ppr-a')
  })

  it('mismo material, otro sistema ya seleccionado: conserva el sistema actual porque sigue siendo compatible', () => {
    const original = proyectoDePrueba('hazenWilliams', 'ppr', 'sistema-ppr-b')

    const actualizado = conMaterialTuberia(original, 'ppr', catalogoDePrueba)

    expect(actualizado.configuracionHidraulica.sistemaDeTuberiaId).toBe('sistema-ppr-b')
  })

  it('material sin ningún sistema compatible en el catálogo: conserva el sistemaDeTuberiaId anterior en vez de dejar un par incompatible', () => {
    const original = proyectoDePrueba('hazenWilliams', 'ppr', 'sistema-ppr-a')

    const actualizado = conMaterialTuberia(original, 'aceroCarbono', catalogoDePrueba)

    expect(actualizado.configuracionHidraulica.materialTuberiaId).toBe('aceroCarbono')
    expect(actualizado.configuracionHidraulica.sistemaDeTuberiaId).toBe('sistema-ppr-a')
  })

  it('conserva metodoPerdidaDistribuida', () => {
    const original = proyectoDePrueba('darcyWeisbach', 'ppr', 'sistema-ppr-a')

    const actualizado = conMaterialTuberia(original, 'pvc', catalogoDePrueba)

    expect(actualizado.configuracionHidraulica.metodoPerdidaDistribuida).toBe('darcyWeisbach')
  })

  it('no altera metadatos, parametros, unidadesFuncionales ni redHidraulica; conserva su identidad referencial', () => {
    const original = proyectoDePrueba('hazenWilliams', 'ppr', 'sistema-ppr-a')

    const actualizado = conMaterialTuberia(original, 'pvc', catalogoDePrueba)

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
