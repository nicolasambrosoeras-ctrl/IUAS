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

Qué **no** hace (en esta corrida): no toca hidráulica, ni CRIT, ni la UX de
negocio; no implementa ErrorBoundary (`DEFENSE-01`); no cambia la
conectividad del catálogo (`CAT-CONN-01`); no corrige los bugs que
encuentra (`FIX-CRASH-01`, `FIX-LEAK-01`).

---

## 2. Arquitectura

```
playwright.config.ts            baseURL, proyectos desktop/mobile, trace/screenshot
tsconfig.e2e.json              type-check del harness (aparte de `tsc -b`)
tests/e2e/
  smoke.spec.ts                camino feliz determinista por las 5 secciones
  catalogo-conectividad.spec.ts recorre los 17 artefactos del catálogo (matriz)
  sequence-fuzz.spec.ts        fuzz reproducible por seed
  crash-observado.spec.ts      escenarios A/B/C construidos a mano (brief §26)
  hallazgos.spec.ts            bugs de app YA encontrados (test.fail, no se corrigen)
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

### Local contra un build estático (subpath `/IUAS/`)

```bash
npm run build
npm run preview                 # sirve http://localhost:4173/IUAS/
IUAS_BASE_URL=http://localhost:4173/IUAS/ npm run e2e
# …o que Playwright levante el preview solo:
IUAS_PREVIEW=1 npm run e2e
```

> `vite preview` respeta `base: '/IUAS/'` del build (Vite dev NO: sirve en la
> raíz). Validar siempre con un servidor estático que preserve el subpath.

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
  smoke → catálogo → escenarios → fuzz.
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
5. **No** pedir que se corrija en QA-FUZZ-01: el siguiente slice es
   `FIX-CRASH-01` (crashes) / `FIX-LEAK-01` (este hallazgo).

---

## 12. Hallazgos de esta corrida

### FIX-LEAK-01 — M3 filtra el código interno de validación al UI

- **Qué:** `src/interfaz/paginas/PanelDeMedidoresDeModulo3.tsx` (~línea 351),
  rama `estado.estado === 'error'`, renderiza `problema.problema.codigo`
  crudo (`<li>{problema.problema.codigo}</li>`) en vez de un mensaje
  humano. M1 sí humaniza el mismo código
  (`redHidraulicaTramoLongitudNoPositiva` → "Un tramo … longitud menor o
  igual a cero.").
- **Repro determinista:** iniciar Módulo 3 → activar Propiedad horizontal →
  ACS = central → poner en `0` la longitud de un tramo en Tuberías →
  volver a Medidores. El panel muestra el texto
  `redHidraulicaTramoLongitudNoPositiva`.
- **Repro por fuzz:** `IUAS_FUZZ_SEED=424242 IUAS_FUZZ_RUNS=1 IUAS_FUZZ_STEPS=12`
  → falla en el **step 10** (`editarLongitudTramo=0`), 3/3 replays
  idénticos. Secuencia completa en el artifact.
- **Severidad:** media (no es crash ni pantalla blanca; es leak de copy
  interno). Encaja en brief §13-H.
- **Estado:** documentado en `tests/e2e/hallazgos.spec.ts` (`test.fail`) y
  en `HALLAZGOS_CONOCIDOS`. **No se corrige acá.**

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

### FIX-RESP-01 — overflow horizontal de página en móvil con M2 «Profesional»

- **Qué:** en viewport móvil (390 px), al pasar la granularidad de M2 a
  `profesional`, la **página** desborda en horizontal
  (`document.documentElement.scrollWidth 593 > clientWidth 390`, `body`
  también). Culpables medidos: `table.tabla-tecnica` del detalle Profesional
  (`min-width: 40rem`, `overflow-x: visible` — **no** envuelta en un
  contenedor `.tabla-scroll`), y un `<a>` de la navegación (`right ≈ 724`).
- **Severidad:** media (responsive; no es crash ni `pageerror`; incumple la
  regla "el body nunca hace scroll horizontal").
- **Repro por fuzz:** sin seed ⇒ fallback `424242` ⇒ **run 1, step 1**,
  `cambiarGranularidad=profesional`, proyecto **mobile**. 3/3 idéntico.
  Desktop con la misma seed pasa.
- **Estado:** hallazgo **surgido al arreglar QA-CI-01** (antes el fuzz ni
  siquiera llegaba a ejecutarse). **No se corrige acá** (fuera de alcance
  QA-CI-01; no se tocan invariantes ni `HALLAZGOS_CONOCIDOS`). Evidencia en
  `qa-results/seed-424242_1-run1/`.

### Pantallas blancas observadas (A/B/C)

`tests/e2e/crash-observado.spec.ts` reproduce los escenarios del brief §26
contra `v0.4.0-beta.5`. Ver el resultado de la corrida de cierre en el
handoff de D-δ.80 (ROADMAP / PENDIENTES).

---

## 13. Deudas registradas

| Deuda | Qué |
| ----- | --- |
| `FIX-LEAK-01` | M3 muestra códigos internos de validación (este documento §12). |
| `FIX-RESP-01` | overflow horizontal de página en móvil con M2 Profesional (§12). Al abrirlo, sumar su patrón a `HALLAZGOS_CONOCIDOS` para que el fuzz no se detenga siempre ahí. |
| `FIX-CRASH-01` | pantallas blancas dependientes de secuencia (si QA-FUZZ las reproduce). |
| `CAT-CONN-01` | revisar qué artefactos *deberían* preguntar conectividad (Bañera, Válvula de mingitorio, Lavachatas…). El reporte de matriz es su evidencia. |
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
