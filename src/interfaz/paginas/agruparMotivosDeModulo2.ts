// Agrupamiento de presentación de EstadoModulo2 (D-δ.41) para la UI
// (D-δ.43, "completitud accionable"): el dominio ya produce un
// diagnóstico estructurado por terminal (DiagnosticoIncompletitudModulo2)
// -- esta función SOLO cuenta/agrupa esos diagnósticos ya producidos en
// líneas legibles ("Faltan cotas de conexión en 12 terminales"), nunca
// infiere un motivo nuevo ni reinterpreta ninguno existente. No expone
// ningún id de Nodo/Tramo -- solo cantidades.
import type { DiagnosticoIncompletitudModulo2 } from '../../motor/modulo2/resolverEstadoModulo2'
import { formatearNumero } from '../../exportadores/pdf/formatearNumero'

function pluralizar(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural
}

export function agruparMotivosDeModulo2(motivos: readonly DiagnosticoIncompletitudModulo2[]): readonly string[] {
  const lineas: string[] = []

  const coberturaFisicaIncompleta = motivos.find((m) => m.tipo === 'coberturaFisicaIncompleta')
  if (coberturaFisicaIncompleta?.tipo === 'coberturaFisicaIncompleta') {
    const n = coberturaFisicaIncompleta.artefactosSinReferencia.length
    lineas.push(
      `Faltan conectar físicamente ${formatearNumero(n, 'conteo')} ${pluralizar(n, 'artefacto', 'artefactos')} a la red hidráulica.`,
    )
  }

  if (motivos.some((m) => m.tipo === 'sinTerminalesHidraulicos')) {
    lineas.push('El proyecto no tiene ningún terminal hidráulico conectado todavía.')
  }

  if (motivos.some((m) => m.tipo === 'presionDisponibleNoProvista')) {
    lineas.push('Falta indicar el tipo de alimentación y sus datos.')
  }

  const desnivelIncompleto = motivos.filter((m) => m.tipo === 'desnivelIncompleto')
  if (desnivelIncompleto.length > 0) {
    const n = new Set(desnivelIncompleto.flatMap((m) => (m.tipo === 'desnivelIncompleto' ? m.nodosSinCota : []))).size
    lineas.push(`Faltan cotas de conexión en ${formatearNumero(n, 'conteo')} ${pluralizar(n, 'punto', 'puntos')}.`)
  }

  const perdidaDistribuidaIncompleta = motivos.filter((m) => m.tipo === 'perdidaDistribuidaIncompleta')
  if (perdidaDistribuidaIncompleta.length > 0) {
    const n = new Set(
      perdidaDistribuidaIncompleta.flatMap((m) =>
        m.tipo === 'perdidaDistribuidaIncompleta' ? m.tramosNoResueltos.map((t) => t.tramoId) : [],
      ),
    ).size
    lineas.push(`Falta la longitud en ${formatearNumero(n, 'conteo')} ${pluralizar(n, 'tramo', 'tramos')} para calcular la pérdida distribuida.`)
  }

  const perdidaLocalizadaIncompleta = motivos.filter((m) => m.tipo === 'perdidaLocalizadaIncompleta')
  if (perdidaLocalizadaIncompleta.length > 0) {
    const n = new Set(
      perdidaLocalizadaIncompleta.flatMap((m) =>
        m.tipo === 'perdidaLocalizadaIncompleta' ? m.tramosNoResueltos.map((t) => t.tramoId) : [],
      ),
    ).size
    lineas.push(`Falta relevar accesorios o tees en ${formatearNumero(n, 'conteo')} ${pluralizar(n, 'tramo', 'tramos')}.`)
  }

  const perdidaLocalizadaEstimadaIncompleta = motivos.filter((m) => m.tipo === 'perdidaLocalizadaEstimadaIncompleta')
  if (perdidaLocalizadaEstimadaIncompleta.length > 0) {
    const n = new Set(
      perdidaLocalizadaEstimadaIncompleta.flatMap((m) =>
        m.tipo === 'perdidaLocalizadaEstimadaIncompleta' ? m.tramosNoResueltos.map((t) => t.tramoId) : [],
      ),
    ).size
    lineas.push(`Falta velocidad comercial resoluble en ${formatearNumero(n, 'conteo')} ${pluralizar(n, 'tramo', 'tramos')} (pérdida localizada estimada).`)
  }

  const balanceIncompleto = motivos.filter((m) => m.tipo === 'balanceIncompleto')
  if (balanceIncompleto.length > 0) {
    const n = new Set(balanceIncompleto.map((m) => (m.tipo === 'balanceIncompleto' ? m.nodoId : ''))).size
    lineas.push(`Hay ${formatearNumero(n, 'conteo')} ${pluralizar(n, 'terminal', 'terminales')} con el balance de presión todavía incompleto.`)
  }

  if (motivos.some((m) => m.tipo === 'sinTerminalesConPresionMinimaPublicada')) {
    lineas.push('Ningún terminal del proyecto tiene presión mínima normativa publicada para verificar.')
  }

  return lineas
}
