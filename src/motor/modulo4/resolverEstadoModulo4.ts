// Estado y resultado de Módulo 4 (Reserva), D-δ.63. Primitiva de dominio
// pura, independiente de UI, que orquesta el cálculo de reserva del
// Proyecto componiendo piezas ya cerradas:
//
//   calcularSimultaneidad        -> Qc global del proyecto (M1, CRIT-A5)
//   calcularReservaDiaria        -> Reserva Total Diaria de Diseño (M4-B, CRIT-A35)
//
// No reimplementa ninguna fórmula ni regla: compone y clasifica. NO conoce
// React, NO toca RedHidraulica ni M2/M3, NO persiste nada (todo lo que
// devuelve se recalcula en cada llamada -> nunca hay resultado stale).
//
// Semántica de los cuatro estados:
//
//  - 'noIniciado': no existe `proyecto.configuracionAbastecimiento`. Estado
//    explícito (igual que redHidraulica ausente para M2 / configuracionMedidores
//    ausente para M3), NO un default. La ausencia NO se interpreta como
//    'directa'.
//
//  - 'error': `configuracionAbastecimiento` persistida estructuralmente
//    inválida (esquema desconocido, `periodoConsumoMaximo_h` fuera de la
//    ventana [1, 4] h). Nunca se usa 'error' para un input todavía no
//    disponible -- eso es 'incompleto'.
//
//  - 'incompleto': la configuración es válida pero falta un insumo para
//    evaluar la reserva de un esquema con tanque: `periodoConsumoMaximo_h`
//    (Tc), el caudal de conexión, o el Qc global de M1 (sin artefactos
//    computables / indeterminado). El esquema 'directa' NUNCA cae en
//    'incompleto': no necesita ninguno de esos insumos.
//
//  - 'evaluado': el estado de cálculo de M4 está determinado. Para 'directa'
//    el resultado es `sinReservaPorTanque` (el cálculo de reserva por tanque
//    no aplica). Para un esquema con tanque es `reservaCalculada` con la
//    Reserva Total Diaria de Diseño (incluido el caso `déficit = 0` cuando
//    Qconexión >= Qc: es una reserva calculada de volumen 0, NO
//    `sinReservaPorTanque`).
//
//    'evaluado' NO significa "cumple normativa": no verifica la
//    obligatoriedad de reserva de §2.8 (faltan datos de destino / planta;
//    queda para un slice posterior) ni compara contra un volumen adoptado
//    (todavía no existe). Sólo dice que el cálculo de M4 quedó resuelto.
import type { Proyecto } from '../../modelo/proyecto'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import type { TipoProyectoNormativo } from '../../normativa/eras-2023/coeficientes-mayoracion'
import type { ProblemaValidacion } from '../../validacion/codigos'
import { validarConfiguracionAbastecimiento } from '../../validacion/configuracionAbastecimiento'
import { calcularSimultaneidad } from '../demanda/simultaneidad/calcularSimultaneidad'
import { calcularReservaDiaria, type ResultadoReservaDiaria } from '../reserva/calcularReservaDiaria'

export type ResultadoModulo4 =
  | { readonly tipo: 'sinReservaPorTanque'; readonly esquema: 'directa' }
  | {
      readonly tipo: 'reservaCalculada'
      readonly esquema: 'tanqueElevado' | 'cisternaBombeoElevado'
      readonly reserva: ResultadoReservaDiaria
    }

export type DiagnosticoErrorModulo4 = {
  readonly tipo: 'problemaDeValidacion'
  readonly problema: ProblemaValidacion
}

export type DiagnosticoIncompletitudModulo4 =
  | { readonly tipo: 'faltaPeriodoConsumoMaximo' }
  | { readonly tipo: 'faltaCaudalDeConexion' }
  | { readonly tipo: 'sinArtefactosComputables' }
  | { readonly tipo: 'qcGlobalIndeterminado'; readonly motivo: string }

export type EstadoModulo4 =
  | { readonly estado: 'noIniciado' }
  | { readonly estado: 'error'; readonly problemas: readonly DiagnosticoErrorModulo4[] }
  | { readonly estado: 'incompleto'; readonly motivos: readonly DiagnosticoIncompletitudModulo4[] }
  | { readonly estado: 'evaluado'; readonly resultado: ResultadoModulo4 }

export type EntradaEstadoModulo4 = {
  readonly proyecto: Proyecto
  readonly catalogoArtefactos: readonly ArtefactoNormativo[]
  readonly coeficientesMayoracion: readonly TipoProyectoNormativo[]
  // Caudal que la operadora otorga en la conexión, en l/s. Condición de
  // borde EXPLÍCITA del orquestador (mismo estatus que `presionDisponible`
  // para M2): este motor no la deriva de Tabla N°1 (§2.7) ni de ningún
  // dato del Proyecto todavía -- ver D-δ.63, "mini-arqueología Tabla N°1".
  // `undefined` (o ausente) en un esquema con tanque -> 'incompleto'.
  readonly qConexion_lps?: number | undefined
}

export function resolverEstadoModulo4(entrada: EntradaEstadoModulo4): EstadoModulo4 {
  const { proyecto, catalogoArtefactos, coeficientesMayoracion, qConexion_lps } = entrada
  const configuracion = proyecto.configuracionAbastecimiento

  if (configuracion === undefined) {
    return { estado: 'noIniciado' }
  }

  // --- 'error': integridad estructural del dato persistido primero ---
  const problemasEstructurales = validarConfiguracionAbastecimiento(proyecto)
  if (problemasEstructurales.length > 0) {
    return {
      estado: 'error',
      problemas: problemasEstructurales.map((problema) => ({
        tipo: 'problemaDeValidacion' as const,
        problema,
      })),
    }
  }

  // --- 'directa': la reserva por tanque no aplica; estado determinado ---
  if (configuracion.esquema === 'directa') {
    return { estado: 'evaluado', resultado: { tipo: 'sinReservaPorTanque', esquema: 'directa' } }
  }

  // --- esquemas con tanque: requieren Tc + Qc global + Qconexión ---
  const motivos: DiagnosticoIncompletitudModulo4[] = []

  const tc_h = configuracion.periodoConsumoMaximo_h
  if (tc_h === undefined) {
    motivos.push({ tipo: 'faltaPeriodoConsumoMaximo' })
  }

  // Qc global del proyecto (CRIT-A5), mismo patrón que resolverEstadoModulo3:
  // se compone el motor de demanda real, nunca se recalcula ni se redondea.
  let qc_lps: number | undefined
  const nComputable = proyecto.unidadesFuncionales
    .flatMap((unidadFuncional) => unidadFuncional.locales)
    .flatMap((local) => local.artefactos)
    .filter((artefacto) => artefacto.origen === 'normativo')
    .reduce((total, artefacto) => total + artefacto.cantidad, 0)

  if (nComputable === 0) {
    motivos.push({ tipo: 'sinArtefactosComputables' })
  } else {
    const qcGlobal = calcularSimultaneidad({
      proyecto,
      normativa: { catalogoArtefactos, coeficientesMayoracion },
    }).resultados['qc']

    if (qcGlobal === undefined || 'estado' in qcGlobal || qcGlobal.valor <= 0) {
      motivos.push({
        tipo: 'qcGlobalIndeterminado',
        motivo:
          qcGlobal !== undefined && 'estado' in qcGlobal
            ? qcGlobal.motivo
            : 'El Qc global del proyecto no resolvió a un valor positivo.',
      })
    } else {
      qc_lps = qcGlobal.valor
    }
  }

  if (qConexion_lps === undefined) {
    motivos.push({ tipo: 'faltaCaudalDeConexion' })
  }

  if (motivos.length > 0) {
    return { estado: 'incompleto', motivos }
  }

  // motivos vacío ⇒ tc_h, qc_lps y qConexion_lps están definidos por
  // construcción. El guard explícito narra los tipos y captura cualquier
  // inconsistencia interna futura (mismo patrón que resolverEstadoModulo3).
  if (tc_h === undefined || qc_lps === undefined || qConexion_lps === undefined) {
    throw new Error(
      'resolverEstadoModulo4: inconsistencia interna -- sin motivos de incompletitud pero falta un input de la reserva',
    )
  }

  const reserva = calcularReservaDiaria({ qc_lps, qConexion_lps, tc_h })
  return {
    estado: 'evaluado',
    resultado: { tipo: 'reservaCalculada', esquema: configuracion.esquema, reserva },
  }
}
