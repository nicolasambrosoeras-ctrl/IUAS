// Actualización inmutable de Proyecto.configuracionAbastecimiento (D-δ.63).
// Configuración global y única del Proyecto, no una entidad por sector.
// Funciones puras (sin React, sin efectos): cada updater preserva el resto
// del Proyecto y sólo persiste decisiones físicas del usuario -- nunca
// resultados derivados (eso lo recalcula resolverEstadoModulo4).
//
// No hay un "iniciar Módulo 4" con esquema por defecto: elegir el esquema
// (conEsquemaDeAbastecimiento) es lo que inicia M4. Antes de eso
// EstadoModulo4 es 'noIniciado' (D-δ.63: no persistir un default
// preventivo).
import type { ConfiguracionDeAbastecimiento, EsquemaDeAbastecimiento, Proyecto } from '../../modelo/proyecto'

// Fija el esquema de abastecimiento (e inicia M4 si no estaba iniciado).
//  - 'directa' no usa Tc: se descarta `periodoConsumoMaximo_h` para no
//    arrastrar un dato que ese esquema no consume (D-δ.63 §7/§23).
//  - Entre esquemas con tanque (tanqueElevado ↔ cisternaBombeoElevado) se
//    conserva `periodoConsumoMaximo_h`: es el mismo parámetro de reserva
//    total, sigue siendo la decisión del usuario.
export function conEsquemaDeAbastecimiento(
  proyecto: Proyecto,
  esquema: EsquemaDeAbastecimiento,
): Proyecto {
  if (esquema === 'directa') {
    return { ...proyecto, configuracionAbastecimiento: { esquema } }
  }

  const base = proyecto.configuracionAbastecimiento
  const configuracion: ConfiguracionDeAbastecimiento = {
    esquema,
    ...(base?.periodoConsumoMaximo_h !== undefined
      ? { periodoConsumoMaximo_h: base.periodoConsumoMaximo_h }
      : {}),
  }
  return { ...proyecto, configuracionAbastecimiento: configuracion }
}

// Fija (número) o quita (`undefined`) el período de consumo máximo `Tc`.
// No aplica clamp ni valida el rango [1, 4] h: eso es responsabilidad de
// validarConfiguracionAbastecimiento / resolverEstadoModulo4 (nunca se
// corrige el dato del usuario en silencio). Exige que M4 ya esté iniciado.
export function conPeriodoConsumoMaximo(
  proyecto: Proyecto,
  periodoConsumoMaximo_h: number | undefined,
): Proyecto {
  const base = proyecto.configuracionAbastecimiento
  if (base === undefined) {
    throw new Error(
      'conPeriodoConsumoMaximo: Módulo 4 no iniciado (no hay configuracionAbastecimiento). Fijar primero el esquema con conEsquemaDeAbastecimiento.',
    )
  }

  if (periodoConsumoMaximo_h === undefined) {
    if (base.periodoConsumoMaximo_h === undefined) {
      return proyecto
    }
    const { periodoConsumoMaximo_h: _descartado, ...resto } = base
    void _descartado
    return { ...proyecto, configuracionAbastecimiento: resto }
  }

  return {
    ...proyecto,
    configuracionAbastecimiento: { ...base, periodoConsumoMaximo_h },
  }
}
