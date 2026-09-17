// HYD-EST-NETWORK-01 — E2E dirigido: camino feliz completo sobre un
// proyecto real con un cambio de DN en un Montante (Caso A de aceptación,
// src/pruebas/fixtures/hydEstNetwork01/casoA-montante-simple.iuas),
// importado tal cual la app lo haría desde un archivo .iuas real (mismo
// flujo que persistencia.spec.ts). Cubre: 1) apertura del proyecto con
// cambio de DN, 2) cálculo hidráulico ya resuelto al cargar, 3)
// visualización del resultado en Tuberías, 4) listado de materiales, 5)
// generación del informe/PDF -- ambos documentos.
import * as path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test, expect } from './qa/fixtures'
import { cargarAppLimpia, estabilizar } from './qa/estado'
import { verificarInvariantes, primerFallo } from './qa/invariantes'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const RUTA_CASO_A = path.join(__dirname, '..', '..', 'src', 'pruebas', 'fixtures', 'hydEstNetwork01', 'casoA-montante-simple.iuas')

test.describe('HYD-EST-NETWORK-01 · camino feliz con cambio de DN', () => {
  test('importar proyecto con reducción de Montante -> ver resultado en Tuberías -> generar listado de materiales -> generar memoria técnica', async ({
    page,
    errores,
    baseURLEfectiva,
  }) => {
    await cargarAppLimpia(page, baseURLEfectiva)
    await page.getByRole('link', { name: /Demanda/ }).first().click()
    await estabilizar(page)

    // 1) Apertura de un proyecto con cambio de DN (Caso A: Montante de 4
    // Locales, último segmento forzado a 25 mm contra 20 mm del resto).
    await page.setInputFiles('input[type="file"]', RUTA_CASO_A)
    await estabilizar(page)
    const dialogo = page.getByRole('dialog')
    await expect(dialogo).toBeVisible()
    await dialogo.getByRole('button', { name: 'Importar', exact: true }).click()
    await estabilizar(page)

    await expect(page.getByText('Total de unidades funcionales: 1')).toBeVisible()

    // 2)+3) Cálculo hidráulico ya resuelto -- se visualiza en Tuberías.
    await page.getByRole('link', { name: /Tuber[ií]as/ }).first().click()
    await estabilizar(page)
    // El Montante importado (nombre custom del Caso A) debe ser visible en
    // la vista de Tuberías -- confirma que la topología real se cargó, no
    // sólo el envoltorio del archivo.
    await expect(page.getByText('Montante AF Torre única')).toBeVisible()

    // 4) Listado de materiales: generar con margen del 10 %.
    await page.getByRole('button', { name: 'Generar listado de materiales' }).click()
    await estabilizar(page)
    const controlMateriales = page.getByRole('group', { name: 'Generar listado de materiales' })
    await expect(controlMateriales.getByText('Margen adicional de compra')).toBeVisible()
    await controlMateriales.getByRole('combobox').selectOption('10')

    const descargaMateriales = page.waitForEvent('download')
    await controlMateriales.getByRole('button', { name: 'Generar PDF' }).click()
    const materiales = await descargaMateriales
    expect(materiales.suggestedFilename()).toMatch(/^Caudal_Listado_de_materiales_.*\.pdf$/)

    // 5) Informe/memoria técnica (incluye la Verificación hidráulica con
    // el margen del terminal crítico).
    const descargaMemoria = page.waitForEvent('download')
    await page.getByRole('button', { name: 'Generar memoria técnica' }).click()
    const memoria = await descargaMemoria
    expect(memoria.suggestedFilename()).toMatch(/\.pdf$/)

    const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
    expect(primerFallo(violaciones), JSON.stringify(primerFallo(violaciones))).toBeNull()
  })
})
