// Presentación pura de ResultadoPerdidaDistribuidaDeTramo (N3) + resolución
// del resultado completo de un Tramo para la UI de Módulo 2. Extraído de
// ResultadoHidraulicoDeTramo.tsx (D-δ.43) para que tanto la Distribución
// general como cada Local+Red (DimensionamientoDeTramo) reutilicen
// exactamente la misma lectura del motor, sin recalcular ni duplicar
// texto. No decide nada hidráulico: solo formatea lo que
// resolverPerdidaDistribuidaDeTramo ya devuelve.
import type { Proyecto } from '../../modelo/proyecto'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import { catalogoMaterialesTuberia } from '../../motor/tuberias/materialTuberia'
import { catalogoSistemasDeTuberia } from '../../motor/tuberias/sistemaDeTuberia'
import { resolverPerdidaDistribuidaDeTramo } from '../../motor/tuberias/resolverPerdidaDistribuidaDeTramo'
import type { ResultadoPerdidaDistribuidaDeTramo } from '../../motor/tuberias/resolverPerdidaDistribuidaDeTramo'
import type { ContextoDeCalculoM2 } from '../../motor/tuberias/contextoDeCalculoM2'
import type { ResultadoVerificacionVelocidad } from '../../motor/tuberias/velocidad/verificarVelocidadAdmisible'
import { clasificarVelocidadParaUi, type ClasificacionVelocidad } from './clasificarVelocidadParaUi'
import { obtenerArtefactosAguasAbajo } from '../../motor/tuberias/topologia/obtenerArtefactosAguasAbajo'
import { formatearNumero } from '../../exportadores/pdf/formatearNumero'

// Texto de presentación de las 4 variantes de ResultadoPerdidaDistribuidaDeTramo
// (N3), sin recalcular nada -- lee exclusivamente los campos que el motor ya
// devuelve. '—' para cualquier dato no aplicable en esa variante (nunca 0,
// nunca inventado): sinDemanda no tiene diámetro/velocidad/hf;
// sinCandidatoAdmisible no tiene candidato comercial; sinLongitud tiene todo
// menos hf (Tramo.longitud_m ausente, CRIT-A20 -- no se asume 0 ni se deriva).
//
// velocidadPorDebajoDelMinimo (D-delta.27) y verificacionVelocidad (CRIT-A19)
// se leen tal cual del motor, nunca reinterpretados ni recalculados. Ambos
// SÍ se muestran (Vmin/Vmax aplicables y el resultado de verificación) --
// pero con una distinción deliberada de UX (no de cálculo): cuando
// velocidadPorDebajoDelMinimo es true, el texto de verificación NUNCA dice
// "no admisible" ni usa lenguaje de advertencia accionable. D-delta.27 solo
// activa ese flag exactamente en el caso terminal de CRIT-A24 (el menor
// diámetro comercial normativamente evaluable, sin ningún diámetro mayor
// que pudiera corregirlo -- V decrece monótonamente con Di a Qc fijo, ver
// resolverDiametroComercialDeTramo.ts): no hay ninguna acción de
// dimensionamiento que el proyectista pueda tomar para evitarlo, así que
// se presenta como aceptación normativa explícita (CRIT-A24), no como una
// advertencia. Vmax sigue siendo una condición dura sin excepción, sin
// cambios acá -- un noAdmisible por exceso de Vmax (fuera del fallback de
// Vmin) sí se muestra como tal.
export interface TextosDePerdidaDistribuidaDeTramo {
  readonly qcTexto: string
  readonly diReferenciaTexto: string
  readonly diComercialTexto: string
  readonly diEfectivoTexto: string
  readonly vTexto: string
  readonly limiteVelocidadTexto: string
  readonly verificacionVelocidadTexto: string
  readonly velocidadPorDebajoDelMinimo: boolean
  // DEPLOY-01 (preflight A): nivel de exigencia de la velocidad para el
  // badge de comunicación de M2. Presentacional: no altera nada hidráulico.
  // 'normal' cuando no hay velocidad resuelta o no amerita aviso.
  readonly clasificacionVelocidad: ClasificacionVelocidad
  readonly hfTexto: string
}

function textoLimiteVelocidad(verificacion: ResultadoVerificacionVelocidad): string {
  if (verificacion.tipo === 'fueraDeDominioNormativo') {
    return '—'
  }
  return `${formatearNumero(verificacion.limiteMinimo_mps, 'm/s')} – ${formatearNumero(verificacion.limiteMaximo_mps, 'm/s')}`
}

// D-delta.27: mientras velocidadPorDebajoDelMinimo sea true, el texto NUNCA
// es de advertencia ("no admisible"), independientemente de lo que diga
// verificacionVelocidad -- es exactamente el caso terminal de CRIT-A24
// (ver comentario de archivo). Fuera de ese caso, verificacionVelocidad ya
// es siempre 'admisible' en la práctica (garantía de resolverPerdidaDistribuidaDeTramo),
// pero esta función igual cubre 'noAdmisible'/'fueraDeDominioNormativo'
// defensivamente, sin asumirlo.
function textoVerificacionVelocidad(
  verificacion: ResultadoVerificacionVelocidad,
  velocidadPorDebajoDelMinimo: boolean,
): string {
  if (velocidadPorDebajoDelMinimo) {
    return 'Aceptada en el menor diámetro comercial (CRIT-A24)'
  }
  if (verificacion.tipo === 'admisible') {
    return 'Admisible'
  }
  if (verificacion.tipo === 'noAdmisible') {
    return 'No admisible'
  }
  return 'Fuera de dominio normativo'
}

export function textosDePerdidaDistribuidaDeTramo(
  resultado: ResultadoPerdidaDistribuidaDeTramo,
): TextosDePerdidaDistribuidaDeTramo {
  const qcTexto = formatearNumero(resultado.qc_lps, 'l/s')

  if (resultado.tipo === 'sinDemanda') {
    return {
      qcTexto,
      diReferenciaTexto: '—',
      diComercialTexto: '—',
      diEfectivoTexto: '—',
      vTexto: '—',
      limiteVelocidadTexto: '—',
      verificacionVelocidadTexto: '—',
      velocidadPorDebajoDelMinimo: false,
      clasificacionVelocidad: 'normal',
      hfTexto: '—',
    }
  }

  const diReferenciaTexto = formatearNumero(resultado.diReferenciaPredimensionamiento_mm, 'mm')

  if (resultado.tipo === 'sinCandidatoAdmisible') {
    return {
      qcTexto,
      diReferenciaTexto,
      diComercialTexto: '—',
      diEfectivoTexto: '—',
      vTexto: '—',
      limiteVelocidadTexto: '—',
      verificacionVelocidadTexto: '—',
      velocidadPorDebajoDelMinimo: false,
      clasificacionVelocidad: 'normal',
      hfTexto: '—',
    }
  }

  const diComercialTexto = resultado.candidato.denominacionComercial
  const diEfectivoTexto = formatearNumero(resultado.candidato.diametroInteriorEfectivo_mm, 'mm')
  const vTexto = formatearNumero(resultado.velocidadReal_mps, 'm/s')
  const { velocidadPorDebajoDelMinimo, verificacionVelocidad } = resultado
  const limiteVelocidadTexto = textoLimiteVelocidad(verificacionVelocidad)
  const verificacionVelocidadTexto = textoVerificacionVelocidad(verificacionVelocidad, velocidadPorDebajoDelMinimo)
  const clasificacionVelocidad = clasificarVelocidadParaUi(
    resultado.velocidadReal_mps,
    verificacionVelocidad,
    velocidadPorDebajoDelMinimo,
  )

  if (resultado.tipo === 'sinLongitud') {
    return {
      qcTexto,
      diReferenciaTexto,
      diComercialTexto,
      diEfectivoTexto,
      vTexto,
      limiteVelocidadTexto,
      verificacionVelocidadTexto,
      velocidadPorDebajoDelMinimo,
      clasificacionVelocidad,
      hfTexto: '—',
    }
  }

  return {
    qcTexto,
    diReferenciaTexto,
    diComercialTexto,
    diEfectivoTexto,
    vTexto,
    limiteVelocidadTexto,
    verificacionVelocidadTexto,
    velocidadPorDebajoDelMinimo,
    clasificacionVelocidad,
    hfTexto: formatearNumero(resultado.hf_m, 'm'),
  }
}

// Decisión pura del <input> de Longitud [m] ante un cambio de texto --
// testeable sin DOM/jsdom. Nunca produce un resultado con longitud_m<0: ni
// un negativo tipeado directamente, ni el alcanzado bajando con la flecha
// del input numérico desde 0 (el navegador dispara onChange con texto
// "-1" en ese caso) terminan en 'establecer'. `min={0}` en el <input> es
// una ayuda de UI, no la única defensa -- esta función es la que decide
// qué llega efectivamente al modelo.
// longitud_m=0 SÍ es un resultado 'establecer' válido acá (mecánicamente
// ingresable): CRIT-A20 (longitud_m>0) sigue siendo la única fuente de
// verdad sobre esa regla física, vía validarRedHidraulica -- este input
// no la duplica ni la anticipa.
export type ResultadoDeCambioDeLongitud =
  | { readonly tipo: 'omitir' } // campo vacío: "no informada", nunca 0
  | { readonly tipo: 'establecer'; readonly longitud_m: number }
  | { readonly tipo: 'ignorar' } // NaN o negativo: no se persiste ningún cambio

export function resolverCambioDeLongitud(texto: string): ResultadoDeCambioDeLongitud {
  if (texto === '') {
    return { tipo: 'omitir' }
  }
  const longitud_m = Number(texto)
  if (Number.isNaN(longitud_m) || longitud_m < 0) {
    return { tipo: 'ignorar' }
  }
  return { tipo: 'establecer', longitud_m }
}

export type ResultadoDeTramoParaUi = {
  readonly artefactosTexto: string
  readonly nTexto: string
  readonly textos: TextosDePerdidaDistribuidaDeTramo
  // Velocidad real cruda (no formateada): la necesita AccesoriosDeTramoEditor
  // para calcular la pérdida localizada de este tramo, sin que ese
  // componente tenga que volver a resolver el diámetro comercial.
  readonly velocidadReal_mps: number | undefined
  readonly errorDelMotor: string | null
}

const TEXTOS_DE_ERROR: TextosDePerdidaDistribuidaDeTramo = {
  qcTexto: 'Error',
  diReferenciaTexto: '—',
  diComercialTexto: '—',
  diEfectivoTexto: '—',
  vTexto: '—',
  limiteVelocidadTexto: '—',
  verificacionVelocidadTexto: '—',
  velocidadPorDebajoDelMinimo: false,
  clasificacionVelocidad: 'normal',
  hfTexto: '—',
}

export function resolverResultadoDeTramoParaUi(
  proyecto: Proyecto,
  tramoId: string,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  // PERF-SCALE-01C: contexto de cálculo local al render (mismo
  // ContextoDeCalculoM2 de 01B) -- evita recalcular la hidráulica/diámetro
  // de este Tramo si otro consumidor de la misma tabla/render ya lo pidió
  // (p. ej. resolverFilaDeDimensionamiento, resolverControlDeDnDeTramo).
  // Ausente ⇒ comportamiento previo byte a byte.
  contexto?: ContextoDeCalculoM2,
): ResultadoDeTramoParaUi {
  try {
    const referencias = obtenerArtefactosAguasAbajo(proyecto, tramoId)
    const artefactosTexto = formatearNumero(referencias.length, 'conteo')

    const resultadoPerdida = resolverPerdidaDistribuidaDeTramo(
      proyecto,
      tramoId,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
      contexto,
    )
    // n hidraulico efectivo: expuesto directamente por
    // ResultadoPerdidaDistribuidaDeTramo (N3, D-delta.34).
    const nTexto = resultadoPerdida.tipo === 'sinDemanda' ? '—' : formatearNumero(resultadoPerdida.n, 'conteo')
    const textos = textosDePerdidaDistribuidaDeTramo(resultadoPerdida)
    const velocidadReal_mps =
      resultadoPerdida.tipo === 'sinLongitud' || resultadoPerdida.tipo === 'conPerdidaDistribuida'
        ? resultadoPerdida.velocidadReal_mps
        : undefined

    return { artefactosTexto, nTexto, textos, velocidadReal_mps, errorDelMotor: null }
  } catch (motivo) {
    return {
      artefactosTexto: '—',
      nTexto: '—',
      textos: TEXTOS_DE_ERROR,
      velocidadReal_mps: undefined,
      errorDelMotor: motivo instanceof Error ? motivo.message : String(motivo),
    }
  }
}
