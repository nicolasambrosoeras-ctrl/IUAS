import { describe, it, expect } from 'vitest'
import type { Artefacto, Local, UnidadFuncional } from '../../../modelo/proyecto'
import type { ArtefactoResuelto } from '../topologia/resolverArtefactosReferenciados'
import { catalogoArtefactos } from '../../../normativa/eras-2023/catalogo-artefactos'
import { resolverAportesDeDemanda } from './resolverAportesDeDemanda'

function resueltoCon(artefactoId: string, cantidad: number, idInstancia = 'artefacto-1'): ArtefactoResuelto {
  const artefacto: Artefacto = { id: idInstancia, artefactoId, cantidad, origen: 'normativo' }
  const local: Local = { id: 'local-1', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto] }
  const unidadFuncional: UnidadFuncional = { id: 'uf-1', nombre: 'UF 1', locales: [local] }

  return {
    referencia: { tipo: 'artefacto', unidadFuncionalId: unidadFuncional.id, localId: local.id, artefactoId: idInstancia },
    unidadFuncional,
    local,
    artefacto,
  }
}

describe('resolverAportesDeDemanda', () => {
  it('un artefacto: resuelve cantidad y quTotal_lps desde catálogo', () => {
    const resuelto = resueltoCon('lavatorio', 1)

    const [aporte] = resolverAportesDeDemanda([resuelto], catalogoArtefactos)

    expect(aporte?.cantidad).toBe(1)
    expect(aporte?.quTotal_lps).toBe(0.2)
  })

  it('varios artefactos: resuelve cada uno correctamente', () => {
    const resueltoLavatorio = resueltoCon('lavatorio', 1, 'a-1')
    const resueltoValvula = resueltoCon('inodoroValvula', 1, 'a-2')

    const aportes = resolverAportesDeDemanda([resueltoLavatorio, resueltoValvula], catalogoArtefactos)

    expect(aportes[0]?.quTotal_lps).toBe(0.2)
    expect(aportes[1]?.quTotal_lps).toBe(1.5)
  })

  it('preserva el orden de entrada', () => {
    const resueltoB = resueltoCon('banera', 1, 'a-b')
    const resueltoA = resueltoCon('lavatorio', 1, 'a-a')

    const aportes = resolverAportesDeDemanda([resueltoB, resueltoA], catalogoArtefactos)

    expect(aportes[0]?.artefactoResuelto).toBe(resueltoB)
    expect(aportes[1]?.artefactoResuelto).toBe(resueltoA)
  })

  it('cantidad > 1 se conserva sin expandir', () => {
    const resuelto = resueltoCon('lavatorio', 5)

    const aportes = resolverAportesDeDemanda([resuelto], catalogoArtefactos)

    expect(aportes).toHaveLength(1)
    expect(aportes[0]?.cantidad).toBe(5)
  })

  it('preserva artefactoResuelto por identidad', () => {
    const resuelto = resueltoCon('lavatorio', 1)

    const [aporte] = resolverAportesDeDemanda([resuelto], catalogoArtefactos)

    expect(aporte?.artefactoResuelto).toBe(resuelto)
  })

  it('referencia repetida en la entrada: produce dos aportes, sin deduplicar', () => {
    const resuelto = resueltoCon('lavatorio', 1)

    const aportes = resolverAportesDeDemanda([resuelto, resuelto], catalogoArtefactos)

    expect(aportes).toHaveLength(2)
    expect(aportes[0]?.artefactoResuelto).toBe(resuelto)
    expect(aportes[1]?.artefactoResuelto).toBe(resuelto)
  })

  it('entrada vacía: devuelve array vacío', () => {
    const aportes = resolverAportesDeDemanda([], catalogoArtefactos)

    expect(aportes).toEqual([])
  })

  it('referencia inexistente en catálogo: lanza excepción', () => {
    const resuelto = resueltoCon('artefactoInexistente', 1)

    expect(() => resolverAportesDeDemanda([resuelto], catalogoArtefactos)).toThrow()
  })

  it('el error de catálogo identifica el artefactoId', () => {
    const resuelto = resueltoCon('artefactoInexistente', 1)

    expect(() => resolverAportesDeDemanda([resuelto], catalogoArtefactos)).toThrow(/artefactoInexistente/)
  })
})
