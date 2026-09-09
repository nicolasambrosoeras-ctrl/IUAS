// FIX-LEAK-01 (D-δ.85): el Panel de Módulo 3 mostraba el código interno de
// validación crudo. La traducción humana ahora es una fuente única
// (`mensajesDeValidacion.ts`) con política segura ante códigos inesperados.
import { describe, it, expect } from 'vitest'
import {
  MENSAJES_DE_VALIDACION,
  MENSAJE_DE_VALIDACION_GENERICO,
  describirProblemaDeValidacion,
} from './mensajesDeValidacion'
import { codigosValidacion, type CodigoValidacion } from '../../validacion/codigos'

// Patrón de un identificador interno camelCase (lo que NO debe verse).
const RE_CODIGO_INTERNO = /\b(?:redHidraulica|proyecto|catalogo|configuracion|parametros)[A-Z][A-Za-z]{6,}\b/

describe('describirProblemaDeValidacion', () => {
  it('traduce el caso del hallazgo (longitud de tramo ≤ 0) a un mensaje humano', () => {
    const msg = describirProblemaDeValidacion('redHidraulicaTramoLongitudNoPositiva')
    expect(msg).toBe('La longitud de un tramo debe ser mayor que cero.')
    expect(msg).not.toContain('redHidraulicaTramoLongitudNoPositiva')
    expect(msg).not.toMatch(RE_CODIGO_INTERNO)
  })

  it('traduce otro código conocido sin filtrar el identificador', () => {
    const msg = describirProblemaDeValidacion('configuracionMedidoresUnidadFuncionalInexistente')
    expect(msg).toMatch(/unidad funcional/i)
    expect(msg).not.toContain('configuracionMedidoresUnidadFuncionalInexistente')
  })

  it('un código desconocido cae al mensaje genérico, nunca al código crudo', () => {
    const msg = describirProblemaDeValidacion('codigoQueNoExisteTodavia' as CodigoValidacion)
    expect(msg).toBe(MENSAJE_DE_VALIDACION_GENERICO)
    expect(msg).not.toContain('codigoQueNoExisteTodavia')
    expect(msg).not.toContain('[object Object]')
    expect(msg).not.toContain('undefined')
    expect(msg).not.toMatch(RE_CODIGO_INTERNO)
  })

  it('entradas no-string caen al genérico (defensa ante datos corruptos)', () => {
    for (const raro of [undefined, null, 42, {}, []] as unknown[]) {
      expect(describirProblemaDeValidacion(raro as CodigoValidacion)).toBe(MENSAJE_DE_VALIDACION_GENERICO)
    }
  })

  it('TODO código de validación del dominio tiene copy humana propia y no genérica', () => {
    const codigos = Object.keys(codigosValidacion) as CodigoValidacion[]
    for (const codigo of codigos) {
      const msg = describirProblemaDeValidacion(codigo)
      expect(msg.trim().length, codigo).toBeGreaterThan(0)
      expect(msg, codigo).not.toBe(MENSAJE_DE_VALIDACION_GENERICO)
      expect(msg, codigo).not.toContain(codigo)
      expect(msg, codigo).not.toMatch(RE_CODIGO_INTERNO)
    }
  })

  it('la tabla cubre exactamente el catálogo de códigos de dominio', () => {
    expect(Object.keys(MENSAJES_DE_VALIDACION).sort()).toEqual(Object.keys(codigosValidacion).sort())
  })
})
