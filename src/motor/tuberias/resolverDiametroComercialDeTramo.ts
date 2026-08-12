// Orquestador de selección de diámetro comercial por Tramo (CRIT-A23,
// Correctivo 2A): compone Qc ya resuelto por resolverHidraulicaDeTramo
// con el sistema comercial adoptado por el Proyecto -- recorre el
// catálogo comercial completo por diámetro interior efectivo creciente y
// elige el PRIMER candidato cuya velocidad real resulte 'admisible'
// según CRIT-A19. El Di de predimensionamiento (Ve=2,0 m/s, CRIT-A16) ya
// NO funciona como filtro de admisión -- se propaga únicamente como
// referencia informativa (diReferenciaPredimensionamiento_mm), sin
// intervenir en la selección. No reimplementa ninguna fórmula: solo
// encadena primitivas ya productivas y testeadas
// (obtenerEntradasOrdenadasPorDiametroInterior, calcularVelocidad,
// verificarVelocidadAdmisible). Selección automática, sin override
// manual ni persistencia por Tramo -- el diámetro se deriva
// determinísticamente en cada llamada. No calcula todavía pérdida
// distribuida (hf): eso queda para un incremento posterior.
// Propaga qc_lps/diReferenciaPredimensionamiento_mm en las tres
// variantes (N3): ya se conocen internamente (vienen de
// resultadoHidraulico, sin recalcular nada) y un consumidor de nivel
// superior (resolverPerdidaDistribuidaDeTramo) los necesita sin tener
// que volver a llamar resolverHidraulicaDeTramo.
import type { Proyecto } from '../../modelo/proyecto'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import { resolverHidraulicaDeTramo } from './resolverHidraulicaDeTramo'
import { obtenerSistemaDeTuberia, type SistemaDeTuberiaCatalogado } from './sistemaDeTuberia'
import type { EntradaCatalogoTuberia } from './diametroComercial/obtenerCandidatosDeDiametroComercial'
import { obtenerEntradasOrdenadasPorDiametroInterior } from './diametroComercial/obtenerEntradasOrdenadasPorDiametroInterior'
import { calcularVelocidad } from './perdidaCarga/darcyWeisbach/calcularVelocidad'
import { verificarVelocidadAdmisible, type ResultadoVerificacionVelocidad } from './velocidad/verificarVelocidadAdmisible'

export type ResultadoDiametroComercialDeTramo =
  | {
      readonly tipo: 'sinDemanda'
      readonly qc_lps: 0
    }
  | {
      readonly tipo: 'conCandidato'
      readonly qc_lps: number
      readonly diReferenciaPredimensionamiento_mm: number
      readonly candidato: EntradaCatalogoTuberia
      readonly velocidadReal_mps: number
      // Por construcción, siempre 'admisible' -- se conserva completo
      // como evidencia auditable de CRIT-A19 (límites aplicados), no
      // como dato redundante.
      readonly verificacionVelocidad: ResultadoVerificacionVelocidad
    }
  | {
      readonly tipo: 'sinCandidatoAdmisible'
      readonly qc_lps: number
      readonly diReferenciaPredimensionamiento_mm: number
    }

export function resolverDiametroComercialDeTramo(
  proyecto: Proyecto,
  tramoId: string,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  catalogoSistemasDeTuberia: readonly SistemaDeTuberiaCatalogado[],
): ResultadoDiametroComercialDeTramo {
  const resultadoHidraulico = resolverHidraulicaDeTramo(proyecto, tramoId, catalogoArtefactos)

  if (resultadoHidraulico.tipo === 'sinDemanda') {
    return { tipo: 'sinDemanda', qc_lps: 0 }
  }

  const sistema = obtenerSistemaDeTuberia(proyecto.configuracionHidraulica.sistemaDeTuberiaId, catalogoSistemasDeTuberia)
  const { qc_lps } = resultadoHidraulico
  const diReferenciaPredimensionamiento_mm = resultadoHidraulico.predimensionamiento.di_min_mm

  // CRIT-A23: recorrer el catálogo completo por Di efectivo creciente y
  // verificar la velocidad real de cada candidato contra el rango que su
  // propio Di determina (CRIT-A19) -- sin suponer de antemano si el
  // diámetro será chico o grande, evitando la circularidad de fijar una
  // Ve antes de conocer el diámetro. noAdmisible y fueraDeDominioNormativo
  // se descartan y la búsqueda continúa (p. ej. el hueco 60–75mm).
  const entradasOrdenadas = obtenerEntradasOrdenadasPorDiametroInterior(sistema)

  for (const candidato of entradasOrdenadas) {
    const velocidadReal_mps = calcularVelocidad(qc_lps, candidato.diametroInteriorEfectivo_mm)
    const verificacionVelocidad = verificarVelocidadAdmisible(velocidadReal_mps, candidato.diametroInteriorEfectivo_mm)

    if (verificacionVelocidad.tipo === 'admisible') {
      return {
        tipo: 'conCandidato',
        qc_lps,
        diReferenciaPredimensionamiento_mm,
        candidato,
        velocidadReal_mps,
        verificacionVelocidad,
      }
    }
  }

  // Recorrido completo sin ningún candidato admisible: resultado
  // hidráulico/comercial legítimo (catálogo demasiado rápido, demasiado
  // lento, o un salto comercial que salta por encima del rango
  // admisible) -- nunca throw, nunca se extrapola ni se elige el más
  // cercano.
  return { tipo: 'sinCandidatoAdmisible', qc_lps, diReferenciaPredimensionamiento_mm }
}
