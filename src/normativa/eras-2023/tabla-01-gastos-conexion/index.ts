// Tabla N°1 (ERAS-2023 §2.7 "GASTOS") — "Gasto en lts/seg correspondiente a
// los distintos diámetros nominales de conexiones y cañerías de agua
// directa". Datos puros + la búsqueda tabular literal de §2.7 (misma
// política que tabla-06-medidores y tabla-07-perdidas-localizadas: el
// resolver vive junto a la tabla y no hace más que lo que el texto
// autoriza).
//
// Notas oficiales de §2.7 (verbatim, verificadas contra el texto de la
// Resolución 641/2023 en argentina.gob.ar):
//  - "Los valores de gasto son interpolables linealmente entre dos
//    consecutivos de altura en metros." -> interpolación lineal SÓLO en la
//    presión; nunca entre diámetros (el DN es una clave discreta).
//  - "Se adopta como diámetro mínimo de conexión a proveer de 0.019m"
//    (diametroMinimoConexion_m; aplica a CONEXIONES, no a "cañerías de
//    agua directa", que es el otro alcance de la misma tabla -> la fila
//    DN13 sigue siendo válida para el resolver genérico).
//  - "Los diámetros nominales corresponden a materiales metálicos [...]
//    Para el caso de empleo de materiales plásticos, los diámetros
//    nominales adoptados [...] garanticen un diámetro interior real mayor
//    o igual al diámetro nominal de la tabla" (notaDiametrosMetalicos;
//    criterio de compatibilidad física, no se resuelve en este módulo).
//  - Sin autorización textual para EXTRAPOLAR fuera del rango tabulado de
//    presión -> fuera de [4, 35] m el resolver devuelve
//    'fueraDeRangoDePresion', nunca un clamp ni una extrapolación.
//
// La presión que consume este resolver es la PRESIÓN DE CÁLCULO en el
// punto relevante (`presionCalculo_m`), que NO es en general la presión
// sobre el nivel de acera: §2.7 exige ajustarla por el desnivel hasta el
// punto alimentado (se resta el ascenso, se suma el descenso). Esa
// transformación NO vive acá (ver D-δ.64 / CRIT-A36); este módulo sólo
// hace la búsqueda tabular.

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

// --- M4-D1 (D-δ.64 / CRIT-A36): resolver puro de gasto de Tabla N°1 ---

// Diámetros nominales (m) tabulados, en orden ascendente, con la clave de
// columna de FilaTablaGastos correspondiente. El DN es una CLAVE DISCRETA:
// sólo se aceptan estos valores exactos, nunca se interpola entre ellos.
export const columnasDeDiametroTabla01: readonly {
  readonly diametroNominal_m: number;
  readonly clave: Exclude<keyof FilaTablaGastos, 'presionDisponible_m'>;
}[] = [
  { diametroNominal_m: 0.013, clave: 'gasto_0013m_lps' },
  { diametroNominal_m: 0.019, clave: 'gasto_0019m_lps' },
  { diametroNominal_m: 0.025, clave: 'gasto_0025m_lps' },
  { diametroNominal_m: 0.032, clave: 'gasto_0032m_lps' },
  { diametroNominal_m: 0.038, clave: 'gasto_0038m_lps' },
  { diametroNominal_m: 0.05, clave: 'gasto_0050m_lps' },
  { diametroNominal_m: 0.06, clave: 'gasto_0060m_lps' },
  { diametroNominal_m: 0.075, clave: 'gasto_0075m_lps' },
] as const;

export const diametrosNominalesTabla01_m: readonly number[] = columnasDeDiametroTabla01.map(
  (columna) => columna.diametroNominal_m,
);

// Tolerancia para reconocer un diámetro nominal recibido como una de las
// columnas discretas de la tabla, absorbiendo ruido IEEE-754 (p. ej. un
// llamador que calcule 19 / 1000). 1e-6 m = 1 µm: irrelevante frente al
// menor salto real entre columnas (6 mm).
const TOLERANCIA_DIAMETRO_m = 1e-6;

export type InterpolacionTabla01 =
  | { readonly aplicada: false; readonly presionTabulada_m: number }
  | {
      readonly aplicada: true;
      readonly presionInferior_m: number;
      readonly presionSuperior_m: number;
      readonly gastoInferior_lps: number;
      readonly gastoSuperior_lps: number;
    };

export type ResultadoGastoTabla01 =
  | {
      readonly estado: 'resuelto';
      readonly diametroNominal_m: number;
      readonly presionCalculo_m: number;
      readonly qConexion_lps: number;
      readonly interpolacion: InterpolacionTabla01;
    }
  | {
      readonly estado: 'fueraDeRangoDePresion';
      readonly diametroNominal_m: number;
      readonly presionCalculo_m: number;
      readonly rango_m: typeof rangoPresionValida_m;
    }
  | {
      readonly estado: 'diametroNoTabulado';
      readonly diametroNominal_m: number;
      readonly diametrosTabulados_m: readonly number[];
    };

// Búsqueda tabular literal de §2.7. `presionCalculo_m` es la presión de
// cálculo en el punto relevante (NO necesariamente la presión sobre acera
// -- ver el encabezado del archivo). Interpola linealmente sólo en la
// presión; nunca entre diámetros. Nunca extrapola: fuera de [4, 35] m
// devuelve 'fueraDeRangoDePresion' (que NO significa "proyecto inválido",
// sólo "la Tabla N°1 no determina el gasto con ese input"). Un
// `diametroNominal_m` que no sea una de las 8 columnas devuelve
// 'diametroNoTabulado'. Los inputs no finitos son un error de
// programación (throw), no un estado de dominio.
export function resolverGastoTabla01(entrada: {
  readonly diametroNominal_m: number;
  readonly presionCalculo_m: number;
}): ResultadoGastoTabla01 {
  const { diametroNominal_m, presionCalculo_m } = entrada;

  if (!Number.isFinite(diametroNominal_m)) {
    throw new Error(
      `resolverGastoTabla01: diametroNominal_m debe ser un número finito (recibido: ${diametroNominal_m})`,
    );
  }
  if (!Number.isFinite(presionCalculo_m)) {
    throw new Error(
      `resolverGastoTabla01: presionCalculo_m debe ser un número finito (recibido: ${presionCalculo_m})`,
    );
  }

  const columna = columnasDeDiametroTabla01.find(
    (candidata) => Math.abs(candidata.diametroNominal_m - diametroNominal_m) <= TOLERANCIA_DIAMETRO_m,
  );
  if (columna === undefined) {
    return { estado: 'diametroNoTabulado', diametroNominal_m, diametrosTabulados_m: diametrosNominalesTabla01_m };
  }

  if (presionCalculo_m < rangoPresionValida_m.min || presionCalculo_m > rangoPresionValida_m.max) {
    return { estado: 'fueraDeRangoDePresion', diametroNominal_m, presionCalculo_m, rango_m: rangoPresionValida_m };
  }

  const filaExacta = tablaGastosConexion.find((fila) => fila.presionDisponible_m === presionCalculo_m);
  if (filaExacta !== undefined) {
    return {
      estado: 'resuelto',
      diametroNominal_m,
      presionCalculo_m,
      qConexion_lps: filaExacta[columna.clave],
      interpolacion: { aplicada: false, presionTabulada_m: filaExacta.presionDisponible_m },
    };
  }

  // presionCalculo_m está estrictamente entre dos presiones tabuladas
  // consecutivas (ya se descartó fuera de rango y valor exacto).
  const inferior = [...tablaGastosConexion]
    .reverse()
    .find((fila) => fila.presionDisponible_m < presionCalculo_m);
  const superior = tablaGastosConexion.find((fila) => fila.presionDisponible_m > presionCalculo_m);
  if (inferior === undefined || superior === undefined) {
    throw new Error(
      `resolverGastoTabla01: inconsistencia interna -- presión ${presionCalculo_m} dentro de rango pero sin fila inferior/superior`,
    );
  }

  const gastoInferior_lps = inferior[columna.clave];
  const gastoSuperior_lps = superior[columna.clave];
  const fraccion =
    (presionCalculo_m - inferior.presionDisponible_m) /
    (superior.presionDisponible_m - inferior.presionDisponible_m);
  const qConexion_lps = gastoInferior_lps + (gastoSuperior_lps - gastoInferior_lps) * fraccion;

  return {
    estado: 'resuelto',
    diametroNominal_m,
    presionCalculo_m,
    qConexion_lps,
    interpolacion: {
      aplicada: true,
      presionInferior_m: inferior.presionDisponible_m,
      presionSuperior_m: superior.presionDisponible_m,
      gastoInferior_lps,
      gastoSuperior_lps,
    },
  };
}

// Predicado puro para el futuro orquestador de conexión: un diámetro sirve
// como CONEXIÓN si está tabulado en Tabla N°1 y es >= al mínimo de §2.7
// (0,019 m). NO elige un diámetro ni asume uno por defecto: la ausencia de
// diámetro declarado sigue siendo ausencia (la selección/persistencia del
// DN de conexión es un slice posterior).
export function esDiametroAdmisibleComoConexion(diametroNominal_m: number): boolean {
  if (!Number.isFinite(diametroNominal_m)) {
    return false;
  }
  const estaTabulado = columnasDeDiametroTabla01.some(
    (columna) => Math.abs(columna.diametroNominal_m - diametroNominal_m) <= TOLERANCIA_DIAMETRO_m,
  );
  return estaTabulado && diametroNominal_m >= diametroMinimoConexion_m - TOLERANCIA_DIAMETRO_m;
}
