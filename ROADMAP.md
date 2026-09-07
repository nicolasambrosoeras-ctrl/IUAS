# Roadmap — IUAS

Visión estructural por hitos/capacidades, no un cronograma temporal. No
contiene fechas. Organizado por bloques de capacidad, con dependencias
explícitas cuando existen; el orden entre subbloques de un mismo módulo
no está fijado salvo que se indique lo contrario.

Para el detalle técnico exacto de cada pieza ya implementada, ver
`RESUMEN-CONTINUIDAD-M2.md`. Para decisiones de arquitectura pendientes,
ver `PENDIENTES-DE-ARQUITECTURA.md`.

## Estado actual

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
- con `hfMedidor` provisto por el Panel de Presión, el balance ya alcanza
  `balanceCompleto` en la práctica (verificado end-to-end por Playwright);
  el resto de Tabla N°7 en modo detallado sigue con su barrera de
  cobertura parcial correcta.

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
`sincronizarConectividadFisicaDeArtefacto`/`quitarConectividadFisicaDeArtefacto`
(`interfaz/paginas/`), apoyados en `hallarNodoDeInsercionDeLocal` y
`determinarRedesFisicasPorPrecedente` (`motor/tuberias/topologia/`). Sin
ningún concepto nuevo de "cabecera" persistida — el punto de inserción se
deriva de la topología existente en cada llamada. Aditivo/no destructivo:
nunca modifica `longitud_m`/`cota_m`/`accesorios` ya cargados, nunca
elimina infraestructura compartida del Local.

**Pendiente:**

- primera instancia de un `artefactoId` de catálogo sin ningún precedente
  en el proyecto (conectividad física no determinable sin inferir desde
  catálogo, lo que violaría CRIT-A15) — queda funcionalmente creada pero
  sin conexión física, señalada por S1/S2 como hoy;
- sincronización al **cambiar el tipo** de un artefacto ya creado
  (`artefactoId` vía `<select>`) — mecánicamente separable, reutilizaría
  la misma función de alta;
- reconciliación general Proyecto ↔ `redHidraulica` para el resto de
  mutaciones (más allá de alta/baja de Artefacto individual).

#### M2-E — UX final

- presentación definitiva de resultados (la tabla actual es
  explícitamente transitoria);
- diagnósticos, errores y advertencias con mejor trazabilidad;
- navegación de instalación (montantes, agrupación por Local/UF).

#### Documentación / exportación

- memoria de cálculo de M2;
- integración con el PDF existente;
- trazabilidad normativa completa en el exportable.

## Deuda técnica conocida (no bloqueante, registrada explícitamente)

- `docs/adr/` y `docs/arquitectura/` existen como carpetas vacías, sin
  ningún documento real todavía.
