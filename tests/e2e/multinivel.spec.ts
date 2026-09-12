// UI-M1-MULTINIVEL-01 -- una Unidad Funcional puede tener uno o más niveles
// físicos. Una UF simple se ve igual que antes; "+ Agregar nivel" agrega un
// segundo nivel con su propia card, Locales y cota; M2 reconoce los Locales
// de ambos niveles con la cota correcta.
import { test, expect } from './qa/fixtures'
import { cargarAppLimpia, estabilizar } from './qa/estado'
import { verificarInvariantes, primerFallo } from './qa/invariantes'

test.describe('UI-M1-MULTINIVEL-01 · niveles físicos dentro de una Unidad Funcional', () => {
  test('UF simple: sin "Eliminar nivel", sin card de nivel extra -- se ve igual que antes', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await page.getByRole('link', { name: /Demanda/ }).first().click()
    await estabilizar(page)

    const uf = page.locator('.m1-uf').first()
    await expect(uf.getByRole('button', { name: 'Eliminar nivel' })).toHaveCount(0)
    await expect(uf.locator('.m1-nivel__cabecera')).toHaveCount(0)
    await expect(uf.getByRole('button', { name: '+ Agregar nivel' })).toBeVisible()

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('agregar un segundo nivel: aparece su propia card con nombre/nivel/cota y "Eliminar nivel"', async ({
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

    const niveles = uf.locator('.m1-nivel')
    await expect(niveles).toHaveCount(2)
    // Con 2+ niveles cada uno muestra su propia cabecera + "Eliminar nivel".
    await expect(uf.getByRole('button', { name: 'Eliminar nivel' })).toHaveCount(2)

    const nivelNuevo = niveles.nth(1)
    // Segundo nivel de la UF de ejemplo (PB): nivel siguiente = Piso 1.
    await expect(nivelNuevo.getByLabel('Nombre del nivel')).toHaveValue('Piso 1')
    await expect(nivelNuevo.locator('.m1-uf__locales')).toBeEmpty()

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('agregar un Local dentro del segundo nivel y verificar que M2 lo reconoce con su propia cota', async ({
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

    const nivelNuevo = uf.locator('.m1-nivel').nth(1)
    await nivelNuevo.getByRole('button', { name: '+ Agregar local' }).click()
    await estabilizar(page)

    const localNuevo = nivelNuevo.locator('.m1-local').first()
    await expect(localNuevo).toBeVisible()
    // "+ Agregar artefacto" agrega directo un artefacto sugerido por
    // contexto para este Local (sin abrir selector) cuando hay un
    // candidato -- ver `agregarArtefacto`/`sugerirArtefactoParaLocal`.
    await localNuevo.getByRole('button', { name: '+ Agregar artefacto' }).click()
    await estabilizar(page)

    // La cota hidráulica efectiva del artefacto nuevo se deriva de la cota
    // del SEGUNDO nivel (3,00 m, calcularCotaHidraulicaDefaultDeNivel),
    // nunca de la cota del primer nivel (0,00 m) ni de la UF -- prueba
    // directa de GEOM-COTA-01 reencuadrado a Nivel -> Local -> Artefacto.
    await expect(localNuevo.getByText(/Cota hidráulica efectiva: \+3,\d\d m/)).toBeVisible()

    await page.getByRole('link', { name: /Tuber[ií]as/ }).first().click()
    await estabilizar(page)

    // El nuevo Local ("Piso 1") aparece en M2 con su propio grupo, aparte
    // del Local homónimo del primer nivel ("PB").
    await expect(page.locator('#tuberias').getByText('Unidad funcional 1 · 2 niveles')).toBeVisible()

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('eliminar un nivel: sus Locales desaparecen, la UF nunca queda con 0 niveles', async ({
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
    await expect(uf.locator('.m1-nivel')).toHaveCount(2)

    await uf.getByRole('button', { name: 'Eliminar nivel' }).first().click()
    await estabilizar(page)

    // Vuelve a verse como UF simple: 1 nivel, sin "Eliminar nivel" ofrecido.
    await expect(uf.locator('.m1-nivel')).toHaveCount(1)
    await expect(uf.getByRole('button', { name: 'Eliminar nivel' })).toHaveCount(0)

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('duplicar una UF con 2 niveles: la copia trae ambos niveles', async ({ page, errores, baseURLEfectiva }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await page.getByRole('link', { name: /Demanda/ }).first().click()
    await estabilizar(page)

    const uf = page.locator('.m1-uf').first()
    await uf.getByRole('button', { name: '+ Agregar nivel' }).click()
    await estabilizar(page)

    await uf.getByRole('button', { name: 'Duplicar' }).click()
    await estabilizar(page)

    // La copia nace colapsada (sección 17/18 de UX-01) -- hay que expandirla
    // para ver sus niveles.
    const ufCopia = page.locator('.m1-uf').filter({ hasText: '(copia)' }).first()
    await ufCopia.locator('.m1-uf__toggle').click()
    await estabilizar(page)
    await expect(ufCopia.locator('.m1-nivel')).toHaveCount(2)

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })
})
