// M3-B2a — Selección pura del MEDIDOR INDIVIDUAL por UNIDAD FUNCIONAL,
// sobre un ALCANCE DECLARADO.
//
// Este motor NO autodetecta cuántos medidores individuales necesita el
// proyecto ni dónde van (eso es M3-B2b, después de reconstruir las figuras
// de micro-medición 2.2–2.7). Recibe el alcance de UN medidor ya declarado
// por el llamador: la unidad funcional, el servicio medido (ramal de agua
// fría o de agua caliente — §2.6: "la medición en todos los ramales de
// agua fría y caliente que abastezcan a cada unidad funcional") y la lista
// de consumos que ese medidor debe poder abastecer, con su `qu` efectivo
// YA resuelto para ese servicio.
//
// Caudal de diseño — simultaneidad total (K=1), CRIT-A33 / §2.6:
//
//   Qunit = Σ (cantidad · qu efectivo)   sobre los consumos del alcance
//
// SIN aplicar Kc, K ni el coeficiente de mayoración `a`. §2.6 es la regla
// específica y explícita del dimensionamiento del medidor individual
// ("bajo el criterio de simultaneidad total de los consumos … garantizar
// el registro de los caudales reales máximos"); prevalece sobre la
// remisión genérica de §2.12.1.e a §2.9 y siguientes (contradicción
// interna de la Guía, documentada — ver CRIT-A33 y
// `PENDIENTES-DE-ARQUITECTURA.md`).
//
// El MISMO Qunit alimenta la selección por Tabla N°6 y el `Qcl` de la
// fórmula (6) — no se adopta una solución híbrida (un caudal para
// seleccionar, otro para la pérdida) por falta de evidencia oficial que la
// respalde.
//
// Semántica AF/AC — responsabilidad del llamador (CRIT-A33): `qu_lps` de
// cada consumo debe venir ya resuelto para `servicioMedido` con la
// maquinaria cerrada del modelo (`resolverQuEfectivoParaTramo`, que aplica
// CRIT-A15: artefacto conectado a una sola red → esa cañería lleva
// `quTotal`; mezcla → `quFria`/`quCaliente` que suman el total, sin doble
// conteo; paso por producción ACS contemplado). Este motor NO reinterpreta
// `qu` ni parte `quTotal` en fracciones: suma lo que recibe.
//
// M3 sigue separado de `RedHidraulica` (decisión roja 1, alternativa 4):
// el resultado es un dato de borde para la capa de presión de M2. La
// cardinalidad de medidores por UF NO se fija acá.
import {
  resolverSeleccionYPerdidaDeMedidor,
  type NucleoSeleccionDeMedidor,
} from './resolverSeleccionYPerdidaDeMedidor'

export type ServicioMedido = 'aguaFria' | 'aguaCaliente'

// Un consumo del alcance del medidor: `qu_lps` es el caudal efectivo ya
// resuelto para el servicio medido (ver nota de archivo). `cantidad` es la
// multiplicidad de ese consumo (mismo rol que en la agregación de
// tuberías: `Qunit = Σ cantidad · qu`).
export type ConsumoDeAlcance = {
  readonly etiqueta: string
  readonly cantidad: number
  readonly qu_lps: number
}

export type AlcanceMedidorIndividual = {
  readonly unidadFuncionalId: string
  readonly servicioMedido: ServicioMedido
  readonly consumos: readonly ConsumoDeAlcance[]
}

type DatosDeAlcance = {
  readonly ambito: 'individual'
  readonly unidadFuncionalId: string
  readonly servicioMedido: ServicioMedido
  // Suma de `cantidad` de todos los consumos del alcance (mismo `n` que la
  // agregación de tuberías).
  readonly nConsumos: number
  // Σ (cantidad · qu efectivo). Para 'seleccionado'/'fueraDeTabla06'
  // coincide con `qcDiseno_lps` del núcleo — se expone aparte con nombre
  // propio para la memoria de cálculo.
  readonly qunitTotal_lps: number
}

export type ResultadoSeleccionMedidorIndividual =
  | ({ readonly tipo: 'seleccionado' } & DatosDeAlcance &
      Extract<NucleoSeleccionDeMedidor, { tipo: 'seleccionado' }>)
  | ({ readonly tipo: 'fueraDeTabla06' } & DatosDeAlcance &
      Extract<NucleoSeleccionDeMedidor, { tipo: 'fueraDeTabla06' }>)
  | ({
      // El alcance declarado no tiene ningún consumo con caudal (`consumos`
      // vacío o todos con `qu_lps` 0 — p. ej. CRIT-A7). No es un error de
      // uso: es un medidor sin demanda que asignarle. Mismo criterio que
      // `resolverHidraulicaDeTramo` → 'sinDemanda'.
      readonly tipo: 'sinConsumo'
    } & DatosDeAlcance)

export function seleccionarMedidorIndividual(
  alcance: AlcanceMedidorIndividual,
): ResultadoSeleccionMedidorIndividual {
  alcance.consumos.forEach((consumo) => {
    if (!Number.isInteger(consumo.cantidad) || consumo.cantidad <= 0) {
      throw new Error(
        `seleccionarMedidorIndividual: el consumo "${consumo.etiqueta}" tiene cantidad inválida ` +
          `(debe ser entero > 0, recibido: ${consumo.cantidad})`,
      )
    }
    if (!Number.isFinite(consumo.qu_lps) || consumo.qu_lps < 0) {
      throw new Error(
        `seleccionarMedidorIndividual: el consumo "${consumo.etiqueta}" tiene qu_lps inválido ` +
          `(debe ser un número >= 0, recibido: ${consumo.qu_lps})`,
      )
    }
  })

  const nConsumos = alcance.consumos.reduce((total, consumo) => total + consumo.cantidad, 0)
  // Simultaneidad total: K=1. Es exactamente Σ cantidad·qu, sin Kc/K/a.
  const qunitTotal_lps = alcance.consumos.reduce(
    (total, consumo) => total + consumo.cantidad * consumo.qu_lps,
    0,
  )

  const datosDeAlcance: DatosDeAlcance = {
    ambito: 'individual',
    unidadFuncionalId: alcance.unidadFuncionalId,
    servicioMedido: alcance.servicioMedido,
    nConsumos,
    qunitTotal_lps,
  }

  if (qunitTotal_lps <= 0) {
    return { tipo: 'sinConsumo', ...datosDeAlcance }
  }

  const nucleo = resolverSeleccionYPerdidaDeMedidor(qunitTotal_lps)
  return { ...datosDeAlcance, ...nucleo }
}
