// Renderizador de PDF (ADR-012, exportadores/pdf). Recibe un DatosDeInforme
// (snapshot DERIVADO y puro, ver resolverDatosDeInforme.ts) y produce el
// documento -- nunca recalcula (C-05). REPORT-01A: el informe deja de estar
// centrado únicamente en M1 (Demanda) y agrega Tuberías (M2) y Verificación
// hidráulica; M3 (medidores) y M4 (alimentación/reserva) completos quedan
// para REPORT-01B (ver ROADMAP.md).
import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces'
import type { Local, Proyecto, RegimenLocal, TipoDeLocal } from '../../modelo/proyecto'
import type { Paso, ResultadoDeCalculo, Verificacion } from '../../modelo/resultado'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import {
  formulaSimbolica,
  sustitucionNumerica,
  textoValorCalculado,
} from '../../presentacion/desarrolloDelCalculoDemanda'
import { formatearNumero } from './formatearNumero'
import {
  resolverDatosDeInforme,
  type DatosDeInforme,
  type FilaDeTuberiaDeInforme,
  type FilaDeVerificacionDeInforme,
  type UnidadFuncionalDeInforme,
} from './resolverDatosDeInforme'

pdfMake.addVirtualFileSystem(pdfFonts)

// Copiados literalmente de MotorDemandaPantalla.tsx (A2): son mapas de
// presentación chicos, no infraestructura. Quedaron fuera del Incremento B
// a propósito -- B compartió fórmula/sustitución/resultado, no estas
// etiquetas; se revisan en un incremento aparte si hace falta.
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

function etiquetaRegimen(regimen: RegimenLocal | undefined): string {
  return regimen ? ETIQUETA_REGIMEN[regimen] : 'Sin definir'
}

export interface EntradaGeneracionPdf {
  readonly proyecto: Proyecto
}

function renderizarDatosDelProyecto(proyecto: Proyecto): Content {
  const coeficiente = coeficientesMayoracion.find((c) => c.id === proyecto.parametros.tipoDeProyecto)
  const textoCoeficiente = coeficiente
    ? `${coeficiente.a} — ${coeficiente.nombre}`
    : proyecto.parametros.tipoDeProyecto

  return {
    stack: [
      { text: 'Datos del proyecto', style: 'seccion' },
      { text: `Coeficiente de mayoración (a): ${textoCoeficiente}` },
    ],
    margin: [0, 0, 0, 4],
  }
}

// ---------------------------------------------------------------------
// M1 -- Demanda (multinivel-aware, GEOM-UX-01)
// ---------------------------------------------------------------------

// extraerN replica exactamente la misma lógica que ya usa la interfaz
// (MotorDemandaPantalla.tsx): n no vive en resultado.resultados, solo en
// la traza del paso 'kc'. Quedó fuera del Incremento B a propósito -- B
// compartió fórmula, sustitución y texto de resultado; esta duplicación
// puntual se revisa en otro momento, si hace falta.
function extraerN(pasos: readonly Paso[]): number | null {
  const pasoKc = pasos.find((paso) => paso.id === 'kc')
  const entradaN = pasoKc?.entradas.find((entrada) => entrada.simbolo === 'n')
  return entradaN?.valor ?? null
}

function renderizarResumenResultados(resultado: ResultadoDeCalculo): Content[] {
  const n = extraerN(resultado.pasos)
  const { qmax, kc, k, qc } = resultado.resultados
  if (!qmax || !kc || !k || !qc) {
    // Mismo defecto de programación que ya reconoce MotorDemandaPantalla.tsx
    // en su propio guard: el motor siempre devuelve estas cuatro claves.
    throw new Error('El motor no devolvió los resultados esperados (qmax/kc/k/qc)')
  }

  return [
    { text: 'Resultados', style: 'seccion' },
    { text: 'Caudal de cálculo (Qc)', style: 'subseccion' },
    { text: textoValorCalculado(qc), style: 'qcDestacado' },
    {
      table: {
        widths: ['auto', '*'],
        body: [
          ['n', n !== null ? formatearNumero(n, 'conteo') : '—'],
          ['Qmax', textoValorCalculado(qmax)],
        ],
      },
      margin: [0, 4, 0, 4],
    },
    {
      table: {
        widths: ['auto', '*'],
        body: [
          ['Kc', textoValorCalculado(kc)],
          ['K', textoValorCalculado(k)],
        ],
      },
      margin: [0, 0, 0, 8],
    },
  ]
}

function renderizarLocal(local: Local): Content {
  const filasArtefactos = local.artefactos.map((artefacto) => {
    const catalogoItem = catalogoArtefactos.find((c) => c.id === artefacto.artefactoId)
    if (!catalogoItem) {
      // Estructuralmente inalcanzable en el flujo real: validarReferenciasDeCatalogo
      // ya lo marca error, y sin un Proyecto válido no existe ResultadoDeCalculo
      // para llegar hasta acá. Si ocurre, es un defecto de programación (el
      // exportador recibió un proyecto que nunca debió llegar sin validar).
      throw new Error(
        `El artefacto "${artefacto.artefactoId}" no existe en el catálogo normativo vigente (proyecto no validado antes de exportar)`,
      )
    }
    return [catalogoItem.nombre, String(artefacto.cantidad), `${formatearNumero(catalogoItem.quTotal_lps, 'l/s')} l/s`]
  })

  return {
    stack: [
      {
        text: `Local: ${ETIQUETA_TIPO_DE_LOCAL[local.tipo]} — Régimen: ${etiquetaRegimen(local.regimen)}`,
      },
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto'],
          body: [['Artefacto', 'Cantidad', 'qu'], ...filasArtefactos],
        },
        margin: [0, 2, 0, 6],
      },
    ],
    margin: [0, 0, 0, 4],
  }
}

function renderizarUnidadFuncionalM1(uf: UnidadFuncionalDeInforme): Content {
  const cuerpo: Content[] = uf.mostrarNiveles
    ? uf.niveles.flatMap((nivel): Content[] => [
        { text: `Nivel: ${nivel.nombre}`, style: 'subseccionNivel' },
        ...nivel.locales.map(renderizarLocal),
      ])
    : uf.niveles.flatMap((nivel) => nivel.locales.map(renderizarLocal))

  return {
    stack: [{ text: `Unidad funcional: ${uf.nombre}`, style: 'subseccion' }, ...cuerpo],
    margin: [0, 0, 0, 8],
  }
}

function renderizarUnidadesFuncionalesM1(unidadesFuncionales: readonly UnidadFuncionalDeInforme[]): Content[] {
  return [{ text: 'Unidades funcionales', style: 'seccion' }, ...unidadesFuncionales.map(renderizarUnidadFuncionalM1)]
}

function renderizarPaso(paso: Paso): Content {
  const filasEntradas = paso.entradas.map((e) => [
    e.simbolo,
    formatearNumero(e.valor, e.unidad),
    e.unidad,
    e.procedencia,
  ])
  const sustitucion = sustitucionNumerica(paso)
  const textoSalida = `${paso.salida.simbolo} = ${textoValorCalculado(paso.salida.resultado)}`

  return {
    stack: [
      { text: paso.titulo, style: 'tituloPaso' },
      { text: `Fórmula: ${formulaSimbolica(paso)}`, style: 'formula' },
      ...(paso.criterioId ? [{ text: `Criterio: ${paso.criterioId}` } as Content] : []),
      ...(sustitucion ? [{ text: `Sustitución: ${sustitucion}` } as Content] : []),
      { text: textoSalida, style: 'resultadoPaso' },
      {
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', 'auto', '*'],
          body: [['Símbolo', 'Valor', 'Unidad', 'Procedencia'], ...filasEntradas],
        },
        margin: [0, 4, 0, 4],
      },
      { text: `Ref.: ${paso.referencias.join(', ')}`, style: 'referencia' },
      ...(paso.nota ? [{ text: `Nota: ${paso.nota}` } as Content] : []),
    ],
    margin: [0, 0, 0, 12],
  }
}

function renderizarVerificacionM1(v: Verificacion): Content {
  const noConforme = v.estado === 'no_conforme'
  const texto =
    `${v.concepto}: ${formatearNumero(v.valorObtenido.valor, v.valorObtenido.unidad)} ${v.valorObtenido.unidad}` +
    ` (límite ${formatearNumero(v.valorLimite.valor, v.valorLimite.unidad)} ${v.valorLimite.unidad}) - ` +
    `${noConforme ? 'NO CONFORME' : 'CONFORME'} - Ref. ${v.referenciaNormativa}`
  return { text: texto, style: noConforme ? 'noConforme' : 'conforme', margin: [0, 2, 0, 2] }
}

// ---------------------------------------------------------------------
// M2 -- Tuberías / Montantes
// ---------------------------------------------------------------------

const ANCHOS_TABLA_TUBERIA = ['*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto']
const ENCABEZADO_TABLA_TUBERIA = ['Tramo / Local', 'Red', 'Longitud', 'DN / Di', 'V', 'Pérdida', 'Estado']

function filaDeTablaTuberia(fila: FilaDeTuberiaDeInforme): (string | Content)[] {
  return [
    fila.etiqueta,
    fila.red === 'AF' ? 'AF' : 'AC',
    fila.longitudTexto,
    fila.dnTexto,
    fila.vTexto,
    fila.perdidaTotalTexto,
    fila.estadoTexto,
  ]
}

function tablaDeTuberia(filas: readonly FilaDeTuberiaDeInforme[]): Content {
  return {
    table: {
      headerRows: 1,
      widths: ANCHOS_TABLA_TUBERIA,
      body: [ENCABEZADO_TABLA_TUBERIA, ...filas.map(filaDeTablaTuberia)],
    },
    fontSize: 8,
    margin: [0, 2, 0, 8],
  }
}

function renderizarSeccionM2(m2: DatosDeInforme['m2']): Content[] {
  if (!m2.hayRedHidraulica) {
    return [
      { text: 'Tuberías', style: 'seccion' },
      { text: 'El proyecto todavía no tiene una red hidráulica modelada (Módulo 2).', style: 'advertencia' },
    ]
  }

  const contenido: Content[] = [
    { text: 'Tuberías', style: 'seccion' },
    {
      text: `Método de pérdida localizada: ${m2.metodoPerdidaLocalizada === 'estimado' ? 'Estimadas' : 'Detalladas'}`,
      style: 'metadatos',
    },
  ]

  if (m2.distribucionGeneral.length > 0) {
    contenido.push({ text: 'Distribución general / secundaria', style: 'subseccion' })
    contenido.push(tablaDeTuberia(m2.distribucionGeneral))
  }
  if (m2.distribucionSecundaria.length > 0) {
    contenido.push(tablaDeTuberia(m2.distribucionSecundaria))
  }

  if (m2.locales.length > 0) {
    contenido.push({ text: 'Unidades funcionales — Locales', style: 'subseccion' })
    for (const grupo of m2.locales) {
      contenido.push({ text: grupo.nombre, style: 'subseccionNivel' })
      contenido.push(tablaDeTuberia(grupo.filas))
    }
  }

  if (m2.montantes.length > 0) {
    contenido.push({ text: 'Montantes', style: 'subseccion' })
    for (const montante of m2.montantes) {
      contenido.push({
        text: `${montante.nombre} (${montante.red === 'AF' ? 'Agua fría' : 'Agua caliente'})`,
        style: 'subseccionNivel',
      })
      contenido.push({
        text:
          montante.localesServidos.length > 0
            ? `Locales alimentados: ${montante.localesServidos.join(', ')}`
            : 'Sin locales alimentados todavía.',
        style: 'metadatos',
      })
      if (montante.segmentos.length > 0) {
        contenido.push(tablaDeTuberia(montante.segmentos))
      }
    }
  }

  return contenido
}

// ---------------------------------------------------------------------
// Verificación hidráulica
// ---------------------------------------------------------------------

const ANCHOS_TABLA_VERIFICACION = ['*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto']
const ENCABEZADO_TABLA_VERIFICACION = [
  'Local / Artefacto',
  'Red',
  'Δz',
  'hf dist.',
  'hf loc.',
  'hf medidor',
  'P residual',
  'Pmin',
  'Margen',
]

function estiloDeFilaVerificacion(fila: FilaDeVerificacionDeInforme): string {
  if (fila.esCritico) {
    return 'filaCritica'
  }
  if (fila.estado === 'completo' && fila.cumple === false) {
    return 'filaNoConforme'
  }
  return 'filaNormal'
}

function filaDeTablaVerificacion(fila: FilaDeVerificacionDeInforme): Content[] {
  const etiqueta = `${fila.localEtiqueta} — ${fila.artefactoNombre}${fila.esCritico ? ' (crítico)' : ''}`
  const estadoTexto =
    fila.estado === 'completo'
      ? fila.cumple
        ? 'Cumple'
        : 'No cumple'
      : fila.estado === 'fueraDeAlcance'
        ? (fila.notaTexto ?? 'Fuera de alcance')
        : (fila.notaTexto ?? 'Incompleto')
  const estilo = estiloDeFilaVerificacion(fila)
  const celda = (texto: string): Content => ({ text: texto, style: estilo })
  return [
    celda(etiqueta),
    celda(fila.red ?? '—'),
    celda(fila.desnivelTexto),
    celda(fila.hfDistribuidaTexto),
    celda(fila.hfLocalizadaTexto),
    celda(fila.hfMedidorTexto),
    celda(fila.presionResidualTexto),
    celda(fila.presionMinimaTexto),
    celda(fila.estado === 'completo' ? fila.margenTexto : estadoTexto),
  ]
}

function renderizarSeccionVerificacion(datos: DatosDeInforme): Content[] {
  const { verificacion, origenM4Texto } = datos
  const contenido: Content[] = [
    { text: 'Verificación hidráulica', style: 'seccion', pageOrientation: 'landscape' },
    { text: `Origen hidráulico: ${verificacion.origenTexto} (${origenM4Texto})`, style: 'metadatos' },
    {
      text: `Presión disponible: ${verificacion.presionDisponibleTexto ?? 'No provista todavía'}`,
      style: 'metadatos',
    },
  ]

  if (verificacion.estadoGlobal === 'noIniciado') {
    contenido.push({ text: 'Módulo 2 todavía no fue iniciado.', style: 'advertencia' })
    return contenido
  }
  if (verificacion.estadoGlobal === 'error') {
    contenido.push({ text: 'El proyecto tiene errores estructurales que impiden verificar la presión.', style: 'advertencia' })
    return contenido
  }

  if (verificacion.terminalCriticoNodoId !== undefined) {
    const critico = verificacion.filas.find((f) => f.nodoId === verificacion.terminalCriticoNodoId)
    if (critico !== undefined) {
      contenido.push({
        table: {
          widths: ['auto', '*'],
          body: [
            ['Terminal crítico', `${critico.localEtiqueta} — ${critico.artefactoNombre}`],
            ['Presión residual', critico.presionResidualTexto],
            ['Presión mínima', critico.presionMinimaTexto],
            ['Margen', critico.margenTexto],
            ['Estado', critico.cumple ? 'Cumple' : 'No cumple'],
          ],
        },
        style: 'filaCritica',
        margin: [0, 4, 0, 8],
      })
    }
  } else {
    contenido.push({ text: 'Todavía no se puede determinar un terminal crítico.', style: 'advertencia' })
  }

  if (verificacion.motivosDeIncompletitud.length > 0) {
    contenido.push({ text: 'Verificación incompleta', style: 'subseccion' })
    contenido.push(...verificacion.motivosDeIncompletitud.map((linea): Content => ({ text: `- ${linea}`, style: 'advertencia' })))
  }

  if (verificacion.filas.length > 0) {
    contenido.push({
      table: {
        headerRows: 1,
        widths: ANCHOS_TABLA_VERIFICACION,
        body: [ENCABEZADO_TABLA_VERIFICACION, ...verificacion.filas.map(filaDeTablaVerificacion)],
      },
      fontSize: 7,
      margin: [0, 4, 0, 4],
    })
  }

  return contenido
}

// ---------------------------------------------------------------------
// Documento
// ---------------------------------------------------------------------

// Puramente sintáctico (arma el docDefinition de pdfMake) -- sin efectos ni
// llamada al motor. Separado de generarDocumentoPdf para poder testear la
// ESTRUCTURA del informe (secciones, paginación, contenido de tablas) sin
// depender de la apertura real del PDF en el navegador (brief §26/§33).
export function construirDocDefinition(datos: DatosDeInforme): TDocumentDefinitions {
  const { proyecto, resultadoM1 } = datos
  return {
    content: [
      { text: 'IUAS -- Informe técnico', style: 'encabezado' },
      {
        text: `Módulo: ${resultadoM1.metadatos.moduloId} | App v${resultadoM1.metadatos.versionApp} | Normativa ${resultadoM1.metadatos.versionNormativa}`,
        style: 'metadatos',
      },
      renderizarDatosDelProyecto(proyecto),
      ...renderizarUnidadesFuncionalesM1(datos.unidadesFuncionalesM1),
      ...renderizarResumenResultados(resultadoM1),
      ...(resultadoM1.advertencias.length > 0
        ? [
            { text: 'Advertencias', style: 'seccion' } as Content,
            ...resultadoM1.advertencias.map((a): Content => ({ text: `- ${a.mensaje}`, style: 'advertencia' })),
          ]
        : []),
      { text: 'Desarrollo del cálculo (Demanda)', style: 'seccion' },
      ...resultadoM1.pasos.map(renderizarPaso),
      ...(resultadoM1.verificaciones.length > 0
        ? [
            { text: 'Verificaciones normativas (Demanda)', style: 'seccion' } as Content,
            ...resultadoM1.verificaciones.map(renderizarVerificacionM1),
          ]
        : []),
      { text: '', pageBreak: 'before' },
      ...renderizarSeccionM2(datos.m2),
      ...renderizarSeccionVerificacion(datos),
    ],
    styles: {
      encabezado: { fontSize: 16, bold: true, margin: [0, 0, 0, 4] },
      metadatos: { fontSize: 8, color: '#555555', margin: [0, 0, 0, 12] },
      seccion: { fontSize: 12, bold: true, margin: [0, 8, 0, 4] },
      subseccion: { fontSize: 10, bold: true, margin: [0, 6, 0, 2] },
      subseccionNivel: { fontSize: 9, bold: true, italics: true, margin: [0, 4, 0, 2] },
      qcDestacado: { fontSize: 13, bold: true, margin: [0, 0, 0, 4] },
      tituloPaso: { fontSize: 10, bold: true },
      formula: { fontSize: 10, italics: true, margin: [0, 2, 0, 2] },
      resultadoPaso: { fontSize: 10, bold: true, margin: [0, 2, 0, 0] },
      referencia: { fontSize: 8, color: '#555555' },
      advertencia: { fontSize: 9, color: '#8a6d00' },
      conforme: { fontSize: 9, color: '#1a7a1a' },
      noConforme: { fontSize: 9, bold: true, color: '#b00020', fillColor: '#fdecea' },
      filaNormal: { fontSize: 7 },
      filaNoConforme: { fontSize: 7, color: '#b00020' },
      filaCritica: { fontSize: 8, bold: true, color: '#b00020' },
    },
    defaultStyle: { fontSize: 10 },
  }
}

export function generarDocumentoPdf(entrada: EntradaGeneracionPdf): void {
  const datos = resolverDatosDeInforme(entrada.proyecto, catalogoArtefactos, coeficientesMayoracion)
  pdfMake.createPdf(construirDocDefinition(datos)).open()
}
