// HYD-EST-01 — E2E dirigido de la hf estimada por camino (path-aware).
// Dos casos, ambos sobre el proyecto de ejemplo (demo) contra `vite` dev:
//
// 1. DN -> V -> hf: en "Alimentación general" (AF), subir el DN comercial
//    baja la velocidad y la pérdida distribuida; bajar el DN las sube de
//    nuevo (reversibilidad). No depende de fan-out: es un tramo troncal
//    único, no una tee.
// 2. Fan-out 1->N no modelado: el demo original tiene bifurcaciones
//    1->N (ej. Baño 1 · AF sirve 4 artefactos con una sola tee 1->N sin
//    modelar). La fila queda "Incompleto" con DN/V/hf DISTRIBUIDA igual
//    determinables y sin NaN/crash; la localizada estimada se marca
//    incompleta en vez de inventar una cadena de tees.
import { test, expect } from './qa/fixtures'
import { cargarAppLimpia, estabilizar } from './qa/estado'
import { verificarInvariantes, primerFallo } from './qa/invariantes'
import type { Page } from '@playwright/test'

async function irATuberias(page: Page): Promise<void> {
  await page.getByRole('link', { name: /Tuber[ií]as/ }).first().click()
  await estabilizar(page)
}

function filaDeTramo(page: Page, nombre: string) {
  return page.getByRole('row', { name: new RegExp(nombre) })
}

async function leerV(fila: ReturnType<typeof filaDeTramo>): Promise<number> {
  const texto = await fila.innerText()
  const m = texto.match(/([\d,]+)\s*m\/s/)
  if (!m) throw new Error(`no se encontró V en la fila: ${texto}`)
  return Number(m[1]!.replace(',', '.'))
}

async function leerHf(fila: ReturnType<typeof filaDeTramo>): Promise<number> {
  const texto = await fila.innerText()
  const m = texto.match(/([\d,]+)\s*m\.c\.a\./)
  if (!m) throw new Error(`no se encontró hf en la fila: ${texto}`)
  return Number(m[1]!.replace(',', '.'))
}

async function leerDn(fila: ReturnType<typeof filaDeTramo>): Promise<number> {
  const texto = await fila.innerText()
  const m = texto.match(/(\d+)\s*mm/)
  if (!m) throw new Error(`no se encontró DN en la fila: ${texto}`)
  return Number(m[1])
}

test.describe('HYD-EST-01 · E2E dirigido', () => {
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

  test('fan-out 1->N no modelado: Incompleto sin hf ficticia, sin NaN, sin crash', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await irATuberias(page)

    // El demo trae Baño 1 · AF con 4 artefactos detrás de una tee 1->N sin
    // modelar (derivacionMultipleNoModelada). DN/V/hf DISTRIBUIDA del tramo
    // representativo siguen siendo determinables; sólo la localizada
    // estimada queda incompleta.
    const filaBanoAF = page
      .locator('tr')
      .filter({ hasText: 'Agua fría' })
      .filter({ hasText: 'localizada incompleta' })
      .first()
    await expect(filaBanoAF).toBeVisible()
    const texto = await filaBanoAF.innerText()

    expect(texto).toMatch(/localizada incompleta/)
    expect(texto).toMatch(/Incompleto/)
    // La pérdida DISTRIBUIDA sigue mostrándose con un número real.
    expect(texto).toMatch(/[\d,]+\s*m\.c\.a\. distrib\./)
    // Nunca basura visible en vez de un valor.
    expect(texto).not.toMatch(/NaN|undefined|\[object Object\]/)

    const violaciones = await verificarInvariantes(page, errores)
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })
})
