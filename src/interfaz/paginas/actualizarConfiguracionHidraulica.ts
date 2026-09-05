// Actualizacion inmutable de ConfiguracionHidraulica (CRIT-A17/CRIT-A18,
// D-δ.40): configuracion global y unica del Proyecto, no por Tramo. Cada
// updater preserva el resto de los campos de configuracionHidraulica -- no
// reconstruye el objeto desde cero, para no pisar un campo que no le
// corresponde modificar. No generaliza a un updater generico: son campos
// con semantica distinta cada uno, no una lista abierta.
import type { GranularidadHidraulica, MaterialTuberiaId, MetodoPerdidaDistribuida, MetodoPerdidaLocalizada, Proyecto } from '../../modelo/proyecto'
import type { SistemaDeTuberiaCatalogado } from '../../motor/tuberias/sistemaDeTuberia'

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

// Ortogonal a conMetodoPerdidaLocalizada (D-δ.44): decide QUÉ Tramos
// físicos participan de la acumulación de pérdida, nunca CÓMO se calcula
// la pérdida localizada -- mismo criterio de no-pérdida-de-datos que el
// resto de este archivo (alternar granularidad no borra longitud_m ni
// accesorios ya declarados sobre ningún Tramo, incluidos los ramales:
// simplemente esos ramales dejan de participar de la acumulación
// mientras la granularidad activa sea 'simplificada').
export function conGranularidadHidraulica(proyecto: Proyecto, granularidad: GranularidadHidraulica): Proyecto {
  return {
    ...proyecto,
    configuracionHidraulica: { ...proyecto.configuracionHidraulica, granularidadHidraulica: granularidad },
  }
}

// D-δ.47: cambiar el material sin ajustar sistemaDeTuberiaId podía dejar
// configurado un sistema de OTRO material -- validarConfiguracionHidraulica
// dispara correctamente configuracionHidraulicaSistemaMaterialIncompatible
// y bloquea M1+M2 (comportamiento de validación ya verificado en D-δ.28),
// pero ConfiguracionHidraulicaFormulario (que incluye este mismo selector)
// solo se renderiza cuando el Proyecto es válido: el usuario quedaba sin
// ningún control visible para revertir su propia elección. Este updater
// evita esa trampa manteniendo el sistema actual si sigue siendo compatible
// y, si no, adoptando el primero compatible con el nuevo material -- nunca
// deja seleccionado un par material/sistema incompatible por esta vía.
// Requiere el catálogo de sistemas como parámetro (mismo criterio que
// obtenerMaterialTuberia/obtenerSistemaDeTuberia): esta capa no tiene
// catálogo propio.
export function conMaterialTuberia(
  proyecto: Proyecto,
  materialTuberiaId: MaterialTuberiaId,
  catalogoSistemas: readonly SistemaDeTuberiaCatalogado[],
): Proyecto {
  const sistemaActual = catalogoSistemas.find(
    (sistema) => sistema.id === proyecto.configuracionHidraulica.sistemaDeTuberiaId,
  )
  const sistemaCompatible =
    sistemaActual?.materialTuberiaId === materialTuberiaId
      ? sistemaActual
      : catalogoSistemas.find((sistema) => sistema.materialTuberiaId === materialTuberiaId)

  return {
    ...proyecto,
    configuracionHidraulica: {
      ...proyecto.configuracionHidraulica,
      materialTuberiaId,
      sistemaDeTuberiaId: sistemaCompatible?.id ?? proyecto.configuracionHidraulica.sistemaDeTuberiaId,
    },
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
