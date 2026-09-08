// Baseline funcional transversal M1 -> M2 -> M3 -> M4 (D-δ.70).
//
// No es un test unitario más: las fórmulas y los contratos por módulo ya
// están cubiertos exhaustivamente (CRIT-A*, D-δ.59/60/69). Lo que acá se
// fija -- y hasta ahora ningún test hacía en un solo lugar -- es que UN
// Proyecto real atraviesa los cuatro módulos de forma coherente,
// reactiva y sin contaminación cruzada, replicando el MISMO cableado que
// hace la UI (`MotorDemandaPantalla` + los paneles).
//
// Fixture: `proyectoInicial` -- la instalación doméstica canónica que ve
// el usuario en el navegador (1 UF, 5 Locales, 11 artefactos, red AF+AC
// con producción de ACS). Sobre ella se aplican los updaters puros
// reales para llegar a un caso rico: M3 PH + ACS individual, M4 tanque
// elevado con Tc / DN de conexión / desnivel / capacidad adoptada, y un
// override de DN comercial en un tramo.
//
// Si algo de esto cambia hay que actualizar `BASELINE-FUNCIONAL-M1-M4.md`
// en el mismo commit: este archivo es la evidencia ejecutable de ese
// documento.
import { describe, it, expect } from 'vitest'
import { proyectoInicial } from './interfaz/paginas/proyectoDeEjemplo'
import type { Proyecto } from './modelo/proyecto'
import { catalogoArtefactos } from './normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from './normativa/eras-2023/coeficientes-mayoracion'
import { catalogoSistemasDeTuberia } from './motor/tuberias/sistemaDeTuberia'
import { catalogoMaterialesTuberia } from './motor/tuberias/materialTuberia'
import { calcularSimultaneidad } from './motor/demanda/simultaneidad/calcularSimultaneidad'
import { resolverEstadoModulo2 } from './motor/modulo2/resolverEstadoModulo2'
import { resolverEstadoModulo3 } from './motor/modulo3/resolverEstadoModulo3'
import { resolverEstadoModulo4 } from './motor/modulo4/resolverEstadoModulo4'
import { resolverOrigenHidraulicoEfectivo } from './motor/modulo4/resolverOrigenHidraulico'
import {
  resolverPerdidasDeMedidoresParaTerminal,
  type OrigenHidraulicoDeMedidores,
} from './motor/modulo3/resolverPerdidasDeMedidoresParaTerminal'
import { resolverRedDeTerminal } from './interfaz/paginas/resolverRedDeTerminal'
import { backfillLongitudesDePredimensionamiento } from './interfaz/paginas/backfillLongitudesDePredimensionamiento'
import { conPropiedadHorizontal, conTipoProvisionACS } from './interfaz/paginas/actualizarConfiguracionMedidores'
import {
  conEsquemaDeAbastecimiento,
  conPeriodoConsumoMaximo,
  conVolumenTanqueElevadoAdoptado,
} from './interfaz/paginas/actualizarConfiguracionAbastecimiento'
import {
  conDesnivelConexion,
  conDiametroNominalConexion,
  conPresionSobreAcera,
} from './interfaz/paginas/actualizarParametrosDeConexion'
import { conCotaDeNodo, conDnComercialAdoptadoDeTramo } from './interfaz/paginas/actualizarRedHidraulica'

// --- réplica EXACTA del cableado de MotorDemandaPantalla / paneles ------

function qcGlobal(p: Proyecto): number | undefined {
  const r = calcularSimultaneidad({
    proyecto: p,
    normativa: { catalogoArtefactos, coeficientesMayoracion },
  }).resultados['qc']
  return r === undefined || 'estado' in r ? undefined : r.valor
}

// PanelDePresionDeModulo2: origen + Pdisponible + hfMedidor por terminal.
function balanceM2(p: Proyecto) {
  const esquema = p.configuracionAbastecimiento?.esquema
  const origenEfectivo = esquema === undefined ? undefined : resolverOrigenHidraulicoEfectivo(esquema)
  const presionDisponible_mca =
    origenEfectivo === 'tanqueElevado'
      ? 0
      : origenEfectivo === 'directa'
        ? p.parametros.presionSobreAcera_m
        : undefined
  const origenHidraulico: OrigenHidraulicoDeMedidores | undefined =
    origenEfectivo === 'tanqueElevado'
      ? 'tanqueElevado'
      : origenEfectivo === 'directa'
        ? 'alimentacionDirecta'
        : undefined
  const estadoModulo3 = resolverEstadoModulo3(p, catalogoArtefactos, coeficientesMayoracion)
  const nodosTerminales =
    p.redHidraulica?.nodos.filter((n) => n.referencia?.tipo === 'artefacto') ?? []

  const hfMedidorDeTerminal = (nodoTerminalId: string): number | undefined => {
    if (origenHidraulico === undefined) return undefined
    const nodo = nodosTerminales.find((n) => n.id === nodoTerminalId)
    const red = resolverRedDeTerminal(p, nodoTerminalId)
    if (nodo === undefined || red === undefined || nodo.referencia?.tipo !== 'artefacto') return undefined
    const perdidas = resolverPerdidasDeMedidoresParaTerminal({
      estadoModulo3,
      configuracionMedidores: p.configuracionMedidores,
      unidadFuncionalIdDelTerminal: nodo.referencia.unidadFuncionalId,
      redDelTerminal: red,
      origenHidraulico,
    })
    return perdidas.estado === 'determinadas' ? perdidas.hfTotal_mca : undefined
  }

  const estado = resolverEstadoModulo2(
    p,
    presionDisponible_mca,
    hfMedidorDeTerminal,
    catalogoArtefactos,
    catalogoSistemasDeTuberia,
    catalogoMaterialesTuberia,
  )
  return { estado, origenEfectivo, presionDisponible_mca }
}

function margenCritico(p: Proyecto): number | undefined {
  const { estado } = balanceM2(p)
  return estado.estado === 'completo' ? estado.terminalMasDesfavorable.margen_mca : undefined
}

function m3General(p: Proyecto) {
  const e = resolverEstadoModulo3(p, catalogoArtefactos, coeficientesMayoracion)
  if (e.estado !== 'evaluado') return { estado: e.estado }
  const g = e.resultado.medidorGeneral
  return {
    estado: e.estado,
    dnRecomendado_mm: g.recomendado.dnMedidor_mm,
    dnAdoptado_mm: g.adoptado.dnMedidor_mm,
    hfAdoptada_mca: g.adoptado.hfMedidor_mca,
    nIndividuales: e.resultado.medidoresIndividuales.length,
  }
}

function m4Snapshot(p: Proyecto) {
  const e = resolverEstadoModulo4({
    proyecto: p,
    catalogoArtefactos,
    coeficientesMayoracion,
  })
  if (e.estado !== 'evaluado' || e.resultado.tipo !== 'reservaCalculada') {
    return { estado: e.estado, tipo: e.estado === 'evaluado' ? e.resultado.tipo : undefined }
  }
  return {
    estado: e.estado,
    tipo: e.resultado.tipo,
    presionCalculo_m: e.resultado.conexion.presionCalculo_m,
    qConexion_lps: e.resultado.conexion.qConexion_lps,
    vrtd_m3: e.resultado.reserva.volumenReservaDiseno_m3,
    adopcion: e.resultado.adopcion.tipo === 'verificada' ? e.resultado.adopcion.estado : e.resultado.adopcion.tipo,
  }
}

// --- construcción del Proyecto canónico ---------------------------------

function canonico(): Proyecto {
  // Se conserva la configuración hidráulica nativa del proyecto de ejemplo
  // (modo Rápido: simplificada + estimadas) -- es exactamente lo que ve el
  // usuario al abrir la app. El modo Profesional exige cotas por terminal
  // que esta red de ejemplo no declara; ese eje ya está cubierto por los
  // tests de M2. La baseline transversal usa el proyecto tal cual.
  let p: Proyecto = backfillLongitudesDePredimensionamiento(proyectoInicial)
  // M2: cota de la raíz de la red (el panel la pide como "pelo de agua
  // mínimo" en tanque / "cota del punto de alimentación" en directa). Sin
  // ella el balance de cada terminal queda 'desnivelIncompleto'. Los
  // terminales toman su cota de `cotaHidraulicaReferencia_m` de la UF
  // (1,00 m) en modo Rápido.
  p = conCotaDeNodo(p, 'n-general', 20)
  // M2: override de DN comercial en la alimentación general.
  p = conDnComercialAdoptadoDeTramo(p, 't-general', '32 mm')
  // M3: PH + ACS individual.
  p = conPropiedadHorizontal(p, true)
  p = conTipoProvisionACS(p, 'individual')
  // M4: tanque elevado, Tc 2 h, DN19, Pacera 5 m (dentro de Tabla N°1 y
  //     con déficit real: Qconexión DN19@5m = 0,60 L/s < Qc ≈ 0,73 L/s),
  //     Δz 0, capacidad adoptada holgada.
  p = conEsquemaDeAbastecimiento(p, 'tanqueElevado')
  p = conPeriodoConsumoMaximo(p, 2)
  p = conDiametroNominalConexion(p, 0.019)
  p = conPresionSobreAcera(p, 5)
  p = conDesnivelConexion(p, 0)
  p = conVolumenTanqueElevadoAdoptado(p, 5)
  return p
}

// --- snapshot documental ----------------------------------------------

describe('D-δ.70 · Baseline funcional transversal M1–M4', () => {
  const base = canonico()

  it('SNAPSHOT: el Proyecto canónico atraviesa M1→M4 con estado coherente', () => {
    const qc = qcGlobal(base)
    const m2 = balanceM2(base)
    const m3 = resolverEstadoModulo3(base, catalogoArtefactos, coeficientesMayoracion)
    const m4 = m4Snapshot(base)

    console.log(
      '\n=== BASELINE M1–M4 (Proyecto canónico D-δ.70) ===\n' +
        JSON.stringify(
          {
            M1: { qcGlobal_lps: qc },
            M2: {
              estado: m2.estado.estado,
              motivos:
                m2.estado.estado === 'incompleto'
                  ? m2.estado.motivos.map((x) => x.tipo)
                  : m2.estado.estado === 'error'
                    ? m2.estado.problemas.map((x) => x.tipo)
                    : undefined,
              origenEfectivo: m2.origenEfectivo,
              presionDisponible_mca: m2.presionDisponible_mca,
              terminalCritico:
                m2.estado.estado === 'completo'
                  ? {
                      margen_mca: m2.estado.terminalMasDesfavorable.margen_mca,
                      presionResidual_mca: m2.estado.terminalMasDesfavorable.presionResidual_mca,
                      cumple: m2.estado.terminalMasDesfavorable.cumpleMinimo,
                    }
                  : undefined,
            },
            M3: {
              estado: m3.estado,
              general: m3General(base),
            },
            M4: m4,
          },
          null,
          2,
        ),
    )

    expect(qc).toBeGreaterThan(0)
    expect(m2.estado.estado).toBe('completo')
    expect(m3.estado).toBe('evaluado')
    expect(m4.estado).toBe('evaluado')
    expect(m4.tipo).toBe('reservaCalculada')
  })

  // --- MATRIZ DE SENSIBILIDAD Y NO CONTAMINACIÓN -----------------------

  it('cantidad de artefacto: propaga a M1, M2, M3 y M4', () => {
    const conMas: Proyecto = {
      ...base,
      unidadesFuncionales: base.unidadesFuncionales.map((uf) => ({
        ...uf,
        locales: uf.locales.map((l) =>
          l.id === 'local-bano'
            ? {
                ...l,
                artefactos: l.artefactos.map((a) =>
                  a.id === 'artefacto-bano-1' ? { ...a, cantidad: a.cantidad + 3 } : a,
                ),
              }
            : l,
        ),
      })),
    }
    expect(qcGlobal(conMas)!).toBeGreaterThan(qcGlobal(base)!)
    // M4: más demanda -> más déficit -> más VRTD.
    expect(m4Snapshot(conMas).vrtd_m3!).toBeGreaterThan(m4Snapshot(base).vrtd_m3!)
    // M3: el medidor general ve más caudal -> DN >= (nunca menor).
    const gBase = m3General(base).dnAdoptado_mm ?? 0
    const gMas = m3General(conMas).dnAdoptado_mm ?? 0
    expect(gMas).toBeGreaterThanOrEqual(gBase)
    // M2 sigue resolviendo (no rompe).
    expect(balanceM2(conMas).estado.estado).toBe('completo')
  })

  it('DN comercial manual en M2: mueve M2, NO toca M1 / M3 / M4', () => {
    const qcAntes = qcGlobal(base)
    const m3Antes = m3General(base)
    const m4Antes = m4Snapshot(base)
    const margenAntes = margenCritico(base)

    const conOtroDn = conDnComercialAdoptadoDeTramo(base, 't-general', '50 mm')

    expect(qcGlobal(conOtroDn)).toBe(qcAntes) // M1 intacto
    expect(m3General(conOtroDn)).toEqual(m3Antes) // M3 intacto
    expect(m4Snapshot(conOtroDn)).toEqual(m4Antes) // M4 intacto
    // M2: un DN mayor en la alimentación general reduce la pérdida -> el
    // margen del crítico no empeora (sube o queda igual dentro de ε).
    const margenDespues = margenCritico(conOtroDn)
    expect(margenDespues).toBeDefined()
    expect(margenDespues!).toBeGreaterThanOrEqual(margenAntes! - 1e-9)
  })

  it('DN de conexión (M4): mueve Qconexión y VRTD, NO toca M1 / M2 / M3', () => {
    const qcAntes = qcGlobal(base)
    const m3Antes = m3General(base)
    const margenAntes = margenCritico(base)
    const m4Antes = m4Snapshot(base)

    const conDn25 = conDiametroNominalConexion(base, 0.025)

    expect(qcGlobal(conDn25)).toBe(qcAntes)
    expect(m3General(conDn25)).toEqual(m3Antes)
    expect(margenCritico(conDn25)).toBeCloseTo(margenAntes!, 9) // M2 terminal intacto
    const m4Despues = m4Snapshot(conDn25)
    expect(m4Despues.qConexion_lps!).toBeGreaterThan(m4Antes.qConexion_lps!) // DN mayor -> más gasto
    expect(m4Despues.vrtd_m3!).toBeLessThanOrEqual(m4Antes.vrtd_m3!) // más gasto -> menos déficit
  })

  it('Tc (M4): escala VRTD linealmente, NO toca M1 / M2 / M3', () => {
    const qcAntes = qcGlobal(base)
    const m3Antes = m3General(base)
    const margenAntes = margenCritico(base)
    const v2 = m4Snapshot(base).vrtd_m3!

    const conTc4 = conPeriodoConsumoMaximo(base, 4)
    const v4 = m4Snapshot(conTc4).vrtd_m3!

    expect(v4).toBeCloseTo(2 * v2, 9)
    expect(qcGlobal(conTc4)).toBe(qcAntes)
    expect(m3General(conTc4)).toEqual(m3Antes)
    expect(margenCritico(conTc4)).toBeCloseTo(margenAntes!, 9)
  })

  it('Pacera: en tanque NO cambia el balance terminal de M2 ni VRTD-por-déficit-de-gasto salvo vía Pcalc', () => {
    // En tanqueElevado el Pdisponible de M2 es 0 -> subir Pacera no debe
    // mover el margen del crítico.
    const margenAntes = margenCritico(base)
    const conPacera20 = conPresionSobreAcera(base, 20)
    expect(margenCritico(conPacera20)).toBeCloseTo(margenAntes!, 9)
    // Pacera sí mueve Pcalc -> Qconexión -> VRTD (efecto legítimo de M4).
    expect(m4Snapshot(conPacera20).qConexion_lps!).toBeGreaterThan(m4Snapshot(base).qConexion_lps!)
  })

  it('esquema directa: Pacera pasa a ser el Pdisponible de M2; volver a tanque lo restaura', () => {
    const directa = conPresionSobreAcera(conEsquemaDeAbastecimiento(base, 'directa'), 25)
    const b = balanceM2(directa)
    expect(b.origenEfectivo).toBe('directa')
    expect(b.presionDisponible_mca).toBe(25)
    // +5 en Pacera => +5 exacto en presión residual del crítico (demás términos iguales).
    const m1 = balanceM2(directa)
    const m2 = balanceM2(conPresionSobreAcera(directa, 30))
    if (m1.estado.estado === 'completo' && m2.estado.estado === 'completo') {
      expect(
        m2.estado.terminalMasDesfavorable.presionResidual_mca -
          m1.estado.terminalMasDesfavorable.presionResidual_mca,
      ).toBeCloseTo(5, 9)
    } else {
      throw new Error('se esperaba M2 completo en ambos casos directa')
    }
    // Volver a tanque: el origen vuelve a tanque, Pdisponible 0.
    const volver = conEsquemaDeAbastecimiento(directa, 'tanqueElevado')
    expect(balanceM2(volver).origenEfectivo).toBe('tanqueElevado')
    expect(balanceM2(volver).presionDisponible_mca).toBe(0)
  })

  it('medidor general: sólo entra al camino de M2 en directa (no en tanque/cisterna)', () => {
    const directa = conEsquemaDeAbastecimiento(base, 'directa')
    const cisterna = conEsquemaDeAbastecimiento(base, 'cisternaBombeoElevado')
    // Mismo balance terminal en tanque y cisterna (general aguas arriba en ambos).
    expect(margenCritico(cisterna)).toBeCloseTo(margenCritico(base)!, 9)
    // En directa el general entra: el margen difiere del de tanque.
    const mDirecta = margenCritico(directa)
    expect(mDirecta).toBeDefined()
    expect(Math.abs(mDirecta! - margenCritico(base)!)).toBeGreaterThan(1e-6)
  })

  it('round-trip de esquema directa→tanque→cisterna→directa: sin estado fantasma', () => {
    let p = base
    for (const esquema of ['directa', 'tanqueElevado', 'cisternaBombeoElevado', 'directa'] as const) {
      p = conEsquemaDeAbastecimiento(p, esquema)
      const b = balanceM2(p)
      expect(b.origenEfectivo).toBe(esquema === 'directa' ? 'directa' : 'tanqueElevado')
    }
    // directa final: M4 no aplica reserva por tanque.
    const m4 = resolverEstadoModulo4({ proyecto: p, catalogoArtefactos, coeficientesMayoracion })
    expect(m4.estado === 'evaluado' && m4.resultado.tipo === 'sinReservaPorTanque').toBe(true)
  })

  it('M4 no iniciado / incompleto: M2 sigue dimensionando, sin crash', () => {
    const sinM4: Proyecto = { ...base }
    delete sinM4.configuracionAbastecimiento
    const b = balanceM2(sinM4)
    expect(b.origenEfectivo).toBeUndefined()
    expect(b.presionDisponible_mca).toBeUndefined()
    // M2 no es 'completo' (falta el origen) pero tampoco 'error'.
    expect(['incompleto', 'noIniciado']).toContain(b.estado.estado)
    // M1 y M3 siguen resolviendo.
    expect(qcGlobal(sinM4)).toBeGreaterThan(0)
    expect(resolverEstadoModulo3(sinM4, catalogoArtefactos, coeficientesMayoracion).estado).toBe('evaluado')
  })

  it('M3 no iniciado: M2 sigue, la pérdida de medidor queda indeterminada (nunca 0 fabricado)', () => {
    const sinM3: Proyecto = { ...base }
    delete sinM3.configuracionMedidores
    expect(resolverEstadoModulo3(sinM3, catalogoArtefactos, coeficientesMayoracion).estado).toBe('noIniciado')
    // Con origen conocido pero sin M3, el balance de cada terminal queda
    // incompleto (hfMedidor undefined), nunca 'completo' con hf 0.
    expect(balanceM2(sinM3).estado.estado).toBe('incompleto')
    expect(qcGlobal(sinM3)).toBeGreaterThan(0)
  })

  it('backward compatibility: Proyecto pre-M3/M4 (sólo M1+M2) es válido y coherente', () => {
    // `proyectoInicial` ya nace sin configuracionMedidores ni
    // configuracionAbastecimiento -- es literalmente un Proyecto pre-M3/M4.
    const viejo: Proyecto = backfillLongitudesDePredimensionamiento(proyectoInicial)
    expect(qcGlobal(viejo)).toBeGreaterThan(0)
    expect(resolverEstadoModulo3(viejo, catalogoArtefactos, coeficientesMayoracion).estado).toBe('noIniciado')
    expect(
      resolverEstadoModulo4({ proyecto: viejo, catalogoArtefactos, coeficientesMayoracion }).estado,
    ).toBe('noIniciado')
    // M2 sin origen: incompleto por falta de esquema, no error.
    expect(balanceM2(viejo).estado.estado).toBe('incompleto')
  })
})
