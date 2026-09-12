// M2-TOPO-B (§28-§33, §39, §45): un montante AF segmentado EXISTENTE
// (construido acá como RedHidraulica directa, sin constructor de UI) se
// enumera, se edita y se calcula de extremo a extremo desde las mismas
// funciones que consume la UI de Módulo 2.
//
// Topología (misma forma que Golden 4 de resolverHidraulicaDeTramo, con un
// feed raíz real por encima para que EXISTAN segmentos compartidos):
//
//   n-acera ─t-general(AF)→ n0
//   n0      ─t-segA(AF,3m)→ n1     segA alcanza L1+L2+L3  → distribución compartida
//   n1      ─t-d1(AF)→ n-t1(L1)    representativo de L1
//   n1      ─t-segB(AF,3m)→ n2     segB alcanza L2+L3     → distribución compartida
//   n2      ─t-d2(AF)→ n-t2(L2)    representativo de L2
//   n2      ─t-segC(AF,3m)→ n-t3(L3)  segC alcanza sólo L3 → representativo, NO compartido
//
// quEfectivo(lavatorio, soloAF) = 0,2 l/s (CRIT-A15, igual que Golden 4).
import { describe, it, expect } from 'vitest'
import type { Proyecto, TipoDeProyecto, UnidadFuncional } from '../../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../../normativa/eras-2023/catalogo-artefactos'
import { catalogoSistemasDeTuberia } from '../sistemaDeTuberia'
import { catalogoMaterialesTuberia } from '../materialTuberia'
import { validarRedHidraulica } from '../../../validacion/redHidraulica'
import { resolverHidraulicaDeTramo } from '../resolverHidraulicaDeTramo'
import { identificarTramosDeDistribucionCompartida } from '../topologia/identificarTramosDeDistribucionCompartida'
import { identificarFilasDistribucionSecundaria } from '../../../interfaz/paginas/identificarFilasDeModulo2'
import { resolverFilaDeDimensionamiento } from '../../../interfaz/paginas/resolverFilaDeDimensionamiento'
import { resolverControlDeDnDeTramo } from '../../../interfaz/paginas/resolverControlDeDnDeTramo'
import {
  conAccesoriosDeTramo,
  conDnComercialAdoptadoDeTramo,
  conLongitudDeTramo,
} from '../../../interfaz/paginas/actualizarRedHidraulica'
import { conGranularidadHidraulica } from '../../../interfaz/paginas/actualizarConfiguracionHidraulica'
import { resolverPresionResidualDeCamino } from './resolverPresionResidualDeCamino'

function metadatos() {
  return {
    nombre: 'Montante M2-TOPO-B',
    obra: 'Obra',
    comitente: 'Comitente',
    fecha: '2026-01-01',
    schemaVersion: '1.0.0' as const,
    versionNormativa: 'eras-2023' as const,
  }
}

function parametros(tipoDeProyecto: TipoDeProyecto) {
  return { tipoDeProyecto, presionSobreAcera_m: 0, alturaArtefactoMasDesfavorable_m: 0 }
}

function ufNivel(id: string, localId: string, nivel: number, cota: number): UnidadFuncional {
  return {
    id,
    nombre: id,
    niveles: [
      {
        id: `${id}-nivel-1`,
        nombre: 'Nivel 1',
        nivel,
        cotaHidraulicaReferencia_m: cota,
        locales: [
          {
            id: localId,
            tipo: 'bano',
            regimen: 'domiciliario',
            artefactos: [{ id: `${localId}-a`, artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }],
          },
        ],
      },
    ],
  }
}

function proyectoMontante(granularidad: 'simplificada' | 'profesional' = 'profesional'): Proyecto {
  const nodos: Nodo[] = [
    { id: 'n-acera', cota_m: 0 },
    { id: 'n0', cota_m: 0 },
    // n1/n2 son bifurcaciones 1→2 reales -> en 'detallado' su tee debe estar
    // relevada para que el balance de pérdida localizada cierre (CRIT-A31).
    // Se usa 'entradaCentral' (la más simple, sin nombrar la rama recta).
    { id: 'n1', cota_m: 3, tee: { tipo: 'entradaCentral' } },
    { id: 'n2', cota_m: 6, tee: { tipo: 'entradaCentral' } },
    { id: 'n-t1', cota_m: 3, referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'l1', artefactoId: 'l1-a' } },
    { id: 'n-t2', cota_m: 6, referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-2', localId: 'l2', artefactoId: 'l2-a' } },
    { id: 'n-t3', cota_m: 9, referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-3', localId: 'l3', artefactoId: 'l3-a' } },
  ]
  // accesorios: [] en todos los tramos = "relevamiento hecho, sin
  // accesorios" (D-δ.33) -> el balance 'detallado' cierra sin pedir dato.
  const tramos: Tramo[] = [
    { id: 't-general', nodoOrigenId: 'n-acera', nodoDestinoId: 'n0', red: 'AF', longitud_m: 10, accesorios: [] },
    { id: 't-segA', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF', longitud_m: 3, accesorios: [] },
    { id: 't-d1', nodoOrigenId: 'n1', nodoDestinoId: 'n-t1', red: 'AF', longitud_m: 1, accesorios: [] },
    { id: 't-segB', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF', longitud_m: 3, accesorios: [] },
    { id: 't-d2', nodoOrigenId: 'n2', nodoDestinoId: 'n-t2', red: 'AF', longitud_m: 1, accesorios: [] },
    { id: 't-segC', nodoOrigenId: 'n2', nodoDestinoId: 'n-t3', red: 'AF', longitud_m: 3, accesorios: [] },
  ]
  const redHidraulica: RedHidraulica = { nodos, tramos }
  return {
    metadatos: metadatos(),
    parametros: parametros('viviendaMultifamiliar'),
    unidadesFuncionales: [ufNivel('uf-1', 'l1', 1, 3), ufNivel('uf-2', 'l2', 2, 6), ufNivel('uf-3', 'l3', 3, 9)],
    redHidraulica,
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'detallado',
      granularidadHidraulica: granularidad,
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

const cat = catalogoArtefactos

describe('M2-TOPO-B — montante segmentado existente, extremo a extremo', () => {
  it('el fixture es estructuralmente válido y clasifica exactamente t-segA/t-segB como distribución compartida', () => {
    const proyecto = proyectoMontante()
    expect(validarRedHidraulica(proyecto)).toEqual([])
    expect(identificarTramosDeDistribucionCompartida(proyecto).map((t) => t.id)).toEqual(['t-segA', 't-segB'])
  })

  it('ENUMERACIÓN: aparecen dos filas de Distribución secundaria, una por segmento compartido, numeradas', () => {
    expect(identificarFilasDistribucionSecundaria(proyectoMontante())).toEqual([
      { etiqueta: 'Distribución secundaria 1', red: 'AF', tramoId: 't-segA' },
      { etiqueta: 'Distribución secundaria 2', red: 'AF', tramoId: 't-segB' },
    ])
  })

  it('Qc POR SEGMENTO: cada segmento recalcula simultaneidad sobre SU conjunto aguas abajo, nunca por suma de Qc parciales (regresión Golden 4)', () => {
    const proyecto = proyectoMontante()
    const qu = 0.2

    // segA: n=3 UF aguas abajo -> Qmax=0,6 · K(=1/√2 · 2) = 0,6·√2 ≈ 0,8485
    const a = resolverHidraulicaDeTramo(proyecto, 't-segA', cat)
    if (a.tipo !== 'conDemanda') throw new Error('segA sin demanda')
    expect(a.qc_lps).toBeCloseTo(3 * qu * ((1 / Math.sqrt(2)) * 2), 10)
    expect(a.qc_lps).toBeCloseTo(0.8485281374238571, 10)
    // NO es 0,8 (Qc_B) + 0,2 (UF1 aislada) = 1,0
    expect(a.qc_lps).not.toBeCloseTo(1.0, 3)

    // segB: n=2 UF aguas abajo -> Qmax=0,4 · K(=1/√1 · 2) = 0,8
    const b = resolverHidraulicaDeTramo(proyecto, 't-segB', cat)
    if (b.tipo !== 'conDemanda') throw new Error('segB sin demanda')
    expect(b.qc_lps).toBeCloseTo(0.8, 10)
  })

  it('DN AUTOMÁTICO por segmento: pipeline normal (Qc→Di→DN comercial), sin heredar DN del segmento anterior', () => {
    const proyecto = proyectoMontante()
    const dnA = resolverControlDeDnDeTramo(proyecto, 't-segA', cat)
    const dnB = resolverControlDeDnDeTramo(proyecto, 't-segB', cat)
    expect(dnA.disponible).toBe(true)
    expect(dnA.origen).toBe('automatico')
    expect(dnA.denominacionAdoptada).not.toBeNull()
    expect(dnB.disponible).toBe(true)
    expect(dnB.origen).toBe('automatico')
    // Cada segmento resuelve su propio DN desde su propio Qc: no se fuerza
    // igualdad. (Con Qc_A > Qc_B el DN de A es ≥ el de B; nunca al revés.)
  })

  it('DN MANUAL por segmento: el override dnComercialAdoptado funciona en un tramo compartido y cambia el diámetro efectivo', () => {
    const base = proyectoMontante()

    const con25 = conDnComercialAdoptadoDeTramo(base, 't-segA', '25 mm')
    const control25 = resolverControlDeDnDeTramo(con25, 't-segA', cat)
    expect(control25.origen).toBe('manual')
    expect(control25.denominacionAdoptada).toBe('25 mm')
    const fila25 = resolverFilaDeDimensionamiento(con25, 't-segA', cat)
    expect(fila25.dnTexto).toContain('25')

    const con32 = conDnComercialAdoptadoDeTramo(base, 't-segA', '32 mm')
    const fila32 = resolverFilaDeDimensionamiento(con32, 't-segA', cat)
    expect(fila32.dnTexto).toContain('32')

    // Diámetros efectivos distintos -> velocidades distintas (Qc no cambia).
    expect(fila25.vTexto).not.toBe(fila32.vTexto)

    // Volver a automático: contrato D-δ.52 intacto.
    const auto = resolverControlDeDnDeTramo(conDnComercialAdoptadoDeTramo(con32, 't-segA', undefined), 't-segA', cat)
    expect(auto.origen).toBe('automatico')
  })

  it('LONGITUD editable + hf DISTRIBUIDA lineal en L sobre un segmento compartido', () => {
    const base = proyectoMontante()
    const hf3 = resolverFilaDeDimensionamiento(base, 't-segA', cat).hfDistribuida_mca
    const hf6 = resolverFilaDeDimensionamiento(conLongitudDeTramo(base, 't-segA', 6), 't-segA', cat).hfDistribuida_mca
    expect(hf3).toBeGreaterThan(0)
    expect(hf6).toBeGreaterThan(0)
    expect(hf6! / hf3!).toBeCloseTo(2, 6) // hf = J·L, lineal
  })

  it('LONGITUD ausente en un segmento compartido -> fila incompleta, nunca crash', () => {
    const sinLongitud = conLongitudDeTramo(proyectoMontante(), 't-segA', undefined)
    const fila = resolverFilaDeDimensionamiento(sinLongitud, 't-segA', cat)
    expect(fila.estado).toBe('incompleto')
    expect(fila.hfDistribuida_mca).toBeUndefined()
  })

  it('PRESIÓN Profesional: el balance recorre TODOS los tramos del camino profundo, incluidos los compartidos', () => {
    const proyecto = proyectoMontante('profesional')
    const r = resolverPresionResidualDeCamino(proyecto, 'n-t3', 30, 0, cat, catalogoSistemasDeTuberia, catalogoMaterialesTuberia)
    expect(r.tipo).toBe('balanceCompleto')
    if (r.tipo !== 'balanceCompleto') return

    const idsEnTraza = r.hfDistribuidaPorTramo.map((e) => e.tramoId)
    expect(idsEnTraza).toEqual(expect.arrayContaining(['t-general', 't-segA', 't-segB', 't-segC']))

    const suma = r.hfDistribuidaPorTramo.reduce((s, e) => s + e.hf_m, 0)
    expect(r.hfDistribuida_mca).toBeCloseTo(suma, 10)
    expect(r.hfDistribuida_mca).toBeGreaterThan(0)

    // Profesional: los tramos compartidos NO reciben incremento vertical
    // implícito (D-δ.50 sólo actúa en 'simplificada') -> no hay doble conteo.
    for (const e of r.hfDistribuidaPorTramo) {
      expect(e.incrementoVertical_m).toBe(0)
    }
  })

  it('PRESIÓN Simplificada: el montante explícito NO desaparece del balance, y D-δ.50 sigue vigente sin cambios (Alternativa A, limitación documentada)', () => {
    const proyecto = proyectoMontante('simplificada')
    const r = resolverPresionResidualDeCamino(proyecto, 'n-t3', 30, 0, cat, catalogoSistemasDeTuberia, catalogoMaterialesTuberia)
    expect(r.tipo).toBe('balanceCompleto')
    if (r.tipo !== 'balanceCompleto') return

    // El segmento compartido está aguas arriba del representativo del Local
    // -> sigue en tramosRelevables, con su longitud_m real.
    const idsEnTraza = r.hfDistribuidaPorTramo.map((e) => e.tramoId)
    expect(idsEnTraza).toEqual(expect.arrayContaining(['t-segA', 't-segB']))

    // D-δ.50 NO se tocó en M2-TOPO-B: el tramo de Alimentación general
    // sigue recibiendo su incremento vertical típico (3·nivel) en
    // 'simplificada'. Con distribución secundaria explícita esto puede
    // sobreestimar hf (doble conteo del ascenso), y esa deduplicación
    // queda diferida a M2-TOPO-C.
    const general = r.hfDistribuidaPorTramo.find((e) => e.tramoId === 't-general')!
    expect(general.incrementoVertical_m).toBeGreaterThan(0)
  })

  it('ACCESORIO manual en un segmento compartido: se acumula en Detalladas si el tramo está en el camino', () => {
    const base = proyectoMontante('profesional')
    const sinAcc = resolverPresionResidualDeCamino(base, 'n-t3', 30, 0, cat, catalogoSistemasDeTuberia, catalogoMaterialesTuberia)
    const conAcc = resolverPresionResidualDeCamino(
      conAccesoriosDeTramo(base, 't-segA', [{ tipo: 'codo90', cantidad: 3 }]),
      'n-t3',
      30,
      0,
      cat,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )
    if (sinAcc.tipo !== 'balanceCompleto' || conAcc.tipo !== 'balanceCompleto') throw new Error('balance incompleto')
    expect(conAcc.hfLocalizada.hf_mca).toBeGreaterThan(sinAcc.hfLocalizada.hf_mca)
  })

  it('NO MUTACIÓN (§39): resolver enumeración y presión no altera el Proyecto', () => {
    const proyecto = proyectoMontante('simplificada')
    const antes = structuredClone(proyecto)
    identificarFilasDistribucionSecundaria(proyecto)
    resolverPresionResidualDeCamino(proyecto, 'n-t3', 30, 0, cat, catalogoSistemasDeTuberia, catalogoMaterialesTuberia)
    expect(proyecto).toEqual(antes)
  })

  it('cambiar de granularidad no cambia la ENUMERACIÓN (depende de topología, no de configuración): mismas filas', () => {
    const prof = identificarFilasDistribucionSecundaria(proyectoMontante('profesional'))
    const simp = identificarFilasDistribucionSecundaria(conGranularidadHidraulica(proyectoMontante('profesional'), 'simplificada'))
    expect(simp).toEqual(prof)
  })

  it('topología con ciclo: la clasificación no entra en loop ni lanza (protección de obtenerArtefactosAguasAbajo)', () => {
    const ciclico: Proyecto = {
      ...proyectoMontante(),
      redHidraulica: {
        nodos: [
          { id: 'a' },
          { id: 'b' },
          { id: 'c', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'l1', artefactoId: 'l1-a' } },
        ],
        tramos: [
          { id: 't-ab', nodoOrigenId: 'a', nodoDestinoId: 'b', red: 'AF' },
          { id: 't-bc', nodoOrigenId: 'b', nodoDestinoId: 'c', red: 'AF' },
          { id: 't-ba', nodoOrigenId: 'b', nodoDestinoId: 'a', red: 'AF' }, // ciclo a→b→a
        ],
      },
    }
    expect(() => identificarTramosDeDistribucionCompartida(ciclico)).not.toThrow()
    expect(() => identificarFilasDistribucionSecundaria(ciclico)).not.toThrow()
  })
})
