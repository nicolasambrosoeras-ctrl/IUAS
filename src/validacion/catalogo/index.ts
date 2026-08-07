// Validación semántica de referencias al catálogo normativo.
// Recibe el catálogo por parámetro y no importa directamente un paquete normativo.

import type { Proyecto } from '../../modelo/proyecto';
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos';
import type { CoeficienteMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion';
import { crearProblema, type ProblemaValidacion } from '../codigos';

export function validarReferenciasDeCatalogo(
  proyecto: Proyecto,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  coeficientesMayoracion: readonly CoeficienteMayoracion[],
): readonly ProblemaValidacion[] {
  const problemas: ProblemaValidacion[] = [];

  const idsDeCatalogo = new Set(catalogoArtefactos.map((artefacto) => artefacto.id));
  const valoresDeA = new Set(coeficientesMayoracion.map((coeficiente) => coeficiente.a));

  if (!valoresDeA.has(proyecto.parametros.coeficienteA)) {
    problemas.push(
      crearProblema(
        'catalogoCoeficienteAInexistente',
        'parametros.coeficienteA',
        proyecto.parametros.coeficienteA,
        [...valoresDeA],
      ),
    );
  }

  proyecto.unidadesFuncionales.forEach((uf, indiceUf) => {
    uf.locales.forEach((local, indiceLocal) => {
      local.artefactos.forEach((artefacto, indiceArtefacto) => {
        if (!idsDeCatalogo.has(artefacto.artefactoId)) {
          problemas.push(
            crearProblema(
              'catalogoArtefactoIdInexistente',
              `unidadesFuncionales[${indiceUf}].locales[${indiceLocal}].artefactos[${indiceArtefacto}].artefactoId`,
              artefacto.artefactoId,
            ),
          );
        }
      });
    });
  });

  return problemas;
}
