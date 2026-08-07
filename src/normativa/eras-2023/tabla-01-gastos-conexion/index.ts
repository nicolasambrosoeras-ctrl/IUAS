// Tabla N°1 — Gasto en l/s por diámetro nominal y presión disponible.
// Datos puros, sin lógica de ejecución.

export type FilaTablaGastos = {
  presionDisponible_m: number;
  gasto_0013m_lps: number;
  gasto_0019m_lps: number;
  gasto_0025m_lps: number;
  gasto_0032m_lps: number;
  gasto_0038m_lps: number;
  gasto_0050m_lps: number;
  gasto_0060m_lps: number;
  gasto_0075m_lps: number;
};

export const reglaInterpolacion =
  'Interpolación lineal entre dos presiones consecutivas de la tabla. ERAS-2023 §2.7.' as const;

export const diametroMinimoConexion_m = 0.019 as const;

export const notaDiametrosMetalicos =
  'Los diámetros nominales corresponden a materiales metálicos; el diámetro real interior es siempre superior al nominal. ERAS-2023 §2.7.' as const;

export const rangoPresionValida_m = { min: 4, max: 35 } as const;

export const tablaGastosConexion: readonly FilaTablaGastos[] = [
  { presionDisponible_m: 4, gasto_0013m_lps: 0.24, gasto_0019m_lps: 0.52, gasto_0025m_lps: 1.06, gasto_0032m_lps: 1.80, gasto_0038m_lps: 2.84, gasto_0050m_lps: 5.08, gasto_0060m_lps: 7.85, gasto_0075m_lps: 10.39 },
  { presionDisponible_m: 5, gasto_0013m_lps: 0.28, gasto_0019m_lps: 0.60, gasto_0025m_lps: 1.18, gasto_0032m_lps: 2.012, gasto_0038m_lps: 3.19, gasto_0050m_lps: 5.70, gasto_0060m_lps: 8.81, gasto_0075m_lps: 11.65 },
  { presionDisponible_m: 6, gasto_0013m_lps: 0.33, gasto_0019m_lps: 0.66, gasto_0025m_lps: 1.30, gasto_0032m_lps: 2.22, gasto_0038m_lps: 3.51, gasto_0050m_lps: 6.26, gasto_0060m_lps: 9.68, gasto_0075m_lps: 12.81 },
  { presionDisponible_m: 7, gasto_0013m_lps: 0.35, gasto_0019m_lps: 0.72, gasto_0025m_lps: 1.41, gasto_0032m_lps: 2.40, gasto_0038m_lps: 3.79, gasto_0050m_lps: 6.77, gasto_0060m_lps: 10.46, gasto_0075m_lps: 13.85 },
  { presionDisponible_m: 8, gasto_0013m_lps: 0.37, gasto_0019m_lps: 0.75, gasto_0025m_lps: 1.48, gasto_0032m_lps: 2.53, gasto_0038m_lps: 4.00, gasto_0050m_lps: 7.13, gasto_0060m_lps: 11.03, gasto_0075m_lps: 14.60 },
  { presionDisponible_m: 9, gasto_0013m_lps: 0.40, gasto_0019m_lps: 0.78, gasto_0025m_lps: 1.56, gasto_0032m_lps: 2.67, gasto_0038m_lps: 4.22, gasto_0050m_lps: 7.46, gasto_0060m_lps: 11.64, gasto_0075m_lps: 15.41 },
  { presionDisponible_m: 10, gasto_0013m_lps: 0.42, gasto_0019m_lps: 0.81, gasto_0025m_lps: 1.63, gasto_0032m_lps: 2.79, gasto_0038m_lps: 4.41, gasto_0050m_lps: 7.87, gasto_0060m_lps: 12.15, gasto_0075m_lps: 16.10 },
  { presionDisponible_m: 11, gasto_0013m_lps: 0.44, gasto_0019m_lps: 0.84, gasto_0025m_lps: 1.69, gasto_0032m_lps: 2.91, gasto_0038m_lps: 4.60, gasto_0050m_lps: 8.21, gasto_0060m_lps: 12.69, gasto_0075m_lps: 16.79 },
  { presionDisponible_m: 12, gasto_0013m_lps: 0.46, gasto_0019m_lps: 0.87, gasto_0025m_lps: 1.75, gasto_0032m_lps: 3.03, gasto_0038m_lps: 4.79, gasto_0050m_lps: 8.54, gasto_0060m_lps: 13.21, gasto_0075m_lps: 17.48 },
  { presionDisponible_m: 13, gasto_0013m_lps: 0.48, gasto_0019m_lps: 0.90, gasto_0025m_lps: 1.81, gasto_0032m_lps: 3.15, gasto_0038m_lps: 4.98, gasto_0050m_lps: 8.88, gasto_0060m_lps: 13.73, gasto_0075m_lps: 18.17 },
  { presionDisponible_m: 14, gasto_0013m_lps: 0.49, gasto_0019m_lps: 0.93, gasto_0025m_lps: 1.87, gasto_0032m_lps: 3.24, gasto_0038m_lps: 5.12, gasto_0050m_lps: 9.14, gasto_0060m_lps: 14.13, gasto_0075m_lps: 18.69 },
  { presionDisponible_m: 15, gasto_0013m_lps: 0.51, gasto_0019m_lps: 0.96, gasto_0025m_lps: 1.92, gasto_0032m_lps: 3.32, gasto_0038m_lps: 5.25, gasto_0050m_lps: 9.36, gasto_0060m_lps: 14.47, gasto_0075m_lps: 19.16 },
  { presionDisponible_m: 16, gasto_0013m_lps: 0.52, gasto_0019m_lps: 0.99, gasto_0025m_lps: 1.97, gasto_0032m_lps: 3.40, gasto_0038m_lps: 5.37, gasto_0050m_lps: 9.59, gasto_0060m_lps: 14.82, gasto_0075m_lps: 19.62 },
  { presionDisponible_m: 17, gasto_0013m_lps: 0.54, gasto_0019m_lps: 1.02, gasto_0025m_lps: 2.02, gasto_0032m_lps: 3.49, gasto_0038m_lps: 5.51, gasto_0050m_lps: 9.84, gasto_0060m_lps: 15.22, gasto_0075m_lps: 20.14 },
  { presionDisponible_m: 18, gasto_0013m_lps: 0.55, gasto_0019m_lps: 1.05, gasto_0025m_lps: 2.08, gasto_0032m_lps: 3.57, gasto_0038m_lps: 5.64, gasto_0050m_lps: 10.07, gasto_0060m_lps: 15.56, gasto_0075m_lps: 20.60 },
  { presionDisponible_m: 19, gasto_0013m_lps: 0.57, gasto_0019m_lps: 1.08, gasto_0025m_lps: 2.13, gasto_0032m_lps: 3.65, gasto_0038m_lps: 5.77, gasto_0050m_lps: 10.29, gasto_0060m_lps: 15.91, gasto_0075m_lps: 21.06 },
  { presionDisponible_m: 20, gasto_0013m_lps: 0.58, gasto_0019m_lps: 1.11, gasto_0025m_lps: 2.18, gasto_0032m_lps: 3.73, gasto_0038m_lps: 5.89, gasto_0050m_lps: 10.52, gasto_0060m_lps: 16.26, gasto_0075m_lps: 21.52 },
  { presionDisponible_m: 21, gasto_0013m_lps: 0.60, gasto_0019m_lps: 1.14, gasto_0025m_lps: 2.23, gasto_0032m_lps: 3.82, gasto_0038m_lps: 6.04, gasto_0050m_lps: 10.77, gasto_0060m_lps: 16.65, gasto_0075m_lps: 22.04 },
  { presionDisponible_m: 22, gasto_0013m_lps: 0.61, gasto_0019m_lps: 1.17, gasto_0025m_lps: 2.29, gasto_0032m_lps: 3.90, gasto_0038m_lps: 6.16, gasto_0050m_lps: 11.00, gasto_0060m_lps: 17.00, gasto_0075m_lps: 22.50 },
  { presionDisponible_m: 23, gasto_0013m_lps: 0.62, gasto_0019m_lps: 1.19, gasto_0025m_lps: 2.33, gasto_0032m_lps: 3.97, gasto_0038m_lps: 6.27, gasto_0050m_lps: 11.19, gasto_0060m_lps: 17.31, gasto_0075m_lps: 22.91 },
  { presionDisponible_m: 24, gasto_0013m_lps: 0.63, gasto_0019m_lps: 1.21, gasto_0025m_lps: 2.38, gasto_0032m_lps: 4.05, gasto_0038m_lps: 6.40, gasto_0050m_lps: 11.42, gasto_0060m_lps: 17.66, gasto_0075m_lps: 23.37 },
  { presionDisponible_m: 25, gasto_0013m_lps: 0.64, gasto_0019m_lps: 1.22, gasto_0025m_lps: 2.42, gasto_0032m_lps: 4.12, gasto_0038m_lps: 6.51, gasto_0050m_lps: 11.62, gasto_0060m_lps: 17.96, gasto_0075m_lps: 23.77 },
  { presionDisponible_m: 26, gasto_0013m_lps: 0.65, gasto_0019m_lps: 1.24, gasto_0025m_lps: 2.47, gasto_0032m_lps: 4.20, gasto_0038m_lps: 6.64, gasto_0050m_lps: 11.84, gasto_0060m_lps: 18.31, gasto_0075m_lps: 24.23 },
  { presionDisponible_m: 27, gasto_0013m_lps: 0.67, gasto_0019m_lps: 1.26, gasto_0025m_lps: 2.51, gasto_0032m_lps: 4.27, gasto_0038m_lps: 6.75, gasto_0050m_lps: 12.04, gasto_0060m_lps: 18.62, gasto_0075m_lps: 24.64 },
  { presionDisponible_m: 28, gasto_0013m_lps: 0.68, gasto_0019m_lps: 1.28, gasto_0025m_lps: 2.55, gasto_0032m_lps: 4.35, gasto_0038m_lps: 6.87, gasto_0050m_lps: 12.27, gasto_0060m_lps: 18.97, gasto_0075m_lps: 25.10 },
  { presionDisponible_m: 29, gasto_0013m_lps: 0.69, gasto_0019m_lps: 1.30, gasto_0025m_lps: 2.59, gasto_0032m_lps: 4.42, gasto_0038m_lps: 6.98, gasto_0050m_lps: 12.46, gasto_0060m_lps: 19.27, gasto_0075m_lps: 25.50 },
  { presionDisponible_m: 30, gasto_0013m_lps: 0.70, gasto_0019m_lps: 1.32, gasto_0025m_lps: 2.62, gasto_0032m_lps: 4.50, gasto_0038m_lps: 7.11, gasto_0050m_lps: 12.69, gasto_0060m_lps: 19.62, gasto_0075m_lps: 25.96 },
  { presionDisponible_m: 31, gasto_0013m_lps: 0.71, gasto_0019m_lps: 1.34, gasto_0025m_lps: 2.66, gasto_0032m_lps: 4.57, gasto_0038m_lps: 7.22, gasto_0050m_lps: 12.89, gasto_0060m_lps: 19.92, gasto_0075m_lps: 26.37 },
  { presionDisponible_m: 32, gasto_0013m_lps: 0.72, gasto_0019m_lps: 1.36, gasto_0025m_lps: 2.70, gasto_0032m_lps: 4.65, gasto_0038m_lps: 7.35, gasto_0050m_lps: 13.11, gasto_0060m_lps: 20.27, gasto_0075m_lps: 26.83 },
  { presionDisponible_m: 33, gasto_0013m_lps: 0.73, gasto_0019m_lps: 1.37, gasto_0025m_lps: 2.74, gasto_0032m_lps: 4.72, gasto_0038m_lps: 7.46, gasto_0050m_lps: 13.31, gasto_0060m_lps: 20.58, gasto_0075m_lps: 27.23 },
  { presionDisponible_m: 34, gasto_0013m_lps: 0.74, gasto_0019m_lps: 1.39, gasto_0025m_lps: 2.77, gasto_0032m_lps: 4.80, gasto_0038m_lps: 7.58, gasto_0050m_lps: 13.54, gasto_0060m_lps: 20.93, gasto_0075m_lps: 27.70 },
  { presionDisponible_m: 35, gasto_0013m_lps: 0.76, gasto_0019m_lps: 1.41, gasto_0025m_lps: 2.81, gasto_0032m_lps: 4.87, gasto_0038m_lps: 7.69, gasto_0050m_lps: 13.73, gasto_0060m_lps: 21.23, gasto_0075m_lps: 28.10 },
] as const;
