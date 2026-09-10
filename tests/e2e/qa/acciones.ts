// Catalogo de ACCIONES de usuario del harness (brief §7-§12, §37, §38).
//
// Reglas:
//  - cada accion tiene `aplicable(page)` (precondicion real: el control
//    existe y esta habilitado en el estado actual) y `ejecutar(ctx)`
//    (interactua como usuario: click / fill / selectOption / keyboard,
//    NUNCA page.evaluate(setState) -- brief §37).
//  - `ejecutar` devuelve una `AccionRegistrada` serializable y humana.
//  - los selectores son semanticos (getByRole / getByLabel / getByText con
//    scope); no hay data-testid en la app y no se agregan (brief §38).
import type { Locator, Page } from '@playwright/test'
import type { AccionRegistrada, ModuloQa } from './tipos'
import type { Prng } from './prng'
import { catalogoArtefactos } from '../../../src/normativa/eras-2023/catalogo-artefactos/index'

export type ContextoAccion = { readonly page: Page; readonly prng: Prng }

export type Accion = {
  readonly tipo: string
  readonly modulo: ModuloQa
  /** Peso relativo para el muestreo del fuzzer (brief §21). */
  readonly peso: number
  readonly aplicable: (page: Page) => Promise<boolean>
  readonly ejecutar: (ctx: ContextoAccion) => Promise<AccionRegistrada>
}

// --- utilidades de disponibilidad ----------------------------------------

async function visibleYHabilitado(loc: Locator): Promise<boolean> {
  try {
    const primero = loc.first()
    if (!(await primero.isVisible())) return false
    return await primero.isEnabled()
  } catch {
    return false
  }
}

// Cuenta elementos VISIBLES en una sola llamada de protocolo (filter
// `visible`), sin iterar `nth(i)` uno por uno (clave para que el escaneo
// de precondiciones sea barato en CI).
async function cuentaVisible(loc: Locator): Promise<number> {
  try {
    return await loc.filter({ visible: true }).count()
  } catch {
    try {
      return await loc.count()
    } catch {
      return 0
    }
  }
}

// Elige el n-esimo locator VISIBLE de un conjunto, segun el PRNG.
async function elegirVisible(loc: Locator, prng: Prng): Promise<Locator | null> {
  const visiblesLoc = loc.filter({ visible: true })
  const total = await visiblesLoc.count().catch(() => 0)
  if (total === 0) return null
  return visiblesLoc.nth(prng.enteroHasta(total))
}

// --- localizadores de navegacion ---------------------------------------------

const SECCIONES: readonly { id: string; nombre: RegExp; modulo: ModuloQa }[] = [
  { id: 'demanda', nombre: /Demanda/, modulo: 'M1' },
  { id: 'tuberias', nombre: /Tuber[ií]as/, modulo: 'M2' },
  { id: 'medidores', nombre: /Medidores/, modulo: 'M3' },
  { id: 'abastecimiento', nombre: /Abastecimiento/, modulo: 'M4' },
  { id: 'verificacion-hidraulica', nombre: /Verificaci[oó]n/, modulo: 'M2' },
]

function enlaceDeSeccion(page: Page, nombre: RegExp): Locator {
  return page.getByRole('link', { name: nombre })
}

async function irASeccion(page: Page, id: string, nombre: RegExp): Promise<void> {
  const enlace = enlaceDeSeccion(page, nombre).first()
  if (await enlace.isVisible().catch(() => false)) {
    await enlace.click()
  } else {
    await page.evaluate((anchor) => {
      window.location.hash = `#${anchor}`
    }, id)
  }
  await page.waitForTimeout(80)
}

// --- banner de conectividad AF/AC ------------------------------------------

function bannerConectividad(page: Page): Locator {
  return page.locator('.m1-declaracion[role="alert"]')
}

// =======================================================================
//  M1 -- DEMANDA
// =======================================================================

const accionesM1: Accion[] = [
  {
    tipo: 'irADemanda',
    modulo: 'M1',
    peso: 2,
    aplicable: async (page) => visibleYHabilitado(enlaceDeSeccion(page, /Demanda/).first()),
    ejecutar: async ({ page }) => {
      await irASeccion(page, 'demanda', /Demanda/)
      return { tipo: 'irADemanda', modulo: 'M1' }
    },
  },
  {
    tipo: 'agregarUF',
    modulo: 'M1',
    peso: 4,
    aplicable: async (page) =>
      visibleYHabilitado(page.getByRole('button', { name: '+ Agregar unidad funcional' })),
    ejecutar: async ({ page }) => {
      await page.getByRole('button', { name: '+ Agregar unidad funcional' }).click()
      return { tipo: 'agregarUF', modulo: 'M1' }
    },
  },
  {
    tipo: 'duplicarUF',
    modulo: 'M1',
    peso: 4,
    aplicable: async (page) => (await cuentaVisible(page.getByRole('button', { name: 'Duplicar' }))) > 0,
    ejecutar: async ({ page, prng }) => {
      const boton = await elegirVisible(page.getByRole('button', { name: 'Duplicar' }), prng)
      await boton?.click()
      return { tipo: 'duplicarUF', modulo: 'M1' }
    },
  },
  {
    tipo: 'alternarColapsoUF',
    modulo: 'M1',
    peso: 2,
    aplicable: async (page) =>
      (await cuentaVisible(page.getByRole('button', { name: /^(Expandir|Contraer) / }))) > 0,
    ejecutar: async ({ page, prng }) => {
      const boton = await elegirVisible(page.getByRole('button', { name: /^(Expandir|Contraer) / }), prng)
      const nombre = (await boton?.getAttribute('aria-label')) ?? ''
      await boton?.click()
      return { tipo: 'alternarColapsoUF', modulo: 'M1', detalle: nombre.slice(0, 40) }
    },
  },
  {
    tipo: 'agregarLocal',
    modulo: 'M1',
    peso: 3,
    aplicable: async (page) => (await cuentaVisible(page.getByRole('button', { name: '+ Agregar local' }))) > 0,
    ejecutar: async ({ page, prng }) => {
      const boton = await elegirVisible(page.getByRole('button', { name: '+ Agregar local' }), prng)
      await boton?.click()
      return { tipo: 'agregarLocal', modulo: 'M1' }
    },
  },
  {
    tipo: 'cambiarTipoLocal',
    modulo: 'M1',
    peso: 2,
    aplicable: async (page) => (await cuentaVisible(page.getByLabel(/^Tipo:/))) > 0,
    ejecutar: async ({ page, prng }) => {
      const sel = await elegirVisible(page.getByLabel(/^Tipo:/), prng)
      const valor = prng.elegir(['bano', 'toilette', 'cocina', 'lavadero', 'cochera', 'jardin', 'otros'])
      await sel?.selectOption(valor)
      return { tipo: 'cambiarTipoLocal', modulo: 'M1', valor }
    },
  },
  {
    tipo: 'cambiarRegimenLocal',
    modulo: 'M1',
    peso: 1,
    aplicable: async (page) => (await cuentaVisible(page.getByLabel(/^R[eé]gimen:/))) > 0,
    ejecutar: async ({ page, prng }) => {
      const sel = await elegirVisible(page.getByLabel(/^R[eé]gimen:/), prng)
      const valor = prng.elegir(['', 'domiciliario', 'noDomiciliario'])
      await sel?.selectOption(valor)
      return { tipo: 'cambiarRegimenLocal', modulo: 'M1', valor: valor === '' ? '(sin definir)' : valor }
    },
  },
  {
    tipo: 'agregarArtefacto',
    modulo: 'M1',
    peso: 6,
    aplicable: async (page) => {
      if (await bannerConectividad(page).isVisible().catch(() => false)) return false
      return (await cuentaVisible(page.getByRole('button', { name: '+ Agregar artefacto' }))) > 0
    },
    ejecutar: async ({ page, prng }) => {
      const boton = await elegirVisible(page.getByRole('button', { name: '+ Agregar artefacto' }), prng)
      await boton?.click()
      return { tipo: 'agregarArtefacto', modulo: 'M1' }
    },
  },
  {
    tipo: 'seleccionarArtefactoDeBorrador',
    modulo: 'M1',
    peso: 5,
    aplicable: async (page) =>
      visibleYHabilitado(page.getByRole('combobox', { name: 'Seleccionar artefacto para agregar' }).first()),
    ejecutar: async ({ page, prng }) => {
      const sel = page.getByRole('combobox', { name: 'Seleccionar artefacto para agregar' }).first()
      const valor = prng.elegir(catalogoArtefactos.map((c) => c.id))
      await sel.selectOption(valor)
      return { tipo: 'seleccionarArtefactoDeBorrador', modulo: 'M1', valor }
    },
  },
  {
    tipo: 'cambiarTipoArtefacto',
    modulo: 'M1',
    peso: 6,
    aplicable: async (page) => {
      if (await bannerConectividad(page).isVisible().catch(() => false)) return false
      return (await cuentaVisible(page.getByRole('combobox', { name: 'Artefacto', exact: true }))) > 0
    },
    ejecutar: async ({ page, prng }) => {
      const sel = await elegirVisible(page.getByRole('combobox', { name: 'Artefacto', exact: true }), prng)
      const valor = prng.elegir(catalogoArtefactos.map((c) => c.id))
      await sel?.selectOption(valor)
      return { tipo: 'cambiarTipoArtefacto', modulo: 'M1', valor }
    },
  },
  {
    tipo: 'cambiarCantidadArtefacto',
    modulo: 'M1',
    peso: 2,
    aplicable: async (page) => (await cuentaVisible(page.getByLabel('Cantidad', { exact: false }))) > 0,
    ejecutar: async ({ page, prng }) => {
      const input = await elegirVisible(page.getByLabel('Cantidad', { exact: false }), prng)
      const valor = prng.elegir([0, 1, 2, 3, 5, 10])
      await input?.fill(String(valor))
      await input?.blur().catch(() => {})
      return { tipo: 'cambiarCantidadArtefacto', modulo: 'M1', valor }
    },
  },
  {
    tipo: 'eliminarArtefacto',
    modulo: 'M1',
    peso: 3,
    aplicable: async (page) => (await cuentaVisible(page.getByRole('button', { name: 'Eliminar artefacto' }))) > 0,
    ejecutar: async ({ page, prng }) => {
      const boton = await elegirVisible(page.getByRole('button', { name: 'Eliminar artefacto' }), prng)
      await boton?.click()
      return { tipo: 'eliminarArtefacto', modulo: 'M1' }
    },
  },
  {
    tipo: 'eliminarLocal',
    modulo: 'M1',
    peso: 1,
    aplicable: async (page) => (await cuentaVisible(page.getByRole('button', { name: 'Eliminar local' }))) > 0,
    ejecutar: async ({ page, prng }) => {
      const boton = await elegirVisible(page.getByRole('button', { name: 'Eliminar local' }), prng)
      await boton?.click()
      return { tipo: 'eliminarLocal', modulo: 'M1' }
    },
  },
  {
    tipo: 'eliminarUF',
    modulo: 'M1',
    peso: 1,
    aplicable: async (page) =>
      (await cuentaVisible(page.getByRole('button', { name: 'Eliminar unidad funcional' }))) > 0,
    ejecutar: async ({ page, prng }) => {
      const boton = await elegirVisible(page.getByRole('button', { name: 'Eliminar unidad funcional' }), prng)
      await boton?.click()
      return { tipo: 'eliminarUF', modulo: 'M1' }
    },
  },
  {
    tipo: 'resolverConectividad',
    modulo: 'M1',
    peso: 10,
    aplicable: async (page) => bannerConectividad(page).first().isVisible().catch(() => false),
    ejecutar: async ({ page, prng }) => {
      const banner = bannerConectividad(page).first()
      const opcion = prng.elegir([
        { clave: 'AF', nombre: 'Agua fría (AF)' },
        { clave: 'AC', nombre: 'Agua caliente (AC)' },
        { clave: 'AF+AC', nombre: 'Agua fría y caliente (AF + AC)' },
        { clave: 'Cancelar', nombre: 'Cancelar' },
      ])
      await banner.getByRole('button', { name: opcion.nombre }).click()
      return { tipo: 'resolverConectividad', modulo: 'M1', valor: opcion.clave }
    },
  },
]

// =======================================================================
//  M2 -- TUBERIAS
// =======================================================================

async function asegurarConfiguracionAvanzadaAbierta(page: Page): Promise<void> {
  const resumen = page.getByText('Configuración avanzada', { exact: true }).first()
  if (!(await resumen.isVisible().catch(() => false))) return
  const detalle = resumen.locator('xpath=ancestor::details[1]')
  const abierto = await detalle.evaluate((el) => (el as HTMLDetailsElement).open).catch(() => true)
  if (!abierto) await resumen.click()
}

const accionesM2: Accion[] = [
  {
    tipo: 'irATuberias',
    modulo: 'M2',
    peso: 2,
    aplicable: async (page) => visibleYHabilitado(enlaceDeSeccion(page, /Tuber[ií]as/).first()),
    ejecutar: async ({ page }) => {
      await irASeccion(page, 'tuberias', /Tuber[ií]as/)
      return { tipo: 'irATuberias', modulo: 'M2' }
    },
  },
  {
    tipo: 'cambiarModoDeTrabajo',
    modulo: 'M2',
    peso: 5,
    aplicable: async (page) => {
      const r = page.getByRole('button', { name: 'Rápido', exact: true })
      const p = page.getByRole('button', { name: 'Profesional', exact: true })
      return (await visibleYHabilitado(r)) || (await visibleYHabilitado(p))
    },
    ejecutar: async ({ page, prng }) => {
      const valor = prng.elegir(['Rápido', 'Profesional'])
      await page.getByRole('button', { name: valor, exact: true }).first().click()
      return { tipo: 'cambiarModoDeTrabajo', modulo: 'M2', valor }
    },
  },
  {
    tipo: 'cambiarPerdidaDistribuida',
    modulo: 'M2',
    peso: 2,
    // El <select> existe en el DOM aunque el <details> "Configuración
    // avanzada" esté cerrado: se comprueba existencia (sin efectos) y se
    // abre el detalle recién en ejecutar.
    aplicable: async (page) => (await page.getByLabel('Pérdidas distribuidas:').count()) > 0,
    ejecutar: async ({ page, prng }) => {
      await asegurarConfiguracionAvanzadaAbierta(page)
      const valor = prng.elegir(['hazenWilliams', 'darcyWeisbach'])
      await page.getByLabel('Pérdidas distribuidas:').selectOption(valor)
      return { tipo: 'cambiarPerdidaDistribuida', modulo: 'M2', valor }
    },
  },
  {
    tipo: 'cambiarPerdidaLocalizada',
    modulo: 'M2',
    peso: 3,
    aplicable: async (page) => (await page.getByLabel('Pérdidas localizadas:').count()) > 0,
    ejecutar: async ({ page, prng }) => {
      await asegurarConfiguracionAvanzadaAbierta(page)
      const valor = prng.elegir(['estimado', 'detallado'])
      await page.getByLabel('Pérdidas localizadas:').selectOption(valor)
      return { tipo: 'cambiarPerdidaLocalizada', modulo: 'M2', valor }
    },
  },
  {
    tipo: 'cambiarGranularidad',
    modulo: 'M2',
    peso: 3,
    aplicable: async (page) => (await page.getByLabel('Granularidad hidráulica:').count()) > 0,
    ejecutar: async ({ page, prng }) => {
      await asegurarConfiguracionAvanzadaAbierta(page)
      const valor = prng.elegir(['simplificada', 'profesional'])
      await page.getByLabel('Granularidad hidráulica:').selectOption(valor)
      return { tipo: 'cambiarGranularidad', modulo: 'M2', valor }
    },
  },
  {
    tipo: 'cambiarMaterialTuberia',
    modulo: 'M2',
    peso: 1,
    aplicable: async (page) => (await page.getByLabel('Material:').count()) > 0,
    ejecutar: async ({ page, prng }) => {
      await asegurarConfiguracionAvanzadaAbierta(page)
      const sel = page.getByLabel('Material:')
      const opciones = await sel.locator('option').evaluateAll((os) =>
        os.map((o) => (o as HTMLOptionElement).value).filter((v) => v !== ''),
      )
      const valor = opciones[prng.enteroHasta(Math.max(1, opciones.length))] ?? opciones[0]
      if (valor) await sel.selectOption(valor)
      return { tipo: 'cambiarMaterialTuberia', modulo: 'M2', valor: valor ?? '(sin cambio)' }
    },
  },
  {
    tipo: 'expandirFilaDeTabla',
    modulo: 'M2',
    peso: 2,
    aplicable: async (page) =>
      (await cuentaVisible(page.locator('.tabla-tecnica details > summary'))) > 0,
    ejecutar: async ({ page, prng }) => {
      const sum = await elegirVisible(page.locator('.tabla-tecnica details > summary'), prng)
      await sum?.click()
      return { tipo: 'expandirFilaDeTabla', modulo: 'M2' }
    },
  },
  {
    tipo: 'ajustarDnTramo',
    modulo: 'M2',
    peso: 4,
    aplicable: async (page) => {
      const inf = page.getByRole('button', { name: 'Adoptar el DN comercial inmediato inferior' })
      const sup = page.getByRole('button', { name: 'Adoptar el DN comercial inmediato superior' })
      const auto = page.getByRole('button', { name: 'Volver al DN recomendado automáticamente' })
      return (
        (await cuentaVisible(inf)) + (await cuentaVisible(sup)) + (await cuentaVisible(auto)) > 0
      )
    },
    ejecutar: async ({ page, prng }) => {
      const opcion = prng.elegir([
        { nombre: 'Adoptar el DN comercial inmediato inferior', valor: 'DN-' },
        { nombre: 'Adoptar el DN comercial inmediato superior', valor: 'DN+' },
        { nombre: 'Volver al DN recomendado automáticamente', valor: 'Auto' },
      ])
      const boton = await elegirVisible(page.getByRole('button', { name: opcion.nombre }), prng)
      if (boton && (await boton.isEnabled())) {
        await boton.click()
        return { tipo: 'ajustarDnTramo', modulo: 'M2', valor: opcion.valor }
      }
      // Fallback: cualquiera de los otros que este habilitado.
      for (const alt of ['Adoptar el DN comercial inmediato superior', 'Adoptar el DN comercial inmediato inferior']) {
        const b = await elegirVisible(page.getByRole('button', { name: alt }), prng)
        if (b && (await b.isEnabled())) {
          await b.click()
          return { tipo: 'ajustarDnTramo', modulo: 'M2', valor: alt.includes('superior') ? 'DN+' : 'DN-' }
        }
      }
      return { tipo: 'ajustarDnTramo', modulo: 'M2', valor: '(sin efecto)' }
    },
  },
  {
    tipo: 'editarLongitudTramo',
    modulo: 'M2',
    peso: 3,
    aplicable: async (page) => (await cuentaVisible(page.getByRole('spinbutton', { name: /^Longitud \[m\] de / }))) > 0,
    ejecutar: async ({ page, prng }) => {
      const input = await elegirVisible(page.getByRole('spinbutton', { name: /^Longitud \[m\] de / }), prng)
      const valor = prng.elegir([0, 1, 3, 7, 12, 25])
      await input?.fill(String(valor))
      await input?.blur().catch(() => {})
      return { tipo: 'editarLongitudTramo', modulo: 'M2', valor }
    },
  },
  // --- M2-TOPO-C · constructor de montantes ---------------------------
  ...montanteAcciones('AF', 'Agua fría'),
  ...montanteAcciones('AC', 'Agua caliente'),
  {
    tipo: 'agregarLocalAMontante',
    modulo: 'M2',
    peso: 3,
    aplicable: async (page) => (await selectsDeAltaDeMontanteConOpciones(page)) > 0,
    ejecutar: async ({ page, prng }) => {
      const selects = page.getByRole('combobox', { name: /^Agregar Local al Montante / })
      const total = await selects.filter({ visible: true }).count()
      const select = selects.filter({ visible: true }).nth(prng.enteroHasta(Math.max(1, total)))
      const valores = await select
        .locator('option')
        .evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value).filter((v) => v !== ''))
      if (valores.length === 0) {
        return { tipo: 'agregarLocalAMontante', modulo: 'M2', valor: '(sin opciones)' }
      }
      const valor = valores[prng.enteroHasta(valores.length)] ?? valores[0]!
      await select.selectOption(valor)
      return { tipo: 'agregarLocalAMontante', modulo: 'M2' }
    },
  },
  {
    tipo: 'quitarLocalDeMontante',
    modulo: 'M2',
    peso: 2,
    aplicable: async (page) =>
      (await cuentaVisible(page.locator('.montante-card__locales').getByRole('button', { name: 'Quitar' }))) > 0,
    ejecutar: async ({ page, prng }) => {
      const boton = await elegirVisible(
        page.locator('.montante-card__locales').getByRole('button', { name: 'Quitar' }),
        prng,
      )
      await boton?.click()
      return { tipo: 'quitarLocalDeMontante', modulo: 'M2' }
    },
  },
  {
    tipo: 'borrarMontante',
    modulo: 'M2',
    peso: 1,
    aplicable: async (page) => (await cuentaVisible(page.getByRole('button', { name: 'Borrar montante' }))) > 0,
    ejecutar: async ({ page, prng }) => {
      const boton = await elegirVisible(page.getByRole('button', { name: 'Borrar montante' }), prng)
      await boton?.click()
      return { tipo: 'borrarMontante', modulo: 'M2' }
    },
  },
  {
    tipo: 'editarNombreDeMontante',
    modulo: 'M2',
    peso: 1,
    aplicable: async (page) =>
      (await cuentaVisible(page.getByRole('textbox', { name: /^Nombre del Montante / }))) > 0,
    ejecutar: async ({ page, prng }) => {
      const input = await elegirVisible(page.getByRole('textbox', { name: /^Nombre del Montante / }), prng)
      const valor = prng.elegir(['', 'Montante norte', 'Montante dormitorios', 'Sanitarios PB'])
      await input?.fill(valor)
      await input?.blur().catch(() => {})
      return { tipo: 'editarNombreDeMontante', modulo: 'M2', valor: valor === '' ? '(a fallback)' : valor }
    },
  },
]

// Crea/agrega un montante de una red. Dos acciones (`crearMontanteAF` /
// `crearMontanteAC`) comparten el flujo: "+ Agregar montante" abre la
// elección de red; el botón de la red la confirma. Si la elección ya está
// abierta (un paso anterior la dejó así), sólo se confirma.
function montanteAcciones(red: 'AF' | 'AC', etiqueta: string): Accion[] {
  const seccion = (page: Page): Locator => page.locator('section.constructor-montantes')
  return [
    {
      tipo: red === 'AF' ? 'crearMontanteAF' : 'crearMontanteAC',
      modulo: 'M2',
      peso: 2,
      aplicable: async (page) => {
        const s = seccion(page)
        const abrir = s.getByRole('button', { name: '+ Agregar montante' })
        const grupo = s.getByRole('group', { name: 'Red del montante nuevo' })
        return (await visibleYHabilitado(abrir)) || (await visibleYHabilitado(grupo))
      },
      ejecutar: async ({ page }) => {
        const s = seccion(page)
        const grupo = s.getByRole('group', { name: 'Red del montante nuevo' })
        if (!(await grupo.isVisible().catch(() => false))) {
          await s.getByRole('button', { name: '+ Agregar montante' }).click()
        }
        await grupo.getByRole('button', { name: etiqueta, exact: true }).click()
        return { tipo: red === 'AF' ? 'crearMontanteAF' : 'crearMontanteAC', modulo: 'M2', valor: red }
      },
    },
  ]
}

// Cantidad de <select> "Agregar Local al Montante…" VISIBLES que tienen al
// menos una opción real (más allá del placeholder): sólo entonces
// `agregarLocalAMontante` puede hacer algo.
async function selectsDeAltaDeMontanteConOpciones(page: Page): Promise<number> {
  const selects = page.getByRole('combobox', { name: /^Agregar Local al Montante / }).filter({ visible: true })
  const total = await selects.count().catch(() => 0)
  let conOpciones = 0
  for (let i = 0; i < total; i += 1) {
    const reales = await selects
      .nth(i)
      .locator('option')
      .evaluateAll((os) => os.filter((o) => (o as HTMLOptionElement).value !== '').length)
      .catch(() => 0)
    if (reales > 0) conOpciones += 1
  }
  return conOpciones
}

// =======================================================================
//  M3 -- MEDIDORES
// =======================================================================

const accionesM3: Accion[] = [
  {
    tipo: 'irAMedidores',
    modulo: 'M3',
    peso: 2,
    aplicable: async (page) => visibleYHabilitado(enlaceDeSeccion(page, /Medidores/).first()),
    ejecutar: async ({ page }) => {
      await irASeccion(page, 'medidores', /Medidores/)
      return { tipo: 'irAMedidores', modulo: 'M3' }
    },
  },
  {
    tipo: 'iniciarModulo3',
    modulo: 'M3',
    peso: 8,
    aplicable: async (page) => visibleYHabilitado(page.getByRole('button', { name: 'Iniciar Módulo 3' })),
    ejecutar: async ({ page }) => {
      await page.getByRole('button', { name: 'Iniciar Módulo 3' }).click()
      return { tipo: 'iniciarModulo3', modulo: 'M3' }
    },
  },
  {
    tipo: 'alternarPropiedadHorizontal',
    modulo: 'M3',
    peso: 5,
    aplicable: async (page) => visibleYHabilitado(page.getByRole('checkbox', { name: /Propiedad horizontal/ })),
    ejecutar: async ({ page }) => {
      const chk = page.getByRole('checkbox', { name: /Propiedad horizontal/ })
      const antes = await chk.isChecked()
      await chk.click()
      return { tipo: 'alternarPropiedadHorizontal', modulo: 'M3', valor: !antes }
    },
  },
  {
    tipo: 'cambiarProvisionACS',
    modulo: 'M3',
    peso: 10,
    aplicable: async (page) =>
      visibleYHabilitado(page.getByLabel('Provisión de agua caliente (por defecto):')),
    ejecutar: async ({ page, prng }) => {
      const valor = prng.elegir(['individual', 'central'])
      await page.getByLabel('Provisión de agua caliente (por defecto):').selectOption(valor)
      return { tipo: 'cambiarProvisionACS', modulo: 'M3', valor }
    },
  },
  {
    tipo: 'cambiarExcepcionACSporUF',
    modulo: 'M3',
    peso: 3,
    aplicable: async (page) =>
      (await page.getByText('Configurar excepciones por unidad funcional', { exact: true }).count()) > 0,
    ejecutar: async ({ page, prng }) => {
      const resumen = page.getByText('Configurar excepciones por unidad funcional', { exact: true })
      const detalle = resumen.locator('xpath=ancestor::details[1]')
      const abierto = await detalle.evaluate((el) => (el as HTMLDetailsElement).open).catch(() => false)
      if (!abierto) await resumen.click()
      const sel = await elegirVisible(detalle.locator('select'), prng)
      const valor = prng.elegir(['default', 'individual', 'central'])
      await sel?.selectOption(valor)
      return { tipo: 'cambiarExcepcionACSporUF', modulo: 'M3', valor }
    },
  },
  {
    tipo: 'ajustarDnMedidor',
    modulo: 'M3',
    peso: 3,
    aplicable: async (page) => {
      const inf = page.getByRole('button', { name: 'Diámetro inmediato inferior' })
      const sup = page.getByRole('button', { name: 'Diámetro inmediato superior' })
      return (await cuentaVisible(inf)) + (await cuentaVisible(sup)) > 0
    },
    ejecutar: async ({ page, prng }) => {
      const nombre = prng.elegir(['Diámetro inmediato inferior', 'Diámetro inmediato superior'])
      let boton = await elegirVisible(page.getByRole('button', { name: nombre }), prng)
      if (!boton || !(await boton.isEnabled())) {
        const otro = nombre.includes('inferior') ? 'Diámetro inmediato superior' : 'Diámetro inmediato inferior'
        boton = await elegirVisible(page.getByRole('button', { name: otro }), prng)
      }
      if (boton && (await boton.isEnabled())) {
        await boton.click()
        return { tipo: 'ajustarDnMedidor', modulo: 'M3', valor: nombre.includes('inferior') ? 'DN-' : 'DN+' }
      }
      return { tipo: 'ajustarDnMedidor', modulo: 'M3', valor: '(sin efecto)' }
    },
  },
]

// =======================================================================
//  M4 -- ABASTECIMIENTO
// =======================================================================

const ESQUEMAS_M4 = ['Alimentación directa', 'Tanque elevado', 'Cisterna + bombeo + tanque elevado'] as const

const accionesM4: Accion[] = [
  {
    tipo: 'irAAbastecimiento',
    modulo: 'M4',
    peso: 2,
    aplicable: async (page) => visibleYHabilitado(enlaceDeSeccion(page, /Abastecimiento/).first()),
    ejecutar: async ({ page }) => {
      await irASeccion(page, 'abastecimiento', /Abastecimiento/)
      return { tipo: 'irAAbastecimiento', modulo: 'M4' }
    },
  },
  {
    tipo: 'elegirEsquemaInicial',
    modulo: 'M4',
    peso: 6,
    aplicable: async (page) => {
      for (const e of ESQUEMAS_M4) {
        if (await visibleYHabilitado(page.getByRole('button', { name: e, exact: true }))) return true
      }
      return false
    },
    ejecutar: async ({ page, prng }) => {
      const valor = prng.elegir([...ESQUEMAS_M4])
      await page.getByRole('button', { name: valor, exact: true }).first().click()
      return { tipo: 'elegirEsquemaInicial', modulo: 'M4', valor }
    },
  },
  {
    tipo: 'alternarEsquemaM4',
    modulo: 'M4',
    peso: 6,
    aplicable: async (page) => (await cuentaVisible(page.getByRole('radio'))) > 0,
    ejecutar: async ({ page, prng }) => {
      const radios = page.getByRole('radio')
      const total = await radios.count()
      const idx = prng.enteroHasta(Math.max(1, total))
      const r = radios.nth(idx)
      const valor = (await r.evaluate((el) => (el.closest('label')?.textContent ?? '').trim()).catch(() => '')) || `radio#${idx}`
      await r.check().catch(() => r.click())
      return { tipo: 'alternarEsquemaM4', modulo: 'M4', valor: valor.slice(0, 40) }
    },
  },
  {
    tipo: 'editarPeriodoConsumoMaximo',
    modulo: 'M4',
    peso: 3,
    aplicable: async (page) => visibleYHabilitado(page.getByLabel('Período de consumo máximo [h]:')),
    ejecutar: async ({ page, prng }) => {
      const valor = prng.elegir(['', '1', '2', '4', '6'])
      const input = page.getByLabel('Período de consumo máximo [h]:')
      await input.fill(valor)
      await input.blur().catch(() => {})
      return { tipo: 'editarPeriodoConsumoMaximo', modulo: 'M4', valor: valor === '' ? '(vacío)' : valor }
    },
  },
  {
    tipo: 'cambiarDnConexion',
    modulo: 'M4',
    peso: 2,
    aplicable: async (page) => visibleYHabilitado(page.getByLabel('DN de conexión [mm]:')),
    ejecutar: async ({ page, prng }) => {
      const sel = page.getByLabel('DN de conexión [mm]:')
      const opciones = await sel.locator('option').evaluateAll((os) =>
        os.map((o) => (o as HTMLOptionElement).value).filter((v) => v !== ''),
      )
      const valor = opciones[prng.enteroHasta(Math.max(1, opciones.length))] ?? ''
      if (valor) await sel.selectOption(valor)
      return { tipo: 'cambiarDnConexion', modulo: 'M4', valor: valor || '(sin cambio)' }
    },
  },
  {
    tipo: 'editarPresionSobreAcera',
    modulo: 'M4',
    peso: 3,
    aplicable: async (page) => visibleYHabilitado(page.getByLabel('Presión sobre acera [m]:')),
    ejecutar: async ({ page, prng }) => {
      const valor = prng.elegir(['4', '12', '20'])
      const input = page.getByLabel('Presión sobre acera [m]:')
      await input.fill(valor)
      await input.blur().catch(() => {})
      return { tipo: 'editarPresionSobreAcera', modulo: 'M4', valor }
    },
  },
  {
    tipo: 'editarDesnivelConexion',
    modulo: 'M4',
    peso: 3,
    aplicable: async (page) => (await cuentaVisible(page.getByLabel(/^Desnivel .* \[m\]:/))) > 0,
    ejecutar: async ({ page, prng }) => {
      const input = await elegirVisible(page.getByLabel(/^Desnivel .* \[m\]:/), prng)
      const valor = prng.elegir(['0', '5', '10', '-2'])
      await input?.fill(valor)
      await input?.blur().catch(() => {})
      return { tipo: 'editarDesnivelConexion', modulo: 'M4', valor }
    },
  },
  {
    tipo: 'editarVolumenAdoptado',
    modulo: 'M4',
    peso: 2,
    aplicable: async (page) => (await cuentaVisible(page.getByLabel(/\[L\]:/))) > 0,
    ejecutar: async ({ page, prng }) => {
      const input = await elegirVisible(page.getByLabel(/\[L\]:/), prng)
      const valor = prng.elegir(['', '0', '500', '1200', '5000'])
      await input?.fill(valor)
      await input?.blur().catch(() => {})
      return { tipo: 'editarVolumenAdoptado', modulo: 'M4', valor: valor === '' ? '(vacío)' : valor }
    },
  },
]

// =======================================================================
//  GLOBAL
// =======================================================================

const accionesGlobales: Accion[] = [
  {
    tipo: 'navegarASeccion',
    modulo: 'GLOBAL',
    peso: 3,
    aplicable: async (page) => (await cuentaVisible(page.getByRole('link'))) > 0,
    ejecutar: async ({ page, prng }) => {
      const destino = prng.elegir([...SECCIONES])
      await irASeccion(page, destino.id, destino.nombre)
      return { tipo: 'navegarASeccion', modulo: 'GLOBAL', valor: destino.id }
    },
  },
  {
    tipo: 'cambiarHashDeSeccion',
    modulo: 'GLOBAL',
    peso: 1,
    aplicable: async () => true,
    ejecutar: async ({ page, prng }) => {
      const destino = prng.elegir([...SECCIONES])
      await page.evaluate((h) => {
        window.location.hash = h
      }, `#${destino.id}`)
      await page.waitForTimeout(60)
      return { tipo: 'cambiarHashDeSeccion', modulo: 'GLOBAL', valor: destino.id }
    },
  },
  {
    tipo: 'cambiarViewport',
    modulo: 'GLOBAL',
    peso: 1,
    aplicable: async () => true,
    ejecutar: async ({ page, prng }) => {
      const vp = prng.elegir([
        { width: 1280, height: 900 },
        { width: 390, height: 844 },
        { width: 360, height: 800 },
      ])
      await page.setViewportSize(vp)
      await page.waitForTimeout(60)
      return { tipo: 'cambiarViewport', modulo: 'GLOBAL', valor: `${vp.width}x${vp.height}` }
    },
  },
  {
    tipo: 'recargarPagina',
    modulo: 'GLOBAL',
    peso: 1,
    aplicable: async () => true,
    ejecutar: async ({ page }) => {
      await page.reload({ waitUntil: 'domcontentloaded' })
      await page.waitForTimeout(120)
      return { tipo: 'recargarPagina', modulo: 'GLOBAL', detalle: 'restablece el proyecto de ejemplo' }
    },
  },
]

export const ACCIONES: readonly Accion[] = [
  ...accionesM1,
  ...accionesM2,
  ...accionesM3,
  ...accionesM4,
  ...accionesGlobales,
]

export function accionPorTipo(tipo: string): Accion | undefined {
  return ACCIONES.find((a) => a.tipo === tipo)
}

// Devuelve las acciones cuya precondicion se cumple AHORA. El orden es
// estable (el del catalogo) para que el muestreo por PRNG sea reproducible.
export async function accionesAplicables(page: Page): Promise<Accion[]> {
  const aplicables: Accion[] = []
  for (const accion of ACCIONES) {
    if (await accion.aplicable(page).catch(() => false)) {
      aplicables.push(accion)
    }
  }
  return aplicables
}
