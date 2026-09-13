// REPORT-01A: snapshot DERIVADO y puro del informe técnico integral.
// Compone -- nunca recalcula -- lo que el dominio ya resuelve (M1/M2/M4):
// ningún Qc/DN/V/hf/Presidual se reimplementa acá, sólo se lee y formatea
// lo que devuelven resolverEstadoModulo2, resolverFilaDeDimensionamiento,
// proyectarMontante, etc. (ver comentario de archivo de
// generarDocumentoPdf.ts, C-05/ADR-012). NO se persiste: se recalcula por
// cada generación de PDF, igual que el resto de las proyecciones de
// presentación de M2 (montantesDelProyecto.ts, resolverResumenDeProyecto.ts).
import type { Local, Nivel, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { RedDeTramo } from '../../modelo/redHidraulica'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import type { TipoProyectoNormativo } from '../../normativa/eras-2023/coeficientes-mayoracion'
import type { ResultadoDeCalculo } from '../../modelo/resultado'
import { calcularSimultaneidad } from '../../motor/demanda/simultaneidad/calcularSimultaneidad'
import { crearContextoDeCalculoM2 } from '../../motor/tuberias/contextoDeCalculoM2'
import { resolverEstadoModulo4 } from '../../motor/modulo4/resolverEstadoModulo4'
import type { EstadoModulo2 } from '../../motor/modulo2/resolverEstadoModulo2'
import { resolverResolucionDeModulo2 } from '../../interfaz/paginas/resolverResolucionDeModulo2'
import { resolverFilaDeDimensionamiento } from '../../interfaz/paginas/resolverFilaDeDimensionamiento'
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
  readonly etiqueta: string
  readonly red: RedDeTramo
  readonly longitudTexto: string
  readonly dnTexto: string
  readonly diTexto: string
  readonly vTexto: string
  readonly qcTexto: string
  readonly hfDistribuidaTexto: string
  readonly hfLocalizadaTexto: string
  readonly perdidaTotalTexto: string
  readonly estadoTexto: string
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

export type SeccionM2DeInforme = {
  readonly hayRedHidraulica: boolean
  readonly metodoPerdidaLocalizada: 'estimado' | 'detallado'
  readonly distribucionGeneral: readonly FilaDeTuberiaDeInforme[]
  readonly locales: readonly GrupoDeLocalDeInforme[]
  readonly distribucionSecundaria: readonly FilaDeTuberiaDeInforme[]
  readonly montantes: readonly MontanteDeInforme[]
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
  const hfLocalizadaTexto =
    fila.hfLocalizadaEstimada_mca === undefined ? GUION : `${formatearNumero(fila.hfLocalizadaEstimada_mca, 'm')} m.c.a.`
  return {
    clave,
    etiqueta,
    red,
    longitudTexto: longitudTextoDeTramo(proyecto, tramoId),
    dnTexto: fila.dnTexto,
    diTexto: fila.dnTexto,
    vTexto: `${fila.vTexto} m/s`,
    qcTexto: fila.qcTexto,
    hfDistribuidaTexto: `${fila.hfDistribuidaTexto} m.c.a.`,
    hfLocalizadaTexto,
    perdidaTotalTexto: fila.perdidaTotalTexto,
    estadoTexto: fila.estadoTexto,
    artefactos: fila.artefactos,
  }
}

function resolverSeccionM2(
  proyecto: Proyecto,
  catalogoArtefactos: readonly ArtefactoNormativo[],
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

  return {
    hayRedHidraulica: true,
    metodoPerdidaLocalizada,
    distribucionGeneral,
    locales: [...gruposPorLocal.values()],
    distribucionSecundaria,
    montantes,
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

export type SeccionVerificacionDeInforme = {
  readonly estadoGlobal: EstadoModulo2['estado']
  readonly origenTexto: string
  readonly presionDisponibleTexto: string | undefined
  readonly filas: readonly FilaDeVerificacionDeInforme[]
  readonly terminalCriticoNodoId: string | undefined
  readonly motivosDeIncompletitud: readonly string[]
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

function resolverSeccionVerificacion(
  proyecto: Proyecto,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  coeficientesMayoracion: readonly TipoProyectoNormativo[],
): SeccionVerificacionDeInforme {
  const { entradas, estadoModulo2 } = resolverResolucionDeModulo2(proyecto, catalogoArtefactos, coeficientesMayoracion)

  const nodoIdCritico = estadoModulo2.estado === 'completo' ? estadoModulo2.terminalMasDesfavorable.nodoId : undefined
  const filas = estadoModulo2.candidatos.map((candidato) =>
    resolverFilaDeVerificacion(proyecto, candidato, catalogoArtefactos, entradas.hfMedidorDeTerminal, nodoIdCritico),
  )

  const motivosDeIncompletitud = estadoModulo2.estado === 'incompleto'
    ? agruparMotivosDeModulo2(estadoModulo2.motivos, proyecto.unidadesFuncionales)
    : []

  return {
    estadoGlobal: estadoModulo2.estado,
    origenTexto: entradas.origenTexto,
    presionDisponibleTexto:
      entradas.presionDisponible_mca === undefined ? undefined : `${formatearNumero(entradas.presionDisponible_mca, 'm')} m.c.a.`,
    filas,
    terminalCriticoNodoId: nodoIdCritico,
    motivosDeIncompletitud,
  }
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
  // Resumen de origen/reserva de M4 -- sólo lo necesario para dar contexto
  // a la verificación de presión (brief §20); M4 completo queda para
  // REPORT-01B.
  readonly origenM4Texto: string
}

function resolverOrigenM4Texto(proyecto: Proyecto, catalogoArtefactos: readonly ArtefactoNormativo[], coeficientesMayoracion: readonly TipoProyectoNormativo[]): string {
  const estadoM4 = resolverEstadoModulo4({ proyecto, catalogoArtefactos, coeficientesMayoracion })
  if (estadoM4.estado !== 'evaluado') {
    return 'Origen hidráulico no determinado todavía'
  }
  if (estadoM4.resultado.tipo === 'sinReservaPorTanque') {
    return 'Alimentación directa (sin tanque de reserva)'
  }
  return estadoM4.resultado.esquema === 'tanqueElevado' ? 'Tanque elevado' : 'Cisterna + bombeo + tanque elevado'
}

export function resolverDatosDeInforme(
  proyecto: Proyecto,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  coeficientesMayoracion: readonly TipoProyectoNormativo[],
): DatosDeInforme {
  const resultadoM1 = calcularSimultaneidad({ proyecto, normativa: { catalogoArtefactos, coeficientesMayoracion } })
  const unidadesFuncionalesM1 = proyecto.unidadesFuncionales.map(resolverUnidadFuncionalDeInforme)
  const m2 = resolverSeccionM2(proyecto, catalogoArtefactos)
  const verificacion = resolverSeccionVerificacion(proyecto, catalogoArtefactos, coeficientesMayoracion)
  const origenM4Texto = resolverOrigenM4Texto(proyecto, catalogoArtefactos, coeficientesMayoracion)

  return { proyecto, resultadoM1, unidadesFuncionalesM1, m2, verificacion, origenM4Texto }
}
