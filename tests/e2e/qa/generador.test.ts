// QA-FUZZ-01 · núcleo del generador de secuencias (brief §21, §35, §36).
// Se prueba la parte PURA: elección por peso determinista + serialización
// estable. La ejecución contra la page real la cubren los specs E2E.
import { describe, it, expect } from 'vitest'
import { crearPrng } from './prng'
import { elegirIndiceDeAccion, type AccionElegible } from './generador'
import { ACCIONES } from './acciones'
import { describirAccion, type AccionRegistrada } from './tipos'

const ELEGIBLES: AccionElegible[] = [
  { tipo: 'a', peso: 1 },
  { tipo: 'b', peso: 5 },
  { tipo: 'c', peso: 2 },
  { tipo: 'd', peso: 0 },
]

describe('elegirIndiceDeAccion', () => {
  it('misma seed + mismas acciones aplicables => misma secuencia (§36)', () => {
    const p1 = crearPrng(777)
    const p2 = crearPrng(777)
    const s1 = Array.from({ length: 100 }, () => elegirIndiceDeAccion(p1, ELEGIBLES))
    const s2 = Array.from({ length: 100 }, () => elegirIndiceDeAccion(p2, ELEGIBLES))
    expect(s1).toEqual(s2)
  })

  it('otra seed => otra secuencia', () => {
    const p1 = crearPrng(1)
    const p2 = crearPrng(2)
    const s1 = Array.from({ length: 30 }, () => elegirIndiceDeAccion(p1, ELEGIBLES))
    const s2 = Array.from({ length: 30 }, () => elegirIndiceDeAccion(p2, ELEGIBLES))
    expect(s1).not.toEqual(s2)
  })

  it('nunca elige una acción de peso 0 (aplicable pero no deseada)', () => {
    const p = crearPrng(4321)
    for (let i = 0; i < 5000; i++) {
      expect(elegirIndiceDeAccion(p, ELEGIBLES)).not.toBe(3)
    }
  })

  it('respeta la ponderación (b >> a, c)', () => {
    const p = crearPrng(2026)
    const conteo = [0, 0, 0, 0]
    for (let i = 0; i < 40000; i++) conteo[elegirIndiceDeAccion(p, ELEGIBLES)]!++
    expect(conteo[1]!).toBeGreaterThan(conteo[0]!)
    expect(conteo[1]!).toBeGreaterThan(conteo[2]!)
    expect(conteo[3]!).toBe(0)
  })

  it('con una sola acción elegible siempre devuelve 0', () => {
    const p = crearPrng(9)
    for (let i = 0; i < 100; i++) expect(elegirIndiceDeAccion(p, [{ tipo: 'x', peso: 3 }])).toBe(0)
  })

  it('lista vacía es un error de programación', () => {
    expect(() => elegirIndiceDeAccion(crearPrng(1), [])).toThrow()
  })
})

describe('catálogo de acciones', () => {
  it('todas las acciones tienen tipo único, módulo y peso > 0', () => {
    const tipos = new Set<string>()
    for (const a of ACCIONES) {
      expect(a.tipo).toBeTruthy()
      expect(tipos.has(a.tipo)).toBe(false)
      tipos.add(a.tipo)
      expect(['M1', 'M2', 'M3', 'M4', 'GLOBAL']).toContain(a.modulo)
      expect(a.peso).toBeGreaterThan(0)
      expect(typeof a.aplicable).toBe('function')
      expect(typeof a.ejecutar).toBe('function')
    }
    expect(tipos.size).toBeGreaterThanOrEqual(30)
  })

  it('las zonas sospechosas tienen más peso que la media (§21)', () => {
    const pesoDe = (t: string) => ACCIONES.find((a) => a.tipo === t)?.peso ?? 0
    const media = ACCIONES.reduce((s, a) => s + a.peso, 0) / ACCIONES.length
    for (const t of ['resolverConectividad', 'cambiarProvisionACS', 'iniciarModulo3', 'cambiarTipoArtefacto']) {
      expect(pesoDe(t), t).toBeGreaterThan(media)
    }
  })
})

describe('describirAccion (serialización estable)', () => {
  it('formatea tipo + valor + módulo de forma legible', () => {
    const a: AccionRegistrada = { tipo: 'cambiarProvisionACS', modulo: 'M3', valor: 'central' }
    expect(describirAccion(a)).toBe('cambiarProvisionACS=central  [M3]')
  })
  it('es estable ante repetición', () => {
    const a: AccionRegistrada = { tipo: 'irADemanda', modulo: 'M1' }
    expect(describirAccion(a)).toBe(describirAccion({ ...a }))
  })
  it('incluye el detalle entre paréntesis cuando existe', () => {
    const a: AccionRegistrada = { tipo: 'recargarPagina', modulo: 'GLOBAL', detalle: 'restablece el proyecto' }
    expect(describirAccion(a)).toBe('recargarPagina (restablece el proyecto)  [GLOBAL]')
  })
})
