// MODE-UX-01 (D-δ.89): "Modo de trabajo" (Rápido / Profesional) es
// CONFIGURACIÓN GLOBAL EXPLÍCITA DEL PROYECTO -- un único control, en la
// cabecera global. El estado visual activo proviene de
// `Proyecto.modoTrabajo` (vía `resolverModoDeTrabajo`, que además cubre la
// compatibilidad legacy), NUNCA de comparar la configuración hidráulica.
// Los botones aplican `aplicarModoRapido` / `aplicarModoProfesional`, que
// fijan el campo y aplican/restauran el preset del modo -- cambiar luego un
// control hidráulico NO altera el modo.
import type { Proyecto } from '../../modelo/proyecto'
import { aplicarModoProfesional, aplicarModoRapido, resolverModoDeTrabajo } from './modoDeTrabajo'

export function SelectorDeModoDeTrabajo({
  proyecto,
  onCambiar,
}: {
  proyecto: Proyecto
  onCambiar: (proyecto: Proyecto) => void
}) {
  const modo = resolverModoDeTrabajo(proyecto)
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
    </div>
  )
}
