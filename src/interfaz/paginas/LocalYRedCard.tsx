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
// Modo estimado: sin editor de accesorios/tees (D-δ.40 ya cerró que
// mostrarlo ahí sugeriría falsamente que esa geometría participa del
// cálculo activo) -- solo el resumen agregado de
// resolverPerdidaLocalizadaEstimadaDeLocal.
import type { Proyecto } from '../../modelo/proyecto'
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

function NodoDeArbol({
  proyecto,
  catalogoArtefactos,
  red,
  nodo,
  esRaiz,
  onCambiar,
}: {
  proyecto: Proyecto
  catalogoArtefactos: readonly ArtefactoNormativo[]
  red: RedDeTramo
  nodo: NodoDelArbolDeLocal
  esRaiz: boolean
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
      {nodo.bifurcacion !== undefined ? (
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
      ) : null}
      {nodo.hijos.map((hijo) => (
        <NodoDeArbol
          key={hijo.tramoId}
          proyecto={proyecto}
          catalogoArtefactos={catalogoArtefactos}
          red={red}
          nodo={hijo}
          esRaiz={false}
          onCambiar={onCambiar}
        />
      ))}
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

  return (
    <article style={estiloCard}>
      <h4>
        {etiquetaLocal} — {ETIQUETA_RED[red]}
      </h4>
      {modoDetallado ? (
        proyecto.redHidraulica !== undefined ? (
          <NodoDeArbol
            proyecto={proyecto}
            catalogoArtefactos={catalogoArtefactos}
            red={red}
            nodo={construirArbolDeLocal(proyecto.redHidraulica, tramoPrincipalId)}
            esRaiz
            onCambiar={onCambiar}
          />
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
