import { describe, expect, it } from 'vitest'
import type { Proyecto } from '../../modelo/proyecto'
import { conHfEquipoACS, resolverCambioDeHfEquipoACS } from './actualizarHfEquipoACS'

function proyectoBase(): Proyecto {
  return {
    metadatos: {
      nombre: '',
      obra: '',
      comitente: '',
      fecha: '',
      schemaVersion: '1.0.0',
      versionNormativa: 'eras-2023',
    },
    parametros: { tipoDeProyecto: 'viviendaIndividual', presionSobreAcera_m: 0, alturaArtefactoMasDesfavorable_m: 0 },
    unidadesFuncionales: [],
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'estimado',
      granularidadHidraulica: 'simplificada',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

describe('conHfEquipoACS', () => {
  it('proyecto sin el campo -> establecer un valor lo agrega', () => {
    const resultado = conHfEquipoACS(proyectoBase(), 2.4)
    expect(resultado.hfEquipoACS_mca).toBe(2.4)
  })

  it('establecer 0 explícito -> se conserva como 0, no como ausente', () => {
    const resultado = conHfEquipoACS(proyectoBase(), 0)
    expect(resultado.hfEquipoACS_mca).toBe(0)
    expect('hfEquipoACS_mca' in resultado).toBe(true)
  })

  it('establecer undefined sobre un proyecto CON valor -> elimina la clave (vuelve a "no informado", nunca 0)', () => {
    const conValor: Proyecto = { ...proyectoBase(), hfEquipoACS_mca: 2.4 }
    const resultado = conHfEquipoACS(conValor, undefined)
    expect(resultado.hfEquipoACS_mca).toBeUndefined()
    expect('hfEquipoACS_mca' in resultado).toBe(false)
  })

  it('no muta el proyecto recibido', () => {
    const original = proyectoBase()
    conHfEquipoACS(original, 3)
    expect(original.hfEquipoACS_mca).toBeUndefined()
  })

  it('preserva el resto de los campos del proyecto', () => {
    const original = proyectoBase()
    const resultado = conHfEquipoACS(original, 1)
    expect(resultado.metadatos).toBe(original.metadatos)
    expect(resultado.configuracionHidraulica).toBe(original.configuracionHidraulica)
  })
})

describe('resolverCambioDeHfEquipoACS', () => {
  it('texto vacío -> omitir (nunca 0)', () => {
    expect(resolverCambioDeHfEquipoACS('')).toEqual({ tipo: 'omitir' })
  })

  it('número positivo -> establecer', () => {
    expect(resolverCambioDeHfEquipoACS('2.4')).toEqual({ tipo: 'establecer', hfEquipoACS_mca: 2.4 })
  })

  it('0 -> establecer 0 (valor válido y explícito)', () => {
    expect(resolverCambioDeHfEquipoACS('0')).toEqual({ tipo: 'establecer', hfEquipoACS_mca: 0 })
  })

  it('negativo -> ignorar, nunca llega al modelo', () => {
    expect(resolverCambioDeHfEquipoACS('-1')).toEqual({ tipo: 'ignorar' })
  })

  it('NaN (texto no numérico) -> ignorar', () => {
    expect(resolverCambioDeHfEquipoACS('abc')).toEqual({ tipo: 'ignorar' })
  })

  it('Infinity -> ignorar', () => {
    expect(resolverCambioDeHfEquipoACS('Infinity')).toEqual({ tipo: 'ignorar' })
  })
})
