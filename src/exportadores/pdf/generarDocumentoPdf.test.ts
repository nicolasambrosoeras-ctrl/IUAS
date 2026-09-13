// REPORT-01A: tests de ESTRUCTURA del docDefinition de pdfMake -- sin abrir
// el PDF (brief §26/§33: "preferir inspeccionar el docDefinition antes que
// parsear el binario"). construirDocDefinition es la parte pura de
// generarDocumentoPdf (arma el árbol de contenido); generarDocumentoPdf en
// sí sólo le agrega pdfMake.createPdf(...).open(), que no es testeable sin
// navegador y no se ejercita acá.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import type { Content } from 'pdfmake/interfaces'
import { backfillLongitudesDePredimensionamiento } from '../../interfaz/paginas/backfillLongitudesDePredimensionamiento'
import { proyectoInicial } from '../../interfaz/paginas/proyectoDeEjemplo'
import { conCotaDeNodo, conDnComercialAdoptadoDeTramo } from '../../interfaz/paginas/actualizarRedHidraulica'
import { conPropiedadHorizontal, conTipoProvisionACS } from '../../interfaz/paginas/actualizarConfiguracionMedidores'
import {
  conEsquemaDeAbastecimiento,
  conPeriodoConsumoMaximo,
  conVolumenTanqueElevadoAdoptado,
} from '../../interfaz/paginas/actualizarConfiguracionAbastecimiento'
import {
  conDesnivelConexion,
  conDiametroNominalConexion,
  conPresionSobreAcera,
} from '../../interfaz/paginas/actualizarParametrosDeConexion'
import { generarProyectoDeEscala, NIVEL_DE_ESCALA } from '../../pruebas/escala/generarProyectoDeEscala'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import { resolverDatosDeInforme } from './resolverDatosDeInforme'
import { construirDocDefinition } from './generarDocumentoPdf'

function canonico() {
  let p = backfillLongitudesDePredimensionamiento(proyectoInicial)
  p = conCotaDeNodo(p, 'n-general', 20)
  p = conDnComercialAdoptadoDeTramo(p, 't-general', '32 mm')
  p = conPropiedadHorizontal(p, true)
  p = conTipoProvisionACS(p, 'individual')
  p = conEsquemaDeAbastecimiento(p, 'tanqueElevado')
  p = conPeriodoConsumoMaximo(p, 2)
  p = conDiametroNominalConexion(p, 0.019)
  p = conPresionSobreAcera(p, 5)
  p = conDesnivelConexion(p, 0)
  p = conVolumenTanqueElevadoAdoptado(p, 5)
  return p
}

// Extrae todos los `text` de un árbol de Content de pdfMake, recursivamente
// (stack/table/arrays anidados), para poder buscar una sección por su
// título sin depender de la posición exacta en el árbol.
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
  const deTabla =
    nodo['table'] !== undefined && Array.isArray((nodo['table'] as { body?: unknown }).body)
      ? (nodo['table'] as { body: unknown[][] }).body.flat().flatMap((celda) => textosDe(celda as Content))
      : []
  return [...propios, ...deStack, ...deTabla]
}

describe('construirDocDefinition (REPORT-01A)', () => {
  it('incluye las secciones M1, M2 y Verificación hidráulica sin perder Demanda', () => {
    const datos = resolverDatosDeInforme(canonico(), catalogoArtefactos, coeficientesMayoracion)
    const doc = construirDocDefinition(datos)
    const textos = textosDe(doc.content as Content[])
    expect(textos).toContain('Unidades funcionales')
    expect(textos).toContain('Tuberías')
    expect(textos).toContain('Verificación hidráulica')
    expect(textos.some((t) => t.includes('Terminal crítico'))).toBe(true)
    // M1 no se pierde: el Local con artefactos sigue apareciendo.
    expect(textos.some((t) => t.startsWith('Local:'))).toBe(true)
  })

  it('nunca duplica cálculo: no importa pdfMake ninguna fórmula hidráulica propia', () => {
    // Test de arquitectura, no de contenido: generarDocumentoPdf.ts no debe
    // importar directamente ningún resolver de fórmula (Qc/DN/V/hf/presión) --
    // sólo resolverDatosDeInforme.ts hace esa composición (C-05).
    const fuente = readFileSync(new URL('./generarDocumentoPdf.ts', import.meta.url), 'utf8')
    expect(fuente).not.toMatch(/from '\.\.\/\.\.\/motor\//)
  })

  it('proyecto grande (escala M): no lanza y produce múltiples filas de M2', () => {
    const grande = generarProyectoDeEscala(NIVEL_DE_ESCALA.M)
    const datos = resolverDatosDeInforme(grande, catalogoArtefactos, coeficientesMayoracion)
    expect(() => construirDocDefinition(datos)).not.toThrow()
    expect(datos.m2.locales.length).toBeGreaterThan(1)
  })
})
