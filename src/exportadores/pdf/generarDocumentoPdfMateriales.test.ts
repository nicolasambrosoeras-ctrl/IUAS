// ACCESSORIES-DEFAULTS-01 (D-δ.139) + MATERIALS-POLISH-01: tests de
// ESTRUCTURA del docDefinition del Listado de materiales -- mismo criterio
// que generarDocumentoPdf.test.ts (inspeccionar el docDefinition, nunca
// parsear el PDF binario). Cubre numeración de secciones consecutiva,
// columna "Origen" (Estimado/Definido), Estado del listado, resumen antes
// que detalle, terminología "sugerida de compra", fecha humanizada y
// ausencia de IDs internos en el texto público.
import { describe, it, expect } from 'vitest'
import type { Content } from 'pdfmake/interfaces'
import type { Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import type { Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import { proyectoInicial } from '../../interfaz/paginas/proyectoDeEjemplo'
import { backfillLongitudesDePredimensionamiento } from '../../interfaz/paginas/backfillLongitudesDePredimensionamiento'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import { generarProyectoDeEscala } from '../../pruebas/escala/generarProyectoDeEscala'
import { resolverDatosDeListadoDeMateriales, aplicarMargenDeCompra, type DatosListadoDeMateriales } from './resolverDatosDeListadoDeMateriales'
import { construirDocDefinitionListadoMateriales, formatearFechaDeProyecto, resolverConsolidadoDeAccesorios } from './generarDocumentoPdfMateriales'

// Recolecta todas las TABLAS (`{ table: {...} }`) de un árbol de Content,
// recursivamente -- para inspeccionar `headerRows`/`dontBreakRows`/`body`
// sin depender de cómo pdfMake las renderiza visualmente.
function tablasDe(contenido: Content | readonly Content[]): { headerRows?: number; dontBreakRows?: boolean; body: unknown[][] }[] {
  if (typeof contenido === 'string') {
    return []
  }
  if (Array.isArray(contenido)) {
    return contenido.flatMap((c) => tablasDe(c))
  }
  const nodo = contenido as unknown as Record<string, unknown>
  const propia =
    nodo['table'] !== undefined
      ? [nodo['table'] as { headerRows?: number; dontBreakRows?: boolean; body: unknown[][] }]
      : []
  const deStack = Array.isArray(nodo['stack']) ? tablasDe(nodo['stack'] as Content[]) : []
  const deColumnas = Array.isArray(nodo['columns']) ? tablasDe(nodo['columns'] as Content[]) : []
  const deTablaAnidada =
    nodo['table'] !== undefined && Array.isArray((nodo['table'] as { body?: unknown }).body)
      ? (nodo['table'] as { body: unknown[][] }).body.flat().flatMap((celda) => tablasDe(celda as Content))
      : []
  return [...propia, ...deStack, ...deColumnas, ...deTablaAnidada]
}

// Local con un único Artefacto conectado (AF, o AF+AC si `conAc`), armado
// con el mismo patrón raíz->trunk->artefacto que evita que el trunk se
// confunda con la Distribución general (ver tests de
// resolverDatosDeListadoDeMateriales.test.ts). Suficiente para que DREZA
// (simplificada+estimado) genere accesorios reales de ese Local.
function construirLocalSimple(opts: {
  ufId: string
  localId: string
  tipo: UnidadFuncional['niveles'][number]['locales'][number]['tipo']
  artefactoId: string
  conAc?: boolean
}): { local: UnidadFuncional['niveles'][number]['locales'][number]; nodos: Nodo[]; tramos: Tramo[] } {
  const { ufId, localId, tipo, artefactoId, conAc = false } = opts
  const nodos: Nodo[] = []
  const tramos: Tramo[] = []
  for (const red of conAc ? (['AF', 'AC'] as const) : (['AF'] as const)) {
    const n0 = `n0-${ufId}-${localId}-${red}`
    const n1 = `n1-${ufId}-${localId}-${red}`
    const nArt = `nArt-${ufId}-${localId}-${red}`
    nodos.push(
      { id: n0 },
      { id: n1 },
      { id: nArt, referencia: { tipo: 'artefacto', unidadFuncionalId: ufId, localId, artefactoId } },
    )
    tramos.push(
      { id: `t-raiz-${ufId}-${localId}-${red}`, nodoOrigenId: n0, nodoDestinoId: n1, red, longitud_m: 3, dnComercialAdoptado: '20 mm' },
      { id: `t-art-${ufId}-${localId}-${red}`, nodoOrigenId: n1, nodoDestinoId: nArt, red, longitud_m: 2, dnComercialAdoptado: '20 mm' },
    )
  }
  return {
    local: { id: localId, tipo, regimen: 'domiciliario', artefactos: [{ id: artefactoId, artefactoId, cantidad: 1, origen: 'normativo' }] },
    nodos,
    tramos,
  }
}

function proyectoSimplificadaEstimado(ufs: readonly UnidadFuncional[], red: RedHidraulica): Proyecto {
  return {
    metadatos: { nombre: 'Proyecto de prueba', obra: 'O', comitente: 'C', fecha: '2026-01-01', schemaVersion: '1.0.0', versionNormativa: 'eras-2023' },
    parametros: { tipoDeProyecto: 'viviendaIndividual', presionSobreAcera_m: 15, alturaArtefactoMasDesfavorable_m: 0 },
    unidadesFuncionales: ufs,
    redHidraulica: red,
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'estimado',
      granularidadHidraulica: 'simplificada',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

// Misma utilidad que generarDocumentoPdf.test.ts: extrae todos los `text`
// de un árbol de Content de pdfMake, recursivamente.
function textosDe(contenido: Content | readonly Content[]): string[] {
  if (typeof contenido === 'string') {
    return [contenido]
  }
  if (Array.isArray(contenido)) {
    return contenido.flatMap((c) => textosDe(c))
  }
  const nodo = contenido as unknown as Record<string, unknown>
  const propios = typeof nodo['text'] === 'string' ? [nodo['text'] as string] : []
  const deStack = Array.isArray(nodo['stack']) ? textosDe(nodo['stack'] as Content[]) : []
  const deColumnas = Array.isArray(nodo['columns']) ? textosDe(nodo['columns'] as Content[]) : []
  const deTabla =
    nodo['table'] !== undefined && Array.isArray((nodo['table'] as { body?: unknown }).body)
      ? (nodo['table'] as { body: unknown[][] }).body.flat().flatMap((celda) => textosDe(celda as Content))
      : []
  return [...propios, ...deStack, ...deColumnas, ...deTabla]
}

// Proyecto de ejemplo con longitudes reales precargadas (Modo Rápido:
// simplificada + estimado) -- sin este backfill, proyectoInicial "crudo"
// no tiene ningún `longitud_m` (se precarga en runtime al montar la app) y
// el listado sale trivialmente PARCIAL, sin ejercitar el camino COMPLETO.
function docDelProyectoDeEjemplo() {
  const proyecto = backfillLongitudesDePredimensionamiento(proyectoInicial)
  const computo = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)
  const datos = aplicarMargenDeCompra(computo, 10)
  return construirDocDefinitionListadoMateriales(datos, new Date('2026-09-16T12:00:00-03:00'))
}

describe('construirDocDefinitionListadoMateriales — secciones y numeración', () => {
  it('numera las secciones de forma consecutiva, sin saltos (proyectoInicial: Medidores+Almacenamiento vacíos se combinan)', () => {
    const doc = docDelProyectoDeEjemplo()
    const textos = textosDe(doc.content as Content[])

    const titulosDeSeccion = textos.filter((t) => /^\d+\.\s/.test(t))
    const numeros = titulosDeSeccion.map((t) => parseInt(t.split('.')[0]!, 10))

    // MATERIALS-POLISH-01: M3/M4 sin iniciar -> Medidores + Almacenamiento
    // se combinan en "Elementos todavía no definidos" (brief §22), una
    // sola sección en vez de dos -- 5 secciones numeradas, no 6.
    expect(numeros).toEqual([1, 2, 3, 4, 5])
    expect(textos.some((t) => t === '3. Elementos todavía no definidos')).toBe(true)
    expect(textos.some((t) => t === '5. Observaciones y alcance')).toBe(true)
    expect(textos.some((t) => t.startsWith('6.'))).toBe(false)
  })

  it('la sección de accesorios se titula "N. Accesorios", ya no "... explícitamente modelados"', () => {
    const doc = docDelProyectoDeEjemplo()
    const textos = textosDe(doc.content as Content[])
    expect(textos).toContain('2. Accesorios')
    expect(textos).not.toContain('2. Accesorios explícitamente modelados')
  })
})

describe('construirDocDefinitionListadoMateriales — accesorios: Origen y resumen consolidado', () => {
  it('la tabla de accesorios tiene columna "Origen" con "DREZA" (forma compacta) para la estimación constructiva del modo simplificado', () => {
    const doc = docDelProyectoDeEjemplo()
    const textos = textosDe(doc.content as Content[])
    expect(textos).toContain('Origen')
    // proyectoInicial (Modo Rápido) tiene Locales con n>=1 en AF/AC: debe
    // haber al menos un accesorio DREZA (Llave de paso esférica es
    // constante 1 por Local+red con n>=1).
    expect(textos).toContain('Llave de paso esférica')
    expect(textos.filter((t) => t === 'DREZA').length).toBeGreaterThan(0)
  })

  it('el documento tiene "Resumen de compra de accesorios" ANTES que "Detalle de accesorios por ubicación"', () => {
    const doc = docDelProyectoDeEjemplo()
    const textos = textosDe(doc.content as Content[])
    const indiceResumen = textos.indexOf('Resumen de compra de accesorios')
    const indiceDetalle = textos.indexOf('Detalle de accesorios por ubicación')
    expect(indiceResumen).toBeGreaterThanOrEqual(0)
    expect(indiceDetalle).toBeGreaterThan(indiceResumen)
  })

  it('resumen de accesorios: 4 estimados + 2 definidos del mismo tipo+DN => computado=6, compra 10%=ceil(6.6)=7, no 8 (brief §17/§37)', () => {
    const base: DatosListadoDeMateriales = {
      proyecto: proyectoInicial,
      tuberias: [],
      accesorios: [
        { clave: 'estimadoDreza|teeEstimada|20 mm', etiqueta: 'Tee entrada central, salidas laterales', dnComercial: '20 mm', cantidadComputada: 4, origen: 'estimadoDreza', cantidadCompra: 5 },
        { clave: 'tee|Tee DN 20 mm', etiqueta: 'Tee entrada central, salidas laterales', dnComercial: '20 mm', cantidadComputada: 2, origen: 'definido', cantidadCompra: 3 },
      ],
      medidores: [],
      almacenamiento: [],
      artefactos: [],
      pendientes: [],
      estado: 'completo',
      porcentajeExtraCompra: 10,
    }

    const consolidado = resolverConsolidadoDeAccesorios(base)

    expect(consolidado).toHaveLength(1)
    expect(consolidado[0]?.computada).toBe(6)
    // ceil(6 * 1.10) = ceil(6.6) = 7 -- NUNCA 8 (que saldría de sumar
    // ceil(4*1.1)=5 + ceil(2*1.1)=3, el "doble ceil" que el brief prohíbe).
    expect(consolidado[0]?.compra).toBe(7)
  })
})

describe('construirDocDefinitionListadoMateriales — tuberías: resumen primero, sin columna Extra repetida', () => {
  it('"Resumen de compra de tuberías" aparece ANTES que "Detalle por red"', () => {
    const doc = docDelProyectoDeEjemplo()
    const textos = textosDe(doc.content as Content[])
    const indiceResumen = textos.indexOf('Resumen de compra de tuberías')
    const indiceDetalle = textos.indexOf('Detalle por red')
    expect(indiceResumen).toBeGreaterThanOrEqual(0)
    expect(indiceDetalle).toBeGreaterThan(indiceResumen)
  })

  it('ninguna tabla repite la columna "Extra [%]" (el margen ya está en el encabezado)', () => {
    const doc = docDelProyectoDeEjemplo()
    const textos = textosDe(doc.content as Content[])
    expect(textos.some((t) => t.includes('Extra ['))).toBe(false)
  })

  it('usa "Cantidad sugerida de compra", no "Cantidad para compra"', () => {
    const doc = docDelProyectoDeEjemplo()
    const textos = textosDe(doc.content as Content[])
    expect(textos.some((t) => t.includes('Cantidad sugerida de compra'))).toBe(true)
    expect(textos.some((t) => t.includes('Cantidad para compra'))).toBe(false)
  })
})

describe('construirDocDefinitionListadoMateriales — Estado del listado', () => {
  it('proyecto completo (longitudes precargadas, sin pendientes): "Listado completo"', () => {
    const doc = docDelProyectoDeEjemplo()
    const textos = textosDe(doc.content as Content[])
    expect(textos).toContain('Listado completo')
    expect(textos).not.toContain('Con elementos pendientes')
  })

  it('proyecto parcial (sin backfill de longitudes): "Listado parcial" + aclaración, sin lenguaje CUMPLE/NO CUMPLE', () => {
    const computo = resolverDatosDeListadoDeMateriales(proyectoInicial, catalogoArtefactos, coeficientesMayoracion)
    const datos = aplicarMargenDeCompra(computo, 10)
    const doc = construirDocDefinitionListadoMateriales(datos, new Date('2026-09-16T12:00:00-03:00'))
    const textos = textosDe(doc.content as Content[])

    expect(textos).toContain('Con elementos pendientes')
    expect(textos.some((t) => t.includes('Existen elementos pendientes de definición'))).toBe(true)
    expect(textos.some((t) => t.includes('CUMPLE'))).toBe(false)
  })
})

describe('construirDocDefinitionListadoMateriales — fecha del proyecto humanizada', () => {
  it('formatearFechaDeProyecto convierte ISO a es-AR ("2026-08-07" -> "7 de agosto de 2026")', () => {
    expect(formatearFechaDeProyecto('2026-08-07')).toBe('7 de agosto de 2026')
  })

  it('un dato de fecha legado/no-ISO se muestra tal cual, sin romper ni inventar una fecha', () => {
    expect(formatearFechaDeProyecto('')).toBe('')
    expect(formatearFechaDeProyecto('dato legado')).toBe('dato legado')
  })

  it('el PDF muestra la fecha del proyecto en formato es-AR, no el ISO crudo', () => {
    const doc = docDelProyectoDeEjemplo()
    const textos = textosDe(doc.content as Content[])
    expect(textos.some((t) => t === proyectoInicial.metadatos.fecha)).toBe(false)
    expect(textos.some((t) => /^\d+ de [a-zñáéíóú]+ de \d{4}$/.test(t))).toBe(true)
  })
})

describe('construirDocDefinitionListadoMateriales — sin IDs internos en el texto público', () => {
  it('ningún texto del documento expone Tramo.id/Nodo.id crudos, aun con un proyecto parcial', () => {
    // Proyecto SIN backfill: todo Tramo queda "pendiente de longitud", el
    // peor caso para exponer IDs por accidente.
    const computo = resolverDatosDeListadoDeMateriales(proyectoInicial, catalogoArtefactos, coeficientesMayoracion)
    const datos = aplicarMargenDeCompra(computo, 10)
    const doc = construirDocDefinitionListadoMateriales(datos, new Date('2026-09-16T12:00:00-03:00'))
    const textos = textosDe(doc.content as Content[])

    expect(datos.pendientes.length).toBeGreaterThan(0)
    const patronDeIdInterno = /\bt-af-\w+\b|\bn-af-\w+\b|\bn-ac-\w+\b|\bt-general\b|\bn-general\b/
    for (const texto of textos) {
      expect(texto).not.toMatch(patronDeIdInterno)
    }
  })
})

describe('construirDocDefinitionListadoMateriales — texto de cierre', () => {
  it('la aclaración final ya no afirma que ninguna pérdida estimada se convierte en pieza (ahora depende del modo)', () => {
    const doc = docDelProyectoDeEjemplo()
    const textos = textosDe(doc.content as Content[])
    expect(textos.some((t) => t.includes('junto con los accesorios estimados mediante el criterio constructivo DREZA'))).toBe(true)
  })
})

describe('construirDocDefinitionListadoMateriales — MATERIALS-PDF-POLISH-02: margen agrupado (brief §16.A)', () => {
  it('9 unidades base con 10 % => resumen de compra 10; el detalle nunca contiene una columna de cantidad de compra', () => {
    const computo = {
      proyecto: proyectoInicial,
      tuberias: [],
      accesorios: Array.from({ length: 9 }, (_, i) => ({
        clave: `x${i}`,
        etiqueta: 'Codo a 90° (recorrido del local)',
        dnComercial: '20 mm',
        cantidadComputada: 1,
        origen: 'estimadoDreza' as const,
        sector: 'local' as const,
        red: 'AF' as const,
        ubicacion: { tipo: 'local' as const, unidadFuncionalId: `uf${i}`, localId: `local${i}`, unidadFuncionalNombre: `UF ${i}`, localNombre: `Local ${i}` },
      })),
      medidores: [],
      almacenamiento: [],
      artefactos: [],
      pendientes: [],
      estado: 'completo' as const,
    }
    const conMargen = aplicarMargenDeCompra(computo, 10)
    const doc = construirDocDefinitionListadoMateriales(conMargen, new Date('2026-09-16T12:00:00-03:00'))
    const textos = textosDe(doc.content as Content[])

    // Resumen: ceil(9 * 1.10) = 10 -- nunca 18 (9 filas × "1 -> 2").
    const consolidado = resolverConsolidadoDeAccesorios(conMargen)
    expect(consolidado).toHaveLength(1)
    expect(consolidado[0]?.computada).toBe(9)
    expect(consolidado[0]?.compra).toBe(10)

    // El detalle muestra "Cantidad base [u]" -- la columna de compra sólo
    // existe en el resumen, exactamente una vez en todo el documento.
    expect(textos.filter((t) => t === 'Cantidad sugerida de compra [u]')).toHaveLength(1)
    expect(textos.filter((t) => t === 'Cantidad base [u]').length).toBeGreaterThan(1)
    // Cada fila del detalle sigue mostrando la cantidad BASE (1), nunca la
    // cantidad con margen prorrateada por fila.
    const filasDeUno = textos.filter((t) => t === '1')
    expect(filasDeUno.length).toBeGreaterThanOrEqual(9)
  })
})

describe('construirDocDefinitionListadoMateriales — MATERIALS-PDF-POLISH-02: trazabilidad por ubicación (brief §16.B)', () => {
  it('identifica cada bloque por Local/UF sin IDs técnicos, y desambigua locales homónimos entre dos UF', () => {
    const uf1 = construirLocalSimple({ ufId: 'uf1', localId: 'banoPrincipal', tipo: 'bano', artefactoId: 'lavatorio', conAc: true })
    const uf2Bano = construirLocalSimple({ ufId: 'uf2', localId: 'banoUf2', tipo: 'bano', artefactoId: 'lavatorio', conAc: true })
    const toilette = construirLocalSimple({ ufId: 'uf1', localId: 'toilette1', tipo: 'toilette', artefactoId: 'inodoroDeposito' })
    const cocina = construirLocalSimple({ ufId: 'uf1', localId: 'cocina1', tipo: 'cocina', artefactoId: 'piletaDeCocina' })
    const lavadero = construirLocalSimple({ ufId: 'uf1', localId: 'lavadero1', tipo: 'lavadero', artefactoId: 'piletaDeLavar' })

    const uf1Def: UnidadFuncional = {
      id: 'uf1',
      nombre: 'Vivienda',
      niveles: [{ id: 'uf1-n1', nombre: 'Nivel 1', locales: [uf1.local, toilette.local, cocina.local, lavadero.local] }],
    }
    const uf2Def: UnidadFuncional = {
      id: 'uf2',
      nombre: 'Departamento',
      niveles: [{ id: 'uf2-n1', nombre: 'Nivel 1', locales: [uf2Bano.local] }],
    }

    const nodos = [...uf1.nodos, ...toilette.nodos, ...cocina.nodos, ...lavadero.nodos, ...uf2Bano.nodos]
    const tramos = [...uf1.tramos, ...toilette.tramos, ...cocina.tramos, ...lavadero.tramos, ...uf2Bano.tramos]
    const proyecto = proyectoSimplificadaEstimado([uf1Def, uf2Def], { nodos, tramos })

    const computo = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)
    const datos = aplicarMargenDeCompra(computo, 0)
    const doc = construirDocDefinitionListadoMateriales(datos, new Date('2026-09-16T12:00:00-03:00'))
    const textos = textosDe(doc.content as Content[])

    // Ambos "Baño" son identificables y distintos entre sí gracias al
    // prefijo de UF (más de una UF en el proyecto -- brief §5).
    expect(textos.some((t) => t === 'Vivienda — Baño 1')).toBe(true)
    expect(textos.some((t) => t === 'Departamento — Baño 1')).toBe(true)
    expect(textos.some((t) => t === 'Vivienda — Toilette 1')).toBe(true)
    expect(textos.some((t) => t === 'Vivienda — Cocina 1')).toBe(true)
    expect(textos.some((t) => t === 'Vivienda — Lavadero 1')).toBe(true)

    // Nunca un id técnico como texto público.
    const patronDeIdInterno = /\bn0-\w+\b|\bn1-\w+\b|\bnArt-\w+\b|\bt-raiz-\w+\b|\bt-art-\w+\b|\buf1\b|\buf2\b|\bbanoPrincipal\b|\bbanoUf2\b/
    for (const texto of textos) {
      expect(texto).not.toMatch(patronDeIdInterno)
    }
  })
})

describe('construirDocDefinitionListadoMateriales — MATERIALS-PDF-POLISH-02: copy público (brief §16.D)', () => {
  it('no contiene notación interna ni terminología retirada; sí contiene el lenguaje público nuevo', () => {
    const doc = docDelProyectoDeEjemplo()
    const textos = textosDe(doc.content as Content[])
    const textoCompleto = textos.join(' \n ')

    for (const prohibido of ['Módulo 1', 'Módulo 2', 'Módulo 3', 'Módulo 4', 'Caudal by DREZA', 'Unión/cupla', 'Cantidad computada [u]', 'CRIT-', 'HYD-', 'ADR-']) {
      expect(textoCompleto).not.toContain(prohibido)
    }
    expect(textoCompleto).toContain('Caudal · DREZA')
    expect(textoCompleto).toContain('Cupla recta PPR')
    expect(textoCompleto).toContain('Cantidad base [u]')
  })
})

describe('construirDocDefinitionListadoMateriales — MATERIALS-PDF-POLISH-02: totales invariantes (brief §16.E)', () => {
  it('proyecto de referencia (10 % de margen): tuberías 65,00 m -> 71,50 m; accesorios base 88 u', () => {
    const doc = docDelProyectoDeEjemplo()
    const textos = textosDe(doc.content as Content[])

    expect(textos).toContain('65,00 m')
    expect(textos).toContain('71,50 m')
    expect(textos).toContain('88 u')

    // Nota de trazabilidad: el total "sugerido de compra" de accesorios
    // consolidado (Math.ceil por accesorio+DN -- `resolverConsolidadoDeAccesorios`,
    // que reagrupa por etiqueta+DN independientemente de la ubicación
    // detallada) da 104 u para este proyecto -- NO 105 u como muestra el
    // PDF de referencia citado en el brief original. Se verificó que la
    // discrepancia (base 88 u coincide exactamente; sólo la compra difiere
    // en 1 u) YA EXISTÍA antes de MATERIALS-PDF-POLISH-02 -- no es una
    // regresión, y no se fuerza el número ajustando la fórmula.
    //
    // HYD-EST-NETWORK-01: ambos totales (88 u base / 104 u compra) se
    // verificaron invariantes pese a que la composición interna del
    // detalle sí cambió (el tronco de Colector y la Alimentación ACS,
    // antes fusionados bajo el mismo `sector: 'colectorPrincipal'` amplio,
    // ahora aparecen como filas de detalle separadas) -- el resumen de
    // compra sigue agrupando por accesorio+DN (brief MATERIALS-PDF-POLISH-02
    // §10: "sigue siendo la única fuente de compra, sin ubicación"), así
    // que esa separación no cambia el total consolidado.
    expect(textos).toContain('104 u')
  })
})

describe('construirDocDefinitionListadoMateriales — MATERIALS-PDF-POLISH-02: paginación (brief §16.F)', () => {
  it('cada bloque de ubicación repite título+encabezado (headerRows=2) y no parte filas (dontBreakRows) en un proyecto de varias páginas', () => {
    const escala = generarProyectoDeEscala({ cantidadUf: 14, localesPorUf: 3 })
    const proyecto: Proyecto = {
      ...escala,
      configuracionHidraulica: { ...escala.configuracionHidraulica, granularidadHidraulica: 'simplificada', metodoPerdidaLocalizada: 'estimado' },
    }
    const computo = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)
    const datos = aplicarMargenDeCompra(computo, 10)
    const doc = construirDocDefinitionListadoMateriales(datos, new Date('2026-09-16T12:00:00-03:00'))

    // Suficientes accesorios como para ejercitar varios bloques/páginas
    // (14 UF x 3 locales, más Colector) -- si esto fuera chico el resto
    // del test no probaría nada.
    expect(datos.accesorios.length).toBeGreaterThan(100)

    const tablas = tablasDe(doc.content as Content[])
    // Tablas de bloque de ubicación: primera fila con `colSpan` (el título
    // fusionado) -- se distinguen de la tabla de resumen/tuberías, que no
    // usan colSpan.
    const tablasDeBloque = tablas.filter((t) => {
      const primeraFila = t.body[0]
      return Array.isArray(primeraFila) && primeraFila.some((celda) => (celda as Record<string, unknown>)?.['colSpan'] !== undefined)
    })
    expect(tablasDeBloque.length).toBeGreaterThan(10)
    for (const tabla of tablasDeBloque) {
      expect(tabla.headerRows).toBe(2)
      expect(tabla.dontBreakRows).toBe(true)
      // Título (fila 0) + encabezado de columnas (fila 1) + al menos 1 fila de datos.
      expect(tabla.body.length).toBeGreaterThanOrEqual(3)
    }
  })
})
