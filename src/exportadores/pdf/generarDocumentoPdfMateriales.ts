// MATERIALS-01: renderizador de PDF del Listado de materiales. Recibe un
// DatosListadoDeMateriales (snapshot DERIVADO y puro con el margen de
// compra ya aplicado, ver resolverDatosDeListadoDeMateriales.ts) y produce
// el documento -- nunca recalcula (mismo criterio ADR-012 que
// generarDocumentoPdf.ts). Documento INDEPENDIENTE de la Memoria técnica:
// no importa su docDefinition, sólo reutiliza primitivas visuales exportadas
// (paleta de marca, layout de tabla, sanitizador de nombre de archivo).
import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces'
import type { Proyecto } from '../../modelo/proyecto'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import {
  COLOR_MARCA,
  COLOR_MARCA_FUERTE,
  COLOR_TEXTO_2,
  layoutTablaIuas,
  sanitizarParaNombreDeArchivo,
  formatearFechaDeGeneracion,
} from './generarDocumentoPdf'
import {
  resolverDatosDeListadoDeMateriales,
  aplicarMargenDeCompra,
  type DatosListadoDeMateriales,
  type ItemTuberiaConMargen,
} from './resolverDatosDeListadoDeMateriales'

pdfMake.addVirtualFileSystem(pdfFonts)

const LOCALE = 'es-AR'

function formatearMetros(valor: number): string {
  return `${valor.toLocaleString(LOCALE, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} m`
}

function formatearPorcentaje(valor: number): string {
  return `${valor.toLocaleString(LOCALE, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} %`
}

export function resolverNombreDeArchivoMateriales(proyecto: Proyecto): string {
  return `Caudal_Listado_de_materiales_${sanitizarParaNombreDeArchivo(proyecto.metadatos.nombre)}.pdf`
}

function renderizarEncabezado(proyecto: Proyecto, porcentaje: number, fechaGeneracion: Date): Content[] {
  return [
    {
      columns: [
        {
          stack: [
            { text: 'Caudal', style: 'wordmark' },
            { text: 'by DREZA', style: 'wordmarkFirma' },
          ],
        },
        { text: `Generado el ${formatearFechaDeGeneracion(fechaGeneracion)}`, style: 'fechaGeneracion', alignment: 'right' },
      ],
    },
    { text: 'Listado de materiales', style: 'tituloDocumento' },
    { text: 'Instalaciones internas de agua', style: 'subtituloDocumento' },
    {
      table: {
        widths: ['auto', '*'],
        body: [
          [{ text: 'Proyecto', bold: true }, { text: proyecto.metadatos.nombre }],
          [{ text: 'Fecha del proyecto', bold: true }, { text: proyecto.metadatos.fecha }],
          [{ text: 'Margen adicional de compra', bold: true }, { text: formatearPorcentaje(porcentaje) }],
        ],
      },
      layout: layoutTablaIuas,
      margin: [0, 8, 0, 8],
    },
    {
      text:
        'El margen adicional de compra se aplica exclusivamente a tuberías y accesorios físicos computados. ' +
        'No modifica el cálculo hidráulico.',
      style: 'aclaracion',
    },
  ]
}

// Resumen consolidado por Material + DN (brief §15): suma AF+AC sin perder
// el detalle -- se muestra DESPUÉS de la tabla de detalle, nunca en su
// reemplazo.
function resolverConsolidadoPorDn(tuberias: readonly ItemTuberiaConMargen[]) {
  const acumulador = new Map<string, { material: string; dnComercial: string; computada_m: number; compra_m: number }>()
  for (const item of tuberias) {
    const clave = `${item.material}|${item.dnComercial}`
    const existente = acumulador.get(clave)
    acumulador.set(clave, {
      material: item.material,
      dnComercial: item.dnComercial,
      computada_m: (existente?.computada_m ?? 0) + item.longitudComputada_m,
      compra_m: (existente?.compra_m ?? 0) + item.longitudCompra_m,
    })
  }
  return [...acumulador.values()].sort((a, b) => {
    if (a.material !== b.material) return a.material.localeCompare(b.material, 'es')
    return parseFloat(a.dnComercial) - parseFloat(b.dnComercial)
  })
}

function renderizarSeccionTuberias(datos: DatosListadoDeMateriales): Content[] {
  if (datos.tuberias.length === 0) {
    return [
      { text: '1. Tuberías', style: 'seccion' },
      { text: 'No hay tramos de tubería computables en este proyecto todavía.', style: 'notaVacio' },
    ]
  }

  const filas = datos.tuberias.map((item) => [
    { text: item.material },
    { text: item.red },
    { text: item.dnComercial },
    { text: formatearMetros(item.longitudComputada_m), alignment: 'right' as const },
    { text: formatearPorcentaje(datos.porcentajeExtraCompra), alignment: 'right' as const },
    { text: formatearMetros(item.longitudCompra_m), alignment: 'right' as const },
  ])

  const consolidado = resolverConsolidadoPorDn(datos.tuberias)

  return [
    { text: '1. Resumen y detalle de tuberías', style: 'seccion' },
    {
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto', 'auto', 'auto'],
        body: [
          [
            { text: 'Material', bold: true },
            { text: 'Red', bold: true },
            { text: 'DN [mm]', bold: true },
            { text: 'Cantidad computada [m]', bold: true },
            { text: 'Extra [%]', bold: true },
            { text: 'Cantidad para compra [m]', bold: true },
          ],
          ...filas,
        ],
      },
      layout: layoutTablaIuas,
      margin: [0, 4, 0, 8],
    },
    ...(consolidado.length > 0
      ? [
          { text: 'Resumen consolidado de tuberías (Material + DN, AF+AC)', style: 'subseccion' } as Content,
          {
            table: {
              headerRows: 1,
              widths: ['*', 'auto', 'auto', 'auto'],
              body: [
                [
                  { text: 'Material', bold: true },
                  { text: 'DN [mm]', bold: true },
                  { text: 'Cantidad computada [m]', bold: true },
                  { text: 'Cantidad para compra [m]', bold: true },
                ],
                ...consolidado.map((fila) => [
                  { text: fila.material },
                  { text: fila.dnComercial },
                  { text: formatearMetros(fila.computada_m), alignment: 'right' as const },
                  { text: formatearMetros(fila.compra_m), alignment: 'right' as const },
                ]),
              ],
            },
            layout: layoutTablaIuas,
            margin: [0, 4, 0, 8],
          } as Content,
        ]
      : []),
  ]
}

function renderizarSeccionAccesorios(datos: DatosListadoDeMateriales): Content[] {
  if (datos.accesorios.length === 0) {
    return [
      { text: '2. Accesorios explícitamente modelados', style: 'seccion' },
      {
        text:
          'No hay accesorios físicos explícitamente modelados en este proyecto. Las pérdidas localizadas ' +
          'estimadas (HYD-EST) no se convierten en piezas de compra.',
        style: 'notaVacio',
      },
    ]
  }

  return [
    { text: '2. Accesorios explícitamente modelados', style: 'seccion' },
    {
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto', 'auto'],
        body: [
          [
            { text: 'Accesorio', bold: true },
            { text: 'DN / configuración', bold: true },
            { text: 'Cantidad computada [u]', bold: true },
            { text: 'Extra [%]', bold: true },
            { text: 'Cantidad para compra [u]', bold: true },
          ],
          ...datos.accesorios.map((item) => [
            { text: item.etiqueta },
            { text: item.dnComercial ?? '—' },
            { text: String(item.cantidadComputada), alignment: 'right' as const },
            { text: formatearPorcentaje(datos.porcentajeExtraCompra), alignment: 'right' as const },
            { text: String(item.cantidadCompra), alignment: 'right' as const },
          ]),
        ],
      },
      layout: layoutTablaIuas,
      margin: [0, 4, 0, 8],
    },
  ]
}

function renderizarSeccionSinMargen(
  numero: number,
  titulo: string,
  items: readonly { nombre: string; especificacion: string; cantidad: number }[],
  notaVacio: string,
): Content[] {
  if (items.length === 0) {
    return [
      { text: `${numero}. ${titulo}`, style: 'seccion' },
      { text: notaVacio, style: 'notaVacio' },
    ]
  }
  return [
    { text: `${numero}. ${titulo}`, style: 'seccion' },
    {
      table: {
        headerRows: 1,
        widths: ['*', '*', 'auto'],
        body: [
          [
            { text: 'Elemento', bold: true },
            { text: 'Especificación', bold: true },
            { text: 'Cantidad', bold: true },
          ],
          ...items.map((item) => [
            { text: item.nombre },
            { text: item.especificacion || '—' },
            { text: String(item.cantidad), alignment: 'right' as const },
          ]),
        ],
      },
      layout: layoutTablaIuas,
      margin: [0, 4, 0, 8],
    },
  ]
}

function renderizarObservaciones(datos: DatosListadoDeMateriales): Content[] {
  const contenido: Content[] = [{ text: '7. Observaciones y alcance', style: 'seccion' }]

  if (datos.pendientes.length > 0) {
    contenido.push({ text: 'Elementos pendientes de definición', style: 'subseccion' })
    contenido.push({
      ul: datos.pendientes.map((motivo) => ({ text: motivo, style: 'pendiente' })),
      margin: [0, 0, 0, 8],
    })
  }

  contenido.push({
    text:
      'Este listado incluye únicamente elementos y longitudes explícitamente respaldados por el modelo del ' +
      'proyecto. Las pérdidas localizadas estimadas no se convierten en accesorios físicos. Las cantidades ' +
      'para compra incorporan el margen adicional indicado por el usuario.',
    style: 'aclaracion',
  })

  return contenido
}

export function construirDocDefinitionListadoMateriales(
  datos: DatosListadoDeMateriales,
  fechaGeneracion: Date = new Date(),
): TDocumentDefinitions {
  const { proyecto } = datos
  const nombreProyectoCorto =
    proyecto.metadatos.nombre.length > 40 ? `${proyecto.metadatos.nombre.slice(0, 40).trimEnd()}…` : proyecto.metadatos.nombre

  return {
    pageMargins: [40, 50, 40, 50],
    content: [
      ...renderizarEncabezado(proyecto, datos.porcentajeExtraCompra, fechaGeneracion),
      ...renderizarSeccionTuberias(datos),
      ...renderizarSeccionAccesorios(datos),
      ...renderizarSeccionSinMargen(3, 'Medidores', datos.medidores, 'Módulo 3 (Medidores) no está evaluado todavía.'),
      ...renderizarSeccionSinMargen(
        4,
        'Equipos y almacenamiento',
        datos.almacenamiento,
        'No hay componentes de almacenamiento/abastecimiento adoptados todavía.',
      ),
      ...renderizarSeccionSinMargen(5, 'Artefactos previstos', datos.artefactos, 'No hay artefactos sanitarios declarados todavía.'),
      ...renderizarObservaciones(datos),
    ],
    header: (currentPage) =>
      currentPage === 1
        ? undefined
        : {
            columns: [
              { text: 'Caudal by DREZA — Listado de materiales', style: 'headerPie' },
              { text: nombreProyectoCorto, style: 'headerPie', alignment: 'right' },
            ],
            margin: [40, 20, 40, 0],
          },
    footer: (currentPage, pageCount) => ({
      columns: [
        { text: formatearFechaDeGeneracion(fechaGeneracion), style: 'headerPie' },
        { text: `Página ${currentPage} de ${pageCount}`, style: 'headerPie', alignment: 'right' },
      ],
      margin: [40, 0, 40, 20],
    }),
    info: {
      title: 'Caudal by DREZA — Listado de materiales',
      subject: 'Instalaciones internas de agua',
      author: 'DREZA',
    },
    styles: {
      wordmark: { fontSize: 12, bold: true, color: COLOR_MARCA },
      wordmarkFirma: { fontSize: 8, color: COLOR_TEXTO_2, characterSpacing: 0.5, margin: [0, 1, 0, 0] },
      fechaGeneracion: { fontSize: 8, color: COLOR_TEXTO_2 },
      tituloDocumento: { fontSize: 18, bold: true, color: COLOR_MARCA_FUERTE, margin: [0, 4, 0, 0] },
      subtituloDocumento: { fontSize: 11, color: COLOR_TEXTO_2, margin: [0, 0, 0, 6] },
      seccion: { fontSize: 12, bold: true, color: COLOR_MARCA_FUERTE, margin: [0, 10, 0, 4] },
      subseccion: { fontSize: 10, bold: true, margin: [0, 4, 0, 2] },
      aclaracion: { fontSize: 8, color: COLOR_TEXTO_2, italics: true, margin: [0, 4, 0, 4] },
      notaVacio: { fontSize: 9, color: COLOR_TEXTO_2, italics: true, margin: [0, 2, 0, 8] },
      pendiente: { fontSize: 9, color: '#8a6d00' },
      headerPie: { fontSize: 8, color: COLOR_TEXTO_2 },
    },
    defaultStyle: { fontSize: 10 },
  }
}

export interface EntradaGeneracionPdfMateriales {
  readonly proyecto: Proyecto
  readonly porcentajeExtraCompra: number
}

export function generarDocumentoPdfMateriales(entrada: EntradaGeneracionPdfMateriales): void {
  const computo = resolverDatosDeListadoDeMateriales(entrada.proyecto, catalogoArtefactos, coeficientesMayoracion)
  const datos = aplicarMargenDeCompra(computo, entrada.porcentajeExtraCompra)
  pdfMake.createPdf(construirDocDefinitionListadoMateriales(datos)).download(resolverNombreDeArchivoMateriales(entrada.proyecto))
}
