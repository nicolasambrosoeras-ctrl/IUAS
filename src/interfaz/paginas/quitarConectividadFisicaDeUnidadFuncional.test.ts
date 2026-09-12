import { describe, it, expect } from 'vitest'
import type { Artefacto, MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { validarRedHidraulica } from '../../validacion/redHidraulica'
import { quitarConectividadFisicaDeUnidadFuncional } from './quitarConectividadFisicaDeUnidadFuncional'

function metadatos(): MetadatosProyecto {
  return {
    nombre: 'Proyecto D-δ.47 baja de UF',
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

// Dos UF distintas comparten la misma raíz general (n-general), cada una con
// su propia cabecera exclusiva -- reproduce el caso real de duplicar una UF
// y luego eliminar la original (D-δ.47).
function proyectoBase(): Proyecto {
  const unidadesFuncionales: UnidadFuncional[] = [
    {
      id: 'uf-1',
      nombre: 'uf-1',
      niveles: [
        {
          id: 'uf-1-nivel-1',
          nombre: 'Nivel 1',
          locales: [
            {
              id: 'local-bano',
              tipo: 'bano',
              regimen: 'domiciliario',
              artefactos: [artefacto('a-lavatorio', 'lavatorio')],
            },
          ],
        },
      ],
    },
    {
      id: 'uf-2',
      nombre: 'uf-2',
      niveles: [
        {
          id: 'uf-2-nivel-1',
          nombre: 'Nivel 1',
          locales: [
            {
              id: 'local-bano-2',
              tipo: 'bano',
              regimen: 'domiciliario',
              artefactos: [artefacto('a-lavatorio-2', 'lavatorio')],
            },
          ],
        },
      ],
    },
  ]
  const nodos: Nodo[] = [
    { id: 'n-general' },
    { id: 'n-af-uf1' },
    { id: 'n-af-uf2' },
    {
      id: 'n-af-uf1-lavatorio',
      referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'a-lavatorio' },
    },
    {
      id: 'n-af-uf2-lavatorio',
      referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-2', localId: 'local-bano-2', artefactoId: 'a-lavatorio-2' },
    },
  ]
  const tramos: Tramo[] = [
    { id: 't-uf1', nodoOrigenId: 'n-general', nodoDestinoId: 'n-af-uf1', red: 'AF' },
    { id: 't-uf2', nodoOrigenId: 'n-general', nodoDestinoId: 'n-af-uf2', red: 'AF' },
    { id: 't-uf1-lavatorio', nodoOrigenId: 'n-af-uf1', nodoDestinoId: 'n-af-uf1-lavatorio', red: 'AF' },
    { id: 't-uf2-lavatorio', nodoOrigenId: 'n-af-uf2', nodoDestinoId: 'n-af-uf2-lavatorio', red: 'AF' },
  ]
  return proyectoCon(unidadesFuncionales, { nodos, tramos })
}

describe('quitarConectividadFisicaDeUnidadFuncional', () => {
  it('elimina toda la topología exclusiva de la UF sin afectar la otra UF', () => {
    const proyecto = proyectoBase()

    const resultado = quitarConectividadFisicaDeUnidadFuncional(proyecto, 'uf-1')

    const idsNodos = resultado.redHidraulica!.nodos.map((n) => n.id)
    expect(idsNodos).not.toContain('n-af-uf1-lavatorio')
    expect(idsNodos).not.toContain('n-af-uf1')
    expect(idsNodos).toEqual(expect.arrayContaining(['n-general', 'n-af-uf2', 'n-af-uf2-lavatorio']))

    const idsTramos = resultado.redHidraulica!.tramos.map((t) => t.id)
    expect(idsTramos).toEqual(expect.arrayContaining(['t-uf2', 't-uf2-lavatorio']))
    expect(idsTramos).not.toContain('t-uf1')
    expect(idsTramos).not.toContain('t-uf1-lavatorio')
  })

  it('deja la red estructuralmente válida tras la baja completa de la UF', () => {
    const proyecto = proyectoBase()

    const resultado = quitarConectividadFisicaDeUnidadFuncional(proyecto, 'uf-1')
    const proyectoCompleto: Proyecto = {
      ...resultado,
      unidadesFuncionales: resultado.unidadesFuncionales.filter((uf) => uf.id !== 'uf-1'),
    }

    expect(validarRedHidraulica(proyectoCompleto)).toEqual([])
  })

  it('UF inexistente: no-op', () => {
    const proyecto = proyectoBase()

    expect(quitarConectividadFisicaDeUnidadFuncional(proyecto, 'inexistente')).toBe(proyecto)
  })
})
