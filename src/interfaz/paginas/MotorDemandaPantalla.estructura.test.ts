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

  it('la etapa 01 abre con su encabezado y contiene TODO el perímetro de Demanda (UI-01C)', () => {
    // UI-01C (D-δ.74): el encabezado "01 Demanda" abre la etapa, ANTES de
    // "Datos del proyecto". Toda la configuración que determina la Demanda
    // (tipología, UFs, Locales, Artefactos) y su Resultado viven dentro de
    // la sección `demanda`, en ese orden; nada de M1 queda antes del
    // encabezado ni después de la etapa.
    const seccion = at(html, 'id="demanda"')
    const encabezado01 = at(html, 'Demanda</h2>')
    const datosProyecto = at(html, 'Datos del proyecto')
    // UX-01 / UI-01D (D-δ.76): la cabecera de la UF pasó a ser un botón de
    // disclosure (patrón APG) -- ancla estable en la clase del toggle.
    const unidadFuncional = at(html, 'm1-uf__toggle')
    const artefactos = at(html, 'Artefactos</p>')
    const resultado = at(html, 'Resultado de demanda</summary>')
    const tuberias = at(html, 'id="tuberias"')

    for (const [nombre, indice] of Object.entries({
      encabezado01,
      datosProyecto,
      unidadFuncional,
      artefactos,
      resultado,
    })) {
      expect(indice, `falta ${nombre} en la etapa 01`).toBeGreaterThan(-1)
    }
    // El encabezado 01 abre la etapa, antes de la configuración.
    expect(seccion).toBeLessThan(encabezado01)
    expect(encabezado01).toBeLessThan(datosProyecto)
    // Orden interno: datos del proyecto → UF → Locales/Artefactos → resultado.
    expect(datosProyecto).toBeLessThan(unidadFuncional)
    expect(unidadFuncional).toBeLessThan(artefactos)
    expect(artefactos).toBeLessThan(resultado)
    // Todo el perímetro de M1 queda dentro de la etapa, antes de Tuberías.
    expect(resultado).toBeLessThan(tuberias)
  })

  it('UX-01 / UI-01D: la UF del proyecto inicial monta EXPANDIDA con un toggle accesible', () => {
    // Estado inicial (secciones 3/16/38): las UF ya presentes al montar
    // arrancan abiertas -> aria-expanded="true"; su detalle (Nombre
    // editable, Locales) está en el DOM.
    expect(html).toContain('class="m1-uf__toggle"')
    expect(html).toContain('aria-expanded="true"')
    expect(html).toContain('aria-controls="uf-contenido-uf-1"')
    expect(html).toContain('id="uf-contenido-uf-1"')
    // Con la UF abierta hay control inferior de contraer (sección 10) y el
    // detalle editable es visible.
    expect(html).toContain('↑ Contraer unidad funcional')
    expect(html).toContain('Nombre de la unidad funcional')
    // El contenido NO está oculto (no hay atributo hidden en el wrapper).
    expect(html).not.toContain('id="uf-contenido-uf-1" hidden')
    // Duplicar sigue disponible en la cabecera.
    expect(html).toContain('>Duplicar</button>')
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
