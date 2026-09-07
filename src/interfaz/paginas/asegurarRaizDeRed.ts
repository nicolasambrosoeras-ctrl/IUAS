// Bootstrap de la topología compartida de una Red (AF/AC), D-δ.49.
//
// Antes de este incremento, M2-D (ALTA) solo sabía "agregar un hermano"
// junto a una conexión física YA existente del mismo (UF, Local, Red) --
// hallarNodoDeInsercionDeLocal.ts. Cuando el Local+Red no tenía todavía
// NINGÚN terminal, la sincronización devolvía `redesPendientes` sin crear
// nada: la UI nunca podía construir la primera conexión física de un
// Local nuevo, y el proyecto de ejemplo (con su `redHidraulica` completa
// escrita a mano de una sola vez) nunca ejercitó ese camino
// (PENDIENTES-DE-ARQUITECTURA.md D-δ.48/D-δ.49).
//
// Este módulo resuelve la mitad "upstream" del bootstrap: encontrar (o,
// si el proyecto está completamente vacío, crear) el nodo raíz compartido
// de AF (destino de la Alimentación general, D-δ.1) y de AC (destino de
// la Alimentación ACS, D-δ.7/D-δ.13) -- reutilizando exactamente la misma
// señal estructural que ya usan identificarFilasDeModulo2.ts e
// identificarTramoRepresentativoDeLocal.ts (D-δ.44) para reconocer esos
// dos Tramos, sin duplicar su definición completa ni tocar esos dos
// archivos (protegidos, D-δ.44 no se reabre en D-δ.49): acá solo se
// necesita una pregunta más chica ("¿existe ya, y si no, cómo se crea?"),
// nunca la clasificación completa de TODOS los Tramos de la red.
//
// AF y AC son independientes (D-δ.6/D-δ.13): un proyecto puede tener AF
// sin tener nunca AC. asegurarRaizAC crea la Alimentación ACS (y, si hiciera
// falta, también la raíz AF de la que cuelga) la primera vez que el
// proyecto necesita conectar AC -- nunca antes, nunca duplicada.
import type { RedHidraulica } from '../../modelo/redHidraulica'
import { generarId } from './generarId'

export type RaizAsegurada = {
  readonly nodoId: string
  readonly redHidraulica: RedHidraulica
}

// Tramo raíz de toda la topología AF: el único cuyo nodoOrigenId nunca
// aparece como nodoDestinoId de otro Tramo (mismo criterio estructural que
// clasificarTramoDeDistribucionGeneral en los dos archivos de UI ya
// existentes -- ver comentario de archivo).
function encontrarTramoDeAlimentacionGeneral(redHidraulica: RedHidraulica) {
  const idsConTramoEntrante = new Set(redHidraulica.tramos.map((tramo) => tramo.nodoDestinoId))
  return redHidraulica.tramos.find((tramo) => !idsConTramoEntrante.has(tramo.nodoOrigenId))
}

// Tramo de Alimentación ACS: el único cuyo nodo de destino referencia
// produccionACS.
function encontrarTramoDeAlimentacionAcs(redHidraulica: RedHidraulica) {
  const nodosPorId = new Map(redHidraulica.nodos.map((nodo) => [nodo.id, nodo]))
  return redHidraulica.tramos.find((tramo) => nodosPorId.get(tramo.nodoDestinoId)?.referencia?.tipo === 'produccionACS')
}

// Un nodo es "raíz compartida" cuando es el destino directo de la
// Alimentación general o de la Alimentación ACS -- exactamente los dos
// puntos de la topología que sirven (o están arquitectónicamente
// destinados a servir) a TODOS los Locales del proyecto, nunca a uno
// solo, sin importar cuántos hijos tenga hoy cada uno (D-δ.49: n-acs
// puede tener hoy un único Local conectado y ser, aun así, la raíz
// compartida de AC para todo el proyecto). Se descartó deliberadamente
// una alternativa "semántica" (¿el conjunto aguas abajo de este Nodo
// pertenece hoy a un único Local?, vía obtenerArtefactosAguasAbajo): da
// falso negativo exactamente en ese caso -- un Local que todavía es el
// único usuario de la raíz ACS parecería "dedicado" cuando en realidad
// es compartido por diseño. La señal estructural usada acá es correcta
// para cualquier topología construida por asegurarRaizAF/asegurarRaizAC
// (que SIEMPRE crean el Nodo raíz envolvente junto con n0/n-acs en la
// misma operación, D-δ.49) -- distinguir esto de una cabecera dedicada
// de un Local (con un único hijo hasta el momento, pero exclusiva de ese
// Local) es lo que decide si agregar un segundo terminal ahí requiere
// retrofit (insertar una bifurcación propia primero) o si ya es seguro
// colgar el hermano directamente -- ver conectarUnaRed en
// sincronizarConectividadFisicaDeArtefacto.ts.
export function esNodoRaizCompartida(redHidraulica: RedHidraulica, nodoId: string): boolean {
  const tramoGeneral = encontrarTramoDeAlimentacionGeneral(redHidraulica)
  if (tramoGeneral?.nodoDestinoId === nodoId) {
    return true
  }
  const tramoAcs = encontrarTramoDeAlimentacionAcs(redHidraulica)
  return tramoAcs?.nodoDestinoId === nodoId
}

// Encuentra la raíz AF ya existente, o la crea desde una topología
// completamente vacía (D-δ.49, caso "primer Local del proyecto", brief
// sección 13): un nuevo Nodo raíz sin referencia (origen de toda la
// distribución) + el Nodo AF propiamente dicho + el Tramo que los une.
// Nunca se ejecuta si YA existe una Alimentación general -- esta función
// no duplica estructura.
export function asegurarRaizAF(redHidraulica: RedHidraulica): RaizAsegurada {
  const tramoGeneral = encontrarTramoDeAlimentacionGeneral(redHidraulica)
  if (tramoGeneral !== undefined) {
    return { nodoId: tramoGeneral.nodoDestinoId, redHidraulica }
  }

  const nodoOrigenId = generarId('nodo-general')
  const nodoAfId = generarId('nodo-af')
  return {
    nodoId: nodoAfId,
    redHidraulica: {
      nodos: [...redHidraulica.nodos, { id: nodoOrigenId }, { id: nodoAfId }],
      tramos: [
        ...redHidraulica.tramos,
        { id: generarId('tramo-general'), nodoOrigenId, nodoDestinoId: nodoAfId, red: 'AF' },
      ],
    },
  }
}

// Encuentra la raíz AC (produccionACS) ya existente, o la crea colgada de
// la raíz AF (asegurada primero si hiciera falta) -- misma topología que
// t-af-acs en el proyecto de ejemplo: la Alimentación ACS es, ella misma,
// un Tramo de red AF (D-δ.7: "AF → producción ACS → AC" es continuidad
// hidráulica, el equipo no es un terminal de consumo).
export function asegurarRaizAC(redHidraulica: RedHidraulica): RaizAsegurada {
  const tramoAcs = encontrarTramoDeAlimentacionAcs(redHidraulica)
  if (tramoAcs !== undefined) {
    return { nodoId: tramoAcs.nodoDestinoId, redHidraulica }
  }

  const raizAf = asegurarRaizAF(redHidraulica)
  const nodoAcsId = generarId('nodo-acs')
  return {
    nodoId: nodoAcsId,
    redHidraulica: {
      nodos: [...raizAf.redHidraulica.nodos, { id: nodoAcsId, referencia: { tipo: 'produccionACS' } }],
      tramos: [
        ...raizAf.redHidraulica.tramos,
        { id: generarId('tramo-acs'), nodoOrigenId: raizAf.nodoId, nodoDestinoId: nodoAcsId, red: 'AF' },
      ],
    },
  }
}
