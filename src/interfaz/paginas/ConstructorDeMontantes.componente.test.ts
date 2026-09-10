// M2-TOPO-C §7-§18 — render SSR del constructor de montantes. Mismo enfoque
// renderToStaticMarkup que el resto de este directorio (no hay jsdom /
// testing-library): se verifica el markup inicial de cada estado; la
// interacción real (clicks, recálculo) la cubren el E2E y el fuzz.
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import type { Local, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { ConstructorDeMontantes } from './ConstructorDeMontantes'
import { conMontanteNuevo, conNombreDeMontante } from './montantesDelProyecto'
import { agregarLocalAMontante } from './reconciliarMontante'

function local(id: string, cotaPiso_m: number): Local {
  return { id, tipo: 'bano', regimen: 'domiciliario', cotaPiso_m, artefactos: [{ id: `${id}-art`, artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }] }
}

function rama(id: string): { nodos: Nodo[]; tramos: Tramo[] } {
  return {
    nodos: [
      { id: `n-${id}` },
      { id: `n-${id}-t`, referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: id, artefactoId: `${id}-art` } },
    ],
    tramos: [
      { id: `t-${id}`, nodoOrigenId: 'n-af', nodoDestinoId: `n-${id}`, red: 'AF' },
      { id: `t-${id}-t`, nodoOrigenId: `n-${id}`, nodoDestinoId: `n-${id}-t`, red: 'AF' },
    ],
  }
}

function proyectoBase(): Proyecto {
  const uf: UnidadFuncional = { id: 'uf-1', nombre: 'UF 1', locales: [local('l-a', 3), local('l-b', 6)] }
  const ramas = [rama('l-a'), rama('l-b')]
  const redHidraulica: RedHidraulica = {
    nodos: [{ id: 'n-gen' }, { id: 'n-af' }, ...ramas.flatMap((r) => r.nodos)],
    tramos: [{ id: 't-gen', nodoOrigenId: 'n-gen', nodoDestinoId: 'n-af', red: 'AF' }, ...ramas.flatMap((r) => r.tramos)],
  }
  return {
    metadatos: { nombre: 'm', obra: 'o', comitente: 'c', fecha: '2026-01-01', schemaVersion: '1.0.0', versionNormativa: 'eras-2023' },
    parametros: { tipoDeProyecto: 'viviendaMultifamiliar', presionSobreAcera_m: 20, alturaArtefactoMasDesfavorable_m: 0 },
    unidadesFuncionales: [uf],
    redHidraulica,
    configuracionAbastecimiento: { esquema: 'directa' },
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
  return renderToStaticMarkup(
    createElement(ConstructorDeMontantes, { proyecto, catalogoArtefactos, onCambiar: () => {} }),
  )
}

describe('ConstructorDeMontantes', () => {
  it('sin montantes: muestra el vacío y el botón "+ Agregar montante"', () => {
    const html = render(proyectoBase())
    expect(html).toContain('Todavía no hay montantes explícitos')
    expect(html).toContain('+ Agregar montante')
  })

  it('montante AF con 0 Locales: card con nombre fallback, "Sin Locales asignados" y sin segmentos (§8)', () => {
    const { proyecto } = conMontanteNuevo(proyectoBase(), 'AF')
    const html = render(proyecto)
    expect(html).toContain('Montante AF 1')
    expect(html).toContain('Sin Locales asignados')
    expect(html).toContain('Todavía sin segmentos')
    // nunca el id técnico del montante
    expect(html).not.toMatch(/montante-[0-9a-f]{8}/)
  })

  it('montante con Locales servidos: lista humana + "Quitar" + tabla de segmentos', () => {
    const creado = conMontanteNuevo(proyectoBase(), 'AF')
    const r1 = agregarLocalAMontante(creado.proyecto, creado.montanteId, 'uf-1', 'l-a')
    if (r1.tipo !== 'reconciliado') throw new Error(r1.tipo)
    const r2 = agregarLocalAMontante(r1.proyecto, creado.montanteId, 'uf-1', 'l-b')
    if (r2.tipo !== 'reconciliado') throw new Error(r2.tipo)
    const html = render(r2.proyecto)
    expect(html).toContain('Baño 1 · UF 1')
    expect(html).toContain('Baño 2 · UF 1')
    expect(html).toContain('Quitar')
    expect(html).toContain('Segmento 1')
  })

  it('nombre custom: se muestra en lugar del fallback', () => {
    const { proyecto, montanteId } = conMontanteNuevo(proyectoBase(), 'AF')
    const html = render(conNombreDeMontante(proyecto, montanteId, 'Montante cocinas'))
    expect(html).toContain('Montante cocinas')
  })
})
