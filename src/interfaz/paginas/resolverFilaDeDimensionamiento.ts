// D-δ.51 (§21-§28, §46): view-model de una fila de la tabla de
// dimensionamiento de M2. NO recalcula hidráulica -- compone lo que el
// motor ya devuelve: resolverPerdidaDistribuidaDeTramo (N3) para el número
// crudo de hf distribuida del Tramo, resolverResultadoDeTramoParaUi para
// los textos ya formateados de DN/V/verificación, y
// resolverPerdidaLocalizadaEstimadaDeLocal para la hf localizada estimada
// del Local+Red en modo Rápido. "Pérdida" de la fila = hf distribuida del
// Tramo + hf localizada del Local+Red, con el desglose disponible para el
// detalle expandible (brief §25).
import type { Proyecto } from '../../modelo/proyecto'
import type { RedDeTramo } from '../../modelo/redHidraulica'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import { catalogoSistemasDeTuberia } from '../../motor/tuberias/sistemaDeTuberia'
import { catalogoMaterialesTuberia } from '../../motor/tuberias/materialTuberia'
import { contarTerminalesFisicosDeLocal } from '../../motor/tuberias/topologia/contarTerminalesFisicosDeLocal'
import { resolverPerdidaDistribuidaDeTramo } from '../../motor/tuberias/resolverPerdidaDistribuidaDeTramo'
import { resolverPerdidaLocalizadaEstimadaDeLocal } from '../../motor/tuberias/presion/resolverPerdidaLocalizadaEstimadaDeLocal'
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
  // Pérdida representativa de la fila (distribuida del Tramo + localizada
  // estimada del Local+Red, cuando ambas son inequívocas). undefined si
  // la distribuida todavía no resuelve.
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
  // Local+Red del Tramo representativo: habilita sumar la hf localizada
  // estimada y contar "N puntos". Ausente para la Distribución general.
  contexto?: { readonly unidadFuncionalId: string; readonly localId: string; readonly red: RedDeTramo },
): FilaDeDimensionamiento {
  const ui = resolverResultadoDeTramoParaUi(proyecto, tramoId, catalogoArtefactos)

  let hfDistribuida_mca: number | undefined
  try {
    const n3 = resolverPerdidaDistribuidaDeTramo(
      proyecto,
      tramoId,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )
    if (n3.tipo === 'conPerdidaDistribuida') {
      hfDistribuida_mca = n3.hf_m
    }
  } catch {
    hfDistribuida_mca = undefined
  }

  let hfLocalizadaEstimada_mca: number | undefined
  let nPuntos = 0
  if (contexto !== undefined && proyecto.redHidraulica !== undefined) {
    nPuntos = contarTerminalesFisicosDeLocal(
      proyecto.redHidraulica,
      contexto.unidadFuncionalId,
      contexto.localId,
      contexto.red,
    )
    if (proyecto.configuracionHidraulica.metodoPerdidaLocalizada === 'estimado') {
      const estimada = resolverPerdidaLocalizadaEstimadaDeLocal(
        proyecto,
        contexto.unidadFuncionalId,
        contexto.localId,
        contexto.red,
        catalogoArtefactos,
        catalogoSistemasDeTuberia,
      )
      if (estimada.tipo !== 'incompleta') {
        hfLocalizadaEstimada_mca = estimada.hf_m
      }
    }
  }

  const perdidaTotal_mca =
    hfDistribuida_mca === undefined ? undefined : hfDistribuida_mca + (hfLocalizadaEstimada_mca ?? 0)

  const estado = estadoDe(ui.errorDelMotor, hfDistribuida_mca, ui.textos.verificacionVelocidadTexto)

  return {
    tramoId,
    longitud_m: proyecto.redHidraulica?.tramos.find((t) => t.id === tramoId)?.longitud_m,
    qcTexto: ui.textos.qcTexto,
    dnTexto: ui.textos.diComercialTexto,
    vTexto: ui.textos.vTexto,
    clasificacionVelocidad: ui.textos.clasificacionVelocidad,
    hfDistribuidaTexto: ui.textos.hfTexto,
    perdidaTotal_mca,
    perdidaTotalTexto: perdidaTotal_mca === undefined ? '—' : `${formatearNumero(perdidaTotal_mca, 'm')} m.c.a.`,
    hfLocalizadaEstimada_mca,
    hfDistribuida_mca,
    estado,
    estadoTexto: ETIQUETA_ESTADO[estado],
    nPuntos,
    artefactos: contexto !== undefined ? nombresDeArtefactosAguasAbajo(proyecto, catalogoArtefactos, tramoId) : '',
    errorDelMotor: ui.errorDelMotor,
  }
}
