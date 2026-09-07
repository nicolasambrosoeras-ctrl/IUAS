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
- ~~sincronización al **cambiar el tipo** de un artefacto ya creado~~ —
  RESUELTO en D-δ.52 (`reconciliarConectividadFisicaPorCambioDeArtefacto`:
  reconciliación AF/AC por conjuntos de Redes, reutilizando bootstrap/
  retrofit/hermano de D-δ.49);
- reconciliación general Proyecto ↔ `redHidraulica` para el resto de
  mutaciones (más allá de alta/baja/cambio-de-tipo de Artefacto individual).

#### M2-E — UX final

- presentación definitiva de resultados (la tabla actual es
  explícitamente transitoria);
- diagnósticos, errores y advertencias con mejor trazabilidad;
- navegación de instalación (montantes, agrupación por Local/UF).

#### Documentación / exportación

- memoria de cálculo de M2;
- integración con el PDF existente;
- trazabilidad normativa completa en el exportable.

### Fase 2 / Módulo 3 (Medidores) — en curso

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

**Pendiente:**

- **Tabla N°8** (Anexo A de la Guía, ampliación de rango de Qc) — es una
  lámina no transcripta; se incorpora si aporta umbrales por encima de los
  40 m³/h de Tabla N°6;
- **M3-E** — integración `hfMedidor` M3→M2: reemplazo del input provisional
  del Panel de Presión por el resultado de M3, como DTO
  `{ general?, individuales: [...] }` (una UF puede tener más de un ramal
  medido; cada individual declara alcance suficiente para decidir si
  pertenece al camino de un terminal); puede requerir cerrar antes el
  origen hidráulico (D-δ.36/D-δ.38);
- **M3-F** — auditoría end-to-end (demanda → tuberías → medidor → presión
  recalculada, sin valores stale, sin dependencia circular).

## Deuda técnica conocida (no bloqueante, registrada explícitamente)

- `docs/adr/` y `docs/arquitectura/` existen como carpetas vacías, sin
  ningún documento real todavía.
