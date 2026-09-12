import { describe, it, expect } from 'vitest'
import type {
  Artefacto,
  Local,
  MetadatosProyecto,
  Montante,
  ParametrosProyecto,
  Proyecto,
  UnidadFuncional,
} from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { validarRedHidraulica } from '../../validacion/redHidraulica'
import { obtenerArtefactosAguasAbajo } from '../../motor/tuberias/topologia/obtenerArtefactosAguasAbajo'
import {
  agregarLocalAMontante,
  borrarMontante,
  quitarLocalDeMontante,
  type ResultadoReconciliacionDeMontante,
} from './reconciliarMontante'

// ------------------------------------------------------------------
// Fixture: una UF con Locales AF, cada uno con feed dedicado colgando de
// la raíz compartida n-0. Las cotas se fijan por override de piso del
// Local (la UF no declara cota, así `local-e` queda "sin cota").
// ------------------------------------------------------------------

function metadatos(): MetadatosProyecto {
  return {
    nombre: 'M2-TOPO-C motor de reconciliación',
    obra: 'Obra',
    comitente: 'Comitente',
    fecha: '2026-01-01',
    schemaVersion: '1.0.0',
    versionNormativa: 'eras-2023',
  }
}

function parametros(extra?: Partial<ParametrosProyecto>): ParametrosProyecto {
  return {
    tipoDeProyecto: 'viviendaMultifamiliar',
    presionSobreAcera_m: 20,
    alturaArtefactoMasDesfavorable_m: 0,
    ...extra,
  }
}

function artefacto(id: string): Artefacto {
  return { id, artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }
}

function local(id: string, cotaPiso_m: number | undefined): Local {
  return {
    id,
    tipo: 'bano',
    regimen: 'domiciliario',
    ...(cotaPiso_m !== undefined ? { cotaPiso_m } : {}),
    artefactos: [artefacto(`${id}-art`)],
  }
}

// Cada Local: header `n-af-<x>` colgando de n-0 (`t-af-<x>`) + un terminal
// (`t-af-<x>-1`). Con >=1 terminal y un header dedicado, el feed
// reenganchable es siempre `t-af-<x>`.
function ramaLocal(x: string, localId: string): { nodos: Nodo[]; tramos: Tramo[] } {
  return {
    nodos: [
      { id: `n-af-${x}` },
      {
        id: `n-af-${x}-1`,
        referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId, artefactoId: `${localId}-art` },
      },
    ],
    tramos: [
      { id: `t-af-${x}`, nodoOrigenId: 'n-0', nodoDestinoId: `n-af-${x}`, red: 'AF' },
      { id: `t-af-${x}-1`, nodoOrigenId: `n-af-${x}`, nodoDestinoId: `n-af-${x}-1`, red: 'AF' },
    ],
  }
}

type OpcionesFixture = {
  readonly montantes?: readonly Montante[]
  readonly parametros?: Partial<ParametrosProyecto>
  readonly esquema?: 'directa' | 'tanqueElevado' | 'cisternaBombeoElevado'
  readonly granularidad?: 'simplificada' | 'profesional'
  readonly conLocalSinConectividad?: boolean
}

function proyectoBase(opciones: OpcionesFixture = {}): Proyecto {
  const locales: Local[] = [
    local('local-a', 6),
    local('local-b', 12),
    local('local-c', 18),
    local('local-d', 6),
    local('local-e', undefined),
  ]
  if (opciones.conLocalSinConectividad === true) {
    locales.push(local('local-sin-red', 9))
  }

  const uf: UnidadFuncional = { id: 'uf-1', nombre: 'UF 1', niveles: [{ id: 'uf-1-nivel-1', nombre: 'Nivel 1', locales }] }

  const ramas = [
    ramaLocal('a', 'local-a'),
    ramaLocal('b', 'local-b'),
    ramaLocal('c', 'local-c'),
    ramaLocal('d', 'local-d'),
    ramaLocal('e', 'local-e'),
  ]
  const redHidraulica: RedHidraulica = {
    nodos: [{ id: 'n-general' }, { id: 'n-0' }, ...ramas.flatMap((r) => r.nodos)],
    tramos: [
      { id: 't-general', nodoOrigenId: 'n-general', nodoDestinoId: 'n-0', red: 'AF' },
      ...ramas.flatMap((r) => r.tramos),
    ],
  }

  return {
    metadatos: metadatos(),
    parametros: parametros(opciones.parametros),
    unidadesFuncionales: [uf],
    redHidraulica,
    ...(opciones.montantes !== undefined ? { montantes: opciones.montantes } : {}),
    ...(opciones.esquema !== undefined
      ? { configuracionAbastecimiento: { esquema: opciones.esquema } }
      : {}),
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'detallado',
      granularidadHidraulica: opciones.granularidad ?? 'profesional',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

const MONTANTE_AF: Montante = { id: 'm-af-1', red: 'AF' }

function esperarReconciliado(
  resultado: ResultadoReconciliacionDeMontante,
): Extract<ResultadoReconciliacionDeMontante, { tipo: 'reconciliado' }> {
  if (resultado.tipo !== 'reconciliado') {
    throw new Error(`esperaba 'reconciliado', llegó '${resultado.tipo}'`)
  }
  return resultado
}

function segmentosDe(proyecto: Proyecto, montanteId: string): readonly Tramo[] {
  return (proyecto.redHidraulica?.tramos ?? []).filter((t) => t.montanteId === montanteId)
}

// Reconstruye la cadena origen -> punta de segmentos del montante.
function cadenaOrdenada(proyecto: Proyecto, montanteId: string): readonly Tramo[] {
  const segmentos = segmentosDe(proyecto, montanteId)
  const destinos = new Set(segmentos.map((t) => t.nodoDestinoId))
  const porOrigen = new Map(segmentos.map((t) => [t.nodoOrigenId, t]))
  let actual = segmentos.find((t) => !destinos.has(t.nodoOrigenId))
  const orden: Tramo[] = []
  while (actual !== undefined) {
    orden.push(actual)
    actual = porOrigen.get(actual.nodoDestinoId)
  }
  return orden
}

function localesServidosClaves(r: Extract<ResultadoReconciliacionDeMontante, { tipo: 'reconciliado' }>): string[] {
  return r.localesServidos.map((s) => `${s.unidadFuncionalId}/${s.localId}`).sort()
}

// ------------------------------------------------------------------

describe('agregarLocalAMontante — construcción incremental', () => {
  it('montante vacío + primer Local: crea un segmento origen -> nodo de derivación y reengancha el feed', () => {
    const proyecto = proyectoBase({ montantes: [MONTANTE_AF] })
    const r = esperarReconciliado(agregarLocalAMontante(proyecto, 'm-af-1', 'uf-1', 'local-a'))

    const segmentos = segmentosDe(r.proyecto, 'm-af-1')
    expect(segmentos).toHaveLength(1)
    expect(segmentos[0]!.nodoOrigenId).toBe('n-0')
    expect(segmentos[0]!.red).toBe('AF')
    // Sin cota canónica de origen: la longitud no se precarga, nunca 0.
    expect(segmentos[0]!.longitud_m).toBeUndefined()
    expect(segmentos[0]!.longitudEsSugerida).toBeUndefined()

    // El feed del Local ahora cuelga del nodo de derivación, no de n-0.
    const feedA = r.proyecto.redHidraulica!.tramos.find((t) => t.id === 't-af-a')!
    expect(feedA.nodoOrigenId).toBe(segmentos[0]!.nodoDestinoId)

    expect(localesServidosClaves(r)).toEqual(['uf-1/local-a'])
    expect(validarRedHidraulica(r.proyecto)).toEqual([])
  })

  it('segundo Local más lejos del origen: añade un segmento en la punta con longitud sugerida |Δz|', () => {
    let proyecto = proyectoBase({ montantes: [MONTANTE_AF] })
    proyecto = esperarReconciliado(agregarLocalAMontante(proyecto, 'm-af-1', 'uf-1', 'local-a')).proyecto
    const r = esperarReconciliado(agregarLocalAMontante(proyecto, 'm-af-1', 'uf-1', 'local-c'))

    const cadena = cadenaOrdenada(r.proyecto, 'm-af-1')
    expect(cadena).toHaveLength(2)
    // Segmento nuevo entre la cota de local-a (6) y la de local-c (18).
    expect(cadena[1]!.longitud_m).toBe(12)
    expect(cadena[1]!.longitudEsSugerida).toBe(true)
    expect(localesServidosClaves(r)).toEqual(['uf-1/local-a', 'uf-1/local-c'])
    expect(validarRedHidraulica(r.proyecto)).toEqual([])
  })

  it('CASO 1 (§17): Local en cota intermedia sobre un segmento íntegramente sugerido -> split automático, IDs preservados', () => {
    let proyecto = proyectoBase({ montantes: [MONTANTE_AF] })
    proyecto = esperarReconciliado(agregarLocalAMontante(proyecto, 'm-af-1', 'uf-1', 'local-a')).proyecto
    proyecto = esperarReconciliado(agregarLocalAMontante(proyecto, 'm-af-1', 'uf-1', 'local-c')).proyecto

    const cadenaAntes = cadenaOrdenada(proyecto, 'm-af-1')
    const idSegmentoAC = cadenaAntes[1]!.id
    const nodosDerivacionAntes = cadenaAntes.map((t) => t.nodoDestinoId)

    const r = esperarReconciliado(agregarLocalAMontante(proyecto, 'm-af-1', 'uf-1', 'local-b'))

    const cadena = cadenaOrdenada(r.proyecto, 'm-af-1')
    expect(cadena).toHaveLength(3)
    // Ambas mitades reprecargadas por las nuevas diferencias de cota
    // (6->12 y 12->18), ambas sugeridas.
    expect(cadena.map((t) => t.longitud_m)).toEqual([undefined, 6, 6])
    expect(cadena[1]!.longitudEsSugerida).toBe(true)
    expect(cadena[2]!.longitudEsSugerida).toBe(true)
    // El id del segmento partido sobrevive como la mitad aguas arriba.
    expect(cadena[1]!.id).toBe(idSegmentoAC)
    // Los nodos de derivación de local-a y local-c se conservan.
    expect(cadena[0]!.nodoDestinoId).toBe(nodosDerivacionAntes[0])
    expect(cadena[2]!.nodoDestinoId).toBe(nodosDerivacionAntes[1])

    const feedB = r.proyecto.redHidraulica!.tramos.find((t) => t.id === 't-af-b')!
    expect(feedB.nodoOrigenId).toBe(cadena[1]!.nodoDestinoId)

    expect(localesServidosClaves(r)).toEqual(['uf-1/local-a', 'uf-1/local-b', 'uf-1/local-c'])
    expect(validarRedHidraulica(r.proyecto)).toEqual([])
  })

  it('CASO 3 (§17): Local en una cota ya existente -> reusa el nodo de derivación, sin split ni tramo 0', () => {
    let proyecto = proyectoBase({ montantes: [MONTANTE_AF] })
    proyecto = esperarReconciliado(agregarLocalAMontante(proyecto, 'm-af-1', 'uf-1', 'local-a')).proyecto
    proyecto = esperarReconciliado(agregarLocalAMontante(proyecto, 'm-af-1', 'uf-1', 'local-c')).proyecto

    const segmentosAntes = segmentosDe(proyecto, 'm-af-1').length
    // local-d comparte cota (6) con local-a.
    const r = esperarReconciliado(agregarLocalAMontante(proyecto, 'm-af-1', 'uf-1', 'local-d'))

    expect(segmentosDe(r.proyecto, 'm-af-1')).toHaveLength(segmentosAntes)
    const cadena = cadenaOrdenada(r.proyecto, 'm-af-1')
    const feedA = r.proyecto.redHidraulica!.tramos.find((t) => t.id === 't-af-a')!
    const feedD = r.proyecto.redHidraulica!.tramos.find((t) => t.id === 't-af-d')!
    expect(feedD.nodoOrigenId).toBe(feedA.nodoOrigenId)
    expect(feedD.nodoOrigenId).toBe(cadena[0]!.nodoDestinoId)
    expect(localesServidosClaves(r)).toEqual(['uf-1/local-a', 'uf-1/local-c', 'uf-1/local-d'])
    expect(validarRedHidraulica(r.proyecto)).toEqual([])
  })

  it('reusar un nodo existente NO se bloquea aunque otro segmento del montante tenga dato manual', () => {
    let proyecto = proyectoBase({ montantes: [MONTANTE_AF] })
    proyecto = esperarReconciliado(agregarLocalAMontante(proyecto, 'm-af-1', 'uf-1', 'local-a')).proyecto
    proyecto = esperarReconciliado(agregarLocalAMontante(proyecto, 'm-af-1', 'uf-1', 'local-c')).proyecto
    // Personalizar el segmento A->C.
    proyecto = {
      ...proyecto,
      redHidraulica: {
        ...proyecto.redHidraulica!,
        tramos: proyecto.redHidraulica!.tramos.map((t) =>
          t.montanteId === 'm-af-1' && t.longitudEsSugerida === true
            ? { id: t.id, nodoOrigenId: t.nodoOrigenId, nodoDestinoId: t.nodoDestinoId, red: t.red, montanteId: t.montanteId!, longitud_m: 9 }
            : t,
        ),
      },
    }

    const r = esperarReconciliado(agregarLocalAMontante(proyecto, 'm-af-1', 'uf-1', 'local-d'))
    expect(localesServidosClaves(r)).toContain('uf-1/local-d')
    // El segmento manual quedó intacto.
    const manual = segmentosDe(r.proyecto, 'm-af-1').find((t) => t.longitud_m === 9)!
    expect(manual.longitudEsSugerida).toBeUndefined()
  })

  it('Local sin cota resoluble: se engancha en la punta con segmento sin longitud (nunca 0) y se reporta en localesSinCota', () => {
    let proyecto = proyectoBase({ montantes: [MONTANTE_AF] })
    proyecto = esperarReconciliado(agregarLocalAMontante(proyecto, 'm-af-1', 'uf-1', 'local-a')).proyecto
    const r = esperarReconciliado(agregarLocalAMontante(proyecto, 'm-af-1', 'uf-1', 'local-e'))

    expect(r.localesSinCota.map((s) => s.localId)).toEqual(['local-e'])
    const cadena = cadenaOrdenada(r.proyecto, 'm-af-1')
    expect(cadena[cadena.length - 1]!.longitud_m).toBeUndefined()
    expect(cadena[cadena.length - 1]!.longitudEsSugerida).toBeUndefined()
    expect(localesServidosClaves(r)).toContain('uf-1/local-e')
    expect(validarRedHidraulica(r.proyecto)).toEqual([])
  })

  it('es idempotente: agregar un Local ya servido no muta el proyecto', () => {
    let proyecto = proyectoBase({ montantes: [MONTANTE_AF] })
    proyecto = esperarReconciliado(agregarLocalAMontante(proyecto, 'm-af-1', 'uf-1', 'local-a')).proyecto
    const r = agregarLocalAMontante(proyecto, 'm-af-1', 'uf-1', 'local-a')
    expect(r.tipo).toBe('reconciliado')
    if (r.tipo === 'reconciliado') {
      expect(r.proyecto).toBe(proyecto)
    }
  })
})

describe('agregarLocalAMontante — RD-1: bloqueo de split sobre dato físico manual', () => {
  function proyectoConSegmentoACManual(mutacion: (t: Tramo) => Tramo): Proyecto {
    let proyecto = proyectoBase({ montantes: [MONTANTE_AF] })
    proyecto = esperarReconciliado(agregarLocalAMontante(proyecto, 'm-af-1', 'uf-1', 'local-a')).proyecto
    proyecto = esperarReconciliado(agregarLocalAMontante(proyecto, 'm-af-1', 'uf-1', 'local-c')).proyecto
    return {
      ...proyecto,
      redHidraulica: {
        ...proyecto.redHidraulica!,
        tramos: proyecto.redHidraulica!.tramos.map((t) =>
          t.montanteId === 'm-af-1' && t.longitudEsSugerida === true ? mutacion(t) : t,
        ),
      },
    }
  }

  it('CASO 2 (§17): longitud personalizada bloquea, sin mutar nada', () => {
    const proyecto = proyectoConSegmentoACManual((t) => ({
      id: t.id,
      nodoOrigenId: t.nodoOrigenId,
      nodoDestinoId: t.nodoDestinoId,
      red: t.red,
      montanteId: t.montanteId!,
      longitud_m: 10,
    }))
    const r = agregarLocalAMontante(proyecto, 'm-af-1', 'uf-1', 'local-b')
    expect(r.tipo).toBe('bloqueadoPorDatoFisicoManual')
    if (r.tipo === 'bloqueadoPorDatoFisicoManual') {
      expect(r.copyHumano).toMatch(/datos personalizados/i)
      expect(r.segmentosBloqueantes).toHaveLength(1)
      expect(r.segmentosBloqueantes[0]!.motivos).toEqual(['longitudPersonalizada'])
    }
  })

  it('accesorios no vacíos bloquean; accesorios: [] NO bloquea', () => {
    const conAccesorios = proyectoConSegmentoACManual((t) => ({ ...t, accesorios: [{ tipo: 'codo90', cantidad: 2 }] }))
    const rBloqueado = agregarLocalAMontante(conAccesorios, 'm-af-1', 'uf-1', 'local-b')
    expect(rBloqueado.tipo).toBe('bloqueadoPorDatoFisicoManual')
    if (rBloqueado.tipo === 'bloqueadoPorDatoFisicoManual') {
      expect(rBloqueado.segmentosBloqueantes[0]!.motivos).toEqual(['accesorios'])
    }

    const conListaVacia = proyectoConSegmentoACManual((t) => ({ ...t, accesorios: [] }))
    const rOk = agregarLocalAMontante(conListaVacia, 'm-af-1', 'uf-1', 'local-b')
    expect(rOk.tipo).toBe('reconciliado')
  })

  it('dnComercialAdoptado bloquea', () => {
    const proyecto = proyectoConSegmentoACManual((t) => ({ ...t, dnComercialAdoptado: '32 mm' }))
    const r = agregarLocalAMontante(proyecto, 'm-af-1', 'uf-1', 'local-b')
    expect(r.tipo).toBe('bloqueadoPorDatoFisicoManual')
    if (r.tipo === 'bloqueadoPorDatoFisicoManual') {
      expect(r.segmentosBloqueantes[0]!.motivos).toEqual(['dnManual'])
    }
  })

  it('el bloqueo deja el proyecto byte-equivalente al estado anterior', () => {
    const proyecto = proyectoConSegmentoACManual((t) => ({ ...t, dnComercialAdoptado: '32 mm' }))
    const copiaProfunda = JSON.parse(JSON.stringify(proyecto))
    agregarLocalAMontante(proyecto, 'm-af-1', 'uf-1', 'local-b')
    expect(JSON.parse(JSON.stringify(proyecto))).toEqual(copiaProfunda)
  })
})

describe('agregarLocalAMontante — sentido físico por cota de origen', () => {
  it('origen alto (tanque elevado): la cadena queda ordenada descendente (más alto primero)', () => {
    // desnivelConexion 30 -> pelo mínimo 29,5 (modo rápido), por encima de
    // todas las cotas servidas (6/12/18).
    let proyecto = proyectoBase({
      montantes: [MONTANTE_AF],
      esquema: 'tanqueElevado',
      granularidad: 'simplificada',
      parametros: { desnivelConexion_m: 30 },
    })
    proyecto = esperarReconciliado(agregarLocalAMontante(proyecto, 'm-af-1', 'uf-1', 'local-a')).proyecto // 6
    proyecto = esperarReconciliado(agregarLocalAMontante(proyecto, 'm-af-1', 'uf-1', 'local-c')).proyecto // 18
    const r = esperarReconciliado(agregarLocalAMontante(proyecto, 'm-af-1', 'uf-1', 'local-b')) // 12, intermedia

    const cadena = cadenaOrdenada(r.proyecto, 'm-af-1')
    // Cotas de los nodos de derivación en orden origen->punta: 18, 12, 6.
    const cotasEnOrden = cadena.map((seg) => {
      const feed = r.proyecto.redHidraulica!.tramos.find(
        (t) => t.nodoOrigenId === seg.nodoDestinoId && t.montanteId === undefined,
      )!
      const ref = obtenerArtefactosAguasAbajo(r.proyecto, feed.id)[0]!
      const l = r.proyecto.unidadesFuncionales[0]!.niveles[0]!.locales.find((x) => x.id === ref.localId)!
      return l.cotaPiso_m
    })
    expect(cotasEnOrden).toEqual([18, 12, 6])
    // Primer segmento: |29,5 - 18| = 11,5.
    expect(cadena[0]!.longitud_m).toBeCloseTo(11.5)
    expect(validarRedHidraulica(r.proyecto)).toEqual([])
  })

  it('origen estrictamente entre las cotas servidas: origenIntermedioNoSoportado, sin mutar', () => {
    // desnivelConexion 13 -> pelo mínimo 12,5, entre 6 y 18.
    let proyecto = proyectoBase({
      montantes: [MONTANTE_AF],
      esquema: 'tanqueElevado',
      granularidad: 'simplificada',
      parametros: { desnivelConexion_m: 13 },
    })
    proyecto = esperarReconciliado(agregarLocalAMontante(proyecto, 'm-af-1', 'uf-1', 'local-a')).proyecto // 6
    const copiaProfunda = JSON.parse(JSON.stringify(proyecto))
    const r = agregarLocalAMontante(proyecto, 'm-af-1', 'uf-1', 'local-c') // 18 -> origen 12,5 queda en el medio
    expect(r.tipo).toBe('origenIntermedioNoSoportado')
    expect(JSON.parse(JSON.stringify(proyecto))).toEqual(copiaProfunda)
  })
})

describe('agregarLocalAMontante — errores de uso', () => {
  it('montante inexistente', () => {
    const r = agregarLocalAMontante(proyectoBase({ montantes: [MONTANTE_AF] }), 'no-existe', 'uf-1', 'local-a')
    expect(r.tipo).toBe('montanteInexistente')
  })

  it('Local inexistente', () => {
    const r = agregarLocalAMontante(proyectoBase({ montantes: [MONTANTE_AF] }), 'm-af-1', 'uf-1', 'no-existe')
    expect(r.tipo).toBe('localInexistente')
  })

  it('Local sin conectividad en la red del montante', () => {
    const proyecto = proyectoBase({ montantes: [MONTANTE_AF], conLocalSinConectividad: true })
    const r = agregarLocalAMontante(proyecto, 'm-af-1', 'uf-1', 'local-sin-red')
    expect(r.tipo).toBe('localSinFeedConectable')
  })

  it('proyecto sin redHidraulica', () => {
    const sinRed: Proyecto = { ...proyectoBase({ montantes: [MONTANTE_AF] }) }
    delete (sinRed as { redHidraulica?: RedHidraulica }).redHidraulica
    expect(agregarLocalAMontante(sinRed, 'm-af-1', 'uf-1', 'local-a').tipo).toBe('sinRedHidraulica')
  })
})

describe('quitarLocalDeMontante', () => {
  function proyectoConMontanteABC(): Proyecto {
    let proyecto = proyectoBase({ montantes: [MONTANTE_AF] })
    proyecto = esperarReconciliado(agregarLocalAMontante(proyecto, 'm-af-1', 'uf-1', 'local-a')).proyecto
    proyecto = esperarReconciliado(agregarLocalAMontante(proyecto, 'm-af-1', 'uf-1', 'local-c')).proyecto
    proyecto = esperarReconciliado(agregarLocalAMontante(proyecto, 'm-af-1', 'uf-1', 'local-b')).proyecto
    return proyecto
  }

  it('quitar un Local intermedio NO fusiona segmentos (§11): se conservan nodo y ambos segmentos', () => {
    const proyecto = proyectoConMontanteABC()
    const segmentosAntes = segmentosDe(proyecto, 'm-af-1').map((t) => t.id).sort()

    const r = esperarReconciliado(quitarLocalDeMontante(proyecto, 'm-af-1', 'uf-1', 'local-b'))

    expect(segmentosDe(r.proyecto, 'm-af-1').map((t) => t.id).sort()).toEqual(segmentosAntes)
    // El feed de local-b volvió a la raíz canónica.
    const feedB = r.proyecto.redHidraulica!.tramos.find((t) => t.id === 't-af-b')!
    expect(feedB.nodoOrigenId).toBe('n-0')
    expect(localesServidosClaves(r)).toEqual(['uf-1/local-a', 'uf-1/local-c'])
    expect(validarRedHidraulica(r.proyecto)).toEqual([])
  })

  it('quitar el Local de la punta con segmento entrante sugerido -> se poda ese nodo y su segmento', () => {
    const proyecto = proyectoConMontanteABC()
    // local-c está en la punta (cota 18, ascendente).
    const r = esperarReconciliado(quitarLocalDeMontante(proyecto, 'm-af-1', 'uf-1', 'local-c'))
    expect(segmentosDe(r.proyecto, 'm-af-1')).toHaveLength(2)
    expect(localesServidosClaves(r)).toEqual(['uf-1/local-a', 'uf-1/local-b'])
    expect(validarRedHidraulica(r.proyecto)).toEqual([])
  })

  it('quitar el Local de la punta con segmento entrante MANUAL -> NO se poda (se conserva el dato)', () => {
    let proyecto = proyectoConMontanteABC()
    proyecto = {
      ...proyecto,
      redHidraulica: {
        ...proyecto.redHidraulica!,
        tramos: proyecto.redHidraulica!.tramos.map((t) => {
          const cadena = cadenaOrdenada(proyecto, 'm-af-1')
          return t.id === cadena[cadena.length - 1]!.id ? { ...t, dnComercialAdoptado: '25 mm' } : t
        }),
      },
    }
    const r = esperarReconciliado(quitarLocalDeMontante(proyecto, 'm-af-1', 'uf-1', 'local-c'))
    expect(segmentosDe(r.proyecto, 'm-af-1')).toHaveLength(3)
    const conservado = segmentosDe(r.proyecto, 'm-af-1').find((t) => t.dnComercialAdoptado === '25 mm')
    expect(conservado).toBeDefined()
  })

  it('quitar un Local no servido es un no-op declarado', () => {
    const proyecto = proyectoConMontanteABC()
    expect(quitarLocalDeMontante(proyecto, 'm-af-1', 'uf-1', 'local-d').tipo).toBe('localNoServido')
  })
})

describe('borrarMontante', () => {
  function proyectoConMontanteAC(): Proyecto {
    let proyecto = proyectoBase({ montantes: [MONTANTE_AF] })
    proyecto = esperarReconciliado(agregarLocalAMontante(proyecto, 'm-af-1', 'uf-1', 'local-a')).proyecto
    proyecto = esperarReconciliado(agregarLocalAMontante(proyecto, 'm-af-1', 'uf-1', 'local-c')).proyecto
    return proyecto
  }

  it('sin datos manuales: elimina identidad y segmentos, reengancha feeds a la raíz canónica', () => {
    const proyecto = proyectoConMontanteAC()
    const r = esperarReconciliado(borrarMontante(proyecto, 'm-af-1'))

    expect(r.proyecto.montantes ?? []).toEqual([])
    expect(segmentosDe(r.proyecto, 'm-af-1')).toHaveLength(0)
    for (const id of ['t-af-a', 't-af-c']) {
      expect(r.proyecto.redHidraulica!.tramos.find((t) => t.id === id)!.nodoOrigenId).toBe('n-0')
    }
    // Ningún Local ni artefacto se perdió.
    expect(r.proyecto.unidadesFuncionales[0]!.niveles[0]!.locales).toHaveLength(
      proyecto.unidadesFuncionales[0]!.niveles[0]!.locales.length,
    )
    expect(validarRedHidraulica(r.proyecto)).toEqual([])
  })

  it('§15: un segmento con dato físico manual bloquea el borrado, sin mutar', () => {
    let proyecto = proyectoConMontanteAC()
    proyecto = {
      ...proyecto,
      redHidraulica: {
        ...proyecto.redHidraulica!,
        tramos: proyecto.redHidraulica!.tramos.map((t) =>
          t.montanteId === 'm-af-1' ? { ...t, accesorios: [{ tipo: 'llaveDePaso', cantidad: 1 }] } : t,
        ),
      },
    }
    const copiaProfunda = JSON.parse(JSON.stringify(proyecto))
    const r = borrarMontante(proyecto, 'm-af-1')
    expect(r.tipo).toBe('bloqueadoPorDatoFisicoManualEnBorrado')
    expect(JSON.parse(JSON.stringify(proyecto))).toEqual(copiaProfunda)
  })

  it('montante inexistente', () => {
    expect(borrarMontante(proyectoBase({ montantes: [MONTANTE_AF] }), 'no-existe').tipo).toBe('montanteInexistente')
  })
})

describe('PRUEBA CENTRAL DEL MOTOR (§17): vacío -> A -> C -> B intermedia', () => {
  it('CASO 1 y CASO 2 y CASO 3 sobre la misma secuencia', () => {
    // vacío -> A -> C
    let proyecto = proyectoBase({ montantes: [MONTANTE_AF] })
    proyecto = esperarReconciliado(agregarLocalAMontante(proyecto, 'm-af-1', 'uf-1', 'local-a')).proyecto
    const baseAC = esperarReconciliado(agregarLocalAMontante(proyecto, 'm-af-1', 'uf-1', 'local-c')).proyecto

    // CASO 1: A-C sólo sugerida -> split permitido.
    const caso1 = agregarLocalAMontante(baseAC, 'm-af-1', 'uf-1', 'local-b')
    expect(caso1.tipo).toBe('reconciliado')

    // CASO 2: A-C con dato manual -> bloqueado antes de mutar.
    const acManual: Proyecto = {
      ...baseAC,
      redHidraulica: {
        ...baseAC.redHidraulica!,
        tramos: baseAC.redHidraulica!.tramos.map((t) =>
          t.montanteId === 'm-af-1' && t.longitudEsSugerida === true
            ? { id: t.id, nodoOrigenId: t.nodoOrigenId, nodoDestinoId: t.nodoDestinoId, red: t.red, montanteId: t.montanteId!, longitud_m: 7 }
            : t,
        ),
      },
    }
    const snapshot = JSON.parse(JSON.stringify(acManual))
    const caso2 = agregarLocalAMontante(acManual, 'm-af-1', 'uf-1', 'local-b')
    expect(caso2.tipo).toBe('bloqueadoPorDatoFisicoManual')
    expect(JSON.parse(JSON.stringify(acManual))).toEqual(snapshot)

    // CASO 3: B en la misma cota que A -> reusa nodo, sin bloqueo.
    const localBMismaCota: Proyecto = {
      ...acManual,
      unidadesFuncionales: [
        {
          ...acManual.unidadesFuncionales[0]!,
          niveles: [
            {
              ...acManual.unidadesFuncionales[0]!.niveles[0]!,
              locales: acManual.unidadesFuncionales[0]!.niveles[0]!.locales.map((l) =>
                l.id === 'local-b' ? { ...l, cotaPiso_m: 6 } : l,
              ),
            },
          ],
        },
      ],
    }
    const caso3 = agregarLocalAMontante(localBMismaCota, 'm-af-1', 'uf-1', 'local-b')
    expect(caso3.tipo).toBe('reconciliado')
    if (caso3.tipo === 'reconciliado') {
      expect(segmentosDe(caso3.proyecto, 'm-af-1')).toHaveLength(segmentosDe(acManual, 'm-af-1').length)
    }
  })
})
