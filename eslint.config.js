import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),

  // Base: TypeScript recomendado, sin entorno global asumido.
  // El nucleo (modelo, normativa, validacion, motor) queda cubierto
  // unicamente por este bloque: si un archivo ahi referencia "window",
  // "document" u otro global de navegador, ESLint lo marca como no
  // definido. Es el mecanismo "lint" de C-01 y C-10.
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
  },

  // Cascara: interfaz y exportadores corren en el navegador y usan React.
  {
    files: ['src/interfaz/**/*.{ts,tsx}', 'src/exportadores/**/*.{ts,tsx}'],
    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],
    languageOptions: {
      globals: globals.browser,
    },
  },
])
