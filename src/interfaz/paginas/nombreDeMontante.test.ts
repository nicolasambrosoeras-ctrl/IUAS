import { describe, it, expect } from 'vitest'
import type { Proyecto } from '../../modelo/proyecto'
import { crearProyectoVacio } from './crearProyectoVacio'
import {
  nombreDeMontante,
  nombreDeMontanteDeIdentidad,
  nombreFallbackDeMontante,
} from './nombreDeMontante'

function conMontantes(montantes: NonNullable<Proyecto['montantes']>): Proyecto {
  return { ...crearProyectoVacio(), montantes }
}

describe('nombreDeMontante (M2-TOPO-C §5)', () => {
  it('fallback derivado numerado por red, en el orden de Proyecto.montantes', () => {
    const proyecto = conMontantes([
      { id: 'm-a', red: 'AF' },
      { id: 'm-b', red: 'AC' },
      { id: 'm-c', red: 'AF' },
      { id: 'm-d', red: 'AC' },
    ])
    expect(nombreDeMontante(proyecto, 'm-a')).toBe('Montante AF 1')
    expect(nombreDeMontante(proyecto, 'm-c')).toBe('Montante AF 2')
    expect(nombreDeMontante(proyecto, 'm-b')).toBe('Montante AC 1')
    expect(nombreDeMontante(proyecto, 'm-d')).toBe('Montante AC 2')
  })

  it('nombre personalizado tiene prioridad sobre el fallback', () => {
    const proyecto = conMontantes([
      { id: 'm-a', red: 'AF', nombre: 'Montante AF dormitorios' },
      { id: 'm-c', red: 'AF' },
    ])
    expect(nombreDeMontante(proyecto, 'm-a')).toBe('Montante AF dormitorios')
    // El personalizado NO consume número: el siguiente AF sigue siendo "2"
    // porque numera por posición en la red, no por "cuántos fallback hubo".
    expect(nombreDeMontante(proyecto, 'm-c')).toBe('Montante AF 2')
  })

  it('nombre en blanco (sólo espacios) cae al fallback', () => {
    const proyecto = conMontantes([{ id: 'm-a', red: 'AC', nombre: '   ' }])
    expect(nombreDeMontante(proyecto, 'm-a')).toBe('Montante AC 1')
  })

  it('id no encontrado: etiqueta legible, nunca el id técnico', () => {
    const proyecto = conMontantes([{ id: 'm-a', red: 'AF' }])
    expect(nombreDeMontante(proyecto, 'm-inexistente')).toBe('Montante (no encontrado)')
  })

  it('proyecto sin campo montantes: no lanza', () => {
    expect(nombreDeMontante(crearProyectoVacio(), 'lo-que-sea')).toBe('Montante (no encontrado)')
  })

  it('nombreFallbackDeMontante compone la etiqueta esperada', () => {
    expect(nombreFallbackDeMontante('AF', 3)).toBe('Montante AF 3')
    expect(nombreFallbackDeMontante('AC', 1)).toBe('Montante AC 1')
  })

  it('nombreDeMontanteDeIdentidad numera por red sin recorrer el proyecto', () => {
    const primero = { id: 'm-a', red: 'AF' as const }
    const segundo = { id: 'm-b', red: 'AF' as const }
    expect(nombreDeMontanteDeIdentidad([primero, segundo], segundo)).toBe('Montante AF 2')
  })
})
