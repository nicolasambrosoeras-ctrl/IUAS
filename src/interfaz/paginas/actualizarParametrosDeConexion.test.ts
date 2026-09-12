import { describe, it, expect } from 'vitest'
import type { Proyecto } from '../../modelo/proyecto'
import {
  conDesnivelConexion,
  conDiametroNominalConexion,
  conPresionSobreAcera,
} from './actualizarParametrosDeConexion'

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
      presionSobreAcera_m: 10,
      alturaArtefactoMasDesfavorable_m: 3,
    },
    unidadesFuncionales: [
      {
        id: 'uf-1',
        nombre: 'UF 1',
        niveles: [
          {
            id: 'uf-1-nivel-1',
            nombre: 'Nivel 1',
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

describe('actualizarParametrosDeConexion (D-δ.65)', () => {
  it('fija y quita el diámetro de conexión sin default ni validación', () => {
    const base = proyectoBase()
    expect(base.parametros.diametroNominalConexion_m).toBeUndefined()

    const conDn = conDiametroNominalConexion(base, 0.025)
    expect(conDn.parametros.diametroNominalConexion_m).toBe(0.025)

    // No aplica clamp ni valida: un DN inválido se persiste tal cual.
    const conDnInvalido = conDiametroNominalConexion(conDn, 0.013)
    expect(conDnInvalido.parametros.diametroNominalConexion_m).toBe(0.013)

    const sinDn = conDiametroNominalConexion(conDn, undefined)
    expect(sinDn.parametros.diametroNominalConexion_m).toBeUndefined()
  })

  it('fija desnivel positivo, cero y negativo (dato firmado)', () => {
    let proyecto = conDesnivelConexion(proyectoBase(), 8)
    expect(proyecto.parametros.desnivelConexion_m).toBe(8)
    proyecto = conDesnivelConexion(proyecto, 0)
    expect(proyecto.parametros.desnivelConexion_m).toBe(0)
    proyecto = conDesnivelConexion(proyecto, -2.5)
    expect(proyecto.parametros.desnivelConexion_m).toBe(-2.5)
  })

  it('no muta el proyecto original ni toca otros datos', () => {
    const base = proyectoBase()
    const copia = structuredClone(base)
    const resultado = conDiametroNominalConexion(base, 0.019)
    expect(base).toEqual(copia)
    expect(resultado.metadatos).toBe(base.metadatos)
    expect(resultado.unidadesFuncionales).toBe(base.unidadesFuncionales)
    expect(resultado.configuracionHidraulica).toBe(base.configuracionHidraulica)
    expect(resultado.parametros.tipoDeProyecto).toBe(base.parametros.tipoDeProyecto)
    expect(resultado.parametros.presionSobreAcera_m).toBe(base.parametros.presionSobreAcera_m)
  })

  it('quitar un campo ausente es idempotente (devuelve el mismo objeto)', () => {
    const base = proyectoBase()
    expect(conDiametroNominalConexion(base, undefined)).toBe(base)
    expect(conDesnivelConexion(base, undefined)).toBe(base)
  })

  it('conPresionSobreAcera fija el número sin clamp ni rango, preservando el resto', () => {
    const base = proyectoBase()
    const copia = structuredClone(base)

    const con5 = conPresionSobreAcera(base, 5)
    expect(con5.parametros.presionSobreAcera_m).toBe(5)

    // No impone el rango [4, 35] de Tabla N°1: puede quedar en 2.
    const con2 = conPresionSobreAcera(con5, 2)
    expect(con2.parametros.presionSobreAcera_m).toBe(2)

    expect(base).toEqual(copia)
    expect(con5.metadatos).toBe(base.metadatos)
    expect(con5.parametros.tipoDeProyecto).toBe(base.parametros.tipoDeProyecto)
  })
})
