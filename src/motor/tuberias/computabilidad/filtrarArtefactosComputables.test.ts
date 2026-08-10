import { describe, it, expect } from 'vitest'
import type { Artefacto, Local, UnidadFuncional } from '../../../modelo/proyecto'
import type { ReferenciaDeArtefacto } from '../../../modelo/redHidraulica'
import type { ArtefactoResuelto } from '../topologia/resolverArtefactosReferenciados'
import { filtrarArtefactosComputables } from './filtrarArtefactosComputables'

function resueltoCon(
  artefacto: Artefacto,
  overrides: { local?: Partial<Local> } = {},
): ArtefactoResuelto {
  const local: Local = {
    id: 'local-x',
    tipo: 'bano',
    regimen: 'domiciliario',
    artefactos: [artefacto],
    ...overrides.local,
  }
  const unidadFuncional: UnidadFuncional = { id: 'uf-1', nombre: 'UF 1', locales: [local] }
  const referencia: ReferenciaDeArtefacto = {
    tipo: 'artefacto',
    unidadFuncionalId: unidadFuncional.id,
    localId: local.id,
    artefactoId: artefacto.id,
  }

  return { referencia, unidadFuncional, local, artefacto }
}

describe('filtrarArtefactosComputables', () => {
  it('conserva todos cuando todos son origen normativo', () => {
    const resueltoA = resueltoCon({ id: 'a', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' })
    const resueltoB = resueltoCon({ id: 'b', artefactoId: 'bidet', cantidad: 1, origen: 'normativo' })

    const resultado = filtrarArtefactosComputables([resueltoA, resueltoB])

    expect(resultado).toEqual([resueltoA, resueltoB])
  })

  it('conserva solo los de origen normativo ante una mezcla normativo/usuario', () => {
    const normativo = resueltoCon({ id: 'a', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' })
    const usuario = resueltoCon({ id: 'b', artefactoId: 'artefactoPersonalizado', cantidad: 1, origen: 'usuario' })

    const resultado = filtrarArtefactosComputables([normativo, usuario])

    expect(resultado).toEqual([normativo])
  })

  it('devuelve array vacio si ninguno es computable', () => {
    const usuarioA = resueltoCon({ id: 'a', artefactoId: 'artefactoPersonalizado', cantidad: 1, origen: 'usuario' })
    const usuarioB = resueltoCon({ id: 'b', artefactoId: 'otroPersonalizado', cantidad: 1, origen: 'usuario' })

    const resultado = filtrarArtefactosComputables([usuarioA, usuarioB])

    expect(resultado).toEqual([])
  })

  it('preserva el orden de entrada', () => {
    const resueltoB = resueltoCon({ id: 'b', artefactoId: 'bidet', cantidad: 1, origen: 'normativo' })
    const resueltoA = resueltoCon({ id: 'a', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' })

    const resultado = filtrarArtefactosComputables([resueltoB, resueltoA])

    expect(resultado[0]).toBe(resueltoB)
    expect(resultado[1]).toBe(resueltoA)
  })

  it('preserva la identidad de los objetos ArtefactoResuelto (no reconstruye)', () => {
    const resuelto = resueltoCon({ id: 'a', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' })

    const [resultado] = filtrarArtefactosComputables([resuelto])

    expect(resultado).toBe(resuelto)
  })

  it('no deduplica entradas repetidas', () => {
    const resuelto = resueltoCon({ id: 'a', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' })

    const resultado = filtrarArtefactosComputables([resuelto, resuelto])

    expect(resultado).toHaveLength(2)
    expect(resultado[0]).toBe(resuelto)
    expect(resultado[1]).toBe(resuelto)
  })

  it('no depende de Local.regimen ni de otros artefactos del mismo Local (fuera de alcance: CRIT-A8)', () => {
    // Escenario deliberadamente compatible con CRIT-A8 (regimen domiciliario +
    // inodoro con valvula automatica en el mismo Local) para verificar que
    // filtrarArtefactosComputables lo ignora por completo: este Slice 4 no
    // aplica CRIT-A8, solo mira artefacto.origen.
    const inodoroValvula: Artefacto = {
      id: 'inodoro',
      artefactoId: 'inodoroValvulaAutomatica',
      cantidad: 1,
      origen: 'normativo',
    }
    const otroArtefactoDelMismoLocal: Artefacto = {
      id: 'lavatorio',
      artefactoId: 'lavatorio',
      cantidad: 1,
      origen: 'normativo',
    }
    const local: Local = {
      id: 'local-bano',
      tipo: 'bano',
      regimen: 'domiciliario',
      artefactos: [inodoroValvula, otroArtefactoDelMismoLocal],
    }
    const unidadFuncional: UnidadFuncional = { id: 'uf-1', nombre: 'UF 1', locales: [local] }
    const resueltoLavatorio: ArtefactoResuelto = {
      referencia: {
        tipo: 'artefacto',
        unidadFuncionalId: unidadFuncional.id,
        localId: local.id,
        artefactoId: otroArtefactoDelMismoLocal.id,
      },
      unidadFuncional,
      local,
      artefacto: otroArtefactoDelMismoLocal,
    }

    // Si CRIT-A8 se aplicara aca, "lavatorio" quedaria excluido porque el
    // Local tiene un inodoro con valvula automatica en regimen domiciliario.
    // filtrarArtefactosComputables debe conservarlo de todos modos, porque
    // su unico criterio es artefacto.origen === 'normativo'.
    const resultado = filtrarArtefactosComputables([resueltoLavatorio])

    expect(resultado).toEqual([resueltoLavatorio])
  })
})
