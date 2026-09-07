// Actualización inmutable de Proyecto.configuracionMedidores (D-δ.55/D-δ.56).
// Configuración global y única del Proyecto (con override por UF), no una
// entidad por medidor. Cada updater preserva el resto de los campos -- no
// reconstruye el objeto desde cero. Sólo persiste decisiones físicas del
// usuario; nunca resultados derivados (eso lo recalcula
// resolverEstadoModulo3 en cada render).
import type { ConfiguracionDeMedidores, Proyecto, TipoProvisionACS } from '../../modelo/proyecto'

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
