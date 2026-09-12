// Validación semántica de referencias al catálogo normativo.
// Recibe el catálogo por parámetro y no importa directamente un paquete normativo.

import type { Proyecto } from '../../modelo/proyecto';
import { localesDeUnidadFuncional } from '../../motor/tuberias/geometria/resolverCotaHidraulicaDeArtefacto';
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos';
import type { TipoProyectoNormativo } from '../../normativa/eras-2023/coeficientes-mayoracion';
import { crearProblema, type ProblemaValidacion } from '../codigos';

export function validarReferenciasDeCatalogo(
  proyecto: Proyecto,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  coeficientesMayoracion: readonly TipoProyectoNormativo[],
): readonly ProblemaValidacion[] {
  const problemas: ProblemaValidacion[] = [];

  const idsDeCatalogo = new Set(catalogoArtefactos.map((artefacto) => artefacto.id));
  const idsDeTipoDeProyecto = new Set(coeficientesMayoracion.map((entrada) => entrada.id));

  if (!idsDeTipoDeProyecto.has(proyecto.parametros.tipoDeProyecto)) {
    problemas.push(
      crearProblema(
        'catalogoTipoDeProyectoInexistente',
        'parametros.tipoDeProyecto',
        proyecto.parametros.tipoDeProyecto,
        [...idsDeTipoDeProyecto],
      ),
    );
  }

  proyecto.unidadesFuncionales.forEach((uf, indiceUf) => {
    localesDeUnidadFuncional(uf).forEach((local, indiceLocal) => {
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
