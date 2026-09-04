// Sincronización incremental Proyecto -> redHidraulica al agregar un
// Artefacto a un Local existente (M2-D, primer slice: solo ALTA).
// Composición pura de piezas ya cerradas -- no reimplementa ninguna
// regla: determinarRedesFisicasPorPrecedente (qué Redes necesita el
// artefacto, mirando el propio proyecto, nunca el catálogo) +
// hallarNodoDeInsercionDeLocal (dónde conectarlo, derivado de la
// topología existente, sin persistir ningún concepto nuevo de
// "cabecera").
//
// Aditiva y no destructiva a propósito (D-δ.26/D-δ.f "preservación"):
// solo AGREGA Nodo(s)/Tramo(s) nuevos. Nunca modifica, mueve ni recalcula
// un Tramo/Nodo existente -- longitud_m, cota_m, accesorios y cualquier
// otro dato hidráulico ya cargado por el usuario en el resto de la red
// quedan intactos. Si no se puede determinar con certeza qué Redes
// necesita el artefacto o dónde insertarlo, NO fabrica una conexión:
// deja esa Red pendiente y lo reporta explícitamente (redesPendientes)
// -- la barrera de cobertura física (S1/S2) sigue siendo la única fuente
// de verdad sobre qué falta, esta función no la reemplaza ni la oculta.
//
// Idempotente: si el artefacto ya tiene terminal en una Red necesaria
// (p. ej. se llama de nuevo sobre un artefacto parcialmente conectado),
// esa Red se reporta en redesConectadas sin crear una conexión duplicada.
import type { Proyecto } from '../../modelo/proyecto'
import type { Nodo, RedDeTramo, Tramo } from '../../modelo/redHidraulica'
import { determinarRedesFisicasPorPrecedente } from '../../motor/tuberias/topologia/determinarRedesFisicasPorPrecedente'
import { hallarNodoDeInsercionDeLocal } from '../../motor/tuberias/topologia/hallarNodoDeInsercionDeLocal'
import { generarId } from './duplicarUnidadFuncional'

export type ResultadoSincronizacionDeArtefacto =
  | {
      readonly tipo: 'sinRedHidraulica'
    }
  | {
      readonly tipo: 'artefactoInexistente'
    }
  | {
      // No se pudo determinar qué Redes necesita este artefactoId de
      // catálogo: sin precedente en el proyecto, o con precedentes
      // inconsistentes entre sí. No se toca redHidraulica.
      readonly tipo: 'redesNoDeterminables'
      readonly motivo: 'sinPrecedente' | 'inconsistente'
    }
  | {
      readonly tipo: 'sincronizado'
      readonly proyecto: Proyecto
      // Redes que, al finalizar, quedan conectadas -- ya sea porque el
      // artefacto ya las tenía, o porque esta función acaba de crearlas.
      readonly redesConectadas: readonly RedDeTramo[]
      // Redes necesarias (según el precedente) para las que no existe
      // hoy un punto de inserción inequívoco en el Local -- quedan tal
      // como estaban, sin conexión, explícitamente reportadas.
      readonly redesPendientes: readonly RedDeTramo[]
    }

export function sincronizarConectividadFisicaDeArtefacto(
  proyecto: Proyecto,
  unidadFuncionalId: string,
  localId: string,
  artefactoInstanciaId: string,
): ResultadoSincronizacionDeArtefacto {
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    return { tipo: 'sinRedHidraulica' }
  }

  const unidadFuncional = proyecto.unidadesFuncionales.find((uf) => uf.id === unidadFuncionalId)
  const local = unidadFuncional?.locales.find((l) => l.id === localId)
  const artefactoInstancia = local?.artefactos.find((a) => a.id === artefactoInstanciaId)
  if (artefactoInstancia === undefined) {
    return { tipo: 'artefactoInexistente' }
  }

  const precedente = determinarRedesFisicasPorPrecedente(proyecto, artefactoInstancia.artefactoId)
  if (precedente.tipo !== 'determinado') {
    return { tipo: 'redesNoDeterminables', motivo: precedente.tipo }
  }

  const idsNodosDelArtefacto = new Set(
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
  const redesYaConectadas = new Set<RedDeTramo>(
    redHidraulica.tramos.filter((tramo) => idsNodosDelArtefacto.has(tramo.nodoDestinoId)).map((tramo) => tramo.red),
  )

  const nodosNuevos: Nodo[] = []
  const tramosNuevos: Tramo[] = []
  const redesConectadas: RedDeTramo[] = []
  const redesPendientes: RedDeTramo[] = []

  for (const red of precedente.redes) {
    if (redesYaConectadas.has(red)) {
      redesConectadas.push(red)
      continue
    }

    const insercion = hallarNodoDeInsercionDeLocal(redHidraulica, unidadFuncionalId, localId, red)
    if (insercion.tipo !== 'nodo') {
      redesPendientes.push(red)
      continue
    }

    const nuevoNodoId = generarId(`nodo-${red.toLowerCase()}`)
    nodosNuevos.push({
      id: nuevoNodoId,
      referencia: { tipo: 'artefacto', unidadFuncionalId, localId, artefactoId: artefactoInstanciaId },
    })
    tramosNuevos.push({
      id: generarId(`tramo-${red.toLowerCase()}`),
      nodoOrigenId: insercion.nodoId,
      nodoDestinoId: nuevoNodoId,
      red,
    })
    redesConectadas.push(red)
  }

  if (nodosNuevos.length === 0) {
    return { tipo: 'sincronizado', proyecto, redesConectadas, redesPendientes }
  }

  return {
    tipo: 'sincronizado',
    proyecto: {
      ...proyecto,
      redHidraulica: {
        nodos: [...redHidraulica.nodos, ...nodosNuevos],
        tramos: [...redHidraulica.tramos, ...tramosNuevos],
      },
    },
    redesConectadas,
    redesPendientes,
  }
}
