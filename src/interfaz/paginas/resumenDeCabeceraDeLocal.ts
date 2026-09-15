// BETA-UI-POLISH-01: helper puramente PRESENTACIONAL para el header
// colapsable de Local ("Baño · 4 artefactos" vs. "Baño 1 · Baño ·
// 4 artefactos"). No decide el nombre visible de un Local (eso lo resuelve
// `nombreVisibleDeLocal.ts`, el resolver de dominio) -- sólo decide si,
// dado un nombre visible ya calculado, repetir el tipo al lado es
// redundante o aporta información.

// Comparación simple por igualdad de texto recortado (brief §5): "Baño 1"
// NO se considera igual a "Baño" -- sólo el caso exacto (nombre visible ==
// etiqueta de tipo, típicamente cuando el Local es el único de su tipo y no
// tiene nombre personalizado) omite el tipo repetido.
export function tipoEsRedundanteConNombreVisible(nombreVisible: string, etiquetaTipo: string): boolean {
  return nombreVisible.trim() === etiquetaTipo.trim()
}

// Texto de la meta secundaria del header de Local: "N artefactos" solo si
// el tipo ya está implícito en el nombre visible, o "Tipo · N artefactos"
// si no.
export function metaDeCabeceraDeLocal(
  nombreVisible: string,
  etiquetaTipo: string,
  resumenArtefactos: string,
): string {
  return tipoEsRedundanteConNombreVisible(nombreVisible, etiquetaTipo) ? resumenArtefactos : `${etiquetaTipo} · ${resumenArtefactos}`
}
