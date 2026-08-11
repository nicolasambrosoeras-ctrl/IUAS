// Orquestador productivo de pérdida distribuida por Tramo (N3): compone,
// sin recalcular ni reimplementar nada, las capas ya cerradas --
// resolverDiametroComercialDeTramo (Qc/Di mínimo/candidato/velocidad
// real/verificación CRIT-A19), resolverParametroDePerdidaDistribuida
// (C o epsilon segun metodo) y, solo para Darcy, resolverPropiedadesAguaParaRed
// (temperatura/nu por red). Reutiliza velocidadReal_mps tal como lo
// devuelve resolverDiametroComercialDeTramo -- nunca vuelve a llamar
// calcularVelocidad. Hazen y Darcy siguen usando exclusivamente sus
// propias primitivas matemáticas (CRIT-A17/CRIT-A18), sin mezclar
// parámetros de un método en el otro.
import type { Proyecto } from '../../modelo/proyecto'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import { resolverDiametroComercialDeTramo } from './resolverDiametroComercialDeTramo'
import type { SistemaDeTuberiaCatalogado } from './sistemaDeTuberia'
import type { MaterialTuberia } from './materialTuberia'
import type { EntradaCatalogoTuberia } from './diametroComercial/obtenerCandidatosDeDiametroComercial'
import type { ResultadoVerificacionVelocidad } from './velocidad/verificarVelocidadAdmisible'
import { resolverParametroDePerdidaDistribuida } from './perdidaCarga/resolverParametroDePerdidaDistribuida'
import {
  calcularPerdidaCargaUnitariaHazenWilliams,
  calcularPerdidaCargaHazenWilliams,
} from './perdidaCarga/calcularPerdidaCargaHazenWilliams'
import { calcularNumeroReynolds } from './perdidaCarga/darcyWeisbach/calcularNumeroReynolds'
import { calcularFactorFriccionDarcy, UMBRAL_REYNOLDS_TURBULENTO } from './perdidaCarga/darcyWeisbach/calcularFactorFriccionDarcy'
import { calcularPerdidaCargaDarcyWeisbach } from './perdidaCarga/darcyWeisbach/calcularPerdidaCargaDarcyWeisbach'
import { resolverPropiedadesAguaParaRed } from './perdidaCarga/darcyWeisbach/propiedadesAguaDarcy'

export type ResultadoPerdidaDistribuidaDeTramo =
  | {
      readonly tipo: 'sinDemanda'
      readonly qc_lps: 0
    }
  | {
      readonly tipo: 'sinCandidatoSuficiente'
      readonly qc_lps: number
      readonly diMinimo_mm: number
    }
  | {
      readonly tipo: 'sinLongitud'
      readonly qc_lps: number
      readonly diMinimo_mm: number
      readonly candidato: EntradaCatalogoTuberia
      readonly velocidadReal_mps: number
      readonly verificacionVelocidad: ResultadoVerificacionVelocidad
    }
  | {
      // Solo alcanzable con metodoPerdidaDistribuida='darcyWeisbach': Hazen
      // (CRIT-A17) no tiene concepto de régimen turbulento/Reynolds.
      readonly tipo: 'fueraDeDominioTurbulento'
      readonly qc_lps: number
      readonly diMinimo_mm: number
      readonly candidato: EntradaCatalogoTuberia
      readonly velocidadReal_mps: number
      readonly verificacionVelocidad: ResultadoVerificacionVelocidad
      readonly longitud_m: number
      readonly reynolds: number
      readonly temperaturaReferencia_C: number
      readonly viscosidadCinematica_m2s: number
    }
  | {
      readonly tipo: 'conPerdidaDistribuida'
      readonly qc_lps: number
      readonly diMinimo_mm: number
      readonly candidato: EntradaCatalogoTuberia
      readonly velocidadReal_mps: number
      readonly verificacionVelocidad: ResultadoVerificacionVelocidad
      readonly longitud_m: number
      readonly hf_m: number
      readonly detalle:
        | {
            readonly metodo: 'hazenWilliams'
            readonly coeficienteC: number
            readonly perdidaUnitaria_J_m_m: number
          }
        | {
            readonly metodo: 'darcyWeisbach'
            readonly rugosidadAbsoluta_mm: number
            readonly temperaturaReferencia_C: number
            readonly viscosidadCinematica_m2s: number
            readonly reynolds: number
            readonly factorFriccion: number
          }
    }

export function resolverPerdidaDistribuidaDeTramo(
  proyecto: Proyecto,
  tramoId: string,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  catalogoSistemasDeTuberia: readonly SistemaDeTuberiaCatalogado[],
  catalogoMateriales: readonly MaterialTuberia[],
): ResultadoPerdidaDistribuidaDeTramo {
  const resultadoComercial = resolverDiametroComercialDeTramo(
    proyecto,
    tramoId,
    catalogoArtefactos,
    catalogoSistemasDeTuberia,
  )

  if (resultadoComercial.tipo === 'sinDemanda') {
    return { tipo: 'sinDemanda', qc_lps: 0 }
  }

  if (resultadoComercial.tipo === 'sinCandidatoSuficiente') {
    return {
      tipo: 'sinCandidatoSuficiente',
      qc_lps: resultadoComercial.qc_lps,
      diMinimo_mm: resultadoComercial.diMinimo_mm,
    }
  }

  const { qc_lps, diMinimo_mm, candidato, velocidadReal_mps, verificacionVelocidad } = resultadoComercial

  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    // Inalcanzable en la practica: resolverDiametroComercialDeTramo ya
    // llamó a resolverHidraulicaDeTramo, que ya lanzó si redHidraulica
    // fuera undefined. Chequeo necesario únicamente para el angostamiento
    // de tipos de TypeScript en la búsqueda siguiente.
    throw new Error('resolverPerdidaDistribuidaDeTramo requiere un proyecto con redHidraulica definida')
  }

  const tramo = redHidraulica.tramos.find((candidatoTramo) => candidatoTramo.id === tramoId)
  if (tramo === undefined) {
    // Inalcanzable en la práctica: resolverDiametroComercialDeTramo ya
    // resolvió exitosamente sobre este tramoId.
    throw new Error(`resolverPerdidaDistribuidaDeTramo: no existe ningún tramo con id "${tramoId}"`)
  }

  if (tramo.longitud_m === undefined) {
    return { tipo: 'sinLongitud', qc_lps, diMinimo_mm, candidato, velocidadReal_mps, verificacionVelocidad }
  }
  const { longitud_m } = tramo

  const parametro = resolverParametroDePerdidaDistribuida(proyecto, catalogoMateriales)

  if (parametro.metodo === 'hazenWilliams') {
    const perdidaUnitaria_J_m_m = calcularPerdidaCargaUnitariaHazenWilliams(
      qc_lps,
      parametro.coeficienteC,
      candidato.diametroInteriorEfectivo_mm,
    )
    const hf_m = calcularPerdidaCargaHazenWilliams(perdidaUnitaria_J_m_m, longitud_m)

    return {
      tipo: 'conPerdidaDistribuida',
      qc_lps,
      diMinimo_mm,
      candidato,
      velocidadReal_mps,
      verificacionVelocidad,
      longitud_m,
      hf_m,
      detalle: { metodo: 'hazenWilliams', coeficienteC: parametro.coeficienteC, perdidaUnitaria_J_m_m },
    }
  }

  const propiedadesAgua = resolverPropiedadesAguaParaRed(tramo.red)
  const reynolds = calcularNumeroReynolds(
    velocidadReal_mps,
    candidato.diametroInteriorEfectivo_mm,
    propiedadesAgua.viscosidadCinematica_m2s,
  )

  if (reynolds < UMBRAL_REYNOLDS_TURBULENTO) {
    return {
      tipo: 'fueraDeDominioTurbulento',
      qc_lps,
      diMinimo_mm,
      candidato,
      velocidadReal_mps,
      verificacionVelocidad,
      longitud_m,
      reynolds,
      temperaturaReferencia_C: propiedadesAgua.temperaturaReferencia_C,
      viscosidadCinematica_m2s: propiedadesAgua.viscosidadCinematica_m2s,
    }
  }

  const factorFriccion = calcularFactorFriccionDarcy(reynolds, parametro.rugosidadAbsoluta_mm, candidato.diametroInteriorEfectivo_mm)
  const hf_m = calcularPerdidaCargaDarcyWeisbach(factorFriccion, longitud_m, candidato.diametroInteriorEfectivo_mm, velocidadReal_mps)

  return {
    tipo: 'conPerdidaDistribuida',
    qc_lps,
    diMinimo_mm,
    candidato,
    velocidadReal_mps,
    verificacionVelocidad,
    longitud_m,
    hf_m,
    detalle: {
      metodo: 'darcyWeisbach',
      rugosidadAbsoluta_mm: parametro.rugosidadAbsoluta_mm,
      temperaturaReferencia_C: propiedadesAgua.temperaturaReferencia_C,
      viscosidadCinematica_m2s: propiedadesAgua.viscosidadCinematica_m2s,
      reynolds,
      factorFriccion,
    },
  }
}
