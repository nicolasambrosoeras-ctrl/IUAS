// Reemplaza a FilaResultado/TablaDeFilas (D-δ.43): la presentación de un
// Tramo ya no es una fila de tabla ancha, sino un bloque compacto. Mismos
// criterios de cobertura que el componente reemplazado (D-delta.27/
// CRIT-A24, nomenclatura Di teórico/DN/Di real, V admisible/Verificación
// visibles, longitud con min=0) pero contra la nueva estructura.
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import type { Artefacto, MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, ReferenciaDeArtefacto, Tramo } from '../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { resolverResultadoDeTramoParaUi } from './resolverResultadoDeTramoParaUi'
import { DimensionamientoDeTramo } from './DimensionamientoDeTramo'

// Fixture de un Tramo real (catálogo y sistema comercial productivos, no
// ficticios) que activa el fallback de D-delta.27/CRIT-A24: valvulaMingitorio
// es el único artefacto conectado (soloAF, CRIT-A4 -> n=1 -> Qc=quTotal_lps
// del catálogo real), y el menor Di comercial evaluable del sistema real
// (Acqua System Magnum PN20, 20mm/14,4mm efectivo) ya da V<Vmin -- mismo
// caso, mismos valores, que 'D-delta.27: valvulaMingitorio...' en
// resolverDiametroComercialDeTramo.test.ts (no se reinventa el fixture).
function proyectoConFallbackDeVelocidadPorVmin(): { proyecto: Proyecto; tramoId: string } {
  const metadatos: MetadatosProyecto = {
    nombre: 'Proyecto de prueba',
    obra: 'Obra de prueba',
    comitente: 'Comitente de prueba',
    fecha: '2026-01-01',
    schemaVersion: '1.0.0',
    versionNormativa: 'eras-2023',
  }
  const parametros: ParametrosProyecto = {
    tipoDeProyecto: 'oficinaPrivada',
    presionSobreAcera_m: 0,
    alturaArtefactoMasDesfavorable_m: 0,
  }
  const mingitorio: Artefacto = { id: 'inst-mingitorio', artefactoId: 'valvulaMingitorio', cantidad: 1, origen: 'normativo' }
  const uf: UnidadFuncional = {
    id: 'uf-1',
    nombre: 'UF 1',
    locales: [{ id: 'local-1', tipo: 'otros', regimen: 'noDomiciliario', artefactos: [mingitorio] }],
  }
  const referencia: ReferenciaDeArtefacto = { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-1', artefactoId: 'inst-mingitorio' }
  const nodos: Nodo[] = [
    { id: 'n0' },
    { id: 'n1' },
    { id: 'n2', referencia },
    { id: 'n3', referencia: { tipo: 'produccionACS' } },
    { id: 'n4', referencia },
  ]
  const tramos: Tramo[] = [
    { id: 't1', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
    { id: 't2', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF' },
    { id: 't3', nodoOrigenId: 'n1', nodoDestinoId: 'n3', red: 'AF' },
    { id: 't4', nodoOrigenId: 'n3', nodoDestinoId: 'n4', red: 'AC' },
  ]
  const proyecto: Proyecto = {
    metadatos,
    parametros,
    unidadesFuncionales: [uf],
    redHidraulica: { nodos, tramos },
    configuracionHidraulica: { metodoPerdidaDistribuida: 'hazenWilliams', metodoPerdidaLocalizada: 'detallado', materialTuberiaId: 'ppr', sistemaDeTuberiaId: 'acquaSystemMagnumPn20' },
  }
  return { proyecto, tramoId: 't1' }
}

function renderizar(proyecto: Proyecto, tramoId: string, longitud_m?: number): string {
  const resultado = resolverResultadoDeTramoParaUi(proyecto, tramoId, catalogoArtefactos)
  return renderToStaticMarkup(
    createElement(DimensionamientoDeTramo, {
      etiqueta: 'Local de prueba',
      red: 'AF',
      resultado,
      longitud_m,
      onCambiarLongitud: () => {},
    }),
  )
}

describe('DimensionamientoDeTramo (UI)', () => {
  it('D-delta.27/CRIT-A24: muestra diámetro, Di efectivo y velocidad, pero NO renderiza "No admisible"', () => {
    const { proyecto, tramoId } = proyectoConFallbackDeVelocidadPorVmin()

    const html = renderizar(proyecto, tramoId)

    expect(html).toContain('20 mm') // diámetro comercial (DN)
    expect(html).not.toContain('No admisible')
    expect(html).toContain('Aceptada en el menor diámetro comercial (CRIT-A24)')
  })

  it('nomenclatura visible de columnas de diámetro: Di teórico / DN / Di real -- no la nomenclatura anterior', () => {
    const { proyecto, tramoId } = proyectoConFallbackDeVelocidadPorVmin()

    const html = renderizar(proyecto, tramoId)

    expect(html).toContain('Di teórico [mm]')
    expect(html).toContain('Di real [mm]')
    expect(html).not.toContain('Di de referencia')
    expect(html).not.toContain('Di comercial')
    expect(html).not.toContain('Di efectivo')
  })

  it('V admisible y hf visibles en el detalle expandible (CRIT-A19/A24 visibles en UI)', () => {
    const { proyecto, tramoId } = proyectoConFallbackDeVelocidadPorVmin()

    const html = renderizar(proyecto, tramoId)

    expect(html).toContain('V admisible [m/s]')
    expect(html).toContain('1,0 – 3,0')
    expect(html).toContain('hf [m.c.a.]')
  })

  it('Qc/DN/V y el estado de verificación son visibles sin expandir el detalle', () => {
    const { proyecto, tramoId } = proyectoConFallbackDeVelocidadPorVmin()

    const html = renderizar(proyecto, tramoId)

    expect(html).toContain('Qc:')
    expect(html).toContain('DN:')
    expect(html).toContain('V:')
  })

  it('el input de Longitud [m] se renderiza con min="0" (ayuda de UI; la defensa real es resolverCambioDeLongitud)', () => {
    const { proyecto, tramoId } = proyectoConFallbackDeVelocidadPorVmin()

    const html = renderizar(proyecto, tramoId)

    expect(html).toMatch(/<input[^>]*\bmin="0"/)
  })

  it('distingue AF/AC mostrando el nombre humano de la red, nunca la sigla técnica sola', () => {
    const { proyecto, tramoId } = proyectoConFallbackDeVelocidadPorVmin()
    const resultado = resolverResultadoDeTramoParaUi(proyecto, tramoId, catalogoArtefactos)

    const htmlAF = renderToStaticMarkup(
      createElement(DimensionamientoDeTramo, { etiqueta: 'X', red: 'AF', resultado, longitud_m: undefined, onCambiarLongitud: () => {} }),
    )
    const htmlAC = renderToStaticMarkup(
      createElement(DimensionamientoDeTramo, { etiqueta: 'X', red: 'AC', resultado, longitud_m: undefined, onCambiarLongitud: () => {} }),
    )

    expect(htmlAF).toContain('Agua fría')
    expect(htmlAC).toContain('Agua caliente')
  })
})
