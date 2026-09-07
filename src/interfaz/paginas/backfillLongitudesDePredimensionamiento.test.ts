// D-δ.51 (§4/§5/§9/§12, tests R1-R4/R7-R9/P2): precarga NO destructiva de
// longitudes iniciales de predimensionamiento.
import { describe, it, expect } from 'vitest'
import type { MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { GranularidadHidraulica, MetodoPerdidaLocalizada } from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import {
  backfillLongitudesDePredimensionamiento,
  LONGITUD_INICIAL_DISTRIBUCION_GENERAL_M,
  LONGITUD_INICIAL_LOCAL_RED_M,
} from './backfillLongitudesDePredimensionamiento'

function metadatos(): MetadatosProyecto {
  return { nombre: 'P', obra: 'O', comitente: 'C', fecha: '2026-09-07', schemaVersion: '1.0.0', versionNormativa: 'eras-2023' }
}
function parametros(): ParametrosProyecto {
  return { tipoDeProyecto: 'viviendaIndividual', presionSobreAcera_m: 0, alturaArtefactoMasDesfavorable_m: 0 }
}

// Baño AF+AC con bifurcación dedicada (2 terminales) + Patio AF directo (1
// terminal). Distribución general (t-general) + Alimentación ACS (t-af-acs).
function proyecto(
  granularidadHidraulica: GranularidadHidraulica,
  overridesTramos: Partial<Record<string, number>> = {},
): Proyecto {
  const uf: UnidadFuncional = {
    id: 'uf-1',
    nombre: 'UF 1',
    nivel: 0,
    cotaHidraulicaReferencia_m: 1,
    locales: [
      {
        id: 'local-bano',
        tipo: 'bano',
        regimen: 'domiciliario',
        artefactos: [
          { id: 'a-lav', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' },
          { id: 'a-duc', artefactoId: 'receptaculoDucha', cantidad: 1, origen: 'normativo' },
        ],
      },
      {
        id: 'local-patio',
        tipo: 'jardin',
        regimen: 'domiciliario',
        artefactos: [{ id: 'a-can', artefactoId: 'canillaDeServicio', cantidad: 1, origen: 'normativo' }],
      },
    ],
  }
  const r = (l: string, a: string) => ({ tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: l, artefactoId: a }) as const
  const nodos: Nodo[] = [
    { id: 'n-general' },
    { id: 'n0' },
    { id: 'n-af-bano' },
    { id: 'n-af-lav', referencia: r('local-bano', 'a-lav') },
    { id: 'n-af-duc', referencia: r('local-bano', 'a-duc') },
    { id: 'n-acs', referencia: { tipo: 'produccionACS' } },
    { id: 'n-ac-bano' },
    { id: 'n-ac-lav', referencia: r('local-bano', 'a-lav') },
    { id: 'n-ac-duc', referencia: r('local-bano', 'a-duc') },
    { id: 'n-af-can', referencia: r('local-patio', 'a-can') },
  ]
  const t = (id: string, o: string, d: string, red: 'AF' | 'AC'): Tramo => {
    const override = overridesTramos[id]
    return override === undefined
      ? { id, nodoOrigenId: o, nodoDestinoId: d, red }
      : { id, nodoOrigenId: o, nodoDestinoId: d, red, longitud_m: override }
  }
  const tramos: Tramo[] = [
    t('t-general', 'n-general', 'n0', 'AF'),
    t('t-af-acs', 'n0', 'n-acs', 'AF'),
    t('t-af-bano', 'n0', 'n-af-bano', 'AF'),
    t('t-af-lav', 'n-af-bano', 'n-af-lav', 'AF'),
    t('t-af-duc', 'n-af-bano', 'n-af-duc', 'AF'),
    t('t-ac-bano', 'n-acs', 'n-ac-bano', 'AC'),
    t('t-ac-lav', 'n-ac-bano', 'n-ac-lav', 'AC'),
    t('t-ac-duc', 'n-ac-bano', 'n-ac-duc', 'AC'),
    t('t-af-can', 'n0', 'n-af-can', 'AF'),
  ]
  const redHidraulica: RedHidraulica = { nodos, tramos }
  const metodoPerdidaLocalizada: MetodoPerdidaLocalizada = granularidadHidraulica === 'simplificada' ? 'estimado' : 'detallado'
  return {
    metadatos: metadatos(),
    parametros: parametros(),
    unidadesFuncionales: [uf],
    redHidraulica,
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada,
      granularidadHidraulica,
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

function longitudDe(p: Proyecto, tramoId: string): number | undefined {
  return p.redHidraulica!.tramos.find((tr) => tr.id === tramoId)?.longitud_m
}

describe('backfillLongitudesDePredimensionamiento (D-δ.51)', () => {
  it('R1/R2: en simplificada, Distribución general y Alimentación ACS -> 10 m si undefined', () => {
    const resultado = backfillLongitudesDePredimensionamiento(proyecto('simplificada'))
    expect(longitudDe(resultado, 't-general')).toBe(LONGITUD_INICIAL_DISTRIBUCION_GENERAL_M)
    expect(longitudDe(resultado, 't-af-acs')).toBe(LONGITUD_INICIAL_DISTRIBUCION_GENERAL_M)
  })

  it('R3: en simplificada, el Tramo representativo de cada Local+Red -> 5 m si undefined', () => {
    const resultado = backfillLongitudesDePredimensionamiento(proyecto('simplificada'))
    // t-af-bano y t-ac-bano son representativos (Baño AF/AC); t-af-can (Patio, 1 terminal directo) también.
    expect(longitudDe(resultado, 't-af-bano')).toBe(LONGITUD_INICIAL_LOCAL_RED_M)
    expect(longitudDe(resultado, 't-ac-bano')).toBe(LONGITUD_INICIAL_LOCAL_RED_M)
    expect(longitudDe(resultado, 't-af-can')).toBe(LONGITUD_INICIAL_LOCAL_RED_M)
  })

  it('R3: en simplificada, los ramales internos NO reciben default (no participan de hfDistribuida)', () => {
    const resultado = backfillLongitudesDePredimensionamiento(proyecto('simplificada'))
    expect(longitudDe(resultado, 't-af-lav')).toBeUndefined()
    expect(longitudDe(resultado, 't-af-duc')).toBeUndefined()
    expect(longitudDe(resultado, 't-ac-lav')).toBeUndefined()
  })

  it('R4/P2: nunca sobreescribe un valor ya cargado por el usuario', () => {
    const resultado = backfillLongitudesDePredimensionamiento(
      proyecto('simplificada', { 't-general': 7.35, 't-af-bano': 2 }),
    )
    expect(longitudDe(resultado, 't-general')).toBe(7.35)
    expect(longitudDe(resultado, 't-af-bano')).toBe(2)
    // los que faltaban sí se completan
    expect(longitudDe(resultado, 't-af-acs')).toBe(10)
    expect(longitudDe(resultado, 't-ac-bano')).toBe(5)
  })

  it('§12: en profesional, TODOS los Tramos físicos reciben default (general/ACS -> 10, resto -> 5)', () => {
    const resultado = backfillLongitudesDePredimensionamiento(proyecto('profesional'))
    expect(longitudDe(resultado, 't-general')).toBe(10)
    expect(longitudDe(resultado, 't-af-acs')).toBe(10)
    expect(longitudDe(resultado, 't-af-bano')).toBe(5)
    expect(longitudDe(resultado, 't-af-lav')).toBe(5) // ramal: SÍ en profesional
    expect(longitudDe(resultado, 't-ac-duc')).toBe(5)
    expect(longitudDe(resultado, 't-af-can')).toBe(5)
  })

  it('§12: en profesional tampoco sobreescribe valores existentes', () => {
    const resultado = backfillLongitudesDePredimensionamiento(proyecto('profesional', { 't-af-lav': 1.2 }))
    expect(longitudDe(resultado, 't-af-lav')).toBe(1.2)
    expect(longitudDe(resultado, 't-af-duc')).toBe(5)
  })

  it('idempotente: aplicarlo dos veces no cambia nada la segunda vez (misma referencia)', () => {
    const una = backfillLongitudesDePredimensionamiento(proyecto('simplificada'))
    const dos = backfillLongitudesDePredimensionamiento(una)
    expect(dos).toBe(una)
  })

  it('sin redHidraulica: devuelve el proyecto sin cambios', () => {
    const conRed = proyecto('simplificada')
    const sinRed: Proyecto = {
      metadatos: conRed.metadatos,
      parametros: conRed.parametros,
      unidadesFuncionales: conRed.unidadesFuncionales,
      configuracionHidraulica: conRed.configuracionHidraulica,
    }
    expect(backfillLongitudesDePredimensionamiento(sinRed)).toBe(sinRed)
  })
})
