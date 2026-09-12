// UI-M2-RESP-POLISH-01 -- pulido visual Local → Red (sin repetir el nombre
// del Local en las filas hijas AF/AC) + corrección de overflow horizontal
// mobile. Puramente presentacional/responsive: no toca hidráulica.
import { test, expect } from './qa/fixtures'
import { cargarAppLimpia, estabilizar } from './qa/estado'
import { verificarInvariantes, primerFallo } from './qa/invariantes'

test.describe('UI-M2-RESP-POLISH-01 · jerarquía Local → Red sin nombre redundante', () => {
  test('el padre muestra el nombre del Local UNA vez; las filas hijas AF/AC no lo repiten', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await page.getByRole('link', { name: /Tuber[ií]as/ }).first().click()
    await estabilizar(page)

    const tabla = page.locator('#tuberias').locator('.tabla-tecnica').last()

    // Baño (demo): lavatorio + ducha + bidet AF+AC, inodoro AF-only -> 2 filas hijas (AF/AC).
    const grupoBano = tabla.locator('tr.m2-fila-grupo', { hasText: 'Baño 1' })
    await expect(grupoBano).toHaveCount(1)
    await expect(grupoBano).toContainText('Baño 1')
    await expect(grupoBano).toContainText('artefacto')

    // Las dos filas hijas del Baño: por posición, inmediatamente después
    // del encabezado de grupo.
    const filaAf = grupoBano.locator('xpath=following-sibling::tr[contains(@class,"m2-fila-agrupada")][1]')
    const filaAc = grupoBano.locator('xpath=following-sibling::tr[contains(@class,"m2-fila-agrupada")][2]')

    await expect(filaAf).toContainText('puntos')
    await expect(filaAf).toContainText('Agua fría')
    await expect(filaAf).not.toContainText('Baño 1')

    await expect(filaAc).toContainText(/punto(s)?/)
    await expect(filaAc).toContainText('Agua caliente')
    await expect(filaAc).not.toContainText('Baño 1')

    // El aria-label de accesibilidad SÍ conserva el nombre completo del
    // Local (identidad intacta, sólo cambió la presentación visible).
    await expect(page.getByLabel('Longitud [m] de Baño 1 Agua fría')).toBeVisible()

    // Cocina (demo): pileta AF+AC, lavavajillas AF-only -> 1 fila hija por red.
    const grupoCocina = tabla.locator('tr.m2-fila-grupo', { hasText: 'Cocina 1' })
    await expect(grupoCocina).toHaveCount(1)
    const filaCocinaAf = grupoCocina.locator('xpath=following-sibling::tr[contains(@class,"m2-fila-agrupada")][1]')
    await expect(filaCocinaAf).not.toContainText('Cocina 1')
    await expect(filaCocinaAf).toContainText('puntos')

    // No regresión: Distribución general no es una fila agrupada -- sigue
    // mostrando su propio texto normal, sin la clase m2-fila-agrupada.
    const distribucionGeneral = page.locator('#tuberias').getByText('Alimentación general', { exact: false }).first()
    await expect(distribucionGeneral).toBeVisible()

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('expandir/contraer una fila hija sigue funcionando igual (sin regresión de acordeón)', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await page.getByRole('link', { name: /Tuber[ií]as/ }).first().click()
    await estabilizar(page)

    const grupoBano = page.locator('#tuberias').locator('tr.m2-fila-grupo', { hasText: 'Baño 1' })
    const filaAf = grupoBano.locator('xpath=following-sibling::tr[contains(@class,"m2-fila-agrupada")][1]')
    const resumenFilaAf = filaAf.locator('summary')
    const detalleFilaAf = filaAf.locator('xpath=following-sibling::tr[contains(@class,"m2-fila-detalle")][1]')

    await expect(resumenFilaAf).toBeVisible()
    await resumenFilaAf.click()
    await estabilizar(page)
    await expect(detalleFilaAf).toBeVisible()
    await resumenFilaAf.click()
    await estabilizar(page)
    await expect(detalleFilaAf).toBeHidden()

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })
})

test.describe('UI-M2-RESP-POLISH-01 · overflow horizontal mobile (re-diagnóstico)', () => {
  // Reproduce EXACTAMENTE el escenario que disparaba el overflow
  // (documentado en D-δ.107 como ".m2-fila-agrupada", re-diagnosticado acá
  // como `.m1-uf__acciones` sin wrap real en mobile -- ver
  // PENDIENTES-DE-ARQUITECTURA.md). La tabla de M2 en sí NUNCA desbordó
  // (`.tabla-scroll` ya la contenía); este test cubre el caso compuesto
  // completo de punta a punta para no volver a perderlo.
  test('agregar un segundo nivel + duplicar la UF + ver Tuberías en mobile: sin overflow horizontal de página', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await page.getByRole('link', { name: /Demanda/ }).first().click()
    await estabilizar(page)

    const uf = page.locator('.m1-uf').first()
    await uf.getByRole('button', { name: '+ Agregar nivel' }).click()
    await estabilizar(page)
    await uf.getByRole('button', { name: 'Duplicar', exact: true }).click()
    await estabilizar(page)

    const ufCopia = page.locator('.m1-uf').filter({ hasText: '(copia)' }).first()
    await ufCopia.locator('.m1-uf__toggle').click()
    await estabilizar(page)

    await page.getByRole('link', { name: /Tuber[ií]as/ }).first().click()
    await estabilizar(page)

    const overflow = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }))
    expect(overflow.scrollWidth - overflow.clientWidth, JSON.stringify(overflow)).toBeLessThanOrEqual(2)

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('M2 con la fila agrupada del Baño visible: pill, "N puntos" y control expandir/contraer usables en mobile', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await page.getByRole('link', { name: /Tuber[ií]as/ }).first().click()
    await estabilizar(page)

    const grupoBano = page.locator('#tuberias').locator('tr.m2-fila-grupo', { hasText: 'Baño 1' })
    await expect(grupoBano).toBeVisible()
    const filaAf = grupoBano.locator('xpath=following-sibling::tr[contains(@class,"m2-fila-agrupada")][1]')
    await expect(filaAf.getByText('Agua fría')).toBeVisible()
    const detalle = filaAf.locator('details')
    await expect(detalle).toBeVisible()
    await filaAf.locator('summary').click()
    await estabilizar(page)
    await expect(detalle).toHaveAttribute('open', '')

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })
})
