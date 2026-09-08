// UX-02 / UI-01E (D-δ.77): pill de Red (AF / AC) con identidad cromática
// de CATEGORÍA FÍSICA (UI-CRIT-09), no de estado. Azul/celeste para Agua
// fría, salmón/rojo suave para Agua caliente -- nunca el rojo de error
// (AC no es una advertencia) ni el azul de "info fuerte". El color no es
// el único canal: la pill siempre lleva su texto ("Agua fría" / "Agua
// caliente"). Independiente de los badges de velocidad de M2 (§33).
//
// La variante se elige por el valor semántico `RedDeTramo`, no por
// selectores frágiles ni por el texto (§31). Usar este componente en todo
// lugar donde una pill represente la Red de un tramo/fila de M2.
import type { RedDeTramo } from '../../modelo/redHidraulica'
import { ETIQUETA_RED } from './humanizarModulo2'

export function BadgeDeRed({ red }: { red: RedDeTramo }) {
  const clase = red === 'AF' ? 'ui-badge ui-badge--red-fria' : 'ui-badge ui-badge--red-caliente'
  return <span className={clase}>{ETIQUETA_RED[red]}</span>
}
