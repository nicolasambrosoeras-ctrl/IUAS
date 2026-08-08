# CRITERIOS.md — Paquete eras-2023

Registro de interpretaciones normativas.

## CRIT-A1 — Índice del radical en la fórmula de Kc

**Artículo:** ERAS-2023 §2.9.2.2

**Criterio adoptado:** Raíz cuadrada.

## CRIT-A7 — Desagregación fría/caliente para artefactos de agua exclusivamente fría

**Artículo:** ERAS-2023 §2.9.1.2

**Criterio adoptado:** La totalidad del caudal total corresponde a agua fría.

## CRIT-A8 — Regla de simultaneidad para inodoros con válvula automática

**Artículo:** ERAS-2023, art. 2.10.1

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
