// REPORT-POLISH-01 §77: cobertura E2E del botón "Generar memoria técnica"
// -- no existía ninguna antes de este slice (la descarga real del PDF
// nunca se había ejercitado end-to-end). No se valida la estética completa
// desde Playwright (brief §77/§85: eso se hace con inspección visual
// manual); acá sólo se confirma que el flujo real de click -> descarga
// funciona sin pageerror, para los escenarios que el brief pide cubrir.
import { test, expect } from './qa/fixtures'
import { cargarAppLimpia, estabilizar } from './qa/estado'
import { verificarInvariantes, primerFallo } from './qa/invariantes'
import type { Page } from '@playwright/test'

async function irADemanda(page: Page): Promise<void> {
  await page.getByRole('link', { name: /Demanda/ }).first().click()
  await estabilizar(page)
}

async function generarMemoria(page: Page) {
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Generar memoria técnica' }).click(),
  ])
  return download
}

test.describe('REPORT-POLISH-01 · botón "Generar memoria técnica"', () => {
  test('proyecto de ejemplo: descarga un PDF con nombre IUAS_Memoria_de_calculo_*, sin pageerror', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irADemanda(page)

    const download = await generarMemoria(page)
    expect(download.suggestedFilename()).toMatch(/^IUAS_Memoria_de_calculo_.*\.pdf$/)

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('Local con nombre personalizado: la memoria se sigue generando sin errores', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irADemanda(page)

    // Expande el primer Local (ya nace abierto, UX-HIERARCHY-POLISH-01) y
    // le pone un nombre personalizado.
    const nombreInput = page.getByLabel('Nombre del local').first()
    await nombreInput.fill('Baño principal')
    await estabilizar(page)

    const download = await generarMemoria(page)
    expect(download.suggestedFilename()).toMatch(/\.pdf$/)

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('proyecto incompleto (recién creado, sin M2/M3/M4): la memoria se genera igual, sin pageerror', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irADemanda(page)

    await page.getByRole('button', { name: 'Nuevo proyecto', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Crear nuevo proyecto', exact: true }).click()
    await estabilizar(page)
    await page.getByRole('button', { name: '+ Agregar unidad funcional' }).first().click()
    await estabilizar(page)
    await page.getByRole('button', { name: '+ Agregar local' }).first().click()
    await estabilizar(page)

    const download = await generarMemoria(page)
    expect(download.suggestedFilename()).toMatch(/\.pdf$/)

    const violaciones = await verificarInvariantes(page, errores)
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })
})
