// M3-B2b — De la configuración física real del proyecto a los ALCANCES de
// medidores individuales que M3-B2a debe evaluar.
//
// Produce la lista de `AlcanceMedidorIndividual` (el input de
// `seleccionarMedidorIndividual`): por cada unidad funcional, qué ramales
// medidos existen y qué consumos atraviesa cada uno. NO selecciona el
// medidor, NO calcula pérdida, NO toca `RedHidraulica`, NO persiste nada.
//
// ── Fundamento normativo (ERAS-2023, Figuras 2.2–2.7 y 2.14–2.16,
//    reconstruidas desde fuentes oficiales/AySA — ver D-δ.54) ──
//
//  - §2.6: en propiedad horizontal (>1 propietario) es obligatorio un
//    sistema de medición individual por unidad, en "todos los ramales de
//    agua fría y caliente que abastezcan a cada unidad funcional". Los
//    medidores individuales no sustituyen al general.
//  - Fig. 2.16 + §2.19.5: en ACS **central** existe un ramal de agua
//    caliente que va "desde el medidor hasta la entrada a cada unidad
//    funcional" — es decir, un medidor individual de AC además del de AF.
//  - Fig. 2.14/2.15 + §2.19.4: el sistema central de ACS (acumulador,
//    recirculación, medidores de AC agrupados) es un caso físico
//    distinto del sistema individual (§2.19.1).
//  - Figs. 2.4–2.7 son variantes de **ubicación** del sector de
//    micromedición (sala exclusiva vs. gabinete sectorizado, con bombeo
//    o presurización): NO cambian el cálculo del medidor individual y NO
//    permiten inferir el tipo de ACS.
//
// ── Criterio físico (interpretación IUAS, ver D-δ.54 y CRIT-A34) ──
//
//  CASO 'individual' (producción de ACS dentro de la UF): desde
//  instalaciones comunes entra sólo el suministro de AF, medido. El
//  medidor individual de AF está aguas arriba de la división interna
//  AF-directa / AF→producción-ACS. Por conservación de masa contabiliza
//  TODO el consumo de agua de la UF: para cada artefacto su `quTotal`,
//  con independencia de a qué red(es) esté conectado físicamente. NO hay
//  medidor de AC (no existe un ramal común de AC entrando a la UF).
//  → 1 alcance por UF, `servicioMedido = 'aguaFria'`.
//
//  CASO 'central' (producción de ACS común): AF y AC llegan a la UF por
//  ramales comunes distintos, cada uno con su medidor. Para un artefacto
//  mixto: `quFría` al medidor de AF y `quCaliente` al de AC (suman
//  `quTotal`, sin doble conteo). Un artefacto de una sola red aporta su
//  `quTotal` a esa red.
//  → alcance de AF siempre (si hay consumo); alcance de AC sólo si hay
//    consumo de AC (no se crea un medidor de AC vacío).
//
// El tipo de provisión de ACS (`'individual' | 'central'`) es una
// **configuración física declarada por UF** — NO se infiere de la
// posición de `produccionACS` en `RedHidraulica` (inferencia frágil,
// descartada en D-δ.54). `RedHidraulica` sólo se usa para la
// conectividad física de cada artefacto (CRIT-A15), reutilizando
// `determinarConectividadFisica`.
//
// La suma con `K = 1` sobre estos consumos (simultaneidad total, §2.6 /
// CRIT-A33) y la selección por Tabla N°6 son responsabilidad de
// `seleccionarMedidorIndividual` — este módulo no las repite.
import type { Proyecto } from '../../modelo/proyecto'
import type { ReferenciaDeArtefacto } from '../../modelo/redHidraulica'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import {
  determinarConectividadFisica,
  type ConectividadFisica,
} from '../tuberias/caudal/determinarConectividadFisica'
import { resolverQuEfectivo } from '../tuberias/caudal/resolverQuEfectivo'
import type { AlcanceMedidorIndividual, ConsumoDeAlcance } from './seleccionarMedidorIndividual'

export type TipoProvisionACS = 'individual' | 'central'

export type ConfiguracionDeMedicionIndividual = {
  // Obligación normativa (§2.6): sólo con propiedad horizontal / más de un
  // propietario hay medición individual. `false` ⇒ ningún alcance.
  readonly esPropiedadHorizontal: boolean
  // Provisión de ACS declarada, por `unidadFuncionalId`. Se exige una
  // entrada por cada UF que tenga consumos conectados — nunca se asume un
  // modo por defecto (la diferencia individual/central cambia la
  // cardinalidad y el caudal de los medidores). Una configuración global
  // con override por UF, si encaja mejor con el modelo, se decide en M3-C;
  // este contrato puro ya distingue por UF.
  readonly tipoProvisionACSPorUnidadFuncional: Readonly<Record<string, TipoProvisionACS>>
}

function claveDeReferencia(referencia: ReferenciaDeArtefacto): string {
  return `${referencia.unidadFuncionalId}|${referencia.localId}|${referencia.artefactoId}`
}

type ConsumoConContexto = {
  readonly etiqueta: string
  readonly cantidad: number
  readonly artefactoNormativo: ArtefactoNormativo
  readonly conectividad: ConectividadFisica
}

// Contribución de un artefacto a cada red en el caso 'central'.
function contribucionesCentral(
  artefactoNormativo: ArtefactoNormativo,
  conectividad: ConectividadFisica,
): { readonly af_lps: number; readonly ac_lps: number } {
  if (conectividad === 'soloAF') {
    return { af_lps: resolverQuEfectivo(artefactoNormativo, 'total'), ac_lps: 0 }
  }
  if (conectividad === 'soloAC') {
    return { af_lps: 0, ac_lps: resolverQuEfectivo(artefactoNormativo, 'total') }
  }
  // 'ambas' (mixto): reparto fría/caliente del catálogo, que suma quTotal.
  return {
    af_lps: resolverQuEfectivo(artefactoNormativo, 'aguaFria'),
    ac_lps: resolverQuEfectivo(artefactoNormativo, 'aguaCaliente'),
  }
}

export function resolverAlcancesDeMedidoresIndividuales(
  proyecto: Proyecto,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  configuracion: ConfiguracionDeMedicionIndividual,
): readonly AlcanceMedidorIndividual[] {
  if (!configuracion.esPropiedadHorizontal) {
    return []
  }

  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    throw new Error(
      'resolverAlcancesDeMedidoresIndividuales: se requiere redHidraulica para determinar la conectividad ' +
        'física de cada consumo (CRIT-A15). Sin red no puede resolverse la medición individual.',
    )
  }

  // Referencias de artefacto con al menos un terminal físico en la red.
  const referenciasConectadas = new Set<string>()
  for (const nodo of redHidraulica.nodos) {
    if (nodo.referencia?.tipo === 'artefacto') {
      referenciasConectadas.add(claveDeReferencia(nodo.referencia))
    }
  }

  const alcances: AlcanceMedidorIndividual[] = []

  for (const unidadFuncional of proyecto.unidadesFuncionales) {
    const tipoProvisionACS = configuracion.tipoProvisionACSPorUnidadFuncional[unidadFuncional.id]
    if (tipoProvisionACS === undefined) {
      throw new Error(
        `resolverAlcancesDeMedidoresIndividuales: falta declarar tipoProvisionACS para la unidad funcional ` +
          `"${unidadFuncional.id}" (debe ser 'individual' o 'central').`,
      )
    }

    const consumos: ConsumoConContexto[] = []
    for (const local of unidadFuncional.locales) {
      for (const artefacto of local.artefactos) {
        // Computabilidad: sólo artefactos normativos (mismo criterio que el
        // resto del motor; `origen: 'usuario'` es un estado reservado no
        // operativo, ver PENDIENTES-DE-ARQUITECTURA.md).
        if (artefacto.origen !== 'normativo') {
          continue
        }
        const referencia: ReferenciaDeArtefacto = {
          tipo: 'artefacto',
          unidadFuncionalId: unidadFuncional.id,
          localId: local.id,
          artefactoId: artefacto.id,
        }
        // Artefacto declarado pero sin conexión física todavía: es una
        // brecha de cobertura (S1), no un consumo que este módulo deba
        // medir. Se omite sin fabricar nada.
        if (!referenciasConectadas.has(claveDeReferencia(referencia))) {
          continue
        }
        const artefactoNormativo = catalogoArtefactos.find((candidato) => candidato.id === artefacto.artefactoId)
        if (artefactoNormativo === undefined) {
          throw new Error(
            `resolverAlcancesDeMedidoresIndividuales: no existe ningún ArtefactoNormativo con id ` +
              `"${artefacto.artefactoId}" en el catálogo recibido`,
          )
        }
        consumos.push({
          etiqueta: `${local.id} · ${artefactoNormativo.nombre}`,
          cantidad: artefacto.cantidad,
          artefactoNormativo,
          conectividad: determinarConectividadFisica(redHidraulica, referencia),
        })
      }
    }

    if (consumos.length === 0) {
      // UF sin ningún consumo conectado: ningún medidor individual.
      continue
    }

    if (tipoProvisionACS === 'individual') {
      // Un único alcance de AF: el medidor de entrada ve TODO el caudal de
      // la UF (conservación de masa). `quTotal` para cada artefacto.
      const consumosAF: ConsumoDeAlcance[] = consumos.map((consumo) => ({
        etiqueta: consumo.etiqueta,
        cantidad: consumo.cantidad,
        qu_lps: resolverQuEfectivo(consumo.artefactoNormativo, 'total'),
      }))
      alcances.push({ unidadFuncionalId: unidadFuncional.id, servicioMedido: 'aguaFria', consumos: consumosAF })
      continue
    }

    // 'central': AF por contribución fría, AC por contribución caliente.
    const consumosAF: ConsumoDeAlcance[] = []
    const consumosAC: ConsumoDeAlcance[] = []
    for (const consumo of consumos) {
      const { af_lps, ac_lps } = contribucionesCentral(consumo.artefactoNormativo, consumo.conectividad)
      if (af_lps > 0) {
        consumosAF.push({ etiqueta: consumo.etiqueta, cantidad: consumo.cantidad, qu_lps: af_lps })
      }
      if (ac_lps > 0) {
        consumosAC.push({ etiqueta: consumo.etiqueta, cantidad: consumo.cantidad, qu_lps: ac_lps })
      }
    }
    if (consumosAF.length > 0) {
      alcances.push({ unidadFuncionalId: unidadFuncional.id, servicioMedido: 'aguaFria', consumos: consumosAF })
    }
    // Alcance de AC sólo si hay consumo de AC — nunca un medidor de AC vacío.
    if (consumosAC.length > 0) {
      alcances.push({ unidadFuncionalId: unidadFuncional.id, servicioMedido: 'aguaCaliente', consumos: consumosAC })
    }
  }

  return alcances
}
