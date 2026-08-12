// Test de integracion de primitivas: encadena manualmente el pipeline
// comercial completo --
//   Qc -> predimensionamiento -> Di minimo -> candidatos comerciales ->
//   primer candidato -> Di efectivo -> velocidad real -> verificacion --
// usando exclusivamente las primitivas productivas ya existentes, sobre
// un catalogo ficticio de laboratorio. No crea ningun orquestador nuevo:
// la composicion es manual, solo dentro de este archivo de test, y no se
// exporta ni se reutiliza. Sin wiring a Proyecto/Tramo/resolverHidraulicaDeTramo/UI.
import { describe, it, expect } from 'vitest'
import { calcularPredimensionamientoDeTramo } from '../predimensionamiento/calcularPredimensionamientoDeTramo'
import { obtenerCandidatosDeDiametroComercial } from './obtenerCandidatosDeDiametroComercial'
import type { SistemaDeTuberia } from './obtenerCandidatosDeDiametroComercial'
import { calcularVelocidad } from '../perdidaCarga/darcyWeisbach/calcularVelocidad'
import { verificarVelocidadAdmisible } from '../velocidad/verificarVelocidadAdmisible'

// Catalogo ficticio de LABORATORIO, explicitamente sin material/norma/marca
// asociados -- mismas entradas ya usadas en obtenerCandidatosDeDiametroComercial.test.ts.
const SISTEMA_LABORATORIO: SistemaDeTuberia = {
  id: 'sistema-laboratorio',
  denominacion: 'Sistema de laboratorio (ficticio, sin material ni norma asociados)',
  entradas: [
    { denominacionComercial: 'A', diametroInteriorEfectivo_mm: 15 },
    { denominacionComercial: 'B', diametroInteriorEfectivo_mm: 20 },
    { denominacionComercial: 'C', diametroInteriorEfectivo_mm: 25 },
    { denominacionComercial: 'D', diametroInteriorEfectivo_mm: 32 },
    { denominacionComercial: 'E', diametroInteriorEfectivo_mm: 40 },
  ],
}

describe('pipeline comercial de dimensionamiento — integración de primitivas existentes', () => {
  it('Caso 1 — Qc=0.28 l/s (representativo de tramo demo): candidato admisible', () => {
    const qc_lps = 0.28

    const { diReferenciaPredimensionamiento_mm } = calcularPredimensionamientoDeTramo(qc_lps)
    const candidatos = obtenerCandidatosDeDiametroComercial(diReferenciaPredimensionamiento_mm, SISTEMA_LABORATORIO)
    expect(candidatos.length).toBeGreaterThan(0)

    const candidato = candidatos[0]!
    expect(candidato.diametroInteriorEfectivo_mm).toBeGreaterThanOrEqual(diReferenciaPredimensionamiento_mm)

    const velocidadReal_mps = calcularVelocidad(qc_lps, candidato.diametroInteriorEfectivo_mm)
    const resultado = verificarVelocidadAdmisible(velocidadReal_mps, candidato.diametroInteriorEfectivo_mm)

    // Valores derivados de las primitivas reales, no copiados:
    // Di_min≈13.351162356249091mm -> candidato "A" (15mm) ->
    // V_real≈1.584475877892647 m/s -> admisible en [1,3] (D=15mm).
    expect(diReferenciaPredimensionamiento_mm).toBeCloseTo(13.351162356249091, 9)
    expect(candidato.denominacionComercial).toBe('A')
    expect(candidato.diametroInteriorEfectivo_mm).toBe(15)
    expect(velocidadReal_mps).toBeCloseTo(1.584475877892647, 9)
    expect(resultado).toEqual({ tipo: 'admisible', limiteMinimo_mps: 1, limiteMaximo_mps: 3 })

    // Propiedad CRIT-A19: mismo Qc en predimensionamiento y verificación
    // -> velocidad real <= Ve de predimensionamiento (2,0 m/s).
    expect(velocidadReal_mps).toBeLessThanOrEqual(2.0)
  })

  it('Caso 2 — Qc=0.12 l/s (otro Qc del demo): candidato resulta noAdmisible (velocidad real por debajo del mínimo)', () => {
    const qc_lps = 0.12

    const { diReferenciaPredimensionamiento_mm } = calcularPredimensionamientoDeTramo(qc_lps)
    const candidatos = obtenerCandidatosDeDiametroComercial(diReferenciaPredimensionamiento_mm, SISTEMA_LABORATORIO)
    expect(candidatos.length).toBeGreaterThan(0)

    const candidato = candidatos[0]!
    expect(candidato.diametroInteriorEfectivo_mm).toBeGreaterThanOrEqual(diReferenciaPredimensionamiento_mm)

    const velocidadReal_mps = calcularVelocidad(qc_lps, candidato.diametroInteriorEfectivo_mm)
    const resultado = verificarVelocidadAdmisible(velocidadReal_mps, candidato.diametroInteriorEfectivo_mm)

    // Resultado real, sin ajustar el catálogo para forzar cumplimiento:
    // Di_min≈8.740387444736633mm -> el catálogo de laboratorio no tiene
    // ninguna entrada menor a 15mm -> candidato "A" (15mm) sobredimensiona
    // bastante este caudal -> V_real≈0.679 m/s, por debajo del mínimo
    // normativo de 1 m/s para D=15mm.
    expect(diReferenciaPredimensionamiento_mm).toBeCloseTo(8.740387444736633, 9)
    expect(candidato.diametroInteriorEfectivo_mm).toBe(15)
    expect(velocidadReal_mps).toBeCloseTo(0.6790610905254201, 9)
    expect(resultado).toEqual({ tipo: 'noAdmisible', limiteMinimo_mps: 1, limiteMaximo_mps: 3 })
  })

  it('Caso 3 — sin candidato: Qc grande frente al catálogo de laboratorio', () => {
    const qc_lps = 5

    const { diReferenciaPredimensionamiento_mm } = calcularPredimensionamientoDeTramo(qc_lps)
    expect(diReferenciaPredimensionamiento_mm).toBeCloseTo(56.418958354775626, 9)

    const candidatos = obtenerCandidatosDeDiametroComercial(diReferenciaPredimensionamiento_mm, SISTEMA_LABORATORIO)
    expect(candidatos).toEqual([])
  })

  it('Caso 4 — candidato suficiente por sección pero con velocidad noAdmisible (salto comercial grande)', () => {
    // Catalogo de laboratorio deliberadamente distinto, con un salto
    // grande entre entradas, para demostrar en integración la propiedad
    // ya documentada en CRIT-A19: un diámetro suficiente por Di_min puede
    // igualmente fallar por velocidad mínima.
    const sistemaConSaltoGrande: SistemaDeTuberia = {
      id: 'sistema-laboratorio-salto',
      denominacion: 'Sistema de laboratorio con salto comercial grande (ficticio)',
      entradas: [
        { denominacionComercial: 'F', diametroInteriorEfectivo_mm: 13 },
        { denominacionComercial: 'G', diametroInteriorEfectivo_mm: 60 },
      ],
    }
    const qc_lps = 0.31

    const { diReferenciaPredimensionamiento_mm } = calcularPredimensionamientoDeTramo(qc_lps)
    expect(diReferenciaPredimensionamiento_mm).toBeCloseTo(14.048207338801284, 9) // > 13mm: "F" queda excluida

    const candidatos = obtenerCandidatosDeDiametroComercial(diReferenciaPredimensionamiento_mm, sistemaConSaltoGrande)
    const candidato = candidatos[0]!
    expect(candidato.denominacionComercial).toBe('G')
    expect(candidato.diametroInteriorEfectivo_mm).toBe(60)
    expect(candidato.diametroInteriorEfectivo_mm).toBeGreaterThanOrEqual(diReferenciaPredimensionamiento_mm)

    const velocidadReal_mps = calcularVelocidad(qc_lps, candidato.diametroInteriorEfectivo_mm)
    const resultado = verificarVelocidadAdmisible(velocidadReal_mps, candidato.diametroInteriorEfectivo_mm)

    expect(velocidadReal_mps).toBeCloseTo(0.10964007190775013, 9)
    expect(resultado.tipo).toBe('noAdmisible')
    expect(resultado).toEqual({ tipo: 'noAdmisible', limiteMinimo_mps: 1, limiteMaximo_mps: 3 })
  })

  it('Caso 5 — candidato dentro del hueco normativo 60-75mm: fueraDeDominioNormativo, sin throw', () => {
    const sistemaConHueco: SistemaDeTuberia = {
      id: 'sistema-laboratorio-hueco',
      denominacion: 'Sistema de laboratorio con diámetro en el hueco normativo (ficticio)',
      entradas: [{ denominacionComercial: 'H', diametroInteriorEfectivo_mm: 68 }],
    }
    const qc_lps = 1

    const { diReferenciaPredimensionamiento_mm } = calcularPredimensionamientoDeTramo(qc_lps)
    const candidatos = obtenerCandidatosDeDiametroComercial(diReferenciaPredimensionamiento_mm, sistemaConHueco)
    const candidato = candidatos[0]!
    expect(candidato.diametroInteriorEfectivo_mm).toBe(68)
    expect(candidato.diametroInteriorEfectivo_mm).toBeGreaterThanOrEqual(diReferenciaPredimensionamiento_mm)

    const velocidadReal_mps = calcularVelocidad(qc_lps, candidato.diametroInteriorEfectivo_mm)
    expect(() => verificarVelocidadAdmisible(velocidadReal_mps, candidato.diametroInteriorEfectivo_mm)).not.toThrow()

    const resultado = verificarVelocidadAdmisible(velocidadReal_mps, candidato.diametroInteriorEfectivo_mm)
    expect(resultado).toEqual({ tipo: 'fueraDeDominioNormativo' })
  })
})
