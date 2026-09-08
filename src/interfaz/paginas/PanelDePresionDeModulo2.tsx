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
// D-δ.43 / D-δ.68: el origen hidráulico ("Tanque elevado" / "Alimentación
// directa") ya NO se elige en este panel. Se DERIVA del esquema de
// abastecimiento persistido (Proyecto.configuracionAbastecimiento.esquema)
// vía resolverOrigenHidraulicoEfectivo (M4-G): `directa` → alimentación
// directa; `tanqueElevado` y `cisternaBombeoElevado` → tanque elevado (la
// cisterna y la bomba están aguas arriba del almacenamiento, no son un
// tercer origen terminal). Una sola fuente física; se editan en el Panel
// de Módulo 4.
//
// - Tanque elevado: Pdisponible = 0 y se pide la cota del pelo de agua
//   mínimo de cálculo como cota de la raíz (Δz hace el resto, D-δ.38).
// - Alimentación directa: Pdisponible = Proyecto.parametros.presionSobreAcera_m
//   (D-δ.38: es exactamente "la presión mínima garantizada sobre el nivel
//   de vereda"), referida a cota ≈ 0 de la raíz; se pide la cota del punto
//   de alimentación. `presionSobreAcera_m` se edita en el Panel de Módulo
//   4 (conPresionSobreAcera). NO se le resta `desnivelConexion_m` -- ese
//   desnivel es sólo para Tabla N°1 (Qconexión, CRIT-A37); M2 calcula su
//   propio Δz de camino.
// - Sin `configuracionAbastecimiento`: no hay origen físico derivable; la
//   verificación de presión queda 'incompleta' (el resto de M2 sigue
//   calculándose), con un mensaje que orienta a configurar el Módulo 4.
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
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import { formatearNumero } from '../../exportadores/pdf/formatearNumero'
import { describirReferenciaPendiente } from './ResultadoHidraulicoDeTramo'
import { agruparMotivosDeModulo2 } from './agruparMotivosDeModulo2'
import { parsearCota } from './parsearCota'
import { conCotaDeNodo } from './actualizarRedHidraulica'
import { TarjetaDeTerminal } from './TarjetaDeTerminal'
import { resolverInfoCotaDeTerminal } from './resolverInfoCotaDeTerminal'
import { filtrarCandidatosParaTerminalCritico } from './filtrarCandidatosParaTerminalCritico'
import { resolverRedDeTerminal } from './resolverRedDeTerminal'
import { resolverEntradasDeVerificacion } from './resolverEntradasDeVerificacion'
import { ETIQUETA_RED } from './humanizarModulo2'
import { ordenarCandidatosParaListado } from './ordenarCandidatosParaListado'
import { resolverResumenDeCumplimiento } from './resolverResumenDeCumplimiento'
import { resolverFilaDeTerminalParaTabla } from './resolverFilaDeTerminalParaTabla'
import { TablaDeTerminales } from './TablaDeTerminales'
import { CalculoDelCriticoDetalle } from './CalculoDelCriticoDetalle'

function esTerminalDeArtefacto(nodo: Nodo): nodo is Nodo & { referencia: ReferenciaDeArtefacto } {
  return nodo.referencia?.tipo === 'artefacto'
}

// D-δ.48: describirReferenciaPendiente devuelve la MISMA etiqueta para el
// terminal AF y el terminal AC de un mismo Artefacto mixto (se deriva
// solo de la referencia funcional UF→Local→Artefacto, nunca de la
// conectividad física) -- sin la Red, "Terminal más desfavorable" podía
// señalar, por ejemplo, "Unidad funcional 1 → Baño → Lavatorio" sin que
// se supiera si es el de agua fría o el de agua caliente de esa misma
// canilla. Se agrega acá, no en describirReferenciaPendiente, porque esa
// función también la usa AvisoCoberturaIncompleta para artefactos que
// TODAVÍA no tienen ninguna conexión física (ahí no hay Red que mostrar).
function etiquetaConRed(proyecto: Proyecto, catalogoArtefactos: readonly ArtefactoNormativo[], nodoId: string, referencia: ReferenciaDeArtefacto): string {
  const etiquetaBase = describirReferenciaPendiente(proyecto, catalogoArtefactos, referencia)
  const red = resolverRedDeTerminal(proyecto, nodoId)
  return red === undefined ? etiquetaBase : `${etiquetaBase} (${ETIQUETA_RED[red]})`
}

// D-δ.48, sección 22: nunca solo color -- símbolo + texto explícito.
function simboloDeCumplimiento(cumple: boolean): string {
  return cumple ? '✓' : '✕'
}

// UI-01C (D-δ.74 / UI-CRIT-05): "estado del cálculo" ≠ "resultado de
// cumplimiento". El discriminante interno sigue siendo `completo`, pero en
// la superficie principal ese estado se llama "cálculo disponible" para no
// leerse como un veredicto junto a "CUMPLE / NO CUMPLE".
function textoDeEstadoModulo2(estado: EstadoModulo2): string {
  switch (estado.estado) {
    case 'noIniciado':
      return 'No iniciado'
    case 'incompleto':
      return `Incompleto (${estado.motivos.length} motivo${estado.motivos.length === 1 ? '' : 's'})`
    case 'error':
      return `Error (${estado.problemas.length} problema${estado.problemas.length === 1 ? '' : 's'})`
    case 'completo':
      return 'cálculo disponible'
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
  // M4-G (D-δ.68): el origen hidráulico, la presión disponible en la raíz
  // y la pérdida de medidores por terminal se DERIVAN del Proyecto
  // (esquema de abastecimiento persistido + M3). UI-01C (D-δ.74): esa
  // derivación se extrajo a `resolverEntradasDeVerificacion` porque ahora
  // tiene un segundo consumidor -- el resumen compacto del proyecto en la
  // sidebar. Un esquema ausente o corrupto -> `origenEfectivo` undefined
  // -> la verificación de presión queda 'incompleta' (nunca throw).
  const esquemaAbastecimiento = proyecto.configuracionAbastecimiento?.esquema
  const { origenEfectivo, origenTexto, presionDisponible_mca, perdidasDeMedidoresDeTerminal, hfMedidorDeTerminal } =
    resolverEntradasDeVerificacion(proyecto, catalogoArtefactos, coeficientesMayoracion)

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
    hfMedidorDeTerminal,
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
            hfMedidorDeTerminal(nodo.id),
            catalogoArtefactos,
            catalogoSistemasDeTuberia,
            catalogoMaterialesTuberia,
          ),
        }))

  const candidatosParaTerminalCritico = filtrarCandidatosParaTerminalCritico(candidatos)
  const terminalMasDesfavorable =
    candidatosParaTerminalCritico.length > 0 ? resolverTerminalMasDesfavorable(candidatosParaTerminalCritico) : undefined
  const nodoMasDesfavorable =
    terminalMasDesfavorable !== undefined && terminalMasDesfavorable.tipo !== 'sinCandidatoDeterminable'
      ? nodosTerminales.find((nodo) => nodo.id === terminalMasDesfavorable.nodoId)
      : undefined
  const resumenDeCumplimiento = resolverResumenDeCumplimiento(candidatos)

  const referenciaPorNodoId = new Map(nodosTerminales.map((nodo) => [nodo.id, nodo.referencia]))

  // Verdict protagonista (brief D-δ.50 secciones 25-27): CUMPLE solo si
  // TODOS los verificables cumplen -- mismo denominador que el resumen
  // agregado (nunca incluye terminalSinPresionMinima ni incompletos).
  const hayVerificables = resumenDeCumplimiento.verificables > 0
  const cumpleGlobal = hayVerificables && resumenDeCumplimiento.cumplen === resumenDeCumplimiento.verificables

  // Datos del terminal mas desfavorable para el bloque protagonista y para
  // "Ver calculo del critico" -- se reutiliza la fila ya derivada (UF /
  // nivel / red) y la traza completa que el motor ya devolvio.
  const filaCritico =
    terminalMasDesfavorable !== undefined &&
    terminalMasDesfavorable.tipo !== 'sinCandidatoDeterminable' &&
    nodoMasDesfavorable !== undefined
      ? resolverFilaDeTerminalParaTabla(proyecto, catalogoArtefactos, nodoMasDesfavorable.referencia, {
          nodoId: terminalMasDesfavorable.nodoId,
          resultado: candidatos.find((c) => c.nodoId === terminalMasDesfavorable.nodoId)!.resultado,
        })
      : undefined
  const resultadoCritico =
    terminalMasDesfavorable !== undefined && terminalMasDesfavorable.tipo !== 'sinCandidatoDeterminable'
      ? candidatos.find((c) => c.nodoId === terminalMasDesfavorable.nodoId)?.resultado
      : undefined
  const cotaRaizCritico =
    resultadoCritico?.tipo === 'balanceCompleto'
      ? proyecto.redHidraulica?.nodos.find((n) => n.id === resultadoCritico.raizId)?.cota_m
      : undefined

  const motivosAgrupados =
    estadoModulo2.estado === 'incompleto'
      ? agruparMotivosDeModulo2(estadoModulo2.motivos, proyecto.unidadesFuncionales)
      : []

  return (
    <section className="ui-stack">
      <h3>Verificación de presión</h3>
      <p>
        <small>
          Estado del cálculo: <strong>{textoDeEstadoModulo2(estadoModulo2)}</strong>
        </small>
      </p>

      {/* UI-CRIT-02 (sección 20): la alimentación es DATO/DECISIÓN de
          entrada de la verificación, no su resultado -- superficie de
          configuración, separada de la card de veredicto. */}
      <div className="ui-card ui-card--config ui-stack--sm">
        <h4 className="ui-card__titulo">Datos para la verificación</h4>

        {origenEfectivo === undefined ? (
          <p>
            <small>
              Configurá el esquema de abastecimiento en el <strong>Módulo 4</strong> para verificar la presión.
            </small>
          </p>
        ) : (
          <>
            <p>
              <small>
                Origen hidráulico: <strong>{origenTexto}</strong> — derivado del esquema de abastecimiento del
                Módulo 4.
                {esquemaAbastecimiento === 'cisternaBombeoElevado'
                  ? ' El esquema incluye cisterna y bombeo aguas arriba del tanque elevado.'
                  : ''}
              </small>
            </p>

            {origenEfectivo === 'tanqueElevado' ? (
            nodosRaiz.map((nodo, indice) => (
              <label key={nodo.id} style={{ marginRight: '1rem' }}>
                Pelo de agua mínimo{nodosRaiz.length > 1 ? ` (alimentación ${indice + 1})` : ''} [m]:{' '}
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
            ))
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
              <p>
                <small>
                  Presión disponible (sobre acera): {formatearNumero(proyecto.parametros.presionSobreAcera_m, 'm')} m
                  — se edita en el Módulo 4.
                </small>
              </p>
            </>
          )}
          </>
        )}
        <details>
          <summary>
            <small>¿Cómo se completan estos datos?</small>
          </summary>
          <p>
            <small>
              El <strong>origen hidráulico</strong> se toma del esquema de abastecimiento del Módulo 4 (D-δ.68).
              <strong> Tanque elevado</strong> (esquemas con tanque, incluido cisterna + bombeo): la carga disponible se
              obtiene de la diferencia de nivel entre el pelo de agua mínimo y la conexión del artefacto.
              <strong> Alimentación directa</strong>: la condición de borde es la presión sobre el nivel de acera
              (<code>presionSobreAcera_m</code>), que se edita en el Módulo 4. La{' '}
              <strong>pérdida de los medidores</strong> la calcula el Módulo 3 según ese origen y el camino de cada
              terminal (D-δ.58). Completá el Módulo 3 — Medidores para cerrar el balance.
            </small>
          </p>
        </details>
      </div>

      {nodosTerminales.length === 0 ? (
        <p>El proyecto no tiene terminales hidráulicos (nodos con referencia a Artefacto) todavía.</p>
      ) : presionDisponible_mca === undefined || !hayVerificables ? (
        // Estado incompleto (brief seccion 24): el protagonista es "qué
        // falta", agrupado -- nunca una lista de N terminales repitiendo
        // el mismo motivo. El detalle por terminal queda detras de un
        // disclosure secundario para auditoria. UI-01C (§17): superficie
        // NEUTRA -- "falta información" no es un error catastrófico.
        <div className="ui-card ui-card--config ui-stack--sm">
          <h4 className="ui-card__titulo" style={{ color: 'var(--color-advertencia)' }}>
            No se puede calcular la presión todavía
          </h4>
          {motivosAgrupados.length > 0 ? (
            <>
              <p>Para completar la verificación hidráulica:</p>
              <ul>
                {motivosAgrupados.map((texto) => (
                  <li key={texto}>{texto}</li>
                ))}
              </ul>
              <p>
                <small>Completá los campos indicados arriba (longitudes, alimentación, medidor) para obtener el balance.</small>
              </p>
            </>
          ) : presionDisponible_mca === undefined ? (
            <p>Ingresá Pdisponible para ver el balance de presión de cada terminal.</p>
          ) : (
            <p>Ningún terminal alcanzó un balance de presión completo todavía.</p>
          )}
          {presionDisponible_mca !== undefined && candidatos.length > 0 ? (
          <details>
            <summary>Ver detalle de terminales ({candidatos.length})</summary>
            {ordenarCandidatosParaListado(candidatos).map(({ nodoId, resultado }) => {
              const nodoDelTerminal = nodosTerminales.find((n) => n.id === nodoId)
              const etiqueta =
                nodoDelTerminal !== undefined
                  ? etiquetaConRed(proyecto, catalogoArtefactos, nodoId, nodoDelTerminal.referencia)
                  : nodoId
              const esRaizDelCamino = nodosRaiz.some((n) => n.id === nodoId)
              const infoCota = resolverInfoCotaDeTerminal(proyecto, nodoId, nodoDelTerminal, esRaizDelCamino, onCambiar)
              return (
                <TarjetaDeTerminal
                  key={nodoId}
                  etiqueta={etiqueta}
                  infoCota={infoCota}
                  presionDisponible_mca={presionDisponible_mca}
                  hfMedidor_mca={hfMedidorDeTerminal(nodoId)}
                  resultado={resultado}
                />
              )
            })}
          </details>
          ) : null}
        </div>
      ) : (
        // UI-01C (§17-18): la variante visual de la card se deriva
        // EXCLUSIVAMENTE del veredicto ya calculado (`cumpleGlobal`) -- no
        // se recalcula cumplimiento. CUMPLE → superficie verde suave;
        // NO CUMPLE → superficie roja suave. El color refuerza, nunca es
        // el único indicador (el badge lleva símbolo + texto).
        <div
          className={`ui-card ui-card--resultado ui-stack--sm ${
            cumpleGlobal ? 'ui-card--ok' : 'ui-card--error'
          }`}
        >
          {/* Verdict protagonista y conclusión visual del flujo (secciones
              25-27, 38, 79): el veredicto global se lee de un vistazo. */}
          <p className="ui-cluster" style={{ fontSize: '1.15em' }}>
            <span className={cumpleGlobal ? 'ui-badge ui-badge--ok' : 'ui-badge ui-badge--error'}>
              <strong>{cumpleGlobal ? '✓ CUMPLE' : '✕ NO CUMPLE'}</strong>
            </span>
          </p>
          <p>
            {cumpleGlobal
              ? '✓ TODOS LOS PUNTOS VERIFICABLES CUMPLEN'
              : `✕ ${resumenDeCumplimiento.verificables - resumenDeCumplimiento.cumplen} DE ${resumenDeCumplimiento.verificables} PUNTOS NO CUMPLEN`}
          </p>
          {!cumpleGlobal && filaCritico?.margen_mca !== undefined ? (
            <p>
              Margen crítico: <strong>{filaCritico.margen_mca >= 0 ? '+' : ''}{formatearNumero(filaCritico.margen_mca, 'm')} m.c.a.</strong>
            </p>
          ) : null}
          {estadoModulo2.estado === 'incompleto' ? (
            <p>
              <small>
                Todavía faltan datos para {candidatos.length - resumenDeCumplimiento.verificables} terminal(es) — el
                resultado puede cambiar cuando se completen (ver "Ver todos los terminales").
              </small>
            </p>
          ) : null}

          {terminalMasDesfavorable !== undefined && terminalMasDesfavorable.tipo !== 'sinCandidatoDeterminable' && filaCritico !== undefined ? (
            <div>
              <h4>Terminal más desfavorable</h4>
              <p>
                <strong>{filaCritico.artefacto}</strong> — {filaCritico.ubicacion} — {filaCritico.redTexto}
              </p>
              <table style={{ borderCollapse: 'collapse' }}>
                <tbody>
                  <tr>
                    <th style={{ textAlign: 'left', paddingRight: '1rem' }}>Presión residual disponible</th>
                    <td>{formatearNumero(terminalMasDesfavorable.presionResidual_mca, 'm')} m.c.a.</td>
                  </tr>
                  <tr>
                    <th style={{ textAlign: 'left', paddingRight: '1rem' }}>Presión mínima requerida</th>
                    <td>{formatearNumero(terminalMasDesfavorable.presionMinimaRequerida_mca, 'm')} m.c.a.</td>
                  </tr>
                  <tr>
                    <th style={{ textAlign: 'left', paddingRight: '1rem' }}>
                      <strong>Margen</strong>
                    </th>
                    <td>
                      <strong>
                        {terminalMasDesfavorable.margen_mca >= 0 ? '+' : ''}
                        {formatearNumero(terminalMasDesfavorable.margen_mca, 'm')} m.c.a.
                      </strong>{' '}
                      {simboloDeCumplimiento(terminalMasDesfavorable.cumpleMinimo)}{' '}
                      {terminalMasDesfavorable.cumpleMinimo ? 'CUMPLE' : 'NO CUMPLE'}
                    </td>
                  </tr>
                </tbody>
              </table>
              <p>
                <small>El terminal más desfavorable se elige por menor margen respecto de la presión mínima requerida, no por menor presión residual.</small>
              </p>
              {terminalMasDesfavorable.tipo === 'candidatoProvisional' ? (
                <p>
                  <small>
                    Resultado provisional: {terminalMasDesfavorable.terminalesExcluidos.length} terminal(es) todavía sin
                    balance completo podrían resultar más desfavorables.
                  </small>
                </p>
              ) : null}
              {resultadoCritico?.tipo === 'balanceCompleto' ? (
                <details>
                  <summary>Ver cálculo del crítico</summary>
                  <CalculoDelCriticoDetalle
                    proyecto={proyecto}
                    catalogoArtefactos={catalogoArtefactos}
                    resultado={resultadoCritico}
                    presionDisponible_mca={presionDisponible_mca}
                    hfMedidor_mca={
                      nodoMasDesfavorable !== undefined ? hfMedidorDeTerminal(nodoMasDesfavorable.id) : undefined
                    }
                    perdidasDeMedidores={
                      nodoMasDesfavorable !== undefined
                        ? perdidasDeMedidoresDeTerminal(nodoMasDesfavorable.id)
                        : undefined
                    }
                    origenTexto={origenTexto}
                    cotaRaiz_m={cotaRaizCritico}
                  />
                </details>
              ) : null}
            </div>
          ) : null}

          <details>
            <summary>Ver todos los terminales ({candidatos.length})</summary>
            <TablaDeTerminales
              proyecto={proyecto}
              catalogoArtefactos={catalogoArtefactos}
              candidatos={candidatos}
              referenciaPorNodoId={referenciaPorNodoId}
            />
          </details>
        </div>
      )}
    </section>
  )
}
