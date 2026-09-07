// Determina la Red (AF/AC) del Tramo que alimenta directamente a un
// terminal, a partir de su tramo entrante -- necesario para desambiguar,
// en la Verificación de presión, entre el terminal AF y el terminal AC
// del MISMO Artefacto: describirReferenciaPendiente (ResultadoHidraulicoDeTramo.tsx)
// devuelve la misma etiqueta para ambos ("UF → Local → Artefacto"), ya
// que se deriva solo de la referencia funcional, no de la conectividad
// física -- sin esto, "Terminal más desfavorable" podía señalar, por
// ejemplo, "Unidad funcional 1 → Baño → Lavatorio" sin que el usuario
// pudiera saber si se trata del terminal de agua fría o del de agua
// caliente de esa misma canilla (D-δ.48).
import type { Proyecto } from '../../modelo/proyecto'
import type { RedDeTramo } from '../../modelo/redHidraulica'

export function resolverRedDeTerminal(proyecto: Proyecto, nodoId: string): RedDeTramo | undefined {
  return proyecto.redHidraulica?.tramos.find((tramo) => tramo.nodoDestinoId === nodoId)?.red
}
