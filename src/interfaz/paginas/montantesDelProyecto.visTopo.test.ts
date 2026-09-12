// M2-TOPO-C §19/§30 — PRUEBA DE PROYECTABILIDAD hacia VIS-TOPO.
//
// Demuestra explícitamente que un resolver futuro READ-ONLY puede derivar
// TODO lo que VIS-TOPO necesita de un montante -- id, nombre, red,
// segmentos, orden, nodos de derivación, Local servido en cada nivel,
// origen, longitud y DN -- usando SÓLO:
//   RedHidraulica + Proyecto.montantes + UF/Locales + resultados.
//
// `proyectarMontante` cubre la identidad + topología; los "resultados"
// (Qc/DN/V/longitud por segmento) salen del mismo pipeline de M2
// (resolverFilaDeDimensionamiento) al que ya accede el resto de la vista.
// Si en algún momento hiciera falta un `localesIds[]`, un `tramosIds[]` o
// datos gráficos paralelos para armar esto, la arquitectura no estaría
// lista -- y este test dejaría de compilar/pasar.
import { describe, it, expect } from 'vitest'
import type { Local, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { validarRedHidraulica } from '../../validacion/redHidraulica'
import { obtenerArtefactosAguasAbajo } from '../../motor/tuberias/topologia/obtenerArtefactosAguasAbajo'
import { agregarLocalAMontante } from './reconciliarMontante'
import { conMontanteNuevo, proyectarMontante } from './montantesDelProyecto'
import { resolverFilaDeDimensionamiento } from './resolverFilaDeDimensionamiento'

// --- fixture de 3 Locales AF a cotas 3 / 6 / 9, origen AF directa (cota 0) ---

function local(id: string, cotaPiso_m: number): Local {
  return {
    id,
    tipo: 'bano',
    regimen: 'domiciliario',
    cotaPiso_m,
    artefactos: [{ id: `${id}-art`, artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }],
  }
}

function rama(id: string): { nodos: Nodo[]; tramos: Tramo[] } {
  return {
    nodos: [
      { id: `n-${id}` },
      { id: `n-${id}-t`, referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: id, artefactoId: `${id}-art` } },
    ],
    tramos: [
      { id: `t-${id}`, nodoOrigenId: 'n-af', nodoDestinoId: `n-${id}`, red: 'AF', longitud_m: 5 },
      { id: `t-${id}-t`, nodoOrigenId: `n-${id}`, nodoDestinoId: `n-${id}-t`, red: 'AF', longitud_m: 1 },
    ],
  }
}

function proyecto3Locales(): Proyecto {
  const uf: UnidadFuncional = {
    id: 'uf-1',
    nombre: 'UF 1',
    niveles: [
      { id: 'uf-1-nivel-1', nombre: 'Nivel 1', nivel: 0, locales: [local('l-1', 3), local('l-2', 6), local('l-3', 9)] },
    ],
  }
  const ramas = [rama('l-1'), rama('l-2'), rama('l-3')]
  const redHidraulica: RedHidraulica = {
    nodos: [{ id: 'n-gen' }, { id: 'n-af' }, ...ramas.flatMap((r) => r.nodos)],
    tramos: [
      { id: 't-gen', nodoOrigenId: 'n-gen', nodoDestinoId: 'n-af', red: 'AF', longitud_m: 10 },
      ...ramas.flatMap((r) => r.tramos),
    ],
  }
  return {
    metadatos: { nombre: 'm', obra: 'o', comitente: 'c', fecha: '2026-01-01', schemaVersion: '1.0.0', versionNormativa: 'eras-2023' },
    parametros: { tipoDeProyecto: 'viviendaMultifamiliar', presionSobreAcera_m: 20, alturaArtefactoMasDesfavorable_m: 0 },
    unidadesFuncionales: [uf],
    redHidraulica,
    configuracionAbastecimiento: { esquema: 'directa' },
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'estimado',
      granularidadHidraulica: 'simplificada',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

function montanteCon3Locales(): { proyecto: Proyecto; montanteId: string } {
  const creado = conMontanteNuevo(proyecto3Locales(), 'AF')
  const { montanteId } = creado
  let proyecto = creado.proyecto
  for (const localId of ['l-1', 'l-2', 'l-3']) {
    const r = agregarLocalAMontante(proyecto, montanteId, 'uf-1', localId)
    if (r.tipo !== 'reconciliado') {
      throw new Error(`agregarLocalAMontante(${localId}) -> ${r.tipo}`)
    }
    proyecto = r.proyecto
  }
  return { proyecto, montanteId }
}

// El "resolver READ-ONLY futuro" de VIS-TOPO, escrito acá con lo que HOY
// existe. Sólo lee proyectarMontante (RedHidraulica + Proyecto.montantes +
// UF/Locales) y resolverFilaDeDimensionamiento (resultados de M2).
type NivelDeMontante = {
  readonly nodoDerivacionId: string
  readonly localServido: string
  readonly segmentoEntrante: string
  readonly orden: number
  readonly longitud_m: number | undefined
  readonly dnTexto: string
  readonly qcTexto: string
}
type MontanteParaVisTopo = {
  readonly id: string
  readonly nombre: string
  readonly red: 'AF' | 'AC'
  readonly origenNodoId: string | undefined
  readonly niveles: readonly NivelDeMontante[]
}

function clave(ref: { unidadFuncionalId: string; localId: string }): string {
  return `${ref.unidadFuncionalId}/${ref.localId}`
}

function proyectarParaVisTopo(proyecto: Proyecto, montanteId: string): MontanteParaVisTopo {
  const proy = proyectarMontante(proyecto, montanteId)
  if (proy === undefined) {
    throw new Error('proyectarMontante devolvió undefined')
  }
  // Locales aguas abajo de cada segmento (topología pura). El Local "nuevo"
  // en el nivel i = los que alcanza el segmento i menos los que alcanza el
  // segmento i+1 (el resto sigue bajando por la cadena).
  const aguasAbajoPorSegmento = proy.segmentos.map(
    (segmento) => new Set(obtenerArtefactosAguasAbajo(proyecto, segmento.tramoId).map(clave)),
  )
  const niveles = proy.segmentos.map((segmento, i) => {
    const fila = resolverFilaDeDimensionamiento(proyecto, segmento.tramoId, catalogoArtefactos)
    const siguiente = aguasAbajoPorSegmento[i + 1] ?? new Set<string>()
    const nuevosEnNivel = [...aguasAbajoPorSegmento[i]!].filter((k) => !siguiente.has(k))
    const etiqueta = proy.localesServidos.find((s) => nuevosEnNivel.includes(clave(s)))?.etiqueta
    return {
      nodoDerivacionId: segmento.nodoDestinoId,
      localServido: etiqueta ?? '(sin Local nuevo en este nivel)',
      segmentoEntrante: segmento.tramoId,
      orden: segmento.orden,
      longitud_m: fila.longitud_m,
      dnTexto: fila.dnTexto,
      qcTexto: fila.qcTexto,
    }
  })
  return { id: proy.id, nombre: proy.nombre, red: proy.red, origenNodoId: proy.origenNodoId, niveles }
}

describe('M2-TOPO-C · proyectabilidad VIS-TOPO (fixture de 3 Locales)', () => {
  it('el montante es válido y tiene 3 segmentos encadenados', () => {
    const { proyecto, montanteId } = montanteCon3Locales()
    expect(validarRedHidraulica(proyecto)).toEqual([])
    const proy = proyectarMontante(proyecto, montanteId)!
    expect(proy.segmentos).toHaveLength(3)
    expect(proy.cadenaLineal).toBe(true)
    // orden origen -> punta, contiguo.
    expect(proy.segmentos.map((s) => s.orden)).toEqual([0, 1, 2])
    // cada segmento arranca donde termina el anterior.
    for (let i = 1; i < proy.segmentos.length; i += 1) {
      expect(proy.segmentos[i]!.nodoOrigenId).toBe(proy.segmentos[i - 1]!.nodoDestinoId)
    }
  })

  it('un resolver READ-ONLY deriva id / nombre / red / origen / niveles (nodo, Local, orden, longitud, DN) sólo de RedHidraulica + Proyecto.montantes + UF/Locales + resultados', () => {
    const { proyecto, montanteId } = montanteCon3Locales()
    const visTopo = proyectarParaVisTopo(proyecto, montanteId)

    expect(visTopo.id).toBe(montanteId)
    expect(visTopo.nombre).toBe('Montante AF 1')
    expect(visTopo.red).toBe('AF')
    expect(visTopo.origenNodoId).toBeDefined()
    expect(visTopo.niveles).toHaveLength(3)

    for (const nivel of visTopo.niveles) {
      expect(nivel.nodoDerivacionId).toMatch(/^nodo-montante-/)
      expect(nivel.segmentoEntrante).toMatch(/^tramo-montante-/)
      // cada nivel identifica el Local que se sirve ahí (derivado de la
      // topología aguas abajo, no de una lista).
      expect(nivel.localServido).toMatch(/^Baño \d · UF 1$/)
      // longitud precargada por cotas (|Δz| = 3 entre niveles consecutivos).
      expect(nivel.longitud_m).toBeGreaterThan(0)
      // DN resuelto por el pipeline normal (no una suma de Qc de Locales).
      expect(nivel.dnTexto).not.toBe('')
      expect(nivel.dnTexto).not.toMatch(/NaN|undefined/)
      expect(nivel.qcTexto).not.toMatch(/NaN|undefined/)
    }
    // los 3 niveles sirven a 3 Locales distintos.
    expect(new Set(visTopo.niveles.map((n) => n.localServido)).size).toBe(3)

    // Los 3 Locales servidos se derivan de la topología, no de una lista.
    const proy = proyectarMontante(proyecto, montanteId)!
    expect(proy.localesServidos.map((l) => l.localId).sort()).toEqual(['l-1', 'l-2', 'l-3'])
  })

  it('no existe ninguna lista paralela persistida (tramosIds / localesIds) en el modelo', () => {
    const { proyecto, montanteId } = montanteCon3Locales()
    const montante = proyecto.montantes!.find((m) => m.id === montanteId)!
    // La identidad guarda SOLO id/red/nombre.
    expect(Object.keys(montante).sort()).toEqual(['id', 'red'])
  })
})
