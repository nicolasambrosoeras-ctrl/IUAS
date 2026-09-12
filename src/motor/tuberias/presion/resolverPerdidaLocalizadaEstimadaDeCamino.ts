// HYD-EST-01. Datos derivados, locales a una resolución. No lee accesorios
// detallados ni infiere orientación/reducciones. K tee conservador D-δ.40;
// V del saliente recorrido según CRIT-A31. La singularidad final ahora es
// una por terminal (decisión explícita HYD-EST, sustituye esa parte D-δ.45).
import type { Proyecto } from '../../../modelo/proyecto'
import type { ArtefactoNormativo } from '../../../normativa/eras-2023/catalogo-artefactos'
import { obtenerKsDeAccesorio } from '../../../normativa/eras-2023/tabla-07-perdidas-localizadas'
import type { SistemaDeTuberiaCatalogado } from '../sistemaDeTuberia'
import { crearContextoDeCalculoM2, obtenerIndiceTopologicoDeContexto, obtenerTramosEntrantesIndexados, type ContextoDeCalculoM2 } from '../contextoDeCalculoM2'
import { obtenerCaminoHaciaOrigen, type CaminoHaciaOrigen } from '../topologia/obtenerCaminoHaciaOrigen'
import { obtenerTramosRepresentativosDeLocalesDeContexto } from '../topologia/identificarTramoRepresentativoDeLocal'
import { resolverDiametroComercialDeTramo } from '../resolverDiametroComercialDeTramo'
import { calcularPerdidaCargaLocalizada } from '../perdidaCarga/calcularPerdidaCargaLocalizada'

export const KS_ESTIMADO_TEE = obtenerKsDeAccesorio('teeEntradaCentralSalidasLaterales')
export const KS_ESTIMADO_SINGULARIDAD_TERMINAL = obtenerKsDeAccesorio('codo90')
export const KS_ESTIMADO_LLAVE_DE_PASO = obtenerKsDeAccesorio('llaveDePaso')

export type MotivoTramoSinPerdidaLocalizadaEstimada =
  | 'sinDemanda' | 'sinCandidatoAdmisible' | 'derivacionMultipleNoModelada'
  | 'entradaLocalNoIdentificable' | 'caminoNoResoluble'

export type SingularidadEstimada = {
  readonly tipo: 'tee' | 'terminal' | 'llaveDePaso'
  readonly nodoId: string
  readonly tramoId: string
  readonly ks: number
  readonly velocidad_mps: number
  readonly hf_m: number
}

export type ResultadoPerdidaLocalizadaEstimadaDeCamino =
  | { readonly tipo: 'estimada'; readonly hf_m: number; readonly porSingularidad: readonly SingularidadEstimada[] }
  | { readonly tipo: 'incompleta'; readonly tramosNoResueltos: readonly { readonly tramoId: string; readonly motivo: MotivoTramoSinPerdidaLocalizadaEstimada }[] }

type GrupoLocal = { terminales: string[]; entradaId: string | undefined; red: string }
export type IndiceEstimacionLocalizada = {
  readonly grupos: Map<string, GrupoLocal>
  readonly grupoPorTerminal: Map<string, string>
  readonly caminos: Map<string, ReturnType<typeof obtenerCaminoHaciaOrigen>>
}

export function claveLocalYRed(unidadFuncionalId: string, localId: string, red: string): string {
  return JSON.stringify([unidadFuncionalId, localId, red])
}

// Una construcción O(nodos + tramos + suma de profundidades). Se comparten
// caminos e índices, también al resumir varios terminales en la UI. Un tramo
// común de entrada debe alimentar TODOS y SOLAMENTE los terminales del
// Local/Red: no se duplica una llave entre entradas independientes.
export function obtenerIndiceEstimacionLocalizada(proyecto: Proyecto, contexto: ContextoDeCalculoM2): IndiceEstimacionLocalizada {
  if (contexto.estimacionLocalizada !== undefined) return contexto.estimacionLocalizada
  const red = proyecto.redHidraulica
  if (red === undefined) throw new Error('La estimación localizada requiere redHidraulica')
  const entrantes = obtenerTramosEntrantesIndexados(contexto, red.tramos)
  const grupos = new Map<string, GrupoLocal>()
  const grupoPorTerminal = new Map<string, string>()
  const caminos: IndiceEstimacionLocalizada['caminos'] = new Map()
  const alcance = new Map<string, { grupo: string; cantidad: number; mixto: boolean }>()
  const gruposNoResolubles = new Set<string>()
  for (const nodo of red.nodos) {
    const ref = nodo.referencia
    if (ref?.tipo !== 'artefacto') continue
    const alimentadores = entrantes.get(nodo.id) ?? []
    for (const redTerminal of new Set(alimentadores.map(t => t.red))) {
      const clave = claveLocalYRed(ref.unidadFuncionalId, ref.localId, redTerminal)
      let grupo = grupos.get(clave)
      if (grupo === undefined) {
        grupo = { terminales: [], entradaId: undefined, red: redTerminal }
        grupos.set(clave, grupo)
      }
      grupo.terminales.push(nodo.id)
      grupoPorTerminal.set(nodo.id, clave)
      const camino = obtenerCaminoHaciaOrigen(red, nodo.id, contexto)
      caminos.set(nodo.id, camino)
      if (camino.tipo !== 'camino') {
        gruposNoResolubles.add(clave)
        continue
      }
      for (const tramo of camino.tramos) {
        const previo = alcance.get(tramo.id)
        if (previo === undefined) alcance.set(tramo.id, { grupo: clave, cantidad: 1, mixto: false })
        else {
          previo.cantidad++
          previo.mixto ||= previo.grupo !== clave
        }
      }
    }
  }
  const representativos = obtenerTramosRepresentativosDeLocalesDeContexto(contexto, proyecto)
  for (const [clave, grupo] of grupos) {
    if (gruposNoResolubles.has(clave)) continue
    const camino = caminos.get(grupo.terminales[0]!)
    if (camino?.tipo !== 'camino') continue
    const comunes = camino.tramos.filter(tramo => {
      const a = alcance.get(tramo.id)
      return tramo.red === grupo.red && a !== undefined && !a.mixto && a.grupo === clave && a.cantidad === grupo.terminales.length
    })
    // Misma frontera Local/Distribución general que usa M2 para la fila
    // editable. No se desplaza la llave a la distribución general sólo
    // porque el proyecto tenga un único Local. En una red mínima cuyo
    // único tramo común ES la entrada desde la raíz, ese tramo es único.
    const entradasLocales = comunes.filter(t => representativos.has(t.id))
    grupo.entradaId = entradasLocales.length === 1 ? entradasLocales[0]!.id
      : comunes.length === 1 ? comunes[0]!.id : undefined
  }
  contexto.estimacionLocalizada = { grupos, grupoPorTerminal, caminos }
  return contexto.estimacionLocalizada
}

export function resolverPerdidaLocalizadaEstimadaDeCamino(
  proyecto: Proyecto,
  camino: CaminoHaciaOrigen,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  catalogoSistemasDeTuberia: readonly SistemaDeTuberiaCatalogado[],
  contexto: ContextoDeCalculoM2 = crearContextoDeCalculoM2(),
): ResultadoPerdidaLocalizadaEstimadaDeCamino {
  const red = proyecto.redHidraulica
  if (red === undefined) throw new Error('La estimación localizada requiere redHidraulica')
  const ultimo = camino.tramos.at(-1)
  if (ultimo === undefined) return { tipo: 'estimada', hf_m: 0, porSingularidad: [] }
  const indice = obtenerIndiceTopologicoDeContexto(contexto, red)
  const entrantes = obtenerTramosEntrantesIndexados(contexto, red.tramos)
  const estimacion = obtenerIndiceEstimacionLocalizada(proyecto, contexto)
  const clave = estimacion.grupoPorTerminal.get(camino.terminalId)
  const entradaId = clave === undefined ? undefined : estimacion.grupos.get(clave)?.entradaId
  const porSingularidad: SingularidadEstimada[] = []
  const tramosNoResueltos: { tramoId: string; motivo: MotivoTramoSinPerdidaLocalizadaEstimada }[] = []
  // Se diagnostica el fan-out antes que otras ausencias: nunca se asigna
  // a un 1→N la suma de n−1 tees ni un respaldo agregado.
  for (const tramo of camino.tramos) {
    if ((entrantes.get(tramo.nodoOrigenId)?.length ?? 0) === 1 &&
        (indice.tramosSalientesPorNodo.get(tramo.nodoOrigenId)?.length ?? 0) > 2) {
      tramosNoResueltos.push({ tramoId: tramo.id, motivo: 'derivacionMultipleNoModelada' })
    }
  }
  if (tramosNoResueltos.length > 0) return { tipo: 'incompleta', tramosNoResueltos }
  if (entradaId === undefined) {
    return { tipo: 'incompleta', tramosNoResueltos: [{ tramoId: ultimo.id, motivo: 'entradaLocalNoIdentificable' }] }
  }
  for (const tramo of camino.tramos) {
    const componentes: { tipo: SingularidadEstimada['tipo']; ks: number; nodoId: string }[] = []
    if (tramo.id === entradaId) componentes.push({ tipo: 'llaveDePaso', ks: KS_ESTIMADO_LLAVE_DE_PASO, nodoId: tramo.nodoOrigenId })
    if ((entrantes.get(tramo.nodoOrigenId)?.length ?? 0) === 1 &&
        indice.tramosSalientesPorNodo.get(tramo.nodoOrigenId)?.length === 2) {
      componentes.push({ tipo: 'tee', ks: KS_ESTIMADO_TEE, nodoId: tramo.nodoOrigenId })
    }
    if (tramo.id === ultimo.id) componentes.push({ tipo: 'terminal', ks: KS_ESTIMADO_SINGULARIDAD_TERMINAL, nodoId: camino.terminalId })
    if (componentes.length === 0) continue
    const comercial = resolverDiametroComercialDeTramo(proyecto, tramo.id, catalogoArtefactos, catalogoSistemasDeTuberia, contexto)
    if (comercial.tipo !== 'conCandidato') {
      tramosNoResueltos.push({ tramoId: tramo.id, motivo: comercial.tipo })
      continue
    }
    for (const componente of componentes) {
      porSingularidad.push({ ...componente, tramoId: tramo.id, velocidad_mps: comercial.velocidadReal_mps,
        hf_m: calcularPerdidaCargaLocalizada(componente.ks, comercial.velocidadReal_mps) })
    }
  }
  return tramosNoResueltos.length > 0 ? { tipo: 'incompleta', tramosNoResueltos } :
    { tipo: 'estimada', hf_m: porSingularidad.reduce((suma, s) => suma + s.hf_m, 0), porSingularidad }
}
