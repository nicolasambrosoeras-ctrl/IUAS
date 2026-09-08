// DEPLOY-01 (preflight A): clasificación PRESENTACIONAL del nivel de
// exigencia de la velocidad real de un tramo, para comunicárselo al
// proyectista en la tabla de M2. NO es una norma hidráulica nueva y NO
// cambia el dimensionamiento, la selección de DN, CRIT-A19 ni Vmax:
//
//   - 2,0 m/s y 2,5 m/s son umbrales de COMUNICACIÓN IUAS, no límites
//     normativos. No existe ninguna constante Vmax=2,5.
//   - La única frontera de inadmisibilidad sigue siendo V > Vmax real
//     aplicable, que aquí se LEE de `verificarVelocidadAdmisible`
//     (limiteMaximo_mps / tipo) -- nunca se recalcula ni se copian tablas
//     normativas a la UI.
//
// El resultado sólo elige un badge; la fila hidráulica no cambia.
import type { ResultadoVerificacionVelocidad } from '../../motor/tuberias/velocidad/verificarVelocidadAdmisible'

export type ClasificacionVelocidad = 'normal' | 'elevada' | 'muyAlta' | 'noAdmisible'

// Umbrales de comunicación (m/s). Frontera inferior inclusiva: 2,0 ya es
// "elevada", 2,5 ya es "muy alta" (§8 del brief DEPLOY-01).
const UMBRAL_ELEVADA_MPS = 2.0
const UMBRAL_MUY_ALTA_MPS = 2.5

export function clasificarVelocidadParaUi(
  velocidadReal_mps: number,
  verificacion: ResultadoVerificacionVelocidad,
  velocidadPorDebajoDelMinimo: boolean,
): ClasificacionVelocidad {
  // CRIT-A24 / D-delta.27: el menor diámetro comercial evaluable, aceptado
  // pese a incumplir Vmin, es un estado terminal admisible -- nunca una
  // advertencia de velocidad (coherente con verificacionVelocidadTexto).
  if (velocidadPorDebajoDelMinimo) {
    return 'normal'
  }
  // V > Vmax real aplicable: única inadmisibilidad. Sólo se puede afirmar
  // cuando el dominio conoce el límite máximo (no en fueraDeDominioNormativo).
  if (verificacion.tipo !== 'fueraDeDominioNormativo' && velocidadReal_mps > verificacion.limiteMaximo_mps) {
    return 'noAdmisible'
  }
  if (velocidadReal_mps >= UMBRAL_MUY_ALTA_MPS) {
    return 'muyAlta'
  }
  if (velocidadReal_mps >= UMBRAL_ELEVADA_MPS) {
    return 'elevada'
  }
  return 'normal'
}
