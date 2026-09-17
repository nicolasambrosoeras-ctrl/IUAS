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
import { catalogoSistemasDeTuberia } from '../../motor/tuberias/sistemaDeTuberia'
import { resolverPerdidaLocalizadaEstimadaDeLocal } from '../../motor/tuberias/presion/resolverPerdidaLocalizadaEstimadaDeLocal'
import { resolverDiametroComercialDeTramo } from '../../motor/tuberias/resolverDiametroComercialDeTramo'
import { proyectoInicial } from '../../interfaz/paginas/proyectoDeEjemplo'
import { backfillLongitudesDePredimensionamiento } from '../../interfaz/paginas/backfillLongitudesDePredimensionamiento'
import { localesDeUnidadFuncional } from '../../motor/tuberias/geometria/resolverCotaHidraulicaDeArtefacto'
import { aplicarMargenDeCompra, resolverDatosDeListadoDeMateriales } from './resolverDatosDeListadoDeMateriales'

// Helper de sólo-lectura para el test de reconciliación de tuberías: mismo
// resolver que usa Materials internamente, sin contexto compartido (no
// hace falta para un proyecto de este tamaño) -- así el test no depende de
// ningún tipo interno de resolverDatosDeListadoDeMateriales.ts.
function tieneDnResoluble(proyecto: Proyecto, tramoId: string): boolean {
  const resultado = resolverDiametroComercialDeTramo(proyecto, tramoId, catalogoArtefactos, catalogoSistemasDeTuberia)
  return resultado.tipo === 'conCandidato'
}

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

    // MATERIALS-POLISH-01: el pendiente ya no expone el id interno del
    // Tramo (`t-trunk`) -- humanizado, con fallback neutro por red cuando
    // no hay identidad de Local/Montante resoluble (brief §12).
    expect(datos.pendientes.some((p) => p.includes('DN pendiente') && !p.includes('t-trunk'))).toBe(true)
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
    expect(datos.accesorios).toEqual([{ clave: 'codo90|20 mm', etiqueta: 'Codo a 90º', dnComercial: '20 mm', cantidadComputada: 7, origen: 'definido' }])
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

    expect(datos.accesorios).toEqual([{ clave: 'tee|Tee DN 25 mm × 25 mm × 20 mm', etiqueta: 'Tee DN 25 mm × 25 mm × 20 mm', dnComercial: undefined, cantidadComputada: 1, origen: 'definido' }])
    expect(datos.pendientes).toEqual([])
  })

  it('Tee sin configurar (Nodo.tee undefined sobre bifurcación real): pendiente, nunca se inventa (brief §26)', () => {
    const { uf, red } = redConTee(undefined)
    const proyecto = proyectoBase({ ufs: [uf], red })

    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)

    expect(datos.accesorios).toEqual([])
    expect(datos.pendientes.some((p) => p.includes('Tee pendiente de configuración'))).toBe(true)
  })

  it('Fan-out 1→N (N≥3): pendiente "requiere especificación", nunca una pieza comercial ficticia (brief §26)', () => {
    const extra: Tramo = { id: 't-extra', nodoOrigenId: 'nTee', nodoDestinoId: 'nArt2', red: 'AF', longitud_m: 1, dnComercialAdoptado: '20 mm' }
    const { uf, red } = redConTee({ tipo: 'entradaPorExtremo', tramoSalidaRectaId: 't-recta' }, [extra])
    const proyecto = proyectoBase({ ufs: [uf], red })

    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)

    expect(datos.accesorios.some((a) => a.etiqueta.startsWith('Tee'))).toBe(false)
    expect(datos.pendientes.some((p) => p.includes('derivación múltiple no modelada'))).toBe(true)
  })
})

describe('resolverDatosDeListadoDeMateriales — accesorios físicos por defecto (ACCESSORIES-DEFAULTS-01)', () => {
  // Trunk t-trunk (n0 -> nFan) + n tramos terminales hacia n artefactos de
  // UN Local -- mismo patrón fan-out de "agrupa por Material..."/"no cuenta
  // dos veces...", parametrizado en n para poder variar la cantidad de
  // terminales físicos del Local sin tocar la topología general. Con n=0
  // no se agrega ningún tramo hacia artefactos (Local sin terminales en
  // esta red -- identificarFilasPrincipalesDeLocales no produce fila).
  function redFanOut(ufId: string, n: number): { uf: UnidadFuncional; red: RedHidraulica } {
    const uf = ufConArtefactos(ufId, Math.max(n, 1))
    // n0 (raíz real, sin tramo entrante -- "Distribución general", excluida
    // de identificarTramosRepresentativosDeLocales) -> t-raiz -> n1 -> t-trunk
    // -> nFan -> N tramos terminales. t-trunk (n1->nFan) es el Tramo PURO de
    // este Local más cercano a la raíz real (n0), así que es el único
    // representativo -- si el trunk saliera directo de la raíz (sin t-raiz
    // intermedio), el trunk MISMO sería clasificado "Distribución general" y
    // cada tramo terminal pasaría a ser representativo por separado (bug
    // detectado al escribir este fixture).
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1' }, { id: 'nFan' }]
    const tramos: Tramo[] = [
      { id: 't-raiz', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF', longitud_m: 3, dnComercialAdoptado: '20 mm' },
      { id: 't-trunk', nodoOrigenId: 'n1', nodoDestinoId: 'nFan', red: 'AF', longitud_m: 5, dnComercialAdoptado: '20 mm' },
    ]
    for (let i = 0; i < n; i++) {
      nodos.push({ id: `nArt${i}`, referencia: { tipo: 'artefacto', unidadFuncionalId: ufId, localId: `${ufId}-local`, artefactoId: `${ufId}-art-${i}` } })
      tramos.push({ id: `t-art${i}`, nodoOrigenId: 'nFan', nodoDestinoId: `nArt${i}`, red: 'AF', longitud_m: 1, dnComercialAdoptado: '20 mm' })
    }
    return { uf, red: { nodos, tramos } }
  }

  function proyectoConN(
    n: number,
    overrides?: Partial<ConfiguracionHidraulica>,
  ): Proyecto {
    const { uf, red } = redFanOut('uf1', n)
    return proyectoBase({ ufs: [uf], red, configuracionHidraulica: { granularidadHidraulica: 'simplificada', metodoPerdidaLocalizada: 'estimado', ...overrides } })
  }

  function accesoriosEstimados(datos: ReturnType<typeof resolverDatosDeListadoDeMateriales>) {
    return datos.accesorios.filter((a) => a.origen === 'estimado')
  }

  it.each([
    [1, 0, 1, 1],
    [2, 1, 1, 1],
    [3, 2, 1, 1],
    [4, 3, 1, 1],
  ])('simplificada + estimado, n=%i => Tee=%i, Codo90=%i, Llave=%i', (n, tee, codo, llave) => {
    const proyecto = proyectoConN(n)
    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)
    const estimados = accesoriosEstimados(datos)

    const teeItem = estimados.find((a) => a.etiqueta.startsWith('Tee'))
    const codoItem = estimados.find((a) => a.etiqueta === 'Codo a 90º')
    const llaveItem = estimados.find((a) => a.etiqueta === 'Llave de paso')

    expect(teeItem?.cantidadComputada ?? 0).toBe(tee)
    expect(codoItem?.cantidadComputada ?? 0).toBe(codo)
    expect(llaveItem?.cantidadComputada ?? 0).toBe(llave)
    expect(codoItem?.dnComercial).toBe('20 mm')
    expect(llaveItem?.dnComercial).toBe('20 mm')
    if (tee > 0) {
      expect(teeItem?.dnComercial).toBe('20 mm')
    }
    // CRIT-A30: ningún default estimado infiere una "Reducción".
    expect(estimados.some((a) => a.etiqueta.toLowerCase().includes('reducci'))).toBe(false)
  })

  it('simplificada + estimado, n=0 (Local sin terminales en esta red): no agrega ningún default', () => {
    const proyecto = proyectoConN(0)
    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)
    expect(accesoriosEstimados(datos)).toEqual([])
  })

  it('profesional + estimado, n=4: NUNCA genera defaults (decisión de dominio -- granularidad manda)', () => {
    const proyecto = proyectoConN(4, { granularidadHidraulica: 'profesional' })
    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)
    expect(accesoriosEstimados(datos)).toEqual([])
  })

  it('simplificada + detallado: no genera defaults (los dos métodos son excluyentes)', () => {
    const proyecto = proyectoConN(4, { metodoPerdidaLocalizada: 'detallado' })
    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)
    expect(accesoriosEstimados(datos)).toEqual([])
  })

  it('profesional + estimado + Tee real relevada: sólo la Tee real (origen "definido"), nunca un default encima', () => {
    const uf = ufConArtefactos('uf1', 3)
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'nTee', tee: { tipo: 'entradaPorExtremo', tramoSalidaRectaId: 't-recta' } },
      { id: 'nArt0', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf1', localId: 'uf1-local', artefactoId: 'uf1-art-0' } },
      { id: 'nArt1', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf1', localId: 'uf1-local', artefactoId: 'uf1-art-1' } },
    ]
    const tramos: Tramo[] = [
      { id: 't-entrada', nodoOrigenId: 'n0', nodoDestinoId: 'nTee', red: 'AF', longitud_m: 5, dnComercialAdoptado: '25 mm' },
      { id: 't-recta', nodoOrigenId: 'nTee', nodoDestinoId: 'nArt0', red: 'AF', longitud_m: 2, dnComercialAdoptado: '25 mm' },
      { id: 't-lateral', nodoOrigenId: 'nTee', nodoDestinoId: 'nArt1', red: 'AF', longitud_m: 2, dnComercialAdoptado: '20 mm' },
    ]
    const proyecto = proyectoBase({
      ufs: [uf],
      red: { nodos, tramos },
      configuracionHidraulica: { granularidadHidraulica: 'profesional', metodoPerdidaLocalizada: 'estimado' },
    })

    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)

    expect(datos.accesorios).toEqual([{ clave: 'tee|Tee DN 25 mm × 25 mm × 20 mm', etiqueta: 'Tee DN 25 mm × 25 mm × 20 mm', dnComercial: undefined, cantidadComputada: 1, origen: 'definido' }])
  })

  // Nota de cobertura: "DN no resoluble en el Tramo representativo ⇒
  // pendiente, nunca inventado" reutiliza EXACTAMENTE el mismo
  // `resolverDiametroComercialDeTramo` ya cubierto extensivamente en el
  // describe "tuberías" de este archivo (caso 'sinDemanda' con tramo
  // huérfano) -- no se duplica ese fixture acá porque, a diferencia de un
  // Tramo de tubería cualquiera, el Tramo representativo de un Local+red
  // con n>=1 SIEMPRE tiene demanda real aguas abajo (contarTerminalesFisicosDeLocal
  // exige un Nodo.referencia de artefacto real y válido, y el motor lanza
  // si esa referencia no corresponde a un Artefacto declarado del Local),
  // así que 'sinDemanda' es estructuralmente inalcanzable en este punto; la
  // rama sigue el mismo camino de código que ya está probado.

  it('margen de compra: se aplica a los defaults igual que a cualquier accesorio (10 % redondea hacia arriba)', () => {
    const proyecto = proyectoConN(3)
    const computo = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)
    const conMargen = aplicarMargenDeCompra(computo, 10)
    const teeConMargen = conMargen.accesorios.find((a) => a.origen === 'estimado' && a.etiqueta.startsWith('Tee'))
    // n=3 => 2 Tees computadas; +10% => ceil(2.2) = 3.
    expect(teeConMargen?.cantidadComputada).toBe(2)
    expect(teeConMargen?.cantidadCompra).toBe(3)
  })

  it('invariancia hidráulica: hf de HYD-EST es idéntica antes y después de computar Materials (no se toca ni se importa la fórmula)', () => {
    const proyecto = proyectoConN(3)
    const hfAntes = resolverPerdidaLocalizadaEstimadaDeLocal(
      proyecto,
      'uf1',
      'uf1-local',
      'AF',
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
    )

    // Computar el listado de materiales (que ahora SÍ agrega defaults
    // físicos para este mismo Local+red) no debe mutar `proyecto` ni
    // afectar en absoluto el resultado de HYD-EST -- son capas
    // completamente independientes (BOM de compra vs. hf de cálculo).
    resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)

    const hfDespues = resolverPerdidaLocalizadaEstimadaDeLocal(
      proyecto,
      'uf1',
      'uf1-local',
      'AF',
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
    )

    expect(hfDespues).toEqual(hfAntes)
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
    const base = { proyecto: {} as Proyecto, tuberias: [{ material: 'PPR', red: 'AF' as const, dnComercial: '20 mm', longitudComputada_m: 35 }], accesorios: [], medidores: [], almacenamiento: [], artefactos: [], pendientes: [], estado: 'completo' as const }
    expect(aplicarMargenDeCompra(base, 10).tuberias[0]?.longitudCompra_m).toBeCloseTo(38.5)
    expect(aplicarMargenDeCompra(base, 0).tuberias[0]?.longitudCompra_m).toBe(35)
  })

  it('accesorios: redondea la cantidad de compra hacia arriba (brief §22/§45/§60)', () => {
    const item = (cantidadComputada: number) => ({ clave: 'x', etiqueta: 'x', dnComercial: '20 mm', cantidadComputada, origen: 'definido' as const })
    const base = { proyecto: {} as Proyecto, tuberias: [], accesorios: [item(7)], medidores: [], almacenamiento: [], artefactos: [], pendientes: [], estado: 'completo' as const }
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
      estado: 'completo' as const,
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
      accesorios: [{ clave: 'x', etiqueta: 'x', dnComercial: '20 mm', cantidadComputada: 5, origen: 'definido' as const }],
      medidores: [],
      almacenamiento: [],
      artefactos: [],
      pendientes: [],
      estado: 'completo' as const,
    }
    const conMargen = aplicarMargenDeCompra(base, 0)
    expect(conMargen.tuberias[0]?.longitudCompra_m).toBe(base.tuberias[0]?.longitudComputada_m)
    expect(conMargen.accesorios[0]?.cantidadCompra).toBe(base.accesorios[0]?.cantidadComputada)
  })

  it('rechaza porcentajes inválidos (NaN, negativos, Infinity, >100) sin excepción silenciosa', () => {
    const base = { proyecto: {} as Proyecto, tuberias: [], accesorios: [], medidores: [], almacenamiento: [], artefactos: [], pendientes: [], estado: 'completo' as const }
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

describe('resolverDatosDeListadoDeMateriales — coherencia con el proyecto fuente (MATERIALS-POLISH-01)', () => {
  // Proyecto de referencia con longitudes reales precargadas -- mismo
  // helper que ya usa generarDocumentoPdf.test.ts (`canonico()`). Sin esto,
  // proyectoInicial "crudo" no tiene ningún `longitud_m` (se precarga en
  // runtime al montar la app) y el listado sale trivialmente PARCIAL.
  const proyectoDeEjemploCompleto = backfillLongitudesDePredimensionamiento(proyectoInicial)

  it('artefactos: la suma de Materials coincide EXACTAMENTE con el inventario físico de M1 (brief §5/§35)', () => {
    // Inventario físico de referencia: recorrido DIRECTO de
    // Proyecto.unidadesFuncionales -> Local.artefactos (origen 'normativo'),
    // exactamente como lo define M1 -- no cuenta terminales de
    // RedHidraulica (evita el doble conteo AF+AC de un mismo artefacto) ni
    // depende de ningún dato ya derivado por Materials.
    let totalFisico = 0
    for (const uf of proyectoDeEjemploCompleto.unidadesFuncionales) {
      for (const local of localesDeUnidadFuncional(uf)) {
        for (const artefacto of local.artefactos) {
          if (artefacto.origen === 'normativo') {
            totalFisico += artefacto.cantidad
          }
        }
      }
    }

    const datos = resolverDatosDeListadoDeMateriales(proyectoDeEjemploCompleto, catalogoArtefactos, coeficientesMayoracion)
    const totalMateriales = datos.artefactos.reduce((acc, item) => acc + item.cantidad, 0)

    expect(totalFisico).toBeGreaterThan(0)
    expect(totalMateriales).toBe(totalFisico)
  })

  it('tuberías: la suma de longitudes de Materials coincide con el inventario de Tramos físicos computables (brief §6/§36)', () => {
    // Criterio de "computable" EXPLÍCITO (mismo que usa el resolver): un
    // Tramo cuenta si y sólo si tiene longitud_m > 0 Y un DN comercial
    // resoluble ('conCandidato'). No caminos, no pérdidas, no longitud
    // efectiva -- sólo el inventario plano de RedHidraulica.tramos. En
    // 'simplificada' los Tramos "ramal" nunca reciben longitud_m del
    // backfill (ver backfillLongitudesDePredimensionamiento.ts), así que
    // ya quedan naturalmente fuera de esta suma sin lógica adicional.
    const { redHidraulica } = proyectoDeEjemploCompleto
    if (redHidraulica === undefined) {
      throw new Error('proyectoDeEjemploCompleto debe tener redHidraulica definida')
    }
    let totalTramosComputables = 0
    for (const tramo of redHidraulica.tramos) {
      const longitudValida = tramo.longitud_m !== undefined && tramo.longitud_m > 0
      const dnResoluble = tieneDnResoluble(proyectoDeEjemploCompleto, tramo.id)
      if (longitudValida && dnResoluble) {
        totalTramosComputables += tramo.longitud_m as number
      }
    }

    const datos = resolverDatosDeListadoDeMateriales(proyectoDeEjemploCompleto, catalogoArtefactos, coeficientesMayoracion)
    const totalMateriales = datos.tuberias.reduce((acc, item) => acc + item.longitudComputada_m, 0)

    expect(totalTramosComputables).toBeGreaterThan(0)
    expect(totalMateriales).toBeCloseTo(totalTramosComputables, 6)
  })
})

describe('resolverDatosDeListadoDeMateriales — Estado del listado (MATERIALS-POLISH-01)', () => {
  it('simplificada bien formada con defaults resolubles: estado "completo" (brief §33/§38, no exige Detailed)', () => {
    const uf = ufConArtefactos('uf1', 1)
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'nArt0', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf1', localId: 'uf1-local', artefactoId: 'uf1-art-0' } }]
    const tramos: Tramo[] = [{ id: 't-a', nodoOrigenId: 'n0', nodoDestinoId: 'nArt0', red: 'AF', longitud_m: 5, dnComercialAdoptado: '20 mm' }]
    const proyecto = proyectoBase({
      ufs: [uf],
      red: { nodos, tramos },
      configuracionHidraulica: { granularidadHidraulica: 'simplificada', metodoPerdidaLocalizada: 'estimado' },
    })

    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)

    expect(datos.pendientes).toEqual([])
    expect(datos.estado).toBe('completo')
  })

  it('un Tramo físico computable sin DN resoluble: estado "parcial", con pendiente humanizado', () => {
    // Mismo patrón "huérfano" ya usado en el describe de tuberías (§49):
    // t-trunk no llega a ningún Artefacto -> resolverDiametroComercialDeTramo
    // resuelve 'sinDemanda', DN no resoluble, sin inventar nada.
    const uf = ufConArtefactos('uf1', 1)
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'nDead' }]
    const tramos: Tramo[] = [{ id: 't-trunk', nodoOrigenId: 'n0', nodoDestinoId: 'nDead', red: 'AF', longitud_m: 5 }]
    const proyecto = proyectoBase({ ufs: [uf], red: { nodos, tramos } })

    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)

    expect(datos.estado).toBe('parcial')
    expect(datos.pendientes.length).toBeGreaterThan(0)
    expect(datos.pendientes.some((p) => /\bt-trunk\b/.test(p) || /"n0"|"nDead"/.test(p))).toBe(false)
  })

  it('proyectoInicial con longitudes precargadas (Modo Rápido, bien formado): estado "completo"', () => {
    const proyecto = backfillLongitudesDePredimensionamiento(proyectoInicial)
    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)
    expect(datos.pendientes).toEqual([])
    expect(datos.estado).toBe('completo')
  })
})

describe('resolverDatosDeListadoDeMateriales — humanización de pendientes, sin IDs internos (brief §11/§12/§40)', () => {
  it('ningún pendiente expone Tramo.id/Nodo.id crudos (patrones t-/n- conocidos)', () => {
    // Fuerza TODOS los tipos de pendiente en una sola resolución: Tramo sin
    // longitud, Tramo sin DN, Tee sin configurar, fan-out no modelado.
    const uf = ufConArtefactos('uf1', 3)
    const nodos: Nodo[] = [
      { id: 'n0' },
      { id: 'nSinLongitud' },
      { id: 'nTee' },
      { id: 'nArt0', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf1', localId: 'uf1-local', artefactoId: 'uf1-art-0' } },
      { id: 'nArt1', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf1', localId: 'uf1-local', artefactoId: 'uf1-art-1' } },
      { id: 'nArt2', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf1', localId: 'uf1-local', artefactoId: 'uf1-art-2' } },
    ]
    const tramos: Tramo[] = [
      // Tramo raíz sin longitud (pendiente de longitud).
      { id: 't-af-sinlongitud', nodoOrigenId: 'n0', nodoDestinoId: 'nSinLongitud', red: 'AF', dnComercialAdoptado: '20 mm' },
      // Bifurcación real sin Tee configurada.
      { id: 't-af-tee', nodoOrigenId: 'nSinLongitud', nodoDestinoId: 'nTee', red: 'AF', longitud_m: 2, dnComercialAdoptado: '20 mm' },
      { id: 't-af-lavatorio', nodoOrigenId: 'nTee', nodoDestinoId: 'nArt0', red: 'AF', longitud_m: 1, dnComercialAdoptado: '20 mm' },
      { id: 't-af-ducha', nodoOrigenId: 'nTee', nodoDestinoId: 'nArt1', red: 'AF', longitud_m: 1, dnComercialAdoptado: '20 mm' },
      // Fan-out 1->3 en otro nodo, no modelado.
      { id: 't-af-fan', nodoOrigenId: 'n0', nodoDestinoId: 'nArt2', red: 'AF', longitud_m: 1 },
    ]
    const proyecto = proyectoBase({ ufs: [uf], red: { nodos, tramos } })

    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)

    expect(datos.pendientes.length).toBeGreaterThan(0)
    const patronesDeIdInterno = /\bt-af-\w+\b|\bn-af-\w+\b|\bn-ac-\w+\b|"n0"|"nTee"|"nArt\d"/
    for (const pendiente of datos.pendientes) {
      expect(pendiente).not.toMatch(patronesDeIdInterno)
    }
  })
})
