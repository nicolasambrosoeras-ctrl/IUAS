// Estado y resultado de Módulo 4 (Reserva), D-δ.63 / D-δ.65 / D-δ.66.
// Primitiva de dominio pura, independiente de UI, que orquesta el cálculo
// de reserva del Proyecto componiendo piezas ya cerradas:
//
//   calcularSimultaneidad              -> Qc global del proyecto (M1, CRIT-A5)
//   resolverPresionDeCalculoDeConexion -> presión de cálculo (§2.7, CRIT-A37)
//   resolverGastoTabla01              -> Qconexión (Tabla N°1 §2.7, CRIT-A36)
//   calcularReservaDiaria             -> Reserva Total Diaria de Diseño (§2.10.2, CRIT-A35)
//   resolverAdopcionDeReserva        -> capacidad adoptada vs requerida (§2.11.3, CRIT-A38)
//
// No reimplementa ninguna fórmula ni regla: compone y clasifica. NO conoce
// React, NO toca RedHidraulica ni M2/M3, NO persiste nada.
//
// M4-D2 (D-δ.65): el Qconexión ya NO entra como boundary externo. Se
// deriva del Proyecto -> presión sobre acera + desnivel firmado de la
// conexión + diámetro nominal de la conexión -> Tabla N°1. La única
// primitiva inferior que sigue recibiendo `qConexion_lps` explícito es
// `calcularReservaDiaria` (por diseño: es una función numérica pura).
//
// Semántica de los cuatro estados:
//
//  - 'noIniciado': no existe `proyecto.configuracionAbastecimiento`.
//
//  - 'error': dato persistido estructuralmente inválido
//    (`configuracionAbastecimiento` con esquema desconocido o Tc fuera de
//    [1, 4] h; `parametros.diametroNominalConexion_m` no admisible como
//    conexión; `parametros.desnivelConexion_m` no finito). Nunca 'error'
//    para un dato AUSENTE.
//
//  - 'incompleto': la configuración es válida pero falta un insumo para
//    evaluar la reserva de un esquema CON TANQUE: Tc, el Qc global de M1,
//    el diámetro de conexión, el desnivel de conexión, o una presión de
//    cálculo dentro del rango de la Tabla N°1. El esquema 'directa' NUNCA
//    cae en 'incompleto'.
//
//  - 'evaluado': el estado de cálculo de M4 está determinado. 'directa'
//    -> `sinReservaPorTanque`. Esquema con tanque -> `reservaCalculada`
//    con la Reserva Total Diaria de Diseño, la traza de conexión (presión
//    de acera -> desnivel -> presión de cálculo -> Tabla N°1 -> Qconexión)
//    y la verificación de la capacidad adoptada (`adopcion`). Incluye el
//    caso `déficit = 0` (Qconexión >= Qc): es una reserva calculada de
//    volumen 0, NO `sinReservaPorTanque`.
//
//    La ADOPCIÓN de tanque NO degrada el estado: un esquema con tanque y
//    reserva calculada queda 'evaluado' aunque no se haya declarado
//    ninguna capacidad (`adopcion.tipo` = 'sinAdopcion' /
//    'adopcionIncompleta'). Separar computabilidad (el cálculo está
//    resuelto) de decisión de proyecto (qué tanque se adopta) -- mismo
//    patrón que Módulo 3 (evaluado ≠ cumple).
//
//    'evaluado' NO significa "cumple normativa" (no verifica §2.8 ni la
//    obligatoriedad de reserva; `adopcion.estado = 'suficiente'` sólo
//    dice que la capacidad adoptada cubre la RTD calculada y, con dos
//    tanques, los mínimos de §2.11.3).
import type { Proyecto } from '../../modelo/proyecto'
import { localesDeUnidadFuncional } from '../tuberias/geometria/resolverCotaHidraulicaDeArtefacto'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import type { TipoProyectoNormativo } from '../../normativa/eras-2023/coeficientes-mayoracion'
import {
  rangoPresionValida_m,
  resolverGastoTabla01,
  type InterpolacionTabla01,
} from '../../normativa/eras-2023/tabla-01-gastos-conexion'
import type { ProblemaValidacion } from '../../validacion/codigos'
import { validarConfiguracionAbastecimiento } from '../../validacion/configuracionAbastecimiento'
import { validarParametrosDeConexion } from '../../validacion/parametrosConexion'
import { calcularSimultaneidad } from '../demanda/simultaneidad/calcularSimultaneidad'
import { calcularReservaDiaria, type ResultadoReservaDiaria } from '../reserva/calcularReservaDiaria'
import { resolverAdopcionDeReserva, type ResultadoAdopcionDeReserva } from './resolverAdopcionDeReserva'
import { resolverPresionDeCalculoDeConexion } from './resolverPresionDeCalculoDeConexion'

// Traza auditable de cómo se obtuvo el Qconexión: presión sobre acera ->
// desnivel firmado -> presión de cálculo -> Tabla N°1 -> gasto.
export type TrazaDeConexionModulo4 = {
  readonly diametroNominal_m: number
  readonly presionSobreAcera_m: number
  readonly desnivelConexion_m: number
  readonly presionCalculo_m: number
  readonly qConexion_lps: number
  readonly interpolacion: InterpolacionTabla01
}

export type ResultadoModulo4 =
  | { readonly tipo: 'sinReservaPorTanque'; readonly esquema: 'directa' }
  | {
      readonly tipo: 'reservaCalculada'
      readonly esquema: 'tanqueElevado' | 'cisternaBombeoElevado'
      readonly conexion: TrazaDeConexionModulo4
      readonly reserva: ResultadoReservaDiaria
      // Verificación de la capacidad ADOPTADA respecto de la reserva
      // calculada (§2.11.3 / CRIT-A38). Es una dimensión adicional del
      // resultado, NO afecta el estado 'evaluado': el cálculo de la
      // reserva puede estar determinado aunque todavía no se haya elegido
      // tanque (`adopcion.tipo` = 'sinAdopcion' / 'adopcionIncompleta').
      readonly adopcion: ResultadoAdopcionDeReserva
    }

export type DiagnosticoErrorModulo4 = {
  readonly tipo: 'problemaDeValidacion'
  readonly problema: ProblemaValidacion
}

export type DiagnosticoIncompletitudModulo4 =
  | { readonly tipo: 'faltaPeriodoConsumoMaximo' }
  | { readonly tipo: 'faltaDiametroConexion' }
  | { readonly tipo: 'faltaDesnivelConexion' }
  | { readonly tipo: 'sinArtefactosComputables' }
  | { readonly tipo: 'qcGlobalIndeterminado'; readonly motivo: string }
  | {
      readonly tipo: 'presionConexionFueraDeTabla'
      readonly presionCalculo_m: number
      readonly rango_m: typeof rangoPresionValida_m
    }

export type EstadoModulo4 =
  | { readonly estado: 'noIniciado' }
  | { readonly estado: 'error'; readonly problemas: readonly DiagnosticoErrorModulo4[] }
  | { readonly estado: 'incompleto'; readonly motivos: readonly DiagnosticoIncompletitudModulo4[] }
  | { readonly estado: 'evaluado'; readonly resultado: ResultadoModulo4 }

export type EntradaEstadoModulo4 = {
  readonly proyecto: Proyecto
  readonly catalogoArtefactos: readonly ArtefactoNormativo[]
  readonly coeficientesMayoracion: readonly TipoProyectoNormativo[]
}

export function resolverEstadoModulo4(entrada: EntradaEstadoModulo4): EstadoModulo4 {
  const { proyecto, catalogoArtefactos, coeficientesMayoracion } = entrada
  const configuracion = proyecto.configuracionAbastecimiento

  if (configuracion === undefined) {
    return { estado: 'noIniciado' }
  }

  // --- 'error': integridad estructural de los datos persistidos primero ---
  const problemasEstructurales = [
    ...validarConfiguracionAbastecimiento(proyecto),
    ...validarParametrosDeConexion(proyecto),
  ]
  if (problemasEstructurales.length > 0) {
    return {
      estado: 'error',
      problemas: problemasEstructurales.map((problema) => ({
        tipo: 'problemaDeValidacion' as const,
        problema,
      })),
    }
  }

  // --- 'directa': la reserva por tanque no aplica; estado determinado ---
  if (configuracion.esquema === 'directa') {
    return { estado: 'evaluado', resultado: { tipo: 'sinReservaPorTanque', esquema: 'directa' } }
  }

  // --- esquemas con tanque: requieren Tc + Qc global + datos de conexión ---
  const motivos: DiagnosticoIncompletitudModulo4[] = []

  const tc_h = configuracion.periodoConsumoMaximo_h
  if (tc_h === undefined) {
    motivos.push({ tipo: 'faltaPeriodoConsumoMaximo' })
  }

  // Qc global del proyecto (CRIT-A5), mismo patrón que resolverEstadoModulo3:
  // se compone el motor de demanda real, nunca se recalcula ni se redondea.
  let qc_lps: number | undefined
  const nComputable = proyecto.unidadesFuncionales
    .flatMap((unidadFuncional) => localesDeUnidadFuncional(unidadFuncional))
    .flatMap((local) => local.artefactos)
    .filter((artefacto) => artefacto.origen === 'normativo')
    .reduce((total, artefacto) => total + artefacto.cantidad, 0)

  if (nComputable === 0) {
    motivos.push({ tipo: 'sinArtefactosComputables' })
  } else {
    const qcGlobal = calcularSimultaneidad({
      proyecto,
      normativa: { catalogoArtefactos, coeficientesMayoracion },
    }).resultados['qc']

    if (qcGlobal === undefined || 'estado' in qcGlobal || qcGlobal.valor <= 0) {
      motivos.push({
        tipo: 'qcGlobalIndeterminado',
        motivo:
          qcGlobal !== undefined && 'estado' in qcGlobal
            ? qcGlobal.motivo
            : 'El Qc global del proyecto no resolvió a un valor positivo.',
      })
    } else {
      qc_lps = qcGlobal.valor
    }
  }

  // Qconexión derivado del Proyecto: presión sobre acera + desnivel firmado
  // -> presión de cálculo (§2.7) -> Tabla N°1.
  const { diametroNominalConexion_m, desnivelConexion_m, presionSobreAcera_m } = proyecto.parametros
  if (diametroNominalConexion_m === undefined) {
    motivos.push({ tipo: 'faltaDiametroConexion' })
  }
  if (desnivelConexion_m === undefined) {
    motivos.push({ tipo: 'faltaDesnivelConexion' })
  }

  let trazaDeConexion: TrazaDeConexionModulo4 | undefined
  if (diametroNominalConexion_m !== undefined && desnivelConexion_m !== undefined) {
    const presionCalculo_m = resolverPresionDeCalculoDeConexion({ presionSobreAcera_m, desnivelConexion_m })
    const gasto = resolverGastoTabla01({ diametroNominal_m: diametroNominalConexion_m, presionCalculo_m })

    if (gasto.estado === 'fueraDeRangoDePresion') {
      motivos.push({ tipo: 'presionConexionFueraDeTabla', presionCalculo_m, rango_m: gasto.rango_m })
    } else if (gasto.estado === 'diametroNoTabulado') {
      // validarParametrosDeConexion ya garantiza un DN admisible (tabulado
      // y >= 0,019 m). Llegar acá sería una inconsistencia interna.
      throw new Error(
        `resolverEstadoModulo4: inconsistencia interna -- diámetro de conexión ${diametroNominalConexion_m} pasó la validación pero no está tabulado en Tabla N°1`,
      )
    } else {
      trazaDeConexion = {
        diametroNominal_m: diametroNominalConexion_m,
        presionSobreAcera_m,
        desnivelConexion_m,
        presionCalculo_m,
        qConexion_lps: gasto.qConexion_lps,
        interpolacion: gasto.interpolacion,
      }
    }
  }

  if (motivos.length > 0) {
    return { estado: 'incompleto', motivos }
  }

  // motivos vacío ⇒ tc_h, qc_lps y trazaDeConexion están definidos por
  // construcción. El guard explícito narra los tipos y captura cualquier
  // inconsistencia interna futura (mismo patrón que resolverEstadoModulo3).
  if (tc_h === undefined || qc_lps === undefined || trazaDeConexion === undefined) {
    throw new Error(
      'resolverEstadoModulo4: inconsistencia interna -- sin motivos de incompletitud pero falta un input de la reserva',
    )
  }

  const reserva = calcularReservaDiaria({
    qc_lps,
    qConexion_lps: trazaDeConexion.qConexion_lps,
    tc_h,
  })
  const adopcion = resolverAdopcionDeReserva({
    esquema: configuracion.esquema,
    volumenReservaRequerido_m3: reserva.volumenReservaDiseno_m3,
    volumenTanqueElevadoAdoptado_m3: configuracion.volumenTanqueElevadoAdoptado_m3,
    volumenTanqueBombeoAdoptado_m3: configuracion.volumenTanqueBombeoAdoptado_m3,
  })
  return {
    estado: 'evaluado',
    resultado: {
      tipo: 'reservaCalculada',
      esquema: configuracion.esquema,
      conexion: trazaDeConexion,
      reserva,
      adopcion,
    },
  }
}
