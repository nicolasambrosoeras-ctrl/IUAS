// Catálogo de códigos de validación semántica.
// La severidad se define aquí, centralmente, para que ningún validador
// individual decida por su cuenta.

export type CodigoValidacion =
  | 'proyectoRegimenLocalAusente'
  | 'proyectoCantidadNoPositiva'
  | 'proyectoUnidadFuncionalSinLocales'
  | 'proyectoLocalSinArtefactos'
  | 'catalogoArtefactoIdInexistente'
  | 'catalogoCoeficienteAInexistente';

export type Severidad = 'error' | 'advertencia';

export type DescripcionCodigo = {
  severidad: Severidad;
  descripcion: string;
};

export const codigosValidacion: Readonly<Record<CodigoValidacion, DescripcionCodigo>> = {
  proyectoRegimenLocalAusente: {
    severidad: 'error',
    descripcion:
      'Local sin regimen declarado (domiciliario / noDomiciliario). Sin este dato el motor no puede determinar el catálogo de consumos aplicable ni la regla de local.',
  },
  proyectoCantidadNoPositiva: {
    severidad: 'error',
    descripcion: 'Cantidad de artefacto menor o igual a cero.',
  },
  proyectoUnidadFuncionalSinLocales: {
    severidad: 'advertencia',
    descripcion: 'Unidad funcional sin ningún local cargado aún.',
  },
  proyectoLocalSinArtefactos: {
    severidad: 'advertencia',
    descripcion: 'Local sin ningún artefacto cargado aún.',
  },
  catalogoArtefactoIdInexistente: {
    severidad: 'error',
    descripcion: 'artefactoId no existe en el catálogo normativo vigente del proyecto.',
  },
  catalogoCoeficienteAInexistente: {
    severidad: 'error',
    descripcion: 'coeficienteA no corresponde a ningún valor del catálogo de mayoración vigente.',
  },
} as const;

export type ProblemaValidacion = {
  codigo: CodigoValidacion;
  severidad: Severidad;
  campo: string;
  valorRecibido: unknown;
  limite?: unknown;
};

export type ResultadoValidacion = {
  valido: boolean;
  problemas: readonly ProblemaValidacion[];
};

export function crearProblema(
  codigo: CodigoValidacion,
  campo: string,
  valorRecibido: unknown,
  limite?: unknown,
): ProblemaValidacion {
  return {
    codigo,
    severidad: codigosValidacion[codigo].severidad,
    campo,
    valorRecibido,
    ...(limite !== undefined ? { limite } : {}),
  };
}
