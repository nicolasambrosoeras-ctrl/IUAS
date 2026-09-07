// D-δ.52 (Parte A): control compacto ↓ / DN / ↑ / Auto de un Tramo. El
// diámetro adoptado es hidráulicamente efectivo (el motor ya lo consume
// vía Tramo.dnComercialAdoptado) -- este componente sólo cambia esa
// denominación. ↑/↓ se mueven por el catálogo comercial real; se
// deshabilitan en los extremos.
import type { CSSProperties } from 'react'
import type { ControlDeDnDeTramo } from './resolverControlDeDnDeTramo'

const estiloBoton: CSSProperties = {
  border: '1px solid #999',
  background: 'transparent',
  borderRadius: '4px',
  cursor: 'pointer',
  padding: '0 0.35rem',
  lineHeight: 1.4,
}

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
    <span style={{ whiteSpace: 'nowrap', display: 'inline-flex', gap: '0.2rem', alignItems: 'baseline' }}>
      <button
        type="button"
        aria-label="Diámetro comercial inmediato inferior"
        disabled={control.anterior === null}
        onClick={() => control.anterior !== null && onCambiarDnAdoptado(control.anterior)}
        style={estiloBoton}
      >
        ↓
      </button>
      <strong>{control.denominacionAdoptada}</strong>
      <button
        type="button"
        aria-label="Diámetro comercial inmediato superior"
        disabled={control.siguiente === null}
        onClick={() => control.siguiente !== null && onCambiarDnAdoptado(control.siguiente)}
        style={estiloBoton}
      >
        ↑
      </button>
      {control.origen === 'manual' ? (
        <>
          <small style={{ opacity: 0.7 }}>manual</small>
          <button type="button" onClick={() => onCambiarDnAdoptado(undefined)} style={estiloBoton}>
            Auto
          </button>
        </>
      ) : null}
    </span>
  )
}
