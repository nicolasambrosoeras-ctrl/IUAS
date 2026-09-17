// ACCESSORIES-DEFAULTS-01 (D-δ.139) + MATERIALS-POLISH-01: tests de
// ESTRUCTURA del docDefinition del Listado de materiales -- mismo criterio
// que generarDocumentoPdf.test.ts (inspeccionar el docDefinition, nunca
// parsear el PDF binario). Cubre numeración de secciones consecutiva,
// columna "Origen" (Estimado/Definido), Estado del listado, resumen antes
// que detalle, terminología "sugerida de compra", fecha humanizada y
// ausencia de IDs internos en el texto público.
import { describe, it, expect } from 'vitest'
import type { Content } from 'pdfmake/interfaces'
import { proyectoInicial } from '../../interfaz/paginas/proyectoDeEjemplo'
import { backfillLongitudesDePredimensionamiento } from '../../interfaz/paginas/backfillLongitudesDePredimensionamiento'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import { resolverDatosDeListadoDeMateriales, aplicarMargenDeCompra, type DatosListadoDeMateriales } from './resolverDatosDeListadoDeMateriales'
import { construirDocDefinitionListadoMateriales, formatearFechaDeProyecto, resolverConsolidadoDeAccesorios } from './generarDocumentoPdfMateriales'

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
  it('la tabla de accesorios tiene columna "Origen" con "Estimado DREZA" para la estimación constructiva del modo simplificado', () => {
    const doc = docDelProyectoDeEjemplo()
    const textos = textosDe(doc.content as Content[])
    expect(textos).toContain('Origen')
    // proyectoInicial (Modo Rápido) tiene Locales con n>=1 en AF/AC: debe
    // haber al menos un accesorio DREZA (Llave de paso esférica es
    // constante 1 por Local+red con n>=1).
    expect(textos).toContain('Llave de paso esférica')
    expect(textos.filter((t) => t === 'Estimado DREZA').length).toBeGreaterThan(0)
  })

  it('el documento tiene "Resumen de compra de accesorios" ANTES que "Detalle de accesorios"', () => {
    const doc = docDelProyectoDeEjemplo()
    const textos = textosDe(doc.content as Content[])
    const indiceResumen = textos.indexOf('Resumen de compra de accesorios')
    const indiceDetalle = textos.indexOf('Detalle de accesorios')
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
    expect(textos).not.toContain('Listado parcial')
  })

  it('proyecto parcial (sin backfill de longitudes): "Listado parcial" + aclaración, sin lenguaje CUMPLE/NO CUMPLE', () => {
    const computo = resolverDatosDeListadoDeMateriales(proyectoInicial, catalogoArtefactos, coeficientesMayoracion)
    const datos = aplicarMargenDeCompra(computo, 10)
    const doc = construirDocDefinitionListadoMateriales(datos, new Date('2026-09-16T12:00:00-03:00'))
    const textos = textosDe(doc.content as Content[])

    expect(textos).toContain('Listado parcial')
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
    expect(textos.some((t) => t.includes('modo simplificado, Caudal utiliza una estimación constructiva DREZA'))).toBe(true)
  })
})
