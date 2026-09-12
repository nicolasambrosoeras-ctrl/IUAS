// D-δ.51 (§21-§28, §46): view-model de una fila de la tabla de
// dimensionamiento de M2. NO recalcula hidráulica -- compone lo que el
// motor ya devuelve: resolverPerdidaDistribuidaDeTramo (N3) para el número
// crudo de hf distribuida del Tramo, resolverResultadoDeTramoParaUi para
// los textos ya formateados de DN/V/verificación, y
// HYD-EST: para Local/Red en Estimadas muestra la distribuida del tramo
// separada de las localizadas por recorrido. No suma una hf localizada
// agregada ni elige un máximo/crítico en nombre del usuario.
import type { Proyecto } from '../../modelo/proyecto'
import type { RedDeTramo } from '../../modelo/redHidraulica'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import { catalogoSistemasDeTuberia } from '../../motor/tuberias/sistemaDeTuberia'
import { catalogoMaterialesTuberia } from '../../motor/tuberias/materialTuberia'
import { contarTerminalesFisicosDeLocal } from '../../motor/tuberias/topologia/contarTerminalesFisicosDeLocal'
import { resolverPerdidaDistribuidaDeTramo } from '../../motor/tuberias/resolverPerdidaDistribuidaDeTramo'
import { resolverPerdidaLocalizadaEstimadaDeLocal } from '../../motor/tuberias/presion/resolverPerdidaLocalizadaEstimadaDeLocal'
import type { ContextoDeCalculoM2 } from '../../motor/tuberias/contextoDeCalculoM2'
import { formatearNumero } from '../../exportadores/pdf/formatearNumero'
import { resolverResultadoDeTramoParaUi } from './resolverResultadoDeTramoParaUi'
import type { ClasificacionVelocidad } from './clasificarVelocidadParaUi'
import { nombresDeArtefactosAguasAbajo } from './humanizarModulo2'

export type EstadoDeFila = 'ok' | 'controlar' | 'incompleto'

export type FilaDeDimensionamiento = {
  readonly tramoId: string
  readonly longitud_m: number | undefined
  readonly qcTexto: string
  readonly dnTexto: string
  readonly vTexto: string
  // DEPLOY-01 (preflight A): nivel del badge de velocidad de la celda V.
  readonly clasificacionVelocidad: ClasificacionVelocidad
  readonly hfDistribuidaTexto: string
  // En filas Local/Red Estimadas es undefined: no existe un total único.
  // En las otras filas conserva la pérdida distribuida del tramo.
  readonly perdidaTotal_mca: number | undefined
  readonly perdidaTotalTexto: string
  readonly hfLocalizadaEstimada_mca: number | undefined
  readonly hfDistribuida_mca: number | undefined
  readonly estado: EstadoDeFila
  readonly estadoTexto: string
  readonly nPuntos: number
  readonly artefactos: string
  readonly errorDelMotor: string | null
}

function estadoDe(
  errorDelMotor: string | null,
  hfDistribuida_mca: number | undefined,
  verificacionTexto: string,
): EstadoDeFila {
  if (errorDelMotor !== null || hfDistribuida_mca === undefined) {
    return 'incompleto'
  }
  // D-δ.27/CRIT-A24: "Aceptada en el menor diámetro comercial" es un
  // estado de control, no un fallo.
  if (verificacionTexto.startsWith('Aceptada en el menor')) {
    return 'controlar'
  }
  return 'ok'
}

const ETIQUETA_ESTADO: Readonly<Record<EstadoDeFila, string>> = {
  ok: '✓',
  controlar: '○ DN mínimo comercial',
  incompleto: '⚠ Incompleto',
}

export function resolverFilaDeDimensionamiento(
  proyecto: Proyecto,
  tramoId: string,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  // Local+Red del Tramo representativo: habilita el resumen por recorrido
  // y contar "N puntos". Ausente para la Distribución general.
  contextoLocal?: { readonly unidadFuncionalId: string; readonly localId: string; readonly red: RedDeTramo },
  // PERF-SCALE-01C: contexto de cálculo local al render (mismo
  // ContextoDeCalculoM2 de 01B). Colapsa las 2-3 resoluciones de hidráulica/
  // diámetro que este mismo Tramo recibía por fila (resolverResultadoDeTramoParaUi
  // + esta misma función + resolverControlDeDnDeTramo, todas del lado del
  // llamador) a UNA sola. Ausente ⇒ comportamiento previo byte a byte.
  contextoDeCalculo?: ContextoDeCalculoM2,
): FilaDeDimensionamiento {
  const ui = resolverResultadoDeTramoParaUi(proyecto, tramoId, catalogoArtefactos, contextoDeCalculo)

  let hfDistribuida_mca: number | undefined
  try {
    const n3 = resolverPerdidaDistribuidaDeTramo(
      proyecto,
      tramoId,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
      contextoDeCalculo,
    )
    if (n3.tipo === 'conPerdidaDistribuida') {
      hfDistribuida_mca = n3.hf_m
    }
  } catch {
    hfDistribuida_mca = undefined
  }

  // HYD-EST: una fila Local/Red representa varios caminos. No se elige
  // arbitrariamente máximo/crítico para fabricar una pérdida escalar.
  const hfLocalizadaEstimada_mca = undefined
  let localizadaPorRecorrido = false
  let localizadaIncompleta = false
  let nPuntos = 0
  if (contextoLocal !== undefined && proyecto.redHidraulica !== undefined) {
    nPuntos = contarTerminalesFisicosDeLocal(
      proyecto.redHidraulica,
      contextoLocal.unidadFuncionalId,
      contextoLocal.localId,
      contextoLocal.red,
    )
    if (proyecto.configuracionHidraulica.metodoPerdidaLocalizada === 'estimado') {
      const estimada = resolverPerdidaLocalizadaEstimadaDeLocal(
        proyecto,
        contextoLocal.unidadFuncionalId,
        contextoLocal.localId,
        contextoLocal.red,
        catalogoArtefactos,
        catalogoSistemasDeTuberia,
        contextoDeCalculo,
      )
      localizadaPorRecorrido = true
      localizadaIncompleta = estimada.caminos.some(c => c.resultado.tipo === 'incompleta')
    }
  }

  const perdidaTotal_mca =
    localizadaPorRecorrido ? undefined : hfDistribuida_mca

  const estado = localizadaIncompleta ? 'incompleto' : estadoDe(ui.errorDelMotor, hfDistribuida_mca, ui.textos.verificacionVelocidadTexto)

  return {
    tramoId,
    longitud_m: proyecto.redHidraulica?.tramos.find((t) => t.id === tramoId)?.longitud_m,
    qcTexto: ui.textos.qcTexto,
    dnTexto: ui.textos.diComercialTexto,
    vTexto: ui.textos.vTexto,
    clasificacionVelocidad: ui.textos.clasificacionVelocidad,
    hfDistribuidaTexto: ui.textos.hfTexto,
    perdidaTotal_mca,
    perdidaTotalTexto: localizadaPorRecorrido
      ? `${hfDistribuida_mca === undefined ? '—' : formatearNumero(hfDistribuida_mca, 'm')} m.c.a. distrib. · localizada ${localizadaIncompleta ? 'incompleta' : 'por recorrido'}`
      : perdidaTotal_mca === undefined ? '—' : `${formatearNumero(perdidaTotal_mca, 'm')} m.c.a.`,
    hfLocalizadaEstimada_mca,
    hfDistribuida_mca,
    estado,
    estadoTexto: ETIQUETA_ESTADO[estado],
    nPuntos,
    artefactos: contextoLocal !== undefined ? nombresDeArtefactosAguasAbajo(proyecto, catalogoArtefactos, tramoId) : '',
    errorDelMotor: ui.errorDelMotor,
  }
}
