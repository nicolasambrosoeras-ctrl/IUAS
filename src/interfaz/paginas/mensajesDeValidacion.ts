// Copy de PRESENTACIÓN para los códigos de validación semántica. Vive en
// la capa de interfaz (no en `validacion/`, que sólo define los códigos y
// su severidad/alcance de dominio, con descripciones técnicas internas).
//
// FIX-LEAK-01 (D-δ.85): esta tabla estaba incrustada como `const` local en
// `MotorDemandaPantalla.tsx`. El Panel de Módulo 3, en su rama de estado
// "error", pintaba `problema.problema.codigo` CRUDO
// (`redHidraulicaTramoLongitudNoPositiva`, etc.) como texto de usuario. Se
// extrae acá para que M1 y M3 compartan UNA sola traducción humana por
// código, con una política segura ante cualquier código inesperado.
import type { CodigoValidacion } from '../../validacion'

// Mensaje genérico cuando un código no tiene copy propia (código nuevo del
// dominio todavía sin traducir, o valor persistido fuera del catálogo).
// NUNCA se muestra el identificador técnico al usuario.
export const MENSAJE_DE_VALIDACION_GENERICO =
  'Hay un dato de la instalación que debe corregirse antes de continuar.'

// Una entrada por cada `CodigoValidacion` (el tipo `Record<...>` obliga a
// mantenerla completa). Frases declarativas, sin nombres de campo internos,
// sin códigos, sin "[error]".
export const MENSAJES_DE_VALIDACION: Readonly<Record<CodigoValidacion, string>> = {
  proyectoRegimenLocalAusente: 'Debe seleccionar el régimen del local.',
  proyectoCantidadNoPositiva: 'La cantidad de artefactos debe ser mayor que cero.',
  proyectoUnidadFuncionalSinLocales: 'La unidad funcional no contiene locales.',
  proyectoLocalSinArtefactos: 'El local no contiene artefactos y no participa del cálculo.',
  proyectoSinArtefactosComputables: 'El proyecto debe contener al menos un artefacto para poder calcular.',
  catalogoArtefactoIdInexistente: 'El artefacto seleccionado no existe en el catálogo normativo vigente.',
  catalogoTipoDeProyectoInexistente:
    'La tipología de proyecto seleccionada no existe en el catálogo normativo vigente.',
  redHidraulicaNodoIdDuplicado: 'Nodo de red hidráulica con identificador duplicado.',
  redHidraulicaTramoIdDuplicado: 'Tramo de red hidráulica con identificador duplicado.',
  redHidraulicaTramoNodoInexistente: 'Un tramo de red hidráulica referencia un nodo inexistente.',
  redHidraulicaTramoOrigenIgualDestino:
    'Un tramo de red hidráulica no puede tener el mismo nodo como origen y destino.',
  redHidraulicaReferenciaArtefactoInvalida:
    'Una referencia de red hidráulica apunta a un artefacto inexistente o fuera de la ubicación indicada.',
  redHidraulicaTramoLongitudNoPositiva: 'La longitud de un tramo debe ser mayor que cero.',
  redHidraulicaTramoLongitudIncompatibleConCota:
    'Un tramo de red hidráulica tiene una longitud menor a la diferencia de cota entre sus nodos.',
  redHidraulicaTramoAccesorioTipoNoSoportado:
    'Un accesorio de tramo tiene un tipo todavía no soportado para el cálculo de pérdida localizada.',
  redHidraulicaTramoAccesorioCantidadNoPositiva: 'La cantidad de un accesorio de tramo debe ser mayor que cero.',
  redHidraulicaNodoTeeEstructuraNoSoportada:
    'Un nodo con configuración de tee no tiene exactamente 1 tramo entrante y 2 tramos salientes.',
  redHidraulicaNodoTeeTramoSalidaRectaInvalido:
    'La salida recta declarada de una tee no es ninguno de los dos tramos salientes reales del nodo.',
  configuracionHidraulicaSistemaDeTuberiaIdInexistente:
    'El sistema de tubería seleccionado no existe en el catálogo de sistemas comerciales vigente.',
  configuracionHidraulicaSistemaMaterialIncompatible:
    'El sistema de tubería seleccionado pertenece a un material distinto del material configurado en el proyecto.',
  configuracionMedidoresUnidadFuncionalInexistente:
    'La configuración de medidores tiene un override de ACS para una unidad funcional que ya no existe.',
  configuracionAbastecimientoEsquemaInvalido:
    'El esquema de abastecimiento persistido no es uno de los soportados (directa / tanque elevado / cisterna + bombeo + tanque elevado).',
  configuracionAbastecimientoPeriodoConsumoMaximoInvalido:
    'El período de consumo máximo del abastecimiento debe estar entre 1 y 4 horas.',
  parametrosDiametroNominalConexionNoAdmisible:
    'El diámetro nominal de la conexión debe ser uno de los diámetros de la Tabla N°1 y mayor o igual a 19 mm.',
  parametrosDesnivelConexionNoFinito:
    'El desnivel de la conexión respecto de la acera debe ser un número (puede ser negativo, cero o positivo).',
  configuracionAbastecimientoVolumenTanqueElevadoInvalido:
    'El volumen adoptado del tanque elevado debe ser un número mayor o igual a cero.',
  configuracionAbastecimientoVolumenTanqueBombeoInvalido:
    'El volumen adoptado del tanque de bombeo debe ser un número mayor o igual a cero.',
}

// Traducción humana de un código de validación para mostrar al usuario.
// Política SEGURA: código conocido → su frase; cualquier otra cosa →
// mensaje genérico. Nunca devuelve el identificador técnico, `undefined`,
// `null` ni `[object Object]`.
export function describirProblemaDeValidacion(codigo: CodigoValidacion | string): string {
  if (typeof codigo !== 'string') {
    return MENSAJE_DE_VALIDACION_GENERICO
  }
  const mensaje = (MENSAJES_DE_VALIDACION as Readonly<Record<string, string | undefined>>)[codigo]
  return mensaje && mensaje.trim().length > 0 ? mensaje : MENSAJE_DE_VALIDACION_GENERICO
}
