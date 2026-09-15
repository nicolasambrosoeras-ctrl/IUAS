// UX-HIERARCHY-POLISH-01 (D-δ.131): helper consolidado para resolver el
// nombre VISIBLE de un Local ante un humano, respetando `Local.nombre`
// cuando está presente. NO reinventa la lógica de etiqueta automática
// (tipo + ordinal) -- cada consumidor sigue calculando su propia etiqueta
// automática con su propio criterio de numeración (M1 numera sólo dentro
// del Nivel y omite el número si hay un único Local de ese tipo; M2/PDF
// numeran siempre dentro de toda la UF, ver
// interfaz/paginas/identificarFilasDeModulo2.ts derivarOrdinalesDeLocal) --
// este helper sólo decide UNA cosa: personalizado gana, si no cae al
// automático que le pasen.
import type { Local } from './index';

// `Local.nombre` recortado, o `undefined` si está ausente / vacío / sólo
// espacios. Único punto de la regla "nunca persistir string vacío" para
// LECTURA (la escritura vive en cada updater de UI, mismo criterio que
// `Nivel.cotaHidraulicaReferencia_m` / `Montante.nombre`).
export function nombrePersonalizadoDeLocal(local: Local): string | undefined {
  const recortado = local.nombre?.trim();
  return recortado === undefined || recortado === '' ? undefined : recortado;
}

// Nombre visible final: el personalizado si existe, si no la etiqueta
// automática que ya calculó el llamador (nunca recalculada acá).
export function nombreVisibleDeLocal(local: Local, etiquetaAutomatica: string): string {
  return nombrePersonalizadoDeLocal(local) ?? etiquetaAutomatica;
}
