// UI-01A (D-δ.72) — estructura de navegación y orden del flujo de trabajo.
// No verifica estética ni clases CSS: sólo el ORDEN del DOM (que gobierna
// tab-order y lectores de pantalla), los anchors estables, el índice y
// que el panel de verificación se monte UNA sola vez tras moverlo.
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import { MotorDemandaPantalla } from './MotorDemandaPantalla'

function render(): string {
  return renderToStaticMarkup(createElement(MotorDemandaPantalla))
}

// Índice de la primera aparición de `sub` en `html`, o -1.
const at = (html: string, sub: string): number => html.indexOf(sub)

describe('MotorDemandaPantalla — estructura de navegación (UI-01A)', () => {
  const html = render()

  it('las cinco etapas aparecen en el DOM en el orden del flujo de trabajo', () => {
    const demanda = at(html, 'id="demanda"')
    const tuberias = at(html, 'id="tuberias"')
    const medidores = at(html, 'id="medidores"')
    const abastecimiento = at(html, 'id="abastecimiento"')
    const verificacion = at(html, 'id="verificacion-hidraulica"')

    for (const [nombre, indice] of Object.entries({ demanda, tuberias, medidores, abastecimiento, verificacion })) {
      expect(indice, `falta la sección ${nombre}`).toBeGreaterThan(-1)
    }
    expect(demanda).toBeLessThan(tuberias)
    expect(tuberias).toBeLessThan(medidores)
    expect(medidores).toBeLessThan(abastecimiento)
    expect(abastecimiento).toBeLessThan(verificacion)
  })

  it('los encabezados de etapa siguen el mismo orden que las secciones', () => {
    // UI-01B (D-δ.73): el encabezado de cada etapa pasó al patrón visual
    // único "[NN] Título" (EncabezadoDeEtapa), sin la redundancia "Módulo
    // N — ...". Se verifica el orden por el <h2> de título de etapa.
    const d = at(html, 'Demanda</h2>')
    const t = at(html, 'Tuberías</h2>')
    const m = at(html, 'Medidores</h2>')
    const a = at(html, 'Abastecimiento y reserva</h2>')
    const v = at(html, 'Verificación hidráulica</h2>')
    expect(Math.min(d, t, m, a, v)).toBeGreaterThan(-1)
    expect(d).toBeLessThan(t)
    expect(t).toBeLessThan(m)
    expect(m).toBeLessThan(a)
    expect(a).toBeLessThan(v)
  })

  it('la Verificación hidráulica queda DESPUÉS de Abastecimiento (etapa final del flujo)', () => {
    expect(at(html, 'id="abastecimiento"')).toBeLessThan(at(html, 'id="verificacion-hidraulica"'))
    // y su ayuda deja claro que integra los resultados anteriores
    expect(html).toContain('usando las tuberías dimensionadas, los medidores y el esquema de abastecimiento')
  })

  it('el panel de Verificación de presión se monta UNA sola vez (no se duplicó al moverlo)', () => {
    const marcador = 'Verificación de presión</h3>'
    const ocurrencias = html.split(marcador).length - 1
    expect(ocurrencias).toBe(1)
  })

  it('la sección de Tuberías ya NO contiene el panel de presión (quedó sólo dimensionamiento)', () => {
    const tuberias = at(html, 'id="tuberias"')
    const medidores = at(html, 'id="medidores"')
    const bloqueTuberias = html.slice(tuberias, medidores)
    expect(bloqueTuberias).not.toContain('Verificación de presión</h3>')
    expect(bloqueTuberias).toContain('Dimensionamiento hidráulico de la red')
  })

  it('hay un índice lateral <nav> con las cinco etapas como anchors', () => {
    expect(html).toContain('<nav class="app-nav" aria-label="Secciones del proyecto">')
    for (const id of ['demanda', 'tuberias', 'medidores', 'abastecimiento', 'verificacion-hidraulica']) {
      expect(html, `falta el link a #${id}`).toContain(`href="#${id}"`)
    }
    // los cinco textos visibles del índice
    for (const etiqueta of ['Demanda', 'Tuberías', 'Medidores', 'Abastecimiento y reserva', 'Verificación hidráulica']) {
      expect(html).toContain(etiqueta)
    }
  })

  it('el índice aparece antes que el contenido en el DOM (tab-order)', () => {
    expect(at(html, 'class="app-nav"')).toBeLessThan(at(html, 'class="app-contenido"'))
    expect(at(html, 'class="app-nav"')).toBeLessThan(at(html, 'id="demanda"'))
  })
})
