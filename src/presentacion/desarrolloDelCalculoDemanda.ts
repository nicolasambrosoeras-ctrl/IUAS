// Presentación del Desarrollo del cálculo del Módulo 1 (Demanda): fórmula
// simbólica, sustitución numérica y texto de resultado determinado/
// indeterminado, compartidos entre la interfaz y el PDF (Incremento B).
// Específico de Demanda a propósito -- no es una capa genérica de
// "presentadores" para módulos futuros; eso se decide con un segundo
// módulo real, no antes.
import type { Paso, ValorCalculado } from '../modelo/resultado'
import { formatearNumero } from '../exportadores/pdf/formatearNumero'

const FORMULAS_SIMBOLICAS: Readonly<Record<string, string>> = {
  kc: 'Kc = 1 / raíz(n - 1)',
  qmax: 'Qmax = Σ (cantidad × qu)',
  k: 'K = Kc × a',
  qc: 'Qc = Qmax × K',
  'qc-critA4': 'Qc = Qmax',
}

export function formulaSimbolica(paso: Paso): string {
  if (paso.id === 'qc' && paso.criterioId === 'CRIT-A4') {
    return FORMULAS_SIMBOLICAS['qc-critA4'] ?? paso.formulaId
  }
  return FORMULAS_SIMBOLICAS[paso.id] ?? paso.formulaId
}

// Sustitución numérica: interpola paso.entradas sobre la plantilla simbólica
// sin recalcular nada -- el resultado final que se agrega al cierre es
// paso.salida.resultado, ya calculado por el motor. qmax queda sin plantilla
// a propósito (PENDIENTES-DE-ARQUITECTURA.md: la traza no expone `cantidad`,
// por lo que su sustitución no puede reconstruirse fielmente todavía).
export function sustitucionNumerica(paso: Paso): string | null {
  const entrada = (simbolo: string) => paso.entradas.find((e) => e.simbolo === simbolo)
  const valorDe = (simbolo: string) => {
    const encontrada = entrada(simbolo)
    return encontrada ? formatearNumero(encontrada.valor, encontrada.unidad) : null
  }
  const resultado = 'estado' in paso.salida.resultado
    ? null
    : formatearNumero(paso.salida.resultado.valor, paso.salida.resultado.unidad)
  const conResultado = (base: string) => (resultado !== null ? `${base} = ${resultado}` : base)

  if (paso.id === 'kc') {
    const n = valorDe('n')
    return n === null ? null : conResultado(`Kc = 1 / raíz(${n} - 1)`)
  }
  if (paso.id === 'k') {
    const kc = valorDe('Kc')
    const a = valorDe('a')
    return kc === null || a === null ? null : conResultado(`K = ${kc} × ${a}`)
  }
  if (paso.id === 'qc' && paso.criterioId === 'CRIT-A4') {
    const qu = valorDe('qu')
    return qu === null ? null : `Qc = qu = ${qu}`
  }
  if (paso.id === 'qc') {
    const qmax = valorDe('Qmax')
    const k = valorDe('K')
    return qmax === null || k === null ? null : conResultado(`Qc = ${qmax} × ${k}`)
  }
  return null
}

export function textoValorCalculado(valor: ValorCalculado): string {
  if ('estado' in valor) {
    return `Indeterminado — ${valor.motivo}`
  }
  const numero = formatearNumero(valor.valor, valor.unidad)
  return valor.unidad === 'adimensional' ? numero : `${numero} ${valor.unidad}`
}
