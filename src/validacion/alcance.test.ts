import { describe, it, expect } from 'vitest'
import {
  validarProyecto,
  alcanceDeCodigo,
  erroresQueBloqueanLaDemanda,
  erroresDeModulosPosteriores,
} from './index'
import type { CodigoValidacion } from './index'
import { catalogoArtefactos } from '../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../normativa/eras-2023/coeficientes-mayoracion'
import { catalogoSistemasDeTuberia } from '../motor/tuberias/sistemaDeTuberia'
import { proyectoInicial } from '../interfaz/paginas/proyectoDeEjemplo'
import { calcularSimultaneidad } from '../motor/demanda/simultaneidad/calcularSimultaneidad'

// FIX P0 (UI-CRIT-10): un error de un módulo posterior a Demanda NO puede
// impedir que M1 calcule Qc. La dependencia va M1 -> M4, nunca al revés.

const TODOS: readonly CodigoValidacion[] = [
  'proyectoRegimenLocalAusente',
  'proyectoCantidadNoPositiva',
  'proyectoUnidadFuncionalSinLocales',
  'proyectoLocalSinArtefactos',
  'proyectoSinArtefactosComputables',
  'catalogoArtefactoIdInexistente',
  'catalogoTipoDeProyectoInexistente',
  'redHidraulicaNodoIdDuplicado',
  'redHidraulicaTramoIdDuplicado',
  'redHidraulicaTramoNodoInexistente',
  'redHidraulicaTramoOrigenIgualDestino',
  'redHidraulicaReferenciaArtefactoInvalida',
  'redHidraulicaTramoLongitudNoPositiva',
  'redHidraulicaTramoLongitudIncompatibleConCota',
  'redHidraulicaTramoAccesorioTipoNoSoportado',
  'redHidraulicaTramoAccesorioCantidadNoPositiva',
  'redHidraulicaNodoTeeEstructuraNoSoportada',
  'redHidraulicaNodoTeeTramoSalidaRectaInvalido',
  'redHidraulicaNodoMultiplesTramosEntrantes',
  'redHidraulicaCicloDirigido',
  'redHidraulicaMontanteIdDuplicado',
  'redHidraulicaMontanteRedInvalida',
  'redHidraulicaTramoMontanteInexistente',
  'redHidraulicaTramoMontanteRedIncoherente',
  'configuracionHidraulicaSistemaDeTuberiaIdInexistente',
  'configuracionHidraulicaSistemaMaterialIncompatible',
  'configuracionMedidoresUnidadFuncionalInexistente',
  'configuracionAbastecimientoEsquemaInvalido',
  'configuracionAbastecimientoPeriodoConsumoMaximoInvalido',
  'parametrosDiametroNominalConexionNoAdmisible',
  'parametrosDesnivelConexionNoFinito',
  'configuracionAbastecimientoVolumenTanqueElevadoInvalido',
  'configuracionAbastecimientoVolumenTanqueBombeoInvalido',
]

describe('alcanceDeCodigo', () => {
  it('todo código tiene un alcance definido', () => {
    for (const codigo of TODOS) {
      expect(['demanda', 'tuberias', 'medidores', 'abastecimiento']).toContain(alcanceDeCodigo(codigo))
    }
  })

  it('los errores estructurales de Proyecto / catálogo son de alcance demanda', () => {
    expect(alcanceDeCodigo('proyectoSinArtefactosComputables')).toBe('demanda')
    expect(alcanceDeCodigo('proyectoRegimenLocalAusente')).toBe('demanda')
    expect(alcanceDeCodigo('catalogoArtefactoIdInexistente')).toBe('demanda')
    expect(alcanceDeCodigo('catalogoTipoDeProyectoInexistente')).toBe('demanda')
  })

  it('los errores de M2/M3/M4 NO son de alcance demanda', () => {
    expect(alcanceDeCodigo('redHidraulicaTramoLongitudNoPositiva')).toBe('tuberias')
    expect(alcanceDeCodigo('configuracionMedidoresUnidadFuncionalInexistente')).toBe('medidores')
    expect(alcanceDeCodigo('configuracionAbastecimientoPeriodoConsumoMaximoInvalido')).toBe('abastecimiento')
    expect(alcanceDeCodigo('parametrosDesnivelConexionNoFinito')).toBe('abastecimiento')
  })
})

describe('independencia modular Demanda ⟂ Abastecimiento (FIX P0)', () => {
  const normativa = { catalogoArtefactos, coeficientesMayoracion }
  const qcDe = (proyecto: typeof proyectoInicial): number => {
    const qc = calcularSimultaneidad({ proyecto, normativa }).resultados.qc
    if (!qc || !('valor' in qc)) throw new Error('se esperaba un Qc numérico')
    return qc.valor
  }
  const qcDeReferencia = qcDe(proyectoInicial)

  it('Tc explícitamente inválido (6 h): error de alcance abastecimiento, Qc INTACTO', () => {
    const proyecto = {
      ...proyectoInicial,
      configuracionAbastecimiento: { esquema: 'tanqueElevado' as const, periodoConsumoMaximo_h: 6 },
    }
    const validacion = validarProyecto(proyecto, catalogoArtefactos, coeficientesMayoracion, catalogoSistemasDeTuberia)

    const bloqueanDemanda = erroresQueBloqueanLaDemanda(validacion)
    const posteriores = erroresDeModulosPosteriores(validacion)

    expect(bloqueanDemanda).toEqual([]) // M1 puede calcular
    expect(posteriores.map((p) => p.codigo)).toContain('configuracionAbastecimientoPeriodoConsumoMaximoInvalido')
    expect(posteriores.every((p) => p.alcance === 'abastecimiento')).toBe(true)

    // El caudal de cálculo no depende de Tc.
    expect(qcDe(proyecto)).toBe(qcDeReferencia)
  })

  it('Tanque elevado + Tc ausente: sin error de validación, Qc intacto', () => {
    const proyecto = {
      ...proyectoInicial,
      configuracionAbastecimiento: { esquema: 'tanqueElevado' as const },
    }
    const validacion = validarProyecto(proyecto, catalogoArtefactos, coeficientesMayoracion, catalogoSistemasDeTuberia)
    expect(erroresQueBloqueanLaDemanda(validacion)).toEqual([])
    expect(
      erroresDeModulosPosteriores(validacion).some(
        (p) => p.codigo === 'configuracionAbastecimientoPeriodoConsumoMaximoInvalido',
      ),
    ).toBe(false)
    expect(qcDe(proyecto)).toBe(qcDeReferencia)
  })

  it('un error real de Demanda (tipología inexistente) SÍ bloquea', () => {
    const proyecto = {
      ...proyectoInicial,
      parametros: { ...proyectoInicial.parametros, tipoDeProyecto: 'noExiste' as never },
    }
    const validacion = validarProyecto(proyecto, catalogoArtefactos, coeficientesMayoracion, catalogoSistemasDeTuberia)
    expect(erroresQueBloqueanLaDemanda(validacion).length).toBeGreaterThan(0)
  })
})
