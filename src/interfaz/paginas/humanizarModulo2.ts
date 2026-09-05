// Helpers de humanización de Módulo 2 (D-δ.43): la UI normal no debe
// mostrar ids técnicos de Nodo/Tramo (grafo interno) -- solo nombres de
// catálogo, tipos de Local y redes. Puramente de presentación: no decide
// nada hidráulico ni reinterpreta ninguna referencia, solo formatea lo que
// resolverArtefactosReferenciados/obtenerArtefactosAguasAbajo ya resuelven.
import type { Proyecto } from '../../modelo/proyecto'
import type { RedDeTramo, ReferenciaDeArtefacto } from '../../modelo/redHidraulica'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import { obtenerArtefactosAguasAbajo } from '../../motor/tuberias/topologia/obtenerArtefactosAguasAbajo'
import { resolverArtefactosReferenciados } from '../../motor/tuberias/topologia/resolverArtefactosReferenciados'

export const ETIQUETA_RED: Readonly<Record<RedDeTramo, string>> = {
  AF: 'Agua fría',
  AC: 'Agua caliente',
}

// Nombre de catálogo de un Artefacto referenciado (nunca artefactoId
// técnico) -- mismo fallback explícito que describirReferenciaPendiente
// (ResultadoHidraulicoDeTramo.tsx): si la referencia no resuelve o el
// catálogo no tiene el id, se usa el id técnico tal cual (nunca se
// inventa un nombre), pero eso solo puede pasar por datos externos
// inconsistentes, nunca por el flujo normal de la UI.
export function nombreDeArtefacto(
  proyecto: Proyecto,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  referencia: ReferenciaDeArtefacto,
): string {
  const [resuelto] = resolverArtefactosReferenciados(proyecto, [referencia])
  if (resuelto === undefined) {
    return referencia.artefactoId
  }
  const artefactoNormativo = catalogoArtefactos.find((candidato) => candidato.id === resuelto.artefacto.artefactoId)
  return artefactoNormativo?.nombre ?? resuelto.artefacto.artefactoId
}

// Nombres de todos los Artefactos aguas abajo de un Tramo, unidos por
// coma -- usado para etiquetar ramales y salidas de tee sin exponer
// ningún id de Tramo/Nodo. Un Tramo terminal (1 solo Artefacto aguas
// abajo) devuelve un único nombre; un Tramo que todavía alimenta varias
// bifurcaciones devuelve la lista completa (p.ej. "Lavatorio, Ducha").
export function nombresDeArtefactosAguasAbajo(
  proyecto: Proyecto,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  tramoId: string,
): string {
  const referencias = obtenerArtefactosAguasAbajo(proyecto, tramoId)
  return referencias.map((referencia) => nombreDeArtefacto(proyecto, catalogoArtefactos, referencia)).join(', ')
}
