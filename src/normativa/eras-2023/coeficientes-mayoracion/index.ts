// Coeficiente de mayoración "a" por tipo de proyecto.
// Datos puros, sin lógica de ejecución.

export type CoeficienteMayoracion = {
  a: 1 | 2 | 3 | 4;
  tipoDeProyecto: string;
  referenciaArticulo: string;
};

export const coeficientesMayoracion: readonly CoeficienteMayoracion[] = [
  {
    a: 1,
    tipoDeProyecto: 'Oficinas privadas y vivienda individual',
    referenciaArticulo: 'ERAS-2023 §2.9.2.2',
  },
  {
    a: 2,
    tipoDeProyecto: 'Viviendas multifamiliares, oficinas públicas, centros educativos',
    referenciaArticulo: 'ERAS-2023 §2.9.2.2',
  },
  {
    a: 3,
    tipoDeProyecto: 'Edificios públicos, aeropuertos, centro de salud',
    referenciaArticulo: 'ERAS-2023 §2.9.2.2',
  },
  {
    a: 4,
    tipoDeProyecto: 'Centros de detención, deportivos, comerciales, terminales de pasajeros',
    referenciaArticulo: 'ERAS-2023 §2.9.2.2',
  },
] as const;
