// REPORT-01A: tests de ESTRUCTURA del docDefinition de pdfMake -- sin abrir
// el PDF (brief §26/§33: "preferir inspeccionar el docDefinition antes que
// parsear el binario"). construirDocDefinition es la parte pura de
// generarDocumentoPdf (arma el árbol de contenido); generarDocumentoPdf en
// sí sólo le agrega pdfMake.createPdf(...).open(), que no es testeable sin
// navegador y no se ejercita acá.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import type { Content } from 'pdfmake/interfaces'
import type { Proyecto } from '../../modelo/proyecto'
import { crearProyectoVacio } from '../../interfaz/paginas/crearProyectoVacio'
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
import { construirDocDefinition, resolverNombreDeArchivo } from './generarDocumentoPdf'
import { VERSION_APP } from '../../version'

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
  const deColumnas = Array.isArray(nodo['columns']) ? textosDe(nodo['columns'] as Content[]) : []
  const deTabla =
    nodo['table'] !== undefined && Array.isArray((nodo['table'] as { body?: unknown }).body)
      ? (nodo['table'] as { body: unknown[][] }).body.flat().flatMap((celda) => textosDe(celda as Content))
      : []
  return [...propios, ...deStack, ...deColumnas, ...deTabla]
}

describe('construirDocDefinition (REPORT-01A)', () => {
  it('incluye las secciones M1, M2 y Verificación hidráulica sin perder Demanda', () => {
    const datos = resolverDatosDeInforme(canonico(), catalogoArtefactos, coeficientesMayoracion)
    const doc = construirDocDefinition(datos)
    const textos = textosDe(doc.content as Content[])
    expect(textos).toContain('Unidades funcionales')
    expect(textos).toContain('2. Tuberías')
    expect(textos).toContain('5. Verificación hidráulica')
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

  // BETA-WEB-METADATA-01: la memoria muestra la versión de la app sincronizada
  // con `package.json`/`src/version.ts`, no un valor desactualizado ni fijo.
  it('informa la versión de la aplicación sincronizada (VERSION_APP)', () => {
    const datos = resolverDatosDeInforme(canonico(), catalogoArtefactos, coeficientesMayoracion)
    const doc = construirDocDefinition(datos)
    const textos = textosDe(doc.content as Content[])
    expect(textos).toContain(`Versión de la aplicación: ${VERSION_APP}.`)
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
    expect(textos.some((t) => t.includes('pérdida del equipo de agua caliente sanitaria (ACS) no participa'))).toBe(true)
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
    expect(textos.some((t) => t.includes('pérdida del equipo de agua caliente sanitaria (ACS) no participa de este balance'))).toBe(false)
  })

  it('hfEquipoACS_mca ausente: sigue mostrando la fórmula base y el warning de "no informado"', () => {
    const datos = resolverDatosDeInforme(canonico(), catalogoArtefactos, coeficientesMayoracion)
    const doc = construirDocDefinition(datos)
    const textos = textosDe(doc.content as Content[])

    expect(textos.some((t) => t.includes('pérdida del equipo de agua caliente sanitaria (ACS) no participa de este balance'))).toBe(true)
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

  it('REPORT-POLISH-02: el título de la tabla de detalle viaja con el encabezado (headerRows:2), sin pageBreak forzado', () => {
    const datos = resolverDatosDeInforme(canonico(), catalogoArtefactos, coeficientesMayoracion)
    const doc = construirDocDefinition(datos)
    const contenido = doc.content as unknown as Record<string, unknown>[]
    const nodoTabla = contenido.find((c) => (c['table'] as { headerRows?: number } | undefined)?.headerRows === 2) as
      | { table: { body: { text?: string }[][] } }
      | undefined
    expect(nodoTabla).toBeDefined()
    expect(nodoTabla!.table.body[0]![0]!.text).toBe('Detalle de verificación por terminal')
    // Ya no existe un nodo suelto con pageBreak:'before' para este título --
    // el título es ahora parte de la propia tabla, así que nunca queda
    // huérfano (pdfMake nunca separa las headerRows del resto de la tabla).
    expect(contenido.find((c) => c['text'] === 'Detalle de verificación por terminal')).toBeUndefined()
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
    expect(textos).toContain('2. Tuberías') // M2
    expect(textos).toContain('5. Verificación hidráulica') // Verificación
    expect(textos).toContain('3. Medidores') // M3
    expect(textos).toContain('4. Abastecimiento y reserva') // M4
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
    const indiceDetalle = contenido.findIndex(
      (c) => (c['table'] as { headerRows?: number } | undefined)?.headerRows === 2,
    )

    expect(indiceCritico).toBeGreaterThanOrEqual(0)
    expect(indiceDetalle).toBeGreaterThan(indiceCritico)
    // La fórmula y el margen deben vivir en el MISMO nodo que la Conclusión
    // (no en nodos sueltos anteriores que pdfMage podría partir aparte).
    const textosDelBloqueCritico = textosDe(contenido[indiceCritico] as unknown as Content)
    expect(textosDelBloqueCritico.some((t) => t === 'Presidual = Pdisponible − Δz − hfDistribuida − hfLocalizada − hfMedidor')).toBe(true)
    expect(textosDelBloqueCritico.some((t) => t.startsWith('Margen ='))).toBe(true)
  })

  it('REPORT-POLISH-02: el detalle de verificación por terminal ya no fuerza un pageBreak incondicional', () => {
    const datos = resolverDatosDeInforme(canonico(), catalogoArtefactos, coeficientesMayoracion)
    const doc = construirDocDefinition(datos)
    const contenido = doc.content as unknown as Record<string, unknown>[]
    const nodoTabla = contenido.find((c) => (c['table'] as { headerRows?: number } | undefined)?.headerRows === 2)
    expect(nodoTabla).toBeDefined()
    expect(nodoTabla!['pageBreak']).toBeUndefined()
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
    const iGeneral = textos.indexOf('2.1 Distribución general / secundaria')
    const iMontantes = textos.indexOf('2.2 Montantes')
    const iLocales = textos.indexOf('2.3 Unidades funcionales — Locales')
    expect(iGeneral).toBeGreaterThanOrEqual(0)
    expect(iMontantes).toBeGreaterThan(iGeneral)
    expect(iLocales).toBeGreaterThan(iMontantes)
  })
})

// Busca, recursivamente, todo nodo con `unbreakable: true` en el árbol
// (mismo recorrido stack/table que `textosDe`, pero devolviendo los nodos
// en vez del texto).
function nodosUnbreakable(contenido: Content | readonly Content[]): Record<string, unknown>[] {
  if (typeof contenido === 'string' || contenido == null) {
    return []
  }
  if (Array.isArray(contenido)) {
    return contenido.flatMap((c) => nodosUnbreakable(c))
  }
  const nodo = contenido as unknown as Record<string, unknown>
  const propio = nodo['unbreakable'] === true ? [nodo] : []
  const deStack = Array.isArray(nodo['stack']) ? nodosUnbreakable(nodo['stack'] as Content[]) : []
  return [...propio, ...deStack]
}

describe('construirDocDefinition (REPORT-POLISH-01: portada, resumen, header/footer, paginación)', () => {
  const datosCompleto = resolverDatosDeInforme(canonico(), catalogoArtefactos, coeficientesMayoracion)
  const fechaFija = new Date('2026-09-15T12:00:00-03:00')

  it('portada: wordmark, título, subtítulo, nombre del proyecto y fecha, ANTES de cualquier sección numerada', () => {
    const doc = construirDocDefinition(datosCompleto, fechaFija)
    const textos = textosDe(doc.content as Content[])
    const iWordmark = textos.indexOf('IUAS')
    const iTitulo = textos.indexOf('Memoria de cálculo')
    const iSubtitulo = textos.indexOf('Instalaciones internas de agua')
    const iNombreProyecto = textos.indexOf(datosCompleto.proyecto.metadatos.nombre)
    const iFecha = textos.findIndex((t) => t.includes('Generado el'))
    const iSeccion1 = textos.indexOf('1. Demanda')
    for (const indice of [iWordmark, iTitulo, iSubtitulo, iNombreProyecto, iFecha]) {
      expect(indice).toBeGreaterThanOrEqual(0)
    }
    expect(iWordmark).toBeLessThan(iTitulo)
    expect(iFecha).toBeLessThan(iSeccion1)
    // brief §50: fecha legible es-AR, no ISO ni timestamp crudo.
    expect(textos.some((t) => t.includes('15 de septiembre de 2026'))).toBe(true)
  })

  it('resumen del cálculo: aparece después de la portada y antes de "1. Demanda", con los KPIs esperados', () => {
    const doc = construirDocDefinition(datosCompleto, fechaFija)
    const textos = textosDe(doc.content as Content[])
    const iResumen = textos.indexOf('Resumen del cálculo')
    const iSeccion1 = textos.indexOf('1. Demanda')
    expect(iResumen).toBeGreaterThanOrEqual(0)
    expect(iResumen).toBeLessThan(iSeccion1)
    expect(textos).toContain('Caudal de cálculo (Qc)')
    expect(textos).toContain('Unidades funcionales')
    expect(textos).toContain('Esquema de abastecimiento')
    expect(textos).toContain('Estado general')
    // El resumen refleja el mismo estado que ya resolvió Verificación
    // (sin recalcular) -- CUMPLE o NO CUMPLE según el crítico real.
    expect(textos.some((t) => t === 'CUMPLE' || t === 'NO CUMPLE')).toBe(true)
  })

  it('un proyecto sin M3/M4/Verificación configurados muestra "No evaluado" en el resumen, nunca 0/—/NaN', () => {
    const vacio = backfillLongitudesDePredimensionamiento(proyectoInicial)
    const datos = resolverDatosDeInforme(vacio, catalogoArtefactos, coeficientesMayoracion)
    const doc = construirDocDefinition(datos, fechaFija)
    const textos = textosDe(doc.content as Content[])
    expect(textos.some((t) => t === 'No evaluado')).toBe(true)
    expect(textos.some((t) => /\bNaN\b/.test(t))).toBe(false)
  })

  it('secciones numeradas en orden: 1 Demanda -> 2 Tuberías -> 3 Medidores -> 4 Abastecimiento -> 5 Verificación -> 6 Metodología', () => {
    const doc = construirDocDefinition(datosCompleto, fechaFija)
    const textos = textosDe(doc.content as Content[])
    const indices = [
      textos.indexOf('1. Demanda'),
      textos.indexOf('2. Tuberías'),
      textos.indexOf('3. Medidores'),
      textos.indexOf('4. Abastecimiento y reserva'),
      textos.indexOf('5. Verificación hidráulica'),
      textos.indexOf('6. Metodología y fuentes'),
    ]
    for (const indice of indices) {
      expect(indice).toBeGreaterThanOrEqual(0)
    }
    for (let i = 1; i < indices.length; i += 1) {
      expect(indices[i]).toBeGreaterThan(indices[i - 1]!)
    }
  })

  it('header/footer: ausentes en la portada (página 1), presentes desde la página 2 con numeración', () => {
    const doc = construirDocDefinition(datosCompleto, fechaFija)
    expect(typeof doc.header).toBe('function')
    expect(typeof doc.footer).toBe('function')
    const header = doc.header as (p: number, c: number) => Content | undefined
    const footer = doc.footer as (p: number, c: number) => Content | undefined
    expect(header(1, 10)).toBeUndefined()
    expect(footer(1, 10)).toBeUndefined()
    const headerP2 = header(2, 10)
    const footerP2 = footer(2, 10)
    expect(headerP2).toBeDefined()
    expect(footerP2).toBeDefined()
    expect(textosDe(headerP2 as Content).some((t) => t.includes('IUAS — Memoria de cálculo'))).toBe(true)
    expect(textosDe(footerP2 as Content).some((t) => t.includes('Página 2 de 10'))).toBe(true)
  })

  it('metadata PDF (info): title/subject/author configurados, sin datos privados', () => {
    const doc = construirDocDefinition(datosCompleto, fechaFija)
    expect(doc.info?.title).toBe('IUAS — Memoria de cálculo')
    expect(doc.info?.subject).toBe('Instalaciones internas de agua')
    expect(doc.info?.author).toBe('IUAS')
  })

  it('estilos: la paleta de marca y los banners CUMPLE/NO CUMPLE están definidos', () => {
    const doc = construirDocDefinition(datosCompleto, fechaFija)
    expect(doc.styles?.['bannerConforme']).toBeDefined()
    expect(doc.styles?.['bannerNoConforme']).toBeDefined()
    expect(doc.styles?.['portadaTitulo']).toBeDefined()
    expect(doc.styles?.['subseccionUf']).toBeDefined()
  })

  it('la sección del terminal crítico (banner + tabla + desarrollo) sigue siendo un bloque unbreakable', () => {
    const doc = construirDocDefinition(datosCompleto, fechaFija)
    const bloques = nodosUnbreakable(doc.content as Content[])
    const bloqueCritico = bloques.find((b) => textosDe(b as unknown as Content).includes('Desarrollo de cálculo del terminal crítico'))
    expect(bloqueCritico).toBeDefined()
  })

  it('las tablas técnicas (Tuberías/Medidores/Verificación), que pueden crecer con el proyecto, repiten header en cada página', () => {
    const doc = construirDocDefinition(datosCompleto, fechaFija)
    function tablasDe(contenido: Content | readonly Content[]): { headerRows?: number; body?: unknown[][] }[] {
      if (typeof contenido === 'string' || contenido == null) return []
      if (Array.isArray(contenido)) return contenido.flatMap((c) => tablasDe(c))
      const nodo = contenido as unknown as Record<string, unknown>
      const propia = nodo['table'] !== undefined ? [nodo['table'] as { headerRows?: number; body?: unknown[][] }] : []
      const deStack = Array.isArray(nodo['stack']) ? tablasDe(nodo['stack'] as Content[]) : []
      return [...propia, ...deStack]
    }
    const tablas = tablasDe(doc.content as Content[])
    // Sólo las tablas técnicas de filas repetibles (Tramo/Local, Medidor,
    // Artefacto) -- las tablas chicas clave-valor del resumen/desarrollo
    // nunca tuvieron ni necesitan headerRows.
    const tecnicas = tablas.filter((t) => {
      const primeraFila = t.body?.[0]
      const primeraCelda = Array.isArray(primeraFila) ? primeraFila[0] : undefined
      const texto = typeof primeraCelda === 'string' ? primeraCelda : (primeraCelda as { text?: string })?.text
      return texto === 'Tramo / Local' || texto === 'Medidor' || texto === 'Artefacto'
    })
    expect(tecnicas.length).toBeGreaterThan(0)
    for (const tabla of tecnicas) {
      expect(tabla.headerRows, JSON.stringify(tabla.body?.[0])).toBe(1)
    }

    // REPORT-POLISH-02: la tabla de detalle por terminal integra su título
    // como primera fila (colSpan) -- headerRows:2 para que título +
    // encabezado de columnas viajen siempre juntos.
    const tablaVerificacion = tablas.find((t) => {
      const primeraCelda = (t.body?.[0] as { text?: string }[] | undefined)?.[0]
      return primeraCelda?.text === 'Detalle de verificación por terminal'
    })
    expect(tablaVerificacion).toBeDefined()
    expect(tablaVerificacion!.headerRows).toBe(2)
  })

  it('nunca aparece "undefined"/"NaN"/"[object Object]" en el texto del documento (proyecto completo)', () => {
    const doc = construirDocDefinition(datosCompleto, fechaFija)
    const textos = textosDe(doc.content as Content[])
    for (const t of textos) {
      expect(t).not.toMatch(/\bundefined\b/)
      expect(t).not.toMatch(/\bNaN\b/)
      expect(t).not.toContain('[object Object]')
    }
  })

  it('el header de M2 (una UF con varios Locales) repite el nombre de la UF UNA sola vez, no por Local', () => {
    const doc = construirDocDefinition(datosCompleto, fechaFija)
    const textos = textosDe(doc.content as Content[])
    const nombreUf = datosCompleto.proyecto.unidadesFuncionales[0]!.nombre
    const ocurrencias = textos.filter((t) => t === nombreUf).length
    expect(ocurrencias).toBe(1)
  })
})

function artefactoLavatorio(id: string) {
  return { id, artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' as const }
}

// Dos Locales del mismo tipo en niveles distintos de la misma UF -- caso
// real reportado (REPORT-POLISH-02 §4): M1 mostraba "Local: Baño" para
// ambos, mientras el resto del documento ya numeraba "Baño 2"/"Baño 3".
function proyectoConLocalesRepetidos(nombrePersonalizado?: string): Proyecto {
  const base = crearProyectoVacio()
  return {
    ...base,
    unidadesFuncionales: [
      {
        id: 'uf-1',
        nombre: 'UF 1',
        niveles: [
          {
            id: 'nivel-pb',
            nombre: 'PB',
            locales: [{ id: 'local-pb-bano', tipo: 'bano', artefactos: [artefactoLavatorio('a-pb')] }],
          },
          {
            id: 'nivel-p1',
            nombre: 'Piso 1',
            locales: [
              {
                id: 'local-p1-bano-1',
                tipo: 'bano',
                ...(nombrePersonalizado !== undefined ? { nombre: nombrePersonalizado } : {}),
                artefactos: [artefactoLavatorio('a-p1-1')],
              },
              { id: 'local-p1-bano-2', tipo: 'bano', artefactos: [artefactoLavatorio('a-p1-2')] },
            ],
          },
        ],
      },
    ],
  }
}

describe('construirDocDefinition (REPORT-POLISH-02: cierre editorial)', () => {
  const datosCompleto = resolverDatosDeInforme(canonico(), catalogoArtefactos, coeficientesMayoracion)
  const fechaFija = new Date('2026-09-15T12:00:00-03:00')

  it('M1 numera Locales del mismo tipo dentro de la UF, igual que el resto del documento ("Baño 1"/"Baño 2"/"Baño 3")', () => {
    const datos = resolverDatosDeInforme(proyectoConLocalesRepetidos(), catalogoArtefactos, coeficientesMayoracion)
    const doc = construirDocDefinition(datos)
    const textos = textosDe(doc.content as Content[])
    expect(textos.some((t) => t.startsWith('Local: Baño 1 —'))).toBe(true)
    expect(textos.some((t) => t.startsWith('Local: Baño 2 —'))).toBe(true)
    expect(textos.some((t) => t.startsWith('Local: Baño 3 —'))).toBe(true)
    // Nunca "Local: Baño —" a secas cuando hay más de un Local de ese tipo.
    expect(textos.some((t) => t === 'Local: Baño — Régimen: Domiciliario')).toBe(false)
  })

  it('M1 conserva el nombre personalizado de un Local en vez de reemplazarlo por el tipo', () => {
    const datos = resolverDatosDeInforme(proyectoConLocalesRepetidos('Baño principal'), catalogoArtefactos, coeficientesMayoracion)
    const doc = construirDocDefinition(datos)
    const textos = textosDe(doc.content as Content[])
    expect(textos.some((t) => t.startsWith('Local: Baño principal —'))).toBe(true)
    // El local con nombre personalizado nunca debe aparecer como "Baño 2".
    expect(textos.some((t) => t.startsWith('Local: Baño 2 —'))).toBe(false)
  })

  it('el bloque de pérdida distribuida y el de pérdida localizada son unidades unbreakable independientes', () => {
    const doc = construirDocDefinition(datosCompleto, fechaFija)
    const bloques = nodosUnbreakable(doc.content as Content[])
    const bloqueVelocidad = bloques.find((b) => textosDe(b as unknown as Content).includes('Velocidad y pérdida distribuida'))
    const bloqueLocalizada = bloques.find((b) => textosDe(b as unknown as Content).includes('Pérdida localizada'))
    expect(bloqueVelocidad).toBeDefined()
    expect(bloqueLocalizada).toBeDefined()
    expect(bloqueVelocidad).not.toBe(bloqueLocalizada)
  })

  it('M4 ya no fuerza un pageBreak incondicional antes de su título', () => {
    const doc = construirDocDefinition(datosCompleto, fechaFija)
    const contenido = doc.content as unknown as Record<string, unknown>[]
    const nodoM4 = contenido.find((c) => textosDe(c as unknown as Content).includes('4. Abastecimiento y reserva'))
    expect(nodoM4).toBeDefined()
    expect(nodoM4!['pageBreak']).toBeUndefined()
  })

  it('nunca deja identificadores internos de desarrollo (CRIT-A*, D-δ.*, quTotal_lps) en el texto visible', () => {
    const doc = construirDocDefinition(datosCompleto, fechaFija)
    const textos = textosDe(doc.content as Content[])
    for (const t of textos) {
      expect(t).not.toMatch(/CRIT-A\d/)
      expect(t).not.toMatch(/D-δ\.\d/)
      expect(t).not.toContain('quTotal_lps')
    }
  })

  it('la Metodología muestra la normativa con el casing correcto (ERAS-2023), sin tocar el dato persistido', () => {
    const doc = construirDocDefinition(datosCompleto, fechaFija)
    const textos = textosDe(doc.content as Content[])
    expect(textos.some((t) => t.includes('ERAS-2023'))).toBe(true)
    expect(textos.some((t) => t.includes('eras-2023'))).toBe(false)
    // El dato persistido (Proyecto.metadatos.versionNormativa) no se reescribe.
    expect(datosCompleto.proyecto.metadatos.versionNormativa).toBe('eras-2023')
  })

  it('la tabla de pasos de M1 muestra el nombre humano del artefacto, no la clave interna del catálogo (qu(artefactoId))', () => {
    const datos = resolverDatosDeInforme(canonico(), catalogoArtefactos, coeficientesMayoracion)
    const doc = construirDocDefinition(datos)
    const textos = textosDe(doc.content as Content[])
    expect(textos.some((t) => /^qu\([a-z][a-zA-Z]*\)$/.test(t))).toBe(false)
    expect(textos.some((t) => t.startsWith('qu(') && /[A-ZÁÉÍÓÚ]/.test(t))).toBe(true)
  })

  it('la tabla de detalle por terminal: rojo sólo en la celda que no cumple, nunca en "no evaluado"', () => {
    const doc = construirDocDefinition(datosCompleto, fechaFija)
    const contenido = doc.content as unknown as Record<string, unknown>[]
    const nodoTabla = contenido.find((c) => (c['table'] as { headerRows?: number } | undefined)?.headerRows === 2) as
      | { table: { body: Record<string, unknown>[][] } }
      | undefined
    expect(nodoTabla).toBeDefined()
    const filasRenderizadas = nodoTabla!.table.body.slice(2)
    expect(filasRenderizadas.length).toBe(datosCompleto.verificacion.filas.length)

    for (const [indice, filaDatos] of datosCompleto.verificacion.filas.entries()) {
      const celdaEstado = filasRenderizadas[indice]![8]!
      const estilos = ([] as string[]).concat((celdaEstado['style'] as string | string[]) ?? [])
      const noCumple = filaDatos.estado === 'completo' && filaDatos.cumple === false
      expect(estilos.includes('valorNoConforme'), JSON.stringify({ indice, estado: filaDatos.estado, cumple: filaDatos.cumple })).toBe(
        noCumple,
      )
    }

    // Al menos una fila crítica existe en este proyecto y viaja con estilo
    // 'filaCritica' (bold) + fondo suave, identificable incluso sin color.
    const indiceCritico = datosCompleto.verificacion.filas.findIndex((f) => f.esCritico)
    expect(indiceCritico).toBeGreaterThanOrEqual(0)
    const celdaCritica = filasRenderizadas[indiceCritico]![0]!
    const estilosCritico = ([] as string[]).concat((celdaCritica['style'] as string | string[]) ?? [])
    expect(estilosCritico.includes('filaCritica')).toBe(true)
    expect(celdaCritica['fillColor']).toBeDefined()
  })
})

describe('resolverNombreDeArchivo (brief §51)', () => {
  it('arma "IUAS_Memoria_de_calculo_<proyecto>.pdf" sanitizado, sin espacios ni acentos', () => {
    const p = backfillLongitudesDePredimensionamiento(proyectoInicial)
    const nombre = resolverNombreDeArchivo({
      ...p,
      metadatos: { ...p.metadatos, nombre: 'Casa Pérez López' },
    })
    expect(nombre).toBe('IUAS_Memoria_de_calculo_Casa_Perez_Lopez.pdf')
  })

  it('nombre de proyecto vacío no rompe el archivo (fallback "proyecto")', () => {
    const p = backfillLongitudesDePredimensionamiento(proyectoInicial)
    const nombre = resolverNombreDeArchivo({ ...p, metadatos: { ...p.metadatos, nombre: '' } })
    expect(nombre).toBe('IUAS_Memoria_de_calculo_proyecto.pdf')
  })
})
