import { describe, it, expect } from 'vitest'
import {
  ETIQUETA_ESTADO_MODULO_3,
  ETIQUETA_SERVICIO_MEDIDO,
  ETIQUETA_TIPO_PROVISION_ACS,
  describirMotivoIncompletitudModulo3,
  formatearMagnitudDeMedidor,
} from './humanizarModulo3'

describe('humanizarModulo3 (D-δ.56)', () => {
  it('mapas de etiquetas completos', () => {
    expect(Object.keys(ETIQUETA_TIPO_PROVISION_ACS).sort()).toEqual(['central', 'individual'])
    expect(Object.keys(ETIQUETA_SERVICIO_MEDIDO).sort()).toEqual(['aguaCaliente', 'aguaFria'])
    expect(Object.keys(ETIQUETA_ESTADO_MODULO_3).sort()).toEqual(['error', 'evaluado', 'incompleto', 'noIniciado'])
  })

  it('formatearMagnitudDeMedidor: decimales por magnitud', () => {
    expect(formatearMagnitudDeMedidor(19, 'diametro')).toBe('19')
    expect(formatearMagnitudDeMedidor(2.5, 'caudal')).toBe('2,50')
    expect(formatearMagnitudDeMedidor(1.3, 'perdida')).toBe('1,300')
  })

  it('describirMotivoIncompletitudModulo3: cubre todas las variantes', () => {
    expect(describirMotivoIncompletitudModulo3({ tipo: 'sinArtefactosComputables' })).toMatch(/no tiene artefactos/i)
    expect(describirMotivoIncompletitudModulo3({ tipo: 'qcGeneralIndeterminado', motivo: 'x' })).toMatch(/caudal de cálculo global/i)
    expect(
      describirMotivoIncompletitudModulo3({ tipo: 'medidorGeneralFueraDeTabla06', qcDiseno_m3h: 52.4, qcMaximoCubierto_m3h: 40 }),
    ).toMatch(/supera el alcance de la Tabla N°6/)
    expect(describirMotivoIncompletitudModulo3({ tipo: 'redHidraulicaAusenteParaMedicionIndividual' })).toMatch(/red hidráulica/i)
    expect(
      describirMotivoIncompletitudModulo3({
        tipo: 'medidorIndividualFueraDeTabla06',
        unidadFuncionalId: 'uf-1',
        servicioMedido: 'aguaCaliente',
        qcDiseno_m3h: 45,
        qcMaximoCubierto_m3h: 40,
      }),
    ).toMatch(/uf-1 · Agua caliente/)
  })
})
