// Actualizacion inmutable del metodo de perdida distribuida (CRIT-A17/
// CRIT-A18): configuracion global y unica del Proyecto, no por Tramo.
// No generaliza todavia a un updater generico de ConfiguracionHidraulica
// -- ese unico campo es, hoy, todo lo que ese objeto tiene.
import type { MetodoPerdidaDistribuida, Proyecto } from '../../modelo/proyecto'

export function conMetodoPerdidaDistribuida(proyecto: Proyecto, metodo: MetodoPerdidaDistribuida): Proyecto {
  return {
    ...proyecto,
    configuracionHidraulica: { metodoPerdidaDistribuida: metodo },
  }
}
