// Modelo de red hidráulica: conectividad física entre puntos de consumo.
// Esta capa no calcula; solo define la estructura del dominio persistible,
// igual que modelo/proyecto/. Es ortogonal a la jerarquía funcional
// (Proyecto → UnidadFuncional → Local → Artefacto): esa jerarquía responde
// "¿de qué parte del proyecto es esto?"; esta red responde "¿cómo llega
// el agua hasta acá?" (ver PENDIENTES-DE-ARQUITECTURA.md, sección D-δ).

// Referencia a un Artefacto instalado por su cadena funcional completa
// (UF → Local → Artefacto), no solo por artefactoId: el modelo actual no
// garantiza unicidad global de Artefacto.id, así que la referencia debe
// resolverse dentro de la jerarquía indicada, nunca por búsqueda global.
// `artefactoId` aquí es el id de instancia del Artefacto dentro de su
// Local (Artefacto.id), no el id de catálogo normativo (Artefacto.artefactoId).
export type ReferenciaDeArtefacto = {
  tipo: 'artefacto';
  unidadFuncionalId: string;
  localId: string;
  artefactoId: string;
};

// Marca semántica de un punto de transformación AF → AC. No modela todavía
// ningún equipo: es solo la posición topológica de la producción de ACS
// (ver D-δ.7). No tiene id propio porque no existe aún ninguna entidad
// ProduccionACS a la que apuntar.
export type ReferenciaDeProduccionACS = {
  tipo: 'produccionACS';
};

export type ReferenciaDeNodo = ReferenciaDeArtefacto | ReferenciaDeProduccionACS;

// Un Nodo sin `referencia` es puramente topológico (fuente, bifurcación o
// unión): su rol se infiere de su conectividad en `Tramo`, no de un campo
// de tipo.
export type Nodo = {
  id: string;
  referencia?: ReferenciaDeNodo;
  // Elevación geométrica del punto hidráulico representado por el Nodo
  // respecto del datum común del Proyecto, expresada en metros. Convención
  // de esta primera versión: cota 0 = nivel de vereda/acera (no persistida
  // como campo -- es una convención documental compartida por todo el
  // Proyecto). Opcional a propósito: las topologías actuales no tienen
  // geometría real todavía y no corresponde inventar cotas solo para
  // satisfacer el compilador; ausencia de cota_m NO equivale a cota_m=0 --
  // ningún consumidor debe asumir ese fallback.
  cota_m?: number;
};

export type RedDeTramo = 'AF' | 'AC';

// Subconjunto de Tabla N°7 (normativa/eras-2023/tabla-07-perdidas-localizadas,
// CRIT-A26) cuya pérdida localizada es representable hoy de forma
// inequívoca como accesorio de un Tramo: ocurre a lo largo de su
// recorrido físico y usa la velocidad real de ese mismo Tramo
// (Js = Ks·V²/2g). Incluye 'reducciones' (CRIT-A30): una reducción se
// declara sobre el Tramo del LADO MENOR/aguas abajo de la transición de
// diámetro -- ese mismo Tramo ya tiene, sin ambigüedad, la velocidad de
// referencia correcta (convención hidráulica estándar para pérdida por
// contracción, ver CRIT-A30; ERAS-2023 no la especifica). Deliberadamente
// NO incluye las 3 variantes de tee (Ks distinto según orientación, que
// RedHidraulica no puede distinguir sin geometría espacial) ni griferías
// (CRIT-A29: su pérdida se entiende absorbida por presionMinima_kgcm2 del
// artefacto, nunca se agrega al balance de la red). Ver
// PENDIENTES-DE-ARQUITECTURA.md, D-δ.33.
export type IdAccesorioDeTramo =
  | 'curva45'
  | 'curva90'
  | 'codo90'
  | 'llaveDePaso'
  | 'valvulaEsclusa'
  | 'uniones'
  | 'tuboSaliente'
  | 'reducciones';

// Lista en tiempo de ejecución de IdAccesorioDeTramo -- única fuente de
// verdad compartida con validarRedHidraulica (no se duplica el listado
// literal ahí): a diferencia de otras uniones cerradas del modelo
// (RedDeTramo, MaterialTuberiaId), este subconjunto está pensado para
// crecer cuando D-δ.33 resuelva tees, así que datos persistidos/externos
// sí necesitan verificación en tiempo de ejecución, no solo del
// compilador.
export const idsAccesorioDeTramo: readonly IdAccesorioDeTramo[] = [
  'curva45',
  'curva90',
  'codo90',
  'llaveDePaso',
  'valvulaEsclusa',
  'uniones',
  'tuboSaliente',
  'reducciones',
] as const;

// Identidad normativa + cantidad -- nunca el coeficiente Ks persistido
// (se resuelve desde Tabla N°7 / obtenerKsDeAccesorio, CRIT-A26, mismo
// criterio que materialTuberiaId↔catálogo). `cantidad` expresa cuántas
// instancias iguales existen sobre el Tramo (mismo patrón que
// Artefacto.cantidad): no hay identidad de instancia individual porque
// Ks depende solo del tipo, nunca de una instancia concreta.
export type AccesorioDeTramo = {
  tipo: IdAccesorioDeTramo;
  cantidad: number;
};

// Segmento dirigido: nodoOrigenId → nodoDestinoId representa la dirección
// hidráulica nominal desde la fuente hacia el consumo. No prohíbe ciclos
// en este incremento (ver D-δ, recirculación futura).
export type Tramo = {
  id: string;
  nodoOrigenId: string;
  nodoDestinoId: string;
  red: RedDeTramo;
  // Longitud física real de la tubería representada por el Tramo,
  // expresada en metros -- el recorrido real instalado/previsto de la
  // conducción (vertical, horizontal, diagonal o con desvíos). NO
  // representa diferencia de cota, proyección horizontal, longitud
  // derivada geométricamente, ni longitud equivalente de accesorios
  // (Modelo B, ver PENDIENTES-DE-ARQUITECTURA.md D-δ.22): es explícita e
  // independiente de `Nodo.cota_m`/Δz, nunca se deriva de ellos. Opcional
  // a propósito, mismo criterio que `cota_m`: ausencia de longitud_m NO
  // equivale a longitud_m=0 ni a |Δz|.
  longitud_m?: number;
  // Pérdidas localizadas declarables sobre el recorrido del Tramo
  // (subconjunto inequívoco de Tabla N°7, ver IdAccesorioDeTramo). Mismo
  // criterio de opcionalidad que longitud_m/cota_m, pero con una
  // distinción adicional relevante (D-δ.33): `undefined` = relevamiento
  // de accesorios NO realizado todavía -- NUNCA equivale a "sin
  // accesorios"; `[]` = relevamiento realizado, el Tramo efectivamente no
  // tiene accesorios de este subconjunto -- pérdida localizada real = 0.
  // Tees quedan deliberadamente fuera: no se declaran acá hasta que su
  // representación se decida (D-δ.33). Una reducción se declara sobre
  // este Tramo cuando ESTE Tramo es el lado menor/aguas abajo de una
  // transición de diámetro real (CRIT-A30) -- nunca se infiere solo
  // porque el Di resuelto de este Tramo difiera del de su predecesor: el
  // cambio de diámetro es dato hidráulico, no prueba de que exista
  // físicamente el accesorio.
  accesorios?: readonly AccesorioDeTramo[];
};

// Una sola topología física para AF y AC (D-δ.2): no existen redes
// paralelas por condición de demanda: `Tramo.red` distingue AF de AC
// dentro de esta misma estructura.
export type RedHidraulica = {
  nodos: readonly Nodo[];
  tramos: readonly Tramo[];
};
