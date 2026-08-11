// Golden/integration cases de extremo a extremo sobre resolverHidraulicaDeTramo:
// no vuelven a testear cada primitiva por separado (ya cubiertas en
// resolverHidraulicaDeTramo.test.ts y en los archivos de cada etapa). Los
// valores esperados se calculan a mano con las fórmulas normativas ya
// cerradas (CRIT-A1/A4/A13/A14/A15), nunca invocando funciones del propio
// motor -- eso invalidaría el valor del golden. Fixtures duplicadas
// localmente a propósito, sin exportar helpers compartidos.
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
import { validarRedHidraulica } from '../../validacion/redHidraulica'
import { resolverHidraulicaDeTramo } from './resolverHidraulicaDeTramo'
import { obtenerArtefactosAguasAbajo } from './topologia/obtenerArtefactosAguasAbajo'

function metadatos(): MetadatosProyecto {
  return {
    nombre: 'Proyecto golden',
    obra: 'Obra golden',
    comitente: 'Comitente golden',
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
    configuracionHidraulica: { metodoPerdidaDistribuida: 'hazenWilliams', materialTuberiaId: 'ppr', sistemaDeTuberiaId: 'acquaSystemMagnumPn20' },
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
    locales: [{ id: localId, tipo: 'bano', regimen: 'domiciliario', artefactos }],
  }
}

function referenciaDe(unidadFuncionalId: string, localId: string, artefactoId: string): ReferenciaDeArtefacto {
  return { tipo: 'artefacto', unidadFuncionalId, localId, artefactoId }
}

describe('resolverHidraulicaDeTramo — golden cases', () => {
  it('Golden 1 — vivienda individual, n=1 (CRIT-A4 de extremo a extremo) + CRIT-A15 AF-only', () => {
    // Un único lavatorio, tramo AF sin bifurcación ni ACS en toda la red ->
    // CRIT-A15: conectividad física soloAF (ningún terminal AC para esta
    // referencia en ningún lugar de la red) -> qu efectivo = quTotal_lps,
    // no quFria_lps: la única cañería existente transporta el caudal
    // completo del artefacto, no la fracción de mezcla.
    const lavatorio = artefacto('inst-lavatorio', 'lavatorio')
    const uf = unidadFuncionalCon('uf-1', 'local-1', [lavatorio])
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1', referencia: referenciaDe('uf-1', 'local-1', 'inst-lavatorio') }]
    const tramos: Tramo[] = [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' }]
    const proyecto = proyectoCon('viviendaIndividual', [uf], { nodos, tramos })

    const quEfectivoEsperado = 0.2 // quTotal_lps de 'lavatorio' (CRIT-A15: conectividad soloAF)

    const resultado = resolverHidraulicaDeTramo(proyecto, 't0', catalogoArtefactos)

    if (resultado.tipo !== 'conDemanda') {
      throw new Error('se esperaba conDemanda')
    }
    // CRIT-A4: n=1 -> Qc = Qmax = qu efectivo del único artefacto, sin Kc/a/K.
    expect(resultado.qc_lps).toBe(quEfectivoEsperado)
    expect(resultado.simultaneidad.qc_lps).toBe(quEfectivoEsperado)
    // viviendaIndividual -> aBase=1 (tabla normativa de coeficientes de mayoración).
    expect(resultado.simultaneidad.aEfectivo).toBe(1)
    if (!('estado' in resultado.simultaneidad.kc) || !('estado' in resultado.simultaneidad.k)) {
      throw new Error('se esperaban Kc y K indeterminados para n=1')
    }
    expect(resultado.simultaneidad.kc.estado).toBe('indeterminado')
    expect(resultado.simultaneidad.k.estado).toBe('indeterminado')
  })

  it('Golden 2 — vivienda multifamiliar, dos UF, n=2, K>1 sin cap + CRIT-A15 AF-only', () => {
    // UF-1 y UF-2, un lavatorio cada una, mismo tronco AF sin bifurcación
    // ni ACS en toda la red -> CRIT-A15: cada lavatorio tiene conectividad
    // física soloAF -> qu efectivo = quTotal_lps c/u, no quFria_lps.
    const lavatorioUf1 = artefacto('inst-a1', 'lavatorio')
    const lavatorioUf2 = artefacto('inst-a2', 'lavatorio')
    const uf1 = unidadFuncionalCon('uf-1', 'local-1', [lavatorioUf1])
    const uf2 = unidadFuncionalCon('uf-2', 'local-2', [lavatorioUf2])
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

    // Expected calculado a mano con las fórmulas normativas cerradas
    // (CRIT-A1: raíz cuadrada; CRIT-A14: >1 UF -> aEfectivo=2; CRIT-A2:
    // K sin cap; CRIT-A15: soloAF -> quTotal_lps), sin invocar ninguna
    // función del motor bajo prueba.
    const nEsperado = 2
    const quEfectivoUnitario = 0.2 // quTotal_lps de 'lavatorio' (CRIT-A15: conectividad soloAF)
    const qmaxEsperado = 2 * quEfectivoUnitario
    const aEfectivoEsperado = 2
    const kcEsperado = 1 / Math.sqrt(nEsperado - 1)
    const kEsperado = kcEsperado * aEfectivoEsperado
    const qcEsperado = qmaxEsperado * kEsperado

    const resultado = resolverHidraulicaDeTramo(proyecto, 't0', catalogoArtefactos)

    if (resultado.tipo !== 'conDemanda') {
      throw new Error('se esperaba conDemanda')
    }
    if ('estado' in resultado.simultaneidad.kc || 'estado' in resultado.simultaneidad.k) {
      throw new Error('se esperaban Kc y K numéricos, no indeterminados')
    }
    expect(resultado.simultaneidad.aEfectivo).toBe(aEfectivoEsperado)
    expect(resultado.simultaneidad.kc.valor).toBeCloseTo(kcEsperado, 10)
    expect(resultado.simultaneidad.k.valor).toBeCloseTo(kEsperado, 10)
    expect(resultado.simultaneidad.k.valor).toBeGreaterThan(1) // K>1 se conserva sin cap (CRIT-A2)
    expect(resultado.qc_lps).toBeCloseTo(qcEsperado, 10)
    expect(resultado.simultaneidad.qc_lps).toBeCloseTo(qcEsperado, 10)
  })

  it('Golden 3 — CRIT-A13 revisado + CRIT-A8 en agua caliente: demanda del lavatorio no desaparece por el inodoro', () => {
    // Local domiciliario con inodoroValvula (quCaliente=0, CRIT-A7) y
    // lavatorio (quCaliente=0.12), tramo evaluado en condicion aguaCaliente.
    // El lavatorio tiene un twin AF (n4/t3) en algún otro punto de la red
    // -- no alcanzable desde el tramo evaluado t0, a propósito -- para que
    // su conectividad física sea realmente AF+AC (CRIT-A15) y la condicion
    // aguaCaliente siga representando la fracción de mezcla (quCaliente_lps),
    // no una conexión física exclusivamente caliente (fisicamente
    // implausible para un lavatorio). El inodoroValvula permanece sin
    // ningún terminal AC-alternativo: sigue siendo exclusivamente frío por
    // CRIT-A7, sin relación con CRIT-A15.
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

    // Expected segun CRIT-A13 revisado: computables=[inodoro,lavatorio] ->
    // activos hidraulicos=[lavatorio] (inodoro.quCaliente=0 se excluye) ->
    // CRIT-A8 no encuentra valvula en el conjunto activo -> participa todo
    // el conjunto activo -> n=1, Qmax=0.12 -> CRIT-A4: Qc=Qmax. CRIT-A15 no
    // interviene: el lavatorio tiene conectividad física 'ambas' (twin AF
    // real en n4/t3), así que la rama AC evaluada conserva quCaliente_lps.
    const qcEsperado = 0.12 // quCaliente_lps de 'lavatorio' (conectividad física 'ambas', sin override de CRIT-A15)

    const resultado = resolverHidraulicaDeTramo(proyecto, 't0', catalogoArtefactos)

    if (resultado.tipo !== 'conDemanda') {
      throw new Error('se esperaba conDemanda: la demanda AC del lavatorio no debe desaparecer por el inodoro')
    }
    expect(resultado.qc_lps).toBe(qcEsperado)
    expect(resultado.simultaneidad.qc_lps).toBe(qcEsperado)
    if (!('estado' in resultado.simultaneidad.kc) || !('estado' in resultado.simultaneidad.k)) {
      throw new Error('se esperaban Kc y K indeterminados para n=1')
    }
    expect(resultado.simultaneidad.kc.estado).toBe('indeterminado')
    expect(resultado.simultaneidad.k.estado).toBe('indeterminado')
  })

  it('Golden 4 — montante segmentada: cada segmento resuelve su propio Qc desde su propio conjunto aguas abajo, nunca por suma de Qc parciales', () => {
    // Cadena vertical n0->n1->n2->n3 (cotas 0/3/6/9, geometria ya cerrada
    // CRIT-A20) con una derivacion AF-only a un lavatorio distinto en cada
    // nivel (UF1 en n1, UF2 en n2, UF3 en n3). segmentoA/B/C son Tramos
    // reales independientes -- no existe entidad "Montante" en el modelo
    // (D-delta.23): la montante ES esta cadena de Nodo/Tramo.
    const lavatorioUf1 = artefacto('inst-a1', 'lavatorio')
    const lavatorioUf2 = artefacto('inst-a2', 'lavatorio')
    const lavatorioUf3 = artefacto('inst-a3', 'lavatorio')
    const uf1 = unidadFuncionalCon('uf-1', 'local-1', [lavatorioUf1])
    const uf2 = unidadFuncionalCon('uf-2', 'local-2', [lavatorioUf2])
    const uf3 = unidadFuncionalCon('uf-3', 'local-3', [lavatorioUf3])

    const refUf1 = referenciaDe('uf-1', 'local-1', 'inst-a1')
    const refUf2 = referenciaDe('uf-2', 'local-2', 'inst-a2')
    const refUf3 = referenciaDe('uf-3', 'local-3', 'inst-a3')

    const nodos: Nodo[] = [
      { id: 'n0', cota_m: 0 },
      { id: 'n1', cota_m: 3 },
      { id: 'n2', cota_m: 6 },
      { id: 'n3', cota_m: 9 },
      // Derivaciones sin geometria propia: no hace falta para este caso.
      { id: 'n-grupo1', referencia: refUf1 },
      { id: 'n-grupo2', referencia: refUf2 },
      { id: 'n-grupo3', referencia: refUf3 },
    ]
    const tramos: Tramo[] = [
      { id: 'segmentoA', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF', longitud_m: 3 },
      { id: 'derivacion1', nodoOrigenId: 'n1', nodoDestinoId: 'n-grupo1', red: 'AF' },
      { id: 'segmentoB', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF', longitud_m: 3 },
      { id: 'derivacion2', nodoOrigenId: 'n2', nodoDestinoId: 'n-grupo2', red: 'AF' },
      { id: 'segmentoC', nodoOrigenId: 'n2', nodoDestinoId: 'n3', red: 'AF', longitud_m: 3 },
      { id: 'derivacion3', nodoOrigenId: 'n3', nodoDestinoId: 'n-grupo3', red: 'AF' },
    ]
    const proyecto = proyectoCon('viviendaMultifamiliar', [uf1, uf2, uf3], { nodos, tramos })

    // Geometria (CRIT-A20): el fixture no dispara ningun problema -- ni
    // referencial ni geometrico. No es una segunda bateria de tests
    // geometricos, solo confirma que este fixture puntual es valido.
    expect(validarRedHidraulica(proyecto)).toEqual([])

    const claveDe = (r: { unidadFuncionalId: string; localId: string; artefactoId: string }) =>
      `${r.unidadFuncionalId}::${r.localId}::${r.artefactoId}`

    // Artefactos aguas abajo por identidad completa, no solo por conteo.
    expect(new Set(obtenerArtefactosAguasAbajo(proyecto, 'segmentoA').map(claveDe))).toEqual(
      new Set([refUf1, refUf2, refUf3].map(claveDe)),
    )
    expect(new Set(obtenerArtefactosAguasAbajo(proyecto, 'segmentoB').map(claveDe))).toEqual(
      new Set([refUf2, refUf3].map(claveDe)),
    )
    expect(new Set(obtenerArtefactosAguasAbajo(proyecto, 'segmentoC').map(claveDe))).toEqual(
      new Set([refUf3].map(claveDe)),
    )

    const quEfectivoUnitario = 0.2 // quTotal_lps de 'lavatorio' (CRIT-A15: conectividad soloAF)

    // Segmento C: n=1 -> CRIT-A4, Qc=Qmax, Kc/K indeterminados.
    const resultadoC = resolverHidraulicaDeTramo(proyecto, 'segmentoC', catalogoArtefactos)
    if (resultadoC.tipo !== 'conDemanda') {
      throw new Error('se esperaba conDemanda para segmentoC')
    }
    if (!('estado' in resultadoC.simultaneidad.kc) || !('estado' in resultadoC.simultaneidad.k)) {
      throw new Error('se esperaban Kc y K indeterminados para n=1 en segmentoC')
    }
    expect(resultadoC.simultaneidad.kc.estado).toBe('indeterminado')
    expect(resultadoC.simultaneidad.k.estado).toBe('indeterminado')
    expect(resultadoC.qc_lps).toBe(quEfectivoUnitario) // Qc_C = 0.2

    // Segmento B: n=2, 2 UF participantes -> CRIT-A14 aEfectivo=2.
    const nEsperadoB = 2
    const qmaxEsperadoB = nEsperadoB * quEfectivoUnitario
    const aEfectivoEsperadoB = 2
    const kcEsperadoB = 1 / Math.sqrt(nEsperadoB - 1)
    const kEsperadoB = kcEsperadoB * aEfectivoEsperadoB
    const qcEsperadoB = qmaxEsperadoB * kEsperadoB // = 0.8

    const resultadoB = resolverHidraulicaDeTramo(proyecto, 'segmentoB', catalogoArtefactos)
    if (resultadoB.tipo !== 'conDemanda') {
      throw new Error('se esperaba conDemanda para segmentoB')
    }
    if ('estado' in resultadoB.simultaneidad.kc || 'estado' in resultadoB.simultaneidad.k) {
      throw new Error('se esperaban Kc y K numéricos, no indeterminados, en segmentoB')
    }
    expect(resultadoB.simultaneidad.aEfectivo).toBe(aEfectivoEsperadoB)
    expect(resultadoB.simultaneidad.kc.valor).toBeCloseTo(kcEsperadoB, 10)
    expect(resultadoB.simultaneidad.k.valor).toBeCloseTo(kEsperadoB, 10)
    expect(resultadoB.qc_lps).toBeCloseTo(qcEsperadoB, 10)

    // Segmento A: n=3, 3 UF participantes -> CRIT-A14 aEfectivo=2.
    const nEsperadoA = 3
    const qmaxEsperadoA = nEsperadoA * quEfectivoUnitario
    const aEfectivoEsperadoA = 2
    const kcEsperadoA = 1 / Math.sqrt(nEsperadoA - 1)
    const kEsperadoA = kcEsperadoA * aEfectivoEsperadoA
    const qcEsperadoA = qmaxEsperadoA * kEsperadoA // = 0.6 * sqrt(2) ≈ 0.8485281374238571

    const resultadoA = resolverHidraulicaDeTramo(proyecto, 'segmentoA', catalogoArtefactos)
    if (resultadoA.tipo !== 'conDemanda') {
      throw new Error('se esperaba conDemanda para segmentoA')
    }
    if ('estado' in resultadoA.simultaneidad.kc || 'estado' in resultadoA.simultaneidad.k) {
      throw new Error('se esperaban Kc y K numéricos, no indeterminados, en segmentoA')
    }
    expect(resultadoA.simultaneidad.aEfectivo).toBe(aEfectivoEsperadoA)
    expect(resultadoA.simultaneidad.kc.valor).toBeCloseTo(kcEsperadoA, 10)
    expect(resultadoA.simultaneidad.k.valor).toBeCloseTo(kEsperadoA, 10)
    // Propiedad central del incremento: Qc_A sale de recalcular simultaneidad
    // sobre las 3 UF aguas abajo de segmentoA -- nunca de sumar Qc_B (0.8)
    // con el Qc aislado de UF1 (0.2). Si se sumara, darian 1.0; el valor
    // real con n=3 es menor, porque la simultaneidad no es lineal:
    // Qc_A = Qmax_A * K_A = 0.6 * sqrt(2) ≈ 0.8485281374238571 ≠ 0.8 + 0.2.
    expect(resultadoA.qc_lps).toBeCloseTo(qcEsperadoA, 10)
    expect(resultadoA.qc_lps).toBeCloseTo(0.8485281374238571, 10)
  })
})
