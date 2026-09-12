// UI-M1-MULTINIVEL-01 -- extraído de MotorDemandaPantalla.tsx (eliminarNivel)
// para poder testearse sin arrastrar React/JSX, mismo criterio que
// agregarUnidadFuncional.ts / duplicarUnidadFuncional.ts.
//
// Eliminar un Nivel completo (sección 27 del brief): sus Locales dejan de
// existir con él -- se desconecta la conectividad física de cada uno (mismo
// principio que la baja de un Local suelto, D-δ.47) antes de que el Nivel
// desaparezca, para no dejar referencias huérfanas en redHidraulica. Nunca
// se mueven Locales a otro nivel en silencio.
//
// Una UF siempre conserva al menos 1 nivel (sección 14): si el nivel pedido
// es el único de la UF, o no existe, esta función es un no-op (devuelve el
// Proyecto sin tocar) -- la UI ni siquiera debe ofrecer la acción en ese
// caso (ver MotorDemandaPantalla, onEliminarNivel undefined con un único
// nivel), pero la función es defensiva por las dudas.
//
// FIX-M1-MULTINIVEL-BASE-LEVEL-01: `niveles[0]` es el nivel BASE de la UF
// y es permanente, incluso con 2+ niveles -- esta función lo protege por
// sí misma (no sólo la UI, que ya no ofrece la acción para él): pedir
// eliminar `niveles[0]?.id` es siempre un no-op, sin importar cuántos
// niveles adicionales existan. No depende de nombre, etiqueta `nivel` ni
// cota -- puramente posicional, válido mientras no exista reordenamiento.
import type { Proyecto } from '../../modelo/proyecto'
import { quitarConectividadFisicaDeLocal } from './quitarConectividadFisicaDeLocal'

export function eliminarNivelDeUnidadFuncionalEnProyecto(
  proyecto: Proyecto,
  unidadFuncionalId: string,
  nivelId: string,
): Proyecto {
  const unidadFuncional = proyecto.unidadesFuncionales.find((uf) => uf.id === unidadFuncionalId)
  const nivelAEliminar = unidadFuncional?.niveles.find((n) => n.id === nivelId)
  const esNivelBase = unidadFuncional?.niveles[0]?.id === nivelId
  if (
    unidadFuncional === undefined ||
    nivelAEliminar === undefined ||
    unidadFuncional.niveles.length <= 1 ||
    esNivelBase
  ) {
    return proyecto
  }

  const proyectoSinConectividad = nivelAEliminar.locales.reduce(
    (parcial, local) => quitarConectividadFisicaDeLocal(parcial, unidadFuncionalId, local.id),
    proyecto,
  )

  return {
    ...proyectoSinConectividad,
    unidadesFuncionales: proyectoSinConectividad.unidadesFuncionales.map((unidad) =>
      unidad.id !== unidadFuncionalId
        ? unidad
        : { ...unidad, niveles: unidad.niveles.filter((n) => n.id !== nivelId) },
    ),
  }
}
