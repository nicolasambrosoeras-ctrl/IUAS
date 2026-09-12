# HANDOFF DE CONTEXTO

## OBJETIVO DEL SLICE

HYD-EST-01 Nivel A: reemplazar hf estimada agregada/Vref por pérdidas de
singularidades del camino usando velocidades reales actuales; DN manual,
Auto y presión deben reaccionar. Terminar QA, fuzz/cloud, push y Pages
antes de declarar cierre. Este archivo es un checkpoint, NO un cierre.

## CONTINUIDAD ENTRE AGENTES (Codex → Claude)

Sesión de Codex agotó cuota en dos momentos:

1. Dejó un checkpoint local `ac0d839` (motor Estimadas path-aware +
   integración de presión/UI + 88/88 tests dirigidos verdes + `tsc -b`
   verde), sin pushear deliberadamente.
2. Después de `ac0d839`, siguió trabajando y dejó **sin commit** 7
   archivos (+133/-27): memoización por UF sensible a tees compartidas,
   adaptación de baselines/fixtures al nuevo modelo, y un fixture nuevo
   (`ejemploConBifurcacionesDefinidas.ts`).

Claude auditó ese trabajo sin commit archivo por archivo (diff completo +
lectura del fixture nuevo) antes de tocar nada: los 7 cambios eran
coherentes, completos y correctos — no había ediciones a medio terminar.
Se preservaron **tal cual**, con una sola corrección: en
`auditoriaTransversalM1M4.baseline.test.ts`, el test "SNAPSHOT" (no
tocado por Codex en esa tanda) seguía esperando el margen del crítico
histórico `-17,664 m.c.a.`, pero `canonico()` ya usaba por defecto el
fixture con bifurcaciones explícitas (que agrega tramos reales a los
caminos AF/AC) — el margen real pasó a `-20,164 m.c.a.`, un resultado
legítimo del nuevo modelo, no una regresión. Se actualizó el valor y el
comentario explicativo. Commit de continuación:
`cf0e113 test: adaptar baselines y memoizacion a HYD-EST path-aware`.

## BASE

Rama `main`. HEAD inicial y `origin/main` verificados con fetch:
`85c3e08cd99467d28c90c20b0624b4f46ea6c96c`.

Cadena de commits de este slice sobre esa base:
1. `ac0d839` — checkpoint de Codex (motor + integración, no pusheado).
2. `cf0e113` — Claude: preserva y estabiliza el trabajo sin commit de
   Codex + corrige el snapshot desactualizado. Vitest 1797/1797.
3. `7b73e3d` — docs: D-δ.112 en ROADMAP.md.
4. `f81fc23` — test: E2E dirigido `tests/e2e/hydEst.spec.ts`.

`origin/main` sigue en `85c3e08` — **todavía no pusheado** (pendiente
del gate de fuzz, ver más abajo).

## DECISIONES CERRADAS (no reabrir)

- Fan-out 1→N (`derivacionMultipleNoModelada`): hf localizada y presión
  de ESE camino quedan incompletas; nunca fallback agregado ni cadena
  ficticia de tees. El resto de los resultados determinables se sigue
  mostrando.
- Singularidad terminal K=1,35 **por terminal físico**, exclusiva de su
  camino, con la V de su propio tramo alimentador. Sustituye la
  cardinalidad "una por Local/Red" de D-δ.45 (D-δ.45 queda superado
  SÓLO en esa cardinalidad/base de velocidad, no en el coeficiente).
- Se conserva K tee = 3,00 (sin clasificar recta/lateral — el rediseño
  de D-δ.90 sigue diferido a M2-TOPO-01, NO se reabrió), K llave = 9,18,
  K terminal = 1,35. Ninguna Tabla N°7 nueva.
- Detalladas intacto; sin accesorios persistidos, reductores automáticos
  ni topología inventada. Un cambio de DN nunca agrega un accesorio de
  reducción automáticamente.

## MODELO HIDRÁULICO FINAL (implementado y verificado)

`src/motor/tuberias/presion/resolverPerdidaLocalizadaEstimadaDeCamino.ts`
recorre `camino.tramos` desde la raíz del Local hasta el terminal. En
cada tramo:
- si es la entrada común del grupo (Local, Red) → suma la llave de paso
  (K=9,18) con la V de ESE tramo;
- si su nodo de origen tiene 1 tramo entrante y 2 salientes (tee real
  1→2) → suma una singularidad de tee (K=3,00) con la V del tramo
  SALIENTE recorrido (CRIT-A31, sin clasificar recta/lateral);
- si es el último tramo del camino (alimenta directo al terminal) →
  suma la singularidad terminal (K=1,35) con la V de ese tramo.

Un fan-out 1→N (más de 2 salientes desde un nodo con 1 entrante) se
diagnostica ANTES de calcular componentes y devuelve `incompleta` con
motivo `derivacionMultipleNoModelada` — nunca hf parcial ni ficticia.

Verificado numéricamente (script de scratch, no persistido, sobre el
fixture `hydEst.fixture.ts` con 4 terminales en 2 ramas explícitas):
variando el DN del tramo `intermedio-a` (rama de terminal-0/terminal-1):

| DN      | V (m/s) | hf distribuida | hf localizada terminal-0 (misma rama) | hf localizada terminal-2 (rama independiente) |
|---------|---------|-----------------|----------------------------------------|--------------------------------------------------|
| 20 mm   | 3,070   | 1,427           | 4,184                                   | 3,136                                             |
| 25 mm   | 1,965   | 0,481           | 3,333                                   | 3,136                                             |
| 32 mm   | 1,183   | 0,140           | 2,957                                   | 3,136                                             |
| 50 mm   | 0,486   | 0,016           | 2,779                                   | 3,136                                             |
| 75 mm   | 0,215   | 0,002           | 2,750                                   | 3,136                                             |
| 110 mm  | 0,100   | 0,000           | 2,744                                   | 3,136                                             |
| 125 mm  | 0,081   | 0,000           | 2,744                                   | 3,136                                             |

Confirma el contrato exacto pedido: al crecer el DN, V y hf distribuida
de la rama caen y se aplanan (nunca forzadas a 0 si no corresponde); la
hf localizada de la MISMA rama cae y se aplana con ellas (no queda
congelada por una Vref terminal global); la rama independiente
(terminal-2) permanece exactamente en `3,136` en todas las filas —
independencia de ramales confirmada.

## MEMOIZACIÓN POR UF

`sonPropsDeSeccionDeUnidadFuncionalEquivalentes.ts` →
`sonAportesCompartidosEquivalentes`: cuando cambia el conjunto de UF y el
método localizado es `estimado`, identifica los terminales cuya UF
cambió, resuelve sus caminos y los tramos de tee que atraviesan, y
compara contra los tramos de tee que atraviesan los propios caminos de
la UF de la tarjeta. Si no comparten ningún tramo de tee → la tarjeta NO
se invalida (rama independiente conservada). Si comparten uno → se
invalida y recalcula. Cubierto por
`sonPropsDeSeccionDeUnidadFuncionalEquivalentes.test.ts` (2 casos: tee
compartida invalida y cambia hf; rama independiente no invalida ni
cambia hf) — auditado y verificado correcto, no reescrito.

## BASELINES

`auditoriaTransversalM1M4.baseline.test.ts`: `canonico()` ahora atraviesa
por defecto `ejemploConBifurcacionesDefinidas` (antes: `proyectoInicial`
tal cual, con su fan-out 1→N sin resolver). Nuevo test explícito fija el
contrato sobre el demo ORIGINAL (con fan-out): M2 incompleto por
`derivacionMultipleNoModelada`, margen crítico `undefined`, M1/M3/M4
intactos frente al canónico. El margen del canónico (ahora con
bifurcaciones explícitas) pasa de `-17,664` a `-20,164 m.c.a.` (legítimo,
ver arriba).

`escalaDelMotor.regresion.test.ts`: el fixture de escala (14 UF × 3
locales) tiene fan-out 1→N real: la precondición pasó de "M2 completo" a
"M2 incompleto por `derivacionMultipleNoModelada`", conservando la
verificación de escala (>200 terminales).

`verificacionLongitudVerticalPorNivel.test.ts`: el fixture pasó de un
nodo `n0` con 3 salientes (AF UF1, AF UF2, ACS — fan-out no declarado) a
`n0` → `n-af-ramas` (nodo de distribución AF explícito) → cada UF, cada
bifurcación real 1→2. Preserva la intención original (verificar longitud
vertical por nivel) sin depender de fan-out no modelado.

## E2E

`tests/e2e/hydEst.spec.ts` (nuevo, desktop+mobile, verificado contra
`vite` dev local — `IUAS_BASE_URL=http://localhost:5199/`):
1. "Alimentación general" (tramo troncal, no fan-out): DN↑ dos veces baja
   V y hf distribuida monótonamente; DN↓ dos veces vuelve exactamente a
   los valores originales (reversibilidad).
2. "Baño 1 · Agua fría" del demo (fan-out 1→N real): fila `⚠ Incompleto`,
   texto "localizada incompleta", hf DISTRIBUIDA con número real visible,
   sin `NaN`/`undefined`/`[object Object]`.

Regresión dirigida existente sin cambios de selector necesarios, **19/19
verde** contra `vite` dev: `smoke.spec.ts`, `montantes.spec.ts` (8 casos),
`hallazgos.spec.ts` (4 casos: FIX-LEAK-01/02, FIX-CRASH-01,
FIX-CRASH-M3-INDUSTRIAL-01), `responsive.spec.ts` (6 casos).

## TESTS EJECUTADOS Y RESULTADO

- Vitest completo: **1797/1797** (174→175 archivos), subiendo desde el
  baseline pre-slice de 1784/1784.
- `npx tsc -b`: limpio.
- `npm run e2e:typecheck`: limpio.
- `npm run build`: limpio (mismo warning preexistente de tamaño de chunk,
  no relacionado).
- `npx eslint .`: **11 problemas** (los 11 son de severidad `error` en la
  config actual de ESLint; 0 son nuevos), en archivos no tocados por este
  slice (`MotorDemandaPantalla.tsx`, `actualizarRedHidraulica.ts`,
  `AccesoriosDeTramoEditor.tsx`, `ResultadoHidraulicoDeTramo.tsx`,
  `duplicarUnidadFuncional.test.ts`,
  `resolverHidraulicaDeTramo.pisoCaudalIndividual.golden.test.ts`),
  confirmado por `git log` sobre esos archivos (última modificación en
  commits ajenos a HYD-EST). **Aclaración de la discrepancia reportada**
  ("11 warnings / 0 errors" vs. "11 errors / 0 warnings"): no es un
  cambio de severidad ni una regresión — es una lectura incorrecta de la
  notación **`ESLint 11/0/0`** que el propio ROADMAP/PENDIENTES usa de
  forma consistente en decenas de entradas anteriores (verificado con
  `grep`): significa **"11 problemas preexistentes / 0 warnings NUEVOS /
  0 errores NUEVOS"**, no "11 warnings, 0 errores" en términos absolutos.
  Los 11 problemas siempre fueron de severidad `error` (no `warning`) en
  esta config de ESLint; el resultado de este slice (`11/0/0`) es
  exactamente el mismo baseline que todas las entradas previas del
  proyecto — sin regresión ni discrepancia real.
- E2E dirigido: **21/21** verde (19 regresión existente + 2 nuevos de
  HYD-EST), desktop+mobile, contra `vite` dev.

## GATE DE FUZZ — RESULTADO FINAL (confirmado, todo verde)

Corrido contra `vite` dev (`http://localhost:5199/`), proyecto `desktop`,
`STEPS=30` en todos los casos:

- **Gate 20×30 requerido, seed base `424242`:** runs 0–9 (primer batch,
  18,4 min) + runs 10–19 (segundo batch, 6,2 min) = **20/20 verde**, 600
  pasos totales sin ningún fallo.
- **Seeds históricos de la consigna:**
  - `34493241441-1:15` (FIX-CRASH-M3-INDUSTRIAL-01) — **1/1 verde**.
  - `34411681277-1:0` (FIX-CRASH-01) — **1/1 verde**.
  - `34398035608-1` runs 0–12 (FIX-LEAK-02) — **13/13 verde**.
  - `m7`, `m42`, `m99` (seeds que ejercen acciones de montante,
    documentadas en `PENDIENTES-DE-ARQUITECTURA.md` línea ~10680) —
    **3/3 verde**, un run cada una.
- **Total: 38/38 runs de fuzz verdes**, cero regresiones de HYD-EST
  detectadas por el harness (sin pantalla blanca, sin `pageerror`, sin
  `console.error`, sin valores rotos, sin overflow).

Nota de proceso: el primer intento de este gate se lanzó como
`RUNS=10` (no `RUNS=20`) por error — quedó corregido relanzando runs
10–19 con `IUAS_FUZZ_START_RUN=10 IUAS_FUZZ_RUNS=20` para completar
exactamente el 20×30 requerido (mismo patrón que usa el propio
`QA-FUZZ.md` §4 para partir un gate en dos corridas). Cada batch tardó
varios minutos reales (no es un colgado): confirmado con
`Get-CimInstance Win32_Process`/`Get-Process` que el árbol
coordinator→worker→chromium estaba vivo y con CPU activa durante la
espera aparentemente silenciosa (el reporter `list` no imprime nada
hasta que cada test individual termina).

## PUSH Y ESTADO GIT FINAL

Con el gate de fuzz 100% verde, se hizo `git push origin main`. Ver
sección ESTADO GIT más abajo para el hash final.

## PENDIENTE (fuera de esta sesión)

1. **Checkpoint cloud Nivel A** (el gate de QA Fuzz cloud vía GitHub
   Actions, `workflow_dispatch` de `.github/workflows/qa-fuzz.yml`): NO
   disparado desde esta sesión — no hay comando local para lanzarlo
   contra GitHub Actions sin intervención del usuario/CI; si el usuario
   quiere ese checkpoint, hay que dispararlo manualmente o vía `gh
   workflow run`.
2. **Deploy a GitHub Pages**: se activa automáticamente al pushear a
   `main` (pipeline existente del repo). NO verificado desde esta sesión
   si el workflow de deploy corrió y publicó con éxito, ni el HTTP 200 ni
   el smoke/E2E contra producción real — pendiente de confirmación.
3. **Validación manual del usuario** sobre el deploy (ver lista de pasos
   en la consigna original, sección de validación).

## ARCHIVOS MODIFICADOS EN ESTE SLICE (acumulado, ambas sesiones)

Motor: `contextoDeCalculoM2.ts`,
`presion/resolverPerdidaLocalizadaEstimadaDeCamino.ts` (nuevo + test),
`presion/hydEst.fixture.ts` (nuevo),
`presion/resolverPerdidaLocalizadaEstimadaDeLocal.ts` (+ test),
`presion/resolverPresionResidualDeCamino.ts` (+ test),
`presion/montanteTees.integracion.test.ts`,
`escalaDelMotor.regresion.test.ts`,
`presion/verificacionLongitudVerticalPorNivel.test.ts`.

Interfaz: `LocalYRedCard.tsx`, `TarjetaDeTerminal.tsx`,
`humanizarPerdidaEstimada.ts` (nuevo), `agruparMotivosDeModulo2.ts`,
`resolverFilaDeDimensionamiento.ts` (+ test),
`PanelDePresionCriticoUI.test.ts`, `resolverFilaDeTerminalParaTabla.test.ts`,
`sonPropsDeSeccionDeUnidadFuncionalEquivalentes.ts` (+ test),
`resolverResumenDeProyecto.test.ts`.

Fixtures: `src/pruebas/fixtures/ejemploConBifurcacionesDefinidas.ts` (nuevo).

Docs: `ROADMAP.md` (D-δ.112), este handoff.

E2E: `tests/e2e/hydEst.spec.ts` (nuevo).

Tests transversales: `auditoriaTransversalM1M4.baseline.test.ts`.

## ESTADO GIT

`main` local y `origin/main` **sincronizados** tras el push de esta
sesión. Cadena de commits sobre la base `85c3e08`:
`ac0d839` → `cf0e113` → `7b73e3d` → `f81fc23` → `a2f84d6` (handoff
intermedio) → commit final de este handoff. Tree limpio. Ver el hash
exacto de HEAD en el resultado del `git push` de esta sesión.

## SIGUIENTE ACCIÓN EXACTA

1. Confirmar que el workflow de deploy a GitHub Pages corrió y publicó
   con éxito tras el push (Actions del repo).
2. Verificar HTTP 200 de la URL de producción y correr smoke/E2E
   dirigido contra producción real (no sólo contra `vite` dev, que es lo
   que cubrió esta sesión).
3. Si el usuario quiere el checkpoint cloud Nivel A (QA Fuzz vía GitHub
   Actions `workflow_dispatch`), dispararlo — no se disparó desde esta
   sesión por no haber un comando local que lo haga sin intervención del
   usuario/CI.
4. Pedir al usuario la validación manual descripta en la consigna
   original (abrir Baño/AF/Estimadas, subir/bajar DN, revisar presión
   residual, revisar un caso 1→N incompleto).
5. Declarar `HYD-EST-01: CERRADO — pendiente validación manual` recién
   con 1–2 confirmados (o documentados como no verificables desde esta
   sesión) y 4 hecho.

## CRITERIO DE CIERRE

hf afectada responde a DN (✅ verificado numéricamente); ramales no
afectados conservan su contribución (✅ verificado); 1→N incompleto por
decisión explícita (✅ implementado y testeado); Detalladas intacto (✅);
presión correcta (✅); todos los tests/gates locales verdes, **incluido
el fuzz 20×30 + 6 seeds históricas = 38/38** (✅); push a `origin/main`
(✅); deploy a GitHub Pages y validación manual (⏳ pendientes, fuera del
alcance de esta sesión — requieren el workflow de CI/Pages y al usuario).

**Estado actual: `HYD-EST-01: CERRADO — pendiente validación manual y
confirmación de deploy`.** Implementación, QA local completa (unit +
integration + E2E dirigido + tsc + build + lint) y el gate de fuzz
completo (20×30 + históricos) están verdes y pusheados. Sólo restan
pasos que dependen de GitHub Actions/Pages y de la revisión manual del
usuario sobre el sitio publicado.
