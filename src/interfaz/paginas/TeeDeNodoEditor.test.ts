// M2-TOPO-D: render SSR del editor de `Nodo.tee` refactorizado a radios.
// Interacción real (elegir tipo, elegir recta) la cubren el E2E de
// montantes y el fuzz; acá se verifica el markup de cada estado.
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
      granularidadHidraulica: 'profesional',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

const bifurcacion: NodoDeBifurcacion = { nodoId: 'mid', tramoEntranteId: 't0', tramosSalientesIds: ['t1', 't2'] }
const etiquetasDeSalida = { t1: 'Lavatorio', t2: 'Ducha' }

function render(proyecto: Proyecto, etiquetas: Readonly<Record<string, string>> = etiquetasDeSalida): string {
  return renderToStaticMarkup(
    createElement(TeeDeNodoEditor, { proyecto, nodoDeBifurcacion: bifurcacion, etiquetasDeSalida: etiquetas, onCambiar: () => {} }),
  )
}

describe('TeeDeNodoEditor (UI, M2-TOPO-D)', () => {
  it('tee sin configurar: fieldset, ambas salidas con nombre humano, radios sin marcar, aviso de pendiente', () => {
    const html = render(proyectoConBifurcacion(undefined))
    expect(html).toContain('Configuración de la derivación')
    expect(html).toContain('Se divide hacia')
    expect(html).toContain('Lavatorio')
    expect(html).toContain('Ducha')
    expect(html).toContain('La cañería entra por…')
    expect(html).toContain('Falta definir la configuración de la derivación')
    // Ningún radio marcado -> selección arranca vacía (§28: sin default).
    expect(html).not.toContain('checked')
    // El grupo de "continúa recta" NO aparece hasta elegir "por un extremo".
    expect(html).not.toContain('Continúa recta hacia…')
  })

  it('entradaCentral: el radio "el centro" queda marcado, sin grupo de recta', () => {
    const html = render(proyectoConBifurcacion({ tipo: 'entradaCentral' }))
    expect(html).toContain('el centro (ambas salidas son laterales)')
    expect(html).toContain('checked')
    expect(html).not.toContain('Continúa recta hacia…')
    expect(html).not.toContain('Falta definir la configuración')
  })

  it('entradaPorExtremo recta=t1: aparece el grupo de recta con "Lavatorio" marcado', () => {
    const html = render(proyectoConBifurcacion({ tipo: 'entradaPorExtremo', tramoSalidaRectaId: 't1' }))
    expect(html).toContain('Continúa recta hacia…')
    // El radio de "Lavatorio" (t1) queda marcado; el de "Ducha" no.
    expect(html).toMatch(/checked=""[^>]*\/>\s*Lavatorio/)
    expect(html).not.toMatch(/checked=""[^>]*\/>\s*Ducha/)
  })

  it('entradaPorExtremo recta=t2: se invierte la marca (Ducha marcada, Lavatorio no)', () => {
    const html = render(proyectoConBifurcacion({ tipo: 'entradaPorExtremo', tramoSalidaRectaId: 't2' }))
    expect(html).toMatch(/checked=""[^>]*\/>\s*Ducha/)
    expect(html).not.toMatch(/checked=""[^>]*\/>\s*Lavatorio/)
  })

  it('nunca muestra ids técnicos de Nodo/Tramo -- ni siquiera en atributos (name de los radios es opaco)', () => {
    const html = render(proyectoConBifurcacion({ tipo: 'entradaPorExtremo', tramoSalidaRectaId: 't1' }))
    expect(html).not.toContain('"t1"')
    expect(html).not.toContain('"t2"')
    expect(html).not.toContain('mid')
    expect(html).not.toMatch(/\bt0\b/)
  })

  it('nunca persiste Ks, ángulos, coordenadas ni orientación absoluta', () => {
    const html = render(proyectoConBifurcacion(undefined)).toLowerCase()
    expect(html).not.toContain('ks')
    expect(html).not.toContain('ángulo')
    expect(html).not.toContain('coordenada')
    expect(html).not.toContain('izquierda')
    expect(html).not.toContain('derecha')
  })

  it('fallback: si el llamador olvida una etiqueta, usa un texto neutro -- NUNCA el tramoId (FIX-LEAK)', () => {
    const html = render(proyectoConBifurcacion(undefined), {})
    expect(html).toContain('salida sin identificar')
    expect(html).not.toContain('t1')
    expect(html).not.toContain('t2')
  })
})
