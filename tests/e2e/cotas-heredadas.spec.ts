// GEOM-UX-01 §25 — jerarquía de cotas en la UI de M1: el Local hereda la
// cota de piso de la UF, el artefacto muestra su altura sugerida IUAS y su
// cota hidráulica efectiva; personalizar el Local re-deriva todos sus
// hijos, personalizar un artefacto sólo lo afecta a él, y restablecer /
// cambiar de tipo limpian el override.
import { test, expect } from './qa/fixtures'
import { cargarAppLimpia, estabilizar } from './qa/estado'
import type { Locator } from '@playwright/test'

test.describe('GEOM-UX-01 · cotas hidráulicas heredadas (M1)', () => {
  test('herencia UF→Local, sugerida IUAS, cota efectiva, personalizar/restablecer y cambio de tipo', async ({
    page,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await page.getByRole('link', { name: /Demanda/ }).first().click()
    await estabilizar(page)

    // Primer Local del demo = Baño (uf-1 está PB -> cota de piso 0).
    const bano = page.locator('.m1-local').first()
    const cotaLocal = bano.locator('> .m1-cota')
    await expect(cotaLocal).toContainText('hereda UF: +0,00 m')

    // Primer artefacto del Baño = Lavatorio: altura sugerida IUAS 0,90 y
    // cota hidráulica efectiva 0 + 0,90 = +0,90 m.
    const lavatorio = bano.locator('.m1-artefacto').first()
    const cotaLavatorio = lavatorio.locator('.m1-cota')
    await expect(cotaLavatorio).toContainText('0,90 m · sugerida IUAS')
    await expect(cotaLavatorio).toContainText('Cota hidráulica efectiva: +0,90 m')

    // Segundo artefacto = Ducha: sugerida IUAS 2,00 -> efectiva +2,00 m.
    const ducha = bano.locator('.m1-artefacto').nth(1)
    const cotaDucha = ducha.locator('.m1-cota')
    await expect(cotaDucha).toContainText('2,00 m · sugerida IUAS')
    await expect(cotaDucha).toContainText('Cota hidráulica efectiva: +2,00 m')

    // --- Personalizar la cota de piso del Local a 3,00 ---
    await cotaLocal.getByRole('button', { name: 'Personalizar' }).click()
    await estabilizar(page)
    const inputCotaLocal = cotaLocal.getByRole('spinbutton')
    await inputCotaLocal.fill('3')
    await estabilizar(page)
    await expect(cotaLocal).toContainText('personalizada')
    // Re-deriva a TODOS los hijos: lavatorio +3,90, ducha +5,00.
    await expect(cotaLavatorio).toContainText('Cota hidráulica efectiva: +3,90 m')
    await expect(cotaDucha).toContainText('Cota hidráulica efectiva: +5,00 m')

    // --- Restablecer el Local -> vuelve a heredar la UF ---
    await cotaLocal.getByRole('button', { name: 'Restablecer' }).click()
    await estabilizar(page)
    await expect(cotaLocal).toContainText('hereda UF: +0,00 m')
    await expect(cotaLavatorio).toContainText('Cota hidráulica efectiva: +0,90 m')
    await expect(cotaDucha).toContainText('Cota hidráulica efectiva: +2,00 m')

    // --- Personalizar SÓLO la altura del lavatorio a 1,50 ---
    await cotaLavatorio.getByRole('button', { name: 'Personalizar' }).click()
    await estabilizar(page)
    const inputAltura: Locator = cotaLavatorio.getByRole('spinbutton')
    await inputAltura.fill('1.5')
    await estabilizar(page)
    await expect(cotaLavatorio).toContainText('personalizada')
    await expect(cotaLavatorio).toContainText('Cota hidráulica efectiva: +1,50 m')
    // La ducha (hermana) no se toca.
    await expect(cotaDucha).toContainText('Cota hidráulica efectiva: +2,00 m')
    await expect(cotaDucha).toContainText('sugerida IUAS')

    // --- Restablecer la altura del lavatorio -> vuelve a la sugerida IUAS ---
    await cotaLavatorio.getByRole('button', { name: 'Restablecer' }).click()
    await estabilizar(page)
    await expect(cotaLavatorio).toContainText('0,90 m · sugerida IUAS')
    await expect(cotaLavatorio).toContainText('Cota hidráulica efectiva: +0,90 m')

    // --- Cambiar el tipo de la ducha a Bidet: limpia el override stale ---
    // Primero personalizo la ducha a 2,20; al cambiar de tipo debe
    // adoptar el default IUAS del bidet (0,40), no arrastrar 2,20.
    await cotaDucha.getByRole('button', { name: 'Personalizar' }).click()
    await estabilizar(page)
    await cotaDucha.getByRole('spinbutton').fill('2.2')
    await estabilizar(page)
    await expect(cotaDucha).toContainText('Cota hidráulica efectiva: +2,20 m')

    await ducha.getByRole('combobox', { name: 'Artefacto' }).selectOption('bidet')
    await estabilizar(page)
    await expect(cotaDucha).toContainText('0,40 m · sugerida IUAS')
    await expect(cotaDucha).toContainText('Cota hidráulica efectiva: +0,40 m')
    await expect(cotaDucha).not.toContainText('personalizada')
  })
})
