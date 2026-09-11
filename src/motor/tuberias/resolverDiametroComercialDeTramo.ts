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
import type { ContextoDeCalculoM2 } from './contextoDeCalculoM2'
import {
  registrarSolicitudDiametroComercialDeTramo,
  registrarCalculoDiametroComercialDeTramo,
} from './topologia/instrumentacionTopologica'
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
      // D-δ.52: 'automatico' = candidato resuelto por CRIT-A23; 'manual' =
      // el usuario adoptó explícitamente `Tramo.dnComercialAdoptado` y ESE
      // es el diámetro efectivo de cálculo (`candidato`), no una anotación.
      readonly origen: 'automatico' | 'manual'
      // El candidato que CRIT-A23 habría adoptado automáticamente (para
      // mostrar "DN recomendado" junto al adoptado). null si no hay ningún
      // candidato automático admisible (p. ej. exceso de Vmax) -- el
      // override manual sigue siendo válido de adoptar y evaluar.
      readonly candidatoAutomatico: EntradaCatalogoTuberia | null
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
  // PERF-SCALE-01B: ver resolverHidraulicaDeTramo. Ausente ⇒ recálculo
  // siempre. Presente ⇒ el diámetro comercial de este Tramo se resuelve una
  // vez por resolución (y su resolverHidraulicaDeTramo también, vía el mismo
  // contexto). Clave: sólo `tramoId` (el override manual `dnComercialAdoptado`
  // vive en redHidraulica, inmutable durante la resolución).
  contexto?: ContextoDeCalculoM2,
): ResultadoDiametroComercialDeTramo {
  registrarSolicitudDiametroComercialDeTramo()

  const memoizado = contexto?.diametroComercialPorTramo.get(tramoId)
  if (memoizado !== undefined) {
    return memoizado
  }

  const resultado = calcularDiametroComercialDeTramo(
    proyecto,
    tramoId,
    catalogoArtefactos,
    catalogoSistemasDeTuberia,
    contexto,
  )
  contexto?.diametroComercialPorTramo.set(tramoId, resultado)
  return resultado
}

function calcularDiametroComercialDeTramo(
  proyecto: Proyecto,
  tramoId: string,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  catalogoSistemasDeTuberia: readonly SistemaDeTuberiaCatalogado[],
  contexto: ContextoDeCalculoM2 | undefined,
): ResultadoDiametroComercialDeTramo {
  registrarCalculoDiametroComercialDeTramo()

  const resultadoHidraulico = resolverHidraulicaDeTramo(proyecto, tramoId, catalogoArtefactos, contexto)

  if (resultadoHidraulico.tipo === 'sinDemanda') {
    return { tipo: 'sinDemanda', qc_lps: 0 }
  }

  const sistema = obtenerSistemaDeTuberia(proyecto.configuracionHidraulica.sistemaDeTuberiaId, catalogoSistemasDeTuberia)
  const { qc_lps } = resultadoHidraulico
  const { n } = resultadoHidraulico.simultaneidad
  const diReferenciaPredimensionamiento_mm = resultadoHidraulico.predimensionamiento.diReferenciaPredimensionamiento_mm

  // D-δ.52: override manual del diámetro comercial adoptado. Si el Tramo
  // declara `dnComercialAdoptado` y esa denominación existe en el sistema
  // vigente, ESE diámetro es el efectivo de cálculo -- se resuelve su V y
  // su verificación reales (que pueden ser 'noAdmisible': el usuario puede
  // explorar, pero el incumplimiento se muestra tal cual, brief §5). Qc no
  // cambia. Si la denominación no existe en el sistema actual (cambio de
  // material/sistema), se ignora y sigue el camino automático.
  const tramo = proyecto.redHidraulica?.tramos.find((candidatoTramo) => candidatoTramo.id === tramoId)
  const entradasOrdenadasParaOverride =
    tramo?.dnComercialAdoptado !== undefined
      ? obtenerEntradasOrdenadasPorDiametroInterior(sistema)
      : undefined
  const entradaAdoptada =
    tramo?.dnComercialAdoptado !== undefined
      ? entradasOrdenadasParaOverride!.find((entrada) => entrada.denominacionComercial === tramo.dnComercialAdoptado)
      : undefined

  // CRIT-A23: recorrer el catálogo completo por Di efectivo creciente y
  // verificar la velocidad real de cada candidato contra el rango que su
  // propio Di determina (CRIT-A19) -- sin suponer de antemano si el
  // diámetro será chico o grande, evitando la circularidad de fijar una
  // Ve antes de conocer el diámetro. noAdmisible y fueraDeDominioNormativo
  // se descartan y la búsqueda continúa (p. ej. el hueco 60–75mm).
  const entradasOrdenadas = obtenerEntradasOrdenadasPorDiametroInterior(sistema)
  const automatico = seleccionarCandidatoAutomatico(entradasOrdenadas, qc_lps)

  // D-δ.52: hay override manual válido -> ESE diámetro es el efectivo de
  // cálculo. Se resuelve su V/verificación reales (pueden ser noAdmisible),
  // y se expone el candidato automático como "recomendado".
  if (entradaAdoptada !== undefined) {
    const velocidadReal_mps = calcularVelocidad(qc_lps, entradaAdoptada.diametroInteriorEfectivo_mm)
    const verificacionVelocidad = verificarVelocidadAdmisible(velocidadReal_mps, entradaAdoptada.diametroInteriorEfectivo_mm)
    return {
      tipo: 'conCandidato',
      qc_lps,
      n,
      diReferenciaPredimensionamiento_mm,
      candidato: entradaAdoptada,
      origen: 'manual',
      candidatoAutomatico: automatico?.candidato ?? null,
      velocidadReal_mps,
      verificacionVelocidad,
      velocidadPorDebajoDelMinimo: false,
    }
  }

  if (automatico !== undefined) {
    return {
      tipo: 'conCandidato',
      qc_lps,
      n,
      diReferenciaPredimensionamiento_mm,
      candidato: automatico.candidato,
      origen: 'automatico',
      candidatoAutomatico: automatico.candidato,
      velocidadReal_mps: automatico.velocidadReal_mps,
      verificacionVelocidad: automatico.verificacionVelocidad,
      velocidadPorDebajoDelMinimo: automatico.velocidadPorDebajoDelMinimo,
    }
  }

  // Recorrido completo sin ningún candidato admisible y sin fallback de
  // D-delta.27 aplicable: exceso de Vmax (Qc alto) o ningún candidato en
  // dominio normativo -- resultado hidráulico/comercial legítimo, nunca
  // throw, nunca se extrapola ni se elige el más cercano.
  return { tipo: 'sinCandidatoAdmisible', qc_lps, n, diReferenciaPredimensionamiento_mm }
}

// Selección automática CRIT-A23 (+ fallback D-delta.27 de Vmin). Extraída
// para poder resolverla siempre -- incluso cuando hay override manual --
// y así exponer el "DN recomendado" junto al adoptado. Sin cambios de
// lógica respecto de la versión previa.
function seleccionarCandidatoAutomatico(
  entradasOrdenadas: readonly EntradaCatalogoTuberia[],
  qc_lps: number,
):
  | {
      readonly candidato: EntradaCatalogoTuberia
      readonly velocidadReal_mps: number
      readonly verificacionVelocidad: ResultadoVerificacionVelocidad
      readonly velocidadPorDebajoDelMinimo: boolean
    }
  | undefined {
  let primerCandidatoNormativoEvaluado = false
  let candidatoFallbackPorDebajoDelMinimo:
    | { candidato: EntradaCatalogoTuberia; velocidadReal_mps: number; verificacionVelocidad: ResultadoVerificacionVelocidad }
    | undefined

  for (const candidato of entradasOrdenadas) {
    const velocidadReal_mps = calcularVelocidad(qc_lps, candidato.diametroInteriorEfectivo_mm)
    const verificacionVelocidad = verificarVelocidadAdmisible(velocidadReal_mps, candidato.diametroInteriorEfectivo_mm)

    if (verificacionVelocidad.tipo === 'admisible') {
      return { candidato, velocidadReal_mps, verificacionVelocidad, velocidadPorDebajoDelMinimo: false }
    }

    if (!primerCandidatoNormativoEvaluado && verificacionVelocidad.tipo !== 'fueraDeDominioNormativo') {
      primerCandidatoNormativoEvaluado = true
      if (velocidadReal_mps < verificacionVelocidad.limiteMinimo_mps) {
        candidatoFallbackPorDebajoDelMinimo = { candidato, velocidadReal_mps, verificacionVelocidad }
      }
    }
  }

  if (candidatoFallbackPorDebajoDelMinimo !== undefined) {
    return { ...candidatoFallbackPorDebajoDelMinimo, velocidadPorDebajoDelMinimo: true }
  }
  return undefined
}
