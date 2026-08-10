import { calcularCoeficienteDeSimultaneidad } from './calcularCoeficienteDeSimultaneidad'
import type { Advertencia, Paso, ResultadoDeCalculo, ValorCalculado } from '../../../modelo/resultado'
import type { Proyecto } from '../../../modelo/proyecto'
import type { ArtefactoNormativo } from '../../../normativa/eras-2023/catalogo-artefactos'
import type { TipoProyectoNormativo } from '../../../normativa/eras-2023/coeficientes-mayoracion'

export interface EntradaCalculoSimultaneidad {
  readonly proyecto: Proyecto
  readonly normativa: {
    readonly catalogoArtefactos: readonly ArtefactoNormativo[]
    readonly coeficientesMayoracion: readonly TipoProyectoNormativo[]
  }
}

export function calcularSimultaneidad(
  entrada: EntradaCalculoSimultaneidad,
): ResultadoDeCalculo {
  const buscarArtefactoNormativo = (artefactoId: string) =>
    entrada.normativa.catalogoArtefactos.find(
      (catalogoArtefacto) => catalogoArtefacto.id === artefactoId,
    )

  // CRIT-A8 (ERAS-2023 §2.10.2): en recintos domiciliarios con limpieza
  // de inodoro por válvula automática, solo ese artefacto participa; en
  // cualquier otro caso (incluye noDomiciliario) participan todos.
  const artefactosParticipantes = entrada.proyecto.unidadesFuncionales
    .flatMap((unidad) => unidad.locales)
    .flatMap((local) => {
      const artefactosConValvulaAutomatica = local.artefactos.filter((artefacto) => {
        const artefactoNormativo = buscarArtefactoNormativo(artefacto.artefactoId)
        return artefactoNormativo?.limpiezaConValvulaAutomatica === true
      })

      const aplicaCritA8 =
        local.regimen === 'domiciliario' && artefactosConValvulaAutomatica.length > 0

      return aplicaCritA8 ? artefactosConValvulaAutomatica : local.artefactos
    })
    .filter((artefacto) => artefacto.origen === 'normativo')

  const n = artefactosParticipantes.reduce((total, artefacto) => total + artefacto.cantidad, 0)

  const { resultado: kc, paso: pasoKc } = calcularCoeficienteDeSimultaneidad(n)

  const tipoDeProyecto = entrada.proyecto.parametros.tipoDeProyecto
  const coeficienteMayoracion = entrada.normativa.coeficientesMayoracion.find(
    (candidato) => candidato.id === tipoDeProyecto,
  )

  // Precondicion imposible si tipoDeProyecto proviene de TipoDeProyecto real
  // y la tabla recibida esta completa (mismo criterio que otras
  // "precondicion imposible" del proyecto): error explicito, no un `a`
  // por defecto silencioso.
  if (coeficienteMayoracion === undefined) {
    throw new Error(
      `calcularSimultaneidad: no existe ninguna entrada normativa de coeficiente de mayoración para la tipología "${tipoDeProyecto}"`,
    )
  }

  const a = coeficienteMayoracion.a

  // D25: si Kc es indeterminado (n=1), K hereda el mismo estado y motivo
  // sin interpretación adicional; no resuelve A3, solo evita propagar NaN.
  const k: ValorCalculado = 'estado' in kc ? kc : { valor: kc.valor * a, unidad: 'adimensional' }

  // CRIT-A2: K = Kc × a se conserva sin tope. Si K > 1, se registra una
  // advertencia trazable; el valor calculado no se modifica.
  const advertencias: Advertencia[] = []
  if (!('estado' in k) && k.valor > 1) {
    advertencias.push({
      id: 'k-mayor-a-uno',
      mensaje:
        'K = Kc × a resultó mayor a 1 (CRIT-A2): el valor se conserva sin tope, ' +
        'por lo que Qc puede resultar mayor que Qmax.',
      referenciaNormativa: 'ERAS-2023 §2.9.2.2 (CRIT-A2)',
    })
  }

  const pasoK: Paso = {
    id: 'k',
    titulo: 'Cálculo del coeficiente K',
    formulaId: 'ERAS-2023 §2.9.2.2',
    entradas: [
      ...('estado' in kc
        ? []
        : [
            {
              simbolo: 'Kc',
              valor: kc.valor,
              unidad: 'adimensional',
              procedencia: 'paso Kc',
            },
          ]),
      {
        simbolo: 'a',
        valor: a,
        unidad: 'adimensional',
        procedencia: `catálogo de coeficientes de mayoración: ${coeficienteMayoracion.nombre}`,
      },
    ],
    salida: { simbolo: 'K', resultado: k },
    referencias: ['ERAS-2023 §2.9.2.2'],
    ...('estado' in kc
      ? { nota: 'K hereda el estado indeterminado de Kc (D25); A3 queda pendiente.' }
      : {}),
  }

  // Módulo 1: Qmax = Σ(cantidad × quTotal_lps) sobre los mismos artefactos
  // participantes que Kc (decisión ya cerrada; quFria/quCaliente quedan
  // para etapas posteriores, sin selector genérico de columna).
  const qmax = artefactosParticipantes.reduce((total, artefacto) => {
    const artefactoNormativo = buscarArtefactoNormativo(artefacto.artefactoId)
    return total + (artefactoNormativo?.quTotal_lps ?? 0) * artefacto.cantidad
  }, 0)

  const salidaQmax: ValorCalculado = { valor: qmax, unidad: 'l/s' }

  const pasoQmax: Paso = {
    id: 'qmax',
    titulo: 'Cálculo del caudal máximo probable',
    formulaId: 'ERAS-2023 §2.9.2.1',
    entradas: artefactosParticipantes.map((artefacto) => {
      const artefactoNormativo = buscarArtefactoNormativo(artefacto.artefactoId)

      return {
        simbolo: `qu(${artefacto.artefactoId})`,
        valor: artefactoNormativo?.quTotal_lps ?? 0,
        unidad: 'l/s',
        procedencia: 'catálogo de artefactos: quTotal_lps',
      }
    }),
    salida: {
      simbolo: 'Qmax',
      resultado: salidaQmax,
    },
    referencias: ['ERAS-2023 §2.9.2.1'],
    nota:
      'Qmax = Σ(cantidad × quTotal_lps) sobre los artefactos participantes tras CRIT-A8; ' +
      'quTotal_lps tomado del catálogo normativo.',
  }

  // CRIT-A4 (ERAS-2023 §2.9.2.2 y §2.9.2.3): con n=1 el modelo de
  // simultaneidad no aplica; Qc = Qmax = qu, sin multiplicar por K ni a.
  const aplicaModeloDeSimultaneidad = n >= 2

  const qc: ValorCalculado = !aplicaModeloDeSimultaneidad
    ? salidaQmax
    : 'estado' in k
      ? k
      : { valor: qmax * k.valor, unidad: 'l/s' }

  const pasoQc: Paso = {
    id: 'qc',
    titulo: 'Cálculo del caudal de cálculo Qc',
    formulaId: 'ERAS-2023 §2.9.2.3',
    entradas: aplicaModeloDeSimultaneidad
      ? [
          { simbolo: 'Qmax', valor: qmax, unidad: 'l/s', procedencia: 'paso Qmax' },
          ...('estado' in k
            ? []
            : [{ simbolo: 'K', valor: k.valor, unidad: 'adimensional', procedencia: 'paso K' }]),
        ]
      : [{ simbolo: 'qu', valor: qmax, unidad: 'l/s', procedencia: 'paso Qmax' }],
    salida: { simbolo: 'Qc', resultado: qc },
    referencias: ['ERAS-2023 §2.9.2.3'],
    ...(aplicaModeloDeSimultaneidad
      ? {}
      : {
          criterioId: 'CRIT-A4',
          nota:
            'n=1: el modelo de simultaneidad no aplica (CRIT-A4); Qc = Qmax = qu del único ' +
            'artefacto participante. No se aplica el coeficiente de mayoración a.',
        }),
  }

  return {
    resultados: {
      kc,
      k,
      qmax: salidaQmax,
      qc,
    },
    pasos: [pasoKc, pasoK, pasoQmax, pasoQc],
    verificaciones: [],
    advertencias,
    referencias: ['ERAS-2023 §2.9.2.2', 'ERAS-2023 §2.9.2.1', 'ERAS-2023 §2.9.2.3'],
    metadatos: {
      versionApp: '0.1.0',
      versionNormativa: entrada.proyecto.metadatos.versionNormativa,
      moduloId: 'demanda',
    },
  }
}
