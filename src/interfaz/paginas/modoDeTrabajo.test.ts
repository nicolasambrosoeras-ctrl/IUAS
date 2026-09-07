// D-δ.51 (§1-§3/§10-§11/§15-§17, tests R5/R10-R12, P1/P9): el "modo de
// trabajo" se DERIVA de granularidad + metodoPerdidaLocalizada; aplicarlo
// fija esos ejes y precarga longitudes undefined, sin resetear datos.
import { describe, it, expect } from 'vitest'
import type { MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { GranularidadHidraulica, MetodoPerdidaDistribuida, MetodoPerdidaLocalizada } from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { aplicarModoProfesional, aplicarModoRapido, resolverModoDeTrabajo } from './modoDeTrabajo'

function proyecto(cfg: {
  granularidadHidraulica: GranularidadHidraulica
  metodoPerdidaLocalizada: MetodoPerdidaLocalizada
  metodoPerdidaDistribuida?: MetodoPerdidaDistribuida
  longGeneral?: number
}): Proyecto {
  const metadatos: MetadatosProyecto = {
    nombre: 'P', obra: 'O', comitente: 'C', fecha: '2026-09-07', schemaVersion: '1.0.0', versionNormativa: 'eras-2023',
  }
  const parametros: ParametrosProyecto = { tipoDeProyecto: 'viviendaIndividual', presionSobreAcera_m: 0, alturaArtefactoMasDesfavorable_m: 0 }
  const uf: UnidadFuncional = {
    id: 'uf-1',
    nombre: 'UF 1',
    nivel: 0,
    cotaHidraulicaReferencia_m: 1,
    locales: [
      { id: 'l-bano', tipo: 'bano', regimen: 'domiciliario', artefactos: [{ id: 'a1', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }] },
    ],
  }
  const nodos: Nodo[] = [
    { id: 'n-general' },
    { id: 'n0' },
    { id: 'n-af', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'l-bano', artefactoId: 'a1' } },
  ]
  const tramos: Tramo[] = [
    cfg.longGeneral === undefined
      ? { id: 't-general', nodoOrigenId: 'n-general', nodoDestinoId: 'n0', red: 'AF' }
      : { id: 't-general', nodoOrigenId: 'n-general', nodoDestinoId: 'n0', red: 'AF', longitud_m: cfg.longGeneral },
    { id: 't-af', nodoOrigenId: 'n0', nodoDestinoId: 'n-af', red: 'AF' },
  ]
  const redHidraulica: RedHidraulica = { nodos, tramos }
  return {
    metadatos,
    parametros,
    unidadesFuncionales: [uf],
    redHidraulica,
    configuracionHidraulica: {
      metodoPerdidaDistribuida: cfg.metodoPerdidaDistribuida ?? 'hazenWilliams',
      metodoPerdidaLocalizada: cfg.metodoPerdidaLocalizada,
      granularidadHidraulica: cfg.granularidadHidraulica,
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

describe('resolverModoDeTrabajo', () => {
  it('simplificada + estimadas -> rapido', () => {
    expect(resolverModoDeTrabajo(proyecto({ granularidadHidraulica: 'simplificada', metodoPerdidaLocalizada: 'estimado' }).configuracionHidraulica)).toBe('rapido')
  })
  it('profesional + detalladas -> profesional', () => {
    expect(resolverModoDeTrabajo(proyecto({ granularidadHidraulica: 'profesional', metodoPerdidaLocalizada: 'detallado' }).configuracionHidraulica)).toBe('profesional')
  })
  it('cualquier otra combinación -> avanzado', () => {
    expect(resolverModoDeTrabajo(proyecto({ granularidadHidraulica: 'simplificada', metodoPerdidaLocalizada: 'detallado' }).configuracionHidraulica)).toBe('avanzado')
    expect(resolverModoDeTrabajo(proyecto({ granularidadHidraulica: 'profesional', metodoPerdidaLocalizada: 'estimado' }).configuracionHidraulica)).toBe('avanzado')
  })
})

describe('aplicarModoRapido (D-δ.51)', () => {
  it('R10/R11/R12: fija simplificada + estimadas + Hazen-Williams', () => {
    const p = aplicarModoRapido(proyecto({ granularidadHidraulica: 'profesional', metodoPerdidaLocalizada: 'detallado', metodoPerdidaDistribuida: 'darcyWeisbach' }))
    expect(p.configuracionHidraulica.granularidadHidraulica).toBe('simplificada')
    expect(p.configuracionHidraulica.metodoPerdidaLocalizada).toBe('estimado')
    expect(p.configuracionHidraulica.metodoPerdidaDistribuida).toBe('hazenWilliams')
    expect(resolverModoDeTrabajo(p.configuracionHidraulica)).toBe('rapido')
  })

  it('precarga la longitud de Distribución general (10 m) al entrar', () => {
    const p = aplicarModoRapido(proyecto({ granularidadHidraulica: 'profesional', metodoPerdidaLocalizada: 'detallado' }))
    expect(p.redHidraulica!.tramos.find((t) => t.id === 't-general')!.longitud_m).toBe(10)
  })

  it('§15/§17: no sobreescribe una longitud ya cargada al cambiar de modo', () => {
    const p = aplicarModoRapido(proyecto({ granularidadHidraulica: 'profesional', metodoPerdidaLocalizada: 'detallado', longGeneral: 7 }))
    expect(p.redHidraulica!.tramos.find((t) => t.id === 't-general')!.longitud_m).toBe(7)
  })
})

describe('aplicarModoProfesional (D-δ.51)', () => {
  it('P1/P9: fija profesional + detalladas, NO fuerza Hazen (conserva Darcy del proyectista)', () => {
    const p = aplicarModoProfesional(proyecto({ granularidadHidraulica: 'simplificada', metodoPerdidaLocalizada: 'estimado', metodoPerdidaDistribuida: 'darcyWeisbach' }))
    expect(p.configuracionHidraulica.granularidadHidraulica).toBe('profesional')
    expect(p.configuracionHidraulica.metodoPerdidaLocalizada).toBe('detallado')
    expect(p.configuracionHidraulica.metodoPerdidaDistribuida).toBe('darcyWeisbach')
    expect(resolverModoDeTrabajo(p.configuracionHidraulica)).toBe('profesional')
  })

  it('P2: precarga longitudes undefined (todas las que el motor profesional itera), sin tocar accesorios', () => {
    const p = aplicarModoProfesional(proyecto({ granularidadHidraulica: 'simplificada', metodoPerdidaLocalizada: 'estimado' }))
    expect(p.redHidraulica!.tramos.find((t) => t.id === 't-general')!.longitud_m).toBe(10)
    expect(p.redHidraulica!.tramos.find((t) => t.id === 't-af')!.longitud_m).toBe(5)
    // decisión roja A: accesorios NUNCA se precargan
    for (const t of p.redHidraulica!.tramos) {
      expect(t.accesorios).toBeUndefined()
    }
  })

  it('P1: no pierde una longitud editada al cambiar Rápido -> Profesional', () => {
    const p = aplicarModoProfesional(proyecto({ granularidadHidraulica: 'simplificada', metodoPerdidaLocalizada: 'estimado', longGeneral: 7 }))
    expect(p.redHidraulica!.tramos.find((t) => t.id === 't-general')!.longitud_m).toBe(7)
  })
})
