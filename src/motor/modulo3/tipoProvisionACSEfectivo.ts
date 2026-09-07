// Configuración efectiva de provisión de ACS para una unidad funcional
// (D-δ.55): el override por UF gana sobre el default global del Proyecto.
// Derivación pura, sin estado -- nunca se persiste el valor efectivo.
import type { ConfiguracionDeMedidores, TipoProvisionACS } from '../../modelo/proyecto'

export function tipoProvisionACSEfectivo(
  configuracionMedidores: ConfiguracionDeMedidores,
  unidadFuncionalId: string,
): TipoProvisionACS {
  return (
    configuracionMedidores.tipoProvisionACSPorUnidadFuncional?.[unidadFuncionalId] ??
    configuracionMedidores.tipoProvisionACS
  )
}
