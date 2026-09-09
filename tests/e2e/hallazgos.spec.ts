// QA-FUZZ-01 · hallazgos de app reproducibles (brief §39, §48, §61).
//
// Estos tests DOCUMENTAN bugs de la app que el fuzzer encontró. NO se
// corrigen en esta corrida. Usan `test.fail()`: hoy fallan a propósito
// (evidencia viva del bug); el día que el bug se arregle, `test.fail()`
// hará que el test falle "por pasar", recordando que hay que quitar la
// anotación y cerrar la deuda.
//
// FIX-LEAK-01 — El Panel de Módulo 3, en su rama de estado "error", pinta
// el CÓDIGO INTERNO de validación (`problema.problema.codigo`) como texto
// de usuario, en lugar de un mensaje humano. Se dispara, por ejemplo, con
// un tramo de longitud 0 (redHidraulicaTramoLongitudNoPositiva).
// Repro por fuzz:  IUAS_FUZZ_SEED=424242 IUAS_FUZZ_RUNS=1 IUAS_FUZZ_STEPS=12
// Archivo:  src/interfaz/paginas/PanelDeMedidoresDeModulo3.tsx (línea ~351)
import { test, expect } from './qa/fixtures'
import { cargarAppLimpia, estabilizar } from './qa/estado'
import { buscarCodigosDeValidacion } from './qa/tokensProhibidos'

test.describe('QA-FUZZ-01 · hallazgos (captura, NO corrige)', () => {
  test('FIX-LEAK-01 · M3 filtra el código interno de validación al UI', async ({ page, baseURLEfectiva }) => {
    test.fail(true, 'Bug de app conocido — se corrige en FIX-LEAK-01, no en QA-FUZZ-01')
    await cargarAppLimpia(page, baseURLEfectiva)

    // 1. Iniciar Módulo 3 (y activar propiedad horizontal + ACS central,
    //    la combinación bajo la que el fuzzer lo encontró).
    await page.getByRole('link', { name: /Medidores/ }).first().click()
    await estabilizar(page)
    const iniciar = page.getByRole('button', { name: 'Iniciar Módulo 3' })
    if (await iniciar.isVisible()) {
      await iniciar.click()
      await estabilizar(page)
    }
    const ph = page.getByRole('checkbox', { name: /Propiedad horizontal/ })
    if (!(await ph.isChecked())) {
      await ph.click()
      await estabilizar(page)
    }
    const acs = page.getByLabel('Provisión de agua caliente (por defecto):')
    if (await acs.isVisible()) {
      await acs.selectOption('central')
      await estabilizar(page)
    }

    // 2. Poner en 0 la longitud de un tramo (validación:
    //    redHidraulicaTramoLongitudNoPositiva).
    await page.getByRole('link', { name: /Tuber[ií]as/ }).first().click()
    await estabilizar(page)
    const longitud = page.getByRole('spinbutton', { name: /^Longitud \[m\] de / }).first()
    await longitud.fill('0')
    await longitud.blur()
    await estabilizar(page)

    // 3. Volver a Medidores: el panel muestra el código interno crudo.
    await page.getByRole('link', { name: /Medidores/ }).first().click()
    await estabilizar(page)

    const texto = await page.locator('#root').innerText()
    const codigos = buscarCodigosDeValidacion(texto)
    expect(codigos, 'M3 no debería mostrar códigos internos de validación').toHaveLength(0)
  })
})
