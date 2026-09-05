// Tarjeta de un terminal en el Panel de Presión de Módulo 2 (extraída de
// PanelDePresionDeModulo2.tsx únicamente por legibilidad/testabilidad --
// mismo criterio que DimensionamientoDeTramo.tsx/AccesoriosDeTramoEditor.tsx,
// no una abstracción nueva). No calcula hidráulica: formatea lo que
// resolverPresionResidualDeCamino ya devuelve.
//
// D-δ.46: bajo GranularidadHidraulica='simplificada', la tarjeta deja de
// pedir su propia "Cota de conexión [m]" -- el motor ya usa la cota de la
// UnidadFuncional del terminal (resolverCotaTerminalEfectiva), así que
// ese input individual editaría un dato que el cálculo activo ni
// siquiera lee. En su lugar se muestra, dentro de "Detalle", la cota de
// referencia de la UF como dato derivado de solo lectura -- se edita en
// "Datos del proyecto" (MotorDemandaPantalla.tsx), no acá. En
// 'profesional' el input individual se conserva sin cambios.
import type { CSSProperties } from 'react'
import type { ResultadoPresionResidualDeCamino } from '../../motor/tuberias/presion/resolverPresionResidualDeCamino'
import { formatearNumero } from '../../exportadores/pdf/formatearNumero'
import { parsearCota } from './parsearCota'
import type { InfoCotaDeTerminal } from './resolverInfoCotaDeTerminal'

const estiloCard: CSSProperties = {
  border: '1px solid #ddd',
  borderRadius: '0.5rem',
  padding: '0.6rem 1rem',
  marginBottom: '0.6rem',
}

const estiloFila: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '0.5rem 1.25rem',
  alignItems: 'baseline',
}

type TrazaExtraida = Extract<ResultadoPresionResidualDeCamino, { tipo: 'balanceIncompleto' } | { tipo: 'balanceCompleto' }>

function tieneTraza(resultado: ResultadoPresionResidualDeCamino): resultado is TrazaExtraida {
  return resultado.tipo === 'balanceIncompleto' || resultado.tipo === 'balanceCompleto'
}

// Texto de estado por terminal -- deriva exclusivamente del tipo ya
// discriminado por el motor, nunca de una heurística nueva. No colapsa
// 'terminalSinPresionMinima' con 'incompleto': D-δ.41 ya cerró que es una
// limitación normativa permanente (no bloqueante), se muestra tal cual.
function textoDeEstadoDeTerminal(resultado: ResultadoPresionResidualDeCamino): string {
  switch (resultado.tipo) {
    case 'topologiaNoResoluble':
      return 'Topología no resoluble'
    case 'terminalSinArtefacto':
      return 'Sin artefacto asociado'
    case 'terminalSinPresionMinima':
      return 'Sin presión mínima normativa publicada para verificación.'
    case 'desnivelIncompleto':
      return 'Incompleto (falta cota de conexión)'
    case 'unidadFuncionalSinCotaDeReferencia':
      return 'Incompleto (falta cota de referencia de la unidad funcional)'
    case 'perdidaDistribuidaIncompleta':
      return 'Incompleto (pérdida distribuida)'
    case 'perdidaLocalizadaIncompleta':
      return 'Incompleto (pérdida localizada detallada)'
    case 'perdidaLocalizadaEstimadaIncompleta':
      return 'Incompleto (pérdida localizada estimada)'
    case 'balanceIncompleto':
      return `Incompleto (falta ${resultado.terminosFaltantes.join(', ')})`
    case 'balanceCompleto':
      return resultado.cumpleMinimo ? 'Cumple' : 'No cumple'
  }
}

export function TarjetaDeTerminal({
  etiqueta,
  infoCota,
  presionDisponible_mca,
  hfMedidor_mca,
  resultado,
}: {
  etiqueta: string
  infoCota: InfoCotaDeTerminal
  presionDisponible_mca: number
  hfMedidor_mca: number | undefined
  resultado: ResultadoPresionResidualDeCamino
}) {
  const traza = tieneTraza(resultado) ? resultado : undefined
  const completo = resultado.tipo === 'balanceCompleto' ? resultado : undefined
  // Carga geométrica disponible = Pdisponible - Δz: mismos dos operandos
  // ya conocidos (uno provisto por el usuario, el otro devuelto tal cual
  // por resolverDesnivelDeCamino) -- no es una fórmula hidráulica nueva,
  // es el primer término parcial de la misma resta que ya expone
  // resolverBalanceDePresion (Presidual = Pdisponible - Δz - hfDistribuida
  // - hfLocalizada - hfMedidor).
  const cargaGeometrica_mca = traza !== undefined ? presionDisponible_mca - traza.desnivel_m : undefined

  return (
    <div style={estiloCard}>
      <div style={estiloFila}>
        <strong>{etiqueta}</strong>
        {completo !== undefined ? (
          <>
            <span>Presidual: {formatearNumero(completo.presionResidual_mca, 'm')} m.c.a.</span>
            <span>Pmin: {formatearNumero(completo.presionMinimaRequerida_mca, 'm')} m.c.a.</span>
            <span>
              Margen: {formatearNumero(completo.presionResidual_mca - completo.presionMinimaRequerida_mca, 'm')} m.c.a.
            </span>
          </>
        ) : null}
        <span>{textoDeEstadoDeTerminal(resultado)}</span>
      </div>
      {infoCota.tipo === 'individual' ? (
        <label>
          Cota de conexión [m]:{' '}
          <input
            type="number"
            step="any"
            value={infoCota.cota_m ?? ''}
            onChange={(evento) => {
              const resultadoCambio = parsearCota(evento.target.value)
              if (resultadoCambio !== 'ignorar') {
                infoCota.onCambiarCota(resultadoCambio)
              }
            }}
            style={{ width: '4.5rem' }}
          />
        </label>
      ) : null}
      <details>
        <summary>Detalle</summary>
        <table style={{ borderCollapse: 'collapse' }}>
          <tbody>
            {infoCota.tipo === 'deUF' ? (
              <tr>
                <th style={{ textAlign: 'left', paddingRight: '1rem' }}>Cota de referencia</th>
                <td>
                  {infoCota.cota_m !== undefined ? `${formatearNumero(infoCota.cota_m, 'm')} m` : '—'} ({infoCota.nombreUF})
                </td>
              </tr>
            ) : null}
            <tr>
              <th style={{ textAlign: 'left', paddingRight: '1rem' }}>Δz</th>
              <td>{traza !== undefined ? `${formatearNumero(traza.desnivel_m, 'm')} m` : '—'}</td>
            </tr>
            <tr>
              <th style={{ textAlign: 'left', paddingRight: '1rem' }}>Carga geométrica</th>
              <td>{cargaGeometrica_mca !== undefined ? `${formatearNumero(cargaGeometrica_mca, 'm')} m.c.a.` : '—'}</td>
            </tr>
            <tr>
              <th style={{ textAlign: 'left', paddingRight: '1rem' }}>hfDistribuida</th>
              <td>{traza !== undefined ? `${formatearNumero(traza.hfDistribuida_mca, 'm')} m.c.a.` : '—'}</td>
            </tr>
            <tr>
              <th style={{ textAlign: 'left', paddingRight: '1rem' }}>hfLocalizada</th>
              <td>
                {traza !== undefined
                  ? `${formatearNumero(traza.hfLocalizada.hf_mca, 'm')} m.c.a. (${
                      traza.hfLocalizada.metodologia === 'detallado' ? 'detallada' : 'estimada'
                    })`
                  : '—'}
              </td>
            </tr>
            <tr>
              <th style={{ textAlign: 'left', paddingRight: '1rem' }}>hfMedidor</th>
              <td>{hfMedidor_mca !== undefined ? `${formatearNumero(hfMedidor_mca, 'm')} m.c.a.` : '—'}</td>
            </tr>
          </tbody>
        </table>
      </details>
    </div>
  )
}
