# HANDOFF DE CONTEXTO

## OBJETIVO DEL SLICE

HYD-EST-01 Nivel A: reemplazar hf estimada agregada/Vref por pérdidas de
singularidades del camino usando velocidades reales actuales; DN manual,
Auto y presión deben reaccionar. Terminar QA, fuzz/cloud, push y Pages
antes de declarar cierre. Este archivo es un checkpoint, NO un cierre.

Consigna original: attachment
`C:/Users/ambroso/.codex/attachments/710ea81d-4116-48c9-a7ff-93b456906e12/pasted-text.txt`
(leer UTF-8 si hace falta recuperar criterios completos).

## BASE

Rama main. HEAD inicial y origin/main, verificados con fetch:
`85c3e08cd99467d28c90c20b0624b4f46ea6c96c`. Tree inicial limpio.
Vitest inicial 1784/1784. No reset/rebase ni cambios ajenos descartados.

## DECISIONES CERRADAS

- Usuario autorizó A: 1→N `derivacionMultipleNoModelada` deja hf localizada
  y presión incompletas; nunca fallback agregado ni cadena ficticia de tees.
- Usuario autorizó B: singularidad K=1,35 POR terminal físico, exclusiva
  de su camino, V de su alimentador. Sustituye cardinalidad 1/Local de D-δ.45.
- Conservar K tee 3,00, K llave 9,18, K final 1,35. No Table 7 nueva.
- CRIT-A31 ya fija V del saliente recorrido para tee (incluye variante K=3).
  Se reutiliza esa convención; no se infiere recta/lateral.
- Detalladas intactas; sin accesorios persistidos, reductores ni topología nueva.
- Autonomía autorizada para implementación, pruebas, docs, commits, QA y deploy.
  STOP sólo por nueva decisión física/normativa roja real o límite de contexto.

## ARQUEOLOGÍA REALIZADA

Historial estimador: `2b24d82` (D-δ.40), `f643924` (D-δ.45),
`0b59405` (contexto PERF-SCALE). D-δ.90 difirió el rediseño; D-δ.96
desbloqueó las topologías físicamente representadas, no 1→N.
El ejemplo tiene n-af-1 con cuatro salidas y otras derivaciones múltiples
aguas arriba. No sólo Baño: varios caminos pueden quedar incompletos.

Revisados: estimador, conteo terminales, acumulador Detalladas, CRIT-A31,
modelo Nodo/Tramo, clasificador 1→N, recorrido hacia origen, presión,
contexto M2, resumen UI, fila de dimensionamiento, controles DN y memos.

## MODELO HIDRÁULICO RECONSTRUIDO

Antes: n−1 tees + una singularidad final + una llave por Local/Red;
K total por máxima V de terminales; un hf para todos los caminos.
Cambiar un tramo común podía no modificar ninguno de esos alimentadores.

Ahora: suma K_i V_i²/(2g). Tee por bifurcación real 1→2 recorrida con V
saliente; final propio; llave en entrada común exclusiva de Local/Red.
La entrada prioriza la frontera representativa existente de M2. Si sólo
existe un tramo común (red mínima desde raíz), usa ese tramo único. Si
no hay entrada inequívoca, retorna `entradaLocalNoIdentificable`.
Fan-out 1→N se diagnostica antes de resolver componentes, sin hf parcial.

Índice local a ContextoDeCalculoM2: grupos Local/Red, caminos, pertenencia
terminal, alcance común. O(nodos+tramos+suma profundidades) para el índice
nuevo, más la clasificación representativa existente y cacheada. No cache
global ni persistencia. Cada edición crea nuevo contexto.

## IMPLEMENTADO

- Resolver nuevo por camino con traza tipo/nodo/tramo/K/V/hf.
- Resumen Local/Red devuelve caminos individuales, no hf_m/Vref escalar.
- Presión integra nueva hf; rama Detalladas no modificada.
- UI por terminal y desglose K/V/hf; causas legibles sin IDs.
- Fila Local/Red muestra distribuida separada y localizada por recorrido,
  sin elegir un total máximo o crítico arbitrario.
- Pruebas DN20→125, reversibilidad/Auto, ramales independientes, 4
  terminales binarios, N finales/3 tees únicas, no persistencia,
  separación Detalladas, diferencia exacta de presión, otra UF/AC aislada.
- D-δ.112 en implementación, nota D-δ.45 sustituida, ROADMAP actualizado.

## PENDIENTE

1. Auditoría de memo por UF: ahora Estimadas lee singularidades AGUAS
   ARRIBA del Local. Cambios de demanda de otra UF conectada pueden alterar
   V de un tramo compartido. `sonPropsDeSeccionDeUnidadFuncionalEquivalentes`
   compara uf propia/tramos/configuración/tipoProyecto/nodos.tee; podría
   saltar un render si sólo cambió la demanda de otra UF. Confirmar con
   fixture válido y corregir/testear según dependencias físicas reales;
   no invalidar indiscriminadamente al agregar una UF vacía.
2. Completar suite global. Última corrida completa intermedia: 15 fallos;
   resolverFilaDeDimensionamiento y montanteTees ya corregidos y verdes.
   Restan expectativas de estos archivos (no afirmar que todos son sólo copy):
   - src/auditoriaTransversalM1M4.baseline.test.ts: 8 casos. Demo ahora
     incompleto por fan-out; preservar sensibilidad de M1/M3/M4 y cobertura
     numérica de presión en un fixture físicamente válido separado. No
     sustituir números por undefined de forma que debilite la prueba.
   - src/interfaz/paginas/resolverResumenDeProyecto.test.ts: margen del
     canónico debe quedar pendiente por incompletitud autorizada.
   - src/motor/tuberias/escalaDelMotor.regresion.test.ts: precondición
     completo ya no vale para fixture fan-out; no perder los guards de
     cálculos/índices/traversals. Otras 6 pruebas pasaron en corrida intermedia.
   - src/motor/tuberias/presion/verificacionLongitudVerticalPorNivel.test.ts:
     3 casos, fixture n0 tiene 3 salientes (AF UF1, AF UF2, ACS). Preservar
     pruebas de altura/fricción en fixture explícito válido, sin tocar
     constructor/topología de producción ni inventar fallback hidráulico.
3. Ampliar tests: AF/AC mismo Local, críticos deterministas y cambios de
   crítico, velocidades irresolubles propias vs hermano, topología no
   resoluble, UI incompleta con DN/V/distribuida aún visibles. Revisar si
   faltan pruebas antiguas útiles tras sustituir tests del estimador agregado.
4. E2E HYD-EST con fixture válido (2 o 4 terminales binarios), ↑/↓/Auto y
   presión; demo 1→N incompleto; desktop/mobile. No E2E creado todavía.
5. Tabla numérica antes/después DN normal/mayor/125 pendiente de registrar.
6. QA Nivel A completa: vitest, tsc, e2e:typecheck, build, eslint; E2E
   HYD-EST/M2/presión/montantes/smoke; fuzz 20×30 y seeds documentados
   424242, 34493241441-1:15, 34411681277-1:0, 34398035608-1, m7/m42/m99.
   Leer QA-FUZZ.md y workflows existentes; no inventar comandos del gate.
7. Completar docs (incluida BASELINE-FUNCIONAL-M1-M4.md al cambiar su test).
   Auditar comentarios históricos aún presentes sobre agregado/tabla fila.
8. Con QA verde: commits finales, push main, checkpoint cloud Level A,
   Pages success/asset nuevo/HTTP200/smoke/E2E contra producción real.
9. Handoff FINAL completo conforme a §40 de consigna original; pedir sólo
   validación manual concreta y declarar cerrado sólo tras todos los gates.

## ARCHIVOS MODIFICADOS

Motor:
- src/motor/tuberias/contextoDeCalculoM2.ts
- src/motor/tuberias/presion/resolverPerdidaLocalizadaEstimadaDeCamino.ts (nuevo)
- src/motor/tuberias/presion/resolverPerdidaLocalizadaEstimadaDeCamino.test.ts (nuevo)
- src/motor/tuberias/presion/hydEst.fixture.ts (nuevo)
- src/motor/tuberias/presion/resolverPerdidaLocalizadaEstimadaDeLocal.ts
- src/motor/tuberias/presion/resolverPerdidaLocalizadaEstimadaDeLocal.test.ts
- src/motor/tuberias/presion/resolverPresionResidualDeCamino.ts y .test.ts
- src/motor/tuberias/presion/montanteTees.integracion.test.ts

Interfaz (src/interfaz/paginas): LocalYRedCard.tsx, TarjetaDeTerminal.tsx,
humanizarPerdidaEstimada.ts (nuevo), agruparMotivosDeModulo2.ts,
resolverFilaDeDimensionamiento.ts y .test.ts,
PanelDePresionCriticoUI.test.ts, resolverFilaDeTerminalParaTabla.test.ts.
Los dos últimos sólo actualizan traza estimada de mocks a porSingularidad.
Docs: ROADMAP.md, PENDIENTES-DE-ARQUITECTURA.md, este handoff.

## TESTS EJECUTADOS

- Baseline antes de cambios: 1784/1784, 174 archivos.
- Suite global intermedia: 1776/1791, 15 fallos (6 archivos), 41,95s.
  No se repitió global tras los últimos ajustes; NO es el estado final.
- Último bloque dirigido: 88/88, 7 archivos, 2,62s. Incluye nuevo resolver,
  resumen Local/Red, presión, montanteTees, fila dimensionamiento,
  agruparMotivos y ResultadoHidraulicoDeTramo.
- Último `npx tsc -b`: PASS (exit 0).
- `git diff --check`: PASS antes del checkpoint.
- Aún no e2e:typecheck/build/eslint/E2E/fuzz/cloud/producción.

Vitest en sandbox falla por spawn EPERM (Vite). Usar ejecución escalada
de `npx vitest run`; autorizaciones de la sesión ya permitieron correrlo.
git fetch también necesitó escalación por .git/FETCH_HEAD.

## ESTADO GIT

main. HEAD antes del checkpoint: 85c3e08cd99467d28c90c20b0624b4f46ea6c96c.
Se guarda este bloque en commit local de checkpoint, sin push. Confirmar
su hash y limpieza al retomar con `git log -1` y `git status --short`.
origin/main permanece en la base (no se publicó HYD-EST).

## SIGUIENTE ACCIÓN EXACTA

`git status --short --branch` y `git log -2 --oneline`; leer este handoff.
Después revisar `sonPropsDeSeccionDeUnidadFuncionalEquivalentes.ts` y su
test: construir caso binario con tramo saliente compartido por dos UF,
modificar demanda de una y comprobar que el resultado mostrado de la otra
no quede stale. Conservar el caso UF vacía sin rerender. Seguir con los
baselines fallidos listados, sin repetir la arqueología ya cerrada.

## RIESGOS / DECISIONES ROJAS

No hay una pregunta pendiente al usuario: las dos decisiones rojas están
resueltas. El posible memo stale descrito es una corrección de ingeniería
autorizada, no motivo de nueva aprobación. Las expectativas históricas de
1→N completo deben cambiar; no cambiar motor para recuperar esos números.
No tocar reglas de reconciliación, inventar topología, K ni reductores.
Revisar que el resumen UI con muchos terminales conserve usabilidad mobile.

## CRITERIO DE CIERRE ORIGINAL

HF afectada responde a DN; ramales no afectados conservan su contribución;
1→N incompleto por decisión explícita; Detailed intacto; presión correcta;
todos los tests/gates locales y cloud verdes; deploy validado; tree limpio
y HEAD==origin/main. Entonces, y sólo entonces:
`HYD-EST-01: CERRADO — pendiente validación manual`.

Estado actual: **EN IMPLEMENTACIÓN — CONTEXT HANDOFF READY**.
