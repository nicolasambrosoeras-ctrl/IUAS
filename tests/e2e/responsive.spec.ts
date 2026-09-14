// FIX-RESP-01 · regresión de overflow horizontal en viewports angostos.
//
// El fuzz (QA-CI-01) reprodujo un overflow horizontal DEL DOCUMENTO al
// activar la configuración "Detalladas" / "Profesional" de M2 en mobile:
// `.app-modo` (cabecera) tomaba su ancho max-content — label + segmentado
// + badge "Avanzado · combinación técnica personalizada" — y el
// `<fieldset>.config-hidraulica__grupo` traía `min-inline-size: min-content`
// de UA. Fix estructural (sin `overflow-x: hidden` global, sin ocultar
// contenido): `.app-modo` ocupa su propia línea en ≤900px y el fieldset
// recibe `min-width: 0`; las tablas técnicas siguen con scroll interno.
import { test, expect } from './qa/fixtures'
import { cargarAppLimpia, estabilizar } from './qa/estado'
import { verificarInvariantes, primerFallo, tomarMuestraDom } from './qa/invariantes'
import type { Page } from '@playwright/test'

const VIEWPORTS = [
  { nombre: '390x844 (mobile)', width: 390, height: 844 },
  { nombre: '360x800 (mobile angosto)', width: 360, height: 800 },
  { nombre: '1280x900 (desktop)', width: 1280, height: 900 },
] as const

// Lleva M2 a la combinación que disparaba el overflow: pérdidas
// "Detalladas" (modo derivado = avanzado, con badge) y granularidad
// "Profesional" (tablas anchas + árbol de tramos).
async function activarM2Detallado(page: Page): Promise<void> {
  await page.getByRole('link', { name: /Tuber[ií]as/ }).first().click()
  await estabilizar(page)
  const resumen = page.getByText('Configuración avanzada', { exact: true }).first()
  if (await resumen.isVisible().catch(() => false)) {
    const detalle = resumen.locator('xpath=ancestor::details[1]')
    const abierto = await detalle.evaluate((el) => (el as HTMLDetailsElement).open).catch(() => true)
    if (!abierto) await resumen.click()
  }
  await page.getByLabel('Pérdidas localizadas:').selectOption('detallado')
  await estabilizar(page)
  await page.getByLabel('Granularidad hidráulica:').selectOption('profesional')
  await estabilizar(page)
}

// Mide el overflow del documento y, por separado, comprueba que si una
// tabla técnica es más ancha que su carril, el scroll queda CONTENIDO en
// su wrapper `.tabla-scroll` (contenido, no escondido).
async function medir(page: Page) {
  return page.evaluate(() => {
    const de = document.documentElement
    const wrappers = [...document.querySelectorAll('.tabla-scroll')].map((w) => ({
      wrapperOverflow: w.scrollWidth - w.clientWidth,
      dentroDelViewport: w.getBoundingClientRect().right <= window.innerWidth + 1,
    }))
    return {
      docOverflow: de.scrollWidth - de.clientWidth,
      bodyOverflow: document.body.scrollWidth - document.body.clientWidth,
      viewport: window.innerWidth,
      wrappers,
    }
  })
}

test.describe('FIX-RESP-01 · sin overflow horizontal de página', () => {
  // El viewport se fija explícitamente en cada test; basta con correrlo en
  // un proyecto (evita duplicar 3 tests × 2 proyectos).
  for (const vp of VIEWPORTS) {
    test(`M2 Detalladas/Profesional no desborda la página @ ${vp.nombre}`, async ({
      page,
      errores,
      baseURLEfectiva,
    }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'viewport fijado en el test')
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await cargarAppLimpia(page, baseURLEfectiva)
      await activarM2Detallado(page)

      const m = await medir(page)

      // Criterio de aceptación: el DOCUMENTO no crece en horizontal
      // (tolerancia técnica de 1 px).
      expect(m.docOverflow, `documentElement overflow @ ${vp.nombre}`).toBeLessThanOrEqual(1)
      expect(m.bodyOverflow, `body overflow @ ${vp.nombre}`).toBeLessThanOrEqual(1)

      // Toda tabla técnica visible queda dentro del viewport…
      for (const w of m.wrappers) {
        expect(w.dentroDelViewport, `un .tabla-scroll sale del viewport @ ${vp.nombre}`).toBe(true)
      }
      // …y si necesita más ancho, el scroll está CONTENIDO en su wrapper
      // (no escondido): en mobile al menos una tabla debe scrollear.
      if (vp.width <= 390) {
        expect(
          m.wrappers.some((w) => w.wrapperOverflow > 1),
          `en ${vp.nombre} alguna tabla técnica debería scrollear dentro de su contenedor`,
        ).toBe(true)
      }

      // La invariante genérica del harness tampoco debe romperse.
      const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
      expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()

      // Y la app sigue viva (no se resolvió escondiendo contenido).
      const muestra = await tomarMuestraDom(page)
      expect(muestra.marcadorIuas).toBe(true)
      expect(muestra.textoUtilEnRoot).toBeGreaterThan(200)
    })
  }
})

// FIX-RESP-02 · el <select> de "excepción de ACS por unidad funcional" de
// M3 (opción larga "Usar el valor por defecto (Individual en cada unidad)")
// tomaba su ancho intrínseco (min-content) y empujaba el documento fuera
// del viewport en pantallas angostas. Fix: `select { max-width: 100%;
// min-width: 0 }` global. El fuzz lo encontró en seed 34365102807-1, run
// 17, step 28 (`cambiarExcepcionACSporUF=default`, mobile).
async function activarExcepcionAcsM3(page: Page): Promise<void> {
  // Estado mínimo: ≥2 unidades funcionales (para varias filas de excepción).
  await page.getByRole('link', { name: /Demanda/ }).first().click()
  await estabilizar(page)
  for (let i = 0; i < 2; i++) {
    await page.getByRole('button', { name: '+ Agregar unidad funcional' }).click()
    await estabilizar(page)
  }
  await page.getByRole('link', { name: /Medidores/ }).first().click()
  await estabilizar(page)
  const iniciar = page.getByRole('button', { name: 'Iniciar Módulo 3' })
  if (await iniciar.isVisible().catch(() => false)) {
    await iniciar.click()
    await estabilizar(page)
  }
  const ph = page.getByRole('checkbox', { name: /Propiedad horizontal/ })
  if (!(await ph.isChecked())) {
    await ph.click()
    await estabilizar(page)
  }
  // "individual" hace que la opción "Usar el valor por defecto (…)" del
  // <select> de excepción muestre el texto más largo.
  await page.getByLabel('Provisión de agua caliente (por defecto):').selectOption('individual')
  await estabilizar(page)
  // Abrir el <details> de excepciones y tocar la primera fila (acción del fallo).
  const resumen = page.getByText('Configurar excepciones por unidad funcional', { exact: true })
  await resumen.click()
  await estabilizar(page)
  const detalleExcepciones = resumen.locator('xpath=ancestor::details[1]')
  const selExcepcion = detalleExcepciones.locator('select').first()
  await selExcepcion.selectOption('default')
  await estabilizar(page)
}

// Localiza el <select> de excepción de ACS dentro de su <details>.
function selectDeExcepcionAcs(page: Page) {
  return page
    .getByText('Configurar excepciones por unidad funcional', { exact: true })
    .locator('xpath=ancestor::details[1]')
    .locator('select')
    .first()
}

test.describe('FIX-RESP-02 · M3 excepción de ACS por UF sin overflow', () => {
  for (const vp of VIEWPORTS) {
    test(`el <select> de excepción no desborda la página @ ${vp.nombre}`, async ({
      page,
      errores,
      baseURLEfectiva,
    }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'viewport fijado en el test')
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await cargarAppLimpia(page, baseURLEfectiva)
      await activarExcepcionAcsM3(page)

      const m = await medir(page)
      expect(m.docOverflow, `documentElement overflow @ ${vp.nombre}`).toBeLessThanOrEqual(1)
      expect(m.bodyOverflow, `body overflow @ ${vp.nombre}`).toBeLessThanOrEqual(1)

      // El control de excepción sigue visible y utilizable (no se ocultó).
      const selExcepcion = selectDeExcepcionAcs(page)
      await expect(selExcepcion).toBeVisible()
      await expect(selExcepcion).toBeEnabled()
      // Y cabe dentro del viewport.
      const dentro = await selExcepcion.evaluate(
        (el) => el.getBoundingClientRect().right <= window.innerWidth + 1,
      )
      expect(dentro, `el <select> de excepción sale del viewport @ ${vp.nombre}`).toBe(true)

      const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
      expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()

      const muestra = await tomarMuestraDom(page)
      expect(muestra.marcadorIuas).toBe(true)
      expect(muestra.textoUtilEnRoot).toBeGreaterThan(200)
    })
  }
})

// FIX-PERSIST-01-PROJECT-ACTIONS-SPACING-01 · las 4 acciones globales del
// proyecto (Nuevo proyecto / Cargar proyecto de ejemplo / Importar
// proyecto / Exportar proyecto) deben leerse como una grilla 2×2 estable,
// con separación uniforme -- antes de este fix, Importar/Exportar
// proyecto no tenían NINGÚN gap entre sí (botones adyacentes pegados).
test.describe('FIX-PERSIST-01-PROJECT-ACTIONS-SPACING-01 · separación entre acciones globales del proyecto', () => {
  for (const vp of VIEWPORTS) {
    test(`Nuevo/Ejemplo/Importar/Exportar sin overflow y con gap real @ ${vp.nombre}`, async ({
      page,
      errores,
      baseURLEfectiva,
    }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'viewport fijado en el test')
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await cargarAppLimpia(page, baseURLEfectiva)

      const m = await medir(page)
      expect(m.docOverflow, `documentElement overflow @ ${vp.nombre}`).toBeLessThanOrEqual(1)
      expect(m.bodyOverflow, `body overflow @ ${vp.nombre}`).toBeLessThanOrEqual(1)

      // Grilla 2×2 real: cada par debe estar en la MISMA fila (mismo
      // `top`) con un gap horizontal real -- nunca apilado a una columna.
      // CSS Grid de 2 columnas fijas (ver sistema-visual.css /
      // navegacionUI.css @media 560px) lo garantiza en todo el rango de
      // viewports probado; `flex-wrap` solo no alcanzaba a 360px porque
      // "Nuevo proyecto" + "Cargar proyecto de ejemplo" no entraban
      // juntos en una fila y se apilaban (regresión detectada con
      // Playwright durante este mismo hotfix).
      async function gapHorizontal(nombreA: string, nombreB: string): Promise<number> {
        const [cajaA, cajaB] = await Promise.all([
          page.getByRole('button', { name: nombreA, exact: true }).evaluate((el) => el.getBoundingClientRect()),
          page.getByRole('button', { name: nombreB, exact: true }).evaluate((el) => el.getBoundingClientRect()),
        ])
        expect(Math.abs(cajaA.top - cajaB.top), `"${nombreA}" y "${nombreB}" no están en la misma fila @ ${vp.nombre}`).toBeLessThanOrEqual(4)
        return cajaA.left <= cajaB.left ? cajaB.left - cajaA.right : cajaA.left - cajaB.right
      }

      const gapNuevoEjemplo = await gapHorizontal('Nuevo proyecto', 'Cargar proyecto de ejemplo')
      expect(gapNuevoEjemplo, `gap Nuevo/Ejemplo @ ${vp.nombre}`).toBeGreaterThanOrEqual(8)
      const gapImportarExportar = await gapHorizontal('Importar proyecto', 'Exportar proyecto')
      expect(gapImportarExportar, `gap Importar/Exportar @ ${vp.nombre}`).toBeGreaterThanOrEqual(8)

      const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
      expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
    })
  }
})

// FIX-PERSIST-01-PROJECT-ACTIONS-DESKTOP-ROW-01 · en desktop con ancho
// suficiente las 4 acciones globales del proyecto comparten UNA sola fila
// (antes cada par -- Nuevo/Ejemplo e Importar/Exportar -- forzaba su
// propia fila completa vía `flex-basis: 100%`, dando siempre 2×2 sin
// importar el ancho disponible). Medido con Playwright (no breakpoint a
// ciegas): el wrap natural a una fila ocurre entre 680px y 700px; no se
// fuerza ningún breakpoint adicional -- `flex-wrap` alcanza. Mobile
// (≤560px, ver navegacionUI.css) sigue con la grilla 2×2 intacta.
test.describe('FIX-PERSIST-01-PROJECT-ACTIONS-DESKTOP-ROW-01 · una sola fila en desktop ancho', () => {
  const NOMBRES = ['Nuevo proyecto', 'Cargar proyecto de ejemplo', 'Importar proyecto', 'Exportar proyecto'] as const

  async function cajas(page: Page) {
    const resultado: Record<string, DOMRect> = {}
    for (const nombre of NOMBRES) {
      resultado[nombre] = await page
        .getByRole('button', { name: nombre, exact: true })
        .evaluate((el) => el.getBoundingClientRect())
    }
    return resultado
  }

  for (const vp of [
    { nombre: '1280x900 (desktop)', width: 1280, height: 900 },
    { nombre: '1440x900 (desktop ancho)', width: 1440, height: 900 },
  ] as const) {
    test(`las 4 acciones comparten una fila @ ${vp.nombre}`, async ({ page, errores, baseURLEfectiva }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'viewport fijado en el test')
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await cargarAppLimpia(page, baseURLEfectiva)

      const c = await cajas(page)

      // Las 4 están visibles y en la misma fila (mismo `top`).
      const tops = NOMBRES.map((n) => c[n].top)
      for (const t of tops) {
        expect(Math.abs(t - tops[0]), `las 4 acciones no comparten fila @ ${vp.nombre}`).toBeLessThanOrEqual(2)
      }

      // Orden X correcto: Nuevo < Cargar < Importar < Exportar.
      for (let i = 0; i < NOMBRES.length - 1; i++) {
        expect(
          c[NOMBRES[i]].left,
          `orden incorrecto entre "${NOMBRES[i]}" y "${NOMBRES[i + 1]}" @ ${vp.nombre}`,
        ).toBeLessThan(c[NOMBRES[i + 1]].left)
      }

      // Gap horizontal >= 12px entre cada par adyacente, sin overlap.
      for (let i = 0; i < NOMBRES.length - 1; i++) {
        const gap = c[NOMBRES[i + 1]].left - c[NOMBRES[i]].right
        expect(gap, `gap entre "${NOMBRES[i]}" y "${NOMBRES[i + 1]}" @ ${vp.nombre}`).toBeGreaterThanOrEqual(11)
      }

      // Anchos naturales: no cuatro columnas iguales ocupando todo el
      // header (el ancho de "Cargar proyecto de ejemplo" -- el texto más
      // largo -- debe ser visiblemente mayor al de "Nuevo proyecto").
      const anchoNuevo = c['Nuevo proyecto'].right - c['Nuevo proyecto'].left
      const anchoCargar = c['Cargar proyecto de ejemplo'].right - c['Cargar proyecto de ejemplo'].left
      expect(anchoCargar, `anchos no son naturales @ ${vp.nombre}`).toBeGreaterThan(anchoNuevo)

      const m = await medir(page)
      expect(m.docOverflow, `documentElement overflow @ ${vp.nombre}`).toBeLessThanOrEqual(1)
      expect(m.bodyOverflow, `body overflow @ ${vp.nombre}`).toBeLessThanOrEqual(1)

      const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
      expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
    })
  }

  test('mobile conserva la grilla 2×2 (sin regresión) @ 390x844', async ({ page, errores, baseURLEfectiva }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'viewport fijado en el test')
    await page.setViewportSize({ width: 390, height: 844 })
    await cargarAppLimpia(page, baseURLEfectiva)

    const c = await cajas(page)
    // Nuevo/Cargar en una fila, Importar/Exportar en la fila siguiente.
    expect(Math.abs(c['Nuevo proyecto'].top - c['Cargar proyecto de ejemplo'].top)).toBeLessThanOrEqual(2)
    expect(Math.abs(c['Importar proyecto'].top - c['Exportar proyecto'].top)).toBeLessThanOrEqual(2)
    expect(c['Importar proyecto'].top).toBeGreaterThan(c['Nuevo proyecto'].bottom - 2)

    const m = await medir(page)
    expect(m.docOverflow).toBeLessThanOrEqual(1)
    expect(m.bodyOverflow).toBeLessThanOrEqual(1)

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  // Tablet/ancho intermedio: no se exige una sola fila (puede wrappear si
  // físicamente no entra), pero nunca overlap ni overflow horizontal.
  for (const vp of [
    { nombre: '768x1024', width: 768, height: 1024 },
    { nombre: '900x1024', width: 900, height: 1024 },
    { nombre: '1024x900', width: 1024, height: 900 },
  ] as const) {
    test(`sin overlap ni overflow, wrap coherente @ ${vp.nombre}`, async ({ page, errores, baseURLEfectiva }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'viewport fijado en el test')
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await cargarAppLimpia(page, baseURLEfectiva)

      const c = await cajas(page)
      // Ninguna caja se superpone con otra (overlap real en X e Y a la vez).
      for (let i = 0; i < NOMBRES.length; i++) {
        for (let j = i + 1; j < NOMBRES.length; j++) {
          const a = c[NOMBRES[i]]
          const b = c[NOMBRES[j]]
          const seSuperponeX = a.left < b.right && b.left < a.right
          const seSuperponeY = a.top < b.bottom && b.top < a.bottom
          expect(
            seSuperponeX && seSuperponeY,
            `"${NOMBRES[i]}" y "${NOMBRES[j]}" se superponen @ ${vp.nombre}`,
          ).toBe(false)
        }
      }

      const m = await medir(page)
      expect(m.docOverflow, `documentElement overflow @ ${vp.nombre}`).toBeLessThanOrEqual(1)
      expect(m.bodyOverflow, `body overflow @ ${vp.nombre}`).toBeLessThanOrEqual(1)

      const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
      expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
    })
  }
})
