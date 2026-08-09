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
// de tipo. Deliberadamente sin cota ni vínculo a Nivel en este incremento.
export type Nodo = {
  id: string;
  referencia?: ReferenciaDeNodo;
};

export type RedDeTramo = 'AF' | 'AC';

// Segmento dirigido: nodoOrigenId → nodoDestinoId representa la dirección
// hidráulica nominal desde la fuente hacia el consumo. No prohíbe ciclos
// en este incremento (ver D-δ, recirculación futura).
export type Tramo = {
  id: string;
  nodoOrigenId: string;
  nodoDestinoId: string;
  red: RedDeTramo;
};

// Una sola topología física para AF y AC (D-δ.2): no existen redes
// paralelas por condición de demanda: `Tramo.red` distingue AF de AC
// dentro de esta misma estructura.
export type RedHidraulica = {
  nodos: readonly Nodo[];
  tramos: readonly Tramo[];
};
