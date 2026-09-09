// Generador de secuencias pseudoaleatorias reproducibles (brief §20, §21,
// §36). El NUCLEO de eleccion es PURO (`elegirIndiceDeAccion`) para
// probarlo en Vitest: misma seed + mismas acciones aplicables => misma
// eleccion, siempre.
import type { Page } from '@playwright/test'
import type { AccionRegistrada } from './tipos'
import type { Prng } from './prng'
import { accionesAplicables, type Accion } from './acciones'

// Entrada minima para el nucleo puro: solo tipo + peso.
export type AccionElegible = { readonly tipo: string; readonly peso: number }

// Elige el indice de una accion segun su peso, usando el PRNG. Determinista.
export function elegirIndiceDeAccion(prng: Prng, elegibles: readonly AccionElegible[]): number {
  if (elegibles.length === 0) {
    throw new Error('elegirIndiceDeAccion: no hay acciones elegibles')
  }
  return prng.elegirIndicePorPeso(elegibles.map((a) => a.peso))
}

export type PasoGenerado = {
  readonly accion: AccionRegistrada
  readonly aplicablesEn: number
}

export type ResultadoSiguientePaso =
  | { readonly tipo: 'paso'; readonly paso: PasoGenerado }
  | { readonly tipo: 'sin-acciones' }

// Un paso del fuzzer: mira que acciones son aplicables, elige una por peso
// y la ejecuta. Devuelve el registro serializable. No comprueba
// invariantes: de eso se ocupa el spec (brief §20).
export async function siguientePaso(page: Page, prng: Prng): Promise<ResultadoSiguientePaso> {
  const aplicables: Accion[] = await accionesAplicables(page)
  if (aplicables.length === 0) {
    return { tipo: 'sin-acciones' }
  }
  const indice = elegirIndiceDeAccion(prng, aplicables)
  const accion = aplicables[indice] as Accion
  const registro = await accion.ejecutar({ page, prng })
  return { tipo: 'paso', paso: { accion: registro, aplicablesEn: aplicables.length } }
}

// Replay best-effort de una secuencia YA registrada (actions.json): re-aplica
// por `tipo`, eligiendo el control aplicable. El camino de reproduccion
// canonico es "misma seed + mismos steps" (brief §25/§36); esto es un
// complemento para inspeccionar un actions.json concreto.
export async function reproducirSecuencia(
  page: Page,
  prng: Prng,
  secuencia: readonly AccionRegistrada[],
  alPaso?: (indice: number, registro: AccionRegistrada, ok: boolean) => void | Promise<void>,
): Promise<void> {
  for (let i = 0; i < secuencia.length; i++) {
    const objetivo = secuencia[i] as AccionRegistrada
    const aplicables = await accionesAplicables(page)
    const accion = aplicables.find((a) => a.tipo === objetivo.tipo)
    if (!accion) {
      await alPaso?.(i, objetivo, false)
      continue
    }
    const registro = await accion.ejecutar({ page, prng })
    await alPaso?.(i, registro, true)
  }
}
