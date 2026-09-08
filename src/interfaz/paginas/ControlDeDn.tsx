// D-δ.52 (Parte A): control compacto ↓ / DN / ↑ / Auto de un Tramo. El
// diámetro adoptado es hidráulicamente efectivo (el motor ya lo consume
// vía Tramo.dnComercialAdoptado) -- este componente sólo cambia esa
// denominación. ↑/↓ se mueven por el catálogo comercial real; se
// deshabilitan en los extremos.
//
// UI-01C (§31-32): presentación compacta coherente con el sistema visual
// (clases `.control-dn*` en sistema-visual.css, sin inline styles) y
// nombres accesibles explícitos en los botones. Comportamiento intacto.
import type { ControlDeDnDeTramo } from './resolverControlDeDnDeTramo'

export function ControlDeDn({
  control,
  onCambiarDnAdoptado,
}: {
  control: ControlDeDnDeTramo
  // undefined = volver a automático (acción "Auto").
  onCambiarDnAdoptado: (denominacion: string | undefined) => void
}) {
  if (!control.disponible || control.denominacionAdoptada === null) {
    return <>—</>
  }
  return (
    <span className="control-dn">
      <span className="control-dn__valor">
        <button
          type="button"
          className="control-dn__paso"
          aria-label="Adoptar el DN comercial inmediato inferior"
          disabled={control.anterior === null}
          onClick={() => control.anterior !== null && onCambiarDnAdoptado(control.anterior)}
        >
          ↓
        </button>
        <span className="control-dn__dn">{control.denominacionAdoptada}</span>
        <button
          type="button"
          className="control-dn__paso"
          aria-label="Adoptar el DN comercial inmediato superior"
          disabled={control.siguiente === null}
          onClick={() => control.siguiente !== null && onCambiarDnAdoptado(control.siguiente)}
        >
          ↑
        </button>
      </span>
      <span className="control-dn__meta">
        {control.origen === 'manual' ? (
          <>
            <span>Manual</span>
            <button
              type="button"
              className="control-dn__auto"
              aria-label="Volver al DN recomendado automáticamente"
              onClick={() => onCambiarDnAdoptado(undefined)}
            >
              Auto
            </button>
          </>
        ) : (
          <span>Auto</span>
        )}
      </span>
    </span>
  )
}
