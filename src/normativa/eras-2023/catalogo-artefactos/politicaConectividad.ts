// Política de conectividad física por tipo de artefacto de catálogo
// (CAT-CONN-01, D-δ.84).
//
// CRITERIO IUAS -- NO es una prescripción de ERAS-2023. La Guía normativa
// publica `qu Total`, `qu (A. Fría)` y `qu (A. Cal.)` como datos
// HIDRÁULICOS de demanda; NO establece cuántas alimentaciones físicas
// (AF / AC) tiene cada artefacto ni obliga a conectarlo a ambas. Esta
// tabla es la decisión de producto de IUAS sobre qué conectividad adoptar
// por defecto al incorporar cada tipo, y qué tipos exigen que el
// proyectista la declare. Vive junto al catálogo por cercanía de dominio,
// pero se mantiene deliberadamente en un archivo separado de `index.ts`
// (que sí es transcripción normativa pura) para no dar a entender que
// ERAS fijó estas conectividades.
//
// PROHIBIDO derivar la conectividad de `quFria > 0`, `quCaliente > 0`,
// `quCaliente == 0`, cualquier combinación de `qu`, el label visible, el
// nombre/string del artefacto, `includes()`, un switch de UI por texto, o
// la existencia de otra instancia parecida en el proyecto (precedente).
// La única fuente de la conectividad inicial es esta política explícita;
// la única fuente de una conectividad NO estándar es
// `Artefacto.conectividadElegida` (override explícito de instancia).
//
// Relación con CRIT-A15: este criterio decide qué terminales físicos se
// crean; CRIT-A15 (motor/tuberias/caudal) decide qué `qu` transporta cada
// rama una vez que los terminales existen. `piletaDeCocinaIndustrial`
// pasa a AF+AC automática y su hidráulica sigue exactamente el
// comportamiento conservador de CRIT-A15 (cada rama transporta `quTotal`,
// el tramo común aguas arriba lo cuenta una sola vez). Este archivo no
// modifica ninguna fórmula ni el catálogo.
//
// `lavachatas` de esta tabla es el artefacto sanitario ERAS (depósito
// automático / válvula de limpieza), AF. Una máquina lavachatas /
// washer-disinfector moderna sería un tipo de catálogo futuro distinto y
// no debe reutilizar esta entrada.
import type { ConectividadFisica } from '../../../modelo/redHidraulica';
import { catalogoArtefactos } from './index';

export type PoliticaDeConectividad =
  // Resuelve de inmediato con `referencia`. No pregunta, no admite
  // personalización por instancia.
  | { readonly politica: 'automatica'; readonly referencia: ConectividadFisica }
  // Adopta `referencia` sin preguntar, pero el usuario puede cambiarla a
  // cualquiera de `opcionesPermitidas` desde la fila de M1.
  | {
      readonly politica: 'defaultConfigurable';
      readonly referencia: ConectividadFisica;
      readonly opcionesPermitidas: readonly ConectividadFisica[];
    }
  // No tiene default: al incorporarlo hay que declarar la alimentación
  // (una de `opcionesPermitidas`) antes de que quede conectado.
  | { readonly politica: 'requiereSeleccion'; readonly opcionesPermitidas: readonly ConectividadFisica[] };

// Opciones de los dos electrodomésticos domésticos configurables: sólo
// AF (default) o AF+AC -- nunca AC sola (no existe un lavavajillas /
// lavarropas doméstico alimentado únicamente de agua caliente).
const OPCIONES_DOMESTICO_CONFIGURABLE: readonly ConectividadFisica[] = ['soloAF', 'ambas'];

// Opciones de los equipos industriales que exigen selección: cualquiera
// de las tres es físicamente posible según el equipo concreto.
const OPCIONES_INDUSTRIAL: readonly ConectividadFisica[] = ['soloAF', 'soloAC', 'ambas'];

export const politicaConectividadPorArtefacto: Readonly<Record<string, PoliticaDeConectividad>> = {
  inodoroValvula: { politica: 'automatica', referencia: 'soloAF' },
  banera: { politica: 'automatica', referencia: 'ambas' },
  receptaculoDucha: { politica: 'automatica', referencia: 'ambas' },
  bidet: { politica: 'automatica', referencia: 'ambas' },
  lavatorio: { politica: 'automatica', referencia: 'ambas' },
  inodoroDeposito: { politica: 'automatica', referencia: 'soloAF' },
  piletaDeCocina: { politica: 'automatica', referencia: 'ambas' },
  maquinaLavavajillas: {
    politica: 'defaultConfigurable',
    referencia: 'soloAF',
    opcionesPermitidas: OPCIONES_DOMESTICO_CONFIGURABLE,
  },
  piletaDeLavar: { politica: 'automatica', referencia: 'ambas' },
  maquinaLavarropas: {
    politica: 'defaultConfigurable',
    referencia: 'soloAF',
    opcionesPermitidas: OPCIONES_DOMESTICO_CONFIGURABLE,
  },
  valvulaMingitorio: { politica: 'automatica', referencia: 'soloAF' },
  piletaDeCocinaIndustrial: { politica: 'automatica', referencia: 'ambas' },
  lavavajillasIndustrial: { politica: 'requiereSeleccion', opcionesPermitidas: OPCIONES_INDUSTRIAL },
  lavarropasIndustrial: { politica: 'requiereSeleccion', opcionesPermitidas: OPCIONES_INDUSTRIAL },
  lavachatas: { politica: 'automatica', referencia: 'soloAF' },
  canillaDeServicio: { politica: 'automatica', referencia: 'soloAF' },
};

// `undefined` sólo para un `artefactoIdCatalogo` que no existe en el
// catálogo o que se agregó sin darle política -- el resolver lo trata como
// `tipoDesconocido` (falla visible/testeable), nunca cae a un default
// silencioso. El test de completitud de este módulo garantiza que todo
// artefacto del catálogo tiene exactamente una política.
export function obtenerPoliticaDeConectividad(
  artefactoIdCatalogo: string,
): PoliticaDeConectividad | undefined {
  return Object.prototype.hasOwnProperty.call(politicaConectividadPorArtefacto, artefactoIdCatalogo)
    ? politicaConectividadPorArtefacto[artefactoIdCatalogo]
    : undefined;
}

// Ids de catálogo que hoy exigen selección explícita de conectividad al
// incorporarse. Expuesto para que la QA del catálogo asevere la matriz
// objetivo sin volver a hardcodear la lista.
export const ARTEFACTOS_QUE_REQUIEREN_SELECCION: readonly string[] = catalogoArtefactos
  .filter((c) => obtenerPoliticaDeConectividad(c.id)?.politica === 'requiereSeleccion')
  .map((c) => c.id);
