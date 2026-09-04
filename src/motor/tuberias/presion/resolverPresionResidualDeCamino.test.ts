// Orquestador de balance de presion sobre un camino: se verifican los
// estados de corte de cada etapa (topologia, terminal/Pmin, desnivel,
// perdida distribuida) y que la barrera de completitud sigue diciendo la
// verdad -- con hfLocalizada/hfMedidor sin consumidor topologico todavia,
// el resultado es siempre 'balanceIncompleto', nunca una residual
// presentada como verificada.
import { describe, it, expect } from 'vitest'
import type { Artefacto, MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../../modelo/proyecto'
import type { Nodo, RedHidraulica, ReferenciaDeArtefacto, Tramo } from '../../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../../normativa/eras-2023/catalogo-artefactos'
import { validarRedHidraulica } from '../../../validacion/redHidraulica'
import { catalogoSistemasDeTuberia } from '../sistemaDeTuberia'
import { catalogoMaterialesTuberia } from '../materialTuberia'
import { obtenerCaminoHaciaOrigen, type CaminoHaciaOrigen } from '../topologia/obtenerCaminoHaciaOrigen'
import { acumularPerdidaDistribuidaDeCamino } from './acumularPerdidaDistribuidaDeCamino'
import { resolverPresionResidualDeCamino } from './resolverPresionResidualDeCamino'

function metadatos(): MetadatosProyecto {
  return {
    nombre: 'Proyecto presion camino',
    obra: 'Obra',
    comitente: 'Comitente',
    fecha: '2026-01-01',
    schemaVersion: '1.0.0',
    versionNormativa: 'eras-2023',
  }
}

function parametros(): ParametrosProyecto {
  return { tipoDeProyecto: 'viviendaIndividual', presionSobreAcera_m: 0, alturaArtefactoMasDesfavorable_m: 0 }
}

function artefacto(idInstancia: string, artefactoIdCatalogo: string): Artefacto {
  return { id: idInstancia, artefactoId: artefactoIdCatalogo, cantidad: 1, origen: 'normativo' }
}

function referenciaDe(unidadFuncionalId: string, localId: string, artefactoId: string): ReferenciaDeArtefacto {
  return { tipo: 'artefacto', unidadFuncionalId, localId, artefactoId }
}

function proyectoCon(unidadesFuncionales: readonly UnidadFuncional[], redHidraulica: RedHidraulica): Proyecto {
  return {
    metadatos: metadatos(),
    parametros: parametros(),
    unidadesFuncionales,
    redHidraulica,
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

function ufLavatorio(): UnidadFuncional {
  return {
    id: 'uf-1',
    nombre: 'uf-1',
    locales: [{ id: 'local-1', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto('inst-1', 'lavatorio')] }],
  }
}

// raiz(cota 0) -> mid -> terminal(cota 8, lavatorio); ambos Tramos AF con
// longitud_m -> desnivel 8, hf distribuida acumulable. Los flags `omit*`
// quitan explicitamente un dato para ejercitar los estados incompletos
// (no se usa `x?: number` con default porque no distinguiria "ausente" de
// "undefined explicito").
function proyectoCaminoCompleto(opts?: {
  cotaRaiz?: number
  cotaTerminal?: number
  longT0?: number
  longT1?: number
  artefactoIdCatalogo?: string
  omitCotaRaiz?: boolean
  omitCotaTerminal?: boolean
  omitLongT0?: boolean
  omitLongT1?: boolean
}): Proyecto {
  const o = opts ?? {}
  const cotaRaiz = o.cotaRaiz ?? 0
  const cotaTerminal = o.cotaTerminal ?? 8
  const longT0 = o.longT0 ?? 4
  const longT1 = o.longT1 ?? 3
  const artefactoIdCatalogo = o.artefactoIdCatalogo ?? 'lavatorio'

  const uf: UnidadFuncional = {
    id: 'uf-1',
    nombre: 'uf-1',
    locales: [{ id: 'local-1', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto('inst-1', artefactoIdCatalogo)] }],
  }
  const nodos: Nodo[] = [
    { id: 'raiz', ...(o.omitCotaRaiz ? {} : { cota_m: cotaRaiz }) },
    { id: 'mid' },
    {
      id: 'terminal',
      referencia: referenciaDe('uf-1', 'local-1', 'inst-1'),
      ...(o.omitCotaTerminal ? {} : { cota_m: cotaTerminal }),
    },
  ]
  const tramos: Tramo[] = [
    { id: 't0', nodoOrigenId: 'raiz', nodoDestinoId: 'mid', red: 'AF', ...(o.omitLongT0 ? {} : { longitud_m: longT0 }) },
    { id: 't1', nodoOrigenId: 'mid', nodoDestinoId: 'terminal', red: 'AF', ...(o.omitLongT1 ? {} : { longitud_m: longT1 }) },
  ]
  return proyectoCon([uf], { nodos, tramos })
}

const P_DISPONIBLE = 20

describe('resolverPresionResidualDeCamino', () => {
  it('camino resoluble: devuelve balanceIncompleto (barrera) con la traza de desnivel y hf distribuida', () => {
    const proyecto = proyectoCaminoCompleto({ cotaRaiz: 0, cotaTerminal: 8, longT0: 4, longT1: 3 })
    expect(validarRedHidraulica(proyecto)).toEqual([])

    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      'terminal',
      P_DISPONIBLE,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    // Con hfLocalizada/hfMedidor sin consumidor topologico todavia, la
    // barrera de resolverBalanceDePresion corta aca -- SIEMPRE.
    expect(resultado.tipo).toBe('balanceIncompleto')
    if (resultado.tipo !== 'balanceIncompleto') return
    expect([...resultado.terminosFaltantes].sort()).toEqual(['hfLocalizada', 'hfMedidor'])
    expect(resultado.raizId).toBe('raiz')
    expect(resultado.terminalId).toBe('terminal')
    expect(resultado.desnivel_m).toBe(8)

    const camino = obtenerCaminoHaciaOrigen(proyecto.redHidraulica!, 'terminal') as CaminoHaciaOrigen
    const acum = acumularPerdidaDistribuidaDeCamino(
      proyecto,
      camino,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )
    if (acum.tipo !== 'acumulada') throw new Error('fixture: se esperaba perdida acumulada')
    expect(resultado.hfDistribuida_mca).toBeCloseTo(acum.hf_m, 12)
    expect(resultado.hfDistribuidaPorTramo).toEqual(acum.porTramo)
  })

  it('descenso: desnivel_m negativo se traslada tal cual a la traza', () => {
    const proyecto = proyectoCaminoCompleto({ cotaRaiz: 12, cotaTerminal: 4 })

    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      'terminal',
      P_DISPONIBLE,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    if (resultado.tipo !== 'balanceIncompleto') throw new Error('se esperaba balanceIncompleto')
    expect(resultado.desnivel_m).toBe(-8)
  })

  it('topologia con convergencia aguas arriba -> topologiaNoResoluble', () => {
    const uf = ufLavatorio()
    const nodos: Nodo[] = [
      { id: 'raiz-a', cota_m: 0 },
      { id: 'raiz-b', cota_m: 0 },
      { id: 'union' },
      { id: 'terminal', referencia: referenciaDe('uf-1', 'local-1', 'inst-1'), cota_m: 5 },
    ]
    const tramos: Tramo[] = [
      { id: 'ta', nodoOrigenId: 'raiz-a', nodoDestinoId: 'union', red: 'AF', longitud_m: 3 },
      { id: 'tb', nodoOrigenId: 'raiz-b', nodoDestinoId: 'union', red: 'AF', longitud_m: 3 },
      { id: 'tt', nodoOrigenId: 'union', nodoDestinoId: 'terminal', red: 'AF', longitud_m: 3 },
    ]
    const proyecto = proyectoCon([uf], { nodos, tramos })

    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      'terminal',
      P_DISPONIBLE,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado.tipo).toBe('topologiaNoResoluble')
    if (resultado.tipo !== 'topologiaNoResoluble') return
    expect(resultado.detalle.tipo).toBe('multiplesTramosEntrantes')
  })

  it('nodo consultado sin referencia a Artefacto -> terminalSinArtefacto', () => {
    const nodos: Nodo[] = [
      { id: 'raiz', cota_m: 0 },
      { id: 'hub' },
    ]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'raiz', nodoDestinoId: 'hub', red: 'AF', longitud_m: 3 }]
    const proyecto = proyectoCon([], { nodos, tramos })

    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      'hub',
      P_DISPONIBLE,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado).toEqual({ tipo: 'terminalSinArtefacto', nodoId: 'hub' })
  })

  it('Artefacto terminal sin presionMinima_kgcm2 publicada -> terminalSinPresionMinima, nunca Pmin=0', () => {
    const proyecto = proyectoCaminoCompleto({ artefactoIdCatalogo: 'maquinaLavavajillas' })

    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      'terminal',
      P_DISPONIBLE,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado).toEqual({
      tipo: 'terminalSinPresionMinima',
      nodoId: 'terminal',
      artefactoIdCatalogo: 'maquinaLavavajillas',
    })
  })

  it('terminal sin cota_m -> desnivelIncompleto, ausencia nunca se interpreta como 0', () => {
    const proyecto = proyectoCaminoCompleto({ omitCotaTerminal: true })

    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      'terminal',
      P_DISPONIBLE,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado).toEqual({ tipo: 'desnivelIncompleto', nodosSinCota: ['terminal'] })
  })

  it('Tramo del camino sin longitud_m -> perdidaDistribuidaIncompleta (con cotas completas)', () => {
    const proyecto = proyectoCaminoCompleto({ cotaRaiz: 0, cotaTerminal: 5, omitLongT1: true })

    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      'terminal',
      P_DISPONIBLE,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado).toEqual({
      tipo: 'perdidaDistribuidaIncompleta',
      tramosNoResueltos: [{ tramoId: 't1', motivo: 'sinLongitud' }],
    })
  })

  it('el desnivel incompleto se reporta antes que la perdida (precedencia de etapas)', () => {
    const proyecto = proyectoCaminoCompleto({ omitCotaTerminal: true, omitLongT1: true })

    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      'terminal',
      P_DISPONIBLE,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado.tipo).toBe('desnivelIncompleto')
  })

  it('raiz inmediata: consultar la propia raiz con un artefacto y cota -> desnivel 0, hf 0, balanceIncompleto', () => {
    const uf = ufLavatorio()
    const nodos: Nodo[] = [{ id: 'solo', referencia: referenciaDe('uf-1', 'local-1', 'inst-1'), cota_m: 3 }]
    const proyecto = proyectoCon([uf], { nodos, tramos: [] })

    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      'solo',
      P_DISPONIBLE,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    if (resultado.tipo !== 'balanceIncompleto') throw new Error('se esperaba balanceIncompleto')
    expect(resultado.raizId).toBe('solo')
    expect(resultado.terminalId).toBe('solo')
    expect(resultado.desnivel_m).toBe(0)
    expect(resultado.hfDistribuida_mca).toBe(0)
    expect(resultado.hfDistribuidaPorTramo).toEqual([])
  })

  it('nodoTerminalId inexistente lanza excepcion', () => {
    const proyecto = proyectoCaminoCompleto()

    expect(() =>
      resolverPresionResidualDeCamino(
        proyecto,
        'inexistente',
        P_DISPONIBLE,
        catalogoArtefactos,
        catalogoSistemasDeTuberia,
        catalogoMaterialesTuberia,
      ),
    ).toThrow()
  })
})
