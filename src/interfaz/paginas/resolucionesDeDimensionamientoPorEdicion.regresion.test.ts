// PERF-SCALE-01C -- redundancia intra-fila del panel de Tuberías
// (ResultadoHidraulicoDeTramo): cada fila de dimensionamiento pedía la
// hidráulica/diámetro comercial de SU MISMO Tramo hasta 3 veces sin
// compartir nada entre sí:
//   resolverFilaDeDimensionamiento
//     -> resolverResultadoDeTramoParaUi -> resolverPerdidaDistribuidaDeTramo (1)
//     -> resolverPerdidaDistribuidaDeTramo directo                            (2)
//   resolverControlDeDnDeTramo -> resolverDiametroComercialDeTramo            (3)
// (las 3 tablas -- Distribución general / secundaria / por UF -- cubren
// TRAMOS DISJUNTOS entre sí: no hay redundancia CRUZADA entre tablas, sólo
// intra-fila, dentro de la misma tabla).
//
// Este test reproduce, función por función, lo que hace un render de
// ResultadoHidraulicoDeTramo.tsx sobre el fixture de escala: con el
// ContextoDeCalculoM2 (01B) compartido por TODO el render (igual que el
// `useMemo` del componente), cada Tramo distinto debe resolver su
// hidráulica/diámetro UNA sola vez, sin importar cuántas de las 3 llamadas
// por fila lo pidan.
import { describe, it, expect } from 'vitest'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import {
  activarInstrumentacionTopologica,
  desactivarInstrumentacionTopologica,
  leerInstrumentacionTopologica,
  reiniciarInstrumentacionTopologica,
} from '../../motor/tuberias/topologia/instrumentacionTopologica'
import { crearContextoDeCalculoM2, type ContextoDeCalculoM2 } from '../../motor/tuberias/contextoDeCalculoM2'
import { generarProyectoDeEscala, contarMagnitudesDeEscala } from '../../pruebas/escala/generarProyectoDeEscala'
import type { Proyecto } from '../../modelo/proyecto'
import {
  identificarFilasDistribucionGeneral,
  identificarFilasDistribucionSecundaria,
  identificarFilasPrincipalesDeLocales,
} from './identificarFilasDeModulo2'
import { resolverFilaDeDimensionamiento } from './resolverFilaDeDimensionamiento'
import { resolverControlDeDnDeTramo } from './resolverControlDeDnDeTramo'

// Reproduce, en orden, exactamente las llamadas que hacen DistribucionGeneral
// + DistribucionSecundaria + SeccionDeUnidadFuncional (una por UF) en un
// único render de ResultadoHidraulicoDeTramo.
function recorrerFilasDeDimensionamiento(proyecto: Proyecto, contexto: ContextoDeCalculoM2 | undefined) {
  let filas = 0
  for (const fila of identificarFilasDistribucionGeneral(proyecto)) {
    resolverFilaDeDimensionamiento(proyecto, fila.tramoId, catalogoArtefactos, undefined, contexto)
    resolverControlDeDnDeTramo(proyecto, fila.tramoId, catalogoArtefactos, contexto)
    filas += 1
  }
  for (const fila of identificarFilasDistribucionSecundaria(proyecto)) {
    resolverFilaDeDimensionamiento(proyecto, fila.tramoId, catalogoArtefactos, undefined, contexto)
    resolverControlDeDnDeTramo(proyecto, fila.tramoId, catalogoArtefactos, contexto)
    filas += 1
  }
  for (const fila of identificarFilasPrincipalesDeLocales(proyecto)) {
    resolverFilaDeDimensionamiento(
      proyecto,
      fila.tramoId,
      catalogoArtefactos,
      { unidadFuncionalId: fila.unidadFuncionalId, localId: fila.localId, red: fila.red },
      contexto,
    )
    resolverControlDeDnDeTramo(proyecto, fila.tramoId, catalogoArtefactos, contexto)
    filas += 1
  }
  return filas
}

describe('PERF-SCALE-01C — redundancia intra-fila del panel de Tuberías', () => {
  // Nota de magnitud: identificarFilasPrincipalesDeLocales da una fila por
  // (Local,Red) -- pero resolverPerdidaLocalizadaEstimadaDeLocal (modo
  // 'estimado') resuelve TAMBIÉN el diámetro de cada Tramo que alimenta
  // directamente un terminal de ese Local+Red, no sólo el representativo.
  // Así que el conjunto de Tramos realmente tocado por un render de
  // dimensionamiento es mucho más grande que "una fila = un Tramo" -- en el
  // fixture de escala, prácticamente todos los tramos del proyecto.

  it('sin contexto compartido (legacy) vs con contexto compartido: mismo Proyecto, mismos Tramos tocados, muchos menos cálculos reales', () => {
    const proyecto = generarProyectoDeEscala({ cantidadUf: 14, localesPorUf: 3 })
    const magnitudes = contarMagnitudesDeEscala(proyecto)

    activarInstrumentacionTopologica()
    reiniciarInstrumentacionTopologica()
    recorrerFilasDeDimensionamiento(proyecto, undefined)
    const sinContexto = leerInstrumentacionTopologica()

    reiniciarInstrumentacionTopologica()
    const contexto = crearContextoDeCalculoM2()
    recorrerFilasDeDimensionamiento(proyecto, contexto)
    const conContexto = leerInstrumentacionTopologica()
    desactivarInstrumentacionTopologica()

    // Con contexto: como mucho un cálculo real de diámetro por Tramo
    // distinto del proyecto -- nunca más que `magnitudes.tramos`.
    expect(conContexto.calculosDiametroComercialDeTramo).toBeLessThanOrEqual(magnitudes.tramos)
    expect(conContexto.calculosDiametroComercialDeTramo).toBeGreaterThan(0)

    // Sin contexto: cada fila (y cada tramo terminal que
    // resolverPerdidaLocalizadaEstimadaDeLocal resuelve para la velocidad
    // de referencia) recalcula desde cero -- notablemente más cálculos
    // reales que con el contexto compartido, sobre el MISMO Proyecto.
    expect(sinContexto.calculosDiametroComercialDeTramo).toBeGreaterThan(conContexto.calculosDiametroComercialDeTramo)
  })
})
