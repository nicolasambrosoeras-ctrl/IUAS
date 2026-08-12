import { describe, it, expect } from 'vitest'
import type { Artefacto, Local, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { ReferenciaDeArtefacto } from '../../modelo/redHidraulica'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import { describirReferenciaPendiente } from './ResultadoHidraulicoDeTramo'

function proyectoCon(unidadesFuncionales: readonly UnidadFuncional[]): Proyecto {
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
      tipoDeProyecto: 'oficinaPrivada',
      presionSobreAcera_m: 0,
      alturaArtefactoMasDesfavorable_m: 0,
    },
    unidadesFuncionales,
    configuracionHidraulica: { metodoPerdidaDistribuida: 'hazenWilliams', materialTuberiaId: 'ppr', sistemaDeTuberiaId: 'acquaSystemMagnumPn20' },
  }
}

function referenciaA(unidadFuncionalId: string, localId: string, artefactoId: string): ReferenciaDeArtefacto {
  return { tipo: 'artefacto', unidadFuncionalId, localId, artefactoId }
}

describe('describirReferenciaPendiente', () => {
  it('resuelve UF, Local y nombre de catálogo en el formato "UF → Local → Artefacto"', () => {
    const artefacto: Artefacto = { id: 'a1', artefactoId: 'bidet', cantidad: 1, origen: 'normativo' }
    const local: Local = { id: 'local-bano', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto] }
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'Unidad funcional 1', locales: [local] }
    const proyecto = proyectoCon([uf])
    const catalogoArtefactos: readonly ArtefactoNormativo[] = [
      { id: 'bidet', nombre: 'Bidet' } as ArtefactoNormativo,
    ]

    const resultado = describirReferenciaPendiente(proyecto, catalogoArtefactos, referenciaA('uf-1', 'local-bano', 'a1'))

    expect(resultado).toBe('Unidad funcional 1 → Baño → Bidet')
  })

  it('usa ETIQUETA_TIPO_DE_LOCAL para traducir el tipo de Local, no el id técnico', () => {
    const artefacto: Artefacto = { id: 'a1', artefactoId: 'piletaDeCocina', cantidad: 1, origen: 'normativo' }
    const local: Local = { id: 'local-cocina-1', tipo: 'cocina', regimen: 'domiciliario', artefactos: [artefacto] }
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'Unidad funcional 1', locales: [local] }
    const proyecto = proyectoCon([uf])
    const catalogoArtefactos: readonly ArtefactoNormativo[] = [
      { id: 'piletaDeCocina', nombre: 'Pileta de cocina' } as ArtefactoNormativo,
    ]

    const resultado = describirReferenciaPendiente(proyecto, catalogoArtefactos, referenciaA('uf-1', 'local-cocina-1', 'a1'))

    expect(resultado).toContain('Cocina')
    expect(resultado).not.toContain('local-cocina-1')
  })

  it('nombre de artefacto obtenido del catálogo, no del artefactoId técnico', () => {
    const artefacto: Artefacto = { id: 'a1', artefactoId: 'receptaculoDucha', cantidad: 1, origen: 'normativo' }
    const local: Local = { id: 'local-bano', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto] }
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'Unidad funcional 1', locales: [local] }
    const proyecto = proyectoCon([uf])
    const catalogoArtefactos: readonly ArtefactoNormativo[] = [
      { id: 'receptaculoDucha', nombre: 'Receptáculo de ducha' } as ArtefactoNormativo,
    ]

    const resultado = describirReferenciaPendiente(proyecto, catalogoArtefactos, referenciaA('uf-1', 'local-bano', 'a1'))

    expect(resultado).toContain('Receptáculo de ducha')
    expect(resultado).not.toContain('receptaculoDucha')
  })

  it('fallback: artefactoId técnico del catálogo si no se encuentra en catalogoArtefactos (caso borde, sin inventar nombre)', () => {
    const artefacto: Artefacto = { id: 'a1', artefactoId: 'artefactoInexistente', cantidad: 1, origen: 'normativo' }
    const local: Local = { id: 'local-bano', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto] }
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'Unidad funcional 1', locales: [local] }
    const proyecto = proyectoCon([uf])

    const resultado = describirReferenciaPendiente(proyecto, [], referenciaA('uf-1', 'local-bano', 'a1'))

    expect(resultado).toBe('Unidad funcional 1 → Baño → artefactoInexistente')
  })
})
