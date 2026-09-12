import { describe, it, expect } from 'vitest'
import type { Proyecto } from '../../modelo/proyecto'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import { resolverEstadoModulo4 } from './resolverEstadoModulo4'

// Goldens END-TO-END de Módulo 4 (D-δ.65). Reconstruyen las planillas
// oficiales Tabla N°3 (G3) y Tabla N°4 (G4) desde un Proyecto real,
// pasando por TODA la cadena sin inyectar ningún valor intermedio:
//
//   Proyecto -> M1 (Qc exacto) ─┐
//   Proyecto -> presión sobre acera + desnivel -> presión de cálculo (§2.7)
//            -> Tabla N°1 (§2.7) -> Qconexión ─┤
//   Tc persistido ──────────────────────────────┤
//                                               └─> calcularReservaDiaria (§2.10.2)
//
// Ningún valor de este archivo puede cambiarse sin actualizar antes
// CASOS-GOLDEN.md (G1..G6).

const METADATOS = {
  nombre: 'Proyecto de prueba',
  obra: 'Obra',
  comitente: 'Comitente',
  fecha: '2026-08-07',
  schemaVersion: '1.0.0',
  versionNormativa: 'eras-2023',
} as const

const CONFIG_HIDRAULICA = {
  metodoPerdidaDistribuida: 'hazenWilliams',
  metodoPerdidaLocalizada: 'detallado',
  granularidadHidraulica: 'profesional',
  materialTuberiaId: 'ppr',
  sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
} as const

function resolver(proyecto: Proyecto) {
  return resolverEstadoModulo4({ proyecto, catalogoArtefactos, coeficientesMayoracion })
}

describe('resolverEstadoModulo4 — Golden end-to-end G3 (Tabla N°3)', () => {
  it('conjunto de Tabla N°2 + tanque elevado + Tc 2 h + conexión DN19 / P acera 5 m / Δz 0 -> reserva ≈ 0,7712 m³', () => {
    const proyecto: Proyecto = {
      metadatos: METADATOS,
      parametros: {
        tipoDeProyecto: 'viviendaIndividual',
        presionSobreAcera_m: 5,
        alturaArtefactoMasDesfavorable_m: 3,
        diametroNominalConexion_m: 0.019,
        desnivelConexion_m: 0,
      },
      unidadesFuncionales: [
        {
          id: 'uf-1',
          nombre: 'Unidad funcional 1',
          niveles: [
            {
              id: 'uf-1-nivel-1',
              nombre: 'Nivel 1',
              locales: [
                {
                  id: 'local-1',
                  tipo: 'bano',
                  regimen: 'domiciliario',
                  artefactos: [
                    { id: 'artefacto-1', artefactoId: 'lavatorio', cantidad: 2, origen: 'normativo' },
                    { id: 'artefacto-2', artefactoId: 'banera', cantidad: 1, origen: 'normativo' },
                    { id: 'artefacto-3', artefactoId: 'inodoroDeposito', cantidad: 2, origen: 'normativo' },
                    { id: 'artefacto-4', artefactoId: 'bidet', cantidad: 1, origen: 'normativo' },
                    { id: 'artefacto-5', artefactoId: 'piletaDeCocina', cantidad: 1, origen: 'normativo' },
                    { id: 'artefacto-6', artefactoId: 'piletaDeLavar', cantidad: 1, origen: 'normativo' },
                    { id: 'artefacto-7', artefactoId: 'receptaculoDucha', cantidad: 1, origen: 'normativo' },
                  ],
                },
              ],
            },
          ],
        },
      ],
      configuracionHidraulica: CONFIG_HIDRAULICA,
      configuracionAbastecimiento: { esquema: 'tanqueElevado', periodoConsumoMaximo_h: 2 },
    }

    const estado = resolver(proyecto)
    expect(estado.estado).toBe('evaluado')
    if (estado.estado !== 'evaluado' || estado.resultado.tipo !== 'reservaCalculada') {
      throw new Error('se esperaba evaluado + reservaCalculada')
    }

    const { conexion, reserva } = estado.resultado
    expect(conexion.presionCalculo_m).toBe(5) // 5 − 0
    expect(conexion.qConexion_lps).toBe(0.6) // Tabla N°1 DN19 / 5 m (G5)
    expect(conexion.interpolacion.aplicada).toBe(false)

    expect(reserva.qc_lps).toBeCloseTo(0.7071067812, 9) // G2
    expect(reserva.deficit_lps).toBeCloseTo(0.1071067812, 9)
    expect(reserva.volumenReservaDiseno_m3).toBeCloseTo(0.7711688248, 7)
    expect(reserva.volumenReservaDiseno_m3).toBeCloseTo(0.77, 2) // valor publicado
  })
})

describe('resolverEstadoModulo4 — Golden end-to-end G4 (Tabla N°4)', () => {
  it('conjunto de Tabla N°4 + tanque elevado + Tc 1 h + conexión DN25 / P acera 5 m / Δz 0 -> reserva ≈ 2,82 m³ (publicado ≈ 3)', () => {
    const proyecto: Proyecto = {
      metadatos: METADATOS,
      parametros: {
        tipoDeProyecto: 'viviendaIndividual',
        presionSobreAcera_m: 5,
        alturaArtefactoMasDesfavorable_m: 3,
        diametroNominalConexion_m: 0.025,
        desnivelConexion_m: 0,
      },
      unidadesFuncionales: [
        {
          id: 'uf-1',
          nombre: 'Unidad funcional 1',
          niveles: [
            {
              id: 'uf-1-nivel-1',
              nombre: 'Nivel 1',
              locales: [
                {
                  id: 'local-bano-principal',
                  tipo: 'bano',
                  regimen: 'domiciliario',
                  artefactos: [
                    { id: 'artefacto-1', artefactoId: 'inodoroValvula', cantidad: 1, origen: 'normativo' },
                  ],
                },
                {
                  id: 'local-bano-servicio',
                  tipo: 'toilette',
                  regimen: 'domiciliario',
                  artefactos: [
                    { id: 'artefacto-2', artefactoId: 'inodoroValvula', cantidad: 1, origen: 'normativo' },
                  ],
                },
                {
                  id: 'local-cocina',
                  tipo: 'cocina',
                  regimen: 'domiciliario',
                  artefactos: [
                    { id: 'artefacto-3', artefactoId: 'piletaDeCocina', cantidad: 1, origen: 'normativo' },
                    { id: 'artefacto-4', artefactoId: 'maquinaLavavajillas', cantidad: 1, origen: 'normativo' },
                  ],
                },
              ],
            },
          ],
        },
      ],
      configuracionHidraulica: CONFIG_HIDRAULICA,
      configuracionAbastecimiento: { esquema: 'tanqueElevado', periodoConsumoMaximo_h: 1 },
    }

    const estado = resolver(proyecto)
    if (estado.estado !== 'evaluado' || estado.resultado.tipo !== 'reservaCalculada') {
      throw new Error('se esperaba evaluado + reservaCalculada')
    }

    const { conexion, reserva } = estado.resultado
    expect(conexion.presionCalculo_m).toBe(5)
    expect(conexion.qConexion_lps).toBe(1.18) // Tabla N°1 DN25 / 5 m (G6)

    expect(reserva.qc_lps).toBeCloseTo(1.9629909153, 9) // G1
    expect(reserva.deficit_lps).toBeCloseTo(0.7829909153, 9)
    expect(reserva.volumenReservaDiseno_m3).toBeCloseTo(2.8187672951, 7)
    expect(Math.round(reserva.volumenReservaDiseno_m3)).toBe(3)
  })
})
