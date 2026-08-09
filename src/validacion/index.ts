// Punto de entrada único de la capa de validación semántica.
// La validación estructural/migración sigue en la capa de modelo.

import type { Proyecto } from '../modelo/proyecto';
import type { ArtefactoNormativo } from '../normativa/eras-2023/catalogo-artefactos';
import type { CoeficienteMayoracion } from '../normativa/eras-2023/coeficientes-mayoracion';
import type { ResultadoValidacion } from './codigos';
import { validarInvariantesDeProyecto } from './proyecto';
import { validarReferenciasDeCatalogo } from './catalogo';
import { validarRedHidraulica } from './redHidraulica';

export function validarProyecto(
  proyecto: Proyecto,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  coeficientesMayoracion: readonly CoeficienteMayoracion[],
): ResultadoValidacion {
  const problemas = [
    ...validarInvariantesDeProyecto(proyecto),
    ...validarReferenciasDeCatalogo(proyecto, catalogoArtefactos, coeficientesMayoracion),
    ...validarRedHidraulica(proyecto),
  ];

  return {
    valido: !problemas.some((problema) => problema.severidad === 'error'),
    problemas,
  };
}

export type { ProblemaValidacion, ResultadoValidacion, CodigoValidacion, Severidad } from './codigos';
