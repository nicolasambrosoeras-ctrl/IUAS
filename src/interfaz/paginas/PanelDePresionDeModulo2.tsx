// Panel de verificación de presión de Módulo 2 (M2-B): primera superficie
// de UI que llega hasta balanceCompleto usando exclusivamente primitivas
// ya productivas -- resolverPresionResidualDeCamino, resolverTerminalMasDesfavorable,
// resolverEstadoModulo2. Este componente NO calcula hidráulica: arma los
// candidatos (un llamado por terminal), formatea lo que el motor ya
// devuelve, y persiste únicamente dos números de entrada.
//
// Pdisponible y hfMedidor_mca son condiciones de borde EXTERNAS (D-δ.36/
// D-δ.35) -- deliberadamente NO se persisten en Proyecto (no existe ese
// campo en el modelo, y agregarlo sería decidir una entidad de dominio
// nueva no prevista, ver PENDIENTES-DE-ARQUITECTURA.md). Viven como
// estado local de este panel: se pierden al recargar la página, igual
// que el resto del Proyecto (que tampoco persiste hoy, ver proyectoInicial
// en MotorDemandaPantalla.tsx) -- no es una regresión de este incremento.
// hfMedidor_mca es explícitamente un dato hidráulico de entrada para M2,
// NO una selección comercial de medidor (M3 no existe todavía) -- ver
// etiqueta del input más abajo.
import { useState, type CSSProperties } from 'react'
import type { Proyecto } from '../../modelo/proyecto'
import type { Nodo, ReferenciaDeArtefacto } from '../../modelo/redHidraulica'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import { catalogoMaterialesTuberia } from '../../motor/tuberias/materialTuberia'
import { catalogoSistemasDeTuberia } from '../../motor/tuberias/sistemaDeTuberia'
import {
  resolverPresionResidualDeCamino,
  type ResultadoPresionResidualDeCamino,
} from '../../motor/tuberias/presion/resolverPresionResidualDeCamino'
import {
  resolverTerminalMasDesfavorable,
  type CandidatoTerminal,
} from '../../motor/tuberias/presion/resolverTerminalMasDesfavorable'
import { resolverEstadoModulo2, type EstadoModulo2 } from '../../motor/modulo2/resolverEstadoModulo2'
import { formatearNumero } from '../../exportadores/pdf/formatearNumero'
import { describirReferenciaPendiente } from './ResultadoHidraulicoDeTramo'
import { conCotaDeNodo } from './actualizarRedHidraulica'

function estiloEncabezado(alineacion: CSSProperties['textAlign']): CSSProperties {
  return { padding: '0.5rem 0.9rem', textAlign: alineacion, borderBottom: '2px solid #333', fontWeight: 'bold', whiteSpace: 'nowrap' }
}
function estiloCelda(alineacion: CSSProperties['textAlign']): CSSProperties {
  return { padding: '0.4rem 0.9rem', textAlign: alineacion, borderBottom: '1px solid #ddd', whiteSpace: 'nowrap' }
}

// Mismo criterio que resolverCambioDeLongitud (ResultadoHidraulicoDeTramo.tsx):
// campo vacío = "no provisto todavía" (undefined, nunca 0); NaN o negativo
// = no se actualiza el estado -- Pdisponible/hfMedidor nunca admiten un
// valor negativo con sentido físico.
function parsearEntradaHidraulica(texto: string): number | undefined | 'ignorar' {
  if (texto === '') {
    return undefined
  }
  const valor = Number(texto)
  if (Number.isNaN(valor) || valor < 0) {
    return 'ignorar'
  }
  return valor
}

// cota_m SÍ admite negativos (un punto puede estar por debajo del datum,
// p.ej. un subsuelo) -- a diferencia de parsearEntradaHidraulica, solo se
// descarta NaN.
function parsearCota(texto: string): number | undefined | 'ignorar' {
  if (texto === '') {
    return undefined
  }
  const valor = Number(texto)
  return Number.isNaN(valor) ? 'ignorar' : valor
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
      return 'Incompleto (falta cota de nodo)'
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

function esTerminalDeArtefacto(nodo: Nodo): nodo is Nodo & { referencia: ReferenciaDeArtefacto } {
  return nodo.referencia?.tipo === 'artefacto'
}

function textoDeEstadoModulo2(estado: EstadoModulo2): string {
  switch (estado.estado) {
    case 'noIniciado':
      return 'No iniciado'
    case 'incompleto':
      return `Incompleto (${estado.motivos.length} motivo${estado.motivos.length === 1 ? '' : 's'})`
    case 'error':
      return `Error (${estado.problemas.length} problema${estado.problemas.length === 1 ? '' : 's'})`
    case 'completo':
      return 'Completo'
  }
}

export function PanelDePresionDeModulo2({
  proyecto,
  catalogoArtefactos,
  onCambiar,
}: {
  proyecto: Proyecto
  catalogoArtefactos: readonly ArtefactoNormativo[]
  onCambiar: (proyecto: Proyecto) => void
}) {
  const [presionDisponibleTexto, setPresionDisponibleTexto] = useState('')
  const [hfMedidorTexto, setHfMedidorTexto] = useState('')

  const presionDisponibleParseada = parsearEntradaHidraulica(presionDisponibleTexto)
  const hfMedidorParseado = parsearEntradaHidraulica(hfMedidorTexto)
  const presionDisponible_mca = presionDisponibleParseada === 'ignorar' ? undefined : presionDisponibleParseada
  const hfMedidor_mca = hfMedidorParseado === 'ignorar' ? undefined : hfMedidorParseado

  const nodosTerminales = proyecto.redHidraulica?.nodos.filter(esTerminalDeArtefacto) ?? []
  // Nodos raiz (sin ningun Tramo entrante): resolverDesnivelDeCamino
  // necesita su cota_m tanto como la del terminal -- se exponen acá para
  // poder completar Δz desde la UI sin un editor gráfico de topología.
  const nodosRaiz =
    proyecto.redHidraulica?.nodos.filter(
      (nodo) => !proyecto.redHidraulica!.tramos.some((tramo) => tramo.nodoDestinoId === nodo.id),
    ) ?? []

  const estadoModulo2 = resolverEstadoModulo2(
    proyecto,
    presionDisponible_mca,
    hfMedidor_mca,
    catalogoArtefactos,
    catalogoSistemasDeTuberia,
    catalogoMaterialesTuberia,
  )

  const candidatos: CandidatoTerminal[] =
    presionDisponible_mca === undefined
      ? []
      : nodosTerminales.map((nodo) => ({
          nodoId: nodo.id,
          resultado: resolverPresionResidualDeCamino(
            proyecto,
            nodo.id,
            presionDisponible_mca,
            hfMedidor_mca,
            catalogoArtefactos,
            catalogoSistemasDeTuberia,
            catalogoMaterialesTuberia,
          ),
        }))

  // Se le pasan TODOS los candidatos (no solo los balanceCompleto): la
  // distincion 'determinado' vs. 'candidatoProvisional' depende
  // exclusivamente de que existan o no candidatos excluidos -- prefiltrar
  // acá lo forzaria siempre a 'determinado', perdiendo esa distincion que
  // el propio motor fue diseñado para expresar (M2-B).
  const terminalMasDesfavorable = candidatos.length > 0 ? resolverTerminalMasDesfavorable(candidatos) : undefined

  return (
    <section>
      <h3>Verificación de presión</h3>
      <p>
        <small>
          Estado de Módulo 2: <strong>{textoDeEstadoModulo2(estadoModulo2)}</strong>
        </small>
      </p>

      <label>
        Presión disponible (Pdisponible) [m.c.a.]:{' '}
        <input
          type="number"
          min={0}
          step="any"
          value={presionDisponibleTexto}
          onChange={(evento) => setPresionDisponibleTexto(evento.target.value)}
          style={{ width: '6rem' }}
        />
      </label>
      <p>
        <small>
          Condición de borde hidráulica del origen (tanque, red pública, bombeo — sin modelar todavía, D-δ.36):
          ingresar el valor conocido en m.c.a. en el nodo raíz del camino.
        </small>
      </p>

      {nodosRaiz.length > 0 ? (
        <p>
          <small>
            Cota del nodo raíz (necesaria para Δz):{' '}
            {nodosRaiz.map((nodo) => (
              <label key={nodo.id} style={{ marginRight: '1rem' }}>
                {nodo.id}:{' '}
                <input
                  type="number"
                  step="any"
                  value={nodo.cota_m ?? ''}
                  onChange={(evento) => {
                    const resultado = parsearCota(evento.target.value)
                    if (resultado !== 'ignorar') {
                      onCambiar(conCotaDeNodo(proyecto, nodo.id, resultado))
                    }
                  }}
                  style={{ width: '4.5rem' }}
                />{' '}
                m
              </label>
            ))}
          </small>
        </p>
      ) : null}

      <label>
        Pérdida de carga del medidor (hfMedidor) [m.c.a.]:{' '}
        <input
          type="number"
          min={0}
          step="any"
          value={hfMedidorTexto}
          onChange={(evento) => setHfMedidorTexto(evento.target.value)}
          style={{ width: '6rem' }}
        />
      </label>
      <p>
        <small>
          Dato hidráulico de entrada para M2 (D-δ.35) — <strong>no representa una selección comercial de medidor</strong>.
          M3 (selección/dimensionamiento del medidor) todavía no existe; este valor se ingresa manualmente hasta que
          exista un productor automático.
        </small>
      </p>

      {presionDisponible_mca === undefined ? (
        <p>Ingresá Pdisponible para ver el balance de presión de cada terminal.</p>
      ) : nodosTerminales.length === 0 ? (
        <p>El proyecto no tiene terminales hidráulicos (nodos con referencia a Artefacto) todavía.</p>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={estiloEncabezado('left')}>Terminal</th>
                  <th style={estiloEncabezado('right')}>Cota [m]</th>
                  <th style={estiloEncabezado('right')}>Δz [m]</th>
                  <th style={estiloEncabezado('right')}>hfDistribuida [m.c.a.]</th>
                  <th style={estiloEncabezado('right')}>hfLocalizada [m.c.a.]</th>
                  <th style={estiloEncabezado('left')}>Metodología</th>
                  <th style={estiloEncabezado('right')}>hfMedidor [m.c.a.]</th>
                  <th style={estiloEncabezado('right')}>Presidual [m.c.a.]</th>
                  <th style={estiloEncabezado('right')}>Pmin [m.c.a.]</th>
                  <th style={estiloEncabezado('right')}>Margen [m.c.a.]</th>
                  <th style={estiloEncabezado('left')}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {candidatos.map(({ nodoId, resultado }) => {
                  const nodoDelTerminal = nodosTerminales.find((n) => n.id === nodoId)
                  const etiqueta =
                    nodoDelTerminal !== undefined
                      ? describirReferenciaPendiente(proyecto, catalogoArtefactos, nodoDelTerminal.referencia)
                      : nodoId
                  const traza = tieneTraza(resultado) ? resultado : undefined
                  const completo = resultado.tipo === 'balanceCompleto' ? resultado : undefined

                  return (
                    <tr key={nodoId}>
                      <td style={estiloCelda('left')}>{etiqueta}</td>
                      <td style={estiloCelda('right')}>
                        <input
                          type="number"
                          step="any"
                          value={nodoDelTerminal?.cota_m ?? ''}
                          onChange={(evento) => {
                            const resultado = parsearCota(evento.target.value)
                            if (resultado !== 'ignorar') {
                              onCambiar(conCotaDeNodo(proyecto, nodoId, resultado))
                            }
                          }}
                          style={{ width: '4.5rem' }}
                        />
                      </td>
                      <td style={estiloCelda('right')}>{traza !== undefined ? formatearNumero(traza.desnivel_m, 'm') : '—'}</td>
                      <td style={estiloCelda('right')}>
                        {traza !== undefined ? formatearNumero(traza.hfDistribuida_mca, 'm') : '—'}
                      </td>
                      <td style={estiloCelda('right')}>
                        {traza !== undefined ? formatearNumero(traza.hfLocalizada.hf_mca, 'm') : '—'}
                      </td>
                      <td style={estiloCelda('left')}>
                        {traza !== undefined
                          ? traza.hfLocalizada.metodologia === 'detallado'
                            ? 'Detallada'
                            : 'Estimada'
                          : '—'}
                      </td>
                      <td style={estiloCelda('right')}>{hfMedidor_mca !== undefined ? formatearNumero(hfMedidor_mca, 'm') : '—'}</td>
                      <td style={estiloCelda('right')}>
                        {completo !== undefined ? formatearNumero(completo.presionResidual_mca, 'm') : '—'}
                      </td>
                      <td style={estiloCelda('right')}>
                        {completo !== undefined ? formatearNumero(completo.presionMinimaRequerida_mca, 'm') : '—'}
                      </td>
                      <td style={estiloCelda('right')}>
                        {completo !== undefined
                          ? formatearNumero(completo.presionResidual_mca - completo.presionMinimaRequerida_mca, 'm')
                          : '—'}
                      </td>
                      <td style={estiloCelda('left')}>{textoDeEstadoDeTerminal(resultado)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {terminalMasDesfavorable !== undefined ? (
            <div>
              <h4>Terminal más desfavorable</h4>
              {terminalMasDesfavorable.tipo === 'sinCandidatoDeterminable' ? (
                <p>Ningún terminal alcanzó balanceCompleto todavía.</p>
              ) : (
                <p>
                  <strong>{terminalMasDesfavorable.nodoId}</strong> — Presidual:{' '}
                  {formatearNumero(terminalMasDesfavorable.presionResidual_mca, 'm')}, Pmin:{' '}
                  {formatearNumero(terminalMasDesfavorable.presionMinimaRequerida_mca, 'm')}, margen:{' '}
                  {formatearNumero(terminalMasDesfavorable.margen_mca, 'm')} —{' '}
                  {terminalMasDesfavorable.cumpleMinimo ? 'Cumple' : 'No cumple'}
                  {terminalMasDesfavorable.tipo === 'candidatoProvisional' ? (
                    <>
                      {' '}
                      <small>
                        (provisional: {terminalMasDesfavorable.terminalesExcluidos.length} terminal(es) todavía sin
                        balanceCompleto podrían resultar más desfavorables)
                      </small>
                    </>
                  ) : null}
                </p>
              )}
            </div>
          ) : null}
        </>
      )}
    </section>
  )
}
