// HYD-ACQUA-K-CATALOG-01: las 8 configuraciones oficiales de Tee que
// publica el manual Acqua System (ítems 5/5a/6/6a/7/7a/8/8a de
// tablaOficialAcquaSystem.ts), modeladas explícitamente con su
// circulación (entradas/salidas) y su par normal/reducida -- preparadas
// para un futuro selector del editor detallado, que HOY NO existe: el
// dominio actual sólo representa Tee sobre `Nodo.tee`
// (`ConfiguracionDeTee`, CRIT-A31) con 3 variantes fijas
// (entradaCentral/salidaLateral/entradaCentralSalidasLaterales), siempre
// resueltas contra Tabla N°7 (ERAS-2023) sin importar el sistema
// comercial adoptado -- ESO NO CAMBIA en este slice ("conservar
// compatibilidad... resolver temporalmente esa tee genérica según la
// regla documentada vigente", ver docs/HYD-ACQUA-K-CATALOG-01.md). Esta
// estructura vive en el dominio como catálogo consultable/testeable, sin
// consumidor de cálculo todavía.
import type { NumeroFilaOficialAcquaSystem } from './tablaOficialAcquaSystem'

export type IdConfiguracionTeeDetallada =
  | 'distribucionDesdeExtremo'
  | 'convergenciaHaciaExtremo'
  | 'convergenciaHaciaRamal'
  | 'distribucionDesdeRamal'

export type ConfiguracionTeeDetalladaAcquaSystem = {
  readonly id: IdConfiguracionTeeDetallada
  readonly entradas: string
  readonly salidas: string
  readonly ksNormal: number
  readonly ksReducida: number
  readonly filaOficialNormal: NumeroFilaOficialAcquaSystem
  readonly filaOficialReducida: NumeroFilaOficialAcquaSystem
}

export const configuracionesTeeDetalladaAcquaSystem: readonly ConfiguracionTeeDetalladaAcquaSystem[] = [
  {
    id: 'distribucionDesdeExtremo',
    entradas: 'extremo A',
    salidas: 'extremo B + ramal',
    ksNormal: 1.8,
    ksReducida: 3.6,
    filaOficialNormal: '5',
    filaOficialReducida: '5a',
  },
  {
    id: 'convergenciaHaciaExtremo',
    entradas: 'extremo A + ramal',
    salidas: 'extremo B',
    ksNormal: 1.3,
    ksReducida: 2.6,
    filaOficialNormal: '6',
    filaOficialReducida: '6a',
  },
  {
    id: 'convergenciaHaciaRamal',
    entradas: 'extremos A + B',
    salidas: 'ramal',
    ksNormal: 4.2,
    ksReducida: 9.0,
    filaOficialNormal: '7',
    filaOficialReducida: '7a',
  },
  {
    id: 'distribucionDesdeRamal',
    entradas: 'ramal',
    salidas: 'extremos A + B',
    ksNormal: 2.2,
    ksReducida: 5.0,
    filaOficialNormal: '8',
    filaOficialReducida: '8a',
  },
] as const

export function obtenerConfiguracionTeeDetallada(id: IdConfiguracionTeeDetallada): ConfiguracionTeeDetalladaAcquaSystem {
  const configuracion = configuracionesTeeDetalladaAcquaSystem.find((candidata) => candidata.id === id)
  if (configuracion === undefined) {
    throw new Error(`obtenerConfiguracionTeeDetallada: no existe ninguna configuración con id "${id}"`)
  }
  return configuracion
}
