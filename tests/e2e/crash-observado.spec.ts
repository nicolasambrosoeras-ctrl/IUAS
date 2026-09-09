// QA-FUZZ-01 · escenarios de alta prioridad construidos a mano (brief §26).
// Reproducen SIN asumir causa las secuencias sospechosas de provocar las
// pantallas blancas observadas en uso real de v0.4.0-beta.5.
//
// Estos tests NO corrigen nada (brief §39). Si uno reproduce el crash:
//   - queda rojo (evidencia), se preserva artifact + trace + screenshot,
//   - se registra la deuda FIX-CRASH-01,
//   - la corrida QA-FUZZ-01 igualmente cierra como exitosa (brief §61).
import { test, expect } from './qa/fixtures'
import { cargarAppLimpia, estabilizar } from './qa/estado'
import { verificarInvariantes, primerFallo } from './qa/invariantes'
import type { Page } from '@playwright/test'

async function irA(page: Page, nombre: RegExp): Promise<void> {
  await page.getByRole('link', { name: nombre }).first().click()
  await estabilizar(page)
}

async function agregarArtefactoEnLocalNuevo(page: Page, artefactoId: string): Promise<boolean> {
  await irA(page, /Demanda/)
  await page.getByRole('button', { name: '+ Agregar local' }).first().click()
  await estabilizar(page)
  const local = page.locator('.m1-local').last()
  // Local "otros": sin sugerencia contextual -> borrador siempre visible
  // -> el alta del tipo elegido dispara la pregunta de conectividad.
  await local.getByLabel(/^Tipo:/).selectOption('otros')
  await estabilizar(page)
  await local.getByRole('button', { name: '+ Agregar artefacto' }).click()
  await estabilizar(page)
  const borrador = local.getByRole('combobox', { name: 'Seleccionar artefacto para agregar' })
  if (await borrador.isVisible().catch(() => false)) {
    await borrador.selectOption(artefactoId)
  } else {
    await local.getByRole('combobox', { name: 'Artefacto', exact: true }).last().selectOption(artefactoId)
  }
  await estabilizar(page)
  return local.locator('.m1-declaracion[role="alert"]').isVisible().catch(() => false)
}

async function responderConectividadSiHay(page: Page, nombre: string): Promise<void> {
  const banner = page.locator('.m1-declaracion[role="alert"]').last()
  if (await banner.isVisible().catch(() => false)) {
    await banner.getByRole('button', { name: nombre }).click()
    await estabilizar(page)
  }
}

async function iniciarM3ConfigurarACS(page: Page, ph: boolean, acs: 'individual' | 'central'): Promise<void> {
  await irA(page, /Medidores/)
  const iniciar = page.getByRole('button', { name: 'Iniciar Módulo 3' })
  if (await iniciar.isVisible().catch(() => false)) {
    await iniciar.click()
    await estabilizar(page)
  }
  const chk = page.getByRole('checkbox', { name: /Propiedad horizontal/ })
  if ((await chk.isChecked()) !== ph) {
    await chk.click()
    await estabilizar(page)
  }
  const sel = page.getByLabel('Provisión de agua caliente (por defecto):')
  if (await sel.isVisible().catch(() => false)) {
    await sel.selectOption(acs)
    await estabilizar(page)
  }
}

async function sinViolaciones(page: Page, errores: Parameters<typeof verificarInvariantes>[1]): Promise<void> {
  const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
  const fallo = primerFallo(violaciones)
  expect(fallo, fallo ? `CRASH REPRODUCIDO → FIX-CRASH-01: ${JSON.stringify(fallo)}` : undefined).toBeNull()
}

test.describe('QA-FUZZ-01 · escenarios observados (captura, no corrige)', () => {
  test('Escenario A · Bañera AF+AC → M3 PH + ACS central ↔ individual', async ({ page, errores, baseURLEfectiva }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await agregarArtefactoEnLocalNuevo(page, 'banera')
    await responderConectividadSiHay(page, 'Agua fría y caliente (AF + AC)')
    await sinViolaciones(page, errores)

    await iniciarM3ConfigurarACS(page, true, 'central')
    await sinViolaciones(page, errores)

    const sel = page.getByLabel('Provisión de agua caliente (por defecto):')
    for (const v of ['individual', 'central', 'individual', 'central'] as const) {
      if (await sel.isVisible().catch(() => false)) {
        await sel.selectOption(v)
        await estabilizar(page)
        await sinViolaciones(page, errores)
      }
    }
  })

  test('Escenario B · varios artefactos con conectividad + duplicar UF + M3 central', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    for (const [id, red] of [
      ['banera', 'Agua fría y caliente (AF + AC)'],
      ['lavatorio', 'Agua fría y caliente (AF + AC)'],
      ['inodoroDeposito', 'Agua fría (AF)'],
    ] as const) {
      await agregarArtefactoEnLocalNuevo(page, id)
      await responderConectividadSiHay(page, red)
      await sinViolaciones(page, errores)
    }

    await irA(page, /Demanda/)
    await page.getByRole('button', { name: 'Duplicar' }).first().click()
    await estabilizar(page)
    await sinViolaciones(page, errores)

    await iniciarM3ConfigurarACS(page, true, 'central')
    await sinViolaciones(page, errores)
  })

  test('Escenario C · AF → AC → AF+AC en distintos artefactos, luego M3 central', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    for (const [id, red] of [
      ['inodoroDeposito', 'Agua fría (AF)'],
      ['bidet', 'Agua caliente (AC)'],
      ['banera', 'Agua fría y caliente (AF + AC)'],
    ] as const) {
      await agregarArtefactoEnLocalNuevo(page, id)
      await responderConectividadSiHay(page, red)
      await sinViolaciones(page, errores)
    }

    await iniciarM3ConfigurarACS(page, true, 'central')
    await sinViolaciones(page, errores)
    await irA(page, /Verificaci[oó]n/)
    await sinViolaciones(page, errores)
  })
})
