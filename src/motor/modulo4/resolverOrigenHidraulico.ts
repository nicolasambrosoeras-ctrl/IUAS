// Origen hidráulico EFECTIVO para la verificación de presión de Módulo 2,
// derivado del esquema de abastecimiento persistido (M4-G / D-δ.68). Es la
// FUENTE ÚNICA de esa decisión: el Panel de Presión ya no elige el origen
// por su cuenta (se retiró el selector local `tipoAlimentacion`).
//
//   'directa'               -> 'directa'
//       frontera física = presión sobre acera; raíz ≈ cota 0; Δz del
//       camino sube hasta cada terminal.
//   'tanqueElevado'          -> 'tanqueElevado'
//       raíz = pelo de agua mínimo del tanque; Pdisponible ≈ 0; toda la
//       carga la expresa Δz.
//   'cisternaBombeoElevado'  -> 'tanqueElevado'
//       la cisterna y la bomba están AGUAS ARRIBA del almacenamiento
//       superior: para el balance del terminal el origen sigue siendo el
//       tanque elevado -- NO es un tercer origen terminal. La presión de
//       bomba y la pérdida de la cisterna no entran a este balance.
//
// Función pura y total sobre EsquemaDeAbastecimiento: NO conoce presiones,
// cotas, Tabla N°1, RTD ni bombas. NO vive dentro de las primitivas
// hidráulicas de Módulo 2 (que siguen agnósticas de Módulo 4).
import type { EsquemaDeAbastecimiento } from '../../modelo/proyecto'

export type OrigenHidraulicoEfectivo = 'directa' | 'tanqueElevado'

export function resolverOrigenHidraulicoEfectivo(
  esquema: EsquemaDeAbastecimiento,
): OrigenHidraulicoEfectivo {
  switch (esquema) {
    case 'directa':
      return 'directa'
    case 'tanqueElevado':
    case 'cisternaBombeoElevado':
      return 'tanqueElevado'
    default: {
      // Esquema no reconocido: JSON persistido corrupto.
      // validarConfiguracionAbastecimiento ya lo reporta como 'error'; el
      // llamador debe filtrarlo antes. Esta rama sólo evita un retorno
      // silencioso fuera del tipo.
      const _exhaustivo: never = esquema
      throw new Error(`resolverOrigenHidraulicoEfectivo: esquema no reconocido: ${String(_exhaustivo)}`)
    }
  }
}
