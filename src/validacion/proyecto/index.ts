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

  // Chequeo global (no por UF/local, para no duplicar el problema): si el
  // proyecto entero no tiene ningún artefacto computable, el motor recibe
  // n=0 y lanza una excepción no capturada (defecto de programación, no un
  // estado del dominio -- ver calcularCoeficienteDeSimultaneidad). Se
  // bloquea acá, antes de llegar al motor.
  const totalArtefactosComputables = proyecto.unidadesFuncionales
    .flatMap((uf) => uf.locales)
    .flatMap((local) => local.artefactos)
    .filter((artefacto) => artefacto.origen === 'normativo').length;

  if (totalArtefactosComputables === 0) {
    problemas.push(
      crearProblema('proyectoSinArtefactosComputables', 'unidadesFuncionales', totalArtefactosComputables),
    );
  }

  return problemas;
}
