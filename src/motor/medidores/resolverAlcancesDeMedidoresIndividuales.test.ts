import { describe, it, expect } from 'vitest'
import type { MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import {
  contribucionesCentral,
  resolverAlcancesDeMedidoresIndividuales,
  type ConfiguracionDeMedicionIndividual,
} from './resolverAlcancesDeMedidoresIndividuales'
import { seleccionarMedidorIndividual } from './seleccionarMedidorIndividual'

function metadatos(): MetadatosProyecto {
  return {
    nombre: 'P',
    obra: 'O',
    comitente: 'C',
    fecha: '2026-01-01',
    schemaVersion: '1.0.0',
    versionNormativa: 'eras-2023',
  }
}
function parametros(): ParametrosProyecto {
  return { tipoDeProyecto: 'viviendaMultifamiliar', presionSobreAcera_m: 0, alturaArtefactoMasDesfavorable_m: 0 }
}
function proyectoCon(unidadesFuncionales: readonly UnidadFuncional[], redHidraulica?: RedHidraulica): Proyecto {
  return {
    metadatos: metadatos(),
    parametros: parametros(),
    unidadesFuncionales,
    ...(redHidraulica !== undefined ? { redHidraulica } : {}),
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'detallado',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
      granularidadHidraulica: 'profesional',
    },
  }
}

const qu = (id: string) => catalogoArtefactos.find((a) => a.id === id)!

// UF con: local-bano { lavatorio (mixto), inodoroValvula (soloAF) }.
// Terminales: lavatorio AF+AC, inodoroValvula AF.
function ufBanoCompleto(ufId: string): { uf: UnidadFuncional; nodos: Nodo[]; tramos: Tramo[] } {
  const uf: UnidadFuncional = {
    id: ufId,
    nombre: ufId,
    locales: [
      {
        id: 'local-bano',
        tipo: 'bano',
        regimen: 'domiciliario',
        artefactos: [
          { id: `${ufId}-lav`, artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' },
          { id: `${ufId}-ino`, artefactoId: 'inodoroValvula', cantidad: 1, origen: 'normativo' },
        ],
      },
    ],
  }
  const ref = (artefactoId: string) => ({ tipo: 'artefacto' as const, unidadFuncionalId: ufId, localId: 'local-bano', artefactoId })
  const nodos: Nodo[] = [
    { id: `${ufId}-n-af` },
    { id: `${ufId}-n-af-lav`, referencia: ref(`${ufId}-lav`) },
    { id: `${ufId}-n-af-ino`, referencia: ref(`${ufId}-ino`) },
    { id: `${ufId}-n-acs`, referencia: { tipo: 'produccionACS' } },
    { id: `${ufId}-n-ac-lav`, referencia: ref(`${ufId}-lav`) },
  ]
  const tramos: Tramo[] = [
    { id: `${ufId}-t-af`, nodoOrigenId: 'n-0', nodoDestinoId: `${ufId}-n-af`, red: 'AF' },
    { id: `${ufId}-t-af-lav`, nodoOrigenId: `${ufId}-n-af`, nodoDestinoId: `${ufId}-n-af-lav`, red: 'AF' },
    { id: `${ufId}-t-af-ino`, nodoOrigenId: `${ufId}-n-af`, nodoDestinoId: `${ufId}-n-af-ino`, red: 'AF' },
    { id: `${ufId}-t-af-acs`, nodoOrigenId: 'n-0', nodoDestinoId: `${ufId}-n-acs`, red: 'AF' },
    { id: `${ufId}-t-ac-lav`, nodoOrigenId: `${ufId}-n-acs`, nodoDestinoId: `${ufId}-n-ac-lav`, red: 'AC' },
  ]
  return { uf, nodos, tramos }
}

function redDe(...partes: { nodos: Nodo[]; tramos: Tramo[] }[]): RedHidraulica {
  return {
    nodos: [{ id: 'n-0' }, ...partes.flatMap((p) => p.nodos)],
    tramos: partes.flatMap((p) => p.tramos),
  }
}

const PH_INDIVIDUAL = (ufIds: string[]): ConfiguracionDeMedicionIndividual => ({
  esPropiedadHorizontal: true,
  tipoProvisionACSPorUnidadFuncional: Object.fromEntries(ufIds.map((id) => [id, 'individual' as const])),
})
const PH_CENTRAL = (ufIds: string[]): ConfiguracionDeMedicionIndividual => ({
  esPropiedadHorizontal: true,
  tipoProvisionACSPorUnidadFuncional: Object.fromEntries(ufIds.map((id) => [id, 'central' as const])),
})

describe('resolverAlcancesDeMedidoresIndividuales (M3-B2b, CRIT-A34)', () => {
  it('1. sin propiedad horizontal: 0 alcances', () => {
    const { uf, nodos, tramos } = ufBanoCompleto('uf-1')
    const proyecto = proyectoCon([uf], redDe({ nodos, tramos }))
    const alcances = resolverAlcancesDeMedidoresIndividuales(proyecto, catalogoArtefactos, {
      esPropiedadHorizontal: false,
      tipoProvisionACSPorUnidadFuncional: {},
    })
    expect(alcances).toEqual([])
  })

  it('2+3. PH + ACS individual: 1 alcance AF por UF; el artefacto mixto aporta quTotal (no quFría)', () => {
    const { uf, nodos, tramos } = ufBanoCompleto('uf-1')
    const proyecto = proyectoCon([uf], redDe({ nodos, tramos }))
    const alcances = resolverAlcancesDeMedidoresIndividuales(proyecto, catalogoArtefactos, PH_INDIVIDUAL(['uf-1']))

    expect(alcances).toHaveLength(1)
    expect(alcances[0]!.unidadFuncionalId).toBe('uf-1')
    expect(alcances[0]!.servicioMedido).toBe('aguaFria')

    const lav = alcances[0]!.consumos.find((c) => c.etiqueta.includes('Lavatorio'))!
    expect(lav.qu_lps).toBe(qu('lavatorio').quTotal_lps) // 0,20 — NO 0,08
    const ino = alcances[0]!.consumos.find((c) => c.etiqueta.includes('válvula') || c.etiqueta.includes('Inodoro'))!
    expect(ino.qu_lps).toBe(qu('inodoroValvula').quTotal_lps) // 1,50
  })

  it('4+5+6. PH + ACS central: alcance AF + AC; mixto reparte quFría/quCaliente y suman quTotal', () => {
    const { uf, nodos, tramos } = ufBanoCompleto('uf-1')
    const proyecto = proyectoCon([uf], redDe({ nodos, tramos }))
    const alcances = resolverAlcancesDeMedidoresIndividuales(proyecto, catalogoArtefactos, PH_CENTRAL(['uf-1']))

    const af = alcances.find((a) => a.unidadFuncionalId === 'uf-1' && a.servicioMedido === 'aguaFria')!
    const ac = alcances.find((a) => a.unidadFuncionalId === 'uf-1' && a.servicioMedido === 'aguaCaliente')!
    expect(af).toBeDefined()
    expect(ac).toBeDefined()

    const lavAF = af.consumos.find((c) => c.etiqueta.includes('Lavatorio'))!
    const lavAC = ac.consumos.find((c) => c.etiqueta.includes('Lavatorio'))!
    expect(lavAF.qu_lps).toBe(qu('lavatorio').quFria_lps) // 0,08
    expect(lavAC.qu_lps).toBe(qu('lavatorio').quCaliente_lps) // 0,12
    expect(lavAF.qu_lps + lavAC.qu_lps).toBeCloseTo(qu('lavatorio').quTotal_lps, 10) // 0,20

    // El inodoro a válvula (soloAF) aporta su quTotal a AF y nada a AC.
    expect(af.consumos.find((c) => c.etiqueta.includes('Inodoro'))!.qu_lps).toBe(qu('inodoroValvula').quTotal_lps)
    expect(ac.consumos.some((c) => c.etiqueta.includes('Inodoro'))).toBe(false)
  })

  it('7. ACS central, UF sin ningún consumo de AC: se crea alcance AF pero NO alcance AC', () => {
    const ufId = 'uf-solofria'
    const uf: UnidadFuncional = {
      id: ufId,
      nombre: ufId,
      locales: [
        {
          id: 'local-toilette',
          tipo: 'toilette',
          regimen: 'domiciliario',
          artefactos: [{ id: 'a-ino', artefactoId: 'inodoroValvula', cantidad: 1, origen: 'normativo' }],
        },
      ],
    }
    const nodos: Nodo[] = [
      { id: 'n-af' },
      { id: 'n-af-ino', referencia: { tipo: 'artefacto', unidadFuncionalId: ufId, localId: 'local-toilette', artefactoId: 'a-ino' } },
    ]
    const tramos: Tramo[] = [
      { id: 't-af', nodoOrigenId: 'n-0', nodoDestinoId: 'n-af', red: 'AF' },
      { id: 't-af-ino', nodoOrigenId: 'n-af', nodoDestinoId: 'n-af-ino', red: 'AF' },
    ]
    const proyecto = proyectoCon([uf], redDe({ nodos, tramos }))
    const alcances = resolverAlcancesDeMedidoresIndividuales(proyecto, catalogoArtefactos, PH_CENTRAL([ufId]))

    expect(alcances).toHaveLength(1)
    expect(alcances[0]!.servicioMedido).toBe('aguaFria')
  })

  it('8. dos UF: alcances independientes, sin mezcla de consumos', () => {
    const a = ufBanoCompleto('uf-1')
    const b = ufBanoCompleto('uf-2')
    const proyecto = proyectoCon([a.uf, b.uf], redDe(a, b))
    const alcances = resolverAlcancesDeMedidoresIndividuales(proyecto, catalogoArtefactos, PH_INDIVIDUAL(['uf-1', 'uf-2']))

    expect(alcances.map((x) => x.unidadFuncionalId).sort()).toEqual(['uf-1', 'uf-2'])
    for (const alcance of alcances) {
      for (const consumo of alcance.consumos) {
        expect(consumo.etiqueta.startsWith('local-bano')).toBe(true)
      }
    }
    // Ningún consumo de uf-1 tiene cantidad/qu contaminado por uf-2: mismas
    // etiquetas de artefacto, alcances separados.
    expect(alcances.find((x) => x.unidadFuncionalId === 'uf-1')!.consumos).toHaveLength(2)
    expect(alcances.find((x) => x.unidadFuncionalId === 'uf-2')!.consumos).toHaveLength(2)
  })

  it('9. cambiar los artefactos de la UF cambia los alcances derivados (sin estado)', () => {
    const base = ufBanoCompleto('uf-1')
    const antes = resolverAlcancesDeMedidoresIndividuales(
      proyectoCon([base.uf], redDe(base)),
      catalogoArtefactos,
      PH_INDIVIDUAL(['uf-1']),
    )
    expect(antes[0]!.consumos).toHaveLength(2)

    // Quitar el inodoro: la red conserva sus nodos, pero el artefacto ya no
    // está en el Local -> deja de contarse.
    const ufSinInodoro: UnidadFuncional = {
      ...base.uf,
      locales: [{ ...base.uf.locales[0]!, artefactos: [base.uf.locales[0]!.artefactos[0]!] }],
    }
    const despues = resolverAlcancesDeMedidoresIndividuales(
      proyectoCon([ufSinInodoro], redDe(base)),
      catalogoArtefactos,
      PH_INDIVIDUAL(['uf-1']),
    )
    expect(despues[0]!.consumos).toHaveLength(1)
    expect(despues[0]!.consumos[0]!.etiqueta).toContain('Lavatorio')
  })

  it('10. B2b -> B2a: cada alcance produce una selección válida', () => {
    const { uf, nodos, tramos } = ufBanoCompleto('uf-1')
    const proyecto = proyectoCon([uf], redDe({ nodos, tramos }))
    const alcances = resolverAlcancesDeMedidoresIndividuales(proyecto, catalogoArtefactos, PH_CENTRAL(['uf-1']))

    for (const alcance of alcances) {
      const r = seleccionarMedidorIndividual(alcance)
      expect(r.tipo).toBe('seleccionado')
      if (r.tipo !== 'seleccionado') continue
      expect(r.unidadFuncionalId).toBe('uf-1')
      expect(r.dnMedidor_mm).toBeGreaterThanOrEqual(15)
      expect(r.hfMedidor_mca).toBeGreaterThan(0)
    }
  })

  it('artefacto no normativo (origen usuario) y artefacto sin conexión física: se omiten', () => {
    const ufId = 'uf-1'
    const uf: UnidadFuncional = {
      id: ufId,
      nombre: ufId,
      locales: [
        {
          id: 'local-bano',
          tipo: 'bano',
          regimen: 'domiciliario',
          artefactos: [
            { id: 'a-conectado', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' },
            { id: 'a-usuario', artefactoId: 'lavatorio', cantidad: 1, origen: 'usuario' },
            { id: 'a-sin-red', artefactoId: 'bidet', cantidad: 1, origen: 'normativo' },
          ],
        },
      ],
    }
    const nodos: Nodo[] = [
      { id: 'n-af' },
      { id: 'n-af-conectado', referencia: { tipo: 'artefacto', unidadFuncionalId: ufId, localId: 'local-bano', artefactoId: 'a-conectado' } },
    ]
    const tramos: Tramo[] = [
      { id: 't-af', nodoOrigenId: 'n-0', nodoDestinoId: 'n-af', red: 'AF' },
      { id: 't-af-c', nodoOrigenId: 'n-af', nodoDestinoId: 'n-af-conectado', red: 'AF' },
    ]
    const proyecto = proyectoCon([uf], redDe({ nodos, tramos }))
    const alcances = resolverAlcancesDeMedidoresIndividuales(proyecto, catalogoArtefactos, PH_INDIVIDUAL([ufId]))

    expect(alcances).toHaveLength(1)
    expect(alcances[0]!.consumos).toHaveLength(1)
    expect(alcances[0]!.consumos[0]!.etiqueta).toContain('Lavatorio')
  })

  it('UF con todos sus artefactos sin conexión física: ningún alcance', () => {
    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'uf-1',
      locales: [
        { id: 'local-bano', tipo: 'bano', regimen: 'domiciliario', artefactos: [{ id: 'a1', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }] },
      ],
    }
    const proyecto = proyectoCon([uf], redDe({ nodos: [], tramos: [] }))
    expect(resolverAlcancesDeMedidoresIndividuales(proyecto, catalogoArtefactos, PH_INDIVIDUAL(['uf-1']))).toEqual([])
  })

  it('falta declarar tipoProvisionACS para una UF con consumos: throw', () => {
    const { uf, nodos, tramos } = ufBanoCompleto('uf-1')
    const proyecto = proyectoCon([uf], redDe({ nodos, tramos }))
    expect(() =>
      resolverAlcancesDeMedidoresIndividuales(proyecto, catalogoArtefactos, {
        esPropiedadHorizontal: true,
        tipoProvisionACSPorUnidadFuncional: {},
      }),
    ).toThrow(/falta declarar tipoProvisionACS/)
  })

  it('PH sin redHidraulica: throw (se necesita para la conectividad física, CRIT-A15)', () => {
    const { uf } = ufBanoCompleto('uf-1')
    const proyecto = proyectoCon([uf], undefined)
    expect(() => resolverAlcancesDeMedidoresIndividuales(proyecto, catalogoArtefactos, PH_INDIVIDUAL(['uf-1']))).toThrow(
      /se requiere redHidraulica/,
    )
  })

  // FIX-CRASH-M3-INDUSTRIAL-01 — cobertura directa sobre `contribucionesCentral`
  // (la función donde estaba el bug), con un ArtefactoNormativo sintético
  // que aísla la condición exacta: conectividad 'ambas' + quFria/quCaliente
  // = null + quTotal definido. Antes lanzaba desde
  // `resolverQuEfectivo(_, 'aguaFría')`; ahora cada rama recibe `quTotal`
  // (ampliación de CRIT-A15 / D-δ.79). El caso 'ambas' con catálogo que SÍ
  // desagrega, y los casos soloAF/soloAC, no cambian.
  describe('FIX-CRASH-M3-INDUSTRIAL-01 · contribucionesCentral con catálogo sin desagregar AF/AC', () => {
    const base = {
      id: 'sintetico',
      nombre: 'Sintético',
      regimen: 'noDomiciliario' as const,
      presionMinima_kgcm2: null,
      limpiezaConValvulaAutomatica: false,
      origen: 'normativo' as const,
      referenciaArticulo: 'test',
    }
    const sinDesagregar: ArtefactoNormativo = { ...base, quTotal_lps: 0.5, quFria_lps: null, quCaliente_lps: null }
    const desagregado: ArtefactoNormativo = { ...base, quTotal_lps: 0.2, quFria_lps: 0.08, quCaliente_lps: 0.12 }

    it("conectividad 'ambas' + quFria/quCaliente = null + quTotal definido: NO lanza y cada rama recibe quTotal", () => {
      let r: { af_lps: number; ac_lps: number } | undefined
      expect(() => {
        r = contribucionesCentral(sinDesagregar, 'ambas')
      }).not.toThrow()
      expect(r).toEqual({ af_lps: 0.5, ac_lps: 0.5 })
    })

    it("conectividad 'ambas' con catálogo que SÍ desagrega: reparto fría/caliente, sin cambio", () => {
      expect(contribucionesCentral(desagregado, 'ambas')).toEqual({ af_lps: 0.08, ac_lps: 0.12 })
    })

    it("soloAF / soloAC del artefacto sin desagregar: quTotal en la rama conectada, 0 en la otra", () => {
      expect(contribucionesCentral(sinDesagregar, 'soloAF')).toEqual({ af_lps: 0.5, ac_lps: 0 })
      expect(contribucionesCentral(sinDesagregar, 'soloAC')).toEqual({ af_lps: 0, ac_lps: 0.5 })
    })
  })

  // Segunda barrera de integración: el mismo caso a través de
  // `resolverAlcancesDeMedidoresIndividuales` con el catálogo REAL
  // (`piletaDeCocinaIndustrial`, política 'automatica' / referencia 'ambas').
  it('FIX-CRASH-M3-INDUSTRIAL-01 · ACS central + piletaDeCocinaIndustrial AF+AC: no lanza, cada medidor ve quTotal, B2a válido', () => {
    const ufId = 'uf-ind'
    const uf: UnidadFuncional = {
      id: ufId,
      nombre: ufId,
      locales: [
        {
          id: 'local-cocina',
          tipo: 'cocina',
          regimen: 'noDomiciliario',
          artefactos: [{ id: `${ufId}-pci`, artefactoId: 'piletaDeCocinaIndustrial', cantidad: 1, origen: 'normativo' }],
        },
      ],
    }
    const ref = { tipo: 'artefacto' as const, unidadFuncionalId: ufId, localId: 'local-cocina', artefactoId: `${ufId}-pci` }
    const nodos: Nodo[] = [
      { id: 'n-af' },
      { id: 'n-af-pci', referencia: ref },
      { id: 'n-acs', referencia: { tipo: 'produccionACS' } },
      { id: 'n-ac-pci', referencia: ref },
    ]
    const tramos: Tramo[] = [
      { id: 't-af', nodoOrigenId: 'n-0', nodoDestinoId: 'n-af', red: 'AF' },
      { id: 't-af-pci', nodoOrigenId: 'n-af', nodoDestinoId: 'n-af-pci', red: 'AF' },
      { id: 't-af-acs', nodoOrigenId: 'n-0', nodoDestinoId: 'n-acs', red: 'AF' },
      { id: 't-ac-pci', nodoOrigenId: 'n-acs', nodoDestinoId: 'n-ac-pci', red: 'AC' },
    ]
    const proyecto = proyectoCon([uf], redDe({ nodos, tramos }))

    let alcances: ReturnType<typeof resolverAlcancesDeMedidoresIndividuales> = []
    expect(() => {
      alcances = resolverAlcancesDeMedidoresIndividuales(proyecto, catalogoArtefactos, PH_CENTRAL([ufId]))
    }).not.toThrow()

    const af = alcances.find((a) => a.servicioMedido === 'aguaFria')!
    const ac = alcances.find((a) => a.servicioMedido === 'aguaCaliente')!
    expect(af).toBeDefined()
    expect(ac).toBeDefined()
    // Cada ramal común se dimensiona para el caudal total (0,50 l/s), sin
    // partir una mezcla que ERAS no publica.
    expect(af.consumos[0]!.qu_lps).toBe(qu('piletaDeCocinaIndustrial').quTotal_lps)
    expect(ac.consumos[0]!.qu_lps).toBe(qu('piletaDeCocinaIndustrial').quTotal_lps)

    // El pipeline aguas abajo (B2a) sigue produciendo una selección válida.
    for (const alcance of alcances) {
      expect(seleccionarMedidorIndividual(alcance).tipo).toBe('seleccionado')
    }
  })
})
