// Determinacion de aEfectivo por Tramo (CRIT-A14 / cierre de D-beta.2).
// Depende exclusivamente de la tipologia del Proyecto y de las UF distintas
// presentes en el conjunto ya resuelto/computable/posterior a CRIT-A8 (los
// AporteDeDemanda recibidos) -- no consulta Proyecto.unidadesFuncionales,
// Locales ni cantidad. No decide nada sobre Kc, K, Qc ni sobre n=1
// (CRIT-A4): esa es responsabilidad de una etapa posterior, todavia no
// implementada.
import type { TipoDeProyecto } from '../../../modelo/proyecto'
import type { AporteDeDemanda } from '../aporte/resolverAportesDeDemanda'
import { obtenerCoeficienteABase } from '../../../normativa/eras-2023/coeficientes-mayoracion'

export function determinarAEfectivo(
  tipoDeProyecto: TipoDeProyecto,
  aportes: readonly AporteDeDemanda[],
): 1 | 2 | 3 | 4 {
  if (tipoDeProyecto !== 'viviendaMultifamiliar') {
    return obtenerCoeficienteABase(tipoDeProyecto)
  }

  const ufsDistintas = new Set(aportes.map((aporte) => aporte.artefactoResuelto.referencia.unidadFuncionalId))

  // Conjunto vacio: no equivale a "1 UF" ni a "vivienda individual". CRIT-A14
  // solo define la regla sobre 1 UF o mas de 1 UF; convertir 0 UF en 1
  // silenciosamente afirmaria una UF que no esta presente en la evidencia.
  if (ufsDistintas.size === 0) {
    throw new Error(
      'determinarAEfectivo: no puede determinarse aEfectivo para vivienda multifamiliar sin ninguna ' +
        'UnidadFuncional presente en el conjunto de aportes evaluado',
    )
  }

  return ufsDistintas.size === 1 ? 1 : 2
}
