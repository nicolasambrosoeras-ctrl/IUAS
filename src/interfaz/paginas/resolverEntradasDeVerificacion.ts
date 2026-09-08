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

export type EntradasDeVerificacion = {
  // 'tanqueElevado' | 'directa' | undefined (esquema ausente o corrupto).
  readonly origenEfectivo: OrigenEfectivo | undefined
  readonly origenTexto: 'Tanque elevado' | 'Alimentación directa'
  // Condición de borde para el balance (D-δ.38): tanque elevado -> 0;
  // directa -> presión sobre acera; sin origen -> undefined.
  readonly presionDisponible_mca: number | undefined
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
    perdidasDeMedidoresDeTerminal,
    hfMedidorDeTerminal,
  }
}
