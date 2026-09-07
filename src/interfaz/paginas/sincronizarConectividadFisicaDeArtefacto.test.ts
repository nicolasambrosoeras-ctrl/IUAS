import { describe, it, expect } from 'vitest'
import type { Artefacto, MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { validarRedHidraulica } from '../../validacion/redHidraulica'
import { auditarCoberturaFisica } from '../../motor/tuberias/cobertura/auditarCoberturaFisica'
import { obtenerArtefactosAguasAbajo } from '../../motor/tuberias/topologia/obtenerArtefactosAguasAbajo'
import { resolverHidraulicaDeTramo } from '../../motor/tuberias/resolverHidraulicaDeTramo'
import { identificarTramosRepresentativosDeLocales } from '../../motor/tuberias/topologia/identificarTramoRepresentativoDeLocal'
import {
  sincronizarConectividadFisicaDeArtefacto,
  sincronizarConectividadFisicaDeArtefactoConRedesDeclaradas,
} from './sincronizarConectividadFisicaDeArtefacto'

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

describe('sincronizarConectividadFisicaDeArtefacto', () => {
  it('D-δ.49: AF-only, segundo terminal del mismo Local -- RETROFIT (el único terminal previo colgaba directo de n0, sin bifurcación propia)', () => {
    let proyecto = proyectoBase()
    proyecto = {
      ...proyecto,
      unidadesFuncionales: proyecto.unidadesFuncionales.map((uf) => ({
        ...uf,
        locales: uf.locales.map((l) =>
          l.id === 'local-patio' ? { ...l, artefactos: [...l.artefactos, artefacto('art-canilla-2', 'canillaDeServicio')] } : l,
        ),
      })),
    }

    const resultado = sincronizarConectividadFisicaDeArtefacto(proyecto, 'uf-1', 'local-patio', 'art-canilla-2')

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

  it('D-δ.49: mixto, segundo lavatorio (precedente AF+AC) -- RETROFIT en AMBAS Redes (el primer lavatorio colgaba directo de n0/n-acs)', () => {
    let proyecto = proyectoBase()
    proyecto = {
      ...proyecto,
      unidadesFuncionales: proyecto.unidadesFuncionales.map((uf) => ({
        ...uf,
        locales: uf.locales.map((l) =>
          l.id === 'local-bano' ? { ...l, artefactos: [...l.artefactos, artefacto('art-lavatorio-2', 'lavatorio')] } : l,
        ),
      })),
    }

    const resultado = sincronizarConectividadFisicaDeArtefacto(proyecto, 'uf-1', 'local-bano', 'art-lavatorio-2')

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
    // Ninguno cuelga directo de la raíz compartida (n0/n-acs) -- ambos
    // requirieron retrofit, cada uno con su propia bifurcación dedicada.
    expect(tramoNuevoAF.nodoOrigenId).not.toBe('n0')
    expect(tramoNuevoAC.nodoOrigenId).not.toBe('n-acs')

    // El lavatorio original (art-lavatorio) se reengancha a esas mismas
    // bifurcaciones nuevas -- pero su longitud_m/accesorios ya cargados
    // (t-af-lavatorio en el fixture: longitud_m=3, un codo90) viajan al
    // Tramo NUEVO (raíz -> bifurcación), que es el que
    // identificarTramoRepresentativoDeLocal.ts reconoce de ahora en más
    // como representativo -- nunca se pierden, pero tampoco quedan en el
    // Tramo original (que ahora es un ramal más corto, sin dato propio).
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

  it('D-δ.49 (regresión real, hallada manualmente vía Playwright): la longitud ya cargada en granularidad simplificada NO desaparece de EstadoModulo2 al agregar el segundo terminal', () => {
    // Reproduce exactamente el bug encontrado en la prueba de aceptación
    // desde cero: si el Tramo nuevo (raíz -> bifurcación) no hereda
    // longitud_m del Tramo existente, identificarTramoRepresentativoDeLocal.ts
    // pasa a considerar representativo a un Tramo SIN datos -- el usuario
    // ve "Incompleto (falta longitud)" justo al agregar un segundo
    // artefacto a un Local que ya tenía todo cargado.
    let proyecto = proyectoBase()
    proyecto = {
      ...proyecto,
      unidadesFuncionales: proyecto.unidadesFuncionales.map((uf) => ({
        ...uf,
        locales: uf.locales.map((l) =>
          l.id === 'local-bano' ? { ...l, artefactos: [...l.artefactos, artefacto('art-lavatorio-2', 'lavatorio')] } : l,
        ),
      })),
    }

    const resultado = sincronizarConectividadFisicaDeArtefacto(proyecto, 'uf-1', 'local-bano', 'art-lavatorio-2')
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
    // El Tramo que la UI le pediría rellenar en 'simplificada' YA tiene la
    // longitud que el usuario había cargado -- no vuelve a pedirla.
    expect(tramo.longitud_m).toBe(3)
  })

  it('Local con patron de bifurcacion ya existente: el nuevo terminal cuelga del mismo nodo de bifurcacion', () => {
    // Construye un Local con 2 lavatorios ya conectados via bifurcacion
    // explicita (n-af-bano-1), y agrega un tercero.
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
      // n-general envolviendo a n0 (D-δ.49: cualquier topologia real
      // construida por asegurarRaizAF siempre trae este par junto; sin el,
      // n0 quedaria indistinguible de una cabecera dedicada de un Local).
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
    let proyecto = proyectoCon([uf], { nodos, tramos })
    proyecto = {
      ...proyecto,
      unidadesFuncionales: [
        { ...uf, locales: [{ ...uf.locales[0]!, artefactos: [...uf.locales[0]!.artefactos, artefacto('a3', 'lavatorio')] }] },
      ],
    }

    const resultado = sincronizarConectividadFisicaDeArtefacto(proyecto, 'uf-1', 'local-bano', 'a3')

    expect(resultado.tipo).toBe('sincronizado')
    if (resultado.tipo !== 'sincronizado') return
    // Solo AF: no hay ninguna instancia previa conectada a AC en este
    // fixture reducido, asi que el precedente es soloAF.
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
    let proyecto = proyectoBase()
    proyecto = {
      ...proyecto,
      unidadesFuncionales: proyecto.unidadesFuncionales.map((uf) => ({
        ...uf,
        locales: uf.locales.map((l) =>
          l.id === 'local-patio' ? { ...l, artefactos: [...l.artefactos, artefacto('art-canilla-2', 'canillaDeServicio')] } : l,
        ),
      })),
    }
    expect(auditarCoberturaFisica(proyecto).completa).toBe(false)

    const resultado = sincronizarConectividadFisicaDeArtefacto(proyecto, 'uf-1', 'local-patio', 'art-canilla-2')
    if (resultado.tipo !== 'sincronizado') throw new Error('se esperaba sincronizado')

    expect(auditarCoberturaFisica(resultado.proyecto).completa).toBe(true)
  })

  it('hidraulica: el nuevo artefacto participa realmente en el calculo aguas abajo (no solo desaparece el aviso)', () => {
    let proyecto = proyectoBase()
    proyecto = {
      ...proyecto,
      unidadesFuncionales: proyecto.unidadesFuncionales.map((uf) => ({
        ...uf,
        locales: uf.locales.map((l) =>
          l.id === 'local-patio' ? { ...l, artefactos: [...l.artefactos, artefacto('art-canilla-2', 'canillaDeServicio')] } : l,
        ),
      })),
    }
    const resultado = sincronizarConectividadFisicaDeArtefacto(proyecto, 'uf-1', 'local-patio', 'art-canilla-2')
    if (resultado.tipo !== 'sincronizado') throw new Error('se esperaba sincronizado')

    const referenciasAguasAbajo = obtenerArtefactosAguasAbajo(resultado.proyecto, 't-general')
    expect(referenciasAguasAbajo).toContainEqual({
      tipo: 'artefacto',
      unidadFuncionalId: 'uf-1',
      localId: 'local-patio',
      artefactoId: 'art-canilla-2',
    })

    // n del tramo raiz debe reflejar 3 artefactos computables (lavatorio +
    // 2 canillas), no los 2 originales.
    const hidraulica = resolverHidraulicaDeTramo(resultado.proyecto, 't-general', catalogoArtefactos)
    if (hidraulica.tipo !== 'conDemanda') throw new Error('se esperaba conDemanda')
    expect(hidraulica.simultaneidad.n).toBe(3)
  })

  it('preservacion: NO modifica longitud_m/accesorios de un Tramo existente no relacionado', () => {
    let proyecto = proyectoBase()
    proyecto = {
      ...proyecto,
      unidadesFuncionales: proyecto.unidadesFuncionales.map((uf) => ({
        ...uf,
        locales: uf.locales.map((l) =>
          l.id === 'local-patio' ? { ...l, artefactos: [...l.artefactos, artefacto('art-canilla-2', 'canillaDeServicio')] } : l,
        ),
      })),
    }
    const resultado = sincronizarConectividadFisicaDeArtefacto(proyecto, 'uf-1', 'local-patio', 'art-canilla-2')
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
    // Todos los nodos/tramos originales siguen presentes.
    expect(resultado.proyecto.redHidraulica!.nodos.length).toBeGreaterThanOrEqual(proyecto.redHidraulica!.nodos.length)
    for (const nodoOriginal of proyecto.redHidraulica!.nodos) {
      expect(resultado.proyecto.redHidraulica!.nodos).toContainEqual(nodoOriginal)
    }
  })

  it('D-δ.49: Local sin ninguna conexion previa -- BOOTSTRAP, conecta directo a la raiz AF existente (nunca redesPendientes)', () => {
    let proyecto = proyectoBase()
    proyecto = {
      ...proyecto,
      unidadesFuncionales: proyecto.unidadesFuncionales.map((uf) => ({
        ...uf,
        locales: uf.locales.map((l) =>
          l.id === 'local-vacio' ? { ...l, artefactos: [artefacto('art-canilla-3', 'canillaDeServicio')] } : l,
        ),
      })),
    }

    const resultado = sincronizarConectividadFisicaDeArtefacto(proyecto, 'uf-1', 'local-vacio', 'art-canilla-3')

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
    // Bootstrap directo: sin bifurcacion propia (unico Artefacto de este
    // Local), colgado de la raiz AF ya existente (n0) -- mismo patron que
    // local-patio en este mismo fixture.
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

    const resultado = sincronizarConectividadFisicaDeArtefactoConRedesDeclaradas(
      proyecto,
      'uf-1',
      'local-bano',
      'a-1',
      ['AF', 'AC'],
    )

    expect(resultado.tipo).toBe('sincronizado')
    if (resultado.tipo !== 'sincronizado') return
    expect([...resultado.redesConectadas].sort()).toEqual(['AC', 'AF'])
    expect(resultado.redesPendientes).toEqual([])
    expect(validarRedHidraulica(resultado.proyecto)).toEqual([])

    const redHidraulica = resultado.proyecto.redHidraulica!
    const referencia = { tipo: 'artefacto' as const, unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'a-1' }
    const terminales = redHidraulica.nodos.filter((n) => JSON.stringify(n.referencia) === JSON.stringify(referencia))
    expect(terminales).toHaveLength(2) // uno AF, uno AC

    const nodoAcs = redHidraulica.nodos.find((n) => n.referencia?.tipo === 'produccionACS')
    expect(nodoAcs).toBeDefined()
    // La raíz AF (destino de la Alimentación general, sin ningún tramo
    // entrante hacia SU origen) también quedó creada -- necesaria para
    // alimentar tanto el terminal AF como, aguas arriba, la Alimentación ACS.
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

    const resultado = sincronizarConectividadFisicaDeArtefactoConRedesDeclaradas(
      proyecto,
      'uf-1',
      'local-bano',
      'a-lavatorio',
      ['AF', 'AC'],
    )

    expect(resultado.tipo).toBe('sincronizado')
    if (resultado.tipo !== 'sincronizado') return
    expect([...resultado.redesConectadas].sort()).toEqual(['AC', 'AF'])
    expect(validarRedHidraulica(resultado.proyecto)).toEqual([])

    const redHidraulica = resultado.proyecto.redHidraulica!
    // AF: local-bano YA tenía un terminal (el inodoro) directo de n0 -- D-δ.49
    // retrofit, no cuelga directo de n0.
    const referenciaLavatorio = { tipo: 'artefacto' as const, unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'a-lavatorio' }
    const terminalAF = redHidraulica.nodos.find(
      (n) => JSON.stringify(n.referencia) === JSON.stringify(referenciaLavatorio) && redHidraulica.tramos.some((t) => t.nodoDestinoId === n.id && t.red === 'AF'),
    )!
    const tramoAF = redHidraulica.tramos.find((t) => t.nodoDestinoId === terminalAF.id)!
    expect(tramoAF.nodoOrigenId).not.toBe('n0')
    const tramoInodoroReenganchado = redHidraulica.tramos.find((t) => t.id === 't-af-inodoro')!
    expect(tramoInodoroReenganchado.nodoOrigenId).toBe(tramoAF.nodoOrigenId)

    // AC: el proyecto no tenía NINGUNA Alimentación ACS todavía -- bootstrap
    // completo (n-acs nuevo, colgado de n0), sin bifurcación (único terminal
    // AC de este Local).
    const nodoAcs = redHidraulica.nodos.find((n) => n.referencia?.tipo === 'produccionACS')!
    const tramoHaciaAcs = redHidraulica.tramos.find((t) => t.nodoDestinoId === nodoAcs.id)!
    expect(tramoHaciaAcs.nodoOrigenId).toBe('n0')
    const terminalAC = redHidraulica.nodos.find(
      (n) => JSON.stringify(n.referencia) === JSON.stringify(referenciaLavatorio) && n.id !== terminalAF.id,
    )!
    const tramoAC = redHidraulica.tramos.find((t) => t.nodoDestinoId === terminalAC.id)!
    expect(tramoAC.nodoOrigenId).toBe(nodoAcs.id) // directo de n-acs, sin bifurcacion propia
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
    let proyecto = proyectoCon([uf], { nodos, tramos })
    proyecto = {
      ...proyecto,
      unidadesFuncionales: [{ ...uf, locales: [{ ...uf.locales[0]!, artefactos: [...uf.locales[0]!.artefactos, artefacto('a3', 'lavatorio')] }] }],
    }

    const resultado = sincronizarConectividadFisicaDeArtefacto(proyecto, 'uf-1', 'local-bano', 'a3')

    expect(resultado.tipo).toBe('sincronizado')
    if (resultado.tipo !== 'sincronizado') return
    expect([...resultado.redesConectadas].sort()).toEqual(['AC', 'AF'])
    expect(validarRedHidraulica(resultado.proyecto)).toEqual([])

    const redHidraulica = resultado.proyecto.redHidraulica!
    // Nada de lo ya existente se modificó -- ni un solo Tramo reenganchado.
    for (const tramoOriginal of tramos) {
      expect(redHidraulica.tramos.find((t) => t.id === tramoOriginal.id)).toEqual(tramoOriginal)
    }
    // Los dos nuevos terminales cuelgan de las bifurcaciones YA existentes.
    const referenciaA3 = { tipo: 'artefacto' as const, unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'a3' }
    const nuevosTerminales = redHidraulica.nodos.filter((n) => JSON.stringify(n.referencia) === JSON.stringify(referenciaA3))
    expect(nuevosTerminales).toHaveLength(2)
    const nuevosTramos = redHidraulica.tramos.filter((t) => nuevosTerminales.some((n) => n.id === t.nodoDestinoId))
    expect(nuevosTramos.find((t) => t.red === 'AF')?.nodoOrigenId).toBe('n-af-bif')
    expect(nuevosTramos.find((t) => t.red === 'AC')?.nodoOrigenId).toBe('n-ac-bif')
    // Ningún nodo de bifurcación nuevo se creó (mismos 9 nodos + 2 terminales nuevos = 11).
    expect(redHidraulica.nodos).toHaveLength(nodos.length + 2)
  })

  it('D-δ.49 T11: sincronización repetida sobre el MISMO artefacto tras un bootstrap -- idempotente, no duplica nada', () => {
    let proyecto = proyectoBase()
    proyecto = {
      ...proyecto,
      unidadesFuncionales: proyecto.unidadesFuncionales.map((uf) => ({
        ...uf,
        locales: uf.locales.map((l) =>
          l.id === 'local-vacio' ? { ...l, artefactos: [artefacto('art-canilla-3', 'canillaDeServicio')] } : l,
        ),
      })),
    }

    const primeraVez = sincronizarConectividadFisicaDeArtefacto(proyecto, 'uf-1', 'local-vacio', 'art-canilla-3')
    expect(primeraVez.tipo).toBe('sincronizado')
    if (primeraVez.tipo !== 'sincronizado') return

    const segundaVez = sincronizarConectividadFisicaDeArtefacto(primeraVez.proyecto, 'uf-1', 'local-vacio', 'art-canilla-3')
    expect(segundaVez.tipo).toBe('sincronizado')
    if (segundaVez.tipo !== 'sincronizado') return

    expect(segundaVez.redesConectadas).toEqual(['AF'])
    expect(segundaVez.redesPendientes).toEqual([])
    // Ni un nodo ni un tramo nuevo: la segunda llamada es un no-op real.
    expect(segundaVez.proyecto).toBe(primeraVez.proyecto)
  })

  it('D-δ.49 T11: sincronización repetida tras un RETROFIT -- idempotente, no vuelve a reenganchar ni duplica la bifurcación', () => {
    let proyecto = proyectoBase()
    proyecto = {
      ...proyecto,
      unidadesFuncionales: proyecto.unidadesFuncionales.map((uf) => ({
        ...uf,
        locales: uf.locales.map((l) =>
          l.id === 'local-patio' ? { ...l, artefactos: [...l.artefactos, artefacto('art-canilla-2', 'canillaDeServicio')] } : l,
        ),
      })),
    }

    const primeraVez = sincronizarConectividadFisicaDeArtefacto(proyecto, 'uf-1', 'local-patio', 'art-canilla-2')
    expect(primeraVez.tipo).toBe('sincronizado')
    if (primeraVez.tipo !== 'sincronizado') return
    expect(validarRedHidraulica(primeraVez.proyecto)).toEqual([])

    // Repetir sobre CADA uno de los dos artefactos del Local: ninguno debe
    // generar un segundo retrofit ni una segunda bifurcación.
    const repetirOriginal = sincronizarConectividadFisicaDeArtefacto(primeraVez.proyecto, 'uf-1', 'local-patio', 'art-canilla')
    const repetirNuevo = sincronizarConectividadFisicaDeArtefacto(primeraVez.proyecto, 'uf-1', 'local-patio', 'art-canilla-2')
    expect(repetirOriginal.tipo).toBe('sincronizado')
    expect(repetirNuevo.tipo).toBe('sincronizado')
    if (repetirOriginal.tipo !== 'sincronizado' || repetirNuevo.tipo !== 'sincronizado') return
    expect(repetirOriginal.proyecto).toBe(primeraVez.proyecto)
    expect(repetirNuevo.proyecto).toBe(primeraVez.proyecto)
  })

  it('sin precedente en todo el proyecto (artefactoId de catalogo nunca conectado antes): redesNoDeterminables', () => {
    let proyecto = proyectoBase()
    proyecto = {
      ...proyecto,
      unidadesFuncionales: proyecto.unidadesFuncionales.map((uf) => ({
        ...uf,
        locales: uf.locales.map((l) =>
          l.id === 'local-bano' ? { ...l, artefactos: [...l.artefactos, artefacto('art-ducha', 'receptaculoDucha')] } : l,
        ),
      })),
    }

    const resultado = sincronizarConectividadFisicaDeArtefacto(proyecto, 'uf-1', 'local-bano', 'art-ducha')

    expect(resultado).toEqual({ tipo: 'redesNoDeterminables', motivo: 'sinPrecedente' })
  })

  it('proyecto sin redHidraulica: sinRedHidraulica', () => {
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'uf-1', locales: [{ id: 'l-1', tipo: 'bano', artefactos: [artefacto('a-1', 'lavatorio')] }] }
    const proyecto: Proyecto = {
      metadatos: metadatos(),
      parametros: parametros(),
      unidadesFuncionales: [uf],
      configuracionHidraulica: { metodoPerdidaDistribuida: 'hazenWilliams', metodoPerdidaLocalizada: 'detallado', granularidadHidraulica: 'profesional', materialTuberiaId: 'ppr', sistemaDeTuberiaId: 'acquaSystemMagnumPn20' },
    }

    expect(sincronizarConectividadFisicaDeArtefacto(proyecto, 'uf-1', 'l-1', 'a-1')).toEqual({ tipo: 'sinRedHidraulica' })
  })

  it('artefacto instancia inexistente: artefactoInexistente', () => {
    const proyecto = proyectoBase()

    expect(sincronizarConectividadFisicaDeArtefacto(proyecto, 'uf-1', 'local-bano', 'inexistente')).toEqual({
      tipo: 'artefactoInexistente',
    })
  })

  it('idempotencia: si el artefacto ya tiene terminal en la unica Red necesaria, no crea uno duplicado', () => {
    const proyecto = proyectoBase() // art-lavatorio ya tiene AF y AC

    const resultado = sincronizarConectividadFisicaDeArtefacto(proyecto, 'uf-1', 'local-bano', 'art-lavatorio')

    expect(resultado.tipo).toBe('sincronizado')
    if (resultado.tipo !== 'sincronizado') return
    expect([...resultado.redesConectadas].sort()).toEqual(['AC', 'AF'])
    expect(resultado.redesPendientes).toEqual([])
    expect(resultado.proyecto).toBe(proyecto) // sin cambios: nada que agregar
  })
})

describe('sincronizarConectividadFisicaDeArtefactoConRedesDeclaradas', () => {
  // Caso real que origino M2-D: primera instancia de un artefactoId en todo
  // el proyecto (aqui, inodoroValvula en un Bano que ya tiene otro
  // artefacto conectado a AF via bifurcacion). determinarRedesFisicasPorPrecedente
  // devolveria 'sinPrecedente' -- esta variante recibe la Red declarada
  // explicitamente por el usuario en lugar de deducirla.
  it('D-δ.49: primera instancia sin precedente, declarada AF -- RETROFIT (local-bano ya tenía un lavatorio directo de n0)', () => {
    const proyecto = proyectoBase()
    const proyectoConInodoro: Proyecto = {
      ...proyecto,
      unidadesFuncionales: proyecto.unidadesFuncionales.map((uf) => ({
        ...uf,
        locales: uf.locales.map((l) =>
          l.id === 'local-bano'
            ? { ...l, artefactos: [...l.artefactos, artefacto('art-inodoro-valvula', 'inodoroValvula')] }
            : l,
        ),
      })),
    }
    // Confirma la premisa: sin la declaracion explicita no hay precedente.
    expect(sincronizarConectividadFisicaDeArtefacto(proyectoConInodoro, 'uf-1', 'local-bano', 'art-inodoro-valvula')).toEqual({
      tipo: 'redesNoDeterminables',
      motivo: 'sinPrecedente',
    })

    const resultado = sincronizarConectividadFisicaDeArtefactoConRedesDeclaradas(
      proyectoConInodoro,
      'uf-1',
      'local-bano',
      'art-inodoro-valvula',
      ['AF'],
    )

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
    // local-bano solo tenia un artefacto (lavatorio) directo de n0, sin
    // bifurcacion dedicada -- D-δ.49 retrofit: nueva bifurcacion propia,
    // nunca cuelga directo de la raiz compartida.
    expect(nuevoTramo?.nodoOrigenId).not.toBe('n0')
    const tramoLavatorioReenganchado = resultado.proyecto.redHidraulica!.tramos.find((t) => t.id === 't-af-lavatorio')
    expect(tramoLavatorioReenganchado?.nodoOrigenId).toBe(nuevoTramo?.nodoOrigenId)

    // Cobertura completa y el nuevo consumo participa realmente aguas abajo
    // (no solo desaparece el aviso: obtenerArtefactosAguasAbajo lo alcanza
    // realmente desde la raiz, y resolverHidraulicaDeTramo calcula sobre el).
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
    // limpiezaConValvulaAutomatica (el inodoroValvula recien conectado) en
    // un Local domiciliario -- ese subconjunto (no el lavatorio preexistente)
    // es el que participa de n para ese Local. n = inodoroValvula (local-bano,
    // subconjunto CRIT-A8) + canilla (local-patio).
    expect(hidraulica.simultaneidad.n).toBe(2)
  })

  it('primera instancia sin precedente, declarada AF+AC: crea dos terminales referenciando la misma instancia', () => {
    const proyecto = proyectoBase()
    const proyectoConPileta: Proyecto = {
      ...proyecto,
      unidadesFuncionales: proyecto.unidadesFuncionales.map((uf) => ({
        ...uf,
        locales: uf.locales.map((l) =>
          l.id === 'local-bano'
            ? { ...l, artefactos: [...l.artefactos, artefacto('art-pileta', 'piletaDeCocina')] }
            : l,
        ),
      })),
    }

    const resultado = sincronizarConectividadFisicaDeArtefactoConRedesDeclaradas(
      proyectoConPileta,
      'uf-1',
      'local-bano',
      'art-pileta',
      ['AF', 'AC'],
    )

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
    expect(nodosNuevos).toHaveLength(2) // uno AF, uno AC
  })

  it('D-δ.49: Local sin ninguna conexion previa, redes declaradas -- BOOTSTRAP (nunca redesPendientes)', () => {
    const proyecto = proyectoBase()
    const proyectoConCanilla: Proyecto = {
      ...proyecto,
      unidadesFuncionales: proyecto.unidadesFuncionales.map((uf) => ({
        ...uf,
        locales: uf.locales.map((l) =>
          l.id === 'local-vacio' ? { ...l, artefactos: [artefacto('art-canilla-nueva', 'inodoroValvula')] } : l,
        ),
      })),
    }

    const resultado = sincronizarConectividadFisicaDeArtefactoConRedesDeclaradas(
      proyectoConCanilla,
      'uf-1',
      'local-vacio',
      'art-canilla-nueva',
      ['AF'],
    )

    expect(resultado.tipo).toBe('sincronizado')
    if (resultado.tipo !== 'sincronizado') return
    expect(resultado.redesConectadas).toEqual(['AF'])
    expect(resultado.redesPendientes).toEqual([])
    expect(validarRedHidraulica(resultado.proyecto)).toEqual([])
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
