// Validación semántica de configuracionMedidores (D-δ.55): lo único que
// TypeScript no garantiza sobre datos persistidos es que las claves del
// override `tipoProvisionACSPorUnidadFuncional` correspondan a unidades
// funcionales reales del Proyecto. Un override que apunta a una UF
// inexistente es una inconsistencia estructural (identificador colgado),
// no un dato faltante -- se reporta como error, igual que
// redHidraulicaReferenciaArtefactoInvalida.
//
// Ausencia de `configuracionMedidores` NO es un problema de validación:
// es el estado 'noIniciado' de Módulo 3, legítimo (ver
// resolverEstadoModulo3).
import type { Proyecto } from '../../modelo/proyecto';
import { crearProblema, type ProblemaValidacion } from '../codigos';

export function validarConfiguracionMedidores(proyecto: Proyecto): readonly ProblemaValidacion[] {
  const { configuracionMedidores } = proyecto;
  if (configuracionMedidores === undefined) {
    return [];
  }

  const override = configuracionMedidores.tipoProvisionACSPorUnidadFuncional;
  if (override === undefined) {
    return [];
  }

  const idsDeUnidadesFuncionales = new Set(proyecto.unidadesFuncionales.map((unidad) => unidad.id));

  return Object.keys(override)
    .filter((unidadFuncionalId) => !idsDeUnidadesFuncionales.has(unidadFuncionalId))
    .map((unidadFuncionalId) =>
      crearProblema(
        'configuracionMedidoresUnidadFuncionalInexistente',
        'configuracionMedidores.tipoProvisionACSPorUnidadFuncional',
        unidadFuncionalId,
      ),
    );
}
