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
import type {
  Artefacto,
  ConfiguracionDeAbastecimiento,
  MetadatosProyecto,
  ParametrosProyecto,
  Proyecto,
  UnidadFuncional,
} from '../../modelo/proyecto'
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

function parametros(presionSobreAcera_m = 0): ParametrosProyecto {
  return { tipoDeProyecto: 'viviendaIndividual', presionSobreAcera_m, alturaArtefactoMasDesfavorable_m: 0 }
}

function artefacto(idInstancia: string, artefactoIdCatalogo: string): Artefacto {
  return { id: idInstancia, artefactoId: artefactoIdCatalogo, cantidad: 1, origen: 'normativo' }
}

function referenciaDe(unidadFuncionalId: string, localId: string, artefactoId: string): ReferenciaDeArtefacto {
  return { tipo: 'artefacto', unidadFuncionalId, localId, artefactoId }
}

function proyectoCon(
  unidadesFuncionales: readonly UnidadFuncional[],
  opciones: {
    redHidraulica?: RedHidraulica
    configuracionAbastecimiento?: ConfiguracionDeAbastecimiento
    presionSobreAcera_m?: number
  } = {},
): Proyecto {
  return {
    metadatos: metadatos(),
    parametros: parametros(opciones.presionSobreAcera_m ?? 0),
    unidadesFuncionales,
    ...(opciones.redHidraulica !== undefined ? { redHidraulica: opciones.redHidraulica } : {}),
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'detallado',
      granularidadHidraulica: 'profesional',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
    ...(opciones.configuracionAbastecimiento !== undefined
      ? { configuracionAbastecimiento: opciones.configuracionAbastecimiento }
      : {}),
  }
}

function ufConTerminal(): { uf: UnidadFuncional; red: RedHidraulica } {
  const uf: UnidadFuncional = {
    id: 'uf-1',
    nombre: 'uf-1',
    locales: [{ id: 'local-1', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto('inst-1', 'lavatorio')] }],
  }
  const nodos: Nodo[] = [{ id: 'raiz' }, { id: 'terminal', referencia: referenciaDe('uf-1', 'local-1', 'inst-1') }]
  const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'raiz', nodoDestinoId: 'terminal', red: 'AF' }]
  return { uf, red: { nodos, tramos } }
}

function render(proyecto: Proyecto): string {
  return renderToStaticMarkup(
    createElement(PanelDePresionDeModulo2, { proyecto, catalogoArtefactos, onCambiar: () => {} }),
  )
}

describe('PanelDePresionDeModulo2 (UI)', () => {
  it('M4-G: sin configuracionAbastecimiento no hay selector de origen ni input de Pdisponible; orienta al Módulo 4', () => {
    const html = render(proyectoCon([]))

    // El selector local y el input manual de Pdisponible se retiraron.
    expect(html).not.toContain('Presión disponible (Pdisponible) [m.c.a.]')
    expect(html).not.toContain('name="tipoDeAlimentacion"')
    expect(html).toContain('Configurá el esquema de abastecimiento en el')
    // La pérdida de medidores la calcula M3 según el camino de cada terminal.
    expect(html).not.toContain('Medidor provisional M3')
    expect(html).toContain('Completá el Módulo 3 — Medidores')
  })

  it('M4-G: sin esquema de abastecimiento, la verificación de presión queda incompleta con un motivo que apunta al Módulo 4', () => {
    const { uf, red } = ufConTerminal()
    const html = render(proyectoCon([uf], { redHidraulica: red }))

    expect(html).toContain('No se puede calcular la presión todavía')
    expect(html).toContain('Falta configurar el esquema de abastecimiento en el Módulo 4.')
    expect(html).not.toContain('Falta indicar el tipo de alimentación')
    expect(html).not.toContain('CUMPLE')
  })

  it('sin terminales hidráulicos (red vacía): lo indica explícitamente, no una tabla vacía silenciosa', () => {
    const html = render(proyectoCon([], { redHidraulica: { nodos: [], tramos: [] } }))
    expect(html).toContain('no tiene terminales hidráulicos')
  })

  it('muestra el estado de Módulo 2 (resolverEstadoModulo2) sin recalcular hidráulica en React', () => {
    const html = render(proyectoCon([]))
    expect(html).toContain('Estado de Módulo 2')
    expect(html).toContain('No iniciado')
  })

  it('M4-G: esquema "directa" -> origen "Alimentación directa" derivado, pide cota del punto de alimentación (no la de tanque)', () => {
    const { uf, red } = ufConTerminal()
    const html = render(
      proyectoCon([uf], { redHidraulica: red, configuracionAbastecimiento: { esquema: 'directa' }, presionSobreAcera_m: 12 }),
    )

    expect(html).toContain('Origen hidráulico: <strong>Alimentación directa</strong>')
    expect(html).toContain('derivado del esquema de abastecimiento del Módulo 4')
    expect(html).toContain('Cota del punto de alimentación')
    expect(html).not.toContain('Pelo de agua mínimo')
    // Pdisponible = presión sobre acera, read-only, editable en el Módulo 4.
    expect(html).toContain('Presión disponible (sobre acera): 12,000 m')
    expect(html).toContain('se edita en el Módulo 4')
    expect(html).not.toContain('name="tipoDeAlimentacion"')
  })

  it('M4-G: esquema "tanqueElevado" -> origen "Tanque elevado", pide pelo de agua mínimo (no Pdisponible)', () => {
    const { uf, red } = ufConTerminal()
    const html = render(
      proyectoCon([uf], { redHidraulica: red, configuracionAbastecimiento: { esquema: 'tanqueElevado' } }),
    )

    expect(html).toContain('Origen hidráulico: <strong>Tanque elevado</strong>')
    expect(html).toContain('Pelo de agua mínimo')
    expect(html).not.toContain('Cota del punto de alimentación')
    expect(html).not.toContain('Presión disponible (sobre acera)')
  })

  it('M4-G: esquema "cisternaBombeoElevado" -> mismo origen "Tanque elevado", con nota de cisterna/bombeo aguas arriba', () => {
    const { uf, red } = ufConTerminal()
    const html = render(
      proyectoCon([uf], { redHidraulica: red, configuracionAbastecimiento: { esquema: 'cisternaBombeoElevado' } }),
    )

    expect(html).toContain('Origen hidráulico: <strong>Tanque elevado</strong>')
    expect(html).toContain('cisterna y bombeo aguas arriba del tanque elevado')
    expect(html).toContain('Pelo de agua mínimo')
  })

  it('M4-G: agrupa los motivos de incompletitud sin exponer ids de Nodo/Tramo', () => {
    const { uf, red } = ufConTerminal()
    const html = render(proyectoCon([uf], { redHidraulica: red }))

    expect(html).toContain('Para completar Módulo 2:')
    expect(html).toContain('Falta configurar el esquema de abastecimiento en el Módulo 4.')
    expect(html).not.toContain('>raiz<')
    expect(html).not.toContain('>terminal<')
  })
})
