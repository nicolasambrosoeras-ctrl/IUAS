// Fixture HYD-EST para sensibilidad transversal. Es OTRA instalación de
// prueba con piezas y longitudes explícitas; no convierte proyectos del
// usuario ni modifica el demo. Mantiene sus artefactos y condiciones M1/3/4.
import type { Proyecto } from '../../modelo/proyecto'
import type { Tramo } from '../../modelo/redHidraulica'

export function ejemploConBifurcacionesDefinidas(proyecto: Proyecto): Proyecto {
  const red = proyecto.redHidraulica!
  const origenes: Readonly<Record<string, string>> = {
    't-af-acs': 'prueba-general-1', 't-af-toilette': 'prueba-general-2',
    't-af-cocina': 'prueba-general-3', 't-af-lavadero': 'prueba-general-4', 't-af-patio': 'prueba-general-4',
    't-af-ducha': 'prueba-bano-af-1', 't-af-bidet': 'prueba-bano-af-2', 't-af-inodoro': 'prueba-bano-af-2',
    't-ac-toilette': 'prueba-acs-1', 't-ac-cocina': 'prueba-acs-2', 't-ac-lavadero': 'prueba-acs-2',
    't-ac-ducha': 'prueba-bano-ac-1', 't-ac-bidet': 'prueba-bano-ac-1',
  }
  const segmentos: readonly [string, string, 'AF' | 'AC'][] = [
    ['n-0', 'prueba-general-1', 'AF'], ['prueba-general-1', 'prueba-general-2', 'AF'],
    ['prueba-general-2', 'prueba-general-3', 'AF'], ['prueba-general-3', 'prueba-general-4', 'AF'],
    ['n-af-1', 'prueba-bano-af-1', 'AF'], ['prueba-bano-af-1', 'prueba-bano-af-2', 'AF'],
    ['n-acs', 'prueba-acs-1', 'AC'], ['prueba-acs-1', 'prueba-acs-2', 'AC'],
    ['n-ac-1', 'prueba-bano-ac-1', 'AC'],
  ]
  const tramos: Tramo[] = segmentos.map(([desde, hasta, tipo]) => ({
    id: `t-${hasta}`, nodoOrigenId: desde, nodoDestinoId: hasta, red: tipo,
    longitud_m: 1, dnComercialAdoptado: '32 mm', accesorios: [],
  }))
  return { ...proyecto, redHidraulica: {
    nodos: [...red.nodos, ...segmentos.map(([, id]) => ({ id }))],
    tramos: [...red.tramos.map(t => origenes[t.id] === undefined ? t : { ...t, nodoOrigenId: origenes[t.id]! }), ...tramos],
  } }
}
