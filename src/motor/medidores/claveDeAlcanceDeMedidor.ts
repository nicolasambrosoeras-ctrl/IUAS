// Identidad estable de un alcance de medidor individual (D-δ.54/D-δ.57):
// `unidadFuncionalId + servicioMedido`. Se usa como clave del override
// manual de DN por alcance (Proyecto.configuracionMedidores
// .medidoresIndividualesAdoptadosDN) y para emparejar overrides con los
// alcances vigentes. Nunca sólo `unidadFuncionalId` -- una UF puede tener
// un medidor de agua fría y otro de agua caliente.
import type { ServicioMedido } from './seleccionarMedidorIndividual'

export function claveDeAlcanceDeMedidor(unidadFuncionalId: string, servicioMedido: ServicioMedido): string {
  return `${unidadFuncionalId}|${servicioMedido}`
}
