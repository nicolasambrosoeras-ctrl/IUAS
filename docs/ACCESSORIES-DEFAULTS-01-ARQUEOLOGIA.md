# ACCESSORIES-DEFAULTS-01 — Arqueología (Fase A)

No cierra el slice. Registro temporal de investigación previo a la
decisión roja. Se completa/renombra a `docs/ACCESSORIES-DEFAULTS-01.md`
después de que el usuario responda.

## Modelo de accesorios físicos (`Tramo.accesorios`)

`src/modelo/redHidraulica/index.ts`:

```ts
export type IdAccesorioDeTramo =
  | 'curva45' | 'curva90' | 'codo90'
  | 'llaveDePaso' | 'valvulaEsclusa' | 'uniones'
  | 'tuboSaliente' | 'reducciones';

export type AccesorioDeTramo = { tipo: IdAccesorioDeTramo; cantidad: number };
```

Subconjunto de Tabla N°7 declarable por Tramo. Deliberadamente NO incluye
las 3 variantes de Tee (viven en `Nodo.tee`, geometría de nodo, no de
Tramo) ni griferías (CRIT-A29: absorbidas en `presionMinima_kgcm2` del
artefacto). `undefined` = no relevado; `[]` = relevado, sin accesorios de
este subconjunto (nunca se asume `[]` por defecto).

Editor: `AccesoriosDeTramoEditor.tsx` — única superficie de UI que
persiste tipo+cantidad por Tramo, sólo en modo `'detallado'`. `Ks` nunca
se persiste, siempre se resuelve desde Tabla N°7 en el motor.

## Tabla N°7 (`tabla-07-perdidas-localizadas/index.ts`)

| id | nombre | Ks |
|---|---|---|
| griferias | Griferías | 9.18 |
| curva45 | Curva a 45º | 0.43 |
| curva90 | Curva a 90º | 0.81 |
| codo90 | Codo a 90º | 1.35 |
| teePasoRecto | Tee paso recto | 1.0 |
| teeSalidaLateral | Tee salida lateral | 1.62 |
| teeEntradaCentralSalidasLaterales | Tee entrada central, salidas laterales | 3.0 |
| llaveDePaso | Llave de paso | 9.18 |
| uniones | Uniones | 0.1 |
| valvulaEsclusa | Válvula esclusa | 0.17 |
| reducciones | Reducciones | 0.75 |
| tuboSaliente | Tubo saliente | 1.0 |

Todos los IDs de `IdAccesorioDeTramo` son físicamente inequívocos (una
pieza concreta comprable). Las 3 variantes de Tee y "griferías" existen en
Tabla N°7 pero NO en `IdAccesorioDeTramo` (Tee vive en `Nodo.tee`;
griferías nunca se computan como pérdida de red, CRIT-A29).

## HYD-EST actual — `resolverPerdidaLocalizadaEstimadaDeLocal.ts` (D-δ.40/D-δ.45, CERRADO)

Confirmado en código, no sólo en handoff:

```ts
export const KS_ESTIMADO_TEE = obtenerKsDeAccesorio('teeEntradaCentralSalidasLaterales') // 3.00
export const KS_ESTIMADO_SINGULARIDAD_TERMINAL = obtenerKsDeAccesorio('codo90')          // 1.35
export const KS_ESTIMADO_LLAVE_DE_PASO = obtenerKsDeAccesorio('llaveDePaso')             // 9.18

n = contarTerminalesFisicosDeLocal(...)
nTeesEstimadas       = max(0, n - 1)
nSingularidadTerminal = n >= 1 ? 1 : 0   // CONSTANTE, no escala con n
nLlaveDePaso          = n >= 1 ? 1 : 0   // CONSTANTE, no escala con n
```

Correspondencia física confirmada contra Tabla N°7 (no asumida):
K=3.00 → **Tee entrada central, salidas laterales** (peor Ks de las 3
variantes de Tee, D-δ.40). K=1.35 → **Codo a 90°** (decisión roja D-δ.45,
resuelta por el usuario a favor de la opción más conservadora entre
curva90/codo90/tuboSaliente). K=9.18 → **Llave de paso** (decisión roja
D-δ.45, resuelta por el usuario: sí incluirla, 1 por Local+red).

Aplica UNA sola vez por `(Local, red)`, nunca por terminal ni por Tramo.
`V_ref` = velocidad del Tramo REPRESENTATIVO de ese Local+red (mismo
Tramo que ve/edita el usuario en la fila de M2).

**Único valor por Local+red**: no se distribuye por Tramo interno — no
hay relevamiento de DÓNDE, dentro del Local, está cada componente.

Esta plantilla es un modelo HIDRÁULICO (para calcular `hf`), documentada
como decisión de producto explícita, NO transcripción de ERAS-2023. Nunca
se convierte hoy en pieza de compra (`resolverDatosDeListadoDeMateriales.ts`
la excluye expresamente).

## `MetodoPerdidaLocalizada` — discriminador global YA existente

`src/modelo/proyecto/index.ts`:

```ts
export type MetodoPerdidaLocalizada = 'detallado' | 'estimado';
```

Selección ÚNICA y GLOBAL del Proyecto (no por Tramo/Local/red). Los dos
modos son ALTERNATIVOS, nunca aditivos (ya documentado en el propio tipo:
"nunca deben sumarse pérdidas 'detallado' + 'estimado' para las mismas
singularidades"). Esto es exactamente el discriminador de origen que
Materials necesitaría para distinguir "Estimado" de "Definido" — **ya
existe, no hace falta inventar un campo `origen` nuevo**: alcanza con leer
`proyecto.configuracionHidraulica.metodoPerdidaLocalizada` al construir el
listado de materiales.

`GranularidadHidraulica: 'simplificada' | 'profesional'` es ORTOGONAL:
decide qué Tramos físicos del camino participan (uno agregado por
Local+red, o cada rama real hasta cada artefacto), no cómo se calcula la
pérdida localizada. Las 4 combinaciones son válidas y ninguna está
prohibida.

**Confirmado en `modoDeTrabajo.ts`**: el preset de "Modo Rápido"
(`PRESET_EJES_INICIALES`, usado también por defecto en `proyectoDeEjemplo.ts`
y `crearProyectoVacio.ts`) es exactamente
`granularidadHidraulica: 'simplificada'` + `metodoPerdidaLocalizada: 'estimado'`.
Es decir: el camino más común (Rápido) es precisamente el que hoy
NO aporta nada a Materials en materia de accesorios.

## Tee nodal — topología real, YA se computa en Materials (siempre, sin depender del modo)

`resolverDatosDeListadoDeMateriales.ts` → `resolverTees()`: recorre TODOS
los nodos con exactamente 1 entrante y 2 salientes, exige `Nodo.tee`
configurado explícitamente (si no, lo reporta como pendiente de
especificación), y computa una Tee física con DN real de sus 3 bocas.
Esto corre SIEMPRE, independientemente de `metodoPerdidaLocalizada` — no
está condicionado por `modoDetallado`. CRIT-A30 se respeta explícitamente
en el comentario de esa función: un cambio de DN entre Tramos nunca
infiere una Reducción.

**Consecuencia importante para evitar doble conteo (§17 del pedido)**: en
`granularidadHidraulica: 'simplificada'` (el caso por defecto de Modo
Rápido), el Local+red se modela como UN ÚNICO Tramo agregado — no existen
nodos de bifurcación reales dentro del Local, así que `resolverTees()` no
tiene NADA que computar ahí (no hay `Nodo.tee` que relevar: la topología
literalmente no representa las ramas internas). Sólo en
`granularidadHidraulica: 'profesional'` puede haber ramas reales con
`Nodo.tee` explícito dentro de un Local, y esas SÍ ya se computan hoy vía
`resolverTees()` sin relación con `metodoPerdidaLocalizada`.

## Qué es determinable por topología vs. convención vs. no determinable

**Determinable por topología** (ya se computa, sin cambios necesarios):
Tee nodal explícita en cualquier nodo 1→2 con `Nodo.tee` configurado,
cualquiera sea el modo de pérdida localizada o la granularidad.

**Convención razonable pero no deducible de la topología** (exactamente
lo que D-δ.45 ya resolvió para hidráulica, nunca para compra): 1
"singularidad terminal" (codo90) y 1 "llave de paso" por Local+red con
n≥1 terminales físicos. No hay forma de saber, sin relevamiento real,
CUÁNTOS codos/curvas/uniones hay dentro de un Local — D-δ.45 fue
deliberadamente conservador y mínimo (1 + 1), no un intento de contar
piezas reales.

**No determinable / sin convención cerrada**: cantidad de uniones,
reducciones, válvulas esclusa, curvas 45°/90° adicionales; accesorios de
Montante (codos/uniones por segmento — depende del montaje real, ver
brief §18); accesorios de Alimentación general/ACS (idem, brief §19);
conexiones terminales tipo flexible/llave escuadra (no existen hoy en
`IdAccesorioDeTramo`, ver brief §15 — quedan fuera, no se inventan).

## Tabla de piezas resultantes por `n` bajo cada alternativa

Usando exactamente la cardinalidad YA cerrada de D-δ.45
(`nTeesEstimadas = max(0,n-1)`, `nSingularidadTerminal = n≥1 ? 1 : 0`,
`nLlaveDePaso = n≥1 ? 1 : 0`), aplicada como BOM físico:

| n | Tee (K=3.00) | Codo 90° (K=1.35) | Llave de paso (K=9.18) |
|---|---|---|---|
| 0 | 0 | 0 | 0 |
| 1 | 0 | 1 | 1 |
| 2 | 1 | 1 | 1 |
| 3 | 2 | 1 | 1 |
| 4 | 3 | 1 | 1 |

Esta es la tabla de la **Alternativa A** (§12): reusar la composición
completa de HYD-EST como BOM físico default. El codo y la llave de paso
NUNCA escalan con `n` (son constantes 0/1 según haya o no terminales) —
esto es una consecuencia directa de la fórmula ya cerrada en D-δ.45, no
una elección de este slice.

Para un Baño/Cocina/Lavadero/Toilette/Jardín típicos del proyecto de
ejemplo (`proyectoDeEjemplo.ts`, ver `catalogoArtefactos`), la cardinalidad
resultante depende únicamente de `n` (cantidad de terminales físicos de
ese Local en esa red), no del tipo de Local: un Baño con 4 artefactos en
AF (n=4) da la fila `n=4`; un Jardín con 1 artefacto (n=1) da la fila
`n=1`, etc. No hay una tabla distinta "por tipo de Local" — la única
variable es `n`.

## `Alternativa C` del pedido (Tee por topología real, defaults sólo para
lo no deducible) evita el doble conteo con cero cambios adicionales

Como `resolverTees()` ya corre siempre y de forma independiente, y en
`'simplificada'` (Modo Rápido) no hay nodos de bifurcación reales que
computar, la fila "Tee" de la tabla anterior quedaría en 0 para TODO n en
esa granularidad bajo la Alternativa C — la Tee estimada NUNCA se agrega
como pieza de compra, sólo el codo90 y la llave de paso (que no tienen
representación topológica en ningún escenario). En `'profesional'`, si el
usuario relevó Tees reales, esas ya aparecen hoy; la Alternativa C no
agrega ninguna Tee adicional encima.

## Modo Rápido / Profesional (brief §35)

Sin cambios de comportamiento en esta fase. El preset de Modo Rápido ya
es `simplificada + estimado`; Profesional permite cambiar a `detallado` o
`profesional` desde los controles avanzados existentes
(`ResultadoHidraulicoDeTramo.tsx`, sección "Configuración avanzada").
Cualquier default físico que se agregue en `'estimado'` se activa/desactiva
automáticamente con el mismo selector global que el usuario ya usa hoy
para pérdida localizada — no hace falta un control nuevo.

## Reducciones (CRIT-A30) y Montantes/Alimentación general/ACS

Sin cambios propuestos: ningún default físico se agrega para reducciones,
Montantes ni Alimentación general/ACS en esta fase (brief §16/§18/§19) —
no hay convención robusta ni base topológica, y agregar una violaría el
principio de "nunca inventar piezas sin evidencia" que ya rige todo el
dominio (CRIT-A30, D-δ.33, D-δ.45).

## Conexiones terminales (brief §15)

`llave escuadra`, `flexible`, `unión terminal` no existen hoy en
`IdAccesorioDeTramo` ni en Tabla N°7. Quedan identificadas como posible
extensión futura, no se agregan en este slice.

## PDF actual — texto a corregir después de la decisión (no en Fase A)

`generarDocumentoPdfMateriales.ts`, sección de accesorios: hoy dice
"Accesorios explícitamente modelados" y en la Metodología del informe
principal (`generarDocumentoPdf.ts`) hay una nota "las pérdidas
localizadas estimadas (HYD-EST) no se convierten en piezas de compra".
Ambas requieren actualización una vez cerrada la decisión (brief §24) —
no se tocan en Fase A.
