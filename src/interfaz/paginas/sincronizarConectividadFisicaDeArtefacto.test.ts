import { describe, it, expect } from 'vitest'
import type { Artefacto, MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, RedDeTramo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { validarRedHidraulica } from '../../validacion/redHidraulica'
import { auditarCoberturaFisica } from '../../motor/tuberias/cobertura/auditarCoberturaFisica'
import { obtenerArtefactosAguasAbajo } from '../../motor/tuberias/topologia/obtenerArtefactosAguasAbajo'
import { resolverHidraulicaDeTramo } from '../../motor/tuberias/resolverHidraulicaDeTramo'
import { identificarTramosRepresentativosDeLocales } from '../../motor/tuberias/topologia/identificarTramoRepresentativoDeLocal'
import { sincronizarConectividadFisicaDeArtefactoConRedesDeclaradas } from './sincronizarConectividadFisicaDeArtefacto'

// CAT-CONN-01 (D-δ.84): la variante por precedente
// (`sincronizarConectividadFisicaDeArtefacto`) se retiró junto con
// `determinarRedesFisicasPorPrecedente`. Las Redes a conectar ahora salen
// de la política de conectividad del catálogo + `Artefacto.conectividadElegida`
// (ver resolverConectividadInicialDeArtefacto.test.ts). Estos tests siguen
// cubriendo la maquinaria topológica D-δ.49 (bootstrap / retrofit /
// hermano), invocándola con Redes declaradas explícitas -- exactamente
// como lo hace hoy la UI de M1 y `reconciliarConectividadFisicaPorCambioDeArtefacto`.

function metadatos(): MetadatosProyecto {
  return {
    nombre: 'Proyecto M2-D',
    obra: 'Obra',
    comitente: 'Comitente',
    fecha: '2026-01-01',
    schemaVersion: '1.0.0',
    versionNormativa: 'eras-2023',
  }
}

function parametros(): ParametrosProyecto {
  return { tipoDeProyecto: 'viviendaIndividual', presionSobreAcera_m: 0, alturaArtefactoMasDesfavorable_m: 0 }
}

function artefacto(id: string, artefactoId: string): Artefacto {
  return { id, artefactoId, cantidad: 1, origen: 'normativo' }
}

function proyectoCon(unidadesFuncionales: readonly UnidadFuncional[], redHidraulica: RedHidraulica): Proyecto {
  return {
    metadatos: metadatos(),
    parametros: parametros(),
    unidadesFuncionales,
    redHidraulica,
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'detallado', granularidadHidraulica: 'profesional',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

function agregarArtefactoAlLocal(proyecto: Proyecto, localId: string, nuevo: Artefacto): Proyecto {
  return {
    ...proyecto,
    unidadesFuncionales: proyecto.unidadesFuncionales.map((uf) => ({
      ...uf,
      locales: uf.locales.map((l) => (l.id === localId ? { ...l, artefactos: [...l.artefactos, nuevo] } : l)),
    })),
  }
}

function sincronizar(
  proyecto: Proyecto,
  localId: string,
  artefactoInstanciaId: string,
  redes: readonly RedDeTramo[],
) {
  return sincronizarConectividadFisicaDeArtefactoConRedesDeclaradas(
    proyecto,
    'uf-1',
    localId,
    artefactoInstanciaId,
    redes,
  )
}

// Miniatura del patron real del demo: Baño con lavatorio (AF+AC) ya
// conectado via bifurcacion (n-af-1/n-ac-1), y Patio con canilla (soloAF)
// conectado directo desde n-0 (sin bifurcacion). Reproduce ambos casos
// limite (>=2 y ==1 artefacto previo) sobre una topologia minima.
function proyectoBase(): Proyecto {
  const uf: UnidadFuncional = {
    id: 'uf-1',
    nombre: 'uf-1',
    locales: [
      { id: 'local-bano', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto('art-lavatorio', 'lavatorio')] },
      { id: 'local-patio', tipo: 'jardin', regimen: 'domiciliario', artefactos: [artefacto('art-canilla', 'canillaDeServicio')] },
      { id: 'local-vacio', tipo: 'otros', regimen: 'domiciliario', artefactos: [] },
    ],
  }
  const nodos: Nodo[] = [
    { id: 'n-general' },
    { id: 'n0' },
    { id: 'n-acs', referencia: { tipo: 'produccionACS' } },
    {
      id: 'n-af-lavatorio',
      referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'art-lavatorio' },
    },
    {
      id: 'n-ac-lavatorio',
      referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'art-lavatorio' },
    },
    {
      id: 'n-canilla',
      referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-patio', artefactoId: 'art-canilla' },
    },
  ]
  const tramos: Tramo[] = [
    { id: 't-general', nodoOrigenId: 'n-general', nodoDestinoId: 'n0', red: 'AF' },
    { id: 't-af-acs', nodoOrigenId: 'n0', nodoDestinoId: 'n-acs', red: 'AF' },
    { id: 't-af-lavatorio', nodoOrigenId: 'n0', nodoDestinoId: 'n-af-lavatorio', red: 'AF', longitud_m: 3, accesorios: [{ tipo: 'codo90', cantidad: 1 }] },
    { id: 't-ac-lavatorio', nodoOrigenId: 'n-acs', nodoDestinoId: 'n-ac-lavatorio', red: 'AC' },
    { id: 't-af-canilla', nodoOrigenId: 'n0', nodoDestinoId: 'n-canilla', red: 'AF' },
  ]
  return proyectoCon([uf], { nodos, tramos })
}

describe('sincronizarConectividadFisicaDeArtefactoConRedesDeclaradas', () => {
  it('D-δ.49: AF-only, segundo terminal del mismo Local -- RETROFIT (el único terminal previo colgaba directo de n0, sin bifurcación propia)', () => {
    const proyecto = agregarArtefactoAlLocal(proyectoBase(), 'local-patio', artefacto('art-canilla-2', 'canillaDeServicio'))

    const resultado = sincronizar(proyecto, 'local-patio', 'art-canilla-2', ['AF'])

    expect(resultado.tipo).toBe('sincronizado')
    if (resultado.tipo !== 'sincronizado') return
    expect(resultado.redesConectadas).toEqual(['AF'])
    expect(resultado.redesPendientes).toEqual([])
    expect(validarRedHidraulica(resultado.proyecto)).toEqual([])

    const redHidraulica = resultado.proyecto.redHidraulica!
    const nuevoNodo = redHidraulica.nodos.find(
      (n) =>
        n.referencia?.tipo === 'artefacto' &&
        n.referencia.unidadFuncionalId === 'uf-1' &&
        n.referencia.localId === 'local-patio' &&
        n.referencia.artefactoId === 'art-canilla-2',
    )
    expect(nuevoNodo).toBeDefined()
    const nuevoTramo = redHidraulica.tramos.find((t) => t.nodoDestinoId === nuevoNodo!.id)!
    // NO cuelga directo de n0 (eso dejaría dos Tramos "puros" de local-patio
    // colgando de la raíz compartida, D-δ.44) -- cuelga de una bifurcación
    // nueva, dedicada exclusivamente a este Local.
    expect(nuevoTramo.nodoOrigenId).not.toBe('n0')

    const bifurcacionId = nuevoTramo.nodoOrigenId
    const tramoDesdeRaiz = redHidraulica.tramos.find((t) => t.nodoDestinoId === bifurcacionId)!
    expect(tramoDesdeRaiz.nodoOrigenId).toBe('n0')

    // El Tramo original (n0 -> canilla original) se reengancha a la nueva
    // bifurcación, preservando su identidad (mismo id) -- nunca se recrea.
    const tramoOriginalReenganchado = redHidraulica.tramos.find((t) => t.id === 't-af-canilla')!
    expect(tramoOriginalReenganchado.nodoOrigenId).toBe(bifurcacionId)

    // Exactamente un Tramo representativo para (uf-1, local-patio, AF):
    // ambos terminales (original y nuevo) cuelgan de la MISMA bifurcación.
    const tramosHaciaLaBifurcacion = redHidraulica.tramos.filter((t) => t.nodoOrigenId === bifurcacionId)
    expect(tramosHaciaLaBifurcacion).toHaveLength(2)
  })

  it('D-δ.49: mixto, segundo lavatorio -- RETROFIT en AMBAS Redes (el primer lavatorio colgaba directo de n0/n-acs)', () => {
    const proyecto = agregarArtefactoAlLocal(proyectoBase(), 'local-bano', artefacto('art-lavatorio-2', 'lavatorio'))

    const resultado = sincronizar(proyecto, 'local-bano', 'art-lavatorio-2', ['AF', 'AC'])

    expect(resultado.tipo).toBe('sincronizado')
    if (resultado.tipo !== 'sincronizado') return
    expect([...resultado.redesConectadas].sort()).toEqual(['AC', 'AF'])
    expect(resultado.redesPendientes).toEqual([])
    expect(validarRedHidraulica(resultado.proyecto)).toEqual([])

    const redHidraulica = resultado.proyecto.redHidraulica!
    const referenciaEsperada = {
      tipo: 'artefacto' as const,
      unidadFuncionalId: 'uf-1',
      localId: 'local-bano',
      artefactoId: 'art-lavatorio-2',
    }
    const nodosNuevos = redHidraulica.nodos.filter(
      (n) => JSON.stringify(n.referencia) === JSON.stringify(referenciaEsperada),
    )
    expect(nodosNuevos).toHaveLength(2) // uno AF, uno AC

    const tramosDeEsosNodos = redHidraulica.tramos.filter((t) => nodosNuevos.some((n) => n.id === t.nodoDestinoId))
    const tramoNuevoAF = tramosDeEsosNodos.find((t) => t.red === 'AF')!
    const tramoNuevoAC = tramosDeEsosNodos.find((t) => t.red === 'AC')!
    expect(tramoNuevoAF.nodoOrigenId).not.toBe('n0')
    expect(tramoNuevoAC.nodoOrigenId).not.toBe('n-acs')

    // El lavatorio original se reengancha a esas bifurcaciones nuevas -- su
    // longitud_m/accesorios ya cargados viajan al Tramo NUEVO (raíz ->
    // bifurcación), que pasa a ser el representativo.
    const tramoAfOriginal = redHidraulica.tramos.find((t) => t.id === 't-af-lavatorio')!
    expect(tramoAfOriginal.nodoOrigenId).toBe(tramoNuevoAF.nodoOrigenId)
    expect(tramoAfOriginal.longitud_m).toBeUndefined()
    expect(tramoAfOriginal.accesorios).toBeUndefined()

    const tramoTroncalAF = redHidraulica.tramos.find((t) => t.nodoDestinoId === tramoNuevoAF.nodoOrigenId)!
    expect(tramoTroncalAF.longitud_m).toBe(3)
    expect(tramoTroncalAF.accesorios).toEqual([{ tipo: 'codo90', cantidad: 1 }])

    const tramoAcOriginal = redHidraulica.tramos.find((t) => t.id === 't-ac-lavatorio')!
    expect(tramoAcOriginal.nodoOrigenId).toBe(tramoNuevoAC.nodoOrigenId)
  })

  it('D-δ.49 (regresión real, Playwright): la longitud ya cargada en granularidad simplificada NO desaparece de EstadoModulo2 al agregar el segundo terminal', () => {
    const proyecto = agregarArtefactoAlLocal(proyectoBase(), 'local-bano', artefacto('art-lavatorio-2', 'lavatorio'))

    const resultado = sincronizar(proyecto, 'local-bano', 'art-lavatorio-2', ['AF', 'AC'])
    expect(resultado.tipo).toBe('sincronizado')
    if (resultado.tipo !== 'sincronizado') return

    const representativos = identificarTramosRepresentativosDeLocales(resultado.proyecto)
    const tramoRepresentativoAF = [...representativos.entries()].find(
      ([tramoId, identidad]) =>
        identidad.localId === 'local-bano' && resultado.proyecto.redHidraulica!.tramos.find((t) => t.id === tramoId)?.red === 'AF',
    )
    expect(tramoRepresentativoAF).toBeDefined()
    const [tramoRepresentativoIdAF] = tramoRepresentativoAF!
    const tramo = resultado.proyecto.redHidraulica!.tramos.find((t) => t.id === tramoRepresentativoIdAF)!
    expect(tramo.longitud_m).toBe(3)
  })

  // M2-TOPO-B (§12/§38): corrección del gap registrado en D-δ.91 -- el
  // retrofit migraba longitud_m/accesorios al Tramo troncal nuevo pero NO
  // el override manual dnComercialAdoptado (D-δ.52), dejándolo anclado al
  // segmento degradado a ramal, donde ya no describe el diámetro que el
  // usuario dimensionó. Ahora las tres propiedades físicas representativas
  // viajan juntas.
  function proyectoConCanillaDimensionada(overrides: Partial<Tramo>): Proyecto {
    const base = proyectoBase()
    return {
      ...base,
      redHidraulica: {
        ...base.redHidraulica!,
        tramos: base.redHidraulica!.tramos.map((t) =>
          t.id === 't-af-canilla' ? { ...t, ...overrides } : t,
        ),
      },
    }
  }

  it('D-δ.49 / M2-TOPO-B: el retrofit migra dnComercialAdoptado junto con longitud_m y accesorios al Tramo troncal nuevo; el ramal degradado no retiene ninguna de las tres', () => {
    const proyecto = agregarArtefactoAlLocal(
      proyectoConCanillaDimensionada({
        longitud_m: 4,
        accesorios: [{ tipo: 'curva90', cantidad: 2 }],
        dnComercialAdoptado: '32 mm',
      }),
      'local-patio',
      artefacto('art-canilla-2', 'canillaDeServicio'),
    )

    const resultado = sincronizar(proyecto, 'local-patio', 'art-canilla-2', ['AF'])
    expect(resultado.tipo).toBe('sincronizado')
    if (resultado.tipo !== 'sincronizado') return
    expect(validarRedHidraulica(resultado.proyecto)).toEqual([])

    const redHidraulica = resultado.proyecto.redHidraulica!

    // Ramal degradado: el Tramo original reenganchado a la bifurcación
    // nueva -- sin ninguna de las propiedades representativas.
    const ramal = redHidraulica.tramos.find((t) => t.id === 't-af-canilla')!
    expect(ramal.nodoOrigenId).not.toBe('n0')
    expect(ramal.longitud_m).toBeUndefined()
    expect(ramal.accesorios).toBeUndefined()
    expect(ramal.dnComercialAdoptado).toBeUndefined()

    // Tramo troncal nuevo (n0 -> bifurcación): hereda las tres.
    const troncal = redHidraulica.tramos.find((t) => t.nodoOrigenId === 'n0' && t.nodoDestinoId === ramal.nodoOrigenId)!
    expect(troncal.longitud_m).toBe(4)
    expect(troncal.accesorios).toEqual([{ tipo: 'curva90', cantidad: 2 }])
    expect(troncal.dnComercialAdoptado).toBe('32 mm')

    // Exactamente un representativo AF para (uf-1, local-patio), y es el
    // troncal que lleva el override.
    const representativos = identificarTramosRepresentativosDeLocales(resultado.proyecto)
    const repsPatioAF = [...representativos.entries()].filter(
      ([tramoId, identidad]) =>
        identidad.localId === 'local-patio' &&
        redHidraulica.tramos.find((t) => t.id === tramoId)?.red === 'AF',
    )
    expect(repsPatioAF).toHaveLength(1)
    expect(repsPatioAF[0]![0]).toBe(troncal.id)
  })

  it('M2-TOPO-C: la procedencia de la longitud viaja al troncal; el ramal degradado no la retiene', () => {
    const proyecto = agregarArtefactoAlLocal(
      proyectoConCanillaDimensionada({ longitud_m: 4, longitudEsSugerida: true }),
      'local-patio',
      artefacto('art-canilla-2', 'canillaDeServicio'),
    )
    const resultado = sincronizar(proyecto, 'local-patio', 'art-canilla-2', ['AF'])
    if (resultado.tipo !== 'sincronizado') throw new Error('se esperaba sincronizado')
    const redHidraulica = resultado.proyecto.redHidraulica!
    const ramal = redHidraulica.tramos.find((t) => t.id === 't-af-canilla')!
    const troncal = redHidraulica.tramos.find((t) => t.nodoOrigenId === 'n0' && t.nodoDestinoId === ramal.nodoOrigenId)!
    expect(troncal.longitud_m).toBe(4)
    expect(troncal.longitudEsSugerida).toBe(true)
    expect('longitudEsSugerida' in (ramal as object)).toBe(false)
  })

  it('M2-TOPO-C: una longitud personalizada (sin flag) no gana un flag de sugerida al migrar', () => {
    const proyecto = agregarArtefactoAlLocal(
      proyectoConCanillaDimensionada({ longitud_m: 7.3 }),
      'local-patio',
      artefacto('art-canilla-2', 'canillaDeServicio'),
    )
    const resultado = sincronizar(proyecto, 'local-patio', 'art-canilla-2', ['AF'])
    if (resultado.tipo !== 'sincronizado') throw new Error('se esperaba sincronizado')
    const redHidraulica = resultado.proyecto.redHidraulica!
    const ramal = redHidraulica.tramos.find((t) => t.id === 't-af-canilla')!
    const troncal = redHidraulica.tramos.find((t) => t.nodoOrigenId === 'n0' && t.nodoDestinoId === ramal.nodoOrigenId)!
    expect(troncal.longitud_m).toBe(7.3)
    expect('longitudEsSugerida' in (troncal as object)).toBe(false)
  })

  it('D-δ.49 / M2-TOPO-B: si el Tramo original no tiene override de DN, el retrofit no inventa uno en el troncal', () => {
    const proyecto = agregarArtefactoAlLocal(
      proyectoConCanillaDimensionada({ longitud_m: 4 }),
      'local-patio',
      artefacto('art-canilla-2', 'canillaDeServicio'),
    )

    const resultado = sincronizar(proyecto, 'local-patio', 'art-canilla-2', ['AF'])
    expect(resultado.tipo).toBe('sincronizado')
    if (resultado.tipo !== 'sincronizado') return

    const redHidraulica = resultado.proyecto.redHidraulica!
    const ramal = redHidraulica.tramos.find((t) => t.id === 't-af-canilla')!
    const troncal = redHidraulica.tramos.find((t) => t.nodoOrigenId === 'n0' && t.nodoDestinoId === ramal.nodoOrigenId)!
    expect(troncal.longitud_m).toBe(4)
    expect('dnComercialAdoptado' in troncal).toBe(false)
  })

  it('Local con patron de bifurcacion ya existente: el nuevo terminal cuelga del mismo nodo de bifurcacion', () => {
    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'uf-1',
      locales: [
        {
          id: 'local-bano',
          tipo: 'bano',
          regimen: 'domiciliario',
          artefactos: [artefacto('a1', 'lavatorio'), artefacto('a2', 'lavatorio')],
        },
      ],
    }
    const nodos: Nodo[] = [
      { id: 'n-general' },
      { id: 'n0' },
      { id: 'n-af-bano-1' },
      { id: 'n-a1', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'a1' } },
      { id: 'n-a2', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'a2' } },
    ]
    const tramos: Tramo[] = [
      { id: 't-general', nodoOrigenId: 'n-general', nodoDestinoId: 'n0', red: 'AF' },
      { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n-af-bano-1', red: 'AF' },
      { id: 't1', nodoOrigenId: 'n-af-bano-1', nodoDestinoId: 'n-a1', red: 'AF' },
      { id: 't2', nodoOrigenId: 'n-af-bano-1', nodoDestinoId: 'n-a2', red: 'AF' },
    ]
    const proyecto = agregarArtefactoAlLocal(proyectoCon([uf], { nodos, tramos }), 'local-bano', artefacto('a3', 'lavatorio'))

    const resultado = sincronizar(proyecto, 'local-bano', 'a3', ['AF'])

    expect(resultado.tipo).toBe('sincronizado')
    if (resultado.tipo !== 'sincronizado') return
    expect(resultado.redesConectadas).toEqual(['AF'])

    const nuevoNodo = resultado.proyecto.redHidraulica!.nodos.find(
      (n) =>
        n.referencia?.tipo === 'artefacto' &&
        n.referencia.unidadFuncionalId === 'uf-1' &&
        n.referencia.localId === 'local-bano' &&
        n.referencia.artefactoId === 'a3',
    )
    const nuevoTramo = resultado.proyecto.redHidraulica!.tramos.find((t) => t.nodoDestinoId === nuevoNodo!.id)
    expect(nuevoTramo?.nodoOrigenId).toBe('n-af-bano-1')
  })

  it('cobertura: auditarCoberturaFisica deja de reportar pendiente tras sincronizar', () => {
    const proyecto = agregarArtefactoAlLocal(proyectoBase(), 'local-patio', artefacto('art-canilla-2', 'canillaDeServicio'))
    expect(auditarCoberturaFisica(proyecto).completa).toBe(false)

    const resultado = sincronizar(proyecto, 'local-patio', 'art-canilla-2', ['AF'])
    if (resultado.tipo !== 'sincronizado') throw new Error('se esperaba sincronizado')

    expect(auditarCoberturaFisica(resultado.proyecto).completa).toBe(true)
  })

  it('hidraulica: el nuevo artefacto participa realmente en el calculo aguas abajo (no solo desaparece el aviso)', () => {
    const proyecto = agregarArtefactoAlLocal(proyectoBase(), 'local-patio', artefacto('art-canilla-2', 'canillaDeServicio'))
    const resultado = sincronizar(proyecto, 'local-patio', 'art-canilla-2', ['AF'])
    if (resultado.tipo !== 'sincronizado') throw new Error('se esperaba sincronizado')

    const referenciasAguasAbajo = obtenerArtefactosAguasAbajo(resultado.proyecto, 't-general')
    expect(referenciasAguasAbajo).toContainEqual({
      tipo: 'artefacto',
      unidadFuncionalId: 'uf-1',
      localId: 'local-patio',
      artefactoId: 'art-canilla-2',
    })

    const hidraulica = resolverHidraulicaDeTramo(resultado.proyecto, 't-general', catalogoArtefactos)
    if (hidraulica.tipo !== 'conDemanda') throw new Error('se esperaba conDemanda')
    expect(hidraulica.simultaneidad.n).toBe(3)
  })

  it('preservacion: NO modifica longitud_m/accesorios de un Tramo existente no relacionado', () => {
    const proyecto = agregarArtefactoAlLocal(proyectoBase(), 'local-patio', artefacto('art-canilla-2', 'canillaDeServicio'))
    const resultado = sincronizar(proyecto, 'local-patio', 'art-canilla-2', ['AF'])
    if (resultado.tipo !== 'sincronizado') throw new Error('se esperaba sincronizado')

    const tramoOriginal = resultado.proyecto.redHidraulica!.tramos.find((t) => t.id === 't-af-lavatorio')
    expect(tramoOriginal).toEqual({
      id: 't-af-lavatorio',
      nodoOrigenId: 'n0',
      nodoDestinoId: 'n-af-lavatorio',
      red: 'AF',
      longitud_m: 3,
      accesorios: [{ tipo: 'codo90', cantidad: 1 }],
    })
    expect(resultado.proyecto.redHidraulica!.nodos.length).toBeGreaterThanOrEqual(proyecto.redHidraulica!.nodos.length)
    for (const nodoOriginal of proyecto.redHidraulica!.nodos) {
      expect(resultado.proyecto.redHidraulica!.nodos).toContainEqual(nodoOriginal)
    }
  })

  it('D-δ.49: Local sin ninguna conexion previa -- BOOTSTRAP, conecta directo a la raiz AF existente (nunca redesPendientes)', () => {
    const proyecto = agregarArtefactoAlLocal(proyectoBase(), 'local-vacio', artefacto('art-canilla-3', 'canillaDeServicio'))

    const resultado = sincronizar(proyecto, 'local-vacio', 'art-canilla-3', ['AF'])

    expect(resultado.tipo).toBe('sincronizado')
    if (resultado.tipo !== 'sincronizado') return
    expect(resultado.redesConectadas).toEqual(['AF'])
    expect(resultado.redesPendientes).toEqual([])
    expect(validarRedHidraulica(resultado.proyecto)).toEqual([])

    const nuevoNodo = resultado.proyecto.redHidraulica!.nodos.find(
      (n) =>
        n.referencia?.tipo === 'artefacto' &&
        n.referencia.unidadFuncionalId === 'uf-1' &&
        n.referencia.localId === 'local-vacio' &&
        n.referencia.artefactoId === 'art-canilla-3',
    )
    expect(nuevoNodo).toBeDefined()
    const nuevoTramo = resultado.proyecto.redHidraulica!.tramos.find((t) => t.nodoDestinoId === nuevoNodo!.id)
    expect(nuevoTramo?.nodoOrigenId).toBe('n0')
    expect(nuevoTramo?.red).toBe('AF')
  })

  it('D-δ.49 T2: primer terminal AF+AC de un proyecto COMPLETAMENTE VACÍO (sin redHidraulica todavía) -- bootstrap de AF y AC desde cero, incluida la raíz', () => {
    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'uf-1',
      locales: [{ id: 'local-bano', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto('a-1', 'lavatorio')] }],
    }
    const proyecto = proyectoCon([uf], { nodos: [], tramos: [] })

    const resultado = sincronizar(proyecto, 'local-bano', 'a-1', ['AF', 'AC'])

    expect(resultado.tipo).toBe('sincronizado')
    if (resultado.tipo !== 'sincronizado') return
    expect([...resultado.redesConectadas].sort()).toEqual(['AC', 'AF'])
    expect(resultado.redesPendientes).toEqual([])
    expect(validarRedHidraulica(resultado.proyecto)).toEqual([])

    const redHidraulica = resultado.proyecto.redHidraulica!
    const referencia = { tipo: 'artefacto' as const, unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'a-1' }
    const terminales = redHidraulica.nodos.filter((n) => JSON.stringify(n.referencia) === JSON.stringify(referencia))
    expect(terminales).toHaveLength(2)

    const nodoAcs = redHidraulica.nodos.find((n) => n.referencia?.tipo === 'produccionACS')
    expect(nodoAcs).toBeDefined()
    const idsConEntrante = new Set(redHidraulica.tramos.map((t) => t.nodoDestinoId))
    const tramoGeneral = redHidraulica.tramos.find((t) => !idsConEntrante.has(t.nodoOrigenId))
    expect(tramoGeneral).toBeDefined()
  })

  it('D-δ.49 T3: Local con AF ya conectado (inodoro AF-only) y SIN AC -- agregar un Lavatorio AF+AC expande AF (hermano) y bootstrapea AC', () => {
    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'uf-1',
      locales: [
        {
          id: 'local-bano',
          tipo: 'bano',
          regimen: 'domiciliario',
          artefactos: [artefacto('a-inodoro', 'inodoroDeposito'), artefacto('a-lavatorio', 'lavatorio')],
        },
      ],
    }
    const nodos: Nodo[] = [
      { id: 'n-general' },
      { id: 'n0' },
      {
        id: 'n-af-inodoro',
        referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'a-inodoro' },
      },
    ]
    const tramos: Tramo[] = [
      { id: 't-general', nodoOrigenId: 'n-general', nodoDestinoId: 'n0', red: 'AF' },
      { id: 't-af-inodoro', nodoOrigenId: 'n0', nodoDestinoId: 'n-af-inodoro', red: 'AF' },
    ]
    const proyecto = proyectoCon([uf], { nodos, tramos })

    const resultado = sincronizar(proyecto, 'local-bano', 'a-lavatorio', ['AF', 'AC'])

    expect(resultado.tipo).toBe('sincronizado')
    if (resultado.tipo !== 'sincronizado') return
    expect([...resultado.redesConectadas].sort()).toEqual(['AC', 'AF'])
    expect(validarRedHidraulica(resultado.proyecto)).toEqual([])

    const redHidraulica = resultado.proyecto.redHidraulica!
    const referenciaLavatorio = { tipo: 'artefacto' as const, unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'a-lavatorio' }
    const terminalAF = redHidraulica.nodos.find(
      (n) => JSON.stringify(n.referencia) === JSON.stringify(referenciaLavatorio) && redHidraulica.tramos.some((t) => t.nodoDestinoId === n.id && t.red === 'AF'),
    )!
    const tramoAF = redHidraulica.tramos.find((t) => t.nodoDestinoId === terminalAF.id)!
    expect(tramoAF.nodoOrigenId).not.toBe('n0')
    const tramoInodoroReenganchado = redHidraulica.tramos.find((t) => t.id === 't-af-inodoro')!
    expect(tramoInodoroReenganchado.nodoOrigenId).toBe(tramoAF.nodoOrigenId)

    const nodoAcs = redHidraulica.nodos.find((n) => n.referencia?.tipo === 'produccionACS')!
    const tramoHaciaAcs = redHidraulica.tramos.find((t) => t.nodoDestinoId === nodoAcs.id)!
    expect(tramoHaciaAcs.nodoOrigenId).toBe('n0')
    const terminalAC = redHidraulica.nodos.find(
      (n) => JSON.stringify(n.referencia) === JSON.stringify(referenciaLavatorio) && n.id !== terminalAF.id,
    )!
    const tramoAC = redHidraulica.tramos.find((t) => t.nodoDestinoId === terminalAC.id)!
    expect(tramoAC.nodoOrigenId).toBe(nodoAcs.id)
  })

  it('D-δ.49 T4: Local con AF y AC YA dedicados (bifurcación propia en ambas) -- agregar un tercer AF+AC expande ambas sin crear segundas cabeceras', () => {
    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'uf-1',
      locales: [
        { id: 'local-bano', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto('a1', 'lavatorio'), artefacto('a2', 'receptaculoDucha')] },
      ],
    }
    const nodos: Nodo[] = [
      { id: 'n-general' },
      { id: 'n0' },
      { id: 'n-acs', referencia: { tipo: 'produccionACS' } },
      { id: 'n-af-bif' },
      { id: 'n-ac-bif' },
      { id: 'n-af-a1', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'a1' } },
      { id: 'n-ac-a1', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'a1' } },
      { id: 'n-af-a2', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'a2' } },
      { id: 'n-ac-a2', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'a2' } },
    ]
    const tramos: Tramo[] = [
      { id: 't-general', nodoOrigenId: 'n-general', nodoDestinoId: 'n0', red: 'AF' },
      { id: 't-af-acs', nodoOrigenId: 'n0', nodoDestinoId: 'n-acs', red: 'AF' },
      { id: 't-af-bif', nodoOrigenId: 'n0', nodoDestinoId: 'n-af-bif', red: 'AF' },
      { id: 't-ac-bif', nodoOrigenId: 'n-acs', nodoDestinoId: 'n-ac-bif', red: 'AC' },
      { id: 't-af-a1', nodoOrigenId: 'n-af-bif', nodoDestinoId: 'n-af-a1', red: 'AF' },
      { id: 't-ac-a1', nodoOrigenId: 'n-ac-bif', nodoDestinoId: 'n-ac-a1', red: 'AC' },
      { id: 't-af-a2', nodoOrigenId: 'n-af-bif', nodoDestinoId: 'n-af-a2', red: 'AF' },
      { id: 't-ac-a2', nodoOrigenId: 'n-ac-bif', nodoDestinoId: 'n-ac-a2', red: 'AC' },
    ]
    const proyecto = agregarArtefactoAlLocal(proyectoCon([uf], { nodos, tramos }), 'local-bano', artefacto('a3', 'lavatorio'))

    const resultado = sincronizar(proyecto, 'local-bano', 'a3', ['AF', 'AC'])

    expect(resultado.tipo).toBe('sincronizado')
    if (resultado.tipo !== 'sincronizado') return
    expect([...resultado.redesConectadas].sort()).toEqual(['AC', 'AF'])
    expect(validarRedHidraulica(resultado.proyecto)).toEqual([])

    const redHidraulica = resultado.proyecto.redHidraulica!
    for (const tramoOriginal of tramos) {
      expect(redHidraulica.tramos.find((t) => t.id === tramoOriginal.id)).toEqual(tramoOriginal)
    }
    const referenciaA3 = { tipo: 'artefacto' as const, unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'a3' }
    const nuevosTerminales = redHidraulica.nodos.filter((n) => JSON.stringify(n.referencia) === JSON.stringify(referenciaA3))
    expect(nuevosTerminales).toHaveLength(2)
    const nuevosTramos = redHidraulica.tramos.filter((t) => nuevosTerminales.some((n) => n.id === t.nodoDestinoId))
    expect(nuevosTramos.find((t) => t.red === 'AF')?.nodoOrigenId).toBe('n-af-bif')
    expect(nuevosTramos.find((t) => t.red === 'AC')?.nodoOrigenId).toBe('n-ac-bif')
    expect(redHidraulica.nodos).toHaveLength(nodos.length + 2)
  })

  it('D-δ.49 T11: sincronización repetida sobre el MISMO artefacto tras un bootstrap -- idempotente, no duplica nada', () => {
    const proyecto = agregarArtefactoAlLocal(proyectoBase(), 'local-vacio', artefacto('art-canilla-3', 'canillaDeServicio'))

    const primeraVez = sincronizar(proyecto, 'local-vacio', 'art-canilla-3', ['AF'])
    expect(primeraVez.tipo).toBe('sincronizado')
    if (primeraVez.tipo !== 'sincronizado') return

    const segundaVez = sincronizar(primeraVez.proyecto, 'local-vacio', 'art-canilla-3', ['AF'])
    expect(segundaVez.tipo).toBe('sincronizado')
    if (segundaVez.tipo !== 'sincronizado') return

    expect(segundaVez.redesConectadas).toEqual(['AF'])
    expect(segundaVez.redesPendientes).toEqual([])
    expect(segundaVez.proyecto).toBe(primeraVez.proyecto)
  })

  it('D-δ.49 T11: sincronización repetida tras un RETROFIT -- idempotente, no vuelve a reenganchar ni duplica la bifurcación', () => {
    const proyecto = agregarArtefactoAlLocal(proyectoBase(), 'local-patio', artefacto('art-canilla-2', 'canillaDeServicio'))

    const primeraVez = sincronizar(proyecto, 'local-patio', 'art-canilla-2', ['AF'])
    expect(primeraVez.tipo).toBe('sincronizado')
    if (primeraVez.tipo !== 'sincronizado') return
    expect(validarRedHidraulica(primeraVez.proyecto)).toEqual([])

    const repetirOriginal = sincronizar(primeraVez.proyecto, 'local-patio', 'art-canilla', ['AF'])
    const repetirNuevo = sincronizar(primeraVez.proyecto, 'local-patio', 'art-canilla-2', ['AF'])
    expect(repetirOriginal.tipo).toBe('sincronizado')
    expect(repetirNuevo.tipo).toBe('sincronizado')
    if (repetirOriginal.tipo !== 'sincronizado' || repetirNuevo.tipo !== 'sincronizado') return
    expect(repetirOriginal.proyecto).toBe(primeraVez.proyecto)
    expect(repetirNuevo.proyecto).toBe(primeraVez.proyecto)
  })

  it('primera instancia de un artefactoId, declarada AF -- RETROFIT (local-bano ya tenía un lavatorio directo de n0)', () => {
    const proyecto = agregarArtefactoAlLocal(proyectoBase(), 'local-bano', artefacto('art-inodoro-valvula', 'inodoroValvula'))

    const resultado = sincronizar(proyecto, 'local-bano', 'art-inodoro-valvula', ['AF'])

    expect(resultado.tipo).toBe('sincronizado')
    if (resultado.tipo !== 'sincronizado') return
    expect(resultado.redesConectadas).toEqual(['AF'])
    expect(resultado.redesPendientes).toEqual([])
    expect(validarRedHidraulica(resultado.proyecto)).toEqual([])

    const nuevoNodo = resultado.proyecto.redHidraulica!.nodos.find(
      (n) =>
        n.referencia?.tipo === 'artefacto' &&
        n.referencia.unidadFuncionalId === 'uf-1' &&
        n.referencia.localId === 'local-bano' &&
        n.referencia.artefactoId === 'art-inodoro-valvula',
    )
    expect(nuevoNodo).toBeDefined()
    const nuevoTramo = resultado.proyecto.redHidraulica!.tramos.find((t) => t.nodoDestinoId === nuevoNodo!.id)
    expect(nuevoTramo?.red).toBe('AF')
    expect(nuevoTramo?.nodoOrigenId).not.toBe('n0')
    const tramoLavatorioReenganchado = resultado.proyecto.redHidraulica!.tramos.find((t) => t.id === 't-af-lavatorio')
    expect(tramoLavatorioReenganchado?.nodoOrigenId).toBe(nuevoTramo?.nodoOrigenId)

    expect(auditarCoberturaFisica(resultado.proyecto).completa).toBe(true)

    const referenciasAguasAbajo = obtenerArtefactosAguasAbajo(resultado.proyecto, 't-general')
    expect(referenciasAguasAbajo).toContainEqual({
      tipo: 'artefacto',
      unidadFuncionalId: 'uf-1',
      localId: 'local-bano',
      artefactoId: 'art-inodoro-valvula',
    })

    const hidraulica = resolverHidraulicaDeTramo(resultado.proyecto, 't-general', catalogoArtefactos)
    if (hidraulica.tipo !== 'conDemanda') throw new Error('se esperaba conDemanda')
    // CRIT-A8: local-bano paso a tener un artefacto con
    // limpiezaConValvulaAutomatica en un Local domiciliario -- ese
    // subconjunto participa de n. n = inodoroValvula (local-bano) + canilla
    // (local-patio).
    expect(hidraulica.simultaneidad.n).toBe(2)
  })

  it('declarada AF+AC: crea dos terminales referenciando la misma instancia', () => {
    const proyecto = agregarArtefactoAlLocal(proyectoBase(), 'local-bano', artefacto('art-pileta', 'piletaDeCocina'))

    const resultado = sincronizar(proyecto, 'local-bano', 'art-pileta', ['AF', 'AC'])

    expect(resultado.tipo).toBe('sincronizado')
    if (resultado.tipo !== 'sincronizado') return
    expect([...resultado.redesConectadas].sort()).toEqual(['AC', 'AF'])
    expect(validarRedHidraulica(resultado.proyecto)).toEqual([])

    const referenciaEsperada = {
      tipo: 'artefacto' as const,
      unidadFuncionalId: 'uf-1',
      localId: 'local-bano',
      artefactoId: 'art-pileta',
    }
    const nodosNuevos = resultado.proyecto.redHidraulica!.nodos.filter(
      (n) => JSON.stringify(n.referencia) === JSON.stringify(referenciaEsperada),
    )
    expect(nodosNuevos).toHaveLength(2)
  })

  it('D-δ.49: Local sin ninguna conexion previa, redes declaradas -- BOOTSTRAP (nunca redesPendientes)', () => {
    const proyecto = agregarArtefactoAlLocal(proyectoBase(), 'local-vacio', artefacto('art-canilla-nueva', 'inodoroValvula'))

    const resultado = sincronizar(proyecto, 'local-vacio', 'art-canilla-nueva', ['AF'])

    expect(resultado.tipo).toBe('sincronizado')
    if (resultado.tipo !== 'sincronizado') return
    expect(resultado.redesConectadas).toEqual(['AF'])
    expect(resultado.redesPendientes).toEqual([])
    expect(validarRedHidraulica(resultado.proyecto)).toEqual([])
  })

  it('idempotencia: si el artefacto ya tiene terminal en todas las Redes necesarias, no crea uno duplicado', () => {
    const proyecto = proyectoBase() // art-lavatorio ya tiene AF y AC

    const resultado = sincronizar(proyecto, 'local-bano', 'art-lavatorio', ['AF', 'AC'])

    expect(resultado.tipo).toBe('sincronizado')
    if (resultado.tipo !== 'sincronizado') return
    expect([...resultado.redesConectadas].sort()).toEqual(['AC', 'AF'])
    expect(resultado.redesPendientes).toEqual([])
    expect(resultado.proyecto).toBe(proyecto)
  })

  it('proyecto sin redHidraulica: sinRedHidraulica', () => {
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'uf-1', locales: [{ id: 'l-1', tipo: 'bano', artefactos: [artefacto('a-1', 'inodoroValvula')] }] }
    const proyecto: Proyecto = {
      metadatos: metadatos(),
      parametros: parametros(),
      unidadesFuncionales: [uf],
      configuracionHidraulica: { metodoPerdidaDistribuida: 'hazenWilliams', metodoPerdidaLocalizada: 'detallado', granularidadHidraulica: 'profesional', materialTuberiaId: 'ppr', sistemaDeTuberiaId: 'acquaSystemMagnumPn20' },
    }

    expect(sincronizarConectividadFisicaDeArtefactoConRedesDeclaradas(proyecto, 'uf-1', 'l-1', 'a-1', ['AF'])).toEqual({
      tipo: 'sinRedHidraulica',
    })
  })

  it('artefacto instancia inexistente: artefactoInexistente', () => {
    const proyecto = proyectoBase()

    expect(
      sincronizarConectividadFisicaDeArtefactoConRedesDeclaradas(proyecto, 'uf-1', 'local-bano', 'inexistente', ['AF']),
    ).toEqual({ tipo: 'artefactoInexistente' })
  })
})
