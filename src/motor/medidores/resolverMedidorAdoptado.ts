// M3-D parte 2 (D-δ.57): medidor RECOMENDADO vs. ADOPTADO. Misma filosofía
// que D-δ.52 para el DN comercial de tuberías -- el recomendado es el
// resultado normativo automático de Tabla N°6 (CRIT-A32); el adoptado es
// una decisión explícita del usuario (un DN de Tabla N°6). Sin override,
// adoptado = recomendado. Con override, el DN adoptado es
// HIDRÁULICAMENTE EFECTIVO: se recalcula `C` desde ESA fila y `hf` con
// `C` adoptado (CRIT-A25). El caudal `Qcl`/`Qc` NO cambia.
//
// Este resolver NO conoce Proyecto, RedHidraulica ni configuración: recibe
// el resultado 'seleccionado' del núcleo (B1/B2a) y el DN adoptado (o
// undefined = automático), y devuelve ambos lados más la relación del
// adoptado con el criterio de selección de Tabla N°6.
import { tabla06Medidores } from '../../normativa/eras-2023/tabla-06-medidores'
import { calcularPerdidaCargaMedidor } from '../tuberias/perdidaCarga/calcularPerdidaCargaMedidor'
import type { NucleoSeleccionDeMedidor } from './resolverSeleccionYPerdidaDeMedidor'

// Misma tolerancia que seleccionarFilaTabla06PorCaudal: un Qc que vale
// exactamente el umbral de una fila no debe clasificarse como inferior
// por ruido de conversión IEEE-754.
const TOLERANCIA_UMBRAL_M3H = 1e-9

export type CriterioSeleccionMedidor =
  // La fila adoptada satisface el criterio de Tabla N°6 (su "Qc del
  // proyecto" tabulado >= Qc de diseño). Es el caso de 'automatico' y de
  // cualquier adopción >= al recomendado.
  | 'satisface'
  // El usuario adoptó una fila POR DEBAJO del criterio de selección de
  // Tabla N°6 para este Qc. No es "fuera de rango metrológico" (ERAS no
  // publica Qmin/Q1..Q4): sólo significa que el medidor adoptado no
  // satisface la selección automática. `hf` se sigue calculando (C existe).
  | 'inferiorAlRecomendado'

export type FilaDeMedidorTabla06 = {
  readonly dnMedidor_mm: number
  readonly capacidadMaxima_m3h: number
  readonly caudalMedio_m3h: number
  // Umbral "Qc del proyecto" tabulado de la fila.
  readonly qcProyectoTabla_m3h: number
}

export type MedidorRecomendado = FilaDeMedidorTabla06 & {
  readonly hfMedidor_mca: number
}

export type MedidorAdoptado = FilaDeMedidorTabla06 & {
  readonly origen: 'automatico' | 'manual'
  readonly criterioSeleccion: CriterioSeleccionMedidor
  // hf EFECTIVA: 0,036 · (Qcl / C_adoptado)².
  readonly hfMedidor_mca: number
}

export type MedidorEvaluado = {
  readonly qcDiseno_lps: number
  readonly qcDiseno_m3h: number
  readonly qcl_lpm: number
  readonly recomendado: MedidorRecomendado
  readonly adoptado: MedidorAdoptado
}

function filaDe(nucleo: Extract<NucleoSeleccionDeMedidor, { tipo: 'seleccionado' }>): FilaDeMedidorTabla06 {
  return {
    dnMedidor_mm: nucleo.dnMedidor_mm,
    capacidadMaxima_m3h: nucleo.capacidadMaxima_m3h,
    caudalMedio_m3h: nucleo.caudalMedio_m3h,
    qcProyectoTabla_m3h: nucleo.qcProyectoTabla_m3h,
  }
}

export function resolverMedidorAdoptado(
  nucleo: Extract<NucleoSeleccionDeMedidor, { tipo: 'seleccionado' }>,
  dnAdoptado: number | undefined,
): MedidorEvaluado {
  const recomendado: MedidorRecomendado = { ...filaDe(nucleo), hfMedidor_mca: nucleo.hfMedidor_mca }

  // Sin override o DN adoptado desconocido (dato persistido corrupto): se
  // vuelve a automático -- nunca hace fallar el cálculo.
  const filaAdoptada =
    dnAdoptado === undefined
      ? undefined
      : tabla06Medidores.find((fila) => fila.dnMedidor_mm === dnAdoptado)

  if (filaAdoptada === undefined) {
    return {
      qcDiseno_lps: nucleo.qcDiseno_lps,
      qcDiseno_m3h: nucleo.qcDiseno_m3h,
      qcl_lpm: nucleo.qcl_lpm,
      recomendado,
      adoptado: { ...recomendado, origen: 'automatico', criterioSeleccion: 'satisface' },
    }
  }

  const hfEfectiva = calcularPerdidaCargaMedidor(nucleo.qcl_lpm, filaAdoptada.capacidadMaxima_m3h)
  const satisface = filaAdoptada.qcProyecto_m3h + TOLERANCIA_UMBRAL_M3H >= nucleo.qcDiseno_m3h

  return {
    qcDiseno_lps: nucleo.qcDiseno_lps,
    qcDiseno_m3h: nucleo.qcDiseno_m3h,
    qcl_lpm: nucleo.qcl_lpm,
    recomendado,
    adoptado: {
      dnMedidor_mm: filaAdoptada.dnMedidor_mm,
      capacidadMaxima_m3h: filaAdoptada.capacidadMaxima_m3h,
      caudalMedio_m3h: filaAdoptada.caudalMedio_m3h,
      qcProyectoTabla_m3h: filaAdoptada.qcProyecto_m3h,
      origen: 'manual',
      criterioSeleccion: satisface ? 'satisface' : 'inferiorAlRecomendado',
      hfMedidor_mca: hfEfectiva,
    },
  }
}
