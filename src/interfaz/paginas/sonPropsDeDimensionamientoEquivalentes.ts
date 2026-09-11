// PERF-SCALE-01D -- comparador de React.memo para `ResultadoHidraulicoDeTramo`
// (la sección "Tuberías", exclusivamente de DIMENSIONAMIENTO: Qc/DN/V/hf).
// Vive fuera de ResultadoHidraulicoDeTramo.tsx para poder testearse sin
// arrastrar React/JSX (mismo criterio que duplicarUnidadFuncional.ts) y para
// no violar react-refresh/only-export-components (un .tsx de componente no
// debe exportar además una función suelta).
//
// El dimensionamiento nunca lee `Nodo.cota_m`, `parametros.desnivelConexion_m`
// ni `parametros.presionSobreAcera_m` -- auditado por grep sobre todo
// `interfaz/paginas/**`: ningún archivo del árbol de render de Tuberías
// (DistribucionGeneral, DistribucionSecundaria, SeccionDeUnidadFuncional,
// ConstructorDeMontantes, resolverFilaDeDimensionamiento,
// resolverControlDeDnDeTramo, resolverResultadoDeTramoParaUi) referencia
// ninguno de esos tres campos; sólo los usan PanelDePresionDeModulo2.tsx y
// PanelDeModulo4.tsx, que son secciones DISTINTAS (Verificación hidráulica /
// Abastecimiento, UI-01A / D-δ.72). Por eso, un cambio que sólo toca esos
// campos (editar "Pelo de agua mínimo" o el desnivel/presión de conexión)
// preserva intactas las referencias de `unidadesFuncionales`,
// `redHidraulica.tramos` y `configuracionHidraulica` -- los mutadores
// correspondientes (conCotaDeNodo, conDesnivelConexion, conParametro...)
// sólo reconstruyen `parametros` o `redHidraulica.nodos` (spread superficial,
// nunca tocan `unidadesFuncionales` ni `redHidraulica.tramos`). Sin este
// memo, cada tecla en esos campos re-renderizaba las ~20+ secciones de UF
// completas (medido: ~1 s de commit a 21 UF) para un resultado de
// dimensionamiento bit a bit idéntico (ver
// contextoDeCalculoM2.equivalencia.test.ts para la equivalencia del propio
// cálculo). `modoTrabajo` se incluye por margen de seguridad aunque hoy no
// se lee en este árbol.
//
// Cualquier edición que SÍ deba re-renderizar Tuberías (agregar/eliminar
// artefacto, duplicar UF, editar longitud/accesorios/DN de un Tramo, cambiar
// método de pérdida/granularidad) reconstruye `unidadesFuncionales` y/o
// `redHidraulica.tramos` y/o `configuracionHidraulica` -- el comparador
// vuelve `false` y React re-renderiza normalmente.
import type { Proyecto } from '../../modelo/proyecto'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'

export type PropsDeDimensionamiento = {
  readonly proyecto: Proyecto
  readonly catalogoArtefactos: readonly ArtefactoNormativo[]
  readonly onCambiar: (proyecto: Proyecto) => void
}

export function sonPropsDeDimensionamientoEquivalentes(
  prev: PropsDeDimensionamiento,
  next: PropsDeDimensionamiento,
): boolean {
  return (
    prev.proyecto.unidadesFuncionales === next.proyecto.unidadesFuncionales &&
    prev.proyecto.redHidraulica?.tramos === next.proyecto.redHidraulica?.tramos &&
    prev.proyecto.configuracionHidraulica === next.proyecto.configuracionHidraulica &&
    prev.proyecto.modoTrabajo === next.proyecto.modoTrabajo &&
    prev.catalogoArtefactos === next.catalogoArtefactos &&
    prev.onCambiar === next.onCambiar
  )
}
