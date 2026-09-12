import { describe, expect, it } from 'vitest'
import type { Proyecto } from '../../../modelo/proyecto'
import { fixture } from './hydEst.fixture'
import { catalogoArtefactos } from '../../../normativa/eras-2023/catalogo-artefactos'
import { catalogoSistemasDeTuberia } from '../sistemaDeTuberia'
import { catalogoMaterialesTuberia } from '../materialTuberia'
import { obtenerCaminoHaciaOrigen } from '../topologia/obtenerCaminoHaciaOrigen'
import { crearContextoDeCalculoM2 } from '../contextoDeCalculoM2'
import { resolverPerdidaDistribuidaDeTramo } from '../resolverPerdidaDistribuidaDeTramo'
import { resolverDiametroComercialDeTramo } from '../resolverDiametroComercialDeTramo'
import { acumularPerdidaLocalizadaDeCamino } from './acumularPerdidaLocalizadaDeCamino'
import { resolverPresionResidualDeCamino } from './resolverPresionResidualDeCamino'
import { obtenerIndiceEstimacionLocalizada, resolverPerdidaLocalizadaEstimadaDeCamino } from './resolverPerdidaLocalizadaEstimadaDeCamino'


function conDn(p: Proyecto, id: string, dn: string | undefined): Proyecto {
  return { ...p, redHidraulica: { ...p.redHidraulica!, tramos: p.redHidraulica!.tramos.map(t => {
    if (t.id !== id) return t
    const copia = { ...t }
    if (dn === undefined) delete copia.dnComercialAdoptado
    else copia.dnComercialAdoptado = dn
    return copia
  }) } }
}

function camino(p: Proyecto, i = 0) {
  const c = obtenerCaminoHaciaOrigen(p.redHidraulica!, `terminal-${i}`)
  if (c.tipo !== 'camino') throw new Error('fixture sin camino')
  return c
}
function resolver(p: Proyecto, i = 0, contexto = crearContextoDeCalculoM2()) {
  return resolverPerdidaLocalizadaEstimadaDeCamino(p, camino(p, i), catalogoArtefactos, catalogoSistemasDeTuberia, contexto)
}
function calculada(p: Proyecto, i = 0) {
  const r = resolver(p, i)
  if (r.tipo !== 'estimada') throw new Error(JSON.stringify(r))
  return r
}

describe('HYD-EST-01: singularidades derivadas del camino y velocidades vigentes', () => {
  it('la llave usa la entrada representativa editable, no la distribución general exclusiva de un solo Local', () => {
    const p = fixture()
    const conGeneral: Proyecto = { ...p, redHidraulica: {
      nodos: [{ id: 'fuente', cota_m: 10 }, ...p.redHidraulica!.nodos],
      tramos: [{ id: 'general', nodoOrigenId: 'fuente', nodoDestinoId: 'origen', red: 'AF', longitud_m: 5, dnComercialAdoptado: '25 mm' }, ...p.redHidraulica!.tramos],
    } }
    const a = calculada(conGeneral)
    expect(a.porSingularidad.find(s => s.tipo === 'llaveDePaso')!.tramoId).toBe('comun')
    expect(calculada(conDn(conGeneral, 'comun', '125 mm')).hf_m).toBeLessThan(a.hf_m)
  })

  it('presión usa la hf del camino: diferencia de residual = reducción de pérdidas distribuida y localizada', () => {
    const p = fixture(4)
    const resolverPresion = (proyecto: Proyecto) => resolverPresionResidualDeCamino(proyecto, 'terminal-0', 30, 0, catalogoArtefactos, catalogoSistemasDeTuberia, catalogoMaterialesTuberia)
    const a = resolverPresion(p)
    const b = resolverPresion(conDn(p, 'comun', '125 mm'))
    if (a.tipo !== 'balanceCompleto' || b.tipo !== 'balanceCompleto') throw new Error('balance incompleto')
    expect(a.hfLocalizada.hf_mca).toBe(calculada(p).hf_m)
    expect(b.presionResidual_mca - a.presionResidual_mca).toBeCloseTo(a.hfDistribuida_mca - b.hfDistribuida_mca + a.hfLocalizada.hf_mca - b.hfLocalizada.hf_mca, 12)
    expect(resolverPresion(conDn(conDn(p, 'comun', '125 mm'), 'comun', '25 mm'))).toEqual(a)
  })

  it('otra UF/Local/AC independiente conserva cada contribución al cambiar AF', () => {
    const p = fixture()
    const otra = fixture()
    const mixto: Proyecto = { ...p,
      unidadesFuncionales: [...p.unidadesFuncionales, ...otra.unidadesFuncionales.map(u => ({ ...u, id: 'otra-uf' }))],
      redHidraulica: {
        nodos: [...p.redHidraulica!.nodos, ...otra.redHidraulica!.nodos.map(n => ({ ...n, id: `otra-${n.id}`, ...(n.referencia?.tipo === 'artefacto' ? { referencia: { ...n.referencia, unidadFuncionalId: 'otra-uf' } } : {}) }))],
        tramos: [...p.redHidraulica!.tramos, ...otra.redHidraulica!.tramos.map(t => ({ ...t, id: `otra-${t.id}`, nodoOrigenId: `otra-${t.nodoOrigenId}`, nodoDestinoId: `otra-${t.nodoDestinoId}`, red: 'AC' as const }))],
      },
    }
    const c = obtenerCaminoHaciaOrigen(mixto.redHidraulica!, 'otra-terminal-0')
    if (c.tipo !== 'camino') throw new Error('sin camino')
    const resolverOtra = (proyecto: Proyecto) => resolverPerdidaLocalizadaEstimadaDeCamino(proyecto, c, catalogoArtefactos, catalogoSistemasDeTuberia)
    expect(resolverOtra(mixto).tipo).toBe('estimada')
    expect(resolverOtra(conDn(mixto, 'comun', '125 mm'))).toEqual(resolverOtra(mixto))
  })

  it('dos terminales: una singularidad final propia y una tee por camino, con V saliente', () => {
    const p = fixture()
    for (let i = 0; i < 2; i++) {
      const r = calculada(p, i)
      const v = resolverDiametroComercialDeTramo(p, `ramal-${i}`, catalogoArtefactos, catalogoSistemasDeTuberia)
      if (v.tipo !== 'conCandidato') throw new Error('sin velocidad')
      const finales = r.porSingularidad.filter(s => s.tipo === 'terminal')
      expect(finales).toHaveLength(1)
      expect(finales[0]).toMatchObject({ ks: 1.35, tramoId: `ramal-${i}`, velocidad_mps: v.velocidadReal_mps })
      expect(finales[0]!.hf_m).toBeCloseTo(1.35 * v.velocidadReal_mps ** 2 / 19.62, 12)
      const tees = r.porSingularidad.filter(s => s.tipo === 'tee')
      expect(tees).toHaveLength(1)
      expect(tees[0]).toMatchObject({ ks: 3, tramoId: `ramal-${i}`, velocidad_mps: v.velocidadReal_mps })
      expect(r.porSingularidad).toHaveLength(3)
    }
    expect(calculada(p, 0).porSingularidad.at(-1)!.velocidad_mps).not.toBe(calculada(p, 1).porSingularidad.at(-1)!.velocidad_mps)
  })

  it('cambiar ramal A no altera el terminal B ni le transfiere singularidades', () => {
    const p = fixture()
    const cambiado = conDn(p, 'ramal-0', '32 mm')
    expect(calculada(cambiado, 0).hf_m).toBeLessThan(calculada(p, 0).hf_m)
    expect(calculada(cambiado, 1)).toEqual(calculada(p, 1))
    expect(calculada(cambiado, 0).porSingularidad.some(s => s.tramoId === 'ramal-1')).toBe(false)
  })

  it('DN125: cuatro terminales binarios; sólo baja la llave del tramo común', () => {
    const p = fixture(4)
    let previo: { v: number; distribuida: number; localizada: number } | undefined
    const finalesIniciales = calculada(p).porSingularidad.filter(s => s.tipo !== 'llaveDePaso')
    for (const dn of ['20 mm', '25 mm', '32 mm', '40 mm', '50 mm', '63 mm', '75 mm', '90 mm', '110 mm', '125 mm']) {
      const editado = conDn(p, 'comun', dn)
      const r = calculada(editado)
      const d = resolverPerdidaDistribuidaDeTramo(editado, 'comun', catalogoArtefactos, catalogoSistemasDeTuberia, catalogoMaterialesTuberia)
      if (d.tipo !== 'conPerdidaDistribuida') throw new Error(JSON.stringify(d))
      const llave = r.porSingularidad.find(s => s.tipo === 'llaveDePaso')!
      expect(llave.ks).toBe(9.18)
      expect(r.porSingularidad.filter(s => s.tipo !== 'llaveDePaso')).toEqual(finalesIniciales)
      expect(Number.isFinite(r.hf_m + d.hf_m)).toBe(true)
      if (previo !== undefined) {
        expect(llave.velocidad_mps).toBeLessThan(previo.v)
        expect(d.hf_m).toBeLessThan(previo.distribuida)
        expect(r.hf_m).toBeLessThan(previo.localizada)
      }
      previo = { v: llave.velocidad_mps, distribuida: d.hf_m, localizada: r.hf_m }
    }
    expect(previo!.localizada).toBeGreaterThan(finalesIniciales.reduce((s, c) => s + c.hf_m, 0))
  })

  it('DN manual reversible y retorno a Auto sin cache persistente', () => {
    const auto = conDn(fixture(), 'comun', undefined)
    const p20 = conDn(auto, 'comun', '20 mm')
    const p25 = conDn(p20, 'comun', '25 mm')
    expect(calculada(p25).hf_m).toBeLessThan(calculada(p20).hf_m)
    expect(calculada(conDn(p25, 'comun', '20 mm'))).toEqual(calculada(p20))
    expect(calculada(conDn(p25, 'comun', undefined))).toEqual(calculada(auto))
  })

  it('N=4: cuatro finales y tres tees físicas únicas, sin persistencia ni repetición de topología', () => {
    const p = fixture(4)
    const antes = structuredClone(p)
    const contexto = crearContextoDeCalculoM2()
    const indice = obtenerIndiceEstimacionLocalizada(p, contexto)
    const finales = new Set<string>()
    const tees = new Set<string>()
    for (let i = 0; i < 4; i++) {
      const r = resolver(p, i, contexto)
      if (r.tipo !== 'estimada') throw new Error('incompleta')
      for (const s of r.porSingularidad) {
        if (s.tipo === 'terminal') finales.add(s.nodoId)
        if (s.tipo === 'tee') tees.add(s.nodoId)
      }
      expect(r.porSingularidad.filter(s => s.tipo === 'tee')).toHaveLength(2)
    }
    expect(finales.size).toBe(4)
    expect(tees.size).toBe(3)
    expect(obtenerIndiceEstimacionLocalizada(p, contexto)).toBe(indice)
    expect(p).toEqual(antes)
  })

  it('1→N no modelado es incompleto, sin suma parcial ni fallback antiguo', () => {
    const p = fixture(3)
    expect(resolver(p)).toEqual({ tipo: 'incompleta', tramosNoResueltos: [{ tramoId: 'ramal-0', motivo: 'derivacionMultipleNoModelada' }] })
    expect(resolver(conDn(p, 'comun', '125 mm'))).toEqual(resolver(p))
  })

  it('no reinterpreta geometría configurada ni incorpora accesorios detallados/reductores', () => {
    const p = fixture()
    const modificado: Proyecto = { ...p, redHidraulica: { nodos: p.redHidraulica!.nodos.map(n => n.id === 'entrada' ? { ...n, tee: { tipo: 'entradaPorExtremo', tramoSalidaRectaId: 'ramal-0' } } : n), tramos: p.redHidraulica!.tramos.map(t => ({ ...t, accesorios: [{ tipo: 'reducciones', cantidad: 7 }] })) } }
    expect(calculada(modificado)).toEqual(calculada(p))
  })

  it('Detalladas conserva exactamente su resultado después de resolver Estimadas', () => {
    const p = fixture()
    p.configuracionHidraulica = { ...p.configuracionHidraulica, metodoPerdidaLocalizada: 'detallado' }
    const detallada = () => acumularPerdidaLocalizadaDeCamino(p, camino(p), catalogoArtefactos, catalogoSistemasDeTuberia)
    const antes = detallada()
    calculada(p)
    expect(detallada()).toEqual(antes)
    if (antes.tipo !== 'acumulada') throw new Error('fixture detallado incompleto')
    const v = resolverDiametroComercialDeTramo(p, 'ramal-0', catalogoArtefactos, catalogoSistemasDeTuberia)
    if (v.tipo !== 'conCandidato') throw new Error('sin velocidad')
    expect(antes.hf_m).toBeCloseTo(3 * v.velocidadReal_mps ** 2 / 19.62, 12)
  })
})
