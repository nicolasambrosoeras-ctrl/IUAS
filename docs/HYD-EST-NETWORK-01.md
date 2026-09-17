# HYD-EST-NETWORK-01 — Incorporar los accesorios estimados de Montante y Colector al camino hidráulico

## Objetivo

Cerrar la divergencia documentada desde `HYD-ACQUA-K-CATALOG-01`: los
accesorios estimados DREZA de Montante y Colector principal existían
únicamente para el listado de materiales (compra) y nunca aportaban a la
pérdida localizada estimada (ΣK/hf) de ningún terminal. Un accesorio podía
figurar en materiales sin aportar pérdida de carga.

## Alcance confirmado (decisión roja resuelta por el usuario)

Este incremento extiende la incidencia por camino a **Montante y Colector
principal** — sectores con topología real de Tramo/Nodo (ADR-0001). **El
interior de un Local NO se toca**: sigue modelado exclusivamente por el
agregado histórico `(Local, red)` de `resolverPerdidaLocalizadaEstimadaDeLocal.ts`
(D-δ.40/D-δ.45, `FIX-HYD-EST-SIMPLIFIED-01`).

Este límite es deliberado: en D-δ.112/D-δ.113 (`HYD-EST-01`), el usuario
rechazó explícitamente en validación manual un modelo "path-aware" a nivel
Local, porque exigía topología 1→2 real y dejaba `Incompleto` cualquier
derivación 1→N (un baño de 4 artefactos, el caso más común del dominio).
Montante y Colector son arquitectónicamente distintos: sí tienen una
topología real de `Tramo`/`Nodo` persistida (a diferencia del interior de
un Local, que nunca se modela tramo por tramo), así que extender la
incidencia por camino ahí no reproduce ese fracaso.

## Fuente única de verdad

`src/motor/tuberias/topologia/resolverAccesoriosFisicosEstimadosDeRed.ts`
computa, para Montante y Colector, cada accesorio físico estimado como una
instancia con **ubicación topológica concreta** — un `Tramo` real
(accesorios "en línea": llave, codos, uniones) o un `Nodo` real (tees de
derivación) — en vez de sólo una cantidad agregada:

```ts
export type AccesorioFisicoEstimado = {
  readonly idFisico: string
  readonly tipo: IdAccesorioFisicoEstimado // llaveDePaso | teeDerivacion | codoUltimoLocal
                                            // | codoUltimaSalida | codoRecorrido | unionRecta
                                            // | teeAcs | teeRuptor | unionTanque
  readonly sector: 'montante' | 'colectorPrincipal'
  readonly red: RedDeTramo
  readonly montanteId?: string
  readonly ubicacion: { tipo: 'tramo'; tramoId: string } | { tipo: 'nodo'; nodoId: string }
  readonly dnComercial: string
}
```

Esta MISMA lista alimenta:

1. **Materials** (`resolverAccesoriosConstructivosDreza.ts`,
   `resolverAccesoriosDeMontantesYColectorDreza`): proyecta cada entrada al
   modelo de materiales (`ItemAccesorioComputado`), agrupando por
   `(tipo, ubicación amplia, red, DN)` — nunca recalcula cantidades por su
   cuenta.
2. **Hidráulica** (`acumularPerdidaLocalizadaEstimadaDeMontanteYColector.ts`):
   resuelve la incidencia de cada entrada sobre UN camino real por simple
   pertenencia topológica (`accesorio.ubicacion` ∈ `camino.tramos`/
   `camino.nodos`) — sin listas de terminales mantenidas a mano.

Cantidad física vs. incidencia hidráulica quedan separadas por
construcción: cada `AccesorioFisicoEstimado` es SIEMPRE una pieza (nunca
`cantidad>1`); una Tee que afecta varios caminos sigue siendo una sola
entrada con una sola `ubicacion` — su pertenencia a N caminos se resuelve
consultando esa ubicación N veces, nunca duplicando la pieza.

## Ubicación de cada clase de accesorio

- **Llave de paso** (Montante/Colector, general): en el PRIMER Tramo de la
  cadena — afecta a todos los caminos servidos desde ahí.
- **Tee de derivación**: en el NODO real de bifurcación — afecta
  únicamente a los caminos que atraviesan ese nodo específico (un Local
  servido por una derivación anterior en la cadena nunca llega a un nodo
  posterior).
- **Codo de último Local / última salida**: en el ÚLTIMO Tramo de la
  cadena (Montante) o en el Tramo de la última salida (Colector) — afecta
  únicamente al camino de esa salida.
- **Codos de recorrido / uniones periódicas**: distribuidos por distancia
  acumulada desde el origen sobre los segmentos reales (ver más abajo).
- **Tee ACS / Tee ruptor / Unión a tanque**: en el primer Tramo del
  Colector (piezas comunes a toda la instalación AF, no de una salida
  particular).

## Distribución de accesorios periódicos

`distribuirAccesorioPeriodico(segmentos, periodo_m)`: dado
`cantidad = floor(longitudTotal_m / periodo_m)`, cada pieza en la
distancia `i·periodo_m` se asigna al PRIMER segmento cuya longitud
acumulada (incluyéndolo) alcanza o supera esa distancia. Si la distancia
coincide EXACTAMENTE con el nodo que cierra un segmento, la pieza queda de
ESE lado (el segmento que la cierra), nunca en el siguiente ni duplicada
— convención única y determinista.

Cada Montante y el tronco de Colector calculan su **propia** cantidad
periódica sobre su **propia** longitud — nunca agregada con la de otro
Montante/el Colector del mismo sector amplio (ver "Uniones" más abajo).

## Tronco de Colector: BFS, no cadena lineal

`tramosDeColectorEnOrden` recorre, por BFS desde el Tramo raíz, **todo el
subárbol** de tramos "de reparto" (tramos que no arrancan un Montante, no
son el Tramo representativo de un Local, y no llevan a producción ACS) —
no se corta en la primera bifurcación. Un Colector puede bifurcarse varias
veces antes de llegar a sus salidas finales (ej.: 4+ Locales alimentados
directamente desde un único nodo).

`resolverDerivacionesDelColector` recorre TODOS los nodos frontera de ese
subárbol y, en cada uno, identifica las salidas reales (arrancan un
Montante o el Tramo representativo de un Local): cada una suma una Tee,
salvo la ÚLTIMA de todas (en el orden determinístico del recorrido), que
se resuelve como codo.

**Caso degenerado**: si el propio Tramo raíz de toda la topología ya
pertenece a un Montante (`identificarFilasDistribucionGeneral` clasifica
por ausencia de tramo entrante, sin mirar `montanteId`), no hay ningún
segmento de Colector distinto aguas arriba — se trata exclusivamente como
Montante, nunca también como Colector (evita doble conteo del mismo Tramo
bajo dos sectores).

**Montante sin topología**: una identidad `Montante` sin ningún `Tramo`
propio (M2-TOPO-C, estado válido) no tiene ningún camino hidráulico al que
pertenecer — ya NO cuenta como salida del Colector ni genera una Tee
"fantasma" (corrección respecto del comportamiento anterior, que contaba
identidades sin verificar topología real — ver "Correcciones" abajo).

## Uniones: agrupación por ubicación específica (decisión del usuario)

**Conflicto detectado y resuelto**: la regla de uniones/cuplas rectas cada
4 m (`resolverUnionesRectasDreza`, cerrada en `MATERIALS-ACCESSORIES-01`/
`MATERIALS-PDF-POLISH-02`) agrupaba por **sector amplio** (Material+Red+DN+
Sector, ej. "todos los Montantes AF de DN20 juntos"), no por Montante
individual — decisión deliberada de `MATERIALS-PDF-POLISH-02` para
preservar el total histórico del proyecto de referencia (88 u), después de
probar y descartar la agrupación por ubicación específica (que bajaba el
total a 86 u).

Este incremento exige lo opuesto: cada Montante/Colector calcula su propia
unión como `floor(longitudPropia_m / 4)`, y la misma instancia física debe
alimentar materiales e hidráulica — no puede haber una cuenta agregada por
sector para compra y otra por Montante individual para hidráulica sin
violar la fuente única de verdad.

**Decisión del usuario**: agrupar por ubicación específica. La regla "una
unión cada 4 m" se aplica a cada conducción física continua, no a la suma
de longitudes de un sector — no deben combinarse remanentes de Montantes
diferentes para producir una unión adicional. Se acepta el cambio de
cómputo como corrección legítima (no como regresión): `MATERIALS-PDF-POLISH-02`
preservó deliberadamente el total anterior porque todavía no existía una
ubicación hidráulica unificada; este incremento aporta la evidencia
arquitectónica que permite cerrar correctamente esa decisión.

`resolverUnionesRectasDreza` sigue existiendo (agrupación amplia, sin
cambios en su propio código) pero ahora EXCLUYE los Tramos de Montante/
Colector ya cubiertos por la nueva fuente física
(`tramoCubiertoPorAccesoriosFisicosDeRed`) — evita contar la misma unión
física dos veces bajo dos reglas de agrupación distintas. Locales no están
cubiertos por la nueva fuente (alcance confirmado, sin cambios).

**Resultado verificado en el proyecto de referencia**: pese al cambio de
regla, el total base (88 u) y el total de compra consolidado (104 u) NO
cambiaron — el resumen de compra (`resolverConsolidadoDeAccesorios`) ya
agrupaba por `etiqueta+DN`, no por ubicación detallada, así que separar
filas de detalle (ej. tronco de Colector vs. Alimentación ACS, antes
fusionados bajo la misma etiqueta amplia `colectorPrincipal` por una
clasificación preexistente de `resolverUbicacionDeTramo`) no cambia el
total consolidado. La composición interna del detalle sí cambió (más
filas, cada una con su propia ubicación trazable).

## Ks por sistema comercial

Reutiliza exclusivamente el resolutor central ya existente
(`resolverKsDeAccesorioDeTramo`/`resolverKsEstimadoTee`, HYD-ACQUA-K-CATALOG-01):

| Tipo físico | Mapeo a catálogo |
|---|---|
| `llaveDePaso` | `IdAccesorioDeTramo: 'llaveDePaso'` (Tabla N°7, fallback documentado) |
| `codoRecorrido` / `codoUltimoLocal` / `codoUltimaSalida` | `IdAccesorioDeTramo: 'codo90'` |
| `unionRecta` | `IdAccesorioDeTramo: 'uniones'` |
| `teeDerivacion` / `teeAcs` / `teeRuptor` | `resolverKsEstimadoTee` (misma tee estimada distributiva de HYD-EST, 1,80 Acqua System / 3,00 Tabla N°7) |
| `unionTanque` | **sin Ks** (0 explícito) — no hay coeficiente propio ni equivalencia documentada para "Unión doble" (HYD-ACQUA-K-CATALOG-01: "ninguna de estas piezas está modelada... no hay nada que reasignar") |

Sólo tiene efecto hidráulico bajo `acquaSystemMagnumPn20` — el único
sistema con catálogo propio para estas piezas (mismo gate que Sobrepaso/
Reducción estimados). Bajo cualquier otro sistema, la incidencia es
siempre 0 (no se inventa un valor).

## Velocidad de referencia (decisión documentada)

- Accesorio "en línea" (`tipo: 'tramo'`): velocidad REAL de ESE Tramo.
- Accesorio de nodo (tee): velocidad del Tramo que **continúa ESTE camino
  específico** desde el nodo (el siguiente tramo del mismo camino, aguas
  abajo hacia el terminal) — es la velocidad del flujo que efectivamente
  atraviesa la derivación en la dirección de este camino, no un promedio
  ni la velocidad de la rama que no se toma.

## Corrección de asimetría: fan-out simultáneo vs. cadena secuencial

**Bug encontrado y corregido** durante la integración con
`verificacionLongitudVerticalPorNivel.test.ts` (T12/T33): cuando varias
salidas comparten el MISMO nodo de origen (un fan-out simultáneo de N
salidas desde un único punto, no una cadena secuencial de bifurcaciones
1→2), la "última salida" (codo) coincidía en el mismo nodo que la Tee de
sus hermanas. Como la Tee es de tipo `nodo` (afecta a CUALQUIER camino que
atraviese ese nodo, incluida la propia última salida) y el codo es de tipo
`tramo` (afecta sólo a su propio camino), la última salida terminaba
viendo Tee + codo (dos piezas), mientras sus hermanas sólo veían la Tee
(una pieza) — una asimetría espuria entre salidas físicamente
equivalentes, contradiciendo la regla del dominio ("nunca se suman
ambas").

Corrección: en `acumularPerdidaLocalizadaEstimadaDeMontanteYColector.ts`,
un `codoUltimaSalida`/`codoUltimoLocal` cuyo Tramo arranca del MISMO nodo
que una Tee de derivación existente no suma su propia contribución (ya
cubierta por la Tee que ese nodo aporta a cualquier camino que lo
atraviesa). Sólo afecta al caso de nodo compartido; una cadena secuencial
real (cada derivación en un nodo distinto, ver Montante/Colector Caso
D/Caso A) no se ve afectada.

## Correcciones encontradas al ejercitar el refactor (resumen)

1. **Colector con topología multi-nivel**: `tramosDeColectorEnOrden` pasó
   de cadena estrictamente lineal (cortaba en la primera bifurcación) a un
   BFS del subárbol completo de reparto.
2. **Montante sin topología (identidad sin Tramo)**: ya no cuenta como
   salida del Colector — corrige el comportamiento anterior, que contaba
   identidades `Montante` sin verificar que tuvieran algún `Tramo`
   asociado (una Tee "fantasma" sin ningún camino hidráulico al que
   pertenecer).
3. **Tee de derivación de Montante limitada a `max(0, n-1)`**: la
   cardinalidad histórica DREZA se preserva como techo — un nodo de
   bifurcación puede existir por una razón ajena al reparto entre Locales
   de ese Montante (ej.: el segmento del Montante termina en un nodo que
   además alimenta producción ACS); ese caso no debe sumar una Tee de más.
4. **Rama hacia producción ACS excluida del walk de derivaciones**: sin
   este filtro, un nodo con [rama ACS, salida real] confundía la rama ACS
   con "continúa el tronco" y desviaba el recorrido hacia producción ACS
   en vez de seguir repartiendo Montantes/Locales.
5. **Asimetría de fan-out simultáneo** (ver sección dedicada arriba).

Ninguna de estas correcciones cambia las cantidades de materiales del
proyecto de referencia (88 u / 104 u, verificado); todas afectan
exclusivamente a la incidencia hidráulica y/o a la ubicación topológica
correcta de las piezas.

## Rendimiento

`resolverAccesoriosFisicosEstimadosDeRed` es el MISMO resultado para todos
los terminales de una resolución (depende sólo de `proyecto`, no del
terminal). `obtenerAccesoriosFisicosEstimadosDeRedDeContexto` lo memoiza
por `ContextoDeCalculoM2` (`WeakMap`, vive y muere con el contexto) —
detectado como necesario porque, sin memoizar, `resolverPresionResidualDeCamino`
recalcularía TODOS los Montantes/Colector del proyecto por cada terminal,
reintroduciendo la complejidad `O(terminales·montantes)` que el resto del
árbol de presión ya evita (el test de equivalencia de contexto compartido,
`contextoDeCalculoM2.equivalencia.test.ts`, empezó a excederse del timeout
de 5000 ms sin esta memoización).

## Resultados antes/después (proyecto canónico, auditoría transversal M1-M4)

| | Valor |
|---|---|
| Antes de HYD-EST-NETWORK-01 (HYD-ACQUA-K-CATALOG-01) | −19,640 m.c.a. |
| Después (Montante/Colector aportan ΣK real) | −23,931 m.c.a. |

Sigue NO CUMPLE en ambos casos (el defecto de "Presión sobre acera" es
preexistente y ajeno a este incremento). El cambio es exclusivamente la
incorporación, por primera vez, de la incidencia hidráulica real de
Montante/Colector del camino crítico.

## Listado de materiales — invariantes verificados

Proyecto de referencia (Vivienda unifamiliar de ejemplo, 10 % de margen):

| | Antes | Después |
|---|---|---|
| Accesorios base | 88 u | 88 u (sin cambios) |
| Accesorios sugeridos de compra | 104 u | 104 u (sin cambios) |
| Tuberías | 65,00 m → 71,50 m | sin cambios |

La composición interna del detalle sí cambió (separación de filas
Colector/ACS, ver "Uniones" arriba) — ver también los tests de
`resolverDatosDeListadoDeMateriales.test.ts` (Caso D con topología real de
3 Montantes, Caso D-bis con Montante sin topología).

## Tests

- `resolverAccesoriosFisicosEstimadosDeRed.test.ts`: distribución
  periódica (incluida la convención de borde exacto en un nodo), cadena de
  4 Locales sobre un Montante (llave/tees/codo último/codos/uniones),
  pertenencia por camino (un Local inferior no ve las derivaciones de los
  superiores), Montante sin topología.
- `acumularPerdidaLocalizadaEstimadaDeMontanteYColector.test.ts`: 0 bajo
  sistema no-Acqua, ΣK creciente con la profundidad del camino, llave
  general presente en todos los caminos servidos.
- `resolverDatosDeListadoDeMateriales.test.ts`: Caso D (3 Montantes con
  topología real: 2 tees + 1 codo + ACS + tanque), Caso D-bis (Montante
  sin topología no genera Tee fantasma), Caso E (4 Locales directos, sin
  cambios).
- `verificacionLongitudVerticalPorNivel.test.ts`: actualizado para
  incorporar explícitamente el nuevo término `hfMontanteYColector_mca` en
  vez de ensanchar tolerancias (§41/§69, T12/T33).
- Baseline transversal (`auditoriaTransversalM1M4.baseline.test.ts`,
  `resolverDatosDeInforme.test.ts`, `resolverResumenDeProyecto.test.ts`):
  margen del terminal crítico actualizado a −23,931 m.c.a.

## QA

`tsc -b` limpio. Vitest: **2151/2151**. ESLint: 11/0 (baseline
preexistente, sin regresión).

## Pendientes reales (no cubiertos por este incremento)

- **Reducciones estimadas de Montante/Colector por cambio de DN**: el
  brief original pedía resolver reducciones (K=0,55/0,85 por salto de
  serie) en los tramos de Montante/Colector cuando cambia el DN entre
  segmentos adyacentes, reusando `clasificarSaltoDeReduccion`/
  `resolverKsDeReduccion` (ya existentes, usados hoy por Detallado y por
  la reducción estimada de Local). **No implementado en este incremento**
  por restricción de tiempo — el modelo de accesorios físicos
  (`AccesorioFisicoEstimado`) no incluye todavía un tipo `reduccion`.
  Queda como extensión natural: cada par de segmentos adyacentes con DN
  distinto en la cadena de Montante/tronco de Colector debería generar una
  entrada `{tipo:'reduccion', ubicacion:{tipo:'tramo', tramoId: <segmento
  de menor DN>}}`, resuelta por el mismo catálogo ya usado en Local.
- **Tres proyectos de aceptación auditables (Caso A/B/C del brief
  original)**: no se armaron como fixtures dedicados independientes; la
  cobertura equivalente vive distribuida entre los tests unitarios
  listados arriba (que sí cubren los mismos escenarios: dos Locales sobre
  una Montante, tres Montantes sobre Colector, cambio de DN) pero no como
  proyectos `.iuas` completos con informe/PDF propios.
- **PDF regenerado y verificado visualmente**: no se generó ni inspeccionó
  el PDF real (informe hidráulico ni listado de materiales) del proyecto
  de referencia a través de la app corriendo contra un build — sólo se
  verificó el `docDefinition` vía tests (extracción de texto). Recomendado
  antes de dar el incremento por cerrado en producción.
- **E2E dirigido, deploy y smoke de producción**: no ejecutados en este
  incremento (fuera del alcance cubierto por tiempo disponible).
- **ADR / `ROADMAP.md`**: no actualizados todavía con esta entrada —
  pendiente antes del cierre formal del incremento.
