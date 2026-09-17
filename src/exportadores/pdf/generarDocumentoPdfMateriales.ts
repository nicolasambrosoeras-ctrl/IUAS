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
import { localesDeUnidadFuncional } from '../../motor/tuberias/geometria/resolverCotaHidraulicaDeArtefacto'
import {
  COLOR_MARCA,
  COLOR_MARCA_FUERTE,
  COLOR_TEXTO_2,
  COLOR_HEADER_TABLA,
  layoutTablaIuas,
  sanitizarParaNombreDeArchivo,
  formatearFechaDeGeneracion,
} from './generarDocumentoPdf'
import {
  resolverDatosDeListadoDeMateriales,
  aplicarMargenDeCompra,
  type DatosListadoDeMateriales,
  type ItemTuberiaConMargen,
  type ItemAccesorioConMargen,
} from './resolverDatosDeListadoDeMateriales'
import { claveDeUbicacion, type UbicacionMaterial } from './resolverAccesoriosConstructivosDreza'

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
// "¿la instalación verifica presión?"). MATERIALS-PDF-POLISH-02 (brief §8):
// "Con elementos pendientes" en vez de "Listado parcial" -- coherente con
// el título "Elementos todavía no definidos" que puede aparecer más abajo
// (misma idea, mismo lenguaje). La condición sigue siendo exactamente
// `datos.pendientes.length > 0` (`estado`), sin cambios de lógica.
function etiquetaEstadoDeListado(estado: 'completo' | 'parcial'): string {
  return estado === 'completo' ? 'Listado completo' : 'Con elementos pendientes'
}

function renderizarEncabezado(datos: DatosListadoDeMateriales, fechaGeneracion: Date): Content[] {
  const { proyecto, porcentajeExtraCompra: porcentaje, estado } = datos
  return [
    {
      columns: [
        { text: 'Caudal · DREZA', style: 'wordmark' },
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
    filas.push(['Accesorios considerados', `${totalAccesoriosComputada} u`])
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

// MATERIALS-ACCESSORIES-01 (D-δ.141): "Origen" distingue accesorios/Tees
// explícitamente modelados por el usuario ('definido') de la estimación
// constructiva DREZA por sector ('estimadoDreza'). MATERIALS-PDF-POLISH-02
// (brief §14): en el detalle se usa la forma CORTA "DREZA" -- repetir
// "Estimado DREZA" en decenas de filas es visualmente pesado; la
// aclaración de la sección explica el código una sola vez. El resumen no
// muestra Origen en absoluto (brief §13).
function etiquetaOrigenCorta(origen: 'definido' | 'estimadoDreza'): string {
  return origen === 'estimadoDreza' ? 'DREZA' : 'Definido'
}

// MATERIALS-PDF-POLISH-02 (brief §11): ninguna fila debe insinuar una
// medida de rosca o un DN que el modelo no puede determinar.
//   - Tee/Codo roscados: el DN de tubería SÍ se conoce, pero la rosca del
//     terminal no -- "20 mm — rosca a definir" en vez de una
//     configuración falsamente completa.
//   - Cualquier otro ítem sin DN (p.ej. una Tee nodal, cuyo DN ya está
//     descripto en la propia etiqueta "Tee DN A × B × C"): "—", sin
//     inventar una aclaración que no aporta nada nuevo.
//
// HYD-OVERPASS-01: "Sobrepaso" (sin DN unívoco, "DN a definir") ya no
// existe -- fue reemplazado por "Sobrepaso fusión" (resolverAccesoriosConstructivosDreza.ts),
// que queda vinculado al Tramo terminal de una red concreta y siempre
// lleva un `dnComercial` real cuando se genera el ítem (un DN Acqua System
// no disponible para este producto se reporta como pendiente en vez de
// generar la fila, ver `resolverProductoSobrepasoAcquaSystem`) -- nunca
// llega acá sin DN.
const ETIQUETAS_ROSCADAS = new Set(['Tee roscada PPR', 'Codo terminal roscado PPR'])
function descripcionDeConfiguracion(etiqueta: string, dnComercial: string | undefined): string {
  if (dnComercial !== undefined) {
    return ETIQUETAS_ROSCADAS.has(etiqueta) ? `${dnComercial} — rosca a definir` : dnComercial
  }
  return '—'
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

// MATERIALS-PDF-POLISH-02 (brief §5/§6): bloque de trazabilidad del
// detalle -- Colector principal (único), un bloque por Montante, y un
// bloque por (UF, Local). El título antepone la UF sólo cuando el
// proyecto tiene más de una (única condición objetiva de "ambigüedad":
// con una sola UF, el prefijo no agrega información).
type BloqueDeUbicacion = { readonly titulo: string; readonly items: ItemAccesorioConMargen[] }

function tituloDeBloque(ubicacion: UbicacionMaterial | undefined, mostrarUf: boolean): string {
  if (ubicacion === undefined || ubicacion.tipo === 'colectorPrincipal') {
    return 'Colector principal'
  }
  if (ubicacion.tipo === 'montante') {
    return ubicacion.nombre
  }
  return mostrarUf ? `${ubicacion.unidadFuncionalNombre} — ${ubicacion.localNombre}` : ubicacion.localNombre
}

function claveDeBloque(ubicacion: UbicacionMaterial | undefined): string {
  return ubicacion === undefined ? 'colectorPrincipal' : claveDeUbicacion(ubicacion)
}

// Orden constructivo determinista (brief §6): 1) Colector principal, 2)
// Montantes en el orden declarado en `Proyecto.montantes`, 3) Unidades
// funcionales en su orden, 4) Locales dentro de cada UF en su orden. Una
// misma entrada produce siempre la misma salida -- necesario para que los
// PDF sean comparables y los tests no sean frágiles (brief §6, último
// párrafo). Cualquier clave que el recorrido determinista no cubra (no
// debería ocurrir con datos bien formados) se agrega al final, ordenada
// alfabéticamente por clave, nunca se descarta silenciosamente.
function agruparAccesoriosPorUbicacion(datos: DatosListadoDeMateriales): BloqueDeUbicacion[] {
  const mostrarUf = datos.proyecto.unidadesFuncionales.length > 1
  const grupos = new Map<string, BloqueDeUbicacion>()
  for (const item of datos.accesorios) {
    const clave = claveDeBloque(item.ubicacion)
    const existente = grupos.get(clave)
    if (existente !== undefined) {
      existente.items.push(item)
    } else {
      grupos.set(clave, { titulo: tituloDeBloque(item.ubicacion, mostrarUf), items: [item] })
    }
  }

  const ordenDeClaves = ['colectorPrincipal']
  for (const montante of datos.proyecto.montantes ?? []) {
    ordenDeClaves.push(`montante:${montante.id}`)
  }
  for (const uf of datos.proyecto.unidadesFuncionales) {
    for (const local of localesDeUnidadFuncional(uf)) {
      ordenDeClaves.push(`local:${uf.id}:${local.id}`)
    }
  }

  const resultado: BloqueDeUbicacion[] = []
  const usadas = new Set<string>()
  for (const clave of ordenDeClaves) {
    const grupo = grupos.get(clave)
    if (grupo !== undefined) {
      resultado.push(grupo)
      usadas.add(clave)
    }
  }
  for (const [clave, grupo] of [...grupos.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    if (!usadas.has(clave)) {
      resultado.push(grupo)
    }
  }
  return resultado
}

// AF antes que AC dentro de cada bloque (brief §6.5); a igualdad de red,
// orden estable por etiqueta -- nunca depende del orden de inserción del
// Map de arriba (ordenarAccesorios ya ordena por etiqueta/DN, pero se
// reafirma acá para que el orden del bloque sea determinista incluso si
// esa función cambiara de criterio en el futuro).
function ordenarItemsDeBloque(items: readonly ItemAccesorioConMargen[]): ItemAccesorioConMargen[] {
  return [...items].sort((a, b) => {
    const redA = a.red === 'AC' ? 1 : 0
    const redB = b.red === 'AC' ? 1 : 0
    if (redA !== redB) return redA - redB
    return a.etiqueta.localeCompare(b.etiqueta, 'es')
  })
}

// Layout local (NO el compartido `layoutTablaIuas`, brief §2: no tocar
// branding/presentación de otros documentos): sombrea también la fila de
// encabezados de columna (fila 1), además de la fila de título de bloque
// (fila 0, ya sombreada por `layoutTablaIuas`).
const layoutBloqueDeUbicacion = {
  ...layoutTablaIuas,
  fillColor: (rowIndex: number) => (rowIndex <= 1 ? COLOR_HEADER_TABLA : null),
}

// MATERIALS-PDF-POLISH-02 (brief §7): el título del bloque es la PRIMERA
// fila de la MISMA tabla que su encabezado de columnas y sus filas (no un
// `text` separado antes de la tabla) -- con `headerRows: 2` pdfMake repite
// AMBAS filas si la tabla debe partirse entre páginas, así que el título
// nunca queda solo, siempre viaja con el encabezado de columna y con al
// menos las filas que sigan en esa página. `dontBreakRows: true` impide
// que una fila de datos se parta a la mitad (brief §7, primer requisito).
function renderizarBloqueDeUbicacion(bloque: BloqueDeUbicacion): Content {
  const items = ordenarItemsDeBloque(bloque.items)
  return {
    table: {
      headerRows: 2,
      dontBreakRows: true,
      widths: ['*', 'auto', 'auto', 'auto', 'auto'],
      body: [
        [{ text: bloque.titulo, style: 'ubicacionTitulo', colSpan: 5 }, {}, {}, {}, {}],
        [
          { text: 'Accesorio', bold: true },
          { text: 'Red', bold: true },
          { text: 'DN / configuración', bold: true },
          { text: 'Cantidad base [u]', bold: true },
          { text: 'Origen', bold: true },
        ],
        ...items.map((item) => [
          { text: item.etiqueta },
          { text: item.red ?? '—' },
          { text: descripcionDeConfiguracion(item.etiqueta, item.dnComercial) },
          { text: String(item.cantidadComputada), alignment: 'right' as const },
          { text: etiquetaOrigenCorta(item.origen) },
        ]),
      ],
    },
    layout: layoutBloqueDeUbicacion,
    margin: [0, 4, 0, 8],
  }
}

function renderizarSeccionAccesorios(datos: DatosListadoDeMateriales, numero: number): Content[] {
  if (datos.accesorios.length === 0) {
    return [
      { text: `${numero}. Accesorios`, style: 'seccion' },
      {
        text:
          'No hay accesorios físicos para este proyecto todavía. En el modo simplificado, Caudal utiliza una ' +
          'estimación constructiva DREZA de accesorios PPR para el cómputo de materiales; en el modo ' +
          'profesional, el listado utiliza únicamente los accesorios y derivaciones explícitamente modelados.',
        style: 'notaVacio',
      },
    ]
  }

  const consolidado = resolverConsolidadoDeAccesorios(datos)
  const bloques = agruparAccesoriosPorUbicacion(datos)

  return [
    { text: `${numero}. Accesorios`, style: 'seccion' },
    // MATERIALS-PDF-POLISH-02 (brief §3): el resumen agrupado es la ÚNICA
    // fuente de verdad para la cantidad de compra -- por eso el margen NO
    // vuelve a aparecer en el detalle (brief §14), y ninguna fila
    // individual del detalle intenta prorratear o redondear el margen por
    // su cuenta.
    { text: 'Resumen de compra de accesorios', style: 'subseccion' },
    {
      table: {
        headerRows: 1,
        widths: ['*', 'auto', 'auto', 'auto'],
        body: [
          [
            { text: 'Accesorio', bold: true },
            { text: 'DN / configuración', bold: true },
            { text: 'Cantidad base [u]', bold: true },
            { text: 'Cantidad sugerida de compra [u]', bold: true },
          ],
          ...consolidado.map((fila) => [
            { text: fila.etiqueta },
            { text: descripcionDeConfiguracion(fila.etiqueta, fila.dnComercial) },
            { text: String(fila.computada), alignment: 'right' as const },
            { text: String(fila.compra), alignment: 'right' as const },
          ]),
        ],
      },
      layout: layoutTablaIuas,
      margin: [0, 4, 0, 8],
    },
    { text: 'Detalle de accesorios por ubicación', style: 'subseccion' },
    {
      text:
        'Origen: "Definido" = accesorio explícitamente modelado por el proyectista; "DREZA" = estimación ' +
        'constructiva DREZA. Las cantidades de este detalle son de BASE, sin margen -- la compra sugerida ' +
        'sólo figura en el resumen de arriba, ya agrupada por accesorio.',
      style: 'aclaracion',
    },
    ...bloques.map((bloque) => renderizarBloqueDeUbicacion(bloque)),
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
      ul: ['Medición: todavía no se seleccionó un medidor.', 'Equipos y almacenamiento: todavía no se adoptaron componentes.'],
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
  // MATERIALS-PDF-POLISH-02 (brief §15): "Artefactos previstos" no tiene
  // ningún dato de especificación en el modelo actual (siempre ''); una
  // columna íntegra de guiones no aporta nada -- se omite en vez de
  // inventar un valor o mostrar "No especificada" en cada fila. Medidores
  // y Equipos SÍ tienen especificación real (DN, volumen adoptado) y
  // conservan la columna.
  mostrarEspecificacion = true,
): Content[] {
  if (items.length === 0) {
    return [
      { text: `${numero}. ${titulo}`, style: 'seccion' },
      { text: notaVacio, style: 'notaVacio' },
    ]
  }
  const encabezado = mostrarEspecificacion
    ? [
        { text: 'Elemento', bold: true },
        { text: 'Especificación', bold: true },
        { text: 'Cantidad', bold: true },
      ]
    : [
        { text: 'Elemento', bold: true },
        { text: 'Cantidad', bold: true },
      ]
  const filas = items.map((item) =>
    mostrarEspecificacion
      ? [{ text: item.nombre }, { text: item.especificacion || '—' }, { text: String(item.cantidad), alignment: 'right' as const }]
      : [{ text: item.nombre }, { text: String(item.cantidad), alignment: 'right' as const }],
  )
  return [
    { text: `${numero}. ${titulo}`, style: 'seccion' },
    {
      table: {
        headerRows: 1,
        widths: mostrarEspecificacion ? ['*', '*', 'auto'] : ['*', 'auto'],
        body: [encabezado, ...filas],
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

  // MATERIALS-PDF-POLISH-02 (brief §12): reescrito para eliminar la
  // contradicción de la versión anterior (afirmaba "únicamente elementos
  // explícitamente respaldados" y en la misma sección incluía
  // estimaciones DREZA). Conserva las mismas 4 ideas del brief: qué
  // incluye el listado, cómo se aplica el margen (brief §3: nunca
  // prorrateado por Local/red), qué es y qué no es DREZA, y qué significa
  // "Colector principal".
  contenido.push({
    text:
      'Este listado reúne las tuberías y los elementos definidos en el proyecto, junto con los accesorios ' +
      'estimados mediante el criterio constructivo DREZA cuando se utiliza el modo simplificado. La columna ' +
      '«Origen» permite distinguir los elementos definidos de los estimados.',
    style: 'aclaracion',
  })
  contenido.push({
    text:
      'Las cantidades sugeridas de compra incorporan el margen adicional seleccionado por el usuario y se ' +
      'calculan sobre las cantidades agrupadas de cada accesorio. El margen no se distribuye individualmente ' +
      'entre locales o redes.',
    style: 'aclaracion',
  })
  contenido.push({
    text:
      'La estimación constructiva DREZA permite preparar una lista de compra razonablemente conservadora. No ' +
      'reemplaza el cómputo, el replanteo ni la verificación en obra, y no constituye una exigencia ' +
      'reglamentaria.',
    style: 'aclaracion',
  })
  contenido.push({
    text:
      '«Colector principal» denomina la distribución general desde el tanque o la alimentación hacia los ' +
      'montantes o, cuando éstos no existen, directamente hacia los locales.',
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
              ...renderizarSeccionSinMargen(siguienteNumero(), 'Medidores', datos.medidores, 'Medición: todavía no se seleccionó un medidor.'),
              ...renderizarSeccionSinMargen(
                siguienteNumero(),
                'Equipos y almacenamiento',
                datos.almacenamiento,
                'Equipos y almacenamiento: todavía no se adoptaron componentes.',
              ),
            ]),
        ...renderizarSeccionSinMargen(
          siguienteNumero(),
          'Artefactos previstos',
          datos.artefactos,
          'No hay artefactos sanitarios declarados todavía.',
          datos.artefactos.length > 0 ? 'Cantidad prevista en el proyecto; sin margen adicional.' : undefined,
          false,
        ),
        ...renderizarObservaciones(datos, siguienteNumero()),
      ]
    })(),
    header: (currentPage) =>
      currentPage === 1
        ? undefined
        : {
            columns: [
              { text: 'Caudal · DREZA — Listado de materiales', style: 'headerPie' },
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
      title: 'Caudal · DREZA — Listado de materiales',
      subject: 'Instalaciones internas de agua',
      author: 'DREZA',
    },
    styles: {
      wordmark: { fontSize: 12, bold: true, color: COLOR_MARCA },
      fechaGeneracion: { fontSize: 8, color: COLOR_TEXTO_2 },
      tituloDocumento: { fontSize: 18, bold: true, color: COLOR_MARCA_FUERTE, margin: [0, 4, 0, 0] },
      subtituloDocumento: { fontSize: 11, color: COLOR_TEXTO_2, margin: [0, 0, 0, 6] },
      seccion: { fontSize: 12, bold: true, color: COLOR_MARCA_FUERTE, margin: [0, 10, 0, 4] },
      subseccion: { fontSize: 10, bold: true, margin: [0, 4, 0, 2] },
      ubicacionTitulo: { fontSize: 9, bold: true, color: COLOR_MARCA_FUERTE },
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
