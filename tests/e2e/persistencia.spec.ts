// PERSIST-01 (§59-§63): contrato más visible del slice -- lo que el
// usuario hace en pantalla debe sobrevivir a un refresh, y export/import
// deben ser una vía de ida y vuelta confiable. `cargarAppLimpia` ya limpia
// el autosave antes de cada test (ver qa/estado.ts).
import { test, expect } from './qa/fixtures'
import { cargarAppLimpia, estabilizar } from './qa/estado'
import { verificarInvariantes, primerFallo } from './qa/invariantes'
import type { Page } from '@playwright/test'

async function irA(page: Page, nombre: RegExp): Promise<void> {
  await page.getByRole('link', { name: nombre }).first().click()
  await estabilizar(page)
}

// El autosave tiene debounce (~500ms) -- esperar a que el guardado
// realmente ocurra antes de recargar, sin depender de un indicador visual
// (fuera de alcance de PERSIST-01, §43).
async function esperarAutosave(page: Page): Promise<void> {
  await page.waitForTimeout(700)
}

test.describe('PERSIST-01 · autosave y reload', () => {
  test('modificar el proyecto y recargar conserva el cambio', async ({ page, errores, baseURLEfectiva }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irA(page, /Demanda/)
    await expect(page.getByText('Total de unidades funcionales: 1')).toBeVisible()

    await page.getByRole('button', { name: '+ Agregar unidad funcional' }).first().click()
    await estabilizar(page)
    await expect(page.getByText('Total de unidades funcionales: 2')).toBeVisible()

    await esperarAutosave(page)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await irA(page, /Demanda/)

    await expect(page.getByText('Total de unidades funcionales: 2')).toBeVisible()

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('agregar un segundo Nivel, recargar, la jerarquía multinivel persiste', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irA(page, /Demanda/)

    const uf = page.locator('.m1-uf').first()
    await uf.getByRole('button', { name: '+ Agregar nivel' }).click()
    await estabilizar(page)
    await expect(uf.locator('.m1-nivel')).toHaveCount(2)

    await esperarAutosave(page)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await irA(page, /Demanda/)

    const ufTrasReload = page.locator('.m1-uf').first()
    await expect(ufTrasReload.locator('.m1-nivel')).toHaveCount(2)

    // UX-HIERARCHY-POLISH-01: el estado de colapso es UI efímera, nunca
    // persistida -- tras el reload, el Nivel adicional vuelve a nacer
    // colapsado (política de default: sólo el nivel base abre). "Eliminar
    // nivel" sólo se ofrece con el Nivel expandido -- hay que abrirlo
    // primero para verificar que la jerarquía (el dato, no el plegado)
    // sobrevivió al refresh.
    const nivelAdicional = ufTrasReload.locator('.m1-nivel').nth(1)
    const toggleNivel = nivelAdicional.getByRole('button', { name: /^Expandir nivel / })
    if (await toggleNivel.isVisible().catch(() => false)) {
      await toggleNivel.click()
      await estabilizar(page)
    }
    await expect(ufTrasReload.getByRole('button', { name: 'Eliminar nivel' })).toHaveCount(1)

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('DN manual: adoptar un DN, recargar, sigue manual con el mismo valor', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irA(page, /Tuber[ií]as/)

    const controlDn = page.locator('.control-dn').first()
    await expect(controlDn).toBeVisible()
    const dnAntesDeAdoptar = await controlDn.locator('.control-dn__dn').textContent()

    await controlDn.getByRole('button', { name: 'Adoptar el DN comercial inmediato superior' }).click()
    await estabilizar(page)
    await expect(controlDn.getByText('Manual')).toBeVisible()
    const dnAdoptado = await controlDn.locator('.control-dn__dn').textContent()
    expect(dnAdoptado).not.toBe(dnAntesDeAdoptar)

    await esperarAutosave(page)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await irA(page, /Tuber[ií]as/)

    const controlDnTrasReload = page.locator('.control-dn').first()
    await expect(controlDnTrasReload.getByText('Manual')).toBeVisible()
    await expect(controlDnTrasReload.locator('.control-dn__dn')).toHaveText(dnAdoptado ?? '')

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })
})

test.describe('PERSIST-01 · exportar / importar', () => {
  test('exportar, modificar el proyecto, importar el archivo exportado: vuelve el estado exportado', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irA(page, /Demanda/)
    await expect(page.getByText('Total de unidades funcionales: 1')).toBeVisible()

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: 'Exportar proyecto' }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/\.iuas$/)
    const rutaDescargada = await download.path()
    expect(rutaDescargada).not.toBeNull()

    // Modificar el proyecto DESPUÉS de exportar -- el archivo exportado no
    // debe verse afectado (§39: exportar no modifica estado).
    await page.getByRole('button', { name: '+ Agregar unidad funcional' }).first().click()
    await estabilizar(page)
    await expect(page.getByText('Total de unidades funcionales: 2')).toBeVisible()

    await page.setInputFiles('input[type="file"]', rutaDescargada as string)
    await estabilizar(page)

    const dialogo = page.getByRole('dialog')
    await expect(dialogo).toBeVisible()
    await expect(dialogo.getByText(/reemplazará el proyecto actual/)).toBeVisible()
    await dialogo.getByRole('button', { name: 'Importar', exact: true }).click()
    await estabilizar(page)

    // Vuelve el proyecto tal como estaba AL EXPORTAR (1 UF), no el
    // modificado (2 UF) que había en pantalla antes de importar.
    await expect(page.getByText('Total de unidades funcionales: 1')).toBeVisible()

    await esperarAutosave(page)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await irA(page, /Demanda/)
    // §33: el autosave se actualizó con el proyecto importado, no con el
    // que había antes de importar.
    await expect(page.getByText('Total de unidades funcionales: 1')).toBeVisible()

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('importar un archivo inválido: mensaje humano, proyecto actual intacto, app viva', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irA(page, /Demanda/)
    await expect(page.getByText('Total de unidades funcionales: 1')).toBeVisible()

    await page.setInputFiles('input[type="file"]', {
      name: 'no-es-un-proyecto.iuas',
      mimeType: 'application/json',
      buffer: Buffer.from('esto no es JSON', 'utf-8'),
    })
    await estabilizar(page)

    await expect(page.getByText('El archivo seleccionado no es un archivo de proyecto válido.')).toBeVisible()
    // No se abrió diálogo de confirmación: el archivo nunca fue válido.
    await expect(page.getByRole('dialog')).toHaveCount(0)
    // El proyecto actual sigue exactamente igual.
    await expect(page.getByText('Total de unidades funcionales: 1')).toBeVisible()

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })
})
