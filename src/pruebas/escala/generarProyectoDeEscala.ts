// Generador determinista de Proyectos de ESCALA (PERF-SCALE-01A).
//
// Reproduce, sin que nadie tenga que armar 14 UF a mano, el caso real que
// volvió casi inutilizable la app: un proyecto válido y hidráulicamente
// COMPLETO con muchas Unidades Funcionales y muchos terminales. Usa
// exclusivamente los modelos reales (`Proyecto`, `RedHidraulica`) y la
// misma topología que el proyecto de ejemplo canónico
// (`interfaz/paginas/proyectoDeEjemplo`) replicada por UF/Local:
//
//   n-general ──t-general(AF)──▶ n-0 (distribución AF)
//   n-0 ──t-af-acs-{u}(AF)──▶ n-acs-{u} (producción ACS de la UF u)
//   n-0 ──t-af-br-{u}-{l}(AF)──▶ n-af-br-{u}-{l} ──┬─▶ terminal AF lavatorio
//                                                  ├─▶ terminal AF ducha
//                                                  ├─▶ terminal AF bidet
//                                                  └─▶ terminal AF inodoro
//   n-acs-{u} ──t-ac-br-{u}-{l}(AC)──▶ n-ac-br-{u}-{l} ──┬─▶ terminal AC lavatorio
//                                                        ├─▶ terminal AC ducha
//                                                        └─▶ terminal AC bidet
//
// (lavatorio / receptáculo de ducha / bidet son mixtos AF+AC; el inodoro a
// depósito es exclusivamente AF -- misma decisión física que el proyecto
// de ejemplo). Cada UF es un nivel distinto (nivel = u-1, cota de piso
// 3·(u-1)). Todos los tramos traen `longitud_m`. `configuracionHidraulica`
// arranca en modo Profesional + pérdida localizada 'estimado' para que
// TODA la ruta de verificación de presión se ejecute (peor caso para el
// motor). El proyecto NO declara montantes ni tees: PERF-SCALE-01A no
// reabre M2-TOPO.
//
// `NIVEL_DE_ESCALA` fija tamaños reproducibles; `contarMagnitudesDeEscala`
// expone nodos/tramos/terminales para la tabla de baseline.
import type {
  Artefacto,
  Local,
  Proyecto,
  UnidadFuncional,
} from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, ReferenciaDeArtefacto, Tramo } from '../../modelo/redHidraulica'
import { localesDeUnidadFuncional } from '../../motor/tuberias/geometria/resolverCotaHidraulicaDeArtefacto'
import { nombreDeNivel } from '../../interfaz/paginas/nivelUnidadFuncional'

export interface FormaDeEscala {
  // Unidades funcionales del proyecto.
  readonly cantidadUf: number
  // Locales (baños) por unidad funcional.
  readonly localesPorUf: number
}

// Baños de 4 artefactos: 4 terminales AF + 3 terminales AC = 7 por Local.
const ARTEFACTOS_DE_BANIO = [
  { catalogoId: 'lavatorio', mixto: true },
  { catalogoId: 'receptaculoDucha', mixto: true },
  { catalogoId: 'bidet', mixto: true },
  { catalogoId: 'inodoroDeposito', mixto: false },
] as const

const NODO_GENERAL = 'n-general'
const NODO_DISTRIBUCION_AF = 'n-0'
const LONGITUD_GENERAL_M = 10
const LONGITUD_ACS_M = 4
const LONGITUD_BRANCH_M = 3
const LONGITUD_TERMINAL_M = 2

// Tamaños canónicos. 'M' bracketea el caso real informado (14 UF /
// ~238 terminales): 14 UF × 3 baños × 7 = 294 terminales.
export const NIVEL_DE_ESCALA = {
  S: { cantidadUf: 1, localesPorUf: 2 },
  M: { cantidadUf: 14, localesPorUf: 3 },
  L: { cantidadUf: 40, localesPorUf: 4 },
  XL: { cantidadUf: 100, localesPorUf: 4 },
} as const satisfies Record<string, FormaDeEscala>

export type NivelDeEscala = keyof typeof NIVEL_DE_ESCALA

export interface MagnitudesDeEscala {
  readonly unidadesFuncionales: number
  readonly locales: number
  readonly artefactos: number
  readonly nodos: number
  readonly tramos: number
  readonly terminales: number
}

export function contarMagnitudesDeEscala(proyecto: Proyecto): MagnitudesDeEscala {
  const red = proyecto.redHidraulica
  const locales = proyecto.unidadesFuncionales.reduce((suma, uf) => suma + localesDeUnidadFuncional(uf).length, 0)
  const artefactos = proyecto.unidadesFuncionales.reduce(
    (suma, uf) => suma + localesDeUnidadFuncional(uf).reduce((s, l) => s + l.artefactos.length, 0),
    0,
  )
  const terminales = red === undefined ? 0 : red.nodos.filter((n) => n.referencia?.tipo === 'artefacto').length
  return {
    unidadesFuncionales: proyecto.unidadesFuncionales.length,
    locales,
    artefactos,
    nodos: red?.nodos.length ?? 0,
    tramos: red?.tramos.length ?? 0,
    terminales,
  }
}

export function generarProyectoDeEscala(forma: FormaDeEscala): Proyecto {
  const unidadesFuncionales: UnidadFuncional[] = []
  const nodos: Nodo[] = [{ id: NODO_GENERAL, cota_m: 0 }, { id: NODO_DISTRIBUCION_AF }]
  const tramos: Tramo[] = [
    { id: 't-general', nodoOrigenId: NODO_GENERAL, nodoDestinoId: NODO_DISTRIBUCION_AF, red: 'AF', longitud_m: LONGITUD_GENERAL_M },
  ]

  for (let u = 1; u <= forma.cantidadUf; u += 1) {
    const ufId = `uf-${u}`
    const nivel = u - 1
    const nodoAcsId = `n-acs-${u}`
    nodos.push({ id: nodoAcsId, referencia: { tipo: 'produccionACS' } })
    tramos.push({
      id: `t-af-acs-${u}`,
      nodoOrigenId: NODO_DISTRIBUCION_AF,
      nodoDestinoId: nodoAcsId,
      red: 'AF',
      longitud_m: LONGITUD_ACS_M,
    })

    const locales: Local[] = []
    for (let l = 1; l <= forma.localesPorUf; l += 1) {
      const localId = `local-${u}-${l}`
      const nodoAfBranchId = `n-af-br-${u}-${l}`
      const nodoAcBranchId = `n-ac-br-${u}-${l}`
      nodos.push({ id: nodoAfBranchId }, { id: nodoAcBranchId })
      tramos.push({
        id: `t-af-br-${u}-${l}`,
        nodoOrigenId: NODO_DISTRIBUCION_AF,
        nodoDestinoId: nodoAfBranchId,
        red: 'AF',
        longitud_m: LONGITUD_BRANCH_M,
      })
      tramos.push({
        id: `t-ac-br-${u}-${l}`,
        nodoOrigenId: nodoAcsId,
        nodoDestinoId: nodoAcBranchId,
        red: 'AC',
        longitud_m: LONGITUD_BRANCH_M,
      })

      const artefactos: Artefacto[] = []
      ARTEFACTOS_DE_BANIO.forEach((tipo, k) => {
        const artefactoId = `art-${u}-${l}-${k}`
        artefactos.push({ id: artefactoId, artefactoId: tipo.catalogoId, cantidad: 1, origen: 'normativo' })
        const referencia: ReferenciaDeArtefacto = {
          tipo: 'artefacto',
          unidadFuncionalId: ufId,
          localId,
          artefactoId,
        }
        const nodoAfTerminalId = `n-af-${u}-${l}-${k}`
        nodos.push({ id: nodoAfTerminalId, referencia })
        tramos.push({
          id: `t-af-${u}-${l}-${k}`,
          nodoOrigenId: nodoAfBranchId,
          nodoDestinoId: nodoAfTerminalId,
          red: 'AF',
          longitud_m: LONGITUD_TERMINAL_M,
        })
        if (tipo.mixto) {
          const nodoAcTerminalId = `n-ac-${u}-${l}-${k}`
          nodos.push({ id: nodoAcTerminalId, referencia })
          tramos.push({
            id: `t-ac-${u}-${l}-${k}`,
            nodoOrigenId: nodoAcBranchId,
            nodoDestinoId: nodoAcTerminalId,
            red: 'AC',
            longitud_m: LONGITUD_TERMINAL_M,
          })
        }
      })

      locales.push({ id: localId, tipo: 'bano', regimen: 'domiciliario', artefactos })
    }

    unidadesFuncionales.push({
      id: ufId,
      nombre: `Unidad funcional ${u}`,
      niveles: [
        {
          id: `nivel-${u}`,
          nombre: nombreDeNivel(nivel),
          nivel,
          cotaHidraulicaReferencia_m: 3 * nivel,
          locales,
        },
      ],
    })
  }

  const redHidraulica: RedHidraulica = { nodos, tramos }

  return {
    metadatos: {
      nombre: 'Proyecto de escala (PERF-SCALE-01A)',
      obra: 'Benchmark de motor',
      comitente: 'IUAS',
      fecha: '2026-09-10',
      schemaVersion: '1.0.0',
      versionNormativa: 'eras-2023',
    },
    parametros: {
      tipoDeProyecto: 'viviendaMultifamiliar',
      presionSobreAcera_m: 60,
      alturaArtefactoMasDesfavorable_m: 3,
    },
    modoTrabajo: 'profesional',
    unidadesFuncionales,
    redHidraulica,
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'estimado',
      granularidadHidraulica: 'profesional',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
    configuracionMedidores: {
      esPropiedadHorizontal: true,
      tipoProvisionACS: 'individual',
    },
    configuracionAbastecimiento: {
      esquema: 'directa',
    },
  }
}

export function generarProyectoDeEscalaPorNivel(nivel: NivelDeEscala): Proyecto {
  return generarProyectoDeEscala(NIVEL_DE_ESCALA[nivel])
}
