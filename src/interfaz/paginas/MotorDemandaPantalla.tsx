// Primera pantalla técnica editable del Motor de Demanda (integración,
// Fase 1). Proyecto inicial = vivienda unifamiliar de ejemplo (no un caso
// Golden -- G1 y G2 siguen existiendo exclusivamente en CASOS-GOLDEN.md y
// sus tests), pensado para que se reconozca de un vistazo. Todos los
// campos son editables: coeficiente a, unidades funcionales, locales y
// artefactos. Gate de validación antes de calcular, y visualización
// completa del ResultadoDeCalculo. No recalcula: solo llama a
// validarProyecto y calcularSimultaneidad y muestra lo que devuelven.
import { useState } from 'react'
import type { Proyecto, UnidadFuncional, Local, TipoDeLocal, RegimenLocal, Artefacto } from '../../modelo/proyecto'
import type { ResultadoDeCalculo, Paso, ValorCalculado } from '../../modelo/resultado'
import type { ProblemaValidacion, CodigoValidacion } from '../../validacion'
import { validarProyecto } from '../../validacion'
import { calcularSimultaneidad } from '../../motor/demanda/simultaneidad/calcularSimultaneidad'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import { formatearNumero } from '../../exportadores/pdf/formatearNumero'
import { generarDocumentoPdf } from '../../exportadores/pdf/generarDocumentoPdf'
import {
  formulaSimbolica,
  sustitucionNumerica,
  textoValorCalculado,
} from '../../presentacion/desarrolloDelCalculoDemanda'

const TIPOS_DE_LOCAL: readonly TipoDeLocal[] = [
  'bano',
  'toilette',
  'cocina',
  'lavadero',
  'cochera',
  'jardin',
  'otros',
]

const REGIMENES_DE_LOCAL: readonly RegimenLocal[] = ['domiciliario', 'noDomiciliario']

// Solo texto visible: los valores internos (value de cada <option>,
// local.tipo, local.regimen) siguen siendo los literales del modelo.
const ETIQUETA_TIPO_DE_LOCAL: Readonly<Record<TipoDeLocal, string>> = {
  bano: 'Baño',
  toilette: 'Toilette',
  cocina: 'Cocina',
  lavadero: 'Lavadero',
  cochera: 'Cochera',
  jardin: 'Jardín',
  otros: 'Otros',
}

const ETIQUETA_REGIMEN: Readonly<Record<RegimenLocal, string>> = {
  domiciliario: 'Domiciliario',
  noDomiciliario: 'No domiciliario',
}

// Etiqueta de presentación por local: derivada del orden y del tipo, nunca
// del id interno. No se guarda en ningún lado -- se recalcula en cada
// render a partir de `locales`.
function etiquetasDeLocales(locales: readonly Local[]): readonly string[] {
  const totalPorTipo: Partial<Record<TipoDeLocal, number>> = {}
  for (const local of locales) {
    totalPorTipo[local.tipo] = (totalPorTipo[local.tipo] ?? 0) + 1
  }

  const contadorPorTipo: Partial<Record<TipoDeLocal, number>> = {}
  return locales.map((local) => {
    const etiquetaBase = ETIQUETA_TIPO_DE_LOCAL[local.tipo]
    const total = totalPorTipo[local.tipo] ?? 0
    if (total <= 1) {
      return `Local: ${etiquetaBase}`
    }
    const siguiente = (contadorPorTipo[local.tipo] ?? 0) + 1
    contadorPorTipo[local.tipo] = siguiente
    return `Local: ${etiquetaBase} ${siguiente}`
  })
}

// IDs únicos vía crypto.randomUUID() (API nativa del navegador, sin
// dependencia nueva): un contador de módulo colisionaría con los IDs que
// ya trae el proyecto inicial (local-bano, artefacto-1, etc.).
function generarId(prefijo: string): string {
  return `${prefijo}-${crypto.randomUUID()}`
}

function conCoeficienteA(proyecto: Proyecto, a: 1 | 2 | 3 | 4): Proyecto {
  return { ...proyecto, parametros: { ...proyecto.parametros, coeficienteA: a } }
}


function ArtefactoFormulario({
  artefacto,
  onCambiar,
  onEliminar,
}: {
  artefacto: Artefacto
  onCambiar: (artefacto: Artefacto) => void
  onEliminar: () => void
}) {
  return (
    <div>
      <label>
        Artefacto:{' '}
        <select
          value={artefacto.artefactoId}
          onChange={(evento) => onCambiar({ ...artefacto, artefactoId: evento.target.value })}
        >
          {catalogoArtefactos.map((catalogoItem) => (
            <option key={catalogoItem.id} value={catalogoItem.id}>
              {catalogoItem.nombre} (qu={formatearNumero(catalogoItem.quTotal_lps, 'l/s')} l/s)
            </option>
          ))}
        </select>
      </label>{' '}
      <label>
        Cantidad:{' '}
        <input
          type="number"
          value={artefacto.cantidad}
          onChange={(evento) => {
            const cantidad = Number(evento.target.value)
            if (!Number.isNaN(cantidad)) {
              onCambiar({ ...artefacto, cantidad })
            }
          }}
        />
      </label>{' '}
      <button type="button" onClick={onEliminar}>
        Eliminar artefacto
      </button>
    </div>
  )
}

function LocalFormulario({
  local,
  etiqueta,
  onCambiar,
  onEliminar,
}: {
  local: Local
  etiqueta: string
  onCambiar: (local: Local) => void
  onEliminar: () => void
}) {
  function agregarArtefacto() {
    const primerArtefacto = catalogoArtefactos[0]
    if (!primerArtefacto) {
      return
    }
    const nuevoArtefacto: Artefacto = {
      id: generarId('artefacto'),
      artefactoId: primerArtefacto.id,
      cantidad: 1,
      origen: 'normativo',
    }
    onCambiar({ ...local, artefactos: [...local.artefactos, nuevoArtefacto] })
  }

  return (
    <article>
      <h5>{etiqueta}</h5>
      <label>
        Tipo:{' '}
        <select
          value={local.tipo}
          onChange={(evento) => onCambiar({ ...local, tipo: evento.target.value as TipoDeLocal })}
        >
          {TIPOS_DE_LOCAL.map((tipo) => (
            <option key={tipo} value={tipo}>
              {ETIQUETA_TIPO_DE_LOCAL[tipo]}
            </option>
          ))}
        </select>
      </label>{' '}
      <label>
        Régimen:{' '}
        <select
          value={local.regimen ?? ''}
          onChange={(evento) => {
            if (evento.target.value === '') {
              const { regimen: _regimen, ...localSinRegimen } = local
              onCambiar(localSinRegimen)
              return
            }
            onCambiar({ ...local, regimen: evento.target.value as RegimenLocal })
          }}
        >
          <option value="">— sin definir —</option>
          {REGIMENES_DE_LOCAL.map((regimen) => (
            <option key={regimen} value={regimen}>
              {ETIQUETA_REGIMEN[regimen]}
            </option>
          ))}
        </select>
      </label>{' '}
      <button type="button" onClick={onEliminar}>
        Eliminar local
      </button>

      <h6>Artefactos</h6>
      {local.artefactos.map((artefacto) => (
        <ArtefactoFormulario
          key={artefacto.id}
          artefacto={artefacto}
          onCambiar={(artefactoActualizado) =>
            onCambiar({
              ...local,
              artefactos: local.artefactos.map((a) => (a.id === artefacto.id ? artefactoActualizado : a)),
            })
          }
          onEliminar={() => onCambiar({ ...local, artefactos: local.artefactos.filter((a) => a.id !== artefacto.id) })}
        />
      ))}
      <button type="button" onClick={agregarArtefacto}>
        + Agregar artefacto
      </button>
    </article>
  )
}

function UnidadFuncionalFormulario({
  uf,
  onCambiar,
  onEliminar,
  mostrarEliminar,
}: {
  uf: UnidadFuncional
  onCambiar: (uf: UnidadFuncional) => void
  onEliminar: () => void
  mostrarEliminar: boolean
}) {
  const locales = uf.locales

  function cambiarLocales(locales: readonly Local[]) {
    onCambiar({ ...uf, locales })
  }

  function agregarLocal() {
    const nuevoLocal: Local = {
      id: generarId('local'),
      tipo: 'bano',
      artefactos: [],
    }
    cambiarLocales([...locales, nuevoLocal])
  }

  const etiquetas = etiquetasDeLocales(locales)

  return (
    <section>
      <h3>
        Unidad funcional:{' '}
        <input
          type="text"
          value={uf.nombre}
          onChange={(evento) => onCambiar({ ...uf, nombre: evento.target.value })}
        />
      </h3>
      {mostrarEliminar ? (
        <button type="button" onClick={onEliminar}>
          Eliminar unidad funcional
        </button>
      ) : null}

      <h4>Locales</h4>
      {locales.map((local, indice) => (
        <LocalFormulario
          key={local.id}
          local={local}
          etiqueta={etiquetas[indice] ?? `Local: ${ETIQUETA_TIPO_DE_LOCAL[local.tipo]}`}
          onCambiar={(localActualizado) =>
            cambiarLocales(locales.map((l) => (l.id === local.id ? localActualizado : l)))
          }
          onEliminar={() => cambiarLocales(locales.filter((l) => l.id !== local.id))}
        />
      ))}
      <button type="button" onClick={agregarLocal}>
        + Agregar local
      </button>
    </section>
  )
}

function ProyectoFormulario({
  proyecto,
  onCambiar,
}: {
  proyecto: Proyecto
  onCambiar: (proyecto: Proyecto) => void
}) {
  const unidadesFuncionales = proyecto.unidadesFuncionales

  function cambiarUnidadesFuncionales(unidadesFuncionales: readonly UnidadFuncional[]) {
    onCambiar({ ...proyecto, unidadesFuncionales })
  }

  function agregarUnidadFuncional() {
    const nuevaUf: UnidadFuncional = {
      id: generarId('uf'),
      nombre: `Unidad funcional ${unidadesFuncionales.length + 1}`,
      locales: [],
    }
    cambiarUnidadesFuncionales([...unidadesFuncionales, nuevaUf])
  }

  return (
    <section>
      <h2>Datos del proyecto</h2>
      <label>
        Coeficiente de mayoración (a):{' '}
        <select
          style={{ maxWidth: '100%' }}
          value={proyecto.parametros.coeficienteA}
          onChange={(evento) => onCambiar(conCoeficienteA(proyecto, Number(evento.target.value) as 1 | 2 | 3 | 4))}
        >
          {coeficientesMayoracion.map((coeficiente) => (
            <option key={coeficiente.a} value={coeficiente.a}>
              {coeficiente.a} — {coeficiente.tipoDeProyecto}
            </option>
          ))}
        </select>
      </label>

      {unidadesFuncionales.map((uf) => (
        <UnidadFuncionalFormulario
          key={uf.id}
          uf={uf}
          mostrarEliminar={unidadesFuncionales.length > 1}
          onCambiar={(ufActualizada) =>
            cambiarUnidadesFuncionales(
              unidadesFuncionales.map((u) => (u.id === uf.id ? ufActualizada : u)),
            )
          }
          onEliminar={() =>
            cambiarUnidadesFuncionales(unidadesFuncionales.filter((u) => u.id !== uf.id))
          }
        />
      ))}
      <button type="button" onClick={agregarUnidadFuncional}>
        + Agregar unidad funcional
      </button>
    </section>
  )
}

const proyectoInicial: Proyecto = {
  metadatos: {
    nombre: 'Vivienda unifamiliar de ejemplo',
    obra: 'Proyecto de ejemplo',
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
            { id: 'artefacto-bano-1', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' },
            { id: 'artefacto-bano-2', artefactoId: 'receptaculoDucha', cantidad: 1, origen: 'normativo' },
            { id: 'artefacto-bano-3', artefactoId: 'bidet', cantidad: 1, origen: 'normativo' },
            { id: 'artefacto-bano-4', artefactoId: 'inodoroDeposito', cantidad: 1, origen: 'normativo' },
          ],
        },
        {
          id: 'local-cocina',
          tipo: 'cocina',
          regimen: 'domiciliario',
          artefactos: [
            { id: 'artefacto-cocina-1', artefactoId: 'piletaDeCocina', cantidad: 1, origen: 'normativo' },
            { id: 'artefacto-cocina-2', artefactoId: 'maquinaLavavajillas', cantidad: 1, origen: 'normativo' },
          ],
        },
        {
          id: 'local-lavadero',
          tipo: 'lavadero',
          regimen: 'domiciliario',
          artefactos: [
            { id: 'artefacto-lavadero-1', artefactoId: 'piletaDeLavar', cantidad: 1, origen: 'normativo' },
            { id: 'artefacto-lavadero-2', artefactoId: 'maquinaLavarropas', cantidad: 1, origen: 'normativo' },
          ],
        },
        {
          id: 'local-toilette',
          tipo: 'toilette',
          regimen: 'domiciliario',
          artefactos: [
            { id: 'artefacto-toilette-1', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' },
            { id: 'artefacto-toilette-2', artefactoId: 'inodoroDeposito', cantidad: 1, origen: 'normativo' },
          ],
        },
        {
          id: 'local-patio',
          tipo: 'jardin',
          regimen: 'domiciliario',
          artefactos: [
            { id: 'artefacto-patio-1', artefactoId: 'canillaDeServicio', cantidad: 1, origen: 'normativo' },
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
  return <span>{textoValorCalculado(valor)}</span>
}

const MENSAJES_DE_VALIDACION: Readonly<Record<CodigoValidacion, string>> = {
  proyectoRegimenLocalAusente: 'Debe seleccionar el régimen del local.',
  proyectoCantidadNoPositiva: 'La cantidad de artefactos debe ser mayor que cero.',
  proyectoUnidadFuncionalSinLocales: 'La unidad funcional no contiene locales.',
  proyectoLocalSinArtefactos: 'El local no contiene artefactos y no participa del cálculo.',
  proyectoSinArtefactosComputables: 'El proyecto debe contener al menos un artefacto para poder calcular.',
  catalogoArtefactoIdInexistente: 'El artefacto seleccionado no existe en el catálogo normativo vigente.',
  catalogoCoeficienteAInexistente:
    'El coeficiente de mayoración seleccionado no existe en el catálogo normativo vigente.',
  redHidraulicaNodoIdDuplicado: 'Nodo de red hidráulica con identificador duplicado.',
  redHidraulicaTramoIdDuplicado: 'Tramo de red hidráulica con identificador duplicado.',
  redHidraulicaTramoNodoInexistente: 'Un tramo de red hidráulica referencia un nodo inexistente.',
  redHidraulicaTramoOrigenIgualDestino:
    'Un tramo de red hidráulica no puede tener el mismo nodo como origen y destino.',
  redHidraulicaReferenciaArtefactoInvalida:
    'Una referencia de red hidráulica apunta a un artefacto inexistente o fuera de la ubicación indicada.',
}

function ProblemasValidacion({ problemas }: { problemas: readonly ProblemaValidacion[] }) {
  return (
    <section>
      <h2>Problemas de validación</h2>
      <p>El Proyecto no es válido. El Motor de Demanda no se ejecuta.</p>
      <ul>
        {problemas.map((problema, indice) => (
          <li key={indice}>
            [{problema.severidad}] {MENSAJES_DE_VALIDACION[problema.codigo]} ({problema.codigo})
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

      <h3>Caudal de cálculo (Qc)</h3>
      <p>
        <strong>
          <ValorCalculadoTexto valor={qc} />
        </strong>
      </p>

      <table>
        <tbody>
          <tr>
            <th>n</th>
            <td>{n !== null ? formatearNumero(n, 'conteo') : '—'}</td>
          </tr>
          <tr>
            <th>Qmax</th>
            <td>
              <ValorCalculadoTexto valor={qmax} />
            </td>
          </tr>
        </tbody>
      </table>

      <details>
        <summary>Parámetros intermedios</summary>
        <table>
          <tbody>
            <tr>
              <th>Kc</th>
              <td>
                <ValorCalculadoTexto valor={kc} />
              </td>
            </tr>
            <tr>
              <th>K</th>
              <td>
                <ValorCalculadoTexto valor={k} />
              </td>
            </tr>
          </tbody>
        </table>
      </details>
    </section>
  )
}

function Pasos({ pasos }: { pasos: readonly Paso[] }) {
  return (
    <section>
      <details>
        {/* Sin "▶" propio: el navegador ya antepone su propio triángulo
            de disclosure a <summary>; duplicarlo se vería redundante. */}
        <summary>🔍 Desarrollo del cálculo ({pasos.length} pasos)</summary>
        {pasos.map((paso) => {
          const sustitucion = sustitucionNumerica(paso)
          return (
            <article key={paso.id}>
              <h3>{paso.titulo}</h3>
              <p>Fórmula: {formulaSimbolica(paso)}</p>
              {paso.criterioId ? <p>Criterio: {paso.criterioId}</p> : null}
              {sustitucion ? <p>Sustitución: {sustitucion}</p> : null}
              <p>
                {paso.salida.simbolo} = <ValorCalculadoTexto valor={paso.salida.resultado} />
              </p>
              <div style={{ overflowX: 'auto' }}>
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
                    {paso.entradas.map((entrada, indice) => (
                      // entrada.simbolo puede repetirse (ej. qu(lavatorio) en
                      // más de un local); se agrega el índice solo para que la
                      // key de React sea única -- no altera ningún dato visible.
                      <tr key={`${entrada.simbolo}-${indice}`}>
                        <td>{entrada.simbolo}</td>
                        <td>{formatearNumero(entrada.valor, entrada.unidad)}</td>
                        <td>{entrada.unidad}</td>
                        <td>{entrada.procedencia}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>Referencias: {paso.referencias.join(', ')}</p>
              {paso.nota ? <p>Nota: {paso.nota}</p> : null}
            </article>
          )
        })}
      </details>
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
      <button type="button" onClick={() => generarDocumentoPdf({ proyecto, resultado })}>
        Generar memoria PDF
      </button>
      <Pasos pasos={resultado.pasos} />
    </>
  )
}

export function MotorDemandaPantalla() {
  const [proyecto, setProyecto] = useState<Proyecto>(proyectoInicial)
  const validacion = validarProyecto(proyecto, catalogoArtefactos, coeficientesMayoracion)

  return (
    <div>
      <h1>IUAS — Motor de Demanda</h1>
      <h2>Proyecto de ejemplo — Vivienda unifamiliar</h2>
      <p>
        Se carga una instalación doméstica típica para facilitar la exploración del Motor de
        Demanda. Todos los datos pueden modificarse.
      </p>
      <ProyectoFormulario proyecto={proyecto} onCambiar={setProyecto} />
      {validacion.valido ? (
        <ResultadoDemanda proyecto={proyecto} />
      ) : (
        <ProblemasValidacion problemas={validacion.problemas} />
      )}
    </div>
  )
}
