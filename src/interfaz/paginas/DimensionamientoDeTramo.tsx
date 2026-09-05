// Presentación compacta de un Tramo (D-δ.43): reemplaza la fila de tabla
// ancha (13 columnas) por un bloque donde Qc/DN/V/Verificación se leen de
// un vistazo, sin scroll horizontal -- información secundaria (refs
// físicas, n, Di teórico, Di real, Vmin/Vmax, hf) queda en un <details>
// expandible. Puramente presentacional: recibe el resultado ya resuelto
// por resolverResultadoDeTramoParaUi, no vuelve a llamar al motor.
import type { CSSProperties } from 'react'
import type { RedDeTramo } from '../../modelo/redHidraulica'
import { ETIQUETA_RED } from './humanizarModulo2'
import { resolverCambioDeLongitud, type ResultadoDeTramoParaUi } from './resolverResultadoDeTramoParaUi'

const estiloBadge: CSSProperties = {
  padding: '0.05rem 0.5rem',
  borderRadius: '999px',
  border: '1px solid #999',
  fontSize: '0.85em',
}

const estiloFila: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem 1.25rem',
  alignItems: 'baseline',
  padding: '0.35rem 0',
}

export function DimensionamientoDeTramo({
  etiqueta,
  red,
  resultado,
  longitud_m,
  onCambiarLongitud,
}: {
  etiqueta: string
  red: RedDeTramo
  resultado: ResultadoDeTramoParaUi
  longitud_m: number | undefined
  onCambiarLongitud: (longitud_m: number | undefined) => void
}) {
  const { textos, errorDelMotor, artefactosTexto, nTexto } = resultado

  return (
    <div>
      <div style={estiloFila}>
        <strong>{etiqueta}</strong>
        <span style={estiloBadge}>{ETIQUETA_RED[red]}</span>
        <span>Qc: {textos.qcTexto} l/s</span>
        <span>DN: {textos.diComercialTexto}</span>
        <span>V: {textos.vTexto} m/s</span>
        <span>{textos.verificacionVelocidadTexto}</span>
      </div>
      {errorDelMotor !== null ? (
        <p>
          <small>{errorDelMotor}</small>
        </p>
      ) : null}
      <details>
        <summary>Detalle técnico</summary>
        <table style={{ borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <th style={{ textAlign: 'left', paddingRight: '1rem' }}>Refs. físicas</th>
              <td>{artefactosTexto}</td>
            </tr>
            <tr>
              <th style={{ textAlign: 'left', paddingRight: '1rem' }}>n</th>
              <td>{nTexto}</td>
            </tr>
            <tr>
              <th style={{ textAlign: 'left', paddingRight: '1rem' }}>Di teórico [mm]</th>
              <td>{textos.diReferenciaTexto}</td>
            </tr>
            <tr>
              <th style={{ textAlign: 'left', paddingRight: '1rem' }}>Di real [mm]</th>
              <td>{textos.diEfectivoTexto}</td>
            </tr>
            <tr>
              <th style={{ textAlign: 'left', paddingRight: '1rem' }}>V admisible [m/s]</th>
              <td>{textos.limiteVelocidadTexto}</td>
            </tr>
            <tr>
              <th style={{ textAlign: 'left', paddingRight: '1rem' }}>Longitud [m]</th>
              <td>
                <input
                  type="number"
                  min={0}
                  aria-label={`Longitud [m] de ${etiqueta}`}
                  value={longitud_m ?? ''}
                  onChange={(evento) => {
                    const resultadoCambio = resolverCambioDeLongitud(evento.target.value)
                    if (resultadoCambio.tipo === 'omitir') {
                      onCambiarLongitud(undefined)
                    } else if (resultadoCambio.tipo === 'establecer') {
                      onCambiarLongitud(resultadoCambio.longitud_m)
                    }
                    // 'ignorar': no se llama a onCambiarLongitud -- el input
                    // vuelve a mostrar el último valor válido en el próximo
                    // render, en vez de generar un estado inválido transitorio.
                  }}
                  style={{ width: '5rem' }}
                />
              </td>
            </tr>
            <tr>
              <th style={{ textAlign: 'left', paddingRight: '1rem' }}>hf [m.c.a.]</th>
              <td>{textos.hfTexto}</td>
            </tr>
          </tbody>
        </table>
      </details>
    </div>
  )
}
