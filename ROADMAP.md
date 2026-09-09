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
- navegación de instalación (montantes, agrupación por Local/UF).

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
    `qa-results/seed-20250909_0/`. No se corrige acá (§29).

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

- `docs/adr/` y `docs/arquitectura/` existen como carpetas vacías, sin
  ningún documento real todavía.
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
