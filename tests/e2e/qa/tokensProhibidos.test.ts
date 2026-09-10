// QA-FUZZ-01 · tokens prohibidos en la UI (brief §13-F/G/H), con guardas
// contra falsos positivos en contenido técnico legítimo.
import { describe, it, expect } from 'vitest'
import {
  buscarValoresRotos,
  buscarIdsInternos,
  buscarCodigosDeValidacion,
  buscarTokensProhibidos,
} from './tokensProhibidos'

describe('buscarValoresRotos', () => {
  it('detecta NaN pegado a una unidad', () => {
    expect(buscarValoresRotos('Pérdida de carga hf: NaN m.c.a.')).toHaveLength(1)
    expect(buscarValoresRotos('Caudal = NaN L/s')).toHaveLength(1)
  })
  it('detecta undefined / null aislados en una celda', () => {
    expect(buscarValoresRotos('DN: undefined')).toHaveLength(1)
    expect(buscarValoresRotos('Régimen: null')).toHaveLength(1)
  })
  it('detecta [object Object] e Infinity', () => {
    expect(buscarValoresRotos('valor [object Object]')).toHaveLength(1)
    expect(buscarValoresRotos('relación = Infinity')).toHaveLength(1)
    expect(buscarValoresRotos('h = -Infinity m')).toHaveLength(1)
  })
  it('NO marca palabras que contienen la subcadena (annuller, nullable...)', () => {
    expect(buscarValoresRotos('anular la selección no es un problema')).toHaveLength(0)
    expect(buscarValoresRotos('el campo es nullable en el modelo interno')).toHaveLength(0)
  })
  it('NO marca prosa técnica legítima sobre "sin definir"', () => {
    expect(buscarValoresRotos('El nivel quedó sin clasificar y la cota sin definir.')).toHaveLength(0)
    expect(buscarValoresRotos('Seleccionar… — sin definir —')).toHaveLength(0)
  })
})

describe('buscarIdsInternos', () => {
  it('detecta uf-<uuid> visible', () => {
    expect(buscarIdsInternos('Unidad funcional uf-1f0a2b3c-4d5e-6f70-8a90-b1c2d3e4f506 · PB')).toHaveLength(1)
    expect(buscarIdsInternos('artefacto-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')).toHaveLength(1)
  })
  it('detecta las identidades y segmentos de montante de M2-TOPO-C', () => {
    expect(buscarIdsInternos('Montante montante-1f0a2b3c-4d5e-6f70-8a90-b1c2d3e4f506')).toHaveLength(1)
    expect(buscarIdsInternos('nodo-montante-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')).toHaveLength(1)
    expect(buscarIdsInternos('tramo-montante-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee')).toHaveLength(1)
  })
  it('NO marca los ids legibles del proyecto de ejemplo (local-bano, artefacto-1)', () => {
    expect(buscarIdsInternos('local-bano / artefacto-1 / artefacto-12')).toHaveLength(0)
  })
  it('NO marca un UUID cualquiera sin prefijo de entidad', () => {
    expect(buscarIdsInternos('trace 1f0a2b3c-4d5e-6f70-8a90-b1c2d3e4f506')).toHaveLength(0)
  })
})

describe('buscarCodigosDeValidacion', () => {
  it('detecta códigos camelCase internos', () => {
    expect(buscarCodigosDeValidacion('Error: configuracionAbastecimientoEsquemaInvalido')).toHaveLength(1)
    expect(buscarCodigosDeValidacion('redHidraulicaTramoNodoInexistente en el tramo')).toHaveLength(1)
    expect(buscarCodigosDeValidacion('proyectoRegimenLocalAusente')).toHaveLength(1)
  })
  it('NO marca copy en español normal', () => {
    expect(
      buscarCodigosDeValidacion('Debe seleccionar el régimen del local antes de calcular la demanda.'),
    ).toHaveLength(0)
    expect(buscarCodigosDeValidacion('La configuración avanzada permite elegir el método.')).toHaveLength(0)
  })
})

describe('buscarTokensProhibidos', () => {
  it('combina las tres familias', () => {
    const texto = 'DN: undefined · uf-1f0a2b3c-4d5e-6f70-8a90-b1c2d3e4f506 · configuracionMedidoresUnidadFuncionalInexistente'
    expect(buscarTokensProhibidos(texto).map((h) => h.clase).sort()).toEqual([
      'codigo-validacion',
      'id-interno',
      'valor-roto',
    ])
  })
  it('texto sano no dispara nada', () => {
    expect(
      buscarTokensProhibidos('Caudal de cálculo · Qc 0,42 L/s · n = 12 · Qmax 1,80 L/s. Todos los datos pueden modificarse.'),
    ).toHaveLength(0)
  })
})
