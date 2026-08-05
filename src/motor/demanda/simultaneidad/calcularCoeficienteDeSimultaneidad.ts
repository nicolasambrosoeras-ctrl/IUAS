// Nucleo aritmetico de Kc (ERAS-2023 Sec.2.9.2.2). Recibe n ya contado;
// no conoce artefactos ni catalogo. La primitiva completa que exige
// ADR-007 -- calcularSimultaneidad(artefactos[], contexto) -- se
// construye sobre esta pieza en la Fase 1, cuando exista el catalogo.
import type { Paso, ValorCalculado } from '../../../modelo/resultado'

export interface ResultadoDeKc {
  readonly resultado: ValorCalculado
  readonly paso: Paso
}

export function calcularCoeficienteDeSimultaneidad(n: number): ResultadoDeKc {
  if (!Number.isInteger(n) || n < 1) {
    // n cuenta artefactos computables: no puede ser fraccionario ni
    // negativo. Si esto ocurre, la validacion previa al motor no hizo
    // su trabajo (Convenciones Sec.8): es un defecto de programacion,
    // no un estado previsible del dominio, a diferencia de n=1.
    throw new Error(`n debe ser un entero mayor o igual a 1; se recibio ${n}`)
  }

  const entradaN = {
    simbolo: 'n',
    valor: n,
    unidad: 'adimensional',
    procedencia: 'conteo de artefactos computables',
  }

  // D25: n=1 hace 1/raiz(0), division por cero. Estado indeterminado
  // explicito, nunca NaN. Se calcula una sola vez y se referencia tanto
  // en el retorno directo como dentro del paso, para que no puedan
  // divergir por construccion.
  const resultado: ValorCalculado =
    n === 1
      ? {
          estado: 'indeterminado',
          motivo:
            'Kc no esta definido para n = 1: la formula 1/raiz(n-1) implica ' +
            'division por cero. Se requieren al menos 2 artefactos computables.',
        }
      : { valor: 1 / Math.sqrt(n - 1), unidad: 'adimensional' }

  return {
    resultado,
    paso: {
      id: 'kc',
      titulo: 'Calculo del coeficiente de simultaneidad',
      formulaId: 'ERAS-2023 Sec.2.9.2.2',
      entradas: [entradaN],
      salida: { simbolo: 'Kc', resultado },
      referencias: ['ERAS-2023 Sec.2.9.2.2'],
    },
  }
}
