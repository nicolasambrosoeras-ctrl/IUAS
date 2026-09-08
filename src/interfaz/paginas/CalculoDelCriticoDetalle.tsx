// Descomposicion auditable del balance de presion del terminal mas
// desfavorable (D-δ.50, brief seccion 29 + ejemplo). NO recalcula nada:
// consume exclusivamente la traza que resolverPresionResidualDeCamino ya
// devolvio (desnivel, hfDistribuidaPorTramo con el desglose base/vertical,
// hfLocalizada, incrementoVerticalPorNivel) y los dos operandos de borde
// que el panel ya conoce (Pdisponible, hfMedidor). Especialmente para UF
// en pisos altos, deja ver los metros verticales automaticos incorporados
// a cada Tramo de Distribucion general (regla del modo rapido, D-δ.50).
import type { CSSProperties } from 'react'
import type { Proyecto } from '../../modelo/proyecto'
import type { ResultadoPresionResidualDeCamino } from '../../motor/tuberias/presion/resolverPresionResidualDeCamino'
import type { PerdidasDeMedidoresParaTerminal } from '../../motor/modulo3/resolverPerdidasDeMedidoresParaTerminal'
import { formatearNumero } from '../../exportadores/pdf/formatearNumero'
import { nombresDeArtefactosAguasAbajo } from './humanizarModulo2'
import { nombreDeUnidadFuncional } from './nombreDeUnidadFuncional'
import {
  identificarFilasDistribucionGeneral,
  identificarFilasPrincipalesDeLocales,
} from './identificarFilasDeModulo2'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'

type BalanceCompleto = Extract<ResultadoPresionResidualDeCamino, { tipo: 'balanceCompleto' }>

const estiloCelda: CSSProperties = { padding: '0.15rem 0.75rem 0.15rem 0', textAlign: 'left' }
const estiloNum: CSSProperties = { padding: '0.15rem 0 0.15rem 0.75rem', textAlign: 'right' }

function mca(valor: number): string {
  return `${formatearNumero(valor, 'm')} m.c.a.`
}

export function CalculoDelCriticoDetalle({
  proyecto,
  catalogoArtefactos,
  resultado,
  presionDisponible_mca,
  hfMedidor_mca,
  perdidasDeMedidores,
  origenTexto,
  cotaRaiz_m,
}: {
  proyecto: Proyecto
  catalogoArtefactos: readonly ArtefactoNormativo[]
  resultado: BalanceCompleto
  presionDisponible_mca: number
  hfMedidor_mca: number | undefined
  // M3-E (D-δ.58): desglose auditable de la pérdida de medidores aplicable
  // a este terminal. `hfMedidor_mca` sigue siendo el total (= hfTotal_mca).
  perdidasDeMedidores?: PerdidasDeMedidoresParaTerminal | undefined
  origenTexto: string
  cotaRaiz_m: number | undefined
}) {
  // Etiqueta humana de cada tramoId del recorrido (nunca id tecnico).
  const etiquetasDeDistribucion = new Map(
    identificarFilasDistribucionGeneral(proyecto).map((fila) => [fila.tramoId, fila.etiqueta]),
  )
  const etiquetasPrincipalesDeLocal = new Map(
    identificarFilasPrincipalesDeLocales(proyecto).map((fila) => [
      fila.tramoId,
      `${nombresDeArtefactosAguasAbajo(proyecto, catalogoArtefactos, fila.tramoId)} (${fila.red === 'AC' ? 'Agua caliente' : 'Agua fría'})`,
    ]),
  )
  function etiquetaDeTramo(tramoId: string): string {
    return etiquetasDeDistribucion.get(tramoId) ?? etiquetasPrincipalesDeLocal.get(tramoId) ?? 'Tramo'
  }

  const cargaGeometrica_mca = presionDisponible_mca - resultado.desnivel_m
  const { incrementoVerticalPorNivel } = resultado

  return (
    <div>
      <table style={{ borderCollapse: 'collapse', marginBottom: '0.5rem' }}>
        <tbody>
          <tr>
            <th style={estiloCelda}>Origen</th>
            <td style={estiloNum}>{origenTexto}</td>
          </tr>
          {cotaRaiz_m !== undefined ? (
            <tr>
              <th style={estiloCelda}>Cota de la raíz</th>
              <td style={estiloNum}>{formatearNumero(cotaRaiz_m, 'm')} m</td>
            </tr>
          ) : null}
          <tr>
            <th style={estiloCelda}>Δz (desnivel raíz → terminal)</th>
            <td style={estiloNum}>{formatearNumero(resultado.desnivel_m, 'm')} m</td>
          </tr>
          <tr>
            <th style={estiloCelda}>Carga geométrica (Pdisponible − Δz)</th>
            <td style={estiloNum}>{mca(cargaGeometrica_mca)}</td>
          </tr>
          {incrementoVerticalPorNivel.aplica ? (
            <tr>
              <th style={estiloCelda}>
                Longitud vertical automática por nivel ({incrementoVerticalPorNivel.nivel} · piso)
              </th>
              <td style={estiloNum}>+{formatearNumero(incrementoVerticalPorNivel.deltaLVertical_m, 'm')} m</td>
            </tr>
          ) : null}
        </tbody>
      </table>

      <strong>Recorrido</strong>
      <table style={{ borderCollapse: 'collapse', marginBottom: '0.5rem' }}>
        <thead>
          <tr>
            <th style={estiloCelda}>Tramo</th>
            <th style={estiloNum}>Long. base</th>
            <th style={estiloNum}>Vertical</th>
            <th style={estiloNum}>Long. efectiva</th>
            <th style={estiloNum}>hf distribuida</th>
          </tr>
        </thead>
        <tbody>
          {resultado.hfDistribuidaPorTramo.map((tramo) => (
            <tr key={tramo.tramoId}>
              <th style={estiloCelda}>{etiquetaDeTramo(tramo.tramoId)}</th>
              <td style={estiloNum}>{formatearNumero(tramo.longitudBase_m, 'm')} m</td>
              <td style={estiloNum}>
                {tramo.incrementoVertical_m > 0 ? `+${formatearNumero(tramo.incrementoVertical_m, 'm')} m` : '—'}
              </td>
              <td style={estiloNum}>
                {formatearNumero(tramo.longitudBase_m + tramo.incrementoVertical_m, 'm')} m
              </td>
              <td style={estiloNum}>{mca(tramo.hf_m)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table style={{ borderCollapse: 'collapse' }}>
        <tbody>
          <tr>
            <th style={estiloCelda}>hf distribuida total</th>
            <td style={estiloNum}>{mca(resultado.hfDistribuida_mca)}</td>
          </tr>
          <tr>
            <th style={estiloCelda}>
              hf localizada ({resultado.hfLocalizada.metodologia === 'detallado' ? 'detallada' : 'estimada'})
            </th>
            <td style={estiloNum}>{mca(resultado.hfLocalizada.hf_mca)}</td>
          </tr>
          <tr>
            <th style={estiloCelda}>hf medidor</th>
            <td style={estiloNum}>{hfMedidor_mca !== undefined ? mca(hfMedidor_mca) : '—'}</td>
          </tr>
          {perdidasDeMedidores?.estado === 'determinadas' && perdidasDeMedidores.componentes.length > 0
            ? perdidasDeMedidores.componentes.map((componente, indice) => (
                <tr key={indice}>
                  <th style={{ ...estiloCelda, paddingLeft: '1rem', fontWeight: 'normal' }}>
                    <small>
                      {componente.ambito === 'general'
                        ? 'Medidor general'
                        : `Medidor individual · ${
                            componente.unidadFuncionalId !== undefined
                              ? nombreDeUnidadFuncional(proyecto, componente.unidadFuncionalId)
                              : 'unidad funcional'
                          } · ${componente.servicioMedido === 'aguaFria' ? 'AF' : 'AC'}`}
                      {componente.aplicaPorProvisionACSIndividual ? ' (aplica también al ramal AC por ACS individual)' : ''}
                    </small>
                  </th>
                  <td style={estiloNum}>
                    <small>{mca(componente.hf_mca)}</small>
                  </td>
                </tr>
              ))
            : null}
          {origenTexto === 'Tanque elevado' && perdidasDeMedidores?.estado === 'determinadas' ? (
            <tr>
              <th style={{ ...estiloCelda, paddingLeft: '1rem', fontWeight: 'normal' }}>
                <small>Medidor general: fuera del camino tanque → terminal</small>
              </th>
              <td style={estiloNum}>
                <small>—</small>
              </td>
            </tr>
          ) : null}
          <tr>
            <th style={estiloCelda}>
              <strong>Presión residual</strong>
            </th>
            <td style={estiloNum}>
              <strong>{mca(resultado.presionResidual_mca)}</strong>
            </td>
          </tr>
          <tr>
            <th style={estiloCelda}>Presión mínima requerida</th>
            <td style={estiloNum}>{mca(resultado.presionMinimaRequerida_mca)}</td>
          </tr>
          <tr>
            <th style={estiloCelda}>
              <strong>Margen</strong>
            </th>
            <td style={estiloNum}>
              <strong>
                {resultado.presionResidual_mca - resultado.presionMinimaRequerida_mca >= 0 ? '+' : ''}
                {mca(resultado.presionResidual_mca - resultado.presionMinimaRequerida_mca)}
              </strong>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  )
}
