import { describe, it, expect } from 'vitest'
import type { MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../../modelo/redHidraulica'
import { identificarTramosRepresentativosDeLocales } from './identificarTramoRepresentativoDeLocal'

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
  return { tipoDeProyecto: 'viviendaIndividual', presionSobreAcera_m: 0, alturaArtefactoMasDesfavorable_m: 0 }
}

// Misma fixture (bano-1 bifurcado AF+AC, bano-2/cocina de un único
// Artefacto directo bajo la raíz) que
// interfaz/paginas/identificarFilasDeModulo2.test.ts -- esta función es la
// primitiva de dominio que ese archivo de UI ahora reutiliza en vez de
// duplicar.
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
  configuracionHidraulica: {
    metodoPerdidaDistribuida: 'hazenWilliams',
    metodoPerdidaLocalizada: 'detallado',
    materialTuberiaId: 'ppr',
    sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    granularidadHidraulica: 'profesional',
  },
}

describe('identificarTramosRepresentativosDeLocales', () => {
  const representativos = identificarTramosRepresentativosDeLocales(proyecto)

  it('t-af-bano1 es representativo de local-bano-1/AF (no sus ramales t-af-a1/t-af-a2)', () => {
    expect(representativos.get('t-af-bano1')).toEqual({ unidadFuncionalId: 'uf-1', localId: 'local-bano-1' })
    expect(representativos.has('t-af-a1')).toBe(false)
    expect(representativos.has('t-af-a2')).toBe(false)
  })

  it('t-ac-a1 es representativo de local-bano-1/AC', () => {
    expect(representativos.get('t-ac-a1')).toEqual({ unidadFuncionalId: 'uf-1', localId: 'local-bano-1' })
  })

  it('un Local de un único Artefacto directo bajo la raíz (bano-2, cocina) también es representativo', () => {
    expect(representativos.get('t-af-bano2')).toEqual({ unidadFuncionalId: 'uf-1', localId: 'local-bano-2' })
    expect(representativos.get('t-af-cocina')).toEqual({ unidadFuncionalId: 'uf-1', localId: 'local-cocina' })
  })

  it('t-general y t-af-acs (Distribución general) nunca son representativos de un Local', () => {
    expect(representativos.has('t-general')).toBe(false)
    expect(representativos.has('t-af-acs')).toBe(false)
  })

  it('exactamente 4 tramos representativos', () => {
    expect(representativos.size).toBe(4)
  })

  it('proyecto sin redHidraulica: Map vacío', () => {
    const sinRed: Proyecto = {
      metadatos: proyecto.metadatos,
      parametros: proyecto.parametros,
      unidadesFuncionales: proyecto.unidadesFuncionales,
      configuracionHidraulica: proyecto.configuracionHidraulica,
    }
    expect(identificarTramosRepresentativosDeLocales(sinRed).size).toBe(0)
  })
})
