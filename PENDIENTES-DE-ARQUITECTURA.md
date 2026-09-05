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

### D-δ.35 — Dónde vive el medidor en la topología — ABIERTA

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
