// Renderizador de PDF (ADR-012, exportadores/pdf). Recibe un
// ResultadoDeCalculo y produce el documento -- nunca recalcula (C-05).
// No conoce MemoriaDeProyecto (ADR-014): esa composicion es de Fase 1.
import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces'
import type { Paso, ResultadoDeCalculo, Verificacion } from '../../modelo/resultado'
import { formatearNumero } from './formatearNumero'

pdfMake.addVirtualFileSystem(pdfFonts)

// Texto legible por formulaId. Es presentacion, no calculo: traduce un
// identificador que la traza ya trae, no decide nada. Se amplia cuando
// aparezca una formula nueva en algun paso real, no antes.
const TEXTO_DE_FORMULA: Readonly<Record<string, string>> = {
  'ERAS-2023 Sec.2.9.2.2': 'Kc = 1 / raíz(n - 1)',
}

function renderizarResumenResultados(
  resultados: ResultadoDeCalculo['resultados'],
): Content {
  const filas = Object.entries(resultados).map(([clave, valor]) => [
    clave,
    'estado' in valor ? `Indeterminado: ${valor.motivo}` : formatearNumero(valor.valor, valor.unidad),
  ])
  return { table: { widths: ['auto', '*'], body: filas }, margin: [0, 0, 0, 8] }
}

function renderizarPaso(paso: Paso): Content {
  const filasEntradas = paso.entradas.map((e) => [
    e.simbolo,
    formatearNumero(e.valor, e.unidad),
    e.unidad,
    e.procedencia,
  ])
  const salida = paso.salida.resultado
  const textoSalida =
    'estado' in salida
      ? `Indeterminado: ${salida.motivo}`
      : `${paso.salida.simbolo} = ${formatearNumero(salida.valor, salida.unidad)}`

  return {
    stack: [
      { text: paso.titulo, style: 'tituloPaso' },
      { text: TEXTO_DE_FORMULA[paso.formulaId] ?? paso.formulaId, style: 'formula' },
      {
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', 'auto', '*'],
          body: [['Símbolo', 'Valor', 'Unidad', 'Procedencia'], ...filasEntradas],
        },
        margin: [0, 4, 0, 4],
      },
      { text: textoSalida, style: 'resultadoPaso' },
      { text: `Ref.: ${paso.referencias.join(', ')}`, style: 'referencia' },
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

export function generarDocumentoPdf(resultado: ResultadoDeCalculo): void {
  const docDefinition: TDocumentDefinitions = {
    content: [
      { text: 'IUAS -- Memoria de cálculo', style: 'encabezado' },
      {
        text: `Módulo: ${resultado.metadatos.moduloId} | App v${resultado.metadatos.versionApp} | Normativa ${resultado.metadatos.versionNormativa}`,
        style: 'metadatos',
      },
      ...(resultado.advertencias.length > 0
        ? [
            { text: 'Advertencias', style: 'seccion' } as Content,
            ...resultado.advertencias.map((a): Content => ({ text: `- ${a.mensaje}`, style: 'advertencia' })),
          ]
        : []),
      { text: 'Resultado', style: 'seccion' },
      renderizarResumenResultados(resultado.resultados),
      { text: 'Desarrollo del cálculo', style: 'seccion' },
      ...resultado.pasos.map(renderizarPaso),
      { text: 'Verificaciones', style: 'seccion' },
      ...resultado.verificaciones.map(renderizarVerificacion),
    ],
    styles: {
      encabezado: { fontSize: 16, bold: true, margin: [0, 0, 0, 4] },
      metadatos: { fontSize: 8, color: '#555555', margin: [0, 0, 0, 12] },
      seccion: { fontSize: 12, bold: true, margin: [0, 8, 0, 4] },
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
