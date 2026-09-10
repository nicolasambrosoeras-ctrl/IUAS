// Sincronización incremental Proyecto -> redHidraulica al agregar un
// Artefacto a un Local existente (M2-D). Composición pura de piezas ya
// cerradas -- no reimplementa ninguna regla: las Redes a conectar llegan
// declaradas por quien llama (CAT-CONN-01: resueltas por la política de
// conectividad del catálogo + override explícito de instancia, nunca por
// precedente del proyecto) + hallarNodoDeInsercionDeLocal (dónde
// conectarlo, derivado de la topología existente, sin persistir ningún
// concepto nuevo de "cabecera") + asegurarRaizDeRed (D-δ.49: dónde
// arranca esa topología cuando el Local+Red todavía no tiene ningún
// terminal).
//
// Aditiva por defecto (D-δ.26/D-δ.f "preservación"): agregar un Nodo/Tramo
// nuevo nunca toca longitud_m/cota_m/accesorios ya cargados en el resto de
// la red. D-δ.49 introduce UNA única excepción, acotada y documentada en
// conectarArtefactoARedes: el "retrofit" que ocurre al agregar el SEGUNDO
// terminal de un Local+Red cuyo único terminal existente cuelga todavía
// directo de una raíz compartida (D-δ.1 general/D-δ.7 ACS) -- ahí sí se
// reescribe el `nodoOrigenId` (nunca otro campo) del Tramo existente, y las
// propiedades físicas representativas ya relevadas (longitud_m, accesorios
// y -- M2-TOPO-B, corrección del gap registrado en D-δ.91 -- el override
// dnComercialAdoptado) viajan al Tramo troncal nuevo, para no dejar dos
// Tramos "representativos" distintos sirviendo al mismo (Local, Red) ni
// perder el DN manual ya adoptado. Ver comentario de esa función para el
// detalle completo.
// Si no se puede determinar con certeza qué Redes necesita el artefacto,
// o el punto de inserción es ambiguo (varios orígenes distintos ya
// conectados sin patrón único), NO fabrica una conexión: deja esa Red
// pendiente y lo reporta explícitamente (redesPendientes) -- la barrera
// de cobertura física (S1/S2) sigue siendo la única fuente de verdad
// sobre qué falta, esta función no la reemplaza ni la oculta.
//
// Idempotente: si el artefacto ya tiene terminal en una Red necesaria
// (p. ej. se llama de nuevo sobre un artefacto parcialmente conectado),
// esa Red se reporta en redesConectadas sin crear una conexión duplicada.
import type { Proyecto } from '../../modelo/proyecto'
import type { Nodo, RedDeTramo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { hallarNodoDeInsercionDeLocal } from '../../motor/tuberias/topologia/hallarNodoDeInsercionDeLocal'
import { generarId } from './generarId'
import { asegurarRaizAC, asegurarRaizAF, esNodoRaizCompartida } from './asegurarRaizDeRed'

export type ResultadoSincronizacionDeArtefacto =
  | {
      readonly tipo: 'sinRedHidraulica'
    }
  | {
      readonly tipo: 'artefactoInexistente'
    }
  | {
      readonly tipo: 'sincronizado'
      readonly proyecto: Proyecto
      // Redes que, al finalizar, quedan conectadas -- ya sea porque el
      // artefacto ya las tenía, o porque esta función acaba de crearlas.
      readonly redesConectadas: readonly RedDeTramo[]
      // Redes declaradas para las que no existe hoy un punto de inserción
      // inequívoco en el Local -- quedan tal como estaban, sin conexión,
      // explícitamente reportadas (la barrera de cobertura S1/S2 sigue
      // siendo la única fuente de verdad sobre qué falta).
      readonly redesPendientes: readonly RedDeTramo[]
    }

// Recibe las Redes a conectar declaradas por quien llama. Bajo CAT-CONN-01
// esas Redes salen de `resolverConectividadInicialDeArtefacto` (política de
// conectividad del catálogo + `Artefacto.conectividadElegida`), nunca de un
// precedente del propio proyecto. Composición aditiva/no destructiva:
// agregar un Nodo/Tramo nuevo nunca toca longitud_m/cota_m/accesorios ya
// cargados (única excepción documentada: el "retrofit" de D-δ.49 en
// conectarArtefactoARedes).
export function sincronizarConectividadFisicaDeArtefactoConRedesDeclaradas(
  proyecto: Proyecto,
  unidadFuncionalId: string,
  localId: string,
  artefactoInstanciaId: string,
  redesDeclaradas: readonly RedDeTramo[],
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

  return conectarArtefactoARedes(proyecto, redHidraulica, unidadFuncionalId, localId, artefactoInstanciaId, redesDeclaradas)
}

function terminalDe(unidadFuncionalId: string, localId: string, artefactoInstanciaId: string, red: RedDeTramo): Nodo {
  return {
    id: generarId(`nodo-${red.toLowerCase()}`),
    referencia: { tipo: 'artefacto', unidadFuncionalId, localId, artefactoId: artefactoInstanciaId },
  }
}

function tramoHacia(nodoOrigenId: string, nodoDestinoId: string, red: RedDeTramo): Tramo {
  return { id: generarId(`tramo-${red.toLowerCase()}`), nodoOrigenId, nodoDestinoId, red }
}

// D-δ.49: conecta UN Artefacto a UNA Red, distinguiendo los tres casos
// reales posibles del (Local, Red) consultado -- ver comentario de
// archivo. `hallarNodoDeInsercionDeLocal` (sin cambios) sigue siendo la
// única fuente de verdad sobre "qué Nodo ya alimenta a este Local en esta
// Red hoy"; esta función decide QUÉ HACER con esa respuesta.
function conectarUnaRed(
  redHidraulica: RedHidraulica,
  unidadFuncionalId: string,
  localId: string,
  artefactoInstanciaId: string,
  red: RedDeTramo,
): { readonly conectado: true; readonly redHidraulica: RedHidraulica } | { readonly conectado: false } {
  const insercion = hallarNodoDeInsercionDeLocal(redHidraulica, unidadFuncionalId, localId, red)

  if (insercion.tipo === 'ambiguo') {
    return { conectado: false }
  }

  if (insercion.tipo === 'sinConexionExistente') {
    // BOOTSTRAP (D-δ.49): el Local todavía no tiene ningún terminal en
    // esta Red -- ni siquiera existe la raíz compartida si el proyecto
    // arranca de cero (brief sección 13). Conexión directa, sin
    // bifurcación: mismo patrón que un Local de un único Artefacto ya
    // usa en el proyecto de ejemplo (p. ej. Jardín/canillaDeServicio).
    const raiz = red === 'AF' ? asegurarRaizAF(redHidraulica) : asegurarRaizAC(redHidraulica)
    const terminal = terminalDe(unidadFuncionalId, localId, artefactoInstanciaId, red)
    return {
      conectado: true,
      redHidraulica: {
        nodos: [...raiz.redHidraulica.nodos, terminal],
        tramos: [...raiz.redHidraulica.tramos, tramoHacia(raiz.nodoId, terminal.id, red)],
      },
    }
  }

  // insercion.tipo === 'nodo': ya existe al menos un terminal de este
  // (Local, Red). Dos sub-casos según de dónde cuelga ese terminal.
  if (!esNodoRaizCompartida(redHidraulica, insercion.nodoId)) {
    // Ya existe una cabecera dedicada a este Local (por un bootstrap o
    // retrofit anterior, o heredada de una topología previa como la del
    // proyecto de ejemplo): agregar el hermano ahí es seguro sin tocar
    // nada -- comportamiento sin cambios respecto de antes de D-δ.49.
    const terminal = terminalDe(unidadFuncionalId, localId, artefactoInstanciaId, red)
    return {
      conectado: true,
      redHidraulica: {
        nodos: [...redHidraulica.nodos, terminal],
        tramos: [...redHidraulica.tramos, tramoHacia(insercion.nodoId, terminal.id, red)],
      },
    }
  }

  // RETROFIT (D-δ.49): el único terminal existente de este Local+Red
  // cuelga TODAVÍA directo de la raíz compartida (AF general o ACS) --
  // nunca se le creó una cabecera propia porque, con un solo Artefacto,
  // no hacía falta ninguna (mismo criterio que hallarNodoDeInsercionDeLocal
  // ya documentaba). Agregar el segundo terminal ahí mismo dejaría DOS
  // Tramos "puros" de este Local colgando directo de la raíz compartida
  // -- identificarTramoRepresentativoDeLocal.ts (D-δ.44) los clasificaría
  // a AMBOS como representativos del mismo (Local, Red), rompiendo la
  // invariante "una fila por Local+Red". Se inserta una bifurcación
  // dedicada: el Tramo existente se re-engancha a esa bifurcación (ÚNICA
  // excepción al principio aditivo de este archivo, ver comentario de
  // archivo).
  //
  // longitud_m/accesorios/dnComercialAdoptado ya cargados viajan con el rol
  // de "Tramo representativo", no con el id del Tramo: el Tramo NUEVO (raíz →
  // bifurcación) hereda esos valores -- es el que
  // identificarTramoRepresentativoDeLocal.ts reconocerá de ahora en más
  // como representativo de este (Local, Red), y en granularidad
  // 'simplificada' es exactamente el único dato que el usuario ve y ya
  // había cargado, así que debe seguir viéndolo ahí, no perderlo. El
  // dnComercialAdoptado (override manual de DN, D-δ.52) se suma acá en
  // M2-TOPO-B: el gap estaba registrado en D-δ.91 (sólo migraban
  // longitud_m/accesorios) y dejaba el DN manual anclado al segmento
  // degradado a ramal, donde ya no describe el diámetro del tramo que el
  // usuario dimensionó. El Tramo existente (ahora bifurcación → terminal
  // original, degradado a ramal) queda sin esos datos: representa un
  // segmento físicamente distinto y más corto que el medido originalmente,
  // y no hay forma de derivar cuánto de la medición original le corresponde
  // -- inventar un valor (copiarlo, partirlo) violaría la sección 7 del
  // brief tanto como dejarlo con un valor que ya no describe la realidad.
  // El reenganche reconstruye el Tramo degradado con sólo
  // id/nodoOrigenId/nodoDestinoId/red, así que no hay duplicación: el
  // override no queda en los dos lados.
  // insercion.nodoId puede ser una raíz compartida con OTROS hijos ajenos
  // a este Local en la misma Red (p. ej. n0 alimentando además a otros
  // Locales, o la propia Alimentación ACS) -- filtrar también por destino
  // perteneciente a este Local, no solo por origen+red, para no reenganchar
  // por error el Tramo de otro Local que también cuelgue de esa raíz.
  const idsTerminalesDelLocal = new Set(
    redHidraulica.nodos
      .filter(
        (nodo) =>
          nodo.referencia?.tipo === 'artefacto' &&
          nodo.referencia.unidadFuncionalId === unidadFuncionalId &&
          nodo.referencia.localId === localId,
      )
      .map((nodo) => nodo.id),
  )
  const tramoExistente = redHidraulica.tramos.find(
    (tramo) => tramo.red === red && tramo.nodoOrigenId === insercion.nodoId && idsTerminalesDelLocal.has(tramo.nodoDestinoId),
  )
  // Inalcanzable en la práctica: insercion.tipo==='nodo' con un único
  // origen posible implica, por construcción de hallarNodoDeInsercionDeLocal,
  // que existe exactamente un Tramo de esta Red con ese nodoOrigenId hacia
  // un terminal de este Local.
  if (tramoExistente === undefined) {
    throw new Error('conectarUnaRed: retrofit sin Tramo existente que reenganchar (estado inalcanzable)')
  }

  const nuevaBifurcacionId = generarId(`nodo-${red.toLowerCase()}`)
  const terminal = terminalDe(unidadFuncionalId, localId, artefactoInstanciaId, red)
  const { longitud_m, accesorios, dnComercialAdoptado } = tramoExistente
  const tramoNuevoTroncal: Tramo = {
    ...tramoHacia(insercion.nodoId, nuevaBifurcacionId, red),
    ...(longitud_m !== undefined ? { longitud_m } : {}),
    ...(accesorios !== undefined ? { accesorios } : {}),
    ...(dnComercialAdoptado !== undefined ? { dnComercialAdoptado } : {}),
  }
  return {
    conectado: true,
    redHidraulica: {
      nodos: [...redHidraulica.nodos, { id: nuevaBifurcacionId }, terminal],
      tramos: [
        ...redHidraulica.tramos.map((tramo): Tramo =>
          tramo.id === tramoExistente.id
            ? { id: tramo.id, nodoOrigenId: nuevaBifurcacionId, nodoDestinoId: tramo.nodoDestinoId, red: tramo.red }
            : tramo,
        ),
        tramoNuevoTroncal,
        tramoHacia(nuevaBifurcacionId, terminal.id, red),
      ],
    },
  }
}

function conectarArtefactoARedes(
  proyecto: Proyecto,
  redHidraulica: NonNullable<Proyecto['redHidraulica']>,
  unidadFuncionalId: string,
  localId: string,
  artefactoInstanciaId: string,
  redes: readonly RedDeTramo[],
): ResultadoSincronizacionDeArtefacto {
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

  let redHidraulicaActual = redHidraulica
  const redesConectadas: RedDeTramo[] = []
  const redesPendientes: RedDeTramo[] = []

  for (const red of redes) {
    if (redesYaConectadas.has(red)) {
      redesConectadas.push(red)
      continue
    }

    const resultado = conectarUnaRed(redHidraulicaActual, unidadFuncionalId, localId, artefactoInstanciaId, red)
    if (!resultado.conectado) {
      redesPendientes.push(red)
      continue
    }
    redHidraulicaActual = resultado.redHidraulica
    redesConectadas.push(red)
  }

  if (redHidraulicaActual === redHidraulica) {
    return { tipo: 'sincronizado', proyecto, redesConectadas, redesPendientes }
  }

  return {
    tipo: 'sincronizado',
    proyecto: { ...proyecto, redHidraulica: redHidraulicaActual },
    redesConectadas,
    redesPendientes,
  }
}
