// Composición de resolverPerdidaLocalizadaDeTramo a lo largo de un
// camino: se verifica que la acumulación suma exactamente los hf_m que
// esa primitiva devuelve por tramo (el expected se deriva componiendo
// resolverDiametroComercialDeTramo + resolverPerdidaLocalizadaDeTramo
// directamente -- que es justamente lo que esta función hace, no una
// fórmula reimplementada), y que cualquier estado incompleto se propaga
// sin convertirse en hf=0 ni en suma parcial.
import { describe, it, expect } from 'vitest'
import type { Artefacto, MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../../modelo/proyecto'
import type { AccesorioDeTramo, Nodo, RedHidraulica, ReferenciaDeArtefacto, Tramo } from '../../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../../normativa/eras-2023/catalogo-artefactos'
import { obtenerKsDeAccesorio } from '../../../normativa/eras-2023/tabla-07-perdidas-localizadas'
import { validarRedHidraulica } from '../../../validacion/redHidraulica'
import { catalogoSistemasDeTuberia, type SistemaDeTuberiaCatalogado } from '../sistemaDeTuberia'
import { resolverDiametroComercialDeTramo } from '../resolverDiametroComercialDeTramo'
import { resolverPerdidaLocalizadaDeTramo } from '../perdidaCarga/resolverPerdidaLocalizadaDeTramo'
import { calcularPerdidaCargaLocalizada } from '../perdidaCarga/calcularPerdidaCargaLocalizada'
import { obtenerCaminoHaciaOrigen, type CaminoHaciaOrigen } from '../topologia/obtenerCaminoHaciaOrigen'
import { acumularPerdidaLocalizadaDeCamino } from './acumularPerdidaLocalizadaDeCamino'

function metadatos(): MetadatosProyecto {
  return {
    nombre: 'Proyecto camino localizada',
    obra: 'Obra',
    comitente: 'Comitente',
    fecha: '2026-01-01',
    schemaVersion: '1.0.0',
    versionNormativa: 'eras-2023',
  }
}

function parametros(): ParametrosProyecto {
  return { tipoDeProyecto: 'viviendaIndividual', presionSobreAcera_m: 0, alturaArtefactoMasDesfavorable_m: 0 }
}

function artefacto(idInstancia: string, artefactoIdCatalogo: string): Artefacto {
  return { id: idInstancia, artefactoId: artefactoIdCatalogo, cantidad: 1, origen: 'normativo' }
}

function referenciaDe(unidadFuncionalId: string, localId: string, artefactoId: string): ReferenciaDeArtefacto {
  return { tipo: 'artefacto', unidadFuncionalId, localId, artefactoId }
}

function proyectoCon(
  unidadesFuncionales: readonly UnidadFuncional[],
  redHidraulica: RedHidraulica,
  sistemaDeTuberiaId = 'acquaSystemMagnumPn20',
): Proyecto {
  return {
    metadatos: metadatos(),
    parametros: parametros(),
    unidadesFuncionales,
    redHidraulica,
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'detallado', granularidadHidraulica: 'profesional',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId,
    },
  }
}

const SISTEMA_INSUFICIENTE: readonly SistemaDeTuberiaCatalogado[] = [
  {
    id: 'sistema-insuficiente',
    denominacion: 'Sistema de laboratorio insuficiente (ficticio)',
    materialTuberiaId: 'ppr',
    fabricante: 'Fabricante ficticio',
    referenciaFuenteDimensiones: 'Fuente ficticia de laboratorio',
    entradas: [{ denominacionComercial: '5 mm (ficticio)', diametroInteriorEfectivo_mm: 5 }],
  },
]

// Cadena raiz -> intermedio -> terminal(lavatorio); ambos Tramos AF, con
// accesorios opcionales por tramo.
function proyectoCadenaDosTramos(accesorios: {
  t0?: readonly AccesorioDeTramo[]
  t1?: readonly AccesorioDeTramo[]
}): Proyecto {
  const uf: UnidadFuncional = {
    id: 'uf-1',
    nombre: 'uf-1',
    niveles: [{ id: 'uf-1-nivel-1', nombre: 'Nivel 1', locales: [{ id: 'local-1', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto('inst-lavatorio', 'lavatorio')] }] }],
  }
  const nodos: Nodo[] = [
    { id: 'n0' },
    { id: 'n1' },
    { id: 'n2', referencia: referenciaDe('uf-1', 'local-1', 'inst-lavatorio') },
  ]
  const tramos: Tramo[] = [
    { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF', longitud_m: 3, ...(accesorios.t0 !== undefined ? { accesorios: accesorios.t0 } : {}) },
    { id: 't1', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF', longitud_m: 3, ...(accesorios.t1 !== undefined ? { accesorios: accesorios.t1 } : {}) },
  ]
  return proyectoCon([uf], { nodos, tramos })
}

function caminoResuelto(proyecto: Proyecto, nodoTerminalId: string): CaminoHaciaOrigen {
  const camino = obtenerCaminoHaciaOrigen(proyecto.redHidraulica!, nodoTerminalId)
  if (camino.tipo !== 'camino') {
    throw new Error(`fixture inválida: se esperaba un camino, se obtuvo ${camino.tipo}`)
  }
  return camino
}

function hfLocalizadaDeTramo(proyecto: Proyecto, tramoId: string, accesorios: readonly AccesorioDeTramo[] | undefined): number {
  const comercial = resolverDiametroComercialDeTramo(proyecto, tramoId, catalogoArtefactos, catalogoSistemasDeTuberia)
  if (comercial.tipo !== 'conCandidato') {
    throw new Error(`fixture inválida: tramo ${tramoId} no resolvió candidato comercial (${comercial.tipo})`)
  }
  const r = resolverPerdidaLocalizadaDeTramo(accesorios, comercial.velocidadReal_mps)
  if (r.tipo !== 'calculada') {
    throw new Error(`fixture inválida: tramo ${tramoId} no calculó pérdida localizada (${r.tipo})`)
  }
  return r.hf_m
}

describe('acumularPerdidaLocalizadaDeCamino', () => {
  it('suma los hf_m de cada Tramo del camino y los expone en porTramo', () => {
    const proyecto = proyectoCadenaDosTramos({
      t0: [{ tipo: 'codo90', cantidad: 1 }],
      t1: [{ tipo: 'llaveDePaso', cantidad: 1 }, { tipo: 'uniones', cantidad: 2 }],
    })
    expect(validarRedHidraulica(proyecto)).toEqual([])
    const camino = caminoResuelto(proyecto, 'n2')

    const resultado = acumularPerdidaLocalizadaDeCamino(proyecto, camino, catalogoArtefactos, catalogoSistemasDeTuberia)

    const hfT0 = hfLocalizadaDeTramo(proyecto, 't0', [{ tipo: 'codo90', cantidad: 1 }])
    const hfT1 = hfLocalizadaDeTramo(proyecto, 't1', [{ tipo: 'llaveDePaso', cantidad: 1 }, { tipo: 'uniones', cantidad: 2 }])

    expect(resultado.tipo).toBe('acumulada')
    if (resultado.tipo !== 'acumulada') return
    expect(resultado.porTramo).toEqual([
      { tramoId: 't0', hf_m: hfT0 },
      { tramoId: 't1', hf_m: hfT1 },
    ])
    expect(resultado.hf_m).toBeCloseTo(hfT0 + hfT1, 12)
    expect(resultado.hf_m).toBeGreaterThan(0)
  })

  it('accesorios=[] en ambos tramos -> acumulada con hf_m 0 (cero real, no ausencia)', () => {
    const proyecto = proyectoCadenaDosTramos({ t0: [], t1: [] })
    const camino = caminoResuelto(proyecto, 'n2')

    const resultado = acumularPerdidaLocalizadaDeCamino(proyecto, camino, catalogoArtefactos, catalogoSistemasDeTuberia)

    expect(resultado).toEqual({
      tipo: 'acumulada',
      hf_m: 0,
      porTramo: [
        { tramoId: 't0', hf_m: 0 },
        { tramoId: 't1', hf_m: 0 },
      ],
    })
  })

  it('raiz inmediata (camino sin Tramos) -> acumulada con hf_m 0, no un término ausente', () => {
    const proyecto = proyectoCadenaDosTramos({ t0: [], t1: [] })

    const resultado = acumularPerdidaLocalizadaDeCamino(
      proyecto,
      { tipo: 'camino', nodos: [{ id: 'n0' }], tramos: [], raizId: 'n0', terminalId: 'n0' },
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
    )

    expect(resultado).toEqual({ tipo: 'acumulada', hf_m: 0, porTramo: [] })
  })

  it('un Tramo con accesorios no relevados (undefined) -> incompleta, nunca hf=0 ni suma parcial', () => {
    const proyecto = proyectoCadenaDosTramos({ t0: [{ tipo: 'codo90', cantidad: 1 }] }) // t1 sin relevar
    const camino = caminoResuelto(proyecto, 'n2')

    const resultado = acumularPerdidaLocalizadaDeCamino(proyecto, camino, catalogoArtefactos, catalogoSistemasDeTuberia)

    expect(resultado).toEqual({
      tipo: 'incompleta',
      tramosNoResueltos: [{ tramoId: 't1', motivo: 'sinRelevar' }],
    })
  })

  it('varios Tramos sin relevar se listan todos', () => {
    const proyecto = proyectoCadenaDosTramos({}) // ambos sin relevar
    const camino = caminoResuelto(proyecto, 'n2')

    const resultado = acumularPerdidaLocalizadaDeCamino(proyecto, camino, catalogoArtefactos, catalogoSistemasDeTuberia)

    expect(resultado).toEqual({
      tipo: 'incompleta',
      tramosNoResueltos: [
        { tramoId: 't0', motivo: 'sinRelevar' },
        { tramoId: 't1', motivo: 'sinRelevar' },
      ],
    })
  })

  it('un Tramo sin candidato comercial admisible -> incompleta con motivo sinCandidatoAdmisible', () => {
    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'uf-1',
      niveles: [{ id: 'uf-1-nivel-1', nombre: 'Nivel 1', locales: [{ id: 'local-1', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto('inst-lavatorio', 'lavatorio')] }] }],
    }
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: referenciaDe('uf-1', 'local-1', 'inst-lavatorio') }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF', longitud_m: 3, accesorios: [] }]
    const proyecto = proyectoCon([uf], { nodos, tramos }, 'sistema-insuficiente')
    const camino = caminoResuelto(proyecto, 'n1')

    const resultado = acumularPerdidaLocalizadaDeCamino(proyecto, camino, catalogoArtefactos, SISTEMA_INSUFICIENTE)

    expect(resultado).toEqual({
      tipo: 'incompleta',
      tramosNoResueltos: [{ tramoId: 't0', motivo: 'sinCandidatoAdmisible' }],
    })
  })

  it('un Tramo sin demanda computable aguas abajo -> incompleta con motivo sinDemanda', () => {
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1' }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF', longitud_m: 3, accesorios: [] }]
    const proyecto = proyectoCon([], { nodos, tramos })
    const camino = caminoResuelto(proyecto, 'n1')

    const resultado = acumularPerdidaLocalizadaDeCamino(proyecto, camino, catalogoArtefactos, catalogoSistemasDeTuberia)

    expect(resultado).toEqual({
      tipo: 'incompleta',
      tramosNoResueltos: [{ tramoId: 't0', motivo: 'sinDemanda' }],
    })
  })

  it('cada singularidad usa la velocidad de SU tramo: Qc distinto por bifurcación -> V distinta -> hf distinto', () => {
    // n1 es una bifurcación 1->2 con `entradaCentral` (tee simétrica, sin
    // necesidad de declarar cuál salida es recta) hacia el terminal (n2,
    // lavatorio) y otra rama (n3, ducha): t0 (n0->n1) carga Qc de TODOS
    // aguas abajo; t1 (n1->n2) carga solo el del lavatorio. Mismo Ks_total
    // de accesorios declarado en ambos tramos, V distinta -> hf distinto,
    // y cada uno debe reflejar la V de su propio tramo, no una compartida.
    // t1 además recibe el Ks de la tee sobre SU propia V (n1 es su
    // nodoOrigen); t0 no (n0 no bifurca).
    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'uf-1',
      niveles: [
        {
          id: 'uf-1-nivel-1',
          nombre: 'Nivel 1',
          locales: [
            {
              id: 'local-1',
              tipo: 'bano',
              regimen: 'domiciliario',
              artefactos: [
                artefacto('inst-lavatorio', 'lavatorio'),
                artefacto('inst-ducha', 'receptaculoDucha'),
              ],
            },
          ],
        },
      ],
    }
    const accesoriosComunes: readonly AccesorioDeTramo[] = [{ tipo: 'codo90', cantidad: 1 }]
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n1', tee: { tipo: 'entradaCentral' } },
      { id: 'n2', referencia: referenciaDe('uf-1', 'local-1', 'inst-lavatorio') },
      { id: 'n3', referencia: referenciaDe('uf-1', 'local-1', 'inst-ducha') },
    ]
    const tramos: Tramo[] = [
      { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF', longitud_m: 3, accesorios: accesoriosComunes },
      { id: 't1', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF', longitud_m: 3, accesorios: accesoriosComunes },
      { id: 't-ducha', nodoOrigenId: 'n1', nodoDestinoId: 'n3', red: 'AF', longitud_m: 3 },
    ]
    const proyecto = proyectoCon([uf], { nodos, tramos })
    expect(validarRedHidraulica(proyecto)).toEqual([])
    const camino = caminoResuelto(proyecto, 'n2')
    expect(camino.tramos.map((t) => t.id)).toEqual(['t0', 't1'])

    const resultado = acumularPerdidaLocalizadaDeCamino(proyecto, camino, catalogoArtefactos, catalogoSistemasDeTuberia)

    const hfAccT0 = hfLocalizadaDeTramo(proyecto, 't0', accesoriosComunes)
    const hfAccT1 = hfLocalizadaDeTramo(proyecto, 't1', accesoriosComunes)
    const comercialT1 = resolverDiametroComercialDeTramo(proyecto, 't1', catalogoArtefactos, catalogoSistemasDeTuberia)
    if (comercialT1.tipo !== 'conCandidato') throw new Error('fixture inválida')
    const hfTeeT1 = calcularPerdidaCargaLocalizada(
      obtenerKsDeAccesorio('teeEntradaCentralSalidasLaterales'),
      comercialT1.velocidadReal_mps,
    )

    // Qc de t0 (2 artefactos aguas abajo) > Qc de t1 (1 artefacto): las
    // velocidades reales resueltas por la capa comercial difieren, así
    // que a igual Ks_total declarado el hf de accesorios también difiere.
    expect(hfAccT0).not.toBeCloseTo(hfAccT1, 6)
    if (resultado.tipo !== 'acumulada') throw new Error('se esperaba acumulada')
    expect(resultado.porTramo).toEqual([
      { tramoId: 't0', hf_m: hfAccT0 },
      { tramoId: 't1', hf_m: hfAccT1 + hfTeeT1 },
    ])
  })

  it('reducciones (CRIT-A30): declarada sobre el Tramo del lado menor/aguas abajo de una transición de diámetro real, usa la V de ESE Tramo -- nunca la del tramo padre de mayor diámetro', () => {
    // t0 sirve a los 3 artefactos aguas abajo; t1 sólo al lavatorio. n1 es
    // una bifurcación 1->2 (`entradaCentral`): t1 hacia el lavatorio (n2),
    // t-resto hacia un sub-hub (n1b) que reparte ducha + bidet -- así t0 y
    // t1 resuelven diámetros comerciales distintos (transición de diámetro
    // real, no fabricada). La reducción se declara sobre t1 (lado menor).
    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'uf-1',
      niveles: [
        {
          id: 'uf-1-nivel-1',
          nombre: 'Nivel 1',
          locales: [
            {
              id: 'local-1',
              tipo: 'bano',
              regimen: 'domiciliario',
              artefactos: [
                artefacto('inst-lavatorio', 'lavatorio'),
                artefacto('inst-ducha', 'receptaculoDucha'),
                artefacto('inst-bidet', 'bidet'),
              ],
            },
          ],
        },
      ],
    }
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n1', tee: { tipo: 'entradaCentral' } },
      { id: 'n1b' },
      { id: 'n2', referencia: referenciaDe('uf-1', 'local-1', 'inst-lavatorio') },
      { id: 'n3', referencia: referenciaDe('uf-1', 'local-1', 'inst-ducha') },
      { id: 'n4', referencia: referenciaDe('uf-1', 'local-1', 'inst-bidet') },
    ]
    const tramos: Tramo[] = [
      { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF', longitud_m: 3, accesorios: [] },
      { id: 't1', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF', longitud_m: 3, accesorios: [{ tipo: 'reducciones', cantidad: 1 }] },
      { id: 't-resto', nodoOrigenId: 'n1', nodoDestinoId: 'n1b', red: 'AF', longitud_m: 3 },
      { id: 't-ducha', nodoOrigenId: 'n1b', nodoDestinoId: 'n3', red: 'AF', longitud_m: 3 },
      { id: 't-bidet', nodoOrigenId: 'n1b', nodoDestinoId: 'n4', red: 'AF', longitud_m: 3 },
    ]
    const proyecto = proyectoCon([uf], { nodos, tramos })
    expect(validarRedHidraulica(proyecto)).toEqual([])
    const camino = caminoResuelto(proyecto, 'n2')
    expect(camino.tramos.map((t) => t.id)).toEqual(['t0', 't1'])

    const comercialT0 = resolverDiametroComercialDeTramo(proyecto, 't0', catalogoArtefactos, catalogoSistemasDeTuberia)
    const comercialT1 = resolverDiametroComercialDeTramo(proyecto, 't1', catalogoArtefactos, catalogoSistemasDeTuberia)
    if (comercialT0.tipo !== 'conCandidato' || comercialT1.tipo !== 'conCandidato') {
      throw new Error('fixture inválida: se esperaba conCandidato en ambos tramos')
    }
    // Confirma la premisa: hay una transición de diámetro real entre t0 y
    // t1 (no un caso trivial de mismo diámetro a ambos lados).
    expect(comercialT0.candidato.diametroInteriorEfectivo_mm).not.toBe(comercialT1.candidato.diametroInteriorEfectivo_mm)
    expect(comercialT0.velocidadReal_mps).not.toBeCloseTo(comercialT1.velocidadReal_mps, 6)

    const resultado = acumularPerdidaLocalizadaDeCamino(proyecto, camino, catalogoArtefactos, catalogoSistemasDeTuberia)
    if (resultado.tipo !== 'acumulada') throw new Error('se esperaba acumulada')

    const ks = obtenerKsDeAccesorio('reducciones')
    const hfReduccionT1 = calcularPerdidaCargaLocalizada(ks, comercialT1.velocidadReal_mps)
    const hfReduccionConVDelPadreRechazado = calcularPerdidaCargaLocalizada(ks, comercialT0.velocidadReal_mps)
    // n1 (entradaCentral) aporta su Ks de tee sobre la V propia de t1.
    const hfTeeT1 = calcularPerdidaCargaLocalizada(
      obtenerKsDeAccesorio('teeEntradaCentralSalidasLaterales'),
      comercialT1.velocidadReal_mps,
    )

    expect(resultado.porTramo).toEqual([
      { tramoId: 't0', hf_m: 0 },
      { tramoId: 't1', hf_m: hfReduccionT1 + hfTeeT1 },
    ])
    // La interpretación descartada (V del tramo padre, de mayor diámetro)
    // hubiera dado un resultado numéricamente distinto y mayor -- confirma
    // que la elección de V no es indiferente (CRIT-A30, consecuencia
    // numérica documentada en CRITERIOS.md).
    expect(hfReduccionT1).not.toBeCloseTo(hfReduccionConVDelPadreRechazado, 6)
    expect(hfReduccionConVDelPadreRechazado).toBeGreaterThan(hfReduccionT1)
  })

  // Fixture compartida de los tests de tee (CRIT-A31): n0 --t-entrada-->
  // n-tee (1 entrante) --t-recta--> n1 (lavatorio)
  //                     --t-lateral--> n2 (ducha)
  // t-recta declarado como salida recta -> t-lateral queda lateral por
  // descarte (entradaPorExtremo). Cada saliente sirve un único artefacto
  // distinto (lavatorio/ducha, Qc/Di/V distintos), para poder demostrar
  // que la MISMA tee física aporta un Js distinto según qué camino se
  // evalúa -- sin duplicar la pieza en el modelo.
  function proyectoConTee(tee: Nodo['tee']): { proyecto: Proyecto; nodos: Nodo[]; tramos: Tramo[] } {
    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'uf-1',
      niveles: [
        {
          id: 'uf-1-nivel-1',
          nombre: 'Nivel 1',
          locales: [
            {
              id: 'local-1',
              tipo: 'bano',
              regimen: 'domiciliario',
              artefactos: [artefacto('inst-lavatorio', 'lavatorio'), artefacto('inst-ducha', 'receptaculoDucha')],
            },
          ],
        },
      ],
    }
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n-tee', ...(tee !== undefined ? { tee } : {}) },
      { id: 'n1', referencia: referenciaDe('uf-1', 'local-1', 'inst-lavatorio') },
      { id: 'n2', referencia: referenciaDe('uf-1', 'local-1', 'inst-ducha') },
    ]
    const tramos: Tramo[] = [
      { id: 't-entrada', nodoOrigenId: 'n0', nodoDestinoId: 'n-tee', red: 'AF', longitud_m: 3, accesorios: [] },
      { id: 't-recta', nodoOrigenId: 'n-tee', nodoDestinoId: 'n1', red: 'AF', longitud_m: 3, accesorios: [] },
      { id: 't-lateral', nodoOrigenId: 'n-tee', nodoDestinoId: 'n2', red: 'AF', longitud_m: 3, accesorios: [] },
    ]
    return { proyecto: proyectoCon([uf], { nodos, tramos }), nodos, tramos }
  }

  it('tee entradaPorExtremo (CRIT-A31): dos terminales DISTINTOS a través de la MISMA tee física -- Js distinto por camino (Ks por clasificación + V por Qc propio del tramo saliente), sin duplicar la pieza', () => {
    const { proyecto } = proyectoConTee({ tipo: 'entradaPorExtremo', tramoSalidaRectaId: 't-recta' })
    expect(validarRedHidraulica(proyecto)).toEqual([])

    const caminoRecta = caminoResuelto(proyecto, 'n1')
    const caminoLateral = caminoResuelto(proyecto, 'n2')
    expect(caminoRecta.tramos.map((t) => t.id)).toEqual(['t-entrada', 't-recta'])
    expect(caminoLateral.tramos.map((t) => t.id)).toEqual(['t-entrada', 't-lateral'])

    const comercialRecta = resolverDiametroComercialDeTramo(proyecto, 't-recta', catalogoArtefactos, catalogoSistemasDeTuberia)
    const comercialLateral = resolverDiametroComercialDeTramo(proyecto, 't-lateral', catalogoArtefactos, catalogoSistemasDeTuberia)
    if (comercialRecta.tipo !== 'conCandidato' || comercialLateral.tipo !== 'conCandidato') {
      throw new Error('fixture inválida: se esperaba conCandidato en ambos tramos salientes')
    }
    // Confirma la premisa: lavatorio y ducha tienen Qc distinto -> V
    // distinta -- no es un caso trivial de velocidades iguales.
    expect(comercialRecta.velocidadReal_mps).not.toBeCloseTo(comercialLateral.velocidadReal_mps, 6)

    const resultadoRecta = acumularPerdidaLocalizadaDeCamino(proyecto, caminoRecta, catalogoArtefactos, catalogoSistemasDeTuberia)
    const resultadoLateral = acumularPerdidaLocalizadaDeCamino(proyecto, caminoLateral, catalogoArtefactos, catalogoSistemasDeTuberia)
    if (resultadoRecta.tipo !== 'acumulada') throw new Error('se esperaba acumulada (camino recto)')
    if (resultadoLateral.tipo !== 'acumulada') throw new Error('se esperaba acumulada (camino lateral)')

    const hfTeeRecta = calcularPerdidaCargaLocalizada(obtenerKsDeAccesorio('teePasoRecto'), comercialRecta.velocidadReal_mps)
    const hfTeeLateral = calcularPerdidaCargaLocalizada(obtenerKsDeAccesorio('teeSalidaLateral'), comercialLateral.velocidadReal_mps)

    // Sin accesorios propios (accesorios:[] en ambos salientes), el hf_m
    // de cada tramo saliente ES exactamente el aporte de la tee -- Ks
    // distinto (paso recto vs lateral) Y V distinta (Qc propio de cada
    // artefacto): dos efectos que se combinan, no solo uno.
    expect(resultadoRecta.porTramo).toEqual([
      { tramoId: 't-entrada', hf_m: 0 },
      { tramoId: 't-recta', hf_m: hfTeeRecta },
    ])
    expect(resultadoLateral.porTramo).toEqual([
      { tramoId: 't-entrada', hf_m: 0 },
      { tramoId: 't-lateral', hf_m: hfTeeLateral },
    ])
    expect(hfTeeRecta).not.toBeCloseTo(hfTeeLateral, 6)
    // t-entrada nunca recibe contribución de tee: su propio nodoOrigenId
    // (n0) no es el nodo que bifurca -- la pieza física no se duplica en
    // ningún otro tramo del camino.
    expect(resultadoRecta.porTramo.find((p) => p.tramoId === 't-entrada')?.hf_m).toBe(0)
  })

  it('tee entradaCentral (CRIT-A31): AMBOS caminos usan Ks teeEntradaCentralSalidasLaterales, sin necesidad de declarar cuál es la salida recta', () => {
    const { proyecto } = proyectoConTee({ tipo: 'entradaCentral' })
    expect(validarRedHidraulica(proyecto)).toEqual([])

    const caminoRecta = caminoResuelto(proyecto, 'n1')
    const comercialRecta = resolverDiametroComercialDeTramo(proyecto, 't-recta', catalogoArtefactos, catalogoSistemasDeTuberia)
    if (comercialRecta.tipo !== 'conCandidato') throw new Error('fixture inválida')

    const resultado = acumularPerdidaLocalizadaDeCamino(proyecto, caminoRecta, catalogoArtefactos, catalogoSistemasDeTuberia)
    if (resultado.tipo !== 'acumulada') throw new Error('se esperaba acumulada')

    const hfTeeEsperado = calcularPerdidaCargaLocalizada(
      obtenerKsDeAccesorio('teeEntradaCentralSalidasLaterales'),
      comercialRecta.velocidadReal_mps,
    )
    expect(resultado.porTramo).toEqual([
      { tramoId: 't-entrada', hf_m: 0 },
      { tramoId: 't-recta', hf_m: hfTeeEsperado },
    ])
  })

  it('tee sin declarar (Nodo.tee === undefined) sobre una bifurcación real: el tramo saliente queda incompleto por motivo teeSinConfigurar -- nunca infiere orientación', () => {
    // Misma fixture que los dos tests anteriores, pero sin configurar la
    // tee -- estado real "bifurcación 1→2 existente, todavía sin relevar".
    const { proyecto } = proyectoConTee(undefined)
    expect(validarRedHidraulica(proyecto)).toEqual([])
    const camino = caminoResuelto(proyecto, 'n1')

    const resultado = acumularPerdidaLocalizadaDeCamino(proyecto, camino, catalogoArtefactos, catalogoSistemasDeTuberia)

    expect(resultado).toEqual({
      tipo: 'incompleta',
      tramosNoResueltos: [{ tramoId: 't-recta', motivo: 'teeSinConfigurar' }],
    })
  })
})

// n0 (raíz, Distribución General) -> n1 (representativo de local-1/AF,
// CON su propio Tramo.accesorios) -> n2 (tee, bifurca hacia lavatorio y
// ducha) -- topología análoga a la Cocina del proyecto demo real
// (t-af-cocina -> n-af-cocina-1 -tee-> pileta/lavavajillas), a diferencia
// de proyectoConTee (donde la tee cuelga directo de la raíz sin ningún
// Tramo "puro" de Local antes -- caso sintético que no ejercita el
// truncamiento, ver comentario de proyectoConTee más arriba).
function proyectoLocalConTeeYRamales(opciones: {
  granularidad: 'simplificada' | 'profesional'
  tee: Nodo['tee']
  accesoriosRamalLavatorio?: readonly AccesorioDeTramo[]
}): Proyecto {
  const uf: UnidadFuncional = {
    id: 'uf-1',
    nombre: 'uf-1',
    niveles: [
      {
        id: 'uf-1-nivel-1',
        nombre: 'Nivel 1',
        locales: [
          {
            id: 'local-1',
            tipo: 'bano',
            regimen: 'domiciliario',
            artefactos: [artefacto('inst-lavatorio', 'lavatorio'), artefacto('inst-ducha', 'receptaculoDucha')],
          },
        ],
      },
    ],
  }
  const nodos: Nodo[] = [
    { id: 'n0' },
    { id: 'n1' },
    { id: 'n2', ...(opciones.tee !== undefined ? { tee: opciones.tee } : {}) },
    { id: 'n3', referencia: referenciaDe('uf-1', 'local-1', 'inst-lavatorio') },
    { id: 'n4', referencia: referenciaDe('uf-1', 'local-1', 'inst-ducha') },
  ]
  const tramos: Tramo[] = [
    { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF', longitud_m: 3, accesorios: [] },
    { id: 't1', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF', longitud_m: 3, accesorios: [] },
    {
      id: 't2',
      nodoOrigenId: 'n2',
      nodoDestinoId: 'n3',
      red: 'AF',
      longitud_m: 3,
      ...(opciones.accesoriosRamalLavatorio !== undefined ? { accesorios: opciones.accesoriosRamalLavatorio } : {}),
    },
    { id: 't3', nodoOrigenId: 'n2', nodoDestinoId: 'n4', red: 'AF', longitud_m: 3 }, // sin accesorios a propósito
  ]
  const proyecto = proyectoCon([uf], { nodos, tramos })
  return {
    ...proyecto,
    configuracionHidraulica: { ...proyecto.configuracionHidraulica, granularidadHidraulica: opciones.granularidad },
  }
}

describe("acumularPerdidaLocalizadaDeCamino — granularidadHidraulica 'simplificada' (D-δ.44)", () => {
  it("'simplificada': el ramal terminal (t2) NO requiere sus propios accesorios -- la tee sigue aportando Ks por rama real", () => {
    const proyecto = proyectoLocalConTeeYRamales({
      granularidad: 'simplificada',
      tee: { tipo: 'entradaPorExtremo', tramoSalidaRectaId: 't2' },
    })
    expect(validarRedHidraulica(proyecto)).toEqual([])
    const camino = caminoResuelto(proyecto, 'n3')
    expect(camino.tramos.map((t) => t.id)).toEqual(['t0', 't1', 't2'])

    const resultado = acumularPerdidaLocalizadaDeCamino(proyecto, camino, catalogoArtefactos, catalogoSistemasDeTuberia)

    expect(resultado.tipo).toBe('acumulada')
    if (resultado.tipo !== 'acumulada') return
    // t2 aparece con hf_m = solo el aporte de la tee (Ks·V²/2g de su
    // propia rama), nunca hf de accesorios propios (que ni siquiera
    // estaban declarados).
    const comercialT2 = resolverDiametroComercialDeTramo(proyecto, 't2', catalogoArtefactos, catalogoSistemasDeTuberia)
    if (comercialT2.tipo !== 'conCandidato') throw new Error('fixture inválida')
    const hfTeeT2 = calcularPerdidaCargaLocalizada(obtenerKsDeAccesorio('teePasoRecto'), comercialT2.velocidadReal_mps)
    expect(resultado.porTramo.find((p) => p.tramoId === 't2')?.hf_m).toBeCloseTo(hfTeeT2, 12)
  })

  it("'simplificada': la tee sigue exigiendo configuración -- un ramal que sale de una bifurcación real sin tee configurar sigue bloqueando completitud", () => {
    const proyecto = proyectoLocalConTeeYRamales({ granularidad: 'simplificada', tee: undefined })
    const camino = caminoResuelto(proyecto, 'n3')

    const resultado = acumularPerdidaLocalizadaDeCamino(proyecto, camino, catalogoArtefactos, catalogoSistemasDeTuberia)

    expect(resultado).toEqual({
      tipo: 'incompleta',
      tramosNoResueltos: [{ tramoId: 't2', motivo: 'teeSinConfigurar' }],
    })
  })

  it("'simplificada': si el ramal además tiene accesorios propios declarados, se ignoran igual (nunca se suman)", () => {
    const proyecto = proyectoLocalConTeeYRamales({
      granularidad: 'simplificada',
      tee: { tipo: 'entradaPorExtremo', tramoSalidaRectaId: 't2' },
      accesoriosRamalLavatorio: [{ tipo: 'codo90', cantidad: 5 }],
    })
    const camino = caminoResuelto(proyecto, 'n3')

    const resultado = acumularPerdidaLocalizadaDeCamino(proyecto, camino, catalogoArtefactos, catalogoSistemasDeTuberia)
    if (resultado.tipo !== 'acumulada') throw new Error('se esperaba acumulada')

    const comercialT2 = resolverDiametroComercialDeTramo(proyecto, 't2', catalogoArtefactos, catalogoSistemasDeTuberia)
    if (comercialT2.tipo !== 'conCandidato') throw new Error('fixture inválida')
    const hfSoloTee = calcularPerdidaCargaLocalizada(obtenerKsDeAccesorio('teePasoRecto'), comercialT2.velocidadReal_mps)
    // Si los 5 codos declarados en el ramal se hubieran sumado, el hf_m
    // sería notablemente mayor que hfSoloTee.
    expect(resultado.porTramo.find((p) => p.tramoId === 't2')?.hf_m).toBeCloseTo(hfSoloTee, 12)
  })

  it("'profesional' (default): el mismo camino SIGUE exigiendo accesorios propios del ramal t2 -- comportamiento sin cambios", () => {
    const proyecto = proyectoLocalConTeeYRamales({
      granularidad: 'profesional',
      tee: { tipo: 'entradaPorExtremo', tramoSalidaRectaId: 't2' },
    })
    const camino = caminoResuelto(proyecto, 'n3')

    const resultado = acumularPerdidaLocalizadaDeCamino(proyecto, camino, catalogoArtefactos, catalogoSistemasDeTuberia)

    expect(resultado).toEqual({
      tipo: 'incompleta',
      tramosNoResueltos: [{ tramoId: 't2', motivo: 'sinRelevar' }],
    })
  })

  it("'simplificada': un ramal que sale de un fan-out 1->N (N>2) NO contribuye 0 en silencio -- deja el camino incompleto por derivacionMultipleNoModelada (M2-TOPO-E §8)", () => {
    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'uf-1',
      niveles: [
        {
          id: 'uf-1-nivel-1',
          nombre: 'Nivel 1',
          locales: [
            {
              id: 'local-1',
              tipo: 'bano',
              regimen: 'domiciliario',
              artefactos: [
                artefacto('inst-lavatorio', 'lavatorio'),
                artefacto('inst-ducha', 'receptaculoDucha'),
                artefacto('inst-bidet', 'bidet'),
              ],
            },
          ],
        },
      ],
    }
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n1' },
      { id: 'n2' }, // fan-out 1->3: derivacionMultipleNoModelada
      { id: 'n3', referencia: referenciaDe('uf-1', 'local-1', 'inst-lavatorio') },
      { id: 'n4', referencia: referenciaDe('uf-1', 'local-1', 'inst-ducha') },
      { id: 'n5', referencia: referenciaDe('uf-1', 'local-1', 'inst-bidet') },
    ]
    const tramos: Tramo[] = [
      { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF', longitud_m: 3, accesorios: [] },
      { id: 't1', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF', longitud_m: 3, accesorios: [] },
      { id: 't2', nodoOrigenId: 'n2', nodoDestinoId: 'n3', red: 'AF' }, // sin longitud ni accesorios
      { id: 't3', nodoOrigenId: 'n2', nodoDestinoId: 'n4', red: 'AF' },
      { id: 't4', nodoOrigenId: 'n2', nodoDestinoId: 'n5', red: 'AF' },
    ]
    const proyectoBase = proyectoCon([uf], { nodos, tramos })
    const proyecto: Proyecto = {
      ...proyectoBase,
      configuracionHidraulica: { ...proyectoBase.configuracionHidraulica, granularidadHidraulica: 'simplificada' },
    }
    const camino = caminoResuelto(proyecto, 'n3')

    const resultado = acumularPerdidaLocalizadaDeCamino(proyecto, camino, catalogoArtefactos, catalogoSistemasDeTuberia)

    // Antes de M2-TOPO-E este caso devolvía { tipo: 'acumulada', hf_m: 0 }:
    // un "falso completo". Ahora el fan-out 1->3 sobre `n2` deja el camino
    // explícitamente incompleto -- sin asignar Ks ni inventar geometría.
    expect(resultado).toEqual({
      tipo: 'incompleta',
      tramosNoResueltos: [{ tramoId: 't2', motivo: 'derivacionMultipleNoModelada' }],
    })
  })
})
