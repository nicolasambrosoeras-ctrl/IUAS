// Panel de Módulo 4 — Abastecimiento y reserva (D-δ.67).
// Superficie de UI sobre resolverEstadoModulo4: NO calcula nada. Arma los
// controles de configuración (esquema, Tc, DN de conexión, presión sobre
// acera, desnivel firmado, capacidades adoptadas) y formatea lo que el
// motor ya devuelve (Qc, presión de cálculo, Qconexión, déficit, Reserva
// Total Diaria de Diseño, verificación de adopción y distribución §2.11.3).
//
// Todo lo que se edita se persiste vía updaters puros existentes; ningún
// resultado se persiste (se recalcula en cada render). Rápido / Profesional
// se deriva del modo de trabajo transversal (resolverModoDeTrabajo, D-δ.51),
// sin eje nuevo. Este panel no importa código de M2; la única superficie
// compartida es que el esquema de abastecimiento y la presión sobre acera
// que se editan acá los consume después el Panel de Presión de M2 (D-δ.68).
import { useId } from 'react'
import type {
  ConfiguracionDeAbastecimiento,
  EsquemaDeAbastecimiento,
  Proyecto,
} from '../../modelo/proyecto'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import {
  columnasDeDiametroTabla01,
  esDiametroAdmisibleComoConexion,
} from '../../normativa/eras-2023/tabla-01-gastos-conexion'
import {
  resolverEstadoModulo4,
  type EstadoModulo4,
  type ResultadoModulo4,
} from '../../motor/modulo4/resolverEstadoModulo4'
import type { ResultadoAdopcionDeReserva } from '../../motor/modulo4/resolverAdopcionDeReserva'
import { resolverModoDeTrabajo } from './modoDeTrabajo'
import { parsearCota } from './parsearCota'
import {
  conEsquemaDeAbastecimiento,
  conPeriodoConsumoMaximo,
  conVolumenTanqueBombeoAdoptado,
  conVolumenTanqueElevadoAdoptado,
} from './actualizarConfiguracionAbastecimiento'
import {
  conDesnivelConexion,
  conDiametroNominalConexion,
  conPresionSobreAcera,
} from './actualizarParametrosDeConexion'
import {
  ETIQUETA_ESQUEMA_ABASTECIMIENTO,
  ETIQUETA_ESTADO_MODULO_4,
  describirMotivoIncompletitudModulo4,
  describirProblemaDeErrorModulo4,
  etiquetaDesnivelConexion,
  formatearCaudal_lps,
  formatearNumeroM4,
  formatearPresion_m,
  formatearVolumen_m3,
  formatearVolumen_L,
  litrosParaInput,
  m3DesdeLitros,
} from './humanizarModulo4'

type OnCambiar = (proyecto: Proyecto) => void

const DN_DE_CONEXION_m: readonly number[] = columnasDeDiametroTabla01
  .map((columna) => columna.diametroNominal_m)
  .filter((diametroNominal_m) => esDiametroAdmisibleComoConexion(diametroNominal_m))

const dnEnMm = (diametroNominal_m: number): number => Math.round(diametroNominal_m * 1000)

// Parseo de un <input> numérico NO negativo (Tc, presión sobre acera,
// volúmenes adoptados). '' -> undefined; NaN o negativo -> 'ignorar'
// (no se corrige en silencio: la validación/verificación reportan aparte).
// Mismo principio que parsearEntradaHidraulica de PanelDePresionDeModulo2.
function parsearNoNegativo(texto: string): number | undefined | 'ignorar' {
  if (texto === '') {
    return undefined
  }
  const valor = Number(texto)
  return Number.isNaN(valor) || valor < 0 ? 'ignorar' : valor
}

// --- Configuración ---------------------------------------------------------

// Presión mínima garantizada sobre el nivel de acera (ParametrosProyecto,
// D-δ.38). Es un dato de la Operadora que interviene en DOS lugares:
//  - Tabla N°1 (§2.7): presión de cálculo = presión sobre acera − desnivel
//    -> Qconexión -> Reserva Total Diaria (sólo esquemas con tanque);
//  - Módulo 2, esquema 'directa': es la presión disponible en la raíz del
//    balance de presión (D-δ.68), tal cual, sin restarle el desnivel.
// Por eso se edita también en el esquema 'directa', aunque ahí no haya
// cálculo de reserva: el Panel de Presión de Módulo 2 la muestra de sólo
// lectura ("se edita en el Módulo 4").
function EntradaPresionSobreAcera({
  proyecto,
  onCambiar,
}: {
  proyecto: Proyecto
  onCambiar: OnCambiar
}) {
  return (
    <label>
      Presión sobre acera [m]:{' '}
      <input
        type="number"
        min={0}
        step="any"
        value={proyecto.parametros.presionSobreAcera_m}
        onChange={(evento) => {
          const valor = parsearNoNegativo(evento.target.value)
          if (valor !== 'ignorar' && valor !== undefined) {
            onCambiar(conPresionSobreAcera(proyecto, valor))
          }
        }}
        style={{ width: '6rem' }}
      />
    </label>
  )
}

function SelectorDeEsquema({
  configuracion,
  proyecto,
  onCambiar,
}: {
  configuracion: ConfiguracionDeAbastecimiento
  proyecto: Proyecto
  onCambiar: OnCambiar
}) {
  const nombre = useId()
  return (
    <fieldset>
      <legend>Esquema de abastecimiento</legend>
      {(Object.keys(ETIQUETA_ESQUEMA_ABASTECIMIENTO) as EsquemaDeAbastecimiento[]).map((esquema) => (
        <label key={esquema} style={{ display: 'block' }}>
          <input
            type="radio"
            name={nombre}
            checked={configuracion.esquema === esquema}
            onChange={() => onCambiar(conEsquemaDeAbastecimiento(proyecto, esquema))}
          />{' '}
          {ETIQUETA_ESQUEMA_ABASTECIMIENTO[esquema]}
        </label>
      ))}
    </fieldset>
  )
}

function ConfiguracionDeConexionYReserva({
  configuracion,
  proyecto,
  onCambiar,
}: {
  configuracion: ConfiguracionDeAbastecimiento
  proyecto: Proyecto
  onCambiar: OnCambiar
}) {
  const { esquema } = configuracion
  const { diametroNominalConexion_m, desnivelConexion_m } = proyecto.parametros

  return (
    <div>
      <p>
        <label>
          Período de consumo máximo [h]:{' '}
          <input
            type="number"
            min={1}
            max={4}
            step="any"
            value={configuracion.periodoConsumoMaximo_h ?? ''}
            onChange={(evento) => {
              const valor = parsearNoNegativo(evento.target.value)
              if (valor !== 'ignorar') {
                onCambiar(conPeriodoConsumoMaximo(proyecto, valor))
              }
            }}
            style={{ width: '5rem' }}
          />
        </label>{' '}
        <small>ERAS §2.10.2: cualquier valor entre 1 y 4 h según las características de la instalación.</small>
      </p>

      <p>
        <label>
          DN de conexión [mm]:{' '}
          <select
            value={diametroNominalConexion_m ?? ''}
            onChange={(evento) => {
              const texto = evento.target.value
              onCambiar(conDiametroNominalConexion(proyecto, texto === '' ? undefined : Number(texto)))
            }}
          >
            <option value="">Seleccionar…</option>
            {DN_DE_CONEXION_m.map((dn) => (
              <option key={dn} value={dn}>
                {dnEnMm(dn)} mm
              </option>
            ))}
          </select>
        </label>{' '}
        <small>Tabla N°1 (§2.7). El DN lo define la Operadora / el proyectista.</small>
      </p>

      <p>
        <EntradaPresionSobreAcera proyecto={proyecto} onCambiar={onCambiar} />
      </p>

      <p>
        <label>
          {etiquetaDesnivelConexion(esquema)} [m]:{' '}
          <input
            type="number"
            step="any"
            value={desnivelConexion_m ?? ''}
            onChange={(evento) => {
              const valor = parsearCota(evento.target.value)
              if (valor !== 'ignorar') {
                onCambiar(conDesnivelConexion(proyecto, valor))
              }
            }}
            style={{ width: '6rem' }}
          />
        </label>{' '}
        <small>Positivo si está por encima de la acera; negativo si está por debajo.</small>
      </p>
    </div>
  )
}

// --- Resultados ----------------------------------------------------------

function TrazaDeConexion({
  conexion,
  esProfesional,
}: {
  conexion: Extract<ResultadoModulo4, { tipo: 'reservaCalculada' }>['conexion']
  esProfesional: boolean
}) {
  if (!esProfesional) {
    return (
      <p>
        Caudal de conexión: <strong>{formatearCaudal_lps(conexion.qConexion_lps)} L/s</strong>
      </p>
    )
  }
  return (
    <table>
      <tbody>
        <tr>
          <th>Presión sobre acera</th>
          <td>{formatearPresion_m(conexion.presionSobreAcera_m)} m</td>
        </tr>
        <tr>
          <th>Desnivel de conexión</th>
          <td>{formatearPresion_m(conexion.desnivelConexion_m)} m</td>
        </tr>
        <tr>
          <th>Presión de cálculo</th>
          <td>
            {formatearPresion_m(conexion.presionCalculo_m)} m{' '}
            <small>(= presión sobre acera − desnivel)</small>
          </td>
        </tr>
        <tr>
          <th>DN de conexión</th>
          <td>{dnEnMm(conexion.diametroNominal_m)} mm</td>
        </tr>
        <tr>
          <th>Caudal de conexión</th>
          <td>
            {formatearCaudal_lps(conexion.qConexion_lps)} L/s{' '}
            {conexion.interpolacion.aplicada ? (
              <small>
                (interpolado entre {conexion.interpolacion.presionInferior_m} y{' '}
                {conexion.interpolacion.presionSuperior_m} m: {formatearCaudal_lps(conexion.interpolacion.gastoInferior_lps)} →{' '}
                {formatearCaudal_lps(conexion.interpolacion.gastoSuperior_lps)} L/s)
              </small>
            ) : (
              <small>(valor tabulado de la Tabla N°1)</small>
            )}
          </td>
        </tr>
      </tbody>
    </table>
  )
}

function VerificacionDeAdopcion({ adopcion }: { adopcion: ResultadoAdopcionDeReserva }) {
  if (adopcion.tipo === 'noAplica') {
    return null
  }

  if (adopcion.tipo === 'sinAdopcion') {
    return (
      <p>
        <em>Cálculo completo · adopción pendiente.</em> Falta adoptar el volumen del tanque elevado.
      </p>
    )
  }

  if (adopcion.tipo === 'adopcionIncompleta') {
    return (
      <>
        <p>
          <em>Cálculo completo · adopción pendiente.</em>
        </p>
        <ul>
          {adopcion.faltaTanqueBombeo ? <li>Falta adoptar el volumen del tanque de bombeo / cisterna.</li> : null}
          {adopcion.faltaTanqueElevado ? <li>Falta adoptar el volumen del tanque elevado.</li> : null}
        </ul>
      </>
    )
  }

  const marca = (cumple: boolean): string => (cumple ? '✓ ' : '⚠ ')

  if (adopcion.tipo === 'verificada') {
    return (
      <table>
        <tbody>
          <tr>
            <th>Reserva requerida</th>
            <td>{formatearVolumen_L(adopcion.volumenRequerido_m3)} L</td>
          </tr>
          <tr>
            <th>Volumen adoptado</th>
            <td>{formatearVolumen_L(adopcion.volumenAdoptado_m3)} L</td>
          </tr>
          <tr>
            <th>Diferencia</th>
            <td>
              {adopcion.diferencia_m3 >= 0 ? '+' : ''}
              {formatearVolumen_L(adopcion.diferencia_m3)} L
            </td>
          </tr>
          <tr>
            <th>Capacidad adoptada</th>
            <td>
              {marca(adopcion.estado === 'suficiente')}
              {adopcion.estado === 'suficiente' ? 'Suficiente' : 'Insuficiente'}
            </td>
          </tr>
        </tbody>
      </table>
    )
  }

  // adopcion.tipo === 'verificadaDistribuida'
  return (
    <>
      <table>
        <tbody>
          <tr>
            <th>Reserva Total Diaria requerida</th>
            <td>{formatearVolumen_L(adopcion.volumenRequerido_m3)} L</td>
          </tr>
          <tr>
            <th>Mínimo por tanque (1/3)</th>
            <td>{formatearVolumen_L(adopcion.minimoPorTanque_m3)} L</td>
          </tr>
          <tr>
            <th>Tanque de bombeo / cisterna</th>
            <td>
              {formatearVolumen_L(adopcion.volumenTanqueBombeoAdoptado_m3)} L ·{' '}
              {marca(adopcion.tanqueBombeoCumpleMinimo)}
              {adopcion.tanqueBombeoCumpleMinimo ? 'cumple el mínimo' : 'no alcanza el mínimo'}
            </td>
          </tr>
          <tr>
            <th>Tanque elevado / reserva</th>
            <td>
              {formatearVolumen_L(adopcion.volumenTanqueElevadoAdoptado_m3)} L ·{' '}
              {marca(adopcion.tanqueElevadoCumpleMinimo)}
              {adopcion.tanqueElevadoCumpleMinimo ? 'cumple el mínimo' : 'no alcanza el mínimo'}
            </td>
          </tr>
          <tr>
            <th>Total adoptado</th>
            <td>
              {formatearVolumen_L(adopcion.totalAdoptado_m3)} L · {marca(adopcion.totalCumple)}
              {adopcion.totalCumple ? 'cubre la reserva' : 'no cubre la reserva'}
            </td>
          </tr>
          <tr>
            <th>Capacidad adoptada</th>
            <td>
              {marca(adopcion.estado === 'suficiente')}
              {adopcion.estado === 'suficiente' ? 'Suficiente' : 'Insuficiente'}
            </td>
          </tr>
        </tbody>
      </table>
      <small>
        ERAS §2.11.3: cuando existen tanque de bombeo y tanque de reserva, cada uno debe disponer como mínimo
        de 1/3 de la Reserva Total Diaria.
      </small>
    </>
  )
}

function AdopcionDeCapacidad({
  esquema,
  proyecto,
  onCambiar,
  adopcion,
}: {
  esquema: 'tanqueElevado' | 'cisternaBombeoElevado'
  proyecto: Proyecto
  onCambiar: OnCambiar
  adopcion: ResultadoAdopcionDeReserva
}) {
  const config = proyecto.configuracionAbastecimiento
  return (
    <div>
      <h3>Capacidad adoptada</h3>
      {esquema === 'cisternaBombeoElevado' ? (
        <p>
          <label>
            Tanque de bombeo / cisterna [L]:{' '}
            <input
              type="number"
              min={0}
              step="any"
              value={
                config?.volumenTanqueBombeoAdoptado_m3 !== undefined
                  ? litrosParaInput(config.volumenTanqueBombeoAdoptado_m3)
                  : ''
              }
              onChange={(evento) => {
                const litros = parsearNoNegativo(evento.target.value)
                if (litros === 'ignorar') return
                onCambiar(
                  conVolumenTanqueBombeoAdoptado(proyecto, litros === undefined ? undefined : m3DesdeLitros(litros)),
                )
              }}
              style={{ width: '7rem' }}
            />
          </label>
        </p>
      ) : null}
      <p>
        <label>
          Tanque elevado / reserva [L]:{' '}
          <input
            type="number"
            min={0}
            step="any"
            value={
              config?.volumenTanqueElevadoAdoptado_m3 !== undefined
                ? litrosParaInput(config.volumenTanqueElevadoAdoptado_m3)
                : ''
            }
            onChange={(evento) => {
              const litros = parsearNoNegativo(evento.target.value)
              if (litros === 'ignorar') return
              onCambiar(
                conVolumenTanqueElevadoAdoptado(proyecto, litros === undefined ? undefined : m3DesdeLitros(litros)),
              )
            }}
            style={{ width: '7rem' }}
          />
        </label>
      </p>
      <VerificacionDeAdopcion adopcion={adopcion} />
    </div>
  )
}

function ResultadoDeReserva({
  resultado,
  esProfesional,
  proyecto,
  onCambiar,
}: {
  resultado: Extract<ResultadoModulo4, { tipo: 'reservaCalculada' }>
  esProfesional: boolean
  proyecto: Proyecto
  onCambiar: OnCambiar
}) {
  const { reserva, conexion } = resultado
  const sinDeficit = reserva.deficit_lps === 0

  return (
    <div>
      <h3>Conexión</h3>
      <TrazaDeConexion conexion={conexion} esProfesional={esProfesional} />

      <h3>Reserva Total Diaria de Diseño</h3>
      {sinDeficit ? (
        <>
          <p>
            <strong>Reserva calculada por déficit: 0 L.</strong> El caudal de la conexión cubre el caudal de
            cálculo.
          </p>
          <p>
            <small>Este resultado no determina por sí solo la obligatoriedad de disponer tanque.</small>
          </p>
        </>
      ) : (
        <p>
          Reserva requerida:{' '}
          <strong>{formatearVolumen_L(reserva.volumenReservaDiseno_m3)} L</strong>
          {esProfesional ? (
            <>
              {' '}
              <small>({formatearVolumen_m3(reserva.volumenReservaDiseno_m3)} m³)</small>
            </>
          ) : null}
        </p>
      )}

      {esProfesional ? (
        <table>
          <tbody>
            <tr>
              <th>Caudal de cálculo Qc</th>
              <td>{formatearCaudal_lps(reserva.qc_lps)} L/s</td>
            </tr>
            <tr>
              <th>Caudal de conexión</th>
              <td>{formatearCaudal_lps(reserva.qConexion_lps)} L/s</td>
            </tr>
            <tr>
              <th>Déficit de caudal</th>
              <td>
                {formatearCaudal_lps(reserva.deficit_lps)} L/s{' '}
                <small>(= máx(0, Qc − caudal de conexión) = {formatearNumeroM4(reserva.deficit_m3h, 2)} m³/h)</small>
              </td>
            </tr>
            <tr>
              <th>Período de consumo máximo</th>
              <td>{formatearPresion_m(reserva.tc_h)} h</td>
            </tr>
            <tr>
              <th>Reserva Total Diaria de Diseño</th>
              <td>
                {formatearVolumen_L(reserva.volumenReservaDiseno_m3)} L{' '}
                <small>({formatearVolumen_m3(reserva.volumenReservaDiseno_m3)} m³)</small>
              </td>
            </tr>
          </tbody>
        </table>
      ) : null}

      <AdopcionDeCapacidad
        esquema={resultado.esquema}
        proyecto={proyecto}
        onCambiar={onCambiar}
        adopcion={resultado.adopcion}
      />
    </div>
  )
}

function CuerpoDelPanel({
  estado,
  proyecto,
  onCambiar,
  esProfesional,
}: {
  estado: EstadoModulo4
  proyecto: Proyecto
  onCambiar: OnCambiar
  esProfesional: boolean
}) {
  const configuracion = proyecto.configuracionAbastecimiento

  if (estado.estado === 'noIniciado' || configuracion === undefined) {
    return (
      <div>
        <p>Elegí cómo se abastece el proyecto para calcular la Reserva Total Diaria.</p>
        <p>
          <button
            type="button"
            onClick={() => onCambiar(conEsquemaDeAbastecimiento(proyecto, 'directa'))}
          >
            Alimentación directa
          </button>{' '}
          <button
            type="button"
            onClick={() => onCambiar(conEsquemaDeAbastecimiento(proyecto, 'tanqueElevado'))}
          >
            Tanque elevado
          </button>{' '}
          <button
            type="button"
            onClick={() => onCambiar(conEsquemaDeAbastecimiento(proyecto, 'cisternaBombeoElevado'))}
          >
            Cisterna + bombeo + tanque elevado
          </button>
        </p>
      </div>
    )
  }

  const esConTanque = configuracion.esquema !== 'directa'

  return (
    <div>
      <p>
        Estado del cálculo: <strong>{ETIQUETA_ESTADO_MODULO_4[estado.estado]}</strong>
      </p>

      <SelectorDeEsquema configuracion={configuracion} proyecto={proyecto} onCambiar={onCambiar} />

      {esConTanque ? (
        <ConfiguracionDeConexionYReserva
          configuracion={configuracion}
          proyecto={proyecto}
          onCambiar={onCambiar}
        />
      ) : null}

      {estado.estado === 'error' ? (
        <div>
          <h3>Configuración con errores</h3>
          <ul>
            {estado.problemas.map((problema, indice) => (
              <li key={indice}>{describirProblemaDeErrorModulo4(problema)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {estado.estado === 'incompleto' ? (
        <div>
          <h3>Faltan datos para calcular la reserva</h3>
          <ul>
            {estado.motivos.map((motivo, indice) => (
              <li key={indice}>{describirMotivoIncompletitudModulo4(motivo)}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {estado.estado === 'evaluado' && estado.resultado.tipo === 'sinReservaPorTanque' ? (
        <div>
          <p>Esquema: {ETIQUETA_ESQUEMA_ABASTECIMIENTO.directa}.</p>
          <p>El cálculo de Reserva Total Diaria por tanque no aplica a este esquema.</p>
          <p>
            <EntradaPresionSobreAcera proyecto={proyecto} onCambiar={onCambiar} />{' '}
            <small>
              Módulo 2 la usa como presión disponible en la raíz del balance de presión (alimentación
              directa).
            </small>
          </p>
          <p>
            <small>La obligatoriedad normativa de disponer reserva (§2.8) se evalúa por separado.</small>
          </p>
        </div>
      ) : null}

      {estado.estado === 'evaluado' && estado.resultado.tipo === 'reservaCalculada' ? (
        <ResultadoDeReserva
          resultado={estado.resultado}
          esProfesional={esProfesional}
          proyecto={proyecto}
          onCambiar={onCambiar}
        />
      ) : null}
    </div>
  )
}

export function PanelDeModulo4({ proyecto, onCambiar }: { proyecto: Proyecto; onCambiar: OnCambiar }) {
  const estado = resolverEstadoModulo4({ proyecto, catalogoArtefactos, coeficientesMayoracion })
  const esProfesional = resolverModoDeTrabajo(proyecto.configuracionHidraulica) !== 'rapido'

  return (
    <details open>
      <summary>
        <h2>Módulo 4 — Abastecimiento y reserva</h2>
      </summary>
      <CuerpoDelPanel estado={estado} proyecto={proyecto} onCambiar={onCambiar} esProfesional={esProfesional} />
    </details>
  )
}
