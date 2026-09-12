# Roadmap — IUAS

Visión estructural por hitos/capacidades, no un cronograma temporal. No
contiene fechas. Organizado por bloques de capacidad, con dependencias
explícitas cuando existen; el orden entre subbloques de un mismo módulo
no está fijado salvo que se indique lo contrario.

Para el detalle técnico exacto de cada pieza ya implementada, ver
`RESUMEN-CONTINUIDAD-M2.md`. Para decisiones de arquitectura pendientes,
ver `PENDIENTES-DE-ARQUITECTURA.md`.

## Estado actual

### HYD-EST-01 — en implementación (D-δ.112)

Checkpoint local: Estimadas se calcula por recorrido y velocidades reales;
la presión consume esas contribuciones. Derivaciones 1→N no modeladas
dejan la localizada y su verificación incompletas, sin fallback histórico.
Una singularidad K=1,35 por terminal sustituye esa cardinalidad de D-δ.45.
Detalladas no se modifica. Pendientes: baselines afectados, auditoría final
de memoización, E2E y gates completos Nivel A, fuzz y producción.
Continuidad exacta en `HANDOFF-CONTEXT.md`. No es un cierre del slice.

### Fase 0 — cerrada

Fundaciones del proyecto:

- arquitectura general (`modelo/` puro, `motor/` determinístico,
  `normativa/` como fuente de catálogo/criterios, `validacion/` previa al
  motor, `interfaz/` sin lógica de negocio propia);
- separación estricta catálogo / criterios interpretativos (`CRITERIOS.md`)
  / motor;
- primeras decisiones arquitectónicas registradas.

### Fase 1 / Módulo 1 (Demanda) — estable

- `Qmax`, `Kc`, `K`, `Qc` — pipeline completo de simultaneidad;
- reglas CRIT-A2, CRIT-A4, CRIT-A5, CRIT-A8, CRIT-A12, CRIT-A14;
- UX funcional completa: proyecto editable, UF/Locales/Artefactos con
  alta/baja, PDF real conectado.

No se toca salvo bug real confirmado.

### Fase 1 / Módulo 2 (Tuberías) — pausa técnica actual

**Completado:**

- topología dirigida (`Nodo`/`Tramo`/`RedHidraulica`), ortogonal a la
  jerarquía funcional;
- resolución de artefactos aguas abajo, deduplicación por identidad
  completa;
- condición AF/AC/producción ACS (CRIT-A15), sin duplicar conteo;
- cobertura física auditada (S1) y barrera de presentación cuando está
  incompleta (S2) — M1 autoritativo sobre existencia, `redHidraulica`
  autoritativa sobre conexión física;
- trazabilidad `cantidad` → `n` hidráulico efectivo, visible y distinta
  de "referencias físicas" en la tabla;
- piso físico de caudal individual (CRIT-A22);
- predimensionamiento (CRIT-A10/CRIT-A16);
- catálogo comercial de tuberías (Acqua System Magnum PN20) y catálogo de
  materiales (6 materiales, C/ε propios);
- selección de diámetro comercial por velocidad real (CRIT-A23);
- pérdida distribuida Hazen-Williams (CRIT-A17) y Darcy-Weisbach
  (CRIT-A18/CRIT-A21);
- longitud física de Tramo editable desde la UI transitoria de M2 (L1),
  primer punto de escritura de UI sobre `redHidraulica`;
- pérdida distribuida `hf` visible en pantalla, con las 4 variantes del
  pipeline correctamente distinguidas (L2);
- golden end-to-end del vertical slice completo: demanda → Qc por tramo →
  diámetro comercial → Di efectivo → velocidad → longitud → `hf` (G1);
- fallback por velocidad mínima ante `Qc` muy bajo (D-δ.27, CRIT-A24) —
  `Vmax` sigue dura, `Vmin` deja de bloquear exclusivamente cuando el
  menor diámetro comercial normativamente evaluable ya la incumple;
- selector de sistema comercial en la UI (D-δ.28), mismo patrón que el
  selector de material ya existente;
- motor puro de balance de presión con barrera de completitud
  (`resolverBalanceDePresion` + `resolverPresionMinimaDeArtefacto`,
  D-δ.36) — recibe `Pdisponible` explícito, no conoce el origen
  hidráulico;
- primitivas de pérdida de carga del medidor (CRIT-A25) y localizada
  singular (CRIT-A26), aún sin consumidor topológico;
- recorrido del camino hidráulico real hasta un terminal
  (`obtenerCaminoHaciaOrigen`, CRIT-A27 / D-δ.37) — alimentación
  ramificada como precondición de los motores hidráulicos de M2, sin
  restringir el modelo `RedHidraulica` (recirculación ACS sigue
  diferida); estados de topología no resoluble explícitos, nunca
  elección silenciosa de predecesor;
- desnivel Δz del camino (`resolverDesnivelDeCamino`, extremos
  raíz↔terminal) y acumulación de pérdida distribuida a lo largo del
  camino (`acumularPerdidaDistribuidaDeCamino`) — ambos con estado
  incompleto explícito, nunca término ausente = 0;
- orquestador `resolverPresionResidualDeCamino` que compone camino +
  desnivel + Σhf distribuida + Pmin del terminal + balance;
- pérdida localizada declarable sobre `Tramo` para el subconjunto
  inequívoco de Tabla N°7 (curvas, codo 90°, llave de paso, válvula
  esclusa, uniones, tubo saliente — CRIT-A28, M2-C slice A), integrada
  como `hfLocalizada` en el balance;
- barrera de completitud del balance corregida para distinguir cobertura
  *parcial* (solo el subconjunto CRIT-A28) de *completa* (toda Tabla
  N°7) — `hfLocalizada` nunca cuenta como término presente mientras la
  cobertura sea parcial, aunque el valor calculado siga siendo auditable;
- grifería vs. presión mínima resuelto como criterio IUAS explícito
  (CRIT-A29): la verificación de presión termina en la boca de conexión
  del artefacto, la grifería terminal no se suma como pérdida localizada;
- sincronización automática Proyecto → `redHidraulica` al agregar/quitar
  un Artefacto de un Local ya conectado (D-δ.39, M2-D) — sin persistir
  ningún concepto nuevo de "cabecera";
- modo estándar/estimado de pérdidas localizadas (D-δ.40), completitud
  real de `EstadoModulo2` (D-δ.41), cierre y rediseño funcional de la UI
  de M2 (D-δ.42/43) y su corrección de granularidad
  simplificada/profesional (D-δ.44), plantilla típica de pérdidas
  localizadas del modo rápido (D-δ.45);
- cota hidráulica por Unidad Funcional en modo simplificado (D-δ.46),
  niveles por UF + criterio de terminal crítico por margen (D-δ.48),
  auditoría funcional y robustez de M2 (D-δ.47);
- bootstrap de conectividad física para Local+Red nuevos (D-δ.49) — un
  proyecto se puede construir íntegramente desde la UI, sin ninguna
  `redHidraulica` prearmada;
- **cierre UX funcional de M2 (D-δ.50)**: duplicar UF sincroniza la
  conectividad física de la copia (reutiliza D-δ.49, sin nueva primitiva
  topológica); longitudes obligatorias visibles en el bloque principal de
  M2 (no dentro de "Detalle técnico"); longitud vertical típica
  automática por nivel de UF (`ΔLvertical = 3 m · nivel`) en granularidad
  `simplificada` — derivada, no persistida, aplicada a la longitud
  efectiva de la Alimentación general (y, en AC, también de la
  Alimentación ACS); en `profesional` no aplica (paralelismo con D-δ.46);
  Panel de Presión reorganizado con veredicto protagonista CUMPLE/NO
  CUMPLE, terminal más desfavorable por margen, "Ver cálculo del crítico"
  auditable y "Ver todos los terminales" ordenado por margen;
- **override manual de DN + resincronización física al cambiar tipo de
  Artefacto (D-δ.52)**: `Tramo.dnComercialAdoptado` (denominación
  comercial) sustituye al diámetro automático como diámetro EFECTIVO de
  cálculo — V/J/hf/presión se resuelven con él, Qc no cambia; control
  ↓/DN/↑/Auto que se mueve por el catálogo comercial real y se
  deshabilita en los extremos; cambio de material/sistema descarta
  overrides inválidos. CRIT-A15 resuelto:
  `reconciliarConectividadFisicaPorCambioDeArtefacto` reconcilia AF/AC
  por conjuntos de Redes (conserva la intersección con su relevamiento
  intacto, elimina solo la diferencia + poda cabeceras vacías, agrega la
  diferencia vía D-δ.49), idempotente, en un único updater;
- **modos de producto + predimensionamiento rápido + presentación
  tabular (D-δ.51)**: dos experiencias sobre el mismo motor — Rápido
  (`simplificada` + `estimadas` + Hazen + PPR, longitudes iniciales
  5/10/10 precargadas no destructivas, +3 m/piso) y Profesional
  (`profesional` + `detalladas`, longitudes iniciales 10/5 donde faltaban,
  accesorios "sin relevar" con acciones explícitas — nunca `[]` implícito,
  decisión roja resuelta). "Modo de trabajo" es un concepto derivado de
  los ejes existentes, sin campo persistido ni migración. La vista
  principal de M2 pasa a tablas compactas (Longitud · DN · V · Pérdida ·
  Estado) con detalle expandible por fila; "Configuración avanzada"
  conserva las 4 combinaciones técnicas de D-δ.47. Cambiar de modo nunca
  resetea datos;
- con `hfMedidor` provisto por Módulo 3 por terminal (D-δ.58, ya no un
  input manual del Panel de Presión), el balance alcanza `balanceCompleto`
  en la práctica (verificado end-to-end por Playwright); el resto de Tabla
  N°7 en modo detallado sigue con su barrera de cobertura parcial correcta;
- **auditoría de regresión de M2 posterior a M3 (D-δ.60)**: verificado
  contra `92e5412` (cierre de M2) que ningún contrato cerrado de M2 se
  degradó. Los primitivos hidráulicos de M2 (`resolverBalanceDePresion`,
  `resolverPresionResidualDeCamino`, `resolverHidraulicaDeTramo`,
  `resolverDiametroComercialDeTramo`, Hazen/Darcy, localizadas, tees,
  reducciones, topología, Δz, vertical por nivel, `duplicarUnidadFuncional`,
  `reconciliarConectividadFisicaPorCambioDeArtefacto`, control de DN) son
  **byte-idénticos**. Único cambio deliberado: `hfMedidor` manual →
  fuente M3 por terminal (`resolverEstadoModulo2` acepta además una
  función por terminal; escalar histórico intacto). Sin acoplamiento
  indebido ni dependencia circular. Sin regresiones. Sin bugs.

**Pendiente**, organizado en subbloques (dependencias indicadas donde
existen; sin orden absoluto fijado entre ellos salvo lo señalado):

#### M2-A — Robustecer selección comercial

- selección/verificación de clase comercial (PN20/PN25 u otra),
  considerando presión de diseño y temperatura de servicio — nunca
  asumir PN20 suficiente por defecto (D-δ.29, bloqueada por M2-B);
- margen de seguridad de diseño, como criterio explícito y trazable
  (D-δ.30, requiere definir fórmula/factor — no decidido);
- decidir granularidad de `sistemaDeTuberiaId` (global/por red/por
  tramo) (D-δ.31, diferida hasta que exista un segundo sistema
  comercial real que lo justifique).

#### M2-B — Presión

Depende de tener resuelta (o al menos delimitada) la clase comercial de
M2-A antes de cerrar la verificación de presión-temperatura de tubería.

**Ya implementado** (ver lista "Completado" arriba): motor puro de
balance, recorrido del camino hacia el origen (CRIT-A27), desnivel Δz de
camino, acumulación de `hf` distribuida por camino, y el orquestador
`resolverPresionResidualDeCamino` que los compone. El balance resultante
es hoy siempre incompleto por diseño (barrera de completitud): faltan los
términos de M2-C.

**Pendiente:**

- investigación normativa/bibliográfica previa obligatoria (presión
  mínima ERAS, antecedentes, tensión con alimentación por tanque
  elevado — sin verificar todavía);
- origen hidráulico (tanque elevado / presión de red / bombeo) y de
  dónde sale `Pdisponible` — deliberadamente diferido (D-δ.36);
- camino crítico: selección del terminal más desfavorable entre varios
  (hoy `resolverPresionResidualDeCamino` resuelve un terminal dado, no
  elige cuál);
- integración de las pérdidas de M2-C (localizada + medidor) para que el
  balance pueda cerrar como completo;
- redimensionamiento por presión — nunca reduciendo `Qc` para forzar el
  cumplimiento.

#### M2-C — Pérdidas localizadas

**Ya implementado** (ver lista "Completado" arriba): subconjunto
inequívoco de Tabla N°7 declarable sobre `Tramo` (CRIT-A28) e integrado
al balance con barrera de completitud correcta; grifería vs. `Pmin`
resuelta (CRIT-A29).

**Pendiente** (D-δ.33 sigue abierta para el resto):

- reducciones — qué velocidad usa `Js` cuando cambia el diámetro entre
  dos Tramos consecutivos (sin convención inequívoca todavía);
- tees (paso recto / salida lateral / entrada central) — `RedHidraulica`
  no tiene orientación espacial, no distingue qué `Ks` corresponde sin
  geometría o declaración manual;
- nunca mezclar con `longitud_m` (D-δ.22).

#### M2-D — Sincronización / topología productiva

**Ya implementado** (D-δ.39): alta y baja de un Artefacto en un Local ya
físicamente conectado sincronizan `redHidraulica` automáticamente —
`sincronizarConectividadFisicaDeArtefactoConRedesDeclaradas`/`quitarConectividadFisicaDeArtefacto`
(`interfaz/paginas/`), apoyados en `hallarNodoDeInsercionDeLocal`. Sin
ningún concepto nuevo de "cabecera" persistida — el punto de inserción se
deriva de la topología existente en cada llamada. Aditivo/no destructivo:
nunca modifica `longitud_m`/`cota_m`/`accesorios` ya cargados, nunca
elimina infraestructura compartida del Local.

**Qué Redes conectar (D-δ.84, CAT-CONN-01):** ya no se deduce de un
precedente del proyecto (`determinarRedesFisicasPorPrecedente` — eliminado)
sino de la **política de conectividad del catálogo** + el override de
instancia `Artefacto.conectividadElegida`, vía
`resolverConectividadInicialDeArtefacto` (`motor/tuberias/topologia/`).
`automatica` / `defaultConfigurable` conectan sin preguntar;
`requiereSeleccion` (lavavajillas / lavarropas industrial) pide declarar
la alimentación. Ver `CRITERIOS.md` → CAT-CONN-01.

**Pendiente:**

- ~~primera instancia de un `artefactoId` sin precedente~~ — RESUELTO en
  D-δ.84 (CAT-CONN-01): la conectividad sale de la política del catálogo,
  no de un precedente; `requiereSeleccion` es el único caso que sigue
  pidiendo declaración explícita;
- ~~sincronización al **cambiar el tipo** de un artefacto ya creado~~ —
  RESUELTO en D-δ.52 (`reconciliarConectividadFisicaPorCambioDeArtefacto`:
  reconciliación AF/AC por conjuntos de Redes, reutilizando bootstrap/
  retrofit/hermano de D-δ.49); D-δ.84 lo reorientó a la política del tipo
  nuevo (sin herencia stale del tipo anterior);
- reconciliación general Proyecto ↔ `redHidraulica` para el resto de
  mutaciones (más allá de alta/baja/cambio-de-tipo de Artefacto individual).

#### M2-E — UX final

- presentación definitiva de resultados (la tabla actual es
  explícitamente transitoria);
- diagnósticos, errores y advertencias con mejor trazabilidad;
- navegación de instalación (montantes, agrupación por Local/UF) —
  encarada por la serie **M2-TOPO-01** (A: identificación estructural +
  invariantes de arborescencia, D-δ.91 CERRADO; B: enumeración/edición de
  distribución secundaria + fix retrofit DN D-δ.49 + D-δ.50 resuelto como
  "diferir deduplicación vertical", D-δ.92 CERRADO; C: identidad semántica
  de montante (`Proyecto.montantes`) + constructor en M2 (alta/baja de
  Locales, RD-1/RD-2, supresión dirigida de D-δ.50), D-δ.93 CERRADO;
  D: edición fina de tees de las derivaciones de montante + reconciliación
  de `Nodo.tee` tras cambios de topología, D-δ.95 CERRADO (con la pérdida
  localizada de las derivaciones 1→N documentada como limitación conocida);
  E: cierre arquitectónico + `ADR-0001` + política 1→N (`derivacionMultipleNoModelada`:
  un fan-out 1→N en Detalladas deja el camino explícitamente incompleto en
  vez de aparentar "completo" con 0) + desbloqueo formal de HYD-EST/VIS-TOPO,
  D-δ.96 CERRADO). **M2-TOPO-01: CERRADO.**

#### Documentación / exportación

- memoria de cálculo de M2;
- integración con el PDF existente;
- trazabilidad normativa completa en el exportable.

### Fase 2 / Módulo 3 (Medidores) — CERRADO (M3-F, D-δ.59)

Ver `PENDIENTES-DE-ARQUITECTURA.md` D-δ.53 para el detalle. M3 está
**separado de `RedHidraulica`** (decisión roja 1, alternativa 4): consume
el `Qc` ya resuelto por la capa de caudal aguas arriba y produce
`hfMedidor` como dato de borde para la capa de presión de M2 — no
recalcula demanda, no toca la topología.

**Completado:**

- **M3-A** — contrato de dominio: arqueología del repo, inventario
  normativo verificado contra el texto oficial de la Resolución 641/2023
  (§2.6, §2.12, §2.12.1, Tabla N°6), frontera M3/M2, y resolución de las
  tres decisiones rojas por el usuario (1: M3 separado de `RedHidraulica`;
  2: `K=1` para el medidor individual; 3: Tabla N°6 verificada);
- **M3-B0** — Tabla N°6 (ERAS §2.12 / ISO 4064) transcripta y verificada
  (`normativa/eras-2023/tabla-06-medidores`), con `seleccionarFilaTabla06PorCaudal`
  (regla literal `Qc_tabla >= Qc`, sin interpolación de DN);
- **M3-B1** — motor puro del **medidor general**
  (`motor/medidores/seleccionarMedidorGeneral`): `Qc` global → DN + `C` de
  Tabla N°6 → `hfMedidor` vía `calcularPerdidaCargaMedidor` (CRIT-A25).
  Resultado auditable; `Qc > 40 m³/h` → `fueraDeTabla06` (sin
  extrapolar); sin verificación metrológica (ERAS no publica Q1..Q4/Qmin);
- **M3-B2a** — motor puro del **medidor individual** por unidad funcional,
  sobre **alcance declarado** (`motor/medidores/seleccionarMedidorIndividual`):
  `Qunit = Σ (cantidad · qu efectivo)` con **`K=1`** (simultaneidad total,
  §2.6 / CRIT-A33), sin `Kc`/`K`/`a`; mismo `Qunit` para selección
  (Tabla N°6) y para el `Qcl` de la pérdida. No autodetecta cantidad ni
  ubicación de medidores; no impone "1 AF + 1 AC por UF"; no toca
  `RedHidraulica`. Núcleo tabular compartido con el general
  (`resolverSeleccionYPerdidaDeMedidor`);
- **CRIT-A32** — formaliza Tabla N°6, la regla de selección y la
  inconsistencia oficial del ejemplo de "vivienda tipo" (empareja DN19 con
  `C=7`; la tabla asigna `C=5` a DN19). La tabla es la fuente de verdad.
- **CRIT-A33** — caudal de diseño del medidor individual por simultaneidad
  total (`K=1`): prevalece §2.6 (regla dedicada) sobre §2.12.1.e (remisión
  genérica). La contradicción interna de la Guía queda documentada.
- **M3-B2b** — cardinalidad y alcance de los medidores individuales
  (`motor/medidores/resolverAlcancesDeMedidoresIndividuales`, CRIT-A34):
  de `{ esPropiedadHorizontal, tipoProvisionACSPorUF }` + la conectividad
  física real → lista de alcances (input de B2a). ACS **individual** → 1
  medidor AF por UF con `quTotal` de todo el consumo (conservación de
  masa); ACS **central** → medidor AF + medidor AC (sólo si hay consumo
  AC). El tipo de ACS es **configuración declarada por UF**, no inferida
  de la topología (figuras 2.2–2.7 y 2.14–2.16 reconstruidas, D-δ.54). Sin
  PH → 0 medidores. No persiste nada.
- **CRIT-A34** — cardinalidad y alcance de medidores individuales:
  criterio físico individual/central, identidad `UF + servicio`, universo
  de consumos (computables + conectados; CRIT-A8 diferido).
- **M3-C** — `EstadoModulo3` + configuración persistida (D-δ.55):
  `Proyecto.configuracionMedidores?` (`esPropiedadHorizontal`,
  `tipoProvisionACS` global + override por UF; optativo, sin migración);
  `resolverEstadoModulo3` (`motor/modulo3/`) orquesta general + B2b + B2a
  y clasifica en `noIniciado` / `error` / `incompleto` / `evaluado`.
  `'evaluado'` = todos los medidores requeridos seleccionados (**sin**
  `todosCumplen` — no hay verificación metrológica todavía); `Qc > 40
  m³/h` es `'incompleto'`, nunca `'error'`. `validarConfiguracionMedidores`
  integrado en `validarProyecto`.
- **M3-D parte 1** — panel "Módulo 3 — Medidores" en la one-page (D-δ.56):
  configuración persistida vía UI (propiedad horizontal, provisión de ACS
  global + override por UF), tablas de medidor general e individuales,
  `EstadoModulo3` visible, progressive disclosure Rápido/Profesional
  (derivado del modo de trabajo de M2, sin eje nuevo). Caudal `> 40 m³/h`
  → `'incompleto'`, nunca DN inventado.
- **M3-D parte 2** — override manual de medidor recomendado vs. adoptado
  (D-δ.57): `configuracionMedidores` gana `medidorGeneralAdoptadoDN?` y
  `medidoresIndividualesAdoptadosDN?` (Record por clave `UF|servicio`);
  `resolverMedidorAdoptado` (puro) hace el DN adoptado **hidráulicamente
  efectivo** (C de esa fila, `hf` recalculada, `Q` intacto);
  `resolverEstadoModulo3` los aplica; `ResultadoModulo3` pasa a
  `recomendado`+`adoptado` por medidor; control ↓/DN/↑/Auto por Tabla N°6;
  `criterioSeleccion: 'satisface' | 'inferiorAlRecomendado'` sin
  `todosCumplen`. Overrides huérfanos ignorados al leer.
- **M3-E** — integración `hfMedidor` M3→M2 (D-δ.58): input provisional del
  Panel de Presión eliminado; `resolverPerdidasDeMedidoresParaTerminal`
  (puro) resuelve qué medidores pertenecen al camino de cada terminal
  (general solo en alimentación directa; individual de ACS individual
  aplica a AF **y** AC de la UF; ACS central AF/AC separados; aislamiento
  por UF); `resolverEstadoModulo2` acepta `hfMedidor` por terminal
  (`resolverPresionResidualDeCamino` intacto); `EstadoModulo3.incompleto`
  expone `parcial`; falta de dato → `indeterminado`, nunca 0; cero
  determinado (tanque + no PH) sí es 0.
- **M3-F** — auditoría end-to-end de M3 y cierre funcional (D-δ.59):
  dominio (Tabla N°6, medidor general, individuales `K=1`, cardinalidad,
  ACS individual/central), configuración persistida y backward
  compatibility, UI operable (recomendado/adoptado, ↑/↓/Auto), integración
  M3→M2 (directa/tanque, aislamiento por UF, indeterminado ≠ 0, input
  provisional eliminado), presión (`Presidual`/margen/crítico) y
  reactividad. **Verificación de navegador real** (Playwright, dev server):
  17/17 smoke checks, consola sin errores/warnings. **Sin bugs.** Ajustes
  menores: 1 comentario obsoleto y 2 tests de matriz añadidos (directa +
  terminal AC, ACS individual y central). **M3 CERRADO** para el alcance
  actual.

**Deuda registrada (no bloquea el cierre):**

- **Tabla N°8** (Anexo A de la Guía, ampliación de rango de Qc) — es una
  lámina no transcripta; `Qc > 40 m³/h` sigue como `fueraDeTabla06` /
  `incompleto`, sin extrapolar. Se incorpora si aporta umbrales por
  encima de los 40 m³/h de Tabla N°6;
- **CRIT-A8 en el universo de consumos de B2b** — no se detectó un caso
  real donde M3 dimensione un medidor con consumos que M1/M2 considere no
  computables (mismo filtro `origen === 'normativo'` + conexión física);
  queda como refinamiento sin impacto en los flujos actuales;
- **Poda activa de overrides de medidor huérfanos** — un round-trip
  ACS central→individual→central (o PH off→on) con un override de DN
  puesto en el medio reactiva ese override al reaparecer el alcance. El
  valor reaplicado es la decisión previa del propio usuario (no basura) y
  mientras el alcance no existe el override se ignora sin romper ni
  contaminar. Podar requeriría pasar topología a los updaters de
  configuración (hoy transformaciones puras de config);
- **Reporting visual de M2/M3** — la memoria PDF (`generarDocumentoPdf`,
  pdfMake) hoy sólo cubre Módulo 1; M2 y M3 no aparecen. El panel M3 en el
  DOM no rompe la impresión (el PDF no lee el DOM). Rediseño del informe
  fuera de alcance de M3-F;
- **Infra persistente de Playwright** — el navegador se usó vía instalación
  transitoria sin `--save`; `package.json` / `package-lock.json` intactos.

### Fase 3 / Módulo 4 (Reserva / Tanques) — CERRADO (M4-H, D-δ.69)

Primer módulo del bloque de reserva. Detalle en
`PENDIENTES-DE-ARQUITECTURA.md` D-δ.61 (contrato) y D-δ.62 (motor);
auditoría end-to-end y cierre en D-δ.69.

**Completado:**

- **M4-A** (D-δ.61) — investigación normativa + contrato de dominio,
  contra la Guía ERAS 2023 / Resolución 641/2023. Las dos decisiones
  rojas quedaron **resueltas por el usuario**: (1) fórmula de reserva por
  déficit de caudal, con Tablas N°3/N°4 oficiales (→ CRIT-A35); (2)
  configuración de abastecimiento persistida global del proyecto
  (`configuracionAbastecimiento?: { esquema: 'directa' | 'tanqueElevado' |
  'cisternaBombeoElevado' }`, optativa, backward-compatible; M2 deriva su
  origen del esquema; `cisternaBombeoElevado` no es un tercer origen
  terminal). Esquemas mixtos por sector quedan como alcance futuro.
- **M4-B** (D-δ.62) — motor puro `calcularReservaDiaria`
  (`motor/reserva/`): `Dc = max(0, Qc − Qconexión)`,
  `VReservaDiseño = Dc·3,6·Tc` con `1 ≤ Tc ≤ 4 h` (CRIT-A35). `Qc` real de
  M1 sin redondear; `qConexion_lps` como input explícito (fuente futura:
  Tabla N°1 §2.7). Goldens G3 (Tabla N°3, 0,77 m³) y G4 (Tabla N°4,
  ≈ 2,82 m³) componiendo M1 real.
- **M4-C** (D-δ.63) — `Proyecto.configuracionAbastecimiento?`
  (`{ esquema, periodoConsumoMaximo_h? }`, global, optativa,
  backward-compatible; `Tc` persistido porque es decisión de proyecto) +
  `validarConfiguracionAbastecimiento` integrada en `validarProyecto` +
  `resolverEstadoModulo4` puro (`motor/modulo4/`). `EstadoModulo4` =
  `noIniciado | error | incompleto | evaluado`; `ResultadoModulo4`
  discriminado (`sinReservaPorTanque` para `directa` vs `reservaCalculada`
  para esquemas con tanque — un tanque con `déficit 0` sí produce
  `reservaCalculada` V=0, distinto de `directa`). Compone el `Qc` real de
  M1; `qConexion_lps` sigue como boundary input explícito (Tabla N°1 no
  tiene resolver todavía). Sin UI, sin integración M4→M2.
- **M4-D1** (D-δ.64) — resolver puro de Tabla N°1 (§2.7, CRIT-A36):
  `resolverGastoTabla01({ diametroNominal_m, presionCalculo_m })` →
  `resuelto | fueraDeRangoDePresion | diametroNoTabulado`. Interpolación
  lineal **sólo en la presión** (DN es clave discreta), sin extrapolación
  fuera de `[4, 35]` m. `esDiametroAdmisibleComoConexion` (DN tabulado ∧
  ≥ 0,019 m). Dataset de Fase 1 auditado (coherente; una celda con
  formato anómalo, sin cambio). Goldens G5/G6.
- **M4-D2** (D-δ.65) — cadena completa `Proyecto → Qconexión → reserva`.
  `ParametrosProyecto` gana `diametroNominalConexion_m?` y
  `desnivelConexion_m?` (desnivel **firmado** respecto de la acera;
  optativos, backward-compatible, sin default).
  `resolverPresionDeCalculoDeConexion` (`presionCalculo_m =
  presionSobreAcera_m − desnivelConexion_m`, CRIT-A37).
  `validarParametrosDeConexion` en `validarProyecto` (DN13 / desnivel no
  finito → error; ausencia → no es problema). `resolverEstadoModulo4`
  **elimina el boundary `qConexion_lps`**: deriva el gasto vía §2.7 +
  Tabla N°1; presión de cálculo fuera de `[4, 35]` m → `incompleto`
  (`presionConexionFueraDeTabla`), nunca error. `ResultadoModulo4` gana
  traza `conexion` auditable. Goldens G3/G4 **end-to-end** (sin inyectar
  `Qconexión`). Auto-derivar el desnivel desde M2 queda diferido (el
  "pelo de agua mínimo" de M2 ≠ cota de entrada del tanque).
- **M4-E** (D-δ.66) — reserva **requerida** vs **adoptada** + distribución
  §2.11.3. `ConfiguracionDeAbastecimiento` gana
  `volumenTanqueElevadoAdoptado_m3?` y `volumenTanqueBombeoAdoptado_m3?`
  (m³, optativos, sin default, sin catálogo comercial; validación
  estructural: no finito / < 0 → error). `resolverAdopcionDeReserva`
  (puro): `directa` → `noAplica`; `tanqueElevado` → `sinAdopcion` /
  `verificada` (suficiente/insuficiente, con `diferencia_m3`);
  `cisternaBombeoElevado` → `adopcionIncompleta` / `verificadaDistribuida`
  con **tres** criterios independientes (cada tanque ≥ `VRTD/3`, total ≥
  `VRTD`) — sin reparto fijo, sin suma exacta, sobredimensionamiento OK.
  `ResultadoModulo4.reservaCalculada.adopcion` **no degrada**
  `EstadoModulo4` (evaluado ≠ suficiente). Reactivo. CRIT-A38.
- **M4-F** (D-δ.67) — Panel de Módulo 4 (Abastecimiento y reserva) en la
  one-page, después de M3. `PanelDeModulo4.tsx` + `humanizarModulo4.ts`,
  consume `resolverEstadoModulo4` sin recalcular nada; Rápido/Profesional
  vía `resolverModoDeTrabajo`. Edita esquema, Tc, DN de conexión (select
  sin DN13), presión sobre acera (nuevo `conPresionSobreAcera` — este
  campo no tenía editor; una sola fuente), desnivel firmado (etiqueta
  contextual), capacidades adoptadas. Muestra presión de cálculo,
  Qconexión (+ interpolación), RTD protagonista, verificación §2.11.3;
  `directa` = "no aplica" sin V=0 ni §2.8; adopción pendiente/insuficiente
  **no degrada** "Evaluado". 20 tests SSR/unit + smoke Playwright 24/24,
  consola limpia, manifests intactos.
- **M4-G** (D-δ.68) — `configuracionAbastecimiento.esquema` como **fuente
  única** del origen hidráulico de M2. `resolverOrigenHidraulicoEfectivo`
  (puro, 3→2: `directa`→directa; `tanqueElevado` y `cisternaBombeoElevado`
  → tanque elevado). El Panel de Presión de M2 **retira** su selector
  local `tipoAlimentacion` y el input manual de Pdisponible: deriva
  `presionDisponible_mca` (0 / `presionSobreAcera_m` — la misma magnitud,
  D-δ.38 — / undefined) y el origen para M3-E desde el esquema. Esquema
  ausente/corrupto → verificación de presión `'incompleto'` (resto de M2
  sigue calculándose). Regresión numérica: directa y tanque byte-idénticos
  al histórico; `cisternaBombeoElevado` ≡ `tanqueElevado`. Primitivas de
  M2 sin tocar; sin imports de `motor/modulo4` en `motor/tuberias`.

- **M4-H** (D-δ.69) — auditoría end-to-end y **cierre de Módulo 4**. Se
  auditaron los cuatro contratos de dominio (CRIT-A35..A38) contra los
  goldens oficiales sin redondeo, `EstadoModulo4` y su precedencia, la
  integración M1→M4 / M4→M2 (origen, fuente única) / M3→M2 por origen, la
  ausencia de imports de M4 en las primitivas hidráulicas, la regresión
  histórica de M2 (65 archivos / 561 tests) y un smoke de navegador de
  37/37 checks con consola limpia. **1 bug de UX corregido** (commit
  funcional aparte): `presionSobreAcera_m` no tenía editor en el esquema
  `directa` — el input sólo se montaba en la rama con tanque, pese a que
  en `directa` ese valor es la presión disponible de la raíz del balance
  de M2. Sin cambios de dominio, fórmula ni arquitectura. Suite
  1208 → 1209.

**Deuda futura post-M4** (no bloquea el cierre): auto-derivación
geométrica del desnivel de conexión por esquema; obligación de reserva
por §2.8 independiente del déficit; sugerencia comercial de capacidad
adoptada; división en secciones iguales de tanques ≥ 4.000 L (§2.11);
geometría / cota del tanque / bombas / presurizadores; reporting visual
M1–M4 en la memoria PDF.

### Fase 3 / Auditoría integral M1–M4 — CERRADA (D-δ.70)

- **D-δ.70** — auditoría transversal pre-rediseño. Verifica que un
  Proyecto real atraviesa M1→M2→M3→M4 de forma coherente, reactiva y sin
  contaminación cruzada, replicando el cableado de la UI. Entregables:
  `BASELINE-FUNCIONAL-M1-M4.md` (snapshot canónico, matriz de
  sensibilidad, matriz de persistencia, fronteras, contratos congelados,
  deudas), `src/interfaz/paginas/proyectoDeEjemplo.ts` (fixture extraído
  sin cambios de contenido) y `src/auditoriaTransversalM1M4.baseline.test.ts`
  (12 casos: sensibilidad + no contaminación + round-trip + backward
  compatibility). Hallazgos clave: 0 imports cruzados entre módulos del
  motor; el cableado M3→M2 / M4→M2 vive en `interfaz/paginas`; toda la
  app tiene 2 `useState` (Proyecto + un modal) y los paneles M1–M4 tienen
  **cero** estado local → una sidebar con remontaje condicional no pierde
  datos. Sin bugs. Suite 1209 → 1221; smoke de navegador transversal
  26/26, consola limpia.
- **Deudas nuevas**: `parametros.alturaArtefactoMasDesfavorable_m` es un
  campo requerido sin consumidor en `motor/` (candidato a eliminar);
  `calcularCotaHidraulicaDefaultDeNivel` (constante normativa) vive en
  `interfaz/` y la importa un test de `motor/` (mover a `normativa/`).

**CORE FUNCIONAL M1–M4: CONGELADO PARA REDISEÑO.** Los contratos del §7 de
`BASELINE-FUNCIONAL-M1-M4.md` (tipos de dominio, orquestadores
`resolverEstadoModuloX`, motores puros, mapeos, updaters puros, CRIT
firmes, reglas de "no fabricar") sólo pueden envolverse, no reescribirse,
salvo bug inequívoco o decisión roja explícita.

### Fase 4 / Rediseño de experiencia — EN CURSO

- **D-δ.71** — ajustes de experiencia sobre el core congelado, sin
  fórmulas ni dominio nuevos:
  - **M4 en litros**: la UI de Módulo 4 muestra y edita reserva y
    capacidades **en litros** (`1 m³ = 1000 L`); el core sigue
    íntegramente en m³ (`volumenReservaDiseno_m3`,
    `volumenTanque*Adoptado_m3`, CRIT-A35/A38, goldens, persistencia sin
    cambios). Conversión en el borde de la UI
    (`humanizarModulo4.formatearVolumen_L` / `litrosParaInput` /
    `m3DesdeLitros`), sin doble persistencia y sin redondeo de cálculo.
    Regresión blindada: core 1 m³ ↔ UI 1000 L. Suite 1221 → 1225; smoke
    16/16, consola limpia.
  - **Patrón "Iniciar Módulo 3"**: auditado y **conservado sin cambios**.
    Codifica una distinción real (`configuracionMedidores` ausente ≠
    configuración explícita); M3 requiere legítimamente una acción de
    inicio porque su primera decisión (propiedad horizontal) tiene un
    valor con aspecto de default, a diferencia de M4 que se inicia al
    elegir esquema. No forzar la homogeneización con M4.

- **D-δ.72 — UI-01A: arquitectura de navegación.** Flujo visual =
  1 Demanda → 2 Tuberías → 3 Medidores → 4 Abastecimiento → 5 Verificación
  hidráulica (criterio **UI-CRIT-01**). `PanelDePresionDeModulo2` se
  saca de la sección de Tuberías y pasa a etapa final después de M4,
  montado **una sola vez**; sigue siendo dominio de Módulo 2 (no hay
  `Modulo5`). La sección 2 queda centrada en dimensionamiento
  ("Módulo 2 — Dimensionamiento de tuberías"), corrigiendo la UX
  engañosa de "M2 incompleto" por faltar la verificación. Índice lateral
  `<nav>` con 5 anchors (`#demanda`, `#tuberias`, `#medidores`,
  `#abastecimiento`, `#verificacion-hidraulica`): scroll a anchors, **no
  un router**, one-page, módulos montados. `navegacionUI.css` (primer
  `.css` del repo) sólo estructural. Baseline transversal 12/12
  byte-idéntico; suite 1225 → 1232; smoke 25/25, consola limpia.

- **D-δ.73 — UI-01B: sistema visual transversal.** Estética de aplicación
  técnica moderna sobre UI-01A, sin tocar cálculo, dominio, `Proyecto`,
  motores ni semántica. `sistema-visual.css` (nuevo): tokens (`:root`
  custom properties) de color/espaciado/radius/tipografía/sombras +
  estilos base de elementos + utilidades `.ui-*` (card, stack, métrica,
  badge, callout, empty, jerarquías de botón, segmented control, tabla
  técnica). `navegacionUI.css` reescrito sobre los tokens; sidebar como
  superficie tipo card con grupos **PROYECTO** / **VERIFICACIÓN** y
  número `01`..`05`, sección activa por fondo + acento + peso.
  `EncabezadoDeEtapa` (nuevo): patrón único `[NN] Título / descripción`
  en las cinco etapas, sin la redundancia "Módulo N — …" (el `<h2>` real
  y la traza "Módulo N" en ayudas se conservan). M1: Qc protagonista en
  card + métrica. M2: sin el `<h3>` "Módulo 2 · Tuberías", modo
  Rápido/Profesional como segmented control, tabla de dimensionamiento
  `.tabla-tecnica`. M3: empty state `noIniciado` con "Iniciar Módulo 3"
  conservado (**UI-CRIT-04**), resultados en cards. M4: reserva
  requerida como métrica en litros (m³ secundario en Profesional,
  **UI-CRIT-03**), adopción como badge "Suficiente/Insuficiente" (nunca
  "Cumple norma"); inicio por elección de esquema. Verificación:
  veredicto CUMPLE/NO CUMPLE como badge en card de resultado. Criterios
  registrados: **UI-CRIT-02** (decisión persistida ≠ resultado
  derivado), **UI-CRIT-03**, **UI-CRIT-04**. Baseline transversal 12/12
  byte-idéntico; suite 1232/1232 (sin cambio de recuento); consola
  limpia; manifests intactos. Ver `SISTEMA-VISUAL.md`. **CERRADA
  (parcial documentado):** el resumen sticky del proyecto + estado de
  etapa en la sidebar, la reagrupación fina de M1/M2 en cards y el
  reemplazo de los `CSSProperties` inline restantes se difieren a
  **UI-01C** (brief §73/§91).

- **D-δ.74 — UI-01C: pulido estructural y cierre visual de la app web.**
  Pasada quirúrgica de cierre, no otro rediseño. **Perímetro de M1**: el
  encabezado "01 Demanda" abre la etapa, antes de "Datos del proyecto";
  toda la configuración de Demanda + su Resultado viven dentro de la
  etapa 01. **Cabecera global**: "IUAS — Instalaciones internas" (ya no
  "Motor de Demanda"). **M1 reestructurado** (`demandaM1.css`): jerarquía
  UF → Local → Artefacto, card por Local, filas de artefacto compactas,
  acciones destructivas secundarias, "+ Agregar" por jerarquía
  contextual. **Verificación**: card del veredicto con variante
  `.ui-card--ok` / `.ui-card--error` derivada de `cumpleGlobal`; datos de
  alimentación en card de configuración; copy "Estado del cálculo:
  cálculo disponible" (**UI-CRIT-05**). **Resumen del proyecto en la
  sidebar** (`ResumenDeProyecto` + `resolverResumenDeProyecto` +
  `resolverEntradasDeVerificacion`): Qc · Reserva · Margen crítico,
  componiendo resultados existentes, sin `EstadoGlobalProyecto`;
  "Pendiente"/"No aplica" nunca 0; oculto ≤ 900 px. **M2**: control de DN
  compacto sin inline styles + `aria-label`; estado de fila como badge
  ("DN mínimo" neutro); configuración avanzada agrupada por conceptos.
  **M4**: litros redondeados al entero en Rápido (`formatearVolumen_L_rapido`,
  **UI-CRIT-06**), precisión completa + m³ en Profesional; persistencia
  m³ intacta. Limpieza selectiva de `CSSProperties` inline. Criterios
  registrados: **UI-CRIT-05** (estado del cálculo ≠ resultado de
  cumplimiento), **UI-CRIT-06** (precisión de presentación ≠ precisión de
  cálculo). Baseline transversal 12/12 byte-idéntico; suite 1237/1237;
  consola 0/0; sin overflow 1280/820/480; manifests intactos. Ver
  `SISTEMA-VISUAL.md`. **CERRADA. UI-01C CERRADO.**

- **D-δ.75 — DEPLOY-01: preflight de piloto + publicación web (beta).**
  Fase de publicación, no de desarrollo. No cambia hidráulica,
  dimensionamiento, selección de DN, CRIT-A19 ni Vmax; baseline
  transversal 12/12 byte-idéntico; suite 1237 → 1247; tsc/build/eslint
  verdes (eslint 11 baseline / 0 nuevos).
  - **Preflight A — avisos de velocidad en M2**: badge presentacional
    junto al valor de V. `clasificarVelocidadParaUi` (helper puro):
    `normal` V < 2,0 · `elevada` 2,0–2,5 (ámbar) · `muyAlta` 2,5+ hasta
    Vmax (naranja) · `noAdmisible` V > Vmax (rojo). **2,0 y 2,5 m/s son
    umbrales de comunicación IUAS, no límites normativos** — no existe
    ninguna constante `Vmax = 2,5`. La única frontera de inadmisibilidad
    sigue siendo `V > limiteMaximo_mps` **leído** de
    `verificarVelocidadAdmisible` (CRIT-A19), nunca recalculado en React.
    El caso terminal CRIT-A24 (`velocidadPorDebajoDelMinimo`) nunca
    genera aviso. Token `--color-naranja` + `.ui-badge--alto` (mínimo
    para distinguir ámbar de naranja, no una paleta nueva). Cobertura de
    fronteras 1,999 / 2,0 / 2,499 / 2,5 / =Vmax / >Vmax y de la
    dependencia de Vmax con el diámetro real.
  - **Preflight B — copy PDF**: "Generar memoria PDF" → "Generar memoria
    PDF de Demanda". El generador `pdfMake` **no se toca** (sigue
    cubriendo esencialmente M1); REPORT-01 reemplazará la limitación.
  - **Preflight C — copy de verificación incompleta**: "Para completar
    Módulo 2:" → "Para completar la verificación hidráulica:".
    `EstadoModulo2` y los motivos tipados intactos (sólo presentación).
  - **Preflight D — persistencia**: **no existe**. El `Proyecto` vive
    sólo en `useState` de `MotorDemandaPantalla`, sembrado desde
    `proyectoInicial`. Recargar / cerrar la pestaña / abrir una segunda
    pestaña ⇒ proyecto de ejemplo limpio, cambios perdidos, sin sync.
    Sin `localStorage` / `sessionStorage` / `IndexedDB` / URL-state (el
    hash es sólo navegación). Mitigación de piloto: aviso único no
    bloqueante en la cabecera (`role="note"`, `ui-callout--info`, sin
    lenguaje de alarma). **PERSIST-01** (autosave local y/o
    export/import JSON) queda para después del piloto.
  - **Hosting**: ya configurado y reutilizado —
    `.github/workflows/deploy.yml` (workflow oficial de Vite, actions
    ancladas por hash) despliega `./dist` a **GitHub Pages** on push a
    `main`; `vite.config.ts` fija `base: '/IUAS/'` en build. URL
    esperada: `https://nicolasambrosoeras-ctrl.github.io/IUAS/`. No se
    agregó ninguna dependencia de deploy (manifests intactos).
  - **Build estático**: `dist/` = `index.html` + `assets/index-*.css`
    (~20 kB) + `assets/index-*.js` (~2,2 MB / ~924 kB gzip, dominado por
    `pdfmake`). Servido desde un estático local montado en `/IUAS/`
    (equivalente a producción, no Vite dev): smoke Playwright 31/31,
    consola 0/0 — inicio, M1, M2 (2,9 → Muy alta / naranja, 2,1 →
    Elevada / ámbar, sin "No admisible"), M3 Iniciar, M4, Verificación,
    PDF de Demanda, los 5 hashes directos, 360 px. Sin overflow global
    en 1280 / 820 / 480 / 390 / 360; la tabla de M2 tiene scroll
    horizontal **local** ≤ 480 px (esperado).
  - **Seguridad**: sin `.env*`, sin `import.meta.env` / `VITE_*` en
    `src/`, sin secretos en el bundle. El deploy sube sólo `./dist`;
    `resguardo-documentacion/**` y la documentación del repo **no** se
    publican.
  - **Rendimiento (sanity)**: proyecto de estrés = proyecto de ejemplo
    con 11 UF (~380 inputs/selects en M1, > 100 artefactos). Navegación
    entre módulos 31–44 ms; editar coeficiente + recálculo ~330 ms;
    duplicar UF 200–680 ms (crece con el tamaño); scroll completo
    ~750 ms. Sin freeze, sin crash, consola limpia, sin overflow. El
    costo es **render/DOM** en ediciones que revalidan todo el árbol, no
    cálculo hidráulico — optimización frontend futura (p. ej. lazy-load
    de `pdfmake`, memoización de filas), no bloqueante, **sin backend**.
  - **Estado**: **PUBLICADO.** `push origin main` (`fd425e6..04598a6`,
    primer push desde 2026-08-12) disparó el workflow (run
    `34243435732`, success). URL real
    `https://nicolasambrosoeras-ctrl.github.io/IUAS/` validada: smoke de
    producción 31/31 + responsive 1280→360, consola 0/0. Tag anotado
    **`v0.4.0-beta.1`** creado y pusheado sobre `04598a6` (el commit
    desplegado). GitHub Pages estaba habilitado con fuente Actions (el
    run de agosto ya había terminado en success).

- **D-δ.76 — UX-01 / UI-01D: unidades funcionales colapsables en M1.**
  Primer ajuste UX posterior a `v0.4.0-beta.1`. Trabajar con varias UF
  sin scroll infinito: cada UF se contrae desde la cabecera o desde un
  control al pie de su contenido. El estado expandida/colapsada es
  **exclusivamente de presentación** (`useState<Set<string>>` en
  `ProyectoFormulario`, por `uf.id`) — no toca cálculo, `Proyecto`,
  updaters ni persistencia; baseline transversal 12/12 byte-idéntico;
  suite 1247 → 1252.
  - **UF ya presente al montar → EXPANDIDA** (conjunto inicial vacío,
    "id ausente = abierta"). **UF agregada o duplicada → COLAPSADA** (su
    id se agrega al conjunto). La copia se identifica comparando ids
    antes/después en la capa de presentación —
    `duplicarUnidadFuncionalEnProyecto` no cambia. Al eliminar una UF se
    olvida su id.
  - **Dos controles, un estado**: cabecera = botón de disclosure real
    (patrón APG, `<button aria-expanded aria-controls>` dentro del
    `<h3>`); control inferior "↑ Contraer unidad funcional" tras
    "+ Agregar local", sólo con la UF abierta. Ambos alternan el mismo
    estado. **Sin acordeón exclusivo**: estados independientes por UF.
  - **Cabecera colapsada**: nombre + nivel + `N locales · M artefactos`
    (`resumenDeUnidadFuncional`, helper puro; suma de `cantidad`, no
    filas). Duplicar/Eliminar siguen accesibles con la UF colapsada. No
    es estado de error: sin colores de warning.
  - **Conditional rendering** del detalle al colapsar (`CuerpoDeUnidadFuncional`
    extraído): la auditoría D-δ.70 confirmó que ningún control de M1
    guarda decisiones de dominio en `useState`, así que ocultarlo no
    pierde nada. Con 11 UF, colapsar 10 reduce ~75 % del DOM de la etapa
    01. Editar el coeficiente con 11 UF (10 colapsadas) ~460 ms —
    render/DOM, no cálculo; consistente con D-δ.75.
  - **No persistido** (sección 14/51 del brief): un reload vuelve al
    proyecto de ejemplo con su UF abierta, coherente con la beta.
  - **Publicación**: `v0.4.0-beta.2` sobre el mismo GitHub Pages; el tag
    apunta al commit desplegado y `v0.4.0-beta.1` no se mueve. Ver
    también `SISTEMA-VISUAL.md` §11b.

- **D-δ.77 — UX-02 / UI-01E: defaults contextuales de carga + semántica
  visual de redes.** Incremento de carga y lectura; sólo capa de
  interfaz, sin hidráulica, dominio ni updaters nuevos. Baseline
  transversal 12/12 byte-idéntico; suite 1252 → 1263.
  - **Régimen del Local nuevo** = Domiciliario (default de creación, no un
    bloqueo; el selector sigue libre y los Locales existentes no se
    tocan). **UI-CRIT-07**.
  - **Sugerencia contextual de artefacto** (`sugerenciaDeArtefacto.ts`,
    helper puro): "+ Agregar artefacto" ya no usa `catalogoArtefactos[0]`
    ("Inodoro con válvula automática"). Mapping `TipoLocal` → artefactos
    habituales por prioridad (ids canónicos del catálogo `eras-2023`),
    sólo Régimen domiciliario (baño / toilette / cocina / lavadero /
    jardín, brief §7). Elige el primer candidato **ausente** del Local
    (presencia por tipo, no por `cantidad`).
  - **Borrador de UI** cuando no hay candidato (agotados, o
    cochera/otros/régimen no domiciliario): fila "Seleccionar artefacto…"
    puramente presentacional — no se persiste en `Proyecto`, no dispara
    conectividad, no afecta Qc hasta que hay un tipo real.
  - **Conectividad sobre el artefacto efectivo** (**UI-CRIT-08**): se crea
    la fila con el tipo real y luego se resuelve la Red. La pregunta AF/AC
    se referencia por id de fila; si el usuario cambia el `<select>` antes
    de responder, el banner se re-deriva o se cierra (si el tipo nuevo ya
    tiene precedente) — nunca stale. "Cancelar" retira la fila recién
    creada.
  - **Pills de Red AF/AC** (`BadgeDeRed`, **UI-CRIT-09**): identidad
    cromática de categoría física — Agua fría azul/celeste, Agua caliente
    salmón/rojo suave (nunca `--color-error`). El color no es el único
    canal (conservan el texto). Tokens `--color-af` / `--color-ac`.
    Independientes de los badges de velocidad (§33).
  - **Pendiente (decisión roja, subpunto F, brief §26/§51-A):** el
    contador de M2 "Baño 1 · N puntos" cuenta *Artefactos (filas) de ese
    Local conectados a esa Red*, **ignorando `Artefacto.cantidad`**;
    además D-δ.76 ya fijó "artefactos = suma de cantidades" para el
    resumen de UF en M1. Renombrar "puntos" → "artefacto(s)" en M2 sería
    ambiguo/contradictorio. Se dejó como está y se elevó una decisión de
    nomenclatura; no bloquea el resto del incremento.
  - **Publicación**: `v0.4.0-beta.3` sobre el mismo GitHub Pages; el tag
    apunta al commit desplegado, `beta.1` y `beta.2` no se mueven. Ver
    `SISTEMA-VISUAL.md` §6 y §11b.

- **D-δ.78 — UX-02 / UI-01E (continuación): FIX validación transversal +
  optimizaciones de carga y lectura.** Consolidación de hallazgos del
  piloto. Corrige un bug de gating y pule M1/M2/M3. Sin fórmulas
  hidráulicas ni criterios normativos nuevos; baseline transversal 12/12
  byte-idéntico; suite 1263 → 1270. (El brief apuntaba a `beta.3`, pero
  D-δ.77 ya la había publicado; se publica como **`v0.4.0-beta.4`**.)
  - **P0 — validación por alcance (UI-CRIT-10).** Bug reproducido en
    `beta.3`: elegir "Tanque elevado" y escribir un `periodoConsumoMaximo_h`
    fuera de [1,4] h (o *cualquier* error de M2/M3/M4) apagaba M1 ("El
    Motor de Demanda no se ejecuta") y **desmontaba todas las etapas
    posteriores**, incluida la propia M4 donde había que corregir el
    dato. Causa: `MotorDemandaPantalla` usaba un único `validacion.valido`
    (que agrega los 7 validadores) para gatear M1 y montar el resto.
    Corrección: cada `ProblemaValidacion` lleva un `alcance` (`demanda` /
    `tuberias` / `medidores` / `abastecimiento`); sólo un error de alcance
    `demanda` bloquea el cálculo de Qc. Los errores de módulos posteriores
    se listan en `RevisionesPendientes` (agrupados por sección, con enlace
    a donde se corrigen, **sin códigos internos ni "[error]"**) y no
    apagan nada. La validación exhaustiva no se debilita: se corrige el
    *gating* y la *presentación* por alcance.
  - **P2 — humanización de ids (UI-CRIT-07 amplía cobertura).** M3
    ("Medidores individuales") y el detalle del terminal crítico de M2
    mostraban el id interno `uf-<uuid>` como Unidad funcional.
    `nombreDeUnidadFuncional(proyecto, ufId)` → nombre humano (+ nivel).
    El id sigue siendo la clave interna.
  - **P3 — M1 compacto.** Los Locales de una UF se disponen en grid (2
    por fila en desktop ancho, 1 al angostar; sin breakpoint manual).
    `qu` sale del label del `<select>` de artefacto y pasa a metadata
    secundaria (`qu 0,20 L/s`), siempre visible.
  - **P4 — modo de trabajo global (UI-CRIT-11).** "Rápido / Profesional"
    es configuración global del Proyecto: un único `SelectorDeModoDeTrabajo`
    en la cabecera de la app; se elimina el selector duplicado de la
    etapa 02. Fuente única: se sigue derivando de `configuracionHidraulica`
    y aplicando `aplicarModoRapido` / `aplicarModoProfesional`.
  - **Ya cubierto en D-δ.77** (no se rehace): régimen Domiciliario del
    Local nuevo, sugerencia contextual de artefacto, borrador de UI,
    conectividad sobre el artefacto efectivo, pills AF/AC.
  - **Sigue pendiente**: la nomenclatura del contador "N puntos" de M2
    (D-δ.77 subpunto F) — decisión de nomenclatura, no bloqueante.
  - **Publicación**: `v0.4.0-beta.4` sobre el mismo GitHub Pages; el tag
    apunta al commit desplegado, `beta.1` / `beta.2` / `beta.3` no se
    mueven. Ver `SISTEMA-VISUAL.md` §6, §11b y §15.

- **D-δ.79 — UX-03 / HYD-UX-01: corrección M2 con conectividad explícita +
  origen hidráulico rápido para tanque elevado + trazabilidad Profesional.**
  Publicada como **`v0.4.0-beta.5`**. Suite 1270 → 1311.
  - **P0 — dimensionamiento con conectividad explícita de artefactos
    (bug).** El "Lavavajillas industrial" (y los demás no domiciliarios de
    §2.9.1.3: pileta de cocina / lavarropas industrial, lavachatas, válvula
    de mingitorio) dejaba tramos con DN/V/hf indeterminados en M2 al
    conectarlos, incluso con todos los datos disponibles. Causa raíz:
    `resolverQuEfectivoParaTramo` consultaba el `qu` desagregado
    (`quFria_lps`/`quCaliente_lps`, `null` en el catálogo para estos
    artefactos) **antes** del override de CRIT-A15 por conectividad física
    exclusiva, así que lanzaba sobre el `null` y el override quedaba
    inalcanzable. Corrección: la conectividad se resuelve primero — solo AF
    / solo AC → `quTotal_lps`; AF + AC con catálogo sin desagregar →
    ampliación de CRIT-A15 (decisión del usuario, no norma ERAS): cada rama
    transporta `quTotal_lps` y el tramo común lo atribuye una sola vez
    (nunca la suma). Se preserva CRIT-A7. Baseline transversal 12/12
    byte-idéntico.
  - **P1 — pelo de agua mínimo estimado en modo Rápido (CRIT-A39).** Para
    esquema `tanqueElevado` simple + modo Rápido, IUAS deja de pedir el
    pelo de agua mínimo y lo estima como `desnivelConexion_m − 0,50 m`
    (hipótesis de producto, no regla ERAS; no toca CRIT-A37). Read-only con
    nota de hipótesis; sin el desnivel, verificación incompleta (no se
    fabrica 0). No aplica a `cisternaBombeoElevado` ni a `directa`. El dato
    manual del modo Profesional se preserva y se recupera al volver.
    **Decisión roja F** (resuelta por el usuario): el fixture canónico del
    baseline transversal D-δ.70 era modo Rápido + tanque elevado con pelo
    manual 20 m y `desnivelConexion_m` 0 m — knobs independientes ahora
    acoplados por CRIT-A39. Se re-baselina con evidencia: margen del crítico
    +3,836 m.c.a. (CUMPLE) → −16,664 m.c.a. (NO CUMPLE); único cambio
    numérico, M1/M3/M4/Tabla N°1 intactos. Ver `BASELINE-FUNCIONAL-M1-M4.md`
    y CRIT-A39.
  - **P2 — coherencia de cotas en Profesional.** Las etiquetas del pelo de
    agua mínimo y del desnivel del punto de alimentación nombran el datum
    ("respecto de la acera") y el signo. Advertencia no bloqueante si el
    pelo de agua mínimo declarado queda por encima del punto de
    alimentación del tanque (solo tanque elevado simple + Profesional; no
    modifica valores, no bloquea).
  - **P3 — pérdida localizada jerarquizada.** En el detalle de accesorios
    de un tramo (Profesional) la pérdida localizada pasa de `<small>`
    secundario a métrica (`ui-metrica`) con la misma familia visual que la
    pérdida del tramo; se mantiene "sin tee". Sin cálculo nuevo en React.
  - **Adenda — ramales terminales en grilla.** En Profesional los ramales
    terminales hermanos se disponen en grilla CSS de hasta 2 columnas
    (1 al angostar), en subcards; el tramo de alimentación común queda a
    ancho completo. Orden DOM = orden hidráulico. Layout únicamente.
  - **Sigue pendiente** (no se toca): nomenclatura "N puntos" de M2,
    UX-TEST-01, PERSIST-01, REPORT-01, performance frontend.
  - **Publicación**: `v0.4.0-beta.5` sobre el mismo GitHub Pages; el tag
    apunta al commit desplegado, `beta.1`–`beta.4` no se mueven.

- **D-δ.80 — QA-FUZZ-01: harness de testing secuencial (Playwright).**
  Infraestructura persistente de E2E para detectar crashes, pantallas
  blancas y estados inválidos por secuencia. **No corrige** bugs de
  dominio: los captura, reproduce por seed y documenta. Sin versión pública
  nueva (sólo tests / workflows / docs; `dist` no cambia — la versión
  funcional sigue siendo `v0.4.0-beta.5`).
  - `playwright.config.ts` + `tests/e2e/` (smoke · catálogo · sequence
    fuzz · escenarios observados · hallazgos) + `tests/e2e/qa/` (PRNG
    mulberry32 determinista, acciones M1–M4 con precondiciones, invariantes
    por paso, detector de pantalla blanca puro, reporte de artifacts) + 42
    unit tests nuevos en Vitest.
  - `.github/workflows/qa-fuzz.yml`: `workflow_dispatch` + `schedule`
    nocturno. Playwright puro, sin API de Claude, sin deploy.
  - **Hallazgo (NO corregido, brief §39): `FIX-LEAK-01`** — el Panel de
    Módulo 3, rama de estado "error", pinta el código interno de validación
    (`problema.problema.codigo`) como texto de usuario. Repro determinista
    y por seed (`IUAS_FUZZ_SEED=424242`). Documentado en
    `tests/e2e/hallazgos.spec.ts` y `QA-FUZZ.md`.
  - Las pantallas blancas observadas en beta.5 (Bañera AF+AC; M3/ACS
    central) **no se reprodujeron** con los escenarios manuales A/B/C ni con
    la matriz de catálogo contra producción; el fuzz sí encontró
    `FIX-LEAK-01`. QA-FUZZ-01 cierra igualmente como exitosa (brief §61).
  - Documentación operativa: **`QA-FUZZ.md`**.

- **D-δ.81 — QA-CI-01: estabilizar la seed del sequence fuzz en CI.**
  Corrección de infraestructura de test (sin cambios funcionales;
  `v0.4.0-beta.5` intacta; alcance: workflow + `tests/e2e/**` + docs).
  - **Causa (HARNESS):** el primer run cloud de QA-FUZZ-01 (20×30, `seed`
    vacía) falló sólo en `Sequence fuzz` — 40 tests en 0 ms con
    `Test not found in the worker process`. El spec generaba la seed base
    durante el import con `Date.now() ^ (process.pid << 16)` cuando
    `IUAS_FUZZ_SEED` estaba ausente, y esa seed va en el título del test;
    coordinator y workers (procesos distintos) obtenían títulos distintos.
    Local con `seed=424242` nunca lo mostró. Ese primer run cloud **no fue
    una corrida fuzz válida**.
  - **Fix:** `tests/e2e/qa/seed.ts` → `resolverSeedBase(env)` puro (explícita
    o fallback local fijo `424242`, sin fuentes mutables); el workflow
    resuelve **una** seed antes de Playwright (de `GITHUB_RUN_ID`-`ATTEMPT`
    si no hay `seed`), la exporta a `$GITHUB_ENV` y la deja en el step
    summary; `tests/e2e/qa/seed.test.ts` (10 tests, con guarda
    anti-regresión). `fuzz sin seed` ≡ `fuzz seed=424242` (byte-idéntico).
  - **Hallazgo surgido (APP): `FIX-RESP-01`** — en móvil, M2
    «Detalladas/Profesional» desbordaba la página en horizontal.
    **Resuelto en D-δ.82.**

- **D-δ.82 — FIX-RESP-01: contener el overflow horizontal responsive de
  M2.** Fix responsive puntual (NO es GEOM-UX-01, NO es rediseño). Sin
  cambios de cálculo/dominio/cotas/textos; `v0.4.0-beta.5` sigue siendo la
  versión funcional. Alcance: `navegacionUI.css`, `sistema-visual.css`,
  `tests/e2e/**`, docs, workflow.
  - **Causa raíz (sonda, no asumida):** `.app-modo` (cabecera) con
    `flex: 0 0 auto` tomaba su ancho max-content al aparecer el badge
    "Avanzado …" y empujaba el documento; `<fieldset>.config-hidraulica__grupo`
    traía `min-inline-size: min-content` del UA. Las `.tabla-tecnica` ya
    estaban contenidas por `.tabla-scroll` (no eran la causa).
  - **Fix:** en `@media (max-width: 900px)`, `.app-modo { flex: 1 1 100%;
    min-width: 0 }` (propia línea + `flex-wrap`) y badge `white-space:
    normal`; `min-width: 0` / `max-width: 100%` en
    `.config-hidraulica__grupo`, sus `> label` y sus `select`. Sin
    `overflow-x: hidden` global ni ocultar contenido; las tablas anchas
    scrollean dentro de `.tabla-scroll`.
  - **Regresión:** `tests/e2e/responsive.spec.ts` (390 / 360 / 1280 px:
    documento sin overflow + tabla con scroll interno contenido), en el
    paso «Escenarios observados + regresión responsive» del workflow.

- **D-δ.83 — FIX-RESP-02: acotar el `<select>` de excepción de ACS de
  M3.** Segundo fix responsive puntual (NO GEOM-UX-01, NO rediseño). Sin
  cambios de cálculo/dominio/cotas/textos; `v0.4.0-beta.5` sigue vigente.
  Alcance: `sistema-visual.css` (una regla global) + `responsive.spec.ts`
  + docs.
  - **Detección:** fuzz seed `34365102807-1`, run 17, step 28
    (`cambiarExcepcionACSporUF=default`, mobile): `scrollWidth 433 > 390`.
  - **Causa raíz (sonda):** el `<select>` de excepción de ACS ofrece la
    opción `Usar el valor por defecto (Individual en cada unidad)` (~50
    car.); sin `max-width` toma ese ancho min-content y empuja el
    documento. No es el patrón de FIX-RESP-01.
  - **Fix:** `select { max-width: 100%; min-width: 0 }` global — acota
    todos los `<select>` al ancho disponible (opción cerrada truncada de
    forma nativa; lista completa al abrir). Sin `overflow-x: hidden` ni
    ocultar el control.
  - **Regresión:** bloque *FIX-RESP-02* en `responsive.spec.ts` (390 / 360
    / 1280 px; el `<select>` sigue visible y dentro del viewport). Falla
    contra la producción pre-fix a 360 px.

- **D-δ.85 — FIX-LEAK-01: humanizar los errores de validación en M3.** Fix
  de **presentación** puntual (NO cambia validaciones, tipos de error del
  dominio, reglas de completitud, ni cuándo M3 entra en error). Sin cambios
  de cálculo/hidráulica/normativa; `v0.4.0-beta.5` sigue vigente.
  - **Causa raíz:** `PanelDeMedidoresDeModulo3.tsx`, rama `estado === 'error'`,
    pintaba `problema.problema.codigo` crudo
    (`redHidraulicaTramoLongitudNoPositiva`). La tabla `MENSAJES_DE_VALIDACION`
    era `const` local de `MotorDemandaPantalla.tsx`, inaccesible desde M3.
  - **Fix:** `src/interfaz/paginas/mensajesDeValidacion.ts` (nuevo, capa de
    interfaz) exporta la tabla + `describirProblemaDeValidacion(codigo)` con
    **política segura** (código conocido → frase; cualquier otra cosa →
    genérico "Hay un dato de la instalación que debe corregirse antes de
    continuar."; nunca el identificador ni `[object Object]`). M1 y M3
    consumen la MISMA función.
  - **Regresión:** `mensajesDeValidacion.test.ts` (6 casos: conocido,
    desconocido, no-string, cobertura completa del catálogo de códigos) +
    `tests/e2e/hallazgos.spec.ts` (era `test.fail`, ahora regresión normal:
    el mensaje humano aparece, el código no). `HALLAZGOS_CONOCIDOS` queda
    **vacío**: la invariante `sin-codigos-de-validacion-visibles` vuelve a
    ser estricta.

- **D-δ.86 — GEOM-UX-01: cotas hidráulicas heredadas + Tabla IUAS v1 +
  Reiniciar cálculo + layout M2 Profesional.** Incremento funcional/UX
  transversal. NO toca fórmulas hidráulicas, CRIT-A29/A39, pérdidas, Pmin,
  Qc, DN, medidores ni reserva; `v0.4.0-beta.5` sigue vigente. Ver
  `PENDIENTES-DE-ARQUITECTURA.md` D-δ.86 para el detalle.
  - **Cotas:** la cota hidráulica efectiva de cada terminal se DERIVA como
    `cota de piso efectiva del Local + altura hidráulica efectiva del
    artefacto`, en **ambas** granularidades — sustituye la hipótesis
    geométrica uniforme de 1,00 m del modo Rápido (D-δ.46).
    `UnidadFuncional.cotaHidraulicaReferencia_m` pasa a ser la **cota de
    piso** de la UF (`calcularCotaHidraulicaDefaultDeNivel` = `3·nivel`);
    nuevos overrides opcionales `Local.cotaPiso_m` (hereda la UF si está
    ausente) y `Artefacto.alturaHidraulicaSobrePiso_m` (Tabla IUAS del
    tipo si está ausente). **Tabla de referencias IUAS v1** (16/16 tipos,
    test de completitud): **criterio IUAS, NO ERAS** — alturas iniciales
    editables, la norma no fija la altura del punto de conexión. Cambiar
    el tipo de artefacto limpia el override de altura (adopta el default
    IUAS del tipo nuevo); duplicar UF conserva los overrides explícitos.
  - **Rebaseline SÓLO de presión, justificado uno a uno:** el crítico del
    canónico (ducha del baño) pasa su cota efectiva de 1,00 a 2,00 m →
    margen **−16,664 → −17,664 m.c.a.** (seguía NO CUMPLE por CRIT-A39);
    cargas geométricas de la aceptación D-δ.48 15 / 12,10 / 9,10 / 6,40.
    M1 (Qc), M3 y M4 sin cambios.
  - **Reiniciar cálculo:** acción global con confirmación; `crearProyectoVacio()`
    deja un proyecto **vacío real** (0 UF/Locales/Artefactos, M2/M3/M4 sin
    iniciar), **NO el demo** (decisión explícita del usuario). No hay
    persistencia (PERSIST-01 sigue fuera de alcance): F5 restaura el demo.
  - **Layout M2:** el detalle expandido de la tabla de dimensionamiento
    pasa a una fila propia a ancho completo (`colSpan`) — el árbol de
    ramales de Profesional deja de comprimirse contra la izquierda; 2
    columnas en desktop, 1 en móvil, `@media print` mejorado. Sin
    regresión FIX-RESP-01/02.
  - **Verificación:** Vitest **1400 → 1438**; `tsc`/`e2e:typecheck`/`build`
    verdes; ESLint 11 / 0 / 0. E2E `smoke`/`catalogo`/`crash`/`responsive`/
    `hallazgos`/`reiniciar-calculo`/`cotas-heredadas` verdes; fuzz local
    `seed 424242` 3×25 verde. `HALLAZGOS_CONOCIDOS` sigue vacío.
  - **Hallazgo nuevo (otro dominio, no bloqueante):** **FIX-LEAK-02** — M4
    muestra el código interno de validación de
    `configuracionAbastecimiento.periodoConsumoMaximo_h` crudo
    (`humanizarModulo4.ts` no rutea por `mensajesDeValidacion.ts`).
    Equivalente en M4 de FIX-LEAK-01, **pre-existente**. Evidencia en
    `qa-results/seed-20250909_0/`. No se corrige acá (§29). **RESUELTO en
    D-δ.87.**

- **D-δ.87 — FIX-LEAK-02: humanizar los errores de validación en M4.** Fix
  de **presentación** puntual (NO cambia validaciones, tipos de error del
  dominio, el rango `[1,4]` de Tc, `VReserva`, ni cuándo M4 entra en
  error). Sin cambios de cálculo/hidráulica/normativa; `v0.4.0-beta.5`
  sigue vigente.
  - **Causa raíz:** `humanizarModulo4.ts` →
    `describirProblemaDeErrorModulo4` devolvía
    `codigosValidacion[codigo].descripcion`, la descripción **técnica**
    interna del catálogo (`configuracionAbastecimiento.periodoConsumoMaximo_h,
    cuando está presente, debe ser…`). M1/M3 ya no tenían el problema
    porque desde D-δ.85 rutean por `describirProblemaDeValidacion`.
  - **Fix:** `describirProblemaDeErrorModulo4` ahora llama a
    `describirProblemaDeValidacion(problema.problema.codigo)` — la MISMA
    función y política segura de FIX-LEAK-01. `DiagnosticoErrorModulo4`
    sólo lleva un `CodigoValidacion`, así que cubre toda la rama de error
    de M4 (esquema / período / DN / desnivel / volúmenes). Sin mapa nuevo.
  - **Regresión:** `humanizarModulo4.test.ts` (período inválido → frase
    humana sin nombres de campo; otro código de la rama → misma ruta;
    código desconocido → genérico seguro) + `tests/e2e/hallazgos.spec.ts`
    (**test normal**, no `test.fail`: Tc=6 → mensaje humano, sin
    `configuracionAbastecimiento` / `periodoConsumoMaximo_h` / código
    interno, app viva). `HALLAZGOS_CONOCIDOS` **sigue vacío**; la
    invariante `sin-codigos-de-validacion-visibles` sigue estricta.
  - **Verificación:** Vitest **1438 → 1440**; `tsc` / `e2e:typecheck` /
    `build` verdes; ESLint 11 / 0 / 0. E2E `smoke` / `hallazgos` (FIX-LEAK-01
    + FIX-LEAK-02) / `catalogo` / `responsive` / `reiniciar-calculo` /
    `cotas-heredadas` / `crash-observado` verdes (47 pasan / 29 skip por
    proyecto). Fuzz local: seed histórica `20250909:0` 30/30, seed cloud
    `34398035608-1` runs 0–12 (13/13, run 12 supera el antiguo step 17
    `editarPeriodoConsumoMaximo=6`), baseline `424242` 15/15 sin regresión.
  - La corrida cloud previa `34398035608` **no** es checkpoint verde: se
    detuvo en este hallazgo. El checkpoint posterior a GEOM-UX-01 +
    FIX-LEAK-02 es la próxima QA Fuzz cloud 20×30 con seed vacía.
  - **Hallazgo nuevo (P0, dependiente de secuencia):** **FIX-CRASH-01** —
    la QA Fuzz cloud posterior a FIX-LEAK-02 (seed `34411681277-1`)
    reprodujo por primera vez de forma **determinista** un `WHITE_SCREEN`.
    Caso `34411681277-1:0`, step 19 · `editarDesnivelConexion=-2 [M4]`,
    desktop + mobile. **RESUELTO en D-δ.88.**

- **D-δ.88 — FIX-CRASH-01: la longitud de tramo en 0 desmontaba la app.**
  Primer crash de pantalla blanca dependiente de secuencia reproducido
  determinísticamente. Fix de **una guarda** en un resolver puro; sin
  cambios de hidráulica / normativa / dominio. `v0.4.0-beta.5` sigue
  vigente (`1476c19`, tag sin mover).
  - **`desnivelConexion = -2` NO era el bug.** CRIT-A37 define el desnivel
    **firmado** (`Pcalc = Pácera − desnivelConexion`); `-2` es válido. El
    fix **no** clampa, no rechaza negativos, no usa `Math.abs`, no oculta
    el control: `-2` se conserva. El step 19 era el disparador; cualquier
    desnivel finito habría destapado el mismo defecto.
  - **Causa raíz:** `resolverPerdidaDistribuidaDeTramo` guardaba
    `if (tramo.longitud_m === undefined)` para devolver su variante
    `sinLongitud`. Una longitud **informada pero no utilizable**
    (`longitud_m <= 0`, estado de edición legítimo) pasaba de largo hasta
    `calcularPerdidaCargaHazenWilliams(J, 0)`, que **lanza** (CRIT-A17
    exige `L > 0`). `PanelDePresionDeModulo2` llama
    `resolverPresionResidualDeCamino` **directo en el render**, sin la
    barrera estructural de `resolverEstadoModulo2`, así que la excepción
    desmontaba React. El step 19 sólo destrababa el balance de presión
    (antes bloqueado por `incompletoRapido` al faltar el desnivel en modo
    Rápido + tanque elevado), dejándolo llegar al tramo de longitud 0.
    **Pre-existente** (guarda de D-δ.34); GEOM/FIX-LEAK no lo
    introdujeron.
  - **Fix:** la guarda pasa a
    `longitud_m === undefined || longitud_m <= 0` → `sinLongitud` (mismo
    predicado que `validarRedHidraulica`). Toda la cadena de presión
    degrada a "incompleto", como ya hacía para la longitud ausente. El
    estado `longitud_m = 0` en edición sigue tolerado (muestra el error,
    no desmonta). **No** se agregó `ErrorBoundary` (DEFENSE-01 sigue
    pendiente, su propio slice).
  - **Regresión:** `resolverPerdidaDistribuidaDeTramo.test.ts` (caso
    `sinLongitud` para `longitud_m ∈ {0, -2}`, sin lanzar) +
    `tests/e2e/hallazgos.spec.ts` (**test normal**: longitud 0 + tanque
    elevado + desnivel `-2` → app viva, sin el `pageerror` de
    `calcularPerdidaCargaHazenWilliams`, desnivel conserva `-2`; falla
    WHITE_SCREEN contra el código pre-fix). Seed canónica completa
    `34411681277-1:0` **30/30** desktop + mobile. `HALLAZGOS_CONOCIDOS`
    **sigue vacío**.
  - **Verificación:** Vitest **1440 → 1441**; `tsc` / `e2e:typecheck` /
    `build` verdes; ESLint 11 / 0 / 0. E2E `hallazgos` (FIX-LEAK-01/02 +
    FIX-CRASH-01) / `crash-observado` / `smoke` / `responsive` /
    `catalogo` sin fallos. Fuzz local: canónica `34411681277-1:0` 30/30
    (desktop + mobile), seed cloud previa `34398035608-1` runs 0–12 13/13,
    baseline `424242` sin regresión.
  - La corrida cloud que generó `34411681277-1` **no** es checkpoint
    verde (2 failed / 38 did not run). El checkpoint previo a MODE-UX-01
    fue la QA Fuzz cloud 20×30 con seed vacía contra producción — **TODO
    VERDE** (reportado por el usuario).

- **D-δ.89 — MODE-UX-01: desacoplar el modo de trabajo de la configuración
  hidráulica.** Incremento de PRODUCTO/UX. El modo Rápido/Profesional pasa
  a ser un campo EXPLÍCITO del Proyecto (`modoTrabajo`), no una inferencia
  de la combinación `(granularidad, metodoPerdidaLocalizada)` como en
  D-δ.51. **Sin cambios de fórmula / hidráulica / normativa / goldens**;
  `v0.4.0-beta.5` sigue vigente (`1476c19`, sin mover).
  - **Problema raíz:** `resolverModoDeTrabajo(config)` sólo devolvía
    `'profesional'` para el par exacto `(profesional, detallado)`;
    `(simplificada, estimado)` → `'rapido'`; el resto → `'avanzado'`. Un
    proyectista en Profesional que elegía Hazen + Estimadas + Simplificada
    era reclasificado a Rápido, y `aplicarModoProfesional` **forzaba**
    `(profesional, detallado)` — Profesional era sinónimo de "máximo
    detalle".
  - **Arquitectura:** `Proyecto.modoTrabajo?: 'rapido' | 'profesional'`
    (optativo/backward-compatible, SCHEMA_VERSION_ACTUAL sin cambio, sin
    migración — mismo patrón que `configuracionMedidores?`). Fuente de
    verdad única del modo. `resolverModoDeTrabajo(proyecto)` lee el campo;
    si falta (sólo proyectos legacy, no hay import UI todavía) infiere una
    vez con `inferirModoDeTrabajoLegacy` (histórico colapsado a 2 estados;
    el viejo `'avanzado'` → `'profesional'`). Ambigüedad legacy aceptada
    (§8). `configuracionHidraulica` sigue siendo la única fuente de la
    config ACTIVA de cálculo.
  - **Memoria Profesional:** `Proyecto.ultimaConfiguracionProfesional?:
    ConfiguracionHidraulica` — SNAPSHOT que `aplicarModoRapido` escribe al
    salir de Profesional y `aplicarModoProfesional` restaura al volver
    (§9 Caso E). NUNCA es fuente de cálculo. "Reiniciar cálculo" lo deja
    ausente.
  - **Presets:** Rápido y el ARRANQUE de Profesional comparten los tres
    ejes iniciales (Hazen-Williams + Estimadas + Simplificada,
    `PRESET_EJES_INICIALES`). Que coincidan en v1 no los hace lo mismo:
    una misma combinación puede vivir en ambos modos. Cambiar un control
    hidráulico NO altera `modoTrabajo`.
  - **UI:** el selector global (`SelectorDeModoDeTrabajo`, cabecera)
    pierde el badge "Avanzado" (era el síntoma visible del acople); su
    estado activo sale de `modoTrabajo`. En Profesional los controles
    avanzados de M2 quedan disponibles aunque la config sea el preset
    simple; en Rápido "Configuración avanzada" sigue colapsada pero
    alcanzable (experiencia reducida existente, §16). M3/M4 leen el modo
    explícito para su detalle técnico.
  - **Verificación:** Vitest **1441 → 1450**; `tsc` / `e2e:typecheck` /
    `build` verdes; ESLint 11 / 0 / 0. E2E: nuevo
    `modo-de-trabajo.spec.ts` (Casos 1–5 + responsive) +
    `smoke`/`hallazgos` (LEAK-01/02 + CRASH-01)/`crash-observado`/
    `catalogo`/`responsive`/`reiniciar-calculo`/`cotas-heredadas` sin
    fallos. Fuzz local: canónica FIX-CRASH `34411681277-1:0` 30/30, seed
    cloud FIX-LEAK `34398035608-1` runs 0–12 13/13, baseline `424242`
    3×25 sin regresión.

- **D-δ.91 — M2-TOPO-A: identificación estructural de distribución
  compartida + invariantes de arborescencia.** Primer slice de
  **M2-TOPO-01** (montantes / ramales secundarios / tramos intermedios).
  **Aditivo y backward-compatible**: sin cambios de hidráulica, de la
  enumeración de filas de la UI de M2, de la reconciliación M1→M2 ni del
  modelo persistido. `v0.4.0-beta.5` sigue vigente (`1476c19`, sin mover).
  - **Parte A:** nueva primitiva pura
    `motor/tuberias/topologia/identificarTramosDeDistribucionCompartida.ts`
    (`esTramoDeDistribucionCompartida` + `identificarTramosDeDistribucionCompartida`).
    Un Tramo es "distribución compartida" cuando NO es Alimentación
    general (raíz) ni Alimentación ACS y su conjunto aguas abajo alcanza
    **más de un Local** (`(unidadFuncionalId, localId)` deduplicado).
    Nomenclatura neutral a propósito — "distribución compartida" ≠
    "montante"; identidad/rol/denominación persistida se difieren a
    M2-TOPO-C. El proyecto de ejemplo clasifica 0 tramos compartidos. La
    función todavía NO participa de ningún cálculo ni de la UI (eso es
    M2-TOPO-B).
  - **Parte B:** `validarRedHidraulica` gana dos códigos `error` de
    alcance `'tuberias'` — `redHidraulicaNodoMultiplesTramosEntrantes`
    (Nodo con ≥2 tramos entrantes; el fan-out 1→N NO es problema) y
    `redHidraulicaCicloDirigido` (ciclo dirigido; DFS iterativo, sin loop
    infinito; un DAG con reconvergencia NO se marca). Ambas ya eran
    precondición de `obtenerCaminoHaciaOrigen` (CRIT-A27 / D-δ.37): el
    estado de M2 para una red así ya era `'error'`, sólo cambia el
    diagnóstico y el momento. El *tipo* `RedHidraulica` sigue general
    (recirculación ACS conceptualmente permitida, D-δ.15). "Nodo
    huérfano" y "raíz ausente" NO se validan a propósito; una red vacía
    es válida. CRIT-A27 actualizado.
  - **Verificación:** Vitest **1450 → 1473** (+23, +1 archivo); `tsc` /
    `e2e:typecheck` / `build` verdes; ESLint 11 / 0 / 0 (sin errores
    nuevos). E2E: `smoke` / `hallazgos` (LEAK-01/02 + CRASH-01) /
    `crash-observado` / `modo-de-trabajo` / `catalogo` / `responsive` /
    `reiniciar-calculo` / `cotas-heredadas` sin fallos. Fuzz local:
    baseline `424242` 1×20 y canónica FIX-CRASH `34411681277-1:0` 30/30.
  - **Siguiente:** M2-TOPO-B — enumeración y edición de tramos de
    distribución secundaria.

- **D-δ.92 — M2-TOPO-B: enumeración y edición de distribución secundaria +
  integración hidráulica de montantes existentes.** Segundo slice de
  **M2-TOPO-01**. Hace **visible y editable** en M2 la topología que el
  motor ya sabe calcular (Golden 4). Sin entidad `Montante`, sin
  identidad/nombre/rol persistido, sin constructor `+ Agregar montante`
  (M2-TOPO-C), sin cambio de fórmula. `v0.4.0-beta.5` sigue vigente.
  - **Enumeración:** `identificarFilasDistribucionSecundaria` (UI) —
    proyección derivada sobre la primitiva del motor, agrega `red` +
    denominación de presentación `"Distribución secundaria N"` (numerada
    por red, **no persistida**). Cada fila es UN `Tramo` real: un montante
    segmentado da varias filas. Orden = el de `redHidraulica.tramos`
    (determinista).
  - **UI:** sección "Distribución secundaria" en `ResultadoHidraulicoDeTramo`,
    entre Distribución general y las UF, reutilizando los mismos
    resolvers/componentes (Qc/DN auto/DN manual por segmento, V, hf, tee y
    accesorios en Detalladas, estado). Con 0 tramos secundarios **no se
    renderiza nada** — el proyecto de ejemplo se ve y calcula igual,
    byte-equivalente.
  - **Fix D-δ.49:** el retrofit de bifurcación ahora migra también
    `dnComercialAdoptado` (junto con `longitud_m`/`accesorios`) al Tramo
    troncal representativo; el ramal degradado no retiene ninguno. Gap
    registrado en D-δ.91.
  - **D-δ.50 (decisión roja — Alternativa A, confirmada por el usuario):**
    NO se toca `resolverIncrementoVerticalPorNivel`. En `profesional` no
    hay doble conteo (las longitudes explícitas se acumulan directamente e
    incremento = 0). En `simplificada` D-δ.50 se conserva sin cambios —
    **limitación temporal conocida**: con montante explícito puede
    sobreestimar hf distribuida (doble conteo del ascenso). La
    deduplicación vertical se difiere a **M2-TOPO-C**, junto con la
    identidad persistida y la decisión de cómo representar el aporte
    vertical (no se pre-elige `orientacion` ni `aporteVertical_m`).
    Backward-compat total: proyectos actuales = `simplificada` con 0
    tramos compartidos.
  - **Verificación:** Vitest **1473 → 1498** (+25, +2 archivos); `tsc` /
    `e2e:typecheck` / `build` verdes; ESLint 11 / 0 / 0 (sin errores
    nuevos).
  - **Siguiente:** M2-TOPO-C — constructor y asignación de Locales, con la
    decisión previa de identidad persistida del montante (que desbloquea la
    deduplicación vertical de D-δ.50).

- **D-δ.93 — M2-TOPO-C: identidad semántica de montante + constructor en
  M2 + supresión dirigida del ascenso D-δ.50.** Tercer y último slice de
  construcción de **M2-TOPO-01**. `Proyecto.montantes` guarda **sólo**
  identidad (`id` / `red` / `nombre?`); `RedHidraulica` sigue siendo la
  única fuente física y la membresía montante↔segmento es `Tramo.montanteId`;
  los Locales servidos se **derivan** de la topología aguas abajo. Sin
  segunda topología, sin lista paralela, sin cambio de fórmula.
  - **Constructor** en M2 junto a "Distribución secundaria": `+ Agregar
    montante` (elegir AF/AC), card por montante con nombre editable
    (vacío → fallback `Montante AF 1`; nunca el id), alta/baja de Locales
    **existentes**, tabla de segmentos con los mismos resolvers que
    Distribución general/secundaria, borrar. **Recálculo inmediato** por
    `onCambiar`; el Qc de cada segmento sale del pipeline de simultaneidad,
    nunca de una suma de Qc de Locales.
  - **Motor** `reconciliarMontante.ts`: orden por cota de piso efectiva,
    reutilización de nodo a misma cota (sin tramo 0), longitud sugerida
    `|Δz|` (`longitudEsSugerida: true`), IDs estables, feed que viaja
    entero. Resultado discriminado; los bloqueos muestran copy humano y
    **no mutan**.
  - **RD-1 (decisión roja, cerrada):** una longitud manual / accesorios
    no vacíos / DN adoptado a mano nunca se reparten ni se borran; si un
    alta exige partir un segmento personalizado se **bloquea antes de
    mutar** (`COPY_BLOQUEO_SPLIT_DATO_MANUAL`). Quitar un Local **no**
    fusiona segmentos.
  - **RD-2 (decisión roja, cerrada e implementada):** `Tramo.longitudEsSugerida`
    distingue longitud precargada por IUAS (re-segmentable) de
    personalizada (intocable); `conLongitudDeTramo` elimina el flag al
    editar; la procedencia **nunca** se infiere comparando valores.
  - **D-δ.50 — deduplicación vertical resuelta:** si el camino contiene
    ≥ 1 `Tramo` con `montanteId`, el ascenso implícito D-δ.50 se **suprime**
    (`suprimidoPorMontante`). Distribución compartida **genérica sin
    montante** conserva D-δ.50 (Alternativa A de D-δ.92); no se usa
    `esTramoDeDistribucionCompartida` como señal; no se reactiva `3·nivel`
    como fallback; Profesional sin cambios.
  - `origenIntermedioNoSoportado`: **limitación temporal conocida** (el
    origen entre cotas servidas deja la forma física ambigua) — aviso
    humano, sin inventar topología.
  - **Graph-ready:** `proyectarMontante` (READ-ONLY) + prueba de
    proyectabilidad con fixture de 3 Locales — un resolver VIS-TOPO futuro
    deriva id/nombre/red/origen/niveles (nodo, Local, orden, longitud, DN)
    de `RedHidraulica` + `Proyecto.montantes` + UF/Locales + resultados.
    **Nada gráfico persistido.**
  - **Fuera de alcance:** HYD-EST-01, VIS-TOPO-01, M2-TOPO-D (tees). Sin
    ADR (M2-TOPO-E).
  - **Verificación:** Vitest **1585 / 1585**; `tsc` / `e2e:typecheck` /
    `build` verdes; ESLint 11 / 0 / 0. E2E `montantes.spec.ts` y acciones
    de fuzz de montante; fuzz local baseline + FIX-CRASH + FIX-LEAK
    verdes. `v0.4.0-beta.5` sigue vigente; sin `beta.6`.
  - **Hallazgo (fuera de alcance):** `humanizarModulo3.ts`
    (`medidorIndividualFueraDeTabla06`, D-δ.56) muestra el id crudo de la
    UF con carga extrema de artefactos — pre-existe, no lo dispara ninguna
    acción de montante.
  - **Siguiente:** M2-TOPO-D — UI y edición fina de tees.

- **D-δ.94 — FIX-CRASH-M3-INDUSTRIAL-01 (hotfix P0).** El gate de QA
  Fuzz cloud 20×30 posterior a M2-TOPO-C falló: `WHITE_SCREEN` determinista
  en la seed `34493241441-1:15` (step 28,
  `cambiarTipoArtefacto=piletaDeCocinaIndustrial`), desktop y mobile.
  **Causa raíz ajena a montantes / CAT-CONN y pre-existente a M2-TOPO-C**
  (D-δ.54): con propiedad horizontal + ACS `central`, `contribucionesCentral`
  (`resolverAlcancesDeMedidoresIndividuales.ts`) asumía que todo artefacto
  mixto tiene desagregación AF/AC de catálogo; un industrial de §2.9.1.3
  conectado `'ambas'` (`quFria_lps` = null) hacía lanzar `resolverQuEfectivo`
  y el throw desmontaba la app en el render de M3. Fix: cada ramal común se
  dimensiona para el `quTotal` — misma ampliación de CRIT-A15 (D-δ.79) que
  M2 ya aplicaba en `resolverQuEfectivoParaTramo`. Secuencia mínima: 7
  acciones, sin ningún montante. Regresión: 4 unit en
  `resolverAlcancesDeMedidoresIndividuales.test.ts` (3 sobre
  `contribucionesCentral` directo + 1 integración con catálogo real) + E2E
  en `hallazgos.spec.ts` (verificado con `git stash`). Vitest
  **1589 / 1589**; gate local completo `34493241441-1` runs **0–19**
  desktop+mobile 20/20 (los 16–19 con la facilidad nueva
  `IUAS_FUZZ_START_RUN`, que sólo acota el bucle); sin regresión en seeds
  históricas. Sin tocar hidráulica, CAT-CONN, montantes ni `ErrorBoundary`.
  - **Siguiente:** nuevo QA Fuzz cloud 20×30 (seed vacía); si queda verde,
    M2-TOPO-D.

- **D-δ.95 — M2-TOPO-D: edición fina de tees de las derivaciones de
  montante + reconciliación de `Nodo.tee`.** Cierra la brecha de M2-TOPO-C:
  las bifurcaciones sobre la espina de un montante no tenían UI y dejaban
  Detalladas incompleta sin forma de resolverlo. `Nodo.tee`
  (`ConfiguracionDeTee`, CRIT-A31) sigue siendo la única fuente; NO entra
  al picker de accesorios de Tramo; **cero heurística** recto/lateral. UI:
  sección "Derivaciones" en la card del montante (sólo `metodoPerdidaLocalizada
  = 'detallado'`, MODE desacoplado), reutilizando `TeeDeNodoEditor`
  refactorizado a radios (`<fieldset>` + `role="radiogroup"` + `useId()`
  opaco, sin ids técnicos). `reconciliarTeesTrasCambioTopologico` limpia de
  forma determinista una `Nodo.tee` que quedó inválida (nodo dejó de ser
  1→2, o la recta ya no sale de él) tras alta/baja de Local o borrado de
  montante — sin tocar longitudes/DN/accesorios. **Estimadas intactas**
  (`resolverPerdidaLocalizadaEstimadaDeLocal` no lee `Nodo.tee`; test
  byte-equivalente). **Fan-out 1→N (N≥3): limitación conocida** — la
  topología es válida para Qc, pero en Detalladas el nodo contribuye 0 a la
  pérdida localizada (CRIT-A31 sólo cubre 1→2, comportamiento pre-existente
  desde D-δ.33); la UI lo explica en vez de mostrar un editor engañoso.
  Resolverlo exige elegir entre geometrías no equivalentes (prohibido por
  el brief) → queda para HYD-EST / M2-TOPO-E. Vitest **1606 / 1606**;
  `tsc` / `e2e:typecheck` / `build` verdes; ESLint 11/0/0. E2E
  `montantes.spec.ts` +1 caso de tee. `v0.4.0-beta.5` sin mover.
  - **Siguiente:** nuevo QA Fuzz cloud 20×30 (seed vacía); si queda verde,
    **M2-TOPO-E** (cierre arquitectónico + ADR + política 1→N + desbloqueo
    HYD-EST/VIS-TOPO).

- **D-δ.96 — M2-TOPO-E: cierre arquitectónico de M2-TOPO-01.** Último slice
  de la serie. Auditoría A/B/C/D (sin contradicciones: `RedHidraulica` es la
  única fuente física, `montanteId` no lo lee ningún cálculo hidráulico, sin
  segunda topología ni helper duplicado grave). **Política 1→N (§8, cambio
  funcional):** `resolverClasificacionDeTee` distingue el fan-out
  1 entrante + >2 salientes como `derivacionMultipleNoModelada` (según la
  topología real, nunca según `montanteId`; aplica también a cabeceras de
  Local con ≥3 artefactos); `acumularPerdidaLocalizadaDeCamino` lo marca no
  resuelto y el camino Detalladas queda **explícitamente incompleto**
  (`perdidaLocalizadaIncompleta`), nunca un 0 silencioso que aparente
  "completo". **No asigna Ks, no calcula pérdida, no inventa geometría** —
  reutiliza el sistema de incompletitud + humanización existente, sin tocar
  fórmulas. 1→2, Estimadas (`resolverPerdidaLocalizadaEstimadaDeLocal` sigue
  sin leer topología) y goldens **sin cambios**; el único efecto sobre
  fixtures es un caso 1→N en Detalladas que pasa de "acumulada" a
  "incompleta" (corrección de falso-completo). **`ADR-0001` —** primer ADR
  del repo (`docs/adr/` estaba vacío): consolida la arquitectura de
  topología hidráulica explícita y semántica de montantes. **Multinivel
  futuro:** confirmado que M2-TOPO trabaja por **cota de piso efectiva del
  Local** (`resolverCotaPisoDeLocal`), no por "UF = una planta" — sin gap.
  **HYD-EST y VIS-TOPO: formalmente DESBLOQUEADOS.** Vitest **1611 / 1611**;
  `tsc` / `e2e:typecheck` / `build` verdes; ESLint 11/0/0. E2E
  `montantes.spec.ts` +1 caso 1→3; fuzz local en serie verde.
  `v0.4.0-beta.5` sin mover; sin `beta.6`. **M2-TOPO-01: CERRADO.**
  - **Siguiente:** nuevo QA Fuzz cloud 20×30 (seed vacía); si queda verde,
    **PERF-SCALE-01** (P1).

- **D-δ.97 — PERF-SCALE-01A: motor de resolución a escala.** Primer slice
  del P1 `PERF-SCALE-01`. Caso real ~14 UF / ~238 terminales: editar un
  input de verificación de presión tardaba segundos a minutos por tecla
  (perfil Chrome: ~15,2 s de scripting; hotspot
  `determinarCondicionHidraulicaDeCaudal` ~6,4 s SELF + `Xe` ~2,5 s SELF).
  **Causa:** el clasificador de condición hidráulica del par (Tramo,
  Artefacto) reconstruía índices de red + DFS **en cada llamada**, y se lo
  llamaba **una vez por artefacto aguas abajo de cada Tramo** — 105.840
  llamadas para una resolución de M2 del fixture de escala. **Fix
  (algorítmico, sin tocar fórmulas ni React):** `crearIndiceTopologico`
  (mapas nodos/tramos/salientes, una vez) + `resolverCondicionesHidraulicasDeCaudalAguasAbajo`
  (**un** DFS que resuelve la condición de **todos** los artefactos aguas
  abajo del Tramo, reutilizado por `resolverHidraulicaDeTramo`);
  `determinarCondicionHidraulicaDeCaudal` queda como wrapper fino (firma y
  14 tests intactos). `Xe` = la reconstrucción de índice por llamada
  (identificada por correlación, sin sourcemap); colapsa con el fix.
  **Equivalencia:** clasificador pre-slice conservado verbatim en test y
  comparado par a par sobre topologías diversas + fixture de escala; goldens
  **sin rebaseline**. **Benchmark** (`npm run perf`, fuera de CI): fixture
  M (294 terminales) `resolverEstadoModulo2` **~16,5 s → ~1,1 s** (≈15× en
  frío, ≈33× mediana warm); proyecto chico no se degrada. Regresión
  **estructural** en CI (no milisegundos): índices/resolución ~5·tramos,
  nunca artefactos×tramos. **Hotspot restante:** `resolverHidraulicaDeTramo`
  se recalcula 2058× para 393 tramos distintos (cross-camino/cross-etapa)
  → se abre **`PERF-SCALE-01B`** (P1). Vitest **1623 / 1623**; `tsc` /
  `e2e:typecheck` / `build` verdes; ESLint 11/0/0. `v0.4.0-beta.5` sin
  mover. **PERF-SCALE-01: NO cerrado (01A hecho, 01B pendiente).**
  - **Siguiente:** QA Fuzz cloud 20×30 (seed vacía); si queda verde,
    **PERF-SCALE-01B** en chat nuevo.

- **D-δ.98 — PERF-SCALE-01B: contexto de cálculo local a la resolución de
  M2.** Segundo slice del P1 `PERF-SCALE-01`. Prueba manual post-01A: la
  mejora es clara pero el lag reaparece a ~8-9 UF; tanque y "Pelo de agua
  mínimo" pesados. **Causa residual (01A la identificó):** dentro de UNA
  `resolverEstadoModulo2`, el mismo Tramo resolvía su hidráulica desde cero
  **~5,2×** — una vez por cada camino de terminal que lo incluye
  (cross-camino) y una vez por cada etapa que le pide diámetro/velocidad
  (cross-etapa: pérdida distribuida, localizada estimada/detallada,
  diámetro comercial). **Fix (sin fórmulas, sin React):**
  `ContextoDeCalculoM2` — contexto **puro y local a una resolución** con
  memos `Map<tramoId, resultado>` para `resolverHidraulicaDeTramo` y
  `resolverDiametroComercialDeTramo`, threadeado como parámetro **opcional**
  por 8 firmas desde `resolverEstadoModulo2` (ausente ⇒ comportamiento
  previo byte a byte). Clave = sólo `tramoId`: durante la resolución el
  Proyecto/red/config son inmutables ⇒ no hay dos resultados legítimos
  distintos (no es decisión roja). Sin cache global, sin `WeakMap`, sin
  invalidación — vive una resolución, nunca queda stale. **Colapsa
  2058→393 (fixture M):** el índice topológico + DFS aguas abajo de 01A se
  ejecuta **1 vez por Tramo distinto**; `resolverEstadoModulo2` warm M
  **~596 ms → ~75 ms** (≈8×), ratio cálculos/tramo = 1,00 en S/M/L,
  proyecto chico no se degrada. **Equivalencia:** ruta con contexto
  compartido ≡ legacy sin contexto para todos los Tramos y terminales
  (orden directo e inverso), goldens **sin rebaseline**. Instrumentación
  ampliada (solicitudes/cálculos/hits, `resolucionesModulo2`) — inerte por
  defecto. **§17 — resoluciones por edición (medido, NO optimizado acá):**
  una tecla dispara **2× `resolverEstadoModulo2`** (sidebar + panel) + un
  bucle `candidatos` sin contexto (≈ 3er recorrido, ~2058 índices) + ~3
  barridos de dimensionamiento; **ningún panel usa `useMemo`**. `Duplicar
  UF` construye la copia completa y publica UN Proyecto final (0
  resoluciones, 0 estados intermedios durante el build). **CASO B (§18)
  → se abre `PERF-SCALE-01C` (P1): orquestación React / derived
  computations de la verificación de M2** (compartir estado sidebar↔paneles,
  `useMemo` sobre proyecto, colapsar `candidatos`). Debounce prohibido como
  cierre. Vitest **1648 / 1648** (1623 + 25); `tsc` / `e2e:typecheck` /
  `build` verdes; ESLint **11/0/0** (baseline). E2E
  `escala-verificacion.spec.ts` (desktop+mobile). `v0.4.0-beta.5` sin
  mover; sin `beta.6`. **PERF-SCALE-01: NO cerrado (motor 01B hecho; 01C
  necesario por evidencia — pendiente prueba manual del usuario).**
  - **Siguiente:** QA Fuzz cloud 20×30 (seed vacía) sobre `main`; luego
    prueba manual del usuario en producción; según ella, `PERF-SCALE-01C`.

- **D-δ.99 — PERF-SCALE-01C: orquestación de cálculo M2 en React.** Tercer
  slice del P1 `PERF-SCALE-01`. QA Fuzz cloud post-01B 20×30 verde; prueba
  manual post-01B: lag seguía perceptible pese al motor ya rápido (D-δ.98).
  **Duplicaciones confirmadas:** `resolverEstadoModulo2` se llamaba 2×
  por re-render (sidebar + `PanelDePresionDeModulo2`, ningún `useMemo`);
  el panel además hacía un 3er recorrido completo del árbol de presión
  (bucle `candidatos` sin contexto) para reconstruir datos que
  `resolverEstadoModulo2` ya había calculado; el panel de Tuberías
  resolvía cada Tramo hasta 3× por fila (mismo Tramo, 3 llamadas
  independientes sin compartir nada). Las 3 tablas de dimensionamiento
  cubren Tramos disjuntos entre sí (no hay redundancia cruzada, sólo
  intra-fila). `Duplicar UF` NO agregaba duplicación propia (build ya
  publicaba un único Proyecto, 0 estados intermedios) -- el costo era
  enteramente el re-render posterior. **Fix:** `resolverResolucionDeModulo2`
  (nuevo, punto único que compone entradas+M2), memoizado por
  `useMemo(..., [proyecto, demandaValida])` en `MotorDemandaPantalla` y
  compartido con `resolverResumenDeProyecto` (param opcional) y
  `PanelDePresionDeModulo2` (prop opcional) -- ausente en ambos ⇒
  comportamiento previo byte a byte. `EstadoModulo2` gana `candidatos:
  readonly CandidatoTerminal[]` (resultado crudo por terminal ya
  calculado, `[]` en las ramas que cortan antes de iterar) -- el panel lo
  lee en vez de recorrer de nuevo, salvo `estado==='error'` estructural
  (recorrido preservado idéntico, equivalencia byte a byte en ese borde).
  `ResultadoHidraulicoDeTramo` crea UN `ContextoDeCalculoM2` (01B) por
  render y lo comparte entre las 3 tablas de dimensionamiento. Sin cache
  global, sin persistencia en Proyecto, sin schema change -- mismo
  principio que 01B, extendido de "una función" a "un render". **Métricas
  (fixture M):** `resolucionesModulo2` 2→**1**; recorridos de presión
  extra 1→**0**; cálculos reales de dimensionamiento 591→**393**; re-render
  compuesto ~852 ms→**~207 ms** (≈4,1×) -- para Pelo de agua, tanque,
  agregar artefacto y el re-render posterior a duplicar UF (mismo patrón
  arquitectónico en las 4). **Dependencias de Pelo de agua (analizado, sin
  rediseñar):** editar la cota de raíz sólo afecta la etapa de presión
  (Qc/DN/V/hf no leen `Nodo.cota_m`); el pipeline sigue recalculando todo
  el Proyecto por falta de invalidación incremental -- candidato a
  `PERF-SCALE-01D` si la prueba manual lo justifica, no decidido acá.
  **Equivalencia:** `PanelDePresionDeModulo2.test.ts` y
  `ResultadoHidraulicoDeTramo.test.ts` (`renderToStaticMarkup`, 19 casos
  cada uno) verdes SIN CAMBIOS -- ejercitan la ruta de fallback byte a
  byte. Vitest **1649 / 1649** (1648 + 1); `tsc` / `e2e:typecheck` /
  `build` verdes; ESLint **11/0/0** (baseline; 1
  `eslint-disable-next-line react-hooks/exhaustive-deps` justificado).
  E2E `escala-verificacion.spec.ts` + suite M2 existente, desktop+mobile,
  verdes contra build local. `v0.4.0-beta.5` sin mover; sin `beta.6`.
  **PERF-SCALE-01C: CERRADO — pendiente validación manual para cerrar
  PERF-SCALE-01 (o abrir 01D con evidencia).**
  - **Siguiente:** QA Fuzz cloud 20×30 (seed vacía) sobre `main`; luego
    prueba manual del usuario en producción.

- **D-δ.100 — PERF-SCALE-01D: escala real 20+ UF — tres redundancias
  algorítmicas O(n²)/O(n³) + un React.memo dirigido.** Cuarto slice del P1
  `PERF-SCALE-01`. QA Fuzz cloud post-01C 20×30 seed vacía **TODO VERDE**;
  prueba manual post-01C: hasta ~14 UF la experiencia mejora bastante, pero
  a partir de ~15 UF reaparece lag; `Duplicar UF` 20→21 tarda ~1 s; editar
  "Pelo de agua mínimo" / desnivel del tanque se vuelve **muy pesado** (la
  UI "parece colgarse"); Verificación mostraba `Incompleto (384 motivos)`.
  **PERF-SCALE-01 NO podía cerrarse.** Profiling primero (fixture XXL vía
  `generarProyectoDeEscala` a 8/14/20/21 UF, `scripts/perf/benchmarkEscalaXXL.perf.ts`
  nuevo; instrumentación topológica extendida con `pasosCaminoHaciaOrigen`,
  `resolucionesRedDeTerminal`, `construccionesTramosRepresentativos` y
  tiempo por etapa) descartó las tres hipótesis genéricas del brief y
  encontró **tres redundancias algorítmicas nuevas**, ninguna tocada por
  01A/B/C, más un problema de render separado:
  1. `obtenerCaminoHaciaOrigen` escaneaba TODOS los tramos del Proyecto en
     CADA paso del camino (`Array.filter` sin índice) — O(profundidad·tramos)
     por terminal en vez de O(profundidad).
  2. `resolverEntradasDeVerificacion` repetía, por terminal, un
     `Array.find` sobre todos los terminales y otro sobre todos los tramos
     (`resolverRedDeTerminal`) — O(terminales·(terminales+tramos)).
  3. `crearIndiceTopologico` (el índice nodos/tramos/salientes de 01A) se
     reconstruía **una vez por Tramo distinto calculado** (~tramos veces
     por resolución) en vez de una sola vez -- pese a que su propio
     comentario de diseño decía "se materializa UNA vez por resolución".
     Afecta tanto a `resolverHidraulicaDeTramo` como, de forma separada, a
     `obtenerArtefactosAguasAbajo` (que reconstruía su PROPIO índice
     inline) y a los `Array.find` de tramo-por-id en
     `resolverDiametroComercialDeTramo` / `resolverPerdidaDistribuidaDeTramo`.
  4. **La dominante, exclusiva de `granularidadHidraulica: 'simplificada'`
     (modo Rápido, el default de la app):** `seleccionarTramosDeAcumulacion`
     pedía `identificarTramosRepresentativosDeLocales(proyecto)` **desde
     cero por cada terminal** (una vez para pérdida distribuida, otra para
     localizada) -- y esa función es, ella sola, O(tramos²) sin contexto
     (un traversal aguas abajo sin índice por cada Tramo del Proyecto).
     Total: **O(terminales·tramos²)** por resolución. A 21 UF (441
     terminales, 589 tramos) esto medía **~7 s reales** por
     `resolverResolucionDeModulo2` en el navegador -- el causante directo
     del "se cuelga" al editar presión en modo Rápido.
  **Fix (los cuatro, mismo patrón: memoizar UNA vez por resolución en
  `ContextoDeCalculoM2`, threadeado como parámetro opcional, ausente ⇒
  comportamiento previo byte a byte -- sin fórmulas nuevas, sin cache
  global, sin invalidación):** `tramosEntrantesPorNodoDestino` (índice
  nodoDestino→tramos entrantes, arregla 1), Maps locales en
  `resolverEntradasDeVerificacion` (arregla 2), `indiceTopologico`
  compartido vía `obtenerIndiceTopologicoDeContexto` (arregla 3, threadeado
  también a `obtenerArtefactosAguasAbajo` con un parámetro
  `IndiceTopologico` opcional), `tramosRepresentativosDeLocales` vía
  `obtenerTramosRepresentativosDeLocalesDeContexto` (arregla 4, la de
  mayor impacto). **Quinto hallazgo, ya en React:** con el motor
  arreglado, `ResultadoHidraulicoDeTramo` (sección "Tuberías",
  EXCLUSIVAMENTE dimensionamiento Qc/DN/V/hf) seguía re-renderizando sus
  ~20+ secciones de UF completas ante CUALQUIER edición del Proyecto,
  incluidas las que sólo tocan presión (pelo de agua, desnivel,
  presión sobre acera) -- datos que ese árbol de render **nunca lee**
  (auditado por grep sobre todo `interfaz/paginas/**`). Fix:
  `React.memo` con comparador dirigido
  (`sonPropsDeDimensionamientoEquivalentes.ts`, propio archivo por
  `react-refresh/only-export-components`) que compara referencia de
  `unidadesFuncionales` / `redHidraulica.tramos` / `configuracionHidraulica`
  / `modoTrabajo` / `catalogoArtefactos` / `onCambiar` -- todos preservados
  por los mutadores de parámetros/cota (`conCotaDeNodo`,
  `conDesnivelConexion`, `conParametro`, spread superficial verificado)
  cuando sólo cambia presión, y correctamente invalidados por cualquier
  cambio real de topología/artefactos/Tramo. **Medido (Node, 20-21 UF,
  `resolverEstadoModulo2` solo):** 147 ms → **47 ms** (−68 %) / 140 ms →
  **48 ms** (−66 %); a 8/14 UF −38 %/−55 %. **Medido (navegador real, dev
  build, React Profiler temporal, 21 UF):** editar desnivel **15,7 s →
  1,0 s** (≈15×; el 93 % restante del motor bajó de ~13,8 s a ~0,15 s con
  sólo el fix 4, y el memo de React eliminó el ~1 s de re-render que
  quedaba). `Duplicar UF` 20→21 y `Agregar artefacto` quedan en ~1-2,6 s
  wall-clock -- ya NO hay trabajo evitable ahí: es render legítimo de
  ~20 secciones de UF que SÍ cambiaron (candidato a `PERF-SCALE-01E` de
  render/DOM si el usuario lo sigue sintiendo pesado; no decidido acá,
  ver más abajo). **Hallazgo adicional (no arreglado, fuera de alcance):**
  el "384/441 motivos" del caso real probablemente sea
  `perdidaDistribuidaIncompleta`/`sinCandidatoAdmisible` genuino -- a 20+
  UF con un único tronco de distribución, el caudal simultáneo agregado
  puede exceder el rango de velocidad admisible de TODO el catálogo
  comercial para ese tramo; es un límite de diseño/catálogo, no un bug de
  cálculo ni de performance -- documentado como observación, no como
  pendiente de este slice. **Equivalencia:**
  `contextoDeCalculoM2.equivalencia.test.ts` +3 casos (`obtenerCaminoHaciaOrigen`,
  `obtenerArtefactosAguasAbajo`, `identificarTramosRepresentativosDeLocales`,
  contexto ≡ sin contexto) × 7 escenarios (+1 nuevo, escala 'simplificada');
  `independenciaEstructuralDePresion.test.ts` (nuevo): Qc/DN/V/hf
  byte-idénticos tras editar pelo de agua o desnivel, en ambas
  granularidades; `sonPropsDeDimensionamientoEquivalentes.test.ts`
  (nuevo): 8 casos del comparador de memo (equivalentes vs. distintas).
  Regresión estructural (`escalaDelMotor.regresion.test.ts`): 2
  aserciones actualizadas para reflejar la arquitectura nueva
  (`indicesTopologicosCreados` pasa de "≈tramos" a "**1** por resolución,
  sin importar la escala") + 1 caso nuevo para
  `construccionesTramosRepresentativos === 1` en 'simplificada' a 20 UF;
  1 test pre-existente (`resolucionesDeVerificacionPorEdicion.regresion.test.ts`)
  actualizado porque `obtenerArtefactosAguasAbajo` ahora comparte contador
  con hidráulica (el invariante real -- cero hidráulica durante el build
  de duplicar -- lo siguen cubriendo las aserciones de solicitudes, sin
  cambios). Vitest **1686 / 1686** (1649 + 37); `tsc` / `e2e:typecheck` /
  `build` verdes; ESLint **11 / 0 / 0** (baseline verificado por
  comparación directa vía `git stash`, sin cambios). E2E
  `escala-verificacion.spec.ts` ampliado de ~5 a **~20 UF** (19
  duplicaciones) + acción "Agregar artefacto", desktop+mobile, verde
  contra build local. Fuzz Nivel A (motor + React principal tocados):
  `424242` 3×30 desktop verde; históricos `34493241441-1:15`
  desktop+mobile, `34411681277-1:0`, `34398035608-1` runs 0..12 -- ver
  handoff para el detalle completo. Ninguna instrumentación de diagnóstico
  (React Profiler temporal, `window.__IUAS_PERF__`) quedó en el código
  final -- se usó, se leyó y se retiró; sólo permanece la instrumentación
  de CONTEO ya existente (mismo patrón `instrumentacionTopologica.ts` de
  01A/B), extendida con los contadores nuevos.
  **PERF-SCALE-01D: CERRADO.** `PERF-SCALE-01`: pendiente sólo la
  validación manual del usuario sobre el deploy (20 UF, duplicar 20→21,
  agregar artefacto, teclear en pelo de agua/desnivel, revisar si
  Verificación sigue con cientos de motivos) -- según esa prueba,
  `PERF-SCALE-01: CERRADO`, o se abre `PERF-SCALE-01E` (render/DOM) con la
  evidencia concreta que aporte esa prueba, no por intuición.

- **FIX-MONTANTE-ADD-01 (D-δ.101) -- CERRADA.** Regresión funcional
  reportada tras el deploy de 01D: `+ Agregar montante` → AF/AC no
  mostraba ninguna card. Causa: el comparador de memo de 01D
  (`sonPropsDeDimensionamientoEquivalentes.ts`) auditó qué campos el
  árbol de Tuberías NUNCA lee (`cota_m`/`desnivelConexion_m`/
  `presionSobreAcera_m`) pero no la recíproca -- dos campos que sí lee
  quedaron fuera de la comparación: `Proyecto.montantes`
  (`ConstructorDeMontantes`) y `Nodo.tee` (`TeeDeNodoEditor`, dentro de
  `DerivacionesDeMontante`). `conMontanteNuevo`/`conTeeDeNodo` sólo
  reconstruyen esos campos puntuales -- el memo veía todo lo demás
  intacto y se saltaba el render, dejando la UI mostrando el estado
  viejo. El E2E determinista (`montantes.spec.ts`) sí lo detectaba, pero
  el fuzz cloud no (sus acciones de alta de montante nunca verifican que
  la card aparezca, sólo invariantes genéricos). Fix: agregar
  `proyecto.montantes` a la comparación por referencia, y un comparador
  dirigido nuevo para `Nodo.tee` que NO compara `redHidraulica.nodos`
  por referencia de array completo (eso habría reintroducido el
  re-render evitable de `Nodo.cota_m` que 01D existe para evitar) sino
  sólo el campo `tee` de cada nodo. Sin cambios de dominio. Vitest
  **1688/1688** (+2); `tsc`/`e2e:typecheck`/`build` verdes; ESLint
  11/0/0 sin cambios. `montantes.spec.ts` 5/5 desktop+mobile contra
  build local (fallaban los 5 contra el código pre-fix); fuzz dirigido
  (seeds 7/42/99 · 30 pasos) verde. De paso, se corrigió
  `playwright.config.ts` (faltaba `--base /IUAS/` en el comando
  `preview` del `webServer`; sin este flag Vite resuelve `command` como
  `'serve'` durante preview y nunca aplica la base de producción,
  rompiendo el testing E2E local -- no afecta el build ni GitHub Pages).
  - **Siguiente:** push a `main`, deploy, smoke de producción (AF + AC +
    renombrar), validación manual del usuario, luego QA Fuzz cloud 20×30
    (seed vacía) sobre `main`. Si verde: retomar `PERF-SCALE-01E`
    (diagnóstico pendiente: agregar UF vacía 33→34 tarda >2 s).

- **D-δ.102 — PERF-SCALE-01E: `Agregar UF` vacía re-renderizaba las UF
  existentes de "Tuberías" sin necesidad.** Quinto slice del P1
  `PERF-SCALE-01`. QA Fuzz cloud post-FIX-MONTANTE-ADD-01 20×30 seed
  vacía **TODO VERDE**; validación manual: alta de montante AF/AC OK; M4
  sigue fluido a ~30 UF/~544 artefactos, pero `+ Agregar unidad
  funcional` a ~33 UF tardaba **>2 s** pese a que la UF nueva nace vacía
  (sin Locales/Artefactos/terminales/tramos/demanda). Verificado primero
  (21 casos × 3 escalas, `agregarUnidadFuncional.equivalencia.test.ts`):
  agregar una UF vacía preserva por referencia toda subestructura ajena a
  `unidadesFuncionales` y resuelve M2/M3/M4/demanda byte a byte
  idénticos -- ninguna dependencia hidráulica oculta. Profiling (Node,
  `scripts/perf/benchmarkAgregarUfVacia.perf.ts`, nuevo): el motor nunca
  pasó de ~300 ms a 33 UF -- no explicaba los >2 s. Profiling (navegador
  real, build local): reprodujo el reporte casi exacto (~300 ms a 10 UF →
  **~2000-2450 ms** a 33 UF). Causa raíz: `SeccionDeUnidadFuncional`
  (una tarjeta de UF en "Tuberías") no tenía `React.memo` propio -- el
  memo externo de 01D (`sonPropsDeDimensionamientoEquivalentes`) compara
  `unidadesFuncionales` por referencia completa, que SIEMPRE cambia al
  agregar una UF, así que nunca evitaba nada acá: las 33 tarjetas
  existentes se reconciliaban igual que la nueva. Auditoría recíproca
  (grep sobre todo el subárbol de `SeccionDeUnidadFuncional`): sólo lee
  `redHidraulica.tramos`, `Nodo.tee` y `configuracionHidraulica` de
  `Proyecto` -- nunca `montantes` ni `modoTrabajo`. Fix: `React.memo`
  dirigido nuevo (`sonPropsDeSeccionDeUnidadFuncionalEquivalentes.ts`,
  reutiliza `sonNodosDeTeeEquivalentes` de FIX-MONTANTE-ADD-01) que
  compara `uf` (referencia propia) + esos tres campos auditados, excluye
  deliberadamente `proyecto` completo/`filasPrincipalesDeLocales`/
  `contextoDeCalculo` (siempre nuevos por render, pero irrelevantes para
  el resultado de una UF no tocada -- justificado en el propio archivo,
  sin cache global ni invalidación nueva). De paso se extrajo la
  mutación real (`agregarUnidadFuncionalVaciaEnProyecto`, antes closure
  privada) a `agregarUnidadFuncional.ts`, mismo criterio que
  `duplicarUnidadFuncional.ts`. **Medido (navegador real, contador de
  renders temporal confirmando 1 sola ejecución de
  `SeccionDeUnidadFuncional` por click, sólo la UF nueva):** 33→34 UF
  **>2 s → ~600 ms** (≈3,3-3,5×), curva prácticamente en meseta con la
  escala (antes crecía linealmente). `Duplicar UF` 30→31 (control, no
  tocado): ~2,7 s después, consistente con los ≈2,46 s reportados antes
  -- sin regresión, sigue siendo render legítimo de una UF que sí cambia
  datos. M4/pelo de agua siguen fluidos (`escala-verificacion.spec.ts`
  verde, 01D intacto). **Equivalencia:**
  `agregarUnidadFuncional.equivalencia.test.ts` (nuevo, 21 casos);
  `sonPropsDeSeccionDeUnidadFuncionalEquivalentes.test.ts` (nuevo, 10
  casos, incluida la guardia de tee de FIX-MONTANTE-ADD-01 extendida a
  este comparador). Vitest **1719/1719** (1688 + 31); `tsc`/
  `e2e:typecheck`/`build` verdes; ESLint **11/0/0** sin cambios. E2E
  nuevo `agregar-uf-vacia-escala.spec.ts` desktop+mobile verde contra
  build local; `montantes.spec.ts` 5/5 desktop+mobile (guardia
  FIX-MONTANTE-ADD-01) y `cotas-heredadas.spec.ts`/`smoke.spec.ts`/
  `escala-verificacion.spec.ts` verdes. Fuzz Nivel A: seed `424242` 3×30
  desktop verde. Instrumentación de diagnóstico (contador temporal)
  retirada por completo antes de cerrar. Sin cache global, sin
  invalidation engine, sin virtualización, sin schema change, sin
  worker, sin debounce.
  - **PERF-SCALE-01: recomendado CERRAR** (M4/presión fluidos, alta de UF
    vacía sub-segundo y sin escalar con la cantidad de UF, `Duplicar UF`
    queda como operación pesada legítima ocasional) -- pendiente la
    validación manual del usuario sobre el deploy para confirmarlo.
  - **Siguiente:** push a `main`, deploy, smoke de producción, validación
    manual del usuario (llegar a ~30-33 UF, medir Agregar UF, probar
    montante AF/AC, volumen tanque/cisterna/pelo de agua, opcional
    duplicar UF), luego QA Fuzz cloud 20×30 (seed vacía) sobre `main`
    -- sólo si el usuario lo autoriza explícitamente.

- **D-δ.103 — UI-M2-GROUP-01: jerarquía progresiva de Unidades Funcionales
  en Tuberías + Montantes compactos + unmount real.** QA Fuzz cloud
  post-PERF-SCALE-01E 20×30 seed vacía **TODO VERDE** (confirmado por el
  usuario). Nueva evidencia manual: proyecto de stress (~60 UF, ~500+
  artefactos) donde acciones tan distintas como duplicar Local, agregar
  UF, agregar artefacto o agregar montante tardaban todas ~5,5 s por
  igual -- señal de que el cuello es el tamaño del árbol UI/DOM montado
  de Tuberías, no un cálculo específico; además la propia interfaz se
  vuelve difícil de operar con cientos de filas AF/AC planas. Principio
  aplicado: "la jerarquía existe en el modelo, la interfaz sólo muestra
  la complejidad necesaria" -- una UF simple no paga complejidad visual;
  la jerarquía aparece sólo con >1 UF.
  - **UF (Tuberías):** con exactamente 1 UF, sin cambios -- se renderiza
    igual que antes (`ListaDeUnidadesFuncionales`, rama `length <= 1`).
    Con >1 UF, cada UF pasa a un header compacto colapsable
    (`.lista-uf__cabecera`, `<button>` real con `aria-expanded`); UNA
    sola UF activa por vez, con **unmount real** de las demás -- ninguna
    UF colapsada instancia `SeccionDeUnidadFuncional` (no hay Local, AF,
    AC, editor de tee ni accesorios de esa UF en el DOM). Agregar/duplicar
    una UF la deja activa/expandida automáticamente y colapsa las demás;
    eliminar la UF activa selecciona otra de forma determinística (la que
    ocupaba su misma posición, o la última); volver a 1 UF vuelve al modo
    simple sin acordeón. Estado 100% transitorio de interfaz (`useState`
    local a `ListaDeUnidadesFuncionales`): nunca se persiste en
    `Proyecto`, no exporta, no afecta el cálculo hidráulico.
  - **Local agrupa AF/AC (§11/§12):** dentro de la tabla de
    dimensionamiento de una UF, las filas AF/AC de un mismo Local ya no
    se leen como dos puntos físicos sueltos -- `TablaDimensionamientoDeModulo2`
    admite un `grupo` opcional por entrada y pinta un encabezado
    compartido ("Baño 1 · 4 artefactos") antes de la primera fila del
    grupo. Sin acordeón nuevo: ambas filas (AF/AC) siguen tan visibles y
    editables como antes, sólo con un título común arriba. La cantidad
    mostrada es la física del Local (`local.artefactos.length`); AF y AC
    conservan sus propias cantidades hidráulicas sin sumarse.
    Distribución general/secundaria y Segmentos de montante no pasan
    `grupo`: sin cambios visuales ahí.
  - **Montantes compactos (§13-§19):** `+ Agregar montante` se movió al
    encabezado de la sección (ya no hay que recorrer las cards
    existentes para crear una). Cada `MontanteCard` se partió en
    `MontanteCardCabecera` (siempre montada: nombre, badge de red,
    resumen "N locales · M segmentos") y `MontanteCardCuerpo` (Locales
    alimentados, Segmentos, Derivaciones/Tee, renombrar, borrar -- **sólo
    montado si el montante está activo**, mismo unmount real que las UF).
    Un solo montante activo por vez, misma lógica de selección que las
    UF; con 1 solo montante queda abierto sin fricción (igual que antes).
    Renombrar y borrar pasan a ser acciones del cuerpo expandido (§19,
    ya no dominan el header). Copy de "sin Locales disponibles" (§18)
    distingue ahora si el montante ya tiene Locales asignados (mensaje
    compacto "Sin más locales disponibles") de si nunca tuvo ninguno
    (explicación completa).
  - **Selección de "activo" compartida:** `elegirElementoActivoTrasCambio`
    (nuevo, `estadoDeElementoActivo.ts`) centraliza la regla "el nuevo
    elemento queda activo; si se elimina el activo, se elige el que
    ocupaba su misma posición o el último" -- usada igual por la lista de
    UF y por Montantes (misma regla, un solo lugar, sin duplicar lógica
    de UI en dos componentes). Recibe sólo arrays de ids, no domain
    objects: no acopla esta lógica de interfaz a `UnidadFuncional`/
    `Montante`.
  - **Regresión FIX-MONTANTE-ADD-01:** auditada explícitamente antes de
    tocar nada -- ningún comparador de memo existente
    (`sonPropsDeDimensionamientoEquivalentes`,
    `sonPropsDeSeccionDeUnidadFuncionalEquivalentes`) se modificó en este
    slice; el unmount de UF/montantes colapsados es montaje condicional
    en JSX, no un memo nuevo. Guardias cubiertas en tests/E2E: crear AF,
    crear AC, cambiar entre montantes, editar tee, renombrar, agregar/
    quitar Local, borrar montante -- todas siguen reactivas.
  - **Hidráulica intacta:** ningún cálculo (demanda, Qc, DN, Di, V, hf,
    presión) se tocó; colapsar/expandir una UF o un montante no ejecuta
    ningún callback hidráulico ni muta `Proyecto` -- es exclusivamente
    estado de UI. `montantes.spec.ts` (5/5, sin cambios de aserciones
    salvo las nuevas) confirma que el flujo de datos M2-TOPO-C sigue
    intacto.
  - **No implementado en este slice (documentado como pendiente futuro,
    no decisión roja):** `UI-M1-MULTINIVEL-01` (insertar `Nivel` real
    entre UF y Local -- los componentes de este slice están escritos para
    no asumir "UF === nivel físico", pero no se crea ningún dato ni UI de
    Nivel ahora), `Duplicar Local`, virtualización (`react-window` u
    similar -- no se agregó ninguna dependencia; se prioriza medir cuánto
    alcanza el unmount real primero), lazy-loading de Módulos, router.
  - **Tests:** `estadoDeElementoActivo.test.ts` (nuevo, 10 casos, la
    regla de selección pura). `ResultadoHidraulicoDeTramo.agrupacionUf.test.ts`
    (nuevo, 9 casos SSR: 1 UF sin acordeón, >1 UF con una activa y unmount
    real del contenido de la colapsada, agrupación de Local con AF+AC).
    `ConstructorDeMontantes.componente.test.ts` (+7 casos: header en el
    encabezado de la sección, 2 montantes con unmount real del cuerpo
    colapsado, 1 montante sin fricción, ambos copys de §18). Vitest
    **1744/1744** (1719 + 25); `tsc`/`e2e:typecheck`/`build` verdes;
    ESLint **11/0/0** sin cambios (baseline idéntico, verificado antes de
    tocar código). E2E nuevo `tests/e2e/multi-uf.spec.ts` (5 casos: 1 UF
    sin acordeón, duplicar dispara la UF activa correcta, abrir/cerrar
    con edición que persiste tras el unmount, eliminar la UF activa
    selecciona otra, escala ~30 UF con sólo una desarrollada) verde
    desktop+mobile contra build local; `montantes.spec.ts` 5/5 desktop+
    mobile; `reiniciar-calculo.spec.ts` y `agregar-uf-vacia-escala.spec.ts`
    (el spec de escala pre-existente de PERF-SCALE-01E, sin modificar)
    también verdes desktop+mobile con el acordeón activo -- confirman que
    la agrupación no rompió ningún flujo previo.
  - **Performance:** no se repitió el profiling exhaustivo de
    PERF-SCALE-01D/E (Nivel B, no algorítmico) -- el E2E de escala
    confirma que a ~30-31 UF sólo se monta 1 `SeccionDeUnidadFuncional` a
    la vez (antes, las 30-31). Medición de milisegundos en una
    instalación real queda para la validación manual del usuario.
  - **Estado:** `UI-M2-GROUP-01: CERRADO — pendiente validación manual`
    del usuario sobre el deploy (caso 1 UF, varias UF con foco en la
    nueva, ~30-60 UF, Montantes AF/AC).
  - **Siguiente:** push a `main`, deploy, smoke de producción, validación
    manual del usuario; si a 60 UF una acción simple sigue lenta pese al
    unmount real, documentar candidato futuro `PERF-SCALE-UI-02` (no
    decidir ni implementar sin que el usuario priorice esa escala).

- **D-δ.104 — FIX-M2-A-PROP-01: cambiar `a` (Tipología de proyecto)
  actualizaba Qc en Demanda pero dejaba DN/V stale en Tuberías
  (Alimentación general y Montantes).** Regresión de correctitud
  hidráulica reportada por el usuario en producción tras UI-M2-GROUP-01:
  Qc SÍ cambiaba al pasar de `a=1` a `a=2` (Demanda/M1, sin memo), pero
  el diámetro/velocidad de la Alimentación general y de los montantes
  quedaban con el valor previo al cambio. La fórmula de simultaneidad
  (`Qmax = Σ(n·qu)`, `Kc = 1/√(n-1)`, `K = Kc·a`, `Qc = Qmax·K`) y
  CRIT-A14 (regla especial de `aEfectivo` para vivienda multifamiliar,
  `determinarAEfectivo.ts`) **no se tocaron** — no era un bug de fórmula.
  - **Causa raíz — CASO A (memo no invalida), no motor:**
    `sonPropsDeDimensionamientoEquivalentes` (`src/interfaz/paginas/
    sonPropsDeDimensionamientoEquivalentes.ts`), el comparador de
    `React.memo` de `ResultadoHidraulicoDeTramo` introducido en
    PERF-SCALE-01D (commit `b4b535b`) para evitar re-render de
    dimensionamiento ante ediciones que sólo afectan presión, enumeraba
    explícitamente los campos de `Proyecto` que el árbol de Tuberías lee
    (`unidadesFuncionales`, `redHidraulica.tramos`, `nodos.tee`,
    `configuracionHidraulica`, `modoTrabajo`, `montantes`) pero omitía
    `proyecto.parametros.tipoDeProyecto` — leído directamente por
    `resolverHidraulicaDeTramo.ts` (`resolverSimultaneidadHidraulicaDeTramo
    (proyecto.parametros.tipoDeProyecto, aportes)`) para el `aEfectivo`/Qc
    de cada Tramo. Como `conTipoDeProyecto` sólo reconstruye
    `proyecto.parametros` (spread superficial), todos los campos que el
    comparador SÍ miraba seguían siendo `===` que antes → el memo
    devolvía `true` → React se saltaba por completo el render de
    `ResultadoHidraulicoDeTramoBase` (Alimentación general, Montantes,
    UF) aunque `proyecto` hubiera cambiado de referencia. El mismo
    olvido existía, redundantemente, en el comparador anidado por-UF
    `sonPropsDeSeccionDeUnidadFuncionalEquivalentes` (PERF-SCALE-01E).
    UI-M2-GROUP-01 fue una pista falsa: no toca ningún comparador de
    memo ni introduce cache nueva (confirmado en el propio mensaje de
    `73ca5d2`); sólo agrega montaje condicional dentro del mismo árbol
    que ya estaba bloqueado desde PERF-SCALE-01D.
  - **Motor limpio, sólo UI stale:** `resolverHidraulicaDeTramo`,
    `ContextoDeCalculoM2` (recreado por identidad de `proyecto` vía
    `useMemo`, PERF-SCALE-01C/01D) y los índices topológicos compartidos
    de PERF-SCALE-01D no tienen ninguna dependencia stale ni cache
    cruzado entre resoluciones — si el árbol vuelve a renderizar, el
    motor siempre calcula Qc/DN/V frescos a partir del `proyecto` actual.
  - **Fix quirúrgico:** agregar
    `prev.proyecto.parametros.tipoDeProyecto === next.proyecto.parametros.tipoDeProyecto`
    a ambos comparadores (`sonPropsDeDimensionamientoEquivalentes.ts`,
    `sonPropsDeSeccionDeUnidadFuncionalEquivalentes.ts`). Ninguna fórmula,
    modelo, UI ni responsabilidad M1-M4 cambió; PERF-SCALE-01D y
    UI-M2-GROUP-01 no se revirtieron ni se regresaron (siguen evitando
    el re-render ante ediciones que sólo afectan presión/pelo de agua/
    desnivel — cubierto por los tests preexistentes de ambos archivos).
  - **Propagación verificada:** Alimentación general y montantes cuya
    demanda aguas abajo depende de la topología recalculan correctamente;
    `a` es un parámetro de `Proyecto` (no por-UF — CRIT-A14/D-β.2, ver
    PENDIENTES-DE-ARQUITECTURA.md "Ubicación conceptual del coeficiente
    de mayoración `a`"), así que un cambio de tipología afecta a todos
    los tramos con n>1 del proyecto, nunca sólo a un montante aislado.
    AC comparte la misma infraestructura de M2 que AF (mismo motor,
    mismo comparador) — no se reabrieron reglas M3/M4.
  - **DN/V:** el fixture end-to-end (11 artefactos, `t-general` +
    montante con 2 Locales) muestra un salto real de DN comercial al
    duplicar `a` (25 mm → 40 mm, V 2,9 → 2,2 m/s) — Qc duplicado empuja
    a un DN mayor, nunca menor; el test de motor
    (`resolverHidraulicaDeTramo.propagacionA.test.ts`) cubre también la
    propiedad `V = Q/A` y, si el DN no cruza umbral, que V se duplica
    exactamente junto con Q.
  - **Tests nuevos:** `sonPropsDeDimensionamientoEquivalentes.test.ts`
    y `sonPropsDeSeccionDeUnidadFuncionalEquivalentes.test.ts` (+1 caso
    cada uno: cambiar `tipoDeProyecto` → DISTINTAS/debe re-renderizar).
    `resolverHidraulicaDeTramo.propagacionA.test.ts` (nuevo, 4 casos):
    Qc global M1 duplica exacto de `a=1` a `a=2`; `t-general` (alimentación
    general) y `t-af-bano` (rama tipo montante) duplican Qc de forma
    independiente; invariante `V = Q/A` con el Di real de cada candidato
    y verificación del salto de DN. Deliberadamente NO se usó
    `viviendaMultifamiliar` como fixture de `a=2` — con una sola UF,
    CRIT-A14 le da `aEfectivo=1` (igual que `a=1`) y el test daría un
    falso negativo sin bug real; se usó `oficinaPublica` (`a=2` base, sin
    la regla especial) para no reabrir ese criterio. `tests/e2e/
    propagacion-a.spec.ts` (nuevo, 2 casos, E2E real de UI): Qc, V y DN
    de Alimentación general cambian al pasar de `a=1` a `a=2` y
    revierten exactamente al volver a `a=1` (sin cache unidireccional);
    V de un montante con 2 Locales asignados también cambia. Vitest
    **1750/1750** (1744 + 6); `tsc`/`e2e:typecheck`/`build` verdes;
    ESLint **11/0/0** sin cambios (baseline idéntico).
  - **Nota de verificación:** el E2E nuevo confirmó, corriendo contra
    producción (URL por defecto de `baseURLEfectiva` sin
    `IUAS_BASE_URL`), que el bug está efectivamente presente en el
    deploy actual antes de este fix, y confirmó contra el build local
    (`IUAS_PREVIEW=1 IUAS_BASE_URL=http://localhost:4173/IUAS/`) que el
    fix lo resuelve.
  - **Estado:** `FIX-M2-A-PROP-01: CERRADO — pendiente validación manual`
    del usuario sobre el deploy (`a=1 → a=2 → a=1`, Qc + velocidad de
    montante + velocidad de alimentación general).

- **D-δ.105 — UI-M2-GROUP-02: pulido de acordeones (0 o 1 abierto) +
  jerarquía visual Local → Red.** Slice UI/UX acotado; hidráulica,
  fórmulas, M1/M3/M4, schema, reconciliación y performance del motor sin
  cambios.
  - **Acordeones (§1):** la regla de UI-M2-GROUP-01 era "siempre queda
    uno abierto" (un click sólo podía CAMBIAR cuál). Pasa a "0 o 1
    abierto": el mismo `<button>` header que ya controlaba la UF/montante
    activa ahora alterna -- click en el elemento ya abierto lo cierra
    (`setUfActivaId((activa) => (activa === uf.id ? undefined : uf.id))`
    en `ListaDeUnidadesFuncionales`, mismo patrón en
    `ConstructorDeMontantes` para `montanteActivoId`). El estado
    `string | undefined` ya lo soportaba desde UI-M2-GROUP-01 (
    `elegirElementoActivoTrasCambio` devuelve `undefined` cuando
    corresponde) -- no hizo falta tocar `estadoDeElementoActivo.ts`, sólo
    el `onClick` de cada header. Crear/duplicar una UF o crear un montante
    sigue dejando el nuevo activo/abierto (sin cambios: pasa por el mismo
    efecto de "elemento nuevo" de UI-M2-GROUP-01). Unmount real preservado
    también en el estado "0 abiertas": ningún `SeccionDeUnidadFuncional`
    ni `MontanteCardCuerpo` se monta si `activaId === undefined`, mismo
    mecanismo condicional en JSX que ya existía (no hay unmount nuevo que
    escribir).
  - **Jerarquía visual Local → Red (§2):** en la tabla de dimensionamiento
    de una UF, el encabezado de grupo del Local ("Baño 1 · 4 artefactos")
    quedaba con `--fs-meta` (0.75rem) y `--color-texto-2` (gris medio) --
    MÁS chico y MÁS claro que sus propias filas hijas AF/AC ("Baño 1 · 4
    puntos"), que heredaban el color/tamaño de texto por defecto de la
    tabla (oscuro, `--fs-body`). Invertía la jerarquía real. Fix: 1)
    `EntradaDeTabla.grupo` pasa de `{ id, etiqueta: string }` (una cadena
    concatenada) a `{ id, nombre, meta? }` para poder pintar cada parte
    distinto; 2) el encabezado de grupo se pinta en dos `<span>`:
    `.m2-fila-grupo__nombre` (nombre del Local, `--color-texto`,
    `--peso-semibold`, `--fs-body` -- un punto más grande que las filas
    hijas) y `.m2-fila-grupo__meta` (cantidad de artefactos,
    `--color-texto-2`, `--fs-meta`, sin cambios); 3) las filas AF/AC de un
    Local agrupado reciben la clase `m2-fila-agrupada` en su `<tr>`
    (`entrada.grupo !== undefined`) y bajan a `--fs-ayuda` (0.8125rem) +
    `--color-texto-2` en su primera celda -- Distribución general/
    secundaria y Segmentos de montante no pasan `grupo`, así que no
    reciben la clase y conservan su estilo de fila normal (no son hijas de
    nada). Pills AF azul/celeste y AC salmón (`BadgeDeRed`), indentación y
    layout de card sin cambios -- sólo tipografía/color de texto.
  - **No se tocó:** ningún resolver del motor, `sonPropsDe*Equivalentes`
    (comparadores de memo), `Proyecto`/schema, ni las reglas M3/M4.
  - **Tests:** `ResultadoHidraulicoDeTramo.agrupacionUf.test.ts` (2 casos
    SSR actualizados: el encabezado de grupo ahora se verifica por los dos
    `<span>` `__nombre`/`__meta` en vez de una cadena concatenada; la
    transición interactiva de acordeón sigue fuera del alcance de SSR,
    igual que en UI-M2-GROUP-01 -- la cubre el E2E). `tests/e2e/
    multi-uf.spec.ts` (+2 casos): click en la UF ya abierta la cierra (0
    UF montadas, sin heading ni tabla en el DOM) y, desde "0 abiertas",
    abrir una la deja sola. `tests/e2e/montantes.spec.ts` (+1 caso):
    mismo patrón para montantes -- cerrar el activo deja 0 `.montante-
    card__cuerpo` montados, abrir el otro desde cero deja exactamente 1.
    Vitest **1750/1750** (sin cambio de total: 2 tests existentes
    reescritos, no agregados -- la cobertura nueva de interacción vive en
    E2E, mismo criterio que UI-M2-GROUP-01); `tsc`/`e2e:typecheck`/`build`
    verdes; ESLint **11/0/0** sin cambios (baseline idéntico). E2E
    dirigido (`multi-uf.spec.ts` + `montantes.spec.ts`, 13/13) y `smoke.spec.ts`
    verdes desktop contra build local. Verificación visual manual (captura
    de pantalla del build local): "Baño 1" en negro/semibold domina sobre
    "Baño 1 · 4 puntos [Agua fría]"/"[Agua caliente]" en gris, confirmado.
  - **Performance:** sin cambios de fondo -- el beneficio de UI-M2-GROUP-01
    (máximo un cuerpo pesado montado, nunca reintroducir todos los
    elementos en DOM) se preserva intacto; "0 activos" monta MENOS que
    "1 activo", nunca más. No se corrió fuzz Nivel A completo (§5 del
    brief: no se tocó estado estructural del Proyecto, sólo estado
    transitorio de UI y presentación) -- se corrió un fuzz proporcional
    (seed `778899`, 3 runs × 25 pasos, desktop) contra el build local
    antes del push.
  - **Estado:** `UI-M2-GROUP-02: CERRADO — pendiente validación manual`
    del usuario sobre el deploy.

- **D-δ.106 — UI-M1-MULTINIVEL-01: una Unidad Funcional puede tener uno o
  más niveles físicos.** Slice estructural, no sólo UI: nueva entidad
  `Nivel` en el modelo (`docs/adr/ADR-0002-nivel-fisico-dentro-de-unidad-funcional.md`).
  Antes, `UnidadFuncional` mezclaba identidad de uso (nombre) con plano
  físico (`nivel`/`cotaHidraulicaReferencia_m`/`locales` directamente en la
  UF) -- asumía implícitamente 1 UF = 1 nivel, falso para casas (PB+PA),
  dúplex (P11+P12) o locales con entrepiso.
  - **Modelo:** `nivel`, `cotaHidraulicaReferencia_m` y `locales` se mueven
    de `UnidadFuncional` a la nueva entidad `Nivel` (`id`, `nombre`,
    `nivel?`, `cotaHidraulicaReferencia_m?`, `locales`).
    `UnidadFuncional.niveles: readonly Nivel[]` reemplaza esos tres campos;
    toda UF tiene siempre >= 1 nivel, sin excepción ni flag de "modo
    simple". Decisión de modelo (Opción A, niveles anidados con Nivel
    dueño de los Locales, vs. Opción B, `Local.nivelId`): ver ADR-0002 --
    A emergió con evidencia clara del código existente (Locales ya vivían
    embebidos en la UF; Opción B habría introducido el único caso de
    referencia-por-id del modelo y el único estado imposible nuevo, Local
    huérfano sin nivel válido) y no ameritó decisión roja.
  - **GEOM-COTA-01** se reencuadra de `UF → Local → Artefacto` a
    `Nivel → Local → Artefacto`: misma fórmula
    (`resolverCotaHidraulicaEfectivaDeArtefacto`/`resolverCotaPisoDeLocal`),
    ahora reciben un `Nivel` en vez de la UF. Nuevo helper
    `resolverNivelDeLocal` (`resolverCotaHidraulicaDeArtefacto.ts`) resuelve
    qué Nivel de una UF posee un Local dado; `localesDeUnidadFuncional`
    aplana los Locales de todos los niveles de una UF (reemplaza el acceso
    directo `uf.locales` en todo el motor/validación).
  - **M2** (`resolverPresionResidualDeCamino`, `resolverIncrementoVerticalPorNivel`,
    `reconciliarMontante`, `resolverInfoCotaDeTerminal`,
    `resolverFilaDeTerminalParaTabla`) resuelve el Nivel del Local de cada
    terminal antes de derivar la cota -- nunca infiere de la UF completa.
    Montantes/topología sin cambios: `Tramo.montanteId` sigue siendo la
    única fuente de pertenencia física; Nivel es geometría/organización,
    no topología.
  - **Duplicar UF** (`duplicarUnidadFuncional.ts`) copia TODOS los niveles
    de la UF, cada uno con id nuevo (antes copiaba el único nivel
    implícito); Locales/Artefactos se clonan igual que antes (D-δ.50/51:
    sin copiar topología M2 física, DN manual, ni longitudes relevadas).
  - **M1 (UI):** con un único nivel se ve y edita exactamente igual que
    antes (mismos 3 campos Nombre/Nivel/Cota, sin acordeón ni card extra
    -- `NivelFormulario` con `esUnico=true` no agrega chrome). Con 2+
    niveles, cada uno es su propia sub-card (`.m1-nivel`) con nombre
    editable, sus propios campos Nivel/Cota, sus propios Locales y
    "+ Agregar local", más "Eliminar nivel" (oculto con un único nivel --
    una UF nunca queda con 0 niveles). "+ Agregar nivel" en la cabecera de
    la UF, junto a "Duplicar". Nuevos módulos testeables extraídos de
    `MotorDemandaPantalla.tsx` (mismo patrón que
    `agregarUnidadFuncional.ts`/`duplicarUnidadFuncional.ts`):
    `agregarNivelAUnidadFuncional.ts` (nivel/cota default = mismo criterio
    que `crearUnidadFuncionalVacia`, sin copiar Locales) y
    `eliminarNivelDeUnidadFuncional.ts` (desconecta conectividad física de
    los Locales del nivel antes de borrarlo, mismo criterio D-δ.47 que
    eliminar un Local suelto).
  - **No implementado, documentado como pendiente (ADR-0002 §4):** mover un
    Local entre niveles (sigue siendo eliminar/recrear manual) y reordenar
    niveles (drag & drop) -- ninguno de los dos era parte del alcance
    mínimo.
  - **Tests:** migración mecánica de ~110 archivos (producción + tests)
    que construían `UF.locales`/`UF.nivel`/`UF.cotaHidraulicaReferencia_m`
    directamente, más cobertura nueva dedicada
    (`unidadFuncionalMultinivel.test.ts`: agregar/eliminar nivel,
    reconciliación M2 al eliminar, herencia de cota Nivel→Local→Artefacto
    en una UF de 2 niveles, `resolverNivelDeLocal`, resumen multinivel; +1
    caso de duplicación multinivel en `duplicarUnidadFuncional.test.ts`).
    Vitest **1766/1766** (1750 baseline + 16 nuevos, 0 removidos);
    `tsc -b`/`e2e:typecheck`/`build` verdes; ESLint **11/0/0** (mismo
    baseline, sin regresión). Nuevo `tests/e2e/multinivel.spec.ts` (5/5):
    UF simple sin chrome extra, agregar segundo nivel (card propia +
    "Eliminar nivel"), agregar Local dentro del segundo nivel con cota
    efectiva derivada de ESE nivel (`+3,XX m`, nunca del primero),
    eliminar nivel, duplicar UF de 2 niveles (la copia trae ambos, nace
    colapsada como toda copia de M1). E2E dirigido verde en **desktop**
    contra el dev server local (`npx vite --port 5173`, workaround
    documentado en `PENDIENTES-DE-ARQUITECTURA.md` D-δ.103 para el bug de
    MSYS/Git Bash con `vite preview --base`): `smoke` + `multi-uf` +
    `cotas-heredadas` + `montantes` + `propagacion-a` (17/17) +
    `multinivel` (5/5) -- **mobile no corrido en esta pasada**, queda para
    el gate de QA cloud habitual del usuario.
  - **Estado:** `UI-M1-MULTINIVEL-01: CERRADO — pendiente validación manual`
    del usuario sobre el deploy.

- **D-δ.107 — FIX-M1-MULTINIVEL-BASE-LEVEL-01: nivel base permanente,
  contraste de "Eliminar nivel" y copy Nivel vs. UF.** Hotfix UX/copy
  sobre D-δ.106, sin cambios de schema/hidráulica/arquitectura (detalle
  completo y hallazgos colaterales fuera de alcance en
  `PENDIENTES-DE-ARQUITECTURA.md`). El primer nivel (`niveles[0]`) es el
  nivel BASE, permanente, sin importar cuántos niveles adicionales tenga
  la UF -- antes "Eliminar nivel" se ofrecía a TODOS los niveles apenas
  había 2+ (bug real de índice, no sólo de estilo). Corregido en la UI
  (`.map((nivel, indice) => ...)`, `indice > 0`) y en el dominio
  (`eliminarNivelDeUnidadFuncionalEnProyecto` rechaza `niveles[0]?.id`
  explícitamente). "Eliminar nivel" ahora lleva borde visible desde el
  reposo en la cabecera del Nivel (antes indistinguible de texto
  deshabilitado, sólo ganaba contraste en `:hover`); input de "Nombre del
  nivel" flexible + cabecera apilada en mobile (desbordaba el viewport).
  Copy: "Cota de piso de la unidad funcional" -> "Cota de piso del nivel"
  (siempre, incluso UF simple); "hereda UF" -> "hereda nivel". ADR-0002
  §5 formaliza la regla (posicional, sin campo `esBase` nuevo). Vitest
  **1768/1768**; `tsc -b`/`e2e:typecheck`/`build` verdes; ESLint
  **11/0/0**; `multinivel.spec.ts` + `cotas-heredadas.spec.ts` **16/16
  desktop+mobile** contra dev server local.
  - **Estado:** `FIX-M1-MULTINIVEL-BASE-LEVEL-01: CERRADO — pendiente
    validación manual` del usuario sobre el deploy.

- **D-δ.108 — UI-M1-DUPLICAR-LOCAL-01: duplicar un Local dentro del mismo
  Nivel.** Acción `Duplicar local` en cada card de M1, junto a `Eliminar
  local`. Clonado profundo (nuevo `local.id` + nuevo `id` por cada
  Artefacto) que queda dentro del MISMO `nivel.id`, insertado inmediatamente
  después del original. Reutiliza exactamente el mismo procedimiento que
  `duplicarUnidadFuncionalEnProyecto` ya usaba por cada Local al duplicar
  una UF completa (D-δ.50/51) -- `duplicarLocal` y `redesObjetivoParaClon`
  se exportaron de `duplicarUnidadFuncional.ts` (su comentario ya
  anticipaba este incremento) y se reutilizan tal cual en el nuevo
  `duplicarLocalEnNivel.ts`, sin reimplementar CAT-CONN-01 ni la
  sincronización topológica.
  - **Herencia (GEOM-COTA-01):** el spread superficial de `duplicarLocal`
    ya garantiza que un Local sin override de cota siga sin override en la
    copia (sigue heredando el Nivel), y que un override explícito (cota de
    Local, altura de Artefacto) se copie tal cual -- sin materializar
    ningún default. No hizo falta código nuevo para esto.
  - **Nombre de la copia:** `Local` no tiene campo `nombre` propio -- el
    título ya es 100% derivado (`etiquetasDeLocales`, numera por tipo y
    posición: "Baño 1"/"Baño 2"). Duplicar un "Baño" simplemente agrega
    otro Local `tipo: 'bano'` al mismo Nivel; el mecanismo YA existente
    renumera ambos automáticamente. Sin campo nuevo, sin "copia" hardcoded,
    sin decisión roja.
  - **M2:** la copia NO hereda `Tramo`, `montanteId`, tee, DN manual ni
    longitud del original -- sus terminales se sincronizan como
    "bootstrap" (mismo camino que un Local recién creado), con Redes
    tomadas de la conectividad DISEÑADA del artefacto original
    (`conectividadElegida`, o la topología real si no hay override
    explícito). `backfillLongitudesDePredimensionamiento` sólo lleva los
    Tramos nuevos a un valor típico, nunca copia el relevamiento real.
  - **Tests:** `duplicarLocalEnNivel.test.ts` (13 casos: duplicación
    simple + posición + repetición + independencia; herencia/overrides;
    multinivel -- copia sólo en el Nivel del original; conectividad física
    de la copia -- válida, sin ids reutilizados, sin montante/DN/longitud
    heredados; recálculo de demanda -- Kc indeterminado con n=1 se
    resuelve al duplicar a n=2). `tests/e2e/duplicar-local.spec.ts` (2
    casos: independencia editando/eliminando artefactos de la copia;
    duplicar dentro de un segundo Nivel). Se corrigió `multinivel.spec.ts`
    (`exact: true` en el selector "Duplicar" de la UF -- ahora ambiguo por
    substring contra "Duplicar local"; sin ese fix rompía un test
    preexistente, detectado corriendo la suite completa antes de cerrar).
    Vitest **1781/1781** (1768 + 13); `tsc -b`/`e2e:typecheck`/`build`
    verdes; ESLint **11/0/0**. E2E `duplicar-local.spec.ts` **4/4**
    desktop+mobile; `multinivel.spec.ts` **14/14** desktop+mobile tras el
    fix del selector.
  - **Estado:** `UI-M1-DUPLICAR-LOCAL-01: CERRADO — pendiente validación
    manual` del usuario sobre el deploy.

- **D-δ.109 — UI-M2-RESP-POLISH-01: jerarquía Local → Red sin nombre
  redundante + re-diagnóstico y corrección real del overflow mobile.**
  Slice exclusivamente presentacional/responsive, sin cambios hidráulicos.
  - **Nombre redundante (`TablaDimensionamientoDeModulo2.tsx`):** las filas
    hijas AF/AC de un Local agrupado repetían su nombre ("Baño 1 · 4
    puntos") pese a que el encabezado de grupo ya lo muestra una vez
    arriba. Cambio puramente de presentación: `entrada.etiqueta` sigue
    intacto (usado por el `aria-label` de Longitud y cualquier otro
    consumidor) -- sólo se omite su render visible en el `<summary>`
    cuando `entrada.grupo !== undefined`. Distribución general/secundaria y
    Segmentos de montante (sin `grupo`) no cambian.
  - **Re-diagnóstico del overflow mobile (hallazgo importante):** el
    overflow documentado en D-δ.107 como causado por `.m2-fila-agrupada`
    era una atribución incorrecta. Investigación en vivo (viewport 390px)
    mostró que `.tabla-scroll` YA contiene correctamente el ancho de la
    tabla de M2 (`overflow-x: auto` funcionando, sin fuga); con el proyecto
    demo puro, M2 solo (sin tocar M1) midió `scrollWidth === clientWidth`
    exacto. La fuga real: `.m1-uf__acciones` (cabecera de UF, con
    "Duplicar"/"+ Agregar nivel"/"Eliminar unidad funcional") no envolvía
    de verdad en mobile -- `flex-wrap: wrap` en el contenedor no alcanzaba
    porque, como flex item de `.m1-uf__cabecera` con `flex: none`, el
    navegador seguía calculando su ancho intrínseco en base a sus 3
    botones en una sola línea. Fix real (dos líneas, dentro del breakpoint
    mobile ya existente): `.m1-uf__acciones { flex-basis: 100% }` (fuerza
    su propia fila completa, mismo patrón ya usado por
    `.m1-uf__meta`/`.m1-uf__resumen`) + `flex-wrap: wrap` en el
    contenedor. El brief original pedía no tocar M1; se consultó al
    usuario con la evidencia y se autorizó extender el alcance
    puntualmente a este wrap CSS (sin tocar lógica ni JSX de M1).
  - **Tests:** `tests/e2e/m2-resp-polish.spec.ts` (4 casos, desktop+mobile):
    padre con nombre una sola vez / hijos sin nombre repetido (Baño y
    Cocina, AF y AC); expandir/contraer sin regresión; reproducción
    exacta del escenario que disparaba el overflow (agregar nivel +
    duplicar UF + ver Tuberías en mobile) verificando
    `scrollWidth === clientWidth`; fila agrupada usable en mobile (pill,
    "N puntos", control expandir/contraer). Se removió el filtro de
    `sin-overflow-horizontal` que `multinivel.spec.ts` tenía como
    workaround del bug mal diagnosticado -- ya no hace falta.
    Vitest **1781/1781** (sin tests nuevos: cobertura 100% E2E, evitando
    tests frágiles de valores CSS exactos); `tsc -b`/`e2e:typecheck`/`build`
    verdes; ESLint **11/0/0**. E2E **8/8** (`m2-resp-polish.spec.ts`) +
    regresión dirigida **52/52** (`multi-uf`/`multinivel`/`montantes`/
    `duplicar-local`/`cotas-heredadas`/`smoke`/`propagacion-a`)
    desktop+mobile contra dev server local.
  - **Estado:** `UI-M2-RESP-POLISH-01: CERRADO — pendiente validación
    manual` del usuario sobre el deploy.

- **D-δ.110 — FIX-M3-RESP-02-ACS-01: cierre de trazabilidad de
  `FIX-RESP-02` (deuda ya resuelta, doc desactualizada).** Investigación
  de causa raíz sin cambios de código de producto. `FIX-RESP-02`
  (overflow del `<select>` de excepción de ACS por UF en M3) se había
  resuelto en D-δ.83 y su regresión (`responsive.spec.ts`) siguió verde
  ininterrumpidamente desde entonces. Sin embargo, D-δ.107 y D-δ.108
  documentaron por separado "`FIX-RESP-02` sigue fallando de forma
  independiente contra dev server local en mobile" como hallazgo
  colateral fuera de alcance, sin volver a verificarlo tras cada slice
  posterior.
  - **ANTES SE CREÍA:** que sobrevivía una regresión M3-específica
    distinta de la ya resuelta en D-δ.83, pendiente de investigar.
  - **CAUSA REAL:** nunca fue el `<select>` de M3 -- ese bug sigue
    resuelto. La app es one-page (M1-M4 comparten el mismo documento): el
    overflow real era, de nuevo, `.m1-uf__acciones` (cabecera de UF de
    M1) sin wrap real en mobile con 3 acciones ("Duplicar"/"+ Agregar
    nivel"/"Eliminar unidad funcional") -- el mismo bug que D-δ.109 ya
    encontró y corrigió bajo el diagnóstico ".m2-fila-agrupada" (ver
    D-δ.109 arriba). Confirmado por bisección real: el test histórico de
    `FIX-RESP-02` ejecutado contra el commit `a18314f` (anterior al fix de
    D-δ.109, `5fc4bba`) reproduce el fallo exacto (`docOverflow` 25px @
    390px, 55px @ 360px) porque su estado mínimo agrega 2 UF extra --
    suficiente para que aparezca "Eliminar unidad funcional" y el header
    de M1 desborde el documento completo, incluida la sección de M3 que
    el test está mirando. Contra el HEAD de este slice (ya con el fix de
    D-δ.109) el mismo test pasa limpio.
  - **FIX:** ninguno de producto -- ya estaba corregido por `5fc4bba`
    (D-δ.109). Se agregó únicamente un test de regresión que cierra la
    trazabilidad end-to-end: nivel + UF duplicada (dispara el header de 3
    acciones) navegando hasta la excepción de ACS de M3, para no depender
    de que alguien vuelva a cruzar a mano los dos hallazgos documentados
    por separado. Verificado por bisección: falla contra `a18314f` (25px
    de overflow) y pasa contra el HEAD actual.
  - **Clasificación:** G (fixture/documentación obsoleta) -- la deuda
    quedó viva en `PENDIENTES-DE-ARQUITECTURA.md`/`ROADMAP.md` pese a
    estar resuelta por otro slice bajo un diagnóstico distinto.
  - **Contrato M3:** sin cambios. CRIT-A34, Table 6, `hfMedidor`, K=1 del
    medidor individual y la integración M3→M2 no se tocaron ni se
    reinterpretaron.
  - **Tests:** +1 caso en `tests/e2e/m2-resp-polish.spec.ts` ("nivel + UF
    duplicada + excepción de ACS en Medidores (FIX-RESP-02 compuesto)").
    Vitest **1781/1781** (sin tests unitarios nuevos: la causa es
    puramente responsive/E2E, ya cubierta); `tsc -b`/`e2e:typecheck`/
    `build` verdes; ESLint **11/0/0** (mismo baseline). E2E dirigido
    **42/42** (`responsive`/`m2-resp-polish`/`multinivel`/`montantes`)
    desktop+mobile contra build local, incluida la regresión histórica
    `FIX-RESP-02` (`responsive.spec.ts`) verde sin ningún workaround.
  - **Riesgo:** Nivel B (test-only, sin cambio de producto).
  - **Estado:** `FIX-M3-RESP-02-ACS-01: CERRADO`.

- **D-δ.111 — UI-M2-MONTANTE-COMPACT-01: compactación del cuerpo
  expandido de Montante.** Slice puramente visual/responsive (Nivel C),
  sin cambios de motor, schema, topología, reconciliación ni cálculo.
  - **Problema:** con el cuerpo del Montante expandido (Nombre + Borrar
    montante en una fila, luego Locales alimentados y Segmentos), la
    tarjeta tenía baja densidad de información -- especialmente notorio
    en mobile con varios montantes.
  - **Cambio:** reordenamiento fijo del cuerpo -- Nombre (sección propia,
    ya no comparte fila con la acción destructiva) → Locales alimentados
    (+ Agregar local) → Segmentos → Derivaciones → **Eliminar montante**
    al final, separado por un borde sutil ("zona de peligro"). Renombre
    "Borrar montante" → "Eliminar montante" para alinear con la
    convención ya usada por M1 (Eliminar nivel/local/unidad
    funcional/artefacto, clase `m1-btn-eliminar`) -- estilo duplicado
    localmente en `constructorDeMontantes.css` (hover de error) en vez de
    importar CSS entre módulos. El `<h4>` de cada sección perdió su
    margin-top redundante (ya separado por el `gap` del contenedor
    flexible). Copy del selector de Local: "+ Agregar local:" →
    "Agregar local:" -- el "+" sugería un botón de confirmar que no
    existe (seleccionar ya agrega directo).
  - **Segmentos en mobile:** investigado, sin bug real. `.tabla-scroll`
    (`overflow-x: auto`) ya contiene el scroll horizontal de forma local,
    sin desbordar el documento (confirmado por el E2E existente "la card
    de montante no desborda la página en viewports angostos" y el nuevo
    test de esta entrada). No se tocó `TablaDimensionamientoDeModulo2`
    (componente compartido con Distribución general/secundaria y las
    secciones de UF) para no ampliar el alcance de este slice.
  - **Harness de fuzz:** `tests/e2e/qa/acciones.ts` buscaba el texto
    "Borrar montante" para la acción `borrarMontante` -- actualizado a
    "Eliminar montante" (si no, esa acción hubiera quedado permanentemente
    no-aplicable en el fuzz).
  - **Funcionalidad:** sin cambios -- mismos callbacks
    (`agregarLocalAMontante`/`quitarLocalDeMontante`/`borrarMontante`/
    `conNombreDeMontante`), sólo reordenados/renombrados en JSX.
  - **Tests:** +3 unitarios (`ConstructorDeMontantes.componente.test.ts`:
    copy "Eliminar montante", orden Nombre→Locales→Segmentos→Eliminar,
    selector sin "+") y +2 E2E (`montantes.spec.ts`,
    `UI-M2-MONTANTE-COMPACT-01`: header intacto + orden real del DOM +
    "Eliminar montante" como último hijo + sin overflow @ 390px;
    eliminar desde el botón reposicionado). Vitest **1784/1784** (1781 +
    3); `tsc -b`/`e2e:typecheck`/`build` verdes; ESLint **11/0/0** (mismo
    baseline). E2E dirigido **52/52**
    (`montantes`/`m2-resp-polish`/`multinivel`/`responsive`/
    `propagacion-a`/`smoke`) desktop+mobile contra build local.
  - **Hidráulica:** sin cambios -- ningún resultado de Qc/DN/V/hf/presión
    se ve afectado; colapsar/expandir/reordenar visualmente no dispara
    `onCambiar`.
  - **Estado:** `UI-M2-MONTANTE-COMPACT-01: CERRADO — pendiente
    validación manual` del usuario sobre el deploy.

- **D-δ.112 — HYD-EST-01: hf estimada por camino (path-aware), en vez de
  agregada por Local/Red basada en Vref máxima terminal.** Slice
  hidráulico (Nivel A) en Módulo 2, modo `Estimadas` únicamente.
  `Detalladas` no se tocó.
  - **Antes:** la pérdida localizada estimada de un Local+Red se calculaba
    **agregada** por `(Local, red)`: `n-1` tees `Ks = 3,00`
    (`teeEntradaCentralSalidasLaterales`, D-δ.40) + una llave de paso
    `Ks = 9,18` + **una sola** singularidad terminal `Ks = 1,35`
    (`codo90`, D-δ.45), TODAS calculadas sobre la velocidad de referencia
    **máxima** (`V_ref`) entre todos los terminales físicos del grupo. Un
    terminal alimentado por un tramo de menor diámetro heredaba la V del
    terminal más desfavorable del grupo, no la propia.
  - **Después:** la pérdida localizada estimada se resuelve **por
    camino**, recorriendo la topología real desde la raíz del Local hasta
    cada terminal físico
    (`resolverPerdidaLocalizadaEstimadaDeCamino.ts`). En cada nodo de
    bifurcación real (1 tramo entrante, 2 salientes) que el camino
    atraviesa se aplica una singularidad de tee, y al final del camino una
    singularidad terminal — cada una con la velocidad REAL del tramo
    propio que la alimenta, no con un `V_ref` agregado del grupo. Los
    coeficientes `Ks` **no cambiaron** (tee `3,00` sin clasificar
    recta/lateral — D-δ.40 sigue firme, no se adoptó el rediseño
    recta/lateral `1,62`/`1,00` que D-δ.90 había diferido a M2-TOPO-01 por
    falta de dato de orientación —; llave de paso `9,18`, una por entrada
    de Local/Red; terminal `1,35`). Lo que cambió es exclusivamente la
    **base de velocidad y la cardinalidad de la singularidad terminal**:
    de "una por Local/Red sobre `V_ref` máxima" a "una por terminal físico
    sobre la V real de su propio tramo de alimentación". Cada singularidad
    pertenece sólo al camino de su terminal: no se traslada a otros
    caminos ni se persiste. `D-δ.45` queda **superado únicamente en la
    cardinalidad y base de velocidad** de la singularidad terminal para
    `Estimadas`; D-δ.90 (el rediseño recta/lateral + transición de DN +
    válvula de rama, bloqueado por falta de topología de orientación)
    **sigue diferido a M2-TOPO-01** y no se revirtió ni se reabrió.
  - **Fan-out 1→N no modelado (`derivacionMultipleNoModelada`):** cuando
    un camino atraviesa una derivación de más de 2 salientes sin tee
    explícita declarada, IUAS **no** infiere una cadena de tees, no usa un
    fallback agregado histórico y no inventa un orden de bifurcación. La
    hf localizada estimada de ese camino, y la presión residual que
    depende de ella, quedan **incompletas** (`⚠ Incompleto`, motivo
    `perdidaLocalizadaEstimadaIncompleta` → `derivacionMultipleNoModelada`
    por tramo no resuelto); el resto de los resultados determinables
    (DN, V, hf **distribuida**, otros Locales/terminales) se siguen
    mostrando con normalidad — no se apaga la sección ni se ensucia con
    un valor ficticio. La topología explícita declarada por el usuario
    (tees / montantes) sigue siendo la única fuente de verdad; un cambio
    de DN **no** implica agregar un accesorio de reducción automáticamente
    (sigue sin inventarse K=0,75 por cambio de diámetro).
  - **No confundir con `Estimadas + Detalladas`:** ambos métodos de
    pérdida localizada siguen siendo mutuamente excluyentes y nunca se
    suman entre sí; `Detalladas` no cambió de comportamiento.
  - **Memoización por UF (`sonPropsDeSeccionDeUnidadFuncionalEquivalentes`):**
    la tarjeta de una UF se invalida cuando la demanda de OTRA UF cambia
    la velocidad de una tee compartida aguas arriba de uno de sus propios
    terminales (dependencia física real); si la UF editada alimenta una
    rama topológicamente independiente de la tarjeta mostrada, ésta NO se
    recalcula. Se conserva la optimización existente — no se volvió a una
    invalidación global por cualquier cambio de UF.
  - **Presión:** `Presidual = Pdisponible − Δz − hfDistribuida −
    hfLocalizada − hfMedidor − hfEquipoACS` sin cambios de fórmula; ahora
    consume la hf localizada por camino. Un camino incompleto por
    fan-out 1→N deja la presión residual de ESE terminal incompleta,
    sin inventar un valor.
  - **Performance:** el recorrido por camino usa el índice topológico e
    índices de tramos entrantes/salientes ya existentes en
    `contextoDeCalculoM2` (precomputados una vez por resolución), sin
    reintroducir una complejidad `O(terminales × tramos²)`.
  - **Fixture nuevo:** `src/pruebas/fixtures/ejemploConBifurcacionesDefinidas.ts`
    — instalación de prueba **separada** del demo (no convierte proyectos
    de usuario ni modifica `proyectoInicial`) con tees explícitas 1→2 y
    tramos propios, usada para ejercitar el modelo path-aware en una red
    físicamente completa sin fan-out 1→N. El demo original (con su
    fan-out histórico) se preserva como caso de regresión del contrato de
    incompletitud.
  - **Baseline transversal (`auditoriaTransversalM1M4.baseline.test.ts`):**
    el proyecto canónico ahora atraviesa `ejemploConBifurcacionesDefinidas`
    — agrega tramos reales a los caminos AF/AC, cambiando la hf
    distribuida y las singularidades por terminal. El margen del crítico
    pasa de −17,664 a −20,164 m.c.a. (sigue NO CUMPLE); M1/M3/M4 y Tabla
    N°1 intactos. Un test dedicado (`HYD-EST: el demo original con
    fan-out conserva M1/M3/M4 y deja M2 incompleto sin presión ficticia`)
    fija el contrato de incompletitud sobre el demo original.
  - **Tests:** Vitest **1797/1797** (subiendo desde el baseline pre-slice
    de 1784/1784); `tsc -b` limpio; `e2e:typecheck` limpio; `build`
    limpio; ESLint sin regresión (11 problemas preexistentes, ajenos a
    este slice — ver deuda de estilo más abajo). E2E dirigido nuevo
    (`tests/e2e/hydEst.spec.ts`, desktop+mobile contra `vite` dev):
    DN↑/DN↓ en un tramo troncal mueve V y hf distribuida monótonamente y
    es reversible; el fan-out 1→N del demo muestra `Incompleto` con
    DN/V/hf distribuida reales, sin `NaN`/`undefined`/`[object Object]`.
    Regresión dirigida existente (`smoke`, `montantes`, `hallazgos`,
    `responsive`) **19/19** verde, sin regresión.
  - **Continuidad de agentes:** slice trabajado en dos sesiones (Codex,
    agotó cuota; Claude continuó). El checkpoint `ac0d839` (Codex) traía
    el motor Estimadas path-aware + integración de presión/UI + 88/88
    tests dirigidos verdes; el trabajo posterior sin commit (memoización
    por UF sensible a tees compartidas + adaptación de baselines/fixtures)
    se auditó archivo por archivo, se confirmó coherente y completo, y se
    corrigió únicamente un valor de snapshot desactualizado
    (`auditoriaTransversalM1M4.baseline.test.ts`, margen del crítico) que
    no reflejaba el nuevo fixture canónico.
  - **Estado:** `HYD-EST-01: CERRADO — pendiente validación manual` del
    usuario y del gate de QA Fuzz cloud / deploy.

**INTERFAZ WEB IUAS: VISUALMENTE CERRADA PARA EL ALCANCE ACTUAL.** UI-01A
+ UI-01B (núcleo) + UI-01C cerrados; core M1–M4 congelado / intacto
(baseline transversal: único cambio numérico documentado en D-δ.79 /
CRIT-A39). Ya no existe deuda visual bloqueante antes de reporting.

**Orden de fases tras el cierre visual:** **DEPLOY-01** (piloto web
`v0.4.0-beta.1`, D-δ.75 — publicado) → **UX-01 / UI-01D** (UF colapsables,
D-δ.76 — `v0.4.0-beta.2`) → **UX-02 / UI-01E** (defaults contextuales +
redes AF/AC, D-δ.77 — `v0.4.0-beta.3`; consolidación FIX P0 +
optimizaciones, D-δ.78 — `v0.4.0-beta.4`) → **UX-03 / HYD-UX-01**
(conectividad explícita + origen rápido de tanque elevado + trazabilidad
Profesional, D-δ.79 — `v0.4.0-beta.5`) → **UX-TEST-01** (NO iniciada:
observación de uso real de terceros; su output prioriza bugs / UX /
contenido / nomenclatura "puntos" de M2 / PERSIST-01) → **REPORT-01** (NO
iniciada).

**REPORT-01 — memoria técnica integral (NO iniciada).** Extender el
generador `pdfMake` actual (hoy esencialmente M1) hacia: Datos del
proyecto · Demanda · Tuberías · Medidores · Abastecimiento y reserva ·
Verificación hidráulica · Metodología y fuentes. Mismo dominio, mismos
resultados, **no** impresión del DOM. Mantiene: core M1–M4 congelado +
arquitectura UI-01A + sistema visual UI-01B/UI-01C.

**Hallazgos de M4-A:**

- **Objeto de cálculo**: el **Volumen de Reserva Diaria requerido**
  (volumen útil, litros). No dimensiona geometría, cota del tanque,
  bombas ni presurización.
- **Método normativo** (§2.10.2, "Alimentación por tanques y
  determinación del Volumen de Reserva Diaria"): balance de caudales —
  déficit `Dc = Qc − Qconexión` cubierto sobre un período de consumo pico
  `T` que el proyectista elige entre 1 h y 4 h. **No** usa población,
  dotación per cápita, dormitorios ni superficie (la dotación 500/350/150
  L/hab·día de §2.9.1.1 es para conjuntos urbanos, no para reserva
  domiciliaria).
- **Input primario**: el `Qc` global del proyecto de M1 (CRIT-A5),
  reutilizado sin reimplementar el pipeline de demanda — igual que
  `resolverEstadoModulo3`.
- **§2.8**: tanque de reserva **obligatorio** para el uso residencial
  dominante de IUAS. Alimentación directa sin reserva sólo para subsuelo
  y planta baja no residencial.
- **§2.11.3**: si hay tanque inferior (cisterna / bombeo), aloja **mínimo
  1/3** de la Reserva Total Diaria; el resto en el elevado.
- **Piezas del repo ya listas**: `tabla-01-gastos-conexion` (§2.7, gasto
  de conexión por DN y presión — sin consumidor todavía),
  `presionSobreAcera_m`, el `Qc` global, el patrón `EstadoModulo3`,
  `resolverModoDeTrabajo` (modo de trabajo transversal, reutilizable).

**Explícitamente fuera de alcance de M4**: geometría/cota del tanque,
catálogo comercial de tanques, topología de múltiples tanques, selección
de bombas, presurizadores, `hfEquipoACS`, reporting PDF de M4.

## Deuda técnica conocida (no bloqueante, registrada explícitamente)

- `docs/adr/` tiene su primer documento real: `ADR-0001` (topología
  hidráulica explícita y semántica de montantes, M2-TOPO-E / D-δ.96).
  `docs/arquitectura/` sigue vacía.
- **Piloto web (DEPLOY-01):**
  - **Sin persistencia.** Los cambios viven sólo en la sesión de la
    pestaña; recargar restablece el proyecto de ejemplo. Insumo directo
    de las pruebas reales; candidato a **PERSIST-01** (autosave local y/o
    export/import JSON) si el feedback lo confirma.
  - **Memoria PDF sólo de Demanda (M1).** El botón lo dice explícito;
    **REPORT-01** extenderá el generador a M1–M4 + Verificación.
  - **Bundle ~2,2 MB (~924 kB gzip)**, dominado por `pdfmake` cargado de
    entrada. Optimización frontend futura (lazy-load), no bloqueante.
  - **Ediciones que revalidan todo el árbol** (~300 ms con proyecto
    grande) son render/DOM, no cálculo. Memoización de filas / trabajo
    incremental si molesta en uso real.
- **Nomenclatura del contador de M2 (UX-02 / UI-01E, subpunto F).** En el
  `<summary>` de cada fila de la tabla de dimensionamiento, "Baño 1 · N
  puntos" cuenta *Artefactos (filas) del Local conectados a esa Red*, sin
  considerar `Artefacto.cantidad`. No se renombró a "artefacto(s)" porque
  (a) sería falso para `cantidad > 1` y (b) contradiría la convención
  "artefactos = suma de cantidades" que D-δ.76 fijó para el resumen de UF
  en M1. Opciones sobre la mesa: mantener "puntos", usar
  "bocas"/"conexiones", o unificar contra M1 (cambiaría el número, lo que
  el brief prohíbe sin tocar topología). A resolver en UX-TEST-01 con
  feedback real de proyectistas.
