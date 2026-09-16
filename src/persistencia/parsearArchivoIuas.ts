// Parser/validador puro de un archivo .iuas (PERSIST-01, §18-§23). Recibe
// el TEXTO crudo (JSON) de un archivo, y devuelve o bien un Proyecto
// válido, o bien un error tipado/humanizable -- nunca lanza, nunca toca
// `localStorage` ni React, nunca reemplaza ningún estado. Aplicar el
// resultado (reemplazar el proyecto activo) es responsabilidad del
// llamador (§18: separar PARSE/VALIDACIÓN de APLICACIÓN).
//
// Un JSON sintácticamente correcto no es necesariamente un proyecto
// válido (§19): se valida en capas, de la más externa (envelope) a la
// más interna (forma del Proyecto, reutilizando la migración/validación
// de schemaVersion que ya existía en modelo/proyecto/migraciones -- no se
// duplica esa lógica).
import type { Proyecto } from '../modelo/proyecto';
import { leerProyecto, type ErrorLecturaProyecto } from '../modelo/proyecto/migraciones';
import { SCHEMA_VERSION_ARCHIVO_ACTUAL, type ArchivoIuas } from './formatoIuas';

export type ErrorParseoIuas =
  | { readonly codigo: 'jsonInvalido' }
  | { readonly codigo: 'formatoNoIuas' }
  | { readonly codigo: 'schemaArchivoAusente' }
  | { readonly codigo: 'schemaArchivoFuturo'; readonly version: number }
  | { readonly codigo: 'schemaArchivoNoReconocido'; readonly version: number }
  | { readonly codigo: 'estructuraInvalida' }
  | { readonly codigo: 'proyectoInvalido'; readonly error: ErrorLecturaProyecto };

export type ResultadoParseoIuas =
  | { readonly exito: true; readonly proyecto: Proyecto; readonly archivo: ArchivoIuas }
  | { readonly exito: false; readonly error: ErrorParseoIuas };

function esRecordNoNulo(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null;
}

function tieneEstructuraMinimaDeProyecto(proyecto: Proyecto): boolean {
  return (
    esRecordNoNulo(proyecto.metadatos) &&
    esRecordNoNulo(proyecto.parametros) &&
    Array.isArray(proyecto.unidadesFuncionales) &&
    esRecordNoNulo(proyecto.configuracionHidraulica)
  );
}

export function parsearArchivoIuas(textoJson: string): ResultadoParseoIuas {
  let datosCrudos: unknown;
  try {
    datosCrudos = JSON.parse(textoJson);
  } catch {
    return { exito: false, error: { codigo: 'jsonInvalido' } };
  }

  if (!esRecordNoNulo(datosCrudos) || datosCrudos['format'] !== 'IUAS') {
    return { exito: false, error: { codigo: 'formatoNoIuas' } };
  }

  const schemaVersion = datosCrudos['schemaVersion'];
  if (typeof schemaVersion !== 'number') {
    return { exito: false, error: { codigo: 'schemaArchivoAusente' } };
  }
  if (schemaVersion > SCHEMA_VERSION_ARCHIVO_ACTUAL) {
    return { exito: false, error: { codigo: 'schemaArchivoFuturo', version: schemaVersion } };
  }
  // Este es el primer schemaVersion de archivo (=1): hoy no existen
  // versiones anteriores reales que migrar (§21). Si en el futuro se
  // agrega una v2, acá va la misma clase de tabla de migraciones que ya
  // usa modelo/proyecto/migraciones (desde -> aplicar), en vez de
  // rechazar directamente.
  if (schemaVersion < SCHEMA_VERSION_ARCHIVO_ACTUAL) {
    return { exito: false, error: { codigo: 'schemaArchivoNoReconocido', version: schemaVersion } };
  }

  const appVersion = datosCrudos['appVersion'];
  const proyectoCrudo = datosCrudos['proyecto'];
  if (typeof appVersion !== 'string' || !esRecordNoNulo(proyectoCrudo)) {
    return { exito: false, error: { codigo: 'estructuraInvalida' } };
  }

  const resultadoProyecto = leerProyecto(proyectoCrudo);
  if (!resultadoProyecto.exito) {
    return { exito: false, error: { codigo: 'proyectoInvalido', error: resultadoProyecto.error } };
  }

  const proyecto = resultadoProyecto.proyecto;
  if (!tieneEstructuraMinimaDeProyecto(proyecto)) {
    return { exito: false, error: { codigo: 'estructuraInvalida' } };
  }

  const exportedAtCrudo = datosCrudos['exportedAt'];
  return {
    exito: true,
    proyecto,
    archivo: {
      format: 'IUAS',
      schemaVersion,
      appVersion,
      exportedAt: typeof exportedAtCrudo === 'string' ? exportedAtCrudo : '',
      proyecto,
    },
  };
}

export function mensajeHumanoDeErrorIuas(error: ErrorParseoIuas): string {
  switch (error.codigo) {
    case 'jsonInvalido':
    case 'formatoNoIuas':
    case 'estructuraInvalida':
      return 'El archivo seleccionado no es un archivo de proyecto válido.';
    case 'schemaArchivoAusente':
      return 'El archivo no indica una versión de formato reconocible.';
    case 'schemaArchivoFuturo':
      return 'Este archivo fue creado con una versión más nueva de la aplicación y no puede abrirse con esta versión.';
    case 'schemaArchivoNoReconocido':
      return 'Este archivo usa una versión de formato que esta versión de la aplicación no reconoce.';
    case 'proyectoInvalido':
      return mensajeHumanoDeErrorDeProyecto(error.error);
  }
}

function mensajeHumanoDeErrorDeProyecto(error: ErrorLecturaProyecto): string {
  switch (error.codigo) {
    case 'formatoInvalido':
      return 'El archivo seleccionado no es un archivo de proyecto válido.';
    case 'schemaVersionAusente':
      return 'El archivo no indica la versión del proyecto.';
    case 'schemaVersionNoReconocida':
      return 'Este archivo usa una versión de proyecto que esta versión de la aplicación no puede migrar.';
    case 'schemaVersionPosterior':
      return 'Este archivo fue creado con una versión más nueva de la aplicación y no puede abrirse con esta versión.';
  }
}
