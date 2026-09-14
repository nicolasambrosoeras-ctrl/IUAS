// VIS-TOPO-01 -- Capa 2 del pipeline (VIS-TOPO-00 §13/§22):
// GrafoVisual -> GrafoVisualPosicionado. Envuelve Dagre (@dagrejs/dagre,
// MIT, mantenido activamente -- VIS-TOPO-01.md documenta la elección
// frente al paquete histórico `dagre`). Determinista: el mismo
// GrafoVisual de entrada produce siempre el mismo layout (mismo orden de
// inserción de nodos/aristas, sin aleatoriedad).
//
// Dagre sólo resuelve RANGO/ORDEN/POSICIÓN de nodos (x/y por nodo). El
// TRAZADO de cada arista se calcula acá con geometría ORTOGONAL propia
// (VIS-TOPO-01B): nunca un segmento diagonal -- salida por el borde
// inferior del nodo origen, entrada por el borde superior del destino,
// con un codo horizontal intermedio cuando no están alineados (ver
// `rutaOrtogonal`). Motivo original de NO delegar el trazado a Dagre
// (VIS-TOPO-01): en multigraph, 3+ aristas paralelas entre el mismo par
// de nodos pueden lanzar "Not possible to find intersection inside of
// the rectangle" cuando ese par tiene además un nodo hermano en el mismo
// rank (bug reproducido de forma aislada, ajeno a este adaptador, con
// @dagrejs/dagre 3.1.1) -- evitarlo por diseño sigue siendo más simple y
// más robusto que parchear Dagre, y el routing ortogonal propio además
// da la lectura de "red técnica" que pidió la validación manual de
// VIS-TOPO-01 (troncales verticales, ramificaciones horizontales a 90°,
// VIS-TOPO-01B §13).
//
// Esta capa NO interpreta topología: sólo traduce nodos/aristas ya
// adaptados por resolverGrafoVisual.ts a coordenadas. x/y NUNCA se
// persisten -- se recalculan en cada resolución (VIS-TOPO-00 §31/B39).
import dagre from '@dagrejs/dagre'
import type { AristaVisual, GrafoVisual, NodoVisual, TipoNodoVisual } from './resolverGrafoVisual'

export type PuntoVisual = { readonly x: number; readonly y: number }

export type NodoPosicionado = NodoVisual & {
  readonly x: number
  readonly y: number
  readonly ancho: number
  readonly alto: number
}

export type AristaPosicionada = AristaVisual & {
  readonly puntos: readonly PuntoVisual[]
}

export type GrafoVisualPosicionado = {
  readonly nodos: readonly NodoPosicionado[]
  readonly aristas: readonly AristaPosicionada[]
  // Bounding box del layout completo (incluye nodos y trazado de
  // aristas) -- consumida por el botón "Ajustar" (VIS-TOPO-00 §18,
  // VIS-TOPO-01 B24), nunca depende de un tamaño persistido.
  readonly minX: number
  readonly minY: number
  readonly ancho: number
  readonly alto: number
}

// Tamaños deterministas por tipo (B19): preferidos a medir el DOM
// post-render -- evita un segundo pase de layout y mantiene el resultado
// reproducible en tests.
const TAMANO_POR_TIPO: Readonly<Record<TipoNodoVisual, { ancho: number; alto: number }>> = {
  origen: { ancho: 150, alto: 48 },
  local: { ancho: 172, alto: 56 },
  derivacion: { ancho: 28, alto: 28 },
  intermedio: { ancho: 10, alto: 10 },
}

// Fan-out no detallado lleva label ("Distribución no detallada") -- más
// ancho que una tee 1→2 silenciosa para no recortar el texto.
const ANCHO_DERIVACION_NO_DETALLADA = 190
const ALTO_DERIVACION_NO_DETALLADA = 40

// Separación entre aristas paralelas (mismo origen/destino visual), en
// unidades de mundo -- VIS-TOPO-01B §19: pequeña, simétrica, determinista
// según el índice estable de la arista (p. ej. 3 aristas -> -8/0/+8).
const SEPARACION_PARALELA = 8

function tamanoDeNodo(nodo: NodoVisual): { ancho: number; alto: number } {
  if (nodo.tipo === 'derivacion' && nodo.noDetallado === true) {
    return { ancho: ANCHO_DERIVACION_NO_DETALLADA, alto: ALTO_DERIVACION_NO_DETALLADA }
  }
  return TAMANO_POR_TIPO[nodo.tipo]
}

// Tolerancia para "misma coordenada" -- Dagre no siempre entrega x
// idéntico bit a bit para nodos que están lógicamente alineados
// (rank-alignment interno con redondeo propio). Por debajo de este
// margen, dos coordenadas se tratan como iguales para decidir routing
// puramente vertical vs. codo ortogonal.
const EPSILON_ALINEACION = 0.5

// VIS-TOPO-01B: routing ORTOGONAL determinista (VIS-TOPO-00 seguía la
// recomendación de un SVG técnico limpio; la validación manual de
// VIS-TOPO-01 pidió eliminar el aspecto de "grafo genérico diagonal").
// Cada arista sale por el borde INFERIOR de su nodo origen y entra por
// el borde SUPERIOR de su nodo destino (layout siempre TB) -- nunca por
// un punto lateral ni por el centro. Invariante que exige VIS-TOPO-01B
// §13: para cada par de puntos consecutivos del path, x1===x2 (tramo
// vertical) o y1===y2 (tramo horizontal), nunca ambos distintos.
//
//   - origen.x ≈ destino.x (dentro de EPSILON_ALINEACION): línea vertical
//     pura, 2 puntos.
//   - si no: codo en 3 tramos (vertical → horizontal → vertical), 4
//     puntos, con una `branchY` intermedia entre ambos nodos (VIS-TOPO-01B
//     §14-§16). Si además la arista pertenece a un grupo de aristas
//     paralelas (mismo par origen/destino visual, VIS-TOPO-00 §18), cada
//     una recibe su propia `branchY` desplazada por índice -- un
//     "escalonado" determinista en vez de superponerse (VIS-TOPO-01B
//     §18-§19). Para el caso alineado (línea vertical pura) el desplazamiento
//     paralelo se aplica lateralmente en su lugar (offset de x, igual en
//     ambos puntos -- sigue siendo una vertical pura, sólo desplazada).
function puntoInferior(nodo: { x: number; y: number; alto: number }): PuntoVisual {
  return { x: nodo.x, y: nodo.y + nodo.alto / 2 }
}

function puntoSuperior(nodo: { x: number; y: number; alto: number }): PuntoVisual {
  return { x: nodo.x, y: nodo.y - nodo.alto / 2 }
}

function rutaOrtogonal(
  origen: { x: number; y: number; alto: number },
  destino: { x: number; y: number; alto: number },
  offsetLateral: number,
): readonly PuntoVisual[] {
  const salida = puntoInferior(origen)
  const entrada = puntoSuperior(destino)

  if (Math.abs(origen.x - destino.x) < EPSILON_ALINEACION) {
    // Alineados: vertical pura, desplazada lateralmente si es una lane
    // de un grupo de aristas paralelas (offsetLateral === 0 en el caso
    // normal de 1 sola arista entre ese par).
    const x = salida.x + offsetLateral
    return [
      { x, y: salida.y },
      { x, y: entrada.y },
    ]
  }

  // Codo determinista: la cota de quiebre es el punto medio entre la
  // salida del origen y la entrada del destino (VIS-TOPO-01B §16). Si
  // varias aristas comparten el mismo par origen/destino, cada una
  // desplaza SU bus por `offsetLateral` -- un fan-out real desde el
  // mismo origen hacia distintos destinos del mismo rank comparte la
  // misma `branchY` de forma natural (misma fórmula, mismos y de salida/
  // entrada), leyéndose como un único bus horizontal aunque cada arista
  // dibuje su propio tramo.
  const branchY = (salida.y + entrada.y) / 2 + offsetLateral
  return [
    salida,
    { x: salida.x, y: branchY },
    { x: destino.x, y: branchY },
    entrada,
  ]
}

// Clave estable para un par (origen,destino) visual. Separador literal
// "::" -- deliberadamente no un carácter de control no imprimible: en
// un paso previo de este mismo slice un separador de ese tipo terminó
// escrito como byte crudo en el archivo fuente (detectado porque git lo
// marcaba como binario); "::" es igual de seguro (ningún id de este
// dominio lo usa) y no depende de que la herramienta de escritura
// preserve escapes de caracteres de control.
const SEPARADOR_CLAVE_PAR = '::'

function claveDePar(origenId: string, destinoId: string): string {
  return `${origenId}${SEPARADOR_CLAVE_PAR}${destinoId}`
}

function agruparPorParOrigenDestino(aristas: readonly AristaVisual[]): ReadonlyMap<string, readonly AristaVisual[]> {
  const grupos = new Map<string, AristaVisual[]>()
  for (const arista of aristas) {
    const clave = claveDePar(arista.origenId, arista.destinoId)
    const lista = grupos.get(clave)
    if (lista === undefined) {
      grupos.set(clave, [arista])
    } else {
      lista.push(arista)
    }
  }
  return grupos
}

export function layoutGrafoVisual(grafo: GrafoVisual): GrafoVisualPosicionado {
  if (grafo.nodos.length === 0) {
    return { nodos: [], aristas: [], minX: 0, minY: 0, ancho: 0, alto: 0 }
  }

  const g = new dagre.graphlib.Graph()
  // rankdir TB (arriba -> abajo, VIS-TOPO-00 §18): sigue el sentido del
  // flujo hidráulico principal, origen arriba, Locales abajo.
  g.setGraph({ rankdir: 'TB', nodesep: 36, ranksep: 64, marginx: 24, marginy: 24 })
  g.setDefaultEdgeLabel(() => ({}))

  const tamanos = new Map<string, { ancho: number; alto: number }>()
  for (const nodo of grafo.nodos) {
    const tamano = tamanoDeNodo(nodo)
    tamanos.set(nodo.id, tamano)
    g.setNode(nodo.id, { width: tamano.ancho, height: tamano.alto })
  }

  // Dagre sólo necesita UN arco por par (origen,destino) para resolver
  // rank/orden correctamente -- los Tramos reales duplicados sobre el
  // mismo par no aportan información topológica nueva a la ranking, y
  // agregarlos todos es lo que dispara el bug de Dagre descrito arriba.
  const paresYaAgregados = new Set<string>()
  for (const arista of grafo.aristas) {
    const clave = claveDePar(arista.origenId, arista.destinoId)
    if (paresYaAgregados.has(clave)) {
      continue
    }
    paresYaAgregados.add(clave)
    g.setEdge(arista.origenId, arista.destinoId)
  }

  dagre.layout(g)

  const nodos: NodoPosicionado[] = grafo.nodos.map((nodo) => {
    const posicion = g.node(nodo.id) as unknown as { x: number; y: number }
    const tamano = tamanos.get(nodo.id)!
    return { ...nodo, x: posicion.x, y: posicion.y, ancho: tamano.ancho, alto: tamano.alto }
  })
  const posicionPorId = new Map(nodos.map((nodo) => [nodo.id, nodo]))

  const gruposParalelos = agruparPorParOrigenDestino(grafo.aristas)
  const aristas: AristaPosicionada[] = []
  for (const grupo of gruposParalelos.values()) {
    const origen = posicionPorId.get(grupo[0]!.origenId)
    const destino = posicionPorId.get(grupo[0]!.destinoId)
    if (origen === undefined || destino === undefined) {
      continue
    }
    const cantidad = grupo.length
    grupo.forEach((arista, indice) => {
      const offsetLateral = (indice - (cantidad - 1) / 2) * SEPARACION_PARALELA
      aristas.push({ ...arista, puntos: rutaOrtogonal(origen, destino, offsetLateral) })
    })
  }
  // Orden estable: igual al de `grafo.aristas` (no al de inserción por
  // grupo), para que el resultado no dependa del agrupamiento interno.
  const ordenOriginal = new Map(grafo.aristas.map((arista, indice) => [arista.id, indice]))
  aristas.sort((a, b) => ordenOriginal.get(a.id)! - ordenOriginal.get(b.id)!)

  let minX = Number.POSITIVE_INFINITY
  let minY = Number.POSITIVE_INFINITY
  let maxX = Number.NEGATIVE_INFINITY
  let maxY = Number.NEGATIVE_INFINITY
  for (const nodo of nodos) {
    minX = Math.min(minX, nodo.x - nodo.ancho / 2)
    minY = Math.min(minY, nodo.y - nodo.alto / 2)
    maxX = Math.max(maxX, nodo.x + nodo.ancho / 2)
    maxY = Math.max(maxY, nodo.y + nodo.alto / 2)
  }
  for (const arista of aristas) {
    for (const punto of arista.puntos) {
      minX = Math.min(minX, punto.x)
      minY = Math.min(minY, punto.y)
      maxX = Math.max(maxX, punto.x)
      maxY = Math.max(maxY, punto.y)
    }
  }

  return { nodos, aristas, minX, minY, ancho: maxX - minX, alto: maxY - minY }
}
