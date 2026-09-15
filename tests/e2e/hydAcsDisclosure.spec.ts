// HYD-ACS-DISCLOSURE-01 (D-δ.128) — E2E dirigido: la advertencia de
// hfEquipoACS es visible en el panel interactivo de Verificación
// hidráulica de M2, en el mismo contexto donde se muestra el veredicto
// CUMPLE/NO CUMPLE -- no sólo en el PDF de REPORT. No cambia ningún
// resultado hidráulico (Presidual, margen, terminal crítico): sólo agrega
// texto informativo.
import { test, expect } from './qa/fixtures'
import { cargarAppLimpia, estabilizar } from './qa/estado'
import { verificarInvariantes, primerFallo } from './qa/invariantes'
import type { Page } from '@playwright/test'

// Setup mínimo compartido: Abastecimiento (directa + presión sobre acera),
// Medidores (M3, si pide "Iniciar"), Verificación (cota del punto de
// alimentación) -- lleva al proyecto de ejemplo hasta el veredicto
// CUMPLE/NO CUMPLE de M2.
async function llegarAlVeredictoDeVerificacion(page: Page): Promise<void> {
  await page.getByRole('link', { name: /Abastecimiento/ }).first().click()
  await estabilizar(page)
  await page.getByRole('button', { name: 'Alimentación directa' }).click()
  await estabilizar(page)
  await page.getByLabel('Presión sobre acera [m]:').fill('20')
  await estabilizar(page)

  await page.getByRole('link', { name: /Medidores/ }).first().click()
  await estabilizar(page)
  const iniciarM3 = page.getByRole('button', { name: 'Iniciar Módulo 3' })
  if (await iniciarM3.isVisible().catch(() => false)) {
    await iniciarM3.click()
    await estabilizar(page)
  }

  await page.getByRole('link', { name: /Verificaci[oó]n/ }).first().click()
  await estabilizar(page)
  const cotaAlimentacion = page.getByLabel('Cota del punto de alimentación [m]:')
  if (await cotaAlimentacion.isVisible().catch(() => false)) {
    await cotaAlimentacion.fill('0')
    await estabilizar(page)
  }
}

test.describe('HYD-ACS-DISCLOSURE-01 · advertencia de hfEquipoACS en M2 interactivo', () => {
  test('proyecto de ejemplo -> Verificación hidráulica muestra el veredicto y la advertencia ACS', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await llegarAlVeredictoDeVerificacion(page)

    const veredicto = page.locator('#verificacion-hidraulica .ui-card--resultado')
    await expect(veredicto).toBeVisible()
    await expect(veredicto.locator('.ui-badge')).toBeVisible()

    const notaAcs = veredicto.locator('.ui-callout--info', { hasText: 'hfEquipoACS' })
    await expect(notaAcs).toBeVisible()
    await expect(notaAcs).toContainText('no incluye automáticamente')
    await expect(notaAcs).toContainText('equipo de agua caliente')

    // La nota no reemplaza ni oculta el veredicto ni el margen: siguen
    // visibles junto a ella.
    await expect(veredicto.getByText(/Margen/).first()).toBeVisible()

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('detalle del crítico ("Ver cálculo del crítico") repite la referencia breve a hfEquipoACS', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await llegarAlVeredictoDeVerificacion(page)

    const verCalculo = page.getByRole('button', { name: 'Ver cálculo del crítico' })
    if (await verCalculo.isVisible().catch(() => false)) {
      await verCalculo.click()
      await estabilizar(page)
      await expect(page.getByText('hfEquipoACS no incluido automáticamente en este balance.')).toBeVisible()
    }

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  // Responsive (brief §13): la nota debe wrappear sin overflow ni ocupar
  // una altura desproporcionada en mobile angosto ni en desktop.
  for (const vp of [
    { nombre: '360x800 (mobile angosto)', width: 360, height: 800 },
    { nombre: '390x844 (mobile)', width: 390, height: 844 },
    { nombre: '1280x900 (desktop)', width: 1280, height: 900 },
  ] as const) {
    test(`responsive: advertencia visible sin overflow @ ${vp.nombre}`, async ({
      page,
      errores,
      baseURLEfectiva,
    }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'viewport fijado en el test')
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await cargarAppLimpia(page, baseURLEfectiva)
      await llegarAlVeredictoDeVerificacion(page)

      const notaAcs = page.locator('#verificacion-hidraulica .ui-callout--info', { hasText: 'hfEquipoACS' })
      await expect(notaAcs).toBeVisible()

      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
      expect(overflow, `documentElement overflow @ ${vp.nombre}`).toBeLessThanOrEqual(1)

      const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
      expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
    })
  }
})
