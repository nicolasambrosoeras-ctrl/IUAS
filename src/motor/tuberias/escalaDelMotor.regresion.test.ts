// PERF-SCALE-01A/01D -- regresión ESTRUCTURAL de escala del motor.
//
// NO mide milisegundos (brief §8: nada de `expect(duration < N)` flaky en
// CI). Afirma sobre CANTIDADES observables vía la instrumentación
// topológica (inerte fuera de estos tests): que una resolución de
// verificación de M2 hace traversals DFS de condición aguas abajo en
// cantidad que crece con los TRAMOS y NO con artefactos × red, y que el
// IndiceTopologico y los tramos representativos de Local+Red (granularidad
// 'simplificada') se construyen UNA sola vez por resolución, sin importar
// cuántos terminales tenga el Proyecto.
//
// El hotspot de PERF-SCALE-01A era `determinarCondicionHidraulicaDeCaudal`
// llamado una vez por cada par (Tramo, artefacto) -- reconstruyendo índice
// + DFS cada vez. El de PERF-SCALE-01D era el IndiceTopologico (reconstruido
// una vez POR TRAMO calculado) y, en 'simplificada',
// identificarTramosRepresentativosDeLocales (reconstruido una vez POR
// TERMINAL, internamente O(tramos²)). Si alguien revierte cualquiera de los
// dos patrones, estas aserciones fallan.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import { catalogoSistemasDeTuberia } from './sistemaDeTuberia'
import { catalogoMaterialesTuberia } from './materialTuberia'
import { resolverEstadoModulo2 } from '../modulo2/resolverEstadoModulo2'
import { resolverEntradasDeVerificacion } from '../../interfaz/paginas/resolverEntradasDeVerificacion'
import {
  activarInstrumentacionTopologica,
  desactivarInstrumentacionTopologica,
  leerInstrumentacionTopologica,
} from './topologia/instrumentacionTopologica'
import * as clasificadorPuntual from './caudal/determinarCondicionHidraulicaDeCaudal'
import {
  generarProyectoDeEscala,
  contarMagnitudesDeEscala,
  type FormaDeEscala,
} from '../../pruebas/escala/generarProyectoDeEscala'

function medirResolucionDeModulo2(forma: FormaDeEscala) {
  const proyecto = generarProyectoDeEscala(forma)
  const magnitudes = contarMagnitudesDeEscala(proyecto)
  const entradas = resolverEntradasDeVerificacion(proyecto, catalogoArtefactos, coeficientesMayoracion)

  activarInstrumentacionTopologica()
  const estado = resolverEstadoModulo2(
    entradas.proyectoParaVerificacion,
    entradas.presionDisponible_mca,
    entradas.hfMedidorDeTerminal,
    catalogoArtefactos,
    catalogoSistemasDeTuberia,
    catalogoMaterialesTuberia,
  )
  const contadores = leerInstrumentacionTopologica()
  desactivarInstrumentacionTopologica()
  return { magnitudes, estado, contadores }
}

afterEach(() => {
  vi.restoreAllMocks()
  desactivarInstrumentacionTopologica()
})

describe('PERF-SCALE-01A — regresión estructural de escala', () => {
  it('el fixture de escala resuelve M2 "completo" (precondición del resto)', () => {
    const { estado, magnitudes } = medirResolucionDeModulo2({ cantidadUf: 14, localesPorUf: 3 })
    expect(estado.estado).toBe('completo')
    expect(magnitudes.terminales).toBeGreaterThan(200)
  })

  it('un traversal aguas abajo por cálculo hidráulico real, NO por artefactos × red', () => {
    const { magnitudes, contadores } = medirResolucionDeModulo2({ cantidadUf: 14, localesPorUf: 3 })

    // Un traversal batch por cálculo hidráulico real (resolverHidraulicaDeTramo
    // hace exactamente un batch por Tramo distinto calculado).
    expect(contadores.traversalsCondicionAguasAbajo).toBe(contadores.calculosHidraulicaDeTramo)
    expect(contadores.calculosHidraulicaDeTramo).toBeGreaterThan(0)
    expect(contadores.calculosHidraulicaDeTramo).toBeLessThan((magnitudes.terminales * magnitudes.tramos) / 10)
  })

  // PERF-SCALE-01D: el IndiceTopologico (nodosPorId/tramosPorId/
  // tramosSalientesPorNodo) pasó de reconstruirse UNA VEZ POR TRAMO distinto
  // calculado (≈tramos veces) a UNA vez por resolución completa, memoizado
  // en ContextoDeCalculoM2 (ver contextoDeCalculoM2.ts). Si alguien vuelve a
  // reconstruirlo por Tramo, esta cota salta de 1 a cientos a escala.
  it('PERF-SCALE-01D · el índice topológico se construye UNA sola vez por resolución, sin importar la escala', () => {
    const chico = medirResolucionDeModulo2({ cantidadUf: 2, localesPorUf: 2 })
    const grande = medirResolucionDeModulo2({ cantidadUf: 20, localesPorUf: 3 })

    expect(chico.contadores.indicesTopologicosCreados).toBe(1)
    expect(grande.contadores.indicesTopologicosCreados).toBe(1)
  })

  // --- PERF-SCALE-01B: el contexto de cálculo local colapsa la redundancia
  // cross-camino / cross-etapa. Las SOLICITUDES de diámetro comercial por
  // Tramo siguen siendo un múltiplo de los tramos (cada etapa del pipeline
  // y cada camino de terminal pide el diámetro de sus Tramos), pero los
  // CÁLCULOS reales -- y con ellos el trabajo caro de resolverHidraulicaDeTramo:
  // índice topológico + DFS aguas abajo -- ya no pueden pasar de uno por
  // Tramo distinto por resolución.
  it('los cálculos hidráulicos reales por Tramo colapsan a ≤ 1 por Tramo distinto (memo local)', () => {
    const { magnitudes, contadores } = medirResolucionDeModulo2({ cantidadUf: 14, localesPorUf: 3 })

    // Clave del memo = tramoId ⇒ como mucho un cálculo real por Tramo distinto.
    expect(contadores.calculosHidraulicaDeTramo).toBeLessThanOrEqual(magnitudes.tramos)
    expect(contadores.calculosDiametroComercialDeTramo).toBeLessThanOrEqual(magnitudes.tramos)

    // Y de hecho casi todos los Tramos participan de algún camino de
    // terminal en el fixture de escala: el cálculo real NO es una fracción
    // pequeña de los tramos (si lo fuera, algo estaría podando de más).
    expect(contadores.calculosHidraulicaDeTramo).toBeGreaterThan(magnitudes.tramos * 0.5)

    // resolverHidraulicaDeTramo sólo se alcanza cuando resolverDiametroComercialDeTramo
    // hace un cálculo real (su memo corta antes en los hits): un cálculo de
    // diámetro ⇔ un cálculo de hidráulica ⇔ un índice ⇔ un traversal batch.
    expect(contadores.solicitudesHidraulicaDeTramo).toBe(contadores.calculosDiametroComercialDeTramo)
    expect(contadores.calculosHidraulicaDeTramo).toBe(contadores.calculosDiametroComercialDeTramo)
    // PERF-SCALE-01D: el índice topológico ya no escala con los cálculos
    // reales -- se construye UNA vez por resolución (ver test dedicado).
    expect(contadores.indicesTopologicosCreados).toBe(1)
    expect(contadores.traversalsCondicionAguasAbajo).toBe(contadores.calculosHidraulicaDeTramo)

    // El memo está absorbiendo redundancia real: hay MUCHAS más solicitudes
    // de diámetro que cálculos (antes de 01B eran iguales: ~2058 = ~2058,
    // ~5,2·tramos). Si alguien quita el threading del contexto, solicitudes
    // ≡ cálculos y esta cota se rompe.
    expect(contadores.solicitudesDiametroComercialDeTramo).toBeGreaterThan(
      contadores.calculosDiametroComercialDeTramo * 2,
    )
    const hits = contadores.solicitudesDiametroComercialDeTramo - contadores.calculosDiametroComercialDeTramo
    expect(hits).toBeGreaterThan(0)
  })

  it('una sola resolverEstadoModulo2 cuenta como UNA resolución completa', () => {
    const { contadores } = medirResolucionDeModulo2({ cantidadUf: 6, localesPorUf: 2 })
    expect(contadores.resolucionesModulo2).toBe(1)
  })

  it('la ruta caliente de M2 NO llama al clasificador puntual determinarCondicionHidraulicaDeCaudal', () => {
    const spy = vi.spyOn(clasificadorPuntual, 'determinarCondicionHidraulicaDeCaudal')
    const proyecto = generarProyectoDeEscala({ cantidadUf: 6, localesPorUf: 2 })
    const entradas = resolverEntradasDeVerificacion(proyecto, catalogoArtefactos, coeficientesMayoracion)
    resolverEstadoModulo2(
      entradas.proyectoParaVerificacion,
      entradas.presionDisponible_mca,
      entradas.hfMedidorDeTerminal,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )
    // El pipeline usa el traversal en lote y reutiliza su Map; el wrapper
    // puntual (que reconstruye un índice por llamada) no debe aparecer.
    expect(spy).not.toHaveBeenCalled()
  })

  // PERF-SCALE-01D: con granularidadHidraulica 'simplificada',
  // seleccionarTramosDeAcumulacion pedía identificarTramosRepresentativosDeLocales
  // (internamente O(tramos²): un traversal aguas abajo sin índice por cada
  // Tramo del Proyecto) UNA VEZ POR TERMINAL -- y otra vez más para pérdida
  // localizada -- dando O(terminales·tramos²) por resolución. Ahora se
  // memoiza en ContextoDeCalculoM2 y se construye una sola vez.
  it('PERF-SCALE-01D · en simplificada, los tramos representativos se calculan UNA sola vez por resolución', () => {
    const base = generarProyectoDeEscala({ cantidadUf: 20, localesPorUf: 3 })
    const proyecto = {
      ...base,
      configuracionHidraulica: { ...base.configuracionHidraulica, granularidadHidraulica: 'simplificada' as const },
    }
    const magnitudes = contarMagnitudesDeEscala(proyecto)
    const entradas = resolverEntradasDeVerificacion(proyecto, catalogoArtefactos, coeficientesMayoracion)

    activarInstrumentacionTopologica()
    resolverEstadoModulo2(
      entradas.proyectoParaVerificacion,
      entradas.presionDisponible_mca,
      entradas.hfMedidorDeTerminal,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )
    const contadores = leerInstrumentacionTopologica()
    desactivarInstrumentacionTopologica()

    expect(magnitudes.terminales).toBeGreaterThan(400)
    // Antes de PERF-SCALE-01D esto era ~2·terminales (una vez por pérdida
    // distribuida + una vez por localizada, por cada uno de los 400+
    // terminales) -- ahora es exactamente 1 por resolución.
    expect(contadores.construccionesTramosRepresentativos).toBe(1)
  })
})
