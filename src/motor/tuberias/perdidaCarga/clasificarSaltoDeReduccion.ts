// HYD-ACQUA-K-CATALOG-01: clasifica el salto de diámetro comercial entre
// dos denominaciones ("20 mm", "32 mm", ...) usando la serie nominal
// comercial ordenada -- necesario porque el manual Acqua System publica
// DOS coeficientes distintos para "Buje de reducción" según cuántos
// escalones de diámetro separan ambos lados (ítem 2 "diámmetros
// inmediatos" / ítem 2a "diámetros mediatos"), y la decisión diferida de
// HYD-OVERPASS-01 exigía justamente esta clasificación real en vez de
// adoptar siempre el mismo valor. Función pura, independiente de sistema
// -- no decide el Ks, sólo la clasificación geométrica del salto.
//
// La serie es la misma que ya usa el catálogo comercial de sistemas de
// tubería (`catalogoSistemasDeTuberia` -- Acqua System Magnum PN20 publica
// exactamente estos 10 diámetros). Comparación simétrica (independiente
// de cuál lado es mayor): una reducción vive igual en cualquier sentido de
// recorrido si el modelo llega a admitir ambos.
const SERIE_DN_COMERCIAL_MM = [20, 25, 32, 40, 50, 63, 75, 90, 110, 125] as const

export type ClasificacionSaltoDeReduccion = 'inmediata' | 'mediata' | 'mismoDn' | 'pendiente'

function extraerDnNumerico(denominacionComercial: string): number | undefined {
  const coincidencia = /(\d+(?:[.,]\d+)?)/.exec(denominacionComercial)
  if (coincidencia === null) {
    return undefined
  }
  return Number(coincidencia[1]!.replace(',', '.'))
}

// `pendiente`: alguno de los dos DN no se pudo extraer o no pertenece a la
// serie nominal -- nunca se inventa una clasificación arbitraria (mismo
// principio "nunca fabricar un valor sin fuente" del resto del dominio).
export function clasificarSaltoDeReduccion(dnA: string, dnB: string): ClasificacionSaltoDeReduccion {
  const numA = extraerDnNumerico(dnA)
  const numB = extraerDnNumerico(dnB)
  if (numA === undefined || numB === undefined) {
    return 'pendiente'
  }

  const idxA = SERIE_DN_COMERCIAL_MM.indexOf(numA as (typeof SERIE_DN_COMERCIAL_MM)[number])
  const idxB = SERIE_DN_COMERCIAL_MM.indexOf(numB as (typeof SERIE_DN_COMERCIAL_MM)[number])
  if (idxA === -1 || idxB === -1) {
    return 'pendiente'
  }

  const salto = Math.abs(idxA - idxB)
  if (salto === 0) {
    return 'mismoDn'
  }
  return salto === 1 ? 'inmediata' : 'mediata'
}
