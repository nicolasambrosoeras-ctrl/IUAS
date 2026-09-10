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
//
// FIX-CRASH-01 — RESUELTO (D-δ.88). Con un Tramo cuya longitud se editó a
// 0 (estado de edición legítimo) + esquema de abastecimiento "Tanque
// elevado" en modo Rápido, al informar el desnivel de conexión la
// verificación de presión dejaba de estar bloqueada por
// `incompletoRapido`, alcanzaba `acumularPerdidaDistribuidaDeCamino` sobre
// ese Tramo y `calcularPerdidaCargaHazenWilliams` (CRIT-A17, exige L > 0)
// lanzaba. `PanelDePresionDeModulo2` llama `resolverPresionResidualDeCamino`
// en el render sin la barrera estructural de `resolverEstadoModulo2`, así
// que la excepción DESMONTABA la app (WHITE_SCREEN). Reproducido por el
// fuzz: seed cloud `34411681277-1:0`, step 19 ·
// `editarDesnivelConexion=-2 [M4]` — desktop y mobile. Fix:
// `resolverPerdidaDistribuidaDeTramo` trata `longitud_m <= 0` igual que
// `undefined` → `sinLongitud` → toda la cadena de presión degrada a
// "incompleto". `desnivelConexion = -2` NO era el bug (CRIT-A37: es un
// desnivel firmado válido) y se conserva sin clamp.
//
// FIX-CRASH-M3-INDUSTRIAL-01 — RESUELTO. Surgió del gate de QA Fuzz cloud
// posterior a M2-TOPO-C (donde el incidente se rotuló provisionalmente
// "MONTANTE-CATCONN"); la causa raíz NO tiene que ver con montantes ni con
// CAT-CONN — de ahí el rename. Con propiedad horizontal + ACS **central**,
// un artefacto industrial de §2.9.1.3 conectado a AF y AC a la vez
// (`piletaDeCocinaIndustrial`, `lavavajillasIndustrial`,
// `lavarropasIndustrial`) llegaba a `contribucionesCentral`
// (`resolverAlcancesDeMedidoresIndividuales.ts`, M3-B2b / D-δ.54), cuya
// rama `'ambas'` pedía `resolverQuEfectivo(_, 'aguaFría')` sobre un
// `quFria_lps` = null y lanzaba. La excepción se propagaba por
// `resolverEstadoModulo3` → `resolverResumenDeProyecto` durante el render
// de `MotorDemandaPantalla` y DESMONTABA la app (WHITE_SCREEN).
// Reproducido por el fuzz cloud: seed `34493241441-1:15`, step 28 ·
// `cambiarTipoArtefacto=piletaDeCocinaIndustrial [M1]` — desktop y mobile.
// Fix: `contribucionesCentral` aplica la misma ampliación de CRIT-A15
// (D-δ.79) que `resolverQuEfectivoParaTramo` en M2 — catálogo sin
// desagregar AF/AC → cada ramal común se dimensiona para el `quTotal`. El
// bug pre-existe a M2-TOPO-C (D-δ.54); la acción `crearMontanteAF` del
// fuzz sólo cambió la mezcla que llevó esa seed a la combinación.
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

  test('FIX-CRASH-01 · longitud de tramo en 0 + tanque elevado + desnivel de conexión no desmonta la app', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)

    // 1. Tuberías: poner en 0 la longitud de un tramo. Es un estado de
    //    edición legítimo (resolverCambioDeLongitud acepta 0); la app debe
    //    tolerarlo mostrando el error, nunca desmontándose.
    await page.getByRole('link', { name: /Tuber[ií]as/ }).first().click()
    await estabilizar(page)
    const longitud = page.getByRole('spinbutton', { name: /^Longitud \[m\] de / }).first()
    await longitud.fill('0')
    await longitud.blur()
    await estabilizar(page)
    let violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()

    // 2. Abastecimiento: esquema "Tanque elevado".
    await page.getByRole('link', { name: /Abastecimiento/ }).first().click()
    await estabilizar(page)
    const tanque = page.getByRole('button', { name: 'Tanque elevado', exact: true })
    if (await tanque.isVisible().catch(() => false)) {
      await tanque.click()
      await estabilizar(page)
    }

    // 3. Informar el desnivel de conexión = -2. Antes de este dato el modo
    //    Rápido dejaba la verificación de presión en `incompletoRapido`;
    //    con el desnivel presente la cadena de presión avanza hasta el
    //    tramo de longitud 0. `-2` es un desnivel FIRMADO válido (CRIT-A37,
    //    Pcalc = Pacera − desnivel): no se rechaza ni se clampa.
    const desnivel = page.getByLabel(/^Desnivel .* \[m\]:/).first()
    await desnivel.fill('-2')
    await desnivel.blur().catch(() => {})
    await estabilizar(page)

    // 4. La app sigue montada: sin WHITE_SCREEN, sin el pageerror de
    //    `calcularPerdidaCargaHazenWilliams`, sin console.error.
    violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()

    const texto = await page.locator('#root').innerText()
    expect(texto.length).toBeGreaterThan(40)
    expect(texto).not.toContain('calcularPerdidaCargaHazenWilliams')

    // 5. CRIT-A37: el valor firmado se conserva tal cual, sin clamp a 0 ni
    //    Math.abs.
    await expect(desnivel).toHaveValue('-2')
  })

  test('FIX-CRASH-M3-INDUSTRIAL-01 · PH + ACS central + artefacto industrial AF+AC no desmonta la app', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)

    // Secuencia MÍNIMA (7 acciones) — sin montante, sin M4, sin cambio de
    // modo/Darcy/DN, sin duplicar/eliminar UF: sólo PH + ACS central + un
    // artefacto que pasa a industrial conectado a AF y AC a la vez.
    await page.getByRole('link', { name: /Medidores/ }).first().click()
    await estabilizar(page)
    const iniciar = page.getByRole('button', { name: 'Iniciar Módulo 3' })
    if (await iniciar.isVisible().catch(() => false)) {
      await iniciar.click()
      await estabilizar(page)
    }
    await page.getByRole('checkbox', { name: /Propiedad horizontal/ }).click()
    await estabilizar(page)
    await page.getByLabel('Provisión de agua caliente (por defecto):').selectOption('central')
    await estabilizar(page)

    // M1: cambiar el tipo de un artefacto a piletaDeCocinaIndustrial
    // (política 'automatica' / referencia 'ambas' → terminales AF y AC).
    await page.getByRole('link', { name: /Demanda/ }).first().click()
    await estabilizar(page)
    await page.getByRole('combobox', { name: 'Artefacto', exact: true }).first().selectOption('piletaDeCocinaIndustrial')
    await estabilizar(page)

    // La app sigue montada: sin WHITE_SCREEN, sin el pageerror de
    // `resolverQuEfectivo`, sin console.error, sin id técnico visible.
    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
    const texto = await page.locator('#root').innerText()
    expect(texto.length).toBeGreaterThan(40)
    expect(texto).not.toContain('resolverQuEfectivo')
    expect(texto).not.toContain('quFria_lps')
  })
})
