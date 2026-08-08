// Renderizador de PDF (ADR-012, exportadores/pdf). Recibe el Proyecto y su
// ResultadoDeCalculo y produce el documento -- nunca recalcula (C-05).
// A1: contrato mínimo {proyecto, resultado}, no la MemoriaDeProyecto
// completa (ADR-014) -- esa forma exige enlaces/criteriosAplicados/modulos
// que todavía no tienen contenido real para un único módulo (Demanda).
import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces'
import type { Proyecto } from '../../modelo/proyecto'
import type { Paso, ResultadoDeCalculo, Verificacion, ValorCalculado } from '../../modelo/resultado'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import { formatearNumero } from './formatearNumero'

pdfMake.addVirtualFileSystem(pdfFonts)

// Texto legible por formulaId. Es presentacion, no calculo: traduce un
// identificador que la traza ya trae, no decide nada. Se amplia cuando
// aparezca una formula nueva en algun paso real, no antes.
const TEXTO_DE_FORMULA: Readonly<Record<string, string>> = {
  'ERAS-2023 Sec.2.9.2.2': 'Kc = 1 / raíz(n - 1)',
}

export interface EntradaGeneracionPdf {
  readonly proyecto: Proyecto
  readonly resultado: ResultadoDeCalculo
}

function renderizarDatosDelProyecto(proyecto: Proyecto): Content {
  const coeficiente = coeficientesMayoracion.find((c) => c.a === proyecto.parametros.coeficienteA)
  const textoCoeficiente = coeficiente
    ? `${coeficiente.a} — ${coeficiente.tipoDeProyecto}`
    : String(proyecto.parametros.coeficienteA)

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
// la traza del paso 'kc'. Duplicado a propósito hasta el Incremento B
// (compartir con la interfaz), que es cuando el PDF pasa a ser un segundo
// consumidor real de este tipo de lógica.
function extraerN(pasos: readonly Paso[]): number | null {
  const pasoKc = pasos.find((paso) => paso.id === 'kc')
  const entradaN = pasoKc?.entradas.find((entrada) => entrada.simbolo === 'n')
  return entradaN?.valor ?? null
}

function textoValorCalculado(valor: ValorCalculado): string {
  if ('estado' in valor) {
    return `Indeterminado: ${valor.motivo}`
  }
  const numero = formatearNumero(valor.valor, valor.unidad)
  return valor.unidad === 'adimensional' ? numero : `${numero} ${valor.unidad}`
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
      ...(resultado.advertencias.length > 0
        ? [
            { text: 'Advertencias', style: 'seccion' } as Content,
            ...resultado.advertencias.map((a): Content => ({ text: `- ${a.mensaje}`, style: 'advertencia' })),
          ]
        : []),
      ...renderizarResumenResultados(resultado),
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
