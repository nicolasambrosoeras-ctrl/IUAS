import { describe, it, expect } from 'vitest'
import type {
  ConfiguracionDeAbastecimiento,
  ConfiguracionDeMedidores,
  ConfiguracionHidraulica,
  MetadatosProyecto,
  ParametrosProyecto,
  Proyecto,
  UnidadFuncional,
} from '../../modelo/proyecto'
import type { AccesorioDeTramo, ConfiguracionDeTee, Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import { aplicarMargenDeCompra, resolverDatosDeListadoDeMateriales } from './resolverDatosDeListadoDeMateriales'

function metadatos(): MetadatosProyecto {
  return { nombre: 'Proyecto de prueba', obra: 'O', comitente: 'C', fecha: '2026-01-01', schemaVersion: '1.0.0', versionNormativa: 'eras-2023' }
}

function parametros(): ParametrosProyecto {
  return { tipoDeProyecto: 'viviendaIndividual', presionSobreAcera_m: 15, alturaArtefactoMasDesfavorable_m: 0 }
}

function configuracionHidraulica(overrides?: Partial<ConfiguracionHidraulica>): ConfiguracionHidraulica {
  return {
    metodoPerdidaDistribuida: 'hazenWilliams',
    metodoPerdidaLocalizada: 'detallado',
    materialTuberiaId: 'ppr',
    sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    granularidadHidraulica: 'profesional',
    ...overrides,
  }
}

function proyectoBase(opts: {
  ufs: readonly UnidadFuncional[]
  red?: RedHidraulica
  configuracionHidraulica?: Partial<ConfiguracionHidraulica>
  configuracionMedidores?: ConfiguracionDeMedidores
  configuracionAbastecimiento?: ConfiguracionDeAbastecimiento
}): Proyecto {
  return {
    metadatos: metadatos(),
    parametros: parametros(),
    unidadesFuncionales: opts.ufs,
    ...(opts.red !== undefined ? { redHidraulica: opts.red } : {}),
    configuracionHidraulica: configuracionHidraulica(opts.configuracionHidraulica),
    ...(opts.configuracionMedidores !== undefined ? { configuracionMedidores: opts.configuracionMedidores } : {}),
    ...(opts.configuracionAbastecimiento !== undefined ? { configuracionAbastecimiento: opts.configuracionAbastecimiento } : {}),
  }
}

// UF con un Local con N artefactos `lavatorio` -- cada uno alcanzable desde
// la raíz por su propio tramo terminal, para poder darle demanda real
// (Qc != 0) a los tramos troncales/ramales que se quieran testear con
// `dnComercialAdoptado` (el override sólo aplica sobre tramos CON demanda).
function ufConArtefactos(ufId: string, cantidadArtefactos: number): UnidadFuncional {
  return {
    id: ufId,
    nombre: ufId,
    niveles: [
      {
        id: `${ufId}-nivel-1`,
        nombre: 'Nivel 1',
        locales: [
          {
            id: `${ufId}-local`,
            tipo: 'bano',
            regimen: 'domiciliario',
            artefactos: Array.from({ length: cantidadArtefactos }, (_, i) => ({
              id: `${ufId}-art-${i}`,
              artefactoId: 'lavatorio',
              cantidad: 1,
              origen: 'normativo' as const,
            })),
          },
        ],
      },
    ],
  }
}

describe('resolverDatosDeListadoDeMateriales — tuberías', () => {
  it('agrupa por Material + Red + DN y suma longitud_m real (brief §55)', () => {
    // n0 --t-trunk(DN20, 5m)--> nJoin --t-a(DN20, 7m)--> nArt0 (art. 0)
    //                                 --t-b(DN25, 10m)--> nArt1 (art. 1)
    const uf = ufConArtefactos('uf1', 2)
    const nodos: Nodo[] = [
      { id: 'n0' },
      // Bifurcación real 1→2: se declara la Tee explícitamente para que el
      // cómputo de tuberías no quede enmascarado por un pendiente de Tee
      // (eso se testea aparte, ver describe "Tee nodal").
      { id: 'nJoin', tee: { tipo: 'entradaPorExtremo', tramoSalidaRectaId: 't-a' } },
      { id: 'nArt0', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf1', localId: 'uf1-local', artefactoId: 'uf1-art-0' } },
      { id: 'nArt1', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf1', localId: 'uf1-local', artefactoId: 'uf1-art-1' } },
    ]
    const tramos: Tramo[] = [
      { id: 't-trunk', nodoOrigenId: 'n0', nodoDestinoId: 'nJoin', red: 'AF', longitud_m: 5, dnComercialAdoptado: '20 mm' },
      { id: 't-a', nodoOrigenId: 'nJoin', nodoDestinoId: 'nArt0', red: 'AF', longitud_m: 7, dnComercialAdoptado: '20 mm' },
      { id: 't-b', nodoOrigenId: 'nJoin', nodoDestinoId: 'nArt1', red: 'AF', longitud_m: 10, dnComercialAdoptado: '25 mm' },
    ]
    const proyecto = proyectoBase({ ufs: [uf], red: { nodos, tramos } })

    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)

    expect(datos.tuberias).toEqual([
      { material: 'PPR', red: 'AF', dnComercial: '20 mm', longitudComputada_m: 12 },
      { material: 'PPR', red: 'AF', dnComercial: '25 mm', longitudComputada_m: 10 },
    ])
    expect(datos.pendientes).toEqual([])
  })

  it('mantiene AF y AC como filas separadas aunque compartan Material+DN (brief §56)', () => {
    const uf = ufConArtefactos('uf1', 1)
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'nAcs', referencia: { tipo: 'produccionACS' } },
      { id: 'nArtAF', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf1', localId: 'uf1-local', artefactoId: 'uf1-art-0' } },
      { id: 'nArtAC', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf1', localId: 'uf1-local', artefactoId: 'uf1-art-0' } },
    ]
    const tramos: Tramo[] = [
      { id: 't-af', nodoOrigenId: 'n0', nodoDestinoId: 'nArtAF', red: 'AF', longitud_m: 12, dnComercialAdoptado: '20 mm' },
      { id: 't-af-acs', nodoOrigenId: 'n0', nodoDestinoId: 'nAcs', red: 'AF', longitud_m: 3, dnComercialAdoptado: '20 mm' },
      { id: 't-ac', nodoOrigenId: 'nAcs', nodoDestinoId: 'nArtAC', red: 'AC', longitud_m: 8, dnComercialAdoptado: '20 mm' },
    ]
    const proyecto = proyectoBase({ ufs: [uf], red: { nodos, tramos } })

    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)

    const af = datos.tuberias.find((t) => t.red === 'AF' && t.dnComercial === '20 mm')
    const ac = datos.tuberias.find((t) => t.red === 'AC' && t.dnComercial === '20 mm')
    expect(af?.longitudComputada_m).toBe(15)
    expect(ac?.longitudComputada_m).toBe(8)
  })

  it('no cuenta dos veces un tramo de Montante compartido por varios Locales (brief §57)', () => {
    // Montante troncal compartida (montanteId) sirve a 2 Locales -- debe
    // computarse UNA sola vez, no una vez por Local servido.
    const uf: UnidadFuncional = {
      id: 'uf1',
      nombre: 'uf1',
      niveles: [
        {
          id: 'uf1-nivel-1',
          nombre: 'Nivel 1',
          locales: [
            { id: 'local-a', tipo: 'bano', regimen: 'domiciliario', artefactos: [{ id: 'art-a', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }] },
            { id: 'local-b', tipo: 'bano', regimen: 'domiciliario', artefactos: [{ id: 'art-b', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }] },
          ],
        },
      ],
    }
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'nMontante' },
      { id: 'nArtA', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf1', localId: 'local-a', artefactoId: 'art-a' } },
      { id: 'nArtB', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf1', localId: 'local-b', artefactoId: 'art-b' } },
    ]
    const tramos: Tramo[] = [
      { id: 't-montante', nodoOrigenId: 'n0', nodoDestinoId: 'nMontante', red: 'AF', longitud_m: 6, dnComercialAdoptado: '25 mm', montanteId: 'montante-1' },
      { id: 't-feed-a', nodoOrigenId: 'nMontante', nodoDestinoId: 'nArtA', red: 'AF', longitud_m: 2, dnComercialAdoptado: '20 mm' },
      { id: 't-feed-b', nodoOrigenId: 'nMontante', nodoDestinoId: 'nArtB', red: 'AF', longitud_m: 3, dnComercialAdoptado: '20 mm' },
    ]
    const proyecto = proyectoBase({
      ufs: [uf],
      red: { nodos, tramos },
      configuracionHidraulica: { granularidadHidraulica: 'profesional' },
    })

    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)

    const dn25 = datos.tuberias.find((t) => t.dnComercial === '25 mm')
    const dn20 = datos.tuberias.find((t) => t.dnComercial === '20 mm')
    // La montante (6m) aparece UNA sola vez, no 2 (una por Local servido).
    expect(dn25?.longitudComputada_m).toBe(6)
    expect(dn20?.longitudComputada_m).toBe(5)
  })

  it('usa longitud_m física adoptada, nunca una longitud efectiva derivada de cota/Δz (brief §58)', () => {
    const uf = ufConArtefactos('uf1', 1)
    const nodos: Nodo[] = [
      { id: 'n0', cota_m: 0 },
      // Δz grande a propósito: si el resolver derivara longitud de cota,
      // el resultado sería muy distinto de longitud_m=4.
      { id: 'nArt0', cota_m: 15, referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf1', localId: 'uf1-local', artefactoId: 'uf1-art-0' } },
    ]
    const tramos: Tramo[] = [{ id: 't-a', nodoOrigenId: 'n0', nodoDestinoId: 'nArt0', red: 'AF', longitud_m: 4, dnComercialAdoptado: '20 mm' }]
    const proyecto = proyectoBase({ ufs: [uf], red: { nodos, tramos } })

    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)

    expect(datos.tuberias).toEqual([{ material: 'PPR', red: 'AF', dnComercial: '20 mm', longitudComputada_m: 4 }])
  })

  it('marca como pendiente un Tramo sin demanda resoluble (DN no determinable), sin inventar un valor (brief §49)', () => {
    // Tramo "huérfano": no llega a ningún Artefacto -- resolverHidraulicaDeTramo
    // lo resuelve 'sinDemanda' y, por lo tanto, no hay DN comercial que adoptar.
    const uf = ufConArtefactos('uf1', 1)
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'nDead' }]
    const tramos: Tramo[] = [{ id: 't-trunk', nodoOrigenId: 'n0', nodoDestinoId: 'nDead', red: 'AF', longitud_m: 5 }]
    const proyecto = proyectoBase({ ufs: [uf], red: { nodos, tramos } })

    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)

    expect(datos.pendientes.some((p) => p.includes('t-trunk') && p.includes('DN pendiente'))).toBe(true)
    expect(datos.tuberias).toEqual([])
  })
})

describe('resolverDatosDeListadoDeMateriales — accesorios', () => {
  function proyectoConAccesorio(accesorios: readonly AccesorioDeTramo[], metodoPerdidaLocalizada: 'detallado' | 'estimado') {
    const uf = ufConArtefactos('uf1', 1)
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'nArt0', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf1', localId: 'uf1-local', artefactoId: 'uf1-art-0' } }]
    const tramos: Tramo[] = [{ id: 't-a', nodoOrigenId: 'n0', nodoDestinoId: 'nArt0', red: 'AF', longitud_m: 5, dnComercialAdoptado: '20 mm', accesorios }]
    return proyectoBase({ ufs: [uf], red: { nodos, tramos }, configuracionHidraulica: { metodoPerdidaLocalizada } })
  }

  it('modo detallado: computa exactamente los accesorios explícitos del Tramo (brief §20/§63)', () => {
    const proyecto = proyectoConAccesorio([{ tipo: 'codo90', cantidad: 7 }], 'detallado')
    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)
    expect(datos.accesorios).toEqual([{ clave: 'codo90|20 mm', etiqueta: 'Codo a 90º', dnComercial: '20 mm', cantidadComputada: 7 }])
  })

  it('modo estimado: NUNCA convierte las K estimadas (tee/terminal/llave) en piezas de compra (brief §19/§62)', () => {
    const proyecto = proyectoConAccesorio([{ tipo: 'codo90', cantidad: 7 }], 'estimado')
    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)
    expect(datos.accesorios).toEqual([])
  })

  it('CRIT-A30: un cambio de DN entre Tramos consecutivos NUNCA genera una "Reducción" inferida (brief §25/§64)', () => {
    const uf = ufConArtefactos('uf1', 1)
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'nMed' }, { id: 'nArt0', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf1', localId: 'uf1-local', artefactoId: 'uf1-art-0' } }]
    const tramos: Tramo[] = [
      { id: 't-25', nodoOrigenId: 'n0', nodoDestinoId: 'nMed', red: 'AF', longitud_m: 5, dnComercialAdoptado: '25 mm' },
      { id: 't-20', nodoOrigenId: 'nMed', nodoDestinoId: 'nArt0', red: 'AF', longitud_m: 3, dnComercialAdoptado: '20 mm' },
    ]
    const proyecto = proyectoBase({ ufs: [uf], red: { nodos, tramos } })

    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)

    expect(datos.accesorios.some((a) => a.etiqueta.toLowerCase().includes('reducci'))).toBe(false)
  })
})

describe('resolverDatosDeListadoDeMateriales — Tee nodal', () => {
  function redConTee(tee: ConfiguracionDeTee | undefined, salientesExtra: readonly Tramo[] = []): { uf: UnidadFuncional; red: RedHidraulica } {
    const uf = ufConArtefactos('uf1', 3)
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'nTee', ...(tee !== undefined ? { tee } : {}) },
      { id: 'nArt0', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf1', localId: 'uf1-local', artefactoId: 'uf1-art-0' } },
      { id: 'nArt1', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf1', localId: 'uf1-local', artefactoId: 'uf1-art-1' } },
      { id: 'nArt2', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf1', localId: 'uf1-local', artefactoId: 'uf1-art-2' } },
    ]
    const tramos: Tramo[] = [
      { id: 't-entrada', nodoOrigenId: 'n0', nodoDestinoId: 'nTee', red: 'AF', longitud_m: 5, dnComercialAdoptado: '25 mm' },
      { id: 't-recta', nodoOrigenId: 'nTee', nodoDestinoId: 'nArt0', red: 'AF', longitud_m: 2, dnComercialAdoptado: '25 mm' },
      { id: 't-lateral', nodoOrigenId: 'nTee', nodoDestinoId: 'nArt1', red: 'AF', longitud_m: 2, dnComercialAdoptado: '20 mm' },
      ...salientesExtra,
    ]
    return { uf, red: { nodos, tramos } }
  }

  it('Tee 1→2 clasificada con DN inequívoco: se computa como pieza única "Tee DN A × B × C" (brief §24)', () => {
    const { uf, red } = redConTee({ tipo: 'entradaPorExtremo', tramoSalidaRectaId: 't-recta' })
    const proyecto = proyectoBase({ ufs: [uf], red })

    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)

    expect(datos.accesorios).toEqual([{ clave: 'tee|Tee DN 25 mm × 25 mm × 20 mm', etiqueta: 'Tee DN 25 mm × 25 mm × 20 mm', dnComercial: undefined, cantidadComputada: 1 }])
    expect(datos.pendientes).toEqual([])
  })

  it('Tee sin configurar (Nodo.tee undefined sobre bifurcación real): pendiente, nunca se inventa (brief §26)', () => {
    const { uf, red } = redConTee(undefined)
    const proyecto = proyectoBase({ ufs: [uf], red })

    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)

    expect(datos.accesorios).toEqual([])
    expect(datos.pendientes.some((p) => p.includes('Tee sin configurar'))).toBe(true)
  })

  it('Fan-out 1→N (N≥3): pendiente "requiere especificación", nunca una pieza comercial ficticia (brief §26)', () => {
    const extra: Tramo = { id: 't-extra', nodoOrigenId: 'nTee', nodoDestinoId: 'nArt2', red: 'AF', longitud_m: 1, dnComercialAdoptado: '20 mm' }
    const { uf, red } = redConTee({ tipo: 'entradaPorExtremo', tramoSalidaRectaId: 't-recta' }, [extra])
    const proyecto = proyectoBase({ ufs: [uf], red })

    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)

    expect(datos.accesorios.some((a) => a.etiqueta.startsWith('Tee'))).toBe(false)
    expect(datos.pendientes.some((p) => p.includes('Derivación múltiple no modelada'))).toBe(true)
  })
})

describe('resolverDatosDeListadoDeMateriales — medidores, almacenamiento y artefactos', () => {
  it('medidor general: 1 unidad, sin importar el margen (brief §27/§66)', () => {
    const uf = ufConArtefactos('uf1', 1)
    const proyecto = proyectoBase({
      ufs: [uf],
      configuracionMedidores: { esPropiedadHorizontal: false, tipoProvisionACS: 'individual' },
    })
    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)
    expect(datos.medidores).toHaveLength(1)
    expect(datos.medidores[0]?.nombre).toBe('Medidor general')
    expect(datos.medidores[0]?.cantidad).toBe(1)
  })

  it('tanque elevado adoptado 1000 L: 1 unidad, sin extra (brief §28/§67)', () => {
    const uf = ufConArtefactos('uf1', 1)
    const proyecto = proyectoBase({
      ufs: [uf],
      configuracionAbastecimiento: { esquema: 'tanqueElevado', volumenTanqueElevadoAdoptado_m3: 1 },
    })
    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)
    expect(datos.almacenamiento).toEqual([{ nombre: 'Tanque elevado', especificacion: 'Volumen adoptado: 1.000 L', cantidad: 1 }])
  })

  it('esquema con bombeo declara el sistema de bombeo como pendiente, sin inventar una bomba (brief §29)', () => {
    const uf = ufConArtefactos('uf1', 1)
    const proyecto = proyectoBase({
      ufs: [uf],
      configuracionAbastecimiento: {
        esquema: 'cisternaBombeoElevado',
        volumenTanqueElevadoAdoptado_m3: 1,
        volumenTanqueBombeoAdoptado_m3: 2,
      },
    })
    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)
    expect(datos.almacenamiento).toHaveLength(2)
    expect(datos.pendientes.some((p) => p.includes('bombeo'))).toBe(true)
  })

  it('artefactos: respeta `cantidad`, no duplica por AF+AC (brief §31/§32/§33/§65)', () => {
    const uf: UnidadFuncional = {
      id: 'uf1',
      nombre: 'uf1',
      niveles: [
        {
          id: 'uf1-nivel-1',
          nombre: 'Nivel 1',
          locales: [
            {
              id: 'uf1-local',
              tipo: 'cocina',
              regimen: 'domiciliario',
              artefactos: [{ id: 'lav-1', artefactoId: 'lavatorio', cantidad: 3, origen: 'normativo' }],
            },
          ],
        },
      ],
    }
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'nAF', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf1', localId: 'uf1-local', artefactoId: 'lav-1' } },
      { id: 'nAC', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf1', localId: 'uf1-local', artefactoId: 'lav-1' } },
    ]
    const tramos: Tramo[] = [
      { id: 't-af', nodoOrigenId: 'n0', nodoDestinoId: 'nAF', red: 'AF', longitud_m: 2, dnComercialAdoptado: '20 mm' },
      { id: 't-ac', nodoOrigenId: 'n0', nodoDestinoId: 'nAC', red: 'AC', longitud_m: 2, dnComercialAdoptado: '20 mm' },
    ]
    const proyecto = proyectoBase({ ufs: [uf], red: { nodos, tramos } })

    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)

    expect(datos.artefactos).toEqual([{ nombre: 'Lavatorio', especificacion: '', cantidad: 3 }])
  })

  it('proyecto sin M3/M4 iniciados: no exige un proyecto hidráulicamente completo (brief §48)', () => {
    const uf = ufConArtefactos('uf1', 1)
    const proyecto = proyectoBase({ ufs: [uf] })
    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)
    expect(datos.medidores).toEqual([])
    expect(datos.almacenamiento).toEqual([])
  })
})

describe('aplicarMargenDeCompra', () => {
  it('tuberías: aplica el porcentaje sobre la longitud computada (brief §16/§59)', () => {
    const base = { proyecto: {} as Proyecto, tuberias: [{ material: 'PPR', red: 'AF' as const, dnComercial: '20 mm', longitudComputada_m: 35 }], accesorios: [], medidores: [], almacenamiento: [], artefactos: [], pendientes: [] }
    expect(aplicarMargenDeCompra(base, 10).tuberias[0]?.longitudCompra_m).toBeCloseTo(38.5)
    expect(aplicarMargenDeCompra(base, 0).tuberias[0]?.longitudCompra_m).toBe(35)
  })

  it('accesorios: redondea la cantidad de compra hacia arriba (brief §22/§45/§60)', () => {
    const item = (cantidadComputada: number) => ({ clave: 'x', etiqueta: 'x', dnComercial: '20 mm', cantidadComputada })
    const base = { proyecto: {} as Proyecto, tuberias: [], accesorios: [item(7)], medidores: [], almacenamiento: [], artefactos: [], pendientes: [] }
    expect(aplicarMargenDeCompra(base, 10).accesorios[0]?.cantidadCompra).toBe(8)
    expect(aplicarMargenDeCompra({ ...base, accesorios: [item(2)] }, 20).accesorios[0]?.cantidadCompra).toBe(3)
    expect(aplicarMargenDeCompra({ ...base, accesorios: [item(1)] }, 0).accesorios[0]?.cantidadCompra).toBe(1)
  })

  it('nunca aplica margen a medidores/equipos/artefactos (brief §38/§61)', () => {
    const base = {
      proyecto: {} as Proyecto,
      tuberias: [],
      accesorios: [],
      medidores: [{ nombre: 'Medidor general', especificacion: 'DN 25 mm', cantidad: 1 }],
      almacenamiento: [{ nombre: 'Tanque elevado', especificacion: '1.000 L', cantidad: 1 }],
      artefactos: [{ nombre: 'Lavatorio', especificacion: '', cantidad: 3 }],
      pendientes: [],
    }
    const conMargen = aplicarMargenDeCompra(base, 20)
    expect(conMargen.medidores).toEqual(base.medidores)
    expect(conMargen.almacenamiento).toEqual(base.almacenamiento)
    expect(conMargen.artefactos).toEqual(base.artefactos)
  })

  it('invariante: p=0 => cantidad de compra === cantidad computada, para tuberías y accesorios (brief §44)', () => {
    const base = {
      proyecto: {} as Proyecto,
      tuberias: [{ material: 'PPR', red: 'AF' as const, dnComercial: '20 mm', longitudComputada_m: 12.34 }],
      accesorios: [{ clave: 'x', etiqueta: 'x', dnComercial: '20 mm', cantidadComputada: 5 }],
      medidores: [],
      almacenamiento: [],
      artefactos: [],
      pendientes: [],
    }
    const conMargen = aplicarMargenDeCompra(base, 0)
    expect(conMargen.tuberias[0]?.longitudCompra_m).toBe(base.tuberias[0]?.longitudComputada_m)
    expect(conMargen.accesorios[0]?.cantidadCompra).toBe(base.accesorios[0]?.cantidadComputada)
  })

  it('rechaza porcentajes inválidos (NaN, negativos, Infinity, >100) sin excepción silenciosa', () => {
    const base = { proyecto: {} as Proyecto, tuberias: [], accesorios: [], medidores: [], almacenamiento: [], artefactos: [], pendientes: [] }
    expect(() => aplicarMargenDeCompra(base, NaN)).toThrow()
    expect(() => aplicarMargenDeCompra(base, -1)).toThrow()
    expect(() => aplicarMargenDeCompra(base, Infinity)).toThrow()
    expect(() => aplicarMargenDeCompra(base, 101)).toThrow()
    expect(() => aplicarMargenDeCompra(base, 100)).not.toThrow()
  })
})

describe('determinismo y no mutación', () => {
  it('resolver dos veces el mismo Proyecto produce resultados deepEqual (brief §68)', () => {
    const uf = ufConArtefactos('uf1', 2)
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'nArt0', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf1', localId: 'uf1-local', artefactoId: 'uf1-art-0' } },
      { id: 'nArt1', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf1', localId: 'uf1-local', artefactoId: 'uf1-art-1' } },
    ]
    const tramos: Tramo[] = [
      { id: 't-a', nodoOrigenId: 'n0', nodoDestinoId: 'nArt0', red: 'AF', longitud_m: 5, dnComercialAdoptado: '20 mm' },
      { id: 't-b', nodoOrigenId: 'n0', nodoDestinoId: 'nArt1', red: 'AF', longitud_m: 5, dnComercialAdoptado: '20 mm' },
    ]
    const proyecto = proyectoBase({ ufs: [uf], red: { nodos, tramos } })

    const primero = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)
    const segundo = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)

    expect(segundo).toEqual(primero)
  })

  it('generar el listado con distintos porcentajes no modifica el Proyecto (brief §69)', () => {
    const uf = ufConArtefactos('uf1', 1)
    const proyecto = proyectoBase({ ufs: [uf] })
    const snapshotAntes = JSON.parse(JSON.stringify(proyecto))

    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)
    aplicarMargenDeCompra(datos, 0)
    aplicarMargenDeCompra(datos, 10)
    aplicarMargenDeCompra(datos, 20)

    expect(proyecto).toEqual(snapshotAntes)
  })
})
