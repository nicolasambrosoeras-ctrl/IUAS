// Tarjeta de un (Local, Red) -- unidad de trabajo de Módulo 2 (D-δ.43):
// reemplaza la tabla ancha por Local + la sección global "Tees
// (bifurcaciones)" por una representación donde toda la infraestructura
// de ese Local+Red (tramo de alimentación, tees, ramales hacia cada
// Artefacto) vive junta, con nombres humanos -- nunca ids de Tramo/Nodo.
//
// Modo detallado: recorre construirArbolDeLocal (topología real, no
// heurística) y en cada nivel muestra Dimensionamiento (Qc/DN/V) +
// accesorios de ESE tramo; los nodos de bifurcación real (CRIT-A31, 1
// entrante + 2 salientes) muestran el editor de tee inline. Un Nodo con
// más de 2 salientes (manifold plano, sin tee que declarar bajo el
// alcance actual) simplemente aparece con más de 2 ramales, sin editor de
// tee -- no es una limitación de este componente, es el alcance ya
// cerrado de CRIT-A31.
//
// GranularidadHidraulica (D-δ.44, corrección de granularidad de D-δ.43):
// ORTOGONAL al modo detallado/estimado -- decide, DENTRO del modo
// detallado, si Longitud/Accesorios se piden por cada Tramo real (
// 'profesional', comportamiento sin cambios) o solo sobre el Tramo
// representativo del Local+red ('simplificada', la unidad de
// relevamiento físico aprobada). En 'simplificada' los ramales
// terminales NUNCA muestran su propio input de Longitud ni su propio
// editor de Accesorios -- solo aparecen listados por nombre
// ("Distribución: Lavatorio, Ducha, ...") y, si corresponde, con su tee
// inline (CRIT-A31 no depende de la granularidad: la tee sigue
// configurándose y aportando Ks por rama real en ambos modos).
//
// Modo estimado: sin editor de accesorios/tees (D-δ.40 ya cerró que
// mostrarlo ahí sugeriría falsamente que esa geometría participa del
// cálculo activo) -- solo el resumen agregado de
// resolverPerdidaLocalizadaEstimadaDeLocal. GranularidadHidraulica no
// aplica acá (ya es Local+red, D-δ.40 nunca tuvo relevamiento por
// Artefacto).
import type { GranularidadHidraulica, Proyecto } from '../../modelo/proyecto'
import type { RedDeTramo } from '../../modelo/redHidraulica'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import { catalogoSistemasDeTuberia } from '../../motor/tuberias/sistemaDeTuberia'
import { contarTerminalesFisicosDeLocal } from '../../motor/tuberias/topologia/contarTerminalesFisicosDeLocal'
import { resolverPerdidaLocalizadaEstimadaDeLocal } from '../../motor/tuberias/presion/resolverPerdidaLocalizadaEstimadaDeLocal'
import { formatearNumero } from '../../exportadores/pdf/formatearNumero'
import { ETIQUETA_RED, nombresDeArtefactosAguasAbajo } from './humanizarModulo2'
import { construirArbolDeLocal, type NodoDelArbolDeLocal } from './construirArbolDeLocal'
import { resolverResultadoDeTramoParaUi } from './resolverResultadoDeTramoParaUi'
import { DimensionamientoDeTramo } from './DimensionamientoDeTramo'
import { AccesoriosDeTramoEditor } from './AccesoriosDeTramoEditor'
import { TeeDeNodoEditor } from './TeeDeNodoEditor'
import { conLongitudDeTramo } from './actualizarRedHidraulica'

const estiloCard = {
  border: '1px solid #ddd',
  borderRadius: '0.5rem',
  padding: '0.75rem 1rem',
  marginBottom: '1rem',
}

function SeccionDeTeeInline({
  proyecto,
  catalogoArtefactos,
  nodo,
  onCambiar,
}: {
  proyecto: Proyecto
  catalogoArtefactos: readonly ArtefactoNormativo[]
  nodo: NodoDelArbolDeLocal
  onCambiar: (proyecto: Proyecto) => void
}) {
  if (nodo.bifurcacion === undefined) {
    return null
  }
  return (
    <div style={{ marginLeft: '1rem', marginTop: '0.5rem' }}>
      <strong>Tee</strong>
      <TeeDeNodoEditor
        proyecto={proyecto}
        nodoDeBifurcacion={nodo.bifurcacion}
        etiquetasDeSalida={Object.fromEntries(
          nodo.bifurcacion.tramosSalientesIds.map((tramoSalienteId) => [
            tramoSalienteId,
            nombresDeArtefactosAguasAbajo(proyecto, catalogoArtefactos, tramoSalienteId),
          ]),
        )}
        onCambiar={onCambiar}
      />
    </div>
  )
}

// Granularidad 'simplificada' (D-δ.44): recorre los Nodos más profundos
// que el representativo SOLO para encontrar tees reales que configurar
// (CRIT-A31 no depende de la granularidad) -- nunca muestra
// Dimensionamiento ni Accesorios de esos Nodos, ni siquiera cuando son
// terminales. No es un árbol distinto: es la misma
// construirArbolDeLocal, presentada distinto.
function RamalesSimplificados({
  proyecto,
  catalogoArtefactos,
  nodo,
  onCambiar,
}: {
  proyecto: Proyecto
  catalogoArtefactos: readonly ArtefactoNormativo[]
  nodo: NodoDelArbolDeLocal
  onCambiar: (proyecto: Proyecto) => void
}) {
  return (
    <>
      <SeccionDeTeeInline proyecto={proyecto} catalogoArtefactos={catalogoArtefactos} nodo={nodo} onCambiar={onCambiar} />
      {nodo.hijos.map((hijo) => (
        <RamalesSimplificados
          key={hijo.tramoId}
          proyecto={proyecto}
          catalogoArtefactos={catalogoArtefactos}
          nodo={hijo}
          onCambiar={onCambiar}
        />
      ))}
    </>
  )
}

function NodoDeArbol({
  proyecto,
  catalogoArtefactos,
  red,
  nodo,
  esRaiz,
  granularidadHidraulica,
  onCambiar,
}: {
  proyecto: Proyecto
  catalogoArtefactos: readonly ArtefactoNormativo[]
  red: RedDeTramo
  nodo: NodoDelArbolDeLocal
  esRaiz: boolean
  granularidadHidraulica: GranularidadHidraulica
  onCambiar: (proyecto: Proyecto) => void
}) {
  const resultado = resolverResultadoDeTramoParaUi(proyecto, nodo.tramoId, catalogoArtefactos)
  const tramoActual = proyecto.redHidraulica?.tramos.find((tramo) => tramo.id === nodo.tramoId)

  let etiqueta: string
  if (esRaiz) {
    etiqueta = nodo.hijos.length > 0 ? 'Tramo de alimentación' : 'Dimensionamiento'
  } else if (nodo.esTerminal) {
    etiqueta = `Ramal ${nombresDeArtefactosAguasAbajo(proyecto, catalogoArtefactos, nodo.tramoId)}`
  } else {
    etiqueta = `Distribución hacia ${nombresDeArtefactosAguasAbajo(proyecto, catalogoArtefactos, nodo.tramoId)}`
  }

  return (
    <div style={{ marginLeft: esRaiz ? 0 : '1rem', marginTop: '0.5rem' }}>
      <DimensionamientoDeTramo
        etiqueta={etiqueta}
        red={red}
        resultado={resultado}
        longitud_m={tramoActual?.longitud_m}
        onCambiarLongitud={(longitud_m) => onCambiar(conLongitudDeTramo(proyecto, nodo.tramoId, longitud_m))}
      />
      <AccesoriosDeTramoEditor
        proyecto={proyecto}
        tramoId={nodo.tramoId}
        velocidadReal_mps={resultado.velocidadReal_mps}
        onCambiar={onCambiar}
      />
      <SeccionDeTeeInline proyecto={proyecto} catalogoArtefactos={catalogoArtefactos} nodo={nodo} onCambiar={onCambiar} />
      {granularidadHidraulica === 'simplificada'
        ? nodo.hijos.map((hijo) => (
            <RamalesSimplificados
              key={hijo.tramoId}
              proyecto={proyecto}
              catalogoArtefactos={catalogoArtefactos}
              nodo={hijo}
              onCambiar={onCambiar}
            />
          ))
        : nodo.hijos.map((hijo) => (
            <NodoDeArbol
              key={hijo.tramoId}
              proyecto={proyecto}
              catalogoArtefactos={catalogoArtefactos}
              red={red}
              nodo={hijo}
              esRaiz={false}
              granularidadHidraulica={granularidadHidraulica}
              onCambiar={onCambiar}
            />
          ))}
    </div>
  )
}

// Lista de destinos del Local+red bajo granularidad 'simplificada' -- el
// usuario nunca necesita el desglose por Tramo (D-δ.44): solo qué
// Artefactos alcanza esta red. Se deriva de la topología real
// (obtenerArtefactosAguasAbajo vía nombresDeArtefactosAguasAbajo), nunca
// listada a mano.
function ListaDeDistribucion({
  proyecto,
  catalogoArtefactos,
  tramoPrincipalId,
}: {
  proyecto: Proyecto
  catalogoArtefactos: readonly ArtefactoNormativo[]
  tramoPrincipalId: string
}) {
  const nombres = nombresDeArtefactosAguasAbajo(proyecto, catalogoArtefactos, tramoPrincipalId)
    .split(', ')
    .filter((nombre) => nombre.length > 0)
  if (nombres.length === 0) {
    return null
  }
  return (
    <div style={{ marginTop: '0.5rem' }}>
      <strong>Distribución</strong>
      <ul style={{ margin: '0.25rem 0' }}>
        {nombres.map((nombre) => (
          <li key={nombre}>{nombre}</li>
        ))}
      </ul>
    </div>
  )
}

function ResumenEstimadoDeLocal({
  proyecto,
  catalogoArtefactos,
  unidadFuncionalId,
  localId,
  red,
}: {
  proyecto: Proyecto
  catalogoArtefactos: readonly ArtefactoNormativo[]
  unidadFuncionalId: string
  localId: string
  red: RedDeTramo
}) {
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    return null
  }
  const n = contarTerminalesFisicosDeLocal(redHidraulica, unidadFuncionalId, localId, red)
  if (n === 0) {
    return null
  }
  const resultado = resolverPerdidaLocalizadaEstimadaDeLocal(
    proyecto,
    unidadFuncionalId,
    localId,
    red,
    catalogoArtefactos,
    catalogoSistemasDeTuberia,
  )

  if (resultado.tipo === 'incompleta') {
    return (
      <p>
        Pérdida localizada estimada incompleta: {resultado.tramosNoResueltos.length} tramo(s) sin velocidad
        comercial resoluble.
      </p>
    )
  }

  return (
    <div>
      <p>
        <small>Pérdidas localizadas: Estimadas</small>
      </p>
      <p>
        {formatearNumero(resultado.nTerminalesLocal, 'conteo')} terminales · {formatearNumero(resultado.nTeesEstimadas, 'conteo')}{' '}
        tees estimadas · hf localizada: {formatearNumero(resultado.hf_m, 'm')} m.c.a.
      </p>
      <details>
        <summary>Ver cálculo</summary>
        <p>Ks por tee estimada: 3,00</p>
        <p>V referencia: {formatearNumero(resultado.velocidadReferencia_mps, 'm/s')} m/s (máxima velocidad real entre los tramos que alimentan directamente los terminales de este Local+red)</p>
        <p>Cobertura: estimada (completa dentro de esta metodología)</p>
      </details>
    </div>
  )
}

export function LocalYRedCard({
  proyecto,
  catalogoArtefactos,
  unidadFuncionalId,
  localId,
  etiquetaLocal,
  red,
  tramoPrincipalId,
  onCambiar,
}: {
  proyecto: Proyecto
  catalogoArtefactos: readonly ArtefactoNormativo[]
  unidadFuncionalId: string
  localId: string
  etiquetaLocal: string
  red: RedDeTramo
  tramoPrincipalId: string
  onCambiar: (proyecto: Proyecto) => void
}) {
  const modoDetallado = proyecto.configuracionHidraulica.metodoPerdidaLocalizada === 'detallado'
  const granularidadHidraulica = proyecto.configuracionHidraulica.granularidadHidraulica

  return (
    <article style={estiloCard}>
      <h4>
        {etiquetaLocal} — {ETIQUETA_RED[red]}
      </h4>
      {modoDetallado ? (
        proyecto.redHidraulica !== undefined ? (
          <>
            <NodoDeArbol
              proyecto={proyecto}
              catalogoArtefactos={catalogoArtefactos}
              red={red}
              nodo={construirArbolDeLocal(proyecto.redHidraulica, tramoPrincipalId)}
              esRaiz
              granularidadHidraulica={granularidadHidraulica}
              onCambiar={onCambiar}
            />
            {granularidadHidraulica === 'simplificada' ? (
              <ListaDeDistribucion
                proyecto={proyecto}
                catalogoArtefactos={catalogoArtefactos}
                tramoPrincipalId={tramoPrincipalId}
              />
            ) : null}
          </>
        ) : null
      ) : (
        <ResumenEstimadoDeLocal
          proyecto={proyecto}
          catalogoArtefactos={catalogoArtefactos}
          unidadFuncionalId={unidadFuncionalId}
          localId={localId}
          red={red}
        />
      )}
    </article>
  )
}
