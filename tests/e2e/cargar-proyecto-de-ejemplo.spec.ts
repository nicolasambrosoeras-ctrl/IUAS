// FIX-PERSIST-01-PROJECT-ACTIONS-01 — "Cargar proyecto de ejemplo":
// acción global distinta de "Nuevo proyecto" (§13: nunca deben colapsar a
// la misma semántica). Reemplaza el proyecto activo por `proyectoInicial`
// (única fuente de verdad del demo, sin factory nueva ni clon manual). Se
// prueba acá el flujo propio (confirmar/cancelar) y el recorrido completo
// que combina ambas acciones (§22), incluyendo persistencia real vía
// autosave/reload en cada paso.
import { test, expect } from './qa/fixtures'
import { cargarAppLimpia, estabilizar } from './qa/estado'
import { verificarInvariantes, primerFallo } from './qa/invariantes'
import type { Page } from '@playwright/test'

async function irA(page: Page, nombre: RegExp): Promise<void> {
  await page.getByRole('link', { name: nombre }).first().click()
  await estabilizar(page)
}

async function esperarAutosave(page: Page): Promise<void> {
  await page.waitForTimeout(700)
}

test.describe('FIX-PERSIST-01-PROJECT-ACTIONS-01 · Cargar proyecto de ejemplo', () => {
  test('reemplaza el proyecto activo por el demo, recalcula M1-M4, y sobrevive a un refresh', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irA(page, /Demanda/)

    // Partir de un proyecto DISTINTO del demo: vacío + una UF propia.
    await page.getByRole('button', { name: 'Nuevo proyecto', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Crear nuevo proyecto', exact: true }).click()
    await estabilizar(page)
    await expect(page.getByText('Total de unidades funcionales: 0')).toBeVisible()
    await page.getByRole('button', { name: '+ Agregar unidad funcional' }).first().click()
    await estabilizar(page)
    await expect(page.getByText('Total de unidades funcionales: 1')).toBeVisible()

    // --- Cargar proyecto de ejemplo (con confirmación) ---
    await page.getByRole('button', { name: 'Cargar proyecto de ejemplo', exact: true }).click()
    const dialogo = page.getByRole('dialog')
    await expect(dialogo).toBeVisible()
    await expect(dialogo.getByRole('heading', { name: 'Cargar proyecto de ejemplo' })).toBeVisible()
    await expect(dialogo.getByText(/proyecto de ejemplo de IUAS/)).toBeVisible()
    await dialogo.getByRole('button', { name: 'Cargar ejemplo', exact: true }).click()
    await estabilizar(page)

    // Estructura demo completa: vivienda unifamiliar con sus 5 Locales
    // reconocibles (Baño/Cocina/Lavadero/Toilette/Jardín, mismo fixture
    // que `proyectoInicial`) -- no sólo "1 UF" (eso también daría el
    // proyecto recién editado). M1 recalcula Qc.
    await expect(page.getByText('Total de unidades funcionales: 1')).toBeVisible()
    await expect(page.locator('.m1-local')).toHaveCount(5)
    await expect(page.getByText('Caudal de cálculo · Qc')).toBeVisible()

    // M2/M3/M4 se recalculan normalmente sobre el demo (secciones aparecen).
    await irA(page, /Tuber[ií]as/)
    await expect(page.locator('#tuberias')).toBeVisible()

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()

    // El autosave se actualizó con el ejemplo -- un refresh lo conserva.
    await esperarAutosave(page)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await irA(page, /Demanda/)
    await expect(page.getByText('Total de unidades funcionales: 1')).toBeVisible()
    await expect(page.locator('.m1-local')).toHaveCount(5)
  })

  test('Cargar proyecto de ejemplo → Cancelar conserva el proyecto y el autosave intactos', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irA(page, /Demanda/)

    // Partir de un proyecto vacío editado (distinto del demo).
    await page.getByRole('button', { name: 'Nuevo proyecto', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Crear nuevo proyecto', exact: true }).click()
    await estabilizar(page)
    await page.getByRole('button', { name: '+ Agregar unidad funcional' }).first().click()
    await estabilizar(page)
    await expect(page.getByText('Total de unidades funcionales: 1')).toBeVisible()
    await expect(page.getByText(/Proyecto vac[ií]o/)).toHaveCount(0)
    await esperarAutosave(page)

    await page.getByRole('button', { name: 'Cargar proyecto de ejemplo', exact: true }).click()
    const dialogo = page.getByRole('dialog')
    await expect(dialogo).toBeVisible()
    await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await estabilizar(page)

    await expect(page.getByRole('dialog')).toHaveCount(0)
    // Sigue el proyecto vacío editado -- NO el demo. BETA-UI-POLISH-01: el
    // párrafo del header ya no afirma "Proyecto de ejemplo" (esa heurística
    // por cantidad de UF podía mentir); ahora muestra la Tipología de
    // proyecto real, que por default es la misma ("Vivienda individual")
    // para el demo y para un proyecto nuevo, así que tampoco sirve para
    // diferenciarlos -- la señal confiable sigue siendo que la UF agregada
    // no trae ningún Local (el demo sí: Baño/Cocina/Lavadero/Toilette/Jardín).
    await expect(page.getByText('Total de unidades funcionales: 1')).toBeVisible()
    await expect(page.locator('.m1-local')).toHaveCount(0)

    // El autosave tampoco se tocó.
    await page.reload({ waitUntil: 'domcontentloaded' })
    await irA(page, /Demanda/)
    await expect(page.getByText('Total de unidades funcionales: 1')).toBeVisible()
    await expect(page.locator('.m1-local')).toHaveCount(0)

    const violaciones = await verificarInvariantes(page, errores)
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('§22 · flujo completo: reload, Nuevo proyecto (cancelar/confirmar), Cargar ejemplo (cancelar/confirmar), reload en cada paso', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irA(page, /Demanda/)
    await expect(page.getByText('Total de unidades funcionales: 1')).toBeVisible()

    // 1-4: modificar, esperar autosave, reload -> la modificación permanece.
    await page.getByRole('button', { name: '+ Agregar unidad funcional' }).first().click()
    await estabilizar(page)
    await expect(page.getByText('Total de unidades funcionales: 2')).toBeVisible()
    await esperarAutosave(page)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await irA(page, /Demanda/)
    await expect(page.getByText('Total de unidades funcionales: 2')).toBeVisible()

    // 5-6: Nuevo proyecto -> Cancelar -> sigue modificado (2 UF).
    await page.getByRole('button', { name: 'Nuevo proyecto', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click()
    await estabilizar(page)
    await expect(page.getByText('Total de unidades funcionales: 2')).toBeVisible()

    // 7-8: Nuevo proyecto -> Confirmar -> proyecto vacío (crearProyectoVacio()).
    await page.getByRole('button', { name: 'Nuevo proyecto', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Crear nuevo proyecto', exact: true }).click()
    await estabilizar(page)
    await expect(page.getByText('Total de unidades funcionales: 0')).toBeVisible()
    await expect(page.getByText(/Proyecto vac[ií]o/)).toBeVisible()

    // 9: reload -> sigue vacío.
    await esperarAutosave(page)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await irA(page, /Demanda/)
    await expect(page.getByText('Total de unidades funcionales: 0')).toBeVisible()
    await expect(page.getByText(/Proyecto vac[ií]o/)).toBeVisible()

    // 10-11: Cargar proyecto de ejemplo -> Cancelar -> sigue vacío.
    await page.getByRole('button', { name: 'Cargar proyecto de ejemplo', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Cancelar', exact: true }).click()
    await estabilizar(page)
    await expect(page.getByText('Total de unidades funcionales: 0')).toBeVisible()
    await expect(page.getByText(/Proyecto vac[ií]o/)).toBeVisible()

    // 12-13: volver a cargar ejemplo -> Confirmar -> aparece el demo.
    await page.getByRole('button', { name: 'Cargar proyecto de ejemplo', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Cargar ejemplo', exact: true }).click()
    await estabilizar(page)
    await expect(page.getByText('Total de unidades funcionales: 1')).toBeVisible()
    await expect(page.locator('.m1-local')).toHaveCount(5)
    await expect(page.getByText(/Proyecto vac[ií]o/)).toHaveCount(0)

    // 14: reload -> sigue el demo.
    await esperarAutosave(page)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await irA(page, /Demanda/)
    await expect(page.getByText('Total de unidades funcionales: 1')).toBeVisible()
    await expect(page.locator('.m1-local')).toHaveCount(5)

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })
})
