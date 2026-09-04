import { describe, it, expect } from 'vitest'
import type { Artefacto, MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { validarRedHidraulica } from '../../validacion/redHidraulica'
import { auditarCoberturaFisica } from '../../motor/tuberias/cobertura/auditarCoberturaFisica'
import { obtenerArtefactosAguasAbajo } from '../../motor/tuberias/topologia/obtenerArtefactosAguasAbajo'
import { resolverHidraulicaDeTramo } from '../../motor/tuberias/resolverHidraulicaDeTramo'
import { sincronizarConectividadFisicaDeArtefacto } from './sincronizarConectividadFisicaDeArtefacto'

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
  it('AF-only: agregar canillaDeServicio (precedente soloAF) crea un unico terminal AF desde el origen directo existente', () => {
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

    const nuevoNodo = resultado.proyecto.redHidraulica!.nodos.find(
      (n) =>
        n.referencia?.tipo === 'artefacto' &&
        n.referencia.unidadFuncionalId === 'uf-1' &&
        n.referencia.localId === 'local-patio' &&
        n.referencia.artefactoId === 'art-canilla-2',
    )
    expect(nuevoNodo).toBeDefined()
    const nuevoTramo = resultado.proyecto.redHidraulica!.tramos.find((t) => t.nodoDestinoId === nuevoNodo!.id)
    expect(nuevoTramo?.nodoOrigenId).toBe('n0')
    expect(nuevoTramo?.red).toBe('AF')
  })

  it('mixto: agregar un segundo lavatorio (precedente AF+AC) crea terminales en AMBAS Redes, sobre la bifurcacion existente cuando la hay', () => {
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

    const referenciaEsperada = {
      tipo: 'artefacto' as const,
      unidadFuncionalId: 'uf-1',
      localId: 'local-bano',
      artefactoId: 'art-lavatorio-2',
    }
    const nodosNuevos = resultado.proyecto.redHidraulica!.nodos.filter(
      (n) => JSON.stringify(n.referencia) === JSON.stringify(referenciaEsperada),
    )
    expect(nodosNuevos).toHaveLength(2) // uno AF, uno AC

    const tramosDeEsosNodos = resultado.proyecto.redHidraulica!.tramos.filter((t) =>
      nodosNuevos.some((n) => n.id === t.nodoDestinoId),
    )
    // Local con un solo lavatorio no tenia bifurcacion dedicada -- el
    // origen directo (n0 para AF, n-acs para AC) es el punto de insercion.
    expect(tramosDeEsosNodos.find((t) => t.red === 'AF')?.nodoOrigenId).toBe('n0')
    expect(tramosDeEsosNodos.find((t) => t.red === 'AC')?.nodoOrigenId).toBe('n-acs')
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
      { id: 'n0' },
      { id: 'n-af-bano-1' },
      { id: 'n-a1', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'a1' } },
      { id: 'n-a2', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'a2' } },
    ]
    const tramos: Tramo[] = [
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

  it('sin punto de insercion inequivoco (Local sin ninguna conexion previa): redesPendientes, no fabrica conexion', () => {
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
    expect(resultado.redesConectadas).toEqual([])
    expect(resultado.redesPendientes).toEqual(['AF'])
    // No se creo ningun nodo/tramo nuevo.
    expect(resultado.proyecto).toBe(proyecto)
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
      configuracionHidraulica: { metodoPerdidaDistribuida: 'hazenWilliams', materialTuberiaId: 'ppr', sistemaDeTuberiaId: 'acquaSystemMagnumPn20' },
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
