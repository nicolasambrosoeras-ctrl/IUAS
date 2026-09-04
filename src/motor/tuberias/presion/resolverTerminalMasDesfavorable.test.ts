import { describe, it, expect } from 'vitest'
import type { Artefacto, MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../../modelo/proyecto'
import type { Nodo, ReferenciaDeArtefacto, Tramo } from '../../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../../normativa/eras-2023/catalogo-artefactos'
import { validarRedHidraulica } from '../../../validacion/redHidraulica'
import { catalogoSistemasDeTuberia } from '../sistemaDeTuberia'
import { catalogoMaterialesTuberia } from '../materialTuberia'
import { resolverPresionResidualDeCamino, type ResultadoPresionResidualDeCamino } from './resolverPresionResidualDeCamino'
import { resolverTerminalMasDesfavorable, type CandidatoTerminal } from './resolverTerminalMasDesfavorable'

// Fixture mínima de la traza compartida por 'balanceCompleto'/'balanceIncompleto'
// -- valores arbitrarios (no se usan en el ranking), solo para satisfacer el
// tipo. El ranking usa exclusivamente presionResidual_mca/presionMinimaRequerida_mca.
function traza() {
  return {
    raizId: 'n0',
    terminalId: 'n-terminal',
    desnivel_m: 1,
    hfDistribuida_mca: 0.5,
    hfDistribuidaPorTramo: [],
    hfLocalizada_mca: 0.1,
    hfLocalizadaPorTramo: [],
  }
}

function balanceCompleto(
  presionResidual_mca: number,
  presionMinimaRequerida_mca: number,
): Extract<ResultadoPresionResidualDeCamino, { tipo: 'balanceCompleto' }> {
  return {
    tipo: 'balanceCompleto',
    presionResidual_mca,
    presionMinimaRequerida_mca,
    cumpleMinimo: presionResidual_mca >= presionMinimaRequerida_mca,
    ...traza(),
  }
}

function balanceIncompleto(): Extract<ResultadoPresionResidualDeCamino, { tipo: 'balanceIncompleto' }> {
  return { tipo: 'balanceIncompleto', terminosFaltantes: ['hfLocalizada', 'hfMedidor'], ...traza() }
}

function candidato(nodoId: string, resultado: ResultadoPresionResidualDeCamino): CandidatoTerminal {
  return { nodoId, resultado }
}

describe('resolverTerminalMasDesfavorable', () => {
  it('lista vacía -> sinCandidatoDeterminable, sin excluidos', () => {
    expect(resolverTerminalMasDesfavorable([])).toEqual({
      tipo: 'sinCandidatoDeterminable',
      terminalesExcluidos: [],
    })
  })

  it('ningún candidato con balanceCompleto -> sinCandidatoDeterminable, todos excluidos (estado esperable hoy: hfLocalizada siempre parcial)', () => {
    const resultado = resolverTerminalMasDesfavorable([
      candidato('n-a', balanceIncompleto()),
      candidato('n-b', { tipo: 'terminalSinArtefacto', nodoId: 'n-b' }),
    ])

    expect(resultado).toEqual({
      tipo: 'sinCandidatoDeterminable',
      terminalesExcluidos: ['n-a', 'n-b'],
    })
  })

  it('un único candidato con balanceCompleto y sin excluidos -> determinado', () => {
    const resultado = resolverTerminalMasDesfavorable([candidato('n-a', balanceCompleto(12, 10))])

    expect(resultado).toEqual({
      tipo: 'determinado',
      nodoId: 'n-a',
      presionResidual_mca: 12,
      presionMinimaRequerida_mca: 10,
      cumpleMinimo: true,
      margen_mca: 2,
    })
  })

  it('varios candidatos completos: elige el de MENOR margen (Presidual - PminRequerida), no el de menor Presidual ni mayor Pmin por separado', () => {
    // n-a: margen=5 (15-10). n-b: margen=1 (11-10) -- el mas desfavorable,
    // aunque su Presidual absoluta (11) sea menor que la de n-a (15) Y su
    // Pmin (10) sea igual -- el margen es lo que importa, no cada termino
    // aislado.
    const resultado = resolverTerminalMasDesfavorable([
      candidato('n-a', balanceCompleto(15, 10)),
      candidato('n-b', balanceCompleto(11, 10)),
      candidato('n-c', balanceCompleto(20, 12)), // margen=8
    ])

    expect(resultado).toEqual({
      tipo: 'determinado',
      nodoId: 'n-b',
      presionResidual_mca: 11,
      presionMinimaRequerida_mca: 10,
      cumpleMinimo: true,
      margen_mca: 1,
    })
  })

  it('un terminal que NO cumple (margen negativo) es siempre el mas desfavorable frente a otros que si cumplen', () => {
    const resultado = resolverTerminalMasDesfavorable([
      candidato('n-a', balanceCompleto(15, 10)), // margen=5, cumple
      candidato('n-b', balanceCompleto(8, 10)), // margen=-2, NO cumple
    ])

    expect(resultado).toEqual({
      tipo: 'determinado',
      nodoId: 'n-b',
      presionResidual_mca: 8,
      presionMinimaRequerida_mca: 10,
      cumpleMinimo: false,
      margen_mca: -2,
    })
  })

  it('mezcla de completos e incompletos: candidatoProvisional -- nunca "determinado", aunque haya un peor claro entre los completos', () => {
    const resultado = resolverTerminalMasDesfavorable([
      candidato('n-a', balanceCompleto(15, 10)),
      candidato('n-b', balanceCompleto(11, 10)), // peor entre los completos
      candidato('n-c', balanceIncompleto()),
    ])

    expect(resultado).toEqual({
      tipo: 'candidatoProvisional',
      nodoId: 'n-b',
      presionResidual_mca: 11,
      presionMinimaRequerida_mca: 10,
      cumpleMinimo: true,
      margen_mca: 1,
      terminalesExcluidos: ['n-c'],
    })
  })

  it('terminalesExcluidos conserva el orden y no incluye a ningún candidato completo', () => {
    const resultado = resolverTerminalMasDesfavorable([
      candidato('n-a', balanceIncompleto()),
      candidato('n-b', balanceCompleto(15, 10)),
      candidato('n-c', { tipo: 'topologiaNoResoluble', detalle: { tipo: 'ciclo', nodoId: 'n-c' } }),
    ])

    if (resultado.tipo !== 'candidatoProvisional') throw new Error('se esperaba candidatoProvisional')
    expect(resultado.terminalesExcluidos).toEqual(['n-a', 'n-c'])
    expect(resultado.nodoId).toBe('n-b')
  })

  it('empate de margen: conserva el primer candidato encontrado (orden estable, sin criterio de desempate adicional)', () => {
    const resultado = resolverTerminalMasDesfavorable([
      candidato('n-a', balanceCompleto(15, 10)), // margen=5
      candidato('n-b', balanceCompleto(20, 15)), // margen=5, empatado
    ])

    if (resultado.tipo !== 'determinado') throw new Error('se esperaba determinado')
    expect(resultado.nodoId).toBe('n-a')
  })
})

// Integración mínima con el pipeline real (sin fixtures literales de
// ResultadoPresionResidualDeCamino): dos terminales reales, resueltos por
// resolverPresionResidualDeCamino de punta a punta. Confirma que la
// barrera de completitud (hfLocalizada siempre 'parcial' mientras
// D-delta.33 no cierre tees) se propaga correctamente A TRAVÉS de este
// nuevo comparador -- 'sinCandidatoDeterminable' es el resultado correcto
// y esperable hoy, no un caso de borde artificial.
function metadatos(): MetadatosProyecto {
  return {
    nombre: 'Proyecto terminal mas desfavorable',
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

// raiz(cota 0) -> mid -> dos terminales hermanos (lavatorio cota 3, ducha
// cota 8), ambos AF con longitud_m -- dos caminos reales e independientes
// hacia el mismo origen, tal como los recorrería la UI para comparar
// terminales de un mismo Local.
function proyectoDosTerminales(): Proyecto {
  const uf: UnidadFuncional = {
    id: 'uf-1',
    nombre: 'uf-1',
    locales: [
      {
        id: 'local-1',
        tipo: 'bano',
        regimen: 'domiciliario',
        artefactos: [artefacto('inst-lavatorio', 'lavatorio'), artefacto('inst-ducha', 'receptaculoDucha')],
      },
    ],
  }
  const nodos: Nodo[] = [
    { id: 'raiz', cota_m: 0 },
    // 'mid' bifurca 1→2 (t-lavatorio/t-ducha): tee real (CRIT-A31),
    // configurada como entradaCentral -- ambas salidas son laterales
    // respecto de la entrada desde 'raiz'.
    { id: 'mid', tee: { tipo: 'entradaCentral' } },
    { id: 'terminal-lavatorio', referencia: referenciaDe('uf-1', 'local-1', 'inst-lavatorio'), cota_m: 3 },
    { id: 'terminal-ducha', referencia: referenciaDe('uf-1', 'local-1', 'inst-ducha'), cota_m: 8 },
  ]
  const tramos: Tramo[] = [
    { id: 't0', nodoOrigenId: 'raiz', nodoDestinoId: 'mid', red: 'AF', longitud_m: 4, accesorios: [] },
    { id: 't-lavatorio', nodoOrigenId: 'mid', nodoDestinoId: 'terminal-lavatorio', red: 'AF', longitud_m: 3, accesorios: [] },
    { id: 't-ducha', nodoOrigenId: 'mid', nodoDestinoId: 'terminal-ducha', red: 'AF', longitud_m: 8, accesorios: [] },
  ]
  return {
    metadatos: metadatos(),
    parametros: parametros(),
    unidadesFuncionales: [uf],
    redHidraulica: { nodos, tramos },
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

describe('resolverTerminalMasDesfavorable (integración con el pipeline real)', () => {
  it('dos terminales reales sin hfMedidor_mca -> sinCandidatoDeterminable, exclusivamente por esa barrera (CRIT-A31 ya cerró hfLocalizada para este camino)', () => {
    const proyecto = proyectoDosTerminales()
    expect(validarRedHidraulica(proyecto)).toEqual([])

    const candidatos: CandidatoTerminal[] = (['terminal-lavatorio', 'terminal-ducha'] as const).map((nodoId) => ({
      nodoId,
      resultado: resolverPresionResidualDeCamino(
        proyecto,
        nodoId,
        20,
        undefined,
        catalogoArtefactos,
        catalogoSistemasDeTuberia,
        catalogoMaterialesTuberia,
      ),
    }))

    // Confirma la premisa: ambos caminos son reales y resolubles (no
    // fallan por topología ni por artefacto ni por pérdida localizada
    // incompleta -- la tee de 'mid' está configurada y los accesorios de
    // los 3 tramos están relevados), pero ninguno llega a
    // 'balanceCompleto' mientras el llamador no provea hfMedidor_mca.
    expect(candidatos.map((c) => c.resultado.tipo)).toEqual(['balanceIncompleto', 'balanceIncompleto'])
    for (const candidato of candidatos) {
      if (candidato.resultado.tipo !== 'balanceIncompleto') throw new Error('se esperaba balanceIncompleto')
      expect(candidato.resultado.terminosFaltantes).toEqual(['hfMedidor'])
    }

    const resultado = resolverTerminalMasDesfavorable(candidatos)

    expect(resultado).toEqual({
      tipo: 'sinCandidatoDeterminable',
      terminalesExcluidos: ['terminal-lavatorio', 'terminal-ducha'],
    })
  })

  // Primer 'determinado' real de punta a punta (M2-B): dos terminales de
  // un mismo Local, distinta cota (3 vs 8) y distinto camino (3 vs 8
  // metros de tramo final), ambos con el mismo hfMedidor_mca -- un
  // medidor general aguas arriba de la bifurcación ('mid') afecta a
  // ambos por igual, tal como describe D-delta.38 para un medidor
  // general en alimentación directa. HF_MEDIDOR_MCA es un valor
  // sintetico de test (item 8), analogo a Pdisponible: no representa
  // ningun medidor catalogado (D-delta.35 sigue abierta para eso).
  it('dos terminales reales con hfMedidor_mca provisto -> ambos balanceCompleto, y el terminal con MENOR margen se determina como el más desfavorable', () => {
    const HF_MEDIDOR_MCA = 1.3
    const proyecto = proyectoDosTerminales()
    expect(validarRedHidraulica(proyecto)).toEqual([])

    const candidatos: CandidatoTerminal[] = (['terminal-lavatorio', 'terminal-ducha'] as const).map((nodoId) => ({
      nodoId,
      resultado: resolverPresionResidualDeCamino(
        proyecto,
        nodoId,
        20,
        HF_MEDIDOR_MCA,
        catalogoArtefactos,
        catalogoSistemasDeTuberia,
        catalogoMaterialesTuberia,
      ),
    }))

    expect(candidatos.map((c) => c.resultado.tipo)).toEqual(['balanceCompleto', 'balanceCompleto'])
    const completos = candidatos.map((c) => {
      if (c.resultado.tipo !== 'balanceCompleto') throw new Error('se esperaba balanceCompleto')
      return { nodoId: c.nodoId, margen: c.resultado.presionResidual_mca - c.resultado.presionMinimaRequerida_mca }
    })

    const resultado = resolverTerminalMasDesfavorable(candidatos)

    // El más desfavorable real es el de menor margen entre los dos
    // calculados arriba a partir del propio resultado del motor -- no un
    // valor hidráulico hardcodeado, para no fijar en el test una
    // predicción manual de Hazen-Williams / tee que ya calcula el motor.
    const peor = completos[0]!.margen <= completos[1]!.margen ? completos[0]! : completos[1]!
    expect(resultado.tipo).toBe('determinado')
    if (resultado.tipo !== 'determinado') return
    expect(resultado.nodoId).toBe(peor.nodoId)
    expect(resultado.margen_mca).toBeCloseTo(peor.margen, 12)
  })
})
