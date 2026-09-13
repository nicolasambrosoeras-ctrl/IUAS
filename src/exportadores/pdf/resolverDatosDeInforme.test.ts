// REPORT-01A: tests sobre el snapshot DERIVADO del informe -- datos /
// estructura semántica, nunca "abrir el PDF y mirar" (brief §26). Reusa el
// proyecto canónico ya validado por resolverResumenDeProyecto.test.ts (mismo
// baseline transversal D-δ.70/CRIT-A39/FIX-HYD-EST-SIMPLIFIED-01): si el
// margen del crítico cambiara acá sin cambiar allá (o viceversa), sería una
// inconsistencia real entre dos consumidores del mismo EstadoModulo2.
import { describe, it, expect } from 'vitest'
import type { Proyecto } from '../../modelo/proyecto'
import { crearProyectoVacio } from '../../interfaz/paginas/crearProyectoVacio'
import { backfillLongitudesDePredimensionamiento } from '../../interfaz/paginas/backfillLongitudesDePredimensionamiento'
import { proyectoInicial } from '../../interfaz/paginas/proyectoDeEjemplo'
import { conCotaDeNodo, conDnComercialAdoptadoDeTramo } from '../../interfaz/paginas/actualizarRedHidraulica'
import {
  conPropiedadHorizontal,
  conTipoProvisionACS,
  conMedidorGeneralAdoptado,
  conMedidorIndividualAdoptado,
} from '../../interfaz/paginas/actualizarConfiguracionMedidores'
import {
  conEsquemaDeAbastecimiento,
  conPeriodoConsumoMaximo,
  conVolumenTanqueElevadoAdoptado,
} from '../../interfaz/paginas/actualizarConfiguracionAbastecimiento'
import {
  conDesnivelConexion,
  conDiametroNominalConexion,
  conPresionSobreAcera,
} from '../../interfaz/paginas/actualizarParametrosDeConexion'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import { resolverDatosDeInforme } from './resolverDatosDeInforme'

function datos(p: Proyecto) {
  return resolverDatosDeInforme(p, catalogoArtefactos, coeficientesMayoracion)
}

// Mismo Proyecto canónico completo que resolverResumenDeProyecto.test.ts
// (D-δ.70): balance de presión 'completo', crítico determinado, NO cumple.
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

function artefactoLavatorio(id: string) {
  return { id, artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' as const }
}

// Proyecto multinivel mínimo (UI-M1-MULTINIVEL-01): 2 niveles, un Local
// distinto en cada uno. Sin redHidraulica -- el test de M1 no necesita M2.
// Al menos un artefacto por Local: calcularSimultaneidad (M1) exige n>=1,
// precondición del motor que este slice no toca (§35, no tocar el motor).
function proyectoMultinivel(): Proyecto {
  const base = crearProyectoVacio()
  return {
    ...base,
    unidadesFuncionales: [
      {
        id: 'uf-1',
        nombre: 'UF 1',
        niveles: [
          {
            id: 'nivel-pb',
            nombre: 'PB',
            locales: [{ id: 'local-pb-bano', tipo: 'bano', artefactos: [artefactoLavatorio('a-pb')] }],
          },
          {
            id: 'nivel-pa',
            nombre: 'PA',
            locales: [{ id: 'local-pa-bano', tipo: 'bano', artefactos: [artefactoLavatorio('a-pa')] }],
          },
        ],
      },
      {
        id: 'uf-2',
        nombre: 'UF 2 (un solo nivel)',
        niveles: [
          {
            id: 'nivel-unico',
            nombre: 'PB',
            locales: [{ id: 'local-uf2-cocina', tipo: 'cocina', artefactos: [artefactoLavatorio('a-uf2')] }],
          },
        ],
      },
    ],
  }
}

// Proyecto con demanda M1 resoluble (n=1) pero sin redHidraulica todavía --
// para testear los estados 'noIniciado' de M2/verificación sin depender de
// un Proyecto totalmente vacío (que no llega a tener n>=1 en M1).
function proyectoSinRedHidraulica(): Proyecto {
  const base = crearProyectoVacio()
  return {
    ...base,
    unidadesFuncionales: [
      {
        id: 'uf-1',
        nombre: 'UF 1',
        niveles: [{ id: 'nivel-1', nombre: 'PB', locales: [{ id: 'local-1', tipo: 'bano', artefactos: [artefactoLavatorio('a-1')] }] }],
      },
    ],
  }
}

describe('resolverDatosDeInforme -- M1 multinivel (§27)', () => {
  it('preserva Nivel -> Local sin mezclar Locales entre niveles', () => {
    const d = datos(proyectoMultinivel())
    const uf1 = d.unidadesFuncionalesM1.find((u) => u.nombre === 'UF 1')!
    expect(uf1.mostrarNiveles).toBe(true)
    expect(uf1.niveles).toHaveLength(2)
    expect(uf1.niveles[0]!.nombre).toBe('PB')
    expect(uf1.niveles[0]!.locales.map((l) => l.id)).toEqual(['local-pb-bano'])
    expect(uf1.niveles[1]!.nombre).toBe('PA')
    expect(uf1.niveles[1]!.locales.map((l) => l.id)).toEqual(['local-pa-bano'])
  })

  it('una UF de un único Nivel no exige mostrar el nombre del Nivel', () => {
    const d = datos(proyectoMultinivel())
    const uf2 = d.unidadesFuncionalesM1.find((u) => u.nombre === 'UF 2 (un solo nivel)')!
    expect(uf2.mostrarNiveles).toBe(false)
    expect(uf2.niveles[0]!.locales.map((l) => l.id)).toEqual(['local-uf2-cocina'])
  })
})

describe('resolverDatosDeInforme -- M2 (§28)', () => {
  it('sin redHidraulica: la sección M2 se declara honestamente vacía, no rota', () => {
    const d = datos(proyectoSinRedHidraulica())
    expect(d.m2.hayRedHidraulica).toBe(false)
    expect(d.m2.distribucionGeneral).toEqual([])
    expect(d.m2.locales).toEqual([])
  })

  it('proyecto canónico: la distribución general refleja el DN adoptado manualmente', () => {
    const d = datos(canonico())
    const general = d.m2.distribucionGeneral.find((f) => f.clave === 'general-t-general')
    expect(general).toBeDefined()
    expect(general!.dnTexto).toBe('32 mm')
    expect(general!.red).toBe('AF')
  })

  it('DN manual distinto -> el informe es una fotografía del estado ACTUAL, no una caché (§30)', () => {
    const conDnDistinto = conDnComercialAdoptadoDeTramo(canonico(), 't-general', '25 mm')
    const d = datos(conDnDistinto)
    const general = d.m2.distribucionGeneral.find((f) => f.clave === 'general-t-general')
    expect(general!.dnTexto).toBe('25 mm')
  })

  it('agrupa las filas AF/AC del mismo Local bajo un único grupo con su etiqueta humana', () => {
    const d = datos(canonico())
    const grupoBano = d.m2.locales.find((g) => g.nombre.startsWith('Baño'))
    expect(grupoBano).toBeDefined()
    expect(grupoBano!.filas.length).toBeGreaterThanOrEqual(1)
    // Nunca IDs técnicos en la etiqueta del grupo.
    expect(grupoBano!.nombre).not.toMatch(/local-|uf-/)
  })
})

describe('resolverDatosDeInforme -- Verificación hidráulica (§31/§16)', () => {
  it('proyecto canónico: balance completo, crítico determinado, margen igual al baseline transversal', () => {
    const d = datos(canonico())
    expect(d.verificacion.estadoGlobal).toBe('completo')
    expect(d.verificacion.terminalCriticoNodoId).toBeDefined()
    const critico = d.verificacion.filas.find((f) => f.nodoId === d.verificacion.terminalCriticoNodoId)
    expect(critico).toBeDefined()
    expect(critico!.esCritico).toBe(true)
    expect(critico!.cumple).toBe(false)
    // Mismo baseline que resolverResumenDeProyecto.test.ts.
    expect(critico!.margenTexto).toBe('-19,437 m.c.a.')
  })

  it('exactamente un terminal está marcado como crítico', () => {
    const d = datos(canonico())
    const criticos = d.verificacion.filas.filter((f) => f.esCritico)
    expect(criticos).toHaveLength(1)
  })
})

describe('resolverDatosDeInforme -- REPORT-01B: desarrollo de cálculo M2 (§8/§9/§10)', () => {
  it('caso de velocidad/pérdida distribuida: V y hf son consistentes con Q/Di/L del motor', () => {
    const d = datos(canonico())
    const caso = d.m2.desarrollo?.casoVelocidadYPerdidaDistribuida
    expect(caso).toBeDefined()
    // A = π·Di²/4 ; V = Q/A -- verificación de consistencia interna (no
    // duplica el motor: recalcula sólo para auditar que el dato expuesto
    // es coherente consigo mismo, con los MISMOS números que ya trae).
    const q_m3s = caso!.qc_lps / 1000
    const di_m = caso!.diametroInteriorEfectivo_mm / 1000
    const a_m2 = (Math.PI * di_m ** 2) / 4
    expect(caso!.velocidad_mps).toBeCloseTo(q_m3s / a_m2, 6)
    expect(caso!.hfDistribuida_m).toBeGreaterThan(0)
    expect(caso!.longitud_m).toBeGreaterThan(0)
  })

  it('el caso representativo se elige del Local+Red del terminal crítico', () => {
    const d = datos(canonico())
    const critico = d.verificacion.filas.find((f) => f.esCritico)!
    const caso = d.m2.desarrollo?.casoVelocidadYPerdidaDistribuida
    // La etiqueta del caso viene de identificarFilasPrincipalesDeLocales +
    // etiquetaHumanaDeLocal -- debe corresponder al mismo Local que el
    // crítico, no a un Tramo arbitrario de otra sección.
    expect(caso?.etiqueta).toContain(critico.localEtiqueta.split(' · ')[0])
  })

  it('pérdida localizada estimada: K total = tees·3,00 + 1·1,35 + 1·9,18 con los datos del motor', () => {
    const d = datos(canonico())
    const caso = d.m2.desarrollo?.casoPerdidaLocalizadaEstimada
    expect(caso).toBeDefined()
    expect(caso!.nTerminalesLocal).toBeGreaterThan(0)
    expect(caso!.nTeesEstimadas).toBe(Math.max(0, caso!.nTerminalesLocal - 1))
    expect(caso!.ksTee).toBeCloseTo(3.0, 2)
    expect(caso!.ksSingularidadTerminal).toBeCloseTo(1.35, 2)
    expect(caso!.ksLlaveDePaso).toBeCloseTo(9.18, 2)
    const kEsperado = caso!.nTeesEstimadas * caso!.ksTee + caso!.nSingularidadTerminal * caso!.ksSingularidadTerminal + caso!.nLlaveDePaso * caso!.ksLlaveDePaso
    expect(caso!.kTotal).toBeCloseTo(kEsperado, 6)
    const hfEsperada = (caso!.kTotal * caso!.velocidadReferencia_mps ** 2) / (2 * 9.81)
    expect(caso!.hf_m).toBeCloseTo(hfEsperada, 6)
  })

  it('sin redHidraulica: desarrollo es undefined, no un caso fabricado', () => {
    const d = datos(proyectoSinRedHidraulica())
    expect(d.m2.desarrollo).toBeUndefined()
  })
})

describe('resolverDatosDeInforme -- REPORT-01B: desarrollo del terminal crítico (§14/§15/§16)', () => {
  it('expone Presidual = Pdisponible - Δz - hfDistribuida - hfLocalizada - hfMedidor con el mismo margen del baseline', () => {
    const d = datos(canonico())
    const dc = d.verificacion.desarrolloCritico
    expect(dc).toBeDefined()
    const presidualEsperada = dc!.presionDisponible_mca - dc!.desnivel_m - dc!.hfDistribuida_mca - dc!.hfLocalizada_mca - dc!.hfMedidor_mca
    expect(dc!.presionResidual_mca).toBeCloseTo(presidualEsperada, 6)
    expect(dc!.margen_mca).toBeCloseTo(dc!.presionResidual_mca - dc!.presionMinimaRequerida_mca, 6)
    expect(dc!.cumpleMinimo).toBe(false)
    // hfEquipoACS nunca se inventa (D-δ.15 sin fórmula normativa vigente).
    expect(dc!.hfEquipoACS_mca).toBeUndefined()
  })

  it('undefined cuando no hay terminal crítico determinado (verificación incompleta)', () => {
    const p = backfillLongitudesDePredimensionamiento(proyectoInicial)
    const d = datos(p)
    expect(d.verificacion.desarrolloCritico).toBeUndefined()
  })
})

describe('resolverDatosDeInforme -- estados incompletos (§32/§17)', () => {
  it('sin esquema de abastecimiento: incompleto, nunca inventa 0 ni "Cumple"', () => {
    const p = backfillLongitudesDePredimensionamiento(proyectoInicial)
    const d = datos(p)
    expect(d.verificacion.estadoGlobal).toBe('incompleto')
    expect(d.verificacion.terminalCriticoNodoId).toBeUndefined()
    expect(d.verificacion.motivosDeIncompletitud.length).toBeGreaterThan(0)
    for (const fila of d.verificacion.filas) {
      expect(fila.cumple).toBeUndefined()
      expect(fila.presionResidualTexto).toBe('—')
    }
  })

  it('proyecto vacío: Módulo 2 todavía no fue iniciado (nunca "error" ni "completo")', () => {
    const d = datos(proyectoSinRedHidraulica())
    expect(d.verificacion.estadoGlobal).toBe('noIniciado')
    expect(d.verificacion.filas).toEqual([])
  })
})

describe('resolverDatosDeInforme -- REPORT-01C: M3 Medidores (§32-36)', () => {
  it('PH + ACS individual: un medidor de agua fría por UF, sin medidor AC ficticio', () => {
    const d = datos(canonico())
    expect(d.m3.estado).toBe('evaluado')
    expect(d.m3.resultado?.medidorGeneral).toBeDefined()
    const individuales = d.m3.resultado?.medidoresIndividuales ?? []
    expect(individuales.length).toBeGreaterThan(0)
    // CRIT-A34: ninguna UF con ACS individual tiene medidor de agua caliente.
    const ufsConIndividual = new Set(individuales.map((m) => m.resultado.unidadFuncionalId))
    for (const ufId of ufsConIndividual) {
      const serviciosDeEstaUF = individuales.filter((m) => m.resultado.unidadFuncionalId === ufId).map((m) => m.resultado.servicioMedido)
      expect(serviciosDeEstaUF).toEqual(['aguaFria'])
    }
    expect(d.m3.hayACSIndividual).toBe(true)
  })

  it('ACS central: no colapsa CRIT-A34 (comportamiento vigente, sin reescribirlo)', () => {
    const d = datos(conTipoProvisionACS(canonico(), 'central'))
    expect(d.m3.estado).toBe('evaluado')
    expect(d.m3.hayACSIndividual).toBe(false)
  })

  it('sin propiedad horizontal: no se inventa medidor individual', () => {
    const d = datos(conPropiedadHorizontal(canonico(), false))
    expect(d.m3.esPropiedadHorizontal).toBe(false)
    expect(d.m3.resultado?.medidoresIndividuales ?? []).toEqual([])
    // El medidor general sigue resolviendo (no depende de PH).
    expect(d.m3.resultado?.medidorGeneral).toBeDefined()
  })

  it('medidor general adoptado manualmente: capacidad y hf reflejan la adopción, no la automática', () => {
    const base = datos(canonico()).m3.resultado?.medidorGeneral
    expect(base).toBeDefined()
    const dnDistinto = base!.recomendado.dnMedidor_mm === 15 ? 25 : 15
    const conAdopcion = conMedidorGeneralAdoptado(canonico(), dnDistinto)
    const d = datos(conAdopcion)
    const medidor = d.m3.resultado?.medidorGeneral
    expect(medidor).toBeDefined()
    expect(medidor!.adoptado.origen).toBe('manual')
    expect(medidor!.adoptado.dnMedidor_mm).toBe(dnDistinto)
    // hf efectiva del adoptado, nunca la del recomendado automático.
    expect(medidor!.adoptado.hfMedidor_mca).not.toBe(medidor!.recomendado.hfMedidor_mca)
  })

  it('medidor individual adoptado manualmente: se refleja como Manual, no como automático', () => {
    const canon = canonico()
    const original = datos(canon).m3.resultado?.medidoresIndividuales[0]
    expect(original).toBeDefined()
    const dnDistinto = original!.resultado.recomendado.dnMedidor_mm === 15 ? 25 : 15
    const conAdopcion = conMedidorIndividualAdoptado(
      canon,
      original!.resultado.unidadFuncionalId,
      original!.resultado.servicioMedido,
      dnDistinto,
    )
    const d = datos(conAdopcion)
    const medidor = d.m3.resultado?.medidoresIndividuales.find(
      (m) => m.resultado.unidadFuncionalId === original!.resultado.unidadFuncionalId && m.resultado.servicioMedido === original!.resultado.servicioMedido,
    )
    expect(medidor?.resultado.adoptado.origen).toBe('manual')
    expect(medidor?.resultado.adoptado.dnMedidor_mm).toBe(dnDistinto)
  })
})

describe('resolverDatosDeInforme -- REPORT-01C: M4 Alimentación y reserva (§37-40)', () => {
  it('esquema directa: sin bloque de reserva irrelevante', () => {
    const directa = conPresionSobreAcera(conEsquemaDeAbastecimiento(canonico(), 'directa'), 25)
    const d = datos(directa)
    expect(d.m4.estado).toBe('evaluado')
    expect(d.m4.esquema).toBe('directa')
    expect(d.m4.resultado).toEqual({ tipo: 'sinReservaPorTanque', esquema: 'directa' })
  })

  it('esquema tanque elevado: Dc, Tc, VReserva y volumen adoptado coinciden con el resolver', () => {
    const d = datos(canonico())
    expect(d.m4.estado).toBe('evaluado')
    expect(d.m4.resultado?.tipo).toBe('reservaCalculada')
    if (d.m4.resultado?.tipo === 'reservaCalculada') {
      const { reserva, adopcion } = d.m4.resultado
      expect(reserva.deficit_lps).toBeCloseTo(Math.max(0, reserva.qc_lps - reserva.qConexion_lps), 9)
      expect(reserva.volumenReservaDiseno_m3).toBeCloseTo(reserva.deficit_lps * 3.6 * reserva.tc_h, 9)
      expect(reserva.tc_h).toBe(2)
      expect(adopcion.tipo).toBe('verificada')
      if (adopcion.tipo === 'verificada') {
        expect(adopcion.volumenAdoptado_m3).toBe(5)
      }
    }
  })

  it('desnivel de conexión negativo: Pcalc > Pacera, signo preservado (nunca valor absoluto)', () => {
    const d = datos(conDesnivelConexion(canonico(), -2))
    expect(d.m4.resultado?.tipo).toBe('reservaCalculada')
    if (d.m4.resultado?.tipo === 'reservaCalculada') {
      const { conexion } = d.m4.resultado
      expect(conexion.desnivelConexion_m).toBe(-2)
      expect(conexion.presionCalculo_m).toBeCloseTo(conexion.presionSobreAcera_m - conexion.desnivelConexion_m, 9)
      expect(conexion.presionCalculo_m).toBeGreaterThan(conexion.presionSobreAcera_m)
    }
  })

  it('volumen calculado y adoptado son distinguibles cuando difieren', () => {
    const conVolumenDistinto = conVolumenTanqueElevadoAdoptado(canonico(), 999)
    const d = datos(conVolumenDistinto)
    expect(d.m4.resultado?.tipo).toBe('reservaCalculada')
    if (d.m4.resultado?.tipo === 'reservaCalculada') {
      const { adopcion } = d.m4.resultado
      expect(adopcion.tipo).toBe('verificada')
      if (adopcion.tipo === 'verificada') {
        expect(adopcion.volumenAdoptado_m3).toBe(999)
        expect(adopcion.volumenRequerido_m3).not.toBe(999)
        expect(adopcion.estado).toBe('suficiente')
      }
    }
  })
})

describe('resolverDatosDeInforme -- REPORT-01C: consistencia M3/M4 <-> Verificación (§26/§27)', () => {
  it('hfMedidor del terminal crítico coincide con el/los medidor(es) de M3 que le aplican', () => {
    const d = datos(canonico())
    const dc = d.verificacion.desarrolloCritico
    expect(dc).toBeDefined()
    // El crítico es AC de una UF con ACS individual: su hfMedidor debe ser
    // exactamente el hf del medidor de AGUA FRÍA de esa UF (CRIT-A34) --
    // nunca un segundo medidor de agua caliente, nunca recalculado aparte.
    const individuales = d.m3.resultado?.medidoresIndividuales ?? []
    const medidorAF = individuales.find((m) => m.resultado.servicioMedido === 'aguaFria')
    expect(medidorAF).toBeDefined()
    expect(dc!.hfMedidor_mca).toBeCloseTo(medidorAF!.resultado.adoptado.hfMedidor_mca, 9)
  })

  it('el origen que documenta M4 coincide con el origen que consume la Verificación', () => {
    const d = datos(canonico())
    expect(d.m4.esquema).toBe('tanqueElevado')
    expect(d.verificacion.origenTexto).toBe('Tanque elevado')
    expect(d.origenM4Texto).toBe('Tanque elevado')
  })
})

describe('resolverDatosDeInforme -- REPORT-01C: memoria completa (§41)', () => {
  it('un proyecto con M1+M2+Verificación+M3+M4 resuelve las cinco secciones sin lanzar', () => {
    const d = datos(canonico())
    expect(d.unidadesFuncionalesM1.length).toBeGreaterThan(0)
    expect(d.m2.hayRedHidraulica).toBe(true)
    expect(d.verificacion.estadoGlobal).toBe('completo')
    expect(d.m3.estado).toBe('evaluado')
    expect(d.m4.estado).toBe('evaluado')
  })
})
