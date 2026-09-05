// Tests de integracion del orquestador (CRIT-A23, Correctivo 2A, D-delta.27):
// usan Proyecto/topologia/catalogo reales, sin mockear ninguna primitiva
// interna. Los casos de dominio (sinCandidatoAdmisible, hueco 60-75mm,
// fallback de Vmin) usan catálogos de laboratorio o catalogoArtefactos
// ficticios deliberadamente distintos del real (mismo criterio que
// dimensionamientoComercial.integracion.test.ts), para forzar el
// resultado de forma determinística sin depender de adivinar valores qu
// del catálogo normativo -- salvo los casos B1/B4 y el de
// valvulaMingitorio, que usan el catálogo normativo real a propósito.
// D-delta.27: el fallback de Vmin se aplica exclusivamente sobre el
// PRIMER candidato normativamente evaluable (el menor Di que no resulta
// 'fueraDeDominioNormativo') cuando incumple por defecto de velocidad --
// nunca por exceso (Vmax sigue dura, sin excepción).
import { describe, it, expect } from 'vitest'
import type { Artefacto, MetadatosProyecto, ParametrosProyecto, Proyecto, TipoDeProyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, ReferenciaDeArtefacto, Tramo } from '../../modelo/redHidraulica'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { resolverHidraulicaDeTramo } from './resolverHidraulicaDeTramo'
import { resolverDiametroComercialDeTramo } from './resolverDiametroComercialDeTramo'
import { catalogoSistemasDeTuberia, type SistemaDeTuberiaCatalogado } from './sistemaDeTuberia'
import { obtenerEntradasOrdenadasPorDiametroInterior } from './diametroComercial/obtenerEntradasOrdenadasPorDiametroInterior'
import { calcularVelocidad } from './perdidaCarga/darcyWeisbach/calcularVelocidad'
import { verificarVelocidadAdmisible } from './velocidad/verificarVelocidadAdmisible'

function metadatos(): MetadatosProyecto {
  return {
    nombre: 'Proyecto de prueba',
    obra: 'Obra de prueba',
    comitente: 'Comitente de prueba',
    fecha: '2026-01-01',
    schemaVersion: '1.0.0',
    versionNormativa: 'eras-2023',
  }
}

function parametros(tipoDeProyecto: TipoDeProyecto): ParametrosProyecto {
  return { tipoDeProyecto, presionSobreAcera_m: 0, alturaArtefactoMasDesfavorable_m: 0 }
}

function proyectoCon(
  tipoDeProyecto: TipoDeProyecto,
  unidadesFuncionales: readonly UnidadFuncional[],
  redHidraulica: RedHidraulica,
  sistemaDeTuberiaId = 'acquaSystemMagnumPn20',
): Proyecto {
  return {
    metadatos: metadatos(),
    parametros: parametros(tipoDeProyecto),
    unidadesFuncionales,
    redHidraulica,
    configuracionHidraulica: { metodoPerdidaDistribuida: 'hazenWilliams', metodoPerdidaLocalizada: 'detallado', granularidadHidraulica: 'profesional', materialTuberiaId: 'ppr', sistemaDeTuberiaId },
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

// Fixture compartida: un único artefacto, conectividad física soloAF
// (CRIT-A15) -> qu efectivo = quTotal_lps, n=1 (CRIT-A4) -> Qc = quTotal_lps
// del artefacto. Mismo patrón que el caso 1 de resolverHidraulicaDeTramo.test.ts.
function proyectoConArtefactoUnico(
  artefactoIdCatalogo: string,
  sistemaDeTuberiaId?: string,
): { proyecto: Proyecto; tramoId: string } {
  const inst = artefacto('inst-unico', artefactoIdCatalogo)
  const uf = unidadFuncionalCon('uf-1', 'local-1', [inst])
  const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: referenciaDe('uf-1', 'local-1', 'inst-unico') }]
  const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' }]
  const proyecto =
    sistemaDeTuberiaId === undefined
      ? proyectoCon('oficinaPrivada', [uf], { nodos, tramos })
      : proyectoCon('oficinaPrivada', [uf], { nodos, tramos }, sistemaDeTuberiaId)
  return { proyecto, tramoId: 't0' }
}

// catalogoArtefactos ficticio con un único artefacto de qu explícito, para
// alcanzar valores de Qc concretos (B2/B3) sin replicar la topología
// completa del demo -- n=1 (CRIT-A4) hace Qc=qu directamente.
function catalogoConArtefactoDeQu(qu_lps: number): readonly ArtefactoNormativo[] {
  return [
    {
      id: 'inst-unico',
      nombre: 'Artefacto de prueba (ficticio)',
      regimen: 'domiciliario',
      quTotal_lps: qu_lps,
      quFria_lps: qu_lps,
      quCaliente_lps: 0,
      presionMinima_kgcm2: null,
      limpiezaConValvulaAutomatica: false,
      origen: 'normativo',
      referenciaArticulo: 'fixture de prueba, sin referencia normativa real',
    },
  ]
}

const SISTEMA_SOBREDIMENSIONADO: readonly SistemaDeTuberiaCatalogado[] = [
  {
    id: 'sistema-sobredimensionado',
    denominacion: 'Sistema de laboratorio sobredimensionado (ficticio)',
    materialTuberiaId: 'ppr',
    fabricante: 'Fabricante ficticio',
    referenciaFuenteDimensiones: 'Fuente ficticia de laboratorio',
    entradas: [{ denominacionComercial: '50 mm (ficticio)', diametroInteriorEfectivo_mm: 50 }],
  },
]

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

// Sistema con un candidato "demasiado rápido" en dominio 13-60mm, uno en
// el hueco normativo 60-75mm, y uno admisible en dominio 75-200mm: prueba
// que el hueco se salta sin detener la búsqueda. Di elegidos para que,
// con Qc=10 (ver catalogoConArtefactoDeQu(10) abajo): 45mm da V≈6,288 m/s
// (noAdmisible, demasiado rápido); 65mm cae en el hueco
// (fueraDeDominioNormativo, se descarta sin importar V); 90mm da
// V≈1,572 m/s, dentro de [1,5-2] (admisible) -- calculado de forma
// independiente (script aparte), sin ejecutar el resolver bajo test.
const SISTEMA_CON_HUECO: readonly SistemaDeTuberiaCatalogado[] = [
  {
    id: 'sistema-con-hueco',
    denominacion: 'Sistema de laboratorio con hueco normativo (ficticio)',
    materialTuberiaId: 'ppr',
    fabricante: 'Fabricante ficticio',
    referenciaFuenteDimensiones: 'Fuente ficticia de laboratorio',
    entradas: [
      { denominacionComercial: '45mm (ficticio, demasiado rápido)', diametroInteriorEfectivo_mm: 45 },
      { denominacionComercial: '65mm (ficticio, hueco 60-75)', diametroInteriorEfectivo_mm: 65 },
      { denominacionComercial: '90mm (ficticio, admisible)', diametroInteriorEfectivo_mm: 90 },
    ],
  },
]

describe('resolverDiametroComercialDeTramo (CRIT-A23)', () => {
  it('1. sinDemanda: propaga sinDemanda sin construir candidato', () => {
    const inodoro = artefacto('inst-inodoro', 'inodoroValvula')
    const uf = unidadFuncionalCon('uf-1', 'local-bano', [inodoro])
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: referenciaDe('uf-1', 'local-bano', 'inst-inodoro') }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AC' }]
    const proyecto = proyectoCon('oficinaPrivada', [uf], { nodos, tramos })

    const resultado = resolverDiametroComercialDeTramo(proyecto, 't0', catalogoArtefactos, catalogoSistemasDeTuberia)

    expect(resultado).toEqual({ tipo: 'sinDemanda', qc_lps: 0 })
  })

  it('B1 — Qc=0.2 l/s (lavatorio real): primer candidato admisible del catálogo real, cross-validado contra las primitivas', () => {
    const { proyecto, tramoId } = proyectoConArtefactoUnico('lavatorio')

    const resultado = resolverDiametroComercialDeTramo(proyecto, tramoId, catalogoArtefactos, catalogoSistemasDeTuberia)
    const hidraulico = resolverHidraulicaDeTramo(proyecto, tramoId, catalogoArtefactos)

    if (resultado.tipo !== 'conCandidato' || hidraulico.tipo !== 'conDemanda') {
      throw new Error('se esperaba conCandidato/conDemanda')
    }

    const sistema = catalogoSistemasDeTuberia[0]!
    const entradasOrdenadas = obtenerEntradasOrdenadasPorDiametroInterior(sistema)
    const primerAdmisibleEsperado = entradasOrdenadas.find((entrada) => {
      const v = calcularVelocidad(hidraulico.qc_lps, entrada.diametroInteriorEfectivo_mm)
      return verificarVelocidadAdmisible(v, entrada.diametroInteriorEfectivo_mm).tipo === 'admisible'
    })!
    const velocidadEsperada = calcularVelocidad(hidraulico.qc_lps, primerAdmisibleEsperado.diametroInteriorEfectivo_mm)
    const verificacionEsperada = verificarVelocidadAdmisible(velocidadEsperada, primerAdmisibleEsperado.diametroInteriorEfectivo_mm)

    expect(hidraulico.qc_lps).toBe(0.2)
    // qc_lps/diReferenciaPredimensionamiento_mm se propagan desde
    // resultadoHidraulico ya calculado internamente, sin una segunda
    // llamada al motor de demanda.
    expect(resultado.qc_lps).toBe(hidraulico.qc_lps)
    expect(resultado.n).toBe(hidraulico.simultaneidad.n)
    expect(resultado.diReferenciaPredimensionamiento_mm).toBe(hidraulico.predimensionamiento.diReferenciaPredimensionamiento_mm)
    expect(resultado.candidato).toEqual(primerAdmisibleEsperado)
    expect(resultado.candidato.denominacionComercial).toBe('20 mm')
    expect(resultado.candidato.diametroInteriorEfectivo_mm).toBe(14.4)
    expect(resultado.velocidadReal_mps).toBeCloseTo(1.2280474004004271, 9)
    expect(resultado.velocidadReal_mps).toBe(velocidadEsperada)
    expect(resultado.verificacionVelocidad).toEqual(verificacionEsperada)
    expect(resultado.verificacionVelocidad).toEqual({ tipo: 'admisible', limiteMinimo_mps: 1, limiteMaximo_mps: 3 })
    expect(resultado.velocidadPorDebajoDelMinimo).toBe(false)
  })

  it('B2 — Qc=0.7273238618387272 l/s: nueva política elige 25mm (Di=18.0), la anterior elegía 32mm', () => {
    const catalogoQu = catalogoConArtefactoDeQu(0.7273238618387272)
    const { proyecto, tramoId } = proyectoConArtefactoUnico('inst-unico')

    const resultado = resolverDiametroComercialDeTramo(proyecto, tramoId, catalogoQu, catalogoSistemasDeTuberia)

    if (resultado.tipo !== 'conCandidato') {
      throw new Error('se esperaba conCandidato')
    }
    // n=1 (CRIT-A4): un único artefacto conectado.
    expect(resultado.n).toBe(1)
    // Calculado de forma independiente (no ejecutando el resolver bajo
    // test): V(25mm, Qc=0.7273238618387272)=2.8582021688967947 m/s,
    // dentro de [1,3] -- admisible.
    expect(resultado.candidato).toEqual({ denominacionComercial: '25 mm', diametroInteriorEfectivo_mm: 18.0 })
    expect(resultado.velocidadReal_mps).toBeCloseTo(2.8582021688967947, 9)
    expect(resultado.verificacionVelocidad).toEqual({ tipo: 'admisible', limiteMinimo_mps: 1, limiteMaximo_mps: 3 })
    expect(resultado.velocidadPorDebajoDelMinimo).toBe(false)
  })

  it('B3 — Qc=1.0964415971625976 l/s (Di predimensionamiento≈26.42mm): nueva política elige 32mm (Di=23.2), la anterior elegía 40mm', () => {
    const catalogoQu = catalogoConArtefactoDeQu(1.0964415971625976)
    const { proyecto, tramoId } = proyectoConArtefactoUnico('inst-unico')

    const resultado = resolverDiametroComercialDeTramo(proyecto, tramoId, catalogoQu, catalogoSistemasDeTuberia)
    const hidraulico = resolverHidraulicaDeTramo(proyecto, tramoId, catalogoQu)

    if (resultado.tipo !== 'conCandidato' || hidraulico.tipo !== 'conDemanda') {
      throw new Error('se esperaba conCandidato/conDemanda')
    }
    expect(hidraulico.predimensionamiento.diReferenciaPredimensionamiento_mm).toBeCloseTo(26.42, 2)
    expect(resultado.n).toBe(hidraulico.simultaneidad.n)
    expect(resultado.diReferenciaPredimensionamiento_mm).toBeCloseTo(26.42, 2)
    // Calculado de forma independiente: V(32mm)=2.5936994649227127 m/s,
    // dentro de [1,3] -- admisible.
    expect(resultado.candidato).toEqual({ denominacionComercial: '32 mm', diametroInteriorEfectivo_mm: 23.2 })
    expect(resultado.velocidadReal_mps).toBeCloseTo(2.5936994649227127, 9)
    expect(resultado.verificacionVelocidad).toEqual({ tipo: 'admisible', limiteMinimo_mps: 1, limiteMaximo_mps: 3 })
    expect(resultado.velocidadPorDebajoDelMinimo).toBe(false)
  })

  it('B4 — Qc=1.5 l/s (inodoroValvula real, post CRIT-A22): nueva política elige 40mm (Di=29.0), la anterior elegía 50mm', () => {
    const { proyecto, tramoId } = proyectoConArtefactoUnico('inodoroValvula')

    const resultado = resolverDiametroComercialDeTramo(proyecto, tramoId, catalogoArtefactos, catalogoSistemasDeTuberia)
    const hidraulico = resolverHidraulicaDeTramo(proyecto, tramoId, catalogoArtefactos)

    if (resultado.tipo !== 'conCandidato' || hidraulico.tipo !== 'conDemanda') {
      throw new Error('se esperaba conCandidato/conDemanda')
    }
    // n=1 (CRIT-A4): Qc estadístico=Qmax=1.5=quMax -> CRIT-A22 no
    // necesita intervenir (ya coinciden), qc_lps=1.5.
    expect(hidraulico.qc_lps).toBe(1.5)
    expect(resultado.n).toBe(hidraulico.simultaneidad.n)
    // Calculado de forma independiente: V(40mm)=2.270938545901003 m/s,
    // dentro de [1,3] -- admisible.
    expect(resultado.candidato).toEqual({ denominacionComercial: '40 mm', diametroInteriorEfectivo_mm: 29.0 })
    expect(resultado.velocidadReal_mps).toBeCloseTo(2.270938545901003, 9)
    expect(resultado.verificacionVelocidad).toEqual({ tipo: 'admisible', limiteMinimo_mps: 1, limiteMaximo_mps: 3 })
    expect(resultado.velocidadPorDebajoDelMinimo).toBe(false)
  })

  it('D-delta.27: valvulaMingitorio (catálogo normativo real, Qc=0.15 l/s) + Acqua System Magnum PN20 real -- fallback de Vmin, ya no sinCandidatoAdmisible', () => {
    // valvulaMingitorio tiene quFria_lps/quCaliente_lps=null en el
    // catálogo (solo quTotal_lps=0.15 definido) -- un tramo AF simple
    // resolvería condicion='aguaFria' y lanzaría (mismo comportamiento ya
    // cubierto en resolverHidraulicaDeTramo.test.ts, caso 7). Se usa el
    // mismo patrón de tronco común que el Golden 5 de ese archivo (misma
    // referencia alcanzable con y sin pasar por producciónACS) para que
    // la condición evaluada resuelva 'total' -> resolverQuEfectivo usa
    // quTotal_lps directamente, sin tocar los campos null.
    const mingitorio = artefacto('inst-mingitorio', 'valvulaMingitorio')
    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'UF 1',
      locales: [{ id: 'local-1', tipo: 'otros', regimen: 'noDomiciliario', artefactos: [mingitorio] }],
    }
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n1' },
      { id: 'n2', referencia: referenciaDe('uf-1', 'local-1', 'inst-mingitorio') },
      { id: 'n3', referencia: { tipo: 'produccionACS' } },
      { id: 'n4', referencia: referenciaDe('uf-1', 'local-1', 'inst-mingitorio') },
    ]
    const tramos: Tramo[] = [
      { id: 't1', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
      { id: 't2', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF' },
      { id: 't3', nodoOrigenId: 'n1', nodoDestinoId: 'n3', red: 'AF' },
      { id: 't4', nodoOrigenId: 'n3', nodoDestinoId: 'n4', red: 'AC' },
    ]
    const proyecto = proyectoCon('oficinaPrivada', [uf], { nodos, tramos })

    const resultado = resolverDiametroComercialDeTramo(proyecto, 't1', catalogoArtefactos, catalogoSistemasDeTuberia)
    const hidraulico = resolverHidraulicaDeTramo(proyecto, 't1', catalogoArtefactos)

    if (hidraulico.tipo !== 'conDemanda') {
      throw new Error('se esperaba conDemanda')
    }
    expect(hidraulico.qc_lps).toBe(0.15)
    // El candidato más chico (20mm, Di=14.4mm) -- el menor diámetro
    // comercial normativamente evaluable del catálogo productivo real --
    // ya da V≈0.921 m/s < 1: incumple Vmin. Por monotonicidad (V decrece
    // con Di a Qc fijo), ningún candidato mayor podría corregirlo, así
    // que D-delta.27 lo adopta igual, con advertencia explícita.
    if (resultado.tipo !== 'conCandidato') {
      throw new Error('se esperaba conCandidato (fallback D-delta.27)')
    }
    expect(resultado.qc_lps).toBe(0.15)
    expect(resultado.n).toBe(hidraulico.simultaneidad.n)
    expect(resultado.diReferenciaPredimensionamiento_mm).toBe(hidraulico.predimensionamiento.diReferenciaPredimensionamiento_mm)
    expect(resultado.candidato).toEqual({ denominacionComercial: '20 mm', diametroInteriorEfectivo_mm: 14.4 })
    expect(resultado.velocidadReal_mps).toBeCloseTo(0.9210355503003202, 9)
    expect(resultado.verificacionVelocidad).toEqual({ tipo: 'noAdmisible', limiteMinimo_mps: 1, limiteMaximo_mps: 3 })
    expect(resultado.velocidadPorDebajoDelMinimo).toBe(true)
  })

  it('D-delta.27: único candidato del sistema (50mm, ficticio) resulta noAdmisible por defecto de velocidad -> fallback, ya no sinCandidatoAdmisible', () => {
    const { proyecto, tramoId } = proyectoConArtefactoUnico('lavatorio', 'sistema-sobredimensionado')

    const resultado = resolverDiametroComercialDeTramo(proyecto, tramoId, catalogoArtefactos, SISTEMA_SOBREDIMENSIONADO)

    if (resultado.tipo !== 'conCandidato') {
      throw new Error('se esperaba conCandidato (fallback D-delta.27)')
    }
    expect(resultado.qc_lps).toBe(0.2)
    // n=1 (CRIT-A4): un único artefacto conectado.
    expect(resultado.n).toBe(1)
    expect(resultado.candidato).toEqual({ denominacionComercial: '50 mm (ficticio)', diametroInteriorEfectivo_mm: 50 })
    expect(resultado.velocidadReal_mps).toBeCloseTo(0.10185916357881301, 9)
    expect(resultado.verificacionVelocidad).toEqual({ tipo: 'noAdmisible', limiteMinimo_mps: 1, limiteMaximo_mps: 3 })
    expect(resultado.velocidadPorDebajoDelMinimo).toBe(true)
  })

  it('D-delta.27 NO se activa por exceso de Vmax: Qc alto agota el único candidato del sistema por ser demasiado rápido -> sigue sinCandidatoAdmisible', () => {
    const catalogoQu = catalogoConArtefactoDeQu(7)
    const { proyecto, tramoId } = proyectoConArtefactoUnico('inst-unico', 'sistema-sobredimensionado')

    const resultado = resolverDiametroComercialDeTramo(proyecto, tramoId, catalogoQu, SISTEMA_SOBREDIMENSIONADO)

    // V(50mm, Qc=7)≈3.565 m/s > Vmax=3: el único candidato es
    // 'noAdmisible' por EXCESO, no por defecto -- la condición de
    // velocidadReal_mps<limiteMinimo_mps es falsa, así que D-delta.27 no
    // aplica y el resultado sigue siendo sinCandidatoAdmisible, exactamente
    // como antes de este incremento.
    expect(resultado).toEqual({
      tipo: 'sinCandidatoAdmisible',
      qc_lps: 7,
      n: 1,
      diReferenciaPredimensionamiento_mm: expect.any(Number),
    })
  })

  it('sinCandidatoAdmisible: único candidato queda fuera del dominio normativo (D<13mm) -> resultado explícito, sin throw ni extrapolar', () => {
    const { proyecto, tramoId } = proyectoConArtefactoUnico('lavatorio', 'sistema-insuficiente')
    const hidraulico = resolverHidraulicaDeTramo(proyecto, tramoId, catalogoArtefactos)

    if (hidraulico.tipo !== 'conDemanda') {
      throw new Error('se esperaba conDemanda')
    }

    const resultado = resolverDiametroComercialDeTramo(proyecto, tramoId, catalogoArtefactos, SISTEMA_INSUFICIENTE)

    expect(resultado).toEqual({
      tipo: 'sinCandidatoAdmisible',
      qc_lps: hidraulico.qc_lps,
      n: hidraulico.simultaneidad.n,
      diReferenciaPredimensionamiento_mm: hidraulico.predimensionamiento.diReferenciaPredimensionamiento_mm,
    })
  })

  it('hueco 60-75mm: se salta sin detener la búsqueda, continúa hasta encontrar un candidato admisible más adelante', () => {
    const catalogoQu = catalogoConArtefactoDeQu(10)
    const { proyecto, tramoId } = proyectoConArtefactoUnico('inst-unico', 'sistema-con-hueco')

    const resultado = resolverDiametroComercialDeTramo(proyecto, tramoId, catalogoQu, SISTEMA_CON_HUECO)

    if (resultado.tipo !== 'conCandidato') {
      throw new Error('se esperaba conCandidato (el candidato del hueco debe saltarse, no detener la búsqueda)')
    }
    // n=1 (CRIT-A4): un único artefacto conectado.
    expect(resultado.n).toBe(1)
    expect(resultado.candidato).toEqual({ denominacionComercial: '90mm (ficticio, admisible)', diametroInteriorEfectivo_mm: 90 })
    expect(resultado.velocidadReal_mps).toBeCloseTo(1.5719006725125466, 9)
    expect(resultado.verificacionVelocidad).toEqual({ tipo: 'admisible', limiteMinimo_mps: 1.5, limiteMaximo_mps: 2 })
    // El primer candidato normativamente evaluable (45mm) es 'noAdmisible'
    // por EXCESO (demasiado rápido), no por defecto -- D-delta.27 no se
    // activa, y el recorrido normal sigue hasta el 90mm admisible.
    expect(resultado.velocidadPorDebajoDelMinimo).toBe(false)
  })

  it('sistemaDeTuberiaId inexistente en el catálogo recibido: throw coherente con la precondición de obtenerSistemaDeTuberia', () => {
    const { proyecto, tramoId } = proyectoConArtefactoUnico('lavatorio', 'sistemaInexistente')

    expect(() => resolverDiametroComercialDeTramo(proyecto, tramoId, catalogoArtefactos, catalogoSistemasDeTuberia)).toThrow(
      /no existe ningún SistemaDeTuberiaCatalogado con id "sistemaInexistente"/,
    )
  })

  it('D-delta.27 -- invariante del fallback: con velocidadPorDebajoDelMinimo=true, el candidato es siempre el menor diámetro normativamente evaluable, nunca uno posterior', () => {
    // Tres diámetros, los tres en dominio normativo (13-60mm), con un Qc
    // tan bajo que los tres incumplen Vmin (V decrece con Di, así que si
    // el menor ya incumple, los otros dos incumplen todavía más). El
    // fallback debe adoptar exclusivamente el primero (20mm), nunca 30mm
    // ni 40mm, aunque los tres compartan la misma causa de descarte.
    const SISTEMA_TRES_DIAMETROS_TODOS_BAJO_VMIN: readonly SistemaDeTuberiaCatalogado[] = [
      {
        id: 'sistema-tres-diametros',
        denominacion: 'Sistema de laboratorio con tres diámetros bajo Vmin (ficticio)',
        materialTuberiaId: 'ppr',
        fabricante: 'Fabricante ficticio',
        referenciaFuenteDimensiones: 'Fuente ficticia de laboratorio',
        entradas: [
          { denominacionComercial: '20mm (ficticio)', diametroInteriorEfectivo_mm: 20 },
          { denominacionComercial: '30mm (ficticio)', diametroInteriorEfectivo_mm: 30 },
          { denominacionComercial: '40mm (ficticio)', diametroInteriorEfectivo_mm: 40 },
        ],
      },
    ]
    const catalogoQu = catalogoConArtefactoDeQu(0.01)
    const { proyecto, tramoId } = proyectoConArtefactoUnico('inst-unico', 'sistema-tres-diametros')

    const resultado = resolverDiametroComercialDeTramo(proyecto, tramoId, catalogoQu, SISTEMA_TRES_DIAMETROS_TODOS_BAJO_VMIN)

    if (resultado.tipo !== 'conCandidato') {
      throw new Error('se esperaba conCandidato (fallback D-delta.27)')
    }
    expect(resultado.velocidadPorDebajoDelMinimo).toBe(true)
    expect(resultado.candidato).toEqual({ denominacionComercial: '20mm (ficticio)', diametroInteriorEfectivo_mm: 20 })
  })
})
