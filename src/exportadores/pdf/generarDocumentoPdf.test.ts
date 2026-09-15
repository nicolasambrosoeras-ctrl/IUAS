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
import { conMontanteNuevo } from '../../interfaz/paginas/montantesDelProyecto'
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

describe('construirDocDefinition (REPORT-01B: memoria de cálculo)', () => {
  it('la cabecera ya no dice "Módulo: demanda" -- identifica el documento como memoria de cálculo', () => {
    const datos = resolverDatosDeInforme(canonico(), catalogoArtefactos, coeficientesMayoracion)
    const doc = construirDocDefinition(datos)
    const textos = textosDe(doc.content as Content[])
    expect(textos.some((t) => t.includes('Memoria de cálculo'))).toBe(true)
    expect(textos.some((t) => t.startsWith('Módulo:'))).toBe(false)
  })

  it('M2 incluye el desarrollo de cálculo de velocidad, pérdida distribuida y localizada estimada', () => {
    const datos = resolverDatosDeInforme(canonico(), catalogoArtefactos, coeficientesMayoracion)
    const doc = construirDocDefinition(datos)
    const textos = textosDe(doc.content as Content[])
    expect(textos.some((t) => t.includes('Desarrollo de cálculo'))).toBe(true)
    expect(textos.some((t) => t.includes('V = Q / A'))).toBe(true)
    expect(textos.some((t) => t.includes('Caso representativo'))).toBe(true)
    expect(textos.some((t) => t.includes('K total ='))).toBe(true)
  })

  it('Verificación incluye la fórmula central, la nota de hfEquipoACS y el desarrollo del crítico', () => {
    const datos = resolverDatosDeInforme(canonico(), catalogoArtefactos, coeficientesMayoracion)
    const doc = construirDocDefinition(datos)
    const textos = textosDe(doc.content as Content[])
    expect(textos.some((t) => t.includes('Presidual = Pdisponible − Δz − hfDistribuida − hfLocalizada − hfMedidor'))).toBe(true)
    expect(textos.some((t) => t.includes('hfEquipoACS no participa'))).toBe(true)
    expect(textos.some((t) => t.includes('menor margen respecto de Pmin'))).toBe(true)
    expect(textos.some((t) => t.includes('Desarrollo de cálculo del terminal crítico'))).toBe(true)
    expect(textos.some((t) => t.startsWith('Conclusión:'))).toBe(true)
  })

  it('la tabla de tuberías no repite la unidad en cada celda (unidad sólo en el header)', () => {
    const datos = resolverDatosDeInforme(canonico(), catalogoArtefactos, coeficientesMayoracion)
    const doc = construirDocDefinition(datos)
    const textos = textosDe(doc.content as Content[])
    expect(textos.some((t) => t === 'V [m/s]')).toBe(true)
    // Ninguna celda de valor debe traer "m/s" pegado (sólo el header lo tiene).
    expect(textos.some((t) => /^\d[\d.,]* m\/s$/.test(t))).toBe(false)
  })

  // HYD-ACS-MANUAL-LOSS-01 (D-δ.129): el terminal crítico de canonico() es
  // de red AC (verificado en resolverDatosDeInforme.test.ts) -- caso real
  // para ejercitar la memoria de cálculo con el dato manual informado.
  it('hfEquipoACS_mca informado: la memoria muestra la ecuación con el término, sin el warning de "no informado"', () => {
    const conDato = { ...canonico(), hfEquipoACS_mca: 2.4 }
    const datos = resolverDatosDeInforme(conDato, catalogoArtefactos, coeficientesMayoracion)
    const doc = construirDocDefinition(datos)
    const textos = textosDe(doc.content as Content[])

    expect(textos.some((t) => t.includes('Presidual = Pdisponible − Δz − hfDistribuida − hfLocalizada − hfMedidor − hfEquipoACS'))).toBe(true)
    expect(textos.some((t) => t.includes('hfEquipoACS (dato manual del fabricante)'))).toBe(true)
    expect(textos.some((t) => t.includes('2,400 m.c.a.'))).toBe(true)
    expect(textos.some((t) => t.includes('Pérdida del equipo ACS adoptada manualmente'))).toBe(true)
    // El warning de "no informado" no debe aparecer más en el desarrollo del crítico.
    expect(textos.some((t) => t.includes('hfEquipoACS no participa de este balance: todavía no fue informado'))).toBe(false)
  })

  it('hfEquipoACS_mca ausente: sigue mostrando la fórmula base y el warning de "no informado"', () => {
    const datos = resolverDatosDeInforme(canonico(), catalogoArtefactos, coeficientesMayoracion)
    const doc = construirDocDefinition(datos)
    const textos = textosDe(doc.content as Content[])

    expect(textos.some((t) => t.includes('hfEquipoACS no participa de este balance: todavía no fue informado'))).toBe(true)
    expect(textos.some((t) => t.includes('Presidual = Pdisponible − Δz − hfDistribuida − hfLocalizada − hfMedidor − hfEquipoACS'))).toBe(false)
  })
})

describe('construirDocDefinition (FIX-REPORT-01B-VISUAL-01)', () => {
  it('P1: la fórmula Hazen-Williams usa exponentes ASCII correctos, no la representación rota anterior', () => {
    const datos = resolverDatosDeInforme(canonico(), catalogoArtefactos, coeficientesMayoracion)
    const doc = construirDocDefinition(datos)
    const textos = textosDe(doc.content as Content[])
    expect(textos.some((t) => t.includes('Q^1,852'))).toBe(true)
    expect(textos.some((t) => t.includes('C^1,852'))).toBe(true)
    expect(textos.some((t) => t.includes('Di^4,87'))).toBe(true)
    // Nunca la representación corrupta previa (superíndices apilados / "Q³").
    expect(textos.some((t) => /Q³|¹∙⁸⁵²|⁴∙⁸⁷/.test(t))).toBe(false)
  })

  it('P2: la columna Estado usa texto ASCII, sin glifos frágiles (✓/⚠)', () => {
    const datos = resolverDatosDeInforme(canonico(), catalogoArtefactos, coeficientesMayoracion)
    const doc = construirDocDefinition(datos)
    const textos = textosDe(doc.content as Content[])
    expect(textos.some((t) => t === 'OK')).toBe(true)
    expect(textos.some((t) => /[✓⚠○]/.test(t))).toBe(false)
  })

  it('P3: DN y Di son columnas separadas con valores reales distintos', () => {
    const datos = resolverDatosDeInforme(canonico(), catalogoArtefactos, coeficientesMayoracion)
    const doc = construirDocDefinition(datos)
    const textos = textosDe(doc.content as Content[])
    expect(textos.some((t) => t === 'DN [mm]')).toBe(true)
    expect(textos.some((t) => t === 'Di [mm]')).toBe(true)
    // No debe quedar ningún header ambiguo "DN / Di" combinado.
    expect(textos.some((t) => t.includes('DN / Di'))).toBe(false)
    // Al menos una fila real de M2 con DN comercial != Di interior real
    // (nunca son el mismo valor: el DN nominal siempre excede el Di real).
    const filaConDatos = datos.m2.locales.flatMap((g) => g.filas).find((f) => f.dnTexto !== '—' && f.diTexto !== '—')
    expect(filaConDatos).toBeDefined()
    expect(filaConDatos!.dnTexto.replace(' mm', '')).not.toBe(filaConDatos!.diTexto)
  })

  it('P4: no duplica "Origen hidráulico" ni la Unidad Funcional en la identificación del crítico', () => {
    const datos = resolverDatosDeInforme(canonico(), catalogoArtefactos, coeficientesMayoracion)
    const doc = construirDocDefinition(datos)
    const textos = textosDe(doc.content as Content[])
    expect(textos.some((t) => t.includes('Alimentación directa (Alimentación directa'))).toBe(false)
    expect(textos.some((t) => t.includes('Tanque elevado (Tanque elevado'))).toBe(false)
    const identificacionCritico = textos.find((t) => t.includes('— Receptáculo de ducha') || (t.includes(' — ') && t.includes('Baño')))
    if (identificacionCritico !== undefined) {
      const ocurrencias = identificacionCritico.split('Unidad funcional').length - 1
      expect(ocurrencias).toBeLessThanOrEqual(1)
    }
  })

  it('P5: la tabla de detalle de verificación por terminal arranca con un pageBreak explícito', () => {
    const datos = resolverDatosDeInforme(canonico(), catalogoArtefactos, coeficientesMayoracion)
    const doc = construirDocDefinition(datos)
    const contenido = doc.content as unknown as Record<string, unknown>[]
    const indiceEncabezado = contenido.findIndex((c) => c['text'] === 'Detalle de verificación por terminal')
    expect(indiceEncabezado).toBeGreaterThanOrEqual(0)
    expect(contenido[indiceEncabezado]!['pageBreak']).toBe('before')
  })

  it('P6: las sustituciones usan notación científica legible, no "1.6286e-4"', () => {
    const datos = resolverDatosDeInforme(canonico(), catalogoArtefactos, coeficientesMayoracion)
    const doc = construirDocDefinition(datos)
    const textos = textosDe(doc.content as Content[])
    expect(textos.some((t) => /\de-\d/.test(t))).toBe(false)
    expect(textos.some((t) => t.includes('× 10^'))).toBe(true)
  })
})

describe('construirDocDefinition (REPORT-01C: Medidores + Alimentación y reserva)', () => {
  it('incluye las cinco secciones conceptuales de la memoria completa, sin lanzar ni mostrar IDs internos', () => {
    const datos = resolverDatosDeInforme(canonico(), catalogoArtefactos, coeficientesMayoracion)
    const doc = construirDocDefinition(datos)
    const textos = textosDe(doc.content as Content[])
    expect(textos).toContain('Unidades funcionales') // M1
    expect(textos).toContain('Tuberías') // M2
    expect(textos).toContain('Verificación hidráulica') // Verificación
    expect(textos).toContain('Medidores') // M3
    expect(textos).toContain('Alimentación y reserva') // M4
    expect(textos.some((t) => /\buf-\d|local-|artefacto-/.test(t))).toBe(false)
  })

  it('M3 incluye la fórmula del medidor, un caso representativo y la nota de alcance ACS individual', () => {
    const datos = resolverDatosDeInforme(canonico(), catalogoArtefactos, coeficientesMayoracion)
    const doc = construirDocDefinition(datos)
    const textos = textosDe(doc.content as Content[])
    expect(textos.some((t) => t.includes('0,036 · (Qcl / C)^2'))).toBe(true)
    expect(textos.some((t) => t.includes('Caso representativo'))).toBe(true)
    expect(textos.some((t) => t.includes('también alcanza el'))).toBe(true)
    expect(textos.some((t) => t.includes('Capacidad adoptada según Tabla N°6'))).toBe(true)
  })

  it('M4 incluye Pcalc con signo, Dc/VReserva y distingue calculado de adoptado', () => {
    const datos = resolverDatosDeInforme(canonico(), catalogoArtefactos, coeficientesMayoracion)
    const doc = construirDocDefinition(datos)
    const textos = textosDe(doc.content as Content[])
    expect(textos.some((t) => t.includes('Pcalc = Pacera − desnivelConexion'))).toBe(true)
    expect(textos.some((t) => t.includes('Dc = máx(0, Qc − Qconn)'))).toBe(true)
    expect(textos.some((t) => t.includes('Volumen calculado') && t.includes('Volumen adoptado'))).toBe(true)
  })

  it('esquema directa: no genera un bloque de reserva irrelevante', () => {
    const directa = conPresionSobreAcera(conEsquemaDeAbastecimiento(canonico(), 'directa'), 25)
    const datos = resolverDatosDeInforme(directa, catalogoArtefactos, coeficientesMayoracion)
    const doc = construirDocDefinition(datos)
    const textos = textosDe(doc.content as Content[])
    expect(textos.some((t) => t.includes('la reserva por tanque no aplica'))).toBe(true)
    expect(textos.some((t) => t.includes('Dc = máx'))).toBe(false)
  })

  it('sin propiedad horizontal: declara explícitamente que no corresponde medidor individual', () => {
    const sinPH = conPropiedadHorizontal(canonico(), false)
    const datos = resolverDatosDeInforme(sinPH, catalogoArtefactos, coeficientesMayoracion)
    const doc = construirDocDefinition(datos)
    const textos = textosDe(doc.content as Content[])
    expect(textos.some((t) => t.includes('no corresponde medidor individual'))).toBe(true)
  })

  it('proyecto de escala M: la memoria completa (M1-M4) no lanza', () => {
    const grande = generarProyectoDeEscala(NIVEL_DE_ESCALA.M)
    const datos = resolverDatosDeInforme(grande, catalogoArtefactos, coeficientesMayoracion)
    expect(() => construirDocDefinition(datos)).not.toThrow()
  })
})

describe('construirDocDefinition (FIX-REPORT-01C-VISUAL-01)', () => {
  it('P1.A: la Conclusión del crítico vive en el mismo bloque unbreakable que la fórmula/margen, antes del pageBreak del detalle', () => {
    const datos = resolverDatosDeInforme(canonico(), catalogoArtefactos, coeficientesMayoracion)
    const doc = construirDocDefinition(datos)
    const contenido = doc.content as unknown as Record<string, unknown>[]

    const indiceCritico = contenido.findIndex(
      (c) => c['unbreakable'] === true && textosDe(c as unknown as Content).some((t) => t.startsWith('Conclusión:')),
    )
    const indiceDetalle = contenido.findIndex((c) => c['text'] === 'Detalle de verificación por terminal')

    expect(indiceCritico).toBeGreaterThanOrEqual(0)
    expect(indiceDetalle).toBeGreaterThan(indiceCritico)
    // La fórmula y el margen deben vivir en el MISMO nodo que la Conclusión
    // (no en nodos sueltos anteriores que pdfMage podría partir aparte).
    const textosDelBloqueCritico = textosDe(contenido[indiceCritico] as unknown as Content)
    expect(textosDelBloqueCritico.some((t) => t === 'Presidual = Pdisponible − Δz − hfDistribuida − hfLocalizada − hfMedidor')).toBe(true)
    expect(textosDelBloqueCritico.some((t) => t.startsWith('Margen ='))).toBe(true)
  })

  it('P1.B: el detalle de verificación por terminal conserva su pageBreak:"before"', () => {
    const datos = resolverDatosDeInforme(canonico(), catalogoArtefactos, coeficientesMayoracion)
    const doc = construirDocDefinition(datos)
    const contenido = doc.content as unknown as Record<string, unknown>[]
    const indiceDetalle = contenido.findIndex((c) => c['text'] === 'Detalle de verificación por terminal')
    expect(indiceDetalle).toBeGreaterThanOrEqual(0)
    expect(contenido[indiceDetalle]!['pageBreak']).toBe('before')
  })

  it('P2.C: tanque elevado sin propiedad horizontal -- M3 sigue mostrando el medidor general, memoria aclara que no participa, Verificación mantiene hfMedidor=0 (sin cambios de cálculo)', () => {
    const sinPH = conPropiedadHorizontal(canonico(), false)
    const d = resolverDatosDeInforme(sinPH, catalogoArtefactos, coeficientesMayoracion)
    expect(d.m3.resultado?.medidorGeneral).toBeDefined()
    expect(d.m3.resultado!.medidorGeneral.adoptado.hfMedidor_mca).toBeGreaterThan(0)

    const doc = construirDocDefinition(d)
    const textos = textosDe(doc.content as Content[])
    expect(textos.some((t) => t.includes('Medidor general'))).toBe(true)
    expect(textos.some((t) => t.includes('no participa del balance de'))).toBe(true)

    // La Verificación sigue calculando hfMedidor con el MISMO criterio de
    // siempre (resolverPerdidasDeMedidoresParaTerminal): sin PH y con
    // origen tanque elevado, ningún medidor aplica -- hfMedidor = 0, nunca
    // el hf del medidor general que M3 sí resolvió.
    const filaConHfMedidorCero = d.verificacion.filas.some((f) => f.hfMedidorTexto === '0,000 m.c.a.')
    expect(filaConHfMedidorCero).toBe(true)
  })

  it('P2.D: origen directa -- nunca muestra la nota de exclusión (el medidor general sí participa)', () => {
    const directa = conPresionSobreAcera(conEsquemaDeAbastecimiento(canonico(), 'directa'), 25)
    const d = resolverDatosDeInforme(directa, catalogoArtefactos, coeficientesMayoracion)
    expect(d.m3.resultado?.medidorGeneral).toBeDefined()
    const doc = construirDocDefinition(d)
    const textos = textosDe(doc.content as Content[])
    expect(textos.some((t) => t.includes('no participa del balance de'))).toBe(false)
  })

  it('P3: orden hidráulico de M2 -- Distribución general/secundaria -> Montantes -> Locales', () => {
    const conMontante = conMontanteNuevo(canonico(), 'AF').proyecto
    const datos = resolverDatosDeInforme(conMontante, catalogoArtefactos, coeficientesMayoracion)
    const doc = construirDocDefinition(datos)
    const textos = textosDe(doc.content as Content[])
    const iGeneral = textos.indexOf('Distribución general / secundaria')
    const iMontantes = textos.indexOf('Montantes')
    const iLocales = textos.indexOf('Unidades funcionales — Locales')
    expect(iGeneral).toBeGreaterThanOrEqual(0)
    expect(iMontantes).toBeGreaterThan(iGeneral)
    expect(iLocales).toBeGreaterThan(iMontantes)
  })
})
