// Tabla de alturas hidráulicas de referencia IUAS v1 (GEOM-UX-01, D-δ.86).
//
// Criterio IUAS -- NO ERAS. Estos valores son alturas hidráulicas
// iniciales de referencia adoptadas por IUAS a partir de geometrías
// usuales, documentación de fabricantes y práctica de proyecto. NO
// constituyen prescripciones ERAS-2023 y son siempre editables por el
// proyectista. La Guía normativa publica los `qu` de demanda de cada
// artefacto; NO fija a qué altura sobre el piso está su punto de
// conexión. Esta tabla vive junto al catálogo por cercanía de dominio,
// pero se mantiene deliberadamente separada de `index.ts` (que sí es
// transcripción normativa pura) para no dar a entender que ERAS fijó
// estas alturas.
//
// Magnitud: "Altura hidráulica de referencia sobre piso terminado del
// Local", en metros -- el valor de cálculo representativo del punto
// hidráulico del artefacto por encima del piso efectivo de su Local. NO
// es la altura del borde del artefacto, ni la del caño embutido, ni la
// altura arquitectónica, ni una cota absoluta.
//
// Uso: la cota hidráulica efectiva de un terminal se deriva sumando esta
// altura (o el override de instancia, Artefacto.alturaHidraulicaSobrePiso_m)
// sobre la cota de piso efectiva del Local (override del Local, o cota de
// la UnidadFuncional heredada). Ver
// motor/tuberias/geometria/resolverCotaHidraulicaDeArtefacto.

// Una entrada por cada `id` de `catalogoArtefactos` -- ni una de más
// (huérfana) ni una de menos. El test de completitud de este módulo lo
// garantiza; un tipo nuevo de catálogo sin altura, o una entrada acá que
// no exista en el catálogo, dejan ese test en rojo.
export const alturaHidraulicaIuasPorArtefacto: Readonly<Record<string, number>> = {
  inodoroValvula: 1.0,
  banera: 0.7,
  receptaculoDucha: 2.0,
  bidet: 0.4,
  lavatorio: 0.9,
  inodoroDeposito: 0.4,
  piletaDeCocina: 0.9,
  maquinaLavavajillas: 0.6,
  piletaDeLavar: 1.1,
  maquinaLavarropas: 0.6,
  valvulaMingitorio: 1.0,
  piletaDeCocinaIndustrial: 0.9,
  lavavajillasIndustrial: 0.6,
  lavarropasIndustrial: 0.6,
  lavachatas: 1.1,
  canillaDeServicio: 0.6,
};

// `undefined` sólo para un `artefactoIdCatalogo` que no existe en el
// catálogo o que se agregó sin darle altura -- nunca cae a un default
// silencioso (0 subdimensionaría Δz). Guard contra colisiones con el
// prototipo de Object, igual criterio que obtenerPoliticaDeConectividad.
export function obtenerAlturaHidraulicaIuas(artefactoIdCatalogo: string): number | undefined {
  return Object.prototype.hasOwnProperty.call(alturaHidraulicaIuasPorArtefacto, artefactoIdCatalogo)
    ? alturaHidraulicaIuasPorArtefacto[artefactoIdCatalogo]
    : undefined;
}

// Texto de ayuda reutilizable por la UI -- deja explícito que el valor es
// editable y no normativo (§12: nunca "Según ERAS").
export const AYUDA_ALTURA_HIDRAULICA_IUAS =
  'Valor de referencia IUAS, editable por el proyectista. No es una prescripción de ERAS-2023.';
