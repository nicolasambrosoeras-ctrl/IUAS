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
  },
}))
