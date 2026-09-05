// Actualizacion inmutable de ConfiguracionHidraulica (CRIT-A17/CRIT-A18,
// D-δ.40): configuracion global y unica del Proyecto, no por Tramo. Cada
// updater preserva el resto de los campos de configuracionHidraulica -- no
// reconstruye el objeto desde cero, para no pisar un campo que no le
// corresponde modificar. No generaliza a un updater generico: son campos
// con semantica distinta cada uno, no una lista abierta.
import type { MaterialTuberiaId, MetodoPerdidaDistribuida, MetodoPerdidaLocalizada, Proyecto } from '../../modelo/proyecto'

export function conMetodoPerdidaDistribuida(proyecto: Proyecto, metodo: MetodoPerdidaDistribuida): Proyecto {
  return {
    ...proyecto,
    configuracionHidraulica: { ...proyecto.configuracionHidraulica, metodoPerdidaDistribuida: metodo },
  }
}

// Los dos modos (detallado/estimado) son ALTERNATIVOS -- este updater solo
// persiste la eleccion, nunca recalcula ni convierte accesorios/tees ya
// declarados. Cambiar de metodo no borra Tramo.accesorios/Nodo.tee
// existentes (siguen persistidos, simplemente dejan de participar del
// calculo activo mientras el modo sea 'estimado') -- ninguna informacion
// detallada ya cargada se pierde por alternar el selector.
export function conMetodoPerdidaLocalizada(proyecto: Proyecto, metodo: MetodoPerdidaLocalizada): Proyecto {
  return {
    ...proyecto,
    configuracionHidraulica: { ...proyecto.configuracionHidraulica, metodoPerdidaLocalizada: metodo },
  }
}

export function conMaterialTuberia(proyecto: Proyecto, materialTuberiaId: MaterialTuberiaId): Proyecto {
  return {
    ...proyecto,
    configuracionHidraulica: { ...proyecto.configuracionHidraulica, materialTuberiaId },
  }
}

// sistemaDeTuberiaId es string (id de catálogo comercial, D-delta.28) --
// no un literal union como MaterialTuberiaId. No valida aquí que el id
// exista ni que sea compatible con materialTuberiaId: esa es
// responsabilidad exclusiva de validarConfiguracionHidraulica, mismo
// criterio que el resto de los updaters de este archivo.
export function conSistemaDeTuberia(proyecto: Proyecto, sistemaDeTuberiaId: string): Proyecto {
  return {
    ...proyecto,
    configuracionHidraulica: { ...proyecto.configuracionHidraulica, sistemaDeTuberiaId },
  }
}
