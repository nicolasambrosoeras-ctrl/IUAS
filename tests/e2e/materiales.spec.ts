// MATERIALS-01: E2E del Listado de materiales -- documento independiente de
// la Memoria técnica (brief §70/§71/§72/§73). Verifica el camino feliz
// (selector, presets, personalizado, descarga) y la validación de entrada
// inválida, sin depender del contenido interno del PDF (eso se audita a
// mano, brief §91).
import type { Page } from '@playwright/test'
import { test, expect } from './qa/fixtures'
import { cargarAppLimpia, estabilizar } from './qa/estado'

function controlDeMateriales(page: Page) {
  return page.getByRole('group', { name: 'Generar listado de materiales' })
}

test.describe('MATERIALS-01 · Listado de materiales', () => {
  test('ambos botones conviven y el listado genera un PDF con 10 %', async ({ page, baseURLEfectiva }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await page.getByRole('link', { name: /Demanda/ }).first().click()
    await estabilizar(page)

    await expect(page.getByRole('button', { name: 'Generar memoria técnica' })).toBeVisible()
    await page.getByRole('button', { name: 'Generar listado de materiales' }).click()
    await estabilizar(page)

    const control = controlDeMateriales(page)
    await expect(control.getByText('Margen adicional de compra')).toBeVisible()
    await control.getByRole('combobox').selectOption('10')

    const descargaEsperada = page.waitForEvent('download')
    await control.getByRole('button', { name: 'Generar PDF' }).click()
    const descarga = await descargaEsperada
    expect(descarga.suggestedFilename()).toMatch(/^IUAS_Listado_de_materiales_.*\.pdf$/)

    // La Memoria técnica sigue funcionando de forma independiente.
    const descargaMemoria = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Generar memoria técnica' }).click()
    const memoria = await descargaMemoria
    expect(memoria.suggestedFilename()).toMatch(/^IUAS_Memoria_de_calculo_.*\.pdf$/)
  })

  test('porcentaje personalizado válido genera el PDF', async ({ page, baseURLEfectiva }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await page.getByRole('link', { name: /Demanda/ }).first().click()
    await estabilizar(page)

    await page.getByRole('button', { name: 'Generar listado de materiales' }).click()
    const control = controlDeMateriales(page)
    await control.getByRole('combobox').selectOption('personalizado')
    await control.getByRole('spinbutton').fill('12.5')

    const descargaEsperada = page.waitForEvent('download')
    await control.getByRole('button', { name: 'Generar PDF' }).click()
    await descargaEsperada
  })

  test('porcentaje personalizado inválido bloquea la generación con un mensaje claro', async ({ page, baseURLEfectiva }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await page.getByRole('link', { name: /Demanda/ }).first().click()
    await estabilizar(page)

    await page.getByRole('button', { name: 'Generar listado de materiales' }).click()
    const control = controlDeMateriales(page)
    await control.getByRole('combobox').selectOption('personalizado')

    for (const invalido of ['-1', '101', '']) {
      await control.getByRole('spinbutton').fill(invalido)
      await control.getByRole('button', { name: 'Generar PDF' }).click()
      await expect(control.getByRole('alert')).toBeVisible()
    }
  })

  test('mobile (390px): ambos botones y el selector son usables', async ({ page, baseURLEfectiva }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await cargarAppLimpia(page, baseURLEfectiva)
    await page.getByRole('link', { name: /Demanda/ }).first().click()
    await estabilizar(page)

    await expect(page.getByRole('button', { name: 'Generar memoria técnica' })).toBeVisible()
    await page.getByRole('button', { name: 'Generar listado de materiales' }).click()
    await expect(page.getByText('Margen adicional de compra')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Generar PDF' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Cancelar' })).toBeVisible()
  })
})
