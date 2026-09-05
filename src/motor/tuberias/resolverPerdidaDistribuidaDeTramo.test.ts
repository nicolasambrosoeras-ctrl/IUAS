// Golden/integración de N3: valores esperados calculados de forma
// independiente (formulas normativas ya cerradas -- CRIT-A10/A17/A18/A21
// -- reimplementadas en un script aparte, nunca invocando
// resolverPerdidaDistribuidaDeTramo ni resolverDiametroComercialDeTramo
// para derivar el expected), mismo criterio que
// resolverHidraulicaDeTramo.golden.test.ts. Fixture única compartida:
// vivienda individual, un lavatorio, AF, Qc=0.2 l/s (n=1, CRIT-A4),
// longitud_m=3m, material PPR + sistema comercial real Acqua System
// Magnum PN20 (candidato "20 mm", Di efectivo=14.4mm).
// Correctivo 2A (CRIT-A23): "velocidad noAdmisible con conPerdidaDistribuida"
// vuelve a ser alcanzable desde D-delta.27 (fallback acotado a Vmin) --
// ver el bloque "casos de dominio" para el caso con velocidadPorDebajoDelMinimo.
import { describe, it, expect } from 'vitest'
import type { Artefacto, MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, ReferenciaDeArtefacto, Tramo } from '../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { validarRedHidraulica } from '../../validacion/redHidraulica'
import { resolverPerdidaDistribuidaDeTramo } from './resolverPerdidaDistribuidaDeTramo'
import { catalogoSistemasDeTuberia, obtenerSistemaDeTuberia, type SistemaDeTuberiaCatalogado } from './sistemaDeTuberia'
import { catalogoMaterialesTuberia } from './materialTuberia'
import { obtenerEntradasOrdenadasPorDiametroInterior } from './diametroComercial/obtenerEntradasOrdenadasPorDiametroInterior'
import { calcularVelocidad } from './perdidaCarga/darcyWeisbach/calcularVelocidad'
import { calcularNumeroReynolds } from './perdidaCarga/darcyWeisbach/calcularNumeroReynolds'
import { UMBRAL_REYNOLDS_TURBULENTO } from './perdidaCarga/darcyWeisbach/calcularFactorFriccionDarcy'
import { resolverPropiedadesAguaParaRed } from './perdidaCarga/darcyWeisbach/propiedadesAguaDarcy'
import { verificarVelocidadAdmisible } from './velocidad/verificarVelocidadAdmisible'

function metadatos(): MetadatosProyecto {
  return {
    nombre: 'Proyecto golden N3',
    obra: 'Obra golden N3',
    comitente: 'Comitente golden N3',
    fecha: '2026-01-01',
    schemaVersion: '1.0.0',
    versionNormativa: 'eras-2023',
  }
}

function parametros(): ParametrosProyecto {
  return { tipoDeProyecto: 'viviendaIndividual', presionSobreAcera_m: 0, alturaArtefactoMasDesfavorable_m: 0 }
}

function proyectoCon(
  unidadesFuncionales: readonly UnidadFuncional[],
  redHidraulica: RedHidraulica,
  metodoPerdidaDistribuida: 'hazenWilliams' | 'darcyWeisbach',
  sistemaDeTuberiaId = 'acquaSystemMagnumPn20',
): Proyecto {
  return {
    metadatos: metadatos(),
    parametros: parametros(),
    unidadesFuncionales,
    redHidraulica,
    configuracionHidraulica: { metodoPerdidaDistribuida, metodoPerdidaLocalizada: 'detallado', granularidadHidraulica: 'profesional', materialTuberiaId: 'ppr', sistemaDeTuberiaId },
  }
}

function artefacto(idInstancia: string, artefactoIdCatalogo: string): Artefacto {
  return { id: idInstancia, artefactoId: artefactoIdCatalogo, cantidad: 1, origen: 'normativo' }
}

function unidadFuncionalCon(unidadFuncionalId: string, localId: string, artefactos: readonly Artefacto[]): UnidadFuncional {
  return {
    id: unidadFuncionalId,
    nombre: unidadFuncionalId,
    locales: [{ id: localId, tipo: 'bano', regimen: 'domiciliario', artefactos }],
  }
}

function referenciaDe(unidadFuncionalId: string, localId: string, artefactoId: string): ReferenciaDeArtefacto {
  return { tipo: 'artefacto', unidadFuncionalId, localId, artefactoId }
}

// Fixture compartida: lavatorio único, red AF, longitud_m=3 -- conectividad
// física soloAF (CRIT-A15) usa quTotal_lps=0.2, n=1 (CRIT-A4) -> Qc=0.2 l/s.
function proyectoConLavatorioUnico(
  metodoPerdidaDistribuida: 'hazenWilliams' | 'darcyWeisbach',
  sistemaDeTuberiaId?: string,
  longitud_m: number | undefined = 3,
): { proyecto: Proyecto; tramoId: string } {
  const lavatorio = artefacto('inst-lavatorio', 'lavatorio')
  const uf = unidadFuncionalCon('uf-1', 'local-1', [lavatorio])
  const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: referenciaDe('uf-1', 'local-1', 'inst-lavatorio') }]
  const tramos: Tramo[] = [
    { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF', ...(longitud_m !== undefined ? { longitud_m } : {}) },
  ]
  const proyecto =
    sistemaDeTuberiaId === undefined
      ? proyectoCon([uf], { nodos, tramos }, metodoPerdidaDistribuida)
      : proyectoCon([uf], { nodos, tramos }, metodoPerdidaDistribuida, sistemaDeTuberiaId)
  return { proyecto, tramoId: 't0' }
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

describe('resolverPerdidaDistribuidaDeTramo — golden', () => {
  it('Golden Hazen — Qc=0.2 l/s, candidato 20mm (Di=14.4mm), C=150, L=3m', () => {
    const { proyecto, tramoId } = proyectoConLavatorioUnico('hazenWilliams')
    expect(validarRedHidraulica(proyecto)).toEqual([])

    const resultado = resolverPerdidaDistribuidaDeTramo(
      proyecto,
      tramoId,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    if (resultado.tipo !== 'conPerdidaDistribuida' || resultado.detalle.metodo !== 'hazenWilliams') {
      throw new Error('se esperaba conPerdidaDistribuida/hazenWilliams')
    }

    // Valores calculados de forma independiente (script aparte, CRIT-A10/A17,
    // sin invocar el resolver bajo prueba):
    // Di_min=11.283791670955125mm -> candidato "20 mm" (Di=14.4mm) ->
    // V=1.2280474004004271 m/s -> J=0.1307150589563208 m/m ->
    // hf=J*3=0.3921451768689624 m.
    expect(resultado.qc_lps).toBe(0.2)
    // n=1 (CRIT-A4): un único artefacto conectado.
    expect(resultado.n).toBe(1)
    expect(resultado.diReferenciaPredimensionamiento_mm).toBeCloseTo(11.283791670955125, 9)
    expect(resultado.candidato).toEqual({ denominacionComercial: '20 mm', diametroInteriorEfectivo_mm: 14.4 })
    expect(resultado.velocidadReal_mps).toBeCloseTo(1.2280474004004271, 9)
    expect(resultado.verificacionVelocidad).toEqual({ tipo: 'admisible', limiteMinimo_mps: 1, limiteMaximo_mps: 3 })
    expect(resultado.velocidadPorDebajoDelMinimo).toBe(false)
    expect(resultado.longitud_m).toBe(3)
    expect(resultado.detalle.coeficienteC).toBe(150)
    expect(resultado.detalle.perdidaUnitaria_J_m_m).toBeCloseTo(0.1307150589563208, 9)
    expect(resultado.hf_m).toBeCloseTo(0.3921451768689624, 9)
  })

  it('Golden Darcy — mismo Qc/candidato/L, PPR epsilon=0.007mm, AF -> nu productiva de N2', () => {
    const { proyecto, tramoId } = proyectoConLavatorioUnico('darcyWeisbach')

    const resultado = resolverPerdidaDistribuidaDeTramo(
      proyecto,
      tramoId,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    if (resultado.tipo !== 'conPerdidaDistribuida' || resultado.detalle.metodo !== 'darcyWeisbach') {
      throw new Error('se esperaba conPerdidaDistribuida/darcyWeisbach')
    }

    // Valores calculados de forma independiente (script aparte, CRIT-A18/A21,
    // sin invocar el resolver bajo prueba): misma V=1.2280474004004271 m/s
    // (reutilizada, no recalculada) -> nu=1.0034e-6 m2/s (20°C, AF) ->
    // Re=17623.96109803284 (turbulento) -> f (Haaland, epsilon=0.007mm)
    // =0.027405639751638396 -> hf=0.4388640073359451 m.
    expect(resultado.qc_lps).toBe(0.2)
    // n=1 (CRIT-A4): un único artefacto conectado.
    expect(resultado.n).toBe(1)
    expect(resultado.velocidadReal_mps).toBeCloseTo(1.2280474004004271, 9)
    expect(resultado.velocidadPorDebajoDelMinimo).toBe(false)
    expect(resultado.longitud_m).toBe(3)
    expect(resultado.detalle.rugosidadAbsoluta_mm).toBe(0.007)
    expect(resultado.detalle.temperaturaReferencia_C).toBe(20)
    expect(resultado.detalle.viscosidadCinematica_m2s).toBe(1.0034e-6)
    expect(resultado.detalle.reynolds).toBeCloseTo(17623.96109803284, 4)
    expect(resultado.detalle.factorFriccion).toBeCloseTo(0.027405639751638396, 9)
    expect(resultado.hf_m).toBeCloseTo(0.4388640073359451, 9)
  })
})

describe('resolverPerdidaDistribuidaDeTramo — casos de dominio', () => {
  it('sinDemanda: propaga sinDemanda sin intentar calcular hf', () => {
    const inodoro = artefacto('inst-inodoro', 'inodoroValvula')
    const uf = unidadFuncionalCon('uf-1', 'local-bano', [inodoro])
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: referenciaDe('uf-1', 'local-bano', 'inst-inodoro') }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AC', longitud_m: 5 }]
    const proyecto = proyectoCon([uf], { nodos, tramos }, 'hazenWilliams')

    const resultado = resolverPerdidaDistribuidaDeTramo(proyecto, 't0', catalogoArtefactos, catalogoSistemasDeTuberia, catalogoMaterialesTuberia)

    expect(resultado).toEqual({ tipo: 'sinDemanda', qc_lps: 0 })
  })

  it('sinCandidatoAdmisible: único candidato del sistema queda fuera del dominio normativo -> propagado, sin calcular pérdida', () => {
    const { proyecto, tramoId } = proyectoConLavatorioUnico('hazenWilliams', 'sistema-insuficiente')

    const resultado = resolverPerdidaDistribuidaDeTramo(proyecto, tramoId, catalogoArtefactos, SISTEMA_INSUFICIENTE, catalogoMaterialesTuberia)

    expect(resultado).toEqual({ tipo: 'sinCandidatoAdmisible', qc_lps: 0.2, n: 1, diReferenciaPredimensionamiento_mm: 11.283791670955125 })
  })

  it('sinLongitud: candidato ya resuelto se preserva, sin asumir longitud=0 ni derivarla', () => {
    // Mismo fixture base, pero sin longitud_m en el tramo -- construido
    // aparte (no vía proyectoConLavatorioUnico) para que el parámetro
    // opcional longitud_m realmente esté ausente y no dispare su default.
    const lavatorio = artefacto('inst-lavatorio', 'lavatorio')
    const uf = unidadFuncionalCon('uf-1', 'local-1', [lavatorio])
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: referenciaDe('uf-1', 'local-1', 'inst-lavatorio') }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' }]
    const proyecto = proyectoCon([uf], { nodos, tramos }, 'hazenWilliams')

    const resultado = resolverPerdidaDistribuidaDeTramo(proyecto, 't0', catalogoArtefactos, catalogoSistemasDeTuberia, catalogoMaterialesTuberia)

    if (resultado.tipo !== 'sinLongitud') {
      throw new Error('se esperaba sinLongitud')
    }
    expect(resultado.qc_lps).toBe(0.2)
    // n=1 (CRIT-A4): un único artefacto conectado.
    expect(resultado.n).toBe(1)
    expect(resultado.candidato).toEqual({ denominacionComercial: '20 mm', diametroInteriorEfectivo_mm: 14.4 })
    expect(resultado.velocidadReal_mps).toBeCloseTo(1.2280474004004271, 9)
    expect(resultado.velocidadPorDebajoDelMinimo).toBe(false)
  })

  it('D-delta.27: Qc=0.08 l/s (lavatorio, condición aguaFria, el mínimo real del catálogo) -- fallback de Vmin propagado, Darcy completa sin alcanzar el guard de Reynolds', () => {
    // Artefacto mixto (D-delta.3): mismo lavatorio referenciado por un nodo
    // terminal AF y uno AC -- t0 (AF) evaluado en aislamiento resuelve
    // condición 'aguaFria' (CRIT-A15) -> qu efectivo = quFria_lps = 0.08,
    // el menor qu positivo de todo catalogoArtefactos (ver la propiedad
    // derivada más abajo, calculada del catálogo real, no de este valor
    // a mano). n=1 (CRIT-A4) -> Qc=0.08 l/s exacto, sin intervención de
    // CRIT-A22 (Qmax ya es quMaxParticipante).
    const lavatorio = artefacto('inst-lavatorio', 'lavatorio')
    const uf = unidadFuncionalCon('uf-1', 'local-1', [lavatorio])
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n1', referencia: referenciaDe('uf-1', 'local-1', 'inst-lavatorio') },
      { id: 'n2', referencia: referenciaDe('uf-1', 'local-1', 'inst-lavatorio') },
    ]
    const tramos: Tramo[] = [
      { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF', longitud_m: 3 },
      { id: 't-ac', nodoOrigenId: 'n0', nodoDestinoId: 'n2', red: 'AC' },
    ]
    const proyecto = proyectoCon([uf], { nodos, tramos }, 'darcyWeisbach')

    const resultado = resolverPerdidaDistribuidaDeTramo(proyecto, 't0', catalogoArtefactos, catalogoSistemasDeTuberia, catalogoMaterialesTuberia)

    if (resultado.tipo !== 'conPerdidaDistribuida') {
      throw new Error(`se esperaba conPerdidaDistribuida, se obtuvo "${resultado.tipo}"`)
    }
    expect(resultado.qc_lps).toBe(0.08)
    expect(resultado.n).toBe(1)
    // Menor diámetro comercial normativamente evaluable del sistema real
    // (Acqua System Magnum PN20): "20 mm" (Di=14.4mm), el mismo de todos
    // los demás casos de este archivo -- D-delta.27 nunca elige otro.
    expect(resultado.candidato).toEqual({ denominacionComercial: '20 mm', diametroInteriorEfectivo_mm: 14.4 })
    expect(resultado.velocidadReal_mps).toBeCloseTo(0.4912189601601709, 9)
    expect(resultado.verificacionVelocidad).toEqual({ tipo: 'noAdmisible', limiteMinimo_mps: 1, limiteMaximo_mps: 3 })
    expect(resultado.velocidadPorDebajoDelMinimo).toBe(true)
    // Darcy completa sin lanzar (Re>UMBRAL_REYNOLDS_TURBULENTO, ver la
    // propiedad derivada más abajo) -- el guard de calcularFactorFriccionDarcy
    // no se alcanza con los datos reales vigentes.
    expect(resultado.detalle.metodo).toBe('darcyWeisbach')
    if (resultado.detalle.metodo !== 'darcyWeisbach') {
      throw new Error('se esperaba detalle.metodo="darcyWeisbach"')
    }
    expect(resultado.detalle.reynolds).toBeCloseTo(7049.584439213137, 6)
    expect(resultado.detalle.reynolds).toBeGreaterThan(UMBRAL_REYNOLDS_TURBULENTO)
    expect(resultado.hf_m).toBeGreaterThan(0)
  })
})

// Propiedad derivada (Correctivo 2A): bajo CRIT-A19+CRIT-A21+CRIT-A23,
// ningún candidato adoptado por el camino NORMAL (dentro de rango, sin
// D-delta.27) puede caer fuera del dominio turbulento de Darcy -- por eso
// ResultadoPerdidaDistribuidaDeTramo no tiene una variante
// 'fueraDeDominioTurbulento' (decisión definitiva, no un estado
// "inalcanzable pero conservado"). Se demuestra aquí, componiendo las
// primitivas reales, en el límite más desfavorable que CRIT-A19 puede
// admitir dentro de rango: Di=13mm (el diámetro más chico del dominio
// normativo) con V=1 m/s (la velocidad mínima admisible en ese rango).
// Esta propiedad, sola, YA NO cubre todo el camino productivo desde
// D-delta.27 -- el fallback de Vmin puede adoptar V<1 m/s. Ver el bloque
// siguiente para la garantía que sí cubre ese camino.
describe('resolverPerdidaDistribuidaDeTramo — propiedad derivada (CRIT-A19+CRIT-A21+CRIT-A23, camino normal dentro de rango)', () => {
  it('límite más desfavorable admisible por CRIT-A19 (Di=13mm, V=1 m/s) con ν productiva de N2 ya da Re>UMBRAL_REYNOLDS_TURBULENTO', () => {
    const { viscosidadCinematica_m2s } = resolverPropiedadesAguaParaRed('AF')

    const reynolds = calcularNumeroReynolds(1, 13, viscosidadCinematica_m2s)

    expect(reynolds).toBeCloseTo(12955.949770779349, 6)
    expect(reynolds).toBeGreaterThan(UMBRAL_REYNOLDS_TURBULENTO)
  })
})

// Propiedad derivada (D-delta.27): la garantía turbulenta para el
// fallback de Vmin YA NO puede apoyarse en "V≥Vmin" (deja de ser cierto
// por diseño del fallback) -- pasa a apoyarse en que el catálogo
// normativo vigente (catalogoArtefactos) no tiene ningún qu positivo
// menor al usado acá. El mínimo se calcula programáticamente desde el
// catálogo real (nunca hardcodeado): si una futura edición normativa
// agrega un artefacto con qu menor, este test debe fallar para forzar
// revisar la garantía, no quedar silenciosamente desactualizado. Mismo
// criterio para el Di: se toma el menor candidato normativamente
// evaluable del sistema comercial vigente (no un valor fijo), usando
// verificarVelocidadAdmisible (con una velocidad placeholder, ya que la
// clasificación de dominio depende solo del Di) para no reimplementar
// los límites 13/60/75/200mm de CRIT-A19 en el test.
describe('resolverPerdidaDistribuidaDeTramo — propiedad derivada (D-delta.27: peor Reynolds bajo el fallback de Vmin)', () => {
  it('el menor qu positivo del catálogo normativo, con el menor Di comercial normativamente evaluable del sistema vigente, da Re>UMBRAL_REYNOLDS_TURBULENTO', () => {
    const quPositivos = catalogoArtefactos.flatMap((artefactoNormativo) =>
      [artefactoNormativo.quTotal_lps, artefactoNormativo.quFria_lps, artefactoNormativo.quCaliente_lps].filter(
        (qu): qu is number => qu !== null && qu > 0,
      ),
    )
    const quMinimo_lps = Math.min(...quPositivos)

    const sistema = obtenerSistemaDeTuberia('acquaSystemMagnumPn20', catalogoSistemasDeTuberia)
    const entradasOrdenadas = obtenerEntradasOrdenadasPorDiametroInterior(sistema)
    const candidatoMinimoNormativo = entradasOrdenadas.find(
      (entrada) => verificarVelocidadAdmisible(1, entrada.diametroInteriorEfectivo_mm).tipo !== 'fueraDeDominioNormativo',
    )
    if (candidatoMinimoNormativo === undefined) {
      throw new Error('el sistema comercial vigente no tiene ningún candidato en dominio normativo')
    }

    const velocidad_mps = calcularVelocidad(quMinimo_lps, candidatoMinimoNormativo.diametroInteriorEfectivo_mm)
    const { viscosidadCinematica_m2s } = resolverPropiedadesAguaParaRed('AF')
    const reynolds = calcularNumeroReynolds(velocidad_mps, candidatoMinimoNormativo.diametroInteriorEfectivo_mm, viscosidadCinematica_m2s)

    expect(quMinimo_lps).toBe(0.08)
    expect(candidatoMinimoNormativo.diametroInteriorEfectivo_mm).toBe(14.4)
    expect(reynolds).toBeCloseTo(7049.584439213137, 6)
    expect(reynolds).toBeGreaterThan(UMBRAL_REYNOLDS_TURBULENTO)
  })
})
