// Golden/integración de N3: valores esperados calculados de forma
// independiente (formulas normativas ya cerradas -- CRIT-A10/A17/A18/A21
// -- reimplementadas en un script aparte, nunca invocando
// resolverPerdidaDistribuidaDeTramo ni resolverDiametroComercialDeTramo
// para derivar el expected), mismo criterio que
// resolverHidraulicaDeTramo.golden.test.ts. Fixture única compartida:
// vivienda individual, un lavatorio, AF, Qc=0.2 l/s (n=1, CRIT-A4),
// longitud_m=3m, material PPR + sistema comercial real Acqua System
// Magnum PN20 (candidato "20 mm", Di efectivo=14.4mm).
// Correctivo 2A (CRIT-A23): no existe un caso "velocidad noAdmisible con
// conPerdidaDistribuida" -- resolverDiametroComercialDeTramo ya descarta
// todo candidato no admisible antes de devolver 'conCandidato', así que
// esa combinación dejó de ser alcanzable por la selección automática. No
// se agrega un test que la fuerce artificialmente ni se anticipa una
// futura selección manual todavía inexistente.
import { describe, it, expect } from 'vitest'
import type { Artefacto, MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, ReferenciaDeArtefacto, Tramo } from '../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { validarRedHidraulica } from '../../validacion/redHidraulica'
import { resolverPerdidaDistribuidaDeTramo } from './resolverPerdidaDistribuidaDeTramo'
import { catalogoSistemasDeTuberia, type SistemaDeTuberiaCatalogado } from './sistemaDeTuberia'
import { catalogoMaterialesTuberia } from './materialTuberia'
import { calcularNumeroReynolds } from './perdidaCarga/darcyWeisbach/calcularNumeroReynolds'
import { UMBRAL_REYNOLDS_TURBULENTO } from './perdidaCarga/darcyWeisbach/calcularFactorFriccionDarcy'
import { resolverPropiedadesAguaParaRed } from './perdidaCarga/darcyWeisbach/propiedadesAguaDarcy'

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
    configuracionHidraulica: { metodoPerdidaDistribuida, materialTuberiaId: 'ppr', sistemaDeTuberiaId },
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
  })

})

// Propiedad derivada (Correctivo 2A): bajo CRIT-A19+CRIT-A21+CRIT-A23,
// ningún candidato adoptado automáticamente por resolverDiametroComercialDeTramo
// puede caer fuera del dominio turbulento de Darcy -- por eso
// ResultadoPerdidaDistribuidaDeTramo ya NO tiene una variante
// 'fueraDeDominioTurbulento' (decisión definitiva, no un estado
// "inalcanzable pero conservado"). Se demuestra aquí, componiendo las
// primitivas reales (sin invocar resolverPerdidaDistribuidaDeTramo, que
// no es lo que esta propiedad prueba), en el límite más desfavorable que
// CRIT-A19 puede admitir: Di=13mm (el diámetro más chico del dominio
// normativo) con V=1 m/s (la velocidad mínima admisible en ese rango).
// Cualquier candidato real admitido por CRIT-A23 tiene Di≥13mm y V≥1 m/s
// (o V≥1,5 m/s si Di≥75mm, un caso todavía más favorable a Re alto) --
// este es el punto de menor Re posible dentro de todo el dominio
// admisible. El guard Re<UMBRAL_REYNOLDS_TURBULENTO permanece intacto en
// calcularFactorFriccionDarcy (CRIT-A18) como defensa de la primitiva
// matemática; esta propiedad es la razón por la que, en la práctica, ese
// guard nunca se dispara en el camino productivo automático.
describe('resolverPerdidaDistribuidaDeTramo — propiedad derivada (CRIT-A19+CRIT-A21+CRIT-A23)', () => {
  it('límite más desfavorable admisible por CRIT-A19 (Di=13mm, V=1 m/s) con ν productiva de N2 ya da Re>UMBRAL_REYNOLDS_TURBULENTO', () => {
    const { viscosidadCinematica_m2s } = resolverPropiedadesAguaParaRed('AF')

    const reynolds = calcularNumeroReynolds(1, 13, viscosidadCinematica_m2s)

    expect(reynolds).toBeCloseTo(12955.949770779349, 6)
    expect(reynolds).toBeGreaterThan(UMBRAL_REYNOLDS_TURBULENTO)
  })
})
