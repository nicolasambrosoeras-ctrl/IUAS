// FIX-HYD-EST-SIMPLIFIED-01 — E2E dirigido de la plantilla estimada
// agregada por (Local, red), corregida para que la hf localizada responda
// al DN vigente de la fila. Dos casos, ambos sobre el proyecto de ejemplo
// (demo):
//
// 1. DN -> V -> hf: en "Alimentación general" (AF, tramo troncal), subir
//    el DN comercial baja la velocidad y la pérdida distribuida; bajar el
//    DN las sube de nuevo (reversibilidad).
// 2. Baño 1 · AF (fan-out 1->4, plantilla estimada agregada): la fila es
//    CALCULABLE (nunca "Incompleto" por la disposición física) y su hf
//    localizada responde al DN de esa misma fila -- ya no queda
//    desacoplada del DN que el usuario está dimensionando.
import { test, expect } from './qa/fixtures'
import { cargarAppLimpia, estabilizar } from './qa/estado'
import { verificarInvariantes, primerFallo } from './qa/invariantes'
import type { Locator, Page } from '@playwright/test'

async function irATuberias(page: Page): Promise<void> {
  await page.getByRole('link', { name: /Tuber[ií]as/ }).first().click()
  await estabilizar(page)
}

function filaDeTramo(page: Page, nombre: string): Locator {
  return page.getByRole('row', { name: new RegExp(nombre) })
}

async function leerV(fila: Locator): Promise<number> {
  const texto = await fila.innerText()
  const m = texto.match(/([\d,]+)\s*m\/s/)
  if (!m) throw new Error(`no se encontró V en la fila: ${texto}`)
  return Number(m[1]!.replace(',', '.'))
}

async function leerHf(fila: Locator): Promise<number> {
  const texto = await fila.innerText()
  const m = texto.match(/([\d,]+)\s*m\.c\.a\./)
  if (!m) throw new Error(`no se encontró hf en la fila: ${texto}`)
  return Number(m[1]!.replace(',', '.'))
}

async function leerDn(fila: Locator): Promise<number> {
  const texto = await fila.innerText()
  const m = texto.match(/(\d+)\s*mm/)
  if (!m) throw new Error(`no se encontró DN en la fila: ${texto}`)
  return Number(m[1])
}

// Baño 1 · AF es la PRIMERA fila de red de la primera UF del demo (antes
// de Cocina/Lavadero/Toilette/Jardín) -- misma identificación por orden
// que ya usa el resto de esta suite E2E, sin depender de un encabezado
// de grupo por separado.
function filaBanoAF(page: Page): Locator {
  return page.locator('tr').filter({ hasText: 'Agua fría' }).nth(2)
}

test.describe('FIX-HYD-EST-SIMPLIFIED-01 · E2E dirigido', () => {
  test('DN -> V -> hf distribuida responde y es reversible en un tramo troncal', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irATuberias(page)

    const fila = filaDeTramo(page, 'Alimentación general')
    await expect(fila).toBeVisible()

    const dn0 = await leerDn(fila)
    const v0 = await leerV(fila)
    const hf0 = await leerHf(fila)

    const subir = fila.getByRole('button', { name: 'Adoptar el DN comercial inmediato superior' })
    const bajar = fila.getByRole('button', { name: 'Adoptar el DN comercial inmediato inferior' })

    // Subir el DN dos veces: V y hf deben responder monótonamente hacia abajo.
    await subir.click()
    await estabilizar(page)
    const dn1 = await leerDn(fila)
    const v1 = await leerV(fila)
    const hf1 = await leerHf(fila)
    expect(dn1).toBeGreaterThan(dn0)
    expect(v1).toBeLessThan(v0)
    expect(hf1).toBeLessThan(hf0)

    await subir.click()
    await estabilizar(page)
    const dn2 = await leerDn(fila)
    const v2 = await leerV(fila)
    const hf2 = await leerHf(fila)
    expect(dn2).toBeGreaterThan(dn1)
    expect(v2).toBeLessThan(v1)
    expect(hf2).toBeLessThan(hf1)

    // Reversibilidad: bajar el DN dos veces vuelve a los valores originales.
    await bajar.click()
    await estabilizar(page)
    await bajar.click()
    await estabilizar(page)
    expect(await leerDn(fila)).toBe(dn0)
    expect(await leerV(fila)).toBeCloseTo(v0, 1)
    expect(await leerHf(fila)).toBeCloseTo(hf0, 2)

    const violaciones = await verificarInvariantes(page, errores)
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('Baño 1 · AF (fan-out 1->4): calculable, sin "Incompleto", y la hf localizada responde al DN de la fila', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irATuberias(page)

    const fila = filaBanoAF(page)
    await expect(fila).toBeVisible()
    const textoInicial = await fila.innerText()
    expect(textoInicial).toMatch(/4\s*puntos/)

    // Calculable de punta a punta: nunca "Incompleto" por la disposición
    // física de la derivación 1->4 (la plantilla estimada es agregada por
    // Local+red, no path-aware).
    expect(textoInicial).not.toMatch(/Incompleto/)
    expect(textoInicial).not.toMatch(/localizada incompleta/)
    expect(textoInicial).not.toMatch(/NaN|undefined|\[object Object\]/)

    const hf0 = await leerHf(fila)
    const dn0 = await leerDn(fila)

    // Subir el DN de ESTA fila: la hf localizada estimada debe bajar --
    // ya no queda desacoplada del DN que el usuario está dimensionando
    // (el bug que motivó este hotfix).
    const subir = fila.getByRole('button', { name: 'Adoptar el DN comercial inmediato superior' })
    await subir.click()
    await estabilizar(page)

    const dn1 = await leerDn(fila)
    const hf1 = await leerHf(fila)
    expect(dn1).toBeGreaterThan(dn0)
    expect(hf1).toBeLessThan(hf0)

    const violaciones = await verificarInvariantes(page, errores)
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })
})
