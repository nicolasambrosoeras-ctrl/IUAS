// MODE-UX-01 (D-δ.89) · el modo de trabajo Rápido / Profesional es una
// decisión GLOBAL EXPLÍCITA del proyecto, desacoplada de la configuración
// hidráulica. Cambiar un control hidráulico NO cambia el modo; una misma
// combinación (Hazen + Estimadas + Simplificada) puede vivir en ambos
// modos. El selector vive en la cabecera global.
import { test, expect } from './qa/fixtures'
import { cargarAppLimpia, estabilizar } from './qa/estado'
import { verificarInvariantes, primerFallo } from './qa/invariantes'
import type { Page } from '@playwright/test'

function botonModo(page: Page, nombre: 'Rápido' | 'Profesional') {
  return page.getByRole('button', { name: nombre, exact: true }).first()
}

async function esperarModo(page: Page, nombre: 'Rápido' | 'Profesional'): Promise<void> {
  await expect(botonModo(page, nombre)).toHaveAttribute('aria-pressed', 'true')
  const otro = nombre === 'Rápido' ? 'Profesional' : 'Rápido'
  await expect(botonModo(page, otro)).toHaveAttribute('aria-pressed', 'false')
}

async function irATuberias(page: Page): Promise<void> {
  await page.getByRole('link', { name: /Tuber[ií]as/ }).first().click()
  await estabilizar(page)
}

async function abrirConfiguracionAvanzada(page: Page): Promise<void> {
  const resumen = page.getByText('Configuración avanzada', { exact: true }).first()
  const detalle = resumen.locator('xpath=ancestor::details[1]')
  const abierto = await detalle.evaluate((el) => (el as HTMLDetailsElement).open).catch(() => false)
  if (!abierto) {
    await resumen.click()
    await estabilizar(page)
  }
}

type ConfigEjes = { distribuida: string; localizada: string; granularidad: string }

async function leerEjes(page: Page): Promise<ConfigEjes> {
  return {
    distribuida: await page.getByLabel('Pérdidas distribuidas:').inputValue(),
    localizada: await page.getByLabel('Pérdidas localizadas:').inputValue(),
    granularidad: await page.getByLabel('Granularidad hidráulica:').inputValue(),
  }
}

const PRESET_INICIAL: ConfigEjes = { distribuida: 'hazenWilliams', localizada: 'estimado', granularidad: 'simplificada' }
const CUSTOM_PROFESIONAL: ConfigEjes = { distribuida: 'darcyWeisbach', localizada: 'detallado', granularidad: 'profesional' }

async function fijarEjes(page: Page, ejes: ConfigEjes): Promise<void> {
  await abrirConfiguracionAvanzada(page)
  await page.getByLabel('Pérdidas distribuidas:').selectOption(ejes.distribuida)
  await estabilizar(page)
  await page.getByLabel('Pérdidas localizadas:').selectOption(ejes.localizada)
  await estabilizar(page)
  await page.getByLabel('Granularidad hidráulica:').selectOption(ejes.granularidad)
  await estabilizar(page)
}

test.describe('MODE-UX-01 · modo de trabajo desacoplado de la configuración hidráulica', () => {
  test('Caso 1 · arranca en Rápido; al pasar a Profesional la config sigue en el preset inicial y los controles avanzados quedan disponibles', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await esperarModo(page, 'Rápido')

    await botonModo(page, 'Profesional').click()
    await estabilizar(page)
    await esperarModo(page, 'Profesional')

    await irATuberias(page)
    // Config avanzada abierta en Profesional, ejes en el preset inicial
    // (Hazen + Estimadas + Simplificada), no en "máximo detalle".
    const detalle = page
      .getByText('Configuración avanzada', { exact: true })
      .first()
      .locator('xpath=ancestor::details[1]')
    await expect(detalle).toHaveJSProperty('open', true)
    expect(await leerEjes(page)).toEqual(PRESET_INICIAL)

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('Caso 2 · cambiar los controles hidráulicos en Profesional NO cambia el modo', async ({
    page,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await botonModo(page, 'Profesional').click()
    await estabilizar(page)
    await irATuberias(page)

    await fijarEjes(page, CUSTOM_PROFESIONAL)
    expect(await leerEjes(page)).toEqual(CUSTOM_PROFESIONAL)
    await esperarModo(page, 'Profesional')
  })

  test('Caso 3 · volver a la combinación exacta de Rápido (H/E/S) desde Profesional sigue siendo Profesional', async ({
    page,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await botonModo(page, 'Profesional').click()
    await estabilizar(page)
    await irATuberias(page)

    // Primero personalizo…
    await fijarEjes(page, CUSTOM_PROFESIONAL)
    await esperarModo(page, 'Profesional')
    // …y ahora vuelvo manualmente a Hazen + Estimadas + Simplificada.
    await fijarEjes(page, PRESET_INICIAL)
    expect(await leerEjes(page)).toEqual(PRESET_INICIAL)
    await esperarModo(page, 'Profesional')
  })

  test('Caso 4 · Profesional personalizado → Rápido aplica el preset seguro y reduce la UI; volver a Profesional restaura la personalización', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await botonModo(page, 'Profesional').click()
    await estabilizar(page)
    await irATuberias(page)
    await fijarEjes(page, CUSTOM_PROFESIONAL)

    // → Rápido
    await botonModo(page, 'Rápido').click()
    await estabilizar(page)
    await esperarModo(page, 'Rápido')
    // Preset Rápido activo y "Configuración avanzada" colapsada.
    expect(await leerEjes(page)).toEqual(PRESET_INICIAL)
    const detalle = page
      .getByText('Configuración avanzada', { exact: true })
      .first()
      .locator('xpath=ancestor::details[1]')
    await expect(detalle).toHaveJSProperty('open', false)

    // → Profesional otra vez: se restaura la configuración personalizada.
    await botonModo(page, 'Profesional').click()
    await estabilizar(page)
    await esperarModo(page, 'Profesional')
    expect(await leerEjes(page)).toEqual(CUSTOM_PROFESIONAL)

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('Caso 5 · Reiniciar cálculo desde Profesional custom deja proyecto vacío en Rápido, sin memoria Profesional vieja', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await botonModo(page, 'Profesional').click()
    await estabilizar(page)
    await irATuberias(page)
    await fijarEjes(page, CUSTOM_PROFESIONAL)

    // Reiniciar cálculo.
    await page.getByRole('button', { name: 'Reiniciar cálculo' }).click()
    const dialogo = page.getByRole('dialog')
    await expect(dialogo).toBeVisible()
    await dialogo.getByRole('button', { name: 'Reiniciar', exact: true }).click()
    await estabilizar(page)

    // Proyecto vacío real y modo Rápido (crearProyectoVacio fija
    // `modoTrabajo: 'rapido'` y NO trae `ultimaConfiguracionProfesional`;
    // el descarte del snapshot lo bloquea el unit test de modoDeTrabajo).
    await expect(page.getByText('Total de unidades funcionales: 0')).toBeVisible()
    await esperarModo(page, 'Rápido')

    // El selector sigue operativo sobre el proyecto vacío, sin arrastrar
    // estado de la sesión anterior ni romper la app.
    await botonModo(page, 'Profesional').click()
    await estabilizar(page)
    await esperarModo(page, 'Profesional')
    await botonModo(page, 'Rápido').click()
    await estabilizar(page)
    await esperarModo(page, 'Rápido')

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('responsive · el selector global no desborda la página @ 360 / 390 / 1280', async ({
    page,
    baseURLEfectiva,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'viewport fijado en el test')
    await cargarAppLimpia(page, baseURLEfectiva)
    for (const vp of [
      { w: 360, h: 800 },
      { w: 390, h: 844 },
      { w: 1280, h: 900 },
    ]) {
      await page.setViewportSize({ width: vp.w, height: vp.h })
      await botonModo(page, 'Profesional').click()
      await estabilizar(page)
      const over = await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )
      expect(over, `overflow horizontal @ ${vp.w}px`).toBeLessThanOrEqual(1)
      await botonModo(page, 'Rápido').click()
      await estabilizar(page)
    }
  })
})
