// UI-M1-DUPLICAR-LOCAL-01 -- duplicar un Local crea una copia editable e
// independiente dentro del MISMO Nivel, sin copiar topología física de M2.
import { test, expect } from './qa/fixtures'
import { cargarAppLimpia, estabilizar } from './qa/estado'
import { verificarInvariantes, primerFallo } from './qa/invariantes'

test.describe('UI-M1-DUPLICAR-LOCAL-01 · duplicar un Local dentro del mismo Nivel', () => {
  test('duplicar el Baño del demo: copia con los mismos artefactos, independiente del original', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await page.getByRole('link', { name: /Demanda/ }).first().click()
    await estabilizar(page)

    const uf = page.locator('.m1-uf').first()
    const locales = uf.locator('.m1-local')
    await expect(locales).toHaveCount(5) // demo: Baño, Cocina, Lavadero, Toilette, Jardín

    const bano = locales.first()
    await expect(bano.locator('h4')).toHaveText('Baño')
    const artefactosBano = bano.locator('.m1-artefacto')
    await expect(artefactosBano).toHaveCount(4)

    await bano.getByRole('button', { name: 'Duplicar local' }).click()
    await estabilizar(page)

    // La copia aparece INMEDIATAMENTE DESPUÉS del original, dentro del
    // mismo Nivel. El Local duplicado sigue siendo tipo Baño -- con 2
    // Locales del mismo tipo, la etiqueta pasa a numerarse (mecanismo YA
    // existente de `etiquetasDeLocales`, sin campo de nombre nuevo en el
    // schema de Local).
    await expect(locales).toHaveCount(6)
    const banoOriginal = locales.first()
    const banoCopia = locales.nth(1)
    await expect(banoOriginal.locator('h4')).toHaveText('Baño 1')
    await expect(banoCopia.locator('h4')).toHaveText('Baño 2')
    await expect(banoCopia.locator('.m1-artefacto')).toHaveCount(4)

    // Editar la cantidad del primer artefacto de la COPIA no debe afectar al original.
    const cantidadCopia = banoCopia.locator('.m1-artefacto').first().getByRole('spinbutton', { name: 'Cantidad' })
    await cantidadCopia.fill('3')
    await estabilizar(page)
    const cantidadOriginal = banoOriginal.locator('.m1-artefacto').first().getByRole('spinbutton', { name: 'Cantidad' })
    await expect(cantidadOriginal).toHaveValue('1')
    await expect(cantidadCopia).toHaveValue('3')

    // Eliminar un artefacto de la copia no afecta al original.
    await banoCopia.locator('.m1-artefacto').first().getByRole('button', { name: 'Eliminar artefacto' }).click()
    await estabilizar(page)
    await expect(banoCopia.locator('.m1-artefacto')).toHaveCount(3)
    await expect(banoOriginal.locator('.m1-artefacto')).toHaveCount(4)

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })

  test('duplicar un Local dentro de un segundo Nivel: la copia queda en ESE Nivel, sin conectividad física heredada en M2', async ({
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
    await localNuevo.getByRole('button', { name: '+ Agregar artefacto' }).click()
    await estabilizar(page)

    await localNuevo.getByRole('button', { name: 'Duplicar local' }).click()
    await estabilizar(page)

    // Ambos (original + copia) quedan en el mismo Nivel adicional; el
    // primer Nivel (PB, base) no se tocó.
    await expect(nivelNuevo.locator('.m1-local')).toHaveCount(2)
    const nivelBase = uf.locator('.m1-nivel').nth(0)
    await expect(nivelBase.locator('.m1-local')).toHaveCount(5)

    // En Tuberías, el Local nuevo y su copia aparecen como grupos
    // separados -- nunca comparten fila ni terminal (sin conectividad
    // física heredada: cada Local queda como recién creado en M2).
    await page.getByRole('link', { name: /Tuber[ií]as/ }).first().click()
    await estabilizar(page)
    await expect(page.locator('#tuberias').getByText('Unidad funcional 1 · 2 niveles')).toBeVisible()

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })
})
