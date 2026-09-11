// PERF-SCALE-01B §17 -- cuántas resoluciones COMPLETAS del árbol de presión
// de M2 dispara UNA edición conceptual (una tecla en "Pelo de agua mínimo",
// un cambio de dato de tanque).
//
// El entorno de test es `node` (sin jsdom): no se renderiza el árbol React.
// En su lugar este test reproduce EXACTAMENTE las llamadas a resolvers de
// escala que hace un re-render de `MotorDemandaPantalla` con la app en la
// disposición one-page real (todos los paneles montados a la vez):
//
//   1. sidebar  -> resolverResumenDeProyecto        => 1× resolverEstadoModulo2
//   2. Verificación (PanelDePresionDeModulo2):
//        resolverEntradasDeVerificacion             (M3)
//        resolverEstadoModulo2                       => 1× resolverEstadoModulo2
//        nodosTerminales.map(resolverPresionResidualDeCamino)  <- SIN contexto
//                                                    => 1 árbol de presión completo más
//
// Ninguno de esos componentes usa `useMemo` (verificado al escribir este
// test): el contexto de cálculo de 01B vive DENTRO de cada resolverEstadoModulo2
// pero NO se comparte entre estas llamadas de nivel React. Resultado: una
// tecla = ~3 recorridos completos del árbol de presión + M3/M4.
//
// Este test NO es un criterio de cierre de 01B: es la evidencia que decide
// si hace falta PERF-SCALE-01C (orquestación React). Cuando 01C memoice /
// comparta trabajo entre paneles, estos números bajan y el test se actualiza.
import { describe, it, expect } from 'vitest'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import { catalogoSistemasDeTuberia } from '../../motor/tuberias/sistemaDeTuberia'
import { catalogoMaterialesTuberia } from '../../motor/tuberias/materialTuberia'
import { resolverEstadoModulo2 } from '../../motor/modulo2/resolverEstadoModulo2'
import { resolverPresionResidualDeCamino } from '../../motor/tuberias/presion/resolverPresionResidualDeCamino'
import {
  activarInstrumentacionTopologica,
  desactivarInstrumentacionTopologica,
  leerInstrumentacionTopologica,
  reiniciarInstrumentacionTopologica,
} from '../../motor/tuberias/topologia/instrumentacionTopologica'
import { generarProyectoDeEscala } from '../../pruebas/escala/generarProyectoDeEscala'
import { resolverEntradasDeVerificacion } from './resolverEntradasDeVerificacion'
import { resolverResumenDeProyecto } from './resolverResumenDeProyecto'
import { duplicarUnidadFuncionalEnProyecto } from './duplicarUnidadFuncional'

function medirUnReRender(cantidadUf: number, localesPorUf: number) {
  const proyecto = generarProyectoDeEscala({ cantidadUf, localesPorUf })

  activarInstrumentacionTopologica()
  reiniciarInstrumentacionTopologica()

  // (1) sidebar
  resolverResumenDeProyecto(proyecto, catalogoArtefactos, coeficientesMayoracion)

  // (2) PanelDePresionDeModulo2
  const entradas = resolverEntradasDeVerificacion(proyecto, catalogoArtefactos, coeficientesMayoracion)
  const pv = entradas.proyectoParaVerificacion
  resolverEstadoModulo2(
    pv,
    entradas.presionDisponible_mca,
    entradas.hfMedidorDeTerminal,
    catalogoArtefactos,
    catalogoSistemasDeTuberia,
    catalogoMaterialesTuberia,
  )
  const nodosTerminales = (pv.redHidraulica?.nodos ?? []).filter((n) => n.referencia?.tipo === 'artefacto')
  for (const nodo of nodosTerminales) {
    // Igual que el componente: bucle suelto, SIN contexto compartido.
    resolverPresionResidualDeCamino(
      pv,
      nodo.id,
      entradas.presionDisponible_mca!,
      entradas.hfMedidorDeTerminal(nodo.id),
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )
  }

  const contadores = leerInstrumentacionTopologica()
  desactivarInstrumentacionTopologica()
  return contadores
}

describe('PERF-SCALE-01B §17 — resoluciones completas por edición', () => {
  it('un re-render con la app one-page resuelve M2 dos veces vía resolverEstadoModulo2', () => {
    const contadores = medirUnReRender(14, 3)
    // sidebar + PanelDePresionDeModulo2.
    expect(contadores.resolucionesModulo2).toBe(2)
  })

  it('además hay un tercer recorrido completo del árbol de presión sin contexto (bucle `candidatos`)', () => {
    const contadores = medirUnReRender(14, 3)
    // 393 tramos distintos. Con el memo de 01B, UNA resolverEstadoModulo2
    // hace ~393 cálculos hidráulicos reales. Un re-render hace MUCHOS más
    // porque el contexto no cruza los 3 recorridos: 2 resolverEstadoModulo2
    // + 1 bucle `candidatos` sin contexto ⇒ del orden de 3×393 = ~1200
    // índices topológicos construidos. Cota: > 2× lo de una sola resolución.
    expect(contadores.indicesTopologicosCreados).toBeGreaterThan(393 * 2)
    // El bucle `candidatos` sin contexto es el que más pesa: sus solicitudes
    // de diámetro NO se absorben en ningún memo (cada llamada recalcula).
    expect(contadores.calculosDiametroComercialDeTramo).toBeGreaterThan(393 * 2)
  })

  it('proyecto pequeño: 2 resoluciones, sin infraestructura pesada', () => {
    const contadores = medirUnReRender(1, 2)
    expect(contadores.resolucionesModulo2).toBe(2)
  })
})

// PERF-SCALE-01B §17 (adenda) -- "Duplicar unidad funcional" sobre un
// proyecto de escala significativa. Se quiere confirmar que la duplicación
// construye la UF copia COMPLETA y publica UN solo Proyecto final, sin
// resolver estados intermedios (UF creada → Locales → Artefactos).
describe('PERF-SCALE-01B §17 (adenda) — Duplicar unidad funcional', () => {
  it('el build de la duplicación NO resuelve M2 ni hidráulica: sólo construye topología y publica una vez', () => {
    const base = generarProyectoDeEscala({ cantidadUf: 13, localesPorUf: 3 })
    const ufId = base.unidadesFuncionales[0]!.id

    activarInstrumentacionTopologica()
    reiniciarInstrumentacionTopologica()
    const conCopia = duplicarUnidadFuncionalEnProyecto(base, ufId)
    const contadores = leerInstrumentacionTopologica()
    desactivarInstrumentacionTopologica()

    // Cero resoluciones de estado y cero cálculo hidráulico durante el build:
    // no hay estados transitorios por-UF / por-Local / por-Artefacto.
    expect(contadores.resolucionesModulo2).toBe(0)
    expect(contadores.solicitudesHidraulicaDeTramo).toBe(0)
    expect(contadores.solicitudesDiametroComercialDeTramo).toBe(0)
    expect(contadores.indicesTopologicosCreados).toBe(0)

    // Y efectivamente construyó la UF copia completa (un nivel más de todo).
    expect(conCopia.unidadesFuncionales.length).toBe(base.unidadesFuncionales.length + 1)
    const localesBase = base.unidadesFuncionales.reduce((s, uf) => s + uf.locales.length, 0)
    const localesCopia = conCopia.unidadesFuncionales.reduce((s, uf) => s + uf.locales.length, 0)
    expect(localesCopia).toBe(localesBase + base.unidadesFuncionales[0]!.locales.length)
  })

  it('el re-render posterior a duplicar tiene el MISMO fan-out que cualquier tecla: 2× resolverEstadoModulo2', () => {
    const base = generarProyectoDeEscala({ cantidadUf: 13, localesPorUf: 3 })
    const conCopia = duplicarUnidadFuncionalEnProyecto(base, base.unidadesFuncionales[0]!.id)

    activarInstrumentacionTopologica()
    reiniciarInstrumentacionTopologica()
    resolverResumenDeProyecto(conCopia, catalogoArtefactos, coeficientesMayoracion)
    const entradas = resolverEntradasDeVerificacion(conCopia, catalogoArtefactos, coeficientesMayoracion)
    const pv = entradas.proyectoParaVerificacion
    resolverEstadoModulo2(
      pv,
      entradas.presionDisponible_mca,
      entradas.hfMedidorDeTerminal,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )
    const contadores = leerInstrumentacionTopologica()
    desactivarInstrumentacionTopologica()

    expect(contadores.resolucionesModulo2).toBe(2)
  })
})
