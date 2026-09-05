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
import { catalogoMaterialesTuberia, obtenerMaterialTuberia } from '../../motor/tuberias/materialTuberia'
import { catalogoSistemasDeTuberia } from '../../motor/tuberias/sistemaDeTuberia'
import { resolverArtefactosReferenciados } from '../../motor/tuberias/topologia/resolverArtefactosReferenciados'
import { auditarCoberturaFisica } from '../../motor/tuberias/cobertura/auditarCoberturaFisica'
import {
  derivarOrdinalesDeLocal,
  identificarFilasDistribucionGeneral,
  identificarFilasPrincipalesDeLocales,
} from './identificarFilasDeModulo2'
import {
  conGranularidadHidraulica,
  conMaterialTuberia,
  conMetodoPerdidaDistribuida,
  conMetodoPerdidaLocalizada,
  conSistemaDeTuberia,
} from './actualizarConfiguracionHidraulica'
import { conLongitudDeTramo } from './actualizarRedHidraulica'
import { resolverResultadoDeTramoParaUi } from './resolverResultadoDeTramoParaUi'
import { DimensionamientoDeTramo } from './DimensionamientoDeTramo'
import { AccesoriosDeTramoEditor } from './AccesoriosDeTramoEditor'
import { LocalYRedCard } from './LocalYRedCard'
import { PanelDePresionDeModulo2 } from './PanelDePresionDeModulo2'

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
  return (
    <section>
      <h3>Configuración hidráulica</h3>
      <label>
        Método de cálculo de pérdidas distribuidas:{' '}
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
      <label>
        Material de la tubería:{' '}
        <select
          value={proyecto.configuracionHidraulica.materialTuberiaId}
          onChange={(evento) => onCambiar(conMaterialTuberia(proyecto, evento.target.value as MaterialTuberiaId))}
        >
          {catalogoMaterialesTuberia.map((material) => (
            <option key={material.id} value={material.id}>
              {material.nombre}
            </option>
          ))}
        </select>
      </label>
      <label>
        Sistema de tubería:{' '}
        <select
          value={proyecto.configuracionHidraulica.sistemaDeTuberiaId}
          onChange={(evento) => onCambiar(conSistemaDeTuberia(proyecto, evento.target.value))}
        >
          {catalogoSistemasDeTuberia.map((sistema) => (
            <option key={sistema.id} value={sistema.id}>
              {sistema.denominacion}
            </option>
          ))}
        </select>
      </label>
      <details>
        <summary>Parámetros de cálculo</summary>
        <ParametroDeCalculoDelMaterial proyecto={proyecto} />
      </details>
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

// Distribución general del proyecto (alimentación general + alimentación
// ACS): siempre 1-2 filas, así que un listado compacto alcanza sin
// necesidad de tabla ancha (ver DimensionamientoDeTramo).
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

  return (
    <section>
      <h3>Distribución general</h3>
      {filas.map((fila) => {
        const resultado = resolverResultadoDeTramoParaUi(proyecto, fila.tramoId, catalogoArtefactos)
        return (
          <div key={fila.tramoId}>
            <DimensionamientoDeTramo
              etiqueta={fila.etiqueta}
              red={fila.red}
              resultado={resultado}
              longitud_m={proyecto.redHidraulica?.tramos.find((tramo) => tramo.id === fila.tramoId)?.longitud_m}
              onCambiarLongitud={(longitud_m) => onCambiar(conLongitudDeTramo(proyecto, fila.tramoId, longitud_m))}
            />
            {modoDetallado ? (
              <AccesoriosDeTramoEditor
                proyecto={proyecto}
                tramoId={fila.tramoId}
                velocidadReal_mps={resultado.velocidadReal_mps}
                onCambiar={onCambiar}
              />
            ) : null}
          </div>
        )
      })}
    </section>
  )
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
      <summary>
        <h2>Módulo 2 — Tuberías</h2>
      </summary>

      <ConfiguracionHidraulicaFormulario proyecto={proyecto} onCambiar={onCambiar} />

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

          {proyecto.unidadesFuncionales.map((uf) => {
            const ordinales = derivarOrdinalesDeLocal(uf.locales)
            return (
              <section key={uf.id}>
                <h3>{uf.nombre}</h3>
                {uf.locales.map((local) => {
                  const ordinal = ordinales.get(local.id)
                  const etiquetaLocal = `${ETIQUETA_TIPO_DE_LOCAL[local.tipo]} ${ordinal ?? ''}`.trim()
                  const filasDelLocal = filasPrincipalesDeLocales.filter(
                    (fila) => fila.unidadFuncionalId === uf.id && fila.localId === local.id,
                  )
                  return filasDelLocal.map((fila) => (
                    <LocalYRedCard
                      key={fila.tramoId}
                      proyecto={proyecto}
                      catalogoArtefactos={catalogoArtefactos}
                      unidadFuncionalId={uf.id}
                      localId={local.id}
                      etiquetaLocal={etiquetaLocal}
                      red={fila.red}
                      tramoPrincipalId={fila.tramoId}
                      onCambiar={onCambiar}
                    />
                  ))
                })}
              </section>
            )
          })}

          <PanelDePresionDeModulo2 proyecto={proyecto} catalogoArtefactos={catalogoArtefactos} onCambiar={onCambiar} />
        </>
      )}
    </details>
  )
}
