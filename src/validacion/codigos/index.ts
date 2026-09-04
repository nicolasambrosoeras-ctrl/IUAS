// Catálogo de códigos de validación semántica.
// La severidad se define aquí, centralmente, para que ningún validador
// individual decida por su cuenta.

export type CodigoValidacion =
  | 'proyectoRegimenLocalAusente'
  | 'proyectoCantidadNoPositiva'
  | 'proyectoUnidadFuncionalSinLocales'
  | 'proyectoLocalSinArtefactos'
  | 'proyectoSinArtefactosComputables'
  | 'catalogoArtefactoIdInexistente'
  | 'catalogoTipoDeProyectoInexistente'
  | 'redHidraulicaNodoIdDuplicado'
  | 'redHidraulicaTramoIdDuplicado'
  | 'redHidraulicaTramoNodoInexistente'
  | 'redHidraulicaTramoOrigenIgualDestino'
  | 'redHidraulicaReferenciaArtefactoInvalida'
  | 'redHidraulicaTramoLongitudNoPositiva'
  | 'redHidraulicaTramoLongitudIncompatibleConCota'
  | 'redHidraulicaTramoAccesorioTipoNoSoportado'
  | 'redHidraulicaTramoAccesorioCantidadNoPositiva'
  | 'configuracionHidraulicaSistemaDeTuberiaIdInexistente'
  | 'configuracionHidraulicaSistemaMaterialIncompatible';

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
  proyectoSinArtefactosComputables: {
    severidad: 'error',
    descripcion:
      'El proyecto no contiene ningún artefacto computable en ninguna unidad funcional; el motor no puede calcular con n=0.',
  },
  catalogoArtefactoIdInexistente: {
    severidad: 'error',
    descripcion: 'artefactoId no existe en el catálogo normativo vigente del proyecto.',
  },
  catalogoTipoDeProyectoInexistente: {
    severidad: 'error',
    descripcion: 'tipoDeProyecto no corresponde a ninguna tipología del catálogo de mayoración vigente.',
  },
  redHidraulicaNodoIdDuplicado: {
    severidad: 'error',
    descripcion: 'Dos o más nodos de la red hidráulica comparten el mismo id.',
  },
  redHidraulicaTramoIdDuplicado: {
    severidad: 'error',
    descripcion: 'Dos o más tramos de la red hidráulica comparten el mismo id.',
  },
  redHidraulicaTramoNodoInexistente: {
    severidad: 'error',
    descripcion: 'Un tramo referencia un nodoOrigenId o nodoDestinoId que no existe en la red.',
  },
  redHidraulicaTramoOrigenIgualDestino: {
    severidad: 'error',
    descripcion: 'Un tramo tiene el mismo nodo como origen y como destino.',
  },
  redHidraulicaReferenciaArtefactoInvalida: {
    severidad: 'error',
    descripcion:
      'La referencia de un nodo a un artefacto no resuelve la cadena unidadFuncionalId → localId → artefactoId dentro del proyecto.',
  },
  redHidraulicaTramoLongitudNoPositiva: {
    severidad: 'error',
    descripcion: 'Tramo con longitud_m informada menor o igual a cero.',
  },
  redHidraulicaTramoLongitudIncompatibleConCota: {
    severidad: 'error',
    descripcion:
      'Tramo con longitud_m menor a la diferencia de cota (en valor absoluto) entre su nodo origen y su nodo destino (CRIT-A20).',
  },
  redHidraulicaTramoAccesorioTipoNoSoportado: {
    severidad: 'error',
    descripcion:
      'Un accesorio de Tramo tiene un tipo que no pertenece al subconjunto de Tabla N°7 representable hoy sobre Tramo (D-δ.33).',
  },
  redHidraulicaTramoAccesorioCantidadNoPositiva: {
    severidad: 'error',
    descripcion: 'Cantidad de accesorio de Tramo menor o igual a cero.',
  },
  configuracionHidraulicaSistemaDeTuberiaIdInexistente: {
    severidad: 'error',
    descripcion: 'configuracionHidraulica.sistemaDeTuberiaId no existe en el catálogo de sistemas de tubería vigente.',
  },
  configuracionHidraulicaSistemaMaterialIncompatible: {
    severidad: 'error',
    descripcion:
      'El sistema de tubería seleccionado pertenece a un materialTuberiaId distinto del configurado en el Proyecto.',
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
