// Migraciones del esquema del proyecto.
// La migración solo garantiza la forma de los datos; la validación semántica
// corresponde a la capa de validación.

import { SCHEMA_VERSION_ACTUAL, type Proyecto } from '..';

type VersionEsquema = string;

export type Migracion = {
  desde: VersionEsquema;
  hasta: VersionEsquema;
  aplicar: (datos: Readonly<Record<string, unknown>>) => Record<string, unknown>;
};

export const migraciones: readonly Migracion[] = [] as const;

export type ErrorLecturaProyecto =
  | { codigo: 'formatoInvalido'; detalle: string }
  | { codigo: 'schemaVersionAusente' }
  | { codigo: 'schemaVersionNoReconocida'; version: string }
  | { codigo: 'schemaVersionPosterior'; version: string; versionMaxima: VersionEsquema };

export type ResultadoLecturaProyecto =
  | { exito: true; proyecto: Proyecto; migradoDesde: VersionEsquema | null }
  | { exito: false; error: ErrorLecturaProyecto };

function compararVersiones(a: VersionEsquema, b: VersionEsquema): -1 | 0 | 1 {
  const partesA = a.split('.').map(Number);
  const partesB = b.split('.').map(Number);
  for (let i = 0; i < Math.max(partesA.length, partesB.length); i++) {
    const numA = partesA[i] ?? 0;
    const numB = partesB[i] ?? 0;
    if (numA < numB) return -1;
    if (numA > numB) return 1;
  }
  return 0;
}

function extraerSchemaVersion(datos: Readonly<Record<string, unknown>>): string | undefined {
  const metadatos = datos['metadatos'];
  if (typeof metadatos !== 'object' || metadatos === null) return undefined;
  const version = (metadatos as Record<string, unknown>)['schemaVersion'];
  return typeof version === 'string' ? version : undefined;
}

export function leerProyecto(datosCrudos: unknown): ResultadoLecturaProyecto {
  if (typeof datosCrudos !== 'object' || datosCrudos === null) {
    return {
      exito: false,
      error: { codigo: 'formatoInvalido', detalle: 'El archivo no contiene un objeto JSON.' },
    };
  }

  let datos = datosCrudos as Record<string, unknown>;
  const versionOriginal = extraerSchemaVersion(datos);

  if (versionOriginal === undefined) {
    return { exito: false, error: { codigo: 'schemaVersionAusente' } };
  }

  if (compararVersiones(versionOriginal, SCHEMA_VERSION_ACTUAL) === 1) {
    return {
      exito: false,
      error: {
        codigo: 'schemaVersionPosterior',
        version: versionOriginal,
        versionMaxima: SCHEMA_VERSION_ACTUAL,
      },
    };
  }

  let versionActual = versionOriginal;
  while (compararVersiones(versionActual, SCHEMA_VERSION_ACTUAL) === -1) {
    const siguiente = migraciones.find((m) => m.desde === versionActual);
    if (siguiente === undefined) {
      return {
        exito: false,
        error: { codigo: 'schemaVersionNoReconocida', version: versionActual },
      };
    }
    datos = siguiente.aplicar(datos);
    versionActual = siguiente.hasta;
  }

  return {
    exito: true,
    proyecto: datos as unknown as Proyecto,
    migradoDesde: versionOriginal === SCHEMA_VERSION_ACTUAL ? null : versionOriginal,
  };
}
