import { describe, it, expect } from 'vitest'
import {
  ETIQUETA_ESQUEMA_ABASTECIMIENTO,
  ETIQUETA_ESTADO_MODULO_4,
  describirMotivoIncompletitudModulo4,
  describirProblemaDeErrorModulo4,
  etiquetaDesnivelConexion,
  formatearCaudal_lps,
  formatearPresion_m,
  formatearVolumen_m3,
  volumenEnLitros,
} from './humanizarModulo4'

describe('humanizarModulo4', () => {
  it('etiquetas de estado y esquema en castellano', () => {
    expect(ETIQUETA_ESTADO_MODULO_4.evaluado).toBe('Evaluado')
    expect(ETIQUETA_ESTADO_MODULO_4.noIniciado).toBe('No iniciado')
    expect(ETIQUETA_ESQUEMA_ABASTECIMIENTO.cisternaBombeoElevado).toBe('Cisterna + bombeo + tanque elevado')
  })

  it('la etiqueta del desnivel es contextual al esquema', () => {
    expect(etiquetaDesnivelConexion('directa')).toContain('punto alimentado de cálculo')
    expect(etiquetaDesnivelConexion('tanqueElevado')).toContain('alimentación del tanque')
    expect(etiquetaDesnivelConexion('cisternaBombeoElevado')).toContain('alimentación de la cisterna')
  })

  it('formateo es-AR con decimales por magnitud', () => {
    expect(formatearVolumen_m3(0.7711688248)).toBe('0,771')
    expect(formatearCaudal_lps(0.6)).toBe('0,60')
    expect(formatearPresion_m(6.5)).toBe('6,50')
    expect(volumenEnLitros(0.7711688248)).toBe('771')
    // nunca falsa precisión IEEE-754
    expect(formatearVolumen_m3(0.7711999999999999)).not.toContain('999')
  })

  it('describirMotivoIncompletitudModulo4 humaniza cada motivo tipado', () => {
    expect(describirMotivoIncompletitudModulo4({ tipo: 'faltaPeriodoConsumoMaximo' })).toMatch(
      /período de consumo máximo/,
    )
    expect(describirMotivoIncompletitudModulo4({ tipo: 'faltaDiametroConexion' })).toMatch(/DN de conexión/)
    expect(describirMotivoIncompletitudModulo4({ tipo: 'faltaDesnivelConexion' })).toMatch(/desnivel/)
    expect(describirMotivoIncompletitudModulo4({ tipo: 'sinArtefactosComputables' })).toMatch(/Módulo 1/)
    expect(
      describirMotivoIncompletitudModulo4({ tipo: 'qcGlobalIndeterminado', motivo: 'n = 1' }),
    ).toContain('n = 1')
    expect(
      describirMotivoIncompletitudModulo4({
        tipo: 'presionConexionFueraDeTabla',
        presionCalculo_m: 2,
        rango_m: { min: 4, max: 35 },
      }),
    ).toBe('La presión de cálculo (2,00 m) queda fuera del rango de la Tabla N°1 (4–35 m). No se extrapola.')
  })

  it('describirProblemaDeErrorModulo4 reutiliza la descripción central del código de validación', () => {
    const texto = describirProblemaDeErrorModulo4({
      tipo: 'problemaDeValidacion',
      problema: {
        codigo: 'parametrosDiametroNominalConexionNoAdmisible',
        severidad: 'error',
        campo: 'parametros.diametroNominalConexion_m',
        valorRecibido: 0.013,
      },
    })
    expect(texto).toContain('Tabla N°1')
    expect(texto).toContain('0,019 m')
  })
})
