// M2-TOPO-B (§3-§8, §25-§27): la vista de dimensionamiento de Módulo 2
// muestra una sección "Distribución secundaria" con una fila por Tramo
// compartido, editable con las mismas capacidades que cualquier fila
// física -- y NO muestra nada cuando la topología es plana (proyecto de
// ejemplo). Render SSR (renderToStaticMarkup), mismo enfoque que
// MotorDemandaPantalla.estructura.test.ts (el entorno de test es 'node').
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import type { Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { proyectoInicial } from './proyectoDeEjemplo'
import { ResultadoHidraulicoDeTramo } from './ResultadoHidraulicoDeTramo'

function render(proyecto: Proyecto): string {
  return renderToStaticMarkup(
    createElement(ResultadoHidraulicoDeTramo, { proyecto, catalogoArtefactos, onCambiar: () => {} }),
  )
}

function ufLavatorio(id: string, localId: string): UnidadFuncional {
  return {
    id,
    nombre: id,
    nivel: 1,
    cotaHidraulicaReferencia_m: 3,
    locales: [
      {
        id: localId,
        tipo: 'bano',
        regimen: 'domiciliario',
        artefactos: [{ id: `${localId}-a`, artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }],
      },
    ],
  }
}

// raíz -> segA -> (L1) -> segB -> L2. segA alcanza L1+L2 (compartido);
// segB alcanza sólo L2 (representativo).
function proyectoConMontante(): Proyecto {
  const nodos: Nodo[] = [
    { id: 'n-acera', cota_m: 0 },
    { id: 'n0', cota_m: 0 },
    { id: 'n1', cota_m: 3, tee: { tipo: 'entradaCentral' } },
    { id: 'n-t1', cota_m: 3, referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'l1', artefactoId: 'l1-a' } },
    { id: 'n-t2', cota_m: 6, referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-2', localId: 'l2', artefactoId: 'l2-a' } },
  ]
  const tramos: Tramo[] = [
    { id: 't-general', nodoOrigenId: 'n-acera', nodoDestinoId: 'n0', red: 'AF', longitud_m: 10, accesorios: [] },
    { id: 't-segA', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF', longitud_m: 3, accesorios: [] },
    { id: 't-d1', nodoOrigenId: 'n1', nodoDestinoId: 'n-t1', red: 'AF', longitud_m: 1, accesorios: [] },
    { id: 't-segB', nodoOrigenId: 'n1', nodoDestinoId: 'n-t2', red: 'AF', longitud_m: 3, accesorios: [] },
  ]
  const redHidraulica: RedHidraulica = { nodos, tramos }
  return {
    metadatos: {
      nombre: 'Montante',
      obra: 'Obra',
      comitente: 'Comitente',
      fecha: '2026-01-01',
      schemaVersion: '1.0.0',
      versionNormativa: 'eras-2023',
    },
    parametros: { tipoDeProyecto: 'viviendaMultifamiliar', presionSobreAcera_m: 0, alturaArtefactoMasDesfavorable_m: 0 },
    unidadesFuncionales: [ufLavatorio('uf-1', 'l1'), ufLavatorio('uf-2', 'l2')],
    redHidraulica,
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'estimado',
      granularidadHidraulica: 'simplificada',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

describe('Módulo 2 — sección "Distribución secundaria"', () => {
  it('topología plana (proyecto de ejemplo): la sección NO se renderiza -- la UX actual no cambia', () => {
    const html = render(proyectoInicial)
    expect(html).not.toContain('Distribución secundaria')
  })

  it('montante segmentado: aparece la sección con una fila por segmento compartido, numerada', () => {
    const html = render(proyectoConMontante())
    expect(html).toContain('<h3>Distribución secundaria</h3>')
    expect(html).toContain('Distribución secundaria 1')
    // segB alimenta sólo un Local -> NO es fila de distribución secundaria.
    expect(html).not.toContain('Distribución secundaria 2')
  })

  it('la fila de distribución secundaria trae longitud editable (input con aria-label propio)', () => {
    const html = render(proyectoConMontante())
    expect(html).toContain('aria-label="Longitud [m] de Distribución secundaria 1 Agua fría"')
  })

  it('la fila expone el mismo control de DN (↓/↑/Auto) que el resto de las filas', () => {
    const html = render(proyectoConMontante())
    // ControlDeDn rotula sus acciones -- basta con que aparezca el control
    // de "volver a automático" para la fila secundaria.
    expect(html).toMatch(/Distribución secundaria 1[\s\S]{0,4000}(Auto|autom)/i)
  })
})
