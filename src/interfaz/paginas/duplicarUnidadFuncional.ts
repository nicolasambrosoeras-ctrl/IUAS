// Duplicacion funcional profunda de una UnidadFuncional (UX-1). Vive fuera
// de MotorDemandaPantalla.tsx para poder testearse sin arrastrar React/JSX:
// vitest corre con environment 'node' (vite.config.ts), sin DOM ni
// testing-library configurados, y este archivo no necesita ninguno de los
// dos.
import type { Artefacto, Local, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import { generarId } from './generarId'
import { sincronizarConectividadFisicaDeArtefacto } from './sincronizarConectividadFisicaDeArtefacto'

// Privadas a este archivo a proposito: no son una API generica de
// clonacion, son los dos pasos internos que necesita duplicarUnidadFuncional
// para reconstruir su arbol. No se exportan como abstraccion reutilizable
// para Locales (eso queda para cuando exista duplicarLocal como incremento
// propio).
function duplicarArtefacto(artefacto: Artefacto): Artefacto {
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

// Inserta la copia inmediatamente despues de la UF origen dentro de
// proyecto.unidadesFuncionales y sincroniza la conectividad fisica de sus
// Artefactos clonados en redHidraulica.
//
// D-δ.50: la copia funcional por si sola deja todos los Artefactos
// clonados sin ninguna referencia fisica en redHidraulica -- la auditoria
// de cobertura (S1, auditarCoberturaFisica) los reportaria como
// "artefactos normativos sin conexion fisica", y el Panel de Presion de M2
// nunca se renderizaria para la UF nueva. Se los hace pasar, uno por uno,
// por exactamente la misma sincronizacion M2-D de ALTA que usa la UI al
// agregar un Artefacto a mano (bootstrap / retrofit / hermano, D-δ.49):
// la copia comparte la raiz AF/AC del proyecto y cada Local clonado
// arranca sin terminales, asi que el primer Artefacto de cada Red hace
// bootstrap y los siguientes retrofit/hermano. No se reimplementa ninguna
// primitiva topologica exclusiva de "duplicar" (brief seccion 5).
//
// La sincronizacion deduce AF/AC por precedente: la UF original -- que
// sigue conectada -- siempre es precedente de cada tipo de Artefacto
// clonado. Si algun Artefacto original no estaba conectado (proyecto ya
// incompleto de antemano), su clon queda igualmente sin conexion, sin
// fabricar una: mismo estado que el original, la barrera de cobertura lo
// sigue senalando como siempre.
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

  for (const local of copia.locales) {
    for (const artefactoClonado of local.artefactos) {
      const sincronizacion = sincronizarConectividadFisicaDeArtefacto(
        resultado,
        copia.id,
        local.id,
        artefactoClonado.id,
      )
      if (sincronizacion.tipo === 'sincronizado') {
        resultado = sincronizacion.proyecto
      }
    }
  }

  return resultado
}
