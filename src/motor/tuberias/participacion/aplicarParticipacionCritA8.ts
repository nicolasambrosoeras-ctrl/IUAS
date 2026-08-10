// Participacion contextual (CRIT-A8) sobre un conjunto ya computable de
// tuberias. Segundo consumidor funcional de la logica de CRIT-A8 (el
// primero es calcularSimultaneidad.ts, Modulo 1); duplicacion aceptada a
// proposito (ver PENDIENTES-DE-ARQUITECTURA.md D-delta.18): todavia no se
// extrae infraestructura compartida con dos consumidores recien
// estabilizandose.
//
// CRIT-A13 / D-delta.16 (cerrado): CRIT-A8 se evalua exclusivamente sobre
// los ArtefactoResuelto recibidos, agrupados por identidad funcional de
// Local (unidadFuncionalId + localId, via referencia -- localId solo no es
// globalmente unico). Nunca se consulta resuelto.local.artefactos para
// incorporar artefactos que no esten en el conjunto recibido.
import type { ArtefactoNormativo } from '../../../normativa/eras-2023/catalogo-artefactos'
import type { ArtefactoResuelto } from '../topologia/resolverArtefactosReferenciados'

function claveDeLocal(resuelto: ArtefactoResuelto): string {
  return JSON.stringify([resuelto.referencia.unidadFuncionalId, resuelto.referencia.localId])
}

export function aplicarParticipacionCritA8(
  artefactos: readonly ArtefactoResuelto[],
  catalogoArtefactos: readonly ArtefactoNormativo[],
): readonly ArtefactoResuelto[] {
  const buscarArtefactoNormativo = (artefactoId: string) =>
    catalogoArtefactos.find((candidato) => candidato.id === artefactoId)

  const gruposPorLocal = new Map<string, ArtefactoResuelto[]>()
  for (const resuelto of artefactos) {
    const clave = claveDeLocal(resuelto)
    const grupo = gruposPorLocal.get(clave)
    if (grupo === undefined) {
      gruposPorLocal.set(clave, [resuelto])
    } else {
      grupo.push(resuelto)
    }
  }

  const participantesPorClave = new Map<string, ReadonlySet<ArtefactoResuelto>>()
  for (const [clave, grupo] of gruposPorLocal) {
    const conValvulaAutomatica = grupo.filter((resuelto) => {
      const artefactoNormativo = buscarArtefactoNormativo(resuelto.artefacto.artefactoId)
      return artefactoNormativo?.limpiezaConValvulaAutomatica === true
    })

    const aplicaCritA8 = grupo[0]?.local.regimen === 'domiciliario' && conValvulaAutomatica.length > 0

    participantesPorClave.set(clave, new Set(aplicaCritA8 ? conValvulaAutomatica : grupo))
  }

  // Filtro final sobre el arreglo de entrada original (no sobre los
  // grupos) para preservar el orden relativo de entrada entre Locales.
  return artefactos.filter((resuelto) => participantesPorClave.get(claveDeLocal(resuelto))?.has(resuelto) ?? false)
}
