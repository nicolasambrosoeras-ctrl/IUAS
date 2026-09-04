import { describe, it, expect } from 'vitest'
import type { Local, MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { obtenerArtefactosAguasAbajo } from '../../motor/tuberias/topologia/obtenerArtefactosAguasAbajo'
import {
  derivarOrdinalesDeLocal,
  identificarFilasDistribucionGeneral,
  identificarFilasPrincipalesDeLocales,
} from './identificarFilasDeModulo2'

function metadatos(): MetadatosProyecto {
  return {
    nombre: 'Proyecto de prueba',
    obra: 'Obra de prueba',
    comitente: 'Comitente de prueba',
    fecha: '2026-01-01',
    schemaVersion: '1.0.0',
    versionNormativa: 'eras-2023',
  }
}

function parametros(): ParametrosProyecto {
  return {
    tipoDeProyecto: 'viviendaIndividual',
    presionSobreAcera_m: 0,
    alturaArtefactoMasDesfavorable_m: 0,
  }
}

// Fixture minima con bifurcacion (bano-1: 2 artefactos AF, 1 con AC) y dos
// Locales de un unico Artefacto conectados directo a la raiz (bano-2,
// cocina), analogas a "Patio" en la topologia demo real -- para validar el
// caso "Tramo puro de un solo Artefacto directamente bajo la raiz".
const unidadesFuncionales: readonly UnidadFuncional[] = [
  {
    id: 'uf-1',
    nombre: 'UF 1',
    locales: [
      {
        id: 'local-bano-1',
        tipo: 'bano',
        regimen: 'domiciliario',
        artefactos: [
          { id: 'a1', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' },
          { id: 'a2', artefactoId: 'inodoroDeposito', cantidad: 1, origen: 'normativo' },
        ],
      },
      {
        id: 'local-bano-2',
        tipo: 'bano',
        regimen: 'domiciliario',
        artefactos: [{ id: 'a3', artefactoId: 'bidet', cantidad: 1, origen: 'normativo' }],
      },
      {
        id: 'local-cocina',
        tipo: 'cocina',
        regimen: 'domiciliario',
        artefactos: [{ id: 'a4', artefactoId: 'piletaDeCocina', cantidad: 1, origen: 'normativo' }],
      },
    ],
  },
]

const nodos: Nodo[] = [
  { id: 'n-general' },
  { id: 'n-0' },
  { id: 'n-af-bano1' },
  { id: 'n-af-a1', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano-1', artefactoId: 'a1' } },
  { id: 'n-af-a2', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano-1', artefactoId: 'a2' } },
  { id: 'n-acs', referencia: { tipo: 'produccionACS' } },
  { id: 'n-ac-a1', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano-1', artefactoId: 'a1' } },
  { id: 'n-af-a3', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano-2', artefactoId: 'a3' } },
  { id: 'n-af-a4', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-cocina', artefactoId: 'a4' } },
]

const tramos: Tramo[] = [
  { id: 't-general', nodoOrigenId: 'n-general', nodoDestinoId: 'n-0', red: 'AF' },
  { id: 't-af-bano1', nodoOrigenId: 'n-0', nodoDestinoId: 'n-af-bano1', red: 'AF' },
  { id: 't-af-a1', nodoOrigenId: 'n-af-bano1', nodoDestinoId: 'n-af-a1', red: 'AF' },
  { id: 't-af-a2', nodoOrigenId: 'n-af-bano1', nodoDestinoId: 'n-af-a2', red: 'AF' },
  { id: 't-af-acs', nodoOrigenId: 'n-0', nodoDestinoId: 'n-acs', red: 'AF' },
  { id: 't-ac-a1', nodoOrigenId: 'n-acs', nodoDestinoId: 'n-ac-a1', red: 'AC' },
  { id: 't-af-bano2', nodoOrigenId: 'n-0', nodoDestinoId: 'n-af-a3', red: 'AF' },
  { id: 't-af-cocina', nodoOrigenId: 'n-0', nodoDestinoId: 'n-af-a4', red: 'AF' },
]

const redHidraulica: RedHidraulica = { nodos, tramos }

const proyecto: Proyecto = {
  metadatos: metadatos(),
  parametros: parametros(),
  unidadesFuncionales,
  redHidraulica,
  configuracionHidraulica: { metodoPerdidaDistribuida: 'hazenWilliams', metodoPerdidaLocalizada: 'detallado', materialTuberiaId: 'ppr', sistemaDeTuberiaId: 'acquaSystemMagnumPn20' },
}

describe('identificarFilasDistribucionGeneral', () => {
  it('identifica t-general como Alimentación general (raíz estructural, sin heurística de id)', () => {
    const filas = identificarFilasDistribucionGeneral(proyecto)
    expect(filas).toContainEqual({ etiqueta: 'Alimentación general', red: 'AF', tramoId: 't-general' })
  })

  it('identifica t-af-acs como Alimentación ACS (nodo destino produccionACS, sin heurística de id)', () => {
    const filas = identificarFilasDistribucionGeneral(proyecto)
    expect(filas).toContainEqual({ etiqueta: 'Alimentación ACS', red: 'AF', tramoId: 't-af-acs' })
  })

  it('no incluye ningún otro Tramo', () => {
    expect(identificarFilasDistribucionGeneral(proyecto)).toHaveLength(2)
  })

  it('proyecto sin redHidraulica: lista vacía', () => {
    const sinRed: Proyecto = {
      metadatos: metadatos(),
      parametros: parametros(),
      unidadesFuncionales,
      configuracionHidraulica: { metodoPerdidaDistribuida: 'hazenWilliams', metodoPerdidaLocalizada: 'detallado', materialTuberiaId: 'ppr', sistemaDeTuberiaId: 'acquaSystemMagnumPn20' },
    }
    expect(identificarFilasDistribucionGeneral(sinRed)).toEqual([])
  })
})

describe('identificarFilasPrincipalesDeLocales', () => {
  const filas = identificarFilasPrincipalesDeLocales(proyecto)

  it('identifica t-af-bano1 como principal AF de local-bano-1 (no sus terminales t-af-a1/t-af-a2)', () => {
    expect(filas).toContainEqual({
      unidadFuncionalId: 'uf-1',
      localId: 'local-bano-1',
      red: 'AF',
      tramoId: 't-af-bano1',
    })
    expect(filas.map((f) => f.tramoId)).not.toContain('t-af-a1')
    expect(filas.map((f) => f.tramoId)).not.toContain('t-af-a2')
  })

  it('identifica t-ac-a1 como principal AC de local-bano-1', () => {
    expect(filas).toContainEqual({
      unidadFuncionalId: 'uf-1',
      localId: 'local-bano-1',
      red: 'AC',
      tramoId: 't-ac-a1',
    })
  })

  it('local con un único Artefacto directo bajo la raíz (local-bano-2, local-cocina) sigue identificado como principal', () => {
    expect(filas).toContainEqual({
      unidadFuncionalId: 'uf-1',
      localId: 'local-bano-2',
      red: 'AF',
      tramoId: 't-af-bano2',
    })
    expect(filas).toContainEqual({
      unidadFuncionalId: 'uf-1',
      localId: 'local-cocina',
      red: 'AF',
      tramoId: 't-af-cocina',
    })
  })

  it('no incluye t-general ni t-af-acs (no son puros de un único Local)', () => {
    const tramoIds = filas.map((f) => f.tramoId)
    expect(tramoIds).not.toContain('t-general')
    expect(tramoIds).not.toContain('t-af-acs')
  })

  it('exactamente 4 filas principales (bano-1 AF, bano-1 AC, bano-2 AF, cocina AF)', () => {
    expect(filas).toHaveLength(4)
  })
})

describe('derivarOrdinalesDeLocal', () => {
  it('numera incluso con un único Local de ese tipo (cocina -> 1)', () => {
    const locales: readonly Local[] = unidadesFuncionales[0]!.locales
    const ordinales = derivarOrdinalesDeLocal(locales)
    expect(ordinales.get('local-cocina')).toBe(1)
  })

  it('numera secuencialmente por tipo en el orden de aparición (bano-1 -> 1, bano-2 -> 2)', () => {
    const locales: readonly Local[] = unidadesFuncionales[0]!.locales
    const ordinales = derivarOrdinalesDeLocal(locales)
    expect(ordinales.get('local-bano-1')).toBe(1)
    expect(ordinales.get('local-bano-2')).toBe(2)
  })
})

// Fixture duplicada a propósito, igual criterio que
// resolverHidraulicaDeTramo.integracionM1.test.ts: reproduce exactamente
// la topología de proyectoInicial en MotorDemandaPantalla.tsx (11
// artefactos, 5 Locales, t-general, t-af-acs) para validar el algoritmo de
// selección de filas contra la topología demo real, no solo un fixture
// mínimo sintético.
const unidadesFuncionalesDemo: readonly UnidadFuncional[] = [
  {
    id: 'uf-1',
    nombre: 'Unidad funcional 1',
    locales: [
      {
        id: 'local-bano',
        tipo: 'bano',
        regimen: 'domiciliario',
        artefactos: [
          { id: 'artefacto-bano-1', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' },
          { id: 'artefacto-bano-2', artefactoId: 'receptaculoDucha', cantidad: 1, origen: 'normativo' },
          { id: 'artefacto-bano-3', artefactoId: 'bidet', cantidad: 1, origen: 'normativo' },
          { id: 'artefacto-bano-4', artefactoId: 'inodoroDeposito', cantidad: 1, origen: 'normativo' },
        ],
      },
      {
        id: 'local-cocina',
        tipo: 'cocina',
        regimen: 'domiciliario',
        artefactos: [
          { id: 'artefacto-cocina-1', artefactoId: 'piletaDeCocina', cantidad: 1, origen: 'normativo' },
          { id: 'artefacto-cocina-2', artefactoId: 'maquinaLavavajillas', cantidad: 1, origen: 'normativo' },
        ],
      },
      {
        id: 'local-lavadero',
        tipo: 'lavadero',
        regimen: 'domiciliario',
        artefactos: [
          { id: 'artefacto-lavadero-1', artefactoId: 'piletaDeLavar', cantidad: 1, origen: 'normativo' },
          { id: 'artefacto-lavadero-2', artefactoId: 'maquinaLavarropas', cantidad: 1, origen: 'normativo' },
        ],
      },
      {
        id: 'local-toilette',
        tipo: 'toilette',
        regimen: 'domiciliario',
        artefactos: [
          { id: 'artefacto-toilette-1', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' },
          { id: 'artefacto-toilette-2', artefactoId: 'inodoroDeposito', cantidad: 1, origen: 'normativo' },
        ],
      },
      {
        id: 'local-patio',
        tipo: 'jardin',
        regimen: 'domiciliario',
        artefactos: [{ id: 'artefacto-patio-1', artefactoId: 'canillaDeServicio', cantidad: 1, origen: 'normativo' }],
      },
    ],
  },
]

const redHidraulicaDemo: RedHidraulica = {
  nodos: [
    { id: 'n-general' },
    { id: 'n-0' },
    { id: 'n-af-1' },
    { id: 'n-af-lavatorio', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'artefacto-bano-1' } },
    { id: 'n-af-ducha', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'artefacto-bano-2' } },
    { id: 'n-af-bidet', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'artefacto-bano-3' } },
    { id: 'n-af-inodoro', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'artefacto-bano-4' } },
    { id: 'n-acs', referencia: { tipo: 'produccionACS' } },
    { id: 'n-ac-1' },
    { id: 'n-ac-lavatorio', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'artefacto-bano-1' } },
    { id: 'n-ac-ducha', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'artefacto-bano-2' } },
    { id: 'n-ac-bidet', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'artefacto-bano-3' } },
    { id: 'n-af-toilette-1' },
    { id: 'n-af-toilette-lavatorio', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-toilette', artefactoId: 'artefacto-toilette-1' } },
    { id: 'n-af-toilette-inodoro', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-toilette', artefactoId: 'artefacto-toilette-2' } },
    { id: 'n-ac-toilette-lavatorio', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-toilette', artefactoId: 'artefacto-toilette-1' } },
    { id: 'n-af-cocina-1' },
    { id: 'n-af-cocina-pileta', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-cocina', artefactoId: 'artefacto-cocina-1' } },
    { id: 'n-af-cocina-lavavajillas', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-cocina', artefactoId: 'artefacto-cocina-2' } },
    { id: 'n-ac-cocina-pileta', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-cocina', artefactoId: 'artefacto-cocina-1' } },
    { id: 'n-af-lavadero-1' },
    { id: 'n-af-lavadero-pileta', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-lavadero', artefactoId: 'artefacto-lavadero-1' } },
    { id: 'n-af-lavadero-lavarropas', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-lavadero', artefactoId: 'artefacto-lavadero-2' } },
    { id: 'n-ac-lavadero-pileta', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-lavadero', artefactoId: 'artefacto-lavadero-1' } },
    { id: 'n-af-patio-canilla', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-patio', artefactoId: 'artefacto-patio-1' } },
  ],
  tramos: [
    { id: 't-general', nodoOrigenId: 'n-general', nodoDestinoId: 'n-0', red: 'AF' },
    { id: 't-af-bano', nodoOrigenId: 'n-0', nodoDestinoId: 'n-af-1', red: 'AF' },
    { id: 't-af-acs', nodoOrigenId: 'n-0', nodoDestinoId: 'n-acs', red: 'AF' },
    { id: 't-af-lavatorio', nodoOrigenId: 'n-af-1', nodoDestinoId: 'n-af-lavatorio', red: 'AF' },
    { id: 't-af-ducha', nodoOrigenId: 'n-af-1', nodoDestinoId: 'n-af-ducha', red: 'AF' },
    { id: 't-af-bidet', nodoOrigenId: 'n-af-1', nodoDestinoId: 'n-af-bidet', red: 'AF' },
    { id: 't-af-inodoro', nodoOrigenId: 'n-af-1', nodoDestinoId: 'n-af-inodoro', red: 'AF' },
    { id: 't-ac-bano', nodoOrigenId: 'n-acs', nodoDestinoId: 'n-ac-1', red: 'AC' },
    { id: 't-ac-lavatorio', nodoOrigenId: 'n-ac-1', nodoDestinoId: 'n-ac-lavatorio', red: 'AC' },
    { id: 't-ac-ducha', nodoOrigenId: 'n-ac-1', nodoDestinoId: 'n-ac-ducha', red: 'AC' },
    { id: 't-ac-bidet', nodoOrigenId: 'n-ac-1', nodoDestinoId: 'n-ac-bidet', red: 'AC' },
    { id: 't-af-toilette', nodoOrigenId: 'n-0', nodoDestinoId: 'n-af-toilette-1', red: 'AF' },
    { id: 't-af-toilette-lavatorio', nodoOrigenId: 'n-af-toilette-1', nodoDestinoId: 'n-af-toilette-lavatorio', red: 'AF' },
    { id: 't-af-toilette-inodoro', nodoOrigenId: 'n-af-toilette-1', nodoDestinoId: 'n-af-toilette-inodoro', red: 'AF' },
    { id: 't-ac-toilette', nodoOrigenId: 'n-acs', nodoDestinoId: 'n-ac-toilette-lavatorio', red: 'AC' },
    { id: 't-af-cocina', nodoOrigenId: 'n-0', nodoDestinoId: 'n-af-cocina-1', red: 'AF' },
    { id: 't-af-cocina-pileta', nodoOrigenId: 'n-af-cocina-1', nodoDestinoId: 'n-af-cocina-pileta', red: 'AF' },
    { id: 't-af-cocina-lavavajillas', nodoOrigenId: 'n-af-cocina-1', nodoDestinoId: 'n-af-cocina-lavavajillas', red: 'AF' },
    { id: 't-ac-cocina', nodoOrigenId: 'n-acs', nodoDestinoId: 'n-ac-cocina-pileta', red: 'AC' },
    { id: 't-af-lavadero', nodoOrigenId: 'n-0', nodoDestinoId: 'n-af-lavadero-1', red: 'AF' },
    { id: 't-af-lavadero-pileta', nodoOrigenId: 'n-af-lavadero-1', nodoDestinoId: 'n-af-lavadero-pileta', red: 'AF' },
    { id: 't-af-lavadero-lavarropas', nodoOrigenId: 'n-af-lavadero-1', nodoDestinoId: 'n-af-lavadero-lavarropas', red: 'AF' },
    { id: 't-ac-lavadero', nodoOrigenId: 'n-acs', nodoDestinoId: 'n-ac-lavadero-pileta', red: 'AC' },
    { id: 't-af-patio', nodoOrigenId: 'n-0', nodoDestinoId: 'n-af-patio-canilla', red: 'AF' },
  ],
}

const proyectoDemo: Proyecto = {
  metadatos: metadatos(),
  parametros: parametros(),
  unidadesFuncionales: unidadesFuncionalesDemo,
  redHidraulica: redHidraulicaDemo,
  configuracionHidraulica: { metodoPerdidaDistribuida: 'hazenWilliams', metodoPerdidaLocalizada: 'detallado', materialTuberiaId: 'ppr', sistemaDeTuberiaId: 'acquaSystemMagnumPn20' },
}

describe('topología demo real (MotorDemandaPantalla.proyectoInicial): validación end-to-end del algoritmo', () => {
  it('Distribución general: t-general (Alimentación general) y t-af-acs (Alimentación ACS), nada más', () => {
    const filas = identificarFilasDistribucionGeneral(proyectoDemo)
    expect(filas).toEqual([
      { etiqueta: 'Alimentación general', red: 'AF', tramoId: 't-general' },
      { etiqueta: 'Alimentación ACS', red: 'AF', tramoId: 't-af-acs' },
    ])
  })

  it('t-general cubre los 11 artefactos del proyecto; t-af-acs cubre los 6 con conexión física AC', () => {
    expect(obtenerArtefactosAguasAbajo(proyectoDemo, 't-general')).toHaveLength(11)
    expect(obtenerArtefactosAguasAbajo(proyectoDemo, 't-af-acs')).toHaveLength(6)
  })

  it('9 filas principales de Local+Red, una por cada rama principal real de la topología demo', () => {
    const filas = identificarFilasPrincipalesDeLocales(proyectoDemo)
    const porTramoId = new Map(filas.map((f) => [f.tramoId, f]))

    expect(filas).toHaveLength(9)
    expect(porTramoId.get('t-af-bano')).toEqual({ unidadFuncionalId: 'uf-1', localId: 'local-bano', red: 'AF', tramoId: 't-af-bano' })
    expect(porTramoId.get('t-ac-bano')).toEqual({ unidadFuncionalId: 'uf-1', localId: 'local-bano', red: 'AC', tramoId: 't-ac-bano' })
    expect(porTramoId.get('t-af-toilette')).toEqual({ unidadFuncionalId: 'uf-1', localId: 'local-toilette', red: 'AF', tramoId: 't-af-toilette' })
    expect(porTramoId.get('t-ac-toilette')).toEqual({ unidadFuncionalId: 'uf-1', localId: 'local-toilette', red: 'AC', tramoId: 't-ac-toilette' })
    expect(porTramoId.get('t-af-cocina')).toEqual({ unidadFuncionalId: 'uf-1', localId: 'local-cocina', red: 'AF', tramoId: 't-af-cocina' })
    expect(porTramoId.get('t-ac-cocina')).toEqual({ unidadFuncionalId: 'uf-1', localId: 'local-cocina', red: 'AC', tramoId: 't-ac-cocina' })
    expect(porTramoId.get('t-af-lavadero')).toEqual({ unidadFuncionalId: 'uf-1', localId: 'local-lavadero', red: 'AF', tramoId: 't-af-lavadero' })
    expect(porTramoId.get('t-ac-lavadero')).toEqual({ unidadFuncionalId: 'uf-1', localId: 'local-lavadero', red: 'AC', tramoId: 't-ac-lavadero' })
    expect(porTramoId.get('t-af-patio')).toEqual({ unidadFuncionalId: 'uf-1', localId: 'local-patio', red: 'AF', tramoId: 't-af-patio' })
  })

  it('ninguna fila principal es un tramo terminal individual (t-af-lavatorio, t-ac-bidet, etc.)', () => {
    const tramoIds = new Set(identificarFilasPrincipalesDeLocales(proyectoDemo).map((f) => f.tramoId))
    expect(tramoIds.has('t-af-lavatorio')).toBe(false)
    expect(tramoIds.has('t-ac-bidet')).toBe(false)
    expect(tramoIds.has('t-af-toilette-inodoro')).toBe(false)
  })
})
