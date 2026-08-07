import { calcularCoeficienteDeSimultaneidad } from './calcularCoeficienteDeSimultaneidad'
import type { Paso, ResultadoDeCalculo, ValorCalculado } from '../../../modelo/resultado'
import type { Proyecto } from '../../../modelo/proyecto'
import type { ArtefactoNormativo } from '../../../normativa/eras-2023/catalogo-artefactos'
import type { CoeficienteMayoracion } from '../../../normativa/eras-2023/coeficientes-mayoracion'

export interface EntradaCalculoSimultaneidad {
  readonly proyecto: Proyecto
  readonly normativa: {
    readonly catalogoArtefactos: readonly ArtefactoNormativo[]
    readonly coeficientesMayoracion: readonly CoeficienteMayoracion[]
  }
}

export function calcularSimultaneidad(
  entrada: EntradaCalculoSimultaneidad,
): ResultadoDeCalculo {
  const buscarArtefactoNormativo = (artefactoId: string) =>
    entrada.normativa.catalogoArtefactos.find(
      (catalogoArtefacto) => catalogoArtefacto.id === artefactoId,
    )

  // CRIT-A8 (ERAS-2023 art. 2.10.1): en recintos domiciliarios con limpieza
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

  const a = entrada.proyecto.parametros.coeficienteA
  const coeficienteMayoracion = entrada.normativa.coeficientesMayoracion.find(
    (candidato) => candidato.a === a,
  )

  // D25: si Kc es indeterminado (n=1), K hereda el mismo estado y motivo
  // sin interpretación adicional; no resuelve A3, solo evita propagar NaN.
  const k: ValorCalculado = 'estado' in kc ? kc : { valor: kc.valor * a, unidad: 'adimensional' }

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
        procedencia: coeficienteMayoracion
          ? `catálogo de coeficientes de mayoración: ${coeficienteMayoracion.tipoDeProyecto}`
          : 'parámetros del proyecto: coeficienteA',
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
    formulaId: 'ERAS-2023 §2.10.1',
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
    referencias: ['ERAS-2023 §2.10.1'],
    nota:
      'Qmax = Σ(cantidad × quTotal_lps) sobre los artefactos participantes tras CRIT-A8; ' +
      'quTotal_lps tomado del catálogo normativo.',
  }

  return {
    resultados: {
      kc,
      k,
      qmax: salidaQmax,
    },
    pasos: [pasoKc, pasoK, pasoQmax],
    verificaciones: [],
    advertencias: [],
    referencias: ['ERAS-2023 §2.9.2.2', 'ERAS-2023 §2.10.1'],
    metadatos: {
      versionApp: '0.1.0',
      versionNormativa: entrada.proyecto.metadatos.versionNormativa,
      moduloId: 'demanda',
    },
  }
}
