// Qué Redes (AF/AC) necesita físicamente un nuevo Artefacto, deducido
// del PROPIO proyecto (M2-D, sincronización funcional -> hidráulica) --
// nunca del catálogo normativo. `ArtefactoNormativo.quCaliente_lps > 0`
// indica capacidad normativa de agua caliente, NO que este proyecto
// concreto decida conectarla físicamente: CRIT-A15 ya estableció que la
// conectividad física es una decisión de instalación real, independiente
// de lo que el catálogo permite (caso demostrado en el propio demo:
// inodoroDeposito tiene quCaliente_lps>0 en catálogo pero el proyecto lo
// conecta exclusivamente a AF). Adivinar la Red desde el catálogo
// violaría esa decisión ya cerrada.
//
// En cambio, este resolver mira cómo el PROPIO proyecto conecta hoy
// OTRAS instancias del mismo `artefactoId` de catálogo (en cualquier
// Local/UF) y, si todas coinciden en un único patrón, lo adopta como
// precedente para la instancia nueva -- reutiliza
// determinarConectividadFisica (CRIT-A15) sin reimplementarla. Si no hay
// ninguna instancia previa conectada de ese tipo, o si coexisten
// patrones distintos, no hay precedente inequívoco -- nunca se elige
// arbitrariamente ni se recurre al catálogo como respaldo.
import type { Proyecto } from '../../../modelo/proyecto'
import type { RedDeTramo } from '../../../modelo/redHidraulica'
import { determinarConectividadFisica, type ConectividadFisica } from '../caudal/determinarConectividadFisica'

export type ResultadoRedesFisicasPorPrecedente =
  | {
      readonly tipo: 'determinado'
      readonly redes: readonly RedDeTramo[]
    }
  | {
      // Ninguna otra instancia conectada de este artefactoId de catálogo
      // existe todavía en el proyecto: no hay de dónde tomar precedente.
      readonly tipo: 'sinPrecedente'
    }
  | {
      // Existen instancias previas conectadas, pero con patrones físicos
      // distintos entre sí -- no hay un único precedente que adoptar.
      readonly tipo: 'inconsistente'
      readonly patronesEncontrados: readonly ConectividadFisica[]
    }

function redesDeConectividad(conectividad: ConectividadFisica): readonly RedDeTramo[] {
  if (conectividad === 'ambas') return ['AF', 'AC']
  if (conectividad === 'soloAF') return ['AF']
  return ['AC']
}

export function determinarRedesFisicasPorPrecedente(
  proyecto: Proyecto,
  artefactoIdCatalogo: string,
  // D-δ.52 (CRIT-A15): al reconciliar la conectividad de UNA instancia
  // que acaba de cambiar de tipo, esa instancia NO debe contarse como
  // precedente de sí misma -- su conectividad está justamente en
  // transición (todavía tiene los terminales del tipo anterior). Se la
  // excluye por su id de instancia.
  excluirInstanciaId?: string,
): ResultadoRedesFisicasPorPrecedente {
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    return { tipo: 'sinPrecedente' }
  }

  const patrones = new Set<ConectividadFisica>()

  for (const unidadFuncional of proyecto.unidadesFuncionales) {
    for (const local of unidadFuncional.locales) {
      for (const artefacto of local.artefactos) {
        if (artefacto.artefactoId !== artefactoIdCatalogo || artefacto.id === excluirInstanciaId) {
          continue
        }

        const referencia = {
          tipo: 'artefacto' as const,
          unidadFuncionalId: unidadFuncional.id,
          localId: local.id,
          artefactoId: artefacto.id,
        }

        // determinarConectividadFisica lanza si la referencia no tiene
        // ningun terminal fisico alcanzable -- exactamente el caso de
        // una instancia todavia sin conectar, que no aporta precedente.
        // Se filtra antes de invocarla en vez de capturar la excepcion,
        // mismo criterio que el resto del motor (throw = precondicion,
        // no estado de dominio a manejar con try/catch).
        const tieneTerminal = redHidraulica.nodos.some(
          (nodo) =>
            nodo.referencia?.tipo === 'artefacto' &&
            nodo.referencia.unidadFuncionalId === referencia.unidadFuncionalId &&
            nodo.referencia.localId === referencia.localId &&
            nodo.referencia.artefactoId === referencia.artefactoId,
        )
        if (!tieneTerminal) {
          continue
        }

        patrones.add(determinarConectividadFisica(redHidraulica, referencia))
      }
    }
  }

  if (patrones.size === 0) {
    return { tipo: 'sinPrecedente' }
  }
  if (patrones.size > 1) {
    return { tipo: 'inconsistente', patronesEncontrados: [...patrones] }
  }

  return { tipo: 'determinado', redes: redesDeConectividad([...patrones][0] as ConectividadFisica) }
}
