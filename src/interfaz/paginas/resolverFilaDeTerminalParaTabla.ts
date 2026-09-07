// Fila de la tabla "Ver todos los terminales" del Panel de Presion
// (D-δ.50, brief secciones 28-29). Presentacion pura: deriva cada campo de
// lo que resolverPresionResidualDeCamino ya devuelve + la jerarquia
// funcional del terminal (UF/nivel/Local), nunca recalcula hidraulica ni
// reimplementa el criterio de terminal critico (usa el mismo
// margen = Presidual - PminRequerida que resolverTerminalMasDesfavorable).
import type { Proyecto } from '../../modelo/proyecto'
import type { ReferenciaDeArtefacto } from '../../modelo/redHidraulica'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import type { CandidatoTerminal } from '../../motor/tuberias/presion/resolverTerminalMasDesfavorable'
import { nombreDeArtefacto, ETIQUETA_RED } from './humanizarModulo2'
import { nombreDeNivel } from './nivelUnidadFuncional'
import { resolverRedDeTerminal } from './resolverRedDeTerminal'

const ETIQUETA_TIPO_DE_LOCAL: Readonly<Record<string, string>> = {
  bano: 'Baño',
  toilette: 'Toilette',
  cocina: 'Cocina',
  lavadero: 'Lavadero',
  cochera: 'Cochera',
  jardin: 'Jardín',
  otros: 'Otros',
}

export type FilaDeTerminal = {
  readonly nodoId: string
  readonly artefacto: string
  // "Unidad funcional 2 · Piso 1 · Baño" -- nunca ids tecnicos.
  readonly ubicacion: string
  readonly nivelTexto: string
  readonly redTexto: string
  readonly presidual_mca: number | undefined
  readonly pmin_mca: number | undefined
  readonly margen_mca: number | undefined
  readonly cumple: boolean | undefined
  readonly estadoTexto: string
  // Orden de presentacion (brief seccion 28): verificables por margen
  // ascendente primero, luego los incompletos, luego los sin Pmin normativa.
  readonly categoria: 'verificable' | 'incompleto' | 'sinPmin'
}

function estadoTextoDe(candidato: CandidatoTerminal): string {
  const r = candidato.resultado
  switch (r.tipo) {
    case 'balanceCompleto':
      return r.cumpleMinimo ? '✓ Cumple' : '✕ No cumple'
    case 'terminalSinPresionMinima':
      return 'Sin Pmin normativa publicada'
    case 'balanceIncompleto':
      return `Incompleto (falta ${r.terminosFaltantes.join(', ')})`
    case 'perdidaDistribuidaIncompleta':
      return 'Incompleto (falta longitud)'
    case 'perdidaLocalizadaIncompleta':
    case 'perdidaLocalizadaEstimadaIncompleta':
      return 'Incompleto (pérdida localizada)'
    case 'desnivelIncompleto':
      return 'Incompleto (falta cota)'
    case 'unidadFuncionalSinCotaDeReferencia':
      return 'Incompleto (falta cota de referencia de la UF)'
    case 'terminalSinArtefacto':
      return 'Sin artefacto asociado'
    case 'topologiaNoResoluble':
      return 'Topología no resoluble'
  }
}

function categoriaDe(candidato: CandidatoTerminal): FilaDeTerminal['categoria'] {
  if (candidato.resultado.tipo === 'balanceCompleto') return 'verificable'
  if (candidato.resultado.tipo === 'terminalSinPresionMinima') return 'sinPmin'
  return 'incompleto'
}

export function resolverFilaDeTerminalParaTabla(
  proyecto: Proyecto,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  referencia: ReferenciaDeArtefacto,
  candidato: CandidatoTerminal,
): FilaDeTerminal {
  const uf = proyecto.unidadesFuncionales.find((u) => u.id === referencia.unidadFuncionalId)
  const local = uf?.locales.find((l) => l.id === referencia.localId)
  const nivelTexto = uf?.nivel === undefined ? 'nivel sin clasificar' : nombreDeNivel(uf.nivel)
  const localTexto = local === undefined ? '' : ` · ${ETIQUETA_TIPO_DE_LOCAL[local.tipo] ?? local.tipo}`
  const ubicacion = `${uf?.nombre ?? referencia.unidadFuncionalId} · ${nivelTexto}${localTexto}`

  const red = resolverRedDeTerminal(proyecto, candidato.nodoId)
  const redTexto = red === undefined ? '—' : ETIQUETA_RED[red]

  const r = candidato.resultado
  const completo = r.tipo === 'balanceCompleto' ? r : undefined

  return {
    nodoId: candidato.nodoId,
    artefacto: nombreDeArtefacto(proyecto, catalogoArtefactos, referencia),
    ubicacion,
    nivelTexto,
    redTexto,
    presidual_mca: completo?.presionResidual_mca,
    pmin_mca: completo?.presionMinimaRequerida_mca,
    margen_mca:
      completo === undefined ? undefined : completo.presionResidual_mca - completo.presionMinimaRequerida_mca,
    cumple: completo?.cumpleMinimo,
    estadoTexto: estadoTextoDe(candidato),
    categoria: categoriaDe(candidato),
  }
}

// Ordena las filas para el listado (brief seccion 28): verificables por
// margen ascendente (el mas desfavorable primero, coincidiendo con
// terminalMasDesfavorable), luego incompletos, luego sin Pmin. Sort
// estable dentro de cada grupo salvo por margen.
export function ordenarFilasDeTerminales(filas: readonly FilaDeTerminal[]): readonly FilaDeTerminal[] {
  const rango: Record<FilaDeTerminal['categoria'], number> = { verificable: 0, incompleto: 1, sinPmin: 2 }
  return [...filas].sort((a, b) => {
    if (rango[a.categoria] !== rango[b.categoria]) {
      return rango[a.categoria] - rango[b.categoria]
    }
    return (a.margen_mca ?? 0) - (b.margen_mca ?? 0)
  })
}
