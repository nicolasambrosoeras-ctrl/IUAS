# CRITERIOS.md — Paquete eras-2023

Registro de interpretaciones normativas.

## CRIT-A1 — Índice del radical en la fórmula de Kc

**Artículo:** ERAS-2023 §2.9.2.2

**Criterio adoptado:** Raíz cuadrada.

## CRIT-A7 — Desagregación fría/caliente para artefactos de agua exclusivamente fría

**Artículo:** ERAS-2023 §2.9.1.2

**Criterio adoptado:** La totalidad del caudal total corresponde a agua fría.

## CRIT-A8 — Regla de simultaneidad para inodoros con válvula automática

**Artículo:** ERAS-2023, §2.10.2

**Criterio:** En recintos sanitarios de viviendas donde la limpieza de los inodoros se efectúe mediante válvula automática, se considera únicamente el caudal del inodoro con válvula automática. En baños públicos, se consideran todos los artefactos del recinto.

## CRIT-A9 — Correspondencia de nombres entre §2.9.1.2/§2.9.1.3 y §2.9.1.4

**Artículo:** ERAS-2023 §2.9.1.4

**Estado:** En revisión.

## CRIT-A2 — Tope de K (K = Kc × a)

**Artículo:** ERAS-2023 §2.9.2.2

**Criterio:** K = Kc × a se aplica literalmente, sin tope superior. Si resulta
K > 1, el valor se conserva sin modificación, y Qc puede resultar mayor que
Qmax.

**Estado:** Firme. Su provisionalidad original estaba vinculada a la
estrategia de agregación entre unidades funcionales, ya resuelta en
CRIT-A5 (D14). La advertencia por K > 1 ya está implementada en el motor.

**Fundamento ampliado (P2b):** ERAS imprime `K = Kc · a` sin tope
explícito. En los Capítulos 2 a 4 revisados no se encontró ninguna
disposición que limite `K ≤ 1`, y ningún ejemplo normativo ejercita
`a ≠ 1`. Existe evidencia histórica de que métodos de la misma familia
técnica acotan el coeficiente resultante a 1. Como evidencia
interpretativa adicional, P2b identificó una inconsistencia entre la
expresión de simultaneidad de agua (§2.9.2.2, `Kc = 1/√(n−1)`) y la
expresión de simultaneidad de desagües (§3.6.1, con `(n−2)`) — sin
trasladar la regla de desagües al cálculo de agua ni crear un criterio
nuevo por este hallazgo; se registra únicamente como indicio de que
ERAS no es internamente uniforme en la formulación de sus modelos de
simultaneidad. Ninguno de estos elementos alcanza para invertir la
decisión: no hay disposición de ERAS que imponga el tope, y la ausencia
de ejemplos con `a ≠ 1` no equivale a una prohibición.

**Advertencia de cobertura:** la revisión de "no existe `K ≤ 1`" cubrió
los Capítulos 2 a 4 de la Guía, no su totalidad (Capítulos 5 a 8 no
fueron revisados). No debe leerse como "no existe en ningún capítulo de
ERAS".

**Alcance futuro no resuelto:** P2/P2b detectaron que `K > 1` puede ser
estructural, no excepcional, en tramos pequeños con `a = 2/3/4`. El
ámbito operativo de este criterio para el futuro cálculo por tramo del
Módulo 2 **no queda resuelto por este criterio ni por este incremento**.
Su eventual reutilización, limitación o sustitución en ese contexto se
decidirá junto con D-β.2 (`a` efectivo por conjunto, ver
`PENDIENTES-DE-ARQUITECTURA.md`) y CRIT-A11, no antes.

## CRIT-A3 — n cuenta unidades de artefactos, no tipos

**Artículo:** ERAS-2023 §2.9.2.2

**Criterio:** En la fórmula de Kc, n cuenta unidades individuales de
artefactos participantes (suma de cantidades), no la cantidad de tipos de
artefacto distintos presentes en el conjunto.

**Estado:** Firme.

## CRIT-A4 — El modelo de simultaneidad no aplica para n = 1

**Artículo:** ERAS-2023 §2.9.2.2 y §2.9.2.3

**Criterio:** El modelo de simultaneidad (Kc) no aplica cuando el conjunto de
artefactos participantes tiene n = 1. En ese caso, Qc = Qmax = qu del único
artefacto participante; no se aplica el coeficiente de mayoración a, y no
corresponde presentar un valor de K calculado por la fórmula. La excepción se
documenta con referencia a §2.9.2.3 porque es la ecuación que permite obtener
Qc cuando el modelo de simultaneidad no aplica.

**Estado:** Firme.

## CRIT-A5 — Agregación de Qc del proyecto entre unidades funcionales (D14)

**Artículo:** ERAS-2023 §2.9.2.1, §2.9.2.2 y §2.9.2.3

**Criterio:** El Qc de proyecto se calcula una sola vez sobre el conjunto
global de artefactos computables, no como suma de Qc parciales por unidad
funcional. Procedimiento:

1. Aplicar CRIT-A8 primero, dentro de cada recinto/local.
2. Reunir todos los artefactos computables resultantes de todas las
   unidades funcionales y áreas comunes del proyecto en un único conjunto
   global.
3. `n` = cantidad total de unidades de artefacto computables de ese
   conjunto global.
4. `Qmax` = Σ(cantidad × quTotal) sobre el conjunto global.
5. `Kc` = 1/√(n−1), calculado una sola vez sobre el total del proyecto.
6. `a` se aplica una sola vez, según la tipología del proyecto.
7. `K` = Kc × a, único de proyecto.
8. `Qc` = Qmax × K, único de proyecto.

No se suman Qc parciales de distintas unidades funcionales bajo ninguna
circunstancia; la primitiva de simultaneidad se aplica una sola vez por
elemento a dimensionar.

**Alcance:** este criterio aplica únicamente al Qc de proyecto. No
resuelve QCunit, Qcaux ni caudales de tramo.

**Limitación declarada:** no existe ningún ejemplo normativo en la Guía
con N°Viviendas > 1. Este criterio es una decisión de ingeniería
adoptada ante esa ausencia, no una interpretación de un ejemplo
existente.

**Estado:** Firme.

## CRIT-A10 — Corrección de la sección de escurrimiento `Ae` (§2.12.1)

**Artículo:** ERAS-2023 §2.12.1

**Texto impreso:** la Guía imprime

```
Ae = (Qc/1000) / (Ve/100)
```

declarando explícitamente Qc en l/s, Ve en m/s y Ae en cm². Esa expresión
es algebraicamente equivalente a `Ae = 0,1 · Qc / Ve`.

**Inconsistencia detectada:** para las unidades que la propia Guía
declara, la relación dimensional correcta derivada de `Q = A · V` es
`Ae = 10 · Qc / Ve`. La expresión impresa produce, por lo tanto, una
sección 100 veces menor que la correcta (la discrepancia equivalente en
diámetro es de factor 10, porque `A ∝ D²`).

**Interpretación adoptada:** el proyecto no transcribe la fórmula
impresa en §2.12.1 tal cual. Se adopta la relación dimensionalmente
correcta para las unidades declaradas por la propia Guía. La norma
imprime `Ae = 0,1 · Qc / Ve`; el proyecto aplica `Ae = 10 · Qc / Ve` por
inconsistencia dimensional demostrada y evidencia interna de la misma
Guía.

**Fundamento:** verificación dimensional propia a partir de `Q = A · V`
con las unidades declaradas en el propio §2.12.1 (Qc en l/s, Ve en m/s,
Ae en cm²). No se encontró fe de erratas ni versión oficial corregida
que reconozca el error.

**Evidencia interna de Tabla N°9:** la Tabla N°9 de la propia Guía
aplica correctamente `V = Q/A`. Se verificaron 20 celdas y la relación
`Ae = 10 · Q/V` recupera el área geométrica de la tabla dentro del
margen de redondeo, lo que constituye evidencia interna convergente a
favor de la fórmula corregida y en contra de la fórmula impresa en
§2.12.1.

**Fórmula operativa:**

```
Ae_cm² = 10 · Qc_lps / Ve_mps
```

**Unidades:** `Ae` en cm², `Qc` en l/s, `Ve` en m/s.

**Terminología:** el nombre normativo correcto es "sección de
escurrimiento". No usar "área de expansión" ni "sección equivalente".

**Trazabilidad obligatoria:** toda futura memoria de cálculo que use
esta fórmula debe declarar explícitamente la divergencia frente a la
expresión impresa en §2.12.1: que la Guía imprime `Ae = 0,1 · Qc / Ve` y
que el proyecto aplica `Ae = 10 · Qc / Ve` por la razón documentada en
este criterio.

**Estado:** Firme.

## CRIT-A11 — Caudal de cálculo (Qc) de tramo sobre el conjunto de consumos aguas abajo

**Artículo:** ERAS-2023 §2.9.2.1, §2.9.2.2, §2.9.2.3, §2.10.2 y §2.12.1.

**Evidencia textual ERAS:** la Guía exige analizar el caudal de cada
tramo; §2.12.1 habla de "los caudales Qc" en plural; §2.9.2.3 define Qc
como el caudal usado para el dimensionamiento de cañerías. Una lectura
de un único Qc global repartido sin más a todos los tramos no es
sostenible frente a estos textos.

**Inferencia fuerte adoptada por el proyecto:** cada tramo se calcula
reaplicando el modelo de simultaneidad de §2.9.2 sobre el conjunto de
consumos aguas abajo de ese tramo. Esta reaplicación no está escrita
literalmente como procedimiento paso a paso en la Guía; es la lectura
que concilia el plural "los caudales Qc" con el modelo único de
simultaneidad ya usado para el Qc global.

**Criterio adoptado:** el Qc de un tramo se obtiene aplicando el modelo
`Qmax → Kc → K → Qc` de §2.9.2 al conjunto de artefactos computables
aguas abajo de ese tramo, de la misma forma en que CRIT-A5 lo aplica al
conjunto global del proyecto.

**Caso particular — colector/montante general:** cuando el tramo
analizado es el colector general, la cañería de abastecimiento a sala de
medidores, o un tramo general equivalente que sirve la totalidad del
proyecto, su conjunto aguas abajo coincide con el conjunto global usado
en CRIT-A5 para obtener el Qc GLOBAL del proyecto. No se trata de sumar
Qc calculados separadamente por unidad funcional, sino de aplicar una
sola vez el mismo conjunto agregado. Este caso no requiere un criterio
propio: es consecuencia directa de este criterio y de CRIT-A5.

**Alcance — qué NO resuelve este criterio:**

- **No determina qué valor de `a` corresponde a cada conjunto/tramo.**
  Esa pregunta permanece abierta como D-β.2 en
  `PENDIENTES-DE-ARQUITECTURA.md`; este criterio fija únicamente la
  estructura del cálculo (conjunto aguas abajo + reaplicación del
  modelo), no el valor efectivo de `a` que se le inyecta.
- No resuelve `Qcaux` (sigue provisional).
- No resuelve la contradicción `Qunit`/`Qcunit` (§2.6 vs. Fig. 2.8 e),
  que queda diferida al futuro módulo de Medidores.
- No decide si `K > 1` se limita en tramos pequeños; esa pregunta
  permanece abierta y ligada a CRIT-A2 y a D-β.2.

**Estado:** Firme, con el alcance explícitamente limitado arriba.

## CRIT-A12 — Clasificación base del coeficiente de mayoración `a` pertenece al Proyecto (cierre de D-β.1)

**Artículo:** ERAS-2023 §2.9.2.2 y §2.10.1.

**Evidencia textual ERAS:** la Guía asocia el valor de `a` a la
"Tipología del Proyecto" y a las "características del proyecto"; §2.10.1
usa la expresión "Fijamos" el coeficiente, en referencia a una
clasificación previa del proyecto en su conjunto, no a una derivación
local por subconjunto de artefactos.

**Criterio adoptado:** la clasificación base de `a` —es decir, a qué
tipología corresponde el proyecto y qué valor de `a` le corresponde por
esa tipología— pertenece conceptualmente al Proyecto, no al tramo ni a
un subconjunto de consumos. Esto cierra la pregunta D-β.1 registrada en
`PENDIENTES-DE-ARQUITECTURA.md`.

**Alcance — qué NO resuelve este criterio:**

- No determina automáticamente que ese mismo valor de `a` de proyecto
  sea el `a` efectivo que corresponde aplicar en cada subconjunto o
  tramo cuando se reaplica el modelo de §2.9.2 (CRIT-A11). Esa pregunta
  es D-β.2, que permanece abierta en `PENDIENTES-DE-ARQUITECTURA.md`,
  con dos lecturas actualmente defendibles (global y por conjunto) sin
  que ninguna se adopte todavía como regla operativa.
- No resuelve D-γ (proyectos de tipología mixta).

**Estado:** Firme, limitado a la ubicación conceptual de la
clasificación base; no se extiende a la cuestión del `a` efectivo.

## CRIT-A13 — Alcance de las reglas de participación en cálculo por tramo (cierre de D-δ.16; revisión: extensión a condición hidráulica)

**Artículo:** ERAS-2023 §2.10.2 (CRIT-A8) y §2.9.2.1/§2.9.2.2/§2.9.2.3
(CRIT-A11).

**Criterio adoptado:**

```text
conjunto computable aguas abajo del Tramo
→ para la condición hidráulica evaluada (total / aguaFria / aguaCaliente),
  retener únicamente los artefactos con qu_lps > 0 en esa condición
  (conjunto hidráulicamente activo)
→ separar por Local
→ aplicar CRIT-A8 dentro de cada subconjunto de ese Local
→ reunir participantes
```

Un artefacto con `qu_lps = 0` en la condición evaluada (valor explícito de
catálogo, no ausencia de dato) no integra el conjunto sobre el que CRIT-A8
decide participación en esa condición. Un `qu` requerido `= null` sigue
siendo un dato no resuelto y produce error, sin relación con esta regla de
participación (ver CRIT-A7 para el único grupo de artefactos ya resuelto,
y D-δ.5 en `PENDIENTES-DE-ARQUITECTURA.md` para los `null` restantes,
fuera de este alcance).

No se utiliza el inventario físico completo de un Local cuando parte de
sus artefactos no está aguas abajo del Tramo. Si el conjunto aguas abajo
contiene artefactos de distintos Locales, CRIT-A8 se evalúa
independientemente dentro de cada uno.

**Fundamento:** CRIT-A11 ya fija el universo del cálculo de tramo como
"el conjunto de artefactos computables aguas abajo de ese tramo";
introducir artefactos fuera de ese universo solo para activar CRIT-A8
sería inconsistente con CRIT-A11. Consultar el Local completo puede
producir demanda cero en una cañería que sí alimenta consumos reales.
Cuando el conjunto evaluado coincide con el Local completo, este criterio
se reduce al comportamiento actual de CRIT-A8 en el Qc global de Módulo 1
(CRIT-A5).

**Revisión — extensión a condición hidráulica:** el fundamento anterior se
adoptó antes de que existiera el modelo de condición hidráulica por Tramo
(total/aguaFria/aguaCaliente). El mismo principio —no introducir en
CRIT-A8 artefactos ajenos al universo hidráulicamente relevante, porque
puede producir demanda cero en una cañería que sí alimenta consumos
reales— se extiende ahora también al eje de condición: un artefacto cuyo
`qu_lps` es explícitamente `0` para la condición evaluada (por ejemplo, un
inodoro con válvula automática, cuya demanda de agua caliente es
normativamente cero desde CRIT-A7) no pertenece al universo
hidráulicamente relevante de esa condición, y su presencia en el Local no
debe suprimir la demanda real de otros artefactos mixtos del mismo Local
en esa misma condición.

**Caso representativo:** Local domiciliario con `inodoroValvula`
(`quTotal=1.50`, `quFria=1.50`, `quCaliente=0`, resuelto por CRIT-A7) y
`lavatorio` (`quTotal=0.20`, `quFria=0.08`, `quCaliente=0.12`).

- `total`: ambos artefactos activos (`quTotal>0`) → CRIT-A8 → solo
  `inodoroValvula` participa. Sin cambio respecto del comportamiento
  anterior.
- `aguaFria`: ambos activos (`quFria>0`) → CRIT-A8 → solo `inodoroValvula`
  participa. Sin cambio práctico.
- `aguaCaliente`: `inodoroValvula` (`quCaliente=0`) queda fuera del
  conjunto hidráulicamente activo antes de aplicar CRIT-A8; `lavatorio`
  (`quCaliente=0.12`) es el único artefacto activo del Local → CRIT-A8 se
  aplica sobre ese conjunto (sin válvula presente) → participan todos los
  activos → la demanda de agua caliente del Local (0,12 l/s) se preserva,
  en vez de resultar incorrectamente en cero.

**Relación con CRIT-A11:** esta revisión es compatible con CRIT-A11 sin
excepción: `n`, `Qmax`, `aEfectivo`, `Kc`, `K` y `Qc` siguen
recalculándose íntegramente sobre el conjunto hidráulicamente relevante de
cada Tramo/condición. No se fracciona ningún `Qc` total, no se suman `Qc`
parciales ni se reutilizan resultados de otra condición.

**Relación con CRIT-A14:** `aEfectivo` debe calcularse sobre el mismo
conjunto final de participantes hidráulicos que alimenta `n`/`Qmax` de esa
condición. Una `UnidadFuncional` cuyos únicos consumos aguas abajo tengan
`qu_lps=0` en la condición evaluada no cuenta como UF hidráulicamente
atendida para ese cálculo específico.

**Conjunto vacío tras el filtro:** si, para una condición dada, ningún
artefacto del Tramo conserva `qu_lps>0` tras aplicar esta regla (con o sin
intervención adicional de CRIT-A8), el Tramo no tiene demanda hidráulica
en esa condición; `Qc=0` es un estado válido del dominio, no un error.
Este documento no define todavía la representación/API de ese estado.

**Naturaleza:** inferencia/adopción IUAS fuertemente sustentada, no una
disposición textual de ERAS — mismo estatus epistémico que CRIT-A11. La
extensión a condición hidráulica es, en sí misma, adopción interpretativa
IUAS (no texto literal de ERAS), con la misma naturaleza epistémica que el
criterio original.

**Alcance — qué NO resuelve este criterio:**

- No modifica CRIT-A8 para el cálculo global actual de Módulo 1 (ese
  cálculo no distingue condición hidráulica).
- No decide la identidad de "Local simple" ni ningún umbral
  simple/complejo (ver D-δ.17 en `PENDIENTES-DE-ARQUITECTURA.md`).
- No define la implementación concreta de agrupación por Local, ni la del
  filtro de `qu_lps>0` por condición.
- No reabre la semántica de `qu = null` (sigue siendo dato no resuelto;
  ver CRIT-A7 y D-δ.5 en `PENDIENTES-DE-ARQUITECTURA.md` para los
  artefactos no domiciliarios pendientes).
- No define la representación/API del estado "Tramo sin demanda en una
  condición" (`Qc=0` sin participantes).

**Estado:** Firme, con el alcance ampliado explícitamente a la condición
hidráulica por Tramo (total/aguaFria/aguaCaliente); el resto del alcance
permanece limitado como arriba.

## CRIT-A14 — Determinación del coeficiente `a` efectivo por tramo (cierre de D-β.2)

**Artículo:** ERAS-2023 §2.9.2.2 (tabla de coeficientes de mayoración).

**Criterio adoptado:**

```text
si tipología del Proyecto = vivienda multifamiliar:
    >1 UF residencial distinta aguas abajo → a efectivo = 2
     1 UF residencial aguas abajo          → a efectivo = 1

en cualquier otra tipología:
    a efectivo = a base del Proyecto (CRIT-A12)
```

La identidad relevante es la cantidad de `unidadFuncionalId` residenciales
distintas presentes en el conjunto efectivamente evaluado aguas abajo del
Tramo. No depende de cantidad de Artefactos, cantidad de Locales, ni de
diámetro/longitud/tamaño geométrico. `n=1` permanece regido por CRIT-A4
(`Qc = Qmax`, sin `Kc`/`a`/`K`), sin intervención de este criterio.

**Fundamento:** ERAS reconoce expresamente `vivienda individual → a=1` y
`vivienda multifamiliar → a=2` como categorías publicadas, y exige
analizar el Qc de los distintos tramos de la instalación (CRIT-A11), pero
no especifica literalmente qué `a` corresponde a un tramo cuyo conjunto
aguas abajo pertenece exclusivamente a una única vivienda dentro de un
Proyecto multifamiliar. Ante esa ambigüedad, se adopta la transición
`>1 UF → a=2` / `1 UF → a=1` por ser semánticamente consistente con las
dos categorías residenciales publicadas, hidráulicamente coherente,
determinística y auditable.

**Naturaleza:** adopción interpretativa IUAS frente a una ambigüedad no
resuelta expresamente por ERAS — no es texto literal de la Guía.

**No generaliza por valor numérico:** la excepción corresponde
semánticamente a `tipoDeProyecto = viviendaMultifamiliar`, no a
`aBase === 2`. `Oficinas públicas` y `centros educativos` comparten
numéricamente `a=2` pero no reciben esta excepción; no se identificó
pareja normativa interna equivalente para `a=3`/`a=4`.

**Alcance — qué NO resuelve este criterio:**

- No resuelve D-γ (proyectos de tipología mixta).
- No implementa por sí solo la regla: es la interpretación normativa
  adoptada, no el código que la aplica por tramo. El modelo ya tiene la
  semántica necesaria (`Proyecto.parametros.tipoDeProyecto`, `aBase`
  derivado vía `obtenerCoeficienteABase`; ver
  `PENDIENTES-DE-ARQUITECTURA.md`, sección D-β.2) — la insuficiencia
  semántica que antes bloqueaba esta implementación quedó resuelta.
  Falta todavía implementar la función que aplique esta regla por tramo
  (`aEfectivo` o equivalente).
- No define `K>1`/cap de `K` en tramos pequeños (sigue ligado a CRIT-A2).

**Estado:** Firme, con el alcance explícitamente limitado arriba.

## CRIT-A15 — Caudal efectivo bajo conectividad física exclusiva

**Artículo:** ERAS-2023 §2.9.1.2 (columnas `qu Total`, `qu (A. Fría)`, `qu
(A. Cal.)`) y §2.9.2.1/§2.9.2.2/§2.9.2.3 (modelo de simultaneidad
reaplicado por CRIT-A11).

**Criterio adoptado:** la `redHidraulica` de un Proyecto es la
representación física autoritativa de las conexiones existentes en ese
Proyecto: la ausencia de un nodo terminal AC (o AF) para un Artefacto no
significa "esa conexión todavía no fue modelada", sino "esa conexión
física no existe en la red evaluada". En consecuencia, el `qu` efectivo
de una rama surge de combinar el catálogo normativo con la
conectividad física declarada:

```text
Artefacto conectado físicamente a AF + AC:
  rama AF                            → quFria_lps
  rama AC                            → quCaliente_lps
  tramo común aguas arriba de ambas  → quTotal_lps

Artefacto conectado físicamente solo a AF:
  rama AF                            → quTotal_lps

Artefacto conectado físicamente solo a AC:
  rama AC                            → quTotal_lps
```

**Fundamento:** cuando ambas alimentaciones físicas existen,
`quFria_lps`/`quCaliente_lps` representan la fracción de mezcla de cada
rama por separado, y su suma reconstruye `quTotal_lps` en el tramo donde
ambas reconvergen (comportamiento ya vigente hoy, sin cambios). Cuando
una sola alimentación física existe, no hay mezcla posible: esa única
cañería es la que efectivamente entrega, en el momento de máximo uso del
artefacto, la totalidad de su caudal de diseño — no la fracción que le
correspondería si existiera una segunda cañería complementaria que, en
este Proyecto, no existe.

**Relación con CRIT-A7:** CRIT-A7 resuelve una propiedad normativa/
general del tipo de artefacto — algunos artefactos son exclusivamente
fríos en cualquier Proyecto, por definición del artefacto mismo
(`quFria_lps = quTotal_lps`, `quCaliente_lps = 0`, ya así en el
catálogo). CRIT-A15 resuelve un caso distinto: un artefacto
normativamente capaz de AF+AC (ambos campos del catálogo mayores a
cero) que, en un Proyecto concreto, está conectado físicamente a una
sola red. CRIT-A7 no se amplía ni se modifica. Para los artefactos que
CRIT-A7 ya resuelve, CRIT-A15 no cambia ningún resultado numérico:
`quFria_lps` (o `quCaliente_lps`, según corresponda) ya coincide con
`quTotal_lps` en el catálogo, así que da igual cuál de los dos criterios
se atribuya el valor seleccionado.

**Relación con CRIT-A13:** CRIT-A13 continúa aplicándose después de
determinar el `qu` efectivo bajo este criterio. El filtro de
participación hidráulica (`qu_lps > 0` en la condición evaluada) y la
agrupación por Local para CRIT-A8 operan sobre el valor de `qu` que
resulte de aplicar CRIT-A15 — nunca sobre `quFria_lps`/`quCaliente_lps`
leídos directamente del catálogo sin considerar la conectividad física
real.

**No modifica el catálogo:** `quTotal_lps`, `quFria_lps` y
`quCaliente_lps` permanecen exactamente como están adoptados en
`catalogo-artefactos`. Este criterio decide cuál de esos tres valores ya
existentes corresponde usar según la conectividad física; no cambia
ninguno de ellos.

**No implica doble conteo:** el artefacto sigue identificándose y
contándose una sola vez según su identidad completa (`unidadFuncionalId`
+ `localId` + `artefactoId`), exactamente como ya garantiza la
deduplicación existente del recorrido topológico (D-δ.8 en
`PENDIENTES-DE-ARQUITECTURA.md`). Este criterio decide únicamente qué
campo del catálogo corresponde a cada rama ya identificada una sola vez,
nunca cuántas veces participa.

**Alcance — qué NO resuelve este criterio:**

- No define cómo determinar, en la implementación, si un Artefacto está
  conectado físicamente a AF, a AC o a ambos; esa determinación queda
  para el incremento funcional que implemente este criterio.
- No revisa todavía las expectativas de los golden existentes
  (`resolverHidraulicaDeTramo.golden.test.ts`, Golden 1/2/3), escritos
  antes de esta decisión bajo una lectura distinta de redes mínimas sin
  producción ACS. Pendiente registrada en `PENDIENTES-DE-ARQUITECTURA.md`,
  sección D-δ.19.
- No decide cómo se representaría, de forma robusta, la conectividad
  física exclusiva en el modelo (`RedHidraulica`/`Nodo`), ni si hace
  falta algún dato nuevo para distinguirla de una red todavía incompleta
  en edición; ver D-δ.19.
- No resuelve la identidad de "Local simple" (D-δ.17) ni la
  presentación de Módulo 2 (D-δ.20, D-δ.21).

**Naturaleza:** inferencia/adopción IUAS fuertemente sustentada por el
principio físico de conservación de masa (mismo estatus epistémico que
CRIT-A11/CRIT-A13), no una disposición textual de ERAS.

**Estado:** Firme e implementado en
`src/motor/tuberias/caudal/determinarConectividadFisica.ts` y
`determinarCondicionHidraulicaDeCaudal.ts`, con tests unitarios propios y
consumido productivamente por todo el pipeline de Módulo 2. Pendiente
únicamente la revisión de los goldens Golden 1/2/3 (D-δ.19 en
`PENDIENTES-DE-ARQUITECTURA.md`), escritos antes de esta decisión — eso
no bloquea el resto de la implementación, ya productiva.

## CRIT-A16 — Velocidad de escurrimiento adoptada para el predimensionamiento inicial

**Artículo:** ERAS-2023 §2.12.1 (rangos de velocidad admisible por rango de
diámetro).

**Criterio adoptado:** para el predimensionamiento hidráulico inicial de
cañerías, el proyecto adopta `Ve = 2,0 m/s` para todos los tramos,
independientemente del rango de diámetro. Este valor se utiliza junto con
la fórmula de sección de escurrimiento de CRIT-A10
(`Ae_cm² = 10 · Qc_lps / Ve_mps`) para obtener, a partir del `Qc` de cada
tramo, una `Ae` mínima y un `Di` mínimo iniciales.

**Naturaleza del valor — decisión de proyecto, no dato normativo:**
`Ve = 2,0 m/s` **no** es un valor que ERAS-2023 imponga como tal para el
predimensionamiento; es una decisión de ingeniería adoptada por el
proyecto, elegida por ser conservadora dentro de los rangos admisibles que
la propia Guía publica en §2.12.1 (`0,013–0,060 m` → `1–3 m/s`;
`0,075–0,200 m` → `1,5–2 m/s`). Usar un único valor fijo para todos los
tramos en esta etapa simplifica el predimensionamiento inicial sin
necesitar todavía un diámetro comercial/real sobre el cual iterar.

**No reemplaza los rangos admisibles de §2.12.1:** este criterio no deroga
ni sustituye los rangos de velocidad admisible que la Guía fija por rango
de diámetro en §2.12.1. Esos rangos permanecen como el criterio normativo
de verificación; `Ve = 2,0 m/s` es únicamente el valor de entrada elegido
para la etapa de predimensionamiento, antes de que exista un diámetro
comercial/adoptado real.

**Secuencia prevista — verificación posterior obligatoria:** una vez que
el `Di` mínimo obtenido con este criterio se redondee a un diámetro
interior comercial o adoptado, el proyecto deberá recalcular la velocidad
real de escurrimiento con ese diámetro efectivo (`Ve_real = Q / A_real`) y
verificar ese valor contra los rangos admisibles de §2.12.1 según el rango
de diámetro correspondiente. Ese recálculo y esa verificación no están
resueltos por este criterio ni por este incremento.

**Relación con CRIT-A10:** este criterio no modifica ni reinterpreta la
fórmula de sección de escurrimiento de CRIT-A10; únicamente fija el valor
de `Ve` que se inyecta en ella durante la etapa de predimensionamiento.

**El diámetro resultante es una referencia de predimensionamiento, no una
cota mínima de selección comercial (Correctivo 2A, CRIT-A23):** el `Di`
que produce este criterio (`diReferenciaPredimensionamiento_mm` en las
APIs productivas) es un punto de partida orientativo, útil antes de
conocer ningún diámetro comercial real. **No funciona como filtro de
admisión** para la selección comercial productiva: un candidato
comercial con `Di efectivo` menor a esa referencia puede seguir siendo
válido si su velocidad real cumple los rangos de §2.12.1 (CRIT-A19). La
selección comercial productiva se resuelve mediante CRIT-A23, no
comparando directamente contra este `Di` de referencia.

**Alcance — qué NO resuelve este criterio:**

- No fija el diámetro comercial ni el material de la cañería.
- No calcula la velocidad real de escurrimiento ni la verifica contra
  §2.12.1; eso lo resuelve CRIT-A23, no este criterio.
- No define si, en el futuro, distintos tramos o materiales podrían
  ameritar un `Ve` de predimensionamiento distinto de 2,0 m/s; con la
  información actual del proyecto no hay elementos para justificar esa
  distinción, y no se adopta aquí.

**Estado:** Firme para la etapa de predimensionamiento. Implementado en
`calcularPredimensionamientoDeTramo`
(`motor/tuberias/predimensionamiento/`).

## CRIT-A17 — Pérdida de carga distribuida por Hazen-Williams

**Artículo:** ERAS-2023 §2.12.1, que admite/emplea la fórmula de
Hazen-Williams (junto con otras fórmulas admitidas) para determinar
pérdidas de carga en cañerías, con un coeficiente `C` según los
materiales adoptados.

**Criterio adoptado:** el proyecto adopta como forma operativa la
expresión SI estándar de Hazen-Williams, ampliamente utilizada en la
práctica técnica internacional y consistente con la estructura de la
fórmula que reproduce ERAS-2023 §2.12.1:

```
J = 10,67 · Q_m3s^1,852 / (C^1,852 · D_m^4,87)
```

con `Q` en m³/s, `D` en m, `C` adimensional y `J` en m/m (pérdida de
carga unitaria, es decir, pérdida de carga por metro de cañería).

**Pérdida de carga total:**

```
hf = J · L
```

con `L` en m y `hf` en m (metros de columna de agua).

**Unidades y conversión:** la API interna del proyecto sigue trabajando
normalmente con `Qc` en l/s y `Di` en mm, igual que en el resto de
Módulo 2. Antes de aplicar la fórmula de Hazen-Williams, se convierten
explícitamente:

```
Q_m3s = Qc_lps / 1000
D_m   = Di_mm / 1000
```

Esta conversión debe quedar explícita y comentada en la implementación,
sin colapsar en una constante combinada que oculte el origen dimensional
de cada factor.

**Coeficiente C:** `C` es un parámetro explícito de la primitiva de
cálculo, que nunca conoce materiales ni catálogo (separación deliberada).
El catálogo de materiales con sus valores reales de `C` **ya está
implementado** (`src/motor/tuberias/materialTuberia/`, 6 materiales) y se
resuelve productivamente mediante
`resolverParametroDePerdidaDistribuida`, que le entrega el `C`
correspondiente a esta primitiva sin que ella necesite conocer el
catálogo.

**No se abre discusión sobre variantes de redondeo:** existen en la
bibliografía distintas versiones publicadas de la constante numérica
(10,67 / 10,65 / 10,643) y del exponente de `D` (4,87 / 4,8704), producto
de redondeos históricos distintos de la misma fórmula empírica. El
proyecto adopta la forma `10,67` / `1,852` / `4,87` como criterio técnico
operativo, sin profundizar esa comparación en este criterio.

**Alcance — qué NO resuelve este criterio:**

- Aplica exclusivamente a pérdida de carga **distribuida** (por fricción
  a lo largo de la cañería). No resuelve pérdidas **singulares/
  localizadas** (accesorios), que ERAS-2023 §2.12.1 vincula a una fórmula
  distinta (`Js = Ks · V²/(2g)`, con `Ks` según Tabla N°7).
- No fija diámetro comercial ni prescribe qué diámetro debe adoptarse.
  La fórmula utiliza como entrada el diámetro interior hidráulico `D`
  del tramo. En los cálculos reales posteriores deberá emplearse el
  diámetro interior efectivo correspondiente al diámetro comercial/
  sistema adoptado; el `Di` mínimo de CRIT-A10/CRIT-A16 constituye
  únicamente un predimensionamiento previo, no el diámetro a usar
  necesariamente en este cálculo.
- No calcula velocidad real de escurrimiento.
- No calcula ni verifica presión residual.
- No incorpora materiales ni catálogo de coeficientes `C`.

**Estado:** Firme como criterio técnico operativo del proyecto.
Implementado en
`src/motor/tuberias/perdidaCarga/calcularPerdidaCargaHazenWilliams.ts` y
consumido productivamente por `resolverPerdidaDistribuidaDeTramo` (N3),
con tests unitarios y goldens propios, y visible en la UI transitoria de
Módulo 2.

## CRIT-A18 — Darcy-Weisbach para régimen turbulento

**Naturaleza — decisión técnica del proyecto, no prescripción de ERAS:**
a diferencia de CRIT-A17, este criterio **no transcribe ni interpreta
ningún texto de ERAS-2023**. Es una decisión de ingeniería del proyecto,
fundada en mecánica de fluidos general (ecuación de Darcy-Weisbach,
número de Reynolds, correlación de Haaland), independiente de cualquier
fórmula que ERAS-2023 pudiera o no reproducir. La trazabilidad normativa
de CRIT-A17 (Hazen-Williams, con texto de ERAS §2.12.1 citado) y la de
este criterio se mantienen conceptualmente separadas: este criterio no
reclama respaldo textual de la Guía.

**Ecuación adoptada:**

```
hf = f · (L/D) · (V²/(2·g))
```

con `hf` pérdida de carga distribuida [m]; `f` factor de fricción de
Darcy, adimensional; `L` longitud de cañería [m]; `D` diámetro interior
hidráulico [m], suministrado como dato de entrada al cálculo — **no se
identifica necesariamente con el `Di` mínimo de predimensionamiento**
(CRIT-A10/CRIT-A16); en el cálculo real futuro deberá emplearse el
diámetro interior efectivo del sistema/diámetro comercial evaluado; `V`
velocidad media [m/s]; `g = 9,81 m/s²`.

**Velocidad:**

```
Q_m3s = Qc_lps / 1000
D_m   = Di_mm / 1000
A     = π · D_m² / 4
V     = Q_m3s / A
```

La API del proyecto mantiene `Qc` en l/s y diámetro interior en mm; las
conversiones a las unidades de la fórmula (m³/s, m) se hacen explícitas.

**Número de Reynolds:**

```
Re = V · D_m / ν
```

`Re` adimensional; `ν` viscosidad cinemática [m²/s], parámetro explícito.
No se fija todavía una temperatura de diseño del agua ni se crea un
catálogo de propiedades: `ν` se suministra en cada cálculo.

**Alcance exclusivamente turbulento:** el modelo Darcy-Weisbach de esta
plataforma se aplica únicamente cuando `Re ≥ 4000`. No se implementa
régimen laminar (`f = 64/Re`), zona de transición, ni interpolación
entre regímenes. Para `Re < 4000`, la primitiva de factor de fricción
rechaza el cálculo explícitamente como fuera del alcance de este modelo.
Esta restricción responde al alcance de la plataforma para instalaciones
domiciliarias presurizadas — donde el régimen turbulento es la condición
de diseño esperada — y no constituye una afirmación de que la ecuación
de Darcy-Weisbach sea físicamente inaplicable a otros regímenes.

**Factor de fricción — correlación de Haaland:**

```
1/√f = -1,8 · log10[ (ε/(3,7·D))^1,11 + 6,9/Re ]
```

con `ε` rugosidad absoluta y `D` diámetro interior, expresados de forma
dimensionalmente equivalente (relación `ε/D`); `f` factor de fricción de
Darcy resultante. La implementación recibe `rugosidadAbsoluta_mm` y
convierte explícitamente a metros antes de calcular `ε/D`.
**`ε = 0` es un valor válido** y representa el caso hidráulicamente liso.

**Justificación de Haaland:** Colebrook-White es la referencia clásica
implícita para flujo turbulento, pero exige resolución iterativa.
Haaland es una aproximación explícita ampliamente aceptada de
Colebrook-White que, para el alcance y la precisión que requiere esta
plataforma, evita la complejidad de una resolución iterativa
innecesaria: es determinística, reproducible y fácilmente testeable. El
proyecto adopta Haaland como cálculo operativo del factor `f`. No se
afirma que Haaland sea "exacta" — es una aproximación, no la referencia.
No se implementan Colebrook-White ni Swamee-Jain en esta etapa.

**Rugosidad:** `ε` (`rugosidadAbsoluta_mm`) es parámetro explícito. No
se asocian todavía valores a PPR, PEAD, PVC, cobre, acero, hierro ni
ningún material; el catálogo real de rugosidades por material es un
incremento posterior.

**Viscosidad:** `ν` es parámetro explícito **a nivel de esta primitiva
matemática** — eso no cambia. Los tests podrán seguir usando, por
ejemplo, `ν = 1×10⁻⁶ m²/s` como valor controlado de laboratorio. La
política productiva inicial de qué temperatura/`ν` adopta el proyecto
para poblar ese parámetro queda definida en CRIT-A21, resuelta afuera de
esta primitiva y pasada como argumento — la primitiva en sí no importa
ningún valor productivo ni cambia de firma.

**Secuencia conceptual (modular, cada paso una primitiva independiente):**

```
Qc + Di            → V
V + Di + ν         → Re
Re + ε + Di        → f   (Haaland, solo si Re ≥ 4000)
f + L + Di + V     → hf
```

**Alcance — qué NO resuelve este criterio:**

- No implementa régimen laminar ni zona de transición.
- No incorpora materiales reales ni catálogo de `ε` por material.
- No fija temperatura del agua **a nivel de primitiva matemática** (la
  política productiva inicial de temperatura/`ν` vive en CRIT-A21, fuera
  de esta primitiva).
- No decide diámetro comercial.
- No resuelve pérdidas singulares/localizadas ni accesorios.
- No calcula ni verifica presión residual.
- No resuelve rutas hidráulicas completas.
- No realiza la comparación productiva Hazen-Williams vs. Darcy-Weisbach
  (queda para un incremento posterior, una vez ambos modelos existan
  como primitivas).

**Estado:** Firme como criterio técnico operativo del proyecto.
Implementado en
`src/motor/tuberias/perdidaCarga/darcyWeisbach/calcularNumeroReynolds.ts`,
`calcularFactorFriccionDarcy.ts` (Haaland, dominio turbulento) y
`calcularPerdidaCargaDarcyWeisbach.ts`, con tests unitarios propios y
consumido productivamente por `resolverPerdidaDistribuidaDeTramo` (N3) —
esta es una afirmación de estado de implementación del proyecto, no una
atribución normativa nueva a ERAS.

## CRIT-A19 — Verificación de velocidad con diámetro interior comercial

**Artículo:** ERAS-2023 §2.12.1.

**Texto oficial confirmado:**

```
"Ve en cañerías de 0,013 m a 0,060 m = 1 m/s a 3 m/s"
"Ve en cañerías de 0,075 a 0,200 = 1,5 m/s a 2 m/s"
```

y, en el mismo apartado:

```
"Con los caudales Qc, y las velocidades Ve a adoptar, se determina
una sección de escurrimiento Ae"
"Con el valor de Ae se adopta un diámetro interior comercial igual
o mayor a la sección de cálculo."
```

### 1. Rangos normativos adoptados

```
13 mm ≤ D ≤ 60 mm    →  1 m/s ≤ Ve ≤ 3 m/s
75 mm ≤ D ≤ 200 mm   →  1,5 m/s ≤ Ve ≤ 2 m/s
```

Los extremos `13`, `60`, `75` y `200` mm se interpretan como incluidos
en su rango respectivo, conforme a la redacción "de ... a ...".

### 2. Hueco normativo — 60 mm < D < 75 mm

Ninguno de los dos rangos publicados en §2.12.1 cubre el intervalo
`60 mm < D < 75 mm`. El texto disponible no ofrece ninguna tabla o
frase adicional que lo cierre. **No se interpola, no se extrapola y no
se asigna silenciosamente ninguno de los dos rangos publicados a este
intervalo.** La futura implementación deberá representar este caso
explícitamente como fuera del dominio normativo cubierto por esta
regla (`fueraDeDominioNormativo` o semántica equivalente), nunca como
"admisible" ni "no admisible" — ambas calificaciones exigirían un rango
de referencia que, para este intervalo, no existe en el texto.

### 3. Diámetro utilizado para la verificación

El propio §2.12.1 determina primero `Ae` a partir de `Qc` y `Ve`, y
luego indica adoptar un **"diámetro interior comercial igual o mayor"**
a esa sección de cálculo. La verificación de velocidad, por lo tanto,
debe realizarse con el diámetro interior efectivo/comercial
efectivamente empleado, no con ninguna otra magnitud:

- **no** con `DN`;
- **no** con diámetro exterior;
- **no** con la denominación comercial nominal;
- **no** con el `Di` mínimo de predimensionamiento una vez seleccionado
  el producto real (CRIT-A10/CRIT-A16 quedan superados por el diámetro
  comercial adoptado en esta etapa).

La verificación final utiliza: `Qc` del tramo + `diametroInteriorEfectivo_mm`
del candidato comercial seleccionado.

### 4. Relación con CRIT-A16 — Ve=2,0 m/s no es la velocidad a verificar

CRIT-A16 adopta `Ve=2,0 m/s` únicamente como criterio de
predimensionamiento inicial, para obtener `Ae` mínima y `Di` de
referencia. No debe confundirse esa velocidad de diseño inicial con la
velocidad real resultante del diámetro comercial finalmente
seleccionado, que es la que efectivamente debe verificarse contra los
rangos de este criterio.

**Nota histórica (superada por CRIT-A23, Correctivo 2A):** la secuencia
originalmente documentada aquí era

```
Qc
→ Di mínimo con Ve=2,0 m/s              (CRIT-A10/CRIT-A16)
→ diámetro interior comercial ≥ Di mínimo
→ recalcular Ve real con el diámetro comercial
→ verificar Ve real contra §2.12.1      (este criterio)
```

Esa secuencia convertía el `Di` de predimensionamiento en una **frontera
dura** de selección comercial — un candidato con `Di efectivo` menor,
aunque su velocidad real fuera admisible, quedaba descartado sin
evaluarse. Esa restricción **nunca estuvo en el texto de ERAS** (que
nunca menciona `2,0 m/s`) y podía sobredimensionar la selección
comercial. **CRIT-A23 la reemplaza**: recorre el catálogo comercial
completo por diámetro creciente y verifica la velocidad real de cada
candidato contra el rango que su propio diámetro determina (este mismo
criterio), sin comparar contra el `Di` de predimensionamiento en ningún
paso.

### 5. Propiedad derivada — Ve_real ≤ 2,0 m/s (histórica, ya no vigente)

**Esta propiedad pertenecía a la estrategia de selección anterior a
CRIT-A23 y ya no es cierta bajo la estrategia vigente.** Se documenta
aquí únicamente por trazabilidad histórica: bajo la estrategia previa
(`diametroInteriorEfectivo ≥ Di mínimo`), `Ve_real` nunca podía superar
`2,0 m/s`, porque `Di mínimo` era por construcción el diámetro en el que
`V=2,0 m/s` para ese `Qc`, y `V` decrece con `D`. Bajo CRIT-A23, el
candidato elegido puede tener una velocidad real de hasta el máximo
normativo de cada rango (`3 m/s` para `13–60 mm`; `2 m/s` para
`75–200 mm`) — `3 m/s` es el límite superior admisible, **no** un
objetivo de diseño.

### 6. Consecuencia para la selección de diámetro — implementada en CRIT-A23

Si un candidato comercial produce una velocidad menor al mínimo
normativo admisible, **aumentar el diámetro no puede corregir ese
incumplimiento**: `V` decrece monótonamente con `D` para `Qc` fijo, así
que un diámetro mayor solo empeora la velocidad. Esta consecuencia, antes
documentada como pendiente, **ya está implementada**: CRIT-A23 recorre el
catálogo completo y nunca "sube de diámetro" esperando que eso resuelva
un incumplimiento por defecto de velocidad. Aumentar el diámetro comercial
sí podrá ser una herramienta válida en un incremento posterior para
reducir pérdidas de carga y mejorar la presión residual — un problema
distinto al de velocidad mínima, todavía no resuelto.

### 7. Semántica de resultado — implementada en CRIT-A23

La verificación distingue tres resultados (`ResultadoVerificacionVelocidad`,
ya implementado): admisible; no admisible; fuera del dominio normativo
cubierto por esta regla. CRIT-A23 agrega, a nivel de selección de Tramo
completo (no de esta verificación puntual), un cuarto estado:
`sinCandidatoAdmisible`, cuando ningún candidato del catálogo resulta
admisible tras recorrerlo por completo.

### 8. Fuera del dominio publicado

`D < 13 mm` y `D > 200 mm` también quedan fuera del dominio que cubren
estos rangos. Esto no implica que una cañería de esas dimensiones sea
físicamente inviable — implica únicamente que esta regla específica de
§2.12.1 no aporta, con el texto disponible, un rango de velocidad
aplicable para esos diámetros.

**Alcance — qué NO resuelve este criterio:**

- La selección automática de candidato comercial la resuelve CRIT-A23,
  no este criterio (este criterio define únicamente los rangos y la
  verificación puntual de un diámetro dado).
- No resuelve pérdidas distribuidas ni localizadas.
- No calcula ni verifica presión residual.
- No incorpora materiales ni catálogos reales (eso es CRIT-A23/fabricante).

**Estado:** Firme como interpretación normativa y criterio operativo
del proyecto. Implementado en `verificarVelocidadAdmisible`
(`motor/tuberias/velocidad/`).

## CRIT-A20 — Compatibilidad geométrica entre longitud de Tramo y diferencia de cota

**Naturaleza — decisión técnica del proyecto, no prescripción de ERAS:**
este criterio no transcribe ni interpreta ningún texto de ERAS-2023. Es
una consecuencia geométrica ineludible (la distancia recta entre dos
puntos es la longitud mínima físicamente posible entre ellos), no una
regla normativa. No debe atribuirse a ERAS-2023 bajo ningún concepto.

**Criterio adoptado:** si para un Tramo están disponibles simultáneamente
su `longitud_m` y la cota (`cota_m`) de sus dos Nodos (origen y destino),
debe cumplirse:

```
longitud_m ≥ |cotaDestino_m − cotaOrigen_m|
```

es decir, `longitud_m ≥ |Δz|`, con `Δz = z_destino − z_origen` (signo
conservado, ver `calcularDiferenciaDeCota`). La tolerancia aplicada en la comparación es **exclusivamente
numérica** (ruido de punto flotante, del orden de `1e-9` m) — no
representa tolerancia constructiva, de medición, ni margen de diseño.

**Longitud positiva:** si `longitud_m` está informada, debe ser
estrictamente mayor a cero. `longitud_m = 0` es inválido, con
independencia de `Δz` (con `Δz=0`, la sola regla de compatibilidad
permitiría `longitud_m=0`, pero esta segunda regla lo excluye
igualmente).

**Ausencia de datos:** mientras `cota_m`/`longitud_m` sigan siendo
campos opcionales (ver D-δ.22), la ausencia de cualquiera de los tres
datos relevantes (cota origen, cota destino, longitud) no constituye un
error geométrico — simplemente no hay suficiente información para
verificar. Nunca se asume cota ausente = 0 ni longitud ausente = `|Δz|`;
esta condición se evalúa únicamente cuando los tres datos están
efectivamente presentes.

**Alcance — qué NO resuelve este criterio:**

- No deriva `longitud_m` a partir de `Δz` ni de ninguna otra magnitud
  geométrica (Modelo B, D-δ.22): `longitud_m` es siempre un dato
  explícito.
- No modela pérdidas localizadas ni longitud equivalente de accesorios.
- No resuelve montantes, segmentación ni recorridos completos.
- No calcula pérdida de carga distribuida ni presión residual.

**Estado:** Firme como criterio técnico operativo del proyecto.
Implementado en `esLongitudGeometricamenteValida`
(`motor/tuberias/geometria/`) e integrado en `validarRedHidraulica`.

## CRIT-A21 — Política productiva inicial de propiedades del agua para Darcy-Weisbach

**Naturaleza — decisión técnica del proyecto, no prescripción de ERAS:**
este criterio no transcribe ni interpreta ningún texto de ERAS-2023. Es
un criterio técnico de ingeniería del proyecto sobre las propiedades
físicas del agua (temperatura de referencia y viscosidad cinemática)
consumidas por el modelo Darcy-Weisbach (CRIT-A18). No debe atribuirse a
ERAS-2023 bajo ningún concepto, y es conceptualmente independiente de
`MaterialTuberia` (propiedades del material de la tubería) y de
`SistemaDeTuberia`/`EntradaCatalogoTuberia` (geometría comercial): `ν`
es una propiedad del agua, no de la tubería.

**Relación con CRIT-A18:** CRIT-A18 fija que la primitiva matemática
(`calcularNumeroReynolds`) recibe `ν` como parámetro explícito, sin
conocer de dónde sale ese valor — eso sigue siendo cierto sin cambios.
CRIT-A21 cierra, a nivel de política productiva (fuera de la
primitiva), qué temperatura y qué `ν` adopta el proyecto en esta
primera versión, y cómo se resuelve esa política.

**Agua líquida, temperatura de referencia inicial:** 20 °C.

**Viscosidad cinemática adoptada:** `ν ≈ 1,0034×10⁻⁶ m²/s`.

**Fuente:** NIST Chemistry WebBook — Thermophysical Properties of Fluid
Systems (agua, formulación IAPWS), 1 bar, 20 °C. Publicado
directamente: viscosidad dinámica `μ = 1,0016×10⁻³ Pa·s` y densidad
`55,409 mol/L`. Derivado: `ρ = 55,409 mol/L × 18,015268 g/mol` (masa
molar IAPWS del agua) `= 998,208 kg/m³`, y `ν = μ/ρ = 1,0034×10⁻⁶ m²/s`.
No es un valor publicado por ERAS-2023.

**Resolución preparada por red (AF/AC):** la política se resuelve
mediante `resolverPropiedadesAguaParaRed(red: RedDeTramo)`
(`motor/tuberias/perdidaCarga/darcyWeisbach/propiedadesAguaDarcy.ts`),
no como una única constante global consumida directamente por todo
Darcy. En esta primera versión, `'AF'` y `'AC'` devuelven ambos la
misma temperatura y el mismo `ν` — decisión deliberada, no un
descuido: el motivo de resolver por red desde ahora es dejar preparada
una futura diferenciación (agua fría y agua caliente sanitaria pueden
operar a temperaturas materialmente distintas, con impacto cuantificado
de aproximadamente 6–15 % sobre `hf` entre 10 °C y 60 °C, para casos
representativos del proyecto) sin tener que modificar el orquestador de
pérdidas distribuidas cuando esa diferenciación se adopte.

**No es todavía temperatura editable:** no existe hoy ningún campo en
`ConfiguracionHidraulica` ni en `Proyecto` para configurar temperatura
o `ν` — es una política fija de esta primera versión, deliberadamente
sin ampliar el modelo hasta que exista una necesidad real y un criterio
de diseño cerrado para diferenciar AF de AC.

**Alcance — qué NO resuelve este criterio:**

- No fija temperatura editable por el usuario.
- No diferencia todavía temperatura de AF y AC (ambas comparten hoy el
  mismo valor).
- No modela mezcla de agua, retorno de ACS ni recirculación.
- No calcula pérdida de carga distribuida (`hf`) ni presión residual.
- No modifica Hazen-Williams (CRIT-A17), que permanece independiente de
  temperatura/`ν`.

**Estado:** Firme como criterio técnico operativo del proyecto.
Implementado en `resolverPropiedadesAguaParaRed`
(`motor/tuberias/perdidaCarga/darcyWeisbach/propiedadesAguaDarcy.ts`).

## CRIT-A22 — Piso físico de caudal individual en el Qc de Tramo (Módulo 2)

**Naturaleza — criterio técnico de consistencia física adoptado por IUAS,
no interpretación textual de ERAS:** ERAS-2023 provee la fórmula de
simultaneidad (§2.9.2.2/§2.9.2.3) y la regla de participación para
inodoros con válvula automática (§2.10.2, CRIT-A8), pero no resuelve
explícitamente el caso de una única válvula automática de caudal alto
diluida entre pocos artefactos pequeños de otros Locales. El único
ejemplo oficial disponible con válvula automática (G1, `CASOS-GOLDEN.md`)
combina **dos** válvulas dominando `Qmax`, y no exhibe el problema que
este criterio corrige. No se atribuye a ERAS ninguna fórmula ni regla
explícita equivalente a la adoptada aquí.

**Problema identificado:** con `Kc=1/√(n−1)` sin piso, un Tramo cuyo
conjunto de participantes finales combina un artefacto de caudal alto
(p. ej. `inodoroValvula`, `quTotal_lps=1,5`) con artefactos pequeños de
**otros** Locales de la misma UF (que CRIT-A8/A13 no suprimen, porque la
supresión de CRIT-A8 opera únicamente dentro del Local de la válvula)
puede producir matemáticamente `Qc estadístico < 1,5 l/s` — un caudal de
diseño insuficiente para que la propia válvula opere, ya con solo 3
participantes (`n=3`) en un proyecto no multifamiliar.

**Contraste externo (sustento contextual, no atribución textual):**
literatura institucional (ASCE, *Standardization of Fixture Units for
Modern Flush Valves by Optimizing Water Demand Using Modified Hunter's
Curve*, 2020) y métodos de fixture units (UPC/IPC) confirman que los
artefactos de descarga por válvula automática reciben tratamiento
especial en métodos estadísticos de simultaneidad (peso muy superior al
de artefactos equivalentes de depósito) precisamente por su demanda
instantánea alta frente a poblaciones pequeñas/heterogéneas. Esta
literatura no establece la fórmula `Qc≥max(qu)` adoptada aquí; se cita
únicamente como sustento de que el fenómeno es real y reconocido en el
campo, no como fuente de la regla en sí.

**Criterio adoptado:**

```text
qcEstadistico = Qmax × K            (fórmula CRIT-A1/A2/A4 sin cambios)
quMaxParticipante = max(qu_lps de los aportes participantes finales)
qcFinal = max(qcEstadistico, quMaxParticipante)
```

`quMaxParticipante` se calcula exclusivamente sobre el mismo conjunto de
aportes que ya determina `n`/`Qmax`/`aEfectivo` de ese Tramo — es decir,
después de aplicar CRIT-A15 (conectividad física), el filtro de
`qu_lps>0` por condición hidráulica (CRIT-A13) y CRIT-A8 (participación
por Local). Nunca se usa `qu` del catálogo bruto, de artefactos ya
suprimidos por CRIT-A8, de `qu=0`, ni de la condición hidráulica opuesta
a la evaluada.

**Alcance exclusivo — Módulo 2 / Qc físico de Tramo:** este criterio
aplica únicamente al `Qc` final de diseño de un Tramo hidráulico
concreto (una cañería física real). **No modifica Módulo 1** (`Qc` de
proyecto agregado, `calcularSimultaneidad`/
`calcularCoeficienteDeSimultaneidad`) — ese `Qc` no representa una única
cañería física, así que no comparte el mismo fundamento físico.

**No modifica la fórmula estadística:** `Qmax`, `Kc`, `K` y `Qc
estadístico` siguen calculándose exactamente igual que antes de este
criterio (`calcularSimultaneidadDeTramo`, sin cambios). El piso se aplica
como un paso posterior, nunca alterando la aritmética de CRIT-A1/CRIT-A2.
`K` sigue sin capearse (CRIT-A2 intacto).

**No modifica CRIT-A8/A13/A14/A15:** la participación por Local, el
universo hidráulicamente activo y `aEfectivo` se determinan exactamente
igual que antes; este criterio no introduce ni suprime ningún artefacto
del conjunto ya resuelto por esas reglas.

**Caso de válvula automática:** es el caso motivador y el más relevante
en la práctica (`quTotal_lps=1,5`, el mayor del catálogo), pero el
criterio es general — aplica a cualquier artefacto cuyo `qu` individual
supere al `Qc` estadístico del conjunto en el que participa.

**Trazabilidad:** `Qc` estadístico nunca se descarta — queda expuesto
junto con `quMaxParticipante` y un indicador explícito de si el piso
intervino, para que un consumidor futuro (p. ej. memoria de cálculo)
pueda mostrar ambos valores y cuál se adoptó.

**Alcance — qué NO resuelve este criterio:**

- No modifica Módulo 1 ni ningún `Qc` de proyecto agregado.
- No modifica CRIT-A1/A2/A4/A8/A13/A14/A15.
- No decide selección de diámetro comercial (CRIT-A16/CRIT-A19, sin
  cambios) ni pérdida de carga (CRIT-A17/CRIT-A18/CRIT-A21, sin cambios).
- No resuelve el caso de múltiples artefactos de caudal alto compitiendo
  entre sí (el piso usa el máximo individual, no una combinación).

**Estado:** Firme como criterio técnico operativo del proyecto.
Implementado en `resolverSimultaneidadHidraulicaDeTramo`
(`motor/tuberias/simultaneidad/`).

## CRIT-A23 — Selección de diámetro comercial por velocidad real (Correctivo 2A)

**Naturaleza — criterio técnico de proyecto que resuelve una ambigüedad
operativa de §2.12.1, no interpretación textual adicional:** ERAS-2023
§2.12.1 establece los rangos de velocidad admisible por rango de
diámetro y exige adoptar "un diámetro interior comercial igual o mayor a
la sección de cálculo" (CRIT-A19) — pero no especifica el procedimiento
para elegir la `Ve` con la que calcular esa sección de cálculo *antes*
de conocer el diámetro final, dado que el propio rango de `Ve` admisible
depende de ese diámetro (circularidad). CRIT-A16 (`Ve=2,0 m/s` fijo) es
una simplificación de proyecto para el predimensionamiento, no una
prescripción de ERAS. Este criterio resuelve la ambigüedad sin
inventar ninguna `Ve` intermedia: verifica la velocidad real de cada
candidato comercial contra el rango que su propio diámetro determina.

**Catálogo comercial real:** la política opera sobre el sistema de
tuberías adoptado por el Proyecto (`SistemaDeTuberiaCatalogado`,
`motor/tuberias/sistemaDeTuberia/`) — el fabricante aporta los diámetros
interiores efectivos reales; **no aporta esta política de selección**,
que es enteramente criterio técnico de proyecto.

**Criterio adoptado:**

```text
Qc final del Tramo (post CRIT-A22)
→ obtener las entradas comerciales del sistema, ordenadas por Di efectivo creciente
→ para cada candidato, en orden:
    calcular velocidad real (Qc + Di efectivo)
    verificarVelocidadAdmisible(V, Di)          (CRIT-A19, sin cambios)
    si resulta 'admisible'                       -> seleccionar este candidato, detener
    si resulta 'noAdmisible' o 'fueraDeDominioNormativo' -> descartar, continuar
→ si se recorre todo el catálogo sin ningún candidato admisible
    -> sinCandidatoAdmisible (resultado explícito, no throw, no extrapola)
```

**El hueco normativo 60–75mm** (CRIT-A19) se descarta como cualquier
`fueraDeDominioNormativo`: la búsqueda continúa sin detenerse.

**`Ve=2,0 m/s` (CRIT-A16) no funciona como filtro de admisión.** El `Di`
que produce sigue siendo un dato de predimensionamiento válido y se
propaga como referencia informativa (`diReferenciaPredimensionamiento_mm`),
pero ningún candidato se descarta por tener un `Di efectivo` menor a esa
referencia — solo se descarta por no cumplir su propio rango de
velocidad de CRIT-A19.

**`3 m/s` es un límite normativo superior, no un objetivo de diseño:**
es el techo admisible para diámetros de `13–60mm`; el criterio no busca
acercarse a ese límite, solo encontrar el primer candidato dentro de
cualquier punto del rango aplicable.

**No resuelve todavía presión residual.** Un futuro incremento deberá
combinar esta selección por velocidad con verificación de presión
residual (probar el siguiente candidato comercial si el elegido por
velocidad no alcanza presión) — ese algoritmo no está implementado ni
decidido aquí.

**Alcance — qué NO resuelve este criterio:**

- No modifica los rangos normativos de CRIT-A19 (`13–60mm` → `1–3 m/s`;
  `75–200mm` → `1,5–2 m/s`; hueco/fuera de dominio sin cambios).
- No modifica CRIT-A16 (`Ve=2,0 m/s` sigue existiendo, solo deja de ser
  filtro de admisión).
- No implementa selección manual ni override por Tramo.
- No calcula pérdida de carga distribuida (`hf`) ni presión residual.
- No atribuye esta estrategia de selección a ERAS-2023 — es criterio
  técnico de proyecto ante una ambigüedad operativa no resuelta
  explícitamente por el texto disponible.

**Estado:** Firme como criterio técnico operativo del proyecto.
Implementado en `resolverDiametroComercialDeTramo`
(`motor/tuberias/resolverDiametroComercialDeTramo.ts`).

## CRIT-A24 — Fallback de velocidad mínima ante `Qc` muy bajo (D-δ.27)

**Naturaleza — excepción acotada de CRIT-A23, no una interpretación
normativa nueva ni una relajación general de CRIT-A19:** ERAS-2023
§2.12.1 publica un rango de velocidad (mínimo y máximo) por rango de
diámetro (CRIT-A19), pero no especifica qué debe hacer el proyectista
cuando, para un `Qc` real, incluso el menor diámetro comercial
disponible produce una velocidad inferior al mínimo publicado. Ese
vacío normativo es exactamente el que resuelve este criterio — decisión
IUAS, no texto de ERAS.

**Problema resuelto:** bajo CRIT-A23 (sin este criterio), cuando el
menor diámetro comercial normativamente evaluable de un Tramo ya
incumple `Vmin`, ningún diámetro mayor puede corregirlo (`V` decrece
monótonamente con `D` a `Qc` fijo — CRIT-A19 §6), así que el resultado
era siempre `sinCandidatoAdmisible`. Eso declaraba "sin solución" tramos
físicamente instalables (p. ej. una rama terminal AC de un único
artefacto, sin beneficio de simultaneidad — caso real confirmado:
`t-ac-toilette`, `Qc=0,12 l/s`, ver D-δ.27 en
`PENDIENTES-DE-ARQUITECTURA.md`).

**Criterio adoptado:**

```text
Recorrido normal de CRIT-A23, sin cambios, mientras exista algún
candidato admisible dentro de rango.

Si se agota el catálogo sin ningún candidato admisible:
  si el PRIMER candidato normativamente evaluable (el menor Di que no
  resultó 'fueraDeDominioNormativo') fue descartado específicamente por
  V < Vmin (nunca por V > Vmax):
    -> se adopta ESE candidato igual, como 'conCandidato'
    -> velocidadPorDebajoDelMinimo = true
    -> verificacionVelocidad conserva el resultado real de la
       primitiva (puede ser 'noAdmisible')
  en cualquier otro caso (exceso de Vmax, o ningún candidato en dominio
  normativo):
    -> sigue siendo sinCandidatoAdmisible, sin cambios
```

**`Vmax` permanece condición dura, sin excepción.** Este criterio no
introduce ninguna tolerancia sobre el límite superior de velocidad — un
`Qc` cuyo único candidato disponible resulta demasiado rápido sigue
devolviendo `sinCandidatoAdmisible`, exactamente como antes.

**Por qué exclusivamente el primer candidato normativamente evaluable**:
por la misma propiedad de monotonicidad que ya fundamenta CRIT-A19 §6 —
si ese candidato (el menor Di posible) ya incumple `Vmin`, todo
candidato posterior lo incumple con más margen todavía, sin excepción.
El fallback nunca elige un diámetro distinto del menor disponible; nunca
"el primero que falle por Vmin en algún punto intermedio del catálogo".

**Consecuencia sobre `verificacionVelocidad`:** deja de ser cierto que
`conCandidato` implica `verificacionVelocidad.tipo === 'admisible'`. En
el fallback, `verificacionVelocidad` conserva el resultado real
`'noAdmisible'` de `verificarVelocidadAdmisible` — se propaga como
evidencia auditable de por qué se activó `velocidadPorDebajoDelMinimo`,
no se reinterpreta ni se oculta.

**Consecuencia sobre el dominio turbulento de Darcy (CRIT-A18/A21):** la
propiedad histórica "todo candidato adoptado por CRIT-A23 cumple
`Re>UMBRAL_REYNOLDS_TURBULENTO` porque `V≥Vmin`" deja de sostenerse en
`V≥Vmin` — el fallback admite `V<Vmin`. Verificado con los datos
vigentes: el menor `qu` positivo de `catalogoArtefactos` (`0,08 l/s`)
con el menor `Di` comercial normativamente evaluable del sistema
productivo (`14,4mm`, Acqua System Magnum PN20) da
`Re≈7049,58 > 4000` — la garantía turbulenta sigue firme, pero **pasa a
depender del catálogo normativo vigente**, no de una propiedad
matemática cerrada de `Vmin`. El guard
`Re<UMBRAL_REYNOLDS_TURBULENTO → throw` de `calcularFactorFriccionDarcy`
(CRIT-A18) se conserva intacto como defensa activa ante un futuro
catálogo con un `qu` menor — ya no se documenta como "inalcanzable por
construcción".

**Contrato:** `ResultadoDiametroComercialDeTramo` (`conCandidato`) y
`ResultadoPerdidaDistribuidaDeTramo` (`sinLongitud`,
`conPerdidaDistribuida`) exponen `velocidadPorDebajoDelMinimo: boolean`
— campo aditivo, `false` en la selección normal dentro de rango, `true`
únicamente en el fallback de este criterio.

**Alcance — qué NO resuelve este criterio:**

- No modifica los rangos normativos de CRIT-A19.
- No modifica el recorrido ni la prioridad de CRIT-A23 cuando existe
  algún candidato admisible dentro de rango.
- No relaja `Vmax` bajo ninguna circunstancia.
- No decide selector de sistema comercial, clase de tubería, margen de
  seguridad ni granularidad de `sistemaDeTuberiaId` (D-δ.28 a D-δ.31,
  sin tocar).
- No calcula presión residual.

**Estado:** Firme como criterio técnico operativo del proyecto.
Implementado en `resolverDiametroComercialDeTramo`
(`motor/tuberias/resolverDiametroComercialDeTramo.ts`), propagado por
`resolverPerdidaDistribuidaDeTramo`
(`motor/tuberias/resolverPerdidaDistribuidaDeTramo.ts`).

**Addendum de presentación (UX, no de cálculo):** `velocidadPorDebajoDelMinimo`
se sigue calculando y propagando exactamente como se describe arriba —
`Vmin` sigue gobernando la búsqueda del diámetro mientras exista un
candidato comercial menor evaluable, sin ninguna excepción nueva. Lo
único que cambió es que la tabla principal de Módulo 2
(`ResultadoHidraulicoDeTramo.tsx`) dejó de renderizar la leyenda
"Velocidad inferior al rango recomendado" para este caso: por
construcción (monotonicidad de `V` con `Di`, ver arriba), este flag
únicamente es `true` en el caso terminal ya cubierto por el fallback —
no hay ningún diámetro mayor que el proyectista pudiera elegir para
evitarlo, así que mostrarlo como advertencia accionable era engañoso.
El dato sigue expuesto íntegro (`velocidadPorDebajoDelMinimo`,
`verificacionVelocidad`, velocidad real) para trazabilidad, auditoría y
tests — solo cambió si se renderiza como advertencia visual.

## CRIT-A25 — Pérdida de carga del medidor de agua

**Artículo:** ERAS-2023 §2.12, fórmula (6).

**Texto oficial confirmado:**

```
"Jm = 0,036 * (Qcl/C)^2"
"Qcl=: Gasto máximo probable en L/min"
"C = Capacidad máxima del medidor en m3/hora"
"Jm= Pérdida de carga en m/m"
```

**Ejemplo oficial verificado** (mismo texto de la Guía, "vivienda tipo"):
`Qc=0,71 l/s` (`42,1 l/min`) → medidor de 19mm, `C=7 m³/hora` →
`Jm = 0,036*(42,1/7)² = 1,3 m.c.a.` El propio ejemplo trata `Jm` como
pérdida total del medidor (no como pérdida unitaria a multiplicar por
una longitud), pese a que la fórmula la etiqueta "m/m" — se transcribe
la fórmula tal como la publica ERAS y se sigue el tratamiento del
ejemplo oficial (`Jm` es la pérdida completa del medidor), sin
interpretar la etiqueta "m/m" como una longitud implícita inexistente.

**Salvedad sobre el par DN/C del ejemplo (ver CRIT-A32):** el
emparejamiento "medidor de 19mm, `C=7`" que este ejemplo enuncia es
**inconsistente con la propia Tabla N°6** de la Guía, donde la fila DN19
tiene `C=5` y `C=7` corresponde a DN25. Esta transcripción de la fórmula
(6) permanece **firme**: la salvedad no afecta la fórmula ni el
tratamiento de `Jm`, sólo advierte que `C=7` no es una propiedad
normativa del DN19. La regla de selección `Qc → DN → C` y el tratamiento
de la inconsistencia se formalizan en CRIT-A32; el motor de selección
toma `C` de la fila de Tabla N°6, nunca de este ejemplo.

**Naturaleza — hallazgo normativo no documentado previamente en el
proyecto:** hasta este incremento no existía en el repo ninguna mención
a la pérdida de carga del medidor. Es un término obligatorio del balance
de presión (§2.12.1: "Se deberá determinar la pérdida de carga de los
tramos de cañería hasta el artefacto más desfavorable"), verificado
directamente contra el texto oficial de la Resolución 641/2023.

**Criterio adoptado:** primitiva pura `calcularPerdidaCargaMedidor`
recibe `caudalMaximoProbable_lpm` y `capacidadMaximaMedidor_m3h`
explícitos, devuelve `Jm` en m.c.a. — sin conocer `Tramo`,
`RedHidraulica` ni ningún catálogo de medidores comerciales.

**Alcance — qué NO resuelve este criterio:**

- No decide cómo se representa un medidor (general/individual) dentro de
  `RedHidraulica` — no existe hoy ningún tipo de nodo/referencia para
  medidores (ver D-δ.35, `PENDIENTES-DE-ARQUITECTURA.md`).
- No incorpora la Tabla N°6 (diámetro/capacidad de medidor comercial por
  caudal) — solo la fórmula de pérdida, con los parámetros ya resueltos.
- No calcula presión residual ni forma parte todavía de ningún balance
  de presión productivo.

**Estado:** Firme como transcripción normativa. Implementado en
`calcularPerdidaCargaMedidor`
(`motor/tuberias/perdidaCarga/calcularPerdidaCargaMedidor.ts`).

## CRIT-A26 — Pérdida de carga localizada (singular) por accesorio

**Artículo:** ERAS-2023 §2.12.1, Tabla N°7.

**Texto oficial confirmado:**

```
"Para las pérdidas de carga singulares o localizadas se debe utilizar
Js = Ks*V2/2g"
"Los valores a adoptar Ks de acuerdo a la tabla N°7"
```

**Tabla N°7 completa** (transcripción literal, Ks adimensional):
Griferías `9,18`; curva a 45º `0,43`; curva a 90º `0,81`; codo a 90º
`1,35`; tee paso recto `1,00`; tee salida lateral `1,62`; tee
ent.central/salidas laterales `3,00`; llave de paso `9,18`; uniones
`0,10`; válvula esclusa `0,17`; reducciones `0,75`; tubo saliente
`1,00`.

**Naturaleza:** transcripción directa de fórmula y tabla publicadas por
ERAS-2023 — no hay interpretación IUAS en la fórmula ni en los
coeficientes en sí. `g=9,81 m/s²`, misma constante y criterio ya
adoptado en `calcularPerdidaCargaDarcyWeisbach` (CRIT-A18).

**Criterio adoptado:** primitiva pura `calcularPerdidaCargaLocalizada`
recibe `coeficienteKs` y `velocidad_mps` ya resueltos, devuelve `Js` en
m.c.a. La Tabla N°7 vive como datos puros en
`normativa/eras-2023/tabla-07-perdidas-localizadas/`
(`obtenerKsDeAccesorio`), mismo patrón que `tabla-01-gastos-conexion`.

**Alcance — qué NO resuelve este criterio (deliberadamente, M2-C):**

- No decide qué accesorios existen en una instalación real, cuántos, ni
  dónde viven en `RedHidraulica`/`Tramo` — ningún modelo de accesorios
  existe todavía (D-δ.33, sigue abierta).
- No suma pérdidas localizadas de múltiples accesorios de un mismo
  Tramo — esa composición es responsabilidad de un consumidor futuro.
- No calcula presión residual ni forma parte todavía de ningún balance
  de presión productivo.

**Estado:** Firme como transcripción normativa. Implementado en
`calcularPerdidaCargaLocalizada`
(`motor/tuberias/perdidaCarga/calcularPerdidaCargaLocalizada.ts`) y
`tabla07PerdidasLocalizadas`/`obtenerKsDeAccesorio`
(`normativa/eras-2023/tabla-07-perdidas-localizadas/index.ts`).

## CRIT-A27 — Alimentación ramificada como precondición de los motores hidráulicos de Módulo 2

**Artículo:** sin artículo ERAS directo. ERAS-2023 §2.9.2, §2.10.2 y
§2.12.1 describen el análisis de caudal y pérdida de carga "por tramo" y
"hasta el artefacto más desfavorable", pero **no enuncian ninguna
restricción topológica** sobre la red de alimentación. Este criterio no
se atribuye a ERAS.

**Naturaleza:** criterio operativo / de alcance de IUAS, derivado de la
coherencia interna del modelo de cálculo ya adoptado (CRIT-A11 en
particular). No es transcripción normativa ni interpretación de texto
ERAS.

**Criterio adoptado:**

Para el alcance hidráulico actual de Módulo 2 — CRIT-A11 (Qc por tramo),
predimensionamiento (CRIT-A16), diámetro comercial (CRIT-A23/CRIT-A24),
pérdida distribuida (CRIT-A17/CRIT-A18) y balance de presión (M2-B,
D-δ.36) — la red de alimentación evaluada se presupone **ramificada**:

- cada consumo computado por un tramo se presupone transportado
  íntegramente por **un único camino dirigido** desde una raíz de
  alimentación hasta ese consumo;
- sobre la ascendencia relevante de un terminal que Módulo 2 intenta
  resolver: a lo sumo **un tramo entrante por nodo**, **ausencia de
  ciclos**, y terminación en **exactamente un nodo raíz** sin tramo
  entrante;
- ante múltiples predecesores posibles (convergencia de dos tramos en un
  nodo, tramos paralelos entre el mismo par de nodos) o un ciclo, el
  motor **nunca elige silenciosamente** un camino: declara la topología
  no resoluble por el alcance actual y ningún resultado hidráulico se
  presenta como completo sobre ella.

**Fundamento:** CRIT-A11 define el Qc de un tramo como la simultaneidad
reaplicada sobre *todo* el conjunto de consumos computables aguas abajo
de ese tramo. Esa definición solo es coherente si cada tramo transporta
la demanda completa aguas abajo, lo que exige un único camino
origen→terminal. Una red con reparto de caudal entre caminos paralelos
(mallada, con alimentaciones múltiples, o con recirculación) haría que el
Qc por tramo dejara de estar bien definido — no es una limitación nueva
del balance de presión, sino una condición de la que el cálculo de
caudal por tramo ya dependía implícitamente desde CRIT-A11.

**Alcance — qué NO afirma este criterio:**

- **No restringe el modelo `RedHidraulica` a un árbol.**
  `RedHidraulica` y `validarRedHidraulica` conservan su generalidad
  deliberada: una red estructuralmente válida (integridad referencial —
  ids únicos, nodos existentes, `origen≠destino`, geometría CRIT-A20)
  puede contener ciclos, convergencias o alimentaciones paralelas sin
  ser rechazada por la validación estructural básica. La distinción es
  explícita:

  ```text
  red válida como estructura   ≠   red resoluble por los motores
                                    hidráulicos actuales de Módulo 2
  ```

- **No prohíbe la recirculación de ACS.** Sigue diferida (D-δ.15) y el
  modelo base no debe prohibirla conceptualmente. Cuando se aborde,
  requerirá su propio modelo hidráulico.
- **No adopta ninguna política de "camino más desfavorable"** entre
  múltiples alimentaciones. La selección de camino crítico ante
  topologías con reparto de caudal queda fuera de alcance (redes
  malladas, Hardy-Cross, reparto de caudales entre caminos paralelos:
  todos fuera de alcance, requieren criterios posteriores).
- No exige una única raíz para todo el `Proyecto`: pueden existir
  componentes independientes. La propiedad exigida es por terminal
  consultado — su ascendencia debe ser un único camino que termina en
  exactamente una raíz.
- No decide el origen hidráulico persistido (tanque elevado / red /
  bombeo), que sigue como D-δ.36.

**Estado:** Firme como criterio operativo / de alcance IUAS.
Implementado como precondición de `obtenerCaminoHaciaOrigen`
(`motor/tuberias/topologia/obtenerCaminoHaciaOrigen.ts`), que representa
explícitamente los estados de topología no resoluble
(`multiplesTramosEntrantes`, `ciclo`) en vez de fabricar un camino o
elegir un predecesor. Ver D-δ.37 en `PENDIENTES-DE-ARQUITECTURA.md`.

## CRIT-A28 — Subconjunto de pérdidas localizadas representable sobre `Tramo` (M2-C slice A)

**Artículo:** sin artículo ERAS directo. CRIT-A26 ya transcribe firme la
fórmula (`Js = Ks·V²/2g`) y la Tabla N°7 completa (12 accesorios); este
criterio no reabre ninguna de las dos. ERAS-2023 §2.12.1 no enuncia dónde
ni cómo debe representarse cada accesorio en un modelo de datos — eso es
alcance IUAS, igual que CRIT-A27.

**Naturaleza:** criterio operativo / de alcance IUAS, derivado de una
limitación real y verificable del modelo actual: `RedHidraulica` no tiene
geometría espacial (orientación, ángulos, disposición 3D) — solo
conectividad (`Nodo → Tramo → Nodo`). No es transcripción normativa ni
interpretación de texto ERAS.

**Criterio adoptado:** de los 12 accesorios de Tabla N°7, el subconjunto
`{curva45, curva90, codo90, llaveDePaso, valvulaEsclusa, uniones,
tuboSaliente}` es representable hoy de forma inequívoca como
`AccesorioDeTramo` declarado sobre un `Tramo`, porque cada uno de ellos:

- ocurre a lo largo del recorrido físico del `Tramo` (cambio de
  dirección, elemento instalado en línea, o descarga en su extremo), no
  en un punto de bifurcación/convergencia;
- usa, sin ambigüedad, la velocidad real de ese mismo `Tramo`
  (`velocidadReal_mps`, ya resuelta por `resolverDiametroComercialDeTramo`
  — nunca recalculada).

**Explícitamente fuera de este criterio** (Tabla N°7 completa, sin
resolver — ver D-δ.33): las 3 variantes de tee (`Ks` depende de la
orientación del flujo en la bifurcación, que `RedHidraulica` no puede
distinguir sin geometría espacial — introducirla está fuera de alcance);
reducciones (qué velocidad corresponde — lado mayor o menor — no está
decidido); griferías (si su pérdida ya está incluida en
`presionMinima_kgcm2` del catálogo normativo es una pregunta normativa
sin verificar, no una cuestión de representación).

**Representación adoptada:** `Tramo.accesorios?: readonly
AccesorioDeTramo[]`, con `AccesorioDeTramo = { tipo: IdAccesorioDeTramo;
cantidad: number }` — identidad normativa + cantidad, nunca el
coeficiente `Ks` persistido (se resuelve desde Tabla N°7 en cada cálculo,
mismo criterio que `materialTuberiaId`↔catálogo). Mismo patrón de
opcionalidad que `longitud_m`/`cota_m` (D-δ.22/CRIT-A20): `undefined` =
relevamiento de accesorios no realizado todavía, nunca "sin accesorios";
`[]` = relevado, el `Tramo` efectivamente no tiene accesorios de este
subconjunto — pérdida localizada real = 0.

**Alcance — qué NO resuelve este criterio:**

- No decide la representación de tees, reducciones ni griferías —
  D-δ.33 sigue abierta para esas tres.
- No suma pérdida localizada con pérdida distribuida ni con el balance de
  presión — eso lo hace `resolverPresionResidualDeCamino`, consumidor de
  este criterio, no parte de él.
- No investiga la interacción grifería/`presionMinima_kgcm2` — queda
  como sub-pregunta explícita de D-δ.33.

**Estado:** Firme como criterio operativo / de alcance IUAS. Implementado
en `resolverPerdidaLocalizadaDeTramo`
(`motor/tuberias/perdidaCarga/resolverPerdidaLocalizadaDeTramo.ts`,
composición de accesorios + velocidad → `Ks_total` → `Js`) y
`acumularPerdidaLocalizadaDeCamino`
(`motor/tuberias/presion/acumularPerdidaLocalizadaDeCamino.ts`,
acumulación por camino reutilizando `resolverDiametroComercialDeTramo`
para la velocidad de cada Tramo, sin volver a resolver Qc/diámetro).
Integrado en `resolverPresionResidualDeCamino` como `hfLocalizada`. Ver
D-δ.33 en `PENDIENTES-DE-ARQUITECTURA.md`.

## CRIT-A29 — Punto de verificación de presión mínima: la boca de conexión del artefacto (grifería fuera del balance de red)

**Artículo:** sin verificación literal disponible. Se intentó acceder al
texto completo de la Guía (Resolución ERAS 641/2023) en
`argentina.gob.ar`, AySA, InfoLeg y Boletín Oficial — el anexo técnico
existe únicamente como PDF escaneado (imagen, sin texto seleccionable)
en todas las fuentes accedidas, y el entorno de trabajo no cuenta con
herramientas de OCR/renderizado de PDF. Lo único confirmado literalmente
(ya transcripto en CRIT-A25/CRIT-A26): §2.12.1 exige "determinar la
pérdida de carga de los tramos de cañería **hasta** el artefacto más
desfavorable, para verificar la presión mínima resultante", y aplicar
Tabla N°7 ("Griferías" incluida, `Ks=9,18`) para "las pérdidas de carga
singulares o localizadas" — sin ninguna excepción textual verificada
para el caso puntual de la grifería del artefacto evaluado.

**Naturaleza:** criterio operativo / interpretativo IUAS explícito de
producto, **no transcripción normativa verificada**. Distinto de CRIT-A26
(que transcribe firme la fórmula `Js=Ks·V²/2g` y la Tabla N°7 completa,
sin cambios): CRIT-A29 decide dónde termina conceptualmente el balance de
la red frente a `presionMinima_kgcm2`, no reinterpreta ni modifica la
fórmula ni los coeficientes.

**Investigación previa** (ver D-δ.33, `PENDIENTES-DE-ARQUITECTURA.md`,
"Investigación normativa — grifería vs. `Pmin`"): corroboración externa
en fuentes de ingeniería sanitaria argentina de la misma tradición (OSN
1981) mostró que esta ambigüedad tampoco está resuelta ahí — no parece un
vacío de la búsqueda sino un punto genuinamente subespecificado en la
tradición normativa. Análisis hidráulico propio (inferencia, no norma) a
favor de esta lectura: la convención estándar de códigos sanitarios
define la presión mínima de un artefacto como la presión residual
exigida en su punto de conexión — inclusiva de la resistencia propia del
artefacto, porque no se mide "dentro" del mecanismo; el propio "...hasta
el artefacto" de §2.12.1 sugiere que el cómputo de pérdidas de cañería
termina en la conexión; Tabla N°7 lista simultáneamente "Llave de paso" y
"Griferías" con el mismo `Ks=9,18`, más coherente si son dos objetos
físicos distintos (válvula de corte en línea vs. grifo del propio
artefacto) que si fueran el mismo concepto duplicado.

**Criterio adoptado:** la verificación de presión del sistema de
distribución termina en la boca/punto de conexión del artefacto.
`presionMinima_kgcm2` (catálogo, §2.9.1.4) representa la presión mínima
disponible exigida en ese punto — no aguas abajo de él, dentro del
artefacto. En consecuencia:

- las pérdidas distribuidas (N3) y localizadas (subconjunto CRIT-A28) del
  camino se acumulan únicamente hasta la boca de conexión del artefacto
  terminal;
- la pérdida propia de la grifería/mecanismo interno del artefacto queda
  **fuera** del balance de la red que se compara contra
  `presionMinima_kgcm2` — se entiende ya absorbida por ese valor
  normativo, igual que cualquier otra resistencia interna del artefacto;
- el `Ks=9,18` de "Griferías" en Tabla N°7 **no** se agrega como pérdida
  localizada terminal en `resolverPresionResidualDeCamino`;
- no se crea nodo, accesorio de `Tramo` ni término de pérdida adicional
  para la grifería terminal.

**Alcance — qué NO resuelve este criterio:**

- No decide tees — D-δ.33 sigue abierta para esa variante (reducciones
  se cerró después, como criterio aparte: ver CRIT-A30).
- No reabre CRIT-A26: la fórmula y la Tabla N°7 completa permanecen
  intactas: "Griferías" sigue siendo una fila válida de la tabla para
  cualquier uso futuro que no sea la grifería terminal del artefacto
  verificado (hoy no existe ningún caso real de eso).
- No decide dónde vivirá conceptualmente esta regla si en el futuro se
  modela el artefacto con más detalle interno (equipos, mezcladoras,
  etc.).

**Estado:** Firme como criterio IUAS explícito de producto — no
transcripción normativa verificada. Sin consumidor de código a modificar
(ya es el comportamiento vigente de `resolverPresionResidualDeCamino`:
nunca sumó grifería). Cierra D-δ.33 respecto de grifería. No reabrir
salvo evidencia normativa nueva que contradiga explícitamente este
criterio.

## CRIT-A30 — Velocidad de referencia de "Reducciones" (Ks=0,75, Tabla N°7)

**Artículo:** ERAS-2023 §2.12.1, Tabla N°7 (misma tabla de CRIT-A26). El
`Ks=0,75` de "Reducciones" ya es firme por CRIT-A26 — este criterio NO
lo reabre ni lo reemplaza por otro coeficiente. Lo que resuelve es una
pregunta distinta que la tabla, tal como está publicada, no contesta por
sí sola: en `Js=Ks·V²/2g`, cuando una reducción conecta dos diámetros
distintos, **¿qué `V` corresponde?**

**Verificación directa de la fuente primaria (no solo "inaccesible"):**
a diferencia de la limitación de OCR que impidió resolver CRIT-A29, en
esta investigación se accedió y extrajo el texto completo de la Guía
ERAS-2023 (`if-2023-141050544-APN-DNAPYSMOP-guia.pdf`,
`argentina.gob.ar`, 182 páginas) — el PDF sí tiene texto seleccionable
vía `pdftotext -layout`, contra lo registrado en la investigación previa
de CRIT-A29. Se confirmó literalmente que Tabla N°7 (§2.12.1, página 29)
es exactamente la ya transcripta en CRIT-A26, sin ninguna nota, columna
adicional ni aclaración sobre qué diámetro/velocidad corresponde a cada
fila. Se buscó además la palabra "reducci" en el documento completo: la
única aparición junto a pérdida de carga es la fila desnuda de la tabla
— ninguna otra mención, figura ni párrafo del documento aclara la
convención. **Confirmado: ERAS-2023 no especifica la velocidad de
referencia de "Reducciones"** (no es una limitación de acceso a la
fuente, es la fuente misma agotada).

**Antecedentes normativos argentinos (nivel 2 de evidencia):** no se
pudo acceder a texto completo de OSN 1981 ni de una fuente académica
argentina equivalente con la misma tabla — los documentos encontrados
(`sedici.unlp.edu.ar`, cátedra de Instalaciones de la UNLP) son PDFs
escaneados sin texto extraíble, mismo obstáculo que en CRIT-A29 para
ese material puntual. Nivel 2 de evidencia: sin resultado.

**Bibliografía hidráulica técnica reconocida (nivel 3 de evidencia) —
convergente:**

- Munson, B. R. et al., *Fundamentals of Fluid Mechanics* (1994):
  fórmula de contracción brusca `K ≈ 0,421·(1 - D₂²/D₁²)`, con `D₂` el
  diámetro MENOR (aguas abajo) y `K` aplicado sobre `V₂` (la velocidad en
  ese mismo diámetro menor) — mismo patrón que la fórmula de expansión
  brusca del mismo texto, donde `K` siempre se aplica sobre la velocidad
  del lado de MENOR diámetro (aguas arriba en una expansión, aguas abajo
  en una contracción).
- Sotelo Ávila, G., *Hidráulica General* (1982) — la referencia clásica
  de lengua española para esta materia, base directa de la tradición de
  cálculo sanitario argentina: su tabla de coeficiente de pérdida `K`
  para **contracción gradual** (la geometría real de una reducción
  comercial de cañería, no un corte brusco de laboratorio) está descripta
  textualmente como "en función de la **velocidad de salida**" — el lado
  menor, aguas abajo.
- Ambas fuentes, independientes entre sí (una norteamericana, una
  latinoamericana/hispanoparlante) y citando geometrías distintas
  (contracción brusca y gradual), coinciden sin excepción: la velocidad
  de referencia de un coeficiente `K`/`Ks` de reducción es la del
  diámetro MENOR — que en una reducción real es, por definición, el lado
  aguas abajo (el flujo se angosta en el sentido de circulación).

**Intento de refutación:** se buscó explícitamente evidencia de la
convención contraria (V del lado mayor/aguas arriba) en literatura
técnica y en tablas de coeficientes de accesorios comerciales (estilo
Crane TP-410) — no se encontró ninguna fuente que refiera el `K` de una
reducción/contracción a la velocidad del diámetro mayor. Se verificó
también que la convención "V del lado menor" es la misma tanto para
contracción brusca (Munson) como gradual (Sotelo) — no depende de si la
transición real es abrupta o progresiva, lo que la hace robusta frente a
la incertidumbre sobre qué geometría exacta modela el `Ks=0,75` de
Tabla N°7.

**Consecuencia numérica (caso real del propio proyecto, no hipotético):**
fixture de dos Tramos consecutivos con 2 y 1 artefactos aguas abajo
respectivamente (ver
`motor/tuberias/presion/acumularPerdidaLocalizadaDeCamino.test.ts`,
caso "reducciones (CRIT-A30)") resuelve, con el catálogo y sistema
comercial productivos reales (Acqua System Magnum PN20): Tramo padre
`Qc=0,50 l/s`, candidato 25mm/Di efectivo 18,00mm, `V=1,965 m/s`; Tramo
hijo `Qc=0,20 l/s`, candidato 20mm/Di efectivo 14,40mm, `V=1,228 m/s`.

```text
Js (V del lado menor, adoptado) = 0,75 · 1,228² / (2·9,81) ≈ 0,0576 m.c.a.
Js (V del lado mayor, descartado) = 0,75 · 1,965² / (2·9,81) ≈ 0,1476 m.c.a.
```

La interpretación descartada da un resultado **~2,56 veces mayor** —
la elección no es indiferente, confirmando que valía la pena resolverla
como criterio explícito en vez de elegir cualquiera de las dos por
conveniencia.

**Criterio adoptado:** el `Ks=0,75` de "Reducciones" se aplica sobre la
velocidad real (`velocidadReal_mps`) del Tramo que representa el lado
MENOR/aguas abajo de la transición de diámetro. En el modelo de dominio
esto significa: una reducción se declara como `AccesorioDeTramo` sobre
ESE Tramo (el más angosto de los dos, el más cercano al consumo) —
exactamente el mismo patrón de representación que el resto del
subconjunto CRIT-A28 (`Tramo.accesorios`, `Ks` resuelto desde Tabla N°7,
`V` de ese mismo Tramo, `Js` compuesto por `resolverPerdidaLocalizadaDeTramo`
sin ninguna lógica nueva). No hizo falta introducir un concepto de
"transición" ni de accesorio nodal: una vez resuelta la convención de
velocidad, el Tramo del lado menor YA tiene, sin ambigüedad, el dato
correcto — mismo motivo de cierre que descartó las Opciones B/C/D en
D-δ.33.

**Declaración explícita, nunca inferida:** que dos Tramos consecutivos
resuelvan diámetros comerciales distintos es un dato hidráulico (depende
de `Qc`, que depende de cuántos artefactos hay aguas abajo de cada uno)
— **no prueba por sí solo** que exista físicamente una reducción
comercial en esa transición. El motor nunca agrega `Ks=0,75`
automáticamente porque `Di(tramo padre) ≠ Di(tramo hijo)`: el usuario
debe declarar `{ tipo: 'reducciones', cantidad }` en `accesorios`,
igual que cualquier otro accesorio del subconjunto. `undefined` sigue
significando "no relevado"; `[]` sigue significando "relevado, sin
accesorios de este subconjunto" — sin excepción para reducciones.

**Alcance — qué NO resuelve este criterio:**

- No decide tees en el momento de este cierre — quedó como el único
  punto restante de D-δ.33 (cerrado después por CRIT-A31).
- No valida cruzadamente que el Tramo declarado como lado menor sea
  efectivamente más angosto que su predecesor en la topología: es un
  dato declarado y confiado, igual que el resto de `AccesorioDeTramo`
  (ningún accesorio de este subconjunto se re-deriva ni se verifica
  contra otra propiedad estructural del Tramo).

**Estado:** Firme como criterio operativo IUAS (interpretación de
convención de velocidad, no transcripción normativa — ERAS no la
especifica). Implementado agregando `'reducciones'` a
`IdAccesorioDeTramo`/`idsAccesorioDeTramo`
(`modelo/redHidraulica/index.ts`) — sin cambios en
`resolverPerdidaLocalizadaDeTramo`, `acumularPerdidaLocalizadaDeCamino`
ni `validarRedHidraulica`, que ya eran genéricos sobre el subconjunto.
Ver D-δ.33 en `PENDIENTES-DE-ARQUITECTURA.md`.

## CRIT-A31 — Tees en modo detallado: representación y velocidad por recorrido (Ks de Tabla N°7)

**Artículo:** ERAS-2023 §2.12.1, Tabla N°7 (misma tabla de CRIT-A26). Los
tres `Ks` de tee (`teePasoRecto=1,00`, `teeSalidaLateral=1,62`,
`teeEntradaCentralSalidasLaterales=3,00`) ya son firmes por CRIT-A26 —
este criterio no los reabre. Resuelve dos preguntas que la tabla no
contesta: **dónde vive** la tee en el modelo de dominio (D-δ.33 la había
excluido de `Tramo.accesorios` por esto) y **qué velocidad** corresponde
a cada uno de los tres recorridos quando una tee conecta un tramo
entrante con dos salientes.

**Decisión de dominio aprobada por el usuario** (no una investigación
normativa nueva — el punto que bloqueaba D-δ.33 no era evidencia
faltante sino ausencia de geometría espacial en el modelo, ya
diagnosticado en CRIT-A28): una tee es una singularidad del **Nodo** de
bifurcación, no del Tramo — a diferencia del resto del subconjunto
CRIT-A28/CRIT-A30, el `Ks` de una tee depende de la relación entre el
tramo entrante y CADA tramo saliente, no de un único Tramo aislado.
Alcance actual: exclusivamente nodos con **1 tramo entrante y 2 tramos
salientes** — no se amplía a convergencias 2→1, redes malladas ni
recirculación en este incremento.

**Representación adoptada:** `Nodo.tee?: ConfiguracionDeTee`
(`modelo/redHidraulica/index.ts`), con dos configuraciones:

```text
{ tipo: 'entradaPorExtremo', tramoSalidaRectaId: string }
{ tipo: 'entradaCentral' }
```

- **`entradaPorExtremo`**: la entrada llega por un extremo del eje
  principal de la tee. El tramo declarado en `tramoSalidaRectaId` usa
  `Ks='teePasoRecto'`; el OTRO tramo saliente (nunca declarado
  independientemente — una sola elección determina ambas) usa
  `Ks='teeSalidaLateral'` por descarte.
- **`entradaCentral`**: la entrada llega por la boca central/perpendicular
  de la tee. AMBOS tramos salientes usan `Ks='teeEntradaCentralSalidasLaterales'`,
  sin necesidad de elegir cuál es cuál.

Deliberadamente NO persiste: `Ks` (se resuelve desde Tabla N°7 en cada
cálculo, mismo criterio que el resto del modelo), coordenadas, ángulos,
orientación absoluta, izquierda/derecha ni geometría gráfica — solo la
mínima información para clasificar el recorrido hidráulico de cada
tramo saliente. Nunca se infiere orientación desde ids, orden de
arrays, orden de creación ni nombres.

**`undefined` no equivale a "sin tee" — asimetría deliberada con el
resto de `AccesorioDeTramo`:** una reducción, un codo o una curva
PUEDEN estar genuinamente ausentes en un tramo recto (`accesorios: []`
es un cero real). Una bifurcación 1→2 real, en cambio, **no puede**
no tener algún tipo de pieza en T/Y — dos ramas no salen de un único
caño sin una singularidad física ahí. Por eso `Nodo.tee` no tiene un
equivalente a `[]`: `undefined` significa exclusivamente "bifurcación
real, tee todavía no relevada", nunca "sin tee".

**Velocidad de referencia:** `Js_tee = Ks(recorrido)·V²/2g`, con `V` la
velocidad real (`velocidadReal_mps`) del TRAMO SALIENTE recorrido por
el camino evaluado — nunca una "velocidad de tee" separada ni la del
tramo entrante. Consecuencia importante: la MISMA tee física puede
aportar un `Js` distinto a dos caminos terminales diferentes (Ks
distinto por recorrido, V distinta por el `Qc` propio de cada rama) sin
que la pieza se duplique en el modelo — se declara una única vez, sobre
el Nodo, y cada camino la evalúa con su propio tramo saliente.

**Resolver puro:** `resolverClasificacionDeTee(redHidraulica, nodoId,
tramoSalienteId)` (`motor/tuberias/topologia/`) — deriva la
clasificación (`'teePasoRecto' | 'teeSalidaLateral' |
'teeEntradaCentralSalidasLaterales'`) desde `Nodo.tee` + la conectividad
real. Devuelve `'sinConfigurar'` (bifurcación real sin relevar) o
`'noEsBifurcacionDeTee'` (el Nodo no tiene exactamente 1 entrante + 2
salientes — fuera de alcance, no es incompletitud) como estados de
dominio; cualquier inconsistencia estructural (menos/más salientes de
los esperados, `tramoSalidaRectaId` que no pertenece a los dos
salientes reales) es una precondición imposible tras
`validarRedHidraulica` — throw, no un estado a manejar.

**Validación estructural** (`validarRedHidraulica`): un `Nodo.tee`
declarado exige exactamente 1 tramo entrante y 2 salientes
(`redHidraulicaNodoTeeEstructuraNoSoportada` si no) y, en
`entradaPorExtremo`, que `tramoSalidaRectaId` sea uno de los dos
salientes reales (`redHidraulicaNodoTeeTramoSalidaRectaInvalido` si no).
Si la topología cambia y la declaración queda inconsistente, la
próxima validación lo señala explícitamente — nunca se elige otra
salida en silencio.

**Integración con el camino:** `acumularPerdidaLocalizadaDeCamino`
consulta `resolverClasificacionDeTee` sobre el `nodoOrigenId` de cada
Tramo del camino. Si la bifurcación está sin configurar
(`'sinConfigurar'`), el Tramo queda no resuelto con motivo
`'teeSinConfigurar'` — misma barrera de completitud que accesorios sin
relevar (`MotivoTramoSinPerdidaLocalizada`). Si está clasificada, su
`Js_tee` se suma al `hf_m` propio de los accesorios en línea del mismo
Tramo (ambos usan la misma `V`, composición lineal ya establecida por
CRIT-A26). Si el Nodo no es una bifurcación de tee
(`'noEsBifurcacionDeTee'`), no hay contribución — no es incompletitud.

**Consecuencia sobre `CoberturaDePerdidaLocalizada` (cierre efectivo de
D-δ.33 para pérdida localizada):** con tees resueltas, el subconjunto
representable sobre `RedHidraulica` cubre TODA Tabla N°7 (griferías
deliberadamente excluida del balance, CRIT-A29 — no es un vacío de
cobertura). `acumularPerdidaLocalizadaDeCamino` ya cortaba con
`'incompleta'` ante cualquier accesorio sin relevar; ahora también ante
cualquier tee sin configurar. Por eso, cuando devuelve `'acumulada'`
para un camino específico, esa cobertura YA es genuinamente completa —
`resolverPresionResidualDeCamino` deja de envolver el resultado como
`{tipo:'parcial'}` y pasa a `{tipo:'completa'}`. La única barrera
restante para `balanceCompleto` en el proyecto productivo hoy es
`hfMedidor` (D-δ.35), nunca más `hfLocalizada`.

**Alcance — qué NO resuelve este criterio:**

- No decide el modo estándar/estimado de pérdidas localizadas (sin
  declaración manual de cada tee/accesorio) — ver D-δ.40 en
  `PENDIENTES-DE-ARQUITECTURA.md`, registrado pero no implementado.
- No amplía el alcance a convergencias 2→1, redes malladas ni
  recirculación.
- No valida cruzadamente que la tee declarada corresponda a una
  instalación físicamente plausible — es un dato declarado y confiado,
  mismo criterio que el resto de `AccesorioDeTramo`.

**Estado:** Firme como decisión de dominio aprobada (representación +
convención de velocidad, no transcripción normativa adicional — los
`Ks` ya eran firmes por CRIT-A26). Implementado en
`modelo/redHidraulica/index.ts` (`ConfiguracionDeTee`, `Nodo.tee`),
`validacion/redHidraulica/index.ts` (validación estructural),
`motor/tuberias/topologia/resolverClasificacionDeTee.ts` (clasificación
pura) y `motor/tuberias/presion/acumularPerdidaLocalizadaDeCamino.ts`
(integración). Cierra D-δ.33 para el alcance 1→2 declarado. Ver D-δ.33
en `PENDIENTES-DE-ARQUITECTURA.md`.

## CRIT-A32 — Tabla N°6: selección del medidor general por caudal de cálculo, e inconsistencia del ejemplo oficial

**Artículo:** ERAS-2023 §2.12 y Tabla N°6.

**Texto oficial confirmado** (Resolución 641/2023,
`guia_para_ejecucion_de_instalaciones_sanitarias_domiciliarias`,
argentina.gob.ar — el PDF tiene texto seleccionable vía
`pdftotext -layout`):

- *"El diámetro y caudal máximo de los medidores se determinan de acuerdo
  a la Norma ISO 4064, los valores en la tabla N° 6."*
- §2.12.1 punto c) de las Secuencias de Cálculo: *"Con el Qc definimos:
  el diámetro del medidor general y sus dimensiones de acuerdo a lo
  indicado en 2.12."*
- Ejemplo de "vivienda tipo": *"Con este último valor en m3/h
  seleccionamos de la tabla N°6 un valor de Qc igual o mayor al nuestro"*.

**Tabla N°6 — transcripción verificada** (`normativa/eras-2023/tabla-06-medidores`):

| DN medidor (mm) | Qc de cálculo del proyecto (m³/h) | Caudal medio (m³/h) | Capacidad máxima C (m³/h) |
|---|---|---|---|
| 15 | 1,5 | 2,25 | 3 |
| 19 | 2,5 | 3,75 | 5 |
| 25 | 3,5 | 5,25 | 7 |
| 32 | 5 | 7,5 | 10 |
| 38 | 10 | 15 | 20 |
| 50 | 15 | 22,5 | 30 |
| 60 | 25 | 37,5 | 50 |
| 75 | 40 | 60 | 80 |

**Regla de selección adoptada (literal de §2.12):** se adopta la primera
fila (menor DN) cuyo "Qc de cálculo del proyecto" tabulado sea **igual o
mayor** al `Qc` de diseño del ámbito evaluado. **No se interpola DN.** La
capacidad `C` que alimenta la fórmula (6) de CRIT-A25 se toma de **esa
misma fila**. El "caudal medio" es informativo — no participa de la
selección ni de la pérdida.

**Conversión de unidades:** el `Qc` de diseño lo produce el motor de
demanda/hidráulica en l/s; para comparar contra Tabla N°6 se convierte a
m³/h (`× 3,6`) y para la fórmula (6) a l/min (`× 60`). La comparación
contra el umbral tabulado usa una tolerancia de `1e-9 m³/h` (≈ 1 µL/h)
para que un `Qc` que vale exactamente un valor de tabla no caiga a la
fila siguiente por error de representación IEEE-754 de la conversión.

**Inconsistencia oficial documentada (errata normativa):** el ejemplo de
"vivienda tipo" que la Guía coloca inmediatamente después de la Tabla
N°6 toma `Qc = 2,5 m³/h`, selecciona un **medidor DN19** y afirma
**`C = 7 m³/h`**, con lo que calcula `Jm = 0,036·(42,1/7)² = 1,3 m.c.a.`
Pero en la Tabla N°6 la fila DN19 tiene **`C = 5`**; `C = 7` pertenece a
la fila **DN25**. Es una inconsistencia interna de la propia Guía. Se
resuelve así:

- **Fuente de verdad para el motor de selección: la Tabla N°6.** El DN
  seleccionado fija su `C` desde la misma fila (`DN19 → C = 5`). No se
  replica el par `DN19 ↔ C = 7` del ejemplo.
- **La Tabla N°6 no se modifica** para hacerla coincidir con el ejemplo.
- La primitiva `calcularPerdidaCargaMedidor(Qcl, C)` (CRIT-A25) conserva
  un test aritmético con `Qcl = 42,1`, `C = 7` → `1,3 m.c.a.` como
  verificación de la **fórmula**, explícitamente **no** descrito como
  propiedad normativa del DN19.
- Observación aritmética coherente con lo anterior: bajo la regla literal,
  `Qc = 0,71 l/s = 2,556 m³/h` (el valor del ejemplo sin redondear a
  `2,5`) selecciona **DN25**, cuya `C = 7` sí reproduce el `Jm = 1,3` del
  ejemplo. Es decir, el `C = 7` del ejemplo es consistente con DN25; lo
  erróneo es su etiqueta "DN19". No se usa esta observación para alterar
  la regla ni la tabla — sólo refuerza que la tabla es la fuente correcta.

**Dominio cubierto — sin extrapolación:** Tabla N°6 llega hasta
`Qc = 40 m³/h` (DN75). Un `Qc` de diseño mayor devuelve
`'fueraDeTabla06'` — **nunca** se extrapola una fila adicional. La
ampliación de rango corresponde a la Tabla N°8 (Anexo A de la Guía,
"Diseño de medidores en función del caudal de demanda"), que en el texto
oficial es una lámina no transcripta; se incorporará como dato normativo
separado antes de ampliar la selección, si aporta umbrales adicionales.

**Verificación metrológica — deliberadamente NO se hace todavía:** ERAS
remite a ISO 4064 pero el texto de la Guía no publica `Q1/Q2/Q3/Q4` ni
`Qmin`. Por eso el motor sólo verifica lo que la fuente permite (que el
`Qc` cae dentro del dominio de la tabla). Una verificación de rango
metrológico (caudal mínimo, sobrecarga) podrá agregarse cuando exista la
clase ISO 4064 o un catálogo de fabricante como dato — no se inventa un
"caudal mínimo metrológico" sin respaldo.

**Alcance — qué NO resuelve este criterio:**

- Sólo la parte tabular/selección. El caudal de diseño del **medidor
  individual** por unidad funcional (§2.6.c, §2.12.1.e) lo fija **CRIT-A33**
  (simultaneidad total, `K = 1`); una vez determinado ese `Qunit`, entra a
  esta misma Tabla N°6 con la misma regla.
- No decide dónde vive el medidor en `RedHidraulica` (D-δ.35 sigue
  abierta; M3 permanece separado de la topología — el resultado es un
  dato de borde para la capa de presión de M2).
- No integra `hfMedidor_mca` al balance de presión productivo ni decide
  si pertenece al camino de un terminal dado (eso depende del origen
  hidráulico y del tipo de medidor, D-δ.38).

**Estado:** Firme como transcripción normativa (Tabla N°6) + regla de
selección literal. Implementado en
`normativa/eras-2023/tabla-06-medidores/index.ts`
(`tabla06Medidores`, `seleccionarFilaTabla06PorCaudal`),
`motor/medidores/resolverSeleccionYPerdidaDeMedidor.ts` (núcleo común) y
`motor/medidores/seleccionarMedidorGeneral.ts`. Ver D-δ.53 en
`PENDIENTES-DE-ARQUITECTURA.md` para el registro del alcance M3-B0/M3-B1.

## CRIT-A33 — Medidor individual por unidad funcional: caudal de diseño por simultaneidad total (K=1)

**Artículo:** ERAS-2023 §2.6 (regla específica del dimensionamiento del
medidor individual) frente a §2.12.1.e (Secuencias de Cálculo, remisión
genérica).

**Texto oficial confirmado** (Resolución 641/2023):

- §2.6: *"El dimensionamiento de los medidores individuales por unidad de
  vivienda se realizará bajo el criterio de **simultaneidad total de los
  consumos** y deberá garantizar el registro de los caudales reales
  máximos y minimizar las pérdidas de carga."*
- §2.6: *"El proyecto de las instalaciones de agua permitirá la medición
  en todos los ramales de agua fría y caliente que abastezcan a cada
  unidad funcional, local comercial o industrial"*; *"En todo edificio…
  que vaya a contar con más de un propietario (por ser propiedad
  horizontal), se deberá instalar un sistema de medición individual…
  Estos medidores no sustituyen al medidor general."*
- §2.12.1.e: *"Dimensionado del medidor individual: determinar Qunit de
  cada unidad considerando todos los artefactos que la integran de
  acuerdo a lo citado en 2.9 y siguientes."*

**Contradicción interna de la Guía (documentada, no se afirma coherencia):**
§2.6 exige "simultaneidad total" (todos los consumos a la vez → coeficiente
de simultaneidad `K = 1`), mientras §2.12.1.e remite a §2.9 y siguientes
(pipeline estadístico `Qmax → Kc → K → Qc`, con `K < 1` para `n ≥ 2`).
Ambas indicaciones producen números distintos.

**Decisión IUAS adoptada:** para el dimensionamiento del **medidor
individual** prevalece **§2.6** por ser la regla dedicada y explícita a
ese objeto (frente a la remisión genérica de §2.12.1.e). El caudal de
diseño del medidor individual es:

```text
Qunit = Σ (cantidad · qu efectivo)   sobre los consumos del alcance del medidor
```

**sin** aplicar `Kc`, `K` ni el coeficiente de mayoración `a`. Ese mismo
`Qunit` se usa tanto para la **selección** por Tabla N°6 (CRIT-A32) como
para el `Qcl` de la **fórmula (6)** de pérdida (CRIT-A25) — **no** se
adopta una solución híbrida (un caudal para seleccionar y otro para la
pérdida): no hay evidencia oficial que respalde dos caudales distintos en
el medidor individual. Si una fuente oficial futura la demuestra, se
revisa.

**Naturaleza:** interpretación/adopción IUAS que resuelve una contradicción
interna de ERAS aplicando su regla más específica — mismo estatus
epistémico que CRIT-A14. `K = 1` como tal es texto de §2.6 ("simultaneidad
total"); lo adoptado por IUAS es *darle prioridad sobre §2.12.1.e* para
este objeto concreto.

**Semántica AF/AC — sin doble conteo (no reabre nada):** `qu efectivo` de
cada consumo es el que ya resuelve la maquinaria cerrada del modelo
(`resolverQuEfectivoParaTramo`, CRIT-A15): un artefacto conectado
físicamente a una sola red aporta `quTotal` a esa cañería; un artefacto
mixto aporta `quFria` a la red AF y `quCaliente` a la red AC, que suman
`quTotal` sin contarse dos veces; el paso por producción ACS ya está
contemplado en el clasificador de condición hidráulica. CRIT-A33 **no**
reinterpreta `qu` ni parte `quTotal` en fracciones — suma el `qu efectivo`
ya resuelto para el servicio (AF o AC) que el medidor mide.

**Retención de CRIT-A8 / computabilidad / actividad hidráulica:** "sin
`Kc`/`K`/`a`" se refiere exclusivamente al **coeficiente de
simultaneidad**. Los filtros de computabilidad (`origen === 'normativo'`),
de actividad hidráulica por condición y de participación CRIT-A8 (qué
artefactos pueden coexistir físicamente en uso) siguen aplicando: definen
*qué consumos integran el alcance*, no reducen estadísticamente la suma.
El resultado es "todos esos consumos a la vez", que es lo que pide §2.6.

**Alcance — qué NO resuelve este criterio:**

- No decide **cuántos** medidores individuales tiene un proyecto ni
  **dónde** se ubican (AF, AC central, ACS individual sin ramal medido):
  eso depende de la arquitectura física real y se resolverá en M3-B2b tras
  reconstruir las figuras de micro-medición (Fig. 2.2–2.7). **No** se
  adopta como regla universal "cada UF = 1 medidor AF + 1 medidor AC".
- No decide la obligatoriedad (propiedad horizontal / >1 propietario): eso
  es configuración de proyecto (M3-C).
- No integra `hfMedidor` al balance de presión (M3-E) ni decide si un
  medidor individual pertenece al camino de un terminal dado (D-δ.38).
- No introduce ninguna entidad de medidor en `RedHidraulica` (decisión
  roja 1 / D-δ.35: M3 separado de la topología).

**Estado:** Firme como decisión IUAS trazable. Implementado en
`motor/medidores/seleccionarMedidorIndividual.ts` (motor puro de alcance
declarado: recibe la lista de consumos con su `qu` efectivo ya resuelto
para el servicio medido, suma con `K = 1`, entra a Tabla N°6 y a la
fórmula (6)). La derivación `topología → conjunto de consumos por medidor`
y la cardinalidad las resuelve **CRIT-A34** (M3-B2b). Ver D-δ.53 en
`PENDIENTES-DE-ARQUITECTURA.md`.

## CRIT-A34 — Cardinalidad y alcance de los medidores individuales por unidad funcional

**Artículo:** ERAS-2023 §2.6, §2.19.1, §2.19.4, §2.19.5; Figuras 2.2–2.7 y
2.14–2.16 de la Guía.

**Texto/figuras oficiales** (Resolución 641/2023; las figuras son láminas,
reconstruidas desde fuentes oficiales / AySA — ver D-δ.54 en
`PENDIENTES-DE-ARQUITECTURA.md`):

- §2.6: en propiedad horizontal (*"más de un propietario"*) es obligatorio
  un sistema de medición individual por unidad, en *"todos los ramales de
  agua fría y caliente que abastezcan a cada unidad funcional"*; los
  medidores individuales *"no sustituyen al medidor general"*.
- §2.19.1: la Guía distingue *"Sistemas individuales y centrales"* de
  producción de agua caliente.
- §2.19.5 + Fig. 2.16: *"Cada ramal de distribución de agua caliente
  **desde el medidor** hasta la entrada a cada unidad funcional debe estar
  provisto de llave de paso"* — en ACS **central** existe un medidor
  individual de AC además del de AF.
- §2.19.4 + Fig. 2.14/2.15: el sistema central de ACS (acumulador,
  recirculación, medidores de AC agrupados en sala/sector común) es un
  caso físico distinto del individual.
- Figs. 2.4–2.7: variantes de **ubicación** del sector de micromedición
  (sala exclusiva vs. gabinete sectorizado; con bombeo o presurización).
  No alteran el cálculo del medidor individual ni permiten inferir el tipo
  de ACS.

**Criterio físico adoptado (interpretación IUAS):**

- **Caso `individual`** (producción de ACS dentro de la UF): desde
  instalaciones comunes entra sólo el suministro de AF, medido. El medidor
  individual de AF está aguas arriba de la división interna AF-directa /
  AF→producción-ACS. **Por conservación de masa** (D-δ.6) contabiliza
  **todo** el consumo de agua de la UF: para cada artefacto su `quTotal`,
  con independencia de a qué red(es) esté conectado físicamente. **No hay
  medidor de AC** (no existe un ramal común de AC entrando a la UF).
  ⇒ **1 alcance por UF**, `servicioMedido = 'aguaFria'`.
- **Caso `central`** (producción de ACS común): AF y AC llegan a la UF por
  ramales comunes distintos, cada uno con su medidor. Artefacto mixto:
  `quFría` al medidor de AF y `quCaliente` al de AC (suman `quTotal`, sin
  doble conteo). Artefacto de una sola red: su `quTotal` a esa red.
  ⇒ **alcance de AF** siempre (si la UF tiene algún consumo conectado);
  **alcance de AC** sólo si hay consumo de AC — **nunca un medidor de AC
  vacío**.
- **Sin propiedad horizontal ⇒ 0 alcances individuales.**

**`individual` vs `central` es configuración física DECLARADA por UF, no
inferida:** el modelo (`ReferenciaDeProduccionACS = { tipo: 'produccionACS' }`)
no distingue central de individual, y **no se adopta** la convención
"`produccionACS` dentro del subárbol de la UF ⇒ individual" — inferencia
frágil, descartada en D-δ.54. El tipo de provisión de ACS es un dato de
entrada (`ConfiguracionDeMedicionIndividual.tipoProvisionACSPorUnidadFuncional`),
que M3-C podrá persistir (eventualmente como configuración global con
override por UF). `RedHidraulica` se consulta **sólo** para la
conectividad física de cada artefacto (CRIT-A15), vía
`determinarConectividadFisica`.

**Identidad del alcance:** `unidadFuncionalId + servicioMedido`
(`'aguaFria' | 'aguaCaliente'`). En los esquemas normativos observados
cada ramal medido individual identifica una UF y un servicio. **Si
aparece evidencia real de más de un ramal medido del mismo servicio para
la misma UF, es una decisión roja** — no se modela todavía.

**Universo de consumos:** artefactos **computables** (`origen ===
'normativo'`) y **físicamente conectados** (con al menos un terminal en
`RedHidraulica`). Un artefacto declarado sin conexión física es una
brecha de cobertura (S1), no un consumo de este cálculo. **El filtro de
participación CRIT-A8** (coexistencia física por Local) **no se aplica en
este slice**: no restar consumos es conservador para el
dimensionamiento del medidor (medidor mayor, menor pérdida), coherente
con *"garantizar el registro de los caudales reales máximos"* de §2.6. Su
incorporación queda como refinamiento futuro.

**Alcance — qué NO resuelve este criterio:**

- No selecciona el medidor ni calcula la pérdida: eso es CRIT-A33
  (`K = 1`) + CRIT-A32 (Tabla N°6), en
  `motor/medidores/seleccionarMedidorIndividual.ts`. Este criterio sólo
  produce los **alcances** (el input de ese motor).
- No persiste nada (ni `esPropiedadHorizontal`, ni el tipo de ACS): son
  entradas puras. La persistencia es M3-C.
- No introduce ninguna entidad de medidor en `RedHidraulica` (decisión
  roja 1 / D-δ.35).
- No modela variantes de ubicación del sector de micromedición
  (Figs. 2.4–2.7): no afectan el cálculo.
- No cubre >1 ramal medido del mismo servicio por UF (decisión roja si
  aparece).

**Estado:** Firme como interpretación IUAS trazable, con base en figuras
normativas reconstruidas (D-δ.54). Implementado en
`motor/medidores/resolverAlcancesDeMedidoresIndividuales.ts`. Ver D-δ.54
en `PENDIENTES-DE-ARQUITECTURA.md`.

## CRIT-A35 — Reserva Total Diaria de Diseño por déficit de caudal (Módulo 4)

**Artículo:** ERAS-2023 §2.10.2 ("Alimentación por tanques y
determinación del Volumen de Reserva Diaria"); §2.11.1 y §2.11.2 remiten a
la misma secuencia de cálculo; §2.8 (obligación de reserva) y §2.11.3
(reparto entre tanques) quedan fuera de este criterio.

**Texto oficial confirmado** (verificado contra la Resolución 641/2023,
IF-2023-141050544-APN-DNAPYS#MOP, Cap. 2):

> "Si la conexión a conceder por la OPERADORA DEL SERVICIO nos ofrece un
> caudal inferior al Caudal de Cálculo Qc, debemos prever una reserva de
> agua que compense ese déficit, en las horas de mayor consumo."
> "El proyectista deberá analizar el período de consumo, con un mínimo de
> 1 hora a un máximo de 4 de acuerdo a las características de la
> instalación a proyectar, con el cual determinará la reserva de agua
> necesaria."

**Fórmula adoptada** (reconstruida de las planillas de ejemplo Tabla N°3
y Tabla N°4 de la Guía — ver CASOS-GOLDEN.md G3/G4; las planillas se
publican como imágenes, no como texto):

```
Dc        = max(0, Qc − Qconexión)          [l/s]
Dc_m3h    = Dc · 3,6                         [m³/h]
VReserva  = Dc_m3h · Tc                      [m³]      con 1 h ≤ Tc ≤ 4 h
```

`Qc` es el caudal de cálculo del proyecto (M1, CRIT-A5). `Qconexión` es el
caudal que la operadora otorga en la conexión. `Tc` es el **período de
consumo máximo**, elegido por el proyectista dentro de la ventana 1–4 h
que fija la Guía.

**Ejemplos oficiales verificados:**

- **Tabla N°3** (continúa la secuencia de Tabla N°2): `Qc = 0,71 l/s`,
  `Qconexión = 0,60 l/s`, `Tc = 2 h` → `Dc ≈ 0,39 m³/h` →
  **Reserva de Diseño ≈ 0,77 m³** (la planilla adopta "a ejecutar" 1,00 m³).
- **Tabla N°4**: `Qc ≈ 1,96 l/s`, `Qconexión ≈ 1,18 l/s`, `Tc = 1 h` →
  `Dc ≈ 2,82 m³/h` → **Reserva de Diseño ≈ 2,82 m³** (la planilla la
  presenta redondeada a ≈ 3 m³).

**Precisión numérica:** se opera con el `Qc` real aguas arriba, **sin
redondear `Qc` ni `Dc`** antes de calcular el volumen. El redondeo es de
presentación; las diferencias aparentes entre las celdas de las planillas
oficiales provienen de su propio redondeo de presentación. Con `Qc` sin
redondear el ejemplo de Tabla N°3 reproduce 0,771 m³ (≈ 0,77 publicado);
redondeando `Qc` a 0,71 daría 0,792 m³.

**Criterio adoptado:** primitiva pura `calcularReservaDiaria`
(`motor/reserva/calcularReservaDiaria.ts`) que recibe `qc_lps`,
`qConexion_lps` y `tc_h` explícitos y devuelve `deficit_lps`,
`deficit_m3h` y `volumenReservaDiseno_m3`. No conoce `Proyecto`,
`RedHidraulica` ni ningún catálogo. Validaciones: `qc_lps ≥ 0`,
`qConexion_lps ≥ 0`, `1 ≤ tc_h ≤ 4`.

**Alcance — qué NO resuelve este criterio (decisiones cerradas en
D-δ.61):**

- `Tc` es período de consumo máximo, **no** un tiempo de llenado del
  tanque.
- **No** estima población ni usa dotación per cápita: la dotación
  500/350/150 l/hab·día de §2.9.1.1 es consumo de conjunto urbano, no
  reserva domiciliaria. **No** multiplica `Qc` por 24 h ni aplica ninguna
  regla de "24 horas completas de consumo".
- `Qconexión ≥ Qc` ⇒ `Dc = 0` ⇒ volumen 0. Es un resultado matemático
  determinado, **no un error**, y **no equivale por sí solo a "tanque no
  requerido"**: la obligación de reserva puede surgir de §2.8 con
  independencia del déficit. Esa obligación se modela en un slice
  posterior.
- **No** decide el volumen adoptado / "a ejecutar" ni un catálogo
  comercial de tanques: la Guía muestra 0,77 m³ → 1,00 m³ sin enunciar
  una regla general de redondeo comercial. `VReserva` es el volumen
  **requerido/de diseño**.
- **No** resuelve el reparto entre tanque de bombeo y tanque de reserva
  (§2.11.3: cada uno ≥ 1/3 de la Reserva Total Diaria cuando ambos
  existen; no es un reparto único obligatorio 1/3 + 2/3).
- `Qconexión` entra como **input explícito**. Su fuente futura es la
  Tabla N°1 (§2.7, `normativa/eras-2023/tabla-01-gastos-conexion`) por
  diámetro de conexión + presión disponible, con la interpolación lineal
  ya declarada en esa tabla; hoy el modelo no persiste el diámetro de
  conexión, así que la derivación queda para un slice posterior.

**Estado:** Firme como transcripción/fórmula normativa, con ejemplos
oficiales verificados. Implementado en `motor/reserva/calcularReservaDiaria.ts`.
Ver D-δ.61 (contrato) y D-δ.62 (motor) en `PENDIENTES-DE-ARQUITECTURA.md`.
