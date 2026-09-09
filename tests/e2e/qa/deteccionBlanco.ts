// Detector de "pantalla blanca" (brief §13-A/B, §14, §53). Se separa en
// dos capas:
//
//  1. una MUESTRA del DOM que recolecta el harness Playwright en vivo
//     (`invariantes.ts` la arma con `page.evaluate`), y
//  2. esta FUNCIÓN PURA de decisión, que no toca el navegador y por eso
//     se puede probar en Vitest con "DOM simulado" = un objeto plano
//     (brief §53: el detector debe tener test, sin meter un botón secreto
//     en producción).
//
// El caso objetivo es el observado en móvil: viewport con fondo claro y la
// aplicación DESMONTADA (React tiró durante el render, el root quedó vacío
// o sólo con el cascarón). No alcanza con `body.innerText.length > 0`
// porque el cromo del navegador y textos residuales cuentan como texto.

export type MuestraDePantalla = {
  /** ¿Existe el nodo `#root` (o el `<main>` de la app)? */
  readonly rootPresente: boolean
  /** Cantidad de nodos elemento dentro del root (0 = desmontado). */
  readonly nodosEnRoot: number
  /** Largo del texto visible dentro del root, ya recortado. */
  readonly textoUtilEnRoot: number
  /** ¿Aparece el marcador estable de identidad "IUAS" dentro del root? */
  readonly marcadorIuas: boolean
  /** ¿Hay al menos una sección/landmark de navegación reconocible? */
  readonly navegacionReconocible: boolean
  /** Alto del área de contenido pintada, en px (heurística de "vacío"). */
  readonly altoContenidoPx: number
}

export type VeredictoDePantalla =
  | { readonly blanca: false }
  | { readonly blanca: true; readonly motivo: string; readonly codigo: 'WHITE_SCREEN' }

// Umbral mínimo de texto útil para considerar que "hay app". El proyecto
// de ejemplo siempre renderiza cientos de caracteres (título, aviso
// piloto, formulario). 40 deja margen de sobra hacia abajo sin arriesgar
// falsos negativos.
const MIN_TEXTO_UTIL = 40
const MIN_NODOS_ROOT = 3
const MIN_ALTO_CONTENIDO_PX = 80

export function evaluarPantalla(muestra: MuestraDePantalla): VeredictoDePantalla {
  if (!muestra.rootPresente) {
    return { blanca: true, codigo: 'WHITE_SCREEN', motivo: 'No existe el contenedor raíz de la app (#root / main).' }
  }
  if (muestra.nodosEnRoot < MIN_NODOS_ROOT) {
    return {
      blanca: true,
      codigo: 'WHITE_SCREEN',
      motivo: `El contenedor raíz está prácticamente vacío (${muestra.nodosEnRoot} nodos): la app se desmontó.`,
    }
  }
  if (muestra.textoUtilEnRoot < MIN_TEXTO_UTIL) {
    return {
      blanca: true,
      codigo: 'WHITE_SCREEN',
      motivo: `Texto visible insuficiente en la app (${muestra.textoUtilEnRoot} caracteres útiles).`,
    }
  }
  if (!muestra.marcadorIuas) {
    return {
      blanca: true,
      codigo: 'WHITE_SCREEN',
      motivo: 'Desapareció el marcador de identidad "IUAS" del contenido de la app.',
    }
  }
  if (!muestra.navegacionReconocible) {
    return {
      blanca: true,
      codigo: 'WHITE_SCREEN',
      motivo: 'No quedó ninguna sección ni navegación reconocible en la app.',
    }
  }
  if (muestra.altoContenidoPx < MIN_ALTO_CONTENIDO_PX) {
    return {
      blanca: true,
      codigo: 'WHITE_SCREEN',
      motivo: `El área de contenido pintada es demasiado baja (${muestra.altoContenidoPx}px): pantalla vacía.`,
    }
  }
  return { blanca: false }
}

// Expuesto para los tests y para el mensaje de diagnóstico del harness.
export const UMBRALES_PANTALLA = {
  MIN_TEXTO_UTIL,
  MIN_NODOS_ROOT,
  MIN_ALTO_CONTENIDO_PX,
} as const
