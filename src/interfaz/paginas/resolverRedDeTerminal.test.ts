import { describe, it, expect } from 'vitest'
import type { MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { resolverRedDeTerminal } from './resolverRedDeTerminal'

function metadatos(): MetadatosProyecto {
  return {
    nombre: 'Proyecto de prueba',
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

function proyectoCon(redHidraulica: RedHidraulica | undefined): Proyecto {
  const uf: UnidadFuncional = { id: 'uf-1', nombre: 'uf-1', locales: [] }
  return {
    metadatos: metadatos(),
    parametros: parametros(),
    unidadesFuncionales: [uf],
    ...(redHidraulica !== undefined ? { redHidraulica } : {}),
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'detallado',
      granularidadHidraulica: 'profesional',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

describe('resolverRedDeTerminal (D-δ.48)', () => {
  it('devuelve AF cuando el tramo entrante al nodo es de red AF', () => {
    const referencia = { tipo: 'artefacto' as const, unidadFuncionalId: 'uf-1', localId: 'local-1', artefactoId: 'a-1' }
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n-af-lavatorio', referencia }]
    const tramos: Tramo[] = [{ id: 't-af', nodoOrigenId: 'n0', nodoDestinoId: 'n-af-lavatorio', red: 'AF' }]

    expect(resolverRedDeTerminal(proyectoCon({ nodos, tramos }), 'n-af-lavatorio')).toBe('AF')
  })

  it('devuelve AC cuando el tramo entrante al nodo es de red AC -- distingue el gemelo AC del mismo artefacto', () => {
    const referencia = { tipo: 'artefacto' as const, unidadFuncionalId: 'uf-1', localId: 'local-1', artefactoId: 'a-1' }
    const nodos: Nodo[] = [
      { id: 'n-acs', referencia: { tipo: 'produccionACS' } },
      { id: 'n-ac-lavatorio', referencia },
    ]
    const tramos: Tramo[] = [{ id: 't-ac', nodoOrigenId: 'n-acs', nodoDestinoId: 'n-ac-lavatorio', red: 'AC' }]

    expect(resolverRedDeTerminal(proyectoCon({ nodos, tramos }), 'n-ac-lavatorio')).toBe('AC')
  })

  it('nodo sin ningún tramo entrante (raíz): undefined', () => {
    const nodos: Nodo[] = [{ id: 'n-general' }]
    expect(resolverRedDeTerminal(proyectoCon({ nodos, tramos: [] }), 'n-general')).toBeUndefined()
  })

  it('proyecto sin redHidraulica: undefined', () => {
    expect(resolverRedDeTerminal(proyectoCon(undefined), 'cualquiera')).toBeUndefined()
  })
})
