// UI-01A (D-δ.72) — Navegación lateral / índice de la one-page y wrapper
// de sección. El índice en sí es PRESENTACIÓN pura: no toca el Proyecto,
// no ejecuta resolvers, no participa de ningún cálculo. La sidebar es un
// índice con anchors (`<a href="#...">`), NO un router: no cambia de
// ruta ni desmonta módulos; todas las etapas permanecen montadas.
//
// VIS-TOPO-01B (§6): esta barra también aloja el panel chico y
// contraído del Esquema hidráulico (`PanelEsquemaHidraulicoSidebar`),
// debajo del índice -- ese panel SÍ deriva del Proyecto (vía
// resolverGrafoVisual/layoutGrafoVisual), pero delega esa lógica
// enteramente a EsquemaHidraulico.tsx: este archivo sigue sin ejecutar
// ningún resolver por su cuenta, sólo compone dónde vive el panel.
import { useEffect, useState, type ReactNode } from 'react'
import { EncabezadoDeEtapa } from './EncabezadoDeEtapa'
import { ResumenDeProyectoPanel } from './ResumenDeProyecto'
import type { ResumenDeProyecto } from './resolverResumenDeProyecto'
import type { Proyecto } from '../../modelo/proyecto'
import { PanelEsquemaHidraulicoSidebar } from './EsquemaHidraulico'

// Las cinco etapas del flujo de trabajo del proyectista (UI-CRIT-01):
// Demanda → Tuberías → Medidores → Abastecimiento → Verificación
// hidráulica. La verificación es la etapa 5 del flujo, pero sigue
// perteneciendo funcionalmente al dominio de Módulo 2 (integra M2 + M3 +
// M4); NO existe un "Módulo 5".
//
// UI-01B (D-δ.73): el índice se agrupa visualmente en PROYECTO (etapas
// 1–4, el dimensionamiento) y VERIFICACIÓN (etapa 5, la conclusión del
// flujo). Es sólo jerarquía de presentación: no cambia el orden, los
// anchors ni la cantidad de destinos.
const SECCIONES: readonly {
  readonly id: string
  readonly numero: number
  readonly etiqueta: string
  readonly grupo: string
}[] = [
  { id: 'demanda', numero: 1, etiqueta: 'Demanda', grupo: 'Proyecto' },
  { id: 'tuberias', numero: 2, etiqueta: 'Tuberías', grupo: 'Proyecto' },
  { id: 'medidores', numero: 3, etiqueta: 'Medidores', grupo: 'Proyecto' },
  { id: 'abastecimiento', numero: 4, etiqueta: 'Abastecimiento y reserva', grupo: 'Proyecto' },
  { id: 'verificacion-hidraulica', numero: 5, etiqueta: 'Verificación hidráulica', grupo: 'Verificación' },
]

// "1" -> "01": el número de etapa se alinea como metadato tabular en el
// índice y en los encabezados de etapa (sección 13 del brief).
function numeroDeEtapa(numero: number): string {
  return String(numero).padStart(2, '0')
}

// Sección actualmente en viewport, para resaltar su entrada en el índice.
// Estado de PRESENTACIÓN (no se persiste, no alimenta ningún cálculo).
// Degrada de forma limpia: si no hay IntersectionObserver (SSR, tests),
// devuelve null y el índice simplemente no resalta ninguna entrada.
function useSeccionActiva(ids: readonly string[]): string | null {
  const [activa, setActiva] = useState<string | null>(null)

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      return
    }
    const observador = new IntersectionObserver(
      (entradas) => {
        const primeraVisible = entradas
          .filter((entrada) => entrada.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0]
        if (primeraVisible !== undefined) {
          setActiva(primeraVisible.target.id)
        }
      },
      // La sección "activa" es la que ocupa la banda superior del viewport.
      { rootMargin: '0px 0px -65% 0px', threshold: 0 },
    )
    const nodos = ids
      .map((id) => document.getElementById(id))
      .filter((nodo): nodo is HTMLElement => nodo !== null)
    nodos.forEach((nodo) => observador.observe(nodo))
    return () => observador.disconnect()
  }, [ids])

  return activa
}

// Al cargar la página con un ancla (`/#verificacion-hidraulica`, un
// bookmark o un refresh), el navegador intenta el salto nativo antes de
// que React haya montado la sección y no reintenta. Este efecto lo repite
// una vez, ya con el DOM presente. Sólo en el montaje: después manda la
// navegación nativa por anchors.
function useSaltoInicialAlAncla(): void {
  useEffect(() => {
    if (typeof window === 'undefined' || window.location.hash.length <= 1) {
      return
    }
    const id = decodeURIComponent(window.location.hash.slice(1))
    // Dos frames de margen: al montar, los paneles de M3/M4/verificación
    // todavía están asentando su layout y la sección aún se desplaza. Se
    // salta cuando ya paró de moverse.
    let frame2 = 0
    const frame1 = requestAnimationFrame(() => {
      frame2 = requestAnimationFrame(() => {
        document.getElementById(id)?.scrollIntoView({ block: 'start' })
      })
    })
    return () => {
      cancelAnimationFrame(frame1)
      cancelAnimationFrame(frame2)
    }
  }, [])
}

export function NavegacionDeSecciones({
  resumen,
  proyecto,
}: {
  resumen?: ResumenDeProyecto | undefined
  // VIS-TOPO-01B: sólo para montar el panel chico y contraído del
  // Esquema hidráulico DEBAJO de este índice (§6). Ausente => la
  // navegación se comporta exactamente igual que antes, sin panel
  // (defensivo -- todos los llamadores reales pasan `proyecto`).
  proyecto?: Proyecto | undefined
}) {
  const activa = useSeccionActiva(SECCIONES.map((seccion) => seccion.id))
  useSaltoInicialAlAncla()

  return (
    <nav className="app-nav" aria-label="Secciones del proyecto">
      <ol>
        {SECCIONES.map((seccion, indice) => {
          const abreGrupo = indice === 0 || SECCIONES[indice - 1]?.grupo !== seccion.grupo
          return (
            <li key={seccion.id}>
              {abreGrupo ? (
                <span className="app-nav-grupo" aria-hidden="true">
                  {seccion.grupo}
                </span>
              ) : null}
              <a href={`#${seccion.id}`} aria-current={activa === seccion.id ? 'true' : undefined}>
                <span className="app-nav-num">{numeroDeEtapa(seccion.numero)}</span>
                {seccion.etiqueta}
              </a>
            </li>
          )
        })}
      </ol>
      {/* Resumen compacto del proyecto (UI-01C §23): consume resultados
          existentes vía `resolverResumenDeProyecto`; no calcula ni
          persiste nada. Se oculta en la barra horizontal (≤ 900 px). */}
      {resumen !== undefined ? <ResumenDeProyectoPanel resumen={resumen} /> : null}
      {/* VIS-TOPO-01B §6: panel chico, contraído por defecto, debajo del
          índice + resumen -- visible sólo en el rango de viewport donde
          esta barra ES la sidebar (> 900px, esquemaHidraulico.css). En
          mobile no ocupa lugar acá: el acceso es el botón "Visualizar
          esquema" dentro del cuerpo de M2 (ResultadoHidraulicoDeTramo.tsx). */}
      {proyecto !== undefined ? <PanelEsquemaHidraulicoSidebar proyecto={proyecto} /> : null}
    </nav>
  )
}

// Wrapper de una etapa del flujo: sólo aporta el anchor estable (`id`), un
// nombre accesible y el `scroll-margin-top` (vía la clase CSS). NO impone
// un encabezado: los paneles de M1–M4 ya traen su propio <h2> (vía
// EncabezadoDeEtapa dentro de su <summary>). Para la etapa 5 (que envuelve
// un panel sin <h2> propio) se pasa `numero` + `titulo` y este wrapper
// renderiza el mismo patrón de cabecera de etapa (sección 13 del brief).
export function SeccionDeTrabajo({
  id,
  nombreAccesible,
  numero,
  titulo,
  descripcion,
  children,
}: {
  id: string
  nombreAccesible: string
  numero?: number
  titulo?: string
  descripcion?: string
  children: ReactNode
}) {
  return (
    <section id={id} className="seccion-de-trabajo" aria-label={nombreAccesible}>
      {numero !== undefined && titulo !== undefined ? (
        <div className="etapa-cabecera etapa-cabecera--final">
          <EncabezadoDeEtapa numero={numero} titulo={titulo} descripcion={descripcion} />
        </div>
      ) : titulo !== undefined ? (
        <>
          <h2>{titulo}</h2>
          {descripcion !== undefined ? (
            <p>
              <small>{descripcion}</small>
            </p>
          ) : null}
        </>
      ) : null}
      {children}
    </section>
  )
}
