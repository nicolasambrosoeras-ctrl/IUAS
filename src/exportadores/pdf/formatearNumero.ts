// Formateo de numeros para el PDF (Convenciones Sec.5). Vive en
// exportadores/pdf/ porque hoy es su unico consumidor real -- la
// interfaz en pantalla todavia no existe (es entregable de Fase 1).
// Si en Fase 1 la pantalla necesita el mismo formato, se decide la
// ubicacion definitiva en ese momento, con el segundo caso real en
// la mano (Convenciones Sec.2), no por anticipado.
// El motor no la conoce: entrega valores crudos, sin redondear (C-07).
const LOCALE = 'es-AR'

// Decimales declarados por unidad, en un solo lugar (Convenciones Sec.5).
// Se agrega una entrada nueva cuando aparece una magnitud nueva, no antes.
const DECIMALES_POR_UNIDAD: Readonly<Record<string, number>> = {
  adimensional: 2, // Kc, K, a -- Tabla N4 los presenta con 2 decimales (0,58)
  conteo: 0, // n -- cantidad discreta de artefactos, sin decimales
  'm/s': 1, // velocidad -- ejemplo de ADR-011 (2,8 m/s)
}

export function formatearNumero(valor: number, unidad: string): string {
  const decimales = DECIMALES_POR_UNIDAD[unidad]
  if (decimales === undefined) {
    // Defecto de programacion: una magnitud nueva sin decimales declarados.
    // No es un estado previsible del dominio (Convenciones Sec.8).
    throw new Error(`No hay cantidad de decimales declarada para la unidad "${unidad}"`)
  }
  return valor.toLocaleString(LOCALE, {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })
}
