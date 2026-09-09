import { describe, it, expect } from 'vitest'
import type {
  Artefacto,
  ConfiguracionHidraulica,
  MetadatosProyecto,
  MetodoPerdidaLocalizada,
  ParametrosProyecto,
  Proyecto,
  UnidadFuncional,
} from '../../modelo/proyecto'
import type { AccesorioDeTramo, Nodo, RedHidraulica, ReferenciaDeArtefacto, Tramo } from '../../modelo/redHidraulica'
import { catalogoArtefactos, type ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import { validarRedHidraulica } from '../../validacion/redHidraulica'
import { catalogoSistemasDeTuberia } from '../tuberias/sistemaDeTuberia'
import { catalogoMaterialesTuberia } from '../tuberias/materialTuberia'
import { resolverPresionResidualDeCamino } from '../tuberias/presion/resolverPresionResidualDeCamino'
import { resolverEstadoModulo2 } from './resolverEstadoModulo2'

const P_DISPONIBLE = 20
const HF_MEDIDOR_MCA = 1.3

function metadatos(): MetadatosProyecto {
  return {
    nombre: 'Proyecto estado M2',
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

function configuracion(metodoPerdidaLocalizada: MetodoPerdidaLocalizada): ConfiguracionHidraulica {
  return {
    metodoPerdidaDistribuida: 'hazenWilliams',
    metodoPerdidaLocalizada,
    granularidadHidraulica: 'profesional',
    materialTuberiaId: 'ppr',
    sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
  }
}

function proyectoCon(
  unidadesFuncionales: readonly UnidadFuncional[],
  redHidraulica: RedHidraulica | undefined,
  metodoPerdidaLocalizada: MetodoPerdidaLocalizada = 'detallado',
): Proyecto {
  return {
    metadatos: metadatos(),
    parametros: parametros(),
    unidadesFuncionales,
    ...(redHidraulica !== undefined ? { redHidraulica } : {}),
    configuracionHidraulica: configuracion(metodoPerdidaLocalizada),
  }
}

// raiz(cota0) -> terminal(cota8, lavatorio), un unico tramo AF con
// longitud_m y accesorios=[] (relevado, sin accesorios) -- el caso mas
// simple posible de camino end-to-end resoluble en modo detallado.
function proyectoUnTerminalCompleto(opts?: {
  omitLongitud?: boolean
  omitAccesorios?: boolean
  accesorios?: readonly AccesorioDeTramo[]
  artefactoIdCatalogo?: string
}): Proyecto {
  const o = opts ?? {}
  const artefactoIdCatalogo = o.artefactoIdCatalogo ?? 'lavatorio'
  // GEOM-UX-01: la cota efectiva del terminal se deriva de la cota de
  // piso de la UF (0) + la altura hidraulica sobre piso. Se fija un
  // override de altura (3) en el artefacto para que la efectiva
  // reproduzca la cota_m clasica del Nodo (3) y el fixture sea
  // autocontenido incluso con `artefactoIdCatalogo` sintetico (fuera de
  // la Tabla IUAS).
  const uf: UnidadFuncional = {
    id: 'uf-1',
    nombre: 'uf-1',
    cotaHidraulicaReferencia_m: 0,
    locales: [
      {
        id: 'local-1',
        tipo: 'bano',
        regimen: 'domiciliario',
        artefactos: [{ ...artefacto('inst-1', artefactoIdCatalogo), alturaHidraulicaSobrePiso_m: 3 }],
      },
    ],
  }
  const nodos: Nodo[] = [
    { id: 'raiz', cota_m: 0 },
    { id: 'terminal', referencia: referenciaDe('uf-1', 'local-1', 'inst-1'), cota_m: 3 },
  ]
  const tramos: Tramo[] = [
    {
      id: 't0',
      nodoOrigenId: 'raiz',
      nodoDestinoId: 'terminal',
      red: 'AF',
      // longitud_m >= |desnivel| (CRIT-A20): con cota_m 0->3, 4m es
      // fisicamente consistente.
      ...(o.omitLongitud ? {} : { longitud_m: 4 }),
      ...(o.omitAccesorios ? {} : { accesorios: o.accesorios ?? [] }),
    },
  ]
  return proyectoCon([uf], { nodos, tramos })
}

// raiz(cota0) -> mid -> dos terminales hermanos del mismo Local
// (lavatorio cota3, ducha cota8) -- n=2 terminales fisicos AF en
// 'local-1', util tanto para modo estimado (1 tee estimada) como para
// demostrar el terminal critico entre dos caminos reales distintos.
function proyectoDosTerminales(metodoPerdidaLocalizada: MetodoPerdidaLocalizada): Proyecto {
  // GEOM-UX-01: cota efectiva derivada = cota de piso de la UF (0) +
  // altura IUAS del tipo (lavatorio 0,90; ducha 2,00). Las cota_m de los
  // Nodos (3 y 8) se ignoran. Los tests comparan los dos márgenes entre
  // sí (via el propio motor), no contra un golden absoluto.
  const uf: UnidadFuncional = {
    id: 'uf-1',
    nombre: 'uf-1',
    cotaHidraulicaReferencia_m: 0,
    locales: [
      {
        id: 'local-1',
        tipo: 'bano',
        regimen: 'domiciliario',
        artefactos: [artefacto('inst-lavatorio', 'lavatorio'), artefacto('inst-ducha', 'receptaculoDucha')],
      },
    ],
  }
  const nodos: Nodo[] = [
    { id: 'raiz', cota_m: 0 },
    { id: 'mid' },
    { id: 'terminal-lavatorio', referencia: referenciaDe('uf-1', 'local-1', 'inst-lavatorio'), cota_m: 3 },
    { id: 'terminal-ducha', referencia: referenciaDe('uf-1', 'local-1', 'inst-ducha'), cota_m: 8 },
  ]
  const tramos: Tramo[] = [
    { id: 't0', nodoOrigenId: 'raiz', nodoDestinoId: 'mid', red: 'AF', longitud_m: 4, accesorios: [] },
    { id: 't-lavatorio', nodoOrigenId: 'mid', nodoDestinoId: 'terminal-lavatorio', red: 'AF', longitud_m: 3, accesorios: [] },
    { id: 't-ducha', nodoOrigenId: 'mid', nodoDestinoId: 'terminal-ducha', red: 'AF', longitud_m: 8, accesorios: [] },
  ]
  return proyectoCon([uf], { nodos, tramos }, metodoPerdidaLocalizada)
}

describe('resolverEstadoModulo2 — noIniciado', () => {
  it('Proyecto sin redHidraulica -> noIniciado', () => {
    const proyecto = proyectoCon([], undefined)

    const resultado = resolverEstadoModulo2(
      proyecto,
      P_DISPONIBLE,
      HF_MEDIDOR_MCA,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado).toEqual({ estado: 'noIniciado' })
  })

  it('redHidraulica presente pero vacia (sin nodos) NO es noIniciado -- ya esta "iniciada", cae en incompleto', () => {
    const proyecto = proyectoCon([], { nodos: [], tramos: [] })

    const resultado = resolverEstadoModulo2(
      proyecto,
      P_DISPONIBLE,
      HF_MEDIDOR_MCA,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado).toEqual({ estado: 'incompleto', motivos: [{ tipo: 'sinTerminalesHidraulicos' }] })
  })
})

describe('resolverEstadoModulo2 — incompleto (falta informacion legitima)', () => {
  it('tramo sin longitud_m -> incompleto con motivo perdidaDistribuidaIncompleta', () => {
    const proyecto = proyectoUnTerminalCompleto({ omitLongitud: true })

    const resultado = resolverEstadoModulo2(
      proyecto,
      P_DISPONIBLE,
      HF_MEDIDOR_MCA,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado).toEqual({
      estado: 'incompleto',
      motivos: [
        {
          tipo: 'perdidaDistribuidaIncompleta',
          nodoId: 'terminal',
          tramosNoResueltos: [{ tramoId: 't0', motivo: 'sinLongitud' }],
        },
      ],
    })
  })

  it('falta Pdisponible -> incompleto, nunca error', () => {
    const proyecto = proyectoUnTerminalCompleto()

    const resultado = resolverEstadoModulo2(
      proyecto,
      undefined,
      HF_MEDIDOR_MCA,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado).toEqual({ estado: 'incompleto', motivos: [{ tipo: 'presionDisponibleNoProvista' }] })
  })

  it('falta hfMedidor_mca -> incompleto, nunca error', () => {
    const proyecto = proyectoUnTerminalCompleto()

    const resultado = resolverEstadoModulo2(
      proyecto,
      P_DISPONIBLE,
      undefined,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado).toEqual({
      estado: 'incompleto',
      motivos: [{ tipo: 'balanceIncompleto', nodoId: 'terminal', terminosFaltantes: ['hfMedidor'] }],
    })
  })

  it('modo detallado, accesorios sin relevar (undefined) -> incompleto con motivo perdidaLocalizadaIncompleta, impide completo', () => {
    const proyecto = proyectoUnTerminalCompleto({ omitAccesorios: true })

    const resultado = resolverEstadoModulo2(
      proyecto,
      P_DISPONIBLE,
      HF_MEDIDOR_MCA,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado).toEqual({
      estado: 'incompleto',
      motivos: [
        {
          tipo: 'perdidaLocalizadaIncompleta',
          nodoId: 'terminal',
          tramosNoResueltos: [{ tramoId: 't0', motivo: 'sinRelevar' }],
        },
      ],
    })
  })

  it('cobertura fisica incompleta (artefacto normativo de M1 sin referencia en redHidraulica) -> incompleto', () => {
    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'uf-1',
      locales: [
        {
          id: 'local-1',
          tipo: 'bano',
          regimen: 'domiciliario',
          artefactos: [artefacto('inst-1', 'lavatorio'), artefacto('inst-2', 'inodoroDeposito')],
        },
      ],
    }
    // Solo 'inst-1' tiene terminal en redHidraulica -- 'inst-2' (M1) queda
    // sin representar (D-delta.26).
    const nodos: Nodo[] = [
      { id: 'raiz', cota_m: 0 },
      { id: 'terminal', referencia: referenciaDe('uf-1', 'local-1', 'inst-1'), cota_m: 3 },
    ]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'raiz', nodoDestinoId: 'terminal', red: 'AF', longitud_m: 4, accesorios: [] }]
    const proyecto = proyectoCon([uf], { nodos, tramos })

    const resultado = resolverEstadoModulo2(
      proyecto,
      P_DISPONIBLE,
      HF_MEDIDOR_MCA,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado.estado).toBe('incompleto')
    if (resultado.estado !== 'incompleto') return
    expect(resultado.motivos).toContainEqual({
      tipo: 'coberturaFisicaIncompleta',
      artefactosSinReferencia: [referenciaDe('uf-1', 'local-1', 'inst-2')],
    })
  })
})

describe('resolverEstadoModulo2 — error (inconsistencia real, no simple falta de dato)', () => {
  it('referencia de Nodo a un Artefacto inexistente -> error, nunca incompleto', () => {
    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'uf-1',
      locales: [{ id: 'local-1', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto('inst-1', 'lavatorio')] }],
    }
    const nodos: Nodo[] = [
      { id: 'raiz', cota_m: 0 },
      // Referencia a 'inst-inexistente': no hay ningun Artefacto con ese
      // id en 'local-1' -- inconsistencia real (referencia rota), no
      // ausencia de dato.
      { id: 'terminal', referencia: referenciaDe('uf-1', 'local-1', 'inst-inexistente'), cota_m: 3 },
    ]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'raiz', nodoDestinoId: 'terminal', red: 'AF', longitud_m: 4, accesorios: [] }]
    const proyecto = proyectoCon([uf], { nodos, tramos })

    const resultado = resolverEstadoModulo2(
      proyecto,
      P_DISPONIBLE,
      HF_MEDIDOR_MCA,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado.estado).toBe('error')
    if (resultado.estado !== 'error') return
    expect(resultado.problemas).toHaveLength(1)
    expect(resultado.problemas[0]).toEqual({
      tipo: 'problemaDeValidacion',
      problema: expect.objectContaining({ codigo: 'redHidraulicaReferenciaArtefactoInvalida' }),
    })
  })

  it('error + faltantes coexistiendo -> precedencia error > incompleto: nunca se reporta incompleto si hay una inconsistencia real', () => {
    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'uf-1',
      locales: [
        {
          id: 'local-1',
          tipo: 'bano',
          regimen: 'domiciliario',
          artefactos: [artefacto('inst-1', 'lavatorio'), artefacto('inst-2', 'inodoroDeposito')],
        },
      ],
    }
    const nodos: Nodo[] = [
      { id: 'raiz', cota_m: 0 },
      // terminal-a: legitimamente incompleto (sin longitud_m).
      { id: 'terminal-a', referencia: referenciaDe('uf-1', 'local-1', 'inst-1'), cota_m: 8 },
      // terminal-b: referencia rota (inconsistencia real).
      { id: 'terminal-b', referencia: referenciaDe('uf-1', 'local-1', 'inst-inexistente'), cota_m: 3 },
    ]
    const tramos: Tramo[] = [
      { id: 'ta', nodoOrigenId: 'raiz', nodoDestinoId: 'terminal-a', red: 'AF', accesorios: [] },
      { id: 'tb', nodoOrigenId: 'raiz', nodoDestinoId: 'terminal-b', red: 'AF', longitud_m: 3, accesorios: [] },
    ]
    const proyecto = proyectoCon([uf], { nodos, tramos })

    const resultado = resolverEstadoModulo2(
      proyecto,
      P_DISPONIBLE,
      HF_MEDIDOR_MCA,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado.estado).toBe('error')
  })
})

describe('resolverEstadoModulo2 — completo', () => {
  it('modo detallado, un terminal end-to-end resuelto -> completo con terminal critico determinado', () => {
    const proyecto = proyectoUnTerminalCompleto()

    const resultado = resolverEstadoModulo2(
      proyecto,
      P_DISPONIBLE,
      HF_MEDIDOR_MCA,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado.estado).toBe('completo')
    if (resultado.estado !== 'completo') return
    expect(resultado.terminalMasDesfavorable.tipo).toBe('determinado')
    expect(resultado.terminalMasDesfavorable.nodoId).toBe('terminal')
    expect(resultado.terminalesFueraDeAlcance).toEqual([])
  })

  it('modo estimado, dos terminales del mismo Local -> completo (cobertura estimada NUNCA se trata como parcial), terminal critico = menor margen real', () => {
    const proyecto = proyectoDosTerminales('estimado')

    const resultado = resolverEstadoModulo2(
      proyecto,
      P_DISPONIBLE,
      HF_MEDIDOR_MCA,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado.estado).toBe('completo')
    if (resultado.estado !== 'completo') return
    expect(resultado.terminalMasDesfavorable.tipo).toBe('determinado')

    // El terminal critico reportado por M2 debe coincidir con el de
    // menor margen entre los dos caminos reales -- calculado aca a
    // partir del propio motor de presion, no hardcodeado (mismo
    // criterio que el test de integracion de resolverTerminalMasDesfavorable).
    const margenes = (['terminal-lavatorio', 'terminal-ducha'] as const).map((nodoId) => {
      const r = resolverPresionResidualDeCamino(
        proyecto,
        nodoId,
        P_DISPONIBLE,
        HF_MEDIDOR_MCA,
        catalogoArtefactos,
        catalogoSistemasDeTuberia,
        catalogoMaterialesTuberia,
      )
      if (r.tipo !== 'balanceCompleto') throw new Error('fixture: se esperaba balanceCompleto')
      return { nodoId, margen: r.presionResidual_mca - r.presionMinimaRequerida_mca }
    })
    const peor = margenes[0]!.margen <= margenes[1]!.margen ? margenes[0]! : margenes[1]!
    expect(resultado.terminalMasDesfavorable.nodoId).toBe(peor.nodoId)
  })

  it('M3-E (D-δ.58): hfMedidor_mca puede ser una funcion por terminal -- el termino es realmente por-camino, no un escalar global', () => {
    const proyecto = proyectoDosTerminales('estimado')
    const criticoCon = (hf: (nodoId: string) => number) => {
      const r = resolverEstadoModulo2(
        proyecto,
        P_DISPONIBLE,
        hf,
        catalogoArtefactos,
        catalogoSistemasDeTuberia,
        catalogoMaterialesTuberia,
      )
      if (r.estado !== 'completo') throw new Error('esperaba completo')
      return r.terminalMasDesfavorable.nodoId
    }
    // hf grande sobre el lavatorio vs. grande sobre la ducha -> el critico
    // cambia. Un escalar global no podria producir dos criticos distintos.
    expect(criticoCon((n) => (n === 'terminal-lavatorio' ? 8 : 0.1))).toBe('terminal-lavatorio')
    expect(criticoCon((n) => (n === 'terminal-ducha' ? 8 : 0.1))).toBe('terminal-ducha')
  })

  it('M3-E: hfMedidor_mca funcion que devuelve undefined para un terminal -> ese balance queda incompleto (nunca 0)', () => {
    const proyecto = proyectoDosTerminales('estimado')
    const resultado = resolverEstadoModulo2(
      proyecto,
      P_DISPONIBLE,
      (nodoId: string) => (nodoId === 'terminal-lavatorio' ? undefined : 1),
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )
    expect(resultado.estado).toBe('incompleto')
    if (resultado.estado !== 'incompleto') return
    expect(
      resultado.motivos.some(
        (m) => m.tipo === 'balanceIncompleto' && m.nodoId === 'terminal-lavatorio' && m.terminosFaltantes.includes('hfMedidor'),
      ),
    ).toBe(true)
  })

  it('CRIT-A24/D-delta.27: fallback de Vmin (menor DN comercial con V<Vmin) NO transforma artificialmente el modulo en incompleto/error', () => {
    // Artefacto sintetico con Qc=0.15 l/s (mismo valor que el caso real
    // valvulaMingitorio, ver resolverDiametroComercialDeTramo.test.ts) --
    // sobre el catalogo comercial REAL (acquaSystemMagnumPn20), el menor
    // diametro (20mm, Di=14.4mm) da V≈0,921 m/s < Vmin=1: dispara el
    // fallback D-delta.27 (conCandidato, velocidadPorDebajoDelMinimo=true),
    // nunca sinCandidatoAdmisible.
    const catalogoQuBajo: readonly ArtefactoNormativo[] = [
      {
        id: 'artefacto-qu-bajo',
        nombre: 'Artefacto de prueba Qu bajo (ficticio)',
        regimen: 'domiciliario',
        quTotal_lps: 0.15,
        quFria_lps: 0.15,
        quCaliente_lps: 0,
        presionMinima_kgcm2: 0.6,
        limpiezaConValvulaAutomatica: false,
        origen: 'normativo',
        referenciaArticulo: 'fixture de prueba, sin referencia normativa real',
      },
    ]
    const proyecto = proyectoUnTerminalCompleto({ artefactoIdCatalogo: 'artefacto-qu-bajo' })

    // Confirma la premisa: el fallback SI se activa para este tramo.
    const diametro = resolverPresionResidualDeCamino(
      proyecto,
      'terminal',
      P_DISPONIBLE,
      HF_MEDIDOR_MCA,
      catalogoQuBajo,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )
    if (diametro.tipo !== 'balanceCompleto') throw new Error('fixture: se esperaba balanceCompleto (con fallback Vmin)')

    const resultado = resolverEstadoModulo2(
      proyecto,
      P_DISPONIBLE,
      HF_MEDIDOR_MCA,
      catalogoQuBajo,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado.estado).toBe('completo')
  })

  it('terminal sin presionMinima_kgcm2 publicada (p.ej. maquinaLavavajillas) no bloquea completo -- se excluye y se reporta aparte', () => {
    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'uf-1',
      cotaHidraulicaReferencia_m: 0,
      locales: [
        {
          id: 'local-1',
          tipo: 'cocina',
          regimen: 'domiciliario',
          artefactos: [artefacto('inst-lavatorio', 'lavatorio'), artefacto('inst-lavavajillas', 'maquinaLavavajillas')],
        },
      ],
    }
    const nodos: Nodo[] = [
      { id: 'raiz', cota_m: 0 },
      { id: 'terminal-lavatorio', referencia: referenciaDe('uf-1', 'local-1', 'inst-lavatorio'), cota_m: 3 },
      { id: 'terminal-lavavajillas', referencia: referenciaDe('uf-1', 'local-1', 'inst-lavavajillas'), cota_m: 3 },
    ]
    const tramos: Tramo[] = [
      { id: 't-lavatorio', nodoOrigenId: 'raiz', nodoDestinoId: 'terminal-lavatorio', red: 'AF', longitud_m: 3, accesorios: [] },
      { id: 't-lavavajillas', nodoOrigenId: 'raiz', nodoDestinoId: 'terminal-lavavajillas', red: 'AF', longitud_m: 3, accesorios: [] },
    ]
    const proyecto = proyectoCon([uf], { nodos, tramos })

    const resultado = resolverEstadoModulo2(
      proyecto,
      P_DISPONIBLE,
      HF_MEDIDOR_MCA,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado.estado).toBe('completo')
    if (resultado.estado !== 'completo') return
    expect(resultado.terminalMasDesfavorable.nodoId).toBe('terminal-lavatorio')
    expect(resultado.terminalesFueraDeAlcance).toEqual([
      { tipo: 'sinPresionMinimaPublicada', nodoId: 'terminal-lavavajillas', artefactoIdCatalogo: 'maquinaLavavajillas' },
    ])
  })
})

// Test clave de regresión de D-δ.44 (corrección de granularidad de
// D-δ.43): un Local con 3 Artefactos (Lavatorio, Ducha, Inodoro a
// depósito) tras DOS tees anidadas -- exactamente el escenario que D-δ.43
// convirtió incorrectamente en unidades de relevamiento por Artefacto.
// Topología: raiz -> t0 (representativo de local-1/AF, CON su propia
// longitud/accesorios) -> n-tee1 (tee1) -bifurca-> lavatorio y n-tee2;
// n-tee2 (tee2) -bifurca-> ducha e inodoro. NINGÚN Tramo más profundo que
// t0 tiene longitud_m ni accesorios propios -- ambas tees SÍ están
// configuradas (CRIT-A31 no depende de la granularidad). El balance debe
// completarse igual, sin ese dato "por artefacto".
function proyectoLocalTresArtefactosConTeesAnidadas(granularidad: 'simplificada' | 'profesional'): Proyecto {
  const uf: UnidadFuncional = {
    id: 'uf-1',
    nombre: 'uf-1',
    // D-delta.46: bajo granularidad 'simplificada' los terminales ya no
    // usan su propio cota_m (ver mas abajo) -- toman la de la UF. Se fija
    // igual a la de los terminales (3) para no alterar el desnivel
    // esperado por este test (que sigue siendo sobre 'profesional' con
    // la misma topologia, ver el describe de mas abajo).
    cotaHidraulicaReferencia_m: 3,
    locales: [
      {
        id: 'local-1',
        tipo: 'bano',
        regimen: 'domiciliario',
        artefactos: [
          artefacto('inst-lavatorio', 'lavatorio'),
          artefacto('inst-ducha', 'receptaculoDucha'),
          artefacto('inst-inodoro', 'inodoroDeposito'),
        ],
      },
    ],
  }
  const nodos: Nodo[] = [
    // raiz -> n-0 es Distribución General (mismo patrón que t-general ->
    // n-0 en el proyecto demo real, MotorDemandaPantalla.tsx) -- SIN este
    // nivel intermedio, t0 (el primer Tramo tras la raíz absoluta) queda
    // misclasificado como si fuera él mismo el representativo de
    // local-1, exactamente el mismo caso límite documentado en
    // acumularPerdidaLocalizadaDeCamino.test.ts (proyectoConTee).
    { id: 'raiz', cota_m: 0 },
    { id: 'n-0' },
    { id: 'n-tee1', tee: { tipo: 'entradaCentral' } },
    { id: 'n-tee2', tee: { tipo: 'entradaCentral' } },
    { id: 'terminal-lavatorio', referencia: referenciaDe('uf-1', 'local-1', 'inst-lavatorio'), cota_m: 3 },
    { id: 'terminal-ducha', referencia: referenciaDe('uf-1', 'local-1', 'inst-ducha'), cota_m: 3 },
    { id: 'terminal-inodoro', referencia: referenciaDe('uf-1', 'local-1', 'inst-inodoro'), cota_m: 3 },
  ]
  const tramos: Tramo[] = [
    { id: 't-general', nodoOrigenId: 'raiz', nodoDestinoId: 'n-0', red: 'AF', longitud_m: 2, accesorios: [] },
    // Único Tramo "relevable" bajo granularidad simplificada: representativo de local-1/AF.
    { id: 't0', nodoOrigenId: 'n-0', nodoDestinoId: 'n-tee1', red: 'AF', longitud_m: 4, accesorios: [] },
    // Ramales -- deliberadamente SIN longitud_m ni accesorios.
    { id: 't-lavatorio', nodoOrigenId: 'n-tee1', nodoDestinoId: 'terminal-lavatorio', red: 'AF' },
    { id: 't-a-tee2', nodoOrigenId: 'n-tee1', nodoDestinoId: 'n-tee2', red: 'AF' },
    { id: 't-ducha', nodoOrigenId: 'n-tee2', nodoDestinoId: 'terminal-ducha', red: 'AF' },
    { id: 't-inodoro', nodoOrigenId: 'n-tee2', nodoDestinoId: 'terminal-inodoro', red: 'AF' },
  ]
  const proyecto = proyectoCon([uf], { nodos, tramos })
  return {
    ...proyecto,
    configuracionHidraulica: { ...proyecto.configuracionHidraulica, granularidadHidraulica: granularidad },
  }
}

describe("resolverEstadoModulo2 — granularidadHidraulica 'simplificada' (D-δ.44, test clave de regresión)", () => {
  it('Local con 3 Artefactos y 2 tees anidadas llega a completo SIN longitud/accesorios en ningún ramal terminal', () => {
    const proyecto = proyectoLocalTresArtefactosConTeesAnidadas('simplificada')
    expect(validarRedHidraulica(proyecto)).toEqual([])

    const resultado = resolverEstadoModulo2(
      proyecto,
      P_DISPONIBLE,
      HF_MEDIDOR_MCA,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado.estado).toBe('completo')
    if (resultado.estado !== 'completo') return
    expect(resultado.terminalMasDesfavorable.tipo).toBe('determinado')
    expect(resultado.terminalesFueraDeAlcance).toEqual([])
  })

  it("'profesional' (default): la MISMA topología, sin longitud/accesorios en los ramales, queda incompleta -- confirma que el cambio de comportamiento es exclusivo de 'simplificada'", () => {
    const proyecto = proyectoLocalTresArtefactosConTeesAnidadas('profesional')

    const resultado = resolverEstadoModulo2(
      proyecto,
      P_DISPONIBLE,
      HF_MEDIDOR_MCA,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado.estado).toBe('incompleto')
  })
})

// D-delta.46: cota hidraulica de referencia por UnidadFuncional bajo
// granularidad 'simplificada'.
describe("resolverEstadoModulo2 — cota por UnidadFuncional en granularidadHidraulica 'simplificada' (D-delta.46)", () => {
  it('UF sin cotaHidraulicaReferencia_m -> incompleto con UN solo motivo unidadFuncionalSinCotaDeReferencia, aunque la UF tenga 3 terminales', () => {
    // Reutiliza el fixture de 3 terminales (Lavatorio/Ducha/Inodoro) de
    // D-delta.44 pero SIN fijar cotaHidraulicaReferencia_m en la UF --
    // los 3 terminales comparten la misma UF, asi que deben deduplicar a
    // UN unico motivo, nunca 3 (uno por Artefacto).
    const proyecto = proyectoLocalTresArtefactosConTeesAnidadas('simplificada')
    const proyectoSinCotaUF: Proyecto = {
      ...proyecto,
      // Reconstruye cada UF sin cotaHidraulicaReferencia_m explícitamente
      // (en vez de desestructurar para descartarla): exactOptionalPropertyTypes
      // no admite asignarle `undefined`, y desestructurar dejaría una
      // variable sin usar.
      unidadesFuncionales: proyecto.unidadesFuncionales.map((uf) => ({
        id: uf.id,
        nombre: uf.nombre,
        locales: uf.locales,
      })),
    }

    const resultado = resolverEstadoModulo2(
      proyectoSinCotaUF,
      P_DISPONIBLE,
      HF_MEDIDOR_MCA,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado).toEqual({
      estado: 'incompleto',
      motivos: [{ tipo: 'unidadFuncionalSinCotaDeReferencia', unidadFuncionalId: 'uf-1' }],
    })
  })

  it('UF CON cotaHidraulicaReferencia_m -> completo, sin pedir cota individual a ninguno de los 3 terminales', () => {
    const proyecto = proyectoLocalTresArtefactosConTeesAnidadas('simplificada')
    expect(proyecto.unidadesFuncionales[0]!.cotaHidraulicaReferencia_m).toBeDefined()

    const resultado = resolverEstadoModulo2(
      proyecto,
      P_DISPONIBLE,
      HF_MEDIDOR_MCA,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    expect(resultado.estado).toBe('completo')
  })
})
