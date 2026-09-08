// Punto de entrada único de la capa de validación semántica.
// La validación estructural/migración sigue en la capa de modelo.

import type { Proyecto } from '../modelo/proyecto';
import type { ArtefactoNormativo } from '../normativa/eras-2023/catalogo-artefactos';
import type { TipoProyectoNormativo } from '../normativa/eras-2023/coeficientes-mayoracion';
import type { SistemaDeTuberiaCatalogado } from '../motor/tuberias/sistemaDeTuberia';
import type { ProblemaValidacion, ResultadoValidacion } from './codigos';
import { validarInvariantesDeProyecto } from './proyecto';
import { validarReferenciasDeCatalogo } from './catalogo';
import { validarRedHidraulica } from './redHidraulica';
import { validarConfiguracionHidraulica } from './configuracionHidraulica';
import { validarConfiguracionMedidores } from './configuracionMedidores';
import { validarConfiguracionAbastecimiento } from './configuracionAbastecimiento';
import { validarParametrosDeConexion } from './parametrosConexion';

export function validarProyecto(
  proyecto: Proyecto,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  coeficientesMayoracion: readonly TipoProyectoNormativo[],
  catalogoSistemasDeTuberia: readonly SistemaDeTuberiaCatalogado[],
): ResultadoValidacion {
  const problemas = [
    ...validarInvariantesDeProyecto(proyecto),
    ...validarReferenciasDeCatalogo(proyecto, catalogoArtefactos, coeficientesMayoracion),
    ...validarRedHidraulica(proyecto),
    ...validarConfiguracionHidraulica(proyecto, catalogoSistemasDeTuberia),
    ...validarConfiguracionMedidores(proyecto),
    ...validarConfiguracionAbastecimiento(proyecto),
    ...validarParametrosDeConexion(proyecto),
  ];

  return {
    valido: !problemas.some((problema) => problema.severidad === 'error'),
    problemas,
  };
}

export type { ProblemaValidacion, ResultadoValidacion, CodigoValidacion, Severidad, AlcanceValidacion } from './codigos';
export { alcanceDeCodigo } from './codigos';

// Errores (severidad 'error') que realmente impiden calcular la Demanda
// (M1). Un Proyecto puede tener errores de otros módulos y aun así M1
// calcula Qc con normalidad (UI-CRIT-10). No incluye advertencias.
export function erroresQueBloqueanLaDemanda(
  resultado: ResultadoValidacion,
): readonly ProblemaValidacion[] {
  return resultado.problemas.filter(
    (problema) => problema.severidad === 'error' && problema.alcance === 'demanda',
  );
}

// Errores de módulos posteriores a Demanda (Tuberías / Medidores /
// Abastecimiento): no bloquean M1, se muestran en su sección.
export function erroresDeModulosPosteriores(
  resultado: ResultadoValidacion,
): readonly ProblemaValidacion[] {
  return resultado.problemas.filter(
    (problema) => problema.severidad === 'error' && problema.alcance !== 'demanda',
  );
}
