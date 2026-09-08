import { describe, it, expect } from 'vitest'
import type { Artefacto, Local, TipoDeLocal } from '../../modelo/proyecto'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { candidatosContextualesDeArtefacto, sugerirArtefactoParaLocal } from './sugerenciaDeArtefacto'

const artefacto = (artefactoId: string, cantidad = 1): Artefacto => ({
  id: `a-${artefactoId}`,
  artefactoId,
  cantidad,
  origen: 'normativo',
})

const local = (tipo: TipoDeLocal, artefactos: readonly Artefacto[], regimen: Local['regimen'] = 'domiciliario'): Local => ({
  id: 'l-1',
  tipo,
  regimen,
  artefactos,
})

const idsDelCatalogo = new Set(catalogoArtefactos.map((c) => c.id))

describe('candidatosContextualesDeArtefacto', () => {
  it('todos los ids del mapping domiciliario existen en el catálogo eras-2023', () => {
    for (const tipo of ['bano', 'toilette', 'cocina', 'lavadero', 'jardin'] as const) {
      for (const id of candidatosContextualesDeArtefacto(tipo, 'domiciliario')) {
        expect(idsDelCatalogo.has(id), `${tipo} -> ${id}`).toBe(true)
      }
    }
  })

  it('orden domiciliario por Tipo de Local (brief §7)', () => {
    expect(candidatosContextualesDeArtefacto('bano', 'domiciliario')).toEqual([
      'inodoroDeposito',
      'bidet',
      'lavatorio',
      'receptaculoDucha',
      'banera',
    ])
    expect(candidatosContextualesDeArtefacto('toilette', 'domiciliario')).toEqual(['inodoroDeposito', 'lavatorio'])
    expect(candidatosContextualesDeArtefacto('cocina', 'domiciliario')).toEqual(['piletaDeCocina', 'maquinaLavavajillas'])
    expect(candidatosContextualesDeArtefacto('lavadero', 'domiciliario')).toEqual(['piletaDeLavar', 'maquinaLavarropas'])
    expect(candidatosContextualesDeArtefacto('jardin', 'domiciliario')).toEqual(['canillaDeServicio'])
  })

  it('"Inodoro con válvula automática" nunca es candidato de ningún Local domiciliario (brief §8)', () => {
    for (const tipo of ['bano', 'toilette', 'cocina', 'lavadero', 'jardin', 'cochera', 'otros'] as const) {
      expect(candidatosContextualesDeArtefacto(tipo, 'domiciliario')).not.toContain('inodoroValvula')
    }
  })

  it('cochera / otros: sin sugerencia contextual', () => {
    expect(candidatosContextualesDeArtefacto('cochera', 'domiciliario')).toEqual([])
    expect(candidatosContextualesDeArtefacto('otros', 'domiciliario')).toEqual([])
  })

  it('régimen no domiciliario o ausente: sin mapping firme, lista vacía (brief §13)', () => {
    expect(candidatosContextualesDeArtefacto('cocina', 'noDomiciliario')).toEqual([])
    expect(candidatosContextualesDeArtefacto('bano', undefined)).toEqual([])
  })
})

describe('sugerirArtefactoParaLocal', () => {
  it('Cocina domiciliaria vacía -> Pileta de cocina, NUNCA Inodoro con válvula (brief §3/§18)', () => {
    expect(sugerirArtefactoParaLocal(local('cocina', []))).toBe('piletaDeCocina')
  })

  it('Baño domiciliario: secuencia sin duplicados (brief §19)', () => {
    let arts: Artefacto[] = []
    const paso = () => {
      const s = sugerirArtefactoParaLocal(local('bano', arts))
      if (s) arts = [...arts, artefacto(s)]
      return s
    }
    expect(paso()).toBe('inodoroDeposito')
    expect(paso()).toBe('bidet')
    expect(paso()).toBe('lavatorio')
    expect(paso()).toBe('receptaculoDucha')
    expect(paso()).toBe('banera')
    expect(paso()).toBeUndefined() // agotados -> borrador
  })

  it('Cocina: Pileta -> Lavavajillas -> agotado (undefined) (brief §21)', () => {
    expect(sugerirArtefactoParaLocal(local('cocina', [artefacto('piletaDeCocina')]))).toBe('maquinaLavavajillas')
    expect(
      sugerirArtefactoParaLocal(local('cocina', [artefacto('piletaDeCocina'), artefacto('maquinaLavavajillas')])),
    ).toBeUndefined()
  })

  it('presencia por tipo, no por cantidad: Inodoro ×2 ⇒ siguiente es Bidet, no otro Inodoro (brief §24)', () => {
    expect(sugerirArtefactoParaLocal(local('bano', [artefacto('inodoroDeposito', 2)]))).toBe('bidet')
  })

  it('un tipo presente fuera de orden no rompe la secuencia: Baño con sólo Lavatorio ⇒ Inodoro a depósito', () => {
    expect(sugerirArtefactoParaLocal(local('bano', [artefacto('lavatorio')]))).toBe('inodoroDeposito')
  })

  it('régimen no domiciliario ⇒ sin sugerencia (borrador)', () => {
    expect(sugerirArtefactoParaLocal(local('cocina', [], 'noDomiciliario'))).toBeUndefined()
  })
})
