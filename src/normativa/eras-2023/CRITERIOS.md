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
