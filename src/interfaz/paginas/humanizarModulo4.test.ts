import { describe, it, expect } from 'vitest'
import type { CodigoValidacion } from '../../validacion/codigos'
import type { DiagnosticoErrorModulo4 } from '../../motor/modulo4/resolverEstadoModulo4'
import {
  ETIQUETA_ESQUEMA_ABASTECIMIENTO,
  ETIQUETA_ESTADO_MODULO_4,
  LITROS_POR_M3,
  describirMotivoIncompletitudModulo4,
  describirProblemaDeErrorModulo4,
  etiquetaDesnivelConexion,
  formatearCaudal_lps,
  formatearPresion_m,
  formatearVolumen_L,
  formatearVolumen_L_rapido,
  formatearVolumen_m3,
  litrosDesde_m3,
  litrosParaInput,
  m3DesdeLitros,
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
    // nunca falsa precisión IEEE-754
    expect(formatearVolumen_m3(0.7711999999999999)).not.toContain('999')
  })

  describe('litros como unidad principal de la UI de M4 (D-δ.71)', () => {
    it('conversión pura L <-> m³ (1 m³ = 1000 L)', () => {
      expect(LITROS_POR_M3).toBe(1000)
      expect(litrosDesde_m3(1)).toBe(1000)
      expect(m3DesdeLitros(1000)).toBe(1)
      expect(litrosDesde_m3(1.493)).toBeCloseTo(1493, 9)
      expect(m3DesdeLitros(750)).toBe(0.75)
      // ida y vuelta idempotente
      expect(m3DesdeLitros(litrosDesde_m3(0.7711688248))).toBeCloseTo(0.7711688248, 12)
    })

    it('REGRESIÓN OBLIGATORIA: core 1 m³ se muestra como 1000 L; nunca como 1000 m³', () => {
      expect(formatearVolumen_L(1)).toBe('1000')
      // 1000 L ingresados por el usuario -> 1 m³ persistido
      expect(m3DesdeLitros(1000)).toBe(1)
      // jamás interpretar 1000 L como 1000 m³
      expect(m3DesdeLitros(1000)).not.toBe(1000)
    })

    it('formatea en litros sin falsa precisión y sin separador de miles', () => {
      expect(formatearVolumen_L(1.493)).toBe('1493') // entero comercial: sin ",000"
      expect(formatearVolumen_L(2.8188)).toBe('2818,8')
      expect(formatearVolumen_L(0.7711688248)).toBe('771,169') // decimales reales, máx 3
      expect(formatearVolumen_L(0)).toBe('0')
      expect(formatearVolumen_L(0.0009999999)).not.toContain('999999')
    })

    it('litrosParaInput limpia el ruido IEEE-754 conservando decimales reales', () => {
      expect(litrosParaInput(1)).toBe(1000)
      expect(litrosParaInput(1.5005)).toBe(1500.5)
      expect(litrosParaInput(0.75)).toBe(750)
    })

    it('formatearVolumen_L_rapido redondea al litro entero SÓLO para mostrar (UI-01C §39)', () => {
      // El valor de cálculo/persistencia sigue siendo el m³ exacto; esto
      // es sólo presentación en modo Rápido.
      expect(formatearVolumen_L_rapido(0.484732)).toBe('485')
      expect(formatearVolumen_L_rapido(0.015268)).toBe('15')
      expect(formatearVolumen_L_rapido(0.7711688248)).toBe('771')
      expect(formatearVolumen_L_rapido(1)).toBe('1000')
      expect(formatearVolumen_L_rapido(0)).toBe('0')
    })
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

  // FIX-LEAK-02: los errores de validación de M4 se humanizan por la MISMA
  // política compartida que M1/M3 (`describirProblemaDeValidacion`), no por
  // la descripción técnica interna del catálogo de códigos.
  describe('describirProblemaDeErrorModulo4 (FIX-LEAK-02)', () => {
    const problemaDe = (codigo: CodigoValidacion, campo: string): DiagnosticoErrorModulo4 => ({
      tipo: 'problemaDeValidacion',
      problema: { codigo, severidad: 'error', alcance: 'abastecimiento', campo, valorRecibido: undefined },
    })

    it('el período de consumo máximo inválido da un mensaje humano, sin nombres de campo internos', () => {
      const texto = describirProblemaDeErrorModulo4(
        problemaDe(
          'configuracionAbastecimientoPeriodoConsumoMaximoInvalido',
          'configuracionAbastecimiento.periodoConsumoMaximo_h',
        ),
      )
      expect(texto).toBe('El período de consumo máximo del abastecimiento debe estar entre 1 y 4 horas.')
      expect(texto).not.toContain('configuracionAbastecimiento')
      expect(texto).not.toContain('periodoConsumoMaximo_h')
    })

    it('otro código de la misma rama de M4 toma la misma ruta humana', () => {
      const texto = describirProblemaDeErrorModulo4(
        problemaDe('parametrosDiametroNominalConexionNoAdmisible', 'parametros.diametroNominalConexion_m'),
      )
      expect(texto).toContain('Tabla N°1')
      expect(texto).not.toMatch(/parametros\./)
    })

    it('un código no reconocido cae en el mensaje genérico seguro, nunca en el identificador', () => {
      const texto = describirProblemaDeErrorModulo4(
        problemaDe('codigoInventadoQueNoExiste' as CodigoValidacion, 'x'),
      )
      expect(texto).toBe('Hay un dato de la instalación que debe corregirse antes de continuar.')
      expect(texto).not.toContain('codigoInventado')
    })
  })
})
