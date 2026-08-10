// Primera visualización de Módulo 2 (hidráulica por Tramo) en la pantalla
// técnica. Selector de Tramo + Qc del motor integral, nada más: ni
// diámetro, ni presión, ni editor de red (eso queda para incrementos
// posteriores). Extraído de MotorDemandaPantalla.tsx únicamente por
// legibilidad -- misma razón que duplicarUnidadFuncional.ts, no una
// abstracción nueva. Solo se renderiza cuando el Proyecto ya pasó
// validarProyecto (gate en MotorDemandaPantalla), así que redHidraulica,
// si existe, ya es estructuralmente válida y sus referencias a Artefactos
// ya existen.
import { useState } from 'react'
import type { Proyecto } from '../../modelo/proyecto'
import type { Tramo } from '../../modelo/redHidraulica'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import {
  resolverHidraulicaDeTramo,
  type ResultadoHidraulicoDeTramo as ResultadoDelMotor,
} from '../../motor/tuberias/resolverHidraulicaDeTramo'
import { formatearNumero } from '../../exportadores/pdf/formatearNumero'
import { textoValorCalculado } from '../../presentacion/desarrolloDelCalculoDemanda'

function etiquetaDeTramo(tramo: Tramo): string {
  return `Tramo ${tramo.id} — ${tramo.red}`
}

function ResultadoDelTramo({ resultado }: { resultado: ResultadoDelMotor }) {
  if (resultado.tipo === 'sinDemanda') {
    return (
      <div>
        <p>Sin demanda hidráulica en este tramo.</p>
        <p>
          Qc: {formatearNumero(resultado.qc_lps, 'l/s')} l/s
        </p>
      </div>
    )
  }

  const { aEfectivo, kc, k } = resultado.simultaneidad

  return (
    <table>
      <tbody>
        <tr>
          <th>Qc</th>
          <td>{formatearNumero(resultado.qc_lps, 'l/s')} l/s</td>
        </tr>
        <tr>
          <th>aEfectivo</th>
          <td>{formatearNumero(aEfectivo, 'adimensional')}</td>
        </tr>
        <tr>
          <th>Kc</th>
          <td>{textoValorCalculado(kc)}</td>
        </tr>
        <tr>
          <th>K</th>
          <td>{textoValorCalculado(k)}</td>
        </tr>
      </tbody>
    </table>
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
  const [tramoSeleccionadoId, setTramoSeleccionadoId] = useState<string | null>(tramos[0]?.id ?? null)

  return (
    <section>
      <h2>Resultado hidráulico por Tramo</h2>

      {tramos.length === 0 ? (
        <p>El proyecto no tiene una red hidráulica cargada.</p>
      ) : (
        <ContenidoConTramos
          proyecto={proyecto}
          catalogoArtefactos={catalogoArtefactos}
          tramos={tramos}
          tramoSeleccionadoId={tramoSeleccionadoId}
          onSeleccionarTramo={setTramoSeleccionadoId}
        />
      )}
    </section>
  )
}

// Separado de ResultadoHidraulicoDeTramo únicamente para no repetir el
// chequeo "tramos.length === 0" dentro de esta rama: acá tramos siempre
// tiene al menos un elemento.
function ContenidoConTramos({
  proyecto,
  catalogoArtefactos,
  tramos,
  tramoSeleccionadoId,
  onSeleccionarTramo,
}: {
  proyecto: Proyecto
  catalogoArtefactos: readonly ArtefactoNormativo[]
  tramos: readonly Tramo[]
  tramoSeleccionadoId: string | null
  onSeleccionarTramo: (tramoId: string) => void
}) {
  const primerTramo = tramos[0] as Tramo
  // Si el tramo previamente seleccionado ya no existe (p. ej. la red de
  // ejemplo cambió entre renders), se cae al primero sin crashear; no se
  // fuerza sincronizar el estado con un efecto, alcanza con este fallback.
  const idEfectivo = tramos.some((tramo) => tramo.id === tramoSeleccionadoId)
    ? (tramoSeleccionadoId as string)
    : primerTramo.id

  let resultado: ResultadoDelMotor | null = null
  let errorDelMotor: string | null = null
  try {
    resultado = resolverHidraulicaDeTramo(proyecto, idEfectivo, catalogoArtefactos)
  } catch (motivo) {
    errorDelMotor = motivo instanceof Error ? motivo.message : String(motivo)
  }

  return (
    <>
      <label>
        Tramo:{' '}
        <select value={idEfectivo} onChange={(evento) => onSeleccionarTramo(evento.target.value)}>
          {tramos.map((tramo) => (
            <option key={tramo.id} value={tramo.id}>
              {etiquetaDeTramo(tramo)}
            </option>
          ))}
        </select>
      </label>

      {errorDelMotor !== null ? (
        <p>Error al resolver la hidráulica de este Tramo: {errorDelMotor}</p>
      ) : resultado !== null ? (
        <ResultadoDelTramo resultado={resultado} />
      ) : null}
    </>
  )
}
