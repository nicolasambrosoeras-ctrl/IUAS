// UI-M1-DUPLICAR-LOCAL-01 -- duplicar un Local suelto dentro de su MISMO
// Nivel (nunca cambia de Nivel ni de UF). Vive fuera de
// MotorDemandaPantalla.tsx para poder testearse sin arrastrar React/JSX,
// mismo criterio que agregarUnidadFuncional.ts / duplicarUnidadFuncional.ts.
//
// Reutiliza exactamente el mismo clonado profundo (`duplicarLocal`, ids
// nuevos para el Local y cada Artefacto) y la misma sincronización
// CAT-CONN-01 (`redesObjetivoParaClon` +
// `sincronizarConectividadFisicaDeArtefactoConRedesDeclaradas`) que
// `duplicarUnidadFuncionalEnProyecto` ya usa para cada Local al duplicar
// una UF completa -- acá es el mismo procedimiento aplicado a UN solo
// Local en vez de a todos los de la UF.
//
// GEOM-COTA-01 / herencia (sección 4 del brief): `duplicarLocal` clona el
// Local con un spread superficial -- si el original no tenía
// `cotaPiso_m` (hereda del Nivel), la copia tampoco lo tiene y sigue
// heredando; nunca se materializa el default como override. Mismo
// principio para `Artefacto.alturaHidraulicaSobrePiso_m`. Nada que hacer
// acá: es una consecuencia directa de reutilizar `duplicarLocal` tal cual.
//
// M2 (sección 7 del brief): la copia NO hereda topología física del
// original -- `redesObjetivoParaClon` sólo lee la conectividad DISEÑADA
// (`Artefacto.conectividadElegida`, o la derivada de la topología real del
// original) para decidir a qué Redes conectar los terminales NUEVOS de la
// copia; nunca copia `Tramo`, `montanteId`, tees, DN manual, longitudes ni
// accesorios. `sincronizarConectividadFisicaDeArtefactoConRedesDeclaradas`
// crea terminales/tramos frescos para la copia (mismo camino que
// "bootstrap" de un Local recién creado), nunca reutiliza los del
// original.
import type { Proyecto } from '../../modelo/proyecto'
import { duplicarLocal, redesObjetivoParaClon } from './duplicarUnidadFuncional'
import { sincronizarConectividadFisicaDeArtefactoConRedesDeclaradas } from './sincronizarConectividadFisicaDeArtefacto'
import { backfillLongitudesDePredimensionamiento } from './backfillLongitudesDePredimensionamiento'

export function duplicarLocalEnNivelDeUnidadFuncionalEnProyecto(
  proyecto: Proyecto,
  unidadFuncionalId: string,
  nivelId: string,
  localId: string,
): Proyecto {
  const unidadFuncional = proyecto.unidadesFuncionales.find((uf) => uf.id === unidadFuncionalId)
  const nivel = unidadFuncional?.niveles.find((n) => n.id === nivelId)
  const localOriginal = nivel?.locales.find((l) => l.id === localId)
  if (unidadFuncional === undefined || nivel === undefined || localOriginal === undefined) {
    return proyecto
  }

  const copia = duplicarLocal(localOriginal)

  // La copia se inserta INMEDIATAMENTE DESPUÉS del original dentro del
  // mismo Nivel (sección 6 del brief) -- nunca al final, nunca en otro Nivel.
  let resultado: Proyecto = {
    ...proyecto,
    unidadesFuncionales: proyecto.unidadesFuncionales.map((uf) =>
      uf.id !== unidadFuncionalId
        ? uf
        : {
            ...uf,
            niveles: uf.niveles.map((n) =>
              n.id !== nivelId
                ? n
                : { ...n, locales: n.locales.flatMap((l) => (l.id === localId ? [l, copia] : [l])) },
            ),
          },
    ),
  }

  if (resultado.redHidraulica === undefined) {
    return resultado
  }

  // `copia.artefactos[ai]` corresponde 1:1 con `localOriginal.artefactos[ai]`
  // (duplicarLocal mapea en orden, sin filtrar ni reordenar).
  copia.artefactos.forEach((artefactoClonado, ai) => {
    const artefactoOriginal = localOriginal.artefactos[ai]
    if (artefactoOriginal === undefined) {
      return
    }
    const redes = redesObjetivoParaClon(proyecto, unidadFuncionalId, localId, artefactoOriginal)
    if (redes.length === 0) {
      return
    }
    const sincronizacion = sincronizarConectividadFisicaDeArtefactoConRedesDeclaradas(
      resultado,
      unidadFuncionalId,
      copia.id,
      artefactoClonado.id,
      redes,
    )
    if (sincronizacion.tipo === 'sincronizado') {
      resultado = sincronizacion.proyecto
    }
  })

  // D-δ.51 (mismo criterio que duplicarUnidadFuncionalEnProyecto): los
  // Tramos recién creados para la copia nacen sin longitud -- este
  // backfill sólo los lleva a un valor típico inicial, nunca copia el
  // relevamiento físico del original.
  return backfillLongitudesDePredimensionamiento(resultado)
}
