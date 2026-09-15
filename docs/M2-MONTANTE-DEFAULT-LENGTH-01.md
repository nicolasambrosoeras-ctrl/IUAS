# M2-MONTANTE-DEFAULT-LENGTH-01

## Problema

El encargo original pedía cambiar un supuesto default fijo de 10 m para
segmentos nuevos de Montante a 5 m. La arqueología previa a implementar
encontró que ese default fijo no existía: `reconciliarMontante.ts`
(única fábrica de segmentos de Montante) ya asignaba como longitud
sugerida `|Δz|`, la diferencia de cota entre los extremos del segmento
-- decisión cerrada documentada como CRIT-A20, que impedía fabricar una
longitud 0 cuando `|Δz|` era 0 o indeterminado (el segmento quedaba sin
longitud precargada). Esto se planteó como decisión roja al usuario.

## Decisión

La convención deseada no reemplaza `|Δz|` por un valor fijo ni lo usa
sólo como fallback: los compone.

```
longitud sugerida de un segmento nuevo = 5 m (base) + |Δz|
```

Ejemplos:

- mismo nivel, `Δz = 0` → longitud sugerida 5 m.
- PB (0 m) → Piso 1 (+3 m) → longitud sugerida 8 m.
- diferencia de cota 6 m → longitud sugerida 11 m.

Si las cotas necesarias para calcular `|Δz|` son indeterminadas (cota de
origen del montante o cota de piso del Local sin resolver), la
sugerencia queda en los 5 m base, sin inventar una diferencia vertical.

## Qué significa "base"

Los 5 m representan el desarrollo horizontal/derivación típico de un
segmento de montante, no un mínimo hidráulico. `|Δz|` sigue siendo la
única contribución vertical del segmento.

## Editable, no mínimo

5 m (o `5 + |Δz|`) es sólo la longitud **sugerida** al crear el
segmento (`longitudEsSugerida: true`). El proyectista puede
reemplazarla libremente por cualquier valor permitido por las
validaciones existentes (3,5 m, 12 m, etc.); no hay ningún
`Math.max(5, …)` ni validación nueva de mínimo.

## Preservación

Al editar la longitud sugerida, el flag `longitudEsSugerida` desaparece
(RD-2) y el valor pasa a ser dato físico manual: reconciliaciones
posteriores del mismo montante (agregar/quitar Locales, splits, cambios
de topología) nunca lo tocan, reparten, interpolan ni normalizan de
vuelta a 5 m (RD-1).

## Anti-doble-conteo

`resolverIncrementoVerticalPorNivel.ts` suprime el incremento vertical
automático de modo Rápido (`+3 m/piso`) en cualquier camino que
atraviese un `Tramo.montanteId` definido (M2-TOPO-C §37-§39). Esa
supresión depende exclusivamente de la presencia de `montanteId`, no del
valor de `longitud_m`, así que sigue vigente sin cambios: un segmento de
montante nunca recibe la corrección por piso además de su `|Δz|` real.

## CRIT-A20

No se modificó. CRIT-A20 sigue rigiendo la validez de una longitud
**explícita** igual a 0 (dato manual del proyectista); este slice
cambia únicamente el valor **sugerido** al crear un segmento, que ahora
nunca es indeterminado ni 0 -- siempre al menos 5 m.

## Alimentaciones

`LONGITUD_INICIAL_DISTRIBUCION_GENERAL_M = 10`
(`backfillLongitudesDePredimensionamiento.ts`) no cambia.

## Locales

`LONGITUD_INICIAL_LOCAL_RED_M = 5`
(`backfillLongitudesDePredimensionamiento.ts`) no cambia.

## Proyecto de ejemplo

`proyectoDeEjemplo.ts` no declara montantes explícitos; no requirió
ningún cambio.

## Copy

Cabecera de modo Rápido en `ResultadoHidraulicoDeTramo.tsx` actualizada
para incluir "5 m por segmento de montante" junto a los defaults ya
documentados de Local y alimentación.

## Fuera de alcance

`UX-HIERARCHY-POLISH-01` (cards colapsadas, Nivel/Local colapsables,
nombres editables, summaries jerárquicos).
