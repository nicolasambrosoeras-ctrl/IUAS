// Estado y resultado de Módulo 3 (Medidores), D-δ.55. Primitiva de
// dominio, independiente de UI, que orquesta el cálculo completo de
// medidores del Proyecto componiendo las piezas ya cerradas de M3-B:
//
//   calcularSimultaneidad                       (Qc global del proyecto, CRIT-A5)
//   seleccionarMedidorGeneral                   (M3-B1, Tabla N°6 / CRIT-A32)
//   resolverAlcancesDeMedidoresIndividuales     (M3-B2b, CRIT-A34)
//   seleccionarMedidorIndividual                (M3-B2a, K=1 / CRIT-A33)
//
// No reimplementa ninguna fórmula ni regla; sólo compone y clasifica.
// NO conoce React, NO toca RedHidraulica, NO persiste nada (todo lo que
// devuelve se recalcula en cada llamada -> nunca hay resultado stale).
//
// Semántica de los cuatro estados:
//
//  - 'noIniciado': no existe `proyecto.configuracionMedidores`. Es un
//    estado explícito (igual que redHidraulica ausente para M2), NO un
//    default. `esPropiedadHorizontal: false` NO es 'noIniciado' -- es una
//    decisión válida que lleva a 'evaluado' con sólo el medidor general.
//
//  - 'error': inconsistencia estructural (override de ACS que apunta a una
//    UF inexistente; red hidráulica estructuralmente inválida cuando la
//    medición individual la necesita). NUNCA se usa 'error' para
//    Qc > Tabla N°6 -- eso es falta de cobertura normativa, no corrupción.
//
//  - 'incompleto': falta un insumo para evaluar todos los medidores
//    requeridos -- sin artefactos computables, Qc global indeterminado,
//    red ausente con propiedad horizontal, o algún caudal (general o
//    individual) por encima de los 40 m³/h de Tabla N°6 (sin extrapolar).
//
//  - 'evaluado': medidor general seleccionado y todos los medidores
//    individuales requeridos seleccionados, con su `hf`. NO lleva ningún
//    `todosCumplen`/`cumple`: hoy no existe verificación metrológica
//    (ERAS no publica Q1..Q4/Qmin) ni override manual cerrado -- 'evaluado'
//    significa "todos los medidores requeridos fueron seleccionados", no
//    "todos cumplen". Cuando exista una verificación independiente real se
//    agregará entonces, no antes.
import type { Proyecto } from '../../modelo/proyecto'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import type { TipoProyectoNormativo } from '../../normativa/eras-2023/coeficientes-mayoracion'
import type { ProblemaValidacion } from '../../validacion/codigos'
import { validarRedHidraulica } from '../../validacion/redHidraulica'
import { validarConfiguracionMedidores } from '../../validacion/configuracionMedidores'
import { calcularSimultaneidad } from '../demanda/simultaneidad/calcularSimultaneidad'
import { seleccionarMedidorGeneral } from '../medidores/seleccionarMedidorGeneral'
import {
  seleccionarMedidorIndividual,
  type AlcanceMedidorIndividual,
  type ServicioMedido,
} from '../medidores/seleccionarMedidorIndividual'
import { resolverAlcancesDeMedidoresIndividuales } from '../medidores/resolverAlcancesDeMedidoresIndividuales'
import { resolverMedidorAdoptado, type MedidorEvaluado } from '../medidores/resolverMedidorAdoptado'
import { claveDeAlcanceDeMedidor } from '../medidores/claveDeAlcanceDeMedidor'
import { tipoProvisionACSEfectivo } from './tipoProvisionACSEfectivo'

// Cada medidor evaluado (MedidorEvaluado, resolverMedidorAdoptado) trae
// `recomendado` y `adoptado` -- el DN adoptado es hidráulicamente efectivo
// (D-δ.57). Se compone además con el ámbito y, en el individual, con el
// alcance (que trae los consumos) -- ninguno duplica al otro.
export type ResultadoMedidorGeneral = MedidorEvaluado & { readonly ambito: 'general' }

export type ResultadoMedidorIndividual = MedidorEvaluado & {
  readonly ambito: 'individual'
  readonly unidadFuncionalId: string
  readonly servicioMedido: ServicioMedido
  readonly nConsumos: number
}

export type MedidorIndividualEvaluado = {
  readonly alcance: AlcanceMedidorIndividual
  readonly resultado: ResultadoMedidorIndividual
}

export type ResultadoModulo3 = {
  readonly medidorGeneral: ResultadoMedidorGeneral
  readonly medidoresIndividuales: readonly MedidorIndividualEvaluado[]
}

export type DiagnosticoErrorModulo3 = {
  readonly tipo: 'problemaDeValidacion'
  readonly problema: ProblemaValidacion
}

export type DiagnosticoIncompletitudModulo3 =
  | { readonly tipo: 'sinArtefactosComputables' }
  | { readonly tipo: 'qcGeneralIndeterminado'; readonly motivo: string }
  | {
      readonly tipo: 'medidorGeneralFueraDeTabla06'
      readonly qcDiseno_m3h: number
      readonly qcMaximoCubierto_m3h: number
    }
  | { readonly tipo: 'redHidraulicaAusenteParaMedicionIndividual' }
  | {
      readonly tipo: 'medidorIndividualFueraDeTabla06'
      readonly unidadFuncionalId: string
      readonly servicioMedido: AlcanceMedidorIndividual['servicioMedido']
      readonly qcDiseno_m3h: number
      readonly qcMaximoCubierto_m3h: number
    }

export type EstadoModulo3 =
  | { readonly estado: 'noIniciado' }
  | { readonly estado: 'error'; readonly problemas: readonly DiagnosticoErrorModulo3[] }
  | { readonly estado: 'incompleto'; readonly motivos: readonly DiagnosticoIncompletitudModulo3[] }
  | { readonly estado: 'evaluado'; readonly resultado: ResultadoModulo3 }

export function resolverEstadoModulo3(
  proyecto: Proyecto,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  coeficientesMayoracion: readonly TipoProyectoNormativo[],
): EstadoModulo3 {
  const { configuracionMedidores } = proyecto
  if (configuracionMedidores === undefined) {
    return { estado: 'noIniciado' }
  }

  // --- 'error': integridad estructural primero ---
  const problemasEstructurales: ProblemaValidacion[] = [...validarConfiguracionMedidores(proyecto)]
  if (configuracionMedidores.esPropiedadHorizontal && proyecto.redHidraulica !== undefined) {
    // La medición individual recorre la red para la conectividad física de
    // cada consumo (CRIT-A15); una red con ids duplicados o referencias
    // rotas haría fallar ese recorrido -- mismo gate que resolverEstadoModulo2.
    problemasEstructurales.push(...validarRedHidraulica(proyecto).filter((problema) => problema.severidad === 'error'))
  }
  if (problemasEstructurales.length > 0) {
    return {
      estado: 'error',
      problemas: problemasEstructurales.map((problema) => ({ tipo: 'problemaDeValidacion' as const, problema })),
    }
  }

  const motivos: DiagnosticoIncompletitudModulo3[] = []

  // --- medidor general: Qc global del proyecto (CRIT-A5) ---
  const nComputable = proyecto.unidadesFuncionales
    .flatMap((unidadFuncional) => unidadFuncional.locales)
    .flatMap((local) => local.artefactos)
    .filter((artefacto) => artefacto.origen === 'normativo')
    .reduce((total, artefacto) => total + artefacto.cantidad, 0)

  let medidorGeneral: ResultadoMedidorGeneral | undefined
  if (nComputable === 0) {
    // Sin artefactos computables no hay Qc global que calcular
    // (calcularSimultaneidad exige n >= 1). No se llama al motor de demanda
    // con n=0.
    motivos.push({ tipo: 'sinArtefactosComputables' })
  } else {
    const qcGlobal = calcularSimultaneidad({
      proyecto,
      normativa: { catalogoArtefactos, coeficientesMayoracion },
    }).resultados['qc']

    if (qcGlobal === undefined || 'estado' in qcGlobal || qcGlobal.valor <= 0) {
      motivos.push({
        tipo: 'qcGeneralIndeterminado',
        motivo:
          qcGlobal !== undefined && 'estado' in qcGlobal
            ? qcGlobal.motivo
            : 'El Qc global del proyecto no resolvió a un valor positivo.',
      })
    } else {
      const general = seleccionarMedidorGeneral(qcGlobal.valor)
      if (general.tipo === 'fueraDeTabla06') {
        motivos.push({
          tipo: 'medidorGeneralFueraDeTabla06',
          qcDiseno_m3h: general.qcDiseno_m3h,
          qcMaximoCubierto_m3h: general.qcMaximoCubierto_m3h,
        })
      } else {
        medidorGeneral = {
          ...resolverMedidorAdoptado(general, configuracionMedidores.medidorGeneralAdoptadoDN),
          ambito: 'general',
        }
      }
    }
  }

  // --- medidores individuales (sólo con propiedad horizontal) ---
  const medidoresIndividuales: MedidorIndividualEvaluado[] = []
  if (configuracionMedidores.esPropiedadHorizontal) {
    if (proyecto.redHidraulica === undefined) {
      motivos.push({ tipo: 'redHidraulicaAusenteParaMedicionIndividual' })
    } else {
      const tipoProvisionACSPorUnidadFuncional: Record<string, ReturnType<typeof tipoProvisionACSEfectivo>> = {}
      for (const unidadFuncional of proyecto.unidadesFuncionales) {
        tipoProvisionACSPorUnidadFuncional[unidadFuncional.id] = tipoProvisionACSEfectivo(
          configuracionMedidores,
          unidadFuncional.id,
        )
      }
      const alcances = resolverAlcancesDeMedidoresIndividuales(proyecto, catalogoArtefactos, {
        esPropiedadHorizontal: true,
        tipoProvisionACSPorUnidadFuncional,
      })
      for (const alcance of alcances) {
        const resultado = seleccionarMedidorIndividual(alcance)
        if (resultado.tipo === 'seleccionado') {
          const clave = claveDeAlcanceDeMedidor(alcance.unidadFuncionalId, alcance.servicioMedido)
          const dnAdoptado = configuracionMedidores.medidoresIndividualesAdoptadosDN?.[clave]
          medidoresIndividuales.push({
            alcance,
            resultado: {
              ...resolverMedidorAdoptado(resultado, dnAdoptado),
              ambito: 'individual',
              unidadFuncionalId: alcance.unidadFuncionalId,
              servicioMedido: alcance.servicioMedido,
              nConsumos: resultado.nConsumos,
            },
          })
        } else if (resultado.tipo === 'fueraDeTabla06') {
          motivos.push({
            tipo: 'medidorIndividualFueraDeTabla06',
            unidadFuncionalId: alcance.unidadFuncionalId,
            servicioMedido: alcance.servicioMedido,
            qcDiseno_m3h: resultado.qcDiseno_m3h,
            qcMaximoCubierto_m3h: resultado.qcMaximoCubierto_m3h,
          })
        }
        // 'sinConsumo' es inalcanzable: resolverAlcancesDeMedidoresIndividuales
        // nunca emite un alcance sin consumos (D-δ.54). Si ocurriera no
        // aporta un medidor -- se omite, no bloquea.
      }
    }
  }

  if (motivos.length > 0) {
    return { estado: 'incompleto', motivos }
  }

  // motivos vacío ⇒ nComputable > 0, Qc válido, medidor general
  // seleccionado, y (si PH) red presente sin ningún individual fuera de
  // tabla. `medidorGeneral` está definido por construcción.
  if (medidorGeneral === undefined) {
    throw new Error(
      'resolverEstadoModulo3: inconsistencia interna -- sin motivos de incompletitud pero el medidor general no quedó seleccionado',
    )
  }

  return { estado: 'evaluado', resultado: { medidorGeneral, medidoresIndividuales } }
}
