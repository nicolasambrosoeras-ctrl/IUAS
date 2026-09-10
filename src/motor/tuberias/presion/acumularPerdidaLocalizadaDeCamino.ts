// Pérdida de carga localizada acumulada a lo largo de un camino hidráulico
// resuelto (raíz -> terminal), paralela a acumularPerdidaDistribuidaDeCamino
// pero para el subconjunto inequívoco de Tabla N°7 declarable sobre
// Tramo.accesorios (D-δ.33/M2-C slice A) MÁS la contribución de tees
// declaradas sobre el Nodo del que sale cada Tramo (CRIT-A31).
//
// Reutiliza resolverDiametroComercialDeTramo (capa comercial, NO
// resolverPerdidaDistribuidaDeTramo) para obtener velocidadReal_mps de
// cada Tramo del camino: la pérdida localizada solo necesita velocidad,
// no coeficiente de fricción ni catálogo de materiales -- pedir
// catalogoMateriales acá sería exigir un dato que esta composición no
// usa. No recalcula Qc, diámetro ni velocidad.
//
// Tee (CRIT-A31): por cada Tramo del camino, se consulta
// resolverClasificacionDeTee sobre su nodoOrigenId. Si ese Nodo es una
// bifurcación de tee (1 entrante + 2 salientes) SIN configurar todavía,
// el Tramo queda no resuelto (mismo tratamiento que accesorios sin
// relevar). Si está clasificada, se suma Js_tee = Ks(clasificación)·V²/2g
// -- reutilizando la MISMA velocidadReal_mps ya resuelta de este Tramo,
// nunca una "velocidad de tee" separada -- al hf_m propio de sus
// accesorios en línea (ambos usan la misma V a igual Tramo, así que la
// suma es la composición lineal correcta de CRIT-A26).
//
// Fan-out 1→N (N≥3, derivacionMultipleNoModelada, M2-TOPO-E §8): el nodo
// bifurca en más de 2 salientes -- topología válida para Qc (M2-TOPO-A)
// pero fuera del alcance de ConfiguracionDeTee. El modelo actual NO tiene
// los datos para representar esa singularidad (orden físico de las ramas,
// cuál es recta, piezas reales, longitudes intermedias) y NO se inventan
// (no se asigna Ks, no se calcula pérdida, no se fabrica geometría). El
// Tramo que sale de ese nodo queda NO RESUELTO por motivo
// `derivacionMultipleNoModelada`: la pérdida localizada del camino se
// devuelve 'incompleta', nunca un 0 silencioso que aparente relevamiento
// completo. Sólo cuando el Nodo genuinamente no bifurca (1→1, raíz,
// noEsBifurcacionDeTee) no hay contribución de tee y la ausencia es 0
// real, no incompletitud.
//
// Respeta los estados incompletos de la capa comercial (sinDemanda,
// sinCandidatoAdmisible -- ningún Tramo en esos estados tiene
// velocidadReal_mps) y las dos barreras de completitud propias de
// pérdida localizada (accesorios sin relevar, tee sin configurar): si
// algún Tramo del camino no llega a tener su pérdida localizada
// calculada, la acumulación NO devuelve una suma parcial -- devuelve
// 'incompleta' listando todos los tramos no resueltos con su motivo.
//
// GranularidadHidraulica (D-δ.44): en 'profesional', comportamiento
// original sin cambios -- cada Tramo del camino exige su propia
// resolución comercial + clasificación de tee + accesorios relevados.
// En 'simplificada', seleccionarTramosDeAcumulacion separa los Tramos
// "ramal" (aguas abajo del representativo del Local+red): la tee (CRIT-
// A31) sigue evaluándose sobre ellos (sigue siendo una singularidad
// nodal real, independiente de la granularidad), pero sus accesorios en
// línea NUNCA se exigen ni se suman -- contribuyen 0 a esa parte de
// hfLocalizada por definición del modelo simplificado. Si el Nodo de
// origen de un ramal genuinamente no bifurca (noEsBifurcacionDeTee), el
// ramal entero contribuye 0 sin necesitar siquiera resolver su diámetro
// comercial (nada que computar sobre él); si en cambio es un fan-out 1→N
// (derivacionMultipleNoModelada), el ramal queda no resuelto por ese
// motivo, igual que en 'profesional'.
import type { Proyecto } from '../../../modelo/proyecto'
import type { ArtefactoNormativo } from '../../../normativa/eras-2023/catalogo-artefactos'
import { obtenerKsDeAccesorio } from '../../../normativa/eras-2023/tabla-07-perdidas-localizadas'
import type { SistemaDeTuberiaCatalogado } from '../sistemaDeTuberia'
import type { Tramo } from '../../../modelo/redHidraulica'
import type { CaminoHaciaOrigen } from '../topologia/obtenerCaminoHaciaOrigen'
import { resolverClasificacionDeTee } from '../topologia/resolverClasificacionDeTee'
import { resolverDiametroComercialDeTramo } from '../resolverDiametroComercialDeTramo'
import { resolverPerdidaLocalizadaDeTramo } from '../perdidaCarga/resolverPerdidaLocalizadaDeTramo'
import { calcularPerdidaCargaLocalizada } from '../perdidaCarga/calcularPerdidaCargaLocalizada'
import { seleccionarTramosDeAcumulacion } from './seleccionarTramosDeAcumulacion'

export type MotivoTramoSinPerdidaLocalizada =
  | 'sinDemanda'
  | 'sinCandidatoAdmisible'
  | 'sinRelevar'
  | 'teeSinConfigurar'
  // Fan-out 1→N (N≥3) en el camino: su pérdida localizada no se modela con
  // los datos actuales (M2-TOPO-E §8). Distinto de 'teeSinConfigurar' (una
  // tee 1→2 real que sólo falta relevar): acá no hay nada que el
  // proyectista pueda declarar todavía -- es una limitación del modelo.
  | 'derivacionMultipleNoModelada'

export type ResultadoPerdidaLocalizadaDeCamino =
  | {
      readonly tipo: 'acumulada'
      // Suma de los hf_m de todos los Tramos del camino. Para el caso
      // "raíz inmediata" (camino.tramos === []) es 0: un terminal que ES
      // la raíz no tiene ningún Tramo con accesorios aguas arriba, la
      // pérdida localizada es genuinamente 0 -- no un término obligatorio
      // ausente.
      readonly hf_m: number
      readonly porTramo: readonly { readonly tramoId: string; readonly hf_m: number }[]
    }
  | {
      readonly tipo: 'incompleta'
      readonly tramosNoResueltos: readonly {
        readonly tramoId: string
        readonly motivo: MotivoTramoSinPerdidaLocalizada
      }[]
    }

export function acumularPerdidaLocalizadaDeCamino(
  proyecto: Proyecto,
  camino: CaminoHaciaOrigen,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  catalogoSistemasDeTuberia: readonly SistemaDeTuberiaCatalogado[],
): ResultadoPerdidaLocalizadaDeCamino {
  const redHidraulicaOpcional = proyecto.redHidraulica
  if (redHidraulicaOpcional === undefined) {
    // Precondición imposible: un camino real (CaminoHaciaOrigen) solo se
    // obtiene de una RedHidraulica ya existente -- mismo criterio que
    // resolverPresionResidualDeCamino.
    throw new Error('acumularPerdidaLocalizadaDeCamino requiere un proyecto con redHidraulica definida')
  }
  // Reasignado a un const nuevo para que las funciones anidadas de más
  // abajo (resolverTeeYVelocidad) conserven el angostamiento: TypeScript
  // no propaga la narrowing de una desestructuración directa hacia el
  // interior de un closure.
  const redHidraulica = redHidraulicaOpcional

  const porTramo: { tramoId: string; hf_m: number }[] = []
  const tramosNoResueltos: { tramoId: string; motivo: MotivoTramoSinPerdidaLocalizada }[] = []

  function resolverTeeYVelocidad(
    tramo: Tramo,
  ): { tipo: 'noResuelto' } | { tipo: 'resuelto'; hfTee_m: number; velocidadReal_mps: number } {
    const resultadoComercial = resolverDiametroComercialDeTramo(
      proyecto,
      tramo.id,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
    )

    if (resultadoComercial.tipo === 'sinDemanda') {
      tramosNoResueltos.push({ tramoId: tramo.id, motivo: 'sinDemanda' })
      return { tipo: 'noResuelto' }
    }
    if (resultadoComercial.tipo === 'sinCandidatoAdmisible') {
      tramosNoResueltos.push({ tramoId: tramo.id, motivo: 'sinCandidatoAdmisible' })
      return { tipo: 'noResuelto' }
    }
    const { velocidadReal_mps } = resultadoComercial

    const clasificacionTee = resolverClasificacionDeTee(redHidraulica, tramo.nodoOrigenId, tramo.id)
    if (clasificacionTee.tipo === 'sinConfigurar') {
      tramosNoResueltos.push({ tramoId: tramo.id, motivo: 'teeSinConfigurar' })
      return { tipo: 'noResuelto' }
    }
    if (clasificacionTee.tipo === 'derivacionMultipleNoModelada') {
      // 1→N (N≥3): no se modela su pérdida localizada -- el camino queda
      // incompleto, nunca un 0 silencioso (M2-TOPO-E §8).
      tramosNoResueltos.push({ tramoId: tramo.id, motivo: 'derivacionMultipleNoModelada' })
      return { tipo: 'noResuelto' }
    }
    const hfTee_m =
      clasificacionTee.tipo === 'clasificado'
        ? calcularPerdidaCargaLocalizada(obtenerKsDeAccesorio(clasificacionTee.idAccesorioTabla07), velocidadReal_mps)
        : 0

    return { tipo: 'resuelto', hfTee_m, velocidadReal_mps }
  }

  const { tramosRelevables, tramosRamal } = seleccionarTramosDeAcumulacion(proyecto, camino)

  for (const tramo of tramosRelevables) {
    // Tee (CRIT-A31): se evalúa antes que los accesorios propios del
    // Tramo -- ambas barreras son independientes, pero un Tramo que sale
    // de una bifurcación de tee sin configurar se reporta por ese motivo
    // específico, sin necesidad de evaluar además sus accesorios en
    // línea (que igual podrían estar sin relevar).
    const resolucion = resolverTeeYVelocidad(tramo)
    if (resolucion.tipo !== 'resuelto') {
      continue
    }
    const { hfTee_m, velocidadReal_mps } = resolucion

    const resultadoLocalizada = resolverPerdidaLocalizadaDeTramo(tramo.accesorios, velocidadReal_mps)

    if (resultadoLocalizada.tipo === 'sinRelevar') {
      tramosNoResueltos.push({ tramoId: tramo.id, motivo: 'sinRelevar' })
      continue
    }

    porTramo.push({ tramoId: tramo.id, hf_m: resultadoLocalizada.hf_m + hfTee_m })
  }

  // Ramales (granularidadHidraulica 'simplificada'): la tee sigue siendo
  // una singularidad nodal real (CRIT-A31 no depende de la granularidad),
  // pero sus accesorios en línea propios NUNCA se exigen -- se ignoran
  // por completo (nunca se llama a resolverPerdidaLocalizadaDeTramo).
  // Si el Nodo de origen no es una bifurcación de tee, el ramal entero
  // contribuye 0 sin necesidad de resolver siquiera su diámetro
  // comercial: no hay nada que computar sobre él bajo este modelo.
  for (const tramo of tramosRamal) {
    const clasificacionTee = resolverClasificacionDeTee(redHidraulica, tramo.nodoOrigenId, tramo.id)
    if (clasificacionTee.tipo === 'noEsBifurcacionDeTee') {
      continue
    }
    if (clasificacionTee.tipo === 'derivacionMultipleNoModelada') {
      // 1→N también bloquea la completitud del ramal en 'simplificada'
      // (M2-TOPO-E §8): la singularidad es nodal, independiente de la
      // granularidad -- igual que la tee sin configurar.
      tramosNoResueltos.push({ tramoId: tramo.id, motivo: 'derivacionMultipleNoModelada' })
      continue
    }

    const resolucion = resolverTeeYVelocidad(tramo)
    if (resolucion.tipo !== 'resuelto') {
      continue
    }
    porTramo.push({ tramoId: tramo.id, hf_m: resolucion.hfTee_m })
  }

  if (tramosNoResueltos.length > 0) {
    return { tipo: 'incompleta', tramosNoResueltos }
  }

  const hf_m = porTramo.reduce((suma, entrada) => suma + entrada.hf_m, 0)
  return { tipo: 'acumulada', hf_m, porTramo }
}
