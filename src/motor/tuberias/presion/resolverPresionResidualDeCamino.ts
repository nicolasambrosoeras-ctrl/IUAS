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
// 'estimado' (D-delta.40): el usuario no releva singularidades fisicas;
// resolverPerdidaLocalizadaEstimadaDeLocal estima unicamente las tees
// del Local+red del terminal (n-1, Ks=3,00 conservador, V_ref=maxima
// velocidad entre los tramos que alimentan directamente cada terminal
// de ese Local+red). Se envuelve como 'estimada' -- NUNCA 'completa' (es
// una metodologia distinta, no una version del detallado) ni 'parcial'
// (un calculo estimado completo dentro de su propio metodo no es una
// version inferior de la escala del detallado). Si algun tramo terminal
// no tiene velocidad comercial resoluble, se corta con
// 'perdidaLocalizadaEstimadaIncompleta', mismo criterio de "nunca una
// suma parcial silenciosa" que el resto del motor.
//
// 'balanceCompleto' es alcanzable en la practica cuando, ademas de
// hfLocalizada (cualquiera de las dos metodologias), el llamador provee
// hfMedidor_mca (ver comentario sobre D-delta.35 mas arriba).
//
// Cobertura fisica global del Proyecto (S1/auditarCoberturaFisica) sigue
// siendo responsabilidad de la barrera de presentacion (S2), no de este
// orquestador por terminal.
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
  acumularPerdidaDistribuidaDeCamino,
  type MotivoTramoSinPerdida,
} from './acumularPerdidaDistribuidaDeCamino'
import {
  acumularPerdidaLocalizadaDeCamino,
  type MotivoTramoSinPerdidaLocalizada,
} from './acumularPerdidaLocalizadaDeCamino'
import {
  resolverPerdidaLocalizadaEstimadaDeLocal,
  type MotivoTramoSinPerdidaLocalizadaEstimada,
} from './resolverPerdidaLocalizadaEstimadaDeLocal'
import { resolverBalanceDePresion } from './resolverBalanceDePresion'

// Union discriminada por metodologia (D-delta.40) -- nunca un booleano
// "esEstimado": cada variante trae exactamente los datos auditables que
// esa metodologia produce (porTramo solo tiene sentido en detallado;
// nTerminalesLocal/nTeesEstimadas/velocidadReferencia_mps solo en
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
      readonly velocidadReferencia_mps: number
    }

type TrazaDeCamino = {
  readonly raizId: string
  readonly terminalId: string
  readonly desnivel_m: number
  readonly hfDistribuida_mca: number
  readonly hfDistribuidaPorTramo: readonly { readonly tramoId: string; readonly hf_m: number }[]
  readonly hfLocalizada: TrazaHfLocalizada
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
      // (D-delta.40): algun tramo que alimenta directamente un terminal
      // de este Local+red no tiene velocidad comercial resoluble.
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
): ResultadoPresionResidualDeCamino {
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    // Precondicion imposible tras validacion: mismo criterio que el resto
    // del motor de tuberias (obtenerArtefactosAguasAbajo, etc.).
    throw new Error('resolverPresionResidualDeCamino requiere un proyecto con redHidraulica definida')
  }

  const camino = obtenerCaminoHaciaOrigen(redHidraulica, nodoTerminalId)
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

  const unidadFuncional = proyecto.unidadesFuncionales.find((uf) => uf.id === referencia.unidadFuncionalId)
  const local = unidadFuncional?.locales.find((l) => l.id === referencia.localId)
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

  const desnivel = resolverDesnivelDeCamino(camino)
  if (desnivel.tipo === 'incompleto') {
    return { tipo: 'desnivelIncompleto', nodosSinCota: desnivel.nodosSinCota }
  }

  const perdidaDistribuida = acumularPerdidaDistribuidaDeCamino(
    proyecto,
    camino,
    catalogoArtefactos,
    catalogoSistemasDeTuberia,
    catalogoMateriales,
  )
  if (perdidaDistribuida.tipo === 'incompleta') {
    return { tipo: 'perdidaDistribuidaIncompleta', tramosNoResueltos: perdidaDistribuida.tramosNoResueltos }
  }

  let hfLocalizada: TrazaHfLocalizada
  let coberturaHfLocalizada: { readonly tipo: 'completa' | 'estimada'; readonly hf_mca: number }

  if (proyecto.configuracionHidraulica.metodoPerdidaLocalizada === 'detallado') {
    const perdidaLocalizada = acumularPerdidaLocalizadaDeCamino(
      proyecto,
      camino,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
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
      hfLocalizada = { metodologia: 'estimado', hf_mca: 0, nTerminalesLocal: 0, nTeesEstimadas: 0, velocidadReferencia_mps: 0 }
      coberturaHfLocalizada = { tipo: 'estimada', hf_mca: 0 }
    } else {
      // La red (AF/AC) de ESTE terminal es la del ultimo tramo del
      // camino -- el que efectivamente lo alimenta (por construccion de
      // obtenerCaminoHaciaOrigen, su nodoDestinoId es el terminal).
      const redDelTerminal = camino.tramos[camino.tramos.length - 1]!.red
      const perdidaEstimada = resolverPerdidaLocalizadaEstimadaDeLocal(
        proyecto,
        referencia.unidadFuncionalId,
        referencia.localId,
        redDelTerminal,
        catalogoArtefactos,
        catalogoSistemasDeTuberia,
      )
      if (perdidaEstimada.tipo === 'incompleta') {
        return { tipo: 'perdidaLocalizadaEstimadaIncompleta', tramosNoResueltos: perdidaEstimada.tramosNoResueltos }
      }

      hfLocalizada = {
        metodologia: 'estimado',
        hf_mca: perdidaEstimada.hf_m,
        nTerminalesLocal: perdidaEstimada.nTerminalesLocal,
        nTeesEstimadas: perdidaEstimada.nTeesEstimadas,
        velocidadReferencia_mps: perdidaEstimada.velocidadReferencia_mps,
      }
      coberturaHfLocalizada = { tipo: 'estimada', hf_mca: perdidaEstimada.hf_m }
    }
  }

  const traza: TrazaDeCamino = {
    raizId: camino.raizId,
    terminalId: camino.terminalId,
    desnivel_m: desnivel.desnivel_m,
    hfDistribuida_mca: perdidaDistribuida.hf_m,
    hfDistribuidaPorTramo: perdidaDistribuida.porTramo,
    hfLocalizada,
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
