// UI-M2-GROUP-01 -- jerarquía progresiva de Unidades Funcionales (§3-§10),
// agrupación visual de Local (§11/§12) y unmount real (§9). Mismo enfoque
// SSR (renderToStaticMarkup) que ResultadoHidraulicoDeTramo.test.ts: sólo
// se puede observar el estado INICIAL de cada useState (React no ejecuta
// useEffect en SSR) -- alcanza para verificar "1 UF sin acordeón", "2 UF:
// la primera activa por defecto y la segunda con su contenido pesado sin
// montar". Las transiciones interactivas (abrir otra UF, agregar/duplicar,
// eliminar la activa) las cubre el E2E (tests/e2e/multi-uf.spec.ts).
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import type { Artefacto, Local, MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { ResultadoHidraulicoDeTramo } from './ResultadoHidraulicoDeTramo'

function metadatos(): MetadatosProyecto {
  return {
    nombre: 'Proyecto de prueba',
    obra: 'Obra de prueba',
    comitente: 'Comitente de prueba',
    fecha: '2026-01-01',
    schemaVersion: '1.0.0',
    versionNormativa: 'eras-2023',
  }
}

function parametros(): ParametrosProyecto {
  return { tipoDeProyecto: 'viviendaIndividual', presionSobreAcera_m: 0, alturaArtefactoMasDesfavorable_m: 0 }
}

// Un Local con UF simple: 1 artefacto AF, tramo directo bajo la raíz.
function ufSimple(ufId: string, nombre: string, localId: string): { uf: UnidadFuncional; nodos: Nodo[]; tramos: Tramo[] } {
  const artefacto: Artefacto = { id: `${localId}-art`, artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }
  const local: Local = { id: localId, tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto] }
  const uf: UnidadFuncional = { id: ufId, nombre, locales: [local] }
  const nodoLeaf = `n-${localId}`
  return {
    uf,
    nodos: [{ id: nodoLeaf, referencia: { tipo: 'artefacto', unidadFuncionalId: ufId, localId, artefactoId: artefacto.id } }],
    tramos: [{ id: `t-${localId}`, nodoOrigenId: 'n-0', nodoDestinoId: nodoLeaf, red: 'AF' }],
  }
}

function proyectoConUnaUf(): Proyecto {
  const { uf, nodos, tramos } = ufSimple('uf-1', 'Unidad funcional 1', 'local-bano')
  const redHidraulica: RedHidraulica = {
    nodos: [{ id: 'n-general' }, { id: 'n-0' }, ...nodos],
    tramos: [{ id: 't-general', nodoOrigenId: 'n-general', nodoDestinoId: 'n-0', red: 'AF' }, ...tramos],
  }
  return {
    metadatos: metadatos(),
    parametros: parametros(),
    unidadesFuncionales: [uf],
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

function proyectoConDosUf(): Proyecto {
  const uf1 = ufSimple('uf-1', 'Unidad funcional 1', 'local-bano-1')
  const uf2 = ufSimple('uf-2', 'Unidad funcional 2', 'local-bano-2')
  const redHidraulica: RedHidraulica = {
    nodos: [{ id: 'n-general' }, { id: 'n-0' }, ...uf1.nodos, ...uf2.nodos],
    tramos: [
      { id: 't-general', nodoOrigenId: 'n-general', nodoDestinoId: 'n-0', red: 'AF' },
      ...uf1.tramos,
      ...uf2.tramos,
    ],
  }
  return {
    metadatos: metadatos(),
    parametros: parametros(),
    unidadesFuncionales: [uf1.uf, uf2.uf],
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

function render(proyecto: Proyecto): string {
  return renderToStaticMarkup(createElement(ResultadoHidraulicoDeTramo, { proyecto, catalogoArtefactos, onCambiar: () => {} }))
}

describe('UI-M2-GROUP-01 §5 -- 1 UF: sin acordeón', () => {
  it('no aparece la lista colapsable de Unidades Funcionales', () => {
    const html = render(proyectoConUnaUf())
    expect(html).not.toContain('class="lista-uf"')
  })

  it('el contenido de la única UF se ve directamente, sin necesidad de expandir nada', () => {
    const html = render(proyectoConUnaUf())
    expect(html).toContain('Unidad funcional 1')
    expect(html).toContain('aria-label="Longitud [m] de Baño')
  })
})

describe('UI-M2-GROUP-01 §6/§7/§9/§10 -- >1 UF: acordeón con una activa y el resto sin montar', () => {
  it('aparece la lista colapsable con un header por UF', () => {
    const html = render(proyectoConDosUf())
    expect(html).toContain('class="lista-uf"')
    expect(html.match(/class="lista-uf__cabecera"/g)?.length).toBe(2)
  })

  it('header liviano: nombre + resumen de locales/artefactos, sin ids técnicos', () => {
    const html = render(proyectoConDosUf())
    expect(html).toContain('Unidad funcional 1')
    expect(html).toContain('Unidad funcional 2')
    expect(html).toContain('1 local · 1 artefacto')
    expect(html).not.toContain('uf-1')
    expect(html).not.toContain('uf-2')
  })

  it('estado inicial determinístico: la primera UF queda activa (aria-expanded="true"), la segunda colapsada', () => {
    const html = render(proyectoConDosUf())
    expect(html.match(/aria-expanded="true"/g)?.length).toBe(1)
    expect(html.match(/aria-expanded="false"/g)?.length).toBe(1)
  })

  it('unmount real (§9): el contenido pesado de la UF colapsada NO está en el DOM', () => {
    const html = render(proyectoConDosUf())
    // El input de Longitud del Local existe -- pero cada UF tiene un único
    // Local llamado igual ("Baño 1", ordinal independiente por UF), así
    // que el aria-label por sí solo no distingue UF1 de UF2. La prueba de
    // unmount real es que aparece UNA sola vez (la de la UF activa) y no
    // dos -- si SeccionDeUnidadFuncional se hubiese instanciado también
    // para la UF colapsada, aparecería dos veces.
    expect(html).toContain('aria-label="Longitud [m] de Baño 1 Agua fría"')
    expect(html.match(/aria-label="Longitud \[m\] de Baño/g)?.length).toBe(1)
    // La segunda UF sólo aporta su header -- ninguna tabla de dimensionamiento
    // propia (serían 2 `tabla-tecnica` de Local si ambas UF montaran contenido:
    // Distribución general + 1 por UF activa = 2 en total).
    expect(html.match(/class="tabla-tecnica"/g)?.length).toBe(2)
  })
})

describe('UI-M2-GROUP-01 §11/§12 -- Local agrupa sus filas AF/AC bajo un único encabezado', () => {
  // local-bano-1: lavatorio con rama AF Y rama AC -- produce dos filas
  // (una por red) para el MISMO Local, igual que
  // identificarFilasDeModulo2.test.ts. El grupo debe aparecer una sola vez
  // aunque haya 2 filas.
  function proyectoConLocalAfYAc(): Proyecto {
    const local: Local = {
      id: 'local-bano-1',
      tipo: 'bano',
      regimen: 'domiciliario',
      artefactos: [{ id: 'a1', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }],
    }
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'Unidad funcional 1', locales: [local] }
    const nodos: Nodo[] = [
      { id: 'n-general' },
      { id: 'n-0' },
      { id: 'n-af-bano1' },
      { id: 'n-af-a1', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano-1', artefactoId: 'a1' } },
      { id: 'n-acs', referencia: { tipo: 'produccionACS' } },
      { id: 'n-ac-a1', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano-1', artefactoId: 'a1' } },
    ]
    const tramos: Tramo[] = [
      { id: 't-general', nodoOrigenId: 'n-general', nodoDestinoId: 'n-0', red: 'AF' },
      { id: 't-af-bano1', nodoOrigenId: 'n-0', nodoDestinoId: 'n-af-bano1', red: 'AF' },
      { id: 't-af-a1', nodoOrigenId: 'n-af-bano1', nodoDestinoId: 'n-af-a1', red: 'AF' },
      { id: 't-af-acs', nodoOrigenId: 'n-0', nodoDestinoId: 'n-acs', red: 'AF' },
      { id: 't-ac-a1', nodoOrigenId: 'n-acs', nodoDestinoId: 'n-ac-a1', red: 'AC' },
    ]
    return {
      metadatos: metadatos(),
      parametros: parametros(),
      unidadesFuncionales: [uf],
      redHidraulica: { nodos, tramos },
      configuracionHidraulica: {
        metodoPerdidaDistribuida: 'hazenWilliams',
        metodoPerdidaLocalizada: 'estimado',
        granularidadHidraulica: 'simplificada',
        materialTuberiaId: 'ppr',
        sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
      },
    }
  }

  it('el encabezado de grupo del Local aparece UNA sola vez aunque haya filas AF y AC', () => {
    const html = render(proyectoConLocalAfYAc())
    expect(html.match(/class="m2-fila-grupo"/g)?.length).toBe(1)
    expect(html).toContain('Baño 1 · 1 artefacto')
  })

  it('las dos filas (AF y AC) del Local siguen ambas presentes y editables', () => {
    const html = render(proyectoConLocalAfYAc())
    expect(html.match(/aria-label="Longitud \[m\] de Baño 1 Agua fría"/g)?.length).toBe(1)
    expect(html.match(/aria-label="Longitud \[m\] de Baño 1 Agua caliente"/g)?.length).toBe(1)
  })

  it('no suma AF+AC como cantidad física del Local (§12): el grupo muestra la cantidad de artefactos del Local, no 2', () => {
    const html = render(proyectoConLocalAfYAc())
    expect(html).not.toContain('Baño 1 · 2 artefactos')
  })
})
