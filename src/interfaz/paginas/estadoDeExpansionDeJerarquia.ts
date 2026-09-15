// UX-HIERARCHY-POLISH-01: estado de expansión/colapso de Nivel y Local --
// puramente de PRESENTACIÓN (vive en useState dentro de los componentes de
// MotorDemandaPantalla.tsx), nunca persistido en `Proyecto`, `.iuas`,
// localStorage ni autosave (mismo criterio que el colapso de Unidad
// Funcional, D-δ.76 / UX-01). Extraído a un módulo aparte, sin JSX, para
// poder testearse sin arrastrar React (mismo criterio que
// resumenDeUnidadFuncional.ts / duplicarUnidadFuncional.ts).
import type { Local, Nivel } from '../../modelo/proyecto'

// Alterna la pertenencia de `id` a un ReadonlySet inmutable -- mismo
// patrón que `alternarColapso` de UF en ProyectoFormulario, factorizado
// acá porque Nivel y Local lo reutilizan tal cual.
export function alternarEnConjunto(conjunto: ReadonlySet<string>, id: string): ReadonlySet<string> {
  const siguiente = new Set(conjunto)
  if (siguiente.has(id)) {
    siguiente.delete(id)
  } else {
    siguiente.add(id)
  }
  return siguiente
}

// Estado inicial (lazy init de useState, se calcula UNA sola vez al
// montar) de Niveles COLAPSADOS de una UF: el Nivel BASE (`niveles[0]`)
// siempre abierto, el resto colapsado. Con 0 o 1 Nivel no hay nada que
// colapsar -- la UI tampoco muestra chrome de colapso en ese caso
// (`esUnico`, ver NivelFormulario) -- conjunto vacío. Un Nivel agregado
// DESPUÉS del montaje (+ Agregar nivel) nunca entra a este set: nace
// abierto, no recolapsado retroactivamente.
export function estadoInicialDeNivelesColapsados(niveles: readonly Nivel[]): ReadonlySet<string> {
  if (niveles.length <= 1) {
    return new Set()
  }
  return new Set(niveles.slice(1).map((nivel) => nivel.id))
}

// Estado inicial de Locales COLAPSADOS de un Nivel: el primero abierto, el
// resto colapsado. Con 0 o 1 Local, conjunto vacío. Un Local agregado o
// duplicado DESPUÉS del montaje nunca entra a este set: nace abierto.
export function estadoInicialDeLocalesColapsados(locales: readonly Local[]): ReadonlySet<string> {
  if (locales.length <= 1) {
    return new Set()
  }
  return new Set(locales.slice(1).map((local) => local.id))
}
