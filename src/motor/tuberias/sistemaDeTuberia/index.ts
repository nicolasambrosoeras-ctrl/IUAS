// Catálogo de sistemas comerciales reales de tubería. Distinto de
// SistemaDeTuberia (diametroComercial/obtenerCandidatosDeDiametroComercial.ts):
// ese es geometría comercial pura (id/denominacion/entradas), sin conocer
// material/fabricante/fuente -- consumido tal cual por la selección
// matemática (obtenerCandidatosDeDiametroComercial). Este módulo agrega,
// por encima y sin modificarlo, la capa de catálogo real: qué sistema es,
// de qué fabricante, a qué material pertenece y de dónde salen sus
// diámetros. Un mismo materialTuberiaId podrá tener múltiples entradas de
// este catálogo en incrementos futuros (otras series/PN, otros
// fabricantes) -- por eso vive en una lista, igual que
// catalogoMaterialesTuberia.
import type { MaterialTuberiaId } from '../../../modelo/proyecto'
import type { SistemaDeTuberia } from '../diametroComercial/obtenerCandidatosDeDiametroComercial'

export type SistemaDeTuberiaCatalogado = SistemaDeTuberia & {
  readonly materialTuberiaId: MaterialTuberiaId
  readonly fabricante: string
  readonly referenciaFuenteDimensiones: string
}

// Diámetro interior efectivo (di) publicado directamente por el
// fabricante -- no derivado de diámetro exterior/espesor. de_mm y
// espesor_mm no se incorporan: ningún consumidor hidráulico actual los
// necesita (mismo criterio ya aplicado en EntradaCatalogoTuberia). No es
// una tabla ERAS-2023: es un catálogo comercial/fabricante.
export const catalogoSistemasDeTuberia: readonly SistemaDeTuberiaCatalogado[] = [
  {
    id: 'acquaSystemMagnumPn20',
    denominacion: 'Acqua System® Magnum PN20',
    materialTuberiaId: 'ppr',
    fabricante: 'Grupo Dema',
    referenciaFuenteDimensiones:
      'Grupo Dema -- página oficial de producto Acqua System® Magnum PN20: ' +
      'https://www.grupodema.com.ar/productos/tubo-acqua-system-r-magnum-pn20-acqua-system-101 ' +
      '(diámetro interior "di" publicado directamente por el fabricante).',
    entradas: [
      { denominacionComercial: '20 mm', diametroInteriorEfectivo_mm: 14.4 },
      { denominacionComercial: '25 mm', diametroInteriorEfectivo_mm: 18.0 },
      { denominacionComercial: '32 mm', diametroInteriorEfectivo_mm: 23.2 },
      { denominacionComercial: '40 mm', diametroInteriorEfectivo_mm: 29.0 },
      { denominacionComercial: '50 mm', diametroInteriorEfectivo_mm: 36.2 },
      { denominacionComercial: '63 mm', diametroInteriorEfectivo_mm: 45.8 },
      { denominacionComercial: '75 mm', diametroInteriorEfectivo_mm: 54.4 },
      { denominacionComercial: '90 mm', diametroInteriorEfectivo_mm: 65.4 },
      { denominacionComercial: '110 mm', diametroInteriorEfectivo_mm: 79.8 },
      { denominacionComercial: '125 mm', diametroInteriorEfectivo_mm: 88.9 },
    ],
  },
]

export function obtenerSistemaDeTuberia(
  id: string,
  catalogo: readonly SistemaDeTuberiaCatalogado[],
): SistemaDeTuberiaCatalogado {
  const sistema = catalogo.find((candidato) => candidato.id === id)

  if (sistema === undefined) {
    throw new Error(`obtenerSistemaDeTuberia: no existe ningún SistemaDeTuberiaCatalogado con id "${id}" en el catálogo recibido`)
  }

  return sistema
}
