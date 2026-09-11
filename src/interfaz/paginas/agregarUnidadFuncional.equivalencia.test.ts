// PERF-SCALE-01E -- propiedad de dominio central del slice: agregar una
// Unidad Funcional VACÍA (sin Locales/Artefactos/terminales/tramos) no debe
// cambiar NINGÚN resultado hidráulico existente -- demanda/Qc, M2 (Qc/DN/V/hf/
// presión/crítico/completitud), M3, M4. Sólo el listado de unidadesFuncionales
// (y cualquier resumen que cuente UF) cambia. Esta es la base de seguridad
// del memo por-UF de SeccionDeUnidadFuncional (sonPropsDeSeccionDeUnidadFuncionalEquivalentes.ts):
// si esto no fuera cierto, saltear el re-render de las UF existentes sería
// incorrecto.
import { describe, it, expect } from 'vitest'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import { catalogoSistemasDeTuberia } from '../../motor/tuberias/sistemaDeTuberia'
import { catalogoMaterialesTuberia } from '../../motor/tuberias/materialTuberia'
import { resolverEstadoModulo2 } from '../../motor/modulo2/resolverEstadoModulo2'
import { resolverEstadoModulo3 } from '../../motor/modulo3/resolverEstadoModulo3'
import { resolverEstadoModulo4 } from '../../motor/modulo4/resolverEstadoModulo4'
import { resolverEntradasDeVerificacion } from './resolverEntradasDeVerificacion'
import { calcularSimultaneidad } from '../../motor/demanda/simultaneidad/calcularSimultaneidad'
import { agregarUnidadFuncionalVaciaEnProyecto } from './agregarUnidadFuncional'
import { generarProyectoDeEscala, contarMagnitudesDeEscala } from '../../pruebas/escala/generarProyectoDeEscala'
import type { Proyecto } from '../../modelo/proyecto'
import type { Nodo } from '../../modelo/redHidraulica'

// Réplica del esquema 'tanqueElevado' + profesional usado por
// benchmarkEscalaXXL.perf.ts (PERF-SCALE-01D): el caso real reportado, con
// pelo de agua y desnivel de conexión como datos distintos.
function proyectoDeEscala(cantidadUf: number): Proyecto {
  const base = generarProyectoDeEscala({ cantidadUf, localesPorUf: 3 })
  const red = base.redHidraulica!
  const nodos = red.nodos.map((nodo): Nodo => (nodo.id === 'n-general' ? { ...nodo, cota_m: 12 } : nodo))
  return {
    ...base,
    parametros: { ...base.parametros, diametroNominalConexion_m: 0.025, desnivelConexion_m: 5 },
    redHidraulica: { ...red, nodos },
    configuracionAbastecimiento: { esquema: 'tanqueElevado', periodoConsumoMaximo_h: 2 },
  }
}

function resolverM2(proyecto: Proyecto) {
  const entradas = resolverEntradasDeVerificacion(proyecto, catalogoArtefactos, coeficientesMayoracion)
  return resolverEstadoModulo2(
    entradas.proyectoParaVerificacion,
    entradas.presionDisponible_mca,
    entradas.hfMedidorDeTerminal,
    catalogoArtefactos,
    catalogoSistemasDeTuberia,
    catalogoMaterialesTuberia,
  )
}

describe.each([3, 10, 20])('agregar UF vacía a un proyecto de %i UF', (cantidadUf) => {
  const proyecto = proyectoDeEscala(cantidadUf)
  const { proyecto: conUfVacia, nuevaUf } = agregarUnidadFuncionalVaciaEnProyecto(proyecto)

  it('la UF nueva está vacía y es la única diferencia en unidadesFuncionales', () => {
    expect(conUfVacia.unidadesFuncionales.length).toBe(proyecto.unidadesFuncionales.length + 1)
    expect(nuevaUf.locales).toEqual([])
    expect(conUfVacia.unidadesFuncionales.slice(0, -1)).toEqual(proyecto.unidadesFuncionales)
  })

  it('preserva por referencia toda subestructura ajena a unidadesFuncionales', () => {
    expect(conUfVacia.redHidraulica).toBe(proyecto.redHidraulica)
    expect(conUfVacia.configuracionHidraulica).toBe(proyecto.configuracionHidraulica)
    expect(conUfVacia.configuracionMedidores).toBe(proyecto.configuracionMedidores)
    expect(conUfVacia.configuracionAbastecimiento).toBe(proyecto.configuracionAbastecimiento)
    expect(conUfVacia.montantes).toBe(proyecto.montantes)
    expect(conUfVacia.parametros).toBe(proyecto.parametros)
  })

  it('no agrega artefactos, terminales ni tramos', () => {
    const magAntes = contarMagnitudesDeEscala(proyecto)
    const magDespues = contarMagnitudesDeEscala(conUfVacia)
    expect(magDespues.artefactos).toBe(magAntes.artefactos)
    expect(magDespues.terminales).toBe(magAntes.terminales)
    expect(magDespues.tramos).toBe(magAntes.tramos)
    expect(magDespues.nodos).toBe(magAntes.nodos)
    expect(magDespues.unidadesFuncionales).toBe(magAntes.unidadesFuncionales + 1)
  })

  it('la demanda (Qc/simultaneidad) de las UF existentes no cambia', () => {
    const antes = calcularSimultaneidad({ proyecto, normativa: { catalogoArtefactos, coeficientesMayoracion } })
    const despues = calcularSimultaneidad({
      proyecto: conUfVacia,
      normativa: { catalogoArtefactos, coeficientesMayoracion },
    })
    expect(despues).toEqual(antes)
  })

  it('M2 (Qc/DN/V/hf/presión/crítico/completitud) resuelve exactamente igual', () => {
    const antes = resolverM2(proyecto)
    const despues = resolverM2(conUfVacia)
    expect(despues).toEqual(antes)
  })

  it('M3 resuelve exactamente igual', () => {
    const antes = resolverEstadoModulo3(proyecto, catalogoArtefactos, coeficientesMayoracion)
    const despues = resolverEstadoModulo3(conUfVacia, catalogoArtefactos, coeficientesMayoracion)
    expect(despues).toEqual(antes)
  })

  it('M4 resuelve exactamente igual', () => {
    const antes = resolverEstadoModulo4({ proyecto, catalogoArtefactos, coeficientesMayoracion })
    const despues = resolverEstadoModulo4({ proyecto: conUfVacia, catalogoArtefactos, coeficientesMayoracion })
    expect(despues).toEqual(antes)
  })
})
