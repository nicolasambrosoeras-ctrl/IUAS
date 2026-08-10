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

**Estado:** Adoptado conceptualmente. Pendiente de implementación en
motor/tests (ver D-δ.19 en `PENDIENTES-DE-ARQUITECTURA.md`).

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

**Alcance — qué NO resuelve este criterio:**

- No fija el diámetro comercial ni el material de la cañería.
- No calcula la velocidad real de escurrimiento ni la verifica contra
  §2.12.1; eso queda para el incremento que incorpore diámetro
  comercial/adoptado.
- No define si, en el futuro, distintos tramos o materiales podrían
  ameritar un `Ve` de predimensionamiento distinto de 2,0 m/s; con la
  información actual del proyecto no hay elementos para justificar esa
  distinción, y no se adopta aquí.

**Estado:** Firme para la etapa de predimensionamiento. No implica
implementación en motor/tests todavía.
