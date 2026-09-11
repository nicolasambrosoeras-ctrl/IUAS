// PERF-SCALE-01B §21 -- E2E dirigido: proyecto de escala moderada + edición
// de "Pelo de agua mínimo" y de un parámetro de tanque.
//
// Reproduce la MISMA ruta funcional del caso real (agregar UF, ir a
// Verificación, teclear en el input de pelo de agua, editar el desnivel de
// conexión del tanque) sobre un proyecto varias veces más grande que el
// demo, y exige que la app siga viva -- sin pageerror, sin console.error,
// invariantes OK -- después de cada edición. NO usa un timeout gigante:
// con el contexto de cálculo local de 01B el motor resuelve rápido; si una
// tecla volviera a colgar el hilo, `estabilizar` + los asserts lo delatan.
import { test, expect } from './qa/fixtures'
import { cargarAppLimpia, estabilizar } from './qa/estado'
import { verificarInvariantes, primerFallo } from './qa/invariantes'

test.describe('PERF-SCALE-01B · verificación sobre proyecto de escala', () => {
  test('duplicar UF varias veces + editar pelo de agua y desnivel de tanque no cuelga ni desmonta la app', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)

    // 1. Demanda: duplicar la primera UF 4 veces -> ~5 UF. Cada duplicación
    //    dispara un re-render completo (sidebar + los 4 paneles montados);
    //    ejercita el threading del contexto de cálculo en la ruta real.
    await page.getByRole('link', { name: /Demanda/ }).first().click()
    await estabilizar(page)
    for (let i = 0; i < 4; i += 1) {
      await page.getByRole('button', { name: 'Duplicar' }).first().click()
      await estabilizar(page)
    }
    let violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()

    // 2. Abastecimiento: esquema "Tanque elevado" (habilita el input de
    //    pelo de agua mínimo en Verificación).
    await page.getByRole('link', { name: /Abastecimiento/ }).first().click()
    await estabilizar(page)
    const tanque = page.getByRole('button', { name: 'Tanque elevado', exact: true })
    if (await tanque.isVisible().catch(() => false)) {
      await tanque.click()
      await estabilizar(page)
    }

    // 3. Abastecimiento: editar el desnivel de conexión del tanque (§40:
    //    "editar desnivel"). Cada tecla recalcula la verificación completa.
    const desnivel = page.getByLabel(/^Desnivel .* \[m\]:/).first()
    if (await desnivel.isVisible().catch(() => false)) {
      for (const valor of ['1', '1.5', '-2']) {
        await desnivel.fill(valor)
        await estabilizar(page)
      }
      violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
      expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
      await expect(desnivel).toHaveValue('-2')
    }

    // 4. Verificación hidráulica: teclear en "Pelo de agua mínimo". Es el
    //    repro manual principal -- cada keystroke dispara el pipeline de M2.
    await page.getByRole('link', { name: /Verificaci[oó]n/ }).first().click()
    await estabilizar(page)
    const peloDeAgua = page.getByLabel(/Pelo de agua mínimo \(cota respecto de la acera\).*\[m\]:/).first()
    if (await peloDeAgua.isVisible().catch(() => false)) {
      for (const valor of ['10', '12', '8.5', '15']) {
        await peloDeAgua.fill(valor)
        await estabilizar(page)
      }
      violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
      expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
      await expect(peloDeAgua).toHaveValue('15')
    }

    // 5. App viva y con contenido real; sin errores acumulados.
    const texto = await page.locator('#root').innerText()
    expect(texto.length).toBeGreaterThan(40)
    violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })
})
