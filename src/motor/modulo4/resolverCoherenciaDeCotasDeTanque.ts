// Chequeo de coherencia geométrica entre el pelo de agua mínimo declarado
// y el punto de alimentación del tanque, para el esquema 'tanqueElevado'
// simple en modo Profesional (M2 / D-δ.79).
//
// El pelo de agua mínimo (superficie de agua con el flotante cerrado)
// queda físicamente POR DEBAJO del punto de alimentación del tanque (el
// flotante corta el llenado antes de alcanzar la boca de entrada). Si el
// proyectista declara una cota de pelo de agua mínimo por encima del
// punto de alimentación, es muy probablemente un error de carga de cotas
// -- pero NO se convierte en error duro ni se modifica ningún valor: es
// una advertencia no bloqueante.
//
// Sólo aplica a 'tanqueElevado' + modo Profesional: en 'cisternaBombeoElevado'
// las cotas no son comparables (la conexión de red alimenta la cisterna,
// no el tanque elevado) y en modo Rápido el pelo de agua mínimo se estima
// a partir del punto de alimentación (CRIT-A39), así que la relación se
// cumple por construcción.
//
// Función pura y total: no lee el Proyecto ni la RedHidraulica, no
// modifica nada.
import type { EsquemaDeAbastecimiento, GranularidadHidraulica } from '../../modelo/proyecto'

export type CoherenciaDeCotasDeTanque =
  // No corresponde evaluar (otro esquema, modo Rápido, o falta algún dato).
  | { readonly tipo: 'noEvaluable' }
  // Cotas coherentes: pelo de agua mínimo por debajo (o igual) al punto de
  // alimentación del tanque.
  | { readonly tipo: 'coherente' }
  // El pelo de agua mínimo declarado queda POR ENCIMA del punto de
  // alimentación del tanque -- advertencia no bloqueante.
  | {
      readonly tipo: 'peloEncimaDeLaAlimentacion'
      readonly cotaPeloDeAguaMinimo_m: number
      readonly desnivelAlimentacionTanque_m: number
    }

export function resolverCoherenciaDeCotasDeTanque(entrada: {
  readonly esquema: EsquemaDeAbastecimiento | undefined
  readonly granularidad: GranularidadHidraulica
  readonly cotaPeloDeAguaMinimo_m: number | undefined
  readonly desnivelConexion_m: number | undefined
}): CoherenciaDeCotasDeTanque {
  const { esquema, granularidad, cotaPeloDeAguaMinimo_m, desnivelConexion_m } = entrada

  if (
    esquema !== 'tanqueElevado' ||
    granularidad !== 'profesional' ||
    cotaPeloDeAguaMinimo_m === undefined ||
    desnivelConexion_m === undefined
  ) {
    return { tipo: 'noEvaluable' }
  }

  if (cotaPeloDeAguaMinimo_m > desnivelConexion_m) {
    return {
      tipo: 'peloEncimaDeLaAlimentacion',
      cotaPeloDeAguaMinimo_m,
      desnivelAlimentacionTanque_m: desnivelConexion_m,
    }
  }

  return { tipo: 'coherente' }
}
