// Primera pantalla técnica del Motor de Demanda (integración, Fase 1).
// Sin estética ni formulario todavía: Proyecto fijo (caso Golden G2,
// CASOS-GOLDEN.md), gate de validación antes de calcular, y visualización
// completa del ResultadoDeCalculo. No recalcula: solo llama a
// validarProyecto y calcularSimultaneidad y muestra lo que devuelven.
import type { Proyecto } from '../../modelo/proyecto'
import type { ResultadoDeCalculo, Paso, ValorCalculado } from '../../modelo/resultado'
import type { ProblemaValidacion } from '../../validacion'
import { validarProyecto } from '../../validacion'
import { calcularSimultaneidad } from '../../motor/demanda/simultaneidad/calcularSimultaneidad'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'

const proyectoG2: Proyecto = {
  metadatos: {
    nombre: 'Caso técnico G2 (Tabla N°2)',
    obra: 'Integración Motor de Demanda',
    comitente: 'IUAS',
    fecha: '2026-08-07',
    schemaVersion: '1.0.0',
    versionNormativa: 'eras-2023',
  },
  parametros: {
    coeficienteA: 1,
    presionSobreAcera_m: 2,
    alturaArtefactoMasDesfavorable_m: 3,
    material: 'PVC',
  },
  unidadesFuncionales: [
    {
      id: 'uf-1',
      nombre: 'Unidad funcional 1',
      locales: [
        {
          id: 'local-bano',
          tipo: 'bano',
          regimen: 'domiciliario',
          artefactos: [
            { id: 'artefacto-1', artefactoId: 'lavatorio', cantidad: 2, origen: 'normativo' },
            { id: 'artefacto-2', artefactoId: 'banera', cantidad: 1, origen: 'normativo' },
            { id: 'artefacto-3', artefactoId: 'inodoroDeposito', cantidad: 2, origen: 'normativo' },
            { id: 'artefacto-4', artefactoId: 'bidet', cantidad: 1, origen: 'normativo' },
            { id: 'artefacto-5', artefactoId: 'receptaculoDucha', cantidad: 1, origen: 'normativo' },
          ],
        },
        {
          id: 'local-cocina',
          tipo: 'cocina',
          regimen: 'domiciliario',
          artefactos: [
            { id: 'artefacto-6', artefactoId: 'piletaDeCocina', cantidad: 1, origen: 'normativo' },
          ],
        },
        {
          id: 'local-lavadero',
          tipo: 'lavadero',
          regimen: 'domiciliario',
          artefactos: [
            { id: 'artefacto-7', artefactoId: 'piletaDeLavar', cantidad: 1, origen: 'normativo' },
          ],
        },
      ],
    },
  ],
}

function extraerN(pasos: readonly Paso[]): number | null {
  const pasoKc = pasos.find((paso) => paso.id === 'kc')
  const entradaN = pasoKc?.entradas.find((entrada) => entrada.simbolo === 'n')
  return entradaN?.valor ?? null
}

function ValorCalculadoTexto({ valor }: { valor: ValorCalculado }) {
  if ('estado' in valor) {
    return <span>Indeterminado — {valor.motivo}</span>
  }
  return (
    <span>
      {valor.valor} {valor.unidad}
    </span>
  )
}

function ProblemasValidacion({ problemas }: { problemas: readonly ProblemaValidacion[] }) {
  return (
    <section>
      <h2>Problemas de validación</h2>
      <p>El Proyecto no es válido. El Motor de Demanda no se ejecuta.</p>
      <ul>
        {problemas.map((problema, indice) => (
          <li key={indice}>
            [{problema.severidad}] {problema.codigo} — campo: {problema.campo} — valor recibido:{' '}
            {String(problema.valorRecibido)}
          </li>
        ))}
      </ul>
    </section>
  )
}

function Advertencias({ advertencias }: { advertencias: ResultadoDeCalculo['advertencias'] }) {
  if (advertencias.length === 0) {
    return null
  }
  return (
    <section>
      <h2>Advertencias</h2>
      <ul>
        {advertencias.map((advertencia) => (
          <li key={advertencia.id}>
            {advertencia.mensaje}
            {advertencia.referenciaNormativa ? ` (${advertencia.referenciaNormativa})` : ''}
          </li>
        ))}
      </ul>
    </section>
  )
}

function Resultados({ resultado }: { resultado: ResultadoDeCalculo }) {
  const n = extraerN(resultado.pasos)
  const { qmax, kc, k, qc } = resultado.resultados
  if (!qmax || !kc || !k || !qc) {
    // No es un estado previsible del dominio: el motor siempre devuelve
    // estas cuatro claves (contrato de calcularSimultaneidad). Si faltan,
    // es un defecto de programación, no un caso a manejar en la interfaz.
    throw new Error('El motor no devolvió los resultados esperados (qmax/kc/k/qc)')
  }

  return (
    <section>
      <h2>Resultados</h2>
      <dl>
        <dt>n</dt>
        <dd>{n ?? '—'}</dd>
        <dt>Qmax</dt>
        <dd>
          <ValorCalculadoTexto valor={qmax} />
        </dd>
        <dt>Kc</dt>
        <dd>
          <ValorCalculadoTexto valor={kc} />
        </dd>
        <dt>K</dt>
        <dd>
          <ValorCalculadoTexto valor={k} />
        </dd>
        <dt>Qc</dt>
        <dd>
          <ValorCalculadoTexto valor={qc} />
        </dd>
      </dl>
    </section>
  )
}

function Pasos({ pasos }: { pasos: readonly Paso[] }) {
  return (
    <section>
      <h2>Pasos / trazabilidad</h2>
      {pasos.map((paso) => (
        <article key={paso.id}>
          <h3>{paso.titulo}</h3>
          <p>
            formulaId: {paso.formulaId}
            {paso.criterioId ? ` — ${paso.criterioId}` : ''}
          </p>
          <table>
            <thead>
              <tr>
                <th>Símbolo</th>
                <th>Valor</th>
                <th>Unidad</th>
                <th>Procedencia</th>
              </tr>
            </thead>
            <tbody>
              {paso.entradas.map((entrada) => (
                <tr key={entrada.simbolo}>
                  <td>{entrada.simbolo}</td>
                  <td>{entrada.valor}</td>
                  <td>{entrada.unidad}</td>
                  <td>{entrada.procedencia}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            {paso.salida.simbolo} = <ValorCalculadoTexto valor={paso.salida.resultado} />
          </p>
          <p>Referencias: {paso.referencias.join(', ')}</p>
          {paso.nota ? <p>Nota: {paso.nota}</p> : null}
        </article>
      ))}
    </section>
  )
}

function ResultadoDemanda({ proyecto }: { proyecto: Proyecto }) {
  const resultado = calcularSimultaneidad({
    proyecto,
    normativa: { catalogoArtefactos, coeficientesMayoracion },
  })

  return (
    <>
      <Advertencias advertencias={resultado.advertencias} />
      <Resultados resultado={resultado} />
      <Pasos pasos={resultado.pasos} />
    </>
  )
}

export function MotorDemandaPantalla() {
  const validacion = validarProyecto(proyectoG2, catalogoArtefactos, coeficientesMayoracion)

  return (
    <div>
      <h1>IUAS — Motor de Demanda</h1>
      <p>Proyecto técnico de prueba: caso Golden G2 (Tabla N°2, CASOS-GOLDEN.md).</p>
      {validacion.valido ? (
        <ResultadoDemanda proyecto={proyectoG2} />
      ) : (
        <ProblemasValidacion problemas={validacion.problemas} />
      )}
    </div>
  )
}
