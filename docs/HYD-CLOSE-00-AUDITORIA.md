# HYD-CLOSE-00 — Auditoría hidráulica pre-beta

Investigación pura (sin cambios de motor/UI/schema/PERSIST). Base:
`HEAD == origin/main == 2dbe36e`, tree limpio al iniciar. Todas las citas
de código están verificadas contra el working tree en ese commit.

## 1. Veredicto ejecutivo

**MOTOR CERRABLE CON 1 AJUSTE.**

El motor hidráulico está, en la enorme mayoría de sus piezas, más cerrado
de lo que la premisa de este slice asumía. En particular, **tee 1→2 en
Detallado ya está completamente implementado** (CRIT-A31, con Ks reales
de Tabla N°7 ERAS-2023 y UI dedicada) y **el fan-out 1→N ya se maneja
correctamente como incompletitud explícita**, nunca como cero silencioso
(M2-TOPO-E/D-δ.96) — ambos puntos que el brief de este slice presentaba
como pendientes obligatorios resultaron ser, con evidencia de código y
tests, capítulos ya cerrados.

Se encontró exactamente **un hallazgo H0**: `hfEquipoACS` está
deliberadamente excluido del balance de presión (decisión correcta,
D-δ.15, ERAS no publica fórmula) — pero **la exclusión sólo se advierte
en el PDF de memoria de cálculo, nunca en el panel interactivo de
Módulo 2** donde el usuario ve "Completo"/"Cumple". Un usuario que nunca
exporta el PDF no tiene ninguna señal de que ese término falta. Es un
ajuste de UI pequeño y acotado (agregar el mismo texto que ya existe en
el PDF), no una fórmula nueva.

No se encontraron H1 (deuda metodológica importante sin reconocer). Los
demás hallazgos son H2 (limitaciones ya declaradas correctamente) o H3
(criterios IUAS nuevos, explícitamente fuera de alcance, correctamente
etiquetados como post-beta) — más dos notas de higiene documental sin
impacto funcional.

## 2. Qué está definitivamente cerrado

Confirmado con evidencia de código/tests, sin contradicción encontrada,
para toda la lista de la sección 3 del brief (M2 CRIT-A15/A20/A24/A29/
A30/A31, terminal crítico por margen, DN manual, CRIT-A15 reconciliación;
M3 Tabla 6/fórmula medidor/individual K=1/CRIT-A34/M3→M2/adopción
manual; M4 CRIT-A35/A37/A38/A39/Tabla 1/M4→M2). Además:

- **CRIT-A31 (tees 1→2 en Detallado): CERRADO.** Ver §3.
- **M2-TOPO-E / `derivacionMultipleNoModelada` (fan-out 1→N): CERRADO**
  como comportamiento correcto (incompletitud explícita). Ver §4.
- **D-δ.40/D-δ.45 (Estimated agregado por Local+red): CERRADO.** Ver §5.
- **Pmin per-artefacto: CERRADO** (ya lee `presionMinima_kgcm2` del
  catálogo ERAS-2023 por artefacto, nunca un valor genérico). Ver §12.
- **CRIT-A35 (reserva/déficit): CERRADO**, con fórmula y ventana Tc 1–4h
  tomadas directamente del texto normativo. Ver §12.
- **Terminal crítico / `candidatoProvisional`: implementación correcta,
  sin deuda funcional.** Ver §7.

## 3. Tee 1→2 — Detailed

**Estado: CERRADO.** No es un pendiente — está completamente
implementado desde CRIT-A31 (D-δ.33), con dos slices de UI posteriores
(M2-TOPO-D/D-δ.95, M2-TOPO-E/D-δ.96).

- **Representación:** `Nodo.tee?: ConfiguracionDeTee`
  (`src/modelo/redHidraulica/index.ts`), singularidad del **Nodo** de
  bifurcación (nunca del `Tramo`), con dos formas: `{tipo:
  'entradaPorExtremo', tramoSalidaRectaId}` / `{tipo: 'entradaCentral'}`.
  No persiste Ks, coordenadas ni orientación gráfica.
- **Fuente normativa de los Ks:** ERAS-2023 §2.12.1, Tabla N°7
  (`CRITERIOS.md`, CRIT-A26/CRIT-A31) — transcripción literal, **no hay
  interpretación IUAS en los valores**: `teePasoRecto=1,00`,
  `teeSalidaLateral=1,62`, `teeEntradaCentralSalidasLaterales=3,00`. No
  se investigó ni se necesitó bibliografía externa (Crane/Idelchik/
  ASHRAE no aparecen citados para tee en el repo).
- **Clasificación:** `resolverClasificacionDeTee(redHidraulica, nodoId,
  tramoSalienteId)` (`motor/tuberias/topologia/`), puro, deriva
  `'clasificado' | 'sinConfigurar' | 'derivacionMultipleNoModelada' |
  'noEsBifurcacionDeTee'` desde `Nodo.tee` + conectividad real — nunca
  infiere orientación de ids/orden.
- **Integración con el cálculo:** `acumularPerdidaLocalizadaDeCamino.ts`
  consulta el resolver anterior y suma `Js_tee = Ks·V²/2g` (V = velocidad
  real del tramo saliente) al `hf_m` de cada Tramo del camino. Si la tee
  está `sinConfigurar`, el Tramo queda no resuelto (`'teeSinConfigurar'`)
  y el camino es `'incompleta'` — nunca 0 silencioso.
- **UI:** `TeeDeNodoEditor.tsx` (144 líneas, componente dedicado) está
  wireado en `ConstructorDeMontantes.tsx` — el usuario elige tipo de
  entrada y, si aplica, cuál salida es la recta, sin ids técnicos
  visibles.
- **Cobertura:** con tees resueltas, el subconjunto representable sobre
  `RedHidraulica` cubre **toda** Tabla N°7 (griferías excluida
  deliberadamente del balance por CRIT-A29, no es un vacío). Por eso
  `resolverPresionResidualDeCamino` puede devolver `{tipo:'completa'}`
  genuinamente para un camino con tees relevadas.
- **Tests:** `resolverClasificacionDeTee.test.ts`,
  `acumularPerdidaLocalizadaDeCamino.test.ts` (685 líneas, incluye tee
  `entradaPorExtremo`/`entradaCentral`/sin configurar),
  `montanteTees.integracion.test.ts` (end-to-end con montantes).

**Respuestas a las preguntas obligatorias del brief:**
- **A/B (qué falta / qué inputs hay):** nada falta para 1→2 — inputs
  existentes (tipo de entrada + salida recta si aplica), Ks tomados
  directo de Tabla N°7, velocidad real ya calculada por la capa
  comercial.
- **C (¿la fuente define K?):** sí, ERAS-2023 Tabla N°7 lo define
  completo para 1→2 (3 variantes), sin necesidad de fuente externa.
- **D (¿Detailed correcto sin tee?):** la pregunta no aplica — Detailed
  SÍ tiene tee desde CRIT-A31.

## 4. Fan-out 1→N — Detailed

**Estado: CERRADO como comportamiento H2 correctamente implementado.**
No se modela la geometría física de una derivación ≥3 salidas (ordenar
las ramas, cuál es recta, piezas reales, longitudes de nodos
intermedios ficticios exigiría elegir entre configuraciones físicas no
equivalentes que el modelo no tiene datos para fijar) — decisión
correcta de no inventar geometría.

Lo importante: **hubo un bug real de "falso completo"** antes de
M2-TOPO-E (D-δ.96) — un nodo 1→N contribuía 0 a la pérdida localizada
sin marcar incompletitud, y el balance podía figurar "completo" pese a
la singularidad no modelada. Se corrigió: `resolverClasificacionDeTee`
distingue `derivacionMultipleNoModelada` (depende sólo de la topología
real, nunca de `montanteId`), `acumularPerdidaLocalizadaDeCamino` marca
el Tramo no resuelto por ese motivo, y el camino Detallado queda
**explícitamente incompleto**. Test de regresión dedicado
(`acumularPerdidaLocalizadaDeCamino.test.ts`, con comentario explícito
"antes de M2-TOPO-E este caso devolvía... un falso completo").

**Recomendación de la auditoría (respondiendo §6 del brief): opción A**
— mantener Detailed incompleto con mensaje explícito. **Ya es la opción
implementada.** No hace falta ampliar el modelo antes de beta: la UI
(`ConstructorDeMontantes.tsx`) explica la limitación en texto plano al
usuario, sin editor engañoso.

## 5. Accesorios Estimated por Local

**Estado: CERRADO.** Composición `Ktotal = max(0,n-1)·3,00 + 1·1,35 +
1·9,18` (`resolverPerdidaLocalizadaEstimadaDeLocal.ts`), por `(Local,
Red)`.

- **K=3,00** — `teeEntradaCentralSalidasLaterales` (Tabla N°7, el mayor
  de las 3 variantes de tee): adopción conservadora IUAS ante geometría
  no relevada (D-δ.40).
- **K=1,35** — `codo90` (Tabla N°7): la "singularidad terminal" **no es**
  la conexión/mezcladora del artefacto (eso es `griferias`, excluida del
  balance por CRIT-A29) — es un accesorio genérico de cambio de
  dirección, elegido explícitamente por decisión roja del usuario (D-δ.45)
  entre `curva90`(0,81)/`codo90`(1,35)/`tuboSaliente`(1,00), por ser la
  opción más conservadora.
- **K=9,18** — `llaveDePaso` (Tabla N°7): también decisión roja D-δ.45 —
  incluirla automáticamente, 1 por Local+red (nunca por terminal), pese
  a duplicar la hf estimada en el ejemplo evaluado (+102%).
- **Objetivo del método (pregunta central §7.D del brief):** la
  documentación es explícita — es una **pérdida equivalente
  conservadora**, deliberadamente NO una reconstrucción de accesorios
  físicos probables. Cita literal (D-δ.40): *"modo estándar simplifica
  el relevamiento, no inventa infraestructura con falsa precisión"*.
- **Accesorios NO incluidos** (codos adicionales, curvas 45º, uniones,
  válvula esclusa, reducciones): excluidos a propósito — "su cantidad
  depende del recorrido físico real... sin ninguna base topológica para
  inferirla; incluirlos sería fabricar geometría no relevada" (mismo
  principio que rechazó D-δ.40 para el alcance actual).
- **¿Por Local o por terminal? (§9 del brief):** ya evaluado y decidido.
  Un intento de convertir el modelo a "por terminal" (path-aware,
  D-δ.112/HYD-EST-01) fue **implementado y luego revertido** tras
  validación manual del usuario: volvía `Incompleto` un Baño normal de 4
  artefactos (el caso más común del dominio), invirtiendo el propósito
  del modo estimado. La llave "1 por terminal" también fue evaluada y
  descartada explícitamente en D-δ.45. El modelo vigente es
  deliberadamente agregado por Local+red, no por terminal.
- **Sensibilidad (§10 del brief):** no hace falta un ejercicio adicional
  — ya está cuantificada en la propia documentación D-δ.45 (agregar la
  llave de paso duplica +102% la hf en el ejemplo de 4 terminales), y el
  propio equipo ya usó esa cifra para decidir con el usuario.

**No hay deuda real aquí.** Es una decisión de producto cerrada, con dos
decisiones rojas ya resueltas por el usuario y documentadas con su
razonamiento completo.

## 6. hfEquipoACS

**Estado: H0 — ver §1 y clasificación en §16.**

- `resolverBalanceDePresion.ts` **no tiene** `hfEquipoACS` en su firma —
  exclusión deliberada, D-δ.15 sigue sin fórmula normativa vigente en
  ERAS-2023 (no se inventa una).
- **No existe modelo de datos de equipo ACS** (sin tipos
  calefón/termotanque/caldera/central, sin campo de pérdida manual). El
  tipo `hfEquipoACS_mca` en `resolverDatosDeInforme.ts` está tipado
  literalmente `undefined` — imposible que el resolver le asigne otra
  cosa.
- **REPORT (PDF) sí lo declara**, con nota fija: *"hfEquipoACS no
  participa de este balance: todavía no tiene fórmula normativa vigente
  (D-δ.15)."* — confirmado por test dedicado.
- **El panel interactivo de M2 NO lo declara.** Verificado directamente:
  cero menciones a "ACS"/"equipo" en `PanelDePresionDeModulo2.tsx`,
  `TarjetaDeTerminal.tsx` ni `CalculoDelCriticoDetalle.tsx` (el
  desglose de fórmula por terminal). Un usuario que trabaja
  interactivamente y nunca exporta el PDF ve "Completo"/"Cumple" sin
  ninguna señal de que la pérdida del calefón/termotanque está afuera.

**¿Es deuda del método actual o responsabilidad no generalizable?**
Ambas cosas a la vez, y por eso la clasificación no es "faltar una
fórmula" sino "faltar una advertencia": ERAS-2023 no publica metodología
para `hfEquipoACS` (genuinamente no generalizable sin dato de
fabricante), así que la AUSENCIA de fórmula es correcta y no se puede
resolver inventando una. Pero la práctica profesional exige que el
usuario sepa, en el momento en que decide si el sistema "Cumple", que
ese término no está contado — y hoy sólo lo sabe si genera el PDF.

## 7. Terminal crítico

**Estado: sin deuda funcional real.** El hallazgo de la era VIS-TOPO
(que `candidatoProvisional` podría reflejar una deuda de `hfMedidor`) es
una **interpretación incidental incorrecta** para el estado actual del
repo — quedó desactualizada por el cierre de M3 (D-δ.58/59, M3-E/M3-F).

- `resolverTerminalMasDesfavorable` devuelve `'determinado'` sólo si
  TODOS los candidatos resolvieron `'balanceCompleto'`;
  `'candidatoProvisional'` si hay al menos uno excluido junto con al
  menos un completo; `'sinCandidatoDeterminable'` si ninguno cerró.
- En el camino que alimenta `resolverEstadoModulo2` (el que consume
  REPORT), `'candidatoProvisional'` es **estructuralmente inalcanzable
  por diseño** (con un `throw` explícito si ocurriera) — `estado:
  'completo'` implica siempre `'determinado'`. El texto de
  "candidatoProvisional" sólo existe en el panel interactivo en vivo
  (`PanelDePresionDeModulo2.tsx`), que sí evalúa candidatos sin
  prefiltrar — comportamiento correcto y a propósito (D-δ.42, con su
  propio bug de prefiltrado corregido en su momento).
- `hfMedidorDeTerminal` (`resolverEntradasDeVerificacion.ts`) **sí**
  conecta `estadoModulo3` (M3) a M2 hoy — confirmado con código. M3 está
  cerrado (D-δ.59) y alimenta `hfMedidor_mca` real por terminal.
- **Hallazgo de higiene documental (no funcional):** dos comentarios de
  código — `resolverTerminalMasDesfavorable.ts:25-32` y
  `resolverPresionResidualDeCamino.ts:15-28` — siguen afirmando que
  `hfMedidor` es "siempre `undefined`" y que `'balanceCompleto'` es
  "estructuralmente inalcanzable... mientras D-delta.35 siga abierta".
  Eso describía el estado previo a M3; hoy es incorrecto (el propio
  test de integración de `resolverTerminalMasDesfavorable.test.ts`
  ejercita el caso con `hfMedidor_mca` provisto llegando a
  `'balanceCompleto'`/`'determinado'`, y el baseline transversal
  M1-M4 alcanza un margen numérico real). Recomendado corregir el
  comentario junto con cualquier próximo cambio en esos dos archivos —
  no amerita un slice propio.

## 8. M1

**Sin deuda real relevante.** Único hallazgo: una nota huérfana —
`calcularSimultaneidad.ts` propaga *"K hereda el estado indeterminado de
Kc (D25); A3 queda pendiente"* cuando `n=1`. No se encontró ninguna
entrada en ROADMAP.md/PENDIENTES-DE-ARQUITECTURA.md que documente qué es
"A3" (no es lo mismo que `CRIT-A3`, ya firme, sobre otro tema). Bajo
impacto: el estado indeterminado ya se presenta de forma legible al
usuario ("Indeterminado — ...") vía `desarrolloDelCalculoDemanda.ts`, y
`n=0`/negativo/fraccionario ya lanzan explícitamente. Clasificado H3
(nota de investigación futura sin trazabilidad, no deuda confirmada) —
recomendado aclarar o retirar la referencia "A3" la próxima vez que se
toque ese archivo.

## 9. M2

Ver §3-7 arriba (tee, fan-out, Estimated, hfEquipoACS, terminal
crítico). Búsqueda adicional de `?? 0`/`|| 0` en `motor/tuberias` y
`interfaz/paginas` de M2 (excluyendo tests): **ningún** fallback a cero
sobre `hfLocalizada`, `hfMedidor`, `hfDistribuida`, `presionResidual`,
`presionMinima`, `Δz`, `Pdisponible`, `Qc` ni `VReserva` — todos esos
términos usan uniones discriminadas (`number | undefined` o tipos
`'completa'|'estimada'|'parcial'|'ausente'`) que impiden el patrón. Los
pocos `?? 0`/`|| 0` encontrados son contadores de UI/profiling o casos
donde 0 es un valor real por diseño (ver detalle en el hallazgo del
agente, incorporado a esta auditoría). Sin NaN oculto ni `catch` que
silencie un error hidráulico — los `catch` encontrados exponen el error
explícitamente o deshabilitan un control, nunca fabrican un resultado.

## 10. M3

**CERRADO**, con deuda menor ya autorregistrada por el equipo al cerrar
M3-F (D-δ.59), ninguna bloqueante: sin extrapolación de Tabla N°8 más
allá de 40 m³/h (`fueraDeTabla06`/incompleto, correcto); sin
verificación metrológica Q1-Q4 (ERAS no publica esos datos — límite
normativo, no bug); poda de overrides de medidor huérfanos en un caso
de round-trip específico (refinamiento UX); panel M3 en estado
`incompleto` no lista los medidores `parcial` que M2 sí consume (UX
menor). El bug de presentación FIX-LEAK-01 (código crudo en vez de
mensaje humano) ya fue cerrado (D-δ.85).

## 11. M4

**CERRADO**, con deuda menor autorregistrada al cerrar M4-H (D-δ.69),
ninguna bloqueante: `desnivelConexion_m` sigue siendo dato declarado, sin
auto-derivación geométrica; obligatoriedad de reserva por §2.8
independiente del déficit no automatizada (copy prudente en su lugar);
secciones iguales de tanques ≥4.000 L (§2.11) no implementadas; sin
catálogo comercial de redondeo de capacidad. Ninguna contradice
CRIT-A35/A37/A38/A39 ni las fórmulas cerradas.

## 12. Nuevos criterios IUAS diferidos

### Pmin

Ya es **per-artefacto** desde el catálogo ERAS-2023
(`presionMinima_kgcm2`, valores entre 0,3 y 1,5 kg/cm² según artefacto,
`null` para 2 artefactos sin dato publicado por ERAS —
`maquinaLavavajillas`/`piletaDeCocinaIndustrial`, tratados como
"terminal fuera de alcance", nunca Pmin=0 ni excluidos silenciosamente).
No hay Pmin genérico que pueda ocultar un cumplimiento real. "Pmin
alternativos" aparece consistentemente en ROADMAP/PENDIENTES bajo el
encabezado explícito **"Fuera de alcance (confirmado, no
implementado)"**, en el contexto de D-δ.15 (composición Pmin del
calentador + Pmin del terminal para equipos ACS) — no una revisión de
los valores ya cargados. **H3, correctamente clasificado como
post-beta ya en la documentación existente.**

### Reserva/autonomía

CRIT-A35 (`Dc=max(0,Qc-Qconn)`, `VReserva=Dc·3,6·Tc`, `1≤Tc≤4`) viene
**directo del texto normativo** ERAS-2023 §2.10.2 ("el proyectista
deberá analizar el período de consumo, con un mínimo de 1 hora a un
máximo de 4"). El propio motor (`calcularReservaDiaria.ts`) documenta
por qué **rechaza** dotación/población/24h, citando la norma: *"la
dotación... de §2.9.1.1 es consumo de conjunto urbano, no reserva
domiciliaria"*. Un criterio "12h/24h/dotación" no sería una corrección
al método actual — **contradiría el texto normativo que CRIT-A35 ya
transcribe**. **H3**, y de hecho un H3 con una barra más alta que la
típica: cualquier futuro criterio alternativo deberá justificar
explícitamente por qué se aparta de la lectura normativa vigente, no
sólo declararse como mejora.

## 13. Riesgo de falsos "Completo"

Auditado específicamente para los 4 puntos que pedía el brief:

- **Tee:** no aplica — Detailed calcula tee real cuando está configurada
  y corta con `'incompleta'` cuando no (§3).
- **hfEquipoACS:** **SÍ hay un camino donde el software muestra
  "Completo"/"Cumple" ocultando una pérdida físicamente relevante** —
  cualquier terminal servido por un calefón/termotanque, en el panel
  interactivo (§6). Es el hallazgo central de esta auditoría.
- **Accesorios Estimated:** no aplica — es una metodología alternativa
  íntegra en sí misma (nunca "parcial"), documentada como conservadora,
  no como reconstrucción — no hay expectativa incumplida que ocultar.
- **Fan-out Detailed:** corregido — hubo un bug real de falso "completo"
  antes de M2-TOPO-E/D-δ.96, ya cerrado con test de regresión dedicado
  (§4). Vale como antecedente: el motor tuvo exactamente esta clase de
  bug una vez, y el patrón de corrección (nunca 0 silencioso, siempre
  incompletitud explícita) es el que falta aplicar también a la UI
  interactiva para hfEquipoACS.

## 14. Defaults/fallbacks a cero

Ver §9. Búsqueda de `?? 0`/`|| 0` en el pipeline de presión de M2: sin
hallazgos de riesgo. Los términos hidráulicos del balance usan tipos
discriminados que estructuralmente impiden fabricar un 0 a partir de un
valor desconocido.

## 15. Matriz de pendientes

| ID | Tema | Estado actual | Falta | Modo | Riesgo | Fuente disponible | Clasificación | Próxima acción |
|---|---|---|---|---|---|---|---|---|
| HYD-1 | Tee 1→2 Detallado | Implementado (CRIT-A31) | Nada | Profesional | — | ERAS-2023 Tabla N°7 | CERRADO | Ninguna |
| HYD-2 | Fan-out 1→N Detallado | Incompletitud explícita (M2-TOPO-E) | Nada (geometría no modelable sin inventar) | Profesional | — | N/A (fuera de alcance normativo) | CERRADO (H2 ya implementado) | Ninguna |
| HYD-3 | Composición Estimated por Local | Implementado, decisiones rojas resueltas (D-δ.45) | Nada | Rápido/Profesional | — | ERAS-2023 Tabla N°7 (Ks); cardinalidad IUAS | CERRADO | Ninguna |
| HYD-4 | `hfEquipoACS` — fórmula | Excluida del balance (D-δ.15) | Metodología normativa (no existe en ERAS) | Ambos | Bajo (correctamente no inventada) | Ninguna en ERAS-2023 | H3 (requiere investigación bibliográfica externa si se quiere resolver) | Diferir |
| HYD-5 | `hfEquipoACS` — advertencia en UI interactiva | Ausente en panel M2; presente sólo en PDF | Texto de advertencia en `PanelDePresionDeModulo2.tsx`/`TarjetaDeTerminal.tsx`/`CalculoDelCriticoDetalle.tsx` | Ambos | **Alto** (oculta limitación en el flujo normal) | Texto ya existe en `generarDocumentoPdf.ts` | **H0** | `HYD-ACS-DISCLOSURE-01` |
| HYD-6 | Terminal crítico / `candidatoProvisional` | Correcto, sin deuda funcional | Nada funcional | Ambos | Ninguno | N/A | CERRADO | Ninguna |
| HYD-7 | Comentarios obsoletos (`hfMedidor` "siempre undefined") | 2 comentarios de código desactualizados post-M3 | Actualizar texto | N/A | Ninguno (sólo higiene) | N/A | H2 (cosmético) | Corregir en próximo touch de esos archivos |
| HYD-8 | M1 — nota huérfana "A3 pendiente" | Sin trazabilidad documental | Aclarar o retirar referencia | Ambos | Bajo | N/A | H3 | Aclarar en próximo touch |
| HYD-9 | M3 — deuda menor registrada | Ítems no bloqueantes (Tabla N°8, overrides, panel parcial) | Ver §10 | Profesional | Bajo | N/A | H2 | Diferir |
| HYD-10 | M4 — deuda menor registrada | Ítems no bloqueantes (desnivel, §2.8, secciones tanque) | Ver §11 | Profesional | Bajo | N/A | H2 | Diferir |
| HYD-11 | Pmin alternativo por artefacto | Base ya per-artefacto; variante ACS fuera de alcance | Nada urgente | Profesional | Bajo | N/A | H3 | Post-beta |
| HYD-12 | Reserva/autonomía alternativa | CRIT-A35 normativo vigente | Nada urgente; alternativa contradiría la norma | Profesional | Bajo | ERAS-2023 §2.9.1.1 (contraindica dotación) | H3 | Post-beta, con justificación normativa explícita si se retoma |
| HYD-13 | ROADMAP.md — nota "Estado actual" desactualizada | Dice "HYD-EST-01 en implementación" pese a estar cerrado (D-δ.113) | Actualizar | N/A | Ninguno (documental) | N/A | H2 (cosmético) | Corregido en este mismo slice (§17) |

## 16. Clasificación H0/H1/H2/H3

**H0 — bloquea beta (1):**
- HYD-5 — `hfEquipoACS` sin advertencia en el panel interactivo de M2.

**H1 — debe cerrarse antes de beta profesional (0):**
- Ninguno encontrado con evidencia real. No se infla la lista.

**H2 — puede lanzarse declarado (6):**
- HYD-2 (fan-out 1→N, ya implementado como tal), HYD-7 (comentarios
  obsoletos), HYD-9 (deuda menor M3), HYD-10 (deuda menor M4), HYD-13
  (nota de ROADMAP, corregida en este slice).

**H3 — nuevo criterio IUAS / post-beta (4):**
- HYD-4 (fórmula de `hfEquipoACS`, requiere investigación bibliográfica
  externa si se retoma), HYD-8 (nota M1 "A3"), HYD-11 (Pmin
  alternativo), HYD-12 (reserva alternativa).

**CERRADO (3):**
- HYD-1 (tee 1→2), HYD-3 (Estimated), HYD-6 (terminal crítico).

## 17. Roadmap hidráulico mínimo antes de beta

**Un único slice recomendado:**

1. **`HYD-ACS-DISCLOSURE-01`** — agregar, en el panel interactivo de M2
   (`PanelDePresionDeModulo2.tsx` y/o `TarjetaDeTerminal.tsx`/
   `CalculoDelCriticoDetalle.tsx`), el mismo texto de advertencia que ya
   existe en el PDF (`'hfEquipoACS no participa de este balance:
   todavía no tiene fórmula normativa vigente (D-δ.15).'`) visible
   cuando se muestra "Completo"/"Cumple". Es un cambio de UI puro, texto
   ya redactado y aprobado (se usa hoy en REPORT), sin tocar motor,
   schema ni fórmulas. Riesgo de implementación: bajo.

No se proponen `HYD-TEE-DETAILED-01` ni `HYD-EST-ACCESSORIES-01`: ambos
ya están cerrados con evidencia de código y tests, según se documenta en
§3 y §5. Proponerlos sería inflar deuda que no existe.

**Opcional, no bloqueante, de costo casi nulo** (puede bundlearse con
cualquier próximo slice que toque esos archivos, no amerita uno propio):
corregir los dos comentarios obsoletos de HYD-7 y aclarar/retirar la
nota "A3" de HYD-8.

## 18. Qué NO hacer antes de beta

- No implementar una fórmula de `hfEquipoACS` sin fuente normativa o de
  fabricante real (ERAS-2023 no la publica) — inventarla sería peor que
  declararla ausente.
- No ampliar el modelo de tee a 1→N inventando un orden de ramas o
  piezas físicas no relevadas.
- No agregar codos/curvas/uniones al modo Estimated sin evidencia
  normativa o topológica de cuántos hay — ya se evaluó y se descartó
  conscientemente en D-δ.40/D-δ.45.
- No implementar Pmin alternativo por artefacto ACS ni reserva
  12h/24h/dotación como "mejora rápida" — ambos requieren una decisión
  de producto explícita del usuario (el segundo, además, una
  justificación frente al texto normativo vigente).
- No convertir las deudas menores registradas de M3/M4 (§10-11) en
  bloqueantes — el propio equipo ya las evaluó como no bloqueantes al
  cerrar esos módulos, y esta auditoría no encontró evidencia
  contradictoria.
