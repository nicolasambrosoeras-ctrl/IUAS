// MATERIALS-ACCESSORIES-01: estimación constructiva DREZA de accesorios
// PPR para el listado de materiales -- reemplaza por completo la
// composición física por defecto de ACCESSORIES-DEFAULTS-01 (D-δ.139,
// decisión de dominio del usuario al cerrar este slice: "la nueva
// estimación DREZA de accesorios de Locales debe reemplazar
// completamente la anterior, se elimina"). Nunca toca hf/Ks/K-estimadas
// (HYD-EST) ni CRIT-A30 (ninguna función de este archivo infiere una
// "Reducción" a partir de un cambio de DN): esto es exclusivamente una
// aproximación de COMPRA para tres sectores físicos -- Colector
// principal, Montantes, Redes de los locales -- más una regla global de
// uniones/cuplas rectas cada ~4 m de cañería.
//
// Alcance de activación (D-δ.141): las tres funciones por sector
// (`resolverAccesoriosDeLocalesDreza`, `resolverAccesoriosDeMontantesDreza`,
// `resolverAccesoriosDeColectorDreza`) sólo se invocan cuando
// `granularidadHidraulica === 'simplificada' Y metodoPerdidaLocalizada
// === 'estimado'` -- EXACTAMENTE el mismo gate que ya usaba
// ACCESSORIES-DEFAULTS-01, ahora extendido a Montantes y Colector además
// de Locales. Se preserva a propósito (no es una limitación nueva): en
// 'detallado' el usuario releva sus propios accesorios (Tramo.accesorios/
// Nodo.tee) y una estimación genérica encima duplicaría piezas sin forma
// de saber, por tramo, qué ya está cubierto; en 'profesional' cualquier
// bifurcación 1→2 exige su Tee real (resolverTees), así que una
// estimación de Colector/Montante ajena a esa topología volvería a
// colisionar. `resolverUnionesRectasDreza` es la ÚNICA función de este
// archivo que corre SIEMPRE (fuera de ese gate): las uniones cada 4 m son
// un hecho de empaquetado de la cañería (barras de ~4 m), independiente
// del método de estimación de pérdidas localizadas -- sólo depende de que
// el sistema adoptado sea PPR.
//
// Precedencia (brief §3.2): Accesorio explícito Detailed > Accesorio
// inferido inequívocamente (Tee real de `resolverTees`) > Estimación
// constructiva DREZA > Pendiente. El único punto de colisión real posible
// dentro del gate de activación es la Tee real de una bifurcación de
// Montante (`resolverTees` la computa "en cualquier granularidad",
// también dentro de 'simplificada'+'estimado'): `resolverAccesoriosDeMontantesDreza`
// descuenta explícitamente las derivaciones que YA tienen `Nodo.tee`
// configurado (decisión de dominio del usuario, opción A) en vez de
// sumarlas de nuevo.
import type { Proyecto, Local } from '../../modelo/proyecto'
import type { RedDeTramo, RedHidraulica } from '../../modelo/redHidraulica'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import { obtenerMaterialTuberia, catalogoMaterialesTuberia } from '../../motor/tuberias/materialTuberia'
import { catalogoSistemasDeTuberia } from '../../motor/tuberias/sistemaDeTuberia'
import { resolverDiametroComercialDeTramo } from '../../motor/tuberias/resolverDiametroComercialDeTramo'
import type { ContextoDeCalculoM2 } from '../../motor/tuberias/contextoDeCalculoM2'
import { localesDeUnidadFuncional } from '../../motor/tuberias/geometria/resolverCotaHidraulicaDeArtefacto'
import { determinarConectividadFisica } from '../../motor/tuberias/caudal/determinarConectividadFisica'
import {
  identificarFilasDistribucionGeneral,
  identificarFilasPrincipalesDeLocales,
  ETIQUETA_COLECTOR_PRINCIPAL,
} from '../../interfaz/paginas/identificarFilasDeModulo2'
import { derivarLocalesServidos, reconstruirCadena } from '../../interfaz/paginas/reconciliarMontante'
import { derivacionesDeMontante, etiquetaSoloLocal } from '../../interfaz/paginas/montantesDelProyecto'
import { nombreDeMontante } from '../../interfaz/paginas/nombreDeMontante'
import { contarSobrepasosDeLocalPorRed } from '../../motor/tuberias/topologia/contarSobrepasosDeLocalPorRed'
import { resolverProductoSobrepasoAcquaSystem } from '../../motor/tuberias/materialTuberia/catalogoSobrepasoAcquaSystem'
import { SISTEMA_DE_TUBERIA_ACQUA_SYSTEM_ID } from '../../motor/tuberias/perdidaCarga/resolverKsDeAccesorioDeTramo'
import type { ItemAccesorioComputado } from './resolverDatosDeListadoDeMateriales'

// Ubicación física de un accesorio (MATERIALS-PDF-POLISH-02, brief §5):
// a diferencia de `SectorMaterial` (una categoría amplia usada para
// agrupar uniones y para el margen), esto identifica el bloque de
// trazabilidad concreto que el PDF muestra -- el Colector es un único
// bloque; cada Montante lleva su propio nombre humano ya resuelto
// (`nombreDeMontante`); cada Local lleva la identidad de su UF y su
// nombre propio (`etiquetaSoloLocal`), sin sufijo de UF -- el llamador
// decide si antepone la UF (sólo cuando hace falta desambiguar). Se
// completa para TODOS los ítems (definidos y estimados DREZA) para que
// ningún accesorio del detalle quede sin bloque de ubicación.
export type UbicacionMaterial =
  | { readonly tipo: 'colectorPrincipal' }
  | { readonly tipo: 'montante'; readonly montanteId: string; readonly nombre: string }
  | {
      readonly tipo: 'local'
      readonly unidadFuncionalId: string
      readonly localId: string
      readonly unidadFuncionalNombre: string
      readonly localNombre: string
    }

// Sector físico constructivo (brief §4 de MATERIALS-ACCESSORIES-01):
// dimensión de agrupación ortogonal a `origen` (definido/estimadoDreza) y
// a `red` (AF/AC), usada por la regla de uniones para no mezclar
// recorridos independientes. Coincide exactamente con `UbicacionMaterial['tipo']`
// -- se deriva de ahí para no duplicar el enum.
export type SectorMaterial = UbicacionMaterial['tipo']

// Clave de agrupación estable de una ubicación (identidad completa, no
// sólo el sector amplio): usada para no mezclar cuplas de dos Montantes
// distintos, o de dos Locales distintos, aunque compartan sector/DN/red,
// y reusada por el constructor del PDF para agrupar el detalle en
// bloques (brief §5/§6 de MATERIALS-PDF-POLISH-02).
export function claveDeUbicacion(ubicacion: UbicacionMaterial): string {
  switch (ubicacion.tipo) {
    case 'colectorPrincipal':
      return 'colectorPrincipal'
    case 'montante':
      return `montante:${ubicacion.montanteId}`
    case 'local':
      return `local:${ubicacion.unidadFuncionalId}:${ubicacion.localId}`
  }
}

export function etiquetaSector(sector: SectorMaterial): string {
  switch (sector) {
    case 'colectorPrincipal':
      return 'Colector principal'
    case 'montante':
      return 'Montante'
    case 'local':
      return 'Red del local'
  }
}

// Cuenta, para UN Local, cuántas bocas hidráulicas físicas (ponderadas por
// `Artefacto.cantidad`, brief §6.4/Caso I) tiene cada red. Inspección
// estructural directa (mismo patrón que contarTerminalesFisicosDeLocal/
// determinarConectividadFisica), pero a diferencia de esas dos, agrega
// `cantidad` en vez de contar nodos/referencias 1 a 1: un Artefacto con
// `cantidad=3` es UN solo Nodo.referencia en RedHidraulica (representa el
// grupo, no cada unidad física), así que las funciones existentes lo
// contarían como 1 -- acá se pondera explícitamente.
//
// HYD-OVERPASS-01: el conteo de Sobrepaso ya NO se calcula acá -- se
// delegó por completo a `contarSobrepasosDeLocalPorRed` (motor/tuberias/
// topologia), la MISMA fuente que consume el balance hidráulico
// (resolverPerdidaLocalizadaEstimadaDeLocal), para que ambos nunca puedan
// divergir. Antes de este slice, el Sobrepaso se generaba acá con "1 por
// Local" sin red/DN asignados (bug corregido: ver docs/HYD-OVERPASS-01.md).
function medirTerminalesFisicosDeLocal(
  redHidraulica: RedHidraulica,
  local: Local,
  unidadFuncionalId: string,
  localId: string,
): { readonly bocasPorRed: Readonly<Record<RedDeTramo, number>> } {
  let af = 0
  let ac = 0
  for (const artefacto of local.artefactos) {
    const tieneTerminal = redHidraulica.nodos.some(
      (nodo) =>
        nodo.referencia?.tipo === 'artefacto' &&
        nodo.referencia.unidadFuncionalId === unidadFuncionalId &&
        nodo.referencia.localId === localId &&
        nodo.referencia.artefactoId === artefacto.id,
    )
    if (!tieneTerminal) {
      continue
    }
    const conectividad = determinarConectividadFisica(redHidraulica, {
      tipo: 'artefacto',
      unidadFuncionalId,
      localId,
      artefactoId: artefacto.id,
    })
    if (conectividad === 'soloAF' || conectividad === 'ambas') {
      af += artefacto.cantidad
    }
    if (conectividad === 'soloAC' || conectividad === 'ambas') {
      ac += artefacto.cantidad
    }
  }
  return { bocasPorRed: { AF: af, AC: ac } }
}

// Sector "Redes de los locales" (brief §6). Reemplaza por completo la
// composición física de ACCESSORIES-DEFAULTS-01: llave de paso + codos de
// recorrido + sobrepasos + terminales roscados (tee roscada / codo
// terminal roscado, en vez de una única "tee estimada" genérica).
export function resolverAccesoriosDeLocalesDreza(
  proyecto: Proyecto,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  contexto: ContextoDeCalculoM2,
  etiquetaDePendiente: (tramoId: string, red: RedDeTramo) => string,
  pendientes: string[],
): ItemAccesorioComputado[] {
  const { redHidraulica } = proyecto
  if (redHidraulica === undefined) {
    return []
  }

  // Agrupa las filas principales por (UF, Local): cada fila ya trae, por
  // separado, el Tramo representativo de esa red -- se necesita el par
  // completo (AF y AC, cuando existan) porque un Artefacto con AF+AC
  // requiere conocer ambas redes para decidir a cuál se asigna su
  // Sobrepaso (HYD-OVERPASS-01: siempre a AC, ver contarSobrepasosDeLocalPorRed).
  const porLocal = new Map<
    string,
    { unidadFuncionalId: string; localId: string; tramoIdPorRed: Map<RedDeTramo, string> }
  >()
  for (const fila of identificarFilasPrincipalesDeLocales(proyecto)) {
    const clave = `${fila.unidadFuncionalId}|${fila.localId}`
    const entrada = porLocal.get(clave) ?? {
      unidadFuncionalId: fila.unidadFuncionalId,
      localId: fila.localId,
      tramoIdPorRed: new Map<RedDeTramo, string>(),
    }
    entrada.tramoIdPorRed.set(fila.red, fila.tramoId)
    porLocal.set(clave, entrada)
  }

  const items: ItemAccesorioComputado[] = []
  for (const { unidadFuncionalId, localId, tramoIdPorRed } of porLocal.values()) {
    const uf = proyecto.unidadesFuncionales.find((candidata) => candidata.id === unidadFuncionalId)
    const local = uf !== undefined ? localesDeUnidadFuncional(uf).find((candidato) => candidato.id === localId) : undefined
    if (uf === undefined || local === undefined) {
      continue
    }

    const { bocasPorRed } = medirTerminalesFisicosDeLocal(redHidraulica, local, unidadFuncionalId, localId)
    const ubicacion: UbicacionMaterial = {
      tipo: 'local',
      unidadFuncionalId,
      localId,
      unidadFuncionalNombre: uf.nombre,
      localNombre: etiquetaSoloLocal(uf, local),
    }
    // HYD-OVERPASS-01: el sobrepaso Acqua System sólo existe como producto
    // comercial cuando el sistema adoptado del proyecto es Acqua System --
    // para cualquier otro sistema no se genera (ni ítem ni pendiente): no
    // hay evidencia de que ese fabricante venda una pieza equivalente.
    const esSistemaAcqua = proyecto.configuracionHidraulica.sistemaDeTuberiaId === SISTEMA_DE_TUBERIA_ACQUA_SYSTEM_ID

    for (const red of ['AF', 'AC'] as const) {
      const n = bocasPorRed[red]
      const nSobrepaso = esSistemaAcqua ? contarSobrepasosDeLocalPorRed(redHidraulica, local, unidadFuncionalId, localId, red) : 0
      if (n === 0 && nSobrepaso === 0) {
        continue
      }
      const tramoId = tramoIdPorRed.get(red)
      if (tramoId === undefined) {
        continue
      }
      const resultadoDn = resolverDiametroComercialDeTramo(proyecto, tramoId, catalogoArtefactos, catalogoSistemasDeTuberia, contexto)
      const dnComercial = resultadoDn.tipo === 'conCandidato' ? resultadoDn.candidato.denominacionComercial : undefined
      if (dnComercial === undefined) {
        pendientes.push(`${etiquetaDePendiente(tramoId, red)} — accesorios estimados con DN pendiente de definición`)
        continue
      }

      const clave = (sufijo: string) => `estimadoDreza|local|${unidadFuncionalId}|${localId}|${red}|${sufijo}`

      // Sobrepaso fusión (HYD-OVERPASS-01): vinculado al mismo Tramo
      // terminal (y por lo tanto al mismo DN adoptado) que el resto de la
      // red de este Local -- nunca "DN a definir" ni red "—". Sólo tres DN
      // comerciales existen para este producto (20/25/32 mm); fuera de esos
      // tres, se emite un pendiente trazable en vez de un código inventado.
      if (nSobrepaso > 0) {
        const producto = resolverProductoSobrepasoAcquaSystem(dnComercial)
        if (producto.tipo === 'resuelto') {
          items.push({
            clave: clave('sobrepaso'),
            etiqueta: 'Sobrepaso fusión',
            dnComercial,
            cantidadComputada: nSobrepaso,
            origen: 'estimadoDreza',
            sector: 'local',
            red,
            ubicacion,
            codigoComercial: producto.producto.codigo,
          })
        } else {
          pendientes.push(
            `${etiquetaDePendiente(tramoId, red)} — Sobrepaso fusión: Acqua System no comercializa DN ${dnComercial} para este producto (sólo 20/25/32 mm)`,
          )
        }
      }

      if (n === 0) {
        continue
      }
      items.push({ clave: clave('llave'), etiqueta: 'Llave de paso esférica', dnComercial, cantidadComputada: 1, origen: 'estimadoDreza', sector: 'local', red, ubicacion })
      items.push({ clave: clave('codoRecorrido'), etiqueta: 'Codo a 90° (recorrido del local)', dnComercial, cantidadComputada: 3, origen: 'estimadoDreza', sector: 'local', red, ubicacion })

      const teesRoscadas = Math.max(0, n - 1)
      if (teesRoscadas > 0) {
        items.push({ clave: clave('teeRoscada'), etiqueta: 'Tee roscada PPR', dnComercial, cantidadComputada: teesRoscadas, origen: 'estimadoDreza', sector: 'local', red, ubicacion })
      }
      items.push({ clave: clave('codoTerminal'), etiqueta: 'Codo terminal roscado PPR', dnComercial, cantidadComputada: 1, origen: 'estimadoDreza', sector: 'local', red, ubicacion })
    }
  }
  return items
}

// Sector "Montantes" (brief §7). Por cada Montante explícito con al menos
// 1 Local servido: llave de paso, tees de derivación (descontando las
// bifurcaciones que YA tienen `Nodo.tee` configurado -- decisión de
// dominio, opción A), codo del último Local (siempre, es un punto físico
// distinto de cualquier Tee -- el nodo "punta" 1→1 nunca es una
// derivación configurable) y codos de recorrido cada 2 m.
export function resolverAccesoriosDeMontantesDreza(
  proyecto: Proyecto,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  contexto: ContextoDeCalculoM2,
  pendientes: string[],
): ItemAccesorioComputado[] {
  const { redHidraulica, montantes } = proyecto
  if (redHidraulica === undefined || montantes === undefined || montantes.length === 0) {
    return []
  }

  const items: ItemAccesorioComputado[] = []
  for (const montante of montantes) {
    const cadena = reconstruirCadena(redHidraulica, montante.id)
    const segmentos = cadena?.segmentos ?? redHidraulica.tramos.filter((tramo) => tramo.montanteId === montante.id)
    if (segmentos.length === 0) {
      // Montante sin topología todavía (0 Locales, estado válido de
      // M2-TOPO-C): nada que estimar, y no es un "pendiente" -- no hay
      // ningún dato físico faltante, simplemente no existe nada que
      // comprar todavía.
      continue
    }

    const n = derivarLocalesServidos(proyecto, montante.id).length
    if (n === 0) {
      continue
    }

    const nombreMontante = nombreDeMontante(proyecto, montante.id)
    const primerSegmento = segmentos[0]!
    const resultadoDn = resolverDiametroComercialDeTramo(proyecto, primerSegmento.id, catalogoArtefactos, catalogoSistemasDeTuberia, contexto)
    const dnComercial = resultadoDn.tipo === 'conCandidato' ? resultadoDn.candidato.denominacionComercial : undefined
    if (dnComercial === undefined) {
      pendientes.push(`${nombreMontante} — accesorios estimados con DN pendiente de definición`)
      continue
    }
    const ubicacion: UbicacionMaterial = { tipo: 'montante', montanteId: montante.id, nombre: nombreMontante }

    const longitudTotal_m = segmentos.reduce((acumulado, tramo) => acumulado + (tramo.longitud_m ?? 0), 0)

    // Descuento de derivaciones ya resueltas explícitamente (opción A):
    // una bifurcación 1→2 del Montante con `Nodo.tee` configurado ya es
    // una Tee real 'definido' de `resolverTees` -- no debe volver a
    // contarse como Tee genérica DREZA para esa misma derivación física.
    const derivaciones = derivacionesDeMontante(proyecto, montante.id)
    const derivacionesYaResueltas = derivaciones.filter((derivacion) => derivacion.tipo === 'bifurcacion' && derivacion.teeConfigurada).length
    const derivacionesEsperadas = Math.max(0, n - 1)
    const teesMontante = Math.max(0, derivacionesEsperadas - derivacionesYaResueltas)
    const codosRecorrido = Math.floor(longitudTotal_m / 2)

    const clave = (sufijo: string) => `estimadoDreza|montante|${montante.id}|${sufijo}`
    items.push({ clave: clave('llave'), etiqueta: 'Llave de paso esférica', dnComercial, cantidadComputada: 1, origen: 'estimadoDreza', sector: 'montante', red: montante.red, ubicacion })
    if (teesMontante > 0) {
      items.push({ clave: clave('tee'), etiqueta: 'Tee de derivación (Montante)', dnComercial, cantidadComputada: teesMontante, origen: 'estimadoDreza', sector: 'montante', red: montante.red, ubicacion })
    }
    // Codo del último Local: punto físico SIEMPRE presente cuando n>0,
    // distinto de cualquier bifurcación/Tee (brief §7.2 -- "no generar
    // simultáneamente cuatro tees y un codo final" ya se respeta: acá el
    // codo reemplaza sólo a LA ÚLTIMA derivación dentro del conteo de
    // `derivacionesEsperadas`, nunca se suma una Tee de más por esto).
    items.push({ clave: clave('codoUltimoLocal'), etiqueta: 'Codo de último local (Montante)', dnComercial, cantidadComputada: 1, origen: 'estimadoDreza', sector: 'montante', red: montante.red, ubicacion })
    if (codosRecorrido > 0) {
      items.push({ clave: clave('codoRecorrido'), etiqueta: 'Codo a 90° (recorrido de Montante)', dnComercial, cantidadComputada: codosRecorrido, origen: 'estimadoDreza', sector: 'montante', red: montante.red, ubicacion })
    }
  }
  return items
}

// Sector "Colector principal" (brief §8). Corre por cada red (AF/AC) que
// tenga una fila de Distribución general clasificada como
// `ETIQUETA_COLECTOR_PRINCIPAL` (ver identificarFilasDeModulo2.ts). Las
// salidas del colector son los Montantes de esa red si existen, o los
// Locales alimentados directamente si no -- brief §8, generalizado a un
// escenario mixto (algunos Locales directos + algunos Montantes) sumando
// ambos grupos, que se reduce exactamente a los dos casos puros del
// brief (Caso D: sólo Montantes; Caso E: sólo Locales directos).
export function resolverAccesoriosDeColectorDreza(
  proyecto: Proyecto,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  contexto: ContextoDeCalculoM2,
  pendientes: string[],
): ItemAccesorioComputado[] {
  const { redHidraulica, montantes, configuracionAbastecimiento } = proyecto
  if (redHidraulica === undefined) {
    return []
  }

  const filasGenerales = identificarFilasDistribucionGeneral(proyecto)
  const tieneTanqueSuperior =
    configuracionAbastecimiento?.esquema === 'tanqueElevado' || configuracionAbastecimiento?.esquema === 'cisternaBombeoElevado'
  const tieneAlimentacionAcs = filasGenerales.some((fila) => fila.etiqueta === 'Alimentación ACS')

  const items: ItemAccesorioComputado[] = []
  for (const red of ['AF', 'AC'] as const) {
    const filaColector = filasGenerales.find((fila) => fila.etiqueta === ETIQUETA_COLECTOR_PRINCIPAL && fila.red === red)
    if (filaColector === undefined) {
      continue
    }

    const resultadoDn = resolverDiametroComercialDeTramo(proyecto, filaColector.tramoId, catalogoArtefactos, catalogoSistemasDeTuberia, contexto)
    const dnComercial = resultadoDn.tipo === 'conCandidato' ? resultadoDn.candidato.denominacionComercial : undefined
    if (dnComercial === undefined) {
      pendientes.push(`${ETIQUETA_COLECTOR_PRINCIPAL} (${red}) — accesorios estimados con DN pendiente de definición`)
      continue
    }

    const montantesDeRed = (montantes ?? []).filter((montante) => montante.red === red)
    const localesServidosPorMontante = new Set<string>()
    for (const montante of montantesDeRed) {
      for (const servido of derivarLocalesServidos(proyecto, montante.id)) {
        localesServidosPorMontante.add(`${servido.unidadFuncionalId}|${servido.localId}`)
      }
    }
    const localesDirectos = identificarFilasPrincipalesDeLocales(proyecto).filter(
      (fila) => fila.red === red && !localesServidosPorMontante.has(`${fila.unidadFuncionalId}|${fila.localId}`),
    )
    const nSalidas = montantesDeRed.length + localesDirectos.length

    const ubicacion: UbicacionMaterial = { tipo: 'colectorPrincipal' }
    const clave = (sufijo: string) => `estimadoDreza|colector|${red}|${sufijo}`
    items.push({ clave: clave('llave'), etiqueta: 'Llave de paso esférica (general)', dnComercial, cantidadComputada: 1, origen: 'estimadoDreza', sector: 'colectorPrincipal', red, ubicacion })

    if (nSalidas > 0) {
      const teesDistribucion = Math.max(0, nSalidas - 1)
      if (teesDistribucion > 0) {
        items.push({ clave: clave('teeDistribucion'), etiqueta: 'Tee de distribución (Colector)', dnComercial, cantidadComputada: teesDistribucion, origen: 'estimadoDreza', sector: 'colectorPrincipal', red, ubicacion })
      }
      items.push({ clave: clave('codoUltimaSalida'), etiqueta: 'Codo de última salida (Colector)', dnComercial, cantidadComputada: 1, origen: 'estimadoDreza', sector: 'colectorPrincipal', red, ubicacion })
    }

    // Codos propios del colector (brief §8.6): estimación fija, no la
    // regla de "1 cada 2 m" (exclusiva de Montantes).
    items.push({ clave: clave('codoRecorrido'), etiqueta: 'Codo a 90° (Colector)', dnComercial, cantidadComputada: 2, origen: 'estimadoDreza', sector: 'colectorPrincipal', red, ubicacion })

    // ACS, caño ruptor y unión al tanque son piezas del lado AF del
    // colector (brief §8.3/§8.4/§8.5): la Tee de ACS deriva agua FRÍA
    // hacia la producción de ACS; el ruptor y la unión desmontable cuelgan
    // de la alimentación de entrada al tanque, siempre AF.
    if (red === 'AF' && tieneAlimentacionAcs) {
      items.push({ clave: clave('teeAcs'), etiqueta: 'Tee de alimentación ACS', dnComercial, cantidadComputada: 1, origen: 'estimadoDreza', sector: 'colectorPrincipal', red, ubicacion })
    }
    if (red === 'AF' && tieneTanqueSuperior) {
      items.push({ clave: clave('teeRuptor'), etiqueta: 'Tee de conexión de caño ruptor', dnComercial, cantidadComputada: 1, origen: 'estimadoDreza', sector: 'colectorPrincipal', red, ubicacion })
      items.push({ clave: clave('unionTanque'), etiqueta: 'Unión doble PPR (al tanque)', dnComercial, cantidadComputada: 1, origen: 'estimadoDreza', sector: 'colectorPrincipal', red, ubicacion })
    }
  }
  return items
}

// Regla pura de uniones/cuplas rectas cada 4 m (brief §9): expuesta por
// separado para poder testearla sin construir un Proyecto completo.
export function calcularUnionesRectasPorLongitud(longitudTotal_m: number): number {
  return Math.floor(longitudTotal_m / 4)
}

// Uniones/cuplas rectas cada ~4 m (brief §9), agrupadas por Material + Red
// + DN + Sector para no unir recorridos independientes (AF con AC, DN20
// con DN25, Colector con Montante). Corre SIEMPRE que el sistema adoptado
// sea PPR -- es un hecho de empaquetado de la cañería, no una aproximación
// de pérdida localizada, así que es independiente del gate de
// granularidad/método que sí aplica a Locales/Montantes/Colector. Reusa
// el mismo criterio de "Tramo computable" que `resolverTuberiasYAccesorios`
// (longitud_m > 0 y DN comercial resoluble) para no unir metros que el
// resto del listado tampoco computa, pero agrupa además por sector -- una
// dimensión que esa función no necesita para su propio propósito.
export function resolverUnionesRectasDreza(
  proyecto: Proyecto,
  catalogoArtefactos: readonly ArtefactoNormativo[],
  contexto: ContextoDeCalculoM2,
  resolverUbicacionDeTramo: (tramoId: string) => UbicacionMaterial,
  tramoExcluido: (tramoId: string) => boolean,
): ItemAccesorioComputado[] {
  const { redHidraulica, configuracionHidraulica } = proyecto
  if (redHidraulica === undefined || configuracionHidraulica.materialTuberiaId !== 'ppr') {
    return []
  }
  // El nombre comercial del material no participa de la agrupación (ya es
  // el único material posible bajo el gate de arriba) -- se resuelve sólo
  // para dejar sentado que la regla es específica de PPR, mismo criterio
  // que el resto del cómputo (nunca asume el catálogo, siempre lo resuelve).
  obtenerMaterialTuberia(configuracionHidraulica.materialTuberiaId, catalogoMaterialesTuberia)

  const acumulador = new Map<string, { red: RedDeTramo; dnComercial: string; ubicacion: UbicacionMaterial; longitud_m: number }>()
  for (const tramo of redHidraulica.tramos) {
    if (tramoExcluido(tramo.id)) {
      continue
    }
    const longitudValida = tramo.longitud_m !== undefined && tramo.longitud_m > 0
    if (!longitudValida) {
      continue
    }
    const resultadoDn = resolverDiametroComercialDeTramo(proyecto, tramo.id, catalogoArtefactos, catalogoSistemasDeTuberia, contexto)
    if (resultadoDn.tipo !== 'conCandidato') {
      continue
    }
    const dnComercial = resultadoDn.candidato.denominacionComercial
    const ubicacion = resolverUbicacionDeTramo(tramo.id)
    // Agrupa por el SECTOR amplio (`ubicacion.tipo`) además de red/DN --
    // EXACTAMENTE el mismo criterio de agrupación ya cerrado en
    // MATERIALS-ACCESSORIES-01 (D-δ.141: "material + red + DN + sector
    // físico"), preservado sin cambios a propósito: MATERIALS-PDF-POLISH-02
    // (brief §2) prohíbe modificar cantidades DREZA ya resueltas, y
    // agrupar por ubicación individual (un Montante o Local específico en
    // vez del sector) cambia el resultado de `floor(L/4)` cuando dos
    // ubicaciones del mismo sector/red/DN tienen longitudes que sólo
    // superan el umbral de 4 m SUMADAS -- alteraría el total ya validado
    // (65,00 m / 71,50 m / 88 u / 105 u del proyecto de referencia, brief
    // §2/§18). Costo aceptado: una cupla que agrega Montantes/Locales
    // distintos del mismo sector muestra sólo la ubicación del ÚLTIMO
    // Tramo agrupado (ver `ubicacion` más abajo) -- imprecisión menor y
    // ya preexistente, no introducida por este slice.
    const clave = `${tramo.red}|${dnComercial}|${ubicacion.tipo}`
    const existente = acumulador.get(clave)
    acumulador.set(clave, {
      red: tramo.red,
      dnComercial,
      ubicacion,
      longitud_m: (existente?.longitud_m ?? 0) + (tramo.longitud_m as number),
    })
  }

  const items: ItemAccesorioComputado[] = []
  for (const [clave, grupo] of acumulador) {
    const cantidad = calcularUnionesRectasPorLongitud(grupo.longitud_m)
    if (cantidad <= 0) {
      continue
    }
    items.push({
      clave: `estimadoDreza|union|${clave}`,
      etiqueta: 'Cupla recta PPR',
      dnComercial: grupo.dnComercial,
      cantidadComputada: cantidad,
      origen: 'estimadoDreza',
      sector: grupo.ubicacion.tipo,
      red: grupo.red,
      ubicacion: grupo.ubicacion,
    })
  }
  return items
}
