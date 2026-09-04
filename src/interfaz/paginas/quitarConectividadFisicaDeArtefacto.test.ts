import { describe, it, expect } from 'vitest'
import type { Artefacto, MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { validarRedHidraulica } from '../../validacion/redHidraulica'
import { quitarConectividadFisicaDeArtefacto } from './quitarConectividadFisicaDeArtefacto'

function metadatos(): MetadatosProyecto {
  return {
    nombre: 'Proyecto M2-D baja',
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
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

// Baño con bifurcación AF (n-af-1 -> lavatorio, ducha) y ambos también
// conectados a AC via n-acs (sin bifurcación AC dedicada, un solo hijo
// cada terminal directo desde n-acs para simplificar).
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
    ],
  }
  const nodos: Nodo[] = [
    { id: 'n0' },
    { id: 'n-af-1' },
    { id: 'n-acs', referencia: { tipo: 'produccionACS' } },
    { id: 'n-af-lavatorio', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'a-lavatorio' } },
    { id: 'n-ac-lavatorio', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'a-lavatorio' } },
    { id: 'n-af-ducha', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'a-ducha' } },
  ]
  const tramos: Tramo[] = [
    { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n-af-1', red: 'AF' },
    { id: 't1', nodoOrigenId: 'n-af-1', nodoDestinoId: 'n-af-lavatorio', red: 'AF', longitud_m: 2 },
    { id: 't2', nodoOrigenId: 'n-af-1', nodoDestinoId: 'n-af-ducha', red: 'AF', longitud_m: 3 },
    { id: 't3', nodoOrigenId: 'n-acs', nodoDestinoId: 'n-ac-lavatorio', red: 'AC' },
  ]
  return proyectoCon([uf], { nodos, tramos })
}

describe('quitarConectividadFisicaDeArtefacto', () => {
  it('elimina TODOS los terminales (AF y AC) del artefacto, y solo sus tramos entrantes exclusivos', () => {
    const proyecto = proyectoBase()

    const resultado = quitarConectividadFisicaDeArtefacto(proyecto, 'uf-1', 'local-bano', 'a-lavatorio')

    const idsNodos = resultado.redHidraulica!.nodos.map((n) => n.id)
    expect(idsNodos).not.toContain('n-af-lavatorio')
    expect(idsNodos).not.toContain('n-ac-lavatorio')
    // El resto de la topologia sigue intacta.
    expect(idsNodos).toEqual(expect.arrayContaining(['n0', 'n-af-1', 'n-acs', 'n-af-ducha']))

    const idsTramos = resultado.redHidraulica!.tramos.map((t) => t.id)
    expect(idsTramos).not.toContain('t1') // entraba a n-af-lavatorio
    expect(idsTramos).not.toContain('t3') // entraba a n-ac-lavatorio
    expect(idsTramos).toEqual(expect.arrayContaining(['t0', 't2'])) // resto intacto
  })

  it('NUNCA elimina el nodo padre/cabecera, aunque quede sin otros hijos', () => {
    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'uf-1',
      locales: [{ id: 'local-bano', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto('a-lavatorio', 'lavatorio')] }],
    }
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n-af-1' }, // cabecera con UN solo hijo
      { id: 'n-af-lavatorio', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'a-lavatorio' } },
    ]
    const tramos: Tramo[] = [
      { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n-af-1', red: 'AF' },
      { id: 't1', nodoOrigenId: 'n-af-1', nodoDestinoId: 'n-af-lavatorio', red: 'AF' },
    ]
    const proyecto = proyectoCon([uf], { nodos, tramos })

    const resultado = quitarConectividadFisicaDeArtefacto(proyecto, 'uf-1', 'local-bano', 'a-lavatorio')

    // n-af-1 sobrevive, ahora sin ningun tramo saliente -- estado
    // topologicamente valido (nodo hoja intermedio), a proposito.
    expect(resultado.redHidraulica!.nodos.map((n) => n.id)).toContain('n-af-1')
    expect(resultado.redHidraulica!.tramos).toEqual([{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n-af-1', red: 'AF' }])
  })

  it('preserva longitud_m/accesorios de tramos no relacionados con el artefacto eliminado', () => {
    const proyecto = proyectoBase()

    const resultado = quitarConectividadFisicaDeArtefacto(proyecto, 'uf-1', 'local-bano', 'a-lavatorio')

    const t2 = resultado.redHidraulica!.tramos.find((t) => t.id === 't2')
    expect(t2).toEqual({ id: 't2', nodoOrigenId: 'n-af-1', nodoDestinoId: 'n-af-ducha', red: 'AF', longitud_m: 3 })
  })

  it('deja la red estructuralmente valida tras la baja (sin referencias huerfanas)', () => {
    const proyecto = proyectoBase()

    const resultado = quitarConectividadFisicaDeArtefacto(proyecto, 'uf-1', 'local-bano', 'a-lavatorio')

    // El artefacto todavia esta en la jerarquia funcional en este test
    // (solo se probo la mitad hidraulica) -- se elimina de artefactos
    // tambien para que validarRedHidraulica no reporte nada distinto de
    // lo esperado (referencia inexistente resuelta correctamente).
    const proyectoCompleto: Proyecto = {
      ...resultado,
      unidadesFuncionales: resultado.unidadesFuncionales.map((uf) => ({
        ...uf,
        locales: uf.locales.map((l) => ({ ...l, artefactos: l.artefactos.filter((a) => a.id !== 'a-lavatorio') })),
      })),
    }
    expect(validarRedHidraulica(proyectoCompleto)).toEqual([])
  })

  it('proyecto sin redHidraulica: no-op', () => {
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'uf-1', locales: [{ id: 'l-1', tipo: 'bano', artefactos: [artefacto('a-1', 'lavatorio')] }] }
    const proyecto: Proyecto = {
      metadatos: metadatos(),
      parametros: parametros(),
      unidadesFuncionales: [uf],
      configuracionHidraulica: { metodoPerdidaDistribuida: 'hazenWilliams', metodoPerdidaLocalizada: 'detallado', materialTuberiaId: 'ppr', sistemaDeTuberiaId: 'acquaSystemMagnumPn20' },
    }

    expect(quitarConectividadFisicaDeArtefacto(proyecto, 'uf-1', 'l-1', 'a-1')).toBe(proyecto)
  })

  it('artefacto sin ningun terminal fisico: no-op (nada que quitar)', () => {
    const proyecto = proyectoBase()

    const resultado = quitarConectividadFisicaDeArtefacto(proyecto, 'uf-1', 'local-bano', 'inexistente')

    expect(resultado).toBe(proyecto)
  })
})
