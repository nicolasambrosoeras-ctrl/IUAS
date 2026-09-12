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
  const uf: UnidadFuncional = {
    id: 'uf-1',
    nombre: 'UF 1',
    niveles: [{ id: 'uf-1-nivel-1', nombre: 'Nivel 1', locales: [local('l-a', 3), local('l-b', 6)] }],
  }
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

// UI-M2-GROUP-01 §13-§19: header compacto SIEMPRE montado, cuerpo pesado
// SOLO para el montante activo (unmount real, §16). Con un único montante
// queda activo por defecto (§15, sin fricción) -- por eso los tests de
// arriba ("montante con Locales servidos", etc.) siguen viendo el cuerpo
// completo sin cambios. Estos tests cubren específicamente >1 montante.
describe('UI-M2-GROUP-01 -- Montantes compactos', () => {
  it('"+ Agregar montante" vive en el encabezado de la sección (§17)', () => {
    const html = render(proyectoBase())
    expect(html).toContain('class="constructor-montantes__header"')
    expect(html).toMatch(/class="constructor-montantes__header"[^]*?\+ Agregar montante/)
  })

  it('con 2 montantes: 2 headers colapsables, el primero activo por defecto y el segundo colapsado', () => {
    const { proyecto: p1 } = conMontanteNuevo(proyectoBase(), 'AF')
    const { proyecto: p2 } = conMontanteNuevo(p1, 'AC')
    const html = render(p2)

    expect(html.match(/class="montante-card__cabecera-toggle"/g)?.length).toBe(2)
    expect(html.match(/aria-expanded="true"/g)?.length).toBe(1)
    expect(html.match(/aria-expanded="false"/g)?.length).toBe(1)
  })

  it('unmount real (§16): el cuerpo (Locales/Segmentos) del montante colapsado no está en el DOM', () => {
    const { proyecto: p1 } = conMontanteNuevo(proyectoBase(), 'AF')
    const { proyecto: p2 } = conMontanteNuevo(p1, 'AC')
    const html = render(p2)

    // "Locales alimentados" y "Segmentos" son encabezados del CUERPO -- con
    // 2 montantes y sólo el primero activo, deben aparecer una sola vez
    // cada uno (no dos).
    expect(html.match(/Locales alimentados/g)?.length).toBe(1)
    expect(html.match(/Segmentos/g)?.length).toBe(1)
    // El input de renombre (parte del cuerpo) también sólo una vez.
    expect(html.match(/class="montante-card__nombre"/g)?.length).toBe(1)
  })

  it('con 1 solo montante: se muestra abierto sin fricción, igual que antes (§15)', () => {
    const { proyecto } = conMontanteNuevo(proyectoBase(), 'AF')
    const html = render(proyecto)
    expect(html).toContain('Locales alimentados')
    expect(html).toContain('aria-expanded="true"')
  })

  it('§18: montante con Locales asignados y sin más candidatos -> copy compacto "Sin más locales disponibles"', () => {
    const creado = conMontanteNuevo(proyectoBase(), 'AF')
    const r1 = agregarLocalAMontante(creado.proyecto, creado.montanteId, 'uf-1', 'l-a')
    if (r1.tipo !== 'reconciliado') throw new Error(r1.tipo)
    const r2 = agregarLocalAMontante(r1.proyecto, creado.montanteId, 'uf-1', 'l-b')
    if (r2.tipo !== 'reconciliado') throw new Error(r2.tipo)
    const html = render(r2.proyecto)
    expect(html).toContain('Sin más locales disponibles')
    expect(html).not.toContain('No hay Locales disponibles para este montante')
  })

  it('§18: montante SIN Locales y sin candidatos -> mantiene la explicación completa', () => {
    // proyectoBase sólo tiene 2 Locales, ambos ya en la UF; un montante AF
    // recién creado SIN agregarle nada todavía sí tiene candidatos (l-a,
    // l-b libres) -- para forzar "sin Locales Y sin candidatos" hay que
    // agotar los candidatos con un SEGUNDO montante AF y dejar el primero
    // vacío.
    const m1 = conMontanteNuevo(proyectoBase(), 'AF')
    const m2 = conMontanteNuevo(m1.proyecto, 'AF')
    const r1 = agregarLocalAMontante(m2.proyecto, m2.montanteId, 'uf-1', 'l-a')
    if (r1.tipo !== 'reconciliado') throw new Error(r1.tipo)
    const r2 = agregarLocalAMontante(r1.proyecto, m2.montanteId, 'uf-1', 'l-b')
    if (r2.tipo !== 'reconciliado') throw new Error(r2.tipo)
    // m1 (primer montante) sigue sin Locales y ya no hay candidatos libres.
    const html = render(r2.proyecto)
    expect(html).toContain('No hay Locales disponibles para este montante')
  })
})
