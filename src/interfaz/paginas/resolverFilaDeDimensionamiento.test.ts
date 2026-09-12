// D-δ.51 (§25/§30, §46): view-model de fila de tabla de dimensionamiento.
// "Pérdida" = hf distribuida del Tramo + hf localizada estimada del
// Local+Red, compuesta de resultados del motor, nunca recalculada.
import { describe, it, expect } from 'vitest'
import type { MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { resolverFilaDeDimensionamiento } from './resolverFilaDeDimensionamiento'

function metadatos(): MetadatosProyecto {
  return { nombre: 'P', obra: 'O', comitente: 'C', fecha: '2026-09-07', schemaVersion: '1.0.0', versionNormativa: 'eras-2023' }
}
function parametros(): ParametrosProyecto {
  return { tipoDeProyecto: 'viviendaIndividual', presionSobreAcera_m: 0, alturaArtefactoMasDesfavorable_m: 0 }
}

function proyecto(longRepresentativo: number | undefined): Proyecto {
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
          {
            id: 'l-bano',
            tipo: 'bano',
            regimen: 'domiciliario',
            artefactos: [
              { id: 'a1', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' },
              { id: 'a2', artefactoId: 'receptaculoDucha', cantidad: 1, origen: 'normativo' },
            ],
          },
        ],
      },
    ],
  }
  const r = (a: string) => ({ tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'l-bano', artefactoId: a }) as const
  const nodos: Nodo[] = [
    { id: 'n-general' },
    { id: 'n0' },
    { id: 'n-bano' },
    { id: 'n-lav', referencia: r('a1') },
    { id: 'n-duc', referencia: r('a2') },
  ]
  const repTramo: Tramo =
    longRepresentativo === undefined
      ? { id: 't-bano', nodoOrigenId: 'n0', nodoDestinoId: 'n-bano', red: 'AF' }
      : { id: 't-bano', nodoOrigenId: 'n0', nodoDestinoId: 'n-bano', red: 'AF', longitud_m: longRepresentativo }
  const tramos: Tramo[] = [
    { id: 't-general', nodoOrigenId: 'n-general', nodoDestinoId: 'n0', red: 'AF', longitud_m: 10 },
    repTramo,
    { id: 't-lav', nodoOrigenId: 'n-bano', nodoDestinoId: 'n-lav', red: 'AF' },
    { id: 't-duc', nodoOrigenId: 'n-bano', nodoDestinoId: 'n-duc', red: 'AF' },
  ]
  const redHidraulica: RedHidraulica = { nodos, tramos }
  return {
    metadatos: metadatos(),
    parametros: parametros(),
    unidadesFuncionales: [uf],
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

describe('resolverFilaDeDimensionamiento (D-δ.51)', () => {
  it('HYD-EST: Local+Red conserva la distribuida y remite a localizada por recorrido sin inventar un total único', () => {
    const fila = resolverFilaDeDimensionamiento(proyecto(5), 't-bano', catalogoArtefactos, {
      unidadFuncionalId: 'uf-1',
      localId: 'l-bano',
      red: 'AF',
    })

    expect(fila.hfDistribuida_mca).toBeGreaterThan(0)
    expect(fila.hfLocalizadaEstimada_mca).toBeUndefined()
    expect(fila.perdidaTotal_mca).toBeUndefined()
    expect(fila.perdidaTotalTexto).toContain('distrib. · localizada por recorrido')
    expect(fila.nPuntos).toBe(2)
    expect(fila.artefactos).toContain('avatorio')
    expect(fila.estado).toBe('ok')
    expect(fila.dnTexto).not.toBe('—')
  })

  it('sin longitud del Tramo representativo: estado incompleto, perdidaTotal undefined', () => {
    const fila = resolverFilaDeDimensionamiento(proyecto(undefined), 't-bano', catalogoArtefactos, {
      unidadFuncionalId: 'uf-1',
      localId: 'l-bano',
      red: 'AF',
    })

    expect(fila.hfDistribuida_mca).toBeUndefined()
    expect(fila.perdidaTotal_mca).toBeUndefined()
    expect(fila.perdidaTotalTexto).toBe('— m.c.a. distrib. · localizada por recorrido')
    expect(fila.estado).toBe('incompleto')
  })

  it('Distribución general (sin contexto de Local): sin hf localizada estimada, sin "N puntos"', () => {
    const fila = resolverFilaDeDimensionamiento(proyecto(5), 't-general', catalogoArtefactos)
    expect(fila.hfLocalizadaEstimada_mca).toBeUndefined()
    expect(fila.nPuntos).toBe(0)
    expect(fila.perdidaTotal_mca).toBe(fila.hfDistribuida_mca)
    expect(fila.longitud_m).toBe(10)
  })
})
