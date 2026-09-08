import { describe, it, expect } from 'vitest'
import type { Proyecto } from '../../modelo/proyecto'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import { resolverEstadoModulo4 } from './resolverEstadoModulo4'

// Golden de ORQUESTACIÓN: verifica la cadena completa
//   Proyecto -> M1 real (calcularSimultaneidad) -> Qc exacto (sin redondeo)
//   -> resolverEstadoModulo4 -> calcularReservaDiaria
// reproduciendo el caso Golden G3 (Tabla N°3, CASOS-GOLDEN.md): el mismo
// conjunto de artefactos de G2, Qconexión 0,60 l/s y Tc 2 h -> Reserva de
// Diseño ≈ 0,7712 m³ (valor publicado 0,77). No re-verifica la aritmética
// de calcularReservaDiaria (eso es calcularReservaDiaria.golden.test.ts):
// comprueba que el orquestador la alcanza con el Qc real de M1.
describe('resolverEstadoModulo4 — Golden de composición M1 -> M4 (G3, Tabla N°3)', () => {
  it('esquema con tanque + Qc de Tabla N°2/N°3 + Qconexión 0,60 + Tc 2 h -> reservaCalculada ≈ 0,7712 m³', () => {
    const proyecto: Proyecto = {
      metadatos: {
        nombre: 'Proyecto de prueba',
        obra: 'Obra',
        comitente: 'Comitente',
        fecha: '2026-01-01',
        schemaVersion: '1.0.0',
        versionNormativa: 'eras-2023',
      },
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
      configuracionHidraulica: {
        metodoPerdidaDistribuida: 'hazenWilliams',
        metodoPerdidaLocalizada: 'detallado',
        granularidadHidraulica: 'profesional',
        materialTuberiaId: 'ppr',
        sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
      },
      configuracionAbastecimiento: { esquema: 'tanqueElevado', periodoConsumoMaximo_h: 2 },
    }

    const estado = resolverEstadoModulo4({
      proyecto,
      catalogoArtefactos,
      coeficientesMayoracion,
      qConexion_lps: 0.6,
    })

    expect(estado.estado).toBe('evaluado')
    if (estado.estado !== 'evaluado' || estado.resultado.tipo !== 'reservaCalculada') {
      throw new Error('se esperaba evaluado + reservaCalculada')
    }

    const { reserva } = estado.resultado
    expect(reserva.qc_lps).toBeCloseTo(0.7071067812, 9) // G2
    expect(reserva.deficit_lps).toBeCloseTo(0.1071067812, 9)
    expect(reserva.volumenReservaDiseno_m3).toBeCloseTo(0.7711688248, 7)
    expect(reserva.volumenReservaDiseno_m3).toBeCloseTo(0.77, 2) // valor publicado
  })
})
