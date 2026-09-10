// PERF-SCALE-01A -- regresión ESTRUCTURAL de escala del motor.
//
// NO mide milisegundos (brief §8: nada de `expect(duration < N)` flaky en
// CI). Afirma sobre CANTIDADES observables vía la instrumentación
// topológica (inerte fuera de estos tests): que una resolución de
// verificación de M2 construye índices topológicos y hace traversals DFS de
// condición aguas abajo en cantidad que crece con los TRAMOS y NO con
// artefactos × red.
//
// El hotspot de PERF-SCALE-01A era `determinarCondicionHidraulicaDeCaudal`
// llamado una vez por cada par (Tramo, artefacto) -- reconstruyendo índice
// + DFS cada vez. Si alguien revierte a ese patrón, la cantidad de índices
// construidos salta de ~5·tramos a ~artefactos·tramos (dos órdenes de
// magnitud) y estas aserciones fallan.
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

  it('índices y traversals crecen con los tramos, NO con artefactos × red', () => {
    const { magnitudes, contadores } = medirResolucionDeModulo2({ cantidadUf: 14, localesPorUf: 3 })

    // Un traversal batch por índice construido (resolverHidraulicaDeTramo
    // construye exactamente uno y hace exactamente un batch).
    expect(contadores.traversalsCondicionAguasAbajo).toBe(contadores.indicesTopologicosCreados)

    // Cota dura: la cantidad de índices por resolución es un pequeño
    // múltiplo de los tramos (reentradas por etapa del pipeline y por
    // camino de terminal), NUNCA proporcional a (artefactos aguas abajo) ×
    // tramos. Medido ~5·tramos. El patrón viejo (un índice por cada par
    // Tramo×artefacto) daría del orden de terminales·tramos -- decenas de
    // miles -- y reventaría esta cota con amplísimo margen.
    expect(contadores.indicesTopologicosCreados).toBeGreaterThan(0)
    expect(contadores.indicesTopologicosCreados).toBeLessThan(magnitudes.tramos * 30)
    expect(contadores.indicesTopologicosCreados).toBeLessThan((magnitudes.terminales * magnitudes.tramos) / 10)
  })

  it('el ratio índices/tramo NO crece al escalar (S → M): es una constante del pipeline', () => {
    const chico = medirResolucionDeModulo2({ cantidadUf: 2, localesPorUf: 2 })
    const grande = medirResolucionDeModulo2({ cantidadUf: 20, localesPorUf: 3 })

    const ratioChico = chico.contadores.indicesTopologicosCreados / chico.magnitudes.tramos
    const ratioGrande = grande.contadores.indicesTopologicosCreados / grande.magnitudes.tramos

    // Si el costo fuera superlineal en el tamaño de la red, este ratio
    // crecería con la escala. Debe mantenerse ~constante (margen x1.6).
    expect(ratioGrande).toBeLessThan(ratioChico * 1.6)
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
})
