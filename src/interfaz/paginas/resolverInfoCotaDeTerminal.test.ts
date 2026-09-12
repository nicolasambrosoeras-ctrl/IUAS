import { describe, it, expect } from 'vitest'
import type { MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { ReferenciaDeArtefacto } from '../../modelo/redHidraulica'
import { resolverInfoCotaDeTerminal } from './resolverInfoCotaDeTerminal'

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

function referenciaDe(unidadFuncionalId: string, localId: string, artefactoId: string): ReferenciaDeArtefacto {
  return { tipo: 'artefacto', unidadFuncionalId, localId, artefactoId }
}

// D-δ.46: resolverInfoCotaDeTerminal es la decisión pura que gobierna si
// TarjetaDeTerminal muestra un input editable (profesional / caso
// degenerado raíz=terminal) o la cota de referencia de la UF de solo
// lectura (simplificada).
describe('resolverInfoCotaDeTerminal (D-δ.46)', () => {
  function proyectoConGranularidad(
    granularidadHidraulica: 'simplificada' | 'profesional',
    cotaHidraulicaReferencia_m?: number,
  ): Proyecto {
    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'Unidad funcional 1',
      niveles: [
        {
          id: 'uf-1-nivel-1',
          nombre: 'Nivel 1',
          ...(cotaHidraulicaReferencia_m !== undefined ? { cotaHidraulicaReferencia_m } : {}),
          locales: [{ id: 'local-1', tipo: 'bano', regimen: 'domiciliario', artefactos: [] }],
        },
      ],
    }
    return {
      metadatos: metadatos(),
      parametros: parametros(),
      unidadesFuncionales: [uf],
      configuracionHidraulica: {
        metodoPerdidaDistribuida: 'hazenWilliams',
        metodoPerdidaLocalizada: 'detallado',
        granularidadHidraulica,
        materialTuberiaId: 'ppr',
        sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
      },
    }
  }

  const nodoTerminal = { id: 'terminal-1', referencia: referenciaDe('uf-1', 'local-1', 'inst-1'), cota_m: 3 }

  it("'profesional': siempre 'individual' con la cota propia del Nodo, sin importar la UF", () => {
    const proyecto = proyectoConGranularidad('profesional', 99)

    const info = resolverInfoCotaDeTerminal(proyecto, 'terminal-1', nodoTerminal, false, () => {})

    expect(info).toEqual({ tipo: 'individual', cota_m: 3, onCambiarCota: expect.any(Function) })
  })

  it("'simplificada', terminal real (no raíz): 'deUF' con el nombre y la cota de la UF, ignorando la cota propia del Nodo", () => {
    const proyecto = proyectoConGranularidad('simplificada', 7)

    const info = resolverInfoCotaDeTerminal(proyecto, 'terminal-1', nodoTerminal, false, () => {})

    expect(info).toEqual({ tipo: 'deUF', nombreUF: 'Unidad funcional 1', cota_m: 7 })
  })

  it("'simplificada', caso degenerado (terminal ES la raíz): conserva 'individual', nunca la cota de la UF", () => {
    const proyecto = proyectoConGranularidad('simplificada', 7)

    const info = resolverInfoCotaDeTerminal(proyecto, 'terminal-1', nodoTerminal, true, () => {})

    expect(info).toEqual({ tipo: 'individual', cota_m: 3, onCambiarCota: expect.any(Function) })
  })

  it("'simplificada' sin nodoDelTerminal resuelto (caso borde): 'individual' con cota_m undefined, nunca inventa una UF", () => {
    const proyecto = proyectoConGranularidad('simplificada', 7)

    const info = resolverInfoCotaDeTerminal(proyecto, 'terminal-1', undefined, false, () => {})

    expect(info).toEqual({ tipo: 'individual', cota_m: undefined, onCambiarCota: expect.any(Function) })
  })

  // D-δ.48: fixture con DOS UnidadesFuncionales de cota distinta -- ningún
  // test anterior podía detectar un bug de "siempre toma la primera UF"
  // (ej. .find() mal indexado) porque todos usaban un único uf-1. Reproduce
  // la matriz PB/Piso1/Piso2/Piso3 pedida por el brief: cada terminal debe
  // resolver EXACTAMENTE la cota de SU PROPIA UnidadFuncional, nunca la de
  // otra, aunque ambas convivan en el mismo proyecto.
  it("'simplificada', dos UF con cotas distintas: cada terminal resuelve la cota de SU PROPIA UF, nunca la de la otra", () => {
    const ufPB: UnidadFuncional = {
      id: 'uf-pb',
      nombre: 'PB',
      niveles: [
        {
          id: 'uf-pb-nivel-1',
          nombre: 'Nivel 1',
          cotaHidraulicaReferencia_m: 1,
          locales: [{ id: 'local-1', tipo: 'bano', regimen: 'domiciliario', artefactos: [] }],
        },
      ],
    }
    const ufPiso2: UnidadFuncional = {
      id: 'uf-piso2',
      nombre: 'Piso 2',
      niveles: [
        {
          id: 'uf-piso2-nivel-1',
          nombre: 'Nivel 1',
          cotaHidraulicaReferencia_m: 7,
          locales: [{ id: 'local-1', tipo: 'bano', regimen: 'domiciliario', artefactos: [] }],
        },
      ],
    }
    const proyecto: Proyecto = {
      metadatos: metadatos(),
      parametros: parametros(),
      unidadesFuncionales: [ufPB, ufPiso2],
      configuracionHidraulica: {
        metodoPerdidaDistribuida: 'hazenWilliams',
        metodoPerdidaLocalizada: 'detallado',
        granularidadHidraulica: 'simplificada',
        materialTuberiaId: 'ppr',
        sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
      },
    }
    const terminalDePB = { id: 't-pb', referencia: referenciaDe('uf-pb', 'local-1', 'inst-1'), cota_m: 999 }
    const terminalDePiso2 = { id: 't-piso2', referencia: referenciaDe('uf-piso2', 'local-1', 'inst-2'), cota_m: 999 }

    const infoPB = resolverInfoCotaDeTerminal(proyecto, 't-pb', terminalDePB, false, () => {})
    const infoPiso2 = resolverInfoCotaDeTerminal(proyecto, 't-piso2', terminalDePiso2, false, () => {})

    expect(infoPB).toEqual({ tipo: 'deUF', nombreUF: 'PB', cota_m: 1 })
    expect(infoPiso2).toEqual({ tipo: 'deUF', nombreUF: 'Piso 2', cota_m: 7 })
  })
})
