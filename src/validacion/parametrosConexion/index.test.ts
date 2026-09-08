import { describe, it, expect } from 'vitest'
import type { ParametrosProyecto, Proyecto } from '../../modelo/proyecto'
import { validarParametrosDeConexion } from './index'
import { validarProyecto } from '../index'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import { catalogoSistemasDeTuberia } from '../../motor/tuberias/sistemaDeTuberia'

function proyectoCon(parametrosExtra: Partial<ParametrosProyecto>): Proyecto {
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
      ...parametrosExtra,
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

describe('validarParametrosDeConexion (D-δ.65)', () => {
  it('V1: ambos campos ausentes -> sin problemas (proyecto válido)', () => {
    expect(validarParametrosDeConexion(proyectoCon({}))).toEqual([])
  })

  it('V2/V3: DN19 y DN75 son admisibles', () => {
    expect(validarParametrosDeConexion(proyectoCon({ diametroNominalConexion_m: 0.019 }))).toEqual([])
    expect(validarParametrosDeConexion(proyectoCon({ diametroNominalConexion_m: 0.075 }))).toEqual([])
  })

  it('V4: DN13 no es admisible como conexión (por debajo del mínimo de §2.7)', () => {
    const problemas = validarParametrosDeConexion(proyectoCon({ diametroNominalConexion_m: 0.013 }))
    expect(problemas.map((p) => p.codigo)).toEqual(['parametrosDiametroNominalConexionNoAdmisible'])
    const [problema] = problemas
    expect(problema?.severidad).toBe('error')
    expect(problema?.valorRecibido).toBe(0.013)
  })

  it('V5: un DN no tabulado (DN22) no es admisible', () => {
    expect(
      validarParametrosDeConexion(proyectoCon({ diametroNominalConexion_m: 0.022 })).map((p) => p.codigo),
    ).toEqual(['parametrosDiametroNominalConexionNoAdmisible'])
  })

  it('V6: DN no finito -> no admisible', () => {
    for (const dn of [Number.NaN, Number.POSITIVE_INFINITY, -0.019]) {
      expect(
        validarParametrosDeConexion(proyectoCon({ diametroNominalConexion_m: dn })).map((p) => p.codigo),
      ).toEqual(['parametrosDiametroNominalConexionNoAdmisible'])
    }
  })

  it('V7/V8/V9: desnivel positivo, cero y negativo son válidos (dato firmado)', () => {
    expect(validarParametrosDeConexion(proyectoCon({ desnivelConexion_m: 5 }))).toEqual([])
    expect(validarParametrosDeConexion(proyectoCon({ desnivelConexion_m: 0 }))).toEqual([])
    expect(validarParametrosDeConexion(proyectoCon({ desnivelConexion_m: -3.5 }))).toEqual([])
  })

  it('V10: desnivel no finito -> error', () => {
    for (const dz of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      expect(
        validarParametrosDeConexion(proyectoCon({ desnivelConexion_m: dz })).map((p) => p.codigo),
      ).toEqual(['parametrosDesnivelConexionNoFinito'])
    }
  })

  it('V11: presionSobreAcera_m = 2 (fuera del rango de Tabla N°1) NO es un problema de validación', () => {
    const resultado = validarProyecto(
      proyectoCon({ diametroNominalConexion_m: 0.019, desnivelConexion_m: 0 }),
      catalogoArtefactos,
      coeficientesMayoracion,
      catalogoSistemasDeTuberia,
    )
    expect(resultado.valido).toBe(true)
  })

  it('integrado en validarProyecto: un proyecto viejo sin datos de conexión sigue siendo válido', () => {
    const resultado = validarProyecto(
      proyectoCon({}),
      catalogoArtefactos,
      coeficientesMayoracion,
      catalogoSistemasDeTuberia,
    )
    expect(resultado.valido).toBe(true)
    expect(resultado.problemas.some((p) => p.campo.startsWith('parametros.'))).toBe(false)
  })

  it('integrado en validarProyecto: un DN de conexión inválido invalida el proyecto', () => {
    const resultado = validarProyecto(
      proyectoCon({ diametroNominalConexion_m: 0.013 }),
      catalogoArtefactos,
      coeficientesMayoracion,
      catalogoSistemasDeTuberia,
    )
    expect(resultado.valido).toBe(false)
    expect(resultado.problemas.map((p) => p.codigo)).toContain('parametrosDiametroNominalConexionNoAdmisible')
  })
})
