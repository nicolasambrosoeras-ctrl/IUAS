import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // GitHub Pages sirve el proyecto en /IUAS/, no en la raiz del dominio
  // (Paso 6). Solo en build de produccion: en dev, la app sigue en la
  // raiz para no complicar el flujo local de todos los dias.
  base: command === 'build' ? '/IUAS/' : '/',
  plugins: [react()],
  test: {
    globals: false,
    environment: 'node',
    // El core y la interfaz viven en `src/`; QA-FUZZ-01 (D-δ.80) agrega
    // unit tests de su harness bajo `tests/e2e/qa/`. Los specs de
    // Playwright (`tests/e2e/*.spec.ts`) NO son de Vitest: se excluyen
    // acotando el include a estos dos árboles.
    include: ['src/**/*.{test,spec}.{ts,tsx}', 'tests/e2e/qa/**/*.test.ts'],
  },
}))
