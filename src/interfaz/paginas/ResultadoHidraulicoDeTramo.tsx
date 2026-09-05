// Visualización de Módulo 2 (hidráulica por Tramo) en la pantalla técnica:
// dos niveles de lectura -- Distribución general del proyecto, y Local+Red
// dentro de cada Unidad Funcional -- en vez de una tabla plana con todos
// los Tramos (incluidos terminales). Este NO es el rediseño definitivo de
// la aplicación: es exclusivamente una mejora de legibilidad técnica sobre
// la topología ya correcta. Los Tramos que esta vista no muestra (ramas
// terminales hacia cada Artefacto individual) siguen existiendo íntegros
// en RedHidraulica -- ver identificarFilasDeModulo2.ts, que decide
// estructuralmente (sin heurística de string de id) qué Tramos son
// "principales" para esta vista. Extraído de MotorDemandaPantalla.tsx
// únicamente por legibilidad -- misma razón que duplicarUnidadFuncional.ts,
// no una abstracción nueva. Solo se renderiza cuando el Proyecto ya pasó
// validarProyecto (gate en MotorDemandaPantalla), así que redHidraulica,
// si existe, ya es estructuralmente válida y sus referencias a Artefactos
// ya existen.
import type { CSSProperties } from 'react'
import type { MaterialTuberiaId, MetodoPerdidaDistribuida, MetodoPerdidaLocalizada, Proyecto, TipoDeLocal } from '../../modelo/proyecto'
import type { ReferenciaDeArtefacto, RedDeTramo } from '../../modelo/redHidraulica'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import { catalogoMaterialesTuberia, obtenerMaterialTuberia } from '../../motor/tuberias/materialTuberia'
import { catalogoSistemasDeTuberia } from '../../motor/tuberias/sistemaDeTuberia'
import { resolverPerdidaDistribuidaDeTramo } from '../../motor/tuberias/resolverPerdidaDistribuidaDeTramo'
import type { ResultadoPerdidaDistribuidaDeTramo } from '../../motor/tuberias/resolverPerdidaDistribuidaDeTramo'
import type { ResultadoVerificacionVelocidad } from '../../motor/tuberias/velocidad/verificarVelocidadAdmisible'
import { obtenerArtefactosAguasAbajo } from '../../motor/tuberias/topologia/obtenerArtefactosAguasAbajo'
import { resolverArtefactosReferenciados } from '../../motor/tuberias/topologia/resolverArtefactosReferenciados'
import { auditarCoberturaFisica } from '../../motor/tuberias/cobertura/auditarCoberturaFisica'
import { formatearNumero } from '../../exportadores/pdf/formatearNumero'
import {
  derivarOrdinalesDeLocal,
  identificarFilasDistribucionGeneral,
  identificarFilasPrincipalesDeLocales,
} from './identificarFilasDeModulo2'
import {
  conMaterialTuberia,
  conMetodoPerdidaDistribuida,
  conMetodoPerdidaLocalizada,
  conSistemaDeTuberia,
} from './actualizarConfiguracionHidraulica'
import { conLongitudDeTramo } from './actualizarRedHidraulica'
import { AccesoriosDeTramoEditor } from './AccesoriosDeTramoEditor'
import { TeeDeNodoEditor } from './TeeDeNodoEditor'
import { identificarNodosDeBifurcacion } from '../../motor/tuberias/topologia/identificarNodosDeBifurcacion'
import { contarTerminalesFisicosDeLocal } from '../../motor/tuberias/topologia/contarTerminalesFisicosDeLocal'
import { resolverPerdidaLocalizadaEstimadaDeLocal } from '../../motor/tuberias/presion/resolverPerdidaLocalizadaEstimadaDeLocal'
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

// Texto de presentación de las 4 variantes de ResultadoPerdidaDistribuidaDeTramo
// (N3), sin recalcular nada -- lee exclusivamente los campos que el motor ya
// devuelve. '—' para cualquier dato no aplicable en esa variante (nunca 0,
// nunca inventado): sinDemanda no tiene diámetro/velocidad/hf;
// sinCandidatoAdmisible no tiene candidato comercial; sinLongitud tiene todo
// menos hf (Tramo.longitud_m ausente, CRIT-A20 -- no se asume 0 ni se deriva).
//
// velocidadPorDebajoDelMinimo (D-delta.27) y verificacionVelocidad (CRIT-A19)
// se leen tal cual del motor, nunca reinterpretados ni recalculados. Ambos
// SÍ se muestran (Vmin/Vmax aplicables y el resultado de verificación) --
// pero con una distinción deliberada de UX (no de cálculo): cuando
// velocidadPorDebajoDelMinimo es true, el texto de verificación NUNCA dice
// "no admisible" ni usa lenguaje de advertencia accionable. D-delta.27 solo
// activa ese flag exactamente en el caso terminal de CRIT-A24 (el menor
// diámetro comercial normativamente evaluable, sin ningún diámetro mayor
// que pudiera corregirlo -- V decrece monótonamente con Di a Qc fijo, ver
// resolverDiametroComercialDeTramo.ts): no hay ninguna acción de
// dimensionamiento que el proyectista pueda tomar para evitarlo, así que
// se presenta como aceptación normativa explícita (CRIT-A24), no como una
// advertencia. Vmax sigue siendo una condición dura sin excepción, sin
// cambios acá -- un noAdmisible por exceso de Vmax (fuera del fallback de
// Vmin) sí se muestra como tal.
export interface TextosDePerdidaDistribuidaDeTramo {
  readonly qcTexto: string
  readonly diReferenciaTexto: string
  readonly diComercialTexto: string
  readonly diEfectivoTexto: string
  readonly vTexto: string
  readonly limiteVelocidadTexto: string
  readonly verificacionVelocidadTexto: string
  readonly velocidadPorDebajoDelMinimo: boolean
  readonly hfTexto: string
}

function textoLimiteVelocidad(verificacion: ResultadoVerificacionVelocidad): string {
  if (verificacion.tipo === 'fueraDeDominioNormativo') {
    return '—'
  }
  return `${formatearNumero(verificacion.limiteMinimo_mps, 'm/s')} – ${formatearNumero(verificacion.limiteMaximo_mps, 'm/s')}`
}

// D-delta.27: mientras velocidadPorDebajoDelMinimo sea true, el texto NUNCA
// es de advertencia ("no admisible"), independientemente de lo que diga
// verificacionVelocidad -- es exactamente el caso terminal de CRIT-A24
// (ver comentario de archivo). Fuera de ese caso, verificacionVelocidad ya
// es siempre 'admisible' en la práctica (garantía de resolverPerdidaDistribuidaDeTramo),
// pero esta función igual cubre 'noAdmisible'/'fueraDeDominioNormativo'
// defensivamente, sin asumirlo.
function textoVerificacionVelocidad(
  verificacion: ResultadoVerificacionVelocidad,
  velocidadPorDebajoDelMinimo: boolean,
): string {
  if (velocidadPorDebajoDelMinimo) {
    return 'Aceptada en el menor diámetro comercial (CRIT-A24)'
  }
  if (verificacion.tipo === 'admisible') {
    return 'Admisible'
  }
  if (verificacion.tipo === 'noAdmisible') {
    return 'No admisible'
  }
  return 'Fuera de dominio normativo'
}

export function textosDePerdidaDistribuidaDeTramo(
  resultado: ResultadoPerdidaDistribuidaDeTramo,
): TextosDePerdidaDistribuidaDeTramo {
  const qcTexto = formatearNumero(resultado.qc_lps, 'l/s')

  if (resultado.tipo === 'sinDemanda') {
    return {
      qcTexto,
      diReferenciaTexto: '—',
      diComercialTexto: '—',
      diEfectivoTexto: '—',
      vTexto: '—',
      limiteVelocidadTexto: '—',
      verificacionVelocidadTexto: '—',
      velocidadPorDebajoDelMinimo: false,
      hfTexto: '—',
    }
  }

  const diReferenciaTexto = formatearNumero(resultado.diReferenciaPredimensionamiento_mm, 'mm')

  if (resultado.tipo === 'sinCandidatoAdmisible') {
    return {
      qcTexto,
      diReferenciaTexto,
      diComercialTexto: '—',
      diEfectivoTexto: '—',
      vTexto: '—',
      limiteVelocidadTexto: '—',
      verificacionVelocidadTexto: '—',
      velocidadPorDebajoDelMinimo: false,
      hfTexto: '—',
    }
  }

  const diComercialTexto = resultado.candidato.denominacionComercial
  const diEfectivoTexto = formatearNumero(resultado.candidato.diametroInteriorEfectivo_mm, 'mm')
  const vTexto = formatearNumero(resultado.velocidadReal_mps, 'm/s')
  const { velocidadPorDebajoDelMinimo, verificacionVelocidad } = resultado
  const limiteVelocidadTexto = textoLimiteVelocidad(verificacionVelocidad)
  const verificacionVelocidadTexto = textoVerificacionVelocidad(verificacionVelocidad, velocidadPorDebajoDelMinimo)

  if (resultado.tipo === 'sinLongitud') {
    return {
      qcTexto,
      diReferenciaTexto,
      diComercialTexto,
      diEfectivoTexto,
      vTexto,
      limiteVelocidadTexto,
      verificacionVelocidadTexto,
      velocidadPorDebajoDelMinimo,
      hfTexto: '—',
    }
  }

  return {
    qcTexto,
    diReferenciaTexto,
    diComercialTexto,
    diEfectivoTexto,
    vTexto,
    limiteVelocidadTexto,
    verificacionVelocidadTexto,
    velocidadPorDebajoDelMinimo,
    hfTexto: formatearNumero(resultado.hf_m, 'm'),
  }
}

// Decisión pura del <input> de Longitud [m] ante un cambio de texto --
// extraída de FilaResultado para poder testearla sin DOM/jsdom (mismo
// criterio que el resto de las funciones exportadas-solo-para-test de
// este archivo). Nunca produce un resultado con longitud_m<0: ni un
// negativo tipeado directamente, ni el alcanzado bajando con la flecha
// del input numérico desde 0 (el navegador dispara onChange con texto
// "-1" en ese caso) terminan en 'establecer'. `min={0}` en el <input> es
// una ayuda de UI, no la única defensa -- esta función es la que decide
// qué llega efectivamente al modelo.
// longitud_m=0 SÍ es un resultado 'establecer' válido acá (mecánicamente
// ingresable): CRIT-A20 (longitud_m>0) sigue siendo la única fuente de
// verdad sobre esa regla física, vía validarRedHidraulica -- este input
// no la duplica ni la anticipa.
export type ResultadoDeCambioDeLongitud =
  | { readonly tipo: 'omitir' } // campo vacío: "no informada", nunca 0
  | { readonly tipo: 'establecer'; readonly longitud_m: number }
  | { readonly tipo: 'ignorar' } // NaN o negativo: no se persiste ningún cambio

export function resolverCambioDeLongitud(texto: string): ResultadoDeCambioDeLongitud {
  if (texto === '') {
    return { tipo: 'omitir' }
  }
  const longitud_m = Number(texto)
  if (Number.isNaN(longitud_m) || longitud_m < 0) {
    return { tipo: 'ignorar' }
  }
  return { tipo: 'establecer', longitud_m }
}

// Estilos locales mínimos -- el proyecto no tiene hoja de estilos (ver
// index.html/main.tsx): mismo patrón ya usado en el archivo (style={{...}}
// puntual), solo que acá se comparte entre encabezado y filas para que la
// alineación de cada columna no se desincronice entre ambos.
function estiloEncabezado(alineacion: CSSProperties['textAlign']): CSSProperties {
  return {
    padding: '0.5rem 0.9rem',
    textAlign: alineacion,
    borderBottom: '2px solid #333',
    fontWeight: 'bold',
    whiteSpace: 'nowrap',
  }
}

function estiloCelda(alineacion: CSSProperties['textAlign'], ajustable = false): CSSProperties {
  return {
    padding: '0.4rem 0.9rem',
    textAlign: alineacion,
    borderBottom: '1px solid #ddd',
    whiteSpace: ajustable ? undefined : 'nowrap',
  }
}

type FilaDeTabla = {
  readonly etiqueta: string
  readonly red: RedDeTramo
  readonly tramoId: string
}

// Exportado únicamente para el test de UI (renderToStaticMarkup) que
// verifica que la advertencia de velocidadPorDebajoDelMinimo ya no se
// renderiza -- mismo criterio de exportar-solo-para-test que
// textosDePerdidaDistribuidaDeTramo/describirReferenciaPendiente arriba.
export function FilaResultado({
  proyecto,
  catalogoArtefactos,
  fila,
  onCambiar,
}: {
  proyecto: Proyecto
  catalogoArtefactos: readonly ArtefactoNormativo[]
  fila: FilaDeTabla
  onCambiar: (proyecto: Proyecto) => void
}) {
  let errorDelMotor: string | null = null
  let artefactosTexto: string
  let nTexto: string
  let textos: TextosDePerdidaDistribuidaDeTramo
  // Velocidad real cruda (no formateada): la necesita AccesoriosDeTramoEditor
  // para calcular la pérdida localizada de este tramo, sin que ese
  // componente tenga que volver a resolver el diámetro comercial.
  let velocidadReal_mps: number | undefined

  try {
    const referencias = obtenerArtefactosAguasAbajo(proyecto, fila.tramoId)
    artefactosTexto = formatearNumero(referencias.length, 'conteo')

    const resultadoPerdida = resolverPerdidaDistribuidaDeTramo(
      proyecto,
      fila.tramoId,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )
    // n hidraulico efectivo: ahora expuesto directamente por
    // ResultadoPerdidaDistribuidaDeTramo (N3, D-delta.34) -- ya no hace
    // falta una segunda llamada a resolverHidraulicaDeTramo solo para
    // leerlo.
    nTexto = resultadoPerdida.tipo === 'sinDemanda' ? '—' : formatearNumero(resultadoPerdida.n, 'conteo')
    textos = textosDePerdidaDistribuidaDeTramo(resultadoPerdida)
    velocidadReal_mps =
      resultadoPerdida.tipo === 'sinLongitud' || resultadoPerdida.tipo === 'conPerdidaDistribuida'
        ? resultadoPerdida.velocidadReal_mps
        : undefined
  } catch (motivo) {
    errorDelMotor = motivo instanceof Error ? motivo.message : String(motivo)
    artefactosTexto = '—'
    nTexto = '—'
    textos = {
      qcTexto: 'Error',
      diReferenciaTexto: '—',
      diComercialTexto: '—',
      diEfectivoTexto: '—',
      vTexto: '—',
      limiteVelocidadTexto: '—',
      verificacionVelocidadTexto: '—',
      velocidadPorDebajoDelMinimo: false,
      hfTexto: '—',
    }
  }

  // Lectura directa de redHidraulica, fuera del try/catch de arriba: el
  // input de longitud es independiente de que el motor hidraulico haya
  // podido resolver Qc para este Tramo.
  const tramoActual = proyecto.redHidraulica?.tramos.find((tramo) => tramo.id === fila.tramoId)
  const columnas = 13

  return (
    <>
    <tr>
      <td style={estiloCelda('left')}>{fila.etiqueta}</td>
      <td style={estiloCelda('center')}>{fila.red}</td>
      <td style={estiloCelda('right')}>{artefactosTexto}</td>
      <td style={estiloCelda('right')}>{nTexto}</td>
      <td style={estiloCelda('right', errorDelMotor !== null)}>
        {textos.qcTexto}
        {errorDelMotor !== null ? (
          <>
            <br />
            <small>{errorDelMotor}</small>
          </>
        ) : null}
      </td>
      <td style={estiloCelda('right')}>{textos.diReferenciaTexto}</td>
      <td style={estiloCelda('right')}>{textos.diComercialTexto}</td>
      <td style={estiloCelda('right')}>{textos.diEfectivoTexto}</td>
      <td style={estiloCelda('right')}>{textos.vTexto}</td>
      <td style={estiloCelda('right')}>{textos.limiteVelocidadTexto}</td>
      {/* velocidadPorDebajoDelMinimo (D-delta.27/CRIT-A24): el texto de
          verificación ya absorbe esta distinción sin lenguaje de
          advertencia -- ver textoVerificacionVelocidad más arriba. */}
      <td style={estiloCelda('right')}>{textos.verificacionVelocidadTexto}</td>
      <td style={estiloCelda('right')}>
        <input
          type="number"
          min={0}
          value={tramoActual?.longitud_m ?? ''}
          onChange={(evento) => {
            const resultado = resolverCambioDeLongitud(evento.target.value)
            if (resultado.tipo === 'omitir') {
              onCambiar(conLongitudDeTramo(proyecto, fila.tramoId, undefined))
            } else if (resultado.tipo === 'establecer') {
              onCambiar(conLongitudDeTramo(proyecto, fila.tramoId, resultado.longitud_m))
            }
            // 'ignorar': no se llama a onCambiar -- el input vuelve a
            // mostrar el último valor válido en el próximo render, en vez
            // de generar un estado inválido transitorio.
          }}
          style={{ width: '5rem' }}
        />
      </td>
      <td style={estiloCelda('right')}>{textos.hfTexto}</td>
    </tr>
    {proyecto.configuracionHidraulica.metodoPerdidaLocalizada === 'detallado' ? (
      <tr>
        <td colSpan={columnas} style={{ ...estiloCelda('left', true), backgroundColor: '#fafafa' }}>
          <AccesoriosDeTramoEditor
            proyecto={proyecto}
            tramoId={fila.tramoId}
            velocidadReal_mps={velocidadReal_mps}
            onCambiar={onCambiar}
          />
        </td>
      </tr>
    ) : null}
    </>
  )
}

// Exportado únicamente para el test de UI que verifica los encabezados
// visibles de la tabla (nomenclatura Di teórico/DN/Di real) -- mismo
// criterio de exportar-solo-para-test que FilaResultado más arriba.
export function TablaDeFilas({
  proyecto,
  catalogoArtefactos,
  encabezadoPrimeraColumna,
  filas,
  onCambiar,
}: {
  proyecto: Proyecto
  catalogoArtefactos: readonly ArtefactoNormativo[]
  encabezadoPrimeraColumna: string
  filas: readonly FilaDeTabla[]
  onCambiar: (proyecto: Proyecto) => void
}) {
  if (filas.length === 0) {
    return null
  }

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse' }}>
        <thead>
          <tr>
            <th style={estiloEncabezado('left')}>{encabezadoPrimeraColumna}</th>
            <th style={estiloEncabezado('center')}>Red</th>
            <th style={estiloEncabezado('right')}>Refs. físicas</th>
            <th style={estiloEncabezado('right')}>n</th>
            <th style={estiloEncabezado('right')}>Qc [l/s]</th>
            <th style={estiloEncabezado('right')}>Di teórico [mm]</th>
            <th style={estiloEncabezado('right')}>DN [mm]</th>
            <th style={estiloEncabezado('right')}>Di real [mm]</th>
            <th style={estiloEncabezado('right')}>V [m/s]</th>
            <th style={estiloEncabezado('right')}>V admisible [m/s]</th>
            <th style={estiloEncabezado('right')}>Verificación</th>
            <th style={estiloEncabezado('right')}>Longitud [m]</th>
            <th style={estiloEncabezado('right')}>hf [m.c.a.]</th>
          </tr>
        </thead>
        <tbody>
          {filas.map((fila) => (
            <FilaResultado
              key={fila.tramoId}
              proyecto={proyecto}
              catalogoArtefactos={catalogoArtefactos}
              fila={fila}
              onCambiar={onCambiar}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}

function TablaDeUnidadFuncional({
  proyecto,
  catalogoArtefactos,
  unidadFuncionalId,
  nombre,
  locales,
  filasPrincipales,
  onCambiar,
}: {
  proyecto: Proyecto
  catalogoArtefactos: readonly ArtefactoNormativo[]
  unidadFuncionalId: string
  nombre: string
  locales: Proyecto['unidadesFuncionales'][number]['locales']
  filasPrincipales: ReturnType<typeof identificarFilasPrincipalesDeLocales>
  onCambiar: (proyecto: Proyecto) => void
}) {
  const ordinales = derivarOrdinalesDeLocal(locales)

  const filas: FilaDeTabla[] = locales.flatMap((local) => {
    const ordinal = ordinales.get(local.id)
    const etiquetaLocal = `${ETIQUETA_TIPO_DE_LOCAL[local.tipo]} ${ordinal ?? ''}`.trim()

    return filasPrincipales
      .filter((fila) => fila.unidadFuncionalId === unidadFuncionalId && fila.localId === local.id)
      .map((fila) => ({ etiqueta: etiquetaLocal, red: fila.red, tramoId: fila.tramoId }))
  })

  return (
    <div>
      <h3>{nombre}</h3>
      <TablaDeFilas
        proyecto={proyecto}
        catalogoArtefactos={catalogoArtefactos}
        encabezadoPrimeraColumna="Local"
        filas={filas}
        onCambiar={onCambiar}
      />
    </div>
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
          <option value="detallado">Detalladas (accesorios y tees declarados)</option>
          <option value="estimado">Estimadas (según complejidad del Local)</option>
        </select>
      </label>
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

// Sección independiente de la tabla de Tramos (CRIT-A31): las tees viven
// en Nodo, no en Tramo, así que no encajan como una columna más de
// FilaResultado -- se listan todas las bifurcaciones estructurales de
// RedHidraulica completa (identificarNodosDeBifurcacion), no solo las de
// los Tramos "principales" que muestra la tabla de arriba.
function SeccionDeTees({ proyecto, onCambiar }: { proyecto: Proyecto; onCambiar: (proyecto: Proyecto) => void }) {
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    return null
  }
  const bifurcaciones = identificarNodosDeBifurcacion(redHidraulica)
  if (bifurcaciones.length === 0) {
    return null
  }

  return (
    <section>
      <h3>Tees (bifurcaciones)</h3>
      {bifurcaciones.map((bifurcacion) => (
        <TeeDeNodoEditor key={bifurcacion.nodoId} proyecto={proyecto} nodoDeBifurcacion={bifurcacion} onCambiar={onCambiar} />
      ))}
    </section>
  )
}

// Resumen del modo estimado (D-δ.40) por cada (Local, red) del proyecto:
// deliberadamente NO reutiliza ni imita la tabla de Tramos del modo
// detallado -- mostrar un editor de accesorios/tees acá sugeriría
// falsamente que esa geometría participa del cálculo activo. Solo
// magnitudes agregadas (n, tees estimadas, V_ref, hf) ya producidas por
// resolverPerdidaLocalizadaEstimadaDeLocal, con la palabra "estimada"
// siempre explícita.
function ResumenEstimadoPorLocal({
  proyecto,
  catalogoArtefactos,
}: {
  proyecto: Proyecto
  catalogoArtefactos: readonly ArtefactoNormativo[]
}) {
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    return null
  }

  const filas: { etiqueta: string; red: RedDeTramo; resultado: ReturnType<typeof resolverPerdidaLocalizadaEstimadaDeLocal> }[] = []
  for (const uf of proyecto.unidadesFuncionales) {
    for (const local of uf.locales) {
      for (const red of ['AF', 'AC'] as const) {
        const n = contarTerminalesFisicosDeLocal(redHidraulica, uf.id, local.id, red)
        if (n === 0) {
          continue
        }
        const resultado = resolverPerdidaLocalizadaEstimadaDeLocal(
          proyecto,
          uf.id,
          local.id,
          red,
          catalogoArtefactos,
          catalogoSistemasDeTuberia,
        )
        filas.push({ etiqueta: `${uf.nombre} → ${ETIQUETA_TIPO_DE_LOCAL[local.tipo]}`, red, resultado })
      }
    }
  }

  if (filas.length === 0) {
    return null
  }

  return (
    <section>
      <h3>Pérdidas localizadas — metodología estimada</h3>
      <p>
        <small>
          El cálculo activo usa la metodología <strong>estimada</strong> (D-δ.40): las tees se estiman a partir de la
          cantidad de terminales físicos de cada Local+red, sin relevar orientación real. Cualquier accesorio/tee
          detallado que haya quedado persistido de una edición anterior NO participa del cálculo mientras este modo
          esté activo.
        </small>
      </p>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={estiloEncabezado('left')}>Local</th>
              <th style={estiloEncabezado('center')}>Red</th>
              <th style={estiloEncabezado('right')}>Terminales físicos</th>
              <th style={estiloEncabezado('right')}>Tees estimadas</th>
              <th style={estiloEncabezado('right')}>V referencia [m/s]</th>
              <th style={estiloEncabezado('right')}>hf localizada [m.c.a.]</th>
              <th style={estiloEncabezado('left')}>Cobertura</th>
            </tr>
          </thead>
          <tbody>
            {filas.map(({ etiqueta, red, resultado }, indice) => (
              <tr key={`${etiqueta}-${red}-${indice}`}>
                <td style={estiloCelda('left')}>{etiqueta}</td>
                <td style={estiloCelda('center')}>{red}</td>
                {resultado.tipo === 'incompleta' ? (
                  <td colSpan={5} style={estiloCelda('left', true)}>
                    Pérdida localizada estimada incompleta: {resultado.tramosNoResueltos.length} tramo(s) sin
                    velocidad comercial resoluble.
                  </td>
                ) : (
                  <>
                    <td style={estiloCelda('right')}>{formatearNumero(resultado.nTerminalesLocal, 'conteo')}</td>
                    <td style={estiloCelda('right')}>{formatearNumero(resultado.nTeesEstimadas, 'conteo')}</td>
                    <td style={estiloCelda('right')}>{formatearNumero(resultado.velocidadReferencia_mps, 'm/s')}</td>
                    <td style={estiloCelda('right')}>{formatearNumero(resultado.hf_m, 'm')}</td>
                    <td style={estiloCelda('left')}>Estimada (completa dentro de esta metodología)</td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
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
          <h3>Distribución general</h3>
          <TablaDeFilas
            proyecto={proyecto}
            catalogoArtefactos={catalogoArtefactos}
            encabezadoPrimeraColumna="Cañería"
            filas={identificarFilasDistribucionGeneral(proyecto)}
            onCambiar={onCambiar}
          />

          {proyecto.unidadesFuncionales.map((uf) => (
            <TablaDeUnidadFuncional
              key={uf.id}
              proyecto={proyecto}
              catalogoArtefactos={catalogoArtefactos}
              unidadFuncionalId={uf.id}
              nombre={uf.nombre}
              locales={uf.locales}
              filasPrincipales={filasPrincipalesDeLocales}
              onCambiar={onCambiar}
            />
          ))}

          {proyecto.configuracionHidraulica.metodoPerdidaLocalizada === 'detallado' ? (
            <SeccionDeTees proyecto={proyecto} onCambiar={onCambiar} />
          ) : (
            <ResumenEstimadoPorLocal proyecto={proyecto} catalogoArtefactos={catalogoArtefactos} />
          )}

          <PanelDePresionDeModulo2 proyecto={proyecto} catalogoArtefactos={catalogoArtefactos} onCambiar={onCambiar} />
        </>
      )}
    </details>
  )
}
