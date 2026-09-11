// Benchmark LOCAL del motor de resolución a escala (PERF-SCALE-01A).
//
//   npm run perf                # S y M
//   PERF_NIVELES=S,M,L,XL npm run perf
//   PERF_REPS=7 npm run perf
//
// NO es CI: los tiempos dependen de la máquina. La regresión automática es
// estructural y vive en Vitest normal (escalaDelMotor.regresion.test.ts).
//
// Mide, por nivel de escala, UNA "resolución" tal como la dispara editar un
// input de verificación en la app:
//   - resolverEstadoModulo2(proyectoParaVerificacion, ...)   (verificación M2)
//   - resolverResumenDeProyecto(proyecto, ...)               (sidebar: M1+M2+M4)
// y reporta la mediana de PERF_REPS corridas más, para UNA resolución:
//   - índices topológicos construidos (= nº de entradas a
//     resolverHidraulicaDeTramo: cada llamada construye exactamente uno)
//   - traversals DFS de condición aguas abajo
// El primero, comparado con "distintos tramos", es la evidencia de la
// redundancia cross-camino/cross-etapa que queda para PERF-SCALE-01B.
import { describe, it } from 'vitest'
import { catalogoArtefactos } from '../../src/normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../src/normativa/eras-2023/coeficientes-mayoracion'
import { catalogoSistemasDeTuberia } from '../../src/motor/tuberias/sistemaDeTuberia'
import { catalogoMaterialesTuberia } from '../../src/motor/tuberias/materialTuberia'
import { resolverEstadoModulo2 } from '../../src/motor/modulo2/resolverEstadoModulo2'
import { resolverResumenDeProyecto } from '../../src/interfaz/paginas/resolverResumenDeProyecto'
import { resolverEntradasDeVerificacion } from '../../src/interfaz/paginas/resolverEntradasDeVerificacion'
import {
  activarInstrumentacionTopologica,
  desactivarInstrumentacionTopologica,
  leerInstrumentacionTopologica,
  reiniciarInstrumentacionTopologica,
} from '../../src/motor/tuberias/topologia/instrumentacionTopologica'
import {
  generarProyectoDeEscalaPorNivel,
  contarMagnitudesDeEscala,
  NIVEL_DE_ESCALA,
  type NivelDeEscala,
} from '../../src/pruebas/escala/generarProyectoDeEscala'

const NIVELES = (process.env.PERF_NIVELES ?? 'S,M')
  .split(',')
  .map((s) => s.trim())
  .filter((s): s is NivelDeEscala => s in NIVEL_DE_ESCALA)
const REPS = Number(process.env.PERF_REPS ?? 5)

function mediana(xs: readonly number[]): number {
  const s = [...xs].sort((a, b) => a - b)
  const m = Math.floor(s.length / 2)
  return s.length % 2 === 0 ? (s[m - 1]! + s[m]!) / 2 : s[m]!
}

describe('benchmark motor de escala (PERF-SCALE-01A)', () => {
  it(`niveles ${NIVELES.join(',')} · ${REPS} reps`, () => {
    console.log(`\n=== PERF-SCALE-01A · benchmark motor · reps=${REPS} ===`)
    for (const nivel of NIVELES) {
      const proyecto = generarProyectoDeEscalaPorNivel(nivel)
      const mag = contarMagnitudesDeEscala(proyecto)
      const entradas = resolverEntradasDeVerificacion(proyecto, catalogoArtefactos, coeficientesMayoracion)

      const correrM2 = () =>
        resolverEstadoModulo2(
          entradas.proyectoParaVerificacion,
          entradas.presionDisponible_mca,
          entradas.hfMedidorDeTerminal,
          catalogoArtefactos,
          catalogoSistemasDeTuberia,
          catalogoMaterialesTuberia,
        )
      const correrResumen = () => resolverResumenDeProyecto(proyecto, catalogoArtefactos, coeficientesMayoracion)

      correrM2() // warm-up (JIT)
      const m2Ms: number[] = []
      for (let i = 0; i < REPS; i += 1) {
        const t = performance.now()
        correrM2()
        m2Ms.push(performance.now() - t)
      }
      const resumenMs: number[] = []
      for (let i = 0; i < REPS; i += 1) {
        const t = performance.now()
        correrResumen()
        resumenMs.push(performance.now() - t)
      }

      // Conteos de UNA resolución de M2. `indicesTopologicosCreados` es
      // exactamente el número de veces que resolverHidraulicaDeTramo se
      // ejecutó (cada llamada construye un índice), y sirve como evidencia
      // de la redundancia cross-camino/cross-etapa que queda para
      // PERF-SCALE-01B (idealmente ≈ tramos, hoy ~5× eso).
      activarInstrumentacionTopologica()
      reiniciarInstrumentacionTopologica()
      const estado = correrM2()
      const topo = leerInstrumentacionTopologica()
      desactivarInstrumentacionTopologica()

      const hitsHidraulica = topo.solicitudesHidraulicaDeTramo - topo.calculosHidraulicaDeTramo
      const hitsDiametro = topo.solicitudesDiametroComercialDeTramo - topo.calculosDiametroComercialDeTramo
      const ratioCalculo = (topo.calculosHidraulicaDeTramo / mag.tramos).toFixed(2)

      console.log(
        [
          `\n[${nivel}] UF=${mag.unidadesFuncionales} locales=${mag.locales} artefactos=${mag.artefactos}`,
          `     nodos=${mag.nodos} tramos=${mag.tramos} terminales=${mag.terminales}  M2=${estado.estado}`,
          `     resolverEstadoModulo2   mediana ${mediana(m2Ms).toFixed(1)} ms   (min ${Math.min(...m2Ms).toFixed(1)}, max ${Math.max(...m2Ms).toFixed(1)})`,
          `     resolverResumenDeProyecto mediana ${mediana(resumenMs).toFixed(1)} ms`,
          `     índices topológicos construidos:        ${topo.indicesTopologicosCreados}   [distintos tramos: ${mag.tramos}]`,
          `     traversals DFS condición aguas abajo:   ${topo.traversalsCondicionAguasAbajo}`,
          `     hidráulica de tramo   solicitudes ${topo.solicitudesHidraulicaDeTramo}  cálculos ${topo.calculosHidraulicaDeTramo}  hits ${hitsHidraulica}  [cálculos/tramo ${ratioCalculo}]`,
          `     diámetro comercial    solicitudes ${topo.solicitudesDiametroComercialDeTramo}  cálculos ${topo.calculosDiametroComercialDeTramo}  hits ${hitsDiametro}`,
        ].join('\n'),
      )
    }
    console.log('')
  })
})
