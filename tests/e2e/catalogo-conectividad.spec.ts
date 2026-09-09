// CAT-CONN-01 (D-δ.84) · recorrido determinista del catálogo. Para CADA
// artefacto del catálogo:
//   - se agrega en un Local nuevo (estado limpio, SIN precedentes),
//   - se ASEVERA si aparece o no el selector de alimentación AF/AC/AF+AC,
//     contra la política de conectividad del catálogo:
//       · automatica / defaultConfigurable -> NO pregunta, queda conectado;
//       · requiereSeleccion                -> pregunta SIEMPRE.
//   - para los `requiereSeleccion`, en pruebas independientes se elige AF,
//     AC y AF+AC y se verifica que ninguna opción provoque crash.
//
// Ya no es un mapeo exploratorio: la matriz objetivo es la aserción.
import { test, expect } from './qa/fixtures'
import { cargarAppLimpia, estabilizar } from './qa/estado'
import { verificarInvariantes, primerFallo } from './qa/invariantes'
import { escribirReporteDeCatalogo } from './qa/reporte'
import type { FilaDeCatalogo } from './qa/tipos'
import { catalogoArtefactos } from '../../src/normativa/eras-2023/catalogo-artefactos/index'
import {
  obtenerPoliticaDeConectividad,
  ARTEFACTOS_QUE_REQUIEREN_SELECCION,
} from '../../src/normativa/eras-2023/catalogo-artefactos/politicaConectividad'
import type { Page } from '@playwright/test'

// Resultados acumulados entre tests (serial) -> matriz final en afterAll.
const filas = new Map<string, FilaDeCatalogo>()

function filaBase(id: string): FilaDeCatalogo {
  const cat = catalogoArtefactos.find((c) => c.id === id)
  const previa = filas.get(id)
  if (previa) return previa
  const nueva: FilaDeCatalogo = {
    artefactoId: id,
    nombre: cat?.nombre ?? id,
    regimen: cat?.regimen ?? '?',
    preguntaConectividad: false,
    afSafe: null,
    acSafe: null,
    afAcSafe: null,
    error: null,
  }
  filas.set(id, nueva)
  return nueva
}

function actualizar(id: string, parcial: Partial<FilaDeCatalogo>): void {
  filas.set(id, { ...filaBase(id), ...parcial })
}

function politicaRequiereSeleccion(id: string): boolean {
  return obtenerPoliticaDeConectividad(id)?.politica === 'requiereSeleccion'
}

// Agrega un artefacto ESPECÍFICO en un Local nuevo y devuelve si apareció
// el selector de alimentación para esa fila.
async function agregarArtefactoEnLocalNuevo(page: Page, artefactoId: string): Promise<boolean> {
  await page.getByRole('link', { name: /Demanda/ }).first().click()
  await estabilizar(page)

  const expandir = page.getByRole('button', { name: /^Expandir / }).first()
  if (await expandir.isVisible().catch(() => false)) {
    await expandir.click()
    await estabilizar(page)
  }

  await page.getByRole('button', { name: '+ Agregar local' }).first().click()
  await estabilizar(page)

  const local = page.locator('.m1-local').last()
  // Local tipo "otros": sin sugerencia contextual -> "+ Agregar artefacto"
  // abre SIEMPRE el borrador "Seleccionar artefacto…" y podemos elegir el
  // tipo exacto.
  await local.getByLabel(/^Tipo:/).selectOption('otros')
  await estabilizar(page)

  await local.getByRole('button', { name: '+ Agregar artefacto' }).click()
  await estabilizar(page)

  const borrador = local.getByRole('combobox', { name: 'Seleccionar artefacto para agregar' })
  if (await borrador.isVisible().catch(() => false)) {
    await borrador.selectOption(artefactoId)
  } else {
    await local.getByRole('combobox', { name: 'Artefacto', exact: true }).last().selectOption(artefactoId)
  }
  await estabilizar(page)

  return local.locator('.m1-declaracion[role="alert"]').isVisible().catch(() => false)
}

test.describe('CAT-CONN-01 · catálogo de conectividad', () => {
  test.describe.configure({ mode: 'serial' })

  const soloDesktop = (nombreProyecto: string): void => {
    test.skip(nombreProyecto !== 'desktop', 'catálogo sólo en desktop')
  }

  for (const cat of catalogoArtefactos) {
    const requiere = politicaRequiereSeleccion(cat.id)

    test(`«${cat.nombre}» ${requiere ? 'PIDE' : 'NO pide'} selección de alimentación`, async ({
      page,
      errores,
      baseURLEfectiva,
    }, testInfo) => {
      soloDesktop(testInfo.project.name)
      await cargarAppLimpia(page, baseURLEfectiva)
      filaBase(cat.id)
      try {
        const pregunta = await agregarArtefactoEnLocalNuevo(page, cat.id)
        actualizar(cat.id, { preguntaConectividad: pregunta })

        // La aserción central de CAT-CONN-01: la pregunta depende SÓLO de
        // la política del catálogo, nunca del contenido del proyecto.
        expect(
          pregunta,
          `«${cat.nombre}»: política=${obtenerPoliticaDeConectividad(cat.id)?.politica ?? '???'}`,
        ).toBe(requiere)

        const local = page.locator('.m1-local').last()
        if (!requiere) {
          // automatica / defaultConfigurable: la fila quedó creada y
          // conectada, sin banner y sin romper invariantes.
          await expect(local.locator('.m1-declaracion[role="alert"]')).toHaveCount(0)
        }

        const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
        const fallo = primerFallo(violaciones)
        if (fallo) {
          actualizar(cat.id, { error: `${fallo.nombre}: ${fallo.detalle ?? ''}`.trim() })
        }
        expect(fallo, fallo ? JSON.stringify(fallo) : undefined).toBeNull()
      } catch (e) {
        actualizar(cat.id, { error: (e as Error).message.slice(0, 300) })
        throw e
      }
    })

    if (requiere) {
      for (const opcion of [
        { clave: 'af', nombre: 'Agua fría (AF)', campo: 'afSafe' as const },
        { clave: 'ac', nombre: 'Agua caliente (AC)', campo: 'acSafe' as const },
        { clave: 'afac', nombre: 'Agua fría y caliente (AF + AC)', campo: 'afAcSafe' as const },
      ]) {
        test(`«${cat.nombre}» · alimentación ${opcion.clave.toUpperCase()} sin crash`, async ({
          page,
          errores,
          baseURLEfectiva,
        }, testInfo) => {
          soloDesktop(testInfo.project.name)
          await cargarAppLimpia(page, baseURLEfectiva)
          filaBase(cat.id)
          const pregunta = await agregarArtefactoEnLocalNuevo(page, cat.id)
          expect(pregunta).toBe(true)
          const banner = page.locator('.m1-local .m1-declaracion[role="alert"]').last()
          await banner.getByRole('button', { name: opcion.nombre }).click()
          await estabilizar(page)
          const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
          const fallo = primerFallo(violaciones)
          actualizar(cat.id, {
            preguntaConectividad: true,
            [opcion.campo]: fallo === null,
            ...(fallo ? { error: `${opcion.clave.toUpperCase()} → ${fallo.nombre}: ${fallo.detalle ?? ''}`.trim() } : {}),
          })
          expect(fallo, fallo ? JSON.stringify(fallo) : undefined).toBeNull()
        })
      }
    }
  }

  test('exactamente 2 tipos piden selección (lavavajillas y lavarropas industrial)', async ({}, testInfo) => {
    soloDesktop(testInfo.project.name)
    const preguntan = catalogoArtefactos.filter((c) => filas.get(c.id)?.preguntaConectividad).map((c) => c.id)
    expect([...preguntan].sort()).toEqual([...ARTEFACTOS_QUE_REQUIEREN_SELECCION].sort())
    expect(preguntan).toHaveLength(2)
    // 14 no preguntan.
    expect(catalogoArtefactos.length - preguntan.length).toBe(14)
  })

  test.afterAll(async () => {
    if (filas.size === 0) return
    const orden = catalogoArtefactos.map((c) => filas.get(c.id)).filter((f): f is FilaDeCatalogo => !!f)
    const { json, md } = await escribirReporteDeCatalogo(orden)
    console.log(`\nCAT-CONN-01 · matriz de catálogo escrita:\n  ${json}\n  ${md}\n`)
  })
})
