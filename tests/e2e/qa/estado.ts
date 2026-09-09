// Helpers de ESTADO de la app bajo prueba (brief §20, §44): cargar la
// pagina a su estado inicial, esperar a que este "lista" y estabilizar
// tras una accion sin abusar de waitForTimeout (brief §22).
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'

// La app es una SPA: cada run parte de una pagina recien cargada, que
// vuelve al proyecto de ejemplo (no hay persistencia todavia -- PERSIST-01).
export async function cargarAppLimpia(page: Page, baseURL: string): Promise<void> {
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' })
  await esperarAppLista(page)
}

// "Lista" = el root tiene contenido y el marcador de identidad IUAS esta
// presente, ademas de al menos una seccion de trabajo. No se apoya en
// networkidle (GitHub Pages sirve assets con caché agresiva).
export async function esperarAppLista(page: Page): Promise<void> {
  await expect(page.locator('#root')).not.toBeEmpty({ timeout: 15000 })
  await expect(page.getByRole('heading', { name: /IUAS/ }).first()).toBeVisible({ timeout: 15000 })
  await expect(page.locator('#demanda')).toBeVisible({ timeout: 15000 })
}

// Estabilizacion corta tras una accion: da un tick a React para re-render y
// espera a que no haya animaciones de scroll en curso. Sin sleeps largos.
export async function estabilizar(page: Page): Promise<void> {
  try {
    await page.waitForLoadState('domcontentloaded', { timeout: 3000 })
  } catch {
    /* noop */
  }
  // Dos rAF: deja que React aplique el commit y el layout se asiente.
  await page
    .evaluate(
      () =>
        new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
        }),
    )
    .catch(() => {})
}

export function baseUrlEfectiva(): string {
  const cruda = process.env.IUAS_BASE_URL?.trim()
  if (cruda && cruda.length > 0) {
    return cruda.endsWith('/') ? cruda : `${cruda}/`
  }
  return 'https://nicolasambrosoeras-ctrl.github.io/IUAS/'
}
