// Renderizador de PDF (ADR-012, exportadores/pdf). Recibe el Proyecto y su
// ResultadoDeCalculo y produce el documento -- nunca recalcula (C-05).
// A1: contrato mínimo {proyecto, resultado}, no la MemoriaDeProyecto
// completa (ADR-014) -- esa forma exige enlaces/criteriosAplicados/modulos
// que todavía no tienen contenido real para un único módulo (Demanda).
import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces'
import type { Local, Proyecto, RegimenLocal, TipoDeLocal, UnidadFuncional } from '../../modelo/proyecto'
import { localesDeUnidadFuncional } from '../../motor/tuberias/geometria/resolverCotaHidraulicaDeArtefacto'
import type { Paso, ResultadoDeCalculo, Verificacion } from '../../modelo/resultado'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import {
  formulaSimbolica,
  sustitucionNumerica,
  textoValorCalculado,
} from '../../presentacion/desarrolloDelCalculoDemanda'
import { formatearNumero } from './formatearNumero'

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
  readonly resultado: ResultadoDeCalculo
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

function renderizarUnidadFuncional(uf: UnidadFuncional): Content {
  return {
    stack: [
      { text: `Unidad funcional: ${uf.nombre}`, style: 'subseccion' },
      ...localesDeUnidadFuncional(uf).map(renderizarLocal),
    ],
    margin: [0, 0, 0, 8],
  }
}

function renderizarUnidadesFuncionales(proyecto: Proyecto): Content[] {
  return [
    { text: 'Unidades funcionales', style: 'seccion' },
    ...proyecto.unidadesFuncionales.map(renderizarUnidadFuncional),
  ]
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

function renderizarVerificacion(v: Verificacion): Content {
  const noConforme = v.estado === 'no_conforme'
  const texto =
    `${v.concepto}: ${formatearNumero(v.valorObtenido.valor, v.valorObtenido.unidad)} ${v.valorObtenido.unidad}` +
    ` (límite ${formatearNumero(v.valorLimite.valor, v.valorLimite.unidad)} ${v.valorLimite.unidad}) - ` +
    `${noConforme ? 'NO CONFORME' : 'CONFORME'} - Ref. ${v.referenciaNormativa}`
  return { text: texto, style: noConforme ? 'noConforme' : 'conforme', margin: [0, 2, 0, 2] }
}

export function generarDocumentoPdf(entrada: EntradaGeneracionPdf): void {
  const { proyecto, resultado } = entrada
  const docDefinition: TDocumentDefinitions = {
    content: [
      { text: 'IUAS -- Memoria de cálculo', style: 'encabezado' },
      {
        text: `Módulo: ${resultado.metadatos.moduloId} | App v${resultado.metadatos.versionApp} | Normativa ${resultado.metadatos.versionNormativa}`,
        style: 'metadatos',
      },
      renderizarDatosDelProyecto(proyecto),
      ...renderizarUnidadesFuncionales(proyecto),
      ...renderizarResumenResultados(resultado),
      ...(resultado.advertencias.length > 0
        ? [
            { text: 'Advertencias', style: 'seccion' } as Content,
            ...resultado.advertencias.map((a): Content => ({ text: `- ${a.mensaje}`, style: 'advertencia' })),
          ]
        : []),
      { text: 'Desarrollo del cálculo', style: 'seccion' },
      ...resultado.pasos.map(renderizarPaso),
      ...(resultado.verificaciones.length > 0
        ? [
            { text: 'Verificaciones', style: 'seccion' } as Content,
            ...resultado.verificaciones.map(renderizarVerificacion),
          ]
        : []),
    ],
    styles: {
      encabezado: { fontSize: 16, bold: true, margin: [0, 0, 0, 4] },
      metadatos: { fontSize: 8, color: '#555555', margin: [0, 0, 0, 12] },
      seccion: { fontSize: 12, bold: true, margin: [0, 8, 0, 4] },
      subseccion: { fontSize: 10, bold: true, margin: [0, 2, 0, 0] },
      qcDestacado: { fontSize: 13, bold: true, margin: [0, 0, 0, 4] },
      tituloPaso: { fontSize: 10, bold: true },
      formula: { fontSize: 10, italics: true, margin: [0, 2, 0, 2] },
      resultadoPaso: { fontSize: 10, bold: true, margin: [0, 2, 0, 0] },
      referencia: { fontSize: 8, color: '#555555' },
      advertencia: { fontSize: 9, color: '#8a6d00' },
      conforme: { fontSize: 9, color: '#1a7a1a' },
      noConforme: { fontSize: 9, bold: true, color: '#b00020', fillColor: '#fdecea' },
    },
    defaultStyle: { fontSize: 10 },
  }

  pdfMake.createPdf(docDefinition).open()
}
