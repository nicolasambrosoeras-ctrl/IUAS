// UI-M1-MULTINIVEL-01: una Unidad Funcional puede tener uno o más niveles
// físicos (PB/PA, dúplex, etc.), cada uno con sus propios Locales y su
// propia cota de piso. Cubre lo que no cubren ya los tests migrados de
// agregarUnidadFuncional/duplicarUnidadFuncional/resolverCotaHidraulicaDeArtefacto
// (que siguen siendo válidos para el caso de UF de un único nivel):
// agregar nivel, eliminar nivel (con reconciliación M2), y herencia de
// cota cuando la UF tiene 2+ niveles con Locales reales.
import { describe, it, expect } from 'vitest'
import type { Local, Nivel, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { agregarNivelAUnidadFuncional, agregarNivelAUnidadFuncionalEnProyecto } from './agregarNivelAUnidadFuncional'
import { eliminarNivelDeUnidadFuncionalEnProyecto } from './eliminarNivelDeUnidadFuncional'
import { resumenDeUnidadFuncional } from './resumenDeUnidadFuncional'
import {
  resolverCotaHidraulicaEfectivaDeArtefacto,
  resolverNivelDeLocal,
} from '../../motor/tuberias/geometria/resolverCotaHidraulicaDeArtefacto'
import { validarRedHidraulica } from '../../validacion/redHidraulica'
import { auditarCoberturaFisica } from '../../motor/tuberias/cobertura/auditarCoberturaFisica'

function local(id: string, overrides: Partial<Local> = {}): Local {
  return { id, tipo: 'bano', regimen: 'domiciliario', artefactos: [], ...overrides }
}

function nivel(id: string, overrides: Partial<Nivel> = {}): Nivel {
  return { id, nombre: id, locales: [], ...overrides }
}

function ufDePrueba(overrides: Partial<UnidadFuncional> = {}): UnidadFuncional {
  return { id: 'uf-1', nombre: 'Unidad funcional 1', niveles: [nivel('nivel-1')], ...overrides }
}

function proyectoCon(unidadesFuncionales: readonly UnidadFuncional[], redHidraulica?: RedHidraulica): Proyecto {
  return {
    metadatos: {
      nombre: 'Proyecto de prueba',
      obra: 'Obra',
      comitente: 'Comitente',
      fecha: '2026-09-11',
      schemaVersion: '1.0.0',
      versionNormativa: 'eras-2023',
    },
    parametros: { tipoDeProyecto: 'viviendaIndividual', presionSobreAcera_m: 2, alturaArtefactoMasDesfavorable_m: 3 },
    unidadesFuncionales,
    ...(redHidraulica !== undefined ? { redHidraulica } : {}),
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'estimado',
      granularidadHidraulica: 'simplificada',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

describe('agregarNivelAUnidadFuncional', () => {
  it('una UF simple nace con UN nivel', () => {
    const uf = ufDePrueba()
    expect(uf.niveles).toHaveLength(1)
  })

  it('agrega un nuevo nivel vacío (sin Locales), con id propio y nivel siguiente al orden de creación', () => {
    const uf = ufDePrueba()
    const conDosNiveles = agregarNivelAUnidadFuncional(uf)

    expect(conDosNiveles.niveles).toHaveLength(2)
    expect(conDosNiveles.niveles[1]!.locales).toEqual([])
    expect(conDosNiveles.niveles[1]!.id).not.toBe(conDosNiveles.niveles[0]!.id)
    expect(conDosNiveles.niveles[1]!.nivel).toBe(1)
    // Mismo default de cota que crearUnidadFuncionalVacia (3 * nivel).
    expect(conDosNiveles.niveles[1]!.cotaHidraulicaReferencia_m).toBe(3)
  })

  it('no toca el primer nivel ni sus Locales', () => {
    const uf = ufDePrueba({ niveles: [nivel('nivel-1', { locales: [local('local-1')] })] })
    const conDosNiveles = agregarNivelAUnidadFuncional(uf)

    expect(conDosNiveles.niveles[0]).toBe(uf.niveles[0])
  })

  it('agregarNivelAUnidadFuncionalEnProyecto: UF inexistente devuelve el proyecto sin cambios', () => {
    const proyecto = proyectoCon([ufDePrueba()])
    const resultado = agregarNivelAUnidadFuncionalEnProyecto(proyecto, 'uf-inexistente')
    expect(resultado).toBe(proyecto)
  })

  it('agregarNivelAUnidadFuncionalEnProyecto: agrega el nivel a la UF correcta dentro del proyecto', () => {
    const proyecto = proyectoCon([ufDePrueba({ id: 'uf-1' }), ufDePrueba({ id: 'uf-2' })])
    const resultado = agregarNivelAUnidadFuncionalEnProyecto(proyecto, 'uf-2')

    expect(resultado.unidadesFuncionales[0]!.niveles).toHaveLength(1)
    expect(resultado.unidadesFuncionales[1]!.niveles).toHaveLength(2)
  })
})

describe('eliminarNivelDeUnidadFuncionalEnProyecto', () => {
  it('una UF de un único nivel nunca queda con 0 niveles: eliminar el único nivel es un no-op', () => {
    const proyecto = proyectoCon([ufDePrueba()])
    const resultado = eliminarNivelDeUnidadFuncionalEnProyecto(proyecto, 'uf-1', 'nivel-1')

    expect(resultado).toBe(proyecto)
    expect(resultado.unidadesFuncionales[0]!.niveles).toHaveLength(1)
  })

  it('con 2+ niveles, elimina el nivel pedido y sus Locales -- el resto de la UF queda intacto', () => {
    const uf = ufDePrueba({
      niveles: [
        nivel('nivel-pb', { locales: [local('local-cocina')] }),
        nivel('nivel-pa', { locales: [local('local-bano')] }),
      ],
    })
    const proyecto = proyectoCon([uf])

    const resultado = eliminarNivelDeUnidadFuncionalEnProyecto(proyecto, 'uf-1', 'nivel-pa')

    expect(resultado.unidadesFuncionales[0]!.niveles).toHaveLength(1)
    expect(resultado.unidadesFuncionales[0]!.niveles[0]!.id).toBe('nivel-pb')
  })

  it('nivelId inexistente devuelve el proyecto sin cambios', () => {
    const uf = ufDePrueba({ niveles: [nivel('nivel-pb'), nivel('nivel-pa')] })
    const proyecto = proyectoCon([uf])

    const resultado = eliminarNivelDeUnidadFuncionalEnProyecto(proyecto, 'uf-1', 'nivel-inexistente')

    expect(resultado).toBe(proyecto)
  })

  // FIX-M1-MULTINIVEL-BASE-LEVEL-01: el nivel base (niveles[0]) es
  // permanente -- protegido por el propio helper de dominio, no sólo por
  // la UI que no ofrece la acción para él.
  it('el nivel base (niveles[0]) nunca se elimina, aunque la UF tenga varios niveles adicionales', () => {
    const uf = ufDePrueba({
      niveles: [nivel('nivel-base', { nombre: 'PB' }), nivel('nivel-b', { nombre: 'PA' })],
    })
    const proyecto = proyectoCon([uf])

    const resultado = eliminarNivelDeUnidadFuncionalEnProyecto(proyecto, 'uf-1', 'nivel-base')

    expect(resultado).toBe(proyecto)
    expect(resultado.unidadesFuncionales[0]!.niveles.map((n) => n.id)).toEqual(['nivel-base', 'nivel-b'])
  })

  it('con 3 niveles, eliminar el del medio preserva el base primero y el último sigue eliminable', () => {
    const uf = ufDePrueba({
      niveles: [nivel('nivel-a'), nivel('nivel-b'), nivel('nivel-c')],
    })
    const proyecto = proyectoCon([uf])

    const sinB = eliminarNivelDeUnidadFuncionalEnProyecto(proyecto, 'uf-1', 'nivel-b')
    expect(sinB.unidadesFuncionales[0]!.niveles.map((n) => n.id)).toEqual(['nivel-a', 'nivel-c'])

    // El base sigue protegido incluso después de eliminar un adicional.
    const intentoBase = eliminarNivelDeUnidadFuncionalEnProyecto(sinB, 'uf-1', 'nivel-a')
    expect(intentoBase).toBe(sinB)

    // El último adicional restante sigue siendo eliminable normalmente.
    const soloBase = eliminarNivelDeUnidadFuncionalEnProyecto(sinB, 'uf-1', 'nivel-c')
    expect(soloBase.unidadesFuncionales[0]!.niveles.map((n) => n.id)).toEqual(['nivel-a'])
  })

  it('reconciliación M2: desconecta la conectividad física de los Locales del nivel eliminado -- sin referencias huérfanas', () => {
    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'Unidad funcional 1',
      niveles: [
        nivel('nivel-pb', {
          nivel: 0,
          locales: [
            local('local-pb', {
              artefactos: [{ id: 'art-pb', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }],
            }),
          ],
        }),
        nivel('nivel-pa', {
          nivel: 1,
          locales: [
            local('local-pa', {
              artefactos: [{ id: 'art-pa', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }],
            }),
          ],
        }),
      ],
    }
    const nodos: Nodo[] = [
      { id: 'raiz' },
      { id: 'n-pb', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-pb', artefactoId: 'art-pb' } },
      { id: 'n-pa', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-pa', artefactoId: 'art-pa' } },
    ]
    const tramos: Tramo[] = [
      { id: 't-pb', nodoOrigenId: 'raiz', nodoDestinoId: 'n-pb', red: 'AF' },
      { id: 't-pa', nodoOrigenId: 'raiz', nodoDestinoId: 'n-pa', red: 'AF' },
    ]
    const proyecto = proyectoCon([uf], { nodos, tramos })

    const resultado = eliminarNivelDeUnidadFuncionalEnProyecto(proyecto, 'uf-1', 'nivel-pa')

    expect(validarRedHidraulica(resultado)).toEqual([])
    expect(auditarCoberturaFisica(resultado).completa).toBe(true)
    expect(resultado.redHidraulica!.nodos.some((n) => n.id === 'n-pa')).toBe(false)
    // El nivel PB (no eliminado) sigue completo y conectado.
    expect(resultado.redHidraulica!.nodos.some((n) => n.id === 'n-pb')).toBe(true)
  })
})

describe('resumenDeUnidadFuncional -- UF multinivel', () => {
  it('con un único nivel, nivelTexto sigue mostrando ese nivel (compatibilidad -- sección 9)', () => {
    const uf = ufDePrueba({ niveles: [nivel('nivel-1', { nivel: 0, locales: [local('local-1')] })] })
    expect(resumenDeUnidadFuncional(uf).nivelTexto).toBe('PB')
  })

  it('con 2+ niveles, nivelTexto muestra la cantidad de niveles en vez de un único nivel', () => {
    const uf = ufDePrueba({ niveles: [nivel('nivel-pb', { nivel: 0 }), nivel('nivel-pa', { nivel: 1 })] })
    expect(resumenDeUnidadFuncional(uf).nivelTexto).toBe('2 niveles')
  })

  it('cuenta Locales y artefactos across TODOS los niveles, no sólo el primero', () => {
    const uf = ufDePrueba({
      niveles: [
        nivel('nivel-pb', {
          locales: [local('local-cocina', { artefactos: [{ id: 'a1', artefactoId: 'lavatorio', cantidad: 2, origen: 'normativo' }] }) ],
        }),
        nivel('nivel-pa', {
          locales: [local('local-bano', { artefactos: [{ id: 'a2', artefactoId: 'bidet', cantidad: 1, origen: 'normativo' }] })],
        }),
      ],
    })
    const resumen = resumenDeUnidadFuncional(uf)
    expect(resumen.cantidadLocales).toBe(2)
    expect(resumen.cantidadArtefactos).toBe(3)
  })
})

// GEOM-COTA-01 (sección 19-20 del brief): con una UF de 2 niveles, cada
// Local hereda la cota de SU PROPIO Nivel, nunca de otro nivel de la misma
// UF -- cambiar la cota de un Nivel no contamina al otro, y un override de
// Local sobrevive al cambio de cota de su Nivel.
describe('herencia de cota Nivel -> Local -> Artefacto en una UF multinivel', () => {
  function ufDuplex(): UnidadFuncional {
    return {
      id: 'uf-1',
      nombre: 'Unidad funcional 1',
      niveles: [
        nivel('nivel-pb', {
          nombre: 'Planta Baja',
          nivel: 0,
          cotaHidraulicaReferencia_m: 0,
          locales: [local('local-cocina')],
        }),
        nivel('nivel-pa', {
          nombre: 'Planta Alta',
          nivel: 1,
          cotaHidraulicaReferencia_m: 3,
          locales: [local('local-bano', { cotaPiso_m: 3.15 })],
        }),
      ],
    }
  }

  it('el Local de PB hereda la cota de PB, el de PA hereda la cota de PA', () => {
    const uf = ufDuplex()
    const nivelPB = uf.niveles[0]!
    const nivelPA = uf.niveles[1]!
    const localCocina = nivelPB.locales[0]!
    const localBano = nivelPA.locales[0]!
    const artefacto = { artefactoId: 'lavatorio' } as const

    expect(resolverCotaHidraulicaEfectivaDeArtefacto(nivelPB, localCocina, artefacto)).toBeCloseTo(0.9, 10)
    // Baño con override 3.15 (no hereda la cota 3 de PA) + lavatorio 0.90.
    expect(resolverCotaHidraulicaEfectivaDeArtefacto(nivelPA, localBano, artefacto)).toBeCloseTo(4.05, 10)
  })

  it('resolverNivelDeLocal encuentra el Nivel correcto por id de Local, sin ambigüedad entre niveles', () => {
    const uf = ufDuplex()
    expect(resolverNivelDeLocal(uf, 'local-cocina')?.id).toBe('nivel-pb')
    expect(resolverNivelDeLocal(uf, 'local-bano')?.id).toBe('nivel-pa')
    expect(resolverNivelDeLocal(uf, 'local-inexistente')).toBeUndefined()
  })

  it('cambiar la cota de un Nivel no afecta al otro Nivel de la misma UF', () => {
    const uf = ufDuplex()
    const nivelPBEditado: Nivel = { ...uf.niveles[0]!, cotaHidraulicaReferencia_m: 0.5 }
    const ufEditada: UnidadFuncional = { ...uf, niveles: [nivelPBEditado, uf.niveles[1]!] }

    // PA no se tocó.
    expect(ufEditada.niveles[1]!.cotaHidraulicaReferencia_m).toBe(3)
  })
})
