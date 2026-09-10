// Visualización de Módulo 2 (hidráulica por Tramo) en la pantalla técnica.
// D-δ.43: la unidad de trabajo pasa a ser el (Local, Red) -- toda su
// infraestructura (tramo de alimentación, tees, ramales hacia cada
// Artefacto) vive junta en una sola tarjeta (LocalYRedCard.tsx), en vez de
// una tabla ancha de 13 columnas más una sección global "Tees
// (bifurcaciones)" con ids técnicos. Extraído de MotorDemandaPantalla.tsx
// únicamente por legibilidad -- misma razón que duplicarUnidadFuncional.ts,
// no una abstracción nueva. Solo se renderiza cuando el Proyecto ya pasó
// validarProyecto (gate en MotorDemandaPantalla), así que redHidraulica,
// si existe, ya es estructuralmente válida y sus referencias a Artefactos
// ya existen.
import type { GranularidadHidraulica, MaterialTuberiaId, MetodoPerdidaDistribuida, MetodoPerdidaLocalizada, Proyecto, TipoDeLocal } from '../../modelo/proyecto'
import type { ReferenciaDeArtefacto } from '../../modelo/redHidraulica'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import type { MaterialTuberia } from '../../motor/tuberias/materialTuberia'
import { catalogoMaterialesTuberia, obtenerMaterialTuberia } from '../../motor/tuberias/materialTuberia'
import { catalogoSistemasDeTuberia } from '../../motor/tuberias/sistemaDeTuberia'
import { resolverArtefactosReferenciados } from '../../motor/tuberias/topologia/resolverArtefactosReferenciados'
import { auditarCoberturaFisica } from '../../motor/tuberias/cobertura/auditarCoberturaFisica'
import {
  derivarOrdinalesDeLocal,
  identificarFilasDistribucionGeneral,
  identificarFilasDistribucionSecundaria,
  identificarFilasPrincipalesDeLocales,
} from './identificarFilasDeModulo2'
import {
  conGranularidadHidraulica,
  conMaterialTuberia,
  conMetodoPerdidaDistribuida,
  conMetodoPerdidaLocalizada,
  conSistemaDeTuberia,
} from './actualizarConfiguracionHidraulica'
import {
  conDnComercialAdoptadoDeTramo,
  conLongitudDeTramo,
  normalizarOverridesDeDnSegunSistema,
} from './actualizarRedHidraulica'
import { denominacionesComercialesDelSistema, resolverControlDeDnDeTramo } from './resolverControlDeDnDeTramo'
import { resolverModoDeTrabajo } from './modoDeTrabajo'
import { nombreDeNivel } from './nivelUnidadFuncional'
import { resolverResultadoDeTramoParaUi } from './resolverResultadoDeTramoParaUi'
import { resolverFilaDeDimensionamiento } from './resolverFilaDeDimensionamiento'
import { TablaDimensionamientoDeModulo2, type EntradaDeTabla } from './TablaDimensionamientoDeModulo2'
import { AccesoriosDeTramoEditor } from './AccesoriosDeTramoEditor'
import { LocalYRedCard } from './LocalYRedCard'
import { EncabezadoDeEtapa } from './EncabezadoDeEtapa'
import { ConstructorDeMontantes } from './ConstructorDeMontantes'

// Duplicado intencional de la etiqueta homónima en MotorDemandaPantalla.tsx
// (mismo criterio que aplicarParticipacionCritA8: segundo consumidor
// pequeño y puntual, sin abstraer todavía una fuente compartida). Solo se
// usa acá para etiquetar los Locales dentro de cada Unidad Funcional.
const ETIQUETA_TIPO_DE_LOCAL: Readonly<Record<TipoDeLocal, string>> = {
  bano: 'Baño',
  toilette: 'Toilette',
  cocina: 'Cocina',
  lavadero: 'Lavadero',
  cochera: 'Cochera',
  jardin: 'Jardín',
  otros: 'Otros',
}

// Texto humano de una referencia pendiente de auditarCoberturaFisica (S2):
// "<nombre de UF> → <tipo de Local> → <nombre de catálogo>". resolverArtefactosReferenciados
// siempre resuelve acá -- la referencia viene de artefactosSinReferencia, que
// auditarCoberturaFisica construye directamente desde proyecto.unidadesFuncionales,
// nunca de una fuente externa que pueda desincronizarse. El fallback al id
// tecnico de catalogo es deliberado (nunca inventa un nombre) para el caso
// borde de un artefactoId que no este en el catalogoArtefactos recibido.
export function describirReferenciaPendiente(
  proyecto: Proyecto,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  referencia: ReferenciaDeArtefacto,
): string {
  const [resuelto] = resolverArtefactosReferenciados(proyecto, [referencia])

  if (resuelto === undefined) {
    // Inalcanzable en la practica: ver comentario de la funcion.
    throw new Error('describirReferenciaPendiente: la referencia pendiente no resuelve contra el proyecto')
  }

  const nombreLocal = ETIQUETA_TIPO_DE_LOCAL[resuelto.local.tipo]
  const artefactoNormativo = catalogoArtefactos.find((candidato) => candidato.id === resuelto.artefacto.artefactoId)
  const nombreArtefacto = artefactoNormativo?.nombre ?? resuelto.artefacto.artefactoId

  return `${resuelto.unidadFuncional.nombre} → ${nombreLocal} → ${nombreArtefacto}`
}

// Materiales ofrecidos por el selector (D-δ.47): solo los que tienen al
// menos un SistemaDeTuberiaCatalogado real -- elegir un material sin
// ningún sistema comercial cargado dispara
// configuracionHidraulicaSistemaMaterialIncompatible y, como
// ConfiguracionHidraulicaFormulario vive dentro del gate de validación,
// deja al usuario sin ningún control visible para revertir su propia
// elección (ver conMaterialTuberia). Igual que opcionesDeNivel
// (MotorDemandaPantalla.tsx): el material ya seleccionado nunca deja de
// aparecer, aunque el catálogo de sistemas ya no lo respalde (dato cargado
// por otra vía).
function opcionesDeMaterial(materialActual: MaterialTuberiaId): readonly MaterialTuberia[] {
  const conSistemaCompatible = catalogoMaterialesTuberia.filter((material) =>
    catalogoSistemasDeTuberia.some((sistema) => sistema.materialTuberiaId === material.id),
  )
  if (conSistemaCompatible.some((material) => material.id === materialActual)) {
    return conSistemaCompatible
  }
  const actual = catalogoMaterialesTuberia.find((material) => material.id === materialActual)
  return actual === undefined ? conSistemaCompatible : [...conSistemaCompatible, actual]
}

// D-δ.51 / MODE-UX-01 (D-δ.89): cabecera de Módulo 2. El toggle
// Rápido/Profesional vive en la cabecera GLOBAL de la app
// (SelectorDeModoDeTrabajo) -- acá queda sólo la explicación del modo
// activo y la configuración propia de M2 en "Configuración avanzada". El
// modo se lee de `Proyecto.modoTrabajo` (vía resolverModoDeTrabajo), NO se
// infiere de la configuración: en Profesional los controles avanzados
// están DISPONIBLES aunque la config activa sea el preset simple
// (Hazen + Estimadas + Simplificada). La configuración técnica completa
// sigue disponible sin perder capacidad del motor (D-δ.47): abierta por
// defecto en Profesional, colapsada en Rápido (experiencia reducida, pero
// alcanzable).
function CabeceraDeModulo2({
  proyecto,
  onCambiar,
}: {
  proyecto: Proyecto
  onCambiar: (proyecto: Proyecto) => void
}) {
  const modo = resolverModoDeTrabajo(proyecto)

  return (
    <section className="ui-stack--sm">
      {modo === 'rapido' ? (
        <p>
          <small>
            IUAS calcula primero con hipótesis típicas: PPR · cálculo habitual (Hazen-Williams) · pérdidas
            localizadas estimadas. Valores iniciales — 5&nbsp;m por Local · 10&nbsp;m alimentación · +3&nbsp;m/piso
            según el nivel de la unidad funcional. <strong>Todos editables.</strong>
          </small>
        </p>
      ) : (
        <p>
          <small>
            Tenés disponibles los controles avanzados de cálculo: método de pérdidas (Hazen-Williams o
            Darcy-Weisbach), pérdidas localizadas estimadas o detalladas por accesorio y tee, y granularidad del
            relevamiento. Empezás en la misma configuración simple que Rápido; cambiar cualquiera de estos controles
            no altera el modo de trabajo.
          </small>
        </p>
      )}
      <details open={modo === 'profesional'}>
        <summary>Configuración avanzada</summary>
        <ConfiguracionHidraulicaFormulario proyecto={proyecto} onCambiar={onCambiar} />
      </details>
    </section>
  )
}

// Método de pérdida distribuida: configuración global y única del
// Proyecto (CRIT-A17/CRIT-A18), no seleccionable por Tramo. Este
// incremento solo persiste la selección -- todavía no dispara ningún
// cálculo de Hazen-Williams ni Darcy-Weisbach.
//
// Método de pérdida LOCALIZADA (D-δ.40): 'detallado'/'estimado' son
// ALTERNATIVOS -- nunca se suman. El cambio de selección no borra
// Tramo.accesorios/Nodo.tee ya declarados (ver conMetodoPerdidaLocalizada);
// solo cambia cuál metodología participa del cálculo activo mostrado más
// abajo (editor de accesorios/tees vs. resumen estimado por Local+red).
function ConfiguracionHidraulicaFormulario({
  proyecto,
  onCambiar,
}: {
  proyecto: Proyecto
  onCambiar: (proyecto: Proyecto) => void
}) {
  // UI-01C (§34): la configuración avanzada se agrupa por CONCEPTOS ya
  // existentes (método de cálculo · geometría de relevamiento · tubería)
  // en vez de una sucesión plana de selects. Sin nuevas categorías de
  // dominio: los mismos cinco controles y updaters.
  return (
    <section className="config-hidraulica">
      <fieldset className="config-hidraulica__grupo">
        <legend>Método de cálculo</legend>
        <label>
          Pérdidas distribuidas:{' '}
          <select
            value={proyecto.configuracionHidraulica.metodoPerdidaDistribuida}
            onChange={(evento) =>
              onCambiar(conMetodoPerdidaDistribuida(proyecto, evento.target.value as MetodoPerdidaDistribuida))
            }
          >
            <option value="hazenWilliams">Hazen-Williams</option>
            <option value="darcyWeisbach">Darcy-Weisbach</option>
          </select>
        </label>
        <label>
          Pérdidas localizadas:{' '}
          <select
            value={proyecto.configuracionHidraulica.metodoPerdidaLocalizada}
            onChange={(evento) =>
              onCambiar(conMetodoPerdidaLocalizada(proyecto, evento.target.value as MetodoPerdidaLocalizada))
            }
          >
            <option value="detallado">Detalladas (relevamiento de accesorios)</option>
            <option value="estimado">Estimadas (cálculo habitual)</option>
          </select>
        </label>
        <details>
          <summary>Parámetros de cálculo</summary>
          <ParametroDeCalculoDelMaterial proyecto={proyecto} />
        </details>
      </fieldset>

      <fieldset className="config-hidraulica__grupo">
        <legend>Geometría de relevamiento</legend>
        <label>
          Granularidad hidráulica:{' '}
          <select
            value={proyecto.configuracionHidraulica.granularidadHidraulica}
            onChange={(evento) =>
              onCambiar(conGranularidadHidraulica(proyecto, evento.target.value as GranularidadHidraulica))
            }
          >
            <option value="simplificada">Simplificada (Local + red)</option>
            <option value="profesional">Profesional (cada tramo real)</option>
          </select>
        </label>
        <p>
          <small>
            Simplificada: longitud y accesorios se cargan una sola vez por Local+red -- los ramales hacia cada
            Artefacto no piden datos propios. Profesional: cada tramo físico real (incluidos los ramales) admite su
            propia longitud y accesorios, para modelar recorridos internos distintos hasta cada Artefacto.
          </small>
        </p>
      </fieldset>

      <fieldset className="config-hidraulica__grupo">
        <legend>Tubería</legend>
        <label>
          Material:{' '}
          <select
            value={proyecto.configuracionHidraulica.materialTuberiaId}
            onChange={(evento) => {
              const conNuevoMaterial = conMaterialTuberia(
                proyecto,
                evento.target.value as MaterialTuberiaId,
                catalogoSistemasDeTuberia,
              )
              // D-δ.52: descartar los overrides de DN que ya no existan en el
              // catálogo del sistema resultante.
              onCambiar(
                normalizarOverridesDeDnSegunSistema(
                  conNuevoMaterial,
                  denominacionesComercialesDelSistema(conNuevoMaterial.configuracionHidraulica.sistemaDeTuberiaId),
                ),
              )
            }}
          >
            {opcionesDeMaterial(proyecto.configuracionHidraulica.materialTuberiaId).map((material) => (
              <option key={material.id} value={material.id}>
                {material.nombre}
              </option>
            ))}
          </select>
        </label>
        <label>
          Sistema:{' '}
          <select
            value={proyecto.configuracionHidraulica.sistemaDeTuberiaId}
            onChange={(evento) => {
              const conNuevoSistema = conSistemaDeTuberia(proyecto, evento.target.value)
              onCambiar(
                normalizarOverridesDeDnSegunSistema(
                  conNuevoSistema,
                  denominacionesComercialesDelSistema(evento.target.value),
                ),
              )
            }}
          >
            {catalogoSistemasDeTuberia.map((sistema) => (
              <option key={sistema.id} value={sistema.id}>
                {sistema.denominacion}
              </option>
            ))}
          </select>
        </label>
      </fieldset>
    </section>
  )
}

// Trazabilidad de presentación (CRIT-A17/CRIT-A18): muestra únicamente el
// parámetro hidráulico del material que corresponde al método actualmente
// seleccionado -- Hazen-Williams usa C, Darcy-Weisbach usa epsilon, nunca
// ambos a la vez. El catálogo (materialTuberia) es la única fuente de C,
// epsilon y sus referencias; este componente no los recalcula ni los
// duplica. Puramente informativo: todavía no alimenta ningún cálculo de
// pérdidas.
function ParametroDeCalculoDelMaterial({ proyecto }: { proyecto: Proyecto }) {
  const material = obtenerMaterialTuberia(proyecto.configuracionHidraulica.materialTuberiaId, catalogoMaterialesTuberia)

  return (
    <div>
      <p>Material: {material.nombre}</p>
      {proyecto.configuracionHidraulica.metodoPerdidaDistribuida === 'hazenWilliams' ? (
        <>
          <p>Coeficiente Hazen-Williams C: {material.coeficienteC}</p>
          <p>Fuente: {material.referenciaFuenteC}</p>
        </>
      ) : (
        <>
          <p>Rugosidad absoluta ε: {material.rugosidadAbsoluta_mm} mm</p>
          <p>Fuente: {material.referenciaFuenteRugosidad}</p>
        </>
      )}
      <p>
        <small>
          Los valores indicados son parámetros técnicos adoptados por el proyecto y no corresponden a una tabla de
          coeficientes publicada por ERAS-2023.
        </small>
      </p>
      <p>
        <small>
          Predimensionamiento: se adopta Ve = 2,0 m/s para la determinación inicial del
          Di teórico. La velocidad real se verificará posteriormente con el DN adoptado
          (y su Di real correspondiente) conforme a ERAS §2.12.1.
        </small>
      </p>
    </div>
  )
}

// Aviso de S1/S2: se muestra en vez de las tablas de resultados hidráulicos
// cuando auditarCoberturaFisica detecta artefactos normativos sin ninguna
// referencia física en redHidraulica -- M2 no debe presentar un resultado
// hidráulico como completo mientras eso ocurra (ver PENDIENTES-DE-ARQUITECTURA.md).
// No repara, no genera topología, no recalcula cobertura con otra lógica.
function AvisoCoberturaIncompleta({
  proyecto,
  catalogoArtefactos,
  pendientes,
}: {
  proyecto: Proyecto
  catalogoArtefactos: readonly ArtefactoNormativo[]
  pendientes: readonly ReferenciaDeArtefacto[]
}) {
  return (
    <section>
      <h3>Red hidráulica incompleta</h3>
      <p>
        {pendientes.length === 1
          ? 'Hay 1 artefacto normativo sin conexión física en la red hidráulica.'
          : `Hay ${pendientes.length} artefactos normativos sin conexión física en la red hidráulica.`}
      </p>
      <ul>
        {pendientes.map((referencia) => (
          <li key={`${referencia.unidadFuncionalId}:${referencia.localId}:${referencia.artefactoId}`}>
            {describirReferenciaPendiente(proyecto, catalogoArtefactos, referencia)}
          </li>
        ))}
      </ul>
    </section>
  )
}

// Distribución general del proyecto (Alimentación general + Alimentación
// ACS): 1-2 filas de la tabla de dimensionamiento (D-δ.51). La longitud es
// la BASE -- en modo rápido el incremento vertical +3 m/piso (D-δ.50) es
// automático y se ve, ya resuelto por camino, en el detalle de presión de
// cada terminal; no se muestra un hf efectivo único acá (engañoso con
// varias UF a distinto nivel, brief §21/§26).
function DistribucionGeneral({
  proyecto,
  catalogoArtefactos,
  onCambiar,
}: {
  proyecto: Proyecto
  catalogoArtefactos: readonly ArtefactoNormativo[]
  onCambiar: (proyecto: Proyecto) => void
}) {
  const filas = identificarFilasDistribucionGeneral(proyecto)
  if (filas.length === 0) {
    return null
  }
  const modoDetallado = proyecto.configuracionHidraulica.metodoPerdidaLocalizada === 'detallado'
  const mostrarNotaVertical = proyecto.configuracionHidraulica.granularidadHidraulica === 'simplificada'

  const entradas: EntradaDeTabla[] = filas.map((fila) => ({
    clave: fila.tramoId,
    etiqueta: fila.etiqueta,
    red: fila.red,
    fila: resolverFilaDeDimensionamiento(proyecto, fila.tramoId, catalogoArtefactos),
    longitudEditable: true,
    onCambiarLongitud: (longitud_m) => onCambiar(conLongitudDeTramo(proyecto, fila.tramoId, longitud_m)),
    controlDn: resolverControlDeDnDeTramo(proyecto, fila.tramoId, catalogoArtefactos),
    onCambiarDnAdoptado: (denominacion) => onCambiar(conDnComercialAdoptadoDeTramo(proyecto, fila.tramoId, denominacion)),
    renderDetalle: modoDetallado
      ? () => (
          <AccesoriosDeTramoEditor
            proyecto={proyecto}
            tramoId={fila.tramoId}
            velocidadReal_mps={resolverResultadoDeTramoParaUi(proyecto, fila.tramoId, catalogoArtefactos).velocidadReal_mps}
            onCambiar={onCambiar}
          />
        )
      : undefined,
  }))

  return (
    <section>
      <h3>Distribución general</h3>
      <TablaDimensionamientoDeModulo2 entradas={entradas} encabezadoTramo="Tramo" />
      {mostrarNotaVertical ? (
        <p style={{ margin: '0.35rem 0 0.5rem' }}>
          <small>
            La longitud es la <strong>base</strong>. En modo rápido se suma +3,00&nbsp;m/piso automáticamente según el
            nivel de cada unidad funcional (convención IUAS); la longitud efectiva por camino se ve en el detalle de
            presión.
          </small>
        </p>
      ) : null}
    </section>
  )
}

// Distribución secundaria (M2-TOPO-B): filas de la tabla de
// dimensionamiento para los Tramos que el motor clasifica como distribución
// compartida (identificarTramosDeDistribucionCompartida vía
// identificarFilasDistribucionSecundaria). Cada fila es UN Tramo físico
// real -- un montante segmentado da varias filas. Reutiliza exactamente los
// mismos componentes/resolvers que Distribución general (misma fuente de
// verdad: resolverFilaDeDimensionamiento / resolverControlDeDnDeTramo /
// AccesoriosDeTramoEditor); no hay cálculo propio en JSX.
//
// - Longitud editable siempre (§9): es una longitud FÍSICA declarada, nunca
//   automática por nivel -- mismo criterio que Distribución general.
// - Sin contexto (unidadFuncionalId/localId): sirve a varios Locales, así
//   que no hay hf localizada estimada ni "N puntos" -- igual que
//   Distribución general.
// - Si hay 0 tramos secundarios NO se renderiza nada (§27): el proyecto de
//   ejemplo (topología plana) no ve ninguna sección nueva.
function DistribucionSecundaria({
  proyecto,
  catalogoArtefactos,
  onCambiar,
}: {
  proyecto: Proyecto
  catalogoArtefactos: readonly ArtefactoNormativo[]
  onCambiar: (proyecto: Proyecto) => void
}) {
  const filas = identificarFilasDistribucionSecundaria(proyecto)
  if (filas.length === 0) {
    return null
  }
  const modoDetallado = proyecto.configuracionHidraulica.metodoPerdidaLocalizada === 'detallado'

  const entradas: EntradaDeTabla[] = filas.map((fila) => ({
    clave: fila.tramoId,
    etiqueta: fila.etiqueta,
    red: fila.red,
    fila: resolverFilaDeDimensionamiento(proyecto, fila.tramoId, catalogoArtefactos),
    longitudEditable: true,
    onCambiarLongitud: (longitud_m) => onCambiar(conLongitudDeTramo(proyecto, fila.tramoId, longitud_m)),
    controlDn: resolverControlDeDnDeTramo(proyecto, fila.tramoId, catalogoArtefactos),
    onCambiarDnAdoptado: (denominacion) => onCambiar(conDnComercialAdoptadoDeTramo(proyecto, fila.tramoId, denominacion)),
    renderDetalle: modoDetallado
      ? () => (
          <AccesoriosDeTramoEditor
            proyecto={proyecto}
            tramoId={fila.tramoId}
            velocidadReal_mps={resolverResultadoDeTramoParaUi(proyecto, fila.tramoId, catalogoArtefactos).velocidadReal_mps}
            onCambiar={onCambiar}
          />
        )
      : undefined,
  }))

  return (
    <section>
      <h3>Distribución secundaria</h3>
      <TablaDimensionamientoDeModulo2 entradas={entradas} encabezadoTramo="Tramo" />
    </section>
  )
}

// Sección de una Unidad Funcional: encabezado (nivel + cota) + tabla con
// una fila por (Local, Red). Detalle expandible por fila -- en Rápido
// artefactos + estimación localizada; en Profesional el árbol de Tramos
// físicos + editores de accesorios/tees (LocalYRedCard sin encabezado ni
// dimensionamiento del representativo, que ya están en la fila).
function SeccionDeUnidadFuncional({
  proyecto,
  uf,
  catalogoArtefactos,
  filasPrincipalesDeLocales,
  onCambiar,
}: {
  proyecto: Proyecto
  uf: Proyecto['unidadesFuncionales'][number]
  catalogoArtefactos: readonly ArtefactoNormativo[]
  filasPrincipalesDeLocales: ReturnType<typeof identificarFilasPrincipalesDeLocales>
  onCambiar: (proyecto: Proyecto) => void
}) {
  const ordinales = derivarOrdinalesDeLocal(uf.locales)
  const esProfesional = proyecto.configuracionHidraulica.granularidadHidraulica === 'profesional'
  const nivelTexto = uf.nivel === undefined ? 'nivel sin clasificar' : nombreDeNivel(uf.nivel)
  const cotaTexto =
    uf.cotaHidraulicaReferencia_m === undefined ? '' : ` · cota ${formatearNumeroM(uf.cotaHidraulicaReferencia_m)}`

  const entradas: EntradaDeTabla[] = uf.locales.flatMap((local) => {
    const ordinal = ordinales.get(local.id)
    const etiquetaLocal = `${ETIQUETA_TIPO_DE_LOCAL[local.tipo]} ${ordinal ?? ''}`.trim()
    return filasPrincipalesDeLocales
      .filter((fila) => fila.unidadFuncionalId === uf.id && fila.localId === local.id)
      .map((fila): EntradaDeTabla => ({
        clave: fila.tramoId,
        etiqueta: etiquetaLocal,
        red: fila.red,
        fila: resolverFilaDeDimensionamiento(proyecto, fila.tramoId, catalogoArtefactos, {
          unidadFuncionalId: uf.id,
          localId: local.id,
          red: fila.red,
        }),
        longitudEditable: !esProfesional,
        onCambiarLongitud: esProfesional
          ? undefined
          : (longitud_m) => onCambiar(conLongitudDeTramo(proyecto, fila.tramoId, longitud_m)),
        controlDn: resolverControlDeDnDeTramo(proyecto, fila.tramoId, catalogoArtefactos),
        onCambiarDnAdoptado: (denominacion) =>
          onCambiar(conDnComercialAdoptadoDeTramo(proyecto, fila.tramoId, denominacion)),
        renderDetalle: () => (
          <LocalYRedCard
            proyecto={proyecto}
            catalogoArtefactos={catalogoArtefactos}
            unidadFuncionalId={uf.id}
            localId={local.id}
            etiquetaLocal={etiquetaLocal}
            red={fila.red}
            tramoPrincipalId={fila.tramoId}
            mostrarEncabezado={false}
            mostrarDimensionamientoDelRepresentativo={esProfesional}
            onCambiar={onCambiar}
          />
        ),
      }))
  })

  return (
    <section>
      <h3>
        {uf.nombre} · {nivelTexto}
        {cotaTexto}
      </h3>
      <TablaDimensionamientoDeModulo2 entradas={entradas} encabezadoTramo="Local" />
    </section>
  )
}

function formatearNumeroM(valor: number): string {
  return `${valor.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`
}

export function ResultadoHidraulicoDeTramo({
  proyecto,
  catalogoArtefactos,
  onCambiar,
}: {
  proyecto: Proyecto
  catalogoArtefactos: readonly ArtefactoNormativo[]
  onCambiar: (proyecto: Proyecto) => void
}) {
  const tramos = proyecto.redHidraulica?.tramos ?? []
  const filasPrincipalesDeLocales = identificarFilasPrincipalesDeLocales(proyecto)
  const auditoria = auditarCoberturaFisica(proyecto)

  return (
    <details open>
      {/* UI-01A (D-δ.72): esta sección queda centrada en el
          DIMENSIONAMIENTO. La verificación de presión se movió a la etapa
          final "Verificación hidráulica" (sigue siendo dominio M2). */}
      <summary className="etapa-cabecera">
        <EncabezadoDeEtapa numero={2} titulo="Tuberías" descripcion="Dimensionamiento hidráulico de la red" />
      </summary>

      <CabeceraDeModulo2 proyecto={proyecto} onCambiar={onCambiar} />

      {tramos.length === 0 ? (
        <p>El proyecto no tiene una red hidráulica cargada.</p>
      ) : !auditoria.completa ? (
        <AvisoCoberturaIncompleta
          proyecto={proyecto}
          catalogoArtefactos={catalogoArtefactos}
          pendientes={auditoria.artefactosSinReferencia}
        />
      ) : (
        <>
          <DistribucionGeneral proyecto={proyecto} catalogoArtefactos={catalogoArtefactos} onCambiar={onCambiar} />

          <DistribucionSecundaria proyecto={proyecto} catalogoArtefactos={catalogoArtefactos} onCambiar={onCambiar} />

          <ConstructorDeMontantes
            proyecto={proyecto}
            catalogoArtefactos={catalogoArtefactos}
            onCambiar={onCambiar}
          />

          {proyecto.unidadesFuncionales.map((uf) => (
            <SeccionDeUnidadFuncional
              key={uf.id}
              proyecto={proyecto}
              uf={uf}
              catalogoArtefactos={catalogoArtefactos}
              filasPrincipalesDeLocales={filasPrincipalesDeLocales}
              onCambiar={onCambiar}
            />
          ))}
        </>
      )}
    </details>
  )
}
