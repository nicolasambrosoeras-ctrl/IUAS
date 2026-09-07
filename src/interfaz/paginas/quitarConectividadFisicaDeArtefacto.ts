// Sincronización incremental Proyecto -> redHidraulica al eliminar un
// Artefacto de un Local (M2-D, segunda mitad: BAJA). Sin esto, eliminar
// un Artefacto ya referenciado deja una ReferenciaDeArtefacto huérfana
// que validarRedHidraulica detecta (redHidraulicaReferenciaArtefactoInvalida)
// y bloquea M1+M2 juntos (D-δ.26) -- comportamiento ya conocido, más
// disruptivo que el caso de ALTA (ahí M2 solo mostraba un aviso; acá el
// Proyecto entero queda inválido).
//
// Regla de exclusividad (misma "preservación" que el ALTA, D-δ):
// - se eliminan TODOS los nodos cuya `referencia` identifica exactamente
//   al artefacto (unidadFuncionalId+localId+artefactoId de instancia) --
//   nunca son compartidos con otro artefacto, porque esa identidad es
//   por construcción exclusiva de esta instancia (D-δ.3: un artefacto
//   mixto tiene terminales AF y AC como nodos SEPARADOS, cada uno con la
//   misma referencia, pero ninguno de los dos se comparte con otra
//   instancia);
// - se eliminan los tramos cuyo `nodoDestinoId` es uno de esos nodos --
//   ese tramo entrante es exclusivo del terminal que desaparece;
// - el nodo PADRE (p. ej. una bifurcación de Local) NUNCA se elimina,
//   aunque quede sin hijos: es infraestructura compartida del Local
//   (podría recibir un futuro Artefacto nuevo), no exclusiva de esta
//   instancia -- eliminarlo sería una decisión de "limpieza" que esta
//   función deliberadamente no toma.
import type { Proyecto } from '../../modelo/proyecto'
import type { RedDeTramo } from '../../modelo/redHidraulica'

export function quitarConectividadFisicaDeArtefacto(
  proyecto: Proyecto,
  unidadFuncionalId: string,
  localId: string,
  artefactoInstanciaId: string,
  // D-δ.52: si se pasa una Red, se eliminan SOLO los terminales de esa Red
  // de la instancia (el otro terminal del artefacto mixto se conserva
  // intacto: nodos, tramo, longitud, accesorios, override de DN). Ausente
  // = comportamiento previo (elimina todos los terminales de la instancia).
  red?: RedDeTramo,
): Proyecto {
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    return proyecto
  }

  const idsNodosDeLaInstancia = new Set(
    redHidraulica.nodos
      .filter(
        (nodo) =>
          nodo.referencia?.tipo === 'artefacto' &&
          nodo.referencia.unidadFuncionalId === unidadFuncionalId &&
          nodo.referencia.localId === localId &&
          nodo.referencia.artefactoId === artefactoInstanciaId,
      )
      .map((nodo) => nodo.id),
  )

  const idsNodosAEliminar =
    red === undefined
      ? idsNodosDeLaInstancia
      : new Set(
          redHidraulica.tramos
            .filter((tramo) => tramo.red === red && idsNodosDeLaInstancia.has(tramo.nodoDestinoId))
            .map((tramo) => tramo.nodoDestinoId),
        )

  if (idsNodosAEliminar.size === 0) {
    return proyecto
  }

  return {
    ...proyecto,
    redHidraulica: {
      nodos: redHidraulica.nodos.filter((nodo) => !idsNodosAEliminar.has(nodo.id)),
      tramos: redHidraulica.tramos.filter((tramo) => !idsNodosAEliminar.has(tramo.nodoDestinoId)),
    },
  }
}
