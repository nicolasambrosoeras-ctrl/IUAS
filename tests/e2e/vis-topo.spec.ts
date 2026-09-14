// VIS-TOPO-01 / VIS-TOPO-01B — E2E dirigido del Esquema hidráulico
// read-only de M2. Usa el proyecto de ejemplo (AF+AC, fan-out real en la
// cabecera del Baño) que carga por defecto.
//
// VIS-TOPO-01B reubicó el visor: ya no hay un bloque grande inline en el
// cuerpo de M2. En viewport donde existe la sidebar de navegación
// (> 900px, mismo breakpoint que .app-nav) vive un panel chico y
// contraído por defecto dentro de esa barra lateral. En viewport angosto
// (<= 900px) el acceso es un botón compacto "Visualizar esquema" que abre
// un overlay de pantalla casi completa. Los proyectos de Playwright de
// este repo fijan viewport 1280x900 (desktop) y 390x844 (mobile) — ambos
// caen limpiamente a cada lado del breakpoint de 900px.
import { test, expect } from './qa/fixtures'
import { cargarAppLimpia, estabilizar } from './qa/estado'
import { verificarInvariantes, primerFallo } from './qa/invariantes'
import type { Locator, Page } from '@playwright/test'

async function irATuberias(page: Page): Promise<void> {
  await page.getByRole('link', { name: /Tuber[ií]as/ }).first().click()
  await estabilizar(page)
}

function panelSidebar(page: Page): Locator {
  return page.locator('.vis-topo-sidebar-panel')
}

async function expandirPanelSidebar(page: Page): Promise<Locator> {
  const panel = panelSidebar(page)
  await panel.locator('.vis-topo-sidebar-panel__cabecera').click()
  await estabilizar(page)
  return panel
}

test.describe('VIS-TOPO-01B · ubicación desktop (sidebar)', () => {
  test.use({ viewport: { width: 1280, height: 900 } })

  test('no existe el visor inline en el cuerpo de M2; el panel vive en la sidebar, contraído por defecto', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irATuberias(page)

    // El viejo bloque inline (VIS-TOPO-01) ya no existe.
    await expect(page.locator('section.esquema-hidraulico')).toHaveCount(0)
    // El botón mobile tampoco está visible en desktop.
    await expect(page.locator('.vis-topo-boton-visualizar')).toBeHidden()

    const panel = panelSidebar(page)
    await expect(panel).toBeVisible()
    const cabecera = panel.locator('.vis-topo-sidebar-panel__cabecera')
    await expect(cabecera).toHaveText(/Esquema hidráulico/)
    await expect(cabecera).toHaveAttribute('aria-expanded', 'false')
    // Contraído: el SVG no está en el documento todavía.
    await expect(panel.locator('svg.vis-topo-svg')).toHaveCount(0)

    const violaciones = await verificarInvariantes(page, errores)
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('expandir muestra el SVG; colapsar lo oculta; el contenido principal no salta', async ({ page, baseURLEfectiva }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irATuberias(page)

    // Posición ABSOLUTA en el documento (no relativa al viewport): un
    // click de Playwright puede auto-scrollear la página hasta el
    // disparador, lo que movería un boundingBox() viewport-relative sin
    // que haya habido ningún reflow real -- offsetTop no depende del
    // scroll.
    async function offsetTopDeTuberias(): Promise<number> {
      return page.locator('#tuberias').evaluate((el) => (el as HTMLElement).offsetTop)
    }

    const posicionAntes = await offsetTopDeTuberias()
    const panel = await expandirPanelSidebar(page)
    await expect(panel.locator('.vis-topo-sidebar-panel__cabecera')).toHaveAttribute('aria-expanded', 'true')
    await expect(panel.locator('svg.vis-topo-svg')).toBeVisible()
    await expect(panel.getByText('Baño 1', { exact: true })).toBeVisible()

    const posicionDespues = await offsetTopDeTuberias()
    // El panel vive en la columna lateral (sticky, ancho fijo): expandirlo
    // no debe desplazar el contenido principal de M2 (columnas de grid
    // independientes).
    expect(Math.abs(posicionDespues - posicionAntes)).toBeLessThan(5)

    await panel.locator('.vis-topo-sidebar-panel__cabecera').click()
    await estabilizar(page)
    await expect(panel.locator('svg.vis-topo-svg')).toHaveCount(0)
  })

  test('controles del panel expandido: AF, AC, Etiquetas, zoom, Ajustar, sin errores', async ({ page, errores, baseURLEfectiva }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irATuberias(page)
    const panel = await expandirPanelSidebar(page)

    const botonAf = panel.getByRole('button', { name: 'Agua fría (AF)' })
    const botonAc = panel.getByRole('button', { name: 'Agua caliente (AC)' })
    const botonEtiquetas = panel.getByRole('button', { name: 'Etiquetas' })

    await botonAc.click()
    await estabilizar(page)
    await expect(botonAc).toHaveAttribute('aria-pressed', 'false')
    await expect(panel.locator('.vis-topo-arista.vis-topo-red-ac')).toHaveCount(0)

    await botonAc.click()
    await botonAf.click()
    await estabilizar(page)
    await botonAf.click()
    await estabilizar(page)

    await botonEtiquetas.click()
    await estabilizar(page)
    await expect(botonEtiquetas).toHaveAttribute('aria-pressed', 'false')

    await panel.getByRole('button', { name: 'Acercar' }).click()
    await panel.getByRole('button', { name: 'Alejar' }).click()
    await panel.getByRole('button', { name: 'Ajustar' }).click()
    await estabilizar(page)

    const violaciones = await verificarInvariantes(page, errores)
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('el fan-out real se marca "Distribución no detallada", sin tees inventadas', async ({ page, baseURLEfectiva }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irATuberias(page)
    const panel = await expandirPanelSidebar(page)
    await expect(panel.getByText('Distribución no detallada').first()).toBeVisible()
  })
})

test.describe('VIS-TOPO-01B · acceso mobile (botón + overlay)', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('no hay panel lateral ni grafo inline; existe el botón "Visualizar esquema"', async ({ page, baseURLEfectiva }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irATuberias(page)

    await expect(page.locator('section.esquema-hidraulico')).toHaveCount(0)
    await expect(panelSidebar(page)).toBeHidden()
    const boton = page.locator('.vis-topo-boton-visualizar')
    await expect(boton).toBeVisible()
    await expect(boton).toHaveText('Visualizar esquema')
  })

  test('abrir el overlay: título, Cerrar, toolbar, SVG, auto-Ajustar, sin overflow horizontal', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irATuberias(page)

    await page.locator('.vis-topo-boton-visualizar').click()
    const overlay = page.locator('dialog.vis-topo-overlay')
    await expect(overlay).toBeVisible()
    await expect(overlay.getByRole('heading', { name: 'Esquema hidráulico' })).toBeVisible()
    await expect(overlay.getByRole('button', { name: 'Cerrar' })).toBeVisible()
    await expect(overlay.getByRole('toolbar')).toBeVisible()
    const svg = overlay.locator('svg.vis-topo-svg')
    await expect(svg).toBeVisible()

    // Auto-Ajustar: el viewBox es válido apenas se abre, sin tocar nada.
    const viewBox = await svg.getAttribute('viewBox')
    const partes = (viewBox ?? '').split(' ').map(Number)
    expect(partes.length).toBe(4)
    expect(partes.every((n) => Number.isFinite(n))).toBe(true)

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)

    const violaciones = await verificarInvariantes(page, errores)
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('cerrar el overlay vuelve a M2 sin cambiar de sección', async ({ page, baseURLEfectiva }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irATuberias(page)

    await page.locator('.vis-topo-boton-visualizar').click()
    const overlay = page.locator('dialog.vis-topo-overlay')
    await expect(overlay).toBeVisible()

    await overlay.getByRole('button', { name: 'Cerrar' }).click()
    await estabilizar(page)
    await expect(overlay).toHaveCount(0)
    await expect(page.locator('#tuberias')).toBeVisible()
    await expect(page.locator('.vis-topo-boton-visualizar')).toBeVisible()
  })

  test('Escape cierra el overlay', async ({ page, baseURLEfectiva }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irATuberias(page)

    await page.locator('.vis-topo-boton-visualizar').click()
    const overlay = page.locator('dialog.vis-topo-overlay')
    await expect(overlay).toBeVisible()

    await page.keyboard.press('Escape')
    await estabilizar(page)
    await expect(overlay).toHaveCount(0)
  })

  test('filtros y Ajustar dentro del overlay, sin errores', async ({ page, errores, baseURLEfectiva }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irATuberias(page)
    await page.locator('.vis-topo-boton-visualizar').click()
    const overlay = page.locator('dialog.vis-topo-overlay')

    const botonAc = overlay.getByRole('button', { name: 'Agua caliente (AC)' })
    await botonAc.click()
    await estabilizar(page)
    await expect(overlay.locator('.vis-topo-arista.vis-topo-red-ac')).toHaveCount(0)
    await botonAc.click()
    await estabilizar(page)

    await overlay.getByRole('button', { name: 'Ajustar' }).click()
    await estabilizar(page)

    const violaciones = await verificarInvariantes(page, errores)
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })
})
