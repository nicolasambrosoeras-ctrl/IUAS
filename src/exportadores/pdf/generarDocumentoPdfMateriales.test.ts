// ACCESSORIES-DEFAULTS-01 (D-δ.139): tests de ESTRUCTURA del docDefinition
// del Listado de materiales -- mismo criterio que generarDocumentoPdf.test.ts
// (inspeccionar el docDefinition, nunca parsear el PDF binario). Cubre lo
// que cambió en este slice: numeración de secciones consecutiva (antes
// saltaba 1,2,3,4,5,7) y la columna "Origen" (Estimado/Definido).
import { describe, it, expect } from 'vitest'
import type { Content } from 'pdfmake/interfaces'
import { proyectoInicial } from '../../interfaz/paginas/proyectoDeEjemplo'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import { resolverDatosDeListadoDeMateriales, aplicarMargenDeCompra } from './resolverDatosDeListadoDeMateriales'
import { construirDocDefinitionListadoMateriales } from './generarDocumentoPdfMateriales'

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

function docDelProyectoDeEjemplo() {
  // proyectoInicial usa el preset de Modo Rápido (simplificada + estimado,
  // ver modoDeTrabajo.ts) -- ejercita la composición física por defecto
  // con datos reales, no un fixture mínimo ad-hoc.
  const computo = resolverDatosDeListadoDeMateriales(proyectoInicial, catalogoArtefactos, coeficientesMayoracion)
  const datos = aplicarMargenDeCompra(computo, 10)
  return construirDocDefinitionListadoMateriales(datos, new Date('2026-09-16T12:00:00-03:00'))
}

describe('construirDocDefinitionListadoMateriales (ACCESSORIES-DEFAULTS-01)', () => {
  it('numera las secciones de forma consecutiva, sin saltos (nunca "7." con sólo 6 secciones)', () => {
    const doc = docDelProyectoDeEjemplo()
    const textos = textosDe(doc.content as Content[])

    const titulosDeSeccion = textos.filter((t) => /^\d+\.\s/.test(t))
    const numeros = titulosDeSeccion.map((t) => parseInt(t.split('.')[0]!, 10))

    expect(numeros).toEqual([1, 2, 3, 4, 5, 6])
    expect(textos.some((t) => t === '6. Observaciones y alcance')).toBe(true)
    expect(textos.some((t) => t.startsWith('7.'))).toBe(false)
  })

  it('la sección de accesorios se titula "N. Accesorios", ya no "... explícitamente modelados"', () => {
    const doc = docDelProyectoDeEjemplo()
    const textos = textosDe(doc.content as Content[])
    expect(textos).toContain('2. Accesorios')
    expect(textos).not.toContain('2. Accesorios explícitamente modelados')
  })

  it('la tabla de accesorios tiene columna "Origen" con "Estimado" para los defaults del modo simplificado', () => {
    const doc = docDelProyectoDeEjemplo()
    const textos = textosDe(doc.content as Content[])
    expect(textos).toContain('Origen')
    // proyectoInicial (Modo Rápido) tiene Locales con n>=1 en AF/AC: debe
    // haber al menos un accesorio con origen "Estimado" (Codo a 90º y
    // Llave de paso son constantes 1 por Local+red con n>=1).
    expect(textos).toContain('Codo a 90º')
    expect(textos).toContain('Llave de paso')
    expect(textos.filter((t) => t === 'Estimado').length).toBeGreaterThan(0)
  })

  it('la aclaración final ya no afirma que ninguna pérdida estimada se convierte en pieza (ahora depende del modo)', () => {
    const doc = docDelProyectoDeEjemplo()
    const textos = textosDe(doc.content as Content[])
    expect(textos.some((t) => t.includes('modo simplificado, Caudal utiliza una composición aproximada'))).toBe(true)
  })
})
