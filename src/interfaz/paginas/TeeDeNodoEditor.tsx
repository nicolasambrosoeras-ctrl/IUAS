// Editor de Nodo.tee (CRIT-A31, modo detallado de D-δ.40 / M2-TOPO-D): las
// tees NO son accesorios de Tramo -- son singularidades nodales (1 tramo
// entrante, 2 salientes). No persiste Ks, ángulos, coordenadas,
// izquierda/derecha ni orientación absoluta -- solo la información mínima
// que `ConfiguracionDeTee` necesita para que el motor derive el Ks de cada
// salida desde Tabla N°7 (resolverClasificacionDeTee).
//
// La geometría (cuál salida es la continuación recta) la declara SIEMPRE
// el proyectista: nunca se infiere del orden del array `tramosSalientesIds`
// (§28/§29), del DN, de la cantidad de terminales ni de si la rama es un
// montante. Sin `Nodo.tee` no hay default: la selección arranca vacía.
//
// D-δ.43 / §6: las etiquetas humanas de cada salida las resuelve el
// llamador (nombres de Artefacto aguas abajo en LocalYRedCard; "Montante
// AF 1" / "Baño 1 · UF 3" en el constructor de montantes). Este editor no
// muestra ids de Tramo/Nodo -- sólo los usa internamente para identificar
// cuál salida es cuál al invocar `conTeeDeNodo`.
import { useId, useState } from 'react'
import type { Proyecto } from '../../modelo/proyecto'
import type { NodoDeBifurcacion } from '../../motor/tuberias/topologia/identificarNodosDeBifurcacion'
import { conTeeDeNodo } from './actualizarRedHidraulica'

// Fallback defensivo si el llamador olvida una etiqueta: NUNCA el id
// técnico (FIX-LEAK / §34). En producción el llamador siempre provee una.
const ETIQUETA_SIN_NOMBRE = 'salida sin identificar'

export function TeeDeNodoEditor({
  proyecto,
  nodoDeBifurcacion,
  etiquetasDeSalida,
  onCambiar,
}: {
  proyecto: Proyecto
  nodoDeBifurcacion: NodoDeBifurcacion
  // Nombre humano de cada tramo saliente, indexado por tramoId -- nunca se
  // muestra el tramoId directamente.
  etiquetasDeSalida: Readonly<Record<string, string>>
  onCambiar: (proyecto: Proyecto) => void
}) {
  const nodo = proyecto.redHidraulica?.nodos.find((candidato) => candidato.id === nodoDeBifurcacion.nodoId)
  const teePersistida = nodo?.tee
  // Estado transitorio de UI: "el usuario eligió 'por un extremo' pero
  // todavía no marcó cuál salida es la recta". Nunca llega al Proyecto
  // (§14); se siembra desde la configuración persistida.
  const [tipoElegido, setTipoElegido] = useState<'entradaPorExtremo' | 'entradaCentral' | undefined>(teePersistida?.tipo)
  // Nombre de grupo de radios OPACO (nunca el id del Nodo/Tramo, §8/§34):
  // sólo tiene que ser único en la página para agrupar los radios.
  const nombreGrupo = useId()

  if (nodo === undefined) {
    return null
  }
  const [salienteA, salienteB] = nodoDeBifurcacion.tramosSalientesIds
  const etiquetaA = etiquetasDeSalida[salienteA] ?? ETIQUETA_SIN_NOMBRE
  const etiquetaB = etiquetasDeSalida[salienteB] ?? ETIQUETA_SIN_NOMBRE
  const rectaPersistida = teePersistida?.tipo === 'entradaPorExtremo' ? teePersistida.tramoSalidaRectaId : undefined

  function elegirTipo(tipo: 'entradaPorExtremo' | 'entradaCentral') {
    setTipoElegido(tipo)
    if (tipo === 'entradaCentral') {
      // Central -> ambas salidas laterales; el modelo reemplaza la
      // configuración completa, descartando cualquier `tramoSalidaRectaId`.
      onCambiar(conTeeDeNodo(proyecto, nodoDeBifurcacion.nodoId, { tipo: 'entradaCentral' }))
      return
    }
    // "Por un extremo": si ya había una recta persistida válida se re-aplica
    // tal cual; si no, no se muta -- aparece el segundo grupo de radios y el
    // usuario elige la recta (no se inventa un default, §28).
    if (rectaPersistida === salienteA || rectaPersistida === salienteB) {
      onCambiar(
        conTeeDeNodo(proyecto, nodoDeBifurcacion.nodoId, {
          tipo: 'entradaPorExtremo',
          tramoSalidaRectaId: rectaPersistida!,
        }),
      )
    }
  }

  function elegirRecta(tramoSalidaRectaId: string) {
    onCambiar(conTeeDeNodo(proyecto, nodoDeBifurcacion.nodoId, { tipo: 'entradaPorExtremo', tramoSalidaRectaId }))
  }

  return (
    <fieldset className="tee-editor">
      <legend>Configuración de la derivación</legend>
      <p className="tee-editor__salidas">
        Se divide hacia <strong>{etiquetaA}</strong> y <strong>{etiquetaB}</strong>.
      </p>

      <div className="tee-editor__grupo" role="radiogroup" aria-label="Tipo de entrada a la derivación">
        <span className="tee-editor__grupo-titulo">La cañería entra por…</span>
        <label>
          <input
            type="radio"
            name={`${nombreGrupo}-tipo`}
            checked={tipoElegido === 'entradaPorExtremo'}
            onChange={() => elegirTipo('entradaPorExtremo')}
          />{' '}
          un extremo (una salida continúa recta, la otra es lateral)
        </label>
        <label>
          <input
            type="radio"
            name={`${nombreGrupo}-tipo`}
            checked={tipoElegido === 'entradaCentral'}
            onChange={() => elegirTipo('entradaCentral')}
          />{' '}
          el centro (ambas salidas son laterales)
        </label>
      </div>

      {tipoElegido === 'entradaPorExtremo' ? (
        <div className="tee-editor__grupo" role="radiogroup" aria-label="Salida que continúa recta">
          <span className="tee-editor__grupo-titulo">Continúa recta hacia…</span>
          <label>
            <input
              type="radio"
              name={`${nombreGrupo}-recta`}
              checked={rectaPersistida === salienteA}
              onChange={() => elegirRecta(salienteA)}
            />{' '}
            {etiquetaA}
          </label>
          <label>
            <input
              type="radio"
              name={`${nombreGrupo}-recta`}
              checked={rectaPersistida === salienteB}
              onChange={() => elegirRecta(salienteB)}
            />{' '}
            {etiquetaB}
          </label>
        </div>
      ) : null}

      {teePersistida === undefined ? (
        <p className="tee-editor__pendiente">
          Falta definir la configuración de la derivación — en modo Detalladas la verificación de
          presión queda incompleta hasta elegirla.
        </p>
      ) : null}
    </fieldset>
  )
}
