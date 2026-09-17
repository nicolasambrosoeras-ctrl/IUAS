# HYD-ACQUA-K-CATALOG-01 — Completar el catálogo hidráulico Acqua System

## Objetivo

Cerrar las decisiones diferidas de `HYD-OVERPASS-01` (D-δ.143) usando la
tabla oficial completa de coeficientes de resistencia (`R`) publicada por
el fabricante: "Coeficiente de resistencia de carga para accesorios Acqua
System®", Manual Técnico Acqua System (Grupo Dema), página impresa 34.

Fuente: https://www.grupodema.com.ar/bundles/app/front/images/Manual-Acqua-System-03-03-2026.pdf

## Equivalencia R (fabricante) ↔ K (programa)

En la formulación del fabricante `h_local = Σ R·V²/2g`, idéntica a
`Js = Ks·V²/2g` (CRIT-A26). `R` es numéricamente equivalente al `K` que ya
usa el programa — no hay conversión de unidades ni de fórmula, sólo una
fuente de valores distinta según el sistema comercial adoptado.

## Tabla oficial completa transcrita (`tablaOficialAcquaSystem.ts`)

Extraída del texto real del PDF (`pdfjs-dist`), verificada contra el
ejemplo numérico resuelto de la página 33 del mismo manual ("10 uniones
normales · 0,25 = 2,50" + "10 codos a 90º · 2 = 20"), que fija la
correspondencia número↔nombre↔valor de toda la tabla:

| N.º | Accesorio/configuración | R |
|---:|---|---:|
| 1 | Unión normal | 0,25 |
| 2 | Buje de reducción de diámetros inmediatos | 0,55 |
| 2a | Buje de reducción de diámetros mediatos | 0,85 |
| 3 | Codo a 90° | 2,00 |
| 4 | Codo a 45° | 0,60 |
| 5 | Tee normal: entrada por extremo y salidas por continuación y ramal | 1,80 |
| 5a | Tee reducida: misma configuración | 3,60 |
| 6 | Tee normal: entradas por extremo y ramal; salida por el otro extremo | 1,30 |
| 6a | Tee reducida: misma configuración | 2,60 |
| 7 | Tee normal: entradas por ambos extremos; salida por el ramal | 4,20 |
| 7a | Tee reducida: misma configuración | 9,00 |
| 8 | Tee normal: entrada por el ramal; salidas por ambos extremos | 2,20 |
| 8a | Tee reducida: misma configuración | 5,00 |
| 9 | Tee con rosca central metálica | 0,80 |
| 10 | Tubo macho o tubo hembra | 0,40 |
| 11 | Codo con rosca metálica | 2,20 |

Los 16 valores no varían por DN en la tabla del fabricante (mismo criterio
que ERAS-2023/Tabla N°7).

## Arquitectura: tres catálogos separados

1. **Tabla N°7 ERAS-2023** (`tabla-07-perdidas-localizadas/index.ts`):
   normativo, transcripción firme de ERAS-2023 §2.12.1. **Sin cambios en
   este slice.** Sigue siendo la única fuente para hierro, cobre, PVC
   genérico, etc.
2. **Catálogo Acqua System** (`catalogoKAccesoriosAcquaSystem.ts`, keyed
   por identidad de dominio): traduce las filas de la tabla oficial a
   accesorios consultables, cada uno con:
   - `id`, `nombreAcqua`, `ks`, `itemManual` (número de fila oficial),
     `fuente`, `ambito`;
   - `procedencia`, uno de:
     - `oficialFabricante`: valor publicado tal cual (uniones, codo90,
       curva90, curva45, y las 3 filas informativas 9/10/11).
     - `oficialFabricanteSimplificado`: valor oficial de una fila
       concreta, adoptado como aproximación deliberada de un fenómeno más
       amplio (la Tee estimada, ver más abajo).
     - `equivalenciaDocumentada`: valor construido por composición de
       otras filas oficiales, nunca publicado para esa pieza específica
       (el Sobrepaso, HYD-OVERPASS-01).
     - `fallbackNormativoERAS`: el fabricante no publica coeficiente
       propio -- se documenta explícitamente con el valor de Tabla N°7
       (`llaveDePaso`, `valvulaEsclusa`, `tuboSaliente`), **nunca**
       reportado como si fuera un valor de fabricante
       (`resolverKsDeAccesorioDeTramo` sigue devolviendo
       `catalogo: 'eras2023TablaN7'` para estas 3 piezas, mirando la
       `procedencia`, no la mera presencia en la lista).
3. **Reducciones** (`clasificarSaltoDeReduccion.ts` +
   `resolverKsDeReduccion.ts`): K por CONTEXTO topológico (salto de
   diámetro real), nunca por identidad fija -- vive fuera de los dos
   catálogos anteriores.

Ningún id de `IdAccesorioDeTramo` queda en estado `pendiente` (sin K en
absoluto): todos tienen al menos Tabla N°7.

## Selección de catálogo (dominio hidráulico)

Sin cambios de ubicación respecto de HYD-OVERPASS-01:
`resolverKsDeAccesorioDeTramo(id, sistemaDeTuberiaId)` decide -- nunca el
PDF, Materials ni ningún componente visual. Se usa desde
`resolverPerdidaLocalizadaDeTramo.ts` (Detallado) y, para la Tee/Sobrepaso/
Reducción estimadas, desde `resolverPerdidaLocalizadaEstimadaDeLocal.ts`
(Estimado).

## Tee estimada = 1,80 (no un promedio)

`resolverKsEstimadoTee(sistemaDeTuberiaId)`
(`resolverPerdidaLocalizadaEstimadaDeLocal.ts`): Acqua System usa 1,80
(fila oficial N°5, procedencia `oficialFabricanteSimplificado`); cualquier
otro sistema conserva **exactamente** el valor de antes de este slice
(Tabla N°7, `teeEntradaCentralSalidasLaterales`=3,00 -- D-δ.40, sin
reabrir).

**Por qué 1,80 y no un promedio de las 8 configuraciones oficiales
(1,80/3,60/1,30/2,60/4,20/9,00/2,20/5,00):** la fila N°5 ("entrada por
extremo, salidas por continuación y ramal") es la configuración que
corresponde a una red distributiva -- exactamente el rol de una tee
estimada en HYD-EST (el caudal entra por la conducción principal y se
divide entre continuar la línea y derivar hacia el ramal). No es un
promedio ni una interpolación entre configuraciones que no describen ese
rol (p.ej. las de "convergencia", que asumen dos caudales entrantes -- no
existen en el modelo simplificado, donde el caudal siempre desciende desde
un único origen). Es la misma filosofía que ya regía el valor anterior
(3,00, Tabla N°7): una aproximación conservadora deliberada del modo
simplificado, no una reconstrucción de la geometría real.

**Locales, Montantes, Colector principal:** el catálogo (`teeEstimadaDistributiva`)
es un valor ÚNICO, listo para cualquier consumidor futuro. Hoy,
`resolverPerdidaLocalizadaEstimadaDeLocal.ts` (HYD-EST) es el único
consumidor real, y sólo estima tees a nivel **Local** -- esto no cambió en
este slice (arquitectura preexistente: la pérdida localizada estimada
nunca modeló Montantes ni Colector principal, sólo el Local+red del
terminal consultado). Las filas "Tee de derivación (Montante)"/"Tee de
distribución (Colector)" de `resolverAccesoriosConstructivosDreza.ts` son
estimaciones de **compra** (Materials), sin representación hidráulica
propia -- si un incremento futuro extiende HYD-EST para modelar pérdida
localizada de Montante/Colector, debe reusar esta MISMA entrada del
catálogo, nunca inventar un valor propio. Esto queda documentado como
alcance explícito, no como una limitación oculta.

## Reducciones: clasificación por salto de diámetro real

`clasificarSaltoDeReduccion(dnA, dnB)` (pura, simétrica) usa la serie
nominal comercial `[20, 25, 32, 40, 50, 63, 75, 90, 110, 125]` (la misma
que publica Acqua System Magnum PN20):

- salto de 1 posición → `inmediata` (K=0,55, fila oficial 2);
- salto de ≥2 posiciones → `mediata` (K=0,85, fila oficial 2a);
- mismo DN → `mismoDn` (K=0, no existe reducción -- resultado válido, no
  un dato faltante);
- DN no parseable o fuera de la serie → `pendiente` (nunca una
  clasificación arbitraria).

`resolverKsDeReduccion(sistemaDeTuberiaId, dnPropio, dnAguasArriba)`
aplica esta clasificación sólo bajo Acqua System; cualquier otro sistema
conserva el valor flat de Tabla N°7 (0,75), sin cambios.

**Modo Detallado:** `resolverPerdidaLocalizadaDeTramo.ts` recibe ahora un
`contextoReduccion` (DN propio del Tramo + DN del Tramo inmediatamente
aguas arriba en el mismo camino, CRIT-A30: la reducción se declara sobre
el lado menor). `acumularPerdidaLocalizadaDeCamino.ts` resuelve ambos DN
reutilizando la misma resolución comercial que ya hacía para la
velocidad -- ningún cálculo nuevo. Un `pendiente` de clasificación (sin
Tramo aguas arriba, o DN fuera de la serie) se propaga como Tramo no
resuelto (`motivo: 'reduccionNoClasificable'`), nunca como un `K`
inventado ni una suma parcial silenciosa.

**Modo Estimado (Tee + reducción):** `resolverPerdidaLocalizadaEstimadaDeLocal.ts`
detecta -- nunca releva -- un salto de diámetro real entre el Tramo
representativo del Local+red y su Tramo aguas arriba, sólo bajo Acqua
System. Si detecta una reducción clasificable (inmediata o mediata), suma
`K_reduccion` a `ksEquivalenteEstimado` como componente separado
(`nReduccionEstimada`/`ksReduccionEstimada`, expuestos en el resultado):

```text
K = K_tee_estimada + K_reducción
tee estimada + reducción inmediata: 1,80 + 0,55 = 2,35
tee estimada + reducción mediata:   1,80 + 0,85 = 2,65
```

Ambos componentes quedan trazables por separado (nunca un coeficiente
compuesto opaco). A diferencia del modo Detallado, la ausencia de un
Tramo aguas arriba o un DN no clasificable **no bloquea** el cálculo
estimado -- se computa como "sin evidencia de reducción" (`nReduccionEstimada=0`):
nadie declaró explícitamente una reducción en este modo, es una detección
automática opcional sobre datos que de todos modos ya están resueltos
para otro propósito (V_ref).

## Tee detallada: 8 configuraciones oficiales, catálogo preparado sin consumidor todavía

`configuracionesTeeDetalladaAcquaSystem.ts` modela las 8 filas oficiales
(N°5 a 8a) con su circulación real (entradas/salidas) y su par
normal/reducida:

| ID | Entradas | Salidas | Normal | Reducida |
|---|---|---|---:|---:|
| `distribucionDesdeExtremo` | extremo A | extremo B + ramal | 1,80 | 3,60 |
| `convergenciaHaciaExtremo` | extremo A + ramal | extremo B | 1,30 | 2,60 |
| `convergenciaHaciaRamal` | extremos A + B | ramal | 4,20 | 9,00 |
| `distribucionDesdeRamal` | ramal | extremos A + B | 2,20 | 5,00 |

**Sin consumidor de cálculo en este incremento, a propósito.** El dominio
actual sólo representa Tee real sobre `Nodo.tee` (`ConfiguracionDeTee`,
CRIT-A31) con 3 variantes fijas (`entradaCentral`/`salidaLateral`/
`entradaCentralSalidasLaterales`), siempre resueltas contra Tabla N°7 --
esto **no cambia** en este slice: una Tee real declarada por el usuario
sigue resolviéndose con Tabla N°7 aunque el sistema adoptado sea Acqua
System (`acumularPerdidaLocalizadaDeCamino.ts`, sin modificar). Migrar
silenciosamente esas 3 variantes a alguna de las 8 configuraciones Acqua
System exigiría inventar una correspondencia geométrica que el modelo
actual no puede determinar sin datos de orientación de flujo que
`ConfiguracionDeTee` no releva -- exactamente el tipo de invención que
este dominio rechaza sistemáticamente. La estructura queda lista para un
futuro selector del editor detallado que sí releve la circulación real de
cada tee.

## Correspondencias auditadas (geometría del modelo ↔ producto Acqua System)

| Geometría del modelo | R Acqua System | Verificado |
|---|---:|---|
| Unión normal termofusionada (`uniones`) | 0,25 | ítem 1 |
| Codo termofusionado a 90° (`codo90`) | 2,00 | ítem 3 |
| Codo termofusionado a 45° (`curva45`) | 0,60 | ítem 4 |
| `curva90` (Acqua no fabrica curva de radio distinto) | 2,00 | mismo producto que ítem 3 |

**Explícitamente NO equiparadas** (geometrías distintas, sin evidencia de
equivalencia física):

- `tuboSaliente` (ERAS: "salida de pared/piso sin cambio de dirección
  adicional") con el ítem 10 ("Tubo macho o tubo hembra", un adaptador
  roscado recto) -- conserva Tabla N°7 (`fallbackNormativoERAS`).
- Unión doble con unión normal, montura de derivación con tee, salida de
  tanque con tubo macho/hembra: ninguna de estas piezas está modelada
  como `IdAccesorioDeTramo` hoy, así que no hay nada que reasignar (fuera
  de alcance, sin cambios).

## Sobrepaso (sin cambios de valor, sólo de encuadre)

`K_sobrepaso = 1,20` se mantiene exactamente como HYD-OVERPASS-01 lo
adoptó: `equivalenciaDocumentada` (2 codos Acqua System a 45°, `2×0,60`),
**nunca** reclasificado como `oficialFabricante` -- el fabricante no
publica un coeficiente propio para "Sobrepaso fusión".

## Piezas sin R publicado por Acqua System (fallback conservado)

La tabla oficial revisada no declara valores específicos para: llave de
paso esférica, válvula esclusa, válvula de retención, válvula de pie,
unión doble, curva de radio amplio (como pieza distinta del codo), montura
de derivación, salida de tanque, cruz, cruz con sobrepaso, colectores,
accesorios de electrofusión. De éstas, sólo `llaveDePaso`, `valvulaEsclusa`
y `tuboSaliente` son `IdAccesorioDeTramo` reales en el dominio hoy --
conservan Tabla N°7, catalogadas explícitamente con procedencia
`fallbackNormativoERAS` (no un fallback silencioso por ausencia). El resto
no existen como accesorios declarables en este dominio -- no se agregó
soporte nuevo para ellas en este slice (fuera de alcance).

## Compatibilidad

- Proyectos existentes abren sin migraciones: `Tramo.accesorios` sigue
  persistiendo únicamente `{ tipo, cantidad }` (identidad + cantidad,
  nunca el `Ks` -- sin cambios de esquema en este slice).
- Cambiar `sistemaDeTuberiaId` (hierro ↔ Acqua System) recalcula
  automáticamente todos los `K` derivados en la próxima resolución (nada
  se cachea por sistema) -- verificado con test dedicado de ida y vuelta.
- IDs históricos (`curva45`, `curva90`, `codo90`, etc.) siguen siendo
  interpretables sin cambios; ningún id fue renombrado ni eliminado.

## Resultados antes/después (proyecto de referencia, "Vivienda unifamiliar de ejemplo")

**Caso representativo del informe (Baño 1 · UF 1 · AF), modo estimado + Acqua System:**

| Componente | Antes (HYD-OVERPASS-01) | Después (HYD-ACQUA-K-CATALOG-01) |
|---|---|---|
| Tees estimadas | 3 × 3,00 = 9,00 | 3 × 1,80 = 5,40 |
| Singularidad terminal | 1 × 1,35 | 1 × 1,35 (sin cambios) |
| Llave de paso | 1 × 9,18 | 1 × 9,18 (sin cambios) |
| Sobrepaso fusión | 1 × 1,20 | 1 × 1,20 (sin cambios) |
| Reducción detectada | -- (no existía) | 1 × 0,55 (inmediata, detectada) |
| **ΣK** | **20,73** | **17,68** |
| hf localizada (V_ref=1,7 m/s) | 3,059 m.c.a. | 2,609 m.c.a. |

**Margen del terminal crítico (proyecto canónico de la auditoría transversal):**

| | Valor |
|---|---|
| Antes de HYD-OVERPASS-01 | −19,437 m.c.a. |
| Después de HYD-OVERPASS-01 (Sobrepaso incorporado) | −20,047 m.c.a. |
| Después de HYD-ACQUA-K-CATALOG-01 (tee estimada 1,80 + reducción detectada) | −19,640 m.c.a. |

Sigue NO CUMPLE en los tres casos (el defecto de "Presión sobre acera" es
preexistente y ajeno a este slice). El ΣK bajó respecto de HYD-OVERPASS-01
pese a seguir sumando el Sobrepaso, porque la tee estimada oficial de
Acqua System (1,80) es menor que la aproximación conservadora de Tabla
N°7 (3,00) -- efecto esperado y explicado por accesorio, no una regresión.

**Listado de materiales:** cantidades sin cambios (88 u / 104 u, 11
sobrepasos base) -- este slice es exclusivamente hidráulico (catálogo de
K), no toca ninguna cantidad de compra.

## Decisiones diferidas / pendientes

- **8 configuraciones de Tee detallada:** catálogo completo, sin selector
  de UI ni consumidor de cálculo (Nodo.tee sigue usando Tabla N°7 siempre).
  Requiere, en un incremento futuro, relevar la orientación real de cada
  bifurcación para poder elegir entre las 4 configuraciones + variante
  normal/reducida.
- **Tee/Sobrepaso estimados de Montante y Colector principal:** el
  catálogo está listo (`teeEstimadaDistributiva`), pero HYD-EST no modela
  pérdida localizada para esos sectores (arquitectura preexistente, sin
  cambios). Si se extiende en el futuro, debe reusar esta misma entrada.
- **Piezas del fabricante sin `IdAccesorioDeTramo` correspondiente**
  (unión doble, válvula de retención/pie, curva de radio amplio, montura
  de derivación, salida de tanque, cruz, cruz con sobrepaso, colectores,
  accesorios de electrofusión): no se agregó soporte de dominio nuevo
  para ellas.

## QA

`tsc -b` limpio. `npm run build` limpio. Vitest: 2141/2141 (59 tests
nuevos: `tablaOficialAcquaSystem.test.ts`, `catalogoKAccesoriosAcquaSystem.test.ts`
(reescrito), `clasificarSaltoDeReduccion.test.ts`, `resolverKsDeReduccion.test.ts`,
`configuracionesTeeDetalladaAcquaSystem.test.ts`, más casos agregados a
`resolverKsDeAccesorioDeTramo.test.ts`, `resolverPerdidaLocalizadaDeTramo.test.ts`,
`acumularPerdidaLocalizadaDeCamino.test.ts`, `resolverPerdidaLocalizadaEstimadaDeLocal.test.ts`).
ESLint: 11/0, idéntico a la base. E2E dirigido (`materiales`, `hydEst`,
`m2-resp-polish`, `propagacion-a`) 13/13 contra build local. Informe
hidráulico y listado de materiales del proyecto de referencia generados y
verificados por extracción de texto real (`pdfjs-dist`): el texto público
del informe ya no hardcodea "Ks=3,00" (bug detectado y corregido durante
este slice, ver más abajo) y refleja el valor real por caso.

**Bug corregido durante este slice:** `generarDocumentoPdf.ts` tenía un
texto estático ("Criterio vigente por (Local, Red): tees estimadas =
máx(0, n−1) con Ks=3,00...") que hardcodeaba el valor de Tabla N°7 incluso
cuando el sistema adoptado era Acqua System y el `K` real de tee ya era
1,80 -- el texto describía un criterio distinto del que realmente se
aplicaba. Se corrigió para citar dinámicamente `caso.ksTee` (el valor
real ya resuelto por sistema), detectado por inspección manual del PDF
generado, no por ningún test automatizado (ningún test existente
comparaba el texto público contra el valor real del caso).

**Nota operativa sobre el harness E2E (no introducida por este slice):**
en este entorno, `IUAS_PREVIEW=1` (que deja a Playwright levantar su
propio `vite preview`) sirvió, en más de una corrida, un bundle
desactualizado pese a un build fresco en disco -- verificado comparando el
contenido servido (`curl`) contra el bundle en disco. Iniciar manualmente
`vite preview --port 4173 --strictPort --base /IUAS/` (con
`MSYS_NO_PATHCONV=1` en Git Bash, para que el argumento `/IUAS/` no se
reinterprete como ruta de Windows) y apuntar Playwright con
`IUAS_BASE_URL=http://localhost:4173/IUAS/` fue el método confiable usado
para toda la validación E2E y de generación de PDF de este slice. Mismo
quirk ya registrado en `docs/MATERIALS-ACCESSORIES-01.md`.
