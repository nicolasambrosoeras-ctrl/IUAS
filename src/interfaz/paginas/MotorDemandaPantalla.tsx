// Primera pantalla técnica editable del Motor de Demanda (integración,
// Fase 1). Proyecto inicial = vivienda unifamiliar de ejemplo (no un caso
// Golden -- G1 y G2 siguen existiendo exclusivamente en CASOS-GOLDEN.md y
// sus tests), pensado para que se reconozca de un vistazo. Todos los
// campos son editables: coeficiente a, unidades funcionales, locales y
// artefactos. Gate de validación antes de calcular, y visualización
// completa del ResultadoDeCalculo. No recalcula: solo llama a
// validarProyecto y calcularSimultaneidad y muestra lo que devuelven.
import { useState } from 'react'
import type { Proyecto, UnidadFuncional, Local, TipoDeLocal, RegimenLocal, Artefacto } from '../../modelo/proyecto'
import type { RedDeTramo } from '../../modelo/redHidraulica'
import type { ResultadoDeCalculo, Paso, ValorCalculado } from '../../modelo/resultado'
import type { ProblemaValidacion, CodigoValidacion, AlcanceValidacion } from '../../validacion'
import { validarProyecto, erroresQueBloqueanLaDemanda, erroresDeModulosPosteriores } from '../../validacion'
import { calcularSimultaneidad } from '../../motor/demanda/simultaneidad/calcularSimultaneidad'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion, type TipoDeProyecto } from '../../normativa/eras-2023/coeficientes-mayoracion'
import { catalogoSistemasDeTuberia } from '../../motor/tuberias/sistemaDeTuberia'
import { formatearNumero } from '../../exportadores/pdf/formatearNumero'
import { generarDocumentoPdf } from '../../exportadores/pdf/generarDocumentoPdf'
import {
  formulaSimbolica,
  sustitucionNumerica,
  textoValorCalculado,
} from '../../presentacion/desarrolloDelCalculoDemanda'
import { duplicarUnidadFuncionalEnProyecto } from './duplicarUnidadFuncional'
import { generarId } from './generarId'
import { backfillLongitudesDePredimensionamiento } from './backfillLongitudesDePredimensionamiento'
import {
  sincronizarConectividadFisicaDeArtefacto,
  sincronizarConectividadFisicaDeArtefactoConRedesDeclaradas,
} from './sincronizarConectividadFisicaDeArtefacto'
import { determinarRedesFisicasPorPrecedente } from '../../motor/tuberias/topologia/determinarRedesFisicasPorPrecedente'
import { quitarConectividadFisicaDeArtefacto } from './quitarConectividadFisicaDeArtefacto'
import { reconciliarConectividadFisicaPorCambioDeArtefacto } from './reconciliarConectividadFisicaPorCambioDeArtefacto'
import { quitarConectividadFisicaDeLocal } from './quitarConectividadFisicaDeLocal'
import { quitarConectividadFisicaDeUnidadFuncional } from './quitarConectividadFisicaDeUnidadFuncional'
import { ResultadoHidraulicoDeTramo } from './ResultadoHidraulicoDeTramo'
import { PanelDeMedidoresDeModulo3 } from './PanelDeMedidoresDeModulo3'
import { PanelDeModulo4 } from './PanelDeModulo4'
import { PanelDePresionDeModulo2 } from './PanelDePresionDeModulo2'
import { NavegacionDeSecciones, SeccionDeTrabajo } from './NavegacionDeSecciones'
import { MetodologiaYFuentesTecnicas } from './MetodologiaYFuentesTecnicas'
import { resolverResumenDeProyecto } from './resolverResumenDeProyecto'
import './sistema-visual.css'
import './navegacionUI.css'
import './demandaM1.css'
import { parsearCota } from './parsearCota'
import { calcularCotaHidraulicaDefaultDeNivel, nombreDeNivel } from './nivelUnidadFuncional'
import { resumenDeUnidadFuncional } from './resumenDeUnidadFuncional'
import { sugerirArtefactoParaLocal } from './sugerenciaDeArtefacto'
import { SelectorDeModoDeTrabajo } from './SelectorDeModoDeTrabajo'
import { proyectoInicial } from './proyectoDeEjemplo'

const TIPOS_DE_LOCAL: readonly TipoDeLocal[] = [
  'bano',
  'toilette',
  'cocina',
  'lavadero',
  'cochera',
  'jardin',
  'otros',
]

const REGIMENES_DE_LOCAL: readonly RegimenLocal[] = ['domiciliario', 'noDomiciliario']

// Rango de niveles ofrecido por el <select> (D-δ.46): puramente de
// presentación -- UnidadFuncional.nivel sigue siendo un `number` sin
// límite (nunca una unión cerrada, ver modelo/proyecto). 0..15 cubre
// cualquier edificio típico; si el nivel actual ya supera ese rango
// (dato cargado por otra vía), se extiende para incluirlo siempre --
// el <select> nunca deja de mostrar el valor ya elegido.
function opcionesDeNivel(nivelActual: number | undefined): readonly number[] {
  const maximo = Math.max(15, nivelActual ?? 0)
  return Array.from({ length: maximo + 1 }, (_valor, indice) => indice)
}

// Solo texto visible: los valores internos (value de cada <option>,
// local.tipo, local.regimen) siguen siendo los literales del modelo.
const ETIQUETA_TIPO_DE_LOCAL: Readonly<Record<TipoDeLocal, string>> = {
  bano: 'Baño',
  toilette: 'Toilette',
  cocina: 'Cocina',
  lavadero: 'Lavadero',
  cochera: 'Cochera',
  jardin: 'Jardín',
  otros: 'Otros',
}

const ETIQUETA_REGIMEN: Readonly<Record<RegimenLocal, string>> = {
  domiciliario: 'Domiciliario',
  noDomiciliario: 'No domiciliario',
}

// Etiqueta de presentación por local: derivada del orden y del tipo, nunca
// del id interno. No se guarda en ningún lado -- se recalcula en cada
// render a partir de `locales`.
function etiquetasDeLocales(locales: readonly Local[]): readonly string[] {
  const totalPorTipo: Partial<Record<TipoDeLocal, number>> = {}
  for (const local of locales) {
    totalPorTipo[local.tipo] = (totalPorTipo[local.tipo] ?? 0) + 1
  }

  const contadorPorTipo: Partial<Record<TipoDeLocal, number>> = {}
  return locales.map((local) => {
    const etiquetaBase = ETIQUETA_TIPO_DE_LOCAL[local.tipo]
    const total = totalPorTipo[local.tipo] ?? 0
    if (total <= 1) {
      return `Local: ${etiquetaBase}`
    }
    const siguiente = (contadorPorTipo[local.tipo] ?? 0) + 1
    contadorPorTipo[local.tipo] = siguiente
    return `Local: ${etiquetaBase} ${siguiente}`
  })
}

function conTipoDeProyecto(proyecto: Proyecto, tipoDeProyecto: TipoDeProyecto): Proyecto {
  return { ...proyecto, parametros: { ...proyecto.parametros, tipoDeProyecto } }
}


function ArtefactoFormulario({
  artefacto,
  onCambiar,
  onCambiarTipo,
  onEliminar,
}: {
  artefacto: Artefacto
  onCambiar: (artefacto: Artefacto) => void
  // D-δ.52 (CRIT-A15): cambiar el tipo de catálogo es un cambio de nivel
  // Proyecto -- reconcilia además la conectividad física AF/AC. Distinto
  // de onCambiar (cantidad), que es puramente funcional.
  onCambiarTipo: (nuevoArtefactoId: string) => void
  onEliminar: () => void
}) {
  // UX-02 / UI-01E (brief §41-42): `qu` sale del label del <select> (lo
  // alargaba y ensuciaba la lectura) y pasa a metadata secundaria. Sigue
  // visible y consultable; se lee del catálogo real, no se recalcula.
  const quTotal_lps = catalogoArtefactos.find((c) => c.id === artefacto.artefactoId)?.quTotal_lps
  return (
    <div className="m1-artefacto">
      <select
        aria-label="Artefacto"
        value={artefacto.artefactoId}
        onChange={(evento) => onCambiarTipo(evento.target.value)}
      >
        {catalogoArtefactos.map((catalogoItem) => (
          <option key={catalogoItem.id} value={catalogoItem.id}>
            {catalogoItem.nombre}
          </option>
        ))}
      </select>
      <label className="m1-artefacto__cantidad">
        Cantidad{' '}
        <input
          type="number"
          value={artefacto.cantidad}
          onChange={(evento) => {
            const cantidad = Number(evento.target.value)
            if (!Number.isNaN(cantidad)) {
              onCambiar({ ...artefacto, cantidad })
            }
          }}
        />
      </label>
      {/* Acción destructiva secundaria (sección 13): visible y con nombre
          accesible, sin el peso de una acción constructiva. */}
      <button type="button" className="m1-btn-eliminar" aria-label="Eliminar artefacto" onClick={onEliminar}>
        Eliminar
      </button>
      {quTotal_lps !== undefined ? (
        <span className="m1-artefacto__qu">qu {formatearNumero(quTotal_lps, 'l/s')} L/s</span>
      ) : null}
    </div>
  )
}

function LocalFormulario({
  local,
  etiqueta,
  proyecto,
  unidadFuncionalId,
  onCambiar,
  onCambiarProyecto,
  onEliminar,
}: {
  local: Local
  etiqueta: string
  proyecto: Proyecto
  unidadFuncionalId: string
  onCambiar: (local: Local) => void
  onCambiarProyecto: (proyecto: Proyecto) => void
  onEliminar: () => void
}) {
  // UX-02 / UI-01E: la pregunta AF/AC se refiere SIEMPRE a un Artefacto
  // que YA existe en el Local (por id de fila, no por tipo de catálogo).
  // Así, si el usuario cambia el `<select>` de tipo antes de responder, el
  // banner se re-deriva solo (UI-CRIT-08) y nunca queda stale.
  const [declaracionPendiente, setDeclaracionPendiente] = useState<{ artefactoRowId: string } | null>(null)
  // Borrador puramente de UI (brief §11/§12): fila "Seleccionar
  // artefacto…" sin tipo real todavía. NO se persiste en `Proyecto`, no
  // dispara conectividad y no afecta Qc mientras no haya un tipo elegido.
  const [borradorAbierto, setBorradorAbierto] = useState(false)

  const artefactoPendiente =
    declaracionPendiente === undefined || declaracionPendiente === null
      ? undefined
      : local.artefactos.find((a) => a.id === declaracionPendiente.artefactoRowId)

  function proyectoConArtefactos(artefactos: readonly Artefacto[]): Proyecto {
    return {
      ...proyecto,
      unidadesFuncionales: proyecto.unidadesFuncionales.map((uf) =>
        uf.id !== unidadFuncionalId
          ? uf
          : { ...uf, locales: uf.locales.map((l) => (l.id !== local.id ? l : { ...l, artefactos })) },
      ),
    }
  }

  // M2-D (sincronización funcional -> hidráulica, ALTA): el orden es
  // AGREGAR (tipo real ya determinado) -> crear la fila -> resolver
  // conectividad (brief §14). Si `sincronizarConectividadFisicaDeArtefacto`
  // puede deducir la Red por precedente, conecta y listo; si no
  // (`redesNoDeterminables`), la fila queda creada sin conexión y se pide
  // declarar la Red para ESA fila -- nunca se inventa una conexión ni se
  // oculta la señal de la barrera de cobertura (S1/S2).
  function altaDeArtefacto(artefactoIdCatalogo: string) {
    const nuevoArtefactoId = generarId('artefacto')
    const nuevoArtefacto: Artefacto = {
      id: nuevoArtefactoId,
      artefactoId: artefactoIdCatalogo,
      cantidad: 1,
      origen: 'normativo',
    }
    const proyectoConArtefacto = proyectoConArtefactos([...local.artefactos, nuevoArtefacto])
    const sincronizacion = sincronizarConectividadFisicaDeArtefacto(
      proyectoConArtefacto,
      unidadFuncionalId,
      local.id,
      nuevoArtefactoId,
    )
    // D-δ.51: precargar longitud inicial del Tramo representativo recién creado.
    const proyectoResultante =
      sincronizacion.tipo === 'sincronizado' ? sincronizacion.proyecto : proyectoConArtefacto
    onCambiarProyecto(backfillLongitudesDePredimensionamiento(proyectoResultante))
    setBorradorAbierto(false)
    setDeclaracionPendiente(
      sincronizacion.tipo === 'redesNoDeterminables' ? { artefactoRowId: nuevoArtefactoId } : null,
    )
  }

  function agregarArtefacto() {
    const sugerido = sugerirArtefactoParaLocal(local)
    if (sugerido === undefined) {
      // Sin candidato contextual (mapping vacío o todos presentes): el
      // usuario elige el artefacto explícitamente, nunca un default
      // arbitrario del catálogo (brief §9/§11).
      setBorradorAbierto(true)
      return
    }
    altaDeArtefacto(sugerido)
  }

  // Respuesta del usuario a "¿A qué red se conecta?" -- conecta la fila
  // pendiente (que ya existe) a las Redes declaradas.
  function declararRedes(redesDeclaradas: readonly RedDeTramo[]) {
    if (declaracionPendiente === null) {
      return
    }
    const sincronizacion = sincronizarConectividadFisicaDeArtefactoConRedesDeclaradas(
      proyecto,
      unidadFuncionalId,
      local.id,
      declaracionPendiente.artefactoRowId,
      redesDeclaradas,
    )
    const proyectoResultante = sincronizacion.tipo === 'sincronizado' ? sincronizacion.proyecto : proyecto
    onCambiarProyecto(backfillLongitudesDePredimensionamiento(proyectoResultante))
    setDeclaracionPendiente(null)
  }

  // Cancelar (brief §17): mismo efecto neto que antes de este incremento
  // ("no lo agregué después de todo"). La fila recién creada todavía no
  // tiene conexión, así que se elimina; no se deja un artefacto huérfano
  // sin forma de conectarlo.
  function cancelarDeclaracion() {
    if (declaracionPendiente !== null) {
      onCambiarProyecto(
        proyectoConArtefactos(local.artefactos.filter((a) => a.id !== declaracionPendiente.artefactoRowId)),
      )
    }
    setDeclaracionPendiente(null)
  }

  // La `etiqueta` llega como "Local: Baño" / "Local: Baño 2"; en la card
  // el prefijo es redundante (ya es una card de Local).
  const tituloLocal = etiqueta.replace(/^Local:\s*/, '')

  return (
    <article className="m1-local">
      <div className="m1-local__cabecera">
        <h4 className="m1-local__nombre">{tituloLocal}</h4>
        <button type="button" className="m1-btn-eliminar" onClick={onEliminar}>
          Eliminar local
        </button>
      </div>

      <div className="m1-local__tipos">
        <label>
          Tipo:{' '}
          <select
            value={local.tipo}
            onChange={(evento) => onCambiar({ ...local, tipo: evento.target.value as TipoDeLocal })}
          >
            {TIPOS_DE_LOCAL.map((tipo) => (
              <option key={tipo} value={tipo}>
                {ETIQUETA_TIPO_DE_LOCAL[tipo]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Régimen:{' '}
          <select
            value={local.regimen ?? ''}
            onChange={(evento) => {
              if (evento.target.value === '') {
                const { regimen: _regimen, ...localSinRegimen } = local
                onCambiar(localSinRegimen)
                return
              }
              onCambiar({ ...local, regimen: evento.target.value as RegimenLocal })
            }}
          >
            <option value="">— sin definir —</option>
            {REGIMENES_DE_LOCAL.map((regimen) => (
              <option key={regimen} value={regimen}>
                {ETIQUETA_REGIMEN[regimen]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="m1-local__seccion">Artefactos</p>
      <div className="m1-artefactos">
        {local.artefactos.map((artefacto) => (
          <ArtefactoFormulario
            key={artefacto.id}
            artefacto={artefacto}
            onCambiar={(artefactoActualizado) =>
              onCambiar({
                ...local,
                artefactos: local.artefactos.map((a) => (a.id === artefacto.id ? artefactoActualizado : a)),
              })
            }
            onCambiarTipo={(nuevoArtefactoId) => {
            // D-δ.52 (CRIT-A15): cambio funcional + reconciliación física
            // AF/AC + backfill de longitudes rápidas, en un único updater
            // (sin render intermedio inconsistente).
            const proyectoConTipoNuevo: Proyecto = {
              ...proyecto,
              unidadesFuncionales: proyecto.unidadesFuncionales.map((uf) =>
                uf.id !== unidadFuncionalId
                  ? uf
                  : {
                      ...uf,
                      locales: uf.locales.map((l) =>
                        l.id !== local.id
                          ? l
                          : {
                              ...l,
                              artefactos: l.artefactos.map((a) =>
                                a.id === artefacto.id ? { ...a, artefactoId: nuevoArtefactoId } : a,
                              ),
                            },
                      ),
                    },
              ),
            }
            const reconciliado = reconciliarConectividadFisicaPorCambioDeArtefacto(
              proyectoConTipoNuevo,
              unidadFuncionalId,
              local.id,
              artefacto.id,
            )
            onCambiarProyecto(backfillLongitudesDePredimensionamiento(reconciliado))
            // UI-CRIT-08: si había una declaración AF/AC pendiente para
            // ESTA fila y el usuario le cambió el tipo, la pregunta no
            // puede seguir refiriéndose al tipo anterior. Se re-evalúa el
            // tipo nuevo: si ahora tiene precedente inequívoco, la
            // reconciliación ya lo conectó y la pregunta se cierra; si no,
            // la pregunta sigue abierta pero apuntando al tipo nuevo (el
            // banner lee la fila en vivo).
            if (declaracionPendiente?.artefactoRowId === artefacto.id) {
              const precedenteNuevo = determinarRedesFisicasPorPrecedente(proyectoConTipoNuevo, nuevoArtefactoId)
              setDeclaracionPendiente(
                precedenteNuevo.tipo === 'determinado' ? null : { artefactoRowId: artefacto.id },
              )
            }
          }}
          onEliminar={() => {
            // M2-D (BAJA): retira tambien la conectividad fisica exclusiva
            // del artefacto antes de que quede una referencia huerfana
            // (D-δ.26) -- nunca toca infraestructura compartida del
            // Local (nodo padre/cabecera).
            if (declaracionPendiente?.artefactoRowId === artefacto.id) {
              setDeclaracionPendiente(null)
            }
            const proyectoSinConectividad = quitarConectividadFisicaDeArtefacto(
              proyecto,
              unidadFuncionalId,
              local.id,
              artefacto.id,
            )
            onCambiarProyecto({
              ...proyectoSinConectividad,
              unidadesFuncionales: proyectoSinConectividad.unidadesFuncionales.map((uf) =>
                uf.id !== unidadFuncionalId
                  ? uf
                  : {
                      ...uf,
                      locales: uf.locales.map((l) =>
                        l.id !== local.id
                          ? l
                          : { ...l, artefactos: l.artefactos.filter((a) => a.id !== artefacto.id) },
                      ),
                    },
              ),
            })
          }}
          />
        ))}
      </div>
      {borradorAbierto ? (
        <div className="m1-artefacto-borrador">
          <label>
            Artefacto:{' '}
            <select
              aria-label="Seleccionar artefacto para agregar"
              defaultValue=""
              onChange={(evento) => {
                if (evento.target.value !== '') {
                  altaDeArtefacto(evento.target.value)
                }
              }}
            >
              <option value="">— Seleccionar artefacto… —</option>
              {catalogoArtefactos.map((catalogoItem) => (
                <option key={catalogoItem.id} value={catalogoItem.id}>
                  {catalogoItem.nombre}
                </option>
              ))}
            </select>
          </label>
          <span className="m1-artefacto-borrador__cantidad">Cantidad: 1</span>
          <button
            type="button"
            className="ui-btn--fantasma"
            onClick={() => setBorradorAbierto(false)}
          >
            Cancelar
          </button>
        </div>
      ) : null}

      <button type="button" className="m1-agregar-contextual" onClick={agregarArtefacto}>
        + Agregar artefacto
      </button>

      {declaracionPendiente && artefactoPendiente && (
        <div className="ui-callout ui-callout--warn m1-declaracion" role="alert">
          <p>
            Es la primera instancia de "
            {catalogoArtefactos.find((c) => c.id === artefactoPendiente.artefactoId)?.nombre ??
              artefactoPendiente.artefactoId}
            " en el proyecto: no hay otra conexión física de la que deducir la Red. ¿A qué red se conecta?
          </p>
          <div className="m1-declaracion__opciones">
            <button type="button" onClick={() => declararRedes(['AF'])}>
              Agua fría (AF)
            </button>
            <button type="button" onClick={() => declararRedes(['AC'])}>
              Agua caliente (AC)
            </button>
            <button type="button" onClick={() => declararRedes(['AF', 'AC'])}>
              Agua fría y caliente (AF + AC)
            </button>
            <button type="button" className="ui-btn--fantasma" onClick={cancelarDeclaracion}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </article>
  )
}

function UnidadFuncionalFormulario({
  uf,
  proyecto,
  onCambiar,
  onCambiarProyecto,
  onEliminar,
  onDuplicar,
  mostrarEliminar,
  colapsada,
  onAlternarColapso,
}: {
  uf: UnidadFuncional
  proyecto: Proyecto
  onCambiar: (uf: UnidadFuncional) => void
  onCambiarProyecto: (proyecto: Proyecto) => void
  onEliminar: () => void
  onDuplicar: () => void
  mostrarEliminar: boolean
  // UX-01 / UI-01D: estado de colapso -- exclusivamente de presentación,
  // vive en ProyectoFormulario, nunca en `Proyecto`. Colapsar sólo oculta
  // el detalle: los datos siguen en `uf` y participan igual de todo el
  // cálculo (D-δ.76).
  colapsada: boolean
  onAlternarColapso: () => void
}) {
  const resumen = resumenDeUnidadFuncional(uf)
  // Id estable del contenido para aria-controls (sección 35): no depende
  // del orden ni del estado de colapso.
  const contenidoId = `uf-contenido-${uf.id}`

  return (
    <section className={colapsada ? 'm1-uf m1-uf--colapsada' : 'm1-uf'}>
      <div className="m1-uf__cabecera">
        {/* Patrón APG de disclosure: <button aria-expanded> dentro del
            heading. La cabecera entera es el control de expandir/contraer
            (sección 9); Duplicar / Eliminar quedan fuera del botón para
            seguir accesibles con la UF colapsada (sección 29). */}
        <h3 className="m1-uf__titulo">
          <button
            type="button"
            className="m1-uf__toggle"
            aria-expanded={!colapsada}
            aria-controls={contenidoId}
            aria-label={
              colapsada
                ? `Expandir ${uf.nombre} — ${resumen.nivelTexto}, ${resumen.localesTexto}, ${resumen.artefactosTexto}`
                : `Contraer ${uf.nombre}`
            }
            onClick={onAlternarColapso}
          >
            <span className="m1-uf__chevron" aria-hidden="true">
              {colapsada ? '▶' : '▼'}
            </span>
            <span className="m1-uf__nombre-cabecera">{uf.nombre}</span>
            <span className="m1-uf__meta">· {resumen.nivelTexto}</span>
            {colapsada ? (
              <span className="m1-uf__resumen">
                {resumen.localesTexto} · {resumen.artefactosTexto}
              </span>
            ) : null}
          </button>
        </h3>
        <div className="m1-uf__acciones">
          <button type="button" className="ui-btn--fantasma" onClick={onDuplicar}>
            Duplicar
          </button>
          {mostrarEliminar ? (
            <button type="button" className="m1-btn-eliminar" onClick={onEliminar}>
              Eliminar unidad funcional
            </button>
          ) : null}
        </div>
      </div>

      {/* Contenido detallado. El wrapper con id estable permanece siempre
          (aria-controls apunta a un nodo real); sus hijos NO se renderizan
          con la UF colapsada (sección 26): todos los datos viven en
          `Proyecto` y ningún control de M1 guarda decisiones de dominio en
          useState (auditoría D-δ.70), así que ocultarlo no pierde nada. */}
      <div id={contenidoId} className="m1-uf__contenido" hidden={colapsada}>
        {colapsada ? null : (
          <CuerpoDeUnidadFuncional
            uf={uf}
            proyecto={proyecto}
            onCambiar={onCambiar}
            onCambiarProyecto={onCambiarProyecto}
            onAlternarColapso={onAlternarColapso}
          />
        )}
      </div>
    </section>
  )
}

// UX-01 / UI-01D: detalle editable de una UF (campos + Locales + acciones).
// Se monta sólo con la UF expandida; se separó de la cabecera para que el
// conditional rendering del colapso quede legible y para no repetir la
// jerarquía JSX previa a este slice.
function CuerpoDeUnidadFuncional({
  uf,
  proyecto,
  onCambiar,
  onCambiarProyecto,
  onAlternarColapso,
}: {
  uf: UnidadFuncional
  proyecto: Proyecto
  onCambiar: (uf: UnidadFuncional) => void
  onCambiarProyecto: (proyecto: Proyecto) => void
  onAlternarColapso: () => void
}) {
  const locales = uf.locales

  function cambiarLocales(locales: readonly Local[]) {
    onCambiar({ ...uf, locales })
  }

  function agregarLocal() {
    const nuevoLocal: Local = {
      id: generarId('local'),
      tipo: 'bano',
      // UX-02 / UI-01E (brief §5): default de creación, no un bloqueo. El
      // selector de Régimen sigue libre y los Locales existentes no se
      // tocan (UI-CRIT-07).
      regimen: 'domiciliario',
      artefactos: [],
    }
    cambiarLocales([...locales, nuevoLocal])
  }

  const etiquetas = etiquetasDeLocales(locales)

  return (
    <>
      <div className="m1-uf__campos">
        <label>
          Nombre:{' '}
          <input
            type="text"
            aria-label="Nombre de la unidad funcional"
            value={uf.nombre}
            onChange={(evento) => onCambiar({ ...uf, nombre: evento.target.value })}
          />
        </label>
        <label>
          Nivel:{' '}
          <select
            value={uf.nivel ?? ''}
            onChange={(evento) => {
              if (evento.target.value === '') {
                const { nivel: _nivel, ...ufSinNivel } = uf
                onCambiar(ufSinNivel)
                return
              }
              const nivel = Number(evento.target.value)
              // D-δ.46: cambiar explícitamente el nivel siempre actualiza la
              // cota al default de ese nivel (preferencia simple del brief,
              // sin dirty-tracking) -- después el usuario puede editarla.
              onCambiar({ ...uf, nivel, cotaHidraulicaReferencia_m: calcularCotaHidraulicaDefaultDeNivel(nivel) })
            }}
          >
            <option value="">— sin clasificar —</option>
            {opcionesDeNivel(uf.nivel).map((nivel) => (
              <option key={nivel} value={nivel}>
                {nombreDeNivel(nivel)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cota hidráulica de referencia [m]:{' '}
          <input
            type="number"
            step="any"
            value={uf.cotaHidraulicaReferencia_m ?? ''}
            onChange={(evento) => {
              const resultado = parsearCota(evento.target.value)
              if (resultado === 'ignorar') {
                return
              }
              if (resultado === undefined) {
                const { cotaHidraulicaReferencia_m: _cotaAnterior, ...ufSinCota } = uf
                onCambiar(ufSinCota)
                return
              }
              onCambiar({ ...uf, cotaHidraulicaReferencia_m: resultado })
            }}
            style={{ width: '5rem' }}
          />
        </label>
      </div>
      <p className="m1-uf__ayuda">
        <small>
          En modo rápido (granularidad simplificada), esta cota se utiliza para todos los puntos de consumo de la
          unidad funcional.
        </small>
      </p>

      <div className="m1-uf__locales">
        {locales.map((local, indice) => (
          <LocalFormulario
            key={local.id}
            local={local}
            etiqueta={etiquetas[indice] ?? `Local: ${ETIQUETA_TIPO_DE_LOCAL[local.tipo]}`}
            proyecto={proyecto}
            unidadFuncionalId={uf.id}
            onCambiar={(localActualizado) =>
              cambiarLocales(locales.map((l) => (l.id === local.id ? localActualizado : l)))
            }
            onCambiarProyecto={onCambiarProyecto}
            onEliminar={() => {
              // M2-D (BAJA de Local completo, D-δ.47): mismo principio que la
              // baja de un Artefacto individual, pero además poda la cabecera
              // de bifurcación exclusiva del Local (que ya no puede reutilizar
              // ningún consumidor futuro, a diferencia de la baja de un solo
              // Artefacto) para no dejar topología muerta en redHidraulica.
              const proyectoSinConectividad = quitarConectividadFisicaDeLocal(proyecto, uf.id, local.id)
              onCambiarProyecto({
                ...proyectoSinConectividad,
                unidadesFuncionales: proyectoSinConectividad.unidadesFuncionales.map((unidad) =>
                  unidad.id !== uf.id
                    ? unidad
                    : { ...unidad, locales: unidad.locales.filter((l) => l.id !== local.id) },
                ),
              })
            }}
          />
        ))}
      </div>

      <button type="button" className="m1-agregar-contextual" onClick={agregarLocal}>
        + Agregar local
      </button>

      {/* Control inferior (sección 10): tras cargar una UF larga, el usuario
          la cierra sin volver a subir a la cabecera. Alterna exactamente el
          mismo estado que el control superior (sección 41), no uno
          independiente. Sólo existe con la UF abierta (sección 11). */}
      <div className="m1-uf__pie">
        <button
          type="button"
          className="m1-uf__contraer-pie"
          aria-label={`Contraer ${uf.nombre}`}
          onClick={onAlternarColapso}
        >
          ↑ Contraer unidad funcional
        </button>
      </div>
    </>
  )
}

function ProyectoFormulario({
  proyecto,
  onCambiar,
}: {
  proyecto: Proyecto
  onCambiar: (proyecto: Proyecto) => void
}) {
  const unidadesFuncionales = proyecto.unidadesFuncionales

  // UX-01 / UI-01D (D-δ.76): estado de colapso de cada UF, SÓLO de
  // presentación. Semántica "id ausente del conjunto = UF expandida": las
  // UF ya presentes al montar arrancan abiertas (conjunto vacío inicial) y
  // cada UF nueva o duplicada se agrega al conjunto (nace colapsada). Por
  // id, nunca por índice (sección 15): sobrevive a altas/bajas/duplicados/
  // reordenamientos. No se persiste (sección 14/51): un reload vuelve al
  // proyecto de ejemplo con su UF abierta.
  const [idsColapsadas, setIdsColapsadas] = useState<ReadonlySet<string>>(() => new Set())

  function alternarColapso(unidadFuncionalId: string) {
    setIdsColapsadas((previo) => {
      const siguiente = new Set(previo)
      if (siguiente.has(unidadFuncionalId)) {
        siguiente.delete(unidadFuncionalId)
      } else {
        siguiente.add(unidadFuncionalId)
      }
      return siguiente
    })
  }

  function marcarColapsadas(ufIds: readonly string[]) {
    if (ufIds.length === 0) return
    setIdsColapsadas((previo) => {
      const siguiente = new Set(previo)
      for (const id of ufIds) siguiente.add(id)
      return siguiente
    })
  }

  function olvidarColapso(unidadFuncionalId: string) {
    setIdsColapsadas((previo) => {
      if (!previo.has(unidadFuncionalId)) return previo
      const siguiente = new Set(previo)
      siguiente.delete(unidadFuncionalId)
      return siguiente
    })
  }

  function cambiarUnidadesFuncionales(unidadesFuncionales: readonly UnidadFuncional[]) {
    onCambiar({ ...proyecto, unidadesFuncionales })
  }

  function agregarUnidadFuncional() {
    // D-δ.46: nivel inicial por orden de creación (UF1→PB, UF2→Piso1...)
    // -- solo un default de creación, el nivel sigue siendo completamente
    // editable después (puede haber varias UF en un mismo piso, ninguna
    // en otro, subsuelos, etc., ver PENDIENTES-DE-ARQUITECTURA.md D-δ.46).
    const nivel = unidadesFuncionales.length
    const nuevaUf: UnidadFuncional = {
      id: generarId('uf'),
      nombre: `Unidad funcional ${unidadesFuncionales.length + 1}`,
      nivel,
      cotaHidraulicaReferencia_m: calcularCotaHidraulicaDefaultDeNivel(nivel),
      locales: [],
    }
    // Sección 4: la UF nueva nace COLAPSADA; las existentes no cambian de
    // estado visual. El id se conoce acá directamente, sin depender del
    // updater.
    marcarColapsadas([nuevaUf.id])
    cambiarUnidadesFuncionales([...unidadesFuncionales, nuevaUf])
  }

  function duplicarUnidadFuncional(unidadFuncionalId: string) {
    // Sección 5/17/18: la copia nace COLAPSADA. El updater de dominio
    // devuelve sólo `Proyecto` (no el id de la copia) y no se modifica:
    // la UF nueva se identifica comparando ids antes/después, en la capa
    // de presentación.
    const idsPrevios = new Set(unidadesFuncionales.map((u) => u.id))
    const proyectoConCopia = duplicarUnidadFuncionalEnProyecto(proyecto, unidadFuncionalId)
    const idsNuevos = proyectoConCopia.unidadesFuncionales
      .filter((u) => !idsPrevios.has(u.id))
      .map((u) => u.id)
    marcarColapsadas(idsNuevos)
    onCambiar(proyectoConCopia)
  }

  return (
    <section className="m1">
      <div className="ui-card ui-card--config m1-config">
        <h3 className="ui-card__titulo">Datos del proyecto</h3>
        <label>
          Tipología de proyecto:{' '}
          <select
            style={{ maxWidth: '100%' }}
            value={proyecto.parametros.tipoDeProyecto}
            onChange={(evento) => onCambiar(conTipoDeProyecto(proyecto, evento.target.value as TipoDeProyecto))}
          >
            {coeficientesMayoracion.map((entrada) => (
              <option key={entrada.id} value={entrada.id}>
                {entrada.nombre} — a = {entrada.a}
              </option>
            ))}
          </select>
        </label>
        <span className="m1-config__total">
          Total de unidades funcionales: <strong>{unidadesFuncionales.length}</strong>
        </span>
      </div>

      {unidadesFuncionales.map((uf) => (
        <UnidadFuncionalFormulario
          key={uf.id}
          uf={uf}
          proyecto={proyecto}
          mostrarEliminar={unidadesFuncionales.length > 1}
          colapsada={idsColapsadas.has(uf.id)}
          onAlternarColapso={() => alternarColapso(uf.id)}
          onCambiar={(ufActualizada) =>
            cambiarUnidadesFuncionales(
              unidadesFuncionales.map((u) => (u.id === uf.id ? ufActualizada : u)),
            )
          }
          onCambiarProyecto={onCambiar}
          onEliminar={() => {
            // M2-D (BAJA de UnidadFuncional completa, D-δ.47): mismo
            // principio que la baja de un Local completo, aplicado a todos
            // los Locales de la UF.
            // Sección 19: además se olvida su estado de colapso para no
            // acumular ids muertos en el conjunto de presentación.
            olvidarColapso(uf.id)
            const proyectoSinConectividad = quitarConectividadFisicaDeUnidadFuncional(proyecto, uf.id)
            onCambiar({
              ...proyectoSinConectividad,
              unidadesFuncionales: proyectoSinConectividad.unidadesFuncionales.filter((u) => u.id !== uf.id),
            })
          }}
          onDuplicar={() => duplicarUnidadFuncional(uf.id)}
        />
      ))}

      {/* "Agregar unidad funcional" es la acción de nivel superior de M1
          (sección 15): jerarquía distinta a "+ Agregar local" (dentro de
          la UF) y "+ Agregar artefacto" (dentro del Local). */}
      <button type="button" className="ui-btn--primario m1-agregar-uf" onClick={agregarUnidadFuncional}>
        + Agregar unidad funcional
      </button>
    </section>
  )
}

function extraerN(pasos: readonly Paso[]): number | null {
  const pasoKc = pasos.find((paso) => paso.id === 'kc')
  const entradaN = pasoKc?.entradas.find((entrada) => entrada.simbolo === 'n')
  return entradaN?.valor ?? null
}

function ValorCalculadoTexto({ valor }: { valor: ValorCalculado }) {
  return <span>{textoValorCalculado(valor)}</span>
}

const MENSAJES_DE_VALIDACION: Readonly<Record<CodigoValidacion, string>> = {
  proyectoRegimenLocalAusente: 'Debe seleccionar el régimen del local.',
  proyectoCantidadNoPositiva: 'La cantidad de artefactos debe ser mayor que cero.',
  proyectoUnidadFuncionalSinLocales: 'La unidad funcional no contiene locales.',
  proyectoLocalSinArtefactos: 'El local no contiene artefactos y no participa del cálculo.',
  proyectoSinArtefactosComputables: 'El proyecto debe contener al menos un artefacto para poder calcular.',
  catalogoArtefactoIdInexistente: 'El artefacto seleccionado no existe en el catálogo normativo vigente.',
  catalogoTipoDeProyectoInexistente:
    'La tipología de proyecto seleccionada no existe en el catálogo normativo vigente.',
  redHidraulicaNodoIdDuplicado: 'Nodo de red hidráulica con identificador duplicado.',
  redHidraulicaTramoIdDuplicado: 'Tramo de red hidráulica con identificador duplicado.',
  redHidraulicaTramoNodoInexistente: 'Un tramo de red hidráulica referencia un nodo inexistente.',
  redHidraulicaTramoOrigenIgualDestino:
    'Un tramo de red hidráulica no puede tener el mismo nodo como origen y destino.',
  redHidraulicaReferenciaArtefactoInvalida:
    'Una referencia de red hidráulica apunta a un artefacto inexistente o fuera de la ubicación indicada.',
  redHidraulicaTramoLongitudNoPositiva: 'Un tramo de red hidráulica tiene una longitud menor o igual a cero.',
  redHidraulicaTramoLongitudIncompatibleConCota:
    'Un tramo de red hidráulica tiene una longitud menor a la diferencia de cota entre sus nodos.',
  redHidraulicaTramoAccesorioTipoNoSoportado:
    'Un accesorio de tramo tiene un tipo todavía no soportado para el cálculo de pérdida localizada.',
  redHidraulicaTramoAccesorioCantidadNoPositiva: 'La cantidad de un accesorio de tramo debe ser mayor que cero.',
  redHidraulicaNodoTeeEstructuraNoSoportada:
    'Un nodo con configuración de tee no tiene exactamente 1 tramo entrante y 2 tramos salientes.',
  redHidraulicaNodoTeeTramoSalidaRectaInvalido:
    'La salida recta declarada de una tee no es ninguno de los dos tramos salientes reales del nodo.',
  configuracionHidraulicaSistemaDeTuberiaIdInexistente:
    'El sistema de tubería seleccionado no existe en el catálogo de sistemas comerciales vigente.',
  configuracionHidraulicaSistemaMaterialIncompatible:
    'El sistema de tubería seleccionado pertenece a un material distinto del material configurado en el proyecto.',
  configuracionMedidoresUnidadFuncionalInexistente:
    'La configuración de medidores tiene un override de ACS para una unidad funcional que ya no existe.',
  configuracionAbastecimientoEsquemaInvalido:
    'El esquema de abastecimiento persistido no es uno de los soportados (directa / tanque elevado / cisterna + bombeo + tanque elevado).',
  configuracionAbastecimientoPeriodoConsumoMaximoInvalido:
    'El período de consumo máximo del abastecimiento debe estar entre 1 y 4 horas.',
  parametrosDiametroNominalConexionNoAdmisible:
    'El diámetro nominal de la conexión debe ser uno de los diámetros de la Tabla N°1 y mayor o igual a 19 mm.',
  parametrosDesnivelConexionNoFinito:
    'El desnivel de la conexión respecto de la acera debe ser un número (puede ser negativo, cero o positivo).',
  configuracionAbastecimientoVolumenTanqueElevadoInvalido:
    'El volumen adoptado del tanque elevado debe ser un número mayor o igual a cero.',
  configuracionAbastecimientoVolumenTanqueBombeoInvalido:
    'El volumen adoptado del tanque de bombeo debe ser un número mayor o igual a cero.',
}

// FIX P0: sólo se muestra cuando hay un error de ALCANCE 'demanda' -- lo
// único que impide de verdad ejecutar el Motor de Demanda. Los errores de
// otros módulos van a RevisionesPendientes y no apagan M1. Copy sin
// códigos internos ni "[error]" (UI-CRIT-10 / brief §15).
function ProblemasValidacion({ problemas }: { problemas: readonly ProblemaValidacion[] }) {
  return (
    <div className="ui-card ui-card--config ui-stack--sm">
      <h4 className="ui-card__titulo" style={{ color: 'var(--color-error)' }}>
        No se puede calcular la demanda todavía
      </h4>
      <ul>
        {problemas.map((problema, indice) => (
          <li key={indice}>{MENSAJES_DE_VALIDACION[problema.codigo]}</li>
        ))}
      </ul>
      <p>
        <small>Corregí los datos indicados para obtener el caudal de cálculo.</small>
      </p>
    </div>
  )
}

const REVISION_POR_ALCANCE: Readonly<
  Record<Exclude<AlcanceValidacion, 'demanda'>, { titulo: string; ancla: string }>
> = {
  tuberias: { titulo: 'Tuberías', ancla: '#tuberias' },
  medidores: { titulo: 'Medidores', ancla: '#medidores' },
  abastecimiento: { titulo: 'Abastecimiento y reserva', ancla: '#abastecimiento' },
}

// FIX P0 (brief §17): errores de módulos POSTERIORES a Demanda. No apagan
// M1 -- se listan agrupados por su sección, con enlace a donde se
// corrigen, y sin exponer códigos internos.
function RevisionesPendientes({ problemas }: { problemas: readonly ProblemaValidacion[] }) {
  if (problemas.length === 0) {
    return null
  }
  const grupos = (Object.keys(REVISION_POR_ALCANCE) as Array<keyof typeof REVISION_POR_ALCANCE>)
    .map((alcance) => ({
      alcance,
      mensajes: problemas.filter((p) => p.alcance === alcance).map((p) => MENSAJES_DE_VALIDACION[p.codigo]),
    }))
    .filter((grupo) => grupo.mensajes.length > 0)

  return (
    <div className="ui-callout ui-callout--warn ui-stack--sm" role="status">
      <div>
        <strong>Revisiones pendientes en otras etapas</strong>
        <p>
          <small>La Demanda se calcula normalmente. Estas revisiones afectan sólo a su etapa.</small>
        </p>
        {grupos.map(({ alcance, mensajes }) => (
          <p key={alcance} style={{ margin: '0.35rem 0 0' }}>
            <a href={REVISION_POR_ALCANCE[alcance].ancla}>{REVISION_POR_ALCANCE[alcance].titulo}</a>:{' '}
            {mensajes.join(' · ')}
          </p>
        ))}
      </div>
    </div>
  )
}

function Advertencias({ advertencias }: { advertencias: ResultadoDeCalculo['advertencias'] }) {
  if (advertencias.length === 0) {
    return null
  }
  return (
    <section>
      <h2>Advertencias</h2>
      <ul>
        {advertencias.map((advertencia) => (
          <li key={advertencia.id}>
            {advertencia.mensaje}
            {advertencia.referenciaNormativa ? ` (${advertencia.referenciaNormativa})` : ''}
          </li>
        ))}
      </ul>
    </section>
  )
}

function Resultados({ resultado }: { resultado: ResultadoDeCalculo }) {
  const n = extraerN(resultado.pasos)
  const { qmax, kc, k, qc } = resultado.resultados
  if (!qmax || !kc || !k || !qc) {
    // No es un estado previsible del dominio: el motor siempre devuelve
    // estas cuatro claves (contrato de calcularSimultaneidad). Si faltan,
    // es un defecto de programación, no un caso a manejar en la interfaz.
    throw new Error('El motor no devolvió los resultados esperados (qmax/kc/k/qc)')
  }

  return (
    <section className="ui-stack">
      {/* Qc es el resultado protagonista de M1 (sección 35 de UI-01B):
          número grande, legible de un vistazo; n y Qmax como metadatos de
          apoyo, y el desarrollo completo por progressive disclosure más
          abajo. La card no se rediseña en UI-01C (§16), sólo se integra en
          el nuevo perímetro de la etapa. */}
      <div className="ui-card ui-card--resultado ui-metrica">
        <span className="ui-metrica__etiqueta">Caudal de cálculo · Qc</span>
        <span className="ui-metrica__valor">
          <ValorCalculadoTexto valor={qc} />
        </span>
        <span className="ui-metrica__nota">
          n = {n !== null ? formatearNumero(n, 'conteo') : '—'} · Qmax ={' '}
          <ValorCalculadoTexto valor={qmax} />
        </span>
      </div>

      <details>
        <summary>Parámetros intermedios</summary>
        <table>
          <tbody>
            <tr>
              <th>Kc</th>
              <td>
                <ValorCalculadoTexto valor={kc} />
              </td>
            </tr>
            <tr>
              <th>K</th>
              <td>
                <ValorCalculadoTexto valor={k} />
              </td>
            </tr>
          </tbody>
        </table>
      </details>
    </section>
  )
}

function Pasos({ pasos }: { pasos: readonly Paso[] }) {
  return (
    <section>
      <details>
        {/* Sin "▶" propio: el navegador ya antepone su propio triángulo
            de disclosure a <summary>; duplicarlo se vería redundante. */}
        <summary>🔍 Desarrollo del cálculo ({pasos.length} pasos)</summary>
        {pasos.map((paso) => {
          const sustitucion = sustitucionNumerica(paso)
          return (
            <article key={paso.id}>
              <h3>{paso.titulo}</h3>
              <p>Fórmula: {formulaSimbolica(paso)}</p>
              {paso.criterioId ? <p>Criterio: {paso.criterioId}</p> : null}
              {sustitucion ? <p>Sustitución: {sustitucion}</p> : null}
              <p>
                {paso.salida.simbolo} = <ValorCalculadoTexto valor={paso.salida.resultado} />
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Símbolo</th>
                      <th>Valor</th>
                      <th>Unidad</th>
                      <th>Procedencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paso.entradas.map((entrada, indice) => (
                      // entrada.simbolo puede repetirse (ej. qu(lavatorio) en
                      // más de un local); se agrega el índice solo para que la
                      // key de React sea única -- no altera ningún dato visible.
                      <tr key={`${entrada.simbolo}-${indice}`}>
                        <td>{entrada.simbolo}</td>
                        <td>{formatearNumero(entrada.valor, entrada.unidad)}</td>
                        <td>{entrada.unidad}</td>
                        <td>{entrada.procedencia}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>Referencias: {paso.referencias.join(', ')}</p>
              {paso.nota ? <p>Nota: {paso.nota}</p> : null}
            </article>
          )
        })}
      </details>
    </section>
  )
}

// Salida de Módulo 1 (Demanda). Es la mitad "resultado" de la etapa 1: la
// mitad "entrada" (ProyectoFormulario) vive en la misma sección #demanda,
// justo arriba.
function ResultadoDemandaModulo1({
  proyecto,
}: {
  proyecto: Proyecto
}) {
  const resultado = calcularSimultaneidad({
    proyecto,
    normativa: { catalogoArtefactos, coeficientesMayoracion },
  })

  return (
    <details open>
      <summary>Resultado de demanda</summary>
      <Advertencias advertencias={resultado.advertencias} />
      <Resultados resultado={resultado} />
      <button type="button" onClick={() => generarDocumentoPdf({ proyecto, resultado })}>
        Generar memoria PDF de Demanda
      </button>
      <Pasos pasos={resultado.pasos} />
    </details>
  )
}

export function MotorDemandaPantalla() {
  // D-δ.51: precarga las longitudes iniciales de predimensionamiento
  // (5/10/10) en el proyecto de ejemplo al montar, para que Rápido calcule
  // DN/V/hf de entrada sin longitudes faltantes. No destructivo: si el
  // fixture ya trajera longitudes, se respetan.
  const [proyecto, setProyecto] = useState<Proyecto>(() =>
    backfillLongitudesDePredimensionamiento(proyectoInicial),
  )
  const validacion = validarProyecto(proyecto, catalogoArtefactos, coeficientesMayoracion, catalogoSistemasDeTuberia)
  // FIX P0 (UI-CRIT-10): la dependencia es M1 -> M4, nunca al revés. Sólo
  // un error de alcance 'demanda' impide calcular Qc; un Tc fuera de rango
  // (o cualquier error de M2/M3/M4) NO apaga M1 ni desmonta el resto de la
  // app -- se muestra en su sección vía RevisionesPendientes.
  const erroresDemanda = erroresQueBloqueanLaDemanda(validacion)
  const demandaValida = erroresDemanda.length === 0
  const erroresPosteriores = erroresDeModulosPosteriores(validacion)

  // UI-01C (D-δ.74): resumen compacto del proyecto para la sidebar. Se
  // arma en el punto de composición a partir de resultados YA existentes
  // (calcularSimultaneidad / resolverEstadoModulo2 / resolverEstadoModulo4),
  // no de un nuevo motor de estado global. Se calcula si M1 puede calcular
  // Qc (demandaValida): un error de M2/M3/M4 no lo impide -- cada métrica
  // ya cae a "Pendiente" por su cuenta.
  const resumen = demandaValida
    ? resolverResumenDeProyecto(proyecto, catalogoArtefactos, coeficientesMayoracion)
    : undefined

  // UI-01A (D-δ.72): shell de dos columnas (índice + contenido). El flujo
  // de trabajo se ordena Demanda → Tuberías → Medidores → Abastecimiento →
  // Verificación hidráulica; la verificación es la etapa 5 pero sigue
  // perteneciendo al dominio de Módulo 2 (integra M2 + M3 + M4). Todas las
  // etapas quedan montadas (one-page); el índice es scroll a anchors, no
  // un router.
  return (
    <div className="app-shell">
      <header className="app-header">
        <div className="app-header__titulo">
          <h1>IUAS — Instalaciones internas</h1>
          <p>Proyecto de ejemplo — vivienda unifamiliar · Todos los datos pueden modificarse.</p>
        </div>
        {/* UX-02 / UI-01E (brief §47-49): Modo de trabajo global, a la
            derecha del título en desktop, apilado debajo en móvil. */}
        <SelectorDeModoDeTrabajo proyecto={proyecto} onCambiar={setProyecto} />
        {/* DEPLOY-01 (preflight D): el proyecto vive sólo en memoria de la
            pestaña -- no hay persistencia todavía (PERSIST-01 es un slice
            posterior). Aviso único, no bloqueante, sin lenguaje de alarma. */}
        <p className="app-aviso-piloto ui-callout ui-callout--info" role="note">
          Versión piloto · Los cambios se conservan sólo durante esta sesión. Recargar la página restablece el proyecto de
          ejemplo.
        </p>
      </header>

      <div className="app-layout">
        <NavegacionDeSecciones resumen={resumen} />

        <main className="app-contenido">
          {/* UI-01C (D-δ.74): el encabezado "01 Demanda" abre la etapa,
              antes de "Datos del proyecto" -- toda la configuración que
              determina la Demanda (tipología, UFs, Locales, Artefactos) y
              su Resultado viven DENTRO de la etapa 01, en ese orden. */}
          <SeccionDeTrabajo
            id="demanda"
            nombreAccesible="Demanda"
            numero={1}
            titulo="Demanda"
            descripcion="Caudal de cálculo del proyecto"
          >
            <ProyectoFormulario proyecto={proyecto} onCambiar={setProyecto} />
            {demandaValida ? (
              <>
                <ResultadoDemandaModulo1 proyecto={proyecto} />
                <RevisionesPendientes problemas={erroresPosteriores} />
              </>
            ) : (
              <ProblemasValidacion problemas={erroresDemanda} />
            )}
          </SeccionDeTrabajo>

          {demandaValida ? (
            <>
              <SeccionDeTrabajo id="tuberias" nombreAccesible="Tuberías">
                <ResultadoHidraulicoDeTramo
                  proyecto={proyecto}
                  catalogoArtefactos={catalogoArtefactos}
                  onCambiar={setProyecto}
                />
              </SeccionDeTrabajo>

              <SeccionDeTrabajo id="medidores" nombreAccesible="Medidores">
                <PanelDeMedidoresDeModulo3 proyecto={proyecto} onCambiar={setProyecto} />
              </SeccionDeTrabajo>

              <SeccionDeTrabajo id="abastecimiento" nombreAccesible="Abastecimiento y reserva">
                <PanelDeModulo4 proyecto={proyecto} onCambiar={setProyecto} />
              </SeccionDeTrabajo>

              <SeccionDeTrabajo
                id="verificacion-hidraulica"
                nombreAccesible="Verificación hidráulica"
                numero={5}
                titulo="Verificación hidráulica"
                descripcion="Comprobación final de presión y terminal crítico, usando las tuberías dimensionadas, los medidores y el esquema de abastecimiento."
              >
                <PanelDePresionDeModulo2
                  proyecto={proyecto}
                  catalogoArtefactos={catalogoArtefactos}
                  onCambiar={setProyecto}
                />
              </SeccionDeTrabajo>
            </>
          ) : null}

          <MetodologiaYFuentesTecnicas />
        </main>
      </div>
    </div>
  )
}
