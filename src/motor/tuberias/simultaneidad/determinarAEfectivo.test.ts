import { describe, it, expect } from 'vitest'
import type { Artefacto, Local, TipoDeProyecto, UnidadFuncional } from '../../../modelo/proyecto'
import type { ArtefactoResuelto } from '../topologia/resolverArtefactosReferenciados'
import type { AporteDeDemanda } from '../aporte/resolverAportesDeDemanda'
import { determinarAEfectivo } from './determinarAEfectivo'

function aporteCon(
  unidadFuncionalId: string,
  localId: string,
  idInstancia: string,
  cantidad: number,
): AporteDeDemanda {
  const artefacto: Artefacto = { id: idInstancia, artefactoId: 'lavatorio', cantidad, origen: 'normativo' }
  const local: Local = { id: localId, tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto] }
  const unidadFuncional: UnidadFuncional = { id: unidadFuncionalId, nombre: unidadFuncionalId, locales: [local] }

  const artefactoResuelto: ArtefactoResuelto = {
    referencia: { tipo: 'artefacto', unidadFuncionalId, localId, artefactoId: idInstancia },
    unidadFuncional,
    local,
    artefacto,
  }

  return { artefactoResuelto, cantidad, quTotal_lps: 0.2 }
}

describe('determinarAEfectivo — viviendaMultifamiliar', () => {
  it('una UF: aEfectivo = 1', () => {
    const aportes = [
      aporteCon('uf-1', 'local-1', 'a-1', 1),
      aporteCon('uf-1', 'local-1', 'a-2', 1),
    ]

    expect(determinarAEfectivo('viviendaMultifamiliar', aportes)).toBe(1)
  })

  it('misma UF repetida con distintos Locales/Artefactos intercalados: sigue 1', () => {
    const aportes = [
      aporteCon('uf-1', 'local-1', 'a-1', 1),
      aporteCon('uf-1', 'local-2', 'a-2', 1),
      aporteCon('uf-1', 'local-1', 'a-3', 1),
      aporteCon('uf-1', 'local-3', 'a-4', 1),
    ]

    expect(determinarAEfectivo('viviendaMultifamiliar', aportes)).toBe(1)
  })

  it('dos UF distintas: aEfectivo = 2', () => {
    const aportes = [
      aporteCon('uf-1', 'local-1', 'a-1', 1),
      aporteCon('uf-2', 'local-1', 'a-2', 1),
    ]

    expect(determinarAEfectivo('viviendaMultifamiliar', aportes)).toBe(2)
  })

  it('más de dos UF distintas: sigue 2 (regla binaria, no proporcional)', () => {
    const aportes = [
      aporteCon('uf-1', 'local-1', 'a-1', 1),
      aporteCon('uf-2', 'local-1', 'a-2', 1),
      aporteCon('uf-3', 'local-1', 'a-3', 1),
      aporteCon('uf-4', 'local-1', 'a-4', 1),
    ]

    expect(determinarAEfectivo('viviendaMultifamiliar', aportes)).toBe(2)
  })

  it('no cuenta cantidad: una UF con cantidad=10 sigue dando 1', () => {
    const aportes = [aporteCon('uf-1', 'local-1', 'a-1', 10)]

    expect(determinarAEfectivo('viviendaMultifamiliar', aportes)).toBe(1)
  })

  it('conjunto vacío: lanza excepción (0 UF no es "1 UF")', () => {
    expect(() => determinarAEfectivo('viviendaMultifamiliar', [])).toThrow()
  })

  it('el error de conjunto vacío es explícito sobre la causa', () => {
    expect(() => determinarAEfectivo('viviendaMultifamiliar', [])).toThrow(/vivienda multifamiliar/)
  })
})

describe('determinarAEfectivo — otras tipologías (sin regla residencial)', () => {
  it('oficinaPublica con una sola UF: aEfectivo = 2 (no es la excepción multifamiliar)', () => {
    const aportes = [
      aporteCon('uf-1', 'local-1', 'a-1', 1),
      aporteCon('uf-1', 'local-1', 'a-2', 1),
    ]

    expect(determinarAEfectivo('oficinaPublica', aportes)).toBe(2)
  })

  it('centroEducativo con una sola UF: aEfectivo = 2 (no es la excepción multifamiliar)', () => {
    const aportes = [aporteCon('uf-1', 'local-1', 'a-1', 1)]

    expect(determinarAEfectivo('centroEducativo', aportes)).toBe(2)
  })

  it.each<[TipoDeProyecto, 1 | 2 | 3 | 4]>([
    ['oficinaPrivada', 1],
    ['viviendaIndividual', 1],
    ['oficinaPublica', 2],
    ['centroEducativo', 2],
    ['edificioPublico', 3],
    ['aeropuerto', 3],
    ['centroDeSalud', 3],
    ['centroDeDetencion', 4],
    ['centroDeportivo', 4],
    ['centroComercial', 4],
    ['terminalDePasajeros', 4],
  ])('%s: aEfectivo = aBase = %i', (tipoDeProyecto, aBaseEsperado) => {
    expect(determinarAEfectivo(tipoDeProyecto, [])).toBe(aBaseEsperado)
  })

  it('conjunto vacío en tipología no multifamiliar: devuelve aBase, no lanza', () => {
    expect(determinarAEfectivo('oficinaPrivada', [])).toBe(1)
  })
})

describe('determinarAEfectivo — no mutación', () => {
  it('no modifica el array de aportes ni sus objetos', () => {
    const aportes = [
      aporteCon('uf-1', 'local-1', 'a-1', 1),
      aporteCon('uf-2', 'local-1', 'a-2', 1),
    ]
    const copiaSuperficial = [...aportes]
    const primerAporteOriginal = aportes[0]

    determinarAEfectivo('viviendaMultifamiliar', aportes)

    expect(aportes).toEqual(copiaSuperficial)
    expect(aportes[0]).toBe(primerAporteOriginal)
  })
})
