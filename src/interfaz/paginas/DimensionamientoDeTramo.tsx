// Presentacion compacta de un Tramo (D-δ.43, ampliada en D-δ.50): el
// bloque principal muestra de un vistazo, SIN expandir nada, los datos que
// el usuario necesita para completar y verificar Modulo 2 en modo rapido
// (brief D-δ.50 secciones 17-20):
//
//   Longitud [input]  ->  DN  ->  V  ->  hf  ->  Estado
//
// La Longitud es un INPUT obligatorio y por eso vive en el bloque
// principal, nunca escondida dentro de "Detalle tecnico" (regresion de UX
// que D-δ.50 corrige). Qc pasa a dato secundario (jerarquia del brief
// seccion 19). El <details> conserva solo la trazabilidad tecnica que no
// se necesita para operar: refs fisicas, n, Di teorico, Di real, V
// admisible. Puramente presentacional: recibe el resultado ya resuelto por
// resolverResultadoDeTramoParaUi, no vuelve a llamar al motor.
import type { CSSProperties } from 'react'
import type { RedDeTramo } from '../../modelo/redHidraulica'
import { ETIQUETA_RED } from './humanizarModulo2'
import { resolverCambioDeLongitud, type ResultadoDeTramoParaUi } from './resolverResultadoDeTramoParaUi'

const estiloFila: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem 1.25rem',
  alignItems: 'baseline',
  padding: '0.35rem 0',
}

const estiloCeldaTecnica: CSSProperties = { textAlign: 'left', paddingRight: '1rem' }

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
        <span className="ui-badge ui-badge--muted">{ETIQUETA_RED[red]}</span>
        <label>
          Longitud [m]:{' '}
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
              // vuelve a mostrar el ultimo valor valido en el proximo
              // render, en vez de generar un estado invalido transitorio.
            }}
            style={{ width: '5rem' }}
          />
        </label>
        <span>DN: {textos.diComercialTexto}</span>
        <span>V: {textos.vTexto} m/s</span>
        <span>hf: {textos.hfTexto} m.c.a.</span>
        <span>{textos.verificacionVelocidadTexto}</span>
        <span style={{ opacity: 0.7 }}>
          <small>Qc: {textos.qcTexto} l/s</small>
        </span>
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
              <th style={estiloCeldaTecnica}>Refs. físicas</th>
              <td>{artefactosTexto}</td>
            </tr>
            <tr>
              <th style={estiloCeldaTecnica}>n</th>
              <td>{nTexto}</td>
            </tr>
            <tr>
              <th style={estiloCeldaTecnica}>Di teórico [mm]</th>
              <td>{textos.diReferenciaTexto}</td>
            </tr>
            <tr>
              <th style={estiloCeldaTecnica}>Di real [mm]</th>
              <td>{textos.diEfectivoTexto}</td>
            </tr>
            <tr>
              <th style={estiloCeldaTecnica}>V admisible [m/s]</th>
              <td>{textos.limiteVelocidadTexto}</td>
            </tr>
          </tbody>
        </table>
      </details>
    </div>
  )
}
