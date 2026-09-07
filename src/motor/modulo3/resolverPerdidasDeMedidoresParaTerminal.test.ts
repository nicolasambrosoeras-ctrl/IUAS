import { describe, it, expect } from 'vitest'
import type { ConfiguracionDeMedidores } from '../../modelo/proyecto'
import type { MedidorEvaluado } from '../medidores/resolverMedidorAdoptado'
import type { ServicioMedido } from '../medidores/seleccionarMedidorIndividual'
import type { EstadoModulo3, MedidorIndividualEvaluado, ResultadoMedidorGeneral } from './resolverEstadoModulo3'
import {
  resolverPerdidasDeMedidoresParaTerminal,
  type EntradaPerdidasDeMedidoresParaTerminal,
} from './resolverPerdidasDeMedidoresParaTerminal'

function medidorEvaluado(hf: number): MedidorEvaluado {
  const fila = { dnMedidor_mm: 19, capacidadMaxima_m3h: 5, caudalMedio_m3h: 3.75, qcProyectoTabla_m3h: 2.5 }
  return {
    qcDiseno_lps: 0.5,
    qcDiseno_m3h: 1.8,
    qcl_lpm: 30,
    recomendado: { ...fila, hfMedidor_mca: hf },
    adoptado: { ...fila, origen: 'automatico', criterioSeleccion: 'satisface', hfMedidor_mca: hf },
  }
}

const general = (hf: number): ResultadoMedidorGeneral => ({ ...medidorEvaluado(hf), ambito: 'general' })

const individual = (uf: string, servicio: ServicioMedido, hf: number): MedidorIndividualEvaluado => ({
  alcance: { unidadFuncionalId: uf, servicioMedido: servicio, consumos: [] },
  resultado: { ...medidorEvaluado(hf), ambito: 'individual', unidadFuncionalId: uf, servicioMedido: servicio, nConsumos: 1 },
})

const evaluado = (
  medidorGeneral: ResultadoMedidorGeneral,
  medidoresIndividuales: readonly MedidorIndividualEvaluado[] = [],
): EstadoModulo3 => ({ estado: 'evaluado', resultado: { medidorGeneral, medidoresIndividuales } })

const CONFIG_NO_PH: ConfiguracionDeMedidores = { esPropiedadHorizontal: false, tipoProvisionACS: 'individual' }
const CONFIG_PH_IND: ConfiguracionDeMedidores = { esPropiedadHorizontal: true, tipoProvisionACS: 'individual' }
const CONFIG_PH_CENTRAL: ConfiguracionDeMedidores = { esPropiedadHorizontal: true, tipoProvisionACS: 'central' }

const resolver = (e: Partial<EntradaPerdidasDeMedidoresParaTerminal> & Pick<EntradaPerdidasDeMedidoresParaTerminal, 'estadoModulo3' | 'configuracionMedidores' | 'origenHidraulico'>) =>
  resolverPerdidasDeMedidoresParaTerminal({
    unidadFuncionalIdDelTerminal: 'uf-1',
    redDelTerminal: 'AF',
    ...e,
  })

describe('resolverPerdidasDeMedidoresParaTerminal (M3-E, D-δ.58)', () => {
  it('E1. directa + general: incluye el general', () => {
    const r = resolver({ estadoModulo3: evaluado(general(0.8)), configuracionMedidores: CONFIG_NO_PH, origenHidraulico: 'alimentacionDirecta' })
    expect(r.estado).toBe('determinadas')
    if (r.estado !== 'determinadas') return
    expect(r.componentes).toEqual([{ ambito: 'general', hf_mca: 0.8 }])
    expect(r.hfTotal_mca).toBe(0.8)
  })

  it('E2. tanque + general: EXCLUYE el general', () => {
    const r = resolver({ estadoModulo3: evaluado(general(0.8)), configuracionMedidores: CONFIG_NO_PH, origenHidraulico: 'tanqueElevado' })
    expect(r).toEqual({ estado: 'determinadas', componentes: [], hfTotal_mca: 0 })
  })

  it('E3. no PH + tanque: determinadas, componentes=[], total=0 (no es indeterminado)', () => {
    const r = resolver({ estadoModulo3: evaluado(general(0.8)), configuracionMedidores: CONFIG_NO_PH, origenHidraulico: 'tanqueElevado' })
    expect(r.estado).toBe('determinadas')
  })

  it('E4+E5. ACS individual: el medidor AF de la UF aplica a terminal AF Y a terminal AC', () => {
    const est = evaluado(general(0.8), [individual('uf-1', 'aguaFria', 0.4)])

    const af = resolver({ estadoModulo3: est, configuracionMedidores: CONFIG_PH_IND, origenHidraulico: 'tanqueElevado', redDelTerminal: 'AF' })
    const ac = resolver({ estadoModulo3: est, configuracionMedidores: CONFIG_PH_IND, origenHidraulico: 'tanqueElevado', redDelTerminal: 'AC' })

    if (af.estado !== 'determinadas' || ac.estado !== 'determinadas') throw new Error('esperaba determinadas')
    expect(af.hfTotal_mca).toBe(0.4)
    expect(ac.hfTotal_mca).toBe(0.4) // el MISMO medidor AF
    expect(ac.componentes[0]!.servicioMedido).toBe('aguaFria')
    expect(ac.componentes[0]!.aplicaPorProvisionACSIndividual).toBe(true)
    expect(af.componentes[0]!.aplicaPorProvisionACSIndividual).toBeUndefined()
  })

  it('E6+E7. ACS central: AF aplica sólo a AF; AC aplica sólo a AC', () => {
    const est = evaluado(general(0.8), [
      individual('uf-1', 'aguaFria', 0.4),
      individual('uf-1', 'aguaCaliente', 0.25),
    ])
    const af = resolver({ estadoModulo3: est, configuracionMedidores: CONFIG_PH_CENTRAL, origenHidraulico: 'tanqueElevado', redDelTerminal: 'AF' })
    const ac = resolver({ estadoModulo3: est, configuracionMedidores: CONFIG_PH_CENTRAL, origenHidraulico: 'tanqueElevado', redDelTerminal: 'AC' })
    if (af.estado !== 'determinadas' || ac.estado !== 'determinadas') throw new Error('esperaba determinadas')
    expect(af.hfTotal_mca).toBe(0.4)
    expect(ac.hfTotal_mca).toBe(0.25)
    expect(af.componentes).toHaveLength(1)
    expect(ac.componentes).toHaveLength(1)
  })

  it('E8. aislamiento por UF: el medidor de uf-1 no aplica a un terminal de uf-2', () => {
    const est = evaluado(general(0.8), [individual('uf-1', 'aguaFria', 0.4)])
    const r = resolver({
      estadoModulo3: est,
      configuracionMedidores: CONFIG_PH_IND,
      origenHidraulico: 'tanqueElevado',
      unidadFuncionalIdDelTerminal: 'uf-2',
    })
    expect(r.estado).toBe('indeterminado') // uf-2 no tiene su medidor -> no se fabrica el de uf-1
  })

  it('E9. directa: general + individual suman', () => {
    const est = evaluado(general(0.8), [individual('uf-1', 'aguaFria', 0.4)])
    const r = resolver({ estadoModulo3: est, configuracionMedidores: CONFIG_PH_IND, origenHidraulico: 'alimentacionDirecta' })
    if (r.estado !== 'determinadas') throw new Error('esperaba determinadas')
    expect(r.hfTotal_mca).toBeCloseTo(1.2, 10)
    expect(r.componentes.map((c) => c.ambito).sort()).toEqual(['general', 'individual'])
  })

  it('E10. tanque: sólo el individual', () => {
    const est = evaluado(general(0.8), [individual('uf-1', 'aguaFria', 0.4)])
    const r = resolver({ estadoModulo3: est, configuracionMedidores: CONFIG_PH_IND, origenHidraulico: 'tanqueElevado' })
    if (r.estado !== 'determinadas') throw new Error('esperaba determinadas')
    expect(r.hfTotal_mca).toBe(0.4)
    expect(r.componentes).toHaveLength(1)
  })

  it('E11. M3 no iniciado + medidor requerido: indeterminado (nunca 0)', () => {
    const r = resolver({ estadoModulo3: { estado: 'noIniciado' }, configuracionMedidores: undefined, origenHidraulico: 'alimentacionDirecta' })
    expect(r).toEqual({ estado: 'indeterminado', motivos: [{ tipo: 'modulo3NoIniciado' }] })
  })

  it('E12. medidor individual necesario ausente: indeterminado', () => {
    const est: EstadoModulo3 = {
      estado: 'incompleto',
      motivos: [{ tipo: 'medidorIndividualFueraDeTabla06', unidadFuncionalId: 'uf-1', servicioMedido: 'aguaFria', qcDiseno_m3h: 45, qcMaximoCubierto_m3h: 40 }],
      parcial: { medidorGeneral: general(0.8), medidoresIndividuales: [] },
    }
    const r = resolver({ estadoModulo3: est, configuracionMedidores: CONFIG_PH_IND, origenHidraulico: 'alimentacionDirecta' })
    expect(r.estado).toBe('indeterminado')
    if (r.estado !== 'indeterminado') return
    expect(r.motivos.some((m) => m.tipo === 'medidorIndividualNoDisponible')).toBe(true)
  })

  it('E12 bis (D-δ.58 §12). incompleto por el general, pero tanque + individual disponible: se resuelve igual', () => {
    // El general quedó fuera de Tabla N°6 (incompleto), pero con origen
    // tanque el general NO pertenece al camino y el individual SÍ está.
    const est: EstadoModulo3 = {
      estado: 'incompleto',
      motivos: [{ tipo: 'medidorGeneralFueraDeTabla06', qcDiseno_m3h: 55, qcMaximoCubierto_m3h: 40 }],
      parcial: { medidoresIndividuales: [individual('uf-1', 'aguaFria', 0.4)] },
    }
    const r = resolver({ estadoModulo3: est, configuracionMedidores: CONFIG_PH_IND, origenHidraulico: 'tanqueElevado' })
    expect(r).toEqual({
      estado: 'determinadas',
      componentes: [{ ambito: 'individual', hf_mca: 0.4, unidadFuncionalId: 'uf-1', servicioMedido: 'aguaFria' }],
      hfTotal_mca: 0.4,
    })
  })

  it('E13. override manual: usa la hf adoptada (no la recomendada)', () => {
    const g = general(0.8)
    const conOverride: ResultadoMedidorGeneral = {
      ...g,
      adoptado: { ...g.adoptado, origen: 'manual', hfMedidor_mca: 0.3 }, // DN mayor -> hf menor
    }
    const r = resolver({ estadoModulo3: evaluado(conOverride), configuracionMedidores: CONFIG_NO_PH, origenHidraulico: 'alimentacionDirecta' })
    if (r.estado !== 'determinadas') throw new Error('esperaba determinadas')
    expect(r.hfTotal_mca).toBe(0.3) // adoptada, no 0,8
  })

  it('E14. "Auto" (sin override): usa la hf automática', () => {
    const r = resolver({ estadoModulo3: evaluado(general(0.8)), configuracionMedidores: CONFIG_NO_PH, origenHidraulico: 'alimentacionDirecta' })
    if (r.estado !== 'determinadas') throw new Error('esperaba determinadas')
    expect(r.hfTotal_mca).toBe(0.8)
  })

  // --- anti-atajo ---

  it('ANTI-ATAJO A: NO usa siempre la hf del general para todos los terminales', () => {
    // tanque + no PH -> el general (0,8) NO debe aparecer.
    const r = resolver({ estadoModulo3: evaluado(general(0.8)), configuracionMedidores: CONFIG_NO_PH, origenHidraulico: 'tanqueElevado' })
    if (r.estado !== 'determinadas') throw new Error('esperaba determinadas')
    expect(r.hfTotal_mca).toBe(0) // fallaría si hiciera hfMedidor = general.hf
  })

  it('ANTI-ATAJO B: ACS individual + terminal AC aplica el medidor AF (no exige servicioMedido === redTerminal)', () => {
    const est = evaluado(general(0.8), [individual('uf-1', 'aguaFria', 0.4)])
    const ac = resolver({ estadoModulo3: est, configuracionMedidores: CONFIG_PH_IND, origenHidraulico: 'tanqueElevado', redDelTerminal: 'AC' })
    // fallaría (indeterminado) si aplicara individuales sólo cuando servicioMedido === 'AC'
    expect(ac.estado).toBe('determinadas')
    if (ac.estado !== 'determinadas') return
    expect(ac.hfTotal_mca).toBe(0.4)
  })

  it('estado error -> indeterminado', () => {
    const r = resolver({ estadoModulo3: { estado: 'error', problemas: [] }, configuracionMedidores: CONFIG_NO_PH, origenHidraulico: 'alimentacionDirecta' })
    expect(r).toEqual({ estado: 'indeterminado', motivos: [{ tipo: 'modulo3ConError' }] })
  })
})
