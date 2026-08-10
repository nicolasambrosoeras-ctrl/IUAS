import { describe, it, expect } from 'vitest'
import type { Artefacto, Local, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import { duplicarUnidadFuncional, duplicarUnidadFuncionalEnProyecto } from './duplicarUnidadFuncional'

function artefactoDePrueba(overrides: Partial<Artefacto> = {}): Artefacto {
  return { id: 'artefacto-1', artefactoId: 'lavatorio', cantidad: 2, origen: 'normativo', ...overrides }
}

function localDePrueba(overrides: Partial<Local> = {}): Local {
  return {
    id: 'local-1',
    tipo: 'bano',
    regimen: 'domiciliario',
    artefactos: [artefactoDePrueba()],
    ...overrides,
  }
}

function ufDePrueba(overrides: Partial<UnidadFuncional> = {}): UnidadFuncional {
  return { id: 'uf-1', nombre: 'Departamento 1º A', locales: [localDePrueba()], ...overrides }
}

describe('duplicarUnidadFuncional', () => {
  it('copia la configuracion completa de la UF', () => {
    const original = ufDePrueba()

    const copia = duplicarUnidadFuncional(original)

    expect(copia.locales).toHaveLength(1)
    expect(copia.locales[0]?.tipo).toBe('bano')
    expect(copia.locales[0]?.regimen).toBe('domiciliario')
    expect(copia.locales[0]?.artefactos).toHaveLength(1)
    expect(copia.locales[0]?.artefactos[0]?.artefactoId).toBe('lavatorio')
    expect(copia.locales[0]?.artefactos[0]?.cantidad).toBe(2)
    expect(copia.locales[0]?.artefactos[0]?.origen).toBe('normativo')
  })

  it('genera UnidadFuncional.id nuevo', () => {
    const original = ufDePrueba()

    const copia = duplicarUnidadFuncional(original)

    expect(copia.id).not.toBe(original.id)
  })

  it('genera ids nuevos para todos los Locales', () => {
    const original = ufDePrueba({
      locales: [localDePrueba({ id: 'local-a' }), localDePrueba({ id: 'local-b' })],
    })

    const copia = duplicarUnidadFuncional(original)

    expect(copia.locales[0]?.id).not.toBe('local-a')
    expect(copia.locales[1]?.id).not.toBe('local-b')
    expect(copia.locales[0]?.id).not.toBe(copia.locales[1]?.id)
  })

  it('genera ids nuevos para todos los Artefactos', () => {
    const original = ufDePrueba({
      locales: [
        localDePrueba({
          artefactos: [artefactoDePrueba({ id: 'artefacto-a' }), artefactoDePrueba({ id: 'artefacto-b' })],
        }),
      ],
    })

    const copia = duplicarUnidadFuncional(original)
    const [artefactoCopiaA, artefactoCopiaB] = copia.locales[0]?.artefactos ?? []

    expect(artefactoCopiaA?.id).not.toBe('artefacto-a')
    expect(artefactoCopiaB?.id).not.toBe('artefacto-b')
    expect(artefactoCopiaA?.id).not.toBe(artefactoCopiaB?.id)
  })

  it('preserva tipo, regimen, artefactoId, cantidad y origen', () => {
    const original = ufDePrueba({
      locales: [
        localDePrueba({
          tipo: 'cocina',
          regimen: 'noDomiciliario',
          artefactos: [artefactoDePrueba({ artefactoId: 'piletaDeCocina', cantidad: 3, origen: 'usuario' })],
        }),
      ],
    })

    const copia = duplicarUnidadFuncional(original)

    expect(copia.locales[0]?.tipo).toBe('cocina')
    expect(copia.locales[0]?.regimen).toBe('noDomiciliario')
    expect(copia.locales[0]?.artefactos[0]?.artefactoId).toBe('piletaDeCocina')
    expect(copia.locales[0]?.artefactos[0]?.cantidad).toBe(3)
    expect(copia.locales[0]?.artefactos[0]?.origen).toBe('usuario')
  })

  it('preserva la ausencia de regimen cuando corresponde', () => {
    const { regimen: _regimen, ...localSinRegimen } = localDePrueba()
    const original = ufDePrueba({ locales: [localSinRegimen] })

    const copia = duplicarUnidadFuncional(original)

    expect('regimen' in (copia.locales[0] ?? {})).toBe(false)
  })

  it('los arrays de Locales y Artefactos son objetos nuevos', () => {
    const original = ufDePrueba()

    const copia = duplicarUnidadFuncional(original)

    expect(copia.locales).not.toBe(original.locales)
    expect(copia.locales[0]?.artefactos).not.toBe(original.locales[0]?.artefactos)
  })

  it('UF, Locales y Artefactos clonados no son las mismas instancias que los originales', () => {
    const original = ufDePrueba()

    const copia = duplicarUnidadFuncional(original)

    expect(copia).not.toBe(original)
    expect(copia.locales[0]).not.toBe(original.locales[0])
    expect(copia.locales[0]?.artefactos[0]).not.toBe(original.locales[0]?.artefactos[0])
  })

  it('modificar posteriormente el clon no muta el original', () => {
    const original = ufDePrueba()

    const copia = duplicarUnidadFuncional(original)
    const copiaMutada: UnidadFuncional = {
      ...copia,
      locales: copia.locales.map((local) => ({
        ...local,
        artefactos: local.artefactos.map((artefacto) => ({ ...artefacto, cantidad: 99 })),
      })),
    }

    expect(copiaMutada.locales[0]?.artefactos[0]?.cantidad).toBe(99)
    expect(original.locales[0]?.artefactos[0]?.cantidad).toBe(2)
  })

  it('el nombre pasa de X a X (copia)', () => {
    const original = ufDePrueba({ nombre: 'Departamento 1º A' })

    const copia = duplicarUnidadFuncional(original)

    expect(copia.nombre).toBe('Departamento 1º A (copia)')
  })
})

describe('duplicarUnidadFuncionalEnProyecto', () => {
  function proyectoDePrueba(unidadesFuncionales: readonly UnidadFuncional[]): Proyecto {
    return {
      metadatos: {
        nombre: 'Proyecto de prueba',
        obra: 'Obra',
        comitente: 'Comitente',
        fecha: '2026-08-09',
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
    }
  }

  it('la UF clonada queda inmediatamente despues de la original', () => {
    const ufA = ufDePrueba({ id: 'uf-a', nombre: 'UF A' })
    const ufB = ufDePrueba({ id: 'uf-b', nombre: 'UF B' })
    const ufC = ufDePrueba({ id: 'uf-c', nombre: 'UF C' })
    const proyecto = proyectoDePrueba([ufA, ufB, ufC])

    const resultado = duplicarUnidadFuncionalEnProyecto(proyecto, 'uf-b')

    expect(resultado.unidadesFuncionales.map((uf) => uf.nombre)).toEqual([
      'UF A',
      'UF B',
      'UF B (copia)',
      'UF C',
    ])
  })

  it('proyecto.redHidraulica, si existe, no cambia ni se reconstruye', () => {
    const uf = ufDePrueba()
    const redHidraulica = { nodos: [], tramos: [] }
    const proyecto: Proyecto = { ...proyectoDePrueba([uf]), redHidraulica }

    const resultado = duplicarUnidadFuncionalEnProyecto(proyecto, uf.id)

    expect(resultado.redHidraulica).toBe(redHidraulica)
  })
})
