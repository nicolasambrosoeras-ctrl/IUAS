// D-δ.50 (brief secciones 28-29): render de la tabla de terminales y de la
// descomposicion "Ver calculo del critico" a partir de un balanceCompleto
// ya resuelto por el motor. renderToStaticMarkup solo ve el estado
// inicial, asi que estos componentes se prueban directos con una traza
// fija (el flujo end-to-end con Pdisponible/hfMedidor cargados es la
// prueba de aceptacion Playwright, seccion 50).
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import type { MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, ReferenciaDeArtefacto, Tramo } from '../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import type { CandidatoTerminal } from '../../motor/tuberias/presion/resolverTerminalMasDesfavorable'
import type { ResultadoPresionResidualDeCamino } from '../../motor/tuberias/presion/resolverPresionResidualDeCamino'
import { TablaDeTerminales } from './TablaDeTerminales'
import { CalculoDelCriticoDetalle } from './CalculoDelCriticoDetalle'

function proyecto(): Proyecto {
  const metadatos: MetadatosProyecto = {
    nombre: 'P', obra: 'O', comitente: 'C', fecha: '2026-09-07', schemaVersion: '1.0.0', versionNormativa: 'eras-2023',
  }
  const parametros: ParametrosProyecto = {
    tipoDeProyecto: 'viviendaIndividual', presionSobreAcera_m: 0, alturaArtefactoMasDesfavorable_m: 0,
  }
  const uf: UnidadFuncional = {
    id: 'uf-2',
    nombre: 'Unidad funcional 2',
    nivel: 1,
    cotaHidraulicaReferencia_m: 4,
    locales: [
      {
        id: 'local-bano',
        tipo: 'bano',
        regimen: 'domiciliario',
        artefactos: [{ id: 'art-ducha', artefactoId: 'receptaculoDucha', cantidad: 1, origen: 'normativo' }],
      },
    ],
  }
  const ref: ReferenciaDeArtefacto = { tipo: 'artefacto', unidadFuncionalId: 'uf-2', localId: 'local-bano', artefactoId: 'art-ducha' }
  const nodos: Nodo[] = [
    { id: 'n-general', cota_m: 0 },
    { id: 'n0' },
    { id: 'n-acs', referencia: { tipo: 'produccionACS' } },
    { id: 'n-af-1' },
    { id: 'n-ac-ducha', referencia: ref },
  ]
  const tramos: Tramo[] = [
    { id: 't-general', nodoOrigenId: 'n-general', nodoDestinoId: 'n0', red: 'AF', longitud_m: 5 },
    { id: 't-af-acs', nodoOrigenId: 'n0', nodoDestinoId: 'n-acs', red: 'AF', longitud_m: 4 },
    { id: 't-ac-bano', nodoOrigenId: 'n-acs', nodoDestinoId: 'n-af-1', red: 'AC', longitud_m: 6 },
    { id: 't-ac-ducha', nodoOrigenId: 'n-af-1', nodoDestinoId: 'n-ac-ducha', red: 'AC' },
  ]
  return {
    metadatos,
    parametros,
    unidadesFuncionales: [uf],
    redHidraulica: { nodos, tramos },
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'estimado',
      granularidadHidraulica: 'simplificada',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

const REF: ReferenciaDeArtefacto = { tipo: 'artefacto', unidadFuncionalId: 'uf-2', localId: 'local-bano', artefactoId: 'art-ducha' }

function balance(nodoId: string, presidual: number, pmin: number): CandidatoTerminal {
  return {
    nodoId,
    resultado: {
      tipo: 'balanceCompleto',
      presionResidual_mca: presidual,
      presionMinimaRequerida_mca: pmin,
      cumpleMinimo: presidual >= pmin,
      raizId: 'n-general',
      terminalId: nodoId,
      desnivel_m: 3,
      hfDistribuida_mca: 1.5,
      hfDistribuidaPorTramo: [
        { tramoId: 't-general', hf_m: 0.8, hfBase_m: 0.5, longitudBase_m: 5, incrementoVertical_m: 3, hfIncrementoVertical_m: 0.3 },
        { tramoId: 't-af-acs', hf_m: 0.5, hfBase_m: 0.3, longitudBase_m: 4, incrementoVertical_m: 3, hfIncrementoVertical_m: 0.2 },
        { tramoId: 't-ac-bano', hf_m: 0.2, hfBase_m: 0.2, longitudBase_m: 6, incrementoVertical_m: 0, hfIncrementoVertical_m: 0 },
      ],
      hfLocalizada: { metodologia: 'estimado', hf_mca: 0.3, nTerminalesLocal: 1, nTeesEstimadas: 0, velocidadReferencia_mps: 1.5 },
      incrementoVerticalPorNivel: {
        aplica: true,
        nivel: 1,
        deltaLVertical_m: 3,
        incrementoPorTramoId: new Map([['t-general', 3], ['t-af-acs', 3]]),
        tramosConIncremento: [
          { tramoId: 't-general', rol: 'alimentacionGeneral', incremento_m: 3 },
          { tramoId: 't-af-acs', rol: 'alimentacionAcs', incremento_m: 3 },
        ],
      },
    } satisfies ResultadoPresionResidualDeCamino,
  }
}

describe('TablaDeTerminales (D-δ.50)', () => {
  it('renderiza una fila con ubicacion UF/nivel, red, Presidual, Pmin y margen', () => {
    const html = renderToStaticMarkup(
      createElement(TablaDeTerminales, {
        proyecto: proyecto(),
        catalogoArtefactos,
        candidatos: [balance('n-ac-ducha', 7.2, 6)],
        referenciaPorNodoId: new Map([['n-ac-ducha', REF]]),
      }),
    )

    expect(html).toContain('Unidad funcional 2 · Piso 1 · Baño')
    expect(html).toContain('Agua caliente')
    expect(html).toContain('<th')
    expect(html).toContain('Margen')
    expect(html).toContain('Cumple')
  })
})

describe('CalculoDelCriticoDetalle (D-δ.50 seccion 29)', () => {
  it('muestra el recorrido con longitud base, vertical automatica y longitud efectiva por tramo', () => {
    const critico = balance('n-ac-ducha', 7.2, 6).resultado
    if (critico.tipo !== 'balanceCompleto') throw new Error('fixture invalido')

    const html = renderToStaticMarkup(
      createElement(CalculoDelCriticoDetalle, {
        proyecto: proyecto(),
        catalogoArtefactos,
        resultado: critico,
        presionDisponible_mca: 20,
        hfMedidor_mca: 1,
        origenTexto: 'Tanque elevado',
        cotaRaiz_m: 0,
      }),
    )

    expect(html).toContain('Recorrido')
    expect(html).toContain('Alimentación general')
    expect(html).toContain('Alimentación ACS')
    // Long. base 5 + vertical +3 -> efectiva 8 para la Alimentación general.
    expect(html).toContain('Long. efectiva')
    expect(html).toContain('Longitud vertical automática por nivel')
    expect(html).toContain('Presión residual')
    expect(html).toContain('Margen')
    // Carga geométrica = Pdisponible - Δz = 20 - 3 = 17.
    expect(html).toContain('Carga geométrica')
  })
})
