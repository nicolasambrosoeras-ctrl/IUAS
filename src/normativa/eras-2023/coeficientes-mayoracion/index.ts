// Coeficiente de mayoración "a" por tipología de proyecto.
// Datos puros, sin lógica de ejecución, salvo la derivación mínima de
// obtenerCoeficienteABase (lookup sobre esta misma tabla).
// TipoDeProyecto pertenece al modelo de dominio (modelo/proyecto), no a
// este paquete normativo: la dirección de dependencia es normativa -> modelo,
// nunca al revés (modelo/proyecto no debe conocer una versión normativa
// concreta como eras-2023).

import type { TipoDeProyecto } from '../../../modelo/proyecto';

export type { TipoDeProyecto };

export type TipoProyectoNormativo = {
  id: TipoDeProyecto;
  nombre: string;
  a: 1 | 2 | 3 | 4;
  referenciaArticulo: string;
};

export const coeficientesMayoracion: readonly TipoProyectoNormativo[] = [
  {
    id: 'oficinaPrivada',
    nombre: 'Oficina privada',
    a: 1,
    referenciaArticulo: 'ERAS-2023 §2.9.2.2',
  },
  {
    id: 'viviendaIndividual',
    nombre: 'Vivienda individual',
    a: 1,
    referenciaArticulo: 'ERAS-2023 §2.9.2.2',
  },
  {
    id: 'viviendaMultifamiliar',
    nombre: 'Vivienda multifamiliar',
    a: 2,
    referenciaArticulo: 'ERAS-2023 §2.9.2.2',
  },
  {
    id: 'oficinaPublica',
    nombre: 'Oficina pública',
    a: 2,
    referenciaArticulo: 'ERAS-2023 §2.9.2.2',
  },
  {
    id: 'centroEducativo',
    nombre: 'Centro educativo',
    a: 2,
    referenciaArticulo: 'ERAS-2023 §2.9.2.2',
  },
  {
    id: 'edificioPublico',
    nombre: 'Edificio público',
    a: 3,
    referenciaArticulo: 'ERAS-2023 §2.9.2.2',
  },
  {
    id: 'aeropuerto',
    nombre: 'Aeropuerto',
    a: 3,
    referenciaArticulo: 'ERAS-2023 §2.9.2.2',
  },
  {
    id: 'centroDeSalud',
    nombre: 'Centro de salud',
    a: 3,
    referenciaArticulo: 'ERAS-2023 §2.9.2.2',
  },
  {
    id: 'centroDeDetencion',
    nombre: 'Centro de detención',
    a: 4,
    referenciaArticulo: 'ERAS-2023 §2.9.2.2',
  },
  {
    id: 'centroDeportivo',
    nombre: 'Centro deportivo',
    a: 4,
    referenciaArticulo: 'ERAS-2023 §2.9.2.2',
  },
  {
    id: 'centroComercial',
    nombre: 'Centro comercial',
    a: 4,
    referenciaArticulo: 'ERAS-2023 §2.9.2.2',
  },
  {
    id: 'terminalDePasajeros',
    nombre: 'Terminal de pasajeros',
    a: 4,
    referenciaArticulo: 'ERAS-2023 §2.9.2.2',
  },
] as const;

// Precondicion imposible si tipoDeProyecto proviene de TipoDeProyecto real
// y la tabla arriba sigue completa: mismo criterio que otras "precondicion
// imposible" del proyecto (n<1, artefactoId inexistente) -- error explicito,
// no un 1 por defecto silencioso.
export function obtenerCoeficienteABase(tipoDeProyecto: TipoDeProyecto): 1 | 2 | 3 | 4 {
  const entrada = coeficientesMayoracion.find((candidato) => candidato.id === tipoDeProyecto);

  if (entrada === undefined) {
    throw new Error(
      `obtenerCoeficienteABase: no existe ninguna entrada normativa para la tipología "${tipoDeProyecto}"`,
    );
  }

  return entrada.a;
}
