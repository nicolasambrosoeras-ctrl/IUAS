// Memoria de proyecto: contenedor unificado de resultados de cálculo.
// No calcula; define la estructura que conecta el proyecto con los resultados
// de los módulos y los enlaces entre ellos.

import type { Proyecto } from '../proyecto';
import type { ResultadoDeCalculo, Verificacion } from '../resultado';

export type Enlace = {
  moduloOrigen: string;
  salida: string;
  moduloDestino: string;
  entrada: string;
};

export type MetadatosMemoria = {
  versionApp: string;
  versionNormativa: string;
  fecha: string;
};

export type MemoriaDeProyecto = {
  proyecto: Proyecto;
  metadatos: MetadatosMemoria;
  modulos: readonly ResultadoDeCalculo[];
  enlaces: readonly Enlace[];
  verificaciones: readonly Verificacion[];
  criteriosAplicados: readonly string[];
};
