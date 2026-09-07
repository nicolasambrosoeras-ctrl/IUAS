// D-δ.51 (§21-§28): la vista principal de M2 pasa de una sucesión de
// tarjetas largas a TABLAS compactas escaneables verticalmente
// (L -> DN -> V -> Pérdida -> Estado). Puramente presentacional: consume
// resolverFilaDeDimensionamiento (view-model), no llama al motor.
//
// Cada fila puede expandirse (progressive disclosure, §28/§29) mediante un
// <details> NATIVO -- sin estado JS, así el contenido del detalle queda
// siempre en el DOM (colapsado): en Rápido, artefactos + desglose de
// pérdida + estimación localizada; en Profesional, el árbol de Tramos
// físicos + editores de accesorios/tees. El contenido lo provee quien usa
// la tabla (`renderDetalle`).
import type { CSSProperties, ReactNode } from 'react'
import type { RedDeTramo } from '../../modelo/redHidraulica'
import { ETIQUETA_RED } from './humanizarModulo2'
import { resolverCambioDeLongitud } from './resolverResultadoDeTramoParaUi'
import type { FilaDeDimensionamiento } from './resolverFilaDeDimensionamiento'

const th: CSSProperties = { textAlign: 'left', padding: '0.25rem 0.6rem', borderBottom: '1px solid #bbb', fontSize: '0.9em' }
const thNum: CSSProperties = { ...th, textAlign: 'right' }
const td: CSSProperties = { padding: '0.2rem 0.6rem', borderBottom: '1px solid #eee', verticalAlign: 'baseline' }
const tdNum: CSSProperties = { ...td, textAlign: 'right' }
const tdDn: CSSProperties = { ...tdNum, fontWeight: 700 }

export type EntradaDeTabla = {
  readonly clave: string
  readonly etiqueta: string
  readonly red: RedDeTramo
  readonly fila: FilaDeDimensionamiento
  // Longitud editable (Rápido) o de solo lectura (Profesional: se edita en
  // el detalle expandible).
  readonly longitudEditable: boolean
  readonly onCambiarLongitud?: ((longitud_m: number | undefined) => void) | undefined
  readonly renderDetalle?: (() => ReactNode) | undefined
}

function CeldaLongitud({ entrada }: { entrada: EntradaDeTabla }) {
  const { fila, longitudEditable, onCambiarLongitud } = entrada
  if (!longitudEditable || onCambiarLongitud === undefined) {
    return <>{fila.longitud_m === undefined ? '—' : `${fila.longitud_m} m`}</>
  }
  return (
    <input
      type="number"
      min={0}
      aria-label={`Longitud [m] de ${entrada.etiqueta} ${ETIQUETA_RED[entrada.red]}`}
      value={fila.longitud_m ?? ''}
      onChange={(evento) => {
        const r = resolverCambioDeLongitud(evento.target.value)
        if (r.tipo === 'omitir') onCambiarLongitud(undefined)
        else if (r.tipo === 'establecer') onCambiarLongitud(r.longitud_m)
      }}
      style={{ width: '4.5rem' }}
    />
  )
}

export function TablaDimensionamientoDeModulo2({
  entradas,
  encabezadoTramo,
}: {
  entradas: readonly EntradaDeTabla[]
  encabezadoTramo: string
}) {
  if (entradas.length === 0) {
    return null
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', minWidth: '40rem' }}>
        <thead>
          <tr>
            <th style={th}>{encabezadoTramo}</th>
            <th style={th}>Red</th>
            <th style={thNum}>Longitud</th>
            <th style={thNum}>DN</th>
            <th style={thNum}>V</th>
            <th style={thNum}>Pérdida</th>
            <th style={th}>Estado</th>
          </tr>
        </thead>
        <tbody>
          {entradas.map((entrada) => {
            const { fila } = entrada
            return (
              <tr key={entrada.clave}>
                <td style={td}>
                  {entrada.renderDetalle !== undefined ? (
                    <details>
                      <summary>
                        {entrada.etiqueta}
                        {fila.nPuntos > 0 ? <small style={{ opacity: 0.6 }}> · {fila.nPuntos} {fila.nPuntos === 1 ? 'punto' : 'puntos'}</small> : null}
                      </summary>
                      <div style={{ padding: '0.4rem 0 0.2rem', fontWeight: 400 }}>{entrada.renderDetalle()}</div>
                    </details>
                  ) : (
                    entrada.etiqueta
                  )}
                </td>
                <td style={td}>
                  <span style={{ fontSize: '0.85em', border: '1px solid #999', borderRadius: '999px', padding: '0.02rem 0.45rem' }}>
                    {ETIQUETA_RED[entrada.red]}
                  </span>
                </td>
                <td style={tdNum}>
                  <CeldaLongitud entrada={entrada} />
                </td>
                <td style={tdDn}>{fila.dnTexto}</td>
                <td style={tdNum}>{fila.vTexto} m/s</td>
                <td style={tdNum}>{fila.perdidaTotalTexto}</td>
                <td style={td}>{fila.estadoTexto}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
