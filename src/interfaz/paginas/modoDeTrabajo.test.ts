// MODE-UX-01 (D-δ.89): el modo de trabajo es un campo EXPLÍCITO del
// Proyecto (`modoTrabajo`), desacoplado de `configuracionHidraulica`.
// `resolverModoDeTrabajo` lee el campo (o infiere por compatibilidad legacy
// si falta); `aplicarModoRapido` / `aplicarModoProfesional` fijan el campo,
// aplican/restauran el preset del modo y snapshotean la config Profesional.
import { describe, it, expect } from 'vitest'
import type {
  ConfiguracionHidraulica,
  MetadatosProyecto,
  ModoDeTrabajo,
  ParametrosProyecto,
  Proyecto,
  UnidadFuncional,
} from '../../modelo/proyecto'
import type { GranularidadHidraulica, MetodoPerdidaDistribuida, MetodoPerdidaLocalizada } from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import {
  aplicarModoProfesional,
  aplicarModoRapido,
  inferirModoDeTrabajoLegacy,
  PRESET_EJES_INICIALES,
  resolverModoDeTrabajo,
} from './modoDeTrabajo'

function proyecto(cfg: {
  modoTrabajo?: ModoDeTrabajo
  granularidadHidraulica: GranularidadHidraulica
  metodoPerdidaLocalizada: MetodoPerdidaLocalizada
  metodoPerdidaDistribuida?: MetodoPerdidaDistribuida
  materialTuberiaId?: ConfiguracionHidraulica['materialTuberiaId']
  longGeneral?: number
  ultimaConfiguracionProfesional?: ConfiguracionHidraulica
}): Proyecto {
  const metadatos: MetadatosProyecto = {
    nombre: 'P', obra: 'O', comitente: 'C', fecha: '2026-09-09', schemaVersion: '1.0.0', versionNormativa: 'eras-2023',
  }
  const parametros: ParametrosProyecto = { tipoDeProyecto: 'viviendaIndividual', presionSobreAcera_m: 0, alturaArtefactoMasDesfavorable_m: 0 }
  const uf: UnidadFuncional = {
    id: 'uf-1',
    nombre: 'UF 1',
    niveles: [
      {
        id: 'uf-1-nivel-1',
        nombre: 'Nivel 1',
        nivel: 0,
        cotaHidraulicaReferencia_m: 1,
        locales: [
          { id: 'l-bano', tipo: 'bano', regimen: 'domiciliario', artefactos: [{ id: 'a1', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }] },
        ],
      },
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
    ...(cfg.modoTrabajo !== undefined ? { modoTrabajo: cfg.modoTrabajo } : {}),
    ...(cfg.ultimaConfiguracionProfesional !== undefined
      ? { ultimaConfiguracionProfesional: cfg.ultimaConfiguracionProfesional }
      : {}),
    configuracionHidraulica: {
      metodoPerdidaDistribuida: cfg.metodoPerdidaDistribuida ?? 'hazenWilliams',
      metodoPerdidaLocalizada: cfg.metodoPerdidaLocalizada,
      granularidadHidraulica: cfg.granularidadHidraulica,
      materialTuberiaId: cfg.materialTuberiaId ?? 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

const CONFIG_PROFESIONAL_CUSTOM: ConfiguracionHidraulica = {
  metodoPerdidaDistribuida: 'darcyWeisbach',
  metodoPerdidaLocalizada: 'detallado',
  granularidadHidraulica: 'profesional',
  materialTuberiaId: 'cobre',
  sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
}

describe('resolverModoDeTrabajo — campo explícito primero (MODE-UX-01)', () => {
  it('INVARIANTE CENTRAL: modoTrabajo=profesional + config Hazen/Estimadas/Simplificada -> Profesional, nunca Rápido', () => {
    const p = proyecto({
      modoTrabajo: 'profesional',
      granularidadHidraulica: 'simplificada',
      metodoPerdidaLocalizada: 'estimado',
      metodoPerdidaDistribuida: 'hazenWilliams',
    })
    expect(resolverModoDeTrabajo(p)).toBe('profesional')
  })

  it('el campo explícito gana aunque la config sea la del otro modo', () => {
    const rapidoConConfigProfesional = proyecto({
      modoTrabajo: 'rapido',
      granularidadHidraulica: 'profesional',
      metodoPerdidaLocalizada: 'detallado',
    })
    expect(resolverModoDeTrabajo(rapidoConConfigProfesional)).toBe('rapido')
  })
})

describe('inferirModoDeTrabajoLegacy — sólo proyectos sin modoTrabajo', () => {
  it('config histórica Rápida (simplificada + estimadas) -> rapido', () => {
    const legacy = proyecto({ granularidadHidraulica: 'simplificada', metodoPerdidaLocalizada: 'estimado' })
    expect(legacy.modoTrabajo).toBeUndefined()
    expect(resolverModoDeTrabajo(legacy)).toBe('rapido')
    expect(inferirModoDeTrabajoLegacy(legacy.configuracionHidraulica)).toBe('rapido')
  })

  it('config histórica Profesional (profesional + detalladas) -> profesional', () => {
    const legacy = proyecto({ granularidadHidraulica: 'profesional', metodoPerdidaLocalizada: 'detallado' })
    expect(resolverModoDeTrabajo(legacy)).toBe('profesional')
  })

  it('el antiguo "avanzado" (cualquier otra combinación) colapsa a profesional', () => {
    expect(
      inferirModoDeTrabajoLegacy(
        proyecto({ granularidadHidraulica: 'simplificada', metodoPerdidaLocalizada: 'detallado' }).configuracionHidraulica,
      ),
    ).toBe('profesional')
    expect(
      inferirModoDeTrabajoLegacy(
        proyecto({ granularidadHidraulica: 'profesional', metodoPerdidaLocalizada: 'estimado' }).configuracionHidraulica,
      ),
    ).toBe('profesional')
  })
})

describe('aplicarModoProfesional', () => {
  it('Caso A: Rápido -> Profesional por primera vez arranca en Hazen + Estimadas + Simplificada (no salta a Detalladas/Profesional)', () => {
    const p = aplicarModoProfesional(proyecto({ modoTrabajo: 'rapido', granularidadHidraulica: 'simplificada', metodoPerdidaLocalizada: 'estimado' }))
    expect(p.modoTrabajo).toBe('profesional')
    expect(p.configuracionHidraulica.metodoPerdidaDistribuida).toBe('hazenWilliams')
    expect(p.configuracionHidraulica.metodoPerdidaLocalizada).toBe('estimado')
    expect(p.configuracionHidraulica.granularidadHidraulica).toBe('simplificada')
    expect(resolverModoDeTrabajo(p)).toBe('profesional')
  })

  it('el preset inicial de Profesional coincide con PRESET_EJES_INICIALES', () => {
    const p = aplicarModoProfesional(proyecto({ modoTrabajo: 'rapido', granularidadHidraulica: 'simplificada', metodoPerdidaLocalizada: 'estimado' }))
    expect(p.configuracionHidraulica).toMatchObject(PRESET_EJES_INICIALES)
  })

  it('Caso E: si hay ultimaConfiguracionProfesional, se restaura como config activa', () => {
    const p = aplicarModoProfesional(
      proyecto({
        modoTrabajo: 'rapido',
        granularidadHidraulica: 'simplificada',
        metodoPerdidaLocalizada: 'estimado',
        ultimaConfiguracionProfesional: CONFIG_PROFESIONAL_CUSTOM,
      }),
    )
    expect(p.modoTrabajo).toBe('profesional')
    expect(p.configuracionHidraulica).toEqual(CONFIG_PROFESIONAL_CUSTOM)
  })

  it('clic idempotente estando ya en Profesional: NO re-restaura el snapshot sobre ediciones vivas', () => {
    const yaProfesionalEditado = proyecto({
      modoTrabajo: 'profesional',
      granularidadHidraulica: 'profesional',
      metodoPerdidaLocalizada: 'detallado',
      metodoPerdidaDistribuida: 'darcyWeisbach',
      ultimaConfiguracionProfesional: {
        metodoPerdidaDistribuida: 'hazenWilliams',
        metodoPerdidaLocalizada: 'estimado',
        granularidadHidraulica: 'simplificada',
        materialTuberiaId: 'ppr',
        sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
      },
    })
    const p = aplicarModoProfesional(yaProfesionalEditado)
    expect(p.configuracionHidraulica).toEqual(yaProfesionalEditado.configuracionHidraulica)
  })

  it('precarga longitudes undefined al entrar (backfill no destructivo)', () => {
    const p = aplicarModoProfesional(proyecto({ modoTrabajo: 'rapido', granularidadHidraulica: 'simplificada', metodoPerdidaLocalizada: 'estimado' }))
    expect(p.redHidraulica!.tramos.find((t) => t.id === 't-general')!.longitud_m).toBe(10)
  })
})

describe('aplicarModoRapido', () => {
  it('Caso D: Profesional personalizado -> Rápido aplica el preset seguro y fija modoTrabajo', () => {
    const p = aplicarModoRapido(
      proyecto({
        modoTrabajo: 'profesional',
        granularidadHidraulica: 'profesional',
        metodoPerdidaLocalizada: 'detallado',
        metodoPerdidaDistribuida: 'darcyWeisbach',
      }),
    )
    expect(p.modoTrabajo).toBe('rapido')
    expect(p.configuracionHidraulica.metodoPerdidaDistribuida).toBe('hazenWilliams')
    expect(p.configuracionHidraulica.metodoPerdidaLocalizada).toBe('estimado')
    expect(p.configuracionHidraulica.granularidadHidraulica).toBe('simplificada')
    expect(resolverModoDeTrabajo(p)).toBe('rapido')
  })

  it('Caso D/E: al salir de Profesional guarda un snapshot de la config activa', () => {
    const p = aplicarModoRapido(
      proyecto({
        modoTrabajo: 'profesional',
        granularidadHidraulica: CONFIG_PROFESIONAL_CUSTOM.granularidadHidraulica,
        metodoPerdidaLocalizada: CONFIG_PROFESIONAL_CUSTOM.metodoPerdidaLocalizada,
        metodoPerdidaDistribuida: CONFIG_PROFESIONAL_CUSTOM.metodoPerdidaDistribuida,
        materialTuberiaId: CONFIG_PROFESIONAL_CUSTOM.materialTuberiaId,
      }),
    )
    expect(p.ultimaConfiguracionProfesional).toEqual(CONFIG_PROFESIONAL_CUSTOM)
  })

  it('viniendo de Rápido NO pisa un snapshot Profesional previo', () => {
    const p = aplicarModoRapido(
      proyecto({
        modoTrabajo: 'rapido',
        granularidadHidraulica: 'simplificada',
        metodoPerdidaLocalizada: 'estimado',
        ultimaConfiguracionProfesional: CONFIG_PROFESIONAL_CUSTOM,
      }),
    )
    expect(p.ultimaConfiguracionProfesional).toEqual(CONFIG_PROFESIONAL_CUSTOM)
  })

  it('round-trip Caso E: P(custom) -> R -> P restaura la custom', () => {
    const profesionalCustom = proyecto({
      modoTrabajo: 'profesional',
      granularidadHidraulica: CONFIG_PROFESIONAL_CUSTOM.granularidadHidraulica,
      metodoPerdidaLocalizada: CONFIG_PROFESIONAL_CUSTOM.metodoPerdidaLocalizada,
      metodoPerdidaDistribuida: CONFIG_PROFESIONAL_CUSTOM.metodoPerdidaDistribuida,
      materialTuberiaId: CONFIG_PROFESIONAL_CUSTOM.materialTuberiaId,
    })
    const enRapido = aplicarModoRapido(profesionalCustom)
    expect(resolverModoDeTrabajo(enRapido)).toBe('rapido')
    const deVuelta = aplicarModoProfesional(enRapido)
    expect(resolverModoDeTrabajo(deVuelta)).toBe('profesional')
    expect(deVuelta.configuracionHidraulica).toEqual(CONFIG_PROFESIONAL_CUSTOM)
  })

  it('no sobreescribe una longitud ya cargada al cambiar de modo', () => {
    const p = aplicarModoRapido(proyecto({ modoTrabajo: 'profesional', granularidadHidraulica: 'profesional', metodoPerdidaLocalizada: 'detallado', longGeneral: 7 }))
    expect(p.redHidraulica!.tramos.find((t) => t.id === 't-general')!.longitud_m).toBe(7)
  })
})

describe('Caso B/C: cambiar controles hidráulicos en Profesional NO cambia el modo', () => {
  // Los updaters de configuracionHidraulica (conMetodoPerdidaLocalizada,
  // conGranularidadHidraulica, ...) preservan el resto del Proyecto por
  // spread, incluido `modoTrabajo`. resolverModoDeTrabajo sigue devolviendo
  // 'profesional' porque lee el campo, no la combinación.
  it('Caso B: Profesional + pasar Estimadas -> Detalladas sigue Profesional', () => {
    const base = proyecto({ modoTrabajo: 'profesional', granularidadHidraulica: 'simplificada', metodoPerdidaLocalizada: 'estimado' })
    const editado: Proyecto = {
      ...base,
      configuracionHidraulica: { ...base.configuracionHidraulica, metodoPerdidaLocalizada: 'detallado' },
    }
    expect(resolverModoDeTrabajo(editado)).toBe('profesional')
  })

  it('Caso C: Profesional con exactamente la combinación de Rápido sigue Profesional', () => {
    const base = proyecto({ modoTrabajo: 'profesional', granularidadHidraulica: 'profesional', metodoPerdidaLocalizada: 'detallado', metodoPerdidaDistribuida: 'darcyWeisbach' })
    const vueltaAHES: Proyecto = {
      ...base,
      configuracionHidraulica: {
        ...base.configuracionHidraulica,
        metodoPerdidaDistribuida: 'hazenWilliams',
        metodoPerdidaLocalizada: 'estimado',
        granularidadHidraulica: 'simplificada',
      },
    }
    expect(resolverModoDeTrabajo(vueltaAHES)).toBe('profesional')
  })
})
