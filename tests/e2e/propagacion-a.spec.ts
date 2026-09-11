// FIX-M2-A-PROP-01 — flujo real de UI: cambiar la Tipología de proyecto
// (coeficiente de simultaneidad `a`) debe actualizar Qc (Demanda, M1) Y el
// DN/V de la Alimentación general y de un montante (Tuberías, M2). Antes
// del fix, el comparador de React.memo de ese árbol no incluía
// `proyecto.parametros.tipoDeProyecto`, así que Qc cambiaba pero DN/V
// quedaban con el valor de antes de cambiar `a`. También cubre
// reversibilidad (a=2 -> a=1 vuelve al estado original, sin cache
// unidireccional).
import { test, expect } from './qa/fixtures'
import { cargarAppLimpia, estabilizar } from './qa/estado'
import { verificarInvariantes, primerFallo } from './qa/invariantes'
import type { Page } from '@playwright/test'

async function irATuberias(page: Page): Promise<void> {
  await page.getByRole('link', { name: /Tuber[ií]as/ }).first().click()
  await estabilizar(page)
}

function qcDeDemanda(page: Page) {
  return page
    .locator('.ui-card--resultado', { hasText: 'Caudal de cálculo · Qc' })
    .locator('.ui-metrica__valor')
}

function filaAlimentacionGeneral(page: Page) {
  return page.locator('tr', { hasText: 'Alimentación general' })
}

function celdaVelocidad(fila: ReturnType<typeof filaAlimentacionGeneral>) {
  return fila.locator('td.col-num .celda-velocidad span').first()
}

async function leerDnV(fila: ReturnType<typeof filaAlimentacionGeneral>): Promise<{ dn: string; v: string }> {
  const dn = (await fila.locator('td.col-dn').innerText()).trim()
  const v = (await celdaVelocidad(fila).innerText()).trim()
  return { dn, v }
}

test.describe('FIX-M2-A-PROP-01 · propagación de `a` (Tipología de proyecto) a M2', () => {
  test('cambiar `a` actualiza Qc y V/DN de la Alimentación general; volver a a=1 restaura el estado', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)

    const selectTipologia = page.getByLabel('Tipología de proyecto:')
    await expect(selectTipologia).toHaveValue('viviendaIndividual')

    const qcAntes = (await qcDeDemanda(page).innerText()).trim()

    await irATuberias(page)
    const filaGeneral = filaAlimentacionGeneral(page)
    await expect(filaGeneral).toBeVisible()
    const { dn: dnAntes, v: vAntes } = await leerDnV(filaGeneral)

    // --- a = 1 -> a = 2 ---
    await selectTipologia.selectOption({ label: 'Oficina pública — a = 2' })

    await expect(qcDeDemanda(page)).not.toHaveText(qcAntes)
    const qcDespues = (await qcDeDemanda(page).innerText()).trim()

    await irATuberias(page)
    // El bug reportado: Qc cambiaba pero V/DN quedaban stale. Con el fix,
    // al menos la velocidad SIEMPRE debe cambiar (Q cambió, Di real es el
    // mismo o mayor, V = Q/A nunca puede coincidir con el valor anterior).
    // expect(...).not.toHaveText reintenta hasta que React confirme el
    // commit -- una comparación de string suelta puede leer antes de tiempo.
    await expect(celdaVelocidad(filaAlimentacionGeneral(page))).not.toHaveText(vAntes)
    const { dn: dnDespues, v: vDespues } = await leerDnV(filaAlimentacionGeneral(page))
    void vDespues

    // --- reversibilidad: a = 2 -> a = 1 ---
    await selectTipologia.selectOption({ label: 'Vivienda individual — a = 1' })

    await expect(qcDeDemanda(page)).toHaveText(qcAntes)
    void qcDespues

    await irATuberias(page)
    await expect(celdaVelocidad(filaAlimentacionGeneral(page))).toHaveText(vAntes)
    const { dn: dnVuelta, v: vVuelta } = await leerDnV(filaAlimentacionGeneral(page))
    expect(vVuelta).toBe(vAntes)
    expect(dnVuelta).toBe(dnAntes)
    // dnDespues puede ser igual o distinto de dnAntes según si el nuevo Qc
    // cruzó un umbral comercial -- no se fuerza ninguna de las dos.
    void dnDespues

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('cambiar `a` también actualiza V de un montante con Locales asignados', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irATuberias(page)

    const seccionMontantes = page.locator('section.constructor-montantes')
    await seccionMontantes.getByRole('button', { name: '+ Agregar montante' }).click()
    await seccionMontantes
      .getByRole('group', { name: 'Red del montante nuevo' })
      .getByRole('button', { name: 'Agua fría', exact: true })
      .click()
    await estabilizar(page)

    const card = seccionMontantes.locator('.montante-card').first()
    await card.getByLabel('Agregar Local al Montante AF 1').selectOption({ label: 'Baño 1 · Unidad funcional 1' })
    await estabilizar(page)
    await card.getByLabel('Agregar Local al Montante AF 1').selectOption({ label: 'Cocina 1 · Unidad funcional 1' })
    await estabilizar(page)

    const filaSegmento = card.locator('tr', { hasText: 'Segmento 1' })
    await expect(filaSegmento).toBeVisible()
    const celdaVSegmento = filaSegmento.locator('td.col-num .celda-velocidad span').first()
    const vAntes = (await celdaVSegmento.innerText()).trim()

    const selectTipologia = page.getByLabel('Tipología de proyecto:')
    await selectTipologia.selectOption({ label: 'Oficina pública — a = 2' })
    await irATuberias(page)

    const filaSegmentoDespues = seccionMontantes.locator('.montante-card').first().locator('tr', { hasText: 'Segmento 1' })
    const celdaVSegmentoDespues = filaSegmentoDespues.locator('td.col-num .celda-velocidad span').first()
    // Auto-retry: espera al commit real de React en vez de comparar un
    // innerText() leído antes de tiempo.
    await expect(celdaVSegmentoDespues).not.toHaveText(vAntes)

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })
})
