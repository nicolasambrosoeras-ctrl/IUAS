// UX-02 / UI-01E (brief §47-52): "Modo de trabajo" (Rápido / Profesional)
// es CONFIGURACIÓN GLOBAL DEL PROYECTO -- un único control, en la cabecera
// global. No introduce estado nuevo (UI-CRIT-11): el modo se DERIVA de
// `configuracionHidraulica` (granularidad + método de pérdida localizada)
// vía `resolverModoDeTrabajo`, y los botones aplican `aplicarModoRapido` /
// `aplicarModoProfesional` -- exactamente los mismos updaters que ya usaba
// M2. M1 / M2 / M4 siguen consumiendo el modo igual que antes.
import type { Proyecto } from '../../modelo/proyecto'
import {
  aplicarModoProfesional,
  aplicarModoRapido,
  ETIQUETA_MODO_DE_TRABAJO,
  resolverModoDeTrabajo,
} from './modoDeTrabajo'

export function SelectorDeModoDeTrabajo({
  proyecto,
  onCambiar,
}: {
  proyecto: Proyecto
  onCambiar: (proyecto: Proyecto) => void
}) {
  const modo = resolverModoDeTrabajo(proyecto.configuracionHidraulica)
  return (
    <div className="app-modo">
      <span className="app-modo__etiqueta" id="app-modo-etiqueta">
        Modo de trabajo
      </span>
      <span className="ui-segmented" role="group" aria-labelledby="app-modo-etiqueta">
        <button
          type="button"
          className="ui-segmented__opcion"
          aria-pressed={modo === 'rapido'}
          onClick={() => onCambiar(aplicarModoRapido(proyecto))}
        >
          Rápido
        </button>
        <button
          type="button"
          className="ui-segmented__opcion"
          aria-pressed={modo === 'profesional'}
          onClick={() => onCambiar(aplicarModoProfesional(proyecto))}
        >
          Profesional
        </button>
      </span>
      {modo === 'avanzado' ? (
        <span className="ui-badge ui-badge--muted">
          {ETIQUETA_MODO_DE_TRABAJO.avanzado} · combinación técnica personalizada
        </span>
      ) : null}
    </div>
  )
}
