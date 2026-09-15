// UX-HIERARCHY-POLISH-01: estados default de colapso de Nivel/Local sobre
// el proyecto de ejemplo, y que personalizar `Local.nombre` no altera
// ningún resultado numérico del motor. Mismo patrón renderToStaticMarkup
// que MotorDemandaPantalla.estructura.test.ts (sin jsdom, sin fireEvent --
// esta suite no simula clicks, sólo verifica el estado inicial del DOM).
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import { MotorDemandaPantalla } from './MotorDemandaPantalla'
import { proyectoInicial } from './proyectoDeEjemplo'
import { calcularSimultaneidad } from '../../motor/demanda/simultaneidad/calcularSimultaneidad'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'

function render(): string {
  return renderToStaticMarkup(createElement(MotorDemandaPantalla))
}

// aria-expanded de la cabecera de Local más cercana ANTES del marcador de
// contenido dado (el botón toggle siempre precede a su `m1-local__contenido`
// en el DOM -- ver LocalFormulario).
function ariaExpandedCercaDe(html: string, marcador: string): string | undefined {
  const indice = html.indexOf(marcador)
  if (indice === -1) return undefined
  const ventana = html.slice(Math.max(0, indice - 700), indice)
  const match = /aria-expanded="(true|false)"/g
  let ultimo: string | undefined
  let resultado: RegExpExecArray | null
  while ((resultado = match.exec(ventana)) !== null) {
    ultimo = resultado[1]
  }
  return ultimo
}

describe('Jerarquía colapsable -- estados default (brief §9/§13)', () => {
  const html = render()

  it('con un único Nivel (proyecto de ejemplo) no hay chrome de colapso de Nivel', () => {
    expect(html).toContain('m1-nivel--unico')
    expect(html).not.toContain('m1-nivel__toggle')
  })

  it('el primer Local (Baño) del Nivel arranca expandido', () => {
    expect(ariaExpandedCercaDe(html, 'id="local-contenido-local-bano"')).toBe('true')
  })

  it('el resto de los Locales (Cocina, Lavadero, Toilette, Patio) arrancan colapsados', () => {
    for (const id of ['local-cocina', 'local-lavadero', 'local-toilette', 'local-patio']) {
      expect(
        ariaExpandedCercaDe(html, `id="local-contenido-${id}"`),
        `esperaba aria-expanded="false" para ${id}`,
      ).toBe('false')
    }
  })

  it('un Local colapsado no muestra sus Artefactos (unmount real, no sólo `hidden`)', () => {
    // "Cocina" está colapsada -> el nombre del artefacto de pileta de cocina
    // no debería aparecer más de las veces que aparece en el catálogo/otros
    // contextos ajenos a esa fila; comprobamos indirectamente vía el bloque
    // de contenido: con hidden, sigue vacío por dentro (unmount real).
    const inicio = html.indexOf('id="local-contenido-local-cocina"')
    expect(inicio).toBeGreaterThan(-1)
    const cierreApertura = html.indexOf('>', inicio) + 1
    // El siguiente Local (Lavadero) empieza inmediatamente después si no hay
    // contenido montado adentro.
    const siguienteLocal = html.indexOf('local-lavadero', cierreApertura)
    const bloqueInterno = html.slice(cierreApertura, siguienteLocal)
    expect(bloqueInterno).not.toContain('Agregar artefacto')
  })
})

describe('Header de Local sin redundancia Nombre·Tipo (BETA-UI-POLISH-01 §4/§7)', () => {
  const html = render()

  it('Baño (único de su tipo, sin nombre personalizado): el tipo NO se repite en la meta', () => {
    const inicio = html.indexOf('id="local-contenido-local-bano"')
    expect(inicio).toBeGreaterThan(-1)
    const cabecera = html.slice(Math.max(0, inicio - 700), inicio)
    expect(cabecera).toContain('m1-local__nombre">Baño<')
    expect(cabecera).toContain('m1-local__meta">· 4 artefactos<')
    // nunca "Baño · Baño"
    expect(cabecera).not.toContain('Baño · Baño')
  })

  it('Cocina (único de su tipo, sin nombre personalizado): mismo criterio', () => {
    const inicio = html.indexOf('id="local-contenido-local-cocina"')
    expect(inicio).toBeGreaterThan(-1)
    const cabecera = html.slice(Math.max(0, inicio - 700), inicio)
    expect(cabecera).toContain('m1-local__nombre">Cocina<')
    expect(cabecera).toContain('m1-local__meta">· 2 artefactos<')
    expect(cabecera).not.toContain('Cocina · Cocina')
  })
})

describe('Botón de memoria técnica y subtítulo del proyecto (BETA-UI-POLISH-01 §23/§26)', () => {
  const html = render()

  it('el botón dice "Generar memoria técnica", sin "PDF" en el copy visible', () => {
    expect(html).toContain('Generar memoria técnica')
    expect(html).not.toContain('Generar informe técnico PDF')
  })

  it('el subtítulo del proyecto de ejemplo NO afirma "Proyecto de ejemplo" -- usa la Tipología real', () => {
    expect(html).not.toContain('Proyecto de ejemplo')
    expect(html).toContain('Vivienda individual · Todos los datos pueden modificarse.')
  })
})

describe('Renombrar un Local no altera resultados numéricos del motor (brief §53)', () => {
  it('Kc/K/Qmax/Qc de calcularSimultaneidad son idénticos antes y después de personalizar Local.nombre', () => {
    const entrada = { normativa: { catalogoArtefactos, coeficientesMayoracion } }
    const antes = calcularSimultaneidad({ proyecto: proyectoInicial, ...entrada })

    const proyectoRenombrado = {
      ...proyectoInicial,
      unidadesFuncionales: proyectoInicial.unidadesFuncionales.map((uf) => ({
        ...uf,
        niveles: uf.niveles.map((nivel) => ({
          ...nivel,
          locales: nivel.locales.map((local) =>
            local.id === 'local-bano' ? { ...local, nombre: 'Baño principal' } : local,
          ),
        })),
      })),
    }
    const despues = calcularSimultaneidad({ proyecto: proyectoRenombrado, ...entrada })

    expect(despues.resultados).toEqual(antes.resultados)
  })
})
