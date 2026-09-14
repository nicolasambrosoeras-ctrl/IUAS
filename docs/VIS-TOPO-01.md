# VIS-TOPO-01 — Esquema hidráulico read-only de Módulo 2

- **Estado:** Implementado — pendiente validación manual.
- **Serie que lo origina:** `VIS-TOPO-00` (investigación,
  `docs/VIS-TOPO-00-INVESTIGACION.md`) → `VIS-TOPO-01` (este slice,
  implementación V1).

---

## 1. Objetivo

Un bloque **"Esquema hidráulico"** dentro de Módulo 2 (Tuberías), read-only,
que muestra el flujo hidráulico principal del proyecto —origen →
alimentaciones → montantes → derivaciones → Locales— con AF y AC
diferenciadas. Es un **esquema topológico**, no un plano arquitectónico:
no representa posición espacial real, escala física, orientación de
cañerías ni geometría de tees/reductores.

## 2. Arquitectura (tres capas, VIS-TOPO-00 §13/§22)

```
Proyecto / RedHidraulica
  ↓
resolverGrafoVisual.ts   (capa 1 — adaptación semántica pura)
  ↓
layoutGrafoVisual.ts     (capa 2 — Dagre, sólo posiciona nodos)
  ↓
EsquemaHidraulico.tsx    (capa 3 — React + SVG, pan/zoom/filtros)
```

- **Capa 1** (`src/interfaz/paginas/resolverGrafoVisual.ts`): función pura
  `resolverGrafoVisual(proyecto): GrafoVisual`. Sin React, sin SVG, sin
  coordenadas. Deriva TODO de `RedHidraulica` + `Proyecto.montantes` +
  UF/Nivel/Local + `configuracionAbastecimiento` (para la etiqueta del
  origen AF). No invoca el motor de cálculo hidráulico — lee sólo datos
  físicos ya persistidos en `Tramo` (`longitud_m`, `dnComercialAdoptado`),
  para mantenerse liviana incluso en proyectos grandes.
- **Capa 2** (`src/interfaz/paginas/layoutGrafoVisual.ts`): función pura
  `layoutGrafoVisual(grafo): GrafoVisualPosicionado`. Envuelve
  `@dagrejs/dagre` para resolver **rank/orden/posición de nodos**
  (top-down). El **trazado de cada arista** se calcula con geometría
  propia (clip al borde del rectángulo del nodo + offset paralelo
  determinista para Tramos que comparten origen/destino visual) — ver
  §4 sobre por qué no se usa el ruteo de aristas de Dagre.
- **Capa 3** (`src/interfaz/paginas/EsquemaHidraulico.tsx` +
  `esquemaHidraulico.css`): componente React que renderiza el SVG,
  implementa pan/zoom/Fit (viewBox + pointer events, sin librería nueva),
  filtros AF/AC/Etiquetas y la leyenda. No reinterpreta topología.

## 3. Dependencia: `@dagrejs/dagre`

- **Paquete:** `@dagrejs/dagre` (fork activamente mantenido de `dagre`,
  bajo la organización `dagrejs`; el paquete histórico `dagre` en npm no
  recibe releases desde hace años).
- **Versión:** `^3.1.1` (release reciente al momento de instalar).
- **Licencia:** MIT.
- **Tipos:** incluidos en el propio paquete (`dist/dagre.d.ts` +
  `dist/types/`) — no hace falta `@types/dagre`.
- **Motivo de la elección:** único paquete de layout instalado (V1 no usa
  ELK ni React Flow, según lo cerrado en VIS-TOPO-00); mantenimiento activo,
  bundle liviano (~1.4 MB sin comprimir, incluye su única dependencia
  `@dagrejs/graphlib`), API estable y suficiente para un layout jerárquico
  top-down con múltiples raíces.

### 3.1. Limitación descubierta y cómo se evitó

Durante la implementación se detectó que `@dagrejs/dagre` 3.1.1, en modo
`multigraph`, puede lanzar `"Not possible to find intersection inside of
the rectangle"` cuando existen **3 o más aristas paralelas** entre el
mismo par de nodos **y** ese par tiene además un nodo hermano en el mismo
rank — reproducido de forma aislada, ajeno a este adaptador (caso mínimo:
`root → a → b` con 3 aristas paralelas `a→b` y un nodo `c` hermano de `a`
colgando de `root`). Esto ocurre con frecuencia en proyectos reales: **es
exactamente el caso de un Local con 3+ artefactos que nacen del mismo
nodo de derivación** (p. ej. un Baño con lavatorio + ducha + bidet, todos
agregados al mismo nodo visual "Local").

En vez de parchear la librería o evitar el fan-out (que violaría VIS-TOPO-00
§10 — el fan-out real debe mostrarse), se **acotó el uso de Dagre a lo
que resuelve de forma confiable**: sólo posición de nodos (rank/orden).
Dagre recibe **como máximo una arista por par (origen,destino)** —
suficiente para una ranking topológica correcta, ya que Tramos duplicados
sobre el mismo par no aportan información de rank nueva. El trazado real
de **cada** arista (incluidas las duplicadas) se calcula aparte, con
geometría simple determinista. Esto además da rutas más limpias para un
esquema de este tamaño (VIS-TOPO-00 §57: "diagrama técnico limpio", no
spaghetti graph) que el ruteo multi-punto por defecto de Dagre.

## 4. Modelo `GrafoVisual`

```ts
// resolverGrafoVisual.ts
type RedVisual = 'AF' | 'AC'
type TipoNodoVisual = 'origen' | 'intermedio' | 'derivacion' | 'local'

type NodoVisual = {
  id: string
  tipo: TipoNodoVisual
  dominioId?: string        // Nodo.id real -- ausente sólo en 'local' (agregado)
  label: string
  sublabel?: string
  red?: RedVisual            // sólo 'origen' (AF vs. Producción ACS)
  grupoUfId?: string
  grupoNivelId?: string
  noDetallado?: boolean      // fan-out 1→N (derivacionMultipleNoModelada)
  cantidadSalidas?: number
}

type AristaVisual = {
  id: string
  dominioTramoId: string    // = id en V1; separado por contrato de capas
  origenId: string
  destinoId: string
  red: RedVisual
  dnTexto?: string
  longitudTexto?: string
  montanteId?: string
  montanteEtiqueta?: string  // sólo en el primer segmento de la cadena
}

type GrupoVisual = { id: string; tipo: 'uf' | 'nivel'; label: string; parentId?: string; nodosIds: string[] }

type GrafoVisual = { nodos: NodoVisual[]; aristas: AristaVisual[]; grupos: GrupoVisual[] }
```

### 4.1. Reglas de construcción

- **Nodos**: cada `Nodo` real de `RedHidraulica` sin `referencia.tipo ===
  'artefacto'` se mapea 1:1 (`dominioId` = `Nodo.id`), clasificado por
  conectividad (entrantes/salientes), nunca por un campo de tipo (que no
  existe en el dominio — VIS-TOPO-00 §2):
  - `entrantes === 0` → `'origen'` (AF: etiqueta derivada del esquema de
    abastecimiento de M4 vía `resolverOrigenHidraulicoEfectivo`; AC/otro:
    etiqueta genérica).
  - `referencia.tipo === 'produccionACS'` → `'origen'`, label
    `"Producción ACS"` (aunque tenga 1 entrante — es conceptualmente
    donde arranca la red AC, VIS-TOPO-00 §5).
  - `entrantes === 1 && salientes === 1` → `'intermedio'` (sin label,
    VIS-TOPO-00 B9).
  - `salientes >= 2` → `'derivacion'`; si `salientes > 2`,
    `noDetallado: true` + `cantidadSalidas` (fan-out 1→N,
    `derivacionMultipleNoModelada` — nunca se inventan tees intermedias).
- **Locales**: cada `Nodo` con `referencia.tipo === 'artefacto'` se agrega
  en UN nodo visual `'local'` por `(unidadFuncionalId, localId)`
  (id determinista `local:<ufId>:<localId>`), aunque reciba AF y AC o
  varios artefactos — VIS-TOPO-00 §8/§11. Ningún artefacto individual se
  muestra en V1.
- **Aristas**: cada `Tramo` real es EXACTAMENTE una arista visual — nunca
  se fusionan ni se descartan (salvo referencias rotas, imposibles tras
  `validarRedHidraulica`, toleradas sin crashear por VIS-TOPO-00 B32).
- **Montantes**: nunca un nodo — sus segmentos (`Tramo.montanteId`) siguen
  siendo aristas reales; el nombre humano del montante
  (`nombreDeMontante`) se adjunta sólo al primer segmento de la cadena
  (`proyectarMontante`), para no repetirlo en cada tramo.
- **UF / Nivel**: agrupadores visuales (`GrupoVisual`), nunca nodos
  hidráulicos. El Nivel sólo genera grupo/sublabel cuando la UF tiene 2+
  niveles (mismo criterio que la UX de M1, ADR-0002 §5).
- **DN / longitud**: se muestran tal cual están persistidos en el Tramo
  (`dnComercialAdoptado`, `longitud_m`) — nunca se recalcula ni se
  reinterpreta vía el motor hidráulico. `dnComercialAdoptado` ausente
  (el caso más común, DN automático) se omite en vez de mostrar un
  placeholder tipo "DN pendiente": ese texto sugeriría un dato faltante
  cuando en realidad el motor ya lo resuelve automáticamente en otra
  parte de M2 — decisión de implementación dentro del alcance delegado,
  no una decisión roja.

## 5. Layout (Dagre)

`rankdir: 'TB'` (arriba → abajo), `nodesep: 36`, `ranksep: 64`,
`marginx/marginy: 24`. Tamaños de nodo deterministas por tipo (sin medir
DOM): origen 150×48, local 172×56, derivación 28×28 (190×40 si
`noDetallado`, para no recortar el label), intermedio 10×10.

## 6. Renderer (SVG propio)

Sin React Flow, sin Canvas, sin Graphviz — SVG accesible (`role="img"`,
`<title>`, resumen textual alternativo bajo el visor). Pan: pointer
events + `viewBox`. Zoom: rueda del mouse (zoom al cursor) + botones
`+`/`−` (para mobile, sin gesto de pinch en V1). Fit ("Ajustar"): recalcula
el `viewBox` a partir del bounding box de los nodos **visibles** (respeta
filtros activos).

## 7. Interacciones V1

Pan, zoom (rueda + botones), Ajustar, filtro AF, filtro AC, mostrar/ocultar
etiquetas. Si el usuario apaga ambas redes, se muestra un estado vacío
explicativo en vez de un SVG en blanco — nunca las dos apagadas en
silencio. Los nombres de Local/origen permanecen visibles aunque se
apaguen las etiquetas de arista (DN/longitud).

## 8. Ubicación

Dentro de M2 (`ResultadoHidraulicoDeTramo.tsx`), como bloque
`<section className="esquema-hidraulico">` después de
`ListaDeUnidadesFuncionales` (mismo `<details>` de "Tuberías", visible
sólo cuando la cobertura física de M2 está completa — mismo gate que
`ConstructorDeMontantes`). Sin ruta nueva, sin Módulo 6: arquitectura
one-page intacta.

## 9. No persistencia (confirmado)

`.iuas` no cambia: ningún campo nuevo en `Proyecto`, `Nodo` ni `Tramo`.
x/y, zoom, pan y filtros son estado React efímero (`useState`), nunca
persistido. Test dedicado (`resolverGrafoVisual.test.ts`, "no muta el
Proyecto recibido") serializa el Proyecto antes/después de
`resolverGrafoVisual` y exige igualdad byte a byte.

## 10. Performance

- `resolverGrafoVisual` y `layoutGrafoVisual` están memoizados por
  identidad de `proyecto` (`useMemo`, mismo criterio que
  `ContextoDeCalculoM2` de PERF-SCALE-01C) — nunca se recalculan por
  pan/zoom/filtros, que son estado visual independiente.
- Medición E2E local (proyecto generado con `generarProyectoDeEscala`,
  20 UF × 5 Locales, escala "medium" de VIS-TOPO-00 §16): **203 nodos
  visuales, layout + render en ~591 ms** sobre `vite dev` (build sin
  minificar) — margen amplio para el caso de uso real.
- No se abrió `PERF-SCALE-01` nuevo: no hay evidencia de degradación a
  esta escala.

## 11. Diferido a VIS-TOPO-02

- Expansión Local → artefactos individuales (nivel de detalle).
- Resaltado de terminal crítico / camino crítico — bloqueado por un
  hallazgo de VIS-TOPO-00: `resolverTerminalMasDesfavorable` devuelve
  hoy `'candidatoProvisional'` en la práctica (nunca `'determinado'`,
  por `hfMedidor` sin cerrar, D-δ.35) — se difiere hasta decidir la UX de
  ese estado, no se implementa en V1.
  ```
  Limitación temporal conocida: el terminal crítico no se muestra en
  VIS-TOPO-01 porque la determinación completa del motor todavía no es
  alcanzable en proyectos reales (D-δ.35 abierta). No es "no aplica":
  es "diferido hasta que exista una fuente confiable que mostrar".
  ```
- Click en nodo → resaltar camino; click en Local → scroll a M2; tooltips
  con Q/V/hf.
- Evaluar ELK si un proyecto de escala XL con clustering anidado real lo
  justifica (Dagre alcanzó sin problemas hasta 20 UF / 203 nodos en las
  mediciones de este slice).
- Reutilización del SVG en la Memoria de cálculo (REPORT) — evaluado como
  criterio secundario a favor de SVG sobre Canvas, no implementado.
- Helper compartido `agruparTramosPorMontanteId` si un futuro consumidor
  real lo necesita (hoy sigue sin extraerse, mismo criterio que el resto
  del proyecto: no se crea infraestructura compartida antes de un segundo
  caso de uso real).

## 12. Archivos

- `src/interfaz/paginas/resolverGrafoVisual.ts` (+ `.test.ts`)
- `src/interfaz/paginas/layoutGrafoVisual.ts` (+ `.test.ts`)
- `src/interfaz/paginas/EsquemaHidraulico.tsx`
- `src/interfaz/paginas/esquemaHidraulico.css`
- `tests/e2e/vis-topo.spec.ts`
- `src/interfaz/paginas/ResultadoHidraulicoDeTramo.tsx` (integración, 2 líneas)
- `package.json` / `package-lock.json` (`@dagrejs/dagre`)
