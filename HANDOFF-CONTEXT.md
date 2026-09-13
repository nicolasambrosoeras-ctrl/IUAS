# HANDOFF — FIX-HYD-EST-SIMPLIFIED-01

## BASE

- HEAD al iniciar este hotfix: `af37456` (cierre de HYD-EST-01, ya en
  `origin/main`).
- HEAD final, **pusheado y verificado == `origin/main`**: `9d2cba2`.
- Tree: limpio.

Commits de este hotfix:

```
af37456  (base — HYD-EST-01 cerrado)
edaf000  fix: FIX-HYD-EST-SIMPLIFIED-01 -- restaurar estimador agregado y corregir Vref al DN vigente
9d2cba2  docs: registrar FIX-HYD-EST-SIMPLIFIED-01 (D-delta.113) y cerrar HYD-EST-01   ← HEAD == origin/main
```

## ERROR DE HYD-EST-01

D-δ.112 (HYD-EST-01) convirtió el modo `Estimadas` en un cálculo
**path-aware**: cada terminal recorría su camino real, aplicaba una
singularidad de tee (K=3,00) en cada bifurcación 1→2 real que
atravesaba, y una singularidad terminal propia (K=1,35). Una derivación
1→N sin tee explícita declarada (ej. un Baño con 4 artefactos detrás de
una sola tee sin modelar) quedaba `Incompleto`
(`derivacionMultipleNoModelada`).

**La validación manual del usuario lo rechazó**: un Baño normal de 4
artefactos — el caso más común del dominio — quedaba permanentemente
`Incompleto` en `Estimadas`. Eso invertía el propósito del modo
estimado: una simplificación pensada para cuando el usuario NO releva la
disposición física, terminó exigiendo exactamente esa disposición física
para poder calcular algo.

**Diagnóstico real del bug histórico que había motivado HYD-EST-01**
(observado con DN 125 mm: V≈0 pero hf localizada clavada en ≈1,5
m.c.a.): nunca fue la plantilla agregada en sí (D-δ.40/D-δ.45), ni sus
coeficientes, ni la cardinalidad, ni la existencia de fan-out 1→N. El
problema era que `V_ref` se tomaba del **máximo** entre los tramos que
alimentan **directamente** cada terminal físico (los ramales más
profundos del árbol) — tramos DISTINTOS del Tramo **representativo** de
ese Local+red (el que el usuario efectivamente ve y edita en la fila de
Módulo 2). En granularidad `profesional` esos ramales tienen su propio
DN dimensionado de forma independiente del tramo de la fila, así que
subir el DN de la fila no cambiaba la V de los ramales profundos, y la
hf localizada quedaba desacoplada del DN que el usuario dimensionaba.

## MODELO FINAL ESTIMADAS

`resolverPerdidaLocalizadaEstimadaDeLocal.ts` — plantilla **agregada por
`(Local, red)`**, EXACTAMENTE la de D-δ.40/D-δ.45, sin ningún cambio de
cardinalidad ni de coeficiente:

Con `n = contarTerminalesFisicosDeLocal(redHidraulica, uf, local, red)`:

| Magnitud | Fórmula/valor | Origen |
|---|---|---|
| `nTeesEstimadas` | `max(0, n − 1)` | D-δ.40 |
| `Ks_tee` | `3,00` (`teeEntradaCentralSalidasLaterales`) | D-δ.40 |
| `nSingularidadTerminal` | `1` si `n ≥ 1`, si no `0` | D-δ.45 |
| `Ks_terminal` | `1,35` (`codo90`) | D-δ.45 |
| `nLlaveDePaso` | `1` si `n ≥ 1`, si no `0` | D-δ.45 |
| `Ks_llave` | `9,18` (`llaveDePaso`) | D-δ.45 |
| `Ks_equivalente` | `nTeesEstimadas·Ks_tee + Ks_terminal + Ks_llave` | D-δ.40/D-δ.45 |
| `hf_m` | `calcularPerdidaCargaLocalizada(Ks_equivalente, V_ref)` = `Ks·V_ref²/(2g)` | sin cambios |

Ejemplo Baño con 4 terminales: `Ktotal = 3·3,00 + 1,35 + 9,18 = 19,53`
(verificado por test unitario dedicado, ver TESTS).

`n = 0` sigue siendo el único cero real (no requiere resolver velocidad).

## VREF — fuente exacta (el fix)

**Antes (D-δ.40/D-δ.45, bug real):** `V_ref = MAX` de
`velocidadReal_mps` entre los tramos cuyo `nodoDestinoId` es un terminal
físico de ese Local+red (los ramales que alimentan CADA artefacto
directamente).

**Ahora (FIX-HYD-EST-SIMPLIFIED-01):** `V_ref` = `velocidadReal_mps` del
**Tramo REPRESENTATIVO** de ese `(Local, red)` —
`identificarTramosRepresentativosDeLocales` /
`obtenerTramosRepresentativosDeLocalesDeContexto`
(`motor/tuberias/topologia/identificarTramoRepresentativoDeLocal.ts`,
D-δ.44), reutilizado tal cual, sin duplicar lógica. Es el mismo tramo
"puro" de ese Local más cercano a la raíz — la identidad exacta detrás
de `FilaPrincipalDeLocal.tramoId`
(`interfaz/paginas/identificarFilasDeModulo2.ts`), que es la MISMA fila
que `resolverFilaDeDimensionamiento`/`resolverResultadoDeTramoParaUi`
usan para mostrar DN/V en la tabla de Módulo 2. **Es, literalmente, la
misma fuente de verdad hidráulica que ya usaba la UI** — no una fórmula
nueva ni un cálculo duplicado.

Si no existe un Tramo representativo para ese `(Local, red)` con
`n > 0` (caso no observado en ningún fixture ni en producción — la
reconciliación de red siempre crea una entrada de Local separada de la
distribución general), se lanza una excepción explícita
("inconsistencia interna"), mismo criterio que el resto del motor ante
precondiciones imposibles — no se inventa un valor.

## DN → V → HF: cadena de recálculo

`resolverDiametroComercialDeTramo(tramoRepresentativo)` (V real según DN
adoptado/manual/auto) → `resolverPerdidaDistribuidaDeTramo` (hf
distribuida, Hazen-Williams/Darcy, sin cambios) →
`resolverPerdidaLocalizadaEstimadaDeLocal` (Ks_equivalente · V_ref²/2g,
con V_ref del MISMO tramo representativo) →
`resolverPresionResidualDeCamino` (`Presidual = Pdisponible − Δz −
hfDistribuida − hfLocalizada − hfMedidor − hfEquipoACS`, sin cambios de
fórmula). Manual y Auto comparten el mismo camino de cálculo
(`resolverDiametroComercialDeTramo` no distingue origen del DN).

## FAN-OUT 1→N — confirmado calculable

Evidencia (E2E `tests/e2e/hydEst.spec.ts`, contra `vite` dev y contra
producción real): la fila "Baño 1 · Agua fría" del demo (4 artefactos
detrás de una tee 1→4 sin modelar) muestra `4,078 m.c.a.` con badge `✓`
— nunca `Incompleto`, nunca `derivacionMultipleNoModelada`. Subir el DN
de esa fila baja la hf localizada mostrada. La topología 1→N sigue sin
representar la disposición física real (no se infiere ni se inventa);
la plantilla simplemente no necesita esa geometría. `Detalladas` sigue
pudiendo marcar `derivacionMultipleNoModelada` cuando corresponda (ajeno
a este slice, ver `acumularPerdidaLocalizadaDeCamino`/
`resolverClasificacionDeTee`, no tocados).

## DN125 — tabla numérica (Baño 1→4 terminales, Tramo representativo)

Script de verificación (temporal, no persistido) sobre un fixture con
Tramo representativo `te` (entrada del Local) alimentando 4 ramales
terminales, variando `dnComercialAdoptado` de `te`:

| DN | Di real (mm) | V (m/s) | hf distribuida | hf localizada | total |
|---|---|---|---|---|---|
| 20 mm | 14,4 | 3,191 | 2,298 | 10,133 | 12,431 |
| 25 mm | 18,0 | 2,042 | 0,775 | 4,150 | 4,926 |
| 32 mm | 23,2 | 1,229 | 0,225 | 1,504 | 1,729 |
| 50 mm | 36,2 | 0,505 | 0,026 | 0,254 | 0,280 |
| 75 mm | 54,4 | 0,224 | 0,004 | 0,050 | 0,053 |
| 110 mm | 79,8 | 0,104 | 0,001 | 0,011 | 0,011 |
| 125 mm | 88,9 | 0,084 | 0,000 | 0,007 | 0,007 |

**Antes del fix**, la hf localizada de esta fila era prácticamente
constante (Vref tomada de un ramal ajeno al tramo cuyo DN se cambiaba) —
el caso reportado por el usuario (DN 125, V≈0, hf localizada≈1,5 m.c.a.
clavada). **Después del fix**, hf localizada cae monótonamente con el
DN de la fila y se aplana hacia valores muy pequeños en DN grandes —
exactamente el comportamiento esperado, sin forzar artificialmente un
piso ni un cero.

## MEMOIZACIÓN

`sonPropsDeSeccionDeUnidadFuncionalEquivalentes.ts` vuelve a su
comparador simple pre-D-δ.112 (revertido byte a byte a la versión previa
a HYD-EST-01): compara UF propia, tramos, configuración, tipo de
proyecto, `onCambiar`. **No hay lógica de tees compartidas entre UF**
porque ya no hace falta: `V_ref` depende únicamente del Tramo
representativo del **propio** `(Local, red)` de la tarjeta — nunca de
otra UF ni de un tramo troncal compartido. Confirmado explícitamente por
el test de aislamiento en `resolverPresionResidualDeCamino.test.ts`
("tramo de un terminal HERMANO... NO invalida la estimación de otro
terminal"): agregar un tercer terminal hermano con demanda extrema
(imposible de resolver comercialmente) no cambia ni la Vref ni el
resultado del terminal consultado — sólo el conteo `n`/`nTeesEstimadas`,
que es aditivo y determinista.

## PRESIÓN

`Presidual = Pdisponible − Δz − hfDistribuida − hfLocalizada − hfMedidor
− hfEquipoACS`, sin cambio de fórmula (`resolverPresionResidualDeCamino.ts`
revertido a su versión pre-D-δ.112). Verificado: el baseline transversal
recalcula el margen del crítico con la nueva Vref
(`-17,664` → `-19,437 m.c.a.`, sigue NO CUMPLE — resultado legítimo, no
una regresión). El E2E confirma que subir el DN de una fila cambia la
presión indirectamente vía hf localizada.

## TESTS — resultado final

| Gate | Resultado |
|---|---|
| Vitest | **1785/1785** (174 archivos) |
| `tsc -b` | limpio |
| `npm run e2e:typecheck` | limpio |
| `npm run build` | limpio |
| `npx eslint .` | **11 problemas, 0 nuevos** (mismo baseline preexistente, archivos ajenos a este slice) |
| E2E dirigido (`tests/e2e/hydEst.spec.ts`, reescrito) | 2 casos × desktop/mobile, contra `vite` dev y contra producción real |
| E2E regresión (dev local) | `smoke`, `montantes` (8), `hallazgos` (4), `responsive` (6) → **19/19** |
| E2E contra producción real | `smoke` + `hydEst` → **6/6** (desktop + mobile) |
| Fuzz 20×30 (seed `424242`) | **20/20** (runs 0–9 y 10–19, dos batches) |
| Fuzz seeds históricas | `34493241441-1:15` (1/1), `34411681277-1:0` (1/1), `34398035608-1` runs 0–12 (13/13), `m7`/`m42`/`m99` (3/3) |
| **Total fuzz** | **38/38 runs verdes**, 0 regresiones detectadas |

## DOCS

D-δ.113 registrado en `ROADMAP.md` (después de D-δ.112, con una nota de
corrección explícita agregada al final de la propia entrada D-δ.112 —
no se ocultó el intento anterior). `PENDIENTES-DE-ARQUITECTURA.md`
recibió una sección nueva ("D-δ.112 / D-δ.113 — cierre de HYD-EST-01")
que conecta con el análisis original de D-δ.90 (el rediseño recta/lateral
diferido a M2-TOPO-01 **sigue sin implementarse**, no se reabre por este
cierre).

## COMMITS

- `edaf000` — fix: revierte el código muerto del intento path-aware
  (elimina `resolverPerdidaLocalizadaEstimadaDeCamino.ts`+test,
  `hydEst.fixture.ts`, `ejemploConBifurcacionesDefinidas.ts`,
  `humanizarPerdidaEstimada.ts`; revierte a su versión pre-D-δ.112
  `LocalYRedCard.tsx`, `TarjetaDeTerminal.tsx`,
  `agruparMotivosDeModulo2.ts`, `resolverFilaDeDimensionamiento.ts`,
  `sonPropsDeSeccionDeUnidadFuncionalEquivalentes.ts`,
  `contextoDeCalculoM2.ts`, `resolverPresionResidualDeCamino.ts`) y
  aplica el fix real (Vref del Tramo representativo) en
  `resolverPerdidaLocalizadaEstimadaDeLocal.ts`, con sus tests
  adaptados/nuevos. Reescribe `tests/e2e/hydEst.spec.ts`.
- `9d2cba2` — docs: D-δ.113 + corrección de D-δ.112 en ROADMAP.md y
  PENDIENTES-DE-ARQUITECTURA.md.

## GIT FINAL

- HEAD: `9d2cba2db3d6ad1d16a6fe1affc73f94e2a08e12`.
- `origin/main`: sincronizado (confirmado `git fetch` +
  `git rev-parse HEAD`/`origin/main` iguales).
- Tree: limpio (`git status --short` vacío, `git diff --check` limpio).

## DEPLOY

- Workflow `Deploy static content to Pages` (run `34729299317`,
  disparado automáticamente por el push a `main`): `status: completed`,
  `conclusion: success`.
- `https://nicolasambrosoeras-ctrl.github.io/IUAS/` → HTTP **200**.
- Smoke + E2E dirigido de este hotfix contra producción real: **6/6
  verde** (desktop + mobile), sin `IUAS_BASE_URL` (default de producción
  de `playwright.config.ts`).
- Checkpoint cloud Nivel A (QA Fuzz vía GitHub Actions
  `workflow_dispatch`): no disparado desde esta sesión (sin `gh`/token
  disponible); no bloqueante dado que el gate local 20×30 + históricos +
  producción ya está verde.

## VALIDACIÓN MANUAL PEDIDA

En producción (`https://nicolasambrosoeras-ctrl.github.io/IUAS/`):

1. Abrir Baño / AF / Estimadas.
2. Confirmar que YA NO aparece `Incompleto`.
3. Confirmar que se ve algo como `4 terminales · 3 tees estimadas ·
   hf localizada: X,XXX m.c.a.` (el copy exacto es el histórico de
   `LocalYRedCard.tsx`, restaurado sin cambios).
4. Anotar la hf localizada con el DN inicial (20 mm).
5. Subir el DN varias veces (`↑`) y comprobar que la hf localizada baja.
6. Si la UI lo permite, llegar a un DN grande (110/125 mm) y confirmar
   que la hf localizada YA NO queda clavada alrededor de 1,5 m.c.a. —
   debe seguir bajando hacia valores pequeños.
7. Bajar nuevamente el DN y confirmar que los valores vuelven a subir
   (reversibilidad).
8. Revisar que la presión residual del terminal crítico se actualice en
   consecuencia.

## VALIDACIÓN MANUAL — CONFIRMADA

El usuario validó manualmente sobre producción: la hf localizada
estimada responde correctamente al subir/bajar el DN de la fila (Baño /
AF / Estimadas), sin quedar `Incompleto`.

## ESTADO

**`FIX-HYD-EST-SIMPLIFIED-01: CERRADO`. `HYD-EST-01: CERRADO`.**

El estimador simplificado histórico quedó restaurado exactamente (misma
plantilla, mismos coeficientes, misma cardinalidad) y la única corrección
real — la fuente de `V_ref` — ata la hf localizada estimada al DN que el
usuario efectivamente dimensiona en cada fila de Módulo 2. El fan-out
1→N vuelve a ser calculable sin necesidad de topología relevada.
Unit/integration (1785/1785), `tsc`/`build`/`eslint` (baseline sin
cambios), E2E dirigido y de regresión (19/19 local + 6/6 producción), y
el gate de fuzz completo (20×30 + 6 seeds históricas = 38/38) están
verdes. Push, deploy, verificación de producción y validación manual del
usuario completados. Slice cerrado sin pendientes.
