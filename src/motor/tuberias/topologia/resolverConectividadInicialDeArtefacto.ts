// Resolver PURO de la conectividad física con la que debe quedar un
// Artefacto (CAT-CONN-01, D-δ.84). No recibe Proyecto, ni RedHidraulica,
// ni `qu`, ni labels: sólo el `artefactoId` de catálogo y, opcionalmente,
// el override explícito de la instancia (`Artefacto.conectividadElegida`).
//
// Reemplaza a `determinarRedesFisicasPorPrecedente`: la conectividad de un
// artefacto nuevo YA NO depende de qué haya conectado accidentalmente el
// resto del proyecto. Precedencia:
//   1. override explícito de instancia, si la política lo admite;
//   2. política de conectividad del catálogo;
//   3. nada más -- nunca precedente, nunca heurística sobre `qu`/label.
//
// La topología de `Proyecto.redHidraulica` sigue siendo la fuente EFECTIVA
// que consume Módulo 2 (CRIT-A15); este resolver sólo dice qué terminales
// hay que crear/reconciliar.
import type { ConectividadFisica, RedDeTramo } from '../../../modelo/redHidraulica'
import {
  obtenerPoliticaDeConectividad,
  type PoliticaDeConectividad,
} from '../../../normativa/eras-2023/catalogo-artefactos/politicaConectividad'

export type ConectividadInicialResuelta =
  | {
      // Conectividad determinada sin intervención del usuario: políticas
      // `automatica` y `defaultConfigurable`, o cualquier política con un
      // override de instancia válido.
      readonly tipo: 'resuelta'
      readonly conectividad: ConectividadFisica
      readonly redes: readonly RedDeTramo[]
    }
  | {
      // Política `requiereSeleccion` sin override todavía: hay que pedirle
      // al usuario que declare la alimentación antes de conectar.
      readonly tipo: 'requiereSeleccion'
      readonly opcionesPermitidas: readonly ConectividadFisica[]
    }
  | {
      // El `artefactoId` no tiene política (no está en el catálogo, o se
      // agregó al catálogo sin darle política). Falla visible -- nunca se
      // adopta un default silencioso.
      readonly tipo: 'tipoDesconocido'
    }

// Única conversión ConectividadFisica -> Redes del repo. No duplicar este
// mapping en otros módulos: importarlo de acá.
export function redesDeConectividadFisica(conectividad: ConectividadFisica): readonly RedDeTramo[] {
  if (conectividad === 'ambas') return ['AF', 'AC']
  if (conectividad === 'soloAF') return ['AF']
  return ['AC']
}

// Inversa: a partir del conjunto de Redes a las que se conecta un
// artefacto, su ConectividadFisica. Acepta las Redes en cualquier orden.
export function conectividadFisicaDeRedes(redes: readonly RedDeTramo[]): ConectividadFisica {
  const tieneAF = redes.includes('AF')
  const tieneAC = redes.includes('AC')
  if (tieneAF && tieneAC) return 'ambas'
  if (tieneAC) return 'soloAC'
  return 'soloAF'
}

function politicaAdmiteOverride(
  politica: PoliticaDeConectividad,
  conectividad: ConectividadFisica,
): boolean {
  // `automatica` no admite personalización: no hay UI para setearla y un
  // override quedaría en contradicción con "automática" (típicamente es un
  // `conectividadElegida` que sobrevivió de un tipo anterior). Se ignora.
  if (politica.politica === 'automatica') return false
  return politica.opcionesPermitidas.includes(conectividad)
}

export function resolverConectividadInicialDeArtefacto(
  artefactoIdCatalogo: string,
  conectividadElegida?: ConectividadFisica,
): ConectividadInicialResuelta {
  const politica = obtenerPoliticaDeConectividad(artefactoIdCatalogo)
  if (politica === undefined) {
    return { tipo: 'tipoDesconocido' }
  }

  if (conectividadElegida !== undefined && politicaAdmiteOverride(politica, conectividadElegida)) {
    return {
      tipo: 'resuelta',
      conectividad: conectividadElegida,
      redes: redesDeConectividadFisica(conectividadElegida),
    }
  }

  if (politica.politica === 'requiereSeleccion') {
    return { tipo: 'requiereSeleccion', opcionesPermitidas: politica.opcionesPermitidas }
  }

  return {
    tipo: 'resuelta',
    conectividad: politica.referencia,
    redes: redesDeConectividadFisica(politica.referencia),
  }
}
