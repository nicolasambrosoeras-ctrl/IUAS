// HYD-EST-NETWORK-01: cobertura dirigida de la incidencia hidráulica por
// camino de los accesorios físicos estimados de Montante/Colector. Mismo
// patrón de fixture que `montanteTees.integracion.test.ts` y
// `resolverAccesoriosFisicosEstimadosDeRed.test.ts`.
import { describe, it, expect } from 'vitest'
import type { Local, Proyecto, UnidadFuncional } from '../../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../../normativa/eras-2023/catalogo-artefactos'
import { catalogoSistemasDeTuberia } from '../sistemaDeTuberia'
import { agregarLocalAMontante, reconstruirCadena } from '../../../interfaz/paginas/reconciliarMontante'
import { conMontanteNuevo } from '../../../interfaz/paginas/montantesDelProyecto'
import { conDnComercialAdoptadoDeTramo } from '../../../interfaz/paginas/actualizarRedHidraulica'
import { obtenerCaminoHaciaOrigen } from '../topologia/obtenerCaminoHaciaOrigen'
import { resolverAccesoriosFisicosEstimadosDeRed } from '../topologia/resolverAccesoriosFisicosEstimadosDeRed'
import { acumularPerdidaLocalizadaEstimadaDeMontanteYColector } from './acumularPerdidaLocalizadaEstimadaDeMontanteYColector'

function local(id: string, cotaPiso_m: number): Local {
  return {
    id,
    tipo: 'bano',
    regimen: 'domiciliario',
    cotaPiso_m,
    artefactos: [{ id: `${id}-art`, artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }],
  }
}

function rama(id: string): { nodos: Nodo[]; tramos: Tramo[] } {
  return {
    nodos: [
      { id: `n-${id}` },
      { id: `n-${id}-t`, referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: id, artefactoId: `${id}-art` } },
    ],
    tramos: [
      { id: `t-${id}`, nodoOrigenId: 'n-af', nodoDestinoId: `n-${id}`, red: 'AF', accesorios: [] },
      { id: `t-${id}-t`, nodoOrigenId: `n-${id}`, nodoDestinoId: `n-${id}-t`, red: 'AF', accesorios: [] },
    ],
  }
}

function proyectoBase(cotas: readonly number[], sistemaDeTuberiaId: string): Proyecto {
  const uf: UnidadFuncional = {
    id: 'uf-1',
    nombre: 'UF 1',
    niveles: [{ id: 'uf-1-nivel-1', nombre: 'Nivel 1', nivel: 0, locales: cotas.map((cota, i) => local(`l-${i + 1}`, cota)) }],
  }
  const ramas = uf.niveles[0]!.locales.map((l) => rama(l.id))
  const redHidraulica: RedHidraulica = {
    nodos: [{ id: 'n-gen' }, { id: 'n-af' }, ...ramas.flatMap((r) => r.nodos)],
    tramos: [{ id: 't-gen', nodoOrigenId: 'n-gen', nodoDestinoId: 'n-af', red: 'AF', accesorios: [] }, ...ramas.flatMap((r) => r.tramos)],
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
      sistemaDeTuberiaId,
    },
  }
}

function montanteAfConLocales(cotas: readonly number[], sistemaDeTuberiaId: string): { proyecto: Proyecto; montanteId: string } {
  const creado = conMontanteNuevo(proyectoBase(cotas, sistemaDeTuberiaId), 'AF')
  const { montanteId } = creado
  let proyecto = creado.proyecto
  cotas.forEach((_, i) => {
    const r = agregarLocalAMontante(proyecto, montanteId, 'uf-1', `l-${i + 1}`)
    if (r.tipo !== 'reconciliado') throw new Error(`agregarLocalAMontante(l-${i + 1}) -> ${r.tipo}`)
    proyecto = r.proyecto
  })
  return { proyecto, montanteId }
}

function camino(proyecto: Proyecto, nodoTerminalId: string) {
  const c = obtenerCaminoHaciaOrigen(proyecto.redHidraulica!, nodoTerminalId)
  if (c.tipo !== 'camino') throw new Error(`fixture inválida: se esperaba un camino, se obtuvo ${c.tipo}`)
  return c
}

describe('acumularPerdidaLocalizadaEstimadaDeMontanteYColector', () => {
  it('sistema distinto de Acqua System: siempre 0 (sin catálogo propio, nunca se inventa un Ks) -- ni siquiera intenta resolver velocidad', () => {
    // Único sistema comercial catalogado hoy es Acqua System
    // (`catalogoSistemasDeTuberia`); se arma el proyecto con Acqua (para
    // que la topología/DN resuelvan) y se sustituye SÓLO el id de sistema
    // en la llamada, para ejercitar la rama "cualquier otro sistema" sin
    // necesitar un segundo catálogo comercial completo en el fixture.
    const { proyecto } = montanteAfConLocales([0, 3, 7, 11], 'acquaSystemMagnumPn20')
    const { items } = resolverAccesoriosFisicosEstimadosDeRed(proyecto, catalogoArtefactos)
    const proyectoOtroSistema: Proyecto = {
      ...proyecto,
      configuracionHidraulica: { ...proyecto.configuracionHidraulica, sistemaDeTuberiaId: 'otroSistemaCualquiera' },
    }
    const resultado = acumularPerdidaLocalizadaEstimadaDeMontanteYColector(
      proyectoOtroSistema,
      camino(proyecto, 'n-l-4-t'),
      items,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
    )
    expect(resultado).toEqual({ tipo: 'acumulada', hf_m: 0, detalle: [] })
  })

  it('Acqua System: el Local inferior (l-1) acumula menos ΣK que el superior (l-4), que atraviesa todas las derivaciones', () => {
    const { proyecto, montanteId } = montanteAfConLocales([0, 3, 7, 11], 'acquaSystemMagnumPn20')
    const { items } = resolverAccesoriosFisicosEstimadosDeRed(proyecto, catalogoArtefactos)
    expect(items.filter((i) => i.montanteId === montanteId)).not.toHaveLength(0)

    const resultadoL1 = acumularPerdidaLocalizadaEstimadaDeMontanteYColector(
      proyecto,
      camino(proyecto, 'n-l-1-t'),
      items,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
    )
    const resultadoL4 = acumularPerdidaLocalizadaEstimadaDeMontanteYColector(
      proyecto,
      camino(proyecto, 'n-l-4-t'),
      items,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
    )
    expect(resultadoL1.tipo).toBe('acumulada')
    expect(resultadoL4.tipo).toBe('acumulada')
    if (resultadoL1.tipo !== 'acumulada' || resultadoL4.tipo !== 'acumulada') return

    expect(resultadoL1.hf_m).toBeGreaterThan(0)
    expect(resultadoL4.hf_m).toBeGreaterThan(resultadoL1.hf_m)

    // l-1 ve su propia Tee (1) + la llave general -- nunca las Tees de los
    // Locales servidos por encima (2 y 3).
    const teesEnL1 = resultadoL1.detalle.filter((d) => d.tipo === 'teeDerivacion')
    expect(teesEnL1).toHaveLength(1)
    const teesEnL4 = resultadoL4.detalle.filter((d) => d.tipo === 'teeDerivacion')
    expect(teesEnL4).toHaveLength(3)
  })

  it('reducción por cambio real de DN: Ks=0,85 (salto mediata, catálogo oficial) sólo en el camino que atraviesa el Tramo de la transición', () => {
    const { proyecto: base, montanteId } = montanteAfConLocales([0, 3, 7, 11], 'acquaSystemMagnumPn20')
    const cadena = reconstruirCadena(base.redHidraulica!, montanteId)!
    const ultimoSegmentoId = cadena.segmentos[cadena.segmentos.length - 1]!.id
    const proyecto = conDnComercialAdoptadoDeTramo(base, ultimoSegmentoId, '32 mm')
    const { items } = resolverAccesoriosFisicosEstimadosDeRed(proyecto, catalogoArtefactos)
    expect(items.filter((i) => i.tipo === 'reduccion')).toHaveLength(1)

    const resultadoL1 = acumularPerdidaLocalizadaEstimadaDeMontanteYColector(
      proyecto,
      camino(proyecto, 'n-l-1-t'),
      items,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
    )
    const resultadoL4 = acumularPerdidaLocalizadaEstimadaDeMontanteYColector(
      proyecto,
      camino(proyecto, 'n-l-4-t'),
      items,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
    )
    expect(resultadoL1.tipo).toBe('acumulada')
    expect(resultadoL4.tipo).toBe('acumulada')
    if (resultadoL1.tipo !== 'acumulada' || resultadoL4.tipo !== 'acumulada') return

    // l-1 (el más bajo) no atraviesa el último segmento -> nunca ve la
    // reducción.
    expect(resultadoL1.detalle.some((d) => d.tipo === 'reduccion')).toBe(false)

    // l-4 (servido por el último segmento) sí la ve, con Ks=0,85 (salto
    // "mediata" -- 20 mm a 32 mm, 2 escalones en la serie nominal).
    const reduccionEnL4 = resultadoL4.detalle.find((d) => d.tipo === 'reduccion')
    expect(reduccionEnL4).toBeDefined()
    expect(reduccionEnL4!.ks).toBeCloseTo(0.85, 6)
    expect(reduccionEnL4!.hf_m).toBeGreaterThan(0)
  })

  it('llave general del Montante aparece en TODOS los caminos servidos por ese Montante', () => {
    const { proyecto } = montanteAfConLocales([0, 3, 7, 11], 'acquaSystemMagnumPn20')
    const { items } = resolverAccesoriosFisicosEstimadosDeRed(proyecto, catalogoArtefactos)
    for (const terminal of ['n-l-1-t', 'n-l-2-t', 'n-l-3-t', 'n-l-4-t']) {
      const resultado = acumularPerdidaLocalizadaEstimadaDeMontanteYColector(
        proyecto,
        camino(proyecto, terminal),
        items,
        catalogoArtefactos,
        catalogoSistemasDeTuberia,
      )
      expect(resultado.tipo).toBe('acumulada')
      if (resultado.tipo !== 'acumulada') return
      expect(resultado.detalle.some((d) => d.tipo === 'llaveDePaso')).toBe(true)
    }
  })
})
