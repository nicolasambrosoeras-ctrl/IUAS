import { describe, it, expect } from 'vitest'
import type { Proyecto } from '../../modelo/proyecto'
import {
  conEsquemaDeAbastecimiento,
  conPeriodoConsumoMaximo,
  conVolumenTanqueBombeoAdoptado,
  conVolumenTanqueElevadoAdoptado,
} from './actualizarConfiguracionAbastecimiento'

function proyectoBase(): Proyecto {
  return {
    metadatos: {
      nombre: 'Proyecto de prueba',
      obra: 'Obra',
      comitente: 'Comitente',
      fecha: '2026-01-01',
      schemaVersion: '1.0.0',
      versionNormativa: 'eras-2023',
    },
    parametros: {
      tipoDeProyecto: 'viviendaIndividual',
      presionSobreAcera_m: 2,
      alturaArtefactoMasDesfavorable_m: 3,
    },
    unidadesFuncionales: [
      {
        id: 'uf-1',
        nombre: 'UF 1',
        locales: [
          {
            id: 'local-1',
            tipo: 'bano',
            regimen: 'domiciliario',
            artefactos: [{ id: 'a-1', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }],
          },
        ],
      },
    ],
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'detallado',
      granularidadHidraulica: 'profesional',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

describe('actualizarConfiguracionAbastecimiento (D-δ.63)', () => {
  it('elegir el esquema inicia M4 (antes: configuracionAbastecimiento ausente)', () => {
    const base = proyectoBase()
    expect(base.configuracionAbastecimiento).toBeUndefined()

    const conEsquema = conEsquemaDeAbastecimiento(base, 'tanqueElevado')
    expect(conEsquema.configuracionAbastecimiento).toEqual({ esquema: 'tanqueElevado' })
  })

  it('no muta el proyecto original (updater inmutable)', () => {
    const base = proyectoBase()
    const copia = structuredClone(base)
    conEsquemaDeAbastecimiento(base, 'directa')
    expect(base).toEqual(copia)
  })

  it('C10: cambiar el esquema no toca ningún otro dato del Proyecto', () => {
    const base = proyectoBase()
    const resultado = conEsquemaDeAbastecimiento(base, 'cisternaBombeoElevado')
    expect(resultado.metadatos).toBe(base.metadatos)
    expect(resultado.parametros).toBe(base.parametros)
    expect(resultado.unidadesFuncionales).toBe(base.unidadesFuncionales)
    expect(resultado.configuracionHidraulica).toBe(base.configuracionHidraulica)
  })

  it('tanqueElevado -> cisternaBombeoElevado conserva el Tc (mismo parámetro de reserva)', () => {
    let proyecto = conEsquemaDeAbastecimiento(proyectoBase(), 'tanqueElevado')
    proyecto = conPeriodoConsumoMaximo(proyecto, 2)
    proyecto = conEsquemaDeAbastecimiento(proyecto, 'cisternaBombeoElevado')
    expect(proyecto.configuracionAbastecimiento).toEqual({
      esquema: 'cisternaBombeoElevado',
      periodoConsumoMaximo_h: 2,
    })
  })

  it('cambiar a directa descarta el Tc (ese esquema no lo consume)', () => {
    let proyecto = conEsquemaDeAbastecimiento(proyectoBase(), 'tanqueElevado')
    proyecto = conPeriodoConsumoMaximo(proyecto, 3)
    proyecto = conEsquemaDeAbastecimiento(proyecto, 'directa')
    expect(proyecto.configuracionAbastecimiento).toEqual({ esquema: 'directa' })
  })

  it('directa -> tanqueElevado deja el Tc ausente (queda incompleto hasta que el usuario lo fije)', () => {
    let proyecto = conEsquemaDeAbastecimiento(proyectoBase(), 'directa')
    proyecto = conEsquemaDeAbastecimiento(proyecto, 'tanqueElevado')
    expect(proyecto.configuracionAbastecimiento).toEqual({ esquema: 'tanqueElevado' })
  })

  it('conPeriodoConsumoMaximo fija y quita el Tc sin aplicar clamp', () => {
    let proyecto = conEsquemaDeAbastecimiento(proyectoBase(), 'tanqueElevado')

    proyecto = conPeriodoConsumoMaximo(proyecto, 4)
    expect(proyecto.configuracionAbastecimiento?.periodoConsumoMaximo_h).toBe(4)

    // Valor fuera de rango: el updater NO corrige, lo persiste tal cual;
    // la validación lo marca como error aparte.
    proyecto = conPeriodoConsumoMaximo(proyecto, 9)
    expect(proyecto.configuracionAbastecimiento?.periodoConsumoMaximo_h).toBe(9)

    proyecto = conPeriodoConsumoMaximo(proyecto, undefined)
    expect(proyecto.configuracionAbastecimiento).toEqual({ esquema: 'tanqueElevado' })
  })

  it('conPeriodoConsumoMaximo con M4 no iniciado -> throw', () => {
    expect(() => conPeriodoConsumoMaximo(proyectoBase(), 2)).toThrow(/Módulo 4 no iniciado/)
  })

  it('quitar un Tc ausente es idempotente (devuelve el mismo objeto)', () => {
    const proyecto = conEsquemaDeAbastecimiento(proyectoBase(), 'tanqueElevado')
    expect(conPeriodoConsumoMaximo(proyecto, undefined)).toBe(proyecto)
  })
})

describe('actualizarConfiguracionAbastecimiento — capacidades adoptadas (D-δ.66)', () => {
  it('fija y quita el volumen de tanque elevado, sin clamp ni validación', () => {
    let proyecto = conEsquemaDeAbastecimiento(proyectoBase(), 'tanqueElevado')

    proyecto = conVolumenTanqueElevadoAdoptado(proyecto, 2.5)
    expect(proyecto.configuracionAbastecimiento?.volumenTanqueElevadoAdoptado_m3).toBe(2.5)

    // valor inválido: se persiste tal cual (lo marca la validación aparte)
    proyecto = conVolumenTanqueElevadoAdoptado(proyecto, -1)
    expect(proyecto.configuracionAbastecimiento?.volumenTanqueElevadoAdoptado_m3).toBe(-1)

    proyecto = conVolumenTanqueElevadoAdoptado(proyecto, undefined)
    expect(proyecto.configuracionAbastecimiento).toEqual({ esquema: 'tanqueElevado' })
  })

  it('fija y quita el volumen de tanque de bombeo', () => {
    let proyecto = conEsquemaDeAbastecimiento(proyectoBase(), 'cisternaBombeoElevado')
    proyecto = conVolumenTanqueBombeoAdoptado(proyecto, 1)
    expect(proyecto.configuracionAbastecimiento?.volumenTanqueBombeoAdoptado_m3).toBe(1)
    proyecto = conVolumenTanqueBombeoAdoptado(proyecto, undefined)
    expect(proyecto.configuracionAbastecimiento?.volumenTanqueBombeoAdoptado_m3).toBeUndefined()
  })

  it('0 es un valor válido y se persiste', () => {
    let proyecto = conEsquemaDeAbastecimiento(proyectoBase(), 'tanqueElevado')
    proyecto = conVolumenTanqueElevadoAdoptado(proyecto, 0)
    expect(proyecto.configuracionAbastecimiento?.volumenTanqueElevadoAdoptado_m3).toBe(0)
  })

  it('conVolumenTanque* con M4 no iniciado -> throw', () => {
    expect(() => conVolumenTanqueElevadoAdoptado(proyectoBase(), 2)).toThrow(/Módulo 4 no iniciado/)
    expect(() => conVolumenTanqueBombeoAdoptado(proyectoBase(), 2)).toThrow(/Módulo 4 no iniciado/)
  })

  it('se puede limpiar un volumen persistido aunque el esquema actual no contenga ese tanque', () => {
    let proyecto = conEsquemaDeAbastecimiento(proyectoBase(), 'cisternaBombeoElevado')
    proyecto = conVolumenTanqueBombeoAdoptado(proyecto, 1)
    proyecto = conEsquemaDeAbastecimiento(proyecto, 'tanqueElevado') // conserva el volumen de bombeo (no poda destructiva)
    expect(proyecto.configuracionAbastecimiento?.volumenTanqueBombeoAdoptado_m3).toBe(1)
    proyecto = conVolumenTanqueBombeoAdoptado(proyecto, undefined) // pero se puede limpiar
    expect(proyecto.configuracionAbastecimiento?.volumenTanqueBombeoAdoptado_m3).toBeUndefined()
  })

  it('quitar un volumen ausente es idempotente', () => {
    const proyecto = conEsquemaDeAbastecimiento(proyectoBase(), 'tanqueElevado')
    expect(conVolumenTanqueElevadoAdoptado(proyecto, undefined)).toBe(proyecto)
  })

  it('cambiar de esquema entre tanques conserva ambas capacidades; pasar a directa las descarta', () => {
    let proyecto = conEsquemaDeAbastecimiento(proyectoBase(), 'cisternaBombeoElevado')
    proyecto = conVolumenTanqueBombeoAdoptado(proyecto, 1)
    proyecto = conVolumenTanqueElevadoAdoptado(proyecto, 2)
    proyecto = conPeriodoConsumoMaximo(proyecto, 2)

    const aElevado = conEsquemaDeAbastecimiento(proyecto, 'tanqueElevado')
    expect(aElevado.configuracionAbastecimiento).toEqual({
      esquema: 'tanqueElevado',
      periodoConsumoMaximo_h: 2,
      volumenTanqueElevadoAdoptado_m3: 2,
      volumenTanqueBombeoAdoptado_m3: 1,
    })

    const aDirecta = conEsquemaDeAbastecimiento(proyecto, 'directa')
    expect(aDirecta.configuracionAbastecimiento).toEqual({ esquema: 'directa' })
  })
})
