import { describe, it, expect } from 'vitest'
import type { Artefacto, Local, RegimenLocal, UnidadFuncional } from '../../../modelo/proyecto'
import type { ArtefactoResuelto } from '../topologia/resolverArtefactosReferenciados'
import { catalogoArtefactos } from '../../../normativa/eras-2023/catalogo-artefactos'
import { aplicarParticipacionCritA8 } from './aplicarParticipacionCritA8'

function artefacto(id: string, artefactoId: string): Artefacto {
  return { id, artefactoId, cantidad: 1, origen: 'normativo' }
}

function local(id: string, regimen: RegimenLocal, artefactos: readonly Artefacto[]): Local {
  return { id, tipo: 'bano', regimen, artefactos }
}

function resueltoDe(unidadFuncional: UnidadFuncional, localDelArtefacto: Local, unArtefacto: Artefacto): ArtefactoResuelto {
  return {
    referencia: {
      tipo: 'artefacto',
      unidadFuncionalId: unidadFuncional.id,
      localId: localDelArtefacto.id,
      artefactoId: unArtefacto.id,
    },
    unidadFuncional,
    local: localDelArtefacto,
    artefacto: unArtefacto,
  }
}

describe('aplicarParticipacionCritA8', () => {
  it('Local domiciliario + válvula + lavatorio: solo participa la válvula', () => {
    const valvula = artefacto('a-valvula', 'inodoroValvula')
    const lavatorio = artefacto('a-lavatorio', 'lavatorio')
    const loc = local('local-1', 'domiciliario', [valvula, lavatorio])
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'UF 1', niveles: [{ id: 'uf-1-nivel-1', nombre: 'Nivel 1', locales: [loc] }] }
    const resueltoValvula = resueltoDe(uf, loc, valvula)
    const resueltoLavatorio = resueltoDe(uf, loc, lavatorio)

    const resultado = aplicarParticipacionCritA8([resueltoValvula, resueltoLavatorio], catalogoArtefactos)

    expect(resultado).toEqual([resueltoValvula])
  })

  it('Local domiciliario sin válvula: participan todos', () => {
    const lavatorio = artefacto('a-lavatorio', 'lavatorio')
    const ducha = artefacto('a-ducha', 'receptaculoDucha')
    const loc = local('local-1', 'domiciliario', [lavatorio, ducha])
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'UF 1', niveles: [{ id: 'uf-1-nivel-1', nombre: 'Nivel 1', locales: [loc] }] }
    const resueltoLavatorio = resueltoDe(uf, loc, lavatorio)
    const resueltoDucha = resueltoDe(uf, loc, ducha)

    const resultado = aplicarParticipacionCritA8([resueltoLavatorio, resueltoDucha], catalogoArtefactos)

    expect(resultado).toEqual([resueltoLavatorio, resueltoDucha])
  })

  it('Local no domiciliario + válvula + otros: CRIT-A8 no aplica, participan todos', () => {
    const valvula = artefacto('a-valvula', 'inodoroValvula')
    const lavatorio = artefacto('a-lavatorio', 'lavatorio')
    const loc = local('local-1', 'noDomiciliario', [valvula, lavatorio])
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'UF 1', niveles: [{ id: 'uf-1-nivel-1', nombre: 'Nivel 1', locales: [loc] }] }
    const resueltoValvula = resueltoDe(uf, loc, valvula)
    const resueltoLavatorio = resueltoDe(uf, loc, lavatorio)

    const resultado = aplicarParticipacionCritA8([resueltoValvula, resueltoLavatorio], catalogoArtefactos)

    expect(resultado).toEqual([resueltoValvula, resueltoLavatorio])
  })

  it('subconjunto parcial (CRIT-A13): el Local real tiene válvula + lavatorio, pero solo se recibe el lavatorio', () => {
    const valvula = artefacto('a-valvula', 'inodoroValvula')
    const lavatorio = artefacto('a-lavatorio', 'lavatorio')
    // local.artefactos contiene AMBOS (inventario físico real del Local),
    // pero el conjunto recibido por la función (más abajo) solo trae el
    // lavatorio -- exactamente el caso que CRIT-A13 exige no resolver
    // consultando local.artefactos.
    const loc = local('local-1', 'domiciliario', [valvula, lavatorio])
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'UF 1', niveles: [{ id: 'uf-1-nivel-1', nombre: 'Nivel 1', locales: [loc] }] }
    const resueltoLavatorio = resueltoDe(uf, loc, lavatorio)

    const resultado = aplicarParticipacionCritA8([resueltoLavatorio], catalogoArtefactos)

    expect(resultado).toEqual([resueltoLavatorio])
  })

  it('tramo común: el conjunto recibido trae válvula y lavatorio del mismo Local, solo participa la válvula', () => {
    const valvula = artefacto('a-valvula', 'inodoroValvula')
    const lavatorio = artefacto('a-lavatorio', 'lavatorio')
    const loc = local('local-1', 'domiciliario', [valvula, lavatorio])
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'UF 1', niveles: [{ id: 'uf-1-nivel-1', nombre: 'Nivel 1', locales: [loc] }] }
    const resueltoValvula = resueltoDe(uf, loc, valvula)
    const resueltoLavatorio = resueltoDe(uf, loc, lavatorio)

    const resultado = aplicarParticipacionCritA8([resueltoValvula, resueltoLavatorio], catalogoArtefactos)

    expect(resultado).toEqual([resueltoValvula])
  })

  it('mismo localId en UFs distintas: CRIT-A8 de una UF no afecta a la otra', () => {
    const valvula1 = artefacto('a-valvula-1', 'inodoroValvula')
    const lavatorio1 = artefacto('a-lavatorio-1', 'lavatorio')
    const local1 = local('local-bano', 'domiciliario', [valvula1, lavatorio1])
    const uf1: UnidadFuncional = { id: 'uf-1', nombre: 'UF 1', niveles: [{ id: 'uf-1-nivel-1', nombre: 'Nivel 1', locales: [local1] }] }

    const lavatorio2 = artefacto('a-lavatorio-2', 'lavatorio')
    const local2 = local('local-bano', 'domiciliario', [lavatorio2])
    const uf2: UnidadFuncional = { id: 'uf-2', nombre: 'UF 2', niveles: [{ id: 'uf-2-nivel-1', nombre: 'Nivel 1', locales: [local2] }] }

    const resueltoValvula1 = resueltoDe(uf1, local1, valvula1)
    const resueltoLavatorio1 = resueltoDe(uf1, local1, lavatorio1)
    const resueltoLavatorio2 = resueltoDe(uf2, local2, lavatorio2)

    const resultado = aplicarParticipacionCritA8(
      [resueltoValvula1, resueltoLavatorio1, resueltoLavatorio2],
      catalogoArtefactos,
    )

    expect(resultado).toEqual([resueltoValvula1, resueltoLavatorio2])
  })

  it('múltiples Locales intercalados: evaluación independiente y orden relativo de entrada preservado', () => {
    const localA = local('local-a', 'domiciliario', [])
    const ufA: UnidadFuncional = { id: 'uf-a', nombre: 'UF A', niveles: [{ id: 'uf-a-nivel-1', nombre: 'Nivel 1', locales: [localA] }] }
    const a1 = artefacto('a1', 'lavatorio')
    const a2 = artefacto('a2', 'inodoroValvula')

    const localB = local('local-b', 'noDomiciliario', [])
    const ufB: UnidadFuncional = { id: 'uf-b', nombre: 'UF B', niveles: [{ id: 'uf-b-nivel-1', nombre: 'Nivel 1', locales: [localB] }] }
    const b1 = artefacto('b1', 'lavatorio')
    const b2 = artefacto('b2', 'receptaculoDucha')

    const resueltoA1 = resueltoDe(ufA, localA, a1)
    const resueltoB1 = resueltoDe(ufB, localB, b1)
    const resueltoA2 = resueltoDe(ufA, localA, a2)
    const resueltoB2 = resueltoDe(ufB, localB, b2)

    // entrada: A1, B1, A2, B2 -- Local A domiciliario con válvula (A2)
    // suprime a A1; Local B no domiciliario conserva B1 y B2 enteros.
    const resultado = aplicarParticipacionCritA8(
      [resueltoA1, resueltoB1, resueltoA2, resueltoB2],
      catalogoArtefactos,
    )

    expect(resultado).toEqual([resueltoB1, resueltoA2, resueltoB2])
  })

  it('varias válvulas automáticas en el mismo grupo: sobreviven todas, no solo una', () => {
    const valvula1 = artefacto('a-valvula-1', 'inodoroValvula')
    const valvula2 = artefacto('a-valvula-2', 'inodoroValvula')
    const lavatorio = artefacto('a-lavatorio', 'lavatorio')
    const loc = local('local-1', 'domiciliario', [valvula1, valvula2, lavatorio])
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'UF 1', niveles: [{ id: 'uf-1-nivel-1', nombre: 'Nivel 1', locales: [loc] }] }
    const resueltoValvula1 = resueltoDe(uf, loc, valvula1)
    const resueltoValvula2 = resueltoDe(uf, loc, valvula2)
    const resueltoLavatorio = resueltoDe(uf, loc, lavatorio)

    const resultado = aplicarParticipacionCritA8(
      [resueltoValvula1, resueltoValvula2, resueltoLavatorio],
      catalogoArtefactos,
    )

    expect(resultado).toEqual([resueltoValvula1, resueltoValvula2])
  })

  it('array vacío: devuelve array vacío sin excepción', () => {
    const resultado = aplicarParticipacionCritA8([], catalogoArtefactos)

    expect(resultado).toEqual([])
  })

  it('preserva la identidad de los objetos sobrevivientes (no reconstruye)', () => {
    const valvula = artefacto('a-valvula', 'inodoroValvula')
    const lavatorio = artefacto('a-lavatorio', 'lavatorio')
    const loc = local('local-1', 'domiciliario', [valvula, lavatorio])
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'UF 1', niveles: [{ id: 'uf-1-nivel-1', nombre: 'Nivel 1', locales: [loc] }] }
    const resueltoValvula = resueltoDe(uf, loc, valvula)
    const resueltoLavatorio = resueltoDe(uf, loc, lavatorio)

    const resultado = aplicarParticipacionCritA8([resueltoValvula, resueltoLavatorio], catalogoArtefactos)

    expect(resultado[0]).toBe(resueltoValvula)
    expect(resultado).toHaveLength(1)
  })
})
