// D-δ.50 (brief secciones 12-14, 31-34, 42 T8/T9/T12): prueba de
// integracion sobre resolverPresionResidualDeCamino que discrimina los DOS
// efectos distintos de subir una UF un piso en granularidad 'simplificada':
//
//   1. GEOMETRIA  -- la cota terminal efectiva sube 3 m (1+3·nivel, D-δ.46)
//                    -> Δz / carga geometrica cambia.
//   2. FRICCION   -- la Alimentacion general (y, en AC, la Alimentacion ACS)
//                    suman 3 m de caño vertical -> hfDistribuida cambia.
//
// La diferencia de presion residual entre PB y Piso 1 para terminales
// equivalentes NO es solamente 3 m.c.a.: incluye tambien la perdida por
// esos 3 m extra de tuberia. Un test que compruebe una sola de las dos
// contribuciones no alcanza (brief seccion 33).
import { describe, it, expect } from 'vitest'
import type { MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../../modelo/proyecto'
import type { Nodo, RedHidraulica, ReferenciaDeArtefacto, Tramo } from '../../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../../normativa/eras-2023/catalogo-artefactos'
import { catalogoSistemasDeTuberia } from '../sistemaDeTuberia'
import { catalogoMaterialesTuberia } from '../materialTuberia'
import { validarRedHidraulica } from '../../../validacion/redHidraulica'
import { resolverPresionResidualDeCamino } from './resolverPresionResidualDeCamino'

const P_DISPONIBLE_MCA = 40
const HF_MEDIDOR_MCA = 1

function metadatos(): MetadatosProyecto {
  return {
    nombre: 'Proyecto vertical/nivel',
    obra: 'Obra',
    comitente: 'Comitente',
    fecha: '2026-09-07',
    schemaVersion: '1.0.0',
    versionNormativa: 'eras-2023',
  }
}

function parametros(): ParametrosProyecto {
  return { tipoDeProyecto: 'viviendaIndividual', presionSobreAcera_m: 0, alturaArtefactoMasDesfavorable_m: 0 }
}

function ref(uf: string, local: string, art: string): ReferenciaDeArtefacto {
  return { tipo: 'artefacto', unidadFuncionalId: uf, localId: local, artefactoId: art }
}

function uf(id: string, nivel: number): UnidadFuncional {
  return {
    id,
    nombre: id,
    nivel,
    cotaHidraulicaReferencia_m: 1 + 3 * nivel,
    locales: [
      {
        id: `${id}-local`,
        tipo: 'bano',
        regimen: 'domiciliario',
        artefactos: [{ id: `${id}-lav`, artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }],
      },
    ],
  }
}

// Alimentacion general (t-general) + Alimentacion ACS (t-af-acs)
// compartidas; cada UF cuelga un lavatorio AF+AC de la raiz comun. Mismas
// longitudes base para las dos UFs -> la unica diferencia entre PB y Piso 1
// es el nivel.
function proyecto(unidadesFuncionales: readonly UnidadFuncional[]): Proyecto {
  const nodos: Nodo[] = [
    { id: 'n-general', cota_m: 0 },
    { id: 'n0' },
    { id: 'n-acs', referencia: { tipo: 'produccionACS' } },
  ]
  const tramos: Tramo[] = [
    { id: 't-general', nodoOrigenId: 'n-general', nodoDestinoId: 'n0', red: 'AF', longitud_m: 6 },
    { id: 't-af-acs', nodoOrigenId: 'n0', nodoDestinoId: 'n-acs', red: 'AF', longitud_m: 5 },
  ]
  for (const u of unidadesFuncionales) {
    const local = u.locales[0]!
    const art = local.artefactos[0]!
    nodos.push({ id: `n-af-${u.id}`, referencia: ref(u.id, local.id, art.id) })
    tramos.push({ id: `t-af-${u.id}`, nodoOrigenId: 'n0', nodoDestinoId: `n-af-${u.id}`, red: 'AF', longitud_m: 3 })
    nodos.push({ id: `n-ac-${u.id}`, referencia: ref(u.id, local.id, art.id) })
    tramos.push({ id: `t-ac-${u.id}`, nodoOrigenId: 'n-acs', nodoDestinoId: `n-ac-${u.id}`, red: 'AC', longitud_m: 3 })
  }
  const redHidraulica: RedHidraulica = { nodos, tramos }
  return {
    metadatos: metadatos(),
    parametros: parametros(),
    unidadesFuncionales,
    redHidraulica,
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'estimado',
      granularidadHidraulica: 'simplificada',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

function balanceAF(p: Proyecto, ufId: string) {
  const r = resolverPresionResidualDeCamino(
    p,
    `n-af-${ufId}`,
    P_DISPONIBLE_MCA,
    HF_MEDIDOR_MCA,
    catalogoArtefactos,
    catalogoSistemasDeTuberia,
    catalogoMaterialesTuberia,
  )
  if (r.tipo !== 'balanceCompleto') throw new Error(`AF ${ufId}: se esperaba balanceCompleto, fue ${r.tipo}`)
  return r
}

function balanceAC(p: Proyecto, ufId: string) {
  const r = resolverPresionResidualDeCamino(
    p,
    `n-ac-${ufId}`,
    P_DISPONIBLE_MCA,
    HF_MEDIDOR_MCA,
    catalogoArtefactos,
    catalogoSistemasDeTuberia,
    catalogoMaterialesTuberia,
  )
  if (r.tipo !== 'balanceCompleto') throw new Error(`AC ${ufId}: se esperaba balanceCompleto, fue ${r.tipo}`)
  return r
}

describe('longitud vertical por nivel -- integracion presion (D-δ.50)', () => {
  it('la red de prueba es estructuralmente valida', () => {
    expect(validarRedHidraulica(proyecto([uf('uf-pb', 0), uf('uf-p1', 1)]))).toEqual([])
  })

  it('T12/T33: PB vs Piso 1 -- geometria Y friccion contribuyen a la diferencia de Presidual', () => {
    const p = proyecto([uf('uf-pb', 0), uf('uf-p1', 1)])
    const pb = balanceAF(p, 'uf-pb')
    const p1 = balanceAF(p, 'uf-p1')

    // (1) GEOMETRIA: la cota terminal efectiva sube exactamente 3 m.
    expect(p1.desnivel_m - pb.desnivel_m).toBeCloseTo(3, 10)

    // (2) FRICCION: Piso 1 acumula MAS hfDistribuida que PB, por los 3 m
    // extra de Alimentacion general (misma longitud base, mismo Qc/DN/V).
    expect(p1.hfDistribuida_mca).toBeGreaterThan(pb.hfDistribuida_mca)
    const deltaHfDistribuida = p1.hfDistribuida_mca - pb.hfDistribuida_mca
    expect(deltaHfDistribuida).toBeGreaterThan(0)

    // La caida total de Presidual entre PB y Piso 1 es geometria + friccion
    // vertical -- estrictamente MAYOR que los 3 m del desnivel solo.
    const caidaPresidual = pb.presionResidual_mca - p1.presionResidual_mca
    expect(caidaPresidual).toBeGreaterThan(3)
    expect(caidaPresidual).toBeCloseTo(3 + deltaHfDistribuida, 10)

    // Traza auditable del incremento vertical.
    expect(pb.incrementoVerticalPorNivel.aplica).toBe(false)
    expect(pb.incrementoVerticalPorNivel.deltaLVertical_m).toBe(0)
    expect(p1.incrementoVerticalPorNivel.aplica).toBe(true)
    expect(p1.incrementoVerticalPorNivel.deltaLVertical_m).toBe(3)

    const tramoGeneralP1 = p1.hfDistribuidaPorTramo.find((t) => t.tramoId === 't-general')!
    expect(tramoGeneralP1.incrementoVertical_m).toBe(3)
    expect(tramoGeneralP1.longitudBase_m).toBe(6)
    expect(tramoGeneralP1.hfIncrementoVertical_m).toBeGreaterThan(0)
    expect(tramoGeneralP1.hf_m).toBeCloseTo(tramoGeneralP1.hfBase_m + tramoGeneralP1.hfIncrementoVertical_m, 12)
    // hf unitario coherente: el incremento escala linealmente con la base.
    expect(tramoGeneralP1.hfIncrementoVertical_m).toBeCloseTo((tramoGeneralP1.hfBase_m / 6) * 3, 12)
  })

  it('T9: en AC de Piso 1 el incremento aparece en Alimentacion general Y Alimentacion ACS, una sola vez cada uno', () => {
    const p = proyecto([uf('uf-p1', 1)])
    const ac = balanceAC(p, 'uf-p1')

    const conIncremento = ac.hfDistribuidaPorTramo.filter((t) => t.incrementoVertical_m > 0)
    expect(conIncremento.map((t) => t.tramoId).sort()).toEqual(['t-af-acs', 't-general'])
    for (const t of conIncremento) {
      expect(t.incrementoVertical_m).toBe(3)
      expect(t.hf_m).toBeCloseTo(t.hfBase_m + t.hfIncrementoVertical_m, 12)
    }
    expect(ac.incrementoVerticalPorNivel.tramosConIncremento).toHaveLength(2)
  })

  it('AC vs AF en Piso 1: AC acumula el doble de metros verticales que AF (general + ACS vs solo general)', () => {
    const p = proyecto([uf('uf-p1', 1)])
    const af = balanceAF(p, 'uf-p1')
    const ac = balanceAC(p, 'uf-p1')

    const incAf = af.hfDistribuidaPorTramo.reduce((s, t) => s + t.incrementoVertical_m, 0)
    const incAc = ac.hfDistribuidaPorTramo.reduce((s, t) => s + t.incrementoVertical_m, 0)
    expect(incAf).toBe(3)
    expect(incAc).toBe(6)
  })

  it('T11/T34: cambiar UF2 de Piso 1 a Piso 2 recalcula (3->6 m) sin tocar la UF de PB', () => {
    const antes = proyecto([uf('uf-pb', 0), uf('uf-p1', 1)])
    const pbAntes = balanceAF(antes, 'uf-pb')
    const p1Antes = balanceAF(antes, 'uf-p1')
    expect(p1Antes.incrementoVerticalPorNivel.deltaLVertical_m).toBe(3)

    const despues = proyecto([uf('uf-pb', 0), uf('uf-p1', 2)])
    const pbDespues = balanceAF(despues, 'uf-pb')
    const p2Despues = balanceAF(despues, 'uf-p1')

    expect(p2Despues.incrementoVerticalPorNivel.deltaLVertical_m).toBe(6)
    // Mas caño vertical -> mas hfDistribuida y menos Presidual que en Piso 1.
    expect(p2Despues.hfDistribuida_mca).toBeGreaterThan(p1Antes.hfDistribuida_mca)
    expect(p2Despues.presionResidual_mca).toBeLessThan(p1Antes.presionResidual_mca)
    // La UF de PB no cambia en nada.
    expect(pbDespues.presionResidual_mca).toBeCloseTo(pbAntes.presionResidual_mca, 12)
    expect(pbDespues.hfDistribuida_mca).toBeCloseTo(pbAntes.hfDistribuida_mca, 12)
  })

  it('T7: dos UFs en Piso 2 -> cada camino usa 6 m, no 12 (no acumulativo por cantidad de UFs)', () => {
    const p = proyecto([uf('uf-a', 2), uf('uf-b', 2)])
    const a = balanceAF(p, 'uf-a')
    const b = balanceAF(p, 'uf-b')

    expect(a.incrementoVerticalPorNivel.deltaLVertical_m).toBe(6)
    expect(b.incrementoVerticalPorNivel.deltaLVertical_m).toBe(6)
    expect(a.hfDistribuida_mca).toBeCloseTo(b.hfDistribuida_mca, 12)
    const tramoGeneralA = a.hfDistribuidaPorTramo.find((t) => t.tramoId === 't-general')!
    expect(tramoGeneralA.incrementoVertical_m).toBe(6)
  })
})

// M2-TOPO-C (§37-§41 / §69): cuando la Alimentación general es un segmento
// de montante explícito, el camino ya no recibe el +3·nivel automático de
// D-δ.50 -- el ascenso vertical lo modela la longitud real del montante.
// Sólo se anula la contribución de FRICCIÓN (efecto 2); la GEOMETRÍA
// (efecto 1, Δz por 1+3·nivel) es independiente y no cambia.
function conMontanteEnAlimentacionGeneral(p: Proyecto): Proyecto {
  return {
    ...p,
    montantes: [{ id: 'm-1', red: 'AF' }],
    redHidraulica: {
      ...p.redHidraulica!,
      tramos: p.redHidraulica!.tramos.map((t) => (t.id === 't-general' ? { ...t, montanteId: 'm-1' } : t)),
    },
  }
}

describe('supresión del ascenso implícito por montante explícito (M2-TOPO-C)', () => {
  it('la red con montante sobre la Alimentación general es estructuralmente válida', () => {
    expect(validarRedHidraulica(conMontanteEnAlimentacionGeneral(proyecto([uf('uf-p1', 1)])))).toEqual([])
  })

  it('§37/§41: Piso 1 con montante -> incremento suprimido, sin friccion vertical en ningun tramo', () => {
    const p = conMontanteEnAlimentacionGeneral(proyecto([uf('uf-p1', 1)]))
    const p1 = balanceAF(p, 'uf-p1')

    expect(p1.incrementoVerticalPorNivel.aplica).toBe(false)
    expect(p1.incrementoVerticalPorNivel.suprimidoPorMontante).toBe(true)
    // deltaLVertical_m se conserva sólo como referencia auditable.
    expect(p1.incrementoVerticalPorNivel.deltaLVertical_m).toBe(3)
    expect(p1.incrementoVerticalPorNivel.incrementoPorTramoId.size).toBe(0)
    for (const tramo of p1.hfDistribuidaPorTramo) {
      expect(tramo.incrementoVertical_m).toBe(0)
      expect(tramo.hf_m).toBeCloseTo(tramo.hfBase_m, 12)
    }
  })

  it('§41/§69: la supresión quita SOLO la fricción vertical; Δz y Presidual coinciden con "geometría sola"', () => {
    const base = proyecto([uf('uf-p1', 1)])
    const sinMontante = balanceAF(base, 'uf-p1')
    const conMontante = balanceAF(conMontanteEnAlimentacionGeneral(base), 'uf-p1')

    // GEOMETRÍA intacta: mismo desnivel (1+3·nivel), el montante no toca cotas.
    expect(conMontante.desnivel_m).toBeCloseTo(sinMontante.desnivel_m, 12)

    // FRICCIÓN: sin montante hay 3 m verticales extra sobre t-general; con
    // montante, cero. La diferencia de hfDistribuida es exactamente esa.
    const friccionVertical = sinMontante.hfDistribuida_mca - conMontante.hfDistribuida_mca
    const incVerticalSinMontante = sinMontante.hfDistribuidaPorTramo.reduce(
      (s, t) => s + t.hfIncrementoVertical_m,
      0,
    )
    expect(friccionVertical).toBeGreaterThan(0)
    expect(friccionVertical).toBeCloseTo(incVerticalSinMontante, 12)

    // Presidual: con montante es MAYOR, exactamente por esa fricción que ya
    // no se descuenta (no hay doble conteo).
    expect(conMontante.presionResidual_mca - sinMontante.presionResidual_mca).toBeCloseTo(friccionVertical, 12)
  })

  it('§37: en AC el ascenso también se suprime (el camino AC comparte t-general)', () => {
    const p = conMontanteEnAlimentacionGeneral(proyecto([uf('uf-p1', 1)]))
    const ac = balanceAC(p, 'uf-p1')

    expect(ac.incrementoVerticalPorNivel.suprimidoPorMontante).toBe(true)
    expect(ac.incrementoVerticalPorNivel.aplica).toBe(false)
    for (const tramo of ac.hfDistribuidaPorTramo) {
      expect(tramo.incrementoVertical_m).toBe(0)
    }
  })

  it('profesional no se ve afectado (el incremento ya era 0, con o sin montante)', () => {
    const base = proyecto([uf('uf-p1', 1)])
    const profesional: Proyecto = {
      ...base,
      configuracionHidraulica: { ...base.configuracionHidraulica, granularidadHidraulica: 'profesional' },
    }
    const conMontante = balanceAF(conMontanteEnAlimentacionGeneral(profesional), 'uf-p1')
    expect(conMontante.incrementoVerticalPorNivel.aplica).toBe(false)
    expect(conMontante.incrementoVerticalPorNivel.deltaLVertical_m).toBe(0)
  })
})
