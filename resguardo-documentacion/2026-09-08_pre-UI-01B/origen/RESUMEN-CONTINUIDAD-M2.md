# Resumen de continuidad — Módulo 2 (Tuberías)

Documento técnico operativo para abrir un **chat nuevo de Claude Code** sin
depender del historial de la conversación anterior. Todo lo que sigue fue
verificado contra el repo real al HEAD indicado, no reconstruido de memoria.

## HITO DE PAUSA — M2, primer vertical slice hidráulico completo visible

Este HEAD es un punto de pausa intencional del proyecto. El estado que
sigue documentado en todo este archivo se dejó así a propósito antes de
una pausa prolongada, con:

- la matemática base del pipeline hidráulico blindada por tests unitarios
  y por un golden end-to-end (G1, sección 11);
- resultados hidráulicos completos (Qc → diámetro comercial → velocidad →
  longitud → pérdida distribuida `hf`) visibles en pantalla por primera
  vez (L2), verificados manualmente en navegador real;
- una auditoría de cobertura física (S1) y una barrera de presentación
  (S2) que evitan mostrar un resultado de M2 incompleto de forma
  silenciosa;
- `ROADMAP.md` (nuevo) y `PENDIENTES-DE-ARQUITECTURA.md` sincronizados
  con las decisiones abiertas reales;
- deudas técnicas conocidas documentadas explícitamente (sección
  "Riesgos/preguntas abiertas"), no escondidas.

**Esto NO significa que Módulo 2 esté terminado.** Faltan, como mínimo:
pérdidas localizadas, origen hidráulico, balance de presión, presión
residual/mínima, camino crítico, selección/verificación definitiva de
clase de tubería, sincronización automática M1↔M2, UX definitiva, e
integración documental/PDF de M2. Ver `ROADMAP.md` para el desglose
completo por bloque.

No existe todavía ningún tag nuevo sobre este HEAD — ver sección "Estado
Git" para los tags protegidos vigentes, que no se movieron.

## 1. Estado Git

- **Branch**: `main`
- **HEAD**: `9832e809b6d70bd8909eefeae88528132d97cecc`
- **Mensaje del commit HEAD**: `test: blindar golden hidraulico completo por tramo`
- **`git status`**: `nothing to commit, working tree clean`
- **Commits adelante de `origin/main`**: 113
- **Tests**: 464/464 verdes, 53 archivos de test
- **`npx tsc -b`**: verde
- **`npm run build`**: verde. Warning conocido y aceptado: "Some chunks are
  larger than 500 kB after minification" — no es error, optimización
  pendiente sin urgencia.
- **Tags existentes que NO deben moverse**: `pre-modulo-2-2026-08-09`,
  `v0.1.0`, `v0.2.0-dev`, `v0.3.0-dev`. Ninguno se movió ni se creó uno
  nuevo durante todo el trabajo documentado en este archivo.

## 2. Metodología de trabajo obligatoria

Flujo estricto, sin excepciones, para cada incremento:

```
análisis
→ propuesta/alcance
→ aprobación explícita del usuario
→ implementación
→ tests/build
→ inspección de diff/status
→ aprobación explícita del usuario
→ commit
→ verificar working tree limpio
→ detenerse
```

Reglas duras:

- **Nunca autoaprobar ni hacer commit sin aprobación explícita del
  usuario**, incluso si el trabajo previo ya fue aprobado en general.
- Distinguir siempre, antes de empezar, si el incremento es **funcional**
  (modifica código, requiere tests) o **documental** (modifica solo
  `CRITERIOS.md`/`PENDIENTES-DE-ARQUITECTURA.md`/`RESUMEN-CONTINUIDAD-M2.md`/
  `ROADMAP.md`/similares, nunca requiere build/lint/tsc/tests). Anunciarlo
  explícitamente antes de empezar. Nunca mezclar ambos tipos en un mismo
  commit salvo acuerdo explícito puntual del usuario.
- Incrementos pequeños y verificables, uno por vez.
- No crear abstracciones preventivas ni infraestructura compartida sin un
  segundo caso de uso real ya en construcción. Preferir pequeña
  duplicación antes que una capa prematura (aplicado repetidas veces en
  este repo: fixtures de test duplicados a propósito, sin helpers
  compartidos entre archivos).
- Verificación TypeScript correcta: **`npx tsc -b`**, nunca
  `npx tsc --noEmit` (el tsconfig raíz usa project references; ese
  comando no recorre los subproyectos).
- No mover los tags listados arriba.
- Si aparece un archivo modificado/creado inesperado durante `git status`,
  detenerse y explicar antes de continuar.
- Si una implementación revela la necesidad de ampliar alcance (tocar un
  archivo no previsto, o descubrir una consecuencia no anticipada),
  detenerse y pedir aprobación antes de decidir unilateralmente qué hacer
  con ese hallazgo.
- Antes de cualquier commit: stagear únicamente los archivos del
  incremento aprobado, correr `git diff --cached --check` y
  `git diff --cached --stat`, e inspeccionar el diff completo.
- Después de cada commit: mostrar hash completo, resultado de
  `npx tsc -b`/`npm test`/`npm run build`, `git status --short`/`git status`,
  y confirmar working tree limpio.

## 3. Módulo 1 — Demanda (estable, no tocar sin necesidad real)

Fórmulas y decisiones vigentes:

```
Qmax = Σ(n·qu)
Kc = 1/√(n−1)   [n ≥ 2]
K = Kc·a
Qc = Qmax·K
```

**CRIT-A4** (n=1): `Qc = Qmax`; `Kc`/`K` quedan **indeterminados**, nunca
numéricos (nunca inventar un valor, ni `1`, para ese caso).

Invariantes que se mantienen:

- `K > 1` se conserva **sin cap** (CRIT-A2).
- `qu = 0` no participa en `n`.
- `qu = null` es un error de dominio (throw), nunca se convierte en `0`.
- CRIT-A8 (regla de válvula automática de inodoro) se aplica **después**
  del filtrado hidráulicamente activo, nunca antes.
- Nunca sumar `Qc` parciales para obtener un `Qc` mayor.

Golden/demo principal: proyecto demo de `MotorDemandaPantalla.tsx`
(`proyectoInicial`), 1 UF, 5 Locales, 11 artefactos normativos →
`Qmax = 2.3 l/s`, `Qc = 0.7273238618387272 l/s`. Esa igualdad exacta
**M1 = M2** sobre el tramo raíz (`t-general`) sigue vigente y probada en
`src/motor/tuberias/resolverHidraulicaDeTramo.integracionM1.test.ts` —
confirmada sin cambios a lo largo de todos los incrementos posteriores
(CRIT-A22, CRIT-A23, Correctivo 2B, S1, S2, L1, L2), y ahora extendida
por el golden end-to-end G1 en ese mismo archivo (sección 11). Casos
Golden G1/G2 de M1 documentados en `src/normativa/eras-2023/CASOS-GOLDEN.md`
(nomenclatura "G1"/"G2" de M1, **no confundir** con el golden "G1"
end-to-end de M2 descripto en la sección 11 de este documento — mismo
nombre, alcance distinto).

## 4. Modelo topológico M2 actual

`src/modelo/redHidraulica/index.ts` — **sin cambios** desde el resumen
anterior:

```typescript
export type ReferenciaDeArtefacto = {
  tipo: 'artefacto';
  unidadFuncionalId: string;
  localId: string;
  artefactoId: string;
};

export type ReferenciaDeProduccionACS = { tipo: 'produccionACS' };

export type ReferenciaDeNodo = ReferenciaDeArtefacto | ReferenciaDeProduccionACS;

export type Nodo = {
  id: string;
  referencia?: ReferenciaDeNodo;
  cota_m?: number;
};

export type RedDeTramo = 'AF' | 'AC';

export type Tramo = {
  id: string;
  nodoOrigenId: string;
  nodoDestinoId: string;
  red: RedDeTramo;
  longitud_m?: number;
};

export type RedHidraulica = {
  nodos: readonly Nodo[];
  tramos: readonly Tramo[];
};
```

`Proyecto.redHidraulica?: RedHidraulica` — **opcional**: ausente = proyecto
sin red topológica modelada todavía. La topología es la fuente de verdad
física del proyecto, ortogonal a la jerarquía funcional
`Proyecto → UnidadFuncional → Local → Artefacto`.

**`Tramo.longitud_m` ahora es editable productivamente desde la UI
transitoria de M2 (L1, sección 10)** — el tipo del modelo no cambió, pero
por primera vez existe un camino de escritura real desde la interfaz
hacia `redHidraulica`, antes solo definida estáticamente en el proyecto
demo.

### `Nodo.cota_m`

- Elevación geométrica del punto hidráulico, en metros, respecto de un
  datum común del Proyecto.
- Convención de esta primera versión: **cota 0 = nivel de vereda/acera**
  (documental, no persistida como campo aparte).
- **Opcional transitoriamente**: las topologías actuales no tienen
  geometría real todavía; no se inventa un valor solo para poblar el
  campo.
- **Ausencia ≠ cota 0.** Ningún consumidor debe asumir ese fallback.
- **Todavía no es editable desde la UI** (a diferencia de `longitud_m`,
  ver sección 10) — sigue siendo un dato solo del proyecto demo estático.

### `Tramo.longitud_m`

- Longitud física real de la tubería representada por el Tramo, en
  metros — el recorrido real instalado/previsto (vertical, horizontal,
  diagonal o con desvíos).
- **Opcional transitoriamente**, mismo criterio que `cota_m`.
- **Independiente de Δz** (Modelo B, adoptado explícitamente frente al
  Modelo A descartado de `|Δz| + desplazamiento horizontal`): no es
  proyección horizontal, no se deriva geométricamente de las cotas, no
  incluye longitud equivalente de accesorios, no es longitud ficticia de
  pérdidas localizadas.
- **Consumida productivamente** (N3): cuando está ausente,
  `resolverPerdidaDistribuidaDeTramo` devuelve `sinLongitud` explícito
  (ver sección 9) — nunca asume `0` ni la deriva de `Δz`.
- **Editable desde la UI transitoria de M2 desde L1** (sección 10):
  `conLongitudDeTramo(proyecto, tramoId, longitud_m)`, updater puro.
  Input vacío → `undefined` (la clave se omite del objeto, nunca
  `longitud_m: 0`).

## 5. Geometría — primitivas y validación

Sin cambios desde el resumen anterior. `src/motor/tuberias/geometria/calcularDiferenciaDeCota.ts`:

```typescript
export function calcularDiferenciaDeCota(cotaOrigen_m: number, cotaDestino_m: number): number {
  return cotaDestino_m - cotaOrigen_m
}
```

`Δz = z_destino − z_origen`. Signo **conservado**: `Δz > 0` = ascenso
(consume carga estática futura); `Δz < 0` = descenso (aporta carga
estática futura). **Nunca usa `Math.abs()`** dentro de esta función —
destruiría el signo.

`src/motor/tuberias/geometria/esLongitudGeometricamenteValida.ts`:

```typescript
const EPSILON_GEOMETRICO_M = 1e-9

export function esLongitudGeometricamenteValida(longitud_m: number, diferenciaDeCota_m: number): boolean {
  return longitud_m >= Math.abs(diferenciaDeCota_m) - EPSILON_GEOMETRICO_M
}
```

Predicado puro, sin `throw`, sin discriminated union — recibe números
explícitos, no `Nodo`/`Tramo`/`Proyecto`. El `Math.abs()` se usa
únicamente acá, para la comparación de magnitudes, nunca dentro de
`calcularDiferenciaDeCota`. El epsilon (`1e-9`) es exclusivamente
numérico (ruido de punto flotante), nunca tolerancia constructiva/de
medición.

Invariantes vigentes (CRIT-A20, `src/normativa/eras-2023/CRITERIOS.md`):

- `longitud_m > 0` si está informada (`longitud_m = 0` es inválido,
  independientemente de `Δz`).
- Si existen `longitud_m` y ambas cotas: `longitud_m ≥ |Δz|`.
- Datos geométricos parciales no inventan valores: nunca asumir cota
  ausente = 0 ni longitud ausente = `|Δz|`. La verificación de
  compatibilidad solo se evalúa cuando los tres datos están presentes.

**Estas validaciones ya se ejercitan realmente desde que `longitud_m` es
editable desde la UI (L1)**: un valor inválido cargado por el usuario
(`≤0`, o incompatible con cotas si las hubiera) es capturado por
`validarRedHidraulica`, que sigue siendo la única fuente de verdad — el
updater `conLongitudDeTramo` no duplica ninguna regla de validación.

Integrado en `src/validacion/redHidraulica/index.ts`
(`validarRedHidraulica`), con dos códigos de validación en
`src/validacion/codigos/index.ts`:
`redHidraulicaTramoLongitudNoPositiva` y
`redHidraulicaTramoLongitudIncompatibleConCota` (ambos severidad `error`).

Documentación: **CRIT-A20** (`CRITERIOS.md`) y **D-δ.22**
(`PENDIENTES-DE-ARQUITECTURA.md`, decisión arquitectónica del Modelo B).

## 6. Montante segmentada — Golden 4 (validado productivamente)

Sin cambios desde el resumen anterior. Archivo:
`src/motor/tuberias/resolverHidraulicaDeTramo.golden.test.ts`
("Golden 4 — montante segmentada").

Topología del caso:

```
n0 (cota 0)
  └─ segmentoA (longitud_m=3) → n1 (cota 3)
                                   ├─ derivación → lavatorio UF1
                                   └─ segmentoB (longitud_m=3) → n2 (cota 6)
                                                                    ├─ derivación → lavatorio UF2
                                                                    └─ segmentoC (longitud_m=3) → n3 (cota 9)
                                                                                                     └─ derivación → lavatorio UF3
```

Proyecto `viviendaMultifamiliar`, 3 UF (una por lavatorio), cada una con
un Local simple. Red exclusivamente AF.

Artefactos aguas abajo (por identidad completa, no solo conteo):

- segmentoA → UF1 + UF2 + UF3 (3)
- segmentoB → UF2 + UF3 (2)
- segmentoC → UF3 (1)

Valores exactos calculados a mano (sin invocar el motor):

| Segmento | n | Qmax | aEfectivo | Kc | K | Qc |
|---|---|---|---|---|---|---|
| C | 1 | 0,2 | — (CRIT-A4) | indeterminado | indeterminado | **0,2** |
| B | 2 | 0,4 | 2 | 1 | 2 | **0,8** |
| A | 3 | 0,6 | 2 | 1/√2 | √2 | **0,6·√2 ≈ 0,8485281374238571** |

Propiedad demostrada explícitamente: `Qc_A ≈ 0,8485281374238571`, **NO**
`Qc_B + Qc_UF1 = 0,8 + 0,2 = 1,0`. La simultaneidad no es lineal en `n`;
sumar Qc parciales da un resultado distinto (mayor) al de recalcular
sobre el conjunto real.

Documentación: **D-δ.23** (`PENDIENTES-DE-ARQUITECTURA.md`).

## 7. Topología / Qc / AF-AC — decisiones cerradas

Sin cambios desde el resumen anterior:

- `obtenerArtefactosAguasAbajo` (`src/motor/tuberias/topologia/`): DFS
  puro sobre `Tramo.nodoOrigenId → nodoDestinoId`, ACS es pass-through,
  artefactos son terminales, dedup por identidad completa UF+Local+
  Artefacto, ignora `Tramo.red` para recorrer.
- `resolverArtefactosReferenciados`: traduce `ReferenciaDeArtefacto` a
  las instancias reales del Proyecto. **Reutilizada también por S2**
  (sección 8) para humanizar referencias pendientes en la UI.
- `filtrarArtefactosComputables`: solo `origen === 'normativo'`.
- **CRIT-A8**: se aplica por UF+Local, solo locales domiciliarios, si hay
  inodoro-válvula activo participan solo las válvulas — **después** de
  filtrar participantes hidráulicamente activos, nunca antes.
- **CRIT-A13**: pipeline completo — computables aguas abajo → resolver
  `qu` hidráulico por tramo/artefacto → conservar `qu>0` → CRIT-A8 →
  contribuciones → n/Qmax/a/Kc/K/Qc.
- **CRIT-A14** (`a` efectivo): no multifamiliar → `a` base; multifamiliar
  con 1 UF participante → `a=1`; multifamiliar con >1 UF participante →
  `a=2`.
- **CRIT-A15**: `redHidraulica` es la representación física
  **autoritativa**. Ausencia de un terminal AC (o AF) significa que esa
  conexión **no existe físicamente**, no que falta modelar. Este es
  también el principio central detrás de S1/S2 (sección 8): un
  `Artefacto` de M1 que no tiene ninguna referencia física en
  `redHidraulica` no debe presentarse como resuelto por M2.
- `determinarConectividadFisica`/`determinarCondicionHidraulicaDeCaudal`:
  implementados y usados productivamente en todo el pipeline (ver
  `src/motor/tuberias/caudal/`).
- `t-af-acs` (demo) es alimentación **global** de AF al productor ACS de
  toda la vivienda.

## 8. Auditoría de cobertura física y barrera de presentación (S1/S2)

**Cerrado en los commits `254b860c3bae5fa3dcafd7c75b4c652a747a53dc`**
("feat: auditar cobertura fisica de artefactos", S1) **y
`368684555617103a24307d17c8c203957c7cd826`** ("feat: bloquear resultados
m2 con cobertura incompleta", S2).

### Decisión arquitectónica de fondo

- **M1 es autoritativo** sobre qué artefactos existen (identidad, tipo,
  cantidad).
- **`redHidraulica` es autoritativa** sobre cómo están conectados
  físicamente.
- Si M1 contiene un artefacto normativo que `redHidraulica` no
  referencia, **M2 debe considerarse incompleto** y no debe seguir
  presentando silenciosamente un resultado hidráulico como completo.
- **Ninguna alta de artefacto en M1 modifica `redHidraulica`**: es un
  hecho estructural verificado (`agregarArtefacto()` en
  `MotorDemandaPantalla.tsx` solo toca `local.artefactos`) — la nueva
  entidad queda invisible para M2 hasta que exista una referencia física
  real. Esto **no se corrige en este hito**: la sincronización
  automática queda diferida a propósito (ver D-δ.26 en
  `PENDIENTES-DE-ARQUITECTURA.md`).
- Simétricamente, **eliminar un artefacto ya referenciado** deja una
  referencia huérfana: `validarRedHidraulica` la detecta
  (`redHidraulicaReferenciaArtefactoInvalida`) y bloquea M1+M2 juntos
  hasta corregirla — comportamiento ya existente, no tocado por S1/S2.

### S1 — `auditarCoberturaFisica`

`src/motor/tuberias/cobertura/auditarCoberturaFisica.ts`:

```typescript
export interface AuditoriaDeCoberturaFisica {
  readonly completa: boolean
  readonly artefactosSinReferencia: readonly ReferenciaDeArtefacto[]
}

export function auditarCoberturaFisica(proyecto: Proyecto): AuditoriaDeCoberturaFisica
```

Función pura: recorre `proyecto.unidadesFuncionales` (artefactos
`origen === 'normativo'` únicamente — los `origen === 'usuario'` quedan
fuera, misma política que el resto del pipeline M2), compara contra las
claves `(unidadFuncionalId, localId, artefactoId)` presentes en
`redHidraulica.nodos[].referencia`, y devuelve la lista de artefactos sin
ninguna referencia física. `cantidad` no participa en la cobertura (una
identidad cubierta sigue cubierta con cualquier `cantidad`). Dos
referencias físicas del mismo artefacto (AF+AC) no producen duplicados.
No modifica `Proyecto` ni `redHidraulica`, no genera topología, no
repara nada.

### S2 — barrera de presentación en `ResultadoHidraulicoDeTramo.tsx`

Cuando `auditarCoberturaFisica(proyecto).completa === false`:

- `ConfiguracionHidraulicaFormulario` **sigue visible** (no es un
  resultado hidráulico, es configuración).
- Las tablas de resultados ("Distribución general" y por UF/Local) **no
  se renderizan** — ninguna fila llama a `resolverHidraulicaDeTramo` ni a
  `resolverPerdidaDistribuidaDeTramo`.
- Se muestra un aviso: título "Red hidráulica incompleta", texto
  singular/plural ("Hay 1/N artefacto(s) normativo(s) sin conexión física
  en la red hidráulica."), y una lista humanizada
  `UF → Local → Artefacto` (función pura `describirReferenciaPendiente`,
  exportada y testeada, reutiliza `resolverArtefactosReferenciados` +
  `ETIQUETA_TIPO_DE_LOCAL` + `catalogoArtefactos`).
- **M1 nunca se bloquea por esto** — `validacion.valido`, `validarProyecto`
  y `validarRedHidraulica` no se tocaron; S2 es una capa de presentación
  puramente local a M2.

## 9. Simultaneidad de Tramo — piso físico de caudal individual (CRIT-A22) y trazabilidad de `n`

**CRIT-A22 cerrado en el commit `a0f14dc7440b6c69fce554449ca7c0891e013e7d`**
("fix: aplicar piso de caudal individual por tramo") — sin cambios desde
el resumen anterior en cuanto a la fórmula/semántica del piso:

```
Qc_estadistico = resultado de la fórmula de simultaneidad vigente (sin cambios)
quMaxParticipante = max(qu_lps) sobre los aportes PARTICIPANTES FINALES del Tramo
Qc_final = max(Qc_estadistico, quMaxParticipante)
```

**Valor normativo especial que motivó este criterio — `inodoroValvula`**:
`quTotal_lps=1,5`, `quFria_lps=1,5`, `quCaliente_lps=0` (catálogo,
`src/normativa/eras-2023/catalogo-artefactos/`). **No reducir este `qu`
en el catálogo** — es precisamente este valor alto y aislado el que puede
convertirse en `quMaxParticipante` y actuar como piso físico de `Qc` en
un Tramo M2 cuando la fórmula estadística de simultaneidad daría, sin el
piso, un `Qc` menor a lo que esa única válvula necesita para operar.

`ResultadoSimultaneidadHidraulicaDeTramo`
(`src/motor/tuberias/simultaneidad/resolverSimultaneidadHidraulicaDeTramo.ts`)
— **ahora expone también `n`** (microincremento de trazabilidad, commit
`4ffb892bd1d3a268a87858504945afc7a1f411b4`, "feat: mostrar n hidraulico en
modulo 2"):

```typescript
export type ResultadoSimultaneidadHidraulicaDeTramo = Omit<ResultadoSimultaneidadDeTramo, 'qc_lps'> & {
  readonly n: number
  readonly qcEstadistico_lps: number
  readonly quMaxParticipante_lps: number
  readonly qc_lps: number
  readonly pisoCaudalIndividualAplicado: boolean
}
```

`n: agregacion.n` — valor ya calculado internamente por
`agregarAportesHidraulicosDeTramo` sobre los aportes **post-CRIT-A8**
(los mismos que ya determinan Qmax/aEfectivo/piso), simplemente expuesto
en el tipo de retorno. Cambio aditivo puro, sin ninguna fórmula nueva.

**Fórmula ya implementada** (sin cambios por este microincremento, solo
ahora visible en el tipo de retorno):

```
n    = Σ cantidad
Qmax = Σ (cantidad × qu)
```

`cantidad` multiplica **participación hidráulica** (`n`/`Qmax`), nunca
referencias topológicas: `Refs. físicas` (columna de la UI) sigue siendo
exclusivamente la cantidad de `ReferenciaDeArtefacto` distintas en la
topología (`obtenerArtefactosAguasAbajo(...).length`), ajena a
`cantidad`.

**Trazabilidad de `cantidad` en `n`, confirmada experimentalmente**
(reproducido en navegador real, dev server + Chromium):

```
base (demo original):        Refs. físicas = 11, n = 11, Qc ≈ 0,73
Lavatorio Baño cantidad 1→2:  Refs. físicas = 11, n = 12, Qc ≈ 0,75
restaurado a cantidad 1:      vuelve exactamente al estado base
```

`Refs. físicas` (columna de la UI) cuenta referencias físicas distintas
(`obtenerArtefactosAguasAbajo(...).length`, previo a CRIT-A8, ignora
`cantidad`); `n` es el hidráulico efectivo del motor (post-CRIT-A8,
refleja `cantidad`). Nunca coinciden cuando `cantidad ≠ 1` en algún
artefacto — **esto no es un bug**, es la distinción deliberada
introducida por este microincremento.

**Deuda técnica conocida — doble resolución del motor en la UI**: ver
sección 11.1 (L2).

`Qmax`/`Kc`/`K`/`aEfectivo` siguen calculándose exactamente igual. `K`
sigue sin capearse (CRIT-A2). CRIT-A8/A13/A14/A15 intactos.

Documentado en **CRIT-A22** (`CRITERIOS.md`).

## 10. Longitud física de Tramo editable desde M2 (L1)

**Cerrado en el commit `5c4fdbb1866ed1e086fd0affe394347a54746bd6`**
("feat: editar longitud de tramos en modulo 2").

**Primer punto de escritura productiva de la UI sobre `redHidraulica`**
en todo el proyecto — hasta este incremento, `redHidraulica` solo se
definía estáticamente en el proyecto demo.

`src/interfaz/paginas/actualizarRedHidraulica.ts`:

```typescript
export function conLongitudDeTramo(proyecto: Proyecto, tramoId: string, longitud_m: number | undefined): Proyecto
```

Updater puro e inmutable, mismo patrón que
`actualizarConfiguracionHidraulica.ts` (uno por campo, no un updater
genérico). Comportamiento:

- `redHidraulica === undefined` → no la inventa, devuelve el `Proyecto`
  sin cambios (misma referencia).
- `tramoId` inexistente → no-op silencioso (mismo criterio ya vigente en
  el resto de la UI para updaters por id: `local.artefactos.map(...)`,
  etc.).
- `longitud_m === undefined` → la clave se **omite** del `Tramo`
  resultante (destructuring, no `longitud_m: undefined`) — mismo
  criterio ya usado para vaciar `Local.regimen`. Nunca `0`.
- `longitud_m` numérico → reemplaza el campo, preserva el resto del
  `Tramo`, todos los demás Tramos, todos los Nodos, y el resto del
  Proyecto (por referencia, sin reconstruir lo que no cambió).
- **No deriva de `Δz` ni de cotas, no aplica ninguna validación propia**
  — `validarRedHidraulica`/CRIT-A20 (sección 5) siguen siendo la única
  fuente de verdad; un valor inválido cargado por el usuario bloquea
  M1+M2 juntos vía el gate de validación existente, mismo mecanismo que
  cualquier otro dato inválido del proyecto.

UI: input numérico opcional por fila, columna "Longitud [m]", en
`ResultadoHidraulicoDeTramo.tsx` (`TablaDeFilas`/`FilaResultado`).

## 11. Pérdida distribuida visible en M2 (L2) y golden end-to-end (G1)

### 11.1 L2 — tabla visible con Qc/diámetro/velocidad/longitud/hf

**Cerrado en el commit `4db31dae0d6ad66ceefaed3b6735312d67b6c3e1`**
("feat: mostrar perdida distribuida por tramo en modulo 2").

`FilaResultado` (`ResultadoHidraulicoDeTramo.tsx`) dejó de usar
únicamente `resolverHidraulicaDeTramo` como fuente productiva de la fila
y pasó a usar principalmente `resolverPerdidaDistribuidaDeTramo` (N3,
sección 12) para Qc/Di de referencia/Di comercial/Di efectivo/velocidad/
longitud/hf.

**Deuda técnica conocida y aceptada — doble resolución temporal**:
`ResultadoPerdidaDistribuidaDeTramo` (N3) **no expone `n`** en ninguna de
sus 4 variantes — `n` solo vive en
`ResultadoSimultaneidadHidraulicaDeTramo` (sección 9), que devuelve
`resolverHidraulicaDeTramo`. Por eso `FilaResultado` llama **a ambos
resolvers**: `resolverHidraulicaDeTramo` únicamente para leer
`simultaneidad.n`, y `resolverPerdidaDistribuidaDeTramo` para el resto de
columnas. No hay ninguna fórmula duplicada en la UI (ambas llamadas
consumen el motor real sin recalcular nada), pero sí hay **resolución
duplicada** — el pipeline se recorre dos veces por fila. Pendiente futuro
explícito: transportar la trazabilidad hidráulica necesaria (`n`, y
posiblemente `qmax_lps`) dentro del propio N3 para eliminar la doble
llamada. Ver D-δ.34 en `PENDIENTES-DE-ARQUITECTURA.md`.

**Columnas visibles actuales** de `TablaDeFilas` (tanto "Distribución
general" como las tablas por UF/Local):

```
Cañería/Local | Red | Refs. físicas | n | Qc [l/s] | Di de referencia [mm]
| Di comercial | Di efectivo [mm] | V [m/s] | Longitud [m] (editable, L1)
| hf [m.c.a.]
```

**Tratamiento de las 4 variantes de N3** (función pura
`textosDePerdidaDistribuidaDeTramo`, exportada y testeada en
`ResultadoHidraulicoDeTramo.test.ts`, sin JSX/DOM):

- `sinDemanda`: Qc real, el resto en `—`.
- `sinCandidatoAdmisible`: Qc + Di de referencia disponibles; comercial/
  efectivo/V/hf en `—`. **No es un error** — es un resultado de dominio
  válido y ya documentado (D-δ.25, sección 12).
- `sinLongitud`: Qc/Di de referencia/Di comercial/Di efectivo/V
  disponibles; `hf` en `—` (**nunca `0`**); el input de Longitud queda
  vacío.
- `conPerdidaDistribuida`: todos los campos, incluido `hf`, leídos
  directamente de `hf_m` — **sin ninguna conversión numérica** (el campo
  interno del motor sigue llamándose `hf_m`, en metros; la UI lo
  presenta como `hf [m.c.a.]` porque esa es la nomenclatura estándar de
  carga hidráulica, sin tocar el valor).

**`formatearNumero` ganó una unidad nueva** (`m`, 3 decimales) para
poder presentar `hf` — único cambio fuera de `interfaz/paginas/` que
requirió L2, en `src/exportadores/pdf/formatearNumero.ts`; no es motor ni
modelo, es el mismo utilitario de presentación ya usado por toda la
tabla.

### 11.2 Verificación manual en navegador real (t-general, L=5m)

Reproducida con dev server (`npm run dev`) + Chromium headless real
(Playwright), sin cambiar ningún archivo del repo:

| Columna | Sin longitud | Longitud = 5 m |
|---|---|---|
| Qc | 0,73 l/s | 0,73 l/s |
| Di comercial | 25 mm | 25 mm |
| Di efectivo | 18,00 mm | 18,00 mm |
| V | 2,9 m/s | 2,9 m/s |
| Longitud | (vacío) | 5 |
| hf | **—** | **2,409 m.c.a.** |

Al borrar la longitud, `hf` vuelve exactamente a `—` (nunca `0`), y
Qc/Di comercial/Di efectivo/V permanecen visibles. Consola del navegador
sin errores en ningún paso. Trazabilidad de `cantidad`/`n` verificada en
el mismo navegador (ver sección 9).

### 11.3 G1 — golden end-to-end del vertical slice hidráulico completo

**Cerrado en el commit `9832e809b6d70bd8909eefeae88528132d97cecc`**
("test: blindar golden hidraulico completo por tramo") — HEAD actual de
este documento.

Archivo: `src/motor/tuberias/resolverHidraulicaDeTramo.integracionM1.test.ts`
(mismo archivo del golden M1↔M2 ya existente — reutiliza su fixture, sin
duplicarla; construye localmente una variante del `Tramo` `t-general` con
`longitud_m=5`, sin mutar el `redHidraulica` compartido por el otro
test).

Caso: `t-general`, red AF, `longitud_m=5`, método Hazen-Williams, demo
original sin artefactos nuevos ni cantidades modificadas.

Valores exactos verificados (outputs públicos reales de
`resolverPerdidaDistribuidaDeTramo`, sin reimplementar ninguna fórmula):

```
qc_lps = 0.7273238618387272
candidato.denominacionComercial = "25 mm"
candidato.diametroInteriorEfectivo_mm = 18
velocidadReal_mps ≈ 2.8582021688967947
verificacionVelocidad = { tipo: 'admisible', limiteMinimo_mps: 1, limiteMaximo_mps: 3 }
longitud_m = 5
detalle.metodo = 'hazenWilliams'
hf_m ≈ 2.4085533165200532
detalle.perdidaUnitaria_J_m_m × longitud_m ≈ hf_m   (coherencia interna, sin recalcular Hazen)
```

Estos son los mismos valores confirmados en la verificación manual de
navegador (sección 11.2), ahora blindados por un test automatizado.

## 12. Diámetro comercial — selección por velocidad real (CRIT-A23)

**⚠️ Trampa conceptual a evitar al retomar el proyecto — `Ve=2,0 m/s`
(CRIT-A16) NO es una velocidad normativa a verificar.** Es únicamente el
criterio de **referencia para el predimensionamiento inicial**: se usa
para obtener una sección/`Di` de referencia orientativa
(`diReferenciaPredimensionamiento_mm`), antes de conocer ningún diámetro
comercial real. **No es**: una velocidad normativa fija, un objetivo de
diseño obligatorio, ni el valor contra el cual se valida finalmente el
diámetro comercial adoptado. La verificación final de velocidad se hace
siempre con el `Qc` real y el `Di efectivo` real del candidato comercial
seleccionado, contra los rangos de **CRIT-A19** — nunca contra `Ve=2,0`.

**Cerrado en el commit `48be317f2892526eb109ba33759bcf4c0fb8fa6a`**
("feat: seleccionar diametro comercial por velocidad admisible"). Sin
cambios de semántica desde el resumen anterior.

### 12.1 Sistema comercial productivo

`src/motor/tuberias/sistemaDeTuberia/index.ts`:

```typescript
export type SistemaDeTuberiaCatalogado = SistemaDeTuberia & {
  readonly materialTuberiaId: MaterialTuberiaId
  readonly fabricante: string
  readonly referenciaFuenteDimensiones: string
}
export const catalogoSistemasDeTuberia: readonly SistemaDeTuberiaCatalogado[]
export function obtenerSistemaDeTuberia(id: string, catalogo): SistemaDeTuberiaCatalogado
```

**Catálogo productivo actual — un solo sistema**: **Acqua System®
Magnum PN20** (Grupo Dema), material `ppr`. Diámetros interiores
efectivos vigentes:

| Denominación comercial | Di efectivo [mm] |
|---|--:|
| 20 mm | 14,4 |
| 25 mm | 18,0 |
| 32 mm | 23,2 |
| 40 mm | 29,0 |
| 50 mm | 36,2 |
| 63 mm | 45,8 |
| 75 mm | 54,4 |
| 90 mm | 65,4 |
| 110 mm | 79,8 |
| 125 mm | 88,9 |

`Proyecto.configuracionHidraulica.sistemaDeTuberiaId: string` —
**obligatorio**. **No existe todavía ningún selector de sistema comercial
en la UI** — sigue fijado en código en el demo. Ver hallazgo B (sección
12.3) y D-δ.28 en `PENDIENTES-DE-ARQUITECTURA.md`.

### 12.2 Política de selección — CRIT-A23 (vigente)

```
Qc final del Tramo (post CRIT-A22)
→ obtenerEntradasOrdenadasPorDiametroInterior(sistema)   -- catálogo completo, ordenado, sin umbral
→ para cada candidato, en orden ascendente de Di efectivo:
    calcular velocidad real (Qc + Di efectivo)
    verificarVelocidadAdmisible(V, Di)                    -- CRIT-A19, sin cambios
    si resulta 'admisible'  → seleccionar este candidato, detener búsqueda
    si 'noAdmisible' o 'fueraDeDominioNormativo' → descartar, continuar
→ si se recorre todo el catálogo sin ningún candidato admisible
    → sinCandidatoAdmisible (resultado explícito, no throw, no extrapola)
```

**Hueco normativo `60 mm < Di < 75 mm` (CRIT-A19/CRIT-A23, sin cambios de
política)**: los rangos de velocidad normativos implementados cubren
`13–60 mm` y `75–200 mm` — el intervalo `60<Di<75mm` queda **fuera del
dominio normativo** de ambos rangos. Un candidato comercial cuyo `Di
efectivo` cae en ese hueco se descarta como `fueraDeDominioNormativo`
(no `admisible` ni `noAdmisible`, ninguna de las dos calificaciones
aplica sin un rango de referencia) y la búsqueda continúa con el
siguiente candidato del catálogo. **Nunca se interpola ni se extrapola**
entre los dos rangos publicados para cubrir ese hueco.

### 12.3 Hallazgo A — caudales bajos sin candidato admisible (deliberado, no bug)

Confirmado con el motor real sobre la topología del demo (sesión de
verificación previa al commit de L2), caso representativo:

```
Tramo t-ac-toilette (rama AC del Toilette, único artefacto conectado a AC)
Qc = 0.12 l/s
Sistema: Acqua System Magnum PN20
Candidato más chico del catálogo: 20 mm, Di efectivo = 14.4 mm
Velocidad con ese candidato: 0.7368284402402562 m/s
verificarVelocidadAdmisible → noAdmisible (límite mínimo 1 m/s)
→ resultado: sinCandidatoAdmisible
```

Como `V` decrece monótonamente con `D` a Qc fijo, si el candidato más
chico del catálogo ya incumple el piso de velocidad, **ningún** candidato
mayor puede cumplirlo — propiedad matemática necesaria, no un caso
límite raro. Afecta específicamente a tramos terminales de un solo
artefacto bajo condición AF/AC fraccionada (CRIT-A15, `n=1` siempre,
CRIT-A4, sin beneficio de simultaneidad): en el demo, las ramas AC de
Toilette/Cocina/Lavadero (un solo artefacto conectado a AC cada una) lo
exhiben en la tabla visible; Baño/AC no lo sufre porque agrega 3
artefactos con simultaneidad.

**No es un bug del motor ni de CRIT-A23** — ya estaba documentado en la
sección 12 anterior de este archivo con el caso `valvulaMingitorio`;
L2 simplemente lo hizo visible en pantalla por primera vez. Pregunta
arquitectónica abierta (si el límite inferior de velocidad debería seguir
siendo condición dura o convertirse en advertencia con el diámetro mínimo
ya adoptado): ver D-δ.27 en `PENDIENTES-DE-ARQUITECTURA.md`. **No
decidido, no implementado.**

### 12.4 Hallazgo B — cambio de material sin sistema compatible bloquea M1+M2 (deuda preexistente, no de L2)

Reproducido en navegador real: cambiar "Material de la tubería" en la UI
(único sistema comercial del demo es PPR) dispara
`configuracionHidraulicaSistemaMaterialIncompatible`
(`src/validacion/configuracionHidraulica/index.ts`, validación
introducida en el commit `0b3386e`, muy anterior a este hito) y bloquea
`validacion.valido` — mensaje exacto: *"El sistema de tubería
seleccionado pertenece a un material distinto del material configurado
en el proyecto."* Causa raíz: no existe selector de sistema comercial en
la UI (sección 12.1). **Deuda preexistente, no introducida por L1/L2.**
Ver D-δ.28 en `PENDIENTES-DE-ARQUITECTURA.md`.

`ResultadoDiametroComercialDeTramo` (`resolverDiametroComercialDeTramo.ts`)
— sin cambios de tipo desde el resumen anterior.

## 13. Pérdida distribuida por Tramo — orquestador productivo (N3)

Sin cambios de tipo/semántica desde el resumen anterior —
`resolverPerdidaDistribuidaDeTramo` (`src/motor/tuberias/`) sigue siendo
el resolver de más alto nivel, componiendo sin recalcular
`resolverDiametroComercialDeTramo` → `resolverParametroDePerdidaDistribuida`
→, solo en Darcy, `resolverPropiedadesAguaParaRed`.

`ResultadoPerdidaDistribuidaDeTramo` — **exactamente 4 variantes**
(`sinDemanda` / `sinCandidatoAdmisible` / `sinLongitud` /
`conPerdidaDistribuida`) — sin cambios de forma. **Ahora consumido
productivamente también por la UI** (L2, sección 11), no solo por tests.

`n` **no está expuesto en este tipo** — ver deuda técnica documentada en
la sección 11.1 y D-δ.34.

### 13.1 Hazen (CRIT-A17) y Darcy (CRIT-A18/CRIT-A21)

Sin cambios. Hazen: `calcularPerdidaCargaUnitariaHazenWilliams(qc_lps,
coeficienteC, Di_efectivo) → J` → `calcularPerdidaCargaHazenWilliams(J,
longitud_m) → hf`. Darcy: `calcularNumeroReynolds` →
`calcularFactorFriccionDarcy` (Haaland) →
`calcularPerdidaCargaDarcyWeisbach`.

### 13.2 `fueraDeDominioTurbulento` — eliminada del resultado productivo (decisión definitiva)

Sin cambios — ver D-δ.25 en `PENDIENTES-DE-ARQUITECTURA.md` para la
demostración completa de por qué es inalcanzable por construcción bajo
CRIT-A19+A21+A23.

### 13.3 Goldens N3 vigentes

`resolverPerdidaDistribuidaDeTramo.test.ts` — Goldens Hazen/Darcy con
`Qc=0,2 l/s` (lavatorio único, `n=1`), más el nuevo golden end-to-end G1
sobre `t-general` con `longitud_m=5` (sección 11.3).

## 14. Propiedades del agua para Darcy — ν/temperatura (CRIT-A21)

Sin cambios. `src/motor/tuberias/perdidaCarga/darcyWeisbach/propiedadesAguaDarcy.ts`:
`TEMPERATURA_REFERENCIA_AGUA_C = 20`, `VISCOSIDAD_CINEMATICA_AGUA_M2S =
1.0034e-6`. `AF` y `AC` devuelven hoy el mismo valor, decisión
deliberada.

## 15. Materiales

Sin cambios. `src/motor/tuberias/materialTuberia/index.ts`, 6 materiales
(`ppr`, `pvc`, `pead`, `cobre`, `aceroGalvanizado`, `aceroCarbono`) con
`C`/`ε` propios. **PEAD: `ε=0,0213 mm` es un valor adoptado
deliberadamente** — no reemplazar casualmente por 0,0015.

**Decisión pendiente importante para el futuro** (D-δ.29): no asociar
automáticamente una clase/serie comercial (ej. PN20/PN25) a AF o AC — la
clase es una decisión de diseño que deberá considerar material, familia
comercial, DN, Di efectivo, presión de diseño, temperatura de servicio,
capacidad admisible presión-temperatura y margen de seguridad. **No
asumir PN20 suficiente por defecto.**

## 16. Configuración hidráulica global

`modelo/proyecto/index.ts` — sin cambios de tipo:

```typescript
type MetodoPerdidaDistribuida = 'hazenWilliams' | 'darcyWeisbach'
type ConfiguracionHidraulica = {
  metodoPerdidaDistribuida: MetodoPerdidaDistribuida
  materialTuberiaId: MaterialTuberiaId
  sistemaDeTuberiaId: string
}
```

Los tres campos **obligatorios**. Deuda de selector de sistema comercial:
ver sección 12.4/D-δ.28.

## 17. UI de Módulo 2 actual

`MotorDemandaPantalla.tsx`: bloques colapsables (`<details>` nativo, sin
router, sin librerías nuevas). **Ningún incremento tocó el layout general
de esta pantalla** — L1/L2/S1/S2 modificaron exclusivamente
`ResultadoHidraulicoDeTramo.tsx`.

Dentro de Módulo 2, `ConfiguracionHidraulicaFormulario`: select método,
select material, `<details>` con parámetros de cálculo. **Sigue sin
selector de sistema comercial** (sección 12.4).

Tabla principal de M2: ver columnas completas en la sección 11.1. Cuando
`auditarCoberturaFisica` detecta cobertura incompleta, la tabla se
reemplaza por el aviso de S2 (sección 8) — configuración sigue visible.

## 18. Metodología y fuentes técnicas (Nivel 2 documental)

Sin cambios. `src/interfaz/paginas/MetodologiaYFuentesTecnicas.tsx` —
tabla derivada 100% de `catalogoMaterialesTuberia`.

## 19. Filas visibles actuales de M2

Sin cambios de algoritmo. `src/interfaz/paginas/identificarFilasDeModulo2.ts`
— agrupamiento puramente estructural. Los tramos terminales siguen
existiendo íntegros en `RedHidraulica` pero no se muestran en la tabla
principal (D-δ.20/D-δ.21).

## 20. Demo actual (`MotorDemandaPantalla.tsx`, `proyectoInicial`)

Topología física sin cambios estructurales (nodo hub `n-0`, topología
plana). **El proyecto demo estático sigue sin ningún `longitud_m`
cargado por defecto** — pero desde L1, cualquier Tramo visible puede
recibir una longitud editada en vivo desde la UI (no persiste entre
recargas de página, solo vive en el estado React de la sesión).
`t-general` (`Qc=0,7273238618387272`) y `t-af-acs` sin cambios.

`configuracionHidraulica` del demo: `sistemaDeTuberiaId:
'acquaSystemMagnumPn20'`, `materialTuberiaId: 'ppr'`,
`metodoPerdidaDistribuida: 'hazenWilliams'`. Sin cambios.

Locales/artefactos sin cambios: 11 artefactos deduplicados.

## 21. Documentación vigente — CRIT-A y D-δ relevantes para M2

`src/normativa/eras-2023/CRITERIOS.md` (hasta **CRIT-A23**): sin criterios
nuevos agregados durante Correctivo 2B/S1/S2/L1/L2/G1 — todo este trabajo
consumió criterios ya cerrados, sin introducir interpretación normativa
nueva. Se corrigieron en este hito **tres afirmaciones de estado que
habían quedado objetivamente desactualizadas** (CRIT-A15, CRIT-A17,
CRIT-A18 — ver el propio archivo para el detalle; ya no dicen "pendiente
de implementación" para funcionalidad que hoy es productiva).

`PENDIENTES-DE-ARQUITECTURA.md`, sección D-δ: hasta **D-δ.25** heredado
del resumen anterior, **más D-δ.26 a D-δ.34 nuevas** en este hito (ver
ese archivo — cobertura M1↔M2, límite de velocidad bajo, sistema
comercial, clase de tubería, margen de seguridad, granularidad de
sistema, presión, pérdidas localizadas, deuda de `n` en N3).

`ROADMAP.md` (nuevo en este hito): visión estructural por bloques,
reemplaza la sección "OBJETIVO DEL PRÓXIMO CHAT" que tenían las
versiones anteriores de este documento.

No existen `ARQUITECTURA*.md` ni `CONVENCIONES*.md` en este repo — `docs/adr/`
y `docs/arquitectura/` existen como carpetas vacías (solo `.gitkeep`), sin
ningún documento real todavía (deuda ya registrada en
`PENDIENTES-DE-ARQUITECTURA.md`, sección "Deuda documental — documentos
ADR no materializados"). Sí existe `HANDOFF-MODULO-1-A-MODULO-2.md`
(documento histórico de la transición M1→M2, **desactualizado respecto
del estado actual** — sus "bloqueos antes de Módulo 2" ya están todos
resueltos; se conserva como registro histórico, no se edita ni se usa
como referencia de estado actual).

## NO HACER

- No sumar `Qc` parciales para obtener un `Qc` mayor.
- No capear `K` en 1.
- No convertir `qu = null` en `0`.
- No contar `qu = 0` en `n`.
- No aplicar CRIT-A8 antes del filtrado hidráulicamente activo.
- No modificar valores normativos del catálogo de artefactos.
- **No asumir que `inodoroDeposito` tiene conexión física AC en el demo**
  (aunque el catálogo normativo conserve su `quCaliente_lps` propio): en
  la topología física del proyecto demo, `inodoroDeposito` está
  conectado únicamente a AF (sin terminal AC en `redHidraulica`). No
  agregarle rama AC al reconstruir o editar el demo sin una decisión
  explícita — no confundir el dato normativo de catálogo con la
  conectividad física real (CRIT-A15).
- No confundir `Di` de referencia de predimensionamiento con diámetro
  comercial final — y no usarlo como filtro de admisión comercial
  (CRIT-A23).
- No identificar `DN` con `Di` interior.
- No poner `C`/`epsilon` dentro de `SistemaDeTuberia`/`SistemaDeTuberiaCatalogado`.
- No hardcodear un sistema comercial real sin decisión explícita previa.
- No usar `longitud_m` como sustituto de `Δz`, ni derivarla desde cotas.
- No asumir cota o longitud ausente como `0`.
- No permitir `longitud_m ≤ 0`.
- No permitir `longitud_m < |Δz|` cuando los tres datos geométricos están
  presentes.
- No representar una montante como un único Tramo si existen
  derivaciones intermedias.
- No crear una entidad `Montante` paralela a la topología.
- No mezclar accesorios/codos/tees/válvulas/`Ks` dentro de `longitud_m`.
- No calcular "% de pérdida" como `hf/Qc`.
- No reducir `Qc` artificialmente para hacer "pasar" una verificación de
  presión.
- No usar `Qc` estadístico bruto como Qc final de Tramo en M2.
- No reintroducir `Di` de predimensionamiento como filtro de selección
  comercial.
- No usar `obtenerCandidatosDeDiametroComercial` con un umbral artificial
  para simular "todo el catálogo" — usar
  `obtenerEntradasOrdenadasPorDiametroInterior`.
- No reintroducir la variante `fueraDeDominioTurbulento`.
- No debilitar ni eliminar el guard `Re<UMBRAL_REYNOLDS_TURBULENTO`.
- **No mutar `redHidraulica` desde ningún updater sin pasar por
  `conLongitudDeTramo` (o un updater análogo futuro)** — nunca reconstruir
  el árbol de Tramos a mano en un componente de UI.
- **No recalcular cobertura física con otra lógica en la UI** — la única
  fuente es `auditarCoberturaFisica(proyecto).artefactosSinReferencia`.
- **No recalcular `n`/`Qmax`/simultaneidad en la UI** — siempre leer del
  motor (`resolverHidraulicaDeTramo`/`resolverPerdidaDistribuidaDeTramo`),
  incluso al costo de la doble resolución temporal documentada (sección
  11.1).
- **No usar `identificarFilasDeModulo2` como punto de escritura** sin una
  decisión arquitectónica explícita — es una función de presentación de
  solo lectura.
- No mover los tags listados en la sección 1.
- No hacer commit sin aprobación explícita del usuario.

## Riesgos / preguntas abiertas

Ver `PENDIENTES-DE-ARQUITECTURA.md` (D-δ.26 a D-δ.34) para el detalle
completo de cada una. Lista corta de orientación:

- **Límite inferior de velocidad (CRIT-A19/CRIT-A23) ante Qc muy bajo**
  — ¿condición dura o advertencia con el diámetro mínimo ya adoptado?
  Caso real: `t-ac-toilette`, sección 12.3. No decidido.
- **Selector de sistema comercial / compatibilidad con material** —
  deuda de UI preexistente (sección 12.4). No implementado.
- **Clase/serie comercial (PN20/PN25) y verificación presión-temperatura**
  — decisión de diseño pendiente, no debe asumirse PN20 por defecto.
- **Margen de seguridad de diseño** — debe quedar como criterio explícito
  y trazable, sin fórmula/factor universal todavía.
- **Granularidad de `sistemaDeTuberiaId`** (global/por red/por tramo) —
  no decidido.
- **Sincronización Proyecto ↔ `redHidraulica`** — alta de artefacto en M1
  no crea conexión física; S1/S2 evitan que eso produzca un resultado
  silenciosamente incompleto, pero la sincronización automática sigue
  diferida a propósito.
- **Presión mínima ERAS vs. práctica IUAS** — investigación read-only
  pendiente, ninguna decisión tomada (ver D-δ.32 y el detalle histórico
  más abajo en este mismo documento si se conserva, o en
  `PENDIENTES-DE-ARQUITECTURA.md`).
- **Deuda de `n` no expuesto por N3** — doble resolución temporal en
  `FilaResultado` (sección 11.1). Pendiente transportar la trazabilidad
  necesaria dentro de `ResultadoPerdidaDistribuidaDeTramo`.
- Cómo materializar montantes en la demo/UI sin romper D-δ.23.
- Accesorios estructurales automáticos vs. editables por el usuario —
  diseño pendiente completo.
- Tramo terminal hasta el artefacto crítico: hoy oculto en la tabla
  principal (D-δ.20) pero íntegro en `RedHidraulica`.
- `H_origen`: geométrico vs. carga disponible vs. nivel de tanque — sin
  cerrar.
- El demo (`proyectoInicial`) sigue sin `longitud_m` por defecto — el
  usuario debe cargarla manualmente por fila para ver `hf`.
- Selección manual de diámetro por Tramo — fuera de alcance hasta ahora.

## Estado aproximado M2 (orientativo, no contractual)

- Topología / demanda / simultaneidad (incl. piso CRIT-A22, trazabilidad
  `n`): **cerradas**.
- Cobertura física (S1) y barrera de presentación (S2): **cerradas**,
  sincronización automática **diferida a propósito**.
- Longitud física editable (L1): **cerrada**.
- Materiales / sistemas comerciales: **cerrados en lo matemático**,
  selector de sistema comercial en UI **pendiente** (deuda preexistente).
- Selección comercial por velocidad (CRIT-A23): **funcionalmente
  cerrada**; límite inferior de velocidad ante Qc bajo **identificado,
  sin decisión de política todavía**.
- Pérdida distribuida Hazen/Darcy (N3): **cerrada**, ahora **visible en
  UI** (L2) y **blindada por golden end-to-end** (G1).
- Geometría / cotas / longitudes: **implementadas**.
- Pérdidas localizadas / accesorios: **pendiente**.
- Balance de presión: **pendiente**, investigación read-only sin empezar.
- Clase de tubería / margen de seguridad: **pendiente de decisión**.
- UI final de M2 (N4/N5): **pendiente** — la UI actual es explícitamente
  transitoria.

## Historial de commits relevantes (hash real + mensaje real)

Del más reciente al más antiguo, checkpoints de este hito de pausa:

- `9832e809b6d70bd8909eefeae88528132d97cecc` — test: blindar golden
  hidraulico completo por tramo (**HEAD actual**, G1)
- `4db31dae0d6ad66ceefaed3b6735312d67b6c3e1` — feat: mostrar perdida
  distribuida por tramo en modulo 2 (L2)
- `5c4fdbb1866ed1e086fd0affe394347a54746bd6` — feat: editar longitud de
  tramos en modulo 2 (L1)
- `4ffb892bd1d3a268a87858504945afc7a1f411b4` — feat: mostrar n
  hidraulico en modulo 2 (trazabilidad n/Refs. físicas)
- `368684555617103a24307d17c8c203957c7cd826` — feat: bloquear resultados
  m2 con cobertura incompleta (S2)
- `254b860c3bae5fa3dcafd7c75b4c652a747a53dc` — feat: auditar cobertura
  fisica de artefactos (S1)
- `5bf1de8037cbab4a7609c92801e98a31b111135a` — refactor: renombrar
  diametro de referencia de predimensionamiento (Correctivo 2B)

Checkpoints previos (chats anteriores, ya incorporados a este resumen):

- `48be317f2892526eb109ba33759bcf4c0fb8fa6a` — feat: seleccionar
  diametro comercial por velocidad admisible (CRIT-A23)
- `a0f14dc7440b6c69fce554449ca7c0891e013e7d` — fix: aplicar piso de
  caudal individual por tramo (CRIT-A22)
- `0b9e6ee96f8cf0d58dcd986b0dce1bf4e8545509` — feat: resolver perdida
  distribuida por tramo (N3)
- `82e24f6b41abdb0e2b03a83857b35bf51708a660` — feat: definir propiedades
  del agua para darcy (CRIT-A21)
- `0b3386e0ce0e3186475b672655f269bab64a5de4` — feat: incorporar sistema
  comercial de tuberia (Acqua System)
- `b9dfe8cd03500c88a42f2070785d8f879f3ec29e` — refactor: agrupar
  criterio de predimensionamiento
- `92ac0ceb375762f07424e9037cd15997c5392495` — test: validar montante
  segmentada por derivaciones
- `3ac4a166589f67a6a5bb475b369f23ae89d97ed0` — feat: incorporar
  longitud fisica de tramos
- `4d1e7113e4de01bcc88272cf881eba4978979600` — feat: incorporar cota
  geometrica de nodos
- `c6bd37dca1f590c2ec59cd75bb478d17dd64b590` — feat: hacer colapsables
  los modulos principales
- `0b8b7d3d637839fcdb7659eb94346cc471546ede` — feat: resolver parametro
  de perdida distribuida

## Tests / golden cases críticos — nunca romper inadvertidamente

- `src/motor/tuberias/resolverHidraulicaDeTramo.integracionM1.test.ts` —
  igualdad M1=M2 exacta sobre `t-general` (`Qc=0,7273238618387272`), **más
  el golden end-to-end G1** (Qc→diámetro comercial→velocidad→longitud→hf,
  sección 11.3).
- `src/motor/tuberias/resolverHidraulicaDeTramo.golden.test.ts` —
  Golden 1-3 (CRIT-A4/A13/A8/A15) y Golden 4 (montante segmentada).
- `src/motor/tuberias/resolverHidraulicaDeTramo.pisoCaudalIndividual.golden.test.ts`
  — casos A1-A6 de CRIT-A22.
- `src/motor/tuberias/simultaneidad/resolverSimultaneidadHidraulicaDeTramo.test.ts`
  — CRIT-A22, **y ahora `resultado.n`** en 5 casos (ordinario, con
  cantidad>1, con/sin piso).
- `src/motor/tuberias/cobertura/auditarCoberturaFisica.test.ts` — S1,
  casos A-E más 2 casos límite (`redHidraulica` ausente, proyecto vacío).
- `src/interfaz/paginas/actualizarRedHidraulica.test.ts` — L1, casos
  A-E (setear/cambiar/vaciar longitud, preservación estructural, tramo
  inexistente, `redHidraulica` ausente).
- `src/interfaz/paginas/ResultadoHidraulicoDeTramo.test.ts` —
  `describirReferenciaPendiente` (S2) y `textosDePerdidaDistribuidaDeTramo`
  (L2, las 4 variantes de N3).
- `src/exportadores/pdf/formatearNumero.test.ts` — incluida la unidad
  `m` (hf, 3 decimales).
- `src/motor/tuberias/participacion/aplicarParticipacionCritA8.test.ts` /
  `filtrarArtefactosHidraulicamenteActivos.test.ts` — CRIT-A8.
- `src/motor/tuberias/simultaneidad/determinarAEfectivo.test.ts` —
  CRIT-A14.
- `src/motor/tuberias/caudal/determinarConectividadFisica.test.ts` /
  `determinarCondicionHidraulicaDeCaudal.test.ts` — CRIT-A15.
- `src/motor/tuberias/velocidad/verificarVelocidadAdmisible.test.ts` —
  CRIT-A19.
- `src/validacion/redHidraulica/index.test.ts` — CRIT-A20 (longitud/cota).
- `src/validacion/configuracionHidraulica/index.test.ts` —
  incompatibilidad sistema/material (hallazgo B, sección 12.4).
- `src/motor/tuberias/sistemaDeTuberia/index.test.ts` — catálogo Acqua
  System Magnum PN20.
- `src/motor/tuberias/diametroComercial/obtenerCandidatosDeDiametroComercial.test.ts`
  — primitiva original intacta.
- `src/motor/tuberias/diametroComercial/obtenerEntradasOrdenadasPorDiametroInterior.test.ts`
  — primitiva de CRIT-A23.
- `src/motor/tuberias/resolverDiametroComercialDeTramo.test.ts` — Goldens
  B1-B4, `valvulaMingitorio` sin candidato, hueco 60-75mm.
- `src/motor/tuberias/perdidaCarga/darcyWeisbach/propiedadesAguaDarcy.test.ts`
  — CRIT-A21.
- `src/motor/tuberias/resolverPerdidaDistribuidaDeTramo.test.ts` —
  Goldens Hazen/Darcy, propiedad derivada `Re>UMBRAL_REYNOLDS_TURBULENTO`.
- `src/motor/tuberias/perdidaCarga/calcularPerdidaCargaHazenWilliams.test.ts`
  — CRIT-A17.
- `src/motor/tuberias/perdidaCarga/darcyWeisbach/calcularNumeroReynolds.test.ts` /
  `calcularFactorFriccionDarcy.test.ts` — CRIT-A18, guard `Re<4000`.
- `src/motor/tuberias/materialTuberia/index.test.ts` — catálogo de
  materiales.
- `src/motor/tuberias/perdidaCarga/resolverParametroDePerdidaDistribuida.test.ts`
  — resolución C/epsilon por método.
- `src/motor/tuberias/geometria/calcularDiferenciaDeCota.test.ts` /
  `esLongitudGeometricamenteValida.test.ts` — geometría base.
