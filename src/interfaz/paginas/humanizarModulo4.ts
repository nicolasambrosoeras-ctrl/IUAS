// Helpers de humanización de Módulo 4 — Abastecimiento y reserva (D-δ.67).
// Puramente de presentación: etiquetas, formateo y descripción de motivos.
// NO calcula nada ni reinterpreta ningún resultado del motor
// (resolverEstadoModulo4 ya devuelve todo).
import type { EsquemaDeAbastecimiento } from '../../modelo/proyecto'
import { codigosValidacion, type CodigoValidacion } from '../../validacion/codigos'
import type {
  DiagnosticoErrorModulo4,
  DiagnosticoIncompletitudModulo4,
  EstadoModulo4,
} from '../../motor/modulo4/resolverEstadoModulo4'

export const ETIQUETA_ESTADO_MODULO_4: Readonly<Record<EstadoModulo4['estado'], string>> = {
  noIniciado: 'No iniciado',
  error: 'Error',
  incompleto: 'Incompleto',
  evaluado: 'Evaluado',
}

export const ETIQUETA_ESQUEMA_ABASTECIMIENTO: Readonly<Record<EsquemaDeAbastecimiento, string>> = {
  directa: 'Alimentación directa',
  tanqueElevado: 'Tanque elevado',
  cisternaBombeoElevado: 'Cisterna + bombeo + tanque elevado',
}

// Etiqueta del input de desnivel según el esquema: el "punto de cálculo"
// físico es distinto en cada uno (D-δ.65 / CRIT-A37).
export function etiquetaDesnivelConexion(esquema: EsquemaDeAbastecimiento): string {
  switch (esquema) {
    case 'directa':
      return 'Desnivel hasta el punto alimentado de cálculo'
    case 'tanqueElevado':
      return 'Desnivel hasta el punto de alimentación del tanque'
    case 'cisternaBombeoElevado':
      return 'Desnivel hasta el punto de alimentación de la cisterna'
  }
}

// Formateo local es-AR (mismo criterio que humanizarModulo3: la interfaz
// todavía no comparte formateador con el PDF). Decimales por magnitud.
export function formatearNumeroM4(valor: number, decimales: number): string {
  return valor.toLocaleString('es-AR', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })
}

export const formatearVolumen_m3 = (valor: number): string => formatearNumeroM4(valor, 3)
export const formatearCaudal_lps = (valor: number): string => formatearNumeroM4(valor, 2)
export const formatearPresion_m = (valor: number): string => formatearNumeroM4(valor, 2)

// Equivalencia en litros, sólo presentación (nunca se persiste en litros).
export function volumenEnLitros(valor_m3: number): string {
  return Math.round(valor_m3 * 1000).toLocaleString('es-AR')
}

export function describirMotivoIncompletitudModulo4(motivo: DiagnosticoIncompletitudModulo4): string {
  switch (motivo.tipo) {
    case 'faltaPeriodoConsumoMaximo':
      return 'Ingresá el período de consumo máximo (entre 1 y 4 h).'
    case 'faltaDiametroConexion':
      return 'Seleccioná el DN de conexión.'
    case 'faltaDesnivelConexion':
      return 'Ingresá el desnivel del punto alimentado respecto de la acera.'
    case 'sinArtefactosComputables':
      return 'El proyecto no tiene artefactos con los que calcular la demanda (Módulo 1).'
    case 'qcGlobalIndeterminado':
      return `No se pudo determinar el caudal de cálculo global del proyecto (${motivo.motivo}).`
    case 'presionConexionFueraDeTabla':
      return (
        `La presión de cálculo (${formatearPresion_m(motivo.presionCalculo_m)} m) queda fuera del rango de la ` +
        `Tabla N°1 (${motivo.rango_m.min}–${motivo.rango_m.max} m). No se extrapola.`
      )
  }
}

// Los diagnósticos de error son problemas de validación estructural: se
// reutiliza la descripción central del catálogo de códigos (ya en
// castellano), sin reinterpretar.
export function describirProblemaDeErrorModulo4(problema: DiagnosticoErrorModulo4): string {
  const codigo: CodigoValidacion = problema.problema.codigo
  return codigosValidacion[codigo].descripcion
}
