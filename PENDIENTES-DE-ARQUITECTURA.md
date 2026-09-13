# Pendientes de arquitectura

Registro de decisiones de diseño postergadas a propósito, con la razón de
la postergación y la condición que debe cumplirse antes de resolverlas.

## D-δ.112 — HYD-EST-01 — EN IMPLEMENTACIÓN, checkpoint local

**Decisiones explícitas del usuario:** (1) camino que atraviesa una
derivación 1→N no modelada: hf localizada y presión incompletas, sin
fallback agregado; (2) una singularidad final K=1,35 por terminal, con la
velocidad de su propio alimentador, exclusiva de ese camino. Este segundo
punto sustituye expresamente la cardinalidad histórica de D-δ.45.

**Núcleo implementado:** `resolverPerdidaLocalizadaEstimadaDeCamino`
deriva contribuciones y reutiliza el contexto M2. Tee real 1→2 recorrida:
K=3,00 conservador de D-δ.40, velocidad saliente de CRIT-A31, sin elegir
recta/lateral. Llave local: K=9,18, entrada común exclusiva del Local/Red
identificable en la topología (prioridad al tramo representativo M2).
Final: K=1,35 y velocidad de su alimentador. No se persisten accesorios,
velocidades ni resultados; no se crean reductores ni nuevas conexiones.

**Integración:** presión usa el resultado por camino; Local/Red devuelve
una lista de caminos, nunca una hf escalar/Vref. La UI muestra cada camino
y el desglose K/V/hf, o una causa humana de incompletitud. La fila conserva
la distribuida por separado y remite a la localizada por recorrido, sin
elegir máximo/crítico arbitrario. Detalladas permanece en su rama anterior.

**Validación parcial:** baseline inicial 1784/1784. Bloque dirigido actual
88/88 (7 archivos) y TypeScript correctos. La corrida completa intermedia
tuvo 1776/1791: 15 fallos, incluyendo expectativas históricas incompatibles
con la incompletitud autorizada. Dos de esas expectativas ya se actualizaron
y pasan en el bloque dirigido; falta recerrar el baseline completo.

**Pendiente:** revisar dependencias nuevas del memo por UF (singularidades
aguas arriba pueden depender de otras UF); completar aislamiento AF/AC,
selección determinista del crítico, cobertura UI/E2E; actualizar baselines
con evidencia sin debilitar sus invariantes; gates Nivel A y deploy.
Ver `HANDOFF-CONTEXT.md`. No hubo push ni cierre de producción.

## La traza del motor no expresa multiplicidad (`EntradaDePaso` sin `cantidad`)

**Contrato afectado**: `EntradaDePaso` (`src/modelo/resultado/index.ts`),
compartido por todos los módulos, no solo por Demanda.

**Hallazgo**: la fórmula de Qmax es "Qmax = Σ (cantidad × qu)", pero
`EntradaDePaso` no tiene ningún campo que exprese la `cantidad` con la que
se multiplica cada `valor` unitario. El motor ya usa `cantidad`
internamente al calcular Qmax (`calcularSimultaneidad.ts`), pero esa
multiplicación no queda trazada en el `Paso` que expone. El contrato
actual no está mal ni produce resultados incorrectos; simplemente no
contiene información suficiente para reconstruir completamente la memoria
de cálculo en este caso particular: la sustitución numérica del paso Qmax
no puede reconstruirse fielmente cuando algún artefacto tiene
`cantidad > 1` (el proyecto de ejemplo actual no lo expone porque todas
sus cantidades son 1).

**Postergado a propósito**: se evaluó agregar un campo opcional
(`cantidad?: number`, nombre a confirmar) a `EntradaDePaso`, pero se
decidió no tocar el contrato todavía. Al ser un contrato compartido por
todos los módulos futuros, se prefiere que la extensión nazca respondiendo
a varios casos reales — al menos un segundo módulo implementado — en vez
de a las necesidades de Demanda en solitario.

**Condición de resolución**: al implementar el primer módulo adicional a
Demanda, revisar si presenta el mismo problema de trazabilidad de
multiplicidad. Si es así, diseñar y aplicar la extensión del contrato
considerando ambos casos reales.

**Mientras esta decisión permanezca pendiente**:

- No agregar excepciones en la interfaz para reconstruir artificialmente
  la sustitución numérica.
- No duplicar información fuera de la traza del motor.
- No extender el contrato de `EntradaDePaso` basándose únicamente en el
  caso del módulo Demanda.

## Ubicación conceptual del coeficiente de mayoración `a`

**Ubicación en ese momento**: `coeficienteA` vivía en
`Proyecto.parametros` (`src/modelo/proyecto/index.ts`) y se aplicaba de
forma global al cálculo de Demanda. (Superado: ver D-β.2/CRIT-A14 más
abajo — el modelo ahora persiste `tipoDeProyecto`, del cual se deriva
`aBase`.)

**Hallazgo**: durante el diseño conceptual del futuro Módulo 2 (Tuberías)
surgió una duda arquitectónica sobre la ubicación conceptual del
coeficiente de mayoración `a`.

Aparecen casos, por ejemplo ramales internos de viviendas frente a
montantes que alimentan múltiples unidades funcionales, en los que un
único valor global asociado al proyecto podría no representar
adecuadamente todos los cálculos.

No está determinado todavía si esto implica que el dato deba pertenecer:

- al proyecto;
- al tramo hidráulico;
- a un cálculo de demanda asociado a un subconjunto de consumos;
- o a otra estructura que surja del diseño real de los módulos futuros.

No afirmar todavía ninguna de estas alternativas como solución correcta.

**Postergado a propósito**: no se modifica todavía el modelo.

En ese momento, Módulo 1 trabajaba con un único `coeficienteA` global y
ese comportamiento debía mantenerse mientras no existiera el modelo real
de red/tramos del Módulo 2 — condición ya cumplida (ver D-β.2/CRIT-A14).

La ubicación definitiva del coeficiente no debe decidirse anticipadamente.
Se aplica la regla general de arquitectura adoptada en el proyecto:
no ampliar, duplicar ni reubicar contratos compartidos basándose únicamente
en hipótesis futuras; esperar a contar con casos reales adicionales que
permitan diseñar el modelo con evidencia suficiente.

**Condición de resolución**: al diseñar el Módulo 2 y su modelo de
red/tramos, revisar explícitamente si `coeficienteA` debe:

- permanecer global en `Proyecto`;
- trasladarse o asociarse al tramo hidráulico;
- pertenecer a un cálculo de demanda específico;
- asociarse al conjunto de consumos aguas abajo;
- o resolverse mediante otra estructura que surja de los casos reales.

No asumir de antemano cuál de estas alternativas será la correcta.

La decisión deberá basarse en los casos reales que aparezcan durante el
diseño del Módulo 2 y no en hipótesis anticipadas.

**Mientras esta decisión permanezca pendiente**:

- No mover `coeficienteA` fuera de `Proyecto`.
- No duplicar `coeficienteA` en nuevas estructuras.
- No agregar excepciones específicas para viviendas multifamiliares,
  consultorios, edificios mixtos u otros casos particulares.
- No cambiar la interfaz actual únicamente para anticipar un modelo futuro.
- Registrar los casos reales que aparezcan durante el diseño del Módulo 2
  y utilizarlos para resolver esta decisión.

### Resultado de la investigación D-α

La pregunta relevante ya no es simplemente "¿Dónde vive `a`?", sino "¿En
qué cálculos exige la Guía aplicar el modelo de simultaneidad de
§2.9.2?".

La investigación concluye, con confianza aproximada 0,78, que:

- `a` no tiene un ámbito independiente de `Kc`;
- forma parte inseparable del modelo `Qmax → Kc → K=a·Kc → Qc`;
- cuando la Guía invoca §2.9.2 completo, `a` entra necesariamente;
- existe evidencia fuerte de aplicación del modelo más allá del `Qc`
  global del proyecto, incluyendo: análisis de caudal por tramo
  (§2.10.2), dimensionamiento de cañerías (§2.12.1), agua caliente
  (§2.19.3 y §2.19.9), y capacidad de tanques (§2.11.2);
- el Capítulo 3 aporta evidencia adicional importante: aplica la misma
  tabla de tipologías y valores de `a` explícitamente al tramo en
  análisis;
- existe al menos una excepción explícita o muy fuerte: medidores
  individuales por unidad de vivienda bajo "simultaneidad total de los
  consumos" (§2.6);
- `Qcaux` y distribución interna siguen teniendo ambigüedad porque la
  remisión a §2.9.2 es indirecta.

### Consecuencia arquitectónica provisional

La investigación reduce la evidencia a favor de mover `a` fuera del
proyecto. La posición provisional más conservadora pasa a ser:

- `a` continúa anclado a la tipología del proyecto;
- cuando un cálculo invoca §2.9.2, usa ese `a` de proyecto;
- no se deriva `a` automáticamente del subconjunto local de artefactos;
- no se mueve todavía `coeficienteA` de `Proyecto.parametros`.

**La arquitectura no se modifica todavía.** D-β se desdobla en D-β.1 y
D-β.2 (ver abajo); D-γ sigue abierta. Siguen pendientes: edificios
mixtos, resolución de tipologías ambiguas, la contradicción de medidores
individuales, y el alcance preciso en `Qcaux` y distribución interna.

### D-β.1 — Dónde se registra conceptualmente `a` — CERRADO

La pregunta de dónde vive la clasificación base de `a` (a qué tipología
corresponde el proyecto y qué valor de `a` le corresponde por esa
tipología) queda cerrada: pertenece conceptualmente al Proyecto. El
resultado quedó formalizado como **CRIT-A12** en
`src/normativa/eras-2023/CRITERIOS.md`.

Esto **no** determina que ese mismo valor sea el `a` efectivo a aplicar
en cada subconjunto o tramo cuando se reaplique el modelo de §2.9.2 —
esa pregunta es D-β.2 y sigue abierta.

### D-β.2 — Qué `a` efectivo corresponde a cada invocación de §2.9.2 — CERRADO

**Decisión adoptada** (formalizada como **CRIT-A14** en
`src/normativa/eras-2023/CRITERIOS.md`):

```text
si tipología del Proyecto = vivienda multifamiliar:
    >1 UF residencial distinta aguas abajo → a efectivo = 2
     1 UF residencial aguas abajo          → a efectivo = 1

en cualquier otra tipología:
    a efectivo = a base del Proyecto (CRIT-A12)
```

La identidad relevante es la cantidad de `unidadFuncionalId` residenciales
distintas presentes en el conjunto efectivamente evaluado aguas abajo del
Tramo — no cantidad de Artefactos, no cantidad de Locales, no
diámetro/longitud/tamaño geométrico. La frontera es funcional:
distribución colectiva de varias viviendas vs. distribución exclusiva de
una vivienda. La lectura global (`a_efectivo = a_proyecto` sin excepción,
considerada y descartada) queda reemplazada por esta regla.

**Naturaleza de la decisión:**

- **Evidencia normativa**: ERAS reconoce expresamente `vivienda
  individual → a=1` y `vivienda multifamiliar → a=2`, y exige analizar
  el Qc de los distintos tramos de la instalación.
- **Ambigüedad normativa**: ERAS no especifica literalmente qué `a`
  corresponde a un tramo de un Proyecto multifamiliar cuando todo su
  conjunto aguas abajo pertenece a una única vivienda.
- **Decisión IUAS**: la transición `>1 UF → a=2` / `1 UF → a=1` es una
  interpretación/adopción IUAS para resolver esa ambigüedad —
  semánticamente consistente con las dos categorías residenciales
  publicadas, hidráulicamente coherente, determinística y auditable —,
  no texto literal de ERAS.

**No generaliza por valor numérico**: la excepción corresponde
semánticamente a `tipoDeProyecto = viviendaMultifamiliar`, no a
`aBase === 2`. `Oficinas públicas` y `centros educativos` comparten
numéricamente `a=2` pero no reciben esta excepción; tampoco se
identificó pareja normativa interna equivalente para `a=3`/`a=4`.

**`n=1`**: CRIT-A4 permanece por encima de esta decisión — `Qc = Qmax`
sin intervención de `Kc`/`a`/`K`.

**Antecedente histórico**: se mantiene únicamente como contexto
interpretativo no trazable desde el repositorio actual (sin fuente,
fórmula ni valores numéricos recuperables) — no se usó como fundamento
decisorio de este cierre.

**Problema de modelo descubierto (no reabre D-β.2) — RESUELTO**: al
cerrar D-β.2, el modelo de `Proyecto` no conservaba la tipología
normativa — solo persistía `coeficienteA: 1|2|3|4`, que no distinguía
vivienda multifamiliar de oficina pública o centro educativo (los tres
compartían `a=2`). Eso bloqueaba la implementación de la regla, aunque
no su cierre conceptual.

**Estado**: RESUELTO en el commit `bfda05bf8c3fc6008afa0b897f0df1bb553fceb7`
(`refactor: derivar coeficiente a desde tipologia de proyecto`).

**Solución aplicada**: `Proyecto.parametros.tipoDeProyecto` conserva
ahora la tipología normativa explícita (12 valores); `aBase` se deriva
de ella vía `obtenerCoeficienteABase` sobre la tabla normativa — una
única fuente de verdad, sin `coeficienteA` persistido.

**Estado resultante:**

```text
D-β.2 / CRIT-A14: CERRADO

Tipología semántica de Proyecto: IMPLEMENTADA
aBase derivado: IMPLEMENTADO

aEfectivo por tramo: PENDIENTE DE IMPLEMENTACIÓN
K / Qc por tramo: PENDIENTE

La implementación de aEfectivo ya no está bloqueada por el modelo.
```

### D-γ — Proyectos mixtos — ABIERTA

D-β.2 (CRIT-A14) ya resuelve el `a` efectivo para Proyectos de una sola
tipología dentro de su alcance, reduciendo la superficie de la
ambigüedad en tramos de tipología pura (tramo residencial puro, tramo
comercial puro, montante residencial pura, que quedan clasificados con
claridad). Esto **no resuelve** el caso de un nodo que agrega usos
distintos dentro del mismo Proyecto (residencial + comercial, por
ejemplo), que sigue sin regla ERAS. No se inventa regla de combinación
ni se adopta "máximo `a`" por defecto. D-γ permanece completamente
abierta.

## Nota normativa — corrección sobre Canilla de Servicio y presión disponible

Esta nota no es un pendiente de arquitectura: registra una corrección ya
resuelta, para que no se repita en trabajo futuro. Se incluye en este
archivo por falta de un lugar mejor bajo las restricciones vigentes (no
se crean criterios nuevos en `CRITERIOS.md` en este incremento, y no se
toca el catálogo todavía); si se acumulan más notas de este tipo,
conviene evaluar un documento dedicado en ese momento, no antes.

**Hallazgo corregido**: la Guía excluye expresamente, al determinar la
presión disponible hacia el artefacto más alto y alejado, a los
artefactos de uso poco frecuente, y pone como ejemplo la canilla de
servicio.

**Consecuencia**: queda invalidada la afirmación previa de que la
Canilla de Servicio podría considerarse normalmente el artefacto más
desfavorable para esa determinación.

**Esto NO invalida**:

- su existencia normativa;
- su presión mínima de 0,60 kg/cm²/bar según la tabla correspondiente;
- la incorporación provisoria de `qu = 0,20 l/s` por inferencia interna
  (`src/normativa/eras-2023/catalogo-artefactos/index.ts`).

**A evitar a futuro**: documentar que la Canilla de Servicio será
"frecuentemente el artefacto más desfavorable" para la determinación de
presión disponible.

No se toca el catálogo ni el código de la Canilla de Servicio en este
incremento.

## Error dimensional en la fórmula de sección de escurrimiento (§2.12.1) — CERRADO por P1

**Hallazgo original**: la fórmula impresa para `Ae` en §2.12.1 presenta
un error dimensional (factor 100). Con `Qc` en l/s y `Ve` en m/s, la
sección correcta en cm² debería ser `Ae = 10 · Qc / Ve`; la fórmula
impresa produce un valor 100 veces menor.

**Estado**: cerrado. La investigación normativa P1 confirmó el factor
correcto y satisface la condición de resolución que este pendiente
exigía. El resultado quedó formalizado como **CRIT-A10** en
`src/normativa/eras-2023/CRITERIOS.md`. Ya no es un bloqueo conceptual
abierto para Módulo 2.

**Resultado de P1**:

- la fórmula impresa en §2.12.1 tiene un error de factor 100 en la
  sección resultante;
- la relación dimensionalmente correcta para las unidades declaradas
  por la propia Guía (Qc en l/s, Ve en m/s, Ae en cm²) es
  `Ae = 10 · Qc / Ve`;
- la Tabla N°9 de la propia Guía constituye evidencia interna
  convergente: aplica correctamente `V = Q/A`, y `Ae = 10 · Q/V`
  recupera el área geométrica de la tabla (20 celdas verificadas) dentro
  del margen de redondeo;
- no se encontró fe de erratas ni versión oficial corregida;
- clasificación: errata / factor incorrecto altamente probable.

**Condición de resolución (cumplida)**: la futura implementación del
Módulo 2 debe usar la expresión corregida (`Ae = 10 · Qc / Ve`, ver
CRIT-A10) y declarar explícitamente, en la memoria de cálculo, la
divergencia frente a la fórmula impresa en §2.12.1.

## Contradicción entre Qunit (Fig. 2.8 e) y simultaneidad total para medidores individuales (§2.6)

**Hallazgo**: Fig. 2.8 e) remite a §2.9 y siguientes para `Qunit`, pero
§2.6 exige "simultaneidad total de los consumos" para medidores
individuales por unidad de vivienda. Ambas indicaciones no son
claramente compatibles.

**Evidencia literal (confirmada en D-δ.53 contra el texto oficial)**:
§2.12.1 Secuencias de Cálculo, punto e): *"Dimensionado del medidor
individual: determinar Qunit de cada unidad considerando todos los
artefactos que la integran de acuerdo a lo citado en 2.9 y siguientes."*
§2.6: *"El dimensionamiento de los medidores individuales por unidad de
vivienda se realizará bajo el criterio de simultaneidad total de los
consumos"*. "Simultaneidad total" = `K = 1` (suma sin coeficiente);
"2.9 y siguientes" = pipeline `Qmax → Kc → K → Qc` con `K < 1`. Dan
números distintos.

**Estado**: RESUELTA para el dimensionamiento del medidor individual —
**decisión roja 2 de M3, cerrada** por el usuario (ver D-δ.53). Se adopta
la prescripción específica de §2.6: `Qunit = Σ (cantidad · qu efectivo)`
con `K = 1` (simultaneidad total), sin `Kc`/`K`/`a`, tanto para la
selección por Tabla N°6 como para el `Qcl` de la fórmula (6). La remisión
de §2.12.1.e a §2.9 y siguientes se documenta como contradicción interna
de la Guía; prevalece §2.6 por ser la regla dedicada del objeto.
Formalizado como **CRIT-A33** en `CRITERIOS.md`; implementado en
`motor/medidores/seleccionarMedidorIndividual.ts` (M3-B2a). Lo que sigue
**abierto** no es esta contradicción sino la derivación
`topología → conjunto de consumos por medidor` y la cardinalidad/ubicación
de medidores individuales (M3-B2b).

## Encabezados de Tabla N°9 inconsistentes con su comportamiento numérico

**Origen**: hallazgo colateral de la investigación P1 (sección de
escurrimiento `Ae`, §2.12.1). No fue el objeto de esa investigación y
**no se usó como fundamento de CRIT-A10**; CRIT-A10 se sostiene
únicamente en la verificación dimensional y en las 20 celdas de Tabla
N°9 que sí fueron confirmadas.

**Hallazgo**: los encabezados impresos de Tabla N°9 muestran los
valores `0,03` / `0,04`, pero el comportamiento numérico observado en la
tabla es compatible con `0,032` / `0,038`.

**Estado**: NO resuelto. Pendiente de doble transcripción y
verificación independiente antes de tomarse como hallazgo confirmado.

**Relevancia**: puede afectar el uso futuro de tablas normativas en el
Módulo 2 (Tuberías), que probablemente dependa de otras tablas de la
misma Guía con el mismo formato de encabezado.

**Condición de resolución**: verificar por doble transcripción
independiente el valor real de los encabezados de Tabla N°9 antes de
que el Módulo 2 dependa de tablas con formato equivalente.

## Nota arquitectónica — "Local" y "área sanitaria" (Secuencias f)

Esta nota no es un pendiente ni un criterio normativo: registra una
observación terminológica para que no se pierda de cara al diseño del
Módulo 2.

**Hallazgo**: las Secuencias f) de ERAS hablan de "caudales de consumo a
cada área sanitaria". El nivel `Local` del modelo actual (`modelo/`) es
terminológicamente compatible con esa noción de "área sanitaria".

**Esto NO implica** que el cálculo hidráulico del Módulo 2 deba
detenerse necesariamente en `Local`: un tramo real puede alimentar más
de un `Local`, o solo una fracción de la red interna de un `Local`. No
se introduce ninguna restricción topológica a partir de esta nota.

No se convierte en criterio de `CRITERIOS.md`: es una aclaración
arquitectónica de vocabulario, no una interpretación normativa que fije
un procedimiento de cálculo.

## Deuda documental — documentos ADR no materializados en el HEAD

**Hallazgo**: existen referencias a decisiones de arquitectura numeradas
como ADR (`ADR-003`, `ADR-005`, `ADR-007`, `ADR-011`, `ADR-012`,
`ADR-014`) como comentarios sueltos en el código (`tsconfig.*.json`,
`src/modelo/resultado/index.ts`,
`src/motor/demanda/simultaneidad/calcularCoeficienteDeSimultaneidad.ts`,
`src/exportadores/pdf/*`). `docs/adr/` no contiene ningún documento ADR
real, solo un `.gitkeep`. **No existe ninguna referencia verificable a
`ADR-009` ni a `ADR-013` en ningún archivo del repo.**

**Consecuencia**: no puede confirmarse desde el HEAD actual el contenido
de ninguna decisión citada como `ADR-009` o `ADR-013`. No debe
inferirse ni darse por supuesto su contenido a partir de la numeración,
ni a partir de investigaciones externas que las den por conocidas.

**Condición de resolución**: antes de formalizar la arquitectura del
Módulo 2, evaluar si corresponde recuperar o reconstruir —únicamente a
partir de evidencia verificable en el repo (comentarios existentes,
historial de git, código real)— las decisiones que sí tienen referencia
concreta (`ADR-003`, `005`, `007`, `011`, `012`, `014`). Las que no
tienen ninguna referencia verificable (`009`, `013`) no se reconstruyen
por conjetura; si llegan a necesitarse, se redactan como decisiones
nuevas en el momento en que corresponda, no como recuperación de algo
preexistente.

## Interacción no resuelta entre CRIT-A8 y computabilidad (`origen`) en Módulo 1

**Hallazgo verificado** (reproducido contra `calcularSimultaneidad.ts`, sin
modificarlo): CRIT-A8 se evalúa sobre `local.artefactos` completo, sin
distinguir `origen`; el filtro `origen === 'normativo'` se aplica recién
después, sobre el resultado de CRIT-A8:

```text
todos los Artefactos del Local → CRIT-A8 → filtro origen === 'normativo' → n / Qmax
```

**Caso reproducido**: Local domiciliario con inodoro de válvula automática
`origen: 'usuario'` + lavatorio `origen: 'normativo'`. CRIT-A8 deja solo la
válvula como participante; el filtro de `origen` la elimina por no ser
normativa; el conjunto queda vacío → `n = 0` → excepción. La validación
global `proyectoSinArtefactosComputables` no detecta el caso: cuenta
artefactos normativos de todo el proyecto (encuentra el lavatorio) sin
simular esta interacción por Local.

**No se adopta todavía ninguna corrección ni cambio de orden.** Se registra
una incompatibilidad no resuelta entre la noción de artefacto computable
(`origen === 'normativo'`) y el universo que observa CRIT-A8 al decidir
participación.

**Pregunta pendiente**: ¿un artefacto no computable puede activar CRIT-A8 y
modificar la participación de artefactos computables del mismo Local?

**Conclusión de la investigación histórica**: `origen: 'usuario'` apareció
en `6aff06d` sin semántica documentada, nunca fue producido por la UI,
migraciones ni importadores, y nunca fue ejercitado por ningún test
histórico. Hoy es un estado reservado/no operativo: todo Artefacto que la
aplicación crea es `origen: 'normativo'`. No se modificará validación ni
motor únicamente para acomodar este estado hipotético; su semántica
deberá definirse explícitamente si alguna funcionalidad futura empieza a
producirlo.

**Estado**: cerrado para el alcance actual / diferido hasta que
`origen: 'usuario'` tenga semántica y consumidor real. No se afirma que
las alternativas B o C evaluadas sean correctas, ni que el orden actual
`CRIT-A8 → origen` sería normativamente correcto si `origen: 'usuario'`
se volviera operativo — ambas preguntas quedan abiertas para cuando exista
un caso real. Este cierre elimina `origen:'usuario'` como bloqueante
actual, pero NO resuelve D-δ.16 (universo de CRIT-A8 sobre subconjuntos
parciales de un Local); Slice 5 sigue pospuesto exclusivamente por
D-δ.16, no por la semántica de `origen`.

## D-δ — Topología hidráulica, estados de demanda AF/AC y producción ACS

Esta sección registra conclusiones de un análisis conceptual previo al
modelado real de `Nodo`/`Tramo` en Módulo 2. Nada de lo aquí descripto
está implementado. Cada punto distingue explícitamente su naturaleza:
evidencia normativa, principio físico, decisión arquitectónica, o
hipótesis de diseño.

### D-δ.1 — Topología hidráulica preferida (decisión arquitectónica)

Base suficientemente madura para el diseño de Módulo 2: todo `Tramo`
hidráulico conecta `Nodo → Tramo → Nodo`; `Nodo` y `Tramo` son conceptos
específicos del dominio hidráulico, no un grafo genérico de propósito
general. La jerarquía funcional `Proyecto → UnidadFuncional → Local →
Artefacto` se conserva sin cambios. Pertenencia funcional (jerarquía) y
conectividad hidráulica (red) son relaciones ortogonales: una responde
"¿de qué parte del proyecto es esto?"; la otra, "¿cómo llega el agua
hasta acá?".

### D-δ.2 — Una sola topología física (decisión arquitectónica)

AF y AC comparten el mismo modelo conceptual de red. No se crean
topologías distintas para mezcla, 100% AF o 100% AC. La topología
permanece fija; lo que varía es la condición de demanda evaluada sobre
ella (D-δ.9).

### D-δ.3 — Artefacto mixto sin duplicación (decisión arquitectónica)

Un artefacto mixto (por ejemplo, una ducha con conexión AF y AC) existe
una única vez en el modelo funcional, dentro de su `Local`. Puede ser
referenciado por un nodo terminal AF y por un nodo terminal AC, ambos
apuntando al mismo `Artefacto` por id. No se crean entidades
funcionales duplicadas del tipo "DuchaAF"/"DuchaAC".

### D-δ.4 — `quTotal` vs. magnitudes derivadas (decisión arquitectónica)

`quTotal` (dato de catálogo) es el consumo unitario estable de un
artefacto. Debe distinguirse de las magnitudes derivadas de cálculo
`qu_AF,térmico`, `qu_AC,térmico`, `qu_AF,potencial`, `qu_AC,potencial`,
que dependen de la condición de demanda evaluada (D-δ.9) y no son
atributos persistentes del `Artefacto`.

### D-δ.5 — Procedencia de `quFria_lps`/`quCaliente_lps` (evidencia normativa + pendiente)

Evidencia normativa (investigación P4): ERAS §2.9.1.2 publica
literalmente columnas `qu Total`, `qu (A. Fría)` y `qu (A. Cal.)`. La
procedencia normativa de estas columnas queda, por tanto,
**confirmada** — no debe documentarse como desconocida.

Queda **abierto**: el significado físico definitivo del reparto 40/60
(la ecuación de mezcla impresa por ERAS presenta una inconsistencia
editorial: la expresión rotulada "% A. Fría" calcula físicamente la
fracción caliente); si los encabezados de columna arrastran o no esa
misma inversión; y el uso de estos valores como `qu` térmico definitivo
en IUAS. ERAS permite expresamente recalcular el reparto para otras
temperaturas mediante una ecuación de mezcla. No se adopta ninguna
corrección del 40/60 en este incremento.

### D-δ.6 — Conservación de masa en ACS (principio físico)

`Q_entrada_equipo_ACS ≈ Q_salida_AC`, despreciando diferencias
volumétricas por densidad. El equipo agrega energía y puede modificar
presión/temperatura, pero no crea ni destruye agua; no tiene `qu`
propio.

### D-δ.7 — Producción ACS como punto de paso (decisión arquitectónica)

`AF → producción ACS → AC` es continuidad hidráulica: el equipo no es
un terminal de consumo y no corta el recorrido topológico; es un punto
de paso/transformación. El tipo de producción (calentador
instantáneo/calefón, termotanque/acumulación, sistema central, u otro)
podrá cambiar sin alterar necesariamente la conectividad de la red. No
se diseñan aquí enumeraciones ni estructuras concretas — son solo
ejemplos ilustrativos de tipos futuros.

### D-δ.8 — Identidad del consumo y prohibición de doble conteo (decisión arquitectónica)

Un mismo artefacto puede propagarse por caminos hidráulicos distintos
según la condición de demanda, pero su identidad debe conservarse: en
100% AF, AF directa = `quTotal` y AF hacia ACS = 0; en mezcla, AF
directa + AF hacia ACS ≈ `quTotal`; en 100% AC, AF directa = 0 y AF
hacia ACS ≈ `quTotal`. En el tramo común aguas arriba, el mismo
artefacto participa **una sola vez** — nunca `quTotal` por AF directa
más `quTotal` por alimentación a ACS para el mismo consumo bajo la
misma condición. La identidad del participante debe sobrevivir al
recorrido topológico para impedir el doble conteo al reencontrarse
caminos aguas arriba.

### D-δ.9 — Condición de demanda (decisión arquitectónica)

Sin crear infraestructura genérica de escenarios: `Topología +
condición de demanda + red/tramo evaluado → participantes aguas abajo →
qu efectivo por participante → simultaneidad → Qc`. La condición de
demanda determina qué participantes actúan y qué `qu` efectivo aporta
cada uno; la topología no cambia.

### D-δ.10 — Reutilización del pipeline de simultaneidad (decisión arquitectónica)

El pipeline conceptual existente `n → Qmax → Kc → K → Qc` puede
reutilizarse para distintas condiciones de demanda, cambiando
únicamente el conjunto de participantes y el `qu` efectivo. Esto no
cierra D-β.2 (`a` efectivo, ver más arriba en este documento) ni el
ámbito futuro de `K > 1` en tramos (CRIT-A2) — ambas deudas permanecen
exactamente como están registradas.

### D-δ.11 — Estrategia preferida AF/AC (hipótesis de diseño)

No como criterio numérico cerrado: dimensionamiento base con un
`Qc_térmico` bajo una condición térmica/operativa; verificación de
capacidad evaluando 100% AF y 100% AC, manteniendo siempre simultaneidad
en tramos compartidos. Nunca `ΣquTotal` sin simultaneidad.

### D-δ.12 — Montantes AC (hipótesis de diseño)

No se considera suficiente dimensionar una montante AC únicamente con
la fracción térmica, ni se adopta suma instalada sin simultaneidad.
Estrategia preferida: `Qc_térmico` para el dimensionamiento base, y
`Qc_capacidad_AC` (con `quTotal` de los artefactos conectados a AC,
aplicando simultaneidad) como verificación hidráulica posterior. No se
define aquí qué verificaciones exactas serán obligatorias.

### D-δ.13 — Alimentación AF al sistema ACS (principio físico + decisión arquitectónica)

Por conservación de masa (D-δ.6), el tramo AF que alimenta la
producción ACS refleja la demanda de la red AC servida:
`Qc_AF_hacia_ACS ≈ Qc_AC_servida` para la misma condición de demanda. El
equipo no tiene `qu` propio. No deben calcularse dos `Qc` parciales por
separado y sumarlos: CRIT-A5 sigue aplicando en su totalidad, y aguas
arriba debe calcularse una única simultaneidad sobre el conjunto
correcto de participantes.

### D-δ.14 — Pipeline comercial preferido (hipótesis de diseño)

Estrategia conceptual preferida, sin valores cerrados: `Qc_térmico →
velocidad adoptada → Ae → diámetro teórico → diámetro comercial →
recálculo → Qc_capacidad → verificación → si falla, siguiente producto
comercial`. La selección del siguiente producto comercial es una
búsqueda discreta y determinística, no una iteración numérica continua.

### D-δ.15 — Explícitamente abierto, no resuelto en este incremento

- `Ve_objetivo` (incluyendo el candidato 2,0 m/s, no adoptado);
- `T_AF`, `T_ACS`, `T_uso` y sus valores por defecto;
- fórmula exacta que usará IUAS para el reparto térmico;
- interpretación definitiva del reparto 40/60 (D-δ.5);
- D-β.2 (`a` efectivo) y el ámbito futuro de `K > 1` en tramos;
- `Qcaux`;
- `Qunit`/`Qcunit`;
- punto físico exacto de `Pmin`;
- pérdida hidráulica propia del calefón/termotanque;
- composición normativa de `Pmin` del calentador con `Pmin` del
  terminal;
- obligatoriedad de verificar velocidad mínima fuera del estado de
  diseño;
- obligatoriedad de verificar presión en condiciones de capacidad
  (100%);
- recirculación de ACS;
- catálogo de equipos ACS;
- catálogo comercial definitivo de tuberías.

Ninguno de estos puntos se convierte en criterio de `CRITERIOS.md` en
este incremento.

### D-δ.16 — Universo de CRIT-A8 sobre subconjuntos de Módulo 2 (CERRADO)

**Decisión adoptada**: para el cálculo de un Tramo, CRIT-A8 opera
únicamente sobre los Artefactos computables aguas abajo de ese Tramo. Si
el conjunto contiene Artefactos pertenecientes a distintos Locales, la
regla se evalúa independientemente dentro de cada Local. No se consultan
Artefactos del Local que no pertenezcan al conjunto evaluado para activar
CRIT-A8.

**Fundamentos**: (1) CRIT-A11 ya fija como universo del cálculo del tramo
los consumos computables aguas abajo; (2) introducir consumos fuera de
ese universo solo para activar CRIT-A8 sería inconsistente con CRIT-A11;
(3) consultar el Local completo puede producir demanda cero en una
cañería que sí alimenta consumos reales; (4) cuando el conjunto evaluado
coincide con el Local completo, el criterio se reduce al comportamiento
actual de Módulo 1.

**Naturaleza**: inferencia/adopción IUAS fuertemente sustentada, no una
frase literal de ERAS — mismo estatus epistémico que CRIT-A11. Formalizada
como **CRIT-A13** en `src/normativa/eras-2023/CRITERIOS.md`.

**Precisión de identidad**: al agrupar por Local, la identidad relevante
es `unidadFuncionalId + localId`, nunca `localId` solo — los ids de Local
no son globalmente únicos (dos Locales de UF distintas pueden compartir
`localId`, p. ej. `UF 1 / local-bano` y `UF 2 / local-bano`), y CRIT-A8
nunca debe mezclarlos. No se diseña aquí la implementación concreta
(estructura de agrupación, claves, helper).

Ya no bloquea la etapa de participación contextual del pipeline de
tuberías (ver D-δ.18).

### D-δ.17 — Local simple como unidad hidráulica de distribución (dirección arquitectónica preferida, no cerrada)

**Dirección preferida, no implementada ni cerrada**: para Locales simples
no debería exigirse representar la ramificación hidráulica interna exacta
cuando no modifica la solución constructiva.

```text
alimentación al Local → demanda del Local → sección uniforme interna → verificación de presión de sus artefactos
```

Locales complejos o extensos (baterías numerosas de duchas, gimnasios,
vestuarios, sanitarios públicos grandes) podrían justificar topología
interna explícita.

No se cierra ningún umbral numérico de artefactos, definición formal de
Local simple/complejo, `ReferenciaDeLocal`, `UnidadDeDimensionamiento`,
reglas de diámetro ni geometría interna.

**Relación con D-δ.16 (cerrado)**: con un Local simple, el conjunto
aguas abajo del tramo coincide con el Local completo, así que CRIT-A8 lo
verá entero sin necesitar ninguna excepción. Con un Local complejo, CRIT-A8
opera correctamente sobre cada subconjunto aguas abajo. D-δ.17 reduce la
frecuencia del caso parcial pero no era necesaria para resolver D-δ.16.

### D-δ.18 — Estado del pipeline de participación en tuberías (Slice 5)

Slice 4 cerró la computabilidad intrínseca (`origen === 'normativo'`),
sin aplicar CRIT-A8. D-δ.16 ya no bloquea Slice 5: el próximo incremento
funcional puede implementar la etapa de participación contextual (CRIT-A8)
sobre el conjunto recibido, agrupando por Local según D-δ.16. No se
define todavía API detallada.

### D-δ.19 — Consecuencia de CRIT-A15 sobre Golden 1/2/3 de Módulo 2 (pendiente, no resuelto en este incremento)

CRIT-A15 (`CRITERIOS.md`) formaliza que `redHidraulica` es la
representación física autoritativa de las conexiones existentes en el
Proyecto: la ausencia de un terminal AC (o AF) para un Artefacto
significa que esa conexión no existe, no que todavía no fue modelada.

Los tres golden existentes de `resolverHidraulicaDeTramo.golden.test.ts`
fueron escritos, antes de esta decisión, interpretando redes mínimas
(sin ningún nodo `produccionACS`) como topologías parciales, y esperan
por eso `quFria_lps`/`quCaliente_lps` en vez de `quTotal_lps` para
artefactos con una sola conexión física en esa red:

- **Golden 1** — un lavatorio con una única conexión AF (`quFria_lps
  =0.08`, `quCaliente_lps=0.12`, `quTotal_lps=0.20`): bajo CRIT-A15, esa
  conexión representa AF-only real → `Qc` debería ser `0.20`, no `0.08`.
- **Golden 2** — dos lavatorios, cada uno AF-only por el mismo motivo:
  `Qmax` debería ser `2×0.20=0.40`, no `2×0.08=0.16`. La simultaneidad
  resultante (`Kc`/`K`/`Qc`) no se recalcula en este documento — queda
  para el incremento de tests que revise estos goldens.
- **Golden 3** — un lavatorio conectado solo por AC (sin twin AF en esa
  red aislada) junto a un inodoro de válvula (`quAC=0`, CRIT-A7). Una
  lectura literal de CRIT-A15 implicaría `qu efectivo = quTotal = 0.20`
  para el lavatorio, en vez de `quCaliente_lps=0.12`. Pero antes de
  tocar este golden hace falta resolver una ambigüedad de intención, sin
  resolver todavía: no está determinado si esa red mínima pretendía
  representar una conexión física AC-only real, o si solo aislaba
  deliberadamente el comportamiento de CRIT-A13/CRIT-A8 sin intención de
  representar conectividad física completa.

Este documento **no autoriza a modificar los tests todavía**. La
revisión de Golden 1/2/3 y la implementación de CRIT-A15 en
`resolverQuEfectivoParaTramo` (o la capa que corresponda) quedan como
incremento funcional futuro, explícitamente separado de este cierre
conceptual/documental.

### D-δ.20 — Topología hidráulica interna ≠ tabla de dimensionamiento de Módulo 2 (dirección preferida, no cerrada)

La `redHidraulica` conserva nodos y tramos terminales hasta cada
Artefacto porque el motor los necesita para: determinar conectividad
física (CRIT-A15), resolver condición AF/AC/total (CRIT-A13),
identificar participantes y calcular Qc. Esa granularidad es una
necesidad de cálculo, no una obligación de presentación.

La tabla principal de Módulo 2 en la interfaz no tiene por qué mostrar
cada tramo terminal individual: puede, y en la dirección preferida
debe, agregar los tramos terminales de un mismo Local/red en una única
fila de presentación, siempre que el Qc/aEfectivo mostrados sigan
proviniendo íntegramente del motor real sobre la topología completa —
nunca recalculados ni aproximados en la capa de presentación.

No se define en este incremento la regla exacta de agregación (qué
tramos se consideran "del mismo Local/red" a efectos de una fila), ni
se implementa ningún cambio de UI. Ver D-δ.21 para la dirección
preferida de presentación, y D-δ.17 para la noción de "Local simple"
todavía pendiente de cierre.

### D-δ.21 — Presentación futura de Módulo 2: tablas por Unidad Funcional y distribución general (dirección preferida, no cerrada)

Dirección de presentación preferida para incrementos futuros de UI, sin
cerrar todavía ninguna implementación:

- **Una tabla por Unidad Funcional**, no una única tabla global de
  Tramos. Columnas: `Local | Red | Artefactos | Qc [l/s] | a efectivo |
  Di mínimo [mm]`.
- **Numeración de Locales dentro de cada UF por tipo** (`Baño 1`,
  `Baño 2`, `Cocina 1`, `Toilette 1`, ...), derivada en cada render —
  mismo criterio ya usado para las etiquetas de Local en Módulo 1
  (`etiquetasDeLocales` en `MotorDemandaPantalla.tsx`), sin agregar
  todavía ningún ordinal/nombre persistente al modelo.
- **Una fila por Local simple y red** (máximo una fila AF y una fila AC
  por Local), aunque internamente existan ramales terminales hacia cada
  Artefacto — ver D-δ.20. Queda **pendiente** definir el criterio exacto
  de qué Local puede tratarse como "simple" a efectos de esta fila única
  y de diámetro constante; no se resuelve en este incremento (mismo
  pendiente ya abierto en D-δ.17).
- **Columna `Artefactos`**: cantidad de Artefactos hidráulicamente
  atendidos por esa fila (Local+red). No se define todavía cómo obtener
  ese número (agregación de los tramos terminales agrupados, conteo de
  participantes hidráulicamente activos, u otra fuente).
- **Tabla separada de "Distribución general"**, independiente de las
  tablas por UF/Local: colectores, montantes y alimentaciones generales
  (incluida la alimentación a producción ACS) no se mezclan con las
  filas de Locales. Mismas columnas que las tablas por UF. Ninguna fila
  de esta tabla se implementa todavía.

Ninguno de estos puntos se convierte en criterio de `CRITERIOS.md` en
este incremento: son decisiones de presentación de UI, no
interpretación normativa. Quedan registradas acá para que el próximo
incremento de UI de Módulo 2 no las redescubra desde cero.

### D-δ.22 — Longitud física de Tramo, independiente de Δz (decisión arquitectónica)

La longitud física real de la tubería pertenece a `Tramo` (`longitud_m`),
no se deriva de `Nodo.cota_m` ni de la diferencia de cota (Δz) entre sus
dos nodos. Es un dato explícito, opcional a propósito mientras las
topologías actuales no tengan geometría real (mismo criterio que
`cota_m`; ver `CRITERIOS.md` CRIT-A20 para la invariante que los
relaciona).

Modelo B (frente al Modelo A descartado de `|Δz| + desplazamiento
horizontal`): `longitud_m` representa el recorrido real instalado o
previsto de la conducción -- vertical, horizontal, diagonal, o con
desvíos/codos -- sin que ninguna aritmética geométrica (suma con Δz,
Pitágoras, u otra) intente reconstruirlo a partir de las cotas. Un
mismo par de Nodos con la misma diferencia de cota puede admitir
distintas `longitud_m` según cuál sea el recorrido real instalado; el
modelo no fuerza ninguna relación salvo la cota mínima físicamente
posible (CRIT-A20).

`longitud_m` **no incluye** longitud equivalente de accesorios (codos,
tees, válvulas, `Ks`) ni ninguna otra forma de pérdida localizada: es
exclusivamente longitud física de tubería recta/curva instalada. Las
pérdidas localizadas quedan como concepto aparte, sin resolver en este
incremento.

No se anticipa aquí ningún modelo de montante, segmentación,
denominación de Tramo ni asignación de Unidad Funcional -- esos
conceptos, cuando se diseñen, deberán apoyarse en `longitud_m`/`cota_m`
tal como quedan definidos acá, pero no se cierran en este punto.

### D-δ.23 — Una montante es una cadena de Tramos reales; cada segmento resuelve su propio Qc (validado por test)

Una montante se representa exclusivamente como una cadena de Nodos y
Tramos hidráulicos reales dentro de `RedHidraulica` -- no existe ni se
introduce ninguna entidad `Montante` en el modelo. La cadena se segmenta
en cada punto de derivación (cada nivel donde una Unidad Funcional u
otra rama se desprende del tronco principal): cada segmento resultante
es un `Tramo` independiente, con su propio conjunto de artefactos aguas
abajo (`obtenerArtefactosAguasAbajo`), y por lo tanto su propio `Qc`,
resuelto por el pipeline normal (computabilidad → condición hidráulica →
participación → simultaneidad → Qc) sin ninguna lógica especial para
"tramos de montante".

**Nunca se obtiene el `Qc` de un segmento sumando los `Qc` ya calculados
de las UF/ramas que derivan de él** -- eso violaría CRIT-A5/D-δ.13, y
matemáticamente da un resultado distinto (mayor) al de recalcular
simultaneidad sobre el conjunto real, porque la simultaneidad no es
lineal en `n`.

**Validado productivamente** por "Golden 4 — montante segmentada"
(`resolverHidraulicaDeTramo.golden.test.ts`): una cadena de 3 niveles
(cotas 0/3/6/9, `longitud_m=3` por segmento) con una UF derivando en
cada nivel. El motor existente (`obtenerArtefactosAguasAbajo`,
`resolverHidraulicaDeTramo`) resolvió los tres segmentos correctamente
**sin ningún cambio de código productivo** -- el DFS y el pipeline de
Qc ya eran suficientemente generales. `cota_m`/`longitud_m` no participan
en ningún cálculo de `Qc`: conviven en el mismo fixture únicamente para
confirmar que la geometría (D-δ.22/CRIT-A20) no interfiere con la
topología de demanda.

No se cierra aquí: identificación estructural de "Tramo de montante"
para presentación de UI, denominación amigable, asignación de UF vía
interfaz, accesorios por derivación, ni AF/AC agrupadas bajo un mismo
concepto visual de montante.

### D-δ.25 — Orquestador productivo de pérdida distribuida por Tramo (N3)

`resolverPerdidaDistribuidaDeTramo` (`motor/tuberias/`) es el resolver
de más alto nivel del pipeline de Módulo 2 hasta ahora: compone, sin
reimplementar ni recalcular ninguna fórmula, las capas ya cerradas
(`resolverDiametroComercialDeTramo` → `resolverParametroDePerdidaDistribuida`
→, solo en Darcy, `resolverPropiedadesAguaParaRed`). Las fórmulas en sí
(CRIT-A17/CRIT-A18/CRIT-A21) no se duplican aquí -- viven exclusivamente
en `CRITERIOS.md` y en sus primitivas.

**Alternativa de composición elegida:** el nuevo resolver llama
internamente a `resolverDiametroComercialDeTramo` (Alternativa A) en vez
de recibir su resultado ya calculado por parámetro. Mismo patrón que
`resolverDiametroComercialDeTramo` ya estableció sobre
`resolverHidraulicaDeTramo`: evita que un llamador pueda pasar, por
error, el resultado comercial de un Tramo distinto al `Proyecto`/`tramoId`
evaluado.

**`qc_lps`/`diReferenciaPredimensionamiento_mm` dejan de descartarse en
la capa comercial:** `resolverDiametroComercialDeTramo` ya calculaba
internamente `ResultadoHidraulicoDeTramo` (con `qc_lps` y `di_min_mm`)
para llegar al candidato comercial, pero no los exponía. Se amplían sus
tres variantes (`sinDemanda`/`conCandidato`/`sinCandidatoAdmisible`,
renombrada desde `sinCandidatoSuficiente` en el Correctivo 2A, ver más
abajo) para propagarlos -- sin ninguna llamada adicional al motor de
demanda -- de modo que N3 (y cualquier consumidor futuro) no tenga que
volver a invocar `resolverHidraulicaDeTramo` solo para conocer el `Qc`
ya resuelto.

**Reutilización de velocidad:** `velocidadReal_mps` se reutiliza tal
cual la devuelve `resolverDiametroComercialDeTramo` (calculada una única
vez con `Qc`+`Di` efectivo) para alimentar `calcularNumeroReynolds` en
la rama Darcy -- nunca se vuelve a llamar `calcularVelocidad`.

**Resultados de dominio explícitos, nunca `throw` ni valores inventados:**

- `sinLongitud`: `Tramo.longitud_m` ausente (opcional a propósito,
  D-δ.22/CRIT-A20) con candidato comercial ya resuelto -- se preserva
  toda la información comercial ya válida (`qc_lps`,
  `diReferenciaPredimensionamiento_mm`, `candidato`, `velocidadReal_mps`,
  `verificacionVelocidad`), sin asumir `longitud=0` ni derivarla de `Δz`.
- `sinCandidatoAdmisible`: propagado tal cual desde la capa comercial,
  sin calcular pérdida con un diámetro no admisible.
- **`fueraDeDominioTurbulento` fue eliminada del resultado productivo
  (decisión definitiva, Correctivo 2A) -- sigue sin ser un estado
  conservado "por si acaso", con la garantía revisada por D-δ.27/CRIT-A24
  (ver esa sección para el detalle completo).** Demostración vigente: con
  la viscosidad productiva de CRIT-A21 (`ν≈1,0034e-6 m²/s`), el menor `qu`
  positivo del catálogo normativo vigente (`0,08 l/s`) junto con el menor
  `Di` comercial normativamente evaluable del sistema productivo
  (`14,4mm`) da `Re≈7049,58` -- todavía muy por encima de
  `UMBRAL_REYNOLDS_TURBULENTO=4000` (demostrado en
  `resolverPerdidaDistribuidaDeTramo.test.ts`, calculado
  programáticamente desde `catalogoArtefactos`, sin invocar el
  resolver). **Esta garantía YA NO se sostiene en "todo candidato
  admitido cumple `V≥Vmin`"** (esa era la base original de Correctivo
  2A/D-δ.25; desde D-δ.27/CRIT-A24 dejó de ser cierta, porque el
  fallback admite `V<Vmin` en el candidato adoptado). **Pasa a
  sostenerse en que el catálogo normativo vigente no tiene ningún `qu`
  menor a ese piso** -- una garantía de datos, no una propiedad
  matemática cerrada. El guard `Re<UMBRAL_REYNOLDS_TURBULENTO`
  **permanece intacto** en `calcularFactorFriccionDarcy` (CRIT-A18),
  ahora como defensa activa ante un futuro catálogo con un `qu` menor,
  no como rama "inalcanzable por construcción".
- **Velocidad no admisible (CRIT-A19) NO bloquea el cálculo de `hf` --
  con matiz agregado en el Correctivo 2A, y matiz adicional desde
  D-δ.27/CRIT-A24:** el resultado físico de pérdida distribuida es
  conceptualmente independiente de que el diseño sea aceptable por
  velocidad, y `verificacionVelocidad` se sigue propagando como
  evidencia auditable de que CRIT-A19 se verificó. Bajo CRIT-A23 sin
  D-δ.27, `resolverDiametroComercialDeTramo` descartaba todo candidato
  no admisible antes de devolver `'conCandidato'` -- la combinación
  `conCandidato`+`noAdmisible` no era alcanzable por la selección
  automática. **Desde D-δ.27/CRIT-A24, esa combinación SÍ es alcanzable,
  de forma controlada y acotada: exclusivamente cuando el menor diámetro
  comercial normativamente evaluable incumple `Vmin`
  (`velocidadPorDebajoDelMinimo=true`) -- nunca por exceso de `Vmax`, y
  nunca fuera de ese caso puntual.** No se promete este comportamiento
  para una hipotética selección manual todavía inexistente.

**Hazen y Darcy permanecen separados:** el resultado usa un campo
`detalle` anidado, discriminado por `metodo`, para no mezclar campos de
un método en el otro (`coeficienteC`/`perdidaUnitaria_J_m_m` solo en
Hazen; `rugosidadAbsoluta_mm`/`temperaturaReferencia_C`/
`viscosidadCinematica_m2s`/`reynolds`/`factorFriccion` solo en Darcy).
Hazen-Williams no conoce `ν` ni temperatura del agua.

No se cierra aquí: orquestación de UI/memoria de cálculo, accesorios,
pérdidas localizadas, ni presión residual.

### D-δ.26 — Sincronización Proyecto ↔ `redHidraulica` (CERRADO conceptualmente, escritura automática diferida)

**Decisión adoptada**: M1 es autoritativo sobre qué artefactos existen
(identidad, tipo, cantidad); `redHidraulica` es autoritativa sobre cómo
están conectados físicamente. Si M1 contiene un artefacto normativo que
`redHidraulica` no referencia, M2 debe considerarse incompleto y no debe
presentar silenciosamente un resultado hidráulico como completo.

**Verificado por lectura de código, no supuesto**: ninguna operación de
alta de artefacto en M1 (`agregarArtefacto()` en
`MotorDemandaPantalla.tsx`) modifica `redHidraulica` — la nueva entidad
queda invisible para `obtenerArtefactosAguasAbajo` porque no existe
ningún `Nodo` que la referencie. Simétricamente, eliminar un artefacto ya
referenciado deja una `ReferenciaDeArtefacto` huérfana, que
`validarRedHidraulica` detecta (`redHidraulicaReferenciaArtefactoInvalida`)
y bloquea M1+M2 juntos — asimetría ya existente, no introducida por este
cierre.

**Implementado**: S1 (`auditarCoberturaFisica`, función pura de solo
lectura) y S2 (barrera de presentación en `ResultadoHidraulicoDeTramo.tsx`)
resuelven la mitad "nunca mostrar silenciosamente un resultado
incompleto" de esta decisión, sin generar topología ni reparar nada.

**Diferido a propósito**: generación/edición automática de Nodos/Tramos
al agregar un artefacto en M1. No existe hoy ningún punto de inserción
AF/AC explícito por Local en el modelo (`Nodo`/`Tramo` no tienen
`localId` ni concepto de "cabecera"); `identificarFilasDeModulo2.ts` sabe
inferir estructuralmente el Tramo cabecera de un Local, pero es lógica de
presentación, no debe usarse como punto de escritura sin una decisión
explícita nueva.

**Condición de resolución**: diseñar el punto de inserción físico
(cabecera AF/AC por Local) antes de implementar cualquier generación
automática de topología.

### D-δ.27 — Límite inferior de velocidad (CRIT-A19/CRIT-A23) ante Qc muy bajo — CERRADA

**Caso real que motivó el análisis** (demo, tramo `t-ac-toilette`):

```
Qc = 0.12 l/s
Sistema: Acqua System Magnum PN20
Candidato comercial mínimo: 20 mm, Di efectivo = 14.4 mm
Velocidad con ese candidato: 0.7368284402402562 m/s
verificarVelocidadAdmisible → noAdmisible (límite mínimo 1 m/s)
Resultado previo a este cierre: sinCandidatoAdmisible
```

**Causa**: `V` decrece monótonamente con `D` a Qc fijo (V=Q/A, A crece
con D²); si el diámetro comercial mínimo ya incumple el piso de
velocidad, todo diámetro mayor lo empeora — ningún candidato puede ser
admisible bajo la política previa. Consecuencia matemática necesaria de
CRIT-A19+CRIT-A23, no un defecto de implementación.

**Decisión adoptada**: `Vmax` permanece condición dura, sin excepción.
`Vmin` permanece como rango objetivo de diseño y criterio normal de
admisibilidad, pero deja de bloquear la selección exclusivamente cuando
el **menor diámetro comercial normativamente evaluable** ya incumple
`Vmin` — por la propiedad de monotonicidad ya documentada (CRIT-A19 §6),
ningún diámetro mayor podría corregirlo. En ese caso puntual, el motor
adopta igual ese candidato (`conCandidato`), con
`velocidadPorDebajoDelMinimo=true` y `verificacionVelocidad` conservando
el resultado real `'noAdmisible'` de la primitiva, como evidencia
auditable. Formalizado como **CRIT-A24** en
`src/normativa/eras-2023/CRITERIOS.md`.

**Fundamento de la decisión**: ERAS-2023 §2.12.1 sí establece el rango
de velocidades (CRIT-A19) — eso es dato normativo, no está en discusión.
Lo que ERAS no explicita es qué tratamiento corresponde cuando el menor
diámetro comercial normativamente evaluable queda por debajo de ese
mínimo: ningún texto disponible dice si eso invalida la instalación, la
condiciona a advertencia, o exige otra cosa. Ese vacío puntual (el
tratamiento del caso límite, no el rango en sí) es lo que resuelve este
criterio. El tratamiento adoptado (adoptar el mínimo con advertencia, en
vez de declarar "sin solución") es criterio operativo de IUAS para
llenar ese vacío — no una interpretación textual adicional de ERAS, ni
una afirmación de que ERAS "no obliga" a cumplir el rango de
velocidades.

**Consecuencia descubierta durante el cierre — invariante Darcy
revisada**: la garantía histórica "todo candidato adoptado por CRIT-A23
cumple `Re>UMBRAL_REYNOLDS_TURBULENTO` porque `V≥Vmin`" dejó de ser
cierta (el fallback admite `V<Vmin`). Se verificó, con el catálogo
normativo vigente, que el menor `qu` positivo real (`0,08 l/s`,
`quFria_lps` de varios artefactos domiciliarios) con el menor `Di`
comercial normativamente evaluable del sistema productivo (`14,4mm`)
da `Re≈7049,58 > 4000` — la garantía turbulenta sigue firme, pero ahora
**depende de que el catálogo normativo vigente no tenga ningún `qu`
menor a ese piso**, una garantía de datos, no una propiedad matemática
cerrada. El guard `Re<UMBRAL_REYNOLDS_TURBULENTO → throw` de
`calcularFactorFriccionDarcy` (CRIT-A18) se conserva intacto,
deliberadamente, como defensa activa ante un futuro catálogo con un `qu`
menor — dejó de documentarse como "inalcanzable por construcción". Test
de propiedad agregado en `resolverPerdidaDistribuidaDeTramo.test.ts`,
calculado programáticamente desde `catalogoArtefactos` (nunca
hardcodeando `0,08`), para que una futura edición normativa que reduzca
ese piso haga fallar el test en vez de quedar silenciosamente
desactualizada.

**No reabre**: los rangos normativos de CRIT-A19, el recorrido/prioridad
de CRIT-A23 cuando existe algún candidato admisible dentro de rango, ni
ninguna tolerancia sobre `Vmax`. No decide D-δ.28/29/30/31.

### D-δ.28 — Selector de sistema comercial / compatibilidad con material — CERRADA

**Estado previo a este cierre**: `materialTuberiaId` era seleccionable
desde la UI; `sistemaDeTuberiaId` quedaba fijo en código (el demo usa
Acqua System Magnum PN20, material PPR, único sistema del catálogo
productivo).

**Comportamiento ya verificado, sin cambios**: cambiar el material a uno
incompatible con el sistema configurado dispara correctamente
`configuracionHidraulicaSistemaMaterialIncompatible`
(`validarConfiguracionHidraulica`, preexistente desde el commit
`0b3386e`) y bloquea M1+M2 — la validación funcionaba como debe; la
deuda era exclusivamente la ausencia de un selector de sistema comercial
en la UI.

**Decisión adoptada**: exponer `sistemaDeTuberiaId` como un `<select>` en
`ConfiguracionHidraulicaFormulario`, poblado desde
`catalogoSistemasDeTuberia` (`denominacion` como etiqueta, `id` como
valor), con el updater puro `conSistemaDeTuberia`
(`src/interfaz/paginas/actualizarConfiguracionHidraulica.ts`) —
exactamente el mismo patrón ya usado por el selector de material
(`conMaterialTuberia`). No se diseñó ningún mecanismo nuevo: es la misma
solución que el propio pendiente ya calificaba como equivalente
("selector... o una política equivalente de selección compatible").
`validarConfiguracionHidraulica` sigue siendo la única fuente de verdad
sobre compatibilidad material/sistema -- el selector no duplica ni
anticipa esa validación.

**No decide**: granularidad de `sistemaDeTuberiaId` (D-δ.31, sigue
abierta -- el campo sigue siendo global al Proyecto, sin cambios de
modelo), clase/serie comercial (D-δ.29), ni margen de seguridad (D-δ.30).
Con un único sistema en el catálogo, el selector hoy solo tiene una
opción -- queda listo para cuando el catálogo comercial crezca, sin
haber anticipado ninguna estructura que ese crecimiento todavía no
demanda.

### D-δ.29 — Clase/serie comercial (PN20/PN25) y verificación presión-temperatura — ABIERTA

**Decisión explícita, no ambigua**: NO asociar automáticamente una clase
comercial a la red por defecto (ej. "AF → una clase, AC → otra clase").
La clase es una decisión de diseño, no una inferencia estructural.

La selección/verificación futura de clase deberá poder considerar,
como mínimo: material, familia comercial, clase/serie (ej. PN20/PN25),
DN, Di efectivo, presión de diseño, temperatura de servicio, capacidad
admisible presión-temperatura, y margen de seguridad elegido por el
diseñador (ver D-δ.30). **No asumir PN20 suficiente por defecto** en
ningún caso, incluido el catálogo demo actual (que hoy solo tiene PN20
cargado, sin que eso implique una decisión de que sea la clase correcta
para cualquier proyecto).

**No decidido**: nada de esto se implementa en este hito.

### D-δ.30 — Margen de seguridad de diseño — ABIERTA

**Registro, no fórmula**: el diseñador podrá querer aplicar un margen de
seguridad adicional respecto del mínimo estrictamente necesario (en
diámetro, en clase de presión, u otro parámetro todavía no decidido). No
se fija todavía ninguna fórmula ni factor universal.

**Condición de resolución**: debe quedar como criterio explícito y
trazable en el resultado (qué margen se aplicó y por qué), nunca como
ajuste implícito escondido dentro de otro cálculo.

### D-δ.31 — Granularidad de `sistemaDeTuberiaId` — ABIERTA

**Pregunta sin resolver**: si `sistemaDeTuberiaId` debe seguir siendo
global al Proyecto (estado actual), pasar a ser por red (AF/AC), por
Tramo, o un default global con override local por Tramo.

**No decidido**: evaluar post-pausa, con casos reales que lo justifiquen
(mismo criterio general del proyecto: no anticipar estructura sin
segundo caso de uso real).

### D-δ.32 — Próximo gran bloque hidráulico: presión — ABIERTA, investigación no iniciada

Bloque conceptual completo, todavía sin ningún código: origen hidráulico
(tanque elevado / presión de red / bombeo), cota o nivel libre, presión
estática, pérdidas distribuidas (ya implementadas, N3) y localizadas
(D-δ.33, pendiente), presión residual, presión mínima requerida, camino
crítico, y redimensionamiento por presión.

**Regla dura ya fijada, no negociable cuando se implemente**: nunca
reducir `Qc` artificialmente para hacer "pasar" una verificación de
presión.

**Condición de resolución antes de implementar**: revisión
normativa/bibliográfica de presiones mínimas ERAS, antecedentes
normativos previos si existen y son accesibles, y la tensión detectada
(no verificada todavía) entre presiones mínimas exigidas por ERAS y la
práctica constructiva tradicional de alimentación por tanque elevado.
Ninguna hipótesis de esa investigación fue confirmada todavía — no
adoptar ningún valor numérico de presión mínima sin esa revisión previa.

### D-δ.33 — Pérdidas localizadas / accesorios — CERRADA para el alcance 1→2 declarado (modo detallado)

**Nunca meter accesorios/codos/tees/válvulas/`Ks` dentro de
`longitud_m`** (D-δ.22 ya lo prohíbe explícitamente; se reafirma acá
porque es el punto de contacto directo con este pendiente).

#### CERRADO — subconjunto declarable sobre `Tramo` (M2-C slice A, CRIT-A28)

Curvas (45°/90°), codo 90°, llave de paso, válvula esclusa, uniones y
tubo saliente: representables de forma inequívoca como
`Tramo.accesorios?: readonly AccesorioDeTramo[]`
(`{ tipo: IdAccesorioDeTramo; cantidad: number }`), con `Ks` resuelto
desde Tabla N°7 (nunca persistido) y `V = velocidadReal_mps` del propio
`Tramo` (reutilizada de `resolverDiametroComercialDeTramo`, nunca
recalculada). `undefined` = accesorios no relevados todavía (nunca "sin
accesorios"); `[]` = relevado, efectivamente sin accesorios de este
subconjunto (pérdida real = 0). Detalle completo, fundamento y alcance en
**CRIT-A28** (`CRITERIOS.md`).

Implementado: `resolverPerdidaLocalizadaDeTramo`
(`motor/tuberias/perdidaCarga/`), `acumularPerdidaLocalizadaDeCamino`
(`motor/tuberias/presion/`), integrado en `resolverPresionResidualDeCamino`
como `hfLocalizada`. Validación de integridad en `validarRedHidraulica`
(`redHidraulicaTramoAccesorioTipoNoSoportado`/
`redHidraulicaTramoAccesorioCantidadNoPositiva`) — un `tipo` fuera del
subconjunto soportado (p. ej. persistido de una versión futura con tees)
se rechaza explícitamente, nunca se ignora ni se calcula como si no
existiera.

#### CERRADO — grifería vs. `Pmin` (criterio IUAS explícito, CRIT-A29)

El punto de verificación de presión es la boca/punto de conexión del
artefacto: la grifería/mecanismo interno del artefacto queda fuera del
balance de la red. `Ks=9,18` de "Griferías" (Tabla N°7) no se agrega
como pérdida localizada terminal. Detalle completo, fundamento e
investigación previa (incluida la limitación de fuente que motivó
resolverlo como criterio IUAS explícito en vez de transcripción
normativa) en **CRIT-A29** (`CRITERIOS.md`) y en la investigación
conservada más abajo en esta misma sección.

#### CERRADO — reducciones: convención de velocidad (criterio IUAS explícito, CRIT-A30)

La pregunta abierta no era el `Ks=0,75` (ya firme por CRIT-A26) sino qué
velocidad usar en `Js=Ks·V²/2g` cuando la reducción conecta dos
diámetros distintos. Verificación directa del texto completo de la Guía
ERAS-2023 (extraído con `pdftotext`, no solo "inaccesible" como en la
investigación de CRIT-A29) confirmó que la norma no lo especifica.
Bibliografía hidráulica reconocida y convergente (Munson et al. 1994;
Sotelo Ávila 1982, base de la tradición de cálculo sanitario argentina)
fija la convención: `V` es la del diámetro MENOR — que en una reducción
real es el lado aguas abajo. Consecuencia numérica verificada con datos
reales del propio proyecto: la interpretación descartada (lado mayor)
da un resultado ~2,56 veces mayor, confirmando que la elección era
material. Representación: una reducción se declara como
`AccesorioDeTramo` (`'reducciones'`, agregado a `IdAccesorioDeTramo`)
sobre el Tramo del lado menor — mismo patrón que el resto del
subconjunto CRIT-A28, sin necesidad de ningún concepto nuevo de
transición/nodo. Nunca inferida automáticamente de `Di(padre)≠Di(hijo)`:
sigue siendo una declaración explícita del usuario, igual que cualquier
otro accesorio. Detalle completo, evidencia y consecuencia numérica en
**CRIT-A30** (`CRITERIOS.md`).

#### CERRADO — tees en modo detallado: representación + velocidad por recorrido (CRIT-A31)

Decisión de dominio aprobada por el usuario (no evidencia normativa
nueva: el bloqueo era ausencia de geometría espacial en el modelo, ya
diagnosticado en CRIT-A28, no un vacío de fuente). Alcance:
exclusivamente nodos con **1 tramo entrante + 2 tramos salientes**
(convergencias 2→1, redes malladas y recirculación quedan fuera).

Representación: `Nodo.tee?: ConfiguracionDeTee` —
`{tipo:'entradaPorExtremo', tramoSalidaRectaId}` (una elección determina
ambas salidas: la declarada usa `Ks='teePasoRecto'`, la otra
`Ks='teeSalidaLateral'` por descarte) o `{tipo:'entradaCentral'}` (ambas
salidas `Ks='teeEntradaCentralSalidasLaterales'`, sin elegir cuál es
cuál). `undefined` significa exclusivamente "bifurcación real, tee
todavía no relevada" — a diferencia del resto de `AccesorioDeTramo`, una
bifurcación 1→2 real NO tiene equivalente a `accesorios:[]` ("sin
tee"): dos ramas no salen de un único caño sin alguna pieza en T/Y.

Velocidad: `Js_tee = Ks(recorrido)·V²/2g` con `V` la velocidad real del
TRAMO SALIENTE recorrido por cada camino evaluado — nunca la del tramo
entrante ni una "velocidad de tee" separada. Consecuencia: la MISMA tee
física puede aportar un `Js` distinto a dos terminales diferentes (Ks
por recorrido + V por Qc propio de cada rama) sin duplicar la pieza en
el modelo: se declara una única vez, sobre el Nodo.

Implementado: `resolverClasificacionDeTee`
(`motor/tuberias/topologia/`, resolver puro: `'clasificado'` |
`'sinConfigurar'` | `'noEsBifurcacionDeTee'`), validación estructural en
`validarRedHidraulica` (`redHidraulicaNodoTeeEstructuraNoSoportada`/
`redHidraulicaNodoTeeTramoSalidaRectaInvalido`), integrado en
`acumularPerdidaLocalizadaDeCamino` (nuevo motivo
`'teeSinConfigurar'` en `MotivoTramoSinPerdidaLocalizada`). Detalle
completo en **CRIT-A31** (`CRITERIOS.md`).

**Consecuencia sobre la cobertura de `hfLocalizada`**: con tees
resueltas, el subconjunto representable cubre TODA Tabla N°7 (griferías
deliberadamente excluida, CRIT-A29 — no es un vacío). Cuando
`acumularPerdidaLocalizadaDeCamino` devuelve `'acumulada'` para un
camino específico (todo tramo con accesorios relevados Y toda
bifurcación de tee del camino configurada), esa cobertura ya es
genuinamente completa: `resolverPresionResidualDeCamino` pasó de
envolver siempre `{tipo:'parcial'}` a `{tipo:'completa'}` en ese caso.
La única barrera restante hacia `balanceCompleto` en el proyecto
productivo es `hfMedidor` (D-δ.35) — ver D-δ.36.

**No decidido todavía** (fuera de este cierre): modo estándar/estimado
de pérdidas localizadas sin declaración manual — ver D-δ.40, registrado
pero no implementado.

#### Investigación normativa — grifería vs. `Pmin` (CERRADA por criterio IUAS explícito, CRIT-A29)

**Limitación de fuente verificada**: se intentó acceder al texto completo
de la Guía (Resolución ERAS 641/2023, `argentina.gob.ar`, AySA, InfoLeg,
Boletín Oficial) vía búsqueda y fetch web. La Guía completa (el anexo
técnico real, `IF-2023-141050544-APN-DNAPYS#MOP`) existe únicamente como
PDF escaneado (imagen, no texto seleccionable) en todas las fuentes
accedidas -- el Boletín Oficial publica solo la Resolución marco y
declara explícitamente "El/los Anexo/s que integra/n esta Resolución no
se publica/n" en esa vista. El entorno de esta sesión no cuenta con
herramientas de OCR/renderizado de PDF (`poppler-utils` no instalado)
para extraer el contenido de las imágenes. **No se pudo verificar
literalmente** el texto de §2.9.1.4 (presiones mínimas) ni una eventual
aclaración explícita sobre grifería más allá de lo ya transcripto en
CRIT-A25/CRIT-A26 en incrementos previos.

**Lo único confirmado literalmente** (ya transcripto en CRIT-A25/A26):
§2.12.1 exige "determinar la pérdida de carga de los tramos de cañería
**hasta** el artefacto más desfavorable, para verificar la presión mínima
resultante", y "Los valores a adoptar Ks de acuerdo a la Tabla N°7" para
"las pérdidas de carga singulares o localizadas". Tabla N°7 incluye
`Griferías: Ks=9,18` como una de sus 12 filas, sin ninguna nota o
excepción textual verificada que la excluya del cómputo para un artefacto
terminal.

**Corroboración externa (no ERAS, contexto general)**: fuentes de
ingeniería sanitaria argentina de la misma tradición metodológica (OSN
1981, que la Guía ERAS-2023 actualiza) tratan el mismo problema --
determinación de presión en el "artefacto más desfavorable" -- **sin
aclarar tampoco** si la presión mínima tabulada por artefacto ya incluye
la pérdida de su propia grifería o si se suma aparte. La ambigüedad no es
exclusiva de ERAS ni un vacío de esta investigación: parece ser un punto
genuinamente subespecificado en esta tradición normativa.

**Análisis hidráulico propio (inferencia, no norma)**:

- *A favor de que la grifería YA está incluida en `Pmin`*: la convención
  universal de códigos sanitarios define "presión mínima de
  funcionamiento" de un artefacto como la presión residual exigida **en
  el punto de conexión** del artefacto -- inclusiva de la resistencia
  propia del artefacto (su grifería), porque no se mide "dentro" del
  mecanismo. El propio texto de §2.12.1 ("pérdida... hasta el artefacto")
  sugiere que el cómputo de pérdidas de cañería termina en la conexión,
  no dentro del artefacto. Tabla N°7 lista **simultáneamente** "Llave de
  paso" y "Griferías" con el mismo `Ks=9,18` -- si "Griferías" significara
  lo mismo que "Llave de paso" (una válvula de corte en línea), la
  duplicación no tendría sentido; son más coherentes como dos objetos
  físicos distintos (válvula de corte en la cañería vs. grifo del propio
  artefacto).
- *A favor de sumarla aparte*: §2.12.1 instruye aplicar Tabla N°7 a las
  singularidades presentes en el cálculo sin ninguna excepción textual
  verificada para el caso "grifería del artefacto evaluado" -- el mismo
  criterio de transcripción literal sin interpretación que ya rige
  CRIT-A26 obligaría, en ausencia de una excepción confirmada, a tratar
  "Griferías" igual que cualquier otro accesorio de la tabla.

**No se pudo confirmar cuál lectura es la correcta** con las fuentes
disponibles.

**Decisión cerrada** (criterio IUAS explícito, sin evidencia normativa
adicional respecto de lo ya registrado arriba): la verificación de
presión del sistema de distribución termina en la boca/punto de conexión
del artefacto; `presionMinima_kgcm2` representa la presión mínima
exigida en ese punto. En consecuencia — Interpretación A adoptada:

- las pérdidas distribuidas (N3) y localizadas (subconjunto CRIT-A28) se
  acumulan únicamente hasta la boca de conexión del artefacto terminal;
- la pérdida propia de la grifería/mecanismo interno del artefacto queda
  fuera del balance de la red — se entiende absorbida por
  `presionMinima_kgcm2`, igual que cualquier otra resistencia interna del
  artefacto;
- `Ks=9,18` de "Griferías" (Tabla N°7) no se agrega como pérdida
  localizada terminal en `resolverPresionResidualDeCamino`;
- no se crea nodo, accesorio de `Tramo` ni término de pérdida adicional
  para la grifería terminal.

Formalizado como **CRIT-A29** en `CRITERIOS.md`. No reabrir salvo
evidencia normativa nueva que contradiga explícitamente este criterio
(p. ej. si en el futuro se logra acceder al texto literal de §2.9.1.4 y
contradice esta lectura).

### D-δ.34 — `n` no expuesto por `ResultadoPerdidaDistribuidaDeTramo` (N3) — CERRADA

**Hallazgo original**: `ResultadoPerdidaDistribuidaDeTramo` (N3) no
exponía `n` en ninguna de sus 4 variantes — solo vivía en
`ResultadoSimultaneidadHidraulicaDeTramo`, devuelto por
`resolverHidraulicaDeTramo`. Como la UI de M2 (L2) necesitaba mostrar
tanto `n` como los datos de N3 en la misma fila, `FilaResultado` llamaba
a **ambos** resolvers — sin duplicar ninguna fórmula, pero con
resolución duplicada del pipeline por fila.

**Resuelto**: `n` se agregó como campo aditivo a `sinCandidatoAdmisible`,
`sinLongitud` y `conPerdidaDistribuida` de
`ResultadoPerdidaDistribuidaDeTramo` (propagado desde
`ResultadoDiametroComercialDeTramo`, que ya lo recibía de
`resolverHidraulicaDeTramo`), y `FilaResultado` dejó de llamar a
`resolverHidraulicaDeTramo` — lee `n` directamente del resultado de N3.
Commit `a3757a60e4fe9be0697684cf07e8e0cf56c21322` ("refactor: evitar
doble resolucion hidraulica por tramo").

### D-δ.35 — Dónde vive el medidor en la topología — PARCIALMENTE RESUELTA (M3-A)

**Actualización (D-δ.53, M3-A):** el usuario resolvió la parte que
bloqueaba a Módulo 3: **alternativa (4)** — el medidor **no** entra a
`RedHidraulica` (ni `ReferenciaDeNodo: 'medidor'`, ni `Tramo.medidor`, ni
topología persistida nueva). M3 queda separado de la topología: consume
`Qc` ya resuelto aguas arriba y produce `hfMedidor` como dato de borde
para la capa de presión de M2. Lo implementado hasta ahora es sólo el
**medidor general** (M3-B1). Sigue **abierto**: la representación de la
micro-medición individual por UF/subred (cuántos medidores, cómo se
ubican respecto del origen y del almacenamiento, cómo se agregan sus `hf`
por camino), que se retomará cuando esa representación física quede
cerrada. El resto de esta sección se conserva como contexto de la
investigación previa.

**Hallazgo** (investigación M2-B): ERAS-2023 §2.12 exige computar la
pérdida de carga del medidor (`Jm`, fórmula 6 — ver CRIT-A25) como parte
obligatoria del balance de presión, y la propia secuencia de cálculo de
§2.12.1 distingue explícitamente **medidor general** (punto b/c) de
**medidor individual por unidad funcional** (punto e) — pueden existir
ambos en un mismo proyecto, en puntos distintos del recorrido
hidráulico.

**Estado actual del modelo**: `RedHidraulica`/`Nodo` no tiene ningún
concepto de medidor — `ReferenciaDeNodo` solo admite
`'artefacto' | 'produccionACS'`. La primitiva de cálculo (CRIT-A25) ya
existe y es independiente de este modelo, pero no puede aplicarse
todavía dentro de un recorrido de topología real.

**No decidido**: si el medidor debe representarse como un nuevo tipo de
`ReferenciaDeNodo`, como una propiedad de `Tramo`, como una entidad
aparte, o de otra forma; cómo distinguir medidor general de individual
en la topología; qué catálogo comercial de medidores (Tabla N°6,
diámetro/capacidad) corresponde incorporar y con qué estructura.

**Condición de resolución**: decidir junto con el diseño del recorrido
completo del balance de presión (origen → camino → terminal, D-δ.32),
no de forma aislada.

**Pre-hallazgo (D-δ.38)**: la pertenencia de `hfMedidor` al balance de un
terminal **depende del origen hidráulico y del tipo de medidor** — el
medidor general no interviene en el balance gravitacional tanque →
artefacto (está aguas arriba del almacenamiento), pero sí en la
alimentación directa; el medidor individual por unidad funcional
interviene en ambos orígenes si está sobre el ramal de la unidad. Ver
D-δ.38 para el detalle. Esto confirma que este pendiente no puede
resolverse con un único `hfMedidor` global.

#### Investigación M2-B (segunda pasada) — dominio reconstruido, sigue ABIERTA

**Casos reales que distingue ERAS** (según hallazgos ya registrados; el
repo no tiene el texto fuente):

- **Medidor general**: en la conexión / sala de medidores. Lo atraviesa
  la totalidad de la demanda del proyecto (o del sector que alimenta).
- **Medidor individual por unidad funcional** (§2.12.1 punto e; §2.6): en
  el ramal de cada UF. Lo atraviesa sólo la demanda de esa UF.
- Ambos pueden coexistir en un mismo proyecto (general + individuales).
- **No hay respaldo** en el material disponible para "medidores en
  serie" ni para otros arreglos comerciales — no se inventan.

**Cadena física por origen** (concreción de D-δ.38):

```text
Alimentación directa:
  red pública → medidor general → [raíz del camino] → … → terminal
  → Jm(general) ENTRA en el balance de todos los terminales.

Tanque de reserva:
  red → medidor general → almacenamiento → [raíz] → … → terminal
  → Jm(general) NO entra (está aguas arriba del almacenamiento).
  Si además hay medidor individual:
  … → almacenamiento → medidor individual (ramal UF) → terminal
  → Jm(individual) ENTRA en el balance de los terminales de esa UF.
```

**Caudal para `Jm` (`Qcl`, "gasto máximo probable en L/min")**: es el
`Qc` que atraviesa el punto físico del medidor, en l/min (= `Qc_lps ·
60`). No es un valor único:

- medidor general → `Qc` global del proyecto (CRIT-A5) = el `Qc` del
  tramo raíz, que el pipeline actual ya calcula
  (`resolverPerdidaDistribuidaDeTramo(proyecto, tramoRaiz).qc_lps`);
- medidor individual → `Qc` del ramal de esa UF = el `Qc` del tramo
  cabecera de la UF, que el pipeline también ya calcula.

Es decir: **la posición topológica del medidor determina qué `Qc` le
corresponde, y ese `Qc` ya está disponible por tramo** sin ningún cálculo
nuevo. Esto es evidencia a favor de una representación que capture la
posición (tramo o nodo del camino), no de un `hfMedidor` global.

**Colisión con un pendiente ya diferido**: el `Qc` del medidor individual
está atado a la "simultaneidad total de los consumos" que §2.6 exige para
medidores individuales, en tensión con el modelo §2.9.2 (ver más arriba
en este archivo, "Contradicción entre Qunit (Fig. 2.8 e) y simultaneidad
total…", explícitamente sin resolver). Cerrar el `Qc` del medidor
individual reabre esa contradicción.

**Tabla N°6 (capacidad `C` del medidor por caudal/diámetro)**: **no está
en el repo** — no existe `normativa/eras-2023/tabla-06-*`. Sin ella, `C`
sólo puede venir cargado por el usuario. Incorporarla es dato normativo
nuevo + una regla de selección (`Qc → diámetro/capacidad de medidor`),
del mismo tipo que la selección de diámetro comercial de tubería
(CRIT-A23) — no es transcripción trivial.

**Por qué sigue siendo decisión roja** (no se cierra en esta corrida):
toda representación que permita al motor decidir *solo* si `Jm` pertenece
a un camino exige una de estas, todas con consecuencias divergentes:
(1) un tipo nuevo de `ReferenciaDeNodo` `'medidor'` (cambio transversal
de `Nodo`, análogo a `produccionACS` pero con datos propios: general vs
individual, `C`); (2) una propiedad de `Tramo` (`medidor?`); (3) una
entidad/lista aparte asociada a `Proyecto` o a una subred; (4) mantener
`hfMedidor` como escalar que el llamador provee (analógico a `Pdisponible`
abstracto, D-δ.38) — pero hoy el llamador no puede derivar si el medidor
está en el camino porque el origen no está modelado (D-δ.38). Además
(2)/(3)/(1) interactúan con el origen no modelado y con la contradicción
§2.6 todavía abierta.

**Estado**: ABIERTA. Ninguna de las cuatro alternativas queda
inequívocamente forzada por el dominio actual. Ver el checkpoint rojo
reportado al cerrar esta investigación.

#### Contrato mínimo M2↔M3 para `hfMedidor` — CERRADO (alcance acotado)

**Investigación M2-B (tercera pasada)**: lo anterior deja ABIERTA la
pregunta de *dónde vive el medidor en la topología* (qué alternativa de
(1)/(2)/(3)/(4) representa general vs. individual, Tabla N°6, `Qc` del
medidor). Pero esa pregunta es distinta de una más chica y ya
respondible: *¿el motor de M2 puede resolver un balance completo si
alguien más le entrega `hfMedidor` ya calculado?* — sin decidir todavía
quién es ese "alguien" ni de dónde saca el valor.

Distinción clave: **"M2 hidráulicamente completo"** (el motor cierra el
balance cuando recibe todos los términos) no es lo mismo que **"proyecto
completo hasta M3"** (el proyecto ya tiene un valor real de `hfMedidor`
producido por una selección de medidor). Es válido que lo primero esté
cerrado mientras lo segundo siga pendiente de M3.

**Decisión adoptada**: alternativa (4) de la lista de arriba, pero
acotada estrictamente al *orquestador* (`resolverPresionResidualDeCamino`),
no a `RedHidraulica`/`Nodo`. `hfMedidor_mca: number | undefined` pasa a
ser un parámetro explícito de `resolverPresionResidualDeCamino`, con el
mismo estatus que `presionDisponible_mca` (D-δ.36): una condición de
borde que el llamador provee, nunca derivada de la topología por este
motor. Si el llamador no puede proveerlo, pasa `undefined` y el balance
sigue `'incompleto'` — ningún comportamiento nuevo respecto del término
`hfLocalizada`, que ya funciona así.

**Por qué esto NO reabre ni duplica lo que sigue ABIERTO arriba**: el
motor de M2 no gana ninguna capacidad de decidir si un medidor
(general/individual) pertenece al camino de un terminal dado, ni
selecciona catálogo comercial, ni calcula `Qc` del medidor — sigue sin
saber que existe un "medidor" como concepto. Eso sigue siendo,
íntegramente, lo que describe la investigación de arriba y queda para
cuando se diseñe M3 (o se resuelva D-δ.35/D-δ.38 en conjunto). Este
cierre solo establece el *punto de entrada* por el que ese valor,
cuando exista, entra al balance.

**Consecuencia práctica**: `resolverTerminalMasDesfavorable` ya puede
determinar un terminal más desfavorable real (`'determinado'`) cuando
todos sus candidatos reciben `hfMedidor_mca` — primera vez que
`'balanceCompleto'` es alcanzable en la práctica, no solo en el tipo.
Ver los tests de integración de `resolverPresionResidualDeCamino.test.ts`
y `resolverTerminalMasDesfavorable.test.ts`.

### D-δ.36 — Balance de presión: motor puro con `Pdisponible` como condición de borde explícita — EN PROGRESO

**Decisión adoptada** (continuación de D-δ.32): el motor de balance de
presión se construye primero como función pura que recibe `Pdisponible`
explícitamente como parámetro de entrada, **sin decidir todavía** cómo
se obtiene esa presión desde `Proyecto` (tanque elevado, tanque de
reserva, bombeo, conexión directa como tipo de origen quedan
deliberadamente sin modelar, así como su persistencia y cualquier UI
asociada).

**Precisión normativa explícita**: ERAS-2023 §2.8 establece que
"pisos bajos destinados a viviendas y pisos altos" requieren
**obligatoriamente** provisión de agua con reserva de tanque — sin
excepción condicionada a presión. Esto **no equivale** a decir que
"tanque elevado" sea el único origen hidráulico posible en el modelo:
es el caso normativamente dominante para el uso residencial de IUAS,
pero la representación hidráulica concreta del origen (qué tipo de
tanque, a qué altura, cómo se relaciona con la topología) sigue sin
investigarse/modelarse — no debe darse por resuelta ni asumirse
equivalente a "siempre hay un tanque elevado en el modelo".

**Estado**: motor puro en construcción, ver el propio archivo del
motor y su test para el estado exacto de qué términos ya calcula y
cuáles exige explícitos.

**Corrección de completitud (auditoría posterior a M2-C slice A)**:
`TerminosDePerdidaDeBalance.hfLocalizada` dejó de ser `number | undefined`
y pasó a ser `CoberturaDePerdidaLocalizada` (`'completa' | 'parcial' |
'ausente'`, cada una con su `hf_mca` cuando corresponde). **Motivo**: un
`number` definido no distinguía "hay un valor calculado" de "ese valor
representa toda la pérdida localizada normativamente exigible para el
camino (Tabla N°7 completa)". **Actualización (CRIT-A31, cierre de
D-δ.33 para tees)**: con curvas/codos/válvulas/uniones/tubo
saliente/reducciones (CRIT-A28/A30) Y tees (CRIT-A31) representables,
más griferías deliberadamente excluida del balance (CRIT-A29, no es un
vacío de cobertura), el subconjunto representable cubre TODA Tabla N°7.
`acumularPerdidaLocalizadaDeCamino` corta con `'incompleta'` ante
cualquier accesorio o tee sin relevar en el camino — así que cuando
devuelve `'acumulada'`, esa cobertura ya es genuinamente completa para
ese camino específico. `resolverPresionResidualDeCamino` pasó de
envolver siempre `{tipo:'parcial', hf_mca}` a `{tipo:'completa',
hf_mca}` en ese caso (el branch `'incompleta'` de
`acumularPerdidaLocalizadaDeCamino` ya cortó antes, más arriba en la
misma función, con `'perdidaLocalizadaIncompleta'` — nunca se llega a
envolver un resultado parcial como si fuera completo). `'parcial'` sigue
existiendo en el tipo para composiciones futuras/alternativas que no
cubran todo el dominio (p. ej. el modo estimado, D-δ.40). La única
barrera restante hacia `balanceCompleto` en el proyecto productivo hoy
es `hfMedidor` (D-δ.35) — nunca más `hfLocalizada`.

**Terminal hidráulicamente más desfavorable — primitiva agregada**:
investigación previa confirmó que no existía ningún resolver ni
selección implícita de "el artefacto más desfavorable" en el motor —
`alturaArtefactoMasDesfavorable_m` (`ParametrosProyecto`) es un campo
legado sin ningún consumidor de cálculo, sustituto pre-topología, y la
UI de Módulo 2 solo lista todos los Tramos/terminales en tabla sin
comparar ninguno. Se agregó `resolverTerminalMasDesfavorable`
(`motor/tuberias/presion/resolverTerminalMasDesfavorable.ts`): compone
resultados ya producidos por `resolverPresionResidualDeCamino` (uno por
terminal candidato, misma `Pdisponible`) y determina cuál tiene el
**menor margen** (`presionResidual_mca - presionMinimaRequerida_mca`) —
magnitud elegida deliberadamente sobre "mayor cota" o "más lejano": un
terminal cercano y bajo puede ser más desfavorable que uno lejano y alto
si acumula más pérdida localizada o exige mayor `Pmin`. Preserva la
barrera de completitud explícitamente con tres resultados nunca
colapsados (`'determinado'` solo si TODOS los candidatos resolvieron
`'balanceCompleto'`; `'candidatoProvisional'` si hay candidatos
excluidos —el peor entre los completos podría no ser el real—;
`'sinCandidatoDeterminable'` si ninguno resolvió `'balanceCompleto'`).
Desde CRIT-A31, `hfLocalizada` SI puede resolver `'completa'` para un
camino con tees y accesorios relevados, pero `hfMedidor` (D-δ.35) sigue
siempre `undefined`: por eso `'balanceCompleto'` sigue siendo
estructuralmente inalcanzable en todo el proyecto hoy, y esta función
sigue devolviendo `'sinCandidatoDeterminable'` sobre datos reales —
verificado con un test de integración end-to-end (dos terminales reales
vía `resolverPresionResidualDeCamino`, con tee configurada y accesorios
relevados: ambos quedan `'balanceIncompleto'` con
`terminosFaltantes=['hfMedidor']` exclusivamente). Sin integración a UI
todavía (no hay ningún consumidor de `resolverPresionResidualDeCamino`
en `MotorDemandaPantalla.tsx` por ahora).

### D-δ.37 — Alimentación ramificada como precondición hidráulica de M2 (recorrido hacia el origen) — CERRADA

**Decisión adoptada** (continuación de D-δ.32/D-δ.36, formalizada como
**CRIT-A27** en `src/normativa/eras-2023/CRITERIOS.md`): para el alcance
hidráulico actual de Módulo 2, un terminal solo es hidráulicamente
resoluble cuando existe un **único camino dirigido e inequívoco** desde
una raíz de alimentación hasta ese terminal. Sobre la ascendencia
relevante: a lo sumo un tramo entrante por nodo, ausencia de ciclos,
terminación en un nodo raíz sin tramo entrante, nunca elección
silenciosa entre múltiples predecesores.

**Precisión arquitectónica explícita — NO restringe el modelo base**:
esto NO se convierte en "`redHidraulica` solo puede ser un árbol". La
validación estructural básica (`validarRedHidraulica`) **no** rechaza
universalmente ciclos ni convergencias. `RedHidraulica` conserva su
generalidad deliberada para funcionalidades futuras, particularmente la
recirculación de ACS (D-δ.15, sigue diferida y no prohibida
conceptualmente). La restricción se expresa como **precondición de los
motores hidráulicos actuales de M2**, no como afirmación ontológica de
que otra topología sea inválida:

```text
red válida como estructura   ≠   red resoluble por los motores
                                  hidráulicos actuales de M2
```

**Fundamento**: CRIT-A11 define el Qc de un tramo sobre *todo* el
conjunto aguas abajo; eso presupone que el tramo transporta la demanda
completa, lo que exige un único camino origen→terminal. Una red con
reparto de caudal entre caminos paralelos requiere otro modelo
hidráulico (Hardy-Cross / reparto de caudales) y queda fuera de alcance.
No atribuido a ERAS: criterio operativo / de alcance IUAS derivado de la
coherencia del modelo actual.

**Implementado**: `obtenerCaminoHaciaOrigen`
(`src/motor/tuberias/topologia/obtenerCaminoHaciaOrigen.ts`), función
pura de dominio que parte de un nodo terminal y camina contra la
dirección de los tramos. Resultado discriminado:

- `camino`: nodos y tramos en orden hidráulico (raíz → terminal), con
  `raizId`/`terminalId`; incluye el caso "raíz inmediata" (el nodo
  consultado ya no tiene tramo entrante → camino de un solo nodo, sin
  tramos).
- `multiplesTramosEntrantes`: un nodo de la ascendencia (posiblemente el
  propio terminal) tiene dos o más tramos entrantes — cubre convergencia
  y tramos paralelos `A → B`. No se elige ninguno.
- `ciclo`: la ascendencia vuelve a un nodo ya visitado; termina sin loop
  infinito.

`throw` reservado para precondiciones estructuralmente imposibles tras
`validarRedHidraulica` (nodo consultado inexistente; tramo que apunta a
un `nodoOrigenId` inexistente) — mismo criterio que
`obtenerArtefactosAguasAbajo`. Una `RedHidraulica` estructuralmente
válida pero no resoluble por el alcance actual **nunca** produce un
`throw` ni un camino fabricado: devuelve el resultado discriminado
correspondiente.

**No exige raíz única por `Proyecto`**: componentes independientes son
válidos; consultar un terminal resuelve sólo su componente.

**No reabre**: no adopta política de "camino más desfavorable" entre
múltiples alimentaciones (eso es D-δ.32, camino crítico, requiere la
investigación normativa previa); no modela Hardy-Cross, redes malladas,
reparto de caudales ni recirculación ACS; no decide ubicación del
medidor (D-δ.35) ni origen hidráulico persistido (D-δ.36).

**Pendiente derivado (no bloqueante)**: `identificarFilasDeModulo2.ts`
usa un `buscarTramoPadre` que hace `find()` del primer tramo cuyo
`nodoDestinoId` coincide — lógica de presentación, nunca autoridad
hidráulica. Ver la nota en ese archivo. Sobre la topología ramificada
que los motores declaran resoluble su comportamiento es correcto; sobre
una topología con convergencia/paralelos elegiría un padre arbitrario
para agrupar filas, pero esa topología ya no produce ningún resultado
hidráulico presentable (los motores la declaran no resoluble antes). No
se reescribe la pantalla en este incremento.

### D-δ.38 — Origen hidráulico: modelo físico de `Pdisponible` por tipo de origen (investigación, no cierra ninguna regla)

Continuación de D-δ.32 y D-δ.36. `resolverPresionResidualDeCamino` recibe
hoy `presionDisponible_mca` como parámetro abstracto (D-δ.36). Este
registro reconstruye qué representa físicamente esa magnitud según el
origen, para **informar — no decidir todavía —** la eventual
representación en el modelo.

**Limitación de fuente**: el repo no contiene el texto de ERAS-2023 (ver
`HANDOFF-MODULO-1-A-MODULO-2.md` §7). Las afirmaciones rotuladas "norma"
provienen de hallazgos previos ya registrados en este archivo y en
`CRITERIOS.md`, y de conocimiento normativo general; no de una
verificación contra el texto fuente en este repo. Toda ampliación futura
debe hacerse contra la Resolución 641/2023 real.

**Contrato vigente que NO cambia**: `resolverBalanceDePresion` calcula
`presionResidual = Pdisponible − Δz − Σpérdidas`, con
`Δz = cota_terminal − cota_raiz` (signo conservado: el descenso aporta
carga). Por contrato, entonces, `Pdisponible` es **la carga disponible en
el nodo raíz del camino** y `cota_raiz` la elevación de ese nodo. Cada
origen se expresa eligiendo qué nodo es la raíz y qué carga tiene —
ninguna fórmula se redefine.

#### Origen 1 — Distribución gravitacional desde tanque de reserva elevado

- **Norma (hallazgo previo, D-δ.36)**: ERAS §2.8 exige provisión con
  reserva para el uso residencial dominante ("pisos bajos destinados a
  viviendas y pisos altos"), sin excepción condicionada a presión. No
  equivale a "único origen posible"; es el caso normativamente dominante.
- **Principio físico**: en distribución por gravedad, la carga disponible
  en cualquier punto = (elevación de la superficie libre del agua en el
  tanque) − (elevación del punto). En la salida del tanque la presión
  manométrica ≈ 0 (superficie libre inmediatamente encima).
- **Condición de borde**: la **elevación piezométrica** = cota del nivel
  de agua del tanque. No es "una presión en un nodo": es una cota.
- **Representación limpia**: nodo raíz = superficie libre del tanque a su
  **nivel mínimo operativo** (peor caso para presión); `Pdisponible_mca
  = 0` en la raíz; **toda** la carga motriz la aporta `−Δz` del camino
  (el artefacto está por debajo del tanque → `Δz < 0`).
- **Criterio IUAS pendiente**: qué nivel usar como "nivel mínimo
  operativo" cuando ERAS no lo fija. Opción conservadora simple: cota de
  la boca de salida del tanque (equivale a `Pdisponible = 0`, tanque a
  punto de vaciarse). Un futuro modelo de tanque podría refinar con una
  reserva mínima de altura. No decidido.
- **Pérdidas previas al camino**: bajada del tanque + colector hasta la
  raíz. Si la raíz se coloca en la salida del tanque, esas pérdidas caen
  dentro de los primeros tramos del camino, no antes de él.
- **Bombeo a tanque elevado**: hidráulicamente **idéntico a este caso**
  para la red de distribución — la bomba sólo llena el tanque. No es un
  origen distinto para el balance del terminal.

#### Origen 2 — Alimentación directa desde red pública

- **Norma / práctica (hallazgo previo)**: admisible cuando la presión
  garantizada en la conexión alcanza para llegar al artefacto más
  desfavorable con su presión mínima; si no, reserva obligatoria
  (§2.7 / §2.8).
- **Condición de borde**: la **presión mínima garantizada sobre el nivel
  de vereda** — exactamente lo que representa el campo legado
  `ParametrosProyecto.presionSobreAcera_m`. Es una presión (m.c.a.)
  referida a `cota 0 = acera` (convención del modelo).
- **Representación**: nodo raíz en la conexión / salida del medidor
  general, `cota_raiz ≈ 0`; `Pdisponible_mca = presionSobreAcera_m`. La
  subida hasta los artefactos es `Δz > 0` (consume); la pérdida del
  medidor y de la cañería de alimentación entran en el camino.
- `presionSobreAcera_m` **sigue siendo necesario** para este origen — no
  es legado a eliminar.

#### Origen 3 — Bombeo con presurización directa (sin tanque elevado)

- **Condición de borde**: presión en la impulsión al caudal de diseño =
  punto de la curva de bomba / setpoint del presostato. **Requiere datos
  de bomba** (curva, arranque/parada, caudal, control) que el modelo
  actual no tiene y que no corresponde modelar en este alcance.
- **Decisión**: origen **diferido**. El contrato abstracto actual
  (`Pdisponible` explícito) permite incorporarlo después sin mentira
  conceptual: un futuro modelo de bomba produciría un `Pdisponible` y lo
  entregaría igual que los otros orígenes.

#### Consecuencia para D-δ.35 (medidor) — pre-hallazgo, no diseña la entidad

La pertenencia de `hfMedidor` al balance de un terminal **depende del
origen y del tipo de medidor**:

- **Medidor general** (en la conexión / sala de medidores, §2.12.1):
  - Origen directo → está hidráulicamente entre la red y el terminal →
    `hfMedidor` **entra** en el balance del terminal.
  - Origen tanque/gravitacional → está **aguas arriba del
    almacenamiento** (llena el tanque) → su pérdida afecta el
    llenado/reserva, **no** la presión gravitacional tanque → artefacto
    → **no entra** en el balance del terminal.
- **Medidor individual por unidad funcional** (§2.12.1 punto e, §2.6): si
  existe sobre el ramal de la unidad, está en el camino
  tanque/red → artefacto de esa unidad en **ambos** orígenes → **entra**
  en el balance de los terminales de esa unidad.

Refuerza que D-δ.35 debe distinguir medidor general de individual y
ubicarlos topológicamente respecto del origen y del almacenamiento — no
como un único `hfMedidor` global. **No se diseña la entidad `Medidor`
acá.**

#### Campos legado de `ParametrosProyecto`

- `presionSobreAcera_m`: **sigue vigente** como condición de borde del
  Origen 2. Hoy sin consumidor (ningún motor lo lee); pasará a
  alimentarlo cuando se cierre el origen.
- `alturaArtefactoMasDesfavorable_m`: **redundante** para el balance por
  terminal — `Nodo.cota_m` del nodo terminal transporta la misma
  información, por terminal y con más precisión. Era el sustituto
  pre-topología de "cuánto sube el artefacto más desfavorable".
  Clasificación: **legado pendiente de migración**; NO se elimina en esta
  corrida (no hay infraestructura de migraciones —
  `modelo/proyecto/migraciones/` con lista vacía —, `SCHEMA_VERSION`
  congelada en `1.0.0`, y sigue siendo el único dato tipo-origen que
  carga el demo).

#### Qué NO cierra este registro

No decide si el origen se representa como condición de borde abstracta
(seguir como D-δ.36), como estructura en `Proyecto`, como referencia de
nodo topológica, o una combinación; ni si es global al `Proyecto` o por
raíz / subred (CRIT-A27 admite subredes independientes). Esa es una
decisión roja abierta — ver el checkpoint reportado al cerrar esta
investigación.

### D-δ.39 — Sincronización funcional -> hidráulica al agregar/eliminar Artefacto (M2-D) — CERRADA para el flujo cotidiano de alta/baja

**Problema reproducido**: agregar un `Artefacto` a un `Local` existente
(vía UI) actualiza `Local.artefactos` pero nunca `redHidraulica`
(hallazgo ya registrado en D-δ.26). `auditarCoberturaFisica` (S1) lo
detecta correctamente y la barrera de presentación (S2) oculta las
tablas de M2 con "Red hidráulica incompleta" — la barrera funciona como
debe; lo que faltaba era la sincronización.

#### Reconstrucción del flujo real (antes de implementar)

- `agregarArtefacto()` (`LocalFormulario`, `MotorDemandaPantalla.tsx`)
  crea la instancia con `artefactoId: catalogoArtefactos[0].id` por
  defecto (el primer ítem del catálogo, hoy `inodoroValvula`) — el
  usuario cambia el tipo después vía el `<select>` de
  `ArtefactoFormulario`, en un `onChange` completamente separado.
- Los ids de instancia (`Artefacto.id`, `Nodo.id`, `Tramo.id` nuevos) se
  generan con `generarId()` (`crypto.randomUUID()`,
  `duplicarUnidadFuncional.ts`) — impredecibles, no derivables de
  convención de nombres.
- No existe infraestructura de migraciones (`migraciones = []`) ni
  reconciliación automática: `redHidraulica` es hoy exclusivamente
  estática (el proyecto demo) o editada a mano por el usuario (L1,
  `longitud_m`), nunca regenerada.

#### Patrón topológico real del demo (inspección, no supuesto)

Para cada (Local, Red) con **≥2** artefactos conectados existe un nodo de
bifurcación dedicado (p. ej. `n-af-1` del Baño). Para **exactamente 1**
artefacto conectado, **no existe ningún nodo de bifurcación** — la rama
va directa desde el origen compartido (`n-0` para AF, `n-acs` para AC)
hasta el terminal (p. ej. Patio→canilla, Toilette AC→lavatorio). Esto
descarta un "Option A" ingenuo que asuma siempre un nodo de cabecera
dedicado: hay que generalizarlo para cubrir el caso `n=1` sin necesitar
"retrofit" (partir un tramo existente en dos) — ver más abajo.

#### Alternativa adoptada — Opción A generalizada: deducible sin persistir nada nuevo

**No se introduce ningún concepto de "cabecera" persistida** (Opciones B/
C/D del checkpoint no fueron necesarias). Se implementaron dos resolvers
puros más un orquestador, componiendo piezas ya cerradas:

1. **`hallarNodoDeInsercionDeLocal(redHidraulica, unidadFuncionalId,
   localId, red)`** (`motor/tuberias/topologia/`): recolecta los nodos de
   origen (`nodoOrigenId`) de los tramos que alimentan los terminales ya
   existentes de ese (Local, Red). Si todos coinciden en un único nodo —
   sea un nodo de bifurcación dedicado (caso `n>=2`) o el origen
   compartido directo (caso `n=1`, sin retrofit) — ese nodo es el punto
   de inserción. Si el Local no tiene ningún terminal de esa Red
   (`sinConexionExistente`) o los existentes no comparten origen
   (`ambiguo`), no hay resultado — nunca se elige arbitrariamente.

2. **`determinarRedesFisicasPorPrecedente(proyecto, artefactoIdCatalogo)`**
   (`motor/tuberias/topologia/`): determina qué Redes (AF/AC/ambas)
   necesita físicamente un artefacto nuevo mirando cómo el **propio
   proyecto** conecta hoy OTRAS instancias del mismo `artefactoId` de
   catálogo — **nunca** el catálogo normativo directamente
   (`quCaliente_lps>0`), porque CRIT-A15 ya estableció que la
   conectividad física es una decisión de instalación real e
   independiente de la capacidad normativa (demostrado en el propio demo:
   `inodoroDeposito` tiene `quCaliente_lps>0` en catálogo pero el
   proyecto lo conecta exclusivamente a AF). Reutiliza
   `determinarConectividadFisica` (CRIT-A15) sin reimplementarla. Si no
   hay ninguna instancia previa conectada de ese `artefactoId` en todo el
   proyecto (`sinPrecedente`), o si coexisten patrones distintos
   (`inconsistente`), no hay resultado.

3. **`sincronizarConectividadFisicaDeArtefacto(proyecto,
   unidadFuncionalId, localId, artefactoInstanciaId)`**
   (`interfaz/paginas/`): orquesta 1+2. Aditiva y no destructiva a
   propósito — solo agrega `Nodo`(s)/`Tramo`(s) nuevos, nunca modifica un
   `Tramo`/`Nodo` existente (`longitud_m`/`cota_m`/`accesorios` ya
   cargados quedan intactos). Idempotente (una Red ya conectada no se
   duplica). Reporta `redesConectadas`/`redesPendientes` explícitamente —
   nunca fabrica una conexión que no pudo determinar; S1/S2 siguen siendo
   la única fuente de verdad sobre qué falta.

4. **`quitarConectividadFisicaDeArtefacto(proyecto, unidadFuncionalId,
   localId, artefactoInstanciaId)`** (`interfaz/paginas/`, BAJA): elimina
   todos los nodos cuya `referencia` identifica exactamente al artefacto
   (nunca compartidos con otra instancia, por construcción — D-δ.3) y sus
   tramos entrantes exclusivos. **Nunca elimina el nodo padre/cabecera**
   aunque quede sin hijos: es infraestructura compartida del Local, no
   exclusiva de la instancia eliminada — sin esto, eliminar un Artefacto
   ya referenciado dejaba una referencia huérfana que bloqueaba M1+M2
   juntos (D-δ.26, `redHidraulicaReferenciaArtefactoInvalida`), un fallo
   más disruptivo que el caso de alta.

**Wiring en UI**: `agregarArtefacto()`/el `onEliminar` de
`ArtefactoFormulario` (`MotorDemandaPantalla.tsx`) llaman a estos
orquestadores y pasan el `Proyecto` resultante directo al `setProyecto`
de nivel superior (`onCambiarProyecto`, prop nueva enhebrada por
`UnidadFuncionalFormulario`/`LocalFormulario`) — consecuencia mecánica de
threading de props, sin rediseño de UI.

#### Primera instancia de un `artefactoId` en todo el proyecto — resuelto

Cuando se agrega el **primer** artefacto de un tipo de catálogo que
nunca existió antes en el proyecto (p. ej. el caso reproducido real:
`inodoroValvula`, que no aparecía en ningún Local del demo original),
`determinarRedesFisicasPorPrecedente` devuelve `sinPrecedente` — no hay
ninguna instalación previa de la que copiar la conectividad física, y
adoptar el catálogo como respaldo violaría CRIT-A15. Este límite quedó
documentado como abierto en el cierre original de este registro; se
resolvió en un incremento posterior con la interacción explícita del
usuario que en ese momento se había dejado fuera de alcance:

- **`sincronizarConectividadFisicaDeArtefactoConRedesDeclaradas(proyecto,
  unidadFuncionalId, localId, artefactoInstanciaId, redesDeclaradas)`**
  (`interfaz/paginas/sincronizarConectividadFisicaDeArtefacto.ts`):
  variante de `sincronizarConectividadFisicaDeArtefacto` que, en vez de
  derivar las Redes de un precedente, las recibe declaradas directamente
  por quien llama. Comparte con la variante original toda la lógica de
  inserción (`hallarNodoDeInsercionDeLocal`) y las mismas garantías
  (aditiva, no destructiva, reporta `redesPendientes` si el Local no
  tiene punto de inserción inequívoco para la Red declarada — nunca
  fabrica una conexión).
- **UI (`MotorDemandaPantalla.tsx`, `LocalFormulario`)**: `agregarArtefacto()`
  ahora consulta `determinarRedesFisicasPorPrecedente` **antes** de crear
  el `Artefacto` funcional. Si hay precedente, el alta sigue siendo
  automática como antes (sin preguntar nada). Si no hay precedente, no se
  crea nada todavía — se muestra un selector inline (AF / AC / AF+AC /
  Cancelar) y recién al elegir una opción se crean el `Artefacto` y su
  conectividad física en una única operación atómica
  (`crearYConectarArtefacto`), evitando el patrón "crear incompleto ->
  reparar después".
- El caso `inconsistente` (patrones físicos distintos entre instancias
  previas) sigue sin resolver interactivamente — no se pidió para este
  incremento — y se comporta igual que antes: el artefacto se crea
  funcionalmente sin conexión física, señalado por S1/S2.

Verificado con un test de integración sobre el caso real (`inodoroValvula`
en un Baño que ya tenía otro artefacto conectado a AF) que confirma
`sinPrecedente` sin la declaración, y que con `redesDeclaradas: ['AF']`
el resultado pasa `validarRedHidraulica`, deja completa la auditoría de
cobertura física, y el artefacto nuevo aparece en el traversal aguas
abajo y participa del cálculo — y verificado también end-to-end en el
navegador (Módulo 2 deja de mostrar "Red hidráulica incompleta").

#### No implementado en este slice (deferred a propósito)

- **Cambio de tipo de artefacto** (`ArtefactoFormulario`, `<select>` de
  `artefactoId`): separable del flujo de alta/baja (call site distinto);
  hoy no dispara sincronización. Si el tipo cambia después de creado con
  el default (`catalogoArtefactos[0]`), la conectividad puede quedar
  desalineada con el nuevo tipo. Reutilizar
  `sincronizarConectividadFisicaDeArtefacto` en ese `onChange` sería
  mecánicamente trivial en un incremento futuro — no se hace acá para no
  ampliar el alcance de este cierre.
- **`Artefacto.cantidad`**: no modifica la topología física, solo la
  demanda (`n`/`Qmax`) — el modelo ya trata `cantidad>1` como múltiples
  unidades sobre la misma conexión funcional (CRIT-A3), sin nodos
  adicionales. Nada que sincronizar.
- Persistencia de "cabecera" (Opciones B/C/D del checkpoint): no
  resultaron necesarias — la Opción A generalizada cubre el caso
  planteado sin introducir ningún concepto nuevo en el modelo.

**Estado**: CERRADA para el flujo cotidiano de alta/baja. Alta y baja de
artefacto en un Local ya físicamente conectado, y alta de la primera
instancia de un `artefactoId` sin precedente (con declaración explícita
de AF/AC/ambas por el usuario), quedan resueltas end-to-end (funcional +
física + auditoría + cálculo aguas abajo). Cambio de tipo de artefacto
después de creado (`<select>` de `ArtefactoFormulario`) y el caso
`inconsistente` (patrones físicos distintos entre instancias previas)
quedan explícitamente fuera, documentados arriba.

### D-δ.40 — Modo estándar/estimado de pérdidas localizadas (dos niveles metodológicos) — IMPLEMENTADA (alcance: tees)

**Contexto**: D-δ.33/CRIT-A28/CRIT-A30/CRIT-A31 cerraron el **modo
detallado/experto**: el usuario declara explícitamente cada accesorio y
cada tee, el motor calcula sobre la infraestructura física real
declarada. Este registro deja fijado, para no perderlo, el criterio ya
aprobado por el usuario para un **segundo modo alternativo**, pensado
para el uso cotidiano — **sin implementar todavía ningún código**.

**Los dos modos son ALTERNATIVOS, nunca aditivos**: no se suman pérdidas
estimadas + pérdidas detalladas para las mismas singularidades — eso
duplicaría la pérdida. La arquitectura futura deberá poder distinguir
inequívocamente `estimado` vs. `detallado` (posiblemente un campo
explícito a nivel Proyecto o Local/red), pero introducir ese campo no es
parte de este registro.

**Modo estándar/estimado — criterio aprobado**:

- El usuario NO declara cada tee, orientación ni cada singularidad
  física — IUAS estima las pérdidas localizadas según la complejidad de
  cada `Local + red física` (AF/AC evaluadas por separado, nunca
  cantidad bruta de `Artefacto`: un artefacto puede ser soloAF, AF+AC u
  otra conectividad declarada, CRIT-A15).
- **Tees estimadas**: para cada `Local + red`, con `n` = cantidad de
  terminales físicos de esa red en ese Local:
  ```text
  N_tees_estimadas = max(0, n - 1)
  ```
  Ejemplos: 1 terminal → 0 tees; 2 → 1; 3 → 2; 4 → 3.
- **`Ks` conservador de tee estimada**: `Ks_estimado_tee = 3,00` (el
  MAYOR de las 3 variantes de Tabla N°7,
  `teeEntradaCentralSalidasLaterales`). No afirma que todas las tees
  reales tengan ese `Ks` — es una adopción deliberadamente conservadora
  ante geometría no relevada, para no subestimar la pérdida localizada.

#### Velocidad de referencia del modo estimado — RESUELTA

**Decisión** (evaluada contra significado físico, riesgo de sub/sobre-
estimar, comportamiento con diámetros distintos por ramal, con varios
terminales, coherencia conservadora y estabilidad topológica — ver
checkpoint presentado al usuario, confirmado sin decisión roja
adicional):

```text
V_ref(Local, red) = MAX velocidadReal_mps entre los tramos que
                     alimentan DIRECTAMENTE cada terminal físico de
                     ese Local+red (el tramo cuyo nodoDestinoId es el
                     terminal — nunca todo el camino hasta la raíz,
                     que mezclaría velocidades de tramos troncales
                     compartidos con OTROS Locales).
```

**Por qué esta y no "velocidad del tramo distribuidor del Local"**: esa
alternativa exige inventar un concepto topológico que el modelo no
tiene (qué tramo es "el" distribuidor de un Local — no siempre existe
un único tronco bien definido) y no garantiza ser conservadora (el
diámetro comercial del tronco puede dar una V menor O mayor que la de
los ramales, según qué diámetro resultó admisible en cada segmento).
`V_ref` como máximo de velocidades reales YA calculadas por la capa
comercial nunca subestima `Js` (∝V²), es robusta ante diámetros
distintos por ramal (el ramal más angosto domina automáticamente),
escala con más terminales sin perder estabilidad, y es coherente con el
mismo principio conservador ya adoptado para `Ks=3,00` (peor caso
conocido, nunca inventar geometría).

**Alcance final — qué se estima y qué NO**: de todo el método general de
pérdidas localizadas estimadas (tees + codos + curvas + llaves + etc.),
esta implementación cubre **únicamente tees**. No hay en el repo ni en
el dominio conocido ninguna base normativa ni topológica para inferir
cantidades de codos/curvas/llaves sin relevamiento físico real — modo
estándar simplifica el relevamiento, no inventa infraestructura con
falsa precisión. Si en el futuro aparece evidencia legítima para
estimar otro accesorio de Tabla N°7, se agrega como una magnitud más al
mismo mecanismo (mismo Local+red, misma `V_ref`), sin rediseñar el
contrato.

**Contrato implementado**:

- `Proyecto.configuracionHidraulica.metodoPerdidaLocalizada: 'detallado' | 'estimado'`
  (`src/modelo/proyecto/index.ts`) — selección única y global del
  Proyecto, mismo patrón que `metodoPerdidaDistribuida`. Obligatoria: no
  hay estado intermedio "Proyecto sin metodología todavía".
- `contarTerminalesFisicosDeLocal` (`motor/tuberias/topologia/`) — cuenta
  `n` por inspección estructural directa (Nodo → tramo entrante →
  `Tramo.red`), mismo patrón que `determinarConectividadFisica`
  (CRIT-A15): un artefacto con conectividad AF+AC tiene dos Nodos
  terminales (misma referencia), cuenta una vez en cada red por
  separado, nunca colapsado en una ni duplicado como dos artefactos.
- `resolverPerdidaLocalizadaEstimadaDeLocal` (`motor/tuberias/presion/`)
  — `N_tees_estimadas=max(0,n-1)`; si es 0, `hf_m=0` sin necesitar
  resolver ninguna velocidad (Js=0 no depende de V); si no, resuelve
  `V_ref` sobre los tramos terminales vía `resolverDiametroComercialDeTramo`
  (ya productivo) y compone con `calcularPerdidaCargaLocalizada`
  (CRIT-A26, sin fórmula nueva). Barrera de completitud propia:
  `'incompleta'` si algún tramo terminal no resuelve diámetro comercial
  (`sinDemanda`/`sinCandidatoAdmisible`) — nunca una suma parcial.
- `CoberturaDePerdidaLocalizada` (`resolverBalanceDePresion.ts`) gana la
  variante `'estimada'` — cuenta igual que `'completa'` para cerrar el
  balance (nunca igual que `'parcial'`/`'ausente'`): **"estimado" NO
  significa "parcial"**, es una metodología distinta, también completa
  dentro de sí misma. Los dos modos son estrictamente ALTERNATIVOS:
  `resolverPresionResidualDeCamino` elige uno solo según
  `metodoPerdidaLocalizada` y nunca sesga/mezcla ambos para el mismo
  camino — modo estimado ignora por completo `Tramo.accesorios` y
  `Nodo.tee` (nunca invoca `acumularPerdidaLocalizadaDeCamino`), modo
  detallado sin cambios de comportamiento.

**Qué es decisión IUAS vs. qué proviene de ERAS**: `Ks_estimado_tee=3,00`
y `V_ref=máxima velocidad entre tramos terminales` son adopciones IUAS
(conservadoras, no textuales de ERAS-2023). `N_tees=max(0,n-1)` es
inferencia geométrica IUAS (una tee por unión adicional más allá de la
primera). La fórmula `Js=Ks·V²/2g` y el propio `Ks=3,00` como valor de
Tabla N°7 (`teeEntradaCentralSalidasLaterales`) sí son de ERAS-2023
(CRIT-A26/CRIT-A31) — lo que IUAS decide es *adoptarlo* como estimador
conservador cuando la orientación real no se releva, no su valor
normativo en sí.

**Limitaciones conocidas**: no estima ningún accesorio más allá de
tees; no distingue AF/AC más allá de contarlas por separado (ya
correcto); no considera un Local con terminales en más de un "grupo"
físico distante entre sí (el modelo no tiene esa noción — `V_ref` toma
el máximo entre TODOS los tramos terminales de ese Local+red, sin
importar cuán separados estén dentro del Local).

**Estado**: IMPLEMENTADA para tees (código, tests, ver commit "feat:
modo estandar/estimado de perdidas localizadas"). Sigue sin decidir
—deliberadamente fuera de este alcance— si en el futuro conviene
estimar además otros accesorios de Tabla N°7.

### D-δ.41 — Completitud real de Módulo 2 (`EstadoModulo2`) — IMPLEMENTADA

**Objetivo**: una primitiva de dominio, independiente de UI, que responda
si M2 puede resolver la instalación hidráulica **dentro del alcance
actualmente implementado** — nunca mediante heurísticas visuales
("¿hay campos cargados?", "¿el usuario abrió la sección?"). Implementada
en `motor/modulo2/resolverEstadoModulo2.ts`.

**Investigación previa (no duplicar un segundo sistema)**: el repo ya
tenía, distribuidas en al menos 8 uniones discriminadas independientes
(`ResultadoPresionResidualDeCamino` con 9 variantes, `CoberturaDePerdidaLocalizada`
con 4, `ResultadoTerminalMasDesfavorable` con 3, `AuditoriaDeCoberturaFisica`,
`ResultadoValidacion`/`ProblemaValidacion`, etc.), toda la información
atómica necesaria — pero ningún archivo las unificaba en un estado único
de módulo. `EstadoModulo2` es exactamente ese vacío, implementado como
función pura que **compone** esas primitivas (nunca reimplementa una
fórmula ni una barrera ya expresada por ellas). El contrato genérico
preexistente `motor/contrato.ts` (`FuncionDeCalculo`/`ResultadoDeCalculo`,
Arquitectura Sec.10.1) es un nivel de abstracción distinto — memoria de
cálculo por pasos/verificaciones para reporte, no estado de completitud
de módulo — y no se reutiliza porque resuelve un problema distinto.

**Contrato final**:

```ts
type EstadoModulo2 =
  | { estado: 'noIniciado' }
  | { estado: 'incompleto'; motivos: readonly DiagnosticoIncompletitudModulo2[] }
  | { estado: 'error'; problemas: readonly DiagnosticoErrorModulo2[] }
  | {
      estado: 'completo'
      terminalMasDesfavorable: Extract<ResultadoTerminalMasDesfavorable, { tipo: 'determinado' }>
      terminalesFueraDeAlcance: readonly DiagnosticoTerminalFueraDeAlcanceModulo2[]
    }

function resolverEstadoModulo2(
  proyecto: Proyecto,
  presionDisponible_mca: number | undefined, // condición de borde explícita, D-δ.36 — igual que resolverPresionResidualDeCamino
  hfMedidor_mca: number | undefined,          // dato externo explícito, D-δ.35 — idem
  catalogoArtefactos, catalogoSistemasDeTuberia, catalogoMateriales,
): EstadoModulo2
```

Los diagnósticos son datos estructurados (tipo + `nodoId`/`tramoId`/
`problema` original), nunca strings de presentación — la futura UI
decide cómo mostrarlos ("faltan longitudes en 3 tramos") sin volver a
tocar hidráulica.

**Semántica de cada estado**:

- **`noIniciado`**: `proyecto.redHidraulica === undefined` — única señal
  autoritativa de "M2 no empezó" (el propio modelo la documenta así). Es
  un *gate* previo a todo lo demás, no un peldaño de la cadena
  error>incompleto>completo: una red presente aunque vacía (`{nodos:[],
  tramos:[]}`) ya cuenta como "iniciada" y cae en `incompleto`
  (`sinTerminalesHidraulicos`), nunca en `noIniciado`.
- **`error`**: (1) cualquier `ProblemaValidacion` de `validarRedHidraulica`
  o `validarConfiguracionHidraulica` con `severidad==='error'` (ids
  duplicados, referencia rota, tee mal formada, longitud incompatible
  con cota — CRIT-A20, sistema de tubería inexistente/incompatible...);
  se evalúa **antes** de tocar el pipeline por terminal, porque ese
  pipeline asume como precondición que `validarRedHidraulica` ya pasó
  (llamarlo sobre una red inválida podría lanzar). (2) `topologiaNoResoluble`
  por terminal (`multiplesTramosEntrantes`/`ciclo`, CRIT-A27) — la
  estructura, no un dato, es lo que está mal. Nunca se usa `error` por
  simple ausencia de información.
- **`incompleto`**: falta de información/resolución legítima, nunca
  inconsistencia. Motivos reales encontrados por composición:
  `sinTerminalesHidraulicos` (red iniciada, cero terminales aún),
  `coberturaFisicaIncompleta` (D-δ.26, artefacto normativo de M1 sin
  representar), `presionDisponibleNoProvista`, `desnivelIncompleto`,
  `perdidaDistribuidaIncompleta`, `perdidaLocalizadaIncompleta` (modo
  detallado) / `perdidaLocalizadaEstimadaIncompleta` (modo estimado),
  `balanceIncompleto` (incluye falta de `hfMedidor_mca`), y
  `sinTerminalesConPresionMinimaPublicada` (ver más abajo).
- **`completo`**: todos los terminales relevantes resolvieron
  `balanceCompleto` (bajo la metodología de pérdida localizada
  configurada, `'detallado'` o `'estimado'` — **ambas cuentan igual**,
  `estimada` nunca se trata como `parcial`) y
  `resolverTerminalMasDesfavorable` sobre ellos resultó `'determinado'`.
  El fallback de Vmin (CRIT-A24/D-δ.27, `velocidadPorDebajoDelMinimo=true`)
  sigue siendo `conCandidato` en la capa comercial, así que nunca
  degrada `completo` a `incompleto`/`error` — verificado por test de
  regresión explícito.

**Precedencia adoptada**: `noIniciado` (gate previo) → `error` →
`incompleto` → `completo`. Un proyecto con una inconsistencia real Y
además datos faltantes en otro terminal siempre resuelve `error` (nunca
`incompleto`) — test explícito de coexistencia.

**hfMedidor_mca (D-δ.35) y hfEquipoACS (D-δ.15) — alcance vs. features
diferidas**: `hfMedidor_mca` es un parámetro externo explícito, igual que
en `resolverPresionResidualDeCamino` — la inexistencia de M3 (quién lo
calcula) NO impide llegar a `completo`; si el llamador lo provee (hoy,
un test; mañana, quien sea), M2 puede cerrar. `hfEquipoACS` sigue
diferido y ni siquiera aparece en la firma de `resolverBalanceDePresion`
— por lo tanto tampoco en esta primitiva. Principio general adoptado:
**completitud se evalúa contra el alcance ya implementado y aprobado de
M2, nunca contra una feature explícitamente diferida.**

**Decisión de diseño no trivial — terminal sin `presionMinima_kgcm2`
publicada** (p.ej. `maquinaLavavajillas`, `piletaDeCocinaIndustrial`):
`resolverPresionResidualDeCamino` ya documenta que esto "no es un error
de uso... es un terminal que este balance no puede cerrar" — una
limitación normativa **permanente** de ese artefacto (ERAS no publica su
Pmin), no información que vaya a completarse después. Tratarlo como
`incompleto` bloquearía `completo` para siempre en cualquier proyecto
que incluya ese artefacto, lo cual vacía de sentido la primitiva.
Composición adoptada: se **excluye** de los candidatos a
`resolverTerminalMasDesfavorable` y se reporta aparte
(`terminalesFueraDeAlcance`, diagnóstico informativo, nunca bloqueante)
— mismo principio ya usado con griferías en CRIT-A29 (fuera de alcance
normativo, no vacío de cobertura). Si **todos** los terminales de un
proyecto quedan excluidos por este motivo, se devuelve `incompleto`
(`sinTerminalesConPresionMinimaPublicada`) en vez de `completo` vacío —
nunca se declara `completo` sin un `terminalMasDesfavorable` real.

**Qué NO evalúa esta primitiva (deliberadamente, no reimplementado)**:
validez de M1 en sí (`proyectoSinArtefactosComputables`, etc. — son
barreras de M1, no de M2); Pdisponible/hfMedidor como *quién* los
produce (bombeo, tanque, M3); redes malladas; hfEquipoACS; UI/tabs.

**Tests**: `motor/modulo2/resolverEstadoModulo2.test.ts` — 13 casos:
`noIniciado` (2, incluida red vacía), `incompleto` (5: dato faltante real,
Pdisponible ausente, hfMedidor ausente, accesorios sin relevar, cobertura
física incompleta), `error` (2: referencia rota, y coexistencia con un
incompleto real para probar precedencia), `completo` (4: modo detallado,
modo estimado con terminal crítico verificado contra el propio motor,
regresión CRIT-A24/D-δ.27, y exclusión de terminal sin Pmin publicada).

### D-δ.42 — Cierre funcional de la UI de Módulo 2 (velocidad, pérdidas localizadas, presión) — IMPLEMENTADA

**Objetivo**: el motor hidráulico de M2 estaba muy avanzado (D-δ.32 a
D-δ.41) pero la web local no exponía capacidades ya cerradas —
verificación de velocidad, gestión de accesorios/tees, y balance de
presión eran invisibles para el usuario aunque el dominio ya las
resolvía. Este registro cierra esa brecha **sin tocar hidráulica**:
React edita entradas, invoca primitivas existentes y muestra resultados
existentes — ninguna fórmula ni regla de validación (Vmin/Vmax, Ks,
selección de DN, cobertura, balance, terminal crítico) se duplicó en un
componente.

**Verificado manualmente contra la web real** (Playwright headless, no
solo tests unitarios): se llevó un terminal real del proyecto de
ejemplo (`Unidad funcional 1 → Jardín → Canilla de servicio`) hasta
`balanceCompleto` cargando únicamente datos por UI — longitud de dos
tramos, cota de dos nodos, relevamiento de accesorios (`[]`), Pdisponible
y hfMedidor — sin recargar la página ni tocar código. Resultado
correcto y consistente con la fórmula ya cerrada
(`Presidual = Pdisponible − Δz − hfDistribuida − hfLocalizada − hfMedidor`),
`Terminal más desfavorable` mostró `candidatoProvisional` (correcto:
solo 1 de ~16 terminales completo) hasta corregir un error real
detectado en esta misma verificación (ver más abajo). Cero errores de
consola en toda la corrida.

**Bug real encontrado y corregido durante la verificación manual**: la
primera versión de `PanelDePresionDeModulo2` prefiltraba los candidatos
a `resolverTerminalMasDesfavorable` (solo pasaba los ya `balanceCompleto`),
lo que forzaba siempre `'determinado'` aunque el resto de los terminales
del proyecto siguiera incompleto — exactamente la distinción que esa
primitiva fue diseñada para expresar (M2-B: `'determinado'` vs.
`'candidatoProvisional'`). Corregido pasando **todos** los candidatos sin
prefiltrar. Este es el tipo de defecto que la instrucción del usuario
("no copiar lógica de... terminal crítico") buscaba evitar — se coló por
una integración apresurada, no por reinterpretar la fórmula, y la propia
prueba manual end-to-end lo expuso antes de cerrar el incremento.

#### Capacidades del motor que quedaron expuestas

- **Verificación de velocidad (CRIT-A19/CRIT-A24)**: nuevas columnas "V
  admisible [m/s]" y "Verificación" en la tabla de tramos de
  `ResultadoHidraulicoDeTramo.tsx`. Nunca se recalcula Vmin/Vmax ni el
  resultado de admisibilidad — se leen tal cual de
  `ResultadoVerificacionVelocidad`. Distinción de UX deliberada (no de
  cálculo): mientras `velocidadPorDebajoDelMinimo` sea `true` (fallback
  terminal de CRIT-A24/D-δ.27), el texto nunca dice "no admisible" ni usa
  lenguaje de advertencia — se presenta como "Aceptada en el menor
  diámetro comercial (CRIT-A24)", una aceptación normativa explícita, no
  una alarma accionable (no hay ninguna acción de dimensionamiento
  posible en ese caso). Verificado por test y por la corrida manual
  (aparece naturalmente en el proyecto de ejemplo, en Cocina/Lavadero
  AC).
- **Selector de metodología de pérdida localizada (D-δ.40)**: `<select>`
  "Pérdidas localizadas: Detalladas / Estimadas" en
  `ConfiguracionHidraulicaFormulario`, ligado a `conMetodoPerdidaLocalizada`
  (nuevo updater, mismo patrón que `conMetodoPerdidaDistribuida`). Cambiar
  de método nunca borra `Tramo.accesorios`/`Nodo.tee` ya persistidos —
  solo deja de usarlos mientras el modo activo sea `'estimado'`.
- **Editor de accesorios de Tramo (CRIT-A26/A28/A30)**: `AccesoriosDeTramoEditor.tsx`,
  montado como fila expandible bajo cada tramo de la tabla (solo modo
  `'detallado'`). Persiste únicamente `{tipo, cantidad}` vía el nuevo
  updater `conAccesoriosDeTramo` — nunca Ks (se resuelve siempre desde
  Tabla N°7). Distingue "no relevado" (`undefined`, botón "Relevar
  accesorios") de "relevado sin accesorios" (`[]`, texto explícito) tal
  como exige el modelo. Alcance: cubre los tramos ya visibles en las
  tablas de M2 (distribución general + principal de cada Local) — los
  tramos terminales individuales hacia cada Artefacto (ocultos de esas
  tablas por diseño, ver `identificarFilasDeModulo2.ts`) no tienen
  todavía superficie de edición propia (deuda, ver abajo).
- **Editor de tees (CRIT-A31)**: `TeeDeNodoEditor.tsx` + primitiva nueva
  `identificarNodosDeBifurcacion` (motor/tuberias/topologia/, estructural,
  1 entrante + 2 salientes). Sección "Tees (bifurcaciones)" separada de
  la tabla de tramos (las tees viven en Nodo, no en Tramo) que lista
  **todas** las bifurcaciones de la red completa, no solo las de los
  tramos "principales". Persiste únicamente `ConfiguracionDeTee` vía el
  nuevo updater `conTeeDeNodo` — nunca Ks, ángulos, coordenadas ni
  orientación absoluta. Si la topología queda incoherente, la
  inconsistencia la reporta `validarRedHidraulica` (S2 ya existente); el
  editor no infiere ni corrige nada.
- **Resumen del modo estimado (D-δ.40)**: `ResumenEstimadoPorLocal`, una
  tabla por `(Local, red)` con `n`, tees estimadas, `V_ref`, `hf` —
  producida por `resolverPerdidaLocalizadaEstimadaDeLocal` sin ningún
  editor de geometría detallada (D-δ.40 ya cerró que eso sería falsa
  precisión). La palabra "estimada" queda siempre explícita en la
  cobertura mostrada, nunca "parcial"/"incompleta".
- **Verificación de presión (M2-B)**: `PanelDePresionDeModulo2.tsx`, la
  pieza central de este incremento. Por cada terminal (nodo con
  referencia a Artefacto): Δz, hfDistribuida, hfLocalizada (con su
  metodología activa), hfMedidor, Presidual, Pmin, margen y un estado
  textual derivado 1:1 del `tipo` de `ResultadoPresionResidualDeCamino`
  (nunca una heurística nueva). Debajo, `Terminal más desfavorable`
  usando `resolverTerminalMasDesfavorable` sobre **todos** los
  candidatos (ver corrección de bug arriba).
- **`Pdisponible` y `hfMedidor` como inputs manuales**: dos `<input
  type="number">` con unidad visible (m.c.a.) en el propio panel, **sin
  persistirse en `Proyecto`** — viven como `useState` local del panel.
  Esta fue la decisión de diseño explícita para evitar la decisión roja
  que el brief anticipaba ("si esto exige nueva persistencia de dominio,
  puede ser decisión roja"): como el modelo ya declara `Pdisponible`
  como condición de borde abstracta (D-δ.36) y `hfMedidor_mca` como dato
  externo (D-δ.35) — ninguno de los dos tiene, ni debe tener todavía, un
  campo persistido en `Proyecto` — mantenerlos como estado efímero de UI
  es la opción **consistente con el propio modelo de dominio**, no un
  atajo. Se pierden al recargar la página, igual que el resto del
  Proyecto (que tampoco persiste hoy). El input de hfMedidor rotula
  explícitamente: "dato hidráulico de entrada para M2 — no representa
  una selección comercial de medidor" (M3 no existe todavía).
- **Cota de Nodo, nueva capacidad menor no listada originalmente**: al
  intentar demostrar `balanceCompleto` end-to-end (ver prueba manual)
  se descubrió que el proyecto de ejemplo no tiene ningún `cota_m`
  seteado y no había ninguna forma de editarlo desde la UI —
  `resolverDesnivelDeCamino` no podía resolver Δz para NINGÚN terminal
  real, bloqueando permanentemente el criterio de éxito de esta corrida.
  Se agregó el updater `conCotaDeNodo` (mismo patrón que
  `conLongitudDeTramo`) y un input de cota tanto para cada terminal
  (dentro de la tabla de presión) como para los nodos raíz (sección
  "Cota del nodo raíz", identificados estructuralmente por no tener
  ningún tramo entrante). Consecuencia técnica necesaria del objetivo ya
  aprobado, no ampliación de alcance.
- **`resolverEstadoModulo2` (D-δ.41, secundario)**: una línea de estado
  ("Estado de Módulo 2: Completo/Incompleto (N motivos)/Error (N
  problemas)/No iniciado") en la parte superior del panel de presión —
  sin diseño visual nuevo, sin tabs, tal como pedía el alcance.

#### Qué sigue siendo exclusivamente dominio (no se tocó)

Ninguna fórmula: Hazen-Williams/Darcy-Weisbach, Ks de Tabla N°7,
selección de DN comercial (CRIT-A23/A24), clasificación de tee
(CRIT-A31), `resolverBalanceDePresion`, `resolverTerminalMasDesfavorable`,
`resolverPerdidaLocalizadaEstimadaDeLocal`. Ningún componente reimplementa
ninguna de estas reglas ni recalcula lo que el motor ya devuelve.

#### Deuda de UI restante (deliberadamente fuera de esta corrida)

- Accesorios sobre tramos terminales individuales (ocultos de las tablas
  de M2 por diseño) sin superficie de edición propia.
- Sin selector de Local/UF amigable en el panel de presión más allá del
  texto ya producido por `describirReferenciaPendiente` (reutilizado, no
  duplicado).
- Sin persistencia de `Pdisponible`/`hfMedidor` entre recargas (mismo
  estado que el resto del Proyecto hoy).
- Tabs M1/M2/M3/M4, React Router, M3 funcional, selección comercial de
  medidor, `hfEquipoACS`, presurizador, redes malladas, editor gráfico:
  explícitamente diferidos, sin cambios en esta corrida. Las tabs quedan
  diferidas hasta después de este cierre funcional porque no tenía
  sentido reorganizar la navegación de una UI que todavía no exponía las
  capacidades centrales del módulo que se está por reorganizar.

**Archivos nuevos**: `interfaz/paginas/AccesoriosDeTramoEditor.tsx`,
`interfaz/paginas/TeeDeNodoEditor.tsx`, `interfaz/paginas/PanelDePresionDeModulo2.tsx`,
`motor/tuberias/topologia/identificarNodosDeBifurcacion.ts`. **Updaters
nuevos**: `conAccesoriosDeTramo`, `conTeeDeNodo`, `conCotaDeNodo`
(`actualizarRedHidraulica.ts`), `conMetodoPerdidaLocalizada`
(`actualizarConfiguracionHidraulica.ts`).

**Estado**: IMPLEMENTADA y verificada manualmente contra la web real.

### D-δ.43 — Rediseño funcional / UX hidráulica de Módulo 2 — IMPLEMENTADA

**Objetivo**: D-δ.42 cerró que el motor hidráulico ya era accesible
desde la web, pero la revisión visual posterior encontró que la
interfaz seguía siendo una vista de depuración del grafo interno: tabla
de 13 columnas con scroll horizontal, sección global "Tees
(bifurcaciones)" con ids técnicos de Nodo/Tramo (`n-af-1`,
`t-af-toilette-lavatorio`), AF/AC sin distinguir claramente, condición
de borde de presión (`Pdisponible`/cota) demasiado abstracta para
representar físicamente un tanque elevado. Este registro cierra esa
brecha **sin tocar hidráulica ni el contrato del motor** -- todo lo que
cambia es cómo React organiza y rotula lo que el motor ya devuelve.

#### Local + Red como unidad de trabajo (slice 1)

La tabla ancha y la sección global de tees desaparecen. En su lugar,
`LocalYRedCard.tsx` agrupa toda la infraestructura de un `(Local, Red)`
en una sola tarjeta:

- `construirArbolDeLocal.ts` reconstruye la topología real de ese
  Local+Red como árbol, partiendo del Tramo principal ya identificado
  por `identificarFilasPrincipalesDeLocales` (sin heurística de string
  de id). No asume binariedad: un nodo con más de 2 salientes (manifold
  plano, como el Baño del proyecto de ejemplo -- 4 Artefactos desde un
  único nodo) simplemente aparece con más de 2 ramales y sin tee que
  declarar -- CRIT-A31 nunca aplicó ahí, no es una limitación nueva.
- Cada nivel del árbol se presenta con `DimensionamientoDeTramo.tsx`
  (reemplaza `FilaResultado`/`TablaDeFilas`): Qc/DN/V/Verificación
  visibles sin scroll horizontal, con Refs. físicas/n/Di teórico/Di
  real/Vmin-Vmax/hf en un `<details>` expandible. Mismo criterio ya
  cerrado de D-δ.27/CRIT-A24 (nunca "no admisible" cuando
  `velocidadPorDebajoDelMinimo` es cierto), verificado por test.
- Cada nodo de bifurcación real (1 entrante + 2 salientes,
  `identificarNodosDeBifurcacion`) muestra `TeeDeNodoEditor` **inline**,
  dentro de la tarjeta de su Local+Red -- ya no en una sección aparte.
  El editor recibe las etiquetas de cada salida ya humanizadas por el
  llamador (`humanizarModulo2.nombresDeArtefactosAguasAbajo`, nombres de
  Artefacto de catálogo) en vez de mostrar el tramoId.
- Cada ramal terminal (Tramo hacia un Artefacto) tiene su propio
  `AccesoriosDeTramoEditor` -- cierra la deuda que D-δ.42 había dejado
  explícita (tramos terminales sin superficie de edición propia).
- `humanizarModulo2.ts` centraliza `ETIQUETA_RED` (Agua fría/Agua
  caliente) y el nombre de catálogo de un Artefacto referenciado -- la
  UI normal deja de mostrar cualquier id de Nodo/Tramo.

Verificado con Playwright headless contra la web real: tee de Cocina
configurable ("Pileta de cocina es la recta"/"Máquina lavavajillas es
la recta"), accesorios relevables en el tramo de alimentación y en cada
ramal, ninguna sección "Tees (bifurcaciones)" en el HTML, cero errores
de consola.

#### Panel de presión: alimentación física + completitud accionable (slice 2)

`PanelDePresionDeModulo2.tsx` se reorganiza sin tocar el contrato del
motor (`Pdisponible`/`hfMedidor_mca` siguen siendo condiciones de borde
externas, no persistidas en `Proyecto` -- D-δ.35/D-δ.36 no se
reabrieron):

- **Tipo de alimentación** (nuevo selector de presentación, NO una
  entidad de dominio nueva): "Tanque elevado" fija `Pdisponible=0` y
  pide únicamente la "Cota del pelo de agua mínimo de cálculo" (D-δ.38:
  la raíz hidráulica es el pelo de agua **mínimo**, nunca el máximo, sin
  reabrir esa decisión) -- oculta el input manual de Pdisponible, que no
  tiene sentido físico en ese caso. "Presión conocida / alimentación
  directa" conserva el contrato ya vigente (cota del punto de
  alimentación + Pdisponible manual). Ambas opciones escriben sobre los
  mismos campos que ya existían (`conCotaDeNodo`, estado local de
  Pdisponible) -- ninguna persistencia nueva.
- **Cota de conexión**: "Cota [m]" pasa a "Cota de conexión [m]" en
  cada terminal (CRIT-A29: el punto de verificación es la boca/conexión
  del artefacto, ya cerrado -- solo se hizo explícito en el rótulo).
- **Completitud accionable**: `agruparMotivosDeModulo2.ts` agrupa
  `EstadoModulo2.motivos` (ya estructurados por `resolverEstadoModulo2`,
  D-δ.41) en líneas de texto por tipo con conteos deduplicados (p.ej.
  "Faltan cotas de conexión en 17 puntos") -- puramente de presentación,
  nunca infiere un motivo nuevo ni expone ids de Nodo/Tramo.
- **Terminales como tarjetas**, no una fila más de una tabla de 11
  columnas: `TarjetaDeTerminal` muestra Presidual/Pmin/margen/estado en
  la superficie principal, con Δz/hfDistribuida/hfLocalizada
  (+metodología)/hfMedidor/carga geométrica en un `<details>`. "Carga
  geométrica" (`Pdisponible - Δz`) es el primer término parcial de la
  misma resta que ya expone `resolverBalanceDePresion` -- no es una
  fórmula nueva, es aritmética de presentación sobre dos operandos ya
  conocidos.
- **Terminal más desfavorable**: dejó de mostrar el `nodoId` crudo --
  ahora usa `describirReferenciaPendiente` (mismo helper ya usado en el
  resto de la UI), buscando el Nodo por id solo para resolver su
  `referencia`.

Verificado con Playwright headless: seleccionar "Tanque elevado" oculta
el input manual de Pdisponible y pide la cota mínima; cambiar cotas de
raíz/terminal actualiza el estado reactivamente (`resolverDesnivelDeCamino`
resuelve Δz apenas ambos extremos tienen cota, sin necesitar cotas
intermedias -- ver investigación abajo); "Terminal más desfavorable" y
cada tarjeta de terminal nunca muestran un id crudo (`>n-`); cero
errores de consola en toda la corrida.

#### Investigación de cotas intermedias (sección 33 del brief) -- CERRADA sin cambios

`resolverDesnivelDeCamino.ts` (ya productivo, sin tocar) documenta
explícitamente que Δz se resuelve **solo con las cotas de los dos
extremos** del camino (`cotaTerminal_m - cotaRaiz_m`) -- las cotas de
nodos intermedios nunca se piden ni se usan; el comentario del archivo
ya explica por qué (`Σ(cota[i+1]-cota[i])` telescopa exactamente a
`cotaTerminal-cotaRaiz` cuando todas están presentes, pero exige *todas*
las cotas del camino; la forma de extremos exige solo dos). La UI ya
solo pedía cota de raíz + cota de terminal antes de este incremento, así
que no había ninguna brecha que cerrar ni ninguna decisión roja que
tomar acá -- se documenta el hallazgo porque el brief pedía
explícitamente investigarlo, no porque haya cambiado algo.

#### Qué sigue siendo exclusivamente dominio (no se tocó)

Ninguna fórmula ni regla de validación cambió: Hazen-Williams/
Darcy-Weisbach, Ks de Tabla N°7, clasificación de tee (CRIT-A31),
`resolverBalanceDePresion`, `resolverTerminalMasDesfavorable`,
`resolverDesnivelDeCamino`, `resolverEstadoModulo2`. El contrato
`Pdisponible`/`cotaRaiz`/`hfMedidor_mca` del motor no cambió -- "Tipo de
alimentación" es una traducción de presentación sobre ese mismo
contrato, nunca una entidad `OrigenHidraulico` persistida (eso sigue
fuera de alcance, ver D-δ.38).

#### Deuda de UI restante (deliberadamente fuera de esta corrida)

- Modelo "cota de piso + altura de conexión" (sección 32 del brief):
  identificado explícitamente como decisión roja (exige nueva
  persistencia/semántica sobre `Nodo.cota_m` o una entidad nueva) -- NO
  implementado. La cota de conexión sigue siendo un único input manual
  por terminal.
- Sin persistencia de `Pdisponible`/`hfMedidor`/tipo de alimentación
  entre recargas (mismo estado efímero que el resto del Proyecto hoy).
- Tabs M1/M2/M3/M4, React Router, M3 funcional, selección comercial de
  medidor, `hfEquipoACS`, presurizador, redes malladas, editor gráfico:
  siguen explícitamente diferidos.
- El modo estimado (D-δ.40) mantiene su resumen agregado por Local+Red
  (ahora embebido en `LocalYRedCard`, ya no en una tabla aparte de todo
  el proyecto) -- sigue sin editor de geometría detallada, por diseño.

**Archivos nuevos**: `interfaz/paginas/construirArbolDeLocal.ts`,
`interfaz/paginas/humanizarModulo2.ts`,
`interfaz/paginas/resolverResultadoDeTramoParaUi.ts`,
`interfaz/paginas/DimensionamientoDeTramo.tsx`,
`interfaz/paginas/LocalYRedCard.tsx`,
`interfaz/paginas/agruparMotivosDeModulo2.ts`. **Sin cambios de
contrato del motor ni updaters nuevos** -- reutiliza `conCotaDeNodo`/
`conLongitudDeTramo`/`conAccesoriosDeTramo`/`conTeeDeNodo` ya
existentes.

**Estado**: IMPLEMENTADA y verificada manualmente contra la web real
(Playwright headless, dos corridas: slice 1 sobre Local+Red/tees/
accesorios, slice 2 sobre el panel de presión).

### D-δ.44 — Corrección de granularidad de relevamiento físico de D-δ.43 — IMPLEMENTADA

**Problema**: la revisión posterior a D-δ.43 detectó que el slice 1
había convertido los ramales terminales internos (Tramo hacia cada
Artefacto) en unidades de relevamiento del usuario -- cada ramal
mostraba su propio input de Longitud y su propio editor de Accesorios.
Investigación (no una interpretación libre, ver evidencia): ese
requisito -- que **cada Tramo físico real del camino** (incluida la
rama final hacia el Artefacto) tenga su propia `longitud_m`/`accesorios`
para llegar a `balanceCompleto` -- ya existía desde antes de D-δ.43 en
`acumularPerdidaDistribuidaDeCamino`/`acumularPerdidaLocalizadaDeCamino`
(D-δ.25/D-δ.33), confirmado por un golden test ya existente y sin
tocar (`resolverPresionResidualDeCamino.test.ts`, `hfDistribuida =
J·(L0+L1)` sumando dos Tramos reales de un mismo camino) y por
arqueología de commits: antes de D-δ.43 ningún Local con más de un
Artefacto (Baño, Cocina, Toilette, Lavadero del proyecto demo) podía
llegar nunca a `balanceCompleto` -- solo Jardín (un único Artefacto por
red, donde el Tramo "principal" y el terminal son el mismo Tramo)
podía completarse, coincidiendo exactamente con el "1 de 16" que
reportó D-δ.42. D-δ.43 no introdujo el requisito: expuso un editor que
lo hacía satisfacible, pero con la granularidad equivocada.

**Decisión del usuario**: dos granularidades de cálculo hidráulico,
seleccionables por Proyecto, NUNCA fusionadas silenciosamente con
`MetodoPerdidaLocalizada`:

```ts
export type GranularidadHidraulica = 'simplificada' | 'profesional';
```

- **'profesional'**: comportamiento ya existente, sin cambios -- cada
  Tramo real del camino exige su propia longitud/accesorios (permite
  modelar recorridos internos distintos hasta cada Artefacto).
- **'simplificada'** (nuevo default del proyecto de ejemplo): la unidad
  de relevamiento físico es `(Local, Red)` -- una única
  longitud/lista de accesorios sobre el Tramo **representativo** de
  ese Local+red. Los Tramos más profundos (ramales hacia cada
  Artefacto, incluidos los que salen de una tee anidada) contribuyen
  **0** a hfDistribuida/hfLocalizada por definición del modelo, nunca
  "dato faltante" -- nunca se fabrica `longitud_m=0`/`accesorios=[]`
  ficticios, simplemente esos Tramos no participan de la acumulación.

**Ortogonalidad con `MetodoPerdidaLocalizada` -- investigada, confirmada,
documentada** (no se fusionaron los dos ejes): `MetodoPerdidaLocalizada`
decide CÓMO se calcula la pérdida localizada (relevamiento real vs.
fórmula agregada D-δ.40); `GranularidadHidraulica` decide QUÉ Tramos
físicos participan de la acumulación (distribuida Y localizada). Las 4
combinaciones son coherentes: 'simplificada'+'detallado' es el modo
recomendado por defecto; 'simplificada'+'estimado' es el más rápido;
'profesional'+'detallado' es el comportamiento pre-D-δ.44 íntegro;
'profesional'+'estimado' es válido (precisión profesional en
distribuida, estimación agregada en localizada) aunque menos común. La
tee (CRIT-A31) NUNCA depende de esta granularidad -- sigue
configurándose y aportando Ks por rama real (usa la velocidad propia
de esa rama) en ambos modos; lo único que cambia es si, además del Ks
de la tee, esa rama exige tener sus PROPIOS accesorios en línea
relevados.

**Implementación** (dominio primero, UI después, tal como exigía el
brief):

- `motor/tuberias/topologia/identificarTramoRepresentativoDeLocal.ts`
  (nuevo): promueve la clasificación "qué Tramo es representativo de
  un (Local, Red)" desde `interfaz/paginas/identificarFilasDeModulo2.ts`
  (antes solo una selección de presentación) al motor -- ahora es una
  primitiva de dominio real, porque los acumuladores de pérdida
  también la necesitan. `identificarFilasDeModulo2.ts` pasó a ser un
  envoltorio delgado sobre esta primitiva (sin duplicar el algoritmo);
  sus 15 tests existentes siguen pasando sin modificar una sola
  aserción.
- `motor/tuberias/presion/seleccionarTramosDeAcumulacion.ts` (nuevo):
  dado un camino ya resuelto, separa `tramosRelevables` (Distribución
  General + el representativo, inclusive -- exigen su propia
  longitud/accesorios en ambas granularidades) de `tramosRamal` (solo
  aparece no vacío en 'simplificada'). Defensivo: si ningún Tramo del
  camino es representativo de un Local (topología degenerada), no
  inventa un punto de corte -- preserva el comportamiento 'profesional'
  completo.
- `acumularPerdidaDistribuidaDeCamino.ts`: itera solo
  `tramosRelevables` -- los `tramosRamal` nunca se evalúan, nunca
  aparecen en `porTramo`, nunca bloquean completitud.
- `acumularPerdidaLocalizadaDeCamino.ts`: los `tramosRamal` SÍ se
  evalúan, pero solo para el Ks de tee (si el Nodo de origen es una
  bifurcación real sin tee configurar, sigue bloqueando completitud --
  la tee no depende de la granularidad); su propio
  `Tramo.accesorios` nunca se exige ni se suma. Un ramal que no sale de
  ninguna tee (manifold plano, >2 salientes) contribuye 0 sin necesitar
  siquiera resolver su diámetro comercial.
- Modelo: `GranularidadHidraulica` + `ConfiguracionHidraulica.granularidadHidraulica`
  (obligatorio, mismo criterio que `metodoPerdidaLocalizada`);
  updater `conGranularidadHidraulica` (mismo patrón que los demás en
  `actualizarConfiguracionHidraulica.ts`).
- UI: nuevo selector "Granularidad hidráulica" en
  `ConfiguracionHidraulicaFormulario`. `LocalYRedCard`/`NodoDeArbol`
  (D-δ.43) ahora reciben `granularidadHidraulica`: en 'simplificada',
  solo el Tramo representativo (raíz del árbol) muestra
  Dimensionamiento + editor de Accesorios -- los Nodos más profundos
  (`RamalesSimplificados`, nuevo) se recorren únicamente para
  encontrar tees reales que configurar (inline, sin sección global,
  CRIT-A31 intacto), y al final se lista "Distribución: Lavatorio,
  Ducha, ..." (nombres de Artefacto, nunca ids) sin ningún input
  propio. En 'profesional', comportamiento de D-δ.43 sin cambios.
- **Bug real encontrado y corregido durante esta corrida** (no
  relacionado con granularidad, pre-existente desde D-δ.43 slice 1):
  `DistribucionGeneral` (Alimentación general/ACS) nunca tuvo editor de
  Accesorios -- D-δ.43 lo extrajo de la tabla ancha original sin
  reincorporarlo. Detectado recién al intentar completar
  `balanceCompleto` end-to-end en la prueba manual (ver abajo);
  corregido agregando `AccesoriosDeTramoEditor` a cada fila de
  Distribución General, gateado por `metodoPerdidaLocalizada==='detallado'`
  igual que el resto de la UI.

**Test clave de regresión** (obligatorio, `resolverEstadoModulo2.test.ts`):
un Local con 3 Artefactos (Lavatorio, Ducha, Inodoro a depósito) tras
DOS tees anidadas, con longitud/accesorios SOLO en el Tramo
representativo -- llega a `estado: 'completo'` en 'simplificada' y
queda `'incompleto'` en 'profesional' sobre la MISMA topología
(confirma que el cambio de comportamiento es exclusivo de la
granularidad, no un efecto colateral). Cobertura adicional: 10 tests
nuevos en los acumuladores (`acumularPerdidaDistribuidaDeCamino.test.ts`,
`acumularPerdidaLocalizadaDeCamino.test.ts`) y 5 en la UI
(`ResultadoHidraulicoDeTramo.test.ts`).

**Prueba manual end-to-end** (Playwright headless, sin datos físicos
por Artefacto): con el proyecto demo en 'simplificada' (nuevo default),
se completó longitud+accesorios de "Alimentación general" y del
"Tramo de alimentación" de Baño+AF (2 inputs en total), más
Pdisponible/hfMedidor/cota del punto de alimentación y la cota de
conexión de los 4 terminales del Baño (Lavatorio, Ducha, Bidet,
Inodoro) -- **sin tocar ningún dato de los 4 ramales**. Los 4
terminales resolvieron `Cumple`, `Terminal más desfavorable` mostró el
Lavatorio con `Presidual: 31,34 m.c.a., Pmin: 6,00, margen: 25,34
m.c.a., candidatoProvisional` (distinción D-δ.42 intacta). Cero errores
de consola.

**Decisiones rojas**: ninguna durante esta corrida -- la ortogonalidad
con `MetodoPerdidaLocalizada` se investigó y resultó no ambigua (una
sola semántica plausible, documentada arriba), así que no hizo falta
consultar al usuario.

**Deuda restante**: igual que D-δ.43 (persistencia de Pdisponible/
hfMedidor/granularidad entre recargas, tabs M1-M4, cota de piso +
altura de conexión). Nueva: no se completó `balanceCompleto` para los
9 Local+Red del proyecto demo, solo para Baño+AF (mismo criterio de
alcance que la prueba manual de D-δ.42, que tampoco completó los 16
terminales).

**Archivos nuevos**: `motor/tuberias/topologia/identificarTramoRepresentativoDeLocal.ts`
(+test), `motor/tuberias/presion/seleccionarTramosDeAcumulacion.ts`.
**Archivos de test nuevos/extendidos**: `acumularPerdidaDistribuidaDeCamino.test.ts`,
`acumularPerdidaLocalizadaDeCamino.test.ts`, `resolverEstadoModulo2.test.ts`,
`ResultadoHidraulicoDeTramo.test.ts`. **Sin cambios de contrato
público** de `resolverPresionResidualDeCamino`/`resolverEstadoModulo2`
(ambos ya recibían `proyecto` completo).

**Estado**: IMPLEMENTADA, 768/768 tests, verificada manualmente contra
la web real (Playwright headless, cero errores de consola).

### D-δ.45 — Plantilla típica de pérdidas localizadas del modo rápido — IMPLEMENTADA

> **HYD-EST-01 / D-δ.112 (en implementación):** la cardinalidad histórica
> de una singularidad terminal por Local/Red queda sustituida, por decisión
> explícita del usuario, por una singularidad K=1,35 por terminal físico,
> exclusiva de su camino y calculada con la V de su propio alimentador.
> K no cambia. La plantilla agregada/Vref se reemplaza por cálculo por
> recorrido. El texto siguiente documenta el criterio histórico, no la
> nueva cardinalidad. Detalladas no cambia.

**Objetivo de la corrida**: D-δ.44 cerró la granularidad de relevamiento
físico, pero dejó abierta la pregunta de si `'simplificada'+'estimado'`
constituye realmente un "modo rápido" utilizable de punta a punta sin
relevar accesorios a mano. Este registro documenta la investigación
completa pedida (inventario de Tabla N°7, reconstrucción del estimador
D-δ.40, clasificación de candidatos a plantilla típica) y dos resultados
concretos: un bug de UI real corregido (no ameritaba decisión roja) y
dos decisiones rojas presentadas al usuario y **todavía sin resolver**.

#### Inventario completo de Tabla N°7 (`normativa/eras-2023/tabla-07-perdidas-localizadas`)

| id | nombre | Ks | uso actual en el motor |
|---|---|---|---|
| `griferias` | Griferías | 9,18 | **Excluida a propósito** del balance de red (CRIT-A29, cerrado): se considera resistencia interna del artefacto, ya absorbida por `presionMinima_kgcm2`. Sigue siendo una fila válida de la tabla para cualquier otro uso, pero nunca se agrega como pérdida localizada terminal. |
| `curva45` | Curva a 45º | 0,43 | Solo modo detallado (accesorio declarado a mano) |
| `curva90` | Curva a 90º | 0,81 | Solo modo detallado |
| `codo90` | Codo a 90º | 1,35 | Solo modo detallado |
| `teePasoRecto` | Tee paso recto | 1,00 | Vive nodalmente (CRIT-A31), no en `Tramo.accesorios` |
| `teeSalidaLateral` | Tee salida lateral | 1,62 | ídem |
| `teeEntradaCentralSalidasLaterales` | Tee entrada central, salidas laterales | 3,00 | ídem — además es el `Ks_estimado_tee` conservador de D-δ.40 |
| `llaveDePaso` | Llave de paso | 9,18 | Solo modo detallado — **candidato analizado en esta corrida, ver decisión roja abajo** |
| `uniones` | Uniones | 0,10 | Solo modo detallado |
| `valvulaEsclusa` | Válvula esclusa | 0,17 | Solo modo detallado |
| `reducciones` | Reducciones | 0,75 | Solo modo detallado (CRIT-A30 fija la convención de velocidad, no la estima) |
| `tuboSaliente` | Tubo saliente | 1,00 | Solo modo detallado — **candidato analizado en esta corrida (singularidad del último terminal), ver decisión roja abajo** |

#### Reconstrucción del estimador D-δ.40 vigente

`resolverPerdidaLocalizadaEstimadaDeLocal` (`motor/tuberias/presion/`)
implementa **únicamente** tees estimadas: `N_tees=max(0,n-1)`,
`Ks_estimado_tee=3,00`, `V_ref=` máxima velocidad real entre los tramos
que alimentan directamente cada terminal físico del Local+red (ver
D-δ.40 arriba, sin cambios). `n<=1` corta antes de resolver velocidad
(`hf_m=0` exacto, no aproximado). La UI (`LocalYRedCard.tsx`,
`ResumenEstimadoDeLocal`) ya expone esto con auditabilidad completa
("Ver cálculo": Ks por tee, V referencia, cobertura).

#### Clasificación de candidatos a plantilla típica

- **A. Estructuralmente deducibles**: solo `N_tees=n-1` (ya cerrado,
  D-δ.40). Ninguna otra fila de Tabla N°7 tiene una cantidad que se
  pueda inferir de la topología sin inventar geometría.
- **B. Típicos pero no universales — analizados esta corrida, ver
  decisiones rojas**: singularidad del último terminal (curva90/
  codo90/tuboSaliente) y llave de paso.
- **C. Dependientes de geometría, descartados para el modo rápido**:
  `curva45`, `uniones`, `valvulaEsclusa`, `reducciones` — su cantidad
  depende del recorrido físico real (cuántos codos hace la cañería,
  si hay una reducción de diámetro en el camino) sin ninguna base
  topológica para inferirla; incluirlos automáticamente sería
  fabricar geometría no relevada, exactamente lo que D-δ.40 ya
  rechazó para el alcance actual.

#### Bug de UI encontrado y corregido (NO era decisión roja — consecuencia técnica normal)

**Problema**: `LocalYRedCard.tsx` renderizaba, en
`metodoPerdidaLocalizada==='estimado'`, **únicamente**
`ResumenEstimadoDeLocal` — todo el árbol de Tramos (incluido el único
input de `Longitud [m]` del Tramo representativo, obligatorio para
`hfDistribuida` en AMBAS metodologías de pérdida localizada, D-δ.44) se
saltaba por completo. Consecuencia real: **ningún Local+red podía
llegar a `balanceCompleto` en modo estimado** — el usuario no tenía
forma, vía UI, de cargar la longitud que `resolverEstadoModulo2` exige
(confirmado contra `resolverEstadoModulo2.test.ts`, que sí exige
longitud regardless de método). Esto contradice directamente el
objetivo de D-δ.45 (§11/§27/§30 del brief): el modo rápido debe permitir
cargar "longitud representativa de cada Local+red" y llegar a completo.

**Causa raíz**: D-δ.40 diseñó `ResumenEstimadoDeLocal` como reemplazo
completo del árbol en vez de un complemento — la intención real (ya
documentada en el comentario de archivo previo a esta corrida) era
ocultar solo accesorios/tees, no la longitud.

**Fix aplicado** (`LocalYRedCard.tsx`): el árbol de Tramos
(`NodoDeArbol`/`RamalesSimplificados`) ahora se renderiza siempre que
existe `redHidraulica`, independientemente del método. `modoDetallado`
pasó a ser una prop explícita de ambos componentes que gatea
únicamente `AccesoriosDeTramoEditor` y `SeccionDeTeeInline` (el editor
de tee) en cada nivel — nunca `DimensionamientoDeTramo` (Qc/DN/V +
input de Longitud), que es independiente del método (D-δ.44).
`ResumenEstimadoDeLocal` pasó de ser la alternativa exclusiva del árbol
a un complemento que se agrega debajo cuando `metodoPerdidaLocalizada
==='estimado'`. `ListaDeDistribucion` (nombres de Artefactos) ahora se
muestra en `'simplificada'` independientemente del método (antes solo
en detallado), por consistencia y auditabilidad — no estaba pedido
explícitamente pero no contradice ningún criterio cerrado.

**Por qué no era decisión roja**: D-δ.40 y D-δ.44 ya habían cerrado que
(a) la longitud es obligatoria en ambas metodologías y (b) el método
estimado ignora accesorios/tees. El bug era una desincronización
mecánica entre esas dos reglas ya cerradas dentro de un mismo
componente, no una interpretación normativa ni una elección de dominio
nueva.

**Tests nuevos**: 6 tests en `ResultadoHidraulicoDeTramo.test.ts`
(`describe` nuevo, D-δ.45), cubriendo ambas granularidades × 3
aserciones (Longitud presente, accesorios/tee ausentes, resumen
estimado presente). 774/774 tests totales, `tsc -b` limpio, `vite
build` limpio, lint en baseline preexistente (9 errores, ninguno
nuevo). Verificado manualmente contra la web real (Playwright headless
vía `npx`, proyecto demo, `'simplificada'+'estimado'`): 11 inputs de
Longitud visibles y editables, resumen estimado presente, cero
"Relevar accesorios"/"Tee" en pantalla, cero errores de consola.

#### Decisión roja 1 — Singularidad del último terminal — RESUELTA por el usuario: `codo90`

**Contexto físico** (§9/§17 del brief): en una distribución típica de
`n` artefactos por Local+red, `n-1` uniones suelen resolverse con una
tee (ya estimado, D-δ.40) y el último artefacto de la línea normalmente
requiere algún accesorio de cambio de dirección o salida para conectar
con la grifería (que a su vez queda excluida del balance por CRIT-A29).

**Alternativas no equivalentes en Tabla N°7** (única entrada, un solo
accesorio por Local+red si se adopta):

| Accesorio | Ks | Significado físico |
|---|---|---|
| `curva90` | 0,81 | Cambio de dirección de radio amplio |
| `codo90` | 1,35 | Cambio de dirección de radio corto (accesorio roscado/soldado) |
| `tuboSaliente` | 1,00 | Salida de pared/piso sin cambio de dirección adicional |

**Por qué es genuinamente ambigua**: las tres son físicamente plausibles
según el tipo de instalación (empotrada vs. vista, salida de pared vs.
de piso, radio de curvatura del accesorio efectivamente instalado) y no
hay ninguna base topológica en el modelo de IUAS para preferir una sobre
otra — a diferencia de la tee (`N_tees=n-1` sí es estructuralmente
deducible), este accesorio no depende de cuántos terminales hay sino de
CÓMO se resuelve la conexión final, que el modelo no releva.

**Impacto numérico** (ejemplo Baño con 4 terminales, `V_ref=1,72 m/s`,
mismo caso que la maqueta de auditabilidad del brief; `Ks_tee_total =
3×3,00=9,00`; `hf=Ks·V²/2g`, `2g=19,62`):

| Escenario | `Ks_total` | `hf_m` | Variación vs. solo tees |
|---|---|---|---|
| Solo tees (actual) | 9,00 | 1,357 | — |
| + `curva90` | 9,81 | 1,479 | +9,0% |
| + `tuboSaliente` | 10,00 | 1,508 | +11,1% |
| + `codo90` | 10,35 | 1,561 | +15,0% |

Adicionalmente, si se adopta, el caso `n=1` (hoy `hf_m=0` exacto, sin
resolver velocidad) dejaría de ser cero: incluso un único terminal
tendría una singularidad final, lo que reabriría el atajo de
`nTeesEstimadas===0` en el código actual — un cambio de comportamiento
no trivial que tampoco corresponde decidir unilateralmente.

**Recomendación técnica**: si el usuario quiere adoptar una, `curva90`
(Ks=0,81, la más conservadora hidráulicamente hablando en el sentido de
menor sobreestimación, y la más frecuente en instalaciones domiciliarias
de agua fría/caliente con caños flexibles o semirrígidos) es la opción
de impacto más moderado (+9%); `codo90` sería la más conservadora en el
sentido opuesto (nunca subestima, +15%, coherente con el principio ya
usado para `Ks_estimado_tee=3,00`). No hay una respuesta correcta sin
una decisión de producto.

**Decisión del usuario**: `codo90` (Ks=1,35) — la opción más
conservadora, coherente con el mismo criterio ya adoptado para
`Ks_estimado_tee=3,00` (peor caso conocido ante geometría no relevada,
nunca inventar geometría a favor de un resultado más optimista).
Cardinalidad: exactamente 1 por Local+red cuando `n>=1` (nunca por
terminal, nunca 0 con al menos 1 terminal físico) — a diferencia de las
tees, no escala con `n`.

#### Decisión roja 2 — Llave de paso por Local+red — RESUELTA por el usuario: SÍ incluirla, 1 por Local+red

**Pregunta**: ¿debería el modo rápido asumir automáticamente 1 `llaveDePaso`
(Ks=9,18) por Local+red, además de las tees estimadas?

**Evidencia a favor**: es común en instalaciones domiciliarias
argentinas tener una llave de corte por ambiente húmedo (baño, cocina)
para mantenimiento sin cortar el suministro general.

**Evidencia en contra / motivos de ambigüedad**:
- No es normativamente obligatoria en esta granularidad — ninguna
  transcripción de ERAS-2023 en `CRITERIOS.md` exige su presencia como
  cantidad fija por Local.
- Su cardinalidad real es tan variable como su ausencia: algunas
  instalaciones ponen una llave de paso por Local, otras una llave de
  escuadra por artefacto (que sería una cantidad `n`, no `1`), otras la
  concentran en la Distribución General (que ya es un Tramo aparte,
  fuera de este Local+red) y otras no tienen ninguna en absoluto.
- `Ks=9,18` es igual de grande que `griferias` (excluido por CRIT-A29)
  y **3 veces mayor que el Ks de tee** — su impacto no es un ajuste
  fino, es dominante.

**Impacto numérico** (mismo ejemplo, agregando 1 llave de paso a la
plantilla ya con tees):

| Escenario | `Ks_total` | `hf_m` | Variación vs. solo tees |
|---|---|---|---|
| Solo tees (actual) | 9,00 | 1,357 | — |
| + 1 `llaveDePaso` | 18,18 | 2,741 | **+102,0%** |

Duplicar la pérdida localizada estimada por una sola decisión de
plantilla es un cambio demasiado grande para adoptar sin aprobación
explícita — mucho mayor que cualquiera de las variantes de singularidad
terminal.

**Recomendación técnica**: no incluirla en la plantilla típica del modo
rápido. Si el usuario la considera físicamente habitual igual, sugerir
tratarla como un accesorio **opcional** que el usuario puede activar
conscientemente (un checkbox "Incluir llave de paso típica"), nunca
como parte silenciosa de la estimación automática, dado el tamaño de su
impacto y la ausencia de una cardinalidad estructuralmente deducible.

**Decisión del usuario**: incluirla igual, automáticamente, 1 por
Local+red (no la variante "1 por terminal", ni la opción de checkbox
activable) — el usuario prefirió aceptar el impacto grande (+102% en el
ejemplo) antes que dejarla fuera de la estimación automática o exigir
un paso manual adicional en el modo rápido.

#### Plantilla típica final adoptada (D-δ.45)

Con las dos decisiones rojas resueltas, la plantilla típica del modo
rápido queda, por Local+red, con `n = contarTerminalesFisicosDeLocal`:

```text
N_tees_estimadas       = max(0, n-1)     Ks = 3,00  (teeEntradaCentralSalidasLaterales, D-δ.40)
N_singularidadTerminal = n>=1 ? 1 : 0    Ks = 1,35  (codo90, D-δ.45)
N_llaveDePaso          = n>=1 ? 1 : 0    Ks = 9,18  (llaveDePaso, D-δ.45)

Ks_equivalente_estimado = N_tees_estimadas·3,00 + N_singularidadTerminal·1,35 + N_llaveDePaso·9,18
Js_estimada = Ks_equivalente_estimado · V_ref² / (2g)
```

`n=0` sigue siendo el único cero real (ningún componente aplica, no se
resuelve velocidad). **Cambio de comportamiento respecto de D-δ.40**:
`n=1` ya NO es cero — antes `N_tees=0` cortaba directo a `hf_m=0`; ahora
`N_singularidadTerminal` y `N_llaveDePaso` aplican igual con un único
terminal físico, así que `n=1` pasa a requerir resolver velocidad como
cualquier otro caso con `n>=1`. Verificado manualmente contra el
proyecto demo real: los 5 Local+red con `n=1` (Cocina AC, Lavadero AC,
Toilette AC, Jardín AF) que antes reportaban `hf=0` ahora reportan un
valor no nulo (p.ej. 0,291 m.c.a. con V=0,7 m/s).

**Qué es decisión IUAS vs. qué proviene de ERAS** (mismo criterio que
D-δ.40): `Ks=1,35` y `Ks=9,18` son valores de Tabla N°7 (ERAS-2023,
CRIT-A26), firmes y sin cambios; **qué accesorio elegir** (`codo90`
sobre `curva90`/`tuboSaliente`) y **si incluir la llave de paso
automáticamente** (y con qué cardinalidad) son decisiones de producto
IUAS explícitas del usuario, no transcripción normativa — documentadas
acá para que nunca se les atribuya origen ERAS.

**Implementación** (`motor/tuberias/presion/resolverPerdidaLocalizadaEstimadaDeLocal.ts`):
- `KS_ESTIMADO_TEE`, `KS_ESTIMADO_SINGULARIDAD_TERMINAL`,
  `KS_ESTIMADO_LLAVE_DE_PASO` ahora se derivan de
  `obtenerKsDeAccesorio` (Tabla N°7) en vez de literales hardcodeados
  — una sola fuente de verdad, sin riesgo de divergencia si la tabla
  cambia. Se exportan para que la UI los reutilice sin duplicar el
  valor como texto (antes `<p>Ks por tee estimada: 3,00</p>` era un
  string fijo, ahora `formatearNumero(KS_ESTIMADO_TEE, 'adimensional')`).
- El resultado `'estimada'` gana `nSingularidadTerminal` y
  `nLlaveDePaso` (siempre 0 o 1), expuestos con la misma auditabilidad
  que `nTeesEstimadas`.
- `LocalYRedCard.tsx` (`ResumenEstimadoDeLocal`, sección "Ver cálculo"):
  agrega las líneas de Singularidad terminal y Llave de paso con su Ks,
  bajo el título "Configuración típica IUAS (D-δ.45)".
- `CoberturaDePerdidaLocalizada='estimada'` sin cambios (D-δ.40): sigue
  contando como completa dentro de su propia metodología.

**Tests actualizados**: `resolverPerdidaLocalizadaEstimadaDeLocal.test.ts`
reescrito contra la nueva fórmula (`ksEquivalenteEstimado` helper local,
nunca un número mágico) más un caso nuevo `n=0` (único cero real) y el
caso `n=1` ahora con expectativa explícita de `hf_m>0`. Los tests de
`resolverPresionResidualDeCamino.test.ts`/`resolverEstadoModulo2.test.ts`
que consumen el resultado a través de `TrazaHfLocalizada` no necesitaron
cambios: ese tipo solo expone `hf_mca`/`nTerminalesLocal`/`nTeesEstimadas`/
`velocidadReferencia_mps` (nunca los conteos nuevos) y sus aserciones ya
comparaban contra el propio motor o valores no exactos (`toBeGreaterThan`),
nunca un `hf` hardcodeado de la fórmula vieja. 775/775 tests, `tsc -b`
limpio, `vite build` limpio, lint en baseline preexistente (9 errores,
ninguno nuevo). Verificado manualmente contra la web real (Playwright
headless vía `npx`, proyecto demo completo en `'simplificada'+'estimado'`):
los 9 Local+red muestran "Configuración típica IUAS (D-δ.45)" con las 3
líneas (tees/singularidad terminal/llave de paso) y su Ks, cero
"Relevar accesorios"/editor de tee en pantalla, cero errores de consola.

#### Estado de D-δ.45

**CERRADA.** Investigación completa, bug de UI corregido, dos
decisiones rojas presentadas y resueltas por el usuario, plantilla
típica implementada y verificada (tests + manual). El modo rápido
(`'simplificada'+'estimado'`) es utilizable end-to-end: el usuario carga
Locales/artefactos/longitud representativa/cotas/alimentación y llega a
`balanceCompleto` sin relevar un solo accesorio ni tee a mano.

**Deuda restante**: igual que D-δ.44 (persistencia de Pdisponible/
hfMedidor/granularidad entre recargas, tabs M1-M4, cota de piso + altura
de conexión). Ninguna deuda nueva específica de D-δ.45 — la plantilla
quedó cerrada, no parcialmente implementada.

### D-δ.46 — Cota hidráulica por Unidad Funcional en modo simplificado — IMPLEMENTADA

**Objetivo**: la UI de M2 todavía pedía una `Cota de conexión` individual
por cada terminal, incluso en granularidad `'simplificada'` (D-δ.44) --
contradiciendo el propio principio de esa granularidad ("una única
longitud/lista de accesorios por Local+red", nunca por Artefacto). Este
incremento extiende esa misma idea a las cotas: en modo rápido, todos
los terminales AF/AC de una `UnidadFuncional` comparten una única cota
hidráulica de referencia.

**Decisión del usuario** (instrucción explícita, sin decisión roja
necesaria durante la corrida):

```text
GranularidadHidraulica también decide de dónde sale la cota del terminal:
  'profesional'  -> Nodo.cota_m individual (sin cambios)
  'simplificada' -> UnidadFuncional.cotaHidraulicaReferencia_m (una sola
                     por UF, compartida por TODOS sus terminales AF/AC)
```

**Modelo** (`modelo/proyecto/index.ts`): `UnidadFuncional` gana dos
campos opcionales (mismo criterio "ausente ≠ 0" que `Nodo.cota_m`,
CRIT-A20 -- ninguno de los dos es obligatorio, así que ningún proyecto
ni fixture existente se rompe):

- `nivel?: number` -- convención IUAS, PB=0, Piso 1=1, Piso 2=2... Nunca
  una unión cerrada (no limita la cantidad de pisos). `nombreDeNivel`
  (`interfaz/paginas/nivelUnidadFuncional.ts`) lo traduce a texto humano
  para cualquier entero, sin enumerar pisos a mano.
- `cotaHidraulicaReferencia_m?: number` -- la cota que participa
  efectivamente del cálculo en `'simplificada'`. Se propone
  automáticamente al asignar/cambiar `nivel` mediante
  `calcularCotaHidraulicaDefaultDeNivel(nivel) = 1 + 3·nivel` (PB=1,00m,
  Piso1=4,00m, Piso2=7,00m...) -- **convención IUAS de carga rápida,
  explícitamente NO atribuible a ERAS-2023** (ninguna fuente normativa
  fija alturas típicas de conexión ni de entrepiso), documentada como tal
  en el propio código. El valor queda siempre editable libremente
  después; lo guardado es lo que se usa, nunca la fórmula recalculada.

**Motor** (`motor/tuberias/geometria/resolverCotaTerminalEfectiva.ts`,
nuevo, puro y testeado en aislamiento): decide, dado
`GranularidadHidraulica` + la `UnidadFuncional` del terminal + su
`cota_m` individual, cuál cota corresponde. `resolverPresionResidualDeCamino.ts`
lo invoca justo antes de `resolverDesnivelDeCamino` y, si corresponde,
sustituye la cota del ÚLTIMO nodo del camino (el terminal) por la
efectiva -- `resolverDesnivelDeCamino` en sí mismo sigue sin saber nada
de UF/granularidad, ORTOGONAL como toda la familia de primitivas de
D-δ.44. Nunca se persisten copias del valor de la UF en cada Nodo
terminal: la sustitución es transitoria, solo para ese cálculo.

**Caso degenerado preservado** (un terminal que ADEMÁS es la raíz del
camino -- sin ningún tramo entrante, ej. artefacto conectado
directamente al origen sin tubería intermedia): conserva su cota
individual en AMBAS granularidades. Esa cota funciona ahí como "punto de
alimentación", no como "conexión de Artefacto dentro de una UF" --
sustituirla por la de la UF colapsaría Δz a 0 y descartaría
silenciosamente un dato de alimentación ya cargado. Cubierto por test
dedicado (`resolverPresionResidualDeCamino.test.ts`) y espejado en la UI
(`resolverInfoCotaDeTerminal`, ver abajo).

**Cambio de comportamiento respecto de D-δ.40/D-δ.44**: ninguno en la
fórmula hidráulica en sí (`Δz`, `Js`, `hf` no cambian) -- el cambio es
exclusivamente CUÁL cota alimenta a `resolverDesnivelDeCamino` cuando
`granularidadHidraulica==='simplificada'`.

**Diagnóstico de completitud** (`resolverPresionResidualDeCamino.ts` +
`resolverEstadoModulo2.ts`): nuevo resultado `unidadFuncionalSinCotaDeReferencia`
(análogo a `desnivelIncompleto` pero a nivel UF, nunca por Nodo/terminal
individual). `resolverEstadoModulo2` deduplica por `unidadFuncionalId`
con un `Set` antes de agregar `motivos` -- una UF con N terminales sin
cota nunca genera N motivos, siempre exactamente 1. `agruparMotivosDeModulo2.ts`
(que ahora recibe `unidadesFuncionales` para resolver id→nombre, único
lugar de este archivo que nombra una entidad en vez de solo contarla)
produce "Falta la cota hidráulica de referencia de `<nombre de UF>`.",
igual al texto pedido explícitamente por el usuario.

**UI**:
- `MotorDemandaPantalla.tsx` (`UnidadFuncionalFormulario`): nuevo
  selector "Nivel" (rango de presentación 0..15, extendido si el valor
  ya elegido lo supera -- el modelo en sí nunca limita el rango) + input
  "Cota hidráulica de referencia [m]", con ayuda inline. Cambiar el
  nivel siempre reescribe la cota al default de ese nivel (preferencia
  simple pedida explícitamente, sin dirty-tracking); el input de cota
  sigue editable libremente después. `agregarUnidadFuncional` asigna
  nivel por orden de creación (UF1→PB, UF2→Piso1...) -- solo un default,
  nunca una relación permanente (puede haber varias UF en un mismo piso,
  ninguna en otro, subsuelos). `duplicarUnidadFuncional` preserva
  nivel/cota tal cual por el spread ya existente -- mismo criterio que
  cualquier otro campo no listado explícitamente ("copia profunda", ver
  comentario de archivo); no se consideró ambiguo: una UF duplicada es
  la MISMA unidad física hasta que el usuario la edite a mano.
- `PanelDePresionDeModulo2.tsx` (`TarjetaDeTerminal.tsx`, extraído a su
  propio archivo por legibilidad/testabilidad -- mismo criterio que
  `DimensionamientoDeTramo.tsx`): en `'simplificada'` ya NO pide "Cota de
  conexión [m]" por terminal -- muestra, dentro de "Detalle", "Cota de
  referencia: `<valor>` (`<nombre de UF>`)" de solo lectura. En
  `'profesional'` el input individual se conserva sin cambios. La
  decisión de cuál mostrar (`resolverInfoCotaDeTerminal.ts`, puro,
  testeado en aislamiento) respeta el caso degenerado raíz=terminal.

**Tanque elevado** (D-δ.38, sin cambios de fórmula): `Pdisponible=0` en
el pelo de agua mínimo sigue igual; en `'simplificada'`, todos los
terminales de una UF comparten inicialmente la misma carga geométrica
(`z_peloAguaMin - z_UF`), aunque sus márgenes finales puedan diferir por
camino/pérdidas/Pmin distintos.

**Tests**: 4 archivos nuevos (`nivelUnidadFuncional.test.ts`,
`resolverCotaTerminalEfectiva.test.ts`, `resolverInfoCotaDeTerminal.test.ts`,
`TarjetaDeTerminal.test.ts`) + extensiones en `resolverPresionResidualDeCamino.test.ts`
(caso UF real, AF/AC comparten cota, UF sin cota, reactividad al cambiar
la cota, caso degenerado raíz=terminal preservado), `resolverEstadoModulo2.test.ts`
(deduplicación de motivos por UF) y `agruparMotivosDeModulo2.test.ts`
(texto nombrando la UF). Fixture de regresión de D-δ.44
(`proyectoLocalTresArtefactosConTeesAnidadas`) actualizado con
`cotaHidraulicaReferencia_m` para seguir alcanzando `completo` en
`'simplificada'` bajo la nueva regla. 801/801 tests, `tsc -b` limpio,
`vite build` limpio. Verificado manualmente contra la web real
(Playwright headless vía `npx`, proyecto demo completo,
`'simplificada'+'estimado'`, tanque elevado): cota UF=1m + pelo de
agua=11m → los 16 terminales muestran `Carga geométrica: 10,000 m.c.a.`;
cambiar la cota de la UF a 2m actualiza reactivamente los 16 a
`9,000 m.c.a.`; cero "Cota de conexión [m]" en pantalla, "Cota de
referencia" presente; `Estado de Módulo 2: Completo`; cero errores de
consola.

**Lint**: +2 sobre el baseline anterior (9→11) -- ambos son la MISMA
convención ya usada 5 veces en el repo (`_regimen`/`_longitudAnterior`/
`_cotaAnterior`×2/`_accesoriosAnteriores`/`_teeAnterior`) para omitir
una propiedad opcional bajo `exactOptionalPropertyTypes` (desestructurar
para descartar la clave, ya que asignar `undefined` explícito no tipa).
Los dos nuevos (`_nivel`, `_cotaAnterior` en `MotorDemandaPantalla.tsx`)
son instancias adicionales del mismo patrón, no un problema nuevo de
diseño. Se evitó además duplicar el error `react-refresh/only-export-components`
(ya presente en `AccesoriosDeTramoEditor.tsx`/`ResultadoHidraulicoDeTramo.tsx`)
separando `resolverInfoCotaDeTerminal.ts` (puro) de `TarjetaDeTerminal.tsx`
(solo componente) en vez de mezclarlos en un único archivo.

**No se atribuye a ERAS**: `calcularCotaHidraulicaDefaultDeNivel` (1+3·nivel)
es una convención de producto IUAS para acelerar la carga en modo
rápido, documentada como tal en el código -- no hay ninguna cláusula de
ERAS-2023 sobre alturas típicas de conexión ni de entrepiso.

**Deuda restante**: igual que D-δ.45 (persistencia entre recargas, tabs
M1-M4). Nueva: `nivel`/`cotaHidraulicaReferencia_m` tampoco persisten
entre recargas de página (ningún campo del Proyecto lo hace hoy, mismo
alcance ya conocido). El rango 0..15 del `<select>` de Nivel es
puramente de presentación (documentado en el propio código) -- si en el
futuro se modela algún caso con niveles negativos (subsuelos) de forma
más rica que "Piso -1" como texto, es un incremento aparte.

### D-δ.47 — Auditoría funcional y robustez de Módulo 2 — ABIERTA / PARCIAL

**Objetivo**: no agregar funcionalidad -- intentar romper M2 antes de
congelarlo, con foco en combinaciones de modo, entradas límite, datos
ocultos entre modos, resultados stale y coherencia UI↔dominio.

**Alcance de esta corrida**: auditoría dirigida por código + verificación
manual (Playwright headless contra el proyecto demo real), priorizando
las áreas de mayor riesgo (cambios de D-δ.44/45/46 recientes) sobre
cobertura exhaustiva de los 65 puntos del brief. Ver AUDITADO/NO AUDITADO
más abajo.

#### BUGS ENCONTRADOS Y CORREGIDOS (categoría A)

**1. Pdisponible/hfMedidor: texto inválido persistía visible sin
participar del cálculo.** `PanelDePresionDeModulo2.tsx` guardaba el
texto crudo del input incondicionalmente (`setPresionDisponibleTexto(evento.target.value)`),
sin pasar primero por `parsearEntradaHidraulica`. Un usuario podía
teclear "-5" y verlo persistir en el campo mientras el cálculo, al
parsear, lo trataba como `'ignorar'` (Pdisponible no provisto) --
bloqueando el balance con "Falta indicar el tipo de alimentación" sin
ningún indicio de que el "-5" visible no participaba. Corregido: el
estado local solo se actualiza cuando el resultado del parseo no es
`'ignorar'`, mismo criterio que `conLongitudDeTramo`/`conCotaDeNodo`
(nunca dejar un valor inválido visible y desconectado del cálculo
activo). Verificado manualmente: tras el fix, "-5" deja el campo vacío
en vez de mostrarlo; un valor válido previo (p.ej. "10") sobrevive
intacto a un intento posterior de "-3". Sin test automatizado dedicado
(este archivo no tiene jsdom/testing-library, no se puede simular
`onChange` real -- mismo límite ya documentado en sus tests existentes).

**2. Terminal crítico contaminado por terminales sin Pmin publicada
(D-δ.41).** `PanelDePresionDeModulo2.tsx` pasaba TODOS los candidatos a
`resolverTerminalMasDesfavorable` sin excluir
`'terminalSinPresionMinima'` -- una limitación normativa PERMANENTE
(D-δ.41: ese terminal nunca va a resolver, no es "dato pendiente" como
`'balanceIncompleto'`). Reproducido en el proyecto demo real
(profesional+detallado, "Máquina lavavajillas" sin Pmin publicada): con
los otros 17 terminales en `balanceCompleto`/`Cumple`,
`EstadoModulo2` ya decía `'completo'` (correcto, D-δ.41 ya excluye ese
caso de sus propios candidatos) pero el panel seguía mostrando
`"Terminal más desfavorable ... (resultado provisional: 1 terminal(es)
todavía sin balanceCompleto podrían resultar más desfavorables)"` --
sugiriendo falsamente que faltaba información, cuando ese terminal
nunca iba a completarse por diseño. Corregido extrayendo
`filtrarCandidatosParaTerminalCritico` (nuevo,
`interfaz/paginas/filtrarCandidatosParaTerminalCritico.ts`, con test
unitario dedicado): filtra `'terminalSinPresionMinima'` ANTES de
`resolverTerminalMasDesfavorable`, replicando exactamente el criterio
que `resolverEstadoModulo2` ya aplicaba correctamente en su propio
ranking interno. La tarjeta de ese terminal se sigue mostrando igual
("Sin presión mínima normativa publicada para verificación.") -- solo
se excluye del ranking de criticidad.

**Commit**: `fix: validacion de Pdisponible/hfMedidor y contaminacion de
terminal critico (D-delta.47)`.

#### HALLAZGOS SIN BUG (verificados, comportamiento correcto)

- **`EstadoModulo2='completo'` vs. "cumple" (§36 del brief)**: NO hay
  ambigüedad real. `'completo'` significa "el cálculo del balance de
  presión está resuelto para todos los terminales dentro del alcance
  actual" -- nunca "el diseño cumple normativamente". La UI ya distingue
  esto explícitamente: `textoDeEstadoDeTerminal` devuelve "Cumple"/"No
  cumple" (`resultado.cumpleMinimo`) como un dato SEPARADO del estado
  "Completo"/"Incompleto"/"Error" de `EstadoModulo2`. `resolverBalanceDePresion`
  nunca clampea ni lanza excepción ante `presionResidual_mca` negativo o
  por debajo de `presionMinimaRequerida_mca` -- el álgebra fluye normal y
  `cumpleMinimo` simplemente da `false`. Sin decisión roja: ya cerrado.
- **Cargas geométricas/Δz negativos (§13, tanque elevado)**: verificado
  que `calcularDiferenciaDeCota`/`resolverBalanceDePresion` no rechazan
  ni transforman un desnivel negativo (artefacto por encima del pelo de
  agua) -- el resultado fluye a `presionResidual_mca` más bajo y
  eventualmente "No cumple", nunca a un error estructural. Correcto.
- **Cota UF negativa (§11)**: probado con `cotaHidraulicaReferencia_m=-5`
  en el proyecto demo real -- el balance se recalcula correctamente y
  `EstadoModulo2` sigue en `'completo'` con la nueva Δz. Confirma que el
  dominio nunca prohibió negativos (correcto, no requiere decisión roja).
- **Pdisponible/hfMedidor negativos (§14/§15)**: `parsearEntradaHidraulica`
  YA rechazaba `valor < 0` antes de esta corrida -- es un cierre de
  diseño preexistente (Pdisponible/hfMedidor son magnitudes físicas que
  no tienen sentido negativo en este contrato), no una ambigüedad nueva.
  0 sigue siendo válido y distinto de vacío (verificado: hfMedidor="0" ->
  persiste "0"; hfMedidor="" -> `undefined`). El bug real no era la
  regla de validación en sí (correcta) sino que no se aplicaba
  consistentemente en el `onChange` (ver bug #1 arriba).
- **Cambio de modo (granularidad/método) no contamina ni pierde datos**:
  verificado en el proyecto demo real -- cargar longitudes+cotas en
  `simplificada+estimado`, pasar a `profesional+detallado` (los
  diagnósticos cambian correctamente a "faltan cotas de conexión",
  nunca mezclan texto de ambos modos), y volver a
  `simplificada+estimado` recupera `'completo'` sin volver a cargar
  nada. `actualizarConfiguracionHidraulica.ts` nunca borra
  `Tramo.longitud_m`/`accesorios`/`Nodo.tee`/`cota_m` al cambiar de
  modo -- solo cambia qué primitiva de lectura los consume (ya cerrado
  desde D-δ.44).
- **Duplicar UF (§26)**: `nivel`/`cotaHidraulicaReferencia_m` se
  duplican tal cual (deep copy) y son independientes tras la
  duplicación -- editar la cota de la copia no afecta al original.
  Comportamiento ya documentado y decidido en D-δ.46, confirmado sin
  ambigüedad.
- **Agregar/eliminar UF (§27)**: nivel asignado por orden de creación
  (UF2→Piso1/4m, UF3→Piso2/7m), edición de una UF no afecta a las
  demás, eliminar reduce el conteo correctamente. Sin NaN/undefined.
- **Agregar artefacto con precedente físico (M2-D, §24)**: al agregar un
  artefacto cuyo tipo YA tiene precedente en el proyecto,
  `sincronizarConectividadFisicaDeArtefacto` lo conecta automáticamente
  (mismo patrón AF/AC que el precedente) y `EstadoModulo2` se
  recalcula reactivamente sin intervención adicional -- comportamiento
  correcto de M2-D, no bug.
- **Modo rápido y modo profesional end-to-end (§47/§48/§50)**: ambos
  verificados completos contra el proyecto demo real (18 terminales:
  17 con Pmin + 1 sin Pmin). Rápido:
  `simplificada+estimado`, 11 tramos con longitud, tanque elevado ->
  `Completo`. Profesional: `profesional+detallado`, 24 tramos con
  longitud+accesorios relevados, 3 tees configuradas, 17 cotas
  individuales, tanque elevado -> `Completo`, terminal crítico
  correcto (Baño → Receptáculo de ducha). Cero NaN/Infinity/undefined,
  cero errores de consola en ambos.
- **Stale state (§31)**: borrar la longitud de "Alimentación general"
  (afecta los 16-18 terminales) revierte `EstadoModulo2` a `'incompleto'`
  inmediatamente, sin dejar "Presidual"/"Cumple" residual de ningún
  terminal en pantalla; restaurar el valor recompone `'completo'` sin
  refresh. Mismo patrón verificado para la cota del pelo de agua del
  tanque elevado. Ningún dato derivado sobrevive a la invalidación de su
  entrada.
- **`AccesoriosDeTramoEditor`**: cantidad ya rechaza `<1` y no-finito
  (`Number.isFinite`) antes de actualizar estado -- sin gap.
- **Validación geométrica cota/longitud** (`redHidraulicaTramoLongitudIncompatibleConCota`,
  `validarRedHidraulica`): opera exclusivamente sobre `Nodo.cota_m` real
  -- nunca ve la cota efectiva sustituida de D-δ.46 (que es transitoria,
  solo dentro de `resolverPresionResidualDeCamino`), así que no genera
  falsos positivos en modo simplificado (donde los Nodos terminales
  normalmente no tienen `cota_m` propio).

#### DECISIÓN ROJA — coma decimal en inputs numéricos (§33) — RESUELTA: queda como deuda, sin tocar código

**Evidencia**: todos los inputs numéricos de M2 usan
`<input type="number">`. Probado con Playwright (Chromium, configuración
de este entorno): tipear "1,5" (coma) carácter por carácter SÍ actualiza
`input.value` a `"1.5"` -- pero esto depende de la configuración de
idioma/región del navegador/SO del usuario, no del código de IUAS. La UI
misma **muestra** los resultados con coma decimal (`formatearNumero`,
locale `es-AR`), pero el comportamiento de **entrada** con coma en
`type="number"` es responsabilidad exclusiva del navegador/SO -- en un
navegador/SO configurado con separador decimal "." (común incluso entre
usuarios argentinos con Windows en inglés), la tecla "," probablemente
se descarta en silencio sin ningún mensaje, y el usuario podría terminar
escribiendo un número distinto al que creía ingresar (p.ej. "15" en vez
de "1,5"), sin ninguna señal de error visible.

**No es un bug de esta corrida** (el comportamiento no cambió por
D-δ.44/45/46/47) pero **es una inconsistencia UX real** entre lo que la
app muestra (coma) y lo que garantiza aceptar al escribir (depende del
entorno del usuario, no está garantizado).

**Alternativas no equivalentes**:
1. Dejar `type="number"` tal cual -- cero costo, pero el comportamiento
   sigue dependiendo silenciosamente del SO/navegador del usuario.
2. Migrar los inputs numéricos de M2 a `type="text"` con
   `inputMode="decimal"` + parseo propio que acepte tanto "," como "."
   -- elimina la dependencia de locale, pero toca todos los inputs
   numéricos de M2 (Longitud, Cota UF, Cota terminal, Pdisponible,
   hfMedidor, cantidad de accesorio) y sus funciones de parseo.
3. Mantener `type="number"` pero agregar una ayuda visual ("usá punto
   decimal") -- bajo costo, pero no elimina el problema, solo lo
   documenta para el usuario.
4. Detectar el locale del navegador y adaptar dinámicamente -- mayor
   complejidad, comportamiento menos predecible entre usuarios.

**Impacto**: bajo en frecuencia (la mayoría de los valores de M2 son
enteros o con .5, y muchos usuarios argentinos SÍ tienen su SO
configurado en es-AR, donde la coma funciona), pero potencialmente alto
en severidad cuando ocurre (un valor mal interpretado sin ningún error
visible podría alterar un cálculo de dimensionamiento silenciosamente).

**Recomendación técnica**: opción 2 (texto + `inputMode="decimal"` +
parseo propio) es la más robusta y ya sigue el patrón existente del
proyecto (todos los parseos de M2 ya son funciones puras dedicadas,
`resolverCambioDeLongitud`/`parsearCota`/`parsearEntradaHidraulica` --
extenderlas para aceptar "," como alias de "." antes de `Number(...)`
es mecánico). Pero es una decisión de producto (cuánto esfuerzo dedicar
a esto ahora vs. documentarlo como deuda) que no corresponde tomar
unilateralmente.

**Decisión del usuario**: dejarlo documentado como deuda por ahora --
NO tocar código en esta corrida (opción 1 de la lista, statu quo). No
implementar la migración a texto+parseo propio (opción 2) hasta que se
decida abordarlo explícitamente en una corrida futura.

#### DEUDA CLASIFICADA

**B. UX menor (documentado, no corregido — decisión explícita del usuario)**:
- Coma decimal en `<input type="number">` de M2 (Longitud, Cota UF,
  Cota terminal, Pdisponible, hfMedidor, cantidad de accesorio): el
  comportamiento de aceptar "," como separador decimal depende del
  locale del navegador/SO del usuario, no está garantizado por el
  código. Alternativa recomendada si se retoma: migrar a `type="text"`
  + `inputMode="decimal"` + extender `resolverCambioDeLongitud`/
  `parsearCota`/`parsearEntradaHidraulica` para aceptar "," como alias
  de "." antes de `Number(...)`.

**D. Diferido / fuera de alcance (no tocar)**:
- Persistencia entre recargas de Pdisponible/hfMedidor/tipo de
  alimentación (deliberado, D-δ.35/36).
- Tabs M1-M4, M3, M4, hfEquipoACS, presurizador (fuera de alcance
  explícito de esta corrida).

#### MATRIZ DE LAS 4 COMBINACIONES — CERRADA (segunda mitad de esta corrida)

Verificación manual end-to-end (Playwright headless, proyecto demo real)
de las 4 combinaciones de `GranularidadHidraulica`×`MetodoPerdidaLocalizada`,
incluida la trazabilidad numérica pedida explícitamente para las dos
combinaciones más riesgosas (mezclan un eje "grano fino" con el otro
"grano grueso"):

| Combinación | UI la permite | Llega a `balanceCompleto` | Llega a `EstadoModulo2='completo'` | Observaciones |
|---|---|---|---|---|
| simplificada + estimada | Sí | Sí | Sí | Ya verificada exhaustivamente en la corrida anterior (18 terminales, cero NaN). |
| simplificada + detallada | Sí | Sí | Sí | Verificada esta corrida (ver abajo). |
| profesional + estimada | Sí | Sí | Sí | Verificada esta corrida con trazabilidad numérica (ver abajo) -- la combinación que más generaba dudas de doble conteo. |
| profesional + detallada | Sí | Sí | Sí | Ya verificada exhaustivamente en la corrida anterior (tees, accesorios, cotas individuales, terminal crítico correcto). |

**`profesional + estimada` -- verificación numérica explícita** (24
tramos reales con longitudes deliberadamente distintas 2/3/4 m para
poder distinguir qué varía de qué no): se extrajeron los pares
(`hfDistribuida`, `hfLocalizada`) de cada tarjeta de terminal. Resultado
real observado (Baño/AF, 4 terminales):

```text
hfDistribuida: 1,968 / 2,072 / 2,016 / 2,181 m.c.a.  (DISTINTA por terminal -- tramo real)
hfLocalizada:  1,501 / 1,501 / 1,501 / 1,501 m.c.a.  (IDÉNTICA -- una sola vez por Local+red)
```

Mismo patrón confirmado en Baño/AC (3 terminales, hfLocalizada=1,029
idéntica con hfDistribuida distinta), y en cada Local con n=1 (hfLocalizada
0,291/0,809 según el Local, consistente con los valores ya registrados en
D-δ.45). Esto confirma sin ambigüedad:
- `hfDistribuida` sigue el tramo real (profesional, D-δ.44 sin cambios).
- `hfLocalizada` estimada se aplica EXACTAMENTE una vez por Local+red,
  nunca por tramo -- **no hay doble conteo**.
- El terminal "Máquina lavavajillas" (sin Pmin) muestra `hfDistribuida`/
  `hfLocalizada` como `—` (sin traza, `terminalSinPresionMinima` corta
  antes) -- consistente con D-δ.41, no contamina el resto.
- Accesorios/tees detallados NUNCA se piden en método estimado, ni
  siquiera en granularidad profesional ("Relevar accesorios"/
  "Bifurcación sin configurar": 0 apariciones) -- confirma que
  accesorios/tees persistidos de una sesión previa en `'detallado'`
  quedan correctamente ignorados por el estimador (D-δ.45 nunca los lee).
- `EstadoModulo2='completo'` alcanzado con los 24 tramos + 17 cotas
  individuales cargadas. Cero NaN/Infinity/undefined, cero errores de
  consola.

**`simplificada + detallada` -- verificación explícita**: 11 inputs de
Longitud (uno por Local+red representativo, igual que en simplificada+
estimado -- la granularidad, no el método, gobierna esto) y 11 botones
"Relevar accesorios" (mismo conteo, nunca uno por ramal). Ningún texto
"Ramal \<nombre\>" pidió datos propios. Las 3 tees reales del proyecto
siguieron apareciendo inline y configurables (CRIT-A31 no depende de la
granularidad) y se completaron sin error. `EstadoModulo2='completo'`
alcanzado. Cero NaN/Infinity/undefined.

**Cambio entre las 4 combinaciones sin contaminación -- recorrido
completo en un mismo proyecto**: secuencia real ejecutada
`simplificada+detallado` (relevado) → `profesional+detallado` (recién
cambiado: cae a `incompleto` porque profesional exige MÁS datos, nunca
menos -- de los 24 tramos reales, solo 13 pidieron "Relevar accesorios"
porque los 11 representativos YA los tenían relevados desde el paso
anterior, confirmando que el cambio de granularidad **reutiliza** el
dato ya cargado en el tramo representativo en vez de descartarlo) →
completar los 13 ramales nuevos + 17 cotas individuales → `completo` →
volver a `simplificada+detallado` (**`completo` inmediato**, sin cargar
nada de nuevo -- los datos de los ramales de profesional quedan
ocultos, no bloquean) → `profesional+estimado` (**`completo` inmediato**
-- reutiliza las longitudes/cotas individuales ya cargadas en
profesional, ignora los accesorios/tees detallados ya relevados sin
que eso rompa nada). Cero errores de consola y cero
NaN/Infinity/undefined en las 5 transiciones. Confirma sin ambigüedad
el principio pedido: un dato oculto puede conservarse, pero nunca
afecta el cálculo de un modo que explícitamente no lo usa, y nunca hay
que volver a cargar lo que ya se cargó para la granularidad activa.

**Sin bugs encontrados en esta mitad de la corrida** (solo verificación,
sin cambios de código).

#### NO AUDITADO EN ESTA CORRIDA (queda para la próxima)

- Cambio de material/sistema de tubería con datos ya cargados (§16/§17) --
  no probado en esta corrida.
- Vmin/Vmax fallback CRIT-A24 en la UI real (§18) -- cubierto por
  golden tests existentes, no reverificado manualmente esta corrida.
- Agregar/eliminar Local (§25) -- no probado esta corrida (sí se probó
  agregar artefacto y agregar/eliminar/duplicar UF).
- Cambio de tipo de artefacto que altere sus redes físicas (§40).
- Auditoría de red de agua caliente dedicada (§39) -- confirmado
  indirectamente por los end-to-end (Cocina AC, Lavadero AC, Toilette AC
  con n=1 cada uno, valores correctos) pero sin un pase dedicado a
  buscar duplicación/Qc incorrecto específicamente en AC.
- Accesibilidad básica (§55), performance básica (§57), auditoría
  exhaustiva de `as any`/assertions (§58, se hizo un grep inicial sin
  hallazgos relevantes fuera de patrones ya documentados).
- Prueba de refresh de página real (§54).
- Documentación exhaustiva de cada input principal en una tabla
  dedicada (§59) -- la semántica de cada uno ya quedó documentada en
  comentarios de código y en los registros de D-δ.44/45/46, pero no se
  consolidó en una tabla única.

**Estado (parcial, superado por el cierre final más abajo)**: D-δ.47
quedó **ABIERTA / PARCIAL** al final de la primera mitad de esta
auditoría -- dos bugs reales encontrados y corregidos con
tests/verificación manual, una decisión roja presentada y resuelta
(coma decimal: queda como deuda documentada, sin tocar código), la
**matriz completa de las 4 combinaciones cerrada** con verificación
numérica explícita (sin doble conteo en `profesional+estimada`, sin
contaminación en ningún cambio de modo), y una lista de áreas del brief
todavía sin recorrer explícitamente (ver "NO AUDITADO" arriba). El repo
quedó verde (804/804 tests, `tsc -b` y `vite build` limpios, lint en
baseline 11) y el working tree limpio.

#### Segunda mitad de esta corrida -- cierre de "NO AUDITADO"

**Bug 3 -- trampa sin salida al eliminar un Local o una UnidadFuncional
completa.** `onEliminar` de `LocalFormulario` y de
`UnidadFuncionalFormulario` (`MotorDemandaPantalla.tsx`) solo filtraban
`proyecto.unidadesFuncionales`, sin llamar a
`quitarConectividadFisicaDeArtefacto` por cada artefacto del Local/UF
como sí hace la baja de un Artefacto individual. Reproducido en el
proyecto demo real: eliminar cualquier Local (o una UnidadFuncional
completa) dejaba referencias huérfanas en `redHidraulica`;
`validarRedHidraulica` lo detectaba correctamente
(`redHidraulicaReferenciaArtefactoInvalida`) pero, como
`ResultadoHidraulicoDeTramo` (M1+M2 completos) deja de renderizarse
mientras el proyecto no sea válido, el usuario quedaba con "Problemas de
validación" **sin ningún control visible para deshacer su propia
acción** -- único remedio real: recargar la página y perder todo lo
cargado. Corregido con dos funciones nuevas
(`quitarConectividadFisicaDeLocal`/`quitarConectividadFisicaDeUnidadFuncional`,
`src/interfaz/paginas/`) que desconectan todos los artefactos afectados
y podan con `podarNodosSinSalida` las cabeceras de bifurcación que
quedan sin hijos -- a diferencia de la baja de un solo Artefacto (donde
la cabecera se preserva a propósito, D-δ.26), acá el Local/UF completo
desaparece y ningún consumidor futuro puede reutilizarla. Verificado
manualmente: eliminar el Local "Baño" (4 artefactos, bifurcación AF+AC)
de un proyecto ya en `balanceCompleto` no deja "Problemas de
validación", el resto de los Locales conserva sus datos y resultados, y
Qc/hf/Presidual/terminal crítico se recalculan correctamente en cascada
(el terminal crítico cambió de Presidual tras la baja porque
"Alimentación general" es compartida por todo el proyecto -- físicamente
correcto, no contaminación). Tests dedicados:
`podarNodosSinSalida.test.ts`, `quitarConectividadFisicaDeLocal.test.ts`,
`quitarConectividadFisicaDeUnidadFuncional.test.ts`.

**Bug 4 -- trampa sin salida al elegir un material sin sistema
comercial compatible.** El selector "Material de la tubería" ofrecía 6
opciones (PPR/PVC/PEAD/Cobre/Acero galvanizado/Acero al carbono) pero
`catalogoSistemasDeTuberia` solo tiene un sistema real cargado
(`acquaSystemMagnumPn20`, material PPR). Elegir cualquier material
distinto de PPR disparaba correctamente
`configuracionHidraulicaSistemaMaterialIncompatible` (el comportamiento
de validación ya estaba verificado en D-δ.28), pero
`ConfiguracionHidraulicaFormulario` -- que contiene ese mismo
selector -- vive dentro del mismo gate de validez que el resto de
M1+M2: el usuario quedaba con "Problemas de validación" y sin ningún
control visible para volver a elegir PPR. D-δ.28 había verificado que
la validación bloqueaba correctamente, pero no había probado si el
bloqueo era recuperable desde la UI -- no lo era. Corregido: 1)
`conMaterialTuberia` ahora recibe el catálogo de sistemas y sincroniza
`sistemaDeTuberiaId` al primero compatible con el nuevo material (o
conserva el actual si ya lo era), nunca deja un par incompatible por
esta vía; 2) el selector de Material solo ofrece las opciones que
tienen al menos un sistema comercial real en el catálogo (hoy, solo
PPR -- listo para cuando el catálogo crezca, mismo criterio que D-δ.28
dejó para el selector de Sistema). Tests dedicados en
`actualizarConfiguracionHidraulica.test.ts`.

**Auditoría dedicada de agua caliente (§39) -- sin bugs, doble conteo
descartado con evidencia numérica de Presidual (no solo hf).** Sobre el
proyecto demo real completo (`balanceCompleto`, Pdisponible=20,
hfMedidor=0,5, cota=0, longitud=3 m uniforme en las 11 filas
Local+red), Baño/AF (Lavatorio/Ducha/Bidet/Inodoro) dio
Presidual=14,836 (hfDistribuida=2,163; hfLocalizada=1,501) y Baño/AC
(Lavatorio/Ducha/Bidet, sin Inodoro -- correcto, es AF-only) dio
Presidual=14,112 (hfDistribuida=3,359; hfLocalizada=1,029). La
diferencia de hfDistribuida entre AF y AC (3,359 − 2,163 = 1,196 ≈ el
tramo "Alimentación ACS" de 3 m más su proporción) confirma que ese
tramo participa **exclusivamente** del camino AC, nunca del AF -- sin
doble conteo, coherente con D-δ.7/D-δ.13. El balance verifica
aritméticamente (`Presidual = Pdisponible − Δz − hfDistribuida −
hfLocalizada − hfMedidor`) para ambos caminos. El terminal más
desfavorable de todo el proyecto resultó ser el Lavatorio **AC** del
Baño (Presidual=14,112, el más bajo de los 18), confirmando que el
terminal crítico puede recaer en AC cuando corresponde, sin sesgo hacia
AF. `hfEquipoACS` confirmado ausente del cálculo
(`resolverEstadoModulo2.ts` lo documenta explícitamente como diferido,
D-δ.15) -- no es un bug, es la deuda ya conocida.

**Métodos de pérdida distribuida (Hazen-Williams/Darcy-Weisbach) --
sin bugs.** Con longitud ya cargada, cambiar de Hazen-Williams a
Darcy-Weisbach recalculó hf correctamente (2,409 → 2,522 m.c.a. en el
caso probado), preservó la longitud ya cargada, no dejó ningún valor
stale y no generó errores de consola.

**Unidades/redondeo/Pmin -- sin bugs.** `formatearNumero` es
exclusivamente de presentación (nunca se parsea de vuelta a número para
cálculo -- todos los inputs usan funciones de parseo dedicadas sobre el
texto crudo). La conversión Pmin kg/cm² → m.c.a. vive en un único lugar
(`MCA_POR_KGF_CM2 = 10` en `resolverBalanceDePresion.ts`), documentada
como simplificación deliberada (ERAS-2023 §2.9.1.4 trata kg/cm²=bar como
intercambiables) y consistente entre `TarjetaDeTerminal.tsx` y
`resolverTerminalMasDesfavorable.ts` (misma fórmula de margen en ambos
lugares).

**Accesibilidad funcional básica -- 1 hallazgo B corregido.** Barrido
automatizado (Playwright) encontró 12 controles sin ninguna asociación
programática con su etiqueta: el input de nombre de Unidad Funcional
(dentro de un `<h3>`, sin `<label>` envolvente) y los 11 inputs de
"Longitud [m]" de `DimensionamientoDeTramo` (el texto vive solo en un
`<th>` de tabla). Corregido con `aria-label` en ambos casos (sin cambios
visuales); 0 controles sin etiqueta tras el fix.

**Cambio de tipo de artefacto (§40) -- verificado, comportamiento
correcto por diseño, no es un bug.** Cambiar el `artefactoId` de
catálogo de un Artefacto ya existente (p. ej. de "Máquina lavavajillas"
a "Lavatorio") no toca `redHidraulica`: la instancia conserva sus
terminales físicos existentes tal cual estaban. Esto es consistente con
CRIT-A15 ("ausencia de conexión física = la conexión no existe, no dato
pendiente") -- no existe hoy una operación de "sincronizar conectividad
al cambiar de tipo", solo ALTA (M2-D) y BAJA (D-δ.26/D-δ.47). Verificado
sin crash, sin "Problemas de validación", sin error de consola. Si el
usuario espera que cambiar a un artefacto mixto AF+AC cree
automáticamente un terminal AC nuevo, no ocurre -- deuda D, no bug: no
se decide ni se implementa acá.

**Puntos reclasificados explícitamente (no bloquean el cierre):**

- Vmin/Vmax fallback CRIT-A24 en la UI real (§18): sigue cubierto
  únicamente por golden tests, no se reverificó manualmente tampoco en
  esta corrida -- sin cambios en esa área, riesgo bajo.
- Prueba de refresh de página real (§54): no se ejecutó -- el
  comportamiento (pérdida total de datos, nada persiste) ya está
  documentado a propósito como deuda D (D-δ.35/36), no requiere prueba
  adicional para confirmar algo ya sabido.
- Performance básica (§57): no evaluada -- sin ningún indicio de
  problema de rendimiento en las pruebas manuales realizadas.
- Documentación exhaustiva de cada input en una tabla dedicada (§59): no
  consolidada -- la semántica de cada input ya está documentada en
  comentarios de código y en los registros D-δ.44/45/46/47; queda como
  deuda D de documentación pura, sin riesgo funcional.
- Auditoría de `as any`/assertions (§58): grep inicial de la primera
  mitad sin hallazgos relevantes nuevos; no se repitió.

**Estado final**: **D-δ.47 -- CERRADA.** Cuatro bugs reales
encontrados y corregidos en total (Pdisponible/hfMedidor, terminal
crítico contaminado, trampa de eliminar Local/UF, trampa de material
sin sistema compatible), una decisión roja resuelta (coma decimal,
queda como deuda documentada), la matriz de 4 combinaciones cerrada con
verificación numérica, y una auditoría dedicada de AC sin bugs con
evidencia explícita de Presidual (no solo hf). Repo verde: 817/817
tests, `tsc -b` y `vite build` limpios, lint en baseline 11 (sin
regresión), working tree limpio, cero errores de consola en todas las
pruebas manuales.

**M2 -- CONGELADO EN EL ALCANCE ACTUAL.** No implica que M2 sea
definitivo: significa que el alcance hidráulico actual (modo rápido,
modo profesional, presión, completitud, AC) está auditado y robusto
dentro de ese alcance, y que la deuda restante (coma decimal, `a`
efectivo por tramo D-β.2, hfEquipoACS D-δ.15, clase/serie comercial
D-δ.29, margen de seguridad D-δ.30, granularidad de
`sistemaDeTuberiaId` D-δ.31, documentación consolidada de inputs) queda
explícitamente registrada, no implementada. Bugs futuros sobre este
alcance se tratan como regresiones; nueva funcionalidad requiere un
nuevo alcance aprobado explícitamente (el próximo, ya acordado: Módulo
3 -- Medidores, que produce `hfMedidor` para que M2 lo consuma).

## D-δ.48 -- Niveles por UF + validación del criterio de terminal crítico por margen -- CERRADA

**Objetivo A (defaults de nivel/cota por UF) -- verificado, SIN bug: ya
funcionaba correctamente.** El brief planteaba la sospecha de una
posible regresión de D-δ.46 ("el PDF/UI previo mostraba todavía cotas
terminales individuales y faltantes por terminal"). Verificado en la UI
real (Playwright): `agregarUnidadFuncional` ya asigna
PB→1,00/Piso1→4,00/Piso2→7,00/Piso3→10,00 exactamente
(`calcularCotaHidraulicaDefaultDeNivel`, `z=1+3·nivel`); cambiar
explícitamente el nivel de una UF ya propone el nuevo default sin pisar
una edición manual posterior; en `granularidadHidraulica='simplificada'`
el Panel de Presión nunca pide "Cota de conexión" por terminal (solo
"Cota de referencia" de solo lectura); "falta cota de conexión" solo
aparecía porque el fixture de prueba no había cargado todavía la cota
del **punto de alimentación** (dato distinto e independiente, siempre
requerido en ambas granularidades) -- no es una regresión de D-δ.46. La
sospecha del brief no se reprodujo: sin bug, sin cambio de código en
esta área. Reforzado con un test nuevo en
`resolverInfoCotaDeTerminal.test.ts` que usa DOS UF de cota distinta
(todos los tests anteriores usaban una única UF, incapaces de detectar
un eventual bug de "siempre toma la primera UF").

**Duplicar UF -- semántica ya decidida (Semántica A), no era una
ambigüedad nueva.** El brief marcaba esto como posible decisión roja
("A. conserva mismo nivel/cota" vs. "B. asigna el siguiente piso
sugerido"). Investigado: `duplicarUnidadFuncional.ts` ya documenta y
aplica explícitamente la Semántica A desde antes de este incremento
("no hay ninguna regla de negocio que determine automáticamente un
nivel siguiente para una copia"), y D-δ.47 ya la había verificado
funcionalmente. No es una ambigüedad real hoy -- es una decisión de
producto ya tomada y en producción; se documenta acá solo para que
quede visible en el mismo lugar que el resto de D-δ.48. Si el usuario
prefiere la Semántica B, es un cambio de producto explícito a pedir en
un incremento futuro, no una corrección de bug.

**Objetivo B (terminal crítico por margen, no por Presidual) --
verificado, SIN bug: la implementación ya era correcta.**
`resolverTerminalMasDesfavorable` ya seleccionaba por
`margen = presionResidual_mca - presionMinimaRequerida_mca` desde su
implementación original -- no por `min(Presidual)`. El gap real no era
de comportamiento sino de **cobertura de test**: ningún test existente
tenía un caso donde el orden de Presidual y el orden de margen fueran
opuestos entre dos candidatos (los tests existentes tenían casos donde
el candidato de menor Presidual también era, coincidentemente, el de
menor margen -- no discriminaban entre las dos implementaciones
posibles). Se agregaron:

- un test unitario explícito en `resolverTerminalMasDesfavorable.test.ts`
  con el contraejemplo abstracto del brief (Presidual=5,5/Pmin=2,0/margen=+3,5
  vs. Presidual=7,0/Pmin=6,0/margen=+1,0) -- verificado manualmente que
  este test FALLA si se revierte la implementación a `min(Presidual)`;
- un test del caso NO CUMPLE con los valores exactos del brief
  (Presidual=5,4/Pmin=6,0/margen=-0,6);
- un caso de aceptación de integración REAL (no solo abstracto),
  `verificacionTerminalCriticoPorUF.aceptacion.test.ts`: 4
  UnidadesFuncionales en los niveles/cotas default aprobados
  (PB=1/Piso1=4/Piso2=7/Piso3=10), tanque elevado con pelo de agua
  mínimo=16 m, verificando numéricamente que la carga geométrica de
  cada terminal (antes de pérdidas) es exactamente 15/12/9/6 m.c.a., y
  que la UF de PB -- con la MAYOR Presidual de las cuatro por tener la
  mayor carga geométrica -- termina siendo el ÚNICO terminal crítico
  (único que NO CUMPLE) porque su artefacto (inodoro con válvula
  automática, Pmin=1,5 kg/cm²=15 m.c.a.) tiene una Pmin normativa mucho
  más alta que el resto. Incluye un test de cambio reactivo: editar la
  cota de una sola UF desplaza el terminal crítico sin afectar a las
  demás.

**UI de presión -- mejoras acotadas, sin rediseñar M2 (secciones 15-23
del brief).** `PanelDePresionDeModulo2.tsx`:

- **Desambiguación AF/AC del terminal crítico** (hallazgo nuevo, no
  bug de cálculo sino de identidad visual): `describirReferenciaPendiente`
  devuelve la MISMA etiqueta para el terminal AF y el terminal AC de un
  mismo Artefacto mixto (se deriva solo de la referencia funcional
  UF→Local→Artefacto, nunca de la conectividad física) -- "Terminal más
  desfavorable" podía señalar, p. ej., "... → Baño → Lavatorio" sin que
  se supiera si era el de agua fría o el de agua caliente de esa misma
  canilla. Nueva función pura `resolverRedDeTerminal.ts` (con test) +
  helper `etiquetaConRed` que agrega "(Agua fría)"/"(Agua caliente)" a
  la etiqueta en el Panel de Presión únicamente (no en
  `describirReferenciaPendiente`, que también sirve para artefactos
  SIN conexión física todavía, donde no hay Red que mostrar).
- **Listado ordenado por margen ascendente** (`ordenarCandidatosParaListado.ts`,
  con test): los `balanceCompleto` primero, ordenados por margen (el
  más desfavorable arriba, coincidiendo con `terminalMasDesfavorable`);
  los estados incompletos después; los `terminalSinPresionMinima`
  (D-δ.41) siempre al final.
- **Resumen agregado de cumplimiento** (`resolverResumenDeCumplimiento.ts`,
  con test): "✓ TODOS LOS PUNTOS VERIFICABLES CUMPLEN" o "✕ N DE M
  PUNTOS NO CUMPLEN" -- el denominador (`M`) son exclusivamente los
  terminales `balanceCompleto`, nunca los `terminalSinPresionMinima` ni
  los todavía incompletos.
- **Símbolo + texto, nunca solo color**: "✓ Cumple"/"✕ No cumple" en
  cada tarjeta y "✓ CUMPLE"/"✕ NO CUMPLE" en el terminal más
  desfavorable.
- **Vocabulario**: el terminal más desfavorable ya se llamaba
  "Terminal más desfavorable" (nunca "menor presión") -- sin cambios
  necesarios ahí; se agregaron las etiquetas explícitas "Presión
  residual disponible"/"Presión mínima requerida"/"Margen" en ese
  mismo bloque (antes decía "Presidual"/"Pmin"/"margen" en minúscula,
  abreviado).

Todo verificado manualmente (Playwright, proyecto demo real, 17
terminales: 16 con Pmin + 1 sin Pmin): orden correcto, resumen correcto
en escenario CUMPLE y NO CUMPLE, cero errores de consola.

**Hallazgo nuevo, NO corregido en este incremento -- ver pendiente
dedicado más abajo.** Al intentar construir el caso de aceptación
clickeando la UI real (agregar UFs nuevas + su primer Artefacto), se
descubrió que **la sincronización M2-D (ALTA) no puede conectar
físicamente el PRIMER Artefacto de un Local recién creado**: ver
"Bootstrapping de conectividad física en un Local sin ningún terminal
previo" más abajo. El caso de aceptación se resolvió con un fixture de
integración (`verificacionTerminalCriticoPorUF.aceptacion.test.ts`)
construido directamente, sin pasar por ese flujo de UI -- la
verificación de D-δ.48 no depende de que ese gap se resuelva.

**Estado**: D-δ.48 -- CERRADA. Ningún bug de cálculo encontrado (ambos
objetivos A y B ya estaban correctamente implementados); se reforzó la
cobertura de test donde había un gap real (contraejemplo margen≠Presidual,
multi-UF); se hicieron mejoras acotadas de presentación (AF/AC,
orden, resumen, símbolos); se descubrió y documentó -- sin corregir,
fuera de alcance de este incremento -- una limitación real de M2-D.
834+ tests (ver conteo final en el handoff), `tsc -b`/`vite build`
limpios, lint sin regresión, working tree limpio.

## Bootstrapping de conectividad física en un Local sin ningún terminal previo (M2-D, ALTA) -- descubierto en D-δ.48, RESUELTO en D-δ.49

**Hallazgo**: `sincronizarConectividadFisicaDeArtefacto[ConRedesDeclaradas]`
(M2-D, ALTA) solo sabe **agregar un hermano** junto a una conexión física
YA existente del mismo `(unidadFuncionalId, localId)` --
`hallarNodoDeInsercionDeLocal` deriva el punto de inserción del/de los
Tramo(s) que YA alimentan a otros terminales de ese Local en esa Red.
Cuando el Local es COMPLETAMENTE NUEVO (cero terminales conectados
todavía, típicamente porque la UnidadFuncional entera acaba de crearse),
`hallarNodoDeInsercionDeLocal` devuelve `'sinConexionExistente'` -- no
hay ningún hermano del cual derivar el punto de inserción. El resultado
es `redesPendientes` no vacío, pero
`sincronizarConectividadFisicaDeArtefacto[ConRedesDeclaradas]` de todos
modos devuelve `tipo: 'sincronizado'` (con `redesConectadas: []`), y el
llamador (`crearYConectarArtefacto`, `MotorDemandaPantalla.tsx`) usa
`sincronizacion.proyecto` sin distinguir ese caso de un éxito real. El
usuario ve desaparecer el diálogo de "declaración pendiente" (como si
la conexión se hubiera creado) pero el Artefacto queda sin ningún
terminal físico -- silenciosamente, sin ningún mensaje de error --
hasta que `auditarCoberturaFisica` (S1/S2) lo señala más abajo como
"artefacto normativo sin conexión física", indistinguible en el mensaje
de cualquier otro artefacto todavía no declarado.

**Consecuencia práctica**: hoy, un usuario que arma un proyecto nuevo de
varios pisos (agregar 3-4 UnidadesFuncionales y cargar su primer
Artefacto en cada una, el flujo natural para el caso de uso que D-δ.48
quería demostrar en vivo) nunca logra que esos Artefactos queden
físicamente conectados por esta vía -- el Panel de Presión de M2 nunca
llega a renderizarse para esas UF (bloqueado por el aviso "Red
hidráulica incompleta"). Este límite existe desde que M2-D (ALTA) se
implementó; D-δ.48 es la primera corrida que lo ejercita con UFs
genuinamente nuevas (todas las auditorías previas usaron el proyecto de
ejemplo, cuya `redHidraulica` completa fue escrita a mano de una sola
vez, nunca construida incrementalmente vía esta función).

**No se corrige en D-δ.48**: diseñar cómo debería bootstrapearse la
primera conexión de un Local sin precedente (¿conectar directo a la
raíz AF/AC del proyecto? ¿pedir declaración explícita del punto de
inserción, igual que ya se pide la Red cuando no hay precedente de
`artefactoId`? ¿alguna otra estrategia?) es una decisión de arquitectura
que excede el alcance aprobado de este incremento ("no reabre el motor
hidráulico de M2"). Se registra acá para que el próximo incremento que
toque creación de UF/Local no lo redescubra desde cero.

**Condición de resolución**: antes de prometer en producto que "agregar
una Unidad Funcional nueva y cargar sus artefactos" es un flujo
funcional completo de punta a punta, resolver este bootstrapping -- hoy
sigue siendo cierto solo para Locales que ya tenían al menos un
terminal conectado desde el proyecto original.

**Resuelto en D-δ.49** (ver sección dedicada más abajo): `conectarUnaRed`
distingue ahora tres casos -- bootstrap (0 terminales previos, conecta
directo a la raíz AF/AC, creándola desde cero si hiciera falta),
retrofit (1 terminal previo colgado directo de la raíz compartida:
inserta una bifurcación dedicada) y hermano (≥1 terminal ya detrás de
una bifurcación dedicada: sin cambios). Un proyecto puede construirse
íntegramente desde la UI, sin ninguna `redHidraulica` prearmada.

## D-δ.49 -- Bootstrap de conectividad física para Local+Red nuevos -- CERRADA

**Objetivo**: resolver el gap de D-δ.48 de arriba. Ver esa sección para
el hallazgo original; acá se documenta la solución.

### Arquitectura elegida (no fue una decisión roja)

El brief planteaba como posible decisión roja "cabecera explícita de
Local+Red vs. enganchar el primer terminal a una cabecera de UF
existente". La investigación mostró que el modelo YA tenía, en el
propio proyecto de ejemplo, los dos patrones físicos necesarios,
aplicados según el número de terminales de un Local+Red:

- **1 terminal**: conexión directa a la raíz compartida, sin
  bifurcación (Jardín/canillaDeServicio en el demo).
- **≥2 terminales**: bifurcación dedicada exclusiva de ese Local+Red
  (Baño en el demo, nodo `n-af-1`).

No hizo falta inventar una tercera arquitectura ni una entidad nueva de
"cabecera": alcanzó con enseñarle a la sincronización a **transicionar**
correctamente entre esos dos patrones ya existentes, algo que
`hallarNodoDeInsercionDeLocal.ts` (M2-D previo) no hacía -- asumía que
agregar un hermano a un Local con exactamente 1 terminal (patrón
"directo") era topológicamente válido sin retrofit ("sin necesidad de
retrofit ninguno", comentario original), lo cual es cierto para
`validarRedHidraulica` pero **rompe la invariante de D-δ.44** ("un
único Tramo representativo por Local+Red") apenas ese Local crece a 2
terminales.

### Tres casos, un solo punto de decisión (`conectarUnaRed`, `sincronizarConectividadFisicaDeArtefacto.ts`)

1. **Bootstrap** (`hallarNodoDeInsercionDeLocal` devuelve
   `'sinConexionExistente'`): el Local+Red no tiene ningún terminal
   todavía. Se conecta directo a la raíz de esa Red
   (`asegurarRaizAF`/`asegurarRaizAC`, `asegurarRaizDeRed.ts`), que a su
   vez la busca o, si el proyecto está completamente vacío (brief
   sección 13, "primer Local del proyecto"), la crea desde cero (Nodo
   raíz + Nodo AF + Tramo, y para AC además el Nodo `produccionACS` +
   su Tramo, D-δ.7). AF y AC son independientes: `asegurarRaizAC` solo
   se invoca cuando el Artefacto necesita AC, nunca de forma anticipada.
2. **Retrofit** (`hallarNodoDeInsercionDeLocal` devuelve `'nodo'`, y ese
   nodo resulta ser la raíz compartida -- `esNodoRaizCompartida`,
   `asegurarRaizDeRed.ts`): el único terminal existente cuelga todavía
   directo de la raíz. Se inserta una bifurcación nueva, dedicada a ese
   Local+Red: el Tramo existente se reengancha a ella (única excepción
   al principio "aditivo, nunca modifica" de este archivo -- documentada
   en el comentario de `conectarUnaRed`). **`longitud_m`/`accesorios` ya
   cargados viajan al Tramo NUEVO** (raíz → bifurcación), no se quedan en
   el Tramo reenganchado: es el Tramo nuevo el que
   `identificarTramoRepresentativoDeLocal.ts` (D-δ.44) reconoce de ahora
   en más como representativo de ese Local+Red, y en granularidad
   `simplificada` es el único dato que el usuario ve. Sin este traslado,
   agregar un segundo terminal a un Local ya calculado revertía
   `EstadoModulo2` a `'incompleto'` pidiendo de nuevo una longitud que el
   usuario ya había cargado -- **bug real encontrado manualmente en la
   prueba de aceptación de UI (sección siguiente), no anticipado por los
   tests unitarios**, corregido y con test de regresión dedicado.
3. **Hermano** (`hallarNodoDeInsercionDeLocal` devuelve `'nodo'`, y ese
   nodo NO es la raíz compartida): comportamiento sin cambios respecto
   de antes de D-δ.49 -- agrega el nuevo terminal directo desde esa
   bifurcación ya dedicada.

`esNodoRaizCompartida` usa la señal estructural ya existente en
`identificarFilasDeModulo2.ts`/`identificarTramoRepresentativoDeLocal.ts`
(destino de la Alimentación general o de la Alimentación ACS) --
**correcta para cualquier topología construida por `asegurarRaizAF`/
`asegurarRaizAC`** (que siempre crean el Nodo raíz envolvente junto con
n0/n-acs en la misma operación, nunca por separado). Se evaluó y
descartó una alternativa "semántica" (¿el conjunto aguas abajo de este
Nodo pertenece hoy a un único Local?, vía `obtenerArtefactosAguasAbajo`)
por dar falso negativo exactamente en el caso más común: una Alimentación
ACS que hoy sirve a un único Local parecería "dedicada" cuando en
realidad es compartida por diseño para todo el proyecto.

### Verificación de aceptación desde cero (Playwright, sin ninguna `redHidraulica` prearmada)

Reducido el proyecto de ejemplo a su mínimo real alcanzable por UI (1
UnidadFuncional, 1 Local, 0 Artefactos -- un Local sin Artefactos no
bloquea la validación; un proyecto sin ningún Artefacto computable sí,
hasta agregar el primero), se reconstruyó por completo desde la UI:

- Inodoro a depósito (AF-only) → bootstrap AF.
- Lavatorio (AF+AC) en el MISMO Local → AF hace retrofit (ya había un
  terminal directo), AC hace bootstrap completo (primera Alimentación
  ACS de todo el proyecto, creada en el mismo paso).
- Receptáculo de ducha (AF+AC) → hermano en ambas Redes (ya dedicadas
  por el retrofit anterior).
- Local nuevo (Cocina) + Pileta de cocina (AF+AC) → bootstrap para un
  Local nuevo con la raíz ya existente.
- Local nuevo (Jardín) + Canilla de servicio (AF-only) → bootstrap.
- UnidadFuncional nueva (UF2, PB→Piso 1, cota 4,00 confirmada
  automática, D-δ.46/48) + Local + Lavatorio (AF+AC) → bootstrap
  también funciona para una UF completamente nueva, compartiendo la
  misma raíz de todo el proyecto.

Con granularidad simplificada + pérdidas estimadas, cargando 9
longitudes (una por fila Local+Red) + alimentación (tanque simulado con
Pdisponible=20) + hfMedidor=0,5: **`EstadoModulo2` llegó a `'completo'`**,
con Qc/DN/V/hf/Presidual/margen resueltos y el terminal más
desfavorable correctamente identificado **entre las dos
UnidadesFuncionales** (UF2, con menor carga geométrica por su cota
mayor). Cero errores/warnings de consola en toda la secuencia. Se
verificó además, sobre este mismo proyecto construido desde cero:
agregar y eliminar un Artefacto adicional (Qc recomputa correctamente
en ambos sentidos, sin resultado stale ni terminal huérfano);
eliminar+recrear un Local; eliminar+recrear una UnidadFuncional; cambiar
a granularidad profesional (queda estructuralmente válida, sin
"Problemas de validación").

### Casos de test (`sincronizarConectividadFisicaDeArtefacto.test.ts`, `asegurarRaizDeRed.test.ts`)

T1 (bootstrap AF-only), T2 (bootstrap AF+AC desde un proyecto
completamente vacío, incluida la raíz), T3 (AF ya existe/AC no: AF
retrofit + AC bootstrap en la misma llamada), T4 (AF y AC ya dedicados:
hermano en ambas, sin tocar ningún Tramo existente), T5 (segundo
terminal, ninguna segunda cabecera), T11 (sincronización repetida tras
bootstrap y tras retrofit: idempotente, no duplica nada) -- los doce
casos del brief quedan cubiertos entre estos tests unitarios y la
verificación manual de UI de la sección anterior (T6/T7/T8 -- eliminar y
recrear -- y T9/T10 -- múltiples Locales/UFs -- se verificaron
exclusivamente por Playwright, ya que ejercitan la interacción completa
UI→M2-D, no solo la función pura).

### No tocado (fuera de alcance, tal como pedía el brief)

CRIT-A15/A20/A24/A29/A30/A31, D-δ.40/41/44/45/46/47/48, granularidad
simplificada/profesional, métodos estimado/detallado, terminal crítico
por margen, limpieza de red al eliminar Local/UF (D-δ.47). Cambio de
tipo de catálogo de un Artefacto existente sigue sin resincronizar
conectividad física (deuda ya conocida, CRIT-A15) -- no era necesario
tocarlo para resolver el bootstrap.

**Estado**: D-δ.49 -- CERRADA. El bug de bootstrap original quedó
corregido; se encontró y corrigió además un segundo bug real (pérdida
de longitud ya cargada al retrofitear) durante la propia verificación
de aceptación -- exactamente el tipo de hallazgo que los tests
unitarios con topología prearmada no podían exponer, y que motivó la
regla del brief de no sustituir la aceptación por UI con tests
unitarios solamente.

## D-δ.50 -- Cierre UX funcional de M2: duplicar UF + longitudes visibles + longitud vertical por nivel + presión verificable -- CERRADA

Incremento de cierre del flujo real de usuario de Módulo 2 antes de M3.
Cuatro objetivos relacionados, cuatro commits funcionales cohesivos.

### A -- Duplicar UF sincroniza la conectividad física de la copia

**Bug**: `duplicarUnidadFuncionalEnProyecto` clonaba el árbol funcional
(UF/Locales/Artefactos con ids nuevos) pero **no tocaba `redHidraulica`**.
Cada Artefacto clonado quedaba sin ninguna referencia física;
`auditarCoberturaFisica` (S1) lo reportaba como "artefacto normativo sin
conexión física" y el Panel de Presión nunca se renderizaba para la UF
nueva ("Red hidráulica incompleta").

**Corrección** (`interfaz/paginas/duplicarUnidadFuncional.ts`): tras la
copia funcional, cada Artefacto clonado pasa por **la misma
sincronización M2-D de ALTA que usa la UI al agregarlo a mano**
(`sincronizarConectividadFisicaDeArtefacto` -> bootstrap / retrofit /
hermano, D-δ.49). La copia comparte la raíz AF/AC del proyecto y cada
Local clonado arranca sin terminales, así que el primer Artefacto de
cada Red hace bootstrap y los siguientes retrofit/hermano -- exactamente
como si el usuario los cargara uno por uno. **No se agregó ninguna
primitiva topológica exclusiva de "duplicar"** (brief sección 5). AF/AC
se deducen por precedente: la UF original -- que sigue conectada --
siempre es precedente de cada tipo de Artefacto clonado. Si algún
Artefacto original no estaba conectado, su clon queda igual sin conexión
(mismo estado que el original, sin fabricar una).

`generarId` se movió a su propio módulo (`interfaz/paginas/generarId.ts`)
para romper el ciclo de imports que aparece al hacer que
`duplicarUnidadFuncional` dependa de la sincronización física.

**Semántica hidráulica de la duplicación**: sin cambios respecto de
D-δ.48 (Semántica A). La copia conserva `nivel` y
`cotaHidraulicaReferencia_m` de la original (spread), representa la
MISMA unidad física; el usuario la reasigna a otro piso a mano si
corresponde. `longitud_m`/`accesorios` de los Tramos originales NO se
copian a los Tramos nuevos de la copia (los Tramos nuevos nacen sin
relevar, igual que al agregar un Artefacto a mano) -- la copia empieza
pidiendo sus propias longitudes.

Tests: T1 (duplicar -> `auditarCoberturaFisica` sin `artefactosSinReferencia`),
T2 (ids de nodo/tramo propios, referencias a los clones, aislamiento de
mutación), T3 (duplicar dos veces -> red válida, sin ids colisionados).

### C -- Longitud vertical típica automática por nivel de UF (solo `simplificada`)

**Regla (convención IUAS del modo rápido, NO atribuible a ERAS)**: con
PB=0, Piso1=1, Piso2=2, ...

    ΔLvertical(UF) = 3 m · nivel     (PB->0, Piso1->3, Piso2->6, Piso3->9, ...)

Es un valor **DERIVADO**: nunca se persiste, nunca se muta
`Tramo.longitud_m`. Se suma a la longitud EFECTIVA de los Tramos de
Distribución general del camino de presión de esa UF:

- **Alimentación general** -> +ΔLvertical  (todo camino AF y AC)
- **Alimentación ACS**     -> +ΔLvertical  (solo caminos AC -- ese Tramo
  solo aparece en caminos AC)

Como `hfDistribuida` es exactamente lineal en L en Hazen-Williams
(hf = J·L) y en Darcy-Weisbach (hf = f·(L/D)·v²/2g), el efecto se
compone de forma aditiva sin recalcular Qc/DN/V/fricción:

    Δhf = (hf_base / longitud_base) · ΔLvertical

**Primitiva pura** `resolverIncrementoVerticalPorNivel`
(`motor/tuberias/presion/`): dado `(proyecto, camino, unidadFuncional)`
devuelve `{ aplica, nivel, deltaLVertical_m, incrementoPorTramoId,
tramosConIncremento }`. `acumularPerdidaDistribuidaDeCamino` recibe un
parámetro opcional `incrementoLongitudPorTramoId` y enriquece cada
entrada de `porTramo` con `hfBase_m` / `longitudBase_m` /
`incrementoVertical_m` / `hfIncrementoVertical_m` (insumo directo de
"Ver cálculo del crítico"). `resolverPresionResidualDeCamino` expone
`incrementoVerticalPorNivel` en la traza.

**Cota y longitud son dos efectos distintos** (brief secciones 13-14),
ambos existen simultáneamente y NO se sustituyen:

1. GEOMETRÍA -- la cota terminal efectiva ya trae `1 + 3·nivel` (D-δ.46,
   `resolverCotaTerminalEfectiva`); `Δz` la captura sin código nuevo.
2. FRICCIÓN -- los 3·n metros de caño vertical adicionales en la
   Distribución general (ESTE incremento).

Verificado numéricamente (test de integración): para terminales
equivalentes, la caída de Presión residual entre PB y Piso 1 es
`3 + Δhf_vertical`, estrictamente MAYOR que los 3 m del desnivel solo.
"Dos UFs en el mismo piso" no acumula: cada camino deriva su propio
ΔLvertical del nivel de SU terminal.

**Decisión roja resuelta (alternativa A)**: en `granularidad =
'profesional'` la primitiva devuelve SIEMPRE incremento 0. La geometría
vertical la representa el proyectista con Tramos reales / longitudes
relevadas / `Nodo.cota_m` explícitas; `uf.nivel` queda como
metadato/etiqueta y no modifica `hf`. Sin detección heurística de
montantes ni lógica anti-doble-conteo -- las dos granularidades no se
mezclan. **Paralelismo explícito con D-δ.46**:

    SIMPLIFICADA -> cota terminal efectiva desde la UF
                    + longitud vertical típica automática por nivel
    PROFESIONAL  -> cota terminal explícita (Nodo.cota_m)
                    + longitud vertical explícita (Tramos reales)

No toca D-δ.45 (plantilla de pérdidas localizadas rápidas:
Ntees=max(0,n-1) + codo90 Ks=1,35 + llave paso Ks=9,18), ni CRIT-A20
(la longitud BASE sigue esas reglas; el incremento derivado puede ser 0
para PB sin que eso signifique una longitud base 0), ni introduce
accesorios/codos/tees verticales (eso requeriría otra decisión, no se
implementa).

Tests: T4-T6 (PB/Piso1/Piso2 -> ΔLvertical 0/3/6), T7 (dos UFs mismo
piso, no acumulativo), T8 (AF Piso1 -> general +3), T9 (AC Piso1 ->
general +3 Y ACS +3, una sola vez cada uno), T10 (PB no se contamina),
T11 (cambio Piso1->Piso2, 3->6), T12/T33 (integración: geometría +
fricción discriminadas sobre Presidual), + "profesional nunca aplica".

### B -- Longitudes visibles en el bloque principal de M2

`DimensionamientoDeTramo`: el input de **Longitud [m]** -- dato
obligatorio para `hfDistribuida` -- deja de vivir dentro de "Detalle
técnico" y pasa al bloque principal, junto a **DN / V / hf / Estado**,
que se leen de un vistazo sin expandir nada (jerarquía del brief sección
19: DN, V, hf, Estado; Qc pasa a dato secundario). El `<details>`
conserva solo trazabilidad no operativa (refs físicas, n, Di teórico,
Di real, V admisible).

Distribución general: en `simplificada` la fila de Alimentación general /
Alimentación ACS se rotula "longitud base" y se agrega la nota
**"+ 3,00 m/piso automático según el nivel de cada unidad funcional"**.
NO se muestra un único `hf` efectivo en esa fila (sería engañoso con
varias UF a distinto nivel, brief sección 21); el incremento vertical,
ya resuelto por camino, se ve en el detalle de presión de cada terminal.

### D -- Verificación de presión como resultado protagonista

`PanelDePresionDeModulo2` deja de ser principalmente una lista de N
tarjetas:

- **Estado incompleto** (sección 24): protagonista "qué falta",
  agrupado (`agruparMotivosDeModulo2`, ya existente) -- "⚠ No se puede
  calcular la presión todavía" + lista accionable. El detalle por
  terminal queda detrás de un disclosure "Ver detalle de terminales",
  no se despliegan N tarjetas repitiendo el mismo motivo.
- **Estado resoluble** (secciones 25-27): veredicto protagonista
  **✓ CUMPLE / ✕ NO CUMPLE** (CUMPLE solo si TODOS los verificables
  cumplen -- mismo denominador que el resumen agregado, nunca incluye
  `terminalSinPresionMinima` ni incompletos), + "N DE M PUNTOS NO
  CUMPLEN" + "Margen crítico: ±X".
- **Terminal más desfavorable** (secciones 26, 29): Artefacto · UF ·
  nivel · red + tabla Presidual / Pmin / Margen (destacado) +
  recordatorio de que se elige por **menor MARGEN**, no por menor
  Presidual. **D-δ.48 no se reabre** (`resolverTerminalMasDesfavorable`
  ya seleccionaba por `margen = Presidual - PminRequerida`).
- **"Ver cálculo del crítico"** (sección 29, `CalculoDelCriticoDetalle`):
  disclosure nuevo -- descomposición auditable **desde la traza ya
  calculada** (no recalcula nada en React): origen, cota raíz, Δz, carga
  geométrica, longitud vertical automática, recorrido con **longitud
  base + vertical + longitud efectiva + hf por tramo**, hf distribuida
  total, hf localizada, hf medidor, Presidual / Pmin / Margen.
- **"Ver todos los terminales"** (sección 28, `TablaDeTerminales` +
  `resolverFilaDeTerminalParaTabla`): tabla ordenada por **margen
  ascendente** (verificables primero, luego incompletos, luego los sin
  Pmin normativa al final); columnas terminal / ubicación
  (UF·nivel·local) / red / Presidual / Pmin / margen / estado. La
  primera fila verificable coincide con el terminal más desfavorable.

Mantiene D-δ.41 (denominador del resumen = solo `balanceCompleto`).

### Prueba de aceptación end-to-end (Playwright, web real)

Flujo completo sobre el proyecto de ejemplo, en `granularidad
simplificada + pérdidas estimadas`: abrir -> **Duplicar unidad
funcional** (sin "Red hidráulica incompleta", sin artefactos
desconectados) -> asignar la copia a **Piso 1** (cota **4,00**
automática) y a **Piso 2** (cota **7,00**) -> cargar las **20
longitudes visibles** sin entrar a "Detalle técnico" -> cargar
alimentación (Pdisponible) + hfMedidor -> `EstadoModulo2 = 'Completo'`
-> **✓ CUMPLE** -> terminal más desfavorable en la copia (Piso 1/Piso 2,
Agua caliente, con menor margen) -> "Ver cálculo del crítico" mostrando,
para UF de Piso 2: **Δz = 7,00 m**, **longitud vertical automática
+6,00 m**, Alimentación general 4,00 base + 6,00 vertical = **10,00
efectiva**, Alimentación ACS 4,00 + 6,00 = **10,00 efectiva** (el camino
AC recibe el incremento en AMBOS Tramos, una sola vez cada uno) ->
"Ver todos los terminales" ordenado por margen. **Cero errores/warnings
de consola** en toda la secuencia.

### Estado

**D-δ.50 -- CERRADA.** Los cuatro objetivos verificados en la UI real:
duplicar UF sin artefactos desconectados; longitudes obligatorias
visibles en modo rápido; incremento vertical automático por nivel en
`simplificada` (0 en `profesional`), con efecto geométrico y de fricción
discriminados; verificación de presión protagonista con CUMPLE/NO
CUMPLE, terminal crítico por margen, y descomposición auditable. Sin
empezar M3. `tsc -b` / `vite build` limpios, lint baseline 11, working
tree limpio.

## D-δ.51 -- Modos de producto (Rápido / Profesional) + predimensionamiento rápido + presentación tabular de M2 -- CERRADA

Incremento de PRODUCTO/UX: no agrega hidráulica nueva. Define dos
experiencias de uso de Módulo 2 sobre el MISMO motor -- Rápido
(predimensionamiento automático) y Profesional (modelo editable y
auditable) -- y reorganiza la vista principal como tablas compactas.
Cinco commits funcionales + uno documental.

### Modo de trabajo -- concepto DERIVADO, sin campo persistido

`modoDeTrabajo.ts`: el "modo" no es una entidad nueva del dominio ni un
campo de `ConfiguracionHidraulica` -- se DERIVA de dos ejes ortogonales
que ya existían:

    RÁPIDO       = granularidad 'simplificada' + metodoPerdidaLocalizada 'estimado'
    PROFESIONAL  = granularidad 'profesional'  + metodoPerdidaLocalizada 'detallado'
    AVANZADO     = cualquier otra combinación (p. ej. simplificada + detalladas):
                   sigue soportada por el motor (D-δ.47), se controla desde
                   "Configuración avanzada".

Sin migración de esquema, sin `modoDeTrabajo` en `Proyecto`. Se descartó
un campo persistido: reflejaría mecánicamente los enums del motor como un
modo de producto (brief §20) y obligaría a una migración por un dato que
es de presentación.

`aplicarModoRapido(proyecto)`: fija los dos ejes + Hazen-Williams
("cálculo habitual"), y precarga longitudes `undefined`.
`aplicarModoProfesional(proyecto)`: fija los dos ejes, **NO** fuerza
Hazen (un proyectista que venía con Darcy lo conserva, brief §41),
**NO** precarga accesorios (decisión roja, ver abajo), y precarga
longitudes `undefined`. Ninguno resetea datos ya cargados (brief §17):
al volver a Rápido las pérdidas detalladas simplemente dejan de
participar del cálculo activo (D-δ.40), sin contaminación ni doble
conteo.

### Preset Rápido -- valores iniciales de predimensionamiento

`backfillLongitudesDePredimensionamiento.ts`: precarga NO destructiva.
Solo completa `longitud_m === undefined`, **nunca** sobreescribe (un
`2 m` o un `7,35 m` ya cargados se respetan). VALORES INICIALES IUAS,
editables -- **no** norma ERAS, **no** relevamiento, **no** requisito
reglamentario (una sola vez en UI/docs, sin disclaimers por fila, brief
§4/§53). Dos reglas según granularidad:

  - **simplificada** -- solo los Tramos que el usuario ve/edita en modo
    rápido: el representativo de cada (Local, Red) (D-δ.44) → **5 m**; la
    Distribución general y la Alimentación ACS → **10 m**. Los ramales
    internos NO reciben default (no participan de `hfDistribuida` en
    simplificada).
  - **profesional** -- `acumularPerdidaDistribuidaDeCamino` itera TODO
    `camino.tramos`, así que cada Tramo físico requiere su longitud:
    general/ACS → **10 m**, cualquier otro Tramo → **5 m**. Auditoría del
    brief §12 aceptada: no hay Tramos "auxiliares no físicos" en el
    modelo -- cada Tramo conecta nodos reales y representa un recorrido
    real; la clasificación por rol es estructural y determinista (no fue
    decisión roja).

Se aplica en momentos ESTRUCTURALES: montaje del proyecto de ejemplo
(`useState` inicial de `MotorDemandaPantalla`), creación del primer
Artefacto de un Local (bootstrap M2-D), duplicación de UF. **No** en cada
pulsación: vaciar un campo de longitud es una intención explícita del
usuario y el backfill no corre en ese momento.

`proyectoInicial` pasa a arrancar en modo Rápido
(`metodoPerdidaLocalizada` 'detallado' → 'estimado'); el demo muestra
DN/V/hf de entrada sin longitudes faltantes (brief §36/§52).

### Duplicar UF en Rápido

Los Tramos nuevos de la copia (que D-δ.50 decidió NO copiar del
relevamiento de la original) reciben el default IUAS si quedan
`undefined` -- **nunca** copian un `7,35 m` de la original como si fuera
relevamiento de la copia. Las alimentaciones generales compartidas ya
existían: no se duplican.

### Longitud vertical -- D-δ.50 NO se reabre

Solo en `simplificada`: `ΔLvertical = 3 m · nivel` (PB→0, Piso1→3,
Piso2→6, ...), derivada, no persistida, sobre la longitud efectiva de la
Distribución general (y, en AC, de la Alimentación ACS). En `profesional`
la primitiva devuelve incremento 0. Con `Lbase_general = 10 m`: PB→10,
Piso1→13, Piso2→16.

### DECISIÓN ROJA -- precarga de accesorios en Profesional -> ALTERNATIVA A

**Problema:** el brief §14 quería que Profesional arrancara "calculable" y
con accesorios editables, pero no existe ninguna plantilla de accesorios
profesional en el repo (la de D-δ.45 es del modo *estimado*, un conteo de
Ks agregado por Local+Red, nunca `Tramo.accesorios`), y `RedHidraulica`
no tiene geometría espacial: el dominio no puede determinar qué Tramo
lleva un codo90 y cuál una llave de paso.

**Resuelta por el usuario -> alternativa A:** NO precargar accesorios.
`accesorios === undefined` = información física NO relevada; convertirlo
en `[]` sin que el usuario lo confirme afirmaría un relevamiento que
nunca hizo, contra la filosofía ya cerrada del proyecto (no inventar
información física, ausencia ≠ cero, trazabilidad).

**UX resultante** (`AccesoriosDeTramoEditor`): el estado `undefined`
presenta DOS acciones EXPLÍCITAS, nunca un `[]` implícito:
  - "Agregar el primero" (`<select>` de tipo → `[{tipo, cantidad: 1}]`);
  - "Confirmar que este tramo no tiene accesorios" (→ `[]`).
Semántica preservada: `undefined` = pendiente; `[]` = relevado, ninguno;
`[...]` = relevado, declarados. Tees sin cambios (CRIT-A31, orientación
nunca inferida). Un proyecto Profesional recién activado puede quedar
legítimamente `EstadoModulo2 = incompleto` por pérdidas localizadas sin
relevar -- el Panel de Presión ya lo agrupa ("Falta relevar accesorios o
tees en N tramos", D-δ.50), sin N tarjetas repetidas.

### Cabecera de M2 + presentación tabular

`CabeceraDeModulo2` (`ResultadoHidraulicoDeTramo.tsx`): reemplaza la
exposición simultánea de los 5 selectores técnicos + párrafo largo por un
toggle "Modo de trabajo: [Rápido] [Profesional]" (botones con
`aria-pressed`) + una línea de resumen. La configuración técnica completa
sigue disponible, sin perder ninguna capacidad del motor (D-δ.47),
dentro de "Configuración avanzada" (`<details>` colapsado en Rápido,
abierto en Profesional/Avanzado).

`TablaDimensionamientoDeModulo2` + `resolverFilaDeDimensionamiento`
(view-model puro): la vista principal deja de ser una sucesión de
tarjetas largas y pasa a TABLAS escaneables verticalmente
(Tramo/Local · Red · **Longitud** · **DN** · V · Pérdida · Estado). Cada
fila expande su detalle mediante un `<details>` NATIVO (sin estado JS: el
contenido queda siempre en el DOM, lo que preservó los tests `toContain`
existentes).

  - **"Pérdida" de la fila** (brief §25): `hfDistribuida` del Tramo
    (`resolverPerdidaDistribuidaDeTramo`) + `hfLocalizada` estimada del
    Local+Red (`resolverPerdidaLocalizadaEstimadaDeLocal`) cuando ambas
    son inequívocas -- compuesto de resultados del motor, **nunca**
    recalculado en React (brief §46). Estado 'controlar' = CRIT-A24
    ("○ DN mínimo comercial", sin texto técnico protagonista, brief §30).
  - **Distribución general**: tabla de 2 filas; la Longitud es la BASE y
    el +3 m/piso (D-δ.50) se explica en UNA nota debajo, nunca un `hf`
    efectivo único engañoso por fila (brief §22/§26).
  - **Cada Unidad Funcional**: encabezado con nivel + cota + tabla con una
    fila por (Local, Red). Detalle expandible = `LocalYRedCard` sin
    encabezado ni dimensionamiento del representativo (ya están en la
    fila): en Rápido muestra artefactos + estimación localizada + "Ver
    cálculo"; en Profesional el árbol de Tramos físicos + editores de
    accesorios/tees. En Profesional la Longitud de la fila es de solo
    lectura (se edita en el detalle); en Rápido/Avanzado es input inline.

`LocalYRedCard`: nuevas props opcionales `mostrarEncabezado` /
`mostrarDimensionamientoDelRepresentativo` (default `true` =
comportamiento previo intacto).

Panel de presión: sección Alimentación + Medidor compactada (los 3
párrafos de ayuda pasan a un `<details>` "¿Cómo se completan estos
datos?"; labels acortados "Pelo de agua mínimo" / "Medidor provisional
M3"). El cálculo y el contenido de D-δ.50 (CUMPLE/NO CUMPLE, terminal
crítico por margen, "Ver cálculo del crítico", "Ver todos los
terminales") no se tocan.

### Cambio de modo -- preservación de datos

Verificado (unit + Playwright): editar una longitud en Rápido (5 → 7),
cambiar a Profesional → el 7 se conserva (de solo lectura en la fila,
editable en el detalle) y los ~24 Tramos se precargan donde faltaban;
cambiar Hazen↔Darcy recomputa sin stale; volver a Rápido conserva el 7 y
las pérdidas detalladas no contaminan el cálculo estimado.

### Prueba de aceptación end-to-end (Playwright, web real)

**Rápido (§50):** demo → modo Rápido activo → sin cargar longitudes:
General=10, ACS=10, Locales=5 → DN/V/hf visibles de entrada → duplicar UF
→ copia a Piso 1 (cota 4,00, encabezado "... · Piso 1 · cota 4,00 m",
nota "+3,00 m/piso automáticamente") → editar Baño AF 5 → 7: la pérdida
de la fila recomputa al instante (2,697 → 3,175 m.c.a.) → cargar
alimentación (Pdisponible) + medidor → `EstadoModulo2 = Completo` →
**✓ CUMPLE** → terminal más desfavorable en la copia (Piso 1, AC, elegido
por menor margen), Presidual/Pmin/Margen. **Cero errores/warnings de
consola.**

**Profesional (§51):** desde el mismo proyecto → toggle a Profesional →
longitud 7 conservada → "Configuración avanzada" abierta → cada fila
expande a un árbol de Tramos con "⚠ Accesorios (Tabla N°7) sin relevar" +
"Agregar el primero" + "Confirmar que este tramo no tiene accesorios" por
Tramo → Hazen↔Darcy recomputa → volver a Rápido conserva los datos.
**Cero errores/warnings de consola.**

### Estado

**D-δ.51 -- CERRADA.**

RÁPIDO: inmediato, sin pedir configuración técnica; 5/10/10 precargados;
+3/piso (D-δ.50); PPR; Hazen; estimadas; DN/V/hf visibles en tabla;
presión mantiene D-δ.50.

PROFESIONAL: arranca con longitudes propuestas donde faltaban; longitudes
/ accesorios / método / material / sistema editables; detalle técnico
disponible; sin +3/piso automático; **sin reset al cambiar de modo**;
accesorios "sin relevar" con dos acciones explícitas (nunca `[]`
implícito). Puede quedar legítimamente incompleto hasta relevar
accesorios/tees -- comportamiento correcto, agrupado en la UI.

UI: tablas como vista primaria; detalles colapsados; sin repetición de
tarjetas grandes; presión compacta; `overflow-x` en las tablas;
accesibilidad preservada (labels/aria, table headers, símbolo+texto,
D-δ.47 no regresa).

MOTOR: sin regresión, sin doble conteo, sin fórmulas nuevas. Sin empezar
M3. `tsc -b` / `vite build` limpios, lint baseline 11, working tree
limpio.

## D-δ.52 -- Override manual de DN + resincronización física al cambiar tipo de Artefacto (CRIT-A15) -- CERRADA

Último cierre funcional de M2 antes de M3. Dos objetivos acotados, sin
hidráulica nueva. Tres commits (Parte A, Parte B, documental).

### Parte A -- Override manual del diámetro comercial adoptado

**Modelo:** nuevo campo `Tramo.dnComercialAdoptado?: string` -- la
`denominacionComercial` de una entrada del sistema de tubería vigente
(p. ej. `"32 mm"`), **no** un DN numérico arbitrario. Ausente = el motor
adopta el diámetro que resuelve automáticamente (CRIT-A23). Proyectos
existentes sin el campo: comportamiento idéntico (§12).

**El DN adoptado es hidráulicamente EFECTIVO (§8 BIS)**, no una anotación
visual. `resolverDiametroComercialDeTramo`: si el Tramo declara
`dnComercialAdoptado` y esa denominación existe en el sistema vigente,
ESE `candidato` es el resultado -- se resuelve su V y su verificación
reales, y toda la cadena aguas abajo (Di real, J, hf distribuida, hf
localizada dependiente de V, pérdida total, Presidual, margen, terminal
crítico) lo consume **sin ningún recálculo en React**. `Qc` NO cambia
(la demanda no depende del DN). El resultado `conCandidato` agrega dos
campos: `origen` (`'automatico' | 'manual'`) y `candidatoAutomatico`
(el DN que CRIT-A23 recomendaría, para "DN recomendado: X" en el
detalle; `null` si no hay ninguno admisible automáticamente).

La selección automática CRIT-A23 (+ fallback D-δ.27 de Vmin) se extrajo a
`seleccionarCandidatoAutomatico` **sin cambios de lógica** -- se sigue
resolviendo siempre, incluso con override activo, para exponer el
recomendado. CRIT-A23/CRIT-A24/D-δ.27 no se reabren.

**UI -- control ↓ / DN / ↑ / Auto** (`ControlDeDn` +
`resolverControlDeDnDeTramo`, en la celda DN de la tabla, en ambos modos
§9):

- **↑ / ↓** proponen la denominación **inmediata superior / inferior del
  catálogo comercial REAL** (`obtenerEntradasOrdenadasPorDiametroInterior`),
  nunca "DN + 5" (§4/§5). Se **deshabilitan en los extremos** del catálogo
  (`siguiente === null` / `anterior === null`, §10/§11).
- **Auto** elimina el override (`conDnComercialAdoptadoDeTramo` con
  `undefined` -- omite la clave, no un `undefined` asignado) y vuelve al
  automático sin dejar copia manual (§6).
- Bajar a un DN **no admisible SÍ se adopta** -- se muestra la
  verificación `'noAdmisible'` tal cual (el profesional puede explorar,
  §5). No es el fallback de D-δ.27 (`velocidadPorDebajoDelMinimo = false`).

**Cambio de material / sistema (§11/§14):**
`normalizarOverridesDeDnSegunSistema(proyecto, denominacionesValidas)` --
llamado justo después de `conMaterialTuberia` / `conSistemaDeTuberia` en
la UI -- descarta los overrides cuya denominación no exista en el catálogo
del sistema resultante (vuelven a automático); los válidos se conservan.
NO destructivo, idempotente. Se resolvió como interpretación única (no
decisión roja): ignorar-y-limpiar el inválido, nunca mapearlo a otro
diámetro físico.

**Aceptación Playwright (§35):** Alimentación general DN 25 (auto,
V 2,9, Pérdida 4,817) → **↑** → DN **32 mm**, aparecen "manual"/"Auto",
V **1,7**, Pérdida **1,400**, margen del crítico **+21,132 → +24,550**
(propagación a presión, §8 TER) → **↑** otra vez → DN **40 mm** → **Auto**
→ restaura DN 25 y **todos** los resultados exactos, sin stale. Cero
errores de consola.

### Parte B -- CRIT-A15: reconciliación física al cambiar el tipo de Artefacto

**Causa:** cambiar el `artefactoId` de catálogo de un Artefacto existente
actualizaba la capa funcional (M1) pero **no** resincronizaba la
conectividad física AF/AC -- M1 y `redHidraulica` podían quedar
representando instalaciones distintas (deuda conocida desde D-δ.39).

**`reconciliarConectividadFisicaPorCambioDeArtefacto`** -- reconciliación
**POR CONJUNTOS de Redes**, sin desconectar y reconstruir lo que no
cambia. Compone primitivas ya cerradas, no reimplementa ninguna regla
topológica:

- `redesActuales` = las Redes en las que la instancia tiene terminal hoy
  (leído de `redHidraulica`).
- `redesNuevas` = las que el tipo nuevo necesita según
  `determinarRedesFisicasPorPrecedente` **del propio proyecto** (CRIT-A15:
  nunca del catálogo), con un **nuevo parámetro `excluirInstanciaId`**:
  la instancia en transición no cuenta como precedente de sí misma (aún
  tiene los terminales del tipo anterior, y contarla daría
  `inconsistente`). Si no hay precedente inequívoco → solo cambio
  funcional, topología intacta (§23/§24).
- **conservar** (`redesActuales ∩ redesNuevas`): intactas -- nodos,
  tramos, `longitud_m`, `accesorios` y `dnComercialAdoptado` se preservan
  (§16/§A11/§A12).
- **eliminar** (`redesActuales − redesNuevas`):
  `quitarConectividadFisicaDeArtefacto` **acotado a esa Red** (nuevo
  parámetro `red` opcional: elimina solo los terminales de esa Red de la
  instancia, el otro terminal del artefacto mixto queda intacto) +
  `podarNodosSinSalida` (limpia una cabecera de bifurcación que quedó sin
  hijos -- §18/§21). La **Alimentación ACS compartida sobrevive** porque
  el nodo `produccionACS` tiene `referencia` y `podarNodosSinSalida`
  nunca toca nodos con referencia (§21: no eliminar infraestructura
  compartida en uso).
- **agregar** (`redesNuevas − redesActuales`):
  `sincronizarConectividadFisicaDeArtefactoConRedesDeclaradas` con las
  Redes ya determinadas acá -- **no un cuarto algoritmo**: reutiliza
  bootstrap / retrofit / hermano de D-δ.49 (§17/§22). Se usa la variante
  `ConRedesDeclaradas` (no la de precedente) porque la variante de
  precedente volvería a ver la instancia con conectividad parcial y daría
  `inconsistente`.

**Colapso de bifurcación (§19) -- NO fue decisión roja:** el repo ya fija
la postura (D-δ.49 / `quitarConectividadFisicaDeArtefacto`): el nodo
padre de bifurcación **no se colapsa** aunque quede con un único hijo --
`validarRedHidraulica` lo acepta e `identificarTramoRepresentativoDeLocal`
sigue reconociendo el Tramo representativo (con su longitud). No hay
pérdida de datos ni ambigüedad topológica que resolver. Cuando se elimina
el **último** terminal de una Red de un Local, la cabecera queda sin
hijos y `podarNodosSinSalida` sí la remueve (topología muerta, §21).

**Idempotencia (§27):** con `redesActuales === redesNuevas` no elimina ni
agrega nada (devuelve el proyecto sin cambios).

**Orden de operación (§26):** la UI (`ArtefactoFormulario.onCambiarTipo`
→ `LocalFormulario`) aplica cambio funcional + reconciliación + backfill
de longitudes rápidas (D-δ.51) en un **único** `onCambiarProyecto`, sin
render intermedio donde el Artefacto ya cambió pero `redHidraulica`
todavía representa el tipo anterior.

**Bug secundario corregido (§39):** `ListaDeDistribucion`
(`LocalYRedCard`) usaba el nombre del artefacto como React `key` --
colisiona cuando un Local tiene dos artefactos del mismo tipo (dos
"Lavatorio" tras un cambio de tipo). `key` por índice. Era un bug
latente pre-existente que este flujo expuso.

**Aceptación Playwright (§36 + §30):** Baño demo, inodoro (AF) ↔ lavatorio
(AF+AC): la fila "Baño 1 · Agua caliente" aparece/desaparece en la tabla,
cero "artefactos sin conexión física", cero "Problemas de validación",
presión sigue en `Completo`; ida/vuelta ×3 sin huérfanos ni duplicados;
el override manual de DN (32 mm "manual") de la Alimentación general
**sobrevive** al cambio de tipo de un Artefacto no relacionado (§30.6);
"Auto" luego restaura DN 25. Cero errores/warnings de consola.

### No reabierto

D-δ.45/46/48/49/50/51, fórmulas, Pmin, terminal crítico, +3 m/piso,
defaults 5/10, modos Rápido/Profesional, CRIT-A23/A24, D-δ.27.

### Estado

**D-δ.52 -- CERRADA.**

DN: ↑ / ↓ / Auto funcionan; usan el catálogo comercial real; el diámetro
adoptado es efectivo de cálculo (V/hf/presión se recalculan con él);
`origen` + `candidatoAutomatico` distinguen adoptado vs recomendado; Qc
inalterado; límites del catálogo deshabilitan los botones; cambio de
material/sistema descarta overrides inválidos; disponible en Rápido y
Profesional.

CRIT-A15: AF→AF sin reconstrucción; AF→AF+AC agrega solo AC (D-δ.49);
AF+AC→AF elimina solo AC + poda cabecera vacía; redes conservadas
preservan longitud/accesorios/override; primer/último terminal correctos;
sin huérfanos ni duplicados; `validarRedHidraulica` verde;
`auditarCoberturaFisica` completa; resultados reactivos sin stale;
idempotente.

`tsc -b` / `vite build` limpios, lint baseline 11, working tree limpio.
Sin empezar M3.

## D-δ.53 -- M3-A (contrato de dominio de Medidores) + M3-B0/B1 (Tabla N°6 y selección del medidor general) -- PARCIALMENTE CERRADA

Primera corrida de Módulo 3 (Medidores). Investigación de dominio (M3-A) y
primer incremento funcional acotado (M3-B0 + M3-B1). El medidor individual
por unidad funcional (M3-B2 en adelante) sigue abierto.

### Fuente normativa -- ahora disponible en texto

Contra lo registrado hasta acá (`HANDOFF-MODULO-1-A-MODULO-2.md` §7,
D-δ.38: "el repo no contiene el texto de ERAS"), el texto oficial de la
**Resolución 641/2023** (*Guía para ejecución de instalaciones sanitarias
domiciliarias y asimilables*, `argentina.gob.ar`) **sí es accesible**:
el PDF tiene texto seleccionable vía `pdftotext -layout`. Las láminas que
son imágenes (Tabla N°6 sale degradada pero legible; **Tabla N°8 no sale**)
siguen sin ser recuperables por esa vía. Toda cita normativa de este
registro está verificada contra ese texto.

### M3-A -- decisiones de dominio tomadas por el usuario

- **Configuración de medidores (handoff §14): resuelta por ERAS, no es
  decisión roja de "cuál".** §2.6 es explícito: en propiedad horizontal
  (>1 propietario) hay **medidor general** (§2.6.b, en la conexión) **y**
  **medidores individuales por unidad** (§2.6.c), en AF y AC por separado
  ("Estos medidores no sustituyen al medidor general"). Es la
  configuración C del handoff. Lo que sigue siendo decisión roja es **cómo
  representarlo** (D-δ.35) y **qué caudal usa el individual**.

- **Decisión roja 1 (D-δ.35, representación topológica) -- RESUELTA:
  alternativa (4).** No se incorpora ninguna entidad `Medidor` a
  `RedHidraulica`: ni `ReferenciaDeNodo: 'medidor'`, ni `Tramo.medidor`,
  ni nueva topología persistida. **M3 queda separado de `RedHidraulica`**:
  consume caudales ya resueltos por la capa hidráulica aguas arriba y
  produce resultados de medidor como **datos de borde** para la capa de
  presión. La extensión por UF/subred se agregará cuando quede cerrada la
  representación física de la micro-medición, no antes.

- **Decisión roja 3 (fuente de Tabla N°6) -- RESUELTA.** La Tabla N°6 es
  legible en el texto oficial y se transcribe verificada (no stub). Regla
  de selección: primera fila con `Qc_tabla >= Qc_diseño`, sin interpolar
  DN; `C` de esa misma fila. `Qc > 40 m³/h` (tope de Tabla N°6) →
  `'fueraDeTabla06'`, sin extrapolar. **Tabla N°8 no bloquea M3-B1** (§2.12
  define diámetro/caudal máximo por Tabla N°6 y explica la selección con
  Tabla N°6); se transcribirá aparte si aporta umbrales adicionales.

- **Inconsistencia oficial Tabla N°6 / ejemplo -- documentada** como
  CRIT-A32. El ejemplo de "vivienda tipo" empareja DN19 con `C=7`; la
  Tabla N°6 asigna `C=5` a DN19 y `C=7` a DN25. **La tabla es la fuente de
  verdad**; el ejemplo se trata como errata y la tabla no se toca.
  CRIT-A25 permanece firme como transcripción de la fórmula (6): sólo se
  le agregó una salvedad sobre el par DN/C del ejemplo y se reencuadró la
  descripción de su golden aritmético (test `calcularPerdidaCargaMedidor`
  con `Qcl=42,1`, `C=7` → `1,3 m.c.a.`, ya no descrito como propiedad
  normativa del DN19). Observación aritmética coherente: `Qc=0,71 l/s =
  2,556 m³/h` (el valor del ejemplo sin redondear) selecciona **DN25** bajo
  la regla literal, y DN25 sí tiene `C=7` → el `Jm=1,3` del ejemplo es
  consistente con DN25, no con DN19.

- **Decisión roja 2 (caudal del medidor individual: §2.6 vs §2.12.1.e) --
  RESUELTA (alternativa A), formalizada como CRIT-A33.** §2.6 exige
  "simultaneidad total de los consumos" para el individual (`K=1`, suma);
  §2.12.1.e remite genéricamente a "2.9 y siguientes" (pipeline de
  simultaneidad, `K<1`). Se adopta **§2.6** por ser la regla específica y
  dedicada del dimensionamiento del medidor individual:
  `Qunit = Σ (cantidad · qu efectivo)` con `K=1`, sin `Kc`/`K`/`a`, **el
  mismo `Qunit`** para la selección por Tabla N°6 y para el `Qcl` de la
  fórmula (6) (no se adopta solución híbrida — sin evidencia oficial que
  justifique dos caudales). La contradicción de §2.12.1.e se documenta
  como interna de la Guía; no se afirma coherencia. Implementado en
  `motor/medidores/seleccionarMedidorIndividual.ts` (M3-B2a). Lo que sigue
  para M3-B2b: (1) reconstruir figuras 2.2–2.7 de micro-medición;
  (2) cuántos ramales medidos existen por configuración; (3) AF / AC
  central / ACS individual; (4) ubicación del medidor respecto del origen.

### Frontera M3 / M2 (registrada, no toda implementada)

```
M1 (demanda global)  ──►  M2 · capa de CAUDAL  ──►  qc_lps por tramo
                                                          │
                                                          ▼
                                                    M3 · MEDIDORES
                                              (lee qc_lps; NO recalcula demanda;
                                               selecciona/verifica; produce hf)
                                                          │
                                                          ▼
   Presidual / margen / crítico  ◄──  M2 · capa de PRESIÓN  ◄──  hfMedidor (dato de borde)
```

Sin ciclo: M3 lee la capa de *caudal* (aguas arriba de presión) y
devuelve `hfMedidor` a la capa de *presión* (aguas abajo). La pertenencia
de `hfMedidor` al balance de un terminal (según origen hidráulico y tipo
de medidor, D-δ.38) la sigue resolviendo M2, no M3. El punto de entrada
actual `hfMedidor_mca: number | undefined` de
`resolverPresionResidualDeCamino` / `resolverEstadoModulo2` **no cambió en
este incremento**: `seleccionarMedidorGeneral` todavía no está cableado a
ese parámetro (eso es M3-E). El input provisional del Panel de Presión
sigue en su lugar.

### M3-B0 + M3-B1 -- implementado

- `normativa/eras-2023/tabla-06-medidores/index.ts`: `tabla06Medidores`
  (8 filas, DN15..DN75), `qcMaximoCubiertoPorTabla06_m3h` (=40),
  `seleccionarFilaTabla06PorCaudal(qc_m3h)` (regla literal + tolerancia
  `1e-9 m³/h` contra error de conversión). Datos puros, mismo criterio que
  `tabla-01`/`tabla-07`.
- `motor/medidores/seleccionarMedidorGeneral.ts`: motor puro del ámbito
  `'general'`. Entrada `qcDiseno_lps` (el `Qc` global ya resuelto aguas
  arriba). Convierte (`×3,6` a m³/h para la tabla, `×60` a l/min para la
  fórmula), selecciona la fila, toma `C` de esa fila, reutiliza
  `calcularPerdidaCargaMedidor` (CRIT-A25) para `hfMedidor_mca`. Resultado
  discriminado: `'seleccionado'` (con DN, C, caudal medio, umbral de
  tabla, `Qc` en ambas unidades, `hf`) o `'fueraDeTabla06'`. Sin
  verificación metrológica (ERAS no publica `Q1..Q4`/`Qmin`).
- CRIT-A32 en `CRITERIOS.md`; salvedad en CRIT-A25.
- 25 tests nuevos (Tabla N°6 + selección + motor). Suite 928 → 953,
  `tsc -b` verde, `vite build` verde, lint 11 baseline / 0 nuevos. Sin
  cambios de UI ni de runtime de la app (Playwright no afectado).

### M3-B2a -- implementado (medidor individual, motor puro de alcance declarado)

- `motor/medidores/seleccionarMedidorIndividual.ts`: recibe un **alcance
  declarado** —`{ unidadFuncionalId, servicioMedido: 'aguaFria' |
  'aguaCaliente', consumos: [{ etiqueta, cantidad, qu_lps }] }`— con el
  `qu` efectivo de cada consumo **ya resuelto** para el servicio medido.
  `Qunit = Σ (cantidad · qu_lps)` con `K=1` (CRIT-A33), sin `Kc`/`K`/`a`.
  Ese `Qunit` alimenta la selección por Tabla N°6 y el `Qcl` de la fórmula
  (6). Resultado discriminado: `'seleccionado'` / `'fueraDeTabla06'` /
  `'sinConsumo'` (alcance vacío o todos `qu=0`), cada uno con el eco del
  alcance (`unidadFuncionalId`, `servicioMedido`, `nConsumos`,
  `qunitTotal_lps`) para la memoria de cálculo y el futuro DTO.
- **NO autodetecta** cuántos medidores individuales hay ni dónde van (eso
  es M3-B2b). **NO** impone "1 AF + 1 AC por UF". **NO** toca
  `RedHidraulica`.
- **Semántica AF/AC:** la resolución `artefacto → qu efectivo por red`
  (sin doble conteo) es responsabilidad del llamador y ya la cierra
  `resolverQuEfectivoParaTramo` / CRIT-A15 (artefacto de una sola red →
  `quTotal`; mixto → `quFria`+`quCaliente` = total; paso por ACS
  contemplado). Este motor **suma lo que recibe**, no reinterpreta `qu`.
  La investigación previa confirmó que el modelo tiene **una única
  semántica cerrada** para esto — no fue decisión roja.
- **`resolverSeleccionYPerdidaDeMedidor`**: núcleo común extraído de
  `seleccionarMedidorGeneral` al aparecer el segundo consumidor real
  (conversión de unidades, `C` de la fila, tope de Tabla N°6, sin
  verificación metrológica). `seleccionarMedidorGeneral` pasa a
  envolverlo; su tipo público y comportamiento no cambian.
- CRIT-A33 en `CRITERIOS.md`. 11 tests nuevos (los 10 casos pedidos +
  validaciones). Suite 953 → 964, `tsc -b` / `vite build` verdes, lint 11
  baseline / 0 nuevos.

### Qué NO se hizo (y por qué)

- **M3-B2b -- cardinalidad y ubicación de medidores individuales.** Qué
  ramales medidos existen según la configuración física real (AF, AC
  central con ramal común medido, ACS individual sin ramal medido),
  qué UF abastecen, dónde está el medidor respecto del origen y del
  almacenamiento. Requiere reconstruir antes las figuras 2.2–2.7 de
  micro-medición. No se persiste ninguna cardinalidad todavía.
- **`EstadoModulo3`** -- M3-C. Propuesta preliminar en la corrida M3-A
  (`noIniciado` / `error` / `incompleto` / `evaluado` + `todosCumplen`,
  separando "cálculo completo" de "medidor cumple"). No implementada.
- **Persistencia** (`esPropiedadHorizontal`, `medidorAdoptadoDN`) -- M3-C.
- **Integración `hfMedidor` M3→M2** (reemplazo del input provisional) --
  M3-E. El DTO **no** se fija todavía como
  `porUnidadFuncional: Record<ufId, {hf}>` (una UF puede tener más de un
  ramal medido). Dirección: `{ general?, individuales: [...] }` donde cada
  individual declara suficiente alcance para decidir si pertenece al
  camino de un terminal. Puede requerir cerrar antes el origen hidráulico
  (D-δ.36/D-δ.38).
- **Override manual de medidor adoptado** (handoff §24) -- registrado como
  cuestión abierta; patrón candidato análogo a `dnComercialAdoptado`
  (D-δ.52). Sin evidencia suficiente todavía.
- **UI Rápido/Profesional** -- M3-D.

### Estado

**D-δ.53 -- PARCIALMENTE CERRADA.** Cerrados: M3-A (contrato de dominio),
M3-B0 (Tabla N°6), M3-B1 (medidor general), M3-B2a (medidor individual por
alcance declarado, `K=1` / CRIT-A33), **M3-B2b (cardinalidad y alcance de
medidores individuales / CRIT-A34, ver D-δ.54)**. Decisiones rojas 1, 2, 3
y la de M3-B2b resueltas. Pendientes: `EstadoModulo3` (M3-C), persistencia
(M3-C), integración `hfMedidor` M3→M2 (M3-E), UI (M3-D), auditoría
end-to-end (M3-F). Ninguno bloqueado por decisión roja; sí a la espera de
la próxima decisión del usuario sobre por dónde seguir.

## D-δ.54 -- M3-B2b: cardinalidad y alcance de medidores individuales (figuras de micromedición reconstruidas) -- CERRADA

Continuación de D-δ.53. Cierra la pregunta que en la corrida anterior
había quedado detenida en decisión roja: *dada la configuración física
real del proyecto, ¿qué medidores individuales existen y qué alcance
tiene cada uno?*

### Resolución de la decisión roja -- alternativa A

Se descartó la alternativa B (convención topológica IUAS: inferir el tipo
de ACS desde la posición de `produccionACS` en `RedHidraulica`). El
usuario recuperó las **Figuras 2.2–2.7 y 2.14–2.16** desde fuentes
oficiales / AySA con evidencia suficiente.

### Figuras 2.2–2.7 (ubicación de los sectores de micromedición)

| Figura | Contenido |
|---|---|
| 2.2 | Gabinete del **medidor general**. |
| 2.3 | Gabinete de **medidores sectorizado**: montante general + montante auxiliar, derivaciones identificadas Deptos. 1…6 con medidor individual. |
| 2.4 | Medidores individuales agrupados en **sala exclusiva**, con tanques de bombeo y reserva. |
| 2.5 | Ídem sala exclusiva, con **equipo presurizador**. |
| 2.6 | Medición individual **sectorizada** en lugares comunes, con tanque de bombeo + reserva. |
| 2.7 | Medición individual **sectorizada** en lugares comunes, con equipo presurizador. |

**Conclusión:** 2.4–2.7 son variantes de **ubicación** del sector de
micromedición y del sistema de alimentación. **No** justifican inferir el
tipo de ACS desde la topología, y **no** afectan el cálculo de selección
del medidor individual (sólo trazabilidad físico-documental de la
instalación, no modelada en este slice).

### Figuras 2.14–2.16 (agua caliente)

| Figura | Contenido |
|---|---|
| 2.14 | Sistema **central** de ACS: tanque/reserva, acumulador de AC, equipo de recirculación, montante general, medidores de AC **agrupados** en sala/sector común. |
| 2.15 | Ídem ACS central, con gabinetes de medidores de AC **sectorizados** en lugares comunes. |
| 2.16 | Micromedición **individual de AC**: montante general + auxiliar, ramales identificados Depto. 1…6, **medidor en el ramal**, límite de entrada a la propiedad aguas abajo, llave de paso de la UF. Coherente con §2.19.5 (*"cada ramal de distribución de agua caliente desde el medidor hasta la entrada de la UF"*). |

### Criterio físico cerrado (CRIT-A34)

- **CASO A — ACS individual dentro de la UF.** Desde instalaciones
  comunes entra sólo el suministro de AF, medido. El medidor individual
  de AF está **aguas arriba** de la división interna AF-directa /
  AF→producción-ACS-individual. Por **conservación de masa** (D-δ.6) ese
  medidor contabiliza **todo** el consumo de agua aguas abajo: para un
  artefacto mixto aporta **`quTotal`**, no sólo `quFría`. No existe
  medidor de AC común independiente (no hay ramal común de AC entrando a
  la UF). ⇒ por UF, **1 alcance**: `servicioMedido = 'aguaFria'`,
  consumos = todos los consumos conectados de la UF con su `quTotal`.
- **CASO B — ACS central.** AF y AC llegan a la UF por ramales comunes
  distintos, cada uno con su medidor. Artefacto mixto: `quFría` al medidor
  de AF, `quCaliente` al de AC (suman `quTotal`, sin doble conteo).
  Artefacto de una sola red: `quTotal` a esa red. ⇒ por UF: **alcance de
  AF** siempre (si hay consumo conectado) + **alcance de AC sólo si hay
  consumo de AC** (nunca un medidor de AC vacío).
- **Sin propiedad horizontal ⇒ 0 alcances.**

### `individual` vs `central` = configuración declarada, no inferida

`ReferenciaDeProduccionACS = { tipo: 'produccionACS' }` no distingue
central de individual (D-δ.7: sin enumeración de tipo de equipo). **No se
adopta** la convención "`produccionACS` dentro del subárbol de la UF ⇒
individual": sería una inferencia nueva y frágil, sin respaldo en las
figuras. El tipo de provisión de ACS es un **dato de entrada por UF**
(`ConfiguracionDeMedicionIndividual.tipoProvisionACSPorUnidadFuncional:
Record<ufId, 'individual' | 'central'>`). `RedHidraulica` se consulta
sólo para la conectividad física de cada artefacto (CRIT-A15, vía
`determinarConectividadFisica`). `esPropiedadHorizontal` también es
entrada pura. **Nada se persiste en este slice** -- la persistencia
(posiblemente configuración global con override por UF) es M3-C.

### Identidad del alcance

`unidadFuncionalId + servicioMedido` (`'aguaFria' | 'aguaCaliente'`). En
los esquemas normativos observados cada ramal medido individual
identifica una UF y un servicio. **Si aparece evidencia real de más de un
ramal medido del mismo servicio para la misma UF: decisión roja** -- no
se modela todavía. No se introduce ninguna entidad de medidor en
`RedHidraulica` (decisión roja 1 / D-δ.35 sigue en pie).

### Universo de consumos y CRIT-A8

Consumos = artefactos **computables** (`origen === 'normativo'`) y
**físicamente conectados** (al menos un terminal en `RedHidraulica`; un
artefacto sin conexión es brecha de cobertura S1, no un consumo de este
cálculo). El filtro de participación **CRIT-A8** (coexistencia física por
Local) **no se aplica en este slice**: no restar consumos es conservador
para el dimensionamiento del medidor (medidor mayor, menor pérdida),
coherente con *"garantizar el registro de los caudales reales máximos"*
de §2.6. Incorporarlo queda como refinamiento futuro registrado.

### Relación B2b → B2a

```
configuración física declarada (esPropiedadHorizontal, tipoProvisionACS/UF)
        │
        ▼
resolverAlcancesDeMedidoresIndividuales   (B2b, CRIT-A34)
        │  → [ AlcanceMedidorIndividual ]  (ufId, servicioMedido, consumos)
        ▼
seleccionarMedidorIndividual              (B2a, CRIT-A33 K=1 + CRIT-A32 Tabla N°6)
        │  → DN, C, hfMedidor por alcance
```

B2b **no** repite selección ni pérdida. B2a **no** conoce topología ni
configuración.

### Implementado

- `motor/medidores/resolverAlcancesDeMedidoresIndividuales.ts` (función
  pura + `ConfiguracionDeMedicionIndividual`, `TipoProvisionACS`).
- CRIT-A34 en `CRITERIOS.md`.
- 11 tests (los 10 casos pedidos por el usuario + validaciones: no PH,
  individual→AF/quTotal, central→AF+AC, suma mixto = quTotal, central sin
  AC→sin medidor AC, dos UF independientes, cambio de artefactos sin
  stale, B2b→B2a integración, artefacto no-normativo / sin conexión
  omitidos, falta `tipoProvisionACS`→throw, PH sin red→throw).
- Suite 964 → 975, `tsc -b` / `vite build` verdes, lint 11 baseline / 0
  nuevos. Sin cambios de UI ni de runtime de la app.

### Qué NO se hizo

- Variantes de ubicación del sector de micromedición (Figs. 2.4–2.7): no
  afectan el cálculo, no se modelan.
- >1 ramal medido del mismo servicio por UF: decisión roja si aparece.
- CRIT-A8 sobre el universo de consumos: refinamiento futuro.
- Persistencia de `esPropiedadHorizontal` / `tipoProvisionACS`: M3-C.
- `EstadoModulo3`, integración `hfMedidor`→M2, UI: M3-C/D/E.

### Estado

**D-δ.54 -- CERRADA.** M3-B2b entregado. M3-B (motor puro de medidores:
general + individual, selección + cardinalidad) queda completo. Sigue
pendiente, sin decisión roja: M3-C (`EstadoModulo3` + persistencia), M3-D
(UI), M3-E (integración `hfMedidor` M3→M2), M3-F (auditoría end-to-end).

## D-δ.55 -- M3-C: configuración persistida de medidores + `EstadoModulo3` -- CERRADA

Continuación de D-δ.53/D-δ.54. Cierra la configuración persistida mínima
de Módulo 3 y la primitiva de estado/orquestación completa.

### Configuración persistida (`Proyecto.configuracionMedidores?`)

```ts
configuracionMedidores?: {
  esPropiedadHorizontal: boolean
  tipoProvisionACS: 'individual' | 'central'          // default del proyecto
  tipoProvisionACSPorUnidadFuncional?: Record<ufId, 'individual' | 'central'>  // override
}
```

- **Sólo decisiones físicas del usuario.** Nunca resultados derivados
  (alcances, `Qunit`, DN, `C`, `hf`, `EstadoModulo3`): todo eso se
  recalcula en cada llamada -- nunca hay valor stale persistido.
- **Optativo a propósito.** Un Proyecto anterior a M3 (sin
  `configuracionMedidores`) sigue siendo válido y resuelve
  `EstadoModulo3 = 'noIniciado'` **sin migración** (adición de campo
  opcional, mismo criterio que `redHidraulica?` / `nivel?` /
  `cotaHidraulicaReferencia_m?`; `SCHEMA_VERSION` sin tocar).
- **`esPropiedadHorizontal: false` NO es "no iniciado"** -- es una
  decisión válida y explícita, lleva a `'evaluado'` con sólo el medidor
  general.
- **Global + override por UF.** La mayoría de los proyectos será
  homogénea; el override cubre el proyecto mixto sin imponerlo.
  `tipoProvisionACSEfectivo(config, ufId) = override[ufId] ?? default`.
- `TipoProvisionACS` se movió de `motor/medidores/` al modelo
  (`modelo/proyecto`): ahora tiene dos consumidores reales (la config
  persistida y el input de B2b), lo que justifica la reubicación (regla
  de `evitar-infraestructura-preventiva` satisfecha).

### Validación

`validarConfiguracionMedidores` (código
`configuracionMedidoresUnidadFuncionalInexistente`, severidad *error*):
una clave del override que no corresponde a ninguna UF real del Proyecto
es una inconsistencia estructural (identificador colgado), no un dato
faltante -- mismo estatus que `redHidraulicaReferenciaArtefactoInvalida`.
Integrado en `validarProyecto`. Ausencia de `configuracionMedidores` no
es un problema de validación (es `'noIniciado'`).

**Limpieza del override al eliminar una UF:** hoy la baja de UF es
código de UI inline (`MotorDemandaPantalla.tsx`), sin updater de dominio.
Si se elimina una UF referenciada por un override, `resolverEstadoModulo3`
lo reporta como `'error'` (vía el validador) -- comportamiento coherente
y no silencioso. La poda automática del override en el momento de la baja
queda para cuando la baja de UF pase por un updater de dominio (M3-D o
después).

### `resolverEstadoModulo3` (`motor/modulo3/`)

Orquestador puro que **compone, sin reimplementar**, las piezas ya
cerradas de M3-B:

```
calcularSimultaneidad            → Qc global del proyecto (CRIT-A5)
seleccionarMedidorGeneral        → M3-B1 (Tabla N°6 / CRIT-A32)
resolverAlcancesDeMedidoresIndividuales → M3-B2b (CRIT-A34)
seleccionarMedidorIndividual     → M3-B2a (K=1 / CRIT-A33)
```

No conoce React, no toca `RedHidraulica`, no persiste. `ResultadoModulo3`
compone (no copia): `medidorGeneral` (el resultado B1) +
`medidoresIndividuales: [{ alcance, resultado }]` (el alcance B2b con sus
consumos + el resultado B2a con DN/C/hf/Qunit) -- M3-D podrá mostrar todo
sin recalcular.

### `EstadoModulo3` -- cuatro estados

| Estado | Cuándo |
|---|---|
| `noIniciado` | No existe `configuracionMedidores`. Estado explícito, no default. |
| `error` | Inconsistencia estructural: override de ACS a UF inexistente; red hidráulica estructuralmente inválida cuando la medición individual la necesita. **Nunca** para `Qc > Tabla N°6`. |
| `incompleto` | Falta un insumo: sin artefactos computables; `Qc` global indeterminado; red ausente con propiedad horizontal; algún caudal (general o individual) `> 40 m³/h` (sin extrapolar -- `fueraDeTabla06`). Motivos tipados/discriminados. |
| `evaluado` | Medidor general + todos los individuales requeridos seleccionados, con su `hf`. |

**`evaluado` NO lleva `todosCumplen`/`cumple`.** Hoy no existe
verificación metrológica (ERAS no publica `Q1..Q4`/`Qmin`) ni override
manual de medidor cerrado -- `'evaluado'` significa *"todos los medidores
requeridos fueron seleccionados"*, no *"todos cumplen"*. Un caudal fuera
de Tabla N°6 es `'incompleto'`, no un `'evaluado'` con un flag en falso.
Cuando exista una verificación independiente real se agregará entonces
(`cumple` / `fueraDeRango`), no antes -- no se anticipa semántica
inexistente.

### Qué NO se hizo

- UI de M3 (M3-D). Sólo tipos/helpers para que M3-D consuma el resultado.
- Integración `hfMedidor` M3→M2 (M3-E): el input provisional del Panel de
  Presión de M2 sigue intacto.
- Override manual de medidor (recomendado vs. adoptado): patrón razonable
  para el modo Profesional, análogo a `dnComercialAdoptado` (D-δ.52); no
  necesario para `EstadoModulo3`. Deuda registrada para M3-D.
- Verificación de coherencia `esPropiedadHorizontal` ↔ `tipoDeProyecto`
  (p. ej. PH con `viviendaIndividual`): no se cruza en este slice.
- Poda automática del override al eliminar una UF (ver más arriba).

### Estado

**D-δ.55 -- CERRADA.** M3-C entregado. Pendiente sin decisión roja: M3-D
(UI Rápido/Profesional), M3-E (integración `hfMedidor` M3→M2, DTO
`{ general?, individuales: [...] }`, posible dependencia del origen
hidráulico D-δ.36/D-δ.38), M3-F (auditoría end-to-end). Menores: Tabla
N°8 (rango `> 40 m³/h`), CRIT-A8 sobre el universo de consumos de B2b,
poda del override en la baja de UF.

## D-δ.56 -- M3-D parte 1: panel de Medidores en la UI (configuración + resultados) -- CERRADA

Primera parte de la UI de Módulo 3. Agrega el panel "Módulo 3 —
Medidores" a la one-page, después de Módulo 2.

### Alcance de esta parte

- **Configuración persistida vía UI**: botón "Iniciar Módulo 3" (fija
  `configuracionMedidores` con un default explícito -- `esPropiedadHorizontal:
  false`, `tipoProvisionACS: 'individual'` -- a partir de ahí
  `EstadoModulo3` deja de ser `'noIniciado'`); checkbox de propiedad
  horizontal; selector de provisión de ACS global + `<details>` de
  excepciones por UF (con el tipo efectivo visible por UF).
- **Resultados**: `EstadoModulo3` (`noIniciado` / `error` / `incompleto`
  / `evaluado`); tabla del medidor general (Qc utilizado, DN, C, hf);
  tabla de medidores individuales (`UF | servicio | Q | DN | C | hf`). Un
  caudal por encima de Tabla N°6 se muestra como `'incompleto'` con el
  motivo -- **nunca un DN inventado**.
- **Rápido / Profesional**: derivado de `resolverModoDeTrabajo`
  (`configuracionHidraulica`, D-δ.51) -- **no** un eje nuevo. Profesional
  agrega detalle técnico (caudal medio, umbral de fila de Tabla N°6,
  cantidad de consumos del alcance, Q en l/s). Sin diferencia hidráulica
  entre modos.
- La configuración **sí** se persiste en `Proyecto.configuracionMedidores`
  (a diferencia del input provisional de `hfMedidor` del Panel de
  Presión); los resultados **no** -- se recalculan en cada render con
  `resolverEstadoModulo3`.

### Piezas

- `interfaz/paginas/actualizarConfiguracionMedidores.ts` -- updaters
  inmutables (`conModulo3Iniciado`, `conPropiedadHorizontal`,
  `conTipoProvisionACS`, `conTipoProvisionACSDeUnidadFuncional`).
  `'default'` en el override quita la entrada de esa UF y elimina el
  objeto override entero si queda vacío (nunca un `{}` residual).
- `interfaz/paginas/PanelDeMedidoresDeModulo3.tsx` -- componente de
  presentación, sin cálculo propio.
- `interfaz/paginas/humanizarModulo3.ts` -- etiquetas + descripción de
  motivos + formateo es-AR (helpers puros, patrón del repo para testear
  UI en `environment: 'node'`).
- 10 tests nuevos (updaters + humanize). `resolverEstadoModulo3` ya está
  cubierto por sus propios 14 tests.

### Verificación

`tsc -b` verde, `vite build` verde, el dev server levanta y sirve el
módulo transformado sin error. **No hay Playwright ni tests de componente
en el repo** (`vitest` corre en `environment: 'node'`, cero `.test.tsx`,
cero `@playwright/test`); los "Playwright verde" de handoffs previos no
corresponden a infraestructura versionada. La verificación interactiva
(click-through, consola del navegador) no se hizo por falta de esa infra;
agregarla es una decisión de infraestructura aparte, no parte de M3-D.

### Pendiente

- **M3-D parte 2**: override manual de medidor **recomendado vs.
  adoptado** (↑ / ↓ / Auto sobre filas reales de Tabla N°6,
  hidráulicamente efectivo -- DN adoptado → C de esa fila → recálculo de
  `hf`, análogo a `dnComercialAdoptado` de D-δ.52). Requiere campos
  persistidos nuevos (`medidorGeneralAdoptado?`,
  `medidoresIndividualesAdoptados?` con identidad `UF + servicioMedido`)
  y que `resolverEstadoModulo3` los aplique. Test anti-stale obligatorio.
  Estado del resultado del medidor debe distinguir "seleccionado
  manualmente" de "recomendación normativa" **sin** introducir
  `todosCumplen` ni términos `Qmin/Q1..Q4`.
- **M3-E**: integración `hfMedidor` M3→M2 (sin empezar).

### Estado

**D-δ.56 -- CERRADA** para la parte 1 (configuración + resultados +
Rápido/Profesional). M3-D parte 2 (override manual) → D-δ.57. M3-E sigue
pendiente, sin decisión roja.

## D-δ.57 -- M3-D parte 2: override manual de medidor (recomendado vs. adoptado, hidráulicamente efectivo) -- CERRADA

Segunda parte de la UI de Módulo 3. Misma filosofía que D-δ.52 para el
DN comercial de tuberías: **recomendado** (resultado automático de Tabla
N°6, CRIT-A32) vs. **adoptado** (decisión explícita del usuario). Sin
override, `adoptado = recomendado`.

### Persistencia (`ConfiguracionDeMedidores` ampliada)

```ts
medidorGeneralAdoptadoDN?: number
medidoresIndividualesAdoptadosDN?: Readonly<Record<string, number>>  // clave: `${ufId}|${servicioMedido}`
```

- Optativos: un Proyecto sin overrides se comporta **idéntico** (sin
  migración). Sólo se persiste la **decisión** (el DN); `C`, `hf` y `Q`
  se recalculan.
- Identidad del alcance individual: `unidadFuncionalId + servicioMedido`
  (`claveDeAlcanceDeMedidor`, en `motor/medidores/`) -- **nunca** sólo la
  UF.
- Un DN que no exista en Tabla N°6 (dato persistido corrupto) se ignora
  -- se vuelve a automático, nunca hace fallar el cálculo.

### `resolverMedidorAdoptado` (`motor/medidores/`, puro)

Dado el `'seleccionado'` del núcleo (B1/B2a) + el DN adoptado (o
`undefined` = automático) devuelve `MedidorEvaluado`:

```ts
{ qcDiseno_lps, qcDiseno_m3h, qcl_lpm,
  recomendado: { dn, C, caudalMedio, umbral, hf },
  adoptado:    { dn, C, caudalMedio, umbral, hf,   // ← EFECTIVOS (de la fila adoptada)
                 origen: 'automatico' | 'manual',
                 criterioSeleccion: 'satisface' | 'inferiorAlRecomendado' } }
```

- **El DN adoptado es hidráulicamente efectivo:** `C` sale de esa fila y
  `hf = 0,036·(Qcl/C_adoptado)²` (CRIT-A25). `Qcl` / `Qc` **no cambian**.
- `criterioSeleccion = 'inferiorAlRecomendado'` cuando el usuario adopta
  una fila cuyo umbral `Qc_tabla < Qc_diseño`. **No** es "fuera de rango
  metrológico" -- ERAS no publica `Qmin`/`Q1..Q4`; sólo significa que el
  medidor adoptado no satisface la selección automática. `hf` se sigue
  calculando (C existe).

### Orquestador (`resolverEstadoModulo3`)

- Aplica los overrides: `ResultadoModulo3` pasa a
  `{ medidorGeneral, medidoresIndividuales }` donde cada medidor es un
  `MedidorEvaluado` (`recomendado` + `adoptado` + caudales) más el ámbito
  y, en el individual, `unidadFuncionalId` / `servicioMedido` /
  `nConsumos`.
- **Aislamiento**: cambiar el override de `uf-1|aguaFria` no toca
  `uf-1|aguaCaliente`, ni `uf-2`, ni el general.
- **Overrides huérfanos** (clave cuyo alcance ya no existe, p. ej. tras
  cambiar ACS individual↔central) se **ignoran** al resolver -- nunca se
  reutilizan para otro alcance, nunca contaminan. Poda a nivel de lectura
  (cero infra); las entradas quedan inertes en la config persistida.
- **`EstadoModulo3` no cambia de semántica**: sigue
  `noIniciado`/`error`/`incompleto`/`evaluado`. Un módulo puede estar
  `'evaluado'` con un medidor adoptado inferior al recomendado -- la
  condición vive en `adoptado.criterioSeleccion`, **no** se agrega
  `todosCumplen`.

### UI

- `interfaz/paginas/resolverControlDeMedidor.ts` -- view-model del control
  ↓ / DN / ↑ / Auto: navega por el orden **real** de Tabla N°6
  (`15/19/25/32/38/50/60/75`), extremos → botón deshabilitado.
- `actualizarConfiguracionMedidores.ts` -- `conMedidorGeneralAdoptado` /
  `conMedidorIndividualAdoptado` (`'auto'` quita el override; record
  vacío se elimina).
- `PanelDeMedidoresDeModulo3.tsx` -- control compacto `↓ DN ↑` +
  `Manual`/`Auto` + "recomendado: N mm" + advertencia ⚠ cuando el
  adoptado no satisface el criterio de Tabla N°6. Se muestra en Rápido y
  Profesional (coherencia con el control de DN de tuberías de D-δ.52).

### Verificación

`tsc -b` verde, `vite build` verde, el dev server sirve el panel
reescrito sin error de transform. **Sin Playwright / tests de
componente** (el repo no tiene esa infra). 19 tests nuevos:
`resolverMedidorAdoptado` (incl. anti-stale D2-12: DN, C, caudal medio,
umbral y hf del adoptado son todos de la **misma** fila),
`resolverControlDeMedidor` (↑/↓ y extremos), updaters (aislamiento
UF+servicio, limpieza de record vacío), y la integración en el
orquestador (aislamiento, no-reutilización de override al cambiar ACS,
huérfanos ignorados).

### Estado

**D-δ.57 -- CERRADA.** M3-D completo (parte 1 + parte 2). Pendiente sin
decisión roja: **M3-E** (integración de `hfMedidor` M3→M2), M3-F
(auditoría end-to-end). Menores: Tabla N°8 (`> 40 m³/h`), CRIT-A8 en el
universo de consumos de B2b, poda activa de overrides huérfanos al
cambiar ACS (hoy ignorados al leer).

## D-δ.58 -- M3-E: integración de las pérdidas de medidores M3 al balance de presión M2 -- CERRADA

Elimina el input provisional `hfMedidor` del Panel de Presión. M2 consume
automáticamente la pérdida de medidores que pertenece al camino de **cada
terminal**.

### `resolverPerdidasDeMedidoresParaTerminal` (`motor/modulo3/`, puro)

`{ estadoModulo3, configuracionMedidores, unidadFuncionalIdDelTerminal,
redDelTerminal, origenHidraulico }` → discriminado:

- `{ estado: 'determinadas', componentes: ComponentePerdidaDeMedidor[], hfTotal_mca }`
- `{ estado: 'indeterminado', motivos: [...] }`

**Reglas físicas** (cerradas en D-δ.38/D-δ.54, ver también handoff M3-E):

| | `alimentacionDirecta` | `tanqueElevado` |
|---|---|---|
| Medidor **general** | pertenece al camino | **NO** (aguas arriba del almacenamiento) |
| Medidor **individual** | pertenece al camino de su UF | ídem |

- **ACS `individual`**: la UF tiene un único medidor individual de **agua
  fría** de entrada, aguas arriba de la producción de ACS interna → su
  `hf` aplica a los terminales AF **y AC** de esa UF. **No** se usa
  `servicioMedido === redDelTerminal` como regla (el componente marca
  `aplicaPorProvisionACSIndividual: true` cuando el terminal es AC).
- **ACS `central`**: medidor AF → sólo terminales AF; medidor AC → sólo
  terminales AC. Nunca ambos en un terminal.
- **Aislamiento por UF**: el medidor de una UF nunca afecta a otra.
- Identidad: `unidadFuncionalId + servicioMedido`.

**`determinadas` con `componentes: []` y `hfTotal_mca: 0`** es un
resultado **válido** cuando se determinó físicamente que ningún medidor
pertenece al camino (p. ej. tanque elevado + sin propiedad horizontal).
Es distinto de `'indeterminado'` (falta información): eso **nunca** se
convierte en 0 -- el balance de M2 queda incompleto por `hfMedidor`.

### `EstadoModulo3.incompleto` gana `parcial`

`{ medidorGeneral?, medidoresIndividuales }` con los medidores que **sí**
se evaluaron. Así, `resolverPerdidasDeMedidoresParaTerminal` puede cerrar
un balance concreto cuando el medidor de **ese** camino está disponible,
aunque otro medidor irrelevante para ese camino haya quedado fuera de
Tabla N°6 (D-δ.58 §12 del handoff). `error`/`noIniciado` → siempre
`indeterminado` (sin config no se sabe siquiera si hay PH).

### Integración

- **`resolverEstadoModulo2`**: `hfMedidor_mca` acepta además una función
  `(nodoTerminalId) => number | undefined`. El escalar sigue soportado
  (los 17 tests históricos, intactos). **`resolverPresionResidualDeCamino`
  NO se toca** -- sigue recibiendo `number | undefined` por terminal.
- **Panel de Presión**: calcula `EstadoModulo3` una vez; deriva
  `hfMedidorDeTerminal(nodoId)` con `resolverRedDeTerminal` +
  `nodo.referencia.unidadFuncionalId` + `tipoAlimentacion`
  (`'tanqueElevado' | 'alimentacionDirecta'`, estado local del Panel, **no
  persistido** -- D-δ.36 sigue como está); lo pasa por terminal a
  `resolverEstadoModulo2`, a cada `resolverPresionResidualDeCamino`, a
  `TarjetaDeTerminal` y a `CalculoDelCriticoDetalle`. **Input provisional,
  su estado local y su ayuda: eliminados** (una sola fuente de verdad).
- **`CalculoDelCriticoDetalle`**: desglose auditable "Medidor general" /
  "Medidor individual · UF · AF/AC" (+ nota "aplica también al ramal AC
  por ACS individual"); en tanque, línea "Medidor general: fuera del
  camino tanque → terminal".

### Reactividad

Toda la cadena se deriva en render: `Proyecto → resolverEstadoModulo3 →
resultados adoptados → resolverPerdidasDeMedidoresParaTerminal →
hfMedidorDeTerminal → resolverEstadoModulo2 / balance`. Cambiar el medidor
adoptado (D-δ.57) propaga `hf` efectiva → `Presidual` → margen → terminal
crítico, sin efectos ni caché.

### Verificación

`tsc -b` / `vite build` verdes. 18 tests nuevos: 16 puros de
aplicabilidad (E1–E14 del handoff + 2 anti-atajo: falla si usa
`medidorGeneral.hf` para todos los terminales / si aplica individuales
sólo cuando `servicioMedido === redTerminal`), 2 de integración en
`resolverEstadoModulo2` con función por terminal (el crítico cambia según
el `hfMedidor` propio del camino; `undefined` por terminal → ese balance
`incompleto`, nunca 0), y el test SSR del Panel actualizado (el input
provisional ya no existe). Sin Playwright (el repo no lo tiene); no se
hizo click-through interactivo.

### Estado

**D-δ.58 -- CERRADA.** M3-E integrado: M3 es la única fuente de
`hfMedidor`; general incluido en directa / excluido en tanque; ACS
individual AF→AF+AC; ACS central AF/AC separados; UF aisladas; ausencia de
datos ≠ 0; cero determinado sí puede ser 0; override manual propaga la
`hf` efectiva; el crítico puede cambiar. Pendiente: **M3-F** (auditoría
end-to-end). Menores: Tabla N°8, CRIT-A8 en B2b, poda activa de overrides
huérfanos, verificación interactiva de UI (sin infra de browser en el
repo).

## D-δ.59 -- M3-F: auditoría end-to-end de Módulo 3 y cierre funcional -- CERRADA

Auditoría sistemática de todo lo entregado en M3-A → M3-E, sin agregar
funcionalidad. Objetivo: declarar M3 funcionalmente cerrado o registrar
con precisión qué falta. **Resultado: M3 CERRADO. Sin bugs.**

### Baseline de entrada (verificado contra el repo real)

`main` @ `7575780`, working tree limpio. `npx vitest run`: 1039/1039 en
115 archivos. `npx tsc -b`, `npm run build`, `npx eslint .`: verdes (11
problemas de lint baseline preexistentes, 0 warnings nuevos).

### Alcance auditado y evidencia

- **Tabla N°6** (`normativa/eras-2023/tabla-06-medidores`): 8 filas, orden
  DN y `Qc` crecientes, unidades y umbrales correctos, regla literal
  `Qc_tabla + ε >= Qc` sin interpolación, `> 40 m³/h → fueraDeTabla06` sin
  extrapolar, tolerancia IEEE-754 `1e-9 m³/h` para umbrales exactos.
  Inconsistencia oficial DN19↔C7 (CRIT-A32) fijada por test como errata:
  la tabla manda. Fronteras 1,5 / 3,5 / 40 exactas y 2,5 / 2,6 / 40,0001
  cubiertas.
- **Medidor general** (`seleccionarMedidorGeneral` →
  `resolverSeleccionYPerdidaDeMedidor`): `Qc` global de M1/M2 (CRIT-A5),
  conversión l/s → m³/h (×3,6) y → l/min (×60), `C` de la MISMA fila,
  `hf = 0,036·(Qcl/C)²` (CRIT-A25). No recalcula una demanda alternativa.
- **Medidor individual** (`seleccionarMedidorIndividual`): `Qunit = Σ
  cantidad·qu` con `K=1` (simultaneidad total, §2.6 / CRIT-A33), sin
  `Kc`/`K`/`a`; mismo `Qunit` para selección y para `Qcl`. Test
  discriminante nº 9: 5 consumos de 0,10 l/s → `Qunit`=0,50 l/s (DN19),
  NO el `Qc` simultaneado 0,25 l/s (DN15) — demuestra que M3 usa `Qunit`.
- **Alcances / cardinalidad** (`resolverAlcancesDeMedidoresIndividuales`,
  CRIT-A34): no PH → 0 medidores; PH + ACS individual → 1 medidor AF por
  UF con `quTotal` de todo el consumo (conservación de masa); PH + ACS
  central → medidor AF + medidor AC (AC sólo si hay consumo AC, nunca un
  medidor AC vacío); 2 UF → alcances independientes sin contaminación;
  ACS declarado por UF (override global + por UF), nunca inferido de
  `produccionACS`.
- **`EstadoModulo3`** (`resolverEstadoModulo3`): precedencia `noIniciado`
  (sin config) → `error` (override ACS a UF inexistente; red inválida con
  PH) → `incompleto` (sin artefactos, `Qc` indeterminado, red ausente con
  PH, general o individual `> 40 m³/h`) → `evaluado`. `evaluado` NO
  implica cumplimiento metrológico (no hay Q1..Q4/Qmin). `incompleto`
  expone `parcial` con los medidores que sí se evaluaron.
- **Override recomendado vs. adoptado** (`resolverMedidorAdoptado`,
  D-δ.57): DN adoptado, `C` adoptado, caudal medio, umbral y `hf` adoptada
  provienen TODOS de la misma fila de Tabla N°6 (anti-stale, test D2-12);
  `Q` no cambia; `Auto` restaura exactamente el automático; DN inferior al
  recomendado → `criterioSeleccion: 'inferiorAlRecomendado'` (calcula `hf`
  pero se marca; no se confunde con rango metrológico). `↑`/`↓` recorren
  filas reales de la tabla; extremos deshabilitados
  (`resolverControlDeMedidor`).
- **Integración M3→M2** (`resolverPerdidasDeMedidoresParaTerminal`,
  D-δ.58): general en `alimentacionDirecta`, excluido en `tanqueElevado`
  (aguas arriba del almacenamiento); ACS individual → medidor AF aplica a
  terminales AF y AC de la UF (`aplicaPorProvisionACSIndividual: true` en
  AC); ACS central → AF→AF, AC→AC; aislamiento por UF; `determinadas` con
  `componentes: []` y `hfTotal_mca: 0` es válido (tanque + no PH);
  ausencia de dato → `indeterminado`, nunca 0. M2 sigue recibiendo
  `number | undefined` por terminal; `resolverPresionResidualDeCamino` no
  conoce M3. Input provisional de `hfMedidor` eliminado de la UI y del
  estado local (verificado: no queda fallback oculto).
- **Backward compatibility**: `Proyecto.configuracionMedidores?` optativo;
  un proyecto anterior a M3 sigue válido → `EstadoModulo3` `noIniciado` →
  la presión indica falta de información M3, no inventa 0.
- **Validación estructural**: `validarConfiguracionMedidores` (en
  `validarProyecto`) detecta override ACS a UF inexistente y no valida
  resultados derivados ni genera falsos errores por M3 no iniciado.

### Matriz de casos ejecutada

| Origen | ACS | Terminal | Componentes esperados | Verificado |
|---|---|---|---|---|
| Directa | individual | AF | general + individual AF | E9 (puro) + smoke S1 |
| Directa | individual | AC | general + individual AF (`aplicaPor…`) | **E9b (nuevo)** + smoke S3 |
| Directa | central | AF | general + individual AF | E6/E7 + E9 |
| Directa | central | AC | general + individual AC (no AF) | **E9c (nuevo)** |
| Tanque | individual | AF/AC | individual AF | E4/E5/E10 + smoke S2 |
| Tanque | central | AF | individual AF | E6/E7 |
| Tanque | central | AC | individual AC | E6/E7 |
| Tanque | no PH | — | `[]`, `hfTotal_mca: 0` (determinado) | E2/E3 |
| no iniciado / error | — | — | `indeterminado`, nunca 0 | E11 + "estado error" |

Anti-atajo confirmados: (A) falla si se usa `medidorGeneral.hf` para todo
(tanque + no PH → 0); (B) falla si se aplica el individual sólo cuando
`servicioMedido === redDelTerminal` (ACS individual + terminal AC usa el
medidor AF).

### Verificación de navegador (Playwright, dev server real)

Playwright 1.63.0 estaba disponible de forma transitoria en `node_modules`
(instalación previa sin `--save`) con navegadores en caché; se usó SIN
tocar `package.json` / `package-lock.json` (`git status` limpio después).
Script de smoke contra `vite dev`, proyecto de ejemplo
(`viviendaIndividual`, 1 UF):

- **S1 — DIRECTA**: `↑` medidor general → DN 25→32, C 7→10, `hf`
  1,399→0,686 m.c.a.; margen del crítico 5,733→6,447 m.c.a. (sube);
  `Δmargen ≈ Δhf` (sin redondeo intermedio en el cálculo); `Auto` restaura
  `hf` y margen EXACTOS.
- **S2 — TANQUE**: `↑` general → el `hf` del panel M3 cambia
  (1,399→0,686) pero el margen del crítico NO cambia (el general está
  fuera del camino tanque → terminal). Smoke obligatorio: OK.
- **S3 — ACS individual**: PH on → 1 medidor individual, todos AF; `↑`
  medidor AF → el margen del crítico (terminal AC de la UF) se mueve
  4,019→4,971; `Auto` restaura exacto. Smoke obligatorio: OK.
- **S4 — ACS central**: aparece medidor AF y medidor AC (2 filas vs. 1 en
  individual).
- **Consola**: 0 errores / 0 warnings en toda la corrida.

17/17 checks PASS.

### Impresión / PDF (chequeo no invasivo)

La memoria PDF (`exportadores/pdf/generarDocumentoPdf`, pdfMake) es
programática y hoy sólo cubre Módulo 1 — Demanda; M2 y M3 no aparecen (no
es una regresión: M2 tampoco estaba). No hay `@media print` ni
`window.print()` en el código. Agregar el panel M3 al DOM no rompe la
impresión porque el PDF no lee el DOM. Rediseño del informe: fuera de
alcance de M3-F (deuda de reporting registrada).

### Bugs encontrados / corregidos

Ninguno. Ajustes menores aplicados (no son bugs):

1. `PanelDeMedidoresDeModulo3.tsx` — comentario de cabecera obsoleto
   ("M3-E (pendiente)…") reemplazado por la descripción real (M3-E ya
   está integrado vía `resolverPerdidasDeMedidoresParaTerminal`).
2. `resolverPerdidasDeMedidoresParaTerminal.test.ts` — 2 tests de matriz
   añadidos (`E9b`, `E9c`): directa + terminal AC con ACS individual y con
   ACS central, con valores numéricos. Suite: 1039 → 1041.

### Deudas registradas (no bloquean el cierre)

- **Tabla N°8** — ampliación de rango `> 40 m³/h`; hoy `fueraDeTabla06` /
  `incompleto`, sin extrapolar. Ampliación futura.
- **CRIT-A8 en el universo de B2b** — sin caso real detectado donde M3
  dimensione con consumos que M1/M2 considere no computables (mismo filtro
  `origen === 'normativo'` + conexión física). Refinamiento sin impacto.
- **Poda activa de overrides de medidor huérfanos** — un round-trip
  ACS central→individual→central (o PH off→on) con un override de DN en el
  medio reactiva ese override al reaparecer el alcance. El valor
  reaplicado es la decisión previa del propio usuario; mientras el alcance
  no existe el override se ignora sin romper ni contaminar (tests
  "override huérfano" y D2-11). Podar exigiría pasar topología (proyecto +
  catálogo + red) a los updaters de configuración, hoy transformaciones
  puras de config — cambio de firma no trivial. Preferencia futura: podar
  el override cuando su alcance desaparece.
- **Panel M3 en estado `incompleto`** — muestra los motivos pero no los
  medidores de `parcial` (que M2 sí consume). UX menor.
- **Reporting visual de M2/M3 en la memoria PDF** — ver arriba.
- **Infra persistente de Playwright** — no se agrega al repo.

### Decisiones rojas

Ninguna.

### Estado

**D-δ.59 -- CERRADA. M3-F CERRADO. Módulo 3 (Medidores) CERRADO** para el
alcance actual: dominio (Tabla N°6, general, individuales `K=1`,
cardinalidad, ACS individual/central), configuración persistida y
backward compatibility, UI operable (recomendado/adoptado, ↑/↓/Auto),
integración M3→M2 (directa/tanque, aislamiento por UF, indeterminado ≠ 0,
input provisional eliminado), presión (`Presidual` / margen / crítico) y
reactividad — todo verificado, con navegador real. Suite 1041/1041, `tsc`,
`build`, lint sin regresión, working tree limpio. No se inicia M4.

## D-δ.60 -- Auditoría de regresión de Módulo 2 posterior a M3 -- CERRADA

Auditoría específica, sin desarrollo: verificar que las funcionalidades
cerradas de M2 sigan correctas después de todo M3 (M3-A → M3-F).
**Referencia histórica: `92e5412` (cierre de M2, D-δ.52).**
**Resultado: M2 POST-M3 VERIFICADO. Sin regresiones. Sin bugs.**

### Baseline de entrada

`main` @ `8cd557e`, working tree limpio. `npx vitest run`: 1041/1041 en
115 archivos. `tsc -b`, `vite build`, `eslint .`: verdes (11 problemas de
lint baseline preexistentes, 0 warnings nuevos).

### Diff histórico `92e5412..HEAD` -- archivos de M2 tocados durante M3

| Archivo | Cambio | Clasificación |
|---|---|---|
| `motor/modulo2/resolverEstadoModulo2.ts` | `hfMedidor_mca` pasa de `number \| undefined` a aceptar además `(nodoTerminalId) => number \| undefined` | **integración deliberada**, backward-compatible: el camino escalar es idéntico (`typeof === 'function'` falso → uso previo); `resolverPresionResidualDeCamino` NO se toca (sigue recibiendo `number \| undefined` por terminal) |
| `interfaz/paginas/PanelDePresionDeModulo2.tsx` | elimina el input provisional `hfMedidor`, su `useState` y su texto de ayuda; deriva `hfMedidorDeTerminal(nodoId)` desde `resolverEstadoModulo3` + `resolverPerdidasDeMedidoresParaTerminal` según origen/UF/red/ACS | **integración deliberada** (el cambio principal esperado, D-δ.58) |
| `interfaz/paginas/CalculoDelCriticoDetalle.tsx` | filas de desglose auditable del `hfMedidor` por componente (general / individual · UF · AF/AC); en tanque, línea "fuera del camino" | **additivo**, sólo presentación; no cambia ningún número de M2 |
| `modelo/proyecto/index.ts` | añade `TipoProvisionACS`, `ConfiguracionDeMedidores` y el campo optativo `configuracionMedidores?` en `Proyecto` | **additivo**: ningún tipo de M2 (`RedHidraulica`, `Tramo`, `ConfiguracionHidraulica`, `ParametrosProyecto`) modificado |
| `validacion/codigos/index.ts`, `validacion/index.ts`, `+validacion/configuracionMedidores/` | 1 código nuevo + `validarConfiguracionMedidores` en `validarProyecto` | **additivo**: devuelve `[]` cuando `configuracionMedidores === undefined` → inerte para todo proyecto M2 previo |
| `motor/tuberias/perdidaCarga/calcularPerdidaCargaMedidor.ts` | **sólo comentario de cabecera** (cuerpo byte-idéntico) | sin cambio de comportamiento |
| tests: `resolverEstadoModulo2.test.ts` (+2), `PanelDePresionDeModulo2.test.ts` (1 test adaptado al input eliminado), `calcularPerdidaCargaMedidor.test.ts` (comentario/rename, aserción idéntica) | ningún test histórico de M2 borrado ni debilitado |

**Primitivos hidráulicos de M2 -- diff `92e5412..HEAD` = 0 líneas
(byte-idénticos):** `resolverBalanceDePresion`,
`resolverPresionResidualDeCamino`, `resolverTerminalMasDesfavorable`,
`resolverDesnivelDeCamino`, `resolverIncrementoVerticalPorNivel`,
`resolverHidraulicaDeTramo`, `resolverDiametroComercialDeTramo`,
`calcularPerdidaCargaHazenWilliams`, `calcularPerdidaCargaLocalizada`,
`duplicarUnidadFuncional`, `reconciliarConectividadFisicaPorCambioDeArtefacto`,
`resolverControlDeDnDeTramo`, `actualizarRedHidraulica`.

### Acoplamiento

`grep` sobre `motor/tuberias/**` y `motor/modulo2/**`: **ningún import de
M3** (`modulo3`, `medidores/`, `tabla-06`) -- las dos coincidencias son
líneas de comentario. `motor/modulo3/**` / `motor/medidores/**`:
**ningún import de los primitivos de balance de M2**. La única dirección
real es `motor/medidores/*` → `motor/tuberias/perdidaCarga/calcularPerdidaCargaMedidor`
(M3 reutiliza una fórmula pura de pérdida). La integración M3↔M2 vive en
la capa de orquestación/UI (`PanelDePresionDeModulo2`). **Sin dependencia
circular** (confirmado además por `tsc -b` verde).

### Matriz de regresión

| Función M2 | Estado en `92e5412` | Estado actual | Regresión | Evidencia |
|---|---|---|---|---|
| Quick defaults (`simplificada` + `estimadas` + Hazen + PPR; 5/10/10 no destructivos; backfill) | OK | OK | **No** | `backfillLongitudesDePredimensionamiento.test.ts` verde; smoke A/C (longitud 7,35 persiste) |
| Professional (`profesional` + `detalladas`; sin +3 m; longitudes explícitas; accesorios `undefined`≠`[]`) | OK | OK | **No** | `modoDeTrabajo.test.ts`, `AccesoriosDeTramoEditor.test.ts` verdes; smoke B (toggle sin pérdida de datos) |
| Longitud vertical `ΔLvertical = 3 m · nivel` (simplificado; AF→General, AC→General+ACS; sin acumular por nº UF; profesional sin +3) | OK | OK | **No** | `resolverIncrementoVerticalPorNivel.test.ts`, `verificacionLongitudVerticalPorNivel.test.ts` verdes (motor byte-idéntico) |
| Cotas `z = 1 + 3·nivel` editables; referencia por UF en simplificado; `Nodo.cota_m` en profesional | OK | OK | **No** | `resolverInfoCotaDeTerminal.test.ts`, `nivelUnidadFuncional.test.ts`, `resolverCotaTerminalEfectiva.test.ts` verdes |
| Dimensionamiento auto (Qc → Di teórico → candidato → DN → Di real → V) | OK | OK | **No** | `resolverDiametroComercialDeTramo.test.ts`, `dimensionamientoComercial.integracion.test.ts` verdes (byte-idéntico) |
| CRIT-A24 DN mínimo (baja mientras haya comercial inferior; V<Vmin sólo en el menor; "DN mínimo comercial") | OK | OK | **No** | `resolverDiametroComercialDeTramo.test.ts` (caso `valvulaMingitorio`), `resolverEstadoModulo2.test.ts` CRIT-A24 verdes |
| DN manual D-δ.52 (↑/↓ por catálogo real, Auto quita override, DN efectivo, Qc intacto, sin stale) | OK | OK | **No** | `resolverControlDeDnDeTramo.test.ts`, `resolverDiametroComercialDeTramo.overrideDn.test.ts` verdes; **smoke D**: General AF DN25 V2,9 hf4,817 → ↑ DN32 V1,7 hf1,4 → Auto restaura EXACTO |
| Cambio material/sistema (override válido se conserva; inválido → Auto; sin mapeo silencioso) | OK | OK | **No** | `resolverControlDeDnDeTramo.test.ts`, `actualizarConfiguracionHidraulica.test.ts` verdes |
| Hazen / Darcy (ambos seleccionables, recalculan J/hf con Di real) | OK | OK | **No** | `calcularPerdidaCargaHazenWilliams.test.ts`, `darcyWeisbach/*.test.ts` verdes (byte-idénticos) |
| Localizadas -- estimado (Vref = máx V de alimentadores; template `Ntees=max(0,n-1)`, Ks 3/1,35/9,18; n=0→0) | OK | OK | **No** | `resolverPerdidaLocalizadaEstimadaDeLocal.test.ts`, `calcularPerdidaCargaLocalizada.test.ts` verdes |
| Localizadas -- detallado (accesorios Tabla N°7 CRIT-A28; sin faucet terminal; `undefined`≠`[]`) | OK | OK | **No** | `resolverPerdidaLocalizadaDeTramo.test.ts`, `AccesoriosDeTramoEditor.test.ts` verdes |
| CRIT-A30 reducciones (accesorio físico explícito, nunca inferido por cambio de DN; V del lado menor) | OK | OK | **No** | `resolverClasificacionDeTee.test.ts` / `calcularPerdidaCargaLocalizada.test.ts` verdes; **M3 no introdujo reducciones implícitas por diferencia DN cañería/DN medidor** (M3 separado de `RedHidraulica`, no toca `Tramo`) |
| CRIT-A31 tees (nodal 1→2; `entradaPorExtremo`/`entradaCentral`; `Js = Ks·V_saliente²/2g`; sin persistir Ks/ángulo/coords) | OK | OK | **No** | `resolverClasificacionDeTee.test.ts`, `TeeDeNodoEditor.test.ts`, `identificarNodosDeBifurcacion.test.ts` verdes |
| Bootstrap / Retrofit / Hermano (D-δ.49; AF y AC independientes; ACS lazy) | OK | OK | **No** | `asegurarRaizDeRed.test.ts`, `actualizarRedHidraulica.test.ts`, `hallarNodoDeInsercionDeLocal.test.ts` verdes (byte-idéntico) |
| Preservación de datos en retrofit (longitud/accesorios/DN del recorrido existente no se pierden) | OK | OK | **No** | `actualizarRedHidraulica.test.ts` verde |
| CRIT-A15 cambio de tipo (AF↔AF+AC, round-trip sin duplicados/huérfanos; datos de red conservados; recomputa Qc) | OK | OK | **No** | `reconciliarConectividadFisicaPorCambioDeArtefacto.test.ts`, `sincronizarConectividadFisicaDeArtefacto.test.ts` verdes (byte-idéntico) |
| Eliminación (Artefacto/Local/UF limpia conectividad; no borra infraestructura en uso; `validarRedHidraulica` verde; sin ids huérfanos) | OK | OK | **No** | `quitarConectividadFisicaDe{Artefacto,Local,UnidadFuncional}.test.ts`, `podarNodosSinSalida.test.ts` verdes |
| Duplicar UF (D-δ.50: clona árbol, misma cota/nivel, conectividad nueva sin ids compartidos, no copia relevamiento, recalcula) | OK | OK | **No** | `duplicarUnidadFuncional.test.ts` verde; **smoke E**: aparece "Unidad funcional 1 (copia) · PB · cota 1,00 m", sin error de validación, consola limpia |
| `EstadoModulo2` (precedencia `noIniciado→error→incompleto→completo`; `noIniciado` ⟺ `redHidraulica===undefined`) | OK | OK | **No** | `resolverEstadoModulo2.test.ts` verde (+2 tests M3-E nuevos, 0 borrados) |
| Terminales sin Pmin (no compiten como crítico, no bloquean `completo`, fuera de alcance; nunca Pmin=0) | OK | OK | **No** | `filtrarCandidatosParaTerminalCritico.test.ts`, `resolverResumenDeCumplimiento.test.ts` verdes |
| Terminal crítico (`margen = Presidual − Pmin`; crítico = menor margen, no menor Presidual) | OK | OK | **No** | `resolverTerminalMasDesfavorable.test.ts`, `verificacionTerminalCriticoPorUF.aceptacion.test.ts` verdes (byte-idéntico) |
| Balance `Presidual = Pdisponible − Δz − hfDistribuida − hfLocalizada − hfMedidor − hfEquipoACS` (hfEquipoACS diferido; término faltante ≠ 0) | OK | OK -- **sólo cambió la FUENTE de `hfMedidor`** | **No** | `resolverBalanceDePresion.ts` byte-idéntico; ningún otro término tocado; **smoke G** (directa, balance completo, margen +7,010) |
| Reactividad (longitud→hf→presión; DN→V/hf→presión; nivel→vertical+cota→presión; artefacto→Qc→DN/V/hf→presión; medidor→sólo hfMedidor→presión; sin refresh) | OK | OK | **No** | smoke D (DN→V/hf), C (longitud→hf), G/H; `resolverEstadoModulo2.test.ts` reactividad verde |

### Nueva semántica deliberada (NO regresión)

Antes de M3, `hfMedidor` se ingresaba a mano en el Panel de Presión.
Ahora M3 es la fuente. Consecuencia esperada y correcta: **M3 no iniciado
+ un camino que necesita medidor → balance `incompleto`** con `hfMedidor`
como término faltante (nunca 0), y el Panel muestra "Completá el Módulo 3
— Medidores". Cubierto por `resolverEstadoModulo2.test.ts` ("hfMedidor_mca
función que devuelve undefined … balance incompleto, nunca 0") y por el
smoke I.

### Verificación de navegador (Playwright, dev server real)

Playwright 1.63.0 transitorio en `node_modules` (sin `--save`), navegadores
en caché; usado SIN tocar `package.json` / `package-lock.json` (`git diff`
vacío después). Smoke M2 contra `vite dev`, proyecto de ejemplo:

- A. Rápido baseline: modo Rápido, tabla Distribución general con DN/V/hf,
  longitudes rápidas precargadas.
- B. Profesional ↔ Rápido: granularidad profesional sin nota "+3 m/piso
  automática"; volver a Rápido conserva la longitud editada (7,35).
- C. editar longitud: `7.35` persiste y recalcula la fila.
- D. DN ↑ / Auto en Alimentación general AF: DN 25→32, V 2,9→1,7 m/s,
  hf 4,817→1,4 m.c.a.; Auto restaura DN/V/hf EXACTOS.
- E. duplicar UF: "Unidad funcional 1 (copia)", mismo nivel/cota, sin
  error de validación.
- G. presión directa: "Estado de Módulo 2: Completo", terminal crítico
  con margen +7,010 m.c.a.
- H. presión tanque: cambiar el MEDIDOR general (panel M3) no mueve el
  margen del crítico (−16,591 → −16,591).
- I. Panel de Presión menciona "Completá el Módulo 3 — Medidores"; input
  provisional "Medidor provisional M3" AUSENTE.
- **Consola: 0 errores / 0 warnings** en toda la corrida.

19/19 checks PASS.

### Suites históricas D-δ.47→52

Presentes y verdes. Subconjunto M2 ejecutado aparte:
`motor/tuberias` + `motor/modulo2` + paneles/updaters de M2 = **75
archivos, 666 tests, todos verdes**. Ningún test de esas suites fue
borrado ni debilitado entre `92e5412` y HEAD (los únicos `.test.ts` de M2
tocados: `resolverEstadoModulo2.test.ts` sólo suma 2 tests;
`PanelDePresionDeModulo2.test.ts` adapta 1 aserción al input eliminado;
`calcularPerdidaCargaMedidor.test.ts` sólo comentario/rename).

### Print / PDF

Confirmado (ver también D-δ.59): `generarDocumentoPdf` es pdfMake
programático, no imprime DOM, hoy cubre principalmente M1. Ninguna
modificación de M3 rompió el generador. Apariencia PDF de M2 fuera de
alcance de esta auditoría (reporting M2/M3/M4 = incremento futuro).

### Bugs / regresiones

Ninguno. Sin cambios de código en este incremento.

### Decisiones rojas

Ninguna.

### Deuda

Sin deuda nueva. Se corrigieron dos líneas de documentación que la
auditoría dejó ver desactualizadas: en `ROADMAP.md`, "`hfMedidor` provisto
por el Panel de Presión" → "provisto por Módulo 3 por terminal (D-δ.58)".
(La deuda ya registrada de reporting visual de M2/M3, Tabla N°8, CRIT-A8
en B2b, poda de overrides huérfanos, sigue vigente sin cambios.)

### Estado

**D-δ.60 -- CERRADA. M2 POST-M3: VERIFICADO.** Todos los contratos
principales de M2 siguen vigentes; los primitivos hidráulicos son
byte-idénticos a `92e5412`; el único cambio de comportamiento es la
fuente de `hfMedidor` (manual → M3 por terminal), deliberado y
backward-compatible. Sin acoplamiento indebido, sin dependencia circular,
sin regresiones, sin bugs. Suite 1041/1041, `tsc`, `build`, lint sin
regresión, working tree limpio. No se inicia M4.

## D-δ.61 -- M4-A: investigación normativa + contrato de dominio de Módulo 4 (Reserva / Tanques) -- ABIERTA (documental)

Primera corrida de Módulo 4. Incremento **documental**: reconstruye el
dominio de reserva/tanques desde el repo y desde la fuente normativa,
propone un contrato, y delimita las decisiones rojas. **No se escribió
código** (M4-B no arranca en esta corrida: aparecen decisiones rojas
bloqueantes -- ver más abajo).

### Estado del repo al iniciar

Branch `main`, HEAD `38ad1c9`, working tree limpio. Baseline verde:
`vitest` 1041/1041 (115 archivos), `tsc -b` verde, `npm run build` verde
(bundle ~2,1 MB, warning de tamaño ya conocido y aceptado), `eslint .`
sin regresión sobre el baseline de 11.

### A. Arqueología del repo

**No existe absolutamente nada de M4 en `src/`.** Búsqueda exhaustiva de
`modulo4`/`Módulo 4`/`tanque`/`reserva`/`cisterna`/`dotacion`/`dotación`/
`bombeo`/`presuriz`/`habitante`/`ocupación`/`consumoDiario`/`volumenReserva`/
`volumenUtil`/`origenHidraulico`/`nivelMinimo`/`peloAgua`: cero
definiciones de dominio, cero motor, cero tests, cero configuración
persistida, cero `EstadoModulo4`. `ROADMAP.md` no tiene sección de
Módulo 4 (termina en M3). `docs/adr/` y `docs/arquitectura/` siguen
vacías.

**No existe ningún dato de población / ocupación / dormitorios /
superficie / cantidad de personas en el modelo.** `UnidadFuncional` tiene
`nombre`, `nivel?`, `cotaHidraulicaReferencia_m?`, `locales`;
`TipoDeLocal` no incluye `dormitorio`. Nada permite hoy estimar
habitantes.

**Piezas ya presentes que M4 va a necesitar o rozar:**

- **`normativa/eras-2023/tabla-01-gastos-conexion`** (§2.7): datos puros,
  gasto en l/s por diámetro nominal de conexión (13–75 mm) y presión
  disponible (4–35 m), con interpolación lineal declarada.
  **Cero consumidores** -- ningún motor la lee todavía. Es la tabla
  candidata para derivar el *caudal de conexión otorgado* del balance de
  §2.10.2.
- **`ParametrosProyecto.presionSobreAcera_m`**: existe, sin consumidor.
  D-δ.38 la identifica como la condición de borde del origen "alimentación
  directa" (presión mínima garantizada sobre nivel de vereda).
- **`ParametrosProyecto.alturaArtefactoMasDesfavorable_m`**: legado,
  redundante con `Nodo.cota_m` (D-δ.38), pendiente de migración, no se
  toca.
- **`calcularSimultaneidad(...).resultados['qc']`**: el `Qc` global del
  proyecto (CRIT-A5), ya productivo. `resolverEstadoModulo3` lo consume
  exactamente así; M4 haría lo mismo. **Es el input primario del balance
  de reserva** (ver más abajo).
- **`normativa/eras-2023/CASOS-GOLDEN.md`**: G1 = **Tabla N°4 de §2.10.2**
  (pág. 26/182), G2 = **Tabla N°2 de §2.10.2** (pág. 25/182). Es decir:
  los goldens de M1 salen de las planillas de ejemplo de la *sección de
  reserva*. M1 consumió la mitad delantera de esa planilla
  (artefactos → Qmax → Kc → K → Qc); **M4 es la continuación de la misma
  tabla** (Qc → déficit → volumen de reserva).
- **`interfaz/paginas/modoDeTrabajo.ts`** (`resolverModoDeTrabajo`,
  D-δ.51): "modo de trabajo" (rápido / profesional / avanzado) se
  **deriva** de dos ejes de `ConfiguracionHidraulica` de M2, sin campo
  propio. M3 lo reutiliza tal cual (`PanelDeMedidoresDeModulo3`).
- **`modelo/memoria/index.ts`** (`MemoriaDeProyecto`): contenedor
  unificado de resultados de módulos + enlaces; sin consumidor todavía.
- **Patrón `EstadoModulo3`** (`motor/modulo3/resolverEstadoModulo3.ts`):
  `noIniciado | error | incompleto | evaluado`. `configuracionMedidores?`
  optativa (ausente = `noIniciado`, sin migración). Sin `todosCumplen`
  mientras no exista una verificación independiente real.

**Decisiones previas directamente relevantes (ya registradas):**

- **D-δ.32** -- bloque presión: "origen hidráulico (tanque elevado /
  presión de red / bombeo)" enumerado como pendiente, investigación no
  iniciada.
- **D-δ.36** -- balance de presión con `Pdisponible` como borde
  explícito; **precisión normativa: ERAS §2.8 exige reserva de tanque
  obligatoria para el uso residencial dominante**, sin decidir todavía
  la representación del origen.
- **D-δ.38** -- modelo físico de `Pdisponible` por tipo de origen
  (investigación, no cierra regla). Tres orígenes:
  1. **gravitacional desde tanque de reserva elevado** -- raíz hidráulica
     = superficie libre al **nivel mínimo operativo** ("pelo de agua
     mínimo"), `Pdisponible = 0`, toda la carga la aporta `−Δz`;
  2. **alimentación directa desde red** -- raíz en la conexión,
     `Pdisponible = presionSobreAcera_m`;
  3. **bombeo con presurización directa** -- **diferido** (requiere datos
     de bomba).
  **Bombeo a tanque elevado es hidráulicamente idéntico al origen 1** para
  la red de distribución (la bomba sólo llena el tanque).
  **"Cómo se representa/persiste el origen (borde abstracto / estructura
  en `Proyecto` / referencia de nodo; global o por subred) es una
  decisión roja abierta"** (cita literal de D-δ.38).
- **D-δ.43** (UI de M2) -- "Tipo de alimentación" ("Tanque elevado" /
  "Presión conocida / alimentación directa") ya existe **como selector de
  presentación**, escribe sobre campos que ya existían (`conCotaDeNodo`,
  estado local de `Pdisponible`), **sin persistencia nueva ni entidad
  `OrigenHidraulico`**. "Tanque elevado" pide "Cota del pelo de agua
  mínimo de cálculo".

### B. Inventario normativo (Guía ERAS 2023 / Resolución 641/2023)

**Limitación de fuente, explícita**: el repo **no contiene** el texto de
ERAS-2023 (HANDOFF §7). Esta investigación se hizo contra el texto
oficial publicado en `argentina.gob.ar/normativa/nacional/norma-396748`
e InfoLeg (`servicios.infoleg.gob.ar/.../396748/norma.htm`). **Las
Tablas N°2, N°3 y N°4 (secuencias de cálculo de ejemplo de §2.10.2) están
publicadas como imágenes de planilla y NO son transcribibles** desde
ninguna fuente accesible en esta corrida -- de ahí la decisión roja 1.

Numeración **verificada** (no asumida) contra la fuente oficial:

- **§2.8 -- Alimentación directa a artefactos** (verbatim):
  > "Subsuelos en general y pisos bajos no destinados a viviendas: agua
  > corriente directa debiendo cumplir, en función del caudal, lo
  > indicado para la piezométrica mínima residual sobre artefacto más
  > desfavorable."
  > "Pisos bajos destinados a viviendas y pisos altos: provisión de agua
  > con reserva de tanque, obligatoriamente."

  **Consecuencia [NORMA]**: para el uso residencial que domina IUAS, el
  tanque de reserva es **siempre obligatorio**. La alimentación directa
  sin reserva sólo aplica a subsuelos y planta baja no residencial.

- **§2.9 -- Consumos de agua**: enumera cuatro clases de consumo
  (a: por habitante y día en conjunto urbano; b: por habitante y día en
  edificios según tipología; c: consumo del edificio en períodos punta;
  d: por artefacto instalado).

- **§2.9.1.1 -- Consumo por habitantes en conjuntos urbanos** (verbatim):
  > "Grandes Ciudades = 500 litros/hab.dia
  > Poblaciones menores a 50.000 hab = 350 litros/hab.dia
  > Aéreas Rurales = 150 litros/hab.dia"

  **Ámbito [NORMA]**: conjunto urbano / planeamiento de red. **No es la
  base del volumen de reserva domiciliaria** -- el método domiciliario es
  el balance de caudales de §2.10.2 (abajo).

- **§2.9.1.2 -- Consumo por artefacto en Viviendas Familiares**: tabla de
  `qu` por artefacto (valores máximos época invernal). Es la que alimenta
  `Qmax = Σ n·qu` -- **ya es, en la práctica, el catálogo de artefactos
  de M1** (`normativa/eras-2023/catalogo-artefactos`).

- **§2.9.2 -- Simultaneidad**: `Qmax = Σ n·qu`; `K = Kc·a` (a ∈ {1,2,3,4});
  `Qc = Qmax·K`. Ya implementado íntegro en M1.

- **§2.10.2 -- Alimentación por tanques y determinación del Volumen de
  Reserva Diaria** (lo transcribible; **las planillas N°2/3/4 son
  imágenes**):
  > "Si la conexión a conceder por la OPERADORA DEL SERVICIO nos ofrece un
  > caudal inferior al Caudal de Cálculo Qc, debemos prever una reserva de
  > agua que compense ese déficit, en las horas de mayor consumo."
  > "El proyectista deberá analizar el período de consumo, con un mínimo
  > de 1 hora a un máximo de 4 de acuerdo a las características de la
  > instalación a proyectar, con el cual determinará la reserva de agua
  > necesaria."

  Método [NORMA, parcial]: se compara `Qc` (M1) contra el **caudal de
  aporte de la conexión** que otorga la prestadora; la diferencia es un
  **déficit de caudal `Dc`** que se cubre acumulando reserva durante el
  período de consumo pico. El período pico `T` lo elige el proyectista
  entre 1 h y 4 h. Las Tablas N°2/3/4 son la "secuencia de cálculo"
  resuelta como ejemplo.

  **No verificable en esta corrida** (imágenes): la fórmula algebraica
  exacta del volumen (la lectura natural es
  `Vreserva = Dc · T = (Qc − Qconexión) · T`, en unidades coherentes),
  las unidades exactas, y si existe un mínimo absoluto (varias fuentes
  secundarias mencionan "reserva mínima de 24 horas de consumo"; **el
  texto oficial accesible no lo dice** con esas palabras). Una fuente
  secundaria además describe `T` como *tiempo de llenado* del tanque, no
  como *período de consumo pico* -- **lectura distinta**, misma ventana
  1–4 h.

- **§2.11 -- Tanques** (verbatim, selección):
  > "Fondo con pendiente mínima de 1:25 hacia el desagüe."
  > "Tanques de bombeo y reserva de 4.000 litros o más deben estar
  > divididos en dos o más secciones iguales."
  > "Altura libre mínima bajo tanques 0,60 m" / "Altura libre mínima
  > sobre tanques 0,40 m"

  Especificaciones **constructivas/geométricas** -- fuera del alcance de
  "dimensionar volumen de reserva".

- **§2.11.1 -- Alimentación de Tanques**: "De acuerdo a 2.9. y 2.9.1."
- **§2.11.2 -- Capacidad de Tanques**: "En base a 2.9.1 y 2.9.2. Tablas y
  ejemplos indicados." (remite a la misma secuencia de §2.10.2).
- **§2.11.3 -- Distribución Reserva Total Diaria** (verbatim):
  > "Los tanques de bombeo y reserva deben poseer un volumen mínimo de
  > 1/3 de la Reserva Total Diaria."

  **[NORMA]**: cuando hay tanque inferior (cisterna / tanque de bombeo),
  ese tanque inferior debe alojar **como mínimo 1/3** de la Reserva Total
  Diaria (el resto en el elevado). Cuando sólo hay tanque elevado, el
  100% va arriba. La norma fija un **mínimo del inferior**, no un reparto
  exacto.

**Nota sobre §2.10.2 vs §2.10.2 ya citado en `CRITERIOS.md`**: el handoff
histórico dudaba de esta numeración. Queda **confirmado**: §2.10.2 es la
sección de reserva ("Alimentación por tanques y determinación del Volumen
de Reserva Diaria"). Que `CRITERIOS.md` también cite §2.10.2 para CRIT-A8
(inodoros con válvula automática) y para caudal por tramo no es
contradicción: la sección contiene la secuencia de cálculo completa de
las planillas de ejemplo, y esas reglas de M1 se leyeron de las mismas
planillas.

### C. Fórmula(s) confirmadas

- **Confirmada [NORMA]**: `Dc = Qc − Qconexión` (déficit de caudal) y
  `Reserva Total Diaria` derivada de `Dc` acumulado sobre un período pico
  `T ∈ [1 h, 4 h]`.
- **Confirmada [NORMA]**: mínimo del tanque inferior = 1/3 de la Reserva
  Total Diaria (§2.11.3), sólo si hay tanque inferior.
- **Confirmada [NORMA]**: tanque de reserva obligatorio para uso
  residencial (§2.8).
- **NO confirmada (decisión roja 1)**: la expresión algebraica exacta del
  volumen (`Vreserva = Dc·T` es la hipótesis), unidades, mínimo absoluto,
  y si `T` es "período de consumo pico" o "tiempo de llenado".

### D. Inputs requeridos por M4 (propuesta)

| Input | Origen | ¿Nuevo? |
|---|---|---|
| `Qc` global del proyecto | M1 (`calcularSimultaneidad`) | no, ya existe |
| Caudal de conexión otorgado `Qconexión` | usuario (dato de la prestadora) **o** derivado de Tabla N°1 §2.7 (DN de conexión + presión disponible) | **sí** -- no está en el modelo |
| Período pico `T` (1–4 h) | usuario (Profesional) / default IUAS (Rápido) | **sí** |
| Configuración de almacenamiento (directa / sólo elevado / cisterna+bombeo+elevado) | usuario | **sí** -- hoy sólo selector de presentación de M2, no persistido |

**M4 NO requiere**: población, cantidad de habitantes, dormitorios,
superficie, ocupación, `habitantesPorUF`, dotación per cápita. El método
normativo domiciliario (§2.10.2) es un balance de caudales anclado en
`Qc`, no en población. Esto **resuelve por la negativa** la pregunta 6
del brief y la preocupación central del §8 del brief.

### E. Fronteras

- **M4 ← M1**: dependencia fuerte y directa. `Qc` global (CRIT-A5) es el
  input primario. M4 lo consume igual que `resolverEstadoModulo3`
  (`calcularSimultaneidad(...).resultados['qc']`), **sin reimplementar
  nada** del pipeline de demanda. No usa `Qc` "como proxy de consumo
  diario": lo usa como lo que la norma pide -- el caudal de cálculo del
  balance de §2.10.2.
- **M4 ← / → M2**: comparten el **concepto de origen hidráulico**. Hoy M2
  lo trata como selector de presentación efímero (D-δ.38 / D-δ.43). M4
  necesita que la configuración de abastecimiento **persista** para tener
  sentido -- ver decisión roja 2. **Candidato M4→M2**: la *cota del pelo
  de agua mínimo* del tanque elevado, que M2 hoy pide como input manual
  del Panel de Presión. Pero **el volumen de reserva NO determina la
  cota** del tanque (variables independientes): M4 en su alcance mínimo
  dimensiona *volumen útil requerido*, no geometría ni altura, así que
  **no produce esa cota**. Sin modelo geométrico de tanque (fuera de
  alcance), **no hay un dato físico nuevo que M4 deba entregarle a M2**.
  No introducir integración preventiva; M2 está cerrado.
- **M4 ← M3**: `configuracionMedidores.esPropiedadHorizontal` ya persiste
  propiedad horizontal. M4 **no** la necesita: la reserva es del proyecto,
  no por UF. **No mover `esPropiedadHorizontal`** a un nivel común sólo
  por M4 (no hay segundo consumidor real de esa decisión en M4).

### F. Modelo conceptual propuesto (borrador -- NO implementar todavía)

- **`ConfiguracionModulo4`** (persistida, optativa, sin migración -- mismo
  patrón que `configuracionMedidores?`). Sólo **decisiones físicas**:
  configuración de almacenamiento; `Qconexión` (o los datos para
  derivarlo de Tabla N°1); `T` pico adoptado (Profesional). Ausente =
  `EstadoModulo4 = 'noIniciado'`.
- **`ResultadoModulo4`** (derivado, recalculado siempre): `Qc` usado,
  `Qconexión`, `Dc`, `T`, **Volumen de Reserva Diaria requerido**,
  reparto propuesto (elevado / inferior, respetando el mínimo 1/3 de
  §2.11.3 si hay tanque inferior), y -- si se adopta el patrón -- volumen
  *adoptado* manualmente vs *requerido*. Nada de esto se persiste.
- **`EstadoModulo4`**: `noIniciado | error | incompleto | evaluado`.
  - `noIniciado`: no hay `configuracionModulo4`.
  - `incompleto`: falta `Qc` (sin artefactos computables / indeterminado),
    falta `Qconexión`, o falta `T`.
  - `error`: inconsistencia estructural (p. ej. configuración que exige
    tanque inferior con reparto imposible).
  - `evaluado`: volumen de reserva requerido calculado. **Separar**
    "cálculo resuelto" de "capacidad adoptada suficiente" si se agrega
    override manual (patrón requerido vs adoptado, como M3-D parte 2).
- **Modo de trabajo**: reutilizar `resolverModoDeTrabajo` (el mismo
  concepto transversal ya usado por M2 y M3), **sin eje nuevo**. Rápido:
  `T` por default IUAS + `Qconexión` sugerido (Tabla N°1) + cálculo
  inmediato. Profesional: `T` y `Qconexión` explícitos + reparto +
  volumen adoptado + trazabilidad. Misma matemática.
- **Sin catálogo comercial de tanques** en repo ni en norma: M4 entrega
  "volumen mínimo requerido = X L" y, a lo sumo, deja declarar "adoptado
  = Y L". No inventar tamaños comerciales (500/750/1000 L).
- **Sin topología de tanques**: la norma exige capacidad total (+ mínimo
  1/3 del inferior). No modelar múltiples tanques en paralelo / uno por
  UF sin un caso real.
- **Bombas y presurizadores: fuera de alcance de M4.** M4 dimensiona
  *volumen*. Selección de bomba (caudal, potencia, tiempo de llenado,
  curva) y presurización son un dominio sustancial nuevo; si el reparto
  cisterna+bombeo se soporta, M4 se limita a los **volúmenes**, no al
  equipo de bombeo. `hfEquipoACS` sigue diferido y no es de M4 (reserva
  de agua fría ≠ producción ACS).

### G. Persistencia propuesta

Persistir sólo: configuración de almacenamiento, `Qconexión` (o sus
insumos), `T` adoptado, y -- si se adopta -- `volumenAdoptado`. Derivar
todo lo demás (`Dc`, volumen requerido, reparto, `EstadoModulo4`). No
persistir el `Qc` (se recalcula desde M1).

### H. Roadmap real de implementación (hipótesis, revisar tras resolver rojas)

- **M4-A** (esta corrida): contrato + rojas. **Documental. Bloqueado.**
- **M4-B**: motor puro `resolverReservaDiaria(Qc, Qconexión, T) → Vreserva`
  + reparto §2.11.3 + tests golden contra Tablas N°2/3/4. **Sólo tras
  resolver la decisión roja 1.**
- **M4-C**: `configuracionModulo4` persistida + `EstadoModulo4`. **Sólo
  tras resolver la decisión roja 2.**
- **M4-D**: UI Rápido/Profesional (después de M4-B/C).
- **M4-E**: integración M4→M2 **sólo si** aparece un dato físico real
  necesario (hoy la evidencia dice que no).
- **M4-F**: auditoría end-to-end.

Si la roja 1 se resuelve con fórmula inequívoca y la roja 2 se resuelve
por "seguir con borde abstracto, sin persistir origen todavía", el
slicing puede colapsar a **A → B → D → auditoría**.

### Tests discriminantes a definir para el futuro motor (no escribir aún)

Golden G2/G1 (Tablas N°2 y N°4 de §2.10.2) extendidos hasta el volumen de
reserva; `Qconexión ≥ Qc` → reserva 0 (o mínimo normativo si existe);
`Qconexión < Qc` → `Dc·T`; `T = 1 h` y `T = 4 h` como extremos; con y sin
tanque inferior (reparto 1/3); backward compatibility (`configuracionModulo4`
ausente → `noIniciado`); sin artefactos computables → `incompleto`.

### I. Decisiones ya cerradas (que M4 hereda, no reabre)

- Tanque de reserva obligatorio para uso residencial (§2.8) -- [NORMA].
- `Qc` es autoritativo de M1 (CRIT-A5); M4 no recalcula demanda.
- Mínimo 1/3 de la Reserva Total Diaria en el tanque inferior (§2.11.3)
  -- [NORMA].
- Modo de trabajo es transversal y derivado (D-δ.51); M4 lo reutiliza.
- M2 está congelado; M4 no lo refactoriza.

### J. Decisiones rojas

#### Decisión roja 1 -- Fórmula exacta del Volumen de Reserva Diaria y semántica de `T`

1. **Evidencia**: §2.10.2 describe el método (balance `Qc` vs caudal de
   conexión; déficit cubierto sobre un período de 1 a 4 h) pero **la
   fórmula algebraica, las unidades, el eventual mínimo absoluto y los
   ejemplos numéricos viven en las Tablas N°2/3/4, que la fuente oficial
   publica como imágenes de planilla**, no transcribibles en esta corrida.
   Fuentes secundarias introducen dos lecturas incompatibles de `T`
   ("período de consumo pico" vs "tiempo de llenado del tanque") y
   mencionan un mínimo de "24 h de consumo" que el texto oficial accesible
   no enuncia con esas palabras.
2. **Alternativas**:
   (a) el usuario aporta las Tablas N°2/3/4 y el texto íntegro de §2.10.2
   (páginas 25–26/182 del IF-2023-141050544-APN-DNAPYS#MOP), como se hizo
   con la Tabla N°6 en M3-A → se transcribe y verifica como caso golden;
   (b) se adopta provisionalmente `Vreserva = (Qc − Qconexión)·T` con
   `T` = período pico y **sin** mínimo absoluto, y se marca como criterio
   IUAS revisable;
   (c) se difiere M4 hasta disponer de la fuente.
3. **Impacto**: sin (a) no hay forma de escribir M4-B con goldens
   normativos reales; (b) arriesga un motor que después haya que
   recalibrar; (c) frena el módulo.
4. **Recomendación técnica**: (a). El proyecto ya tiene el precedente
   exacto (M3-A con Tabla N°6) y la disciplina de `CASOS-GOLDEN.md` +
   `CRITERIOS.md`. Las planillas N°2/4 además ya son goldens de M1 (G2/G1)
   -- extenderlas es natural.
5. **Pregunta**: ¿podés aportar el texto completo de §2.10.2 y las Tablas
   N°2, N°3 y N°4 de la Guía ERAS 2023 (o confirmar que M4 se difiere
   hasta tenerlas)?

#### Decisión roja 2 -- Persistir el origen / configuración de abastecimiento hidráulico

1. **Evidencia**: M4 sólo tiene sentido sabiendo la configuración de
   abastecimiento (directa sin reserva / sólo tanque elevado /
   cisterna+bombeo+tanque elevado). Hoy esa elección es un **selector de
   presentación efímero** del Panel de Presión de M2 (D-δ.43), no
   persistido; D-δ.36/D-δ.38 dejaron explícitamente abierta como
   **decisión roja** la representación del origen ("borde abstracto vs
   estructura en `Proyecto` vs referencia de nodo; global vs por subred").
   M4 es el primer consumidor real que **obliga** a persistir esa
   decisión.
2. **Alternativas**:
   (a) cerrar `Proyecto.origenHidraulico` (o `configuracionModulo4` que lo
   incluya) como campo persistido, global al proyecto, unión cerrada
   `{ directa | tanqueElevado | cisternaBombeoElevado }`, optativo/sin
   migración -- M2 pasaría a leerlo en vez de su selector efímero;
   (b) persistirlo **por raíz/subred** (CRIT-A27 admite subredes
   independientes) -- más general, más caro, sin caso real que lo pida;
   (c) M4 declara su propia configuración de almacenamiento aislada y M2
   sigue con su selector efímero -- dos fuentes de verdad del mismo hecho
   físico, riesgo de divergencia.
3. **Impacto**: (a) toca M2 (congelado) para reapuntar su lectura del
   origen -- cambio acotado y previsto por D-δ.38, pero es tocar M2;
   (b) es infra preventiva sin segundo caso; (c) viola "una sola fuente
   de verdad".
4. **Recomendación técnica**: (a), global al proyecto, optativo. Es el
   momento correcto: hay por fin un segundo consumidor real (M4) del
   concepto de origen, y D-δ.38 ya dejó dicho cómo se mapea cada origen a
   `Pdisponible`/raíz. No hacer (b) hasta que exista un proyecto con
   subredes de origen distinto.
5. **Pregunta**: ¿cerramos `origenHidraulico` como campo persistido global
   del `Proyecto` (unión `directa | tanqueElevado | cisternaBombeoElevado`,
   optativo, y M2 lo lee en lugar de su selector de presentación), o
   preferís que M4-A sólo lo deje propuesto y se decida en M4-C?

**Decisiones rojas contingentes** (dependen de las dos anteriores, no se
elevan como preguntas ahora): si `Qconexión` se declara a mano o se
deriva de Tabla N°1 §2.7 (y con qué DN de conexión); qué valor de `T`
adopta el modo Rápido por defecto; si se soporta el reparto
cisterna+bombeo en M4 o se difiere junto con las bombas.

### K. Respuestas explícitas a las 20 preguntas del brief (§35)

1. **¿Qué dimensiona M4?** El **Volumen de Reserva Diaria requerido**
   (volumen útil, en litros) para compensar el déficit entre `Qc` y el
   caudal de conexión durante el pico de consumo (§2.10.2). No dimensiona
   geometría ni cota del tanque.
2. **¿Fórmula normativa?** Método de balance de caudales: `Dc = Qc −
   Qconexión`, reserva ≈ `Dc·T` con `T ∈ [1 h, 4 h]`. Expresión exacta y
   unidades: **decisión roja 1** (planillas N°2/3/4 son imágenes).
3. **¿Input primario?** El `Qc` global del proyecto (M1, CRIT-A5).
4. **¿De dónde sale la demanda diaria?** No hay "demanda diaria" como tal
   en el método domiciliario: sale del `Qc` instantáneo de M1 confrontado
   con el caudal de conexión. La dotación per cápita (§2.9.1.1) es para
   conjuntos urbanos, no para esto.
5. **¿M1 aporta algo?** Sí: el `Qc` global, reutilizado sin
   reimplementar.
6. **¿Hace falta población/ocupación nueva?** **No.** El método no usa
   habitantes/dormitorios/superficie.
7. **¿Qué tipos de tanque contempla?** Tanque de reserva elevado
   (obligatorio residencial, §2.8) y tanque inferior / cisterna / de
   bombeo (opcional, §2.11 / §2.11.3). Alimentación directa sin reserva
   sólo para subsuelo/PB no residencial.
8. **¿Volumen total o reparto?** Volumen total de reserva; reparto
   elevado/inferior sólo si hay tanque inferior.
9. **¿Porcentaje inferior/superior?** §2.11.3: el tanque inferior aloja
   **mínimo 1/3** de la Reserva Total Diaria. Es un mínimo del inferior,
   no un reparto fijo.
10. **¿Mínimo absoluto?** No confirmado (decisión roja 1). Fuentes
    secundarias mencionan "24 h de consumo"; el texto oficial accesible
    no lo enuncia así.
11. **¿Volumen útil o nominal?** M4 produce **volumen útil requerido**.
    Cámara de aire, nivel mínimo, volumen muerto, rebalse: geometría del
    tanque, fuera de alcance.
12. **¿M4 dimensiona geometría?** No.
13. **¿M4 dimensiona bombas?** No. Fuera de alcance.
14. **¿M4 produce algo para M2?** En el alcance mínimo, **no** hay un dato
    físico nuevo obligatorio (el volumen no fija la cota del pelo de
    agua). Ver frontera M4/M2.
15. **¿Debe persistirse el origen hidráulico?** Sí -- **decisión roja 2**.
16. **¿Hace falta configuración nueva en `Proyecto`?** Sí:
    `configuracionModulo4` (optativa, patrón `configuracionMedidores?`) y
    posiblemente `origenHidraulico` (decisión roja 2).
17. **¿Qué significa `EstadoModulo4`?** `noIniciado` (sin config) /
    `incompleto` (falta `Qc`, `Qconexión` o `T`) / `error`
    (inconsistencia estructural) / `evaluado` (volumen requerido
    calculado). Separar "calculado" de "capacidad adoptada suficiente".
18. **¿Qué puede hacer Rápido?** `T` default IUAS + `Qconexión` sugerido
    de Tabla N°1 + cálculo inmediato del volumen requerido.
19. **¿Qué muestra Profesional?** `T` y `Qconexión` explícitos, reparto
    elevado/inferior, volumen adoptado vs requerido, trazabilidad
    normativa.
20. **¿Qué queda explícitamente fuera de alcance?** Geometría/cota del
    tanque, catálogo comercial de tanques, múltiples tanques/topología de
    tanques, selección de bombas, presurizadores, `hfEquipoACS`,
    reporting PDF de M4, dotación per cápita, población/ocupación.

### Handoff

- **Repo**: `main`, HEAD `38ad1c9`, tree limpio, baseline verde
  (1041 tests, tsc, build, lint sin regresión).
- **Arqueología**: no existe nada de M4 en código; sí existen
  `tabla-01-gastos-conexion` (§2.7, sin consumidor), `presionSobreAcera_m`
  (sin consumidor), el `Qc` global de M1, el patrón `EstadoModulo3`, y
  `resolverModoDeTrabajo`. D-δ.32/36/38 son la investigación previa del
  origen hidráulico.
- **Norma**: método de reserva = §2.10.2 (balance `Qc` vs conexión, pico
  1–4 h); §2.8 (tanque obligatorio residencial); §2.11.3 (mínimo 1/3 del
  inferior); §2.9.1.1 (dotación per cápita = conjunto urbano, no
  domiciliaria). Tablas N°2/3/4 no transcribibles (imágenes).
- **Dominio**: M4 dimensiona **volumen útil de reserva diaria requerido**
  desde `Qc` (M1) y el caudal de conexión, sobre un período pico `T`.
  Sin población. Sin geometría. Sin bombas.
- **Integración**: M4 ← M1 fuerte (`Qc`); M4 ↔ M2 comparten el origen
  hidráulico (hoy efímero); M4 → M2 sin dato nuevo obligatorio.
- **Decisiones rojas**: (1) fórmula/tablas de §2.10.2 -- se necesita la
  fuente; (2) persistir `origenHidraulico`.
- **Siguiente slice recomendado**: resolver la roja 1 (aportar §2.10.2 +
  Tablas N°2/3/4) y la roja 2 (persistencia del origen). Recién entonces
  M4-B (motor puro + goldens). **No empezar UI sin contrato.**

### Estado

**D-δ.61 -- ABIERTA → RESUELTA por el usuario.** Contrato de dominio de M4
propuesto; las dos decisiones rojas quedaron resueltas (ver más abajo) y
habilitaron M4-B (D-δ.62).

#### Resolución de las decisiones rojas (aportada por el usuario)

**Roja 1 -- Fórmula de reserva.** RESUELTA. El usuario verificó la fuente
oficial y aportó las Tablas N°3 y N°4:

- Tabla N°3: `Qc = 0,71 l/s`, `Qconexión = 0,60 l/s`, `Dc ≈ 0,39 m³/h`,
  `Tc = 2 h`, Reserva de Diseño `= Dc·Tc = 0,77 m³`, a Ejecutar `1,00 m³`.
- Tabla N°4: `Qc ≈ 1,96 l/s`, `Qconexión ≈ 1,18 l/s`, `Dc ≈ 2,82 m³/h`,
  `Tc = 1 h`, Reserva de Diseño `≈ 3 m³`.

Contrato cerrado (formalizado como **CRIT-A35**):
`Dc = max(0, Qc − Qconexión)`; `Dc_m3h = Dc · 3,6`;
`VReservaDiseño_m3 = Dc_m3h · Tc`, con `1 h ≤ Tc ≤ 4 h`. `Tc` es el
**período de consumo máximo** (no un tiempo de llenado). No usar
población/dotación; no multiplicar `Qc` por 24 h; no introducir una regla
de "24 h completas de consumo". No redondear `Qc`/`Dc` antes del volumen
(el redondeo es sólo de UI). Distinguir volumen **de diseño/requerido**
(lo que calcula M4-B) del volumen **adoptado/a ejecutar** (slice
posterior; sin catálogo comercial inventado). `Qconexión ≥ Qc` ⇒
`Dc = 0` ⇒ volumen 0: resultado determinado, **no** un error, y **no**
equivale por sí solo a "tanque no requerido" (la obligación de reserva
puede venir de §2.8). No inventar un mínimo absoluto que la fuente no
define.

**Roja 2 -- Configuración de abastecimiento.** RESUELTA. Se persiste
**ahora** una configuración física **global** del proyecto, optativa y
backward-compatible, con la forma conceptual:

```
Proyecto.configuracionAbastecimiento?: {
  esquema: 'directa' | 'tanqueElevado' | 'cisternaBombeoElevado'
}
```

(naming real según convenciones del repo, a fijar en el slice que la
implemente). Sin configuración: el proyecto viejo sigue válido.
**No** llamarla `origenHidraulico` si mezcla configuración física con
frontera del balance. Relación con M2: el origen hidráulico efectivo de
M2 se **deriva** del esquema -- `directa` → presión conocida /
alimentación directa; `tanqueElevado` y `cisternaBombeoElevado` → raíz en
el pelo de agua mínimo del tanque elevado (**`cisternaBombeoElevado` no
es un tercer origen terminal**: la cisterna y la bomba están aguas arriba
del almacenamiento, para M2 sigue siendo "tanque elevado"). El selector
efímero duplicado del Panel de Presión de M2 se elimina cuando la
integración correspondiente quede implementada -- no tener dos fuentes de
verdad. **Alcance actual: un único esquema global por Proyecto.** No
modelar todavía esquemas mixtos por sector (p. ej. subsuelo directo +
viviendas por tanque), que la Guía sí permite -- queda registrado como
"abastecimiento mixto por sectores" para un slice futuro. Si en algún
momento el modelo llega a representar inequívocamente múltiples sectores
hidráulicos con distinto origen, reducirlos a un esquema global es una
**decisión roja** previa.

Esta configuración persistida es de M4-C (junto con `EstadoModulo4`); M4-B
no la necesita.

### Estado

**D-δ.61 -- CERRADA.** Contrato de dominio de M4 y ambas decisiones rojas
resueltas. Documental (D-δ.62 implementa el motor).

## D-δ.62 -- M4-B: motor puro de la Reserva Total Diaria de Diseño (§2.10.2) -- CERRADA

Incremento **funcional**. Primer código de Módulo 4. Motor puro, sin
`EstadoModulo4`, sin configuración persistida, sin UI, sin integración
M4→M2.

### Qué se implementó

`motor/reserva/calcularReservaDiaria.ts` -- primitiva pura (mismo patrón
que `calcularPerdidaCargaMedidor` / CRIT-A25):

```
calcularReservaDiaria({ qc_lps, qConexion_lps, tc_h }) → {
  qc_lps, qConexion_lps, deficit_lps, deficit_m3h, tc_h,
  volumenReservaDiseno_m3
}
```

`deficit_lps = max(0, qc_lps − qConexion_lps)`;
`deficit_m3h = deficit_lps · 3,6`;
`volumenReservaDiseno_m3 = deficit_m3h · tc_h`.
Validaciones: `qc_lps ≥ 0` finito, `qConexion_lps ≥ 0` finito,
`1 ≤ tc_h ≤ 4`. `qConexión ≥ qc` no lanza: devuelve déficit y volumen 0.
Sin redondeo intermedio. No conoce `Proyecto`, `RedHidraulica` ni ningún
catálogo. Regla formalizada como **CRIT-A35** en `CRITERIOS.md`.

`qConexion_lps` es hoy un **input explícito**. Fuente futura documentada
(CRIT-A35 y D-δ.61): Tabla N°1 (§2.7, `tabla-01-gastos-conexion`, ya en
el repo sin consumidor) por diámetro de conexión + presión disponible con
interpolación lineal. El modelo no persiste diámetro de conexión todavía
→ la derivación es de un slice posterior.

### Tests

`motor/reserva/calcularReservaDiaria.test.ts` (10 casos): déficit
positivo, passthrough, `qConexión ≥ qc` → 0 sin error, ausencia de
redondeo interno (Qc exacto de G2 → 0,771 m³, distinto de 0,792 m³ con Qc
redondeado), `Tc` en los extremos 1 h/4 h, `Tc` fuera de rango / `NaN` →
throw, `qc`/`qConexión` negativos o no finitos → throw, `qc = 0` válido,
monotonía en `Tc`.

`motor/reserva/calcularReservaDiaria.golden.test.ts` (2 casos, **G3 y G4**
en `CASOS-GOLDEN.md`): componen M1 real (`calcularSimultaneidad`) → `Qc`
sin redondear → `calcularReservaDiaria`. G3 (Tabla N°3): `Qc` de G2 +
`Qconexión` 0,60 l/s + `Tc` 2 h → 0,7712 m³ (publicado 0,77). G4 (Tabla
N°4): `Qc` de G1 + `Qconexión` 1,18 l/s + `Tc` 1 h → 2,8188 m³ (publicado
≈ 3 m³). Tolerancias y valores publicados documentados en `CASOS-GOLDEN.md`.

### Verificación

`vitest` 1053/1053 (117 archivos; +12 de M4-B), `tsc -b` verde,
`npm run build` verde, `eslint .` sin regresión (11 baseline, 0
warnings), working tree limpio.

### Qué NO se hizo (deliberado, siguiente slice)

`EstadoModulo4`; `Proyecto.configuracionAbastecimiento` persistida;
`Qconexión` derivado de Tabla N°1; volumen adoptado / a ejecutar;
catálogo comercial de tanques; reparto tanque de bombeo / de reserva
(§2.11.3); geometría; bombas; presurizador; integración M4→M2; UI; PDF;
población/dotación. Ninguno bloquea este cierre.

### Decisiones rojas

Ninguna nueva. Las dos de D-δ.61 quedaron resueltas por el usuario antes
de esta corrida.

### Estado

**D-δ.62 -- CERRADA.** Motor puro de reserva diaria implementado y
verificado contra los ejemplos oficiales (Tablas N°3 y N°4). Baseline
verde. Siguiente slice: M4-C (`configuracionAbastecimiento` persistida +
`EstadoModulo4`).

## D-δ.63 -- M4-C: configuración de abastecimiento persistida + `EstadoModulo4` -- CERRADA

Incremento **funcional**. Cierra el contrato persistido y el orquestador
de Módulo 4, **sin UI**, **sin** derivar `Qconexión` de Tabla N°1 y
**sin** integrar todavía el selector de M2.

### Modelo -- `Proyecto.configuracionAbastecimiento?`

Nueva configuración física **global** del proyecto, optativa y
backward-compatible (mismo patrón que `configuracionMedidores?`):

```ts
type EsquemaDeAbastecimiento = 'directa' | 'tanqueElevado' | 'cisternaBombeoElevado'

type ConfiguracionDeAbastecimiento = {
  readonly esquema: EsquemaDeAbastecimiento
  readonly periodoConsumoMaximo_h?: number   // Tc, decisión del proyectista, 1..4 h
}
```

- Se llama `configuracionAbastecimiento` (no `origenHidraulico`): representa
  **cómo se abastece físicamente** el proyecto, no la frontera del balance
  de M2 (que se **derivará** del esquema en un slice posterior).
- **`Tc` (`periodoConsumoMaximo_h`) se persiste** porque es una decisión de
  proyecto, no un derivado: la norma deja elegirlo entre 1 y 4 h (§2.10.2 /
  CRIT-A35) y cambia el resultado. Único parámetro propio de M4 hoy → vive
  dentro de `configuracionAbastecimiento`, sin estructura adicional
  (`configuracionModulo4` separada se evaluará si aparece un segundo
  parámetro propio).
- **Ausencia ≠ `directa`**: un `Proyecto` sin `configuracionAbastecimiento`
  es M4 **no iniciado**, no "alimentación directa". Sin migración; sin
  default persistido.
- `ESQUEMAS_DE_ABASTECIMIENTO` (tupla `as const` en `modelo/proyecto`) es la
  lista runtime para validar datos persistidos.

### Validación -- `validarConfiguracionAbastecimiento`

`src/validacion/configuracionAbastecimiento/`, integrada en
`validarProyecto`. Dos códigos nuevos (ambos `error`):

- `configuracionAbastecimientoEsquemaInvalido` -- `esquema` fuera de la
  unión (JSON persistido corrupto).
- `configuracionAbastecimientoPeriodoConsumoMaximoInvalido` -- `Tc`
  presente pero no finito o fuera de `[1, 4]` h. **Nunca clamp, nunca
  corrección silenciosa.**

El chequeo de `Tc` es **independiente del esquema**: si el campo existe
debe ser estructuralmente válido (un `directa` con un `Tc` VÁLIDO
sobrante simplemente no lo usa; un `directa` con un `Tc` roto sí es
error -- el dato persistido está corrupto). Ausencia de
`configuracionAbastecimiento` **no** es un problema de validación (M4 no
iniciado ≠ proyecto inválido); un proyecto viejo sin M4 sigue siendo
válido.

### Orquestador -- `motor/modulo4/resolverEstadoModulo4`

Función pura. Firma por objeto (por el `qConexion_lps` optativo):

```ts
resolverEstadoModulo4({ proyecto, catalogoArtefactos, coeficientesMayoracion, qConexion_lps? })
  → EstadoModulo4
```

Compone `calcularSimultaneidad` (Qc global real de M1, CRIT-A5, sin
redondear -- mismo patrón que `resolverEstadoModulo3`) y
`calcularReservaDiaria` (M4-B, CRIT-A35). No reimplementa nada, no toca
M2/M3/`RedHidraulica`, no persiste.

**`EstadoModulo4`** = `noIniciado | error | incompleto | evaluado`:

- `noIniciado` -- sin `configuracionAbastecimiento`.
- `error` -- `configuracionAbastecimiento` persistida estructuralmente
  inválida. Nunca para un input todavía no disponible.
- `incompleto` -- config válida pero falta un insumo de un esquema **con
  tanque**: `faltaPeriodoConsumoMaximo`, `faltaCaudalDeConexion`,
  `sinArtefactosComputables`, `qcGlobalIndeterminado` (motivos tipados;
  los textos de UI vienen después). Se acumulan todos a la vez. El
  esquema **`directa` nunca cae en `incompleto`**.
- `evaluado` -- estado de cálculo determinado. **No** significa "cumple
  normativa" (no verifica la obligatoriedad de §2.8 -- faltan datos de
  destino/planta, slice posterior; ni compara contra un volumen adoptado
  -- todavía no existe).

**`ResultadoModulo4`** discriminado, para no representar `directa` con una
reserva artificial:

```ts
type ResultadoModulo4 =
  | { tipo: 'sinReservaPorTanque'; esquema: 'directa' }
  | { tipo: 'reservaCalculada'; esquema: 'tanqueElevado' | 'cisternaBombeoElevado'; reserva: ResultadoReservaDiaria }
```

- `directa` → `evaluado` + `sinReservaPorTanque`, sin necesitar `Tc` ni
  `Qconexión`.
- **`Qconexión ≥ Qc` con un esquema con tanque → `evaluado` +
  `reservaCalculada` con `déficit = 0` y `volumen = 0`** -- distinto de
  `sinReservaPorTanque`, y la distinción sobrevive en los tipos (test E7).
- `tanqueElevado` y `cisternaBombeoElevado` → **misma Reserva Total Diaria
  de Diseño** (sin reparto entre tanques, §2.11.3 diferido; test E8).

### Updaters -- `interfaz/paginas/actualizarConfiguracionAbastecimiento`

Funciones puras (sin React), mismo lugar y patrón que
`actualizarConfiguracionMedidores`:

- `conEsquemaDeAbastecimiento(proyecto, esquema)` -- **elegir el esquema
  es lo que inicia M4** (no hay `conModulo4Iniciado` con default: D-δ.63
  no persiste un default preventivo; el usuario elige). `directa` descarta
  `Tc`; entre esquemas con tanque `Tc` se conserva (mismo parámetro de
  reserva total).
- `conPeriodoConsumoMaximo(proyecto, número | undefined)` -- fija o quita
  `Tc`. **Sin clamp ni validación de rango** (eso es de la capa de
  validación; nunca se corrige el dato del usuario en silencio). Exige M4
  ya iniciado (`throw` si no).

### `qConexión` -- boundary input temporal (mini-arqueología Tabla N°1)

`src/normativa/eras-2023/tabla-01-gastos-conexion/` es **sólo datos
puros**: `tablaGastosConexion` (gasto en l/s por 8 diámetros nominales
`0013..0075` m y presión disponible 4–35 m), `reglaInterpolacion`
(interpolación lineal entre presiones consecutivas, §2.7),
`diametroMinimoConexion_m = 0,019`, `rangoPresionValida_m = { min: 4,
max: 35 }`. **No existe ninguna función selectora/interpoladora** ni test.
Para derivar `qConexión` haría falta: (1) un campo nuevo de **diámetro de
conexión** en el modelo (hoy `ParametrosProyecto` sólo tiene
`presionSobreAcera_m`, `alturaArtefactoMasDesfavorable_m`,
`tipoDeProyecto`); (2) un resolver puro con interpolación; (3) un
criterio sobre qué presión usar (el demo carga `presionSobreAcera_m: 2`,
**por debajo** del `rangoPresionValida_m` de la tabla) y sobre la
selección/interpolación de diámetro. Es un slice propio.

Por eso `qConexion_lps` sigue siendo **input explícito** de
`resolverEstadoModulo4` (mismo estatus que `presionDisponible` para M2).
**No se persiste** como resultado canónico; **no** se introduce por UI;
**no** se deriva de Tabla N°1 -- todo eso es el siguiente slice, que
persistirá los **datos físicos** (diámetro de conexión, presión) y no el
`qConexión` derivado.

### Tests (34 nuevos → 1087/1087, 121 archivos)

- `validacion/configuracionAbastecimiento/index.test.ts` -- C1..C10:
  proyecto sin config válido + M4 no iniciado, los tres esquemas válidos,
  `Tc` 1/4 h válidos, `Tc` <1 / >4 / `NaN` / ±∞ → error sin clamp,
  esquema desconocido → error, `directa` + `Tc` roto → error, integración
  en `validarProyecto` (proyecto viejo sin M4 sigue válido; M4 mal
  configurado invalida).
- `motor/modulo4/resolverEstadoModulo4.test.ts` -- E1..E10 +:
  `noIniciado`; `directa` → `evaluado`/`sinReservaPorTanque` sin `Tc` ni
  `Qconexión`; `incompleto` por `Tc` / `Qconexión` / sin computables;
  `evaluado`/`reservaCalculada`; **`Qconexión ≥ Qc` → `reservaCalculada`
  V=0, no `sinReservaPorTanque`**; `tanqueElevado` == `cisternaBombeoElevado`
  en volumen; **Qc exacto de M1 sin redondeo** (G2 → 0,771 m³ ≠ 0,792 m³);
  pureza (no muta el `Proyecto`, idempotente); config inválida → `error`
  no `incompleto`; acumulación de motivos.
- `motor/modulo4/resolverEstadoModulo4.golden.test.ts` -- golden de
  **orquestación** M1 → M4: caso G3 (Tabla N°3) a través de
  `resolverEstadoModulo4` → `reservaCalculada` ≈ 0,7712 m³ (publicado
  0,77).
- `interfaz/paginas/actualizarConfiguracionAbastecimiento.test.ts` --
  iniciar M4 al elegir esquema, inmutabilidad, cambio de esquema no toca
  otros campos del `Proyecto`, `Tc` conservado entre esquemas con tanque,
  `Tc` descartado al pasar a `directa`, `conPeriodoConsumoMaximo` sin
  clamp, `throw` con M4 no iniciado, idempotencia al quitar `Tc` ausente.

### Verificación

`vitest` 1087/1087 (121 archivos; +34 tests, +4 archivos), `tsc -b`
verde, `npm run build` verde, `eslint .` 11 baseline / 0 nuevos, working
tree limpio.

### Qué NO se hizo (deliberado, próximos slices)

Derivar `Qconexión` de Tabla N°1 (requiere modelo de diámetro de conexión
+ resolver + criterio); UI de M4 (M4-D); integración M4→M2 (derivar el
origen de M2 desde el esquema y eliminar el selector efímero del Panel de
Presión, con tests de regresión propios); volumen adoptado / "a
ejecutar"; catálogo comercial de tanques; reparto tanque de bombeo /
reserva (§2.11.3); verificación de la obligatoriedad de reserva de §2.8
(faltan datos de destino/planta); reserva contra incendio; población/
dotación. Ninguno bloquea este cierre.

### Decisiones rojas

Ninguna. La mini-arqueología de Tabla N°1 no forzó una estructura
persistida distinta de la propuesta; no hay en el repo un modelo de
abastecimiento/origen persistido incompatible (el "Tipo de alimentación"
de M2 es un selector de presentación efímero, D-δ.43); la configuración
global alcanza para los casos que el producto ya soporta (esquemas mixtos
por sector quedan registrados como alcance futuro y su reducción a global
sería una decisión roja previa si el modelo llegara a representarlos).

### Estado

**D-δ.63 -- CERRADA.** `Proyecto.configuracionAbastecimiento` (global,
optativa, backward-compatible), `Tc` persistido, `validarProyecto`
integrado, `resolverEstadoModulo4` puro con `ResultadoModulo4`
discriminado (`directa` sin reserva artificial; tanque con `déficit = 0`
sí produce `reservaCalculada` V=0), `Qc` real de M1 reutilizado,
`qConexión` como boundary explícito, composición M1→M4 probada. Baseline
verde. Siguiente slice recomendado: derivar `Qconexión` de Tabla N°1
(persistiendo diámetro de conexión + presión) **o** UI de M4 (M4-D).

## D-δ.64 -- M4-D1: resolver puro de gasto de conexión según Tabla N°1 (§2.7) -- CERRADA

Incremento **funcional**. Slice normativo/puro: `Tabla N°1 + DN + presión
de cálculo → Qconexión`. Sin UI, sin persistencia, sin integración
`Proyecto → Qconexión`, sin tocar M2 ni `EstadoModulo4`.

### Auditoría del dataset existente (`tabla-01-gastos-conexion`)

El dataset (`tablaGastosConexion`, `reglaInterpolacion`,
`diametroMinimoConexion_m`, `rangoPresionValida_m`, `notaDiametrosMetalicos`)
viene de la línea base de Fase 1 (`6aff06d`), nunca tocado. Verificado:

- 32 filas, presión **4 a 35 m en pasos de 1 m**, contiguas sin huecos;
  `rangoPresionValida_m = { min: 4, max: 35 }` coincide con la primera y
  última fila.
- 8 columnas de diámetro nominal: 0,013 / 0,019 / 0,025 / 0,032 / 0,038 /
  0,050 / 0,060 / 0,075 m.
- Gasto **monótono creciente con la presión** (por columna) y
  **estrictamente creciente con el diámetro** (por fila) -- test de
  integridad del dataset incluido.
- Las tres notas oficiales de §2.7 (interpolación lineal en altura; DN
  mínimo de conexión 0,019 m; DN metálicos / criterio para plásticos) se
  obtuvieron **verbatim** de la fuente (argentina.gob.ar) y coinciden con
  el dataset.
- Los dos gastos que las planillas Tabla N°3/N°4 usan (DN19/5 m → 0,60;
  DN25/5 m → 1,18) están en el dataset **exactamente**.
- **Única observación:** la celda presión 5 m / DN 0,032 m vale `2.012`
  (3 decimales, frente a 2 en todo el resto). Es monótona, no la consume
  ningún golden ni motor. **Se deja sin tocar** ("no corregir en silencio
  una tabla normativa") -- la lámina oficial es una imagen y no se pudo
  cotejar la celda en esta corrida. No es decisión roja: no bloquea nada
  y no hay discrepancia confirmada, sólo un formato anómalo en una
  transcripción preexistente.

**Sin decisión roja:** el dataset coincide con las notas verbatim y con
los goldens; la fuente autoriza interpolar sólo en altura (no en DN); el
rango declarado coincide con el dataset.

### Resolver -- `resolverGastoTabla01` (en `tabla-01-gastos-conexion/index.ts`)

Función pura (misma política que `seleccionarFilaTabla06PorCaudal` de
Tabla N°6 / `obtenerKsDeAccesorio` de Tabla N°7: el resolver vive junto a
los datos).

```ts
resolverGastoTabla01({ diametroNominal_m, presionCalculo_m }) → ResultadoGastoTabla01
```

`ResultadoGastoTabla01` discriminado:

- `{ estado: 'resuelto', diametroNominal_m, presionCalculo_m, qConexion_lps,
  interpolacion }` -- `interpolacion` es
  `{ aplicada: false, presionTabulada_m }` (presión exactamente tabulada,
  celda sin alterar) o `{ aplicada: true, presionInferior_m,
  presionSuperior_m, gastoInferior_lps, gastoSuperior_lps }`
  (interpolación lineal **sólo en la presión**).
- `{ estado: 'fueraDeRangoDePresion', ..., rango_m }` -- presión fuera de
  `[4, 35]` m (incluye ≤ 0). **Nunca clamp, nunca extrapolación, nunca 0.**
  No significa "proyecto inválido": significa "Tabla N°1 no determina el
  gasto con ese input".
- `{ estado: 'diametroNoTabulado', ..., diametrosTabulados_m }` -- el DN no
  es una de las 8 columnas. **Nunca se interpola entre diámetros** (clave
  discreta).

Inputs no finitos (`NaN`, `±Infinity`) → `throw` (error de programación,
no estado de dominio). Sin redondeo intermedio (la UI redondeará).
Tolerancia de reconocimiento de columna 1e-6 m (absorbe ruido IEEE-754 de
un llamador que calcule `19/1000`; << 6 mm de separación entre columnas).

### `esDiametroAdmisibleComoConexion(diametroNominal_m): boolean`

Predicado puro: DN tabulado **∧** ≥ 0,019 m (§2.7). DN13 → `false`; DN19..
DN75 → `true`. **No** elige un DN ni asume uno por defecto: "mínimo DN19"
≠ "si falta el dato, asumir DN19". La ausencia de DN sigue siendo
ausencia; la selección/persistencia del DN de conexión es M4-D2.
Separación deliberada: `resolverGastoTabla01` es genérico (Tabla N°1 tiene
doble alcance: conexiones *y* cañerías de agua directa, por eso la fila
DN13 sigue siendo válida para el resolver); el gate de conexión lo aplica
este predicado.

### `presionCalculo_m` ≠ presión sobre acera

El resolver recibe la **presión de cálculo en el punto relevante**, ya
ajustada. §2.7 exige corregir la presión garantizada sobre el nivel de
acera por el desnivel hasta el punto alimentado: se **resta** el ascenso
(hacia arriba: artefacto más alto y alejado en alimentación directa; pelo
de agua del tanque), se **suma** el descenso (hacia abajo: tanque de
bombeo en sótano; artefactos directos en subsuelos). Esa transformación
**no vive en este módulo** (queda registrada en CRIT-A36). Qué punto
físico usa cada esquema y qué geometría persistir para derivarla
automáticamente es M4-D2. En particular: el "pelo de agua mínimo" que
maneja M2 **no** es necesariamente la cota de entrada del tanque -- no se
reutiliza por comodidad.

### Criterio y goldens

- **CRIT-A36** (`CRITERIOS.md`) -- Gasto de conexión según Tabla N°1:
  tabla, DN discreto, interpolación lineal sólo en presión, dominio sin
  extrapolación, DN mínimo de conexión 0,019 m, `presionCalculo_m` ≠
  presión sobre acera.
- **Goldens G5/G6** (`CASOS-GOLDEN.md`): DN19/5 m → 0,60 l/s (usado por
  Tabla N°3); DN25/5 m → 1,18 l/s (usado por Tabla N°4). Ambos con presión
  tabulada exacta (sin interpolación).
- **Cadena pura Tabla N°1 → reserva** (`motor/reserva/calcularReservaDiaria.golden.test.ts`):
  `resolverGastoTabla01` → `Qconexión` → `calcularReservaDiaria` reproduce
  G3 (0,7712 m³) y G4 (≈ 2,82 m³), sin pasar por `EstadoModulo4`.

### Tests (25 nuevos → 1112/1112, 122 archivos)

`tabla-01-gastos-conexion/index.test.ts`: integridad del dataset
(contigüidad, monotonía en ambos ejes, los 8 DN), resolver (cada DN en
presión exacta; extremos 4/35 m; interpolación no trivial P=5,25 m
fracción 0,25 y P=7,6 m fracción 0,6; punto tabulado inalterado; DN no
tabulado; sin interpolación entre DN; presión apenas fuera de rango y
casos 2 m / 36 m; presión ≤ 0; `NaN`/`±Infinity` → throw; DN13 válido en
el genérico; ruido `19/1000`), `esDiametroAdmisibleComoConexion` (DN13
no, DN19 mínimo, todos los ≥19 mm tabulados, DN no tabulado, `NaN`),
goldens G5/G6. Más 2 casos en el golden de reserva (cadena Tabla1→reserva).

### Verificación

`vitest` 1112/1112 (122 archivos; +25 tests, +1 archivo), `tsc -b` verde,
`npm run build` verde, `eslint .` 11 baseline / 0 nuevos, working tree
limpio.

### Qué NO se hizo (M4-D2 y posteriores)

Persistir el diámetro de conexión en el modelo (`Proyecto` /
`ParametrosProyecto` / `configuracionAbastecimiento`); derivar
`presionCalculo_m` desde el Proyecto (requiere fijar el punto físico por
esquema y qué geometría persistir -- cota de entrada del tanque, de la
cisterna en sótano, etc.); reemplazar el boundary `qConexion_lps?` de
`resolverEstadoModulo4`; seleccionar automáticamente un DN (buscar el
mínimo con Q ≥ Qc -- sin base normativa, la Operadora fija la conexión);
criterio de compatibilidad de materiales plásticos; UI; integración M2;
cambiar el demo (`presionSobreAcera_m: 2`, por debajo del rango de Tabla
N°1 -- en la futura integración un input incompatible dará
`fueraDeRangoDePresion`, que es el comportamiento correcto).

### Decisiones rojas

Ninguna. Ver "Auditoría del dataset".

### Estado

**D-δ.64 -- CERRADA.** `resolverGastoTabla01` +
`esDiametroAdmisibleComoConexion` puros y exhaustivamente testeados;
CRIT-A36 registrado; goldens G5/G6 y cadena Tabla1→reserva. Dataset
auditado (una observación menor, sin cambio). `EstadoModulo4` intacto
(sigue con `qConexion_lps?` boundary). Baseline verde. Siguiente slice:
**M4-D2** -- persistir diámetro de conexión + presión y derivar
`Qconexión` para `EstadoModulo4` (fijando antes qué punto físico y qué
geometría usa cada esquema de abastecimiento).

## D-δ.65 -- M4-D2: `Proyecto → presión de cálculo → Tabla N°1 → Qconexión → EstadoModulo4` -- CERRADA

Incremento **funcional**. Cierra la cadena de reserva desde el Proyecto y
**elimina el boundary provisional `qConexion_lps`** de
`resolverEstadoModulo4`. Sin UI, sin tocar M2, sin reparto/adopción de
tanques.

### Modelo -- datos físicos de la conexión en `ParametrosProyecto`

Dos campos **optativos**, junto a `presionSobreAcera_m`:

```ts
type ParametrosProyecto = {
  tipoDeProyecto: TipoDeProyecto
  presionSobreAcera_m: number
  alturaArtefactoMasDesfavorable_m: number
  diametroNominalConexion_m?: number   // DN de Tabla N°1, >= 0,019 m
  desnivelConexion_m?: number          // desnivel FIRMADO respecto de la acera
}
```

- **`diametroNominalConexion_m`**: diámetro de la conexión (m). Vive en
  `ParametrosProyecto` porque es una propiedad física del abastecimiento
  que Tabla N°1 consume y otros módulos podrían usar -- no en
  `configuracionAbastecimiento`.
- **`desnivelConexion_m`**: desnivel **firmado** (no longitud) del punto
  de alimentación de cálculo respecto de la acera. `> 0` por encima
  (resta), `= 0` igual, `< 0` por debajo (suma el descenso: restar un
  negativo). Ver CRIT-A37.
- **Backward-compatible, sin migración.** Ausencia ≠ 0, ausencia ≠ DN
  mínimo: **no hay default**. Un proyecto viejo sigue válido; M4 con
  esquema de tanque queda `incompleto` hasta que se declaren.
- `presionSobreAcera_m` **no se movió** (rompería compatibilidad) y su
  semántica -- "presión mínima garantizada sobre el nivel de vereda"
  (D-δ.38) -- coincide con lo que M4-D2 asume. No red decision.

### Presión de cálculo -- `resolverPresionDeCalculoDeConexion` (`motor/modulo4/`)

Primitiva pura: `presionCalculo_m = presionSobreAcera_m − desnivelConexion_m`.
Sólo la resta firmada -- **sin clamp, sin redondeo, sin conocer el rango
`[4, 35]` m** de Tabla N°1. Inputs no finitos → `throw`. Formalizada como
**CRIT-A37**.

### Validación -- `validarParametrosDeConexion` (`validacion/parametrosConexion/`)

Integrada en `validarProyecto`. Dos códigos nuevos (`error`):

- `parametrosDiametroNominalConexionNoAdmisible` -- DN presente pero no
  admisible como conexión (usa `esDiametroAdmisibleComoConexion`: tabulado
  ∧ ≥ 0,019 m). **DN13 es error** como DN de conexión persistido (aunque
  sea válido para el resolver genérico de Tabla N°1).
- `parametrosDesnivelConexionNoFinito` -- desnivel presente pero no finito
  (cualquier **signo** es válido; no se restringe a ≥ 0).

`presionSobreAcera_m` **no se valida** (su rango es el de la presión de
cálculo de Tabla N°1, no el de la presión de acera; el demo usa 2 m y
sigue válido). **Ausencia** de DN / desnivel **no** es problema de
validación.

### Orquestador -- `resolverEstadoModulo4` (nueva firma)

```ts
resolverEstadoModulo4({ proyecto, catalogoArtefactos, coeficientesMayoracion })
  → EstadoModulo4
```

**`qConexion_lps` eliminado del contrato público.** El Qconexión se
deriva internamente: `presionSobreAcera_m` + `desnivelConexion_m` →
`resolverPresionDeCalculoDeConexion` → `resolverGastoTabla01(DN, Pcalc)`.
`calcularReservaDiaria` **sigue** recibiendo `qConexion_lps` explícito
(es la primitiva numérica inferior) y `ResultadoReservaDiaria` sigue
exponiéndolo -- sólo se quitó la **frontera** provisional del orquestador.
No quedan consumidores del boundary anterior (M4-C nunca tuvo UI).

**`EstadoModulo4`** (`noIniciado | error | incompleto | evaluado`) sin
cambios de forma. Cambios:

- **`error`** ahora también por `parametros.diametroNominalConexion_m` /
  `.desnivelConexion_m` estructuralmente inválidos.
- **Motivos de `incompleto`** actualizados: se quitó
  `faltaCaudalDeConexion` (era el boundary manual); se agregaron
  `faltaDiametroConexion`, `faltaDesnivelConexion` y
  `presionConexionFueraDeTabla` (`{ presionCalculo_m, rango_m }`).
  Presión de cálculo fuera de `[4, 35]` m → **`incompleto`**, nunca
  `error` ni extrapolación.
- **`directa`** sin cambios: `evaluado` + `sinReservaPorTanque` sin
  necesitar Tc, DN, desnivel ni Tabla N°1. (Un DN inválido persistido sí
  es `error` -- dato corrupto, independiente del esquema.)

**`ResultadoModulo4.reservaCalculada`** gana un bloque `conexion`
auditable:

```ts
conexion: {
  diametroNominal_m, presionSobreAcera_m, desnivelConexion_m,
  presionCalculo_m, qConexion_lps, interpolacion   // metadata de Tabla N°1
}
```

para que el usuario/profesional siga la cadena `P acera → Δz → P cálculo →
Tabla N°1 → Qconexión → reserva` sin recomputar.

### Updaters -- `actualizarParametrosDeConexion` (`interfaz/paginas/`)

`conDiametroNominalConexion` y `conDesnivelConexion` -- puros, sin React,
sin clamp, sin validación de rango, sin default. `undefined` limpia el
campo (idempotente si ya estaba ausente).

### Auto-derivación desde M2: **explícitamente diferida**

`desnivelConexion_m` es un **dato declarado**. M4-D2 **no** recorre
`RedHidraulica` para obtenerlo: el punto físico relevante depende del
esquema (directa → artefacto más alto/alejado surtido excluyendo poco
frecuentes; tanque elevado → alimentación del tanque; cisterna+bombeo →
alimentación de la cisterna, bajo acera), el modelo no contiene
inequívocamente esas cotas, y **el "pelo de agua mínimo" de M2 NO es la
cota de entrada del tanque** (prohibido reutilizarlo). La UI futura
mostrará la semántica del desnivel según el esquema. La auto-derivación
geométrica es deuda futura, sólo con semántica física suficiente.

### Tests (26 nuevos → 1138/1138, 125 archivos)

- `motor/modulo4/resolverPresionDeCalculoDeConexion.test.ts` -- P1..P5:
  subida (10−3=7), igual (10−0=10), bajada (10−(−3)=13), sin redondeo,
  sin clamp (puede devolver 2 o −35), no finitos → throw.
- `validacion/parametrosConexion/index.test.ts` -- V1..V11: ausentes
  válido, DN19/DN75 admisibles, DN13/DN22/no-finito/negativo no
  admisibles, desnivel ±/0 válido, desnivel no finito error,
  `presionSobreAcera_m = 2` no invalida, integración en `validarProyecto`.
- `motor/modulo4/resolverEstadoModulo4.test.ts` -- E1..E10 reescritos +:
  `directa` sin datos; `incompleto` por DN / desnivel / Tc / presión
  fuera de tabla; `evaluado` con traza de conexión; `Qconexión ≥ Qc` →
  V=0 (no `sinReservaPorTanque`); `tanqueElevado` == `cisternaBombeoElevado`;
  **descenso** (`desnivelConexion_m < 0` → mayor `presionCalculo_m` →
  mayor Qconexión → menor reserva, por el signo, sin regla especial);
  DN13 persistido → `error`; desnivel `NaN` → `error`; `directa` no se
  bloquea; acumulación de motivos; pureza; **interpolación end-to-end**
  (P acera 8, Δz 1,5 → Pcalc 6,5 → Tabla N°1 interpola → 0,69, propagado
  a la reserva sin redondear).
- `motor/modulo4/resolverEstadoModulo4.golden.test.ts` reescrito -- **G3
  y G4 end-to-end**: `Proyecto` real → M1 → presión de cálculo → Tabla
  N°1 → reserva, **sin inyectar `Qconexión`**. G3: DN19 / P acera 5 m /
  Δz 0 → 0,7712 m³. G4: DN25 / P acera 5 m / Δz 0 → ≈ 2,82 m³ (publicado
  ≈ 3).
- `interfaz/paginas/actualizarParametrosDeConexion.test.ts` -- fijar/quitar
  sin default ni clamp, desnivel firmado, inmutabilidad, idempotencia.

### Verificación

`vitest` 1138/1138 (125 archivos; +26 tests, +3 archivos), `tsc -b`
verde, `npm run build` verde, `eslint .` 11 baseline / 0 nuevos, working
tree limpio. Sin consumidores del `qConexion_lps` provisional fuera de las
primitivas legítimas (`calcularReservaDiaria`, `ResultadoReservaDiaria`).

### Qué NO se hizo (próximos slices)

Auto-derivar `desnivelConexion_m` desde M2 (requiere fijar el punto
físico por esquema y qué geometría persistir -- cota de entrada del
tanque, de la cisterna en sótano); UI de M4 (editar los nuevos campos);
integración M4→M2 (derivar el origen de M2 desde el esquema y retirar el
selector efímero del Panel de Presión, con auditoría de regresión);
volumen adoptado vs requerido; reparto tanque de bombeo / de reserva
(§2.11.3); obligación de reserva de §2.8; selección automática de DN de
conexión (sin base normativa -- la Operadora la fija); criterio de
materiales plásticos. El demo (`presionSobreAcera_m: 2`) **no** se tocó.

### Decisiones rojas

Ninguna. `ParametrosProyecto` admite los campos nuevos como optativos sin
refactor; `presionSobreAcera_m` ya tenía la semántica asumida (D-δ.38); el
repo no representa el punto de alimentación de conexión (no hay
duplicación); la norma se satisface con un desnivel firmado declarado; el
boundary `qConexion_lps` sólo lo consumían los tests de M4.

### Estado

**D-δ.65 -- CERRADA.** DN de conexión y desnivel firmado persistidos
(optativos, backward-compatible); `resolverPresionDeCalculoDeConexion`
(CRIT-A37); Tabla N°1 como única fuente de `Qconexión` en
`resolverEstadoModulo4` (boundary provisional eliminado); `directa`
independiente; `incompleto` ante datos ausentes o presión fuera de tabla;
`error` ante DN/desnivel inválidos; goldens G3/G4 end-to-end +
interpolación + descenso. Baseline verde. Siguiente slice: **UI de M4**
(M4-D) **o** auto-derivación geométrica del desnivel por esquema.

## D-δ.66 -- M4-E: reserva requerida vs adoptada + distribución entre tanques (§2.11.3) -- CERRADA

Incremento **funcional**. Cierra el dominio de **capacidad adoptada** y,
para `cisternaBombeoElevado`, su **distribución física** entre tanque de
bombeo (inferior) y de reserva (elevado). Sin UI, sin integración con M2,
sin catálogo comercial, sin bombas/geometría.

### Interpretación de §2.11.3 (cerrada)

Texto oficial: *"Los tanques de bombeo y reserva deben poseer un volumen
mínimo de 1/3 de la Reserva Total Diaria."* Interpretación adoptada
(CRIT-A38), **no** un reparto único:

- **cada** tanque ≥ `VRTD / 3` (medido contra la Reserva Total Diaria,
  **no** contra el volumen adoptado total);
- [FÍSICA] capacidad total adoptada ≥ `VRTD`;
- **no** se exige suma exacta ni reparto fijo 1/3 + 2/3; el
  sobredimensionamiento no penaliza.

Sin decisión roja: el texto verbatim es consistente con esta lectura; no
exige igualdad de la suma ni un reparto fijo; "tanque de reserva"
corresponde al tanque elevado del esquema; no hay semántica previa de
capacidad de tanque en el repo; la persistencia no exige una entidad
topológica nueva.

### Modelo -- `ConfiguracionDeAbastecimiento` (dos campos nuevos)

```ts
volumenTanqueElevadoAdoptado_m3?: number   // almacenamiento SUPERIOR
volumenTanqueBombeoAdoptado_m3?: number     // almacenamiento INFERIOR / cisterna
```

Capacidades **adoptadas** por el proyectista (m³). Decisiones de proyecto
→ persistidas; **nunca** la RTD calculada, sus tercios, sumas ni estados
de verificación. Optativas, **sin default, sin catálogo comercial** (el
usuario declara la capacidad real). `0` es estructuralmente válido;
ausencia ≠ 0. Un campo que no corresponde al esquema actual se **ignora**
en el cálculo (no lo invalida) y **no se poda** de forma destructiva al
cambiar de esquema — una decisión previa del mismo componente físico
reaparece si se vuelve a ese esquema.

### Validación -- `validarConfiguracionAbastecimiento` (ampliada)

Dos códigos nuevos (`error`):
`configuracionAbastecimientoVolumenTanqueElevadoInvalido` /
`...VolumenTanqueBombeoInvalido` -- capacidad presente pero **no finita o
< 0** (`0` válido). Chequeo **independiente del esquema** (un volumen en
`directa` o el de bombeo en `tanqueElevado` no invalida el proyecto: no
aplica, no es corrupción). **`adoptado < requerido` NO es un problema de
validación** -- es una verificación derivada. Ausencia tampoco.

### Función pura -- `resolverAdopcionDeReserva` (`motor/modulo4/`)

```ts
resolverAdopcionDeReserva({ esquema, volumenReservaRequerido_m3,
  volumenTanqueElevadoAdoptado_m3?, volumenTanqueBombeoAdoptado_m3? })
  → ResultadoAdopcionDeReserva
```

Discriminado, comparaciones **exactas** `>=` (sin tolerancia ni redondeo
-- las capacidades son valores declarados):

- `directa` → `{ tipo: 'noAplica' }` (ignora los volúmenes; **no** se
  fabrica requerido/adoptado = 0).
- `tanqueElevado`:
  - sin capacidad → `sinAdopcion` (`volumenRequerido_m3`).
  - con capacidad → `verificada`: `diferencia_m3 = adoptado − requerido`,
    `estado = adoptado >= requerido ? 'suficiente' : 'insuficiente'`.
    **Sin mínimo individual de 1/3** (no hay sistema dividido); el volumen
    de bombeo se ignora.
- `cisternaBombeoElevado`:
  - falta uno o ambos → `adopcionIncompleta` (`faltaTanqueBombeo` /
    `faltaTanqueElevado`).
  - ambos → `verificadaDistribuida` con `minimoPorTanque_m3 = VRTD/3`,
    `totalAdoptado_m3`, y **tres verificaciones independientes**:
    `tanqueBombeoCumpleMinimo` (`VTB ≥ VRTD/3`),
    `tanqueElevadoCumpleMinimo` (`VTR ≥ VRTD/3`), `totalCumple`
    (`VTB+VTR ≥ VRTD`). `estado = 'suficiente'` **⇔ las tres**
    verdaderas.

Casos discriminantes verificados: total OK pero inferior < 1/3 →
insuficiente; ambos ≥ 1/3 pero total < VRTD → insuficiente; inferior 25 %
del total adoptado pero ≥ VRTD/3 → suficiente (protege contra medir
contra el total en vez de la RTD); sobredimensionado → suficiente;
`VRTD = 0` → mínimos/total triviales, sin afirmar "tanque no requerido".

### `ResultadoModulo4` + `EstadoModulo4`

`ResultadoModulo4.reservaCalculada` gana `adopcion: ResultadoAdopcionDeReserva`
(computado desde `configuracion` + `reserva.volumenReservaDiseno_m3`).
`directa` sigue siendo `sinReservaPorTanque` **sin** bloque `adopcion`.

**`EstadoModulo4` NO se degrada por falta de adopción.** Un esquema con
tanque y reserva calculada queda `'evaluado'` aunque `adopcion.tipo` sea
`sinAdopcion` / `adopcionIncompleta`. Separar computabilidad ("la reserva
requerida es 0,771 m³") de decisión de proyecto ("qué tanque se adopta")
-- mismo patrón que M3 (evaluado ≠ cumple). `adopcion.estado =
'suficiente'` sólo dice que la capacidad cubre la RTD calculada (y los
mínimos de §2.11.3), **no** cumplimiento normativo global (§2.8 aparte;
sin `cumpleNorma` / `instalacionValida`).

### Reactividad

Todo derivado: cambiar `Qc` / `Pacera` / DN / desnivel / `Tc` recalcula
`VRTD`, sus tercios y las verificaciones -- la **misma** capacidad
adoptada puede pasar de `suficiente` a `insuficiente` (test:
`volumenTanqueElevadoAdoptado_m3 = 1 m³` con `Tc = 1 h` → suficiente,
`Tc = 4 h` → insuficiente). Nunca se persiste `cumple`.

### Updaters -- `actualizarConfiguracionAbastecimiento` (ampliado)

`conVolumenTanqueElevadoAdoptado` / `conVolumenTanqueBombeoAdoptado`
(`number | undefined`, sin clamp/validación/default; se puede limpiar un
valor persistido aunque el esquema actual no contenga ese tanque; `throw`
si M4 no iniciado). `conEsquemaDeAbastecimiento` conserva ambas
capacidades entre esquemas con tanque y las descarta al pasar a `directa`
(§13: identificadas por componente físico, nunca transformadas, nunca
usadas cuando no aplican; sin poda destructiva).

### Tests (38 nuevos → 1176/1176, 126 archivos)

- `motor/modulo4/resolverAdopcionDeReserva.test.ts` -- `directa`/`noAplica`;
  tanque elevado T1..T5 (sin adopción, insuficiente, exacto,
  sobredimensionado, VRTD=0); dos tanques C1..C9 + VRTD=0; el volumen de
  bombeo se ignora en `tanqueElevado`.
- `validacion/configuracionAbastecimiento/index.test.ts` -- V1..V8:
  ausentes / 0 / positivo válidos; negativo / `NaN` / `±Infinity` error;
  volumen de bombeo en `tanqueElevado` y volúmenes en `directa` no
  invalidan; `adoptado < requerido` no es problema; integración en
  `validarProyecto`.
- `motor/modulo4/resolverEstadoModulo4.test.ts` -- sin adopción →
  `evaluado` + `sinAdopcion`; adopción suficiente con `diferencia_m3 ≈
  +0,2288`; cisterna incompleta → distribuida suficiente → distribuida
  insuficiente (inferior < 1/3 con total OK), todas `evaluado`;
  reactividad Tc; `directa` con volúmenes → `sinReservaPorTanque` sin
  `adopcion`.
- `interfaz/paginas/actualizarConfiguracionAbastecimiento.test.ts` --
  fijar/quitar sin clamp; `0` válido; `throw` con M4 no iniciado; limpiar
  aunque el esquema no contenga el tanque; conservación entre esquemas y
  descarte en `directa`.

### Verificación

`vitest` 1176/1176 (126 archivos; +38 tests, +1 archivo), `tsc -b`
verde, `npm run build` verde, `eslint .` 11 baseline / 0 nuevos, working
tree limpio. `CASOS-GOLDEN.md` sin cambios (no aparece un golden
normativo nuevo; el "1 m³ a ejecutar" de Tabla N°3 no es una regla
general).

### Qué NO se hizo

Default de reparto 1/3 + 2/3 (la UI podrá sugerirlo); porcentajes
persistidos (se derivan); geometría del tanque (ancho/alto/nivel
mínimo/cámara de aire); equipo de bombeo (caudal/potencia/ciclos/
flotantes -- el tanque inferior es sólo almacenamiento acá); división en
secciones iguales de tanques ≥ 4.000 L (§2.11, constructivo);
verificación de obligatoriedad de §2.8; sugerencia comercial de
capacidad; UI de M4; integración M4→M2; reporting.

### Decisiones rojas

Ninguna. Ver "Interpretación de §2.11.3".

### Estado

**D-δ.66 -- CERRADA.** Capacidades adoptadas persistidas (optativas,
backward-compatible, validación estructural); `resolverAdopcionDeReserva`
puro (requerido vs adoptado; un tanque; dos tanques con los tres
criterios de §2.11.3; sobredimensionamiento permitido; sin igualdad
artificial; `VRTD = 0` tratado); `ResultadoModulo4.adopcion` sin degradar
`EstadoModulo4`; reactividad. Baseline verde. **Con esto M4 tiene todos
los datos para diseñar el Panel M4 (M4-D) sin inputs provisionales.**
Siguiente slice: **UI de M4** o auto-derivación geométrica del desnivel
por esquema.

## D-δ.67 -- M4-F: Panel de Módulo 4 (Abastecimiento y reserva) -- CERRADA

Incremento **funcional** de UI, sobre contratos ya cerrados (CRIT-A35 a
CRIT-A38). Sin inputs provisionales, sin integración M4→M2, sin reglas
hidráulicas/normativas nuevas.

### Componente -- `PanelDeModulo4.tsx` (`interfaz/paginas/`)

`<details open>` con `<h2>Módulo 4 — Abastecimiento y reserva</h2>`,
montado en `MotorDemandaPantalla` **después** de
`PanelDeMedidoresDeModulo3` (orden final M1 → M2 → M3 → M4; sin sidebar,
sin router). Consume `resolverEstadoModulo4({ proyecto, catalogoArtefactos,
coeficientesMayoracion })` y **no recalcula nada** (Qc, presión de
cálculo, interpolación, Qconexión, déficit, RTD, mínimos 1/3, suficiencia
vienen del motor). Rápido/Profesional se deriva de `resolverModoDeTrabajo`
(D-δ.51), sin eje nuevo.

**Estados:**

- **No iniciado**: texto breve + tres botones (Alimentación directa /
  Tanque elevado / Cisterna + bombeo + tanque elevado). Elegir el esquema
  inicia M4 (`conEsquemaDeAbastecimiento`); no se persiste ningún default.
- **Configuración** (siempre visible con esquema elegido): selector de
  esquema (radios). Con esquema de tanque, además: período de consumo
  máximo [h] (input, ayuda "cualquier valor entre 1 y 4 h", sin clamp),
  DN de conexión [mm] (`<select>` **sólo con DN admisibles como conexión**:
  19/25/32/38/50/60/75 -- nunca DN13; "Seleccionar…" cuando falta),
  presión sobre acera [m], desnivel de conexión [m] (firmado, etiqueta
  contextual al esquema, ayuda "positivo si está por encima de la acera;
  negativo si está por debajo").
- **Error**: lista los problemas de validación con
  `codigosValidacion[codigo].descripcion` (castellano, sin `throw` a
  React).
- **Incompleto**: motivos humanizados (`describirMotivoIncompletitudModulo4`),
  sin enums crudos. `presionConexionFueraDeTabla` → mensaje específico
  con la presión de cálculo y el rango "4–35 m", nunca "proyecto
  inválido".
- **Evaluado / directa** (`sinReservaPorTanque`): "El cálculo de Reserva
  Total Diaria por tanque no aplica a este esquema." + nota discreta
  "La obligatoriedad normativa de disponer reserva (§2.8) se evalúa por
  separado." **No** muestra "no necesita tanque" / "cumple" / "V = 0" ni
  campos de Tc/DN/desnivel/tanques.
- **Evaluado / reservaCalculada**: bloque **Conexión** (Rápido: sólo
  "Caudal de conexión: X L/s"; Profesional: tabla P acera → desnivel →
  presión de cálculo → DN → Qconexión con nota de interpolación).
  **Reserva Total Diaria de Diseño** como protagonista ("Reserva
  requerida: X m³ (≈ Y L)"); si `deficit_lps === 0`: "Reserva calculada
  por déficit: 0 m³" + "Este resultado no determina por sí solo la
  obligatoriedad de disponer tanque." Profesional: tabla Qc / Qconexión /
  déficit / Tc / RTD. Bloque **Capacidad adoptada**: input(s) de volumen
  + `VerificacionDeAdopcion` según `adopcion.tipo`:
  - `sinAdopcion` / `adopcionIncompleta` → "Cálculo completo · adopción
    pendiente" + qué falta. **El estado del cálculo sigue "Evaluado"**
    (separado del estado de adopción).
  - `verificada` → tabla Requerido / Adoptado / Diferencia / "✓ Suficiente"
    o "⚠ Insuficiente".
  - `verificadaDistribuida` → RTD requerida, mínimo por tanque (1/3),
    por-tanque (adoptado + ✓/⚠ mínimo), total adoptado + ✓/⚠, estado
    conjunto, + cita textual de §2.11.3 ("cada uno debe disponer como
    mínimo de 1/3 de la Reserva Total Diaria" -- **no** "1/3 abajo y 2/3
    arriba").
  Nunca "Cumple norma" / "instalación válida".

### Helpers -- `humanizarModulo4.ts` (puro)

`ETIQUETA_ESTADO_MODULO_4`, `ETIQUETA_ESQUEMA_ABASTECIMIENTO`,
`etiquetaDesnivelConexion(esquema)`, formateadores es-AR
(`formatearVolumen_m3` 3 dec, `formatearCaudal_lps` / `formatearPresion_m`
2 dec, `volumenEnLitros` presentación), `describirMotivoIncompletitudModulo4`,
`describirProblemaDeErrorModulo4` (reutiliza el catálogo de códigos, no
reinterpreta). Litros nunca se persisten.

### Updater nuevo -- `conPresionSobreAcera`

`presionSobreAcera_m` **no tenía ninguna superficie de edición** hasta
ahora (sólo se fijaba en `proyectoInicial`). El Panel de M4 es su editor,
vía `conPresionSobreAcera` (`actualizarParametrosDeConexion.ts`) --
**una sola** propiedad persistida, sin duplicar estado, sin cambiar su
semántica (D-δ.38), sin imponer el rango `[4, 35]` m (ese rango es de la
presión de cálculo, no de la de acera; el demo usa 2 m). Es un campo
obligatorio → el updater siempre toma un `number`. Los demás controles
usan updaters existentes (`conEsquemaDeAbastecimiento`,
`conPeriodoConsumoMaximo`, `conDiametroNominalConexion`,
`conDesnivelConexion`, `conVolumenTanque{Elevado,Bombeo}Adoptado`) y
`parsearCota` (desnivel firmado) / un `parsearNoNegativo` local (Tc,
presión, volúmenes -- '' → undefined, negativo/NaN → 'ignorar', sin clamp
silencioso; mismo principio que `parsearEntradaHidraulica` de M2).

### Tests (20 nuevos → 1196/1196, 128 archivos)

- `PanelDeModulo4.test.ts` -- 16 SSR (`renderToStaticMarkup`, patrón del
  directorio): encabezado, no iniciado con las 3 opciones, directa
  ("no aplica" / sin V=0 / sin campos de tanque), tanque incompleto (3
  motivos humanizados, sin enums), presión fuera de tabla (mensaje
  específico, sin "inválido"), G3 evaluado (Qconexión 0,60 / RTD 0,771 m³
  / 771 L / adopción pendiente), adopción suficiente (+0,229 m³, sin
  "Cumple norma"), adopción insuficiente con estado del cálculo aún
  "Evaluado", cisterna distribuida insuficiente (3 criterios + §2.11.3),
  cisterna incompleta, DN13 persistido → Error humano, `Qconexión ≥ Qc`
  → "déficit: 0" sin "No hace falta tanque", selector de DN sin DN13,
  Rápido vs Profesional.
- `humanizarModulo4.test.ts` -- 6 (etiquetas, formateo sin falsa
  precisión, motivos, reutilización del catálogo de códigos).
- `actualizarParametrosDeConexion.test.ts` -- `conPresionSobreAcera` (sin
  clamp/rango, preserva el resto).

### Smoke de navegador (Playwright 1.63.0 transitorio, vite dev real)

**24/24 checks OK, consola 0 errores / 0 warnings.** El demo está en modo
**Rápido**, así que el smoke verifica esa vista (la Profesional la cubre
la suite Vitest). S1 no iniciado → elegir tanque; S2 Tc=2/DN19/Pacera=5/
Δz=0 → Evaluado, "Caudal de conexión: 0,60 L/s", adopción holgada → ✓
Suficiente; S3 Pacera=8/Δz=1,5 → Qconexión reactivo interpolado 0,69 L/s;
S4 Pacera=2 → Incompleto con "4–35 m", sin "inválido"; S5 cisterna →
adopción incompleta → tras cargar ambos volúmenes, 3 criterios + §2.11.3,
inferior por debajo del mínimo → ⚠ Insuficiente, ambos holgados → ✓
Suficiente; S6 directa → "no aplica", sin V=0, sin inputs de tanque; S7
round-trip directa→tanque→cisterna→tanque sin restos stale.
`git diff -- package.json package-lock.json` **vacío**.

### Verificación

`vitest` 1196/1196 (128 archivos; +20 tests, +2 archivos), `tsc -b`
verde, `npm run build` verde, `eslint .` 11 baseline / 0 nuevos, working
tree limpio, manifests de Playwright intactos.

### Qué NO se hizo

Integración `configuracionAbastecimiento` → origen efectivo de M2 y
retiro del selector efímero `tipoAlimentacion` del Panel de Presión (es
**M4-G**, con auditoría de regresión M2 propia: directa / tanqueElevado /
cisternaBombeoElevado, comprobando que `cisternaBombeoElevado` → M2
sigue empezando en el tanque elevado); auto-derivación geométrica del
desnivel; §2.8; geometría/bombas/presurizador; catálogo/sugerencia
comercial; selección automática de DN; PDF/reporting; sidebar; redesign.

### Decisiones rojas

Ninguna. `presionSobreAcera_m` no tenía editor (sin fuente duplicada al
exponerlo en M4); `resolverModoDeTrabajo` se usa igual que en el Panel de
M3 (sin acoplamiento nuevo); los updaters existentes representan la
edición vacía sin corrupción (`'ignorar'` / `undefined`); la presentación
de `directa` no requiere decidir §2.8 (se muestra "no aplica" + nota
neutra); ningún input exigió un criterio de dominio nuevo.

### Estado

**D-δ.67 -- CERRADA.** Panel de Módulo 4 operativo: no iniciado usable,
tres esquemas editables, Tc / DN / presión sobre acera / desnivel firmado
editables (una sola fuente para `presionSobreAcera_m`), presión de
cálculo y Qconexión visibles, RTD protagonista, capacidades adoptadas y
verificación §2.11.3, `directa` semánticamente correcta, incompletos
humanizados, Rápido/Profesional, reactividad verificada en navegador.
Baseline verde. Siguiente slice: **M4-G** -- integración
`configuracionAbastecimiento` → origen efectivo de M2.

## D-δ.68 -- M4-G: `configuracionAbastecimiento.esquema` como fuente única del origen hidráulico de M2 -- CERRADA

Incremento **funcional** de integración. Sin fórmulas nuevas, sin tocar
las primitivas hidráulicas de M2, sin cambiar el cálculo de M4.

### Arqueología del Panel de Presión (antes de editar)

El `PanelDePresionDeModulo2` tenía dos estados locales que elegían el
origen **independientemente** del resto del proyecto:

- `tipoAlimentacion: 'tanqueElevado' | 'presionConocida'` (radios, default
  `'presionConocida'`). Derivaba `presionDisponible_mca` (0 para tanque)
  y el `origenHidraulico` que consume M3-E
  (`resolverPerdidasDeMedidoresParaTerminal`).
- `presionDisponibleTexto` (input manual "Presión disponible
  (Pdisponible) [m.c.a.]"), sólo para `presionConocida`.

**Semántica de la presión directa (§8/§41):** verificada contra D-δ.38 —
*"la presión mínima garantizada sobre el nivel de vereda — exactamente lo
que representa el campo legado `ParametrosProyecto.presionSobreAcera_m`
[...] `Pdisponible_mca = presionSobreAcera_m`"* — y contra el propio
encabezado del panel (*"exactamente el contrato ya vigente"*). Es el
**CASO A**: misma magnitud física, misma frontera (cota ≈ 0 = acera).
**Sin decisión roja.**

Se **conservan** sin cambios: los inputs de cota de la raíz
(`conCotaDeNodo`) — "pelo de agua mínimo" para tanque, "cota del punto de
alimentación" para directa —, que son un dato **geométrico** sin
equivalente persistido en M4 (distinto de `desnivelConexion_m`, que es
sólo de Tabla N°1).

### Helper puro -- `resolverOrigenHidraulicoEfectivo` (`motor/modulo4/`)

```ts
resolverOrigenHidraulicoEfectivo(esquema): 'directa' | 'tanqueElevado'
  directa               -> 'directa'
  tanqueElevado         -> 'tanqueElevado'
  cisternaBombeoElevado -> 'tanqueElevado'   // cisterna y bomba aguas
                                             // arriba del almacenamiento;
                                             // NO es un tercer origen
```

Función total sobre `EsquemaDeAbastecimiento`. Un esquema no reconocido en
runtime (JSON corrupto) → `throw` controlado (lo detecta antes
`validarConfiguracionAbastecimiento` como `error`). No conoce presiones,
cotas, Tabla N°1, RTD ni bombas. **No vive dentro de las primitivas
hidráulicas de M2** (que siguen agnósticas de M4).

### `PanelDePresionDeModulo2` -- integración

- **Eliminados**: `type TipoDeAlimentacion`, los dos `useState`, la función
  local `parsearEntradaHidraulica`, los radios de tipo de alimentación y
  el input manual de Pdisponible. **Sin fallback oculto.**
- **Derivado** de `proyecto.configuracionAbastecimiento?.esquema`:
  - `origenEfectivo` (vía el helper; `undefined` si el esquema falta o es
    inválido — se filtra con `ESQUEMAS_DE_ABASTECIMIENTO` antes de llamar
    al helper, para no lanzar).
  - `presionDisponible_mca` = `0` (tanque) / `parametros.presionSobreAcera_m`
    (directa) / `undefined` (sin esquema). **`presionSobreAcera_m` se usa
    TAL CUAL — nunca `− desnivelConexion_m`** (ese desnivel es sólo de
    Tabla N°1; M2 calcula su propio Δz de camino).
  - `origenHidraulico` para M3-E = `'tanqueElevado'` / `'alimentacionDirecta'`
    / `undefined`.
- **Presentación**: sin esquema → *"Configurá el esquema de abastecimiento
  en el Módulo 4 para verificar la presión."* (el resto de M2 —
  dimensionamiento, topología, pérdidas — **sigue calculándose**: la
  primitiva `resolverEstadoModulo2` recibe `presionDisponible_mca =
  undefined`, empuja el motivo `presionDisponibleNoProvista` y clasifica
  sólo la verificación de presión como `'incompleto'`, exactamente como
  antes cuando faltaba el Pdisponible manual). Con esquema → línea
  *"Origen hidráulico: Tanque elevado | Alimentación directa — derivado
  del esquema de abastecimiento del Módulo 4"* (+ nota "cisterna y bombeo
  aguas arriba" para `cisternaBombeoElevado`); en directa, la presión
  sobre acera se muestra **read-only** ("se edita en el Módulo 4").
- `agruparMotivosDeModulo2`: el texto de `presionDisponibleNoProvista`
  pasó de *"Falta indicar el tipo de alimentación y sus datos."* a
  *"Falta configurar el esquema de abastecimiento en el Módulo 4."*

**No se creó `updater` de origen** — es derivado; se cambia editando el
esquema en el Panel de Módulo 4 (`conEsquemaDeAbastecimiento`). **No** se
tocó M2 core, M4 cálculo, `resolverModoDeTrabajo`, el orden de la
one-page, ni §2.8.

### M3-E (medidor general por origen) -- sin cambio de reglas

El origen que consume `resolverPerdidasDeMedidoresParaTerminal` ahora
viene del esquema global. Reglas intactas: `directa` → el medidor general
**entra** al camino; `tanqueElevado` y `cisternaBombeoElevado` → **no
entra** (aguas arriba del almacenamiento). Individuales, sin cambio.

### Tests (12 nuevos → 1208/1208, 130 archivos)

- `motor/modulo4/resolverOrigenHidraulico.test.ts` (5): mapeo 3→2,
  `tanqueElevado ≡ cisternaBombeoElevado`, esquema desconocido → throw.
- `motor/modulo4/integracionOrigenM2.test.ts` (7) — **regresión numérica**:
  - **G3**: `resolverPresionResidualDeCamino` para `tanqueElevado` y
    `cisternaBombeoElevado` es **byte-idéntico** (`toEqual`), y
    `presionSobreAcera_m` no influye en los esquemas con tanque.
  - **G4/G25**: `directa` usa `presionSobreAcera_m` como Pdisponible; +5 m
    de acera → +5,000 m de presión residual (`balanceCompleto`).
  - **G26 (anti-atajo)**: `directa` con esquema ≡ pasar `presionSobreAcera_m`
    TAL CUAL a la primitiva (nunca menos un desnivel).
  - **G6/G7/G8**: medidor general en el camino sólo en `directa`;
    `cisternaBombeoElevado` idéntico a `tanqueElevado`.
  - **G20**: cambiar el `hf` del medidor general mueve el resultado en
    `directa` pero **no** en los esquemas con tanque.
- `interfaz/paginas/PanelDePresionDeModulo2.test.ts` reescrito (8 SSR):
  sin selector local ni input de Pdisponible; orienta al Módulo 4; origen
  derivado por esquema (directa → "Alimentación directa" + presión sobre
  acera read-only + cota del punto de alimentación; tanque → "Tanque
  elevado" + pelo de agua mínimo; cisterna → mismo origen + nota); motivo
  de incompletitud apunta al Módulo 4.
- `agruparMotivosDeModulo2.test.ts`: nuevo texto.

Suites de M2 históricas (D-δ.47..D-δ.52, D-δ.60) verdes sin cambios:
dimensionamiento, DN manual, topología, pérdidas, terminal crítico
intactos — las primitivas de M2 no se tocaron.

### Auditoría de dependencias

`grep` de imports desde `motor/modulo4` / `tabla-01` / `reserva` dentro de
`motor/tuberias/**`: **ninguno**. `resolverOrigenHidraulicoEfectivo`
importa sólo el tipo `EsquemaDeAbastecimiento` de `modelo/proyecto`. Sin
dependencia circular; las primitivas hidráulicas siguen sin conocer M4.

### Smoke de navegador (Playwright 1.63.0 transitorio, vite dev real)

**20/20 checks OK, consola 0 errores / 0 warnings.** Demo sin M4 → el
Panel de Presión no tiene selector local ni input de Pdisponible, orienta
al Módulo 4 y el resto de M2 sigue visible; elegir `directa` → M2 muestra
"Alimentación directa" + presión sobre acera read-only + "Cota del punto
de alimentación"; `tanqueElevado` → "Tanque elevado" + "Pelo de agua
mínimo"; `cisternaBombeoElevado` → mismo origen efectivo + nota de
cisterna/bombeo aguas arriba; round-trip directa↔tanque↔cisterna sin
stale ni reaparición del selector. `git diff -- package.json
package-lock.json` **vacío**.

### Verificación

`vitest` 1208/1208 (130 archivos; +12 tests, +2 archivos), `tsc -b`
verde, `npm run build` verde, `eslint .` 11 baseline / 0 nuevos, working
tree limpio.

### Decisiones rojas

Ninguna. `presionSobreAcera_m` es inequívocamente la misma magnitud que
el `Pdisponible` directo del panel (D-δ.38 lo dice verbatim); M2 no tiene
otra frontera directa interna; el mapeo 3→2 cubre todos los esquemas
soportados; retirar el selector no obligó a persistir geometría nueva
(las cotas de raíz ya se persistían en `Nodo.cota_m`); la integración no
metió M4 en primitivas hidráulicas; no hay esquema sectorizado modelado.

### Estado

**D-δ.68 -- CERRADA.** `configuracionAbastecimiento.esquema` es la fuente
única del origen hidráulico de M2 (mapeo puro 3→2, selector local
retirado sin fallback, esquema ausente/corrupto manejado como
`'incompleto'` sin degradar el resto de M2, M4 incompleto no impide
derivar el origen). Regresión numérica de M2 verde (directa y tanque
byte-idénticos al histórico; cisterna ≡ tanque). Sin acoplamiento a
primitivas hidráulicas. Baseline verde, smoke 20/20. Siguiente slice:
**M4-H** -- auditoría end-to-end y cierre de M4.

## D-δ.69 -- M4-H: auditoría end-to-end de Módulo 4 y cierre funcional -- CERRADA

Auditoría sistemática de todo lo entregado en M4-A → M4-G, sin agregar
funcionalidad futura. Objetivo: declarar M4 funcionalmente cerrado o
registrar con precisión qué falta. **Resultado: MÓDULO 4 CERRADO. Un (1)
bug de UX corregido, sin cambios de dominio.**

### Baseline de entrada (verificado contra el repo real)

`main` @ `956ac7b`, working tree limpio. `npx vitest run`: 1208/1208 en
130 archivos. `npx tsc -b`, `npm run build`, `npx eslint .`: verdes (11
problemas de lint baseline preexistentes, 0 warnings nuevos). Playwright
1.63.0 transitorio en `node_modules` con navegadores en caché.

### Contratos de dominio auditados y evidencia

- **CRIT-A35 -- Reserva Total Diaria de Diseño** (`motor/reserva/calcularReservaDiaria`):
  `deficit_lps = max(0, qc − qConexion)`, `deficit_m3h = deficit_lps·3,6`,
  `VRTD = deficit_m3h·Tc` con `1 ≤ Tc ≤ 4 h`. `Tc` es el período de
  consumo máximo (no tiempo de llenado, no población, no dotación, no
  `Qc·24 h`). Sin redondeo intermedio: opera con el `Qc` real de M1.
  `Qconexión ≥ Qc ⇒ VRTD = 0`, resultado determinado (no error, no
  "tanque no necesario"). `Tc` fuera de `[1, 4]` → `throw` (error de
  programación). Goldens G3/G4 reconstruyen las Tablas N°3/N°4 oficiales
  sin redondear `Qc` (0,7712 m³ y 2,8188 m³, no 0,79 / 3).
- **CRIT-A36 -- Tabla N°1** (`normativa/eras-2023/tabla-01-gastos-conexion`):
  DN es clave discreta (8 columnas 13..75 mm), nunca se interpola entre
  diámetros. Presión de cálculo interpolable linealmente sólo entre
  alturas consecutivas. Fuera de `[4, 35]` m → `fueraDeRangoDePresion`
  (sin clamp, sin extrapolación, sin 0 artificial). DN13 válido para el
  resolver genérico, **no** admisible como conexión
  (`esDiametroAdmisibleComoConexion` exige `≥ 0,019 m`). Goldens G5/G6:
  DN19 @ 5 m → 0,60 L/s; DN25 @ 5 m → 1,18 L/s. Interpolación no trivial
  (T4/T4b + E end-to-end): DN19 @ 6,5 m → 0,69 L/s (entre filas 6 y 7).
- **CRIT-A37 -- Presión de cálculo de conexión** (`motor/modulo4/resolverPresionDeCalculoDeConexion`):
  `Pcalc = Pacera − ΔzConexión` con `Δz` firmado (`> 0` por encima de
  acera → resta; `< 0` por debajo → suma). Sin clamp, sin redondeo.
  `desnivelConexion_m` es dato físico DECLARADO -- **no** se auto-deriva
  de M2, **no** se sustituye por `peloAguaMinimo`. Test de descenso
  (`Δz = −2` → `Pcalc` sube → `Qconexión` sube → `VRTD` baja/igual) y de
  ascenso (interpolación con `Δz = +1,5`) end-to-end.
- **CRIT-A38 -- Reserva requerida vs adoptada** (`motor/modulo4/resolverAdopcionDeReserva`):
  tanque elevado único → `Vadoptado ≥ VRTD`. Cisterna+bombeo+elevado →
  **tres** verificaciones independientes (`VTB ≥ VRTD/3`, `VTR ≥ VRTD/3`,
  `VTB + VTR ≥ VRTD`); `suficiente ⇔ las tres`. No se exige suma exacta
  ni reparto fijo 1/3 + 2/3; sobredimensionamiento permitido. Caso F del
  brief (`VRTD = 3`, `VTB = 1`, `VTR = 3`) → suficiente (protege contra
  verificar porcentajes del total adoptado). Comparaciones exactas `≥`,
  sin tolerancia.
- **`EstadoModulo4`** (`motor/modulo4/resolverEstadoModulo4`): precedencia
  `noIniciado` (sin `configuracionAbastecimiento`) → `error` (esquema
  corrupto, `Tc` fuera de rango persistido, DN no admisible persistido,
  desnivel no finito persistido) → `incompleto` (config válida pero falta
  `Tc` / `Qc` global / DN / desnivel / presión dentro de Tabla N°1;
  `directa` nunca cae acá) → `evaluado`. `evaluado` ≠ capacidad
  suficiente ≠ cumplimiento normativo global; la falta de volumen
  adoptado **no** degrada `evaluado` (mismo patrón que M3). `directa` →
  `evaluado` + `sinReservaPorTanque` (no se fabrica `VRTD = 0`).
  `Qconexión ≥ Qc` con tanque → `reservaCalculada` + `VRTD = 0`,
  semánticamente distinto de `sinReservaPorTanque` (tipos, UI y tests lo
  separan).
- **Datos físicos de conexión** (`validacion/parametrosConexion`): DN y
  desnivel optativos, sin default; su ausencia no es problema de
  validación. `presionSobreAcera_m` no se valida por rango -- el `[4, 35]`
  m es de la presión de cálculo de Tabla N°1, no de la presión de acera
  (el demo usa 2 m y el Proyecto sigue estructuralmente válido).

### Integración auditada

- **M1 → M4**: `resolverEstadoModulo4` compone `calcularSimultaneidad`
  (mismo pipeline real que `resolverEstadoModulo3`), toma `Qc` exacto, no
  copia la fórmula de simultaneidad, no usa `Qc` redondeado ni el `Qunit`
  individual de M3. Goldens G3/G4 lo verifican con `toBeCloseTo(…, 9)`.
- **M4 → M2 (origen)**: `resolverOrigenHidraulicoEfectivo` (puro, total,
  `directa`→`directa`; `tanqueElevado` y `cisternaBombeoElevado`
  →`tanqueElevado`) es la fuente única. `PanelDePresionDeModulo2` deriva
  `presionDisponible_mca` (`0` para tanque; `presionSobreAcera_m` **tal
  cual** para `directa`, sin restarle `desnivelConexion_m`; `undefined`
  sin esquema) y el origen de M3 del mismo esquema. Test anti-atajo G26:
  `Pacera = 20`, `Δz = 5` → M2 usa 20, no 15.
- **M3 por origen**: medidor general entra al camino sólo en `directa`;
  en `tanqueElevado` / `cisternaBombeoElevado` queda aguas arriba del
  almacenamiento. G20: cambiar el `hf` del general mueve el margen en
  `directa`, no en los esquemas con tanque.
- **M4 incompleto pero origen conocido**: `tanqueElevado` sin DN → M4
  `incompleto`, pero M2 sigue sabiendo que el origen es tanque (no se
  acopla `EstadoModulo4 evaluado` con "origen disponible").
- **Sin acoplamiento indebido**: `grep` de imports desde `motor/modulo4`
  / `tabla-01` / `reserva` dentro de `motor/tuberias/**` y
  `motor/modulo2/**`: **ninguno**. Primitivas hidráulicas de M2 sin
  tocar; sin dependencia circular.

### Regresión histórica ejecutada explícitamente

`vitest run src/motor/tuberias src/motor/modulo2 …`: 65 archivos, 561
tests verdes -- DN manual, Hazen/Darcy, localizadas, tees, reducciones,
verticales, cotas, duplicación, CRIT-A15, terminal crítico intactos. No
se confió sólo en el total global. Subconjunto M4:
`motor/modulo4` + `motor/reserva` + `tabla-01` + `validacion/configuracionAbastecimiento`
+ `validacion/parametrosConexion` + paneles M4/M2 = 16 archivos, 174
tests (post-fix: 175).

### Smoke de navegador (Playwright 1.63.0 transitorio, vite dev real)

**37/37 checks OK, consola 0 errores / 0 warnings.** `git diff --
package.json package-lock.json` **vacío**. Cubre: S1 no iniciado →
elegir esquema (+ M2 orienta a M4); S2 `directa` → editar `Pacera` en M4
mueve la presión disponible de M2; S3 tanque completo (DN19 @ 5 m →
`Qconexión` 0,60 L/s, `Evaluado`, RTD por déficit > 0, adopción amplia
suficiente / mínima insuficiente); S4 interpolación `Pcalc` 6,50 m
(Profesional muestra "interpolado entre 6 y 7 m", `Qconexión` 0,69 L/s);
S5 fuera de tabla (`Pacera = 2` → `Incompleto`, mensaje "4-35 m", no
"proyecto inválido", corrige → vuelve a `Evaluado`); S6 cisterna
insuficiente por mínimo del inferior → suficiente al corregirlo, nunca
"cumple norma"; S7 cisterna y tanque dan el mismo origen M2; S9 `Tc`
1→4 escala ×4 exacto y una capacidad fija pasa de suficiente a
insuficiente; S10 round-trip de esquemas sin stale (`directa` descarta
`Tc` por diseño D-δ.63 §7/§23 → al volver a tanque pide `Tc` de nuevo,
nunca muestra la RTD vieja; reingresar `Tc` reconstruye el cálculo);
S11 Rápido/Profesional (misma matemática, Profesional agrega la traza
`Pacera → Δz → Pcalc → DN → Qconexión`); S12 cero stale compuesto.

### Bug encontrado / corregido

**1 bug de UX** (commit funcional aparte, previo a esta entrada):
`presionSobreAcera_m` no tenía editor en el esquema `directa`. El input
sólo se montaba dentro de `ConfiguracionDeConexionYReserva`, que se
renderiza únicamente para esquemas con tanque. En `directa` -- el
esquema en el que ese valor **es** la presión disponible de la raíz del
balance de M2 (D-δ.68) -- quedaba sin editor en toda la aplicación,
mientras el Panel de Presión de M2 lo mostraba de sólo lectura con el
texto "se edita en el Módulo 4". El M4-F (D-δ.67) había registrado en el
ROADMAP que agregaba "el único editor" de ese campo, sin notar que
faltaba la rama `directa`. Corrección: se extrajo
`EntradaPresionSobreAcera` y se reutiliza en ambas ramas (con tanque y
`sinReservaPorTanque`). Sin cambios de dominio, fórmula ni arquitectura.
Test SSR nuevo. Suite 1208 → 1209.

### Matriz función → contrato → evidencia → estado

| Función | Contrato | Evidencia | Estado |
|---|---|---|---|
| `Qc` de M1 | CRIT-A5, exacto, sin redondear | goldens G3/G4 end-to-end (`toBeCloseTo …, 9`) | OK |
| `Pcalc` de conexión | CRIT-A37 (`Pacera − Δz` firmado, sin clamp) | `resolverPresionDeCalculoDeConexion.test` + descenso/ascenso E2E | OK |
| Tabla N°1 | CRIT-A36 (DN discreto, `[4,35]` m, sin extrapolar) | `tabla-01` 30 tests + goldens G5/G6 | OK |
| Interpolación | lineal sólo en presión, con metadata | T4/T4b + "interpolación end-to-end (Pcalc no entero)" + smoke S4 | OK |
| DN admisible | `≥ 0,019 m`, DN13 fuera, sin default | `esDiametroAdmisibleComoConexion` + E "DN13 persistido → error" | OK |
| `Qconexión` | Tabla N°1 según DN + `Pcalc` | traza `TrazaDeConexionModulo4` + smoke S3/S4 | OK |
| `Tc` | `1..4 h`, período de consumo máximo, sin clamp | `calcularReservaDiaria.test` + reactividad E "suficiente↔insuficiente al cambiar Tc" + smoke S9 | OK |
| RTD | CRIT-A35 (`deficit·3,6·Tc`, sin redondeo) | goldens G3/G4 + `calcularReservaDiaria.golden` | OK |
| `directa` | `evaluado` + `sinReservaPorTanque`, sin `VRTD=0` | E2 + "directa: sigue sinReservaPorTanque" + smoke S2/S10 | OK |
| Tanque elevado | adopción única, `Vadoptado ≥ VRTD` | `resolverAdopcionDeReserva` `verificada` + E "suficiente con diferencia" | OK |
| Cisterna+bombeo | 3 verificaciones §2.11.3 independientes | `verificadaDistribuida` casos A..F + smoke S6 | OK |
| `VRTD = 0` | `reservaCalculada`, ≠ `sinReservaPorTanque` | E9 "Qconexión ≥ Qc → V=0 (NO sinReservaPorTanque)" | OK |
| `EstadoModulo4` | `noIniciado`/`error`/`incompleto`/`evaluado`, precedencia | `resolverEstadoModulo4.test` (E1..E10 + 15 casos de estado) | OK |
| Backward compat | Proyecto pre-M4 válido, M4 `noIniciado`, M2 sigue | `validarProyecto` + `PanelDePresionDeModulo2` "configurá M4" | OK |
| UI | inputs reales editables, traza, Rápido/Profesional, `directa` prudente | `PanelDeModulo4.test` (15 SSR) + smoke 37/37 | OK (tras fix) |
| Origen M2 | `resolverOrigenHidraulicoEfectivo` fuente única | `integracionOrigenM2.test` G3..G8/G20/G25/G26 | OK |
| M3 por origen | general entra sólo en `directa` | G20 + smoke S7 | OK |
| Reactividad | sin refresh, sin resultados cacheados | reactividad en `resolverEstadoModulo4.test` + smoke S9/S10/S12 | OK |

### Suites históricas de M4 (enumeradas, no sólo el total)

`calcularReservaDiaria.test` (CRIT-A35), `calcularReservaDiaria.golden.test`,
`resolverGastoTabla01` en `tabla-01-gastos-conexion/index.test` (CRIT-A36
+ G5/G6), `resolverPresionDeCalculoDeConexion.test` (CRIT-A37),
`resolverAdopcionDeReserva.test` (CRIT-A38), `resolverEstadoModulo4.test`
+ `.golden.test` (G3/G4), `resolverOrigenHidraulico.test`,
`integracionOrigenM2.test`, `PanelDeModulo4.test`, `humanizarModulo4.test`,
`actualizarConfiguracionAbastecimiento.test`,
`actualizarParametrosDeConexion.test`,
`configuracionAbastecimiento/index.test`, `parametrosConexion/index.test`,
`PanelDePresionDeModulo2.test`. Todas verdes.

### Impresión / PDF (chequeo no invasivo)

La memoria PDF (`exportadores/pdf/generarDocumentoPdf`, pdfMake) es
programática y hoy sólo cubre Módulo 1. M4 no la tocó (no lee el DOM). No
se agrega M4 al PDF ahora. Deuda de reporting transversal M1-M4
registrada, sin rediseño.

### Deudas registradas (no bloquean el cierre de M4)

- **Auto-derivación geométrica del desnivel de conexión por esquema** --
  `desnivelConexion_m` sigue siendo un dato declarado; no hay botón ni
  heurística oculta que lo derive de la cota de M2, el `peloAguaMinimo`
  ni el nivel de la UF. Mejora futura.
- **§2.8 -- obligatoriedad de reserva independiente del déficit** -- la
  UI de `directa` mantiene copy prudente ("la obligatoriedad normativa de
  disponer reserva se evalúa por separado"); no se implementa la
  obligatoriedad automática.
- **División en secciones iguales de tanques ≥ 4.000 L (§2.11)** -- la
  capacidad agregada sigue siendo el alcance; regla de secciones no
  implementada.
- **Geometría / cota del tanque, bombas, potencia, tiempo de llenado,
  volumen útil geométrico, flotantes, presurizadores** -- fuera de
  alcance de M4.
- **Catálogo comercial de tanques / sugerencia de capacidad adoptada** --
  no se enuncia regla general de redondeo comercial.
- **Reporting visual M1-M4 en la memoria PDF** -- ver arriba.
- **Infra persistente de Playwright** -- no se agrega al repo.

### Decisiones rojas

Ninguna. La única corrección tocó UI (montar un input existente en una
rama donde faltaba); no cambió fórmulas, semántica normativa, el modelo
de dominio ni fronteras físicas.

### Estado

**D-δ.69 -- CERRADA. M4-H CERRADO. MÓDULO 4 (Reserva / Tanques) CERRADO**
para el alcance actual:

- **Dominio**: RTD (CRIT-A35), `Tc`, Tabla N°1 + interpolación (CRIT-A36),
  `Pcalc` (CRIT-A37), DN de conexión, adopción y distribución §2.11.3
  (CRIT-A38) -- todos verificados con goldens oficiales sin redondeo.
- **Modelo**: `configuracionAbastecimiento?` y datos físicos de conexión
  persistidos, sin default oculto, backward-compatible; resultados
  derivados, nunca persistidos.
- **Estado**: `noIniciado` / `error` / `incompleto` / `evaluado` con
  precedencia; `directa` ≠ `VRTD = 0`; `evaluado` ≠ suficiente ≠
  cumplimiento global.
- **UI**: todos los inputs reales editables (incluida `presionSobreAcera_m`
  en `directa`, corregido en M4-H), traza completa en Profesional,
  `directa` prudente, incompletos claros.
- **Integración**: M1→M4 (`Qc` real), M4→M2 (origen, fuente única),
  M3→M2 según origen, sin acoplamiento de M4 en primitivas hidráulicas.
- **Calidad**: suite 1209/1209 (130 archivos), `tsc -b` / `build` verdes,
  `eslint` 11 baseline / 0 nuevos, smoke de navegador 37/37 con consola
  limpia, manifests intactos, working tree limpio.

Las deudas listadas arriba (auto-desnivel, §2.8 automático, secciones
≥ 4.000 L, geometría, bombas, catálogo, reporting) **no** bloquean el
cierre. No se inicia ningún trabajo posterior a M4.

## D-δ.70 -- Auditoría integral M1–M4 pre-rediseño: baseline funcional transversal -- CERRADA

Auditoría transversal de todo el producto (M1 → M2 → M3 → M4) antes de una
pasada de UX/UI. **No** audita fórmulas por módulo (ya cubierto por
CRIT-A* y D-δ.59/60/69): audita que **un Proyecto real atraviesa los
cuatro módulos de forma coherente, reactiva y sin contaminación cruzada**,
y fija un baseline reproducible + los contratos que el rediseño no puede
tocar. **Resultado: CORE FUNCIONAL M1–M4 CONGELADO PARA REDISEÑO. Sin
bugs.**

### Baseline de entrada

`main` @ `0a4c38b`, working tree limpio. `vitest` 1209/1209 (130
archivos), `tsc -b` / `npm run build` verdes, `eslint` 11 baseline / 0
warnings, smoke M4-H previo 37/37.

### Entregables

- **`BASELINE-FUNCIONAL-M1-M4.md`** (nuevo, raíz del repo): snapshot
  numérico del Proyecto canónico, matriz de sensibilidad, matriz de
  persistencia (persistido vs derivado vs estado local de React),
  fronteras entre módulos, contratos congelados, superficies rediseñables,
  deudas y conclusión.
- **`src/interfaz/paginas/proyectoDeEjemplo.ts`** (nuevo): se extrajo el
  `proyectoInicial` (la instalación de ejemplo que ve el usuario) desde
  `MotorDemandaPantalla.tsx` a su propio módulo **sin cambios de
  contenido** (objeto byte-idéntico verificado por `diff`), para poder
  compartirlo como fixture con los tests sin arrastrar el árbol de React
  ni romper `react-refresh/only-export-components`.
- **`src/auditoriaTransversalM1M4.baseline.test.ts`** (nuevo, 12 casos):
  evidencia ejecutable del documento. Replica el **mismo cableado que la
  UI** (`resolverOrigenHidraulicoEfectivo` → Pdisponible /
  `origenHidraulico`; `resolverPerdidasDeMedidoresParaTerminal` por
  terminal; `resolverEstadoModulo2/3/4`) sobre el Proyecto canónico y
  verifica la matriz de sensibilidad y de no contaminación.

### Snapshot del Proyecto canónico (todo DERIVADO, nada persistido)

Fixture `proyectoInicial` + updaters reales: cota de raíz 20 m, override
de DN comercial `32 mm` en `t-general`, M3 PH + ACS individual, M4
`tanqueElevado` / Tc 2 h / DN 19 / Pacera 5 m / Δz 0 / adoptado 5 m³.

| Módulo | Magnitud | Valor |
|---|---|---|
| M1 | Qc global | 0,7273238618 l/s |
| M2 | estado / origen / Pdisp | `completo` / `tanqueElevado` / 0 m.c.a. |
| M2 | margen del crítico | ≈ +3,836 m.c.a. → CUMPLE |
| M3 | medidor general DN rec/adopt · hf | 25 / 25 mm · ≈ 1,399 m.c.a. |
| M3 | medidores individuales | 1 |
| M4 | Pcalc · Qconexión · VRTD · adopción | 5 m · 0,60 l/s · ≈ 0,9167 m³ · `suficiente` |

### Matriz de sensibilidad / no contaminación (verificada)

| Cambio | M1 | M2 | M3 | M4 |
|---|:-:|:-:|:-:|:-:|
| cantidad / tipo de artefacto | ✓ | ✓ | ✓ (DN ≥) | ✓ |
| DN comercial manual de Tramo (M2) | — | ✓ | — | — |
| DN de conexión (M4) | — | — | — | ✓ |
| Tc (M4) | — | — | — | ✓ (×Tc exacto) |
| Pacera | — | ✓ **sólo `directa`** | — | ✓ |
| desnivel de conexión (M4) | — | — | — | ✓ |
| volumen adoptado (M4) | — | — | — | ✓ (sólo adopción) |
| medidor general ↑/↓ (M3) | — | ✓ **sólo `directa`** | ✓ | — |
| esquema de abastecimiento | — | ✓ (origen) | ✓ (aplicabilidad general→M2) | ✓ |

Anti-contaminación con `toEqual` / `toBeCloseTo(…, 9)`: DN comercial de M2
no toca Qc/M3/M4; DN de conexión de M4 no toca Qc/M3/margen de M2; Tc
escala VRTD ×2 exacto sin tocar Qc/M3/M2; subir el medidor general en
esquema con tanque deja Qc y VRTD byte-idénticos; `cisternaBombeoElevado`
≡ `tanqueElevado` en balance terminal y origen de M2.

### Fronteras

Ningún `resolverEstadoModuloX` importa a otro (0 imports cruzados entre
`motor/modulo2|3|4`, `motor/demanda`, `motor/reserva`, `motor/medidores`).
El cableado M3→M2 y M4→M2 vive en `interfaz/paginas/PanelDePresionDeModulo2.tsx`,
no en `motor/`. `motor/tuberias/**` y `motor/modulo2/**` no importan
`motor/modulo4` / `tabla-01` / `motor/reserva`. Producción sin imports de
`interfaz/` en `motor/` (un único test los tiene, para una constante
normativa -- deuda menor registrada).

### Estado local de React y factibilidad del rediseño

Toda la aplicación tiene **dos** `useState`: `Proyecto` (fuente única de
verdad) en `MotorDemandaPantalla` y un modal transitorio de declaración de
artefacto. Los paneles de M1/M2/M3/M4 y subcomponentes tienen **cero**
`useState` / `useEffect` / `useRef` / `useMemo`: son funciones puras de
`(proyecto, catálogos)` + `onCambiar`. **Ningún dato editable vive en
estado local de un panel** -> una sidebar que oculte/reordene/remonte
secciones no puede perder decisiones del usuario. Sidebar como
índice/scroll con todos los módulos montados: viable. Sticky summary
global (4 `EstadoModuloX` + crítico + RTD): viable sin cálculos nuevos.
Pdisponible / hfMedidor manuales ya no existen (D-δ.68): se derivan.

### Fuentes únicas de verdad (confirmadas)

Qc (M1) · DN de tubería adoptado (`redHidraulica.tramos[].dnComercialAdoptado`)
· hfMedidor (derivado de `configuracionMedidores` vía M3) · esquema de
abastecimiento (`configuracionAbastecimiento.esquema`) · `presionSobreAcera_m`
(única propiedad; editable en M4 para todos los esquemas desde M4-H) ·
Qconexión / VRTD / estado de suficiencia / origen de M2 (todos derivados).
No hay un segundo input local para ninguno.

### Bugs

Ninguno. El único cambio de código es la extracción de `proyectoInicial`
a su módulo (refactor sin comportamiento, objeto byte-idéntico) para
poder compartirlo como fixture. No se tocó dominio.

### Deudas nuevas registradas (no bloquean)

- `parametros.alturaArtefactoMasDesfavorable_m`: campo **requerido** en el
  modelo, **sin consumidor** en `motor/` (residuo previo al modelo de
  cota por terminal). Candidato a eliminar en el rediseño del modelo.
- `calcularCotaHidraulicaDefaultDeNivel` (constante normativa) vive en
  `interfaz/paginas/` y la importa un test de `motor/`. Mover a
  `normativa/`.

(El resto de deudas -- reporting M2–M4, panel M3 `incompleto`, poda de
overrides huérfanos, deudas normativas de M4-H -- ya estaban registradas.)

### Decisiones rojas

Ninguna.

### Verificación

`vitest` 1221/1221 (131 archivos; +12 tests, +1 archivo), `tsc -b` verde,
`npm run build` verde, `eslint .` 11 baseline / 0 nuevos / 0 warnings.
Smoke de navegador transversal (Playwright transitorio, vite dev real):
26/26 checks -- escenario A (snapshot coherente), cascada §35 (cambiar
demanda mueve M1/M2/M3/M4 y restaurar vuelve al valor exacto), escenario B
(`directa`: Pacera = Pdisponible de M2; round-trip descarta Tc por diseño
y lo pide de nuevo), escenario C (`cisternaBombeoElevado` = mismo origen y
margen que `tanqueElevado`), §37 (subir el medidor general no cambia Qc de
M1 ni VRTD de M4). Consola 0 errores / 0 warnings. `git diff --
package.json package-lock.json` vacío. Dev server detenido.

### Estado

**D-δ.70 -- CERRADA. CORE FUNCIONAL M1–M4 CONGELADO PARA REDISEÑO.**

M1 CERRADO · M2 CERRADO + VERIFICADO · M3 CERRADO + VERIFICADO · M4
CERRADO + VERIFICADO. El sistema completo atraviesa M1→M4 de forma
coherente, reactiva, auditable y sin contradicciones entre módulos, con
baseline reproducible (`BASELINE-FUNCIONAL-M1-M4.md` +
`auditoriaTransversalM1M4.baseline.test.ts`). Los contratos del §7 de ese
documento (tipos de dominio, orquestadores `resolverEstadoModuloX`,
motores puros, mapeos, updaters puros, CRIT firmes, reglas de "no
fabricar") quedan congelados: el rediseño de UI puede envolverlos, no
reescribirlos, salvo bug inequívoco o decisión roja explícita. **No se
inicia UI-01.**

## D-δ.71 -- Litros como unidad principal de la UI de Módulo 4 + auditoría del patrón "Iniciar Módulo 3" -- CERRADA

Dos ajustes de EXPERIENCIA sobre el core M1–M4 congelado (D-δ.70). Sin
fórmulas nuevas, sin cambios de dominio, sin tocar `Proyecto`, CRIT ni
goldens.

### A. Módulo 4 en litros (cambio funcional de UI)

**Motivación**: el proyectista trabaja las reservas y capacidades de
tanque en litros; m³ con 3 decimales ("0,771 m³") es incómodo para el
uso real.

**Regla**: el core sigue enteramente en m³. `1 m³ = 1000 L`. La
conversión vive en el borde de la UI (`humanizarModulo4.ts` +
`PanelDeModulo4.tsx`) y **no** se persiste en litros. No se introduce
redondeo de cálculo -- el formateo de litros es sólo visual.

- `humanizarModulo4.ts`: `LITROS_POR_M3`, `litrosDesde_m3`,
  `m3DesdeLitros` (conversión pura); `formatearVolumen_L(m3)` (es-AR,
  hasta 3 decimales de litro, sin ceros de relleno -> "1493 L" para un
  entero, "771,169 L" cuando el cálculo tiene decimales; sin separador de
  miles porque "1.000 L" se confunde con "1 L" y los volúmenes
  domésticos no lo necesitan); `litrosParaInput(m3)` limpia el ruido
  IEEE-754 del `value` del `<input>`. Se elimina `volumenEnLitros`
  (redondeaba a litros enteros), reemplazado por `formatearVolumen_L`.
- `PanelDeModulo4.tsx`: "Reserva requerida", RTD, "por déficit: 0 L", y
  la tabla de adopción (`verificada` y `verificadaDistribuida`:
  requerida, volumen adoptado, diferencia, mínimo por tanque 1/3, total
  adoptado) pasan a litros. En modo Profesional se agrega el equivalente
  en m³ entre paréntesis junto a la reserva requerida. Los inputs de
  capacidad adoptada quedan rotulados `[L]`, con `value` en litros y un
  `onChange` que parsea litros y persiste `litros / 1000` mediante el
  updater existente en m³ (`conVolumenTanque{Elevado,Bombeo}Adoptado`);
  `''` -> `undefined` (limpia el valor), `0` L -> `0` m³.

**Regresión obligatoria** (test SSR en `PanelDeModulo4.test.ts` +
unit en `humanizarModulo4.test.ts`): un core con
`volumenTanqueElevadoAdoptado_m3 = 1` se muestra y edita como `1000 L`
(el `<input>` trae `value="1000"`, nunca `"1"`); `1000` L ingresados por
el usuario persisten `1` m³; nunca se interpreta `1000 L` como
`1000 m³`. Verificado también en navegador (smoke 16/16, consola limpia):
la diferencia contra una reserva requerida de ~917 L da +83 L, no
+999083 L.

Suite 1221 -> 1225. `auditoriaTransversalM1M4.baseline.test.ts` 12/12 sin
cambios (no toca la capa de presentación de M4). `tsc` / `build` /
`eslint` sin regresión.

### B. Patrón "Iniciar Módulo 3" -- auditado y CONSERVADO sin cambios

**Qué persiste al pulsar "Iniciar Módulo 3"**: exactamente
`CONFIGURACION_MEDIDORES_INICIAL = { esPropiedadHorizontal: false,
tipoProvisionACS: 'individual' }` -- nada derivado. `conModulo3Iniciado`
es idempotente (no pisa una configuración existente).

**¿Se introduce un default?**: sí, dos valores, pero materializados por
una acción explícita del usuario, no en silencio: antes de pulsar el
botón `configuracionMedidores` es genuinamente `undefined` y
`EstadoModulo3` es `noIniciado`. `esPropiedadHorizontal: false` es una
decisión válida y explícita (D-δ.55: "NO es 'no iniciado'"), lleva a
`evaluado` con sólo el medidor general. `tipoProvisionACS: 'individual'`
es inerte mientras PH esté en `false` (no hay medidores individuales);
sólo pasa a ser consecuente si el usuario activa PH. No es un bug, es
consistente con el `?? CONFIGURACION_MEDIDORES_INICIAL` que usan los
demás updaters como base.

**¿El usuario entra en decisiones reales de M3 de inmediato?**: sí. Tras
"Iniciar" se computa y muestra el medidor general (Tabla N°6 desde el Qc
real) y aparece el checkbox de propiedad horizontal -- la primera
decisión real -- más, si se activa, el selector de provisión de ACS y
los overrides por UF. No es una pantalla vacía.

**¿Hay una razón de UX concreta para cambiarlo?**: no, y hay una razón
positiva para **conservarlo**. La primera decisión de M3 (PH sí/no) tiene
un valor con aspecto de default ("no") que sería visualmente
indistinguible de "no iniciado" si el panel saltara directo a mostrar un
checkbox de PH sin marcar. El modelo de M4 es distinto: su primera
decisión (esquema) tiene tres opciones pares y ningún valor "nulo" con
aspecto válido, así que elegir una inicia M4 de forma natural. Forzar a
M3 a imitar a M4 exigiría inventar un tri-estado falso para PH o
confundir `noIniciado` con `esPropiedadHorizontal: false` -- ambas cosas
peores.

**Decisión**: conservar el patrón "acción explícita de inicio" de M3 sin
cambios. La semántica de `noIniciado` no se toca. La nueva navegación
(UI-01A y siguientes) debe seguir exponiendo con claridad el estado
"Módulo 3 todavía no iniciado" y su botón, sin disolverlo.

### Deuda menor observada (no bloquea)

`CONFIGURACION_MEDIDORES_INICIAL` persiste `tipoProvisionACS: 'individual'`
aunque es inerte con PH en `false`. Se puede dejar así (consistencia con
el resto de updaters) o, en un futuro, persistir sólo
`{ esPropiedadHorizontal: false }` al iniciar. No cambia ningún resultado.

### Estado

**D-δ.71 -- CERRADA.** M4 presenta y edita volúmenes en litros con el core
intacto en m³ y la regresión de conversión blindada. El patrón "Iniciar
Módulo 3" queda auditado y conservado con justificación. Sin decisiones
rojas. Sin bugs.

## D-δ.72 -- UI-01A: arquitectura de navegación + separación Dimensionamiento / Verificación hidráulica -- CERRADA

Primera capa estructural del rediseño de experiencia (Fase 4). Reorganiza
la EXPERIENCIA alrededor del flujo real del proyectista sin tocar
motores, `Proyecto` ni contratos funcionales. Sin fórmulas nuevas, sin
dominio nuevo, sin reporting, sin skin visual completo (eso es UI-01B).

### UI-CRIT-01 -- Flujo de trabajo del proyecto (criterio de UI, no hidráulico)

La experiencia se ordena en cinco etapas:

**1 Demanda → 2 Tuberías → 3 Medidores → 4 Abastecimiento y reserva →
5 Verificación hidráulica.**

La **Verificación hidráulica** es la etapa 5 del flujo porque integra
resultados de M2 + M3 + M4, pero **sigue perteneciendo funcionalmente al
dominio de Módulo 2**. En código y documentación NO existe `Modulo5` /
`EstadoModulo5` / `motor/modulo5` / `configuracionModulo5`: la
verificación es `PanelDePresionDeModulo2` y su lógica es
`resolverEstadoModulo2` / `resolverPresionResidualDeCamino` /
`resolverTerminalMasDesfavorable`, sin cambios.

Este es el primer criterio explícito de UI del proyecto. No se crea una
taxonomía nueva: se registra acá, junto a los CRIT-A* hidráulicos que
viven en `src/normativa/eras-2023/CRITERIOS.md` (esos son normativos;
UI-CRIT-* son de producto).

### Cambios

- **`PanelDePresionDeModulo2` cambia de posición.** Se saca de dentro de
  `ResultadoHidraulicoDeTramo` (donde se renderizaba tras las tablas de
  dimensionamiento y sólo en la rama `auditoria.completa`) y pasa a ser
  la 5.ª sección de `MotorDemandaPantalla`, después de Módulo 4. Se monta
  **una sola vez**; sus props (`proyecto`, `catalogoArtefactos`,
  `onCambiar`) ya estaban disponibles en ese nivel -- no hizo falta
  ningún view-model nuevo ni trasladar cálculos al shell. Al no estar ya
  gateado por `auditoria.completa`, en cobertura incompleta muestra su
  propio estado `incompleto` (mismo panel, sin ocultarse ni bloquear la
  navegación -- brief §27).
- **Sección 2 centrada en dimensionamiento.** El `<h2>` de
  `ResultadoHidraulicoDeTramo` pasa de "Módulo 2 — Tuberías" a
  **"Módulo 2 — Dimensionamiento de tuberías"**. El estado de presión ya
  no aparece en esa sección (la línea "Estado de Módulo 2: …" viaja con
  el panel movido), lo que corrige la UX engañosa de "M2 incompleto" por
  faltar la verificación final. NO se creó un `EstadoModulo2` de
  dimensionamiento ni lógica nueva: sólo cambió la composición visual y
  una etiqueta.
- **`NavegacionDeSecciones.tsx` (nuevo).** Índice lateral
  `<nav aria-label="Secciones del proyecto">` con cinco `<a href="#…">` a
  anclas estables: `#demanda`, `#tuberias`, `#medidores`,
  `#abastecimiento`, `#verificacion-hidraulica`. Es **índice + scroll a
  anchors, NO un router**: no cambia de ruta, no carga páginas, no
  desmonta módulos. La sección activa se resalta con `IntersectionObserver`
  (estado de PRESENTACIÓN con `useState`, degrada a `null` en SSR/tests).
  Un efecto de montaje (doble `requestAnimationFrame`, para esperar que
  el layout de M3/M4/verificación se asiente) re-honra un `#hash` de
  carga inicial que el salto nativo del navegador pierde.
- **`SeccionDeTrabajo` (nuevo, mismo archivo).** Wrapper mínimo:
  `<section id className="seccion-de-trabajo" aria-label>` con
  `scroll-margin-top` vía CSS. NO impone encabezado -- los paneles de
  M1–M4 ya traen su `<h2>`; sólo la etapa 5 (que envuelve un panel sin
  `<h2>` propio) recibe `titulo` + `descripcion`.
- **`navegacionUI.css` (nuevo -- primer `.css` del repo).** SÓLO
  estructura: grid del shell (`minmax(0,1fr)` para que una tabla ancha no
  rompa el layout), `nav` sticky en desktop / barra superior desplazable
  en `≤ 720px`, `scroll-margin-top` de las anclas, `scroll-behavior:
  smooth` bajo `prefers-reduced-motion: no-preference`. Sin paleta,
  tipografía, cards, botones ni estética.
- **Shell.** `MotorDemandaPantalla` pasa a `header` + `app-layout`
  (`nav` + `main`). El subtítulo de página redundante (`<h2>Proyecto de
  ejemplo…`) se colapsa en un `<p>` del header. `ResultadoDemanda` (que
  componía M1+M2+M3+M4) se reduce a `ResultadoDemandaModulo1` (sólo la
  salida de M1); la composición de las cinco secciones vive ahora en
  `MotorDemandaPantalla`.

### Ownership -- sin cambios

`resolverEstadoModulo2`, `resolverPresionResidualDeCamino`,
`resolverTerminalMasDesfavorable`, tipos y tests hidráulicos: intactos y
en Módulo 2. Sólo cambió la composición visual (dónde se monta el panel).

### Estado local agregado

`useSeccionActiva` (sección visible, `useState` + `IntersectionObserver`)
y `useSaltoInicialAlAncla` (efecto de montaje), ambos en
`NavegacionDeSecciones`. Estado de PRESENTACIÓN: no se persiste en
`Proyecto`, no alimenta ningún cálculo. Fuera de eso, la app sigue con
los dos `useState` de D-δ.70 (`Proyecto` + modal de declaración de
artefacto). Ningún módulo se desmonta (§33): el índice no son tabs.

### Verificación

- `vitest` **1232/1232** (132 archivos; +7 tests, +1 archivo:
  `MotorDemandaPantalla.estructura.test.ts` -- orden DOM de las cinco
  etapas, encabezados en el mismo orden, verificación después de
  abastecimiento, panel de presión montado una sola vez, tuberías sin el
  panel, índice con cinco anchors correctos y antes del contenido).
- `src/auditoriaTransversalM1M4.baseline.test.ts` **12/12** con el
  snapshot numérico **byte-idéntico** al de D-δ.70 (Qc
  0,7273238618387272; margen del crítico 3,8358249136345712; medidor
  general DN25; VRTD 0,9167318052388361). `BASELINE-FUNCIONAL-M1-M4.md`
  no requiere cambios: UI-01A no altera ningún valor.
- `tsc -b` / `npm run build` verdes (el build emite ahora un chunk CSS de
  ~1,3 kB). `eslint .` 11 baseline / 0 nuevos / 0 warnings.
- Smoke de navegador (Playwright transitorio, vite dev real): **25/25**,
  estable en 3 corridas, consola **0 errores / 0 warnings**. Cubre:
  sidebar visible en desktop con 5 anchors y `aria-label`; orden DOM
  demanda < tuberías < medidores < abastecimiento < verificación; navegar
  con el índice deja cada sección arriba (o la página en su scroll
  máximo); el panel de presión aparece una sola vez; tuberías ya no lo
  contiene; el `Proyecto` persiste al navegar (sin reload); los números
  del flujo (Qc, medidor DN25, RTD ~917 L) coinciden con el baseline; la
  verificación refleja `directa`/`tanque` sin reload; `/#verificacion-hidraulica`
  monta toda la app y posiciona la sección; viewport de 480 px sin
  overflow horizontal y con el índice usable. `git diff --
  package.json package-lock.json` vacío. Dev server detenido.

### Decisiones rojas

Ninguna. Mover el panel no exigió tocar el contrato hidráulico; la
separación dimensionamiento/presión no exigió duplicar cálculo ni estado
de dominio (la línea de estado de presión simplemente viajó con el
panel); la navegación no desmonta módulos; ningún dato editable se pierde
al mover el panel (no vivía en estado local); el nuevo orden DOM no
afecta ningún cálculo y el snapshot numérico quedó idéntico.

### Estado

**D-δ.72 -- CERRADA. UI-01A CERRADO.** El flujo visual es
Demanda → Tuberías → Medidores → Abastecimiento → Verificación hidráulica;
la verificación se monta una sola vez, al final, y sigue siendo dominio
M2; la sección de Tuberías queda centrada en dimensionamiento; el índice
lateral funciona como scroll a anchors con la one-page y los módulos
montados, sin router. Core M1–M4 sin cambios (baseline transversal
byte-idéntico). Siguiente slice **UI-01B** (sistema visual transversal:
estética, cards, tipografía, sidebar visual definitiva, sticky summary) --
NO iniciado.

## D-δ.73 -- UI-01B: sistema visual transversal -- CERRADA (parcial documentado)

Segunda capa del rediseño de experiencia (Fase 4). Da a la interfaz una
**estética de aplicación técnica moderna** sobre la arquitectura cerrada
en UI-01A, sin tocar cálculo, dominio, `Proyecto`, motores ni semántica.
Baseline numérico **byte-idéntico**. Ver `SISTEMA-VISUAL.md` para el
detalle de tokens, superficies, controles, tablas, estados y responsive.

### Criterios de UI registrados

- **UI-CRIT-02 -- Decisión persistida ≠ resultado derivado.** La interfaz
  distingue visualmente lo que el proyectista controla (inputs /
  configuración: superficies secundarias, `.ui-card--config`) de lo que
  IUAS calcula (resultado derivado: `.ui-card--resultado`, `.ui-metrica`,
  badges de estado). No es una regla nueva de dominio: formaliza en la
  presentación la separación que el modelo ya tiene entre
  `Proyecto`/updaters y `resolverEstadoModuloX`.
- **UI-CRIT-03 -- Litros como unidad comercial principal de reserva en la
  UI; m³ permanece unidad interna.** Consolida D-δ.71: Módulo 4 presenta
  y edita reserva y capacidades en litros; el core y la persistencia
  siguen íntegramente en m³, con conversión sólo en el borde
  (`humanizarModulo4`). En Profesional se muestra el equivalente en m³
  como dato secundario.
- **UI-CRIT-04 -- `noIniciado` puede tener un mecanismo de inicio
  distinto por módulo, según su primera decisión real.** Módulo 3 se
  inicia con un botón explícito ("Iniciar Módulo 3" →
  `conModulo3Iniciado` → `CONFIGURACION_MEDIDORES_INICIAL`) porque su
  primera decisión (propiedad horizontal) tiene un valor con aspecto de
  default; Módulo 4 se inicia eligiendo el esquema de abastecimiento. La
  estética común de los empty states (`.ui-empty`) NO homogeneiza ese
  mecanismo. Codifica la auditoría cerrada en D-δ.71.

### Cambios

- **`sistema-visual.css` (nuevo).** Hoja única de: tokens (`:root` custom
  properties) de color, espaciado, radius, tipografía y sombras; estilos
  base de elementos (tipografía sobria sin serif, controles unificados
  con foco visible, tablas con header suave y `tabular-nums`,
  `details`/`summary`); utilidades de presentación `.ui-*` (`ui-card` y
  variantes, `ui-stack`, `ui-cluster`, `ui-metrica`, `ui-badge` y
  variantes, `ui-callout`, `ui-empty`, `ui-btn--primario/--peligro/--fantasma`,
  `ui-segmented`, `tabla-tecnica`). Se importa desde
  `MotorDemandaPantalla`. Clases semánticas de presentación, no acopladas
  a nombres del motor.
- **`navegacionUI.css` reescrito sobre los tokens.** Sigue siendo el
  dueño de la ESTRUCTURA del shell y la sidebar; ahora con la estética
  final. La sidebar es una superficie tipo card, sticky en desktop /
  barra superior desplazable en `≤ 900px`. Sección activa: fondo verde
  suave + acento lateral + peso (no sólo color). Se agregan los rótulos
  de grupo **PROYECTO** (etapas 1–4) y **VERIFICACIÓN** (etapa 5) y el
  número de etapa como `01`..`05`. Mismos cinco anchors, mismo orden,
  mismos textos visibles del índice.
- **`EncabezadoDeEtapa` + `encabezadoDeEtapa.css` (nuevos).** Patrón
  visual único de cabecera de etapa `[NN] Título / descripción`, aplicado
  a las cinco etapas. Elimina la redundancia `Módulo N — …` /
  `Módulo N · …` de los `<summary>` (secciones 13–14 del brief). El
  `<h2>` real se conserva (accesibilidad + tests de estructura del flujo
  1→5); la traza técnica "Módulo N" sigue disponible en las ayudas de
  cada panel, sin cambiar el ownership técnico. Los tests de estructura
  (`MotorDemandaPantalla.estructura.test.ts`, `PanelDeModulo4.test.ts`) se
  actualizaron al nuevo copy conservando **todas** las garantías de orden,
  anclas y montaje único del panel de presión.
- **M1.** `Qc` como resultado protagonista en `.ui-card--resultado` con
  `.ui-metrica` (número grande, `n`/`Qmax` como metadatos de apoyo);
  parámetros intermedios y desarrollo del cálculo por progressive
  disclosure.
- **M2.** Se quita el `<h3>` "Módulo 2 · Tuberías". El selector
  Rápido/Profesional pasa a segmented control real (`.ui-segmented`,
  `aria-pressed`). La tabla de dimensionamiento adopta `.tabla-tecnica`
  (header suave en mayúsculas, `tabular-nums`, Red como badge discreto,
  columnas numéricas alineadas a la derecha, DN destacado como celda
  editable, `Estado` al final, scroll horizontal **local**). Se eliminó
  todo el `CSSProperties` inline de esa tabla.
- **M3.** Empty state `noIniciado` en `.ui-empty` conservando el botón
  "Iniciar Módulo 3" y `conModulo3Iniciado` (UI-CRIT-04). Configuración /
  medidor general / medidores individuales separados en cards; estado
  como badge; tabla de individuales en `.tabla-tecnica`.
- **M4.** Reserva requerida como `.ui-metrica` protagonista (litros
  principal; m³ secundario sólo en Profesional -- UI-CRIT-03). Conexión y
  adopción en cards; trazabilidad del cálculo tras un `<details>` en
  Profesional; estado de adopción como badge "Suficiente" / "Insuficiente"
  (nunca "Cumple norma": evaluar capacidad ≠ cumplir la norma). El inicio
  sigue siendo elegir esquema, sin botón "Iniciar Módulo 4" (UI-CRIT-04).
- **Verificación hidráulica.** El veredicto global CUMPLE / NO CUMPLE se
  presenta como badge dentro de `.ui-card--resultado`; la etapa 5 usa el
  mismo `EncabezadoDeEtapa` (sin chevron: no es colapsable) como
  conclusión visual del flujo.

### Ownership -- sin cambios

Ningún `resolverEstadoModuloX`, motor, updater, tipo de dominio ni test
hidráulico cambió. UI-01B es CSS + composición de presentación + copy de
cabeceras. Los resolvers se siguen llamando donde ya se llamaban (cada
panel el suyo); no se levantó estado al shell.

### Estado local agregado

Ninguno. La app sigue con los `useState` de UI-01A (`Proyecto` + modal de
declaración de artefacto + navegación de presentación). El sistema visual
es CSS y componentes sin estado.

### Diferido explícitamente (no bloquea el cierre de UI-01B)

Registrado como candidato a **UI-01C**, coherente con "no rearquitecturar
para el resumen" (brief §73) y con la disciplina de cierre (§91):

- **Resumen sticky del proyecto** (`ResumenDeProyecto`) y **estado de
  etapa en la sidebar** (✓/—/!/○). Requieren consumir `resolverEstadoModulo2/3/4`
  y `calcularSimultaneidad` desde el shell; hoy cada panel llama a su
  resolver internamente. Hacerlo bien implica, o bien levantar esos
  resultados a `MotorDemandaPantalla` y pasarlos hacia abajo (para no
  duplicar cálculo, §74), o aceptar una segunda llamada por render. Es
  una decisión de composición transversal que merece su propio slice; no
  se fuerza dentro de UI-01B.
- **Locales / artefactos de M1 como cards** (secciones 33–34) y
  **`ConfiguracionHidraulicaFormulario` de M2** como grid de cards. El
  sistema de tokens ya mejora esas zonas (tipografía, controles,
  espaciado); la reagrupación fina en cards por concepto queda para
  UI-01C.
- **Reemplazo de los `CSSProperties` inline restantes** en
  `ControlDeDn`, `DimensionamientoDeTramo`, `AccesoriosDeTramoEditor`,
  `TarjetaDeTerminal`, `CalculoDelCriticoDetalle`, `LocalYRedCard`,
  `TablaDeTerminales`, `MetodologiaYFuentesTecnicas`. Heredan la estética
  base por selectores de elemento; el pulido de detalle (los ↑/↓ de DN,
  sobre todo) es de UI-01C.

### Verificación

- `vitest` **1232/1232** (132 archivos; sin cambio de recuento: los
  tests de estructura se actualizaron, no se agregaron ni se quitaron).
- `src/auditoriaTransversalM1M4.baseline.test.ts` **12/12** con el
  snapshot numérico **byte-idéntico** al de D-δ.70 / D-δ.72 (Qc
  0,7273238618387272; margen del crítico 3,8358249136345712; medidor
  general DN25; VRTD 0,9167318052388361). `BASELINE-FUNCIONAL-M1-M4.md`
  no requiere cambios.
- `tsc -b` / `npm run build` verdes (chunk CSS ~14,7 kB). `eslint .`
  **11 baseline / 0 nuevos / 0 warnings**.
- Inspección de navegador (Playwright transitorio, vite dev real, 1440 y
  480): shell, sidebar con grupos y sección activa, `EncabezadoDeEtapa`
  en las cinco etapas, tabla técnica de M2 (Rápido y Profesional), M3
  `noIniciado` → `Iniciar Módulo 3` sin reload ni layout roto, empty
  state de M4 por elección de esquema, verificación. Consola **0
  errores / 0 warnings**. `git diff -- package.json package-lock.json`
  vacío. Dev server detenido.

### Decisiones rojas

Ninguna. El sistema visual no exigió tocar ningún contrato congelado; el
patrón de cabecera de etapa no obligó a recalcular nada en React (el
`<h2>` se conserva y sólo cambió el copy); "Iniciar Módulo 3" sigue
materializando `CONFIGURACION_MEDIDORES_INICIAL` sin volverse checkbox de
PH; los litros de M4 no tocaron la persistencia en m³; el snapshot
numérico transversal quedó idéntico. El resumen sticky se difirió a
UI-01C por composición, no por una decisión roja.

### Estado

**D-δ.73 -- CERRADA (parcial documentado). UI-01B CERRADO en su núcleo.**
Están el sistema de tokens, el shell y la sidebar definitivos, el patrón
de cabecera de etapa, y la estética aplicada a M1–M4 y a la verificación
(cards, botones, inputs, tablas técnicas, badges de estado, empty states,
responsive). Queda para **UI-01C** el resumen sticky del proyecto + el
estado de etapa en la sidebar, la reagrupación fina de M1/M2 en cards y
el reemplazo de los `CSSProperties` inline restantes. Core M1–M4 sin
cambios (baseline transversal byte-idéntico). **No iniciar UI-01C ni
REPORT-01.**

## D-δ.74 -- UI-01C: pulido estructural y cierre visual de la app web -- CERRADA

Tercera y última capa del rediseño de experiencia (Fase 4). Pasada
**quirúrgica** para cerrar la interfaz web antes de REPORT-01: no es otro
rediseño general. Corrige las inconsistencias detectadas al inspeccionar
la aplicación real tras UI-01B y completa la jerarquía visual. Sin
cambios de cálculo, dominio, `Proyecto`, motores ni semántica; baseline
transversal **byte-idéntico**.

### Criterios de UI registrados

- **UI-CRIT-05 -- Estado del cálculo ≠ resultado de cumplimiento.**
  "Completo" / "Evaluado" describen la *disponibilidad* del cálculo;
  "CUMPLE / NO CUMPLE" describe el *resultado* técnico. La UI no los
  presenta de forma que parezcan contradictorios: la línea de estado de
  la verificación se llama "Estado del cálculo: cálculo disponible" (no
  "Estado de Módulo 2: Completo") junto al veredicto. El discriminante
  interno (`resolverEstadoModulo2`, estado `completo`) no cambia.
- **UI-CRIT-06 -- Precisión de presentación ≠ precisión de cálculo.** El
  core conserva la precisión completa (m³); la UI humaniza los resultados
  según unidad y contexto. En particular, en modo Rápido los litros de
  reserva se muestran redondeados al entero (`formatearVolumen_L_rapido`);
  el modo Profesional mantiene la precisión completa + m³ equivalente. No
  es una regla de redondeo normativa: el valor de cálculo y de
  persistencia sigue siendo el m³ exacto, y los inputs de capacidad
  adoptada siguen aceptando decimales.

### Cambios

- **Perímetro de la etapa 01 (Demanda).** El encabezado "01 Demanda" abre
  la etapa, **antes** de "Datos del proyecto". La sección `#demanda` pasa
  a usar `SeccionDeTrabajo` con `numero={1}` (mismo patrón que la etapa
  5); toda la configuración que determina la Demanda (tipología, UFs,
  Locales, Artefactos) y su Resultado viven dentro de la etapa, en ese
  orden. `ResultadoDemandaModulo1` deja de traer su propio
  `EncabezadoDeEtapa`. Test nuevo (`MotorDemandaPantalla.estructura.test.ts`):
  encabezado antes de la configuración, orden interno datos → UF →
  artefactos → resultado, todo antes de Tuberías.
- **Cabecera global del producto.** `<h1>` pasa de "IUAS — Motor de
  Demanda" a **"IUAS — Instalaciones internas"** (el producto ya no es
  sólo el motor de demanda) + subtítulo unificado.
- **M1 reestructurado (`demandaM1.css`, nuevo).** "Datos del proyecto"
  como card de configuración (tipología + total UF). Unidad Funcional con
  jerarquía **UF → Local → Artefacto** visible: cabecera con acciones
  (Duplicar / Eliminar UF), campos Nombre/Nivel/Cota agrupados, lista de
  Locales. **Card por Local** (no por artefacto): Tipo/Régimen + lista de
  artefactos como filas compactas `select · Cantidad · Eliminar`. Las
  acciones destructivas (Eliminar local / Eliminar artefacto) tienen
  jerarquía secundaria -- visibles, con nombre accesible, sin depender de
  hover. "+ Agregar" diferenciado por jerarquía: **UF** es acción de
  nivel superior (primaria); **Local** y **Artefacto** son contextuales
  dentro de su contenedor. La declaración de red pendiente pasa a
  `.ui-callout--warn`. Responsive: la fila de artefacto apila
  `select` + (`Cantidad` / `Eliminar`) en ≤ 560 px. La card de Qc de
  UI-01B no se rediseña, sólo se integra en el nuevo perímetro.
- **Verificación -- semántica visual.** La card del veredicto deriva su
  variante **exclusivamente** de `cumpleGlobal`: `.ui-card--ok` (verde)
  si CUMPLE, `.ui-card--error` (rojo) si NO CUMPLE; el color refuerza, el
  badge sigue con símbolo + texto. El estado incompleto usa una
  superficie neutra (no una caja roja). Origen hidráulico + pelo de agua
  mínimo se agrupan en una card de configuración "Datos para la
  verificación" (**UI-CRIT-02**). Copy "Estado del cálculo: cálculo
  disponible" (**UI-CRIT-05**).
- **Resumen del proyecto en la sidebar (`ResumenDeProyecto` +
  `resumenDeProyecto.css` + `resolverResumenDeProyecto` +
  `resolverEntradasDeVerificacion`, nuevos).** Bajo la navegación, tres
  métricas: **Qc · Reserva · Margen crítico**. Es un view-model de
  PRESENTACIÓN que compone `calcularSimultaneidad` +
  `resolverEstadoModulo2` + `resolverEstadoModulo4` y traduce sus
  resultados a valores listos para mostrar; **no** hay
  `EstadoGlobalProyecto`, no se persiste nada, no se recalcula
  hidráulica. "Pendiente" / "No aplica" nunca se muestran como 0
  (§24); esquema `directa` → Reserva "No aplica" (contrato de M4, §25).
  El margen se colorea según `cumpleMinimo`. Se oculta en la barra
  horizontal (≤ 900 px, §58). `resolverEntradasDeVerificacion` extrae de
  `PanelDePresionDeModulo2` la derivación de origen hidráulico + presión
  disponible + hf de medidores por terminal, ahora que tiene un segundo
  consumidor real; el panel pasa a consumirlo (misma composición, un
  solo lugar -- brief §27).
- **M2 -- pulido.** Control de DN reescrito sin `CSSProperties` inline
  (`.control-dn*`): presentación compacta `[↓] DN [↑]` + Auto/Manual, con
  `aria-label` explícitos en cada botón. El estado de la fila de
  dimensionamiento pasa a badge: ✓ (ok) / **"DN mínimo"** neutro (CRIT-A24,
  estado admisible terminal, con `title` explicativo) / "⚠ Incompleto".
  La configuración avanzada se agrupa por conceptos ya existentes
  (Método de cálculo · Geometría de relevamiento · Tubería) vía
  `fieldset`/`legend`. La tabla técnica y las columnas **no** cambian.
- **M4 -- precisión visual de litros** (**UI-CRIT-06**): en Rápido la
  reserva requerida y la tabla de adopción se muestran redondeadas al
  litro; en Profesional, precisión completa + m³. El `<input>` de
  capacidad adoptada y la persistencia (m³) no cambian.
- **Limpieza de inline CSS (§35).** `LocalYRedCard` → `.ui-card`;
  `DimensionamientoDeTramo` badge → `.ui-badge`;
  `MetodologiaYFuentesTecnicas` tabla → `.tabla-tecnica` / `.tabla-scroll`.
  Los `CSSProperties` triviales y estables restantes
  (`width`/`marginLeft`/`overflowX` en `AccesoriosDeTramoEditor`,
  `TarjetaDeTerminal`, `CalculoDelCriticoDetalle`, `TablaDeTerminales`,
  `TeeDeNodoEditor`, el resto de `DimensionamientoDeTramo`) se dejan como
  deuda residual **no bloqueante**: heredan la estética base por
  selectores de elemento y el brief pide priorizar consistencia visual
  sobre porcentaje de CSS eliminado.

### Ownership y composición de resolvers -- sin cambios de motor

Ningún `resolverEstadoModuloX`, motor, updater ni tipo de dominio cambió.
Composición final tras UI-01C:

| Resultado | Se calcula en | Consumidores presentacionales |
| --- | --- | --- |
| `calcularSimultaneidad` (Qc) | `ResultadoDemandaModulo1` | + `resolverResumenDeProyecto` (resumen sidebar) |
| `resolverEstadoModulo2` (+ terminal crítico) | `PanelDePresionDeModulo2` | + `resolverResumenDeProyecto` |
| `resolverEstadoModulo3` | `PanelDeMedidoresDeModulo3` | + `resolverEntradasDeVerificacion` (usado por el panel de presión y por el resumen) |
| `resolverEstadoModulo4` | `PanelDeModulo4` | + `resolverResumenDeProyecto` |

Cada uno se ejecuta como máximo **dos veces por render** (su panel + el
resumen), nunca tres (panel + sidebar + summary). La derivación de
entradas de verificación vive en **un solo módulo**
(`resolverEntradasDeVerificacion`), consumido por el panel y por el
resumen. No se elevó estado al shell ni se creó un motor de estado
global: el resumen sólo compone primitivas ya productivas en el punto de
composición (`MotorDemandaPantalla`), y sólo con un `Proyecto` válido.

### Verificación

- `vitest` **1237/1237** (133 archivos; +5 respecto de UI-01B:
  `resolverResumenDeProyecto.test.ts` con 3 casos -- Qc disponible /
  Reserva y Margen "Pendiente" nunca 0, proyecto canónico con el margen
  del baseline "+3,836 m.c.a.", `directa` → Reserva "No aplica" --,
  `formatearVolumen_L_rapido`, y el test de perímetro de la etapa 01).
  `PanelDePresionDeModulo2.test.ts` actualizado al copy "Estado del
  cálculo".
- `src/auditoriaTransversalM1M4.baseline.test.ts` **12/12** con el
  snapshot numérico **byte-idéntico** (Qc 0,7273238618387272; margen del
  crítico 3,8358249136345712; medidor general DN25; VRTD
  0,9167318052388361). `BASELINE-FUNCIONAL-M1-M4.md` no requiere cambios.
- `tsc -b` / `npm run build` verdes (chunk CSS ~20 kB). `eslint .`
  **11 baseline / 0 nuevos / 0 warnings**.
- Navegador (Playwright transitorio, vite dev real): M1 perímetro y
  cards a 1440/1280/480; sidebar con resumen (Qc / Reserva 917 L /
  Margen crítico coloreado); verificación **CUMPLE → `.ui-card--ok`**,
  **NO CUMPLE → `.ui-card--error`** (comprobado leyendo `className` del
  DOM); M2 tabla con control de DN compacto y badges de estado;
  configuración avanzada agrupada; M4 litros redondeados en Rápido.
  Consola **0 errores / 0 warnings**; **sin overflow horizontal** en
  1280/820/480; el resumen se oculta ≤ 900 px. `git diff --
  package.json package-lock.json` vacío. Dev server detenido.

### Decisiones rojas

Ninguna. Corregir el perímetro de M1 fue composición JSX (mover el
encabezado al principio de la sección), sin tocar dominio ni updaters. El
resumen sólo exigió lifting/composición React y un view-model
presentacional, no un `EstadoGlobalProyecto` ni persistencia nueva.
Humanizar los litros de Rápido es sólo formateo de salida -- el valor de
cálculo y de persistencia (m³) no cambia. La variante visual de la card
de verificación se deriva del `cumpleGlobal` ya calculado, no de
recalcular cumplimiento en React. La contradicción aparente
"Completo / NO CUMPLE" se resolvió sólo por copy (UI-CRIT-05), sin tocar
`EstadoModulo2` ni sus discriminantes. El snapshot numérico transversal
quedó idéntico.

### Deuda residual -- no bloqueante

- `CSSProperties` inline triviales y estables en varios componentes de
  detalle Profesional (ver "Limpieza de inline CSS" arriba). Heredan la
  estética base; migrarlos es cosmético.
- El resumen de proyecto se calcula sólo con `Proyecto` válido; con un
  Proyecto inválido no aparece (en vez de mostrar "Pendiente" en todo).
  Es coherente con "no fabricar resultados"; si se quisiera mostrarlo
  siempre habría que separar la parte de Qc que puede fallar.
- Estados de etapa en la sidebar (✓/—/!/○): **no** se implementaron
  (§29). El riesgo de que "M3 evaluado" o "M4 evaluado" se lean como
  cumplimiento normativo total superaba el valor del indicador; el
  resumen de tres métricas cubre la necesidad de "cómo está el proyecto
  de un vistazo".

### Estado

**D-δ.74 -- CERRADA. UI-01C CERRADO. INTERFAZ WEB IUAS VISUALMENTE
CERRADA PARA EL ALCANCE ACTUAL.** No significa que no pueda mejorarse:
significa que ya no existe deuda visual bloqueante antes de abordar
reporting. UI-01A + UI-01B (núcleo) + UI-01C cerrados; core M1–M4
congelado / intacto (baseline transversal byte-idéntico). Siguiente fase
**DEPLOY-01** (piloto web) → **UX-TEST-01** → **REPORT-01** -- **NO
iniciar REPORT-01**.

## D-δ.75 -- DEPLOY-01: preflight de piloto + publicación web -- PREFLIGHT CERRADO / READY TO DEPLOY

Fase de **publicación**, no de desarrollo. Cierra riesgos de UX previos al
primer piloto web y prepara el build estático. Sin cambios de hidráulica,
dimensionamiento, selección de DN, CRIT-A19 ni Vmax; baseline transversal
**12/12 byte-idéntico**; suite 1237 → 1247.

### Semántica de los avisos de velocidad de M2 (preflight A)

- Los umbrales **2,0 m/s** y **2,5 m/s** son de **comunicación IUAS**, no
  límites normativos. No se introdujo ninguna constante `Vmax = 2,5` ni
  ninguna tabla/fórmula normativa en la capa de UI.
- La **única** frontera de inadmisibilidad sigue siendo `V > Vmax real
  aplicable`. La UI la obtiene **leyendo** `limiteMaximo_mps` y `tipo` de
  `verificarVelocidadAdmisible` (el resultado de dominio que ya viaja
  hasta `resolverResultadoDeTramoParaUi` vía
  `ResultadoPerdidaDistribuidaDeTramo`), nunca recalculándola en React.
  No hizo falta exponer nada nuevo del motor: la clasificación se computa
  en `textosDePerdidaDistribuidaDeTramo`, donde `verificacionVelocidad`,
  `velocidadReal_mps` y `velocidadPorDebajoDelMinimo` ya están en scope.
- `clasificarVelocidadParaUi` (helper puro, presentacional):
  `normal` (V < 2,0, sin badge) · `elevada` (2,0 ≤ V < 2,5, ámbar) ·
  `muyAlta` (2,5 ≤ V ≤ Vmax, naranja) · `noAdmisible` (V > Vmax, rojo).
  El caso terminal CRIT-A24 / D-δ.27 (`velocidadPorDebajoDelMinimo`)
  siempre clasifica `normal` -- coherente con que su copy de verificación
  nunca usa lenguaje de advertencia. En `fueraDeDominioNormativo` (sin
  Vmax conocido) sólo se aplican los umbrales de comunicación, nunca
  `noAdmisible`.
- La clasificación visual **no puede** alterar el resultado hidráulico:
  no colorea la fila, sólo acompaña al valor de V; el color nunca es el
  único canal (etiqueta de texto + `title` accesible).

### Persistencia (preflight D)

**No existe.** El `Proyecto` vive sólo en `useState` de
`MotorDemandaPantalla`, sembrado desde `proyectoInicial`. No hay
`localStorage` / `sessionStorage` / `IndexedDB` / URL-state (el hash es
sólo navegación one-page). Recargar, cerrar la pestaña o abrir una
segunda pestaña ⇒ proyecto de ejemplo limpio, cambios perdidos, sin
sync. Mitigación de piloto: **un** aviso no bloqueante en la cabecera
(`role="note"`, `ui-callout--info`, sin alarma). **No se implementó
persistencia** -- eso es **PERSIST-01**, un slice específico posterior al
piloto (autosave local y/o export/import JSON), a decidir con el feedback
real.

### Hosting

Ya configurado y previamente usado: `.github/workflows/deploy.yml`
(workflow oficial de Vite, actions ancladas por hash de commit; existe en
`origin/main` desde la época de `v0.1.0` / "Paso 6") despliega `./dist` a
**GitHub Pages** on push a `main`. `vite.config.ts` fija `base: '/IUAS/'`
sólo en `command === 'build'`. URL esperada:
`https://nicolasambrosoeras-ctrl.github.io/IUAS/`. **Manifests intactos**
(`git diff -- package.json package-lock.json` vacío): no se agregó
ninguna dependencia de deploy; el mecanismo es workflow + config, no el
`package.json`.

Consecuencia operativa del `base` condicionado por `command`: `vite
preview` (cuyo `command` es `serve`) **no** reproduce el subpath `/IUAS/`.
La validación estática local se hizo con un servidor estático mínimo que
monta `dist/` bajo `/IUAS/` (equivalente a Pages), no con Vite dev ni con
`vite preview` a `/`.

### Validación (build estático local)

- `dist/` = `index.html` + `assets/index-*.css` (~20 kB) +
  `assets/index-*.js` (~2,2 MB / ~924 kB gzip, dominado por `pdfmake`).
- Smoke Playwright contra el estático montado en `/IUAS/`: **31/31,
  consola 0/0**. Inicio, título, shell, aviso de piloto; M1 editable; M2
  con el proyecto ejemplo (**2,9 m/s → "Muy alta" / naranja
  `rgb(181,72,14)`**, **2,1 m/s → "Elevada" / ámbar**, sin "No
  admisible"); M3 "Iniciar Módulo 3"; M4 ofrece esquema; Verificación
  sin "Para completar Módulo 2"; botón "Generar memoria PDF de Demanda";
  los 5 hashes directos alcanzables; 360 px sin overflow.
- Responsive 1280 / 820 / 480 / 390 / 360: sin overflow horizontal
  global; nav usable; tabla de M2 con scroll horizontal **local** ≤ 480 px
  (aceptado para beta, no se hizo versión card).
- Seguridad: sin `.env*`, sin `import.meta.env` / `VITE_*` en `src/`, sin
  secretos en el bundle. El deploy sube sólo `./dist`;
  `resguardo-documentacion/**` y la documentación del repo no se publican.
- Rendimiento (sanity, sin SLA de hardware): proyecto de estrés = ejemplo
  con 11 UF (~380 inputs/selects en M1, > 100 artefactos). Navegación
  entre módulos 31–44 ms; editar coeficiente + recálculo ~330 ms;
  duplicar UF 200–680 ms; scroll completo ~750 ms. **Sin freeze, sin
  crash, consola limpia.** El costo está en **render/DOM** en ediciones
  que revalidan todo el árbol, no en el cálculo hidráulico (la navegación,
  que no re-renderiza todo, es instantánea). Optimización frontend futura
  (lazy-load de `pdfmake`, memoización de filas), no bloqueante, **sin
  backend**.

### Decisiones rojas

- **Publicación efectiva (push a `main` + deploy a GitHub Pages).**
  `origin/main` está **122 commits atrás** de `HEAD` local (último push
  ~2026-08-12): publicar implica subir por primera vez todo el trabajo
  UI-01A/B/C + M3/M4 + este slice, y disparar un deploy automático de
  producción. El hosting está configurado (no hay que elegir proveedor),
  pero no pude verificar desde el entorno que Pages siga habilitado con
  fuente "GitHub Actions" (`gh` no disponible; red intermitente). Por ser
  una acción saliente y difícil de revertir sobre un estado que el brief
  no anticipó, el preflight se cierra en **READY TO DEPLOY** y el push
  queda a confirmación explícita del usuario. Sin esa confirmación no se
  crea `v0.4.0-beta.1` (el tag se reserva para el artefacto realmente
  publicado y validado en la URL real).
- El resto (avisos de velocidad, copy, aviso de piloto) fue presentación
  pura: no tocó `EstadoModulo2`, motivos tipados, updaters, dominio ni
  `pdfMake`. El snapshot numérico transversal quedó idéntico.

### Deuda residual -- no bloqueante

- **Sin persistencia** (arriba). Insumo directo de UX-TEST-01; candidato
  a PERSIST-01.
- **Memoria PDF sólo de Demanda (M1).** El botón lo dice explícito;
  REPORT-01 la reemplaza.
- **Bundle ~924 kB gzip** dominado por `pdfmake` cargado de entrada;
  lazy-load pendiente.
- **Ediciones que revalidan todo el árbol** (~300 ms con proyecto
  grande): render/DOM, no cálculo. Memoización / trabajo incremental si
  molesta en uso real.

### Estado

**D-δ.75 -- PUBLICADO.** `push origin main` (`fd425e6..04598a6`) disparó
el workflow (run `34243435732`, success); URL real
`https://nicolasambrosoeras-ctrl.github.io/IUAS/` validada (smoke de
producción 31/31 + responsive 1280→360, consola 0/0); tag anotado
`v0.4.0-beta.1` creado y pusheado sobre `04598a6`. GitHub Pages estaba
habilitado con fuente Actions (el run de agosto ya terminaba en success),
así que la decisión roja del preflight se resolvió con la confirmación
del usuario. **No es v1.0.0.** Siguiente: **UX-01 / UI-01D** (D-δ.76,
abajo) → **UX-TEST-01** -- **NO iniciar**. **REPORT-01 -- NO iniciar.**

## D-δ.76 -- UX-01 / UI-01D: unidades funcionales colapsables en M1 -- CERRADA

Primer ajuste UX posterior a `v0.4.0-beta.1`. Objetivo: trabajar con
varias Unidades Funcionales sin scroll infinito, contrayendo cada UF
desde arriba o desde abajo. **Sin cambios de cálculo, `Proyecto`,
updaters ni persistencia**; baseline transversal M1-M4 **12/12
byte-idéntico**; suite 1247 → 1252.

### El estado de colapso es sólo de presentación

`ProyectoFormulario` guarda `useState<ReadonlySet<string>>` con los ids de
las UF **colapsadas**. Semántica deliberada: *"id ausente del conjunto =
UF expandida"*. El conjunto arranca **vacío**, así que toda UF ya presente
al montar aparece expandida (sección 3/16 del brief) sin tener que
enumerar `id → true`. No existe ningún campo `UnidadFuncional.colapsada`
en el dominio y **no se persiste** (sección 14/51): un reload vuelve al
proyecto de ejemplo con su UF abierta, coherente con la beta.

Asociado por `uf.id`, nunca por índice (sección 15): sobrevive a
altas/bajas/duplicados/reordenamientos. Al eliminar una UF se quita su id
del conjunto (sección 19) para no acumular ids muertos.

### Identificar la UF nueva sin tocar los updaters

- **Agregar**: `agregarUnidadFuncional` ya construye `nuevaUf` con su id
  antes de despachar, así que basta `marcarColapsadas([nuevaUf.id])`.
- **Duplicar**: `duplicarUnidadFuncionalEnProyecto` devuelve sólo
  `Proyecto` (no el id de la copia). En vez de cambiar el contrato del
  updater (sección 17/18) se comparan los ids de UF **antes y después** en
  la capa de presentación: `proyectoConCopia.unidadesFuncionales.filter(u
  => !idsPrevios.has(u.id))`. La copia nace colapsada; la UF origen
  conserva su estado.

### Dos controles, un único estado

La cabecera es un botón de disclosure real (patrón APG:
`<button aria-expanded aria-controls>` dentro del `<h3>`), no un `<div>`
clicable. El control inferior ("↑ Contraer unidad funcional", tras
"+ Agregar local", sólo con la UF abierta) llama al **mismo**
`onAlternarColapso` — no hay dos estados. **Sin acordeón exclusivo**:
abrir una UF no cierra las demás (sección 13).

### Conditional rendering del detalle

Con la UF colapsada, `CuerpoDeUnidadFuncional` (el detalle editable,
extraído para que el colapso quede legible) no se renderiza. Se apoya en
la **auditoría D-δ.70**: ningún panel/control de M1 guarda decisiones de
dominio en `useState` — todo se threadea a `Proyecto` en cada `onChange`
(el único `useState` interno, `declaracionPendiente` de `LocalFormulario`,
es un prompt transitorio AF/AC, no dato editable). El único wrapper que
permanece siempre es `<div id={contenidoId} hidden>`, para que
`aria-controls` apunte siempre a un nodo real. Efecto medido: con 11 UF,
colapsar 10 reduce ~75 % del DOM de la etapa 01.

### Resumen compacto

`resumenDeUnidadFuncional` (helper puro, `resumenDeUnidadFuncional.ts`):
nombre + nivel + `N locales · M artefactos`. El conteo de artefactos es la
**suma de `cantidad`** de todos los locales, no el número de filas
(sección 23). Se recomputa en cada render desde la UF actual, así que
reflejar nombre/nivel editados es automático (nunca se cachea). **No**
introduce ningún helper del motor de demanda ni resultados hidráulicos.

### Decisiones rojas

Ninguna. El estado vive en un `useState` separado que nunca llama a
`onCambiar`, así que un toggle no puede modificar `Proyecto` (verificado:
baseline transversal byte-idéntico + Playwright `Qc` idéntico antes/después
de contraer). Identificar la UF nueva se resolvió por comparación de ids
en presentación, sin tocar `duplicarUnidadFuncionalEnProyecto`. La
estructura previa de M1 admitió dos controles sobre un estado sin
rearquitectura (sólo lifting a `ProyectoFormulario` + extracción de
`CuerpoDeUnidadFuncional`).

### Deuda residual -- no bloqueante

- Alternar **muchas** UF de una vez (p. ej. 11 seguidas) re-renderiza todo
  `#demanda` por click (~1 s las 11); un toggle individual es instantáneo.
  Igual que en D-δ.75, el costo es render/DOM en revalidación de árbol
  completo, no cálculo. Memoización de UF/filas si molesta en uso real.

### Estado

**D-δ.76 -- CERRADA.** Publicada como `v0.4.0-beta.2` sobre el mismo
hosting (`https://nicolasambrosoeras-ctrl.github.io/IUAS/`); el tag apunta
al commit desplegado, `v0.4.0-beta.1` no se movió. Siguiente:
**UX-02 / UI-01E** (D-δ.77, abajo). **UX-TEST-01 -- NO iniciar.
REPORT-01 -- NO iniciar.**

## D-δ.77 -- UX-02 / UI-01E: defaults contextuales de carga + semántica visual de redes -- CERRADA (subpunto F elevado)

Incremento de **carga y lectura** de M1/M2. Sólo capa de interfaz: no
toca `motor/`, `Proyecto`, updaters, catálogo normativo ni fórmulas;
baseline transversal M1-M4 **12/12 byte-idéntico**; suite 1252 → 1263.

### Criterios de UI registrados

- **UI-CRIT-07 -- Los defaults de creación son contextuales y nunca
  reinterpretan datos existentes.** El Régimen del Local nuevo, y el
  artefacto que propone "+ Agregar artefacto", son *defaults de creación*:
  el usuario los cambia libremente y los Locales/Artefactos ya cargados
  no se tocan jamás. No hay migración de `Proyecto`; un proyecto viejo
  carga idéntico. El mapping Tipo-de-Local → artefactos habituales es
  comportamiento de **producto**, vive en `interfaz/` (nunca en `motor/`),
  usa ids canónicos del catálogo, y sólo cubre Régimen `domiciliario`
  (el único con relación firme en el repo).
- **UI-CRIT-08 -- La conectividad se decide sobre el artefacto EFECTIVO,
  nunca sobre un tipo provisional o stale.** El orden es: determinar el
  tipo real → crear la fila → resolver la Red (con
  `sincronizarConectividadFisicaDeArtefacto`; si no hay precedente, se
  pregunta AF/AC). La pregunta pendiente se referencia por **id de fila**,
  no por tipo de catálogo: si el usuario cambia el `<select>` de esa fila
  antes de responder, la pregunta se re-evalúa contra el tipo nuevo (se
  cierra si ya tiene precedente inequívoco, sigue abierta apuntando al
  tipo nuevo si no). Eliminar la fila cancela la pregunta. "Cancelar"
  retira la fila recién creada (efecto neto idéntico al de antes de este
  incremento: "no lo agregué después de todo").
- **UI-CRIT-09 -- AF/AC tienen identidad cromática de CATEGORÍA física,
  independiente de estados de advertencia/error.** Las pills de Red usan
  azul frío (Agua fría) y salmón (Agua caliente), nunca `--color-error`
  ni el info primario saturado. El color no es el único canal: la pill
  conserva su texto. La variante se elige por el valor `RedDeTramo`
  (`BadgeDeRed`), no por selectores frágiles ni por el texto. No se
  relaciona con los badges de velocidad de M2 (semánticas separadas).

### Borrador de artefacto (brief §11/§12): por qué NO toca el dominio

`Artefacto.artefactoId` es un `string` no vacío que referencia el
catálogo. Un "borrador sin tipo" NO se modela con un `artefactoId`
ficticio (`''` / `'sinSeleccionar'`): eso contaminaría el dominio,
dispararía la barrera de cobertura y entraría en el pipeline de demanda.
En su lugar el borrador es **estado local de `LocalFormulario`**
(`useState<boolean>`): renderiza una fila `<select>` "Seleccionar
artefacto…" que no existe en `Proyecto`. Recién cuando el usuario elige
un tipo real se ejecuta el alta normal. Sin persistencia, sin efecto en
Qc/M2/M3/M4 mientras no haya tipo.

### Cambio de flujo respecto de D-δ.52

Antes: "preguntar AF/AC → crear la fila sólo al responder" (el comentario
de `LocalFormulario` decía "en vez de crear el artefacto incompleto y
repararlo después"). Ahora (brief §14): "crear la fila con el tipo real →
resolver conectividad". Un `Artefacto` creado y todavía sin terminal en
`redHidraulica` **ya era** un estado válido (la barrera de cobertura
S1/S2 lo señala); este incremento sólo lo hace transitorio y explícito
mientras el banner AF/AC está abierto, y lo revierte si el usuario
Cancela. `reconciliarConectividadFisicaPorCambioDeArtefacto` (D-δ.52) se
reutiliza tal cual para el caso "cambió el `<select>` con pregunta
pendiente".

### Subpunto F -- contador "puntos" de M2: DECISIÓN ROJA de nomenclatura

**Evidencia.** El `<summary>` de cada fila de la tabla de dimensionamiento
de M2 muestra `{etiqueta} · {nPuntos} {punto|puntos}`.
`nPuntos = contarTerminalesFisicosDeLocal(redHidraulica, uf, local, red)`
cuenta **Nodos terminales distintos** = una referencia de `Artefacto` por
Red, **sin considerar `Artefacto.cantidad`**. En el proyecto de ejemplo
todas las cantidades son 1, así que "4 puntos" == "4 artefactos"; la
divergencia aparece sólo con `cantidad > 1` (p. ej. `Lavatorio ×2` cuenta
como 1). Además D-δ.76 fijó, para el resumen de UF en M1, que
"N artefactos" = **suma de `cantidad`**. Renombrar el contador de M2 a
"artefacto(s)" sería (a) falso para `cantidad > 1` y (b) el mismo término
con dos significados entre M1 y M2.

**Alternativas.** (1) Mantener "puntos" (status quo; vago pero no falso).
(2) "N bocas" / "N conexiones" (describe con precisión lo que se cuenta:
puntos de conexión física a la red). (3) Hacer que M2 sume `cantidad`
para igualar a M1 — cambia el número mostrado, lo que el brief §27
prohíbe sin tocar topología.

**Impacto.** Sólo copy en un `<summary>`; cero efecto de cálculo. Bajo
riesgo en cualquier dirección.

**Recomendación técnica.** Opción (2), "N bocas" o "N conexiones": es lo
que la función mide y evita el choque terminológico con M1. Si se
prefiere una sola palabra en toda la app, "conexiones".

**Pregunta (a resolver, típicamente dentro de UX-TEST-01):** ¿qué palabra
usa M2 para ese contador — "puntos" (sin cambio), "bocas" o "conexiones"?

Mientras tanto se mantuvo "puntos" sin cambios; **no bloquea** el resto de
UX-02, que se publica igual.

### Decisiones rojas

Sólo el subpunto F (arriba). El resto fue capa de presentación:
`sugerenciaDeArtefacto` es un helper puro de `interfaz/`; el borrador es
estado local; la reconciliación de la pregunta pendiente reutiliza
primitivas D-δ.52 ya cerradas; las pills usan tokens nuevos mínimos sobre
la paleta existente. Snapshot numérico transversal idéntico.

### Estado

**D-δ.77 -- CERRADA** (subpunto F elevado como decisión de nomenclatura,
no bloqueante). Publicada como `v0.4.0-beta.3` sobre el mismo hosting; el
tag apunta al commit desplegado, `beta.1` y `beta.2` no se mueven.
Continúa en **D-δ.78** (abajo). **UX-TEST-01 -- NO iniciar. REPORT-01 --
NO iniciar.**

## D-δ.78 -- UX-02 / UI-01E (continuación): FIX validación transversal + optimizaciones de carga y lectura -- CERRADA

Consolidación de hallazgos del piloto sobre `v0.4.0-beta.3`. Corrige un
bug de *gating* de validación (P0) y pule la carga y la lectura de M1/M2/
M3. **Sin fórmulas hidráulicas ni criterios normativos nuevos**; puede
tocar validación/orquestación porque ahí está el bug. Baseline
transversal M1-M4 **12/12 byte-idéntico**; suite 1263 → 1270.

Nota de versión: el brief apuntaba a `v0.4.0-beta.3`, pero D-δ.77 ya la
había creado y publicado (con P1 "defaults contextuales" y las pills
AF/AC). Los tags publicados no se mueven; esta continuación se publica
como **`v0.4.0-beta.4`**. P1 y las pills AF/AC del brief no se rehacen:
ya estaban en producción.

### Criterios de UI registrados

- **UI-CRIT-10 -- Un estado inválido de un módulo *downstream* no
  invalida cálculos *upstream* independientes.** La dependencia del
  pipeline es Demanda → Tuberías → Medidores → Abastecimiento →
  Verificación, y `calcularSimultaneidad` (M1) consume sólo la estructura
  del `Proyecto` y las referencias de catálogo. Por eso un error de M2/
  M3/M4 (p. ej. `periodoConsumoMaximo_h` fuera de [1,4] h) **no puede**
  impedir que M1 calcule Qc, ni desmontar las etapas donde se corrige el
  dato. La validación se clasifica por `AlcanceValidacion` (`demanda` |
  `tuberias` | `medidores` | `abastecimiento`, `validacion/codigos`);
  sólo un error de alcance `demanda` bloquea el cálculo de Demanda. Los
  demás se muestran en su sección (`RevisionesPendientes`), agrupados,
  con enlace, **sin códigos internos ni `[error]`**. La validación
  exhaustiva NO se debilita: cambia el *gating* del cálculo y la
  *presentación*, no la detección.
- **UI-CRIT-11 -- "Rápido / Profesional" es configuración global del
  Proyecto.** Un único control (`SelectorDeModoDeTrabajo`, en la cabecera
  de la app), una única fuente de verdad. NO se persiste ningún campo de
  "modo": se sigue **derivando** de `configuracionHidraulica`
  (`resolverModoDeTrabajo`: granularidad + método de pérdida localizada)
  y aplicando `aplicarModoRapido` / `aplicarModoProfesional` — los mismos
  updaters que ya usaba M2. M1 / M2 / M4 lo consumen igual que antes; el
  futuro REPORT-01 también deberá consumirlo de ahí.

### P0 -- causa raíz y forma de la corrección

**Evidencia.** `MotorDemandaPantalla` calculaba
`validacion = validarProyecto(...)` (7 validadores: invariantes de
Proyecto, catálogo, redHidraulica, configuracionHidraulica,
configuracionMedidores, configuracionAbastecimiento, parametrosConexion)
y usaba el único booleano `validacion.valido` para (a) mostrar Qc vs.
"El Motor de Demanda no se ejecuta" y (b) montar Tuberías / Medidores /
**Abastecimiento** / Verificación. Un `periodoConsumoMaximo_h = 10`
(valor real tipeado en el primer campo de la card de M4) →
`configuracionAbastecimientoPeriodoConsumoMaximoInvalido` →
`valido === false` → M1 apagado y **la sección de M4 desmontada**: no hay
forma de corregir el dato sin recargar (y perder todo, sin persistencia).

**No era** un handler cruzado ni un parser: cada campo de M4 llama a su
propio updater (`conPeriodoConsumoMaximo`, `conPresionSobreAcera`,
`conDesnivelConexion`, `conVolumenTanque*`), y `parsearNoNegativo` mapea
`'' → undefined` correctamente. El único problema era el *gating* global.

**Corrección.** `AlcanceValidacion` + `ALCANCE_POR_CODIGO` (un `Record`
completo, en un solo lugar de `validacion/codigos`); `crearProblema`
adjunta `alcance` a cada `ProblemaValidacion`. Helpers
`erroresQueBloqueanLaDemanda` / `erroresDeModulosPosteriores`.
`MotorDemandaPantalla`: M1 muestra Qc salvo que haya un error de alcance
`demanda`; los posteriores van a `RevisionesPendientes` y **no** apagan
M1 ni desmontan secciones. Tests: `src/validacion/alcance.test.ts`
(Tc=6 / Tc ausente → M4 *flagged* y Qc byte-idéntico; error real de
Demanda sí bloquea).

### P3 -- grid de Locales sin breakpoint manual

`.m1-uf__locales` pasa de `flex column` a
`grid-template-columns: repeat(auto-fill, minmax(min(100%, 26rem), 1fr))`:
tantas columnas como quepan a ≥ 26rem cada una, cayendo a 1 sola cuando
el contenedor (con la sidebar de 232px descontada) no alcanza — sin un
`@media` de ancho fijo. Cada `.m1-local` sigue siendo una card
independiente; el prompt AF/AC y el borrador de artefacto quedan dentro
de su card (no invaden la vecina). `qu` sale del label del `<select>` y
pasa a `.m1-artefacto__qu` (segunda línea, discreta), leído del catálogo.

### P4 -- mover el control sin duplicar la fuente

El selector segmentado se extrajo de `CabeceraDeModulo2`
(`ResultadoHidraulicoDeTramo`) a `SelectorDeModoDeTrabajo`, montado una
sola vez en `<header class="app-header">`. En M2 queda la explicación del
modo activo + "Configuración avanzada" (material / método / geometría,
sección 50 del brief). No se creó `modoHeader` ni `modoM2`: el valor
sigue siendo `configuracionHidraulica`.

### Decisiones rojas

Ninguna. P0 se resolvió clasificando la validación existente, sin
debilitar ninguna invariancia (UI-CRIT-10). El resto fue presentación:
`nombreDeUnidadFuncional` es un helper puro; el grid es CSS; mover el
selector fue lifting a la cabecera reutilizando los updaters de D-δ.51.
Snapshot numérico transversal idéntico. La nomenclatura "N puntos" de M2
(D-δ.77 subpunto F) sigue siendo la única decisión pendiente y no
bloquea.

### Deuda residual -- no bloqueante

- Nomenclatura del contador "N puntos" de M2 (ver D-δ.77 subpunto F).
- Edición numérica: un valor transitorio válido→inválido (p. ej. tipear
  "6" en Tc) ya sólo produce un mensaje LOCAL en Abastecimiento, no un
  fallo de app; no se agregó *debounce* (sería infraestructura
  preventiva). Reconsiderar sólo si el feedback real lo pide.

### Estado

**D-δ.78 -- CERRADA.** Publicada como `v0.4.0-beta.4` sobre el mismo
hosting; el tag apunta al commit desplegado, `beta.1` / `beta.2` /
`beta.3` no se mueven. **UX-TEST-01 -- NO iniciar. REPORT-01 -- NO
iniciar.**

## D-δ.79 -- UX-03 / HYD-UX-01: conectividad explícita en M2 + origen hidráulico rápido de tanque elevado + trazabilidad Profesional -- CERRADA

Publicada como **`v0.4.0-beta.5`**. Suite 1270 → 1311. Baseline
transversal M1–M4: **un único cambio numérico documentado** (P1 / CRIT-A39,
ver abajo); el resto byte-idéntico.

### P0 -- dimensionamiento con conectividad explícita de artefactos (bug)

**Evidencia.** En `v0.4.0-beta.4`, agregar "Lavavajillas industrial"
(catálogo: `quTotal_lps = 0,40`, `quFria_lps`/`quCaliente_lps` = `null`;
§2.9.1.3) a un Local y resolver su conectividad (AF, AC o AF+AC) dejaba
tramos de M2 con `DN —` / `V —` / `hf —` (Alimentación general, ramales),
aun con todos los datos disponibles. Igual para los demás no domiciliarios
sin desagregar: pileta de cocina industrial, lavarropas industrial,
lavachatas, válvula de mingitorio.

**Causa raíz.** `resolverQuEfectivoParaTramo` llamaba a `resolverQuEfectivo`
(selección del `qu` desagregado por condición topológica) **antes** del
override de CRIT-A15 por conectividad física exclusiva. Para un artefacto
cuyo catálogo no desagrega, cualquier tramo en condición `aguaFria` /
`aguaCaliente` lanzaba sobre el `null` y el override — que existía
justamente para "una sola cañería transporta el total" — quedaba como
código muerto. El throw lo captura `resolverResultadoDeTramoParaUi` y
degrada la fila a indeterminada.

**Corrección.** La conectividad física se resuelve primero:
- **solo AF / solo AC** (CRIT-A15, fila "una sola alimentación"):
  `qu_lps = quTotal_lps`, con o sin desagregación de catálogo.
- **AF + AC con catálogo que NO desagrega** (ampliación de CRIT-A15,
  decisión del usuario — no norma ERAS; ERAS §2.9.1.3 no publica columnas
  qu(A.Fría)/qu(A.Cal.), no hay base para partir `quTotal_lps`): cada
  conexión física se dimensiona para el caudal total declarado; el tramo
  común aguas arriba queda en condición `total` y atribuye `quTotal_lps` al
  artefacto **una sola vez** — nunca la suma de ambas ramas (sin doble
  conteo, D-δ.8).
- **AF + AC con catálogo que sí desagrega** ("twin"): sin cambios, cada
  rama conserva su fracción de mezcla.

Se preserva CRIT-A7 (un `0` explícito de catálogo para la condición sigue
siendo el total correcto, no una fracción a reconstruir). Tres tests
hermanos que codificaban el throw viejo para conexión exclusiva se
actualizaron a la conducta corregida, con cobertura nueva de
AF/AC/AF+AC del lavavajillas industrial. Baseline transversal 12/12
byte-idéntico.

### P1 -- pelo de agua mínimo estimado en modo Rápido (CRIT-A39)

Ver **CRIT-A39** en `src/normativa/eras-2023/CRITERIOS.md` para el criterio
completo. Resumen: modo Rápido + esquema `tanqueElevado` simple →
`z_pelo_agua_min = desnivelConexion_m − 0,50 m` (ambas cotas respecto de
la acera). Hipótesis de producto de IUAS, no regla ERAS; no toca CRIT-A37.
Read-only con nota de hipótesis; sin el desnivel, verificación incompleta
(no se fabrica 0, no cae al valor manual oculto). No aplica a
`cisternaBombeoElevado` ni a `directa`. El valor manual del modo
Profesional se preserva intacto en `Nodo.cota_m` y se recupera al volver.

**Frontera.** Helper puro `motor/modulo4/resolverPeloDeAguaMinimoDeTanque.ts`;
composición M4→M2 en `interfaz/paginas/resolverEntradasDeVerificacion.ts`
(`peloDeAguaMinimoEfectivo` + `proyectoParaVerificacion`). `motor/tuberias/**`
y `motor/modulo2/**` siguen sin importar Módulo 4 (sin ciclo).

**Decisión roja F -- resuelta por el usuario (re-baselinar con evidencia).**
El fixture canónico del baseline transversal D-δ.70 es modo Rápido +
`tanqueElevado` con pelo de agua manual 20 m y `desnivelConexion_m` 0 m
— dos knobs independientes antes de CRIT-A39, hoy acoplados. `balanceM2`
del test pasa ahora por la misma frontera que la UI. Único cambio del
baseline: margen del crítico de M2 **+3,836 m.c.a. (CUMPLE) → −16,664
m.c.a. (NO CUMPLE)**. M1 / M3 / M4 / Tabla N°1 byte-idénticos. Documentado
en `BASELINE-FUNCIONAL-M1-M4.md` y CRIT-A39. No se falseó el modo ni se
inventó geometría para preservar el margen histórico.

### P2 -- coherencia de cotas en Profesional

Las etiquetas del pelo de agua mínimo (verificación) y del desnivel del
punto de alimentación del tanque (Abastecimiento y reserva) nombran el
datum ("respecto de la acera") y el signo (positivo = por encima). Nuevo
helper puro `motor/modulo4/resolverCoherenciaDeCotasDeTanque.ts`:
advertencia **no bloqueante** si el pelo de agua mínimo declarado queda
por encima del punto de alimentación del tanque (solo `tanqueElevado`
simple + Profesional; en `cisternaBombeoElevado` las cotas no son
comparables; en Rápido se cumple por construcción). No modifica valores,
no bloquea el cálculo, no es error duro.

### P3 -- pérdida localizada jerarquizada

En el editor de accesorios de un tramo (Profesional), la pérdida
localizada pasa de `<small>` secundario a métrica `ui-metrica` (misma
familia visual que la pérdida del tramo: etiqueta técnica corta, números
tabulares, unidad "m.c.a."), con nota "no incluye las pérdidas nodales por
tee". Usa el `hf_m` que `resolverPerdidaLocalizadaDeTramo` ya devolvía —
sin cálculo nuevo en React. Se mantiene la distinción "sin tee".

### Adenda -- ramales terminales en grilla

En Profesional, los ramales terminales hermanos se disponen en grilla CSS
de hasta 2 columnas (1 al angostar / mobile), cada uno en una subcard
discreta; el tramo de alimentación común queda a ancho completo fuera de
la grilla. Si algún hijo no es terminal se mantiene el apilado (jerarquía
física). CSS puro (`.m2-ramales-grid`, `.m2-ramal-subcard`), sin cálculo
de anchos en JS, sin masonry: orden DOM = orden hidráulico. Contenedor
`role="group"` / `aria-label="Ramales terminales"`. Layout únicamente.

### Deuda residual -- no bloqueante

- Nomenclatura del contador "N puntos" de M2 (ver D-δ.77 subpunto F) —
  sin cambios; reevaluar "conexiones" / "bocas" durante UX-TEST-01.
- UX-TEST-01, PERSIST-01, REPORT-01, performance frontend
  (lazy-load pdfmake, memoización, virtualización): sin abrir.

### Estado

**D-δ.79 -- CERRADA.** Publicada como `v0.4.0-beta.5` sobre el mismo
hosting; el tag apunta al commit desplegado, `beta.1`–`beta.4` no se
mueven. **UX-TEST-01 -- NO iniciar. REPORT-01 -- NO iniciar.**

## D-δ.80 -- QA-FUZZ-01: harness de testing secuencial con Playwright -- CERRADA

Infraestructura **persistente** de testing E2E para detectar de forma
sistemática crashes, pantallas blancas, estados stale y combinaciones
inválidas de UI. **No corrige bugs de dominio**: los captura, reproduce y
documenta. No hay versión pública nueva por sí sola: la versión funcional
sigue siendo **`v0.4.0-beta.5`** (esta corrida sólo agrega
tests / workflows / docs; `dist` no cambia).

Documentación operativa completa: **`QA-FUZZ.md`**.

### Infraestructura

- **Playwright** `@playwright/test` como devDependency estándar (no había
  E2E previo; el manifest cambió por necesidad — brief §57). Chromium.
- `playwright.config.ts`: `baseURL` = `IUAS_BASE_URL` ?? beta pública;
  proyectos `desktop` (1280×900) y `mobile` (Pixel 5, 390×844);
  `trace: retain-on-failure`, `screenshot: only-on-failure`, `video: off`;
  `workers` bajo (reproducibilidad > velocidad); `retries: 0` (fail-fast
  por run). `IUAS_PREVIEW=1` levanta `vite preview` en `/IUAS/`.
- `tests/e2e/` = specs; `tests/e2e/qa/` = helpers + unit tests. Los módulos
  puros (`prng`, `tipos`, `deteccionBlanco`, `tokensProhibidos`, núcleo de
  `generador`) no importan Playwright en runtime → sus unit tests corren en
  Vitest. `vite.config.ts` acota `test.include` para excluir los
  `*.spec.ts` de Playwright.
- `tsconfig.e2e.json` + `npm run e2e:typecheck` type-checkean el harness
  **aparte** de `tsc -b` (el baseline de build sigue siendo `src` +
  `vite.config.ts`, intacto).
- `eslint.config.js`: bloque nuevo para `tests/**` + `playwright.config.ts`
  (globals node + browser; `no-empty-pattern` off por el destructuring
  obligatorio de Playwright). Baseline de lint intacto: 11 / 0 / 0.
- `.gitignore`: `qa-results/`, `playwright-report/`, `test-results/`,
  `blob-report/`, `playwright/.cache/`. No se commitean resultados.

### PRNG y reproducibilidad

- `qa/prng.ts` — mulberry32 (dominio público), 32 bits de estado, sin
  dependencias. Nunca `Math.random()`. Seed textual → uint32 (FNV-1a).
- Seed de un run = `` `${seedBase}:${run}` ``. **Misma seed ⇒ misma
  secuencia** (unit tests en `qa/prng.test.ts` y `qa/generador.test.ts`:
  determinismo, ponderación por peso, peso 0 nunca elegido, barajado
  estable, serialización estable).
- Replay: `IUAS_FUZZ_SEED=<n> IUAS_FUZZ_RUNS=1 IUAS_FUZZ_STEPS=<n> npm run
  e2e:fuzz`; `IUAS_FUZZ_MAX_STEP` para acotar por bisección.

### Acciones (con precondiciones, sin `setState`)

M1: irADemanda, agregar/duplicar/colapsar UF, agregar Local, cambiar
tipo/régimen de Local, agregar/seleccionar/cambiar tipo/cambiar
cantidad/eliminar Artefacto, eliminar Local/UF, **resolverConectividad**
(AF / AC / AF+AC / Cancelar). M2: nav, modo Rápido/Profesional, pérdida
distribuida (Hazen/Darcy), pérdida localizada (Estimadas/Detalladas),
granularidad (Simplificada/Profesional), material, expandir fila, DN ↓/↑/Auto,
editar longitud. M3: nav, **Iniciar Módulo 3**, Propiedad horizontal,
**ACS individual/central**, excepción por UF, DN medidor ↓/↑. M4: nav,
esquema inicial / alternar esquema, Tc (`'' / 1 / 2 / 4 / 6`), DN conexión,
presión sobre acera (`4 / 12 / 20`), desnivel (`0 / 5 / 10 / -2`), volumen
adoptado. GLOBAL: navegar sección, cambiar hash, cambiar viewport, recargar.
Pesos **no uniformes**: zonas sospechosas (conectividad, ACS central,
Iniciar M3, tipo de artefacto, modo, PH, esquema M4, duplicar UF) por
encima de la media.

### Invariantes por paso

`pantalla-no-blanca` (detector puro `evaluarPantalla`), `sin-pageerror`,
`sin-console-error` (filtra ruido conocido), `sin-request-esencial-fallido`
(NETWORK: 4xx/5xx o `requestfailed` en documento/script/stylesheet /
`/assets/*.js|css`), `sin-valores-rotos` (`NaN`/`Infinity`/`undefined`/
`null`/`[object Object]` con guardas anti falso positivo),
`sin-ids-internos-visibles` (`uf-<uuid v4>`; los ids legibles del ejemplo
no cuentan), `sin-codigos-de-validacion-visibles` (camelCase interno),
`sin-overflow-horizontal` (viewport actual), `demanda-sigue-viva`
(condicional: un error downstream no apaga M1/Qc).

### Specs

`smoke.spec.ts` (camino feliz determinista, 5 secciones, 0 error),
`catalogo-conectividad.spec.ts` (17 artefactos × {agregar, AF, AC, AF+AC},
matriz → `qa-results/catalog-connectivity-report.{json,md}`),
`sequence-fuzz.spec.ts` (fuzz reproducible; un `test()` por run para
aislar trace/screenshot), `crash-observado.spec.ts` (escenarios A/B/C del
brief §26), `hallazgos.spec.ts` (bugs de app ya encontrados, `test.fail`).

### CI

`.github/workflows/qa-fuzz.yml` — Playwright puro, **sin API de Claude, sin
deploy, sin tocar Pages** (brief §33). `workflow_dispatch`
(`base_url` / `runs` / `steps` / `seed`) + `schedule` nocturno
`30 3 * * *` UTC (`runs=50 × steps=30`). Artifacts subidos siempre,
retención 7 días. Acciones ancladas por hash. Un fallo del fuzz deja el job
rojo: **no** significa que el harness falló (brief §59/§60); el artifact
trae `clase` = APP / HARNESS / NETWORK.

### Hallazgo — FIX-LEAK-01 (bug de app, NO corregido aquí)

`src/interfaz/paginas/PanelDeMedidoresDeModulo3.tsx` (~L351), rama
`estado === 'error'`, pinta `problema.problema.codigo` **crudo**
(`<li>{problema.problema.codigo}</li>`) en vez de un mensaje humano — M1
sí humaniza el mismo código. Repro determinista: iniciar M3 → Propiedad
horizontal → ACS central → longitud de un tramo = `0` → volver a Medidores
⇒ aparece el texto `redHidraulicaTramoLongitudNoPositiva`. Repro por fuzz:
`IUAS_FUZZ_SEED=424242 IUAS_FUZZ_RUNS=1 IUAS_FUZZ_STEPS=12` → step 10
(`editarLongitudTramo=0`), 3/3 replays idénticos. Severidad media (leak de
copy interno, brief §13-H; no es crash ni pantalla blanca). Registrado en
`tests/e2e/hallazgos.spec.ts` (`test.fail`) y en
`qa/invariantes.ts → HALLAZGOS_CONOCIDOS` (para que el fuzzer no se detenga
siempre en él y siga encontrando bugs nuevos; sigue loggeado como
`hallazgo-conocido`).

### Deudas registradas / reafirmadas

- **FIX-LEAK-01** — M3 muestra códigos internos de validación (nuevo).
- **FIX-CRASH-01** — pantallas blancas dependientes de secuencia (si
  QA-FUZZ las reproduce en una corrida futura).
- **CAT-CONN-01** — revisar qué artefactos *deberían* preguntar
  conectividad; la matriz del catálogo es su evidencia.
- **DEFENSE-01** — ErrorBoundary con estado Proyecto preservado (posterior
  al fix raíz; NO implementar aquí — brief §47).
- **GEOM-UX-01** — herencia de cotas UF → Local → terminal (NO tocar —
  brief §49).
- **MODE-UX-01** — preset Profesional (Hazen + Estimadas + Simplificada)
  (NO tocar — brief §50).
- UX-TEST-01, PERSIST-01, REPORT-01, performance frontend: sin abrir.

### Estado

**D-δ.80 -- CERRADA.** Sin cambios funcionales; versión pública funcional
`v0.4.0-beta.5` intacta. Baseline: Vitest core intacto + 42 unit tests
nuevos del harness; `tsc -b` verde; `npm run build` verde; ESLint
11 / 0 / 0 (sin regresión). Tags sin mover. Snapshot
`resguardo-documentacion/2026-09-08_pre-UI-01B/` intacto. **UX-TEST-01 --
NO iniciar. REPORT-01 -- NO iniciar. FIX-LEAK-01 / FIX-CRASH-01 -- NO
iniciar en esta corrida.**

## D-δ.81 -- QA-CI-01: estabilizar la seed del sequence fuzz en CI -- CERRADA

Corrección de infraestructura de test. Sin cambios funcionales; versión
pública sigue **`v0.4.0-beta.5`**. Alcance limitado a
`.github/workflows/qa-fuzz.yml`, `tests/e2e/**` y documentación.

### Causa raíz (HARNESS, no APP)

El primer run cloud de QA-FUZZ-01 (`workflow_dispatch`, 20×30, `seed`
vacía) falló **sólo** en el job `Sequence fuzz`: los 40 tests
(20 desktop + 20 mobile) fallaron en 0 ms con
`Test not found in the worker process. Make sure test title does not
change.` Los demás jobs (unit tests, smoke, catálogo, escenarios) pasaron.

`tests/e2e/sequence-fuzz.spec.ts` calculaba la seed base **durante el
import**:

```
const SEED_BASE = process.env.IUAS_FUZZ_SEED?.trim()
  || String((Date.now() ^ (process.pid << 16)) >>> 0)
```

y esa seed va en el **título** de cada `test()`
(`` `run ${run} · seed ${seedBase}:${run}` ``). Playwright importa el spec
en procesos distintos: el *coordinator* para el discovery y cada *worker*
para ejecutar. Con `IUAS_FUZZ_SEED` ausente, cada proceso evaluaba
`Date.now() ^ pid` y obtenía una seed distinta ⇒ los títulos descubiertos
no coincidían con los registrados en el worker. Con `IUAS_FUZZ_SEED=424242`
(la seed usada en casi toda la validación local de QA-FUZZ-01) la seed era
constante entre procesos y el bug quedaba invisible. En CI el workflow
pasaba `IUAS_FUZZ_SEED: ${{ github.event.inputs.seed }}` = `''` cuando el
usuario dejaba `seed` en blanco ⇒ se activaba el fallback inestable.

**El primer run cloud de QA-FUZZ-01 NO constituyó una corrida fuzz válida**:
falló en discovery, antes de ejecutar ninguna acción.

### Corrección

- **`tests/e2e/qa/seed.ts`** (nuevo): `resolverSeedBase(valorEnv)` — función
  **pura y determinista del argumento**. `IUAS_FUZZ_SEED` explícita ⇒ se usa
  tal cual; ausente / `''` / sólo espacios ⇒ `SEED_LOCAL_POR_DEFECTO`
  (`'424242'`, fijo y documentado). Nunca `Date.now`, `process.pid`,
  `Math.random`, `crypto`, timestamp ni UUID. `seedDeRun(base, run)`
  mantiene el esquema `` `${base}:${run}` ``.
- **`sequence-fuzz.spec.ts`**: `const SEED_BASE =
  resolverSeedBase(process.env.IUAS_FUZZ_SEED)`. La colección de tests pasa
  a ser función determinista del environment.
- **`.github/workflows/qa-fuzz.yml`**: paso nuevo «Resolver seed de QA
  fuzz» (tras checkout, antes de todo Playwright). Si el dispatch trae
  `seed` ⇒ se respeta; si viene vacía ⇒ `SEED="${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}"`
  (estable dentro del job, distinta entre runs). Se escribe **una vez** en
  `$GITHUB_ENV` como `IUAS_FUZZ_SEED` (todos los procesos hijos —
  coordinator + workers — la heredan idéntica) y en `$GITHUB_STEP_SUMMARY`
  como `QA fuzz seed base: <valor>` + comando de replay local. Se quitó
  el `env: IUAS_FUZZ_SEED` a nivel de job.
- **`tests/e2e/qa/seed.test.ts`** (nuevo, 10 tests): passthrough de seed
  explícita; fallback local fijo y estable (1000 resoluciones idénticas);
  pureza (no lee `process.env`); determinismo de la derivación por run
  (mismo run ⇒ misma secuencia; run distinto ⇒ secuencia distinta y
  reproducible); seed numérica del workflow reproducible; **guarda
  anti-regresión** que escanea el código (sin comentarios) de `seed.ts` y
  `sequence-fuzz.spec.ts` y falla si reaparece `Date.now` / `Math.random` /
  `process.pid` / `crypto.random*` / `performance.now` / `hrtime`.

### Comportamiento resultante

| Contexto | Seed base |
| --- | --- |
| local, `IUAS_FUZZ_SEED=424242` | `424242` (idéntico en todos los procesos) |
| local, sin `IUAS_FUZZ_SEED` | `424242` (fallback fijo) — antes: `Date.now()^pid` distinto por proceso |
| CI dispatch con `seed=N` | `N`, exportada por el workflow |
| CI dispatch / schedule sin `seed` | `${GITHUB_RUN_ID}-${GITHUB_RUN_ATTEMPT}`, resuelta una vez, visible en el step summary |

`fuzz sin seed` y `fuzz IUAS_FUZZ_SEED=424242` producen resultados
**byte-idénticos** (verificado local, RUNS=2 STEPS=3, desktop + mobile).

### Hallazgo surgido al arreglar QA-CI-01 -- FIX-RESP-01 (APP, NO corregido)

Con el fuzz ya funcional, la primera corrida corta sin seed (fallback
`424242`) rompió en **run 1 · step 1 · `cambiarGranularidad=profesional` ·
proyecto mobile (390 px)**: invariante `sin-overflow-horizontal` —
`document.documentElement.scrollWidth 593 > clientWidth 390` (el `body`
también). Sonda de causa: `table.tabla-tecnica` del detalle de M2
Profesional (`min-width: 40rem`, `overflow-x: visible`, **sin** envoltura
`.tabla-scroll`) y un `<a>` de la navegación llegan a `right ≈ 654` /
`724`. Determinista (3/3), sólo mobile (desktop con la misma seed pasa).
Clasificación **APP** (layout/responsive; sin `pageerror`/`console.error`).
**Fuera de alcance QA-CI-01**: no se corrige, no se tocan invariantes ni
`HALLAZGOS_CONOCIDOS`. Evidencia en `qa-results/seed-424242_1-run1/`.
Deuda: **FIX-RESP-01** (al abrirla, sumar el patrón a `HALLAZGOS_CONOCIDOS`
para que el fuzz no se detenga siempre ahí, igual que FIX-LEAK-01).

### Estado

**D-δ.81 -- CERRADA.** Sin cambios funcionales; `v0.4.0-beta.5` intacta.
Baseline: Vitest 1353 → **1363** (+10 tests de `seed.test.ts`); `tsc -b`
verde; `npm run e2e:typecheck` verde; `npm run build` verde; ESLint
11 / 0 / 0 (sin regresión). Playwright local: smoke, catálogo (37/37),
escenarios + hallazgos verdes; fuzz corto sin seed y con `424242`
byte-idénticos (surge FIX-RESP-01, APP, no corregido). Tags sin mover.
Snapshot `resguardo-documentacion/2026-09-08_pre-UI-01B/` intacto.
**FIX-LEAK-01 / FIX-RESP-01 / FIX-CRASH-01 / CAT-CONN-01 -- NO iniciar en
esta corrida. UX-TEST-01 -- NO iniciar. REPORT-01 -- NO iniciar.**

## D-δ.82 -- FIX-RESP-01: contener el overflow horizontal responsive de M2 -- CERRADA

Fix responsive puntual (NO es GEOM-UX-01 ni un rediseño). Sin cambios de
cálculo, dominio, cotas, textos hidráulicos ni modo Profesional. Alcance:
`src/interfaz/paginas/navegacionUI.css`,
`src/interfaz/paginas/sistema-visual.css`, `tests/e2e/**`, documentación y
el workflow de QA fuzz. Versión pública funcional sigue **`v0.4.0-beta.5`**
(no se decide release por esto).

### Síntoma y detección

El fuzz de QA-CI-01, ya funcional en la nube, rompió de forma
**determinista** en `run 1 · step 1 · cambiarPerdidaLocalizada=detallado`,
proyecto **mobile**: la invariante `sin-overflow-horizontal` reportó
`documentElement.scrollWidth > clientWidth` (cloud: 390 → +258 px;
360 → +89 px). Local (fallback seed `424242`) reproduce +203 px a 390 px.
Sin `pageerror` ni `console.error` ⇒ clasificación **APP / layout
responsive**.

### Causa raíz (sonda del árbol de ancestros, no asumida)

1. **`.app-modo`** (cabecera global, `navegacionUI.css`) tenía
   `flex: 0 0 auto`. Cuando la config de M2 deja el modo derivado en
   `avanzado` (mezcla Rápido/Profesional) aparece el badge
   *"Avanzado · combinación técnica personalizada"*; con él, `.app-modo`
   tomaba su ancho **max-content** (≈ 585 px) y, al no poder encogerse,
   empujaba el documento en horizontal.
2. **`<fieldset>.config-hidraulica__grupo`** (`sistema-visual.css`) traía
   `min-inline-size: min-content` del user-agent — los `<select>` de
   opciones largas ("Detalladas (relevamiento de accesorios)"…) marcaban
   ese min-content y el fieldset ignoraba el ancho del padre (+9 px).

Las `table.tabla-tecnica` **ya** estaban contenidas por `.tabla-scroll`
(scroll interno correcto): NO eran la causa. La hipótesis previa
("tabla sin wrapper") quedó descartada por la sonda.

### Fix estructural

Nada de `overflow-x: hidden` global, clipping, ni ocultar contenido, ni
reducir tipografías o columnas.

- `navegacionUI.css`, dentro de `@media (max-width: 900px)`:
  - `.app-modo { flex: 1 1 100%; min-width: 0 }` — ocupa su propia línea
    (mismo patrón que `.app-aviso-piloto`); su `flex-wrap` reparte
    etiqueta + segmentado + badge dentro del viewport.
  - `.app-modo .ui-badge--muted { white-space: normal }` — el badge largo
    puede envolver si hiciera falta.
- `sistema-visual.css`:
  - `.config-hidraulica__grupo { min-width: 0 }` — el fieldset se comprime
    al ancho disponible y `flex-wrap` hace su trabajo.
  - `.config-hidraulica__grupo > label { min-width: 0; max-width: 100% }`.
  - `.config-hidraulica__grupo select { max-width: 100%; min-width: 0 }` —
    el `<select>` cerrado trunca la opción larga; la lista completa sigue
    disponible al abrir.

### Regresión

`tests/e2e/responsive.spec.ts` (nuevo). Para 390×844, 360×800 y 1280×900,
tras llevar M2 a «Detalladas + Profesional» y expandir filas:

- `documentElement.scrollWidth` y `body.scrollWidth` ≤ `clientWidth + 1`;
- toda `.tabla-scroll` visible queda **dentro** del viewport;
- en móvil, al menos una tabla técnica **scrollea dentro de su
  contenedor** (`wrapper.scrollWidth > clientWidth`) — prueba de que el
  ancho se **contuvo**, no se escondió;
- la invariante genérica del harness y la vitalidad de la app
  (`marcadorIuas`, texto útil) siguen verdes.

Se agrega al paso «Escenarios observados + regresión responsive» de
`.github/workflows/qa-fuzz.yml`.

### Verificación

Sonda local contra un serve estático del build (`dist` servido tal cual lo
sirve GitHub Pages): a 390 / 360 / 1280 px, `doc = clientWidth`, tablas con
scroll interno (`SCROLL(649/374)` …) en móvil y `flat(920/920)` en
desktop. `responsive.spec.ts` 3/3 verde contra ese serve.
(`vite preview` local reusaba un server viejo con `dist` stale y daba un
falso negativo; el serve estático fresco y — tras el deploy — producción
son la referencia.)

### Estado

**D-δ.82 -- CERRADA.** Baseline: Vitest **1363/1363** (CSS no toca unit
tests); `tsc -b` verde; `npm run e2e:typecheck` verde; `npm run build`
verde; ESLint 11 / 0 / 0 (sin regresión). Playwright: smoke / catálogo /
escenarios / hallazgos verdes; `responsive.spec.ts` 3/3; fuzz corto
estable. `HALLAZGOS_CONOCIDOS` intacto (FIX-RESP-01 se corrigió antes de
agregarse). Tags sin mover; snapshot `resguardo-documentacion/` intacto.
**FIX-LEAK-01 / FIX-CRASH-01 / CAT-CONN-01 / DEFENSE-01 / GEOM-UX-01 /
MODE-UX-01 -- NO iniciar. UX-TEST-01 / REPORT-01 -- NO iniciar.**

## D-δ.83 -- FIX-RESP-02: acotar el <select> de excepción de ACS de M3 -- CERRADA

Segundo fix responsive puntual (NO GEOM-UX-01, NO rediseño). Sin cambios
de cálculo, dominio, cotas, textos ni normativa. Alcance:
`src/interfaz/paginas/sistema-visual.css` (una regla global),
`tests/e2e/responsive.spec.ts`, documentación. Versión pública funcional
sigue **`v0.4.0-beta.5`**.

### Detección

Fuzz de QA-CI-01, seed base `34365102807-1`, **run 17 · step 28**
(`cambiarExcepcionACSporUF=default`, proyecto **mobile**): la invariante
`sin-overflow-horizontal` reportó `documentElement.scrollWidth 433 >
clientWidth 390` (+43 px). Sin `pageerror`/`console.error` ⇒ **APP /
layout**. Reproducción local determinista a **360 px** (+26 px); a 390 px
en Windows/Chromium no desborda (los glyphs del stack de fuente son más
angostos que en el Linux del runner — misma causa estructural, distinto
umbral de viewport).

### Causa raíz (sonda del árbol de ancestros)

El `<select>` de cada fila del `<details>` «Configurar excepciones por
unidad funcional» de M3 ofrece la opción
**`Usar el valor por defecto (Individual en cada unidad)`** (~50
caracteres; el texto más largo aparece cuando la Provisión ACS por defecto
está en `individual`). Un `<select>` sin `max-width` toma como ancho
intrínseco el de su opción más larga (min-content); las reglas globales de
controles de `sistema-visual.css` no lo acotaban. Ese ancho empujaba el
`<label>` / `<p>` de la fila (elementos sin clase, sólo UA + globales) y,
con ellos, el documento. El `<details>` cerrado no renderiza layout, por
eso sólo se disparaba al abrirlo (acción `cambiarExcepcionACSporUF`).

No es el patrón de FIX-RESP-01 (ahí eran `.app-modo` y un `<fieldset>`).

### Fix estructural

`sistema-visual.css`, en el bloque de controles:

```
select {
  max-width: 100%;
  min-width: 0;
}
```

Acota **todos** los `<select>` de la app al ancho disponible (el texto de
la opción cerrada se trunca de forma nativa; la lista completa sigue
disponible al abrir) y permite que un `<select>` dentro de un contenedor
flex/grid pueda encogerse. Resuelve la **clase entera** del bug (la regla
scoped `.config-hidraulica__grupo select` de FIX-RESP-01 queda redundante
pero se deja por claridad local). Sin `overflow-x: hidden` global, sin
clipping, sin ocultar el control, sin tocar tipografías.

### Regresión

`tests/e2e/responsive.spec.ts` → bloque **FIX-RESP-02** (3 tests, 390 /
360 / 1280 px). Estado mínimo construido explícitamente: 2 UF extra +
Iniciar M3 + Propiedad horizontal + Provisión ACS `individual` + abrir el
`<details>` + `cambiarExcepcionACSporUF=default`. Verifica: documento sin
overflow (`≤ clientWidth + 1`), el `<select>` de excepción **visible,
habilitado y dentro del viewport**, invariante genérica del harness y
vitalidad de la app OK. El test **falla** contra la producción pre-fix a
360 px (regresión real). Corre en el paso «Escenarios observados +
regresión responsive» del workflow (`responsive.spec.ts` ya estaba
listado).

### Verificación

- Sonda local (serve estático del `dist`, como GitHub Pages): 320 / 360 /
  390 / 1280 px → documento sin overflow, `<select>` de excepción visible;
  barrido de las 5 secciones + tipología larga → sin overflow ni regresión
  a 360 y 1280.
- Replay fuzz seed `34365102807-1` **run 17** (30 pasos) contra el build
  fijo: **2/2** (desktop + mobile), sin overflow.
- Replay seed `34360767880-1` (FIX-RESP-01) y `424242` contra producción:
  verdes, sin cambios.
- (Un fallo transitorio de `run 17 desktop` bajo 2 workers paralelos
  contra el mini-servidor estático local resultó ser contención de esa
  infra de prueba, no de la app: con `--workers=1` pasa 2/2. Idéntico
  origen para un fallo puntual de `«Bañera» AC` en `catalogo` contra
  GitHub Pages, verde al reintentar.)

### Estado

**D-δ.83 -- CERRADA.** Baseline: Vitest **1363/1363** (CSS no toca unit
tests); `tsc -b` / `npm run e2e:typecheck` / `npm run build` verdes;
ESLint 11 / 0 / 0 (sin regresión). Playwright: smoke / catálogo (37/37) /
escenarios / hallazgos verdes; `responsive.spec.ts` **6/6**
(FIX-RESP-01 + FIX-RESP-02); fuzz corto estable. `HALLAZGOS_CONOCIDOS`
intacto; `FIX-LEAK-01` sin tocar. Tags sin mover; snapshot
`resguardo-documentacion/` intacto. **FIX-LEAK-01 / FIX-CRASH-01 /
CAT-CONN-01 / DEFENSE-01 / GEOM-UX-01 / MODE-UX-01 -- NO iniciar.
UX-TEST-01 / REPORT-01 -- NO iniciar.**

## D-δ.84 -- CAT-CONN-01: conectividad física por política de catálogo, sin precedentes -- CERRADA

Incremento funcional de alcance medio. Cambia CÓMO se decide la
conectividad física inicial (AF / AC / AF+AC) de un artefacto. NO toca
ninguna fórmula hidráulica, ni la simultaneidad, ni CRIT-A15, ni el
schema de `Proyecto` (`SCHEMA_VERSION_ACTUAL` intacto, `migraciones`
sigue `[]`). Versión pública funcional sigue **`v0.4.0-beta.5`** (tags
sin mover).

### Problema

`determinarRedesFisicasPorPrecedente` decidía la conectividad de un
artefacto nuevo copiándola de otra instancia del mismo `artefactoId` de
catálogo ya conectada **en cualquier UF/Local del proyecto**; si no había
ninguna, o había patrones contradictorios, mostraba el banner AF/AC/AF+AC.
El proyecto de ejemplo tiene 9 tipos conectados (lavatorio, ducha, bidet,
inodoro a depósito, pileta de cocina, lavavajillas doméstico, pileta de
lavar, lavarropas doméstico, canilla de servicio), así que esos 9 nunca
preguntaban y los otros 7 (inodoro con válvula, bañera, válvula de
mingitorio, pileta de cocina industrial, lavavajillas industrial,
lavarropas industrial, lavachatas) siempre preguntaban. Comportamiento
dependiente del contenido accidental del demo, no del artefacto.

### Principio de dominio (cerrado, criterio IUAS -- no ERAS)

`quTotal` / `quFria` / `quCaliente` son datos HIDRÁULICOS de demanda; no
son la fuente de verdad de la cantidad/tipo de alimentaciones físicas.
Prohibido inferir la conectividad de `qu`, del label, del nombre, de
`includes()`, de un switch de UI por texto, o de un precedente del
proyecto. La conectividad inicial sale de una política explícita por tipo;
la conectividad no estándar de una instancia sale de un override
explícito de esa instancia. `redHidraulica` sigue siendo la fuente
EFECTIVA que consume Módulo 2 (CRIT-A15): la política sólo fija qué
terminales se crean/reconcilian.

### Política de catálogo

`src/normativa/eras-2023/catalogo-artefactos/politicaConectividad.ts`
(archivo separado de `index.ts`, que es transcripción normativa pura):

| política | tipos | comportamiento |
| --- | --- | --- |
| `automatica` (referencia) | inodoroValvula→AF, banera→AF+AC, receptaculoDucha→AF+AC, bidet→AF+AC, lavatorio→AF+AC, inodoroDeposito→AF, piletaDeCocina→AF+AC, piletaDeLavar→AF+AC, valvulaMingitorio→AF, piletaDeCocinaIndustrial→AF+AC, lavachatas→AF, canillaDeServicio→AF | conecta de inmediato, sin preguntar, sin editor |
| `defaultConfigurable` (referencia + opciones) | maquinaLavavajillas→AF default, maquinaLavarropas→AF default; opciones `[soloAF, ambas]` (nunca AC sola) | conecta AF de inmediato; editor discreto `Alimentación [AF] [AF+AC]` en la fila de M1 |
| `requiereSeleccion` (opciones) | lavavajillasIndustrial, lavarropasIndustrial; opciones `[soloAF, soloAC, ambas]` | sin default: al incorporarlo se pide declarar la alimentación |

`lavachatas` de esta tabla es el artefacto sanitario ERAS (depósito
automático / válvula de limpieza), AF. Una máquina lavachatas /
washer-disinfector moderna sería un tipo de catálogo futuro distinto.

Test de completitud: todo artefacto del catálogo tiene exactamente una
política; un `artefactoId` sin política resuelve `tipoDesconocido` (falla
visible/testeable, nunca un default silencioso).

### Modelo

`Artefacto.conectividadElegida?: ConectividadFisica` -- opcional,
backward-compatible, **sin migración** (`SCHEMA_VERSION_ACTUAL` no cambia;
un Proyecto guardado antes resuelve por política de catálogo). Ausente =
usar la política. Presente = decisión de instalación real de esa
instancia, tomada por el usuario:
- `requiereSeleccion`: se guarda al declarar la alimentación (ausencia =
  todavía sin declarar);
- `defaultConfigurable`: se guarda al personalizar; volver exactamente al
  default AF **normaliza** el campo a ausente (sólo marca elecciones NO
  estándar).

`ConectividadFisica` (`'soloAF' | 'soloAC' | 'ambas'`) se movió a
`modelo/redHidraulica` como vocabulario de dominio compartido;
`determinarConectividadFisica` la re-exporta para los consumidores
históricos.

### Resolver puro

`src/motor/tuberias/topologia/resolverConectividadInicialDeArtefacto.ts`:
`(artefactoIdCatalogo, conectividadElegida?)` →
`{ tipo:'resuelta', conectividad, redes }` | `{ tipo:'requiereSeleccion',
opcionesPermitidas }` | `{ tipo:'tipoDesconocido' }`. Precedencia:
override de instancia (si la política lo admite) → política de catálogo →
nada. `automatica` NUNCA honra un override (no hay UI para setearlo; suele
ser stale de un tipo anterior). Incluye la única conversión
`ConectividadFisica ↔ RedDeTramo[]` del repo (`redesDeConectividadFisica`
/ `conectividadFisicaDeRedes`).

### Flujo de M1

- **ALTA** (`altaDeArtefacto`): resuelve política. `resuelta` →
  `sincronizarConectividadFisicaDeArtefactoConRedesDeclaradas` con esas
  Redes, sin banner. `requiereSeleccion` → fila creada sin terminales +
  selector de alimentación para esa fila (copy: "… requiere que declares
  su alimentación"). Cancelar en ALTA sigue eliminando la fila (brief
  §17), nunca inventa conectividad.
- **Editor `defaultConfigurable`**: `EditorDeConectividad` en la fila,
  opciones de la política (sin `if` por artefactoId), reusa `.ui-segmented`.
  Cambiar → fija `conectividadElegida` (con normalización) y
  `reconciliarConectividadFisicaPorCambioDeArtefacto` agrega/quita SÓLO la
  Red que cambia, preservando la otra rama (longitud/accesorios/DN).
- **Cambio de tipo**: reconcilia contra la política del tipo NUEVO. Se
  limpia siempre `conectividadElegida` del tipo anterior. Hacia
  `requiereSeleccion` sobre un artefacto **ya conectado**: transacción
  pendiente -- el `<select>` muestra el tipo nuevo pero Proyecto conserva
  tipo y topología anteriores hasta confirmar la alimentación en el
  selector; Cancelar restaura. Hacia el resto: se aplica de inmediato.

### Precedente retirado

`determinarRedesFisicasPorPrecedente` (+ test) eliminado. Ya no participa
de alta / cambio de tipo / duplicación / apertura del banner. La variante
`sincronizarConectividadFisicaDeArtefacto` (por precedente) y su resultado
`redesNoDeterminables` se retiraron; queda sólo `...ConRedesDeclaradas`.
No hay fallback oculto "si no hay política → precedente".

### Duplicar UF

`duplicarUnidadFuncionalEnProyecto` conserva la conectividad DISEÑADA del
original: `conectividadElegida` si existe, si no la conectividad real
derivada de la topología del original (que sigue conectado). Un
`lavavajillasIndustrial` seleccionado AF+AC se clona AF+AC sin volver a
preguntar. Ya no depende de que el original sirva como "precedente".

### CRIT-A15 -- sin regresión

`determinarConectividadFisica` y `resolverQuEfectivoParaTramo` leen la
topología resultante; no les importa cómo se decidieron los terminales.
`piletaDeCocinaIndustrial` pasa a AF+AC automática: rama AF = `quTotal`,
rama AC = `quTotal`, tramo común aguas arriba = `quTotal` una sola vez
(nunca `2×quTotal`) -- comportamiento conservador de la ampliación de
CRIT-A15 (D-δ.79), verificado en `catConn01.integracion.test.ts`.

### Matriz QA (objetivo alcanzado)

`tests/e2e/catalogo-conectividad.spec.ts` asevera: exactamente **2** tipos
piden selección (`lavavajillasIndustrial`, `lavarropasIndustrial`), **14**
no; independiente del contenido del proyecto. AF/AC/AF+AC de los dos
industriales sin crash.

### GAP conocido -- edición posterior de `defaultConfigurable`

Antes de CAT-CONN-01 no existía NINGUNA forma de editar la conectividad de
un artefacto ya conectado (sólo cambiar tipo y volver, o eliminar y
recrear). Este incremento **cierra** ese hueco para
`maquinaLavavajillas` / `maquinaLavarropas` con el editor discreto de la
fila. Para los tipos `automatica` sigue sin haber (ni hace falta: su
conectividad es fija por diseño). Para `requiereSeleccion` la única
edición posterior es cambiar el tipo (que reabre la selección).

### Estado

**D-δ.84 -- CERRADA.** Baseline: Vitest **1394 / 1394** (1363 → 1394,
+31 neto: nuevos tests de `politicaConectividad`,
`resolverConectividadInicialDeArtefacto` y la integración CAT-CONN, menos
los de `determinarRedesFisicasPorPrecedente` retirados y la fusión de la
suite de `sincronizarConectividadFisicaDeArtefacto`); `tsc -b` /
`npm run e2e:typecheck` /
`npm run build` verdes; ESLint 11 / 0 / 0 (sin regresión -- los 11
preexistentes intactos). Playwright contra build/dev local:
`catalogo-conectividad.spec.ts` **23/23**, `smoke` / `crash-observado`
(3 escenarios) / `responsive.spec.ts` **6/6** (FIX-RESP-01 + FIX-RESP-02)
verdes; fuzz corto `seed 424242 · 15 pasos` verde. Baseline funcional
M1-M4 del demo intacta (los `maquinaLavavajillas` / `maquinaLavarropas`
del proyecto de ejemplo ya eran AF-only en su topología, coherente con la
política -- Qc y goldens sin cambio). `HALLAZGOS_CONOCIDOS` intacto;
`FIX-LEAK-01` sin tocar. Tags sin mover; snapshot
`resguardo-documentacion/` intacto. **FIX-LEAK-01 / FIX-CRASH-01 /
DEFENSE-01 / GEOM-UX-01 / MODE-UX-01 / UX-TEST-01 / REPORT-01 -- NO
iniciar.**

### Nota infra (no bloqueante, fuera de alcance)

El flujo `IUAS_PREVIEW=1` de Playwright sirve el build con `base: '/'`
(config: `command !== 'build'` en `vite.config.ts`), pero el `index.html`
del build referencia `/IUAS/assets/...` → los assets dan 404 y `#root`
queda vacío. La verificación E2E local de este incremento se hizo contra
`vite` dev (`IUAS_BASE_URL=http://localhost:<port>/`), que sí funciona. El
CI y el flujo por defecto apuntan a producción, no afectados.

## D-δ.85 -- FIX-LEAK-01: humanizar los errores de validación en M3 -- CERRADA

Fix de **presentación** puntual. No modifica validaciones, tipos de error
del dominio, reglas de completitud, ni cuándo M3 entra en estado de error:
sólo cambia **qué texto ve el usuario**. Alcance:
`src/interfaz/paginas/mensajesDeValidacion.ts` (nuevo) + `.test.ts`,
`MotorDemandaPantalla.tsx` (M1), `PanelDeMedidoresDeModulo3.tsx` (M3),
`tests/e2e/hallazgos.spec.ts`, `tests/e2e/qa/invariantes.ts`,
documentación. Versión pública funcional sigue **`v0.4.0-beta.5`**.

### Causa raíz

`PanelDeMedidoresDeModulo3.tsx`, rama `estado.estado === 'error'`,
renderizaba `problema.problema.codigo` **crudo**
(`<li>{problema.problema.codigo}</li>`). La tabla de mensajes humanos
`MENSAJES_DE_VALIDACION` (`Record<CodigoValidacion, string>`, completa)
vivía como `const` **local** dentro de `MotorDemandaPantalla.tsx` (M1),
inaccesible desde M3. Repro (fuzz seed `424242`, step ~10,
`editarLongitudTramo=0`): iniciar M3 + PH + ACS central + longitud de
tramo `0` → M3 en error mostrando `redHidraulicaTramoLongitudNoPositiva`.
`src/validacion/codigos` sí tiene descripciones, pero son **técnicas**
(nombres de campo, CRIT, camelCase): no son copy de usuario.

### Solución

- **`src/interfaz/paginas/mensajesDeValidacion.ts` (nuevo, capa de
  interfaz, NO dominio):**
  - `MENSAJES_DE_VALIDACION` — la tabla, extraída de M1 y exportada.
  - `MENSAJE_DE_VALIDACION_GENERICO` = "Hay un dato de la instalación que
    debe corregirse antes de continuar."
  - `describirProblemaDeValidacion(codigo)` — **política segura**: código
    conocido → su frase; código desconocido / no-string / vacío →
    genérico. Nunca el identificador, `undefined` ni `[object Object]`.
- **M1 y M3 consumen la MISMA función.** Una sola traducción humana por
  código, con el mismo comportamiento defensivo en ambos módulos. La copy
  de `redHidraulicaTramoLongitudNoPositiva` se unificó a "La longitud de un
  tramo debe ser mayor que cero." (estilo declarativo del resto de la
  tabla). Ningún test asevera esa frase; sólo el código.
- **Auditoría de la rama de error de M3** (PASO 6): `problema.problema.codigo`
  en L351 era el único render crudo; el `incompleto` ya usa
  `describirMotivoIncompletitudModulo3`, el badge `ETIQUETA_ESTADO_MODULO_3`,
  y `evaluado` datos estructurados vía `fmt()`. Nada más que humanizar.

### Regresión

- **Unit** (`mensajesDeValidacion.test.ts`, 6 casos): código conocido →
  frase humana sin el identificador; `configuracionMedidoresUnidadFuncionalInexistente`
  → frase; código desconocido → genérico (no crudo, no `[object Object]`,
  no `undefined`); entradas no-string → genérico; **TODO** `CodigoValidacion`
  del dominio tiene copy propia no genérica; la tabla cubre exactamente
  `Object.keys(codigosValidacion)`.
- **E2E** (`tests/e2e/hallazgos.spec.ts`): era `test.fail`, ahora
  **regresión normal** — iniciar M3 + PH + ACS central + tramo `0` →
  vuelve a Medidores → el texto "La longitud de un tramo debe ser mayor
  que cero." **aparece**, `redHidraulicaTramoLongitudNoPositiva` **no**,
  sin `pageerror`/`console.error`, invariantes verdes. **Falla contra la
  producción pre-fix** (regresión real). Verificado 2/2 (desktop + mobile)
  contra un serve estático del build fijo.
- **`HALLAZGOS_CONOCIDOS`** (`qa/invariantes.ts`): se **quitó** la entrada
  de FIX-LEAK-01; el array queda **vacío** y la invariante
  `sin-codigos-de-validacion-visibles` vuelve a ser **estricta**. La
  maquinaria (`esHallazgoConocido`, `evaluarTokens`) se conserva. Fuzz
  `seed 424242` STEPS=12 y STEPS=15: 2/2 cada uno, 12/12 y 15/15 pasos,
  sin reaparecer el leak con la invariante ya estricta.

### Verificación

Vitest **1394 → 1400** (+6 de `mensajesDeValidacion.test.ts`); `tsc -b` /
`npm run e2e:typecheck` / `npm run build` verdes; ESLint 11 / 0 / 0 (sin
regresión). Playwright contra producción: `smoke` / `crash-observado` /
`responsive.spec.ts` (14 pasan / 6 skip por proyecto) / `catalogo`
**23/23** verdes; `hallazgos.spec.ts` 2/2 contra el build fijo (y falla
contra producción pre-fix). Sin bugs nuevos.

### Estado

**D-δ.85 -- CERRADA.** Ninguna regla hidráulica, normativa ni de dominio
modificada: una longitud `0` sigue siendo inválida y M3 sigue entrando en
error; sólo cambia su **presentación**. Tags sin mover; snapshot
`resguardo-documentacion/` intacto. **FIX-CRASH-01 / DEFENSE-01 /
MODE-UX-01 / UX-TEST-01 / REPORT-01 -- NO iniciar.**

## D-δ.86 -- GEOM-UX-01: cotas hidráulicas heredadas + Tabla IUAS v1 + Reiniciar cálculo + layout M2 Profesional -- CERRADA

Incremento funcional/UX transversal. Cuatro bloques relacionados, ninguno
de los cuales toca fórmulas hidráulicas, CRIT-A29, CRIT-A39, pérdidas,
Pmin, `Q`, DN, medidores ni reserva: sólo cambian (A) el dato geométrico
`z` con que se representa físicamente cada terminal, (C) el proyecto que
carga "Reiniciar", y (D) el CSS/markup del detalle de M2. Versión pública
funcional sigue **`v0.4.0-beta.5`** (sin tag nuevo). Baseline Vitest
**1400 → 1438**; `tsc -b` / `e2e:typecheck` / `build` verdes; ESLint
**11 / 0 / 0** (sin regresión).

### A -- Cotas hidráulicas heredadas (UF → Local → Artefacto)

**Semántica objetivo:** `cota hidráulica efectiva del artefacto = cota de
piso efectiva del Local + altura hidráulica efectiva del artefacto sobre
piso`. Se aplica en **ambas** granularidades ('simplificada' y
'profesional') -- GEOM-UX-01 **sustituye** la hipótesis geométrica
uniforme de 1,00 m del modo Rápido (D-δ.46) por esta derivación.

- **`UnidadFuncional.cotaHidraulicaReferencia_m` reencuadrada**: ya no es
  "una cota representativa del punto hidráulico" sino la **cota de PISO**
  terminado de la UF. `calcularCotaHidraulicaDefaultDeNivel` pasó de
  `1 + 3·nivel` a `3·nivel` (sólo altura entre plantas; PB = 0). El `+1 m`
  de "altura de conexión típica" lo aporta ahora la Tabla IUAS por tipo.
- **`Local.cotaPiso_m` (nuevo, opcional)**: override de piso del Local.
  Ausente ⇒ hereda la cota de la UF. "Restablecer" = borrar el campo.
- **`Artefacto.alturaHidraulicaSobrePiso_m` (nuevo, opcional)**: override
  de la altura hidráulica sobre piso. Ausente ⇒ altura de referencia IUAS
  del tipo. "Restablecer" = borrar el campo.
- **Sólo se guardan overrides explícitos**; los defaults nunca se
  materializan. Backward-compatible sin migración (`SCHEMA_VERSION_ACTUAL`
  no cambia), mismo patrón que `conectividadElegida` (CAT-CONN-01).
- **Funciones puras**
  (`motor/tuberias/geometria/resolverCotaHidraulicaDeArtefacto.ts`):
  `resolverCotaPisoDeLocal` / `resolverAlturaHidraulicaDeArtefacto` /
  `resolverCotaHidraulicaEfectivaDeArtefacto`. `resolverPresionResidualDeCamino`
  las consume; se **eliminó** `resolverCotaTerminalEfectiva` (obsoleto).
  El terminal degenerado que además es raíz del camino (punto de
  alimentación) conserva su propia `Nodo.cota_m` en ambas granularidades
  -- sustituirla colapsaría Δz a 0.
- **Tabla de referencias IUAS v1**
  (`normativa/eras-2023/catalogo-artefactos/alturasHidraulicasIuas.ts`):
  16/16 tipos del catálogo, con **test de completitud** (tipo nuevo sin
  altura o entrada huérfana ⇒ rojo). Vive junto al catálogo pero fuera de
  `index.ts` (transcripción normativa pura), con cabecera **"Criterio
  IUAS -- NO ERAS"**: son alturas de referencia adoptadas por IUAS a
  partir de geometrías usuales, documentación de fabricantes y práctica de
  proyecto, **siempre editables** por el proyectista; ERAS-2023 no fija a
  qué altura sobre el piso está el punto de conexión de cada artefacto.
  Valores: inodoroValvula 1,00 · bañera 0,70 · receptaculoDucha 2,00 ·
  bidet 0,40 · lavatorio 0,90 · inodoroDeposito 0,40 · piletaDeCocina
  0,90 · maquinaLavavajillas 0,60 · piletaDeLavar 1,10 · maquinaLavarropas
  0,60 · valvulaMingitorio 1,00 · piletaDeCocinaIndustrial 0,90 ·
  lavavajillasIndustrial 0,60 · lavarropasIndustrial 0,60 · lavachatas
  1,10 · canillaDeServicio 0,60.
- **Cambio de tipo de artefacto (regla aprobada del slice, §7)**: **limpia
  el override de altura hidráulica** y adopta el default IUAS del tipo
  nuevo -- una ducha personalizada a 2,20 m no debe volverse un bidet de
  2,20 m por accidente. Helper `conTipoDeArtefactoCambiado` (usado por los
  dos flujos de cambio de tipo de M1); limpia también `conectividadElegida`
  como ya hacía CAT-CONN-01.
- **Duplicar UF (§8)**: conserva el diseño explícito -- override de cota
  del Local y override de altura de artefacto se duplican; los valores
  heredados siguen heredados; los defaults no se materializan.
- **UI M1 (§11)**: el campo de cota de la UF se rotula "Cota de piso de
  la unidad funcional [m]"; cada Local tiene un editor compacto de "Cota
  de piso" ("hereda UF: +X,XX m" / [Personalizar] / "personalizada" +
  [Restablecer]); cada fila de artefacto muestra "Altura sobre piso:
  X,XX m · sugerida IUAS" con [Personalizar]/[Restablecer] y la "Cota
  hidráulica efectiva" derivada. Personalizar el Local re-deriva todas
  las cotas efectivas hijas sin editarlas.

### Impacto hidráulico -- rebaseline SÓLO de presión, justificado uno a uno

Al desaparecer la hipótesis uniforme de 1,00 m, cambia el Δz de los
terminales. **M1 (Qc), M3 (medidores) y M4 (reserva) no cambian.**

- **Proyecto canónico D-δ.70** (`auditoriaTransversalM1M4.baseline.test.ts`
  / `resolverResumenDeProyecto.test.ts`): el terminal crítico es el
  **receptáculo de ducha del baño**. ANTES cota efectiva 1,00 m (UF
  uniforme); DESPUÉS `0 (piso PB) + 2,00 (IUAS ducha) = 2,00 m`. Δz +1,00 m
  ⇒ 1,00 m menos de presión residual ⇒ margen del crítico
  **−16,664 → −17,664 m.c.a.** (sigue **NO CUMPLE**; ya lo era por
  CRIT-A39). El bidet, en cambio, baja de 1,00 a 0,40 m (gana margen);
  no es el crítico. La `cotaHidraulicaReferencia_m` del proyecto de
  ejemplo pasó de `1` a `0`.
- **Aceptación D-δ.48** (`verificacionTerminalCriticoPorUF.aceptacion.test.ts`):
  cargas geométricas de los 4 pisos (raíz a 16 m): PB `16 − 1,00 = 15,00`
  (inodoroValvula IUAS 1,00 = la vieja uniforme, sin cambio) · P1
  `16 − 3,90 = 12,10` · P2 `16 − 6,90 = 9,10` · P3 `16 − 9,60 = 6,40`
  (antes 15 / 12 / 9 / 6). Ningún terminal cambia de CUMPLE/NO CUMPLE por
  esto; el contraejemplo de PB (menor margen por Pmin normativa alta) se
  sostiene idéntico.
- Fixtures de motor (`resolverPresionResidualDeCamino` /
  `resolverEstadoModulo2` / `resolverTerminalMasDesfavorable` /
  `modulo4/integracionOrigenM2`): se les añadió `cotaHidraulicaReferencia_m`
  (o un override de altura del artefacto) para que la cota efectiva
  DERIVADA reproduzca la `Nodo.cota_m` clásica -- balance byte-idéntico
  donde el test aísla otro efecto; donde el test compara márgenes entre
  sí (auto-referencial) no hubo rebaseline.

### C -- Reiniciar cálculo (§13-§17)

Acción global "Reiniciar cálculo" en el encabezado (secundaria/neutra),
con confirmación previa sobre un `<dialog>` nativo accesible por teclado.
Al confirmar: `crearProyectoVacio()` reemplaza el Proyecto por uno
**vacío real** -- 0 UF/Locales/Artefactos, sin `redHidraulica`, sin
`configuracionMedidores`, sin `configuracionAbastecimiento` (M2/M3/M4
'noIniciado'). **NO vuelve al demo** (decisión explícita del usuario,
§14): `proyectoDeEjemplo` es sólo el proyecto de bienvenida.
`crearProyectoVacio` es una factory (sin referencias mutables
compartidas) que conserva únicamente lo del PRODUCTO: `schemaVersion` +
`configuracionHidraulica` de arranque (Rápido). Los estados transitorios
de UI (UF colapsadas, drafts, selectores pendientes, filas expandidas,
`<details>`, estado local de los paneles) se limpian **remontando** el
subárbol índice+contenido vía una `key` que se incrementa -- no hace
falta enumerarlos. Se vuelve al inicio (scrollTo 0) con el foco en el
disparador. **PERSIST-01 sigue fuera de alcance**: es una acción React de
sesión, no toca almacenamiento (F5 sigue restaurando el demo, §16).
E2E: `tests/e2e/reiniciar-calculo.spec.ts` (demo → M1/M3/M4 tocados →
reiniciar → vacío sano en Demanda; y Reiniciar → Cancelar conserva todo).

### D -- Layout del detalle de M2 Profesional (§18-§21)

El cuerpo del detalle expandible de la tabla de dimensionamiento de M2
vivía dentro de la primera celda (columna angosta del Tramo/Local), así
que el árbol de ramales de Profesional quedaba comprimido contra la
izquierda con media tabla vacía a la derecha. Ahora el resumen sigue en
un `<details><summary>` nativo (accesible por teclado, lo sigue
encontrando el harness de fuzz por `.tabla-tecnica details > summary`) y
el cuerpo se pinta en una **fila propia a ancho completo**
(`<tr class="m2-fila-detalle"><td colSpan>`); el estado de apertura se
sincroniza desde el evento `toggle` del `<details>` hacia React. El cuerpo
se mantiene siempre en el DOM (`hidden` al colapsar). `.m2-ramales-grid`
usa `repeat(2, minmax(0, 1fr))` (evita overflow por contenido
intrínseco); `@media print` deja fluir el scroll local y conserva las 2
columnas de ramales. FIX-RESP-01 / FIX-RESP-02 siguen verdes.

### Verificación

- **Vitest 1438 / 1438.** Nuevos: `alturasHidraulicasIuas.test.ts`
  (completitud 16/16), `resolverCotaHidraulicaDeArtefacto.test.ts`
  (herencia / overrides / cota efectiva / §23), `conTipoDeArtefactoCambiado.test.ts`
  (§7), `crearProyectoVacio.test.ts`; casos añadidos a
  `duplicarUnidadFuncional.test.ts` (§8) y a `ResultadoHidraulicoDeTramo.test.ts`
  (fila de detalle a ancho completo). Rebaseline documentado arriba en
  `auditoriaTransversalM1M4.baseline` / `resolverResumenDeProyecto` /
  `verificacionTerminalCriticoPorUF.aceptacion` y ajuste de fixtures en
  los tests de motor de presión.
- **E2E** (contra serve estático del build fijo): `smoke` · `catalogo`
  (23/23) · `crash-observado` · `responsive` (FIX-RESP-01/02) ·
  `hallazgos` (FIX-LEAK-01) · `reiniciar-calculo` (nuevo, 2/2) ·
  `cotas-heredadas` (nuevo, 1/1) -- todos verdes.
- **Fuzz local**: `seed 424242` RUNS=3 STEPS=25 → 3/3, 25/25 pasos, sin
  hallazgos nuevos (GEOM-UX-01 no introduce ningún leak). `HALLAZGOS_CONOCIDOS`
  sigue **vacío**.

### Hallazgo nuevo (fuera del alcance de GEOM-UX-01)

**FIX-LEAK-02 -- M4 muestra el código interno de validación de
`configuracionAbastecimiento.periodoConsumoMaximo_h`.** Descubierto por
fuzz con una seed exploratoria (`20250909:0`, step 6,
`editarPeriodoConsumoMaximo=6` fuera del rango [1, 4]). `humanizarModulo4.ts`
(`describirProblemaDeErrorModulo4`) devuelve `codigosValidacion[codigo].descripcion`
**crudo** en vez de rutear por `describirProblemaDeValidacion`
(`mensajesDeValidacion.ts`), que ya tiene la copy humana. Es el
**equivalente en M4 de FIX-LEAK-01** (que era M3), y es **pre-existente**:
`git diff d926281..HEAD` no toca `humanizarModulo4.ts` /
`PanelDeModulo4.tsx` / la validación de abastecimiento. No bloquea el
cierre de GEOM-UX-01 (la seed mandada `424242` está verde y toda la E2E
mandada pasa); por §29 no se corrige otro dominio en este slice. Evidencia
preservada en `qa-results/seed-20250909_0/`. Candidato a un slice propio
de humanización (misma solución de una línea que FIX-LEAK-01).

### Estado

**D-δ.86 -- CERRADA.** Ninguna fórmula hidráulica, criterio normativo ni
regla de dominio modificados: sólo cambia el dato geométrico `z` de cada
terminal (rebaseline de presión documentado), el proyecto que carga
"Reiniciar", y el CSS del detalle de M2. Tags sin mover; snapshot
`resguardo-documentacion/` intacto. **MODE-UX-01 / HYD-EST-01 / M2-TOPO-01
/ VIS-TOPO-01 / PERSIST-01 / REPORT-01 / UX-TEST-01 -- NO iniciar.**

## D-δ.87 -- FIX-LEAK-02: humanizar los errores de validación en M4 -- CERRADA

Fix de **presentación** puntual, equivalente en M4 de FIX-LEAK-01. No
modifica validaciones, tipos de error del dominio, el rango `1 ≤ Tc ≤ 4`
(CRIT-A35), `VReserva`, `Dc`, `Qconn`, Tabla N°1, el esquema, el volumen
adoptado, el estado de completitud ni cuándo M4 entra en error: sólo
cambia **qué texto ve el usuario**. Alcance:
`src/interfaz/paginas/humanizarModulo4.ts` + `.test.ts`,
`tests/e2e/hallazgos.spec.ts`, `tests/e2e/qa/invariantes.ts` (comentario),
documentación. Versión pública funcional sigue **`v0.4.0-beta.5`**.

### Causa raíz

`humanizarModulo4.ts`, `describirProblemaDeErrorModulo4(problema)`,
devolvía `codigosValidacion[problema.problema.codigo].descripcion` — la
descripción **técnica** interna del catálogo `src/validacion/codigos`
(nombres de campo, CRIT, camelCase; p. ej.
`"configuracionAbastecimiento.periodoConsumoMaximo_h, cuando está
presente, debe ser un número finito entre 1 y 4 horas (ERAS §2.10.2 /
CRIT-A35)…"`). `PanelDeModulo4.tsx`, rama `estado.estado === 'error'`,
la pinta cruda en `<li>`. M1 y M3 **no** tenían el problema porque desde
D-δ.85 (FIX-LEAK-01) rutean por `describirProblemaDeValidacion`
(`src/interfaz/paginas/mensajesDeValidacion.ts`), que tiene copy humana y
política segura; M4 nunca se enganchó a esa función.

### Solución

- `describirProblemaDeErrorModulo4` ahora devuelve
  `describirProblemaDeValidacion(problema.problema.codigo)` — la MISMA
  función que M1/M3, con la MISMA política segura (código conocido → su
  frase; desconocido / no-string → `MENSAJE_DE_VALIDACION_GENERICO`;
  nunca el identificador, `undefined` ni `[object Object]`).
- **No** se creó un mapa específico de M4: `DiagnosticoErrorModulo4` es un
  único shape `{ tipo: 'problemaDeValidacion'; problema: ProblemaValidacion }`
  y `problema.problema.codigo` es exactamente un `CodigoValidacion`, el
  mismo vocabulario que ya cubre `MENSAJES_DE_VALIDACION` (completa por el
  `Record<CodigoValidacion, string>`). El fix cubre de una toda la rama de
  error estructural de M4: esquema inválido, período fuera de `[1,4]`, DN
  de conexión no admisible, desnivel no finito, volúmenes de tanque
  inválidos.
- Se eliminó el import de `codigosValidacion` / `CodigoValidacion` en
  `humanizarModulo4.ts` (ya no se usan). `describirMotivoIncompletitudModulo4`
  (rama `incompleto`, no `error`) no se toca: ya devolvía frases humanas.

### Regresión

- **Unit** (`humanizarModulo4.test.ts`): período de consumo máximo
  inválido → `"El período de consumo máximo del abastecimiento debe estar
  entre 1 y 4 horas."` y el texto **no** contiene `configuracionAbastecimiento`
  ni `periodoConsumoMaximo_h`; `parametrosDiametroNominalConexionNoAdmisible`
  (otro código de la misma rama) → misma ruta humana, sin `parametros.`;
  código no reconocido → `MENSAJE_DE_VALIDACION_GENERICO`, nunca el
  identificador. (`mensajesDeValidacion.test.ts` ya asevera la cobertura
  completa del catálogo, no se duplica.)
- **E2E** (`tests/e2e/hallazgos.spec.ts`, **test normal**, no `test.fail`):
  abrir M4 → esquema "Tanque elevado" → `Período de consumo máximo` = `6`
  → M4 en error ("Configuración con errores") → el mensaje humano
  aparece; `configuracionAbastecimiento`, `periodoConsumoMaximo_h`, el
  código interno y `buscarCodigosDeValidacion(texto)` ausentes; sin
  `[object Object]`, sin `undefined`, sin `pageerror` / `console.error`;
  invariantes verdes. Falla contra la producción pre-fix.
- **`HALLAZGOS_CONOCIDOS`** (`qa/invariantes.ts`): **sigue vacío** (§14 del
  brief). No se añadió entrada para FIX-LEAK-02; la invariante
  `sin-codigos-de-validacion-visibles` sigue **estricta**. Sólo se
  actualizó el comentario para nombrar ambos fixes.

### Verificación

Vitest **1438 → 1440** (+2 de `humanizarModulo4.test.ts`); `tsc -b` /
`npm run e2e:typecheck` / `npm run build` verdes; ESLint **11 / 0 / 0**
(sin regresión). Playwright contra `vite` dev
(`IUAS_BASE_URL=http://localhost:5173/` — el flujo `IUAS_PREVIEW=1` sigue
roto por el `base` de `vite.config`, ver nota infra de D-δ.86):
`smoke` / `hallazgos` (FIX-LEAK-01 + FIX-LEAK-02) / `catalogo` (CAT-CONN) /
`responsive` / `reiniciar-calculo` / `cotas-heredadas` / `crash-observado`
→ **47 pasan / 29 skip** por proyecto, 0 fallos. Fuzz local: seed
histórica `20250909:0` **30/30**; seed cloud `34398035608-1` runs 0–12
**13/13** (run 12 supera el antiguo step 17
`editarPeriodoConsumoMaximo=6 [M4]` que rompía la invariante en la corrida
cloud `QA Fuzz (Playwright) #5`); baseline `424242` **15/15** sin
regresión lateral.

### Estado

**D-δ.87 -- CERRADA.** `Tc = 6 h` sigue **inválido** (`1 ≤ Tc ≤ 4`,
CRIT-A35) y M4 sigue entrando en error; sólo cambia su **presentación**.
Ninguna regla hidráulica, normativa ni de dominio modificada. Tags sin
mover (`v0.4.0-beta.5` sigue en `1476c19`); snapshot
`resguardo-documentacion/` intacto. La corrida cloud previa
`34398035608` **no** cuenta como checkpoint verde: se detuvo en este
hallazgo. Siguiente paso: QA Fuzz cloud 20×30 con seed vacía como
checkpoint posterior a GEOM-UX-01 + FIX-LEAK-02. **MODE-UX-01 /
HYD-EST-01 / M2-TOPO-01 / VIS-TOPO-01 / PERSIST-01 / REPORT-01 /
UX-TEST-01 -- NO iniciar.**

## D-δ.88 -- FIX-CRASH-01: la longitud de tramo en 0 desmontaba la app -- CERRADA

Primer crash de **pantalla blanca dependiente de secuencia** reproducido
de forma **determinista** (QA Fuzz cloud `QA Fuzz (Playwright)` posterior a
FIX-LEAK-02, seed generada `34411681277-1`, primer run). Caso canónico
`34411681277-1:0`, **step 19** · `editarDesnivelConexion=-2 [M4]` →
`WHITE_SCREEN` idéntico en **desktop y mobile** (no es responsive). Fix de
**una guarda** en un resolver puro: no cambia ninguna fórmula hidráulica,
criterio normativo, tipo de dominio ni responsabilidad entre módulos.
Alcance: `src/motor/tuberias/resolverPerdidaDistribuidaDeTramo.ts` +
`.test.ts`, `tests/e2e/hallazgos.spec.ts`, documentación
(`PENDIENTES-DE-ARQUITECTURA.md`, `ROADMAP.md`, `QA-FUZZ.md`). Versión
pública funcional sigue **`v0.4.0-beta.5`** (`1476c19`, tag sin mover).

### `desnivelConexion = -2` NO era el bug (CRIT-A37)

CRIT-A37 define el desnivel **firmado**: `Pcalc = Pácera − desnivelConexion`.
Un valor negativo representa una conexión por debajo de la referencia de
acera y es **físicamente válido**. El fix **no** rechaza negativos, no
clampa a 0, no aplica `Math.abs`, no oculta el control ni ignora el
`onChange`: `-2` se conserva tal cual (el E2E lo asevera con
`toHaveValue('-2')`). El step 19 era sólo el **disparador**: cualquier
desnivel finito (`0`, `5`, `10`, `-2`) habría destapado el mismo defecto.

### Causa raíz

`resolverPerdidaDistribuidaDeTramo` (N3) tiene una variante de resultado
explícita `sinLongitud` para el Tramo cuya longitud todavía no permite
calcular la pérdida distribuida, y **toda** la cadena de presión aguas
arriba ya la degrada a "incompleto"
(`acumularPerdidaDistribuidaDeCamino` → `perdidaDistribuidaIncompleta` →
`resolverEstadoModulo2` `incompleto`). Pero la guarda era
`if (tramo.longitud_m === undefined)` — **sólo** la longitud no relevada.
Una longitud **informada pero no utilizable** (`longitud_m <= 0`, estado
de edición legítimo: `resolverCambioDeLongitud` acepta `0`, y
`validarRedHidraulica` la marca como error con el predicado
`!== undefined && <= 0`) pasaba de largo hasta
`calcularPerdidaCargaHazenWilliams(J, 0)`, que **lanza** por contrato
(CRIT-A17 exige `L > 0`).

Por qué el crash aparecía recién en el step 19 y no en el step 13
(`editarLongitudTramo=0`):

- El proyecto estaba en modo **Rápido** (`granularidadHidraulica:
  'simplificada'`, default del proyecto de ejemplo) + esquema **Tanque
  elevado** (elegido en el step 8).
- Con `desnivelConexion_m` ausente, `resolverPeloDeAguaMinimoEfectivo`
  devuelve `incompletoRapido` → `aplicarPeloDeAguaMinimoEfectivo` le quita
  la cota a los nodos raíz → `resolverPresionResidualDeCamino` corta en la
  guarda `desnivel.tipo === 'incompleto'` **antes** de llamar a
  `acumularPerdidaDistribuidaDeCamino`. Sin throw: M2 queda "incompleto".
- El step 19 informa `desnivelConexion_m = -2` (número finito) →
  `resolverPeloDeAguaMinimoEfectivo` pasa a `derivadoRapido` (cota
  estimada `-2 − 0,50 = -2,5`) → los nodos raíz recuperan cota → el
  balance **supera** la guarda de desnivel y llega a la acumulación de
  pérdida distribuida sobre el Tramo de longitud 0 → **throw**.
- `PanelDePresionDeModulo2` (sección "Verificación hidráulica", montada
  siempre que `demandaValida`, no sólo con el hash activo) llama
  `resolverPresionResidualDeCamino` **directo en el render**, dentro de un
  `nodosTerminales.map(...)`, **sin** la barrera estructural de
  `resolverEstadoModulo2` (que sí habría cortado en `estado: 'error'` por
  `redHidraulicaTramoLongitudNoPositiva`). La excepción propaga por el
  render de React → la app entera se desmonta → `#root` vacío
  (`WHITE_SCREEN`). El panel/tabla de M2 (`resolverResultadoDeTramoParaUi`,
  `resolverFilaDeDimensionamiento`) ya envolvían el mismo resolver en
  `try/catch` — por eso el step 13 no rompía nada visible.

Preexistencia: el defecto es **anterior** a GEOM-UX-01 y a FIX-LEAK-02
(la guarda `=== undefined` es de la primera versión del resolver N3,
D-δ.34). GEOM/FIX-LEAK no lo introdujeron; la secuencia del fuzz sólo
combinó por primera vez las precondiciones (modo Rápido + tanque elevado +
longitud 0 + desnivel informado) que lo hacen observable.

### Solución

`resolverPerdidaDistribuidaDeTramo.ts`: la guarda pasa a
`if (tramo.longitud_m === undefined || tramo.longitud_m <= 0)` →
`sinLongitud`. Mismo predicado que `validarRedHidraulica`. Con eso:

- `calcularPerdidaCargaHazenWilliams` **nunca** recibe `L <= 0` desde el
  orquestador productivo — su guarda CRIT-A17 queda como defensa, no como
  ruta alcanzable.
- La cadena de presión degrada a "incompleto" de punta a punta, igual que
  ya hacía para la longitud ausente. `PanelDePresionDeModulo2` muestra la
  verificación como incompleta (motivo `perdidaDistribuidaIncompleta`), la
  app sigue montada, M2/M4 operables.
- Un proyecto en edición con `longitud_m = 0` sigue siendo un estado
  **tolerado**: se informa el error de validación (copy humana vía
  FIX-LEAK-01), no se bloquea la edición, no se desmonta nada.

No se agregó `ErrorBoundary` (DEFENSE-01 sigue pendiente para su propio
slice, §12 del brief de FIX-CRASH-01): el fix ataca la causa, no el
síntoma, y agregar el boundary ahora ampliaría el alcance.

### Regresión

- **Unit** (`resolverPerdidaDistribuidaDeTramo.test.ts`): nuevo caso
  `sinLongitud` para `longitud_m ∈ {0, -2}` → `tipo: 'sinLongitud'`
  (candidato comercial preservado, `qc_lps`/`n` intactos), **sin lanzar**.
- **E2E** (`tests/e2e/hallazgos.spec.ts`, **test normal**, no `test.fail`):
  proyecto de ejemplo → Tuberías: `Longitud [m]` del primer tramo = `0`
  (invariantes verdes: la app tolera el estado) → Abastecimiento: "Tanque
  elevado" → `Desnivel … [m]` = `-2` → la app sigue montada, sin el
  `pageerror` de `calcularPerdidaCargaHazenWilliams`, sin `console.error`,
  `#root` con contenido, y el input de desnivel conserva `-2` (CRIT-A37).
  Falla (WHITE_SCREEN, desktop + mobile) contra el código pre-fix
  (verificado con `git stash`).
- **Seed canónica completa** `34411681277-1:0` **30/30** pasos, desktop +
  mobile, contra `vite` dev con el fix (pre-fix: falla en el step 19). Se
  documenta como *FIX-CRASH-01 canonical regression seed*; **no** se
  agrega a `HALLAZGOS_CONOCIDOS`.
- **`HALLAZGOS_CONOCIDOS`** (`qa/invariantes.ts`): **sigue vacío**. La
  invariante `pantalla-no-blanca` sigue estricta.

### Verificación

Vitest **1440 → 1441** (+1); `tsc -b` / `npm run e2e:typecheck` /
`npm run build` verdes; ESLint **11 / 0 / 0** (sin regresión, todos
preexistentes). Playwright contra `vite` dev
(`IUAS_BASE_URL=http://localhost:5173/`): `hallazgos` (FIX-LEAK-01 +
FIX-LEAK-02 + FIX-CRASH-01) / `crash-observado` (A/B/C) / `smoke` /
`responsive` (FIX-RESP-01/02) / `catalogo` (CAT-CONN) → **0 fallos**.
Fuzz local: canónica `34411681277-1:0` **30/30** (desktop + mobile); seed
cloud previa de FIX-LEAK-02 `34398035608-1` runs 0–12 **13/13**; baseline
`424242` sin regresión lateral.

### Estado

**D-δ.88 -- CERRADA.** CRIT-A37 **sin cambios**: `desnivelConexion`
sigue siendo una magnitud **firmada** (`Pcalc = Pácera − desnivelConexion`),
`-2` es válido y se conserva sin clamp. `calcularPerdidaCargaHazenWilliams`
sigue exigiendo `L > 0` (CRIT-A17). Ninguna fórmula hidráulica, criterio
normativo ni responsabilidad entre módulos modificada. Tags sin mover
(`v0.4.0-beta.5` sigue en `1476c19`); snapshot `resguardo-documentacion/`
intacto. La corrida cloud que generó `34411681277-1` **no** cuenta como
checkpoint verde (2 failed / 38 did not run). Siguiente paso: QA Fuzz
cloud 20×30 con seed vacía contra producción como checkpoint previo a
MODE-UX-01. **MODE-UX-01 / HYD-EST-01 / M2-TOPO-01 / VIS-TOPO-01 /
PERSIST-01 / REPORT-01 / UX-TEST-01 / DEFENSE-01 -- NO iniciar.**

## D-δ.89 -- MODE-UX-01: desacoplar el modo de trabajo de la configuración hidráulica -- CERRADA

Incremento de PRODUCTO/UX. Corrige una ambigüedad conceptual: hasta D-δ.51
el modo Rápido/Profesional se **derivaba** de la combinación
`(granularidadHidraulica, metodoPerdidaLocalizada)`. Desde MODE-UX-01 es
una **decisión explícita** del usuario -- `Proyecto.modoTrabajo`.
Profesional pasa a significar **"controles avanzados disponibles"**, NO
"máximo detalle obligatorio". Ninguna fórmula, criterio normativo, golden
de cálculo ni comportamiento hidráulico modificado. Alcance:
`src/modelo/proyecto/index.ts` (2 campos optativos), `modoDeTrabajo.ts`
(+`.test.ts`), `SelectorDeModoDeTrabajo.tsx`, `ResultadoHidraulicoDeTramo.tsx`
(+`.test.ts`), `PanelDeMedidoresDeModulo3.tsx`, `PanelDeModulo4.tsx`,
`crearProyectoVacio.ts`, `proyectoDeEjemplo.ts`,
`tests/e2e/modo-de-trabajo.spec.ts` (nuevo), documentación. Versión
pública funcional sigue **`v0.4.0-beta.5`**.

### Problema raíz

`resolverModoDeTrabajo(configuracion)` (D-δ.51) mapeaba dos ejes de
`ConfiguracionHidraulica` a un modo: sólo `(profesional, detallado)` →
`'profesional'`, sólo `(simplificada, estimado)` → `'rapido'`, el resto →
`'avanzado'`. Consecuencias: (a) un proyectista en Profesional que elegía
Hazen + Estimadas + Simplificada era reclasificado a Rápido -- el modo no
podía sostenerse independiente del detalle de cálculo; (b)
`aplicarModoProfesional` **forzaba** `(profesional, detallado)` al entrar,
así que "entrar a Profesional" era siempre "subir al máximo detalle";
(c) el badge "Avanzado · combinación técnica personalizada" del selector
global era el síntoma visible de ese acople.

### Arquitectura implementada

- **Fuente de verdad del modo:** `Proyecto.modoTrabajo?: 'rapido' |
  'profesional'`. Optativo y **backward-compatible** --
  `SCHEMA_VERSION_ACTUAL` NO cambia, sin migración (mismo patrón que
  `configuracionMedidores?` / `configuracionAbastecimiento?`). Todo
  proyecto nuevo lo declara explícitamente (`crearProyectoVacio`,
  `proyectoInicial`, `aplicarModoRapido`, `aplicarModoProfesional`).
- **Fuente de verdad de la config ACTIVA de cálculo:**
  `configuracionHidraulica`, sin cambios. El motor la lee directo; nada
  más alimenta el cálculo.
- **`resolverModoDeTrabajo(proyecto)`:** devuelve `proyecto.modoTrabajo`
  si está; si no (sólo proyectos legacy -- no hay import UI todavía),
  `inferirModoDeTrabajoLegacy(configuracion)` **una vez**: histórico
  colapsado a 2 estados -- `(simplificada, estimado)` → `'rapido'`,
  cualquier otra cosa (incluido el viejo `'avanzado'`) → `'profesional'`.
  §34: la inferencia queda **cuarentenada** en una función de nombre
  explícito; `resolverModoDeTrabajo` NO infiere para proyectos nuevos.
- **Ambigüedad legacy (§8):** un proyecto guardado sin `modoTrabajo` con
  Hazen + Estimadas + Simplificada se clasifica `'rapido'` aunque el
  proyectista lo considerara Profesional -- ese proyecto no guardó la
  intención. Aceptado y documentado; desde MODE-UX-01 la intención se
  guarda siempre.

### Memoria de configuración Profesional (§10 -- Alternativa 1)

`Proyecto.ultimaConfiguracionProfesional?: ConfiguracionHidraulica` --
SNAPSHOT de restauración, campo optativo. `aplicarModoRapido` lo **escribe**
(con la config activa) sólo si veníamos de Profesional;
`aplicarModoProfesional` lo **restaura** como config activa al entrar
DESDE Rápido. NUNCA es fuente de cálculo -- el motor sólo lee
`configuracionHidraulica` (§35, una sola fuente de verdad activa).
"Reiniciar cálculo" (`crearProyectoVacio`) lo deja **ausente**.

Guardas de la máquina de estados:
- `aplicarModoProfesional` estando **ya** en Profesional: sólo asegura el
  campo, NO re-restaura el snapshot sobre ediciones vivas.
- `aplicarModoRapido` estando ya en Rápido: no re-snapshotea (no pisa un
  snapshot Profesional previo con una config Rápida).

### Presets

`PRESET_EJES_INICIALES = { metodoPerdidaDistribuida: 'hazenWilliams',
metodoPerdidaLocalizada: 'estimado', granularidadHidraulica:
'simplificada' }` -- los tres ejes compartidos por Rápido y por el
ARRANQUE de Profesional (§12/§13, DECISIÓN CERRADA). `materialTuberiaId` /
`sistemaDeTuberiaId` NO están en el preset (ortogonales al modo, se
preservan). Que Rápido y el arranque de Profesional coincidan en v1 NO
significa que modo y configuración sean lo mismo -- una misma combinación
puede vivir en ambos modos y el `modoDeTrabajo.test.ts` lo asevera.

### Transiciones (§9)

- **A -- R → P primera vez:** `modoTrabajo='profesional'`, config queda en
  el preset inicial (Hazen + Estimadas + Simplificada). NO salta a
  Detalladas/Profesional.
- **B -- P + cambiar Estimadas→Detalladas:** los updaters de
  `configuracionHidraulica` preservan `modoTrabajo` por spread →
  `resolverModoDeTrabajo` sigue `'profesional'`.
- **C -- P con exactamente H/E/S (la combinación de Rápido):** sigue
  `'profesional'`. **Obligatorio** -- es la invariante central del slice.
- **D -- P personalizado → R:** snapshot de la config activa, preset
  Rápido seguro activo, `modoTrabajo='rapido'`.
- **E -- R → P con custom previo:** restaura el snapshot como config
  activa. Round-trip `P(custom) → R → P` devuelve la custom.
- **Reset:** `crearProyectoVacio` → `modoTrabajo='rapido'`, preset Rápido,
  sin `ultimaConfiguracionProfesional`.

### UI

- **Selector global** (`SelectorDeModoDeTrabajo`, cabecera): pierde el
  badge "Avanzado"; `aria-pressed` sale de `modoTrabajo` (vía
  `resolverModoDeTrabajo`), no de comparar configuraciones. Sigue GLOBAL,
  sin router, sin duplicado en M2.
- **M2** (`CabeceraDeModulo2`): en Profesional "Configuración avanzada"
  abierta y los controles disponibles aunque la config sea el preset
  simple; en Rápido colapsada pero alcanzable (experiencia reducida
  EXISTENTE, §16). Copy de Profesional reescrita: "controles avanzados
  disponibles… cambiarlos no altera el modo" (§17, sin "Profesional =
  detalladas").
- **M3 / M4:** `esProfesional = resolverModoDeTrabajo(proyecto) ===
  'profesional'` -- leen el modo explícito, ya no la config.

### Hidráulica -- cero cambios para configuración equivalente (§22)

El modo es presentación pura: ningún módulo de `motor/` importa
`modoDeTrabajo`. Para un proyecto nuevo, `aplicarModoProfesional` deja la
config en Hazen + Estimadas + Simplificada -- **idéntica** a la de Rápido
→ Qc / DN / V / hf distribuida / hf localizada / presión / M3 / M4
idénticos. Vitest **1441 → 1450** (sin rebaseline de ningún golden de
cálculo; +9 son unit tests nuevos de `modoDeTrabajo` y `ResultadoHidraulicoDeTramo`).

### Regresión

- **Unit** (`modoDeTrabajo.test.ts`, reescrito): invariante central
  (P + H/E/S → Profesional, nunca Rápido); campo explícito gana sobre la
  config; `inferirModoDeTrabajoLegacy` (Rápida→rapido, Profesional→profesional,
  "avanzado"→profesional); Casos A–E de transición; guarda idempotente de
  `aplicarModoProfesional`; snapshot no pisado viniendo de Rápido;
  round-trip Caso E; backfill no destructivo.
- **Unit** (`ResultadoHidraulicoDeTramo.test.ts`): Profesional con la
  MISMA config que Rápido → controles disponibles + `<details open>`;
  proyecto legacy sin `modoTrabajo` → inferencia histórica.
- **E2E** (`tests/e2e/modo-de-trabajo.spec.ts`, nuevo): Casos 1–5 (arranque
  Rápido; cambiar controles en Profesional no cambia el modo; volver a
  H/E/S sigue Profesional; P custom → R → P restaura; Reiniciar → Rápido
  limpio) + no-overflow del selector a 360/390/1280.

### Verificación

Vitest **1450 / 1450**; `tsc -b` / `npm run e2e:typecheck` / `npm run
build` verdes; ESLint **11 / 0 / 0** (sin regresión). Playwright contra
`vite` dev (`IUAS_BASE_URL=http://localhost:5173/` -- `IUAS_PREVIEW=1`
sigue roto, nota infra de D-δ.86): `modo-de-trabajo` (11 pasan / 1 skip),
`smoke`, `hallazgos` (FIX-LEAK-01/02 + FIX-CRASH-01), `crash-observado`,
`catalogo` (CAT-CONN), `responsive` (FIX-RESP-01/02), `reiniciar-calculo`,
`cotas-heredadas` -- 0 fallos. Fuzz local: FIX-CRASH canónica
`34411681277-1:0` **30/30**; seed cloud FIX-LEAK `34398035608-1` runs
0–12 **13/13**; baseline `424242` **3×25** sin regresión lateral.

### Estado

**D-δ.89 -- CERRADA.** El modo de trabajo es ahora estado explícito del
Proyecto; "Estimadas" deja de implicar "Rápido" (habilita `HYD-EST-01`
sin mezclar detalle hidráulico con experiencia). Ninguna regla
hidráulica, fórmula, K, Vmax, Pmin, CRIT-A29/A35/A37/A39, Tabla IUAS ni
CAT-CONN modificada. Tags sin mover (`v0.4.0-beta.5` en `1476c19`); sin
`beta.6`. Snapshot `resguardo-documentacion/` intacto. Siguiente paso:
QA Fuzz cloud 20×30 con seed vacía contra producción como checkpoint
posterior a MODE-UX-01. **HYD-EST-01 / M2-TOPO-01 / VIS-TOPO-01 /
PERSIST-01 / REPORT-01 / UX-TEST-01 / DEFENSE-01 -- NO iniciar.**

## D-δ.90 -- HYD-EST-01: modelo path-aware de pérdidas localizadas estimadas -- DIFERIDA a M2-TOPO-01 (sin cambios de código)

Incremento **documental**. Se pidió implementar en `metodoPerdidaLocalizada
= 'estimado'` un modelo derivado **por camino**: por cada bifurcación
recorrida, `Ks` tee recta `1,00` vs. salida lateral `1,62`
(`teePasoRecto` / `teeSalidaLateral`, Tabla N°7); `+0,75` por transición
de DN recorrida (`reducciones`); `0,17` por rama de distribución/colector
recorrida (`valvulaEsclusa`, como "válvula de aislamiento de distribución
-- equivalente conservador IUAS"); `9,18` por `(Local, red)` (`llaveDePaso`).
La arqueología del motor concluyó que el pedido **no es un agregado sobre
el modo Estimadas actual sino un rediseño** que colisiona con criterios ya
cerrados y exige topología que el modelo no tiene hoy. **Ningún archivo de
código, test ni golden fue modificado.**

### Estado actual del modo Estimadas (intacto, NO se recalibra)

`resolverPerdidaLocalizadaEstimadaDeLocal` (`motor/tuberias/presion/`) es
una **plantilla agregada por `(Local, red)`**, no una derivación por
camino. Con `n = contarTerminalesFisicosDeLocal`:

```text
N_tees_estimadas       = max(0, n-1)   Ks = 3,00  (teeEntradaCentralSalidasLaterales, D-δ.40)
N_singularidadTerminal = n>=1 ? 1 : 0  Ks = 1,35  (codo90, D-δ.45 -- decisión roja resuelta por el usuario)
N_llaveDePaso          = n>=1 ? 1 : 0  Ks = 9,18  (llaveDePaso, D-δ.45 -- decisión roja resuelta por el usuario)
V_ref = MAX velocidadReal entre los tramos que alimentan directamente
        cada terminal físico del Local+red -- un único hf por (Local, red).
```

`resolverPresionResidualDeCamino` elige un modo u otro según
`metodoPerdidaLocalizada` y **nunca los mezcla**; el modo estimado no
recorre `camino.tramos` para pérdida localizada. `resolverClasificacionDeTee`
(recta/lateral) y `acumularPerdidaLocalizadaDeCamino` (tees nodales +
`Tramo.accesorios`) son **exclusivos del modo Detalladas** (CRIT-A31,
D-δ.33).

### Bloqueadores -- por qué HYD-EST-01 no puede aplicarse sobre la topología actual

1. **Contradice D-δ.40.** `Ks_estimado_tee = 3,00` se cerró como *"el
   MAYOR de las 3 variantes, adopción deliberadamente conservadora ante
   geometría no relevada, para no subestimar"*, contado como `n-1` **sin
   clasificar recta/lateral**. Pasar a `1,62`/`1,00` clasificado por
   camino invierte esa decisión y vuelve la estimación menos conservadora.
2. **Elimina la decisión roja 1 de D-δ.45.** El usuario eligió `codo90`
   (Ks `1,35`), *"la opción más conservadora"*, 1 por `(Local, red)`. La
   lista de HYD-EST-01 no incluye "singularidad terminal": implementarla
   tal cual borra un elemento aprobado explícitamente.
3. **La topología no distingue recta vs. lateral en Estimadas.**
   `resolverClasificacionDeTee` requiere `Nodo.tee` declarado, que solo
   escribe `TeeDeNodoEditor.tsx` (modo Detalladas) con una elección
   manual. En Estimadas `Nodo.tee` es siempre `undefined` →
   `'sinConfigurar'`. Una bifurcación 1→2 no tiene dato de orientación y
   **no hay default inequívoco** (cualquier regla -- "más terminales
   aguas abajo = recta", "misma DN = recta" -- inventa un criterio
   topológico que D-δ.40 dijo que el modelo no tiene).
4. **No existe "rama de distribución/colector".** `RedHidraulica` =
   `{nodos, tramos}` con `Tramo.red` fría/caliente; sin concepto de
   colector ni feed único por Local. El `Ks = 0,17` por rama recorrida no
   tiene dónde anclarse.
5. **Per-camino vs. per-`(Local, red)` es refactor fuerte.** Reemplazar
   el agregado por una derivación por traza toca
   `resolverPerdidaLocalizadaEstimadaDeLocal`, su integración en
   `resolverPresionResidualDeCamino` / `resolverBalanceDePresion`, la UI
   (`ResumenEstimadoDeLocal`, `LocalYRedCard`) y **todos los goldens de
   presión en Estimadas**.
6. **Convención de velocidad para `Ks` sumados.** CRIT-A30 fija que el
   `0,75` de reducción va sobre la velocidad del lado menor/aguas abajo;
   CRIT-A31, que el `Ks` de tee va sobre la del tramo saliente recorrido.
   Colapsar `1,62 + 0,75` y `1,00 + 0,75` en un único `Ks` sobre `V_ref`
   (máx) requiere una decisión de convención que no está tomada.

### Decisión del usuario

**Opción B.** No modificar HYD-EST-01 ni recalibrar D-δ.40 / D-δ.45. El
modelo Estimadas actual queda **intacto**: `n-1` tees con `Ks` conservador
`3,00`, una singularidad terminal `codo90` `Ks 1,35` y una llave de paso
`Ks 9,18` por `(Local, red)`. El modelo path-aware (tee recta/lateral,
transición DN, válvula de aislamiento) se **difiere hasta M2-TOPO-01**,
cuando exista topología suficiente (montantes, ramas de distribución,
orientación de bifurcación). Sin cambios de código en este slice.

### Dependencia registrada

`HYD-EST-01` **BLOQUEADO-POR** `M2-TOPO-01`. Matiz sobre el cierre de
D-δ.89: *"habilita HYD-EST-01"* significa que el eje de modo
(Rápido/Profesional) ya no lo bloquea -- **no** que la topología actual
alcance para derivar los `Ks` por camino. Los tres elementos nuevos (tee
recta/lateral, `0,17` por rama, `+0,75` por transición recorrida) siguen
sin base topológica hasta M2-TOPO-01.

### Qué SÍ admite el modelo agregado actual sin esperar a M2-TOPO-01

La plantilla por `(Local, red)` de D-δ.40 / D-δ.45 es extensible a
**futuras reglas estadísticas por `(Local, red)`** -- una cantidad
inferida de `n` (terminales físicos de esa red en ese Local) por un `Ks`
de Tabla N°7, compuesta con la misma `V_ref` y el mismo
`calcularPerdidaCargaLocalizada`, sin fórmula nueva ni contrato nuevo
(D-δ.40: *"se agrega como una magnitud más al mismo mecanismo"*). Ejemplos
candidatos: codos adicionales de recorrido o una curva de sobrepasaje por
`(Local, red)`. Lo que **NO está decidido** es su **cantidad** (cómo se
infiere de `n` o de la conectividad) ni su **`Ks`** -- son decisiones de
producto todavía sin abrir, y cada una sería su propia decisión roja
(igual que las dos de D-δ.45). Esto es independiente de M2-TOPO-01: no
requiere topología path-aware. Lo que sí requiere M2-TOPO-01 es el modelo
**path-aware** (tee recta/lateral, transición DN recorrida, válvula de
aislamiento de rama/montante, velocidad propia por elemento).

### Estado

**D-δ.90 -- CERRADA (análisis).** Cero cambios de código, test, golden ni
criterio normativo. Baseline sin tocar: Vitest **1450 / 1450**, `tsc -b` /
`npm run e2e:typecheck` / `npm run build` verdes, ESLint **11 / 0 / 0**.
D-δ.40 y D-δ.45 firmes y sin recalibrar. Tags sin mover
(`v0.4.0-beta.5` en `1476c19`); sin `beta.6`. Snapshot
`resguardo-documentacion/` intacto. **HYD-EST-01 / M2-TOPO-01 /
VIS-TOPO-01 / PERSIST-01 / REPORT-01 / UX-TEST-01 / DEFENSE-01 -- NO
iniciar.**

## D-δ.91 -- M2-TOPO-A: identificación estructural de distribución compartida + invariantes de arborescencia en `validarRedHidraulica`

Primer slice de implementación de **M2-TOPO-01** (montantes, ramales
secundarios, tramos intermedios). Incremento **aditivo y
backward-compatible**: no toca hidráulica, ni la enumeración de filas de
la UI de Módulo 2, ni la reconciliación M1→M2, ni el modelo persistido.
La arqueología previa (M2-TOPO-01) ya había confirmado que el motor
hidráulico soporta topología ramificada arbitraria dentro del alcance
CRIT-A27 sin cambios (Golden 4 -- "montante segmentada"). Este slice sólo
agrega (1) un clasificador de dominio y (2) dos validaciones estructurales
que hacen falta antes de habilitar la construcción de montantes en la UI.

### Parte A -- `identificarTramosDeDistribucionCompartida`

Nuevo módulo `motor/tuberias/topologia/identificarTramosDeDistribucionCompartida.ts`
(primitiva pura de dominio, sin dependencias de UI). Exporta:

- `esTramoDeDistribucionCompartida(proyecto, tramoId): boolean`;
- `identificarTramosDeDistribucionCompartida(proyecto): readonly Tramo[]`
  -- todos los tramos compartidos de la red, en el orden de
  `redHidraulica.tramos` (determinista y estable; este slice **no**
  diseña todavía un orden de presentación).

Un Tramo es de **distribución compartida** cuando cumple las tres
condiciones:

1. **no** es Alimentación general -- su `nodoOrigenId` sí aparece como
   `nodoDestinoId` de otro Tramo (no es la raíz de toda la topología);
2. **no** es Alimentación ACS -- su `nodoDestinoId` no referencia
   `produccionACS`;
3. su conjunto de artefactos aguas abajo (`obtenerArtefactosAguasAbajo`,
   traversal ya cerrado) pertenece a **más de un Local**, con identidad
   de Local `(unidadFuncionalId, localId)` deduplicada -- `localId` solo
   no es único entre UF (UF1/Baño y UF2/Baño son Locales distintos).

La señal estructural "Alimentación general / ACS" se re-deriva localmente
(unas pocas líneas), mismo patrón que ya usa
`identificarTramoRepresentativoDeLocal.ts` -- sin extraer todavía una
infraestructura compartida cuyo contrato aún está en formación.

**Nomenclatura deliberadamente neutral.** "Distribución compartida" **no**
es sinónimo de "montante": puede ser un montante vertical, un colector,
un ramal común horizontal o cualquier tronco que sirva a varios Locales.
Un montante **segmentado** produce **varios** Tramos compartidos (uno por
segmento que todavía alcanza >1 Local); el último segmento, que ya sólo
alimenta un Local, deja de ser compartido y pasa a ser feed de ese Local.
La identidad física ("esto es el Montante AF 1"), su denominación y
cualquier **rol persistido** quedan diferidos a **M2-TOPO-C**.

Esta función **todavía no participa de ningún cálculo** ni de la
enumeración de filas de la UI (eso es M2-TOPO-B). El proyecto de ejemplo
(topología plana: Alimentación general + Alimentación ACS + un feed por
`(Local, red)`) clasifica **0 tramos** como distribución compartida --
backward compatibility comprobada por test.

### Parte B -- invariantes de arborescencia en `validarRedHidraulica`

Dos códigos de validación nuevos, ambos `severidad: 'error'`,
`alcance: 'tuberias'` (nunca bloquean Módulo 1):

- **`redHidraulicaNodoMultiplesTramosEntrantes`** -- un Nodo con dos o más
  tramos entrantes (convergencia 2→1, tramos paralelos, malla). Mira los
  **entrantes**, nunca los salientes: un fan-out 1→N (manifold plano) NO
  es un problema.
- **`redHidraulicaCicloDirigido`** -- un ciclo dirigido siguiendo
  `nodoOrigenId → nodoDestinoId`. DFS iterativo con marca de tres estados
  (no visitado / en el descenso actual / cerrado): nunca lanza ni entra
  en loop infinito ante cualquier topología; sólo recorre aristas entre
  Nodos existentes; determinista. Un DAG con reconvergencia (diamante) NO
  se marca como ciclo.

Ambas invariantes ya eran precondición de `obtenerCaminoHaciaOrigen`
(CRIT-A27 / D-δ.37), que devuelve `multiplesTramosEntrantes` / `ciclo`
por terminal. La diferencia de este slice: `resolverEstadoModulo2` las
detecta **antes**, en la etapa de integridad estructural, en vez de
llegar por terminal a `topologiaNoResoluble`. **El estado de Módulo 2
para una red así ya era `'error'`; sigue siéndolo** -- no cambia el
comportamiento visible, sólo el diagnóstico y el momento. El modelo
`RedHidraulica` (la capa `modelo/`) **no se toca**: sigue siendo un grafo
dirigido genérico y la recirculación de ACS sigue conceptualmente
permitida (D-δ.15) -- cuando se aborde, relajará estas validaciones con
su propio modelo hidráulico.

Copy humano en `mensajesDeValidacion.ts` (FIX-LEAK-01: nunca se muestra el
identificador técnico). CRIT-A27 en `CRITERIOS.md` actualizado: la frase
"`validarRedHidraulica` conserva su generalidad deliberada" se reencuadra
-- el **tipo** sigue general, pero la validación estructural ahora **sí**
rechaza multi-padre y ciclos como error de alcance `'tuberias'`.

### Qué NO se valida todavía (gaps registrados)

- **"Nodo huérfano"** (nodo aislado sin tramos): NO se valida. La
  reconciliación incremental atraviesa estados de edición donde un nodo
  topológico puede quedar transitoriamente sin conexión; `podarNodosSinSalida`
  ya gestiona parte de eso. Definir una política requeriría decidir qué
  estados transitorios son legítimos -- fuera de alcance de A.
- **"Raíz ausente"**: NO se valida. Una red vacía (`{nodos:[], tramos:[]}`)
  es **válida** -- representa un Módulo 2 recién iniciado. No se exige una
  raíz universal para todo el `Proyecto` (CRIT-A27 admite subredes
  independientes).
- **"Terminal sin camino a raíz"**: cubierto **transitivamente** -- dentro
  de una arborescencia sin ciclos y sin multi-padre, todo Nodo alcanza su
  raíz; un terminal aislado es su propia raíz (caso degenerado ya
  contemplado por `resolverPresionResidualDeCamino`). No necesita código
  propio.
- **Tee de 3+ salidas**: un fan-out 1→N con N≥3 sigue siendo válido para
  caudal aunque no tenga modelo de tee detallada (`ConfiguracionDeTee`
  sólo cubre 1→2). No se convierte en error estructural.

### Pendientes que este slice NO aborda (para B / C)

- **`dnComercialAdoptado` no migra en el retrofit D-δ.49** (sólo migran
  `longitud_m`/`accesorios`). Confirmado como riesgo; su corrección es
  para **M2-TOPO-B** o un mini-fix previo, no se mezcla acá.
- **`resolverIncrementoVerticalPorNivel` (D-δ.50)** haría doble conteo del
  caño vertical si un camino atraviesa un montante explícito con
  `longitud_m` real en granularidad `simplificada`. Se aborda en
  **M2-TOPO-B**, cuando esos tramos entren en enumeración/UI/presión de
  extremo a extremo.
- **Identidad / rol / denominación persistida de montante**: **M2-TOPO-C**.

### Estado

**D-δ.91 / M2-TOPO-A -- CERRADO.** Cambios de código en `src/`:
`motor/tuberias/topologia/identificarTramosDeDistribucionCompartida.ts`
(nuevo), `validacion/codigos/index.ts`, `validacion/redHidraulica/index.ts`,
`interfaz/paginas/mensajesDeValidacion.ts`, `validacion/alcance.test.ts`,
y dos suites de tests (nueva `identificarTramosDeDistribucionCompartida.test.ts`
+ ampliación de `validacion/redHidraulica/index.test.ts`). Docs:
`CRITERIOS.md` (CRIT-A27), `ROADMAP.md`, este documento. Baseline:
Vitest **1473 / 1473** (+23, +1 archivo), `tsc -b` / `npm run e2e:typecheck`
/ `npm run build` verdes, ESLint **11 / 0 / 0** (sin errores nuevos).
E2E: smoke / hallazgos (FIX-LEAK-01/02, FIX-CRASH-01) / crash-observado /
modo-de-trabajo / CAT-CONN / responsive / reiniciar-calculo /
cotas-heredadas verdes. Fuzz: `424242` 1×20 y `34411681277-1:0` 30 pasos
OK. Tags sin mover (`v0.4.0-beta.5` en `1476c19`); sin `beta.6`. Snapshot
`resguardo-documentacion/` intacto. **HYD-EST-01 / VIS-TOPO-01 /
PERSIST-01 / REPORT-01 / UX-TEST-01 / DEFENSE-01 -- NO iniciar.**
Siguiente: **M2-TOPO-B -- enumeración y edición de tramos de distribución
secundaria**.

## D-δ.92 -- M2-TOPO-B: enumeración y edición de distribución secundaria + integración hidráulica de montantes existentes

Segundo slice de implementación de **M2-TOPO-01**. M2-TOPO-A (D-δ.91) cerró
la clasificación estructural (`identificarTramosDeDistribucionCompartida`)
y las invariantes de arborescencia. Este slice **hace visible y editable**
en Módulo 2 la topología que el motor ya sabe calcular (Golden 4,
"montante segmentada"), corrige el gap de retrofit de DN de D-δ.49, y
resuelve el conflicto D-δ.50 registrado en D-δ.91. **No** introduce
entidad `Montante`, identidad/nombre/rol persistido, constructor
`+ Agregar montante` (todo eso es M2-TOPO-C), ni cambia ninguna fórmula.

### Parte A -- enumeración: sección "Distribución secundaria" en M2

`identificarFilasDistribucionSecundaria(proyecto)` (nuevo, en
`interfaz/paginas/identificarFilasDeModulo2.ts`) es una **proyección
derivada**: envuelve `identificarTramosDeDistribucionCompartida` (motor,
M2-TOPO-A) agregando `red` y una **denominación de presentación**
(`"Distribución secundaria N"`, numerada **por red**). No reimplementa la
regla de clasificación; consume la misma señal estructural que consumirá
VIS-TOPO. La denominación **no se persiste**, no es identidad ni rol de
montante, nunca es un UUID ni el id técnico del Tramo -- se recalcula en
cada render, mismo patrón que `derivarOrdinalesDeLocal` /
`etiquetasDeLocales`.

- **Cada fila = UN `Tramo` físico real.** Un montante segmentado aparece
  como **varias filas** (una por segmento que todavía alcanza >1 Local);
  el último segmento, que ya sólo alimenta un Local, es feed de ese Local
  y **no** aparece acá (lo reconoce
  `identificarTramoRepresentativoDeLocal.ts`). Cada segmento puede tener su
  propio Qc / DN / V / longitud / hf.
- **Orden**: el de `redHidraulica.tramos` (determinista y estable; el
  mismo que ya devuelve la primitiva del motor y que usa
  `identificarFilasDistribucionGeneral`). No se diseñó un orden de
  presentación nuevo. La numeración `N` es **por red**, en ese mismo
  orden -- la columna Red de la tabla desambigua AF/AC, igual que dos
  filas "Baño 1" (una AF, otra AC).
- **UI** (`ResultadoHidraulicoDeTramo.tsx`, componente `DistribucionSecundaria`):
  sección propia entre "Distribución general" y las Unidades Funcionales,
  dentro de la arquitectura one-page actual (sin router, sin pantalla
  aparte, sin árbol gráfico). Reutiliza **exactamente** los mismos
  componentes/resolvers que "Distribución general":
  `resolverFilaDeDimensionamiento` (view-model: Qc/DN/V/hf/estado),
  `resolverControlDeDnDeTramo` (control ↓/DN/↑/Auto),
  `AccesoriosDeTramoEditor` (en Detalladas), `TablaDimensionamientoDeModulo2`.
  No hay cálculo en JSX. Longitud editable siempre (es una longitud
  **física declarada**, nunca automática por nivel). Sin contexto
  `(UF, Local)` -- sirve a varios Locales, así que no hay hf localizada
  estimada ni "N puntos", igual que Distribución general.
- **Si hay 0 tramos secundarios, no se renderiza nada.** El proyecto de
  ejemplo (topología plana) se ve y calcula **exactamente igual** que
  antes -- ninguna sección nueva, resultados byte-equivalentes.

### Parte B -- fix D-δ.49: `dnComercialAdoptado` viaja en el retrofit

Gap registrado en D-δ.91: cuando un Local con 1 terminal pasa a 2 y el
retrofit de D-δ.49 inserta una bifurcación dedicada, `longitud_m` y
`accesorios` migraban al Tramo troncal nuevo (representativo) pero
**`dnComercialAdoptado` (D-δ.52) no**, quedando anclado al segmento
degradado a ramal, donde ya no describe el diámetro que el usuario
dimensionó. Corregido en `sincronizarConectividadFisicaDeArtefacto.ts`
(`conectarUnaRed`): las **tres** propiedades físicas representativas
viajan juntas al troncal nuevo. El ramal degradado se reconstruye con
sólo `id`/`nodoOrigenId`/`nodoDestinoId`/`red`, así que **no hay
duplicación**. Sin override previo, el retrofit **no inventa** uno. Tests
de regresión dedicados en `sincronizarConectividadFisicaDeArtefacto.test.ts`.

### Parte C -- D-δ.50: resolución adoptada (Alternativa A)

`resolverIncrementoVerticalPorNivel` (D-δ.50) suma, **sólo en
`granularidadHidraulica = 'simplificada'`**, una longitud vertical típica
implícita (`3 m · nivel`) a la longitud efectiva del Tramo de Alimentación
general del camino de cada UF. Con un montante explícito relevado (tramos
de distribución compartida con `longitud_m` real), esos metros ya están
representados físicamente y, en `simplificada`,
`seleccionarTramosDeAcumulacion` **ya los incluye** en `tramosRelevables`
(están aguas arriba del Tramo representativo del Local) -- de modo que un
camino que atraviesa un montante explícito contaría el ascenso dos veces.

**No hay forma inequívoca, con los datos que el modelo tiene hoy, de
determinar qué parte de ese ascenso implícito ya está representada
explícitamente.** "Distribución compartida" es deliberadamente neutral
(M2-TOPO-A): puede ser un montante vertical, un colector horizontal o
cualquier tronco que sirva a varios Locales. `Tramo` no tiene orientación
ni marca de rol; `Nodo.cota_m` es opcional y las cotas de los nodos
intermedios de un montante no las solicita ninguna UI actual. Suprimir el
incremento cada vez que hay un tramo compartido con `longitud_m` en el
camino sería incorrecto cuando ese tramo es horizontal. Distinguir el
componente vertical exigiría **semántica persistida de montante**, que es
alcance de **M2-TOPO-C**.

**Decisión roja planteada al usuario y confirmada -- Alternativa A:**
cerrar M2-TOPO-B **sin tocar D-δ.50**. La deduplicación del ascenso
vertical implícito (y por tanto la corrección plena en `simplificada`)
queda **diferida a M2-TOPO-C**, junto con la decisión de identidad y de
cómo representar el aporte vertical (orientación del tramo, aporte vertical
explícito, cotas de nodos, rol de montante o alguna combinación -- se llega
a C con esa decisión **abierta**: para D-δ.50 lo que hará falta saber es
*cuánto ascenso vertical ya está representado*, no si un caño "es
vertical"; un tramo diagonal de 12 m con 8 m de componente vertical rompe
la abstracción "orientación").

Precisiones de redacción (pedidas por el usuario, para no institucionalizar
el doble conteo como comportamiento deseado):

- **Profesional**: no se afirma "exactitud hidráulica" en absoluto. Lo que
  se afirma es que **no existe el doble conteo introducido por D-δ.50**,
  porque las longitudes explícitas del camino se acumulan directamente
  (`resolverIncrementoVerticalPorNivel` devuelve incremento 0 en
  `profesional`). El resto del cálculo conserva las aproximaciones propias
  de su método (Estimadas, etc.).
- **Simplificada**: con distribución secundaria explícita, la granularidad
  Simplificada conserva **provisionalmente** D-δ.50 sin modificaciones. Por
  ello, cuando los tramos explícitos representan total o parcialmente el
  ascenso vertical, puede existir **sobreestimación de hf distribuida**.
  Es una **limitación temporal conocida, no una decisión hidráulica
  aceptada**. La deduplicación queda diferida a M2-TOPO-C, cuando exista
  semántica suficiente para identificar el aporte vertical explícito sin
  heurísticas.

**Backward compatibility**: el proyecto de ejemplo y todos los proyectos
actuales son `simplificada` con **0 tramos compartidos** (M2-TOPO-A), así
que el comportamiento de D-δ.50 es **byte-idéntico** para ellos bajo
cualquier decisión. El conflicto sólo es alcanzable con `simplificada` +
una topología compartida construida manualmente.

### Detalladas / Estimadas / M3 / M4

- **Detalladas**: los accesorios explícitos de un tramo secundario y la
  tee nodal se acumulan normalmente si el tramo está en el camino (ya
  funcionaba; verificado por test). CRIT-A30/A31 sin cambios. La edición
  fina de tees de montante queda para M2-TOPO-D.
- **Estimadas**: el modelo agregado por `(Local, Red)` permanece intacto
  (`n−1` tees @ 3,00; 1 codo90 @ 1,35; 1 llave @ 9,18; Vref actual). La
  **hf distribuida** del montante sí entra en el balance; la **hf
  localizada path-aware** del montante **todavía no** -- `HYD-EST-01`
  sigue **BLOQUEADO**. No se aplican 1,62/1,00 por derivación, +0,75 por
  transición ni 0,17 por aislamiento.
- **M3 / M4 / CAT-CONN / MODE-UX / GEOM-UX**: sin cambios. La profundidad
  topológica no cambia scopes ni conectividad. La enumeración depende de
  **topología**, nunca de `modoTrabajo`; la acumulación depende de
  `granularidadHidraulica`.

### Estado

**D-δ.92 / M2-TOPO-B -- CERRADO.**

- **Distribución secundaria ya visible y editable** en M2, con las mismas
  capacidades hidráulicas que cualquier tramo físico (longitud, DN
  automático/manual por segmento, Qc, V, hf distribuida, accesorios en
  Detalladas, estado/validaciones).
- Sigue siendo **clasificación derivada** -- sin identidad, nombre ni rol
  persistido.
- Motor hidráulico **sin nueva fórmula**: Qc de cada segmento se recalcula
  por simultaneidad sobre su propio conjunto aguas abajo (regresión
  Golden 4), nunca por suma de Qc parciales. DN por segmento.
- **D-δ.49** corregido (`dnComercialAdoptado` en el retrofit).
- **D-δ.50** resuelto como **Alternativa A** (diferir la deduplicación
  vertical a M2-TOPO-C); sin cambios de código en `resolverIncrementoVerticalPorNivel`.
- **HYD-EST-01 sigue bloqueado**; el **constructor** de montantes queda
  para **M2-TOPO-C**; la edición fina de tees para **M2-TOPO-D**;
  VIS-TOPO-01 fuera de alcance.

Cambios de código en `src/`: `interfaz/paginas/identificarFilasDeModulo2.ts`
(+`identificarFilasDistribucionSecundaria`), `interfaz/paginas/ResultadoHidraulicoDeTramo.tsx`
(+componente `DistribucionSecundaria`), `interfaz/paginas/sincronizarConectividadFisicaDeArtefacto.ts`
(fix D-δ.49). Tests: `identificarFilasDeModulo2.test.ts` (+7),
`sincronizarConectividadFisicaDeArtefacto.test.ts` (+2),
`distribucionSecundaria.integracion.test.ts` (nuevo, motor+presión),
`DistribucionSecundaria.componente.test.ts` (nuevo, render SSR). Baseline:
Vitest **1498 / 1498** (+25, +2 archivos), `tsc -b` / `npm run e2e:typecheck`
/ `npm run build` verdes, ESLint **11 / 0 / 0** (sin errores nuevos).
`HALLAZGOS_CONOCIDOS` sigue vacío. Tags sin mover (`v0.4.0-beta.5` en
`1476c19`); sin `beta.6`. Snapshot `resguardo-documentacion/` intacto.
**HYD-EST-01 / VIS-TOPO-01 / PERSIST-01 / REPORT-01 / UX-TEST-01 /
DEFENSE-01 -- NO iniciar.** Siguiente: **M2-TOPO-C -- constructor y
asignación de Locales, resolviendo antes la decisión de identidad
persistida del montante (y con ella la deduplicación vertical de D-δ.50)**.

## D-δ.93 -- M2-TOPO-C: identidad semántica de montante + constructor en M2 + supresión dirigida del ascenso D-δ.50 -- CERRADO

Tercer y último slice de construcción de **M2-TOPO-01** (identificación
D-δ.91, enumeración/edición D-δ.92, constructor D-δ.93). Convierte la
"distribución secundaria" -- hasta ahora una clasificación **derivada** y
anónima -- en un **montante con identidad**, y da al proyectista la UI
para crearlo, nombrarlo, asignarle/quitarle Locales y borrarlo. No
introduce una segunda topología ni una segunda fuente de verdad, no
cambia ninguna fórmula hidráulica y no toca HYD-EST-01, VIS-TOPO-01 ni
M2-TOPO-D.

### Modelo -- identidad semántica persistida, membresía derivada

- **`Proyecto.montantes?: readonly Montante[]`** con
  `Montante = { id; red: 'AF' | 'AC'; nombre? }` y **nada más**. Guarda
  *identidad* (qué montantes existen, de qué red, cómo se llaman), nunca
  estructura física: sin `tramosIds[]`, sin `localesIds[]`, sin caminos,
  sin árboles paralelos, sin resultados, sin coordenadas.
- **`RedHidraulica` sigue siendo la ÚNICA fuente de verdad física.** Un
  segmento pertenece al montante vía **`Tramo.montanteId`** (referencia
  del `Tramo` a la identidad). Los **Locales servidos** se **derivan**
  siempre de la topología aguas abajo (`derivarLocalesServidos`,
  `obtenerArtefactosAguasAbajo`), nunca de una lista.
- Backward-compatible sin migración: `SCHEMA_VERSION_ACTUAL` no cambia;
  un Proyecto guardado antes de M2-TOPO-C no trae `montantes` ni
  `montanteId` y se comporta **byte-idéntico**. Ausente y `[]` son
  equivalentes.
- Un **montante vacío es válido**: puede existir con 0 segmentos y 0
  Locales (identidad recién creada). `validarRedHidraulica` exige: ids
  de montante únicos, `red` válida, y que todo `Tramo.montanteId` apunte
  a una identidad existente y de red coherente
  (`redHidraulicaMontanteIdDuplicado` / `...MontanteRedInvalida` /
  `...TramoMontanteInexistente` / `...TramoMontanteRedIncoherente`).

### Motor de reconciliación -- `interfaz/paginas/reconciliarMontante.ts`

Traduce comandos transitorios del constructor
(`agregarLocalAMontante` / `quitarLocalDeMontante` / `borrarMontante`)
en mutaciones **mínimas y no destructivas** de `RedHidraulica`. Resultado
discriminado (`reconciliado` | `bloqueadoPorDatoFisicoManual` |
`bloqueadoPorDatoFisicoManualEnBorrado` | `origenIntermedioNoSoportado` |
`localSinFeedConectable` | `localNoServido` | `localInexistente` |
`montanteInexistente` | `sinRedHidraulica`). Comportamiento cerrado:

- **Orden por cota de piso efectiva** del Local (`resolverCotaPisoDeLocal`,
  GEOM-COTA-01), nunca por orden de clic ni por cota hidráulica del
  artefacto. Origen por encima -> cadena descendente; origen por debajo o
  desconocido -> ascendente.
- **Misma cota** -> reutilización del nodo de derivación existente, sin
  fabricar un tramo de longitud 0 (CRIT-A20).
- **Longitud sugerida** inicial de cada segmento = `|Δz|` entre las cotas
  de sus extremos, con `longitudEsSugerida: true`. `|Δz| = 0` o
  indeterminado -> segmento **sin** longitud precargada, nunca 0.
- **IDs estables**: agregar/quitar un Local crea o modifica sólo lo
  imprescindible. El feed del Local viaja **entero** (sólo cambia su
  `nodoOrigenId`): su longitud/accesorios/DN manual nunca se tocan.
- **Quitar un Local NO fusiona segmentos** (RD-1): se conserva el nodo
  intermedio y ambos segmentos con sus datos; sólo se poda una punta sin
  derivación cuyo segmento entrante es íntegramente sugerido. Nunca se
  elige arbitrariamente "gana upstream" ni "gana downstream".
- **Origen canónico**: AF `directa` -> raíz a cota 0; AF con tanque ->
  pelo de agua mínimo canónico (`resolverPeloDeAguaMinimoEfectivo`, sin
  duplicar CRIT-A39); AC -> `cota_m` del nodo `produccionACS` si el
  proyectista lo declaró -- nunca se extrapola el pelo del tanque a AC.
- **`borrarMontante`** conserva Locales y artefactos: reengancha los
  feeds a la raíz canónica y elimina la identidad; si algún segmento
  tiene dato físico manual, **bloquea** (`bloqueadoPorDatoFisicoManualEnBorrado`)
  y no muta.

### DECISIÓN ROJA RD-1 -- resegmentación no destructiva -- CERRADA

Nunca se reparte, interpola, escala, traslada ni borra: una **longitud
manual**, unos **accesorios no vacíos** (`accesorios: []` NO bloquea --
es "relevado, sin accesorios"), ni un **DN comercial adoptado a mano**.
Un segmento es libremente resegmentable **sólo** si su longitud es
sugerida (`longitudEsSugerida === true` o ausente), no tiene accesorios
no vacíos y no tiene `dnComercialAdoptado`. Si agregar un Local exige
partir un segmento personalizado, se **bloquea ANTES de mutar** y se
devuelve `bloqueadoPorDatoFisicoManual` con `COPY_BLOQUEO_SPLIT_DATO_MANUAL`.
La UI muestra ese copy humano y no cambia la topología ni deja el Local
parcialmente asignado.

### DECISIÓN ROJA RD-2 -- procedencia de la longitud -- CERRADA e implementada

**`Tramo.longitudEsSugerida?: boolean`** es metadata de *política de
edición*, nunca una segunda longitud ni una segunda ruta de cálculo (el
motor sigue consumiendo sólo `longitud_m`):

- `true` -> `longitud_m` fue **precargada por IUAS** (backfill de
  predimensionamiento D-δ.51, o precarga por cotas del constructor de
  montantes) y todavía puede recalcularse / re-segmentarse.
- `false` / ausente -> tratar `longitud_m` como **personalizada**: no
  modificarla ni re-segmentar automáticamente. La lectura conservadora de
  la ausencia es deliberada y backward-compatible.

`conLongitudDeTramo` **elimina el flag** cuando el usuario escribe el
input, aunque el número tecleado coincida con el sugerido: la procedencia
**nunca** se infiere comparando valores numéricos.

### D-δ.50 -- supresión del ascenso implícito SÓLO por montante explícito

`resolverIncrementoVerticalPorNivel` (D-δ.50) sumaba, en Simplificada,
`3·nivel` al recorrido de todo camino que atraviesa distribución
compartida. Desde M2-TOPO-C, si el camino contiene **≥ 1 `Tramo` con
`montanteId`**, ese incremento vertical implícito se **suprime**
(`D-δ.50 = 0`) -- el recorrido vertical real ya está modelado como los
segmentos del montante, con su longitud editable. Campo de resultado
nuevo `suprimidoPorMontante?: boolean`. Lo que **no** cambia:

- **distribución compartida genérica sin montante** -> D-δ.50 histórico
  **sigue vigente** (Alternativa A de D-δ.92);
- **NO** se usa `esTramoDeDistribucionCompartida` como señal de supresión
  -- sólo la pertenencia explícita a un montante;
- **NO** se reactiva `3·nivel` como fallback si el segmento del montante
  todavía no tiene longitud (el camino queda incompleto, como cualquier
  tramo sin longitud);
- **Profesional** sigue con incremento vertical 0, como antes;
- el proyecto de ejemplo y todo proyecto sin montantes: D-δ.50, Estimadas
  y golden **byte-idénticos**.

### `origenIntermedioNoSoportado` -- LIMITACIÓN TEMPORAL conocida

Cuando el origen del montante cae **estrictamente entre** las cotas de
los Locales ya servidos, la forma física de la topología no es inequívoca
(cadena única vs. bifurcación bidireccional). El motor devuelve
`origenIntermedioNoSoportado` **sin mutar** y la UI muestra un aviso
humano ("IUAS no puede ubicar automáticamente este Local...; cargá o
ajustá las cotas de piso, o conectá el Local por fuera del montante"),
nunca el enum ni un id. **No se inventa topología.** Es una limitación
temporal (no un comportamiento aceptado): se retomará cuando M2-TOPO
aborde bifurcaciones bidireccionales de montante.

### Constructor -- `interfaz/paginas/ConstructorDeMontantes.tsx`

Vive en M2 junto a "Distribución secundaria". Shell delgado sobre
funciones puras (`montantesDelProyecto.ts`): la interacción real la
cubren el E2E (`tests/e2e/montantes.spec.ts`) y el fuzz.

- **`+ Agregar montante`** -> elegir AF o AC -> crea la identidad
  (`conMontanteNuevo`, id con el generador existente, `nombre` ausente ->
  fallback derivado por red `Montante AF 1` / `Montante AC 1` vía
  `nombreDeMontante.ts`).
- **Card por montante**: nombre editable (vacío -> se elimina el custom y
  vuelve al fallback; nunca se muestra el id técnico), badge de red,
  "Locales alimentados" (lista humana `Baño 1 · UF 1` + "Quitar", o "Sin
  Locales asignados" si tiene 0), "+ Agregar local" (sólo Locales
  **existentes** -- no se crean desde M2), "Segmentos" (misma tabla y
  mismos resolvers que Distribución general/secundaria:
  `resolverFilaDeDimensionamiento` / `resolverControlDeDnDeTramo` /
  `AccesoriosDeTramoEditor`; longitud editable, DN ↓/↑/Auto), "Borrar
  montante".
- **Recálculo inmediato** (§12): cada alta/baja reconcilia -> nuevo
  `Proyecto` -> `onCambiar` -> render -> Qc/DN/V/J/hf/presión, sin botón
  Calcular. El Qc de cada segmento sale del pipeline normal
  (simultaneidad sobre todo el conjunto aguas abajo), **nunca** de una
  suma de Qc de Locales.
- **Mapeo de resultados** (`interpretarResultadoDeMontante`): `reconciliado`
  -> aplicar; bloqueos -> mostrar `copyHumano` sin mutar;
  `origenIntermedioNoSoportado` / `localSinFeedConectable` -> aviso
  humano; `localNoServido` -> no-op silencioso; bordes defensivos ->
  aviso genérico. Nunca un enum ni un id interno (FIX-LEAK-01/02).

### CAT-CONN + deduplicación del offering

- **CAT-CONN (§10)**: un montante AF ofrece sólo Locales con conectividad
  física **AF real** en `RedHidraulica` (terminal de artefacto + tramo
  entrante -> `Tramo.red`), idem AC. **No** por nombre/tipo de artefacto
  ni por `conectividadElegida`; industriales configurables respetan su
  selección real (misma señal que `determinarConectividadFisica`,
  re-derivada para todo el Local).
- **Deduplicación firme (§11)**: un `(UF, Local, Red)` pertenece a **un
  solo** montante de esa red. La UI no ofrece un Local ya servido por
  este ni por otro montante de la misma red, y nunca crea multi-padre.
  **AF y AC son independientes**: el mismo Local puede estar en un
  montante AF y en uno AC.
- **Enumeración (§17)**: un segmento con `montanteId` se muestra bajo la
  card de su montante, no como fila "Distribución secundaria N"
  (`identificarFilasDistribucionSecundaria` lo filtra, sin cambiar la
  clasificación estructural del motor -- que sigue siendo la fuente de
  VIS-TOPO). Un tramo compartido genérico sin montante sigue como
  "Distribución secundaria N".

### Graph-ready -- proyectabilidad VIS-TOPO demostrada

`proyectarMontante` (en `montantesDelProyecto.ts`) es una proyección
**READ-ONLY** que deriva enteramente de `RedHidraulica` +
`Proyecto.montantes` + UF/Locales: id, nombre resuelto, red, segmentos
ordenados origen->punta con su `orden`, nodos de derivación, Locales
servidos etiquetados, nodo de origen. `montantesDelProyecto.visTopo.test.ts`
(§30) prueba con un fixture de 3 Locales que un resolver READ-ONLY futuro
obtiene id / nombre / red / origen / y por nivel (nodo de derivación,
Local servido, orden, longitud, DN) usando **sólo** esa proyección +
`resolverFilaDeDimensionamiento` (resultados). Si hiciera falta un
`localesIds[]`, un `tramosIds[]` o datos gráficos paralelos, ese test
dejaría de pasar. **No se persiste nada gráfico.**

### Fuera de alcance (sin cambios)

- **HYD-EST-01** sigue bloqueado: el modelo agregado actual de pérdidas
  localizadas estimadas (n-1 tees @ 3,00 + 1 codo90 @ 1,35 + 1 llave @
  9,18 por `(Local, Red)`) no cambia; sin K tee recta/lateral, sin
  transición DN, sin K 0,17, sin pérdidas localizadas de montante
  estimadas.
- **VIS-TOPO-01**: sin SVG / React Flow / Dagre / ELK / Cytoscape /
  pan-zoom / layout -- sólo la prueba de proyectabilidad.
- **M2-TOPO-D**: edición fina de tees.
- Sin ADR (queda para **M2-TOPO-E**).

### Estado

**D-δ.93 / M2-TOPO-C -- CERRADO.**

- Identidad semántica de montante **persistida** (`Proyecto.montantes`),
  membresía **derivada** (`Tramo.montanteId` + topología aguas abajo),
  `RedHidraulica` única fuente física.
- **Constructor** en M2: alta/baja de Locales existentes, orden por cota,
  reutilización de nodo a misma cota, longitud sugerida `|Δz|`,
  renombrar/borrar, recálculo inmediato.
- **RD-1** (resegmentación no destructiva) y **RD-2**
  (`longitudEsSugerida`) cerradas; **D-δ.50** suprimido **sólo** por
  montante explícito (`suprimidoPorMontante`), distribución compartida
  genérica sin cambios.
- `origenIntermedioNoSoportado` documentado como **limitación temporal**.
- **Graph-ready**: proyección READ-ONLY probada; nada gráfico persistido.

Cambios de código en `src/` (esta serie de commits, previa a este
incremento documental): `modelo/proyecto` (`Montante`,
`Proyecto.montantes`), `modelo/redHidraulica` (`Tramo.montanteId`,
`Tramo.longitudEsSugerida`), `validacion/redHidraulica` (4 códigos),
`interfaz/paginas/nombreDeMontante.ts`,
`interfaz/paginas/reconciliarMontante.ts` (motor + `derivarLocalesServidos`
/ `reconstruirCadena` exportados), `interfaz/paginas/montantesDelProyecto.ts`
(identidad + offering + proyección + interpretación de resultado),
`interfaz/paginas/ConstructorDeMontantes.tsx` (+ CSS),
`interfaz/paginas/identificarFilasDeModulo2.ts` (dedup §17),
`interfaz/paginas/ResultadoHidraulicoDeTramo.tsx` (montaje),
`interfaz/paginas/conLongitudDeTramo` (limpieza del flag, RD-2), motor de
pérdida vertical (`suprimidoPorMontante`). Tests: `reconciliarMontante.test.ts`
(25), `nombreDeMontante.test.ts`, `montantesDelProyecto.test.ts` (18),
`ConstructorDeMontantes.componente.test.ts` (4),
`montantesDelProyecto.visTopo.test.ts` (3), `identificarFilasDeModulo2.test.ts`
(+1), `tokensProhibidos.test.ts` (+1), E2E `tests/e2e/montantes.spec.ts`
(3), acciones de fuzz de montante. Baseline: Vitest **1585 / 1585**,
`tsc -b` / `npm run e2e:typecheck` / `npm run build` verdes, ESLint
**11 / 0 / 0** (sin errores nuevos). Fuzz local (dev): baseline 424242
3×30, FIX-CRASH `34411681277-1:0` 30 pasos, FIX-LEAK `34398035608-1`
runs 0–12 -- todos verdes; seeds que ejercen acciones de montante:
`m7`, `m42`, `m99`. Tags sin mover (`v0.4.0-beta.5` en `1476c19`); sin
`beta.6`. Snapshot `resguardo-documentacion/` intacto.

**Hallazgo (fuera de M2-TOPO-C, no bloqueante):** con carga extrema de
artefactos, `describirMotivoIncompletitudModulo3` (caso
`medidorIndividualFueraDeTabla06`, `humanizarModulo3.ts`, de D-δ.56)
interpola el **id crudo de la UF** en el texto al usuario en vez del
nombre humano. Pre-existe a M2-TOPO-C y no lo dispara ninguna acción de
montante. Pendiente de un incremento propio de humanización de M3.

**HYD-EST-01 / VIS-TOPO-01 / M2-TOPO-D / PERSIST-01 / REPORT-01 /
UX-TEST-01 / DEFENSE-01 -- NO iniciar.** Siguiente: **M2-TOPO-D -- UI y
edición fina de tees**.

## D-δ.94 -- FIX-CRASH-M3-INDUSTRIAL-01: ACS central + artefacto industrial AF+AC desmontaba la app -- RESUELTO

Hotfix P0 detectado por el gate de **QA Fuzz cloud 20×30** posterior a
M2-TOPO-C (seed generada `34493241441-1`, **run 15**, `WHITE_SCREEN` en
desktop y mobile, step 28 · `cambiarTipoArtefacto=piletaDeCocinaIndustrial`).
En ese gate el incidente se rotuló provisionalmente
`FIX-CRASH-MONTANTE-CATCONN-01`; como **la causa raíz no tiene que ver con
montantes ni con CAT-CONN** y **pre-existe a M2-TOPO-C**, se renombró a
`FIX-CRASH-M3-INDUSTRIAL-01` antes del commit (el delta `D-δ.94` se
conserva).

### Causa raíz

`contribucionesCentral` en
`src/motor/medidores/resolverAlcancesDeMedidoresIndividuales.ts` (M3-B2b,
D-δ.54). Con **propiedad horizontal** + **provisión de ACS `central`**, un
artefacto industrial de §2.9.1.3 conectado a **AF y AC a la vez**
(`piletaDeCocinaIndustrial`, política `automatica`/referencia `'ambas'`;
también `lavavajillasIndustrial`/`lavarropasIndustrial` con selección
`'ambas'`) entraba a la rama `'ambas'`, que pedía
`resolverQuEfectivo(artefacto, 'aguaFría')` sobre un `quFria_lps` = `null`
-- el catálogo **no desagrega** AF/AC para estos tipos (ERAS no publica
columnas qu(A.Fría)/qu(A.Cal.) para los no domiciliarios de §2.9.1.3) --
y `resolverQuEfectivo` **lanza** por contrato ante un `null`.
`resolverAlcancesDeMedidoresIndividuales` se ejecuta en el render de
`MotorDemandaPantalla` (vía `resolverResumenDeProyecto` →
`resolverEntradasDeVerificacion` → `resolverEstadoModulo3`), sin barrera
estructural, así que la excepción propagaba por React y **desmontaba la
app** (`#root` vacío → `WHITE_SCREEN`).

- **Operación que crea el estado inválido:** `cambiarTipoArtefacto` a un
  industrial `'ambas'` mientras PH=on y ACS=central. El estado resultante
  es **válido** (una pileta de cocina industrial conectada AF+AC en
  propiedad horizontal con ACS central es un proyecto legítimo); el
  resolver debía manejarlo, no un estado prohibido.
- **Operación que lo hace visible:** el mismo render inmediato posterior
  (recálculo del resumen/sidebar).
- **Relación con M2-TOPO-C:** ninguna. La MISMA suposición ("todo mixto
  tiene desagregación de catálogo") ya se había corregido en M2 con
  `resolverQuEfectivoParaTramo` (ampliación de CRIT-A15, D-δ.79 -- el
  comentario de ese archivo nombra explícitamente "pileta de cocina
  industrial"); la copia de M3 en `contribucionesCentral` nunca se
  actualizó. La acción de fuzz `crearMontanteAF` (nueva en M2-TOPO-C) sólo
  cambió la mezcla de acciones y llevó esa seed a la combinación --
  reproducido con una secuencia mínima de **7 acciones sin ningún
  montante**.

### Fix

`contribucionesCentral`, rama `'ambas'`, guarda previa: si
`quFria_lps === null || quCaliente_lps === null` (catálogo sin
desagregar), cada ramal común (AF y AC) con su medidor se dimensiona para
el `quTotal_lps` del artefacto -- misma ampliación de CRIT-A15 (D-δ.79)
que aplica `resolverQuEfectivoParaTramo` en M2, y coherente con las ramas
`soloAF`/`soloAC` de la misma función, que ya devuelven `quTotal`. El
medidor **general** sigue viendo `quTotal` una sola vez (no participa de
esta función), sin doble conteo (D-δ.8).

- **No** se tocó ninguna fórmula hidráulica, ni CAT-CONN, ni la política
  de conectividad, ni el motor de montantes (`reconciliarMontante.ts`,
  `montantesDelProyecto.ts`), ni la reconciliación M1→M2, ni
  `podarNodosSinSalida`.
- **No** se agregó `try/catch` ni `ErrorBoundary` que oculte la
  excepción: se corrigió el `caller` (DEFENSE-01 sigue pendiente para su
  propio slice).
- **No** se relajó el fuzz: `cambiarTipoArtefacto` y
  `piletaDeCocinaIndustrial` siguen habilitados; la invariante
  `pantalla-no-blanca` sigue estricta; la misma seed debe pasar tras el
  fix.

### CAT-CONN / montantes / M3 -- antes/después

- **CAT-CONN:** sin cambios. `piletaDeCocinaIndustrial` sigue con política
  `automatica`/referencia `'ambas'` y crea terminales AF y AC.
- **Montantes:** no implicados. La proyección y el motor no se tocan.
- **M3:** único módulo implicado. `contribucionesCentral` antes lanzaba
  para (industrial `'ambas'`, ACS central); después devuelve
  `{ af_lps: quTotal, ac_lps: quTotal }`. Los demás casos de
  `resolverAlcancesDeMedidoresIndividuales` (mixto con desagregación,
  `soloAF`, `soloAC`, ACS individual) intactos -- 11 tests previos verdes.

### Regresión

- `src/motor/medidores/resolverAlcancesDeMedidoresIndividuales.test.ts`
  (+1): ACS central + `piletaDeCocinaIndustrial` conectada AF+AC -> no
  lanza, cada medidor ve `quTotal` (0,50 l/s), y B2a
  (`seleccionarMedidorIndividual`) produce una selección válida.
- `tests/e2e/hallazgos.spec.ts` (**test normal**, no `test.fail`):
  secuencia mínima de 7 acciones (Medidores → Iniciar M3 → PH on → ACS
  central → Demanda → tipo de artefacto = `piletaDeCocinaIndustrial`) ->
  app viva, sin el `pageerror` de `resolverQuEfectivo`, sin
  `console.error`, `#root` con contenido. Falla `WHITE_SCREEN` desktop +
  mobile contra el código pre-fix (verificado con `git stash`).
- **Gate local completo:** seed base `34493241441-1`, corrida equivalente
  al workflow (`runs 0–19`, `steps=30`), **desktop + mobile**, contra
  `vite` dev con el fix -- **20/20 runs verdes**. El run 15 (el que
  fallaba, step 28) pasa 30/30 en ambos proyectos. Los runs 16–19 (que en
  la nube quedaron sin ejecutar porque Playwright cortó tras el fallo del
  run 15) se ejecutaron con la facilidad nueva `IUAS_FUZZ_START_RUN`
  (acota sólo el bucle; misma seed `${base}:${run}`, determinista).
  Documentada en `QA-FUZZ.md` como *FIX-CRASH-M3-INDUSTRIAL-01 canonical
  regression seed*; **NO** se agrega a `HALLAZGOS_CONOCIDOS`.

### Estado

**D-δ.94 / FIX-CRASH-M3-INDUSTRIAL-01 -- CERRADO.** Cambio de código:
`src/motor/medidores/resolverAlcancesDeMedidoresIndividuales.ts` (guarda
en `contribucionesCentral`, y `export` de la función para el test
directo). Facilidad de harness: `tests/e2e/sequence-fuzz.spec.ts`
(`IUAS_FUZZ_START_RUN`, acota el bucle sin tocar la derivación de seed).
Tests: `resolverAlcancesDeMedidoresIndividuales.test.ts` (+4 -- 3 sobre
`contribucionesCentral` directo + 1 integración con catálogo real),
`tests/e2e/hallazgos.spec.ts` (+1). Baseline: Vitest **1589 / 1589**,
`tsc -b` / `e2e:typecheck` / `build` verdes, ESLint **11 / 0 / 0** (sin
errores nuevos). Fuzz: seed canónica `34493241441-1` runs **0–19**
desktop+mobile 20/20; baseline `424242` 3×30, `34411681277-1:0` 30/30,
`34398035608-1` runs 0–12 13/13 -- sin regresión. `v0.4.0-beta.5` sin
mover; sin `beta.6`. Snapshot `resguardo-documentacion/` intacto.

**Pendientes conocidos preservados (sin abrir en este hotfix):**
`FIX-LEAK-M3-01` P2 (`humanizarModulo3.ts` `medidorIndividualFueraDeTabla06`
interpola el id crudo de UF -- de D-δ.56, ver D-δ.93); quirk de
`vite preview` (sirve en `/`, no `/IUAS/`, con `command === 'serve'`; el
E2E local corre contra `npm run dev`).

> **Corrección de trazabilidad (preflight de M2-TOPO-D).** Una versión
> anterior de este bloque listaba también `PERF-SCALE-01` (P1) y
> `UI-M2-GROUP-01` como "pendientes del QA cloud". El preflight de
> M2-TOPO-D no encontró para ninguno de los dos **ninguna definición
> sustanciada** en el repo, la documentación, `QA-FUZZ.md` §13,
> `HALLAZGOS_CONOCIDOS`, el historial de git ni los artifacts disponibles
> (sin síntoma, reproducción, pantalla/acción, tamaño de proyecto,
> métrica, umbral, impacto ni criterio de aceptación). El usuario confirmó
> que son **referencias huérfanas / error de trazabilidad, no deudas
> activas**: `PERF-SCALE-01` **no** es un P1 vigente y **no** bloquea
> M2-TOPO-D; `UI-M2-GROUP-01` no tiene definición canónica y **no** se
> absorbe automáticamente en ningún slice. Si en QA futuro aparece un
> problema real de escala/rendimiento o de agrupación visual, se registra
> como hallazgo **nuevo** con reproducción, tamaño de proyecto, acción,
> métrica, impacto, prioridad y criterio de aceptación -- sin atribuirlo
> retroactivamente a estos identificadores.

**HYD-EST-01 / VIS-TOPO-01 / M2-TOPO-D / PERSIST-01 / REPORT-01 /
UX-TEST-01 / DEFENSE-01 -- NO iniciar.** Siguiente: **M2-TOPO-D -- UI y
edición fina de tees**, sólo tras un nuevo QA Fuzz cloud 20×30 verde.

## D-δ.95 -- M2-TOPO-D: edición fina de tees de las derivaciones de montante + reconciliación de `Nodo.tee` -- CERRADO

Cuarto slice de la serie M2-TOPO-01 (A identificación, B enumeración, C
constructor + identidad, D edición fina de tees). Cierra la brecha de
M2-TOPO-C: las bifurcaciones sobre la espina de un montante quedaban
**huérfanas de toda UI** (no aparecían en el árbol de `LocalYRedCard`
porque están aguas ARRIBA del feed de cada Local), y en modo Detalladas
dejaban la verificación de presión **incompleta** (`teeSinConfigurar`) sin
forma de resolverlo. **No** reabre el motor, **no** crea entidad nueva,
**no** toca HYD-EST ni VIS-TOPO.

### Modelo -- `Nodo.tee` sigue siendo la fuente canónica

`ConfiguracionDeTee` (CRIT-A31, D-δ.33) intacta: alcance exclusivo 1
entrante + 2 salientes; `entradaPorExtremo { tramoSalidaRectaId }` o
`entradaCentral`. La tee es propiedad **nodal**, NUNCA un accesorio de
`Tramo` (no entra al picker de accesorios; CRIT-A30/A31 sin cambios). Sin
`Nodo.tee` = "no relevada" (no "sin tee"). La geometría la declara SIEMPRE
el proyectista: **cero heurística** recto/lateral (ni por orden del array
`tramosSalientesIds`, ni por DN, ni por cantidad de terminales, ni por si
la rama es el montante) -- test §29 en `resolverClasificacionDeTee.test.ts`.

### UI -- editor reutilizado, en la card del montante, sólo Detalladas

- `TeeDeNodoEditor.tsx` **refactorizado** (un solo editor, sin fork
  `...DeMontante`): de botones a **radios** con `<fieldset>/<legend>`,
  `role="radiogroup"`, labels, `name` de grupo **opaco** (`useId()`, nunca
  el id del Nodo). Dos grupos: "la cañería entra por… un extremo / el
  centro" y, si por extremo, "continúa recta hacia… {salida A} / {salida
  B}". Estado transitorio "por extremo sin recta elegida" vive sólo en el
  render (`useState`), nunca en el Proyecto (§14). Cambiar a "central"
  descarta `tramoSalidaRectaId` (el modelo reemplaza la config completa).
  Sin `Nodo.tee`: nada preseleccionado + aviso "Falta definir la
  configuración de la derivación — en Detalladas la verificación de
  presión queda incompleta hasta elegirla" (§25). Fallback de etiqueta
  ausente = texto neutro, **nunca** el `tramoId` (FIX-LEAK / §34).
- `ConstructorDeMontantes.tsx`: nueva sección **"Derivaciones"** en la card
  del montante, visible sólo con `metodoPerdidaLocalizada === 'detallado'`
  (§8; MODE sigue desacoplado). Una entrada por nodo de derivación real;
  cada nodo físico tiene su propia `Nodo.tee` (§16), no hay config global
  de montante. Montante con 0/1 Local o punta 1→1: **no** se muestra editor
  fantasma (§15/§39).
- `montantesDelProyecto.ts`: `derivacionesDeMontante(proyecto, montanteId)`
  (proyección READ-ONLY: por nodo `nodoDestinoId` de un segmento, clasifica
  `bifurcacion` 1→2 editable | `noConfigurable` 1→N) y
  `etiquetaDeSalidaDeMontante` (§6/§17: continuación del montante → su
  nombre; feed de exactamente un Local → su etiqueta; varios → "Ramal a
  varios Locales"; ninguno → "Salida sin destino"; nunca un id). Es también
  la proyección graph-ready para HYD-EST/VIS-TOPO (§21): nodo de
  derivación, montante, tramo entrante, salientes, destino humano, red,
  config si existe -- todo derivado de `RedHidraulica` + `Proyecto.montantes`
  + UF/Locales, **sin nada gráfico persistido**.

### Reconciliación de `Nodo.tee` -- `reconciliarTeesTrasCambioTopologico`

Alta/baja de Locales, misma cota y borrado de montante cambian el fan-out
de un nodo de derivación: 1→2 → 1→3 (Local nuevo a una cota ya servida),
1→2 → 1→1 (se quitó su única rama), o la salida marcada como recta dejó de
salir de ese nodo. En todos esos casos `Nodo.tee` queda inválido
(`validarRedHidraulica` lo rechazaría; `resolverClasificacionDeTee`
lanzaría en el balance de presión -- riesgo de WHITE_SCREEN en
`PanelDePresionDeModulo2`). El nuevo paso, aplicado al final de cada
comando del reconciliador de montantes
(`agregarLocalAMontante` / `quitarLocalDeMontante` / `borrarMontante`),
**limpia de forma determinista** sólo la metadata que ya no puede
aplicarse: preserva `Nodo.tee` intacta si el nodo sigue siendo exactamente
1→2 con las mismas dos salidas; nunca toca `longitud_m` /
`dnComercialAdoptado` / `accesorios` (RD-1/RD-2 de M2-TOPO-C) ni la
topología (§13/§19/§20). La decisión "esta salida es la recta" no puede
"sobrevivir" a que el nodo deje de ser una pieza en T de dos salidas.

### Efecto hidráulico -- sin fórmula nueva

En Detalladas, `resolverClasificacionDeTee` → `teePasoRecto` /
`teeSalidaLateral` / `teeEntradaCentralSalidasLaterales` (Ks ya conocidos
de Tabla N°7). Configurar la tee de un nodo antes `teeSinConfigurar` pasa
a acumular una contribución de tee > 0 (test integración
`montanteTees.integracion.test.ts`, fixture de 3 Locales a cotas 2/5/8, 2
derivaciones en cadena). **Estimadas intactas (§37):**
`resolverPerdidaLocalizadaEstimadaDeLocal` NO lee `Nodo.tee` --
`conTeeDeNodo` no cambia el modelo agregado (n−1 tees @ Ks 3,00 + codo90 +
llave, Vref); test byte-equivalente antes/después. El demo y todo proyecto
sin montantes/tees: sin cambios (no hay rebaseline de goldens).

### Fan-out 1→N (N≥3) -- LIMITACIÓN CONOCIDA, no decisión roja

M2-TOPO-C produce nodos 1→N cuando ≥2 Locales comparten cota y el montante
continúa (o ≥3 en la punta). `ConfiguracionDeTee` sólo representa 1→2.
Comportamiento **verificado** (`montanteTees.integracion.test.ts`, fixture
3 Locales a cota 4/4/4):

- la topología 1→3 es **válida para Qc** (M2-TOPO-A, §12) y
  `validarRedHidraulica` no la rechaza;
- en Detalladas, `resolverClasificacionDeTee` → `noEsBifurcacionDeTee` →
  el nodo contribuye **0** a la pérdida localizada, **sin** reportar
  `teeSinConfigurar` (no bloquea el balance): la pérdida real de la
  derivación múltiple **no se modela** -- subestimación silenciosa del
  orden de una a dos Ks de tee (~0,2–0,6 m.c.a. por junta omitida);
- **NO es nuevo de D**: es el alcance de CRIT-A31 desde D-δ.33 y aplica a
  cualquier nodo 1→N (cabeceras de Local con ≥3 artefactos incluidas). D
  **no lo empeora**; hace la UI **honesta** (`noConfigurable` con copy que
  explica la limitación y sugiere separar las cotas para que cada nivel
  sea una bifurcación simple), en vez de un editor 1→2 engañoso (§12/§40).

Resolverlo requeriría **elegir entre geometrías físicas no equivalentes**
(modelar el cruce como cadena de tees: orden de Locales, cuál es recto,
longitudes de nodos intermedios ficticios) -- **explícitamente prohibido
por §11**. Queda como pendiente para **HYD-EST** (política path-aware) o
**M2-TOPO-E** (cierre arquitectónico). **No** se toma una decisión física
por conveniencia de implementación en este slice.

### Estado

**D-δ.95 / M2-TOPO-D -- CERRADO** (con la limitación 1→N documentada
arriba). Cambios de código en `src/`:
`interfaz/paginas/TeeDeNodoEditor.tsx` (refactor a radios + `useId`),
`interfaz/paginas/reconciliarMontante.ts`
(+`reconciliarTeesTrasCambioTopologico`, aplicado en `finalizar` y
`borrarMontante`), `interfaz/paginas/montantesDelProyecto.ts`
(+`derivacionesDeMontante` / `etiquetaDeSalidaDeMontante`),
`interfaz/paginas/ConstructorDeMontantes.tsx` (+sección "Derivaciones"),
`interfaz/paginas/constructorDeMontantes.css` (estilos del editor).
`Nodo.tee` / `ConfiguracionDeTee` / `resolverClasificacionDeTee` /
`acumularPerdidaLocalizadaDeCamino` / `validarRedHidraulica`: **sin
cambios**. Tests: `TeeDeNodoEditor.test.ts` (reescrito, 7),
`montantesDelProyecto.test.ts` (+~9),
`resolverClasificacionDeTee.test.ts` (+2, §29/§35),
`montanteTees.integracion.test.ts` (nuevo, 6; §36/§37/§40),
`ResultadoHidraulicoDeTramo.test.ts` (copy actualizado). Baseline: Vitest
**1606 / 1606**, `tsc -b` / `e2e:typecheck` / `build` verdes, ESLint
**11 / 0 / 0** (sin errores nuevos). E2E `montantes.spec.ts` (+1 caso de
tee, verde desktop). `v0.4.0-beta.5` sin mover; sin `beta.6`. Snapshot
`resguardo-documentacion/` intacto. `FIX-LEAK-M3-01` P2 sigue fuera de
alcance. `PERF-SCALE-01` / `UI-M2-GROUP-01`: referencias huérfanas
(preflight de D), no bloqueantes -- ver corrección de trazabilidad en
D-δ.94.

**HYD-EST-01 / VIS-TOPO-01 / PERSIST-01 / REPORT-01 / UX-TEST-01 /
DEFENSE-01 -- NO iniciar.** Siguiente: **M2-TOPO-E -- cierre
arquitectónico de la serie de topología** (ADR si corresponde; decidir el
desbloqueo formal de HYD-EST / VIS-TOPO; y la pérdida localizada de las
derivaciones 1→N), sólo tras un nuevo QA Fuzz cloud 20×30 verde.

## D-δ.96 -- M2-TOPO-E: cierre arquitectónico de M2-TOPO-01 + política 1→N (`derivacionMultipleNoModelada`) + `ADR-0001` + desbloqueo formal de HYD-EST / VIS-TOPO -- CERRADO

Quinto y **último** slice de la serie M2-TOPO-01 (A identificación
estructural D-δ.91, B enumeración/edición D-δ.92, C identidad + constructor
D-δ.93, D edición fina de tees D-δ.95, E cierre D-δ.96). **No** es una
nueva ronda de construcción: es auditoría + cierre arquitectónico + una
corrección funcional acotada del gap final (fan-out 1→N en Detalladas).
Gate de entrada: QA Fuzz cloud 20×30 seed vacía sobre `main` @ `618f7ca`
**verde** (confirmado por el usuario).

### Auditoría A/B/C/D -- sin contradicciones

Reconstruida desde implementación + tests + D-δ.91/92/93/95 + `CRITERIOS.md`
+ `ROADMAP.md` + este documento:

- **fuente de verdad única**: `RedHidraulica` (grafo dirigido, arborescencia,
  ≤1 entrante por nodo, sin ciclos, red vacía válida, fan-out 1→N válido).
  La topología **no** vive en componentes React, ni en `Montante`, ni en VIS,
  ni en arrays duplicados de Locales, ni en coordenadas.
- **`Montante = { id; red; nombre? }`** y nada más: identidad semántica.
  Membresía física sólo por `Tramo.montanteId`; Locales servidos derivados
  aguas abajo. `montanteId` **no lo lee ningún cálculo hidráulico** -- su
  único uso en el motor es la supresión dirigida de D-δ.50
  (`resolverIncrementoVerticalPorNivel`); la distribución compartida genérica
  sin montante conserva D-δ.50 histórico (Alternativa A de D-δ.92).
- **datos físicos** en `Nodo` / `Tramo`; longitud 0 inválida (CRIT-A20);
  `longitudEsSugerida` distingue precargado de manual (RD-2, procedencia
  nunca inferida por valor); dato manual nunca se redistribuye (RD-1); tee
  es propiedad **nodal**, nunca accesorio de `Tramo`.
- **helpers read-only** (`proyectarMontante`, `derivacionesDeMontante`,
  `etiquetaDeSalidaDeMontante`, `identificarTramosDeDistribucionCompartida`):
  sin traversals redundantes grotescos; `derivacionesDeMontante` cuenta la
  topología por sí mismo (`entrantes === 1 && salientes >= 3` -> `noConfigurable`),
  coherente con el nuevo criterio de `resolverClasificacionDeTee` sin
  duplicar lógica de dominio.
- **contradicciones encontradas**: ninguna. Cada slice consumió la señal
  estructural del anterior sin reimplementarla. No hay segunda forma de
  identificar montantes ni reconstrucción de membresía desde la UI.

### Fan-out 1→N -- comportamiento inicial (gap heredado de D-δ.33 / D-δ.95)

Un nodo con **1 entrante + N salientes, N>2** (p. ej. ≥2 Locales de un
montante a la misma cota, o la cabecera de un Local con ≥3 artefactos):

- topología **válida para Qc** (M2-TOPO-A §12) y para `validarRedHidraulica`;
- en Detalladas, `resolverClasificacionDeTee` devolvía `noEsBifurcacionDeTee`
  -> el nodo aportaba **0** a la pérdida localizada del camino, **sin**
  reportar `teeSinConfigurar` ni ninguna incompletitud;
- con accesorios relevados en el resto del camino, `acumularPerdidaLocalizadaDeCamino`
  devolvía `acumulada` y el balance de presión podía figurar **"completo"**
  aunque la singularidad física de la derivación múltiple no estuviera
  modelada -- **un falso "completo"**.

`ConfiguracionDeTee` (CRIT-A31) cubre sólo 1→2. Representar 1→N exigiría
elegir orden físico de las ramas, cuál es recta, piezas reales y longitudes
de nodos intermedios ficticios -- datos que el modelo no tiene y que dos
configuraciones físicamente válidas resuelven distinto.

### Política final adoptada (§8, implementada autónomamente -- no decisión roja)

La política preferida del brief se pudo implementar **reutilizando el
sistema de incompletitud existente** (`ResultadoPerdidaLocalizadaDeCamino.incompleta`
+ motivos + humanización) **sin alterar ninguna fórmula** y **sin elegir
ninguna geometría** (§9): por tanto se implementó sin detenerse.

- **`resolverClasificacionDeTee`** (`motor/tuberias/topologia/`): nueva
  variante `{ tipo: 'derivacionMultipleNoModelada'; cantidadSalidas }`,
  devuelta cuando `entrantes.length === 1 && salientes.length > 2`. Depende
  **sólo de la topología real**, nunca de `montanteId` (§13). `noEsBifurcacionDeTee`
  queda para 1→1 / raíz / multi-padre (contribución 0 genuina). §35 (defensa
  en profundidad: nodo con `tee` vieja que dejó de ser 1→2) ahora devuelve
  `derivacionMultipleNoModelada`, no `noEsBifurcacionDeTee`.
- **`acumularPerdidaLocalizadaDeCamino`** (`motor/tuberias/presion/`):
  `MotivoTramoSinPerdidaLocalizada` suma `'derivacionMultipleNoModelada'`.
  Ambos loops (relevables en Profesional; ramal en Simplificada) marcan ese
  `Tramo` como no resuelto por ese motivo -> el camino devuelve
  `incompleta`. **No** se asigna Ks, **no** se calcula pérdida, **no** se
  fabrica geometría.
- **`agruparMotivosDeModulo2`** (`interfaz/paginas/`): parte los tramos de
  `perdidaLocalizadaIncompleta` por motivo -- los `derivacionMultipleNoModelada`
  generan su propia línea humana (*"En N tramos la pérdida localizada de una
  derivación múltiple todavía no está modelada."*), separada de *"Falta
  relevar accesorios o tees en N tramos."*. Sin ids, sin enums, sin número
  de nodo técnico.
- **`ConstructorDeMontantes.tsx`**: la nota de la derivación `noConfigurable`
  ahora aclara que *"en Detalladas la verificación de presión de esos
  Locales queda incompleta"* -- coherente con el pipeline (§12: la UI ya no
  dice "no modelada" y luego "verificación completa").
- **`resolverPresionResidualDeCamino` / `resolverEstadoModulo2` /
  `resolverBalanceDePresion`**: **sin cambios de código** -- el motivo nuevo
  se propaga por el tipo `MotivoTramoSinPerdidaLocalizada` ya threaded.

**Cero Ks / geometría inventada -- demostración:** los tests
`resolverClasificacionDeTee.test.ts` (§8: 1→3 -> `derivacionMultipleNoModelada`
con `cantidadSalidas`, nunca un `idAccesorioTabla07`) y
`montanteTees.integracion.test.ts` (§40: el camino 1→3 queda `incompleta`
con **todos** los motivos `=== 'derivacionMultipleNoModelada'`, sin throw;
el Qc de los segmentos se sigue resolviendo; Estimadas `1→3` conserva su
modelo agregado) fijan que no aparece ningún número de pérdida nuevo.

### Tees 1→2 -- contrato final SIN cambios

`teeSinConfigurar` (Nodo.tee ausente sobre bifurcación real) ->
`incompleta`; `entradaPorExtremo` + `tramoSalidaRectaId` -> paso recto /
lateral; `entradaCentral` -> ambas salidas laterales; Ks de Tabla N°7;
velocidad de salida por Qc propio del tramo; acumulación en el camino.
`reconciliarTeesTrasCambioTopologico` sin cambios (1→2→1→1, 1→2→1→3, salida
recta eliminada, nodo preservado, borrar montante -- ya cubiertos por
`montantesDelProyecto.test.ts` y `reconciliarMontante.test.ts`). Ninguna
constante tocada.

### Detalladas / Estimadas / Presión / M3 / M4

- **Detalladas**: único cambio -- el falso "completo" 1→N pasa a
  `perdidaLocalizadaIncompleta` / `derivacionMultipleNoModelada`. El resto
  idéntico.
- **Estimadas**: **intacto**. `resolverPerdidaLocalizadaEstimadaDeLocal` no
  lee `Nodo.tee` ni la topología 1→N; modelo agregado por `(Local, Red)`
  (`max(0, n-1)` tees @ Ks 3,00 + 1 codo90 @ 1,35 + 1 llave @ 9,18, Vref)
  sin cambios; test byte-equivalente antes/después.
- **Presión**: caminos profundos con tees 1→2 configuradas se siguen
  acumulando; un 1→N intermedio deja el camino incompleto; D-δ.50 sigue
  suprimido sólo si el camino atraviesa un tramo con `montanteId`.
- **M3 / M4**: sin cambios de responsabilidad. Regresión verde.

### Backward compatibility -- demostrada

Proyecto sin `montantes` / sin `montanteId` / sin `longitudEsSugerida` /
sin `Nodo.tee` (todos los actuales, incluido el de ejemplo: `simplificada`,
0 tramos compartidos): comportamiento **byte-idéntico**. Proyecto vacío
(0 UF, red vacía, sin montantes): válido, "Reiniciar cálculo" no se rompe.
Ningún campo nuevo obligatorio; sin migración (`SCHEMA_VERSION_ACTUAL` no
cambia).

### Goldens -- SIN rebaseline

`npx vitest run` **1611 / 1611**. Los golden hidráulicos
(`resolverHidraulicaDeTramo`, `resolverEstadoModulo4`, `calcularReservaDiaria`)
no tocan el pipeline de pérdida localizada de camino -> **sin cambio de
número**. Único ajuste de fixture: `montanteTees.integracion.test.ts` §40 y
`acumularPerdidaLocalizadaDeCamino.test.ts` (test de "manifold plano")
pasan de esperar `acumulada` a esperar `incompleta` para un caso
explícitamente 1→N en Detalladas -- **corrección de falso-completo, no
rebaseline hidráulico** (no se inventa ningún `hf`). Dos fixtures de
`acumularPerdidaLocalizadaDeCamino.test.ts` que usaban un nodo 1→3 sólo
como "fan-out sin tee" se reconvirtieron a bifurcación 1→2 `entradaCentral`
para conservar su cobertura real (CRIT-A30 velocidad por tramo /
reducciones).

### Multinivel futuro (`UI-M1-MULTINIVEL-01`) -- auditoría de compatibilidad, SIN implementación

M2-TOPO ordena las derivaciones y calcula Δz por **cota de piso efectiva
del Local** (`resolverCotaPisoDeLocal` = `Local.cotaPiso_m ??
UnidadFuncional.cotaHidraulicaReferencia_m`), **no** por "una UF = una
planta". Una UF multinivel podrá asignar `cotaPiso_m` por Local sin
reemplazar el grafo hidráulico. La única suposición UF-granular restante es
el `3·nivel` vertical típico de D-δ.50 en Simplificada, que ya se suprime en
los caminos por montante y es una aproximación conocida de ese método, no
una dependencia de la topología. **Sin gap que rompa una futura UF
multinivel.** No se incorpora entidad `Nivel` (queda para su propio slice).

### ADR

**`docs/adr/ADR-0001-topologia-hidraulica-explicita-y-semantica-de-montantes.md`**
(nuevo). Es el **primer ADR del repositorio**: `docs/adr/` existía vacío
(deuda registrada en `ROADMAP.md`) y no hay ADR-001..014 previos, así que
la numeración arranca en `ADR-0001` -- el "ADR-015" que circuló en la
planificación se descarta. Registra: contexto (necesidad de representar
distribución general / secundaria / montantes / niveles / caminos /
derivaciones / presión sin una segunda fuente de verdad); decisión
(`RedHidraulica` única fuente; `Montante` identidad mínima; datos físicos
en `Nodo`/`Tramo`; tee metadata nodal 1→2; nodo topológico ≠ pieza física;
1→N no se interpreta sin datos); reconciliación M1→M2 incremental,
preservación de datos manuales, IDs estables; consecuencias (VIS deriva el
grafo, HYD-EST consume topología, sin layouts persistidos); compatibilidad
(proyectos sin montantes válidos, sin migración) y la nota multinivel.

### Graph-ready -- prueba final

VIS-TOPO puede derivar exclusivamente de `RedHidraulica` +
`Proyecto.montantes` + UF/Locales + resultados hidráulicos: origen,
montantes, segmentos, distribución, nodos de derivación, Locales destino
(etiquetas humanas), red AF/AC, DN, longitud, niveles/cotas, tee 1→2 si
está configurada. No necesita x/y persistidos, edges aparte, `localesIds[]`
ni `tramosIds[]` dentro de `Montante`. Cubierto por
`montantesDelProyecto.visTopo.test.ts` (fixture de 3 Locales) y la nueva
cobertura 1→3 de `montanteTees.integracion.test.ts`.

### HYD-EST -- DESBLOQUEADO

**HYD-EST puede comenzar** porque la topología ya expone, para un camino:
qué nodo bifurca (`identificarNodosDeBifurcacion` / `resolverClasificacionDeTee`),
cuántas salidas tiene, qué salida recorre el camino, si una tee 1→2 está
configurada y si pasa recto o lateral (`resolverClasificacionDeTee` ->
`teePasoRecto` / `teeSalidaLateral` / `teeEntradaCentralSalidasLaterales`),
DN antes/después (`resolverDiametroComercialDeTramo` por tramo), velocidades
de tramos, y Local/Red destino (`etiquetaDeSalidaDeMontante` /
`obtenerCaminoHaciaOrigen`). **DESBLOQUEADO** para: tee 1→2 configurada,
recto/lateral, DN, velocidades, red, Local destino. **NO resuelto
físicamente**: 1→N (HYD-EST no puede inventar esa geometría; hoy el camino
queda `derivacionMultipleNoModelada`). D-δ.90 sigue vigente: el modelo
Estimadas actual (n−1 tees @ 3,00 + codo90 + llave, Vref) queda intacto
hasta que HYD-EST lo reemplace path-aware; no se aplican tee lateral 1,62 /
tee straight 1,00 / reducción 0,75 / gate valve 0,17 / equivalentes 2,37 y
1,75.

### VIS-TOPO -- DESBLOQUEADO

**VIS-TOPO puede comenzar** porque hay **un solo grafo fuente**
(`RedHidraulica`), identidad de montante estable (`Proyecto.montantes`),
nodos/tramos, derivaciones, destinos humanos, niveles/cotas y resultados
hidráulicos derivables, y **no hace falta persistir layout** (sin SVG /
React Flow / Dagre / ELK / Cytoscape / pan-zoom todavía -- eso es el
trabajo de VIS-TOPO-01).

### Estado

**D-δ.96 / M2-TOPO-E -- CERRADO.** Cambios de código en `src/`:
`motor/tuberias/topologia/resolverClasificacionDeTee.ts` (variante
`derivacionMultipleNoModelada`), `motor/tuberias/presion/acumularPerdidaLocalizadaDeCamino.ts`
(motivo + ambos loops), `interfaz/paginas/agruparMotivosDeModulo2.ts`
(línea humana propia), `interfaz/paginas/ConstructorDeMontantes.tsx` (copy).
Docs: `docs/adr/ADR-0001-...md` (nuevo), `src/normativa/eras-2023/CRITERIOS.md`
(CRIT-A31), `ROADMAP.md`, este documento. Tests:
`resolverClasificacionDeTee.test.ts` (+1, §8), `montanteTees.integracion.test.ts`
(§40 reescrito + §30-D/§30-E), `acumularPerdidaLocalizadaDeCamino.test.ts`
(3 fixtures 1→3 ajustadas), `agruparMotivosDeModulo2.test.ts` (+2),
`tests/e2e/montantes.spec.ts` (+1 caso 1→3). Baseline: Vitest
**1611 / 1611**, `tsc -b` / `npm run e2e:typecheck` / `npm run build`
verdes, ESLint **11 / 0 / 0** (sin errores nuevos; los 11 pre-existentes no
están en archivos tocados). E2E dirigido (`montantes` 5/5 desktop, `smoke`
1/1, `hallazgos` 4/4) contra `npm run dev`. Fuzz local en serie
(no concurrente): `424242` 3×30, `34493241441-1:15` desktop+mobile,
`34411681277-1:0`, `34398035608-1` runs 0–12, `m7` / `m42` / `m99` --
verdes. `v0.4.0-beta.5` sin mover; sin `beta.6`. Snapshot
`resguardo-documentacion/` intacto.

**M2-TOPO-01: CERRADO.** El motor soporta profundidad arbitraria de
segmentos; distribución compartida identificable; montantes explícitos
editables; Locales agregables/removibles; cotas/segmentos reconciliados;
dato físico manual preservado (RD-1/RD-2); D-δ.50 coherente; tee 1→2
configurable; stale tee reconciliada; **1→N ya no se interpreta falsamente
como una tee simple ni como "completo"**; Estimadas histórico intacto; M3/M4
compatibles; VIS proyectable; HYD-EST desbloqueado en lo que la topología
realmente conoce; backward compatibility demostrada.

### PERF-SCALE-01 -- P1 REAL (siguiente prioridad tras el cierre)

Definido con el usuario **fuera del repo**; **no** es una referencia
huérfana (la nota de D-δ.94 queda corregida por este delta). Caso real:
14 UF, ~238 terminales, inputs M4/verificación casi congelados. Perfil
Chrome producción: ~19,7 s de muestra, ~15,2 s scripting, ~14,9 s en el
main thread. Hotspot confirmado:
`determinarCondicionHidraulicaDeCaudal` ~6,4 s SELF en una ventana de
~10 s -- por cada llamada reconstruye `tramo.find`, un `Map` de nodos, un
`Map` de salientes y un DFS aguas abajo para **un** artefacto. Segundo
hotspot (minificado `Xe`, ~2,5 s self) sin identificar todavía. **No se
optimiza en M2-TOPO-E.** Queda como **siguiente P1** tras el cierre de
M2-TOPO-01, después del próximo QA Fuzz cloud verde.

### Pendientes preservados (sin abrir en este slice)

- **`PERF-SCALE-01`** -- P1 (arriba).
- **`UI-M2-GROUP-01`** -- paquete UX ya acordado: árbol
  `UF > Local · N artefactos físicos > Agua fría · N puntos / Agua caliente
  · N puntos`, UF colapsables (contenido colapsado idealmente no montado),
  "Duplicar local" en M1. No implementar aquí.
- **`UI-M1-MULTINIVEL-01`** -- una UF puede ocupar varios niveles (dúplex,
  tríplex): dentro de la UF, "Duplicar unidad funcional" / "+ Agregar
  nivel" / "Eliminar unidad funcional"; cada nivel con Nombre / Nivel /
  Cota / Locales / Artefactos; una UF de un nivel se ve casi igual que hoy.
  M2-TOPO ya es compatible (cota efectiva de Local). No implementar aquí.
- **`FIX-LEAK-M3-01`** -- P2: `humanizarModulo3.ts`
  (`medidorIndividualFueraDeTabla06`, D-δ.56) puede interpolar el id crudo
  de UF con carga extrema de artefactos. Sin tocar.
- **`HYD-EST-01`** -- desbloqueado (arriba); no implementar (tee lateral
  1,62 / straight 1,00 / reducción 0,75 / gate 0,17 / equivalentes 2,37 y
  1,75).
- **`VIS-TOPO-01`** -- desbloqueado (arriba); no implementar (sin gráfico).
- **`PERSIST-01` / `REPORT-01` / `UX-TEST-01` / `DEFENSE-01`** -- NO iniciar.

**Siguiente:** nuevo **QA Fuzz cloud 20×30 seed vacía** sobre `main`; si
queda verde, iniciar **PERF-SCALE-01**.

## D-δ.97 -- PERF-SCALE-01A: motor de resolución a escala -- reutilización del traversal de condición hidráulica -- CERRADO

Primer slice de `PERF-SCALE-01` (P1). Objetivo acotado: **eliminar el costo
algorítmico redundante** que volvía prácticamente inutilizable la app con
proyectos de escala real, **preservando EXACTAMENTE los resultados
hidráulicos**. No agrega features, no toca fórmulas, no cambia criterios
normativos, no reabre M2-TOPO-01, no toca React.

### Caso real

~14 UF / ~238 terminales. Editar un input que dispara la verificación de
presión ("Pelo de agua mínimo", "Desnivel del punto de alimentación...")
tardaba muchos segundos a minutos en reflejar una tecla; el main thread
saturado por cálculo JS (la página seguía scrolleable).

### Perfil original + reproducción

Perfil Chrome de producción: muestra ~19,7 s, **~15,2 s de scripting**,
~14,9 s en el main thread. Hotspot minificado `Vt` ~98% inclusive de una
ventana de ~10 s; dentro, `determinarCondicionHidraulicaDeCaudal` **~6,4 s
SELF (~64%)** y un segundo hotspot `Xe` **~2,5 s SELF (~25%)** sin
identificar.

Se reprodujo el caso sin armar 14 UF a mano: `generarProyectoDeEscala`
(`src/pruebas/escala/`) emite un `Proyecto` válido y **`M2` completo** con
la misma topología que el proyecto de ejemplo replicada por UF/Local.
Tamaño **M** = 14 UF × 3 baños = **294 terminales, 394 nodos, 393 tramos**
(bracketea el caso real). Baseline medido (una `resolverEstadoModulo2`
sobre M, misma máquina): **16,5 s en frío / mediana warm ~27 s** (min 19 s,
max 49 s) -- coherente con el perfil real.

### Causa raíz

`determinarCondicionHidraulicaDeCaudal(red, tramoId, artefacto)` clasifica
la condición topológica ('total' | 'aguaFria' | 'aguaCaliente') de UN par
(Tramo, Artefacto), y **por cada llamada** reconstruía `red.tramos.find`,
un `Map` de nodos (`new Map(nodos.map(...))`), un `Map` de salientes
(`tramos.forEach`) y un DFS aguas abajo. Los consumidores del motor
(`filtrarArtefactosHidraulicamenteActivos` y `resolverAportesHidraulicosDeTramo`,
vía `resolverQuEfectivoParaTramo`) la llamaban **una vez por cada artefacto
aguas abajo del Tramo**. En la resolución de M2 del fixture M eso son
**105.840 llamadas** -- 105.840 reconstrucciones de índice + 105.840 DFS
sobre la **misma** subred para obtener las ~51 condiciones distintas de
cada Tramo, repetido en cada reentrada del pipeline. Costo ≈
O(tramos · artefactos_aguas_abajo · red): superlineal, cercano a cúbico en
el tamaño del proyecto.

**`Xe`:** no hay sourcemap del bundle desplegado ni acceso al archivo de
perfil, así que se identifica **por correlación, no por sourcemap**: `Xe`
está dentro del subárbol de `determinarCondicionHidraulicaDeCaudal` (el
perfil lo ubica dentro de `Vt`, junto al clasificador), es SELF time (bucle
apretado), y los únicos bucles apretados de esa función además del DFS son
las dos pasadas de **reconstrucción de índice** (`new Map(nodos.map)` +
`tramos.forEach`) -- ~787 iteraciones × 105.840 llamadas ≈ **83 M
iteraciones** sólo para armar índices. `Xe` es esa reconstrucción por
llamada, mismo origen y misma corrección que el hotspot principal: post-fix
ambos colapsan juntos (eran la misma función). Queda **identificado con
evidencia circunstancial fuerte, no confirmado por sourcemap**.

### Solución -- arquitectura

Cálculo puro + índice/traversal **local a la resolución, reutilizado**; sin
cache global, sin `WeakMap`, sin singleton, sin estado stale (el índice es
de sólo lectura y se descarta con la resolución).

- **`crearIndiceTopologico(red)`** (`motor/tuberias/topologia/indiceTopologico.ts`):
  materializa UNA vez `nodosPorId` / `tramosPorId` / `tramosSalientesPorNodo`
  (adyacencia aguas abajo, **preservando el orden de declaración** que los
  DFS necesitan). O(nodos + tramos). No es una segunda topología:
  `RedHidraulica` sigue siendo la única fuente física (M2-TOPO-01).
- **`resolverCondicionesHidraulicasDeCaudalAguasAbajo(indice, tramoId)`**
  (`motor/tuberias/caudal/`): el **mismo** DFS con estado compuesto
  `(nodoId, pasoPorACS)` y la misma deduplicación que el clasificador
  puntual, pero en **un solo traversal** registra, para CADA artefacto
  terminal aguas abajo, por qué rutas se lo alcanzó (con/sin ACS). Devuelve
  `Map<claveArtefacto, condición>`. El mapeo ruta → condición es idéntico
  (ambas rutas → 'total'; sólo sin ACS → 'aguaFria'; sólo con ACS →
  'aguaCaliente'). Tramo `red === 'AC'`: se siembra la pila con
  `pasoPorACS=true` → todo aguas abajo 'aguaCaliente', igual que el retorno
  temprano del clasificador.
- **`determinarCondicionHidraulicaDeCaudal`** pasa a ser un **wrapper fino**:
  misma firma, mismos textos de error, mismo atajo de tramo AC; construye
  el índice, llama al traversal en lote y devuelve la condición del
  artefacto pedido (o lanza "no está aguas abajo"). Sus 14 tests siguen
  verdes sin cambios.
- **`resolverHidraulicaDeTramo`** construye el índice y el `Map` de
  condiciones **una vez por Tramo** y lo comparte con
  `filtrarArtefactosHidraulicamenteActivos` y
  `resolverAportesHidraulicosDeTramo` (nuevo parámetro opcional
  `condiciones`; sin él, comportamiento previo byte a byte para todos los
  call sites/tests históricos). `resolverQuEfectivoParaTramo` acepta una
  `condicionPrecalculada` opcional; ausente ⇒ resuelve con el clasificador
  puntual como antes.
- `determinarConectividadFisica` (traversal global, no relativo al Tramo,
  sólo para artefactos AF/AC de catálogo no desagregado -- §2.9.1.3) **no
  se tocó**: no aparece en la ruta caliente medida (el caso real es
  doméstico). Queda como micro-redundancia menor, no bloqueante.

### Complejidad estructural -- antes / después

| | por `resolverHidraulicaDeTramo(tramo)` | por resolución de M2 |
| --- | --- | --- |
| **ANTES** | por cada uno de ~D artefactos: índice O(N) + DFS O(N) ⇒ **O(D·N)** | **O(Σ D·N)** ≈ cúbico en escala |
| **DESPUÉS** | 1 índice O(N) + 1 DFS O(subárbol) para TODOS ⇒ **O(N)** | **O(T·N)** ≈ cuadrático |

Invariante estructural en CI (`escalaDelMotor.regresion.test.ts`, sin
milisegundos): los índices topológicos por resolución crecen con los
**tramos** (medido ~5·tramos), nunca con artefactos×tramos; el ratio
índices/tramo **no crece** al escalar S→M; la ruta caliente de M2 **no
llama** al wrapper puntual.

### Equivalencia hidráulica -- demostración

- `resolverCondicionesHidraulicasAguasAbajo.equivalencia.test.ts` conserva
  el clasificador **pre-slice verbatim** (`clasificadorLegacy`, brief §15)
  y verifica, para **todo** par (Tramo × artefacto) sobre 6 topologías
  diversas (AF directa, AC, producción ACS, mixtos, ramales, reconvergencia
  directa+ACS, ciclo, dos UF misma id) + el fixture de escala de 5 UF
  completo: **wrapper ≡ legacy** y **Map del lote ≡ legacy** para todo
  artefacto aguas abajo.
- Pipeline completo: **`npx vitest run` 1623 / 1623** (1611 previos + 12
  nuevos). **Goldens sin rebaseline** (ningún archivo golden tocado). El
  fixture M resuelve `M2` **completo** antes y después con el mismo terminal
  crítico / margen.

### Benchmark -- mediana de varias corridas (máquina local, no CI)

| Fixture | terminales / tramos | `resolverEstadoModulo2` ANTES | DESPUÉS | índices/traversals (una resolución) |
| --- | --- | --- | --- | --- |
| **S** | 14 / 20 | ~21 ms | **~4 ms** | 98 / 98 |
| **M** | 294 / 393 | **~16,5 s frío** · mediana warm ~27 s | **~1,1 s frío** · **mediana warm ~0,82 s** | 2058 / 2058 |

Mejora **≈ 15× en frío, ≈ 33× en mediana warm** sobre el fixture que
reproduce el caso real; el proyecto pequeño **no se degrada** (mejora
~5×). Benchmark reproducible: `npm run perf` (`vitest.perf.config.ts`,
**excluido de CI**, `PERF_NIVELES` / `PERF_REPS`).

### Hotspot dominante DESPUÉS + decisión 01A/01B

`determinarCondicionHidraulicaDeCaudal` y `Xe` dejan de aparecer. El nuevo
dominante es **cross-camino / cross-etapa**: `resolverHidraulicaDeTramo` /
`resolverDiametroComercialDeTramo` se ejecutan **2058 veces para 393 tramos
distintos** (~**5,2×** de redundancia) -- el mismo Tramo se recalcula desde
cero una vez por cada camino de terminal que lo incluye y una vez por etapa
del pipeline (distribuida / localizada estimada / diámetro). Es costo
algorítmico redundante, no React.

**PERF-SCALE-01 NO se cierra.** Se abre explícitamente:

**`PERF-SCALE-01B` -- P1: memoización de `resolverHidraulicaDeTramo` /
`resolverDiametroComercialDeTramo` local a la resolución.** Contexto puro
(`Map<tramoId, resultado>`, sin invalidación: vive una resolución)
threadeado desde `resolverEstadoModulo2` por el árbol de presión de camino
(`resolverPresionResidualDeCamino` → `acumularPerdida{Distribuida,Localizada}DeCamino`
→ `resolverPerdidaLocalizadaEstimadaDeLocal` → `resolverPerdidaDistribuidaDeTramo`
→ `resolverDiametroComercialDeTramo` → `resolverHidraulicaDeTramo`; ~7
firmas, sin tocar contratos M3/M4). Colapsa 2058 → 393; estimado adicional
~4×. Evidencia cuantificada arriba; el benchmark ya la imprime
(`índices topológicos construidos` vs `distintos tramos`).

### Estado

**D-δ.97 / PERF-SCALE-01A -- CERRADO.** Código nuevo en `src/`:
`motor/tuberias/topologia/indiceTopologico.ts`,
`motor/tuberias/topologia/instrumentacionTopologica.ts` (seam inerte por
defecto: sólo el benchmark y la regresión estructural lo activan),
`motor/tuberias/caudal/resolverCondicionesHidraulicasAguasAbajo.ts`,
`pruebas/escala/generarProyectoDeEscala.ts`. Modificados:
`motor/tuberias/caudal/determinarCondicionHidraulicaDeCaudal.ts` (wrapper),
`motor/tuberias/caudal/resolverQuEfectivoParaTramo.ts`,
`motor/tuberias/participacion/filtrarArtefactosHidraulicamenteActivos.ts`,
`motor/tuberias/aporte/resolverAportesHidraulicosDeTramo.ts`,
`motor/tuberias/resolverHidraulicaDeTramo.ts`. Infra: `scripts/perf/`,
`vitest.perf.config.ts`, `package.json` (`perf`), `eslint.config.js`
(bloque `scripts/**`, Node globals -- no participa de `tsc -b`). Tests
nuevos: `resolverCondicionesHidraulicasAguasAbajo.equivalencia.test.ts`,
`escalaDelMotor.regresion.test.ts`. Baseline: **Vitest 1623 / 1623**,
`tsc -b` / `npm run e2e:typecheck` / `npm run build` verdes, **ESLint
11 / 0 / 0** (baseline sin cambios). Fuzz local en serie (no concurrente,
contra `npm run dev`): `424242` 3×30, `34493241441-1:15` desktop+mobile,
`34411681277-1:0`, `34398035608-1` runs 0–12, `m7` / `m42` / `m99`.
`v0.4.0-beta.5` sin mover; sin `beta.6`. Snapshot
`resguardo-documentacion/` intacto.

**Siguiente:** **QA Fuzz cloud 20×30 seed vacía** sobre `main`; si queda
verde, iniciar **PERF-SCALE-01B** en chat nuevo.

## D-δ.98 -- PERF-SCALE-01B: contexto de cálculo local a la resolución de M2 -- memoización cross-camino / cross-etapa de la hidráulica por Tramo -- CERRADO (motor)

Segundo slice de `PERF-SCALE-01` (P1). Objetivo acotado: **eliminar la
redundancia restante de cálculo hidráulico del mismo Tramo dentro de UNA
resolución de Módulo 2**, preservando EXACTAMENTE los resultados
hidráulicos. No agrega features, no toca fórmulas, no cambia criterios
normativos, no reabre M2-TOPO-01, no toca React.

### QA cloud de entrada

QA Fuzz cloud 20×30 seed vacía sobre `865b8c0` (post-PERF-SCALE-01A):
**TODO VERDE** (informado por el usuario). Prueba manual del usuario sobre
producción tras `865b8c0`: la mejora de 01A es clara, pero a partir de
~8-9 UF vuelve a aparecer lag; cargar datos de tanque tarda; editar "Pelo
de agua mínimo" puede trabar la interacción.

### Baseline 01B (fixture de escala, misma máquina, antes del fix)

| Fixture | Tramos distintos | Solicitudes diámetro | Cálculos reales (índice + DFS) | Ratio | `resolverEstadoModulo2` warm |
| --- | --- | --- | --- | --- | --- |
| **S** (14 term / 20 tramos) | 20 | 98 | 98 | 4,9× | ~4,1 ms |
| **M** (294 term / 393 tramos) | 393 | 2058 | 2058 | 5,24× | ~596 ms |

El mismo Tramo se resolvía desde cero **~5,2 veces por resolución**: una
vez por cada camino de terminal que lo incluye (cross-camino) y una vez
por cada etapa del pipeline que le pide hidráulica/diámetro/velocidad
(cross-etapa: pérdida distribuida, pérdida localizada estimada/detallada,
diámetro comercial).

### Call graph confirmado

```
resolverEstadoModulo2(proyecto, ...)
  └─ por cada terminal (294):  resolverPresionResidualDeCamino(..., contexto)
       ├─ acumularPerdidaDistribuidaDeCamino(..., contexto)
       │    └─ por Tramo del camino:  resolverPerdidaDistribuidaDeTramo(..., contexto)
       │         └─ resolverDiametroComercialDeTramo(..., contexto)  ← MEMO
       │              └─ resolverHidraulicaDeTramo(..., contexto)     ← MEMO (índice topológico + DFS aguas abajo)
       ├─ [detallado]  acumularPerdidaLocalizadaDeCamino(..., contexto)
       │    └─ por Tramo:  resolverDiametroComercialDeTramo(..., contexto)
       └─ [estimado]   resolverPerdidaLocalizadaEstimadaDeLocal(..., contexto)
            └─ por Tramo terminal del Local+red:  resolverDiametroComercialDeTramo(..., contexto)
```

`resolverHidraulicaDeTramo` sólo tiene un llamador de motor:
`resolverDiametroComercialDeTramo`. Threading: **8 firmas** aceptan un
parámetro opcional `contexto` al final (`resolverEstadoModulo2` lo crea;
las 7 restantes lo pasan hacia abajo). Sin él ⇒ comportamiento previo byte
a byte (call sites puntuales de la UI y tests históricos).

### Causa raíz

`resolverHidraulicaDeTramo(proyecto, tramoId, catálogo)` y
`resolverDiametroComercialDeTramo(proyecto, tramoId, catálogos)` son
**funciones puras de `(proyecto, tramoId)`** para catálogos fijos. Durante
una resolución de M2 el `proyecto` (incluida `redHidraulica` con
`dnComercialAdoptado`) y los catálogos son **inmutables** -- nadie los
muta mientras se resuelve. Pero el motor las volvía a ejecutar desde cero
cada vez que un camino o una etapa distinta pedía datos del mismo Tramo.

### Solución -- `ContextoDeCalculoM2`

`src/motor/tuberias/contextoDeCalculoM2.ts`: un contexto **puro y local a
UNA resolución** con dos memos `Map<tramoId, resultado>` --
`hidraulicaPorTramo` y `diametroComercialPorTramo`.

- **Clave:** sólo `tramoId`. La entrada real (proyecto/red/config) es
  inmutable durante la resolución, así que no puede haber dos resultados
  hidráulicos legítimos distintos para el mismo Tramo -- **no es una
  decisión roja**, es una propiedad demostrable del pipeline.
- **Ciclo de vida:** se crea vacío en `resolverEstadoModulo2` (justo antes
  del loop por terminal) y se descarta al retornar. **No** se guarda en el
  `Proyecto`, **no** hay cache global / `WeakMap` / singleton, **no** hay
  invalidación. Cada edición del `Proyecto` arranca una resolución nueva
  con un contexto nuevo ⇒ el resultado depende sólo del input actual y
  **nunca puede quedar stale**.
- **Memoria:** O(tramos) por resolución (nunca O(tramos×terminales));
  elegible para GC al terminar.
- **Errores (§27):** el memo sólo guarda resultados; si
  `resolverHidraulicaDeTramo` lanza, no se escribe nada y el próximo
  pedido vuelve a lanzar -- semántica observable idéntica. Un `hit`
  devuelve la MISMA referencia (no clona, no recalcula, no muta).

`resolverDiametroComercialDeTramo` corta en su propio memo **antes** de
llamar a `resolverHidraulicaDeTramo`, así que el índice topológico +
traversal DFS de 01A se ejecutan **una sola vez por Tramo distinto por
resolución**.

### Complejidad -- antes / después (por resolución de M2)

| | ANTES 01B | DESPUÉS 01B |
| --- | --- | --- |
| índices topológicos + DFS aguas abajo | **O(Σ_caminos Σ_tramos)** ≈ 5,2·tramos | **≤ tramos** (uno por Tramo distinto) |
| solicitudes de diámetro comercial | 5,2·tramos, todas recalculadas | 5,2·tramos, **1665/2058 servidas del memo** (M) |

### Equivalencia hidráulica -- demostración

`contextoDeCalculoM2.equivalencia.test.ts` (18 casos): sobre el proyecto
de ejemplo real en sus 3 combinaciones metodológicas (estimado+simplificada,
detallado+profesional, Hazen→Darcy) y el fixture de escala en 2 tamaños ×
2 métodos de pérdida localizada, compara para **todos los Tramos** y
**todos los terminales**:

- `resolverHidraulicaDeTramo` con contexto ≡ sin contexto; el `hit`
  devuelve la misma referencia; re-leer el contexto lleno ≡ recálculo
  fresco (no hay mutación post-guardado);
- `resolverDiametroComercialDeTramo` con contexto ≡ sin contexto;
- `resolverPresionResidualDeCamino` con un **contexto compartido** entre
  todos los terminales ≡ sin contexto, en **orden de declaración Y orden
  inverso** (si un terminal contaminara a otro vía el memo, el orden lo
  revelaría).

`resolverEstadoModulo2` es una función pura de los resultados por terminal
de `resolverPresionResidualDeCamino` (sólo `switch` + agregación): la
equivalencia por terminal + la suite completa verde **sin rebaselinear
ningún golden** es la demostración del estado agregado.
`npx vitest run`: **1648 / 1648** (1623 previos + 25 nuevos).

### Benchmark post-fix (`npm run perf`, misma máquina, no CI)

| Fixture | Tramos | Índices ANTES | Índices DESPUÉS | Solicitudes diám. / cálculos / hits | `resolverEstadoModulo2` warm ANTES → DESPUÉS |
| --- | --- | --- | --- | --- | --- |
| **S** | 20 | 98 | **20** | 98 / 20 / 78 | ~4,1 ms → **~1,3 ms** |
| **M** | 393 | 2058 | **393** | 2058 / 393 / **1665** | ~596 ms → **~75 ms** (≈8×) |
| **L** | 1481 | 7840 | **1481** | 7840 / 1481 / 6359 | — → ~928 ms |

`cálculos hidráulicos reales / tramo = 1,00` en S, M y L: el ratio ya **no
crece con la escala**. Proyecto pequeño **no se degrada** (mejora ~3×).
M frío ≈ 92 ms.

### Regresión estructural en CI

`escalaDelMotor.regresion.test.ts` +3 asserts (sin milisegundos):
`calculosHidraulicaDeTramo ≤ tramos`, `= calculosDiametroComercialDeTramo
= indicesTopologicosCreados = traversalsCondicionAguasAbajo`, y
`solicitudesDiametroComercialDeTramo > 2·cálculos` (el memo está
absorbiendo redundancia real; si alguien quita el threading, solicitudes
≡ cálculos y falla). Instrumentación (`instrumentacionTopologica.ts`)
ampliada con contadores de solicitudes/cálculos de hidráulica y diámetro
y de `resolucionesModulo2` -- inerte por defecto, sólo benchmark/tests.

### §17 -- resoluciones completas por edición (medido, NO optimizado en 01B)

Una edición conceptual (tecla en "Pelo de agua mínimo", dato de tanque)
dispara **UN** re-render de `MotorDemandaPantalla` con los 4 paneles
montados (one-page). Ese re-render, sobre el fixture M:

- **`resolverEstadoModulo2` se ejecuta 2 veces**: sidebar
  (`resolverResumenDeProyecto`) + `PanelDePresionDeModulo2`;
- `PanelDePresionDeModulo2` además recorre el árbol de presión **una
  tercera vez** con un bucle `candidatos = nodosTerminales.map(
  resolverPresionResidualDeCamino)` **SIN contexto compartido** -- ese
  bucle solo hace ~2058 índices topológicos (tanto como el M2 pre-01B);
- `ResultadoHidraulicoDeTramo` (Tuberías) resuelve ~3 barridos
  `resolverFilaDeDimensionamiento` por Tramo, también sin contexto;
- **ninguno** de estos componentes usa `useMemo`.

Medición (`resolucionesDeVerificacionPorEdicion.regresion.test.ts`): un
re-render = **2 `resolverEstadoModulo2` + ~2842 índices topológicos**
(vs. 393 de una sola resolución con memo) ⇒ ~800 ms en la máquina local
para el fixture M. **`Duplicar unidad funcional`** (adenda del usuario):
`duplicarUnidadFuncionalEnProyecto` construye la UF copia **completa** y
publica **UN** `Proyecto` final -- **0 `resolverEstadoModulo2`, 0 cálculo
hidráulico, 0 estados intermedios** durante el build (~36 ms, sólo
topología inmutable encadenada). El costo percibido de "Duplicar UF" es el
**mismo re-render fan-out** de cualquier tecla, no la duplicación en sí.

### Decisión 01B / 01C

**CASO B (§18):** el motor quedó rápido (una resolución de M2 en M: ~75 ms
warm, ~393 índices), pero **una tecla dispara múltiples resoluciones
completas redundantes** en la capa React (2× `resolverEstadoModulo2` + 1
bucle `candidatos` sin contexto + ~3 barridos de dimensionamiento, sin
`useMemo` en ningún panel, con duplicación sidebar↔panel).

**Se abre `PERF-SCALE-01C` -- P1: orquestación React / derived computations
de la verificación de M2.** Alcance EXCLUSIVO: eliminar las resoluciones
redundantes de la ruta de render (compartir `EstadoModulo2` /
`ContextoDeCalculoM2` entre sidebar y paneles, `useMemo` sobre
`proyecto`, colapsar el bucle `candidatos` en los resultados que
`resolverEstadoModulo2` ya produjo). **Prohibido** debounce como criterio
de cierre (§20). No entra: UI-M2-GROUP-01, UI-M1-MULTINIVEL-01, HYD-EST,
VIS-TOPO, REPORT, PERSIST.

### Estado

**D-δ.98 / PERF-SCALE-01B -- CERRADO (motor).** Código nuevo en `src/`:
`motor/tuberias/contextoDeCalculoM2.ts`. Modificados:
`motor/tuberias/resolverHidraulicaDeTramo.ts`,
`motor/tuberias/resolverDiametroComercialDeTramo.ts`,
`motor/tuberias/resolverPerdidaDistribuidaDeTramo.ts`,
`motor/tuberias/presion/acumularPerdidaDistribuidaDeCamino.ts`,
`motor/tuberias/presion/acumularPerdidaLocalizadaDeCamino.ts`,
`motor/tuberias/presion/resolverPerdidaLocalizadaEstimadaDeLocal.ts`,
`motor/tuberias/presion/resolverPresionResidualDeCamino.ts`,
`motor/modulo2/resolverEstadoModulo2.ts`,
`motor/tuberias/topologia/instrumentacionTopologica.ts`. Tests nuevos:
`motor/tuberias/contextoDeCalculoM2.equivalencia.test.ts`,
`interfaz/paginas/resolucionesDeVerificacionPorEdicion.regresion.test.ts`,
+3 asserts en `motor/tuberias/escalaDelMotor.regresion.test.ts`; E2E
`tests/e2e/escala-verificacion.spec.ts`. Infra: `scripts/perf/benchmarkMotorDeEscala.perf.ts`
(imprime solicitudes/cálculos/hits). Baseline: **Vitest 1648 / 1648**,
`tsc -b` / `npm run e2e:typecheck` / `npm run build` verdes, **ESLint
11 / 0 / 0** (baseline sin cambios). Goldens **sin rebaseline**.
`v0.4.0-beta.5` sin mover; sin `beta.6`. Snapshot
`resguardo-documentacion/` intacto.

**Siguiente:** **QA Fuzz cloud 20×30 seed vacía** sobre `main`; luego
prueba manual del usuario sobre producción (agregar UF hasta ~9-14,
cargar tanque, editar "Pelo de agua mínimo" y desnivel). Según esa prueba:
`PERF-SCALE-01` se cierra, o se confirma que **`PERF-SCALE-01C` es
necesario** (evidencia de motor ya lo indica).

## D-δ.99 -- PERF-SCALE-01C: orquestación de cálculo M2 en React -- una resolución compartida por Proyecto -- CERRADO

Tercer slice de `PERF-SCALE-01` (P1). QA Fuzz cloud post-01B 20×30 seed
vacía **TODO VERDE** (informado por el usuario); prueba manual post-01B
confirmó que el lag seguía siendo perceptible pese al motor ya rápido
(D-δ.98: `resolverEstadoModulo2` ~75 ms warm en el fixture M). Objetivo
acotado: **resolver M2 UNA sola vez por Proyecto actualizado y compartir
el mismo resultado derivado entre sidebar, panel de presión y
dimensionamiento** -- sin tocar fórmulas, sin cambiar resultados
hidráulicos, sin reabrir M2-TOPO, sin debounce.

### Duplicaciones confirmadas (arqueología)

1. **`resolverEstadoModulo2` se llamaba 2 veces por re-render**: sidebar
   (`resolverResumenDeProyecto`) y `PanelDePresionDeModulo2`, cada uno
   resolviendo `resolverEntradasDeVerificacion` + `resolverEstadoModulo2`
   por su cuenta -- ningún componente usaba `useMemo`.
2. **`PanelDePresionDeModulo2` hacía un TERCER recorrido completo** del
   árbol de presión (`nodosTerminales.map(resolverPresionResidualDeCamino)`,
   **sin** el `ContextoDeCalculoM2` de 01B) para reconstruir exactamente
   los mismos datos por terminal que `resolverEstadoModulo2` ya había
   calculado internamente, sólo para armar la tabla "Ver todos los
   terminales" y el terminal crítico -- `EstadoModulo2` no exponía esos
   resultados crudos.
3. **El panel de Tuberías (`ResultadoHidraulicoDeTramo`) resolvía cada
   Tramo hasta 3 veces por fila**, sin compartir nada entre sí:
   `resolverFilaDeDimensionamiento` → `resolverResultadoDeTramoParaUi` →
   `resolverPerdidaDistribuidaDeTramo` (1), la misma función llamando de
   nuevo a `resolverPerdidaDistribuidaDeTramo` directo (2), y
   `resolverControlDeDnDeTramo` → `resolverDiametroComercialDeTramo` (3).
   Las 3 tablas (Distribución general / secundaria / por Unidad Funcional)
   cubren Tramos **disjuntos** entre sí -- la redundancia es intra-fila,
   no cruzada entre tablas.
4. **`Duplicar unidad funcional` NO agregaba duplicación propia**:
   `duplicarUnidadFuncionalEnProyecto` construye la UF copia completa y
   publica un único `Proyecto` final (0 resoluciones, 0 estados
   intermedios durante el build, ~36 ms) -- el costo percibido era
   enteramente el mismo re-render fan-out de (1)+(2)+(3) de arriba, ahora
   corregido.

### Solución

- **`resolverResolucionDeModulo2`** (`interfaz/paginas/resolverResolucionDeModulo2.ts`,
  nuevo): punto único que compone `resolverEntradasDeVerificacion` +
  `resolverEstadoModulo2` -- exactamente la misma composición que cada
  consumidor hacía por separado, ahora en un solo lugar.
  `MotorDemandaPantalla` la memoiza con `useMemo(..., [proyecto, demandaValida])`
  y pasa el resultado a `resolverResumenDeProyecto` (nuevo parámetro
  opcional `estadoM2PreCalculado`) y a `PanelDePresionDeModulo2` (nuevo
  prop opcional `resolucionM2`). Ausente en ambos ⇒ comportamiento previo
  byte a byte (siguen resolviendo por su cuenta) -- así funcionan sin
  cambios los tests de estos componentes y cualquier montaje standalone.
- **`EstadoModulo2` gana un campo derivado `candidatos: readonly CandidatoTerminal[]`**
  (motor/modulo2/resolverEstadoModulo2.ts): el resultado CRUDO por
  terminal (el mismo `resolverPresionResidualDeCamino` que ya se ejecutó
  para decidir `estado`), `[]` en las ramas que cortan ANTES de iterar
  terminales (`noIniciado`, error estructural, sin terminales, sin
  Pdisponible). Es un dato derivado, no hidráulico nuevo: no cambia qué
  calcula el motor, sólo evita que un consumidor de UI lo vuelva a pedir.
  `PanelDePresionDeModulo2` arma su tabla/terminal-crítico leyendo
  `estadoModulo2.candidatos` en vez de un bucle propio -- **excepto**
  cuando `estado === 'error'` (estructural, el único caso en que el
  campo viene `[]` porque el loop no llegó a correr), donde preserva el
  recorrido independiente de siempre para no cambiar ni un bit ese borde
  degenerado (equivalencia byte a byte, incluido ese caso).
- **`ResultadoHidraulicoDeTramo` crea UN `ContextoDeCalculoM2`** (01B) por
  render (`useMemo(..., [proyecto])`) y lo threadea, como parámetro
  opcional, a `resolverFilaDeDimensionamiento` → `resolverResultadoDeTramoParaUi`
  / `resolverPerdidaDistribuidaDeTramo` / `resolverPerdidaLocalizadaEstimadaDeLocal`,
  y a `resolverControlDeDnDeTramo` → `resolverDiametroComercialDeTramo`.
  La MISMA instancia se pasa a `DistribucionGeneral`, `DistribucionSecundaria`
  y cada `SeccionDeUnidadFuncional` (una por UF). Ausente ⇒ comportamiento
  previo byte a byte.
- Ningún cache global, ninguna persistencia en `Proyecto`, ningún schema
  change. Ambos `useMemo` viven sólo mientras `proyecto` no cambie de
  referencia -- exactamente el mismo principio que el `ContextoDeCalculoM2`
  de 01B, extendido de "una función" a "un render".

### Identidad de `proyecto`

Verificado: `proyecto` es `useState` en `MotorDemandaPantalla`, nunca se
muta in-place (todo el código de dominio usa spread/inmutabilidad); los
demás estados locales del componente (`confirmandoReinicio`,
`idsColapsadas`, `generacionDeProyecto`, diálogos) son variables de estado
**separadas** que no recrean `proyecto`. Consecuencia: `useMemo(..., [proyecto])`
no sólo comparte trabajo DENTRO de un mismo render por edición -- también
salta el recálculo completo cuando cambia un estado puramente local (abrir
el diálogo de reiniciar, colapsar una UF), algo que antes de 01C
recalculaba M2 igual, sin motivo.

### Métricas por edición (fixture de escala M, 393 tramos / 294 terminales)

| Acción | `resolverEstadoModulo2` antes → después | Recorridos de presión extra antes → después | Cálculos reales de dimensionamiento antes → después | Tiempo compuesto antes → después |
| --- | --- | --- | --- | --- |
| Pelo de agua mínimo | 2 → **1** | 1 (bucle `candidatos`) → **0** | 591 → **393** | ~852 ms → **~207 ms** (≈4,1×) |
| Editar dato de tanque | 2 → **1** | 1 → **0** | 591 → **393** | ~852 ms → **~207 ms** |
| Agregar artefacto | 2 → **1** | 1 → **0** | 591 → **393** | ~852 ms → **~207 ms** |
| Duplicar UF (build) | 0 → **0** | 0 → **0** | 0 → **0** | ~36 ms (sin cambios: nunca fue el cuello de botella) |
| Duplicar UF (re-render posterior) | 2 → **1** | 1 → **0** | 591 → **393** | ~852 ms → **~207 ms** |

Las 4 acciones de edición dan el MISMO patrón porque todas terminan en el
mismo re-render one-page: la causa era arquitectónica (fan-out de render),
no específica de ningún input. Duplicar UF es la única acción con un paso
propio (el build), que ya era gratis desde antes.

### Benchmark compuesto (`resolverResolucionDeModulo2` + sidebar + Tuberías, fixture M, misma máquina)

| | ANTES 01C | DESPUÉS 01C |
| --- | --- | --- |
| `resolucionesModulo2` | 2 | **1** |
| índices topológicos / resolución completa | 3435 | **786** |
| tiempo de un re-render completo | ~852 ms | **~207 ms** (≈4,1×) |

Compuesto con la mejora de motor de 01B (≈8× sobre `resolverEstadoModulo2`
aislado) y de 01A (≈15-33× sobre el hotspot original), la mejora
acumulada desde antes de PERF-SCALE-01 es de dos órdenes de magnitud.

### Equivalencia

- `resolverEstadoModulo2.test.ts`: 19/19 verde; los 7 casos que comparaban
  el objeto completo (`toEqual`) se actualizaron para incluir el nuevo
  campo `candidatos` (mecánico, sin cambiar qué verifican -- ver
  `resolverEstadoModulo2` en el diff).
- `PanelDePresionDeModulo2.test.ts` (19 casos, `renderToStaticMarkup`) y
  `ResultadoHidraulicoDeTramo.test.ts` (19 casos, `renderToStaticMarkup`)
  **verdes sin cambios**: ninguno pasa los nuevos props opcionales
  (`resolucionM2`, contexto de cálculo), así que ejercitan exactamente la
  ruta de fallback byte a byte -- la prueba más fuerte de que el HTML
  renderizado no cambió.
- Argumento de cobertura para el árbol de presión: `resolverEstadoModulo2`
  es una función pura de los resultados por terminal de
  `resolverPresionResidualDeCamino` (sólo agrega/clasifica); si esos
  resultados por terminal son los mismos (lo son: mismo Proyecto, mismos
  catálogos, mismo contexto interno de 01B), el estado agregado también.
- Vitest completo **1649 / 1649** (1648 + 1: el nuevo test de
  redundancia intra-fila de dimensionamiento). Goldens **sin rebaseline**.

### Dependencias de "Pelo de agua mínimo" (análisis, sin rediseñar)

Editar `Pelo de agua mínimo` cambia únicamente `Nodo.cota_m` de la raíz.
Trazado el pipeline: Qc (M1) no lee cotas; `resolverHidraulicaDeTramo` /
`resolverDiametroComercialDeTramo` / `resolverPerdidaDistribuidaDeTramo`
(distribuida) / pérdida localizada (detallada o estimada) tampoco leen
`Nodo.cota_m` en ningún punto de su cálculo (Qc, DN, V, hf dependen de
caudal/diámetro/longitud/material, nunca de elevación) -- **sólo**
`resolverDesnivelDeCamino` / `resolverBalanceDePresion` (la etapa de
presión) dependen de la cota. Conclusión: editar el pelo de agua **no
debería** disparar ningún recálculo de Qc/DN/V/hf -- sólo el balance de
presión. Hoy SÍ los recalcula (una vez, gracias a 01B/01C, pero los
recalcula) porque el pipeline no tiene invalidación incremental por
dependencia de campo -- resuelve todo el Proyecto de nuevo cada vez,
simplemente ya no lo hace 2-3 veces. **No se implementa invalidación
incremental en este slice** (fuera de alcance explícito, brief §pelo de
agua). Si, tras la prueba manual del usuario, el lag remanente resulta
significativo y se confirma que Pelo de agua sigue recalculando etapas
independientes de ese dato de forma perceptible, corresponde
`PERF-SCALE-01D` (cálculo incremental por dependencia), NO decidido acá.

### Nuevo hotspot dominante

Ya no hay una duplicación de orquestación conocida. El costo restante de
un re-render (~207 ms en M) es el trabajo hidráulico genuino de una
resolución completa (393 tramos × pipeline completo, una vez) más el
dimensionamiento (también una vez) -- exactamente el mínimo indispensable
dado que el pipeline recalcula todo el Proyecto por edición (ver
"Dependencias de Pelo de agua" arriba). Reducirlo más exige invalidación
incremental (01D), no más deduplicación de llamadas (ya agotada).

### Estado

**D-δ.99 / PERF-SCALE-01C -- CERRADO.** Código nuevo en `src/`:
`interfaz/paginas/resolverResolucionDeModulo2.ts`,
`interfaz/paginas/resolucionesDeDimensionamientoPorEdicion.regresion.test.ts`.
Modificados: `motor/modulo2/resolverEstadoModulo2.ts` (+`candidatos`),
`motor/modulo2/resolverEstadoModulo2.test.ts`,
`interfaz/paginas/resolverResumenDeProyecto.ts`,
`interfaz/paginas/PanelDePresionDeModulo2.tsx`,
`interfaz/paginas/MotorDemandaPantalla.tsx`,
`interfaz/paginas/ResultadoHidraulicoDeTramo.tsx`,
`interfaz/paginas/resolverResultadoDeTramoParaUi.ts`,
`interfaz/paginas/resolverControlDeDnDeTramo.ts`,
`interfaz/paginas/resolverFilaDeDimensionamiento.ts`,
`interfaz/paginas/resolucionesDeVerificacionPorEdicion.regresion.test.ts`
(actualizado a la arquitectura nueva: 1 resolución, no 2). Baseline:
**Vitest 1649 / 1649**, `tsc -b` / `npm run e2e:typecheck` / `npm run
build` verdes, **ESLint 11 / 0 / 0** (baseline sin cambios; requirió un
`eslint-disable-next-line react-hooks/exhaustive-deps` justificado -- el
factory de `useMemo` no lee `proyecto` pero necesita invalidarse con él).
E2E `escala-verificacion.spec.ts` (desktop+mobile) + suite M2 existente
(montantes, catálogo-conectividad, modo-de-trabajo, reiniciar-cálculo,
responsive) desktop, todas verdes contra un build local. `v0.4.0-beta.5`
sin mover; sin `beta.6`. Snapshot `resguardo-documentacion/` intacto.

**Siguiente:** QA Fuzz cloud 20×30 (seed vacía) sobre `main`; luego
prueba manual del usuario en producción (agregar UF hasta ~9-14, agregar
artefactos, cargar tanque, editar "Pelo de agua mínimo" y desnivel).
Según esa prueba: `PERF-SCALE-01: CERRADO`, o se documenta evidencia
concreta para `PERF-SCALE-01D` (cálculo incremental) -- no se abre por
intuición.

## D-δ.100 -- PERF-SCALE-01D: escala real 20+ UF -- tres redundancias algorítmicas O(n²)/O(n³) sin tocar por 01A/B/C + un React.memo dirigido -- CERRADO

Cuarto slice de `PERF-SCALE-01` (P1). QA Fuzz cloud post-01C 20×30 seed
vacía **TODO VERDE** (confirmado por el usuario). Prueba manual post-01C:
hasta ~14 UF la experiencia mejora bastante; a partir de ~15 UF reaparece
lag perceptible; `Duplicar UF` 20→21 tarda ~1 s; editar "Pelo de agua
mínimo" o el desnivel del tanque se vuelve **muy pesado** -- la UI "parece
colgarse"; la Verificación mostraba `Incompleto (384 motivos)`.
`PERF-SCALE-01` no podía cerrarse. Brief explícito: **medir primero, no
asumir que el cuello es motor/React/DOM/motivos/M4** -- ninguna hipótesis
genérica resultó ser la causa real.

### Fase 1 -- profiling antes de editar

Fixture XXL: `generarProyectoDeEscala` ya acepta una `FormaDeEscala`
arbitraria (no hizo falta extenderlo) -- se usó `{cantidadUf: 8/14/20/21,
localesPorUf: 3}` directamente, con una variante local (sólo en el
benchmark, sin tocar el generador) que fuerza `esquema: 'tanqueElevado'` +
cota de raíz + `desnivelConexion_m`, porque el generador por defecto usa
`esquema: 'directa'` (donde "pelo de agua" ni siquiera existe como dato
manual separado del desnivel -- CRIT-A39).

**Nuevo benchmark** `scripts/perf/benchmarkEscalaXXL.perf.ts` (patrón de
`benchmarkMotorDeEscala.perf.ts`, no CI): mide, por escala, `resolverEstadoModulo2`
/ M3 / M4 / `resolverEntradasDeVerificacion` / `agruparMotivosDeModulo2` /
"pantalla completa" (M2+resumen+M3+M4, replicando exactamente lo que
`MotorDemandaPantalla` ejecuta tras 01C) y las 4 acciones diagnósticas
(Duplicar UF con la función real `duplicarUnidadFuncionalEnProyecto`,
Agregar artefacto, Editar pelo de agua, Editar desnivel), más una
comparación estructural (Qc/DN/V/hf idénticos sí/no) antes/después de las
dos últimas.

**Instrumentación topológica extendida** (`instrumentacionTopologica.ts`,
mismo seam inerte de 01A/B, gate `activo`): `pasosCaminoHaciaOrigen`
(iteraciones del while de `obtenerCaminoHaciaOrigen`), `resolucionesRedDeTerminal`
(llamadas a `resolverRedDeTerminal`), `construccionesTramosRepresentativos`
(llamadas reales -- no memoizadas -- a `identificarTramosRepresentativosDeLocales`)
y `tiemposMsPorEtapa` (ms acumulados por etapa dentro de
`resolverPresionResidualDeCamino`, gateado además por
`instrumentacionTopologicaActiva()` para no pagar ni el `performance.now()`
en producción). Con esto se descompuso el costo de una resolución sin
necesitar un profiler externo.

**React/DOM:** dado que no hay `@testing-library/react` ni build de
profiling de `react-dom` en producción, se corrió `npm run dev` (Vite dev
server, sí soporta `<Profiler>`) + Playwright, con un módulo diagnóstico
TEMPORAL (`PerfProfiler` gateado por `window.__IUAS_PERF__`, seteado sólo
por el spec de medición vía `addInitScript`) envolviendo los paneles
pesados de `MotorDemandaPantalla`. Se usó exclusivamente para medir; se
retiró por completo antes de cerrar el slice (no queda ningún
`React.Profiler` ni `window.__IUAS_PERF__` en el árbol de producción).

### Hallazgos -- tres redundancias en el motor, ninguna tocada por 01A/B/C

1. **`obtenerCaminoHaciaOrigen`** (`motor/tuberias/topologia/obtenerCaminoHaciaOrigen.ts`):
   cada iteración del `while` hacía `redHidraulica.tramos.filter(t =>
   t.nodoDestinoId === nodoActualId)` -- un escaneo de TODOS los tramos del
   Proyecto por cada paso del camino. Para un camino de profundidad `d`:
   O(d·tramos) en vez de O(d). Se ejecuta una vez por terminal en cada
   resolución de M2.
2. **`resolverEntradasDeVerificacion`**: las closures
   `perdidasDeMedidoresDeTerminal`/`hfMedidorDeTerminal` (invocadas una vez
   por terminal desde el loop de `resolverEstadoModulo2`) repetían, en cada
   invocación, `nodosTerminales.find(...)` (O(terminales)) y
   `resolverRedDeTerminal(proyecto, id)` → `tramos.find(...)` (O(tramos)).
   Total: O(terminales·(terminales+tramos)).
3. **`crearIndiceTopologico`** (el índice nodos/tramos/salientes que 01A ya
   había introducido, con un comentario de diseño que decía explícitamente
   "se materializa UNA vez por resolución"): en los hechos se reconstruía
   **una vez por Tramo DISTINTO calculado** (`calcularHidraulicaDeTramo` lo
   invocaba sin ningún contexto compartido) -- a escala 20 UF, ~561
   reconstrucciones redundantes del MISMO índice en una sola resolución.
   El mismo patrón, por separado, en `obtenerArtefactosAguasAbajo`
   (reconstruía su PROPIO índice inline, sin usar `crearIndiceTopologico`
   ni ningún contador) y en los `Array.find` de tramo-por-id de
   `resolverDiametroComercialDeTramo` / `resolverPerdidaDistribuidaDeTramo`.

Medido con el benchmark XXL (20 UF, 561 tramos, 420 terminales,
`resolverEstadoModulo2` solo): arreglar 1+2 bajó 147→124 ms (~16 %);
arreglar 3 (compartir `IndiceTopologico`) bajó a 50-78 ms según el punto
exacto de la cadena -- pero el "tiempo por etapa" nuevo mostró que
`perdidaDistribuida` seguía dominando (~27-34 ms de ~47-57 ms totales), lo
que llevó al cuarto hallazgo:

4. **La dominante -- exclusiva de `granularidadHidraulica: 'simplificada'`
   (modo Rápido, preset por defecto de la app):**
   `seleccionarTramosDeAcumulacion` (llamada desde
   `acumularPerdidaDistribuidaDeCamino` Y desde
   `acumularPerdidaLocalizadaDeCamino` -- **dos veces por terminal**)
   pedía `identificarTramosRepresentativosDeLocales(proyecto)` **desde
   cero cada vez**, sin ningún contexto. Esa función es, ella sola,
   O(tramos²): recorre TODOS los tramos y, para cada uno, llama
   `localUnicoDeTramo` (que internamente hace `obtenerArtefactosAguasAbajo`
   -- otro traversal sin índice) y `buscarTramoPadre` (`Array.find` sobre
   todos los tramos). Total real: **O(terminales·tramos²)** por
   resolución. Medido en el navegador (dev build, granularidad
   'simplificada', 21 UF, tras editar el desnivel de conexión): el mark
   `resolverResolucionDeModulo2` pasó de **~13,8 s** a **~0,15 s** al
   arreglar SÓLO este punto -- la causa directa y casi exclusiva del
   "se cuelga" reportado por el usuario al editar presión en modo Rápido.
   La fixture de escala de 01A/B/C usa `granularidadHidraulica: 'profesional'`
   por defecto, así que ningún benchmark ni test previo había ejercitado
   este camino a escala.

### Fix -- mismo patrón para los cuatro: memoizar UNA vez por resolución

Extendiendo `ContextoDeCalculoM2` (motor/tuberias/contextoDeCalculoM2.ts,
el mismo objeto de 01B, sin cambiar su ciclo de vida ni su alcance: puro,
local a una resolución, sin cache global, sin `WeakMap`, sin
invalidación) con tres campos nuevos, cada uno con un getter que
construye lazy la primera vez que se pide y reutiliza después:

- `tramosEntrantesPorNodoDestino` (`obtenerTramosEntrantesIndexados`):
  índice nodoDestinoId → tramos entrantes, usado por
  `obtenerCaminoHaciaOrigen` (arregla 1) y por `buscarTramoPadre` dentro
  de `identificarTramosRepresentativosDeLocales` (arregla parte de 4).
- `indiceTopologico` (`obtenerIndiceTopologicoDeContexto`): el mismo
  `IndiceTopologico` de 01A, ahora construido UNA vez y compartido entre
  `resolverHidraulicaDeTramo`, `obtenerArtefactosAguasAbajo` (nuevo
  parámetro opcional `indiceTopologico`, usado también por
  `identificarTramosRepresentativosDeLocales`), y los `Array.find` de
  tramo-por-id de `resolverDiametroComercialDeTramo` /
  `resolverPerdidaDistribuidaDeTramo` (arregla 3).
- `tramosRepresentativosDeLocales` (`obtenerTramosRepresentativosDeLocalesDeContexto`):
  el `Map` completo de `identificarTramosRepresentativosDeLocales`,
  calculado UNA vez por resolución y reutilizado por
  `seleccionarTramosDeAcumulacion` en sus dos call sites (arregla 4, la de
  mayor impacto).

Todos los parámetros nuevos son **opcionales**, threadeados hasta el
fondo de cada cadena de llamadas: ausentes ⇒ comportamiento previo byte a
byte (lo que siguen haciendo los call sites puntuales de la UI que no
pasan contexto, y todos los tests históricos sin cambios). El fix de 2
(`resolverEntradasDeVerificacion`) es distinto: no usa `ContextoDeCalculoM2`
porque esa función corre ANTES de que exista un contexto de M2 (es la
que construye los inputs que luego arma `resolverEstadoModulo2`) -- en
cambio construye dos `Map` LOCALES a esa llamada (`nodosTerminalesPorId`,
`redPorNodoTerminalId`) una sola vez, reutilizados por las closures que
antes recalculaban por terminal.

### Hallazgo en React -- quinto, ya con el motor arreglado

`ResultadoHidraulicoDeTramo` (sección "Tuberías", **exclusivamente**
dimensionamiento Qc/DN/V/hf desde UI-01A/D-δ.72 -- la verificación de
presión vive en su propia etapa) seguía re-renderizando sus ~20+
`SeccionDeUnidadFuncional` completas ante CUALQUIER cambio de `proyecto`,
incluidos los que sólo tocan presión (pelo de agua, desnivel, presión
sobre acera) -- datos que ese árbol de render **nunca lee**. Auditado por
`grep` sobre TODO `interfaz/paginas/**`: ningún archivo del árbol de
Tuberías (`DistribucionGeneral`, `DistribucionSecundaria`,
`SeccionDeUnidadFuncional`, `ConstructorDeMontantes`,
`resolverFilaDeDimensionamiento`, `resolverControlDeDnDeTramo`,
`resolverResultadoDeTramoParaUi`) referencia `Nodo.cota_m`,
`parametros.desnivelConexion_m` ni `parametros.presionSobreAcera_m` --
sólo `PanelDePresionDeModulo2.tsx` y `PanelDeModulo4.tsx` (secciones
DISTINTAS) los leen. Y los mutadores correspondientes (`conCotaDeNodo`,
`conDesnivelConexion`, `conParametro`) hacen spread superficial: sólo
tocan `redHidraulica.nodos` o `parametros`, preservando intactas las
referencias de `unidadesFuncionales` y `redHidraulica.tramos`.

**Fix:** `React.memo(ResultadoHidraulicoDeTramoBase, sonPropsDeDimensionamientoEquivalentes)`.
El comparador vive en su propio archivo
(`interfaz/paginas/sonPropsDeDimensionamientoEquivalentes.ts`, sin JSX --
mismo criterio que `duplicarUnidadFuncional.ts`, evita violar
`react-refresh/only-export-components`) y compara por REFERENCIA:
`unidadesFuncionales`, `redHidraulica?.tramos`, `configuracionHidraulica`,
`modoTrabajo` (por margen de seguridad, aunque hoy no se lee en este
árbol), `catalogoArtefactos`, `onCambiar`. No es una heurística ni un
cache: es una comparación de referencias auditada contra lecturas reales,
exactamente lo que el brief pide antes de introducir una dependency key
(§12). Cualquier edición real (artefacto, UF, Tramo, granularidad) sigue
reconstruyendo alguna de esas referencias y dispara el re-render normal.

### Medido

**Node (`resolverEstadoModulo2` solo, benchmark XXL, `localesPorUf=3`):**

| UF | tramos | terminales | antes (01C) | después (01D) |
| --- | ---: | ---: | ---: | ---: |
| 8 | 225 | 168 | 27,3 ms | 16,9 ms (−38 %) |
| 14 | 393 | 294 | 67,6 ms | 30,3 ms (−55 %) |
| 20 | 561 | 420 | 147,2 ms | 46,9 ms (−68 %) |
| 21 | 589 | 441 | 139,8 ms | 48,0 ms (−66 %) |

**Navegador real (dev build sin minificar, React Profiler temporal, 21 UF,
`granularidadHidraulica: 'simplificada'`, esquema `tanqueElevado`):**

| Acción | antes de 01D | tras arreglar sólo el motor (fix 1-4) | tras agregar el memo de React |
| --- | ---: | ---: | ---: |
| Editar desnivel (1 `fill`) | ~15,7 s | ~2,3 s | **~1,0 s** |
| `resolverResolucionDeModulo2` (mark interno) | ~13,8 s | ~0,15 s | ~0,15 s (sin cambio, ya no domina) |
| Duplicar UF 20→21 | ~0,9-1,8 s | ~1,5-1,8 s (sin cambio: motor ya no dominaba) | ~1,5-1,8 s (sin cambio: SÍ debe re-renderizar) |
| Agregar artefacto | -- | ~2,5-2,6 s | ~2,5-2,6 s (sin cambio: SÍ debe re-renderizar) |

`Duplicar UF`/`Agregar artefacto` no bajan con el memo porque
**correctamente** cambian `unidadesFuncionales` -- ese costo (~1-2,6 s a
21 UF) es render legítimo de las secciones de UF que sí cambiaron, no
trabajo evitable. Candidato a `PERF-SCALE-01E` (virtualizar/colapsar
secciones de UF, ligado a `UI-M2-GROUP-01`) si la validación manual lo
sigue sintiendo pesado -- no decidido acá, no hay evidencia de que sea
percibido como "colgarse" (el reporte del usuario fue específicamente
sobre pelo de agua/desnivel, ya resuelto).

### Hallazgo adicional -- "384/441 motivos" (no arreglado, fuera de alcance)

El fixture XXL de 20-21 UF reproduce, con `esquema: 'tanqueElevado'` +
granularidad `simplificada`, un estado `incompleto` con exactamente un
motivo por terminal (420/441) -- el mismo orden de magnitud que los "384
motivos" del caso real del usuario. La causa observada es
`perdidaDistribuidaIncompleta`/`sinCandidatoAdmisible`: con un único
tronco de distribución cargando el caudal simultáneo agregado de 20+ UF,
el Qc de ese tramo puede exceder la velocidad admisible de TODO el
catálogo comercial disponible. Esto es un **límite de diseño/catálogo**
(la topología real necesitaría más de un tronco, o un catálogo con
diámetros mayores), no un bug de cálculo ni de performance -- se
documenta como observación/hipótesis plausible del caso real, sin
investigarlo más ni "arreglarlo" ocultando motivos (brief §15: nunca
eliminar información para ganar performance). Si el usuario confirma que
su proyecto real muestra el mismo patrón (todos los motivos del mismo
tipo, concentrados en tramos troncales), es un candidato a un slice de
diseño/catálogo separado, no de performance.

### Equivalencia y regresión

- `contextoDeCalculoM2.equivalencia.test.ts`: +3 casos por escenario
  (`obtenerCaminoHaciaOrigen`, `obtenerArtefactosAguasAbajo`,
  `identificarTramosRepresentativosDeLocales`, contexto ≡ sin contexto) +
  1 escenario nuevo ("escala 5×3 · estimado + simplificada", el único que
  ejercitaba 'simplificada' a escala) -- 42/42 verde.
- `independenciaEstructuralDePresion.test.ts` (nuevo,
  `motor/modulo2/`): sobre `resolverEstadoModulo2` de punta a punta (no
  una función aislada), con `tanqueElevado`, en AMBAS granularidades --
  editar pelo de agua o desnivel deja Qc/DN/V/hf byte-idénticos para
  todos los terminales (excluye deliberadamente `desnivel_m`/
  `presionResidual_mca`/`cumpleMinimo`, que SÍ deben cambiar).
- `sonPropsDeDimensionamientoEquivalentes.test.ts` (nuevo): 8 casos --
  mismas props exactas, pelo de agua, desnivel, presión sobre acera
  (equivalentes); duplicar UF, editar longitud de un Tramo, cambiar
  granularidad, distinto `catalogoArtefactos`/`onCambiar` (distintas).
- `escalaDelMotor.regresion.test.ts`: 2 aserciones actualizadas para
  reflejar la arquitectura nueva -- `indicesTopologicosCreados` pasa de
  "igual a los cálculos reales (≈tramos)" a **"exactamente 1 por
  resolución, sin importar la escala"** (verificado en 2 UF y 20 UF) -- y
  1 caso nuevo: `construccionesTramosRepresentativos === 1` en
  'simplificada' a 20 UF (antes hubiera sido ~2·terminales).
- `resolucionesDeVerificacionPorEdicion.regresion.test.ts`: 1 aserción
  actualizada. `obtenerArtefactosAguasAbajo` ahora comparte
  `indicesTopologicosCreados` con la ruta hidráulica (antes tenía su
  propio índice inline sin instrumentar) -- durante el build de
  `duplicarUnidadFuncionalEnProyecto` (que llama
  `obtenerArtefactosAguasAbajo` por cada Artefacto clonado, para
  conectividad, SIN hidráulica) el contador ya no da 0. El invariante
  real del test -- cero hidráulica durante el build -- lo siguen
  cubriendo intactas las aserciones de `solicitudesHidraulicaDeTramo`/
  `solicitudesDiametroComercialDeTramo === 0`.
- Vitest **1686 / 1686** (1649 + 37 nuevos). Goldens **sin rebaseline**.
- `tsc -b` / `npm run e2e:typecheck` / `npm run build` verdes. **ESLint
  11 / 0 / 0** -- verificado contra baseline real (`git stash` +
  `eslint .` sobre HEAD limpio): los 11 errores preexistentes son
  idénticos, ninguno introducido por este slice.

### E2E y fuzz

- `escala-verificacion.spec.ts` ampliado de ~5 UF (4 duplicaciones) a
  **~20 UF** (19 duplicaciones) + acción "Agregar artefacto" nueva
  (brief §35: cubrir escala 20 UF explícitamente). Desktop (34,6 s) y
  mobile (37,4 s) verdes contra build local -- más rápido que antes de
  01D pese a cubrir 4× más escala.
- Resto de la suite E2E dirigida (`smoke`, `catalogo-conectividad` 27
  casos, `crash-observado`) verde contra build local, sin regresiones.
- Fuzz Nivel A completo (se tocó motor + `MotorDemandaPantalla`/
  `ResultadoHidraulicoDeTramo`, brief §36): `424242` 3×30 desktop;
  históricos `34493241441-1:15` desktop+mobile, `34411681277-1:0`,
  `34398035608-1` runs 0..12, `m7`, `m42`, `m99` -- todos verdes,
  corridos en serie (un `--workers=1` de más al principio delató un
  falso positivo por correr dos Playwright en paralelo por error propio,
  no un bug de la app; se re-corrió limpio y en serie).

### Instrumentación de diagnóstico -- retirada

El `React.Profiler` temporal (`PerfProfiler`, gateado por
`window.__IUAS_PERF__`) y el spec de Playwright que lo activaba se
usaron exclusivamente para esta fase de profiling y se **eliminaron por
completo** antes de cerrar el slice -- no queda ningún rastro en
`src/` ni en `tests/e2e/`. La única instrumentación que permanece es la
de CONTEO (mismo seam `instrumentacionTopologica.ts` de 01A/B, inerte por
defecto), extendida con los 4 contadores nuevos descriptos arriba --
siguiendo la convención ya establecida, no un framework nuevo.

### M2 lazy / botón "Iniciar M2" -- no necesario

Con el motor arreglado y el memo de React en su lugar, cargar M1 (agregar
UF/artefactos) ya no dispara un costo evitable en M2: el único trabajo
restante en `Duplicar UF`/`Agregar artefacto` es render legítimo de
secciones que cambiaron. No hay evidencia de que "iniciar M2 bajo
demanda" resuelva algo que el fix actual no resuelva ya -- no se
implementa (brief §18: no esconder un motor/render ineficiente detrás de
un botón; acá no hay ineficiencia que esconder).

### Estado

**D-δ.100 / PERF-SCALE-01D -- CERRADO.** Código nuevo en `src/`:
`interfaz/paginas/sonPropsDeDimensionamientoEquivalentes.ts` (+`.test.ts`),
`motor/modulo2/independenciaEstructuralDePresion.test.ts`,
`scripts/perf/benchmarkEscalaXXL.perf.ts`. Modificados:
`motor/tuberias/contextoDeCalculoM2.ts` (+3 campos/getters),
`motor/tuberias/topologia/obtenerCaminoHaciaOrigen.ts`,
`motor/tuberias/topologia/obtenerArtefactosAguasAbajo.ts` (+parámetro
`indiceTopologico` opcional),
`motor/tuberias/topologia/identificarTramoRepresentativoDeLocal.ts`
(+parámetro `contexto` opcional +memo),
`motor/tuberias/topologia/instrumentacionTopologica.ts` (+4 contadores),
`motor/tuberias/resolverHidraulicaDeTramo.ts`,
`motor/tuberias/resolverDiametroComercialDeTramo.ts`,
`motor/tuberias/resolverPerdidaDistribuidaDeTramo.ts`,
`motor/tuberias/presion/resolverPresionResidualDeCamino.ts` (+timers de
diagnóstico gateados),
`motor/tuberias/presion/seleccionarTramosDeAcumulacion.ts`,
`motor/tuberias/presion/acumularPerdidaDistribuidaDeCamino.ts`,
`motor/tuberias/presion/acumularPerdidaLocalizadaDeCamino.ts`,
`interfaz/paginas/resolverEntradasDeVerificacion.ts`,
`interfaz/paginas/resolverRedDeTerminal.ts` (+contador),
`interfaz/paginas/resolverResultadoDeTramoParaUi.ts`,
`interfaz/paginas/ResultadoHidraulicoDeTramo.tsx` (+`React.memo`),
`motor/tuberias/contextoDeCalculoM2.equivalencia.test.ts`,
`motor/tuberias/escalaDelMotor.regresion.test.ts`,
`interfaz/paginas/resolucionesDeVerificacionPorEdicion.regresion.test.ts`,
`tests/e2e/escala-verificacion.spec.ts`. Baseline: **Vitest 1686/1686**,
`tsc -b` / `e2e:typecheck` / `build` verdes, **ESLint 11/0/0** (baseline
sin cambios, verificado). E2E desktop+mobile verde contra build local.
Fuzz Nivel A completo verde. Sin cambio de resultados hidráulicos, sin
cache global, sin schema change, sin invalidation engine, sin worker, sin
debounce.

**PERF-SCALE-01: pendiente sólo la validación manual del usuario sobre
el deploy** -- llegar a 20 UF, duplicar 20→21, agregar artefacto, teclear
varias veces en "Pelo de agua mínimo" y en el desnivel, revisar si
Verificación sigue mostrando cientos de motivos del mismo tipo. Según esa
prueba: `PERF-SCALE-01: CERRADO`, o se abre `PERF-SCALE-01E` (render/DOM:
virtualizar/colapsar secciones de UF) con la evidencia concreta que
aporte -- no por intuición.

**Siguiente:** push a `main`, deploy, QA Fuzz cloud 20×30 (seed vacía)
sobre `main`, luego la validación manual de arriba.

## D-δ.101 -- FIX-MONTANTE-ADD-01: el comparador de memo de 01D ocultaba el alta de montantes y la edición de tee -- CERRADA

Regresión funcional reportada por el usuario tras el deploy de
PERF-SCALE-01D (QA Fuzz cloud 20×30 seed vacía **TODO VERDE**, producción
carga): en Tuberías → Constructor de montantes, `+ Agregar montante` →
elegir Agua fría/Agua caliente **no mostraba ningún montante nuevo**.
Prioridad sobre `PERF-SCALE-01E` -- no se inició.

### Causa raíz

El `React.memo` introducido en D-δ.100
(`sonPropsDeDimensionamientoEquivalentes.ts`, ver arriba) compara por
referencia `unidadesFuncionales` / `redHidraulica?.tramos` /
`configuracionHidraulica` / `modoTrabajo` / `catalogoArtefactos` /
`onCambiar` -- pero el árbol que envuelve (`ResultadoHidraulicoDeTramo`,
que incluye `ConstructorDeMontantes`) también lee dos campos que ese
comparador **no** auditó:

1. **`Proyecto.montantes`.** `conMontanteNuevo` (`montantesDelProyecto.ts`)
   sólo reconstruye `Proyecto.montantes` -- un alta sin Locales todavía no
   toca `unidadesFuncionales` ni `redHidraulica.tramos`. El comparador
   veía las cinco referencias auditadas intactas → "props equivalentes" →
   React se saltaba el render → `ConstructorDeMontantes` seguía mostrando
   el árbol viejo ("Todavía no hay montantes explícitos") aunque
   `Proyecto.montantes` ya tuviera la identidad nueva. Caso **C** del
   diagnóstico pedido: el estado cambiaba, React no re-renderizaba.
2. **`Nodo.tee`.** Mismo patrón para `DerivacionesDeMontante` →
   `TeeDeNodoEditor` (M2-TOPO-D, D-δ.95), que lee `redHidraulica.nodos`.
   `conTeeDeNodo` (`actualizarRedHidraulica.ts`) sólo reconstruye
   `redHidraulica.nodos` -- nunca `.tramos` -- así que elegir un tipo de
   entrada o una salida recta tampoco re-renderizaba: el radio quedaba
   visualmente sin marcar (Playwright lo reportaba como "Clicking the
   checkbox did not change its state").

El comentario original de D-δ.100 auditó correctamente que el árbol
**nunca lee** `Nodo.cota_m` / `desnivelConexion_m` / `presionSobreAcera_m`
(por eso esos tres se excluyen a propósito), pero no verificó la
recíproca: que **todo** lo que el árbol sí lee estuviera cubierto por el
comparador. `montantes` y `Nodo.tee` son ambos de escritura reciente
(M2-TOPO-C/D, D-δ.93/95) y quedaron fuera cuando D-δ.100 escribió el
comparador.

### Por qué el E2E existente (`montantes.spec.ts`) no lo detectó antes del deploy

No fue el fuzz cloud: sus acciones `crearMontanteAF`/`crearMontanteAC`
(`tests/e2e/qa/acciones.ts`) hacen click pero **nunca verifican que la
card aparezca** -- sólo corren los invariantes genéricos (consola limpia,
app viva) al final de cada step, y como el memo no rompe nada (sólo
oculta un render), esos invariantes no detectan nada anómalo. El spec
determinista `tests/e2e/montantes.spec.ts` sí afirma explícitamente
`toBeVisible()` sobre la card nueva y falló de inmediato al correrlo
sobre HEAD (verificado antes de tocar código) -- pero ese spec no forma
parte del gate "QA Fuzz cloud" que valida cada slice de PERF-SCALE; no
se había vuelto a correr como parte del checkpoint post-01D.

### Fix

Una línea funcional + un comparador dirigido nuevo en
`sonPropsDeDimensionamientoEquivalentes.ts`:

- `prev.proyecto.montantes === next.proyecto.montantes` agregado a la
  comparación por referencia (igual tratamiento que `unidadesFuncionales`).
- `sonNodosDeTeeEquivalentes(prevNodos, nextNodos)`: **no** compara
  `redHidraulica.nodos` por referencia de array completo -- ese array se
  reconstruye (nuevo `.map`) también cuando sólo cambia `Nodo.cota_m`
  (`conCotaDeNodo`, editado desde Verificación/Módulo 4, una sección
  DISTINTA que sí debe seguir sin re-renderizar Tuberías, tal como D-δ.100
  lo dejó). Comparar el array completo habría reintroducido exactamente
  el re-render que ese memo existe para evitar. En cambio compara sólo el
  campo `tee` de cada nodo (por posición/id, mismo orden que produce
  `.map`), que es el único campo de `Nodo` que este árbol lee.

Ningún cambio de dominio: `Proyecto.montantes`, `Montante`, `Nodo.tee`,
`conMontanteNuevo`, `conTeeDeNodo`, reconciliación, segmentación, cotas,
RD-1/RD-2, D-δ.50, fan-out 1→N -- todo intacto.

### Regresión agregada

- `sonPropsDeDimensionamientoEquivalentes.test.ts`: +2 casos --
  `conMontanteNuevo` → DISTINTAS (antes del fix, el bug real habría dado
  `true`); `conTeeDeNodo` → DISTINTAS. El caso preexistente de
  `conCotaDeNodo` → equivalentes sigue en `true` (perf de 01D preservada).
- `tests/e2e/montantes.spec.ts` (preexistente, sin cambios de contenido):
  los 5 casos -- incluidos el alta AF/AC por la ruta interactiva real del
  usuario (click + selector, sin helpers internos) y la configuración de
  tee de una derivación -- fallaban contra el código pre-fix (4 por
  timeout esperando la card/selector, 1 -- la de tee -- por
  "Clicking the checkbox did not change its state") y pasan con el fix,
  desktop y mobile.

### Hallazgo de infraestructura de testing local (corregido, fuera del dominio)

`playwright.config.ts` invocaba `vite preview` sin `--base`: Vite
resuelve `command` como `'serve'` (no `'build'`) durante `preview`, así
que el `base: command === 'build' ? '/IUAS/' : '/'` de `vite.config.ts`
nunca aplicaba la base `/IUAS/` al servidor de preview, mientras el
`index.html` ya construido sí referenciaba `/IUAS/assets/...` (base fija
en tiempo de build). El preview local servía el bundle en la raíz y
cualquier request a `/IUAS/assets/...` caía al fallback SPA (devolvía
`index.html`, `Content-Type: text/html`, en vez del JS real) -- esto
enmascaró la primera corrida de verificación local del fix (parecía que
el fix no andaba; en realidad el navegador nunca cargó el JS nuevo).
Corregido agregando `--base /IUAS/` al comando `preview` del `webServer`
de Playwright. No afecta el build de producción (`vite build` sigue
resolviendo `/IUAS/` como siempre) ni GitHub Pages.

### Verificación

Vitest **1688 / 1688** (1686 + 2 nuevos). `tsc -b` / `npm run
e2e:typecheck` / `npm run build` verdes. **ESLint 11 / 0 / 0** (baseline
sin cambios, ninguno de los 3 archivos tocados por este fix aparece en la
lista de errores preexistentes). E2E contra build local
(`IUAS_BASE_URL=http://localhost:4173/IUAS/`, tras el fix de
`playwright.config.ts`): `montantes.spec.ts` 5/5 desktop + 5/5 mobile;
`smoke.spec.ts`, `catalogo-conectividad.spec.ts` (24 casos),
`cotas-heredadas.spec.ts` verdes (confirman que la optimización de pelo
de agua/desnivel de 01D sigue intacta). Fuzz dirigido (fix acotado a
React/memo, sin tocar motor ni reconciliación): seeds `7`, `42`, `99` ·
30 pasos cada una, verdes contra build local.

### Estado

**D-δ.101 / FIX-MONTANTE-ADD-01 -- CERRADA.** Código modificado:
`interfaz/paginas/sonPropsDeDimensionamientoEquivalentes.ts` (+`.test.ts`),
`playwright.config.ts` (infraestructura de testing local, sin afectar
producción). Sin cambios de dominio, schema, reconciliación ni fórmulas.

**Siguiente:** push a `main`, deploy, smoke de producción (AF + AC +
renombrar), validación manual del usuario, luego QA Fuzz cloud 20×30 seed
vacía sobre `main`. Si verde: retomar `PERF-SCALE-01E` (diagnóstico
pendiente: agregar UF vacía 33→34 tarda >2 s).

## D-δ.102 -- PERF-SCALE-01E: `Agregar UF` vacía a ~33 UF re-renderizaba las 33 tarjetas existentes de Tuberías sin necesidad -- CERRADO

Quinto slice del P1 `PERF-SCALE-01`. Gates de entrada: FIX-MONTANTE-ADD-01
(D-δ.101) validado manualmente en producción (alta de montante AF y AC
funcionando); QA Fuzz cloud post-fix (`main`, 20×30, seed vacía) confirmado
**TODO VERDE** por el usuario antes de iniciar.

### Caso real

Evidencia manual del usuario tras 01D/FIX-MONTANTE-ADD-01: con ~30 UF y
~544 artefactos ya cargados, M4 (volumen tanque, volumen cisterna, pelo de
agua, desniveles) sigue **totalmente fluido** -- 01D no se rompió. Pero
`+ Agregar unidad funcional` con ~33 UF existentes tarda **más de 2 s**,
pese a que la UF nueva nace **vacía** (sin Locales/Artefactos/terminales/
tramos/montantes/demanda nueva). `Duplicar UF` 30→31 (que sí cambia datos
reales) medía ≈2,46 s -- mencionado como referencia, no como objetivo
principal.

### Propiedad de dominio verificada primero

Antes de optimizar nada: ¿agregar una UF vacía cambia algún resultado
hidráulico existente? Verificado con
`agregarUnidadFuncional.equivalencia.test.ts` (nuevo, 21 casos × 3 escalas
de fixture: 3/10/20 UF, esquema `tanqueElevado` + profesional, mismo
patrón que el fixture XXL de 01D) -- comparando el Proyecto antes/después
de `agregarUnidadFuncionalVaciaEnProyecto`:

- `redHidraulica`, `configuracionHidraulica`, `configuracionMedidores`,
  `configuracionAbastecimiento`, `montantes` y `parametros` se preservan
  **por referencia** (el mutador sólo reconstruye `unidadesFuncionales`).
- Cero artefactos/terminales/tramos/nodos nuevos.
- `calcularSimultaneidad` (demanda/Qc), `resolverEstadoModulo2` (Qc/DN/V/
  hf/presión/crítico/completitud), `resolverEstadoModulo3` y
  `resolverEstadoModulo4` resuelven **byte a byte idénticos** antes y
  después, en las tres escalas.

Confirmado: sólo el listado de `unidadesFuncionales` (y cualquier resumen
que cuente UF) debía cambiar. Todo lo demás que sí cambiaba era trabajo
evitable.

### Profiling BEFORE

**Node** (`scripts/perf/benchmarkAgregarUfVacia.perf.ts`, nuevo --
`localesPorUf=4` para aproximar la densidad real, 528 artefactos a 33 UF
vs. ~544 reportados): "PANTALLA COMPLETA" (validación + M2 + resumen +
M3 + M4, réplica exacta de lo que corre `MotorDemandaPantalla` por
render) sobre el proyecto YA CON la UF vacía agregada:

| UF (antes→después) | mutación | pantalla completa (motor) |
| --- | ---: | ---: |
| 10→11 | ~0 ms | 34,8 ms |
| 20→21 | ~0 ms | 106,6 ms |
| 30→31 | ~0 ms | 242,7 ms |
| 33→34 | ~0 ms | 296,4 ms |

El motor (Node, sin DOM) nunca pasó de ~300 ms -- no explica los >2 s
reportados. Candidatos M2 idénticos antes/después confirmado en el mismo
script (equivalencia de dominio, reafirma lo de arriba).

**Navegador real** (build local, `vite preview`, medido con
`performance.now()` alrededor del click + 2 rAF de estabilización; nota
de infraestructura: la fixture `baseURLEfectiva` de
`tests/e2e/qa/fixtures.ts` lee `IUAS_BASE_URL` directamente y **no**
respeta el `use.baseURL` que arma `IUAS_PREVIEW=1` en
`playwright.config.ts` -- medir contra el build local exige pasar
**ambas** variables, `IUAS_PREVIEW=1 IUAS_BASE_URL=http://localhost:4173/IUAS/`;
sin `IUAS_BASE_URL` explícita, cualquier medición "local" termina
midiendo producción en silencio, como pasó en la primera pasada de este
mismo profiling):

| Acción | 10→11 UF | 20→21 UF | 30→31 UF | 33→34 UF |
| --- | ---: | ---: | ---: | ---: |
| Agregar UF vacía (ANTES, producción pre-fix) | ~300 ms | ~800-1000 ms | ~1700-2200 ms | **~2000-2450 ms** |

Reproduce el reporte del usuario casi exacto. Con el motor acotado a
~300 ms, el resto (~1700 ms a 33 UF) es render/commit/DOM de React.

### Causa raíz

`SeccionDeUnidadFuncional` (una tarjeta de UF dentro de "Tuberías",
`ResultadoHidraulicoDeTramo.tsx`) **no tenía `React.memo` propio**. El
único memo existente en ese árbol (`ResultadoHidraulicoDeTramo`,
`sonPropsDeDimensionamientoEquivalentes.ts`, de 01D) compara
`unidadesFuncionales` **por referencia completa** -- correcto para decidir
si el árbol entero necesita re-renderizar, pero esa referencia SIEMPRE
cambia al agregar una UF (aunque sea vacía), así que el memo externo
nunca evita nada acá: `ResultadoHidraulicoDeTramoBase` se re-ejecuta
completo y su `.map()` vuelve a invocar las 33 (o N) instancias de
`SeccionDeUnidadFuncional`, no sólo la nueva. Cada una reconstruye su
propia tabla de dimensionamiento (`TablaDimensionamientoDeModulo2`) más
el árbol `LocalYRedCard`/`TeeDeNodoEditor`/`AccesoriosDeTramoEditor` de
cada Local -- trabajo de render+reconciliación real, aunque sin tocar el
DOM final (props/valores resultan iguales), que crece con la cantidad de
UF existentes: exactamente el patrón O(n) observado en la tabla de
arriba (300→800→1700→2000 ms).

### Auditoría recíproca (misma disciplina que exigió FIX-MONTANTE-ADD-01)

Grep sobre todo lo que `SeccionDeUnidadFuncional` y su subárbol
(`LocalYRedCard`, `TeeDeNodoEditor`, `AccesoriosDeTramoEditor`,
`resolverFilaDeDimensionamiento`, `resolverControlDeDnDeTramo`,
`resolverResultadoDeTramoParaUi`, `construirArbolDeLocal`) leen de
`Proyecto`: únicamente `redHidraulica` (`.tramos`, y sólo el campo `.tee`
de cada `Nodo`) y `configuracionHidraulica`. **Nada de este árbol lee
`Proyecto.montantes` ni `Proyecto.modoTrabajo`** directamente
(`ConstructorDeMontantes` es un HERMANO en el JSX de
`ResultadoHidraulicoDeTramoBase`, no un hijo de `SeccionDeUnidadFuncional`).

### Fix

`React.memo` dirigido en `SeccionDeUnidadFuncional`
(`sonPropsDeSeccionDeUnidadFuncionalEquivalentes.ts`, propio archivo por
`react-refresh/only-export-components`, reutiliza `sonNodosDeTeeEquivalentes`
exportada de 01D/FIX-MONTANTE-ADD-01) que compara: `uf` (referencia
propia -- lo único variable por instancia), `redHidraulica?.tramos`
(referencia), `Nodo.tee` de todos los nodos (mismo criterio que
FIX-MONTANTE-ADD-01), `configuracionHidraulica` (referencia),
`catalogoArtefactos` y `onCambiar` (referencia; `onCambiar` es
`setProyecto`, estable por contrato de React). Deliberadamente
**excluidos** de la comparación, con la justificación auditada en el
propio archivo: `proyecto` completo (siempre cambia; los campos que
importan ya se comparan por separado), `filasPrincipalesDeLocales`
(array recalculado ENTERO en el padre en cada render, pero su contenido
para una UF cuyo `tramos`/`nodos.tee` no cambiaron tampoco cambia --
verificado por los tests de equivalencia), `contextoDeCalculo` (instancia
nueva por render, es un caché de deduplicación DENTRO de una resolución,
no una fuente de datos -- si el memo salta el render de una UF, ese
contexto simplemente nunca se toca para ella). Ninguna de las exclusiones
reabre invalidación global (brief §9): son comparaciones explícitas,
auditadas, locales a este comparador.

De paso, la mutación real de "Agregar UF" (antes una closure privada
`agregarUnidadFuncional` dentro de `MotorDemandaPantalla.tsx`) se extrajo
a `interfaz/paginas/agregarUnidadFuncional.ts`
(`agregarUnidadFuncionalVaciaEnProyecto` + `crearUnidadFuncionalVacia`),
mismo criterio que `duplicarUnidadFuncional.ts`: testeable sin arrastrar
React/JSX. Comportamiento sin cambios -- sigue siendo un spread
superficial de `unidadesFuncionales`.

### Medido (AFTER)

Navegador real, mismo build local, misma técnica de medición, con un
contador de renders temporal (retirado antes de cerrar el slice) que
confirmó **exactamente 1** ejecución de `SeccionDeUnidadFuncional` por
click -- sólo la UF nueva, cero de las existentes:

| Acción | 10→11 UF | 20→21 UF | 30→31 UF | 33→34 UF |
| --- | ---: | ---: | ---: | ---: |
| Agregar UF vacía (ANTES) | ~300 ms | ~800-1000 ms | ~1700-2200 ms | ~2000-2450 ms |
| Agregar UF vacía (DESPUÉS) | ~250-320 ms | ~430-530 ms | ~590-860 ms | **~580-630 ms** |
| Renders de `SeccionDeUnidadFuncional` (ANTES → DESPUÉS) | N → 1 | N → 1 | N → 1 | N (34) → **1** |

A 33→34 UF: de **>2 s a ~600 ms** (≈3,3-3,5×), y crucialmente la curva
deja de crecer con la escala (250→430→590→610 ms, prácticamente meseta)
en vez de seguir subiendo linealmente -- confirma que el costo residual
es, en su mayoría, el motor (~300 ms medidos en Node) más el render de
UNA sola UF nueva, no trabajo por-UF-existente. `Duplicar UF` 30→31
(control, no tocado por este fix): ~2,7 s DESPUÉS -- consistente con los
≈2,46 s reportados antes de 01E (sin regresión; sigue siendo render
legítimo de una UF que sí cambia datos, brief §23).

M4 (volumen tanque/cisterna, pelo de agua, desniveles) no fue tocado por
este fix (memo exclusivo de `SeccionDeUnidadFuncional`, dentro de
"Tuberías") -- `escala-verificacion.spec.ts` (que ejercita pelo de
agua/desnivel a escala) sigue verde, confirma que 01D sigue intacto.

### Equivalencia y regresión

- `agregarUnidadFuncional.equivalencia.test.ts` (nuevo): 21 casos × 3
  escalas -- ver "Propiedad de dominio verificada primero" arriba.
- `sonPropsDeSeccionDeUnidadFuncionalEquivalentes.test.ts` (nuevo): 10
  casos -- mismas props (equivalente); agregar UF vacía nueva sobre una UF
  existente (equivalente, no debe re-renderizar); agregar montante nuevo
  (equivalente -- este árbol no lee `montantes`); editar pelo de agua de
  la raíz (equivalente); duplicar OTRA UF y editar longitud de un Tramo
  (distintas -- `redHidraulica.tramos` cambió); cambiar
  `granularidadHidraulica` (distintas); **configurar la tee de un nodo
  (distintas -- guardia explícita de la regresión FIX-MONTANTE-ADD-01,
  extendida a este comparador nuevo)**; esta misma UF pasa a ser otra
  instancia (distintas); distinto `catalogoArtefactos`/`onCambiar`
  (distintas).
- Vitest **1719 / 1719** (1688 + 31 nuevos). Goldens **sin rebaseline**.
- `tsc -b` / `npm run e2e:typecheck` / `npm run build` verdes. **ESLint
  11 / 0 / 0** -- idéntico al baseline, ninguno de los archivos nuevos ni
  modificados aparece en la lista de errores preexistentes.

### E2E y fuzz

- `tests/e2e/agregar-uf-vacia-escala.spec.ts` (nuevo): construye 30 UF
  (29 duplicaciones desde la UF de demo), clickea `+ Agregar unidad
  funcional`, verifica 31 tarjetas de UF en Demanda, la UF 31 nace
  colapsada y vacía (se expande y se confirma 0 Locales), "Tuberías"
  también muestra la UF 31, sin `pageerror`/`console.error`, invariantes
  OK. Verde desktop (21 s) y mobile (27 s) contra build local. NO afirma
  sobre milisegundos (eso queda en la tabla de arriba, no en CI).
- `montantes.spec.ts` (guardia de FIX-MONTANTE-ADD-01): 5/5 desktop + 5/5
  mobile verde -- alta de montante AF/AC y edición de tee siguen
  funcionando con el comparador nuevo en el árbol.
- `cotas-heredadas.spec.ts`, `smoke.spec.ts`, `escala-verificacion.spec.ts`
  (guardia de 01B/01D, pelo de agua/desnivel a ~20 UF): verdes desktop
  contra build local.
- Fuzz Nivel A (se tocó memoización compartida de "Tuberías", brief §33):
  seed `424242` × 3 runs × 30 pasos, desktop -- verde.

### Instrumentación de diagnóstico -- retirada

El contador temporal (`window.__seccionRenders`, incrementado dentro de
`SeccionDeUnidadFuncionalBase`) y el spec de Playwright que lo leía se
usaron exclusivamente para confirmar la causa raíz y verificar el fix, y
se **eliminaron por completo** antes de cerrar el slice -- no queda
ningún rastro en `src/` ni en `tests/e2e/`.

### Estado

**D-δ.102 / PERF-SCALE-01E -- CERRADO.** Código nuevo:
`interfaz/paginas/agregarUnidadFuncional.ts`,
`interfaz/paginas/agregarUnidadFuncional.equivalencia.test.ts`,
`interfaz/paginas/sonPropsDeSeccionDeUnidadFuncionalEquivalentes.ts`
(+`.test.ts`), `scripts/perf/benchmarkAgregarUfVacia.perf.ts`,
`tests/e2e/agregar-uf-vacia-escala.spec.ts`. Modificados:
`interfaz/paginas/MotorDemandaPantalla.tsx` (usa la mutación extraída),
`interfaz/paginas/ResultadoHidraulicoDeTramo.tsx` (`React.memo` en
`SeccionDeUnidadFuncional`),
`interfaz/paginas/sonPropsDeDimensionamientoEquivalentes.ts`
(`sonNodosDeTeeEquivalentes` exportada para reuso). Sin cambios de
dominio, sin cache global, sin invalidation engine, sin schema change,
sin worker, sin debounce, sin virtualización.

**PERF-SCALE-01: recomendado CERRAR** -- M4/presión siguen fluidos
(01D intacto), alta de UF vacía queda sub-segundo y deja de escalar con
la cantidad de UF existentes, `Duplicar UF` queda como operación pesada
legítima ocasional (dato real que cambia, no trabajo evitable). Pendiente
la validación manual del usuario (abajo) antes de confirmarlo por
completo.

**Siguiente:** push a `main`, deploy, smoke de producción, validación
manual del usuario (abajo), luego QA Fuzz cloud 20×30 (seed vacía) sobre
`main` -- sólo si el usuario lo autoriza explícitamente.

## D-δ.103 -- UI-M2-GROUP-01: jerarquía progresiva de UF en Tuberías + Montantes compactos + unmount real -- CERRADO

Slice Nivel B (UI funcional + estado transitorio + render/unmount, sin
tocar fórmulas hidráulicas, topología ni responsabilidades M1/M2/M3/M4).
Arranca después de PERF-SCALE-01A-E y FIX-MONTANTE-ADD-01 cerrados, con
QA Fuzz cloud post-01E (20×30, seed vacía) **verde** confirmado por el
usuario.

### Motivación -- evidencia manual a ~60 UF

Stress test real del usuario: ~60 UF, cientos de Locales, ~500+
artefactos. Acciones tan distintas como duplicar Local, agregar UF,
agregar Local, agregar artefacto, cambiar tipo de artefacto o agregar
montante tardaban todas **~5,5 s por igual** -- que acciones tan
distintas cuesten lo mismo apunta al tamaño del árbol UI/DOM montado de
"Tuberías" (no a un cálculo específico, que PERF-SCALE-01D/E ya
optimizaron). Además la interfaz se vuelve difícil de operar: cientos de
filas AF/AC planas antes de llegar al dimensionamiento.

Principio aplicado (no nuevo, pero formalizado acá): *la jerarquía existe
en el modelo, la interfaz sólo muestra la complejidad necesaria*. Una UF
simple no paga complejidad visual; la jerarquía aparece sólo cuando hace
falta (>1 UF, >1 montante).

### Diseño -- Unidades Funcionales en Tuberías

`ListaDeUnidadesFuncionales` (nuevo, dentro de
`interfaz/paginas/ResultadoHidraulicoDeTramo.tsx`) reemplaza el `.map`
directo de `proyecto.unidadesFuncionales` que antes montaba una
`SeccionDeUnidadFuncional` por UF sin condición:

- **≤1 UF:** rama simple -- exactamente el mismo `.map` de antes, sin
  ningún wrapper ni control adicional. Cero cambio de comportamiento
  visual para el caso más común (proyecto de 1 UF).
- **>1 UF:** cada UF pasa a un `<button>` real (`.lista-uf__cabecera`,
  `aria-expanded`) con nombre + nivel + resumen barato (`N locales · M
  artefactos`, derivado de `uf.locales` sin ningún resolver hidráulico).
  Una sola UF "activa" (`useState<string | undefined>` local al
  componente); `SeccionDeUnidadFuncional` **sólo se instancia para la UF
  activa** -- las demás no montan Local, AF, AC, `LocalYRedCard`, tee ni
  accesorios: unmount real, no `display:none`.

Detección de "UF nueva" (agregar/duplicar en M1, fuera del árbol de M2):
`useEffect` con dependencia en `proyecto.unidadesFuncionales` (la
referencia cambia exactamente cuando el array de UF cambia -- mismo
gatillo que ya usaba el memo externo de PERF-SCALE-01D/E) + un
`useRef<readonly string[]>` con los ids del render anterior. La
selección del nuevo activo la resuelve una función pura compartida,
`elegirElementoActivoTrasCambio` (nueva,
`interfaz/paginas/estadoDeElementoActivo.ts`): si aparecieron ids nuevos,
el último nuevo gana (alta/duplicado); si no, y el activo actual ya no
existe (se eliminó), se reposiciona de forma determinística (el id que
ocupaba su misma posición, o el último disponible). Recibe sólo arrays
de ids -- no acopla esta lógica de interfaz a `UnidadFuncional` ni a
`Montante`, y por eso la reutiliza también `ConstructorDeMontantes` sin
duplicar la regla.

Transiciones cubiertas explícitamente (unit SSR + E2E, ver más abajo):
1 UF → 2 UF (aparece el acordeón, la nueva queda activa), 2 UF → 1 UF
(vuelve al modo simple), eliminar la UF activa (se reposiciona sola).

### Diseño -- Local agrupa AF/AC

`TablaDimensionamientoDeModulo2.tsx` (`EntradaDeTabla`) gana un campo
opcional `grupo?: { id, etiqueta }`. Cuando dos entradas consecutivas
comparten `grupo.id`, se pinta un único `<tr class="m2-fila-grupo">`
(colSpan completo) antes de la primera fila del grupo -- las filas AF/AC
siguen siendo dos `<tr>` independientes, igual de editables que antes;
esto NO es un acordeón nuevo ni cambia `TablaDimensionamientoDeModulo2`
para sus otros consumidores (Distribución general/secundaria, Segmentos
de montante siguen sin pasar `grupo`, cero cambio visual ahí).
`SeccionDeUnidadFuncionalBase` arma `grupo: { id: local.id, etiqueta:
"<Local> · N artefactos" }` para cada fila de cada Local -- la cantidad
es `local.artefactos.length` (física, del Local), nunca AF+AC sumadas.

### Diseño -- Montantes compactos

`ConstructorDeMontantes.tsx`: `+ Agregar montante` se movió al
encabezado de la sección (antes, al final, después de recorrer todas las
cards). `MontanteCard` se partió en dos:

- `MontanteCardCabecera` -- **siempre montada** (incluso colapsada):
  `<button aria-expanded>` con nombre (o fallback), `BadgeDeRed`, resumen
  "N locales · M segmentos" derivado de `proyectarMontante` (la misma
  proyección que ya se calculaba siempre antes -- sin costo nuevo).
- `MontanteCardCuerpo` -- Locales alimentados + `AgregarLocal` +
  Segmentos + Derivaciones (Tee) + input de renombrar + "Borrar
  montante" (ahora acción secundaria del cuerpo, ya no domina el
  header). **Sólo se monta si el montante está activo** -- mismo
  unmount real que las UF.

Un montante activo por vez, misma `elegirElementoActivoTrasCambio`
(dependencia efecto: `proyecto.montantes` crudo, NO el `?? []` de
fallback -- ese crea un array nuevo cada render y dispararía el efecto
siempre; el `?? []` se aplica DENTRO del efecto). Con 1 solo montante
queda activo por defecto (`useState` inicial = `montantes[0]?.id`): se
ve exactamente igual que antes, sin fricción.

Copy de "sin Locales disponibles" (`AgregarLocal`): antes mostraba
siempre el mismo texto largo aunque el montante ya tuviera Locales
asignados y sólo no quedaran más candidatos. Ahora distingue
`tieneLocalesAsignados` (prop nueva, viene de
`proyeccion.localesServidos.length > 0`): con Locales ya asignados y sin
candidatos → "Sin más locales disponibles" (compacto); sin ningún Local
y sin candidatos → la explicación completa de antes.

### Regresión FIX-MONTANTE-ADD-01 -- auditada, no reabierta

Ningún comparador de memo (`sonPropsDeDimensionamientoEquivalentes`,
`sonPropsDeSeccionDeUnidadFuncionalEquivalentes`) se tocó en este slice:
el unmount de UF/montantes colapsados es montaje condicional en JSX
(`activo ? <X/> : null`), no un `React.memo` nuevo -- no hay superficie
nueva de "qué lee este comparador" para auditar. Guardias verificadas en
tests unitarios + `montantes.spec.ts` (sin modificar sus aserciones
existentes) + `multi-uf.spec.ts`: crear AF, crear AC, cambiar entre
montantes, editar tee, renombrar, agregar/quitar Local, borrar montante
-- todas siguen reactivas.

### Hidráulica -- invariante confirmado

Ningún cálculo (demanda, Qc, DN, Di, V, Reynolds, hf, presión, terminal
crítico) se tocó. Colapsar/expandir una UF o un montante es estado de
`useState` puramente local a un componente de presentación -- nunca
dispara `onCambiar` ni muta `Proyecto`. `montantes.spec.ts` (5/5,
desktop+mobile) verifica que el flujo de datos M2-TOPO-C completo
(alta, Locales, segmentos, tee, borrado) sigue produciendo los mismos
resultados.

### No implementado en este slice (pendiente futuro, no decisión roja)

- **`UI-M1-MULTINIVEL-01`** (Nivel real entre UF y Local): los
  componentes de este slice (`ListaDeUnidadesFuncionales`,
  `CabeceraDeUnidadFuncional`) están escritos sin asumir "UF === nivel
  físico" en su contrato, pero no se crea ningún dato ni UI de Nivel
  ahora. Cuando exista, se espera que se inserte como una capa
  intermedia dentro de la UF activa, sin rehacer el acordeón de UF ni el
  de Montantes.
- **Duplicar Local** -- pendiente, paquete separado.
- **Virtualización** (`react-window` o similar) -- no se agregó ninguna
  dependencia nueva; se priorizó medir cuánto alcanza el unmount real
  primero. Si a escala extrema (~60 UF) sigue habiendo cuello, candidato
  futuro `PERF-SCALE-UI-02` (sólo si el usuario prioriza esa escala).
- Lazy-loading de Módulos completos, router, store global nuevo,
  persistencia del estado expandido: fuera de alcance por diseño (no son
  necesarios para resolver este slice y cada uno es una decisión
  arquitectónica transversal propia).

### QA

- Vitest **1744/1744** (1719 + 25 nuevos: `estadoDeElementoActivo.test.ts`
  10 casos, `ResultadoHidraulicoDeTramo.agrupacionUf.test.ts` 9 casos,
  `ConstructorDeMontantes.componente.test.ts` +7 casos wrt baseline
  01E). `tsc -b`, `e2e:typecheck`, `build` verdes. ESLint **11/0/0**
  -- baseline idéntico, verificado ANTES de tocar código y confirmado sin
  cambios al cerrar.
- E2E nuevo `tests/e2e/multi-uf.spec.ts` (5 casos: 1 UF sin acordeón;
  duplicar dispara la UF nueva activa y colapsa la original; abrir la
  UF original, editar una longitud, volver a la otra UF -- el contenido
  se desmonta -- y volver a abrir confirma que la edición persiste en
  `Proyecto` pese al unmount; eliminar la UF activa reposiciona sola;
  escala ~30-31 UF con sólo una `SeccionDeUnidadFuncional` montada a la
  vez) -- verde desktop+mobile contra build local (`npx vite --port 5173`,
  ver nota de infraestructura abajo).
- `montantes.spec.ts` (5/5, sin tocar sus aserciones) y
  `reiniciar-calculo.spec.ts` (2/2) y `agregar-uf-vacia-escala.spec.ts`
  (spec pre-existente de PERF-SCALE-01E, sin modificar) verdes
  desktop+mobile contra build local -- confirman que la agrupación no
  rompió ningún flujo previo, incluido el caso de escala que ese spec ya
  cubría.

**Nota de infraestructura E2E local (no bloqueante, documentada para el
próximo que necesite correr E2E local contra este slice):** al validar
localmente se detectó que `npx vite preview --base /IUAS/` en Git Bash
(MSYS) puede reescribir el argumento `/IUAS/` como una ruta de
filesystem de Windows (expansión de path de MSYS), rompiendo el
`--base` real y sirviendo `index.html` para cualquier asset (404 lógico
disfrazado de 200 en `vite preview`, SPA fallback). El workaround usado
para este slice fue validar contra `npx vite --port 5173` (servidor de
desarrollo, `base` siempre `/`, mismo código fuente sin minificar) en
vez de `vite preview`; el comportamiento de producción real (con
`/IUAS/` como base) se verifica en el deploy de GitHub Pages, que no
pasa por este problema (el hosting sirve bajo `/IUAS/` directamente, sin
pasar por `vite preview`). `playwright.config.ts` ya tenía
`--base /IUAS/` correctamente citado en su comando `webServer` desde
`b8e1ac8`; el problema observado es específico de invocar `vite preview`
manualmente desde Git Bash con el argumento sin escapar.

### Estado

**D-δ.103 / UI-M2-GROUP-01 -- CERRADO, pendiente validación manual del
usuario** sobre el deploy: caso 1 UF (¿se siente igual de directo?),
crear/duplicar UF (¿la nueva toma foco?, ¿es más fácil navegar?),
~30-60 UF (¿sólo una UF desarrollada?, ¿cómo se siente una acción simple
comparada con los ~5,5 s previos?), Montantes AF/AC (crear, cambiar
entre ellos, renombrar, ¿ocupa mucho menos espacio?).

**Siguiente:** push a `main`, deploy, smoke de producción, validación
manual del usuario (arriba). Si a ~60 UF una acción simple sigue lenta
pese al unmount real, documentar (no implementar sin decisión del
usuario) el candidato `PERF-SCALE-UI-02`.

## D-δ.106 -- UI-M1-MULTINIVEL-01: `Nivel` como entidad dentro de `UnidadFuncional` -- CERRADO

Slice estructural (modelo + M1 + GEOM-COTA-01 + M2), no sólo UI. Decisión
de modelo consolidada en `docs/adr/ADR-0002-nivel-fisico-dentro-de-unidad-funcional.md`
-- este apartado registra el detalle incremental; el ADR es la fuente de
la decisión arquitectónica de fondo.

### Arqueología previa a implementar

`UnidadFuncional` (antes) tenía `nivel?: number`,
`cotaHidraulicaReferencia_m?: number` y `locales: readonly Local[]`
directamente -- asumía 1 UF = 1 nivel físico. Los Locales ya vivían
embebidos en la UF (array directo, nunca una colección referenciada por
id) desde antes de este slice; GEOM-COTA-01 (D-δ.86) ya modelaba la cota
como una cadena de herencia UF → Local → Artefacto
(`resolverCotaHidraulicaDeArtefacto.ts`). Ningún call site relevado
(M1, M2, duplicación, validación) asumía que un Local pudiera referenciar
su padre por id en vez de vivir dentro de él.

### Decisión de modelo (sin decisión roja)

Opción A (niveles anidados, `Nivel.locales`) vs. Opción B
(`Local.nivelId`) -- ver criterios completos en ADR-0002 §2.3. Se
implementó A sin detenerse a pedir aprobación porque emergió con
evidencia clara: extiende el patrón ya existente (Locales embebidos, no
referenciados), evita el único estado imposible nuevo que introduciría B
(Local huérfano con `nivelId` colgado tras borrar su Nivel), y hace
trivial la reconciliación de "eliminar nivel" (filtrar `niveles`, sin
pasada de limpieza adicional).

### Migración

`nivel`, `cotaHidraulicaReferencia_m`, `locales` se mueven de
`UnidadFuncional` a `Nivel`. Sin persistencia real todavía (`PERSIST` no
implementado), así que no hizo falta migración de datos guardados --
sólo de fixtures/factories de test y de los dos generadores de datos de
producción reutilizados por tests (`proyectoDeEjemplo.ts`,
`generarProyectoDeEscala.ts`). Superficie migrada: ~28 archivos de
producción (modelo, motor, interfaz, validación) + ~80 archivos de test
que construían la forma vieja directamente -- todos ahora compilan y
pasan contra la forma nueva, sin doble fuente de verdad (`UF.cota`
legacy conviviendo con `Nivel.cota` en ningún punto del código final).

**Trampa de TypeScript encontrada durante la migración (documentada para
el próximo slice que reestructure un tipo así):** el spread de objeto
`{ ...uf, cotaHidraulicaReferencia_m: x }` NO dispara excess-property-check
de TypeScript cuando el resultado se infiere (a diferencia de un literal
asignado directamente a una variable tipada) -- permite construir un
objeto con una propiedad que ya no existe en el tipo sin que `tsc` lo
marque, porque `uf` sigue siendo estructuralmente compatible con
`UnidadFuncional` (la propiedad extra simplemente se ignora en el
chequeo). Un test (`verificacionTerminalCriticoPorUF.aceptacion.test.ts`)
compilaba limpio con exactamente ese bug y fallaba en runtime (el override
de cota nunca se aplicaba). Se corrigió y se barrió el resto del repo con
`grep` dirigido a ese patrón (`...uf, nivel:` / `...uf, cotaHidraulicaReferencia_m:`
/ `...uf, locales:`) antes de dar la migración por cerrada -- `tsc` verde
no fue suficiente evidencia por sí solo, hizo falta correr Vitest completo.

### Estado

**D-δ.106 / UI-M1-MULTINIVEL-01 -- CERRADO, pendiente validación manual
del usuario** sobre el deploy: UF de un único nivel (¿se ve igual que
antes?), agregar un segundo nivel a una UF (casa PB/PA: cota 0,00/3,00,
un Local en cada nivel), M2 reconoce los Locales de ambos niveles con la
cota correcta, duplicar una UF de 2 niveles.

**Siguiente:** push a `main`, deploy, smoke de producción, validación
manual del usuario (arriba). Pendientes explícitos no resueltos por este
slice (ADR-0002 §4): mover un Local entre niveles, reordenar niveles.

## D-δ.107 -- FIX-M1-MULTINIVEL-BASE-LEVEL-01: nivel base permanente + copy + contraste -- CERRADO

Hotfix UX/copy sobre UI-M1-MULTINIVEL-01 (D-δ.106). Sin cambios de schema,
hidráulica ni arquitectura -- ver ADR-0002 §5 para la aclaración formal de
la regla.

- **Bug real corregido:** `CuerpoDeUnidadFuncional` ofrecía "Eliminar
  nivel" a TODOS los niveles (incluido el primero/base) apenas la UF tenía
  2+ niveles -- el `.map` no distinguía por índice. Ahora
  `niveles.map((nivel, indice) => ...)` y sólo `indice > 0` recibe
  `onEliminarNivel`. `eliminarNivelDeUnidadFuncionalEnProyecto` también se
  volvió defensiva por sí misma (no sólo la UI): pedir eliminar
  `niveles[0]?.id` es un no-op sin importar cuántos niveles adicionales
  existan.
- **Contraste de "Eliminar nivel":** en la cabecera del Nivel comparte fila
  con un input de texto (mucho más pesado visualmente que el `<h4>` junto
  al que vive "Eliminar local") -- el estilo compartido `.m1-btn-eliminar`
  (transparente hasta el hover) quedaba ahí indistinguible de texto
  deshabilitado. Se agregó un borde visible desde el reposo SÓLO dentro de
  `.m1-nivel__cabecera .m1-btn-eliminar`, sin tocar el estilo compartido en
  ningún otro contexto.
- **Responsive (hallazgo durante el propio hotfix):** el input de "Nombre
  del nivel" no tenía ancho flexible -- a su tamaño default de navegador
  desbordaba el viewport en mobile (390px) junto con la etiqueta y el
  botón. Se le dio `flex: 1 1 auto; min-width: 0` y se apiló la cabecera
  del Nivel en el breakpoint mobile ya existente (mismo criterio que
  `.m1-uf__campos`).
- **Copy corregido:** "Cota de piso de la unidad funcional [m]" -> "Cota
  de piso del nivel [m]" (ahora siempre, incluso con un único nivel); en
  `EditorDeCotaPisoDeLocal`, "hereda UF" / "hereda de la unidad funcional"
  -> "hereda nivel" / "hereda del nivel" (prop renombrada
  `cotaHeredadaDelNivel_m`).
- **Hallazgo colateral, fuera de alcance (NO corregido acá):** al validar
  el fix en mobile se encontró que la tabla de dimensionamiento de M2
  (`.m2-fila-agrupada`) desborda el viewport (390px) cuando hay
  suficientes filas Local+Red simultáneas visibles (reproducible con
  cualquier UF con volumen de contenido suficiente, sin relación con
  Niveles). Este hotfix tenía prohibido tocar M2 -- se documentó la
  violación puntual y se excluyó de un único assert de invariantes en
  `multinivel.spec.ts` (con comentario explicando por qué), sin tocar el
  harness compartido de invariantes ni el componente de M2. Candidato a
  un micro-fix de responsive de M2 futuro, independiente de este slice.
- **Hallazgo colateral no relacionado, NO corregido acá:** `FIX-RESP-02`
  (excepción de ACS por UF en M3) falla de forma reproducible e
  independiente de cualquier cambio de este hotfix (M3 no se tocó) contra
  el dev server local en mobile/mobile-angosto. Documentado para que quien
  lo audite no lo confunda con una regresión de este slice.
  **Actualización (D-δ.110 / FIX-M3-RESP-02-ACS-01):** esta observación
  y la de ".m2-fila-agrupada" de D-δ.109 eran la MISMA causa
  (`.m1-uf__acciones` de M1 sin wrap real, agravada por el header de 3
  acciones que introdujo `+ Agregar nivel` en este mismo slice) --
  ya resuelta por el fix de D-δ.109. Ver D-δ.110 para la investigación
  completa y el test que cierra la trazabilidad.
- **Tests:** +2 casos unitarios en `unidadFuncionalMultinivel.test.ts`
  (nivel base protegido con 2 niveles; con 3 niveles, eliminar el del
  medio preserva el base y dos veces protegido tras eliminar un
  adicional). `multinivel.spec.ts`: corregido el conteo de "Eliminar
  nivel" esperado (era 2, debe ser 1, con 2 niveles), +2 tests nuevos
  (nivel base permanente con 3 niveles; copy). Vitest **1768/1768**
  (1766 + 2); `tsc -b`/`e2e:typecheck`/`build` verdes; ESLint **11/0/0**
  (mismo baseline). E2E `multinivel.spec.ts` + `cotas-heredadas.spec.ts`
  **16/16 desktop+mobile** verdes contra dev server local.

### Estado

**D-δ.107 / FIX-M1-MULTINIVEL-BASE-LEVEL-01 -- CERRADO, pendiente
validación manual del usuario.**

## D-δ.108 -- UI-M1-DUPLICAR-LOCAL-01: duplicar un Local dentro del mismo Nivel -- CERRADO

Slice Nivel B/estructural acotado. Agrega `Duplicar local` en cada card de
Local de M1 (junto a `Eliminar local`), copiando el Local y sus
Artefactos dentro del MISMO Nivel, inmediatamente después del original.

### Arqueología

`Local` (`src/modelo/proyecto/index.ts`) no tiene campo `nombre` propio
-- `id`, `tipo`, `regimen?`, `cotaPiso_m?`, `artefactos`. El título visible
en M1 (`etiquetasDeLocales`, `MotorDemandaPantalla.tsx`) es 100% derivado:
cuenta Locales por `tipo` dentro del Nivel y numera sólo si hay 2+ del
mismo tipo ("Baño" vs. "Baño 1"/"Baño 2"). `duplicarUnidadFuncional.ts`
ya tenía TODO el procedimiento necesario, resuelto para D-δ.50/51 al
duplicar una UF completa: `duplicarLocal` (clonado profundo, ids nuevos
para el Local y cada Artefacto) y `redesObjetivoParaClon` (CAT-CONN-01:
Redes objetivo de cada Artefacto clonado, desde `conectividadElegida` o
la topología real del original) -- ambas privadas, con un comentario que
literalmente anticipaba este incremento ("no se exportan como
abstracción reutilizable para Locales, eso queda para cuando exista
duplicarLocal como incremento propio").

### Decisión (sin decisión roja)

Dado que (1) el nombre del Local ya es derivado y se renumera solo sin
tocar código, y (2) el procedimiento de clonado + CAT-CONN + sincronización
topológica ya existe y es directamente reutilizable, no hubo ninguna
alternativa plausible que produjera un comportamiento distinto que
ameritara plantear una decisión roja -- se exportaron `duplicarLocal` y
`redesObjetivoParaClon` de `duplicarUnidadFuncional.ts` y se reutilizaron
tal cual en el nuevo `duplicarLocalEnNivel.ts`
(`duplicarLocalEnNivelDeUnidadFuncionalEnProyecto`), aplicando el mismo
procedimiento a UN Local en vez de a todos los de una UF.

### GEOM-COTA-01 / M2

Sin código nuevo para herencia: el spread superficial de `duplicarLocal`
ya deja sin override a una copia cuyo original no lo tenía (sigue
heredando el Nivel) y copia tal cual cualquier override explícito
(`cotaPiso_m` del Local, `alturaHidraulicaSobrePiso_m` de un Artefacto).
M2: la copia nunca hereda `Tramo`, `montanteId`, tee, DN manual ni
longitud relevada del original -- sus terminales se sincronizan como
"bootstrap" (mismo camino que un Local recién creado),
`backfillLongitudesDePredimensionamiento` sólo los lleva a un valor
típico inicial.

### Regresión detectada y corregida antes de cerrar

`tests/e2e/multinivel.spec.ts` tenía `uf.getByRole('button', { name:
'Duplicar' })` (sin `exact: true`) para el botón de nivel UF -- el
nuevo "Duplicar local" matchea por substring y volvió ese selector
ambiguo (strict-mode violation de Playwright). Se detectó corriendo la
suite completa de E2E antes de cerrar (no sólo el spec nuevo) y se
corrigió con `exact: true`. Los demás Locators `page.getByRole('button',
{ name: 'Duplicar' }).first()` en otros specs no se tocaron -- siguen
resolviendo correctamente por orden del DOM (el botón de UF se declara
antes que cualquier Local en el árbol).

### Hallazgo colateral, ya documentado, NO relacionado con este slice

Al correr `multi-uf.spec.ts` completo en mobile reapareció el overflow
preexistente de la tabla de M2 (`.m2-fila-agrupada`, D-δ.107) en el test
de duplicar una UF -- mismo bug ya registrado, no introducido por este
slice (no se tocó M2).

### Tests

`duplicarLocalEnNivel.test.ts` (13 casos): duplicación simple + posición
inmediata + duplicación repetida + independencia de mutación; herencia
sin materializar defaults + overrides explícitos copiados; multinivel
(copia sólo en el Nivel del original); conectividad física de la copia
(válida, sin nodos/tramos reutilizados, sin montante/DN/longitud
heredados); recálculo de demanda (Kc indeterminado con n=1 se resuelve
al duplicar a n=2, sin hardcodear la fórmula). `tests/e2e/duplicar-local.spec.ts`
(2 casos, desktop+mobile): independencia editando/eliminando artefactos
de la copia; duplicar dentro de un segundo Nivel sin conectividad física
heredada. Vitest **1781/1781** (1768 + 13); `tsc -b`/`e2e:typecheck`/`build`
verdes; ESLint **11/0/0** (mismo baseline).

### Estado

**D-δ.108 / UI-M1-DUPLICAR-LOCAL-01 -- CERRADO, pendiente validación
manual del usuario.**

## D-δ.109 -- UI-M2-RESP-POLISH-01: jerarquía Local → Red sin nombre redundante + overflow mobile re-diagnosticado -- CERRADO

Slice Nivel C, exclusivamente UI/responsive de M2. Sin cambios de
fórmulas, demanda, simultaneidad, DN, velocidad, presión, pérdidas,
topología, montantes, reconciliación, schema, M1 (salvo la excepción
puntual autorizada, ver abajo), M3 o M4.

### Objetivo 1 -- nombre redundante del Local en filas AF/AC

`TablaDimensionamientoDeModulo2.tsx` pintaba `entrada.etiqueta` (el
nombre del Local, ej. "Baño 1") dentro del `<summary>` de CADA fila hija
AF/AC, aunque el encabezado de grupo (`.m2-fila-grupo__nombre`) ya lo
muestra una vez arriba de ambas. Cambio puramente presentacional: se
omite el render visible de `entrada.etiqueta` cuando `entrada.grupo !==
undefined`; el campo en sí no se toca (sigue alimentando el
`aria-label` de Longitud y cualquier otro consumidor -- identidad y
datos intactos, sección 5 del brief). Distribución general/secundaria y
Segmentos de montante (sin `grupo`) no cambian su render en absoluto.

### Objetivo 2 -- overflow horizontal mobile: RE-DIAGNÓSTICO

El brief partía de un diagnóstico previo (D-δ.107) que atribuía el
overflow a `.m2-fila-agrupada`. La arqueología de ESTE slice lo
desmintió con evidencia en vivo (viewport 390px):

1. `.tabla-scroll` (wrapper ya existente de la tabla de M2,
   `overflow-x: auto`) contiene correctamente el ancho de la tabla --
   medido en 374px, sin fuga, aunque la tabla interna mida 640px
   (`minWidth: 40rem`, scroll local válido).
2. Con el proyecto demo puro, navegando a Tuberías y abriendo un
   detalle de fila (sin tocar M1 en absoluto): `scrollWidth ===
   clientWidth === 390`. **M2 por sí solo no produce el overflow.**
3. El overflow real sólo aparece después de acciones de M1 multinivel
   (agregar nivel + duplicar UF) y su origen exacto, aislado
   recorriendo el árbol DOM completo, es `.m1-uf__acciones` (cabecera
   de UF: "Duplicar" / "+ Agregar nivel" / "Eliminar unidad
   funcional").

Causa técnica: `.m1-uf__acciones` ya tenía `flex-wrap: wrap` pero,
como flex item de `.m1-uf__cabecera` con `flex: none`, el navegador
sigue calculando su ancho intrínseco como si sus 3 botones entraran en
una sola línea (max-content) -- nunca llega a angostarse lo suficiente
como para que su propio wrap entre en juego.

**Decisión de alcance:** el brief pedía explícitamente no tocar M1. Se
presentó el hallazgo al usuario (evidencia + dos alternativas: extender
el alcance con un fix CSS mínimo y acotado en M1, o cerrar sólo el
objetivo 1 y dejar el overflow documentado como pendiente separado). El
usuario autorizó extender el alcance únicamente a este wrap CSS, sin
tocar lógica ni JSX de M1.

**Fix real** (`demandaM1.css`, dentro del breakpoint mobile ya
existente, mismo patrón que `.m1-uf__meta`/`.m1-uf__resumen`):

```css
.m1-uf__acciones {
  flex-wrap: wrap; /* fuera del breakpoint, siempre */
}

@media (max-width: 560px) {
  .m1-uf__acciones {
    flex-basis: 100%; /* fuerza su propia fila completa */
  }
}
```

No es un parche ciego (`overflow-x: hidden` en `body`, tolerancias
infladas, etc.): corrige la causa geométrica real y sólo aplica bajo el
breakpoint mobile ya existente.

### Verificación

Reproducido el escenario exacto que disparaba el bug (agregar segundo
nivel + duplicar UF + ver Tuberías, viewport 390px):
`scrollWidth === clientWidth === 390` tras el fix. Se removió de
`multinivel.spec.ts` el filtro `sin-overflow-horizontal` que ese test
llevaba como workaround del diagnóstico incorrecto -- ya no hace falta.

### Tests

`tests/e2e/m2-resp-polish.spec.ts` (4 casos, desktop+mobile): padre con
nombre una sola vez / hijos sin nombre repetido (Baño y Cocina, AF y
AC, aria-label de Longitud intacto); expandir/contraer sin regresión de
acordeón; reproducción exacta del escenario de overflow con aserción
geométrica (`scrollWidth - clientWidth <= 2`); fila agrupada usable en
mobile (pill, "N puntos", control expandir/contraer). Sin tests
unitarios nuevos (cambio puramente presentacional/responsive, cobertura
100% E2E para no crear tests frágiles de valores CSS exactos). Vitest
**1781/1781** (sin cambio); `tsc -b`/`e2e:typecheck`/`build` verdes;
ESLint **11/0/0** (mismo baseline). E2E dirigido **8/8**
(`m2-resp-polish.spec.ts`) + regresión **52/52**
(`multi-uf`/`multinivel`/`montantes`/`duplicar-local`/
`cotas-heredadas`/`smoke`/`propagacion-a`) desktop+mobile contra dev
server local, sin ningún workaround de overflow.

### Hallazgo NO relacionado, ya documentado (D-δ.107)

`FIX-RESP-02` (excepción de ACS por UF en M3) sigue fallando de forma
independiente contra dev server local en mobile -- no se tocó M3 en
este slice.

**Actualización (D-δ.110 / FIX-M3-RESP-02-ACS-01):** esta nota quedó
desactualizada. El fix de `.m1-uf__acciones` de esta misma sección
(arriba) YA resolvía este hallazgo -- nunca hubo una segunda causa en
M3 -- pero nadie volvió a correr el escenario compuesto para
confirmarlo antes de este slice. Ver la entrada D-δ.110 más abajo para
la investigación completa y el test que cierra la trazabilidad.

### Estado

**D-δ.109 / UI-M2-RESP-POLISH-01 -- CERRADO, pendiente validación
manual del usuario.**

## D-δ.110 — FIX-M3-RESP-02-ACS-01: cierre de trazabilidad de `FIX-RESP-02`

Investigación de causa raíz de un bug documentado como "preexistente"
en dos slices consecutivos (D-δ.107, D-δ.108): `FIX-RESP-02` (overflow
del `<select>` de excepción de ACS por UF en M3) "sigue fallando de
forma independiente contra dev server local en mobile". Sin cambios de
código de producto -- el bug ya no existía.

### Arqueología Git

`FIX-RESP-02` se resolvió originalmente en D-δ.83 (`9d87220`, `select {
max-width: 100%; min-width: 0 }` global) y su regresión dedicada
(`tests/e2e/responsive.spec.ts` → bloque `FIX-RESP-02 · M3 excepción de
ACS por UF sin overflow`) no volvió a tocarse desde entonces (`git log
--oneline -- tests/e2e/responsive.spec.ts` sólo lista los commits de
D-δ.82 y D-δ.83) y siguió pasando en cada corrida de este proyecto.
D-δ.107 y D-δ.108 documentaron, cada uno por separado, que el
escenario "seguía fallando" en observación manual -- sin repro
automatizada ni causa identificada, sólo la nota de "no tocar acá".

### Reproducción

Ejecutar el bloque `FIX-RESP-02` de `responsive.spec.ts` tal cual
existe hoy, contra el propio HEAD de este slice: **pasa** (390/360/
1280px). Ejecutarlo contra el commit `a18314f` (HEAD de D-δ.107, previo
al fix `5fc4bba` de D-δ.109) usando un build local aislado (worktree
`git worktree add` + `vite build` + servidor estático propio, para
evitar tanto producción como el bug conocido de `vite preview --base`
en Git Bash/MSYS): **falla** con `docOverflow` de 25px @ 390px y 55px
@ 360px -- el escenario mínimo del test (2 UF extra + Iniciar M3 + PH +
ACS individual) alcanza a mostrar "Eliminar unidad funcional" en el
header de cada UF, lo que ya alcanza para desbordar `.m1-uf__acciones`
en mobile (3 acciones: "Duplicar" / "+ Agregar nivel" / "Eliminar
unidad funcional").

**ESPERADO:** `docOverflow <= 1`. **ACTUAL** (contra `a18314f`): 25-55px.
**PASO EXACTO DONDE DIVERGE:** no en M3 -- el documento ya desborda
apenas se agregan 2 UF extra en M1 y se entra a mobile, antes de tocar
ningún control de M3. M3 sólo "hereda" el overflow por compartir
documento (app one-page).

### Causa raíz

Nunca fue el `<select>` de M3 -- ese bug (D-δ.83) sigue resuelto y su
CSS (`select { max-width: 100%; min-width: 0 }`) intacto. La causa real
es, de nuevo, `.m1-uf__acciones` (cabecera de UF de M1) sin wrap real
en mobile: el mismo bug que D-δ.109 encontró y corrigió bajo el
diagnóstico incorrecto ".m2-fila-agrupada" (ver la sección D-δ.109
arriba, incluido el fix `flex-wrap: wrap` + `flex-basis: 100%` en
`demandaM1.css`). Como la app es one-page (M1-M4 en el mismo
documento), cualquier overflow del header de M1 se mide como overflow
del documento sin importar qué sección esté "activa" visualmente --
por eso el mismo síntoma se registró dos veces bajo dos nombres
distintos (D-δ.107: ".m2-fila-agrupada"; D-δ.107/108, en paralelo:
"FIX-RESP-02"), y ambos correspondían a la misma causa única, ya
corregida por el fix de D-δ.109.

### Clasificación

**G — fixture/documentación obsoleta.** El producto ya estaba correcto
(desde D-δ.109); la deuda documentada en `ROADMAP.md`/
`PENDIENTES-DE-ARQUITECTURA.md` no se había reconciliado con ese fix
porque nadie volvió a cruzar los dos hallazgos.

### Contrato M3

Sin cambios ni reinterpretación. CRIT-A34 (alcance de medidores por
PH/ACS individual/central), Table 6, `hfMedidor = 0.036 *
(Qcl_lpm/C_m3h)^2`, K=1 del medidor individual y la integración M3→M2
(`Presidual = Pdisponible - Δz - hfDistribuida - hfLocalizada -
hfMedidor - hfEquipoACS`) no se tocaron.

### Fix

Ninguno de producto. Se agregó un test de regresión en
`tests/e2e/m2-resp-polish.spec.ts` ("nivel + UF duplicada + excepción
de ACS en Medidores (FIX-RESP-02 compuesto): sin overflow horizontal
de página") que reproduce el escenario COMPUESTO exacto -- nivel +
duplicar UF (dispara el header de 3 acciones) navegando hasta la
excepción de ACS de M3 -- para dejar la trazabilidad cerrada de punta
a punta y no depender de que alguien vuelva a cruzar a mano los dos
hallazgos. Verificado por bisección real: falla contra `a18314f` (25px
de overflow, mismo escenario) y pasa contra el HEAD de este slice.

### FIX-RESP-02 histórico

Confirmado verde, sin skip/fixme/workaround: `tests/e2e/responsive.spec.ts`
→ bloque `FIX-RESP-02` sigue intacto y en verde (3/3 assertions en
390/360/1280px), tal como desde D-δ.83.

### Tests

+1 caso E2E (`m2-resp-polish.spec.ts`). Sin tests unitarios nuevos (la
causa es puramente responsive/E2E, sin dominio ni estado involucrado).
Vitest **1781/1781** (sin cambio); `tsc -b`/`e2e:typecheck`/`build`
verdes; ESLint **11/0/0** (mismo baseline). E2E dirigido **42/42**
(`responsive.spec.ts` + `m2-resp-polish.spec.ts` + `multinivel.spec.ts`
+ `montantes.spec.ts`) desktop+mobile contra build local, sin ningún
workaround de overflow.

### Riesgo

**Nivel B** — cierre puramente test/documental, sin cambio de alcance
hidráulico, integración transversal ni reconciliación estructural.

### Estado

**D-δ.110 / FIX-M3-RESP-02-ACS-01 -- CERRADO.**

## D-δ.111 — UI-M2-MONTANTE-COMPACT-01: compactación del editor de Montantes

Slice UI/responsive (Nivel C). Objetivo: reducir la altura vertical del
cuerpo expandido de cada Montante sin cambiar motor, schema, topología,
reconciliación ni cálculo.

### Arqueología

`ConstructorDeMontantes.tsx` / `constructorDeMontantes.css`
(`MontanteCardCuerpo`): el cuerpo combinaba Nombre + "Borrar montante" en
una sola fila (`.montante-card__editar`), seguido de "Locales
alimentados" (+ `AgregarLocal`) y "Segmentos"
(`TablaDimensionamientoDeModulo2`, componente COMPARTIDO con
Distribución general/secundaria y las secciones de UF -- no se tocó). Los
gaps venían principalmente de: `h4` de cada sección con margin-top
redundante (`--esp-sm`) sumado al `gap` del contenedor flex del cuerpo
(doble espaciado), y la acción destructiva compitiendo visualmente con
Nombre en la misma fila. La tabla de Segmentos ya usaba scroll horizontal
LOCAL correcto (`.tabla-scroll { overflow-x: auto }`) -- confirmado con
el E2E ya existente "la card de montante no desborda la página en
viewports angostos"; no había overflow de documento que corregir ahí.

### Cambio visual

**Antes:** Nombre + Borrar montante (misma fila) → Locales alimentados →
Segmentos → Derivaciones. **Después:** Nombre (sección propia) → Locales
alimentados (+ Agregar local, sin prefijo "+") → Segmentos →
Derivaciones → **Eliminar montante** (renombrado, al final del cuerpo,
separado por un borde sutil tipo "zona de peligro"). El header
(nombre/pill de red/resumen/toggle) no se tocó.

### Densidad

`h4` de cada `.montante-card__seccion` pasa de `margin: var(--esp-sm) 0
var(--esp-xs)` a `margin: 0 0 var(--esp-xs)` (el espaciado entre bloques
ya lo da el `gap: var(--esp-sm)` del `.montante-card__cuerpo` -- tenerlo
en ambos lados duplicaba el espacio). La regla de `h4` de Derivaciones,
que duplicaba exactamente la misma declaración con el mismo problema, se
eliminó (ya hereda de `.montante-card__seccion h4` -- la sección de
Derivaciones lleva esa misma clase).

### Eliminar montante

Renombrado desde "Borrar montante" -- consistencia con "Eliminar
nivel"/"Eliminar local"/"Eliminar unidad funcional"/"Eliminar artefacto"
de M1 (clase `m1-btn-eliminar`, `demandaM1.css`). Estilo de hover de
error (`--color-error-suave`/`--color-error-borde`/`--color-error`)
duplicado localmente en `constructorDeMontantes.css` en vez de importar
CSS entre módulos por dos reglas. Posición: último hijo del cuerpo,
después de Segmentos/Derivaciones/aviso, en su propia fila con
`border-top` sutil -- sigue siendo `.ui-btn--fantasma`, no un botón rojo
dominante. Comportamiento (`borrarMontante` de `reconciliarMontante.ts`)
sin cambios.

### Segmentos mobile

Investigado sin encontrar bug real (ver Arqueología): `.tabla-scroll` ya
contiene el overflow horizontal localmente. No se aplicó ninguna de las
estrategias B/C (grid responsive / cards por segmento) porque la
estrategia A (tabla + wrapper local) ya funcionaba correctamente. No se
tocó el componente compartido `TablaDimensionamientoDeModulo2`.

### Funcionalidad

Sin cambios: `agregarLocalAMontante`, `quitarLocalDeMontante`,
`borrarMontante`, `conNombreDeMontante`, `montantesDelProyecto.ts` --
mismas firmas, mismos call-sites, sólo reordenados/renombrados en JSX.

### Hidráulica

Sin cambios. Ningún resultado de Qc/DN/V/hf/presión se ve afectado;
reordenar visualmente el cuerpo del Montante no dispara `onCambiar`.

### Harness de fuzz

`tests/e2e/qa/acciones.ts`: la acción `borrarMontante` buscaba el botón
por el texto "Borrar montante" -- actualizada a "Eliminar montante" (si
no, hubiera quedado permanentemente no-aplicable, sin que ningún test
lo detectara automáticamente hasta la próxima corrida de fuzz).

### Tests

+3 unitarios (`ConstructorDeMontantes.componente.test.ts`, describe
`UI-M2-MONTANTE-COMPACT-01`): copy "Eliminar montante" (no "Borrar
montante"); orden Nombre → Locales alimentados → Segmentos → Eliminar
montante; selector de Local sin prefijo "+" (con el aria-label intacto
para E2E/fuzz). +2 E2E (`montantes.spec.ts`, mismo describe): header
intacto (nombre/pill/resumen/`aria-expanded`) + orden real en el DOM
(`Nombre` → `.montante-card__seccion h4` → `.montante-card__pie` como
último hijo directo del cuerpo) + Segmentos visibles + sin overflow de
documento @ 390px; eliminar el montante desde el botón reposicionado
sigue funcionando igual. Ambos E2E corridos desktop+mobile. Vitest
**1784/1784** (1781 + 3); `tsc -b`/`e2e:typecheck`/`build` verdes; ESLint
**11/0/0** (mismo baseline). E2E dirigido **52/52**
(`montantes`/`m2-resp-polish`/`multinivel`/`responsive`/
`propagacion-a`/`smoke`) desktop+mobile contra build local. Sin fuzz
cloud Nivel A (no se tocó motor).

### Responsive

Verificado a 390px/360px/1280px: sin overflow de documento, header
envuelve con elegancia, Nombre/Locales/Segmentos/Eliminar legibles en
mobile.

### Riesgo

**Nivel C** — UI/responsive puro, sin cambio de dominio, cálculo ni
reconciliación.

### Estado

**D-δ.111 / UI-M2-MONTANTE-COMPACT-01 -- CERRADO, pendiente validación
manual del usuario.**

## D-δ.112 / D-δ.113 — cierre de HYD-EST-01: intento path-aware rechazado, resuelto con la plantilla histórica + Vref corregida

Cierra la dependencia `HYD-EST-01 BLOQUEADO-POR M2-TOPO-01` registrada en
D-δ.90 (más arriba en este documento) -- con un resultado DISTINTO al que
D-δ.90 anticipaba.

**D-δ.112 (intento, luego corregido):** con la topología de M2-TOPO-01 ya
disponible, se implementó un modelo **path-aware** para `Estimadas`: cada
terminal recorre su camino real, aplica una singularidad de tee (K=3,00,
sin clasificar recta/lateral -- D-δ.40 seguía firme) en cada bifurcación
1→2 real que atraviesa, y una singularidad terminal propia (K=1,35) con
la V de su propio tramo alimentador. Una derivación 1→N sin tee explícita
declarada quedaba `Incompleto` (`derivacionMultipleNoModelada`).

**Por qué se rechazó:** la validación manual del usuario mostró que un
Baño normal de 4 artefactos (el caso más común del dominio, con una sola
tee 1→4 sin modelar explícitamente) quedaba permanentemente `Incompleto`
en `Estimadas`. Esto invertía el propósito del modo estimado -- una
simplificación para cuando el usuario NO releva la disposición física --
exigiéndole exactamente esa disposición física para poder calcular algo.

**D-δ.113 (FIX-HYD-EST-SIMPLIFIED-01, decisión final del usuario):**
`Estimadas` vuelve a ser la plantilla **agregada por (Local, red)** de
D-δ.40/D-δ.45 sin ningún cambio de cardinalidad ni de coeficiente (`n−1`
tees K=3,00, una singularidad terminal K=1,35, una llave de paso K=9,18).
El diagnóstico real del bug histórico que motivó todo este slice (D-δ.87
en adelante, ver validación manual con DN 125 y V≈0 pero hf localizada
clavada) NUNCA fue la plantilla en sí: fue que `V_ref` se tomaba del
máximo entre los tramos que alimentan DIRECTAMENTE cada terminal físico
(ramales profundos, con su propio DN independiente en granularidad
`profesional`), en vez de la velocidad del Tramo REPRESENTATIVO de ese
Local+red -- la misma fila que el usuario ve y edita en Módulo 2
(`identificarTramosRepresentativosDeLocales`, D-δ.44). Corregir sólo esa
fuente de velocidad (reutilizando el mismo primitivo ya productivo, sin
inventar topología ni cambiar el modelo) resuelve el bug real sin
sacrificar el fan-out 1→N como caso calculable.

**Estado final:** `HYD-EST-01`/`M2-TOPO-01` para efectos de este eje
quedan **CERRADOS** con el modelo de D-δ.113. El rediseño path-aware
completo (tee recta/lateral 1,62/1,00, transición de DN +0,75, válvula de
rama 0,17) que D-δ.90 había diferido a M2-TOPO-01 sigue **sin
implementarse** -- no se reabre por este cierre; si en el futuro se
quiere ese nivel de detalle en `Estimadas`, es una decisión de producto
nueva, no una continuación automática de este slice.

## Regla — `resguardo-documentacion/` es inmutable

Los directorios bajo `resguardo-documentacion/<AAAA-MM-DD>_<hito>/` son
**fotografías documentales históricas e inmutables**. No se editan, no se
actualizan, no se corrigen ni se sincronizan con la documentación activa,
aunque cambie el `ROADMAP`, la arquitectura, los criterios o la UI, o se
descubra que un documento quedó obsoleto. Cada carpeta preserva las
rutas relativas originales bajo `origen/` y un `MANIFEST-SHA256.txt` para
verificar integridad.

Si se necesita una nueva fotografía, se crea **otra** carpeta de snapshot
(`resguardo-documentacion/<nueva-fecha>_<hito>/`); nunca se sincronizan
hacia atrás las anteriores.

Primer snapshot: `resguardo-documentacion/2026-09-08_pre-UI-01B/` (estado
documental del core M1–M4 congelado + auditoría transversal D-δ.70 +
UI-01A D-δ.72, previo a UI-01B).
