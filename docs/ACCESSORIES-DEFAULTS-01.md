# ACCESSORIES-DEFAULTS-01 (D-δ.139)

> **Superseded por `MATERIALS-ACCESSORIES-01` (D-δ.141):** la composición
> física por defecto descripta en este documento fue reemplazada por
> completo por la estimación constructiva DREZA de Locales (decisión de
> dominio del usuario). Este documento queda como registro histórico de
> la V1; ver `docs/MATERIALS-ACCESSORIES-01.md` para el comportamiento
> vigente.

## Objetivo

Completar un pendiente funcional de Caudal: los accesorios físicos
cargados por aproximación/por defecto en el modo simplificado (Modo
Rápido) ahora forman parte del Listado de materiales, no sólo del cálculo
de `hf` de HYD-EST.

## Arqueología

Fase A completa en `docs/ACCESSORIES-DEFAULTS-01-ARQUEOLOGIA.md` (modelo
de `Tramo.accesorios`, Tabla N°7, HYD-EST actual confirmado en código,
`MetodoPerdidaLocalizada`/`GranularidadHidraulica` como discriminadores ya
existentes, y cómo `resolverTees()` ya computa Tees topológicas reales
siempre, independientemente del modo).

## Decisión de dominio (cerrada por el usuario)

> Los accesorios físicos por defecto constituyen una aproximación propia
> de la granularidad simplificada. La granularidad profesional nunca
> completa el BOM con accesorios default; exige piezas explícitamente
> modeladas.

Se aprobó la Alternativa A (reusar la composición completa de HYD-EST
como BOM físico aproximado), con una condición adicional obligatoria: los
defaults existen **exclusivamente** cuando
`granularidadHidraulica === 'simplificada'` — no alcanza con que
`metodoPerdidaLocalizada === 'estimado'`. En `'profesional'`, el listado
de materiales nunca genera accesorios físicos por defecto, sin importar
el método de pérdida localizada; sólo usa `Tramo.accesorios` explícitos y
`Nodo.tee` topológicos reales.

Esto también es lo que elimina cualquier riesgo de doble conteo entre una
Tee estimada y una Tee topológica real: en `'profesional'` los defaults
están directamente deshabilitados (no hay nada que pudiera colisionar); en
`'simplificada'`, un Local nunca tiene `Nodo.tee` propio (las Tees reales
sólo existen en derivaciones de Montante -- M2-TOPO-D/`TeeDeNodoEditor.tsx`
-- fuera del alcance de un Local individual).

## Regla implementada

Para cada `(Local, red)` con `n` terminales físicos
(`contarTerminalesFisicosDeLocal`), cuando
`granularidadHidraulica === 'simplificada'` y
`metodoPerdidaLocalizada === 'estimado'`:

| n | Tee (K=3.00) | Codo 90° (K=1.35) | Llave de paso (K=9.18) |
|---|---|---|---|
| 0 | 0 | 0 | 0 |
| 1 | 0 | 1 | 1 |
| 2 | 1 | 1 | 1 |
| 3 | 2 | 1 | 1 |
| 4 | 3 | 1 | 1 |

Cardinalidad EXACTA de HYD-EST (D-δ.40/D-δ.45): `nTeesEstimadas = max(0,
n-1)`, `nSingularidadTerminal = n≥1 ? 1 : 0` (Codo 90°),
`nLlaveDePaso = n≥1 ? 1 : 0` (Llave de paso). En `'profesional'`, siempre
0 sin importar `n`.

El DN de cada default es el DN comercial ADOPTADO del Tramo representativo
de ese Local+red (`identificarFilasPrincipalesDeLocales`/
`identificarTramosRepresentativosDeLocales`) -- nunca `Di`, nunca
inventado. Si ese Tramo no tiene DN resoluble, no se agrega ninguna pieza
para ese Local+red y se declara pendiente ("Accesorios físicos estimados
de Tramo `<id>` (`<red>`) — DN pendiente de definición"), mismo criterio
de "nunca inventar" que el resto del cómputo de materiales. CRIT-A30 se
preserva explícitamente: ningún default infiere una "Reducción".

## Implementación

`src/exportadores/pdf/resolverDatosDeListadoDeMateriales.ts`:

- `ItemAccesorioComputado` gana el campo `origen: 'definido' | 'estimado'`.
  `'definido'` = `Tramo.accesorios` explícito o Tee topológica real
  (comportamiento ya existente, sin cambios de cómputo). `'estimado'` =
  la nueva composición física por defecto. Es 100 % derivado -- no se
  persiste en ningún lado.
- Nueva función `resolverAccesoriosFisicosPorDefecto`: recorre
  `identificarFilasPrincipalesDeLocales(proyecto)`, cuenta terminales con
  `contarTerminalesFisicosDeLocal` (la MISMA función que usa HYD-EST) y
  agrega Tee/Codo90/LlaveDePaso al acumulador de accesorios con claves
  prefijadas `estimado|...` (nunca colisionan con las claves de
  `'detallado'` ni con `tee|...` de la Tee real -- y ni siquiera podrían,
  porque `'detallado'`/`'estimado'` son mutuamente excluyentes a nivel de
  Proyecto).
- **No importa ni toca** `resolverPerdidaLocalizadaEstimadaDeLocal.ts` --
  reutiliza sólo la MISMA cardinalidad (documentada, no reimportada como
  código) como aproximación de compra. `hf` de HYD-EST queda bit-a-bit
  idéntica antes y después de este slice (test de invariancia incluido).

`src/exportadores/pdf/generarDocumentoPdfMateriales.ts`:

- Sección "Accesorios explícitamente modelados" → "Accesorios", con nueva
  columna "Origen" (`Estimado`/`Definido`).
- Nota de sección vacía y aclaración final reescritas: ya no afirman
  absolutamente que "las pérdidas localizadas estimadas no se convierten
  en piezas de compra" -- ahora explican la distinción por modo
  (simplificado usa una composición aproximada; profesional exige piezas
  explícitas).
- Numeración de secciones corregida: antes saltaba `1, 2, 3, 4, 5, 7`
  (Observaciones tenía el `7` hardcodeado); ahora un contador
  (`siguienteNumero()`) numera consecutivamente las 6 secciones que
  siempre se renderizan.

## Impacto

- **M2/hf**: cero cambios. `resolverPerdidaLocalizadaEstimadaDeLocal.ts`
  no se modificó ni se le agregaron dependencias nuevas.
- **Materials**: nueva rama puramente aditiva en el resolver; el resto del
  cómputo (tuberías, Tee real, medidores, almacenamiento, artefactos)
  sigue exactamente igual.
- **UI**: sin cambios -- no se agregó ningún editor ni control nuevo. El
  usuario ve el resultado únicamente en el PDF de Materials.
- **Persistencia/schema**: sin cambios. Nada de esto se persiste; un
  proyecto anterior a este slice recalcula los mismos defaults de forma
  determinista la próxima vez que se genera el listado.
- **Backward compatibility**: total. Ningún archivo `.iuas` anterior
  necesita migración.

## Tests

`resolverDatosDeListadoDeMateriales.test.ts`: nuevo describe "accesorios
físicos por defecto" -- n=1..4 en simplificada+estimado (tabla exacta de
arriba), n=0 sin defaults, profesional+estimado sin defaults, simplificada
+detallado sin defaults (mutuamente excluyentes), profesional+estimado con
Tee real relevada (sólo la Tee real, origen `'definido'`), margen de
compra aplicado a un default, invariancia de `hf` de HYD-EST antes/después
de computar Materials. `generarDocumentoPdfMateriales.test.ts` (nuevo
archivo): numeración de secciones consecutiva 1..6, título "N. Accesorios",
columna "Origen" con valores "Estimado", aclaración final actualizada.

## Fuera de alcance (V1)

Sin defaults para Montantes, Alimentación general/ACS, ni conexiones
terminales (flexible/llave escuadra) -- sin convención robusta ni base
topológica para inventarlos (ver arqueología). Humanización de IDs
internos en "Elementos pendientes de definición" (`t-af-lavatorio`,
`n-af-1`) queda diferida como P2 -- requiere trabajo transversal.
