import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import type { MetadatosProyecto, ParametrosProyecto, Proyecto } from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import type { NodoDeBifurcacion } from '../../motor/tuberias/topologia/identificarNodosDeBifurcacion'
import { TeeDeNodoEditor } from './TeeDeNodoEditor'

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

function proyectoConBifurcacion(teeDelNodoMid?: Nodo['tee']): Proyecto {
  const nodos: Nodo[] = [
    { id: 'raiz' },
    { id: 'mid', ...(teeDelNodoMid !== undefined ? { tee: teeDelNodoMid } : {}) },
    { id: 'a' },
    { id: 'b' },
  ]
  const tramos: Tramo[] = [
    { id: 't0', nodoOrigenId: 'raiz', nodoDestinoId: 'mid', red: 'AF' },
    { id: 't1', nodoOrigenId: 'mid', nodoDestinoId: 'a', red: 'AF' },
    { id: 't2', nodoOrigenId: 'mid', nodoDestinoId: 'b', red: 'AF' },
  ]
  const redHidraulica: RedHidraulica = { nodos, tramos }
  return {
    metadatos: metadatos(),
    parametros: parametros(),
    unidadesFuncionales: [],
    redHidraulica,
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'detallado',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

const bifurcacion: NodoDeBifurcacion = { nodoId: 'mid', tramoEntranteId: 't0', tramosSalientesIds: ['t1', 't2'] }

describe('TeeDeNodoEditor (UI)', () => {
  it('tee sin configurar: ofrece entradaCentral y entradaPorExtremo con cada salida como opción de recta', () => {
    const proyecto = proyectoConBifurcacion(undefined)

    const html = renderToStaticMarkup(createElement(TeeDeNodoEditor, { proyecto, nodoDeBifurcacion: bifurcacion, onCambiar: () => {} }))

    expect(html).toContain('Bifurcación sin configurar')
    expect(html).toContain('Entrada central')
    expect(html).toContain('t1 es la recta')
    expect(html).toContain('t2 es la recta')
  })

  it('tee configurada como entradaCentral: muestra el resumen, no los botones de configuración', () => {
    const proyecto = proyectoConBifurcacion({ tipo: 'entradaCentral' })

    const html = renderToStaticMarkup(createElement(TeeDeNodoEditor, { proyecto, nodoDeBifurcacion: bifurcacion, onCambiar: () => {} }))

    expect(html).toContain('Entrada central')
    expect(html).not.toContain('Bifurcación sin configurar')
    expect(html).toContain('Reconfigurar')
  })

  it('tee configurada como entradaPorExtremo: identifica cuál salida es recta y cuál lateral', () => {
    const proyecto = proyectoConBifurcacion({ tipo: 'entradaPorExtremo', tramoSalidaRectaId: 't1' })

    const html = renderToStaticMarkup(createElement(TeeDeNodoEditor, { proyecto, nodoDeBifurcacion: bifurcacion, onCambiar: () => {} }))

    expect(html).toContain('recta: t1')
    expect(html).toContain('lateral: t2')
  })

  it('nunca persiste Ks, ángulos, coordenadas ni orientación absoluta -- no aparecen en el HTML', () => {
    const proyecto = proyectoConBifurcacion(undefined)

    const html = renderToStaticMarkup(createElement(TeeDeNodoEditor, { proyecto, nodoDeBifurcacion: bifurcacion, onCambiar: () => {} }))

    expect(html.toLowerCase()).not.toContain('ks')
    expect(html.toLowerCase()).not.toContain('ángulo')
    expect(html.toLowerCase()).not.toContain('coordenada')
  })
})
