// PERF-SCALE-01E -- comparador de React.memo para `SeccionDeUnidadFuncional`
// (una tarjeta de Módulo 2 = una Unidad Funcional completa, dentro de
// ResultadoHidraulicoDeTramo). Objetivo: cuando se agrega/dulplica/elimina
// OTRA UF, esta UF (cuyos propios datos no cambiaron) no debe volver a
// ejecutar su función de render ni reconciliar su subárbol -- hoy lo hace
// porque el memo EXTERNO (sonPropsDeDimensionamientoEquivalentes) compara
// `unidadesFuncionales` por referencia completa, y esa referencia siempre
// cambia al agregar una UF (aunque sea vacía).
//
// Auditoría recíproca (misma disciplina que FIX-MONTANTE-ADD-01: "qué lee
// realmente este árbol", no "qué parece hidráulicamente relevante") sobre
// TODO lo que SeccionDeUnidadFuncional y sus hijos (LocalYRedCard,
// TeeDeNodoEditor, AccesoriosDeTramoEditor, resolverFilaDeDimensionamiento,
// resolverControlDeDnDeTramo, resolverResultadoDeTramoParaUi,
// construirArbolDeLocal) leen de `Proyecto` -- grep confirmado, sólo:
//   - `uf` (la propia Unidad Funcional: nombre, nivel, cota, locales,
//     artefactos)
//   - `proyecto.redHidraulica.tramos` (longitud, accesorios, DN adoptado,
//     montanteId)
//   - `proyecto.redHidraulica.nodos` -- SOLO el campo `tee` (TeeDeNodoEditor)
//   - `proyecto.configuracionHidraulica` (método de pérdida, granularidad,
//     material, sistema)
//   - `proyecto.parametros.tipoDeProyecto` (coeficiente de simultaneidad `a`
//     -- resolverHidraulicaDeTramo lo lee para Qc/DN/V de cada tramo;
//     FIX-M2-A-PROP-01: faltaba y quedaba stale al cambiar `a`)
//   - `catalogoArtefactos`, `onCambiar`
// Nada de este árbol lee `proyecto.montantes` ni `proyecto.modoTrabajo`
// directamente (ConstructorDeMontantes es un HERMANO en el JSX, no un hijo
// de SeccionDeUnidadFuncional) -- por eso NO se comparan acá.
//
// Deliberadamente EXCLUIDOS de la comparación, aunque son props reales:
//   - `proyecto` (la referencia completa): siempre cambia cuando el
//     Proyecto cambia, incluso si nada de lo que este árbol lee cambió.
//     Los campos que SÍ importan ya se comparan arriba.
//   - `filasPrincipalesDeLocales`: se recalcula ENTERO (array nuevo) en el
//     padre en cada render de ResultadoHidraulicoDeTramoBase, pero su
//     contenido para ESTA uf es una función pura de
//     (redHidraulica.tramos, redHidraulica.nodos, unidadesFuncionales) --
//     si tramos/nodos.tee no cambiaron Y esta uf no cambió, el subconjunto
//     de filas de esta uf tampoco cambió (test de equivalencia en
//     sonPropsDeSeccionDeUnidadFuncionalEquivalentes.test.ts).
//   - `contextoDeCalculo`: instancia NUEVA en cada render de
//     ResultadoHidraulicoDeTramoBase (useMemo con dependencia [proyecto],
//     PERF-SCALE-01C/01D) -- es un caché de deduplicación DENTRO de una
//     sola resolución, no una fuente de datos; si el memo salta el render
//     de esta UF, React reutiliza su último resultado ya calculado y este
//     contexto simplemente nunca se toca para ella. Ninguna de las dos
//     exclusiones reabre invalidación global (§9 del brief): son
//     dependencias explícitas, auditadas, locales a este comparador -- no
//     un caché ni un motor de invalidación nuevo.
import { sonNodosDeTeeEquivalentes } from './sonPropsDeDimensionamientoEquivalentes'
import type { Proyecto } from '../../modelo/proyecto'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import type { identificarFilasPrincipalesDeLocales } from './identificarFilasDeModulo2'
import type { ContextoDeCalculoM2 } from '../../motor/tuberias/contextoDeCalculoM2'

export type PropsDeSeccionDeUnidadFuncional = {
  readonly proyecto: Proyecto
  readonly uf: Proyecto['unidadesFuncionales'][number]
  readonly catalogoArtefactos: readonly ArtefactoNormativo[]
  readonly filasPrincipalesDeLocales: ReturnType<typeof identificarFilasPrincipalesDeLocales>
  readonly onCambiar: (proyecto: Proyecto) => void
  readonly contextoDeCalculo: ContextoDeCalculoM2
}

export function sonPropsDeSeccionDeUnidadFuncionalEquivalentes(
  prev: PropsDeSeccionDeUnidadFuncional,
  next: PropsDeSeccionDeUnidadFuncional,
): boolean {
  return (
    prev.uf === next.uf &&
    prev.proyecto.redHidraulica?.tramos === next.proyecto.redHidraulica?.tramos &&
    sonNodosDeTeeEquivalentes(prev.proyecto.redHidraulica?.nodos, next.proyecto.redHidraulica?.nodos) &&
    prev.proyecto.configuracionHidraulica === next.proyecto.configuracionHidraulica &&
    // FIX-M2-A-PROP-01: resolverFilaDeDimensionamiento/resolverControlDeDnDeTramo
    // leen proyecto.parametros.tipoDeProyecto (coeficiente de simultaneidad `a`)
    // directamente para Qc/DN/V por tramo -- estructural para esta UF, no sólo
    // para Demanda (M1).
    prev.proyecto.parametros.tipoDeProyecto === next.proyecto.parametros.tipoDeProyecto &&
    prev.catalogoArtefactos === next.catalogoArtefactos &&
    prev.onCambiar === next.onCambiar
  )
}
