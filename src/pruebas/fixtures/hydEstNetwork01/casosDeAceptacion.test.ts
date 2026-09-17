// HYD-EST-NETWORK-01 — Bloque 2: proyectos de aceptación A/B/C, cargados
// como archivos `.iuas` REALES (no fixtures construidos enteramente en
// memoria) a través del mismo parser que usa la app
// (`parsearArchivoIuas`). Cada proyecto se generó una única vez con las
// funciones de producción reales (`conMontanteNuevo`, `agregarLocalAMontante`,
// `conLongitudDeTramo`, `conDnComercialAdoptadoDeTramo`) y quedó guardado
// como snapshot auditable -- ver `docs/HYD-EST-NETWORK-01.md` para la
// descripción de cada caso y sus resultados documentados.
//
// Todos los números de este archivo (ΣK por tipo de accesorio en cada
// camino, hf, presión residual) son valores REALES computados por el
// motor sobre estos proyectos -- no se inventó ningún resultado; se
// verificaron una vez por inspección directa y quedaron fijados acá como
// regresión.
import { describe, it, expect } from 'vitest'
import * as fs from 'node:fs'
import * as path from 'node:path'
import { parsearArchivoIuas } from '../../../persistencia/parsearArchivoIuas'
import { catalogoArtefactos } from '../../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../../normativa/eras-2023/coeficientes-mayoracion'
import { catalogoSistemasDeTuberia } from '../../../motor/tuberias/sistemaDeTuberia'
import { catalogoMaterialesTuberia } from '../../../motor/tuberias/materialTuberia'
import { resolverDatosDeListadoDeMateriales } from '../../../exportadores/pdf/resolverDatosDeListadoDeMateriales'
import { resolverPresionResidualDeCamino, type TrazaHfLocalizada } from '../../../motor/tuberias/presion/resolverPresionResidualDeCamino'
import type { Proyecto } from '../../../modelo/proyecto'

function cargarProyectoIuas(nombreArchivo: string): Proyecto {
  const ruta = path.join(__dirname, nombreArchivo)
  const texto = fs.readFileSync(ruta, 'utf-8')
  const resultado = parsearArchivoIuas(texto)
  if (!resultado.exito) {
    throw new Error(`Fixture inválida (${nombreArchivo}): ${JSON.stringify(resultado.error)}`)
  }
  return resultado.proyecto
}

function hfEstimadaDe(proyecto: Proyecto, nodoTerminalId: string): Extract<TrazaHfLocalizada, { metodologia: 'estimado' }> {
  const resultado = resolverPresionResidualDeCamino(
    proyecto,
    nodoTerminalId,
    20,
    0,
    catalogoArtefactos,
    catalogoSistemasDeTuberia,
    catalogoMaterialesTuberia,
  )
  if (resultado.tipo !== 'balanceCompleto') {
    throw new Error(`fixture inválida: se esperaba balanceCompleto para ${nodoTerminalId}, se obtuvo ${resultado.tipo}`)
  }
  if (resultado.hfLocalizada.metodologia !== 'estimado') {
    throw new Error('se esperaba metodologia estimado')
  }
  return resultado.hfLocalizada
}

function tiposDeAccesorios(hf: Extract<TrazaHfLocalizada, { metodologia: 'estimado' }>): readonly string[] {
  return [...hf.detalleMontanteYColector.map((d) => d.tipo)].sort()
}

describe('Caso A — Montante simple con cambio de DN (casoA-montante-simple.iuas)', () => {
  // Topología: 1 Montante AF, 4 Locales (Baño 1 @ cota 0m .. Baño 4 @ cota
  // 9m) en cadena lineal, longitudes de segmento explícitas [2, 3, 3, 3] m
  // (11 m total -- mismo caso de referencia usado en toda la
  // documentación de este incremento: 4 Locales, 11 m). El ÚLTIMO
  // segmento (el que alimenta a Baño 4) se fuerza a DN 25 mm; el resto
  // resuelve en su DN automático (20 mm) -- transición real "inmediata"
  // (Ks=0,55 según catálogo Acqua System).
  const proyecto = cargarProyectoIuas('casoA-montante-simple.iuas')

  it('materiales: 1 llave, 3 tees (n-1), 1 codo de último local, 5 codos de recorrido (floor(11/2)), 2 uniones (floor(11/4)), 1 reducción', () => {
    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)
    const montante = datos.accesorios.filter((a) => a.origen === 'estimadoDreza' && a.sector === 'montante')

    expect(montante.find((a) => a.etiqueta === 'Llave de paso esférica')?.cantidadComputada).toBe(1)
    expect(montante.find((a) => a.etiqueta === 'Tee de derivación (Montante)')?.cantidadComputada).toBe(3)
    expect(montante.find((a) => a.etiqueta === 'Codo de último local (Montante)')?.cantidadComputada).toBe(1)
    expect(montante.find((a) => a.etiqueta === 'Codo a 90° (recorrido de Montante)')?.cantidadComputada).toBe(5)
    expect(montante.find((a) => a.etiqueta === 'Cupla recta PPR')?.cantidadComputada).toBe(2)

    const reduccion = montante.find((a) => a.etiqueta === 'Reducción')
    expect(reduccion?.cantidadComputada).toBe(1)
    expect(reduccion?.dnComercial).toBe('20 mm -> 25 mm')

    // Ninguna pieza "fantasma": exactamente 1 + 3 + 1 + 5 + 2 + 1 = 13
    // ítems de Montante en total (agrupados por tipo/DN).
    const totalItemsMontante = montante.length
    expect(totalItemsMontante).toBe(6)
  })

  it('cardinalidad de caminos: Baño 1 (el más bajo) ve 1 tee y nada de la reducción/codo final; Baño 4 (el más alto) ve las 3 tees, el codo de último local Y la reducción', () => {
    const hfBano1 = hfEstimadaDe(proyecto, 'n-bano1-t')
    const hfBano4 = hfEstimadaDe(proyecto, 'n-bano4-t')

    expect(tiposDeAccesorios(hfBano1).filter((t) => t === 'teeDerivacion')).toHaveLength(1)
    expect(tiposDeAccesorios(hfBano1)).not.toContain('reduccion')
    expect(tiposDeAccesorios(hfBano1)).not.toContain('codoUltimoLocal')

    expect(tiposDeAccesorios(hfBano4).filter((t) => t === 'teeDerivacion')).toHaveLength(3)
    expect(tiposDeAccesorios(hfBano4)).toContain('reduccion')
    expect(tiposDeAccesorios(hfBano4)).toContain('codoUltimoLocal')

    // ΣK/hf estrictamente creciente con la profundidad del camino: cada
    // Local adicional atravesado suma al menos su propia Tee.
    expect(hfBano4.hfMontanteYColector_mca).toBeGreaterThan(hfBano1.hfMontanteYColector_mca)
  })

  it('valores numéricos exactos (ΣK/hf ya verificados, fijados como regresión)', () => {
    const hfBano1 = hfEstimadaDe(proyecto, 'n-bano1-t')
    const hfBano4 = hfEstimadaDe(proyecto, 'n-bano4-t')
    expect(hfBano1.hfMontanteYColector_mca).toBeCloseTo(11.0471, 3)
    expect(hfBano4.hfMontanteYColector_mca).toBeCloseTo(14.3697, 3)
    const reduccionBano4 = hfBano4.detalleMontanteYColector.find((d) => d.tipo === 'reduccion')!
    expect(reduccionBano4.ks).toBeCloseTo(0.55, 6) // salto "inmediata": 20 mm -> 25 mm
  })
})

describe('Caso B — Colector con bifurcación y ramas de DN diferentes (casoB-colector-bifurcacion.iuas)', () => {
  // Topología: 1 Colector que se bifurca en 2 Montantes (Ala Norte / Ala
  // Sur), cada uno con 1 Local propio. Ala Norte se fuerza a DN 32 mm
  // (transición real "mediata" contra el Colector, 20 mm); Ala Sur queda
  // en su DN automático (20 mm, sin transición).
  const proyecto = cargarProyectoIuas('casoB-colector-bifurcacion.iuas')

  it('materiales: la reducción existe UNA sola vez, sólo del lado de Ala Norte', () => {
    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)
    const reducciones = datos.accesorios.filter((a) => a.etiqueta === 'Reducción')
    expect(reducciones).toHaveLength(1)
    expect(reducciones[0]!.cantidadComputada).toBe(1)
    expect(reducciones[0]!.dnComercial).toBe('20 mm -> 32 mm')
  })

  it('fan-out con DN distinto: la rama que cambia (Ala Norte, bano1) ve la reducción; la que no cambia (Ala Sur, bano2) nunca la ve', () => {
    const hfBano1 = hfEstimadaDe(proyecto, 'n-bano1-t') // Ala Norte
    const hfBano2 = hfEstimadaDe(proyecto, 'n-bano2-t') // Ala Sur

    expect(tiposDeAccesorios(hfBano1)).toContain('reduccion')
    expect(tiposDeAccesorios(hfBano2)).not.toContain('reduccion')

    // Ningún accesorio de Ala Norte contamina el camino de Ala Sur, y
    // viceversa: cada Montante aporta exactamente su propia llave, su
    // propio codo de último local (1 solo Local cada uno -> sin Tee de
    // derivación PROPIA), y el Colector aporta su llave general + la Tee
    // de distribución (nodal, compartida por ambos caminos porque ambos
    // atraviesan el nodo de bifurcación del Colector).
    expect(hfBano1.detalleMontanteYColector.filter((d) => d.tipo === 'llaveDePaso')).toHaveLength(2) // Montante + Colector
    expect(hfBano2.detalleMontanteYColector.filter((d) => d.tipo === 'llaveDePaso')).toHaveLength(2)
    expect(tiposDeAccesorios(hfBano1)).toContain('teeDerivacion')
    expect(tiposDeAccesorios(hfBano2)).toContain('teeDerivacion')

    // El codo de última salida del Colector es ambiguo entre ambas ramas
    // (fan-out simultáneo desde el mismo nodo, sin tronco propio que lo
    // distinga -- ver comentario de
    // acumularPerdidaLocalizadaEstimadaDeMontanteYColector.ts) -- existe
    // como pieza física en materiales, pero no se le carga arbitrariamente
    // a ninguna de las dos ramas.
    expect(tiposDeAccesorios(hfBano1)).not.toContain('codoUltimaSalida')
    expect(tiposDeAccesorios(hfBano2)).not.toContain('codoUltimaSalida')
  })

  it('valores numéricos exactos (ΣK/hf ya verificados, fijados como regresión)', () => {
    const hfBano1 = hfEstimadaDe(proyecto, 'n-bano1-t')
    const hfBano2 = hfEstimadaDe(proyecto, 'n-bano2-t')
    expect(hfBano1.hfMontanteYColector_mca).toBeCloseTo(4.3355, 3)
    expect(hfBano2.hfMontanteYColector_mca).toBeCloseTo(5.4536, 3)
    const reduccionBano1 = hfBano1.detalleMontanteYColector.find((d) => d.tipo === 'reduccion')!
    expect(reduccionBano1.ks).toBeCloseTo(0.85, 6) // salto "mediata": 20 mm -> 32 mm
  })
})

describe('Caso C — Red combinada Montante + Colector: aislamiento de caminos (casoC-red-combinada.iuas)', () => {
  // Topología: 1 Colector bifurcado en 2 Montantes (Torre 1: Baño 1/2;
  // Torre 2: Baño 3/4), cada Montante con 2 Locales propios. El primer
  // segmento de Torre 2 se fuerza a 32 mm (transición real contra el
  // Colector, 20 mm) y el segundo segmento de Torre 2 vuelve a 20 mm
  // automático (segunda transición real, 32 -> 20) -- dos reducciones
  // reales y distintas dentro de la MISMA Montante, cada una anclada a su
  // propio Tramo.
  const proyecto = cargarProyectoIuas('casoC-red-combinada.iuas')

  it('materiales: 2 reducciones distintas (transiciones de DN diferentes), nunca fusionadas en una sola fila', () => {
    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)
    const reducciones = datos.accesorios.filter((a) => a.etiqueta === 'Reducción')
    expect(reducciones).toHaveLength(2)
    expect(reducciones.every((r) => r.sector === 'montante' && r.cantidadComputada === 1)).toBe(true)
    expect(reducciones.map((r) => r.dnComercial).sort()).toEqual(['20 mm -> 32 mm', '32 mm -> 20 mm'])
  })

  it('aislamiento: los accesorios de Torre 1 (bano1/bano2) NUNCA aparecen en los caminos de Torre 2 (bano3/bano4), y viceversa', () => {
    const hfBano1 = hfEstimadaDe(proyecto, 'n-bano1-t')
    const hfBano2 = hfEstimadaDe(proyecto, 'n-bano2-t')
    const hfBano3 = hfEstimadaDe(proyecto, 'n-bano3-t')
    const hfBano4 = hfEstimadaDe(proyecto, 'n-bano4-t')

    // Ninguna de las dos reducciones de Torre 2 aparece en los caminos de
    // Torre 1 -- son Tramos físicamente distintos, sin relación topológica.
    expect(tiposDeAccesorios(hfBano1)).not.toContain('reduccion')
    expect(tiposDeAccesorios(hfBano2)).not.toContain('reduccion')

    // Torre 2: bano3 (el Local inferior de esa Montante) sólo atraviesa la
    // PRIMERA transición (20->32); bano4 (el superior) atraviesa AMBAS
    // (20->32 y luego 32->20 de vuelta).
    expect(hfBano3.detalleMontanteYColector.filter((d) => d.tipo === 'reduccion')).toHaveLength(1)
    expect(hfBano4.detalleMontanteYColector.filter((d) => d.tipo === 'reduccion')).toHaveLength(2)

    // La llave general y la Tee de distribución del Colector SÍ son
    // comunes a las 4 Locales (comparten el mismo tronco/nodo de reparto),
    // pero la llave PROPIA de cada Montante nunca cruza a la otra Torre --
    // cada camino ve exactamente 2 llaves (Montante propio + Colector),
    // nunca 3 (lo que implicaría ver la llave de la OTRA Montante).
    for (const hf of [hfBano1, hfBano2, hfBano3, hfBano4]) {
      expect(hf.detalleMontanteYColector.filter((d) => d.tipo === 'llaveDePaso')).toHaveLength(2)
    }
  })

  it('valores numéricos exactos (ΣK/hf ya verificados, fijados como regresión)', () => {
    const hfBano1 = hfEstimadaDe(proyecto, 'n-bano1-t')
    const hfBano3 = hfEstimadaDe(proyecto, 'n-bano3-t')
    const hfBano4 = hfEstimadaDe(proyecto, 'n-bano4-t')
    expect(hfBano1.hfMontanteYColector_mca).toBeCloseTo(10.3266, 3)
    expect(hfBano3.hfMontanteYColector_mca).toBeCloseTo(6.3778, 3)
    expect(hfBano4.hfMontanteYColector_mca).toBeCloseTo(7.2502, 3)
    // bano4 atraviesa 2 reducciones distintas -- Ks 0,85 (mediata) cada
    // una (20->32 y 32->20, mismo salto de 2 escalones en ambos sentidos).
    const reduccionesBano4 = hfBano4.detalleMontanteYColector.filter((d) => d.tipo === 'reduccion')
    expect(reduccionesBano4.map((r) => r.ks)).toEqual([0.85, 0.85])
  })
})
