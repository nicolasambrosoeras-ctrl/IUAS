// HYD-ACQUA-K-CATALOG-01: transcripción LITERAL de la tabla "Coeficiente
// de resistencia de carga para accesorios Acqua System®" del Manual
// Técnico Acqua System (Grupo Dema), página impresa 34. Fuente:
// https://www.grupodema.com.ar/bundles/app/front/images/Manual-Acqua-System-03-03-2026.pdf
//
// Extraída del texto real del PDF (pdfjs-dist, no asumida ni copiada de
// una fuente secundaria) y verificada contra el ejemplo numérico resuelto
// de la página 33 del mismo manual: "10 uniones normales · 0,25 = 2,50" +
// "10 codos a 90º · 2 = 20" -- confirma que el ítem 1 es "Unión normal"
// (R=0,25) y el ítem 3 es "Codo a 90º" (R=2,00), fijando la
// correspondencia número↔nombre↔valor de toda la tabla.
//
// Dato puro, sin lógica de dominio ni de resolución de catálogo (ese rol
// lo cumple catalogoKAccesoriosAcquaSystem.ts, que referencia estas filas
// por `numero`). Los 16 valores no varían por DN en la tabla del
// fabricante -- a diferencia de ERAS-2023, que tampoco los varía por DN,
// esto no es una simplificación de este slice, es el dato oficial.
export type NumeroFilaOficialAcquaSystem =
  | '1' | '2' | '2a' | '3' | '4'
  | '5' | '5a' | '6' | '6a' | '7' | '7a' | '8' | '8a'
  | '9' | '10' | '11'

export type FilaOficialAcquaSystem = {
  readonly numero: NumeroFilaOficialAcquaSystem
  readonly nombreFabricante: string
  readonly r: number
}

export const FUENTE_MANUAL_ACQUA_SYSTEM =
  'Manual Técnico Acqua System (Grupo Dema), pág. 34: "Coeficiente de resistencia de carga para accesorios Acqua System®" -- ' +
  'https://www.grupodema.com.ar/bundles/app/front/images/Manual-Acqua-System-03-03-2026.pdf'

export const tablaOficialAcquaSystem: readonly FilaOficialAcquaSystem[] = [
  { numero: '1', nombreFabricante: 'Unión normal', r: 0.25 },
  { numero: '2', nombreFabricante: 'Buje de reducción de diámetros inmediatos', r: 0.55 },
  { numero: '2a', nombreFabricante: 'Buje de reducción de diámetros mediatos', r: 0.85 },
  { numero: '3', nombreFabricante: 'Codo a 90°', r: 2.0 },
  { numero: '4', nombreFabricante: 'Codo a 45°', r: 0.6 },
  { numero: '5', nombreFabricante: 'Tee normal: entrada por extremo y salidas por continuación y ramal', r: 1.8 },
  { numero: '5a', nombreFabricante: 'Tee reducida: entrada por extremo y salidas por continuación y ramal', r: 3.6 },
  { numero: '6', nombreFabricante: 'Tee normal: entradas por extremo y ramal; salida por el otro extremo', r: 1.3 },
  { numero: '6a', nombreFabricante: 'Tee reducida: entradas por extremo y ramal; salida por el otro extremo', r: 2.6 },
  { numero: '7', nombreFabricante: 'Tee normal: entradas por ambos extremos; salida por el ramal', r: 4.2 },
  { numero: '7a', nombreFabricante: 'Tee reducida: entradas por ambos extremos; salida por el ramal', r: 9.0 },
  { numero: '8', nombreFabricante: 'Tee normal: entrada por el ramal; salidas por ambos extremos', r: 2.2 },
  { numero: '8a', nombreFabricante: 'Tee reducida: entrada por el ramal; salidas por ambos extremos', r: 5.0 },
  { numero: '9', nombreFabricante: 'Tee con rosca central metálica', r: 0.8 },
  { numero: '10', nombreFabricante: 'Tubo macho o tubo hembra', r: 0.4 },
  { numero: '11', nombreFabricante: 'Codo con rosca metálica', r: 2.2 },
] as const

export function obtenerFilaOficialAcquaSystem(numero: NumeroFilaOficialAcquaSystem): FilaOficialAcquaSystem {
  const fila = tablaOficialAcquaSystem.find((candidata) => candidata.numero === numero)
  if (fila === undefined) {
    throw new Error(`obtenerFilaOficialAcquaSystem: no existe ninguna fila oficial con número "${numero}"`)
  }
  return fila
}
