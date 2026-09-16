// GEOM-UX-01 §13-§17 — "Nuevo proyecto" (antes "Reiniciar cálculo",
// renombrado en FIX-PERSIST-01-NUEVO-PROYECTO-01 -- comportamiento sin
// cambios): desde el proyecto de ejemplo con M1/M3/M4 tocados y estados
// de UI abiertos, la acción debe dejar un proyecto VACÍO real (no el
// demo), con la app sana en la etapa Demanda. También: Cancelar conserva
// el proyecto y el autosave intactos, y Confirmar sobrevive a un refresh
// (PERSIST-01 §27-§33: el autosave se actualiza solo).
import { test, expect } from './qa/fixtures'
import { cargarAppLimpia, estabilizar } from './qa/estado'
import { verificarInvariantes, primerFallo } from './qa/invariantes'
import type { Page } from '@playwright/test'

async function irA(page: Page, nombre: RegExp): Promise<void> {
  await page.getByRole('link', { name: nombre }).first().click()
  await estabilizar(page)
}

test.describe('GEOM-UX-01 · Nuevo proyecto', () => {
  test('deja un proyecto vacío real (no el demo), la app sana en Demanda, y sobrevive a un refresh', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)

    // El demo trae entidades reconocibles.
    await irA(page, /Demanda/)
    await expect(page.getByText('Total de unidades funcionales: 1')).toBeVisible()

    // --- Modificar M1: agregar una unidad funcional ---
    await page.getByRole('button', { name: '+ Agregar unidad funcional' }).first().click()
    await estabilizar(page)

    // --- Iniciar / configurar M3 ---
    await irA(page, /Medidores/)
    const iniciarM3 = page.getByRole('button', { name: 'Iniciar Módulo 3' })
    if (await iniciarM3.isVisible().catch(() => false)) {
      await iniciarM3.click()
      await estabilizar(page)
    }

    // --- Modificar M4: elegir un esquema con tanque ---
    await irA(page, /Abastecimiento/)
    const tanque = page.getByRole('button', { name: 'Tanque elevado', exact: true })
    if (await tanque.isVisible().catch(() => false)) {
      await tanque.click()
      await estabilizar(page)
    }

    // --- Abrir algún estado transitorio de UI en M2 ---
    await irA(page, /Tuber[ií]as/)
    const primerResumen = page.locator('.tabla-tecnica details > summary').first()
    if (await primerResumen.isVisible().catch(() => false)) {
      await primerResumen.click()
      await estabilizar(page)
    }

    // --- Nuevo proyecto (con confirmación) ---
    await page.getByRole('button', { name: 'Nuevo proyecto', exact: true }).click()
    const dialogo = page.getByRole('dialog')
    await expect(dialogo).toBeVisible()
    await expect(dialogo.getByRole('heading', { name: 'Nuevo proyecto' })).toBeVisible()
    await expect(dialogo.getByText(/reemplazará el proyecto actual/)).toBeVisible()
    await dialogo.getByRole('button', { name: 'Crear nuevo proyecto', exact: true }).click()
    await estabilizar(page)

    // --- Proyecto vacío real ---
    await expect(page.getByText('Total de unidades funcionales: 0')).toBeVisible()
    await expect(page.getByText(/Proyecto vac[ií]o/)).toBeVisible()
    // El demo desapareció por completo.
    await expect(page.getByText(/Total de unidades funcionales: [1-9]/)).toHaveCount(0)
    await expect(page.getByText('Unidad funcional 1')).toHaveCount(0)

    // Módulos posteriores sin datos físicos del demo: sus secciones no se
    // renderizan con un proyecto vacío (M2/M3/M4 sin iniciar).
    await expect(page.locator('#medidores')).toHaveCount(0)
    await expect(page.locator('#abastecimiento')).toHaveCount(0)

    // App viva, etapa Demanda presente, CTA claro.
    await expect(page.getByRole('heading', { name: /Caudal/ }).first()).toBeVisible()
    await expect(page.locator('#demanda')).toBeVisible()
    await expect(page.getByRole('button', { name: '+ Agregar unidad funcional' }).first()).toBeVisible()

    // Sin pageerror / console.error / ids viejos / códigos técnicos / overflow.
    const violaciones = await verificarInvariantes(page, errores)
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()

    // PERSIST-01: el autosave se actualiza solo -- un refresh sigue
    // mostrando el proyecto vacío recién creado, no el demo.
    await page.waitForTimeout(700)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await irA(page, /Demanda/)
    await expect(page.getByText('Total de unidades funcionales: 0')).toBeVisible()
    await expect(page.getByText(/Proyecto vac[ií]o/)).toBeVisible()
  })

  test('Nuevo proyecto → Cancelar conserva el proyecto y el autosave intactos', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irA(page, /Demanda/)
    await expect(page.getByText('Total de unidades funcionales: 1')).toBeVisible()

    // Modificar el proyecto ANTES de cancelar, para que exista un autosave
    // real que "Cancelar" pueda (o no) tocar -- si no se edita nada, el
    // autosave nunca se escribió y la comprobación de "intacto" sería
    // trivial por falta de estado, no por el comportamiento de Cancelar.
    await page.getByRole('button', { name: '+ Agregar unidad funcional' }).first().click()
    await estabilizar(page)
    await expect(page.getByText('Total de unidades funcionales: 2')).toBeVisible()
    await page.waitForTimeout(700)

    await page.getByRole('button', { name: 'Nuevo proyecto', exact: true }).click()
    const dialogo = page.getByRole('dialog')
    await expect(dialogo).toBeVisible()
    await dialogo.getByRole('button', { name: 'Cancelar', exact: true }).click()
    await estabilizar(page)

    await expect(page.getByRole('dialog')).toHaveCount(0)
    // El proyecto editado sigue intacto -- Cancelar no lo tocó.
    await expect(page.getByText('Total de unidades funcionales: 2')).toBeVisible()
    await expect(page.getByText(/Proyecto vac[ií]o/)).toHaveCount(0)

    // El autosave tampoco se tocó: un refresh sigue mostrando el proyecto
    // editado (2 UF), no el demo original ni un proyecto vacío.
    await page.reload({ waitUntil: 'domcontentloaded' })
    await irA(page, /Demanda/)
    await expect(page.getByText('Total de unidades funcionales: 2')).toBeVisible()
    await expect(page.getByText(/Proyecto vac[ií]o/)).toHaveCount(0)

    const violaciones = await verificarInvariantes(page, errores)
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })
})
