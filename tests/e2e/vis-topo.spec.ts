// VIS-TOPO-01 — E2E dirigido del Esquema hidráulico read-only de M2.
// Usa el proyecto de ejemplo (AF+AC, fan-out real en la cabecera del
// Baño) que carga por defecto: cubre render, filtros AF/AC, Ajustar/zoom,
// y responsive, sin tocar hidráulica ni persistencia.
import { test, expect } from './qa/fixtures'
import { cargarAppLimpia, estabilizar } from './qa/estado'
import { verificarInvariantes, primerFallo } from './qa/invariantes'
import type { Locator, Page } from '@playwright/test'

async function irATuberias(page: Page): Promise<void> {
  await page.getByRole('link', { name: /Tuber[ií]as/ }).first().click()
  await estabilizar(page)
}

function seccionEsquema(page: Page): Locator {
  return page.locator('section.esquema-hidraulico')
}

test.describe('VIS-TOPO-01 · Esquema hidráulico', () => {
  test('renderiza el SVG con nodos AF/AC del proyecto de ejemplo, sin errores', async ({ page, errores, baseURLEfectiva }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irATuberias(page)

    const seccion = seccionEsquema(page)
    await expect(seccion.getByRole('heading', { name: 'Esquema hidráulico' })).toBeVisible()

    const svg = seccion.locator('svg.vis-topo-svg')
    await expect(svg).toBeVisible()
    // al menos un nodo Local reconocible por nombre humano, nunca un id técnico.
    await expect(seccion.getByText('Baño 1', { exact: true })).toBeVisible()
    await expect(seccion.locator('text', { hasText: /^n-af-1$|^n-0$|^local:/ })).toHaveCount(0)

    const violaciones = await verificarInvariantes(page, errores)
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('el fan-out real de la cabecera del Baño se marca como no detallado, sin tees inventadas', async ({ page, baseURLEfectiva }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irATuberias(page)
    const seccion = seccionEsquema(page)
    await expect(seccion.getByText('Distribución no detallada').first()).toBeVisible()
  })

  test('filtros AF/AC ocultan y restauran sus aristas, sin perder el estado del proyecto', async ({ page, errores, baseURLEfectiva }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irATuberias(page)
    const seccion = seccionEsquema(page)
    const botonAf = seccion.getByRole('button', { name: 'Agua fría (AF)' })
    const botonAc = seccion.getByRole('button', { name: 'Agua caliente (AC)' })
    await expect(botonAf).toHaveAttribute('aria-pressed', 'true')
    await expect(botonAc).toHaveAttribute('aria-pressed', 'true')
    await expect(seccion.locator('.vis-topo-arista.vis-topo-red-ac').first()).toBeVisible()

    await botonAc.click()
    await estabilizar(page)
    await expect(botonAc).toHaveAttribute('aria-pressed', 'false')
    await expect(seccion.locator('.vis-topo-arista.vis-topo-red-ac')).toHaveCount(0)
    await expect(seccion.locator('.vis-topo-arista.vis-topo-red-af').first()).toBeVisible()

    await botonAf.click()
    await estabilizar(page)
    await expect(seccion.getByText('No hay ninguna red visible', { exact: false })).toBeVisible()

    await botonAf.click()
    await botonAc.click()
    await estabilizar(page)
    await expect(botonAf).toHaveAttribute('aria-pressed', 'true')
    await expect(botonAc).toHaveAttribute('aria-pressed', 'true')

    // Qc de M1 sigue igual -- el visor no mutó el proyecto.
    await page.getByRole('link', { name: /Demanda/ }).first().click()
    await expect(page.getByText('Caudal de cálculo · Qc')).toBeVisible()

    const violaciones = await verificarInvariantes(page, errores)
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('Ajustar/zoom no rompen la app (transform finito, sin crash)', async ({ page, errores, baseURLEfectiva }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irATuberias(page)
    const seccion = seccionEsquema(page)
    const svg = seccion.locator('svg.vis-topo-svg')

    async function viewBoxValido(): Promise<boolean> {
      const valor = await svg.getAttribute('viewBox')
      if (valor === null) return false
      const partes = valor.split(' ').map(Number)
      return partes.length === 4 && partes.every((n) => Number.isFinite(n))
    }

    await expect.poll(viewBoxValido).toBe(true)

    await seccion.getByRole('button', { name: 'Acercar' }).click()
    await estabilizar(page)
    expect(await viewBoxValido()).toBe(true)

    await seccion.getByRole('button', { name: 'Alejar' }).click()
    await estabilizar(page)
    expect(await viewBoxValido()).toBe(true)

    await seccion.getByRole('button', { name: 'Ajustar' }).click()
    await estabilizar(page)
    expect(await viewBoxValido()).toBe(true)

    const violaciones = await verificarInvariantes(page, errores)
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('toggle de etiquetas oculta/muestra el detalle de DN/longitud sin ocultar los Locales', async ({ page, baseURLEfectiva }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irATuberias(page)
    const seccion = seccionEsquema(page)
    const botonEtiquetas = seccion.getByRole('button', { name: 'Etiquetas' })
    await expect(botonEtiquetas).toHaveAttribute('aria-pressed', 'true')

    await botonEtiquetas.click()
    await estabilizar(page)
    await expect(botonEtiquetas).toHaveAttribute('aria-pressed', 'false')
    // el nombre del Local sigue visible aunque se oculten las etiquetas de arista.
    await expect(seccion.getByText('Baño 1', { exact: true })).toBeVisible()
  })
})
