// D-δ.51 (§21-§28): la vista principal de M2 pasa de una sucesión de
// tarjetas largas a TABLAS compactas escaneables verticalmente
// (L -> DN -> V -> Pérdida -> Estado). Puramente presentacional: consume
// resolverFilaDeDimensionamiento (view-model), no llama al motor.
//
// Cada fila puede expandirse (progressive disclosure, §28/§29): el
// resumen vive en la primera celda con un <details><summary> NATIVO (se
// conserva por accesibilidad de teclado y para que el harness de fuzz lo
// siga encontrando por `.tabla-tecnica details > summary`), y el CUERPO
// del detalle se renderiza en una FILA PROPIA a ancho completo
// (`<tr class="m2-fila-detalle"><td colSpan>`), no dentro de la celda
// angosta del Tramo -- GEOM-UX-01 §18-§20: antes el árbol de ramales de
// Profesional quedaba comprimido contra el borde izquierdo con media
// tabla vacía a la derecha. El estado de apertura se sincroniza desde el
// evento `toggle` del <details> nativo hacia React (un <details> no puede
// gobernar por CSS la visibilidad de una fila hermana). El cuerpo se
// mantiene SIEMPRE en el DOM (atributo `hidden` cuando está colapsado),
// igual que antes: en Rápido, artefactos + desglose de pérdida +
// estimación localizada; en Profesional, el árbol de Tramos físicos +
// editores de accesorios/tees. El contenido lo provee quien usa la tabla
// (`renderDetalle`).
import { Fragment, useState, type ReactNode } from 'react'
import type { RedDeTramo } from '../../modelo/redHidraulica'
import { ETIQUETA_RED } from './humanizarModulo2'
import { BadgeDeRed } from './BadgeDeRed'
import { resolverCambioDeLongitud } from './resolverResultadoDeTramoParaUi'
import type { EstadoDeFila, FilaDeDimensionamiento } from './resolverFilaDeDimensionamiento'
import type { ControlDeDnDeTramo } from './resolverControlDeDnDeTramo'
import { ControlDeDn } from './ControlDeDn'
import { BadgeVelocidad } from './BadgeVelocidad'

// UI-01C (§33): el estado de la fila como badge compacto. "controlar"
// (CRIT-A24: aceptada en el menor DN comercial) es un estado admisible
// terminal -- badge NEUTRO "DN mínimo", nunca un warning.
function BadgeEstadoDeFila({ estado, texto }: { estado: EstadoDeFila; texto: string }) {
  if (estado === 'ok') {
    return (
      <span className="ui-badge ui-badge--ok" aria-label="Verifica">
        ✓
      </span>
    )
  }
  if (estado === 'controlar') {
    return (
      <span className="ui-badge ui-badge--muted" title="Diámetro comercial mínimo evaluable (CRIT-A24)">
        DN mínimo
      </span>
    )
  }
  return <span className="ui-badge ui-badge--warn">{texto}</span>
}

export type EntradaDeTabla = {
  readonly clave: string
  readonly etiqueta: string
  readonly red: RedDeTramo
  readonly fila: FilaDeDimensionamiento
  // Longitud editable (Rápido) o de solo lectura (Profesional: se edita en
  // el detalle expandible).
  readonly longitudEditable: boolean
  readonly onCambiarLongitud?: ((longitud_m: number | undefined) => void) | undefined
  readonly renderDetalle?: (() => ReactNode) | undefined
  // D-δ.52: control ↓/DN/↑/Auto en la celda DN. Si falta, la celda muestra
  // solo el texto de DN (fila.dnTexto).
  readonly controlDn?: ControlDeDnDeTramo | undefined
  readonly onCambiarDnAdoptado?: ((denominacion: string | undefined) => void) | undefined
  // UI-M2-GROUP-01 (§11/§12): agrupación visual de filas por Local -- AF y
  // AC de un mismo Local ya NO se leen como dos puntos físicos distintos,
  // sino como dos redes del mismo Local. Cuando dos entradas consecutivas
  // comparten `grupo.id` se pinta UN solo encabezado de grupo antes de la
  // primera; NO es un acordeón nuevo (§11: "Local no es otro nivel
  // colapsable en este slice") -- ambas filas quedan igual de visibles y
  // editables que antes, solo con un título compartido arriba. Ausente
  // (undefined) en Distribución general/secundaria y en Segmentos de
  // montante: ahí cada fila sigue siendo su propia entidad, sin cambios.
  // UI-M2-GROUP-02 §2: `nombre` y `meta` separados (no una única cadena
  // concatenada) para poder pintar al Local padre con mayor jerarquía
  // visual (negro/semibold) que su metadato secundario (gris) y que las
  // filas hijas AF/AC.
  readonly grupo?: { readonly id: string; readonly nombre: string; readonly meta?: string } | undefined
}

function CeldaLongitud({ entrada }: { entrada: EntradaDeTabla }) {
  const { fila, longitudEditable, onCambiarLongitud } = entrada
  if (!longitudEditable || onCambiarLongitud === undefined) {
    return <>{fila.longitud_m === undefined ? '—' : `${fila.longitud_m} m`}</>
  }
  return (
    <input
      type="number"
      min={0}
      aria-label={`Longitud [m] de ${entrada.etiqueta} ${ETIQUETA_RED[entrada.red]}`}
      value={fila.longitud_m ?? ''}
      onChange={(evento) => {
        const r = resolverCambioDeLongitud(evento.target.value)
        if (r.tipo === 'omitir') onCambiarLongitud(undefined)
        else if (r.tipo === 'establecer') onCambiarLongitud(r.longitud_m)
      }}
      style={{ width: '4.5rem' }}
    />
  )
}

// Columnas de la tabla -- referenciado por el colSpan de la fila de
// detalle a ancho completo (GEOM-UX-01 §18): Tramo/Local · Red · Longitud
// · DN · V · Pérdida · Estado.
const CANTIDAD_DE_COLUMNAS = 7

export function TablaDimensionamientoDeModulo2({
  entradas,
  encabezadoTramo,
}: {
  entradas: readonly EntradaDeTabla[]
  encabezadoTramo: string
}) {
  // Claves de las filas con el detalle expandido. Se sincroniza desde el
  // evento `toggle` del <details> nativo de cada fila -- el <details> vive
  // en la primera celda pero el cuerpo del detalle se pinta en una fila
  // hermana a ancho completo, que CSS no puede mostrar/ocultar sola.
  const [filasExpandidas, setFilasExpandidas] = useState<ReadonlySet<string>>(() => new Set())

  if (entradas.length === 0) {
    return null
  }

  const alternarFila = (clave: string, abierta: boolean) => {
    setFilasExpandidas((previas) => {
      if (previas.has(clave) === abierta) {
        return previas
      }
      const siguientes = new Set(previas)
      if (abierta) {
        siguientes.add(clave)
      } else {
        siguientes.delete(clave)
      }
      return siguientes
    })
  }

  return (
    <div className="tabla-scroll">
      <table className="tabla-tecnica" style={{ minWidth: '40rem' }}>
        <thead>
          <tr>
            <th>{encabezadoTramo}</th>
            <th>Red</th>
            <th className="col-num">Longitud</th>
            <th className="col-num">DN</th>
            <th className="col-num">V</th>
            <th className="col-num">Pérdida</th>
            <th className="col-estado">Estado</th>
          </tr>
        </thead>
        <tbody>
          {entradas.map((entrada, indice) => {
            const { fila } = entrada
            const tieneDetalle = entrada.renderDetalle !== undefined
            const expandida = filasExpandidas.has(entrada.clave)
            const grupoAnterior = indice === 0 ? undefined : entradas[indice - 1]!.grupo?.id
            const mostrarEncabezadoDeGrupo = entrada.grupo !== undefined && entrada.grupo.id !== grupoAnterior
            return (
              <Fragment key={entrada.clave}>
                {mostrarEncabezadoDeGrupo ? (
                  <tr className="m2-fila-grupo">
                    <td colSpan={CANTIDAD_DE_COLUMNAS}>
                      <span className="m2-fila-grupo__nombre">{entrada.grupo!.nombre}</span>
                      {entrada.grupo!.meta !== undefined ? (
                        <span className="m2-fila-grupo__meta"> · {entrada.grupo!.meta}</span>
                      ) : null}
                    </td>
                  </tr>
                ) : null}
                <tr className={entrada.grupo !== undefined ? 'm2-fila-agrupada' : undefined}>
                  <td>
                    {tieneDetalle ? (
                      <details
                        open={expandida}
                        onToggle={(evento) => alternarFila(entrada.clave, evento.currentTarget.open)}
                      >
                        <summary>
                          {entrada.etiqueta}
                          {fila.nPuntos > 0 ? (
                            <small style={{ opacity: 0.6 }}>
                              {' '}
                              · {fila.nPuntos} {fila.nPuntos === 1 ? 'punto' : 'puntos'}
                            </small>
                          ) : null}
                        </summary>
                      </details>
                    ) : (
                      entrada.etiqueta
                    )}
                  </td>
                  <td>
                    <BadgeDeRed red={entrada.red} />
                  </td>
                  <td className="col-num">
                    <CeldaLongitud entrada={entrada} />
                  </td>
                  <td className="col-dn">
                    {entrada.controlDn !== undefined && entrada.onCambiarDnAdoptado !== undefined ? (
                      <ControlDeDn control={entrada.controlDn} onCambiarDnAdoptado={entrada.onCambiarDnAdoptado} />
                    ) : (
                      fila.dnTexto
                    )}
                  </td>
                  <td className="col-num">
                    <div className="celda-velocidad">
                      <span>{fila.vTexto} m/s</span>
                      <BadgeVelocidad clasificacion={fila.clasificacionVelocidad} />
                    </div>
                  </td>
                  <td className="col-num">{fila.perdidaTotalTexto}</td>
                  <td className="col-estado">
                    <BadgeEstadoDeFila estado={fila.estado} texto={fila.estadoTexto} />
                  </td>
                </tr>
                {tieneDetalle ? (
                  <tr className="m2-fila-detalle" hidden={!expandida}>
                    <td colSpan={CANTIDAD_DE_COLUMNAS}>
                      <div className="m2-fila-detalle__cuerpo">{entrada.renderDetalle!()}</div>
                    </td>
                  </tr>
                ) : null}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
