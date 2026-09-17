// HYD-OVERPASS-01: catálogo comercial del producto "Sobrepaso fusión"
// (Acqua System® / Grupo Dema) -- DN y código de fábrica, tal como los
// publica el Manual Técnico Acqua System (pág. 49):
// https://www.grupodema.com.ar/bundles/app/front/images/Manual-Acqua-System-03-03-2026.pdf
//
// El producto sólo existe comercialmente en tres DN. Fuera de esos tres,
// NO existe una pieza Acqua System que pueda venderse con ese nombre --
// nunca se asigna un código incorrecto ni se degrada a una denominación
// genérica (ver `resolverProductoSobrepasoAcquaSystem`).
export type ProductoSobrepasoAcquaSystem = {
  readonly dnComercial: string
  readonly codigo: string
}

export const catalogoSobrepasoAcquaSystem: readonly ProductoSobrepasoAcquaSystem[] = [
  { dnComercial: '20 mm', codigo: '08-084020000' },
  { dnComercial: '25 mm', codigo: '08-084025000' },
  { dnComercial: '32 mm', codigo: '08-084032000' },
] as const

export type ResultadoProductoSobrepaso =
  | { readonly tipo: 'resuelto'; readonly producto: ProductoSobrepasoAcquaSystem }
  // DN adoptado del Tramo fuera del rango que Acqua System comercializa
  // para este producto (sólo 20/25/32 mm) -- nunca se inventa un código.
  | { readonly tipo: 'dnNoDisponible'; readonly dnComercial: string }

export function resolverProductoSobrepasoAcquaSystem(dnComercial: string): ResultadoProductoSobrepaso {
  const producto = catalogoSobrepasoAcquaSystem.find((candidato) => candidato.dnComercial === dnComercial)
  if (producto === undefined) {
    return { tipo: 'dnNoDisponible', dnComercial }
  }
  return { tipo: 'resuelto', producto }
}
