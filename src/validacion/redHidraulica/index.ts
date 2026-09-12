// Validación de integridad estructural de la red hidráulica (D-δ).
// Valida integridad referencial (ids, referencias de nodo/artefacto,
// geometría declarada, tees) y, desde M2-TOPO-A, las dos invariantes de
// ARBORESCENCIA que el alcance hidráulico de Módulo 2 exige (CRIT-A27 /
// D-δ.37): ningún Nodo con más de un tramo entrante y ningún ciclo
// dirigido. NO razona todavía sobre conectividad global, "nodo huérfano"
// ni "raíz ausente" -- son estados que la reconciliación incremental
// atraviesa de forma legítima durante la edición y su política queda
// diferida (ver PENDIENTES-DE-ARQUITECTURA.md, M2-TOPO-01). Una red vacía
// ({nodos:[], tramos:[]}) es válida: representa un Módulo 2 recién
// iniciado, nunca "raíz ausente".

import type { Proyecto } from '../../modelo/proyecto';
import { idsAccesorioDeTramo } from '../../modelo/redHidraulica';
import { crearProblema, type ProblemaValidacion } from '../codigos';
import { calcularDiferenciaDeCota } from '../../motor/tuberias/geometria/calcularDiferenciaDeCota';
import { esLongitudGeometricamenteValida } from '../../motor/tuberias/geometria/esLongitudGeometricamenteValida';
import { localesDeUnidadFuncional } from '../../motor/tuberias/geometria/resolverCotaHidraulicaDeArtefacto';

// M2-TOPO-C: integridad referencial de las identidades semánticas de
// montante (Proyecto.montantes) y de las referencias `Tramo.montanteId`.
// SÓLO shape / integridad referencial: la coherencia topológica más
// profunda (un mismo (Local,Red) servido por >1 montante, un montante con
// topología no resoluble) se valida donde vive la reconciliación, no acá.
// `redPorMontanteId` es undefined para un id de montante inválido (red no
// 'AF'/'AC'): en ese caso no se emite además el problema de coherencia de
// red por Tramo -- un solo reporte por dato roto.
function validarMontantes(proyecto: Proyecto): {
  readonly problemas: readonly ProblemaValidacion[];
  readonly redPorMontanteId: ReadonlyMap<string, 'AF' | 'AC'>;
} {
  const problemas: ProblemaValidacion[] = [];
  const montantes = proyecto.montantes ?? [];

  const idsVistos = new Set<string>();
  const redPorMontanteId = new Map<string, 'AF' | 'AC'>();

  montantes.forEach((montante, indice) => {
    if (idsVistos.has(montante.id)) {
      problemas.push(
        crearProblema('redHidraulicaMontanteIdDuplicado', `montantes[${indice}].id`, montante.id),
      );
    }
    idsVistos.add(montante.id);

    if (montante.red !== 'AF' && montante.red !== 'AC') {
      problemas.push(
        crearProblema('redHidraulicaMontanteRedInvalida', `montantes[${indice}].red`, montante.red),
      );
      return;
    }
    // Con id duplicado se conserva la red del primero: alcanza para no
    // emitir falsos positivos de coherencia; el id duplicado ya se reportó.
    if (!redPorMontanteId.has(montante.id)) {
      redPorMontanteId.set(montante.id, montante.red);
    }
  });

  return { problemas, redPorMontanteId };
}

export function validarRedHidraulica(proyecto: Proyecto): readonly ProblemaValidacion[] {
  const { redHidraulica } = proyecto;

  const { problemas: problemasDeMontantes, redPorMontanteId } = validarMontantes(proyecto);

  if (redHidraulica === undefined) {
    return problemasDeMontantes;
  }

  const problemas: ProblemaValidacion[] = [...problemasDeMontantes];
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

    // Accesorios (D-δ.33): ausencia (undefined) es "no relevado todavía",
    // no se valida acá -- solo se valida lo efectivamente informado, mismo
    // criterio que longitud_m/cota_m. `tipo` es una unión cerrada en
    // TypeScript, pero datos persistidos/externos (JSON) pueden violarla
    // en runtime -- se verifica explícitamente contra idsAccesorioDeTramo
    // en vez de confiar únicamente en el compilador, porque este
    // subconjunto está pensado para crecer (tees, D-δ.33) y un tipo
    // todavía no soportado nunca debe tratarse
    // silenciosamente como si no existiera.
    if (tramo.accesorios !== undefined) {
      tramo.accesorios.forEach((accesorio, indiceAccesorio) => {
        const campoAccesorio = `${campoTramo}.accesorios[${indiceAccesorio}]`;

        if (!idsAccesorioDeTramo.includes(accesorio.tipo)) {
          problemas.push(
            crearProblema('redHidraulicaTramoAccesorioTipoNoSoportado', `${campoAccesorio}.tipo`, accesorio.tipo),
          );
        }

        if (accesorio.cantidad <= 0) {
          problemas.push(
            crearProblema(
              'redHidraulicaTramoAccesorioCantidadNoPositiva',
              `${campoAccesorio}.cantidad`,
              accesorio.cantidad,
            ),
          );
        }
      });
    }

    // M2-TOPO-C: pertenencia semántica a un montante explícito. `undefined`
    // no se valida (el Tramo simplemente no pertenece a ningún montante).
    if (tramo.montanteId !== undefined) {
      const redDelMontante = redPorMontanteId.get(tramo.montanteId);
      if (redDelMontante === undefined) {
        // No existe (o su red era inválida y ya se reportó): en ambos casos
        // no hay una identidad de montante válida a la que este Tramo pueda
        // pertenecer.
        if ((proyecto.montantes ?? []).some((montante) => montante.id === tramo.montanteId)) {
          // Existe pero con red inválida -> ya hay un problema sobre el
          // montante; no se duplica acá.
        } else {
          problemas.push(
            crearProblema(
              'redHidraulicaTramoMontanteInexistente',
              `${campoTramo}.montanteId`,
              tramo.montanteId,
            ),
          );
        }
      } else if (redDelMontante !== tramo.red) {
        problemas.push(
          crearProblema(
            'redHidraulicaTramoMontanteRedIncoherente',
            `${campoTramo}.montanteId`,
            tramo.montanteId,
            redDelMontante,
          ),
        );
      }
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

  // Configuración de tee (CRIT-A31, D-δ.33): `Nodo.tee` ausente no se
  // valida acá -- mismo criterio "no relevado todavía" que longitud_m/
  // accesorios. Solo se valida lo efectivamente declarado.
  nodos.forEach((nodo, indiceNodo) => {
    if (nodo.tee === undefined) {
      return;
    }

    const campoNodo = `redHidraulica.nodos[${indiceNodo}]`;
    const salientes = tramos.filter((tramo) => tramo.nodoOrigenId === nodo.id);
    const entrantes = tramos.filter((tramo) => tramo.nodoDestinoId === nodo.id);

    if (salientes.length !== 2 || entrantes.length !== 1) {
      // Estructura no soportada: no tiene sentido validar
      // tramoSalidaRectaId contra un conjunto de salientes que no es el
      // esperado (1 entrante + 2 salientes) -- un único problema, no dos
      // reportes potencialmente confusos sobre el mismo dato roto.
      problemas.push(crearProblema('redHidraulicaNodoTeeEstructuraNoSoportada', `${campoNodo}.tee`, nodo.tee));
      return;
    }

    if (nodo.tee.tipo === 'entradaPorExtremo') {
      const idsSalientes = new Set(salientes.map((tramo) => tramo.id));
      if (!idsSalientes.has(nodo.tee.tramoSalidaRectaId)) {
        problemas.push(
          crearProblema(
            'redHidraulicaNodoTeeTramoSalidaRectaInvalido',
            `${campoNodo}.tee.tramoSalidaRectaId`,
            nodo.tee.tramoSalidaRectaId,
          ),
        );
      }
    }
  });

  // Arborescencia, invariante 1 (CRIT-A27 / D-δ.37): cada Nodo debe tener
  // a lo sumo un tramo entrante. Dos o más -> convergencia 2→1, tramos
  // paralelos o malla: fuera del alcance hidráulico de M2
  // (obtenerCaminoHaciaOrigen devuelve 'multiplesTramosEntrantes' ante esa
  // misma condición). Se cuenta sobre los tramos tal como están
  // declarados; un tramo con nodoDestinoId inexistente ya lo reporta
  // redHidraulicaTramoNodoInexistente y no incrementa el conteo de ningún
  // Nodo real. Una tee de fan-out 1→N (N>=2 salientes) NO es un problema
  // acá: esta invariante mira los ENTRANTES, no los salientes.
  const conteoEntrantePorNodo = new Map<string, number>();
  tramos.forEach((tramo) => {
    if (idsDeNodo.has(tramo.nodoDestinoId)) {
      conteoEntrantePorNodo.set(
        tramo.nodoDestinoId,
        (conteoEntrantePorNodo.get(tramo.nodoDestinoId) ?? 0) + 1,
      );
    }
  });
  nodos.forEach((nodo, indiceNodo) => {
    const entrantes = conteoEntrantePorNodo.get(nodo.id) ?? 0;
    if (entrantes > 1) {
      problemas.push(
        crearProblema(
          'redHidraulicaNodoMultiplesTramosEntrantes',
          `redHidraulica.nodos[${indiceNodo}]`,
          nodo.id,
          entrantes,
        ),
      );
    }
  });

  // Arborescencia, invariante 2 (CRIT-A27): ningún ciclo dirigido siguiendo
  // nodoOrigenId -> nodoDestinoId. DFS iterativo con marca de tres estados
  // (no visitado / en el descenso actual / cerrado): nunca lanza ni entra
  // en loop infinito ante cualquier topología. Sólo recorre aristas entre
  // Nodos existentes. Determinista: nodos en el orden de `redHidraulica.nodos`,
  // salientes en el orden de `redHidraulica.tramos`. Un DAG con
  // reconvergencia (diamante A→B, A→C, B→D, C→D) NO se marca como ciclo
  // -- sólo una arista que vuelve a un Nodo aún en el descenso.
  const salientesPorNodo = new Map<string, string[]>();
  tramos.forEach((tramo) => {
    if (!idsDeNodo.has(tramo.nodoOrigenId) || !idsDeNodo.has(tramo.nodoDestinoId)) {
      return;
    }
    const destinos = salientesPorNodo.get(tramo.nodoOrigenId) ?? [];
    destinos.push(tramo.nodoDestinoId);
    salientesPorNodo.set(tramo.nodoOrigenId, destinos);
  });

  const NO_VISITADO = 0;
  const EN_DESCENSO = 1;
  const CERRADO = 2;
  const estadoDeNodo = new Map<string, number>();
  const nodosEnCiclo = new Set<string>();

  for (const nodoInicial of nodos) {
    if ((estadoDeNodo.get(nodoInicial.id) ?? NO_VISITADO) !== NO_VISITADO) {
      continue;
    }
    const pila: Array<{ readonly nodoId: string; readonly fase: 'entrar' | 'salir' }> = [
      { nodoId: nodoInicial.id, fase: 'entrar' },
    ];
    while (pila.length > 0) {
      const marco = pila.pop() as { readonly nodoId: string; readonly fase: 'entrar' | 'salir' };
      if (marco.fase === 'salir') {
        estadoDeNodo.set(marco.nodoId, CERRADO);
        continue;
      }
      const estadoActual = estadoDeNodo.get(marco.nodoId) ?? NO_VISITADO;
      if (estadoActual === CERRADO) {
        continue;
      }
      if (estadoActual === EN_DESCENSO) {
        // Arista de retorno a un Nodo aún en el descenso actual -> ciclo.
        nodosEnCiclo.add(marco.nodoId);
        continue;
      }
      estadoDeNodo.set(marco.nodoId, EN_DESCENSO);
      pila.push({ nodoId: marco.nodoId, fase: 'salir' });
      const destinos = salientesPorNodo.get(marco.nodoId) ?? [];
      for (let indice = destinos.length - 1; indice >= 0; indice -= 1) {
        const destino = destinos[indice] as string;
        if ((estadoDeNodo.get(destino) ?? NO_VISITADO) !== CERRADO) {
          pila.push({ nodoId: destino, fase: 'entrar' });
        }
      }
    }
  }

  nodos.forEach((nodo, indiceNodo) => {
    if (nodosEnCiclo.has(nodo.id)) {
      problemas.push(
        crearProblema('redHidraulicaCicloDirigido', `redHidraulica.nodos[${indiceNodo}]`, nodo.id),
      );
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
    const local = unidadFuncional === undefined ? undefined : localesDeUnidadFuncional(unidadFuncional).find((local) => local.id === localId);
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
