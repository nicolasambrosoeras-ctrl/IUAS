// Tests de integración UI↔dominio: verifican que el panel refleja
// correctamente el estado del Proyecto en su render inicial. Mismo
// patrón renderToStaticMarkup que el resto de este directorio -- no hay
// jsdom/testing-library en el repo, así que no se simula onChange real
// (ver ResultadoHidraulicoDeTramo.test.ts); la verificación end-to-end de
// balanceCompleto ya se hizo manualmente contra la web real (Playwright,
// fuera de esta suite).
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import type { Artefacto, MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, ReferenciaDeArtefacto, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { PanelDePresionDeModulo2 } from './PanelDePresionDeModulo2'

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

function artefacto(idInstancia: string, artefactoIdCatalogo: string): Artefacto {
  return { id: idInstancia, artefactoId: artefactoIdCatalogo, cantidad: 1, origen: 'normativo' }
}

function referenciaDe(unidadFuncionalId: string, localId: string, artefactoId: string): ReferenciaDeArtefacto {
  return { tipo: 'artefacto', unidadFuncionalId, localId, artefactoId }
}

function proyectoCon(unidadesFuncionales: readonly UnidadFuncional[], redHidraulica?: RedHidraulica): Proyecto {
  return {
    metadatos: metadatos(),
    parametros: parametros(),
    unidadesFuncionales,
    ...(redHidraulica !== undefined ? { redHidraulica } : {}),
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'detallado',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

describe('PanelDePresionDeModulo2 (UI)', () => {
  it('inputs de Pdisponible y hfMedidor con su etiqueta y unidad, y aclaración de que hfMedidor no es selección de medidor', () => {
    const proyecto = proyectoCon([])

    const html = renderToStaticMarkup(
      createElement(PanelDePresionDeModulo2, { proyecto, catalogoArtefactos, onCambiar: () => {} }),
    )

    expect(html).toContain('Presión disponible (Pdisponible) [m.c.a.]')
    expect(html).toContain('Pérdida de carga del medidor (hfMedidor) [m.c.a.]')
    expect(html).toContain('no representa una selección comercial de medidor')
  })

  it('sin Pdisponible provisto: pide ingresarlo, no intenta mostrar un balance con datos faltantes', () => {
    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'uf-1',
      locales: [{ id: 'local-1', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto('inst-1', 'lavatorio')] }],
    }
    const nodos: Nodo[] = [{ id: 'raiz' }, { id: 'terminal', referencia: referenciaDe('uf-1', 'local-1', 'inst-1') }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'raiz', nodoDestinoId: 'terminal', red: 'AF' }]
    const proyecto = proyectoCon([uf], { nodos, tramos })

    const html = renderToStaticMarkup(
      createElement(PanelDePresionDeModulo2, { proyecto, catalogoArtefactos, onCambiar: () => {} }),
    )

    expect(html).toContain('Ingresá Pdisponible para ver el balance')
  })

  it('sin terminales hidráulicos (red vacía): lo indica explícitamente, no una tabla vacía silenciosa', () => {
    const proyecto = proyectoCon([], { nodos: [], tramos: [] })

    const html = renderToStaticMarkup(
      createElement(PanelDePresionDeModulo2, { proyecto, catalogoArtefactos, onCambiar: () => {} }),
    )

    expect(html).toContain('Ingresá Pdisponible')
  })

  it('muestra el estado de Módulo 2 (resolverEstadoModulo2) sin recalcular hidráulica en React', () => {
    const proyecto = proyectoCon([])

    const html = renderToStaticMarkup(
      createElement(PanelDePresionDeModulo2, { proyecto, catalogoArtefactos, onCambiar: () => {} }),
    )

    expect(html).toContain('Estado de Módulo 2')
    expect(html).toContain('No iniciado')
  })

  it('D-δ.43: ofrece el selector de Tipo de alimentación (Tanque elevado / Presión conocida)', () => {
    const proyecto = proyectoCon([])

    const html = renderToStaticMarkup(
      createElement(PanelDePresionDeModulo2, { proyecto, catalogoArtefactos, onCambiar: () => {} }),
    )

    expect(html).toContain('Tanque elevado')
    expect(html).toContain('Presión conocida / alimentación directa')
  })

  it('D-δ.43: por defecto (Presión conocida) pide cota del punto de alimentación, no la de tanque', () => {
    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'uf-1',
      locales: [{ id: 'local-1', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto('inst-1', 'lavatorio')] }],
    }
    const nodos: Nodo[] = [{ id: 'raiz' }, { id: 'terminal', referencia: referenciaDe('uf-1', 'local-1', 'inst-1') }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'raiz', nodoDestinoId: 'terminal', red: 'AF' }]
    const proyecto = proyectoCon([uf], { nodos, tramos })

    const html = renderToStaticMarkup(
      createElement(PanelDePresionDeModulo2, { proyecto, catalogoArtefactos, onCambiar: () => {} }),
    )

    expect(html).toContain('Cota del punto de alimentación')
    expect(html).not.toContain('Cota del pelo de agua mínimo de cálculo')
  })

  it('D-δ.43: agrupa los motivos de incompletitud en una lista accionable, sin exponer ids de Nodo/Tramo', () => {
    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'uf-1',
      locales: [{ id: 'local-1', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto('inst-1', 'lavatorio')] }],
    }
    const nodos: Nodo[] = [{ id: 'raiz' }, { id: 'terminal', referencia: referenciaDe('uf-1', 'local-1', 'inst-1') }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'raiz', nodoDestinoId: 'terminal', red: 'AF' }]
    const proyecto = proyectoCon([uf], { nodos, tramos })

    const html = renderToStaticMarkup(
      createElement(PanelDePresionDeModulo2, { proyecto, catalogoArtefactos, onCambiar: () => {} }),
    )

    expect(html).toContain('Para completar Módulo 2:')
    expect(html).toContain('Falta indicar el tipo de alimentación')
    expect(html).not.toContain('>raiz<')
    expect(html).not.toContain('>terminal<')
  })
})
