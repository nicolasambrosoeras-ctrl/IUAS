// Convención IUAS (D-δ.46, reencuadrada por GEOM-UX-01 / D-δ.86) para
// proponer, al asignar/cambiar el nivel de una Unidad Funcional, una cota
// de PISO por defecto -- NUNCA atribuible a ERAS-2023, es una facilidad
// de carga rápida de IUAS, siempre editable por el usuario. Asume 3 m de
// altura libre entre plantas (PB = 0). Ya NO incluye el +1 m de "altura
// de conexión típica": esa altura sobre el piso la aporta ahora la Tabla
// IUAS por tipo de artefacto (alturasHidraulicasIuas), no un término fijo
// horneado en la cota de la UF -- así la cota hidráulica efectiva de cada
// terminal es piso + altura del artefacto, sin doble conteo.
export function calcularCotaHidraulicaDefaultDeNivel(nivel: number): number {
  return 3 * nivel
}

// Nombre humano de un nivel -- se deriva de `nivel` para cualquier
// entero, nunca hardcodea una enumeración finita de pisos (PB=0,
// Piso 1=1, Piso 2=2...). Subsuelos (nivel negativo) quedan fuera del
// alcance normativo/UX de esta corrida.
export function nombreDeNivel(nivel: number): string {
  return nivel === 0 ? 'PB' : `Piso ${nivel}`
}

// UX-HIERARCHY-POLISH-01: resumen compacto de un Nivel para su cabecera
// colapsada, p.ej. "PB · +0,00 m · 5 locales". `nivel.nombre` es el
// nombre humano EDITABLE (por default = nombreDeNivel de su `nivel`
// numérico, pero el usuario puede personalizarlo) -- se usa tal cual,
// nunca re-derivado acá. Formato de cota con signo duplicado
// intencionalmente de `formatearCotaConSigno` en MotorDemandaPantalla.tsx
// (GEOM-UX-01 §6/§11): mismo criterio que el resto de las etiquetas de
// presentación chicas y puntuales de este proyecto (ver
// ETIQUETA_TIPO_DE_LOCAL, duplicado a propósito en varios archivos) -- no
// vale la pena una abstracción compartida para un formateador de 3 líneas.
function formatearCotaConSignoParaResumenDeNivel(valor: number): string {
  const abs = Math.abs(valor).toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  return `${valor < 0 ? '-' : '+'}${abs}`
}

export function resumenDeNivel(nivel: { readonly nombre: string; readonly cotaHidraulicaReferencia_m?: number; readonly locales: readonly unknown[] }): string {
  const cotaTexto =
    nivel.cotaHidraulicaReferencia_m === undefined
      ? 'sin cota'
      : `${formatearCotaConSignoParaResumenDeNivel(nivel.cotaHidraulicaReferencia_m)} m`
  const cantidadLocales = nivel.locales.length
  const localesTexto = `${cantidadLocales} ${cantidadLocales === 1 ? 'local' : 'locales'}`
  return `${nivel.nombre} · ${cotaTexto} · ${localesTexto}`
}
