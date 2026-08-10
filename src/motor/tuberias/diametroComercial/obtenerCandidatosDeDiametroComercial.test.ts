import { describe, it, expect } from 'vitest'
import { obtenerCandidatosDeDiametroComercial } from './obtenerCandidatosDeDiametroComercial'
import type { SistemaDeTuberia } from './obtenerCandidatosDeDiametroComercial'

// Catalogo ficticio de LABORATORIO, explicitamente sin material/norma/marca
// asociados -- denominaciones arbitrarias (A..E), solo para ejercitar la
// primitiva de seleccion por diametro interior efectivo.
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

describe('obtenerCandidatosDeDiametroComercial', () => {
  it('1. Di mínimo exactamente igual a una entrada: esa entrada se incluye', () => {
    const candidatos = obtenerCandidatosDeDiametroComercial(25, SISTEMA_LABORATORIO)
    expect(candidatos.map((c) => c.denominacionComercial)).toEqual(['C', 'D', 'E'])
  })

  it('2. Di mínimo entre dos entradas: la primera devuelta es la inmediatamente superior', () => {
    const candidatos = obtenerCandidatosDeDiametroComercial(21, SISTEMA_LABORATORIO)
    expect(candidatos[0]?.denominacionComercial).toBe('C')
    expect(candidatos[0]?.diametroInteriorEfectivo_mm).toBe(25)
  })

  it('3. Di mínimo menor que todas: devuelve todas, ordenadas ascendentemente', () => {
    const candidatos = obtenerCandidatosDeDiametroComercial(1, SISTEMA_LABORATORIO)
    expect(candidatos.map((c) => c.diametroInteriorEfectivo_mm)).toEqual([15, 20, 25, 32, 40])
  })

  it('4. Di mínimo mayor que todas: devuelve []', () => {
    expect(obtenerCandidatosDeDiametroComercial(1000, SISTEMA_LABORATORIO)).toEqual([])
  })

  it('5. catálogo declarado desordenado: la salida queda ordenada por diámetro interior efectivo', () => {
    const sistemaDesordenado: SistemaDeTuberia = {
      id: 'sistema-desordenado',
      denominacion: 'Sistema de laboratorio desordenado (ficticio)',
      entradas: [
        { denominacionComercial: 'E', diametroInteriorEfectivo_mm: 40 },
        { denominacionComercial: 'A', diametroInteriorEfectivo_mm: 15 },
        { denominacionComercial: 'C', diametroInteriorEfectivo_mm: 25 },
        { denominacionComercial: 'B', diametroInteriorEfectivo_mm: 20 },
        { denominacionComercial: 'D', diametroInteriorEfectivo_mm: 32 },
      ],
    }
    const candidatos = obtenerCandidatosDeDiametroComercial(1, sistemaDesordenado)
    expect(candidatos.map((c) => c.denominacionComercial)).toEqual(['A', 'B', 'C', 'D', 'E'])
  })

  it('6. no muta el catálogo original', () => {
    const copiaEntradas = [...SISTEMA_LABORATORIO.entradas]
    obtenerCandidatosDeDiametroComercial(21, SISTEMA_LABORATORIO)
    expect(SISTEMA_LABORATORIO.entradas).toEqual(copiaEntradas)
  })

  it('7. dos entradas con el mismo diámetro interior: se conservan ambas, orden original como desempate', () => {
    const sistemaConEmpate: SistemaDeTuberia = {
      id: 'sistema-empate',
      denominacion: 'Sistema de laboratorio con empate (ficticio)',
      entradas: [
        { denominacionComercial: 'X1', diametroInteriorEfectivo_mm: 25 },
        { denominacionComercial: 'X2', diametroInteriorEfectivo_mm: 25 },
        { denominacionComercial: 'X3', diametroInteriorEfectivo_mm: 30 },
      ],
    }
    const candidatos = obtenerCandidatosDeDiametroComercial(20, sistemaConEmpate)
    expect(candidatos.map((c) => c.denominacionComercial)).toEqual(['X1', 'X2', 'X3'])
  })

  it('8. lanza excepción si diMinimo_mm <= 0', () => {
    expect(() => obtenerCandidatosDeDiametroComercial(0, SISTEMA_LABORATORIO)).toThrow()
    expect(() => obtenerCandidatosDeDiametroComercial(-10, SISTEMA_LABORATORIO)).toThrow()
  })

  it('9. lanza excepción si cualquier entrada del catálogo tiene diametroInteriorEfectivo_mm <= 0 (incluso si no sería candidata)', () => {
    const sistemaInvalido: SistemaDeTuberia = {
      id: 'sistema-invalido',
      denominacion: 'Sistema de laboratorio inválido (ficticio)',
      entradas: [
        { denominacionComercial: 'A', diametroInteriorEfectivo_mm: 15 },
        { denominacionComercial: 'Z', diametroInteriorEfectivo_mm: 0 },
      ],
    }
    // diMinimo_mm=1000 haria que ninguna entrada calificara como candidata,
    // pero la validacion estructural del catalogo debe ocurrir de todas formas.
    expect(() => obtenerCandidatosDeDiametroComercial(1000, sistemaInvalido)).toThrow()

    const sistemaNegativo: SistemaDeTuberia = {
      id: 'sistema-negativo',
      denominacion: 'Sistema de laboratorio inválido (ficticio)',
      entradas: [{ denominacionComercial: 'A', diametroInteriorEfectivo_mm: -5 }],
    }
    expect(() => obtenerCandidatosDeDiametroComercial(1, sistemaNegativo)).toThrow()
  })
})
