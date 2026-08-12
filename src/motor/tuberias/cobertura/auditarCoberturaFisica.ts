// Auditoria pura de cobertura Proyecto <-> redHidraulica (S1): responde
// unicamente si todo Artefacto normativo de M1 tiene al menos una
// referencia fisica en redHidraulica. No decide si la conexion AF/AC es
// correcta, no genera topologia, no modifica Proyecto, no toca UI ni
// validarRedHidraulica -- ver PENDIENTES-DE-ARQUITECTURA.md para la
// decision arquitectonica de que M1 es autoritativo sobre que artefactos
// existen y redHidraulica sobre como estan conectados.
import type { Proyecto } from '../../../modelo/proyecto'
import type { ReferenciaDeArtefacto } from '../../../modelo/redHidraulica'

export interface AuditoriaDeCoberturaFisica {
  readonly completa: boolean
  readonly artefactosSinReferencia: readonly ReferenciaDeArtefacto[]
}

function claveDeReferencia(unidadFuncionalId: string, localId: string, artefactoId: string): string {
  return JSON.stringify([unidadFuncionalId, localId, artefactoId])
}

export function auditarCoberturaFisica(proyecto: Proyecto): AuditoriaDeCoberturaFisica {
  const { redHidraulica } = proyecto

  const clavesReferenciadas = new Set<string>()
  if (redHidraulica !== undefined) {
    for (const nodo of redHidraulica.nodos) {
      if (nodo.referencia?.tipo === 'artefacto') {
        const { unidadFuncionalId, localId, artefactoId } = nodo.referencia
        clavesReferenciadas.add(claveDeReferencia(unidadFuncionalId, localId, artefactoId))
      }
    }
  }

  const artefactosSinReferencia: ReferenciaDeArtefacto[] = []
  for (const unidadFuncional of proyecto.unidadesFuncionales) {
    for (const local of unidadFuncional.locales) {
      for (const artefacto of local.artefactos) {
        if (artefacto.origen !== 'normativo') {
          continue
        }
        const clave = claveDeReferencia(unidadFuncional.id, local.id, artefacto.id)
        if (!clavesReferenciadas.has(clave)) {
          artefactosSinReferencia.push({
            tipo: 'artefacto',
            unidadFuncionalId: unidadFuncional.id,
            localId: local.id,
            artefactoId: artefacto.id,
          })
        }
      }
    }
  }

  return { completa: artefactosSinReferencia.length === 0, artefactosSinReferencia }
}
