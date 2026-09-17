// HYD-EST-NETWORK-01: cobertura dirigida de la fuente única de verdad de
// accesorios físicos estimados de Montante y Colector principal. Reusa el
// mismo patrón de fixture que `montanteTees.integracion.test.ts`
// (`conMontanteNuevo` + `agregarLocalAMontante`, longitud "sugerida" por
// cota) para construir un montante real con topología de Tramo/Nodo.
import { describe, it, expect } from 'vitest'
import type { Local, Proyecto, UnidadFuncional } from '../../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../../normativa/eras-2023/catalogo-artefactos'
import { validarRedHidraulica } from '../../../validacion/redHidraulica'
import { agregarLocalAMontante, reconstruirCadena } from '../../../interfaz/paginas/reconciliarMontante'
import { conMontanteNuevo, derivacionesDeMontante } from '../../../interfaz/paginas/montantesDelProyecto'
import { conDnComercialAdoptadoDeTramo } from '../../../interfaz/paginas/actualizarRedHidraulica'
import { obtenerCaminoHaciaOrigen } from './obtenerCaminoHaciaOrigen'
import { distribuirAccesorioPeriodico, resolverAccesoriosFisicosEstimadosDeRed } from './resolverAccesoriosFisicosEstimadosDeRed'

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
      { id: `t-${id}`, nodoOrigenId: 'n-af', nodoDestinoId: `n-${id}`, red: 'AF', accesorios: [], dnComercialAdoptado: '1/2"' },
      { id: `t-${id}-t`, nodoOrigenId: `n-${id}`, nodoDestinoId: `n-${id}-t`, red: 'AF', accesorios: [], dnComercialAdoptado: '1/2"' },
    ],
  }
}

function proyectoBase(cotas: readonly number[]): Proyecto {
  const uf: UnidadFuncional = {
    id: 'uf-1',
    nombre: 'UF 1',
    niveles: [
      {
        id: 'uf-1-nivel-1',
        nombre: 'Nivel 1',
        nivel: 0,
        locales: cotas.map((cota, i) => local(`l-${i + 1}`, cota)),
      },
    ],
  }
  const ramas = uf.niveles[0]!.locales.map((l) => rama(l.id))
  const redHidraulica: RedHidraulica = {
    nodos: [{ id: 'n-gen' }, { id: 'n-af' }, ...ramas.flatMap((r) => r.nodos)],
    tramos: [
      { id: 't-gen', nodoOrigenId: 'n-gen', nodoDestinoId: 'n-af', red: 'AF', accesorios: [], dnComercialAdoptado: '1/2"' },
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

// Montante con `cotas` (una por Local), longitudes "sugeridas" derivadas de
// Δcota consecutiva (RD-2) -- mismo mecanismo que
// `montanteTees.integracion.test.ts`.
function montanteAfConLocales(cotas: readonly number[]): { proyecto: Proyecto; montanteId: string } {
  const creado = conMontanteNuevo(proyectoBase(cotas), 'AF')
  const { montanteId } = creado
  let proyecto = creado.proyecto
  cotas.forEach((_, i) => {
    const r = agregarLocalAMontante(proyecto, montanteId, 'uf-1', `l-${i + 1}`)
    if (r.tipo !== 'reconciliado') {
      throw new Error(`agregarLocalAMontante(l-${i + 1}) -> ${r.tipo}`)
    }
    proyecto = r.proyecto
  })
  return { proyecto, montanteId }
}

describe('distribuirAccesorioPeriodico', () => {
  it('11 m en 3 segmentos [3,4,4]: 2 uniones (4m,8m), 5 codos (2,4,6,8,10)', () => {
    const segmentos = [
      { tramoId: 'a', longitud_m: 3 },
      { tramoId: 'b', longitud_m: 4 },
      { tramoId: 'c', longitud_m: 4 },
    ]
    expect(distribuirAccesorioPeriodico(segmentos, 4)).toEqual(['b', 'c'])
    expect(distribuirAccesorioPeriodico(segmentos, 2)).toEqual(['a', 'b', 'b', 'c', 'c'])
  })

  it('distancia exacta en el borde de un nodo: queda del lado del segmento que cierra, sin duplicar', () => {
    // segmentos [4,4]: la unión en 4m cae EXACTAMENTE en el nodo -- debe
    // asignarse al primer segmento (el que la cierra), no al siguiente.
    const segmentos = [
      { tramoId: 'a', longitud_m: 4 },
      { tramoId: 'b', longitud_m: 4 },
    ]
    expect(distribuirAccesorioPeriodico(segmentos, 4)).toEqual(['a', 'b'])
  })

  it('longitud total 0: ninguna pieza', () => {
    expect(distribuirAccesorioPeriodico([{ tramoId: 'a', longitud_m: 0 }], 4)).toEqual([])
  })
})

describe('resolverAccesoriosFisicosEstimadosDeRed · Montante', () => {
  it('4 locales en cadena lineal: 1 llave, 3 tees (n-1), 1 codo último local, y codos/uniones periódicos = floor(L/2)/floor(L/4) de la longitud REAL de la cadena', () => {
    const { proyecto, montanteId } = montanteAfConLocales([0, 3, 7, 11])
    expect(validarRedHidraulica(proyecto)).toEqual([])
    const derivaciones = derivacionesDeMontante(proyecto, montanteId)
    expect(derivaciones).toHaveLength(3)
    const cadena = reconstruirCadena(proyecto.redHidraulica!, montanteId)!
    const longitudTotal_m = cadena.segmentos.reduce((acc, s) => acc + (s.longitud_m ?? 0), 0)

    const { items, pendientes } = resolverAccesoriosFisicosEstimadosDeRed(proyecto, catalogoArtefactos)
    expect(pendientes).toEqual([])
    const deMontante = items.filter((i) => i.montanteId === montanteId)

    const porTipo = (tipo: string) => deMontante.filter((i) => i.tipo === tipo)
    expect(porTipo('llaveDePaso')).toHaveLength(1)
    expect(porTipo('teeDerivacion')).toHaveLength(3)
    expect(porTipo('codoUltimoLocal')).toHaveLength(1)
    expect(porTipo('codoRecorrido')).toHaveLength(Math.floor(longitudTotal_m / 2))
    expect(porTipo('unionRecta')).toHaveLength(Math.floor(longitudTotal_m / 4))

    // El total físico coincide exactamente con floor(L/período) -- ninguna
    // pieza se pierde ni se duplica al distribuirla entre segmentos.
    expect(porTipo('codoRecorrido').length).toBe(Math.floor(longitudTotal_m / 2))
  })

  it('cada Tee de derivación sólo pertenece a los caminos que atraviesan su nodo -- un Local inferior no carga las derivaciones de los Locales por encima', () => {
    const { proyecto, montanteId } = montanteAfConLocales([0, 3, 7, 11])
    const { items } = resolverAccesoriosFisicosEstimadosDeRed(proyecto, catalogoArtefactos)
    const tees = items.filter((i) => i.montanteId === montanteId && i.tipo === 'teeDerivacion')
    expect(tees).toHaveLength(3)

    const derivaciones = derivacionesDeMontante(proyecto, montanteId).filter((d) => d.tipo === 'bifurcacion')
    // Orden de la cadena: derivacion[0] es el nodo donde se deriva l-1 (el
    // más bajo), derivacion[2] el nodo donde se deriva l-3 -- l-4 (el más
    // alto) no tiene nodo propio (es el 1->1 terminal de la cadena).
    const caminoL1 = obtenerCaminoHaciaOrigen(proyecto.redHidraulica!, 'n-l-1-t')
    const caminoL4 = obtenerCaminoHaciaOrigen(proyecto.redHidraulica!, 'n-l-4-t')
    expect(caminoL1.tipo).toBe('camino')
    expect(caminoL4.tipo).toBe('camino')
    if (caminoL1.tipo !== 'camino' || caminoL4.tipo !== 'camino') return
    const nodosCaminoL1 = new Set(caminoL1.nodos.map((n) => n.id))
    const nodosCaminoL4 = new Set(caminoL4.nodos.map((n) => n.id))

    // l-1 (el más bajo) atraviesa ÚNICAMENTE su propio nodo de derivación
    // (el primero), nunca los de los Locales servidos por encima.
    expect(nodosCaminoL1.has(derivaciones[0]!.nodoId)).toBe(true)
    expect(nodosCaminoL1.has(derivaciones[1]!.nodoId)).toBe(false)
    expect(nodosCaminoL1.has(derivaciones[2]!.nodoId)).toBe(false)

    // l-4 (el más alto, terminal 1->1) atraviesa las 3 derivaciones.
    for (const derivacion of derivaciones) {
      expect(nodosCaminoL4.has(derivacion.nodoId)).toBe(true)
    }
  })

  it('montante sin Locales servidos: ningún accesorio propio (no es un pendiente de Montante)', () => {
    const creado = conMontanteNuevo(proyectoBase([]), 'AF')
    const { items, pendientes } = resolverAccesoriosFisicosEstimadosDeRed(creado.proyecto, catalogoArtefactos)
    expect(items.filter((i) => i.montanteId === creado.montanteId)).toEqual([])
    expect(pendientes.some((p) => p.includes('Montante'))).toBe(false)
  })
})

describe('resolverAccesoriosFisicosEstimadosDeRed · Reducciones (HYD-EST-NETWORK-01)', () => {
  it('cambio real de DN entre dos segmentos consecutivos: 1 reducción anclada en el segmento aguas abajo, con ambos DN identificables', () => {
    const { proyecto: base, montanteId } = montanteAfConLocales([0, 3, 7, 11])
    const cadena = reconstruirCadena(base.redHidraulica!, montanteId)!
    // Todos los segmentos resuelven 20 mm por defecto (demanda mínima) --
    // se fuerza el ÚLTIMO segmento a 32 mm (salto "mediata" en la serie
    // nominal: 20 -> 25 -> 32, 2 escalones) para ejercitar una transición
    // real, sin tocar ningún otro segmento.
    const ultimoSegmentoId = cadena.segmentos[cadena.segmentos.length - 1]!.id
    const proyecto = conDnComercialAdoptadoDeTramo(base, ultimoSegmentoId, '32 mm')

    const { items, pendientes } = resolverAccesoriosFisicosEstimadosDeRed(proyecto, catalogoArtefactos)
    expect(pendientes).toEqual([])
    const reducciones = items.filter((i) => i.montanteId === montanteId && i.tipo === 'reduccion')
    expect(reducciones).toHaveLength(1)
    const reduccion = reducciones[0]!
    expect(reduccion.ubicacion).toEqual({ tipo: 'tramo', tramoId: ultimoSegmentoId })
    expect(reduccion.dnComercial).toBe('32 mm')
    expect(reduccion.dnAguasArriba).toBe('20 mm')
  })

  it('mismo DN en toda la cadena: ninguna reducción', () => {
    const { proyecto, montanteId } = montanteAfConLocales([0, 3, 7, 11])
    const { items } = resolverAccesoriosFisicosEstimadosDeRed(proyecto, catalogoArtefactos)
    expect(items.filter((i) => i.montanteId === montanteId && i.tipo === 'reduccion')).toEqual([])
  })

  it('la reducción sólo pertenece a los caminos que atraviesan FÍSICAMENTE su Tramo -- un Local servido antes de la transición no la ve', () => {
    const { proyecto: base, montanteId } = montanteAfConLocales([0, 3, 7, 11])
    const cadena = reconstruirCadena(base.redHidraulica!, montanteId)!
    const ultimoSegmentoId = cadena.segmentos[cadena.segmentos.length - 1]!.id
    const proyecto = conDnComercialAdoptadoDeTramo(base, ultimoSegmentoId, '32 mm')
    const { items } = resolverAccesoriosFisicosEstimadosDeRed(proyecto, catalogoArtefactos)
    const reduccion = items.find((i) => i.montanteId === montanteId && i.tipo === 'reduccion')!

    // l-1 (el más bajo): su camino nunca llega al último segmento -> no ve
    // la reducción. l-4 (el más alto, servido por el último segmento): sí.
    const caminoL1 = obtenerCaminoHaciaOrigen(proyecto.redHidraulica!, 'n-l-1-t')
    const caminoL4 = obtenerCaminoHaciaOrigen(proyecto.redHidraulica!, 'n-l-4-t')
    expect(caminoL1.tipo).toBe('camino')
    expect(caminoL4.tipo).toBe('camino')
    if (caminoL1.tipo !== 'camino' || caminoL4.tipo !== 'camino') return
    expect(caminoL1.tramos.some((t) => t.id === ultimoSegmentoId)).toBe(false)
    expect(caminoL4.tramos.some((t) => t.id === ultimoSegmentoId)).toBe(true)
    expect(reduccion.ubicacion).toEqual({ tipo: 'tramo', tramoId: ultimoSegmentoId })
  })

  it('fan-out con ramas de DN distinto (dos Montantes desde el mismo nodo del Colector): cada rama que cambia genera SU PROPIA reducción, la que no cambia no genera ninguna', () => {
    // Dos Montantes (m1, m2) derivados del mismo nodo de Colector -- se
    // fuerza el DN del primer segmento de m1 a 32 mm (transición real
    // contra el Colector, 20 mm); m2 queda en su DN auto (sin transición).
    // Cada Local necesita su propio feed hidráulico YA conectado (mismo
    // patrón `rama()`) antes de que el reconciliador pueda engancharlo a
    // un Montante.
    const ramaM1 = rama('m1')
    const ramaM2 = rama('m2')
    const base = proyectoBase([])
    const redConFeeds: RedHidraulica = {
      nodos: [...base.redHidraulica!.nodos, ...ramaM1.nodos, ...ramaM2.nodos],
      tramos: [...base.redHidraulica!.tramos, ...ramaM1.tramos, ...ramaM2.tramos],
    }
    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'UF 1',
      niveles: [
        {
          id: 'uf-1-nivel-1',
          nombre: 'Nivel 1',
          nivel: 0,
          locales: [local('m1', 0), local('m2', 0)],
        },
      ],
    }
    let proyecto: Proyecto = { ...base, unidadesFuncionales: [uf], redHidraulica: redConFeeds }
    const creadoM1 = conMontanteNuevo(proyecto, 'AF')
    proyecto = creadoM1.proyecto
    const creadoM2 = conMontanteNuevo(proyecto, 'AF')
    proyecto = creadoM2.proyecto

    const r1 = agregarLocalAMontante(proyecto, creadoM1.montanteId, 'uf-1', 'm1')
    if (r1.tipo !== 'reconciliado') throw new Error(r1.tipo)
    proyecto = r1.proyecto
    const r2 = agregarLocalAMontante(proyecto, creadoM2.montanteId, 'uf-1', 'm2')
    if (r2.tipo !== 'reconciliado') throw new Error(r2.tipo)
    proyecto = r2.proyecto

    const primerSegmentoM1 = reconstruirCadena(proyecto.redHidraulica!, creadoM1.montanteId)!.segmentos[0]!.id
    proyecto = conDnComercialAdoptadoDeTramo(proyecto, primerSegmentoM1, '32 mm')

    const { items, pendientes } = resolverAccesoriosFisicosEstimadosDeRed(proyecto, catalogoArtefactos)
    expect(pendientes).toEqual([])
    const reducciones = items.filter((i) => i.tipo === 'reduccion')
    expect(reducciones).toHaveLength(1)
    expect(reducciones[0]!.montanteId).toBe(creadoM1.montanteId)
    expect(reducciones[0]!.ubicacion).toEqual({ tipo: 'tramo', tramoId: primerSegmentoM1 })
    expect(reducciones[0]!.dnComercial).toBe('32 mm')
    expect(reducciones[0]!.dnAguasArriba).toBe('20 mm')
  })

  it('extremo de la topología (sin Tramo aguas arriba): nunca una reducción fantasma', () => {
    // t-gen es el Tramo raíz absoluto (sin ningún tramo entrante) -- forzar
    // su propio DN no debe generar ninguna reducción de "extremo".
    const { proyecto: base, montanteId } = montanteAfConLocales([0, 3, 7, 11])
    const proyecto = conDnComercialAdoptadoDeTramo(base, 't-gen', '32 mm')
    const { items } = resolverAccesoriosFisicosEstimadosDeRed(proyecto, catalogoArtefactos)
    // La reducción SÍ debe aparecer en el primer segmento del Montante
    // (20 vs 32, transición real y conectada) -- pero ninguna reducción
    // "huérfana" debería anclarse en t-gen mismo (no tiene Tramo aguas
    // arriba: no es parte de este sector ni de ningún otro).
    const cadena = reconstruirCadena(proyecto.redHidraulica!, montanteId)!
    const primerSegmentoId = cadena.segmentos[0]!.id
    const reducciones = items.filter((i) => i.tipo === 'reduccion')
    expect(reducciones.every((r) => r.ubicacion.tipo === 'tramo' && r.ubicacion.tramoId !== 't-gen')).toBe(true)
    expect(reducciones.some((r) => r.ubicacion.tipo === 'tramo' && r.ubicacion.tramoId === primerSegmentoId)).toBe(true)
  })
})
