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
