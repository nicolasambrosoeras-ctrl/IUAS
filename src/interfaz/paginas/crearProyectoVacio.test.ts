// GEOM-UX-01 §14-§16 — "Reiniciar cálculo" produce un proyecto vacío
// REAL (no el de ejemplo) y estructuralmente válido.
import { describe, it, expect } from 'vitest'
import { crearProyectoVacio } from './crearProyectoVacio'
import { proyectoInicial } from './proyectoDeEjemplo'
import { validarProyecto } from '../../validacion'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import { catalogoSistemasDeTuberia } from '../../motor/tuberias/sistemaDeTuberia'
import { SCHEMA_VERSION_ACTUAL } from '../../modelo/proyecto'
import { resolverEstadoModulo2 } from '../../motor/modulo2/resolverEstadoModulo2'
import { resolverEstadoModulo3 } from '../../motor/modulo3/resolverEstadoModulo3'
import { resolverEstadoModulo4 } from '../../motor/modulo4/resolverEstadoModulo4'
import { catalogoMaterialesTuberia } from '../../motor/tuberias/materialTuberia'

describe('crearProyectoVacio', () => {
  it('no tiene ninguna entidad física: 0 UF / Locales / Artefactos y sin red hidráulica', () => {
    const proyecto = crearProyectoVacio()
    expect(proyecto.unidadesFuncionales).toEqual([])
    expect(proyecto.redHidraulica).toBeUndefined()
    expect(proyecto.configuracionMedidores).toBeUndefined()
    expect(proyecto.configuracionAbastecimiento).toBeUndefined()
  })

  it('conserva sólo lo estructural del PRODUCTO: schemaVersion y configuración hidráulica de arranque (Rápido)', () => {
    const proyecto = crearProyectoVacio()
    expect(proyecto.metadatos.schemaVersion).toBe(SCHEMA_VERSION_ACTUAL)
    expect(proyecto.configuracionHidraulica).toEqual({
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'estimado',
      granularidadHidraulica: 'simplificada',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    })
  })

  it('no arrastra ningún dato físico ni de IDs del proyecto de ejemplo', () => {
    const vacio = crearProyectoVacio()
    const ejemplo = proyectoInicial
    // Ningún parámetro físico del ejemplo.
    expect(vacio.parametros.presionSobreAcera_m).not.toBe(ejemplo.parametros.presionSobreAcera_m)
    expect(vacio.parametros.alturaArtefactoMasDesfavorable_m).toBe(0)
    // Serializado, no aparece ningún id de entidad del ejemplo.
    const serializado = JSON.stringify(vacio)
    for (const id of ['uf-1', 'local-bano', 'artefacto-bano-1', 'n-0', 't-general']) {
      expect(serializado).not.toContain(id)
    }
  })

  it('es un proyecto estructuralmente válido (sólo el error esperado "sin artefactos para calcular")', () => {
    const { problemas } = validarProyecto(
      crearProyectoVacio(),
      catalogoArtefactos,
      coeficientesMayoracion,
      catalogoSistemasDeTuberia,
    )
    const errores = problemas.filter((problema) => problema.severidad === 'error')
    expect(errores.map((problema) => problema.codigo)).toEqual(['proyectoSinArtefactosComputables'])
  })

  it('deja Módulo 2, 3 y 4 en "no iniciado"', () => {
    const proyecto = crearProyectoVacio()
    expect(
      resolverEstadoModulo2(
        proyecto,
        undefined,
        undefined,
        catalogoArtefactos,
        catalogoSistemasDeTuberia,
        catalogoMaterialesTuberia,
      ).estado,
    ).toBe('noIniciado')
    expect(resolverEstadoModulo3(proyecto, catalogoArtefactos, coeficientesMayoracion).estado).toBe('noIniciado')
    expect(resolverEstadoModulo4({ proyecto, catalogoArtefactos, coeficientesMayoracion }).estado).toBe('noIniciado')
  })

  it('es una factory: cada llamada devuelve objetos/arrays nuevos, sin referencias compartidas', () => {
    const a = crearProyectoVacio()
    const b = crearProyectoVacio()
    expect(a).not.toBe(b)
    expect(a.unidadesFuncionales).not.toBe(b.unidadesFuncionales)
    expect(a.parametros).not.toBe(b.parametros)
    expect(a.configuracionHidraulica).not.toBe(b.configuracionHidraulica)
  })
})
