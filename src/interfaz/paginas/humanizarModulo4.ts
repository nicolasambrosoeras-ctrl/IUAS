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

// --- Litros como unidad principal de la UI de Módulo 4 (D-δ.71) ---------
//
// El core sigue enteramente en m³ (`volumenReservaDiseno_m3`,
// `volumenTanque*Adoptado_m3`, CRIT-A35/A38, goldens y persistencia NO
// cambian). Estas funciones son SÓLO conversión y formato de
// presentación/edición: `1 m³ = 1000 L`. Nunca se persiste en litros y
// nunca se redondea el cálculo -- el redondeo de abajo es visual.

/** Factor de conversión de m³ a litros. `1 m³ = 1000 L`. */
export const LITROS_POR_M3 = 1000 as const

/** m³ -> litros (número puro, para presentar). */
export const litrosDesde_m3 = (valor_m3: number): number => valor_m3 * LITROS_POR_M3

/** litros -> m³ (número puro, para persistir con el updater existente). */
export const m3DesdeLitros = (valor_L: number): number => valor_L / LITROS_POR_M3

// Formateo de un volumen (recibido en m³) para MOSTRARLO en litros. es-AR,
// hasta 3 decimales de litro y sin ceros de relleno -> evita la falsa
// precisión ("1493 L", no "1493,000 L"; "771,169 L" cuando el cálculo sí
// tiene decimales). Sin separador de miles: los volúmenes domésticos
// (100–5000 L) no lo necesitan y "1.000 L" se confunde con "1 L".
export function formatearVolumen_L(valor_m3: number): string {
  return litrosDesde_m3(valor_m3).toLocaleString('es-AR', {
    maximumFractionDigits: 3,
    useGrouping: false,
  })
}

// Valor en litros para el atributo `value` de un <input number>: limpia el
// ruido IEEE-754 de la multiplicación (1,5005 m³ -> 1500,5 L, no
// 1500,5000000001) conservando hasta 3 decimales de litro reales.
export function litrosParaInput(valor_m3: number): number {
  return Number((valor_m3 * LITROS_POR_M3).toFixed(6))
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
