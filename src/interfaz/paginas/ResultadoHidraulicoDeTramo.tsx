// Visualización de Módulo 2 (hidráulica por Tramo) en la pantalla técnica:
// dos niveles de lectura -- Distribución general del proyecto, y Local+Red
// dentro de cada Unidad Funcional -- en vez de una tabla plana con todos
// los Tramos (incluidos terminales). Este NO es el rediseño definitivo de
// la aplicación: es exclusivamente una mejora de legibilidad técnica sobre
// la topología ya correcta. Los Tramos que esta vista no muestra (ramas
// terminales hacia cada Artefacto individual) siguen existiendo íntegros
// en RedHidraulica -- ver identificarFilasDeModulo2.ts, que decide
// estructuralmente (sin heurística de string de id) qué Tramos son
// "principales" para esta vista. Extraído de MotorDemandaPantalla.tsx
// únicamente por legibilidad -- misma razón que duplicarUnidadFuncional.ts,
// no una abstracción nueva. Solo se renderiza cuando el Proyecto ya pasó
// validarProyecto (gate en MotorDemandaPantalla), así que redHidraulica,
// si existe, ya es estructuralmente válida y sus referencias a Artefactos
// ya existen.
import type { CSSProperties } from 'react'
import type { MaterialTuberiaId, MetodoPerdidaDistribuida, Proyecto, TipoDeLocal } from '../../modelo/proyecto'
import type { RedDeTramo } from '../../modelo/redHidraulica'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import { catalogoMaterialesTuberia, obtenerMaterialTuberia } from '../../motor/tuberias/materialTuberia'
import { resolverHidraulicaDeTramo } from '../../motor/tuberias/resolverHidraulicaDeTramo'
import { obtenerArtefactosAguasAbajo } from '../../motor/tuberias/topologia/obtenerArtefactosAguasAbajo'
import { formatearNumero } from '../../exportadores/pdf/formatearNumero'
import {
  derivarOrdinalesDeLocal,
  identificarFilasDistribucionGeneral,
  identificarFilasPrincipalesDeLocales,
} from './identificarFilasDeModulo2'
import { conMaterialTuberia, conMetodoPerdidaDistribuida } from './actualizarConfiguracionHidraulica'

// Duplicado intencional de la etiqueta homónima en MotorDemandaPantalla.tsx
// (mismo criterio que aplicarParticipacionCritA8: segundo consumidor
// pequeño y puntual, sin abstraer todavía una fuente compartida). Solo se
// usa acá para etiquetar los Locales dentro de cada Unidad Funcional.
const ETIQUETA_TIPO_DE_LOCAL: Readonly<Record<TipoDeLocal, string>> = {
  bano: 'Baño',
  toilette: 'Toilette',
  cocina: 'Cocina',
  lavadero: 'Lavadero',
  cochera: 'Cochera',
  jardin: 'Jardín',
  otros: 'Otros',
}

// Estilos locales mínimos -- el proyecto no tiene hoja de estilos (ver
// index.html/main.tsx): mismo patrón ya usado en el archivo (style={{...}}
// puntual), solo que acá se comparte entre encabezado y filas para que la
// alineación de cada columna no se desincronice entre ambos.
function estiloEncabezado(alineacion: CSSProperties['textAlign']): CSSProperties {
  return {
    padding: '0.5rem 0.9rem',
    textAlign: alineacion,
    borderBottom: '2px solid #333',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  }
}

function estiloCelda(alineacion: CSSProperties['textAlign'], ajustable = false): CSSProperties {
  return {
    padding: '0.4rem 0.9rem',
    textAlign: alineacion,
    borderBottom: '1px solid #ddd',
    whiteSpace: ajustable ? undefined : 'nowrap',
  }
}

type FilaDeTabla = {
  readonly etiqueta: string
  readonly red: RedDeTramo
  readonly tramoId: string
}

function FilaResultado({
  proyecto,
  catalogoArtefactos,
  fila,
}: {
  proyecto: Proyecto
  catalogoArtefactos: readonly ArtefactoNormativo[]
  fila: FilaDeTabla
}) {
  let errorDelMotor: string | null = null
  let artefactosTexto: string
  let qcTexto: string
  let diMinimoTexto: string

  try {
    const referencias = obtenerArtefactosAguasAbajo(proyecto, fila.tramoId)
    artefactosTexto = formatearNumero(referencias.length, 'conteo')

    const resultado = resolverHidraulicaDeTramo(proyecto, fila.tramoId, catalogoArtefactos)
    qcTexto = formatearNumero(resultado.qc_lps, 'l/s')
    diMinimoTexto =
      resultado.tipo === 'conDemanda' ? formatearNumero(resultado.predimensionamiento.di_min_mm, 'mm') : '—'
  } catch (motivo) {
    errorDelMotor = motivo instanceof Error ? motivo.message : String(motivo)
    artefactosTexto = '—'
    qcTexto = 'Error'
    diMinimoTexto = '—'
  }

  return (
    <tr>
      <td style={estiloCelda('left')}>{fila.etiqueta}</td>
      <td style={estiloCelda('center')}>{fila.red}</td>
      <td style={estiloCelda('right')}>{artefactosTexto}</td>
      <td style={estiloCelda('right', errorDelMotor !== null)}>
        {qcTexto}
        {errorDelMotor !== null ? (
          <>
            <br />
            <small>{errorDelMotor}</small>
          </>
        ) : null}
      </td>
      <td style={estiloCelda('right')}>{diMinimoTexto}</td>
    </tr>
  )
}

function TablaDeFilas({
  proyecto,
  catalogoArtefactos,
  encabezadoPrimeraColumna,
  filas,
}: {
  proyecto: Proyecto
  catalogoArtefactos: readonly ArtefactoNormativo[]
  encabezadoPrimeraColumna: string
  filas: readonly FilaDeTabla[]
}) {
  if (filas.length === 0) {
    return null
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={estiloEncabezado('left')}>{encabezadoPrimeraColumna}</th>
            <th style={estiloEncabezado('center')}>Red</th>
            <th style={estiloEncabezado('right')}>Artefactos</th>
            <th style={estiloEncabezado('right')}>Qc [l/s]</th>
            <th style={estiloEncabezado('right')}>Di mínimo [mm]</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <FilaResultado key={fila.tramoId} proyecto={proyecto} catalogoArtefactos={catalogoArtefactos} fila={fila} />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TablaDeUnidadFuncional({
  proyecto,
  catalogoArtefactos,
  unidadFuncionalId,
  nombre,
  locales,
  filasPrincipales,
}: {
  proyecto: Proyecto
  catalogoArtefactos: readonly ArtefactoNormativo[]
  unidadFuncionalId: string
  nombre: string
  locales: Proyecto['unidadesFuncionales'][number]['locales']
  filasPrincipales: ReturnType<typeof identificarFilasPrincipalesDeLocales>
}) {
  const ordinales = derivarOrdinalesDeLocal(locales)

  const filas: FilaDeTabla[] = locales.flatMap((local) => {
    const ordinal = ordinales.get(local.id)
    const etiquetaLocal = `${ETIQUETA_TIPO_DE_LOCAL[local.tipo]} ${ordinal ?? ''}`.trim()

    return filasPrincipales
      .filter((fila) => fila.unidadFuncionalId === unidadFuncionalId && fila.localId === local.id)
      .map((fila) => ({ etiqueta: etiquetaLocal, red: fila.red, tramoId: fila.tramoId }))
  })

  return (
    <div>
      <h3>{nombre}</h3>
      <TablaDeFilas
        proyecto={proyecto}
        catalogoArtefactos={catalogoArtefactos}
        encabezadoPrimeraColumna="Local"
        filas={filas}
      />
    </div>
  )
}

// Método de pérdida distribuida: configuración global y única del
// Proyecto (CRIT-A17/CRIT-A18), no seleccionable por Tramo. Este
// incremento solo persiste la selección -- todavía no dispara ningún
// cálculo de Hazen-Williams ni Darcy-Weisbach.
function ConfiguracionHidraulicaFormulario({
  proyecto,
  onCambiar,
}: {
  proyecto: Proyecto
  onCambiar: (proyecto: Proyecto) => void
}) {
  return (
    <section>
      <h3>Configuración hidráulica</h3>
      <label>
        Método de cálculo de pérdidas distribuidas:{' '}
        <select
          value={proyecto.configuracionHidraulica.metodoPerdidaDistribuida}
          onChange={(evento) =>
            onCambiar(conMetodoPerdidaDistribuida(proyecto, evento.target.value as MetodoPerdidaDistribuida))
          }
        >
          <option value="hazenWilliams">Hazen-Williams</option>
          <option value="darcyWeisbach">Darcy-Weisbach</option>
        </select>
      </label>
      <label>
        Material de la tubería:{' '}
        <select
          value={proyecto.configuracionHidraulica.materialTuberiaId}
          onChange={(evento) => onCambiar(conMaterialTuberia(proyecto, evento.target.value as MaterialTuberiaId))}
        >
          {catalogoMaterialesTuberia.map((material) => (
            <option key={material.id} value={material.id}>
              {material.nombre}
            </option>
          ))}
        </select>
      </label>
      <details>
        <summary>Parámetros de cálculo</summary>
        <ParametroDeCalculoDelMaterial proyecto={proyecto} />
      </details>
    </section>
  )
}

// Trazabilidad de presentación (CRIT-A17/CRIT-A18): muestra únicamente el
// parámetro hidráulico del material que corresponde al método actualmente
// seleccionado -- Hazen-Williams usa C, Darcy-Weisbach usa epsilon, nunca
// ambos a la vez. El catálogo (materialTuberia) es la única fuente de C,
// epsilon y sus referencias; este componente no los recalcula ni los
// duplica. Puramente informativo: todavía no alimenta ningún cálculo de
// pérdidas.
function ParametroDeCalculoDelMaterial({ proyecto }: { proyecto: Proyecto }) {
  const material = obtenerMaterialTuberia(proyecto.configuracionHidraulica.materialTuberiaId, catalogoMaterialesTuberia)

  return (
    <div>
      <p>Material: {material.nombre}</p>
      {proyecto.configuracionHidraulica.metodoPerdidaDistribuida === 'hazenWilliams' ? (
        <>
          <p>Coeficiente Hazen-Williams C: {material.coeficienteC}</p>
          <p>Fuente: {material.referenciaFuenteC}</p>
        </>
      ) : (
        <>
          <p>Rugosidad absoluta ε: {material.rugosidadAbsoluta_mm} mm</p>
          <p>Fuente: {material.referenciaFuenteRugosidad}</p>
        </>
      )}
      <p>
        <small>
          Los valores indicados son parámetros técnicos adoptados por el proyecto y no corresponden a una tabla de
          coeficientes publicada por ERAS-2023.
        </small>
      </p>
    </div>
  )
}

export function ResultadoHidraulicoDeTramo({
  proyecto,
  catalogoArtefactos,
  onCambiar,
}: {
  proyecto: Proyecto
  catalogoArtefactos: readonly ArtefactoNormativo[]
  onCambiar: (proyecto: Proyecto) => void
}) {
  const tramos = proyecto.redHidraulica?.tramos ?? []
  const filasPrincipalesDeLocales = identificarFilasPrincipalesDeLocales(proyecto)

  return (
    <details open>
      <summary>
        <h2>Módulo 2 — Tuberías</h2>
      </summary>

      <ConfiguracionHidraulicaFormulario proyecto={proyecto} onCambiar={onCambiar} />

      {tramos.length === 0 ? (
        <p>El proyecto no tiene una red hidráulica cargada.</p>
      ) : (
        <>
          <p>
            <small>
              Predimensionamiento: se adopta Ve = 2,0 m/s para la determinación inicial del
              diámetro interior mínimo. La velocidad real se verificará posteriormente con el
              diámetro comercial adoptado conforme a ERAS §2.12.1.
            </small>
          </p>

          <h3>Distribución general</h3>
          <TablaDeFilas
            proyecto={proyecto}
            catalogoArtefactos={catalogoArtefactos}
            encabezadoPrimeraColumna="Cañería"
            filas={identificarFilasDistribucionGeneral(proyecto)}
          />

          {proyecto.unidadesFuncionales.map((uf) => (
            <TablaDeUnidadFuncional
              key={uf.id}
              proyecto={proyecto}
              catalogoArtefactos={catalogoArtefactos}
              unidadFuncionalId={uf.id}
              nombre={uf.nombre}
              locales={uf.locales}
              filasPrincipales={filasPrincipalesDeLocales}
            />
          ))}
        </>
      )}
    </details>
  )
}
