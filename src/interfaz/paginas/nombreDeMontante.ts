// M2-TOPO-C §5: nombre HUMANO de un montante explícito. Ninguna superficie
// orientada al usuario debe mostrar el `Montante.id` (uuid / m-123abc): el
// id es la clave interna (props, keys, `Tramo.montanteId`, futuro grafo),
// sólo cambia lo que se pinta.
//
//   - `nombre` presente  -> se usa tal cual ("Montante AF dormitorios").
//   - `nombre` ausente    -> fallback DERIVADO y numerado POR RED en el
//                            orden de `Proyecto.montantes`: el 1.er
//                            montante AF es "Montante AF 1", el 2.º AF es
//                            "Montante AF 2", el 1.er AC es "Montante AC 1"
//                            -- las dos redes numeran por separado.
//
// El fallback NUNCA se materializa como `Montante.nombre`: se deriva en
// cada render, igual que `nombreDeUnidadFuncional`. Renombrar el montante o
// reordenar la lista se refleja de inmediato, sin cachear.
import type { Montante, Proyecto } from '../../modelo/proyecto'
import type { RedDeTramo } from '../../modelo/redHidraulica'

export function etiquetaDeRedDeMontante(red: RedDeTramo): string {
  return red === 'AF' ? 'AF' : 'AC'
}

// Fallback derivado para un montante dado su posición (1-based) entre los
// montantes de SU red. Público para poder reusarlo en listados que ya
// tienen el índice calculado sin volver a recorrer el proyecto.
export function nombreFallbackDeMontante(red: RedDeTramo, posicionEnRed: number): string {
  return `Montante ${etiquetaDeRedDeMontante(red)} ${posicionEnRed}`
}

export function nombreDeMontante(proyecto: Proyecto, montanteId: string): string {
  const montantes = proyecto.montantes ?? []
  const montante = montantes.find((candidato) => candidato.id === montanteId)
  if (montante === undefined) {
    return 'Montante (no encontrado)'
  }
  return nombreDeMontanteDeIdentidad(montantes, montante)
}

// Variante que evita el `find` cuando ya se tiene la identidad en mano
// (enumeración de la UI de M2). `montantes` debe ser la lista completa del
// Proyecto en su orden real -- de ahí sale la numeración por red.
export function nombreDeMontanteDeIdentidad(
  montantes: readonly Montante[],
  montante: Montante,
): string {
  if (montante.nombre !== undefined && montante.nombre.trim() !== '') {
    return montante.nombre
  }
  let posicionEnRed = 0
  for (const candidato of montantes) {
    if (candidato.red !== montante.red) {
      continue
    }
    posicionEnRed += 1
    if (candidato.id === montante.id) {
      break
    }
  }
  return nombreFallbackDeMontante(montante.red, Math.max(posicionEnRed, 1))
}
