// Aplica el cambio de tipo de catálogo a una instancia de Artefacto,
// limpiando los overrides que pertenecían al tipo ANTERIOR:
//
//  - `alturaHidraulicaSobrePiso_m` (GEOM-UX-01 §7): el cambio de tipo
//    adopta el default IUAS del tipo nuevo -- una ducha personalizada a
//    2,20 m no debe volverse un bidet de 2,20 m por accidente.
//  - `conectividadElegida` (CAT-CONN-01 §9): la conectividad se re-resuelve
//    por la política del tipo nuevo. Si el caller ya conoce la nueva
//    conectividad (tipo `requiereSeleccion` recién declarado), la pasa en
//    `conectividadElegida`; si no, queda sin override y el resolver la
//    deriva de la política de catálogo.
//
// El resto de los campos de instancia (id, cantidad, origen) se conservan.
// No toca la topología: eso es responsabilidad de
// reconciliarConectividadFisicaPorCambioDeArtefacto, que el caller invoca
// después con el Proyecto ya actualizado.
import type { Artefacto } from '../../modelo/proyecto'
import type { ConectividadFisica } from '../../modelo/redHidraulica'

export function conTipoDeArtefactoCambiado(
  artefacto: Artefacto,
  nuevoArtefactoId: string,
  opciones?: { readonly conectividadElegida?: ConectividadFisica },
): Artefacto {
  const copia: Artefacto = { ...artefacto, artefactoId: nuevoArtefactoId }
  delete copia.alturaHidraulicaSobrePiso_m
  if (opciones?.conectividadElegida !== undefined) {
    copia.conectividadElegida = opciones.conectividadElegida
  } else {
    delete copia.conectividadElegida
  }
  return copia
}
