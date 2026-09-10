import { defineConfig } from 'vitest/config'

// Config SEPARADA para el benchmark local del motor (PERF-SCALE-01A). NO
// forma parte de CI: `npm test` / `npx vitest` siguen usando vite.config.ts
// y nunca ven estos archivos. Se corre a mano con `npm run perf`.
//
// El benchmark reporta tiempos, que dependen de la máquina -- por eso NO es
// un test de CI (brief §8: nada de `expect(duration < N)` flaky). La
// regresión estructural equivalente sí vive en CI, como test normal de
// Vitest (src/**/escalaDelMotor.regresion.test.ts), y afirma sobre
// CANTIDADES (índices/traversals), no sobre milisegundos.
export default defineConfig({
  test: {
    globals: false,
    environment: 'node',
    include: ['scripts/perf/**/*.perf.ts'],
    // Un benchmark de escala puede tardar; sin límite de CI.
    testTimeout: 600000,
    hookTimeout: 600000,
  },
})
