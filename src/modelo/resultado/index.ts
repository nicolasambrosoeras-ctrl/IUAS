// Contrato de salida del motor (Arquitectura Sec.10.1, Sec.12.2).
// Solo definiciones de forma, sin logica (regla de organizacion de modelo/).

// D25: un calculo que no puede resolverse devuelve este estado en vez
// de propagar NaN o infinito. El caso canonico es Kc = 1/raiz(n-1) con n=1.
export interface Indeterminado {
  readonly estado: 'indeterminado'
  readonly motivo: string
}

export interface ValorConUnidad {
  readonly valor: number
  readonly unidad: string
}

export type ValorCalculado = ValorConUnidad | Indeterminado

export interface EntradaDePaso {
  readonly simbolo: string
  readonly valor: number
  readonly unidad: string
  readonly procedencia: string
}

// La salida de un paso reutiliza ValorCalculado: un paso individual
// puede resultar indeterminado (D25) igual que un resultado final.
// No usar "number" suelto aca evita reintroducir NaN en la traza.
export interface SalidaDePaso {
  readonly simbolo: string
  readonly resultado: ValorCalculado
}

// Cada operacion del motor deposita uno de estos en la traza (ADR-005).
// Datos, no texto formateado: el paso lleva 0.5774, no "Kc = 0,58".
export interface Paso {
  readonly id: string
  readonly titulo: string
  readonly formulaId: string
  readonly entradas: readonly EntradaDePaso[]
  readonly salida: SalidaDePaso
  readonly criterioId?: string
  readonly referencias: readonly string[]
  readonly nota?: string
}

export type EstadoVerificacion = 'conforme' | 'no_conforme'

// El motor nunca bloquea (ADR-011): calcula, marca y explica.
export interface Verificacion {
  readonly id: string
  readonly concepto: string
  readonly valorObtenido: ValorConUnidad
  readonly valorLimite: ValorConUnidad
  readonly estado: EstadoVerificacion
  readonly referenciaNormativa: string
}

export interface Advertencia {
  readonly id: string
  readonly mensaje: string
  readonly referenciaNormativa?: string
}

// C-12: toda memoria declara version de catalogo normativo y de app.
export interface MetadatosDeCalculo {
  readonly versionApp: string
  readonly versionNormativa: string
  readonly moduloId: string
}

export interface ResultadoDeCalculo {
  readonly resultados: Readonly<Record<string, ValorCalculado>>
  readonly pasos: readonly Paso[]
  readonly verificaciones: readonly Verificacion[]
  readonly advertencias: readonly Advertencia[]
  readonly referencias: readonly string[]
  readonly metadatos: MetadatosDeCalculo
}
