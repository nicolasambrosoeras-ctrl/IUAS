// QA-CI-01 — resolución de la SEED BASE del sequence fuzz.
//
// Regla dura: la colección de tests de Playwright debe ser una función
// DETERMINISTA del environment recibido. El título de cada `test(...)` del
// fuzz incluye la seed base; si esa seed se generara con una fuente mutable
// (`Date.now()`, `process.pid`, `Math.random()`, `crypto`, un UUID…) el
// coordinator y los workers de Playwright — que importan el spec en
// procesos distintos — obtendrían valores distintos y los títulos no
// coincidirían: `Test not found in the worker process`.
//
// Por eso el fallback local es FIJO y documentado. En CI, cuando el usuario
// no pasa `seed`, es el WORKFLOW el que resuelve UNA sola seed (a partir de
// `GITHUB_RUN_ID`/`GITHUB_RUN_ATTEMPT`, estables dentro del job) y la
// exporta como `IUAS_FUZZ_SEED` antes de invocar Playwright, de modo que
// todos los procesos hijos hereden exactamente la misma.

// Fallback local, estable y reproducible (coincide con la seed usada en la
// validación de QA-FUZZ-01). Cualquier corrida local sin `IUAS_FUZZ_SEED`
// parte SIEMPRE de este valor.
export const SEED_LOCAL_POR_DEFECTO = '424242'

// Resuelve la seed base a partir del valor crudo de `IUAS_FUZZ_SEED`.
// - string no vacío (tras `trim`)  -> se usa tal cual (reproducible)
// - undefined / '' / sólo espacios -> fallback local fijo
// NUNCA introduce aleatoriedad: dos llamadas con la misma entrada devuelven
// siempre el mismo valor.
export function resolverSeedBase(valorEnv: string | undefined): string {
  const limpio = valorEnv?.trim()
  return limpio && limpio.length > 0 ? limpio : SEED_LOCAL_POR_DEFECTO
}

// Seed concreta de un run: `${seedBase}:${run}`. Se mantiene el esquema de
// derivación por run de QA-FUZZ-01 (lo consume `normalizarSeed` + `crearPrng`).
export function seedDeRun(seedBase: string, run: number): string {
  return `${seedBase}:${run}`
}
