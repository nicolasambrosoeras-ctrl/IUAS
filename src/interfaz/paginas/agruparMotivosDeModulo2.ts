// Agrupamiento de presentación de EstadoModulo2 (D-δ.41) para la UI
// (D-δ.43, "completitud accionable"): el dominio ya produce un
// diagnóstico estructurado por terminal (DiagnosticoIncompletitudModulo2)
// -- esta función SOLO cuenta/agrupa esos diagnósticos ya producidos en
// líneas legibles ("Faltan cotas de conexión en 12 terminales"), nunca
// infiere un motivo nuevo ni reinterpreta ninguno existente. No expone
// ningún id de Nodo/Tramo -- solo cantidades.
import type { UnidadFuncional } from '../../modelo/proyecto'
import type { DiagnosticoIncompletitudModulo2 } from '../../motor/modulo2/resolverEstadoModulo2'
import { formatearNumero } from '../../exportadores/pdf/formatearNumero'
import { humanizarPerdidaEstimada } from './humanizarPerdidaEstimada'

function pluralizar(n: number, singular: string, plural: string): string {
  return n === 1 ? singular : plural
}

// unidadesFuncionales SOLO se usa para resolver id -> nombre de
// 'unidadFuncionalSinCotaDeReferencia' (D-δ.46) -- a diferencia del
// resto de este archivo, esa línea SÍ nombra la entidad exacta en vez
// de solo contarla (no es un id técnico de Nodo/Tramo, es el mismo
// nombre que el usuario ya ve en "Datos del proyecto").
export function agruparMotivosDeModulo2(
  motivos: readonly DiagnosticoIncompletitudModulo2[],
  unidadesFuncionales: readonly UnidadFuncional[],
): readonly string[] {
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
    // M4-G (D-δ.68): el origen hidráulico ya no se elige en este panel --
    // se deriva del esquema de abastecimiento del Módulo 4.
    lineas.push('Falta configurar el esquema de abastecimiento en el Módulo 4.')
  }

  const desnivelIncompleto = motivos.filter((m) => m.tipo === 'desnivelIncompleto')
  if (desnivelIncompleto.length > 0) {
    const n = new Set(desnivelIncompleto.flatMap((m) => (m.tipo === 'desnivelIncompleto' ? m.nodosSinCota : []))).size
    lineas.push(`Faltan cotas de conexión en ${formatearNumero(n, 'conteo')} ${pluralizar(n, 'punto', 'puntos')}.`)
  }

  const idsUFSinCota = new Set(
    motivos.flatMap((m) => (m.tipo === 'unidadFuncionalSinCotaDeReferencia' ? [m.unidadFuncionalId] : [])),
  )
  if (idsUFSinCota.size > 0) {
    for (const uf of unidadesFuncionales) {
      if (idsUFSinCota.has(uf.id)) {
        lineas.push(`Falta la cota hidráulica de referencia de ${uf.nombre}.`)
      }
    }
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

  // La pérdida localizada Detalladas incompleta tiene dos causas de
  // naturaleza distinta que se cuentan por separado (M2-TOPO-E §11):
  //  - accesorios/tee sin relevar: el proyectista PUEDE resolverlo cargando
  //    datos;
  //  - derivación múltiple (1→N) no modelada: es una limitación del modelo,
  //    no hay nada que el proyectista pueda declarar todavía.
  const tramosPerdidaLocalizada = motivos.flatMap((m) =>
    m.tipo === 'perdidaLocalizadaIncompleta' ? m.tramosNoResueltos : [],
  )
  const tramosDerivacionMultiple = new Set(
    tramosPerdidaLocalizada.filter((t) => t.motivo === 'derivacionMultipleNoModelada').map((t) => t.tramoId),
  )
  const tramosRelevables = new Set(
    tramosPerdidaLocalizada.filter((t) => t.motivo !== 'derivacionMultipleNoModelada').map((t) => t.tramoId),
  )
  if (tramosRelevables.size > 0) {
    const n = tramosRelevables.size
    lineas.push(`Falta relevar accesorios o tees en ${formatearNumero(n, 'conteo')} ${pluralizar(n, 'tramo', 'tramos')}.`)
  }
  if (tramosDerivacionMultiple.size > 0) {
    const n = tramosDerivacionMultiple.size
    lineas.push(
      `En ${formatearNumero(n, 'conteo')} ${pluralizar(n, 'tramo', 'tramos')} la pérdida localizada de una derivación múltiple todavía no está modelada.`,
    )
  }

  const perdidaLocalizadaEstimadaIncompleta = motivos.filter((m) => m.tipo === 'perdidaLocalizadaEstimadaIncompleta')
  if (perdidaLocalizadaEstimadaIncompleta.length > 0) {
    const causas = perdidaLocalizadaEstimadaIncompleta.flatMap(m => m.tramosNoResueltos)
    const causasTopologicas = causas.filter(t => t.motivo !== 'sinDemanda' && t.motivo !== 'sinCandidatoAdmisible')
    if (causasTopologicas.length > 0) lineas.push(`Pérdida localizada estimada incompleta. ${humanizarPerdidaEstimada(causasTopologicas.map(t => t.motivo))}`)
    const n = new Set(
      perdidaLocalizadaEstimadaIncompleta.flatMap((m) =>
        m.tramosNoResueltos.filter(t => t.motivo === 'sinDemanda' || t.motivo === 'sinCandidatoAdmisible').map(t => t.tramoId),
      ),
    ).size
    if (n > 0) lineas.push(`Falta velocidad comercial resoluble en ${formatearNumero(n, 'conteo')} ${pluralizar(n, 'tramo', 'tramos')} (pérdida localizada estimada).`)
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
