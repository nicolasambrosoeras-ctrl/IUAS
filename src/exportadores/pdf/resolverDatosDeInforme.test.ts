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
import { conPropiedadHorizontal, conTipoProvisionACS } from '../../interfaz/paginas/actualizarConfiguracionMedidores'
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
