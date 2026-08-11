// Catálogo de propiedades hidráulicas por material de tubería. No es un
// catálogo ERAS-2023 -- CRIT-A17 admite/emplea Hazen-Williams "con un
// coeficiente C según los materiales adoptados" pero no fija esa tabla, y
// CRIT-A18 (Darcy-Weisbach) es una decisión de ingeniería del proyecto
// ajena a ERAS. Por eso vive junto al resto de insumos de tubería
// (motor/tuberias), no bajo normativa/eras-2023. Distinto de
// SistemaDeTuberia (obtenerCandidatosDeDiametroComercial.ts): ese es
// geometría comercial pura; este es material -- C y epsilon no se agregan
// a SistemaDeTuberia ni viceversa.
import type { MaterialTuberiaId } from '../../../modelo/proyecto'

export type MaterialTuberia = {
  readonly id: MaterialTuberiaId
  readonly nombre: string
  readonly coeficienteC: number
  readonly rugosidadAbsoluta_mm: number
  readonly referenciaFuenteC: string
  readonly referenciaFuenteRugosidad: string
}

// Valores operativos únicos adoptados por el proyecto (sin modelar edad,
// corrosión, incrustación ni rangos) -- ver investigación técnica previa.
// PEAD: 0,0213 mm es el valor PPI TN-27 para tubería instalada con cordón
// de termofusión, deliberadamente distinto del "plástico liso" genérico de
// 0,0015 mm -- no reemplazar.
export const catalogoMaterialesTuberia: readonly MaterialTuberia[] = [
  {
    id: 'ppr',
    nombre: 'PPR',
    coeficienteC: 150,
    rugosidadAbsoluta_mm: 0.007,
    referenciaFuenteC: 'Aquatherm -- documentación técnica/FAQ: Hazen-Williams C para polypropylene pipe = 150.',
    referenciaFuenteRugosidad: 'Italsan -- sistema NIRON PP-R: rugosidad superficial K = 0,007 mm.',
  },
  {
    id: 'pvc',
    nombre: 'PVC',
    coeficienteC: 150,
    rugosidadAbsoluta_mm: 0.0015,
    referenciaFuenteC: 'Uni-Bell PVC Pipe Association.',
    referenciaFuenteRugosidad: 'Valor clásico adoptado para plástico liso / tablas hidráulicas de referencia.',
  },
  {
    id: 'pead',
    nombre: 'PEAD',
    coeficienteC: 150,
    rugosidadAbsoluta_mm: 0.0213,
    referenciaFuenteC: 'PPI TN-27 / Plastics Pipe Institute.',
    referenciaFuenteRugosidad:
      'PPI TN-27 / Plastics Pipe Institute -- valor que incorpora el efecto de los cordones interiores de termofusión.',
  },
  {
    id: 'cobre',
    nombre: 'Cobre',
    coeficienteC: 140,
    rugosidadAbsoluta_mm: 0.0015,
    referenciaFuenteC: 'Tablas hidráulicas técnicas documentadas en la investigación previa (Bentley / tradición ASPE-Crane-Moody).',
    referenciaFuenteRugosidad:
      'Tablas hidráulicas técnicas documentadas en la investigación previa (Bentley / tradición ASPE-Crane-Moody).',
  },
  {
    id: 'aceroGalvanizado',
    nombre: 'Acero galvanizado',
    coeficienteC: 120,
    rugosidadAbsoluta_mm: 0.15,
    referenciaFuenteC: 'Tablas hidráulicas técnicas documentadas en la investigación previa.',
    referenciaFuenteRugosidad: 'Tablas hidráulicas técnicas documentadas en la investigación previa.',
  },
  {
    id: 'aceroCarbono',
    nombre: 'Acero al carbono',
    coeficienteC: 140,
    rugosidadAbsoluta_mm: 0.045,
    referenciaFuenteC: 'Tablas hidráulicas técnicas documentadas en la investigación previa.',
    referenciaFuenteRugosidad: 'Tablas hidráulicas técnicas documentadas en la investigación previa.',
  },
] as const

export function obtenerMaterialTuberia(
  materialId: MaterialTuberiaId,
  catalogoMateriales: readonly MaterialTuberia[],
): MaterialTuberia {
  const material = catalogoMateriales.find((candidato) => candidato.id === materialId)

  // Precondicion imposible con el catalogo real completo (mismo criterio
  // que obtenerCoeficienteABase/resolverAportesDeDemanda): materialId ya
  // esta tipado como MaterialTuberiaId, asi que solo puede fallar si el
  // catalogo recibido esta incompleto -- error explicito, sin fallback.
  if (material === undefined) {
    throw new Error(
      `obtenerMaterialTuberia: no existe ningún MaterialTuberia con id "${materialId}" en el catálogo recibido`,
    )
  }

  return material
}
