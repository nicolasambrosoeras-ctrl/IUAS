// Validación semántica de invariantes del proyecto.
// No consulta catálogo normativo ni emite texto visible.

import type { Proyecto } from '../../modelo/proyecto';
import { crearProblema, type ProblemaValidacion } from '../codigos';

export function validarInvariantesDeProyecto(
  proyecto: Proyecto,
): readonly ProblemaValidacion[] {
  const problemas: ProblemaValidacion[] = [];

  proyecto.unidadesFuncionales.forEach((uf, indiceUf) => {
    if (uf.locales.length === 0) {
      problemas.push(
        crearProblema('proyectoUnidadFuncionalSinLocales', `unidadesFuncionales[${indiceUf}]`, uf.locales.length),
      );
    }

    uf.locales.forEach((local, indiceLocal) => {
      const campoLocal = `unidadesFuncionales[${indiceUf}].locales[${indiceLocal}]`;

      if (local.regimen === undefined) {
        problemas.push(crearProblema('proyectoRegimenLocalAusente', `${campoLocal}.regimen`, undefined));
      }

      if (local.artefactos.length === 0) {
        problemas.push(
          crearProblema('proyectoLocalSinArtefactos', `${campoLocal}.artefactos`, local.artefactos.length),
        );
      }

      local.artefactos.forEach((artefacto, indiceArtefacto) => {
        if (artefacto.cantidad <= 0) {
          problemas.push(
            crearProblema(
              'proyectoCantidadNoPositiva',
              `${campoLocal}.artefactos[${indiceArtefacto}].cantidad`,
              artefacto.cantidad,
              'cantidad > 0',
            ),
          );
        }
      });
    });
  });

  return problemas;
}
