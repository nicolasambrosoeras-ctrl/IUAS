// Filtro puro de computabilidad: conserva solo los ArtefactoResuelto cuyo
// Artefacto tiene origen normativo. No aplica CRIT-A8 ni ninguna otra regla
// de simultaneidad/participacion (ver PENDIENTES-DE-ARQUITECTURA.md); esa
// etapa sigue fusionada en calcularSimultaneidad y no se toca aqui.
import type { ArtefactoResuelto } from '../topologia/resolverArtefactosReferenciados'

export function filtrarArtefactosComputables(
  artefactos: readonly ArtefactoResuelto[],
): readonly ArtefactoResuelto[] {
  return artefactos.filter((resuelto) => resuelto.artefacto.origen === 'normativo')
}
