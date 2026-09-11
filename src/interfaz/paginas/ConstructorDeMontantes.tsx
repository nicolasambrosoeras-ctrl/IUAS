// Constructor de montantes explícitos de Módulo 2 (M2-TOPO-C §7-§18). Vive
// junto a "Distribución secundaria" y permite al proyectista:
//   - crear una identidad de montante eligiendo su red (AF o AC);
//   - por cada montante: renombrarlo, agregarle/quitarle Locales
//     EXISTENTES, ver y editar sus segmentos, y borrarlo.
//
// No hay un segundo modelo hidráulico ni un reconciliador propio en JSX:
// las mutaciones de topología las hace SIEMPRE reconciliarMontante.ts
// (agregarLocalAMontante / quitarLocalDeMontante / borrarMontante) y el
// resultado se aplica con `onCambiar`, que dispara el recálculo completo
// (Qc/DN/V/J/hf/presión) como cualquier otro cambio del Proyecto (§12).
// La identidad se crea/renombra con montantesDelProyecto.ts. Los segmentos
// se muestran con la MISMA tabla y los mismos resolvers que Distribución
// general/secundaria (resolverFilaDeDimensionamiento / resolverControlDeDnDeTramo
// / AccesoriosDeTramoEditor): no hay cálculo propio acá.
import { useEffect, useRef, useState } from 'react'
import type { Proyecto } from '../../modelo/proyecto'
import type { RedDeTramo } from '../../modelo/redHidraulica'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import { ETIQUETA_RED } from './humanizarModulo2'
import { BadgeDeRed } from './BadgeDeRed'
import { TablaDimensionamientoDeModulo2, type EntradaDeTabla } from './TablaDimensionamientoDeModulo2'
import { AccesoriosDeTramoEditor } from './AccesoriosDeTramoEditor'
import { TeeDeNodoEditor } from './TeeDeNodoEditor'
import { resolverFilaDeDimensionamiento } from './resolverFilaDeDimensionamiento'
import { resolverControlDeDnDeTramo } from './resolverControlDeDnDeTramo'
import { resolverResultadoDeTramoParaUi } from './resolverResultadoDeTramoParaUi'
import { conDnComercialAdoptadoDeTramo, conLongitudDeTramo } from './actualizarRedHidraulica'
import { agregarLocalAMontante, borrarMontante, quitarLocalDeMontante } from './reconciliarMontante'
import {
  conMontanteNuevo,
  conNombreDeMontante,
  derivacionesDeMontante,
  interpretarResultadoDeMontante,
  localesOfreciblesParaMontante,
  proyectarMontante,
  type MontanteProyectado,
} from './montantesDelProyecto'
import { elegirElementoActivoTrasCambio } from './estadoDeElementoActivo'
import './constructorDeMontantes.css'

// Segmentos de un montante como filas de la tabla de dimensionamiento de
// M2 -- misma construcción que DistribucionSecundaria, aplicada a los
// Tramos con `montanteId` de esta identidad. La etiqueta es "Segmento N"
// (1-based, en orden origen -> punta): NUNCA el id técnico del Tramo.
function entradasDeSegmentos(
  proyecto: Proyecto,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  montante: MontanteProyectado,
  onCambiar: (proyecto: Proyecto) => void,
): EntradaDeTabla[] {
  const modoDetallado = proyecto.configuracionHidraulica.metodoPerdidaLocalizada === 'detallado'
  return montante.segmentos.map((segmento) => ({
    clave: segmento.tramoId,
    etiqueta: `Segmento ${segmento.orden + 1}`,
    red: montante.red,
    fila: resolverFilaDeDimensionamiento(proyecto, segmento.tramoId, catalogoArtefactos),
    longitudEditable: true,
    onCambiarLongitud: (longitud_m) => onCambiar(conLongitudDeTramo(proyecto, segmento.tramoId, longitud_m)),
    controlDn: resolverControlDeDnDeTramo(proyecto, segmento.tramoId, catalogoArtefactos),
    onCambiarDnAdoptado: (denominacion) =>
      onCambiar(conDnComercialAdoptadoDeTramo(proyecto, segmento.tramoId, denominacion)),
    renderDetalle: modoDetallado
      ? () => (
          <AccesoriosDeTramoEditor
            proyecto={proyecto}
            tramoId={segmento.tramoId}
            velocidadReal_mps={
              resolverResultadoDeTramoParaUi(proyecto, segmento.tramoId, catalogoArtefactos).velocidadReal_mps
            }
            onCambiar={onCambiar}
          />
        )
      : undefined,
  }))
}

// UI-M2-GROUP-01 (§13-§16): header SIEMPRE montado (aunque el montante esté
// colapsado) -- resumen barato derivado de `proyectarMontante` (misma
// proyección que ya se calculaba siempre en la versión anterior, no agrega
// costo). El nombre/badge/resumen son de solo lectura acá: renombrar y
// borrar quedan en el cuerpo expandido (§19, acción secundaria, no
// dominante). `<button>` real con `aria-expanded` (§34).
function MontanteCardCabecera({
  proyecto,
  montanteId,
  activo,
  onAbrir,
}: {
  proyecto: Proyecto
  montanteId: string
  activo: boolean
  onAbrir: () => void
}) {
  const proyeccion = proyectarMontante(proyecto, montanteId)
  if (proyeccion === undefined) {
    return null
  }
  const nombre = proyecto.montantes?.find((m) => m.id === montanteId)?.nombre ?? proyeccion.nombreFallback
  const cantidadLocales = proyeccion.localesServidos.length
  const cantidadSegmentos = proyeccion.segmentos.length

  return (
    <button type="button" className="montante-card__cabecera-toggle" aria-expanded={activo} onClick={onAbrir}>
      <span className="montante-card__flecha" aria-hidden="true">
        {activo ? '▼' : '▶'}
      </span>
      <span className="montante-card__cabecera-nombre">{nombre}</span>
      <BadgeDeRed red={proyeccion.red} />
      <span className="montante-card__cabecera-resumen">
        {cantidadLocales} {cantidadLocales === 1 ? 'local' : 'locales'} · {cantidadSegmentos}{' '}
        {cantidadSegmentos === 1 ? 'segmento' : 'segmentos'}
      </span>
    </button>
  )
}

// Cuerpo del montante -- solo se monta cuando el montante está activo
// (§16, unmount real): Locales alimentados, Segmentos y Derivaciones (Tee)
// no existen en el DOM mientras el montante está colapsado.
function MontanteCardCuerpo({
  proyecto,
  catalogoArtefactos,
  montanteId,
  onCambiar,
}: {
  proyecto: Proyecto
  catalogoArtefactos: readonly ArtefactoNormativo[]
  montanteId: string
  onCambiar: (proyecto: Proyecto) => void
}) {
  const [aviso, setAviso] = useState<string | null>(null)
  const proyeccion = proyectarMontante(proyecto, montanteId)
  if (proyeccion === undefined) {
    return null
  }

  // Aplica el resultado de un comando del motor: muta + limpia aviso, o
  // muestra el copy humano sin tocar el estado, o no-op silencioso (§13).
  function aplicar(resultado: ReturnType<typeof agregarLocalAMontante>) {
    const interpretacion = interpretarResultadoDeMontante(resultado)
    if (interpretacion.proyecto !== null) {
      setAviso(null)
      onCambiar(interpretacion.proyecto)
      return
    }
    setAviso(interpretacion.aviso)
  }

  const ofrecibles = localesOfreciblesParaMontante(proyecto, montanteId)
  const entradas = entradasDeSegmentos(proyecto, catalogoArtefactos, proyeccion, onCambiar)

  return (
    <div className="montante-card__cuerpo">
      <div className="montante-card__editar">
        <label className="montante-card__campo-nombre">
          Nombre:{' '}
          <input
            className="montante-card__nombre"
            type="text"
            value={proyecto.montantes?.find((m) => m.id === montanteId)?.nombre ?? ''}
            placeholder={proyeccion.nombreFallback}
            aria-label={`Nombre del ${proyeccion.nombreFallback}`}
            onChange={(evento) => onCambiar(conNombreDeMontante(proyecto, montanteId, evento.target.value))}
          />
        </label>
        <button
          type="button"
          className="ui-btn--fantasma montante-card__borrar"
          onClick={() => aplicar(borrarMontante(proyecto, montanteId))}
        >
          Borrar montante
        </button>
      </div>

      <section className="montante-card__seccion">
        <h4>Locales alimentados</h4>
        {proyeccion.localesServidos.length === 0 ? (
          <p className="montante-card__vacio">Sin Locales asignados</p>
        ) : (
          <ul className="montante-card__locales">
            {proyeccion.localesServidos.map((servido) => (
              <li key={`${servido.unidadFuncionalId}:${servido.localId}`}>
                <span>{servido.etiqueta}</span>
                <button
                  type="button"
                  className="ui-btn--fantasma"
                  onClick={() =>
                    aplicar(
                      quitarLocalDeMontante(proyecto, montanteId, servido.unidadFuncionalId, servido.localId),
                    )
                  }
                >
                  Quitar
                </button>
              </li>
            ))}
          </ul>
        )}
        <AgregarLocal
          nombreMontante={proyeccion.nombreFallback}
          ofrecibles={ofrecibles}
          tieneLocalesAsignados={proyeccion.localesServidos.length > 0}
          onAgregar={(ufId, localId) => aplicar(agregarLocalAMontante(proyecto, montanteId, ufId, localId))}
        />
      </section>

      <section className="montante-card__seccion">
        <h4>Segmentos</h4>
        {entradas.length === 0 ? (
          <p className="montante-card__vacio">Todavía sin segmentos — se crean al agregar el primer Local.</p>
        ) : (
          <TablaDimensionamientoDeModulo2 entradas={entradas} encabezadoTramo="Segmento" />
        )}
      </section>

      {proyecto.configuracionHidraulica.metodoPerdidaLocalizada === 'detallado' ? (
        <DerivacionesDeMontante proyecto={proyecto} montanteId={montanteId} onCambiar={onCambiar} />
      ) : null}

      {aviso !== null ? (
        <p className="montante-card__aviso ui-callout ui-callout--warn" role="alert">
          {aviso}
        </p>
      ) : null}
    </div>
  )
}

// Contenedor: cabecera SIEMPRE montada, cuerpo SOLO si `activo` (§16).
function MontanteCard({
  proyecto,
  catalogoArtefactos,
  montanteId,
  activo,
  onAbrir,
  onCambiar,
}: {
  proyecto: Proyecto
  catalogoArtefactos: readonly ArtefactoNormativo[]
  montanteId: string
  activo: boolean
  onAbrir: () => void
  onCambiar: (proyecto: Proyecto) => void
}) {
  return (
    <article className="montante-card ui-card">
      <MontanteCardCabecera proyecto={proyecto} montanteId={montanteId} activo={activo} onAbrir={onAbrir} />
      {activo ? (
        <MontanteCardCuerpo
          proyecto={proyecto}
          catalogoArtefactos={catalogoArtefactos}
          montanteId={montanteId}
          onCambiar={onCambiar}
        />
      ) : null}
    </article>
  )
}

// Derivaciones (tees) del montante -- M2-TOPO-D. Sólo en modo Detalladas:
// la geometría de tee alimenta exclusivamente `metodoPerdidaLocalizada =
// 'detallado'` (§8). El modo Estimadas no lee `Nodo.tee` y no debe pedir
// estas elecciones. Cada nodo de derivación físico tiene su propia
// `Nodo.tee` (§16): no hay una configuración global de montante.
function DerivacionesDeMontante({
  proyecto,
  montanteId,
  onCambiar,
}: {
  proyecto: Proyecto
  montanteId: string
  onCambiar: (proyecto: Proyecto) => void
}) {
  const derivaciones = derivacionesDeMontante(proyecto, montanteId)
  if (derivaciones.length === 0) {
    return null
  }
  return (
    <section className="montante-card__seccion montante-card__derivaciones">
      <h4>Derivaciones</h4>
      {derivaciones.map((derivacion) => (
        <div className="montante-card__derivacion" key={derivacion.nodoId}>
          <p className="montante-card__derivacion-titulo">Derivación {derivacion.orden}</p>
          {derivacion.tipo === 'bifurcacion' ? (
            <TeeDeNodoEditor
              proyecto={proyecto}
              nodoDeBifurcacion={{
                nodoId: derivacion.nodoId,
                tramoEntranteId: derivacion.tramoEntranteId,
                tramosSalientesIds: derivacion.tramosSalientesIds,
              }}
              etiquetasDeSalida={derivacion.etiquetasDeSalida}
              onCambiar={onCambiar}
            />
          ) : (
            <p className="montante-card__derivacion-nota">
              Esta derivación reparte hacia {derivacion.cantidadSalidas} salidas
              {derivacion.etiquetasDeSalida.length > 0
                ? ` (${derivacion.etiquetasDeSalida.join(', ')})`
                : ''}
              . La configuración detallada de tee cubre sólo bifurcaciones de dos salidas; en una
              derivación múltiple su pérdida localizada no se modela todavía, así que en Detalladas
              la verificación de presión de esos Locales queda incompleta (limitación conocida — las
              cotas de los Locales se pueden separar para que cada nivel sea una bifurcación simple).
            </p>
          )}
        </div>
      ))}
    </section>
  )
}

function AgregarLocal({
  nombreMontante,
  ofrecibles,
  tieneLocalesAsignados,
  onAgregar,
}: {
  nombreMontante: string
  ofrecibles: ReturnType<typeof localesOfreciblesParaMontante>
  tieneLocalesAsignados: boolean
  onAgregar: (unidadFuncionalId: string, localId: string) => void
}) {
  if (ofrecibles.length === 0) {
    // UI-M2-GROUP-01 (§18): copy distinto según si el montante YA tiene
    // Locales asignados (agotó candidatos -- mensaje compacto) o si nunca
    // tuvo ninguno (explicación completa, útil para entender por qué).
    if (tieneLocalesAsignados) {
      return <p className="montante-card__vacio">Sin más locales disponibles</p>
    }
    return (
      <p className="montante-card__vacio">
        No hay Locales disponibles para este montante. Los Locales se crean en la Demanda; cada Local
        puede pertenecer a un solo montante por red.
      </p>
    )
  }
  return (
    <label className="montante-card__agregar">
      + Agregar local:{' '}
      <select
        aria-label={`Agregar Local al ${nombreMontante}`}
        value=""
        onChange={(evento) => {
          const elegido = ofrecibles.find(
            (candidato) => `${candidato.unidadFuncionalId}:${candidato.localId}` === evento.target.value,
          )
          if (elegido !== undefined) {
            onAgregar(elegido.unidadFuncionalId, elegido.localId)
          }
        }}
      >
        <option value="">— Elegí un Local… —</option>
        {ofrecibles.map((ofrecible) => (
          <option
            key={`${ofrecible.unidadFuncionalId}:${ofrecible.localId}`}
            value={`${ofrecible.unidadFuncionalId}:${ofrecible.localId}`}
          >
            {ofrecible.etiqueta}
          </option>
        ))}
      </select>
    </label>
  )
}

// UI-M2-GROUP-01 (§13-§17): "+ Agregar montante" se movió al encabezado de
// la sección (§17, no obliga a recorrer todos los montantes existentes) y
// cada montante pasa a header compacto colapsable con UN montante activo
// por vez (§15), igual que las Unidades Funcionales (misma lógica de
// selección: elegirElementoActivoTrasCambio). El nuevo montante queda
// activo/expandido apenas se crea (§17, preserva FIX-MONTANTE-ADD-01: se
// sigue aplicando `onCambiar` con el resultado de `conMontanteNuevo` sin
// tocar su firma).
export function ConstructorDeMontantes({
  proyecto,
  catalogoArtefactos,
  onCambiar,
}: {
  proyecto: Proyecto
  catalogoArtefactos: readonly ArtefactoNormativo[]
  onCambiar: (proyecto: Proyecto) => void
}) {
  const [eligiendoRed, setEligiendoRed] = useState(false)
  const montantesRaw = proyecto.montantes
  const montantes = montantesRaw ?? []
  // UI-M2-GROUP-02 §1: 0 o 1 montante activo -- onAbrir (abajo) alterna, no
  // sólo abre; es válido que ningún montante quede desarrollado.
  const [montanteActivoId, setMontanteActivoId] = useState<string | undefined>(() => montantes[0]?.id)
  const idsAnterioresRef = useRef<readonly string[]>(montantes.map((m) => m.id))

  // Depende de la referencia CRUDA de `proyecto.montantes` (puede ser
  // undefined) -- por eso el array de ids también se deriva de esa
  // referencia DENTRO del efecto (no de `montantes`, que con el `?? []` de
  // fallback crearía un array nuevo en cada render y dispararía este
  // efecto siempre).
  useEffect(() => {
    const idsActuales = (montantesRaw ?? []).map((m) => m.id)
    const idsAnteriores = idsAnterioresRef.current
    idsAnterioresRef.current = idsActuales
    setMontanteActivoId((activo) => elegirElementoActivoTrasCambio(idsAnteriores, idsActuales, activo))
  }, [montantesRaw])

  function crear(red: RedDeTramo) {
    setEligiendoRed(false)
    const resultado = conMontanteNuevo(proyecto, red)
    setMontanteActivoId(resultado.montanteId)
    onCambiar(resultado.proyecto)
  }

  return (
    <section className="constructor-montantes">
      <div className="constructor-montantes__header">
        <h3>Montantes</h3>
        {eligiendoRed ? (
          <div className="constructor-montantes__eleccion" role="group" aria-label="Red del montante nuevo">
            <span>Red del montante:</span>
            <button type="button" onClick={() => crear('AF')}>
              {ETIQUETA_RED.AF}
            </button>
            <button type="button" onClick={() => crear('AC')}>
              {ETIQUETA_RED.AC}
            </button>
            <button type="button" className="ui-btn--fantasma" onClick={() => setEligiendoRed(false)}>
              Cancelar
            </button>
          </div>
        ) : (
          <button type="button" className="constructor-montantes__agregar" onClick={() => setEligiendoRed(true)}>
            + Agregar montante
          </button>
        )}
      </div>

      <p className="constructor-montantes__intro">
        <small>
          Un montante agrupa los segmentos verticales que alimentan varios Locales por una misma red.
          Su identidad (red y nombre) es lo único que se guarda: los segmentos y los Locales servidos
          se derivan de la topología y se recalculan solos.
        </small>
      </p>

      {montantes.length === 0 ? (
        <p className="constructor-montantes__vacio">Todavía no hay montantes explícitos.</p>
      ) : (
        <div className="constructor-montantes__lista">
          {montantes.map((montante) => (
            <MontanteCard
              key={montante.id}
              proyecto={proyecto}
              catalogoArtefactos={catalogoArtefactos}
              montanteId={montante.id}
              activo={montante.id === montanteActivoId}
              onAbrir={() =>
                setMontanteActivoId((activo) => (activo === montante.id ? undefined : montante.id))
              }
              onCambiar={onCambiar}
            />
          ))}
        </div>
      )}
    </section>
  )
}
