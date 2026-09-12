// Orquestador de balance de presion sobre un camino: se verifican los
// estados de corte de cada etapa (topologia, terminal/Pmin, desnivel,
// perdida distribuida, perdida localizada) y que la barrera de
// completitud sigue diciendo la verdad. Desde CRIT-A31 (tees),
// hfLocalizada resuelve 'completa' para un camino sin bifurcaciones de
// tee sin configurar y con todos sus accesorios relevados. Los fixtures
// de este archivo declaran accesorios=[] por defecto (relevado, sin
// accesorios del subconjunto soportado) para que hfLocalizada resuelva
// 'completa' sin necesidad de cargar accesorios reales en cada test que
// no los ejercita -- el numero de hfLocalizada igual se calcula y queda
// en la traza (0 real, no ausente).
//
// hfMedidor_mca ahora llega como parametro explicito del llamador
// (contrato minimo M2<->M3, ver comentario de archivo de
// resolverPresionResidualDeCamino.ts): la mayoria de los tests de este
// archivo lo pasan como `undefined` a proposito -- no estan ejercitando
// D-delta.35, solo las barreras anteriores -- y por eso siguen viendo
// 'balanceIncompleto' con terminosFaltantes=['hfMedidor']. El ultimo
// test del describe ("con hfMedidor_mca provisto...") es el que
// demuestra que, con todos los terminos presentes, el orquestador SI
// llega a 'balanceCompleto'.
import { describe, it, expect } from 'vitest'
import type { Artefacto, MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../../modelo/proyecto'
import type { AccesorioDeTramo, Nodo, RedHidraulica, ReferenciaDeArtefacto, Tramo } from '../../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../../normativa/eras-2023/catalogo-artefactos'
import { obtenerAlturaHidraulicaIuas } from '../../../normativa/eras-2023/catalogo-artefactos/alturasHidraulicasIuas'
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
      metodoPerdidaLocalizada: 'detallado', granularidadHidraulica: 'profesional',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

function ufLavatorio(): UnidadFuncional {
  return {
    id: 'uf-1',
    nombre: 'uf-1',
    niveles: [
      {
        id: 'uf-1-nivel-1',
        nombre: 'Nivel 1',
        locales: [{ id: 'local-1', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto('inst-1', 'lavatorio')] }],
      },
    ],
  }
}

// raiz(cota 0) -> mid -> terminal(lavatorio); ambos Tramos AF con
// longitud_m -> desnivel 8, hf distribuida acumulable.
//
// GEOM-UX-01: la cota efectiva del terminal ya NO sale de Nodo.cota_m
// -- se deriva de la cota de piso de la UF + la altura hidraulica IUAS
// del tipo. La `cota_m` del Nodo terminal se sigue escribiendo en el
// fixture (para tests que verifican que se ignora), pero la que manda es
// `cotaHidraulicaReferencia_m` de la UF, que este builder fija en
// `cotaTerminal - alturaIUAS(tipo)` para que la efectiva reproduzca
// exactamente el `cotaTerminal` clasico -- asi todos los `desnivel_m`
// esperados de este archivo se preservan sin rebaseline. `omitCotaUF`
// quita esa cota de piso para ejercitar 'unidadFuncionalSinCotaDeReferencia'.
// Los flags `omit*` quitan explicitamente un dato para ejercitar los
// estados incompletos.
function proyectoCaminoCompleto(opts?: {
  cotaRaiz?: number
  cotaTerminal?: number
  longT0?: number
  longT1?: number
  artefactoIdCatalogo?: string
  omitCotaRaiz?: boolean
  omitCotaTerminal?: boolean
  omitCotaUF?: boolean
  omitLongT0?: boolean
  omitLongT1?: boolean
  // Por defecto ambos tramos quedan "relevados sin accesorios" ([]) para
  // que los tests que no ejercitan M2-C puedan llegar a
  // 'balanceIncompleto' sin cargar accesorios. omitAccesoriosT1 simula el
  // caso "todavia no relevado" (undefined).
  accesoriosT0?: readonly AccesorioDeTramo[]
  accesoriosT1?: readonly AccesorioDeTramo[]
  omitAccesoriosT1?: boolean
}): Proyecto {
  const o = opts ?? {}
  const cotaRaiz = o.cotaRaiz ?? 0
  const cotaTerminal = o.cotaTerminal ?? 8
  const longT0 = o.longT0 ?? 4
  const longT1 = o.longT1 ?? 3
  const artefactoIdCatalogo = o.artefactoIdCatalogo ?? 'lavatorio'
  const accesoriosT0 = o.accesoriosT0 ?? []
  const accesoriosT1 = o.accesoriosT1 ?? []
  // Cota de piso de la UF tal que piso + alturaIUAS(tipo) === cotaTerminal.
  const alturaIuas = obtenerAlturaHidraulicaIuas(artefactoIdCatalogo) ?? 0
  const cotaPisoUF = cotaTerminal - alturaIuas

  const uf: UnidadFuncional = {
    id: 'uf-1',
    nombre: 'uf-1',
    niveles: [
      {
        id: 'uf-1-nivel-1',
        nombre: 'Nivel 1',
        ...(o.omitCotaUF ? {} : { cotaHidraulicaReferencia_m: cotaPisoUF }),
        locales: [{ id: 'local-1', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto('inst-1', artefactoIdCatalogo)] }],
      },
    ],
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
    {
      id: 't0',
      nodoOrigenId: 'raiz',
      nodoDestinoId: 'mid',
      red: 'AF',
      ...(o.omitLongT0 ? {} : { longitud_m: longT0 }),
      accesorios: accesoriosT0,
    },
    {
      id: 't1',
      nodoOrigenId: 'mid',
      nodoDestinoId: 'terminal',
      red: 'AF',
      ...(o.omitLongT1 ? {} : { longitud_m: longT1 }),
      ...(o.omitAccesoriosT1 ? {} : { accesorios: accesoriosT1 }),
    },
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
      undefined,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    // hfMedidor_mca=undefined a proposito (el llamador todavia no lo
    // provee) -- unica barrera restante para este camino desde CRIT-A31
    // (tees): sin bifurcaciones y con accesorios=[] por defecto
    // (relevado, sin accesorios), hfLocalizada YA resuelve 'completa' --
    // deja de ser termino faltante. El numero de hfLocalizada SI se
    // calcula (0 real, no ausente) y queda en la traza.
    expect(resultado.tipo).toBe('balanceIncompleto')
    if (resultado.tipo !== 'balanceIncompleto') return
    expect([...resultado.terminosFaltantes].sort()).toEqual(['hfMedidor'])
    expect(resultado.raizId).toBe('raiz')
    expect(resultado.terminalId).toBe('terminal')
    expect(resultado.desnivel_m).toBe(8)
    expect(resultado.hfLocalizada.hf_mca).toBe(0)
    if (resultado.hfLocalizada.metodologia !== 'detallado') throw new Error('se esperaba metodologia detallado')
    expect(resultado.hfLocalizada.porTramo).toEqual([
      { tramoId: 't0', hf_m: 0 },
      { tramoId: 't1', hf_m: 0 },
    ])

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
      undefined,
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
      undefined,
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
      undefined,
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
      undefined,
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

  it('GEOM-UX-01: la cota_m propia del Nodo terminal se IGNORA -- omitirla no cambia nada (la efectiva se deriva de piso + IUAS)', () => {
    const conCota = proyectoCaminoCompleto({ omitCotaTerminal: false })
    const sinCota = proyectoCaminoCompleto({ omitCotaTerminal: true })

    const r = (p: Proyecto) =>
      resolverPresionResidualDeCamino(
        p,
        'terminal',
        P_DISPONIBLE,
        undefined,
        catalogoArtefactos,
        catalogoSistemasDeTuberia,
        catalogoMaterialesTuberia,
      )

    const rConCota = r(conCota)
    const rSinCota = r(sinCota)
    if (rConCota.tipo !== 'balanceIncompleto' || rSinCota.tipo !== 'balanceIncompleto') {
      throw new Error('se esperaba balanceIncompleto en ambos')
    }
    expect(rSinCota.desnivel_m).toBe(rConCota.desnivel_m)
    expect(rSinCota.desnivel_m).toBe(8)
  })

  it('UF sin cota de piso -> unidadFuncionalSinCotaDeReferencia, ausencia nunca se interpreta como 0', () => {
    const proyecto = proyectoCaminoCompleto({ omitCotaUF: true })

    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      'terminal',
      P_DISPONIBLE,
      undefined,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado).toEqual({ tipo: 'unidadFuncionalSinCotaDeReferencia', unidadFuncionalId: 'uf-1' })
  })

  it('Tramo del camino sin longitud_m -> perdidaDistribuidaIncompleta (con cotas completas)', () => {
    const proyecto = proyectoCaminoCompleto({ cotaRaiz: 0, cotaTerminal: 5, omitLongT1: true })

    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      'terminal',
      P_DISPONIBLE,
      undefined,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado).toEqual({
      tipo: 'perdidaDistribuidaIncompleta',
      tramosNoResueltos: [{ tramoId: 't1', motivo: 'sinLongitud' }],
    })
  })

  it('la cota de piso faltante se reporta antes que la perdida (precedencia de etapas)', () => {
    const proyecto = proyectoCaminoCompleto({ omitCotaUF: true, omitLongT1: true })

    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      'terminal',
      P_DISPONIBLE,
      undefined,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado.tipo).toBe('unidadFuncionalSinCotaDeReferencia')
  })

  it('raiz inmediata: consultar la propia raiz con un artefacto y cota -> desnivel 0, hf 0, balanceIncompleto', () => {
    const uf = ufLavatorio()
    const nodos: Nodo[] = [{ id: 'solo', referencia: referenciaDe('uf-1', 'local-1', 'inst-1'), cota_m: 3 }]
    const proyecto = proyectoCon([uf], { nodos, tramos: [] })

    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      'solo',
      P_DISPONIBLE,
      undefined,
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
    expect(resultado.hfLocalizada.hf_mca).toBe(0)
    if (resultado.hfLocalizada.metodologia !== 'detallado') throw new Error('se esperaba metodologia detallado')
    expect(resultado.hfLocalizada.porTramo).toEqual([])
  })

  it('un Tramo con accesorios no relevados (undefined) -> perdidaLocalizadaIncompleta', () => {
    const proyecto = proyectoCaminoCompleto({ omitAccesoriosT1: true })

    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      'terminal',
      P_DISPONIBLE,
      undefined,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado).toEqual({
      tipo: 'perdidaLocalizadaIncompleta',
      tramosNoResueltos: [{ tramoId: 't1', motivo: 'sinRelevar' }],
    })
  })

  it('accesorios declarados con instancias reales aumentan hfLocalizada_mca y quedan en la traza por tramo', () => {
    const proyecto = proyectoCaminoCompleto({ accesoriosT0: [{ tipo: 'codo90', cantidad: 2 }] })

    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      'terminal',
      P_DISPONIBLE,
      undefined,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    if (resultado.tipo !== 'balanceIncompleto') throw new Error('se esperaba balanceIncompleto')
    expect(resultado.hfLocalizada.hf_mca).toBeGreaterThan(0)
    if (resultado.hfLocalizada.metodologia !== 'detallado') throw new Error('se esperaba metodologia detallado')
    expect(resultado.hfLocalizada.porTramo[0]!.hf_m).toBeGreaterThan(0)
    expect(resultado.hfLocalizada.porTramo[1]!.hf_m).toBe(0)
    expect(resultado.hfLocalizada.hf_mca).toBeCloseTo(
      resultado.hfLocalizada.porTramo[0]!.hf_m + resultado.hfLocalizada.porTramo[1]!.hf_m,
      12,
    )
  })

  it('nodoTerminalId inexistente lanza excepcion', () => {
    const proyecto = proyectoCaminoCompleto()

    expect(() =>
      resolverPresionResidualDeCamino(
        proyecto,
        'inexistente',
        P_DISPONIBLE,
        undefined,
        catalogoArtefactos,
        catalogoSistemasDeTuberia,
        catalogoMaterialesTuberia,
      ),
    ).toThrow()
  })

  // Golden del slice completo sobre una topologia sintetica controlada
  // (item 8: datos sinteticos de test, nunca datos productivos del demo).
  // Valor independiente: J = 0.1307150589563208 m/m es la perdida unitaria
  // Hazen ya verificada de forma independiente (script aparte, CRIT-A10/A17)
  // en resolverPerdidaDistribuidaDeTramo.golden.test.ts para exactamente
  // esta fixture: Qc=0.2 l/s (lavatorio unico, n=1 CRIT-A4), PPR + Acqua
  // System Magnum PN20, candidato "20 mm" (Di=14.4mm), C=150. Aca solo se
  // compone: hf_total = J * (L0 + L1), desnivel = cota_terminal - cota_raiz.
  it('Golden — camino de 2 tramos: desnivel y Σhf distribuida Hazen compuestos linealmente', () => {
    const J_HAZEN_QC_0_2_DI_14_4_C_150 = 0.1307150589563208
    const L0 = 5
    const L1 = 2
    const proyecto = proyectoCaminoCompleto({ cotaRaiz: 0, cotaTerminal: 10, longT0: L0, longT1: L1 })
    expect(validarRedHidraulica(proyecto)).toEqual([])

    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      'terminal',
      P_DISPONIBLE,
      undefined,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    if (resultado.tipo !== 'balanceIncompleto') throw new Error('se esperaba balanceIncompleto')
    expect(resultado.desnivel_m).toBe(10)
    expect(resultado.hfDistribuidaPorTramo.map((e) => e.tramoId)).toEqual(['t0', 't1'])
    expect(resultado.hfDistribuidaPorTramo[0]!.hf_m).toBeCloseTo(J_HAZEN_QC_0_2_DI_14_4_C_150 * L0, 9)
    expect(resultado.hfDistribuidaPorTramo[1]!.hf_m).toBeCloseTo(J_HAZEN_QC_0_2_DI_14_4_C_150 * L1, 9)
    expect(resultado.hfDistribuida_mca).toBeCloseTo(J_HAZEN_QC_0_2_DI_14_4_C_150 * (L0 + L1), 9)
    // Sin accesorios declarados en este golden (accesorios=[] por defecto):
    // hfLocalizada es un cero real, no un término ausente.
    expect(resultado.hfLocalizada.hf_mca).toBe(0)
  })

  // Demuestra que, con TODOS los terminos obligatorios presentes -- el
  // ultimo de ellos, hfMedidor_mca, provisto explicitamente por el
  // llamador (contrato minimo M2<->M3, D-delta.35: quien lo calcula
  // queda fuera de este motor) -- el orquestador SI llega a
  // 'balanceCompleto'. HF_MEDIDOR_MCA es un valor sintetico de test
  // (item 8), analogo a P_DISPONIBLE: no representa ningun medidor
  // catalogado ni ninguna derivacion topologica, solo satisface el
  // contrato de entrada.
  it('con hfMedidor_mca provisto por el llamador, el balance llega a balanceCompleto', () => {
    const HF_MEDIDOR_MCA = 1.3
    const proyecto = proyectoCaminoCompleto({ cotaRaiz: 0, cotaTerminal: 8, longT0: 4, longT1: 3 })
    expect(validarRedHidraulica(proyecto)).toEqual([])

    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      'terminal',
      P_DISPONIBLE,
      HF_MEDIDOR_MCA,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    if (resultado.tipo !== 'balanceCompleto') throw new Error('se esperaba balanceCompleto')
    expect(resultado.presionMinimaRequerida_mca).toBeCloseTo(6, 12) // lavatorio: 0,6 kgf/cm² * 10
    expect(resultado.presionResidual_mca).toBeCloseTo(
      P_DISPONIBLE - resultado.desnivel_m - resultado.hfDistribuida_mca - resultado.hfLocalizada.hf_mca - HF_MEDIDOR_MCA,
      12,
    )
    expect(resultado.cumpleMinimo).toBe(resultado.presionResidual_mca >= resultado.presionMinimaRequerida_mca)
  })
})

// metodoPerdidaLocalizada='estimado' (D-delta.40): raiz(cota0) -> mid ->
// dos terminales hermanos del mismo Local (lavatorio, ducha) -- n=2
// terminales fisicos AF en 'local-1' -> 1 tee estimada. 'mid' queda
// deliberadamente SIN tee configurada: el modo estimado no la necesita
// (nunca llama resolverClasificacionDeTee), y validarRedHidraulica no
// exige Nodo.tee salvo que este declarado. El tramo mid->lavatorio
// declara accesorios reales a proposito, para demostrar que el modo
// estimado los ignora por completo. GEOM-UX-01: la cota efectiva de cada
// terminal se deriva de la cota de piso de la UF (0) + la altura IUAS del
// tipo (lavatorio 0,90; ducha 2,00) -- las cota_m propias de los Nodos
// (3 y 8) se ignoran; los tests de este bloque asertan la presion
// residual contra `resultado.desnivel_m` (auto-referencial), no contra un
// golden absoluto, asi que el cambio de derivacion no los rebaselinea.
function proyectoEstimadoDosTerminales(opts?: { conAccesoriosDetallados?: boolean }): Proyecto {
  const uf: UnidadFuncional = {
    id: 'uf-1',
    nombre: 'uf-1',
    niveles: [
      {
        id: 'uf-1-nivel-1',
        nombre: 'Nivel 1',
        cotaHidraulicaReferencia_m: 0,
        locales: [
          {
            id: 'local-1',
            tipo: 'bano',
            regimen: 'domiciliario',
            artefactos: [artefacto('inst-lavatorio', 'lavatorio'), artefacto('inst-ducha', 'receptaculoDucha')],
          },
        ],
      },
    ],
  }
  const nodos: Nodo[] = [
    { id: 'raiz', cota_m: 0 },
    { id: 'mid' },
    { id: 'terminal-lavatorio', referencia: referenciaDe('uf-1', 'local-1', 'inst-lavatorio'), cota_m: 3 },
    { id: 'terminal-ducha', referencia: referenciaDe('uf-1', 'local-1', 'inst-ducha'), cota_m: 8 },
  ]
  const accesoriosLavatorio: readonly AccesorioDeTramo[] | undefined = opts?.conAccesoriosDetallados
    ? [{ tipo: 'codo90', cantidad: 5 }]
    : undefined
  const tramos: Tramo[] = [
    { id: 't0', nodoOrigenId: 'raiz', nodoDestinoId: 'mid', red: 'AF', longitud_m: 4 },
    {
      id: 't-lavatorio',
      nodoOrigenId: 'mid',
      nodoDestinoId: 'terminal-lavatorio',
      red: 'AF',
      longitud_m: 3,
      ...(accesoriosLavatorio !== undefined ? { accesorios: accesoriosLavatorio } : {}),
    },
    { id: 't-ducha', nodoOrigenId: 'mid', nodoDestinoId: 'terminal-ducha', red: 'AF', longitud_m: 8 },
  ]
  return {
    metadatos: metadatos(),
    parametros: parametros(),
    unidadesFuncionales: [uf],
    redHidraulica: { nodos, tramos },
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'estimado', granularidadHidraulica: 'profesional',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

describe('resolverPresionResidualDeCamino — metodoPerdidaLocalizada=estimado (D-delta.40)', () => {
  it('el resultado se identifica explicitamente como estimado, nunca como completa/parcial del modo detallado', () => {
    const proyecto = proyectoEstimadoDosTerminales()
    expect(validarRedHidraulica(proyecto)).toEqual([])

    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      'terminal-lavatorio',
      P_DISPONIBLE,
      undefined,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    if (resultado.tipo !== 'balanceIncompleto') throw new Error('se esperaba balanceIncompleto (falta hfMedidor)')
    expect(resultado.hfLocalizada.metodologia).toBe('estimado')
    if (resultado.hfLocalizada.metodologia !== 'estimado') return
    expect(resultado.hfLocalizada.nTerminalesLocal).toBe(2)
    expect(resultado.hfLocalizada.nTeesEstimadas).toBe(1)
    expect(resultado.hfLocalizada.hf_mca).toBeGreaterThan(0)
    // Cobertura estimada nunca se reporta como 'parcial' del modo
    // detallado: la unica barrera restante es hfMedidor, igual que en
    // modo detallado con todo relevado.
    expect(resultado.terminosFaltantes).toEqual(['hfMedidor'])
  })

  it('el modo estimado NUNCA suma pérdidas detalladas: declarar accesorios reales en Tramo.accesorios no cambia el resultado estimado', () => {
    const proyectoSinAccesorios = proyectoEstimadoDosTerminales({ conAccesoriosDetallados: false })
    const proyectoConAccesorios = proyectoEstimadoDosTerminales({ conAccesoriosDetallados: true })

    const resolver = (proyecto: Proyecto) =>
      resolverPresionResidualDeCamino(
        proyecto,
        'terminal-lavatorio',
        P_DISPONIBLE,
        undefined,
        catalogoArtefactos,
        catalogoSistemasDeTuberia,
        catalogoMaterialesTuberia,
      )

    const sinAccesorios = resolver(proyectoSinAccesorios)
    const conAccesorios = resolver(proyectoConAccesorios)

    if (sinAccesorios.tipo !== 'balanceIncompleto' || conAccesorios.tipo !== 'balanceIncompleto') {
      throw new Error('se esperaba balanceIncompleto en ambos')
    }
    expect(conAccesorios.hfLocalizada.hf_mca).toBeCloseTo(sinAccesorios.hfLocalizada.hf_mca, 12)
  })

  it('camino/balance real: hfLocalizada estimada puede alimentar el motor de presion sin romper balanceCompleto', () => {
    const HF_MEDIDOR_MCA = 1.3
    const proyecto = proyectoEstimadoDosTerminales()

    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      'terminal-ducha',
      P_DISPONIBLE,
      HF_MEDIDOR_MCA,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    if (resultado.tipo !== 'balanceCompleto') throw new Error('se esperaba balanceCompleto')
    expect(resultado.hfLocalizada.metodologia).toBe('estimado')
    expect(resultado.presionResidual_mca).toBeCloseTo(
      P_DISPONIBLE - resultado.desnivel_m - resultado.hfDistribuida_mca - resultado.hfLocalizada.hf_mca - HF_MEDIDOR_MCA,
      12,
    )
  })

  it('terminal que ES la raiz (camino sin tramos): estimado resuelve hf=0 sin necesitar resolver a que red pertenece', () => {
    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'uf-1',
      niveles: [
        {
          id: 'uf-1-nivel-1',
          nombre: 'Nivel 1',
          locales: [{ id: 'local-1', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto('inst-1', 'lavatorio')] }],
        },
      ],
    }
    const proyecto: Proyecto = {
      metadatos: metadatos(),
      parametros: parametros(),
      unidadesFuncionales: [uf],
      redHidraulica: { nodos: [{ id: 'solo', referencia: referenciaDe('uf-1', 'local-1', 'inst-1'), cota_m: 3 }], tramos: [] },
      configuracionHidraulica: {
        metodoPerdidaDistribuida: 'hazenWilliams',
        metodoPerdidaLocalizada: 'estimado', granularidadHidraulica: 'profesional',
        materialTuberiaId: 'ppr',
        sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
      },
    }

    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      'solo',
      P_DISPONIBLE,
      undefined,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    if (resultado.tipo !== 'balanceIncompleto') throw new Error('se esperaba balanceIncompleto')
    expect(resultado.hfLocalizada).toEqual({
      metodologia: 'estimado',
      hf_mca: 0,
      nTerminalesLocal: 0,
      nTeesEstimadas: 0,
      porSingularidad: [],
    })
  })

  // El tramo sin candidato admisible debe pertenecer al Local+red pero
  // NO al camino del propio terminal consultado -- si perteneciera a su
  // propio camino, acumularPerdidaDistribuidaDeCamino (que corre ANTES,
  // sobre los mismos tramos) ya cortaria con 'perdidaDistribuidaIncompleta'
  // (precedencia de etapas, mismo criterio que el resto de este archivo).
  // Por eso se agrega un TERCER terminal hermano ('terminal-bidet', con
  // una cantidad de artefacto deliberadamente atipica que hace que su
  // tramo no resuelva comercialmente) cuyo tramo nunca es recorrido al
  // pedir 'terminal-lavatorio', pero SI participa en el conteo/velocidad
  // estimada de 'local-1'+AF. El motivo exacto (sinDemanda o
  // sinCandidatoAdmisible) no es lo que se verifica -- lo relevante es
  // que el corte proviene del tramo hermano, no del propio camino.
  it('HYD-EST: agregar un tercer saliente deja incompleta la derivación recorrida, sin fallback por velocidad del hermano', () => {
    const proyectoBase = proyectoEstimadoDosTerminales()
    const redHidraulica = proyectoBase.redHidraulica!
    const proyecto: Proyecto = {
      ...proyectoBase,
      unidadesFuncionales: [
        {
          id: 'uf-1',
          nombre: 'uf-1',
          niveles: [
            {
              id: 'uf-1-nivel-1',
              nombre: 'Nivel 1',
              cotaHidraulicaReferencia_m: 0,
              locales: [
                {
                  id: 'local-1',
                  tipo: 'bano',
                  regimen: 'domiciliario',
                  artefactos: [
                    artefacto('inst-lavatorio', 'lavatorio'),
                    artefacto('inst-ducha', 'receptaculoDucha'),
                    { id: 'inst-bidet', artefactoId: 'bidet', cantidad: 500, origen: 'usuario' },
                  ],
                },
              ],
            },
          ],
        },
      ],
      redHidraulica: {
        nodos: [
          ...redHidraulica.nodos,
          { id: 'terminal-bidet', referencia: referenciaDe('uf-1', 'local-1', 'inst-bidet'), cota_m: 3 },
        ],
        tramos: [
          ...redHidraulica.tramos,
          { id: 't-bidet', nodoOrigenId: 'mid', nodoDestinoId: 'terminal-bidet', red: 'AF', longitud_m: 3 },
        ],
      },
    }
    expect(validarRedHidraulica(proyecto)).toEqual([])

    // Confirma la premisa: el camino de 'terminal-lavatorio' ni siquiera
    // toca 't-bidet'.
    const caminoLavatorio = obtenerCaminoHaciaOrigen(proyecto.redHidraulica!, 'terminal-lavatorio')
    if (caminoLavatorio.tipo !== 'camino') throw new Error('fixture: se esperaba camino')
    expect(caminoLavatorio.tramos.map((t) => t.id)).toEqual(['t0', 't-lavatorio'])

    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      'terminal-lavatorio',
      P_DISPONIBLE,
      undefined,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado.tipo).toBe('perdidaLocalizadaEstimadaIncompleta')
    if (resultado.tipo !== 'perdidaLocalizadaEstimadaIncompleta') return
    expect(resultado.tramosNoResueltos.length).toBe(1)
    expect(resultado.tramosNoResueltos[0]).toEqual({ tramoId: 't-lavatorio', motivo: 'derivacionMultipleNoModelada' })
  })
})

// GEOM-UX-01 (D-δ.86): la cota efectiva del terminal se DERIVA de la
// jerarquia heredada -- cota de piso de la UF + altura hidraulica IUAS
// del tipo -- e IGNORA por completo Nodo.cota_m. Estos tests fijan cotas
// DISTINTAS en el Nodo y en la UF a propósito, para demostrar sin
// ambigüedad cuál efectivamente participa. El artefacto de los fixtures
// es `receptaculoDucha` (altura IUAS 2,00 m), así que la efectiva es
// `cotaPisoUF + 2,00`.
describe("resolverPresionResidualDeCamino — cota efectiva derivada (GEOM-UX-01)", () => {
  // raiz(cota 0) -> mid -> dos terminales hermanos (AF y AC) del mismo
  // Artefacto -- ambos con cota_m propia DISTINTA de la de la UF, para
  // demostrar que en 'simplificada' esa cota propia se ignora por completo.
  function proyectoTerminalesAFyAC(cotaHidraulicaReferenciaUF_m: number | undefined): Proyecto {
    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'uf-1',
      niveles: [
        {
          id: 'uf-1-nivel-1',
          nombre: 'Nivel 1',
          ...(cotaHidraulicaReferenciaUF_m !== undefined ? { cotaHidraulicaReferencia_m: cotaHidraulicaReferenciaUF_m } : {}),
          locales: [{ id: 'local-1', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto('inst-1', 'receptaculoDucha')] }],
        },
      ],
    }
    // Caminos AF y AC totalmente independientes (nunca comparten un Nodo
    // con 2 tramos salientes): mezclar ambas redes en un mismo nodo
    // "mid" lo convertiría en una bifurcacion real (CRIT-A31, exige tee
    // configurada) -- ruido ajeno a lo que este test quiere demostrar.
    const nodos: Nodo[] = [
      { id: 'raiz-af', cota_m: 0 },
      { id: 'raiz-ac', cota_m: 0 },
      { id: 'mid-af' },
      { id: 'mid-ac' },
      { id: 'terminal-af', referencia: referenciaDe('uf-1', 'local-1', 'inst-1'), cota_m: 999 },
      { id: 'terminal-ac', referencia: referenciaDe('uf-1', 'local-1', 'inst-1'), cota_m: -999 },
    ]
    const tramos: Tramo[] = [
      { id: 't0-af', nodoOrigenId: 'raiz-af', nodoDestinoId: 'mid-af', red: 'AF', longitud_m: 4, accesorios: [] },
      { id: 't-af', nodoOrigenId: 'mid-af', nodoDestinoId: 'terminal-af', red: 'AF', longitud_m: 3, accesorios: [] },
      { id: 't0-ac', nodoOrigenId: 'raiz-ac', nodoDestinoId: 'mid-ac', red: 'AC', longitud_m: 4, accesorios: [] },
      { id: 't-ac', nodoOrigenId: 'mid-ac', nodoDestinoId: 'terminal-ac', red: 'AC', longitud_m: 3, accesorios: [] },
    ]
    const proyecto = proyectoCon([uf], { nodos, tramos })
    return { ...proyecto, configuracionHidraulica: { ...proyecto.configuracionHidraulica, granularidadHidraulica: 'simplificada' } }
  }

  it('deriva la cota de piso de la UF + altura IUAS del tipo, ignorando por completo la cota propia del Nodo terminal', () => {
    const proyecto = proyectoTerminalesAFyAC(7)

    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      'terminal-af',
      P_DISPONIBLE,
      undefined,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    if (resultado.tipo !== 'balanceIncompleto') throw new Error('se esperaba balanceIncompleto')
    // desnivel = cotaEfectiva - cotaRaiz(0); cotaEfectiva = cotaPisoUF(7)
    // + alturaIUAS(receptaculoDucha = 2,00) = 9. NUNCA 999 (la cota propia
    // del Nodo, deliberadamente distinta en el fixture).
    expect(resultado.desnivel_m).toBe(9)
  })

  it('AF y AC del mismo Artefacto reciben la MISMA cota efectiva derivada, aunque sus Nodos tengan cota_m distinta', () => {
    const proyecto = proyectoTerminalesAFyAC(7)

    const resultadoAF = resolverPresionResidualDeCamino(
      proyecto, 'terminal-af', P_DISPONIBLE, undefined, catalogoArtefactos, catalogoSistemasDeTuberia, catalogoMaterialesTuberia,
    )
    const resultadoAC = resolverPresionResidualDeCamino(
      proyecto, 'terminal-ac', P_DISPONIBLE, undefined, catalogoArtefactos, catalogoSistemasDeTuberia, catalogoMaterialesTuberia,
    )

    if (resultadoAF.tipo !== 'balanceIncompleto' || resultadoAC.tipo !== 'balanceIncompleto') {
      throw new Error('se esperaba balanceIncompleto en ambos')
    }
    expect(resultadoAF.desnivel_m).toBe(9)
    expect(resultadoAC.desnivel_m).toBe(9)
  })

  it('UF sin cotaHidraulicaReferencia_m -> unidadFuncionalSinCotaDeReferencia (nunca desnivelIncompleto, nunca asume 0)', () => {
    const proyecto = proyectoTerminalesAFyAC(undefined)

    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      'terminal-af',
      P_DISPONIBLE,
      undefined,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado).toEqual({ tipo: 'unidadFuncionalSinCotaDeReferencia', unidadFuncionalId: 'uf-1' })
  })

  it('cambiar la cota de piso de la UF cambia reactivamente el desnivel (y por lo tanto Presidual) de todos sus terminales', () => {
    const proyectoA = proyectoTerminalesAFyAC(1)
    const proyectoB = proyectoTerminalesAFyAC(2)

    const resultadoA = resolverPresionResidualDeCamino(
      proyectoA, 'terminal-af', P_DISPONIBLE, undefined, catalogoArtefactos, catalogoSistemasDeTuberia, catalogoMaterialesTuberia,
    )
    const resultadoB = resolverPresionResidualDeCamino(
      proyectoB, 'terminal-af', P_DISPONIBLE, undefined, catalogoArtefactos, catalogoSistemasDeTuberia, catalogoMaterialesTuberia,
    )

    if (resultadoA.tipo !== 'balanceIncompleto' || resultadoB.tipo !== 'balanceIncompleto') {
      throw new Error('se esperaba balanceIncompleto en ambos')
    }
    // Efectiva = cotaPisoUF + alturaIUAS(receptaculoDucha = 2,00).
    expect(resultadoA.desnivel_m).toBe(3)
    expect(resultadoB.desnivel_m).toBe(4)
  })

  it('caso degenerado (terminal ES la raiz, sin ningun tramo entrante): conserva su propia cota_m, NUNCA la de la UF', () => {
    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'uf-1',
      niveles: [
        {
          id: 'uf-1-nivel-1',
          nombre: 'Nivel 1',
          cotaHidraulicaReferencia_m: 999,
          locales: [{ id: 'local-1', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto('inst-1', 'lavatorio')] }],
        },
      ],
    }
    const nodos: Nodo[] = [{ id: 'solo', referencia: referenciaDe('uf-1', 'local-1', 'inst-1'), cota_m: 3 }]
    const proyectoBase = proyectoCon([uf], { nodos, tramos: [] })
    const proyecto: Proyecto = {
      ...proyectoBase,
      configuracionHidraulica: { ...proyectoBase.configuracionHidraulica, granularidadHidraulica: 'simplificada' },
    }

    const resultado = resolverPresionResidualDeCamino(
      proyecto,
      'solo',
      P_DISPONIBLE,
      undefined,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    if (resultado.tipo !== 'balanceIncompleto') throw new Error('se esperaba balanceIncompleto')
    // desnivel 0 porque raiz===terminal (misma cota_m=3 en ambos roles) --
    // NUNCA se sustituye por la cota de la UF (999), que colapsaria el
    // rol de "punto de alimentacion" de este Nodo degenerado.
    expect(resultado.desnivel_m).toBe(0)
  })
})
