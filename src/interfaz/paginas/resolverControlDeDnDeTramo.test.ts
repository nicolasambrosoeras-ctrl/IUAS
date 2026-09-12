// D-δ.52 Parte A (§4/§5/§10/§11, tests D2/D3/D10/D11): view-model del
// control ↓/DN/↑/Auto. ↑/↓ se mueven por el catálogo comercial REAL; se
// deshabilitan en los extremos.
import { describe, it, expect } from 'vitest'
import type { MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { conDnComercialAdoptadoDeTramo } from './actualizarRedHidraulica'
import { resolverControlDeDnDeTramo, denominacionesComercialesDelSistema } from './resolverControlDeDnDeTramo'

function base(): Proyecto {
  const metadatos: MetadatosProyecto = {
    nombre: 'P', obra: 'O', comitente: 'C', fecha: '2026-09-07', schemaVersion: '1.0.0', versionNormativa: 'eras-2023',
  }
  const parametros: ParametrosProyecto = { tipoDeProyecto: 'viviendaIndividual', presionSobreAcera_m: 0, alturaArtefactoMasDesfavorable_m: 0 }
  const uf: UnidadFuncional = {
    id: 'uf-1',
    nombre: 'UF 1',
    niveles: [
      {
        id: 'uf-1-nivel-1',
        nombre: 'Nivel 1',
        nivel: 0,
        cotaHidraulicaReferencia_m: 1,
        locales: [
          {
            id: 'l-bano',
            tipo: 'bano',
            regimen: 'domiciliario',
            artefactos: [
              { id: 'a1', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' },
              { id: 'a2', artefactoId: 'receptaculoDucha', cantidad: 1, origen: 'normativo' },
            ],
          },
        ],
      },
    ],
  }
  const r = (a: string) => ({ tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'l-bano', artefactoId: a }) as const
  const nodos: Nodo[] = [
    { id: 'n-general' },
    { id: 'n0' },
    { id: 'n-bano' },
    { id: 'n-lav', referencia: r('a1') },
    { id: 'n-duc', referencia: r('a2') },
  ]
  const tramos: Tramo[] = [
    { id: 't-general', nodoOrigenId: 'n-general', nodoDestinoId: 'n0', red: 'AF', longitud_m: 10 },
    { id: 't-af', nodoOrigenId: 'n0', nodoDestinoId: 'n-bano', red: 'AF', longitud_m: 5 },
    { id: 't-lav', nodoOrigenId: 'n-bano', nodoDestinoId: 'n-lav', red: 'AF' },
    { id: 't-duc', nodoOrigenId: 'n-bano', nodoDestinoId: 'n-duc', red: 'AF' },
  ]
  const redHidraulica: RedHidraulica = { nodos, tramos }
  return {
    metadatos,
    parametros,
    unidadesFuncionales: [uf],
    redHidraulica,
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'estimado',
      granularidadHidraulica: 'simplificada',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

function control(p: Proyecto, tramoId = 't-af') {
  return resolverControlDeDnDeTramo(p, tramoId, catalogoArtefactos)
}

describe('resolverControlDeDnDeTramo (D-δ.52)', () => {
  it('sin override: disponible, origen automatico, siguiente/anterior son denominaciones reales del catálogo', () => {
    const c = control(base())
    expect(c.disponible).toBe(true)
    expect(c.origen).toBe('automatico')
    expect(c.denominacionAdoptada).toMatch(/mm$/)
    // el catálogo real tiene 20..125 mm: para un DN intermedio hay ambos.
    expect(c.siguiente).toMatch(/mm$/)
    expect(c.anterior).toMatch(/mm$/)
  })

  it('D2: ↑ propone la denominacion inmediata superior del catálogo (nunca "DN+5")', () => {
    const c = control(base())
    // aplicar el override propuesto por "siguiente" y verificar que ahora
    // el adoptado es esa denominacion.
    const conArriba = conDnComercialAdoptadoDeTramo(base(), 't-af', c.siguiente!)
    const c2 = control(conArriba)
    expect(c2.origen).toBe('manual')
    expect(c2.denominacionAdoptada).toBe(c.siguiente)
  })

  it('D3: ↓ desde el override vuelve a la denominacion inmediata inferior', () => {
    const c0 = control(base())
    const arriba = conDnComercialAdoptadoDeTramo(base(), 't-af', c0.siguiente!)
    const cArriba = control(arriba)
    const abajo = conDnComercialAdoptadoDeTramo(arriba, 't-af', cArriba.anterior!)
    expect(control(abajo).denominacionAdoptada).toBe(c0.denominacionAdoptada)
  })

  it('D10: ↑ deshabilitado (siguiente === null) cuando el adoptado es el mayor del catálogo', () => {
    const p = conDnComercialAdoptadoDeTramo(base(), 't-af', '125 mm')
    const c = control(p)
    expect(c.denominacionAdoptada).toBe('125 mm')
    expect(c.siguiente).toBeNull()
    expect(c.anterior).toBe('110 mm')
  })

  it('D11: ↓ deshabilitado (anterior === null) cuando el adoptado es el menor del catálogo', () => {
    const p = conDnComercialAdoptadoDeTramo(base(), 't-af', '20 mm')
    const c = control(p)
    expect(c.denominacionAdoptada).toBe('20 mm')
    expect(c.anterior).toBeNull()
    expect(c.siguiente).toBe('25 mm')
  })

  it('D4: quitar el override (Auto) vuelve a origen automatico', () => {
    const conOverride = conDnComercialAdoptadoDeTramo(base(), 't-af', '90 mm')
    expect(control(conOverride).origen).toBe('manual')
    const auto = conDnComercialAdoptadoDeTramo(conOverride, 't-af', undefined)
    expect(control(auto).origen).toBe('automatico')
    expect(auto.redHidraulica!.tramos.find((t) => t.id === 't-af')!.dnComercialAdoptado).toBeUndefined()
  })

  it('denominacionesComercialesDelSistema devuelve el set real del sistema', () => {
    const set = denominacionesComercialesDelSistema('acquaSystemMagnumPn20')
    expect(set.has('20 mm')).toBe(true)
    expect(set.has('125 mm')).toBe(true)
    expect(set.has('999 mm')).toBe(false)
  })
})
