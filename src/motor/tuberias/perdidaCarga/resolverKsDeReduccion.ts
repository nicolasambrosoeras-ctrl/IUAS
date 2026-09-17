// HYD-ACQUA-K-CATALOG-01: resuelve el K de una `reducciones` declarada
// sobre un Tramo (CRIT-A30) -- cierra la decisión diferida de
// HYD-OVERPASS-01 ("se adopta el ítem 2 como valor de proyecto para este
// slice, revisable"). A diferencia del resto de `IdAccesorioDeTramo`, el
// K de una reducción bajo Acqua System depende del salto de diámetro
// REAL entre el Tramo donde se declara (lado menor, aguas abajo de la
// transición, CRIT-A30) y el Tramo inmediatamente aguas arriba -- nunca
// de un valor fijo por id. Por eso vive fuera de
// `resolverKsDeAccesorioDeTramo.ts`/`catalogoKAccesoriosAcquaSystem.ts`
// (que resuelven por identidad pura, sin contexto topológico).
import { clasificarSaltoDeReduccion } from './clasificarSaltoDeReduccion'
import { obtenerKsDeAccesorio } from '../../../normativa/eras-2023/tabla-07-perdidas-localizadas'
import { SISTEMA_DE_TUBERIA_ACQUA_SYSTEM_ID, type CatalogoKAplicado } from './resolverKsDeAccesorioDeTramo'
import { tablaOficialAcquaSystem, obtenerFilaOficialAcquaSystem, FUENTE_MANUAL_ACQUA_SYSTEM } from './tablaOficialAcquaSystem'

export type ResultadoKsDeReduccion =
  | {
      readonly resultado: 'calculado'
      readonly ks: number
      readonly catalogo: CatalogoKAplicado
      readonly fuente: string
    }
  // El DN propio, el DN aguas arriba (no hay Tramo padre, p.ej. la
  // reducción se declaró en el primer Tramo del camino) o alguno de los
  // dos no pertenece a la serie nominal comercial -- nunca se inventa una
  // clasificación (mismo criterio "nunca fabricar un valor sin fuente").
  | { readonly resultado: 'noClasificable' }

export function resolverKsDeReduccion(
  sistemaDeTuberiaId: string,
  // undefined: el llamador no tiene DN propio resuelto (irrelevante para
  // ERAS -- Tabla N°7 nunca lo necesitó; sólo bloquea bajo Acqua System).
  dnPropio: string | undefined,
  dnAguasArriba: string | undefined,
): ResultadoKsDeReduccion {
  if (sistemaDeTuberiaId !== SISTEMA_DE_TUBERIA_ACQUA_SYSTEM_ID) {
    // ERAS-2023 (Tabla N°7) no distingue el salto de diámetro -- un único
    // valor fijo, sin cambios respecto de antes de este slice.
    return {
      resultado: 'calculado',
      ks: obtenerKsDeAccesorio('reducciones'),
      catalogo: 'eras2023TablaN7',
      fuente: 'ERAS-2023 §2.12.1, Tabla N°7 (normativa/eras-2023/tabla-07-perdidas-localizadas).',
    }
  }

  if (dnPropio === undefined || dnAguasArriba === undefined) {
    return { resultado: 'noClasificable' }
  }

  const clasificacion = clasificarSaltoDeReduccion(dnPropio, dnAguasArriba)
  if (clasificacion === 'pendiente') {
    return { resultado: 'noClasificable' }
  }
  if (clasificacion === 'mismoDn') {
    // "mismo DN: no existe reducción" -- no es un dato faltante, es una
    // clasificación válida con incidencia hidráulica nula (no hay pieza
    // física de reducción entre dos Tramos del mismo diámetro).
    return { resultado: 'calculado', ks: 0, catalogo: 'acquaSystem', fuente: FUENTE_MANUAL_ACQUA_SYSTEM }
  }

  const numeroFila = clasificacion === 'inmediata' ? '2' : '2a'
  const fila = obtenerFilaOficialAcquaSystem(numeroFila)
  return { resultado: 'calculado', ks: fila.r, catalogo: 'acquaSystem', fuente: FUENTE_MANUAL_ACQUA_SYSTEM }
}

// Reexportado por conveniencia de quienes ya importan este módulo y
// necesitan la tabla oficial completa (p.ej. tests de catálogo).
export { tablaOficialAcquaSystem }
