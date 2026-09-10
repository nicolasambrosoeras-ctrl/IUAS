# ADR-0001 — Topología hidráulica explícita y semántica de montantes

- **Estado:** Aceptada (M2-TOPO-E, D-δ.96).
- **Fecha:** 2026-09-10.
- **Serie que la origina:** M2-TOPO-01 (slices A–E: D-δ.91, D-δ.92, D-δ.93,
  D-δ.95, D-δ.96). El detalle incremental vive en `PENDIENTES-DE-ARQUITECTURA.md`;
  este ADR consolida la decisión arquitectónica de fondo.
- **Numeración:** primer ADR del repositorio. La carpeta `docs/adr/` existía
  vacía (deuda registrada en `ROADMAP.md`); no hay ADR-001..014 previos. El
  número conceptual "ADR-015" que circuló en la planificación se descarta:
  la numeración real arranca en `ADR-0001`.

---

## 1. Contexto

Módulo 2 (dimensionamiento y verificación hidráulica de la red interna) debe
poder representar, para un proyecto residencial multifamiliar dentro del
alcance de ERAS 2023:

- distribución general (troncal desde el origen);
- distribución secundaria / ramales comunes que sirven a varios Locales;
- **montantes** verticales con derivaciones por nivel;
- múltiples niveles y cotas;
- caminos hidráulicos raíz → terminal de profundidad arbitraria;
- derivaciones (nodos que bifurcan) y su pérdida localizada;
- el balance de presión de cada terminal.

Antes de M2-TOPO-01, el motor hidráulico ya soportaba topología ramificada
arbitraria (Golden 4, "montante segmentada"), pero la UI no dejaba
**construir ni nombrar** un montante, y no había una decisión formal sobre
dónde vive la topología ni qué es, exactamente, un montante.

El riesgo a evitar era introducir una **segunda fuente de verdad**
topológica (árboles paralelos en componentes React, arrays de Locales
duplicados, coordenadas persistidas, listas de tramos dentro de una entidad
`Montante`) que tarde o temprano divergiría de la red real.

## 2. Decisión

### 2.1 Fuente de verdad única: `RedHidraulica`

La realidad física de la red es **exclusivamente** el grafo
`RedHidraulica = { nodos: Nodo[]; tramos: Tramo[] }`:

- **arborescencia hidráulica dirigida**: grafo dirigido siguiendo
  `Tramo.nodoOrigenId → nodoDestinoId`, sin ciclos, con **como máximo 1
  tramo entrante por nodo** (sin convergencias ni mallas). `validarRedHidraulica`
  lo verifica con alcance `'tuberias'` (`redHidraulicaNodoMultiplesTramosEntrantes`,
  `redHidraulicaCicloDirigido`); nunca bloquea Módulo 1.
- un **fan-out 1→N** (1 entrante, N salientes) es válido — no es una
  convergencia.
- una **red vacía** (`{ nodos: [], tramos: [] }`) es válida: representa un
  Módulo 2 recién iniciado. No se exige una raíz universal para todo el
  `Proyecto` (se admiten subredes independientes).
- las referencias (`Tramo` → nodos, `Nodo.referencia` → artefacto/producción
  ACS) deben resolver; la coherencia AF/AC de cada tramo se valida.

La topología **no vive** en componentes React, ni en la entidad `Montante`,
ni en VIS, ni en arrays duplicados de Locales, ni en coordenadas.

### 2.2 Datos físicos: `Nodo` y `Tramo`

- **`Tramo`** lleva los datos físicos de un tramo de cañería: `longitud_m`,
  `dnComercialAdoptado`, `accesorios` (subconjunto de Tabla N°7 declarable
  en línea), `red`, y `montanteId?` (ver 2.3).
  - longitud 0 es inválida (CRIT-A20); no se fabrican tramos de longitud 0.
  - un DN manual pertenece al catálogo vigente.
  - la **procedencia** de la longitud se marca con `longitudEsSugerida?`
    (RD-2): `true` = precargada por IUAS y re-segmentable; `false`/ausente =
    personalizada, intocable. La procedencia **nunca** se infiere comparando
    valores numéricos: al teclear el input, el flag se elimina aunque el
    número coincida con el sugerido.
  - un **dato físico manual** (longitud no sugerida, accesorios no vacíos,
    DN comercial adoptado a mano) **nunca** se reparte, interpola, escala,
    traslada ni borra al re-segmentar la topología (RD-1). Si un alta de
    Local exigiera partir un segmento personalizado, la operación se
    **bloquea antes de mutar**.
- **`Nodo`** lleva `cota_m?` (opcional) y `tee?` (ver 2.4). Las tees son
  **propiedad nodal**, nunca un accesorio de `Tramo`.

### 2.3 Montante: identidad semántica mínima, membresía derivada

- **`Proyecto.montantes?: readonly Montante[]`** con
  `Montante = { id; red: 'AF' | 'AC'; nombre? }` **y nada más**. Guarda
  *identidad* (qué montantes existen, de qué red, cómo se llaman). **No**
  guarda estructura física: sin `tramosIds[]`, sin `localesIds[]`, sin
  caminos, sin árboles paralelos, sin resultados, sin coordenadas.
- la **pertenencia física** de un segmento a un montante es
  **`Tramo.montanteId`** (referencia del tramo a la identidad).
- los **Locales servidos** se **derivan** siempre de la topología aguas
  abajo (`derivarLocalesServidos` / `obtenerArtefactosAguasAbajo`), nunca de
  una lista.
- el **orden físico** de las derivaciones de un montante se deriva de la
  **cota de piso efectiva del Local** (`resolverCotaPisoDeLocal`,
  GEOM-COTA-01), nunca del orden de clic ni de la cota hidráulica del
  artefacto. Locales a la misma cota reutilizan el nodo de derivación
  existente (sin fabricar un tramo de longitud 0).
- `montanteId` **no es un dato gráfico** y **no lo lee ningún cálculo
  hidráulico**. Su único uso en el motor es la supresión dirigida del
  ascenso vertical implícito D-δ.50: si el camino contiene ≥1 `Tramo` con
  `montanteId`, `resolverIncrementoVerticalPorNivel` devuelve 0 (el
  recorrido vertical real ya está modelado como los segmentos del montante).
  La distribución compartida **genérica** (sin `montanteId`) conserva el
  D-δ.50 histórico.
- un **montante vacío** (0 segmentos, 0 Locales) es válido.
- **borrar** un montante conserva Locales y artefactos (reengancha los feeds
  a la raíz canónica y elimina la identidad).

### 2.4 Tee: metadata nodal para bifurcación 1→2

- `ConfiguracionDeTee` (CRIT-A31) representa **exclusivamente** un nodo de
  1 entrante + 2 salientes: `entradaPorExtremo { tramoSalidaRectaId }` o
  `entradaCentral`.
- la geometría recto/lateral la declara **siempre** el proyectista:
  **cero heurística** (ni por orden del array `tramosSalientesIds`, ni por
  DN, ni por cantidad de terminales, ni por si la rama es el montante).
- sin `Nodo.tee` = "no relevada" (no "sin tee"): en Detalladas, la
  verificación de presión queda incompleta por `teeSinConfigurar` hasta que
  se elija.
- un cambio topológico que rompe el 1→2 de un nodo (alta/baja de Local a la
  misma cota, borrado de montante, la salida marcada como recta dejó de
  salir del nodo) invalida su `Nodo.tee`;
  `reconciliarTeesTrasCambioTopologico` la limpia de forma determinista sin
  tocar `longitud_m` / `dnComercialAdoptado` / `accesorios` ni la topología.
- **Estimadas ignora `Nodo.tee`**: `resolverPerdidaLocalizadaEstimadaDeLocal`
  usa su modelo agregado por `(Local, Red)` (n−1 tees @ Ks 3,00; 1 codo90 @
  1,35; 1 llave de paso @ 9,18; Vref).

### 2.5 Nodo con bifurcación topológica ≠ pieza física concreta

Un `Nodo` que bifurca **no** implica una pieza en T física concreta:

- para **1→2**, el modelo permite al proyectista describir esa pieza con
  `Nodo.tee` (recto / lateral / entrada central, Ks de Tabla N°7).
- para **1→N (N≥3)**, el modelo **no tiene detalle suficiente**. Representar
  su pérdida localizada exigiría fijar orden físico de las ramas, cuál es
  recta, piezas reales y longitudes de nodos intermedios ficticios — datos
  que el modelo no tiene y que IUAS **no inventa** (dos configuraciones
  físicamente válidas dan pérdidas distintas). Desde M2-TOPO-E:
  - la topología 1→N sigue siendo **válida para Qc** y para
    `validarRedHidraulica`;
  - `resolverClasificacionDeTee` la distingue como
    `derivacionMultipleNoModelada` (según la topología real —
    1 entrante + >2 salientes —, nunca según `montanteId`);
  - en Detalladas, `acumularPerdidaLocalizadaDeCamino` marca ese tramo como
    no resuelto y el camino queda **explícitamente incompleto**, nunca un 0
    silencioso que aparente relevamiento completo;
  - **no se asigna ningún Ks, no se calcula pérdida, no se fabrica
    geometría**. La UI del constructor de montantes lo explica y sugiere
    separar las cotas de los Locales para que cada nivel sea una
    bifurcación simple 1→2.

### 2.6 Reconciliación M1 → M2

- **incremental y no destructiva**: cada alta/baja de Local crea o modifica
  sólo lo imprescindible; el feed del Local viaja entero (sólo cambia su
  `nodoOrigenId`).
- **IDs estables**: no se regeneran identificadores de nodos/tramos sin
  necesidad.
- **preservación de datos físicos manuales** (RD-1): ver 2.2.
- **backward-compatible sin migración**: `SCHEMA_VERSION_ACTUAL` no cambia.
  Un `Proyecto` guardado antes de M2-TOPO-01 no trae `montantes`,
  `montanteId`, `longitudEsSugerida` ni `Nodo.tee` y se comporta
  **byte-idéntico**. Ausente y `[]` son equivalentes. Ningún campo nuevo es
  obligatorio.

## 3. Consecuencias

- **VIS-TOPO** deriva el grafo enteramente de `RedHidraulica` +
  `Proyecto.montantes` + UF/Locales + resultados hidráulicos. No necesita
  x/y persistidos, edges persistidos aparte, `localesIds[]` ni `tramosIds[]`
  dentro de `Montante`. La proyección READ-ONLY (`proyectarMontante`,
  `derivacionesDeMontante`, `etiquetaDeSalidaDeMontante`) ya está probada
  por tests de proyectabilidad.
- **HYD-EST** (pérdidas localizadas estimadas path-aware) puede consumir la
  topología para saber, por camino: qué nodo bifurca, cuántas salidas
  tiene, si una tee 1→2 está configurada, si el recorrido pasa recto o
  lateral, DN antes/después, velocidades de tramos y Local/Red destino.
  **Lo que la topología no conoce** es la geometría física de un 1→N;
  HYD-EST no puede inventarla.
- **No se persisten layouts** gráficos.
- **Sin nuevas abstracciones transversales**: no se crea `Graph class`,
  repository layer, event bus, cache global, framework de dominio, segunda
  topología ni motor de plomería generalizado. La arquitectura existente ya
  cumple los invariantes; este ADR la documenta.

## 4. Compatibilidad

- Proyectos **sin montantes** (todos los actuales, incluido el de ejemplo:
  granularidad `simplificada`, 0 tramos compartidos) siguen válidos y
  producen resultados **byte-idénticos** — D-δ.50, Estimadas y goldens sin
  cambios.
- **Proyecto vacío** (0 UF, red vacía, sin montantes) sigue válido;
  "Reiniciar cálculo" no se rompe.
- **M3 / M4** no cambian de responsabilidad: M3 sigue leyendo M2 por los
  contratos actuales; M4 sigue definiendo origen/presión
  (tanque/cisterna/directa) sin cambios.
- **Multinivel futuro (`UI-M1-MULTINIVEL-01`)**: la topología M2 se apoya en
  la **cota de piso efectiva del Local** (`resolverCotaPisoDeLocal` =
  `Local.cotaPiso_m ?? UnidadFuncional.cotaHidraulicaReferencia_m`), **no**
  en el supuesto "una UF = una única planta". Una UF que ocupe varios
  niveles podrá asignar `cotaPiso_m` por Local sin reemplazar el grafo
  hidráulico. La única suposición UF-granular restante es el `3·nivel`
  vertical típico de D-δ.50 en granularidad Simplificada, que ya se suprime
  en los caminos por montante y es una aproximación conocida de ese método,
  no una dependencia de la topología. Este ADR **no** incorpora una entidad
  `Nivel` nueva.
