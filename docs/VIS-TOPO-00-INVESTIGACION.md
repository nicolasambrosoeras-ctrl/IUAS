# VIS-TOPO-00 — Investigación

Arqueología del grafo hidráulico real de IUAS (Módulo 2) y diseño técnico
propuesto para un futuro visor topológico derivado, read-only y
auto-layout. Slice exclusivamente de investigación: no se modificó
`src/`, `tests/`, `e2e/` ni `package.json`.

## 1. Objetivo

Entender con precisión qué grafo hidráulico existe hoy en M2, qué
información física/semántica puede representarse honestamente, y diseñar
una arquitectura concreta para `VIS-TOPO-01` sin agregar dependencias,
sin persistir coordenadas y sin reinterpretar hidráulica.

## 2. Estado actual del modelo M2

La fuente de verdad topológica única es `RedHidraulica = { nodos: Nodo[];
tramos: Tramo[] }` (`src/modelo/redHidraulica/index.ts:236-239`), decisión
consolidada en **ADR-0001**. No existe una segunda topología en
componentes React, en `Montante`, ni en listas paralelas.

```ts
// src/modelo/redHidraulica/index.ts
export type Nodo = {
  id: string;
  referencia?: ReferenciaDeNodo;   // artefacto | produccionACS
  cota_m?: number;
  tee?: ConfiguracionDeTee;
};

export type Tramo = {
  id: string;
  nodoOrigenId: string;
  nodoDestinoId: string;
  red: 'AF' | 'AC';
  longitud_m?: number;
  accesorios?: readonly AccesorioDeTramo[];
  longitudEsSugerida?: boolean;
  dnComercialAdoptado?: string;
  montanteId?: string;
};

export type RedHidraulica = { nodos: readonly Nodo[]; tramos: readonly Tramo[] };
```

Un `Nodo` **no tiene campo `tipo`**. Su rol (origen / bifurcación / unión
/ terminal) se infiere siempre de su conectividad real en `Tramo`, nunca
de metadata declarada — principio explícito del propio código
(`redHidraulica/index.ts:62-64`) y reafirmado por
`resolverClasificacionDeTee`, `identificarNodosDeBifurcacion` y
`asegurarRaizDeRed.ts`, que todos derivan el rol contando
entrantes/salientes en tiempo de consulta.

La jerarquía administrativa vive en paralelo y es ortogonal a la
topología (comentario de archivo, línea 1-6): `Proyecto →
UnidadFuncional → Nivel → Local → Artefacto` (ADR-0002). Un `Nodo` con
`referencia.tipo === 'artefacto'` apunta a esa cadena por
`{unidadFuncionalId, localId, artefactoId}`, nunca por búsqueda global de
id.

`Montante` es identidad pura, sin estructura física
(`src/modelo/proyecto/index.ts`):

```ts
export type Montante = { readonly id: string; readonly red: RedDeTramo; readonly nombre?: string };
```

La pertenencia física es exclusivamente `Tramo.montanteId` — no existe
`tramosIds[]` ni `localesIds[]` en `Montante` (verificado también por
`montantesDelProyecto.visTopo.test.ts:195-200`, que afirma
`Object.keys(montante).sort() === ['id', 'red']`).

## 3. Tipo real de grafo

**Es una arborescencia dirigida (out-forest): fan-out permitido, fan-in y
ciclos prohibidos.** No es un árbol único (admite múltiples raíces/subredes
independientes) ni un DAG general ni una red mallada.

Evidencia en `src/validacion/redHidraulica/index.ts`:

- `redHidraulicaNodoMultiplesTramosEntrantes` (líneas ~280-292): si un
  nodo tiene `entrantes > 1` → error, alcance `'tuberias'`. Prohíbe
  convergencias/mallas.
- `redHidraulicaCicloDirigido` (líneas ~295-359): DFS iterativo de 3
  estados sobre `nodoOrigenId → nodoDestinoId`; cualquier nodo en un ciclo
  → error, alcance `'tuberias'`.
- Confirmado por tests (`validacion/redHidraulica/index.test.ts:495-582`):
  un ciclo A→B→C→A falla sin loop infinito; una convergencia (unión) falla
  con `redHidraulicaNodoMultiplesTramosEntrantes`; ninguno de los dos
  invariantes bloquea Módulo 1 (severidad reportada, alcance `'tuberias'`
  únicamente).
- Un fan-out 1→N (N≥3) es **válido** — no es una convergencia (ADR-0001
  §2.1).

Dado que fan-in ≥2 siempre es rechazado, una red validada nunca tiene un
nodo con más de un padre: toda red válida es, por construcción, un bosque
de out-trees (una o más raíces, cada una un árbol dirigido puro). El
código de dirección lo confirma sin ambigüedad: no hace falta inferir
"aguas arriba/abajo" heurísticamente, `nodoOrigenId → nodoDestinoId` ya
es la dirección hidráulica nominal (comentario `redHidraulica/index.ts:152-154`).

## 4. Entidades topológicas — inventario

| Entidad real | Existe en modelo | Identidad persistida | Rol físico | Representable |
| --- | --- | --- | --- | --- |
| Origen (raíz AF / raíz ACS) | Como `Nodo` sin `referencia` (raíz AF) o con `referencia.tipo:'produccionACS'` (raíz AC) | Implícita — se detecta, no se declara (`asegurarRaizDeRed.ts`) | Punto de entrada de la red física | Sí, derivado en tiempo de render (nodo sin tramo entrante) |
| Esquema de abastecimiento (M4) | `Proyecto.configuracionAbastecimiento.esquema` | Sí, explícito | Decisión de proyecto: directa / tanque elevado / cisterna+bombeo | Sí, como etiqueta del nodo origen, nunca como nodo propio adicional |
| Nodo | `Nodo` | Sí (`id`) | Bifurcación / unión / terminal — inferido de conectividad | Sí, 1:1 |
| Tramo | `Tramo` | Sí (`id`) | Segmento físico de cañería dirigido | Sí, 1:1 (arista) |
| Montante | `Montante` (identidad) + `Tramo.montanteId` (pertenencia) | Sí, identidad; membresía derivada | Agrupación semántica de una cadena de tramos verticales | Sí, como agrupador visual sobre una sucesión de aristas |
| Tee (`ConfiguracionDeTee`) | `Nodo.tee` | Sí, opcional | Pieza física 1→2 que clasifica el Ks de cada salida | Sí, como metadata de una bifurcación, no como nodo aparte |
| Fan-out 1→N (N≥3) | Ninguna entidad propia — sólo conectividad | No aplica | Derivación múltiple sin geometría relevada | Sí, marcado explícitamente como "no detallado", nunca inventado |
| Local | `Local` (dentro de `Nivel`) | Sí | Destino administrativo de consumo | Sí, como nodo de destino agregado (recomendado V1) |
| Nivel | `Nivel` (dentro de `UnidadFuncional`) | Sí | Plano físico vertical, dueño de sus Locales | Sí, como agrupador/banda visual, nunca nodo hidráulico |
| UF | `UnidadFuncional` | Sí | Identidad de uso/consumo | Sí, como agrupador visual, nunca nodo hidráulico |
| Terminal/Artefacto | `Nodo.referencia.tipo === 'artefacto'` | Sí | Punto de consumo real | Sí, opcional en V1 (ver §8) |

## 5. Orígenes

El origen **no es un campo de `Nodo`**: se detecta estructuralmente.

- Raíz AF: el único `Tramo` cuyo `nodoOrigenId` nunca aparece como
  `nodoDestinoId` de otro tramo — `encontrarTramoDeAlimentacionGeneral`,
  `src/interfaz/paginas/asegurarRaizDeRed.ts:39-42`.
- Raíz AC (producción ACS): el único `Tramo` cuyo nodo destino tiene
  `referencia?.tipo === 'produccionACS'` —
  `encontrarTramoDeAlimentacionAcs`, mismo archivo, líneas 46-49.
- AF y AC son independientes: un proyecto puede tener AF sin tener nunca
  AC (D-δ.6/D-δ.13).

El "origen" conceptual (alimentación directa / tanque elevado /
cisterna+bombeo) es una decisión **separada** de Módulo 4, no ligada
estructuralmente a ningún `Nodo`:

```ts
// src/modelo/proyecto/index.ts:340
export type EsquemaDeAbastecimiento = 'directa' | 'tanqueElevado' | 'cisternaBombeoElevado';
```

`resolverOrigenHidraulicoEfectivo` (`src/motor/modulo4/resolverOrigenHidraulico.ts:25-43`)
la colapsa a `'directa' | 'tanqueElevado'` (cisterna+bombeo se comporta
igual que tanque elevado para el balance de presión del terminal — la
bomba/cisterna queda aguas arriba del almacenamiento).

**Respuesta a la pregunta del brief:** sí, el origen debe ser un nodo
visual derivado aunque no exista como `Nodo` persistido de forma
distinguible — se calcula en dos pasos: (1) ubicar estructuralmente el/los
nodo(s) raíz de cada subred AF/AC, (2) etiquetarlos con el esquema de M4
("Red directa" / "Tanque elevado") si `configuracionAbastecimiento` existe,
o con una etiqueta genérica ("Alimentación") si M4 no fue iniciado
todavía. Nunca inventar geometría de tanque/bomba: es una etiqueta, no una
pieza.

## 6. Montantes

- **Identidad**: `{id, red, nombre?}` — nada más. `nombre` ausente usa
  fallback determinista (`Montante AF 1`, `nombreFallbackDeMontante`).
- **Estructura física derivada**: los segmentos de un montante son
  exactamente los `Tramo` con `montanteId === esteId`, reconstruidos como
  cadena lineal por `reconstruirCadena`
  (`src/interfaz/paginas/reconciliarMontante.ts:239-266`) — construcción
  propia que **asume siempre una cadena lineal** (un único tramo sin
  predecesor entre los segmentos del montante, cada uno enlazando por
  `nodoDestinoId → nodoOrigenId` con el siguiente); si algo la rompe
  (edición manual del JSON, ciclo, bifurcación interna), devuelve
  `undefined` y la proyección degrada a listado plano sin orden
  (`cadenaLineal: false`), nunca reordena a ciegas.
- **Locales servidos**: siempre derivados (`derivarLocalesServidos`,
  mismo archivo líneas 278-294), nunca una lista persistida.
- **Nodos de derivación / tees**: `derivacionesDeMontante`
  (`src/interfaz/paginas/montantesDelProyecto.ts:418-463`) identifica, para
  cada nodo donde el montante bifurca, si es una tee 1→2
  (`identificarNodosDeBifurcacion`) o un fan-out 1→N no configurable.

**Recomendación de representación — Opción B (sucesión de tramos), NO
Opción A (montante como nodo/contenedor):** el propio modelo ya trata al
montante como una cadena de `Tramo`s reales con una identidad que los
agrupa, no como un contenedor que envuelve nodos. El visor debe:

- pintar cada segmento del montante como una arista normal, coloreada por
  `red` (AF/AC) igual que cualquier otra;
- agregar una etiqueta de grupo (nombre del montante) sobre la sucesión de
  aristas — por ejemplo un borde lateral o un fondo sutil compartido por
  los segmentos con el mismo `montanteId`, sin crear un nodo sintético
  que no existe en el dominio;
- en cada nodo de derivación, mostrar el Local servido en esa cota (ya
  resuelto por `derivarLocalesServidos`/`obtenerArtefactosAguasAbajo`).

Modelar el montante como un nodo/contenedor (Opción A) introduciría una
entidad visual sin contraparte de dominio — exactamente el tipo de
"segunda topología" que ADR-0001 prohíbe evitar.

## 7. UF / Nivel / Local

Confirmado en código (`src/modelo/proyecto/index.ts`, ADR-0002):
`UnidadFuncional.niveles: readonly Nivel[]` (siempre ≥1), cada
`Nivel.locales: readonly Local[]`. La topología hidráulica es ortogonal a
esta jerarquía — ni UF ni Nivel son nodos de `RedHidraulica`.

**Recomendación (confirma la hipótesis del brief): UF y Nivel como
agrupadores visuales, Local como destino hidráulico.**

- **UF**: agrupador visual (rótulo/cluster), nunca nodo hidráulico.
- **Nivel**: banda/cluster visual (útil para alinear terminales de un
  mismo piso horizontalmente cuando hay multinivel dentro de una UF —
  ADR-0002), nunca nodo hidráulico ni árbol administrativo aparte.
- **Local**: destino hidráulico real — es el nivel de agregación correcto
  para V1 (ver §8). Su cota efectiva ya se resuelve con
  `resolverCotaPisoDeLocal(nivel, local)` = `local.cotaPiso_m ??
  nivel.cotaHidraulicaReferencia_m`
  (`src/motor/tuberias/geometria/resolverCotaHidraulicaDeArtefacto.ts:49-54`),
  útil para eventualmente ordenar visualmente por altura sin usarla como
  coordenada persistida.

No insertar ningún nodo hidráulico falso para UF/Nivel: la topología real
no los conoce y el grafo se degradaría en precisión sin ganar nada.

## 8. Terminales / artefactos

**Recomendación para V1: Local como destino agregado (Opción A del
brief), con expansión opcional a artefacto individual como V2 (Opción
C, nivel de detalle).**

Razones:

- Legibilidad: un proyecto de escala XL genera ~2.800 nodos terminales de
  artefacto (`generarProyectoDeEscala.ts`, `NIVEL_DE_ESCALA.XL = {100 UF,
  4 locales/UF}` × 7 terminales/local) — inviable para una vista general
  sin nivel de detalle.
- Utilidad hidráulica: la presión residual y el terminal crítico se
  calculan por artefacto, pero el **destino relevante para entender la
  red** (a qué Local llega cada rama) ya es exactamente lo que
  `obtenerArtefactosAguasAbajo` + `derivarLocalesServidos` resuelven de
  forma agregada.
- Relación con presión crítica: mostrar todos los artefactos sólo aporta
  cuando el usuario ya identificó el Local de interés — encaja como
  expansión, no como vista por defecto.

No mostrar cada artefacto en V1; ofrecer "expandir Local" como
interacción de detalle (V1 opcional o V2, ver §18).

## 9. AF / AC

Son **una sola topología física** con dos roles de arista
(`Tramo.red: 'AF' | 'AC'`), no dos grafos independientes ni dos redes
paralelas (comentario `redHidraulica/index.ts:233-235`, D-δ.2). Comparten
la jerarquía UF/Nivel/Local y pueden compartir montantes por identidad
(`Montante.red` fija la red de ESE montante — un montante es
exclusivamente AF o exclusivamente AC, nunca mixto), y convergen
conceptualmente en el mismo Local cuando un artefacto es mixto (dos
`Nodo`s, uno AF y uno AC, referenciando el mismo
`{unidadFuncionalId, localId, artefactoId}` — ver `proyectoDeEjemplo.ts`,
p. ej. `n-af-lavatorio` / `n-ac-lavatorio`).

**Propuesta de visualización:**

- Vista combinada por defecto, AF en azul/celeste y AC en salmón (nunca
  rojo de error), coloreando cada arista por `Tramo.red`.
- Filtro AF / filtro AC como interacción V1 (ocultar aristas + nodos que
  quedan sin ninguna arista visible de la red activa), útil sobre todo en
  proyectos grandes con ambas redes.
- Un Local con terminales mixtos se pinta una sola vez, con las dos
  ramas (AF y AC) entrando por separado — nunca se fusionan en una arista
  bicolor.

## 10. Tee y fan-out 1→N

**Tee (1→2)**: `resolverClasificacionDeTee`
(`src/motor/tuberias/topologia/resolverClasificacionDeTee.ts:72-132`)
clasifica cada salida de un nodo de bifurcación real (1 entrante + 2
salientes) puramente por conectividad + `Nodo.tee`, nunca por heurística
de ids/orden. Para V1, representar la tee como una simple bifurcación
gráfica (el propio layout dirigido ya la muestra al dividir la arista en
dos) es suficiente — un símbolo hidráulico dedicado (recto/lateral) es
una mejora de detalle, no imprescindible, y depende de si `Nodo.tee` está
configurado (`sinConfigurar` es un estado legítimo y frecuente).

**Fan-out 1→N (N≥3)**: `derivacionMultipleNoModelada`
(mismo archivo, líneas 85-91) se determina exclusivamente por
`entrantes.length === 1 && salientes.length > 2`, nunca por
`montanteId`. El grafo **sí conoce la conectividad lógica completa**
(1 entrada → N salidas reales, cada una con su propio Tramo) — lo que no
conoce es el orden físico interno (cuántas tees en serie, cuál es recta).

**Recomendación: Opción B del brief — mostrar el fan-out real del grafo
(1 nodo, N aristas salientes reales) y marcarlo visualmente como
topología no detallada** (p. ej. un pequeño indicador o borde distintivo
en el nodo, coherente con el estado `derivacionMultipleNoModelada` /
`perdidaLocalizadaIncompleta` que el motor ya reporta). Nunca inventar
tees intermedias en serie (elimina la Opción A del brief: un nodo de
distribución abstracto sintético también sería una geometría no
conocida) y nunca ocultar el fan-out (elimina la Opción C: ocultarlo
escondería información real y honesta que el grafo sí tiene).

## 11. Limitaciones físicas conocidas

- **Reducciones/cambios de DN**: un cambio de DN entre tramo aguas
  arriba y aguas abajo **no implica** un reductor físico separado
  (CRIT-A30) — el visor debe mostrar el DN de cada arista sin inferir ni
  dibujar un símbolo de reductor solo por la diferencia numérica.
- **Fan-out 1→N**: ver §10 — sin Ks, sin pérdida calculada, sin
  geometría fabricada.
- **Terminal crítico estructuralmente indeterminado en la práctica**:
  `resolverTerminalMasDesfavorable`
  (`src/motor/tuberias/presion/resolverTerminalMasDesfavorable.ts`)
  devuelve `'determinado'` sólo si TODOS los candidatos resuelven
  `'balanceCompleto'`, pero `hfMedidor` (D-δ.35) es hoy siempre
  `undefined` en cualquier proyecto real — así que el estado real más
  común es `'candidatoProvisional'` (el Panel de Presión de M2 ya lo
  usa así, ver `filtrarCandidatosParaTerminalCritico.ts`). VIS-TOPO puede
  y debe resaltar el candidato provisional, pero etiquetado como
  candidato, nunca como determinación absoluta.

## 12. Modelo visual derivado propuesto

No persistido, sin coordenadas dentro, tres capas separadas
(identidad de dominio / semántica visual / layout):

```ts
// Identidad de dominio: IDs reales, nunca sintéticos.
type NodoVisual = {
  readonly id: string                 // Nodo.id o clave sintética estable
                                       // sólo para agregados (p. ej. `local:${ufId}/${localId}`)
  readonly tipo: 'origen' | 'bifurcacion' | 'tee' | 'fanOutNoModelado' | 'local' | 'artefacto'
  readonly red?: 'AF' | 'AC' | 'ambas'
  readonly etiqueta: string           // humana, nunca el id técnico
  readonly grupo?: { readonly ufId: string; readonly nivelId: string }
  readonly montanteId?: string
  readonly esTerminalCritico?: boolean
}

type AristaVisual = {
  readonly id: string                 // Tramo.id
  readonly origenId: string
  readonly destinoId: string
  readonly red: 'AF' | 'AC'
  readonly dnTexto?: string
  readonly longitudTexto?: string
  readonly montanteId?: string
  readonly incompleta?: boolean       // p.ej. derivacionMultipleNoModelada
}

type GrupoVisual = {
  readonly id: string
  readonly tipo: 'unidadFuncional' | 'nivel' | 'montante'
  readonly etiqueta: string
  readonly nodosIds: readonly string[]
}

type GrafoVisual = {
  readonly nodes: readonly NodoVisual[]
  readonly edges: readonly AristaVisual[]
  readonly groups: readonly GrupoVisual[]
}

// Layout SIEMPRE calculado después, en una capa separada:
type NodoConPosicion = NodoVisual & { readonly x: number; readonly y: number }
```

`x`/`y` nunca viven dentro de `GrafoVisual` — se calculan en una función
de layout separada que recibe `GrafoVisual` y devuelve
`readonly NodoConPosicion[]`, manteniendo la adaptación de dominio pura y
testeable sin ningún motor de layout de por medio.

## 13. Pipeline de datos

```
Proyecto
  ↓
resolvers M2 existentes (proyectarMontante, derivarLocalesServidos,
  obtenerArtefactosAguasAbajo, resolverClasificacionDeTee,
  identificarNodosDeBifurcacion, resolverOrigenHidraulicoEfectivo)
  ↓
resolverGrafoVisual(proyecto): GrafoVisual   ← nueva función pura, sin React/SVG
  ↓
layout engine (dagre/elkjs, ver §14): GrafoVisual → posiciones (x,y)
  ↓
renderer (SVG, ver §15)
```

Confirmado como arquitectura ya validada por el propio repo: el
comentario de archivo de `montantesDelProyecto.ts:11-15` dice
explícitamente que su proyección "es la misma proyección que consumirá
VIS-TOPO", y `montantesDelProyecto.visTopo.test.ts` ya implementa (dentro
del propio test, como prueba de concepto) un
`proyectarParaVisTopo(proyecto, montanteId)` que deriva TODO —
id/nombre/red/origen/niveles/Local/longitud/DN— usando solamente
`proyectarMontante` + `obtenerArtefactosAguasAbajo` +
`resolverFilaDeDimensionamiento`, sin ninguna lista paralela. Esto
demuestra que `resolverGrafoVisual` es alcanzable con los resolvers
actuales sin tocar el motor.

**Evitar explícitamente**: un componente React que interprete
`RedHidraulica` directamente dentro del JSX. `resolverGrafoVisual` debe
ser una función pura en `src/interfaz/paginas/` (mismo patrón que el
resto de proyecciones read-only de M2), testeable sin DOM ni React.

## 14. Alternativas de renderer

Inventario local: `package.json` sólo declara `react`, `react-dom` y
`pdfmake` como dependencias de producción — **no hay ninguna librería de
grafos, layout ni canvas instalada**.

| Opción | Pros | Contras |
| --- | --- | --- |
| **A. SVG propio + layout externo** | Accesible (elementos DOM reales, `title`/`aria-label` por nodo/arista), exportable directamente a la Memoria de cálculo (PDF vía `pdfmake` o rasterizado), estilable con CSS/tema claro-oscuro, sin dependencia de render adicional | Hay que escribir el layer de dibujo (curvas, rutas de arista) a mano |
| **B. React Flow / equivalente** | Pan/zoom/interacción listos out-of-the-box, ecosistema de nodos custom | Dependencia nueva pesada, licencia a revisar, menos control sobre export estático/PDF, curva de integración con el resto de la UI (sin librerías de UI hoy) |
| **C. Canvas** | Rendimiento en miles de nodos | No accesible por defecto (hay que duplicar info en DOM sombra), no exportable como vector a PDF sin reconvertir, peor para "esquema técnico" legible/imprimible |

**Recomendación: A, SVG propio.** Coincide con la preferencia previa del
brief y con los tres criterios de más peso para este caso concreto: es
read-only (no necesita edición de nodos, que es donde React Flow brilla),
es un esquema técnico pensado para leerse e imprimirse, y un SVG puede
reutilizarse tal cual para incrustar el esquema en la Memoria de cálculo
en el futuro (§20) sin reconversión. El costo de escribir el dibujo a
mano es acotado porque el layout (posiciones) lo resuelve una librería
externa (§15) — SVG propio sólo necesita pintar rectángulos/círculos y
líneas/curvas en las posiciones ya calculadas.

## 15. Alternativas de layout

No hay librería de layout instalada. Comparación conceptual (no
instalar todavía):

| Opción | DAG | Múltiples raíces | Clusters | Edge routing | Bundle | Determinismo | TS | Browser-only | Licencia |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Dagre** | Sí (jerárquico top-down/left-right nativo) | Sí (bosque de árboles, cada raíz su propio layout o unidos con nodo virtual) | Básico (subgraphs) | Poligonal simple | Pequeño (~30-50kb) | Sí | Tipos vía `@types` | Sí | MIT |
| **ELK / elkjs** | Sí, más sofisticado (mejor edge routing, mejor manejo de clusters anidados) | Sí | Fuerte (jerarquías anidadas de verdad — encaja con UF→Nivel→Local) | Ortogonal de alta calidad | Grande (WASM/JS, ~500kb+) | Sí | Parcial | Sí (worker) | EPL |
| **D3 hierarchy/tree** | No — exige árbol estricto de un solo padre por nodo | No directamente (un tree por raíz, hay que combinar) | No nativo | Manual | Pequeño | Sí | Sí | Sí | ISC |
| **Layout propio** | — | — | — | — | 0kb | Total control | — | Sí | — |

El grafo real es un **bosque de out-trees** (§3), lo cual technically
califica para D3 `hierarchy`/`tree` si se procesa raíz por raíz — pero
la necesidad de mostrar AF y AC con clusters de UF/Nivel superpuestos
(agrupadores visuales que no son parte de la topología, §7) pesa a favor
de una librería pensada para DAG con subgrafos, no de un layout de árbol
puro.

**Recomendación: Dagre** para V1. Es DAG-ready, soporta múltiples raíces
sin trucos, bundle pequeño, determinista, y su modelo mental (rankdir
top-down, subgraphs para agrupar) resuelve directamente los requisitos
de §7 (UF/Nivel como agrupadores) sin sobre-ingeniería. ELK queda como
candidato de V2 si en escala XL (§16) el edge routing de Dagre se vuelve
ilegible o si se necesitan clusters anidados de verdad (UF conteniendo
Nivel conteniendo Locales, en vez de un solo nivel de agrupación visual).

## 16. Escala y performance

Evidencia real de escala (`src/pruebas/escala/generarProyectoDeEscala.ts`,
`NIVEL_DE_ESCALA`):

| Escenario | UF | Locales/UF | Terminales aprox. (7/local) |
| --- | --- | --- | --- |
| S | 1 | 2 | ~14 |
| M | 14 | 3 | ~294 |
| L | 40 | 4 | ~1.120 |
| XL | 100 | 4 | ~2.800 |

A escala Local-agregado (§8, recomendación V1) el número de nodos
visibles por defecto es UF × Locales/UF (no × terminales): XL serían
~400 nodos Local + montantes/bifurcaciones intermedias, un orden de
magnitud manejable para Dagre/SVG. Mostrar todos los artefactos de una
XL sin nivel de detalle (≈2.800 nodos) degradaría la legibilidad y
probablemente el rendimiento del layout — refuerza la recomendación de
§8/§18.

**Costo de resolver la topología**: ya existe un índice memoizable
O(nodos + tramos) — `crearIndiceTopologico`
(`src/motor/tuberias/topologia/indiceTopologico.ts`) — con
`nodosPorId`, `tramosPorId` y `tramosSalientesPorNodo` precomputados, ya
diseñado para compartirse dentro de una resolución (PERF-SCALE-01D).
`resolverGrafoVisual` debería aceptar o construir el mismo índice en vez
de recorrer `redHidraulica.tramos` con `.filter` repetidamente (patrón
detectado en 4+ sitios por la arqueología: `reconciliarMontante.ts`,
`montantesDelProyecto.ts`) — reutilizar el índice existente evita ese
costo redundante sin crear ninguna abstracción nueva.

**Estrategia de render**: memoizar `resolverGrafoVisual(proyecto)` con
`useMemo` sobre un snapshot estable del proyecto (mismo patrón que el
resto de M2 usa para evitar recomputar en cada render), y volver a
correr el layout sólo cuando el grafo visual cambia de forma (no en cada
render de UI no relacionado). No hace falta benchmark en esta
investigación — la estimación de complejidad ya es lineal en
nodos+tramos, coherente con el resto del motor.

## 17. Mobile

Propuesta: viewport pannable con zoom (Dagre no impone restricciones de
render; el SVG puede envolverse en un contenedor con pan/zoom estándar),
botón "Fit" siempre visible, altura mínima fija razonable dentro del
flujo de M2 (no intentar mostrar el grafo completo escalado a 390px sin
interacción — eso es ilegible en cualquier proyecto con más de unos pocos
Locales). Un modal/fullscreen para el visor en mobile es preferible a
insertarlo comprimido dentro del scroll de M2.

## 18. Interacciones

| Interacción | Clasificación |
| --- | --- |
| Pan | V1 necesaria |
| Zoom | V1 necesaria |
| Fit / centrar | V1 necesaria |
| Filtro AF | V1 necesaria |
| Filtro AC | V1 necesaria |
| Mostrar/ocultar etiquetas de arista (DN·longitud) | V1 necesaria |
| Click nodo → resaltar camino | V1 opcional |
| Click Local → scroll a M2 | V1 opcional |
| Tooltip con detalle (Q, V, hf) | V1 opcional |
| Expandir Local → artefactos | V1 opcional (ver §8) |
| Resaltar terminal crítico / camino crítico | V2 (depende de que el candidato provisional de §11 se considere suficientemente estable para mostrarse por defecto; recomendable introducirlo primero como interacción opt-in) |

## 19. Casos de estudio

Reconstruidos sobre topología real observada (`proyectoDeEjemplo.ts` y
`montantesDelProyecto.visTopo.test.ts`), no inventada.

**Caso A — vivienda simple (real, `proyectoDeEjemplo.ts`)**

```
[Red directa AF] --t-general--> [n-0]
  n-0 --t-af-patio--> [Local: Patio] (canilla, terminal directo, sin bifurcación)
```

**Caso B — varios Locales con ramificación (real, `proyectoDeEjemplo.ts`)**

```
[n-0] --t-af-bano--> [n-af-1] --+--> lavatorio
                                 +--> ducha
                                 +--> bidet
                                 +--> inodoro      (fan-out 1→4, derivacionMultipleNoModelada)
```

**Caso C — Montante (real, `montantesDelProyecto.visTopo.test.ts`)**

```
[n-af] --(montante, segmento 1)--> [Local 1, cota 3]
       --(montante, segmento 2)--> [Local 2, cota 6]
       --(montante, segmento 3)--> [Local 3, cota 9]
```
Cadena lineal real de 3 tramos con `montanteId` común, orden 0/1/2,
`cadenaLineal: true`.

**Caso D — AF + AC (real, `proyectoDeEjemplo.ts`)**

```
[Red directa AF] --> n-0 --t-af-bano--> n-af-1 --> lavatorio(AF) / ducha(AF) / bidet(AF) / inodoro(AF, solo frío)
[Producción ACS]  --> n-acs --t-ac-bano--> n-ac-1 --> lavatorio(AC) / ducha(AC) / bidet(AC)
```
`n-af-lavatorio` y `n-ac-lavatorio` referencian el MISMO
`{uf-1, local-bano, artefacto-bano-1}` — el Local converge visualmente
aunque las ramas AF/AC sean independientes hasta ahí.

**Caso E — fan-out 1→N no modelado (real, `resolverClasificacionDeTee.ts`
+ cabecera de baño de `proyectoDeEjemplo.ts`)**: mismo patrón que el
Caso B — 1 entrante + 4 salientes clasifica `derivacionMultipleNoModelada`,
nunca 3 tees en serie inventadas.

**Caso F — multinivel (patrón real, `unidadFuncionalMultinivel.test.ts` +
ADR-0002)**: una UF con 2+ `Nivel`, cada uno con su propia
`cotaHidraulicaReferencia_m` y sus Locales — el visor debe agrupar los
Locales de esa UF por Nivel (banda visual) sin crear un nodo hidráulico
"Nivel".

## 20. Riesgos

- **Fan-out 1→N mal comunicado**: si el visor no distingue visualmente
  `derivacionMultipleNoModelada` de una bifurcación normal, el usuario
  puede interpretar el esquema como topología física completa cuando no
  lo es. Mitigación: marca visual explícita (§10).
- **Terminal crítico mostrado como definitivo**: dado que
  `resolverTerminalMasDesfavorable` casi siempre devuelve
  `'candidatoProvisional'` en proyectos reales (§11), presentar el
  resaltado sin la palabra "candidato" induciría a error. Mitigación:
  etiquetar siempre el estado, difiriendo el resaltado a V2 hasta decidir
  la UX exacta.
- **Escala sin nivel de detalle**: mostrar todos los artefactos por
  defecto en un proyecto L/XL degrada legibilidad y probablemente
  performance de layout. Mitigación: Local agregado por defecto (§8).
- **Montante como nodo sintético**: la tentación de dibujar el montante
  como un contenedor introduce una entidad sin contraparte de dominio.
  Mitigación: §6 ya cierra esto explícitamente como Opción B.
- **Reutilizar `.filter` ad-hoc en vez del índice topológico**: si
  `resolverGrafoVisual` no reutiliza `crearIndiceTopologico`, el costo
  de derivar el grafo visual de un proyecto XL puede crecer
  innecesariamente. Mitigación: §16.

## 21. Preguntas abiertas

- ¿El agrupador visual de Nivel debe mostrarse siempre, o sólo cuando una
  UF tiene 2+ niveles (igual que la UX de M1 con el nivel base, ADR-0002
  §5)? Sugerido para decidir en el brief de VIS-TOPO-01, no bloqueante.
- ¿El filtro AF/AC oculta también los agrupadores de UF/Nivel que
  quedan sin ningún nodo visible, o los deja vacíos como referencia
  espacial? Sugerido para decidir en VIS-TOPO-01.
- ¿Vale la pena, ya en VIS-TOPO-01, agregar un helper compartido
  `agruparTramosPorMontanteId(redHidraulica): Map<string, Tramo[]>` para
  reemplazar los 4+ `.filter` ad-hoc detectados (§12 del reporte de
  arqueología), o se posterga hasta que `resolverGrafoVisual` lo necesite
  de verdad? Coherente con la preferencia general del proyecto de no
  extraer infraestructura compartida antes de un segundo caso de uso real
  — aquí VIS-TOPO-01 sería justamente ese segundo caso, así que crear el
  helper en ese momento (no antes) parece razonable.

## 22. Recomendación

Construir `VIS-TOPO-01` como una función pura `resolverGrafoVisual` en
`src/interfaz/paginas/`, derivada enteramente de los resolvers M2 ya
existentes y probados (`proyectarMontante`, `derivarLocalesServidos`,
`obtenerArtefactosAguasAbajo`, `resolverClasificacionDeTee`,
`identificarNodosDeBifurcacion`, `asegurarRaizDeRed`/detección de raíz,
`resolverOrigenHidraulicoEfectivo`), sin agregar ninguna dependencia
nueva salvo Dagre para layout, renderizada en SVG propio dentro de M2
como bloque "Esquema hidráulico" (Opción A/B del brief, §29 del prompt),
mostrando Local como destino agregado y marcando honestamente los
fan-out 1→N no modelados.

## 23. Alcance propuesto para VIS-TOPO-01

- `resolverGrafoVisual(proyecto): GrafoVisual` puro, testeado con los
  6 casos de estudio de §19.
- Integración con Dagre (única dependencia nueva) para layout top-down.
- Renderer SVG propio: nodos (origen/bifurcación/tee/fanOut/Local),
  aristas coloreadas por red, etiqueta DN·longitud por arista.
- Agrupadores visuales de UF (y Nivel cuando la UF tiene 2+).
- Interacciones V1 necesarias de §18: pan, zoom, fit, filtro AF, filtro
  AC, mostrar/ocultar etiquetas.
- Ubicación: bloque dentro de M2 ("Esquema hidráulico"), sin Módulo 6
  nuevo.
- Sin persistencia de ningún dato nuevo (confirmado §24 — no cambia
  `SCHEMA_VERSION_ACTUAL`, no toca `.iuas`).

## 24. Qué dejar para VIS-TOPO-02

- Expandir Local → artefactos individuales (nivel de detalle).
- Resaltado de terminal crítico / camino crítico (depende de decisión de
  UX sobre candidato provisional, §11/§20).
- Click nodo → resaltar camino, click Local → scroll a M2, tooltips
  enriquecidos (Q, V, hf).
- Evaluar ELK si Dagre no alcanza en escala XL con clusters anidados
  reales.
- Reutilización del SVG en la Memoria de cálculo (REPORT) — sólo
  evaluar una vez que el renderer SVG de V1 esté estable.
- Helper `agruparTramosPorMontanteId` si `resolverGrafoVisual` termina
  necesitándolo de verdad (§21).

## Persistencia — confirmación

VIS-TOPO no agrega nada a `.iuas`. El layout (x/y), zoom, pan y cualquier
estado de UI del visor son completamente derivados/efímeros — no hay
`SCHEMA_VERSION_ACTUAL` a incrementar ni migración a diseñar. Una futura
preferencia de UI persistida (p. ej. "recordar el zoom") queda fuera de
alcance de este slice y de VIS-TOPO-01.
