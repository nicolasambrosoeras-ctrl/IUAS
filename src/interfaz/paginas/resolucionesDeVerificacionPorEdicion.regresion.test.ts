// PERF-SCALE-01B/01C §17 -- cuántas resoluciones COMPLETAS del árbol de
// presión de M2 dispara UNA edición conceptual (una tecla en "Pelo de agua
// mínimo", un cambio de dato de tanque).
//
// El entorno de test es `node` (sin jsdom): no se renderiza el árbol React.
// En su lugar este test reproduce EXACTAMENTE las llamadas de nivel React
// que hace un re-render de `MotorDemandaPantalla` con la app en la
// disposición one-page real (todos los paneles montados a la vez).
//
// HISTORIA (evidencia que abrió PERF-SCALE-01C, ver D-δ.98/PENDIENTES):
// antes de 01C, el sidebar (resolverResumenDeProyecto) y el panel de
// Verificación (PanelDePresionDeModulo2) resolvían M2 cada uno por su
// cuenta -- 2× resolverEstadoModulo2 -- y el panel además reconstruía un
// TERCER recorrido completo del árbol de presión (bucle `candidatos`) para
// obtener datos que resolverEstadoModulo2 ya había calculado. Resultado:
// una tecla ≈ 3 recorridos completos del árbol de presión, ninguno
// compartido (ningún componente usaba `useMemo`).
//
// DESPUÉS de 01C: `resolverResolucionDeModulo2` es el punto único de
// resolución; `MotorDemandaPantalla` lo memoiza por identidad de Proyecto
// (useMemo) y lo comparte entre sidebar y panel. El panel deriva
// `candidatos` de `estadoModulo2.candidatos` (ya calculado) en vez de
// recorrer el árbol de presión una vez más. Resultado esperado: UNA sola
// resolverEstadoModulo2 por edición, cero recorridos de presión extra.
import { describe, it, expect } from 'vitest'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import {
  activarInstrumentacionTopologica,
  desactivarInstrumentacionTopologica,
  leerInstrumentacionTopologica,
  reiniciarInstrumentacionTopologica,
} from '../../motor/tuberias/topologia/instrumentacionTopologica'
import { generarProyectoDeEscala } from '../../pruebas/escala/generarProyectoDeEscala'
import { resolverResolucionDeModulo2 } from './resolverResolucionDeModulo2'
import { resolverResumenDeProyecto } from './resolverResumenDeProyecto'
import { duplicarUnidadFuncionalEnProyecto } from './duplicarUnidadFuncional'

// Reproduce, función por función, exactamente lo que hace un re-render de
// MotorDemandaPantalla con el Proyecto dado: UNA resolución compartida
// (equivalente al useMemo), consumida por el sidebar y por el panel de
// Verificación (que ya no vuelve a recorrer el árbol de presión: lee
// `estadoModulo2.candidatos`, como hace PanelDePresionDeModulo2.tsx).
function medirUnReRender(cantidadUf: number, localesPorUf: number) {
  const proyecto = generarProyectoDeEscala({ cantidadUf, localesPorUf })

  activarInstrumentacionTopologica()
  reiniciarInstrumentacionTopologica()

  // Equivalente al `useMemo(() => resolverResolucionDeModulo2(...), [proyecto])`
  // de MotorDemandaPantalla -- UNA sola vez por Proyecto.
  const resolucionM2 = resolverResolucionDeModulo2(proyecto, catalogoArtefactos, coeficientesMayoracion)

  // (1) sidebar: reutiliza estadoModulo2, no vuelve a resolver M2.
  resolverResumenDeProyecto(proyecto, catalogoArtefactos, coeficientesMayoracion, resolucionM2.estadoModulo2)

  // (2) PanelDePresionDeModulo2: reutiliza entradas + estadoModulo2;
  // candidatos sale de estadoModulo2.candidatos (salvo 'error' estructural,
  // que no aplica a este fixture -- ver comentario de archivo del panel).
  const candidatos =
    resolucionM2.estadoModulo2.estado === 'error' ? [] : resolucionM2.estadoModulo2.candidatos

  const contadores = leerInstrumentacionTopologica()
  desactivarInstrumentacionTopologica()
  return { contadores, candidatos }
}

describe('PERF-SCALE-01C §17 — resoluciones completas por edición', () => {
  it('un re-render con la app one-page resuelve M2 UNA sola vez (sidebar + panel comparten la resolución)', () => {
    const { contadores } = medirUnReRender(14, 3)
    expect(contadores.resolucionesModulo2).toBe(1)
  })

  it('el panel ya NO recorre el árbol de presión una vez más: candidatos sale de estadoModulo2, sin cálculo adicional', () => {
    const { contadores, candidatos } = medirUnReRender(14, 3)
    // 393 tramos distintos: una única resolución con el memo de 01B hace
    // ~393 cálculos hidráulicos reales -- ya no ~3×393 como antes de 01C.
    expect(contadores.indicesTopologicosCreados).toBeLessThanOrEqual(393)
    expect(contadores.calculosDiametroComercialDeTramo).toBeLessThanOrEqual(393)
    // 294 terminales: candidatos trae exactamente uno por terminal, tomado
    // del resultado que resolverEstadoModulo2 ya calculó.
    expect(candidatos).toHaveLength(294)
  })

  it('proyecto pequeño: 1 resolución, sin infraestructura pesada', () => {
    const { contadores } = medirUnReRender(1, 2)
    expect(contadores.resolucionesModulo2).toBe(1)
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
    // PERF-SCALE-01D: `indicesTopologicosCreados` dejó de ser exclusivo de
    // hidráulica -- `obtenerArtefactosAguasAbajo` (usado acá por
    // `redesObjetivoParaClon` para determinar conectividad física de cada
    // Artefacto clonado, sin ningún cálculo hidráulico) ahora comparte el
    // mismo IndiceTopologico/contador que resolverHidraulicaDeTramo en vez
    // de reconstruir uno inline sin instrumentar. El invariante real de
    // este test -- cero hidráulica -- ya lo cubren las dos aserciones de
    // arriba (solicitudes en 0); este índice sí crece con la cantidad de
    // Artefactos clonados (una llamada a obtenerArtefactosAguasAbajo por
    // Artefacto), sin ningún contexto compartido que threadear acá (la
    // duplicación no es una resolución de M2).
    expect(contadores.indicesTopologicosCreados).toBeGreaterThan(0)

    // Y efectivamente construyó la UF copia completa (un nivel más de todo).
    expect(conCopia.unidadesFuncionales.length).toBe(base.unidadesFuncionales.length + 1)
    const localesDeUf = (uf: (typeof base.unidadesFuncionales)[number]) =>
      uf.niveles.reduce((s, n) => s + n.locales.length, 0)
    const localesBase = base.unidadesFuncionales.reduce((s, uf) => s + localesDeUf(uf), 0)
    const localesCopia = conCopia.unidadesFuncionales.reduce((s, uf) => s + localesDeUf(uf), 0)
    expect(localesCopia).toBe(localesBase + localesDeUf(base.unidadesFuncionales[0]!))
  })

  it('el re-render posterior a duplicar tiene el MISMO fan-out (ya optimizado) que cualquier tecla: 1× resolverEstadoModulo2', () => {
    const base = generarProyectoDeEscala({ cantidadUf: 13, localesPorUf: 3 })
    const conCopia = duplicarUnidadFuncionalEnProyecto(base, base.unidadesFuncionales[0]!.id)

    activarInstrumentacionTopologica()
    reiniciarInstrumentacionTopologica()
    resolverResolucionDeModulo2(conCopia, catalogoArtefactos, coeficientesMayoracion)
    const contadores = leerInstrumentacionTopologica()
    desactivarInstrumentacionTopologica()

    expect(contadores.resolucionesModulo2).toBe(1)
  })
})
