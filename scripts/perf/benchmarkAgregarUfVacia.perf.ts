// Benchmark LOCAL de "Agregar UF vacía" a escala real 30+ UF (PERF-SCALE-01E).
//
//   npx vitest run --config vitest.perf.config.ts scripts/perf/benchmarkAgregarUfVacia.perf.ts
//   PERF_UF=10,20,30,33 npx vitest run --config vitest.perf.config.ts scripts/perf/benchmarkAgregarUfVacia.perf.ts
//
// NO es CI (mismo criterio que benchmarkEscalaXXL.perf.ts / benchmarkMotorDeEscala.perf.ts):
// los tiempos dependen de la máquina. Este benchmark es el paso de PROFILING
// ANTES DE EDITAR de PERF-SCALE-01E, sección "construir proyecto" + "motores"
// de la tabla de perfilado: aísla el costo de Node (mutación + resolvers),
// que NO incluye render/commit de React (eso se mide aparte, en navegador,
// porque este script corre en environment: 'node', sin DOM).
//
// La mutación real de "Agregar UF" es `agregarUnidadFuncionalVaciaEnProyecto`
// (extraída de MotorDemandaPantalla.tsx en este mismo slice, mismo criterio
// que duplicarUnidadFuncionalEnProyecto): la usamos tal cual, sin reimplementarla.
import { describe, it } from 'vitest'
import { catalogoArtefactos } from '../../src/normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../src/normativa/eras-2023/coeficientes-mayoracion'
import { resolverEstadoModulo2 } from '../../src/motor/modulo2/resolverEstadoModulo2'
import { resolverEstadoModulo3 } from '../../src/motor/modulo3/resolverEstadoModulo3'
import { resolverEstadoModulo4 } from '../../src/motor/modulo4/resolverEstadoModulo4'
import { resolverResumenDeProyecto } from '../../src/interfaz/paginas/resolverResumenDeProyecto'
import { resolverEntradasDeVerificacion } from '../../src/interfaz/paginas/resolverEntradasDeVerificacion'
import { validarProyecto } from '../../src/validacion'
import { agregarUnidadFuncionalVaciaEnProyecto } from '../../src/interfaz/paginas/agregarUnidadFuncional'
import { generarProyectoDeEscala, contarMagnitudesDeEscala } from '../../src/pruebas/escala/generarProyectoDeEscala'
import type { Proyecto } from '../../src/modelo/proyecto'
import { catalogoSistemasDeTuberia } from '../../src/motor/tuberias/sistemaDeTuberia'
import { catalogoMaterialesTuberia } from '../../src/motor/tuberias/materialTuberia'

const NIVELES_UF = (process.env.PERF_UF ?? '10,20,30,33')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n) && n > 0)
// 4 locales/UF × 4 artefactos/local = 16 artefactos/UF -- a 33 UF da 528
// artefactos, la misma magnitud que el caso real reportado (~544 a 30 UF).
const LOCALES_POR_UF = Number(process.env.PERF_LOCALES ?? 4)
const REPS = Number(process.env.PERF_REPS ?? 5)

function mediana(xs: readonly number[]): number {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[m - 1]! + s[m]!) / 2 : s[m]!
}

function medirMs(fn: () => void): readonly number[] {
  fn() // warm-up (JIT)
  const xs: number[] = []
  for (let i = 0; i < REPS; i += 1) {
    const t = performance.now()
    fn()
    xs.push(performance.now() - t)
  }
  return xs
}

function fmt(xs: readonly number[]): string {
  return `${mediana(xs).toFixed(1)} ms (min ${Math.min(...xs).toFixed(1)}, max ${Math.max(...xs).toFixed(1)})`
}

function conUnidadFuncionalVaciaAgregada(proyecto: Proyecto): Proyecto {
  return agregarUnidadFuncionalVaciaEnProyecto(proyecto).proyecto
}

function correrM2(proyecto: Proyecto) {
  const entradas = resolverEntradasDeVerificacion(proyecto, catalogoArtefactos, coeficientesMayoracion)
  return resolverEstadoModulo2(
    entradas.proyectoParaVerificacion,
    entradas.presionDisponible_mca,
    entradas.hfMedidorDeTerminal,
    catalogoArtefactos,
    catalogoSistemasDeTuberia,
    catalogoMaterialesTuberia,
  )
}

// Replica exactamente el trabajo de motor/derivados que hoy corre dentro de
// MotorDemandaPantalla en cada render (PERF-SCALE-01E §3-4 del brief):
// validación (sin useMemo), resolución M2 (useMemo [proyecto, demandaValida]),
// resumen (sin useMemo, que a su vez recalcula M3 y M4 vía
// resolverResumenDeProyecto), y M3/M4 de nuevo cada uno en su propio panel
// (sin memo, sin compartir con el que ya corrió dentro de resumen).
function correrPantallaCompleta(proyecto: Proyecto) {
  const validacion = validarProyecto(proyecto, catalogoArtefactos, coeficientesMayoracion, catalogoSistemasDeTuberia)
  const entradas = resolverEntradasDeVerificacion(proyecto, catalogoArtefactos, coeficientesMayoracion)
  const estadoModulo2 = resolverEstadoModulo2(
    entradas.proyectoParaVerificacion,
    entradas.presionDisponible_mca,
    entradas.hfMedidorDeTerminal,
    catalogoArtefactos,
    catalogoSistemasDeTuberia,
    catalogoMaterialesTuberia,
  )
  const resumen = resolverResumenDeProyecto(proyecto, catalogoArtefactos, coeficientesMayoracion, estadoModulo2)
  const estadoModulo3Panel = resolverEstadoModulo3(proyecto, catalogoArtefactos, coeficientesMayoracion)
  const estadoModulo4Panel = resolverEstadoModulo4({ proyecto, catalogoArtefactos, coeficientesMayoracion })
  return { validacion, estadoModulo2, resumen, estadoModulo3Panel, estadoModulo4Panel }
}

describe('benchmark "Agregar UF vacía" a escala 10-33 UF (PERF-SCALE-01E)', () => {
  it(`UF=${NIVELES_UF.join(',')} localesPorUf=${LOCALES_POR_UF} · ${REPS} reps`, () => {
    console.log(`\n=== PERF-SCALE-01E · benchmark "Agregar UF vacía" · reps=${REPS} ===`)
    for (const cantidadUf of NIVELES_UF) {
      const proyecto = generarProyectoDeEscala({ cantidadUf, localesPorUf: LOCALES_POR_UF })
      const mag = contarMagnitudesDeEscala(proyecto)
      const proyectoConUfVacia = conUnidadFuncionalVaciaAgregada(proyecto)

      console.log(
        `\n[UF=${cantidadUf}→${cantidadUf + 1} vacía] locales=${mag.locales} artefactos=${mag.artefactos} nodos=${mag.nodos} tramos=${mag.tramos} terminales=${mag.terminales}`,
      )

      const msMutacion = medirMs(() => conUnidadFuncionalVaciaAgregada(proyecto))
      const msPantallaAntes = medirMs(() => correrPantallaCompleta(proyecto))
      const msPantallaDespues = medirMs(() => correrPantallaCompleta(proyectoConUfVacia))

      // Equivalencia hidráulica: agregar una UF vacía NO debe cambiar
      // demanda/Qc/DN/candidatos de M2 (brief §26).
      const estadoAntes = correrM2(proyecto)
      const estadoDespues = correrM2(proyectoConUfVacia)
      const candidatosAntes = estadoAntes.estado === 'incompleto' || estadoAntes.estado === 'completo' ? JSON.stringify(estadoAntes.candidatos.map((c) => c.resultado)) : 'n/a'
      const candidatosDespues = estadoDespues.estado === 'incompleto' || estadoDespues.estado === 'completo' ? JSON.stringify(estadoDespues.candidatos.map((c) => c.resultado)) : 'n/a'

      console.log(
        [
          `     mutación (construir Proyecto+UF vacía)   ${fmt(msMutacion)}`,
          `     PANTALLA COMPLETA antes (${cantidadUf} UF)         ${fmt(msPantallaAntes)}`,
          `     PANTALLA COMPLETA después (${cantidadUf + 1} UF, 1 vacía) ${fmt(msPantallaDespues)}`,
          `     candidatos M2 idénticos antes/después:    ${candidatosAntes === candidatosDespues}`,
        ].join('\n'),
      )
    }
    console.log('')
  })
})
