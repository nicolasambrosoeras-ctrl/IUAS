import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import type { Artefacto, MetadatosProyecto, ParametrosProyecto, Local, Proyecto, TipoDeProyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, ReferenciaDeArtefacto, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { describirReferenciaPendiente, ResultadoHidraulicoDeTramo } from './ResultadoHidraulicoDeTramo'

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

function proyectoCon(unidadesFuncionales: readonly UnidadFuncional[]): Proyecto {
  return {
    metadatos: metadatos(),
    parametros: {
      tipoDeProyecto: 'oficinaPrivada',
      presionSobreAcera_m: 0,
      alturaArtefactoMasDesfavorable_m: 0,
    },
    unidadesFuncionales,
    configuracionHidraulica: { metodoPerdidaDistribuida: 'hazenWilliams', metodoPerdidaLocalizada: 'detallado', granularidadHidraulica: 'profesional', materialTuberiaId: 'ppr', sistemaDeTuberiaId: 'acquaSystemMagnumPn20' },
  }
}

function referenciaA(unidadFuncionalId: string, localId: string, artefactoId: string): ReferenciaDeArtefacto {
  return { tipo: 'artefacto', unidadFuncionalId, localId, artefactoId }
}

describe('describirReferenciaPendiente', () => {
  it('resuelve UF, Local y nombre de catálogo en el formato "UF → Local → Artefacto"', () => {
    const artefacto: Artefacto = { id: 'a1', artefactoId: 'bidet', cantidad: 1, origen: 'normativo' }
    const local: Local = { id: 'local-bano', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto] }
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'Unidad funcional 1', locales: [local] }
    const proyecto = proyectoCon([uf])
    const catalogoArtefactos: readonly ArtefactoNormativo[] = [
      { id: 'bidet', nombre: 'Bidet' } as ArtefactoNormativo,
    ]

    const resultado = describirReferenciaPendiente(proyecto, catalogoArtefactos, referenciaA('uf-1', 'local-bano', 'a1'))

    expect(resultado).toBe('Unidad funcional 1 → Baño → Bidet')
  })

  it('usa ETIQUETA_TIPO_DE_LOCAL para traducir el tipo de Local, no el id técnico', () => {
    const artefacto: Artefacto = { id: 'a1', artefactoId: 'piletaDeCocina', cantidad: 1, origen: 'normativo' }
    const local: Local = { id: 'local-cocina-1', tipo: 'cocina', regimen: 'domiciliario', artefactos: [artefacto] }
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'Unidad funcional 1', locales: [local] }
    const proyecto = proyectoCon([uf])
    const catalogoArtefactos: readonly ArtefactoNormativo[] = [
      { id: 'piletaDeCocina', nombre: 'Pileta de cocina' } as ArtefactoNormativo,
    ]

    const resultado = describirReferenciaPendiente(proyecto, catalogoArtefactos, referenciaA('uf-1', 'local-cocina-1', 'a1'))

    expect(resultado).toContain('Cocina')
    expect(resultado).not.toContain('local-cocina-1')
  })

  it('nombre de artefacto obtenido del catálogo, no del artefactoId técnico', () => {
    const artefacto: Artefacto = { id: 'a1', artefactoId: 'receptaculoDucha', cantidad: 1, origen: 'normativo' }
    const local: Local = { id: 'local-bano', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto] }
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'Unidad funcional 1', locales: [local] }
    const proyecto = proyectoCon([uf])
    const catalogoArtefactos: readonly ArtefactoNormativo[] = [
      { id: 'receptaculoDucha', nombre: 'Receptáculo de ducha' } as ArtefactoNormativo,
    ]

    const resultado = describirReferenciaPendiente(proyecto, catalogoArtefactos, referenciaA('uf-1', 'local-bano', 'a1'))

    expect(resultado).toContain('Receptáculo de ducha')
    expect(resultado).not.toContain('receptaculoDucha')
  })

  it('fallback: artefactoId técnico del catálogo si no se encuentra en catalogoArtefactos (caso borde, sin inventar nombre)', () => {
    const artefacto: Artefacto = { id: 'a1', artefactoId: 'artefactoInexistente', cantidad: 1, origen: 'normativo' }
    const local: Local = { id: 'local-bano', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto] }
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'Unidad funcional 1', locales: [local] }
    const proyecto = proyectoCon([uf])

    const resultado = describirReferenciaPendiente(proyecto, [], referenciaA('uf-1', 'local-bano', 'a1'))

    expect(resultado).toBe('Unidad funcional 1 → Baño → artefactoInexistente')
  })
})

// Fixture con una bifurcación real (1 entrante + 2 salientes, CRIT-A31):
// un Toilette con Lavatorio + Inodoro colgando de un único nodo de
// distribución -- misma topología que ya existe en el proyecto demo real
// de MotorDemandaPantalla.tsx (n-af-toilette-1).
function proyectoConToilette(): Proyecto {
  const parametros: ParametrosProyecto = {
    tipoDeProyecto: 'viviendaIndividual' as TipoDeProyecto,
    presionSobreAcera_m: 0,
    alturaArtefactoMasDesfavorable_m: 0,
  }
  const lavatorio: Artefacto = { id: 'art-lavatorio', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }
  const inodoro: Artefacto = { id: 'art-inodoro', artefactoId: 'inodoroDeposito', cantidad: 1, origen: 'normativo' }
  const local: Local = { id: 'local-toilette', tipo: 'toilette', regimen: 'domiciliario', artefactos: [lavatorio, inodoro] }
  const uf: UnidadFuncional = { id: 'uf-1', nombre: 'Unidad funcional 1', locales: [local] }

  const refLavatorio = referenciaA('uf-1', 'local-toilette', 'art-lavatorio')
  const refInodoro = referenciaA('uf-1', 'local-toilette', 'art-inodoro')

  const nodos: Nodo[] = [
    { id: 'n-general' },
    { id: 'n-0' },
    { id: 'n-toilette-1' },
    { id: 'n-toilette-lavatorio', referencia: refLavatorio },
    { id: 'n-toilette-inodoro', referencia: refInodoro },
  ]
  const tramos: Tramo[] = [
    { id: 't-general', nodoOrigenId: 'n-general', nodoDestinoId: 'n-0', red: 'AF' },
    { id: 't-af-toilette', nodoOrigenId: 'n-0', nodoDestinoId: 'n-toilette-1', red: 'AF' },
    { id: 't-af-toilette-lavatorio', nodoOrigenId: 'n-toilette-1', nodoDestinoId: 'n-toilette-lavatorio', red: 'AF' },
    { id: 't-af-toilette-inodoro', nodoOrigenId: 'n-toilette-1', nodoDestinoId: 'n-toilette-inodoro', red: 'AF' },
  ]
  const redHidraulica: RedHidraulica = { nodos, tramos }

  return {
    metadatos: metadatos(),
    parametros,
    unidadesFuncionales: [uf],
    redHidraulica,
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'detallado', granularidadHidraulica: 'profesional',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

describe('ResultadoHidraulicoDeTramo (UI) — D-δ.43', () => {
  it('no existe ninguna sección global "Tees (bifurcaciones)"', () => {
    const proyecto = proyectoConToilette()

    const html = renderToStaticMarkup(
      createElement(ResultadoHidraulicoDeTramo, { proyecto, catalogoArtefactos, onCambiar: () => {} }),
    )

    expect(html).not.toContain('Tees (bifurcaciones)')
  })

  it('la tee aparece inline dentro de la tarjeta del Local+Red, identificada como "Tee"', () => {
    const proyecto = proyectoConToilette()

    const html = renderToStaticMarkup(
      createElement(ResultadoHidraulicoDeTramo, { proyecto, catalogoArtefactos, onCambiar: () => {} }),
    )

    expect(html).toContain('Toilette')
    expect(html).toContain('Tee')
    expect(html).toContain('Bifurcación sin configurar')
  })

  it('distingue AF/AC con nombre humano de red, no la sigla sola ni ids de nodo', () => {
    const proyecto = proyectoConToilette()

    const html = renderToStaticMarkup(
      createElement(ResultadoHidraulicoDeTramo, { proyecto, catalogoArtefactos, onCambiar: () => {} }),
    )

    expect(html).toContain('Agua fría')
  })

  it('nunca expone ids técnicos de Nodo/Tramo en la superficie normal', () => {
    const proyecto = proyectoConToilette()

    const html = renderToStaticMarkup(
      createElement(ResultadoHidraulicoDeTramo, { proyecto, catalogoArtefactos, onCambiar: () => {} }),
    )

    expect(html).not.toContain('n-toilette-1')
    expect(html).not.toContain('n-toilette-lavatorio')
    expect(html).not.toContain('t-af-toilette-lavatorio')
  })

  it("'profesional': el ramal terminal hacia cada Artefacto tiene su propio editor de accesorios (deuda de D-δ.42 cerrada)", () => {
    const proyecto = proyectoConToilette()

    const html = renderToStaticMarkup(
      createElement(ResultadoHidraulicoDeTramo, { proyecto, catalogoArtefactos, onCambiar: () => {} }),
    )

    // "Relevar accesorios" aparece una vez por tramo con accesorios===undefined
    // (Distribución general + tramo de alimentación + 2 ramales = 4 en
    // este fixture).
    expect(html.match(/Relevar accesorios/g)?.length).toBe(4)
  })
})

describe("ResultadoHidraulicoDeTramo (UI) — granularidadHidraulica 'simplificada' (D-δ.44, corrección de granularidad de D-δ.43)", () => {
  function proyectoConToiletteSimplificado(): Proyecto {
    const proyecto = proyectoConToilette()
    return {
      ...proyecto,
      configuracionHidraulica: { ...proyecto.configuracionHidraulica, granularidadHidraulica: 'simplificada' },
    }
  }

  it('un único input de Longitud por Local+red -- ningún ramal terminal pide longitud propia', () => {
    const proyecto = proyectoConToiletteSimplificado()

    const html = renderToStaticMarkup(
      createElement(ResultadoHidraulicoDeTramo, { proyecto, catalogoArtefactos, onCambiar: () => {} }),
    )

    // Distribución general (2: general + ACS, aunque este fixture solo
    // tiene AF asi que 1) + el único Tramo de alimentación del Toilette:
    // el input de Longitud [m] vive en el <details> de Detalle técnico de
    // DimensionamientoDeTramo -- se cuenta por cuántos aparecen, no debe
    // haber uno por cada Ramal.
    expect(html.match(/Longitud \[m\]/g)?.length).toBe(2) // Alimentación general + Tramo de alimentación del Toilette
    expect(html).not.toContain('Ramal Lavatorio')
    expect(html).not.toContain('Ramal Inodoro')
  })

  it('un único editor de accesorios por Local+red -- ningún ramal terminal tiene su propio "Relevar accesorios"', () => {
    const proyecto = proyectoConToiletteSimplificado()

    const html = renderToStaticMarkup(
      createElement(ResultadoHidraulicoDeTramo, { proyecto, catalogoArtefactos, onCambiar: () => {} }),
    )

    // Distribución general (siempre exige su propio relevamiento, en
    // ambas granularidades) + el único Tramo de alimentación del Toilette
    // -- nunca uno por cada Ramal (Lavatorio/Inodoro).
    expect(html.match(/Relevar accesorios/g)?.length).toBe(2)
  })

  it('los Artefactos siguen listados por nombre bajo "Distribución", y AF/AC siguen distinguidos', () => {
    const proyecto = proyectoConToiletteSimplificado()

    const html = renderToStaticMarkup(
      createElement(ResultadoHidraulicoDeTramo, { proyecto, catalogoArtefactos, onCambiar: () => {} }),
    )

    expect(html).toContain('Distribución')
    expect(html).toContain('Lavatorio')
    expect(html).toContain('Inodoro a depósito')
    expect(html).toContain('Agua fría')
  })

  it('la tee sigue inline dentro del Local+red, sin sección global -- CRIT-A31 no depende de la granularidad', () => {
    const proyecto = proyectoConToiletteSimplificado()

    const html = renderToStaticMarkup(
      createElement(ResultadoHidraulicoDeTramo, { proyecto, catalogoArtefactos, onCambiar: () => {} }),
    )

    expect(html).not.toContain('Tees (bifurcaciones)')
    expect(html).toContain('Tee')
    expect(html).toContain('Bifurcación sin configurar')
  })

  it('nunca expone ids técnicos de Nodo/Tramo, igual que en modo profesional', () => {
    const proyecto = proyectoConToiletteSimplificado()

    const html = renderToStaticMarkup(
      createElement(ResultadoHidraulicoDeTramo, { proyecto, catalogoArtefactos, onCambiar: () => {} }),
    )

    expect(html).not.toContain('n-toilette-1')
    expect(html).not.toContain('t-af-toilette-lavatorio')
  })
})
