// Duplicacion funcional profunda de una UnidadFuncional (UX-1). Vive fuera
// de MotorDemandaPantalla.tsx para poder testearse sin arrastrar React/JSX:
// vitest corre con environment 'node' (vite.config.ts), sin DOM ni
// testing-library configurados, y este archivo no necesita ninguno de los
// dos.
import type { Artefacto, Local, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { RedDeTramo } from '../../modelo/redHidraulica'
import { determinarConectividadFisica } from '../../motor/tuberias/caudal/determinarConectividadFisica'
import { redesDeConectividadFisica } from '../../motor/tuberias/topologia/resolverConectividadInicialDeArtefacto'
import { generarId } from './generarId'
import { sincronizarConectividadFisicaDeArtefactoConRedesDeclaradas } from './sincronizarConectividadFisicaDeArtefacto'
import { backfillLongitudesDePredimensionamiento } from './backfillLongitudesDePredimensionamiento'

// Privadas a este archivo a proposito: no son una API generica de
// clonacion, son los dos pasos internos que necesita duplicarUnidadFuncional
// para reconstruir su arbol. No se exportan como abstraccion reutilizable
// para Locales (eso queda para cuando exista duplicarLocal como incremento
// propio).
function duplicarArtefacto(artefacto: Artefacto): Artefacto {
  // El spread copia `conectividadElegida` (CAT-CONN-01) tal cual: la copia
  // representa el MISMO artefacto físico, con la misma decisión de
  // alimentación que el original.
  return { ...artefacto, id: generarId('artefacto') }
}

function duplicarLocal(local: Local): Local {
  return { ...local, id: generarId('local'), artefactos: local.artefactos.map(duplicarArtefacto) }
}

// nivel/cotaHidraulicaReferencia_m (D-δ.46) se preservan tal cual por el
// spread -- mismo criterio que cualquier otro campo no listado acá
// explícitamente (ver comentario de archivo: "copia profunda", no una
// reasignación de identidad/posición). Duplicar una UF asume que la
// copia representa la MISMA unidad física (mismo nivel, misma cota) que
// el usuario luego edita a mano si corresponde -- no hay ninguna regla
// de negocio que determine automáticamente un nivel "siguiente" para una
// copia (a diferencia de agregarUnidadFuncional, que sí ordena por
// cantidad ya existente).
export function duplicarUnidadFuncional(unidadFuncional: UnidadFuncional): UnidadFuncional {
  return {
    ...unidadFuncional,
    id: generarId('uf'),
    nombre: `${unidadFuncional.nombre} (copia)`,
    locales: unidadFuncional.locales.map(duplicarLocal),
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
function redesObjetivoParaClon(
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

  // `copia.locales[li].artefactos[ai]` corresponde 1:1 con
  // `original.locales[li].artefactos[ai]` (duplicarUnidadFuncional mapea en
  // orden, sin filtrar ni reordenar).
  copia.locales.forEach((localCopia, li) => {
    const localOriginal = original.locales[li]
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

  // D-δ.51: los Tramos recién creados para la copia (bootstrap/retrofit)
  // nacen sin longitud -- D-δ.50 decidió NO copiar el relevamiento físico
  // de la original. Este backfill solo los lleva del estado "undefined" a
  // un valor típico inicial (5 m Local+Red / 10 m Distribución general, si
  // la granularidad lo exige), nunca copia un 7,35 m de la original como
  // si fuera relevamiento de la copia. Las alimentaciones generales
  // compartidas ya existían: no se duplican.
  return backfillLongitudesDePredimensionamiento(resultado)
}
