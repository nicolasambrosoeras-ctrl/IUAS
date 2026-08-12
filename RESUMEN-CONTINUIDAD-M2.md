# Resumen de continuidad — Módulo 2 (Tuberías)

Documento técnico operativo para abrir un **chat nuevo de Claude Code** sin
depender del historial de la conversación anterior. Todo lo que sigue fue
verificado contra el repo real al HEAD indicado, no reconstruido de memoria.

## 1. Estado Git

- **Branch**: `main`
- **HEAD**: `48be317f2892526eb109ba33759bcf4c0fb8fa6a`
- **Mensaje del commit HEAD**: `feat: seleccionar diametro comercial por velocidad admisible`
- **`git status`**: `nothing to commit, working tree clean`
- **Commits adelante de `origin/main`**: 105
- **Tests**: 440/440 verdes, 50 archivos de test
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
  `CRITERIOS.md`/`PENDIENTES-DE-ARQUITECTURA.md`/`RESUMEN-CONTINUIDAD-M2.md`/
  similares, nunca requiere build/lint/tsc/tests). Anunciarlo explícitamente
  antes de empezar. Nunca mezclar ambos tipos en un mismo commit salvo
  acuerdo explícito puntual del usuario (ocurrió una vez, en Correctivo 2A,
  por decisión expresa de no dejar documentación contradictoria en un commit
  intermedio).
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
  archivo no previsto, o descubrir una consecuencia no anticipada — p. ej.
  un estado de una unión discriminada que quedó inalcanzable por un cambio
  de política), detenerse y pedir aprobación antes de decidir unilateralmente
  qué hacer con ese hallazgo.
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
**confirmada sin cambios** después de CRIT-A22 (el piso de caudal
individual no interviene en `t-general`, ver sección 9) y después de
CRIT-A23 (selección comercial, no afecta este valor de `Qc`). Casos
Golden G1/G2 de M1 documentados en `src/normativa/eras-2023/CASOS-GOLDEN.md`.

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
- **Ahora consumida productivamente** (N3): cuando está ausente,
  `resolverPerdidaDistribuidaDeTramo` devuelve `sinLongitud` explícito
  (ver sección 11) — nunca asume `0` ni la deriva de `Δz`.

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

Integrado en `src/validacion/redHidraulica/index.ts`
(`validarRedHidraulica`), con dos códigos de validación en
`src/validacion/codigos/index.ts`:
`redHidraulicaTramoLongitudNoPositiva` y
`redHidraulicaTramoLongitudIncompatibleConCota` (ambos severidad `error`).

Documentación: **CRIT-A20** (`CRITERIOS.md`, explícitamente NO atribuido a
ERAS-2023 — es consecuencia geométrica, no interpretación normativa) y
**D-δ.22** (`PENDIENTES-DE-ARQUITECTURA.md`, decisión arquitectónica del
Modelo B).

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
sobre el conjunto real. Este fixture usa un único artefacto por Tramo
(`n=1` en cada segmento), por lo que el piso de caudal individual
(CRIT-A22, sección 9) nunca se activa aquí — no hay contradicción entre
ambos criterios.

**Muy importante**: Golden 4 pasó **sin ningún cambio de código
productivo**. `obtenerArtefactosAguasAbajo` y `resolverHidraulicaDeTramo`
ya eran suficientemente generales — no existe entidad `Montante` en el
modelo; una montante **es** una cadena de Nodos/Tramos reales, segmentada
en cada punto de derivación.

Documentación: **D-δ.23** (`PENDIENTES-DE-ARQUITECTURA.md`), sin CRIT-A
nuevo (es confirmación de una propiedad arquitectónica ya vigente en el
motor, no una decisión normativa nueva).

## 7. Topología / Qc / AF-AC — decisiones cerradas

Sin cambios desde el resumen anterior:

- `obtenerArtefactosAguasAbajo` (`src/motor/tuberias/topologia/`): DFS
  puro sobre `Tramo.nodoOrigenId → nodoDestinoId`, ACS es pass-through,
  artefactos son terminales, dedup por identidad completa UF+Local+
  Artefacto, ignora `Tramo.red` para recorrer.
- `resolverArtefactosReferenciados`: traduce `ReferenciaDeArtefacto` a
  las instancias reales del Proyecto.
- `filtrarArtefactosComputables`: solo `origen === 'normativo'`.
- **CRIT-A8**: se aplica por UF+Local, solo locales domiciliarios, si hay
  inodoro-válvula activo participan solo las válvulas — **después** de
  filtrar participantes hidráulicamente activos, nunca antes. Se aplica
  **independientemente dentro de cada Local**: nunca suprime artefactos de
  otros Locales aguas abajo del mismo Tramo (ver CRIT-A22, sección 9, que
  parte exactamente de esta propiedad).
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
  pregunta relativa al Tramo evaluado. Importante para fixtures: un
  artefacto con `quFria_lps`/`quCaliente_lps=null` en el catálogo (p. ej.
  `valvulaMingitorio`, `lavachatas`, los "Industrial") **lanza** si la
  condición resuelta es `aguaFria`/`aguaCaliente` — para usarlos en un
  fixture simple hace falta o bien un artefacto con esos campos no
  nulos, o construir una topología de tronco común (ver Golden 5 de
  `resolverHidraulicaDeTramo.test.ts`) que resuelva condición `'total'`.
- `t-af-acs` (demo) es alimentación **global** de AF al productor ACS de
  toda la vivienda — nunca se trata como alimentación local, nunca se
  obtiene sumando Qc parciales AC de los Locales.

## 8. Predimensionamiento (Ve=2,0 m/s) — semántica actualizada

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

`ResultadoHidraulicoDeTramo` (tipo, en `resolverHidraulicaDeTramo.ts`) —
**el campo interno sigue llamándose `di_min_mm`, sin renombrar todavía**:

```typescript
type ResultadoHidraulicoDeTramo =
  | { tipo: 'sinDemanda'; qc_lps: 0 }
  | {
      tipo: 'conDemanda'
      qc_lps: number
      simultaneidad: ResultadoSimultaneidadHidraulicaDeTramo   // ver sección 9 (CRIT-A22)
      predimensionamiento: { ve_mps: number; ae_cm2: number; di_min_mm: number }
    }
```

**⚠️ CAMBIO DE SEMÁNTICA IMPORTANTE (Correctivo 2A / CRIT-A23) — leer
antes de usar este valor:** `di_min_mm` **ya NO funciona como filtro de
admisión de diámetro comercial**. Hasta el commit `a0f14dc` (Correctivo
1) esta propiedad todavía se llamaba, y se usaba, como "mínimo
obligatorio". Desde `48be317` (Correctivo 2A) es **puramente una
referencia de predimensionamiento orientativa** — un candidato comercial
con `Di efectivo` menor a este valor puede seguir siendo válido si su
velocidad real cumple CRIT-A19 (ver sección 9). El nombre interno
`di_min_mm` quedó como **deuda terminológica reconocida**: cuando este
valor se propaga hacia las APIs comerciales (`resolverDiametroComercialDeTramo`,
`resolverPerdidaDistribuidaDeTramo`) ya se expone con el nombre correcto,
`diReferenciaPredimensionamiento_mm`. **Renombrar el campo interno
`di_min_mm` es el próximo incremento inmediato — Correctivo 2B, ver
sección "OBJETIVO DEL PRÓXIMO CHAT" — no implementado todavía.**

## 9. Simultaneidad de Tramo — piso físico de caudal individual (CRIT-A22)

**Cerrado en el commit `a0f14dc7440b6c69fce554449ca7c0891e013e7d`**
("fix: aplicar piso de caudal individual por tramo").

Problema detectado: `Kc=1/√(n−1)` no tiene piso. Un Tramo cuyo conjunto
de participantes finales combina un artefacto de caudal alto (típico:
`inodoroValvula`, `quTotal_lps=1,5`) con artefactos pequeños de **otros**
Locales de la misma UF (que CRIT-A8 no suprime, porque solo opera dentro
del Local de la válvula — ver sección 7) puede producir matemáticamente
`Qc estadístico < 1,5 l/s`: un caudal de diseño insuficiente para que la
propia válvula opere. El caso mínimo demostrado (calculado
independientemente, sin invocar el motor): válvula (`1,5`) + 2 aportes de
`0,2` de otros Locales → `n=3`, `Qmax=1,9`, `Kc=1/√2`,
`Qc estadístico≈1,3435028842544403 < 1,5`.

**No es texto explícito de ERAS.** ERAS provee la fórmula de
simultaneidad y CRIT-A8, pero no resuelve este caso (el único ejemplo
oficial con válvula automática, G1 en `CASOS-GOLDEN.md`, combina **dos**
válvulas dominando `Qmax` y no exhibe el problema). Literatura externa
(métodos de fixture units UPC/IPC, que pesan una válvula de descarga en
`10 WSFU` frente a `5 WSFU` de un artefacto de depósito equivalente; ASCE,
*Standardization of Fixture Units for Modern Flush Valves...*, 2020) se
usa únicamente como **sustento contextual** de que el fenómeno es
reconocido en el campo — nunca como fuente textual de la regla adoptada.
**Clasificación: criterio técnico de consistencia física adoptado por
IUAS ante una laguna del procedimiento para poblaciones pequeñas/
heterogéneas** — misma naturaleza epistémica que CRIT-A4/CRIT-A11/CRIT-A13.

**Semántica productiva** (`resolverSimultaneidadHidraulicaDeTramo`,
`src/motor/tuberias/simultaneidad/`):

```
Qc_estadistico = resultado de la fórmula de simultaneidad vigente (sin cambios)
quMaxParticipante = max(qu_lps) sobre los aportes PARTICIPANTES FINALES del Tramo
Qc_final = max(Qc_estadistico, quMaxParticipante)
```

`quMaxParticipante` se calcula exclusivamente sobre el mismo array
`AporteHidraulicoDeTramo[]` que ya alimenta `n`/`Qmax`/`aEfectivo` —
universo post CRIT-A15 (conectividad física) + condición hidráulica +
`qu>0` + CRIT-A8. **Nunca** catálogo bruto, artefactos ya suprimidos por
CRIT-A8, `qu=0`, ni `qu` de la condición hidráulica opuesta.

`ResultadoSimultaneidadHidraulicaDeTramo` (tipo, en
`resolverSimultaneidadHidraulicaDeTramo.ts`, **amplía** —no reemplaza—
`ResultadoSimultaneidadDeTramo` de `calcularSimultaneidadDeTramo.ts`, que
sigue existiendo intacto como la aritmética pura):

```typescript
type ResultadoSimultaneidadHidraulicaDeTramo = Omit<ResultadoSimultaneidadDeTramo, 'qc_lps'> & {
  readonly qcEstadistico_lps: number
  readonly quMaxParticipante_lps: number
  readonly qc_lps: number   // Qc FINAL — ya incluye el piso si intervino
  readonly pisoCaudalIndividualAplicado: boolean
}
```

**Alcance exclusivo Módulo 2 / Qc físico de Tramo — Módulo 1 intacto**:
`calcularSimultaneidad`/`calcularCoeficienteDeSimultaneidad` (M1) no se
tocaron. `calcularSimultaneidadDeTramo` (la fórmula pura de M2) tampoco
se tocó — el piso se aplica en el paso siguiente, dentro de
`resolverSimultaneidadHidraulicaDeTramo`. `Qmax`/`Kc`/`K`/`aEfectivo`
siguen calculándose exactamente igual. `K` sigue sin capearse (CRIT-A2).
CRIT-A8/A13/A14/A15 intactos.

Como consecuencia, `qc_lps` en toda la capa M2 (incluido lo que consumen
N1/N3, ver secciones 10-11) **ya significa el Qc final post-piso**, sin
que esas capas superiores hayan necesitado ningún cambio de código para
heredar la corrección (propagación automática por composición).

Documentado en **CRIT-A22** (`CRITERIOS.md`) — no se creó D-δ adicional
(el CRIT-A ya cubre íntegramente la decisión arquitectónica).

## 10. Diámetro comercial — selección por velocidad real (CRIT-A23)

**Cerrado en el commit `48be317f2892526eb109ba33759bcf4c0fb8fa6a`**
("feat: seleccionar diametro comercial por velocidad admisible").

### 10.1 Sistema comercial productivo (N1, previo — commit `0b3386e`)

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
Magnum PN20** (Grupo Dema), material `ppr`, fuente:
`https://www.grupodema.com.ar/productos/tubo-acqua-system-r-magnum-pn20-acqua-system-101`
(`di` publicado directamente por el fabricante, no derivado). Diámetros
interiores efectivos vigentes:

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
**obligatorio** desde N1 (a diferencia de `redHidraulica`, que sigue
opcional). No es unión cerrada (a diferencia de `MaterialTuberiaId`): el
catálogo de sistemas está pensado para crecer (más series/PN,
fabricantes) sin volver a tocar el modelo. `MaterialTuberia` (propiedad
hidráulica C/ε) y `SistemaDeTuberia`/`SistemaDeTuberiaCatalogado`
(geometría comercial) permanecen conceptualmente separados — `C`/`ε`
nunca entran a `SistemaDeTuberia`.

### 10.2 Política de selección — CRIT-A23 (vigente, reemplaza la anterior)

```
Qc final del Tramo (post CRIT-A22, sección 9)
→ obtenerEntradasOrdenadasPorDiametroInterior(sistema)   -- catálogo completo, ordenado, sin umbral
→ para cada candidato, en orden ascendente de Di efectivo:
    calcular velocidad real (Qc + Di efectivo)
    verificarVelocidadAdmisible(V, Di)                    -- CRIT-A19, sin cambios
    si resulta 'admisible'  → seleccionar este candidato, detener búsqueda
    si 'noAdmisible' o 'fueraDeDominioNormativo' → descartar, continuar
→ si se recorre todo el catálogo sin ningún candidato admisible
    → sinCandidatoAdmisible (resultado explícito, no throw, no extrapola)
```

**`obtenerEntradasOrdenadasPorDiametroInterior(sistema)`** (nueva,
`src/motor/tuberias/diametroComercial/`): devuelve **todas** las entradas
ordenadas ascendente por `diametroInteriorEfectivo_mm`, sin umbral, no
muta el catálogo, orden estable en empates. **`obtenerCandidatosDeDiametroComercial`
(la primitiva original de N1, "`Di efectivo ≥ umbral`") sigue existiendo
intacta, sin cambios de semántica ni de tests** — sigue siendo legítima
para ese caso de uso distinto; nunca se le pasó un umbral artificial
(`0.001`) para simular "todo el catálogo".

**El hueco normativo `60<Di<75mm`** (CRIT-A19) se descarta como
cualquier `fueraDeDominioNormativo`: la búsqueda continúa sin detenerse
(verificado con el candidato real "90mm"/`Di=65,4mm`, que cae en ese
hueco en el catálogo Acqua System).

**`Ve=2,0 m/s` (CRIT-A16) ya NO funciona como filtro de admisión** — ver
sección 8. **`3 m/s` es el techo normativo admisible para diámetros
chicos, nunca un objetivo de diseño.**

`ResultadoDiametroComercialDeTramo` (`resolverDiametroComercialDeTramo.ts`,
en `src/motor/tuberias/`):

```typescript
type ResultadoDiametroComercialDeTramo =
  | { readonly tipo: 'sinDemanda'; readonly qc_lps: 0 }
  | {
      readonly tipo: 'conCandidato'
      readonly qc_lps: number
      readonly diReferenciaPredimensionamiento_mm: number   // informativo, ya NO es filtro
      readonly candidato: EntradaCatalogoTuberia
      readonly velocidadReal_mps: number
      readonly verificacionVelocidad: ResultadoVerificacionVelocidad   // SIEMPRE 'admisible' por construcción; se conserva como evidencia auditable de CRIT-A19, sin booleano redundante
    }
  | {
      readonly tipo: 'sinCandidatoAdmisible'   // reemplaza a 'sinCandidatoSuficiente', que YA NO EXISTE
      readonly qc_lps: number
      readonly diReferenciaPredimensionamiento_mm: number
    }
```

**Propiedad importante para cualquier extensión futura**: como el
candidato que llega a `'conCandidato'` ya fue filtrado por
admisibilidad, la combinación `conCandidato` + `verificacionVelocidad.tipo
!== 'admisible'` es **inalcanzable por construcción** en el camino
automático. No inventar código/tests que la fuercen artificialmente; si
en el futuro se agrega selección manual, esa combinación podría volver a
tener sentido — no decidido todavía.

### 10.3 Casos de referencia vigentes (catálogo real Acqua System Magnum PN20)

| Caso | Qc [l/s] | Candidato elegido | Di efectivo | V real | Candidato con la política **anterior** (superada) |
|---|--:|---|--:|--:|---|
| B1 | 0,200 | 20mm | 14,4 | 1,228 | 20mm (sin cambio) |
| B2 | 0,7273238618387272 | **25mm** | 18,0 | 2,858 | 32mm |
| B3 | 1,0964415971625976 | **32mm** | 23,2 | 2,594 | 40mm |
| B4 (válvula, post CRIT-A22) | 1,500 | **40mm** | 29,0 | 2,271 | 50mm |

Caso real sin candidato admisible: `valvulaMingitorio` (catálogo
normativo real, `quTotal_lps=0,15`) — el candidato más chico (20mm,
`Di=14,4mm`) ya da `V≈0,921 m/s<1` (demasiado lento), y `V` sigue bajando
en todos los mayores → `sinCandidatoAdmisible`. Este caso es
alcanzable con datos 100% reales (catálogo normativo + catálogo
comercial productivo), no solo teórico.

## 11. Pérdida distribuida por Tramo — orquestador productivo (N3)

**Cerrado originalmente en el commit `0b9e6ee96f8cf0d58dcd986b0dce1bf4e8545509`**
("feat: resolver perdida distribuida por tramo"), **su API fue
posteriormente ajustada mecánicamente por Correctivo 2A** (rename de
campos/variante, sin tocar física — ver más abajo) **y por el cierre del
hallazgo `fueraDeDominioTurbulento`** (mismo commit `48be317`, ver 11.2).

`resolverPerdidaDistribuidaDeTramo` (`src/motor/tuberias/`) es el
resolver de más alto nivel del pipeline: compone, sin recalcular ni
reimplementar ninguna fórmula, `resolverDiametroComercialDeTramo` →
`resolverParametroDePerdidaDistribuida` (C o ε según método) →, solo en
Darcy, `resolverPropiedadesAguaParaRed` (temperatura/ν por red). Reutiliza
`velocidadReal_mps` tal cual la devuelve `resolverDiametroComercialDeTramo`
— nunca vuelve a llamar `calcularVelocidad`.

`ResultadoPerdidaDistribuidaDeTramo` — **exactamente 4 variantes**:

```typescript
type ResultadoPerdidaDistribuidaDeTramo =
  | { readonly tipo: 'sinDemanda'; readonly qc_lps: 0 }
  | { readonly tipo: 'sinCandidatoAdmisible'; readonly qc_lps: number; readonly diReferenciaPredimensionamiento_mm: number }
  | {
      readonly tipo: 'sinLongitud'   // Tramo.longitud_m ausente, candidato ya resuelto se preserva
      readonly qc_lps: number
      readonly diReferenciaPredimensionamiento_mm: number
      readonly candidato: EntradaCatalogoTuberia
      readonly velocidadReal_mps: number
      readonly verificacionVelocidad: ResultadoVerificacionVelocidad
    }
  | {
      readonly tipo: 'conPerdidaDistribuida'
      readonly qc_lps: number
      readonly diReferenciaPredimensionamiento_mm: number
      readonly candidato: EntradaCatalogoTuberia
      readonly velocidadReal_mps: number
      readonly verificacionVelocidad: ResultadoVerificacionVelocidad
      readonly longitud_m: number
      readonly hf_m: number
      readonly detalle:
        | { readonly metodo: 'hazenWilliams'; readonly coeficienteC: number; readonly perdidaUnitaria_J_m_m: number }
        | {
            readonly metodo: 'darcyWeisbach'
            readonly rugosidadAbsoluta_mm: number
            readonly temperaturaReferencia_C: number
            readonly viscosidadCinematica_m2s: number
            readonly reynolds: number
            readonly factorFriccion: number
          }
    }
```

**`sinCandidatoSuficiente` ya no existe** (renombrada a
`sinCandidatoAdmisible`, propagación mecánica del cambio de N1). **La
combinación `conCandidato`/`verificacionVelocidad` no-admisible ya no es
alcanzable** (hereda la propiedad de CRIT-A23) — `verificacionVelocidad`
se conserva de todos modos como evidencia auditable.

### 11.1 Hazen (CRIT-A17) y Darcy (CRIT-A18/CRIT-A21) — ahora conectados productivamente

Hazen: `calcularPerdidaCargaUnitariaHazenWilliams(qc_lps, coeficienteC,
Di_efectivo) → J` → `calcularPerdidaCargaHazenWilliams(J, longitud_m) →
hf`. Sin `ν` ni temperatura — Hazen no conoce propiedades del agua.

Darcy: `calcularNumeroReynolds(velocidadReal_mps, Di_efectivo, ν) → Re` →
`calcularFactorFriccionDarcy(Re, ε, Di_efectivo) → f` (Haaland) →
`calcularPerdidaCargaDarcyWeisbach(f, longitud_m, Di_efectivo,
velocidadReal_mps) → hf`. `g=9,81 m/s²`. `ν` proviene de
`resolverPropiedadesAguaParaRed(tramo.red)` (CRIT-A21, sección 12). No se
reabre Colebrook, no se agrega régimen laminar/transicional.

### 11.2 `fueraDeDominioTurbulento` — eliminada del resultado productivo (decisión definitiva)

**Ya no existe como variante de `ResultadoPerdidaDistribuidaDeTramo`.**
Demostración (independiente, sin invocar el resolver): bajo CRIT-A23,
todo candidato que llega a `'conCandidato'` ya fue verificado admisible
por CRIT-A19 (`V≥1 m/s` para `13–60mm`; `V≥1,5 m/s` para `75–200mm`).
Con la viscosidad productiva de CRIT-A21 (`ν≈1,0034e-6 m²/s`), el punto
más desfavorable de todo el dominio normativo (`Di=13mm`, `V=1 m/s`) ya
da `Re≈12955,95` — más de 3× `UMBRAL_REYNOLDS_TURBULENTO=4000`
(demostrado en `resolverPerdidaDistribuidaDeTramo.test.ts`, componiendo
`calcularNumeroReynolds` + `resolverPropiedadesAguaParaRed`, sin invocar
el resolver). **CRIT-A19 + CRIT-A21 + CRIT-A23 garantizan juntos, por
construcción, que Darcy nunca opera fuera de su dominio turbulento** en
el camino automático.

**El guard `Re<UMBRAL_REYNOLDS_TURBULENTO` permanece completamente
intacto** en `calcularFactorFriccionDarcy` (CRIT-A18, primitiva
matemática) — no se debilitó ni se eliminó, con sus tests unitarios
vigentes (régimen turbulento válido / `Re<4000` rechazado). Solo dejó de
tener una rama productiva correspondiente en `resolverPerdidaDistribuidaDeTramo`,
porque la capa superior ya garantiza que nunca se lo invoca fuera de
dominio.

### 11.3 Goldens N3 vigentes

`resolverPerdidaDistribuidaDeTramo.test.ts` — Goldens Hazen/Darcy con
`Qc=0,2 l/s` (lavatorio único, `n=1`) **siguen numéricamente vigentes**
después de CRIT-A23: `20mm`/`Di=14,4mm` sigue siendo el primer (y único
necesario) candidato admisible para ese `Qc`, sin cambios.

## 12. Propiedades del agua para Darcy — ν/temperatura (CRIT-A21)

**Cerrado en el commit `82e24f6b41abdb0e2b03a83857b35bf51708a660`**
("feat: definir propiedades del agua para darcy").

`src/motor/tuberias/perdidaCarga/darcyWeisbach/propiedadesAguaDarcy.ts`:

```typescript
export const TEMPERATURA_REFERENCIA_AGUA_C = 20
export const VISCOSIDAD_CINEMATICA_AGUA_M2S = 1.0034e-6
export function resolverPropiedadesAguaParaRed(red: RedDeTramo): { temperaturaReferencia_C: number; viscosidadCinematica_m2s: number }
```

Fuente: **NIST Chemistry WebBook** (agua, formulación IAPWS), 1 bar,
20°C. Publicado directamente: `μ=1,0016e-3 Pa·s`, densidad `55,409
mol/L`. Derivado: `ρ=998,208 kg/m³` (masa molar IAPWS 18,015268 g/mol),
`ν=μ/ρ=1,0034e-6 m²/s`. **No es un valor publicado por ERAS-2023.**
`AF` y `AC` devuelven **hoy el mismo valor** — decisión deliberada, no un
descuido: la resolución por red deja preparada una futura
diferenciación (impacto cuantificado ~6-15% sobre `hf` entre 10°C y
60°C) sin tener que modificar el orquestador de pérdidas cuando se
adopte. `ν` es propiedad del agua, no de la tubería — nunca se agregó a
`MaterialTuberia`/`SistemaDeTuberia`.

## 13. Materiales

Sin cambios desde el resumen anterior. `src/motor/tuberias/materialTuberia/index.ts`:

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
casualmente por 0,0015**. `obtenerMaterialTuberia(materialId,
catalogoMateriales)` resuelve por ID, catálogo por parámetro, `find` +
`throw` explícito, sin fallback.

Ninguno de estos valores proviene de una tabla publicada por ERAS-2023.
Cada material tiene un único valor operativo de C y de ε; no se modela
edad/corrosión/incrustación/estado superficial en esta primera versión.

## 14. Configuración hidráulica global — actualizada (sistema comercial obligatorio)

`modelo/proyecto/index.ts`:

```typescript
type MetodoPerdidaDistribuida = 'hazenWilliams' | 'darcyWeisbach'
type ConfiguracionHidraulica = {
  metodoPerdidaDistribuida: MetodoPerdidaDistribuida
  materialTuberiaId: MaterialTuberiaId
  sistemaDeTuberiaId: string   // agregado en N1 — obligatorio, ver sección 10.1
}
```

Los tres campos **obligatorios**. `Proyecto.configuracionHidraulica` es
la única fuente de verdad (no hay estado paralelo).

`src/motor/tuberias/perdidaCarga/resolverParametroDePerdidaDistribuida.ts`
— **sin cambios de firma**, pero **ahora sí consumido productivamente**
por `resolverPerdidaDistribuidaDeTramo` (N3, sección 11) — ya no es una
función de motor completa sin conectar:

```typescript
type ParametroDePerdidaDistribuida =
  | { readonly metodo: 'hazenWilliams'; readonly coeficienteC: number }
  | { readonly metodo: 'darcyWeisbach'; readonly rugosidadAbsoluta_mm: number }

function resolverParametroDePerdidaDistribuida(proyecto: Proyecto, catalogoMateriales: readonly MaterialTuberia[]): ParametroDePerdidaDistribuida
```

Union discriminada que hace imposible representar ambos valores a la vez.
Las primitivas matemáticas (Hazen/Darcy) siguen recibiendo números
explícitos, sin conocer `Proyecto`/`MaterialTuberiaId`/catálogo.

## 15. UI de Módulo 2 actual — sin cambios desde N1

**Ningún incremento de N1 a Correctivo 2A tocó UI.** `MotorDemandaPantalla.tsx`:
bloques principales colapsables (`<details>` nativo, sin router, sin
librerías nuevas, sin estado React):

- **Módulo 1 — Demanda**: `<details open>`.
- **Módulo 2 — Tuberías**: `<details open>` (gate de validación
  existente, sin cambios).
- **Metodología y fuentes técnicas**: `<details>` sin `open`.

Dentro de Módulo 2 (`ResultadoHidraulicoDeTramo.tsx`),
`ConfiguracionHidraulicaFormulario`: select método, select material,
`<details>` con parámetros de cálculo (material, C o ε, fuente,
disclaimers). **Puramente informativo: cambiar método/material todavía
no dispara ningún cálculo de pérdidas ni modifica las tablas de Qc/Di
existentes en la UI** (aunque el motor ya sí las calcula productivamente
desde N3 — la UI simplemente no las muestra todavía; eso es N4).

**No existe todavía ningún selector de sistema comercial en la UI** — el
`sistemaDeTuberiaId` del demo está fijado en código (sección 17), no es
editable por el usuario.

## 16. Metodología y fuentes técnicas (Nivel 2 documental)

Sin cambios. `src/interfaz/paginas/MetodologiaYFuentesTecnicas.tsx` —
tabla derivada 100% de `catalogoMaterialesTuberia`. Pendiente menor sin
resolver: formato locale de C/epsilon (hoy literal JS crudo, para no
perder precisión significativa).

## 17. Filas visibles actuales de M2

Sin cambios. `src/interfaz/paginas/identificarFilasDeModulo2.ts` —
agrupamiento puramente estructural, sin heurísticas de string de ID.
Los tramos terminales siguen existiendo íntegros en `RedHidraulica` pero
no se muestran en la tabla principal (D-δ.20/D-δ.21).

## 18. Demo actual (`MotorDemandaPantalla.tsx`, `proyectoInicial`)

Topología física sin cambios (nodo hub `n-0`, topología plana, **0
tramos con `longitud_m` cargado** — confirmado por inspección, relevante
para N3: el demo no puede ejercitar `hf` productivamente tal cual está,
solo `sinLongitud`). `t-general` (`Qc=0,7273238618387272`) y `t-af-acs`
sin cambios (sección 3/7).

**`configuracionHidraulica` del demo actualizada** (N1): ahora incluye
`sistemaDeTuberiaId: 'acquaSystemMagnumPn20'` (coherente con
`materialTuberiaId: 'ppr'` ya existente). `metodoPerdidaDistribuida:
'hazenWilliams'` sin cambios.

Locales/artefactos sin cambios: 11 artefactos deduplicados
(lavatorio/ducha/bidet AF+AC, `inodoroDeposito` AF-only —
**no `inodoroValvula`**, por eso el piso de CRIT-A22 nunca se activa en
este demo—, lavavajillas/lavarropas/canillaDeServicio AF-only).

## 19. Documentación vigente — CRIT-A y D-δ relevantes para M2

`src/normativa/eras-2023/CRITERIOS.md` (hasta **CRIT-A23**):
CRIT-A10, CRIT-A11, CRIT-A13, CRIT-A14, CRIT-A15, CRIT-A16 (Ve=2,0,
**semántica actualizada** — sección 8), CRIT-A17 (Hazen), CRIT-A18
(Darcy turbulento), CRIT-A19 (verificación de velocidad, **puntos 4/5
marcados como históricos/superados**, rangos normativos intactos),
CRIT-A20 (longitud/cota), **CRIT-A21** (propiedades del agua, sección
12), **CRIT-A22** (piso de caudal individual, sección 9), **CRIT-A23**
(selección comercial por velocidad, sección 10.2). Todas **cerradas y
firmes**.

`PENDIENTES-DE-ARQUITECTURA.md`, sección D-δ (hasta **D-δ.25** — no
existe D-δ.24, se decidió que CRIT-A21 no necesitaba D-δ complementario):
D-δ.1/D-δ.2, D-δ.12, D-δ.16 (CERRADO), D-δ.17 (no cerrada), D-δ.20/D-δ.21
(dirección preferida), D-δ.22 (cerrada), D-δ.23 (montante, validado),
**D-δ.25** (orquestador N3 — actualizado en Correctivo 2A: rename de
campos/variante, nota definitiva sobre `fueraDeDominioTurbulento`
eliminada, nota sobre `conCandidato`/`noAdmisible` inalcanzable).

No existen `ARQUITECTURA-v2.1.md` ni `RESUMEN-FASE-0.md` en este repo.
Sí existe `HANDOFF-MODULO-1-A-MODULO-2.md` (precedente de este mismo
documento).

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
- No confundir `Di` de referencia de predimensionamiento con diámetro
  comercial final — y **no usarlo como filtro de admisión comercial**
  (CRIT-A23 ya reemplazó esa política).
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
- No crear una entidad `Montante` paralela a la topología (D-δ.23 cerrado).
- No mezclar accesorios/codos/tees/válvulas/`Ks` dentro de `longitud_m`.
- No calcular "% de pérdida" como `hf/Qc`.
- No reducir `Qc` artificialmente para hacer "pasar" una verificación de
  presión (regla que va a ser crítica cuando se implemente presión
  residual — sección "Pendiente prioritario").
- **No usar `Qc` estadístico bruto como Qc final de Tramo en M2** — usar
  siempre el `qc_lps` ya resultante de `resolverSimultaneidadHidraulicaDeTramo`
  (con el piso de CRIT-A22 ya aplicado).
- **No reintroducir `Di` de predimensionamiento como filtro de selección
  comercial** — la política vigente es CRIT-A23 (recorrer todo el
  catálogo, verificar velocidad real por candidato).
- **No usar `obtenerCandidatosDeDiametroComercial` con un umbral
  artificial** (`0.001`, etc.) para simular "todo el catálogo" — usar
  `obtenerEntradasOrdenadasPorDiametroInterior`.
- **No reintroducir la variante `fueraDeDominioTurbulento`** en
  `ResultadoPerdidaDistribuidaDeTramo` sin volver a analizar la propiedad
  derivada de CRIT-A19+A21+A23 que la volvió inalcanzable.
- No debilitar ni eliminar el guard `Re<UMBRAL_REYNOLDS_TURBULENTO` de
  `calcularFactorFriccionDarcy` (CRIT-A18) — sigue siendo la defensa de
  la primitiva matemática, independiente de que la capa superior ya
  garantice no alcanzarlo en la práctica.
- No mover los tags listados en la sección 1.
- No hacer commit sin aprobación explícita del usuario.

## OBJETIVO DEL PRÓXIMO CHAT

**M2 ya tiene el pipeline completo Qc → diámetro comercial → `hf`
Hazen/Darcy calculado productivamente por el motor.** Falta: limpieza
terminológica pequeña, luego exponerlo en UI, luego accesorios/presión.

### ⚠️ PRIMER PASO INMEDIATO — Correctivo 2B (mecánico, pequeño)

**Renombrar `di_min_mm` internamente.** Alcance:

- `calcularPredimensionamientoDeTramo.ts` (tipo `PredimensionamientoDeTramo`,
  campo `di_min_mm`).
- `ResultadoHidraulicoDeTramo` (`resolverHidraulicaDeTramo.ts`).
- Todos los consumidores/tests que leen `.predimensionamiento.di_min_mm`.
- Textos de UI si en algún lugar dicen "Di mínimo" (verificar
  `ParametroDeCalculoDelMaterial`/`ResultadoHidraulicoDeTramo.tsx`).

Nombre preferido (ya usado en las APIs comerciales, mantener
consistencia): `diReferenciaPredimensionamiento_mm`. Si la inspección
revela una convención mejor, proponerla antes de implementar — no
decidir unilateralmente.

**Explícitamente NO incluye**: cambio numérico, cambio de selección
comercial, cambio de CRIT-A23. Es un incremento mecánico puro, análisis
read-only primero, como todos los anteriores.

### ⚠️ Hallazgo UI/integración — sincronización Proyecto ↔ `redHidraulica`, sin analizar todavía

Los cambios realizados en M1 sobre artefactos (alta, baja,
aumento/disminución de cantidades, duplicaciones y operaciones
equivalentes) **no actualizan automáticamente `redHidraulica`**. M2
continúa calculando solo sobre las referencias físicas ya existentes en
la topología. Debe definirse una política de sincronización
`Proyecto ↔ redHidraulica` **antes de considerar M2 funcionalmente
integrado y antes de cerrar N4/UI**.

Aclaraciones importantes:

- **No es un error del motor hidráulico** — `resolverHidraulicaDeTramo`
  y todo lo que compone hacen exactamente lo que deben hacer sobre la
  topología que reciben.
- `redHidraulica` **sigue siendo físicamente autoritativa** (CRIT-A15) —
  esto no cuestiona esa decisión.
- **No corresponde "sumar automáticamente" un artefacto** a `redHidraulica`
  sin definir a qué nodo/tramo físico queda conectado — eso sería
  inventar topología, exactamente lo que este proyecto evita en todos
  los criterios de geometría (CRIT-A20, D-δ.22).
- Debe analizarse **en el próximo chat** una estrategia de
  sincronización/generación de topología — **no analizado ni diseñado
  todavía en este documento**.
- Una posible solución futura puede ser híbrida (topología inicial
  automática + topología explícita/editable) — mencionada aquí solo como
  hipótesis a evaluar, **no adoptada**.

### Después de Correctivo 2B

### Incremento N4 — resultados visibles en tabla
Agregar según diseño real (a definir): Di comercial/adoptado, Di interior
efectivo, velocidad real, estado de verificación de velocidad, método
usado, `hf [m.c.a.]`. Evitar ruido visual innecesario. Requiere primero
decidir si se migra el demo para tener al menos un `longitud_m` cargado
(hoy 0 tramos lo tienen) o si se usa otro proyecto de prueba.

### Incremento N5 — geometría/montantes en UX
Retomar cota de origen, cotas relevantes, montante general, N montantes
auxiliares, segmentación por derivaciones — con UI amigable que
**materialice topología real** (Nodo/Tramo reales), nunca una lista
paralela de asignaciones UF→montante.

### Incremento posterior — accesorios (no implementado, diseño ya pensado)
`topología → accesorios estructurales inferibles` + `accesorios
adicionales del usuario` → `ΣK` → pérdidas localizadas.

### Incremento posterior — presión residual (no implementado)

Algoritmo conceptual (no implementar todavía):

```
Qc final
→ candidatos admisibles por velocidad (CRIT-A23)
→ hf distribuida (N3, ya implementado)
→ hf localizada (no implementado)
→ Δz
→ presión residual
→ verificar presión mínima según criterio seleccionado
→ si no cumple: evaluar siguiente candidato admisible
→ aceptar primer candidato que cumpla simultáneamente velocidad + presión
```

Recordar: un diámetro mayor puede violar la velocidad **mínima** (ya
demostrado con datos reales en CRIT-A23) — "aumentar el diámetro" no es
una solución universal. Nunca reducir `Qc` para hacer pasar presión.

**No asumir** que `ParametrosProyecto.presionSobreAcera_m` es `H_origen`
sin inspección/decisión explícita — solo comparten convencionalmente la
referencia de vereda/acera con `cota_m`, nada más está decidido todavía.

#### ⚠️ Pendiente técnico importante detectado, todavía sin investigar — presión mínima ERAS vs. práctica IUAS

Se detectó una **tensión práctica** entre las presiones mínimas exigidas
por ERAS para muchos artefactos y la alimentación domiciliaria
tradicional por tanque elevado. Ejemplo conceptual (sin verificar
todavía): ERAS puede exigir del orden de `0,6 bar / ~6 m.c.a.` en
determinados puntos, mientras que la práctica constructiva tradicional
de alimentación gravitacional usa frecuentemente separaciones del orden
de `2–2,5 m` entre el pelo de agua del tanque y el punto alto de la
ducha — geométricamente insuficiente para esa presión mínima si se
interpreta estrictamente. **No se adoptó ningún valor todavía.**

**Antes de programar presión residual**, hace falta una investigación
read-only de:

- tabla exacta de presiones mínimas ERAS (releer texto completo, no de
  memoria);
- antecedentes normativos previos (OSN/AySA) si existen y son
  accesibles;
- bibliografía sanitaria y manuales/fabricantes;
- la regla de rubro "2–2,5 m entre pelo de agua y ducha superior" — de
  dónde sale, si es real, si está documentada en algún lado citable;
- requisitos específicos por tipo de artefacto (calefones, termotanques,
  mezcladoras, duchas, válvulas) si ERAS los distingue.

Hipótesis a estudiar (no aprobada, no implementar): un selector explícito
`criterioPresionMinima: 'eras' | 'iuas'`, donde `'eras'` sea verificación
estricta contra valores normativos e `'iuas'` sea un criterio técnico
alternativo documentado para configuraciones domiciliarias por gravedad
— posiblemente con tabla propia por tipo/familia de artefacto, no un
único valor. Trazabilidad obligatoria de qué criterio se usó en cada
verificación; nunca reinterpretar un resultado bajo criterio IUAS como
cumplimiento ERAS.

Salida futura deseable (no implementar): `presionResidualDisponible`,
`presionMinimaRequerida`, `criterioAplicado`, `margen`.

## Riesgos / preguntas abiertas

- **Correctivo 2B**: nombre final de `di_min_mm` — a confirmar antes de
  implementar (preferencia actual: `diReferenciaPredimensionamiento_mm`).
- **Sincronización Proyecto ↔ `redHidraulica`** (ver "Hallazgo
  UI/integración" arriba) — cambios de artefactos en M1 no propagan a la
  topología; estrategia sin analizar, pendiente antes de N4/UI.
- **Presión mínima ERAS vs. IUAS** (ver arriba) — investigación read-only
  pendiente, ninguna decisión tomada.
- Cómo materializar montantes en la demo/UI sin romper D-δ.23 (siempre
  como Nodo/Tramo reales).
- Cómo agrupar amigablemente AF/AC bajo un mismo concepto visual de
  "montante" sin que la denominación humana se vuelva identidad
  estructural.
- Accesorios estructurales automáticos (tees de colector/derivación) vs.
  accesorios editables por el usuario — diseño pendiente completo.
- Tramo terminal hasta el artefacto crítico: hoy oculto en la tabla
  principal (D-δ.20) pero íntegro en `RedHidraulica`; falta decidir cómo
  se expone para presión residual.
- `H_origen`: geométrico vs. carga disponible vs. nivel de tanque — sin
  cerrar (relacionado con el pendiente de presión ERAS vs. IUAS).
- Formato locale de C/epsilon en UI (pendiente menor, sección 16).
- El demo (`proyectoInicial`) tiene **0 tramos con `longitud_m`** — N4
  necesitará decidir si se migra el demo o se usa otro proyecto de
  prueba para mostrar `hf` en pantalla.
- Selección manual de diámetro por Tramo — explícitamente fuera de
  alcance hasta ahora; si se adopta en el futuro, revisar si la
  combinación `conCandidato`+velocidad-no-admisible vuelve a tener
  sentido productivo (hoy inalcanzable por construcción, ver sección 10.2).

## Estado aproximado M2 (orientativo, no contractual)

- Topología / demanda / simultaneidad (incl. piso CRIT-A22): **cerradas**.
- Materiales / sistemas comerciales: **cerrados**.
- Selección comercial por velocidad (CRIT-A23): **funcionalmente
  cerrada**, pendiente rename mecánico (Correctivo 2B).
- Pérdida distribuida Hazen/Darcy (N3): **cerrada**.
- Geometría / cotas / longitudes: **implementadas**.
- Pérdidas localizadas / accesorios: **pendiente**.
- Balance de presión (incl. tensión ERAS vs. IUAS): **pendiente**,
  investigación read-only sin empezar.
- Selección final velocidad+presión: **pendiente**.
- UI final de M2 (N4/N5): **pendiente**.

## Historial de commits relevantes (hash real + mensaje real)

Checkpoints de este chat (N1 → Correctivo 2A), del más reciente al más antiguo:

- `48be317f2892526eb109ba33759bcf4c0fb8fa6a` — feat: seleccionar
  diametro comercial por velocidad admisible (**HEAD actual**, CRIT-A23)
- `a0f14dc7440b6c69fce554449ca7c0891e013e7d` — fix: aplicar piso de
  caudal individual por tramo (CRIT-A22)
- `0b9e6ee96f8cf0d58dcd986b0dce1bf4e8545509` — feat: resolver perdida
  distribuida por tramo (N3)
- `82e24f6b41abdb0e2b03a83857b35bf51708a660` — feat: definir propiedades
  del agua para darcy (N2, CRIT-A21)
- `0b3386e0ce0e3186475b672655f269bab64a5de4` — feat: incorporar sistema
  comercial de tuberia (N1, `SistemaDeTuberiaCatalogado`/Acqua System)

Checkpoints previos (chat anterior, ya incorporados a este resumen):

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
  igualdad M1=M2 exacta sobre `t-general` (`Qc=0,7273238618387272`),
  confirmada sin cambios después de CRIT-A22/A23.
- `src/motor/tuberias/resolverHidraulicaDeTramo.golden.test.ts` —
  Golden 1-3 (CRIT-A4/A13/A8/A15) y Golden 4 (montante segmentada).
- `src/motor/tuberias/resolverHidraulicaDeTramo.pisoCaudalIndividual.golden.test.ts`
  — casos A1-A6 de CRIT-A22 con topología/catálogo reales.
- `src/motor/tuberias/simultaneidad/resolverSimultaneidadHidraulicaDeTramo.test.ts`
  — CRIT-A22, incluido el caso mínimo de cruce (`n=3`).
- `src/motor/tuberias/participacion/aplicarParticipacionCritA8.test.ts` /
  `filtrarArtefactosHidraulicamenteActivos.test.ts` — CRIT-A8.
- `src/motor/tuberias/simultaneidad/determinarAEfectivo.test.ts` —
  CRIT-A14.
- `src/motor/tuberias/caudal/determinarConectividadFisica.test.ts` /
  `determinarCondicionHidraulicaDeCaudal.test.ts` — CRIT-A15.
- `src/motor/tuberias/velocidad/verificarVelocidadAdmisible.test.ts` —
  CRIT-A19.
- `src/validacion/redHidraulica/index.test.ts` — CRIT-A20 (longitud/cota).
- `src/motor/tuberias/sistemaDeTuberia/index.test.ts` — catálogo Acqua
  System Magnum PN20 (N1).
- `src/motor/tuberias/diametroComercial/obtenerCandidatosDeDiametroComercial.test.ts`
  — primitiva original intacta.
- `src/motor/tuberias/diametroComercial/obtenerEntradasOrdenadasPorDiametroInterior.test.ts`
  — primitiva nueva de CRIT-A23.
- `src/motor/tuberias/resolverDiametroComercialDeTramo.test.ts` — Goldens
  B1-B4, `valvulaMingitorio` sin candidato, hueco 60-75mm (CRIT-A23).
- `src/motor/tuberias/perdidaCarga/darcyWeisbach/propiedadesAguaDarcy.test.ts`
  — CRIT-A21 (N2).
- `src/motor/tuberias/resolverPerdidaDistribuidaDeTramo.test.ts` —
  Goldens Hazen/Darcy (N3), incluida la propiedad derivada
  `Re>UMBRAL_REYNOLDS_TURBULENTO` en el límite de CRIT-A19.
- `src/motor/tuberias/perdidaCarga/calcularPerdidaCargaHazenWilliams.test.ts`
  — CRIT-A17.
- `src/motor/tuberias/perdidaCarga/darcyWeisbach/calcularNumeroReynolds.test.ts` /
  `calcularFactorFriccionDarcy.test.ts` — CRIT-A18, incluido el guard
  `Re<4000`.
- `src/motor/tuberias/materialTuberia/index.test.ts` — catálogo de
  materiales (6 entradas, valores exactos).
- `src/motor/tuberias/perdidaCarga/resolverParametroDePerdidaDistribuida.test.ts`
  — resolución C/epsilon por método.
- `src/motor/tuberias/geometria/calcularDiferenciaDeCota.test.ts` /
  `esLongitudGeometricamenteValida.test.ts` — geometría base.
