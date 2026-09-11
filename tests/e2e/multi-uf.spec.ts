// UI-M2-GROUP-01 §40/§41 -- jerarquía progresiva de Unidades Funcionales en
// Módulo 2 (Tuberías): con >1 UF aparecen headers colapsables, una sola UF
// activa por vez, el contenido de las demás no está montado, y agregar/
// duplicar una UF la deja activa. Interactúa como usuario real (clicks),
// nunca simula estado de UI por otros medios.
import { test, expect } from './qa/fixtures'
import { cargarAppLimpia, estabilizar } from './qa/estado'
import { verificarInvariantes, primerFallo } from './qa/invariantes'
import type { Page } from '@playwright/test'

async function irADemanda(page: Page): Promise<void> {
  await page.getByRole('link', { name: /Demanda/ }).first().click()
  await estabilizar(page)
}

async function irATuberias(page: Page): Promise<void> {
  await page.getByRole('link', { name: /Tuber[ií]as/ }).first().click()
  await estabilizar(page)
}

function listaUf(page: Page) {
  return page.locator('#tuberias section.lista-uf')
}

test.describe('UI-M2-GROUP-01 §40 · agrupación progresiva de Unidades Funcionales en Tuberías', () => {
  test('1 UF: sin acordeón -- Tuberías se ve igual que antes', async ({ page, errores, baseURLEfectiva }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irATuberias(page)
    await expect(listaUf(page)).toHaveCount(0)
    await expect(page.locator('#tuberias').getByRole('heading', { name: 'Unidad funcional 1 · PB' })).toBeVisible()

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('duplicar la UF: aparece el acordeón, la UF nueva queda activa y la original colapsada', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irADemanda(page)
    await page.getByRole('button', { name: 'Duplicar' }).first().click()
    await estabilizar(page)

    await irATuberias(page)
    const lista = listaUf(page)
    await expect(lista).toHaveCount(1)
    const headers = lista.locator('.lista-uf__cabecera')
    await expect(headers).toHaveCount(2)

    // Duplicar nombra la copia "Unidad funcional 1 (copia)" (duplicarUnidadFuncional.ts)
    // -- es la UF NUEVA y debe quedar activa; la original ("Unidad funcional 1", sin
    // "(copia)") queda colapsada. Se distingue por ausencia/presencia de "(copia)"
    // en el texto del header (la copia también contiene "Unidad funcional 1" como
    // substring, así que filtrar sólo por ese texto sería ambiguo).
    const headerOriginal = headers.filter({ hasNotText: "(copia)" })
    const headerCopia = headers.filter({ hasText: 'Unidad funcional 1 (copia)' })
    await expect(headerCopia).toHaveAttribute('aria-expanded', 'true')
    await expect(headerOriginal).toHaveAttribute('aria-expanded', 'false')

    // Sólo la UF activa (la copia) tiene su heading + tabla montados dentro del acordeón.
    await expect(lista.getByRole('heading', { name: /Unidad funcional 1 \(copia\)/ })).toBeVisible()
    await expect(lista.locator("h3", { hasNotText: "(copia)" })).toHaveCount(0)

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('abrir la otra UF: el contenido activo se desmonta y el nuevo se monta; una edición en la UF1 persiste al volver', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irADemanda(page)
    await page.getByRole('button', { name: 'Duplicar' }).first().click()
    await estabilizar(page)
    await irATuberias(page)

    const lista = listaUf(page)
    const headers = lista.locator('.lista-uf__cabecera')
    // Ver comentario del test anterior: distinguir la UF original de su copia.
    const headerOriginal = headers.filter({ hasNotText: "(copia)" })
    const headerCopia = headers.filter({ hasText: 'Unidad funcional 1 (copia)' })

    // Abrir la UF original (colapsada por defecto: la copia nace activa).
    await headerOriginal.click()
    await estabilizar(page)
    await expect(headerOriginal).toHaveAttribute('aria-expanded', 'true')
    await expect(headerCopia).toHaveAttribute('aria-expanded', 'false')
    await expect(lista.locator("h3", { hasNotText: "(copia)" })).toBeVisible()
    await expect(lista.getByRole('heading', { name: /Unidad funcional 1 \(copia\)/ })).toHaveCount(0)

    // Editar una longitud dentro de la UF original activa.
    const inputLongitud = lista.getByLabel(/Longitud \[m\] de Baño 1 Agua fría/).first()
    await inputLongitud.fill('7')
    await estabilizar(page)
    await expect(inputLongitud).toHaveValue('7')

    // Volver a la copia -- la UF original (con la edición) se desmonta.
    await headerCopia.click()
    await estabilizar(page)
    await expect(lista.locator("h3", { hasNotText: "(copia)" })).toHaveCount(0)

    // Volver a abrir la UF original: la edición persiste (vive en Proyecto, no en el DOM).
    await headerOriginal.click()
    await estabilizar(page)
    await expect(lista.getByLabel(/Longitud \[m\] de Baño 1 Agua fría/).first()).toHaveValue('7')

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('eliminar la UF activa: otra UF queda activa determinísticamente (§32)', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irADemanda(page)
    await page.getByRole('button', { name: 'Duplicar' }).first().click()
    await estabilizar(page)
    // UF 2 (duplicada) es la activa. Eliminarla desde Demanda.
    const ufs = page.locator('.m1-uf')
    await expect(ufs).toHaveCount(2)
    await ufs.nth(1).getByRole('button', { name: 'Eliminar unidad funcional' }).click()
    await estabilizar(page)

    await irATuberias(page)
    // Vuelve a haber 1 sola UF -> sin acordeón (§31, transición 2 UF -> 1 UF).
    await expect(listaUf(page)).toHaveCount(0)
    await expect(page.locator('#tuberias').getByRole('heading', { name: /Unidad funcional 1/ })).toBeVisible()

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })
})

test.describe('UI-M2-GROUP-02 §1 · 0 o 1 UF abierta (toggle real)', () => {
  test('click en la UF ya abierta la cierra: todas quedan condensadas, sin contenido pesado montado', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irADemanda(page)
    await page.getByRole('button', { name: 'Duplicar' }).first().click()
    await estabilizar(page)
    await irATuberias(page)

    const lista = listaUf(page)
    const headers = lista.locator('.lista-uf__cabecera')
    const headerCopia = headers.filter({ hasText: 'Unidad funcional 1 (copia)' })

    // La copia nace activa (aria-expanded=true) -- clickearla la cierra.
    await expect(headerCopia).toHaveAttribute('aria-expanded', 'true')
    await headerCopia.click()
    await estabilizar(page)

    await expect(lista.locator('[aria-expanded="false"]')).toHaveCount(2)
    await expect(lista.locator('[aria-expanded="true"]')).toHaveCount(0)
    // Ninguna UF tiene su heading/tabla montados -- unmount real también en
    // el estado "ninguna abierta", no sólo al cambiar de UF activa.
    await expect(lista.getByRole('heading', { name: /^Unidad funcional/ })).toHaveCount(0)
    await expect(lista.locator('.tabla-tecnica')).toHaveCount(0)

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('con todas condensadas, abrir una UF la muestra sola (0 -> 1, nunca 2 montadas)', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irADemanda(page)
    await page.getByRole('button', { name: 'Duplicar' }).first().click()
    await estabilizar(page)
    await irATuberias(page)

    const lista = listaUf(page)
    const headers = lista.locator('.lista-uf__cabecera')
    const headerOriginal = headers.filter({ hasNotText: '(copia)' })
    const headerCopia = headers.filter({ hasText: 'Unidad funcional 1 (copia)' })

    // Condensar todo primero.
    await headerCopia.click()
    await estabilizar(page)
    await expect(lista.locator('[aria-expanded="false"]')).toHaveCount(2)

    // Abrir la original desde el estado "0 abiertas".
    await headerOriginal.click()
    await estabilizar(page)
    await expect(headerOriginal).toHaveAttribute('aria-expanded', 'true')
    await expect(headerCopia).toHaveAttribute('aria-expanded', 'false')
    await expect(lista.getByRole('heading', { name: /^Unidad funcional/ })).toHaveCount(1)

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })
})

test.describe('UI-M2-GROUP-01 §41 · escala ~30 UF en Tuberías', () => {
  test('30 UF: sólo una desarrollada, el resto sólo headers, agregar UF dispara la última activa', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    test.setTimeout(120_000)
    await cargarAppLimpia(page, baseURLEfectiva)
    await irADemanda(page)
    for (let i = 0; i < 29; i += 1) {
      await page.getByRole('button', { name: 'Duplicar' }).first().click()
      await estabilizar(page)
    }
    await expect(page.locator('.m1-uf')).toHaveCount(30)

    await irATuberias(page)
    const lista = listaUf(page)
    await expect(lista.locator('.lista-uf__cabecera')).toHaveCount(30)
    // Sólo un heading de UF montado (el de la UF activa) dentro del acordeón.
    await expect(lista.getByRole('heading', { name: /^Unidad funcional \d+/ })).toHaveCount(1)

    let violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()

    // Agregar una UF (vacía) -- pasa a ser la única activa/montada.
    await irADemanda(page)
    await page.getByRole('button', { name: '+ Agregar unidad funcional' }).click()
    await estabilizar(page)
    await irATuberias(page)
    await expect(lista.locator('.lista-uf__cabecera')).toHaveCount(31)
    await expect(lista.getByRole('heading', { name: /Unidad funcional 31/ })).toBeVisible()
    await expect(lista.getByRole('heading', { name: /^Unidad funcional \d+/ })).toHaveCount(1)

    violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })
})
