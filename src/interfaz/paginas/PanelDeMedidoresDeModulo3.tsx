// Panel de Módulo 3 — Medidores (D-δ.56, M3-D parte 1). Superficie de UI
// sobre resolverEstadoModulo3: NO calcula nada, arma los controles de
// configuración (propiedad horizontal, provisión de ACS global + override
// por UF) y formatea el resultado que el motor ya devuelve.
//
// La configuración SÍ se persiste en Proyecto.configuracionMedidores
// (D-δ.55) -- a diferencia del input provisional de hfMedidor del Panel de
// Presión. Los resultados (Qc, DN, C, hf, estado) NO se persisten: se
// recalculan en cada render llamando a resolverEstadoModulo3.
//
// Rápido / Profesional: se deriva del modo de trabajo ya existente
// (resolverModoDeTrabajo sobre configuracionHidraulica, D-δ.51) -- no se
// introduce un eje nuevo. Rápido muestra el resultado protagonista con
// columnas mínimas; Profesional agrega detalle técnico (caudal medio,
// umbral de Tabla N°6, cantidad de consumos del alcance).
//
// M3-D parte 2 (pendiente): override manual de medidor recomendado vs.
// adoptado (↑/↓/Auto sobre Tabla N°6, hidráulicamente efectivo). M3-E
// (pendiente): integración de hfMedidor al balance de presión de M2.
import type { Proyecto } from '../../modelo/proyecto'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import {
  resolverEstadoModulo3,
  type MedidorIndividualEvaluado,
  type ResultadoModulo3,
} from '../../motor/modulo3/resolverEstadoModulo3'
import { tipoProvisionACSEfectivo } from '../../motor/modulo3/tipoProvisionACSEfectivo'
import { resolverModoDeTrabajo } from './modoDeTrabajo'
import {
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
                  <small>
                    efectivo: {ETIQUETA_TIPO_PROVISION_ACS[tipoProvisionACSEfectivo(config, uf.id)]}
                  </small>
                </p>
              )
            })}
          </details>
        </>
      ) : null}
    </div>
  )
}

function TablaMedidorGeneral({ resultado, esProfesional }: { resultado: ResultadoModulo3; esProfesional: boolean }) {
  const g = resultado.medidorGeneral
  return (
    <div>
      <h3>Medidor general</h3>
      <table>
        <tbody>
          <tr>
            <th>Qc utilizado</th>
            <td>
              {fmt(g.qcDiseno_m3h, 'caudal')} m³/h{esProfesional ? ` (${fmt(g.qcDiseno_lps, 'caudal')} l/s)` : ''}
            </td>
          </tr>
          <tr>
            <th>DN recomendado</th>
            <td>{fmt(g.dnMedidor_mm, 'diametro')} mm</td>
          </tr>
          <tr>
            <th>Capacidad máxima C</th>
            <td>{fmt(g.capacidadMaxima_m3h, 'caudal')} m³/h</td>
          </tr>
          <tr>
            <th>Pérdida de carga hf</th>
            <td>{fmt(g.hfMedidor_mca, 'perdida')} m.c.a.</td>
          </tr>
          {esProfesional ? (
            <>
              <tr>
                <th>Caudal medio (Tabla N°6)</th>
                <td>{fmt(g.caudalMedio_m3h, 'caudal')} m³/h</td>
              </tr>
              <tr>
                <th>Umbral de fila (Tabla N°6)</th>
                <td>Qc proyecto ≥ {fmt(g.qcProyectoTabla_m3h, 'caudal')} m³/h</td>
              </tr>
            </>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}

function FilaMedidorIndividual({ medidor, esProfesional }: { medidor: MedidorIndividualEvaluado; esProfesional: boolean }) {
  const { resultado } = medidor
  return (
    <tr>
      <td>{resultado.unidadFuncionalId}</td>
      <td>{ETIQUETA_SERVICIO_MEDIDO[resultado.servicioMedido]}</td>
      <td>
        {fmt(resultado.qcDiseno_m3h, 'caudal')} m³/h
        {esProfesional ? ` (${fmt(resultado.qunitTotal_lps, 'caudal')} l/s, ${resultado.nConsumos} consumos)` : ''}
      </td>
      <td>{fmt(resultado.dnMedidor_mm, 'diametro')} mm</td>
      <td>{fmt(resultado.capacidadMaxima_m3h, 'caudal')} m³/h</td>
      <td>{fmt(resultado.hfMedidor_mca, 'perdida')} m.c.a.</td>
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
              <TablaMedidorGeneral resultado={estado.resultado} esProfesional={esProfesional} />

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
