// Punto de entrada único de la capa de validación semántica.
// La validación estructural/migración sigue en la capa de modelo.

import type { Proyecto } from '../modelo/proyecto';
import type { ArtefactoNormativo } from '../normativa/eras-2023/catalogo-artefactos';
import type { TipoProyectoNormativo } from '../normativa/eras-2023/coeficientes-mayoracion';
import type { SistemaDeTuberiaCatalogado } from '../motor/tuberias/sistemaDeTuberia';
import type { ResultadoValidacion } from './codigos';
import { validarInvariantesDeProyecto } from './proyecto';
import { validarReferenciasDeCatalogo } from './catalogo';
import { validarRedHidraulica } from './redHidraulica';
import { validarConfiguracionHidraulica } from './configuracionHidraulica';
import { validarConfiguracionMedidores } from './configuracionMedidores';

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
  ];

  return {
    valido: !problemas.some((problema) => problema.severidad === 'error'),
    problemas,
  };
}

export type { ProblemaValidacion, ResultadoValidacion, CodigoValidacion, Severidad } from './codigos';
