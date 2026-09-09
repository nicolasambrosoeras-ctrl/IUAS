// QA-CI-01 · regresión del resolver de seed del sequence fuzz.
//
// El fallo original: el spec generaba la seed base durante el import con
// `Date.now() ^ (process.pid << 16)` cuando `IUAS_FUZZ_SEED` estaba
// ausente. Como Playwright importa el spec en procesos distintos
// (coordinator para discovery, workers para ejecución) y la seed va en el
// título del test, los títulos no coincidían -> "Test not found in the
// worker process". Local con `IUAS_FUZZ_SEED=424242` nunca lo mostró
// porque ahí la seed era constante entre procesos.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolverSeedBase, seedDeRun, SEED_LOCAL_POR_DEFECTO } from './seed'
import { crearPrng, normalizarSeed } from './prng'

describe('resolverSeedBase', () => {
  it('seed explícita se usa tal cual (reproducible)', () => {
    expect(resolverSeedBase('424242')).toBe('424242')
    expect(resolverSeedBase('  424242  ')).toBe('424242')
    expect(resolverSeedBase('mi-seed-textual')).toBe('mi-seed-textual')
  })

  it('sin seed -> fallback local FIJO y estable', () => {
    expect(resolverSeedBase(undefined)).toBe(SEED_LOCAL_POR_DEFECTO)
    expect(resolverSeedBase('')).toBe(SEED_LOCAL_POR_DEFECTO)
    expect(resolverSeedBase('   ')).toBe(SEED_LOCAL_POR_DEFECTO)
  })

  it('dos resoluciones sin seed dan EXACTAMENTE el mismo valor (nada mutable)', () => {
    const a = resolverSeedBase(undefined)
    const b = resolverSeedBase(undefined)
    expect(a).toBe(b)
    // 1000 llamadas, todas idénticas.
    const valores = new Set(Array.from({ length: 1000 }, () => resolverSeedBase(process.env.NO_EXISTE)))
    expect(valores.size).toBe(1)
  })

  it('es función pura del argumento, no del entorno del proceso', () => {
    const previo = process.env.IUAS_FUZZ_SEED
    try {
      process.env.IUAS_FUZZ_SEED = '999'
      // resolverSeedBase NO lee process.env: sólo su argumento.
      expect(resolverSeedBase(undefined)).toBe(SEED_LOCAL_POR_DEFECTO)
      expect(resolverSeedBase('123')).toBe('123')
    } finally {
      if (previo === undefined) delete process.env.IUAS_FUZZ_SEED
      else process.env.IUAS_FUZZ_SEED = previo
    }
  })
})

describe('seedDeRun + derivación por run', () => {
  it('el esquema de derivación es `${base}:${run}`', () => {
    expect(seedDeRun('424242', 0)).toBe('424242:0')
    expect(seedDeRun('424242', 7)).toBe('424242:7')
  })

  it('misma seed base + mismo run -> misma secuencia del PRNG', () => {
    const base = resolverSeedBase(undefined)
    const s1 = crearPrng(normalizarSeed(seedDeRun(base, 3)))
    const s2 = crearPrng(normalizarSeed(seedDeRun(base, 3)))
    const a = Array.from({ length: 50 }, () => s1.siguiente())
    const b = Array.from({ length: 50 }, () => s2.siguiente())
    expect(a).toEqual(b)
  })

  it('misma seed base + run distinto -> secuencia distinta y determinista', () => {
    const base = '424242'
    const r0 = crearPrng(normalizarSeed(seedDeRun(base, 0)))
    const r1 = crearPrng(normalizarSeed(seedDeRun(base, 1)))
    const a = Array.from({ length: 50 }, () => r0.siguiente())
    const b = Array.from({ length: 50 }, () => r1.siguiente())
    expect(a).not.toEqual(b)
    // determinista: repetir run 1 reproduce b.
    const r1bis = crearPrng(normalizarSeed(seedDeRun(base, 1)))
    expect(Array.from({ length: 50 }, () => r1bis.siguiente())).toEqual(b)
  })

  it('seed base numérica del workflow (GITHUB_RUN_ID-ATTEMPT) es reproducible', () => {
    const base = '34354499688-1'
    const x = crearPrng(normalizarSeed(seedDeRun(base, 0)))
    const y = crearPrng(normalizarSeed(seedDeRun(base, 0)))
    expect(Array.from({ length: 30 }, () => x.enteroHasta(1000))).toEqual(
      Array.from({ length: 30 }, () => y.enteroHasta(1000)),
    )
  })
})

describe('discovery del fuzz sin fuentes mutables (guarda anti-regresión)', () => {
  const FUENTES_MUTABLES = [
    /\bDate\.now\b/,
    /\bMath\.random\b/,
    /\bprocess\.pid\b/,
    /\bcrypto\.(?:randomUUID|randomBytes|getRandomValues)\b/,
    /\bperformance\.now\b/,
    /\bhrtime\b/,
  ]

  // Escanea el CÓDIGO, no los comentarios (que mencionan a propósito las
  // fuentes prohibidas para documentar la regla).
  const sinComentarios = (src: string): string =>
    src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

  const leerCodigo = (rel: string): string =>
    sinComentarios(readFileSync(new URL(rel, import.meta.url), 'utf8'))

  it('tests/e2e/qa/seed.ts no usa ninguna fuente mutable', () => {
    const src = leerCodigo('./seed.ts')
    for (const re of FUENTES_MUTABLES) expect(src, re.source).not.toMatch(re)
  })

  it('tests/e2e/sequence-fuzz.spec.ts no construye la seed base con fuentes mutables', () => {
    const src = leerCodigo('../sequence-fuzz.spec.ts')
    for (const re of FUENTES_MUTABLES) expect(src, re.source).not.toMatch(re)
    // La seed base sale del resolver puro, no de una expresión inline.
    expect(src).toMatch(/resolverSeedBase\(process\.env\.IUAS_FUZZ_SEED\)/)
  })
})
