// Actualizacion inmutable de ConfiguracionHidraulica (CRIT-A17/CRIT-A18):
// configuracion global y unica del Proyecto, no por Tramo. Cada updater
// preserva el resto de los campos de configuracionHidraulica -- no
// reconstruye el objeto desde cero, para no pisar un campo que no le
// corresponde modificar. No generaliza a un updater generico: son dos
// campos con semantica distinta, no una lista abierta.
import type { MaterialTuberiaId, MetodoPerdidaDistribuida, Proyecto } from '../../modelo/proyecto'

export function conMetodoPerdidaDistribuida(proyecto: Proyecto, metodo: MetodoPerdidaDistribuida): Proyecto {
  return {
    ...proyecto,
    configuracionHidraulica: { ...proyecto.configuracionHidraulica, metodoPerdidaDistribuida: metodo },
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
