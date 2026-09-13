// REPORT-01A: snapshot DERIVADO y puro del informe técnico integral.
// Compone -- nunca recalcula -- lo que el dominio ya resuelve (M1/M2/M4):
// ningún Qc/DN/V/hf/Presidual se reimplementa acá, sólo se lee y formatea
// lo que devuelven resolverEstadoModulo2, resolverFilaDeDimensionamiento,
// proyectarMontante, etc. (ver comentario de archivo de
// generarDocumentoPdf.ts, C-05/ADR-012). NO se persiste: se recalcula por
// cada generación de PDF, igual que el resto de las proyecciones de
// presentación de M2 (montantesDelProyecto.ts, resolverResumenDeProyecto.ts).
import type { EsquemaDeAbastecimiento, Local, Nivel, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { RedDeTramo } from '../../modelo/redHidraulica'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import type { TipoProyectoNormativo } from '../../normativa/eras-2023/coeficientes-mayoracion'
import type { ResultadoDeCalculo } from '../../modelo/resultado'
import { calcularSimultaneidad } from '../../motor/demanda/simultaneidad/calcularSimultaneidad'
import { catalogoSistemasDeTuberia } from '../../motor/tuberias/sistemaDeTuberia'
import { catalogoMaterialesTuberia } from '../../motor/tuberias/materialTuberia'
import { crearContextoDeCalculoM2 } from '../../motor/tuberias/contextoDeCalculoM2'
import { resolverPerdidaDistribuidaDeTramo } from '../../motor/tuberias/resolverPerdidaDistribuidaDeTramo'
import type { ResultadoPerdidaDistribuidaDeTramo } from '../../motor/tuberias/resolverPerdidaDistribuidaDeTramo'
import {
  resolverPerdidaLocalizadaEstimadaDeLocal,
  KS_ESTIMADO_TEE,
  KS_ESTIMADO_SINGULARIDAD_TERMINAL,
  KS_ESTIMADO_LLAVE_DE_PASO,
} from '../../motor/tuberias/presion/resolverPerdidaLocalizadaEstimadaDeLocal'
import { resolverCotaHidraulicaEfectivaDeArtefacto, resolverNivelDeLocal } from '../../motor/tuberias/geometria/resolverCotaHidraulicaDeArtefacto'
import { resolverEstadoModulo4, type EstadoModulo4, type ResultadoModulo4 } from '../../motor/modulo4/resolverEstadoModulo4'
import type { PeloDeAguaMinimoEfectivo } from '../../motor/modulo4/resolverPeloDeAguaMinimoDeTanque'
import { resolverEstadoModulo3, type EstadoModulo3, type ResultadoModulo3, type ResultadoModulo3Parcial } from '../../motor/modulo3/resolverEstadoModulo3'
import { tipoProvisionACSEfectivo } from '../../motor/modulo3/tipoProvisionACSEfectivo'
import type { EstadoModulo2 } from '../../motor/modulo2/resolverEstadoModulo2'
import { resolverResolucionDeModulo2 } from '../../interfaz/paginas/resolverResolucionDeModulo2'
import { describirMotivoIncompletitudModulo3 } from '../../interfaz/paginas/humanizarModulo3'
import { describirMotivoIncompletitudModulo4 } from '../../interfaz/paginas/humanizarModulo4'
import { describirProblemaDeValidacion } from '../../interfaz/paginas/mensajesDeValidacion'
import { resolverFilaDeDimensionamiento, type EstadoDeFila } from '../../interfaz/paginas/resolverFilaDeDimensionamiento'
import { resolverResultadoDeTramoParaUi } from '../../interfaz/paginas/resolverResultadoDeTramoParaUi'
import {
  identificarFilasDistribucionGeneral,
  identificarFilasPrincipalesDeLocales,
  identificarFilasDistribucionSecundaria,
} from '../../interfaz/paginas/identificarFilasDeModulo2'
import { proyectarMontante } from '../../interfaz/paginas/montantesDelProyecto'
import { etiquetaHumanaDeLocal } from '../../interfaz/paginas/montantesDelProyecto'
import { agruparMotivosDeModulo2 } from '../../interfaz/paginas/agruparMotivosDeModulo2'
import { nombreDeArtefacto } from '../../interfaz/paginas/humanizarModulo2'
import { formatearNumero } from './formatearNumero'

const GUION = '—'

function formatearMca(valor: number | undefined): string {
  if (valor === undefined) {
    return GUION
  }
  const signo = valor >= 0 ? '+' : ''
  return `${signo}${formatearNumero(valor, 'm')} m.c.a.`
}

// ---------------------------------------------------------------------
// M1 -- presentación multinivel-aware (preserva Nivel -> Local, GEOM-UX-01)
// ---------------------------------------------------------------------

export type NivelDeInforme = {
  readonly nombre: string | undefined
  readonly locales: readonly Local[]
}

export type UnidadFuncionalDeInforme = {
  readonly nombre: string
  // false = UF de un único Nivel: no vale la pena exponer el nombre del
  // Nivel en el PDF (brief §8), los Locales se listan directo bajo la UF.
  readonly mostrarNiveles: boolean
  readonly niveles: readonly NivelDeInforme[]
}

function resolverUnidadFuncionalDeInforme(uf: UnidadFuncional): UnidadFuncionalDeInforme {
  return {
    nombre: uf.nombre,
    mostrarNiveles: uf.niveles.length > 1,
    niveles: uf.niveles.map((nivel: Nivel) => ({ nombre: nivel.nombre, locales: nivel.locales })),
  }
}

// ---------------------------------------------------------------------
// M2 -- tuberías / montantes (view-model ya existente de la UI, D-δ.51)
// ---------------------------------------------------------------------

export type FilaDeTuberiaDeInforme = {
  readonly clave: string
  readonly tramoId: string
  readonly etiqueta: string
  readonly red: RedDeTramo
  readonly longitudTexto: string
  // DN comercial adoptado ("20 mm", denominación de catálogo) -- DISTINTO
  // de diTexto (FIX-REPORT-01B-VISUAL-01, P3: antes se mostraba el mismo
  // valor dos veces bajo una única columna "DN / Di" ambigua).
  readonly dnTexto: string
  // Di REAL interior efectivo, en mm, bare number sin unidad ("14,40") --
  // nunca igual al DN comercial (ver comentario de dnTexto).
  readonly diTexto: string
  readonly vTexto: string
  readonly qcTexto: string
  readonly hfDistribuidaTexto: string
  readonly hfLocalizadaTexto: string
  readonly perdidaTotalTexto: string
  // Estado CRUDO ('ok'|'controlar'|'incompleto'), no el texto largo que ya
  // usa la UI interactiva (p.ej. "○ DN mínimo comercial") -- el PDF arma su
  // propia etiqueta compacta (brief REPORT-01B §19) para no partir palabras
  // en una columna angosta.
  readonly estado: EstadoDeFila
  readonly artefactos: string
}

export type GrupoDeLocalDeInforme = {
  readonly nombre: string
  readonly filas: readonly FilaDeTuberiaDeInforme[]
}

export type MontanteDeInforme = {
  readonly nombre: string
  readonly red: RedDeTramo
  readonly localesServidos: readonly string[]
  readonly segmentos: readonly FilaDeTuberiaDeInforme[]
}

// Desarrollo de cálculo de velocidad + pérdida distribuida (brief
// REPORT-01B §8/§9): UN caso real representativo, con los datos crudos
// que resolverPerdidaDistribuidaDeTramo ya resuelve -- nunca una segunda
// aritmética. `detalle` trae exactamente lo que expone el motor según el
// método vigente del proyecto (Hazen-Williams o Darcy-Weisbach).
export type CasoVelocidadYPerdidaDistribuida = {
  readonly etiqueta: string
  readonly qc_lps: number
  readonly diametroInteriorEfectivo_mm: number
  readonly velocidad_mps: number
  readonly longitud_m: number
  readonly hfDistribuida_m: number
  readonly detalle: Extract<ResultadoPerdidaDistribuidaDeTramo, { tipo: 'conPerdidaDistribuida' }>['detalle']
}

// Desarrollo de la pérdida localizada ESTIMADA (criterio vigente D-δ.40/
// D-δ.45, brief REPORT-01B §10): un caso real por (Local, Red), con los Ks
// tal como los expone el propio motor (KS_ESTIMADO_*, Tabla N°7) -- nunca
// recalibrados ni reinterpretados acá.
export type CasoPerdidaLocalizadaEstimada = {
  readonly localEtiqueta: string
  readonly red: RedDeTramo
  readonly nTerminalesLocal: number
  readonly nTeesEstimadas: number
  readonly nSingularidadTerminal: number
  readonly nLlaveDePaso: number
  readonly ksTee: number
  readonly ksSingularidadTerminal: number
  readonly ksLlaveDePaso: number
  readonly kTotal: number
  readonly velocidadReferencia_mps: number
  readonly hf_m: number
}

export type DesarrolloDeCalculoM2 = {
  readonly metodoPerdidaDistribuida: 'hazenWilliams' | 'darcyWeisbach'
  readonly metodoPerdidaLocalizada: 'estimado' | 'detallado'
  // undefined = ningún Tramo del proyecto resolvió una pérdida distribuida
  // completa todavía (p.ej. sin longitudes cargadas) -- nunca se fabrica un
  // caso con datos parciales.
  readonly casoVelocidadYPerdidaDistribuida: CasoVelocidadYPerdidaDistribuida | undefined
  // Sólo tiene sentido en método 'estimado' -- en 'detallado' queda
  // undefined a propósito (brief §12: no mostrar la plantilla de Estimadas
  // en un proyecto que usa Detalladas).
  readonly casoPerdidaLocalizadaEstimada: CasoPerdidaLocalizadaEstimada | undefined
}

export type SeccionM2DeInforme = {
  readonly hayRedHidraulica: boolean
  readonly metodoPerdidaLocalizada: 'estimado' | 'detallado'
  readonly distribucionGeneral: readonly FilaDeTuberiaDeInforme[]
  readonly locales: readonly GrupoDeLocalDeInforme[]
  readonly distribucionSecundaria: readonly FilaDeTuberiaDeInforme[]
  readonly montantes: readonly MontanteDeInforme[]
  readonly desarrollo: DesarrolloDeCalculoM2 | undefined
}

function longitudTextoDeTramo(proyecto: Proyecto, tramoId: string): string {
  const longitud_m = proyecto.redHidraulica?.tramos.find((t) => t.id === tramoId)?.longitud_m
  return longitud_m === undefined ? GUION : `${formatearNumero(longitud_m, 'm')} m`
}

function resolverFilaDeTuberiaDeInforme(
  proyecto: Proyecto,
  clave: string,
  etiqueta: string,
  tramoId: string,
  red: RedDeTramo,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  contextoLocal: { readonly unidadFuncionalId: string; readonly localId: string; readonly red: RedDeTramo } | undefined,
  contexto: ReturnType<typeof crearContextoDeCalculoM2>,
): FilaDeTuberiaDeInforme {
  const fila = resolverFilaDeDimensionamiento(proyecto, tramoId, catalogoArtefactos, contextoLocal, contexto)
  // P3 (FIX-REPORT-01B-VISUAL-01): DN (denominación comercial, "20 mm") y Di
  // real ("14,40" mm) son datos DISTINTOS -- resolverFilaDeDimensionamiento
  // (view-model compartido con la UI) sólo expone el DN. Se relee
  // diEfectivoTexto de resolverResultadoDeTramoParaUi para el mismo tramoId
  // sobre el MISMO contexto memoizado -- no es una segunda resolución
  // hidráulica, es leer un campo que ese resolver ya calcula y expone.
  const diReal = resolverResultadoDeTramoParaUi(proyecto, tramoId, catalogoArtefactos, contexto).textos.diEfectivoTexto
  const hfLocalizadaTexto =
    fila.hfLocalizadaEstimada_mca === undefined ? GUION : `${formatearNumero(fila.hfLocalizadaEstimada_mca, 'm')} m.c.a.`
  return {
    clave,
    tramoId,
    etiqueta,
    red,
    longitudTexto: longitudTextoDeTramo(proyecto, tramoId),
    dnTexto: fila.dnTexto,
    diTexto: diReal,
    vTexto: `${fila.vTexto} m/s`,
    qcTexto: fila.qcTexto,
    hfDistribuidaTexto: `${fila.hfDistribuidaTexto} m.c.a.`,
    hfLocalizadaTexto,
    perdidaTotalTexto: fila.perdidaTotalTexto,
    estado: fila.estado,
    artefactos: fila.artefactos,
  }
}

// Caso real representativo de velocidad + pérdida distribuida: prueba,
// en orden de preferencia, el Tramo del Local+Red del terminal crítico
// (une narrativamente M2 y Verificación), luego el primer Tramo de cada
// sección de M2. `undefined` si ningún candidato resuelve 'conPerdidaDistribuida'
// todavía (nunca se fabrica un caso con datos incompletos).
function resolverCasoVelocidadYPerdidaDistribuida(
  proyecto: Proyecto,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  contexto: ReturnType<typeof crearContextoDeCalculoM2>,
  candidatos: readonly { readonly tramoId: string; readonly etiqueta: string }[],
): CasoVelocidadYPerdidaDistribuida | undefined {
  for (const candidato of candidatos) {
    const resultado = resolverPerdidaDistribuidaDeTramo(
      proyecto,
      candidato.tramoId,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
      contexto,
    )
    if (resultado.tipo !== 'conPerdidaDistribuida') {
      continue
    }
    return {
      etiqueta: candidato.etiqueta,
      qc_lps: resultado.qc_lps,
      diametroInteriorEfectivo_mm: resultado.candidato.diametroInteriorEfectivo_mm,
      velocidad_mps: resultado.velocidadReal_mps,
      longitud_m: resultado.longitud_m,
      hfDistribuida_m: resultado.hf_m,
      detalle: resultado.detalle,
    }
  }
  return undefined
}

function resolverCasoPerdidaLocalizadaEstimada(
  proyecto: Proyecto,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  contexto: ReturnType<typeof crearContextoDeCalculoM2>,
  candidatos: readonly { readonly unidadFuncionalId: string; readonly localId: string; readonly red: RedDeTramo; readonly etiqueta: string }[],
): CasoPerdidaLocalizadaEstimada | undefined {
  for (const candidato of candidatos) {
    const resultado = resolverPerdidaLocalizadaEstimadaDeLocal(
      proyecto,
      candidato.unidadFuncionalId,
      candidato.localId,
      candidato.red,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      contexto,
    )
    if (resultado.tipo !== 'estimada' || resultado.nTerminalesLocal === 0) {
      continue
    }
    return {
      localEtiqueta: candidato.etiqueta,
      red: candidato.red,
      nTerminalesLocal: resultado.nTerminalesLocal,
      nTeesEstimadas: resultado.nTeesEstimadas,
      nSingularidadTerminal: resultado.nSingularidadTerminal,
      nLlaveDePaso: resultado.nLlaveDePaso,
      ksTee: KS_ESTIMADO_TEE,
      ksSingularidadTerminal: KS_ESTIMADO_SINGULARIDAD_TERMINAL,
      ksLlaveDePaso: KS_ESTIMADO_LLAVE_DE_PASO,
      kTotal:
        resultado.nTeesEstimadas * KS_ESTIMADO_TEE +
        resultado.nSingularidadTerminal * KS_ESTIMADO_SINGULARIDAD_TERMINAL +
        resultado.nLlaveDePaso * KS_ESTIMADO_LLAVE_DE_PASO,
      velocidadReferencia_mps: resultado.velocidadReferencia_mps,
      hf_m: resultado.hf_m,
    }
  }
  return undefined
}

function resolverSeccionM2(
  proyecto: Proyecto,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  criticoRef: { readonly unidadFuncionalId: string; readonly localId: string; readonly red: RedDeTramo } | undefined,
): SeccionM2DeInforme {
  const hayRedHidraulica = proyecto.redHidraulica !== undefined
  const metodoPerdidaLocalizada = proyecto.configuracionHidraulica.metodoPerdidaLocalizada
  if (!hayRedHidraulica) {
    return {
      hayRedHidraulica: false,
      metodoPerdidaLocalizada,
      distribucionGeneral: [],
      locales: [],
      distribucionSecundaria: [],
      montantes: [],
      desarrollo: undefined,
    }
  }

  // Un único contexto de cálculo para TODA la resolución de M2 del informe
  // (brief §36): cada Tramo se resuelve una sola vez aunque participe de
  // varias secciones (distribución general, Local, montante).
  const contexto = crearContextoDeCalculoM2()

  const distribucionGeneral = identificarFilasDistribucionGeneral(proyecto).map((f) =>
    resolverFilaDeTuberiaDeInforme(proyecto, `general-${f.tramoId}`, f.etiqueta, f.tramoId, f.red, catalogoArtefactos, undefined, contexto),
  )

  const filasPrincipales = identificarFilasPrincipalesDeLocales(proyecto)
  const gruposPorLocal = new Map<string, GrupoDeLocalDeInforme>()
  for (const f of filasPrincipales) {
    const uf = proyecto.unidadesFuncionales.find((candidata) => candidata.id === f.unidadFuncionalId)
    const local = uf?.niveles.flatMap((n) => n.locales).find((candidato) => candidato.id === f.localId)
    if (uf === undefined || local === undefined) {
      continue
    }
    const nombreGrupo = etiquetaHumanaDeLocal(uf, local)
    const fila = resolverFilaDeTuberiaDeInforme(
      proyecto,
      `local-${f.tramoId}`,
      f.red === 'AF' ? 'Agua fría' : 'Agua caliente',
      f.tramoId,
      f.red,
      catalogoArtefactos,
      { unidadFuncionalId: f.unidadFuncionalId, localId: f.localId, red: f.red },
      contexto,
    )
    const existente = gruposPorLocal.get(nombreGrupo)
    if (existente === undefined) {
      gruposPorLocal.set(nombreGrupo, { nombre: nombreGrupo, filas: [fila] })
    } else {
      gruposPorLocal.set(nombreGrupo, { nombre: nombreGrupo, filas: [...existente.filas, fila] })
    }
  }

  const distribucionSecundaria = identificarFilasDistribucionSecundaria(proyecto).map((f) =>
    resolverFilaDeTuberiaDeInforme(
      proyecto,
      `secundaria-${f.tramoId}`,
      f.etiqueta,
      f.tramoId,
      f.red,
      catalogoArtefactos,
      undefined,
      contexto,
    ),
  )

  const montantes: MontanteDeInforme[] = (proyecto.montantes ?? []).map((montante) => {
    const proyeccion = proyectarMontante(proyecto, montante.id)
    const segmentos = (proyeccion?.segmentos ?? []).map((segmento) =>
      resolverFilaDeTuberiaDeInforme(
        proyecto,
        `montante-${segmento.tramoId}`,
        `Segmento ${segmento.orden + 1}`,
        segmento.tramoId,
        montante.red,
        catalogoArtefactos,
        undefined,
        contexto,
      ),
    )
    return {
      nombre: proyeccion?.nombre ?? montante.id,
      red: montante.red,
      localesServidos: (proyeccion?.localesServidos ?? []).map((servido) => servido.etiqueta),
      segmentos,
    }
  })

  // Casos representativos del desarrollo de cálculo (brief REPORT-01B
  // §8/§9/§10): el terminal crítico primero (une narrativamente M2 y
  // Verificación), después el orden natural de la sección.
  const filasPrincipalesConEtiqueta = filasPrincipales.map((f) => {
    const uf = proyecto.unidadesFuncionales.find((candidata) => candidata.id === f.unidadFuncionalId)
    const local = uf?.niveles.flatMap((n) => n.locales).find((candidato) => candidato.id === f.localId)
    return { ...f, etiqueta: uf !== undefined && local !== undefined ? etiquetaHumanaDeLocal(uf, local) : f.tramoId }
  })
  const filasPrincipalesOrdenadas =
    criticoRef === undefined
      ? filasPrincipalesConEtiqueta
      : [
          ...filasPrincipalesConEtiqueta.filter(
            (f) => f.unidadFuncionalId === criticoRef.unidadFuncionalId && f.localId === criticoRef.localId && f.red === criticoRef.red,
          ),
          ...filasPrincipalesConEtiqueta.filter(
            (f) => !(f.unidadFuncionalId === criticoRef.unidadFuncionalId && f.localId === criticoRef.localId && f.red === criticoRef.red),
          ),
        ]

  const candidatosVelocidad = [
    ...filasPrincipalesOrdenadas.map((f) => ({ tramoId: f.tramoId, etiqueta: `${f.etiqueta} (${f.red === 'AF' ? 'Agua fría' : 'Agua caliente'})` })),
    ...identificarFilasDistribucionGeneral(proyecto).map((f) => ({ tramoId: f.tramoId, etiqueta: f.etiqueta })),
  ]
  const casoVelocidadYPerdidaDistribuida = resolverCasoVelocidadYPerdidaDistribuida(
    proyecto,
    catalogoArtefactos,
    contexto,
    candidatosVelocidad,
  )

  const casoPerdidaLocalizadaEstimada =
    metodoPerdidaLocalizada === 'estimado'
      ? resolverCasoPerdidaLocalizadaEstimada(proyecto, catalogoArtefactos, contexto, filasPrincipalesOrdenadas)
      : undefined

  return {
    hayRedHidraulica: true,
    metodoPerdidaLocalizada,
    distribucionGeneral,
    locales: [...gruposPorLocal.values()],
    distribucionSecundaria,
    montantes,
    desarrollo: {
      metodoPerdidaDistribuida: proyecto.configuracionHidraulica.metodoPerdidaDistribuida,
      metodoPerdidaLocalizada,
      casoVelocidadYPerdidaDistribuida,
      casoPerdidaLocalizadaEstimada,
    },
  }
}

// ---------------------------------------------------------------------
// Verificación hidráulica -- consume EstadoModulo2 tal cual (M2-B), nunca
// recalcula presión/margen/crítico.
// ---------------------------------------------------------------------

export type EstadoDeFilaVerificacion = 'completo' | 'incompleto' | 'fueraDeAlcance'

export type FilaDeVerificacionDeInforme = {
  readonly nodoId: string
  readonly localEtiqueta: string
  readonly artefactoNombre: string
  readonly red: RedDeTramo | undefined
  readonly estado: EstadoDeFilaVerificacion
  readonly esCritico: boolean
  readonly cumple: boolean | undefined
  readonly desnivelTexto: string
  readonly hfDistribuidaTexto: string
  readonly hfLocalizadaTexto: string
  readonly hfMedidorTexto: string
  readonly presionResidualTexto: string
  readonly presionMinimaTexto: string
  readonly margenTexto: string
  readonly notaTexto: string | undefined
}

// Desarrollo de cálculo del terminal crítico (brief REPORT-01B §14/§15/
// §16): todos los valores CRUDOS que ya resolvió resolverPresionResidualDeCamino
// para este candidato -- la fórmula central se arma en el renderer a partir
// de estos números, nunca se recalculan. `hfEquipoACS_mca` queda `undefined`
// a propósito: resolverBalanceDePresion NO incluye ese término en su firma
// (D-δ.15, sin fórmula normativa vigente) -- el renderer debe explicarlo,
// nunca inventar un 0 silencioso ni omitir la mención.
export type DesarrolloTerminalCritico = {
  readonly ufNombre: string
  readonly localEtiqueta: string
  readonly artefactoNombre: string
  readonly red: RedDeTramo | undefined
  readonly cotaTerminal_m: number | undefined
  readonly origenTexto: string
  readonly presionDisponible_mca: number
  readonly desnivel_m: number
  readonly hfDistribuida_mca: number
  readonly hfLocalizada_mca: number
  readonly metodologiaHfLocalizada: 'detallado' | 'estimado'
  readonly hfMedidor_mca: number
  readonly hfEquipoACS_mca: undefined
  readonly presionResidual_mca: number
  readonly presionMinimaRequerida_mca: number
  readonly margen_mca: number
  readonly cumpleMinimo: boolean
}

export type SeccionVerificacionDeInforme = {
  readonly estadoGlobal: EstadoModulo2['estado']
  readonly origenTexto: string
  readonly presionDisponibleTexto: string | undefined
  readonly filas: readonly FilaDeVerificacionDeInforme[]
  readonly terminalCriticoNodoId: string | undefined
  readonly motivosDeIncompletitud: readonly string[]
  // undefined mientras no exista un terminal crítico determinado
  // ('completo' es el único estado que lo produce, ver resolverEstadoModulo2).
  readonly desarrolloCritico: DesarrolloTerminalCritico | undefined
}

// Etiqueta humana de un motivo de corte POR TERMINAL -- distinto de
// agruparMotivosDeModulo2 (que agrega motivos a nivel de proyecto): acá se
// traduce el `tipo` de UN candidato puntual para la columna "Nota" de su
// fila, sin reinterpretar ningún dato ni inventar semántica nueva.
function notaDeCandidato(resultado: import('../../motor/tuberias/presion/resolverPresionResidualDeCamino').ResultadoPresionResidualDeCamino): string | undefined {
  switch (resultado.tipo) {
    case 'balanceCompleto':
      return undefined
    case 'terminalSinPresionMinima':
      return 'Pmin no definida / no evaluada'
    case 'topologiaNoResoluble':
      return 'Topología no resoluble'
    case 'terminalSinArtefacto':
      return 'Sin artefacto asociado'
    case 'desnivelIncompleto':
      return 'Falta la cota de conexión'
    case 'unidadFuncionalSinCotaDeReferencia':
      return 'Falta la cota de referencia de la unidad funcional'
    case 'perdidaDistribuidaIncompleta':
      return 'Falta longitud para la pérdida distribuida'
    case 'perdidaLocalizadaIncompleta':
      return 'Falta relevar accesorios/tees'
    case 'perdidaLocalizadaEstimadaIncompleta':
      return 'Falta velocidad comercial resoluble'
    case 'balanceIncompleto':
      return 'Balance de presión incompleto'
  }
}

function resolverFilaDeVerificacion(
  proyecto: Proyecto,
  candidato: EstadoModulo2['candidatos'][number],
  catalogoArtefactos: readonly ArtefactoNormativo[],
  hfMedidorDeTerminal: (nodoTerminalId: string) => number | undefined,
  nodoIdCritico: string | undefined,
): FilaDeVerificacionDeInforme {
  const { nodoId, resultado } = candidato
  const nodo = proyecto.redHidraulica?.nodos.find((n) => n.id === nodoId)
  const referencia = nodo?.referencia?.tipo === 'artefacto' ? nodo.referencia : undefined
  const uf = referencia !== undefined ? proyecto.unidadesFuncionales.find((u) => u.id === referencia.unidadFuncionalId) : undefined
  const local = uf?.niveles.flatMap((n) => n.locales).find((l) => l.id === referencia?.localId)
  const localEtiqueta = uf !== undefined && local !== undefined ? etiquetaHumanaDeLocal(uf, local) : 'Local (no encontrado)'
  const artefactoNombre = referencia !== undefined ? nombreDeArtefacto(proyecto, catalogoArtefactos, referencia) : GUION
  const red = proyecto.redHidraulica?.tramos.find((t) => t.nodoDestinoId === nodoId)?.red

  const notaTexto = notaDeCandidato(resultado)
  const estado: EstadoDeFilaVerificacion =
    resultado.tipo === 'balanceCompleto' ? 'completo' : resultado.tipo === 'terminalSinPresionMinima' ? 'fueraDeAlcance' : 'incompleto'

  if (resultado.tipo !== 'balanceCompleto') {
    return {
      nodoId,
      localEtiqueta,
      artefactoNombre,
      red,
      estado,
      esCritico: false,
      cumple: undefined,
      desnivelTexto: GUION,
      hfDistribuidaTexto: GUION,
      hfLocalizadaTexto: GUION,
      hfMedidorTexto: GUION,
      presionResidualTexto: GUION,
      presionMinimaTexto: GUION,
      margenTexto: GUION,
      notaTexto,
    }
  }

  const hfMedidor_mca = hfMedidorDeTerminal(nodoId)
  return {
    nodoId,
    localEtiqueta,
    artefactoNombre,
    red,
    estado,
    esCritico: nodoId === nodoIdCritico,
    cumple: resultado.cumpleMinimo,
    desnivelTexto: `${formatearNumero(resultado.desnivel_m, 'm')} m`,
    hfDistribuidaTexto: `${formatearNumero(resultado.hfDistribuida_mca, 'm')} m.c.a.`,
    hfLocalizadaTexto: `${formatearNumero(resultado.hfLocalizada.hf_mca, 'm')} m.c.a.`,
    hfMedidorTexto: hfMedidor_mca === undefined ? GUION : `${formatearNumero(hfMedidor_mca, 'm')} m.c.a.`,
    presionResidualTexto: formatearMca(resultado.presionResidual_mca),
    presionMinimaTexto: `${formatearNumero(resultado.presionMinimaRequerida_mca, 'm')} m.c.a.`,
    margenTexto: formatearMca(resultado.presionResidual_mca - resultado.presionMinimaRequerida_mca),
    notaTexto,
  }
}

// Desarrollo completo del terminal crítico -- sólo se construye cuando
// `estadoModulo2` ya determinó uno real ('completo'). Relee la misma
// referencia de nodo que resolverFilaDeVerificacion para no duplicar esa
// búsqueda con datos distintos.
function resolverDesarrolloCritico(
  proyecto: Proyecto,
  candidato: EstadoModulo2['candidatos'][number] & { readonly resultado: { readonly tipo: 'balanceCompleto' } },
  catalogoArtefactos: readonly ArtefactoNormativo[],
  hfMedidorDeTerminal: (nodoTerminalId: string) => number | undefined,
  presionDisponible_mca: number,
  origenTexto: string,
): DesarrolloTerminalCritico | undefined {
  const { nodoId, resultado } = candidato
  const nodo = proyecto.redHidraulica?.nodos.find((n) => n.id === nodoId)
  const referencia = nodo?.referencia?.tipo === 'artefacto' ? nodo.referencia : undefined
  if (referencia === undefined) {
    return undefined
  }
  const uf = proyecto.unidadesFuncionales.find((u) => u.id === referencia.unidadFuncionalId)
  const nivel = uf === undefined ? undefined : resolverNivelDeLocal(uf, referencia.localId)
  const local = nivel?.locales.find((l) => l.id === referencia.localId)
  const artefactoInstancia = local?.artefactos.find((a) => a.id === referencia.artefactoId)
  const cotaTerminal_m =
    nivel !== undefined && local !== undefined && artefactoInstancia !== undefined
      ? resolverCotaHidraulicaEfectivaDeArtefacto(nivel, local, artefactoInstancia)
      : undefined

  const hfMedidor_mca = hfMedidorDeTerminal(nodoId)
  if (hfMedidor_mca === undefined) {
    // Precondición imposible en la práctica: 'balanceCompleto' exige que
    // resolverBalanceDePresion ya haya recibido hfMedidor_mca (ver
    // TerminosDePerdidaDeBalance) -- si este candidato llegó hasta acá,
    // hfMedidorDeTerminal ya lo resolvió antes. Guard sólo para angostar
    // tipos, mismo criterio que el resto del motor ante estados imposibles.
    return undefined
  }

  return {
    ufNombre: uf?.nombre ?? GUION,
    localEtiqueta: uf !== undefined && local !== undefined ? etiquetaHumanaDeLocal(uf, local) : 'Local (no encontrado)',
    artefactoNombre: nombreDeArtefacto(proyecto, catalogoArtefactos, referencia),
    red: proyecto.redHidraulica?.tramos.find((t) => t.nodoDestinoId === nodoId)?.red,
    cotaTerminal_m,
    origenTexto,
    presionDisponible_mca,
    desnivel_m: resultado.desnivel_m,
    hfDistribuida_mca: resultado.hfDistribuida_mca,
    hfLocalizada_mca: resultado.hfLocalizada.hf_mca,
    metodologiaHfLocalizada: resultado.hfLocalizada.metodologia,
    hfMedidor_mca,
    hfEquipoACS_mca: undefined,
    presionResidual_mca: resultado.presionResidual_mca,
    presionMinimaRequerida_mca: resultado.presionMinimaRequerida_mca,
    margen_mca: resultado.presionResidual_mca - resultado.presionMinimaRequerida_mca,
    cumpleMinimo: resultado.cumpleMinimo,
  }
}

type ReferenciaDeLocalDelCritico = { readonly unidadFuncionalId: string; readonly localId: string; readonly red: RedDeTramo }

function resolverSeccionVerificacion(
  proyecto: Proyecto,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  coeficientesMayoracion: readonly TipoProyectoNormativo[],
): {
  readonly seccion: SeccionVerificacionDeInforme
  readonly criticoRef: ReferenciaDeLocalDelCritico | undefined
  readonly peloDeAguaMinimoEfectivo: PeloDeAguaMinimoEfectivo
} {
  const { entradas, estadoModulo2 } = resolverResolucionDeModulo2(proyecto, catalogoArtefactos, coeficientesMayoracion)

  const nodoIdCritico = estadoModulo2.estado === 'completo' ? estadoModulo2.terminalMasDesfavorable.nodoId : undefined
  const filas = estadoModulo2.candidatos.map((candidato) =>
    resolverFilaDeVerificacion(proyecto, candidato, catalogoArtefactos, entradas.hfMedidorDeTerminal, nodoIdCritico),
  )

  const motivosDeIncompletitud = estadoModulo2.estado === 'incompleto'
    ? agruparMotivosDeModulo2(estadoModulo2.motivos, proyecto.unidadesFuncionales)
    : []

  const candidatoCritico =
    nodoIdCritico === undefined
      ? undefined
      : estadoModulo2.candidatos.find(
          (c): c is typeof c & { readonly resultado: { readonly tipo: 'balanceCompleto' } } =>
            c.nodoId === nodoIdCritico && c.resultado.tipo === 'balanceCompleto',
        )
  const desarrolloCritico =
    candidatoCritico === undefined || entradas.presionDisponible_mca === undefined
      ? undefined
      : resolverDesarrolloCritico(
          proyecto,
          candidatoCritico,
          catalogoArtefactos,
          entradas.hfMedidorDeTerminal,
          entradas.presionDisponible_mca,
          entradas.origenTexto,
        )

  const nodo = nodoIdCritico === undefined ? undefined : proyecto.redHidraulica?.nodos.find((n) => n.id === nodoIdCritico)
  const referenciaCritico = nodo?.referencia?.tipo === 'artefacto' ? nodo.referencia : undefined
  const redCritico = nodoIdCritico === undefined ? undefined : proyecto.redHidraulica?.tramos.find((t) => t.nodoDestinoId === nodoIdCritico)?.red
  const criticoRef: ReferenciaDeLocalDelCritico | undefined =
    referenciaCritico === undefined || redCritico === undefined
      ? undefined
      : { unidadFuncionalId: referenciaCritico.unidadFuncionalId, localId: referenciaCritico.localId, red: redCritico }

  return {
    seccion: {
      estadoGlobal: estadoModulo2.estado,
      origenTexto: entradas.origenTexto,
      presionDisponibleTexto:
        entradas.presionDisponible_mca === undefined ? undefined : `${formatearNumero(entradas.presionDisponible_mca, 'm')} m.c.a.`,
      filas,
      terminalCriticoNodoId: nodoIdCritico,
      motivosDeIncompletitud,
      desarrolloCritico,
    },
    criticoRef,
    peloDeAguaMinimoEfectivo: entradas.peloDeAguaMinimoEfectivo,
  }
}

// ---------------------------------------------------------------------
// M3 -- Medidores (REPORT-01C). Pasa a través del resultado del motor
// (ResultadoModulo3/Parcial) casi sin remodelar -- el renderer arma sus
// propios textos con formatearNumero, igual que ya hace con resultadoM1.
// Ningún Qcl/C/hf se recalcula acá.
// ---------------------------------------------------------------------

export type SeccionM3DeInforme = {
  readonly estado: EstadoModulo3['estado']
  readonly resultado: ResultadoModulo3 | undefined
  readonly parcial: ResultadoModulo3Parcial | undefined
  readonly esPropiedadHorizontal: boolean | undefined
  // true si al menos una UF del proyecto tiene provisión de ACS individual
  // (CRIT-A34, brief §10): habilita la nota de alcance ("el medidor de
  // agua fría también alcanza el recorrido de agua caliente de esa UF").
  readonly hayACSIndividual: boolean
  readonly motivosDeIncompletitud: readonly string[]
}

function resolverSeccionM3(
  proyecto: Proyecto,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  coeficientesMayoracion: readonly TipoProyectoNormativo[],
): SeccionM3DeInforme {
  const estadoModulo3 = resolverEstadoModulo3(proyecto, catalogoArtefactos, coeficientesMayoracion)
  const configuracionMedidores = proyecto.configuracionMedidores
  const esPropiedadHorizontal = configuracionMedidores?.esPropiedadHorizontal
  const hayACSIndividual =
    configuracionMedidores !== undefined &&
    esPropiedadHorizontal === true &&
    proyecto.unidadesFuncionales.some(
      (uf) => tipoProvisionACSEfectivo(configuracionMedidores, uf.id) === 'individual',
    )

  if (estadoModulo3.estado === 'evaluado') {
    return { estado: 'evaluado', resultado: estadoModulo3.resultado, parcial: undefined, esPropiedadHorizontal, hayACSIndividual, motivosDeIncompletitud: [] }
  }
  if (estadoModulo3.estado === 'incompleto') {
    return {
      estado: 'incompleto',
      resultado: undefined,
      parcial: estadoModulo3.parcial,
      esPropiedadHorizontal,
      hayACSIndividual,
      motivosDeIncompletitud: estadoModulo3.motivos.map(describirMotivoIncompletitudModulo3),
    }
  }
  if (estadoModulo3.estado === 'error') {
    return {
      estado: 'error',
      resultado: undefined,
      parcial: undefined,
      esPropiedadHorizontal,
      hayACSIndividual,
      motivosDeIncompletitud: estadoModulo3.problemas.map((p) => describirProblemaDeValidacion(p.problema.codigo)),
    }
  }
  return { estado: 'noIniciado', resultado: undefined, parcial: undefined, esPropiedadHorizontal, hayACSIndividual, motivosDeIncompletitud: [] }
}

// ---------------------------------------------------------------------
// M4 -- Alimentación y reserva (REPORT-01C). Mismo criterio que M3: pasa
// a través de ResultadoModulo4 (esquema/conexión/reserva/adopción) sin
// remodelar -- ningún Qconn/Pcalc/Dc/VReserva se recalcula acá.
// ---------------------------------------------------------------------

export type SeccionM4DeInforme = {
  readonly estado: EstadoModulo4['estado']
  readonly esquema: EsquemaDeAbastecimiento | undefined
  readonly resultado: ResultadoModulo4 | undefined
  readonly motivosDeIncompletitud: readonly string[]
  // CRIT-A39: sólo tiene sentido con esquema 'tanqueElevado'. Se reutiliza
  // el mismo valor ya resuelto para la Verificación (brief §22: no
  // recalcular), no se vuelve a llamar resolverPeloDeAguaMinimoEfectivo.
  readonly peloDeAguaMinimoEfectivo: PeloDeAguaMinimoEfectivo
}

function resolverSeccionM4(
  proyecto: Proyecto,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  coeficientesMayoracion: readonly TipoProyectoNormativo[],
  peloDeAguaMinimoEfectivo: PeloDeAguaMinimoEfectivo,
): SeccionM4DeInforme {
  const estadoModulo4 = resolverEstadoModulo4({ proyecto, catalogoArtefactos, coeficientesMayoracion })
  const esquema = proyecto.configuracionAbastecimiento?.esquema

  if (estadoModulo4.estado === 'evaluado') {
    return { estado: 'evaluado', esquema, resultado: estadoModulo4.resultado, motivosDeIncompletitud: [], peloDeAguaMinimoEfectivo }
  }
  if (estadoModulo4.estado === 'incompleto') {
    return {
      estado: 'incompleto',
      esquema,
      resultado: undefined,
      motivosDeIncompletitud: estadoModulo4.motivos.map(describirMotivoIncompletitudModulo4),
      peloDeAguaMinimoEfectivo,
    }
  }
  if (estadoModulo4.estado === 'error') {
    return {
      estado: 'error',
      esquema,
      resultado: undefined,
      motivosDeIncompletitud: estadoModulo4.problemas.map((p) => describirProblemaDeValidacion(p.problema.codigo)),
      peloDeAguaMinimoEfectivo,
    }
  }
  return { estado: 'noIniciado', esquema, resultado: undefined, motivosDeIncompletitud: [], peloDeAguaMinimoEfectivo }
}

// ---------------------------------------------------------------------
// Snapshot final
// ---------------------------------------------------------------------

export type DatosDeInforme = {
  readonly proyecto: Proyecto
  readonly resultadoM1: ResultadoDeCalculo
  readonly unidadesFuncionalesM1: readonly UnidadFuncionalDeInforme[]
  readonly m2: SeccionM2DeInforme
  readonly verificacion: SeccionVerificacionDeInforme
  readonly m3: SeccionM3DeInforme
  readonly m4: SeccionM4DeInforme
  // Resumen corto de origen -- se sigue usando en la cabecera de la
  // Verificación (brief §20 de REPORT-01A); la sección M4 completa (§15 de
  // REPORT-01C) es ahora la fuente extendida del mismo dato.
  readonly origenM4Texto: string
}

function resolverOrigenM4Texto(resultado: ResultadoModulo4 | undefined): string {
  if (resultado === undefined) {
    return 'Origen hidráulico no determinado todavía'
  }
  if (resultado.tipo === 'sinReservaPorTanque') {
    return 'Alimentación directa (sin tanque de reserva)'
  }
  return resultado.esquema === 'tanqueElevado' ? 'Tanque elevado' : 'Cisterna + bombeo + tanque elevado'
}

export function resolverDatosDeInforme(
  proyecto: Proyecto,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  coeficientesMayoracion: readonly TipoProyectoNormativo[],
): DatosDeInforme {
  const resultadoM1 = calcularSimultaneidad({ proyecto, normativa: { catalogoArtefactos, coeficientesMayoracion } })
  const unidadesFuncionalesM1 = proyecto.unidadesFuncionales.map(resolverUnidadFuncionalDeInforme)
  // Verificación primero: su terminal crítico (si lo hay) es el caso
  // representativo preferido del desarrollo de cálculo de M2 (une
  // narrativamente ambas secciones, brief REPORT-01B §8).
  const {
    seccion: verificacion,
    criticoRef,
    peloDeAguaMinimoEfectivo,
  } = resolverSeccionVerificacion(proyecto, catalogoArtefactos, coeficientesMayoracion)
  const m2 = resolverSeccionM2(proyecto, catalogoArtefactos, criticoRef)
  const m3 = resolverSeccionM3(proyecto, catalogoArtefactos, coeficientesMayoracion)
  const m4 = resolverSeccionM4(proyecto, catalogoArtefactos, coeficientesMayoracion, peloDeAguaMinimoEfectivo)
  const origenM4Texto = resolverOrigenM4Texto(m4.resultado)

  return { proyecto, resultadoM1, unidadesFuncionalesM1, m2, verificacion, m3, m4, origenM4Texto }
}
