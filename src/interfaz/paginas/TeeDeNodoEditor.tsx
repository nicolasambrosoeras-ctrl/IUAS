// Editor de Nodo.tee (CRIT-A31, modo detallado de D-δ.40): las tees NO son
// accesorios de Tramo -- son singularidades nodales (1 tramo entrante, 2
// salientes). No persiste Ks, ángulos, coordenadas, izquierda/derecha ni
// orientación absoluta -- solo la información mínima que ConfiguracionDeTee
// necesita para que el motor derive el Ks de cada salida desde Tabla N°7
// (resolverClasificacionDeTee). Si la topología deja de ser coherente
// (p.ej. tramoSalidaRectaId inválido), la inconsistencia la reporta
// validarRedHidraulica -- este editor no infiere ni corrige nada
// silenciosamente.
import type { Proyecto } from '../../modelo/proyecto'
import { obtenerArtefactosAguasAbajo } from '../../motor/tuberias/topologia/obtenerArtefactosAguasAbajo'
import type { NodoDeBifurcacion } from '../../motor/tuberias/topologia/identificarNodosDeBifurcacion'
import { formatearNumero } from '../../exportadores/pdf/formatearNumero'
import { conTeeDeNodo } from './actualizarRedHidraulica'

function etiquetaDeSaliente(proyecto: Proyecto, tramoSalienteId: string): string {
  const cantidad = obtenerArtefactosAguasAbajo(proyecto, tramoSalienteId).length
  return `${tramoSalienteId} (${formatearNumero(cantidad, 'conteo')} artefacto${cantidad === 1 ? '' : 's'} aguas abajo)`
}

export function TeeDeNodoEditor({
  proyecto,
  nodoDeBifurcacion,
  onCambiar,
}: {
  proyecto: Proyecto
  nodoDeBifurcacion: NodoDeBifurcacion
  onCambiar: (proyecto: Proyecto) => void
}) {
  const nodo = proyecto.redHidraulica?.nodos.find((candidato) => candidato.id === nodoDeBifurcacion.nodoId)
  if (nodo === undefined) {
    return null
  }
  const { tee } = nodo
  const [salienteA, salienteB] = nodoDeBifurcacion.tramosSalientesIds

  if (tee === undefined) {
    return (
      <div>
        <p>
          <strong>Bifurcación sin configurar</strong> — nodo <code>{nodoDeBifurcacion.nodoId}</code>. Salidas:{' '}
          {etiquetaDeSaliente(proyecto, salienteA)} y {etiquetaDeSaliente(proyecto, salienteB)}.
        </p>
        <p>
          <button
            type="button"
            onClick={() => onCambiar(conTeeDeNodo(proyecto, nodoDeBifurcacion.nodoId, { tipo: 'entradaCentral' }))}
          >
            Entrada central (ambas salidas laterales)
          </button>
        </p>
        <p>
          <small>Entrada por extremo — indicar cuál salida es la continuación recta del eje de entrada:</small>
          <br />
          <button
            type="button"
            onClick={() =>
              onCambiar(
                conTeeDeNodo(proyecto, nodoDeBifurcacion.nodoId, { tipo: 'entradaPorExtremo', tramoSalidaRectaId: salienteA }),
              )
            }
          >
            {salienteA} es la recta
          </button>{' '}
          <button
            type="button"
            onClick={() =>
              onCambiar(
                conTeeDeNodo(proyecto, nodoDeBifurcacion.nodoId, { tipo: 'entradaPorExtremo', tramoSalidaRectaId: salienteB }),
              )
            }
          >
            {salienteB} es la recta
          </button>
        </p>
      </div>
    )
  }

  const descripcion =
    tee.tipo === 'entradaCentral'
      ? 'Entrada central — ambas salidas laterales'
      : `Entrada por extremo — recta: ${tee.tramoSalidaRectaId}, lateral: ${
          tee.tramoSalidaRectaId === salienteA ? salienteB : salienteA
        }`

  return (
    <div>
      <p>
        Nodo <code>{nodoDeBifurcacion.nodoId}</code>: {descripcion}.{' '}
        <button type="button" onClick={() => onCambiar(conTeeDeNodo(proyecto, nodoDeBifurcacion.nodoId, undefined))}>
          Reconfigurar
        </button>
      </p>
    </div>
  )
}
