// QA-FUZZ-01 · fuzz de secuencias reproducible (brief §5, §20-§25, §36,
// §41). Cada run:
//   1. carga la app a su estado inicial (SPA -> proyecto de ejemplo),
//   2. deriva un PRNG de `${seedBase}:${run}`,
//   3. for step in 0..N: acciones aplicables -> elegir por peso -> ejecutar
//      -> estabilizar -> comprobar invariantes -> loguear,
//   4. ante el primer fallo: preserva evidencia (artifacts + trace +
//      screenshot) y DETIENE esa seed. NO corrige nada (brief §39).
//
// Replay:  IUAS_FUZZ_SEED=<n> IUAS_FUZZ_RUNS=1 IUAS_FUZZ_STEPS=<n> npm run e2e:fuzz
// Acotar:  IUAS_FUZZ_MAX_STEP=<n>
import { test, expect, clasificarFallo } from './qa/fixtures'
import { cargarAppLimpia, estabilizar } from './qa/estado'
import { crearPrng, normalizarSeed } from './qa/prng'
import { siguientePaso } from './qa/generador'
import { verificarInvariantes, primerFallo, tomarMuestraDom } from './qa/invariantes'
import { escribirArtifactsDeFallo } from './qa/reporte'
import type { AccionRegistrada, InfoDeFallo } from './qa/tipos'
import { describirAccion } from './qa/tipos'

const RUNS = Math.max(1, Number(process.env.IUAS_FUZZ_RUNS ?? 10))
const STEPS = Math.max(1, Number(process.env.IUAS_FUZZ_STEPS ?? 20))
const MAX_STEP = process.env.IUAS_FUZZ_MAX_STEP ? Number(process.env.IUAS_FUZZ_MAX_STEP) : STEPS
const PASOS_EFECTIVOS = Math.min(STEPS, MAX_STEP)

// Seed base: explícita (reproducible) o generada (se imprime para poder
// reproducir después). Nunca Math.random sin PRNG seedable (brief §5).
const SEED_BASE = process.env.IUAS_FUZZ_SEED?.trim() || String((Date.now() ^ (process.pid << 16)) >>> 0)

test.describe('QA-FUZZ-01 · sequence fuzz', () => {
  test.describe.configure({ mode: 'serial' })

  test.beforeAll(() => {
    // Único bloque ruidoso: los parámetros de la corrida (brief §41).
    console.log(
      `\nQA-FUZZ-01  seedBase=${SEED_BASE}  runs=${RUNS}  steps=${PASOS_EFECTIVOS}` +
        `  (IUAS_FUZZ_SEED=${SEED_BASE} para reproducir)\n`,
    )
  })

  for (let run = 0; run < RUNS; run++) {
    const seedRun = `${SEED_BASE}:${run}`

    test(`run ${run} · seed ${seedRun}`, async ({ page, errores, baseURLEfectiva }, testInfo) => {
      // Cada paso hace un escaneo de precondiciones + comprobación de
      // invariantes contra una URL remota; se dimensiona el timeout por
      // cantidad de pasos en vez de dejar el default de 90 s.
      testInfo.setTimeout(60_000 + PASOS_EFECTIVOS * 15_000)
      const prng = crearPrng(normalizarSeed(seedRun))
      await cargarAppLimpia(page, baseURLEfectiva)

      // Invariantes de arranque: si la app ya está rota al cargar, es un
      // problema distinto (lo detecta también el smoke).
      const arranque = await verificarInvariantes(page, errores)
      expect(primerFallo(arranque), `run ${run}: la app no cargó limpia`).toBeNull()

      const completadas: AccionRegistrada[] = []

      for (let step = 1; step <= PASOS_EFECTIVOS; step++) {
        let registro: AccionRegistrada | null = null
        let errorEjecucion: Error | null = null
        try {
          const r = await siguientePaso(page, prng)
          if (r.tipo === 'sin-acciones') {
            console.log(`  run ${run} step ${step}: sin acciones aplicables — run terminado limpio`)
            break
          }
          registro = r.paso.accion
        } catch (e) {
          errorEjecucion = e as Error
        }

        await estabilizar(page)

        const violaciones = await verificarInvariantes(page, errores, { exigirDemandaViva: true })
        const fallo = primerFallo(violaciones)

        if (registro) completadas.push(registro)

        if (!errorEjecucion && !fallo) {
          continue
        }

        // ---- FALLO: preservar evidencia, NO corregir (brief §39, §61) ----
        const muestra = await tomarMuestraDom(page).catch(() => null)
        const acumulado = errores.todo()
        const clasif = clasificarFallo({
          hayPageError: acumulado.pageerror.length > 0,
          hayConsoleError: acumulado.consola.length > 0,
          hayPantallaBlanca: violaciones.some((v) => v.nombre === 'pantalla-no-blanca' && !v.ok),
          hayInvarianteApp: violaciones.some((v) => !v.ok && v.clase === 'APP'),
          hayPedidoEsencialFallido: acumulado.requestfailed.some((r) => r.esencial),
          mensajeError: errorEjecucion?.message ?? fallo?.detalle,
        })

        const info: InfoDeFallo = {
          seed: seedRun,
          run,
          step,
          action: registro,
          actionsCompleted: completadas,
          baseURL: baseURLEfectiva,
          viewport: page.viewportSize() ?? { width: 0, height: 0 },
          currentURL: page.url(),
          errorType: errorEjecucion ? `ejecucion:${errorEjecucion.name}` : `invariante:${fallo?.nombre}`,
          clase: clasif.clase,
          message: errorEjecucion?.message ?? fallo?.detalle ?? clasif.motivo,
          timestamp: new Date().toISOString(),
          consola: acumulado.consola,
          pageerror: acumulado.pageerror,
          requestfailed: acumulado.requestfailed,
          ultimoTextoRelevante: muestra?.textoRoot?.slice(0, 4000),
        }
        const carpeta = await escribirArtifactsDeFallo(info)

        // Adjuntos al reporte de Playwright.
        await testInfo.attach('failure.json', { body: JSON.stringify(info, null, 2), contentType: 'application/json' })
        const secuencia = [
          ...completadas.map((a, i) => `step ${i + 1}: ${describirAccion(a)}`),
          registro ? `step ${step}: ${describirAccion(registro)}  <-- FALLO` : `step ${step}: (fallo antes de completar la acción)`,
        ].join('\n')
        await testInfo.attach('secuencia.txt', { body: secuencia, contentType: 'text/plain' })
        await page.screenshot({ path: `${carpeta}/screenshot.png`, fullPage: true }).catch(() => {})

        const encabezado =
          `[${clasif.clase}] run ${run} · seed ${seedRun} · step ${step} · ` +
          `${registro ? describirAccion(registro) : '(sin acción)'} · ${clasif.motivo}`
        console.log(`\n${encabezado}\nartifact: ${carpeta}\n${secuencia}\n`)

        throw new Error(`${encabezado}\n${info.message}\nArtifacts: ${carpeta}`)
      }

      console.log(`  run ${run}: OK (${completadas.length} pasos)`)
    })
  }
})
