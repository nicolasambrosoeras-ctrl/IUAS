// QA-FUZZ-01 · regresiones de hallazgos del fuzz.
//
// Cada bug que el fuzzer encontró tiene aquí un caso mínimo determinista.
// Mientras el bug está ABIERTO el caso se marca `test.fail()` (evidencia
// viva); al corregirlo se quita la anotación y el caso pasa a ser una
// regresión normal.
//
// FIX-LEAK-01 — RESUELTO (D-δ.85). El Panel de Módulo 3, en su rama de
// estado "error", pintaba el CÓDIGO INTERNO de validación
// (`problema.problema.codigo`, p. ej. `redHidraulicaTramoLongitudNoPositiva`)
// como texto de usuario. Ahora M1 y M3 comparten `describirProblemaDeValidacion`
// (`src/interfaz/paginas/mensajesDeValidacion.ts`): código conocido →
// mensaje humano; código inesperado → copy genérica; nunca el identificador.
import { test, expect } from './qa/fixtures'
import { cargarAppLimpia, estabilizar } from './qa/estado'
import { verificarInvariantes, primerFallo } from './qa/invariantes'
import { buscarCodigosDeValidacion } from './qa/tokensProhibidos'

test.describe('QA-FUZZ-01 · regresiones de hallazgos', () => {
  test('FIX-LEAK-01 · M3 muestra un mensaje humano, no el código interno de validación', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)

    // 1. Iniciar Módulo 3 + Propiedad horizontal + ACS central (la
    //    combinación bajo la que el fuzzer lo encontró).
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

    // 2. Poner en 0 la longitud de un tramo -> validación
    //    redHidraulicaTramoLongitudNoPositiva -> M3 entra en estado "error".
    await page.getByRole('link', { name: /Tuber[ií]as/ }).first().click()
    await estabilizar(page)
    const longitud = page.getByRole('spinbutton', { name: /^Longitud \[m\] de / }).first()
    await longitud.fill('0')
    await longitud.blur()
    await estabilizar(page)

    // 3. Volver a Medidores: M3 está en error.
    await page.getByRole('link', { name: /Medidores/ }).first().click()
    await estabilizar(page)

    const texto = await page.locator('#root').innerText()

    // El código interno NO aparece; el mensaje humano SÍ.
    expect(buscarCodigosDeValidacion(texto), 'M3 no debe mostrar códigos internos de validación').toHaveLength(0)
    expect(texto).not.toContain('redHidraulicaTramoLongitudNoPositiva')
    expect(texto).toContain('La longitud de un tramo debe ser mayor que cero.')

    // La app sigue viva, sin pageerror ni console.error nuevos, y las
    // invariantes del harness (incluida `sin-codigos-de-validacion-visibles`,
    // ya sin excepción para FIX-LEAK-01) pasan.
    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })
})
