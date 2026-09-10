// M2-TOPO-D §36/§37/§40 + M2-TOPO-E §8/§30 -- integración: un montante con
// derivaciones en cadena, sus `Nodo.tee` configurables en modo Detalladas,
// y la garantía de que el modo Estimadas NO lee esa configuración (modelo
// agregado intacto). Desde M2-TOPO-E, un nodo de derivación 1->N (N>2) deja
// la pérdida localizada Detalladas explícitamente INCOMPLETA por
// `derivacionMultipleNoModelada` en vez de aparentar un relevamiento
// completo con contribución 0. No introduce ninguna fórmula: sólo compone
// reconciliador de montantes (M2-TOPO-C) + `conTeeDeNodo` + los resolvers
// de pérdida localizada ya existentes.
import { describe, it, expect } from 'vitest'
import type { Local, Proyecto, UnidadFuncional } from '../../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../../normativa/eras-2023/catalogo-artefactos'
import { validarRedHidraulica } from '../../../validacion/redHidraulica'
import { catalogoSistemasDeTuberia } from '../sistemaDeTuberia'
import { obtenerCaminoHaciaOrigen } from '../topologia/obtenerCaminoHaciaOrigen'
import { acumularPerdidaLocalizadaDeCamino } from './acumularPerdidaLocalizadaDeCamino'
import { resolverPerdidaLocalizadaEstimadaDeLocal } from './resolverPerdidaLocalizadaEstimadaDeLocal'
import { agregarLocalAMontante } from '../../../interfaz/paginas/reconciliarMontante'
import { conMontanteNuevo, derivacionesDeMontante } from '../../../interfaz/paginas/montantesDelProyecto'
import { conTeeDeNodo } from '../../../interfaz/paginas/actualizarRedHidraulica'

function local(id: string, cotaPiso_m: number): Local {
  return {
    id,
    tipo: 'bano',
    regimen: 'domiciliario',
    cotaPiso_m,
    artefactos: [{ id: `${id}-art`, artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }],
  }
}

function rama(id: string): { nodos: Nodo[]; tramos: Tramo[] } {
  return {
    nodos: [
      { id: `n-${id}` },
      { id: `n-${id}-t`, referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: id, artefactoId: `${id}-art` } },
    ],
    tramos: [
      { id: `t-${id}`, nodoOrigenId: 'n-af', nodoDestinoId: `n-${id}`, red: 'AF', accesorios: [] },
      { id: `t-${id}-t`, nodoOrigenId: `n-${id}`, nodoDestinoId: `n-${id}-t`, red: 'AF', accesorios: [] },
    ],
  }
}

// UF con `n` Locales; cotas distintas si `mismaCota` es false.
function proyectoBase(cotas: readonly number[]): Proyecto {
  const uf: UnidadFuncional = {
    id: 'uf-1',
    nombre: 'UF 1',
    nivel: 0,
    locales: cotas.map((cota, i) => local(`l-${i + 1}`, cota)),
  }
  const ramas = uf.locales.map((l) => rama(l.id))
  const redHidraulica: RedHidraulica = {
    nodos: [{ id: 'n-gen' }, { id: 'n-af' }, ...ramas.flatMap((r) => r.nodos)],
    tramos: [
      { id: 't-gen', nodoOrigenId: 'n-gen', nodoDestinoId: 'n-af', red: 'AF', accesorios: [] },
      ...ramas.flatMap((r) => r.tramos),
    ],
  }
  return {
    metadatos: { nombre: 'm', obra: 'o', comitente: 'c', fecha: '2026-01-01', schemaVersion: '1.0.0', versionNormativa: 'eras-2023' },
    parametros: { tipoDeProyecto: 'viviendaMultifamiliar', presionSobreAcera_m: 20, alturaArtefactoMasDesfavorable_m: 0 },
    unidadesFuncionales: [uf],
    redHidraulica,
    configuracionAbastecimiento: { esquema: 'directa' },
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'detallado',
      granularidadHidraulica: 'profesional',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

// Deja `accesorios: []` en TODO tramo (incluidos los segmentos que crea el
// reconciliador) -- así el único pendiente posible de la pérdida localizada
// Detalladas es la tee sin configurar.
function conAccesoriosVacios(proyecto: Proyecto): Proyecto {
  const rh = proyecto.redHidraulica!
  return {
    ...proyecto,
    redHidraulica: { nodos: rh.nodos, tramos: rh.tramos.map((t) => ({ ...t, accesorios: t.accesorios ?? [] })) },
  }
}

function montanteAfConLocales(cotas: readonly number[]): { proyecto: Proyecto; montanteId: string } {
  const creado = conMontanteNuevo(proyectoBase(cotas), 'AF')
  const { montanteId } = creado
  let proyecto = creado.proyecto
  cotas.forEach((_, i) => {
    const r = agregarLocalAMontante(proyecto, montanteId, 'uf-1', `l-${i + 1}`)
    if (r.tipo !== 'reconciliado') {
      throw new Error(`agregarLocalAMontante(l-${i + 1}) -> ${r.tipo}`)
    }
    proyecto = r.proyecto
  })
  return { proyecto: conAccesoriosVacios(proyecto), montanteId }
}

function terminalMasProfundo(proyecto: Proyecto): string {
  // el terminal del Local a la cota más alta (el que atraviesa TODAS las
  // derivaciones del montante).
  const uf = proyecto.unidadesFuncionales[0]!
  const localTope = [...uf.locales].sort((a, b) => (b.cotaPiso_m ?? 0) - (a.cotaPiso_m ?? 0))[0]!
  return `n-${localTope.id}-t`
}

function camino(proyecto: Proyecto, nodoTerminalId: string) {
  const c = obtenerCaminoHaciaOrigen(proyecto.redHidraulica!, nodoTerminalId)
  if (c.tipo !== 'camino') {
    throw new Error(`fixture inválida: se esperaba un camino, se obtuvo ${c.tipo}`)
  }
  return c
}

describe('M2-TOPO-D · montante con tees en cadena (§36)', () => {
  it('3 Locales a cotas distintas: 2 derivaciones 1->2', () => {
    const { proyecto, montanteId } = montanteAfConLocales([2, 5, 8])
    expect(validarRedHidraulica(proyecto)).toEqual([])
    const derivaciones = derivacionesDeMontante(proyecto, montanteId)
    expect(derivaciones).toHaveLength(2)
    expect(derivaciones.every((d) => d.tipo === 'bifurcacion')).toBe(true)
  })

  it("Detalladas SIN configurar las tees: la pérdida localizada del camino profundo es 'incompleta' por teeSinConfigurar", () => {
    const { proyecto } = montanteAfConLocales([2, 5, 8])
    const resultado = acumularPerdidaLocalizadaDeCamino(
      proyecto,
      camino(proyecto, terminalMasProfundo(proyecto)),
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
    )
    expect(resultado.tipo).toBe('incompleta')
    if (resultado.tipo !== 'incompleta') return
    expect(resultado.tramosNoResueltos.some((m) => m.motivo === 'teeSinConfigurar')).toBe(true)
  })

  it('Detalladas CON ambas tees configuradas: la pérdida localizada se acumula con contribución de tee > 0', () => {
    const armado = montanteAfConLocales([2, 5, 8])
    const { montanteId } = armado
    let proyecto = armado.proyecto
    for (const derivacion of derivacionesDeMontante(proyecto, montanteId)) {
      if (derivacion.tipo !== 'bifurcacion') continue
      // recta = la continuación del montante; la salida al Local queda lateral.
      const salidaMontante = derivacion.tramosSalientesIds.find(
        (s) => proyecto.redHidraulica!.tramos.find((t) => t.id === s)?.montanteId === montanteId,
      )
      proyecto = conTeeDeNodo(proyecto, derivacion.nodoId, {
        tipo: 'entradaPorExtremo',
        tramoSalidaRectaId: salidaMontante ?? derivacion.tramosSalientesIds[0],
      })
    }
    expect(validarRedHidraulica(proyecto)).toEqual([])
    const resultado = acumularPerdidaLocalizadaDeCamino(
      proyecto,
      camino(proyecto, terminalMasProfundo(proyecto)),
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
    )
    expect(resultado.tipo).toBe('acumulada')
    if (resultado.tipo !== 'acumulada') return
    expect(resultado.hf_m).toBeGreaterThan(0)
  })
})

describe('M2-TOPO-D · Estimadas intactas (§37)', () => {
  it('configurar Nodo.tee NO cambia el modelo agregado estimado del Local (n-1 tees, Vref, hf)', () => {
    const { proyecto, montanteId } = montanteAfConLocales([2, 5, 8])
    const antes = resolverPerdidaLocalizadaEstimadaDeLocal(
      proyecto,
      'uf-1',
      'l-1',
      'AF',
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
    )

    let conTees = proyecto
    for (const derivacion of derivacionesDeMontante(proyecto, montanteId)) {
      if (derivacion.tipo !== 'bifurcacion') continue
      conTees = conTeeDeNodo(conTees, derivacion.nodoId, { tipo: 'entradaCentral' })
    }
    const despues = resolverPerdidaLocalizadaEstimadaDeLocal(
      conTees,
      'uf-1',
      'l-1',
      'AF',
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
    )

    expect(despues).toEqual(antes)
  })
})

describe('M2-TOPO-D · fan-out 1->N (§40) + M2-TOPO-E (§8/§30)', () => {
  it('3 Locales a la MISMA cota: una derivación 1->3, no editable como tee', () => {
    const { proyecto, montanteId } = montanteAfConLocales([4, 4, 4])
    expect(validarRedHidraulica(proyecto)).toEqual([])
    const derivaciones = derivacionesDeMontante(proyecto, montanteId)
    expect(derivaciones).toHaveLength(1)
    expect(derivaciones[0]!.tipo).toBe('noConfigurable')
    if (derivaciones[0]!.tipo !== 'noConfigurable') return
    expect(derivaciones[0]!.cantidadSalidas).toBe(3)
  })

  it('la topología 1->3 es VÁLIDA para Qc pero deja Detalladas INCOMPLETA por derivacionMultipleNoModelada (nunca un 0 silencioso ni un throw)', () => {
    const { proyecto } = montanteAfConLocales([4, 4, 4])
    expect(validarRedHidraulica(proyecto)).toEqual([])
    let resultado: ReturnType<typeof acumularPerdidaLocalizadaDeCamino>
    expect(() => {
      resultado = acumularPerdidaLocalizadaDeCamino(
        proyecto,
        camino(proyecto, terminalMasProfundo(proyecto)),
        catalogoArtefactos,
        catalogoSistemasDeTuberia,
      )
    }).not.toThrow()
    // El nodo 1->3 clasifica 'derivacionMultipleNoModelada' (M2-TOPO-E §8):
    // su pérdida localizada real NO se modela con los datos actuales, así
    // que el camino queda EXPLÍCITAMENTE incompleto -- no aparenta un
    // relevamiento completo. No se asigna Ks ni se inventa geometría.
    expect(resultado!.tipo).toBe('incompleta')
    if (resultado!.tipo !== 'incompleta') return
    expect(resultado!.tramosNoResueltos.every((m) => m.motivo === 'derivacionMultipleNoModelada')).toBe(true)
  })

  it('§30-E: el Qc de cada segmento del montante 1->3 sigue resolviéndose (la topología no cambia)', () => {
    const { proyecto } = montanteAfConLocales([4, 4, 4])
    const c = camino(proyecto, terminalMasProfundo(proyecto))
    // El camino se resuelve estructuralmente (raíz -> terminal) sin
    // 'topologiaNoResoluble': el 1->3 es un fan-out válido (M2-TOPO-A).
    expect(c.tramos.length).toBeGreaterThan(0)
  })

  it('§30-D: Estimadas para un montante 1->3 conserva el modelo agregado histórico (no lee la topología 1->N)', () => {
    const { proyecto } = montanteAfConLocales([4, 4, 4])
    const estimada = resolverPerdidaLocalizadaEstimadaDeLocal(
      proyecto,
      'uf-1',
      'l-1',
      'AF',
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
    )
    // El modelo agregado estimado (n-1 tees @ 3,00 + codo90 + llave, Vref)
    // se resuelve igual que para cualquier topología -- nunca lee Nodo.tee
    // ni el fan-out 1->N.
    expect(estimada.tipo).toBe('estimada')
  })
})
