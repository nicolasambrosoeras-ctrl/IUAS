import { describe, it, expect } from 'vitest'
import type { ResultadoPerdidaDistribuidaDeTramo } from '../../motor/tuberias/resolverPerdidaDistribuidaDeTramo'
import { textosDePerdidaDistribuidaDeTramo, resolverCambioDeLongitud } from './resolverResultadoDeTramoParaUi'

describe('textosDePerdidaDistribuidaDeTramo', () => {
  it('L2-A: sinDemanda -- Qc="0,00", el resto en "—"', () => {
    const resultado: ResultadoPerdidaDistribuidaDeTramo = { tipo: 'sinDemanda', qc_lps: 0 }

    expect(textosDePerdidaDistribuidaDeTramo(resultado)).toEqual({
      qcTexto: '0,00',
      diReferenciaTexto: '—',
      diComercialTexto: '—',
      diEfectivoTexto: '—',
      vTexto: '—',
      limiteVelocidadTexto: '—',
      verificacionVelocidadTexto: '—',
      velocidadPorDebajoDelMinimo: false,
      hfTexto: '—',
    })
  })

  it('L2-B: sinCandidatoAdmisible -- Qc y Di de referencia disponibles, comercial/efectivo/V/hf en "—"', () => {
    const resultado: ResultadoPerdidaDistribuidaDeTramo = {
      tipo: 'sinCandidatoAdmisible',
      qc_lps: 0.15,
      n: 1,
      diReferenciaPredimensionamiento_mm: 9.772,
    }

    expect(textosDePerdidaDistribuidaDeTramo(resultado)).toEqual({
      qcTexto: '0,15',
      diReferenciaTexto: '9,77',
      diComercialTexto: '—',
      diEfectivoTexto: '—',
      vTexto: '—',
      limiteVelocidadTexto: '—',
      verificacionVelocidadTexto: '—',
      velocidadPorDebajoDelMinimo: false,
      hfTexto: '—',
    })
  })

  it('L2-C: sinLongitud -- diámetro/velocidad disponibles, hf="—"', () => {
    const resultado: ResultadoPerdidaDistribuidaDeTramo = {
      tipo: 'sinLongitud',
      qc_lps: 0.2,
      n: 1,
      diReferenciaPredimensionamiento_mm: 11.28,
      candidato: { denominacionComercial: '20 mm', diametroInteriorEfectivo_mm: 14.4 },
      velocidadReal_mps: 1.228,
      verificacionVelocidad: { tipo: 'admisible', limiteMinimo_mps: 1, limiteMaximo_mps: 3 },
      velocidadPorDebajoDelMinimo: false,
    }

    expect(textosDePerdidaDistribuidaDeTramo(resultado)).toEqual({
      qcTexto: '0,20',
      diReferenciaTexto: '11,28',
      diComercialTexto: '20 mm',
      diEfectivoTexto: '14,40',
      vTexto: '1,2',
      limiteVelocidadTexto: '1,0 – 3,0',
      verificacionVelocidadTexto: 'Admisible',
      velocidadPorDebajoDelMinimo: false,
      hfTexto: '—',
    })
  })

  it('L2-D: conPerdidaDistribuida -- Di comercial, Di efectivo, V, hf todos presentes', () => {
    const resultado: ResultadoPerdidaDistribuidaDeTramo = {
      tipo: 'conPerdidaDistribuida',
      qc_lps: 0.2,
      n: 1,
      diReferenciaPredimensionamiento_mm: 11.28,
      candidato: { denominacionComercial: '20 mm', diametroInteriorEfectivo_mm: 14.4 },
      velocidadReal_mps: 1.228,
      verificacionVelocidad: { tipo: 'admisible', limiteMinimo_mps: 1, limiteMaximo_mps: 3 },
      velocidadPorDebajoDelMinimo: false,
      longitud_m: 10,
      hf_m: 0.4567,
      detalle: { metodo: 'hazenWilliams', coeficienteC: 150, perdidaUnitaria_J_m_m: 0.04567 },
    }

    expect(textosDePerdidaDistribuidaDeTramo(resultado)).toEqual({
      qcTexto: '0,20',
      diReferenciaTexto: '11,28',
      diComercialTexto: '20 mm',
      diEfectivoTexto: '14,40',
      vTexto: '1,2',
      limiteVelocidadTexto: '1,0 – 3,0',
      verificacionVelocidadTexto: 'Admisible',
      velocidadPorDebajoDelMinimo: false,
      hfTexto: '0,457',
    })
  })

  it('L2-E (D-delta.27): conPerdidaDistribuida con velocidadPorDebajoDelMinimo=true -- se propaga tal cual, sin reinterpretar', () => {
    const resultado: ResultadoPerdidaDistribuidaDeTramo = {
      tipo: 'conPerdidaDistribuida',
      qc_lps: 0.08,
      n: 1,
      diReferenciaPredimensionamiento_mm: 7.14,
      candidato: { denominacionComercial: '20 mm', diametroInteriorEfectivo_mm: 14.4 },
      velocidadReal_mps: 0.4912189601601709,
      verificacionVelocidad: { tipo: 'noAdmisible', limiteMinimo_mps: 1, limiteMaximo_mps: 3 },
      velocidadPorDebajoDelMinimo: true,
      longitud_m: 3,
      hf_m: 0.123,
      detalle: { metodo: 'hazenWilliams', coeficienteC: 150, perdidaUnitaria_J_m_m: 0.041 },
    }

    expect(textosDePerdidaDistribuidaDeTramo(resultado)).toEqual({
      qcTexto: '0,08',
      diReferenciaTexto: '7,14',
      diComercialTexto: '20 mm',
      diEfectivoTexto: '14,40',
      vTexto: '0,5',
      limiteVelocidadTexto: '1,0 – 3,0',
      verificacionVelocidadTexto: 'Aceptada en el menor diámetro comercial (CRIT-A24)',
      velocidadPorDebajoDelMinimo: true,
      hfTexto: '0,123',
    })
    // La verificación real del motor sigue siendo 'noAdmisible' (evidencia
    // auditable conservada) -- pero el texto de UX nunca usa esa palabra
    // ni lenguaje de advertencia mientras velocidadPorDebajoDelMinimo sea
    // true (D-delta.27): no hay ninguna acción de dimensionamiento posible.
    expect(textosDePerdidaDistribuidaDeTramo(resultado).verificacionVelocidadTexto).not.toContain('No admisible')
  })
})

describe('resolverCambioDeLongitud', () => {
  it('campo vacío -> omitir (longitud no informada, nunca 0)', () => {
    expect(resolverCambioDeLongitud('')).toEqual({ tipo: 'omitir' })
  })

  it('0 -> establecer con longitud_m=0 (mecánicamente ingresable; CRIT-A20 sigue siendo la única defensa de dominio)', () => {
    expect(resolverCambioDeLongitud('0')).toEqual({ tipo: 'establecer', longitud_m: 0 })
  })

  it('valor positivo -> establecer', () => {
    expect(resolverCambioDeLongitud('3.5')).toEqual({ tipo: 'establecer', longitud_m: 3.5 })
  })

  it('valor negativo tipeado directamente -> ignorar, nunca establecer con longitud_m<0', () => {
    expect(resolverCambioDeLongitud('-1')).toEqual({ tipo: 'ignorar' })
    expect(resolverCambioDeLongitud('-0.1')).toEqual({ tipo: 'ignorar' })
  })

  it('bajar con la flecha desde 0 dispara onChange con texto "-1" (comportamiento nativo del input numérico) -> ignorar, nunca -1', () => {
    // Mismo caso que el anterior, documentado explícitamente porque es el
    // escenario real que reprodujo el bug: la flecha descendente del
    // <input type="number"> en 0 produce el string "-1" en el evento.
    expect(resolverCambioDeLongitud('-1')).toEqual({ tipo: 'ignorar' })
  })

  it('texto no numérico -> ignorar (NaN, mismo criterio que antes de este incremento)', () => {
    expect(resolverCambioDeLongitud('abc')).toEqual({ tipo: 'ignorar' })
  })
})
