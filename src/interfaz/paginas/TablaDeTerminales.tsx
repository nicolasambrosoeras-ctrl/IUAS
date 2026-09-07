// Tabla "Ver todos los terminales" del Panel de Presion (D-δ.50, brief
// seccion 28): una fila por terminal, ordenada por margen ascendente
// (verificables primero, luego incompletos, luego los sin Pmin normativa
// al final). Presentacion pura -- consume resolverFilaDeTerminalParaTabla.
import type { CSSProperties } from 'react'
import type { Proyecto } from '../../modelo/proyecto'
import type { ReferenciaDeArtefacto } from '../../modelo/redHidraulica'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import type { CandidatoTerminal } from '../../motor/tuberias/presion/resolverTerminalMasDesfavorable'
import { formatearNumero } from '../../exportadores/pdf/formatearNumero'
import {
  ordenarFilasDeTerminales,
  resolverFilaDeTerminalParaTabla,
} from './resolverFilaDeTerminalParaTabla'

const estiloTh: CSSProperties = { textAlign: 'left', padding: '0.2rem 0.75rem', borderBottom: '1px solid #ccc' }
const estiloTd: CSSProperties = { padding: '0.2rem 0.75rem', borderBottom: '1px solid #eee' }
const estiloNum: CSSProperties = { ...estiloTd, textAlign: 'right' }

function mca(valor: number | undefined): string {
  return valor === undefined ? '—' : `${valor >= 0 ? '' : ''}${formatearNumero(valor, 'm')}`
}

function margenTexto(valor: number | undefined): string {
  if (valor === undefined) return '—'
  return `${valor >= 0 ? '+' : ''}${formatearNumero(valor, 'm')}`
}

export function TablaDeTerminales({
  proyecto,
  catalogoArtefactos,
  candidatos,
  referenciaPorNodoId,
}: {
  proyecto: Proyecto
  catalogoArtefactos: readonly ArtefactoNormativo[]
  candidatos: readonly CandidatoTerminal[]
  referenciaPorNodoId: ReadonlyMap<string, ReferenciaDeArtefacto>
}) {
  const filas = ordenarFilasDeTerminales(
    candidatos.flatMap((candidato) => {
      const referencia = referenciaPorNodoId.get(candidato.nodoId)
      if (referencia === undefined) {
        return []
      }
      return [resolverFilaDeTerminalParaTabla(proyecto, catalogoArtefactos, referencia, candidato)]
    }),
  )

  if (filas.length === 0) {
    return <p>No hay terminales para listar.</p>
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', minWidth: '38rem' }}>
        <thead>
          <tr>
            <th style={estiloTh}>Terminal</th>
            <th style={estiloTh}>Ubicación</th>
            <th style={estiloTh}>Red</th>
            <th style={{ ...estiloTh, textAlign: 'right' }}>Presidual</th>
            <th style={{ ...estiloTh, textAlign: 'right' }}>Pmin</th>
            <th style={{ ...estiloTh, textAlign: 'right' }}>Margen</th>
            <th style={estiloTh}>Estado</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <tr key={fila.nodoId}>
              <td style={estiloTd}>{fila.artefacto}</td>
              <td style={estiloTd}>{fila.ubicacion}</td>
              <td style={estiloTd}>{fila.redTexto}</td>
              <td style={estiloNum}>{mca(fila.presidual_mca)}</td>
              <td style={estiloNum}>{mca(fila.pmin_mca)}</td>
              <td style={estiloNum}>{margenTexto(fila.margen_mca)}</td>
              <td style={estiloTd}>{fila.estadoTexto}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
