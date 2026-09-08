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
//  - 'directa' no usa Tc ni capacidades de tanque: se descartan
//    `periodoConsumoMaximo_h` y los `volumen*Adoptado_m3` para no
//    arrastrar datos que ese esquema no consume (D-δ.63 §7/§23, D-δ.66 §13).
//  - Entre esquemas con tanque (tanqueElevado ↔ cisternaBombeoElevado) se
//    conservan `periodoConsumoMaximo_h` y ambas capacidades adoptadas: son
//    decisiones del usuario sobre componentes físicos identificados
//    (superior / inferior). El de bombeo simplemente no se usa mientras el
//    esquema sea 'tanqueElevado' (resolverAdopcionDeReserva lo ignora),
//    pero no se poda -- así reaparece si se vuelve a 'cisternaBombeoElevado'.
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
    ...(base?.volumenTanqueElevadoAdoptado_m3 !== undefined
      ? { volumenTanqueElevadoAdoptado_m3: base.volumenTanqueElevadoAdoptado_m3 }
      : {}),
    ...(base?.volumenTanqueBombeoAdoptado_m3 !== undefined
      ? { volumenTanqueBombeoAdoptado_m3: base.volumenTanqueBombeoAdoptado_m3 }
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

// Fija (número) o quita (`undefined`) una capacidad de tanque ADOPTADA, en
// m³ (M4-E / D-δ.66). No aplica clamp ni validación de rango/signo (eso es
// de validarConfiguracionAbastecimiento / resolverAdopcionDeReserva: nunca
// se corrige el dato del usuario en silencio). No exige que el esquema
// actual contenga ese tanque: siempre se puede limpiar un valor
// persistido. Exige que M4 ya esté iniciado.
function conVolumenAdoptado(
  proyecto: Proyecto,
  campo: 'volumenTanqueElevadoAdoptado_m3' | 'volumenTanqueBombeoAdoptado_m3',
  volumen_m3: number | undefined,
): Proyecto {
  const base = proyecto.configuracionAbastecimiento
  if (base === undefined) {
    throw new Error(
      `conVolumenAdoptado (${campo}): Módulo 4 no iniciado (no hay configuracionAbastecimiento). Fijar primero el esquema con conEsquemaDeAbastecimiento.`,
    )
  }

  if (volumen_m3 === undefined) {
    if (base[campo] === undefined) {
      return proyecto
    }
    const { [campo]: _descartado, ...resto } = base
    void _descartado
    return { ...proyecto, configuracionAbastecimiento: resto }
  }

  return { ...proyecto, configuracionAbastecimiento: { ...base, [campo]: volumen_m3 } }
}

// Capacidad adoptada del almacenamiento SUPERIOR (tanqueElevado /
// cisternaBombeoElevado).
export function conVolumenTanqueElevadoAdoptado(
  proyecto: Proyecto,
  volumen_m3: number | undefined,
): Proyecto {
  return conVolumenAdoptado(proyecto, 'volumenTanqueElevadoAdoptado_m3', volumen_m3)
}

// Capacidad adoptada del almacenamiento INFERIOR / cisterna (sólo
// cisternaBombeoElevado).
export function conVolumenTanqueBombeoAdoptado(
  proyecto: Proyecto,
  volumen_m3: number | undefined,
): Proyecto {
  return conVolumenAdoptado(proyecto, 'volumenTanqueBombeoAdoptado_m3', volumen_m3)
}
