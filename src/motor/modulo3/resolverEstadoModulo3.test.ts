import { describe, it, expect } from 'vitest'
import type {
  ConfiguracionDeMedidores,
  MetadatosProyecto,
  ParametrosProyecto,
  Proyecto,
  TipoDeProyecto,
  UnidadFuncional,
} from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import { resolverEstadoModulo3 } from './resolverEstadoModulo3'

function metadatos(): MetadatosProyecto {
  return { nombre: 'P', obra: 'O', comitente: 'C', fecha: '2026-01-01', schemaVersion: '1.0.0', versionNormativa: 'eras-2023' }
}
function parametros(tipoDeProyecto: TipoDeProyecto): ParametrosProyecto {
  return { tipoDeProyecto, presionSobreAcera_m: 0, alturaArtefactoMasDesfavorable_m: 0 }
}
function proyecto(opts: {
  ufs: readonly UnidadFuncional[]
  red?: RedHidraulica
  config?: ConfiguracionDeMedidores
  tipo?: TipoDeProyecto
}): Proyecto {
  return {
    metadatos: metadatos(),
    parametros: parametros(opts.tipo ?? 'viviendaIndividual'),
    unidadesFuncionales: opts.ufs,
    ...(opts.red !== undefined ? { redHidraulica: opts.red } : {}),
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'detallado',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
      granularidadHidraulica: 'profesional',
    },
    ...(opts.config !== undefined ? { configuracionMedidores: opts.config } : {}),
  }
}

// UF con local-bano { lavatorio (mixto AF+AC), inodoroValvula (soloAF) }.
function ufBano(ufId: string): { uf: UnidadFuncional; nodos: Nodo[]; tramos: Tramo[] } {
  const uf: UnidadFuncional = {
    id: ufId,
    nombre: ufId,
    niveles: [
      {
        id: `${ufId}-nivel-1`,
        nombre: 'Nivel 1',
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

// UF con un solo inodoroValvula (soloAF), `cantidad` configurable -- para
// forzar Qc alto.
function ufInodoros(ufId: string, cantidad: number): { uf: UnidadFuncional; nodos: Nodo[]; tramos: Tramo[] } {
  const uf: UnidadFuncional = {
    id: ufId,
    nombre: ufId,
    niveles: [
      {
        id: `${ufId}-nivel-1`,
        nombre: 'Nivel 1',
        locales: [
          {
            id: 'local-bano',
            tipo: 'bano',
            regimen: 'domiciliario',
            artefactos: [{ id: `${ufId}-ino`, artefactoId: 'inodoroValvula', cantidad, origen: 'normativo' }],
          },
        ],
      },
    ],
  }
  const nodos: Nodo[] = [
    { id: `${ufId}-n-af` },
    { id: `${ufId}-n-af-ino`, referencia: { tipo: 'artefacto', unidadFuncionalId: ufId, localId: 'local-bano', artefactoId: `${ufId}-ino` } },
  ]
  const tramos: Tramo[] = [
    { id: `${ufId}-t-af`, nodoOrigenId: 'n-0', nodoDestinoId: `${ufId}-n-af`, red: 'AF' },
    { id: `${ufId}-t-af-ino`, nodoOrigenId: `${ufId}-n-af`, nodoDestinoId: `${ufId}-n-af-ino`, red: 'AF' },
  ]
  return { uf, nodos, tramos }
}

function redDe(...partes: { nodos: Nodo[]; tramos: Tramo[] }[]): RedHidraulica {
  return { nodos: [{ id: 'n-0' }, ...partes.flatMap((p) => p.nodos)], tramos: partes.flatMap((p) => p.tramos) }
}

const resolver = (p: Proyecto) => resolverEstadoModulo3(p, catalogoArtefactos, coeficientesMayoracion)

describe('resolverEstadoModulo3 (M3-C, D-δ.55)', () => {
  it('1. sin configuracionMedidores: noIniciado (proyecto anterior a M3)', () => {
    const { uf } = ufBano('uf-1')
    expect(resolver(proyecto({ ufs: [uf] })).estado).toBe('noIniciado')
  })

  it('2. esPropiedadHorizontal=false: evaluado con solo el medidor general', () => {
    const { uf, nodos, tramos } = ufBano('uf-1')
    const estado = resolver(
      proyecto({ ufs: [uf], red: redDe({ nodos, tramos }), config: { esPropiedadHorizontal: false, tipoProvisionACS: 'individual' } }),
    )
    expect(estado.estado).toBe('evaluado')
    if (estado.estado !== 'evaluado') return
    expect(estado.resultado.medidorGeneral.ambito).toBe('general')
    expect(estado.resultado.medidorGeneral.adoptado.origen).toBe('automatico')
    expect(estado.resultado.medidorGeneral.adoptado.dnMedidor_mm).toBe(
      estado.resultado.medidorGeneral.recomendado.dnMedidor_mm,
    )
    expect(estado.resultado.medidoresIndividuales).toEqual([])
  })

  it('3. PH + ACS individual: general + 1 alcance AF por UF', () => {
    const { uf, nodos, tramos } = ufBano('uf-1')
    const estado = resolver(
      proyecto({
        ufs: [uf],
        red: redDe({ nodos, tramos }),
        config: { esPropiedadHorizontal: true, tipoProvisionACS: 'individual' },
        tipo: 'viviendaMultifamiliar',
      }),
    )
    expect(estado.estado).toBe('evaluado')
    if (estado.estado !== 'evaluado') return
    expect(estado.resultado.medidoresIndividuales).toHaveLength(1)
    const m = estado.resultado.medidoresIndividuales[0]!
    expect(m.resultado.unidadFuncionalId).toBe('uf-1')
    expect(m.resultado.servicioMedido).toBe('aguaFria')
    expect(m.resultado.adoptado.hfMedidor_mca).toBeGreaterThan(0)
    expect(m.resultado.adoptado.origen).toBe('automatico')
    // el alcance compuesto trae los consumos (auditable, sin recalcular)
    expect(m.alcance.consumos.length).toBeGreaterThan(0)
  })

  it('4. PH + ACS central: general + alcance AF + alcance AC', () => {
    const { uf, nodos, tramos } = ufBano('uf-1')
    const estado = resolver(
      proyecto({
        ufs: [uf],
        red: redDe({ nodos, tramos }),
        config: { esPropiedadHorizontal: true, tipoProvisionACS: 'central' },
        tipo: 'viviendaMultifamiliar',
      }),
    )
    expect(estado.estado).toBe('evaluado')
    if (estado.estado !== 'evaluado') return
    const servicios = estado.resultado.medidoresIndividuales.map((m) => m.resultado.servicioMedido).sort()
    expect(servicios).toEqual(['aguaCaliente', 'aguaFria'])
  })

  it('5. dos UF con override distinto: alcances correctos por UF', () => {
    const a = ufBano('uf-1')
    const b = ufBano('uf-2')
    const estado = resolver(
      proyecto({
        ufs: [a.uf, b.uf],
        red: redDe(a, b),
        config: {
          esPropiedadHorizontal: true,
          tipoProvisionACS: 'individual',
          tipoProvisionACSPorUnidadFuncional: { 'uf-2': 'central' },
        },
        tipo: 'viviendaMultifamiliar',
      }),
    )
    expect(estado.estado).toBe('evaluado')
    if (estado.estado !== 'evaluado') return
    const porUf = (id: string) =>
      estado.resultado.medidoresIndividuales.filter((m) => m.resultado.unidadFuncionalId === id).map((m) => m.resultado.servicioMedido).sort()
    expect(porUf('uf-1')).toEqual(['aguaFria']) // individual
    expect(porUf('uf-2')).toEqual(['aguaCaliente', 'aguaFria']) // central
  })

  it('6. cambiar una UF de individual -> central recomputa la cardinalidad', () => {
    const { uf, nodos, tramos } = ufBano('uf-1')
    const red = redDe({ nodos, tramos })
    const individual = resolver(
      proyecto({ ufs: [uf], red, config: { esPropiedadHorizontal: true, tipoProvisionACS: 'individual' }, tipo: 'viviendaMultifamiliar' }),
    )
    const central = resolver(
      proyecto({ ufs: [uf], red, config: { esPropiedadHorizontal: true, tipoProvisionACS: 'central' }, tipo: 'viviendaMultifamiliar' }),
    )
    if (individual.estado !== 'evaluado' || central.estado !== 'evaluado') throw new Error('esperaba evaluado')
    expect(individual.resultado.medidoresIndividuales).toHaveLength(1)
    expect(central.resultado.medidoresIndividuales).toHaveLength(2)
  })

  it('7. Qc general > 40 m3/h: incompleto (medidorGeneralFueraDeTabla06), NUNCA error', () => {
    const { uf, nodos, tramos } = ufInodoros('uf-1', 300)
    const estado = resolver(
      proyecto({
        ufs: [uf],
        red: redDe({ nodos, tramos }),
        config: { esPropiedadHorizontal: false, tipoProvisionACS: 'individual' },
        tipo: 'viviendaMultifamiliar',
      }),
    )
    expect(estado.estado).toBe('incompleto')
    if (estado.estado !== 'incompleto') return
    const motivo = estado.motivos.find((m) => m.tipo === 'medidorGeneralFueraDeTabla06')
    expect(motivo).toBeDefined()
    if (motivo?.tipo === 'medidorGeneralFueraDeTabla06') {
      expect(motivo.qcDiseno_m3h).toBeGreaterThan(40)
      expect(motivo.qcMaximoCubierto_m3h).toBe(40)
    }
  })

  it('8. Qunit individual > 40 m3/h: incompleto (medidorIndividualFueraDeTabla06), general OK', () => {
    const { uf, nodos, tramos } = ufInodoros('uf-1', 10)
    const estado = resolver(
      proyecto({
        ufs: [uf],
        red: redDe({ nodos, tramos }),
        config: { esPropiedadHorizontal: true, tipoProvisionACS: 'individual' },
        tipo: 'viviendaIndividual', // a=1 -> Qc general modesto
      }),
    )
    expect(estado.estado).toBe('incompleto')
    if (estado.estado !== 'incompleto') return
    expect(estado.motivos.some((m) => m.tipo === 'medidorGeneralFueraDeTabla06')).toBe(false)
    const motivo = estado.motivos.find((m) => m.tipo === 'medidorIndividualFueraDeTabla06')
    expect(motivo).toBeDefined()
    if (motivo?.tipo === 'medidorIndividualFueraDeTabla06') {
      expect(motivo.unidadFuncionalId).toBe('uf-1')
      expect(motivo.servicioMedido).toBe('aguaFria')
      expect(motivo.qcDiseno_m3h).toBeGreaterThan(40)
    }
  })

  it('9. override de ACS para una UF inexistente: error (no silencioso)', () => {
    const { uf, nodos, tramos } = ufBano('uf-1')
    const estado = resolver(
      proyecto({
        ufs: [uf],
        red: redDe({ nodos, tramos }),
        config: {
          esPropiedadHorizontal: true,
          tipoProvisionACS: 'individual',
          tipoProvisionACSPorUnidadFuncional: { 'uf-que-no-existe': 'central' },
        },
        tipo: 'viviendaMultifamiliar',
      }),
    )
    expect(estado.estado).toBe('error')
    if (estado.estado !== 'error') return
    expect(estado.problemas[0]!.problema.codigo).toBe('configuracionMedidoresUnidadFuncionalInexistente')
  })

  it('incompleto: sin artefactos computables', () => {
    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'uf-1',
      niveles: [{ id: 'uf-1-nivel-1', nombre: 'Nivel 1', locales: [{ id: 'l', tipo: 'bano', regimen: 'domiciliario', artefactos: [] }] }],
    }
    const estado = resolver(proyecto({ ufs: [uf], config: { esPropiedadHorizontal: false, tipoProvisionACS: 'individual' } }))
    expect(estado.estado).toBe('incompleto')
    if (estado.estado !== 'incompleto') return
    expect(estado.motivos.some((m) => m.tipo === 'sinArtefactosComputables')).toBe(true)
  })

  it('incompleto: propiedad horizontal sin redHidraulica', () => {
    const { uf } = ufBano('uf-1')
    const estado = resolver(proyecto({ ufs: [uf], config: { esPropiedadHorizontal: true, tipoProvisionACS: 'individual' }, tipo: 'viviendaMultifamiliar' }))
    expect(estado.estado).toBe('incompleto')
    if (estado.estado !== 'incompleto') return
    expect(estado.motivos.some((m) => m.tipo === 'redHidraulicaAusenteParaMedicionIndividual')).toBe(true)
  })

  it('error: red hidráulica estructuralmente inválida con propiedad horizontal', () => {
    const { uf, nodos, tramos } = ufBano('uf-1')
    const red = redDe({ nodos, tramos })
    const redRota: RedHidraulica = { nodos: [...red.nodos, { id: 'n-0' }], tramos: red.tramos } // id duplicado
    const estado = resolver(
      proyecto({ ufs: [uf], red: redRota, config: { esPropiedadHorizontal: true, tipoProvisionACS: 'individual' }, tipo: 'viviendaMultifamiliar' }),
    )
    expect(estado.estado).toBe('error')
  })

  it('reactividad: agregar artefactos cambia el resultado del medidor general sin estado previo', () => {
    const { uf, nodos, tramos } = ufInodoros('uf-1', 1)
    const red = redDe({ nodos, tramos })
    const config: ConfiguracionDeMedidores = { esPropiedadHorizontal: false, tipoProvisionACS: 'individual' }
    const antes = resolver(proyecto({ ufs: [uf], red, config }))

    const ufMas = ufInodoros('uf-1', 8)
    const despues = resolver(proyecto({ ufs: [ufMas.uf], red: redDe({ nodos: ufMas.nodos, tramos: ufMas.tramos }), config }))

    if (antes.estado !== 'evaluado' || despues.estado !== 'evaluado') throw new Error('esperaba evaluado')
    expect(despues.resultado.medidorGeneral.qcDiseno_lps).toBeGreaterThan(antes.resultado.medidorGeneral.qcDiseno_lps)
  })

  it('validarProyecto también cubre el override colgado (integración con la capa de validación)', async () => {
    const { validarProyecto } = await import('../../validacion')
    const { catalogoSistemasDeTuberia } = await import('../tuberias/sistemaDeTuberia')
    const { uf, nodos, tramos } = ufBano('uf-1')
    const p = proyecto({
      ufs: [uf],
      red: redDe({ nodos, tramos }),
      config: { esPropiedadHorizontal: true, tipoProvisionACS: 'individual', tipoProvisionACSPorUnidadFuncional: { fantasma: 'central' } },
      tipo: 'viviendaMultifamiliar',
    })
    const resultado = validarProyecto(p, catalogoArtefactos, coeficientesMayoracion, catalogoSistemasDeTuberia)
    expect(resultado.valido).toBe(false)
    expect(resultado.problemas.some((x) => x.codigo === 'configuracionMedidoresUnidadFuncionalInexistente')).toBe(true)
  })
})

describe('resolverEstadoModulo3 — override manual de medidor (M3-D parte 2, D-δ.57)', () => {
  it('sin override: adoptado = recomendado (origen automatico) para general e individuales', () => {
    const { uf, nodos, tramos } = ufBano('uf-1')
    const estado = resolver(
      proyecto({
        ufs: [uf],
        red: redDe({ nodos, tramos }),
        config: { esPropiedadHorizontal: true, tipoProvisionACS: 'central' },
        tipo: 'viviendaMultifamiliar',
      }),
    )
    if (estado.estado !== 'evaluado') throw new Error('esperaba evaluado')
    expect(estado.resultado.medidorGeneral.adoptado.origen).toBe('automatico')
    for (const m of estado.resultado.medidoresIndividuales) {
      expect(m.resultado.adoptado.origen).toBe('automatico')
      expect(m.resultado.adoptado.dnMedidor_mm).toBe(m.resultado.recomendado.dnMedidor_mm)
    }
  })

  it('override del medidor general: DN/C/hf adoptados cambian, Qc no; hf efectiva usa el C adoptado', () => {
    const { uf, nodos, tramos } = ufBano('uf-1')
    const base = proyecto({
      ufs: [uf],
      red: redDe({ nodos, tramos }),
      config: { esPropiedadHorizontal: false, tipoProvisionACS: 'individual' },
    })
    const auto = resolver(base)
    if (auto.estado !== 'evaluado') throw new Error('esperaba evaluado')
    const dnRecomendado = auto.resultado.medidorGeneral.recomendado.dnMedidor_mm

    const conOverride = resolver({
      ...base,
      configuracionMedidores: { ...base.configuracionMedidores!, medidorGeneralAdoptadoDN: 75 },
    })
    if (conOverride.estado !== 'evaluado') throw new Error('esperaba evaluado')
    const g = conOverride.resultado.medidorGeneral
    expect(g.adoptado.origen).toBe('manual')
    expect(g.adoptado.dnMedidor_mm).toBe(75)
    expect(g.adoptado.capacidadMaxima_m3h).toBe(80)
    expect(g.recomendado.dnMedidor_mm).toBe(dnRecomendado)
    expect(g.qcDiseno_lps).toBe(auto.resultado.medidorGeneral.qcDiseno_lps) // Q no cambia
    // hf efectiva coherente con el C adoptado, distinta de la recomendada
    expect(g.adoptado.hfMedidor_mca).toBeLessThan(g.recomendado.hfMedidor_mca)
  })

  it('D2-9. override individual aislado: uf-1|AF no afecta uf-1|AC ni uf-2 ni el general', () => {
    const a = ufBano('uf-1')
    const b = ufBano('uf-2')
    const base = proyecto({
      ufs: [a.uf, b.uf],
      red: redDe(a, b),
      config: { esPropiedadHorizontal: true, tipoProvisionACS: 'central' },
      tipo: 'viviendaMultifamiliar',
    })
    const auto = resolver(base)
    if (auto.estado !== 'evaluado') throw new Error('esperaba evaluado')

    const conOverride = resolver({
      ...base,
      configuracionMedidores: {
        ...base.configuracionMedidores!,
        medidoresIndividualesAdoptadosDN: { 'uf-1|aguaFria': 75 },
      },
    })
    if (conOverride.estado !== 'evaluado') throw new Error('esperaba evaluado')

    const get = (e: typeof conOverride, uf: string, servicio: string) =>
      e.estado === 'evaluado'
        ? e.resultado.medidoresIndividuales.find(
            (m) => m.resultado.unidadFuncionalId === uf && m.resultado.servicioMedido === servicio,
          )!
        : (() => {
            throw new Error('no evaluado')
          })()

    expect(get(conOverride, 'uf-1', 'aguaFria').resultado.adoptado.dnMedidor_mm).toBe(75)
    expect(get(conOverride, 'uf-1', 'aguaFria').resultado.adoptado.origen).toBe('manual')
    // el resto sigue en automatico con el mismo DN que sin override
    for (const [uf, servicio] of [
      ['uf-1', 'aguaCaliente'],
      ['uf-2', 'aguaFria'],
      ['uf-2', 'aguaCaliente'],
    ] as const) {
      expect(get(conOverride, uf, servicio).resultado.adoptado.origen).toBe('automatico')
      expect(get(conOverride, uf, servicio).resultado.adoptado.dnMedidor_mm).toBe(
        get(auto, uf, servicio).resultado.adoptado.dnMedidor_mm,
      )
    }
    expect(conOverride.resultado.medidorGeneral.adoptado.origen).toBe('automatico')
  })

  it('D2-11. cambiar ACS individual->central no reutiliza un override en otro alcance', () => {
    const { uf, nodos, tramos } = ufBano('uf-1')
    const red = redDe({ nodos, tramos })
    // override sobre uf-1|aguaFria, luego se pasa a central (aparece un
    // alcance uf-1|aguaCaliente que NO debe heredar el override de AF).
    const p = proyecto({
      ufs: [uf],
      red,
      config: {
        esPropiedadHorizontal: true,
        tipoProvisionACS: 'central',
        medidoresIndividualesAdoptadosDN: { 'uf-1|aguaFria': 75 },
      },
      tipo: 'viviendaMultifamiliar',
    })
    const estado = resolver(p)
    if (estado.estado !== 'evaluado') throw new Error('esperaba evaluado')
    const af = estado.resultado.medidoresIndividuales.find((m) => m.resultado.servicioMedido === 'aguaFria')!
    const ac = estado.resultado.medidoresIndividuales.find((m) => m.resultado.servicioMedido === 'aguaCaliente')!
    expect(af.resultado.adoptado.origen).toBe('manual')
    expect(af.resultado.adoptado.dnMedidor_mm).toBe(75)
    expect(ac.resultado.adoptado.origen).toBe('automatico') // NO hereda el override de AF
  })

  it('override huérfano (alcance inexistente) se ignora, no rompe ni contamina', () => {
    const { uf, nodos, tramos } = ufBano('uf-1')
    const estado = resolver(
      proyecto({
        ufs: [uf],
        red: redDe({ nodos, tramos }),
        config: {
          esPropiedadHorizontal: true,
          tipoProvisionACS: 'individual', // sólo alcance uf-1|aguaFria
          medidoresIndividualesAdoptadosDN: { 'uf-1|aguaCaliente': 60, 'uf-inexistente|aguaFria': 32 },
        },
        tipo: 'viviendaMultifamiliar',
      }),
    )
    if (estado.estado !== 'evaluado') throw new Error('esperaba evaluado')
    expect(estado.resultado.medidoresIndividuales).toHaveLength(1)
    expect(estado.resultado.medidoresIndividuales[0]!.resultado.adoptado.origen).toBe('automatico')
  })
})
