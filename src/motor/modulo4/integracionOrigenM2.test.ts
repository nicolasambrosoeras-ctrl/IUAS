// Regresión de la integración M4-G (D-δ.68): el origen hidráulico de la
// verificación de presión de Módulo 2 se deriva del esquema de
// abastecimiento, con exactamente la misma semántica que producía el
// selector local ya retirado del Panel de Presión:
//
//   directa               -> Pdisponible = presionSobreAcera_m ; medidor general EN el camino
//   tanqueElevado          -> Pdisponible = 0                    ; medidor general NO en el camino
//   cisternaBombeoElevado  -> IDÉNTICO a tanqueElevado (la cisterna/bomba están aguas arriba)
//
// Las primitivas de M2/M3 no cambiaron -- esta suite verifica el mapeo y
// que M2/M3 siguen dando el mismo número.
import { describe, it, expect } from 'vitest'
import type {
  Artefacto,
  ConfiguracionDeAbastecimiento,
  MetadatosProyecto,
  Proyecto,
  UnidadFuncional,
} from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, ReferenciaDeArtefacto, Tramo } from '../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { catalogoSistemasDeTuberia } from '../tuberias/sistemaDeTuberia'
import { catalogoMaterialesTuberia } from '../tuberias/materialTuberia'
import { resolverPresionResidualDeCamino } from '../tuberias/presion/resolverPresionResidualDeCamino'
import { resolverPerdidasDeMedidoresParaTerminal } from '../modulo3/resolverPerdidasDeMedidoresParaTerminal'
import type {
  EstadoModulo3,
  ResultadoMedidorGeneral,
} from '../modulo3/resolverEstadoModulo3'
import { resolverOrigenHidraulicoEfectivo } from './resolverOrigenHidraulico'

// --- réplica EXACTA de la derivación que hace el Panel de Presión --------

function derivarPresionDisponible_mca(proyecto: Proyecto): number | undefined {
  const esquema = proyecto.configuracionAbastecimiento?.esquema
  if (esquema === undefined) return undefined
  const origen = resolverOrigenHidraulicoEfectivo(esquema)
  return origen === 'tanqueElevado' ? 0 : proyecto.parametros.presionSobreAcera_m
}

function derivarOrigenDeMedidores(proyecto: Proyecto): 'alimentacionDirecta' | 'tanqueElevado' | undefined {
  const esquema = proyecto.configuracionAbastecimiento?.esquema
  if (esquema === undefined) return undefined
  return resolverOrigenHidraulicoEfectivo(esquema) === 'tanqueElevado' ? 'tanqueElevado' : 'alimentacionDirecta'
}

// --- fixture: raíz(cota) -> mid -> terminal(cota 8, lavatorio) ----------

function metadatos(): MetadatosProyecto {
  return {
    nombre: 'Regresión M4-G',
    obra: 'Obra',
    comitente: 'Comitente',
    fecha: '2026-01-01',
    schemaVersion: '1.0.0',
    versionNormativa: 'eras-2023',
  }
}

function referenciaDe(unidadFuncionalId: string, localId: string, artefactoId: string): ReferenciaDeArtefacto {
  return { tipo: 'artefacto', unidadFuncionalId, localId, artefactoId }
}

function artefacto(id: string, artefactoId: string): Artefacto {
  return { id, artefactoId, cantidad: 1, origen: 'normativo' }
}

const RED: RedHidraulica = {
  nodos: [
    { id: 'raiz', cota_m: 0 },
    { id: 'mid' },
    { id: 'terminal', referencia: referenciaDe('uf-1', 'local-1', 'inst-1'), cota_m: 8 },
  ] satisfies Nodo[],
  tramos: [
    { id: 't0', nodoOrigenId: 'raiz', nodoDestinoId: 'mid', red: 'AF', longitud_m: 4, accesorios: [] },
    { id: 't1', nodoOrigenId: 'mid', nodoDestinoId: 'terminal', red: 'AF', longitud_m: 3, accesorios: [] },
  ] satisfies Tramo[],
}

const UF: UnidadFuncional = {
  id: 'uf-1',
  nombre: 'uf-1',
  niveles: [
    {
      id: 'uf-1-nivel-1',
      nombre: 'Nivel 1',
      // GEOM-UX-01: la cota efectiva del terminal se deriva de la cota de
      // piso de la UF + la altura IUAS del tipo (lavatorio 0,90). Se fija la
      // cota de piso en 7,1 para que la efectiva reproduzca el `cota_m: 8`
      // clásico del Nodo -- este archivo aísla el efecto del ORIGEN, no de
      // la geometría del terminal, así que su balance queda byte-idéntico.
      cotaHidraulicaReferencia_m: 7.1,
      locales: [{ id: 'local-1', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto('inst-1', 'lavatorio')] }],
    },
  ],
}

function proyecto(esquema: ConfiguracionDeAbastecimiento['esquema'], presionSobreAcera_m: number): Proyecto {
  return {
    metadatos: metadatos(),
    parametros: { tipoDeProyecto: 'viviendaIndividual', presionSobreAcera_m, alturaArtefactoMasDesfavorable_m: 0 },
    unidadesFuncionales: [UF],
    redHidraulica: RED,
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'detallado',
      granularidadHidraulica: 'profesional',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
    configuracionAbastecimiento: { esquema },
  }
}

function presionResidual(p: Proyecto) {
  const pdisp = derivarPresionDisponible_mca(p)
  if (pdisp === undefined) throw new Error('fixture inválido: sin Pdisponible derivable')
  return resolverPresionResidualDeCamino(
    p,
    'terminal',
    pdisp,
    0.5, // hfMedidor de borde fijo, para aislar el efecto del origen
    catalogoArtefactos,
    catalogoSistemasDeTuberia,
    catalogoMaterialesTuberia,
  )
}

describe('integración M4-G: origen efectivo de M2 desde configuracionAbastecimiento', () => {
  it('G3: tanqueElevado y cisternaBombeoElevado producen un balance de presión BYTE-IDÉNTICO', () => {
    const elevado = presionResidual(proyecto('tanqueElevado', 15))
    const cisterna = presionResidual(proyecto('cisternaBombeoElevado', 15))
    // presionSobreAcera_m distinto a propósito: no debe influir en el
    // esquema con tanque (Pdisponible = 0 en ambos).
    const cisternaOtraAcera = presionResidual(proyecto('cisternaBombeoElevado', 999))

    expect(cisterna).toEqual(elevado)
    expect(cisternaOtraAcera).toEqual(elevado)
  })

  it('G4/G25: directa usa presionSobreAcera_m como Pdisponible; +5 m de acera => +5 m de presión residual', () => {
    const a = presionResidual(proyecto('directa', 20))
    const b = presionResidual(proyecto('directa', 25))
    if (a.tipo !== 'balanceCompleto' || b.tipo !== 'balanceCompleto') {
      throw new Error(`se esperaba balanceCompleto (a=${a.tipo}, b=${b.tipo})`)
    }
    expect(b.presionResidual_mca - a.presionResidual_mca).toBeCloseTo(5, 10)
  })

  it('G26 (anti-atajo): directa usa presionSobreAcera_m TAL CUAL, nunca presionSobreAcera_m − algún desnivel', () => {
    // El fixture no persiste desnivelConexion_m; aunque lo persistiera, M2
    // no debe leerlo. Se comprueba que el balance con Pdisponible=20
    // coincide con pasar 20 explícito a la primitiva (misma raíz cota 0).
    const viaEsquema = presionResidual(proyecto('directa', 20))
    const viaPrimitiva = resolverPresionResidualDeCamino(
      proyecto('directa', 20),
      'terminal',
      20,
      0.5,
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )
    expect(viaEsquema).toEqual(viaPrimitiva)
  })

  // --- M3-E: el medidor general por origen (G6/G7/G8) ---

  const general = (hf: number): ResultadoMedidorGeneral => ({
    ambito: 'general',
    qcDiseno_lps: 0.5,
    qcDiseno_m3h: 1.8,
    qcl_lpm: 30,
    recomendado: { dnMedidor_mm: 19, capacidadMaxima_m3h: 5, caudalMedio_m3h: 3.75, qcProyectoTabla_m3h: 2.5, hfMedidor_mca: hf },
    adoptado: {
      dnMedidor_mm: 19,
      capacidadMaxima_m3h: 5,
      caudalMedio_m3h: 3.75,
      qcProyectoTabla_m3h: 2.5,
      origen: 'automatico',
      criterioSeleccion: 'satisface',
      hfMedidor_mca: hf,
    },
  })
  const estadoM3 = (hf: number): EstadoModulo3 => ({
    estado: 'evaluado',
    resultado: { medidorGeneral: general(hf), medidoresIndividuales: [] },
  })
  const CONFIG_NO_PH = { esPropiedadHorizontal: false, tipoProvisionACS: 'individual' } as const

  function perdidasDeMedidores(esquema: ConfiguracionDeAbastecimiento['esquema'], hfGeneral: number) {
    const origen = derivarOrigenDeMedidores(proyecto(esquema, 15))
    if (origen === undefined) throw new Error('fixture inválido')
    return resolverPerdidasDeMedidoresParaTerminal({
      estadoModulo3: estadoM3(hfGeneral),
      configuracionMedidores: CONFIG_NO_PH,
      unidadFuncionalIdDelTerminal: 'uf-1',
      redDelTerminal: 'AF',
      origenHidraulico: origen,
    })
  }

  it('G6: esquema directa -> el medidor general ENTRA al camino del terminal', () => {
    const r = perdidasDeMedidores('directa', 0.8)
    expect(r).toMatchObject({ estado: 'determinadas', hfTotal_mca: 0.8 })
  })

  it('G7: esquema tanqueElevado -> el medidor general NO entra (aguas arriba del almacenamiento)', () => {
    const r = perdidasDeMedidores('tanqueElevado', 0.8)
    expect(r).toEqual({ estado: 'determinadas', componentes: [], hfTotal_mca: 0 })
  })

  it('G8: esquema cisternaBombeoElevado -> IDÉNTICO a tanqueElevado (general fuera del camino)', () => {
    expect(perdidasDeMedidores('cisternaBombeoElevado', 0.8)).toEqual(perdidasDeMedidores('tanqueElevado', 0.8))
  })

  it('G20: cambiar el hf del medidor general mueve el resultado en directa, pero NO en los esquemas con tanque', () => {
    const directaBaja = perdidasDeMedidores('directa', 0.4)
    const directaAlta = perdidasDeMedidores('directa', 1.2)
    expect(directaBaja).not.toEqual(directaAlta)

    expect(perdidasDeMedidores('tanqueElevado', 0.4)).toEqual(perdidasDeMedidores('tanqueElevado', 1.2))
    expect(perdidasDeMedidores('cisternaBombeoElevado', 0.4)).toEqual(
      perdidasDeMedidores('cisternaBombeoElevado', 1.2),
    )
  })
})
