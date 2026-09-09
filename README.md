# IUAS

Herramienta de cálculo hidráulico de instalaciones sanitarias internas,
basada en la Guía de Instalaciones Internas ERAS-2023.

Beta pública: <https://nicolasambrosoeras-ctrl.github.io/IUAS/>

## Desarrollo

```bash
npm install
npm run dev        # Vite dev server (raíz)
npm run build      # tsc -b + vite build (base /IUAS/)
npm run preview    # sirve el build en http://localhost:4173/IUAS/
```

## Tests

```bash
npm test           # Vitest (core M1–M4 + interfaz + harness QA)
npx vitest run     # una sola pasada
npm run lint       # ESLint
```

## Testing E2E / QA Fuzz

Harness Playwright para detectar crashes, pantallas blancas y estados
inválidos por secuencia. Documentación completa: [`QA-FUZZ.md`](./QA-FUZZ.md).

```bash
npm run e2e            # smoke + catálogo + fuzz + escenarios (beta pública)
npm run e2e:smoke      # camino feliz determinista
npm run e2e:fuzz       # fuzz reproducible por seed
npm run e2e:typecheck  # type-check del harness

# contra un build local:
npm run build && IUAS_PREVIEW=1 npm run e2e

# replay de un fallo:
IUAS_FUZZ_SEED=<n> IUAS_FUZZ_RUNS=1 IUAS_FUZZ_STEPS=<n> npm run e2e:fuzz
```

También corre en GitHub Actions (`QA Fuzz (Playwright)`): manual
(`workflow_dispatch` con `runs` / `steps` / `seed` / `base_url`) y nocturno.
