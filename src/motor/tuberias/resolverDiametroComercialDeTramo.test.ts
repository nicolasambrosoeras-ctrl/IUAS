// Tests de integracion del orquestador: usan Proyecto/topologia/catalogo
// reales, sin mockear ninguna primitiva interna. Los casos de velocidad
// noAdmisible/sinCandidatoSuficiente usan catálogos de laboratorio
// deliberadamente distintos del catálogo real (mismo criterio que
// dimensionamientoComercial.integracion.test.ts), para forzar el
// resultado de forma determinística sin depender de adivinar valores qu
// del catálogo normativo.
import { describe, it, expect } from 'vitest'
import type { Artefacto, MetadatosProyecto, ParametrosProyecto, Proyecto, TipoDeProyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, ReferenciaDeArtefacto, Tramo } from '../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { resolverHidraulicaDeTramo } from './resolverHidraulicaDeTramo'
import { resolverDiametroComercialDeTramo } from './resolverDiametroComercialDeTramo'
import { catalogoSistemasDeTuberia, type SistemaDeTuberiaCatalogado } from './sistemaDeTuberia'
import { obtenerCandidatosDeDiametroComercial } from './diametroComercial/obtenerCandidatosDeDiametroComercial'
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
    configuracionHidraulica: { metodoPerdidaDistribuida: 'hazenWilliams', materialTuberiaId: 'ppr', sistemaDeTuberiaId },
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

// Fixture compartida: lavatorio único, conectividad física soloAF -> CRIT-A15
// usa quTotal_lps=0.2, n=1 (CRIT-A4) -> Qc=0.2 l/s. Mismo patrón que el caso
// 1 de resolverHidraulicaDeTramo.test.ts.
function proyectoConLavatorioUnico(sistemaDeTuberiaId?: string): { proyecto: Proyecto; tramoId: string } {
  const lavatorio = artefacto('inst-lavatorio', 'lavatorio')
  const uf = unidadFuncionalCon('uf-1', 'local-1', [lavatorio])
  const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: referenciaDe('uf-1', 'local-1', 'inst-lavatorio') }]
  const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' }]
  const proyecto =
    sistemaDeTuberiaId === undefined
      ? proyectoCon('oficinaPrivada', [uf], { nodos, tramos })
      : proyectoCon('oficinaPrivada', [uf], { nodos, tramos }, sistemaDeTuberiaId)
  return { proyecto, tramoId: 't0' }
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

describe('resolverDiametroComercialDeTramo', () => {
  it('1. sinDemanda: propaga sinDemanda sin construir candidato', () => {
    const inodoro = artefacto('inst-inodoro', 'inodoroValvula')
    const uf = unidadFuncionalCon('uf-1', 'local-bano', [inodoro])
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: referenciaDe('uf-1', 'local-bano', 'inst-inodoro') }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AC' }]
    const proyecto = proyectoCon('oficinaPrivada', [uf], { nodos, tramos })

    const resultado = resolverDiametroComercialDeTramo(proyecto, 't0', catalogoArtefactos, catalogoSistemasDeTuberia)

    expect(resultado).toEqual({ tipo: 'sinDemanda' })
  })

  it('2. conCandidato con velocidad admisible: primer candidato del sistema real, velocidad y verificación cross-validadas contra las primitivas', () => {
    const { proyecto, tramoId } = proyectoConLavatorioUnico()

    const resultado = resolverDiametroComercialDeTramo(proyecto, tramoId, catalogoArtefactos, catalogoSistemasDeTuberia)
    const hidraulico = resolverHidraulicaDeTramo(proyecto, tramoId, catalogoArtefactos)

    if (resultado.tipo !== 'conCandidato' || hidraulico.tipo !== 'conDemanda') {
      throw new Error('se esperaba conCandidato/conDemanda')
    }

    const sistema = catalogoSistemasDeTuberia[0]!
    const candidatosEsperados = obtenerCandidatosDeDiametroComercial(hidraulico.predimensionamiento.di_min_mm, sistema)
    const velocidadEsperada = calcularVelocidad(hidraulico.qc_lps, candidatosEsperados[0]!.diametroInteriorEfectivo_mm)
    const verificacionEsperada = verificarVelocidadAdmisible(velocidadEsperada, candidatosEsperados[0]!.diametroInteriorEfectivo_mm)

    expect(hidraulico.qc_lps).toBe(0.2)
    expect(resultado.candidato).toEqual(candidatosEsperados[0])
    expect(resultado.candidato.denominacionComercial).toBe('20 mm')
    expect(resultado.velocidadReal_mps).toBe(velocidadEsperada)
    expect(resultado.verificacionVelocidad).toEqual(verificacionEsperada)
    expect(resultado.verificacionVelocidad.tipo).toBe('admisible')
  })

  it('3. conCandidato con velocidad noAdmisible: el candidato se devuelve igual, con la verificación marcando noAdmisible (CRIT-A19)', () => {
    const { proyecto, tramoId } = proyectoConLavatorioUnico('sistema-sobredimensionado')

    const resultado = resolverDiametroComercialDeTramo(proyecto, tramoId, catalogoArtefactos, SISTEMA_SOBREDIMENSIONADO)

    if (resultado.tipo !== 'conCandidato') {
      throw new Error('se esperaba conCandidato')
    }
    expect(resultado.candidato.diametroInteriorEfectivo_mm).toBe(50)
    expect(resultado.velocidadReal_mps).toBeLessThan(1)
    expect(resultado.verificacionVelocidad).toEqual({ tipo: 'noAdmisible', limiteMinimo_mps: 1, limiteMaximo_mps: 3 })
  })

  it('4. sinCandidatoSuficiente: Di mínimo mayor que el máximo del sistema -> resultado explícito, sin throw ni extrapolar', () => {
    const { proyecto, tramoId } = proyectoConLavatorioUnico('sistema-insuficiente')
    const hidraulico = resolverHidraulicaDeTramo(proyecto, tramoId, catalogoArtefactos)

    if (hidraulico.tipo !== 'conDemanda') {
      throw new Error('se esperaba conDemanda')
    }

    const resultado = resolverDiametroComercialDeTramo(proyecto, tramoId, catalogoArtefactos, SISTEMA_INSUFICIENTE)

    expect(resultado).toEqual({ tipo: 'sinCandidatoSuficiente', diMinimo_mm: hidraulico.predimensionamiento.di_min_mm })
  })

  it('5. sistemaDeTuberiaId inexistente en el catálogo recibido: throw coherente con la precondición de obtenerSistemaDeTuberia', () => {
    const { proyecto, tramoId } = proyectoConLavatorioUnico('sistemaInexistente')

    expect(() => resolverDiametroComercialDeTramo(proyecto, tramoId, catalogoArtefactos, catalogoSistemasDeTuberia)).toThrow(
      /no existe ningún SistemaDeTuberiaCatalogado con id "sistemaInexistente"/,
    )
  })
})
