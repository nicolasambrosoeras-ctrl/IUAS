// UI-01C (D-δ.74) — el resumen compacto del proyecto compone resultados
// existentes y respeta "ausencia ≠ cero" (§24) y el contrato de M4 para
// `directa` (§25). No recalcula hidráulica: se apoya en las mismas
// primitivas que los paneles.
import { describe, it, expect } from 'vitest'
import type { Proyecto } from '../../modelo/proyecto'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import { backfillLongitudesDePredimensionamiento } from './backfillLongitudesDePredimensionamiento'
import { proyectoInicial } from './proyectoDeEjemplo'
import { conCotaDeNodo, conDnComercialAdoptadoDeTramo } from './actualizarRedHidraulica'
import { conPropiedadHorizontal, conTipoProvisionACS } from './actualizarConfiguracionMedidores'
import {
  conEsquemaDeAbastecimiento,
  conPeriodoConsumoMaximo,
  conVolumenTanqueElevadoAdoptado,
} from './actualizarConfiguracionAbastecimiento'
import {
  conDesnivelConexion,
  conDiametroNominalConexion,
  conPresionSobreAcera,
} from './actualizarParametrosDeConexion'
import { resolverResumenDeProyecto } from './resolverResumenDeProyecto'

const resumen = (p: Proyecto) => resolverResumenDeProyecto(p, catalogoArtefactos, coeficientesMayoracion)

// Mismo Proyecto canónico completo que la baseline transversal D-δ.70.
function canonico(): Proyecto {
  let p: Proyecto = backfillLongitudesDePredimensionamiento(proyectoInicial)
  p = conCotaDeNodo(p, 'n-general', 20)
  p = conDnComercialAdoptadoDeTramo(p, 't-general', '32 mm')
  p = conPropiedadHorizontal(p, true)
  p = conTipoProvisionACS(p, 'individual')
  p = conEsquemaDeAbastecimiento(p, 'tanqueElevado')
  p = conPeriodoConsumoMaximo(p, 2)
  p = conDiametroNominalConexion(p, 0.019)
  p = conPresionSobreAcera(p, 5)
  p = conDesnivelConexion(p, 0)
  p = conVolumenTanqueElevadoAdoptado(p, 5)
  return p
}

describe('resolverResumenDeProyecto (UI-01C)', () => {
  it('proyecto de ejemplo sin abastecimiento: Qc disponible, Reserva y Margen "Pendiente" (nunca 0)', () => {
    const r = resumen(backfillLongitudesDePredimensionamiento(proyectoInicial))
    expect(r.qc.tipo).toBe('valor')
    if (r.qc.tipo === 'valor') expect(r.qc.texto).toMatch(/0,73/)
    expect(r.reserva).toEqual({ tipo: 'pendiente' })
    expect(r.margenCritico).toEqual({ tipo: 'pendiente' })
    expect(r.margenCumple).toBeUndefined()
  })

  it('proyecto canónico completo: los tres campos resuelven, con el margen del baseline (CRIT-A39)', () => {
    const r = resumen(canonico())
    expect(r.qc.tipo).toBe('valor')
    expect(r.reserva.tipo).toBe('valor')
    if (r.reserva.tipo === 'valor') expect(r.reserva.texto).toMatch(/^\d[\d.,]* L$/)
    expect(r.margenCritico.tipo).toBe('valor')
    // Baseline transversal D-δ.70/D-δ.72: margen del crítico +3,836 m.c.a.
    // → CUMPLE, con el pelo de agua mínimo manual (20 m).
    //
    // D-δ.79 (CRIT-A39): el fixture canónico es modo Rápido + tanque
    // elevado simple, así que el pelo de agua mínimo EFECTIVO deja de ser
    // el valor manual y pasa a estimarse como
    // `desnivelConexion_m − 0,50 = 0 − 0,50 = −0,50 m`. El par histórico
    // (pelo manual 20 m / desnivelConexion_m 0 m) eran knobs independientes
    // antes de CRIT-A39 y quedó semánticamente inconsistente; el nuevo
    // margen del crítico es −16,664 m.c.a. → NO CUMPLE. Es el único cambio
    // numérico esperable por CRIT-A39 (M1/M3/M4 y Tabla N°1 sin tocar).
    if (r.margenCritico.tipo === 'valor') expect(r.margenCritico.texto).toBe('-16,664 m.c.a.')
    expect(r.margenCumple).toBe(false)
  })

  it('esquema "directa": la Reserva es "No aplica", no 0 (contrato de M4, §25)', () => {
    const directa = conPresionSobreAcera(conEsquemaDeAbastecimiento(canonico(), 'directa'), 25)
    expect(resumen(directa).reserva).toEqual({ tipo: 'noAplica' })
  })
})
