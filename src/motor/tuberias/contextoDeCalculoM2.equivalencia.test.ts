// PERF-SCALE-01B -- equivalencia EXACTA entre la ruta legacy (sin contexto,
// cada llamada recalcula) y la ruta con `ContextoDeCalculoM2` compartido
// (hidráulica / diámetro comercial de cada Tramo memoizados por resolución).
//
// ARGUMENTO DE COBERTURA. `resolverEstadoModulo2` es una función pura de los
// resultados por terminal de `resolverPresionResidualDeCamino` (sólo hace
// `switch (resultado.tipo)` y agrega). Por tanto, si para CADA terminal el
// resultado de `resolverPresionResidualDeCamino` es byte-idéntico con y sin
// contexto -- y además idéntico sea cual sea el orden en que los terminales
// pasan por un contexto COMPARTIDO (el riesgo real de un memo: contaminación
// cruzada entre caminos) -- entonces el `EstadoModulo2` agregado también lo
// es. Eso, más la suite completa (1623 tests) verde con el contexto
// threadeado por dentro de `resolverEstadoModulo2` sin rebaselinear ningún
// golden, es la demostración de equivalencia.
//
// Escenarios: proyecto de ejemplo real (AF/AC/producción ACS/mixtos) en sus
// tres combinaciones metodológicas (estimado+simplificada, detallado+
// profesional, Hazen→Darcy) y el fixture de escala en dos tamaños y ambos
// métodos de pérdida localizada. Se comparan, para todos los Tramos y todos
// los terminales: resolverHidraulicaDeTramo, resolverDiametroComercialDeTramo
// y resolverPresionResidualDeCamino.
import { describe, it, expect } from 'vitest'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import type { Proyecto } from '../../modelo/proyecto'
import { proyectoInicial } from '../../interfaz/paginas/proyectoDeEjemplo'
import { resolverEntradasDeVerificacion } from '../../interfaz/paginas/resolverEntradasDeVerificacion'
import { catalogoSistemasDeTuberia } from './sistemaDeTuberia'
import { catalogoMaterialesTuberia } from './materialTuberia'
import { resolverHidraulicaDeTramo } from './resolverHidraulicaDeTramo'
import { resolverDiametroComercialDeTramo } from './resolverDiametroComercialDeTramo'
import {
  resolverPresionResidualDeCamino,
  type ResultadoPresionResidualDeCamino,
} from './presion/resolverPresionResidualDeCamino'
import { crearContextoDeCalculoM2 } from './contextoDeCalculoM2'
import { generarProyectoDeEscala } from '../../pruebas/escala/generarProyectoDeEscala'
import { obtenerCaminoHaciaOrigen } from './topologia/obtenerCaminoHaciaOrigen'
import { obtenerArtefactosAguasAbajo } from './topologia/obtenerArtefactosAguasAbajo'
import { identificarTramosRepresentativosDeLocales } from './topologia/identificarTramoRepresentativoDeLocal'
import { crearIndiceTopologico } from './topologia/indiceTopologico'

function conConfig(proyecto: Proyecto, overrides: Partial<Proyecto['configuracionHidraulica']>): Proyecto {
  return { ...proyecto, configuracionHidraulica: { ...proyecto.configuracionHidraulica, ...overrides } }
}

interface Escenario {
  readonly nombre: string
  readonly proyecto: Proyecto
}

const escenarios: readonly Escenario[] = [
  { nombre: 'ejemplo real · estimado + simplificada', proyecto: proyectoInicial },
  {
    nombre: 'ejemplo real · detallado + profesional',
    proyecto: conConfig(proyectoInicial, { metodoPerdidaLocalizada: 'detallado', granularidadHidraulica: 'profesional' }),
  },
  {
    nombre: 'ejemplo real · Hazen-Williams → Darcy-Weisbach',
    proyecto: conConfig(proyectoInicial, { metodoPerdidaDistribuida: 'darcyWeisbach' }),
  },
  { nombre: 'escala 3×2 · estimado + profesional', proyecto: generarProyectoDeEscala({ cantidadUf: 3, localesPorUf: 2 }) },
  {
    nombre: 'escala 3×2 · detallado + profesional',
    proyecto: conConfig(generarProyectoDeEscala({ cantidadUf: 3, localesPorUf: 2 }), {
      metodoPerdidaLocalizada: 'detallado',
    }),
  },
  { nombre: 'escala 5×3 · estimado + profesional', proyecto: generarProyectoDeEscala({ cantidadUf: 5, localesPorUf: 3 }) },
  {
    // PERF-SCALE-01D: granularidad 'simplificada' a escala es el escenario
    // real que expuso identificarTramosRepresentativosDeLocales como
    // hotspot -- generarProyectoDeEscala fija 'profesional' por defecto
    // (PERF-SCALE-01A no reabre M2-TOPO), así que este escenario lo
    // sobrescribe explícitamente.
    nombre: 'escala 5×3 · estimado + simplificada',
    proyecto: conConfig(generarProyectoDeEscala({ cantidadUf: 5, localesPorUf: 3 }), {
      granularidadHidraulica: 'simplificada',
    }),
  },
]

describe('PERF-SCALE-01B — equivalencia contexto compartido ≡ legacy', () => {
  for (const escenario of escenarios) {
    describe(escenario.nombre, () => {
      const entradas = resolverEntradasDeVerificacion(escenario.proyecto, catalogoArtefactos, coeficientesMayoracion)
      const pv = entradas.proyectoParaVerificacion
      const red = pv.redHidraulica
      if (red === undefined) throw new Error('escenario sin redHidraulica')
      const tramoIds = red.tramos.map((t) => t.id)
      const terminalIds = red.nodos.filter((n) => n.referencia?.tipo === 'artefacto').map((n) => n.id)

      it('PERF-SCALE-01D · obtenerCaminoHaciaOrigen: contexto (índice compartido) ≡ sin contexto', () => {
        const ctx = crearContextoDeCalculoM2()
        for (const terminalId of terminalIds) {
          const sinContexto = obtenerCaminoHaciaOrigen(red, terminalId)
          const conContexto = obtenerCaminoHaciaOrigen(red, terminalId, ctx)
          expect(conContexto).toEqual(sinContexto)
        }
      })

      it('PERF-SCALE-01D · obtenerArtefactosAguasAbajo: índice compartido ≡ sin índice', () => {
        const indice = crearIndiceTopologico(red)
        for (const tramoId of tramoIds) {
          const sinIndice = obtenerArtefactosAguasAbajo(pv, tramoId)
          const conIndice = obtenerArtefactosAguasAbajo(pv, tramoId, indice)
          expect(conIndice).toEqual(sinIndice)
        }
      })

      it('PERF-SCALE-01D · identificarTramosRepresentativosDeLocales: contexto ≡ sin contexto', () => {
        const ctx = crearContextoDeCalculoM2()
        const sinContexto = identificarTramosRepresentativosDeLocales(pv)
        const conContexto = identificarTramosRepresentativosDeLocales(pv, ctx)
        expect(conContexto).toEqual(sinContexto)
      })

      it('resolverHidraulicaDeTramo: contexto ≡ sin contexto, y el hit devuelve el mismo objeto memoizado', () => {
        const ctx = crearContextoDeCalculoM2()
        for (const tramoId of tramoIds) {
          const sinContexto = resolverHidraulicaDeTramo(pv, tramoId, catalogoArtefactos)
          const miss = resolverHidraulicaDeTramo(pv, tramoId, catalogoArtefactos, ctx)
          const hit = resolverHidraulicaDeTramo(pv, tramoId, catalogoArtefactos, ctx)
          expect(miss).toEqual(sinContexto)
          expect(hit).toBe(miss) // el hit reutiliza la MISMA referencia (no recalcula, no clona)
        }
        // El memo no se muta después de guardarse: re-leer todo el contexto
        // tras haberlo llenado sigue coincidiendo con un recálculo fresco.
        for (const tramoId of tramoIds) {
          expect(ctx.hidraulicaPorTramo.get(tramoId)).toEqual(resolverHidraulicaDeTramo(pv, tramoId, catalogoArtefactos))
        }
      })

      it('resolverDiametroComercialDeTramo: contexto ≡ sin contexto, y el hit devuelve el mismo objeto memoizado', () => {
        const ctx = crearContextoDeCalculoM2()
        for (const tramoId of tramoIds) {
          const sinContexto = resolverDiametroComercialDeTramo(
            pv,
            tramoId,
            catalogoArtefactos,
            catalogoSistemasDeTuberia,
          )
          const miss = resolverDiametroComercialDeTramo(pv, tramoId, catalogoArtefactos, catalogoSistemasDeTuberia, ctx)
          const hit = resolverDiametroComercialDeTramo(pv, tramoId, catalogoArtefactos, catalogoSistemasDeTuberia, ctx)
          expect(miss).toEqual(sinContexto)
          expect(hit).toBe(miss)
        }
      })

      it('resolverPresionResidualDeCamino: contexto compartido ≡ sin contexto, en cualquier orden de terminales', () => {
        const pDisp = entradas.presionDisponible_mca
        if (pDisp === undefined) {
          // Sin presión disponible resolverPresionResidualDeCamino no es el
          // camino comparable de este escenario -- los otros dos its ya lo cubren.
          return
        }
        const resolverTerminal = (nodoId: string, ctx?: Parameters<typeof resolverPresionResidualDeCamino>[7]) =>
          resolverPresionResidualDeCamino(
            pv,
            nodoId,
            pDisp,
            entradas.hfMedidorDeTerminal(nodoId),
            catalogoArtefactos,
            catalogoSistemasDeTuberia,
            catalogoMaterialesTuberia,
            ctx,
          )

        const legacy = new Map<string, ResultadoPresionResidualDeCamino>(
          terminalIds.map((id) => [id, resolverTerminal(id)]),
        )

        // Contexto compartido, orden de declaración.
        const ctxAdelante = crearContextoDeCalculoM2()
        for (const id of terminalIds) {
          expect(resolverTerminal(id, ctxAdelante)).toEqual(legacy.get(id))
        }

        // Contexto compartido, orden inverso: si un terminal contaminara el
        // resultado de otro vía el memo, el orden lo revelaría.
        const ctxAtras = crearContextoDeCalculoM2()
        for (const id of [...terminalIds].reverse()) {
          expect(resolverTerminal(id, ctxAtras)).toEqual(legacy.get(id))
        }
      })
    })
  }
})
