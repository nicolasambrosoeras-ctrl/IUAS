// M4-B — Motor puro de la Reserva Total Diaria de Diseño (ERAS-2023
// §2.10.2, "Alimentación por tanques y determinación del Volumen de
// Reserva Diaria"; §2.11.1/§2.11.2 remiten a la misma secuencia de
// cálculo). Formalizado como CRIT-A35.
//
// Método normativo (balance de caudales): si el caudal que la operadora
// otorga en la conexión (`qConexion_lps`) es menor al caudal de cálculo
// del proyecto `Qc` (M1, CRIT-A5), aparece un déficit de caudal
//
//     Dc = max(0, Qc − Qconexión)
//
// que hay que cubrir con reserva acumulada durante el período de consumo
// máximo `Tc`. La Guía deja `Tc` a criterio del proyectista, acotado a
//
//     1 h ≤ Tc ≤ 4 h
//
// según las características de la instalación. El volumen de reserva de
// diseño es
//
//     VReservaDiseño = Dc[m³/h] · Tc[h]        (con Dc[m³/h] = Dc[l/s] · 3,6)
//
// Verificado contra los ejemplos oficiales (Tabla N°3 y Tabla N°4 de la
// Guía, ver CASOS-GOLDEN.md G3/G4): Qc=0,71 l/s, Qconexión=0,60 l/s,
// Tc=2 h → 0,77 m³; Qc≈1,96 l/s, Qconexión≈1,18 l/s, Tc=1 h → ≈2,82 m³.
//
// Lo que este motor NO hace (decisiones ya cerradas en D-δ.61):
//  - `Tc` es el período de CONSUMO MÁXIMO, no un tiempo de llenado.
//  - NO estima población ni usa dotación per cápita (§2.9.1.1 es consumo
//    de conjunto urbano, no reserva domiciliaria); NO multiplica Qc por
//    24 h; NO aplica ninguna regla de "24 horas completas de consumo".
//  - NO redondea `Qc`/`Dc` antes de calcular el volumen: recibe el `Qc`
//    real aguas arriba y opera sin redondeo intermedio (el redondeo es de
//    presentación). Las diferencias aparentes de las tablas oficiales
//    provienen de su redondeo de presentación.
//  - `qConexion_lps` entra como INPUT EXPLÍCITO. Su fuente futura es la
//    Tabla N°1 (§2.7, `normativa/eras-2023/tabla-01-gastos-conexion`) por
//    diámetro de conexión + presión disponible, más la interpolación
//    lineal ya declarada en esa tabla. Hoy el modelo no persiste diámetro
//    de conexión, así que la derivación queda para un slice posterior
//    (ver D-δ.61/D-δ.62 en PENDIENTES-DE-ARQUITECTURA.md).
//  - `Qconexión ≥ Qc` ⇒ `Dc = 0` ⇒ volumen 0. Es un resultado
//    matemático determinado, NO un error, y NO equivale por sí solo a
//    "tanque no requerido": la obligación de reserva puede surgir de §2.8
//    con independencia del déficit. Esa obligación (y el eventual reparto
//    entre tanque de bombeo y de reserva, §2.11.3) es de un slice
//    posterior; este motor sólo produce el volumen requerido por déficit.
//  - NO decide volumen adoptado / "a ejecutar" ni catálogo comercial de
//    tanques: la Guía muestra 0,77 m³ → 1,00 m³ sin enunciar una regla
//    general de redondeo comercial.
//
// Primitiva pura: no conoce `Proyecto`, `RedHidraulica` ni ningún
// catálogo. La composición con M1 (obtener `Qc`) y la clasificación de
// estado del módulo son de M4-C.

/** Factor de conversión de l/s a m³/h: 1 l/s · 3600 s/h / 1000 l/m³ = 3,6. */
export const LPS_A_M3H = 3.6 as const

/** Cotas del período de consumo máximo `Tc` que fija ERAS §2.10.2 (horas). */
export const TC_MIN_H = 1 as const
export const TC_MAX_H = 4 as const

export type EntradaReservaDiaria = {
  /** Caudal de cálculo del proyecto `Qc`, en l/s (M1, CRIT-A5). Sin redondear. */
  readonly qc_lps: number
  /** Caudal otorgado por la operadora en la conexión, en l/s. */
  readonly qConexion_lps: number
  /** Período de consumo máximo adoptado por el proyectista, en horas (1 a 4). */
  readonly tc_h: number
}

export type ResultadoReservaDiaria = {
  readonly qc_lps: number
  readonly qConexion_lps: number
  /** Déficit de caudal `Dc = max(0, Qc − Qconexión)`, en l/s. */
  readonly deficit_lps: number
  /** Mismo déficit expresado en m³/h (`deficit_lps · 3,6`). */
  readonly deficit_m3h: number
  readonly tc_h: number
  /** Reserva Total Diaria de Diseño `Dc[m³/h] · Tc[h]`, en m³. */
  readonly volumenReservaDiseno_m3: number
}

export function calcularReservaDiaria(entrada: EntradaReservaDiaria): ResultadoReservaDiaria {
  const { qc_lps, qConexion_lps, tc_h } = entrada

  if (!Number.isFinite(qc_lps) || qc_lps < 0) {
    throw new Error(`calcularReservaDiaria: qc_lps debe ser un número finito >= 0 (recibido: ${qc_lps})`)
  }
  if (!Number.isFinite(qConexion_lps) || qConexion_lps < 0) {
    throw new Error(
      `calcularReservaDiaria: qConexion_lps debe ser un número finito >= 0 (recibido: ${qConexion_lps})`,
    )
  }
  if (!Number.isFinite(tc_h) || tc_h < TC_MIN_H || tc_h > TC_MAX_H) {
    throw new Error(
      `calcularReservaDiaria: tc_h debe estar entre ${TC_MIN_H} y ${TC_MAX_H} horas (recibido: ${tc_h})`,
    )
  }

  const deficit_lps = Math.max(0, qc_lps - qConexion_lps)
  const deficit_m3h = deficit_lps * LPS_A_M3H
  const volumenReservaDiseno_m3 = deficit_m3h * tc_h

  return { qc_lps, qConexion_lps, deficit_lps, deficit_m3h, tc_h, volumenReservaDiseno_m3 }
}
