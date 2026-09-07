// Helpers de humanización de Módulo 3 (D-δ.56): etiquetas y descripciones
// de presentación para el Panel de Medidores. Puramente de presentación --
// no calcula nada ni reinterpreta ningún resultado del motor.
import type { TipoProvisionACS } from '../../modelo/proyecto'
import type { ServicioMedido } from '../../motor/medidores/seleccionarMedidorIndividual'
import type {
  DiagnosticoIncompletitudModulo3,
  EstadoModulo3,
} from '../../motor/modulo3/resolverEstadoModulo3'

export const ETIQUETA_TIPO_PROVISION_ACS: Readonly<Record<TipoProvisionACS, string>> = {
  individual: 'Individual en cada unidad',
  central: 'Central',
}

export const ETIQUETA_SERVICIO_MEDIDO: Readonly<Record<ServicioMedido, string>> = {
  aguaFria: 'Agua fría',
  aguaCaliente: 'Agua caliente',
}

export const ETIQUETA_ESTADO_MODULO_3: Readonly<Record<EstadoModulo3['estado'], string>> = {
  noIniciado: 'No iniciado',
  error: 'Error',
  incompleto: 'Incompleto',
  evaluado: 'Evaluado',
}

// Formateo local es-AR: la interfaz todavía no comparte formateador con el
// PDF (ver exportadores/pdf/formatearNumero.ts, que documenta esa
// postergación). Decimales por magnitud, en un solo lugar.
export function formatearMagnitudDeMedidor(valor: number, magnitud: 'caudal' | 'perdida' | 'diametro'): string {
  const decimales = magnitud === 'perdida' ? 3 : magnitud === 'diametro' ? 0 : 2
  return valor.toLocaleString('es-AR', { minimumFractionDigits: decimales, maximumFractionDigits: decimales })
}

export function describirMotivoIncompletitudModulo3(motivo: DiagnosticoIncompletitudModulo3): string {
  switch (motivo.tipo) {
    case 'sinArtefactosComputables':
      return 'El proyecto no tiene artefactos con los que calcular la demanda.'
    case 'qcGeneralIndeterminado':
      return `No se pudo determinar el caudal de cálculo global del proyecto (${motivo.motivo}).`
    case 'medidorGeneralFueraDeTabla06':
      return (
        `El caudal del medidor general (${formatearMagnitudDeMedidor(motivo.qcDiseno_m3h, 'caudal')} m³/h) ` +
        `supera el alcance de la Tabla N°6 (máximo ${motivo.qcMaximoCubierto_m3h} m³/h). No se extrapola.`
      )
    case 'redHidraulicaAusenteParaMedicionIndividual':
      return 'Falta la red hidráulica del Módulo 2 para resolver los medidores individuales.'
    case 'medidorIndividualFueraDeTabla06':
      return (
        `El caudal del medidor individual de ${motivo.unidadFuncionalId} · ` +
        `${ETIQUETA_SERVICIO_MEDIDO[motivo.servicioMedido]} ` +
        `(${formatearMagnitudDeMedidor(motivo.qcDiseno_m3h, 'caudal')} m³/h) supera el alcance de la Tabla N°6.`
      )
  }
}
