// Orquestador minimo del balance de presion de M2-B sobre un camino
// hidraulico real: compone, sin recalcular nada, las piezas ya cerradas
//
//   obtenerCaminoHaciaOrigen  (camino raiz -> terminal, CRIT-A27)
//   resolverDesnivelDeCamino  (Δz de extremos)
//   acumularPerdidaDistribuidaDeCamino  (Σ hf distribuida, N3)
//   acumularPerdidaLocalizadaDeCamino  (Σ hf localizada, subconjunto CRIT-A26/D-delta.33)
//   resolverPresionMinimaDeArtefacto  (Pmin del terminal, SS2.9.1.4)
//   resolverBalanceDePresion  (Pdisponible - Δz - Σperdidas vs Pmin)
//
// Pdisponible llega como parametro explicito: este orquestador NO decide
// de donde sale (tanque elevado / red / bombeo siguen sin modelar,
// D-delta.36). No conoce UI.
//
// hfMedidor (CRIT-A25) llega tambien como parametro explicito
// (hfMedidor_mca), exactamente con el mismo estatus que Pdisponible:
// una condicion de borde que el llamador provee, no un valor que este
// orquestador derive de la topologia. Sigue sin resolverse DONDE vive
// el medidor en RedHidraulica -- medidor general vs. individual, su
// posicion respecto del origen y del almacenamiento, que Qc le
// corresponde y el catalogo comercial (Tabla N°6) siguen abiertos
// (D-delta.35) y son responsabilidad de M3, no de este motor. Lo que
// SI se cierra aca es el contrato minimo M2<->M3: el motor de M2 esta
// hidraulicamente completo si recibe hfMedidor_mca; que M3 (o, hasta
// que exista, un llamador/test) sepa calcularlo es un problema
// distinto y diferido. Si el llamador no puede proveerlo todavia, pasa
// undefined -- resolverBalanceDePresion sigue devolviendo 'incompleto'
// tal como antes, nunca fabrica un 0.
//
// hfLocalizada (D-delta.33/D-delta.40): dos metodologias ALTERNATIVAS,
// nunca aditivas, elegidas via proyecto.configuracionHidraulica.metodoPerdidaLocalizada.
//
// 'detallado': desde CRIT-A31 (tees), el subconjunto representable sobre
// RedHidraulica cubre TODA Tabla N°7 -- curvas, codos, llave de paso,
// valvula esclusa, uniones, tubo saliente, reducciones (CRIT-A28/A30) y
// las 3 variantes de tee (CRIT-A31); griferia queda deliberadamente
// excluida del balance de la red (CRIT-A29, no es un vacio de
// cobertura). Por eso, cuando acumularPerdidaLocalizadaDeCamino devuelve
// 'acumulada' para ESTE camino especifico, su cobertura de Tabla N°7 ya
// es genuinamente completa (todo tramo tuvo accesorios relevados Y toda
// bifurcacion de tee en el camino quedo configurada -- si algo faltaba,
// acumularPerdidaLocalizadaDeCamino ya cortó antes con
// 'perdidaLocalizadaIncompleta', mas arriba en esta misma funcion): se
// envuelve como CoberturaDePerdidaLocalizada 'completa', no 'parcial'.
//
// 'estimado' (HYD-EST-01): suma exclusivamente las singularidades del
// camino con sus velocidades propias. Tee real 1→2: K=3 y V saliente;
// llave local: K=9,18 y V de entrada; final: K=1,35 y V del alimentador
// de ESTE terminal. El 1→N no modelado o una velocidad/entrada irresoluble
// dejan incompleta la pérdida y el balance. Nunca hay fallback agregado.
//
// 'balanceCompleto' es alcanzable en la practica cuando, ademas de
// hfLocalizada (cualquiera de las dos metodologias), el llamador provee
// hfMedidor_mca (ver comentario sobre D-delta.35 mas arriba).
//
// Cobertura fisica global del Proyecto (S1/auditarCoberturaFisica) sigue
// siendo responsabilidad de la barrera de presentacion (S2), no de este
// orquestador por terminal.
//
// Cota hidraulica efectiva del terminal (GEOM-UX-01, D-delta.86): se
// DERIVA de la jerarquia de cotas heredadas -- cota de piso efectiva del
// Local (override Local.cotaPiso_m, o UF.cotaHidraulicaReferencia_m
// heredada) + altura hidraulica efectiva del artefacto
// (Artefacto.alturaHidraulicaSobrePiso_m, o Tabla IUAS del tipo). Vale
// para AMBAS granularidades: GEOM-UX-01 sustituyo la hipotesis geometrica
// uniforme de 1,00 m del modo rapido por esta derivacion (ver
// resolverCotaHidraulicaDeArtefacto.ts). Se ignora el Nodo.cota_m propio
// del terminal. Unica excepcion: el terminal degenerado que ademas es la
// raiz del camino (sin ningun tramo entrante) conserva su propia cota_m
// -- funciona como punto de alimentacion. Si la UF/Local no tienen cota
// de piso resoluble se corta con 'unidadFuncionalSinCotaDeReferencia' --
// distinto de 'desnivelIncompleto' (que reporta la cota de la RAIZ/
// alimentacion faltante) para que resolverEstadoModulo2 deduplique por UF.
import type { Proyecto } from '../../../modelo/proyecto'
import type { ArtefactoNormativo } from '../../../normativa/eras-2023/catalogo-artefactos'
import type { SistemaDeTuberiaCatalogado } from '../sistemaDeTuberia'
import type { MaterialTuberia } from '../materialTuberia'
import {
  obtenerCaminoHaciaOrigen,
  type CaminoHaciaOrigenNoResoluble,
} from '../topologia/obtenerCaminoHaciaOrigen'
import { resolverDesnivelDeCamino } from '../geometria/resolverDesnivelDeCamino'
import {
  resolverCotaHidraulicaEfectivaDeArtefacto,
  resolverNivelDeLocal,
} from '../geometria/resolverCotaHidraulicaDeArtefacto'
import {
  acumularPerdidaDistribuidaDeCamino,
  type MotivoTramoSinPerdida,
  type PerdidaDistribuidaPorTramo,
} from './acumularPerdidaDistribuidaDeCamino'
import {
  resolverIncrementoVerticalPorNivel,
  type IncrementoVerticalPorNivel,
} from './resolverIncrementoVerticalPorNivel'
import {
  acumularPerdidaLocalizadaDeCamino,
  type MotivoTramoSinPerdidaLocalizada,
} from './acumularPerdidaLocalizadaDeCamino'
import {
  resolverPerdidaLocalizadaEstimadaDeCamino,
  obtenerIndiceEstimacionLocalizada,
  type SingularidadEstimada,
  type MotivoTramoSinPerdidaLocalizadaEstimada,
} from './resolverPerdidaLocalizadaEstimadaDeCamino'
import { resolverBalanceDePresion } from './resolverBalanceDePresion'
import { crearContextoDeCalculoM2, type ContextoDeCalculoM2 } from '../contextoDeCalculoM2'
import {
  acumularTiempoMsPorEtapa,
  instrumentacionTopologicaActiva,
} from '../topologia/instrumentacionTopologica'

// Union discriminada por metodologia (D-delta.40) -- nunca un booleano
// "esEstimado": cada variante trae exactamente los datos auditables que
// esa metodologia produce (porTramo solo tiene sentido en detallado;
// nTerminalesLocal/nTeesEstimadas/porSingularidad solo en
// estimado). hf_mca es el nombre comun a ambas para que el resto de la
// funcion (balance, traza) no necesite un `if` extra para extraer el
// numero.
export type TrazaHfLocalizada =
  | {
      readonly metodologia: 'detallado'
      readonly hf_mca: number
      readonly porTramo: readonly { readonly tramoId: string; readonly hf_m: number }[]
    }
  | {
      readonly metodologia: 'estimado'
      readonly hf_mca: number
      readonly nTerminalesLocal: number
      readonly nTeesEstimadas: number
      readonly porSingularidad: readonly SingularidadEstimada[]
    }

type TrazaDeCamino = {
  readonly raizId: string
  readonly terminalId: string
  readonly desnivel_m: number
  readonly hfDistribuida_mca: number
  readonly hfDistribuidaPorTramo: readonly PerdidaDistribuidaPorTramo[]
  readonly hfLocalizada: TrazaHfLocalizada
  // D-δ.50: longitud vertical tipica automatica por nivel de UF aplicada a
  // los Tramos de Distribucion general de este camino (exclusiva de
  // granularidad 'simplificada'). aplica=false / deltaLVertical_m=0 en
  // 'profesional' y para PB. Insumo directo de "Ver calculo del critico".
  readonly incrementoVerticalPorNivel: IncrementoVerticalPorNivel
}

export type ResultadoPresionResidualDeCamino =
  | {
      readonly tipo: 'topologiaNoResoluble'
      readonly detalle: CaminoHaciaOrigenNoResoluble
    }
  | {
      // El nodo consultado no referencia ningun Artefacto: no hay Pmin
      // normativa que verificar. No es un error de uso (la red es
      // estructuralmente valida) -- es un terminal que este balance no
      // puede cerrar.
      readonly tipo: 'terminalSinArtefacto'
      readonly nodoId: string
    }
  | {
      // El Artefacto terminal no tiene presionMinima_kgcm2 publicada por
      // ERAS (p. ej. maquinaLavavajillas, piletaDeCocinaIndustrial). No
      // se inventa 0 (subdimensionaria la verificacion) -- se declara el
      // terminal no verificable por presion minima.
      readonly tipo: 'terminalSinPresionMinima'
      readonly nodoId: string
      readonly artefactoIdCatalogo: string
    }
  | {
      readonly tipo: 'desnivelIncompleto'
      readonly nodosSinCota: readonly string[]
    }
  | {
      // Analogo a 'desnivelIncompleto' pero especifico de granularidad
      // 'simplificada' (D-delta.46): la UF del terminal no tiene
      // cotaHidraulicaReferencia_m cargada. Se distingue de
      // 'desnivelIncompleto' (que sigue existiendo para la cota de la
      // RAIZ/alimentacion, no afectada por esta granularidad) para que
      // resolverEstadoModulo2 pueda deduplicar por UF en vez de reportar
      // un motivo por cada terminal de esa UF -- ver comentario de
      // archivo de resolverCotaTerminalEfectiva.
      readonly tipo: 'unidadFuncionalSinCotaDeReferencia'
      readonly unidadFuncionalId: string
    }
  | {
      readonly tipo: 'perdidaDistribuidaIncompleta'
      readonly tramosNoResueltos: readonly {
        readonly tramoId: string
        readonly motivo: MotivoTramoSinPerdida
      }[]
    }
  | {
      readonly tipo: 'perdidaLocalizadaIncompleta'
      readonly tramosNoResueltos: readonly {
        readonly tramoId: string
        readonly motivo: MotivoTramoSinPerdidaLocalizada
      }[]
    }
  | {
      // Analogo a 'perdidaLocalizadaIncompleta' pero para metodoPerdidaLocalizada='estimado'
      // HYD-EST: topología, entrada local o velocidad irresoluble.
      readonly tipo: 'perdidaLocalizadaEstimadaIncompleta'
      readonly tramosNoResueltos: readonly {
        readonly tramoId: string
        readonly motivo: MotivoTramoSinPerdidaLocalizadaEstimada
      }[]
    }
  | ({
      readonly tipo: 'balanceIncompleto'
      readonly terminosFaltantes: readonly ('hfLocalizada' | 'hfMedidor')[]
    } & TrazaDeCamino)
  | ({
      readonly tipo: 'balanceCompleto'
      readonly presionResidual_mca: number
      readonly presionMinimaRequerida_mca: number
      readonly cumpleMinimo: boolean
    } & TrazaDeCamino)

export function resolverPresionResidualDeCamino(
  proyecto: Proyecto,
  nodoTerminalId: string,
  presionDisponible_mca: number,
  // undefined = el llamador todavia no puede proveer hfMedidor (D-delta.35
  // sin resolver); nunca se interpreta como 0. Ver comentario de archivo.
  hfMedidor_mca: number | undefined,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  catalogoSistemasDeTuberia: readonly SistemaDeTuberiaCatalogado[],
  catalogoMateriales: readonly MaterialTuberia[],
  // PERF-SCALE-01B: contexto de cálculo local a la resolución de M2.
  // resolverEstadoModulo2 crea UNO y lo pasa a este orquestador por cada
  // terminal -- así los Tramos troncales compartidos entre caminos, y los
  // Tramos pedidos por varias etapas del mismo camino (distribuida,
  // localizada), resuelven su hidráulica/diámetro UNA sola vez por
  // resolución. Ausente ⇒ comportamiento previo byte a byte (cada llamada
  // recalcula): es lo que hacen los call sites puntuales de la UI.
  contexto?: ContextoDeCalculoM2,
): ResultadoPresionResidualDeCamino {
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    // Precondicion imposible tras validacion: mismo criterio que el resto
    // del motor de tuberias (obtenerArtefactosAguasAbajo, etc.).
    throw new Error('resolverPresionResidualDeCamino requiere un proyecto con redHidraulica definida')
  }

  const medicionCaminoActiva = instrumentacionTopologicaActiva()
  const t0Camino = medicionCaminoActiva ? performance.now() : 0
  const camino = obtenerCaminoHaciaOrigen(redHidraulica, nodoTerminalId, contexto)
  if (medicionCaminoActiva) {
    acumularTiempoMsPorEtapa('camino', performance.now() - t0Camino)
  }
  if (camino.tipo !== 'camino') {
    return { tipo: 'topologiaNoResoluble', detalle: camino }
  }

  // Pmin del terminal. El nodo consultado (ultimo del camino) debe
  // referenciar un Artefacto.
  const nodoTerminal = camino.nodos[camino.nodos.length - 1]!
  const referencia = nodoTerminal.referencia
  if (referencia === undefined || referencia.tipo !== 'artefacto') {
    return { tipo: 'terminalSinArtefacto', nodoId: nodoTerminal.id }
  }

  // PERF-SCALE-01D: instrumentación de profiling por etapa (diagnóstico,
  // gate a costo cero en producción vía instrumentacionTopologicaActiva()).
  const medicionActiva = instrumentacionTopologicaActiva()
  const t0ReferenciasYCota = medicionActiva ? performance.now() : 0

  const unidadFuncional = proyecto.unidadesFuncionales.find((uf) => uf.id === referencia.unidadFuncionalId)
  const nivel = unidadFuncional === undefined ? undefined : resolverNivelDeLocal(unidadFuncional, referencia.localId)
  const local = nivel?.locales.find((l) => l.id === referencia.localId)
  const artefactoInstancia = local?.artefactos.find((a) => a.id === referencia.artefactoId)
  if (artefactoInstancia === undefined) {
    // Referencia que no resuelve: precondicion imposible tras
    // validarRedHidraulica (redHidraulicaReferenciaArtefactoInvalida) --
    // mismo criterio que resolverArtefactosReferenciados.
    throw new Error(
      `resolverPresionResidualDeCamino: la referencia del nodo "${nodoTerminal.id}" no resuelve a ningun ` +
        `Artefacto (uf="${referencia.unidadFuncionalId}", local="${referencia.localId}", artefacto="${referencia.artefactoId}")`,
    )
  }
  if (unidadFuncional === undefined || nivel === undefined || local === undefined) {
    // Inalcanzable: artefactoInstancia solo resuelve si local existe, que
    // a su vez solo existe si nivel/unidadFuncional existen (ver la
    // cadena de `?.` de arriba) -- chequeo explicito unicamente para el
    // angostamiento de tipos de TypeScript (GEOM-UX-01,
    // resolverCotaHidraulicaEfectivaDeArtefacto necesita Nivel y Local ya
    // angostados mas abajo).
    throw new Error('resolverPresionResidualDeCamino: inconsistencia interna (unidadFuncional/nivel/local indefinidos)')
  }

  const artefactoIdCatalogo = artefactoInstancia.artefactoId
  const artefactoNormativo = catalogoArtefactos.find((candidato) => candidato.id === artefactoIdCatalogo)
  if (artefactoNormativo === undefined) {
    throw new Error(
      `resolverPresionResidualDeCamino: no existe ningun ArtefactoNormativo con id "${artefactoIdCatalogo}" en el catalogo recibido`,
    )
  }

  if (artefactoNormativo.presionMinima_kgcm2 === null) {
    return { tipo: 'terminalSinPresionMinima', nodoId: nodoTerminal.id, artefactoIdCatalogo }
  }
  const presionMinima_kgcm2 = artefactoNormativo.presionMinima_kgcm2

  // Cota hidraulica efectiva del terminal (GEOM-UX-01): se DERIVA de la
  // jerarquia de cotas heredadas -- cota de piso efectiva del Local
  // (override del Local, o cota de la UF heredada) + altura hidraulica
  // efectiva del artefacto (override de instancia, o Tabla IUAS del tipo).
  // Vale para AMBAS granularidades: GEOM-UX-01 sustituyo la hipotesis
  // geometrica uniforme del modo rapido por esta derivacion. Se ignora
  // por completo el Nodo.cota_m propio del terminal (si lo tuviera de un
  // relevamiento anterior -- nunca se lee ni se borra).
  //
  // EXCEPCION: cuando el terminal ES la raiz del camino (nodo sin ningun
  // tramo entrante que ademas referencia un Artefacto, caso degenerado ya
  // cubierto por tests): funciona como punto de alimentacion, no como
  // "conexion de Artefacto dentro de una UF", asi que conserva su propia
  // cota_m -- sustituirla colapsaria Δz a 0 y descartaria el dato de
  // alimentacion ya cargado.
  let caminoParaDesnivel = camino
  if (camino.raizId !== camino.terminalId) {
    const cotaEfectiva_m = resolverCotaHidraulicaEfectivaDeArtefacto(nivel, local, artefactoInstancia)
    if (cotaEfectiva_m === undefined) {
      // La UF (o el Local) de este terminal no tiene cota de piso
      // resoluble. Se deduplica por UF en resolverEstadoModulo2 -- ver
      // comentario del tipo alla.
      return { tipo: 'unidadFuncionalSinCotaDeReferencia', unidadFuncionalId: unidadFuncional.id }
    }
    caminoParaDesnivel = {
      ...camino,
      nodos: camino.nodos.map((nodo, indice) =>
        indice === camino.nodos.length - 1 ? { ...nodo, cota_m: cotaEfectiva_m } : nodo,
      ),
    }
  }

  if (medicionActiva) {
    acumularTiempoMsPorEtapa('referenciasYCota', performance.now() - t0ReferenciasYCota)
  }
  const t0DesnivelEIncremento = medicionActiva ? performance.now() : 0

  const desnivel = resolverDesnivelDeCamino(caminoParaDesnivel)
  if (desnivel.tipo === 'incompleto') {
    return { tipo: 'desnivelIncompleto', nodosSinCota: desnivel.nodosSinCota }
  }

  // D-δ.50: longitud vertical tipica por nivel de UF -- exclusiva de
  // granularidad 'simplificada' (resolverIncrementoVerticalPorNivel
  // devuelve incremento 0 en 'profesional'). Se compone aditivamente
  // sobre hfDistribuida sin recalcular Qc/DN/V/friccion (hf lineal en L).
  // Ortogonal al efecto geometrico: la cota terminal ya trae 1+3·nivel
  // (D-δ.46) y Δz lo capturo mas arriba; esto es SOLO el caño vertical.
  const incrementoVerticalPorNivel = resolverIncrementoVerticalPorNivel(proyecto, camino, nivel)

  if (medicionActiva) {
    acumularTiempoMsPorEtapa('desnivelEIncremento', performance.now() - t0DesnivelEIncremento)
  }
  const t0PerdidaDistribuida = medicionActiva ? performance.now() : 0

  const perdidaDistribuida = acumularPerdidaDistribuidaDeCamino(
    proyecto,
    camino,
    catalogoArtefactos,
    catalogoSistemasDeTuberia,
    catalogoMateriales,
    incrementoVerticalPorNivel.incrementoPorTramoId,
    contexto,
  )
  if (medicionActiva) {
    acumularTiempoMsPorEtapa('perdidaDistribuida', performance.now() - t0PerdidaDistribuida)
  }
  if (perdidaDistribuida.tipo === 'incompleta') {
    return { tipo: 'perdidaDistribuidaIncompleta', tramosNoResueltos: perdidaDistribuida.tramosNoResueltos }
  }

  const t0PerdidaLocalizada = medicionActiva ? performance.now() : 0

  let hfLocalizada: TrazaHfLocalizada
  let coberturaHfLocalizada: { readonly tipo: 'completa' | 'estimada'; readonly hf_mca: number }

  if (proyecto.configuracionHidraulica.metodoPerdidaLocalizada === 'detallado') {
    const perdidaLocalizada = acumularPerdidaLocalizadaDeCamino(
      proyecto,
      camino,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      contexto,
    )
    if (perdidaLocalizada.tipo === 'incompleta') {
      return { tipo: 'perdidaLocalizadaIncompleta', tramosNoResueltos: perdidaLocalizada.tramosNoResueltos }
    }

    // 'completa': si llegamos hasta acá, acumularPerdidaLocalizadaDeCamino
    // ya devolvió 'acumulada' (el branch 'incompleta' cortó antes) --
    // desde CRIT-A31 eso significa que TODO el subconjunto representable
    // de Tabla N°7 para este camino específico está resuelto (accesorios
    // + tees). Ver comentario de archivo.
    hfLocalizada = { metodologia: 'detallado', hf_mca: perdidaLocalizada.hf_m, porTramo: perdidaLocalizada.porTramo }
    coberturaHfLocalizada = { tipo: 'completa', hf_mca: perdidaLocalizada.hf_m }
  } else {
    // Terminal IS raiz (camino.tramos===[]): no hay ningun tramo que
    // alimente al terminal, ninguna magnitud de este metodo aplica --
    // mismo cero real que el modo detallado ya devuelve para este mismo
    // caso (ver acumularPerdidaLocalizadaDeCamino), sin necesitar
    // resolver a que red (AF/AC) pertenece este terminal.
    if (camino.tramos.length === 0) {
      hfLocalizada = { metodologia: 'estimado', hf_mca: 0, nTerminalesLocal: 0, nTeesEstimadas: 0, porSingularidad: [] }
      coberturaHfLocalizada = { tipo: 'estimada', hf_mca: 0 }
    } else {
      // La red (AF/AC) de ESTE terminal es la del ultimo tramo del
      // camino -- el que efectivamente lo alimenta (por construccion de
      // obtenerCaminoHaciaOrigen, su nodoDestinoId es el terminal).
      const contextoEstimado = contexto ?? crearContextoDeCalculoM2()
      const perdidaEstimada = resolverPerdidaLocalizadaEstimadaDeCamino(
        proyecto,
        camino,
        catalogoArtefactos,
        catalogoSistemasDeTuberia,
        contextoEstimado,
      )
      if (perdidaEstimada.tipo === 'incompleta') {
        if (medicionActiva) {
          acumularTiempoMsPorEtapa('perdidaLocalizada', performance.now() - t0PerdidaLocalizada)
        }
        return { tipo: 'perdidaLocalizadaEstimadaIncompleta', tramosNoResueltos: perdidaEstimada.tramosNoResueltos }
      }

      const indiceEstimado = obtenerIndiceEstimacionLocalizada(proyecto, contextoEstimado)
      const grupo = indiceEstimado.grupoPorTerminal.get(camino.terminalId)
      hfLocalizada = {
        metodologia: 'estimado',
        hf_mca: perdidaEstimada.hf_m,
        nTerminalesLocal: grupo === undefined ? 0 : indiceEstimado.grupos.get(grupo)!.terminales.length,
        nTeesEstimadas: perdidaEstimada.porSingularidad.filter(s => s.tipo === 'tee').length,
        porSingularidad: perdidaEstimada.porSingularidad,
      }
      coberturaHfLocalizada = { tipo: 'estimada', hf_mca: perdidaEstimada.hf_m }
    }
  }

  if (medicionActiva) {
    acumularTiempoMsPorEtapa('perdidaLocalizada', performance.now() - t0PerdidaLocalizada)
  }

  const traza: TrazaDeCamino = {
    raizId: camino.raizId,
    terminalId: camino.terminalId,
    desnivel_m: desnivel.desnivel_m,
    hfDistribuida_mca: perdidaDistribuida.hf_m,
    hfDistribuidaPorTramo: perdidaDistribuida.porTramo,
    hfLocalizada,
    incrementoVerticalPorNivel,
  }

  const balance = resolverBalanceDePresion(
    presionDisponible_mca,
    desnivel.desnivel_m,
    {
      hfDistribuida_mca: perdidaDistribuida.hf_m,
      hfLocalizada: coberturaHfLocalizada,
      hfMedidor_mca,
    },
    presionMinima_kgcm2,
  )

  if (balance.tipo === 'incompleto') {
    return { tipo: 'balanceIncompleto', terminosFaltantes: balance.terminosFaltantes, ...traza }
  }

  return {
    tipo: 'balanceCompleto',
    presionResidual_mca: balance.presionResidual_mca,
    presionMinimaRequerida_mca: balance.presionMinimaRequerida_mca,
    cumpleMinimo: balance.cumpleMinimo,
    ...traza,
  }
}
