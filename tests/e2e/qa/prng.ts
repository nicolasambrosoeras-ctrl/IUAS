// PRNG determinista para QA-FUZZ-01 (brief §5, §36). No usa Math.random():
// toda corrida pseudoaleatoria parte de una `seed` explícita y es
// reproducible bit a bit. Implementación mulberry32 (dominio público):
// 32 bits de estado, un solo `Math.imul` por paso, sin dependencias.
//
// Módulo PURO: no importa Playwright ni nada del navegador, así los tests
// unitarios de determinismo (prng.test.ts) corren en Vitest/Node sin
// tocar el harness E2E.

export type Prng = {
  /** Próximo flotante en [0, 1). */
  readonly siguiente: () => number
  /** Entero en [0, limite). `limite` debe ser un entero > 0. */
  readonly enteroHasta: (limite: number) => number
  /** Entero en [min, max] inclusive. */
  readonly enteroEntre: (min: number, max: number) => number
  /** Elige un elemento del arreglo (no vacío). */
  readonly elegir: <T>(opciones: readonly T[]) => T
  /**
   * Elige el índice de un arreglo de pesos no negativos. Un peso 0 nunca
   * se elige salvo que todos sean 0 (entonces cae a uniforme).
   */
  readonly elegirIndicePorPeso: (pesos: readonly number[]) => number
  /** Baraja una copia del arreglo (Fisher–Yates). No muta el original. */
  readonly barajar: <T>(opciones: readonly T[]) => T[]
  /** Estado interno actual (para depurar / snapshotear). */
  readonly estado: () => number
}

// Hash de string -> uint32 (FNV-1a). Permite `seed` textual estable en
// specs deterministas ("catalogo:banera") sin perder reproducibilidad.
export function seedDesdeTexto(texto: string): number {
  let h = 0x811c9dc5
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return h >>> 0
}

// Normaliza cualquier entrada (número, string numérico, texto, undefined) a
// una seed uint32 utilizable. Nunca devuelve 0 sin más: 0 es una seed
// válida para mulberry32, pero un `undefined` accidental no debe colisionar
// con la corrida "seed 0".
export function normalizarSeed(entrada: string | number | undefined): number {
  if (typeof entrada === 'number' && Number.isFinite(entrada)) {
    return entrada >>> 0
  }
  if (typeof entrada === 'string' && entrada.trim() !== '') {
    const comoNumero = Number(entrada)
    if (Number.isFinite(comoNumero)) {
      return comoNumero >>> 0
    }
    return seedDesdeTexto(entrada)
  }
  return 0x9e3779b9
}

export function crearPrng(seed: string | number): Prng {
  let estado = (typeof seed === 'number' ? seed : normalizarSeed(seed)) >>> 0

  function siguiente(): number {
    estado = (estado + 0x6d2b79f5) >>> 0
    let t = estado
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }

  function enteroHasta(limite: number): number {
    if (!Number.isInteger(limite) || limite <= 0) {
      throw new Error(`enteroHasta requiere un entero > 0, recibió ${limite}`)
    }
    return Math.floor(siguiente() * limite)
  }

  function enteroEntre(min: number, max: number): number {
    if (max < min) {
      throw new Error(`enteroEntre requiere max >= min, recibió [${min}, ${max}]`)
    }
    return min + enteroHasta(max - min + 1)
  }

  function elegir<T>(opciones: readonly T[]): T {
    if (opciones.length === 0) {
      throw new Error('elegir requiere un arreglo no vacío')
    }
    return opciones[enteroHasta(opciones.length)] as T
  }

  function elegirIndicePorPeso(pesos: readonly number[]): number {
    if (pesos.length === 0) {
      throw new Error('elegirIndicePorPeso requiere al menos un peso')
    }
    const saneados = pesos.map((p) => (Number.isFinite(p) && p > 0 ? p : 0))
    const total = saneados.reduce((a, b) => a + b, 0)
    if (total <= 0) {
      // Todos los pesos 0: uniforme.
      return enteroHasta(pesos.length)
    }
    let objetivo = siguiente() * total
    for (let i = 0; i < saneados.length; i++) {
      objetivo -= saneados[i] as number
      if (objetivo < 0) {
        return i
      }
    }
    return saneados.length - 1
  }

  function barajar<T>(opciones: readonly T[]): T[] {
    const copia = [...opciones]
    for (let i = copia.length - 1; i > 0; i--) {
      const j = enteroHasta(i + 1)
      ;[copia[i], copia[j]] = [copia[j] as T, copia[i] as T]
    }
    return copia
  }

  return {
    siguiente,
    enteroHasta,
    enteroEntre,
    elegir,
    elegirIndicePorPeso,
    barajar,
    estado: () => estado >>> 0,
  }
}
