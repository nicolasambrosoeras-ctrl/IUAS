// UI-01C (D-δ.74) — view-model del resumen compacto del proyecto que se
// muestra bajo la navegación lateral. PRESENTACIÓN pura: NO calcula
// hidráulica ni reserva, NO persiste nada, NO introduce un
// `EstadoGlobalProyecto`. Compone tres primitivas de dominio ya
// productivas y las traduce a valores listos para mostrar, respetando
// "ausencia ≠ cero" (brief §24) y el contrato de M4 para el esquema
// `directa` (§25):
//
//   Qc              -> calcularSimultaneidad(proyecto)
//   Reserva         -> resolverEstadoModulo4(proyecto)
//   Margen crítico  -> resolverEstadoModulo2(proyecto, <entradas de verificación>)
//
// Cada campo puede estar 'pendiente' (todavía no determinado) o, sólo la
// Reserva, 'noAplica' (esquema `directa`, sin cálculo de reserva por
// tanque). El resumen nunca muestra 0 para un resultado no determinado.
import type { Proyecto } from '../../modelo/proyecto'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import type { TipoProyectoNormativo } from '../../normativa/eras-2023/coeficientes-mayoracion'
import { catalogoSistemasDeTuberia } from '../../motor/tuberias/sistemaDeTuberia'
import { catalogoMaterialesTuberia } from '../../motor/tuberias/materialTuberia'
import { calcularSimultaneidad } from '../../motor/demanda/simultaneidad/calcularSimultaneidad'
import { resolverEstadoModulo2 } from '../../motor/modulo2/resolverEstadoModulo2'
import { resolverEstadoModulo4 } from '../../motor/modulo4/resolverEstadoModulo4'
import { textoValorCalculado } from '../../presentacion/desarrolloDelCalculoDemanda'
import { formatearNumero } from '../../exportadores/pdf/formatearNumero'
import { formatearVolumen_L_rapido } from './humanizarModulo4'
import { resolverEntradasDeVerificacion } from './resolverEntradasDeVerificacion'

// 'pendiente': el resultado todavía no está determinado (no es 0).
// 'noAplica': el resultado no corresponde a esta configuración.
export type CampoResumen =
  | { readonly tipo: 'valor'; readonly texto: string }
  | { readonly tipo: 'pendiente' }
  | { readonly tipo: 'noAplica' }

export type ResumenDeProyecto = {
  readonly qc: CampoResumen
  readonly reserva: CampoResumen
  readonly margenCritico: CampoResumen
  // El signo del margen orienta el color del valor (positivo = holgado,
  // negativo = no cumple). undefined mientras el margen sea 'pendiente'.
  readonly margenCumple: boolean | undefined
}

const PENDIENTE = { tipo: 'pendiente' } as const

// Mismo formateo de presión que el bloque del terminal crítico en el
// panel (§42: la precisión de m.c.a. no se simplifica como los litros).
function formatearMca(valor: number): string {
  const signo = valor >= 0 ? '+' : ''
  return `${signo}${formatearNumero(valor, 'm')} m.c.a.`
}

export function resolverResumenDeProyecto(
  proyecto: Proyecto,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  coeficientesMayoracion: readonly TipoProyectoNormativo[],
): ResumenDeProyecto {
  // --- Qc (Módulo 1) ---
  let qc: CampoResumen = PENDIENTE
  const demanda = calcularSimultaneidad({ proyecto, normativa: { catalogoArtefactos, coeficientesMayoracion } })
  const qcValor = demanda.resultados.qc
  if (qcValor !== undefined && !('estado' in qcValor)) {
    // Mismo formateo que la card protagonista de M1 (textoValorCalculado).
    qc = { tipo: 'valor', texto: textoValorCalculado(qcValor) }
  }

  // --- Reserva (Módulo 4) ---
  let reserva: CampoResumen = PENDIENTE
  const estadoM4 = resolverEstadoModulo4({ proyecto, catalogoArtefactos, coeficientesMayoracion })
  if (estadoM4.estado === 'evaluado') {
    if (estadoM4.resultado.tipo === 'sinReservaPorTanque') {
      // Esquema `directa`: el cálculo de reserva por tanque no aplica
      // (contrato de M4). No es 0 (§25).
      reserva = { tipo: 'noAplica' }
    } else if (estadoM4.resultado.tipo === 'reservaCalculada') {
      // El resumen es una vista "de un vistazo": litros redondeados, igual
      // que el modo Rápido de M4 (§39). El valor exacto vive en la etapa 4.
      reserva = {
        tipo: 'valor',
        texto: `${formatearVolumen_L_rapido(estadoM4.resultado.reserva.volumenReservaDiseno_m3)} L`,
      }
    }
  }

  // --- Margen crítico (verificación de Módulo 2) ---
  let margenCritico: CampoResumen = PENDIENTE
  let margenCumple: boolean | undefined
  const { presionDisponible_mca, hfMedidorDeTerminal } = resolverEntradasDeVerificacion(
    proyecto,
    catalogoArtefactos,
    coeficientesMayoracion,
  )
  const estadoM2 = resolverEstadoModulo2(
    proyecto,
    presionDisponible_mca,
    hfMedidorDeTerminal,
    catalogoArtefactos,
    catalogoSistemasDeTuberia,
    catalogoMaterialesTuberia,
  )
  if (estadoM2.estado === 'completo') {
    const margen = estadoM2.terminalMasDesfavorable.margen_mca
    margenCritico = { tipo: 'valor', texto: formatearMca(margen) }
    margenCumple = estadoM2.terminalMasDesfavorable.cumpleMinimo
  }

  return { qc, reserva, margenCritico, margenCumple }
}
