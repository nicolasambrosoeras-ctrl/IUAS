import { describe, it, expect } from 'vitest'
import type { ConfiguracionDeAbastecimiento, Proyecto } from '../../modelo/proyecto'
import { validarConfiguracionAbastecimiento } from './index'
import { validarProyecto } from '../index'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import { catalogoSistemasDeTuberia } from '../../motor/tuberias/sistemaDeTuberia'

function conAbastecimiento(configuracionAbastecimiento?: ConfiguracionDeAbastecimiento): Proyecto {
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
    ...(configuracionAbastecimiento !== undefined ? { configuracionAbastecimiento } : {}),
  }
}

describe('validarConfiguracionAbastecimiento (D-δ.63)', () => {
  it('C1: proyecto sin configuracionAbastecimiento -> sin problemas (M4 no iniciado)', () => {
    expect(validarConfiguracionAbastecimiento(conAbastecimiento())).toEqual([])
  })

  it('C2: esquema directa -> válido', () => {
    expect(validarConfiguracionAbastecimiento(conAbastecimiento({ esquema: 'directa' }))).toEqual([])
  })

  it('C3: esquema tanqueElevado (con o sin Tc) -> válido', () => {
    expect(validarConfiguracionAbastecimiento(conAbastecimiento({ esquema: 'tanqueElevado' }))).toEqual([])
    expect(
      validarConfiguracionAbastecimiento(
        conAbastecimiento({ esquema: 'tanqueElevado', periodoConsumoMaximo_h: 2 }),
      ),
    ).toEqual([])
  })

  it('C4: esquema cisternaBombeoElevado -> válido', () => {
    expect(
      validarConfiguracionAbastecimiento(
        conAbastecimiento({ esquema: 'cisternaBombeoElevado', periodoConsumoMaximo_h: 3 }),
      ),
    ).toEqual([])
  })

  it('C5/C6: Tc en los extremos 1 h y 4 h -> válido', () => {
    expect(
      validarConfiguracionAbastecimiento(
        conAbastecimiento({ esquema: 'tanqueElevado', periodoConsumoMaximo_h: 1 }),
      ),
    ).toEqual([])
    expect(
      validarConfiguracionAbastecimiento(
        conAbastecimiento({ esquema: 'tanqueElevado', periodoConsumoMaximo_h: 4 }),
      ),
    ).toEqual([])
  })

  it('C7: Tc < 1 -> error, sin clamp', () => {
    const problemas = validarConfiguracionAbastecimiento(
      conAbastecimiento({ esquema: 'tanqueElevado', periodoConsumoMaximo_h: 0.5 }),
    )
    expect(problemas).toHaveLength(1)
    const [problema] = problemas
    expect(problema?.codigo).toBe('configuracionAbastecimientoPeriodoConsumoMaximoInvalido')
    expect(problema?.severidad).toBe('error')
    expect(problema?.valorRecibido).toBe(0.5)
  })

  it('C8: Tc > 4 -> error', () => {
    const problemas = validarConfiguracionAbastecimiento(
      conAbastecimiento({ esquema: 'cisternaBombeoElevado', periodoConsumoMaximo_h: 5 }),
    )
    expect(problemas.map((p) => p.codigo)).toEqual(['configuracionAbastecimientoPeriodoConsumoMaximoInvalido'])
  })

  it('C9: Tc NaN / infinito -> error', () => {
    for (const tc of [Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY]) {
      const problemas = validarConfiguracionAbastecimiento(
        conAbastecimiento({ esquema: 'tanqueElevado', periodoConsumoMaximo_h: tc }),
      )
      expect(problemas.map((p) => p.codigo)).toEqual([
        'configuracionAbastecimientoPeriodoConsumoMaximoInvalido',
      ])
    }
  })

  it('esquema desconocido (dato persistido corrupto) -> error', () => {
    const proyecto = conAbastecimiento({
      esquema: 'bombeoDirecto' as unknown as ConfiguracionDeAbastecimiento['esquema'],
    })
    const problemas = validarConfiguracionAbastecimiento(proyecto)
    expect(problemas.map((p) => p.codigo)).toEqual(['configuracionAbastecimientoEsquemaInvalido'])
    const [problema] = problemas
    expect(problema?.valorRecibido).toBe('bombeoDirecto')
  })

  it('directa con un Tc estructuralmente inválido persistido -> error (no se ignora la corrupción)', () => {
    const problemas = validarConfiguracionAbastecimiento(
      conAbastecimiento({ esquema: 'directa', periodoConsumoMaximo_h: 99 }),
    )
    expect(problemas.map((p) => p.codigo)).toEqual(['configuracionAbastecimientoPeriodoConsumoMaximoInvalido'])
  })

  it('está integrado en validarProyecto y no invalida un proyecto viejo sin M4', () => {
    const resultadoSinM4 = validarProyecto(
      conAbastecimiento(),
      catalogoArtefactos,
      coeficientesMayoracion,
      catalogoSistemasDeTuberia,
    )
    expect(resultadoSinM4.valido).toBe(true)

    const resultadoConM4Invalido = validarProyecto(
      conAbastecimiento({ esquema: 'tanqueElevado', periodoConsumoMaximo_h: 10 }),
      catalogoArtefactos,
      coeficientesMayoracion,
      catalogoSistemasDeTuberia,
    )
    expect(resultadoConM4Invalido.valido).toBe(false)
    expect(resultadoConM4Invalido.problemas.map((p) => p.codigo)).toContain(
      'configuracionAbastecimientoPeriodoConsumoMaximoInvalido',
    )
  })

  it('un M4 no iniciado NO convierte el proyecto en inválido', () => {
    const resultado = validarProyecto(
      conAbastecimiento(),
      catalogoArtefactos,
      coeficientesMayoracion,
      catalogoSistemasDeTuberia,
    )
    expect(resultado.problemas.some((p) => p.campo.startsWith('configuracionAbastecimiento'))).toBe(false)
  })
})

describe('validarConfiguracionAbastecimiento — capacidades adoptadas (D-δ.66)', () => {
  it('V1: ambas capacidades ausentes -> sin problemas', () => {
    expect(
      validarConfiguracionAbastecimiento(
        conAbastecimiento({ esquema: 'cisternaBombeoElevado', periodoConsumoMaximo_h: 2 }),
      ),
    ).toEqual([])
  })

  it('V2/V3: volumen 0 y volumen positivo son válidos', () => {
    expect(
      validarConfiguracionAbastecimiento(
        conAbastecimiento({
          esquema: 'cisternaBombeoElevado',
          volumenTanqueElevadoAdoptado_m3: 0,
          volumenTanqueBombeoAdoptado_m3: 1.75,
        }),
      ),
    ).toEqual([])
  })

  it('V4: volumen de tanque elevado negativo -> error', () => {
    const problemas = validarConfiguracionAbastecimiento(
      conAbastecimiento({ esquema: 'tanqueElevado', volumenTanqueElevadoAdoptado_m3: -1 }),
    )
    expect(problemas.map((p) => p.codigo)).toEqual(['configuracionAbastecimientoVolumenTanqueElevadoInvalido'])
    expect(problemas[0]?.severidad).toBe('error')
  })

  it('V5: volumen de tanque de bombeo negativo -> error', () => {
    expect(
      validarConfiguracionAbastecimiento(
        conAbastecimiento({ esquema: 'cisternaBombeoElevado', volumenTanqueBombeoAdoptado_m3: -0.001 }),
      ).map((p) => p.codigo),
    ).toEqual(['configuracionAbastecimientoVolumenTanqueBombeoInvalido'])
  })

  it('V6: NaN / Infinity -> error para cada capacidad', () => {
    for (const valor of [Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(
        validarConfiguracionAbastecimiento(
          conAbastecimiento({ esquema: 'tanqueElevado', volumenTanqueElevadoAdoptado_m3: valor }),
        ).map((p) => p.codigo),
      ).toEqual(['configuracionAbastecimientoVolumenTanqueElevadoInvalido'])
      expect(
        validarConfiguracionAbastecimiento(
          conAbastecimiento({ esquema: 'cisternaBombeoElevado', volumenTanqueBombeoAdoptado_m3: valor }),
        ).map((p) => p.codigo),
      ).toEqual(['configuracionAbastecimientoVolumenTanqueBombeoInvalido'])
    }
  })

  it('V7: un volumen de bombeo presente en un esquema tanqueElevado no rompe el proyecto (no aplica, no invalida)', () => {
    expect(
      validarConfiguracionAbastecimiento(
        conAbastecimiento({
          esquema: 'tanqueElevado',
          volumenTanqueElevadoAdoptado_m3: 2,
          volumenTanqueBombeoAdoptado_m3: 1,
        }),
      ),
    ).toEqual([])
  })

  it('V8: volúmenes presentes en directa no rompen el proyecto', () => {
    expect(
      validarConfiguracionAbastecimiento(
        conAbastecimiento({
          esquema: 'directa',
          volumenTanqueElevadoAdoptado_m3: 2,
          volumenTanqueBombeoAdoptado_m3: 1,
        }),
      ),
    ).toEqual([])
  })

  it('adoptado < requerido NO es un problema de validación (es verificación derivada)', () => {
    // No hay forma de expresar "requerido" acá; sólo se comprueba que un
    // volumen chico pero válido no genera ningún problema estructural.
    expect(
      validarConfiguracionAbastecimiento(
        conAbastecimiento({ esquema: 'tanqueElevado', volumenTanqueElevadoAdoptado_m3: 0.0001 }),
      ),
    ).toEqual([])
  })

  it('integrado en validarProyecto: un volumen adoptado negativo invalida el proyecto', () => {
    const resultado = validarProyecto(
      conAbastecimiento({ esquema: 'tanqueElevado', volumenTanqueElevadoAdoptado_m3: -5 }),
      catalogoArtefactos,
      coeficientesMayoracion,
      catalogoSistemasDeTuberia,
    )
    expect(resultado.valido).toBe(false)
    expect(resultado.problemas.map((p) => p.codigo)).toContain(
      'configuracionAbastecimientoVolumenTanqueElevadoInvalido',
    )
  })
})
