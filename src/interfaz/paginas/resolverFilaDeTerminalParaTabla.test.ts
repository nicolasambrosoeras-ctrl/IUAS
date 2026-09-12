// D-δ.50 (brief seccion 28): fila de la tabla "Ver todos los terminales" y
// su orden (verificables por margen ascendente, luego incompletos, luego
// los sin Pmin normativa al final).
import { describe, it, expect } from 'vitest'
import type { MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, ReferenciaDeArtefacto, Tramo } from '../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import type { CandidatoTerminal } from '../../motor/tuberias/presion/resolverTerminalMasDesfavorable'
import type { ResultadoPresionResidualDeCamino } from '../../motor/tuberias/presion/resolverPresionResidualDeCamino'
import {
  ordenarFilasDeTerminales,
  resolverFilaDeTerminalParaTabla,
  type FilaDeTerminal,
} from './resolverFilaDeTerminalParaTabla'

function metadatos(): MetadatosProyecto {
  return { nombre: 'P', obra: 'O', comitente: 'C', fecha: '2026-09-07', schemaVersion: '1.0.0', versionNormativa: 'eras-2023' }
}
function parametros(): ParametrosProyecto {
  return { tipoDeProyecto: 'viviendaIndividual', presionSobreAcera_m: 0, alturaArtefactoMasDesfavorable_m: 0 }
}

function proyecto(): Proyecto {
  const uf: UnidadFuncional = {
    id: 'uf-2',
    nombre: 'Unidad funcional 2',
    niveles: [
      {
        id: 'uf-2-nivel-1',
        nombre: 'Nivel 1',
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
      },
    ],
  }
  const nodos: Nodo[] = [
    { id: 'n-general' },
    { id: 'n0' },
    { id: 'n-ac', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-2', localId: 'local-bano', artefactoId: 'art-ducha' } },
  ]
  const tramos: Tramo[] = [
    { id: 't-general', nodoOrigenId: 'n-general', nodoDestinoId: 'n0', red: 'AF' },
    { id: 't-ac', nodoOrigenId: 'n0', nodoDestinoId: 'n-ac', red: 'AC' },
  ]
  return {
    metadatos: metadatos(),
    parametros: parametros(),
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

function balanceCompleto(nodoId: string, presidual: number, pmin: number): CandidatoTerminal {
  const resultado = {
    tipo: 'balanceCompleto',
    presionResidual_mca: presidual,
    presionMinimaRequerida_mca: pmin,
    cumpleMinimo: presidual >= pmin,
    raizId: 'n-general',
    terminalId: nodoId,
    desnivel_m: 3,
    hfDistribuida_mca: 1,
    hfDistribuidaPorTramo: [],
    hfLocalizada: { metodologia: 'estimado', hf_mca: 0.2, nTerminalesLocal: 1, nTeesEstimadas: 0, velocidadReferencia_mps: 1 },
    incrementoVerticalPorNivel: { aplica: true, nivel: 1, deltaLVertical_m: 3, incrementoPorTramoId: new Map(), tramosConIncremento: [] },
  } satisfies ResultadoPresionResidualDeCamino
  return { nodoId, resultado }
}

const REF: ReferenciaDeArtefacto = {
  tipo: 'artefacto',
  unidadFuncionalId: 'uf-2',
  localId: 'local-bano',
  artefactoId: 'art-ducha',
}

describe('resolverFilaDeTerminalParaTabla (D-δ.50)', () => {
  it('deriva artefacto, ubicacion (UF · nivel · local), red y margen de lo que el motor ya devolvio', () => {
    const fila = resolverFilaDeTerminalParaTabla(proyecto(), catalogoArtefactos, REF, balanceCompleto('n-ac', 7.2, 6))

    expect(fila.artefacto).toContain('ucha') // "Receptáculo de ducha" (nombre de catálogo)
    expect(fila.ubicacion).toBe('Unidad funcional 2 · Piso 1 · Baño')
    expect(fila.redTexto).toBe('Agua caliente')
    expect(fila.presidual_mca).toBe(7.2)
    expect(fila.pmin_mca).toBe(6)
    expect(fila.margen_mca).toBeCloseTo(1.2, 10)
    expect(fila.cumple).toBe(true)
    expect(fila.categoria).toBe('verificable')
  })

  it('un balance NO CUMPLE se refleja en estado y cumple', () => {
    const fila = resolverFilaDeTerminalParaTabla(proyecto(), catalogoArtefactos, REF, balanceCompleto('n-ac', 5.4, 6))
    expect(fila.cumple).toBe(false)
    expect(fila.margen_mca).toBeCloseTo(-0.6, 10)
    expect(fila.estadoTexto).toBe('✕ No cumple')
  })
})

describe('ordenarFilasDeTerminales (D-δ.50 seccion 28)', () => {
  function fila(overrides: Partial<FilaDeTerminal>): FilaDeTerminal {
    return {
      nodoId: 'n',
      artefacto: 'X',
      ubicacion: 'U',
      nivelTexto: 'PB',
      redTexto: 'Agua fría',
      presidual_mca: undefined,
      pmin_mca: undefined,
      margen_mca: undefined,
      cumple: undefined,
      estadoTexto: '',
      categoria: 'verificable',
      ...overrides,
    }
  }

  it('verificables por margen ascendente, luego incompletos, luego sin Pmin', () => {
    const filas = [
      fila({ nodoId: 'sinPmin', categoria: 'sinPmin' }),
      fila({ nodoId: 'verif-alto', categoria: 'verificable', margen_mca: 5 }),
      fila({ nodoId: 'incompleto', categoria: 'incompleto' }),
      fila({ nodoId: 'verif-critico', categoria: 'verificable', margen_mca: -0.6 }),
      fila({ nodoId: 'verif-medio', categoria: 'verificable', margen_mca: 1.2 }),
    ]

    const orden = ordenarFilasDeTerminales(filas).map((f) => f.nodoId)

    expect(orden).toEqual(['verif-critico', 'verif-medio', 'verif-alto', 'incompleto', 'sinPmin'])
  })

  it('la primera fila verificable coincide con el terminal mas desfavorable (menor margen)', () => {
    const filas = [
      fila({ nodoId: 'a', categoria: 'verificable', margen_mca: 2 }),
      fila({ nodoId: 'b', categoria: 'verificable', margen_mca: -1 }),
    ]
    expect(ordenarFilasDeTerminales(filas)[0]!.nodoId).toBe('b')
  })
})
