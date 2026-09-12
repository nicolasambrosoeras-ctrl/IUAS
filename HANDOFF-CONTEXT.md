# HANDOFF — HYD-EST-01

## BASE

- HEAD inicial de la consigna (base de todo el slice): `85c3e08`
  (`docs: registrar UI-M2-MONTANTE-COMPACT-01 (D-delta.111)`).
- Checkpoint de Codex (motor + integración, no pusheado en su momento):
  `ac0d839` (`checkpoint: integrar nucleo HYD-EST por recorrido (QA
  pendiente)`).
- HEAD final de esta sesión, **pusheado y verificado == `origin/main`**:
  `3c67d5a`.
- Tree: limpio.

Cadena completa de commits del slice, todos sobre `85c3e08`:

```
85c3e08  (base — D-δ.111)
ac0d839  checkpoint: integrar nucleo HYD-EST por recorrido (QA pendiente)      [Codex]
cf0e113  test: adaptar baselines y memoizacion a HYD-EST path-aware            [Claude]
7b73e3d  docs: registrar HYD-EST-01 (D-delta.112)                             [Claude]
f81fc23  test: E2E dirigido de HYD-EST-01 (DN->V->hf y fan-out incompleto)     [Claude]
a2f84d6  docs: actualizar HANDOFF-CONTEXT.md tras estabilizar HYD-EST-01       [Claude]
3c67d5a  docs: cerrar gate de fuzz de HYD-EST-01 (20x30 + 6 seeds, 38/38)      [Claude]  ← HEAD == origin/main
```

## TRANSICIÓN CODEX → CLAUDE

Codex agotó cuota dos veces: dejó el checkpoint `ac0d839` (sin push,
deliberado) con el motor Estimadas path-aware, la integración de
presión/UI, y 88/88 tests dirigidos verdes; después siguió trabajando y
dejó **sin commit** 7 archivos (+133/-27):
`auditoriaTransversalM1M4.baseline.test.ts`,
`resolverResumenDeProyecto.test.ts`,
`sonPropsDeSeccionDeUnidadFuncionalEquivalentes.{ts,test.ts}`,
`escalaDelMotor.regresion.test.ts`,
`verificacionLongitudVerticalPorNivel.test.ts`, y el fixture nuevo
`src/pruebas/fixtures/ejemploConBifurcacionesDefinidas.ts`.

Claude auditó ese trabajo sin commit **archivo por archivo** (diff
completo + lectura íntegra del fixture nuevo) antes de tocar nada. Los 7
cambios eran coherentes, completos y correctos — ninguna edición a medio
terminar. **Todo se preservó tal cual**, con una única corrección: en
`auditoriaTransversalM1M4.baseline.test.ts`, el test "SNAPSHOT" (que
Codex no tocó en esa tanda) seguía esperando el margen histórico del
crítico `-17,664 m.c.a.`, pero `canonico()` ya usaba por defecto el
fixture con bifurcaciones explícitas (agrega tramos reales a los
caminos AF/AC) → el margen real había pasado a `-20,164 m.c.a.`, un
resultado **legítimo** del nuevo modelo, no una regresión. Se corrigió
el valor esperado y el comentario explicativo (commit `cf0e113`).

Por qué se preservó y no se reescribió: cada archivo tenía una intención
clara y verificable contra el modelo ya cerrado (fan-out incompleto,
singularidad por terminal, memoización por dependencia física real), y
los tests pasaban tras la corrección puntual — no había motivo para
descartar trabajo correcto.

## MODELO HIDRÁULICO FINAL

Implementado en
`src/motor/tuberias/presion/resolverPerdidaLocalizadaEstimadaDeCamino.ts`.

**Antes (D-δ.40/D-δ.45):** agregado por `(Local, Red)` — `n-1` tees
K=3,00 + una llave de paso K=9,18 + **una** singularidad terminal
K=1,35, todas calculadas sobre la velocidad de referencia **máxima**
(`V_ref`) entre todos los terminales físicos del grupo.

**Ahora:** resolución **por camino**, recorriendo la topología real
desde la raíz del Local hasta cada terminal físico
(`obtenerCaminoHaciaOrigen`). En cada tramo del camino:
- si es la entrada común del grupo (Local, Red) → llave de paso (K=9,18)
  con la V de ESE tramo;
- si su nodo de origen tiene 1 tramo entrante y exactamente 2 salientes
  (tee real 1→2) → singularidad de tee (K=3,00) con la V del tramo
  SALIENTE recorrido (convención CRIT-A31, sin clasificar recta/lateral);
- si es el último tramo (alimenta directo al terminal) → singularidad
  terminal (K=1,35) con la V de ESE tramo.

Un fan-out 1→N (nodo con 1 entrante y >2 salientes) se diagnostica
**antes** de calcular componentes y devuelve `incompleta` con motivo
`derivacionMultipleNoModelada` — nunca hf parcial ni ficticia.

## COEFICIENTES (Tabla de K — sin cambios de valor, sólo de base de velocidad/cardinalidad)

| Singularidad | K | Origen | Qué cambió |
|---|---|---|---|
| Tee 1→2 | 3,00 (`teeEntradaCentralSalidasLaterales`) | D-δ.40, conservador, sin clasificar recta/lateral | Antes: `n-1` veces con `V_ref` máxima del grupo. Ahora: una vez por cada tee real que el camino atraviesa, con la V del tramo saliente recorrido (CRIT-A31) — **no cambió el K, cambió a cuántas y con qué V**. |
| Llave de paso | 9,18 (`llaveDePaso`) | D-δ.45 | Sin cambio: una por entrada de (Local, Red), ahora con la V de esa entrada real. |
| Singularidad terminal | 1,35 (`codo90`) | D-δ.45, decisión roja ya resuelta por el usuario | **Cardinalidad**: antes 1 por (Local, Red) con `V_ref` máxima; ahora 1 **por terminal físico**, con la V de su propio tramo alimentador. |

El rediseño recta/lateral (`1,62`/`1,00`) + transición de DN (`+0,75`) +
válvula de rama (`0,17`) que D-δ.90 había diferido a M2-TOPO-01 por
falta de topología de orientación **sigue diferido, no se reabrió**.

## MEMOIZACIÓN (por UF)

`sonPropsDeSeccionDeUnidadFuncionalEquivalentes.ts` →
`sonAportesCompartidosEquivalentes`: cuando cambia el conjunto de UF y
el método localizado es `estimado`, identifica los terminales cuya UF
cambió, resuelve sus caminos y extrae los tramos de **tee** que
atraviesan; compara contra los tramos de tee de los propios caminos de
la UF de la tarjeta.

- **Tee compartida:** si algún tramo de tee coincide → la tarjeta se
  invalida y recalcula (dependencia física real).
- **Rama independiente:** si no coincide ningún tramo de tee → la
  tarjeta NO se invalida, conserva la optimización existente.

Verificado con 2 tests dedicados (`sonPropsDeSeccionDeUnidadFuncionalEquivalentes.test.ts`):
cambiar demanda de una UF que comparte tee invalida y cambia la hf
mostrada; cambiar demanda de una UF en rama independiente no invalida
ni cambia nada.

## BASELINES — qué cambió y por qué

- **`auditoriaTransversalM1M4.baseline.test.ts`:** `canonico()` ahora
  atraviesa por defecto `ejemploConBifurcacionesDefinidas` (antes:
  `proyectoInicial` con su fan-out 1→N sin resolver). Margen del
  crítico: `-17,664` → `-20,164 m.c.a.` (más tramos reales en el camino
  → más hf; sigue NO CUMPLE). Nuevo test fija el contrato sobre el demo
  ORIGINAL con fan-out: M2 incompleto, margen `undefined`, M1/M3/M4
  intactos frente al canónico.
- **`escalaDelMotor.regresion.test.ts`:** el fixture de escala (14 UF ×
  3 locales) tiene fan-out real; precondición pasó de "M2 completo" a
  "M2 incompleto por `derivacionMultipleNoModelada`", conservando la
  verificación de escala (>200 terminales).
- **`verificacionLongitudVerticalPorNivel.test.ts`:** el fixture pasó de
  un nodo con 3 salientes (fan-out no declarado) a una distribución AF
  explícita con bifurcaciones reales 1→2, preservando la intención
  original del test (longitud vertical por nivel) sin depender de
  fan-out no modelado.

## DN → V → HF: cadena final de recálculo

`resolverDiametroComercialDeTramo` (V real según DN adoptado/auto) →
`resolverPerdidaDistribuidaDeTramo` (Hazen-Williams/Darcy sobre esa V) →
`resolverPerdidaLocalizadaEstimadaDeCamino` (K·V²/2g por singularidad
real del camino, con la V de cada tramo propio) →
`resolverPresionResidualDeCamino` (`Presidual = Pdisponible − Δz −
hfDistribuida − hfLocalizada − hfMedidor − hfEquipoACS`, fórmula sin
cambios). Verificado E2E: subir/bajar el DN comercial de un tramo
recalcula V y hf de forma monótona y reversible.

## CASO DN125 (verificado numéricamente, fixture de 4 terminales en 2 ramas explícitas)

Variando el DN del tramo `intermedio-a` (rama de terminal-0/terminal-1),
con terminal-2 en la rama independiente (vía `intermedio-b`):

| DN | V (m/s) | hf distribuida | hf localizada terminal-0 (misma rama) | hf localizada terminal-2 (rama independiente) |
|---|---|---|---|---|
| 20 mm | 3,070 | 1,427 | 4,184 | 3,136 |
| 25 mm | 1,965 | 0,481 | 3,333 | 3,136 |
| 32 mm | 1,183 | 0,140 | 2,957 | 3,136 |
| 50 mm | 0,486 | 0,016 | 2,779 | 3,136 |
| 75 mm | 0,215 | 0,002 | 2,750 | 3,136 |
| 110 mm | 0,100 | 0,000 | 2,744 | 3,136 |
| 125 mm | 0,081 | 0,000 | 2,744 | 3,136 |

Al crecer el DN, V y hf distribuida de la rama caen y se aplanan (nunca
forzadas a 0 si no corresponde); la hf localizada de la MISMA rama cae y
se aplana con ellas (ya no queda congelada por una `V_ref` terminal
global); la rama independiente permanece **exactamente** en `3,136` en
todas las filas.

## RAMALES — independencia demostrada

Confirmado en la tabla DN125 (terminal-2 invariante) y en el test de
memoización (rama independiente no invalida ni cambia hf). Un ramal que
no comparte tee/tramo con el que cambió conserva su contribución
exactamente igual.

## FAN-OUT 1→N — comportamiento final

Detectado antes de calcular componentes; el camino queda `incompleta`
con motivo `derivacionMultipleNoModelada`; la hf localizada y la presión
residual de ESE terminal quedan incompletas (sin inventar topología,
sin fallback agregado, sin cadena ficticia de tees); el resto de
resultados determinables (DN, V, hf distribuida, otros
Locales/terminales) se sigue mostrando con normalidad. Verificado E2E
contra producción: fila "⚠ Incompleto", texto "localizada incompleta",
sin `NaN`/`undefined`/`[object Object]`, sin crash.

## ESTIMADAS VS DETALLADAS

Separación confirmada: `Detalladas` no fue tocado por este slice (ningún
archivo de su cadena — `resolverClasificacionDeTee`,
`acumularPerdidaLocalizadaDeCamino`, accesorios persistidos — aparece en
el diff). `resolverPresionResidualDeCamino` sigue eligiendo un modo u
otro según `metodoPerdidaLocalizada` y nunca los mezcla.

## PRESIÓN — integración final

`Presidual = Pdisponible − Δz − hfDistribuida − hfLocalizada − hfMedidor
− hfEquipoACS`, sin cambio de fórmula; ahora consume la hf localizada
por camino. Un camino incompleto por fan-out deja la presión residual de
ESE terminal incompleta, sin inventar valor. Verificado en el baseline
transversal (margen del crítico recalculado con el nuevo modelo) y en
`resolverResumenDeProyecto.test.ts` (el margen del canónico con fan-out
queda `{ tipo: 'pendiente' }`, `margenCumple` `undefined`).

## PERFORMANCE

El recorrido por camino reutiliza los índices ya existentes de
`contextoDeCalculoM2` (índice topológico, tramos entrantes/salientes,
representativos de Local) precomputados una vez por resolución —
`obtenerIndiceEstimacionLocalizada` construye sus propios índices en
`O(nodos + tramos + suma de profundidades)` y los cachea en el contexto.
No se reintrodujo `O(terminales × tramos²)`: el fixture de escala
(14 UF × 3 locales, >200 terminales) sigue resolviendo sin regresión de
tiempo (mismo test de escala, ahora validando "incompleto" en vez de
"completo", pero sin cambio de orden de magnitud en duración).

## TESTS — resultado final

| Gate | Resultado |
|---|---|
| Vitest | **1797/1797** (175 archivos; sube de 1784/1784 pre-slice) |
| `tsc -b` | limpio |
| `npm run e2e:typecheck` | limpio |
| `npm run build` | limpio |
| `npx eslint .` | **11 problemas, 0 nuevos** — preexistentes, en archivos no tocados por este slice (ver nota ESLint abajo) |
| E2E dirigido nuevo | `tests/e2e/hydEst.spec.ts`, 2 casos × desktop/mobile |
| E2E regresión (dev local) | `smoke`, `montantes` (8), `hallazgos` (4), `responsive` (6) → **19/19** |
| E2E contra producción real | `smoke` + `hydEst` → **6/6** (desktop + mobile) |
| Fuzz 20×30 (seed `424242`) | **20/20** (runs 0–9 en un batch, 10–19 en otro tras corregir el `RUNS=10` inicial) |
| Fuzz seeds históricas | `34493241441-1:15` (1/1), `34411681277-1:0` (1/1), `34398035608-1` runs 0–12 (13/13), `m7`/`m42`/`m99` (3/3) |
| **Total fuzz** | **38/38 runs verdes**, 0 regresiones detectadas |

**Nota ESLint** — aclaración de una aparente discrepancia planteada
durante el slice: la notación `ESLint 11/0/0` que usa este proyecto en
decenas de entradas previas de `ROADMAP.md`/`PENDIENTES-DE-ARQUITECTURA.md`
significa **"11 problemas preexistentes / 0 warnings nuevos / 0 errores
nuevos"**, no "11 warnings, 0 errores" en términos absolutos. Los 11
problemas siempre fueron de severidad `error` en la config real de
ESLint (`react-refresh/only-export-components`,
`@typescript-eslint/no-unused-vars`, `no-loss-of-precision`), en
archivos ajenos a HYD-EST (`MotorDemandaPantalla.tsx`,
`actualizarRedHidraulica.ts`, `AccesoriosDeTramoEditor.tsx`,
`ResultadoHidraulicoDeTramo.tsx`, `duplicarUnidadFuncional.test.ts`,
`resolverHidraulicaDeTramo.pisoCaudalIndividual.golden.test.ts` —
confirmado con `git log` que su última modificación es de commits
ajenos a este slice). No hay discrepancia real ni regresión.

## DOCS

D-δ.112 registrado en `ROADMAP.md` (después de D-δ.111). Contenido:
modelo antes/después, coeficientes, fan-out, memoización, baselines,
tests, continuidad entre agentes, y la precisión de que D-δ.90 (rediseño
recta/lateral) sigue diferido a M2-TOPO-01 sin reabrirse.

## COMMITS

Ver sección BASE arriba para la lista completa
(`ac0d839` de Codex + `cf0e113`/`7b73e3d`/`f81fc23`/`a2f84d6`/`3c67d5a`
de Claude, más este commit final de documentación).

## GIT FINAL

- HEAD: `3c67d5a66dc503d6647a013a94712b0efdca8f59` (antes de este commit
  de cierre; ver el hash real tras commitear este archivo).
- `origin/main`: sincronizado con HEAD tras `git push origin main`
  (confirmado `git fetch` + `git rev-parse HEAD`/`origin/main` iguales).
- Tree: limpio.

## DEPLOY

- Workflow `Deploy static content to Pages` (run `34724256817`,
  disparado automáticamente por el push a `main`): `status: completed`,
  `conclusion: success`.
- `https://nicolasambrosoeras-ctrl.github.io/IUAS/` → HTTP **200**.
- Smoke + E2E dirigido de HYD-EST contra producción real: **6/6 verde**
  (desktop + mobile), sin `IUAS_BASE_URL` (usa el default de
  producción del `playwright.config.ts`).
- Checkpoint cloud Nivel A (QA Fuzz vía GitHub Actions
  `workflow_dispatch` de `.github/workflows/qa-fuzz.yml`): **NO
  disparado desde esta sesión** — no hay `gh` CLI ni token disponible
  para lanzarlo sin intervención del usuario. Si se quiere ese
  checkpoint adicional (recomendado, aunque no bloqueante dado que el
  gate local 20×30 + históricos + producción ya está verde), hay que
  dispararlo manualmente desde GitHub Actions o pedírselo a un agente
  con acceso a `gh`/token.

## VALIDACIÓN MANUAL PEDIDA

Con todo lo anterior verde, sólo queda pedir al usuario:

1. Abrir `https://nicolasambrosoeras-ctrl.github.io/IUAS/`, ir a
   Baño / AF / Estimadas.
2. Observar DN, V y pérdidas (distribuida + localizada) del tramo.
3. Subir el DN con el botón `↑` y confirmar que la hf localizada
   afectada responde (baja) junto con V y la hf distribuida.
4. Si la UI lo permite, llegar a un DN grande (110/125 mm) y confirmar
   que los valores se aplanan sin volverse `0` de forma artificial.
5. Bajar nuevamente el DN y confirmar que los valores vuelven a subir
   (reversibilidad).
6. Revisar la presión residual del terminal crítico.
7. Ubicar un caso de derivación 1→N (fan-out) en el proyecto de ejemplo
   (ej. Baño · AF con sus 4 artefactos) y confirmar que aparece como
   "Incompleto" sin romper la pantalla ni mostrar valores basura.

## ESTADO

**`HYD-EST-01: CERRADO — pendiente validación manual del usuario`.**

Implementación, QA local completa (unit 1797/1797 + integration + E2E
dirigido + `tsc`/`build`/`eslint`), el gate de fuzz completo (20×30 +
6 seeds históricas = 38/38), el push a `origin/main`, el deploy a
GitHub Pages (verificado HTTP 200) y el smoke/E2E contra producción
real (6/6) están **verdes y confirmados**. Sólo restan: el checkpoint
cloud Nivel A opcional (requiere disparo manual/`gh`) y la validación
manual del usuario sobre el sitio publicado (lista arriba).
