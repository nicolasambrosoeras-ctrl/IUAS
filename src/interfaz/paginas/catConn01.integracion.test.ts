// CAT-CONN-01 (D-δ.84) -- integración: conectividad física por política de
// catálogo, sin precedentes. Ejercita la MISMA composición de funciones
// que la UI de M1 (resolver política -> sincronizar con Redes declaradas /
// reconciliar al cambiar tipo / duplicar UF), sobre fixtures de datos
// puros (vitest 'node', sin React).
import { describe, it, expect } from 'vitest'
import type {
  Artefacto,
  MetadatosProyecto,
  ParametrosProyecto,
  Proyecto,
  UnidadFuncional,
} from '../../modelo/proyecto'
import type { ConectividadFisica, Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { auditarCoberturaFisica } from '../../motor/tuberias/cobertura/auditarCoberturaFisica'
import { validarRedHidraulica } from '../../validacion/redHidraulica'
import { resolverQuEfectivoParaTramo } from '../../motor/tuberias/caudal/resolverQuEfectivoParaTramo'
import {
  resolverConectividadInicialDeArtefacto,
  redesDeConectividadFisica,
} from '../../motor/tuberias/topologia/resolverConectividadInicialDeArtefacto'
import { generarId } from './generarId'
import { sincronizarConectividadFisicaDeArtefactoConRedesDeclaradas } from './sincronizarConectividadFisicaDeArtefacto'
import { reconciliarConectividadFisicaPorCambioDeArtefacto } from './reconciliarConectividadFisicaPorCambioDeArtefacto'
import { duplicarUnidadFuncionalEnProyecto } from './duplicarUnidadFuncional'

function metadatos(): MetadatosProyecto {
  return { nombre: 'P', obra: 'O', comitente: 'C', fecha: '2026-09-09', schemaVersion: '1.0.0', versionNormativa: 'eras-2023' }
}
function parametros(): ParametrosProyecto {
  return { tipoDeProyecto: 'viviendaIndividual', presionSobreAcera_m: 0, alturaArtefactoMasDesfavorable_m: 0 }
}
function config() {
  return {
    metodoPerdidaDistribuida: 'hazenWilliams' as const,
    metodoPerdidaLocalizada: 'detallado' as const,
    granularidadHidraulica: 'profesional' as const,
    materialTuberiaId: 'ppr' as const,
    sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
  }
}

// Proyecto mínimo: 1 UF, 1 Local vacío, raíz AF (n0) + Alimentación ACS ya
// existentes (para que bootstrap/hermano tengan de dónde colgar). SIN
// ningún artefacto conectado -> ningún "precedente" posible.
function proyectoVacio(): Proyecto {
  const uf: UnidadFuncional = {
    id: 'uf-1',
    nombre: 'UF 1',
    nivel: 0,
    cotaHidraulicaReferencia_m: 1,
    locales: [{ id: 'l-1', tipo: 'otros', regimen: 'domiciliario', artefactos: [] }],
  }
  const nodos: Nodo[] = [
    { id: 'n-general' },
    { id: 'n0' },
    { id: 'n-acs', referencia: { tipo: 'produccionACS' } },
  ]
  const tramos: Tramo[] = [
    { id: 't-general', nodoOrigenId: 'n-general', nodoDestinoId: 'n0', red: 'AF', longitud_m: 10 },
    { id: 't-af-acs', nodoOrigenId: 'n0', nodoDestinoId: 'n-acs', red: 'AF', longitud_m: 10 },
  ]
  const redHidraulica: RedHidraulica = { nodos, tramos }
  return { metadatos: metadatos(), parametros: parametros(), unidadesFuncionales: [uf], redHidraulica, configuracionHidraulica: config() }
}

function conArtefacto(proyecto: Proyecto, ufId: string, localId: string, art: Artefacto): Proyecto {
  return {
    ...proyecto,
    unidadesFuncionales: proyecto.unidadesFuncionales.map((uf) =>
      uf.id !== ufId
        ? uf
        : { ...uf, locales: uf.locales.map((l) => (l.id !== localId ? l : { ...l, artefactos: [...l.artefactos, art] })) },
    ),
  }
}

function mapArtefacto(proyecto: Proyecto, ufId: string, localId: string, rowId: string, fn: (a: Artefacto) => Artefacto): Proyecto {
  return {
    ...proyecto,
    unidadesFuncionales: proyecto.unidadesFuncionales.map((uf) =>
      uf.id !== ufId
        ? uf
        : {
            ...uf,
            locales: uf.locales.map((l) =>
              l.id !== localId ? l : { ...l, artefactos: l.artefactos.map((a) => (a.id === rowId ? fn(a) : a)) },
            ),
          },
    ),
  }
}

// ALTA como la UI: crea la fila con el tipo real, resuelve la política y
// -- si es `resuelta` -- sincroniza con las Redes declaradas por la
// política. Si es `requiereSeleccion`, la fila queda sin terminales.
function altaComoLaUI(
  proyecto: Proyecto,
  ufId: string,
  localId: string,
  artefactoIdCatalogo: string,
): { proyecto: Proyecto; rowId: string; pidioSeleccion: boolean } {
  const rowId = generarId('artefacto')
  const nuevo: Artefacto = { id: rowId, artefactoId: artefactoIdCatalogo, cantidad: 1, origen: 'normativo' }
  const conFila = conArtefacto(proyecto, ufId, localId, nuevo)
  const resol = resolverConectividadInicialDeArtefacto(artefactoIdCatalogo)
  if (resol.tipo === 'resuelta') {
    const sync = sincronizarConectividadFisicaDeArtefactoConRedesDeclaradas(conFila, ufId, localId, rowId, resol.redes)
    return { proyecto: sync.tipo === 'sincronizado' ? sync.proyecto : conFila, rowId, pidioSeleccion: false }
  }
  return { proyecto: conFila, rowId, pidioSeleccion: resol.tipo === 'requiereSeleccion' }
}

// Cambio de tipo como la UI (rama sin transacción pendiente): limpia el
// override anterior, aplica el nuevo artefactoId, reconcilia.
function cambioDeTipoComoLaUI(proyecto: Proyecto, ufId: string, localId: string, rowId: string, nuevoTipo: string): Proyecto {
  const conTipoNuevo = mapArtefacto(proyecto, ufId, localId, rowId, (a) => {
    const copia = { ...a, artefactoId: nuevoTipo }
    delete copia.conectividadElegida
    return copia
  })
  return reconciliarConectividadFisicaPorCambioDeArtefacto(conTipoNuevo, ufId, localId, rowId)
}

// Confirmación de una transacción pendiente hacia `requiereSeleccion`:
// aplica tipo + conectividadElegida + reconcilia (como declararRedes).
function confirmarSeleccionCambioDeTipo(
  proyecto: Proyecto,
  ufId: string,
  localId: string,
  rowId: string,
  nuevoTipo: string,
  conectividad: ConectividadFisica,
): Proyecto {
  const conTipoYEleccion = mapArtefacto(proyecto, ufId, localId, rowId, (a) => ({
    ...a,
    artefactoId: nuevoTipo,
    conectividadElegida: conectividad,
  }))
  return reconciliarConectividadFisicaPorCambioDeArtefacto(conTipoYEleccion, ufId, localId, rowId)
}

function redesDeInstancia(proyecto: Proyecto, localId: string, rowId: string): Set<string> {
  const red = proyecto.redHidraulica!
  const ids = new Set(
    red.nodos
      .filter((n) => n.referencia?.tipo === 'artefacto' && n.referencia.localId === localId && n.referencia.artefactoId === rowId)
      .map((n) => n.id),
  )
  return new Set(red.tramos.filter((t) => ids.has(t.nodoDestinoId)).map((t) => t.red))
}

const AUTOMATICOS: ReadonlyArray<[string, ConectividadFisica]> = [
  ['inodoroValvula', 'soloAF'],
  ['banera', 'ambas'],
  ['receptaculoDucha', 'ambas'],
  ['bidet', 'ambas'],
  ['lavatorio', 'ambas'],
  ['inodoroDeposito', 'soloAF'],
  ['piletaDeCocina', 'ambas'],
  ['piletaDeLavar', 'ambas'],
  ['valvulaMingitorio', 'soloAF'],
  ['piletaDeCocinaIndustrial', 'ambas'],
  ['lavachatas', 'soloAF'],
  ['canillaDeServicio', 'soloAF'],
]

describe('CAT-CONN-01 · ALTA en proyecto SIN precedentes', () => {
  it.each(AUTOMATICOS)('«%s» queda %s automáticamente, sin selección y con cobertura completa', (tipo, conectividad) => {
    const { proyecto, rowId, pidioSeleccion } = altaComoLaUI(proyectoVacio(), 'uf-1', 'l-1', tipo)
    expect(pidioSeleccion).toBe(false)
    expect([...redesDeInstancia(proyecto, 'l-1', rowId)].sort()).toEqual([...redesDeConectividadFisica(conectividad)].sort())
    expect(validarRedHidraulica(proyecto)).toEqual([])
    expect(auditarCoberturaFisica(proyecto).completa).toBe(true)
  })

  it('«maquinaLavavajillas» y «maquinaLavarropas» quedan AF por default, sin selección', () => {
    for (const tipo of ['maquinaLavavajillas', 'maquinaLavarropas']) {
      const { proyecto, rowId, pidioSeleccion } = altaComoLaUI(proyectoVacio(), 'uf-1', 'l-1', tipo)
      expect(pidioSeleccion, tipo).toBe(false)
      expect([...redesDeInstancia(proyecto, 'l-1', rowId)], tipo).toEqual(['AF'])
    }
  })

  it('«lavavajillasIndustrial» y «lavarropasIndustrial» piden selección y NO quedan conectados', () => {
    for (const tipo of ['lavavajillasIndustrial', 'lavarropasIndustrial']) {
      const { proyecto, rowId, pidioSeleccion } = altaComoLaUI(proyectoVacio(), 'uf-1', 'l-1', tipo)
      expect(pidioSeleccion, tipo).toBe(true)
      expect(redesDeInstancia(proyecto, 'l-1', rowId).size, tipo).toBe(0)
      // La fila existe (S1 la marcará como pendiente) pero no se inventó conectividad.
      expect(auditarCoberturaFisica(proyecto).completa).toBe(false)
    }
  })
})

describe('CAT-CONN-01 · el precedente ya no decide', () => {
  it('con un precedente CONTRADICTORIO (bañera legacy soloAF en otra UF) la nueva bañera igual queda AF+AC', () => {
    let p = proyectoVacio()
    // UF-2 con una bañera "legacy" conectada SOLO a AF (como la dejaría el
    // flujo viejo si el usuario la hubiera declarado soloAF).
    const uf2: UnidadFuncional = {
      id: 'uf-2',
      nombre: 'UF 2',
      nivel: 0,
      cotaHidraulicaReferencia_m: 1,
      locales: [{ id: 'l-2', tipo: 'bano', regimen: 'domiciliario', artefactos: [{ id: 'art-legacy', artefactoId: 'banera', cantidad: 1, origen: 'normativo' }] }],
    }
    p = { ...p, unidadesFuncionales: [...p.unidadesFuncionales, uf2] }
    p = {
      ...p,
      redHidraulica: {
        nodos: [...p.redHidraulica!.nodos, { id: 'n-legacy', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-2', localId: 'l-2', artefactoId: 'art-legacy' } }],
        tramos: [...p.redHidraulica!.tramos, { id: 't-legacy', nodoOrigenId: 'n0', nodoDestinoId: 'n-legacy', red: 'AF' }],
      },
    }
    expect(redesDeInstancia(p, 'l-2', 'art-legacy')).toEqual(new Set(['AF']))

    const { proyecto, rowId, pidioSeleccion } = altaComoLaUI(p, 'uf-1', 'l-1', 'banera')
    expect(pidioSeleccion).toBe(false)
    expect([...redesDeInstancia(proyecto, 'l-1', rowId)].sort()).toEqual(['AC', 'AF'])
    // La bañera legacy de UF-2 no se toca.
    expect(redesDeInstancia(proyecto, 'l-2', 'art-legacy')).toEqual(new Set(['AF']))
  })

  it('en proyecto vacío o con precedente, el resultado del resolver es idéntico', () => {
    for (const [tipo] of AUTOMATICOS) {
      const a = altaComoLaUI(proyectoVacio(), 'uf-1', 'l-1', tipo)
      const conPrecedente = altaComoLaUI(a.proyecto, 'uf-1', 'l-1', tipo)
      expect(redesDeInstancia(a.proyecto, 'l-1', a.rowId)).toEqual(
        redesDeInstancia(conPrecedente.proyecto, 'l-1', conPrecedente.rowId),
      )
    }
  })
})

describe('CAT-CONN-01 · editor defaultConfigurable', () => {
  it('lavavajillas doméstico: AF default -> AF+AC (agrega AC, conserva AF) -> AF (quita AC)', () => {
    const alta = altaComoLaUI(proyectoVacio(), 'uf-1', 'l-1', 'maquinaLavavajillas')
    expect([...redesDeInstancia(alta.proyecto, 'l-1', alta.rowId)]).toEqual(['AF'])

    // El editor fija conectividadElegida='ambas' y reconcilia.
    const aAmbas = reconciliarConectividadFisicaPorCambioDeArtefacto(
      mapArtefacto(alta.proyecto, 'uf-1', 'l-1', alta.rowId, (a) => ({ ...a, conectividadElegida: 'ambas' })),
      'uf-1',
      'l-1',
      alta.rowId,
    )
    expect([...redesDeInstancia(aAmbas, 'l-1', alta.rowId)].sort()).toEqual(['AC', 'AF'])
    expect(validarRedHidraulica(aAmbas)).toEqual([])

    // Volver a AF: el editor normaliza a "sin override" (referencia default).
    const aAF = reconciliarConectividadFisicaPorCambioDeArtefacto(
      mapArtefacto(aAmbas, 'uf-1', 'l-1', alta.rowId, (a) => {
        const copia = { ...a }
        delete copia.conectividadElegida
        return copia
      }),
      'uf-1',
      'l-1',
      alta.rowId,
    )
    expect([...redesDeInstancia(aAF, 'l-1', alta.rowId)]).toEqual(['AF'])
    expect(validarRedHidraulica(aAF)).toEqual([])
  })
})

describe('CAT-CONN-01 · cambio de tipo (stale eliminado)', () => {
  it('Bañera (AF+AC) -> Inodoro depósito: no queda AC stale, queda AF', () => {
    const alta = altaComoLaUI(proyectoVacio(), 'uf-1', 'l-1', 'banera')
    expect([...redesDeInstancia(alta.proyecto, 'l-1', alta.rowId)].sort()).toEqual(['AC', 'AF'])

    const p = cambioDeTipoComoLaUI(alta.proyecto, 'uf-1', 'l-1', alta.rowId, 'inodoroDeposito')
    expect([...redesDeInstancia(p, 'l-1', alta.rowId)]).toEqual(['AF'])
    expect(validarRedHidraulica(p)).toEqual([])
    expect(auditarCoberturaFisica(p).completa).toBe(true)
  })

  it('Industrial ambiguo (AF+AC declarado) -> Bañera: queda AF+AC automática (no hereda override del industrial)', () => {
    // Alta industrial + selección AF+AC.
    const alta = altaComoLaUI(proyectoVacio(), 'uf-1', 'l-1', 'lavavajillasIndustrial')
    const conSeleccion = reconciliarConectividadFisicaPorCambioDeArtefacto(
      mapArtefacto(alta.proyecto, 'uf-1', 'l-1', alta.rowId, (a) => ({ ...a, conectividadElegida: 'ambas' })),
      'uf-1',
      'l-1',
      alta.rowId,
    )
    expect([...redesDeInstancia(conSeleccion, 'l-1', alta.rowId)].sort()).toEqual(['AC', 'AF'])

    const p = cambioDeTipoComoLaUI(conSeleccion, 'uf-1', 'l-1', alta.rowId, 'banera')
    // banera es automatica ambas -> sigue AF+AC, pero por política, no por
    // el override del industrial (que se limpió).
    expect([...redesDeInstancia(p, 'l-1', alta.rowId)].sort()).toEqual(['AC', 'AF'])
    const artefacto = p.unidadesFuncionales[0]!.locales[0]!.artefactos.find((a) => a.id === alta.rowId)!
    expect(artefacto.conectividadElegida).toBeUndefined()
  })

  it('Inodoro depósito (AF) -> Lavavajillas industrial: transacción pendiente; al declarar soloAC queda AC, sin AF stale', () => {
    const alta = altaComoLaUI(proyectoVacio(), 'uf-1', 'l-1', 'inodoroDeposito')
    expect([...redesDeInstancia(alta.proyecto, 'l-1', alta.rowId)]).toEqual(['AF'])

    // El artefacto YA tiene terminal -> el cambio a `requiereSeleccion` NO
    // se aplica hasta confirmar. Comprobamos que el resolver del tipo nuevo
    // pide selección (la UI abriría la transacción pendiente).
    expect(resolverConectividadInicialDeArtefacto('lavavajillasIndustrial').tipo).toBe('requiereSeleccion')

    // Confirmación con soloAC:
    const p = confirmarSeleccionCambioDeTipo(alta.proyecto, 'uf-1', 'l-1', alta.rowId, 'lavavajillasIndustrial', 'soloAC')
    expect([...redesDeInstancia(p, 'l-1', alta.rowId)]).toEqual(['AC'])
    expect(validarRedHidraulica(p)).toEqual([])
    expect(auditarCoberturaFisica(p).completa).toBe(true)
  })
})

describe('CAT-CONN-01 · duplicar UF conserva la conectividad diseñada', () => {
  it('un lavavajillasIndustrial seleccionado AF+AC se clona AF+AC (sin volver a pedir selección)', () => {
    // UF-1: alta del industrial + selección AF+AC (persiste conectividadElegida).
    const alta = altaComoLaUI(proyectoVacio(), 'uf-1', 'l-1', 'lavavajillasIndustrial')
    const conSeleccion = reconciliarConectividadFisicaPorCambioDeArtefacto(
      mapArtefacto(alta.proyecto, 'uf-1', 'l-1', alta.rowId, (a) => ({ ...a, conectividadElegida: 'ambas' })),
      'uf-1',
      'l-1',
      alta.rowId,
    )
    expect([...redesDeInstancia(conSeleccion, 'l-1', alta.rowId)].sort()).toEqual(['AC', 'AF'])

    const duplicado = duplicarUnidadFuncionalEnProyecto(conSeleccion, 'uf-1')
    const ufClon = duplicado.unidadesFuncionales.find((uf) => uf.id !== 'uf-1' && uf.nombre.includes('copia'))!
    const artClon = ufClon.locales[0]!.artefactos[0]!
    expect(artClon.conectividadElegida).toBe('ambas')
    expect([...redesDeInstancia(duplicado, ufClon.locales[0]!.id, artClon.id)].sort()).toEqual(['AC', 'AF'])
    expect(validarRedHidraulica(duplicado)).toEqual([])
  })

  it('un maquinaLavavajillas SIN override (AF por default) se clona AF, derivando de la topología del original', () => {
    const alta = altaComoLaUI(proyectoVacio(), 'uf-1', 'l-1', 'maquinaLavavajillas')
    expect(alta.proyecto.unidadesFuncionales[0]!.locales[0]!.artefactos[0]!.conectividadElegida).toBeUndefined()

    const duplicado = duplicarUnidadFuncionalEnProyecto(alta.proyecto, 'uf-1')
    const ufClon = duplicado.unidadesFuncionales.find((uf) => uf.id !== 'uf-1')!
    const artClon = ufClon.locales[0]!.artefactos[0]!
    expect([...redesDeInstancia(duplicado, ufClon.locales[0]!.id, artClon.id)]).toEqual(['AF'])
    expect(validarRedHidraulica(duplicado)).toEqual([])
  })
})

describe('CAT-CONN-01 · CRIT-A15 sin regresión (pileta de cocina industrial AF+AC)', () => {
  it('cada rama transporta quTotal y el tramo común lo atribuye una sola vez', () => {
    const { proyecto, rowId } = altaComoLaUI(proyectoVacio(), 'uf-1', 'l-1', 'piletaDeCocinaIndustrial')
    expect([...redesDeInstancia(proyecto, 'l-1', rowId)].sort()).toEqual(['AC', 'AF'])

    const cat = catalogoArtefactos.find((c) => c.id === 'piletaDeCocinaIndustrial')!
    const quTotal = cat.quTotal_lps // 0.5
    const red = proyecto.redHidraulica!
    const referencia = { tipo: 'artefacto' as const, unidadFuncionalId: 'uf-1', localId: 'l-1', artefactoId: rowId }

    const idsTerminal = new Set(
      red.nodos.filter((n) => n.referencia?.tipo === 'artefacto' && n.referencia.artefactoId === rowId).map((n) => n.id),
    )
    const tramoAF = red.tramos.find((t) => idsTerminal.has(t.nodoDestinoId) && t.red === 'AF')!
    const tramoAC = red.tramos.find((t) => idsTerminal.has(t.nodoDestinoId) && t.red === 'AC')!

    const quAF = resolverQuEfectivoParaTramo(red, tramoAF.id, referencia, cat)
    const quAC = resolverQuEfectivoParaTramo(red, tramoAC.id, referencia, cat)
    expect(quAF.qu_lps).toBe(quTotal)
    expect(quAC.qu_lps).toBe(quTotal)

    // El tramo común aguas arriba (t-general) ve la referencia en condición
    // 'total' -> quTotal una sola vez (nunca 2×quTotal).
    const quComun = resolverQuEfectivoParaTramo(red, 't-general', referencia, cat)
    expect(quComun.condicion).toBe('total')
    expect(quComun.qu_lps).toBe(quTotal)
  })
})
