// HYD-OVERPASS-01: selección de catálogo de Ks por sistema comercial de
// tubería, en el dominio hidráulico (nunca en el PDF ni sólo en
// Materials). Hasta este slice, `obtenerKsDeAccesorio` (Tabla N°7,
// ERAS-2023) era la única fuente para cualquier `AccesorioDeTramo`
// declarado, sin importar el sistema/material adoptado. A partir de acá:
// cuando el sistema comercial adoptado del proyecto es
// `acquaSystemMagnumPn20`, los accesorios que el FABRICANTE publica con
// coeficiente propio (`catalogoKAccesoriosAcquaSystem`) usan ese valor;
// el resto del subconjunto de Tramo (`llaveDePaso`, `valvulaEsclusa`,
// `tuboSaliente`) sigue resolviendo desde Tabla N°7 -- Acqua System no
// publica un coeficiente propio para esas piezas, y no se inventa uno
// (mismo principio "nunca fabricar un valor sin fuente" que rige todo el
// dominio). Para cualquier otro sistema (hierro, cobre, PVC genérico,
// etc.) el comportamiento es EXACTAMENTE el de antes de este slice: Tabla
// N°7 completa, sin cambios (CRIT-A28 sigue firme, sin reabrir).
import type { IdAccesorioDeTramo } from '../../../modelo/redHidraulica'
import { obtenerKsDeAccesorio } from '../../../normativa/eras-2023/tabla-07-perdidas-localizadas'
import { catalogoKAccesoriosAcquaSystem, tieneKAcquaSystem, obtenerKsAcquaSystem } from './catalogoKAccesoriosAcquaSystem'

export const SISTEMA_DE_TUBERIA_ACQUA_SYSTEM_ID = 'acquaSystemMagnumPn20'

export type CatalogoKAplicado = 'eras2023TablaN7' | 'acquaSystem'

export type ResultadoKsDeAccesorioDeTramo = {
  readonly ks: number
  readonly catalogo: CatalogoKAplicado
  readonly fuente: string
}

export function resolverKsDeAccesorioDeTramo(id: IdAccesorioDeTramo, sistemaDeTuberiaId: string): ResultadoKsDeAccesorioDeTramo {
  if (sistemaDeTuberiaId === SISTEMA_DE_TUBERIA_ACQUA_SYSTEM_ID && tieneKAcquaSystem(id)) {
    const fila = obtenerKsAcquaSystem(id)
    return { ks: fila.ks, catalogo: 'acquaSystem', fuente: fila.fundamento }
  }
  return {
    ks: obtenerKsDeAccesorio(id),
    catalogo: 'eras2023TablaN7',
    fuente: 'ERAS-2023 §2.12.1, Tabla N°7 (normativa/eras-2023/tabla-07-perdidas-localizadas).',
  }
}

// Re-exportado para consumidores que sólo necesitan saber si un id
// determinado tiene cobertura propia en el catálogo Acqua System (por
// ejemplo, trazabilidad de materiales) sin resolver un Ks concreto.
export { catalogoKAccesoriosAcquaSystem }
