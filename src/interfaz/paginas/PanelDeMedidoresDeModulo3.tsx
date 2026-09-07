// Panel de Módulo 3 — Medidores (D-δ.56 parte 1 + D-δ.57 parte 2).
// Superficie de UI sobre resolverEstadoModulo3: NO calcula nada, arma los
// controles de configuración y de override manual, y formatea lo que el
// motor ya devuelve.
//
// La configuración SÍ se persiste en Proyecto.configuracionMedidores
// (propiedad horizontal, provisión de ACS, y el DN adoptado manualmente
// por medidor). Los resultados (Qc, DN recomendado, C, hf) NO se
// persisten: se recalculan en cada render. El DN adoptado es
// HIDRÁULICAMENTE EFECTIVO (D-δ.57): al pulsar ↑/↓ cambia el DN, y con él
// C y hf; "Auto" vuelve al recomendado.
//
// Rápido / Profesional se deriva del modo de trabajo ya existente
// (resolverModoDeTrabajo, D-δ.51). Profesional agrega detalle técnico. Los
// controles ↓/DN/↑/Auto se muestran en ambos modos (coherencia con el
// control de DN de tuberías de D-δ.52).
//
// M3-E (pendiente): integración de estas pérdidas al balance de presión.
import type { Proyecto } from '../../modelo/proyecto'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import {
  resolverEstadoModulo3,
  type MedidorIndividualEvaluado,
  type ResultadoMedidorGeneral,
} from '../../motor/modulo3/resolverEstadoModulo3'
import { tipoProvisionACSEfectivo } from '../../motor/modulo3/tipoProvisionACSEfectivo'
import type { MedidorEvaluado } from '../../motor/medidores/resolverMedidorAdoptado'
import { resolverModoDeTrabajo } from './modoDeTrabajo'
import { resolverControlDeMedidor } from './resolverControlDeMedidor'
import {
  conMedidorGeneralAdoptado,
  conMedidorIndividualAdoptado,
  conModulo3Iniciado,
  conPropiedadHorizontal,
  conTipoProvisionACS,
  conTipoProvisionACSDeUnidadFuncional,
} from './actualizarConfiguracionMedidores'
import {
  ETIQUETA_ESTADO_MODULO_3,
  ETIQUETA_SERVICIO_MEDIDO,
  ETIQUETA_TIPO_PROVISION_ACS,
  describirMotivoIncompletitudModulo3,
  formatearMagnitudDeMedidor,
} from './humanizarModulo3'

const fmt = formatearMagnitudDeMedidor

function ConfiguracionDeMedidores({
  proyecto,
  onCambiar,
}: {
  proyecto: Proyecto
  onCambiar: (proyecto: Proyecto) => void
}) {
  const config = proyecto.configuracionMedidores
  if (config === undefined) {
    return null
  }

  return (
    <div>
      <h3>Configuración</h3>
      <p>
        <label>
          <input
            type="checkbox"
            checked={config.esPropiedadHorizontal}
            onChange={(evento) => onCambiar(conPropiedadHorizontal(proyecto, evento.target.checked))}
          />{' '}
          Propiedad horizontal / múltiples propietarios
        </label>{' '}
        <small>
          ERAS §2.6: con más de un propietario es obligatoria la medición individual de cada unidad, además del
          medidor general.
        </small>
      </p>

      {config.esPropiedadHorizontal ? (
        <>
          <p>
            <label>
              Provisión de agua caliente (por defecto):{' '}
              <select
                value={config.tipoProvisionACS}
                onChange={(evento) =>
                  onCambiar(conTipoProvisionACS(proyecto, evento.target.value === 'central' ? 'central' : 'individual'))
                }
              >
                <option value="individual">{ETIQUETA_TIPO_PROVISION_ACS.individual}</option>
                <option value="central">{ETIQUETA_TIPO_PROVISION_ACS.central}</option>
              </select>
            </label>
          </p>

          <details>
            <summary>Configurar excepciones por unidad funcional</summary>
            <p>
              <small>
                Cada unidad usa el valor por defecto salvo que se indique otra cosa. "Individual" mide sólo el
                ramal de agua fría de entrada; "Central" mide agua fría y agua caliente por separado.
              </small>
            </p>
            {proyecto.unidadesFuncionales.map((uf) => {
              const valorOverride = config.tipoProvisionACSPorUnidadFuncional?.[uf.id] ?? 'default'
              return (
                <p key={uf.id}>
                  <label>
                    {uf.nombre}:{' '}
                    <select
                      value={valorOverride}
                      onChange={(evento) => {
                        const v = evento.target.value
                        onCambiar(
                          conTipoProvisionACSDeUnidadFuncional(
                            proyecto,
                            uf.id,
                            v === 'individual' || v === 'central' ? v : 'default',
                          ),
                        )
                      }}
                    >
                      <option value="default">
                        Usar el valor por defecto ({ETIQUETA_TIPO_PROVISION_ACS[config.tipoProvisionACS]})
                      </option>
                      <option value="individual">{ETIQUETA_TIPO_PROVISION_ACS.individual}</option>
                      <option value="central">{ETIQUETA_TIPO_PROVISION_ACS.central}</option>
                    </select>
                  </label>{' '}
                  <small>efectivo: {ETIQUETA_TIPO_PROVISION_ACS[tipoProvisionACSEfectivo(config, uf.id)]}</small>
                </p>
              )
            })}
          </details>
        </>
      ) : null}
    </div>
  )
}

// Control compacto ↓ / DN / ↑ / Auto de un medidor. `onAdoptar` recibe el
// DN elegido o 'auto' para volver al recomendado.
function ControlDeDnDeMedidor({
  medidor,
  onAdoptar,
}: {
  medidor: MedidorEvaluado
  onAdoptar: (dn: number | 'auto') => void
}) {
  const control = resolverControlDeMedidor(medidor)
  return (
    <span>
      <button
        type="button"
        disabled={control.dnAnterior_mm === null}
        onClick={() => control.dnAnterior_mm !== null && onAdoptar(control.dnAnterior_mm)}
        aria-label="Diámetro inmediato inferior"
      >
        ↓
      </button>{' '}
      <strong>{fmt(control.dnAdoptado_mm, 'diametro')} mm</strong>{' '}
      <button
        type="button"
        disabled={control.dnSiguiente_mm === null}
        onClick={() => control.dnSiguiente_mm !== null && onAdoptar(control.dnSiguiente_mm)}
        aria-label="Diámetro inmediato superior"
      >
        ↑
      </button>{' '}
      {control.origen === 'manual' ? (
        <>
          <em>Manual</em>{' '}
          <button type="button" onClick={() => onAdoptar('auto')}>
            Auto
          </button>{' '}
          <small>(recomendado: {fmt(control.dnRecomendado_mm, 'diametro')} mm)</small>
        </>
      ) : (
        <em>Auto</em>
      )}
      {control.criterioSeleccion === 'inferiorAlRecomendado' ? (
        <>
          {' '}
          <span role="img" aria-label="advertencia">
            ⚠
          </span>{' '}
          <small>El medidor adoptado no satisface el criterio de selección de la Tabla N°6 para este caudal.</small>
        </>
      ) : null}
    </span>
  )
}

function TablaMedidorGeneral({
  resultado,
  esProfesional,
  onCambiar,
  proyecto,
}: {
  resultado: ResultadoMedidorGeneral
  esProfesional: boolean
  onCambiar: (proyecto: Proyecto) => void
  proyecto: Proyecto
}) {
  const { recomendado, adoptado } = resultado
  return (
    <div>
      <h3>Medidor general</h3>
      <table>
        <tbody>
          <tr>
            <th>Qc utilizado</th>
            <td>
              {fmt(resultado.qcDiseno_m3h, 'caudal')} m³/h
              {esProfesional ? ` (${fmt(resultado.qcDiseno_lps, 'caudal')} l/s)` : ''}
            </td>
          </tr>
          <tr>
            <th>DN</th>
            <td>
              <ControlDeDnDeMedidor
                medidor={resultado}
                onAdoptar={(dn) => onCambiar(conMedidorGeneralAdoptado(proyecto, dn))}
              />
            </td>
          </tr>
          <tr>
            <th>Capacidad máxima C</th>
            <td>{fmt(adoptado.capacidadMaxima_m3h, 'caudal')} m³/h</td>
          </tr>
          <tr>
            <th>Pérdida de carga hf</th>
            <td>{fmt(adoptado.hfMedidor_mca, 'perdida')} m.c.a.</td>
          </tr>
          {esProfesional ? (
            <>
              <tr>
                <th>DN recomendado</th>
                <td>{fmt(recomendado.dnMedidor_mm, 'diametro')} mm (C {fmt(recomendado.capacidadMaxima_m3h, 'caudal')} m³/h)</td>
              </tr>
              <tr>
                <th>Caudal medio (Tabla N°6)</th>
                <td>{fmt(adoptado.caudalMedio_m3h, 'caudal')} m³/h</td>
              </tr>
              <tr>
                <th>Umbral de fila (Tabla N°6)</th>
                <td>Qc proyecto ≥ {fmt(adoptado.qcProyectoTabla_m3h, 'caudal')} m³/h</td>
              </tr>
            </>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}

function FilaMedidorIndividual({
  medidor,
  esProfesional,
  onCambiar,
  proyecto,
}: {
  medidor: MedidorIndividualEvaluado
  esProfesional: boolean
  onCambiar: (proyecto: Proyecto) => void
  proyecto: Proyecto
}) {
  const { resultado } = medidor
  return (
    <tr>
      <td>{resultado.unidadFuncionalId}</td>
      <td>{ETIQUETA_SERVICIO_MEDIDO[resultado.servicioMedido]}</td>
      <td>
        {fmt(resultado.qcDiseno_m3h, 'caudal')} m³/h
        {esProfesional ? ` (${fmt(resultado.qcDiseno_lps, 'caudal')} l/s, ${resultado.nConsumos} consumos)` : ''}
      </td>
      <td>
        <ControlDeDnDeMedidor
          medidor={resultado}
          onAdoptar={(dn) =>
            onCambiar(
              conMedidorIndividualAdoptado(proyecto, resultado.unidadFuncionalId, resultado.servicioMedido, dn),
            )
          }
        />
      </td>
      <td>{fmt(resultado.adoptado.capacidadMaxima_m3h, 'caudal')} m³/h</td>
      <td>{fmt(resultado.adoptado.hfMedidor_mca, 'perdida')} m.c.a.</td>
    </tr>
  )
}

export function PanelDeMedidoresDeModulo3({
  proyecto,
  onCambiar,
}: {
  proyecto: Proyecto
  onCambiar: (proyecto: Proyecto) => void
}) {
  const estado = resolverEstadoModulo3(proyecto, catalogoArtefactos, coeficientesMayoracion)
  const esProfesional = resolverModoDeTrabajo(proyecto.configuracionHidraulica) !== 'rapido'

  return (
    <details open>
      <summary>
        <h2>Módulo 3 — Medidores</h2>
      </summary>

      {estado.estado === 'noIniciado' ? (
        <p>
          El Módulo 3 todavía no fue iniciado.{' '}
          <button type="button" onClick={() => onCambiar(conModulo3Iniciado(proyecto))}>
            Iniciar Módulo 3
          </button>
        </p>
      ) : (
        <>
          <ConfiguracionDeMedidores proyecto={proyecto} onCambiar={onCambiar} />

          <p>
            <strong>Estado:</strong> {ETIQUETA_ESTADO_MODULO_3[estado.estado]}
          </p>

          {estado.estado === 'error' ? (
            <ul>
              {estado.problemas.map((problema, indice) => (
                <li key={indice}>{problema.problema.codigo}</li>
              ))}
            </ul>
          ) : null}

          {estado.estado === 'incompleto' ? (
            <ul>
              {estado.motivos.map((motivo, indice) => (
                <li key={indice}>{describirMotivoIncompletitudModulo3(motivo)}</li>
              ))}
            </ul>
          ) : null}

          {estado.estado === 'evaluado' ? (
            <>
              <TablaMedidorGeneral
                resultado={estado.resultado.medidorGeneral}
                esProfesional={esProfesional}
                onCambiar={onCambiar}
                proyecto={proyecto}
              />

              {estado.resultado.medidoresIndividuales.length > 0 ? (
                <div>
                  <h3>Medidores individuales</h3>
                  <table>
                    <thead>
                      <tr>
                        <th>Unidad funcional</th>
                        <th>Servicio</th>
                        <th>Q utilizado</th>
                        <th>DN</th>
                        <th>C</th>
                        <th>hf</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estado.resultado.medidoresIndividuales.map((medidor) => (
                        <FilaMedidorIndividual
                          key={`${medidor.resultado.unidadFuncionalId}·${medidor.resultado.servicioMedido}`}
                          medidor={medidor}
                          esProfesional={esProfesional}
                          onCambiar={onCambiar}
                          proyecto={proyecto}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : proyecto.configuracionMedidores?.esPropiedadHorizontal ? (
                <p>
                  <small>
                    Sin medidores individuales: ninguna unidad funcional tiene consumos con conexión física
                    cargada.
                  </small>
                </p>
              ) : null}
            </>
          ) : null}
        </>
      )}
    </details>
  )
}
