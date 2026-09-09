# QA-FUZZ-01 — Harness de testing secuencial (Playwright)

> D-δ.80. Infraestructura **persistente** para detectar de forma sistemática
> crashes, pantallas blancas, estados stale, excepciones y combinaciones
> inválidas de UI en IUAS. **No corrige bugs de dominio**: los captura,
> reproduce y documenta.

---

## 1. Propósito

Durante uso manual real de `v0.4.0-beta.5` se observaron pantallas blancas
completas aparentemente dependientes de secuencia (agregar Bañera → AF+AC;
cambiar M3/ACS a central). El objetivo de este harness es **descubrir la
secuencia reproducible** de fallos así, sin asumir causa.

Qué hace:

- ejecuta acciones de usuario reales (click / fill / selectOption / teclado —
  nunca `page.evaluate(setState)`);
- genera secuencias pseudoaleatorias **reproducibles por seed**;
- comprueba **invariantes después de cada acción**;
- detecta pantalla blanca, `pageerror`, `console.error`, DOM roto, valores
  rotos visibles (`NaN`/`undefined`/`[object Object]`…), ids internos
  (`uf-<uuid>`), códigos internos de validación, overflow horizontal global;
- ante un fallo guarda seed + secuencia mínima + trace + screenshot +
  `console.txt` + `pageerror.txt` + `failure.json`.

Qué **no** hace: no toca hidráulica, ni CRIT, ni la UX de negocio; no
implementa ErrorBoundary (`DEFENSE-01`); no corrige *en la misma corrida*
los bugs que encuentra — cada hallazgo se documenta y se cierra en su
propio slice (`FIX-RESP-01/02`, `CAT-CONN-01`, `FIX-LEAK-01`, `FIX-LEAK-02`,
`FIX-CRASH-01` — todos cerrados; queda `DEFENSE-01`, ErrorBoundary raíz).

---

## 2. Arquitectura

```
playwright.config.ts            baseURL, proyectos desktop/mobile, trace/screenshot
tsconfig.e2e.json              type-check del harness (aparte de `tsc -b`)
tests/e2e/
  smoke.spec.ts                camino feliz determinista por las 5 secciones
  catalogo-conectividad.spec.ts asevera la matriz CAT-CONN-01 de los 16 artefactos
  sequence-fuzz.spec.ts        fuzz reproducible por seed
  crash-observado.spec.ts      escenarios A/B/C construidos a mano (brief §26)
  hallazgos.spec.ts            regresiones de hallazgos del fuzz (test.fail mientras el bug está abierto)
  responsive.spec.ts           regresión FIX-RESP-01 / FIX-RESP-02 (sin overflow horizontal @ 390/360/desktop)
  qa/
    prng.ts        mulberry32 determinista + helpers (peso, barajar). Sin deps.
    seed.ts        resolverSeedBase(env) PURO (QA-CI-01): explícita o fallback fijo
    tipos.ts       tipos serializables compartidos (AccionRegistrada, InfoDeFallo…)
    deteccionBlanco.ts   función PURA de veredicto de pantalla blanca
    tokensProhibidos.ts  funciones PURAS de detección de basura en la UI
    errores.ts     RecolectorDeErrores (console/pageerror/requestfailed)
    invariantes.ts capa Playwright: toma muestra del DOM y aplica los predicados
    acciones.ts    catálogo de acciones M1–M4 + GLOBAL, con precondiciones
    generador.ts   núcleo puro de elección por peso + loop siguientePaso()
    estado.ts      cargar app limpia / esperar lista / estabilizar
    reporte.ts     escritura de artifacts y de la matriz de catálogo
    fixtures.ts    test.extend (errores, baseURLEfectiva) + clasificarFallo
    *.test.ts      unit tests (Vitest) del PRNG, detector, tokens, generador
.github/workflows/qa-fuzz.yml  workflow_dispatch + schedule nocturno
```

Los módulos `qa/*.ts` que son **puros** (`prng`, `tipos`, `deteccionBlanco`,
`tokensProhibidos`, y el núcleo de `generador`) no importan Playwright en
runtime, así sus unit tests corren en Vitest/Node. Los specs de Playwright
(`tests/e2e/*.spec.ts`) están **excluidos** de Vitest (ver
`vite.config.ts` → `test.include`).

---

## 3. Cómo correr

### Local contra la beta pública (default)

```bash
npm run e2e                     # todos los specs, desktop + mobile
npm run e2e:smoke               # sólo smoke
npm run e2e:catalogo            # sólo matriz de catálogo (desktop)
npm run e2e:fuzz                # sólo sequence fuzz
npm run e2e:crash               # escenarios observados
npx playwright show-report      # abre el reporte HTML del último run
```

### Local contra el dev server (recomendado para un fix sin deployar)

```bash
npm run dev                     # vite dev, base '/', http://localhost:5173/
IUAS_BASE_URL=http://localhost:5173/ npm run e2e
```

> **Nota infra (D-δ.86 / D-δ.87):** el flujo `IUAS_PREVIEW=1` está **roto**
> con la config actual. `vite.config.ts` fija `base: '/IUAS/'` sólo cuando
> `command === 'build'`; `vite preview` resuelve la config con
> `command !== 'build'`, así que sirve en la raíz (`/`) mientras el
> `index.html` del build referencia `/IUAS/assets/…` → los assets dan
> fallback SPA y `#root` queda vacío. Hasta arreglar eso, la verificación
> E2E local de un cambio no deployado se hace contra `vite` dev
> (`IUAS_BASE_URL=http://localhost:5173/`), que sí funciona. CI y el flujo
> por defecto apuntan a producción, no afectados.

### Unit tests del harness (parte de la suite Vitest)

```bash
npx vitest run tests/e2e/qa    # PRNG determinista, detector, tokens, generador
npx vitest run                 # suite completa (core + harness)
npm run e2e:typecheck          # type-check del harness (no entra en `tsc -b`)
```

---

## 4. Variables de entorno

| Variable            | Default                                   | Efecto |
| ------------------- | ----------------------------------------- | ------ |
| `IUAS_BASE_URL`     | `https://nicolasambrosoeras-ctrl.github.io/IUAS/` | URL objetivo. Se le agrega `/` final si falta. |
| `IUAS_PREVIEW`      | —                                         | `=1` fuerza `http://localhost:4173/IUAS/` y levanta `npm run preview`. |
| `IUAS_FUZZ_SEED`    | `424242` (fallback local fijo)            | Seed base del fuzz. Explícita ⇒ reproducible. Sin ella: fallback estable local; en CI la resuelve el workflow (ver §5). |
| `IUAS_FUZZ_RUNS`    | `10`                                      | Cantidad de runs (cada uno parte de app limpia). |
| `IUAS_FUZZ_STEPS`   | `20`                                      | Pasos por run. |
| `IUAS_FUZZ_MAX_STEP`| `= STEPS`                                 | Acota los pasos (para acotar un fallo por bisección). |

---

## 5. Reproducibilidad por seed

El PRNG es **mulberry32** (`qa/prng.ts`), 32 bits de estado, sin
dependencias. Nunca se usa `Math.random()`.

- La seed base se resuelve con `resolverSeedBase(process.env.IUAS_FUZZ_SEED)`
  (`qa/seed.ts`) — **función determinista del environment**: con
  `IUAS_FUZZ_SEED` explícita se usa tal cual; sin ella, fallback local
  **fijo** `424242`. **Nunca** se genera durante el import a partir de una
  fuente mutable (`Date.now`, `process.pid`, random, `crypto`): eso rompía
  el *discovery* de Playwright (QA-CI-01, ver §12).
- La seed de cada run es `` `${seedBase}:${run}` `` (texto → uint32 vía
  FNV-1a).
- **Misma seed ⇒ misma secuencia de acciones** (`qa/prng.test.ts`,
  `qa/generador.test.ts`, `qa/seed.test.ts`).
- **En CI**, cuando el `workflow_dispatch` no recibe `seed`, el paso
  «Resolver seed de QA fuzz» del workflow genera **una sola** seed a partir
  de `GITHUB_RUN_ID`-`GITHUB_RUN_ATTEMPT` (estable dentro del job, distinta
  entre runs), la escribe en `$GITHUB_ENV` como `IUAS_FUZZ_SEED` y la deja
  en el *step summary* (`QA fuzz seed base: <valor>`). Todos los procesos
  de Playwright (coordinator + workers) heredan la misma.
- Cada acción registra la elección concreta del PRNG (`valor`, `detalle`),
  de modo que el `actions.json` es legible y no depende de volver a sortear.

### Replay exacto

```bash
IUAS_FUZZ_SEED=<n> IUAS_FUZZ_RUNS=1 IUAS_FUZZ_STEPS=<n> npm run e2e:fuzz
# acotar al paso sospechoso:
IUAS_FUZZ_SEED=<n> IUAS_FUZZ_RUNS=1 IUAS_FUZZ_STEPS=30 IUAS_FUZZ_MAX_STEP=17 npm run e2e:fuzz
```

El replay canónico es **seed + steps**. `qa/generador.ts` incluye además
`reproducirSecuencia()` para re-aplicar un `actions.json` concreto
(best-effort por `tipo`).

---

## 6. Acciones (por módulo)

Cada acción tiene `aplicable(page)` (precondición real, **sin efectos
secundarios**) y `ejecutar(ctx)` (interactúa como usuario y devuelve una
`AccionRegistrada` serializable). Selectores semánticos: `getByRole` /
`getByLabel` / `getByText` con scope. No hay `data-testid` en la app y no
se agregaron.

- **M1 (Demanda):** irADemanda · agregarUF · duplicarUF · alternarColapsoUF ·
  agregarLocal · cambiarTipoLocal · cambiarRegimenLocal · agregarArtefacto ·
  seleccionarArtefactoDeBorrador · cambiarTipoArtefacto ·
  cambiarCantidadArtefacto · eliminarArtefacto · eliminarLocal · eliminarUF ·
  **resolverConectividad** (AF / AC / AF+AC / Cancelar).
- **M2 (Tuberías):** irATuberias · cambiarModoDeTrabajo (Rápido/Profesional) ·
  cambiarPerdidaDistribuida (Hazen/Darcy) · cambiarPerdidaLocalizada
  (Estimadas/Detalladas) · cambiarGranularidad (Simplificada/Profesional) ·
  cambiarMaterialTuberia · expandirFilaDeTabla · ajustarDnTramo (↓/↑/Auto) ·
  editarLongitudTramo.
- **M3 (Medidores):** irAMedidores · iniciarModulo3 ·
  alternarPropiedadHorizontal · **cambiarProvisionACS** (individual/central) ·
  cambiarExcepcionACSporUF · ajustarDnMedidor.
- **M4 (Abastecimiento):** irAAbastecimiento · elegirEsquemaInicial ·
  alternarEsquemaM4 · editarPeriodoConsumoMaximo (`'' / 1 / 2 / 4 / 6`) ·
  cambiarDnConexion · editarPresionSobreAcera (`4 / 12 / 20`) ·
  editarDesnivelConexion (`0 / 5 / 10 / -2`) · editarVolumenAdoptado.
- **GLOBAL:** navegarASeccion · cambiarHashDeSeccion · cambiarViewport
  (1280×900 / 390×844 / 360×800) · recargarPagina.

### Pesos (brief §21)

Distribución **no uniforme**: más peso a zonas sospechosas —
`resolverConectividad` (10), `cambiarProvisionACS` (10), `iniciarModulo3`
(8), `agregarArtefacto` / `cambiarTipoArtefacto` (6),
`cambiarModoDeTrabajo` (5), `alternarPropiedadHorizontal` (5),
`elegirEsquemaInicial` / `alternarEsquemaM4` (6), `duplicarUF` (4). El resto
conserva peso 1–4. Un unit test verifica que las zonas calientes pesan más
que la media.

---

## 7. Invariantes (después de cada acción)

| Nombre | Qué comprueba |
| ------ | ------------- |
| `pantalla-no-blanca` | root presente + ≥3 nodos + ≥40 car. útiles + marcador `IUAS` + navegación reconocible + alto de contenido ≥80 px (caso móvil). |
| `sin-pageerror` | ninguna excepción no atrapada nueva. |
| `sin-console-error` | ningún `console.error` nuevo (se filtra ruido: favicon, React DevTools). |
| `sin-request-esencial-fallido` | ningún 4xx/5xx ni `requestfailed` en documento/script/stylesheet o `/assets/*.js|css`. **NETWORK**. |
| `sin-valores-rotos` | no aparece `NaN`/`Infinity`/`undefined`/`null`/`[object Object]` como valor (con guardas contra prosa técnica y subcadenas). |
| `sin-ids-internos-visibles` | no aparece `uf-<uuid v4>` / `local-<uuid>` / `artefacto-<uuid>` (los ids legibles del ejemplo `local-bano` NO cuentan). |
| `sin-codigos-de-validacion-visibles` | no aparece un código camelCase interno (`redHidraulicaTramo…`, `configuracion…Invalido`, `proyecto…Ausente`…). |
| `sin-overflow-horizontal` | `documentElement.scrollWidth ≤ clientWidth + 2` en el viewport actual. |
| `demanda-sigue-viva` (condicional) | si `#demanda` sigue presente, no debe faltar a la vez el Qc y el bloque de bloqueo — un error downstream no apaga M1. |

### Detector de pantalla blanca (`qa/deteccionBlanco.ts`)

Función **pura** `evaluarPantalla(muestra)`: la capa Playwright arma la
muestra con `page.evaluate` (root, nodos, texto útil, marcador IUAS,
navegación, alto pintado) y la decisión se prueba en Vitest con "DOM
simulado" = objeto plano (sin jsdom, sin botón secreto en producción —
brief §53).

### Hallazgos conocidos

`qa/invariantes.ts` → `HALLAZGOS_CONOCIDOS`: bugs de app **ya reproducidos y
documentados** (con deuda abierta). Se excluyen de las invariantes **sólo**
para que el fuzzer siga avanzando y encuentre bugs *nuevos*; se siguen
loggeando como `…·hallazgo-conocido`. Cualquier leak nuevo rompe el run.
**Hoy está vacío** (FIX-LEAK-01 se corrigió en D-δ.85, FIX-LEAK-02 en
D-δ.87 — ambos ruteando por `describirProblemaDeValidacion`); la maquinaria
se conserva para el próximo hallazgo abierto.

---

## 8. Artifacts de un fallo

En `qa-results/seed-<seed>[-run<n>]/` (gitignored, no se commitea):

```
failure.json     seed, run, step, action, actionsCompleted, baseURL,
                 viewport, currentURL, errorType, clase (APP/HARNESS/NETWORK),
                 message, timestamp, consola, pageerror, requestfailed,
                 ultimoTextoRelevante
actions.json     lista completa de acciones completadas (JSON)
actions.txt      la secuencia legible + el paso que falló
console.txt      console.error acumulados
pageerror.txt    stacks de pageerror
screenshot.png   captura full-page del estado de fallo
```

Playwright añade su `trace.zip` (`retain-on-failure`) y su screenshot
(`only-on-failure`) en `test-results/`, y el reporte HTML en
`playwright-report/`. Ver un trace:

```bash
npx playwright show-trace test-results/<carpeta>/trace.zip
```

---

## 9. GitHub Actions

`.github/workflows/qa-fuzz.yml` — **Playwright puro**, sin API de Claude,
sin deploy, sin tocar Pages.

- **`workflow_dispatch`** con inputs: `base_url`, `runs`, `steps`, `seed`.
  Ej.: Run workflow con `runs=100`, `steps=30`, `seed` vacía (se genera).
- **`schedule`**: nocturno `30 3 * * *` UTC (frecuencia baja a propósito).
  Corre `runs=50 × steps=30`.
- Pasos: checkout → **resolver seed de QA fuzz** (una sola, a `$GITHUB_ENV`
  como `IUAS_FUZZ_SEED`; QA-CI-01) → setup-node → `npm ci` →
  `npx playwright install --with-deps chromium` → unit tests del harness →
  smoke → catálogo → escenarios + **regresión responsive** (FIX-RESP-01) →
  fuzz.
- La seed base de la corrida queda en el *step summary*
  (`QA fuzz seed base: <valor>`) para reproducirla localmente.
- Artifacts subidos **siempre** (`if: always()`), retención **7 días**.
- Si el fuzz encuentra un bug real, el job queda **rojo**: eso **no**
  significa que el harness falló (brief §59/§60). Distinguir en el artifact:
  `clase` = `APP` / `HARNESS` / `NETWORK`.

---

## 10. Interpretación de un fallo — clasificación

| Clase | Señales | Ejemplos |
| ----- | ------- | -------- |
| **APP** | `pageerror`, `console.error`, pantalla blanca, invariante de app violada, valor/ id / código filtrado | el bug de verdad |
| **HARNESS** | timeout de locator, "strict mode violation", selector que no aparece, race del test | arreglar el harness (brief §40) |
| **NETWORK** | 404 de `/assets/*.js|css`, timeout externo | infra / cache de Pages |

`qa/fixtures.ts → clasificarFallo()` aplica esta heurística y etiqueta el
artifact y el título del fallo.

---

## 11. Cómo entregar un fallo a Claude Code

1. `qa-results/seed-<seed>/failure.json` + `actions.txt`.
2. El comando de replay exacto (sección 5).
3. `test-results/<carpeta>/trace.zip` (o el HTML report).
4. La clase (`APP` / `HARNESS` / `NETWORK`) y, si es APP, el nombre de la
   invariante violada.
5. **No** pedir que se corrija en la misma corrida del fuzz: cada hallazgo
   se cierra en su propio slice (`FIX-RESP-*`, `CAT-CONN-01`, `FIX-LEAK-01/02`,
   `FIX-CRASH-01` ya cerrados; abierto: `DEFENSE-01`).

---

## 12. Hallazgos de esta corrida

### FIX-LEAK-01 — M3 filtraba el código interno de validación al UI — RESUELTO (D-δ.85)

- **Qué:** `src/interfaz/paginas/PanelDeMedidoresDeModulo3.tsx`, rama
  `estado.estado === 'error'`, renderizaba `problema.problema.codigo`
  **crudo** (`<li>{problema.problema.codigo}</li>`) en vez de un mensaje
  humano. La tabla de mensajes humanos (`MENSAJES_DE_VALIDACION`) vivía como
  `const` local dentro de `MotorDemandaPantalla.tsx` (M1), inaccesible para M3.
- **Repro determinista:** iniciar Módulo 3 → Propiedad horizontal → ACS
  central → poner en `0` la longitud de un tramo en Tuberías → volver a
  Medidores. El panel mostraba `redHidraulicaTramoLongitudNoPositiva`.
- **Repro por fuzz:** `IUAS_FUZZ_SEED=424242 IUAS_FUZZ_RUNS=1 IUAS_FUZZ_STEPS=12`
  → step 10 (`editarLongitudTramo=0`).
- **Severidad:** media (leak de copy interno; no es crash ni pantalla
  blanca). Encaja en §13-H.
- **Fix (D-δ.85):**
  - `src/interfaz/paginas/mensajesDeValidacion.ts` (nuevo): la tabla se
    extrae acá y se exporta junto con
    `describirProblemaDeValidacion(codigo)` — **política segura**: código
    conocido → su frase; cualquier otra cosa (código nuevo del dominio sin
    traducir, valor corrupto, no-string) → `MENSAJE_DE_VALIDACION_GENERICO`
    ("Hay un dato de la instalación que debe corregirse antes de
    continuar."). **Nunca** el identificador, `undefined` ni `[object Object]`.
  - M1 (`MotorDemandaPantalla.tsx`) y M3 (`PanelDeMedidoresDeModulo3.tsx`)
    consumen la MISMA función. Una sola traducción por código.
  - Copy de `redHidraulicaTramoLongitudNoPositiva` unificada a "La longitud
    de un tramo debe ser mayor que cero." (estilo declarativo del resto).
  - No se tocaron validaciones, tipos de dominio, cuándo M3 entra en
    error, ni reglas de completitud: sólo la **presentación**.
- **Regresión:** `src/interfaz/paginas/mensajesDeValidacion.test.ts` (6
  tests: código conocido, código desconocido → genérico, no-string →
  genérico, cobertura completa del catálogo de códigos) +
  `tests/e2e/hallazgos.spec.ts` (era `test.fail`, ahora **regresión
  normal**: el mensaje humano aparece, el código NO, sin
  pageerror/console.error, invariantes verdes). Falla contra la producción
  pre-fix.
- **`HALLAZGOS_CONOCIDOS`:** se **quitó** la entrada de FIX-LEAK-01
  (`qa/invariantes.ts` queda con el array vacío); la invariante
  `sin-codigos-de-validacion-visibles` vuelve a ser **estricta**. La
  maquinaria (`esHallazgoConocido`, `evaluarTokens`) se conserva para el
  próximo hallazgo abierto.

### FIX-LEAK-02 — M4 filtraba la descripción técnica del catálogo al UI — RESUELTO (D-δ.87)

- **Qué:** `src/interfaz/paginas/humanizarModulo4.ts` →
  `describirProblemaDeErrorModulo4` devolvía
  `codigosValidacion[problema.problema.codigo].descripcion` — la
  descripción **técnica** interna del catálogo `src/validacion/codigos`
  (nombres de campo, CRIT, camelCase). `PanelDeModulo4.tsx`, rama
  `estado.estado === 'error'`, la pinta cruda en `<li>`. Es el equivalente
  en M4 de FIX-LEAK-01; **pre-existente**. M1/M3 ya no lo tenían porque
  desde D-δ.85 rutean por `describirProblemaDeValidacion`.
- **Texto filtrado observado:**
  `configuracionAbastecimiento.periodoConsumoMaximo_h, cuando está
  presente, debe ser un número finito entre 1 y 4 horas (ERAS §2.10.2 /
  CRIT-A35)…`
- **Repro por fuzz:**
  - **Seed cloud** `34398035608-1:12` (`QA Fuzz (Playwright) #5`, run 12),
    **step 17** · `editarPeriodoConsumoMaximo=6 [M4]` — falla idéntica en
    desktop y mobile; la corrida cloud quedó **roja** por este hallazgo y
    saltó los runs siguientes (no es una QA 20×30 completa).
  - **Seed histórica** `20250909:0` · `editarPeriodoConsumoMaximo=6`
    (descubierta durante GEOM-UX-01; evidencia en
    `qa-results/seed-20250909_0/`).
- **Severidad:** media/baja (leak de copy interno; no es crash ni pantalla
  blanca ni problema hidráulico). Encaja en §13-H.
- **Fix (D-δ.87):**
  - `describirProblemaDeErrorModulo4` ahora devuelve
    `describirProblemaDeValidacion(problema.problema.codigo)` — la MISMA
    función y política segura que M1/M3. Sin mapa nuevo:
    `DiagnosticoErrorModulo4` es un único shape con un `CodigoValidacion`,
    vocabulario que `MENSAJES_DE_VALIDACION` ya cubre entero. El fix cubre
    toda la rama de error estructural de M4 (esquema / período / DN /
    desnivel / volúmenes).
  - No se tocaron validaciones, tipos de dominio, el rango `1 ≤ Tc ≤ 4`
    (CRIT-A35), `VReserva`, ni cuándo M4 entra en error: `Tc = 6` sigue
    inválido. Sólo la **presentación**.
- **Regresión:** `humanizarModulo4.test.ts` (período inválido → frase
  humana sin `configuracionAbastecimiento` / `periodoConsumoMaximo_h`;
  otro código de la rama → misma ruta; código desconocido → genérico
  seguro) + `tests/e2e/hallazgos.spec.ts` (**regresión normal**, no
  `test.fail`: M4 → esquema con tanque → `Período de consumo máximo` = `6`
  → mensaje humano visible, código/identificador/`[object Object]`/`undefined`
  ausentes, `buscarCodigosDeValidacion` vacío, sin pageerror/console.error,
  invariantes verdes). Falla contra la producción pre-fix. Verificado
  contra `vite` dev (2/2 desktop + mobile).
- **Fuzz:** seed histórica `20250909:0` **30/30**; seed cloud
  `34398035608-1` runs 0–12 **13/13** (run 12 supera el antiguo step 17);
  baseline `424242` **15/15** sin regresión.
- **`HALLAZGOS_CONOCIDOS`:** **NO se añadió** entrada para FIX-LEAK-02 (el
  fix entró en el mismo checkpoint que el hallazgo); el array sigue
  **vacío** y la invariante `sin-codigos-de-validacion-visibles` sigue
  **estricta**. Sólo se actualizó el comentario de `qa/invariantes.ts`
  para nombrar ambos fixes.

### QA-CI-01 — la seed base del fuzz era no determinista en discovery

- **Qué:** `tests/e2e/sequence-fuzz.spec.ts` calculaba la seed base durante
  el *import* con `Date.now() ^ (process.pid << 16)` cuando `IUAS_FUZZ_SEED`
  estaba ausente, y esa seed va en el título de cada `test(...)`. Playwright
  importa el spec en procesos distintos (coordinator para *discovery*,
  workers para ejecución): cada uno obtenía una seed distinta, los títulos
  no coincidían y **los 40 tests fallaban en 0 ms** con
  `Test not found in the worker process`.
- **Por qué no se vio antes:** la validación local de QA-FUZZ-01 usó casi
  siempre `IUAS_FUZZ_SEED=424242` (seed constante entre procesos). El primer
  run cloud de QA-FUZZ-01 (20×30, `seed` vacía) NO fue una corrida fuzz
  válida: falló en discovery, antes de ejecutar acciones.
- **Corrección (QA-CI-01, D-δ.81):**
  - `qa/seed.ts` → `resolverSeedBase(env)` puro: explícita ⇒ tal cual; sin
    ella ⇒ fallback local **fijo** `424242`. Sin `Date.now`/`pid`/random.
  - El workflow resuelve **una** seed antes de Playwright (paso «Resolver
    seed de QA fuzz»), la exporta a `$GITHUB_ENV` y la registra en el
    *step summary*. Coordinator y workers heredan la misma.
  - Regresión: `qa/seed.test.ts` (passthrough, fallback estable,
    determinismo por run, guarda anti-`Date.now`/`Math.random`/`pid`…).

### FIX-RESP-01 — overflow horizontal de página en móvil con M2 «Detalladas / Profesional» — RESUELTO (D-δ.82)

- **Síntoma:** en viewport angosto (390 / 360 px), al activar en M2 las
  pérdidas «Detalladas» y/o la granularidad «Profesional», el **documento**
  desbordaba en horizontal (`documentElement.scrollWidth 593 > clientWidth
  390`; `body` también). El fuzz lo encontró en `run 1 · step 1 ·
  cambiarPerdidaLocalizada=detallado`, proyecto **mobile** (seed cloud
  `34360767880-1`; local: fallback `424242`). Desktop no se veía afectado.
- **Causa raíz (verificada con sonda del árbol de ancestros):**
  1. **`.app-modo`** (cabecera) tenía `flex: 0 0 auto`. Al derivarse el
     modo `avanzado` (mezcla Rápido/Profesional) aparece el badge
     *"Avanzado · combinación técnica personalizada"*; con ese badge el
     bloque tomaba su ancho **max-content** (~585 px) y, al no poder
     encogerse, empujaba el documento.
  2. **`<fieldset>.config-hidraulica__grupo`** traía
     `min-inline-size: min-content` del user-agent, marcado por los
     `<select>` de opciones largas ("Detalladas (relevamiento de
     accesorios)"…) — el fieldset ignoraba el ancho del padre (+9 px).
  Las `table.tabla-tecnica` **ya** estaban contenidas por `.tabla-scroll`
  (no eran la causa; la hipótesis previa quedó descartada).
- **Fix estructural (sin `overflow-x: hidden` global, sin ocultar
  contenido, sin tocar tipografías/columnas):**
  - `navegacionUI.css` — dentro de `@media (max-width: 900px)`:
    `.app-modo { flex: 1 1 100%; min-width: 0 }` (ocupa su propia línea,
    como `.app-aviso-piloto`; su `flex-wrap` reparte los hijos dentro del
    viewport) y `.app-modo .ui-badge--muted { white-space: normal }`.
  - `sistema-visual.css` — `.config-hidraulica__grupo { min-width: 0 }`,
    `.config-hidraulica__grupo > label { min-width: 0; max-width: 100% }`,
    `.config-hidraulica__grupo select { max-width: 100%; min-width: 0 }`
    (el `<select>` cerrado trunca la opción larga; la lista completa sigue
    disponible al abrir).
- **Regresión:** `tests/e2e/responsive.spec.ts` — a 390 / 360 / 1280 px, tras
  activar M2 «Detalladas + Profesional»: `documentElement`/`body`
  `scrollWidth ≤ clientWidth + 1`, cada `.tabla-scroll` dentro del
  viewport, y en móvil **alguna tabla scrollea dentro de su contenedor**
  (prueba de que el ancho se contuvo, no se escondió). Corre en el paso
  «Escenarios observados + regresión responsive» del workflow.
- **No se tocó** `HALLAZGOS_CONOCIDOS` (FIX-RESP-01 nunca llegó a añadirse;
  se corrigió antes). `FIX-LEAK-01` sigue igual.

### FIX-RESP-02 — overflow horizontal de página en M3 (excepción de ACS por UF) — RESUELTO (D-δ.83)

- **Síntoma:** con Módulo 3 iniciado + Propiedad horizontal + Provisión ACS
  por defecto `individual` + varias UF, al abrir el `<details>` «Configurar
  excepciones por unidad funcional» el `<select>` de cada fila desbordaba
  el documento en pantallas angostas. El fuzz lo encontró en seed
  `34365102807-1`, **run 17 · step 28** (`cambiarExcepcionACSporUF=default`,
  mobile): cloud `scrollWidth 433 > clientWidth 390` (+43 px);
  reproducción local determinista a **360 px** (+26 px). Desktop no
  afectado.
- **Causa raíz (sonda del árbol de ancestros):** el `<select>` de excepción
  ofrece la opción **`Usar el valor por defecto (Individual en cada unidad)`**
  (~50 caracteres). Un `<select>` sin acotar toma como ancho intrínseco el
  de su opción más larga (min-content) y las reglas globales de controles
  (`sistema-visual.css`) no le ponían `max-width`. Ese ancho empujaba el
  `<label>` / `<p>` de la fila y, con ellos, el documento. La diferencia
  cloud (+43 @ 390) vs local (+26 @ 360) es de **anchos de fuente**
  Linux/Windows; la causa estructural es la misma.
- **Fix estructural (una regla global, no un parche por-viewport):**
  `sistema-visual.css` — `select { max-width: 100%; min-width: 0 }`.
  Acota **todos** los `<select>` al ancho disponible (el texto de la opción
  cerrada se trunca de forma nativa; la lista completa sigue al abrir) y
  permite que un `<select>` dentro de un contenedor flex/grid se encoja.
  Resuelve la clase entera de bug (incluida la regla scoped de M2 de
  FIX-RESP-01, que queda redundante pero se deja por claridad local). Sin
  `overflow-x: hidden`, sin ocultar el control.
- **Regresión:** `tests/e2e/responsive.spec.ts` → bloque *FIX-RESP-02*.
  Estado mínimo (2 UF extra + Iniciar M3 + PH + ACS individual + abrir el
  `<details>` + `cambiarExcepcionACSporUF=default`) a 390 / 360 / 1280 px:
  documento sin overflow, el `<select>` de excepción **visible, habilitado
  y dentro del viewport**, invariante del harness y vitalidad de la app OK.
  Falla contra la producción pre-fix a 360 px (test real).
- **No se tocó** `HALLAZGOS_CONOCIDOS` ni `FIX-LEAK-01`.

### FIX-CRASH-01 — longitud de tramo en 0 desmontaba la app — RESUELTO (D-δ.88)

- **Qué:** `src/motor/tuberias/resolverPerdidaDistribuidaDeTramo.ts` sólo
  devolvía su variante `sinLongitud` cuando `tramo.longitud_m === undefined`.
  Una longitud **informada pero no utilizable** (`longitud_m <= 0` — estado
  de edición legítimo: `resolverCambioDeLongitud` acepta `0`, y
  `validarRedHidraulica` la marca con el predicado `!== undefined && <= 0`)
  llegaba a `calcularPerdidaCargaHazenWilliams(J, 0)`, que **lanza** por
  contrato (CRIT-A17 exige `L > 0`). `PanelDePresionDeModulo2` llama
  `resolverPresionResidualDeCamino` **directo en el render** (dentro de un
  `nodosTerminales.map(...)`), sin la barrera estructural de
  `resolverEstadoModulo2`, así que la excepción propagaba por React y
  **desmontaba la app** (`#root` vacío → `WHITE_SCREEN`).
- **`desnivelConexion = -2` NO era el bug (CRIT-A37).** El desnivel es una
  magnitud **firmada** (`Pcalc = Pácera − desnivelConexion`); `-2` es
  válido. El step 19 era sólo el **disparador**: en modo Rápido + tanque
  elevado, mientras faltaba el desnivel `resolverPeloDeAguaMinimoEfectivo`
  devolvía `incompletoRapido` y el balance cortaba en la guarda de
  desnivel **antes** de la acumulación de pérdida distribuida. Al informar
  cualquier desnivel finito (`0`/`5`/`10`/`-2`), el balance avanzaba hasta
  el tramo de longitud 0.
- **Repro por fuzz:** **seed cloud** `34411681277-1:0` (QA Fuzz cloud
  posterior a FIX-LEAK-02, seed generada `34411681277-1`, primer run),
  **step 19** · `editarDesnivelConexion=-2 [M4]` — `WHITE_SCREEN` idéntico
  en **desktop y mobile**. La corrida cloud quedó **roja** (2 failed / 38
  did not run): no es una QA 20×30 completa.
- **Severidad:** **P0** — desmontaje total de la app. Primer crash de
  pantalla blanca dependiente de secuencia reproducido de forma
  determinista (los escenarios A/B/C nunca lo habían logrado).
- **Preexistencia:** la guarda `=== undefined` es de la primera versión
  del resolver N3 (D-δ.34). GEOM-UX-01 y FIX-LEAK-02 **no** lo
  introdujeron; la secuencia del fuzz sólo combinó por primera vez las
  precondiciones (modo Rápido + tanque elevado + longitud 0 + desnivel
  informado).
- **Fix (D-δ.88):**
  - La guarda pasa a
    `if (tramo.longitud_m === undefined || tramo.longitud_m <= 0)` →
    `sinLongitud`. Mismo predicado que `validarRedHidraulica`. Toda la
    cadena de presión (`acumularPerdidaDistribuidaDeCamino` →
    `perdidaDistribuidaIncompleta` → `resolverEstadoModulo2` `incompleto`)
    degrada como ya hacía para la longitud ausente.
  - **No** se tocó ninguna fórmula (`calcularPerdidaCargaHazenWilliams`
    sigue exigiendo `L > 0`), ni CRIT-A37 (`-2` se conserva sin clamp), ni
    la responsabilidad entre módulos. **No** se agregó `ErrorBoundary`
    (DEFENSE-01 sigue pendiente para su propio slice).
- **Regresión:** `resolverPerdidaDistribuidaDeTramo.test.ts` (caso
  `sinLongitud` para `longitud_m ∈ {0, -2}` → `tipo: 'sinLongitud'`, sin
  lanzar) + `tests/e2e/hallazgos.spec.ts` (**test normal**, no
  `test.fail`: proyecto de ejemplo → Tuberías longitud `0` (app tolera el
  estado) → Abastecimiento "Tanque elevado" → `Desnivel … [m]` = `-2` →
  app viva, sin el `pageerror` de `calcularPerdidaCargaHazenWilliams`, sin
  `console.error`, `#root` con contenido, el input conserva `-2`; falla
  WHITE_SCREEN desktop + mobile contra el código pre-fix, verificado con
  `git stash`).
- **Seed canónica completa** `34411681277-1:0` **30/30** pasos, desktop +
  mobile, contra `vite` dev con el fix. Documentada como *FIX-CRASH-01
  canonical regression seed*. **NO** se agrega a `HALLAZGOS_CONOCIDOS`.
- **Fuzz lateral:** seed cloud previa `34398035608-1` runs 0–12 **13/13**;
  baseline `424242` sin regresión.
- **`HALLAZGOS_CONOCIDOS`:** **sigue vacío**; la invariante
  `pantalla-no-blanca` sigue estricta.

### Pantallas blancas observadas (A/B/C)

`tests/e2e/crash-observado.spec.ts` reproduce los escenarios del brief §26
contra `v0.4.0-beta.5`. Ver el resultado de la corrida de cierre en el
handoff de D-δ.80 (ROADMAP / PENDIENTES). Ninguno de esos tres reprodujo un
crash; el primero determinista fue FIX-CRASH-01 (arriba), del fuzz por
seed.

---

## 13. Deudas registradas

| Deuda | Qué |
| ----- | --- |
| ~~`FIX-LEAK-01`~~ | **RESUELTO en D-δ.85** — M3 mostraba códigos internos de validación; ahora `describirProblemaDeValidacion` compartido por M1 y M3 (§12). |
| ~~`FIX-LEAK-02`~~ | **RESUELTO en D-δ.87** — M4 mostraba la descripción técnica del catálogo (`configuracionAbastecimiento.periodoConsumoMaximo_h…`); ahora `describirProblemaDeErrorModulo4` rutea por el mismo `describirProblemaDeValidacion` que M1/M3 (§12). |
| ~~`FIX-RESP-01`~~ | **RESUELTO en D-δ.82** — overflow horizontal de página en móvil con M2 Detalladas/Profesional (§12). |
| ~~`FIX-RESP-02`~~ | **RESUELTO en D-δ.83** — overflow horizontal de página en M3 (excepción de ACS por UF) por `<select>` sin acotar (§12). |
| ~~`FIX-CRASH-01`~~ | **RESUELTO en D-δ.88** — `resolverPerdidaDistribuidaDeTramo` no trataba `longitud_m <= 0` como `sinLongitud`; el throw de `calcularPerdidaCargaHazenWilliams` propagaba por el render de `PanelDePresionDeModulo2` y desmontaba la app. Seed canónica `34411681277-1:0` step 19 (§12). |
| ~~`CAT-CONN-01`~~ | **RESUELTO en D-δ.84** — la conectividad física inicial pasó a resolverse por política de catálogo (`politicaConectividad.ts`), no por precedentes del proyecto. Matriz objetivo: sólo `lavavajillasIndustrial` y `lavarropasIndustrial` piden selección (14 no); `catalogo-conectividad.spec.ts` la asevera. |
| `DEFENSE-01` | ErrorBoundary con estado Proyecto preservado. Después del fix raíz. |
| `GEOM-UX-01` | herencia de cotas UF → Local → terminal. |
| `MODE-UX-01` | preset Profesional (Hazen + Estimadas + Simplificada). |

---

## 14. Qué NO hace este harness

- No corrige bugs de dominio (los captura y documenta).
- No implementa ErrorBoundary.
- No cambia la conectividad del catálogo.
- No toca hidráulica, CRIT, herencia de cotas ni el preset Profesional.
- No despliega ni toca GitHub Pages.
- No usa la API de Claude en CI.
- No commitea resultados (`qa-results/`, `playwright-report/`,
  `test-results/` están en `.gitignore`).
