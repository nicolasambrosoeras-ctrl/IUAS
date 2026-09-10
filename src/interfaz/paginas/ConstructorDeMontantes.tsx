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
import { useState } from 'react'
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

function MontanteCard({
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
    <article className="montante-card ui-card">
      <header className="montante-card__cabecera">
        <input
          className="montante-card__nombre"
          type="text"
          value={proyecto.montantes?.find((m) => m.id === montanteId)?.nombre ?? ''}
          placeholder={proyeccion.nombreFallback}
          aria-label={`Nombre del ${proyeccion.nombreFallback}`}
          onChange={(evento) => onCambiar(conNombreDeMontante(proyecto, montanteId, evento.target.value))}
        />
        <BadgeDeRed red={proyeccion.red} />
        <button
          type="button"
          className="ui-btn--fantasma montante-card__borrar"
          onClick={() => aplicar(borrarMontante(proyecto, montanteId))}
        >
          Borrar montante
        </button>
      </header>

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
  onAgregar,
}: {
  nombreMontante: string
  ofrecibles: ReturnType<typeof localesOfreciblesParaMontante>
  onAgregar: (unidadFuncionalId: string, localId: string) => void
}) {
  if (ofrecibles.length === 0) {
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
  const montantes = proyecto.montantes ?? []

  function crear(red: RedDeTramo) {
    setEligiendoRed(false)
    onCambiar(conMontanteNuevo(proyecto, red).proyecto)
  }

  return (
    <section className="constructor-montantes">
      <h3>Montantes</h3>
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
              onCambiar={onCambiar}
            />
          ))}
        </div>
      )}

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
    </section>
  )
}
