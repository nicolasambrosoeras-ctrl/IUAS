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
  | 'redHidraulicaNodoTeeEstructuraNoSoportada'
  | 'redHidraulicaNodoTeeTramoSalidaRectaInvalido'
  | 'redHidraulicaNodoMultiplesTramosEntrantes'
  | 'redHidraulicaCicloDirigido'
  | 'configuracionHidraulicaSistemaDeTuberiaIdInexistente'
  | 'configuracionHidraulicaSistemaMaterialIncompatible'
  | 'configuracionMedidoresUnidadFuncionalInexistente'
  | 'configuracionAbastecimientoEsquemaInvalido'
  | 'configuracionAbastecimientoPeriodoConsumoMaximoInvalido'
  | 'parametrosDiametroNominalConexionNoAdmisible'
  | 'parametrosDesnivelConexionNoFinito'
  | 'configuracionAbastecimientoVolumenTanqueElevadoInvalido'
  | 'configuracionAbastecimientoVolumenTanqueBombeoInvalido';

export type Severidad = 'error' | 'advertencia';

// Alcance de un problema de validación: a qué parte del pipeline pertenece
// (UX-02 / UI-01E — FIX P0). Es una clasificación de DOMINIO, no de
// presentación: gobierna el gating del cálculo. `calcularSimultaneidad`
// (Demanda / M1) sólo consume la estructura del Proyecto y las referencias
// de catálogo, así que un error de 'tuberias' / 'medidores' /
// 'abastecimiento' NO puede impedir que M1 calcule Qc (la dependencia va
// M1 -> M4, nunca al revés). Ver `alcanceDeCodigo` y
// MotorDemandaPantalla (UI-CRIT-10).
export type AlcanceValidacion = 'demanda' | 'tuberias' | 'medidores' | 'abastecimiento';

export type DescripcionCodigo = {
  severidad: Severidad;
  descripcion: string;
};

// Un error bloquea el cálculo de Demanda SÓLO si su alcance es 'demanda'.
// El resto son problemas del módulo correspondiente y se muestran en su
// sección, sin apagar M1 ni desmontar el resto de la app.
const ALCANCE_POR_CODIGO: Readonly<Record<CodigoValidacion, AlcanceValidacion>> = {
  proyectoRegimenLocalAusente: 'demanda',
  proyectoCantidadNoPositiva: 'demanda',
  proyectoUnidadFuncionalSinLocales: 'demanda',
  proyectoLocalSinArtefactos: 'demanda',
  proyectoSinArtefactosComputables: 'demanda',
  catalogoArtefactoIdInexistente: 'demanda',
  catalogoTipoDeProyectoInexistente: 'demanda',
  redHidraulicaNodoIdDuplicado: 'tuberias',
  redHidraulicaTramoIdDuplicado: 'tuberias',
  redHidraulicaTramoNodoInexistente: 'tuberias',
  redHidraulicaTramoOrigenIgualDestino: 'tuberias',
  redHidraulicaReferenciaArtefactoInvalida: 'tuberias',
  redHidraulicaTramoLongitudNoPositiva: 'tuberias',
  redHidraulicaTramoLongitudIncompatibleConCota: 'tuberias',
  redHidraulicaTramoAccesorioTipoNoSoportado: 'tuberias',
  redHidraulicaTramoAccesorioCantidadNoPositiva: 'tuberias',
  redHidraulicaNodoTeeEstructuraNoSoportada: 'tuberias',
  redHidraulicaNodoTeeTramoSalidaRectaInvalido: 'tuberias',
  redHidraulicaNodoMultiplesTramosEntrantes: 'tuberias',
  redHidraulicaCicloDirigido: 'tuberias',
  configuracionHidraulicaSistemaDeTuberiaIdInexistente: 'tuberias',
  configuracionHidraulicaSistemaMaterialIncompatible: 'tuberias',
  configuracionMedidoresUnidadFuncionalInexistente: 'medidores',
  configuracionAbastecimientoEsquemaInvalido: 'abastecimiento',
  configuracionAbastecimientoPeriodoConsumoMaximoInvalido: 'abastecimiento',
  parametrosDiametroNominalConexionNoAdmisible: 'abastecimiento',
  parametrosDesnivelConexionNoFinito: 'abastecimiento',
  configuracionAbastecimientoVolumenTanqueElevadoInvalido: 'abastecimiento',
  configuracionAbastecimientoVolumenTanqueBombeoInvalido: 'abastecimiento',
} as const;

export function alcanceDeCodigo(codigo: CodigoValidacion): AlcanceValidacion {
  return ALCANCE_POR_CODIGO[codigo];
}

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
  redHidraulicaNodoTeeEstructuraNoSoportada: {
    severidad: 'error',
    descripcion:
      'Un Nodo con configuración de tee (Nodo.tee) no tiene exactamente 1 tramo entrante y 2 tramos salientes (CRIT-A31).',
  },
  redHidraulicaNodoTeeTramoSalidaRectaInvalido: {
    severidad: 'error',
    descripcion:
      'tramoSalidaRectaId de una configuración de tee (entradaPorExtremo) no es ninguno de los dos tramos salientes reales del Nodo (CRIT-A31).',
  },
  redHidraulicaNodoMultiplesTramosEntrantes: {
    severidad: 'error',
    descripcion:
      'Un Nodo tiene dos o más tramos entrantes. El alcance hidráulico de Módulo 2 es una arborescencia (CRIT-A27 / D-δ.37): cada Nodo debe tener a lo sumo un tramo entrante. Convergencias 2→1, tramos paralelos y mallas quedan fuera de alcance (recirculación de ACS sigue diferida, D-δ.15).',
  },
  redHidraulicaCicloDirigido: {
    severidad: 'error',
    descripcion:
      'La red hidráulica contiene un ciclo dirigido (siguiendo nodoOrigenId → nodoDestinoId se vuelve a un Nodo ya recorrido). El alcance hidráulico de Módulo 2 es una arborescencia acíclica (CRIT-A27): ningún camino de terminal hacia el origen podría resolverse.',
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
  configuracionMedidoresUnidadFuncionalInexistente: {
    severidad: 'error',
    descripcion:
      'configuracionMedidores.tipoProvisionACSPorUnidadFuncional referencia un id de unidad funcional que no existe en el Proyecto.',
  },
  configuracionAbastecimientoEsquemaInvalido: {
    severidad: 'error',
    descripcion:
      'configuracionAbastecimiento.esquema no es uno de los esquemas soportados (directa / tanqueElevado / cisternaBombeoElevado).',
  },
  configuracionAbastecimientoPeriodoConsumoMaximoInvalido: {
    severidad: 'error',
    descripcion:
      'configuracionAbastecimiento.periodoConsumoMaximo_h, cuando está presente, debe ser un número finito entre 1 y 4 horas (ERAS §2.10.2 / CRIT-A35). Nunca se corrige silenciosamente ni se aplica clamp.',
  },
  parametrosDiametroNominalConexionNoAdmisible: {
    severidad: 'error',
    descripcion:
      'parametros.diametroNominalConexion_m, cuando está presente, debe ser uno de los diámetros de la Tabla N°1 (§2.7) y >= 0,019 m (mínimo de conexión, CRIT-A36). La fila DN13 de Tabla N°1 no es admisible como conexión.',
  },
  parametrosDesnivelConexionNoFinito: {
    severidad: 'error',
    descripcion:
      'parametros.desnivelConexion_m, cuando está presente, debe ser un número finito (puede ser negativo, cero o positivo: es un desnivel firmado, no una longitud).',
  },
  configuracionAbastecimientoVolumenTanqueElevadoInvalido: {
    severidad: 'error',
    descripcion:
      'configuracionAbastecimiento.volumenTanqueElevadoAdoptado_m3, cuando está presente, debe ser un número finito >= 0. Que sea menor a la reserva requerida NO es un problema de validación (es una verificación derivada).',
  },
  configuracionAbastecimientoVolumenTanqueBombeoInvalido: {
    severidad: 'error',
    descripcion:
      'configuracionAbastecimiento.volumenTanqueBombeoAdoptado_m3, cuando está presente, debe ser un número finito >= 0.',
  },
} as const;

export type ProblemaValidacion = {
  codigo: CodigoValidacion;
  severidad: Severidad;
  alcance: AlcanceValidacion;
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
    alcance: ALCANCE_POR_CODIGO[codigo],
    campo,
    valorRecibido,
    ...(limite !== undefined ? { limite } : {}),
  };
}
