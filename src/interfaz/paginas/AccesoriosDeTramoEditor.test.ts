// Tests de integración UI↔dominio: verifican que el componente refleja
// correctamente el estado real de Tramo.accesorios (sin relevar/relevado
// vacío/con instancias), no la matemática hidráulica -- mismo patrón
// renderToStaticMarkup que ResultadoHidraulicoDeTramo.test.ts (sin
// @testing-library/react, sin jsdom).
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import type { MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { AccesoriosDeTramoEditor, nombreDeAccesorio } from './AccesoriosDeTramoEditor'

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

function proyectoConTramo(tramo: Tramo): Proyecto {
  const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1' }]
  const redHidraulica: RedHidraulica = { nodos, tramos: [tramo] }
  const unidadesFuncionales: UnidadFuncional[] = []
  return { metadatos: metadatos(), parametros: parametros(), unidadesFuncionales, redHidraulica, configuracionHidraulica: { metodoPerdidaDistribuida: 'hazenWilliams', metodoPerdidaLocalizada: 'detallado', materialTuberiaId: 'ppr', sistemaDeTuberiaId: 'acquaSystemMagnumPn20' } }
}

describe('nombreDeAccesorio', () => {
  it('reutiliza el nombre de Tabla N°7, nunca un texto propio desincronizado', () => {
    expect(nombreDeAccesorio('codo90')).toBe('Codo a 90º')
    expect(nombreDeAccesorio('llaveDePaso')).toBe('Llave de paso')
  })
})

describe('AccesoriosDeTramoEditor (UI)', () => {
  it('accesorios undefined (no relevado): muestra el botón "Relevar accesorios", no una lista vacía', () => {
    const proyecto = proyectoConTramo({ id: 't1', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' })

    const html = renderToStaticMarkup(
      createElement(AccesoriosDeTramoEditor, { proyecto, tramoId: 't1', velocidadReal_mps: undefined, onCambiar: () => {} }),
    )

    expect(html).toContain('no relevados todavía')
    expect(html).toContain('Relevar accesorios')
  })

  it('accesorios=[] (relevado, vacío): NO muestra el botón "Relevar accesorios" -- ya está relevado', () => {
    const proyecto = proyectoConTramo({ id: 't1', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF', accesorios: [] })

    const html = renderToStaticMarkup(
      createElement(AccesoriosDeTramoEditor, { proyecto, tramoId: 't1', velocidadReal_mps: undefined, onCambiar: () => {} }),
    )

    expect(html).not.toContain('Relevar accesorios')
    expect(html).toContain('sin accesorios de este subconjunto')
  })

  it('accesorios con instancias: lista cada uno con su cantidad y nombre normativo, con velocidad calcula y muestra hf localizada', () => {
    const proyecto = proyectoConTramo({
      id: 't1',
      nodoOrigenId: 'n0',
      nodoDestinoId: 'n1',
      red: 'AF',
      accesorios: [{ tipo: 'codo90', cantidad: 2 }],
    })

    const html = renderToStaticMarkup(
      createElement(AccesoriosDeTramoEditor, { proyecto, tramoId: 't1', velocidadReal_mps: 1.2, onCambiar: () => {} }),
    )

    expect(html).toContain('Codo a 90º')
    expect(html).toContain('Pérdida localizada de este tramo')
  })

  it('sin velocidad real resuelta todavía: no intenta mostrar una pérdida localizada inventada', () => {
    const proyecto = proyectoConTramo({
      id: 't1',
      nodoOrigenId: 'n0',
      nodoDestinoId: 'n1',
      red: 'AF',
      accesorios: [{ tipo: 'codo90', cantidad: 1 }],
    })

    const html = renderToStaticMarkup(
      createElement(AccesoriosDeTramoEditor, { proyecto, tramoId: 't1', velocidadReal_mps: undefined, onCambiar: () => {} }),
    )

    expect(html).not.toContain('Pérdida localizada de este tramo')
  })

  it('el selector "+ Agregar accesorio" solo ofrece tipos todavía no declarados en este tramo', () => {
    const proyecto = proyectoConTramo({
      id: 't1',
      nodoOrigenId: 'n0',
      nodoDestinoId: 'n1',
      red: 'AF',
      accesorios: [{ tipo: 'codo90', cantidad: 1 }],
    })

    const html = renderToStaticMarkup(
      createElement(AccesoriosDeTramoEditor, { proyecto, tramoId: 't1', velocidadReal_mps: undefined, onCambiar: () => {} }),
    )

    expect(html).toContain('Llave de paso')
    // 'codo90' ya declarado: no debe aparecer una segunda vez como opción
    // del selector (solo aparece una vez, en la fila de la lista).
    expect(html.match(/Codo a 90º/g)?.length).toBe(1)
  })
})
