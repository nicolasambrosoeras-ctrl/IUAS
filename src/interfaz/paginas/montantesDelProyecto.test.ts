// M2-TOPO-C — proyección y edición de identidad de montantes para el
// constructor de M2 (montantesDelProyecto.ts). Cubre lo que NO cubren los
// 25 tests del motor de reconciliación (reconciliarMontante.test.ts): crear
// y renombrar identidades, CAT-CONN + deduplicación del offering, la
// proyección read-only y la interpretación humana del resultado del motor.
import { describe, it, expect } from 'vitest'
import type { Local, Proyecto, TipoDeLocal, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { validarRedHidraulica } from '../../validacion/redHidraulica'
import {
  agregarLocalAMontante,
  borrarMontante,
  quitarLocalDeMontante,
  reconciliarTeesTrasCambioTopologico,
} from './reconciliarMontante'
import { conTeeDeNodo } from './actualizarRedHidraulica'
import {
  conMontanteNuevo,
  conNombreDeMontante,
  derivacionesDeMontante,
  etiquetaDeSalidaDeMontante,
  interpretarResultadoDeMontante,
  localesOfreciblesParaMontante,
  proyectarMontante,
  redesFisicasDeLocal,
} from './montantesDelProyecto'

// --- fixture -----------------------------------------------------------
// Una UF con cuatro Locales: uno sólo AF, uno AF+AC, uno sólo AC y uno sin
// ningún terminal físico. Cotas de piso por override del Local.

function local(id: string, tipo: TipoDeLocal, cotaPiso_m: number): Local {
  return { id, tipo, regimen: 'domiciliario', cotaPiso_m, artefactos: [{ id: `${id}-art`, artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }] }
}

function ramaAF(id: string): { nodos: Nodo[]; tramos: Tramo[] } {
  return {
    nodos: [
      { id: `n-${id}-af` },
      { id: `n-${id}-af-t`, referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: id, artefactoId: `${id}-art` } },
    ],
    tramos: [
      { id: `t-${id}-af`, nodoOrigenId: 'n-af', nodoDestinoId: `n-${id}-af`, red: 'AF' },
      { id: `t-${id}-af-t`, nodoOrigenId: `n-${id}-af`, nodoDestinoId: `n-${id}-af-t`, red: 'AF' },
    ],
  }
}

function ramaAC(id: string): { nodos: Nodo[]; tramos: Tramo[] } {
  return {
    nodos: [
      { id: `n-${id}-ac` },
      { id: `n-${id}-ac-t`, referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: id, artefactoId: `${id}-art-ac` } },
    ],
    tramos: [
      { id: `t-${id}-ac`, nodoOrigenId: 'n-acs', nodoDestinoId: `n-${id}-ac`, red: 'AC' },
      { id: `t-${id}-ac-t`, nodoOrigenId: `n-${id}-ac`, nodoDestinoId: `n-${id}-ac-t`, red: 'AC' },
    ],
  }
}

function proyectoBase(): Proyecto {
  const locales: Local[] = [
    local('l-af', 'bano', 3),
    local('l-ambas', 'cocina', 6),
    local('l-ac', 'toilette', 9),
    local('l-sin', 'lavadero', 3),
  ]
  // El Local AF+AC necesita el terminal AC extra; el Local sólo-AC usa un
  // artefacto cuyo id coincide con el terminal `ramaAC('l-ac')`.
  locales[1] = { ...locales[1]!, artefactos: [...locales[1]!.artefactos, { id: 'l-ambas-art-ac', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }] }
  locales[2] = { ...locales[2]!, artefactos: [{ id: 'l-ac-art-ac', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }] }
  const uf: UnidadFuncional = {
    id: 'uf-1',
    nombre: 'UF 1',
    niveles: [{ id: 'uf-1-nivel-1', nombre: 'Nivel 1', locales }],
  }

  const ramas = [ramaAF('l-af'), ramaAF('l-ambas'), ramaAC('l-ambas'), ramaAC('l-ac')]
  const redHidraulica: RedHidraulica = {
    nodos: [{ id: 'n-gen' }, { id: 'n-af' }, { id: 'n-acs', referencia: { tipo: 'produccionACS' } }, ...ramas.flatMap((r) => r.nodos)],
    tramos: [
      { id: 't-gen', nodoOrigenId: 'n-gen', nodoDestinoId: 'n-af', red: 'AF' },
      { id: 't-acs', nodoOrigenId: 'n-af', nodoDestinoId: 'n-acs', red: 'AF' },
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
      metodoPerdidaLocalizada: 'estimado',
      granularidadHidraulica: 'simplificada',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

function esperarProyecto(resultado: ReturnType<typeof agregarLocalAMontante>): Proyecto {
  if (resultado.tipo !== 'reconciliado') {
    throw new Error(`esperaba 'reconciliado', llegó '${resultado.tipo}'`)
  }
  return resultado.proyecto
}

// --- crear / renombrar identidad -------------------------------------

describe('conMontanteNuevo', () => {
  it('agrega una identidad con red y sin nombre, y devuelve su id; no toca la topología', () => {
    const base = proyectoBase()
    const { proyecto, montanteId } = conMontanteNuevo(base, 'AF')
    expect(proyecto.montantes).toEqual([{ id: montanteId, red: 'AF' }])
    expect(proyecto.redHidraulica).toBe(base.redHidraulica)
    expect(validarRedHidraulica(proyecto)).toEqual([])
  })

  it('acumula montantes de ambas redes, cada uno con id propio', () => {
    const uno = conMontanteNuevo(proyectoBase(), 'AF')
    const dos = conMontanteNuevo(uno.proyecto, 'AC')
    expect(dos.proyecto.montantes).toHaveLength(2)
    expect(dos.proyecto.montantes?.map((m) => m.red)).toEqual(['AF', 'AC'])
    expect(uno.montanteId).not.toBe(dos.montanteId)
  })
})

describe('conNombreDeMontante', () => {
  it('fija un nombre custom', () => {
    const { proyecto, montanteId } = conMontanteNuevo(proyectoBase(), 'AF')
    const renombrado = conNombreDeMontante(proyecto, montanteId, '  Montante dormitorios  ')
    expect(renombrado.montantes?.[0]?.nombre).toBe('Montante dormitorios')
    expect(proyectarMontante(renombrado, montanteId)?.nombre).toBe('Montante dormitorios')
  })

  it('nombre vacío o sólo espacios elimina el custom y vuelve al fallback por red', () => {
    const { proyecto, montanteId } = conMontanteNuevo(proyectoBase(), 'AF')
    const conNombre = conNombreDeMontante(proyecto, montanteId, 'X')
    const sinNombre = conNombreDeMontante(conNombre, montanteId, '   ')
    expect(sinNombre.montantes?.[0]).toEqual({ id: montanteId, red: 'AF' })
    expect(proyectarMontante(sinNombre, montanteId)?.nombre).toBe('Montante AF 1')
  })
})

// --- CAT-CONN --------------------------------------------------------

describe('redesFisicasDeLocal', () => {
  it('devuelve sólo las redes con terminal físico real, sin mirar tipo de artefacto', () => {
    const base = proyectoBase()
    expect(redesFisicasDeLocal(base, 'uf-1', 'l-af')).toEqual(['AF'])
    expect(redesFisicasDeLocal(base, 'uf-1', 'l-ambas')).toEqual(['AF', 'AC'])
    expect(redesFisicasDeLocal(base, 'uf-1', 'l-ac')).toEqual(['AC'])
    expect(redesFisicasDeLocal(base, 'uf-1', 'l-sin')).toEqual([])
  })
})

// --- offering + deduplicación --------------------------------------

describe('localesOfreciblesParaMontante', () => {
  it('un montante AF sólo ofrece Locales con conectividad AF (CAT-CONN §10)', () => {
    const { proyecto, montanteId } = conMontanteNuevo(proyectoBase(), 'AF')
    const ids = localesOfreciblesParaMontante(proyecto, montanteId).map((o) => o.localId)
    expect(ids).toContain('l-af')
    expect(ids).toContain('l-ambas')
    expect(ids).not.toContain('l-ac')
    expect(ids).not.toContain('l-sin')
  })

  it('no ofrece un Local ya servido por ESTE montante', () => {
    const { proyecto, montanteId } = conMontanteNuevo(proyectoBase(), 'AF')
    const conLocal = esperarProyecto(agregarLocalAMontante(proyecto, montanteId, 'uf-1', 'l-af'))
    const ids = localesOfreciblesParaMontante(conLocal, montanteId).map((o) => o.localId)
    expect(ids).not.toContain('l-af')
    expect(ids).toContain('l-ambas')
  })

  it('no ofrece un Local servido por OTRO montante de la misma red (dedup §11)', () => {
    const uno = conMontanteNuevo(proyectoBase(), 'AF')
    const dos = conMontanteNuevo(uno.proyecto, 'AF')
    const conLocal = esperarProyecto(agregarLocalAMontante(dos.proyecto, uno.montanteId, 'uf-1', 'l-af'))
    const ids = localesOfreciblesParaMontante(conLocal, dos.montanteId).map((o) => o.localId)
    expect(ids).not.toContain('l-af')
  })

  it('AF y AC son independientes: el mismo Local puede ofrecerse a un montante AC aunque esté en uno AF', () => {
    const af = conMontanteNuevo(proyectoBase(), 'AF')
    const conAF = esperarProyecto(agregarLocalAMontante(af.proyecto, af.montanteId, 'uf-1', 'l-ambas'))
    const ac = conMontanteNuevo(conAF, 'AC')
    const ids = localesOfreciblesParaMontante(ac.proyecto, ac.montanteId).map((o) => o.localId)
    expect(ids).toContain('l-ambas')
  })

  it('etiqueta humana por UF + tipo/ordinal del Local, nunca el id técnico', () => {
    const { proyecto, montanteId } = conMontanteNuevo(proyectoBase(), 'AF')
    const etiquetas = localesOfreciblesParaMontante(proyecto, montanteId).map((o) => o.etiqueta)
    expect(etiquetas).toContain('Baño 1 · UF 1')
    expect(etiquetas.join(' ')).not.toMatch(/l-af|uf-1/)
  })
})

// --- proyección read-only -----------------------------------------

describe('proyectarMontante', () => {
  it('montante recién creado: 0 segmentos, 0 Locales, nombre fallback (estado válido §8)', () => {
    const { proyecto, montanteId } = conMontanteNuevo(proyectoBase(), 'AF')
    const proy = proyectarMontante(proyecto, montanteId)
    expect(proy).toMatchObject({ red: 'AF', nombre: 'Montante AF 1', segmentos: [], localesServidos: [] })
    expect(proy?.cadenaLineal).toBe(true)
  })

  it('con Locales servidos: segmentos en orden origen→punta y Locales etiquetados', () => {
    const { proyecto, montanteId } = conMontanteNuevo(proyectoBase(), 'AF')
    const p1 = esperarProyecto(agregarLocalAMontante(proyecto, montanteId, 'uf-1', 'l-af'))
    const p2 = esperarProyecto(agregarLocalAMontante(p1, montanteId, 'uf-1', 'l-ambas'))
    const proy = proyectarMontante(p2, montanteId)!
    expect(proy.segmentos.map((s) => s.orden)).toEqual(proy.segmentos.map((_, i) => i))
    expect(proy.segmentos.length).toBeGreaterThanOrEqual(1)
    expect(proy.localesServidos.map((l) => l.etiqueta).sort()).toEqual(['Baño 1 · UF 1', 'Cocina 1 · UF 1'])
    // cada segmento trae su procedencia de longitud (RD-2), nunca inferida.
    for (const s of proy.segmentos) {
      expect(typeof s.longitudEsSugerida).toBe('boolean')
    }
  })

  it('devuelve undefined para una identidad inexistente', () => {
    expect(proyectarMontante(proyectoBase(), 'no-existe')).toBeUndefined()
  })
})

// --- interpretación humana del resultado -------------------------

describe('interpretarResultadoDeMontante', () => {
  it("'reconciliado' -> aplica el proyecto, sin aviso", () => {
    const { proyecto, montanteId } = conMontanteNuevo(proyectoBase(), 'AF')
    const r = agregarLocalAMontante(proyecto, montanteId, 'uf-1', 'l-af')
    const i = interpretarResultadoDeMontante(r)
    expect(i.proyecto).not.toBeNull()
    expect(i.aviso).toBeNull()
  })

  it("'localNoServido' -> no-op silencioso (sin proyecto y sin aviso)", () => {
    expect(interpretarResultadoDeMontante({ tipo: 'localNoServido' })).toEqual({ proyecto: null, aviso: null })
  })

  it('bloqueos por dato físico manual -> muestran el copy humano sin mutar', () => {
    const i = interpretarResultadoDeMontante({
      tipo: 'bloqueadoPorDatoFisicoManual',
      copyHumano: 'texto humano',
      segmentosBloqueantes: [],
    })
    expect(i).toEqual({ proyecto: null, aviso: 'texto humano' })
  })

  it('origenIntermedioNoSoportado -> aviso humano, sin enum ni id', () => {
    const i = interpretarResultadoDeMontante({ tipo: 'origenIntermedioNoSoportado', cotaOrigen_m: 4, cotasServidas_m: [3, 6] })
    expect(i.proyecto).toBeNull()
    expect(i.aviso).toBeTruthy()
    expect(i.aviso).not.toMatch(/origenIntermedio|NoSoportado/)
  })
})

// --- §16 poda / §20 duplicar UF ---------------------------------

describe('identidad de montante estable', () => {
  it('borrar el montante conserva Locales y artefactos, elimina la identidad', () => {
    const { proyecto, montanteId } = conMontanteNuevo(proyectoBase(), 'AF')
    const conLocal = esperarProyecto(agregarLocalAMontante(proyecto, montanteId, 'uf-1', 'l-af'))
    const borrado = borrarMontante(conLocal, montanteId)
    if (borrado.tipo !== 'reconciliado') throw new Error(borrado.tipo)
    expect(borrado.proyecto.montantes ?? []).toEqual([])
    expect(borrado.proyecto.unidadesFuncionales[0]?.niveles[0]?.locales.map((l) => l.id)).toContain('l-af')
    expect(validarRedHidraulica(borrado.proyecto)).toEqual([])
  })
})

// --- M2-TOPO-D: derivaciones (tees) del montante --------------------

// Montante AF con dos Locales a cotas distintas (l-af=3, l-ambas=6):
// exactamente UN nodo de derivación 1->2 (el de cota 3: feed de l-af +
// segmento que sube a cota 6); la punta (cota 6) es 1->1.
function montanteAfConDosLocales(): { proyecto: Proyecto; montanteId: string } {
  const creado = conMontanteNuevo(proyectoBase(), 'AF')
  const { montanteId } = creado
  const p1 = esperarProyecto(agregarLocalAMontante(creado.proyecto, montanteId, 'uf-1', 'l-af'))
  const p2 = esperarProyecto(agregarLocalAMontante(p1, montanteId, 'uf-1', 'l-ambas'))
  return { proyecto: p2, montanteId }
}

describe('derivacionesDeMontante (M2-TOPO-D)', () => {
  it('montante con 0 Locales: sin derivaciones (§15)', () => {
    const { proyecto, montanteId } = conMontanteNuevo(proyectoBase(), 'AF')
    expect(derivacionesDeMontante(proyecto, montanteId)).toEqual([])
  })

  it('montante con 1 Local: la punta es 1->1, no es derivación (§15)', () => {
    const { proyecto, montanteId } = conMontanteNuevo(proyectoBase(), 'AF')
    const conUno = esperarProyecto(agregarLocalAMontante(proyecto, montanteId, 'uf-1', 'l-af'))
    expect(derivacionesDeMontante(conUno, montanteId)).toEqual([])
  })

  it('montante con 2 Locales a cotas distintas: 1 bifurcación 1->2 con salidas humanas', () => {
    const { proyecto, montanteId } = montanteAfConDosLocales()
    const derivaciones = derivacionesDeMontante(proyecto, montanteId)
    expect(derivaciones).toHaveLength(1)
    const d = derivaciones[0]!
    expect(d.tipo).toBe('bifurcacion')
    if (d.tipo !== 'bifurcacion') return
    expect(d.teeConfigurada).toBe(false)
    const etiquetas = Object.values(d.etiquetasDeSalida).sort()
    // una salida es el Local que deriva acá, la otra la continuación del montante.
    expect(etiquetas).toContain('Baño 1 · UF 1')
    expect(etiquetas.some((e) => e.startsWith('Montante AF'))).toBe(true)
    // los VALORES (lo que se muestra) nunca son ids técnicos -- las claves
    // del record son tramoIds internos, sólo se usan para el matching.
    for (const etiqueta of etiquetas) {
      expect(etiqueta).not.toMatch(/tramo-montante|nodo-montante|^t-|^n-/)
    }
  })

  it('etiquetaDeSalidaDeMontante: continuación del montante -> su nombre; feed de un Local -> etiqueta del Local', () => {
    const { proyecto, montanteId } = montanteAfConDosLocales()
    const d = derivacionesDeMontante(proyecto, montanteId)[0]!
    if (d.tipo !== 'bifurcacion') throw new Error('esperaba bifurcacion')
    for (const salida of d.tramosSalientesIds) {
      const etiqueta = etiquetaDeSalidaDeMontante(proyecto, montanteId, salida)
      expect(etiqueta === 'Montante AF 1' || etiqueta === 'Baño 1 · UF 1').toBe(true)
    }
  })

  it('teeConfigurada refleja Nodo.tee; configurar no toca longitudes/DN/accesorios (§19)', () => {
    const { proyecto, montanteId } = montanteAfConDosLocales()
    const d = derivacionesDeMontante(proyecto, montanteId)[0]!
    if (d.tipo !== 'bifurcacion') throw new Error('esperaba bifurcacion')
    const conTee = conTeeDeNodo(proyecto, d.nodoId, { tipo: 'entradaCentral' })
    expect(validarRedHidraulica(conTee)).toEqual([])
    expect(conTee.redHidraulica!.tramos).toEqual(proyecto.redHidraulica!.tramos) // topología intacta
    expect(derivacionesDeMontante(conTee, montanteId)[0]!.tipo === 'bifurcacion' &&
      derivacionesDeMontante(conTee, montanteId)[0]).toMatchObject({ teeConfigurada: true })
  })
})

describe('reconciliarTeesTrasCambioTopologico (M2-TOPO-D §13/§38)', () => {
  it('preserva Nodo.tee mientras el nodo siga siendo 1->2 con las mismas salidas', () => {
    const { proyecto, montanteId } = montanteAfConDosLocales()
    const d = derivacionesDeMontante(proyecto, montanteId)[0]!
    if (d.tipo !== 'bifurcacion') throw new Error('esperaba bifurcacion')
    const conTee = conTeeDeNodo(proyecto, d.nodoId, {
      tipo: 'entradaPorExtremo',
      tramoSalidaRectaId: d.tramosSalientesIds[0],
    })
    const rh = reconciliarTeesTrasCambioTopologico(conTee.redHidraulica!)
    expect(rh).toBe(conTee.redHidraulica) // sin cambios -> misma referencia
    expect(rh.nodos.find((n) => n.id === d.nodoId)?.tee).toBeDefined()
  })

  it('quitar un Local que deja el nodo fuera de 1->2 limpia Nodo.tee, y el resultado valida', () => {
    const { proyecto, montanteId } = montanteAfConDosLocales()
    const d = derivacionesDeMontante(proyecto, montanteId)[0]!
    if (d.tipo !== 'bifurcacion') throw new Error('esperaba bifurcacion')
    // Configurar la tee marcando como recta la CONTINUACIÓN del montante.
    const salidaMontante = d.tramosSalientesIds.find(
      (s) => proyecto.redHidraulica!.tramos.find((t) => t.id === s)?.montanteId === montanteId,
    )!
    const conTee = conTeeDeNodo(proyecto, d.nodoId, { tipo: 'entradaPorExtremo', tramoSalidaRectaId: salidaMontante })
    expect(conTee.redHidraulica!.nodos.find((n) => n.id === d.nodoId)?.tee).toBeDefined()

    // Quitar l-af: su feed sale de ese nodo -> el nodo pasa a 1->1.
    const quitado = quitarLocalDeMontante(conTee, montanteId, 'uf-1', 'l-af')
    if (quitado.tipo !== 'reconciliado') throw new Error(quitado.tipo)
    expect(validarRedHidraulica(quitado.proyecto)).toEqual([])
    const nodo = quitado.proyecto.redHidraulica!.nodos.find((n) => n.id === d.nodoId)
    // el nodo puede haber sido podado o seguir sin tee -- nunca con una tee stale.
    expect(nodo?.tee).toBeUndefined()
    // longitudes/DN/accesorios de los segmentos: sin tocar por la limpieza de tee.
    expect(quitado.proyecto.redHidraulica!.tramos.every((t) => t.accesorios === undefined)).toBe(true)
  })
})
