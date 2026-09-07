// IDs unicos via crypto.randomUUID() (API nativa del navegador, sin
// dependencia nueva): un contador de modulo colisionaria con los IDs que ya
// trae el proyecto inicial (local-bano, artefacto-1, etc.).
//
// Vive en su propio modulo -- sin logica de dominio, sin React -- para que
// tanto la duplicacion funcional (duplicarUnidadFuncional.ts) como la
// sincronizacion fisica (sincronizarConectividadFisicaDeArtefacto.ts /
// asegurarRaizDeRed.ts) puedan importarla sin crear un ciclo entre esos
// dos modulos: desde D-δ.50 duplicarUnidadFuncional pasa a depender de la
// sincronizacion fisica, y la sincronizacion fisica ya dependia de
// generarId cuando este vivia dentro de duplicarUnidadFuncional.ts.
export function generarId(prefijo: string): string {
  return `${prefijo}-${crypto.randomUUID()}`
}
