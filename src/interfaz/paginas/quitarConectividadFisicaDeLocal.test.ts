import { describe, it, expect } from 'vitest'
import type { Artefacto, MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { validarRedHidraulica } from '../../validacion/redHidraulica'
import { quitarConectividadFisicaDeLocal } from './quitarConectividadFisicaDeLocal'

function metadatos(): MetadatosProyecto {
  return {
    nombre: 'Proyecto D-δ.47 baja de Local',
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

function artefacto(id: string, artefactoId: string): Artefacto {
  return { id, artefactoId, cantidad: 1, origen: 'normativo' }
}

function proyectoCon(unidadesFuncionales: readonly UnidadFuncional[], redHidraulica: RedHidraulica): Proyecto {
  return {
    metadatos: metadatos(),
    parametros: parametros(),
    unidadesFuncionales,
    redHidraulica,
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'detallado',
      granularidadHidraulica: 'profesional',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

// Dos Locales en la misma UF, cada uno con su propia cabecera AF exclusiva
// (n-af-bano / n-af-cocina), ambas colgando de la misma raíz compartida n0
// -- reproduce la topología real del proyecto de ejemplo (D-δ.47).
function proyectoBase(): Proyecto {
  const uf: UnidadFuncional = {
    id: 'uf-1',
    nombre: 'uf-1',
    locales: [
      {
        id: 'local-bano',
        tipo: 'bano',
        regimen: 'domiciliario',
        artefactos: [artefacto('a-lavatorio', 'lavatorio'), artefacto('a-ducha', 'receptaculoDucha')],
      },
      {
        id: 'local-cocina',
        tipo: 'cocina',
        regimen: 'domiciliario',
        artefactos: [artefacto('a-pileta', 'piletaDeCocina')],
      },
    ],
  }
  const nodos: Nodo[] = [
    { id: 'n0' },
    { id: 'n-af-bano' },
    { id: 'n-af-cocina' },
    {
      id: 'n-af-lavatorio',
      referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'a-lavatorio' },
    },
    {
      id: 'n-af-ducha',
      referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'a-ducha' },
    },
    {
      id: 'n-af-pileta',
      referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-cocina', artefactoId: 'a-pileta' },
    },
  ]
  const tramos: Tramo[] = [
    { id: 't0-bano', nodoOrigenId: 'n0', nodoDestinoId: 'n-af-bano', red: 'AF' },
    { id: 't0-cocina', nodoOrigenId: 'n0', nodoDestinoId: 'n-af-cocina', red: 'AF' },
    { id: 't1-lavatorio', nodoOrigenId: 'n-af-bano', nodoDestinoId: 'n-af-lavatorio', red: 'AF' },
    { id: 't1-ducha', nodoOrigenId: 'n-af-bano', nodoDestinoId: 'n-af-ducha', red: 'AF' },
    { id: 't1-pileta', nodoOrigenId: 'n-af-cocina', nodoDestinoId: 'n-af-pileta', red: 'AF' },
  ]
  return proyectoCon([uf], { nodos, tramos })
}

describe('quitarConectividadFisicaDeLocal', () => {
  it('elimina todos los terminales del Local Y su cabecera de bifurcación exclusiva, sin tocar el otro Local', () => {
    const proyecto = proyectoBase()

    const resultado = quitarConectividadFisicaDeLocal(proyecto, 'uf-1', 'local-bano')

    const idsNodos = resultado.redHidraulica!.nodos.map((n) => n.id)
    expect(idsNodos).not.toContain('n-af-lavatorio')
    expect(idsNodos).not.toContain('n-af-ducha')
    expect(idsNodos).not.toContain('n-af-bano') // cabecera exclusiva del Local eliminado: podada
    expect(idsNodos).toEqual(expect.arrayContaining(['n0', 'n-af-cocina', 'n-af-pileta'])) // otro Local intacto

    const idsTramos = resultado.redHidraulica!.tramos.map((t) => t.id)
    expect(idsTramos).not.toContain('t0-bano')
    expect(idsTramos).not.toContain('t1-lavatorio')
    expect(idsTramos).not.toContain('t1-ducha')
    expect(idsTramos).toEqual(expect.arrayContaining(['t0-cocina', 't1-pileta']))
  })

  it('deja la red estructuralmente válida tras la baja completa del Local (sin referencias huérfanas)', () => {
    const proyecto = proyectoBase()

    const resultado = quitarConectividadFisicaDeLocal(proyecto, 'uf-1', 'local-bano')
    const proyectoCompleto: Proyecto = {
      ...resultado,
      unidadesFuncionales: resultado.unidadesFuncionales.map((uf) => ({
        ...uf,
        locales: uf.locales.filter((l) => l.id !== 'local-bano'),
      })),
    }

    expect(validarRedHidraulica(proyectoCompleto)).toEqual([])
  })

  it('proyecto sin redHidraulica: no-op', () => {
    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'uf-1',
      locales: [{ id: 'local-bano', tipo: 'bano', artefactos: [artefacto('a-1', 'lavatorio')] }],
    }
    const proyecto: Proyecto = {
      metadatos: metadatos(),
      parametros: parametros(),
      unidadesFuncionales: [uf],
      configuracionHidraulica: {
        metodoPerdidaDistribuida: 'hazenWilliams',
        metodoPerdidaLocalizada: 'detallado',
        granularidadHidraulica: 'profesional',
        materialTuberiaId: 'ppr',
        sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
      },
    }

    expect(quitarConectividadFisicaDeLocal(proyecto, 'uf-1', 'local-bano')).toBe(proyecto)
  })

  it('Local inexistente: no-op', () => {
    const proyecto = proyectoBase()

    expect(quitarConectividadFisicaDeLocal(proyecto, 'uf-1', 'inexistente')).toBe(proyecto)
  })
})
