# Resumen de continuidad — Módulo 2 (Tuberías)

Documento técnico operativo para abrir un **chat nuevo de Claude Code** sin
depender del historial de la conversación anterior. Todo lo que sigue fue
verificado contra el repo real al HEAD indicado, no reconstruido de memoria.

## 1. Estado Git

- **Branch**: `main`
- **HEAD**: `b9dfe8cd03500c88a42f2070785d8f879f3ec29e`
- **Mensaje del commit HEAD**: `refactor: agrupar criterio de predimensionamiento`
- **`git status`**: `nothing to commit, working tree clean`
- **Commits adelante de `origin/main`**: 99
- **Tests**: 391/391 verdes, 43 archivos de test
- **`npx tsc -b`**: verde
- **`npm run build`**: verde. Warning conocido y aceptado: "Some chunks are
  larger than 500 kB after minification" — no es error, optimización
  pendiente sin urgencia.
- **Tags existentes que NO deben moverse**: `pre-modulo-2-2026-08-09`,
  `v0.1.0`, `v0.2.0-dev`, `v0.3.0-dev`.

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
  `CRITERIOS.md`/`PENDIENTES-DE-ARQUITECTURA.md`/similares, nunca requiere
  build/lint/tsc/tests). Anunciarlo explícitamente.
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
  archivo no previsto, por ejemplo), detenerse y pedir aprobación antes de
  hacerlo — no decidir unilateralmente.
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
`src/motor/tuberias/resolverHidraulicaDeTramo.integracionM1.test.ts`.
Casos Golden G1/G2 de M1 documentados en
`src/normativa/eras-2023/CASOS-GOLDEN.md`.

## 4. Modelo topológico M2 actual

`src/modelo/redHidraulica/index.ts`:

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
`Proyecto → UnidadFuncional → Local → Artefacto` (esa jerarquía responde
"¿de qué parte del proyecto es esto?"; la red responde "¿cómo llega el
agua hasta acá?").

### `Nodo.cota_m`

- Elevación geométrica del punto hidráulico, en metros, respecto de un
  datum común del Proyecto.
- Convención de esta primera versión: **cota 0 = nivel de vereda/acera**
  (documental, no persistida como campo aparte).
- **Opcional transitoriamente**: las topologías actuales no tienen
  geometría real todavía; no se inventa un valor solo para poblar el
  campo.
- **Ausencia ≠ cota 0.** Ningún consumidor debe asumir ese fallback.

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

## 5. Geometría — primitivas y validación

`src/motor/tuberias/geometria/calcularDiferenciaDeCota.ts`:

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

Integrado en `src/validacion/redHidraulica/index.ts`
(`validarRedHidraulica`), con dos códigos de validación nuevos en
`src/validacion/codigos/index.ts`:
`redHidraulicaTramoLongitudNoPositiva` y
`redHidraulicaTramoLongitudIncompatibleConCota` (ambos severidad `error`).

Documentación: **CRIT-A20** (`CRITERIOS.md`, explícitamente NO atribuido a
ERAS-2023 — es consecuencia geométrica, no interpretación normativa) y
**D-δ.22** (`PENDIENTES-DE-ARQUITECTURA.md`, decisión arquitectónica del
Modelo B).

## 6. Montante segmentada — Golden 4 (validado productivamente)

Archivo: `src/motor/tuberias/resolverHidraulicaDeTramo.golden.test.ts`
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

**Muy importante**: Golden 4 pasó **sin ningún cambio de código
productivo**. `obtenerArtefactosAguasAbajo` y `resolverHidraulicaDeTramo`
ya eran suficientemente generales — no existe entidad `Montante` en el
modelo; una montante **es** una cadena de Nodos/Tramos reales, segmentada
en cada punto de derivación.

Documentación: **D-δ.23** (`PENDIENTES-DE-ARQUITECTURA.md`), sin CRIT-A
nuevo (es confirmación de una propiedad arquitectónica ya vigente en el
motor, no una decisión normativa nueva).

## 7. Topología / Qc / AF-AC — decisiones cerradas

- `obtenerArtefactosAguasAbajo` (`src/motor/tuberias/topologia/`): DFS
  puro sobre `Tramo.nodoOrigenId → nodoDestinoId`, ACS es pass-through,
  artefactos son terminales, dedup por identidad completa UF+Local+
  Artefacto, ignora `Tramo.red` para recorrer.
- `resolverArtefactosReferenciados`: traduce `ReferenciaDeArtefacto` a
  las instancias reales del Proyecto.
- `filtrarArtefactosComputables`: solo `origen === 'normativo'`.
- **CRIT-A8**: se aplica por UF+Local, solo locales domiciliarios, si hay
  inodoro-válvula activo participan solo las válvulas — **después** de
  filtrar participantes hidráulicamente activos, nunca antes.
- **CRIT-A13**: pipeline completo — computables aguas abajo → resolver
  `qu` hidráulico por tramo/artefacto (null = error, nunca 0) → conservar
  `qu>0` → CRIT-A8 → contribuciones → n/Qmax/a/Kc/K/Qc.
- **CRIT-A14** (`a` efectivo): no multifamiliar → `a` base; multifamiliar
  con 1 UF participante → `a=1`; multifamiliar con >1 UF participante →
  `a=2`. UF con solo caudal cero no cuenta. Vacío → throw.
- **CRIT-A15**: `redHidraulica` es la representación física
  **autoritativa**. Ausencia de un terminal AC (o AF) significa que esa
  conexión **no existe físicamente**, no que falta modelar. Artefacto
  físicamente AF+AC → rama AF usa `quFria`, rama AC usa `quCaliente`,
  tramo común aguas arriba usa `quTotal`. AF-only → `quTotal` en AF.
  AC-only → `quTotal` en AC. **No fraccionar Qc precomputado. No sumar Qc
  parciales.**
- `determinarConectividadFisica`: responde "¿qué terminales físicos
  existen para esta referencia en toda la red?" (`soloAF`/`soloAC`/
  `ambas`) — pregunta global, no relativa a un Tramo.
- `determinarCondicionHidraulicaDeCaudal`: responde "desde este Tramo,
  ¿cómo se alcanza este Artefacto?" (`total`/`aguaFria`/`aguaCaliente`) —
  pregunta relativa al Tramo evaluado.
- `t-af-acs` (demo) es alimentación **global** de AF al productor ACS de
  toda la vivienda — nunca se trata como alimentación local, nunca se
  obtiene sumando Qc parciales AC de los Locales.

## 8. Predimensionamiento

**CRIT-A16**: `Ve = 2,0 m/s` es un **criterio de proyecto conservador**
para el predimensionamiento inicial — **no** es una velocidad normativa
ERAS fija.

```
Ae [cm²] = 10 · Qc [l/s] / Ve [m/s]        (calcularSeccionEscurrimiento)
Di_min [mm] = √(4·Ae/π) · 10               (calcularDiametroInteriorMinimo)
```

Ambas primitivas puras en
`src/normativa/eras-2023/seccion-escurrimiento/index.ts`, sin conocer
Proyecto/Tramo/RedHidraulica.
`src/motor/tuberias/predimensionamiento/calcularPredimensionamientoDeTramo.ts`
orquesta con `VE_PREDIMENSIONAMIENTO_MPS = 2.0` co-ubicado ahí mismo.

`ResultadoHidraulicoDeTramo` (tipo, en `resolverHidraulicaDeTramo.ts`):

```typescript
type ResultadoHidraulicoDeTramo =
  | { tipo: 'sinDemanda'; qc_lps: 0 }
  | {
      tipo: 'conDemanda'
      qc_lps: number
      simultaneidad: ResultadoSimultaneidadDeTramo
      predimensionamiento: { ve_mps: number; ae_cm2: number; di_min_mm: number }
    }
```

**`Di mínimo ≠ diámetro comercial final`** — es solo predimensionamiento.

## 9. Velocidad y diámetro comercial

**CRIT-A19** (`src/motor/tuberias/velocidad/verificarVelocidadAdmisible.ts`):

```
13 mm ≤ D ≤ 60 mm    →  1 m/s ≤ Ve ≤ 3 m/s
75 mm ≤ D ≤ 200 mm   →  1,5 m/s ≤ Ve ≤ 2 m/s
```

Límites incluidos. `60 < D < 75 mm`, `D < 13 mm` y `D > 200 mm` →
`fueraDeDominioNormativo` (no interpolar/extrapolar). Verificación usa
**diámetro interior efectivo comercial**, nunca `DN`, nunca diámetro
exterior, nunca `Di` mínimo de predimensionamiento.

```typescript
type ResultadoVerificacionVelocidad =
  | { tipo: 'admisible'; limiteMinimo_mps: number; limiteMaximo_mps: number }
  | { tipo: 'noAdmisible'; limiteMinimo_mps: number; limiteMaximo_mps: number }
  | { tipo: 'fueraDeDominioNormativo' }
```

`src/motor/tuberias/diametroComercial/obtenerCandidatosDeDiametroComercial.ts`:

```typescript
type EntradaCatalogoTuberia = { denominacionComercial: string; diametroInteriorEfectivo_mm: number }
type SistemaDeTuberia = { id: string; denominacion: string; entradas: readonly EntradaCatalogoTuberia[] }
```

`obtenerCandidatosDeDiametroComercial(diMinimo_mm, sistema)` devuelve
candidatos con `Di efectivo ≥ Di mínimo`, ordenados ascendente, `[]` si no
hay ninguno. **No existe todavía ningún sistema comercial real/productivo
conectado** — los tests usan catálogos ficticios de laboratorio, sin
material/norma/marca asociados. No confundir `DN` con `Di`. Si el primer
candidato suficiente da velocidad por debajo del mínimo admisible,
**aumentar el diámetro no soluciona el problema** (V decrece
monótonamente con D para Qc fijo).

## 10. Hazen-Williams

**CRIT-A17** — `src/motor/tuberias/perdidaCarga/calcularPerdidaCargaHazenWilliams.ts`:

```
J = 10,67 · Q_m3s^1,852 / (C^1,852 · D_m^4,87)      [J en m/m]
hf = J · L
```

```typescript
calcularPerdidaCargaUnitariaHazenWilliams(qc_lps, coeficienteC, diametroInterior_mm): number
calcularPerdidaCargaHazenWilliams(J_m_m, longitud_m): number
```

`Qc` interno en l/s → conversión explícita a m³/s; `Di` en mm →
conversión explícita a m. `C` es parámetro explícito (sin catálogo
productivo todavía — ver sección 12). Usa diámetro interior hidráulico
efectivo. **No conectado todavía productivamente a los resultados
visibles de M2.**

## 11. Darcy-Weisbach

**CRIT-A18** (decisión de ingeniería del proyecto, **no** prescripción de
ERAS) — `src/motor/tuberias/perdidaCarga/darcyWeisbach/`:

```
V = Q/A                                    (calcularVelocidad)
Re = V·D/ν                                 (calcularNumeroReynolds)
1/√f = -1,8·log₁₀[(ε/(3,7D))^1,11 + 6,9/Re]  (calcularFactorFriccionDarcy, Haaland)
hf = f·(L/D)·V²/(2g)     [g=9,81]           (calcularPerdidaCargaDarcyWeisbach)
```

Solo régimen **turbulento**: `Re ≥ 4000` (`UMBRAL_REYNOLDS_TURBULENTO`,
co-ubicado en `calcularFactorFriccionDarcy.ts`); no laminar, no
transición. `ε` explícito (`ε=0` válido, hidráulicamente liso). `ν`
explícito, sin criterio productivo cerrado de temperatura/valor todavía
(ver "Incremento N2" en la sección OBJETIVO DEL PRÓXIMO CHAT). **No es una iteración de Colebrook** —
Haaland es una fórmula cerrada, sin loop numérico. **No conectado
todavía productivamente a M2.**

## 12. Materiales

`src/motor/tuberias/materialTuberia/index.ts`:

```typescript
type MaterialTuberia = {
  readonly id: MaterialTuberiaId
  readonly nombre: string
  readonly coeficienteC: number
  readonly rugosidadAbsoluta_mm: number
  readonly referenciaFuenteC: string
  readonly referenciaFuenteRugosidad: string
}
```

`MaterialTuberiaId` (en `modelo/proyecto/index.ts`) — 6 valores, catálogo
en `catalogoMaterialesTuberia`:

| id | Material | C | ε [mm] |
|---|---|---:|---:|
| `ppr` | PPR | 150 | 0,007 |
| `pvc` | PVC | 150 | 0,0015 |
| `pead` | PEAD | 150 | **0,0213** |
| `cobre` | Cobre | 140 | 0,0015 |
| `aceroGalvanizado` | Acero galvanizado | 120 | 0,15 |
| `aceroCarbono` | Acero al carbono | 140 | 0,045 |

**PEAD: `ε=0,0213 mm` es un valor adoptado deliberadamente** (fuente PPI
TN-27/Plastics Pipe Institute, incorpora el efecto de cordones interiores
de termofusión de tubería HDPE instalada real) — **no reemplazar
casualmente por 0,0015** (que sería el valor genérico de "plástico liso"
sin ese efecto). `obtenerMaterialTuberia(materialId, catalogoMateriales)`
resuelve por ID, catálogo por parámetro, `find` + `throw` explícito, sin
fallback.

Ninguno de estos valores proviene de una tabla publicada por ERAS-2023
(CRIT-A17/A18 lo dejan explícito). Cada material tiene un único valor
operativo de C y de ε; no se modela edad/corrosión/incrustación/estado
superficial en esta primera versión.

## 13. Configuración hidráulica global

`modelo/proyecto/index.ts`:

```typescript
type MetodoPerdidaDistribuida = 'hazenWilliams' | 'darcyWeisbach'
type ConfiguracionHidraulica = { metodoPerdidaDistribuida: MetodoPerdidaDistribuida; materialTuberiaId: MaterialTuberiaId }
```

Ambos campos **obligatorios**. `Proyecto.configuracionHidraulica` es la
única fuente de verdad (no hay estado paralelo).

`src/motor/tuberias/perdidaCarga/resolverParametroDePerdidaDistribuida.ts`:

```typescript
type ParametroDePerdidaDistribuida =
  | { readonly metodo: 'hazenWilliams'; readonly coeficienteC: number }
  | { readonly metodo: 'darcyWeisbach'; readonly rugosidadAbsoluta_mm: number }

function resolverParametroDePerdidaDistribuida(proyecto: Proyecto, catalogoMateriales: readonly MaterialTuberia[]): ParametroDePerdidaDistribuida
```

Union discriminada que hace imposible representar ambos valores a la vez.
Usa `obtenerMaterialTuberia` internamente (sin duplicar `find`). **No
persiste C/epsilon** — siempre se derivan del catálogo. Las primitivas
matemáticas (Hazen/Darcy) siguen recibiendo números explícitos, sin
conocer `Proyecto`/`MaterialTuberiaId`/catálogo. **`resolverHidraulicaDeTramo`
todavía NO consume este resultado** — es una función de motor completa,
verificada por sus propios tests, pero aún no conectada al pipeline de
pérdidas (que no existe todavía).

## 14. UI de Módulo 2 actual

`MotorDemandaPantalla.tsx`: bloques principales ahora **colapsables**
(`<details>` nativo, sin router, sin librerías nuevas, sin estado React,
sin persistencia — el navegador administra apertura/cierre):

- **Módulo 1 — Demanda**: `<details open>`.
- **Módulo 2 — Tuberías**: `<details open>` (cuando se renderiza —
  depende del gate de validación existente, sin cambios).
- **Metodología y fuentes técnicas**: `<details>` sin `open` (arranca
  cerrada). Se renderiza siempre, incluso con proyecto inválido (vive
  fuera del gate `validacion.valido ? ResultadoDemanda : ProblemasValidacion`).

Los tres son completamente independientes (sin atributo `name`, sin
comportamiento accordion).

Dentro de Módulo 2 (`ResultadoHidraulicoDeTramo.tsx`),
`ConfiguracionHidraulicaFormulario`:

- select "Método de cálculo de pérdidas distribuidas" (Hazen-Williams /
  Darcy-Weisbach).
- select "Material de la tubería" (opciones derivadas de
  `catalogoMaterialesTuberia`, sin hardcodear nombres).
- `<details><summary>Parámetros de cálculo</summary>` — **colapsable**,
  contiene ahora (desde el commit HEAD) todos juntos:
  1. Material seleccionado.
  2. C (si Hazen) o ε (si Darcy) — nunca ambos a la vez.
  3. Fuente correspondiente (`referenciaFuenteC` o
     `referenciaFuenteRugosidad`).
  4. Disclaimer: "valores técnicos adoptados por el proyecto... no
     corresponden a una tabla... ERAS-2023".
  5. Aclaración de predimensionamiento: "Ve = 2,0 m/s... verificación
     posterior con diámetro comercial conforme a ERAS §2.12.1."

El commit `b9dfe8cd03500c88a42f2070785d8f879f3ec29e` movió el punto 5
(antes vivía fuera de este `<details>`, condicionado a
`tramos.length > 0`) para que todo el bloque colapse/expanda junto. Efecto
secundario aceptado explícitamente: la aclaración de predimensionamiento
ahora también puede mostrarse sin red hidráulica cargada (antes no).

Puramente informativo: cambiar método/material **todavía no** dispara
ningún cálculo de pérdidas ni modifica las tablas de Qc/Di existentes.

## 15. Metodología y fuentes técnicas (Nivel 2 documental)

`src/interfaz/paginas/MetodologiaYFuentesTecnicas.tsx` — sección `<section>`
siempre visible (no colapsable, a diferencia de los otros bloques),
independiente del `Proyecto`/su validez. Tabla derivada 100% de
`catalogoMaterialesTuberia` (columnas: Material, C, ε [mm], Fuente C,
Fuente ε), sin ninguna fila hardcodeada. Fuentes mostradas completas (sin
truncar). La particularidad de PEAD se explica únicamente a través de su
propia `referenciaFuenteRugosidad`, sin nota aparte duplicada.

**Pendiente menor registrado** (no resuelto): unificar en el futuro el
formato locale de C/epsilon (hoy se muestran como literal JS crudo,
`0.007`, no vía `formatearNumero` porque esa utilidad redondearía a 2
decimales y destruiría precisión significativa) preservando precisión
significativa.

## 16. Filas visibles actuales de M2

`src/interfaz/paginas/identificarFilasDeModulo2.ts` — agrupamiento
puramente estructural, **sin heurísticas de string de ID**:

- `identificarFilasDistribucionGeneral`: "Alimentación general" = el
  único Tramo cuyo `nodoOrigenId` nunca es `nodoDestinoId` de otro Tramo
  (raíz). "Alimentación ACS" = Tramo cuyo nodo destino referencia
  `produccionACS`.
- `identificarFilasPrincipalesDeLocales`: Tramo "puro" de un
  (UF, Local) más cercano a la raíz — usa `obtenerArtefactosAguasAbajo`
  para decidir, no reimplementa el traversal.

Los tramos terminales (hacia cada Artefacto) **siguen existiendo íntegros
en `RedHidraulica`** para el motor, pero no se muestran en la tabla
principal — decisión de presentación, no limitación de cálculo (D-δ.20/
D-δ.21).

## 17. Demo actual (`MotorDemandaPantalla.tsx`, `proyectoInicial`)

Topología física: nodo hub `n-0` desde el cual cuelgan directamente todos
los Locales (**topología plana**, sin verticalidad/montantes modeladas
todavía — Golden 4 de la sección 6 es un fixture aislado, no forma parte
de esta demo). `t-general` (`n-general→n-0`, AF) es la Alimentación
general del proyecto completo. `t-af-acs` (`n-0→n-acs`, AF) es la
alimentación global de AF al nodo `produccionACS` compartido por toda la
vivienda — nunca se trata como alimentación local, nunca se calcula
sumando Qc parciales AC de los 5 Locales.

Locales/artefactos (Baño, Toilette, Cocina, Lavadero, Jardín — 11
artefactos deduplicados en total): lavatorio/ducha/bidet AF+AC,
inodoroDeposito AF-only (conectividad física real, catálogo tiene
`quCaliente=0,12` para ese artefacto pero **no se usa** porque en la
demo está conectado únicamente a AF — no modificar ninguna de las dos
cosas), lavavajillas/lavarropas/canillaDeServicio AF-only.

`t-general`: n=11, Qmax=2,3, a=1, Kc=K=1/√10, **Qc=0,7273238618387272**
— igual exacto al Qc global de M1 (ver sección 3).

## 18. Documentación vigente — CRIT-A y D-δ relevantes para M2

`src/normativa/eras-2023/CRITERIOS.md` (hasta **CRIT-A20**):
CRIT-A10 (sección de escurrimiento), CRIT-A11 (Qc de tramo sobre
consumos aguas abajo), CRIT-A13 (participación por tramo, revisado),
CRIT-A14 (`a` efectivo), CRIT-A15 (conectividad física exclusiva),
CRIT-A16 (Ve=2,0 predimensionamiento), CRIT-A17 (Hazen-Williams),
CRIT-A18 (Darcy-Weisbach turbulento), CRIT-A19 (verificación de
velocidad comercial), CRIT-A20 (compatibilidad `longitud_m`/`Δz`, no
atribuido a ERAS). Todas **cerradas y firmes**.

`PENDIENTES-DE-ARQUITECTURA.md`, sección D-δ (hasta **D-δ.23**):
D-δ.1/D-δ.2 (topología ortogonal, una sola red física AF/AC), D-δ.12
("Montantes AC", hipótesis de diseño histórica — hoy parcialmente
superada por D-δ.23), D-δ.16 (universo de CRIT-A8, **CERRADO**), D-δ.17
(Local simple, dirección preferida, **no cerrada**), D-δ.20/D-δ.21
(topología ≠ tabla de presentación, dirección preferida), D-δ.22
(longitud física independiente de Δz, decisión arquitectónica cerrada),
D-δ.23 (montante = cadena de Tramos reales, validado por Golden 4).

No existen `ARQUITECTURA-v2.1.md` ni `RESUMEN-FASE-0.md` en este repo.
Sí existe `HANDOFF-MODULO-1-A-MODULO-2.md` (precedente de este mismo
documento, para la transición M1→M2).

## NO HACER

- No sumar `Qc` parciales (ni de UF, ni de Locales, ni de segmentos de
  montante) para obtener un `Qc` mayor.
- No capear `K` en 1.
- No convertir `qu = null` en `0`.
- No contar `qu = 0` en `n`.
- No aplicar CRIT-A8 antes del filtrado hidráulicamente activo.
- No modificar valores normativos del catálogo de artefactos.
- No asumir que `inodoroDeposito` tiene conexión física AC en la demo
  (aunque el catálogo tenga `quCaliente=0,12`).
- No confundir `Di` mínimo con diámetro comercial final.
- No identificar `DN` con `Di` interior.
- No poner `C`/`epsilon` dentro de `SistemaDeTuberia`.
- No hardcodear un sistema comercial real sin decisión explícita previa.
- No usar `longitud_m` como sustituto de `Δz`, ni derivarla desde cotas
  (Pitágoras, suma, u otra fórmula).
- No asumir cota o longitud ausente como `0`.
- No permitir `longitud_m ≤ 0`.
- No permitir `longitud_m < |Δz|` cuando los tres datos geométricos están
  presentes.
- No representar una montante como un único Tramo si existen
  derivaciones intermedias — debe segmentarse en Tramos reales.
- No crear una entidad `Montante` paralela a la topología sin análisis
  arquitectónico explícito previo (D-δ.23 ya cerró que NO debe existir).
- No mezclar accesorios/codos/tees/válvulas/`Ks` dentro de `longitud_m`.
- No calcular "% de pérdida" como `hf/Qc`.
- No reducir `Qc` artificialmente para hacer "pasar" una verificación de
  presión.
- No mover los tags listados en la sección 1.
- No hacer commit sin aprobación explícita del usuario.

## OBJETIVO DEL PRÓXIMO CHAT

**Llevar M2 desde geometría validada hasta pérdidas distribuidas
Hazen/Darcy visibles por tramo en la tabla.**

Secuencia recomendada:

### Incremento N1 — sistema comercial productivo
Resolver cómo seleccionar/adoptar un `SistemaDeTuberia` real (hoy solo
existen catálogos ficticios en tests), dónde vive esa selección en el
modelo, y cómo obtener el diámetro interior efectivo real por Tramo. No
confundir Material (propiedad hidráulica, ya cerrado) con Sistema
comercial (geometría, pendiente).

### Incremento N2 — ν / temperatura para Darcy-Weisbach
Cerrar criterio técnico de viscosidad cinemática del agua: valor,
temperatura de referencia, fuente documentada. Sin mezclarlo con
Material (ν es propiedad del agua, no de la tubería).

### Incremento N3 — orquestador de pérdida distribuida
Componer `Qc + Di efectivo + longitud_m + método + C/epsilon (+ν para
Darcy) → hf distribuida`, sin meter `Proyecto` dentro de las primitivas
matemáticas (que deben seguir recibiendo números explícitos).

### Incremento N4 — resultados visibles en tabla
Agregar según diseño real (a definir): Di comercial/adoptado, Di interior
efectivo, velocidad real, estado de verificación de velocidad, método
usado, `hf [m.c.a.]`. Evitar ruido visual innecesario.

### Incremento N5 — geometría/montantes en UX
Retomar cota de origen, cotas relevantes, montante general, N montantes
auxiliares, segmentación por derivaciones — con UI amigable que
**materialice topología real** (Nodo/Tramo reales), nunca una lista
paralela de asignaciones UF→montante.

### Incremento posterior — accesorios (no implementado, diseño ya pensado)
`topología → accesorios estructurales inferibles` + `accesorios
adicionales del usuario` → `ΣK` → pérdidas localizadas.

### Incremento posterior — presión residual (no implementado)
`H_origen − Δz − pérdidas distribuidas − pérdidas localizadas` vs.
`H_min requerida`. **No asumir** que `ParametrosProyecto.presionSobreAcera_m`
es `H_origen` sin inspección/decisión explícita cuando llegue este
incremento — solo comparten convencionalmente la referencia de
vereda/acera con `cota_m` (sección 4), nada más está decidido todavía.

## Riesgos / preguntas abiertas

- Sistema comercial real: ¿selección automática o manual del usuario?
- ¿Dónde persiste el diámetro adoptado por Tramo?
- ν/temperatura: valor y fuente todavía sin cerrar.
- Cómo materializar montantes en la demo/UI sin romper D-δ.23 (siempre
  como Nodo/Tramo reales).
- Cómo agrupar amigablemente AF/AC bajo un mismo concepto visual de
  "montante" sin que la denominación humana se vuelva identidad
  estructural (el `denominacion?` opcional propuesto en el análisis
  previo a Golden 4 sigue sin implementarse).
- Accesorios estructurales automáticos (tees de colector/derivación) vs.
  accesorios editables por el usuario — diseño pendiente completo.
- Tramo terminal hasta el artefacto crítico: hoy oculto en la tabla
  principal (D-δ.20) pero íntegro en `RedHidraulica`; falta decidir cómo
  se expone para presión residual.
- `H_origen`: geométrico vs. carga disponible vs. nivel de tanque — sin
  cerrar.
- Formato locale de C/epsilon en UI (pendiente menor ya registrado en
  sección 15).

## Historial de commits relevantes (hash real + mensaje real)

Checkpoints del tramo final de este chat:

- `0b8b7d3d637839fcdb7659eb94346cc471546ede` — feat: resolver parametro
  de perdida distribuida
- `c6bd37dca1f590c2ec59cd75bb478d17dd64b590` — feat: hacer colapsables
  los modulos principales
- `4d1e7113e4de01bcc88272cf881eba4978979600` — feat: incorporar cota
  geometrica de nodos
- `3ac4a166589f67a6a5bb475b369f23ae89d97ed0` — feat: incorporar
  longitud fisica de tramos
- `92ac0ceb375762f07424e9037cd15997c5392495` — test: validar montante
  segmentada por derivaciones
- `b9dfe8cd03500c88a42f2070785d8f879f3ec29e` — refactor: agrupar
  criterio de predimensionamiento (**HEAD actual**)

Checkpoints previos relevantes para Hazen/Darcy/material/diámetro
comercial:

- `314f980` — feat: configurar metodo global de perdida distribuida
- `b0df939` — refactor: eliminar material legado de parametros
- `c2d2ea8` — feat: configurar material global de tuberia
- `8745a7c` — feat: mostrar trazabilidad de parametros de material
- `b9292eb` — feat: documentar metodologia y fuentes tecnicas
- `be50206` — test: integrar dimensionamiento comercial y velocidad
- `a7504bf` — feat: verificar velocidad comercial admisible
- `c7ce834` — feat: obtener candidatos de diametro comercial
- `a7e923e` — feat: calcular perdida distribuida con darcy weisbach
- `b26d0cd` — docs: adoptar darcy weisbach turbulento
- `5bfb2d2` — feat: calcular perdida distribuida con hazen williams
- `0db3d4a` — docs: adoptar hazen williams para perdida distribuida

## Tests / golden cases críticos — nunca romper inadvertidamente

- `src/motor/tuberias/resolverHidraulicaDeTramo.integracionM1.test.ts` —
  igualdad M1=M2 exacta sobre `t-general`.
- `src/motor/tuberias/resolverHidraulicaDeTramo.golden.test.ts` —
  Golden 1-3 (CRIT-A4/A13/A8/A15) y **Golden 4** (montante segmentada).
- `src/motor/tuberias/participacion/aplicarParticipacionCritA8.test.ts` /
  `filtrarArtefactosHidraulicamenteActivos.test.ts` — CRIT-A8.
- `src/motor/tuberias/simultaneidad/determinarAEfectivo.test.ts` —
  CRIT-A14.
- `src/motor/tuberias/caudal/determinarConectividadFisica.test.ts` /
  `determinarCondicionHidraulicaDeCaudal.test.ts` — CRIT-A15.
- `src/motor/tuberias/velocidad/verificarVelocidadAdmisible.test.ts` —
  CRIT-A19.
- `src/validacion/redHidraulica/index.test.ts` — CRIT-A20 (longitud/cota).
- `src/motor/tuberias/perdidaCarga/calcularPerdidaCargaHazenWilliams.test.ts`
  — CRIT-A17.
- `src/motor/tuberias/perdidaCarga/darcyWeisbach/*.test.ts` — CRIT-A18.
- `src/motor/tuberias/materialTuberia/index.test.ts` — catálogo de
  materiales (6 entradas, valores exactos).
- `src/motor/tuberias/perdidaCarga/resolverParametroDePerdidaDistribuida.test.ts`
  — resolución C/epsilon por método.
- `src/motor/tuberias/geometria/calcularDiferenciaDeCota.test.ts` /
  `esLongitudGeometricamenteValida.test.ts` — geometría base.
