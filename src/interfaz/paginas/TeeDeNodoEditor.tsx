// Editor de Nodo.tee (CRIT-A31, modo detallado de D-δ.40): las tees NO son
// accesorios de Tramo -- son singularidades nodales (1 tramo entrante, 2
// salientes). No persiste Ks, ángulos, coordenadas, izquierda/derecha ni
// orientación absoluta -- solo la información mínima que ConfiguracionDeTee
// necesita para que el motor derive el Ks de cada salida desde Tabla N°7
// (resolverClasificacionDeTee). Si la topología deja de ser coherente
// (p.ej. tramoSalidaRectaId inválido), la inconsistencia la reporta
// validarRedHidraulica -- este editor no infiere ni corrige nada
// silenciosamente.
//
// D-δ.43: las etiquetas de cada salida las resuelve el llamador (nombres
// humanos de los Artefactos aguas abajo, ver humanizarModulo2.ts) -- este
// editor no conoce ids de Tramo/Nodo en su presentación, solo los usa
// internamente para identificar cuál salida es cuál al invocar
// conTeeDeNodo.
import type { Proyecto } from '../../modelo/proyecto'
import type { NodoDeBifurcacion } from '../../motor/tuberias/topologia/identificarNodosDeBifurcacion'
import { conTeeDeNodo } from './actualizarRedHidraulica'

export function TeeDeNodoEditor({
  proyecto,
  nodoDeBifurcacion,
  etiquetasDeSalida,
  onCambiar,
}: {
  proyecto: Proyecto
  nodoDeBifurcacion: NodoDeBifurcacion
  // Nombre humano de cada tramo saliente (p.ej. "Lavatorio"), indexado por
  // tramoId -- nunca se muestra el tramoId directamente.
  etiquetasDeSalida: Readonly<Record<string, string>>
  onCambiar: (proyecto: Proyecto) => void
}) {
  const nodo = proyecto.redHidraulica?.nodos.find((candidato) => candidato.id === nodoDeBifurcacion.nodoId)
  if (nodo === undefined) {
    return null
  }
  const { tee } = nodo
  const [salienteA, salienteB] = nodoDeBifurcacion.tramosSalientesIds
  const etiquetaA = etiquetasDeSalida[salienteA] ?? salienteA
  const etiquetaB = etiquetasDeSalida[salienteB] ?? salienteB

  if (tee === undefined) {
    return (
      <div>
        <p>
          <strong>Bifurcación sin configurar</strong> — se divide hacia {etiquetaA} y {etiquetaB}.
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
            {etiquetaA} es la recta
          </button>{' '}
          <button
            type="button"
            onClick={() =>
              onCambiar(
                conTeeDeNodo(proyecto, nodoDeBifurcacion.nodoId, { tipo: 'entradaPorExtremo', tramoSalidaRectaId: salienteB }),
              )
            }
          >
            {etiquetaB} es la recta
          </button>
        </p>
      </div>
    )
  }

  const descripcion =
    tee.tipo === 'entradaCentral'
      ? 'Entrada central — ambas salidas laterales'
      : `Entrada por extremo — recta: ${tee.tramoSalidaRectaId === salienteA ? etiquetaA : etiquetaB}, lateral: ${
          tee.tramoSalidaRectaId === salienteA ? etiquetaB : etiquetaA
        }`

  return (
    <div>
      <p>
        Se divide hacia {etiquetaA} y {etiquetaB}. {descripcion}.{' '}
        <button type="button" onClick={() => onCambiar(conTeeDeNodo(proyecto, nodoDeBifurcacion.nodoId, undefined))}>
          Reconfigurar
        </button>
      </p>
    </div>
  )
}
