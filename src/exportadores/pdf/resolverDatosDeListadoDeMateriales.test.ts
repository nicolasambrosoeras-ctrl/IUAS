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

  // Nota: `proyectoConAccesorio` arma un único Tramo de 5 m -- brief §9
  // (uniones/cuplas rectas cada 4 m, MATERIALS-ACCESSORIES-01) agrega
  // SIEMPRE una unión sobre ese mismo Tramo (floor(5/4)=1), sin importar
  // el método de pérdida localizada. Estos dos tests son sobre el
  // comportamiento de `Tramo.accesorios`/K-estimadas, así que filtran esa
  // unión (cubierta aparte en el describe dedicado a uniones).
  function sinUniones(accesorios: ReturnType<typeof resolverDatosDeListadoDeMateriales>['accesorios']) {
    return accesorios.filter((a) => a.etiqueta !== 'Cupla recta PPR')
  }

  it('modo detallado: computa exactamente los accesorios explícitos del Tramo (brief §20/§63)', () => {
    const proyecto = proyectoConAccesorio([{ tipo: 'codo90', cantidad: 7 }], 'detallado')
    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)
    expect(sinUniones(datos.accesorios)).toEqual([
      {
        clave: 'codo90|20 mm',
        etiqueta: 'Codo a 90º',
        dnComercial: '20 mm',
        cantidadComputada: 7,
        origen: 'definido',
        red: 'AF',
        sector: 'colectorPrincipal',
        ubicacion: { tipo: 'colectorPrincipal' },
      },
    ])
  })

  it('modo estimado: NUNCA convierte las K estimadas (tee/terminal/llave) en piezas de compra (brief §19/§62)', () => {
    const proyecto = proyectoConAccesorio([{ tipo: 'codo90', cantidad: 7 }], 'estimado')
    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)
    expect(sinUniones(datos.accesorios)).toEqual([])
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

  // t-entrada mide 5 m -- brief §9 agrega SIEMPRE una unión sobre ese
  // mismo Tramo (floor(5/4)=1); se filtra acá (cubierta aparte en el
  // describe dedicado a uniones).
  function sinUniones(accesorios: ReturnType<typeof resolverDatosDeListadoDeMateriales>['accesorios']) {
    return accesorios.filter((a) => a.etiqueta !== 'Cupla recta PPR')
  }

  it('Tee 1→2 clasificada con DN inequívoco: se computa como pieza única "Tee DN A × B × C" (brief §24)', () => {
    const { uf, red } = redConTee({ tipo: 'entradaPorExtremo', tramoSalidaRectaId: 't-recta' })
    const proyecto = proyectoBase({ ufs: [uf], red })

    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)

    expect(sinUniones(datos.accesorios)).toEqual([
      {
        clave: 'tee|Tee DN 25 mm × 25 mm × 20 mm',
        etiqueta: 'Tee DN 25 mm × 25 mm × 20 mm',
        dnComercial: undefined,
        cantidadComputada: 1,
        origen: 'definido',
        red: 'AF',
        sector: 'colectorPrincipal',
        ubicacion: { tipo: 'colectorPrincipal' },
      },
    ])
    expect(datos.pendientes).toEqual([])
  })

  it('Tee sin configurar (Nodo.tee undefined sobre bifurcación real): pendiente, nunca se inventa (brief §26)', () => {
    const { uf, red } = redConTee(undefined)
    const proyecto = proyectoBase({ ufs: [uf], red })

    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)

    expect(sinUniones(datos.accesorios)).toEqual([])
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

describe('resolverDatosDeListadoDeMateriales — estimación constructiva DREZA de Locales (MATERIALS-ACCESSORIES-01)', () => {
  // Local con artefactos de conectividad AF/AC arbitraria: por cada red
  // presente entre los artefactos, arma raíz -> trunk -> artefactos (mismo
  // patrón fan-out ya validado en el resto del archivo), UNA vez por red
  // -- así el Local puede tener AF, AC o ambas con Tramos representativos
  // independientes.
  function construirLocalConArtefactos(opts: {
    ufId: string
    localId: string
    tipo: UnidadFuncional['niveles'][number]['locales'][number]['tipo']
    artefactos: readonly { id: string; redes: readonly ('AF' | 'AC')[] }[]
  }): { uf: UnidadFuncional; red: RedHidraulica } {
    const { ufId, localId, tipo, artefactos } = opts
    const uf: UnidadFuncional = {
      id: ufId,
      nombre: ufId,
      niveles: [
        {
          id: `${ufId}-nivel-1`,
          nombre: 'Nivel 1',
          locales: [
            {
              id: localId,
              tipo,
              regimen: 'domiciliario',
              artefactos: artefactos.map((a) => ({ id: a.id, artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' as const })),
            },
          ],
        },
      ],
    }

    const nodos: Nodo[] = []
    const tramos: Tramo[] = []
    for (const red of ['AF', 'AC'] as const) {
      const artefactosDeRed = artefactos.filter((a) => a.redes.includes(red))
      if (artefactosDeRed.length === 0) {
        continue
      }
      const n0 = `n0-${red}`
      const n1 = `n1-${red}`
      const nFan = `nFan-${red}`
      nodos.push({ id: n0 }, { id: n1 }, { id: nFan })
      tramos.push(
        { id: `t-raiz-${red}`, nodoOrigenId: n0, nodoDestinoId: n1, red, longitud_m: 3, dnComercialAdoptado: '20 mm' },
        { id: `t-trunk-${red}`, nodoOrigenId: n1, nodoDestinoId: nFan, red, longitud_m: 5, dnComercialAdoptado: '20 mm' },
      )
      for (const artefacto of artefactosDeRed) {
        const nodoArt = `n-${red}-${artefacto.id}`
        nodos.push({ id: nodoArt, referencia: { tipo: 'artefacto', unidadFuncionalId: ufId, localId, artefactoId: artefacto.id } })
        tramos.push({ id: `t-${red}-${artefacto.id}`, nodoOrigenId: nFan, nodoDestinoId: nodoArt, red, longitud_m: 1, dnComercialAdoptado: '20 mm' })
      }
    }
    return { uf, red: { nodos, tramos } }
  }

  function proyectoSimplificadaEstimado(uf: UnidadFuncional, red: RedHidraulica): Proyecto {
    return proyectoBase({ ufs: [uf], red, configuracionHidraulica: { granularidadHidraulica: 'simplificada', metodoPerdidaLocalizada: 'estimado' } })
  }

  function itemsDrezaDeLocal(datos: ReturnType<typeof resolverDatosDeListadoDeMateriales>) {
    return datos.accesorios.filter((a) => a.origen === 'estimadoDreza' && a.sector === 'local')
  }

  // Caso A (brief §13): baño completo AF+AC.
  it('Caso A — baño completo AF+AC: 3/1 tees+codo terminal en AF, 2/1 en AC, 6 codos de recorrido, 2 llaves, 4 sobrepasos', () => {
    const { uf, red } = construirLocalConArtefactos({
      ufId: 'uf1',
      localId: 'uf1-local',
      tipo: 'bano',
      artefactos: [
        { id: 'inodoro', redes: ['AF'] },
        { id: 'bidet', redes: ['AF', 'AC'] },
        { id: 'ducha', redes: ['AF', 'AC'] },
        { id: 'lavatorio', redes: ['AF', 'AC'] },
      ],
    })
    const datos = resolverDatosDeListadoDeMateriales(proyectoSimplificadaEstimado(uf, red), catalogoArtefactos, coeficientesMayoracion)
    const items = itemsDrezaDeLocal(datos)
    const af = items.filter((a) => a.red === 'AF')
    const ac = items.filter((a) => a.red === 'AC')

    expect(af.find((a) => a.etiqueta === 'Tee roscada PPR')?.cantidadComputada).toBe(3)
    expect(af.find((a) => a.etiqueta === 'Codo terminal roscado PPR')?.cantidadComputada).toBe(1)
    expect(af.find((a) => a.etiqueta === 'Codo a 90° (recorrido del local)')?.cantidadComputada).toBe(3)
    expect(af.find((a) => a.etiqueta === 'Llave de paso esférica')?.cantidadComputada).toBe(1)

    expect(ac.find((a) => a.etiqueta === 'Tee roscada PPR')?.cantidadComputada).toBe(2)
    expect(ac.find((a) => a.etiqueta === 'Codo terminal roscado PPR')?.cantidadComputada).toBe(1)
    expect(ac.find((a) => a.etiqueta === 'Codo a 90° (recorrido del local)')?.cantidadComputada).toBe(3)
    expect(ac.find((a) => a.etiqueta === 'Llave de paso esférica')?.cantidadComputada).toBe(1)

    // Los codos terminales roscados no se suman dentro de los 3 codos de
    // recorrido de cada red (son ítems separados, brief §6.4).
    expect(af.filter((a) => a.etiqueta.startsWith('Codo')).length).toBe(2)

    // HYD-OVERPASS-01: inodoro (sólo AF) -> 1 sobrepaso en AF; bidet+ducha+
    // lavatorio (AF+AC) -> 1 sobrepaso cada uno, asignado siempre a AC (3).
    // Ya no se lumpea en un único ítem sin red/DN -- cada uno lleva su red
    // y el DN real del Tramo (Acqua System, código 08-084020000 @ 20 mm).
    const sobrepasoAF = af.find((a) => a.etiqueta === 'Sobrepaso fusión')
    const sobrepasoAC = ac.find((a) => a.etiqueta === 'Sobrepaso fusión')
    expect(sobrepasoAF?.cantidadComputada).toBe(1)
    expect(sobrepasoAF?.dnComercial).toBe('20 mm')
    expect(sobrepasoAF?.codigoComercial).toBe('08-084020000')
    expect(sobrepasoAC?.cantidadComputada).toBe(3)
    expect(sobrepasoAC?.dnComercial).toBe('20 mm')
  })

  // Caso B (brief §13): toilette sólo AF.
  it('Caso B — toilette sólo AF: 1 tee + 1 codo terminal + 3 codos de recorrido + 1 llave + 2 sobrepasos', () => {
    const { uf, red } = construirLocalConArtefactos({
      ufId: 'uf1',
      localId: 'uf1-local',
      tipo: 'toilette',
      artefactos: [
        { id: 'inodoro', redes: ['AF'] },
        { id: 'lavatorio', redes: ['AF'] },
      ],
    })
    const datos = resolverDatosDeListadoDeMateriales(proyectoSimplificadaEstimado(uf, red), catalogoArtefactos, coeficientesMayoracion)
    const items = itemsDrezaDeLocal(datos)

    expect(items.find((a) => a.etiqueta === 'Tee roscada PPR')?.cantidadComputada).toBe(1)
    expect(items.find((a) => a.etiqueta === 'Codo terminal roscado PPR')?.cantidadComputada).toBe(1)
    expect(items.find((a) => a.etiqueta === 'Codo a 90° (recorrido del local)')?.cantidadComputada).toBe(3)
    expect(items.find((a) => a.etiqueta === 'Llave de paso esférica')?.cantidadComputada).toBe(1)
    const sobrepaso = items.find((a) => a.etiqueta === 'Sobrepaso fusión')
    expect(sobrepaso?.red).toBe('AF')
    expect(sobrepaso?.cantidadComputada).toBe(2)
    expect(sobrepaso?.dnComercial).toBe('20 mm')
  })

  // HYD-OVERPASS-01 §"Catálogo y validación de DN": Acqua System sólo
  // comercializa el Sobrepaso fusión en DN 20/25/32.
  it('DN adoptado fuera de 20/25/32 mm: emite un pendiente trazable, nunca un código inventado ni "DN a definir" -- el resto de la red (llave/codos/tee) sigue generándose normalmente', () => {
    const { uf, red } = construirLocalConArtefactos({
      ufId: 'uf1',
      localId: 'uf1-local',
      tipo: 'toilette',
      artefactos: [
        { id: 'inodoro', redes: ['AF'] },
        { id: 'lavatorio', redes: ['AF'] },
      ],
    })
    const redCon40mm: RedHidraulica = {
      ...red,
      tramos: red.tramos.map((t) => ({ ...t, dnComercialAdoptado: '40 mm' })),
    }
    const datos = resolverDatosDeListadoDeMateriales(proyectoSimplificadaEstimado(uf, redCon40mm), catalogoArtefactos, coeficientesMayoracion)
    const items = itemsDrezaDeLocal(datos)

    expect(items.find((a) => a.etiqueta === 'Sobrepaso fusión')).toBeUndefined()
    expect(items.some((a) => a.dnComercial === 'DN a definir')).toBe(false)
    expect(datos.pendientes.some((p) => p.includes('Sobrepaso fusión') && p.includes('40 mm'))).toBe(true)
    // El resto de la red (no depende del catálogo Acqua System de este
    // producto puntual) se sigue computando con normalidad.
    expect(items.find((a) => a.etiqueta === 'Llave de paso esférica')?.cantidadComputada).toBe(1)
    expect(items.find((a) => a.etiqueta === 'Codo terminal roscado PPR')?.cantidadComputada).toBe(1)
  })

  // HYD-OVERPASS-01: única fuente de verdad -- la cantidad de Sobrepaso
  // fusión de Materials debe coincidir EXACTAMENTE con nSobrepaso del
  // modelo hidráulico (resolverPerdidaLocalizadaEstimadaDeLocal) para el
  // mismo (Local, red), porque ambos consumen contarSobrepasosDeLocalPorRed.
  it('la cantidad de Sobrepaso fusión en Materials coincide con nSobrepaso del balance hidráulico (misma fuente de verdad)', () => {
    const { uf, red } = construirLocalConArtefactos({
      ufId: 'uf1',
      localId: 'uf1-local',
      tipo: 'bano',
      artefactos: [
        { id: 'inodoro', redes: ['AF'] },
        { id: 'bidet', redes: ['AF', 'AC'] },
        { id: 'ducha', redes: ['AF', 'AC'] },
      ],
    })
    const proyecto = proyectoSimplificadaEstimado(uf, red)
    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)
    const items = itemsDrezaDeLocal(datos)

    for (const redActual of ['AF', 'AC'] as const) {
      const hidraulico = resolverPerdidaLocalizadaEstimadaDeLocal(proyecto, 'uf1', 'uf1-local', redActual, catalogoArtefactos, catalogoSistemasDeTuberia)
      if (hidraulico.tipo !== 'estimada') throw new Error('se esperaba estimada')
      const materiales = items.find((a) => a.red === redActual && a.etiqueta === 'Sobrepaso fusión')
      expect(materiales?.cantidadComputada ?? 0).toBe(hidraulico.nSobrepaso)
    }
  })

  it('n=0 (Local sin terminales en esta red): no agrega ninguna estimación de esa red', () => {
    const { uf, red } = construirLocalConArtefactos({ ufId: 'uf1', localId: 'uf1-local', tipo: 'bano', artefactos: [{ id: 'inodoro', redes: ['AF'] }] })
    const datos = resolverDatosDeListadoDeMateriales(proyectoSimplificadaEstimado(uf, red), catalogoArtefactos, coeficientesMayoracion)
    expect(itemsDrezaDeLocal(datos).some((a) => a.red === 'AC')).toBe(false)
    expect(itemsDrezaDeLocal(datos).some((a) => a.etiqueta.toLowerCase().includes('reducci'))).toBe(false)
  })

  it('profesional + estimado: NUNCA genera estimación DREZA (gate de granularidad, mismo criterio que ACCESSORIES-DEFAULTS-01)', () => {
    const { uf, red } = construirLocalConArtefactos({ ufId: 'uf1', localId: 'uf1-local', tipo: 'bano', artefactos: [{ id: 'inodoro', redes: ['AF'] }] })
    const proyecto = proyectoBase({ ufs: [uf], red, configuracionHidraulica: { granularidadHidraulica: 'profesional', metodoPerdidaLocalizada: 'estimado' } })
    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)
    // Nota: el filtro excluye la unión/cupla recta (brief §9) -- también
    // es `origen: 'estimadoDreza'`/`sector: 'local'` (el único Tramo del
    // fixture mide 5 m y ES el representativo del Local), pero esa regla
    // corre SIEMPRE, independiente de este gate; no debe confundirse con
    // la estimación por sector que sí está gateada.
    expect(datos.accesorios.some((a) => a.origen === 'estimadoDreza' && a.sector === 'local' && a.etiqueta !== 'Cupla recta PPR')).toBe(false)
  })

  it('simplificada + detallado: NUNCA genera estimación DREZA (el usuario releva sus propios accesorios)', () => {
    const { uf, red } = construirLocalConArtefactos({ ufId: 'uf1', localId: 'uf1-local', tipo: 'bano', artefactos: [{ id: 'inodoro', redes: ['AF'] }] })
    const proyecto = proyectoBase({ ufs: [uf], red, configuracionHidraulica: { granularidadHidraulica: 'simplificada', metodoPerdidaLocalizada: 'detallado' } })
    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)
    expect(datos.accesorios.some((a) => a.origen === 'estimadoDreza' && a.sector === 'local' && a.etiqueta !== 'Cupla recta PPR')).toBe(false)
  })

  // Caso I (brief §13): artefacto con cantidad > 1.
  it('Caso I — artefacto con cantidad=3 conectado AF+AC: bocas/terminales/sobrepasos ponderan cantidad, sin duplicar por AF+AC', () => {
    const uf: UnidadFuncional = {
      id: 'uf1',
      nombre: 'uf1',
      niveles: [
        {
          id: 'uf1-nivel-1',
          nombre: 'Nivel 1',
          locales: [{ id: 'uf1-local', tipo: 'bano', regimen: 'domiciliario', artefactos: [{ id: 'lav-1', artefactoId: 'lavatorio', cantidad: 3, origen: 'normativo' }] }],
        },
      ],
    }
    const nodos: Nodo[] = [
      { id: 'n0-AF' }, { id: 'n1-AF' }, { id: 'nAF', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf1', localId: 'uf1-local', artefactoId: 'lav-1' } },
      { id: 'n0-AC' }, { id: 'n1-AC' }, { id: 'nAC', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf1', localId: 'uf1-local', artefactoId: 'lav-1' } },
    ]
    const tramos: Tramo[] = [
      { id: 't-raiz-AF', nodoOrigenId: 'n0-AF', nodoDestinoId: 'n1-AF', red: 'AF', longitud_m: 3, dnComercialAdoptado: '20 mm' },
      { id: 't-af', nodoOrigenId: 'n1-AF', nodoDestinoId: 'nAF', red: 'AF', longitud_m: 2, dnComercialAdoptado: '20 mm' },
      { id: 't-raiz-AC', nodoOrigenId: 'n0-AC', nodoDestinoId: 'n1-AC', red: 'AC', longitud_m: 3, dnComercialAdoptado: '20 mm' },
      { id: 't-ac', nodoOrigenId: 'n1-AC', nodoDestinoId: 'nAC', red: 'AC', longitud_m: 2, dnComercialAdoptado: '20 mm' },
    ]
    const proyecto = proyectoSimplificadaEstimado(uf, { nodos, tramos })
    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)
    const items = itemsDrezaDeLocal(datos)

    // n=3 bocas en cada red (cantidad=3, un solo Artefacto) => 2 tees + 1
    // codo terminal por red -- nunca 6 (no se duplica por participar en
    // AF y AC a la vez).
    expect(items.find((a) => a.red === 'AF' && a.etiqueta === 'Tee roscada PPR')?.cantidadComputada).toBe(2)
    expect(items.find((a) => a.red === 'AC' && a.etiqueta === 'Tee roscada PPR')?.cantidadComputada).toBe(2)
    // 1 sobrepaso por Artefacto conectado (no por boca ni por red): con
    // cantidad=3 son 3 sobrepasos, no 6 -- y como el Artefacto es AF+AC,
    // los 3 se asignan enteros a AC (HYD-OVERPASS-01), nunca a AF.
    expect(items.find((a) => a.red === 'AF' && a.etiqueta === 'Sobrepaso fusión')).toBeUndefined()
    expect(items.find((a) => a.red === 'AC' && a.etiqueta === 'Sobrepaso fusión')?.cantidadComputada).toBe(3)
  })
})

describe('resolverDatosDeListadoDeMateriales — estimación constructiva DREZA de Montantes (MATERIALS-ACCESSORIES-01)', () => {
  // Caso C (brief §13): Montante de 11 m que abastece 4 Locales.
  it('Caso C — Montante L=11m, 4 Locales: 1 llave, 3 tees, 1 codo de último Local, 5 codos de recorrido, sin reducción', () => {
    const ufs: UnidadFuncional[] = Array.from({ length: 4 }, (_, i) => ({
      id: `uf-l${i + 1}`,
      nombre: `uf-l${i + 1}`,
      niveles: [{ id: `uf-l${i + 1}-nivel-1`, nombre: 'Nivel 1', locales: [{ id: `local${i + 1}`, tipo: 'bano', regimen: 'domiciliario', artefactos: [{ id: `art${i + 1}`, artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }] }] }],
    }))
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1' }, { id: 'n2' }, { id: 'n3' }]
    const tramos: Tramo[] = [
      { id: 'm-seg0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF', longitud_m: 3, dnComercialAdoptado: '25 mm', montanteId: 'm1' },
      { id: 'm-seg1', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF', longitud_m: 3, dnComercialAdoptado: '25 mm', montanteId: 'm1' },
      { id: 'm-seg2', nodoOrigenId: 'n2', nodoDestinoId: 'n3', red: 'AF', longitud_m: 5, dnComercialAdoptado: '25 mm', montanteId: 'm1' },
    ]
    // Locales servidos: `derivarLocalesServidos` sólo cuenta lo que cuelga
    // AGUAS ABAJO de un segmento del Montante -- nunca lo que cuelga de
    // n0 (su raíz, aguas arriba del primer segmento). Los 4 Locales
    // cuelgan de n1/n2/n3/n3 (la punta con 2 salidas propias), así los 3
    // segmentos (n=4 locales, n-1=3 derivaciones) coinciden con el Caso C.
    const nodosDeLocal: [string, string][] = [['n1', 'local1'], ['n2', 'local2'], ['n3', 'local3'], ['n3', 'local4']]
    nodosDeLocal.forEach(([nodoId, localId], i) => {
      const artNodo = `nArt-${localId}`
      nodos.push({ id: artNodo, referencia: { tipo: 'artefacto', unidadFuncionalId: `uf-l${i + 1}`, localId, artefactoId: `art${i + 1}` } })
      tramos.push({ id: `t-feed-${localId}`, nodoOrigenId: nodoId, nodoDestinoId: artNodo, red: 'AF', longitud_m: 1, dnComercialAdoptado: '20 mm' })
    })
    const proyecto: Proyecto = {
      ...proyectoBase({ ufs, red: { nodos, tramos }, configuracionHidraulica: { granularidadHidraulica: 'simplificada', metodoPerdidaLocalizada: 'estimado' } }),
      montantes: [{ id: 'm1', red: 'AF' }],
    }

    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)
    const items = datos.accesorios.filter((a) => a.origen === 'estimadoDreza' && a.sector === 'montante')

    expect(items.find((a) => a.etiqueta === 'Llave de paso esférica')?.cantidadComputada).toBe(1)
    expect(items.find((a) => a.etiqueta === 'Tee de derivación (Montante)')?.cantidadComputada).toBe(3)
    expect(items.find((a) => a.etiqueta === 'Codo de último local (Montante)')?.cantidadComputada).toBe(1)
    expect(items.find((a) => a.etiqueta === 'Codo a 90° (recorrido de Montante)')?.cantidadComputada).toBe(5)
    expect(items.some((a) => a.etiqueta.toLowerCase().includes('reducci'))).toBe(false)

    // Uniones cada 4 m sobre los 11 m del Montante: floor(11/4) = 2.
    const union = datos.accesorios.find((a) => a.sector === 'montante' && a.etiqueta === 'Cupla recta PPR')
    expect(union?.cantidadComputada).toBe(2)
  })
})

describe('resolverDatosDeListadoDeMateriales — estimación constructiva DREZA de Colector principal (MATERIALS-ACCESSORIES-01)', () => {
  function proyectoColectorBase(): { nodos: Nodo[]; tramos: Tramo[] } {
    return {
      nodos: [{ id: 'n0' }, { id: 'n1' }, { id: 'nAcs', referencia: { tipo: 'produccionACS' } }],
      tramos: [
        { id: 't-general', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF', longitud_m: 5, dnComercialAdoptado: '32 mm' },
        { id: 't-acs', nodoOrigenId: 'n1', nodoDestinoId: 'nAcs', red: 'AF', longitud_m: 2, dnComercialAdoptado: '20 mm' },
      ],
    }
  }

  // Caso D (brief §13): colector con 3 Montantes, ACS y tanque elevado.
  // HYD-EST-NETWORK-01: Nsalidas ahora se deriva de la topología REAL
  // (nodos de bifurcación efectivamente atravesados por el tronco de
  // Colector), no de la mera existencia de una identidad `Montante` sin
  // segmentos -- un Montante sin ningún Tramo no tiene ningún camino
  // hidráulico al que pertenecer, así que ya no genera una Tee "fantasma"
  // (corrección legítima de este incremento, ver docs/HYD-EST-NETWORK-01.md:
  // antes, `Nsalidas = cantidad de identidades Montante`, sin verificar que
  // existiera topología). Los 3 Montantes de este caso reciben, por lo
  // tanto, topología real (cada uno con su propio segmento y Artefacto) en
  // una cadena de bifurcaciones -- m1 y m2 se derivan en nodos sucesivos, m3
  // es la salida final (codo, no Tee).
  it('Caso D — 3 Montantes (con topología real) + ACS + tanque: 1 llave, 2 tees de distribución, 1 codo, 1 tee ACS, 1 tee ruptor, 1 unión al tanque, 2 codos propios', () => {
    const { nodos, tramos } = proyectoColectorBase()
    // El Colector necesita demanda real aguas abajo para que su propio DN
    // resuelva (resolverDiametroComercialDeTramo ignora dnComercialAdoptado
    // sin Qc>0, CRIT de "nunca inventar").
    // Tronco de reparto EXPLÍCITO (t-tronco-1/2, sin `montanteId`) distinto
    // del segmento propio de cada Montante (t-mN-feed, arranca EN el nodo
    // de bifurcación, nunca aguas abajo del segmento de otro Montante) --
    // así ningún Montante "atraviesa" la pieza física de otro.
    nodos.push(
      { id: 'nBif1' },
      { id: 'nBif2' },
      { id: 'nM1Art', referencia: { tipo: 'artefacto', unidadFuncionalId: 'ufM1', localId: 'localM1', artefactoId: 'artM1' } },
      { id: 'nM2Art', referencia: { tipo: 'artefacto', unidadFuncionalId: 'ufM2', localId: 'localM2', artefactoId: 'artM2' } },
      { id: 'nM3Art', referencia: { tipo: 'artefacto', unidadFuncionalId: 'ufM3', localId: 'localM3', artefactoId: 'artM3' } },
    )
    tramos.push(
      { id: 't-tronco-1', nodoOrigenId: 'n1', nodoDestinoId: 'nBif1', red: 'AF', longitud_m: 1, dnComercialAdoptado: '25 mm' },
      { id: 't-m1-feed', nodoOrigenId: 'nBif1', nodoDestinoId: 'nM1Art', red: 'AF', longitud_m: 2, dnComercialAdoptado: '25 mm', montanteId: 'm1' },
      { id: 't-tronco-2', nodoOrigenId: 'nBif1', nodoDestinoId: 'nBif2', red: 'AF', longitud_m: 1, dnComercialAdoptado: '25 mm' },
      { id: 't-m2-feed', nodoOrigenId: 'nBif2', nodoDestinoId: 'nM2Art', red: 'AF', longitud_m: 3, dnComercialAdoptado: '20 mm', montanteId: 'm2' },
      { id: 't-m3-feed', nodoOrigenId: 'nBif2', nodoDestinoId: 'nM3Art', red: 'AF', longitud_m: 3, dnComercialAdoptado: '20 mm', montanteId: 'm3' },
    )
    const ufDeMontante = (id: string, localId: string, artefactoId: string): UnidadFuncional => ({
      id,
      nombre: id,
      niveles: [{ id: `${id}-nivel-1`, nombre: 'Nivel 1', locales: [{ id: localId, tipo: 'bano', regimen: 'domiciliario', artefactos: [{ id: artefactoId, artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }] }] }],
    })
    const proyecto: Proyecto = {
      ...proyectoBase({
        ufs: [ufDeMontante('ufM1', 'localM1', 'artM1'), ufDeMontante('ufM2', 'localM2', 'artM2'), ufDeMontante('ufM3', 'localM3', 'artM3')],
        red: { nodos, tramos },
        configuracionHidraulica: { granularidadHidraulica: 'simplificada', metodoPerdidaLocalizada: 'estimado' },
        configuracionAbastecimiento: { esquema: 'tanqueElevado', volumenTanqueElevadoAdoptado_m3: 1 },
      }),
      montantes: [{ id: 'm1', red: 'AF' }, { id: 'm2', red: 'AF' }, { id: 'm3', red: 'AF' }],
    }

    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)
    const items = datos.accesorios.filter((a) => a.origen === 'estimadoDreza' && a.sector === 'colectorPrincipal')

    expect(items.find((a) => a.etiqueta === 'Llave de paso esférica (general)')?.cantidadComputada).toBe(1)
    expect(items.find((a) => a.etiqueta === 'Tee de distribución (Colector)')?.cantidadComputada).toBe(2)
    expect(items.find((a) => a.etiqueta === 'Codo de última salida (Colector)')?.cantidadComputada).toBe(1)
    expect(items.find((a) => a.etiqueta === 'Tee de alimentación ACS')?.cantidadComputada).toBe(1)
    expect(items.find((a) => a.etiqueta === 'Tee de conexión de caño ruptor')?.cantidadComputada).toBe(1)
    expect(items.find((a) => a.etiqueta === 'Unión doble PPR (al tanque)')?.cantidadComputada).toBe(1)
    expect(items.find((a) => a.etiqueta === 'Codo a 90° (Colector)')?.cantidadComputada).toBe(2)
  })

  it('Caso D-bis — Montante sin topología propia (0 segmentos): no genera Tee "fantasma" en el Colector', () => {
    const { nodos, tramos } = proyectoColectorBase()
    nodos.push({ id: 'nM1Art', referencia: { tipo: 'artefacto', unidadFuncionalId: 'ufM1', localId: 'localM1', artefactoId: 'artM1' } })
    tramos.push({ id: 't-m1-feed', nodoOrigenId: 'n1', nodoDestinoId: 'nM1Art', red: 'AF', longitud_m: 3, dnComercialAdoptado: '25 mm', montanteId: 'm1' })
    const ufM1: UnidadFuncional = {
      id: 'ufM1',
      nombre: 'ufM1',
      niveles: [{ id: 'ufM1-nivel-1', nombre: 'Nivel 1', locales: [{ id: 'localM1', tipo: 'bano', regimen: 'domiciliario', artefactos: [{ id: 'artM1', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }] }] }],
    }
    const proyecto: Proyecto = {
      ...proyectoBase({
        ufs: [ufM1],
        red: { nodos, tramos },
        configuracionHidraulica: { granularidadHidraulica: 'simplificada', metodoPerdidaLocalizada: 'estimado' },
      }),
      // m2/m3: identidades SIN ningún Tramo propio (M2-TOPO-C, estado
      // válido) -- no tienen ningún camino hidráulico al que pertenecer,
      // así que no cuentan como salida del Colector.
      montantes: [{ id: 'm1', red: 'AF' }, { id: 'm2', red: 'AF' }, { id: 'm3', red: 'AF' }],
    }

    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)
    const items = datos.accesorios.filter((a) => a.origen === 'estimadoDreza' && a.sector === 'colectorPrincipal')

    // Nsalidas real = 1 (sólo m1 tiene topología) -> 0 Tees, 1 codo de
    // última salida (para m1, la única salida real).
    expect(items.find((a) => a.etiqueta === 'Tee de distribución (Colector)')).toBeUndefined()
    expect(items.find((a) => a.etiqueta === 'Codo de última salida (Colector)')?.cantidadComputada).toBe(1)
  })

  // HYD-EST-NETWORK-01: transición real de DN entre el Colector (32 mm,
  // proyectoColectorBase) y el primer segmento del Montante (25 mm,
  // dnComercialAdoptado explícito de la fixture) -- misma topología del
  // Caso D-bis, reusada porque ya trae una diferencia real de DN.
  it('Reducción por cambio de DN entre Colector y Montante: 1 pieza, DN de entrada/salida identificables, sin duplicar contra otros accesorios', () => {
    const { nodos, tramos } = proyectoColectorBase()
    nodos.push({ id: 'nM1Art', referencia: { tipo: 'artefacto', unidadFuncionalId: 'ufM1', localId: 'localM1', artefactoId: 'artM1' } })
    tramos.push({ id: 't-m1-feed', nodoOrigenId: 'n1', nodoDestinoId: 'nM1Art', red: 'AF', longitud_m: 3, dnComercialAdoptado: '25 mm', montanteId: 'm1' })
    const ufM1: UnidadFuncional = {
      id: 'ufM1',
      nombre: 'ufM1',
      niveles: [{ id: 'ufM1-nivel-1', nombre: 'Nivel 1', locales: [{ id: 'localM1', tipo: 'bano', regimen: 'domiciliario', artefactos: [{ id: 'artM1', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }] }] }],
    }
    const proyecto: Proyecto = {
      ...proyectoBase({
        ufs: [ufM1],
        red: { nodos, tramos },
        configuracionHidraulica: { granularidadHidraulica: 'simplificada', metodoPerdidaLocalizada: 'estimado' },
      }),
      montantes: [{ id: 'm1', red: 'AF' }],
    }

    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)
    const reducciones = datos.accesorios.filter((a) => a.origen === 'estimadoDreza' && a.etiqueta === 'Reducción')

    expect(reducciones).toHaveLength(1)
    expect(reducciones[0]!.sector).toBe('montante')
    expect(reducciones[0]!.cantidadComputada).toBe(1)
    expect(reducciones[0]!.dnComercial).toBe('32 mm → 25 mm')
  })

  // Caso E (brief §13): sin Montantes, 4 Locales alimentados directamente.
  it('Caso E — sin Montantes, 4 Locales directos: 3 tees de distribución + 1 codo de última salida', () => {
    const { nodos, tramos } = proyectoColectorBase()
    nodos.push({ id: 'nSplit' })
    tramos.push({ id: 't-split', nodoOrigenId: 'n1', nodoDestinoId: 'nSplit', red: 'AF', longitud_m: 1, dnComercialAdoptado: '32 mm' })

    const ufs: UnidadFuncional[] = []
    for (let i = 1; i <= 4; i++) {
      const localId = `local${i}`
      const artId = `art${i}`
      const nodoLocal = `nLocal${i}`
      const nodoArt = `nArt${i}`
      nodos.push({ id: nodoLocal }, { id: nodoArt, referencia: { tipo: 'artefacto', unidadFuncionalId: `uf${i}`, localId, artefactoId: artId } })
      tramos.push(
        { id: `t-feed-${localId}`, nodoOrigenId: 'nSplit', nodoDestinoId: nodoLocal, red: 'AF', longitud_m: 2, dnComercialAdoptado: '20 mm' },
        { id: `t-trunk-${localId}`, nodoOrigenId: nodoLocal, nodoDestinoId: nodoArt, red: 'AF', longitud_m: 1, dnComercialAdoptado: '20 mm' },
      )
      ufs.push({ id: `uf${i}`, nombre: `uf${i}`, niveles: [{ id: `uf${i}-nivel-1`, nombre: 'Nivel 1', locales: [{ id: localId, tipo: 'bano', regimen: 'domiciliario', artefactos: [{ id: artId, artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }] }] }] })
    }

    const proyecto = proyectoBase({ ufs, red: { nodos, tramos }, configuracionHidraulica: { granularidadHidraulica: 'simplificada', metodoPerdidaLocalizada: 'estimado' } })
    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)
    const items = datos.accesorios.filter((a) => a.origen === 'estimadoDreza' && a.sector === 'colectorPrincipal')

    expect(items.find((a) => a.etiqueta === 'Tee de distribución (Colector)')?.cantidadComputada).toBe(3)
    expect(items.find((a) => a.etiqueta === 'Codo de última salida (Colector)')?.cantidadComputada).toBe(1)
    // Sin tanque: nunca Tee de ruptor ni unión al tanque.
    expect(items.some((a) => a.etiqueta.includes('ruptor') || a.etiqueta.includes('tanque'))).toBe(false)
  })
})

describe('resolverDatosDeListadoDeMateriales — uniones/cuplas rectas cada 4 m (MATERIALS-ACCESSORIES-01, brief §9)', () => {
  function proyectoConLongitud(longitud_m: number): Proyecto {
    const uf = ufConArtefactos('uf1', 1)
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'nArt0', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf1', localId: 'uf1-local', artefactoId: 'uf1-art-0' } }]
    const tramos: Tramo[] = [{ id: 't-a', nodoOrigenId: 'n0', nodoDestinoId: 'nArt0', red: 'AF', longitud_m: longitud_m, dnComercialAdoptado: '20 mm' }]
    return proyectoBase({ ufs: [uf], red: { nodos, tramos } })
  }

  it.each([
    [3.9, 0],
    [4.0, 1],
    [7.9, 1],
    [8.0, 2],
    [9.0, 2],
  ])('%s m de PPR => %i unión/es recta/s', (longitud, esperado) => {
    const datos = resolverDatosDeListadoDeMateriales(proyectoConLongitud(longitud), catalogoArtefactos, coeficientesMayoracion)
    const union = datos.accesorios.find((a) => a.etiqueta === 'Cupla recta PPR')
    expect(union?.cantidadComputada ?? 0).toBe(esperado)
  })

  it('corre incluso en modo detallado/profesional (regla de empaquetado, no de estimación de pérdidas)', () => {
    // proyectoConLongitud usa la configuración por defecto de proyectoBase
    // ('detallado' + 'profesional') -- las uniones deben seguir apareciendo.
    const datos = resolverDatosDeListadoDeMateriales(proyectoConLongitud(8), catalogoArtefactos, coeficientesMayoracion)
    expect(datos.accesorios.find((a) => a.etiqueta === 'Cupla recta PPR')?.cantidadComputada).toBe(2)
  })

  it('no une AF con AC ni DN20 con DN25 (grupos independientes)', () => {
    const uf = ufConArtefactos('uf1', 2)
    const nodos: Nodo[] = [
      { id: 'n0AF' },
      { id: 'n0AC' },
      { id: 'nArt0', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf1', localId: 'uf1-local', artefactoId: 'uf1-art-0' } },
      { id: 'nArt1', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf1', localId: 'uf1-local', artefactoId: 'uf1-art-1' } },
    ]
    const tramos: Tramo[] = [
      { id: 't-af-dn20', nodoOrigenId: 'n0AF', nodoDestinoId: 'nArt0', red: 'AF', longitud_m: 8, dnComercialAdoptado: '20 mm' },
      { id: 't-ac-dn20', nodoOrigenId: 'n0AC', nodoDestinoId: 'nArt1', red: 'AC', longitud_m: 8, dnComercialAdoptado: '20 mm' },
    ]
    const proyecto = proyectoBase({ ufs: [uf], red: { nodos, tramos } })
    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)
    const uniones = datos.accesorios.filter((a) => a.etiqueta === 'Cupla recta PPR')

    expect(uniones).toHaveLength(2)
    expect(uniones.find((u) => u.red === 'AF')?.cantidadComputada).toBe(2)
    expect(uniones.find((u) => u.red === 'AC')?.cantidadComputada).toBe(2)
  })
})

describe('resolverDatosDeListadoDeMateriales — CRIT-A30 y no duplicación frente a Detailed (MATERIALS-ACCESSORIES-01)', () => {
  // Caso H (brief §13): cambio de DN sin/ con reducción explícita.
  it('Caso H — cambio de DN sin reducción explícita: 0 cuplas; con reducción explícita: 1 cupla', () => {
    const uf = ufConArtefactos('uf1', 1)
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'nMed' }, { id: 'nArt0', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf1', localId: 'uf1-local', artefactoId: 'uf1-art-0' } }]
    const tramoMenorSinReduccion: Tramo = { id: 't-20', nodoOrigenId: 'nMed', nodoDestinoId: 'nArt0', red: 'AF', longitud_m: 3, dnComercialAdoptado: '20 mm' }
    const tramos: Tramo[] = [
      { id: 't-25', nodoOrigenId: 'n0', nodoDestinoId: 'nMed', red: 'AF', longitud_m: 5, dnComercialAdoptado: '25 mm' },
      tramoMenorSinReduccion,
    ]
    const proyectoSinReduccion = proyectoBase({ ufs: [uf], red: { nodos, tramos }, configuracionHidraulica: { metodoPerdidaLocalizada: 'detallado' } })
    const datosSinReduccion = resolverDatosDeListadoDeMateriales(proyectoSinReduccion, catalogoArtefactos, coeficientesMayoracion)
    expect(datosSinReduccion.accesorios.filter((a) => a.etiqueta.toLowerCase().includes('reducci'))).toHaveLength(0)

    const tramoMenorConReduccion: Tramo = { ...tramoMenorSinReduccion, accesorios: [{ tipo: 'reducciones', cantidad: 1 }] }
    const proyectoConReduccion = proyectoBase({
      ufs: [uf],
      red: { nodos, tramos: [tramos[0]!, tramoMenorConReduccion] },
      configuracionHidraulica: { metodoPerdidaLocalizada: 'detallado' },
    })
    const datosConReduccion = resolverDatosDeListadoDeMateriales(proyectoConReduccion, catalogoArtefactos, coeficientesMayoracion)
    const reducciones = datosConReduccion.accesorios.filter((a) => a.etiqueta.toLowerCase().includes('reducci'))
    expect(reducciones).toHaveLength(1)
    expect(reducciones[0]?.cantidadComputada).toBe(1)
  })

  // Caso G (brief §13): no duplicación frente a Detailed.
  it('Caso G — accesorio explícito en modo Detailed: Materials no agrega una segunda pieza estimada DREZA para el mismo Local', () => {
    const uf = ufConArtefactos('uf1', 1)
    const nodos: Nodo[] = [{ id: 'n0' }, { id: 'nArt0', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf1', localId: 'uf1-local', artefactoId: 'uf1-art-0' } }]
    const tramos: Tramo[] = [{ id: 't-a', nodoOrigenId: 'n0', nodoDestinoId: 'nArt0', red: 'AF', longitud_m: 5, dnComercialAdoptado: '20 mm', accesorios: [{ tipo: 'llaveDePaso', cantidad: 1 }] }]
    const proyecto = proyectoBase({ ufs: [uf], red: { nodos, tramos }, configuracionHidraulica: { metodoPerdidaLocalizada: 'detallado' } })
    const datos = resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)

    expect(datos.accesorios.filter((a) => a.origen === 'definido' && a.etiqueta === 'Llave de paso')).toHaveLength(1)
    // El gate simplificada+estimado ni siquiera corre acá (proyecto
    // 'profesional'+'detallado'), así que ninguna estimación DREZA por
    // sector debe aparecer -- la única fila 'estimadoDreza' tolerable es
    // la unión/cupla recta (brief §9, siempre activa), que no es del
    // sector Local.
    expect(datos.accesorios.some((a) => a.origen === 'estimadoDreza' && a.sector === 'local')).toBe(false)
  })

  it('invariancia hidráulica: hf de HYD-EST es idéntica antes y después de computar Materials (no se toca ni se importa la fórmula)', () => {
    const { uf, red } = (() => {
      const ufBase = ufConArtefactos('uf1', 3)
      const nodos: Nodo[] = [{ id: 'n0' }, { id: 'n1' }, { id: 'nFan' }]
      const tramos: Tramo[] = [
        { id: 't-raiz', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF', longitud_m: 3, dnComercialAdoptado: '20 mm' },
        { id: 't-trunk', nodoOrigenId: 'n1', nodoDestinoId: 'nFan', red: 'AF', longitud_m: 5, dnComercialAdoptado: '20 mm' },
      ]
      for (let i = 0; i < 3; i++) {
        nodos.push({ id: `nArt${i}`, referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf1', localId: 'uf1-local', artefactoId: `uf1-art-${i}` } })
        tramos.push({ id: `t-art${i}`, nodoOrigenId: 'nFan', nodoDestinoId: `nArt${i}`, red: 'AF', longitud_m: 1, dnComercialAdoptado: '20 mm' })
      }
      return { uf: ufBase, red: { nodos, tramos } }
    })()
    const proyecto = proyectoBase({ ufs: [uf], red, configuracionHidraulica: { granularidadHidraulica: 'simplificada', metodoPerdidaLocalizada: 'estimado' } })

    const hfAntes = resolverPerdidaLocalizadaEstimadaDeLocal(proyecto, 'uf1', 'uf1-local', 'AF', catalogoArtefactos, catalogoSistemasDeTuberia)

    // Computar el listado de materiales (que agrega la estimación
    // constructiva DREZA para este mismo Local+red) no debe mutar
    // `proyecto` ni afectar en absoluto el resultado de HYD-EST -- son
    // capas completamente independientes (BOM de compra vs. hf de cálculo).
    resolverDatosDeListadoDeMateriales(proyecto, catalogoArtefactos, coeficientesMayoracion)

    const hfDespues = resolverPerdidaLocalizadaEstimadaDeLocal(proyecto, 'uf1', 'uf1-local', 'AF', catalogoArtefactos, catalogoSistemasDeTuberia)

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
