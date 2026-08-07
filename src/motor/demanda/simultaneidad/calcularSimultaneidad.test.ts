import { describe, it, expect } from 'vitest'
import { calcularSimultaneidad } from './calcularSimultaneidad'
import type { Proyecto, RegimenLocal, Artefacto } from '../../../modelo/proyecto'
import { catalogoArtefactos } from '../../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../../normativa/eras-2023/coeficientes-mayoracion'

function construirProyecto(
  regimen: RegimenLocal,
  artefactos: readonly Artefacto[],
  coeficienteA: 1 | 2 | 3 | 4 = 1,
): Proyecto {
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
      coeficienteA,
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

describe('calcularSimultaneidad — Qmax', () => {
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

describe('calcularSimultaneidad — K', () => {
  it('calcula K = Kc × a por aritmética básica', () => {
    const proyecto = construirProyecto(
      'noDomiciliario',
      [{ id: 'artefacto-1', artefactoId: 'lavatorio', cantidad: 4, origen: 'normativo' }],
      2,
    )

    const resultado = calcularResultado(proyecto)
    const kc = resultado.resultados.kc
    const k = resultado.resultados.k

    if (!('valor' in kc) || !('valor' in k)) {
      throw new Error('se esperaba un resultado numerico para Kc y K')
    }

    expect(k.valor).toBeCloseTo(kc.valor * 2, 4)
    expect(k.unidad).toBe('adimensional')
  })

  it('propaga el mismo estado indeterminado de Kc cuando n = 1, sin resolver A3', () => {
    const proyecto = construirProyecto(
      'noDomiciliario',
      [{ id: 'artefacto-1', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }],
      2,
    )

    const resultado = calcularResultado(proyecto)
    const kc = resultado.resultados.kc
    const k = resultado.resultados.k

    if (!('estado' in kc) || !('estado' in k)) {
      throw new Error('se esperaba un resultado indeterminado para Kc y K')
    }

    expect(k.estado).toBe('indeterminado')
    expect(k.motivo).toBe(kc.motivo)
  })

  it('registra el paso K en la traza con la referencia normativa correspondiente', () => {
    const proyecto = construirProyecto(
      'noDomiciliario',
      [{ id: 'artefacto-1', artefactoId: 'lavatorio', cantidad: 4, origen: 'normativo' }],
      2,
    )

    const resultado = calcularResultado(proyecto)

    const pasoK = resultado.pasos.find((paso) => paso.id === 'k')
    if (!pasoK) {
      throw new Error('se esperaba un paso de id "k" en la traza')
    }

    expect(pasoK.formulaId).toBe('ERAS-2023 §2.9.2.2')
    expect(pasoK.referencias).toContain('ERAS-2023 §2.9.2.2')
    expect(pasoK.entradas.some((entrada) => entrada.simbolo === 'a')).toBe(true)
  })
})
