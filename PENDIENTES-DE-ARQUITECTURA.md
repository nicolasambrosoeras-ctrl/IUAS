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
