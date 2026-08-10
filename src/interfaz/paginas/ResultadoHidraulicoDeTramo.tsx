// Visualización de Módulo 2 (hidráulica por Tramo) en la pantalla técnica:
// una tabla con todos los Tramos de la red, no un selector -- así es como
// un proyectista necesita revisarlos. Qc/aEfectivo/Di mínimo, nada más:
// ni Kc/K en la vista principal, ni diámetro real, ni editor de red (eso
// queda para incrementos posteriores). Extraído de MotorDemandaPantalla.tsx
// únicamente por legibilidad -- misma razón que duplicarUnidadFuncional.ts,
// no una abstracción nueva. Solo se renderiza cuando el Proyecto ya pasó
// validarProyecto (gate en MotorDemandaPantalla), así que redHidraulica,
// si existe, ya es estructuralmente válida y sus referencias a Artefactos
// ya existen.
import type { CSSProperties } from 'react'
import type { Proyecto, TipoDeLocal } from '../../modelo/proyecto'
import type { Tramo } from '../../modelo/redHidraulica'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import { resolverHidraulicaDeTramo } from '../../motor/tuberias/resolverHidraulicaDeTramo'
import { obtenerArtefactosAguasAbajo } from '../../motor/tuberias/topologia/obtenerArtefactosAguasAbajo'
import { formatearNumero } from '../../exportadores/pdf/formatearNumero'

// Duplicado intencional de la etiqueta homónima en MotorDemandaPantalla.tsx
// (mismo criterio que aplicarParticipacionCritA8: segundo consumidor
// pequeño y puntual, sin abstraer todavía una fuente compartida). Solo se
// usa acá para la columna "Cañería".
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

// "Cañería" es puramente una etiqueta de presentación derivada de la
// topología y el catálogo ya existentes -- no introduce ninguna asociación
// estructural Tramo->Local en el modelo (esa asociación no existe y este
// incremento no la agrega). No reimplementa lógica hidráulica: usa
// obtenerArtefactosAguasAbajo tal cual, solo para agrupar por Local.
function derivarCaneria(
  proyecto: Proyecto,
  tramo: Tramo,
  catalogoArtefactos: readonly ArtefactoNormativo[],
): string {
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    return '—'
  }

  const nodoDestino = redHidraulica.nodos.find((nodo) => nodo.id === tramo.nodoDestinoId)
  if (nodoDestino?.referencia?.tipo === 'produccionACS') {
    return 'Alimentación ACS'
  }

  let referencias: ReturnType<typeof obtenerArtefactosAguasAbajo>
  try {
    referencias = obtenerArtefactosAguasAbajo(proyecto, tramo.id)
  } catch {
    return '—'
  }

  if (referencias.length === 0) {
    return '—'
  }

  const clavesDeLocal = new Set(referencias.map((r) => `${r.unidadFuncionalId}::${r.localId}`))
  if (clavesDeLocal.size > 1) {
    return 'Varios'
  }

  const primeraReferencia = referencias[0]!
  const unidadFuncional = proyecto.unidadesFuncionales.find(
    (uf) => uf.id === primeraReferencia.unidadFuncionalId,
  )
  const local = unidadFuncional?.locales.find((l) => l.id === primeraReferencia.localId)
  if (local === undefined) {
    return '—'
  }

  const etiquetaLocal = ETIQUETA_TIPO_DE_LOCAL[local.tipo]

  if (referencias.length > 1) {
    return etiquetaLocal
  }

  const artefacto = local.artefactos.find((a) => a.id === primeraReferencia.artefactoId)
  const artefactoNormativo = artefacto
    ? catalogoArtefactos.find((c) => c.id === artefacto.artefactoId)
    : undefined

  return artefactoNormativo ? `${etiquetaLocal} — ${artefactoNormativo.nombre}` : etiquetaLocal
}

function FilaDeTramo({
  proyecto,
  catalogoArtefactos,
  tramo,
}: {
  proyecto: Proyecto
  catalogoArtefactos: readonly ArtefactoNormativo[]
  tramo: Tramo
}) {
  let errorDelMotor: string | null = null
  let qcTexto: string
  let aEfectivoTexto: string | number

  try {
    const resultado = resolverHidraulicaDeTramo(proyecto, tramo.id, catalogoArtefactos)
    qcTexto = formatearNumero(resultado.qc_lps, 'l/s')
    aEfectivoTexto = resultado.tipo === 'conDemanda' ? resultado.simultaneidad.aEfectivo : '—'
  } catch (motivo) {
    errorDelMotor = motivo instanceof Error ? motivo.message : String(motivo)
    qcTexto = 'Error'
    aEfectivoTexto = '—'
  }

  return (
    <tr>
      <td style={estiloCelda('left', true)}>{derivarCaneria(proyecto, tramo, catalogoArtefactos)}</td>
      <td style={estiloCelda('left')}>{tramo.id}</td>
      <td style={estiloCelda('center')}>{tramo.red}</td>
      <td style={estiloCelda('right', errorDelMotor !== null)}>
        {qcTexto}
        {errorDelMotor !== null ? (
          <>
            <br />
            <small>{errorDelMotor}</small>
          </>
        ) : null}
      </td>
      <td style={estiloCelda('right')}>{aEfectivoTexto}</td>
      <td style={estiloCelda('right')}>—</td>
    </tr>
  )
}

export function ResultadoHidraulicoDeTramo({
  proyecto,
  catalogoArtefactos,
}: {
  proyecto: Proyecto
  catalogoArtefactos: readonly ArtefactoNormativo[]
}) {
  const tramos = proyecto.redHidraulica?.tramos ?? []

  return (
    <section>
      <h2>Módulo 2 — Tuberías</h2>
      <h3>Resultados hidráulicos por tramo</h3>

      {tramos.length === 0 ? (
        <p>El proyecto no tiene una red hidráulica cargada.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={estiloEncabezado('left')}>Cañería</th>
                <th style={estiloEncabezado('left')}>Tramo</th>
                <th style={estiloEncabezado('center')}>Red</th>
                <th style={estiloEncabezado('right')}>Qc [l/s]</th>
                <th style={estiloEncabezado('right')}>a efectivo</th>
                <th style={estiloEncabezado('right')}>Di mínimo [mm]</th>
              </tr>
            </thead>
            <tbody>
              {tramos.map((tramo) => (
                <FilaDeTramo
                  key={tramo.id}
                  proyecto={proyecto}
                  catalogoArtefactos={catalogoArtefactos}
                  tramo={tramo}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
