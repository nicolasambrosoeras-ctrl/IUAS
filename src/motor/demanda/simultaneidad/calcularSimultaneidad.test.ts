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
    expect(pasoQmax.formulaId).toBe('ERAS-2023 §2.9.2.1')
    expect(pasoQmax.referencias).toContain('ERAS-2023 §2.9.2.1')
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

describe('calcularSimultaneidad — Qc', () => {
  it('calcula Qc = Qmax × K para n ≥ 2', () => {
    const proyecto = construirProyecto(
      'noDomiciliario',
      [{ id: 'artefacto-1', artefactoId: 'lavatorio', cantidad: 4, origen: 'normativo' }],
      2,
    )

    const resultado = calcularResultado(proyecto)
    const qmax = resultado.resultados.qmax
    const k = resultado.resultados.k
    const qc = resultado.resultados.qc

    if (!('valor' in qmax) || !('valor' in k) || !('valor' in qc)) {
      throw new Error('se esperaba un resultado numerico para Qmax, K y Qc')
    }

    expect(qc.valor).toBeCloseTo(qmax.valor * k.valor, 4)
    expect(qc.unidad).toBe('l/s')
  })

  it('para n = 1 adopta Qc = Qmax = qu (CRIT-A4), mientras K permanece indeterminado', () => {
    const proyecto = construirProyecto(
      'noDomiciliario',
      [{ id: 'artefacto-1', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }],
      2,
    )

    const resultado = calcularResultado(proyecto)
    const qmax = resultado.resultados.qmax
    const k = resultado.resultados.k
    const qc = resultado.resultados.qc

    if (!('valor' in qmax) || !('valor' in qc)) {
      throw new Error('se esperaba un resultado numerico para Qmax y Qc')
    }
    if (!('estado' in k)) {
      throw new Error('se esperaba que K siguiera indeterminado')
    }

    expect(qc.valor).toBeCloseTo(qmax.valor, 4)
    expect(k.estado).toBe('indeterminado')
  })

  it('registra el paso Qc para n = 1 con CRIT-A4, sin fabricar una entrada K', () => {
    const proyecto = construirProyecto(
      'noDomiciliario',
      [{ id: 'artefacto-1', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }],
      2,
    )

    const resultado = calcularResultado(proyecto)

    const pasoQc = resultado.pasos.find((paso) => paso.id === 'qc')
    if (!pasoQc) {
      throw new Error('se esperaba un paso de id "qc" en la traza')
    }

    expect(pasoQc.criterioId).toBe('CRIT-A4')
    expect(pasoQc.entradas.some((entrada) => entrada.simbolo === 'K')).toBe(false)
    expect(pasoQc.nota).toContain('no aplica')
  })

  it('registra el paso Qc para n ≥ 2 con la referencia ERAS-2023 §2.9.2.3', () => {
    const proyecto = construirProyecto(
      'noDomiciliario',
      [{ id: 'artefacto-1', artefactoId: 'lavatorio', cantidad: 4, origen: 'normativo' }],
      2,
    )

    const resultado = calcularResultado(proyecto)

    const pasoQc = resultado.pasos.find((paso) => paso.id === 'qc')
    if (!pasoQc) {
      throw new Error('se esperaba un paso de id "qc" en la traza')
    }

    expect(pasoQc.formulaId).toBe('ERAS-2023 §2.9.2.3')
    expect(pasoQc.referencias).toContain('ERAS-2023 §2.9.2.3')
    expect(pasoQc.entradas.some((entrada) => entrada.simbolo === 'Qmax')).toBe(true)
    expect(pasoQc.entradas.some((entrada) => entrada.simbolo === 'K')).toBe(true)
  })
})

// Caso Golden G2 (Tabla N°2), documentado en CASOS-GOLDEN.md. Ningún valor
// de este test puede modificarse sin actualizar antes esa fuente.
describe('calcularSimultaneidad — Caso Golden G2 (CASOS-GOLDEN.md)', () => {
  it('reproduce n, Qmax, Kc, K y Qc del caso G2 (Tabla N°2)', () => {
    const proyecto = construirProyecto('domiciliario', [
      { id: 'artefacto-1', artefactoId: 'lavatorio', cantidad: 2, origen: 'normativo' },
      { id: 'artefacto-2', artefactoId: 'banera', cantidad: 1, origen: 'normativo' },
      { id: 'artefacto-3', artefactoId: 'inodoroDeposito', cantidad: 2, origen: 'normativo' },
      { id: 'artefacto-4', artefactoId: 'bidet', cantidad: 1, origen: 'normativo' },
      { id: 'artefacto-5', artefactoId: 'piletaDeCocina', cantidad: 1, origen: 'normativo' },
      { id: 'artefacto-6', artefactoId: 'piletaDeLavar', cantidad: 1, origen: 'normativo' },
      { id: 'artefacto-7', artefactoId: 'receptaculoDucha', cantidad: 1, origen: 'normativo' },
    ])

    const resultado = calcularResultado(proyecto)

    const pasoKc = resultado.pasos.find((paso) => paso.id === 'kc')
    const entradaN = pasoKc?.entradas.find((entrada) => entrada.simbolo === 'n')
    expect(entradaN?.valor).toBe(9)

    const { kc, k, qmax, qc } = resultado.resultados
    if (!('valor' in kc) || !('valor' in k) || !('valor' in qmax) || !('valor' in qc)) {
      throw new Error('se esperaban resultados numericos para Kc, K, Qmax y Qc')
    }

    expect(qmax.valor).toBeCloseTo(2.0, 4)
    expect(qmax.unidad).toBe('l/s')

    expect(kc.valor).toBeCloseTo(0.3535533906, 9)
    expect(kc.unidad).toBe('adimensional')

    expect(k.valor).toBeCloseTo(0.3535533906, 9)
    expect(k.unidad).toBe('adimensional')

    expect(qc.valor).toBeCloseTo(0.7071067812, 9)
    expect(qc.unidad).toBe('l/s')
  })
})

// Caso Golden G1 (Tabla N°4), documentado en CASOS-GOLDEN.md. El fixture
// representa únicamente el conjunto computado publicado (baño principal,
// baño de servicio, cocina), no una reconstrucción del conjunto instalado
// previo a CRIT-A8 (esa entrada no está documentada inequívocamente por la
// Guía). Este test valida n → Qmax → Kc → K → Qc contra Tabla N°4; ejercita
// la evaluación local de CRIT-A8 pero como no-op sobre los baños
// declarados (cada uno solo tiene el inodoro de válvula, nada que suprimir)
// y no constituye prueba end-to-end de la supresión de otros artefactos
// sanitarios.
describe('calcularSimultaneidad — Caso Golden G1 (CASOS-GOLDEN.md)', () => {
  it('reproduce n, Qmax, Kc, K y Qc del caso G1 (Tabla N°4)', () => {
    const proyecto: Proyecto = {
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
    }

    const resultado = calcularResultado(proyecto)

    const pasoKc = resultado.pasos.find((paso) => paso.id === 'kc')
    const entradaN = pasoKc?.entradas.find((entrada) => entrada.simbolo === 'n')
    expect(entradaN?.valor).toBe(4)

    const { kc, k, qmax, qc } = resultado.resultados
    if (!('valor' in kc) || !('valor' in k) || !('valor' in qmax) || !('valor' in qc)) {
      throw new Error('se esperaban resultados numericos para Kc, K, Qmax y Qc')
    }

    expect(qmax.valor).toBeCloseTo(3.4, 4)
    expect(qmax.unidad).toBe('l/s')

    expect(kc.valor).toBeCloseTo(0.5773502692, 9)
    expect(kc.unidad).toBe('adimensional')

    expect(k.valor).toBeCloseTo(0.5773502692, 9)
    expect(k.unidad).toBe('adimensional')

    expect(qc.valor).toBeCloseTo(1.9629909153, 9)
    expect(qc.unidad).toBe('l/s')
  })
})
