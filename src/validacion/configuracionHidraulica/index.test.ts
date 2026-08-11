import { describe, it, expect } from 'vitest'
import type { MaterialTuberiaId, Proyecto } from '../../modelo/proyecto'
import type { SistemaDeTuberiaCatalogado } from '../../motor/tuberias/sistemaDeTuberia'
import { validarConfiguracionHidraulica } from './index'

const CATALOGO_DE_PRUEBA: readonly SistemaDeTuberiaCatalogado[] = [
  {
    id: 'acquaSystemMagnumPn20',
    denominacion: 'Acqua System® Magnum PN20',
    materialTuberiaId: 'ppr',
    fabricante: 'Grupo Dema',
    referenciaFuenteDimensiones: 'Fuente de prueba',
    entradas: [{ denominacionComercial: '20 mm', diametroInteriorEfectivo_mm: 14.4 }],
  },
]

function proyectoDePrueba(materialTuberiaId: MaterialTuberiaId, sistemaDeTuberiaId: string): Proyecto {
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
    configuracionHidraulica: { metodoPerdidaDistribuida: 'hazenWilliams', materialTuberiaId, sistemaDeTuberiaId },
  }
}

describe('validarConfiguracionHidraulica', () => {
  it('sistema existente y material compatible: sin problemas', () => {
    const proyecto = proyectoDePrueba('ppr', 'acquaSystemMagnumPn20')

    expect(validarConfiguracionHidraulica(proyecto, CATALOGO_DE_PRUEBA)).toEqual([])
  })

  it('sistemaDeTuberiaId inexistente en el catálogo -> error', () => {
    const proyecto = proyectoDePrueba('ppr', 'sistemaInexistente')

    const problemas = validarConfiguracionHidraulica(proyecto, CATALOGO_DE_PRUEBA)

    expect(problemas).toHaveLength(1)
    expect(problemas[0]).toMatchObject({
      codigo: 'configuracionHidraulicaSistemaDeTuberiaIdInexistente',
      severidad: 'error',
      campo: 'configuracionHidraulica.sistemaDeTuberiaId',
      valorRecibido: 'sistemaInexistente',
    })
  })

  it('sistema existente pero material incompatible (cobre + sistema de PPR) -> error', () => {
    const proyecto = proyectoDePrueba('cobre', 'acquaSystemMagnumPn20')

    const problemas = validarConfiguracionHidraulica(proyecto, CATALOGO_DE_PRUEBA)

    expect(problemas).toHaveLength(1)
    expect(problemas[0]).toMatchObject({
      codigo: 'configuracionHidraulicaSistemaMaterialIncompatible',
      severidad: 'error',
      campo: 'configuracionHidraulica.sistemaDeTuberiaId',
      valorRecibido: 'acquaSystemMagnumPn20',
      limite: 'cobre',
    })
  })
})
