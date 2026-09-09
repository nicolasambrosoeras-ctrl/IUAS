// QA-FUZZ-01 · recorrido determinista del catálogo (brief §18, §19, §42,
// §48). Para CADA artefacto del catálogo:
//   - se agrega en un Local nuevo (estado limpio),
//   - se registra si aparece la pregunta de conectividad AF/AC/AF+AC,
//   - si aparece, en pruebas independientes se elige AF, AC y AF+AC y se
//     verifica que ninguna opción provoque crash / pantalla blanca.
//
// NO decide qué artefacto DEBERÍA preguntar (eso es CAT-CONN-01). Sólo
// mapea comportamiento real y seguridad, y emite la matriz.
import { test, expect } from './qa/fixtures'
import { cargarAppLimpia, estabilizar } from './qa/estado'
import { verificarInvariantes, primerFallo } from './qa/invariantes'
import { escribirReporteDeCatalogo } from './qa/reporte'
import type { FilaDeCatalogo } from './qa/tipos'
import { catalogoArtefactos } from '../../src/normativa/eras-2023/catalogo-artefactos/index'
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

// Agrega un artefacto ESPECÍFICO en un Local nuevo y devuelve si apareció
// la pregunta de conectividad para esa fila.
async function agregarArtefactoEnLocalNuevo(page: Page, artefactoId: string): Promise<boolean> {
  await page.getByRole('link', { name: /Demanda/ }).first().click()
  await estabilizar(page)

  // UF1 del proyecto de ejemplo arranca expandida; si estuviera colapsada,
  // expandirla.
  const expandir = page.getByRole('button', { name: /^Expandir / }).first()
  if (await expandir.isVisible().catch(() => false)) {
    await expandir.click()
    await estabilizar(page)
  }

  await page.getByRole('button', { name: '+ Agregar local' }).first().click()
  await estabilizar(page)

  const local = page.locator('.m1-local').last()
  // Local tipo "otros": sin sugerencia contextual (sugerirArtefactoParaLocal
  // -> undefined), así "+ Agregar artefacto" abre SIEMPRE el borrador
  // "Seleccionar artefacto…" y podemos elegir el tipo exacto, cuyo alta
  // dispara la pregunta de conectividad si no hay precedente en el proyecto.
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

test.describe('QA-FUZZ-01 · catálogo de conectividad', () => {
  test.describe.configure({ mode: 'serial' })

  // La matriz completa se mapea en desktop; mobile no aporta nueva
  // información de conectividad (brief §27: no multiplicar por anchos).
  const soloDesktop = (nombreProyecto: string): void => {
    test.skip(nombreProyecto !== 'desktop', 'catálogo sólo en desktop')
  }

  for (const cat of catalogoArtefactos) {
    test(`agregar «${cat.nombre}» no rompe la app`, async ({ page, errores, baseURLEfectiva }, testInfo) => {
      soloDesktop(testInfo.project.name)
      await cargarAppLimpia(page, baseURLEfectiva)
      filaBase(cat.id)
      try {
        const pregunta = await agregarArtefactoEnLocalNuevo(page, cat.id)
        actualizar(cat.id, { preguntaConectividad: pregunta })
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

    for (const opcion of [
      { clave: 'af', nombre: 'Agua fría (AF)', campo: 'afSafe' as const },
      { clave: 'ac', nombre: 'Agua caliente (AC)', campo: 'acSafe' as const },
      { clave: 'afac', nombre: 'Agua fría y caliente (AF + AC)', campo: 'afAcSafe' as const },
    ]) {
      test(`«${cat.nombre}» · conectividad ${opcion.clave.toUpperCase()} sin crash`, async ({
        page,
        errores,
        baseURLEfectiva,
      }, testInfo) => {
        soloDesktop(testInfo.project.name)
        await cargarAppLimpia(page, baseURLEfectiva)
        filaBase(cat.id)
        const pregunta = await agregarArtefactoEnLocalNuevo(page, cat.id)
        if (!pregunta) {
          actualizar(cat.id, { [opcion.campo]: null })
          test.skip(true, `«${cat.nombre}» no pregunta conectividad en este flujo`)
          return
        }
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

  test.afterAll(async () => {
    if (filas.size === 0) return
    const orden = catalogoArtefactos.map((c) => filas.get(c.id)).filter((f): f is FilaDeCatalogo => !!f)
    const { json, md } = await escribirReporteDeCatalogo(orden)
    console.log(`\nQA-FUZZ-01 · matriz de catálogo escrita:\n  ${json}\n  ${md}\n`)
  })
})
