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
//
// FIX-LEAK-02 — RESUELTO (D-δ.87). El Panel de Módulo 4, en su rama de
// estado "error", devolvía `codigosValidacion[codigo].descripcion` —la
// descripción TÉCNICA interna del catálogo, con nombres de campo
// (`configuracionAbastecimiento.periodoConsumoMaximo_h`, …)—. Ahora M4 usa
// la misma `describirProblemaDeValidacion` que M1/M3. Reproducido por el
// fuzz: seed histórica `20250909:0` y seed cloud `34398035608-1:12` (step
// 17 · `editarPeriodoConsumoMaximo=6 [M4]`).
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

  test('FIX-LEAK-02 · M4 muestra un mensaje humano, no la descripción técnica del catálogo', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)

    // 1. Abrir Módulo 4 e iniciarlo con un esquema con tanque (el período
    //    de consumo máximo sólo se edita en esquemas con reserva).
    await page.getByRole('link', { name: /Abastecimiento/ }).first().click()
    await estabilizar(page)
    const tanque = page.getByRole('button', { name: 'Tanque elevado', exact: true })
    if (await tanque.isVisible()) {
      await tanque.click()
      await estabilizar(page)
    }

    // 2. Período de consumo máximo = 6 h -> fuera del rango [1, 4]
    //    (CRIT-A35) -> validación
    //    configuracionAbastecimientoPeriodoConsumoMaximoInvalido -> M4
    //    entra en estado "error". El bug: NO se amplía el rango, sólo se
    //    humaniza el texto.
    const periodo = page.getByLabel('Período de consumo máximo [h]:')
    await periodo.fill('6')
    await periodo.blur().catch(() => {})
    await estabilizar(page)

    // 3. M4 sigue en error (la validación NO cambió).
    await expect(page.getByRole('heading', { name: 'Configuración con errores' })).toBeVisible()

    const texto = await page.locator('#root').innerText()

    // Mensaje humano presente; identificadores técnicos ausentes.
    expect(texto).toContain('El período de consumo máximo del abastecimiento debe estar entre 1 y 4 horas.')
    expect(texto).not.toContain('configuracionAbastecimiento')
    expect(texto).not.toContain('periodoConsumoMaximo_h')
    expect(
      buscarCodigosDeValidacion(texto),
      'M4 no debe mostrar códigos internos de validación',
    ).toHaveLength(0)
    expect(texto).not.toContain('[object Object]')
    expect(texto).not.toMatch(/(?:^|[\s=:(>])undefined(?=[\s)<,;.]|$)/)

    // App viva, sin pageerror ni console.error nuevos, invariantes OK
    // (incluida `sin-codigos-de-validacion-visibles`, estricta).
    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })
})
