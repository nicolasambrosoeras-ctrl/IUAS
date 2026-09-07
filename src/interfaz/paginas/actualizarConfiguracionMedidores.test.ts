import { describe, it, expect } from 'vitest'
import type { MetadatosProyecto, ParametrosProyecto, Proyecto } from '../../modelo/proyecto'
import {
  CONFIGURACION_MEDIDORES_INICIAL,
  conMedidorGeneralAdoptado,
  conMedidorIndividualAdoptado,
  conModulo3Iniciado,
  conPropiedadHorizontal,
  conTipoProvisionACS,
  conTipoProvisionACSDeUnidadFuncional,
} from './actualizarConfiguracionMedidores'

function proyectoBase(): Proyecto {
  const metadatos: MetadatosProyecto = {
    nombre: 'P',
    obra: 'O',
    comitente: 'C',
    fecha: '2026-01-01',
    schemaVersion: '1.0.0',
    versionNormativa: 'eras-2023',
  }
  const parametros: ParametrosProyecto = {
    tipoDeProyecto: 'viviendaMultifamiliar',
    presionSobreAcera_m: 0,
    alturaArtefactoMasDesfavorable_m: 0,
  }
  return {
    metadatos,
    parametros,
    unidadesFuncionales: [],
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'detallado',
      granularidadHidraulica: 'profesional',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

describe('actualizarConfiguracionMedidores (D-δ.56)', () => {
  it('conModulo3Iniciado: agrega la configuración por defecto si no existe', () => {
    const p = conModulo3Iniciado(proyectoBase())
    expect(p.configuracionMedidores).toEqual(CONFIGURACION_MEDIDORES_INICIAL)
    expect(p.configuracionMedidores?.esPropiedadHorizontal).toBe(false)
    expect(p.configuracionMedidores?.tipoProvisionACS).toBe('individual')
  })

  it('conModulo3Iniciado: es idempotente, no pisa una configuración existente', () => {
    const base = { ...proyectoBase(), configuracionMedidores: { esPropiedadHorizontal: true, tipoProvisionACS: 'central' as const } }
    expect(conModulo3Iniciado(base)).toBe(base)
  })

  it('conPropiedadHorizontal / conTipoProvisionACS: preservan el resto de la config', () => {
    let p = conModulo3Iniciado(proyectoBase())
    p = conPropiedadHorizontal(p, true)
    p = conTipoProvisionACS(p, 'central')
    expect(p.configuracionMedidores).toEqual({ esPropiedadHorizontal: true, tipoProvisionACS: 'central' })
  })

  it('conPropiedadHorizontal sobre proyecto sin config: arranca desde la config inicial', () => {
    const p = conPropiedadHorizontal(proyectoBase(), true)
    expect(p.configuracionMedidores).toEqual({ esPropiedadHorizontal: true, tipoProvisionACS: 'individual' })
  })

  it('conTipoProvisionACSDeUnidadFuncional: fija un override por UF', () => {
    let p = conModulo3Iniciado(proyectoBase())
    p = conTipoProvisionACS(p, 'individual')
    p = conTipoProvisionACSDeUnidadFuncional(p, 'uf-2', 'central')
    expect(p.configuracionMedidores?.tipoProvisionACSPorUnidadFuncional).toEqual({ 'uf-2': 'central' })
    expect(p.configuracionMedidores?.tipoProvisionACS).toBe('individual')
  })

  it("conTipoProvisionACSDeUnidadFuncional con 'default': quita la entrada; si queda vacío, elimina el override", () => {
    let p = conModulo3Iniciado(proyectoBase())
    p = conTipoProvisionACSDeUnidadFuncional(p, 'uf-1', 'central')
    p = conTipoProvisionACSDeUnidadFuncional(p, 'uf-2', 'central')
    expect(Object.keys(p.configuracionMedidores?.tipoProvisionACSPorUnidadFuncional ?? {})).toHaveLength(2)

    p = conTipoProvisionACSDeUnidadFuncional(p, 'uf-1', 'default')
    expect(p.configuracionMedidores?.tipoProvisionACSPorUnidadFuncional).toEqual({ 'uf-2': 'central' })

    p = conTipoProvisionACSDeUnidadFuncional(p, 'uf-2', 'default')
    expect(p.configuracionMedidores?.tipoProvisionACSPorUnidadFuncional).toBeUndefined()
    expect(p.configuracionMedidores).toEqual({ esPropiedadHorizontal: false, tipoProvisionACS: 'individual' })
  })

  it('los updaters no mutan el proyecto de entrada', () => {
    const p0 = conModulo3Iniciado(proyectoBase())
    const snapshot = JSON.stringify(p0)
    conPropiedadHorizontal(p0, true)
    conTipoProvisionACS(p0, 'central')
    conTipoProvisionACSDeUnidadFuncional(p0, 'uf-1', 'central')
    conMedidorGeneralAdoptado(p0, 25)
    conMedidorIndividualAdoptado(p0, 'uf-1', 'aguaFria', 25)
    expect(JSON.stringify(p0)).toBe(snapshot)
  })

  it('conMedidorGeneralAdoptado: fija el DN; "auto" lo quita', () => {
    let p = conModulo3Iniciado(proyectoBase())
    p = conMedidorGeneralAdoptado(p, 25)
    expect(p.configuracionMedidores?.medidorGeneralAdoptadoDN).toBe(25)
    p = conMedidorGeneralAdoptado(p, 'auto')
    expect(p.configuracionMedidores?.medidorGeneralAdoptadoDN).toBeUndefined()
  })

  it('D2-9. conMedidorIndividualAdoptado: override aislado por UF + servicio', () => {
    let p = conModulo3Iniciado(proyectoBase())
    p = conMedidorIndividualAdoptado(p, 'uf-1', 'aguaFria', 25)
    p = conMedidorIndividualAdoptado(p, 'uf-1', 'aguaCaliente', 19)
    p = conMedidorIndividualAdoptado(p, 'uf-2', 'aguaFria', 32)
    expect(p.configuracionMedidores?.medidoresIndividualesAdoptadosDN).toEqual({
      'uf-1|aguaFria': 25,
      'uf-1|aguaCaliente': 19,
      'uf-2|aguaFria': 32,
    })

    // quitar uf-1|aguaFria no toca las otras
    p = conMedidorIndividualAdoptado(p, 'uf-1', 'aguaFria', 'auto')
    expect(p.configuracionMedidores?.medidoresIndividualesAdoptadosDN).toEqual({
      'uf-1|aguaCaliente': 19,
      'uf-2|aguaFria': 32,
    })
  })

  it('D2-10. si el override individual queda vacío, se elimina la clave (nunca un {} residual)', () => {
    let p = conModulo3Iniciado(proyectoBase())
    p = conMedidorIndividualAdoptado(p, 'uf-1', 'aguaFria', 25)
    p = conMedidorIndividualAdoptado(p, 'uf-1', 'aguaFria', 'auto')
    expect(p.configuracionMedidores?.medidoresIndividualesAdoptadosDN).toBeUndefined()
  })

  it('backward compatibility: proyecto sin config, un solo updater arranca desde la config inicial + el cambio', () => {
    const p = conMedidorGeneralAdoptado(proyectoBase(), 25)
    expect(p.configuracionMedidores).toEqual({ ...CONFIGURACION_MEDIDORES_INICIAL, medidorGeneralAdoptadoDN: 25 })
  })
})
