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
//
// D-delta.27: excepción acotada a Vmin (Vmax permanece dura, sin
// cambios). Cuando el menor diámetro comercial normativamente evaluable
// (primer candidato cuyo verificarVelocidadAdmisible no resulta
// 'fueraDeDominioNormativo') ya incumple Vmin, ningún diámetro mayor
// puede corregirlo -- V decrece monótonamente con D a Qc fijo (CRIT-A19
// §6) -- así que ese candidato se adopta igual como 'conCandidato', con
// velocidadPorDebajoDelMinimo=true. Ya NO es cierto que 'conCandidato'
// implique verificacionVelocidad.tipo==='admisible': se conserva el
// resultado real de la primitiva (puede ser 'noAdmisible') como
// evidencia auditable de por qué se activó el fallback.
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
      readonly n: number
      readonly diReferenciaPredimensionamiento_mm: number
      readonly candidato: EntradaCatalogoTuberia
      readonly velocidadReal_mps: number
      // Ya NO es siempre 'admisible' (D-delta.27): en el fallback de Vmin
      // conserva el resultado real 'noAdmisible' de la primitiva, como
      // evidencia auditable de por qué se activó velocidadPorDebajoDelMinimo.
      // Fuera de ese fallback, sigue siendo siempre 'admisible' -- Vmax
      // permanece como condición dura sin excepciones.
      readonly verificacionVelocidad: ResultadoVerificacionVelocidad
      // D-delta.27: true únicamente cuando este candidato es el menor
      // diámetro comercial normativamente evaluable y fue adoptado pese a
      // incumplir Vmin (ningún diámetro mayor podía corregirlo). false en
      // la selección normal dentro de rango.
      readonly velocidadPorDebajoDelMinimo: boolean
    }
  | {
      readonly tipo: 'sinCandidatoAdmisible'
      readonly qc_lps: number
      readonly n: number
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
  const { n } = resultadoHidraulico.simultaneidad
  const diReferenciaPredimensionamiento_mm = resultadoHidraulico.predimensionamiento.diReferenciaPredimensionamiento_mm

  // CRIT-A23: recorrer el catálogo completo por Di efectivo creciente y
  // verificar la velocidad real de cada candidato contra el rango que su
  // propio Di determina (CRIT-A19) -- sin suponer de antemano si el
  // diámetro será chico o grande, evitando la circularidad de fijar una
  // Ve antes de conocer el diámetro. noAdmisible y fueraDeDominioNormativo
  // se descartan y la búsqueda continúa (p. ej. el hueco 60–75mm).
  const entradasOrdenadas = obtenerEntradasOrdenadasPorDiametroInterior(sistema)

  // D-delta.27: candidato de fallback, capturado únicamente si el
  // PRIMER candidato normativamente evaluable (el menor Di que no resulta
  // 'fueraDeDominioNormativo') incumple específicamente por defecto de
  // velocidad (V<Vmin). Ningún candidato posterior puede activarlo: solo
  // importa el primero, exactamente "el menor diámetro comercial
  // normativamente evaluable" -- no "el primero que falle por Vmin".
  let primerCandidatoNormativoEvaluado = false
  let candidatoFallbackPorDebajoDelMinimo:
    | { candidato: EntradaCatalogoTuberia; velocidadReal_mps: number; verificacionVelocidad: ResultadoVerificacionVelocidad }
    | undefined

  for (const candidato of entradasOrdenadas) {
    const velocidadReal_mps = calcularVelocidad(qc_lps, candidato.diametroInteriorEfectivo_mm)
    const verificacionVelocidad = verificarVelocidadAdmisible(velocidadReal_mps, candidato.diametroInteriorEfectivo_mm)

    if (verificacionVelocidad.tipo === 'admisible') {
      return {
        tipo: 'conCandidato',
        qc_lps,
        n,
        diReferenciaPredimensionamiento_mm,
        candidato,
        velocidadReal_mps,
        verificacionVelocidad,
        velocidadPorDebajoDelMinimo: false,
      }
    }

    if (!primerCandidatoNormativoEvaluado && verificacionVelocidad.tipo !== 'fueraDeDominioNormativo') {
      primerCandidatoNormativoEvaluado = true
      // Vmax (velocidad excesiva) sigue siendo condición dura sin
      // excepción: solo el defecto de Vmin activa el fallback de D-delta.27.
      if (velocidadReal_mps < verificacionVelocidad.limiteMinimo_mps) {
        candidatoFallbackPorDebajoDelMinimo = { candidato, velocidadReal_mps, verificacionVelocidad }
      }
    }
  }

  if (candidatoFallbackPorDebajoDelMinimo !== undefined) {
    const { candidato, velocidadReal_mps, verificacionVelocidad } = candidatoFallbackPorDebajoDelMinimo
    return {
      tipo: 'conCandidato',
      qc_lps,
      n,
      diReferenciaPredimensionamiento_mm,
      candidato,
      velocidadReal_mps,
      verificacionVelocidad,
      velocidadPorDebajoDelMinimo: true,
    }
  }

  // Recorrido completo sin ningún candidato admisible y sin fallback de
  // D-delta.27 aplicable: exceso de Vmax (Qc alto) o ningún candidato en
  // dominio normativo -- resultado hidráulico/comercial legítimo, nunca
  // throw, nunca se extrapola ni se elige el más cercano.
  return { tipo: 'sinCandidatoAdmisible', qc_lps, n, diReferenciaPredimensionamiento_mm }
}
