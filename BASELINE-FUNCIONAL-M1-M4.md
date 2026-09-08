# Baseline funcional transversal M1–M4 (pre-rediseño)

**Decisión de referencia:** D-δ.70 (`PENDIENTES-DE-ARQUITECTURA.md`).
**Evidencia ejecutable:** `src/auditoriaTransversalM1M4.baseline.test.ts`
(12 casos) + `src/interfaz/paginas/proyectoDeEjemplo.ts` (fixture).
**Estado:** CORE FUNCIONAL M1–M4 CONGELADO PARA REDISEÑO.

Este documento fija, antes de una pasada transversal de UX/UI, el
comportamiento observable del sistema completo: qué produce cada módulo,
cómo se propaga un cambio a través de M1→M2→M3→M4, qué es dato persistido
y qué es resultado derivado, y qué contratos NO puede tocar el rediseño.

Si cualquiera de los números o relaciones de abajo cambia, hay que
actualizar este archivo **y** el test de baseline en el mismo commit.

---

## 1. Snapshot numérico del Proyecto canónico

**Fixture:** `proyectoInicial` (`src/interfaz/paginas/proyectoDeEjemplo.ts`)
— la vivienda unifamiliar de ejemplo que ve el usuario al abrir la app:
1 UF, 5 Locales (baño, cocina, lavadero, toilette, patio), 11 artefactos
normativos, red AF+AC con producción de ACS, modo Rápido
(`simplificada` + pérdidas `estimadas`).

**Perturbaciones aplicadas con los updaters puros reales** para llegar a
un caso rico y determinado:

| Paso | Updater | Valor |
|---|---|---|
| Cota de la raíz de la red | `conCotaDeNodo('n-general', …)` | 20 m (pelo de agua mínimo **manual** — ver nota CRIT-A39) |
| Override de DN comercial | `conDnComercialAdoptadoDeTramo('t-general', …)` | `32 mm` |
| M3 propiedad horizontal | `conPropiedadHorizontal(true)` | — |
| M3 provisión de ACS | `conTipoProvisionACS('individual')` | — |
| M4 esquema | `conEsquemaDeAbastecimiento('tanqueElevado')` | — |
| M4 período de consumo máximo | `conPeriodoConsumoMaximo(2)` | Tc = 2 h |
| M4 DN de conexión | `conDiametroNominalConexion(0.019)` | DN 19 mm |
| M4 presión sobre acera | `conPresionSobreAcera(5)` | 5 m |
| M4 desnivel de conexión | `conDesnivelConexion(0)` | 0 m |
| M4 capacidad adoptada | `conVolumenTanqueElevadoAdoptado(5)` | 5 m³ |

**Resultado del snapshot (todos los valores son DERIVADOS, ninguno se
persiste):**

| Módulo | Magnitud | Valor |
|---|---|---|
| **M1** | Qc global | **0,7273238618 l/s** (exacto, sin redondear) |
| **M2** | Estado | `completo` |
| M2 | Origen hidráulico efectivo | `tanqueElevado` (derivado del esquema M4) |
| M2 | Pdisponible en la raíz | 0 m.c.a. (tanque: la carga la expresa Δz) |
| M2 | Pelo de agua mínimo efectivo | **−0,50 m** (CRIT-A39: modo Rápido → `desnivelConexion_m − 0,50 = 0 − 0,50`; el 20 m manual queda como valor Profesional latente) |
| M2 | Margen del crítico | ≈ **−16,664 m.c.a.** → NO CUMPLE |

> **Nota CRIT-A39 (D-δ.79).** El fixture es modo Rápido (`simplificada`) +
> tanque elevado simple. Antes de CRIT-A39 el pelo de agua mínimo del
> balance era el valor manual de la raíz (20 m) y el margen del crítico era
> **+3,836 m.c.a. → CUMPLE**. CRIT-A39 hace que en ese modo el pelo de agua
> mínimo efectivo se **estime** como `desnivelConexion_m − 0,50 m`. El par
> histórico (pelo manual 20 m / `desnivelConexion_m` 0 m) eran knobs
> independientes y quedó semánticamente inconsistente bajo el nuevo modelo;
> el nuevo margen es **−16,664 m.c.a. → NO CUMPLE**. Es el **único** cambio
> numérico del baseline: M1, M3, M4 y Tabla N°1 quedan byte-idénticos. En
> modo Profesional el balance sigue usando el valor manual.
| **M3** | Estado | `evaluado` |
| M3 | Medidor general — DN recomendado / adoptado | **25 / 25 mm** |
| M3 | Medidor general — hf adoptada | ≈ **1,399 m.c.a.** |
| M3 | Medidores individuales | 1 (PH + ACS individual, 1 UF) |
| **M4** | Estado | `evaluado` / `reservaCalculada` |
| M4 | Presión de cálculo de conexión | **5 m** (= 5 − 0) |
| M4 | Qconexión (Tabla N°1, DN19 @ 5 m) | **0,60 l/s** |
| M4 | Reserva Total Diaria de Diseño | ≈ **0,9167 m³** (déficit real: 0,60 < 0,727) |
| M4 | Adopción (5 m³ vs 0,9167 m³) | `suficiente` |

---

## 2. Matriz de sensibilidad (input → módulos afectados)

Verificada en `auditoriaTransversalM1M4.baseline.test.ts` y en el smoke de
navegador transversal (26/26). `✓` = cambia; `—` = **NO** cambia
(byte-idéntico salvo indicación de ε).

| Cambio de input | M1 (Qc) | M2 (balance) | M3 (medidores) | M4 (RTD / adopción) |
|---|:---:|:---:|:---:|:---:|
| Cantidad / tipo de artefacto | ✓ | ✓ | ✓ (DN ≥) | ✓ (más déficit → más VRTD) |
| DN comercial manual de un Tramo (M2) | — | ✓ (V, hf, presión) | — | — |
| Cota de nodo / longitud / accesorios (M2) | — | ✓ | — | — |
| Medidor general adoptado ↑/↓ (M3) | — | ✓ (sólo si origen = directa) | ✓ | — |
| Medidor individual adoptado (M3) | — | ✓ (terminales de esa UF) | ✓ | — |
| DN de conexión (M4) | — | — | — | ✓ (Qconexión, déficit, VRTD) |
| Tc (M4) | — | — | — | ✓ (VRTD escala ×Tc) |
| Presión sobre acera | — | ✓ **sólo si esquema = directa** | — | ✓ (Pcalc → Qconexión → VRTD) |
| Desnivel de conexión (M4) | — | — | — | ✓ (Pcalc → Qconexión → VRTD) |
| Volumen adoptado (M4) | — | — | — | ✓ (sólo la verificación de adopción) |
| Esquema de abastecimiento | — | ✓ (origen: directa ↔ tanque) | ✓ (aplicabilidad del medidor general a M2) | ✓ (aplica / no aplica reserva) |

**Anti-contaminación demostrada explícitamente:**

- DN comercial de M2 con dos valores distintos → `qcGlobal`, `m3General`
  y `m4Snapshot` **idénticos** (`toEqual`); sólo se mueve el margen de M2
  (y nunca a peor: un DN mayor en la alimentación general no empeora el
  margen del crítico).
- DN de conexión de M4 (0,019 → 0,025 m) → Qc, medidor general y margen
  del crítico de M2 **sin cambio** (`toBeCloseTo(…, 9)`); sólo suben
  Qconexión y baja VRTD.
- Tc (2 → 4 h) → VRTD **×2 exacto**; Qc / M3 / margen de M2 sin cambio.
- Subir el medidor general (M3, ↑) en esquema con tanque → Qc de M1 y
  VRTD de M4 **byte-idénticos**; el margen de M2 tampoco se mueve porque
  el general está aguas arriba del tanque.
- `cisternaBombeoElevado` produce **el mismo** origen que `tanqueElevado`
  (la cisterna y la bomba están aguas arriba del almacenamiento; no son un
  tercer origen terminal). El balance terminal coincide con `tanqueElevado`
  **cuando el pelo de agua mínimo efectivo es el mismo**; con el fixture
  canónico (modo Rápido, `desnivelConexion_m = 0`) divergen porque CRIT-A39
  estima el de `tanqueElevado` (−0,50 m) y `cisternaBombeoElevado` conserva
  el manual (20 m).

---

## 3. Fronteras entre módulos

Ningún `resolverEstadoModuloX` importa a otro. La composición es siempre
hacia primitivas compartidas de nivel inferior, y **el cableado
cruzado M3→M2 y M4→M2 vive en la capa `interfaz/paginas`**, no en
`motor/`.

| Frontera | Dirección | Contrato | Quién lo cablea |
|---|---|---|---|
| **M1 → M2** | Qc global alimenta el dimensionamiento | `calcularSimultaneidad(...).resultados['qc']`; M2 nunca reimplementa la fórmula de simultaneidad ni usa Qc redondeado | `motor/modulo2/resolverEstadoModulo2` compone `motor/demanda` (vía las primitivas de tuberías) |
| **M1 → M3** | Qc global → medidor general; `Qunit = Σ cantidad·qu` (K = 1) → individuales | `motor/modulo3/resolverEstadoModulo3` compone `calcularSimultaneidad` + `motor/medidores/*` | idem |
| **M1 → M4** | Qc global → déficit → VRTD | `motor/modulo4/resolverEstadoModulo4` compone `calcularSimultaneidad` + `motor/reserva/calcularReservaDiaria` | idem |
| **M3 → M2** | Pérdida de medidores aplicable por terminal | `resolverPerdidasDeMedidoresParaTerminal({ estadoModulo3, configuracionMedidores, unidadFuncionalIdDelTerminal, redDelTerminal, origenHidraulico })` → `number \| undefined`; `undefined` deja el balance del terminal `incompleto`, **nunca fabrica 0** | `PanelDePresionDeModulo2.tsx` (función `hfMedidorDeTerminal`) |
| **M4 → M2** | Origen hidráulico efectivo | `resolverOrigenHidraulicoEfectivo(esquema)` → `'directa' \| 'tanqueElevado'`; `directa` → Pdisponible = `presionSobreAcera_m`; tanque/cisterna → Pdisponible = 0 | `PanelDePresionDeModulo2.tsx` |
| **M4 → M3** | Aplicabilidad del medidor general al camino de M2 | mismo `resolverOrigenHidraulicoEfectivo`: `directa` → general EN el camino; tanque/cisterna → general aguas arriba, fuera | `PanelDePresionDeModulo2.tsx` |

Lo que **NO** cruza ninguna frontera:

- M2 no conoce Tabla N°6, C, ni el DN del medidor (sólo recibe un `hf`).
- M3 no conoce el balance de presión profundo ni la selección del
  terminal crítico.
- M4 no aporta `Pcalc`, Qconexión, VRTD ni presión de bomba al balance
  terminal de M2. `desnivelConexion_m` alimenta Tabla N°1 (Pcalc) y, en
  modo Rápido + tanque elevado simple, la estimación del pelo de agua
  mínimo efectivo del balance de M2 (CRIT-A39, vía
  `resolverEntradasDeVerificacion`); `motor/modulo2/**` sigue sin importar
  nada de `motor/modulo4`.
- `motor/tuberias/**` y `motor/modulo2/**` no importan nada de
  `motor/modulo4` / `tabla-01-gastos-conexion` / `motor/reserva`
  (verificado por `grep`; también en D-δ.68).

---

## 4. Persistencia: dato del usuario vs resultado derivado

**Fuente única de verdad = una sola propiedad persistida en `Proyecto`;
sin ningún input local/oculto que la duplique.** Todo el estado de la
aplicación vive en un único `useState<Proyecto>` en `MotorDemandaPantalla`;
los paneles de M1/M2/M3/M4 **no tienen ningún `useState`, `useEffect` ni
estado derivado** — son funciones puras de `(proyecto, catálogos)` con un
callback `onCambiar`.

### 4.1 Datos persistidos (decisiones del usuario)

| Dato | Vive en | Editable en | Consumidores |
|---|---|---|---|
| Artefactos / cantidades / tipo | `Proyecto.unidadesFuncionales[].locales[].artefactos[]` | Panel M1 | M1, M2, M3, M4 |
| Tipología de proyecto (`a`) | `parametros.tipoDeProyecto` | "Datos del proyecto" | M1 (y por cascada M2/M3/M4) |
| Cota hidráulica de referencia por UF | `unidadesFuncionales[].cotaHidraulicaReferencia_m` | Panel M2 (Rápido) / M1 | M2 (cota efectiva del terminal en Rápido) |
| Método de pérdida / granularidad / material / sistema | `configuracionHidraulica` | toggle Rápido/Profesional + selectores M2 | M2 |
| Topología (nodos, tramos, red AF/AC) | `redHidraulica` | edición de conectividad M1/M2 | M2, M3 |
| Longitud / accesorios / cota de nodo por tramo | `redHidraulica.tramos[]` / `.nodos[]` | Panel M2 | M2 |
| **DN comercial adoptado por tramo** | `redHidraulica.tramos[].dnComercialAdoptado` | Panel M2 (↑/↓/Auto) | M2 (sustituye al automático; nunca toca Qc) |
| M3: PH, provisión de ACS (global y por UF) | `configuracionMedidores` | Panel M3 | M3 (y M2 vía hf de medidores) |
| **M3: DN de medidor adoptado** (general / individual) | `configuracionMedidores.medidorGeneralAdoptadoDN` / `medidoresIndividualesAdoptadosDN` | Panel M3 (↑/↓/Auto) | M3 (hidráulicamente efectivo: DN→C→hf) |
| **Esquema de abastecimiento** | `configuracionAbastecimiento.esquema` | Panel M4 | M4 + origen de M2 + aplicabilidad del general en M3→M2 |
| Presión sobre acera | `parametros.presionSobreAcera_m` | Panel M4 (en `directa` **y** en esquemas con tanque) | M4 (Tabla N°1) + M2 (Pdisponible, sólo en `directa`) |
| DN de conexión | `parametros.diametroNominalConexion_m?` | Panel M4 | M4 (Tabla N°1) |
| Desnivel de conexión (firmado) | `parametros.desnivelConexion_m?` | Panel M4 | M4 (Pcalc) + M2 en modo Rápido + tanque elevado simple (pelo de agua mínimo efectivo, CRIT-A39). |
| Tc (período de consumo máximo) | `configuracionAbastecimiento.periodoConsumoMaximo_h?` | Panel M4 | M4. `directa` lo descarta a propósito (D-δ.63 §7/§23). |
| Capacidades adoptadas | `configuracionAbastecimiento.volumenTanque{Elevado,Bombeo}Adoptado_m3?` | Panel M4 | M4 (sólo la verificación de adopción) |
| Pdisponible / hfMedidor manuales | **ya no existen** (D-δ.68 retiró el input local; se derivan) | — | — |

### 4.2 Resultados derivados (recalculados en cada render, nunca persistidos)

Qc y toda la cadena de demanda; DN comercial automático, V, J, hf
distribuida y localizada; presión residual, margen, terminal crítico,
`EstadoModulo2`; medidor recomendado, C, hf, alcances, `EstadoModulo3`;
Qconexión, Pcalc, déficit, VRTD, tercios de §2.11.3, estado de adopción,
`EstadoModulo4`; origen hidráulico efectivo.

### 4.3 Estado local de React

- `MotorDemandaPantalla`: `useState<Proyecto>` (la única fuente de verdad)
  + `useState<{ artefactoIdCatalogo }>` para el modal transitorio de
  declaración de artefacto de catálogo. **Nada más.**
- Paneles M1/M2/M3/M4 y subcomponentes: **cero** `useState` / `useEffect`
  / `useRef` / `useMemo`. `useId` en dos selectores (sólo para `htmlFor`).

**Consecuencia para el rediseño:** una sidebar que oculte/reordene
secciones **no puede perder ninguna decisión del usuario**, porque ningún
dato editable vive en estado local de un panel. El remontaje condicional
es seguro. (Preferencia de diseño mantenida: todos los módulos montados +
sidebar como índice/scroll.)

---

## 5. Estados de módulo — cómo conviven

No existe un `EstadoGlobalProyecto`; cada módulo resuelve el suyo y la
one-page los muestra en paralelo. Combinaciones legítimas verificadas:

- **M3 `noIniciado` + M2 dimensionando**: M2 mantiene topología y
  dimensionamiento; el balance de cada terminal queda `incompleto`
  (hfMedidor `undefined`), nunca `completo` con hf 0.
- **M4 `noIniciado` + M1/M2/M3 válidos**: M2 dimensiona; la verificación
  de presión queda `incompleto` por origen no determinado, con un mensaje
  que orienta a configurar el Módulo 4. No se degrada M1/M3.
- **M4 `incompleto` (esquema conocido, falta Tc/DN/desnivel) + M2**: M2
  ya conoce el origen (deriva del esquema), independientemente de que
  `EstadoModulo4` sea `evaluado`.
- **Proyecto pre-M3/M4** (sin `configuracionMedidores` ni
  `configuracionAbastecimiento`): carga y valida; M1/M2 funcionan; M3 y
  M4 `noIniciado`; sin migración destructiva.

`EstadoModuloX` de cada módulo distingue siempre `error` estructural (dato
persistido inválido) de `incompleto` de cálculo (falta un insumo) de
resultado `evaluado`/`completo` que **no** implica cumplimiento normativo.

---

## 6. Dependencias e higiene de imports

- **motor entre módulos**: 0 imports cruzados entre `motor/modulo2`,
  `motor/modulo3`, `motor/modulo4`, `motor/demanda`, `motor/reserva`,
  `motor/medidores`. Cada `resolverEstadoModuloX` compone primitivas
  compartidas (`demanda`, `tuberias`, `medidores`, `reserva`).
- **UI en motor**: 0 en código de producción. Un único test
  (`verificacionTerminalCriticoPorUF.aceptacion.test.ts`) importa
  `calcularCotaHidraulicaDefaultDeNivel` desde `interfaz/paginas/` para
  una constante normativa — acoplamiento de test, bajo riesgo, candidato
  a mover la constante a `normativa/`.
- **Fórmulas hidráulicas en React**: los paneles sólo formatean y componen
  resolvers; no reimplementan fórmulas. `PanelDePresionDeModulo2` replica
  la *derivación de borde* (origen → Pdisponible → hf por terminal), no
  la hidráulica.
- **PDF** (`exportadores/pdf/generarDocumentoPdf`, pdfMake programático):
  hoy sólo cubre Módulo 1. No lee el DOM. No reimplementa fórmulas de
  demanda: consume el `ResultadoDeCalculo` real de M1. Incorporar M2/M3/M4
  al informe es trabajo futuro (deuda de reporting).

---

## 7. Contratos CONGELADOS para el rediseño

El rediseño de UI puede **envolver** estos contratos; **no** puede
reescribirlos salvo bug inequívoco o decisión roja explícita.

- **Tipos de dominio**: `Proyecto`, `ParametrosProyecto`,
  `ConfiguracionHidraulica`, `ConfiguracionDeMedidores`,
  `ConfiguracionDeAbastecimiento`, `RedHidraulica` / `Nodo` / `Tramo`.
- **Orquestadores de estado**: `calcularSimultaneidad`,
  `resolverEstadoModulo2`, `resolverEstadoModulo3`,
  `resolverEstadoModulo4` y sus tipos de retorno (`EstadoModuloX`,
  `ResultadoModuloX`).
- **Motores puros**: `calcularReservaDiaria`, `resolverGastoTabla01`,
  `resolverPresionDeCalculoDeConexion`, `resolverPresionResidualDeCamino`,
  `resolverTerminalMasDesfavorable`, `seleccionarMedidor*`,
  `resolverPerdidasDeMedidoresParaTerminal`.
- **Mapeos**: `resolverOrigenHidraulicoEfectivo` (fuente única del origen
  de M2); `directa` → Pdisponible = `presionSobreAcera_m` sin restar
  desnivel.
- **Updaters puros** (la superficie que la UI usa para persistir
  decisiones): `actualizarConfiguracionAbastecimiento.*`,
  `actualizarParametrosDeConexion.*`, `actualizarConfiguracionMedidores.*`,
  `actualizarConfiguracionHidraulica.*`, `actualizarRedHidraulica.*`,
  `duplicarUnidadFuncionalEnProyecto`, `quitarConectividadFisica*`,
  `reconciliarConectividadFisicaPorCambioDeArtefacto`.
- **Criterios**: CRIT-A5, A15, A23, A25, A30..A38 y el resto de
  `src/normativa/eras-2023/CRITERIOS.md` marcados como firmes.
- **Reglas de "no fabricar"**: dato ausente ⇒ `undefined` / estado
  `incompleto`, nunca 0; resultado insuficiente ⇒ estado de adopción, no
  error estructural; módulo `noIniciado` ⇒ no bloquea a los demás.

---

## 8. Superficies que SÍ puede cambiar el rediseño

Wrappers, layout, jerarquía visual, headings, cards, tablas, disclosure,
sidebar/índice, sticky summary derivado, humanizers
(`humanizarModulo2/3/4`), composición y orden visual de la one-page,
responsive, ayuda contextual, textos. Todo sin tocar dominio.

Un **sticky summary global** (Estado M1/M2/M3/M4 + terminal crítico +
RTD) es viable con los resolvers actuales: no requiere ningún cálculo
nuevo, sólo leer los cuatro `EstadoModuloX`.

---

## 9. Deudas registradas (no bloquean el congelamiento)

| Deuda | Detalle |
|---|---|
| `parametros.alturaArtefactoMasDesfavorable_m` | Campo **requerido** en el modelo y en el proyecto de ejemplo, **sin ningún consumidor** en `motor/` (residuo previo al modelo de cota por terminal, D-δ.38/46). Candidato a eliminar en el rediseño del modelo. |
| Constante normativa en `interfaz/` | `calcularCotaHidraulicaDefaultDeNivel` vive en `interfaz/paginas/nivelUnidadFuncional.ts` y la importa un test de `motor/`. Mover a `normativa/`. |
| Reporting M2–M4 en el PDF | La memoria pdfMake sólo cubre M1. Diseñar el informe M1–M4 como segunda presentación del **mismo** dominio (no imprimir DOM, no duplicar cálculos). |
| Panel M3 en `incompleto` | Muestra motivos pero no los medidores `parcial` que M2 sí consume. |
| Poda de overrides de medidor huérfanos | Un round-trip ACS central↔individual con override de DN reactiva el override al reaparecer el alcance (valor = decisión previa del propio usuario; no rompe). |
| Deudas normativas ya listadas en M4-H | auto-derivación geométrica del desnivel; §2.8 automático; secciones de tanques ≥ 4.000 L; geometría / bombas / presurizadores; catálogo comercial. |
| Tabla N°8 / rango `> 40 m³/h` de medidores; CRIT-A8 en B2b | refinamientos sin caso real detectado. |

---

## 10. Conclusión

El Proyecto canónico atraviesa M1→M2→M3→M4 con estado coherente; los
cambios transversales propagan por las fronteras correctas y **sólo** por
esas; no hay estado fantasma en round-trips de esquema ni de cantidad; no
hay contaminación cruzada (cada frontera mueve exactamente los módulos
que debe y deja a los demás byte-idénticos); backward compatibility
intacta; validaciones que separan estructura de suficiencia; una única
fuente de verdad por dato, sin inputs locales ocultos; dependencias sin
ciclos y sin UI en el motor; suite completa verde (1221/1221), `tsc` /
`build` verdes, lint sin regresión; smoke de navegador transversal 26/26
con consola limpia; manifests intactos.

**CORE FUNCIONAL M1–M4: CONGELADO PARA REDISEÑO.** Los cambios futuros de
UI no deben modificar los contratos de dominio del §7 salvo bug
inequívoco o decisión roja explícita y registrada.
