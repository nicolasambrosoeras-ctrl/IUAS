import { describe, it, expect } from 'vitest'
import { calcularSimultaneidad } from './calcularSimultaneidad'
import type { Proyecto, RegimenLocal, Artefacto } from '../../../modelo/proyecto'
import { catalogoArtefactos } from '../../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../../normativa/eras-2023/coeficientes-mayoracion'

describe('calcularSimultaneidad — Qmax', () => {
  function construirProyecto(regimen: RegimenLocal, artefactos: readonly Artefacto[]): Proyecto {
    return {
      metadatos: {
        nombre: 'Proyecto de prueba',
        obra: 'Obra',
        comitente: 'Comitente',
        fecha: '2026-08-07',
        schemaVersion: '1.0.0',
        versionNormativa: 'eras-2023',
      },
      parametros: {
        coeficienteA: 1,
        presionSobreAcera_m: 2,
        alturaArtefactoMasDesfavorable_m: 3,
        material: 'PVC',
      },
      unidadesFuncionales: [
        {
          id: 'uf-1',
          nombre: 'Unidad funcional 1',
          locales: [
            {
              id: 'local-1',
              tipo: 'bano',
              regimen,
              artefactos,
            },
          ],
        },
      ],
    }
  }

  function calcularResultado(proyecto: Proyecto) {
    return calcularSimultaneidad({
      proyecto,
      normativa: {
        catalogoArtefactos,
        coeficientesMayoracion,
      },
    })
  }

  function obtenerQmax(proyecto: Proyecto) {
    const qmax = calcularResultado(proyecto).resultados.qmax

    if (!('valor' in qmax)) {
      throw new Error('se esperaba un resultado numerico para Qmax')
    }

    return qmax
  }

  it('calcula Qmax por aritmética básica, sin activación de CRIT-A8', () => {
    const proyecto = construirProyecto('domiciliario', [
      { id: 'artefacto-1', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' },
      { id: 'artefacto-2', artefactoId: 'banera', cantidad: 1, origen: 'normativo' },
    ])

    const qmax = obtenerQmax(proyecto)

    expect(qmax.valor).toBeCloseTo(0.5, 4)
  })

  it('en régimen domiciliario con CRIT-A8 activo, Qmax considera solo el artefacto con válvula automática', () => {
    const proyecto = construirProyecto('domiciliario', [
      { id: 'artefacto-1', artefactoId: 'inodoroValvula', cantidad: 2, origen: 'normativo' },
      { id: 'artefacto-2', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' },
    ])

    const qmax = obtenerQmax(proyecto)

    expect(qmax.valor).toBeCloseTo(3, 4)
  })

  it('en régimen no domiciliario, Qmax considera todos los artefactos del local', () => {
    const proyecto = construirProyecto('noDomiciliario', [
      { id: 'artefacto-1', artefactoId: 'inodoroValvula', cantidad: 2, origen: 'normativo' },
      { id: 'artefacto-2', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' },
    ])

    const qmax = obtenerQmax(proyecto)

    expect(qmax.valor).toBeCloseTo(3.2, 4)
  })

  it('registra Qmax en l/s y deja trazable en el paso que qu proviene de quTotal_lps', () => {
    const proyecto = construirProyecto('domiciliario', [
      { id: 'artefacto-1', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' },
      { id: 'artefacto-2', artefactoId: 'banera', cantidad: 1, origen: 'normativo' },
    ])

    const resultado = calcularResultado(proyecto)
    const qmax = obtenerQmax(proyecto)

    expect(qmax.unidad).toBe('l/s')

    const pasoQmax = resultado.pasos.find((paso) => paso.id === 'qmax')
    if (!pasoQmax) {
      throw new Error('se esperaba un paso de id "qmax" en la traza')
    }

    expect(pasoQmax.nota).toContain('quTotal_lps')
    expect(pasoQmax.entradas.every((entrada) => entrada.procedencia.includes('quTotal_lps'))).toBe(true)
  })
})
