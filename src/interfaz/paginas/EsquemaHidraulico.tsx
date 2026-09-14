// VIS-TOPO-01 -- Capa 3 del pipeline (VIS-TOPO-00 §13/§22): renderer React
// + SVG del esquema hidráulico read-only de Módulo 2. Consume
// GrafoVisual/GrafoVisualPosicionado ya resueltos por
// resolverGrafoVisual.ts (capa 1, pura) y layoutGrafoVisual.ts (capa 2,
// Dagre) -- NO reinterpreta topología acá.
//
// No es un plano arquitectónico ni un editor de nodos: es un esquema
// topológico derivado, sin posición espacial real ni escala física
// (VIS-TOPO-00 §2). Sin x/y/zoom/pan persistidos -- todo estado de
// transform/filtros es React efímero (VIS-TOPO-00 §31/B39).
import { useMemo, useRef, useState, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react'
import type { Proyecto } from '../../modelo/proyecto'
import { resolverGrafoVisual, type RedVisual } from './resolverGrafoVisual'
import { layoutGrafoVisual, type AristaPosicionada, type GrafoVisualPosicionado, type NodoPosicionado } from './layoutGrafoVisual'
import './esquemaHidraulico.css'

type ViewBox = { readonly x: number; readonly y: number; readonly w: number; readonly h: number }

const PADDING_FIT = 32
const ZOOM_MIN_FACTOR = 0.2 // respecto del tamaño "Ajustar" (más chico = más zoom-in permitido)
const ZOOM_MAX_FACTOR = 6 // respecto del tamaño "Ajustar" (más grande = más zoom-out permitido)

function viewBoxDeAjuste(layout: GrafoVisualPosicionado): ViewBox {
  if (layout.nodos.length === 0) {
    return { x: 0, y: 0, w: 100, h: 100 }
  }
  return {
    x: layout.minX - PADDING_FIT,
    y: layout.minY - PADDING_FIT,
    w: Math.max(layout.ancho + PADDING_FIT * 2, 1),
    h: Math.max(layout.alto + PADDING_FIT * 2, 1),
  }
}

function claseDeRed(red: RedVisual): string {
  return red === 'AF' ? 'vis-topo-red-af' : 'vis-topo-red-ac'
}

function trazoDePuntos(puntos: AristaPosicionada['puntos']): string {
  return puntos.map((punto, indice) => `${indice === 0 ? 'M' : 'L'} ${punto.x} ${punto.y}`).join(' ')
}

function NodoSvg({ nodo, mostrarEtiquetas }: { nodo: NodoPosicionado; mostrarEtiquetas: boolean }) {
  const x = nodo.x - nodo.ancho / 2
  const y = nodo.y - nodo.alto / 2

  if (nodo.tipo === 'intermedio') {
    // Nodo real 1→1: sin label por defecto (VIS-TOPO-00 B9) -- conserva la
    // separación de aristas sin saturar el esquema.
    return <circle className="vis-topo-nodo-intermedio" cx={nodo.x} cy={nodo.y} r={nodo.ancho / 2} />
  }

  if (nodo.tipo === 'derivacion') {
    const clases = ['vis-topo-nodo-derivacion', nodo.noDetallado === true ? 'vis-topo-nodo-derivacion--no-detallado' : ''].join(' ').trim()
    return (
      <g className={clases}>
        <rect x={x} y={y} width={nodo.ancho} height={nodo.alto} rx={nodo.noDetallado === true ? 8 : nodo.ancho / 2} />
        {nodo.noDetallado === true && mostrarEtiquetas ? (
          <text x={nodo.x} y={nodo.y} textAnchor="middle" dominantBaseline="middle" className="vis-topo-texto-nodo">
            {nodo.label}
          </text>
        ) : null}
      </g>
    )
  }

  const esLocal = nodo.tipo === 'local'
  return (
    <g className={esLocal ? 'vis-topo-nodo-local' : 'vis-topo-nodo-origen'}>
      <rect x={x} y={y} width={nodo.ancho} height={nodo.alto} rx={10} />
      <text x={nodo.x} y={esLocal && nodo.sublabel !== undefined ? nodo.y - 7 : nodo.y} textAnchor="middle" dominantBaseline="middle" className="vis-topo-texto-nodo vis-topo-texto-nodo--principal">
        {nodo.label}
      </text>
      {esLocal && nodo.sublabel !== undefined ? (
        <text x={nodo.x} y={nodo.y + 11} textAnchor="middle" dominantBaseline="middle" className="vis-topo-texto-nodo vis-topo-texto-nodo--sublabel">
          {nodo.sublabel}
        </text>
      ) : null}
    </g>
  )
}

function AristaSvg({ arista, mostrarEtiquetas }: { arista: AristaPosicionada; mostrarEtiquetas: boolean }) {
  const puntoMedio = arista.puntos[Math.floor(arista.puntos.length / 2)]
  const etiqueta = [arista.dnTexto, arista.longitudTexto].filter((parte): parte is string => parte !== undefined).join(' · ')
  return (
    <g className={`vis-topo-arista ${claseDeRed(arista.red)}`}>
      <path d={trazoDePuntos(arista.puntos)} fill="none" markerEnd="url(#vis-topo-flecha)" />
      {mostrarEtiquetas && etiqueta !== '' && puntoMedio !== undefined ? (
        <text x={puntoMedio.x} y={puntoMedio.y - 4} textAnchor="middle" className="vis-topo-texto-arista">
          {etiqueta}
        </text>
      ) : null}
      {mostrarEtiquetas && arista.montanteEtiqueta !== undefined && puntoMedio !== undefined ? (
        <text x={puntoMedio.x} y={puntoMedio.y - 16} textAnchor="middle" className="vis-topo-texto-montante">
          {arista.montanteEtiqueta}
        </text>
      ) : null}
    </g>
  )
}

function Toolbar({
  mostrarAf,
  mostrarAc,
  mostrarEtiquetas,
  onCambiarAf,
  onCambiarAc,
  onCambiarEtiquetas,
  onAjustar,
  onAcercar,
  onAlejar,
}: {
  mostrarAf: boolean
  mostrarAc: boolean
  mostrarEtiquetas: boolean
  onCambiarAf: (valor: boolean) => void
  onCambiarAc: (valor: boolean) => void
  onCambiarEtiquetas: (valor: boolean) => void
  onAjustar: () => void
  onAcercar: () => void
  onAlejar: () => void
}) {
  return (
    <div className="vis-topo-toolbar" role="toolbar" aria-label="Controles del esquema hidráulico">
      <button type="button" aria-pressed={mostrarAf} className="vis-topo-toolbar__toggle vis-topo-toolbar__toggle--af" onClick={() => onCambiarAf(!mostrarAf)}>
        Agua fría (AF)
      </button>
      <button type="button" aria-pressed={mostrarAc} className="vis-topo-toolbar__toggle vis-topo-toolbar__toggle--ac" onClick={() => onCambiarAc(!mostrarAc)}>
        Agua caliente (AC)
      </button>
      <button type="button" aria-pressed={mostrarEtiquetas} className="vis-topo-toolbar__toggle" onClick={() => onCambiarEtiquetas(!mostrarEtiquetas)}>
        Etiquetas
      </button>
      <span className="vis-topo-toolbar__separador" aria-hidden="true" />
      <button type="button" aria-label="Alejar" onClick={onAlejar}>
        −
      </button>
      <button type="button" aria-label="Acercar" onClick={onAcercar}>
        +
      </button>
      <button type="button" onClick={onAjustar}>
        Ajustar
      </button>
    </div>
  )
}

function Leyenda() {
  return (
    <div className="vis-topo-leyenda" aria-hidden="true">
      <span className="vis-topo-leyenda__item">
        <span className="vis-topo-leyenda__swatch vis-topo-red-af" /> AF — Agua fría
      </span>
      <span className="vis-topo-leyenda__item">
        <span className="vis-topo-leyenda__swatch vis-topo-red-ac" /> AC — Agua caliente
      </span>
      <span className="vis-topo-leyenda__item">
        <span className="vis-topo-leyenda__swatch vis-topo-leyenda__swatch--no-detallado" /> Distribución no detallada
      </span>
    </div>
  )
}

export function EsquemaHidraulico({ proyecto }: { proyecto: Proyecto }) {
  const [mostrarAf, setMostrarAf] = useState(true)
  const [mostrarAc, setMostrarAc] = useState(true)
  const [mostrarEtiquetas, setMostrarEtiquetas] = useState(true)
  const [viewBox, setViewBox] = useState<ViewBox | null>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const arrastreRef = useRef<{ clienteX: number; clienteY: number; viewBox: ViewBox } | null>(null)

  // Memoizado por identidad de `proyecto` -- mismo criterio que
  // ContextoDeCalculoM2 (PERF-SCALE-01C): la topología derivada y su
  // layout sólo deben recalcularse cuando cambia el Proyecto, nunca por
  // pan/zoom/filtros (VIS-TOPO-00 B29), que son estado puramente visual.
  const grafo = useMemo(() => resolverGrafoVisual(proyecto), [proyecto])
  const layout = useMemo(() => layoutGrafoVisual(grafo), [grafo])

  const ajusteCompleto = useMemo(() => viewBoxDeAjuste(layout), [layout])

  const nodosVisibles = useMemo(() => {
    if (mostrarAf && mostrarAc) {
      return layout.nodos
    }
    const idsConAristaVisible = new Set<string>()
    for (const arista of layout.aristas) {
      if ((arista.red === 'AF' && mostrarAf) || (arista.red === 'AC' && mostrarAc)) {
        idsConAristaVisible.add(arista.origenId)
        idsConAristaVisible.add(arista.destinoId)
      }
    }
    return layout.nodos.filter((nodo) => idsConAristaVisible.has(nodo.id))
  }, [layout, mostrarAf, mostrarAc])

  const aristasVisibles = useMemo(
    () => layout.aristas.filter((arista) => (arista.red === 'AF' && mostrarAf) || (arista.red === 'AC' && mostrarAc)),
    [layout, mostrarAf, mostrarAc],
  )

  function ajustar() {
    if (nodosVisibles.length === layout.nodos.length) {
      setViewBox(ajusteCompleto)
      return
    }
    let minX = Number.POSITIVE_INFINITY
    let minY = Number.POSITIVE_INFINITY
    let maxX = Number.NEGATIVE_INFINITY
    let maxY = Number.NEGATIVE_INFINITY
    for (const nodo of nodosVisibles) {
      minX = Math.min(minX, nodo.x - nodo.ancho / 2)
      minY = Math.min(minY, nodo.y - nodo.alto / 2)
      maxX = Math.max(maxX, nodo.x + nodo.ancho / 2)
      maxY = Math.max(maxY, nodo.y + nodo.alto / 2)
    }
    if (!Number.isFinite(minX)) {
      setViewBox(ajusteCompleto)
      return
    }
    setViewBox({
      x: minX - PADDING_FIT,
      y: minY - PADDING_FIT,
      w: Math.max(maxX - minX + PADDING_FIT * 2, 1),
      h: Math.max(maxY - minY + PADDING_FIT * 2, 1),
    })
  }

  const viewBoxActivo = viewBox ?? ajusteCompleto

  function zoom(factor: number, centroClienteX?: number, centroClienteY?: number) {
    const svg = svgRef.current
    const base = viewBoxActivo
    const limiteMin = ajusteCompleto.w * ZOOM_MIN_FACTOR
    const limiteMax = ajusteCompleto.w * ZOOM_MAX_FACTOR
    const nuevoAncho = Math.min(Math.max(base.w * factor, limiteMin), limiteMax)
    const factorReal = nuevoAncho / base.w
    const nuevoAlto = base.h * factorReal

    let ratioX = 0.5
    let ratioY = 0.5
    if (svg !== null && centroClienteX !== undefined && centroClienteY !== undefined) {
      const rect = svg.getBoundingClientRect()
      if (rect.width > 0 && rect.height > 0) {
        ratioX = (centroClienteX - rect.left) / rect.width
        ratioY = (centroClienteY - rect.top) / rect.height
      }
    }
    const puntoFijoX = base.x + base.w * ratioX
    const puntoFijoY = base.y + base.h * ratioY
    setViewBox({
      x: puntoFijoX - nuevoAncho * ratioX,
      y: puntoFijoY - nuevoAlto * ratioY,
      w: nuevoAncho,
      h: nuevoAlto,
    })
  }

  function onWheel(evento: ReactWheelEvent<SVGSVGElement>) {
    evento.preventDefault()
    const factor = evento.deltaY > 0 ? 1.12 : 1 / 1.12
    zoom(factor, evento.clientX, evento.clientY)
  }

  function onPointerDown(evento: ReactPointerEvent<SVGSVGElement>) {
    ;(evento.currentTarget as SVGSVGElement).setPointerCapture(evento.pointerId)
    arrastreRef.current = { clienteX: evento.clientX, clienteY: evento.clientY, viewBox: viewBoxActivo }
  }

  function onPointerMove(evento: ReactPointerEvent<SVGSVGElement>) {
    const arrastre = arrastreRef.current
    const svg = svgRef.current
    if (arrastre === null || svg === null) {
      return
    }
    const rect = svg.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) {
      return
    }
    const deltaClienteX = evento.clientX - arrastre.clienteX
    const deltaClienteY = evento.clientY - arrastre.clienteY
    const deltaMundoX = (deltaClienteX / rect.width) * arrastre.viewBox.w
    const deltaMundoY = (deltaClienteY / rect.height) * arrastre.viewBox.h
    setViewBox({ ...arrastre.viewBox, x: arrastre.viewBox.x - deltaMundoX, y: arrastre.viewBox.y - deltaMundoY })
  }

  function onPointerUp(evento: ReactPointerEvent<SVGSVGElement>) {
    arrastreRef.current = null
    if ((evento.currentTarget as SVGSVGElement).hasPointerCapture(evento.pointerId)) {
      ;(evento.currentTarget as SVGSVGElement).releasePointerCapture(evento.pointerId)
    }
  }

  if (grafo.nodos.length === 0) {
    return (
      <section className="esquema-hidraulico">
        <h3>Esquema hidráulico</h3>
        <div className="ui-empty">
          <p className="ui-empty__texto">Todavía no hay una red hidráulica para visualizar.</p>
        </div>
      </section>
    )
  }

  const sinRedesVisibles = !mostrarAf && !mostrarAc

  return (
    <section className="esquema-hidraulico">
      <h3>Esquema hidráulico</h3>
      <p className="esquema-hidraulico__intro">
        <small>Esquema topológico derivado de la red del proyecto -- no representa posición ni escala física real.</small>
      </p>
      <Toolbar
        mostrarAf={mostrarAf}
        mostrarAc={mostrarAc}
        mostrarEtiquetas={mostrarEtiquetas}
        onCambiarAf={(valor) => {
          setMostrarAf(valor)
          setViewBox(null)
        }}
        onCambiarAc={(valor) => {
          setMostrarAc(valor)
          setViewBox(null)
        }}
        onCambiarEtiquetas={setMostrarEtiquetas}
        onAjustar={ajustar}
        onAcercar={() => zoom(1 / 1.3)}
        onAlejar={() => zoom(1.3)}
      />
      <div className="vis-topo-viewport">
        {sinRedesVisibles ? (
          <div className="ui-empty">
            <p className="ui-empty__texto">No hay ninguna red visible. Activá Agua fría o Agua caliente para ver el esquema.</p>
          </div>
        ) : (
          <svg
            ref={svgRef}
            role="img"
            aria-label="Esquema topológico hidráulico del proyecto: origen, montantes, derivaciones y Locales, en agua fría y agua caliente."
            viewBox={`${viewBoxActivo.x} ${viewBoxActivo.y} ${viewBoxActivo.w} ${viewBoxActivo.h}`}
            className="vis-topo-svg"
            onWheel={onWheel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            <title>Esquema hidráulico</title>
            <defs>
              <marker id="vis-topo-flecha" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" className="vis-topo-flecha" />
              </marker>
            </defs>
            <g>
              {aristasVisibles.map((arista) => (
                <AristaSvg key={arista.id} arista={arista} mostrarEtiquetas={mostrarEtiquetas} />
              ))}
            </g>
            <g>
              {nodosVisibles.map((nodo) => (
                <NodoSvg key={nodo.id} nodo={nodo} mostrarEtiquetas={mostrarEtiquetas} />
              ))}
            </g>
          </svg>
        )}
      </div>
      <Leyenda />
      {/* Resumen textual alternativo (VIS-TOPO-00 B33): no depende del
          canal visual -- útil también como verificación rápida de escala. */}
      <p className="vis-topo-resumen-textual">
        Mostrando {nodosVisibles.length} de {layout.nodos.length} nodos y {aristasVisibles.length} de {layout.aristas.length} tramos.
      </p>
    </section>
  )
}
