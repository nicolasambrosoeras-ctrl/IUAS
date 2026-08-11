// Validación de integridad estructural de la red hidráulica (D-δ).
// Valida solo integridad referencial, no semántica hidráulica: no razona
// sobre aguas abajo, conectividad global, raíces ni ciclos (diferido a
// propósito, ver PENDIENTES-DE-ARQUITECTURA.md sección D-δ).

import type { Proyecto } from '../../modelo/proyecto';
import { crearProblema, type ProblemaValidacion } from '../codigos';
import { calcularDiferenciaDeCota } from '../../motor/tuberias/geometria/calcularDiferenciaDeCota';
import { esLongitudGeometricamenteValida } from '../../motor/tuberias/geometria/esLongitudGeometricamenteValida';

export function validarRedHidraulica(proyecto: Proyecto): readonly ProblemaValidacion[] {
  const { redHidraulica } = proyecto;

  if (redHidraulica === undefined) {
    return [];
  }

  const problemas: ProblemaValidacion[] = [];
  const { nodos, tramos } = redHidraulica;

  const idsDeNodoVistos = new Set<string>();
  nodos.forEach((nodo, indiceNodo) => {
    if (idsDeNodoVistos.has(nodo.id)) {
      problemas.push(
        crearProblema('redHidraulicaNodoIdDuplicado', `redHidraulica.nodos[${indiceNodo}].id`, nodo.id),
      );
    }
    idsDeNodoVistos.add(nodo.id);
  });

  const idsDeTramoVistos = new Set<string>();
  tramos.forEach((tramo, indiceTramo) => {
    if (idsDeTramoVistos.has(tramo.id)) {
      problemas.push(
        crearProblema('redHidraulicaTramoIdDuplicado', `redHidraulica.tramos[${indiceTramo}].id`, tramo.id),
      );
    }
    idsDeTramoVistos.add(tramo.id);
  });

  // Conjunto de ids de nodo tal como declarados (incluye duplicados, que ya
  // se reportaron arriba); alcanza para verificar existencia referencial.
  const idsDeNodo = new Set(nodos.map((nodo) => nodo.id));
  const nodosPorId = new Map(nodos.map((nodo) => [nodo.id, nodo]));

  tramos.forEach((tramo, indiceTramo) => {
    const campoTramo = `redHidraulica.tramos[${indiceTramo}]`;

    if (!idsDeNodo.has(tramo.nodoOrigenId)) {
      problemas.push(
        crearProblema(
          'redHidraulicaTramoNodoInexistente',
          `${campoTramo}.nodoOrigenId`,
          tramo.nodoOrigenId,
        ),
      );
    }

    if (!idsDeNodo.has(tramo.nodoDestinoId)) {
      problemas.push(
        crearProblema(
          'redHidraulicaTramoNodoInexistente',
          `${campoTramo}.nodoDestinoId`,
          tramo.nodoDestinoId,
        ),
      );
    }

    if (tramo.nodoOrigenId === tramo.nodoDestinoId) {
      problemas.push(
        crearProblema(
          'redHidraulicaTramoOrigenIgualDestino',
          `${campoTramo}.nodoDestinoId`,
          tramo.nodoDestinoId,
        ),
      );
    }

    // Geometría (CRIT-A20): mientras cota_m/longitud_m sigan opcionales,
    // ausencia de datos no es error -- solo se valida lo que está
    // efectivamente informado. Nunca se asume cota ausente=0 ni longitud
    // ausente=|Δz|.
    if (tramo.longitud_m !== undefined && tramo.longitud_m <= 0) {
      problemas.push(
        crearProblema('redHidraulicaTramoLongitudNoPositiva', `${campoTramo}.longitud_m`, tramo.longitud_m),
      );
    }

    const nodoOrigen = nodosPorId.get(tramo.nodoOrigenId);
    const nodoDestino = nodosPorId.get(tramo.nodoDestinoId);

    if (
      tramo.longitud_m !== undefined &&
      nodoOrigen?.cota_m !== undefined &&
      nodoDestino?.cota_m !== undefined
    ) {
      const diferenciaDeCota_m = calcularDiferenciaDeCota(nodoOrigen.cota_m, nodoDestino.cota_m);

      if (!esLongitudGeometricamenteValida(tramo.longitud_m, diferenciaDeCota_m)) {
        problemas.push(
          crearProblema(
            'redHidraulicaTramoLongitudIncompatibleConCota',
            `${campoTramo}.longitud_m`,
            tramo.longitud_m,
            Math.abs(diferenciaDeCota_m),
          ),
        );
      }
    }
  });

  // Dos nodos distintos pueden referenciar la misma cadena UF/Local/Artefacto
  // (p. ej. terminal AF y terminal AC de un mismo artefacto mixto): esto no
  // se valida como error, a propósito (D-δ.3, D-δ.8).
  nodos.forEach((nodo, indiceNodo) => {
    if (nodo.referencia === undefined || nodo.referencia.tipo !== 'artefacto') {
      return;
    }

    const { unidadFuncionalId, localId, artefactoId } = nodo.referencia;

    const unidadFuncional = proyecto.unidadesFuncionales.find((uf) => uf.id === unidadFuncionalId);
    const local = unidadFuncional?.locales.find((local) => local.id === localId);
    const artefacto = local?.artefactos.find((artefacto) => artefacto.id === artefactoId);

    if (artefacto === undefined) {
      problemas.push(
        crearProblema(
          'redHidraulicaReferenciaArtefactoInvalida',
          `redHidraulica.nodos[${indiceNodo}].referencia`,
          nodo.referencia,
        ),
      );
    }
  });

  return problemas;
}
