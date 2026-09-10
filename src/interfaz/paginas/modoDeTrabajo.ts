// MODE-UX-01 (D-δ.89): "Modo de trabajo" (Rápido / Profesional) es una
// decisión de PRODUCTO/UX EXPLÍCITA del usuario -- `Proyecto.modoTrabajo`.
//
// Hasta D-δ.51 el modo se DERIVABA de dos ejes de `ConfiguracionHidraulica`
// (granularidad + metodoPerdidaLocalizada): sólo `simplificada + estimado`
// era "Rápido", sólo `profesional + detallado` era "Profesional", el resto
// "Avanzado". Eso acoplaba el modo al detalle de cálculo: un proyectista en
// Profesional que elegía Hazen + Estimadas + Simplificada era reclasificado
// como Rápido. MODE-UX-01 rompe ese acople:
//
//   RÁPIDO       -- menos decisiones, interfaz reducida, preset seguro.
//   PROFESIONAL  -- controles avanzados DISPONIBLES. NO implica "máximo
//                   detalle": Profesional arranca en el MISMO preset de
//                   ejes que Rápido (Hazen + Estimadas + Simplificada) y una
//                   misma combinación hidráulica puede vivir en cualquiera
//                   de los dos modos. Cambiar un control hidráulico estando
//                   en Profesional NO vuelve a tocar el modo.
//
// El modo NO decide ningún resultado hidráulico -- eso sale íntegro de
// `configuracionHidraulica` (fuente de verdad de la config ACTIVA). El modo
// sólo decide la experiencia, qué controles se ofrecen, y qué preset se
// aplica AL CAMBIAR de modo.
import type { ConfiguracionHidraulica, ModoDeTrabajo, Proyecto } from '../../modelo/proyecto'
import { catalogoSistemasDeTuberia } from '../../motor/tuberias/sistemaDeTuberia'
import {
  conGranularidadHidraulica,
  conMetodoPerdidaDistribuida,
  conMetodoPerdidaLocalizada,
} from './actualizarConfiguracionHidraulica'
import { backfillLongitudesDePredimensionamiento } from './backfillLongitudesDePredimensionamiento'

export type { ModoDeTrabajo }

// SÓLO compatibilidad legacy: un Proyecto guardado ANTES de MODE-UX-01 no
// tiene `modoTrabajo`. Se resuelve una única vez por la semántica histórica
// de D-δ.51, colapsada a dos estados: el par exacto Rápido (simplificada +
// estimadas) -> 'rapido'; cualquier otra cosa (incluido el antiguo
// 'avanzado', que siempre tenía controles avanzados en juego) ->
// 'profesional'. Ambigüedad ACEPTADA (§8): un proyecto legacy con
// Hazen + Estimadas + Simplificada se clasifica 'rapido' aunque el
// proyectista lo considerara Profesional -- ese proyecto no guardó esa
// intención. Desde MODE-UX-01, todo proyecto nuevo la guarda explícita.
export function inferirModoDeTrabajoLegacy(configuracion: ConfiguracionHidraulica): ModoDeTrabajo {
  const { granularidadHidraulica, metodoPerdidaLocalizada } = configuracion
  return granularidadHidraulica === 'simplificada' && metodoPerdidaLocalizada === 'estimado'
    ? 'rapido'
    : 'profesional'
}

// Fuente de verdad del modo efectivo del proyecto: el campo EXPLÍCITO si
// existe; si no (sólo proyectos legacy), la inferencia histórica una vez.
// Nunca infiere para proyectos nuevos -- todos traen `modoTrabajo`.
export function resolverModoDeTrabajo(proyecto: Proyecto): ModoDeTrabajo {
  return proyecto.modoTrabajo ?? inferirModoDeTrabajoLegacy(proyecto.configuracionHidraulica)
}

export const ETIQUETA_MODO_DE_TRABAJO: Readonly<Record<ModoDeTrabajo, string>> = {
  rapido: 'Rápido',
  profesional: 'Profesional',
}

// Sistema PPR por defecto: el catálogo comercial tiene hoy un único
// sistema (Acqua System Magnum PN20, PPR). Se resuelve por material, no
// por id literal, para no romper si el catálogo crece.
function sistemaPprPorDefecto(): string | undefined {
  return catalogoSistemasDeTuberia.find((sistema) => sistema.materialTuberiaId === 'ppr')?.id
}

// Los TRES ejes de cálculo del preset inicial -- compartidos por Rápido y
// por el ARRANQUE de Profesional (§12/§13, DECISIÓN CERRADA:
// Hazen-Williams + Estimadas + Simplificada). Que Rápido y el arranque de
// Profesional coincidan en v1 NO significa que modo y configuración sean lo
// mismo: el modo es explícito y una misma combinación puede vivir en
// ambos. `materialTuberiaId` / `sistemaDeTuberiaId` NO están acá -- son
// ortogonales al modo y se preservan tal cual.
type EjesInicialesDeConfiguracion = Pick<
  ConfiguracionHidraulica,
  'metodoPerdidaDistribuida' | 'metodoPerdidaLocalizada' | 'granularidadHidraulica'
>

export const PRESET_EJES_INICIALES: Readonly<EjesInicialesDeConfiguracion> = {
  metodoPerdidaDistribuida: 'hazenWilliams',
  metodoPerdidaLocalizada: 'estimado',
  granularidadHidraulica: 'simplificada',
}

// Aplica los tres ejes del preset inicial sobre la config activa, sin tocar
// material/sistema ni ningún otro campo del Proyecto.
function conEjesInicialesDeConfiguracion(proyecto: Proyecto): Proyecto {
  let resultado = conMetodoPerdidaDistribuida(proyecto, PRESET_EJES_INICIALES.metodoPerdidaDistribuida)
  resultado = conMetodoPerdidaLocalizada(resultado, PRESET_EJES_INICIALES.metodoPerdidaLocalizada)
  resultado = conGranularidadHidraulica(resultado, PRESET_EJES_INICIALES.granularidadHidraulica)
  return resultado
}

// Rápido: si VENÍAMOS de Profesional, guarda un SNAPSHOT de la config
// activa en `ultimaConfiguracionProfesional` para poder restaurarla al
// volver (§9 Caso E, §11). Fija `modoTrabajo = 'rapido'` y aplica el preset
// de ejes seguros. NO toca material/sistema. Backfill NO destructivo de
// longitudes `undefined` (una longitud ya cargada se respeta).
export function aplicarModoRapido(proyecto: Proyecto): Proyecto {
  const veniaDeProfesional = resolverModoDeTrabajo(proyecto) === 'profesional'
  const conSnapshot: Proyecto = veniaDeProfesional
    ? { ...proyecto, ultimaConfiguracionProfesional: proyecto.configuracionHidraulica }
    : proyecto
  const conModo: Proyecto = { ...conSnapshot, modoTrabajo: 'rapido' }
  return backfillLongitudesDePredimensionamiento(conEjesInicialesDeConfiguracion(conModo))
}

// Profesional: fija `modoTrabajo = 'profesional'`.
//  - Si YA estábamos en Profesional (clic idempotente / re-entrada): sólo
//    asegura el campo, NO re-restaura el snapshot sobre ediciones vivas.
//  - Si entramos DESDE Rápido y hay snapshot de una sesión Profesional
//    previa: lo RESTAURA como config activa (§9 Caso E).
//  - Si entramos desde Rápido sin snapshot: arranca en el preset inicial
//    aprobado (§12). El resultado hidráulico inicial puede ser IDÉNTICO al
//    de Rápido -- la diferencia es la disponibilidad de controles.
// Backfill NO destructivo.
export function aplicarModoProfesional(proyecto: Proyecto): Proyecto {
  if (resolverModoDeTrabajo(proyecto) === 'profesional') {
    return proyecto.modoTrabajo === 'profesional' ? proyecto : { ...proyecto, modoTrabajo: 'profesional' }
  }
  const conModo: Proyecto = { ...proyecto, modoTrabajo: 'profesional' }
  const conConfig: Proyecto = conModo.ultimaConfiguracionProfesional
    ? { ...conModo, configuracionHidraulica: conModo.ultimaConfiguracionProfesional }
    : conEjesInicialesDeConfiguracion(conModo)
  return backfillLongitudesDePredimensionamiento(conConfig)
}

// Se exporta para el punto de creación del proyecto (proyectoInicial) y
// para tests: qué sistema PPR adoptar si hiciera falta.
export { sistemaPprPorDefecto }
