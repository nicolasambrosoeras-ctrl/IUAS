// PERF-SCALE-01D -- propiedad de dominio que motiva el memo de React de
// ResultadoHidraulicoDeTramo (ver sonPropsDeDimensionamientoEquivalentes.ts)
// y que ya estaba documentada como pendiente de verificar en el handoff de
// PERF-SCALE-01C (ROADMAP D-δ.99): Qc/DN/V/hf NO dependen de `Nodo.cota_m`
// (pelo de agua) ni de `parametros.desnivelConexion_m` -- sólo la etapa de
// presión (desnivel_m, presionResidual_mca, cumpleMinimo) los usa.
//
// Se verifica sobre `resolverEstadoModulo2` (no sobre una función interna
// aislada) para cubrir el pipeline real de punta a punta, en ambas
// granularidades ('profesional' donde cada Tramo exige su propio
// relevamiento, y 'simplificada' -- el hotspot de PERF-SCALE-01D vivía en
// esta última) y con esquema 'tanqueElevado' (el único donde "pelo de agua
// mínimo" es un dato manual editable, CRIT-A39).
import { describe, it, expect } from 'vitest'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import { catalogoSistemasDeTuberia } from '../tuberias/sistemaDeTuberia'
import { catalogoMaterialesTuberia } from '../tuberias/materialTuberia'
import { resolverEstadoModulo2 } from './resolverEstadoModulo2'
import type { CandidatoTerminal } from '../tuberias/presion/resolverTerminalMasDesfavorable'
import { resolverEntradasDeVerificacion } from '../../interfaz/paginas/resolverEntradasDeVerificacion'
import { generarProyectoDeEscala } from '../../pruebas/escala/generarProyectoDeEscala'
import type { GranularidadHidraulica, Proyecto } from '../../modelo/proyecto'
import type { Nodo } from '../../modelo/redHidraulica'

function proyectoConTanqueElevado(granularidad: GranularidadHidraulica): Proyecto {
  const base = generarProyectoDeEscala({ cantidadUf: 3, localesPorUf: 2 })
  const red = base.redHidraulica!
  const nodos = red.nodos.map((nodo): Nodo => (nodo.id === 'n-general' ? { ...nodo, cota_m: 10 } : nodo))
  return {
    ...base,
    parametros: { ...base.parametros, desnivelConexion_m: 4 },
    redHidraulica: { ...red, nodos },
    configuracionHidraulica: { ...base.configuracionHidraulica, granularidadHidraulica: granularidad },
    configuracionAbastecimiento: { esquema: 'tanqueElevado' },
  }
}

function resolver(proyecto: Proyecto) {
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

// Subconjunto ESTRUCTURAL de un candidato: Qc/DN/V/hf (independientes de la
// presión disponible / pelo de agua). Deliberadamente EXCLUYE desnivel_m,
// presionResidual_mca y cumpleMinimo -- esos SÍ deben cambiar.
function estructuraDe(candidato: CandidatoTerminal): unknown {
  const r = candidato.resultado as Record<string, unknown>
  return {
    nodoId: candidato.nodoId,
    tipo: r['tipo'],
    hfDistribuida_mca: r['hfDistribuida_mca'],
    hfDistribuidaPorTramo: r['hfDistribuidaPorTramo'],
    hfLocalizada: r['hfLocalizada'],
    incrementoVerticalPorNivel: r['incrementoVerticalPorNivel'],
  }
}

function estructuraDeTodos(estado: ReturnType<typeof resolver>): readonly unknown[] {
  return estado.candidatos.map(estructuraDe)
}

describe.each(['profesional', 'simplificada'] as const)('granularidad %s', (granularidad) => {
  it('editar el pelo de agua (Nodo.cota_m de la raíz) no cambia Qc/DN/V/hf de ningún terminal', () => {
    const proyecto = proyectoConTanqueElevado(granularidad)
    const antes = estructuraDeTodos(resolver(proyecto))

    const red = proyecto.redHidraulica!
    const nodos = red.nodos.map((nodo): Nodo => (nodo.id === 'n-general' ? { ...nodo, cota_m: 12.37 } : nodo))
    const editado = { ...proyecto, redHidraulica: { ...red, nodos } }
    const despues = estructuraDeTodos(resolver(editado))

    expect(despues).toEqual(antes)
    expect(antes.length).toBeGreaterThan(0)
  })

  it('editar el desnivel de conexión no cambia Qc/DN/V/hf de ningún terminal', () => {
    const proyecto = proyectoConTanqueElevado(granularidad)
    const antes = estructuraDeTodos(resolver(proyecto))

    const editado = { ...proyecto, parametros: { ...proyecto.parametros, desnivelConexion_m: -3 } }
    const despues = estructuraDeTodos(resolver(editado))

    expect(despues).toEqual(antes)
  })
})
