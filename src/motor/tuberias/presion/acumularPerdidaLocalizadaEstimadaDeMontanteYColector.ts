// HYD-EST-NETWORK-01: incidencia hidráulica (ΣK/hf) de los accesorios
// físicos estimados de Montante y Colector principal (`resolverAccesoriosFisicosEstimadosDeRed.ts`)
// sobre UN camino real (`CaminoHaciaOrigen`). Cierra la brecha documentada
// en HYD-ACQUA-K-CATALOG-01 ("Tee/Sobrepaso estimados de Montante y
// Colector principal: el catálogo está listo... si se extiende en el
// futuro, debe reusar esta misma entrada") -- hasta este incremento, esos
// accesorios sólo existían para el listado de materiales (compra), nunca
// aportaban a la pérdida localizada estimada de ningún terminal.
//
// Sólo tiene efecto bajo el sistema Acqua System (mismo gate que Sobrepaso/
// Reducción estimados, HYD-OVERPASS-01/HYD-ACQUA-K-CATALOG-01): es el único
// catálogo con coeficientes propios para estas piezas -- Tabla N°7 no
// publica un Ks diferenciado para "tee estimada" fuera del contexto ya
// cerrado de HYD-EST de Local (que sigue usando su propio valor histórico,
// sin cambios).
//
// Pertenencia por camino: cada `AccesorioFisicoEstimado` vive en un Tramo o
// un Nodo real -- pertenece a ESTE camino si y sólo si ese Tramo/Nodo
// aparece en `camino.tramos`/`camino.nodos` (CaminoHaciaOrigen ya
// garantiza, por construcción, que un camino sólo contiene la ascendencia
// única hacia la raíz -- CRIT-A27). Un accesorio de una derivación de
// Montante situada POR ENCIMA de un Local nunca aparece en el camino de ese
// Local (su nodo no está en `camino.nodos`); un accesorio compartido aguas
// arriba (llave general, Colector) aparece en TODOS los caminos que lo
// atraviesan.
//
// Velocidad de referencia (brief §"Caminos", test #34/#35): un accesorio
// "en línea" (tipo `tramo`) usa la velocidad REAL de ESE Tramo -- misma
// convención que el resto del dominio (Ks·V²/2g evaluado en el propio
// tramo del accesorio). Un accesorio de NODO (tee) usa la velocidad del
// Tramo que continúa el camino DESDE ese nodo (el siguiente tramo del
// mismo camino, aguas abajo, hacia el terminal) -- es la velocidad del
// flujo que efectivamente atraviesa la derivación en la dirección de ESTE
// camino específico; si el nodo fuera el propio terminal (no debería
// ocurrir para una tee real, que siempre tiene al menos una salida), no
// hay tramo siguiente y el accesorio no aporta (defensivo, no debería
// alcanzarse en la práctica).
import type { Proyecto } from '../../../modelo/proyecto'
import type { ArtefactoNormativo } from '../../../normativa/eras-2023/catalogo-artefactos'
import type { SistemaDeTuberiaCatalogado } from '../sistemaDeTuberia'
import type { ContextoDeCalculoM2 } from '../contextoDeCalculoM2'
import type { CaminoHaciaOrigen } from '../topologia/obtenerCaminoHaciaOrigen'
import type { AccesorioFisicoEstimado, IdAccesorioFisicoEstimado } from '../topologia/resolverAccesoriosFisicosEstimadosDeRed'
import { resolverDiametroComercialDeTramo } from '../resolverDiametroComercialDeTramo'
import { resolverKsDeAccesorioDeTramo, SISTEMA_DE_TUBERIA_ACQUA_SYSTEM_ID } from '../perdidaCarga/resolverKsDeAccesorioDeTramo'
import { resolverKsDeReduccion } from '../perdidaCarga/resolverKsDeReduccion'
import { resolverKsEstimadoTee } from './resolverPerdidaLocalizadaEstimadaDeLocal'
import { calcularPerdidaCargaLocalizada } from '../perdidaCarga/calcularPerdidaCargaLocalizada'
import type { IdAccesorioDeTramo } from '../../../modelo/redHidraulica'

// Mapeo a Tabla N°7/Acqua System (`resolverKsDeAccesorioDeTramo`) para los
// tipos "en línea"; las tees (nodo) resuelven aparte con
// `resolverKsEstimadoTee` (no son `IdAccesorioDeTramo`, CRIT-A28: las tees
// viven en `Nodo.tee`, nunca en `Tramo.accesorios`).
const MAPEO_A_ID_ACCESORIO_DE_TRAMO: Partial<Record<IdAccesorioFisicoEstimado, IdAccesorioDeTramo>> = {
  llaveDePaso: 'llaveDePaso',
  codoRecorrido: 'codo90',
  codoUltimoLocal: 'codo90',
  codoUltimaSalida: 'codo90',
  unionRecta: 'uniones',
}
const TIPOS_TEE: ReadonlySet<IdAccesorioFisicoEstimado> = new Set(['teeDerivacion', 'teeAcs', 'teeRuptor'])

export type DetalleAccesorioFisicoEnCamino = {
  readonly idFisico: string
  readonly tipo: IdAccesorioFisicoEstimado
  readonly ks: number
  readonly velocidad_mps: number
  readonly hf_m: number
}

export type MotivoTramoSinPerdidaLocalizadaEstimadaDeRed = 'sinDemanda' | 'sinCandidatoAdmisible'

export type ResultadoPerdidaLocalizadaEstimadaDeMontanteYColector =
  | {
      readonly tipo: 'acumulada'
      readonly hf_m: number
      readonly detalle: readonly DetalleAccesorioFisicoEnCamino[]
    }
  | {
      readonly tipo: 'incompleta'
      readonly tramosNoResueltos: readonly {
        readonly tramoId: string
        readonly motivo: MotivoTramoSinPerdidaLocalizadaEstimadaDeRed
      }[]
    }

export function acumularPerdidaLocalizadaEstimadaDeMontanteYColector(
  proyecto: Proyecto,
  camino: CaminoHaciaOrigen,
  accesoriosFisicos: readonly AccesorioFisicoEstimado[],
  catalogoArtefactos: readonly ArtefactoNormativo[],
  catalogoSistemasDeTuberia: readonly SistemaDeTuberiaCatalogado[],
  contexto?: ContextoDeCalculoM2,
): ResultadoPerdidaLocalizadaEstimadaDeMontanteYColector {
  const sistemaDeTuberiaId = proyecto.configuracionHidraulica.sistemaDeTuberiaId
  if (sistemaDeTuberiaId !== SISTEMA_DE_TUBERIA_ACQUA_SYSTEM_ID) {
    // Sin catálogo propio para ningún otro sistema -- ver comentario de
    // archivo. Nunca se inventa un Ks.
    return { tipo: 'acumulada', hf_m: 0, detalle: [] }
  }
  if (accesoriosFisicos.length === 0 || camino.tramos.length === 0) {
    return { tipo: 'acumulada', hf_m: 0, detalle: [] }
  }

  const tramosDelCamino = new Set(camino.tramos.map((t) => t.id))
  const nodosDelCamino = new Set(camino.nodos.map((n) => n.id))
  const indicePorNodoId = new Map(camino.nodos.map((n, i) => [n.id, i]))
  const tramosPorId = new Map((proyecto.redHidraulica?.tramos ?? []).map((t) => [t.id, t]))

  // Nodos que YA tienen una Tee de derivación (nodo-based, afecta a
  // cualquier camino que atraviese el nodo -- ver más abajo). Cuando la
  // "última salida" (codo, tipo tramo) arranca justo desde ESE MISMO nodo
  // -- un fan-out simultáneo de varias salidas desde un único punto, no una
  // cadena secuencial -- el nodo físico sólo tiene UNA pieza real instalada
  // (nunca se suman Tee y codo por la MISMA derivación, brief "nunca se
  // asignan ambas"); sin este chequeo, el camino de esa última salida vería
  // DOS piezas (la Tee, porque su camino atraviesa el nodo igual que
  // cualquier otro; y su propio codo) mientras las demás salidas del mismo
  // nodo sólo ven la Tee -- una asimetría espuria entre salidas físicamente
  // equivalentes (detectado por verificacionLongitudVerticalPorNivel.test.ts,
  // T12/T33: dos UF simétricas colgadas del mismo nodo no deberían diferir
  // hidráulicamente más que por geometría/fricción).
  const nodosConTeeDeDerivacion = new Set(
    accesoriosFisicos.filter((a) => a.tipo === 'teeDerivacion' && a.ubicacion.tipo === 'nodo').map((a) => (a.ubicacion as { nodoId: string }).nodoId),
  )

  const tramosNoResueltos: { tramoId: string; motivo: MotivoTramoSinPerdidaLocalizadaEstimadaDeRed }[] = []
  const detalle: DetalleAccesorioFisicoEnCamino[] = []
  let hf_m = 0

  for (const accesorio of accesoriosFisicos) {
    let tramoIdParaVelocidad: string | undefined
    if (accesorio.ubicacion.tipo === 'tramo') {
      if (!tramosDelCamino.has(accesorio.ubicacion.tramoId)) {
        continue
      }
      if (
        (accesorio.tipo === 'codoUltimaSalida' || accesorio.tipo === 'codoUltimoLocal') &&
        nodosConTeeDeDerivacion.has(tramosPorId.get(accesorio.ubicacion.tramoId)?.nodoOrigenId ?? '')
      ) {
        continue
      }
      tramoIdParaVelocidad = accesorio.ubicacion.tramoId
    } else {
      if (!nodosDelCamino.has(accesorio.ubicacion.nodoId)) {
        continue
      }
      const indiceNodo = indicePorNodoId.get(accesorio.ubicacion.nodoId)!
      // Tramo que continúa ESTE camino desde el nodo (aguas abajo, hacia
      // el terminal) -- ver comentario de archivo. Si el nodo fuera el
      // último del camino (el terminal) no hay tramo siguiente: defensivo,
      // no debería ocurrir para una tee real (siempre tiene salida).
      const tramoSiguiente = camino.tramos[indiceNodo]
      if (tramoSiguiente === undefined) {
        continue
      }
      tramoIdParaVelocidad = tramoSiguiente.id
    }

    const resultadoComercial = resolverDiametroComercialDeTramo(
      proyecto,
      tramoIdParaVelocidad,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      contexto,
    )
    if (resultadoComercial.tipo === 'sinDemanda' || resultadoComercial.tipo === 'sinCandidatoAdmisible') {
      tramosNoResueltos.push({ tramoId: tramoIdParaVelocidad, motivo: resultadoComercial.tipo })
      continue
    }
    const velocidad_mps = resultadoComercial.velocidadReal_mps

    const ks =
      accesorio.tipo === 'reduccion'
        ? // Reducción: Ks por CONTEXTO topológico (salto de DN real),
          // nunca por identidad fija -- mismo resolutor central que ya usa
          // Detallado y la reducción estimada de Local (CRIT-A30). Un
          // salto 'noClasificable' (DN no perteneciente a la serie o no
          // resoluble) nunca se alcanza en la práctica acá -- la fuente
          // física (`resolverAccesoriosFisicosEstimadosDeRed.ts`) ya
          // filtró por clasificación al detectar la pieza -- pero se
          // trata igual como "sin Ks" (0), nunca un valor inventado.
          (() => {
            const resultado = resolverKsDeReduccion(sistemaDeTuberiaId, accesorio.dnComercial, accesorio.dnAguasArriba)
            return resultado.resultado === 'calculado' ? resultado.ks : 0
          })()
        : TIPOS_TEE.has(accesorio.tipo)
          ? resolverKsEstimadoTee(sistemaDeTuberiaId)
          : MAPEO_A_ID_ACCESORIO_DE_TRAMO[accesorio.tipo] !== undefined
            ? resolverKsDeAccesorioDeTramo(MAPEO_A_ID_ACCESORIO_DE_TRAMO[accesorio.tipo]!, sistemaDeTuberiaId).ks
            : // `unionTanque`: sin coeficiente propio ni equivalencia documentada
              // (HYD-ACQUA-K-CATALOG-01, "unión doble con unión normal: ninguna
              // de estas piezas está modelada... no hay nada que reasignar") --
              // 0 explícito, nunca inventado. Queda como limitación conocida.
              0
    if (ks <= 0) {
      // Sin Ks (unionTanque, ver arriba): pieza registrada en materiales
      // pero sin incidencia hidráulica -- nunca se llama a
      // calcularPerdidaCargaLocalizada con Ks<=0 (precondición del helper).
      detalle.push({ idFisico: accesorio.idFisico, tipo: accesorio.tipo, ks: 0, velocidad_mps, hf_m: 0 })
      continue
    }

    const hfAccesorio_m = calcularPerdidaCargaLocalizada(ks, velocidad_mps)
    hf_m += hfAccesorio_m
    detalle.push({ idFisico: accesorio.idFisico, tipo: accesorio.tipo, ks, velocidad_mps, hf_m: hfAccesorio_m })
  }

  if (tramosNoResueltos.length > 0) {
    return { tipo: 'incompleta', tramosNoResueltos }
  }
  return { tipo: 'acumulada', hf_m, detalle }
}
