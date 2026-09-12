// Tests de integracion del motor: usan Proyecto/topologia/catalogo reales
// completos, sin mockear ninguna primitiva interna (el repo no usa ese
// patron). No repiten exhaustivamente el traversal de
// determinarCondicionHidraulicaDeCaudal, los casos unitarios de CRIT-A8 ni
// los de resolverQuEfectivo -- ya cubiertos en sus propios archivos. Fijan
// la COMPOSICION correcta y, en particular, el orden CRIT-A13 revisado
// (computables -> activos hidraulicos -> CRIT-A8).
import { describe, it, expect } from 'vitest'
import type {
  Artefacto,
  MetadatosProyecto,
  ParametrosProyecto,
  Proyecto,
  TipoDeProyecto,
  UnidadFuncional,
} from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, ReferenciaDeArtefacto, Tramo } from '../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { resolverHidraulicaDeTramo } from './resolverHidraulicaDeTramo'
import { calcularSeccionEscurrimiento, calcularDiametroInteriorMinimo } from '../../normativa/eras-2023/seccion-escurrimiento'

function metadatos(): MetadatosProyecto {
  return {
    nombre: 'Proyecto de prueba',
    obra: 'Obra de prueba',
    comitente: 'Comitente de prueba',
    fecha: '2026-01-01',
    schemaVersion: '1.0.0',
    versionNormativa: 'eras-2023',
  }
}

function parametros(tipoDeProyecto: TipoDeProyecto): ParametrosProyecto {
  return {
    tipoDeProyecto,
    presionSobreAcera_m: 0,
    alturaArtefactoMasDesfavorable_m: 0,
  }
}

function proyectoCon(
  tipoDeProyecto: TipoDeProyecto,
  unidadesFuncionales: readonly UnidadFuncional[],
  redHidraulica: RedHidraulica,
): Proyecto {
  return {
    metadatos: metadatos(),
    parametros: parametros(tipoDeProyecto),
    unidadesFuncionales,
    redHidraulica,
    configuracionHidraulica: { metodoPerdidaDistribuida: 'hazenWilliams', metodoPerdidaLocalizada: 'detallado', granularidadHidraulica: 'profesional', materialTuberiaId: 'ppr', sistemaDeTuberiaId: 'acquaSystemMagnumPn20' },
  }
}

function artefacto(idInstancia: string, artefactoIdCatalogo: string, cantidad = 1): Artefacto {
  return { id: idInstancia, artefactoId: artefactoIdCatalogo, cantidad, origen: 'normativo' }
}

function unidadFuncionalCon(
  unidadFuncionalId: string,
  localId: string,
  artefactos: readonly Artefacto[],
): UnidadFuncional {
  return {
    id: unidadFuncionalId,
    nombre: unidadFuncionalId,
    niveles: [
      {
        id: `${unidadFuncionalId}-nivel-1`,
        nombre: 'Nivel 1',
        locales: [{ id: localId, tipo: 'bano', regimen: 'domiciliario', artefactos }],
      },
    ],
  }
}

function referenciaDe(unidadFuncionalId: string, localId: string, artefactoId: string): ReferenciaDeArtefacto {
  return { tipo: 'artefacto', unidadFuncionalId, localId, artefactoId }
}

describe('resolverHidraulicaDeTramo', () => {
  it('1. caso simple AF: conDemanda, qc_lps>0 y coincide con simultaneidad.qc_lps', () => {
    const lavatorio = artefacto('inst-lavatorio', 'lavatorio')
    const uf = unidadFuncionalCon('uf-1', 'local-1', [lavatorio])
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: referenciaDe('uf-1', 'local-1', 'inst-lavatorio') }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' }]
    const proyecto = proyectoCon('oficinaPrivada', [uf], { nodos, tramos })

    const resultado = resolverHidraulicaDeTramo(proyecto, 't0', catalogoArtefactos)

    if (resultado.tipo !== 'conDemanda') {
      throw new Error('se esperaba conDemanda')
    }
    expect(resultado.qc_lps).toBeGreaterThan(0)
    expect(resultado.qc_lps).toBe(resultado.simultaneidad.qc_lps)
  })

  it('2. n=1: conDemanda, qc_lps=qmax efectivo, kc/k indeterminados (CRIT-A4), sin recalcular la fórmula', () => {
    // bidet conectado físicamente solo a AF, sin ningún terminal AC en toda
    // la red -> CRIT-A15: qu efectivo = quTotal_lps (0.20), no quFria_lps.
    const bidet = artefacto('inst-bidet', 'bidet')
    const uf = unidadFuncionalCon('uf-1', 'local-1', [bidet])
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: referenciaDe('uf-1', 'local-1', 'inst-bidet') }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' }]
    const proyecto = proyectoCon('oficinaPrivada', [uf], { nodos, tramos })

    const resultado = resolverHidraulicaDeTramo(proyecto, 't0', catalogoArtefactos)

    if (resultado.tipo !== 'conDemanda') {
      throw new Error('se esperaba conDemanda')
    }
    expect(resultado.qc_lps).toBe(0.2)
    expect('estado' in resultado.simultaneidad.kc && resultado.simultaneidad.kc.estado).toBe('indeterminado')
    expect('estado' in resultado.simultaneidad.k && resultado.simultaneidad.k.estado).toBe('indeterminado')
  })

  it('3. CRIT-A13 revisado (caso crítico): Local con inodoroValvula+lavatorio en aguaCaliente preserva la demanda del lavatorio', () => {
    // El lavatorio tiene un twin AF (n4/t3), no alcanzable desde t0, para
    // que su conectividad física sea AF+AC (CRIT-A15) y la condicion
    // aguaCaliente evaluada en t0 siga representando la fracción de mezcla
    // (quCaliente_lps), no una conexión física exclusivamente caliente.
    const inodoro = artefacto('inst-inodoro', 'inodoroValvula')
    const lavatorio = artefacto('inst-lavatorio', 'lavatorio')
    const uf = unidadFuncionalCon('uf-1', 'local-bano', [inodoro, lavatorio])
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n1' },
      { id: 'n2', referencia: referenciaDe('uf-1', 'local-bano', 'inst-inodoro') },
      { id: 'n3', referencia: referenciaDe('uf-1', 'local-bano', 'inst-lavatorio') },
      { id: 'n4', referencia: referenciaDe('uf-1', 'local-bano', 'inst-lavatorio') },
    ]
    const tramos: Tramo[] = [
      { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AC' },
      { id: 't1', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AC' },
      { id: 't2', nodoOrigenId: 'n1', nodoDestinoId: 'n3', red: 'AC' },
      { id: 't3', nodoOrigenId: 'n0', nodoDestinoId: 'n4', red: 'AF' },
    ]
    const proyecto = proyectoCon('oficinaPrivada', [uf], { nodos, tramos })

    const resultado = resolverHidraulicaDeTramo(proyecto, 't0', catalogoArtefactos)

    if (resultado.tipo !== 'conDemanda') {
      throw new Error('se esperaba conDemanda: la demanda AC del lavatorio no debe desaparecer por el inodoro')
    }
    expect(resultado.qc_lps).toBe(0.12)
  })

  it('4. mismo Local en rama AF: CRIT-A8 deja la válvula, el resultado usa su caudal y no el del lavatorio', () => {
    const inodoro = artefacto('inst-inodoro', 'inodoroValvula')
    const lavatorio = artefacto('inst-lavatorio', 'lavatorio')
    const uf = unidadFuncionalCon('uf-1', 'local-bano', [inodoro, lavatorio])
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n1' },
      { id: 'n2', referencia: referenciaDe('uf-1', 'local-bano', 'inst-inodoro') },
      { id: 'n3', referencia: referenciaDe('uf-1', 'local-bano', 'inst-lavatorio') },
    ]
    const tramos: Tramo[] = [
      { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
      { id: 't1', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF' },
      { id: 't2', nodoOrigenId: 'n1', nodoDestinoId: 'n3', red: 'AF' },
    ]
    const proyecto = proyectoCon('oficinaPrivada', [uf], { nodos, tramos })

    const resultado = resolverHidraulicaDeTramo(proyecto, 't0', catalogoArtefactos)

    if (resultado.tipo !== 'conDemanda') {
      throw new Error('se esperaba conDemanda')
    }
    expect(resultado.qc_lps).toBe(1.5)
  })

  it('5. tronco común / total: preserva el comportamiento de condicion=total', () => {
    const lavatorio = artefacto('inst-lavatorio', 'lavatorio')
    const uf = unidadFuncionalCon('uf-1', 'local-bano', [lavatorio])
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n1' },
      { id: 'n2', referencia: referenciaDe('uf-1', 'local-bano', 'inst-lavatorio') },
      { id: 'n3', referencia: { tipo: 'produccionACS' } },
      { id: 'n4', referencia: referenciaDe('uf-1', 'local-bano', 'inst-lavatorio') },
    ]
    const tramos: Tramo[] = [
      { id: 't1', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
      { id: 't2', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF' },
      { id: 't3', nodoOrigenId: 'n1', nodoDestinoId: 'n3', red: 'AF' },
      { id: 't4', nodoOrigenId: 'n3', nodoDestinoId: 'n4', red: 'AC' },
    ]
    const proyecto = proyectoCon('oficinaPrivada', [uf], { nodos, tramos })

    const resultado = resolverHidraulicaDeTramo(proyecto, 't1', catalogoArtefactos)

    if (resultado.tipo !== 'conDemanda') {
      throw new Error('se esperaba conDemanda')
    }
    expect(resultado.qc_lps).toBe(0.2)
  })

  it('6. sin demanda legítima: todos los computables tienen qu_lps=0, devuelve sinDemanda sin lanzar', () => {
    const inodoro = artefacto('inst-inodoro', 'inodoroValvula')
    const uf = unidadFuncionalCon('uf-1', 'local-bano', [inodoro])
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: referenciaDe('uf-1', 'local-bano', 'inst-inodoro') }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AC' }]
    const proyecto = proyectoCon('oficinaPrivada', [uf], { nodos, tramos })

    const resultado = resolverHidraulicaDeTramo(proyecto, 't0', catalogoArtefactos)

    expect(resultado).toEqual({ tipo: 'sinDemanda', qc_lps: 0 })
  })

  it('7. artefacto no domiciliario sin desagregar + conexión física exclusiva (CRIT-A15): conDemanda con quTotal_lps, nunca sinDemanda', () => {
    // valvulaMingitorio (§2.9.1.3: quFria_lps/quCaliente_lps = null)
    // conectado sólo a AF -> CRIT-A15 fila "solo a AF": qu efectivo =
    // quTotal_lps. No hay campo null en juego (la única cañería transporta
    // el total), así que resuelve conDemanda -- nunca sinDemanda por un 0
    // fabricado.
    const mingitorio = artefacto('inst-mingitorio', 'valvulaMingitorio')
    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'UF 1',
      niveles: [
        {
          id: 'uf-1-nivel-1',
          nombre: 'Nivel 1',
          locales: [{ id: 'local-1', tipo: 'otros', regimen: 'noDomiciliario', artefactos: [mingitorio] }],
        },
      ],
    }
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n1', referencia: referenciaDe('uf-1', 'local-1', 'inst-mingitorio') },
    ]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' }]
    const proyecto = proyectoCon('oficinaPrivada', [uf], { nodos, tramos })

    const resultado = resolverHidraulicaDeTramo(proyecto, 't0', catalogoArtefactos)

    if (resultado.tipo !== 'conDemanda') {
      throw new Error('se esperaba conDemanda: CRIT-A15 fila "solo a AF" -> quTotal_lps, nunca sinDemanda')
    }
    expect(resultado.qc_lps).toBe(0.15) // quTotal_lps de valvulaMingitorio (CRIT-A4: n=1)
  })

  it('7b. lavavajillas industrial (catálogo sin desagregar) conectado a AF + AC: cada ramal evalúa 0,40 L/s y el tramo común que los reúne atribuye 0,40 L/s -- NUNCA 0,80 (D-δ.79)', () => {
    // ERAS §2.9.1.3 no publica columnas qu(A.Fría)/qu(A.Cal.): no hay base
    // para partir quTotal_lps entre ramas. Decisión del usuario (D-δ.79, no
    // norma ERAS): cada conexión física se dimensiona para el caudal total
    // declarado (0,40 L/s). El tramo común aguas arriba de ambas ramas
    // atribuye ese caudal al artefacto UNA sola vez (condición 'total' ->
    // quTotal_lps, sin doble conteo D-δ.8): jamás 0,40 + 0,40 = 0,80.
    const lavavajillas = artefacto('inst-lvi', 'lavavajillasIndustrial')
    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'UF 1',
      niveles: [
        {
          id: 'uf-1-nivel-1',
          nombre: 'Nivel 1',
          locales: [{ id: 'local-1', tipo: 'cocina', regimen: 'noDomiciliario', artefactos: [lavavajillas] }],
        },
      ],
    }
    // nTronco ─┬─ tRamaAF ──────────────────→ lavavajillas (n-af)
    //          └─ tACSin → n-acs(ACS) → tRamaAC → lavavajillas (n-ac)
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'nTronco' },
      { id: 'n-af', referencia: referenciaDe('uf-1', 'local-1', 'inst-lvi') },
      { id: 'n-acs', referencia: { tipo: 'produccionACS' } },
      { id: 'n-ac', referencia: referenciaDe('uf-1', 'local-1', 'inst-lvi') },
    ]
    const tramos: Tramo[] = [
      { id: 'tTronco', nodoOrigenId: 'n0', nodoDestinoId: 'nTronco', red: 'AF' },
      { id: 'tRamaAF', nodoOrigenId: 'nTronco', nodoDestinoId: 'n-af', red: 'AF' },
      { id: 'tACSin', nodoOrigenId: 'nTronco', nodoDestinoId: 'n-acs', red: 'AF' },
      { id: 'tRamaAC', nodoOrigenId: 'n-acs', nodoDestinoId: 'n-ac', red: 'AC' },
    ]
    const proyecto = proyectoCon('oficinaPrivada', [uf], { nodos, tramos })

    const ramaAF = resolverHidraulicaDeTramo(proyecto, 'tRamaAF', catalogoArtefactos)
    if (ramaAF.tipo !== 'conDemanda') throw new Error('se esperaba conDemanda en el ramal AF')
    expect(ramaAF.qc_lps).toBe(0.4)

    const ramaAC = resolverHidraulicaDeTramo(proyecto, 'tRamaAC', catalogoArtefactos)
    if (ramaAC.tipo !== 'conDemanda') throw new Error('se esperaba conDemanda en el ramal AC')
    expect(ramaAC.qc_lps).toBe(0.4)

    const tronco = resolverHidraulicaDeTramo(proyecto, 'tTronco', catalogoArtefactos)
    if (tronco.tipo !== 'conDemanda') throw new Error('se esperaba conDemanda en el tramo común')
    expect(tronco.qc_lps).toBe(0.4)
    expect(tronco.qc_lps).not.toBe(0.8)
  })

  it('8. multifamiliar, una UF: aEfectivo=1', () => {
    const lavatorio = artefacto('inst-lavatorio', 'lavatorio')
    const bidet = artefacto('inst-bidet', 'bidet')
    const uf = unidadFuncionalCon('uf-1', 'local-bano', [lavatorio, bidet])
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n1' },
      { id: 'n2', referencia: referenciaDe('uf-1', 'local-bano', 'inst-lavatorio') },
      { id: 'n3', referencia: referenciaDe('uf-1', 'local-bano', 'inst-bidet') },
    ]
    const tramos: Tramo[] = [
      { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
      { id: 't1', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF' },
      { id: 't2', nodoOrigenId: 'n1', nodoDestinoId: 'n3', red: 'AF' },
    ]
    const proyecto = proyectoCon('viviendaMultifamiliar', [uf], { nodos, tramos })

    const resultado = resolverHidraulicaDeTramo(proyecto, 't0', catalogoArtefactos)

    if (resultado.tipo !== 'conDemanda') {
      throw new Error('se esperaba conDemanda')
    }
    expect(resultado.simultaneidad.aEfectivo).toBe(1)
  })

  it('9. multifamiliar, más de una UF: aEfectivo=2, K se preserva sin cap', () => {
    const artefactoUf1 = artefacto('inst-a1', 'lavatorio')
    const artefactoUf2 = artefacto('inst-a2', 'lavatorio')
    const uf1 = unidadFuncionalCon('uf-1', 'local-1', [artefactoUf1])
    const uf2 = unidadFuncionalCon('uf-2', 'local-2', [artefactoUf2])
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n1' },
      { id: 'n2', referencia: referenciaDe('uf-1', 'local-1', 'inst-a1') },
      { id: 'n3', referencia: referenciaDe('uf-2', 'local-2', 'inst-a2') },
    ]
    const tramos: Tramo[] = [
      { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
      { id: 't1', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF' },
      { id: 't2', nodoOrigenId: 'n1', nodoDestinoId: 'n3', red: 'AF' },
    ]
    const proyecto = proyectoCon('viviendaMultifamiliar', [uf1, uf2], { nodos, tramos })

    const resultado = resolverHidraulicaDeTramo(proyecto, 't0', catalogoArtefactos)

    if (resultado.tipo !== 'conDemanda') {
      throw new Error('se esperaba conDemanda')
    }
    if ('estado' in resultado.simultaneidad.k) {
      throw new Error('se esperaba K numérico, no indeterminado')
    }
    expect(resultado.simultaneidad.aEfectivo).toBe(2)
    expect(resultado.simultaneidad.k.valor).toBeGreaterThan(1)
  })

  it('10. UF eliminada por actividad cero: aEfectivo=1, no 2 (CRIT-A14 sobre el conjunto hidráulicamente atendido)', () => {
    const lavatorio = artefacto('inst-lavatorio', 'lavatorio')
    const inodoro = artefacto('inst-inodoro', 'inodoroValvula')
    const uf1 = unidadFuncionalCon('uf-1', 'local-1', [lavatorio])
    const uf2 = unidadFuncionalCon('uf-2', 'local-2', [inodoro])
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'n1' },
      { id: 'n2', referencia: referenciaDe('uf-1', 'local-1', 'inst-lavatorio') },
      { id: 'n3', referencia: { tipo: 'produccionACS' } },
      { id: 'n4', referencia: referenciaDe('uf-2', 'local-2', 'inst-inodoro') },
    ]
    const tramos: Tramo[] = [
      { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
      { id: 't1', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF' },
      // El inodoro de UF-2 solo es alcanzable via produccionACS -> resuelve
      // aguaCaliente para el tramo evaluado (t0); inodoroValvula.quCaliente=0,
      // por lo que UF-2 queda sin ningún consumo activo en esta condición.
      { id: 't2', nodoOrigenId: 'n1', nodoDestinoId: 'n3', red: 'AF' },
      { id: 't3', nodoOrigenId: 'n3', nodoDestinoId: 'n4', red: 'AC' },
    ]
    const proyecto = proyectoCon('viviendaMultifamiliar', [uf1, uf2], { nodos, tramos })

    const resultado = resolverHidraulicaDeTramo(proyecto, 't0', catalogoArtefactos)

    if (resultado.tipo !== 'conDemanda') {
      throw new Error('se esperaba conDemanda')
    }
    expect(resultado.simultaneidad.aEfectivo).toBe(1)
  })

  it('11. artefacto normativo inexistente en el catálogo: propaga la excepción', () => {
    const desconocido = artefacto('inst-x', 'artefactoInexistente')
    const uf = unidadFuncionalCon('uf-1', 'local-1', [desconocido])
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: referenciaDe('uf-1', 'local-1', 'inst-x') }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' }]
    const proyecto = proyectoCon('oficinaPrivada', [uf], { nodos, tramos })

    expect(() => resolverHidraulicaDeTramo(proyecto, 't0', catalogoArtefactos)).toThrow(/artefactoInexistente/)
  })

  it('12. tramoId inexistente: propaga la excepción topológica existente', () => {
    const proyecto = proyectoCon('oficinaPrivada', [], { nodos: [], tramos: [] })

    expect(() => resolverHidraulicaDeTramo(proyecto, 'tramo-inexistente', catalogoArtefactos)).toThrow(
      /tramo-inexistente/,
    )
  })

  it('13. no muta Proyecto, RedHidraulica ni catálogo', () => {
    const lavatorio = artefacto('inst-lavatorio', 'lavatorio')
    const uf = unidadFuncionalCon('uf-1', 'local-1', [lavatorio])
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: referenciaDe('uf-1', 'local-1', 'inst-lavatorio') }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' }]
    const proyecto = proyectoCon('oficinaPrivada', [uf], { nodos, tramos })

    const copiaProyecto = JSON.parse(JSON.stringify(proyecto)) as Proyecto
    const copiaCatalogo = [...catalogoArtefactos]

    resolverHidraulicaDeTramo(proyecto, 't0', catalogoArtefactos)

    expect(proyecto).toEqual(copiaProyecto)
    expect(catalogoArtefactos).toEqual(copiaCatalogo)
  })

  it('14. conDemanda incluye predimensionamiento con Ve=2.0 m/s (CRIT-A16) y Ae/Di derivados del Qc del tramo', () => {
    const lavatorio = artefacto('inst-lavatorio', 'lavatorio')
    const uf = unidadFuncionalCon('uf-1', 'local-1', [lavatorio])
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: referenciaDe('uf-1', 'local-1', 'inst-lavatorio') }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' }]
    const proyecto = proyectoCon('oficinaPrivada', [uf], { nodos, tramos })

    const resultado = resolverHidraulicaDeTramo(proyecto, 't0', catalogoArtefactos)

    if (resultado.tipo !== 'conDemanda') {
      throw new Error('se esperaba conDemanda')
    }
    expect(resultado.predimensionamiento.ve_mps).toBe(2.0)
    expect(resultado.predimensionamiento.ae_cm2).toBe(calcularSeccionEscurrimiento(resultado.qc_lps, 2.0))
    expect(resultado.predimensionamiento.diReferenciaPredimensionamiento_mm).toBe(
      calcularDiametroInteriorMinimo(resultado.predimensionamiento.ae_cm2),
    )
  })

  it('15. sinDemanda no calcula predimensionamiento ni inventa Ae/Di sintéticos', () => {
    const inodoro = artefacto('inst-inodoro', 'inodoroValvula')
    const uf = unidadFuncionalCon('uf-1', 'local-bano', [inodoro])
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: referenciaDe('uf-1', 'local-bano', 'inst-inodoro') }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AC' }]
    const proyecto = proyectoCon('oficinaPrivada', [uf], { nodos, tramos })

    const resultado = resolverHidraulicaDeTramo(proyecto, 't0', catalogoArtefactos)

    expect(resultado).toEqual({ tipo: 'sinDemanda', qc_lps: 0 })
    expect('predimensionamiento' in resultado).toBe(false)
  })
})
