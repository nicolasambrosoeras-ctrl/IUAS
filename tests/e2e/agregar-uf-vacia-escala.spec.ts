// PERF-SCALE-01E -- E2E dirigido: proyecto de escala real (~30-33 UF) +
// "Agregar UF" (vacía). Reproduce el caso real reportado (Agregar UF con
// ~33 UF existentes tardaba >2 s) y exige que la app siga viva -- sin
// pageerror, sin console.error, invariantes OK, la UF nueva vacía y visible
// -- después de la acción. NO afirma sobre milisegundos (eso vive en
// scripts/perf/benchmarkAgregarUfVacia.perf.ts y en la medición manual
// registrada en el handoff): con el memo por-UF de SeccionDeUnidadFuncional
// (sonPropsDeSeccionDeUnidadFuncionalEquivalentes), si el fix se rompiera y
// volviera a recomputar/rerenderizar las 33 UF existentes, este spec no lo
// detecta por tiempo -- lo detecta escala-verificacion.spec.ts (no cuelga)
// y los tests de equivalencia/comparador (agregarUnidadFuncional.equivalencia.test.ts,
// sonPropsDeSeccionDeUnidadFuncionalEquivalentes.test.ts) detectan una
// regresión de CORRECTITUD si la volviera insegura.
import { test, expect } from './qa/fixtures'
import { cargarAppLimpia, estabilizar } from './qa/estado'
import { verificarInvariantes, primerFallo } from './qa/invariantes'

test.describe('PERF-SCALE-01E · Agregar UF vacía a escala ~30 UF', () => {
  test('agregar UF con ~30 UF existentes agrega una UF vacía visible y la app sigue viva', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    test.setTimeout(120_000)
    await cargarAppLimpia(page, baseURLEfectiva)

    await page.getByRole('link', { name: /Demanda/ }).first().click()
    await estabilizar(page)

    // Construye ~30 UF duplicando la UF de demo (misma técnica que
    // escala-verificacion.spec.ts) -- densidad representativa sin depender
    // de un fixture de inyección que la app no tiene.
    for (let i = 0; i < 29; i += 1) {
      await page.getByRole('button', { name: 'Duplicar' }).first().click()
      await estabilizar(page)
    }
    let violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()

    const totalUfAntes = await page.locator('.m1-uf').count()
    expect(totalUfAntes).toBe(30)

    // La acción bajo prueba: Agregar UF (vacía) con ~30 UF ya existentes.
    await page.getByRole('button', { name: '+ Agregar unidad funcional' }).click()
    await estabilizar(page)

    violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()

    // La UF nueva aparece (31 en total) y está vacía: nace colapsada
    // (agregarUnidadFuncional.ts), así que se la expande para confirmar
    // que no trae Locales.
    const totalUfDespues = await page.locator('.m1-uf').count()
    expect(totalUfDespues).toBe(31)

    const ufNueva = page.locator('.m1-uf').last()
    await ufNueva.getByRole('button', { name: /^Expandir Unidad funcional 31/ }).click()
    await estabilizar(page)
    await expect(ufNueva.getByRole('button', { name: /^Contraer Unidad funcional 31/ }).first()).toBeVisible()
    await expect(ufNueva.getByRole('button', { name: '+ Agregar local' })).toBeVisible()
    // Sin Locales todavía: no hay ninguna tarjeta de Local dentro de esta UF.
    await expect(ufNueva.locator('.m1-local')).toHaveCount(0)

    // Tuberías (M2) sigue viva y muestra la nueva UF también.
    await page.getByRole('link', { name: /Tuberías/ }).first().click()
    await estabilizar(page)
    await expect(page.locator('#tuberias').getByRole('heading', { name: /Unidad funcional 31/ })).toBeVisible()

    const texto = await page.locator('#root').innerText()
    expect(texto.length).toBeGreaterThan(40)
    violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })
})
