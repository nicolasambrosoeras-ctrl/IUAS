// Smoke determinista, FUERA del fuzz (brief §43). Sirve para distinguir
// "app completamente rota" de "fallo de combinación". Sin aleatoriedad:
// carga, recorre las 5 secciones, toca M1/M2/M3/M4 con un camino feliz
// mínimo, y exige 0 console.error / 0 pageerror.
import { test, expect } from './qa/fixtures'
import { cargarAppLimpia, esperarAppLista, estabilizar } from './qa/estado'
import { verificarInvariantes, primerFallo } from './qa/invariantes'

test.describe('QA-FUZZ-01 · smoke determinista', () => {
  test('carga y recorre las 5 secciones sin errores', async ({ page, errores, baseURLEfectiva }) => {
    await cargarAppLimpia(page, baseURLEfectiva)

    // Identidad + shell.
    await expect(page.getByRole('heading', { name: /IUAS/ }).first()).toBeVisible()

    // Las 5 etapas del flujo tienen anchor.
    for (const id of ['demanda', 'tuberias', 'medidores', 'abastecimiento', 'verificacion-hidraulica']) {
      await expect(page.locator(`#${id}`)).toHaveCount(1)
    }

    // Navegación por el índice.
    for (const nombre of [/Demanda/, /Tuber[ií]as/, /Medidores/, /Abastecimiento/, /Verificaci[oó]n/]) {
      await page.getByRole('link', { name: nombre }).first().click()
      await estabilizar(page)
      const violaciones = await verificarInvariantes(page, errores)
      expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
    }

    // M1: Qc visible en el proyecto de ejemplo.
    await page.getByRole('link', { name: /Demanda/ }).first().click()
    await expect(page.getByText('Caudal de cálculo · Qc')).toBeVisible()

    // M3: iniciar módulo.
    await page.getByRole('link', { name: /Medidores/ }).first().click()
    await estabilizar(page)
    const iniciarM3 = page.getByRole('button', { name: 'Iniciar Módulo 3' })
    if (await iniciarM3.isVisible()) {
      await iniciarM3.click()
      await estabilizar(page)
      await expect(page.getByText(/Configuración/).first()).toBeVisible()
    }

    // M4: elegir un esquema.
    await page.getByRole('link', { name: /Abastecimiento/ }).first().click()
    await estabilizar(page)
    const tanque = page.getByRole('button', { name: 'Tanque elevado', exact: true })
    if (await tanque.isVisible()) {
      await tanque.click()
      await estabilizar(page)
    }

    // Modo de trabajo global: alternar Profesional / Rápido.
    await page.getByRole('button', { name: 'Profesional', exact: true }).first().click()
    await estabilizar(page)
    await page.getByRole('button', { name: 'Rápido', exact: true }).first().click()
    await estabilizar(page)

    await esperarAppLista(page)
    const violacionesFinales = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violacionesFinales), JSON.stringify(primerFallo(violacionesFinales))).toBeNull()
  })
})
