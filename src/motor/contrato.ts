// Contrato generico de un modulo de calculo (Arquitectura Sec.10.1;
// Convenciones Sec.4, "Cada modulo de calculo expone una funcion
// principal con la misma forma"). No es una implementacion: es la
// forma que cada modulo de motor/ debe cumplir cuando exista.
// TEntrada y TNormativa se definen dentro de la carpeta de cada
// modulo (por ejemplo motor/demanda/) a partir de la Fase 1.
import type { ResultadoDeCalculo } from '../modelo/resultado'

export type FuncionDeCalculo<TEntrada, TNormativa> = (
  entrada: TEntrada,
  normativa: TNormativa,
) => ResultadoDeCalculo
