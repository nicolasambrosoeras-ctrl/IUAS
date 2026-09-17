// HYD-ACQUA-K-CATALOG-01: catálogo de coeficientes de resistencia (K/R)
// del FABRICANTE (Grupo Dema / Acqua System®) para su propia línea de
// accesorios PPR, keyed por identidad de dominio -- capa que traduce cada
// fila de `tablaOficialAcquaSystem.ts` (dato puro, sin lógica) a un
// accesorio consultable por el resto del motor.
//
// En la formulación del fabricante h_local = Σ R·V²/2g (idéntica a
// Js=Ks·V²/2g, CRIT-A26): R es numéricamente equivalente al K que ya usa
// el programa -- no hay conversión de unidades ni de fórmula, sólo una
// fuente de valores distinta según el sistema comercial adoptado.
//
// Deliberadamente DISTINTO de `tabla-07-perdidas-localizadas`
// (ERAS-2023 §2.12.1, transcripción normativa que sigue firme, sin
// cambios, para cualquier sistema/material que NO sea Acqua System --
// hierro, cobre, PVC genérico, etc.). Selección de catálogo en
// `resolverKsDeAccesorioDeTramo.ts` (dominio hidráulico, nunca en el PDF
// ni en Materials).
//
// Procedencia de cada entrada (nunca implícita, siempre consultable):
//   - oficialFabricante: valor publicado tal cual por Acqua System para
//     esa pieza puntual.
//   - oficialFabricanteSimplificado: valor oficial de una fila concreta,
//     adoptado como aproximación deliberada de un fenómeno más amplio
//     (la Tee estimada -- ver más abajo), no un promedio ni una
//     interpolación.
//   - equivalenciaDocumentada: valor construido por composición de otras
//     filas oficiales (el Sobrepaso -- 2 codos a 45°), nunca publicado
//     por el fabricante para esa pieza específica.
//   - fallbackNormativoERAS: el fabricante no publica coeficiente propio
//     -- se conserva Tabla N°7 (ver `resolverKsDeAccesorioDeTramo.ts`,
//     donde ocurre realmente el fallback; este catálogo simplemente NO
//     incluye una fila para esos ids).
//   - pendiente: sin valor Acqua ni ERAS -- no aplica hoy a ningún
//     accesorio de `IdAccesorioDeTramo` (todos tienen al menos Tabla N°7).
import type { NumeroFilaOficialAcquaSystem } from './tablaOficialAcquaSystem'
import { obtenerFilaOficialAcquaSystem, FUENTE_MANUAL_ACQUA_SYSTEM } from './tablaOficialAcquaSystem'
import { obtenerKsDeAccesorio } from '../../../normativa/eras-2023/tabla-07-perdidas-localizadas'

export type ProcedenciaK = 'oficialFabricante' | 'oficialFabricanteSimplificado' | 'equivalenciaDocumentada' | 'fallbackNormativoERAS' | 'pendiente'

// Subconjunto de `IdAccesorioDeTramo` (modelo/redHidraulica) con
// cobertura propia en el catálogo Acqua System, MÁS dos identidades
// propias de este catálogo sin id de Tramo.accesorios equivalente todavía:
//   - `teeEstimadaDistributiva`: consumida directamente por
//     resolverPerdidaLocalizadaEstimadaDeLocal.ts (HYD-EST), nunca por
//     resolverKsDeAccesorioDeTramo (las Tees no son declarables sobre
//     Tramo, CRIT-A28).
//   - `teeConRoscaCentralMetalica`/`terminalRectoRoscado`/
//     `codoTerminalRoscado`: transcripción informativa de los ítems 9/10/11
//     del manual -- sin consumidor de cálculo en este incremento (ninguna
//     geometría del dominio actual los necesita todavía), expuestos para
//     que el catálogo esté completo y auditable.
// `reducciones` NO vive acá: su K depende del salto de diámetro real
// (ver `clasificarSaltoDeReduccion.ts`/`resolverKsDeReduccion.ts`), nunca
// de un valor fijo por id.
export type IdAccesorioConKAcquaSystem =
  | 'uniones'
  | 'codo90'
  | 'curva45'
  | 'curva90'
  | 'sobrepaso'
  | 'teeEstimadaDistributiva'
  | 'teeConRoscaCentralMetalica'
  | 'terminalRectoRoscado'
  | 'codoTerminalRoscado'
  // fallbackNormativoERAS explícito (ver más abajo): Acqua System no
  // publica coeficiente propio para estas 3 piezas -- se documentan acá
  // con el valor de Tabla N°7, NO como si fueran valores del fabricante
  // (resolverKsDeAccesorioDeTramo.ts sigue reportando catalogo:'eras2023TablaN7'
  // para ellas, mirando `procedencia`, no la mera presencia en esta lista).
  | 'llaveDePaso'
  | 'valvulaEsclusa'
  | 'tuboSaliente'

export type FilaKAcquaSystem = {
  readonly id: IdAccesorioConKAcquaSystem
  readonly nombreAcqua: string
  readonly ks: number
  readonly itemManual: NumeroFilaOficialAcquaSystem | 'n/a'
  readonly procedencia: ProcedenciaK
  readonly fuente: string
  readonly ambito: string
}

function filaOficial(
  id: IdAccesorioConKAcquaSystem,
  numero: NumeroFilaOficialAcquaSystem,
  procedencia: ProcedenciaK,
  ambito: string,
): FilaKAcquaSystem {
  const oficial = obtenerFilaOficialAcquaSystem(numero)
  return {
    id,
    nombreAcqua: oficial.nombreFabricante,
    ks: oficial.r,
    itemManual: numero,
    procedencia,
    fuente: FUENTE_MANUAL_ACQUA_SYSTEM,
    ambito,
  }
}

export const catalogoKAccesoriosAcquaSystem: readonly FilaKAcquaSystem[] = [
  filaOficial('uniones', '1', 'oficialFabricante', 'Tramo.accesorios (modo detallado) -- ID normativo equivalente a "Unión normal".'),
  filaOficial('codo90', '3', 'oficialFabricante', 'Tramo.accesorios (modo detallado). Acqua System no fabrica una "curva" de radio distinto del codo moldeado.'),
  filaOficial(
    'curva90',
    '3',
    'oficialFabricante',
    'Tramo.accesorios (modo detallado). Mismo producto/coeficiente que `codo90`: Acqua System no fabrica una pieza de "curva" de 90º distinta del codo moldeado (a diferencia de materiales curvables como cobre/acero, que sí la justifican en Tabla N°7 ERAS-2023).',
  ),
  filaOficial(
    'curva45',
    '4',
    'oficialFabricante',
    'Tramo.accesorios (modo detallado). Única pieza de 45º que Acqua System fabrica (mismo criterio que `curva90`).',
  ),
  {
    id: 'sobrepaso',
    nombreAcqua: 'Sobrepaso fusión',
    ks: 1.2,
    itemManual: 'n/a',
    procedencia: 'equivalenciaDocumentada',
    fuente:
      'El manual no publica un coeficiente propio para "Sobrepaso fusión" (DN 20/25/32, código 08-0840*). ' +
      'Valor construido por composición de 2 codos a 45º del propio catálogo Acqua System (ítem 4, R=0,60 cada uno): ' +
      'K_sobrepaso = 2 × 0,60 = 1,20 -- decisión de ingeniería del usuario (HYD-OVERPASS-01), revisable si el fabricante publica un ensayo propio.',
    ambito: 'Estimación DREZA por Artefacto (HYD-OVERPASS-01) -- nunca declarable como Tramo.accesorios.',
  },
  filaOficial(
    'teeEstimadaDistributiva',
    '5',
    'oficialFabricanteSimplificado',
    'HYD-EST (modo estimado): único valor para TODA tee estimada (Locales, Montantes, Colector) -- representa una red distributiva donde el caudal entra por la conducción y se divide entre continuación y ramal (configuración oficial N°5). No es un promedio de las 8 configuraciones ni pretende describir la circulación exacta de una tee relevada -- es la aproximación conservadora deliberada para el modo simplificado, mismo espíritu que ya regía KS_ESTIMADO_TEE antes de este slice.',
  ),
  filaOficial(
    'teeConRoscaCentralMetalica',
    '9',
    'oficialFabricante',
    'Transcripción informativa -- ningún accesorio del dominio actual (Nodo.tee/Tramo.accesorios/Materials) representa hoy esta geometría específica (tee con inserto roscado metálico central).',
  ),
  filaOficial(
    'terminalRectoRoscado',
    '10',
    'oficialFabricante',
    'Transcripción informativa -- "Tubo macho o tubo hembra" (adaptador roscado recto) es una geometría distinta de `tuboSaliente` (ERAS-2023: "salida de pared/piso sin cambio de dirección adicional"); no se equiparan sin evidencia de que sea la misma pieza física.',
  ),
  filaOficial(
    'codoTerminalRoscado',
    '11',
    'oficialFabricante',
    'Transcripción informativa -- ningún accesorio del dominio actual (Nodo.tee/Tramo.accesorios) representa hoy esta geometría; "Codo terminal roscado PPR" de Materials es una estimación de COMPRA (resolverAccesoriosConstructivosDreza.ts), sin representación hidráulica -- fuera de alcance de este catálogo.',
  ),
  {
    id: 'llaveDePaso',
    nombreAcqua: 'Llave de paso (sin coeficiente propio Acqua System)',
    ks: obtenerKsDeAccesorio('llaveDePaso'),
    itemManual: 'n/a',
    procedencia: 'fallbackNormativoERAS',
    fuente: 'ERAS-2023 §2.12.1, Tabla N°7 (normativa/eras-2023/tabla-07-perdidas-localizadas) -- Acqua System no publica un coeficiente propio para esta pieza.',
    ambito: 'Tramo.accesorios (modo detallado) y HYD-EST (singularidad/llave estimadas, D-δ.45) -- conserva Tabla N°7 incluso bajo Acqua System.',
  },
  {
    id: 'valvulaEsclusa',
    nombreAcqua: 'Válvula esclusa (sin coeficiente propio Acqua System)',
    ks: obtenerKsDeAccesorio('valvulaEsclusa'),
    itemManual: 'n/a',
    procedencia: 'fallbackNormativoERAS',
    fuente: 'ERAS-2023 §2.12.1, Tabla N°7 (normativa/eras-2023/tabla-07-perdidas-localizadas) -- Acqua System no publica un coeficiente propio para esta pieza.',
    ambito: 'Tramo.accesorios (modo detallado) -- conserva Tabla N°7 incluso bajo Acqua System.',
  },
  {
    id: 'tuboSaliente',
    nombreAcqua: 'Tubo saliente (sin coeficiente propio Acqua System)',
    ks: obtenerKsDeAccesorio('tuboSaliente'),
    itemManual: 'n/a',
    procedencia: 'fallbackNormativoERAS',
    fuente: 'ERAS-2023 §2.12.1, Tabla N°7 (normativa/eras-2023/tabla-07-perdidas-localizadas) -- Acqua System no publica un coeficiente propio para esta pieza; no se equipara con el ítem 10 del manual ("Tubo macho o tubo hembra", geometría distinta).',
    ambito: 'Tramo.accesorios (modo detallado) -- conserva Tabla N°7 incluso bajo Acqua System.',
  },
] as const

export function obtenerKsAcquaSystem(id: IdAccesorioConKAcquaSystem): FilaKAcquaSystem {
  const fila = catalogoKAccesoriosAcquaSystem.find((candidata) => candidata.id === id)
  if (fila === undefined) {
    throw new Error(`obtenerKsAcquaSystem: no existe ningún accesorio con id "${id}" en el catálogo Acqua System`)
  }
  return fila
}

export function tieneKAcquaSystem(id: string): id is IdAccesorioConKAcquaSystem {
  return catalogoKAccesoriosAcquaSystem.some((fila) => fila.id === id)
}
