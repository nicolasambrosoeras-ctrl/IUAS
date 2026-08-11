# Pendientes de arquitectura

Registro de decisiones de diseño postergadas a propósito, con la razón de
la postergación y la condición que debe cumplirse antes de resolverlas.

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

**Estado**: pendiente a resolver antes de implementar el futuro módulo
de Medidores. No se resuelve todavía.

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

**`qc_lps`/`diMinimo_mm` dejan de descartarse en la capa comercial:**
`resolverDiametroComercialDeTramo` ya calculaba internamente
`ResultadoHidraulicoDeTramo` (con `qc_lps` y `di_min_mm`) para llegar al
candidato comercial, pero no los exponía. Se amplían sus tres variantes
(`sinDemanda`/`conCandidato`/`sinCandidatoSuficiente`) para propagarlos
-- sin ninguna llamada adicional al motor de demanda -- de modo que N3 (y
cualquier consumidor futuro) no tenga que volver a invocar
`resolverHidraulicaDeTramo` solo para conocer el `Qc` ya resuelto.

**Reutilización de velocidad:** `velocidadReal_mps` se reutiliza tal
cual la devuelve `resolverDiametroComercialDeTramo` (calculada una única
vez con `Qc`+`Di` efectivo) para alimentar `calcularNumeroReynolds` en
la rama Darcy -- nunca se vuelve a llamar `calcularVelocidad`.

**Resultados de dominio explícitos, nunca `throw` ni valores inventados:**

- `sinLongitud`: `Tramo.longitud_m` ausente (opcional a propósito,
  D-δ.22/CRIT-A20) con candidato comercial ya resuelto -- se preserva
  toda la información comercial ya válida (`qc_lps`, `diMinimo_mm`,
  `candidato`, `velocidadReal_mps`, `verificacionVelocidad`), sin asumir
  `longitud=0` ni derivarla de `Δz`.
- `sinCandidatoSuficiente`: propagado tal cual desde la capa comercial,
  sin calcular pérdida con un diámetro insuficiente.
- `fueraDeDominioTurbulento` (exclusivo de la rama Darcy): `Re` se
  calcula y se verifica contra `UMBRAL_REYNOLDS_TURBULENTO` (constante ya
  exportada, nunca rehardcodeada) **antes** de llamar a
  `calcularFactorFriccionDarcy`, evitando depender de capturar su
  `throw`. No se implementa régimen laminar/transicional ni Colebrook.
- **Velocidad no admisible (CRIT-A19) NO bloquea el cálculo de `hf`**:
  el resultado físico de pérdida distribuida es independiente de que el
  diseño resultante sea aceptable por velocidad -- son dos verificaciones
  distintas, y `verificacionVelocidad` se preserva sin cambios en el
  resultado.

**Hazen y Darcy permanecen separados:** el resultado usa un campo
`detalle` anidado, discriminado por `metodo`, para no mezclar campos de
un método en el otro (`coeficienteC`/`perdidaUnitaria_J_m_m` solo en
Hazen; `rugosidadAbsoluta_mm`/`temperaturaReferencia_C`/
`viscosidadCinematica_m2s`/`reynolds`/`factorFriccion` solo en Darcy).
Hazen-Williams no conoce `ν` ni temperatura del agua.

No se cierra aquí: orquestación de UI/memoria de cálculo, accesorios,
pérdidas localizadas, ni presión residual.
