// QA-FUZZ-01 — configuración de Playwright para el harness de testing
// secuencial de IUAS (brief §3, §4, §16, §23, §27, §45).
//
// Objetivo por default: la beta pública en GitHub Pages. Override por
// `IUAS_BASE_URL`. Para correr contra un build local:
//   npm run build && npm run preview   (sirve http://localhost:4173/IUAS/)
//   IUAS_BASE_URL=http://localhost:4173/IUAS/ npm run e2e
// o dejar que Playwright levante el preview:
//   IUAS_PREVIEW=1 npm run e2e
import { defineConfig, devices } from '@playwright/test'

const PRODUCCION = 'https://nicolasambrosoeras-ctrl.github.io/IUAS/'
const usarPreviewLocal = process.env.IUAS_PREVIEW === '1'
const baseURL =
  (usarPreviewLocal ? 'http://localhost:4173/IUAS/' : process.env.IUAS_BASE_URL?.trim()) || PRODUCCION

export default defineConfig({
  testDir: './tests/e2e',
  // Sólo los specs de primer nivel son de Playwright; `tests/e2e/qa/*.test.ts`
  // son unit tests de Vitest y NO deben correr acá.
  testMatch: /.*\.spec\.ts$/,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  // fail-fast por run (brief §23): un fallo detiene esa seed; el spec de
  // fuzz preserva evidencia y sigue con las demás seeds si corresponde.
  retries: 0,
  // Reproducibilidad por sobre velocidad (brief §45): pocos workers.
  workers: process.env.CI ? 1 : 2,
  timeout: 90_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  outputDir: 'test-results',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1280, height: 900 } },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 5'], viewport: { width: 390, height: 844 } },
    },
  ],
  ...(usarPreviewLocal
    ? {
        webServer: {
          // `vite preview` resuelve `command` como 'serve' (no 'build'), así
          // que el `base: '/IUAS/'` de vite.config.ts no se aplica solo --
          // sin este --base explícito, el preview sirve los assets en la
          // raíz mientras el index.html del build ya construido referencia
          // `/IUAS/assets/...`, y esa ruta cae al fallback SPA (devuelve
          // index.html con Content-Type text/html en vez del bundle JS).
          command: 'npm run preview -- --port 4173 --strictPort --base /IUAS/',
          url: 'http://localhost:4173/IUAS/',
          reuseExistingServer: !process.env.CI,
          timeout: 60_000,
        },
      }
    : {}),
})
