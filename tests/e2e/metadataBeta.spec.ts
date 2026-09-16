// BETA-WEB-METADATA-01 — metadata pública real en el navegador: title de
// pestaña, meta description, favicon resuelto contra `base` (GitHub Pages
// sirve el proyecto en `/IUAS/`) y el copy "Versión beta" visible en la UI
// (sin ningún rastro de "Versión piloto").
import { test, expect } from './qa/fixtures'
import { cargarAppLimpia } from './qa/estado'

test.describe('BETA-WEB-METADATA-01 · metadata pública', () => {
  test('title, meta description y Open Graph están presentes', async ({ page, baseURLEfectiva }) => {
    await cargarAppLimpia(page, baseURLEfectiva)

    await expect(page).toHaveTitle('Caudal by DREZA — Instalaciones internas de agua')

    const description = await page.locator('meta[name="description"]').getAttribute('content')
    expect(description).toBeTruthy()
    expect(description).toContain('instalaciones internas de agua')

    const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content')
    expect(ogTitle).toBe('Caudal by DREZA — Instalaciones internas de agua')
    const ogType = await page.locator('meta[property="og:type"]').getAttribute('content')
    expect(ogType).toBe('website')
  })

  test('el favicon resuelve con HTTP 200 respetando el base path', async ({ page, baseURLEfectiva }) => {
    await cargarAppLimpia(page, baseURLEfectiva)

    const href = await page.locator('link[rel~="icon"]').getAttribute('href')
    expect(href).toBeTruthy()

    const url = new URL(href!, page.url())
    const respuesta = await page.request.get(url.toString())
    expect(respuesta.status()).toBe(200)
    const contentType = respuesta.headers()['content-type'] ?? ''
    expect(contentType).toContain('svg')
  })

  test('la UI dice "Versión beta" y no queda "Versión piloto"', async ({ page, baseURLEfectiva }) => {
    await cargarAppLimpia(page, baseURLEfectiva)

    await expect(page.getByText('Versión beta ·', { exact: false })).toBeVisible()
    await expect(page.getByText('Versión piloto', { exact: false })).toHaveCount(0)
  })
})
