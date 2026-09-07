// Actualización inmutable de Proyecto.configuracionMedidores (D-δ.55/D-δ.56).
// Configuración global y única del Proyecto (con override por UF), no una
// entidad por medidor. Cada updater preserva el resto de los campos -- no
// reconstruye el objeto desde cero. Sólo persiste decisiones físicas del
// usuario; nunca resultados derivados (eso lo recalcula
// resolverEstadoModulo3 en cada render).
import type { ConfiguracionDeMedidores, Proyecto, TipoProvisionACS } from '../../modelo/proyecto'
import type { ServicioMedido } from '../../motor/medidores/seleccionarMedidorIndividual'
import { claveDeAlcanceDeMedidor } from '../../motor/medidores/claveDeAlcanceDeMedidor'

// Configuración por defecto al iniciar M3: propiedad horizontal en `false`
// (caso más simple, sólo medidor general) y ACS individual. Es una
// decisión explícita del usuario a partir de "Iniciar Módulo 3", no un
// default silencioso -- antes de eso EstadoModulo3 es 'noIniciado'.
export const CONFIGURACION_MEDIDORES_INICIAL: ConfiguracionDeMedidores = {
  esPropiedadHorizontal: false,
  tipoProvisionACS: 'individual',
}

// Idempotente: si el Proyecto ya tiene configuracionMedidores, no la pisa.
export function conModulo3Iniciado(proyecto: Proyecto): Proyecto {
  if (proyecto.configuracionMedidores !== undefined) {
    return proyecto
  }
  return { ...proyecto, configuracionMedidores: CONFIGURACION_MEDIDORES_INICIAL }
}

function conCambio(proyecto: Proyecto, cambio: Partial<ConfiguracionDeMedidores>): Proyecto {
  const base = proyecto.configuracionMedidores ?? CONFIGURACION_MEDIDORES_INICIAL
  return { ...proyecto, configuracionMedidores: { ...base, ...cambio } }
}

export function conPropiedadHorizontal(proyecto: Proyecto, esPropiedadHorizontal: boolean): Proyecto {
  return conCambio(proyecto, { esPropiedadHorizontal })
}

export function conTipoProvisionACS(proyecto: Proyecto, tipoProvisionACS: TipoProvisionACS): Proyecto {
  return conCambio(proyecto, { tipoProvisionACS })
}

// Override por UF: `'default'` quita la entrada (la UF pasa a usar el
// valor global); un `TipoProvisionACS` la fija. Si al quitar una entrada
// el override queda vacío, se elimina la clave entera -- nunca queda un
// `{}` residual.
export function conTipoProvisionACSDeUnidadFuncional(
  proyecto: Proyecto,
  unidadFuncionalId: string,
  valor: TipoProvisionACS | 'default',
): Proyecto {
  const base = proyecto.configuracionMedidores ?? CONFIGURACION_MEDIDORES_INICIAL
  const override: Record<string, TipoProvisionACS> = { ...(base.tipoProvisionACSPorUnidadFuncional ?? {}) }

  if (valor === 'default') {
    delete override[unidadFuncionalId]
  } else {
    override[unidadFuncionalId] = valor
  }

  if (Object.keys(override).length === 0) {
    const sinOverride: ConfiguracionDeMedidores = {
      esPropiedadHorizontal: base.esPropiedadHorizontal,
      tipoProvisionACS: base.tipoProvisionACS,
    }
    return { ...proyecto, configuracionMedidores: sinOverride }
  }

  return {
    ...proyecto,
    configuracionMedidores: { ...base, tipoProvisionACSPorUnidadFuncional: override },
  }
}

// --- M3-D parte 2: override manual del DN del medidor (D-δ.57) ---
// `'auto'` quita el override (vuelve al DN recomendado). Un número fija el
// DN adoptado (hidráulicamente efectivo). No se persiste C/hf/Q.

export function conMedidorGeneralAdoptado(proyecto: Proyecto, dn: number | 'auto'): Proyecto {
  const base = proyecto.configuracionMedidores ?? CONFIGURACION_MEDIDORES_INICIAL
  if (dn === 'auto') {
    if (base.medidorGeneralAdoptadoDN === undefined) {
      return proyecto
    }
    const { medidorGeneralAdoptadoDN, ...resto } = base
    void medidorGeneralAdoptadoDN
    return { ...proyecto, configuracionMedidores: resto }
  }
  return { ...proyecto, configuracionMedidores: { ...base, medidorGeneralAdoptadoDN: dn } }
}

export function conMedidorIndividualAdoptado(
  proyecto: Proyecto,
  unidadFuncionalId: string,
  servicioMedido: ServicioMedido,
  dn: number | 'auto',
): Proyecto {
  const base = proyecto.configuracionMedidores ?? CONFIGURACION_MEDIDORES_INICIAL
  const clave = claveDeAlcanceDeMedidor(unidadFuncionalId, servicioMedido)
  const adoptados: Record<string, number> = { ...(base.medidoresIndividualesAdoptadosDN ?? {}) }

  if (dn === 'auto') {
    delete adoptados[clave]
  } else {
    adoptados[clave] = dn
  }

  if (Object.keys(adoptados).length === 0) {
    if (base.medidoresIndividualesAdoptadosDN === undefined) {
      return proyecto
    }
    const { medidoresIndividualesAdoptadosDN, ...resto } = base
    void medidoresIndividualesAdoptadosDN
    return { ...proyecto, configuracionMedidores: resto }
  }

  return { ...proyecto, configuracionMedidores: { ...base, medidoresIndividualesAdoptadosDN: adoptados } }
}
