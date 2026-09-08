// UX-01 / UI-01D (D-δ.76): resumen COMPACTO de una Unidad Funcional para
// la cabecera colapsable de M1. Presentación pura sobre datos ya
// persistidos en `Proyecto` -- NO recalcula demanda, NO toca hidráulica y
// NO introduce ningún helper del motor. Se recomputa en cada render a
// partir de la UF actual, así que reflejar nombre/nivel editados es
// automático (nunca se cachea).
import type { UnidadFuncional } from '../../modelo/proyecto'
import { nombreDeNivel } from './nivelUnidadFuncional'

export interface ResumenDeUnidadFuncional {
  readonly nombre: string
  readonly nivelTexto: string
  readonly cantidadLocales: number
  // Suma de `cantidad` de todos los artefactos de todos los locales
  // (sección 23 del brief): "Lavatorio ×2 + Inodoro ×1" ⇒ 3, nunca el
  // número de filas.
  readonly cantidadArtefactos: number
  readonly localesTexto: string
  readonly artefactosTexto: string
}

function pluralizar(cantidad: number, singular: string, plural: string): string {
  return `${cantidad} ${cantidad === 1 ? singular : plural}`
}

export function resumenDeUnidadFuncional(uf: UnidadFuncional): ResumenDeUnidadFuncional {
  const cantidadLocales = uf.locales.length
  const cantidadArtefactos = uf.locales.reduce(
    (total, local) => total + local.artefactos.reduce((suma, artefacto) => suma + artefacto.cantidad, 0),
    0,
  )
  return {
    nombre: uf.nombre,
    nivelTexto: uf.nivel === undefined ? 'Sin clasificar' : nombreDeNivel(uf.nivel),
    cantidadLocales,
    cantidadArtefactos,
    localesTexto: pluralizar(cantidadLocales, 'local', 'locales'),
    artefactosTexto: pluralizar(cantidadArtefactos, 'artefacto', 'artefactos'),
  }
}
