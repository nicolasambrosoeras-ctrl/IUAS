// UX-02 / UI-01E (D-δ.77): sugerencia CONTEXTUAL del próximo artefacto al
// pulsar "+ Agregar artefacto" en un Local de M1.
//
// UI-CRIT-07: es comportamiento de PRODUCTO, no una fórmula hidráulica ni
// una regla normativa. Vive en la capa de interfaz; nunca en
// `motor/`. Sólo actúa al CREAR: no reinterpreta datos existentes.
//
// El mapping usa ids canónicos del catálogo `eras-2023`
// (`normativa/eras-2023/catalogo-artefactos`), nunca labels traducidos.
// Sólo cubre Régimen `domiciliario` (el único con una relación
// Tipo-de-Local ↔ artefactos habituales firme en el repo, brief §7/§13);
// para cualquier otro régimen no hay sugerencia y la UI ofrece elegir el
// artefacto explícitamente.
import type { Local, RegimenLocal, TipoDeLocal } from '../../modelo/proyecto'

// Orden de prioridad de presentación de los artefactos habituales de cada
// Tipo de Local domiciliario (brief §7). NO incluye
// `inodoroValvula` ("Inodoro con válvula automática") en ningún Local: se
// mantiene en catálogo y es elegible a mano, pero nunca es un default
// (brief §8). Los tipos sin entrada (`cochera`, `otros`) no tienen
// sugerencia contextual.
const HABITUALES_DOMICILIARIO: Partial<Record<TipoDeLocal, readonly string[]>> = {
  bano: ['inodoroDeposito', 'bidet', 'lavatorio', 'receptaculoDucha', 'banera'],
  toilette: ['inodoroDeposito', 'lavatorio'],
  cocina: ['piletaDeCocina', 'maquinaLavavajillas'],
  lavadero: ['piletaDeLavar', 'maquinaLavarropas'],
  jardin: ['canillaDeServicio'],
}

// Candidatos contextuales en orden, o lista vacía si no hay mapping firme
// para ese (Tipo de Local, Régimen).
export function candidatosContextualesDeArtefacto(
  tipo: TipoDeLocal,
  regimen: RegimenLocal | undefined,
): readonly string[] {
  if (regimen !== 'domiciliario') {
    return []
  }
  return HABITUALES_DOMICILIARIO[tipo] ?? []
}

// Primer candidato contextual cuyo tipo TODAVÍA NO está presente en el
// Local. "Presente" = existe una fila (`Artefacto`) de ese `artefactoId`
// (brief §10): `cantidad > 1` no cuenta como ausencia. `undefined` cuando
// no hay ningún candidato aplicable (mapping vacío o todos ya presentes):
// la UI abre entonces un borrador "Seleccionar artefacto…" en vez de
// elegir un artefacto arbitrario (brief §11).
export function sugerirArtefactoParaLocal(local: Local): string | undefined {
  const idsPresentes = new Set(local.artefactos.map((artefacto) => artefacto.artefactoId))
  return candidatosContextualesDeArtefacto(local.tipo, local.regimen).find((id) => !idsPresentes.has(id))
}
