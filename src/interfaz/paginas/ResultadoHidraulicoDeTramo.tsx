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
import type { ReferenciaDeArtefacto, RedDeTramo } from '../../modelo/redHidraulica'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import { catalogoMaterialesTuberia, obtenerMaterialTuberia } from '../../motor/tuberias/materialTuberia'
import { catalogoSistemasDeTuberia } from '../../motor/tuberias/sistemaDeTuberia'
import { resolverHidraulicaDeTramo } from '../../motor/tuberias/resolverHidraulicaDeTramo'
import { resolverPerdidaDistribuidaDeTramo } from '../../motor/tuberias/resolverPerdidaDistribuidaDeTramo'
import type { ResultadoPerdidaDistribuidaDeTramo } from '../../motor/tuberias/resolverPerdidaDistribuidaDeTramo'
import { obtenerArtefactosAguasAbajo } from '../../motor/tuberias/topologia/obtenerArtefactosAguasAbajo'
import { resolverArtefactosReferenciados } from '../../motor/tuberias/topologia/resolverArtefactosReferenciados'
import { auditarCoberturaFisica } from '../../motor/tuberias/cobertura/auditarCoberturaFisica'
import { formatearNumero } from '../../exportadores/pdf/formatearNumero'
import {
  derivarOrdinalesDeLocal,
  identificarFilasDistribucionGeneral,
  identificarFilasPrincipalesDeLocales,
} from './identificarFilasDeModulo2'
import { conMaterialTuberia, conMetodoPerdidaDistribuida } from './actualizarConfiguracionHidraulica'
import { conLongitudDeTramo } from './actualizarRedHidraulica'

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

// Texto humano de una referencia pendiente de auditarCoberturaFisica (S2):
// "<nombre de UF> → <tipo de Local> → <nombre de catálogo>". resolverArtefactosReferenciados
// siempre resuelve acá -- la referencia viene de artefactosSinReferencia, que
// auditarCoberturaFisica construye directamente desde proyecto.unidadesFuncionales,
// nunca de una fuente externa que pueda desincronizarse. El fallback al id
// tecnico de catalogo es deliberado (nunca inventa un nombre) para el caso
// borde de un artefactoId que no este en el catalogoArtefactos recibido.
export function describirReferenciaPendiente(
  proyecto: Proyecto,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  referencia: ReferenciaDeArtefacto,
): string {
  const [resuelto] = resolverArtefactosReferenciados(proyecto, [referencia])

  if (resuelto === undefined) {
    // Inalcanzable en la practica: ver comentario de la funcion.
    throw new Error('describirReferenciaPendiente: la referencia pendiente no resuelve contra el proyecto')
  }

  const nombreLocal = ETIQUETA_TIPO_DE_LOCAL[resuelto.local.tipo]
  const artefactoNormativo = catalogoArtefactos.find((candidato) => candidato.id === resuelto.artefacto.artefactoId)
  const nombreArtefacto = artefactoNormativo?.nombre ?? resuelto.artefacto.artefactoId

  return `${resuelto.unidadFuncional.nombre} → ${nombreLocal} → ${nombreArtefacto}`
}

// Texto de presentación de las 4 variantes de ResultadoPerdidaDistribuidaDeTramo
// (N3), sin recalcular nada -- lee exclusivamente los campos que el motor ya
// devuelve. '—' para cualquier dato no aplicable en esa variante (nunca 0,
// nunca inventado): sinDemanda no tiene diámetro/velocidad/hf;
// sinCandidatoAdmisible no tiene candidato comercial; sinLongitud tiene todo
// menos hf (Tramo.longitud_m ausente, CRIT-A20 -- no se asume 0 ni se deriva).
export interface TextosDePerdidaDistribuidaDeTramo {
  readonly qcTexto: string
  readonly diReferenciaTexto: string
  readonly diComercialTexto: string
  readonly diEfectivoTexto: string
  readonly vTexto: string
  readonly hfTexto: string
}

export function textosDePerdidaDistribuidaDeTramo(
  resultado: ResultadoPerdidaDistribuidaDeTramo,
): TextosDePerdidaDistribuidaDeTramo {
  const qcTexto = formatearNumero(resultado.qc_lps, 'l/s')

  if (resultado.tipo === 'sinDemanda') {
    return { qcTexto, diReferenciaTexto: '—', diComercialTexto: '—', diEfectivoTexto: '—', vTexto: '—', hfTexto: '—' }
  }

  const diReferenciaTexto = formatearNumero(resultado.diReferenciaPredimensionamiento_mm, 'mm')

  if (resultado.tipo === 'sinCandidatoAdmisible') {
    return { qcTexto, diReferenciaTexto, diComercialTexto: '—', diEfectivoTexto: '—', vTexto: '—', hfTexto: '—' }
  }

  const diComercialTexto = resultado.candidato.denominacionComercial
  const diEfectivoTexto = formatearNumero(resultado.candidato.diametroInteriorEfectivo_mm, 'mm')
  const vTexto = formatearNumero(resultado.velocidadReal_mps, 'm/s')

  if (resultado.tipo === 'sinLongitud') {
    return { qcTexto, diReferenciaTexto, diComercialTexto, diEfectivoTexto, vTexto, hfTexto: '—' }
  }

  return { qcTexto, diReferenciaTexto, diComercialTexto, diEfectivoTexto, vTexto, hfTexto: formatearNumero(resultado.hf_m, 'm') }
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
  onCambiar,
}: {
  proyecto: Proyecto
  catalogoArtefactos: readonly ArtefactoNormativo[]
  fila: FilaDeTabla
  onCambiar: (proyecto: Proyecto) => void
}) {
  let errorDelMotor: string | null = null
  let artefactosTexto: string
  let nTexto: string
  let textos: TextosDePerdidaDistribuidaDeTramo

  try {
    const referencias = obtenerArtefactosAguasAbajo(proyecto, fila.tramoId)
    artefactosTexto = formatearNumero(referencias.length, 'conteo')

    // n hidraulico efectivo: no expuesto por ResultadoPerdidaDistribuidaDeTramo
    // (N3) -- solo vive en ResultadoSimultaneidadHidraulicaDeTramo, que
    // resolverHidraulicaDeTramo si devuelve. Se llama aparte para preservar
    // exactamente la semantica ya cerrada, sin recalcular n en la UI ni
    // tocar el motor para agregarlo a N3.
    const resultadoHidraulico = resolverHidraulicaDeTramo(proyecto, fila.tramoId, catalogoArtefactos)
    nTexto = resultadoHidraulico.tipo === 'conDemanda' ? formatearNumero(resultadoHidraulico.simultaneidad.n, 'conteo') : '—'

    const resultadoPerdida = resolverPerdidaDistribuidaDeTramo(
      proyecto,
      fila.tramoId,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )
    textos = textosDePerdidaDistribuidaDeTramo(resultadoPerdida)
  } catch (motivo) {
    errorDelMotor = motivo instanceof Error ? motivo.message : String(motivo)
    artefactosTexto = '—'
    nTexto = '—'
    textos = { qcTexto: 'Error', diReferenciaTexto: '—', diComercialTexto: '—', diEfectivoTexto: '—', vTexto: '—', hfTexto: '—' }
  }

  // Lectura directa de redHidraulica, fuera del try/catch de arriba: el
  // input de longitud es independiente de que el motor hidraulico haya
  // podido resolver Qc para este Tramo.
  const tramoActual = proyecto.redHidraulica?.tramos.find((tramo) => tramo.id === fila.tramoId)

  return (
    <tr>
      <td style={estiloCelda('left')}>{fila.etiqueta}</td>
      <td style={estiloCelda('center')}>{fila.red}</td>
      <td style={estiloCelda('right')}>{artefactosTexto}</td>
      <td style={estiloCelda('right')}>{nTexto}</td>
      <td style={estiloCelda('right', errorDelMotor !== null)}>
        {textos.qcTexto}
        {errorDelMotor !== null ? (
          <>
            <br />
            <small>{errorDelMotor}</small>
          </>
        ) : null}
      </td>
      <td style={estiloCelda('right')}>{textos.diReferenciaTexto}</td>
      <td style={estiloCelda('right')}>{textos.diComercialTexto}</td>
      <td style={estiloCelda('right')}>{textos.diEfectivoTexto}</td>
      <td style={estiloCelda('right')}>{textos.vTexto}</td>
      <td style={estiloCelda('right')}>
        <input
          type="number"
          value={tramoActual?.longitud_m ?? ''}
          onChange={(evento) => {
            const texto = evento.target.value
            if (texto === '') {
              onCambiar(conLongitudDeTramo(proyecto, fila.tramoId, undefined))
              return
            }
            const longitud_m = Number(texto)
            if (!Number.isNaN(longitud_m)) {
              onCambiar(conLongitudDeTramo(proyecto, fila.tramoId, longitud_m))
            }
          }}
          style={{ width: '5rem' }}
        />
      </td>
      <td style={estiloCelda('right')}>{textos.hfTexto}</td>
    </tr>
  )
}

function TablaDeFilas({
  proyecto,
  catalogoArtefactos,
  encabezadoPrimeraColumna,
  filas,
  onCambiar,
}: {
  proyecto: Proyecto
  catalogoArtefactos: readonly ArtefactoNormativo[]
  encabezadoPrimeraColumna: string
  filas: readonly FilaDeTabla[]
  onCambiar: (proyecto: Proyecto) => void
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
            <th style={estiloEncabezado('right')}>Refs. físicas</th>
            <th style={estiloEncabezado('right')}>n</th>
            <th style={estiloEncabezado('right')}>Qc [l/s]</th>
            <th style={estiloEncabezado('right')}>Di de referencia [mm]</th>
            <th style={estiloEncabezado('right')}>Di comercial</th>
            <th style={estiloEncabezado('right')}>Di efectivo [mm]</th>
            <th style={estiloEncabezado('right')}>V [m/s]</th>
            <th style={estiloEncabezado('right')}>Longitud [m]</th>
            <th style={estiloEncabezado('right')}>hf [m.c.a.]</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <FilaResultado
              key={fila.tramoId}
              proyecto={proyecto}
              catalogoArtefactos={catalogoArtefactos}
              fila={fila}
              onCambiar={onCambiar}
            />
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
  onCambiar,
}: {
  proyecto: Proyecto
  catalogoArtefactos: readonly ArtefactoNormativo[]
  unidadFuncionalId: string
  nombre: string
  locales: Proyecto['unidadesFuncionales'][number]['locales']
  filasPrincipales: ReturnType<typeof identificarFilasPrincipalesDeLocales>
  onCambiar: (proyecto: Proyecto) => void
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
        onCambiar={onCambiar}
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
      <p>
        <small>
          Predimensionamiento: se adopta Ve = 2,0 m/s para la determinación inicial del
          diámetro interior de referencia de predimensionamiento. La velocidad real se
          verificará posteriormente con el diámetro comercial adoptado conforme a ERAS
          §2.12.1.
        </small>
      </p>
    </div>
  )
}

// Aviso de S1/S2: se muestra en vez de las tablas de resultados hidráulicos
// cuando auditarCoberturaFisica detecta artefactos normativos sin ninguna
// referencia física en redHidraulica -- M2 no debe presentar un resultado
// hidráulico como completo mientras eso ocurra (ver PENDIENTES-DE-ARQUITECTURA.md).
// No repara, no genera topología, no recalcula cobertura con otra lógica.
function AvisoCoberturaIncompleta({
  proyecto,
  catalogoArtefactos,
  pendientes,
}: {
  proyecto: Proyecto
  catalogoArtefactos: readonly ArtefactoNormativo[]
  pendientes: readonly ReferenciaDeArtefacto[]
}) {
  return (
    <section>
      <h3>Red hidráulica incompleta</h3>
      <p>
        {pendientes.length === 1
          ? 'Hay 1 artefacto normativo sin conexión física en la red hidráulica.'
          : `Hay ${pendientes.length} artefactos normativos sin conexión física en la red hidráulica.`}
      </p>
      <ul>
        {pendientes.map((referencia) => (
          <li key={`${referencia.unidadFuncionalId}:${referencia.localId}:${referencia.artefactoId}`}>
            {describirReferenciaPendiente(proyecto, catalogoArtefactos, referencia)}
          </li>
        ))}
      </ul>
    </section>
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
  const auditoria = auditarCoberturaFisica(proyecto)

  return (
    <details open>
      <summary>
        <h2>Módulo 2 — Tuberías</h2>
      </summary>

      <ConfiguracionHidraulicaFormulario proyecto={proyecto} onCambiar={onCambiar} />

      {tramos.length === 0 ? (
        <p>El proyecto no tiene una red hidráulica cargada.</p>
      ) : !auditoria.completa ? (
        <AvisoCoberturaIncompleta
          proyecto={proyecto}
          catalogoArtefactos={catalogoArtefactos}
          pendientes={auditoria.artefactosSinReferencia}
        />
      ) : (
        <>
          <h3>Distribución general</h3>
          <TablaDeFilas
            proyecto={proyecto}
            catalogoArtefactos={catalogoArtefactos}
            encabezadoPrimeraColumna="Cañería"
            filas={identificarFilasDistribucionGeneral(proyecto)}
            onCambiar={onCambiar}
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
              onCambiar={onCambiar}
            />
          ))}
        </>
      )}
    </details>
  )
}
