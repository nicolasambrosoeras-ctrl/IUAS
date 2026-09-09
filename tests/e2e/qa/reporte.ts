// Escritura de ARTIFACTS de fallo (brief §16, §17, §41, §42). Todo va a
// `qa-results/` (gitignored). No se commitean resultados.
import { mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { FilaDeCatalogo, InfoDeFallo } from './tipos'
import { describirAccion } from './tipos'

export const DIR_RESULTADOS = 'qa-results'

// Nombre de carpeta seguro en cualquier FS (Windows no admite `:` en
// rutas): la seed de un run es `${base}:${run}`.
function carpetaDeFallo(seed: string, run: number): string {
  const seedSegura = seed.replace(/[^\w.-]+/g, '_')
  return join(DIR_RESULTADOS, `seed-${seedSegura}${run > 0 ? `-run${run}` : ''}`)
}

// Escribe failure.json + actions.json + console.txt + pageerror.txt.
// El screenshot y el trace los gestiona Playwright (config: only-on-failure
// / retain-on-failure); aca se agrega el paquete legible.
export async function escribirArtifactsDeFallo(info: InfoDeFallo): Promise<string> {
  const carpeta = carpetaDeFallo(info.seed, info.run)
  await mkdir(carpeta, { recursive: true })

  await writeFile(join(carpeta, 'failure.json'), JSON.stringify(info, null, 2), 'utf8')

  const acciones = [
    `seed=${info.seed}`,
    `run=${info.run}`,
    `baseURL=${info.baseURL}`,
    `viewport=${info.viewport.width}x${info.viewport.height}`,
    '',
    ...info.actionsCompleted.map((a, i) => `step ${i + 1}: ${describirAccion(a)}`),
    info.action ? `step ${info.step}: ${describirAccion(info.action)}   <-- FAIL (${info.errorType})` : `FAIL (${info.errorType}) sin accion en curso`,
  ].join('\n')
  await writeFile(join(carpeta, 'actions.json'), JSON.stringify(info.actionsCompleted, null, 2), 'utf8')
  await writeFile(join(carpeta, 'actions.txt'), acciones, 'utf8')

  const consola = (info.consola ?? []).map((c) => `${c.ubicacion ?? '?'}  ${c.texto}`).join('\n')
  await writeFile(join(carpeta, 'console.txt'), consola || '(sin console.error)', 'utf8')

  const pageerror = (info.pageerror ?? [])
    .map((p) => `${p.mensaje}\n${p.stack ?? '(sin stack)'}`)
    .join('\n\n---\n\n')
  await writeFile(join(carpeta, 'pageerror.txt'), pageerror || '(sin pageerror)', 'utf8')

  if (info.ultimoTextoRelevante) {
    await writeFile(join(carpeta, 'ultimo-texto.txt'), info.ultimoTextoRelevante, 'utf8')
  }

  return carpeta
}

// Reporte de la matriz de catalogo (brief §19, §42).
export async function escribirReporteDeCatalogo(filas: readonly FilaDeCatalogo[]): Promise<{ json: string; md: string }> {
  await mkdir(DIR_RESULTADOS, { recursive: true })
  const rutaJson = join(DIR_RESULTADOS, 'catalog-connectivity-report.json')
  const rutaMd = join(DIR_RESULTADOS, 'catalog-connectivity-report.md')

  await writeFile(rutaJson, JSON.stringify({ generado: new Date().toISOString(), filas }, null, 2), 'utf8')

  const marca = (v: boolean | null): string => (v === null ? '—' : v ? 'ok' : 'CRASH')
  const encabezado = '| Artefacto | Régimen | ¿pregunta? | AF | AC | AF+AC | error |'
  const separador = '| --- | --- | --- | --- | --- | --- | --- |'
  const cuerpo = filas.map(
    (f) =>
      `| ${f.nombre} | ${f.regimen} | ${f.preguntaConectividad ? 'sí' : 'no'} | ${marca(f.afSafe)} | ${marca(
        f.acSafe,
      )} | ${marca(f.afAcSafe)} | ${f.error ?? ''} |`,
  )
  const md = [
    '# QA-FUZZ-01 — Matriz de conectividad del catálogo',
    '',
    `Generado: ${new Date().toISOString()}`,
    '',
    'Matriz observada de CAT-CONN-01 (D-δ.84): qué artefactos piden declarar la',
    'alimentación (política `requiereSeleccion`) y cuáles quedan conectados por la',
    'política del catálogo, más la seguridad (no hay crash / pantalla blanca al',
    'elegir cada opción de los que sí preguntan).',
    '',
    encabezado,
    separador,
    ...cuerpo,
    '',
  ].join('\n')
  await writeFile(rutaMd, md, 'utf8')

  return { json: rutaJson, md: rutaMd }
}

// Resumen compacto de una corrida de fuzz (brief §41): no imprimir 1500
// lineas si todo pasa.
export function resumenDeCorrida(params: {
  baseURL: string
  runs: number
  steps: number
  seeds: string[]
  pass: number
  fail: number
  fallos: { seed: string; run: number; step: number; accion: string; artifact: string }[]
  duracionMs: number
}): string {
  const l: string[] = []
  l.push('QA-FUZZ-01')
  l.push('')
  l.push(`baseURL: ${params.baseURL}`)
  l.push(`runs:    ${params.runs}`)
  l.push(`steps:   ${params.steps}`)
  l.push(`seeds:   ${params.seeds.join(', ')}`)
  l.push(`tiempo:  ${(params.duracionMs / 1000).toFixed(1)} s`)
  l.push('')
  l.push(`PASS: ${params.pass}`)
  l.push(`FAIL: ${params.fail}`)
  for (const f of params.fallos) {
    l.push('')
    l.push(`failure: seed ${f.seed} · run ${f.run} · step ${f.step} · ${f.accion}`)
    l.push(`artifact: ${f.artifact}`)
  }
  return l.join('\n')
}
