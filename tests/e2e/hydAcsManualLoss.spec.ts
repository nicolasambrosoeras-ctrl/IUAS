// HYD-ACS-MANUAL-LOSS-01 (D-δ.129) — E2E dirigido: el proyectista puede
// informar manualmente la pérdida de carga propia del equipo de producción
// de ACS (dato del fabricante) junto a "Alimentación ACS" en M2 →
// Distribución general, y ese dato participa del balance de presión de
// cada camino AC (una única vez), nunca de los caminos AF. Ausente != cero.
import { test, expect } from './qa/fixtures'
import { cargarAppLimpia, estabilizar } from './qa/estado'
import { verificarInvariantes, primerFallo } from './qa/invariantes'
import type { Page } from '@playwright/test'

async function irATuberias(page: Page): Promise<void> {
  await page.getByRole('link', { name: /Tuber[ií]as/ }).first().click()
  await estabilizar(page)
}

async function irAVerificacion(page: Page): Promise<void> {
  await page.getByRole('link', { name: /Verificaci[oó]n/ }).first().click()
  await estabilizar(page)
}

function inputHfEquipoACS(page: Page) {
  return page.getByLabel('Pérdida de carga del equipo ACS [m.c.a.]')
}

// formatearNumero (es-AR) usa U+2212 (signo menos tipográfico) para
// negativos, no el guion ASCII -- Number() sólo reconoce este último.
function numeroDeTexto(texto: string): number {
  return Number(texto.replace(/−/g, '-').replace(',', '.'))
}

// El autosave tiene debounce (~500ms, mismo criterio que persistencia.spec.ts)
// -- esperar a que el guardado realmente ocurra antes de recargar.
async function esperarAutosave(page: Page): Promise<void> {
  await page.waitForTimeout(700)
}

// "Ver todos los terminales (N)" es un <summary> nativo (no <button>) --
// hacer click por su texto, sin depender del role implícito.
async function abrirTodosLosTerminales(page: Page): Promise<void> {
  await page.locator('summary', { hasText: 'Ver todos los terminales' }).click()
  await estabilizar(page)
}

// Tabla "Ver todos los terminales" (TablaDeTerminales.tsx), acotada al
// <details> que la contiene -- la app es SPA de una sola página: "Agua
// caliente"/"Agua fría" también aparecen como texto en las filas de
// Tuberías (Longitud por Local+red), así que un locator de página entera
// ambiguaría con la fila equivocada.
function tablaDeTodosLosTerminales(page: Page) {
  return page.locator('details', { has: page.locator('summary', { hasText: 'Ver todos los terminales' }) })
}

// Setup mínimo compartido con hydAcsDisclosure.spec.ts: lleva el proyecto de
// ejemplo hasta el veredicto CUMPLE/NO CUMPLE de M2.
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

test.describe('HYD-ACS-MANUAL-LOSS-01 · pérdida manual del equipo ACS', () => {
  test('Caso A — ausente: input vacío, disclosure de exclusión visible', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irATuberias(page)

    const input = inputHfEquipoACS(page)
    await expect(input).toBeVisible()
    await expect(input).toHaveValue('')

    await llegarAlVeredictoDeVerificacion(page)
    const veredicto = page.locator('#verificacion-hidraulica .ui-card--resultado')
    await expect(veredicto.locator('.ui-callout--info', { hasText: 'hfEquipoACS' })).toContainText(
      'no incluye automáticamente',
    )

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('Caso B/C — informar 2.5: cambia el balance de caminos AC, deja los AF intactos, disclosure de exclusión desaparece', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    // Orden deliberado: primero se llega al veredicto SIN informar el dato
    // (para leer el margen "antes" de cada red), y recién con eso ya leído
    // se informa el dato y se vuelve a comparar -- nunca se reedita
    // Tuberías (árbol memoizado con React.memo, sonPropsDeDimensionamientoEquivalentes)
    // después de tocar Módulo 3/4/Verificación en el MISMO paso, para no
    // reproducir el closure obsoleto que documenta ese comparador (issue
    // preexistente, ajeno a este slice -- afecta cualquier input de
    // Tuberías, no sólo hfEquipoACS).
    await cargarAppLimpia(page, baseURLEfectiva)
    await llegarAlVeredictoDeVerificacion(page)

    // Margen de un terminal AF antes de informar el dato (tabla "Ver todos
    // los terminales").
    await abrirTodosLosTerminales(page)
    const filaAfAntes = tablaDeTodosLosTerminales(page).locator('tr', { hasText: 'Agua fría' }).first()
    await expect(filaAfAntes).toBeVisible()
    const margenAfAntes = (await filaAfAntes.locator('td').nth(5).innerText()).trim()
    const filaAcAntes = tablaDeTodosLosTerminales(page).locator('tr', { hasText: 'Agua caliente' }).first()
    await expect(filaAcAntes).toBeVisible()
    const margenAcAntesTexto = (await filaAcAntes.locator('td').nth(5).innerText()).trim()
    const margenAcAntes = numeroDeTexto(margenAcAntesTexto)

    // Recarga limpia + re-llega al veredicto para que la ÚLTIMA edición
    // sea la de Tuberías (hfEquipoACS), nunca una posterior a M3/M4.
    await esperarAutosave(page)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await estabilizar(page)
    await irATuberias(page)
    await inputHfEquipoACS(page).fill('2.5')
    await expect(inputHfEquipoACS(page)).toHaveValue('2.5')

    await irAVerificacion(page)
    const veredicto = page.locator('#verificacion-hidraulica .ui-card--resultado')
    // El warning de exclusión desaparece; se refleja el valor incluido.
    await expect(veredicto).not.toContainText('no incluye automáticamente')
    await expect(veredicto).toContainText('2,500 m.c.a.')

    await abrirTodosLosTerminales(page)
    const filaAfDespues = tablaDeTodosLosTerminales(page).locator('tr', { hasText: 'Agua fría' }).first()
    const margenAfDespues = (await filaAfDespues.locator('td').nth(5).innerText()).trim()
    // AF nunca recibe la pérdida del equipo ACS: margen idéntico.
    expect(margenAfDespues).toBe(margenAfAntes)

    const filaAcDespues = tablaDeTodosLosTerminales(page).locator('tr', { hasText: 'Agua caliente' }).first()
    const margenAcDespuesTexto = (await filaAcDespues.locator('td').nth(5).innerText()).trim()
    const margenAcDespues = numeroDeTexto(margenAcDespuesTexto)
    // AC pierde exactamente 2,5 m.c.a. de margen.
    expect(margenAcAntes - margenAcDespues).toBeCloseTo(2.5, 2)

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('Caso D — borrar el dato: vuelve el disclosure de exclusión, y persiste tras refresh', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irATuberias(page)
    await inputHfEquipoACS(page).fill('2.5')
    await expect(inputHfEquipoACS(page)).toHaveValue('2.5')
    await inputHfEquipoACS(page).fill('')
    await expect(inputHfEquipoACS(page)).toHaveValue('')

    await llegarAlVeredictoDeVerificacion(page)
    const veredicto = page.locator('#verificacion-hidraulica .ui-card--resultado')
    await expect(veredicto.locator('.ui-callout--info', { hasText: 'hfEquipoACS' })).toContainText(
      'no incluye automáticamente',
    )

    await esperarAutosave(page)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await estabilizar(page)
    await irATuberias(page)
    await expect(inputHfEquipoACS(page)).toHaveValue('')

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('Caso E — 0 explícito: queda informado (nunca "no informado"), y persiste como 0 tras refresh', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irATuberias(page)
    await inputHfEquipoACS(page).fill('0')
    await expect(inputHfEquipoACS(page)).toHaveValue('0')

    await llegarAlVeredictoDeVerificacion(page)
    const veredicto = page.locator('#verificacion-hidraulica .ui-card--resultado')
    await expect(veredicto).not.toContainText('no incluye automáticamente')
    await expect(veredicto).toContainText('0,000 m.c.a.')

    await esperarAutosave(page)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await estabilizar(page)
    await irATuberias(page)
    await expect(inputHfEquipoACS(page)).toHaveValue('0')

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('valor positivo persiste tras refresh (2.5)', async ({ page, errores, baseURLEfectiva }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irATuberias(page)
    await inputHfEquipoACS(page).fill('2.5')
    await expect(inputHfEquipoACS(page)).toHaveValue('2.5')

    await esperarAutosave(page)
    await page.reload({ waitUntil: 'domcontentloaded' })
    await estabilizar(page)
    await irATuberias(page)
    await expect(inputHfEquipoACS(page)).toHaveValue('2.5')

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('negativo: el input lo rechaza, nunca llega al modelo (sigue vacío/sin informar)', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irATuberias(page)
    await inputHfEquipoACS(page).fill('-1')
    await estabilizar(page)

    await llegarAlVeredictoDeVerificacion(page)
    const veredicto = page.locator('#verificacion-hidraulica .ui-card--resultado')
    // Sigue mostrando el disclosure de "no informado": -1 nunca se adoptó.
    await expect(veredicto.locator('.ui-callout--info', { hasText: 'hfEquipoACS' })).toContainText(
      'no incluye automáticamente',
    )

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  for (const vp of [
    { nombre: '360x800 (mobile angosto)', width: 360, height: 800 },
    { nombre: '390x844 (mobile)', width: 390, height: 844 },
    { nombre: '1280x900 (desktop)', width: 1280, height: 900 },
  ] as const) {
    test(`responsive: input visible sin overflow @ ${vp.nombre}`, async ({
      page,
      errores,
      baseURLEfectiva,
    }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'viewport fijado en el test')
      await page.setViewportSize({ width: vp.width, height: vp.height })
      await cargarAppLimpia(page, baseURLEfectiva)
      await irATuberias(page)

      await expect(inputHfEquipoACS(page)).toBeVisible()

      const overflow = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(overflow, `documentElement overflow @ ${vp.nombre}`).toBeLessThanOrEqual(1)

      const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
      expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
    })
  }
})
