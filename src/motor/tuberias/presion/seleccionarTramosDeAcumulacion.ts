// Selección, dentro de un camino ya resuelto (raíz -> terminal), de qué
// Tramos participan de la acumulación de pérdida de carga según
// GranularidadHidraulica (D-δ.44, corrección de granularidad de D-δ.43).
// No decide NADA hidráulico -- solo particiona camino.tramos en dos
// grupos para que acumularPerdidaDistribuidaDeCamino/
// acumularPerdidaLocalizadaDeCamino decidan qué hacer con cada uno. La
// regla hf=Σ J·L no cambia: lo que cambia es el conjunto de Tramos que la
// componen.
import type { Proyecto } from '../../../modelo/proyecto'
import type { Tramo } from '../../../modelo/redHidraulica'
import type { CaminoHaciaOrigen } from '../topologia/obtenerCaminoHaciaOrigen'
import {
  identificarTramosRepresentativosDeLocales,
  obtenerTramosRepresentativosDeLocalesDeContexto,
} from '../topologia/identificarTramoRepresentativoDeLocal'
import type { ContextoDeCalculoM2 } from '../contextoDeCalculoM2'

export type SeleccionDeTramosDeAcumulacion = {
  // Tramos que siempre exigen su propia longitud_m/accesorios: en
  // 'profesional', TODO camino.tramos (comportamiento ya existente, sin
  // cambios); en 'simplificada', desde la raíz hasta el Tramo
  // representativo del (Local, Red) del terminal consultado, inclusive
  // (Distribución General + el único Tramo "Local+red" del usuario).
  readonly tramosRelevables: readonly Tramo[]
  // Tramos "ramal" aguas abajo del representativo -- vacío en
  // 'profesional'. En 'simplificada' NO requieren longitud/accesorios
  // propios (contribuyen 0 a hfDistribuida por definición del modelo),
  // pero SIGUEN existiendo para conectividad, AF/AC, tee y presión: quien
  // consuma este resultado para pérdida LOCALIZADA todavía necesita
  // evaluar el Ks de tee de cada uno (CRIT-A31 no depende de la
  // granularidad), solo se exime su propio Tramo.accesorios.
  readonly tramosRamal: readonly Tramo[]
}

export function seleccionarTramosDeAcumulacion(
  proyecto: Proyecto,
  camino: CaminoHaciaOrigen,
  // PERF-SCALE-01D: contexto de cálculo local a la resolución -- memoiza
  // `identificarTramosRepresentativosDeLocales` UNA vez por resolución en
  // vez de una vez POR TERMINAL (se llama desde acumularPerdidaDistribuidaDeCamino
  // Y acumularPerdidaLocalizadaDeCamino). Ausente ⇒ comportamiento previo
  // byte a byte.
  contexto?: ContextoDeCalculoM2,
): SeleccionDeTramosDeAcumulacion {
  if (proyecto.configuracionHidraulica.granularidadHidraulica === 'profesional') {
    return { tramosRelevables: camino.tramos, tramosRamal: [] }
  }

  const representativos =
    contexto === undefined
      ? identificarTramosRepresentativosDeLocales(proyecto)
      : obtenerTramosRepresentativosDeLocalesDeContexto(contexto, proyecto)
  const indice = camino.tramos.findIndex((tramo) => representativos.has(tramo.id))

  if (indice === -1) {
    // Defensivo: ningún Tramo del camino es representativo de un
    // (Local, Red) -- topología degenerada (p.ej. terminal colgado
    // directo de Distribución General, sin ningún Tramo "puro" de su
    // propio Local en el camino). No hay ningún punto de corte legítimo
    // que inventar: se preserva el comportamiento pleno ('profesional')
    // en vez de adivinar uno.
    return { tramosRelevables: camino.tramos, tramosRamal: [] }
  }

  return {
    tramosRelevables: camino.tramos.slice(0, indice + 1),
    tramosRamal: camino.tramos.slice(indice + 1),
  }
}
