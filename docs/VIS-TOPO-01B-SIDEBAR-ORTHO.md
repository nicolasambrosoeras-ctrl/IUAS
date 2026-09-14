# VIS-TOPO-01B — Reubicación del visor + routing ortogonal + AF azul / AC rojo

- **Estado:** Implementado — pendiente validación manual.
- **Serie:** `VIS-TOPO-00` (investigación) → `VIS-TOPO-01` (implementación
  V1, técnicamente correcta pero con presentación no definitiva) →
  `VIS-TOPO-01B` (este slice: reubicación de UI + routing ortogonal +
  colores AF/AC, **sin cambios de semántica del grafo**).

---

## 1. Objetivo

Tres decisiones cerradas, ninguna cambia qué significa el grafo:

- **A. Desktop:** el visor deja de ser un bloque grande dentro del flujo
  vertical de M2; pasa a vivir como panel chico y contraído por defecto
  debajo de la navegación lateral de módulos/progreso.
- **B. Mobile:** el grafo no ocupa espacio permanente en M2; una acción
  compacta ("Visualizar esquema") abre un overlay propio de la
  aplicación, prácticamente de pantalla completa (sin Fullscreen API).
- **C. Routing ortogonal:** las aristas dejan de ser líneas diagonales
  genéricas — troncales verticales, ramificaciones horizontales, quiebres
  a 90°.
- **D. Colores:** AF = azul, AC = **rojo** (ya no salmón), sólo dentro del
  visor.

## 2. Arqueología UI (breakpoint real, sin inventar uno nuevo)

`900px` es el breakpoint YA existente que separa "hay sidebar" de "no hay
sidebar" en toda la aplicación:

- `.app-layout` pasa de `grid-template-columns: 232px minmax(0,1fr)` a
  una sola columna (`navegacionUI.css:176-184`).
- `.app-nav` (la sidebar) pasa de columna sticky a barra horizontal
  desplazable (`navegacionUI.css:201-234`).
- `.resumen-proyecto` (el resumen Qc/Reserva/Margen crítico que ya vive
  dentro de `.app-nav`) se oculta directamente en ese mismo rango
  (`resumenDeProyecto.css:58-62`).

VIS-TOPO-01B reutiliza EXACTAMENTE ese breakpoint (`@media (min-width:
901px)` para el panel sidebar, `@media (max-width: 900px)` para el botón
mobile) — ningún breakpoint paralelo.

`NavegacionDeSecciones.tsx` (`.app-nav`) es la sidebar real; el
mecanismo de modal reutilizado es el `<dialog>` nativo + `showModal()`
que ya usa `DialogoDeConfirmacion.tsx` (foco, Escape, backdrop de
fábrica — sin segunda librería de modal).

## 3. Arquitectura (sin tocar la Capa 1)

```
resolverGrafoVisual.ts   (capa 1 — SIN CAMBIOS: ni un tipo, ni un nodo,
                           ni una arista, ni la agregación de Local)
       ↓
layoutGrafoVisual.ts     (capa 2 — Dagre sigue resolviendo rank/orden/
                           posición de nodo; el TRAZADO de arista ahora
                           es ortogonal, geometría propia)
       ↓
EsquemaHidraulico.tsx    (capa 3 — hook compartido `useEsquemaHidraulico`
                           + `VisorHidraulico` (contenido) instanciados
                           en DOS puntos de montaje según viewport)
```

`resolverGrafoVisual.ts` no se tocó: se verificó que `GrafoVisual`,
`NodoVisual` y `AristaVisual` (los tipos que layoutGrafoVisual.ts
consume) ya eran suficientes para el routing ortogonal — no hizo falta
ni un campo nuevo.

## 4. Desktop — panel sidebar

`NavegacionDeSecciones.tsx` ahora acepta un `proyecto?: Proyecto` opcional
y monta `<PanelEsquemaHidraulicoSidebar proyecto={proyecto} />` dentro de
`.app-nav`, después de `ResumenDeProyectoPanel`. El panel:

- es un `<button aria-expanded>` con flecha `▸`/`▾` (mismo patrón que
  `CabeceraDeUnidadFuncional` en `ResultadoHidraulicoDeTramo.tsx`) +
  cuerpo condicional;
- arranca **contraído** en cada bootstrap (`useState(false)`, sin
  persistencia — VIS-TOPO-01B §7);
- visible sólo vía CSS (`@media (min-width: 901px)`) — se monta siempre
  (evita hooks condicionales) pero no hace ningún trabajo visible fuera
  de rango;
- al expandirse por primera vez ejecuta `Ajustar` automáticamente (una
  sola vez por sesión de expansión, no en cada toggle — VIS-TOPO-01B
  §32);
- usa el ancho real de la columna lateral (232px): el viewport interno
  del SVG mide 260px de alto dentro del panel (vs. ~55vh del visor
  completo), con su propio pan/zoom para el detalle — VIS-TOPO-01B §8.

## 5. Mobile — botón + overlay

`ResultadoHidraulicoDeTramo.tsx` monta `<BotonVisualizarEsquema
proyecto={proyecto} />` justo antes de `DistribucionGeneral` (dentro del
mismo gate de cobertura física que el resto del cuerpo de M2 — no tiene
sentido ofrecer el esquema antes de que la red esté resuelta), en
reemplazo del bloque `<EsquemaHidraulico>` grande que vivía al final del
cuerpo. El botón:

- es un `<button>` compacto, visible sólo vía CSS en `@media (max-width:
  900px)`;
- al tocarlo monta un `<dialog className="vis-topo-overlay">` y llama
  `showModal()` — foco, Escape (evento `cancel`, mismo patrón que
  `DialogoDeConfirmacion.tsx`) y backdrop nativos;
- ejecuta `Ajustar` automáticamente en **cada** apertura (a diferencia
  del panel desktop, acá siempre — VIS-TOPO-01B §11);
- al cerrar, el `<dialog>` se desmonta (no se llama `.close()`), así que
  el foco no vuelve solo al disparador: se restaura explícitamente
  (`disparadorRef.current?.focus()`);
- no usa `requestFullscreen()`: el overlay ocupa `100vw`/`100vh` por CSS
  propio.

Ambos puntos de montaje instancian el mismo hook
(`useEsquemaHidraulico`) de forma independiente — cada uno con su propio
pan/zoom/filtros, ya que nunca están visibles los dos a la vez (uno u
otro según viewport). Esto implica que `resolverGrafoVisual` +
`layoutGrafoVisual` corren dos veces por cambio de Proyecto (una por
instancia) en vez de una — aceptado como costo menor dado que cada
resolución es sub-segundo incluso a escala de 20 UF (VIS-TOPO-01,
~591 ms/203 nodos); evitarlo exigiría levantar el estado a un contexto
compartido, complejidad no justificada para V1.

## 6. Routing ortogonal (`layoutGrafoVisual.ts`)

Dagre sigue resolviendo **sólo** rank/orden/posición de nodo (`x`/`y` por
nodo) — nunca el trazado de arista. Cada arista sale por el borde
**inferior** de su nodo origen y entra por el borde **superior** de su
nodo destino (el layout es siempre top-down):

- **Alineados** (`|origen.x − destino.x| < 0.5`): línea vertical pura,
  2 puntos.
- **No alineados:** codo de 3 tramos (vertical → horizontal → vertical),
  4 puntos, con una `branchY` = punto medio entre la salida del origen y
  la entrada del destino.
- **Fan-out real (1→N):** cuando varios hijos cuelgan del mismo origen y
  están en el mismo rank, sus `branchY` coinciden automáticamente (misma
  fórmula, mismos extremos) — el bus horizontal compartido emerge sin
  lógica especial de "bus compartido".
- **Aristas paralelas** (mismo par origen/destino visual — p. ej. varios
  artefactos de un Local que nacen del mismo nodo de derivación):
  offset determinista por índice (`±8px` para 3 aristas, VIS-TOPO-01B
  §19), aplicado como desplazamiento lateral (caso alineado) o como
  desplazamiento de `branchY` (caso con codo) — nunca aleatorio.

Invariante verificado por test (`layoutGrafoVisual.test.ts`): para todo
par de puntos consecutivos de toda arista, `x1≈x2` o `y1≈y2` (tolerancia
0.01) — nunca ambos distintos. Casos cubiertos: 1→1 alineado, 1→1
desalineado, 1→2, 1→4 (fan-out no detallado), 3 aristas paralelas,
montante (3 segmentos reales encadenados).

## 7. Colores — AF azul / AC rojo (sólo dentro del visor)

`--color-ac` (salmón, `#a4442f`) es el token **compartido** que usa
`BadgeDeRed` en toda la interfaz de M2 (tablas, cards de montante, etc.)
— cambiarlo habría repintado todas esas pills, un alcance mayor al de
este slice ("no abrir rediseño global", VIS-TOPO-01B §27). En cambio,
`esquemaHidraulico.css` define tokens **propios**, scoped a
`.esquema-hidraulico`/`.vis-topo-sidebar-panel`/`.vis-topo-overlay`:

```css
--vis-topo-af: var(--color-af);      /* ya es un azul adecuado, reutilizado tal cual */
--vis-topo-ac: #c0392b;              /* rojo técnico propio, distinto del salmón compartido */
```

`--vis-topo-ac` es también distinto de `--color-error` (`#b02a21`) —
ambos leen como "rojo" (decisión explícita del brief: la distinción
entre AC y error se hace por icono/borde/texto, nunca por el matiz
exacto), pero con tonos ligeramente distintos.

**Bug real encontrado y corregido:** los arrowheads de VIS-TOPO-01
usaban un único `<marker>` compartido con `fill: currentColor`, más una
regla CSS `.vis-topo-arista.vis-topo-red-af .vis-topo-flecha` que
**nunca podía matchear** — un `<marker>` vive una sola vez dentro de
`<defs>`, fuera del árbol de cualquier arista concreta, así que ningún
selector descendiente de `.vis-topo-red-af`/`.vis-topo-red-ac` llega a
tocarlo. El resultado real (confirmado en la validación manual: "flechas
negras") era que todas las flechas heredaban el `color` por defecto,
nunca el de la red. Corregido con **dos** `<marker>` (`vis-topo-flecha-af`
/ `vis-topo-flecha-ac`), cada uno con su propio `fill` fijo por CSS, y
cada arista referencia el marker de su propia red. De paso, se
redujeron (más discretos, VIS-TOPO-01B §22: `markerWidth`/`markerHeight`
5.5 en vez de 7).

## 8. Labels de arista

Con routing ortogonal el punto "del medio" de la lista de puntos ya no
cae necesariamente sobre un tramo horizontal legible (con 4 puntos el
índice central es un vértice, no un punto medio útil). Los labels
(DN/longitud, nombre de Montante) se reposicionan sobre el **segmento
más largo** del trazado (`puntoSobreSegmentoMasLargo`), que es el que
mejor acompaña la arista sin quedar pegado a un codo. Sin cambios de
datos: DN ausente sigue omitiéndose (nunca "DN pendiente").

## 9. Qué NO cambió

- `resolverGrafoVisual.ts`: cero cambios — ni un tipo, ni un nodo, ni una
  arista, ni la cantidad de Tramos representados.
- Local sigue siendo destino agregado; fan-out sigue marcado
  `noDetallado` sin tees inventadas; Montante sigue sin nodo propio; UF/
  Nivel siguen sin ser nodos hidráulicos.
- `.iuas` / schema / serializer / autosave / motor / `RedHidraulica` /
  validadores / M3 / M4 / REPORT: sin cambios.
- Terminal crítico, artefactos individuales, click-to-scroll, ELK:
  siguen diferidos a VIS-TOPO-02 (sin cambios respecto de VIS-TOPO-01).

## 10. Tests

- `layoutGrafoVisual.test.ts`: +8 tests de ortogonalidad (1→1 alineado/
  desalineado, 1→2, 1→4, paralelas, bus compartido, montante, dirección
  top-down) — 14/14 en el archivo.
- `resolverGrafoVisual.test.ts`: sin cambios (capa semántica intacta).
- `tests/e2e/vis-topo.spec.ts`: reescrito para la nueva ubicación — 9
  casos × desktop/mobile: panel sidebar contraído por defecto, expandir/
  colapsar sin desplazar el contenido principal (medido por
  `offsetTop`, invariante al auto-scroll del click), controles (AF/AC/
  Etiquetas/zoom/Ajustar), fan-out marcado, botón mobile visible sin
  panel/grafo inline, overlay (título/Cerrar/toolbar/SVG/auto-Ajustar/
  sin overflow horizontal), cerrar vuelve a M2, Escape cierra, filtros
  dentro del overlay.

## 11. Diferido (sin cambios respecto de VIS-TOPO-01 §11)

Artefactos individuales, terminal/camino crítico (bloqueado por D-δ.35),
click-to-highlight, tooltips ricos, ELK, integración REPORT, exportar
SVG, edición del grafo, drag de nodos, persistir layout, Fullscreen API
real.
