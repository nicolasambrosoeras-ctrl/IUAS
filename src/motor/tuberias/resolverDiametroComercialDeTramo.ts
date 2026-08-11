// Orquestador de selección de diámetro comercial por Tramo (N1): compone
// Qc/Di mínimo ya resueltos por resolverHidraulicaDeTramo con el sistema
// comercial adoptado por el Proyecto -- primer candidato suficiente,
// velocidad real y verificación CRIT-A19. No reimplementa ninguna
// fórmula: solo encadena primitivas ya productivas y testeadas
// (obtenerCandidatosDeDiametroComercial, calcularVelocidad,
// verificarVelocidadAdmisible). Selección automática, sin override
// manual ni persistencia por Tramo -- el diámetro se deriva
// determinísticamente en cada llamada. No calcula todavía pérdida
// distribuida (hf): eso queda para un incremento posterior.
import type { Proyecto } from '../../modelo/proyecto'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import { resolverHidraulicaDeTramo } from './resolverHidraulicaDeTramo'
import { obtenerSistemaDeTuberia, type SistemaDeTuberiaCatalogado } from './sistemaDeTuberia'
import { obtenerCandidatosDeDiametroComercial, type EntradaCatalogoTuberia } from './diametroComercial/obtenerCandidatosDeDiametroComercial'
import { calcularVelocidad } from './perdidaCarga/darcyWeisbach/calcularVelocidad'
import { verificarVelocidadAdmisible, type ResultadoVerificacionVelocidad } from './velocidad/verificarVelocidadAdmisible'

export type ResultadoDiametroComercialDeTramo =
  | {
      readonly tipo: 'sinDemanda'
    }
  | {
      readonly tipo: 'conCandidato'
      readonly candidato: EntradaCatalogoTuberia
      readonly velocidadReal_mps: number
      readonly verificacionVelocidad: ResultadoVerificacionVelocidad
    }
  | {
      readonly tipo: 'sinCandidatoSuficiente'
      readonly diMinimo_mm: number
    }

export function resolverDiametroComercialDeTramo(
  proyecto: Proyecto,
  tramoId: string,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  catalogoSistemasDeTuberia: readonly SistemaDeTuberiaCatalogado[],
): ResultadoDiametroComercialDeTramo {
  const resultadoHidraulico = resolverHidraulicaDeTramo(proyecto, tramoId, catalogoArtefactos)

  if (resultadoHidraulico.tipo === 'sinDemanda') {
    return { tipo: 'sinDemanda' }
  }

  const sistema = obtenerSistemaDeTuberia(proyecto.configuracionHidraulica.sistemaDeTuberiaId, catalogoSistemasDeTuberia)
  const { di_min_mm } = resultadoHidraulico.predimensionamiento

  const candidatos = obtenerCandidatosDeDiametroComercial(di_min_mm, sistema)

  if (candidatos.length === 0) {
    return { tipo: 'sinCandidatoSuficiente', diMinimo_mm: di_min_mm }
  }

  const candidato = candidatos[0]!
  const velocidadReal_mps = calcularVelocidad(resultadoHidraulico.qc_lps, candidato.diametroInteriorEfectivo_mm)
  const verificacionVelocidad = verificarVelocidadAdmisible(velocidadReal_mps, candidato.diametroInteriorEfectivo_mm)

  return { tipo: 'conCandidato', candidato, velocidadReal_mps, verificacionVelocidad }
}
