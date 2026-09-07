import { describe, it, expect } from 'vitest'
import type { ConfiguracionDeMedidores } from '../../modelo/proyecto'
import { tipoProvisionACSEfectivo } from './tipoProvisionACSEfectivo'

describe('tipoProvisionACSEfectivo (D-δ.55)', () => {
  it('sin override: devuelve el default global del Proyecto', () => {
    const config: ConfiguracionDeMedidores = { esPropiedadHorizontal: true, tipoProvisionACS: 'central' }
    expect(tipoProvisionACSEfectivo(config, 'uf-1')).toBe('central')
    expect(tipoProvisionACSEfectivo(config, 'uf-cualquiera')).toBe('central')
  })

  it('con override para la UF: el override gana sobre el default', () => {
    const config: ConfiguracionDeMedidores = {
      esPropiedadHorizontal: true,
      tipoProvisionACS: 'central',
      tipoProvisionACSPorUnidadFuncional: { 'uf-2': 'individual' },
    }
    expect(tipoProvisionACSEfectivo(config, 'uf-2')).toBe('individual')
  })

  it('con override presente pero no para esta UF: cae al default', () => {
    const config: ConfiguracionDeMedidores = {
      esPropiedadHorizontal: true,
      tipoProvisionACS: 'individual',
      tipoProvisionACSPorUnidadFuncional: { 'uf-2': 'central' },
    }
    expect(tipoProvisionACSEfectivo(config, 'uf-1')).toBe('individual')
    expect(tipoProvisionACSEfectivo(config, 'uf-2')).toBe('central')
  })
})
