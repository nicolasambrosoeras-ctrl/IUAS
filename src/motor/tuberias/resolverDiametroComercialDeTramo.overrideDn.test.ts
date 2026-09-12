// D-δ.52 Parte A (§2/§8/§8BIS, tests D1/D5-D9/D14): override manual del
// diámetro comercial adoptado. El DN adoptado ES el diámetro efectivo de
// cálculo -- V y verificación se resuelven de nuevo con él; Qc no cambia.
import { describe, it, expect } from 'vitest'
import type { MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { catalogoSistemasDeTuberia } from './sistemaDeTuberia'
import { calcularVelocidad } from './perdidaCarga/darcyWeisbach/calcularVelocidad'
import { resolverDiametroComercialDeTramo } from './resolverDiametroComercialDeTramo'

function metadatos(): MetadatosProyecto {
  return { nombre: 'P', obra: 'O', comitente: 'C', fecha: '2026-09-07', schemaVersion: '1.0.0', versionNormativa: 'eras-2023' }
}
function parametros(): ParametrosProyecto {
  return { tipoDeProyecto: 'viviendaIndividual', presionSobreAcera_m: 0, alturaArtefactoMasDesfavorable_m: 0 }
}

// Baño con lavatorio + ducha + bidet + inodoro (AF) colgando de un tramo
// troncal t-af: n hidráulico alto -> Qc que resuelve automáticamente en un
// DN intermedio, con margen para subir y bajar.
function proyecto(dnComercialAdoptado?: string): Proyecto {
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
              { id: 'a3', artefactoId: 'bidet', cantidad: 1, origen: 'normativo' },
              { id: 'a4', artefactoId: 'inodoroDeposito', cantidad: 1, origen: 'normativo' },
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
    { id: 'n-bid', referencia: r('a3') },
    { id: 'n-ino', referencia: r('a4') },
  ]
  const tAf: Tramo =
    dnComercialAdoptado === undefined
      ? { id: 't-af', nodoOrigenId: 'n0', nodoDestinoId: 'n-bano', red: 'AF', longitud_m: 5 }
      : { id: 't-af', nodoOrigenId: 'n0', nodoDestinoId: 'n-bano', red: 'AF', longitud_m: 5, dnComercialAdoptado }
  const tramos: Tramo[] = [
    { id: 't-general', nodoOrigenId: 'n-general', nodoDestinoId: 'n0', red: 'AF', longitud_m: 10 },
    tAf,
    { id: 't-lav', nodoOrigenId: 'n-bano', nodoDestinoId: 'n-lav', red: 'AF' },
    { id: 't-duc', nodoOrigenId: 'n-bano', nodoDestinoId: 'n-duc', red: 'AF' },
    { id: 't-bid', nodoOrigenId: 'n-bano', nodoDestinoId: 'n-bid', red: 'AF' },
    { id: 't-ino', nodoOrigenId: 'n-bano', nodoDestinoId: 'n-ino', red: 'AF' },
  ]
  const redHidraulica: RedHidraulica = { nodos, tramos }
  return {
    metadatos: metadatos(),
    parametros: parametros(),
    unidadesFuncionales: [uf],
    redHidraulica,
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'detallado',
      granularidadHidraulica: 'profesional',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

function resolver(p: Proyecto) {
  return resolverDiametroComercialDeTramo(p, 't-af', catalogoArtefactos, catalogoSistemasDeTuberia)
}

describe('resolverDiametroComercialDeTramo -- override manual de DN (D-δ.52)', () => {
  it('D1: sin override -> origen automatico y candidatoAutomatico === candidato', () => {
    const r = resolver(proyecto())
    expect(r.tipo).toBe('conCandidato')
    if (r.tipo !== 'conCandidato') return
    expect(r.origen).toBe('automatico')
    expect(r.candidatoAutomatico).toEqual(r.candidato)
  })

  it('D5/D6: override a un DN SUPERIOR -> candidato = ese DN, V recalculada con su Di, Qc INALTERADO', () => {
    const auto = resolver(proyecto())
    if (auto.tipo !== 'conCandidato') throw new Error('auto sin candidato')

    const manual = resolver(proyecto('90 mm'))
    if (manual.tipo !== 'conCandidato') throw new Error('manual sin candidato')

    expect(manual.origen).toBe('manual')
    expect(manual.candidato.denominacionComercial).toBe('90 mm')
    expect(manual.candidatoAutomatico).toEqual(auto.candidato) // "DN recomendado" sigue disponible
    // Qc no cambia con el DN.
    expect(manual.qc_lps).toBe(auto.qc_lps)
    // V se resuelve con el Di del DN adoptado, NO con el automatico.
    expect(manual.velocidadReal_mps).toBeCloseTo(calcularVelocidad(manual.qc_lps, manual.candidato.diametroInteriorEfectivo_mm), 10)
    expect(manual.velocidadReal_mps).not.toBeCloseTo(auto.velocidadReal_mps, 6)
    // DN mayor -> V menor.
    expect(manual.velocidadReal_mps).toBeLessThan(auto.velocidadReal_mps)
  })

  it('D9: override a un DN INFERIOR no admisible -> se adopta igual, con verificacion noAdmisible', () => {
    const manual = resolver(proyecto('20 mm'))
    if (manual.tipo !== 'conCandidato') throw new Error('manual sin candidato')
    expect(manual.origen).toBe('manual')
    expect(manual.candidato.denominacionComercial).toBe('20 mm')
    // 4 terminales AF en un Baño -> Qc alto -> DN20 da V fuera de rango.
    expect(manual.verificacionVelocidad.tipo).toBe('noAdmisible')
    expect(manual.velocidadPorDebajoDelMinimo).toBe(false) // no es el fallback de D-δ.27
  })

  it('D14: override a una denominacion que NO existe en el sistema vigente -> se ignora, vuelve a automatico', () => {
    const auto = resolver(proyecto())
    const manualInvalido = resolver(proyecto('999 mm (inexistente)'))
    expect(manualInvalido).toEqual(auto)
    if (manualInvalido.tipo !== 'conCandidato') return
    expect(manualInvalido.origen).toBe('automatico')
  })

  it('D2/D3: adoptar exactamente el DN recomendado tambien cuenta como override manual explicito', () => {
    const auto = resolver(proyecto())
    if (auto.tipo !== 'conCandidato') throw new Error()
    const manualIgual = resolver(proyecto(auto.candidato.denominacionComercial))
    if (manualIgual.tipo !== 'conCandidato') throw new Error()
    expect(manualIgual.origen).toBe('manual')
    expect(manualIgual.candidato).toEqual(auto.candidato)
    expect(manualIgual.velocidadReal_mps).toBeCloseTo(auto.velocidadReal_mps, 10)
  })
})
