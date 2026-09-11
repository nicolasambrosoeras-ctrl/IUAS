// Benchmark LOCAL de escala real 20+ UF (PERF-SCALE-01D).
//
//   npx vitest run --config vitest.perf.config.ts scripts/perf/benchmarkEscalaXXL.perf.ts
//   PERF_UF=8,14,20,21 npx vitest run --config vitest.perf.config.ts scripts/perf/benchmarkEscalaXXL.perf.ts
//
// NO es CI: los tiempos dependen de la máquina (mismo criterio que
// benchmarkMotorDeEscala.perf.ts). Este benchmark es el paso obligatorio de
// PROFILING ANTES DE EDITAR de PERF-SCALE-01D: mide, para cada escala, el
// costo de las 4 acciones diagnósticas reales (Duplicar UF, Agregar
// artefacto, Editar pelo de agua, Editar desnivel) descompuesto por
// resolver (M2/M3/M4/resumen/entradas de verificación), más los contadores
// topológicos que exponen el costo algorítmico sin cronometrar
// (instrumentacionTopologica.ts, extendido en este slice con
// pasosCaminoHaciaOrigen/resolucionesRedDeTerminal).
//
// El proyecto base usa esquema 'tanqueElevado' + modo profesional (a
// diferencia de generarProyectoDeEscala, que fija 'directa'): es la única
// combinación donde "Pelo de agua mínimo" (Nodo.cota_m de la raíz) y
// "desnivel de conexión" son dos datos DISTINTOS y editables por separado
// (ver resolverPeloDeAguaMinimoDeTanque.ts) -- exactamente el caso real
// reportado por el usuario.
import { describe, it } from 'vitest'
import { catalogoArtefactos } from '../../src/normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../src/normativa/eras-2023/coeficientes-mayoracion'
import { catalogoSistemasDeTuberia } from '../../src/motor/tuberias/sistemaDeTuberia'
import { catalogoMaterialesTuberia } from '../../src/motor/tuberias/materialTuberia'
import { resolverEstadoModulo2 } from '../../src/motor/modulo2/resolverEstadoModulo2'
import { resolverEstadoModulo3 } from '../../src/motor/modulo3/resolverEstadoModulo3'
import { resolverEstadoModulo4 } from '../../src/motor/modulo4/resolverEstadoModulo4'
import { resolverResumenDeProyecto } from '../../src/interfaz/paginas/resolverResumenDeProyecto'
import { resolverEntradasDeVerificacion } from '../../src/interfaz/paginas/resolverEntradasDeVerificacion'
import { agruparMotivosDeModulo2 } from '../../src/interfaz/paginas/agruparMotivosDeModulo2'
import { duplicarUnidadFuncionalEnProyecto } from '../../src/interfaz/paginas/duplicarUnidadFuncional'
import {
  activarInstrumentacionTopologica,
  desactivarInstrumentacionTopologica,
  leerInstrumentacionTopologica,
  reiniciarInstrumentacionTopologica,
  type ContadoresTopologicos,
} from '../../src/motor/tuberias/topologia/instrumentacionTopologica'
import { generarProyectoDeEscala, contarMagnitudesDeEscala } from '../../src/pruebas/escala/generarProyectoDeEscala'
import type { Proyecto, UnidadFuncional } from '../../src/modelo/proyecto'
import type { Nodo, Tramo } from '../../src/modelo/redHidraulica'

const NIVELES_UF = (process.env.PERF_UF ?? '8,14,20,21')
  .split(',')
  .map((s) => Number(s.trim()))
  .filter((n) => Number.isFinite(n) && n > 0)
const LOCALES_POR_UF = Number(process.env.PERF_LOCALES ?? 3)
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

// Variante 'tanqueElevado' + profesional del fixture de escala: mismo
// generador que PERF-SCALE-01A/B/C, con el esquema de abastecimiento y los
// parámetros de conexión que hacen falta para que "Pelo de agua mínimo"
// (cota_m de la raíz) y "desnivel de conexión" sean datos distintos y
// editables (CRIT-A39). NO se toca generarProyectoDeEscala.ts: esta es una
// composición local, exclusiva de este benchmark.
function generarProyectoXXL(cantidadUf: number): Proyecto {
  const base = generarProyectoDeEscala({ cantidadUf, localesPorUf: LOCALES_POR_UF })
  const red = base.redHidraulica!
  const nodos = red.nodos.map((nodo): Nodo => (nodo.id === 'n-general' ? { ...nodo, cota_m: 12 } : nodo))
  return {
    ...base,
    parametros: {
      ...base.parametros,
      diametroNominalConexion_m: 0.025,
      desnivelConexion_m: 5,
    },
    redHidraulica: { ...red, nodos },
    configuracionAbastecimiento: {
      esquema: 'tanqueElevado',
      periodoConsumoMaximo_h: 2,
    },
  }
}

// Editar "Pelo de agua mínimo" (modo profesional): la cota manual de la
// raíz del camino (`Nodo.cota_m` de 'n-general'). NO toca nada más -- ni
// desnivelConexion_m, ni topología, ni ningún artefacto.
function conPeloDeAguaEditado(proyecto: Proyecto, cota_m: number): Proyecto {
  const red = proyecto.redHidraulica!
  const nodos = red.nodos.map((nodo): Nodo => (nodo.id === 'n-general' ? { ...nodo, cota_m } : nodo))
  return { ...proyecto, redHidraulica: { ...red, nodos } }
}

// Editar el desnivel de conexión (M4-D2): dato de `parametros`, ajeno a la
// topología y (en modo profesional) ajeno al pelo de agua.
function conDesnivelEditado(proyecto: Proyecto, desnivelConexion_m: number): Proyecto {
  return { ...proyecto, parametros: { ...proyecto.parametros, desnivelConexion_m } }
}

// Agregar UN artefacto (mixto AF+AC) al último Local de la última UF,
// replicando exactamente la forma de terminal que produce
// generarProyectoDeEscala para un artefacto mixto -- proxy fiel del efecto
// estructural de "+ Agregar artefacto" (un Artefacto más + su terminal AF
// y su terminal AC conectados), sin arrastrar el flujo de UI de dos pasos
// (selector + confirmar) que vive inline en MotorDemandaPantalla.tsx.
function conArtefactoAgregado(proyecto: Proyecto): Proyecto {
  const ufs = proyecto.unidadesFuncionales
  const ultimaUf = ufs[ufs.length - 1]!
  const ultimoLocal = ultimaUf.locales[ultimaUf.locales.length - 1]!
  const u = ufs.length
  const l = ultimaUf.locales.length
  const k = ultimoLocal.artefactos.length
  const artefactoId = `art-${u}-${l}-nuevo-${k}`
  const nodoAfBranchId = `n-af-br-${u}-${l}`
  const nodoAcBranchId = `n-ac-br-${u}-${l}`
  const nodoAfTerminalId = `n-af-${u}-${l}-nuevo-${k}`
  const nodoAcTerminalId = `n-ac-${u}-${l}-nuevo-${k}`
  const referencia = { tipo: 'artefacto' as const, unidadFuncionalId: ultimaUf.id, localId: ultimoLocal.id, artefactoId }

  const unidadesFuncionales: readonly UnidadFuncional[] = ufs.map((uf) =>
    uf.id !== ultimaUf.id
      ? uf
      : {
          ...uf,
          locales: uf.locales.map((local) =>
            local.id !== ultimoLocal.id
              ? local
              : {
                  ...local,
                  artefactos: [
                    ...local.artefactos,
                    { id: artefactoId, artefactoId: 'lavatorio', cantidad: 1, origen: 'usuario' as const },
                  ],
                },
          ),
        },
  )

  const red = proyecto.redHidraulica!
  const nuevosNodos: Nodo[] = [
    { id: nodoAfTerminalId, referencia },
    { id: nodoAcTerminalId, referencia },
  ]
  const nuevosTramos: Tramo[] = [
    { id: `t-af-${nodoAfTerminalId}`, nodoOrigenId: nodoAfBranchId, nodoDestinoId: nodoAfTerminalId, red: 'AF', longitud_m: 2 },
    { id: `t-ac-${nodoAcTerminalId}`, nodoOrigenId: nodoAcBranchId, nodoDestinoId: nodoAcTerminalId, red: 'AC', longitud_m: 2 },
  ]

  return {
    ...proyecto,
    unidadesFuncionales,
    redHidraulica: { ...red, nodos: [...red.nodos, ...nuevosNodos], tramos: [...red.tramos, ...nuevosTramos] },
  }
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

function correrPantallaCompleta(proyecto: Proyecto) {
  // Replica exactamente lo que hace MotorDemandaPantalla tras PERF-SCALE-01C:
  // UNA resolución de M2 compartida entre sidebar (resumen) y panel.
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
  // M3 y M4 tal como hoy: UNA vez más cada uno dentro de su panel propio
  // (PanelDeMedidoresDeModulo3.tsx / PanelDeModulo4.tsx), no compartidos
  // con el que ya corrió dentro de resumen/entradas -- ver hallazgo de
  // profiling en el handoff.
  const estadoModulo3Panel = resolverEstadoModulo3(proyecto, catalogoArtefactos, coeficientesMayoracion)
  const estadoModulo4Panel = resolverEstadoModulo4({ proyecto, catalogoArtefactos, coeficientesMayoracion })
  return { estadoModulo2, resumen, estadoModulo3Panel, estadoModulo4Panel }
}

function contadoresDeUnaResolucion(proyecto: Proyecto): ContadoresTopologicos {
  activarInstrumentacionTopologica()
  reiniciarInstrumentacionTopologica()
  correrM2(proyecto)
  const c = leerInstrumentacionTopologica()
  desactivarInstrumentacionTopologica()
  return c
}

describe('benchmark escala real 20+ UF (PERF-SCALE-01D)', () => {
  it(`UF=${NIVELES_UF.join(',')} localesPorUf=${LOCALES_POR_UF} · ${REPS} reps`, () => {
    console.log(`\n=== PERF-SCALE-01D · benchmark escala XXL · reps=${REPS} ===`)
    for (const cantidadUf of NIVELES_UF) {
      const proyecto = generarProyectoXXL(cantidadUf)
      const mag = contarMagnitudesDeEscala(proyecto)

      console.log(
        `\n[UF=${cantidadUf}] locales=${mag.locales} artefactos=${mag.artefactos} nodos=${mag.nodos} tramos=${mag.tramos} terminales=${mag.terminales}`,
      )

      // --- 1. Resolvers individuales sobre el proyecto base (sin editar) ---
      const msM2 = medirMs(() => correrM2(proyecto))
      const msM3 = medirMs(() => resolverEstadoModulo3(proyecto, catalogoArtefactos, coeficientesMayoracion))
      const msM4 = medirMs(() => resolverEstadoModulo4({ proyecto, catalogoArtefactos, coeficientesMayoracion }))
      const msEntradas = medirMs(() => resolverEntradasDeVerificacion(proyecto, catalogoArtefactos, coeficientesMayoracion))
      const msPantalla = medirMs(() => correrPantallaCompleta(proyecto))

      const estadoM2 = correrM2(proyecto)
      const motivos = estadoM2.estado === 'incompleto' ? estadoM2.motivos : []
      const msMotivos = medirMs(() => agruparMotivosDeModulo2(motivos, proyecto.unidadesFuncionales))

      const topo = contadoresDeUnaResolucion(proyecto)

      console.log(
        [
          `     resolverEstadoModulo2 (solo)         ${fmt(msM2)}   estado=${estadoM2.estado}${
            estadoM2.estado === 'incompleto' ? ` (${estadoM2.motivos.length} motivos)` : ''
          }`,
          `     resolverEstadoModulo3 (solo)         ${fmt(msM3)}`,
          `     resolverEstadoModulo4 (solo)         ${fmt(msM4)}`,
          `     resolverEntradasDeVerificacion       ${fmt(msEntradas)}`,
          `     agruparMotivosDeModulo2 (${String(motivos.length).padStart(3)} motivos) ${fmt(msMotivos)}`,
          `     PANTALLA COMPLETA (M2+resumen+M3+M4) ${fmt(msPantalla)}`,
          `     pasos obtenerCaminoHaciaOrigen:       ${topo.pasosCaminoHaciaOrigen}   [terminales: ${mag.terminales}, tramos: ${mag.tramos}]`,
          `     resoluciones resolverRedDeTerminal:   ${topo.resolucionesRedDeTerminal}`,
          `     construcciones tramos representativos: ${topo.construccionesTramosRepresentativos}`,
          `     índices topológicos construidos:      ${topo.indicesTopologicosCreados}`,
          `     hidráulica de tramo   solicitudes ${topo.solicitudesHidraulicaDeTramo}  cálculos ${topo.calculosHidraulicaDeTramo}`,
          `     diámetro comercial    solicitudes ${topo.solicitudesDiametroComercialDeTramo}  cálculos ${topo.calculosDiametroComercialDeTramo}`,
          `     tiempo por etapa (ms, sumado sobre TODOS los terminales de 1 resolución):`,
          ...Object.entries(topo.tiemposMsPorEtapa)
            .sort((a, b) => b[1] - a[1])
            .map(([etapa, ms]) => `       - ${etapa.padEnd(20)} ${ms.toFixed(1)} ms`),
        ].join('\n'),
      )

      // --- 2. Acciones diagnósticas: costo de LA PANTALLA COMPLETA sobre el
      // proyecto resultante de cada acción (lo que el usuario percibe tras
      // soltar la tecla / hacer click) ---
      const ultimaUfId = proyecto.unidadesFuncionales[proyecto.unidadesFuncionales.length - 1]!.id
      const proyectoDuplicado = duplicarUnidadFuncionalEnProyecto(proyecto, ultimaUfId)
      const proyectoConArtefacto = conArtefactoAgregado(proyecto)
      const proyectoPeloDeAgua = conPeloDeAguaEditado(proyecto, 12.37)
      const proyectoDesnivel = conDesnivelEditado(proyecto, 6.5)

      const msDuplicarMutacion = medirMs(() => duplicarUnidadFuncionalEnProyecto(proyecto, ultimaUfId))
      const msDuplicarPantalla = medirMs(() => correrPantallaCompleta(proyectoDuplicado))
      const msArtefactoPantalla = medirMs(() => correrPantallaCompleta(proyectoConArtefacto))
      const msPeloDeAguaPantalla = medirMs(() => correrPantallaCompleta(proyectoPeloDeAgua))
      const msDesnivelPantalla = medirMs(() => correrPantallaCompleta(proyectoDesnivel))

      // Evidencia de independencia estructural (§9 del brief): comparar
      // Q/Qc/DN/V/hf estructural antes y después de editar SOLO pelo de
      // agua o SOLO desnivel -- deben ser byte a byte idénticos.
      const candidatosAntes = JSON.stringify(estadoM2.candidatos.map((c) => sinPresion(c)))
      const estadoM2TrasPelo = correrM2(proyectoPeloDeAgua)
      const estadoM2TrasDesnivel = correrM2(proyectoDesnivel)
      const candidatosTrasPelo = JSON.stringify(estadoM2TrasPelo.estado === 'incompleto' || estadoM2TrasPelo.estado === 'completo' || estadoM2TrasPelo.estado === 'error' ? (('candidatos' in estadoM2TrasPelo) ? estadoM2TrasPelo.candidatos.map((c) => sinPresion(c)) : []) : [])
      const candidatosTrasDesnivel = JSON.stringify(estadoM2TrasDesnivel.estado === 'incompleto' || estadoM2TrasDesnivel.estado === 'completo' || estadoM2TrasDesnivel.estado === 'error' ? (('candidatos' in estadoM2TrasDesnivel) ? estadoM2TrasDesnivel.candidatos.map((c) => sinPresion(c)) : []) : [])

      console.log(
        [
          `     --- acciones diagnósticas (costo de PANTALLA COMPLETA tras la acción) ---`,
          `     Duplicar UF (mutación pura)           ${fmt(msDuplicarMutacion)}`,
          `     Duplicar UF (mutación + pantalla)      ${fmt(msDuplicarPantalla)}`,
          `     Agregar artefacto (+ pantalla)         ${fmt(msArtefactoPantalla)}`,
          `     Editar pelo de agua (+ pantalla)       ${fmt(msPeloDeAguaPantalla)}`,
          `     Editar desnivel (+ pantalla)           ${fmt(msDesnivelPantalla)}`,
          `     estructura Qc/DN/V/hf idéntica tras pelo de agua:  ${candidatosAntes === candidatosTrasPelo}`,
          `     estructura Qc/DN/V/hf idéntica tras desnivel:      ${candidatosAntes === candidatosTrasDesnivel}`,
        ].join('\n'),
      )
    }
    console.log('')
  })
})

// Extrae, de un CandidatoTerminal, únicamente las magnitudes ESTRUCTURALES
// (independientes de la presión disponible / pelo de agua) para comparar
// equivalencia estructural antes/después de una edición de presión. Usa
// duck-typing deliberado: candidato.resultado trae distintas formas según
// `tipo`, y sólo nos interesan los campos de traza que existen en todas las
// variantes con hidráulica resuelta (hfDistribuida/hfLocalizada/desnivel no
// cuentan como "estructural" -- desnivel SÍ depende de la cota de la raíz,
// así que queda deliberadamente afuera de esta comparación).
function sinPresion(candidato: { readonly nodoId: string; readonly resultado: unknown }): unknown {
  const r = candidato.resultado as Record<string, unknown>
  return {
    nodoId: candidato.nodoId,
    tipo: r['tipo'],
    hfDistribuidaPorTramo: r['hfDistribuidaPorTramo'],
    hfLocalizada: r['hfLocalizada'],
  }
}
