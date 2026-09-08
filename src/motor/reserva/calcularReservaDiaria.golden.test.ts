import { describe, it, expect } from 'vitest'
import type { Proyecto } from '../../modelo/proyecto'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import { calcularSimultaneidad } from '../demanda/simultaneidad/calcularSimultaneidad'
import { calcularReservaDiaria } from './calcularReservaDiaria'

// Casos Golden G3 (Tabla N°3) y G4 (Tabla N°4), documentados en
// CASOS-GOLDEN.md. Ningún valor de este archivo puede cambiarse sin
// actualizar antes esa fuente. Cada caso compone M1 real
// (`calcularSimultaneidad`) -> `Qc` sin redondear -> `calcularReservaDiaria`,
// para verificar que la reserva se calcula sobre el Qc exacto aguas arriba
// (D-δ.61: "no redondear Qc/Dc antes de calcular volumen").
//
// El conjunto de artefactos de cada fixture es el mismo que ya validan los
// goldens G2/G1 del Motor de Demanda
// (`demanda/simultaneidad/calcularSimultaneidad.test.ts`); Tabla N°3
// continúa la secuencia de Tabla N°2 (mismo Qc) y Tabla N°4 incluye su
// propia porción de reserva. `qConexion_lps` y `tc_h` son los datos
// publicados en las planillas oficiales (ver CASOS-GOLDEN.md).

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

function qcDelProyecto(proyecto: Proyecto): number {
  const qc = calcularSimultaneidad({
    proyecto,
    normativa: { catalogoArtefactos, coeficientesMayoracion },
  }).resultados.qc
  if (!qc || !('valor' in qc)) {
    throw new Error('se esperaba un Qc numérico del Motor de Demanda')
  }
  return qc.valor
}

describe('calcularReservaDiaria — Caso Golden G3 (Tabla N°3, CASOS-GOLDEN.md)', () => {
  it('Qc de Tabla N°2 + Qconexión 0,60 l/s + Tc 2 h -> Reserva de Diseño ≈ 0,77 m³', () => {
    const proyecto: Proyecto = {
      metadatos: METADATOS,
      parametros: {
        tipoDeProyecto: 'viviendaIndividual',
        presionSobreAcera_m: 2,
        alturaArtefactoMasDesfavorable_m: 3,
      },
      unidadesFuncionales: [
        {
          id: 'uf-1',
          nombre: 'Unidad funcional 1',
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
      configuracionHidraulica: CONFIG_HIDRAULICA,
    }

    const qc = qcDelProyecto(proyecto)
    expect(qc).toBeCloseTo(0.7071067812, 9) // G2

    const reserva = calcularReservaDiaria({ qc_lps: qc, qConexion_lps: 0.6, tc_h: 2 })

    expect(reserva.deficit_lps).toBeCloseTo(0.1071067812, 9)
    expect(reserva.deficit_m3h).toBeCloseTo(0.3855844124, 7) // publicado ≈ 0,39 m³/h
    // Valor publicado: "Reserva Total Diaria de Diseño = 0,77 m³"
    // (reconstrucción exacta 0,77117 m³; el 1,00 m³ "a ejecutar" es
    // redondeo comercial no modelado — ver CASOS-GOLDEN.md G3).
    expect(reserva.volumenReservaDiseno_m3).toBeCloseTo(0.7711688248, 7)
    expect(reserva.volumenReservaDiseno_m3).toBeCloseTo(0.77, 2)
  })
})

describe('calcularReservaDiaria — Caso Golden G4 (Tabla N°4, CASOS-GOLDEN.md)', () => {
  it('Qc de Tabla N°4 + Qconexión 1,18 l/s + Tc 1 h -> Reserva de Diseño ≈ 2,82 m³ (publicado ≈ 3 m³)', () => {
    const proyecto: Proyecto = {
      metadatos: METADATOS,
      parametros: {
        tipoDeProyecto: 'viviendaIndividual',
        presionSobreAcera_m: 2,
        alturaArtefactoMasDesfavorable_m: 3,
      },
      unidadesFuncionales: [
        {
          id: 'uf-1',
          nombre: 'Unidad funcional 1',
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
      configuracionHidraulica: CONFIG_HIDRAULICA,
    }

    const qc = qcDelProyecto(proyecto)
    expect(qc).toBeCloseTo(1.9629909153, 9) // G1

    const reserva = calcularReservaDiaria({ qc_lps: qc, qConexion_lps: 1.18, tc_h: 1 })

    expect(reserva.deficit_lps).toBeCloseTo(0.7829909153, 9)
    // publicado ≈ 2,82 m³/h; con Tc = 1 h el volumen coincide numéricamente.
    expect(reserva.deficit_m3h).toBeCloseTo(2.8187672951, 7)
    expect(reserva.volumenReservaDiseno_m3).toBeCloseTo(2.8187672951, 7)
    // La planilla presenta la reserva redondeada a ≈ 3 m³.
    expect(Math.round(reserva.volumenReservaDiseno_m3)).toBe(3)
  })
})
