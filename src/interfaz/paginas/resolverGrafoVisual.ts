// VIS-TOPO-01 -- adaptación semántica PURA: Proyecto/RedHidraulica ->
// GrafoVisual. Capa 1 del pipeline (VIS-TOPO-00 §13/§22): NO conoce React,
// NO conoce SVG, NO calcula coordenadas -- eso es responsabilidad exclusiva
// de layoutGrafoVisual.ts (capa 2) y EsquemaHidraulico.tsx (capa 3).
//
// Fuente de verdad ÚNICA: `RedHidraulica` + `Proyecto.montantes` +
// UF/Nivel/Local (ADR-0001/ADR-0002) -- ningún dato nuevo, ninguna segunda
// topología, ningún x/y. No invoca el motor de cálculo hidráulico (Qc/DN
// automático/V/hf): sólo lee datos físicos ya persistidos en `Tramo`
// (longitud_m, dnComercialAdoptado) -- mantiene esta capa liviana y
// reutilizable incluso en proyectos grandes (VIS-TOPO-00 §16).
//
// Reglas de honestidad (VIS-TOPO-00 §10-§11):
//   - un fan-out 1→N (N≥3) se muestra con sus N aristas reales, marcado
//     `noDetallado` -- nunca se inventan tees intermedias;
//   - un cambio de DN entre tramos consecutivos NUNCA se interpreta como
//     un reductor físico;
//   - un Montante nunca se convierte en nodo: sus segmentos siguen siendo
//     aristas reales, agrupadas sólo por estilo/etiqueta compartida.
import type { Local, Nivel, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, RedDeTramo, Tramo } from '../../modelo/redHidraulica'
import { crearIndiceTopologico } from '../../motor/tuberias/topologia/indiceTopologico'
import { resolverOrigenHidraulicoEfectivo } from '../../motor/modulo4/resolverOrigenHidraulico'
import { nombreDeUnidadFuncional } from './nombreDeUnidadFuncional'
import { nombreDeMontante } from './nombreDeMontante'
import { proyectarMontante } from './montantesDelProyecto'
import { derivarOrdinalesDeLocal } from './identificarFilasDeModulo2'

export type RedVisual = RedDeTramo

export type TipoNodoVisual = 'origen' | 'intermedio' | 'derivacion' | 'local'

export type NodoVisual = {
  readonly id: string
  readonly tipo: TipoNodoVisual
  // Nodo.id real -- ausente sólo para 'local' (agregado sintético de
  // (unidadFuncionalId, localId), sin un único Nodo real que lo represente
  // 1:1: un Local puede tener varios terminales AF/AC).
  readonly dominioId?: string
  readonly label: string
  readonly sublabel?: string
  // Sólo con sentido semántico en 'origen' (AF vs. producción ACS): el
  // resto de los tipos no tiene una red propia -- la llevan sus aristas.
  readonly red?: RedVisual
  readonly grupoUfId?: string
  readonly grupoNivelId?: string
  // Fan-out 1→N (N≥3, `derivacionMultipleNoModelada`): el modelo no tiene
  // datos para representar su geometría física real. `cantidadSalidas`
  // sólo se define junto con `noDetallado`.
  readonly noDetallado?: boolean
  readonly cantidadSalidas?: number
}

export type AristaVisual = {
  // Igual a `dominioTramoId` en V1 (cada Tramo real es EXACTAMENTE una
  // arista, nunca se dividen ni se fusionan) -- se mantienen ambos campos
  // para no confundir identidad de dominio con identidad visual si un
  // futuro slice necesita divergir.
  readonly id: string
  readonly dominioTramoId: string
  readonly origenId: string
  readonly destinoId: string
  readonly red: RedVisual
  readonly dnTexto?: string
  readonly longitudTexto?: string
  readonly montanteId?: string
  // Nombre humano del Montante, presente SÓLO en el primer segmento
  // (orden 0) de la cadena -- evita repetir "Montante AF 1" en cada tramo
  // (VIS-TOPO-01 B13).
  readonly montanteEtiqueta?: string
}

export type GrupoVisual = {
  readonly id: string
  readonly tipo: 'uf' | 'nivel'
  readonly label: string
  readonly parentId?: string
  readonly nodosIds: readonly string[]
}

export type GrafoVisual = {
  readonly nodos: readonly NodoVisual[]
  readonly aristas: readonly AristaVisual[]
  readonly grupos: readonly GrupoVisual[]
}

// Duplicado intencional de la etiqueta homónima en montantesDelProyecto.ts
// (mismo criterio que ese archivo: consumidor pequeño y puntual, no una
// fuente compartida todavía).
const ETIQUETA_TIPO_DE_LOCAL: Readonly<Record<Local['tipo'], string>> = {
  bano: 'Baño',
  toilette: 'Toilette',
  cocina: 'Cocina',
  lavadero: 'Lavadero',
  cochera: 'Cochera',
  jardin: 'Jardín',
  otros: 'Otros',
}

function claveLocal(unidadFuncionalId: string, localId: string): string {
  return JSON.stringify([unidadFuncionalId, localId])
}

function formatearLongitudVisual(longitud_m: number): string {
  return `${longitud_m.toLocaleString('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m`
}

// Etiqueta del origen AF: deriva del esquema de abastecimiento vigente de
// Módulo 4 (VIS-TOPO-00 §5) -- nunca inventa un tanque/bomba que M4 no
// declaró. Sin `configuracionAbastecimiento`, M4 todavía no se inició: se
// usa una etiqueta genérica, no un default silencioso.
function etiquetaOrigenAF(proyecto: Proyecto): string {
  const esquema = proyecto.configuracionAbastecimiento?.esquema
  if (esquema === undefined) {
    return 'Alimentación'
  }
  return resolverOrigenHidraulicoEfectivo(esquema) === 'tanqueElevado' ? 'Tanque elevado' : 'Red directa'
}

type UbicacionDeLocal = { readonly uf: UnidadFuncional; readonly nivel: Nivel; readonly local: Local }

function indexarUbicacionDeLocales(proyecto: Proyecto): ReadonlyMap<string, UbicacionDeLocal> {
  const indice = new Map<string, UbicacionDeLocal>()
  for (const uf of proyecto.unidadesFuncionales) {
    for (const nivel of uf.niveles) {
      for (const local of nivel.locales) {
        indice.set(claveLocal(uf.id, local.id), { uf, nivel, local })
      }
    }
  }
  return indice
}

function etiquetaDeLocal(uf: UnidadFuncional, local: Local): string {
  const ordinal = derivarOrdinalesDeLocal(uf.niveles.flatMap((nivel) => nivel.locales)).get(local.id)
  return `${ETIQUETA_TIPO_DE_LOCAL[local.tipo]}${ordinal === undefined ? '' : ` ${ordinal}`}`
}

function sublabelDeLocal(proyecto: Proyecto, uf: UnidadFuncional, nivel: Nivel): string {
  const nombreUf = nombreDeUnidadFuncional(proyecto, uf.id)
  return uf.niveles.length > 1 ? `${nombreUf} · ${nivel.nombre}` : nombreUf
}

// Mutable en construcción; el resultado público (GrafoVisual) es
// enteramente readonly.
type NodoVisualEnConstruccion = {
  id: string
  tipo: TipoNodoVisual
  dominioId?: string
  label: string
  sublabel?: string
  red?: RedVisual
  grupoUfId?: string
  grupoNivelId?: string
  noDetallado?: boolean
  cantidadSalidas?: number
}

export function resolverGrafoVisual(proyecto: Proyecto): GrafoVisual {
  const redHidraulica = proyecto.redHidraulica
  if (redHidraulica === undefined || (redHidraulica.nodos.length === 0 && redHidraulica.tramos.length === 0)) {
    return { nodos: [], aristas: [], grupos: [] }
  }

  const { nodos: nodosReales, tramos } = redHidraulica
  const indice = crearIndiceTopologico(redHidraulica)

  // Entrantes por nodo -- el índice topológico compartido (PERF-SCALE-01D)
  // sólo expone salientes; se completa acá en O(tramos), una única pasada.
  const entrantesPorNodo = new Map<string, Tramo[]>()
  for (const tramo of tramos) {
    const lista = entrantesPorNodo.get(tramo.nodoDestinoId)
    if (lista === undefined) {
      entrantesPorNodo.set(tramo.nodoDestinoId, [tramo])
    } else {
      lista.push(tramo)
    }
  }

  const ubicacionPorLocal = indexarUbicacionDeLocales(proyecto)

  const nodosVisuales = new Map<string, NodoVisualEnConstruccion>()
  const gruposEnConstruccion = new Map<string, { id: string; tipo: 'uf' | 'nivel'; label: string; parentId?: string; nodosIds: string[] }>()

  function idDeGrupoUf(uf: UnidadFuncional): string {
    return `uf:${uf.id}`
  }
  function idDeGrupoNivel(nivel: Nivel): string {
    return `nivel:${nivel.id}`
  }

  function nodoVisualDeLocal(unidadFuncionalId: string, localId: string): NodoVisualEnConstruccion {
    const id = `local:${unidadFuncionalId}:${localId}`
    const existente = nodosVisuales.get(id)
    if (existente !== undefined) {
      return existente
    }
    const ubicacion = ubicacionPorLocal.get(claveLocal(unidadFuncionalId, localId))
    const nodoVisual: NodoVisualEnConstruccion =
      ubicacion === undefined
        ? { id, tipo: 'local', label: 'Local (no encontrado)' }
        : {
            id,
            tipo: 'local',
            label: etiquetaDeLocal(ubicacion.uf, ubicacion.local),
            sublabel: sublabelDeLocal(proyecto, ubicacion.uf, ubicacion.nivel),
            grupoUfId: idDeGrupoUf(ubicacion.uf),
            ...(ubicacion.uf.niveles.length > 1 ? { grupoNivelId: idDeGrupoNivel(ubicacion.nivel) } : {}),
          }
    nodosVisuales.set(id, nodoVisual)

    if (ubicacion !== undefined) {
      const grupoUfId = idDeGrupoUf(ubicacion.uf)
      const grupoUf = gruposEnConstruccion.get(grupoUfId)
      if (grupoUf === undefined) {
        gruposEnConstruccion.set(grupoUfId, {
          id: grupoUfId,
          tipo: 'uf',
          label: nombreDeUnidadFuncional(proyecto, ubicacion.uf.id),
          nodosIds: [id],
        })
      } else if (!grupoUf.nodosIds.includes(id)) {
        grupoUf.nodosIds.push(id)
      }
      if (ubicacion.uf.niveles.length > 1) {
        const grupoNivelId = idDeGrupoNivel(ubicacion.nivel)
        const grupoNivel = gruposEnConstruccion.get(grupoNivelId)
        if (grupoNivel === undefined) {
          gruposEnConstruccion.set(grupoNivelId, {
            id: grupoNivelId,
            tipo: 'nivel',
            label: ubicacion.nivel.nombre,
            parentId: grupoUfId,
            nodosIds: [id],
          })
        } else if (!grupoNivel.nodosIds.includes(id)) {
          grupoNivel.nodosIds.push(id)
        }
      }
    }
    return nodoVisual
  }

  // Resuelve el id visual de destino/origen de una punta de Tramo: un Nodo
  // con referencia a artefacto se agrega SIEMPRE en su Local (VIS-TOPO-00
  // §8: Local = destino agregado V1); cualquier otro Nodo real conserva su
  // propio id de dominio -- identidad de domino reutilizada (B7).
  function idVisualDeNodo(nodoId: string): string | undefined {
    const nodo = indice.nodosPorId.get(nodoId)
    if (nodo === undefined) {
      return undefined
    }
    if (nodo.referencia?.tipo === 'artefacto') {
      const { unidadFuncionalId, localId } = nodo.referencia
      nodoVisualDeLocal(unidadFuncionalId, localId)
      return `local:${unidadFuncionalId}:${localId}`
    }
    asegurarNodoTopologico(nodo)
    return nodo.id
  }

  function asegurarNodoTopologico(nodo: Nodo): void {
    if (nodosVisuales.has(nodo.id)) {
      return
    }
    const entrantes = entrantesPorNodo.get(nodo.id) ?? []
    const salientes = indice.tramosSalientesPorNodo.get(nodo.id) ?? []

    if (nodo.referencia?.tipo === 'produccionACS') {
      nodosVisuales.set(nodo.id, { id: nodo.id, tipo: 'origen', dominioId: nodo.id, red: 'AC', label: 'Producción ACS' })
      return
    }
    if (entrantes.length === 0) {
      if (salientes.length === 0) {
        // Nodo topológico aislado (sin ninguna arista): no aporta nada
        // representable -- se omite, nunca se dibuja un punto sin sentido.
        return
      }
      const red = salientes[0]!.red
      nodosVisuales.set(nodo.id, {
        id: nodo.id,
        tipo: 'origen',
        dominioId: nodo.id,
        red,
        label: red === 'AF' ? etiquetaOrigenAF(proyecto) : 'Origen AC',
      })
      return
    }
    if (entrantes.length === 1 && salientes.length === 1) {
      nodosVisuales.set(nodo.id, { id: nodo.id, tipo: 'intermedio', dominioId: nodo.id, label: '' })
      return
    }
    if (salientes.length >= 2) {
      const noDetallado = salientes.length > 2
      nodosVisuales.set(nodo.id, {
        id: nodo.id,
        tipo: 'derivacion',
        dominioId: nodo.id,
        label: noDetallado ? 'Distribución no detallada' : '',
        ...(noDetallado ? { noDetallado: true, cantidadSalidas: salientes.length } : {}),
      })
      return
    }
    // Nodo topológico sin salientes y sin referencia (punta muerta
    // anómala, imposible tras validarRedHidraulica en un proyecto válido):
    // no crashea (VIS-TOPO-00 B32), se representa como un intermedio sin
    // etiqueta.
    nodosVisuales.set(nodo.id, { id: nodo.id, tipo: 'intermedio', dominioId: nodo.id, label: '' })
  }

  // Etiqueta de Montante: se resuelve UNA vez por montanteId presente
  // (no por cada Tramo), reutilizando proyectarMontante -- ya calcula la
  // cadena ordenada origen->punta (VIS-TOPO-00 §6/§13).
  const primerSegmentoPorMontanteId = new Map<string, string>()
  const montanteIdsPresentes = new Set(
    tramos.map((tramo) => tramo.montanteId).filter((id): id is string => id !== undefined),
  )
  for (const montanteId of montanteIdsPresentes) {
    const proyeccion = proyectarMontante(proyecto, montanteId)
    const primerSegmento = proyeccion?.segmentos[0]
    if (primerSegmento !== undefined) {
      primerSegmentoPorMontanteId.set(montanteId, primerSegmento.tramoId)
    }
  }

  const aristas: AristaVisual[] = []
  for (const tramo of tramos) {
    const origenId = idVisualDeNodo(tramo.nodoOrigenId)
    const destinoId = idVisualDeNodo(tramo.nodoDestinoId)
    // Referencia rota (nodoOrigenId/nodoDestinoId sin Nodo real): estado
    // imposible tras validarRedHidraulica, pero esta capa no debe crashear
    // sobre datos inconsistentes (VIS-TOPO-00 B32) -- se omite la arista.
    if (origenId === undefined || destinoId === undefined || origenId === destinoId) {
      continue
    }
    aristas.push({
      id: tramo.id,
      dominioTramoId: tramo.id,
      origenId,
      destinoId,
      red: tramo.red,
      ...(tramo.dnComercialAdoptado !== undefined ? { dnTexto: `DN ${tramo.dnComercialAdoptado}` } : {}),
      ...(tramo.longitud_m !== undefined ? { longitudTexto: formatearLongitudVisual(tramo.longitud_m) } : {}),
      ...(tramo.montanteId !== undefined ? { montanteId: tramo.montanteId } : {}),
      ...(tramo.montanteId !== undefined && primerSegmentoPorMontanteId.get(tramo.montanteId) === tramo.id
        ? { montanteEtiqueta: nombreDeMontante(proyecto, tramo.montanteId) }
        : {}),
    })
  }

  // Nodos topológicos sin ninguna arista que los toque (declarados en
  // `redHidraulica.nodos` pero huérfanos) no se procesaron arriba porque
  // sólo se visitan a través de un Tramo: se recorren una vez más, sin
  // costo relevante, para no perder ningún Nodo real declarado con
  // conectividad -- ya cubierto por asegurarNodoTopologico siendo
  // idempotente vía el Map.
  for (const nodo of nodosReales) {
    if (nodo.referencia?.tipo === 'artefacto') {
      continue
    }
    asegurarNodoTopologico(nodo)
  }

  return {
    nodos: [...nodosVisuales.values()],
    aristas,
    grupos: [...gruposEnConstruccion.values()],
  }
}
