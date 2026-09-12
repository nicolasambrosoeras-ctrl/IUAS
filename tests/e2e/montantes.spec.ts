// M2-TOPO-C §21-§22 — flujo real de UI del constructor de montantes:
// crear un montante eligiendo su red, agregarle Locales existentes, ver el
// recálculo de segmentos, comprobar la deduplicación (un Local ya asignado
// no se vuelve a ofrecer), quitar un Local, renombrar y borrar el montante.
// La app queda viva, la consola limpia y nunca se muestran ids técnicos.
import { test, expect } from './qa/fixtures'
import { cargarAppLimpia, estabilizar } from './qa/estado'
import { verificarInvariantes, primerFallo } from './qa/invariantes'
import type { Locator, Page } from '@playwright/test'

async function irATuberias(page: Page): Promise<void> {
  await page.getByRole('link', { name: /Tuber[ií]as/ }).first().click()
  await estabilizar(page)
}

function seccionMontantes(page: Page): Locator {
  return page.locator('section.constructor-montantes')
}

async function agregarMontante(page: Page, red: 'Agua fría' | 'Agua caliente'): Promise<void> {
  await seccionMontantes(page).getByRole('button', { name: '+ Agregar montante' }).click()
  await seccionMontantes(page)
    .getByRole('group', { name: 'Red del montante nuevo' })
    .getByRole('button', { name: red, exact: true })
    .click()
  await estabilizar(page)
}

// Locales listados bajo "Locales alimentados" de la card (no el <select>).
function localesServidos(card: Locator): Locator {
  return card.locator('.montante-card__locales li')
}

// Opciones de Local ofrecibles en la card indicada (sin el placeholder).
async function opcionesOfrecidas(card: Locator, nombreMontante: string): Promise<string[]> {
  const select = card.getByLabel(`Agregar Local al ${nombreMontante}`)
  if (!(await select.isVisible().catch(() => false))) return []
  const todas = await select.locator('option').allTextContents()
  return todas.filter((texto) => !texto.startsWith('—'))
}

test.describe('M2-TOPO-C · constructor de montantes', () => {
  test('crear AF, agregar/quitar Locales, dedup, recálculo, renombrar y borrar', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irATuberias(page)

    const seccion = seccionMontantes(page)
    await expect(seccion.getByRole('heading', { name: 'Montantes' })).toBeVisible()
    await expect(seccion.getByText('Todavía no hay montantes explícitos')).toBeVisible()

    // --- Crear un montante de agua fría ---
    await agregarMontante(page, 'Agua fría')
    const card = seccion.locator('.montante-card').first()
    await expect(card.getByText('Agua fría', { exact: true })).toBeVisible()
    await expect(card.getByText('Sin Locales asignados')).toBeVisible()
    await expect(card.getByText(/Todavía sin segmentos/)).toBeVisible()

    // --- Agregar el primer Local ---
    await card.getByLabel('Agregar Local al Montante AF 1').selectOption({ label: 'Baño 1 · Unidad funcional 1' })
    await estabilizar(page)
    await expect(localesServidos(card).filter({ hasText: 'Baño 1 · Unidad funcional 1' })).toHaveCount(1)
    // Recálculo inmediato: aparece la tabla de segmentos con al menos una fila.
    await expect(card.getByRole('heading', { name: 'Segmentos' })).toBeVisible()
    await expect(card.getByText('Segmento 1')).toBeVisible()

    // --- Agregar un segundo Local ---
    await card.getByLabel('Agregar Local al Montante AF 1').selectOption({ label: 'Cocina 1 · Unidad funcional 1' })
    await estabilizar(page)
    await expect(localesServidos(card).filter({ hasText: 'Cocina 1 · Unidad funcional 1' })).toHaveCount(1)

    // --- Deduplicación (§11): los Locales ya servidos no se vuelven a ofrecer ---
    const ofrecidas = await opcionesOfrecidas(card, 'Montante AF 1')
    expect(ofrecidas).not.toContain('Baño 1 · Unidad funcional 1')
    expect(ofrecidas).not.toContain('Cocina 1 · Unidad funcional 1')

    // --- Quitar un Local y volver a agregarlo ---
    await localesServidos(card)
      .filter({ hasText: 'Cocina 1 · Unidad funcional 1' })
      .getByRole('button', { name: 'Quitar' })
      .click()
    await estabilizar(page)
    await expect(localesServidos(card).filter({ hasText: 'Cocina 1 · Unidad funcional 1' })).toHaveCount(0)
    await card.getByLabel('Agregar Local al Montante AF 1').selectOption({ label: 'Cocina 1 · Unidad funcional 1' })
    await estabilizar(page)
    await expect(localesServidos(card).filter({ hasText: 'Cocina 1 · Unidad funcional 1' })).toHaveCount(1)

    // --- Renombrar ---
    const inputNombre = card.getByLabel('Nombre del Montante AF 1')
    await inputNombre.fill('Montante cocina y baño')
    await estabilizar(page)
    await expect(inputNombre).toHaveValue('Montante cocina y baño')

    // --- Eliminar el montante: conserva la app viva, la card desaparece ---
    await card.getByRole('button', { name: 'Eliminar montante' }).click()
    await estabilizar(page)
    await expect(seccion.locator('.montante-card')).toHaveCount(0)
    await expect(seccion.getByText('Todavía no hay montantes explícitos')).toBeVisible()

    // --- App viva, consola limpia, sin ids técnicos / overflow ---
    await expect(page.locator('#demanda')).toBeVisible()
    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('AF y AC son independientes: el mismo Local puede ir en un montante de cada red', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irATuberias(page)
    const seccion = seccionMontantes(page)

    await agregarMontante(page, 'Agua fría')
    const cardAF = seccion.locator('.montante-card').first()
    await cardAF.getByLabel('Agregar Local al Montante AF 1').selectOption({ label: 'Baño 1 · Unidad funcional 1' })
    await estabilizar(page)
    await expect(localesServidos(cardAF).filter({ hasText: 'Baño 1 · Unidad funcional 1' })).toHaveCount(1)

    await agregarMontante(page, 'Agua caliente')
    const cardAC = seccion.locator('.montante-card', { hasText: 'Agua caliente' }).first()
    // El Baño tiene conectividad AC en el demo -> se ofrece igual.
    const ofrecidasAC = await opcionesOfrecidas(cardAC, 'Montante AC 1')
    expect(ofrecidasAC).toContain('Baño 1 · Unidad funcional 1')
    await cardAC.getByLabel('Agregar Local al Montante AC 1').selectOption({ label: 'Baño 1 · Unidad funcional 1' })
    await estabilizar(page)
    await expect(localesServidos(cardAC).filter({ hasText: 'Baño 1 · Unidad funcional 1' })).toHaveCount(1)

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('la card de montante no desborda la página en viewports angostos (§25)', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irATuberias(page)
    const seccion = seccionMontantes(page)
    await agregarMontante(page, 'Agua fría')
    const card = seccion.locator('.montante-card').first()
    await card.getByLabel('Agregar Local al Montante AF 1').selectOption({ label: 'Baño 1 · Unidad funcional 1' })
    await estabilizar(page)

    for (const vp of [
      { width: 1280, height: 900 },
      { width: 390, height: 844 },
      { width: 360, height: 800 },
    ]) {
      await page.setViewportSize(vp)
      await estabilizar(page)
      await card.scrollIntoViewIfNeeded()
      const overflow = await page.evaluate(() => {
        const de = document.documentElement
        return de.scrollWidth - de.clientWidth
      })
      expect(overflow, `overflow @ ${vp.width}x${vp.height}`).toBeLessThanOrEqual(1)
    }

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  // M2-TOPO-D §41: en modo Detalladas, un montante con dos Locales tiene
  // una derivación 1->2 configurable; elegir tipo de entrada + continuación
  // recta funciona, la app sigue viva y no aparecen ids técnicos.
  test('M2-TOPO-D · configurar la tee de una derivación de montante (Detalladas)', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irATuberias(page)

    // Activar "Pérdidas localizadas: Detalladas".
    const resumen = page.getByText('Configuración avanzada', { exact: true }).first()
    if (await resumen.isVisible().catch(() => false)) {
      const detalle = resumen.locator('xpath=ancestor::details[1]')
      const abierto = await detalle.evaluate((el) => (el as HTMLDetailsElement).open).catch(() => true)
      if (!abierto) await resumen.click()
    }
    await page.getByLabel('Pérdidas localizadas:').selectOption('detallado')
    await estabilizar(page)

    const seccion = seccionMontantes(page)
    await agregarMontante(page, 'Agua fría')
    const card = seccion.locator('.montante-card').first()
    await card.getByLabel('Agregar Local al Montante AF 1').selectOption({ label: 'Baño 1 · Unidad funcional 1' })
    await estabilizar(page)
    await card.getByLabel('Agregar Local al Montante AF 1').selectOption({ label: 'Cocina 1 · Unidad funcional 1' })
    await estabilizar(page)

    // Aparece la sección Derivaciones con el editor de tee y el aviso de
    // que falta configurarla.
    const derivaciones = card.locator('.montante-card__derivaciones')
    await expect(derivaciones.getByRole('heading', { name: 'Derivaciones' })).toBeVisible()
    await expect(derivaciones.locator('fieldset.tee-editor')).toHaveCount(1)
    await expect(derivaciones.getByText('Falta definir la configuración de la derivación')).toBeVisible()

    // Elegir "entra por un extremo" -> aparece el grupo de continuación recta.
    await derivaciones.getByRole('radio', { name: /un extremo/ }).check()
    await estabilizar(page)
    await expect(derivaciones.getByText('Continúa recta hacia…')).toBeVisible()

    // Elegir una continuación recta -> el aviso de "falta definir" desaparece.
    await derivaciones.locator('.tee-editor__grupo').last().getByRole('radio').first().check()
    await estabilizar(page)
    await expect(derivaciones.getByText('Falta definir la configuración de la derivación')).toHaveCount(0)

    // Cambiar a "entra por el centro" -> ya no se pide la recta.
    await derivaciones.getByRole('radio', { name: /el centro/ }).check()
    await estabilizar(page)
    await expect(derivaciones.getByText('Continúa recta hacia…')).toHaveCount(0)

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  // UI-M2-GROUP-02 §1: 0 o 1 montante abierto -- click en el montante ya
  // abierto lo cierra (antes siempre quedaba uno abierto por fuerza).
  test('UI-M2-GROUP-02 · click en el montante ya abierto lo cierra: todos pueden quedar condensados', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irATuberias(page)
    const seccion = seccionMontantes(page)

    await agregarMontante(page, 'Agua fría')
    await agregarMontante(page, 'Agua caliente')
    const cabeceras = seccion.locator('.montante-card__cabecera-toggle')
    await expect(cabeceras).toHaveCount(2)

    // El montante recién creado (AC) nace activo.
    const cabeceraAC = seccion.locator('.montante-card', { hasText: 'Agua caliente' }).locator('.montante-card__cabecera-toggle')
    const cabeceraAF = seccion.locator('.montante-card', { hasText: 'Agua fría' }).locator('.montante-card__cabecera-toggle')
    await expect(cabeceraAC).toHaveAttribute('aria-expanded', 'true')

    // Clickearlo lo cierra -- ningún montante queda abierto.
    await cabeceraAC.click()
    await estabilizar(page)
    await expect(seccion.locator('[aria-expanded="true"]')).toHaveCount(0)
    await expect(seccion.locator('[aria-expanded="false"]')).toHaveCount(2)
    // Cuerpo pesado (Locales alimentados, Segmentos) fuera del DOM en ambos.
    await expect(seccion.locator('.montante-card__cuerpo')).toHaveCount(0)

    // Abrir el otro desde "0 abiertas": sólo ese queda montado.
    await cabeceraAF.click()
    await estabilizar(page)
    await expect(cabeceraAF).toHaveAttribute('aria-expanded', 'true')
    await expect(cabeceraAC).toHaveAttribute('aria-expanded', 'false')
    await expect(seccion.locator('.montante-card__cuerpo')).toHaveCount(1)

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  // M2-TOPO-E §8/§12/§34: tres Locales del ejemplo comparten cota (todos a
  // 0 m) -> el montante crea UNA derivación 1->3. En Detalladas NO se
  // ofrece un editor de tee 1->2 engañoso: se muestra la nota honesta y la
  // verificación de presión de esos Locales queda explícitamente
  // incompleta (nunca un 0 silencioso). La app sigue viva y sin ids.
  test('M2-TOPO-E · derivación múltiple 1->3: nota honesta en Detalladas, sin editor engañoso ni crash', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irATuberias(page)

    const resumen = page.getByText('Configuración avanzada', { exact: true }).first()
    if (await resumen.isVisible().catch(() => false)) {
      const detalle = resumen.locator('xpath=ancestor::details[1]')
      const abierto = await detalle.evaluate((el) => (el as HTMLDetailsElement).open).catch(() => true)
      if (!abierto) await resumen.click()
    }
    await page.getByLabel('Pérdidas localizadas:').selectOption('detallado')
    await estabilizar(page)

    const seccion = seccionMontantes(page)
    await agregarMontante(page, 'Agua fría')
    const card = seccion.locator('.montante-card').first()
    for (const label of ['Baño 1 · Unidad funcional 1', 'Cocina 1 · Unidad funcional 1', 'Lavadero 1 · Unidad funcional 1']) {
      await card.getByLabel('Agregar Local al Montante AF 1').selectOption({ label })
      await estabilizar(page)
    }

    const derivaciones = card.locator('.montante-card__derivaciones')
    await expect(derivaciones.getByRole('heading', { name: 'Derivaciones' })).toBeVisible()
    // 1->3: ningún editor de tee 1->2, sí la nota de limitación conocida.
    await expect(derivaciones.locator('fieldset.tee-editor')).toHaveCount(0)
    await expect(derivaciones.locator('.montante-card__derivacion-nota')).toContainText('derivación múltiple')
    await expect(derivaciones.locator('.montante-card__derivacion-nota')).toContainText('queda incompleta')

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })
})

// UI-M2-MONTANTE-COMPACT-01: compactación del cuerpo expandido del
// Montante. Header intacto (nombre/pill/resumen/toggle); dentro del
// cuerpo, Nombre queda en su propio bloque (ya no comparte fila con la
// acción destructiva), "Eliminar montante" (antes "Borrar montante") pasa
// al final -- después de Segmentos/Derivaciones -- y el selector de
// agregar Local sigue agregando directo al elegir (sin botón nuevo).
// Ningún cambio de reconciliación/cálculo: se reusan los mismos
// callbacks (agregarLocalAMontante/quitarLocalDeMontante/borrarMontante/
// conNombreDeMontante) sólo reordenados/renombrados en JSX.
test.describe('UI-M2-MONTANTE-COMPACT-01 · cuerpo compacto del Montante', () => {
  test('header intacto + cuerpo compacto: Nombre, Locales, Segmentos y "Eliminar montante" al final, sin overflow en mobile', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await cargarAppLimpia(page, baseURLEfectiva)
    await irATuberias(page)
    const seccion = seccionMontantes(page)
    await agregarMontante(page, 'Agua fría')
    const card = seccion.locator('.montante-card').first()

    // Header sigue igual: nombre, pill de red, resumen "N locales · M segmentos".
    const cabecera = card.locator('.montante-card__cabecera-toggle')
    await expect(cabecera).toContainText('Montante AF 1')
    await expect(cabecera).toContainText('Agua fría')
    await expect(cabecera).toContainText('locales')
    await expect(cabecera).toContainText('segmentos')
    await expect(cabecera).toHaveAttribute('aria-expanded', 'true')

    // Agregar dos Locales para tener Segmentos reales, no el mensaje vacío.
    await card.getByLabel('Agregar Local al Montante AF 1').selectOption({ label: 'Baño 1 · Unidad funcional 1' })
    await estabilizar(page)
    await card.getByLabel('Agregar Local al Montante AF 1').selectOption({ label: 'Cocina 1 · Unidad funcional 1' })
    await estabilizar(page)

    // Orden real en el DOM: Nombre -> Locales alimentados -> Segmentos -> Eliminar montante.
    const cuerpo = card.locator('.montante-card__cuerpo')
    const posiciones = await cuerpo.evaluate((el) => {
      const hijos = Array.from(el.children)
      const indiceDe = (predicado: (hijo: Element) => boolean) => hijos.findIndex(predicado)
      return {
        nombre: indiceDe((h) => h.querySelector('.montante-card__nombre') !== null),
        locales: indiceDe((h) => (h.textContent ?? '').includes('Locales alimentados')),
        eliminar: indiceDe((h) => h.classList.contains('montante-card__pie')),
        total: hijos.length,
      }
    })
    expect(posiciones.nombre).toBeGreaterThanOrEqual(0)
    expect(posiciones.locales).toBeGreaterThan(posiciones.nombre)
    expect(posiciones.eliminar).toBeGreaterThan(posiciones.locales)
    // "Eliminar montante" es el ÚLTIMO hijo directo del cuerpo.
    expect(posiciones.eliminar).toBe(posiciones.total - 1)

    // Copy y accesibilidad: botón real, texto "Eliminar montante".
    const btnEliminar = card.getByRole('button', { name: 'Eliminar montante' })
    await expect(btnEliminar).toBeVisible()
    await expect(btnEliminar).toBeEnabled()

    // El selector de agregar Local sigue agregando directo (sin botón "+"
    // dentro de la card -- el "+ Agregar local" de M1/Demanda es una fila
    // distinta que convive en la misma página one-page, no ambiguar con esa).
    await expect(card.getByText('Agregar local:', { exact: false })).toBeVisible()
    await expect(card.getByRole('button', { name: /\+ Agregar local/ })).toHaveCount(0)

    // Segmentos visibles y accesibles (scroll local, no de documento).
    await expect(card.getByRole('heading', { name: 'Segmentos' })).toBeVisible()
    await expect(card.getByText('Segmento 1', { exact: false })).toBeVisible()

    const overflow = await page.evaluate(() => {
      const de = document.documentElement
      return de.scrollWidth - de.clientWidth
    })
    expect(overflow, 'documentElement overflow @ 390px').toBeLessThanOrEqual(1)

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('eliminar el montante desde el botón al final del cuerpo sigue funcionando igual', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irATuberias(page)
    const seccion = seccionMontantes(page)
    await agregarMontante(page, 'Agua fría')
    const card = seccion.locator('.montante-card').first()

    await card.getByRole('button', { name: 'Eliminar montante' }).click()
    await estabilizar(page)
    await expect(seccion.locator('.montante-card')).toHaveCount(0)
    await expect(seccion.getByText('Todavía no hay montantes explícitos')).toBeVisible()

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })
})
