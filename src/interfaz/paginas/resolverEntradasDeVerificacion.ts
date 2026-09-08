// UI-01C (D-δ.74) — view-model de PRESENTACIÓN compartido: deriva las
// condiciones de borde de la verificación de presión de Módulo 2
// (origen hidráulico efectivo, presión disponible en la raíz, pérdida de
// medidores por terminal) a partir del Proyecto.
//
// NO calcula hidráulica ni reimplementa ninguna fórmula: sólo COMPONE
// primitivas de dominio ya productivas (resolverOrigenHidraulicoEfectivo,
// resolverEstadoModulo3, resolverPerdidasDeMedidoresParaTerminal), tal
// como ya lo hacía `PanelDePresionDeModulo2` internamente. Se extrae a su
// propio módulo porque ahora tiene un segundo consumidor real: el resumen
// compacto del proyecto en la sidebar (`resolverResumenDeProyecto`). Así
// esa derivación vive en un solo lugar en vez de duplicarse (brief §27).
import type { Proyecto } from '../../modelo/proyecto'
import { ESQUEMAS_DE_ABASTECIMIENTO } from '../../modelo/proyecto'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import type { TipoProyectoNormativo } from '../../normativa/eras-2023/coeficientes-mayoracion'
import type { Nodo, ReferenciaDeArtefacto } from '../../modelo/redHidraulica'
import { resolverOrigenHidraulicoEfectivo } from '../../motor/modulo4/resolverOrigenHidraulico'
import {
  resolverPeloDeAguaMinimoEfectivo,
  type PeloDeAguaMinimoEfectivo,
} from '../../motor/modulo4/resolverPeloDeAguaMinimoDeTanque'
import { resolverEstadoModulo3 } from '../../motor/modulo3/resolverEstadoModulo3'
import {
  resolverPerdidasDeMedidoresParaTerminal,
  type OrigenHidraulicoDeMedidores,
  type PerdidasDeMedidoresParaTerminal,
} from '../../motor/modulo3/resolverPerdidasDeMedidoresParaTerminal'
import { resolverRedDeTerminal } from './resolverRedDeTerminal'

type OrigenEfectivo = ReturnType<typeof resolverOrigenHidraulicoEfectivo>

function esTerminalDeArtefacto(nodo: Nodo): nodo is Nodo & { referencia: ReferenciaDeArtefacto } {
  return nodo.referencia?.tipo === 'artefacto'
}

// Nodos raíz del camino: sin ningún Tramo entrante. Para el esquema
// 'tanqueElevado' su `cota_m` representa el pelo de agua mínimo del tanque.
function nodosRaizDe(proyecto: Proyecto): readonly Nodo[] {
  const red = proyecto.redHidraulica
  if (red === undefined) {
    return []
  }
  return red.nodos.filter((nodo) => !red.tramos.some((tramo) => tramo.nodoDestinoId === nodo.id))
}

// Aplica al Proyecto el pelo de agua mínimo EFECTIVO del modo Rápido
// (CRIT-A39) sobre los nodos raíz, SOLO para alimentar el balance de
// presión -- nunca se persiste. En 'derivadoRapido' cada raíz toma la cota
// estimada; en 'incompletoRapido' se les quita la cota para que el balance
// quede incompleto en vez de caer al valor manual oculto del modo
// Profesional (preservación de la doble fuente por modo). En 'manual' y
// 'noAplica' el Proyecto pasa tal cual.
export function aplicarPeloDeAguaMinimoEfectivo(
  proyecto: Proyecto,
  peloDeAguaMinimoEfectivo: PeloDeAguaMinimoEfectivo,
): Proyecto {
  if (peloDeAguaMinimoEfectivo.tipo === 'manual' || peloDeAguaMinimoEfectivo.tipo === 'noAplica') {
    return proyecto
  }
  const red = proyecto.redHidraulica
  if (red === undefined) {
    return proyecto
  }
  const idsRaiz = new Set(nodosRaizDe(proyecto).map((nodo) => nodo.id))
  const nodos = red.nodos.map((nodo): Nodo => {
    if (!idsRaiz.has(nodo.id)) {
      return nodo
    }
    if (peloDeAguaMinimoEfectivo.tipo === 'derivadoRapido') {
      return { ...nodo, cota_m: peloDeAguaMinimoEfectivo.cota_m }
    }
    // 'incompletoRapido': raíz sin cota -> el balance reporta desnivel
    // incompleto en vez de caer al valor manual oculto del modo Profesional.
    const sinCota: Nodo = { id: nodo.id }
    if (nodo.referencia !== undefined) {
      sinCota.referencia = nodo.referencia
    }
    if (nodo.tee !== undefined) {
      sinCota.tee = nodo.tee
    }
    return sinCota
  })
  return { ...proyecto, redHidraulica: { ...red, nodos } }
}

export type EntradasDeVerificacion = {
  // 'tanqueElevado' | 'directa' | undefined (esquema ausente o corrupto).
  readonly origenEfectivo: OrigenEfectivo | undefined
  readonly origenTexto: 'Tanque elevado' | 'Alimentación directa'
  // Condición de borde para el balance (D-δ.38): tanque elevado -> 0;
  // directa -> presión sobre acera; sin origen -> undefined.
  readonly presionDisponible_mca: number | undefined
  // Pelo de agua mínimo EFECTIVO (CRIT-A39): describe si el valor viene del
  // dato manual (Profesional), de la hipótesis del modo Rápido, o si falta
  // el desnivel de alimentación para estimarlo. Lo consume la UI para
  // mostrar el valor derivado read-only y el mensaje de dato faltante.
  readonly peloDeAguaMinimoEfectivo: PeloDeAguaMinimoEfectivo
  // Proyecto a usar para el balance de presión (resolverEstadoModulo2 /
  // resolverPresionResidualDeCamino): igual al Proyecto salvo que el modo
  // Rápido + tanque elevado simple sustituye la cota de la raíz por el pelo
  // de agua mínimo estimado. Nunca se persiste.
  readonly proyectoParaVerificacion: Proyecto
  // Pérdida de medidores aplicable a un terminal (M3-E, D-δ.58) -- objeto
  // completo (lo consume "Ver cálculo del crítico") y su hf ya extraído
  // (lo consume el balance por terminal).
  readonly perdidasDeMedidoresDeTerminal: (nodoTerminalId: string) => PerdidasDeMedidoresParaTerminal | undefined
  readonly hfMedidorDeTerminal: (nodoTerminalId: string) => number | undefined
}

export function resolverEntradasDeVerificacion(
  proyecto: Proyecto,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  coeficientesMayoracion: readonly TipoProyectoNormativo[],
): EntradasDeVerificacion {
  const esquemaAbastecimiento = proyecto.configuracionAbastecimiento?.esquema
  const esquemaValido =
    esquemaAbastecimiento !== undefined &&
    (ESQUEMAS_DE_ABASTECIMIENTO as readonly string[]).includes(esquemaAbastecimiento)
  const origenEfectivo = esquemaValido ? resolverOrigenHidraulicoEfectivo(esquemaAbastecimiento) : undefined

  const presionDisponible_mca =
    origenEfectivo === 'tanqueElevado'
      ? 0
      : origenEfectivo === 'directa'
        ? proyecto.parametros.presionSobreAcera_m
        : undefined

  // CRIT-A39 (D-δ.79): pelo de agua mínimo efectivo. Sólo interviene para
  // el esquema 'tanqueElevado' simple; 'directa' y 'cisternaBombeoElevado'
  // devuelven 'noAplica' y siguen con el dato manual de siempre.
  const peloDeAguaMinimoEfectivo = resolverPeloDeAguaMinimoEfectivo({
    esquema: esquemaValido ? esquemaAbastecimiento : undefined,
    granularidad: proyecto.configuracionHidraulica.granularidadHidraulica,
    desnivelConexion_m: proyecto.parametros.desnivelConexion_m,
  })
  const proyectoParaVerificacion = aplicarPeloDeAguaMinimoEfectivo(proyecto, peloDeAguaMinimoEfectivo)

  const origenHidraulico: OrigenHidraulicoDeMedidores | undefined =
    origenEfectivo === 'tanqueElevado'
      ? 'tanqueElevado'
      : origenEfectivo === 'directa'
        ? 'alimentacionDirecta'
        : undefined

  const nodosTerminales = proyecto.redHidraulica?.nodos.filter(esTerminalDeArtefacto) ?? []
  const estadoModulo3 = resolverEstadoModulo3(proyecto, catalogoArtefactos, coeficientesMayoracion)

  const perdidasDeMedidoresDeTerminal = (
    nodoTerminalId: string,
  ): PerdidasDeMedidoresParaTerminal | undefined => {
    if (origenHidraulico === undefined) {
      return undefined
    }
    const nodo = nodosTerminales.find((n) => n.id === nodoTerminalId)
    const red = resolverRedDeTerminal(proyecto, nodoTerminalId)
    if (nodo === undefined || red === undefined) {
      return undefined
    }
    return resolverPerdidasDeMedidoresParaTerminal({
      estadoModulo3,
      configuracionMedidores: proyecto.configuracionMedidores,
      unidadFuncionalIdDelTerminal: nodo.referencia.unidadFuncionalId,
      redDelTerminal: red,
      origenHidraulico,
    })
  }

  const hfMedidorDeTerminal = (nodoTerminalId: string): number | undefined => {
    const perdidas = perdidasDeMedidoresDeTerminal(nodoTerminalId)
    return perdidas?.estado === 'determinadas' ? perdidas.hfTotal_mca : undefined
  }

  return {
    origenEfectivo,
    origenTexto: origenEfectivo === 'tanqueElevado' ? 'Tanque elevado' : 'Alimentación directa',
    presionDisponible_mca,
    peloDeAguaMinimoEfectivo,
    proyectoParaVerificacion,
    perdidasDeMedidoresDeTerminal,
    hfMedidorDeTerminal,
  }
}
