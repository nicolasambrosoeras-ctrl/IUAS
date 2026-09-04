// Tabla N°7 — Coeficientes Ks de pérdida de carga localizada por accesorio
// (ERAS-2023 §2.12.1, usados en Js = Ks·V²/2g). Datos puros, sin lógica de
// ejecución -- mismo criterio que tabla-01-gastos-conexion. No define
// dónde ni cuántos accesorios de cada tipo existen en una instalación
// real; eso es un modelo de dominio todavía sin decidir (M2-C/D-δ.33).

export type IdAccesorioTabla07 =
  | 'griferias'
  | 'curva45'
  | 'curva90'
  | 'codo90'
  | 'teePasoRecto'
  | 'teeSalidaLateral'
  | 'teeEntradaCentralSalidasLaterales'
  | 'llaveDePaso'
  | 'uniones'
  | 'valvulaEsclusa'
  | 'reducciones'
  | 'tuboSaliente';

export type FilaTabla07 = {
  readonly id: IdAccesorioTabla07;
  readonly nombre: string;
  readonly ks: number;
};

export const tabla07PerdidasLocalizadas: readonly FilaTabla07[] = [
  { id: 'griferias', nombre: 'Griferías', ks: 9.18 },
  { id: 'curva45', nombre: 'Curva a 45º', ks: 0.43 },
  { id: 'curva90', nombre: 'Curva a 90º', ks: 0.81 },
  { id: 'codo90', nombre: 'Codo a 90º', ks: 1.35 },
  { id: 'teePasoRecto', nombre: 'Tee paso recto', ks: 1.0 },
  { id: 'teeSalidaLateral', nombre: 'Tee salida lateral', ks: 1.62 },
  { id: 'teeEntradaCentralSalidasLaterales', nombre: 'Tee entrada central, salidas laterales', ks: 3.0 },
  { id: 'llaveDePaso', nombre: 'Llave de paso', ks: 9.18 },
  { id: 'uniones', nombre: 'Uniones', ks: 0.1 },
  { id: 'valvulaEsclusa', nombre: 'Válvula esclusa', ks: 0.17 },
  { id: 'reducciones', nombre: 'Reducciones', ks: 0.75 },
  { id: 'tuboSaliente', nombre: 'Tubo saliente', ks: 1.0 },
] as const;

export function obtenerKsDeAccesorio(id: IdAccesorioTabla07): number {
  const fila = tabla07PerdidasLocalizadas.find((candidata) => candidata.id === id);

  // Precondicion imposible si el llamador usa IdAccesorioTabla07 (union
  // cerrada, ya angostada por TypeScript): mismo criterio "precondicion
  // imposible" que el resto del proyecto -- throw explicito, nunca 0.
  if (fila === undefined) {
    throw new Error(`obtenerKsDeAccesorio: no existe ningún accesorio con id "${id}" en Tabla N°7`);
  }

  return fila.ks;
}
