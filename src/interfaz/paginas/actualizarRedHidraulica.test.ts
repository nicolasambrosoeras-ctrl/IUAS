import { describe, it, expect } from 'vitest'
import type { Proyecto } from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { conLongitudDeTramo } from './actualizarRedHidraulica'

function proyectoDePrueba(redHidraulica?: RedHidraulica): Proyecto {
  return {
    metadatos: {
      nombre: 'Proyecto de prueba',
      obra: 'Obra de prueba',
      comitente: 'Comitente de prueba',
      fecha: '2026-01-01',
      schemaVersion: '1.0.0',
      versionNormativa: 'eras-2023',
    },
    parametros: {
      tipoDeProyecto: 'viviendaIndividual',
      presionSobreAcera_m: 2,
      alturaArtefactoMasDesfavorable_m: 3,
    },
    unidadesFuncionales: [{ id: 'uf-1', nombre: 'UF 1', locales: [] }],
    configuracionHidraulica: { metodoPerdidaDistribuida: 'hazenWilliams', metodoPerdidaLocalizada: 'detallado', materialTuberiaId: 'ppr', sistemaDeTuberiaId: 'acquaSystemMagnumPn20' },
    ...(redHidraulica !== undefined ? { redHidraulica } : {}),
  }
}

function redDeDosTramos(): RedHidraulica {
  const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1' }, { id: 'n2' }]
  const tramos: Tramo[] = [
    { id: 't1', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
    { id: 't2', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF', longitud_m: 3 },
  ]
  return { nodos, tramos }
}

describe('conLongitudDeTramo', () => {
  it('L1-A: setea longitud_m en un tramo existente sin longitud previa', () => {
    const original = proyectoDePrueba(redDeDosTramos())

    const actualizado = conLongitudDeTramo(original, 't1', 5)

    const tramoActualizado = actualizado.redHidraulica?.tramos.find((t) => t.id === 't1')
    expect(tramoActualizado?.longitud_m).toBe(5)
    const otroTramoOriginal = original.redHidraulica?.tramos.find((t) => t.id === 't1')
    expect(otroTramoOriginal?.longitud_m).toBeUndefined()
  })

  it('L1-B: cambia una longitud_m ya existente', () => {
    const original = proyectoDePrueba(redDeDosTramos())

    const actualizado = conLongitudDeTramo(original, 't2', 7.5)

    const tramoActualizado = actualizado.redHidraulica?.tramos.find((t) => t.id === 't2')
    expect(tramoActualizado?.longitud_m).toBe(7.5)
    const tramoOriginal = original.redHidraulica?.tramos.find((t) => t.id === 't2')
    expect(tramoOriginal?.longitud_m).toBe(3)
  })

  it('L1-C: vaciar longitud_m (undefined) deja el campo ausente, nunca 0', () => {
    const original = proyectoDePrueba(redDeDosTramos())

    const actualizado = conLongitudDeTramo(original, 't2', undefined)

    const tramoActualizado = actualizado.redHidraulica?.tramos.find((t) => t.id === 't2')
    expect(tramoActualizado?.longitud_m).toBeUndefined()
    expect('longitud_m' in (tramoActualizado as object)).toBe(false)
  })

  it('L1-D: preserva nodos, el resto de los tramos, los demas campos del tramo objetivo, y el resto del Proyecto', () => {
    const original = proyectoDePrueba(redDeDosTramos())

    const actualizado = conLongitudDeTramo(original, 't1', 10)

    expect(actualizado.redHidraulica?.nodos).toBe(original.redHidraulica?.nodos)

    const t2Actualizado = actualizado.redHidraulica?.tramos.find((t) => t.id === 't2')
    const t2Original = original.redHidraulica?.tramos.find((t) => t.id === 't2')
    expect(t2Actualizado).toBe(t2Original)

    const t1Actualizado = actualizado.redHidraulica?.tramos.find((t) => t.id === 't1')
    expect(t1Actualizado?.nodoOrigenId).toBe('n0')
    expect(t1Actualizado?.nodoDestinoId).toBe('n1')
    expect(t1Actualizado?.red).toBe('AF')

    expect(actualizado.metadatos).toBe(original.metadatos)
    expect(actualizado.parametros).toBe(original.parametros)
    expect(actualizado.unidadesFuncionales).toBe(original.unidadesFuncionales)
    expect(actualizado.configuracionHidraulica).toBe(original.configuracionHidraulica)
  })

  it('L1-E: tramoId inexistente no cambia ningun tramo (mismo criterio que los updaters por id ya existentes en la UI: no-op silencioso)', () => {
    const original = proyectoDePrueba(redDeDosTramos())

    const actualizado = conLongitudDeTramo(original, 'tramo-inexistente', 5)

    expect(actualizado.redHidraulica?.tramos.find((t) => t.id === 't1')).toEqual(
      original.redHidraulica?.tramos.find((t) => t.id === 't1'),
    )
    expect(actualizado.redHidraulica?.tramos.find((t) => t.id === 't2')).toEqual(
      original.redHidraulica?.tramos.find((t) => t.id === 't2'),
    )
  })

  it('redHidraulica ausente: no la inventa, devuelve el Proyecto sin cambios', () => {
    const original = proyectoDePrueba()

    const actualizado = conLongitudDeTramo(original, 't1', 5)

    expect(actualizado).toBe(original)
    expect(actualizado.redHidraulica).toBeUndefined()
  })
})
