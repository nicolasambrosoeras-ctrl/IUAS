// Tabla N°6 — Diámetro y capacidad máxima (C) de medidores de agua en
// función del caudal de cálculo del proyecto (ERAS-2023 §2.12: "El diámetro
// y caudal máximo de los medidores se determinan de acuerdo a la Norma ISO
// 4064, los valores en la tabla N° 6"). Datos puros, sin lógica de dominio
// más allá de la búsqueda tabular literal -- mismo criterio que
// tabla-01-gastos-conexion y tabla-07-perdidas-localizadas.
//
// Transcripción verificada contra el texto oficial de la Resolución
// 641/2023 (guia_para_ejecucion_de_instalaciones_sanitarias_domiciliarias,
// argentina.gob.ar). Columnas de la tabla:
//   - "Diámetro del medidor en mm"
//   - "Caudal de cálculo Qc del proyecto en m3/hora"
//   - "Caudal medio para determinar el medidor en m3/hora"
//   - "Caudal máximo del medidor C en m3/hora"
//
// INCONSISTENCIA OFICIAL — ver CRIT-A32 (normativa/eras-2023/CRITERIOS.md):
// el ejemplo de "vivienda tipo" que la propia Guía coloca inmediatamente
// después de esta tabla selecciona, para Qc=2,5 m3/h, un medidor DN19 y
// afirma "C=7 m3/hora". En ESTA tabla la fila DN19 tiene C=5 m3/h; C=7
// pertenece a la fila DN25. El motor de selección (motor/medidores/) usa
// la TABLA como única fuente de verdad: el DN seleccionado fija su C desde
// la MISMA fila. El emparejamiento DN19↔C=7 del ejemplo se trata como
// errata normativa y no se replica.

export type FilaTabla06Medidor = {
  readonly dnMedidor_mm: number
  // Umbral de selección: la Guía indica adoptar el medidor cuyo "Caudal de
  // cálculo Qc del proyecto" tabulado sea igual o mayor al Qc del proyecto.
  readonly qcProyecto_m3h: number
  // "Caudal medio para determinar el medidor" -- informativo, no
  // participa de la selección ni de la pérdida de carga (que usa C).
  readonly caudalMedio_m3h: number
  // "C = Capacidad máxima del medidor" -- es el divisor de la fórmula (6)
  // de CRIT-A25 (Jm = 0,036·(Qcl/C)²).
  readonly capacidadMaxima_m3h: number
}

export const tabla06Medidores: readonly FilaTabla06Medidor[] = [
  { dnMedidor_mm: 15, qcProyecto_m3h: 1.5, caudalMedio_m3h: 2.25, capacidadMaxima_m3h: 3 },
  { dnMedidor_mm: 19, qcProyecto_m3h: 2.5, caudalMedio_m3h: 3.75, capacidadMaxima_m3h: 5 },
  { dnMedidor_mm: 25, qcProyecto_m3h: 3.5, caudalMedio_m3h: 5.25, capacidadMaxima_m3h: 7 },
  { dnMedidor_mm: 32, qcProyecto_m3h: 5, caudalMedio_m3h: 7.5, capacidadMaxima_m3h: 10 },
  { dnMedidor_mm: 38, qcProyecto_m3h: 10, caudalMedio_m3h: 15, capacidadMaxima_m3h: 20 },
  { dnMedidor_mm: 50, qcProyecto_m3h: 15, caudalMedio_m3h: 22.5, capacidadMaxima_m3h: 30 },
  { dnMedidor_mm: 60, qcProyecto_m3h: 25, caudalMedio_m3h: 37.5, capacidadMaxima_m3h: 50 },
  { dnMedidor_mm: 75, qcProyecto_m3h: 40, caudalMedio_m3h: 60, capacidadMaxima_m3h: 80 },
] as const

// Caudal de cálculo máximo que la Tabla N°6 cubre de forma inequívoca (la
// última fila). Por encima de este valor NO se extrapola: la ampliación de
// rango corresponde a Tabla N°8 (Anexo A de la Guía), todavía no
// transcripta. Derivado de la propia tabla para no duplicar el dato.
export const qcMaximoCubiertoPorTabla06_m3h: number =
  tabla06Medidores[tabla06Medidores.length - 1]!.qcProyecto_m3h

// Tolerancia de comparación contra el umbral tabulado. El caudal de cálculo
// llega típicamente convertido de l/s a m3/h (× 3,6) por el motor de
// medidores, y esa conversión introduce error de representación IEEE-754
// del orden de 1e-15. Un Qc que vale exactamente 2,5 o 40 m3/h no debe
// caer a la fila siguiente (ni fuera de la tabla) por ese ruido. 1e-9 m3/h
// = 1 µL/h: físicamente irrelevante frente a cualquier salto real de la
// tabla (el menor es 0,5 m3/h).
const TOLERANCIA_UMBRAL_M3H = 1e-9 as const

// Búsqueda tabular literal de §2.12: se adopta la primera fila (menor DN)
// cuyo "Qc del proyecto" tabulado sea >= al caudal de cálculo recibido
// (con la tolerancia de arriba). No se interpola DN. Trabaja en m3/h -- la
// unidad de la propia tabla -- para que un test normativo pueda ejercitar
// el umbral exacto. Devuelve 'fueraDeTabla06' cuando el caudal supera el
// dominio de la tabla (nunca extrapola).
export function seleccionarFilaTabla06PorCaudal(
  qc_m3h: number,
): FilaTabla06Medidor | 'fueraDeTabla06' {
  if (!Number.isFinite(qc_m3h) || qc_m3h <= 0) {
    throw new Error(`seleccionarFilaTabla06PorCaudal: qc_m3h debe ser un número mayor a 0 (recibido: ${qc_m3h})`)
  }

  const fila = tabla06Medidores.find((candidata) => candidata.qcProyecto_m3h + TOLERANCIA_UMBRAL_M3H >= qc_m3h)
  return fila ?? 'fueraDeTabla06'
}
