// Regresión: un proyecto sin ningún artefacto computable no debe llegar
// al motor (n=0 lanza una excepción no capturada en
// calcularCoeficienteDeSimultaneidad). Ver proyectoSinArtefactosComputables.
import { describe, it, expect } from 'vitest'
import type { Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import { validarInvariantesDeProyecto } from './index'

function conUnidadesFuncionales(unidadesFuncionales: readonly UnidadFuncional[]): Proyecto {
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
      material: 'PVC',
    },
    unidadesFuncionales,
    configuracionHidraulica: { metodoPerdidaDistribuida: 'hazenWilliams' },
  }
}

describe('validarInvariantesDeProyecto — proyectoSinArtefactosComputables', () => {
  it('Caso A: UF sin locales -> inválido, con el nuevo error global y la advertencia existente', () => {
    const proyecto = conUnidadesFuncionales([{ id: 'uf-1', nombre: 'UF 1', locales: [] }])
    const problemas = validarInvariantesDeProyecto(proyecto)

    const codigos = problemas.map((p) => p.codigo)
    expect(codigos).toContain('proyectoUnidadFuncionalSinLocales')
    expect(codigos).toContain('proyectoSinArtefactosComputables')
    expect(codigos.filter((c) => c === 'proyectoSinArtefactosComputables')).toHaveLength(1)
    expect(problemas.some((p) => p.codigo === 'proyectoSinArtefactosComputables' && p.severidad === 'error')).toBe(
      true,
    )
  })

  it('Caso B: local sin artefactos -> inválido, con el nuevo error global y la advertencia existente', () => {
    const proyecto = conUnidadesFuncionales([
      {
        id: 'uf-1',
        nombre: 'UF 1',
        locales: [{ id: 'local-1', tipo: 'bano', regimen: 'domiciliario', artefactos: [] }],
      },
    ])
    const problemas = validarInvariantesDeProyecto(proyecto)

    const codigos = problemas.map((p) => p.codigo)
    expect(codigos).toContain('proyectoLocalSinArtefactos')
    expect(codigos).toContain('proyectoSinArtefactosComputables')
    expect(codigos.filter((c) => c === 'proyectoSinArtefactosComputables')).toHaveLength(1)
  })

  it('Caso C: varias UF, alguna con artefactos -> válido respecto de esta regla', () => {
    const proyecto = conUnidadesFuncionales([
      { id: 'uf-1', nombre: 'UF 1', locales: [] },
      {
        id: 'uf-2',
        nombre: 'UF 2',
        locales: [
          {
            id: 'local-1',
            tipo: 'bano',
            regimen: 'domiciliario',
            artefactos: [{ id: 'artefacto-1', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }],
          },
        ],
      },
    ])
    const problemas = validarInvariantesDeProyecto(proyecto)

    expect(problemas.some((p) => p.codigo === 'proyectoSinArtefactosComputables')).toBe(false)
  })

  it('Caso D: varias UF, ninguna con artefactos -> inválido, con exactamente un error global', () => {
    const proyecto = conUnidadesFuncionales([
      { id: 'uf-1', nombre: 'UF 1', locales: [] },
      {
        id: 'uf-2',
        nombre: 'UF 2',
        locales: [{ id: 'local-1', tipo: 'bano', regimen: 'domiciliario', artefactos: [] }],
      },
    ])
    const problemas = validarInvariantesDeProyecto(proyecto)

    const codigos = problemas.map((p) => p.codigo)
    expect(codigos.filter((c) => c === 'proyectoSinArtefactosComputables')).toHaveLength(1)
  })
})
