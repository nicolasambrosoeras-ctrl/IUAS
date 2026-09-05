// Editor de Tramo.accesorios (CRIT-A26/A28/A30, modo detallado de D-δ.40):
// única superficie de UI que persiste el subconjunto de Tabla N°7
// declarable sobre un Tramo. No calcula Ks ni pérdida localizada -- solo
// persiste tipo+cantidad (el contrato real de AccesorioDeTramo); Ks se
// resuelve siempre desde Tabla N°7 en el motor, nunca se persiste ni se
// edita acá. Distingue explícitamente "no relevado" (undefined, botón
// para empezar a relevar) de "relevado, sin accesorios de este
// subconjunto" ([], lista vacía real) -- mismo contrato que el resto del
// modelo (D-δ.33): nunca se asume [] por defecto.
import type { Proyecto } from '../../modelo/proyecto'
import { idsAccesorioDeTramo, type AccesorioDeTramo, type IdAccesorioDeTramo } from '../../modelo/redHidraulica'
import { tabla07PerdidasLocalizadas } from '../../normativa/eras-2023/tabla-07-perdidas-localizadas'
import { resolverPerdidaLocalizadaDeTramo } from '../../motor/tuberias/perdidaCarga/resolverPerdidaLocalizadaDeTramo'
import { formatearNumero } from '../../exportadores/pdf/formatearNumero'
import { conAccesoriosDeTramo } from './actualizarRedHidraulica'

// Reutiliza el nombre ya adoptado en Tabla N°7 (normativa) -- nunca un
// texto propio de UI que pudiera desincronizarse.
export function nombreDeAccesorio(id: IdAccesorioDeTramo): string {
  const fila = tabla07PerdidasLocalizadas.find((candidata) => candidata.id === id)
  return fila?.nombre ?? id
}

export function AccesoriosDeTramoEditor({
  proyecto,
  tramoId,
  velocidadReal_mps,
  onCambiar,
}: {
  proyecto: Proyecto
  tramoId: string
  // undefined = el Tramo no tiene velocidad real resuelta todavía (ver
  // FilaResultado) -- el editor sigue permitiendo declarar accesorios
  // (persistencia no depende del cálculo), pero no puede mostrar la
  // pérdida localizada resultante hasta que haya una V real.
  velocidadReal_mps: number | undefined
  onCambiar: (proyecto: Proyecto) => void
}) {
  const tramo = proyecto.redHidraulica?.tramos.find((candidato) => candidato.id === tramoId)
  if (tramo === undefined) {
    return null
  }
  const { accesorios } = tramo

  if (accesorios === undefined) {
    return (
      <div>
        <small>Accesorios (Tabla N°7) no relevados todavía para este tramo.</small>{' '}
        <button type="button" onClick={() => onCambiar(conAccesoriosDeTramo(proyecto, tramoId, []))}>
          Relevar accesorios
        </button>
      </div>
    )
  }

  // Reasignado a un nuevo const para que TypeScript conserve el
  // angostamiento (accesorios!==undefined) dentro de las funciones
  // anidadas de más abajo.
  const accesoriosRelevados: readonly AccesorioDeTramo[] = accesorios

  const disponibles = idsAccesorioDeTramo.filter((id) => !accesoriosRelevados.some((accesorio) => accesorio.tipo === id))
  const resultadoLocalizada =
    velocidadReal_mps !== undefined ? resolverPerdidaLocalizadaDeTramo(accesoriosRelevados, velocidadReal_mps) : undefined

  function conCantidad(indice: number, cantidad: number): readonly AccesorioDeTramo[] {
    return accesoriosRelevados.map((accesorio, i) => (i === indice ? { ...accesorio, cantidad } : accesorio))
  }

  function sinAccesorio(indice: number): readonly AccesorioDeTramo[] {
    return accesoriosRelevados.filter((_accesorio, i) => i !== indice)
  }

  return (
    <div>
      {accesorios.length === 0 ? (
        <small>Relevado: sin accesorios de este subconjunto en este tramo.</small>
      ) : (
        <table style={{ borderCollapse: 'collapse' }}>
          <tbody>
            {accesorios.map((accesorio, indice) => (
              <tr key={accesorio.tipo}>
                <td style={{ padding: '0.1rem 0.5rem 0.1rem 0' }}>{nombreDeAccesorio(accesorio.tipo)}</td>
                <td style={{ padding: '0.1rem 0.5rem' }}>
                  ×{' '}
                  <input
                    type="number"
                    min={1}
                    value={accesorio.cantidad}
                    onChange={(evento) => {
                      const cantidad = Number(evento.target.value)
                      if (!Number.isFinite(cantidad) || cantidad < 1) {
                        return
                      }
                      onCambiar(conAccesoriosDeTramo(proyecto, tramoId, conCantidad(indice, cantidad)))
                    }}
                    style={{ width: '3.5rem' }}
                  />
                </td>
                <td style={{ padding: '0.1rem 0' }}>
                  <button type="button" onClick={() => onCambiar(conAccesoriosDeTramo(proyecto, tramoId, sinAccesorio(indice)))}>
                    Eliminar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {disponibles.length > 0 ? (
        <label>
          <small>+ Agregar accesorio: </small>
          <select
            value=""
            onChange={(evento) => {
              const tipo = evento.target.value as IdAccesorioDeTramo | ''
              if (tipo === '') {
                return
              }
              onCambiar(conAccesoriosDeTramo(proyecto, tramoId, [...accesorios, { tipo, cantidad: 1 }]))
            }}
          >
            <option value="">— seleccionar —</option>
            {disponibles.map((id) => (
              <option key={id} value={id}>
                {nombreDeAccesorio(id)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {resultadoLocalizada !== undefined && resultadoLocalizada.tipo === 'calculada' ? (
        <p>
          <small>Pérdida localizada de este tramo (accesorios, sin tee): {formatearNumero(resultadoLocalizada.hf_m, 'm')}</small>
        </p>
      ) : null}
    </div>
  )
}
