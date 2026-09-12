// Duplicacion funcional profunda de una UnidadFuncional (UX-1). Vive fuera
// de MotorDemandaPantalla.tsx para poder testearse sin arrastrar React/JSX:
// vitest corre con environment 'node' (vite.config.ts), sin DOM ni
// testing-library configurados, y este archivo no necesita ninguno de los
// dos.
import type { Artefacto, Local, Nivel, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { RedDeTramo } from '../../modelo/redHidraulica'
import { determinarConectividadFisica } from '../../motor/tuberias/caudal/determinarConectividadFisica'
import { redesDeConectividadFisica } from '../../motor/tuberias/topologia/resolverConectividadInicialDeArtefacto'
import { generarId } from './generarId'
import { sincronizarConectividadFisicaDeArtefactoConRedesDeclaradas } from './sincronizarConectividadFisicaDeArtefacto'
import { backfillLongitudesDePredimensionamiento } from './backfillLongitudesDePredimensionamiento'

// `duplicarArtefacto` es privada a proposito: paso interno sin sentido
// fuera de clonar un Local completo. `duplicarLocal` SI se exporta --
// UI-M1-DUPLICAR-LOCAL-01 la reutiliza para duplicar un Local suelto
// dentro de su mismo Nivel (ver duplicarLocalEnNivel.ts), mismo criterio
// de clonado profundo con ids nuevos que acá.
function duplicarArtefacto(artefacto: Artefacto): Artefacto {
  // El spread copia `conectividadElegida` (CAT-CONN-01) tal cual: la copia
  // representa el MISMO artefacto físico, con la misma decisión de
  // alimentación que el original.
  return { ...artefacto, id: generarId('artefacto') }
}

export function duplicarLocal(local: Local): Local {
  return { ...local, id: generarId('local'), artefactos: local.artefactos.map(duplicarArtefacto) }
}

// UI-M1-MULTINIVEL-01: nombre/nivel/cotaHidraulicaReferencia_m del Nivel
// (D-δ.46, ahora del Nivel en vez de la UF) se preservan tal cual por el
// spread -- mismo criterio que cualquier otro campo no listado acá
// explícitamente. Duplicar un Nivel asume que la copia representa el
// MISMO plano físico (mismo nivel, misma cota) que el usuario luego edita
// a mano si corresponde.
function duplicarNivel(nivel: Nivel): Nivel {
  return { ...nivel, id: generarId('nivel'), locales: nivel.locales.map(duplicarLocal) }
}

// Duplicar una UF copia TODOS sus niveles (sección 25 del brief
// UI-M1-MULTINIVEL-01), no solo el primero -- una UF dúplex se duplica
// como otra UF dúplex, nunca colapsada a un único nivel.
export function duplicarUnidadFuncional(unidadFuncional: UnidadFuncional): UnidadFuncional {
  return {
    ...unidadFuncional,
    id: generarId('uf'),
    nombre: `${unidadFuncional.nombre} (copia)`,
    niveles: unidadFuncional.niveles.map(duplicarNivel),
  }
}

// Conectividad física con la que hay que reproducir un artefacto clonado,
// como conjunto de Redes. CAT-CONN-01: NO se consulta el precedente del
// proyecto ni la política de catálogo -- duplicar debe CONSERVAR la
// conectividad diseñada del objeto duplicado, aunque sea no estándar
// (p. ej. un `lavavajillasIndustrial` que el usuario seleccionó AF+AC, o
// un `maquinaLavavajillas` personalizado a AF+AC).
//
//   - con `conectividadElegida` explícita  -> esa, tal cual;
//   - sin override (instancia legacy)      -> se deriva de la topología
//     REAL del original, que en este punto sigue conectado;
//   - original sin ningún terminal físico  -> `[]`: el clon queda sin
//     conexión igual que el original (proyecto ya incompleto de antemano),
//     sin fabricar una.
//
// Exportada: UI-M1-DUPLICAR-LOCAL-01 la reutiliza tal cual para duplicar
// un Local suelto (mismo criterio CAT-CONN-01 que duplicar una UF entera).
export function redesObjetivoParaClon(
  proyecto: Proyecto,
  unidadFuncionalOriginalId: string,
  localOriginalId: string,
  artefactoOriginal: Artefacto,
): readonly RedDeTramo[] {
  if (artefactoOriginal.conectividadElegida !== undefined) {
    return redesDeConectividadFisica(artefactoOriginal.conectividadElegida)
  }

  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    return []
  }
  const referencia = {
    tipo: 'artefacto' as const,
    unidadFuncionalId: unidadFuncionalOriginalId,
    localId: localOriginalId,
    artefactoId: artefactoOriginal.id,
  }
  const tieneTerminal = redHidraulica.nodos.some(
    (nodo) =>
      nodo.referencia?.tipo === 'artefacto' &&
      nodo.referencia.unidadFuncionalId === referencia.unidadFuncionalId &&
      nodo.referencia.localId === referencia.localId &&
      nodo.referencia.artefactoId === referencia.artefactoId,
  )
  if (!tieneTerminal) {
    return []
  }
  return redesDeConectividadFisica(determinarConectividadFisica(redHidraulica, referencia))
}

// Inserta la copia inmediatamente despues de la UF origen dentro de
// proyecto.unidadesFuncionales y sincroniza la conectividad fisica de sus
// Artefactos clonados en redHidraulica.
//
// D-δ.50 / CAT-CONN-01: la copia funcional por si sola deja todos los
// Artefactos clonados sin ninguna referencia fisica en redHidraulica -- la
// auditoria de cobertura (S1, auditarCoberturaFisica) los reportaria como
// "artefactos normativos sin conexion fisica", y el Panel de Presion de M2
// nunca se renderizaria para la UF nueva. Se los hace pasar, uno por uno,
// por la misma sincronizacion M2-D de ALTA con Redes declaradas que usa la
// UI (bootstrap / retrofit / hermano, D-δ.49). Las Redes se toman de la
// conectividad DISEÑADA del artefacto original (ver redesObjetivoParaClon),
// no de precedentes ni del catalogo: duplicar conserva exactamente la
// conectividad del objeto duplicado -- un industrial seleccionado AF+AC se
// clona AF+AC y no vuelve a preguntar. No se reimplementa ninguna
// primitiva topologica exclusiva de "duplicar" (brief seccion 5).
export function duplicarUnidadFuncionalEnProyecto(
  proyecto: Proyecto,
  unidadFuncionalId: string,
): Proyecto {
  const original = proyecto.unidadesFuncionales.find((uf) => uf.id === unidadFuncionalId)
  if (original === undefined) {
    return proyecto
  }

  const copia = duplicarUnidadFuncional(original)
  const unidadesFuncionales = proyecto.unidadesFuncionales.flatMap((uf) =>
    uf.id === unidadFuncionalId ? [uf, copia] : [uf],
  )
  let resultado: Proyecto = { ...proyecto, unidadesFuncionales }

  if (resultado.redHidraulica === undefined) {
    return resultado
  }

  // `copia.niveles[ni].locales[li].artefactos[ai]` corresponde 1:1 con
  // `original.niveles[ni].locales[li].artefactos[ai]` (duplicarUnidadFuncional
  // mapea en orden, sin filtrar ni reordenar, en los tres niveles de anidado).
  copia.niveles.forEach((nivelCopia, ni) => {
    const nivelOriginal = original.niveles[ni]
    if (nivelOriginal === undefined) {
      return
    }
    nivelCopia.locales.forEach((localCopia, li) => {
      const localOriginal = nivelOriginal.locales[li]
      if (localOriginal === undefined) {
        return
      }
      localCopia.artefactos.forEach((artefactoClonado, ai) => {
        const artefactoOriginal = localOriginal.artefactos[ai]
        if (artefactoOriginal === undefined) {
          return
        }
        const redes = redesObjetivoParaClon(proyecto, original.id, localOriginal.id, artefactoOriginal)
        if (redes.length === 0) {
          return
        }
        const sincronizacion = sincronizarConectividadFisicaDeArtefactoConRedesDeclaradas(
          resultado,
          copia.id,
          localCopia.id,
          artefactoClonado.id,
          redes,
        )
        if (sincronizacion.tipo === 'sincronizado') {
          resultado = sincronizacion.proyecto
        }
      })
    })
  })

  // D-δ.51: los Tramos recién creados para la copia (bootstrap/retrofit)
  // nacen sin longitud -- D-δ.50 decidió NO copiar el relevamiento físico
  // de la original. Este backfill solo los lleva del estado "undefined" a
  // un valor típico inicial (5 m Local+Red / 10 m Distribución general, si
  // la granularidad lo exige), nunca copia un 7,35 m de la original como
  // si fuera relevamiento de la copia. Las alimentaciones generales
  // compartidas ya existían: no se duplican.
  return backfillLongitudesDePredimensionamiento(resultado)
}
