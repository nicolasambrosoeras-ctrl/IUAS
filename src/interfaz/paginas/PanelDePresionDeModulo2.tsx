// Panel de verificación de presión de Módulo 2 (M2-B): superficie de UI
// que llega hasta balanceCompleto usando exclusivamente primitivas ya
// productivas -- resolverPresionResidualDeCamino, resolverTerminalMasDesfavorable,
// resolverEstadoModulo2. Este componente NO calcula hidráulica: arma los
// candidatos (un llamado por terminal), formatea lo que el motor ya
// devuelve, y persiste únicamente los números de entrada.
//
// Pdisponible y hfMedidor_mca son condiciones de borde EXTERNAS (D-δ.36/
// D-δ.35) -- deliberadamente NO se persisten en Proyecto (no existe ese
// campo en el modelo, y agregarlo sería decidir una entidad de dominio
// nueva no prevista, ver PENDIENTES-DE-ARQUITECTURA.md). Viven como
// estado local de este panel: se pierden al recargar la página, igual
// que el resto del Proyecto (que tampoco persiste hoy).
//
// D-δ.43: "Tipo de alimentación" (Tanque elevado / Presión conocida) es
// una traducción física de presentación sobre ese mismo contrato, NO una
// entidad nueva -- ver PENDIENTES-DE-ARQUITECTURA.md D-δ.43. Tanque
// elevado fija Pdisponible=0 y pide la cota del pelo de agua mínimo de
// cálculo como cota de la raíz (Δz hace el resto, D-δ.38: raíz = pelo de
// agua mínimo, nunca el máximo). Presión conocida pide cota del punto de
// alimentación + Pdisponible manual, exactamente el contrato ya vigente.
//
// D-δ.46: bajo GranularidadHidraulica='simplificada', cada TarjetaDeTerminal
// (TarjetaDeTerminal.tsx) deja de pedir su propia "Cota de conexión [m]"
// -- el motor ya usa la cota de la UnidadFuncional del terminal
// (resolverCotaTerminalEfectiva), así que ese input individual editaría
// un dato que el cálculo activo ni siquiera lee. En su lugar se muestra,
// dentro de "Detalle", la cota de referencia de la UF como dato derivado
// de solo lectura -- se edita en "Datos del proyecto"
// (MotorDemandaPantalla.tsx), no acá. En 'profesional' el input
// individual se conserva sin cambios.
import { useState } from 'react'
import type { Proyecto } from '../../modelo/proyecto'
import type { Nodo, ReferenciaDeArtefacto } from '../../modelo/redHidraulica'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import { catalogoMaterialesTuberia } from '../../motor/tuberias/materialTuberia'
import { catalogoSistemasDeTuberia } from '../../motor/tuberias/sistemaDeTuberia'
import { resolverPresionResidualDeCamino } from '../../motor/tuberias/presion/resolverPresionResidualDeCamino'
import {
  resolverTerminalMasDesfavorable,
  type CandidatoTerminal,
} from '../../motor/tuberias/presion/resolverTerminalMasDesfavorable'
import { resolverEstadoModulo2, type EstadoModulo2 } from '../../motor/modulo2/resolverEstadoModulo2'
import { formatearNumero } from '../../exportadores/pdf/formatearNumero'
import { describirReferenciaPendiente } from './ResultadoHidraulicoDeTramo'
import { agruparMotivosDeModulo2 } from './agruparMotivosDeModulo2'
import { parsearCota } from './parsearCota'
import { conCotaDeNodo } from './actualizarRedHidraulica'
import { TarjetaDeTerminal } from './TarjetaDeTerminal'
import { resolverInfoCotaDeTerminal } from './resolverInfoCotaDeTerminal'

// Mismo criterio que resolverCambioDeLongitud (resolverResultadoDeTramoParaUi.ts):
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

type TipoDeAlimentacion = 'tanqueElevado' | 'presionConocida'

export function PanelDePresionDeModulo2({
  proyecto,
  catalogoArtefactos,
  onCambiar,
}: {
  proyecto: Proyecto
  catalogoArtefactos: readonly ArtefactoNormativo[]
  onCambiar: (proyecto: Proyecto) => void
}) {
  const [tipoAlimentacion, setTipoAlimentacion] = useState<TipoDeAlimentacion>('presionConocida')
  const [presionDisponibleTexto, setPresionDisponibleTexto] = useState('')
  const [hfMedidorTexto, setHfMedidorTexto] = useState('')

  const presionDisponibleParseada = parsearEntradaHidraulica(presionDisponibleTexto)
  const hfMedidorParseado = parsearEntradaHidraulica(hfMedidorTexto)
  const presionDisponibleManual_mca = presionDisponibleParseada === 'ignorar' ? undefined : presionDisponibleParseada
  const hfMedidor_mca = hfMedidorParseado === 'ignorar' ? undefined : hfMedidorParseado
  // Tanque elevado (D-δ.38): la raíz hidráulica es el pelo de agua mínimo
  // de cálculo -- Pdisponible se fija en 0 y toda la carga estática queda
  // expresada por Δz (cotaRaiz = cota del pelo de agua mínimo). Presión
  // conocida conserva el input manual tal cual ya existía.
  const presionDisponible_mca = tipoAlimentacion === 'tanqueElevado' ? 0 : presionDisponibleManual_mca

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
  const nodoMasDesfavorable =
    terminalMasDesfavorable !== undefined && terminalMasDesfavorable.tipo !== 'sinCandidatoDeterminable'
      ? nodosTerminales.find((nodo) => nodo.id === terminalMasDesfavorable.nodoId)
      : undefined

  return (
    <section>
      <h3>Verificación de presión</h3>
      <p>
        <small>
          Estado de Módulo 2: <strong>{textoDeEstadoModulo2(estadoModulo2)}</strong>
        </small>
      </p>
      {estadoModulo2.estado === 'incompleto' ? (
        <div>
          <p>Para completar Módulo 2:</p>
          <ul>
            {agruparMotivosDeModulo2(estadoModulo2.motivos, proyecto.unidadesFuncionales).map((texto) => (
              <li key={texto}>{texto}</li>
            ))}
          </ul>
        </div>
      ) : null}

      <h4>Alimentación</h4>
      <p>
        <label>
          <input
            type="radio"
            name="tipoDeAlimentacion"
            checked={tipoAlimentacion === 'tanqueElevado'}
            onChange={() => setTipoAlimentacion('tanqueElevado')}
          />{' '}
          Tanque elevado
        </label>{' '}
        <label>
          <input
            type="radio"
            name="tipoDeAlimentacion"
            checked={tipoAlimentacion === 'presionConocida'}
            onChange={() => setTipoAlimentacion('presionConocida')}
          />{' '}
          Presión conocida / alimentación directa
        </label>
      </p>

      {tipoAlimentacion === 'tanqueElevado' ? (
        <>
          {nodosRaiz.map((nodo, indice) => (
            <label key={nodo.id} style={{ marginRight: '1rem' }}>
              Cota del pelo de agua mínimo de cálculo{nodosRaiz.length > 1 ? ` (alimentación ${indice + 1})` : ''} [m]:{' '}
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
              />
            </label>
          ))}
          <p>
            <small>
              La carga disponible se obtiene de la diferencia de nivel entre el pelo de agua mínimo y la conexión del
              artefacto.
            </small>
          </p>
        </>
      ) : (
        <>
          {nodosRaiz.map((nodo, indice) => (
            <label key={nodo.id} style={{ marginRight: '1rem' }}>
              Cota del punto de alimentación{nodosRaiz.length > 1 ? ` (alimentación ${indice + 1})` : ''} [m]:{' '}
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
              />
            </label>
          ))}
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
              Condición de borde hidráulica del origen (red pública, bombeo — sin modelar todavía, D-δ.36): ingresar
              el valor conocido en m.c.a. en el punto de alimentación.
            </small>
          </p>
        </>
      )}

      <h4>Medidor</h4>
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
          Valor manual hasta completar M3.
        </small>
      </p>

      {presionDisponible_mca === undefined ? (
        <p>Ingresá Pdisponible para ver el balance de presión de cada terminal.</p>
      ) : nodosTerminales.length === 0 ? (
        <p>El proyecto no tiene terminales hidráulicos (nodos con referencia a Artefacto) todavía.</p>
      ) : (
        <>
          {candidatos.map(({ nodoId, resultado }) => {
            const nodoDelTerminal = nodosTerminales.find((n) => n.id === nodoId)
            const etiqueta =
              nodoDelTerminal !== undefined
                ? describirReferenciaPendiente(proyecto, catalogoArtefactos, nodoDelTerminal.referencia)
                : nodoId
            const esRaizDelCamino = nodosRaiz.some((n) => n.id === nodoId)
            const infoCota = resolverInfoCotaDeTerminal(proyecto, nodoId, nodoDelTerminal, esRaizDelCamino, onCambiar)
            return (
              <TarjetaDeTerminal
                key={nodoId}
                etiqueta={etiqueta}
                infoCota={infoCota}
                presionDisponible_mca={presionDisponible_mca}
                hfMedidor_mca={hfMedidor_mca}
                resultado={resultado}
              />
            )
          })}

          {terminalMasDesfavorable !== undefined ? (
            <div>
              <h4>Terminal más desfavorable</h4>
              {terminalMasDesfavorable.tipo === 'sinCandidatoDeterminable' ? (
                <p>Ningún terminal alcanzó balanceCompleto todavía.</p>
              ) : (
                <p>
                  <strong>
                    {nodoMasDesfavorable !== undefined
                      ? describirReferenciaPendiente(proyecto, catalogoArtefactos, nodoMasDesfavorable.referencia)
                      : terminalMasDesfavorable.nodoId}
                  </strong>{' '}
                  — Presidual: {formatearNumero(terminalMasDesfavorable.presionResidual_mca, 'm')}, Pmin:{' '}
                  {formatearNumero(terminalMasDesfavorable.presionMinimaRequerida_mca, 'm')}, margen:{' '}
                  {formatearNumero(terminalMasDesfavorable.margen_mca, 'm')} —{' '}
                  {terminalMasDesfavorable.cumpleMinimo ? 'Cumple' : 'No cumple'}
                  {terminalMasDesfavorable.tipo === 'candidatoProvisional' ? (
                    <>
                      {' '}
                      <small>
                        (resultado provisional: {terminalMasDesfavorable.terminalesExcluidos.length} terminal(es)
                        todavía sin balanceCompleto podrían resultar más desfavorables)
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
