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

// MATERIALS-POLISH-01 (brief §25): `Proyecto.metadatos.fecha` se persiste
// como string ISO ("2026-08-07", dato del proyecto -- nunca se toca acá).
// El DISPLAY público pasa a formato es-AR ("7 de agosto de 2026"), mismo
// criterio que `formatearFechaDeGeneracion`. Construye la fecha con
// componentes explícitos (año/mes/día) en vez de `new Date(iso)` para
// evitar el corrimiento de un día que introduce el parseo UTC de un string
// "YYYY-MM-DD" en zonas horarias negativas. Si el string no matchea el
// formato esperado (dato legado o vacío), se muestra tal cual -- nunca se
// inventa una fecha ni se rompe la generación del PDF.
export function formatearFechaDeProyecto(fechaIso: string): string {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fechaIso.trim())
  if (coincidencia === null) {
    return fechaIso
  }
  const [, anioTexto, mesTexto, diaTexto] = coincidencia
  const fecha = new Date(Number(anioTexto), Number(mesTexto) - 1, Number(diaTexto))
  return new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long', year: 'numeric' }).format(fecha)
}

export function resolverNombreDeArchivoMateriales(proyecto: Proyecto): string {
  return `Caudal_Listado_de_materiales_${sanitizarParaNombreDeArchivo(proyecto.metadatos.nombre)}.pdf`
}

// MATERIALS-POLISH-01 (brief §7/§9): "Estado del listado" -- discreto,
// nunca el lenguaje hidráulico CUMPLE/NO CUMPLE (son conceptos distintos:
// éste responde "¿Materials pudo computar todo de forma inequívoca?", no
// "¿la instalación verifica presión?").
function etiquetaEstadoDeListado(estado: 'completo' | 'parcial'): string {
  return estado === 'completo' ? 'Listado completo' : 'Listado parcial'
}

function renderizarEncabezado(datos: DatosListadoDeMateriales, fechaGeneracion: Date): Content[] {
  const { proyecto, porcentajeExtraCompra: porcentaje, estado } = datos
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
          [{ text: 'Fecha del proyecto', bold: true }, { text: formatearFechaDeProyecto(proyecto.metadatos.fecha) }],
          [{ text: 'Margen adicional de compra', bold: true }, { text: formatearPorcentaje(porcentaje) }],
          [{ text: 'Estado', bold: true }, { text: etiquetaEstadoDeListado(estado), style: estado === 'parcial' ? 'estadoParcial' : undefined }],
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
    ...(estado === 'parcial'
      ? [
          {
            text:
              'Existen elementos pendientes de definición. Las cantidades indicadas corresponden únicamente a ' +
              'los elementos actualmente computables.',
            style: 'aclaracionParcial',
          } as Content,
        ]
      : []),
  ]
}

// MATERIALS-POLISH-01 (brief §27/§28): resumen operativo compacto debajo
// del encabezado -- NO es un dashboard, sólo los totales que ya se pueden
// leer más abajo desglosados, adelantados para orientar al usuario. Se
// omite cualquier fila cuyo valor no sea computable (brief: "mostrar sólo
// si los valores son computables") -- p.ej. sin tuberías computadas, no
// se muestra "Tuberías computadas: 0 m" como si fuera un resultado real.
function renderizarResumenOperativo(datos: DatosListadoDeMateriales): Content[] {
  const totalTuberiasComputada_m = datos.tuberias.reduce((acc, item) => acc + item.longitudComputada_m, 0)
  const totalTuberiasCompra_m = datos.tuberias.reduce((acc, item) => acc + item.longitudCompra_m, 0)
  const totalAccesoriosComputada = datos.accesorios.reduce((acc, item) => acc + item.cantidadComputada, 0)
  // Compra sugerida total: suma de la compra YA consolidada por tipo+DN
  // (resolverConsolidadoDeAccesorios), nunca de las filas del detalle
  // partidas por origen -- mismo criterio anti-doble-ceil que la sección
  // de Accesorios (brief §17).
  const totalAccesoriosCompra = resolverConsolidadoDeAccesorios(datos).reduce((acc, fila) => acc + fila.compra, 0)

  const filas: [string, string][] = []
  if (datos.tuberias.length > 0) {
    filas.push(['Tuberías computadas', formatearMetros(totalTuberiasComputada_m)])
    filas.push(['Tuberías con margen', formatearMetros(totalTuberiasCompra_m)])
  }
  if (datos.accesorios.length > 0) {
    filas.push(['Accesorios computados', `${totalAccesoriosComputada} u`])
    filas.push(['Accesorios sugeridos de compra', `${totalAccesoriosCompra} u`])
  }

  if (filas.length === 0) {
    return []
  }

  return [
    { text: 'Resumen operativo', style: 'subseccion' },
    {
      table: {
        widths: ['*', 'auto'],
        body: filas.map(([etiqueta, valor]) => [{ text: etiqueta }, { text: valor, alignment: 'right' as const }]),
      },
      layout: layoutTablaIuas,
      margin: [0, 4, 0, 4],
    },
    {
      text: 'Longitud total computada: suma informativa entre materiales/DN distintos; no sustituye el desglose de compra.',
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

function renderizarSeccionTuberias(datos: DatosListadoDeMateriales, numero: number): Content[] {
  if (datos.tuberias.length === 0) {
    return [
      { text: `${numero}. Tuberías`, style: 'seccion' },
      { text: 'No hay tramos de tubería computables en este proyecto todavía.', style: 'notaVacio' },
    ]
  }

  const filas = datos.tuberias.map((item) => [
    { text: item.material },
    { text: item.red },
    { text: item.dnComercial },
    { text: formatearMetros(item.longitudComputada_m), alignment: 'right' as const },
    { text: formatearMetros(item.longitudCompra_m), alignment: 'right' as const },
  ])

  const consolidado = resolverConsolidadoPorDn(datos.tuberias)

  // MATERIALS-POLISH-01 (brief §13): "Resumen de compra" PRIMERO (Material
  // + DN, AF+AC consolidados -- lo que alguien necesita para ir a comprar),
  // "Detalle por red" DESPUÉS (mismo desglose de siempre, para trazabilidad
  // AF/AC). El margen ya figura en el encabezado del documento -- ninguna
  // de las dos tablas repite la columna "Extra [%]" (brief §14).
  return [
    { text: `${numero}. Tuberías`, style: 'seccion' },
    ...(consolidado.length > 0
      ? ([
          { text: 'Resumen de compra de tuberías', style: 'subseccion' },
          {
            table: {
              headerRows: 1,
              widths: ['*', 'auto', 'auto', 'auto'],
              body: [
                [
                  { text: 'Material', bold: true },
                  { text: 'DN [mm]', bold: true },
                  { text: 'Cantidad computada [m]', bold: true },
                  { text: 'Cantidad sugerida de compra [m]', bold: true },
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
          },
        ] as Content[])
      : []),
    { text: 'Detalle por red', style: 'subseccion' },
    {
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto', 'auto'],
        body: [
          [
            { text: 'Material', bold: true },
            { text: 'Red', bold: true },
            { text: 'DN [mm]', bold: true },
            { text: 'Cantidad computada [m]', bold: true },
            { text: 'Cantidad sugerida de compra [m]', bold: true },
          ],
          ...filas,
        ],
      },
      layout: layoutTablaIuas,
      margin: [0, 4, 0, 8],
    },
  ]
}

// ACCESSORIES-DEFAULTS-01 (D-δ.139): "Origen" distingue accesorios/Tees
// explícitamente modelados por el usuario ('definido') de la composición
// física aproximada que Caudal propone en modo simplificado ('estimado').
function etiquetaOrigen(origen: 'definido' | 'estimado'): string {
  return origen === 'estimado' ? 'Estimado' : 'Definido'
}

// MATERIALS-POLISH-01 (brief §15/§16/§17): resumen de compra de accesorios
// agrupado por (Accesorio + DN/configuración) IGNORANDO el origen -- un
// mismo tipo+DN puede llegar con piezas 'estimadas' y 'definidas' a la vez
// (p.ej. una Tee real de Montante + Tees estimadas de Local, mismo DN por
// coincidencia) y el resumen los trata como una sola cantidad comprable.
// CRÍTICO: la cantidad sugerida de compra del resumen se deriva de
// `Math.ceil(totalComputadoConsolidado × factor)` -- UNA sola vez sobre el
// total ya sumado, NUNCA sumando los `cantidadCompra` (ya redondeados hacia
// arriba, uno por origen) de las filas del detalle. Sumar ceils
// independientes sobreestima la compra (ver brief §17: 1 estimado + 1
// definido + 10% → ceil(2×1.10)=3, nunca ceil(1.1)+ceil(1.1)=4).
export function resolverConsolidadoDeAccesorios(datos: DatosListadoDeMateriales) {
  const factor = 1 + datos.porcentajeExtraCompra / 100
  const acumulador = new Map<string, { etiqueta: string; dnComercial: string | undefined; computada: number }>()
  for (const item of datos.accesorios) {
    const clave = `${item.etiqueta}|${item.dnComercial ?? ''}`
    const existente = acumulador.get(clave)
    acumulador.set(clave, {
      etiqueta: item.etiqueta,
      dnComercial: item.dnComercial,
      computada: (existente?.computada ?? 0) + item.cantidadComputada,
    })
  }
  return [...acumulador.values()]
    .map((fila) => ({ ...fila, compra: Math.ceil(fila.computada * factor) }))
    .sort((a, b) => {
      if (a.etiqueta !== b.etiqueta) return a.etiqueta.localeCompare(b.etiqueta, 'es')
      const dnA = a.dnComercial !== undefined ? parseFloat(a.dnComercial) : Number.POSITIVE_INFINITY
      const dnB = b.dnComercial !== undefined ? parseFloat(b.dnComercial) : Number.POSITIVE_INFINITY
      return dnA - dnB
    })
}

function renderizarSeccionAccesorios(datos: DatosListadoDeMateriales, numero: number): Content[] {
  if (datos.accesorios.length === 0) {
    return [
      { text: `${numero}. Accesorios`, style: 'seccion' },
      {
        text:
          'No hay accesorios físicos para este proyecto todavía. En el modo simplificado, Caudal utiliza una ' +
          'composición aproximada de accesorios físicos para el cómputo de materiales; en el modo profesional, ' +
          'el listado utiliza únicamente los accesorios y derivaciones explícitamente modelados.',
        style: 'notaVacio',
      },
    ]
  }

  const consolidado = resolverConsolidadoDeAccesorios(datos)

  return [
    { text: `${numero}. Accesorios`, style: 'seccion' },
    { text: 'Resumen de compra de accesorios', style: 'subseccion' },
    {
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto'],
        body: [
          [
            { text: 'Accesorio', bold: true },
            { text: 'DN / configuración', bold: true },
            { text: 'Cantidad computada [u]', bold: true },
            { text: 'Cantidad sugerida de compra [u]', bold: true },
          ],
          ...consolidado.map((fila) => [
            { text: fila.etiqueta },
            { text: fila.dnComercial ?? '—' },
            { text: String(fila.computada), alignment: 'right' as const },
            { text: String(fila.compra), alignment: 'right' as const },
          ]),
        ],
      },
      layout: layoutTablaIuas,
      margin: [0, 4, 0, 8],
    },
    { text: 'Detalle de accesorios', style: 'subseccion' },
    {
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto', 'auto'],
        body: [
          [
            { text: 'Accesorio', bold: true },
            { text: 'DN / configuración', bold: true },
            { text: 'Cantidad computada [u]', bold: true },
            { text: 'Origen', bold: true },
            { text: 'Cantidad sugerida de compra [u]', bold: true },
          ],
          // Nota (brief §17): esta columna de compra es INFORMATIVA por
          // fila (redondeo independiente de ESA fila) -- el resumen de
          // arriba NUNCA se deriva sumando estos valores, sino de la
          // cantidad computada consolidada (ver resolverConsolidadoDeAccesorios).
          ...datos.accesorios.map((item) => [
            { text: item.etiqueta },
            { text: item.dnComercial ?? '—' },
            { text: String(item.cantidadComputada), alignment: 'right' as const },
            { text: etiquetaOrigen(item.origen) },
            { text: String(item.cantidadCompra), alignment: 'right' as const },
          ]),
        ],
      },
      layout: layoutTablaIuas,
      margin: [0, 4, 0, 8],
    },
  ]
}

// MATERIALS-POLISH-01 (brief §22): si NI Medidores NI Equipos y
// almacenamiento tienen contenido todavía (M3/M4 sin iniciar), no dedicar
// una sección numerada completa a cada uno -- se agrupan en un único
// bloque compacto, UNA sola sección numerada (el llamador decide si pedir
// uno o dos números según corresponda -- ver construirDocDefinitionListadoMateriales,
// nunca se saltea un número por esto).
function renderizarMedidoresYAlmacenamientoVacios(numero: number): Content[] {
  return [
    { text: `${numero}. Elementos todavía no definidos`, style: 'seccion' },
    {
      ul: ['Medición (Módulo 3 no está evaluado todavía).', 'Equipos y almacenamiento (no hay componentes adoptados todavía).'],
      style: 'notaVacio',
      margin: [0, 2, 0, 8],
    },
  ]
}

function renderizarSeccionSinMargen(
  numero: number,
  titulo: string,
  items: readonly { nombre: string; especificacion: string; cantidad: number }[],
  notaVacio: string,
  // Brief §29: nota discreta opcional al pie de la sección (usada por
  // "Artefactos previstos" -- nunca se les aplica margen ni se los llama
  // "materiales para compra").
  notaFinal?: string,
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
      margin: [0, 4, 0, notaFinal !== undefined ? 2 : 8],
    },
    ...(notaFinal !== undefined ? [{ text: notaFinal, style: 'aclaracion' } as Content] : []),
  ]
}

function renderizarObservaciones(datos: DatosListadoDeMateriales, numero: number): Content[] {
  const contenido: Content[] = []
  const hayPendientes = datos.pendientes.length > 0

  if (hayPendientes) {
    // MATERIALS-POLISH-01 (brief §24): el título nunca queda huérfano al
    // final de una página -- viaja en el mismo bloque `unbreakable` que la
    // PRIMERA nota pendiente. El resto de la lista (si es larga) sigue
    // fluyendo normalmente en un `ul` aparte, sin volver toda la sección
    // unbreakable.
    contenido.push({
      stack: [
        { text: `${numero}. Observaciones y alcance`, style: 'seccion' },
        { text: 'Elementos pendientes de definición', style: 'subseccion' },
        { text: datos.pendientes[0]!, style: 'pendiente' },
      ],
      unbreakable: true,
    })
    if (datos.pendientes.length > 1) {
      contenido.push({
        ul: datos.pendientes.slice(1).map((motivo) => ({ text: motivo, style: 'pendiente' })),
        margin: [0, 0, 0, 8],
      })
    }
  } else {
    // Brief §31: proyecto COMPLETO -- ni el subtítulo "Elementos
    // pendientes de definición" ni un texto equivalente ("no hay
    // pendientes") se renderizan.
    contenido.push({ text: `${numero}. Observaciones y alcance`, style: 'seccion' })
  }

  contenido.push({
    text:
      'Este listado incluye únicamente elementos y longitudes explícitamente respaldados por el modelo del ' +
      'proyecto. En el modo simplificado, Caudal utiliza una composición aproximada de accesorios físicos para ' +
      'el cómputo de materiales (columna "Origen": Estimado); en el modo profesional, el listado utiliza ' +
      'únicamente los accesorios y derivaciones explícitamente modelados (Origen: Definido). Las cantidades ' +
      'sugeridas de compra incorporan el margen adicional indicado por el usuario.',
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
    // Numeración de secciones CONSECUTIVA (D-δ.139/MATERIALS-POLISH-01):
    // ninguna sección se omite salvo Medidores+Almacenamiento cuando AMBOS
    // están vacíos (se combinan en un único número, brief §22) -- por eso
    // `siguienteNumero()` se pide una sola vez para ese caso y dos veces
    // en el caso normal, nunca se "saltea" un número a mano.
    content: (() => {
      let numeroDeSeccion = 0
      const siguienteNumero = (): number => {
        numeroDeSeccion += 1
        return numeroDeSeccion
      }
      const medidoresYAlmacenamientoVacios = datos.medidores.length === 0 && datos.almacenamiento.length === 0
      return [
        ...renderizarEncabezado(datos, fechaGeneracion),
        ...renderizarResumenOperativo(datos),
        ...renderizarSeccionTuberias(datos, siguienteNumero()),
        ...renderizarSeccionAccesorios(datos, siguienteNumero()),
        ...(medidoresYAlmacenamientoVacios
          ? renderizarMedidoresYAlmacenamientoVacios(siguienteNumero())
          : [
              ...renderizarSeccionSinMargen(siguienteNumero(), 'Medidores', datos.medidores, 'Módulo 3 (Medidores) no está evaluado todavía.'),
              ...renderizarSeccionSinMargen(
                siguienteNumero(),
                'Equipos y almacenamiento',
                datos.almacenamiento,
                'No hay componentes de almacenamiento/abastecimiento adoptados todavía.',
              ),
            ]),
        ...renderizarSeccionSinMargen(
          siguienteNumero(),
          'Artefactos previstos',
          datos.artefactos,
          'No hay artefactos sanitarios declarados todavía.',
          datos.artefactos.length > 0 ? 'Cantidad prevista en el proyecto; sin margen adicional.' : undefined,
        ),
        ...renderizarObservaciones(datos, siguienteNumero()),
      ]
    })(),
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
      estadoParcial: { color: '#8a6d00', bold: true },
      aclaracionParcial: { fontSize: 8, color: '#8a6d00', margin: [0, 2, 0, 4] },
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
