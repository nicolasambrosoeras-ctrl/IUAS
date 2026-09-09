// D-δ.52 Parte B (CRIT-A15) + CAT-CONN-01 (D-δ.84): al cambiar el tipo de
// catálogo de un Artefacto ya existente, reconcilia su conectividad física
// AF/AC POR CONJUNTOS -- sin desconectar y reconstruir todo. Compone
// primitivas ya cerradas, no reimplementa ninguna regla topológica:
//
//   redesActuales = las Redes en las que la instancia tiene terminal HOY
//                   (leído de redHidraulica).
//   redesNuevas   = las Redes que el tipo NUEVO necesita, resueltas por
//                   `resolverConectividadInicialDeArtefacto` (política de
//                   conectividad del catálogo + override explícito de
//                   instancia, CAT-CONN-01). YA NO se consulta el
//                   precedente del propio proyecto. Si el tipo nuevo es
//                   `requiereSeleccion` sin `conectividadElegida`, esta
//                   función NO toca la topología -- el caller maneja el
//                   flujo de declaración pendiente antes de aplicar el
//                   cambio.
//
//   conservar (redesActuales ∩ redesNuevas): intactas -- nodos, tramos,
//     longitud, accesorios, override manual de DN se preservan (brief §16/
//     §A11/§A12).
//   eliminar  (redesActuales − redesNuevas): quitarConectividadFisicaDeArtefacto
//     acotado a esa Red + podarNodosSinSalida (limpia una cabecera de
//     bifurcación que quedó sin hijos -- brief §18/§21; la Alimentación
//     ACS compartida sobrevive porque tiene `referencia`, brief §21).
//   agregar   (redesNuevas − redesActuales): sincronizarConectividadFisicaDeArtefactoConRedesDeclaradas
//     (D-δ.49: bootstrap / retrofit / hermano según la topología
//     existente -- NO un cuarto algoritmo, brief §17/§22).
//
// Idempotente (brief §27): con redesActuales === redesNuevas no elimina ni
// agrega nada. El caller aplica el cambio funcional y ESTA reconciliación
// en un único updater, sin render intermedio inconsistente (brief §26).
import type { Proyecto } from '../../modelo/proyecto'
import type { RedDeTramo } from '../../modelo/redHidraulica'
import { resolverConectividadInicialDeArtefacto } from '../../motor/tuberias/topologia/resolverConectividadInicialDeArtefacto'
import { quitarConectividadFisicaDeArtefacto } from './quitarConectividadFisicaDeArtefacto'
import { podarNodosSinSalida } from './podarNodosSinSalida'
import { sincronizarConectividadFisicaDeArtefactoConRedesDeclaradas } from './sincronizarConectividadFisicaDeArtefacto'

export function reconciliarConectividadFisicaPorCambioDeArtefacto(
  // Proyecto con el nuevo `artefactoId` YA aplicado en la instancia (y, si
  // corresponde, con `conectividadElegida` ya seteada o ya limpiada).
  proyecto: Proyecto,
  unidadFuncionalId: string,
  localId: string,
  artefactoInstanciaId: string,
): Proyecto {
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    return proyecto
  }

  const unidadFuncional = proyecto.unidadesFuncionales.find((uf) => uf.id === unidadFuncionalId)
  const local = unidadFuncional?.locales.find((l) => l.id === localId)
  const artefacto = local?.artefactos.find((a) => a.id === artefactoInstanciaId)
  if (artefacto === undefined) {
    return proyecto
  }

  const idsNodosDeLaInstancia = new Set(
    redHidraulica.nodos
      .filter(
        (nodo) =>
          nodo.referencia?.tipo === 'artefacto' &&
          nodo.referencia.unidadFuncionalId === unidadFuncionalId &&
          nodo.referencia.localId === localId &&
          nodo.referencia.artefactoId === artefactoInstanciaId,
      )
      .map((nodo) => nodo.id),
  )
  const redesActuales = new Set<RedDeTramo>(
    redHidraulica.tramos.filter((tramo) => idsNodosDeLaInstancia.has(tramo.nodoDestinoId)).map((tramo) => tramo.red),
  )

  const resol = resolverConectividadInicialDeArtefacto(artefacto.artefactoId, artefacto.conectividadElegida)
  if (resol.tipo !== 'resuelta') {
    // `requiereSeleccion` todavía sin declarar, o `tipoDesconocido`: NO se
    // toca la topología acá. Para `requiereSeleccion` el caller no llega a
    // invocar esta función hasta que el usuario confirma la alimentación
    // (flujo de declaración pendiente); este early-return es la red de
    // seguridad para cualquier otra ruta.
    return proyecto
  }
  const redesNuevas = new Set<RedDeTramo>(resol.redes)

  let resultado = proyecto
  let seEliminoAlgo = false
  for (const red of redesActuales) {
    if (!redesNuevas.has(red)) {
      resultado = quitarConectividadFisicaDeArtefacto(resultado, unidadFuncionalId, localId, artefactoInstanciaId, red)
      seEliminoAlgo = true
    }
  }
  if (seEliminoAlgo && resultado.redHidraulica !== undefined) {
    resultado = { ...resultado, redHidraulica: podarNodosSinSalida(resultado.redHidraulica) }
  }

  const faltaAlgunaRed = [...redesNuevas].some((red) => !redesActuales.has(red))
  if (faltaAlgunaRed) {
    // Se pasan las Redes ya resueltas: la sincronización es idempotente
    // para las Redes que ya tienen terminal (conserva su topología
    // intacta) y sólo crea las que faltan.
    const sincronizacion = sincronizarConectividadFisicaDeArtefactoConRedesDeclaradas(
      resultado,
      unidadFuncionalId,
      localId,
      artefactoInstanciaId,
      [...redesNuevas],
    )
    if (sincronizacion.tipo === 'sincronizado') {
      resultado = sincronizacion.proyecto
    }
  }

  return resultado
}
