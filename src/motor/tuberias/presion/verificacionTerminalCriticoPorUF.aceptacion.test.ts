// Caso de aceptación de D-δ.48 (secciones 10/11/20 del brief): un
// proyecto con 4 UnidadesFuncionales en los niveles/cotas default
// aprobados (PB=1, Piso1=4, Piso2=7, Piso3=10 -- z_default=1+3·nivel,
// nivelUnidadFuncional.ts), alimentado por un único origen conocido
// (tanque elevado, cota del pelo de agua mínimo=16 m), verificando:
//
// 1) la carga geométrica de cada terminal ANTES de pérdidas coincide
//    exactamente con la esperada por geometría pura (15/12/9/6 m.c.a.),
//    usando la cota de la UnidadFuncional (D-δ.46) en granularidad
//    'simplificada' -- nunca una cota individual de Nodo;
// 2) un contraejemplo REAL (no abstracto) de que
//    resolverTerminalMasDesfavorable elige por MARGEN y no por
//    Presidual: el terminal de PB tiene la mayor Presidual de los
//    cuatro (mayor carga geométrica) pero, al tener una Pmin normativa
//    mucho más alta (inodoroValvula, 1,5 kg/cm²=15 m.c.a.), termina
//    siendo el más desfavorable -- de hecho el único que NO CUMPLE;
// 3) el terminal crítico cambia reactivamente si se edita la cota de
//    una UF (sin volver a construir el proyecto).
//
// No reabre resolverBalanceDePresion/resolverTerminalMasDesfavorable/Pmin
// (D-δ.48, sección 2): reutiliza esas piezas tal cual, sin ninguna
// fórmula nueva.
import { describe, it, expect } from 'vitest'
import type { Artefacto, MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../../modelo/proyecto'
import type { Nodo, ReferenciaDeArtefacto, Tramo } from '../../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../../normativa/eras-2023/catalogo-artefactos'
import { catalogoSistemasDeTuberia } from '../sistemaDeTuberia'
import { catalogoMaterialesTuberia } from '../materialTuberia'
import { calcularCotaHidraulicaDefaultDeNivel } from '../../../interfaz/paginas/nivelUnidadFuncional'
import { resolverPresionResidualDeCamino } from './resolverPresionResidualDeCamino'
import { resolverTerminalMasDesfavorable, type CandidatoTerminal } from './resolverTerminalMasDesfavorable'

function metadatos(): MetadatosProyecto {
  return {
    nombre: 'Aceptación D-δ.48 -- niveles por UF',
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

const COTA_PELO_DE_AGUA_MINIMO = 16
const LONGITUD_RAMA_M = 3

// Cuatro UF, una por nivel (PB/Piso1/Piso2/Piso3), cada una con un único
// Local y un único Artefacto -- conectado directo desde 'raiz' (D-δ.48:
// no ejercita hallarNodoDeInsercionDeLocal, arma la red ya conectada
// tal como la construiría M2-D si el Local tuviera un solo terminal).
// artefactoPB usa Pmin normativa mucho más alta (inodoroValvula) a
// propósito: es el corazón del contraejemplo de la sección 11.
function proyectoDeCuatroPisos(): Proyecto {
  const niveles = [
    { id: 'uf-pb', nombre: 'PB', nivel: 0, localId: 'local-pb', artefactoInstanciaId: 'a-pb', artefactoIdCatalogo: 'inodoroValvula' },
    { id: 'uf-p1', nombre: 'Piso 1', nivel: 1, localId: 'local-p1', artefactoInstanciaId: 'a-p1', artefactoIdCatalogo: 'lavatorio' },
    { id: 'uf-p2', nombre: 'Piso 2', nivel: 2, localId: 'local-p2', artefactoInstanciaId: 'a-p2', artefactoIdCatalogo: 'lavatorio' },
    { id: 'uf-p3', nombre: 'Piso 3', nivel: 3, localId: 'local-p3', artefactoInstanciaId: 'a-p3', artefactoIdCatalogo: 'maquinaLavarropas' },
  ] as const

  const unidadesFuncionales: UnidadFuncional[] = niveles.map((n) => ({
    id: n.id,
    nombre: n.nombre,
    nivel: n.nivel,
    cotaHidraulicaReferencia_m: calcularCotaHidraulicaDefaultDeNivel(n.nivel),
    locales: [
      {
        id: n.localId,
        tipo: 'bano',
        regimen: 'domiciliario',
        artefactos: [artefacto(n.artefactoInstanciaId, n.artefactoIdCatalogo)],
      },
    ],
  }))

  const nodos: Nodo[] = [
    { id: 'raiz', cota_m: COTA_PELO_DE_AGUA_MINIMO },
    ...niveles.map((n) => ({
      id: `terminal-${n.id}`,
      referencia: referenciaDe(n.id, n.localId, n.artefactoInstanciaId),
    })),
  ]
  const tramos: Tramo[] = niveles.map((n) => ({
    id: `t-${n.id}`,
    nodoOrigenId: 'raiz',
    nodoDestinoId: `terminal-${n.id}`,
    red: 'AF',
    longitud_m: LONGITUD_RAMA_M,
    accesorios: [],
  }))

  return {
    metadatos: metadatos(),
    parametros: parametros(),
    unidadesFuncionales,
    redHidraulica: { nodos, tramos },
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'detallado',
      granularidadHidraulica: 'simplificada',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

function resolver(proyecto: Proyecto, nodoId: string) {
  return resolverPresionResidualDeCamino(
    proyecto,
    nodoId,
    /* presionDisponible_mca (tanque elevado, D-δ.38: Pdisponible=0, toda la carga estática es Δz) */ 0,
    /* hfMedidor_mca */ 0,
    catalogoArtefactos,
    catalogoSistemasDeTuberia,
    catalogoMaterialesTuberia,
  )
}

describe('D-δ.48 -- caso de aceptación: niveles por UF + terminal crítico por margen', () => {
  it('la carga geométrica de cada terminal (antes de pérdidas) coincide exactamente con 16 − cotaUF: PB=15, Piso1=12, Piso2=9, Piso3=6', () => {
    const proyecto = proyectoDeCuatroPisos()
    const esperado: Record<string, number> = { 'terminal-uf-pb': 15, 'terminal-uf-p1': 12, 'terminal-uf-p2': 9, 'terminal-uf-p3': 6 }

    for (const [nodoId, cargaGeometricaEsperada] of Object.entries(esperado)) {
      const resultado = resolver(proyecto, nodoId)
      if (resultado.tipo !== 'balanceCompleto' && resultado.tipo !== 'balanceIncompleto') {
        throw new Error(`${nodoId}: se esperaba una traza de desnivel, se obtuvo "${resultado.tipo}"`)
      }
      // Carga geométrica = Pdisponible(=0) − desnivel_m (misma resta que
      // TarjetaDeTerminal.tsx, no una fórmula nueva).
      expect(-resultado.desnivel_m).toBeCloseTo(cargaGeometricaEsperada, 10)
    }
  })

  it('las 4 UF alcanzan balanceCompleto con los datos provistos (sin datos faltantes)', () => {
    const proyecto = proyectoDeCuatroPisos()
    for (const nodoId of ['terminal-uf-pb', 'terminal-uf-p1', 'terminal-uf-p2', 'terminal-uf-p3']) {
      expect(resolver(proyecto, nodoId).tipo).toBe('balanceCompleto')
    }
  })

  it('contraejemplo real: PB tiene la MAYOR Presidual de las 4 UF pero es el ÚNICO terminal crítico (menor margen, único que NO CUMPLE) por su Pmin normativa mucho más alta', () => {
    const proyecto = proyectoDeCuatroPisos()
    const candidatos: CandidatoTerminal[] = ['terminal-uf-pb', 'terminal-uf-p1', 'terminal-uf-p2', 'terminal-uf-p3'].map(
      (nodoId) => ({ nodoId, resultado: resolver(proyecto, nodoId) }),
    )
    const completos = candidatos.map((c) => {
      if (c.resultado.tipo !== 'balanceCompleto') {
        throw new Error(`${c.nodoId}: se esperaba balanceCompleto`)
      }
      return { nodoId: c.nodoId, presionResidual_mca: c.resultado.presionResidual_mca, cumpleMinimo: c.resultado.cumpleMinimo }
    })

    // PB tiene la mayor Presidual de las 4 (mayor carga geométrica: 15 > 12 > 9 > 6).
    const presidualDePB = completos.find((c) => c.nodoId === 'terminal-uf-pb')!.presionResidual_mca
    for (const otro of completos.filter((c) => c.nodoId !== 'terminal-uf-pb')) {
      expect(presidualDePB).toBeGreaterThan(otro.presionResidual_mca)
    }

    // Sin embargo, PB es el ÚNICO que no cumple (Pmin=15 m.c.a. de
    // inodoroValvula devora casi toda esa Presidual generosa).
    expect(completos.find((c) => c.nodoId === 'terminal-uf-pb')!.cumpleMinimo).toBe(false)
    for (const otro of completos.filter((c) => c.nodoId !== 'terminal-uf-pb')) {
      expect(otro.cumpleMinimo).toBe(true)
    }

    // Y resolverTerminalMasDesfavorable -- el criterio real de M2-B, sin
    // reabrir su implementación -- confirma a PB como el más desfavorable.
    const resultado = resolverTerminalMasDesfavorable(candidatos)
    expect(resultado.tipo).toBe('determinado')
    if (resultado.tipo !== 'determinado') throw new Error('inalcanzable')
    expect(resultado.nodoId).toBe('terminal-uf-pb')
    expect(resultado.cumpleMinimo).toBe(false)
    expect(resultado.margen_mca).toBeLessThan(0)
  })

  it('cambio reactivo: bajar la cota de Piso 1 lo suficiente lo convierte en el nuevo terminal crítico, sin tocar el resto del proyecto', () => {
    const proyecto = proyectoDeCuatroPisos()

    // Piso 1 (Pmin=6, cota=4 -> cargaGeom=12, margen amplio ~5,x) pasa a
    // cota=15.9 (cargaGeom~0,1): su margen cae muy por debajo de 0,
    // desplazando a PB como crítico sin modificar ninguna otra UF.
    const proyectoEditado: Proyecto = {
      ...proyecto,
      unidadesFuncionales: proyecto.unidadesFuncionales.map((uf) =>
        uf.id === 'uf-p1' ? { ...uf, cotaHidraulicaReferencia_m: 15.9 } : uf,
      ),
    }

    const candidatos: CandidatoTerminal[] = ['terminal-uf-pb', 'terminal-uf-p1', 'terminal-uf-p2', 'terminal-uf-p3'].map(
      (nodoId) => ({ nodoId, resultado: resolver(proyectoEditado, nodoId) }),
    )
    const resultado = resolverTerminalMasDesfavorable(candidatos)

    expect(resultado.tipo).toBe('determinado')
    if (resultado.tipo !== 'determinado') throw new Error('inalcanzable')
    expect(resultado.nodoId).toBe('terminal-uf-p1')
    expect(resultado.cumpleMinimo).toBe(false)

    // Piso 2 y Piso 3 (no editados) conservan exactamente su carga
    // geométrica original -- el cambio de Piso 1 no los contamina.
    const resultadoPiso2 = resolver(proyectoEditado, 'terminal-uf-p2')
    const resultadoPiso3 = resolver(proyectoEditado, 'terminal-uf-p3')
    if (resultadoPiso2.tipo !== 'balanceCompleto' || resultadoPiso3.tipo !== 'balanceCompleto') {
      throw new Error('se esperaba balanceCompleto en Piso 2 y Piso 3')
    }
    expect(-resultadoPiso2.desnivel_m).toBeCloseTo(9, 10)
    expect(-resultadoPiso3.desnivel_m).toBeCloseTo(6, 10)
  })
})
