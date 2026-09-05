import { describe, it, expect } from 'vitest'
import type { Proyecto } from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { conAccesoriosDeTramo, conCotaDeNodo, conLongitudDeTramo, conTeeDeNodo } from './actualizarRedHidraulica'

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

describe('conAccesoriosDeTramo', () => {
  it('setea accesorios en un tramo sin relevar (undefined) -> [] es un relevado real, no un no-op', () => {
    const original = proyectoDePrueba(redDeDosTramos())

    const actualizado = conAccesoriosDeTramo(original, 't1', [])

    const tramoActualizado = actualizado.redHidraulica?.tramos.find((t) => t.id === 't1')
    expect(tramoActualizado?.accesorios).toEqual([])
  })

  it('agrega/reemplaza la lista completa de accesorios', () => {
    const original = proyectoDePrueba(redDeDosTramos())

    const actualizado = conAccesoriosDeTramo(original, 't1', [{ tipo: 'codo90', cantidad: 2 }])

    const tramoActualizado = actualizado.redHidraulica?.tramos.find((t) => t.id === 't1')
    expect(tramoActualizado?.accesorios).toEqual([{ tipo: 'codo90', cantidad: 2 }])
  })

  it('vaciar con undefined vuelve al estado "no relevado" (campo ausente, nunca [])', () => {
    const conAccesorios = conAccesoriosDeTramo(proyectoDePrueba(redDeDosTramos()), 't1', [{ tipo: 'codo90', cantidad: 1 }])

    const actualizado = conAccesoriosDeTramo(conAccesorios, 't1', undefined)

    const tramoActualizado = actualizado.redHidraulica?.tramos.find((t) => t.id === 't1')
    expect('accesorios' in (tramoActualizado as object)).toBe(false)
  })

  it('preserva el resto de los tramos y del Proyecto', () => {
    const original = proyectoDePrueba(redDeDosTramos())

    const actualizado = conAccesoriosDeTramo(original, 't1', [])

    const t2Actualizado = actualizado.redHidraulica?.tramos.find((t) => t.id === 't2')
    const t2Original = original.redHidraulica?.tramos.find((t) => t.id === 't2')
    expect(t2Actualizado).toBe(t2Original)
    expect(actualizado.unidadesFuncionales).toBe(original.unidadesFuncionales)
  })

  it('redHidraulica ausente: no-op', () => {
    const original = proyectoDePrueba()
    expect(conAccesoriosDeTramo(original, 't1', [])).toBe(original)
  })
})

function redConBifurcacion(): RedHidraulica {
  const nodos: Nodo[] = [{ id: 'raiz' }, { id: 'mid' }, { id: 'a' }, { id: 'b' }]
  const tramos: Tramo[] = [
    { id: 't0', nodoOrigenId: 'raiz', nodoDestinoId: 'mid', red: 'AF' },
    { id: 't1', nodoOrigenId: 'mid', nodoDestinoId: 'a', red: 'AF' },
    { id: 't2', nodoOrigenId: 'mid', nodoDestinoId: 'b', red: 'AF' },
  ]
  return { nodos, tramos }
}

describe('conTeeDeNodo', () => {
  it('configura entradaCentral en un nodo de bifurcacion sin tee previa', () => {
    const original = proyectoDePrueba(redConBifurcacion())

    const actualizado = conTeeDeNodo(original, 'mid', { tipo: 'entradaCentral' })

    const nodoActualizado = actualizado.redHidraulica?.nodos.find((n) => n.id === 'mid')
    expect(nodoActualizado?.tee).toEqual({ tipo: 'entradaCentral' })
  })

  it('configura entradaPorExtremo indicando la salida recta', () => {
    const original = proyectoDePrueba(redConBifurcacion())

    const actualizado = conTeeDeNodo(original, 'mid', { tipo: 'entradaPorExtremo', tramoSalidaRectaId: 't1' })

    const nodoActualizado = actualizado.redHidraulica?.nodos.find((n) => n.id === 'mid')
    expect(nodoActualizado?.tee).toEqual({ tipo: 'entradaPorExtremo', tramoSalidaRectaId: 't1' })
  })

  it('vaciar con undefined vuelve a "sin configurar" (campo ausente, nunca un valor por defecto)', () => {
    const conTee = conTeeDeNodo(proyectoDePrueba(redConBifurcacion()), 'mid', { tipo: 'entradaCentral' })

    const actualizado = conTeeDeNodo(conTee, 'mid', undefined)

    const nodoActualizado = actualizado.redHidraulica?.nodos.find((n) => n.id === 'mid')
    expect('tee' in (nodoActualizado as object)).toBe(false)
  })

  it('preserva el resto de los nodos y del Proyecto', () => {
    const original = proyectoDePrueba(redConBifurcacion())

    const actualizado = conTeeDeNodo(original, 'mid', { tipo: 'entradaCentral' })

    const nodoA_actualizado = actualizado.redHidraulica?.nodos.find((n) => n.id === 'a')
    const nodoA_original = original.redHidraulica?.nodos.find((n) => n.id === 'a')
    expect(nodoA_actualizado).toBe(nodoA_original)
    expect(actualizado.redHidraulica?.tramos).toBe(original.redHidraulica?.tramos)
  })

  it('redHidraulica ausente: no-op', () => {
    const original = proyectoDePrueba()
    expect(conTeeDeNodo(original, 'mid', { tipo: 'entradaCentral' })).toBe(original)
  })
})

describe('conCotaDeNodo', () => {
  it('setea cota_m en un nodo existente', () => {
    const original = proyectoDePrueba(redDeDosTramos())

    const actualizado = conCotaDeNodo(original, 'n1', 3.5)

    expect(actualizado.redHidraulica?.nodos.find((n) => n.id === 'n1')?.cota_m).toBe(3.5)
  })

  it('admite cota_m negativa (punto por debajo del datum)', () => {
    const original = proyectoDePrueba(redDeDosTramos())

    const actualizado = conCotaDeNodo(original, 'n1', -2)

    expect(actualizado.redHidraulica?.nodos.find((n) => n.id === 'n1')?.cota_m).toBe(-2)
  })

  it('vaciar con undefined deja el campo ausente, nunca 0', () => {
    const conCota = conCotaDeNodo(proyectoDePrueba(redDeDosTramos()), 'n1', 3)

    const actualizado = conCotaDeNodo(conCota, 'n1', undefined)

    expect('cota_m' in (actualizado.redHidraulica?.nodos.find((n) => n.id === 'n1') as object)).toBe(false)
  })

  it('redHidraulica ausente: no-op', () => {
    const original = proyectoDePrueba()
    expect(conCotaDeNodo(original, 'n1', 3)).toBe(original)
  })
})
