// Fixtures de Playwright para el harness (brief §15, §60). Extiende `test`
// con:
//   - `errores`: un RecolectorDeErrores ya enganchado a la page desde el
//     primer navigate (console.error / pageerror / requestfailed).
//   - `baseURLEfectiva`: la URL objetivo resuelta (env IUAS_BASE_URL o
//     produccion).
import { test as base, expect } from '@playwright/test'
import { RecolectorDeErrores } from './errores'
import { baseUrlEfectiva } from './estado'
import type { ClaseDeFallo } from './tipos'

type FixturesQa = {
  errores: RecolectorDeErrores
  baseURLEfectiva: string
}

export const test = base.extend<FixturesQa>({
  errores: async ({ page }, usar) => {
    const recolector = new RecolectorDeErrores(page)
    await usar(recolector)
  },
  baseURLEfectiva: async ({}, usar) => {
    await usar(baseUrlEfectiva())
  },
})

export { expect }

// Clasificacion conceptual de un fallo (brief §60): APP / HARNESS / NETWORK.
// Se usa para etiquetar el artifact y el titulo del fallo.
export function clasificarFallo(params: {
  hayPageError: boolean
  hayConsoleError: boolean
  hayPantallaBlanca: boolean
  hayInvarianteApp: boolean
  hayPedidoEsencialFallido: boolean
  mensajeError?: string | undefined
}): { clase: ClaseDeFallo; motivo: string } {
  if (params.hayPantallaBlanca) return { clase: 'APP', motivo: 'WHITE_SCREEN' }
  if (params.hayPageError) return { clase: 'APP', motivo: 'pageerror' }
  if (params.hayPedidoEsencialFallido) return { clase: 'NETWORK', motivo: 'asset esencial no disponible' }
  if (params.hayConsoleError) return { clase: 'APP', motivo: 'console.error' }
  if (params.hayInvarianteApp) return { clase: 'APP', motivo: 'invariante de app violada' }
  // Timeouts de locator, selector que no aparece, race del test: HARNESS.
  const msg = params.mensajeError ?? ''
  if (/Timeout|locator|strict mode|not visible|not enabled|selector/i.test(msg)) {
    return { clase: 'HARNESS', motivo: 'selector / race del test' }
  }
  return { clase: 'HARNESS', motivo: 'no clasificable como fallo de app' }
}
