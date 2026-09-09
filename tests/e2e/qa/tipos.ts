// Tipos compartidos del harness QA-FUZZ-01. Modulo PURO (sin Playwright):
// lo importan tanto los specs E2E como los tests unitarios en Vitest.

// --- Acciones -----------------------------------------------------------

// Modulo funcional al que pertenece una accion (para pesos y reporte).
export type ModuloQa = 'M1' | 'M2' | 'M3' | 'M4' | 'GLOBAL'

// Representacion SERIALIZABLE y HUMANA de una accion ejecutada (brief §6).
// `tipo` identifica la accion; `valor` y `detalle` capturan la eleccion
// concreta que hizo el PRNG, de modo que el replay no dependa de volver a
// sortear nada.
export type AccionRegistrada = {
  readonly tipo: string
  readonly modulo: ModuloQa
  readonly valor?: string | number | boolean | undefined
  readonly detalle?: string | undefined
}

// Linea de log legible: "step 7: ACS=central  [M3]".
export function describirAccion(accion: AccionRegistrada): string {
  const valor =
    accion.valor === undefined ? '' : `=${typeof accion.valor === 'string' ? accion.valor : String(accion.valor)}`
  const detalle = accion.detalle ? ` (${accion.detalle})` : ''
  return `${accion.tipo}${valor}${detalle}  [${accion.modulo}]`
}

// --- Invariantes ------------------------------------------------------------

export type ClaseDeFallo = 'APP' | 'HARNESS' | 'NETWORK'

export type ResultadoInvariante = {
  readonly nombre: string
  readonly ok: boolean
  readonly clase: ClaseDeFallo
  readonly detalle?: string | undefined
}

// --- Errores capturados --------------------------------------------------

export type ErrorDeConsola = { readonly texto: string; readonly ubicacion?: string | undefined }
export type ErrorDePagina = { readonly mensaje: string; readonly stack?: string | undefined }
export type PedidoFallido = { readonly url: string; readonly metodo: string; readonly falla: string; readonly esencial: boolean }

// --- Registro y fallo --------------------------------------------------------

export type Viewport = { readonly width: number; readonly height: number }

export type RegistroDePaso = {
  readonly step: number
  readonly accion: AccionRegistrada
  readonly invariantesOk: boolean
  readonly violaciones: readonly ResultadoInvariante[]
}

export type InfoDeFallo = {
  readonly seed: string
  readonly run: number
  readonly step: number
  readonly action: AccionRegistrada | null
  readonly actionsCompleted: readonly AccionRegistrada[]
  readonly baseURL: string
  readonly viewport: Viewport
  readonly currentURL: string
  readonly errorType: string
  readonly clase: ClaseDeFallo
  readonly message: string
  readonly timestamp: string
  readonly consola?: readonly ErrorDeConsola[] | undefined
  readonly pageerror?: readonly ErrorDePagina[] | undefined
  readonly requestfailed?: readonly PedidoFallido[] | undefined
  readonly ultimoTextoRelevante?: string | undefined
}

// --- Catalogo (reporte de conectividad, brief §19/§42) --------------------

export type FilaDeCatalogo = {
  readonly artefactoId: string
  readonly nombre: string
  readonly regimen: string
  readonly preguntaConectividad: boolean
  readonly afSafe: boolean | null
  readonly acSafe: boolean | null
  readonly afAcSafe: boolean | null
  readonly error: string | null
}
