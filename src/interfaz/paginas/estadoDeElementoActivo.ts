// UI-M2-GROUP-01: selección determinística de "elemento activo" para listas
// colapsables de Módulo 2 (Unidades Funcionales, Montantes). Puro estado
// transitorio de interfaz -- NO se persiste en Proyecto, NO exporta, NO
// afecta el cálculo hidráulico. Compartido entre ambas listas porque la
// regla es idéntica en las dos (§7/§8/§15/§32): al agregar/duplicar un
// elemento, el nuevo queda activo; al eliminar el elemento activo, se elige
// otro de forma determinística (el que ocupaba su misma posición, o el
// último si ya no hay ninguno en esa posición).
//
// Recibe sólo arrays de ids (nunca el dominio completo) para no acoplar
// esta lógica de UI a Proyecto/UnidadFuncional/Montante.
export function elegirElementoActivoTrasCambio(
  idsAnteriores: readonly string[],
  idsActuales: readonly string[],
  activoAnterior: string | undefined,
): string | undefined {
  const nuevos = idsActuales.filter((id) => !idsAnteriores.includes(id))
  if (nuevos.length > 0) {
    // Si se agregó/duplicó más de uno en el mismo cambio (caso borde, no
    // esperado en el flujo normal), el último del array gana -- mismo
    // criterio que "la UF nueva es la última agregada".
    return nuevos[nuevos.length - 1]
  }

  if (activoAnterior !== undefined && idsActuales.includes(activoAnterior)) {
    return activoAnterior
  }

  if (idsActuales.length === 0) {
    return undefined
  }

  if (activoAnterior === undefined) {
    // No había ningún activo previo (o se perdió por un motivo ajeno a
    // este cambio) y no hay ninguna novedad que decida por nosotros:
    // convención determinística = el primero de la lista actual (mismo
    // criterio que el useState inicial de la lista, §29).
    return idsActuales[0]
  }

  const posicionAnterior = idsAnteriores.indexOf(activoAnterior)
  if (posicionAnterior >= 0 && posicionAnterior < idsActuales.length) {
    return idsActuales[posicionAnterior]
  }

  return idsActuales[idsActuales.length - 1]
}
