// Adopción y distribución de la Reserva Total Diaria (M4-E, CRIT-A38).
// Función pura: dado el volumen de reserva REQUERIDO por el cálculo
// (§2.10.2 / CRIT-A35) y las capacidades ADOPTADAS por el proyectista,
// verifica si la capacidad alcanza -- y, en sistemas con dos tanques, si
// cada uno satisface el mínimo de §2.11.3.
//
// NORMA §2.11.3 (verbatim, Resolución 641/2023): "Los tanques de bombeo y
// reserva deben poseer un volumen mínimo de 1/3 de la Reserva Total
// Diaria." Interpretación adoptada (ver CRIT-A38):
//   - CADA tanque (bombeo/inferior y reserva/elevado) >= VRTD / 3;
//   - [FÍSICA] la capacidad total adoptada >= VRTD;
//   - NO se exige suma exacta (los tanques adoptados pueden superar el
//     mínimo) ni un reparto fijo 1/3 + 2/3.
//
// Esta verificación NO afirma cumplimiento normativo global del
// abastecimiento: la obligatoriedad de reserva (§2.8) es una cuestión
// separada, y `volumenRequerido_m3 = 0` (cuando Qconexión >= Qc) NO
// implica que el tanque no sea obligatorio. Los nombres reflejan que se
// evalúa "capacidad respecto de la RTD calculada", no "instalación
// aprobada".
//
// Comparaciones exactas (`>=`), sin tolerancia ni redondeo: las
// capacidades adoptadas son valores declarados por el usuario.
import type { EsquemaDeAbastecimiento } from '../../modelo/proyecto'

export type ResultadoAdopcionDeReserva =
  // 'directa': la reserva por tanque no aplica -- NO se fabrica una
  // verificación con requerido/adoptado = 0.
  | { readonly tipo: 'noAplica' }
  // Esquema con tanque, falta la capacidad adoptada del único componente
  // ('tanqueElevado').
  | { readonly tipo: 'sinAdopcion'; readonly volumenRequerido_m3: number }
  // 'tanqueElevado' con capacidad adoptada: un único almacenamiento, sin
  // mínimo individual de 1/3 (no hay sistema dividido).
  | {
      readonly tipo: 'verificada'
      readonly volumenRequerido_m3: number
      readonly volumenAdoptado_m3: number
      readonly diferencia_m3: number // adoptado − requerido
      readonly estado: 'suficiente' | 'insuficiente'
    }
  // 'cisternaBombeoElevado' al que le falta una o ambas capacidades.
  | {
      readonly tipo: 'adopcionIncompleta'
      readonly volumenRequerido_m3: number
      readonly faltaTanqueBombeo: boolean
      readonly faltaTanqueElevado: boolean
    }
  // 'cisternaBombeoElevado' con ambas capacidades: se verifican los tres
  // criterios de §2.11.3 por separado.
  | {
      readonly tipo: 'verificadaDistribuida'
      readonly volumenRequerido_m3: number
      readonly minimoPorTanque_m3: number // VRTD / 3
      readonly volumenTanqueBombeoAdoptado_m3: number
      readonly volumenTanqueElevadoAdoptado_m3: number
      readonly totalAdoptado_m3: number
      readonly tanqueBombeoCumpleMinimo: boolean
      readonly tanqueElevadoCumpleMinimo: boolean
      readonly totalCumple: boolean
      readonly estado: 'suficiente' | 'insuficiente' // suficiente ⇔ los tres verdaderos
    }

export type EntradaAdopcionDeReserva = {
  readonly esquema: EsquemaDeAbastecimiento
  readonly volumenReservaRequerido_m3: number
  readonly volumenTanqueElevadoAdoptado_m3?: number | undefined
  readonly volumenTanqueBombeoAdoptado_m3?: number | undefined
}

export function resolverAdopcionDeReserva(
  entrada: EntradaAdopcionDeReserva,
): ResultadoAdopcionDeReserva {
  const {
    esquema,
    volumenReservaRequerido_m3,
    volumenTanqueElevadoAdoptado_m3,
    volumenTanqueBombeoAdoptado_m3,
  } = entrada

  if (esquema === 'directa') {
    return { tipo: 'noAplica' }
  }

  if (esquema === 'tanqueElevado') {
    // El volumen de tanque de bombeo NO aplica a este esquema: se ignora.
    if (volumenTanqueElevadoAdoptado_m3 === undefined) {
      return { tipo: 'sinAdopcion', volumenRequerido_m3: volumenReservaRequerido_m3 }
    }
    const diferencia_m3 = volumenTanqueElevadoAdoptado_m3 - volumenReservaRequerido_m3
    return {
      tipo: 'verificada',
      volumenRequerido_m3: volumenReservaRequerido_m3,
      volumenAdoptado_m3: volumenTanqueElevadoAdoptado_m3,
      diferencia_m3,
      estado: volumenTanqueElevadoAdoptado_m3 >= volumenReservaRequerido_m3 ? 'suficiente' : 'insuficiente',
    }
  }

  // esquema === 'cisternaBombeoElevado'
  const faltaTanqueBombeo = volumenTanqueBombeoAdoptado_m3 === undefined
  const faltaTanqueElevado = volumenTanqueElevadoAdoptado_m3 === undefined
  if (faltaTanqueBombeo || faltaTanqueElevado) {
    return {
      tipo: 'adopcionIncompleta',
      volumenRequerido_m3: volumenReservaRequerido_m3,
      faltaTanqueBombeo,
      faltaTanqueElevado,
    }
  }

  const minimoPorTanque_m3 = volumenReservaRequerido_m3 / 3
  const totalAdoptado_m3 = volumenTanqueBombeoAdoptado_m3 + volumenTanqueElevadoAdoptado_m3
  const tanqueBombeoCumpleMinimo = volumenTanqueBombeoAdoptado_m3 >= minimoPorTanque_m3
  const tanqueElevadoCumpleMinimo = volumenTanqueElevadoAdoptado_m3 >= minimoPorTanque_m3
  const totalCumple = totalAdoptado_m3 >= volumenReservaRequerido_m3

  return {
    tipo: 'verificadaDistribuida',
    volumenRequerido_m3: volumenReservaRequerido_m3,
    minimoPorTanque_m3,
    volumenTanqueBombeoAdoptado_m3,
    volumenTanqueElevadoAdoptado_m3,
    totalAdoptado_m3,
    tanqueBombeoCumpleMinimo,
    tanqueElevadoCumpleMinimo,
    totalCumple,
    estado:
      tanqueBombeoCumpleMinimo && tanqueElevadoCumpleMinimo && totalCumple ? 'suficiente' : 'insuficiente',
  }
}
