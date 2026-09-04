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
// Barrera de completitud intacta: hfMedidor (CRIT-A25) todavia NO tiene
// ningun consumidor que la derive desde la topologia (D-delta.35), asi
// que se pasa como undefined y resolverBalanceDePresion devuelve
// 'incompleto'. Este orquestador propaga ese estado tal cual
// ('balanceIncompleto') -- NUNCA presenta una presion residual como
// verificada mientras falten terminos obligatorios.
//
// hfLocalizada SI tiene consumidor desde M2-C slice A (D-delta.33), pero
// solo cubre el subconjunto inequivoco de Tabla N°7 (curvas, codos,
// llave de paso, valvula esclusa, uniones, tubo saliente, reducciones
// -- CRIT-A30) -- tees siguen sin representacion, y griferia queda
// deliberadamente excluida del balance de la red (CRIT-A29, no es un
// pendiente). Por eso el valor que produce acumularPerdidaLocalizadaDeCamino
// SIEMPRE se envuelve como CoberturaDePerdidaLocalizada 'parcial' (nunca
// 'completa'): un numero util y auditable (queda en la traza), pero que
// por si solo NUNCA puede completar el balance mientras D-delta.33 no
// cierre tees para este camino (auditoria de completitud, ver
// resolverBalanceDePresion). La rama 'balanceCompleto' es el mapeo fiel
// del resultado 'completo' de resolverBalanceDePresion; hoy sigue
// inalcanzable por este camino (hfMedidor abstracto Y hfLocalizada
// siempre 'parcial'), y se vuelve alcanzable recien cuando D-delta.33
// cierre tees Y D-delta.35 conecte el medidor.
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
import { resolverBalanceDePresion } from './resolverBalanceDePresion'

type TrazaDeCamino = {
  readonly raizId: string
  readonly terminalId: string
  readonly desnivel_m: number
  readonly hfDistribuida_mca: number
  readonly hfDistribuidaPorTramo: readonly { readonly tramoId: string; readonly hf_m: number }[]
  // Solo el subconjunto CRIT-A28 de Tabla N°7 (D-delta.33 parcialmente
  // cerrada) -- NUNCA la totalidad de la perdida localizada normativa de
  // este camino. Dato auditable util, pero resolverBalanceDePresion lo
  // recibe envuelto como 'parcial': nunca cuenta por si solo para
  // completar el balance (ver comentario de archivo).
  readonly hfLocalizada_mca: number
  readonly hfLocalizadaPorTramo: readonly { readonly tramoId: string; readonly hf_m: number }[]
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

  const perdidaLocalizada = acumularPerdidaLocalizadaDeCamino(
    proyecto,
    camino,
    catalogoArtefactos,
    catalogoSistemasDeTuberia,
  )
  if (perdidaLocalizada.tipo === 'incompleta') {
    return { tipo: 'perdidaLocalizadaIncompleta', tramosNoResueltos: perdidaLocalizada.tramosNoResueltos }
  }

  const traza: TrazaDeCamino = {
    raizId: camino.raizId,
    terminalId: camino.terminalId,
    desnivel_m: desnivel.desnivel_m,
    hfDistribuida_mca: perdidaDistribuida.hf_m,
    hfDistribuidaPorTramo: perdidaDistribuida.porTramo,
    hfLocalizada_mca: perdidaLocalizada.hf_m,
    hfLocalizadaPorTramo: perdidaLocalizada.porTramo,
  }

  const balance = resolverBalanceDePresion(
    presionDisponible_mca,
    desnivel.desnivel_m,
    {
      hfDistribuida_mca: perdidaDistribuida.hf_m,
      // 'parcial', nunca 'completa': acumularPerdidaLocalizadaDeCamino
      // solo cubre el subconjunto CRIT-A28/CRIT-A30 (D-delta.33 sigue
      // abierta para tees). Ver comentario de archivo.
      hfLocalizada: { tipo: 'parcial', hf_mca: perdidaLocalizada.hf_m },
      // hfMedidor sigue sin consumidor topologico (D-delta.35): undefined,
      // nunca 0 -- el balance sigue 'incompleto' hasta que se resuelva.
      hfMedidor_mca: undefined,
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
