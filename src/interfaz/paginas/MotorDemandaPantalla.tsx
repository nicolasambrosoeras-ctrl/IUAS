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
import type { ProblemaValidacion, CodigoValidacion } from '../../validacion'
import { validarProyecto } from '../../validacion'
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
import { MetodologiaYFuentesTecnicas } from './MetodologiaYFuentesTecnicas'
import { parsearCota } from './parsearCota'
import { calcularCotaHidraulicaDefaultDeNivel, nombreDeNivel } from './nivelUnidadFuncional'
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
  return (
    <div>
      <label>
        Artefacto:{' '}
        <select
          value={artefacto.artefactoId}
          onChange={(evento) => onCambiarTipo(evento.target.value)}
        >
          {catalogoArtefactos.map((catalogoItem) => (
            <option key={catalogoItem.id} value={catalogoItem.id}>
              {catalogoItem.nombre} (qu={formatearNumero(catalogoItem.quTotal_lps, 'l/s')} l/s)
            </option>
          ))}
        </select>
      </label>{' '}
      <label>
        Cantidad:{' '}
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
      </label>{' '}
      <button type="button" onClick={onEliminar}>
        Eliminar artefacto
      </button>
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
  // Solo se llena cuando agregarArtefacto() detecta que el nuevo artefacto
  // no tiene ningún precedente físico en el proyecto: nada se crea todavía
  // -- se espera la declaración explícita de Red del usuario (ver más abajo).
  const [declaracionPendiente, setDeclaracionPendiente] = useState<{ artefactoIdCatalogo: string } | null>(null)

  // M2-D (sincronización funcional -> hidráulica, primer slice: ALTA):
  // agregar un Artefacto no solo actualiza la jerarquía funcional (Local)
  // sino que intenta conectarlo físicamente en redHidraulica -- solo
  // cuando el punto de inserción es inequívoco (ver
  // sincronizarConectividadFisicaDeArtefacto). Si no puede determinarlo,
  // el artefacto queda igual creado funcionalmente pero sin conexión
  // física, y la barrera de cobertura (S1/S2) lo señala como siempre --
  // esta función nunca fabrica una conexión ni oculta esa señal.
  //
  // Excepción: cuando no hay ningún precedente en todo el proyecto para
  // este artefactoId (primera instancia de ese tipo), no hay de dónde
  // deducir AF/AC (CRIT-A15 prohíbe inferirlo del catálogo) -- se pide al
  // usuario que lo declare explícitamente antes de crear nada, en una
  // única operación atómica (ver declaracionPendiente más abajo) en vez
  // de crear el artefacto incompleto y repararlo después.
  function crearYConectarArtefacto(artefactoIdCatalogo: string, redesDeclaradas?: readonly RedDeTramo[]) {
    const nuevoArtefactoId = generarId('artefacto')
    const nuevoArtefacto: Artefacto = {
      id: nuevoArtefactoId,
      artefactoId: artefactoIdCatalogo,
      cantidad: 1,
      origen: 'normativo',
    }
    const proyectoConArtefacto: Proyecto = {
      ...proyecto,
      unidadesFuncionales: proyecto.unidadesFuncionales.map((uf) =>
        uf.id !== unidadFuncionalId
          ? uf
          : {
              ...uf,
              locales: uf.locales.map((l) =>
                l.id !== local.id ? l : { ...l, artefactos: [...l.artefactos, nuevoArtefacto] },
              ),
            },
      ),
    }
    const sincronizacion = redesDeclaradas
      ? sincronizarConectividadFisicaDeArtefactoConRedesDeclaradas(
          proyectoConArtefacto,
          unidadFuncionalId,
          local.id,
          nuevoArtefactoId,
          redesDeclaradas,
        )
      : sincronizarConectividadFisicaDeArtefacto(proyectoConArtefacto, unidadFuncionalId, local.id, nuevoArtefactoId)
    // D-δ.51: el bootstrap acaba de crear el Tramo representativo del
    // nuevo Local+Red -- precargar su longitud inicial (5 m si undefined)
    // para que el predimensionamiento arranque sin un input vacío.
    const proyectoResultante = sincronizacion.tipo === 'sincronizado' ? sincronizacion.proyecto : proyectoConArtefacto
    onCambiarProyecto(backfillLongitudesDePredimensionamiento(proyectoResultante))
    setDeclaracionPendiente(null)
  }

  function agregarArtefacto() {
    const primerArtefacto = catalogoArtefactos[0]
    if (!primerArtefacto) {
      return
    }
    const precedente = determinarRedesFisicasPorPrecedente(proyecto, primerArtefacto.id)
    if (precedente.tipo === 'sinPrecedente') {
      setDeclaracionPendiente({ artefactoIdCatalogo: primerArtefacto.id })
      return
    }
    crearYConectarArtefacto(primerArtefacto.id)
  }

  return (
    <article>
      <h5>{etiqueta}</h5>
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
      </label>{' '}
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
      </label>{' '}
      <button type="button" onClick={onEliminar}>
        Eliminar local
      </button>

      <h6>Artefactos</h6>
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
          }}
          onEliminar={() => {
            // M2-D (BAJA): retira tambien la conectividad fisica exclusiva
            // del artefacto antes de que quede una referencia huerfana
            // (D-δ.26) -- nunca toca infraestructura compartida del
            // Local (nodo padre/cabecera).
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
      <button type="button" onClick={agregarArtefacto}>
        + Agregar artefacto
      </button>
      {declaracionPendiente && (
        <div role="alert">
          <p>
            Es la primera instancia de "
            {catalogoArtefactos.find((c) => c.id === declaracionPendiente.artefactoIdCatalogo)?.nombre ??
              declaracionPendiente.artefactoIdCatalogo}
            " en el proyecto: no hay otra conexión física de la que deducir la Red. ¿A qué red se conecta?
          </p>
          <button
            type="button"
            onClick={() => crearYConectarArtefacto(declaracionPendiente.artefactoIdCatalogo, ['AF'])}
          >
            Agua fría (AF)
          </button>{' '}
          <button
            type="button"
            onClick={() => crearYConectarArtefacto(declaracionPendiente.artefactoIdCatalogo, ['AC'])}
          >
            Agua caliente (AC)
          </button>{' '}
          <button
            type="button"
            onClick={() => crearYConectarArtefacto(declaracionPendiente.artefactoIdCatalogo, ['AF', 'AC'])}
          >
            Agua fría y caliente (AF + AC)
          </button>{' '}
          <button type="button" onClick={() => setDeclaracionPendiente(null)}>
            Cancelar
          </button>
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
}: {
  uf: UnidadFuncional
  proyecto: Proyecto
  onCambiar: (uf: UnidadFuncional) => void
  onCambiarProyecto: (proyecto: Proyecto) => void
  onEliminar: () => void
  onDuplicar: () => void
  mostrarEliminar: boolean
}) {
  const locales = uf.locales

  function cambiarLocales(locales: readonly Local[]) {
    onCambiar({ ...uf, locales })
  }

  function agregarLocal() {
    const nuevoLocal: Local = {
      id: generarId('local'),
      tipo: 'bano',
      artefactos: [],
    }
    cambiarLocales([...locales, nuevoLocal])
  }

  const etiquetas = etiquetasDeLocales(locales)

  return (
    <section>
      <h3>
        Unidad funcional:{' '}
        <input
          type="text"
          aria-label="Nombre de la unidad funcional"
          value={uf.nombre}
          onChange={(evento) => onCambiar({ ...uf, nombre: evento.target.value })}
        />
      </h3>
      <p>
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
        </label>{' '}
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
        <br />
        <small>
          En modo rápido (granularidad simplificada), esta cota se utiliza para todos los puntos de consumo de la
          unidad funcional.
        </small>
      </p>
      <button type="button" onClick={onDuplicar}>
        Duplicar unidad funcional
      </button>{' '}
      {mostrarEliminar ? (
        <button type="button" onClick={onEliminar}>
          Eliminar unidad funcional
        </button>
      ) : null}

      <h4>Locales</h4>
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
      <button type="button" onClick={agregarLocal}>
        + Agregar local
      </button>
    </section>
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
    cambiarUnidadesFuncionales([...unidadesFuncionales, nuevaUf])
  }

  function duplicarUnidadFuncional(unidadFuncionalId: string) {
    onCambiar(duplicarUnidadFuncionalEnProyecto(proyecto, unidadFuncionalId))
  }

  return (
    <section>
      <h2>Datos del proyecto</h2>
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

      <p>Total de unidades funcionales: {unidadesFuncionales.length}</p>

      {unidadesFuncionales.map((uf) => (
        <UnidadFuncionalFormulario
          key={uf.id}
          uf={uf}
          proyecto={proyecto}
          mostrarEliminar={unidadesFuncionales.length > 1}
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
            const proyectoSinConectividad = quitarConectividadFisicaDeUnidadFuncional(proyecto, uf.id)
            onCambiar({
              ...proyectoSinConectividad,
              unidadesFuncionales: proyectoSinConectividad.unidadesFuncionales.filter((u) => u.id !== uf.id),
            })
          }}
          onDuplicar={() => duplicarUnidadFuncional(uf.id)}
        />
      ))}
      <button type="button" onClick={agregarUnidadFuncional}>
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

function ProblemasValidacion({ problemas }: { problemas: readonly ProblemaValidacion[] }) {
  return (
    <section>
      <h2>Problemas de validación</h2>
      <p>El Proyecto no es válido. El Motor de Demanda no se ejecuta.</p>
      <ul>
        {problemas.map((problema, indice) => (
          <li key={indice}>
            [{problema.severidad}] {MENSAJES_DE_VALIDACION[problema.codigo]} ({problema.codigo})
          </li>
        ))}
      </ul>
    </section>
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
    <section>
      <h2>Resultados</h2>

      <h3>Caudal de cálculo (Qc)</h3>
      <p>
        <strong>
          <ValorCalculadoTexto valor={qc} />
        </strong>
      </p>

      <table>
        <tbody>
          <tr>
            <th>n</th>
            <td>{n !== null ? formatearNumero(n, 'conteo') : '—'}</td>
          </tr>
          <tr>
            <th>Qmax</th>
            <td>
              <ValorCalculadoTexto valor={qmax} />
            </td>
          </tr>
        </tbody>
      </table>

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

function ResultadoDemanda({
  proyecto,
  onCambiar,
}: {
  proyecto: Proyecto
  onCambiar: (proyecto: Proyecto) => void
}) {
  const resultado = calcularSimultaneidad({
    proyecto,
    normativa: { catalogoArtefactos, coeficientesMayoracion },
  })

  return (
    <>
      <details open>
        <summary>
          <h2>Módulo 1 — Demanda</h2>
        </summary>
        <Advertencias advertencias={resultado.advertencias} />
        <Resultados resultado={resultado} />
        <button type="button" onClick={() => generarDocumentoPdf({ proyecto, resultado })}>
          Generar memoria PDF
        </button>
        <Pasos pasos={resultado.pasos} />
      </details>

      <ResultadoHidraulicoDeTramo proyecto={proyecto} catalogoArtefactos={catalogoArtefactos} onCambiar={onCambiar} />

      <PanelDeMedidoresDeModulo3 proyecto={proyecto} onCambiar={onCambiar} />

      <PanelDeModulo4 proyecto={proyecto} onCambiar={onCambiar} />
    </>
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

  return (
    <div>
      <h1>IUAS — Motor de Demanda</h1>
      <h2>Proyecto de ejemplo — Vivienda unifamiliar</h2>
      <p>
        Se carga una instalación doméstica típica para facilitar la exploración del Motor de
        Demanda. Todos los datos pueden modificarse.
      </p>
      <ProyectoFormulario proyecto={proyecto} onCambiar={setProyecto} />
      {validacion.valido ? (
        <ResultadoDemanda proyecto={proyecto} onCambiar={setProyecto} />
      ) : (
        <ProblemasValidacion problemas={validacion.problemas} />
      )}
      <MetodologiaYFuentesTecnicas />
    </div>
  )
}
