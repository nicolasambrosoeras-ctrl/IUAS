# Sistema visual (UI-01B D-δ.73 · UI-01C D-δ.74)

Referencia del sistema visual transversal de IUAS. Es **presentación**:
no cambia cálculo, dominio, `Proyecto`, motores ni semántica. Se construye
sobre la arquitectura de navegación de UI-01A (`navegacionUI.css`,
`NavegacionDeSecciones`). UI-01C cerró la interfaz web: perímetro de la
etapa 01, cabecera global, M1 reestructurado, semántica visual de la
verificación, resumen del proyecto en la sidebar y pulido de M2/M4.

Archivos:

| Archivo | Rol |
| --- | --- |
| `src/interfaz/paginas/sistema-visual.css` | Tokens + estilos base de elementos + utilidades `.ui-*` / `.tabla-tecnica` / `.control-dn` / `.config-hidraulica`. |
| `src/interfaz/paginas/navegacionUI.css` | Estructura del shell y la sidebar (grid, sticky, breakpoints), sobre los tokens. |
| `src/interfaz/paginas/EncabezadoDeEtapa.tsx` + `encabezadoDeEtapa.css` | Patrón único de cabecera de etapa. |
| `src/interfaz/paginas/demandaM1.css` | Estructura visual de la etapa 01 (M1): UF → Local → Artefacto. |
| `src/interfaz/paginas/ResumenDeProyecto.tsx` + `resumenDeProyecto.css` | Resumen compacto del proyecto bajo la sidebar. |
| `src/interfaz/paginas/resolverResumenDeProyecto.ts` · `resolverEntradasDeVerificacion.ts` | View-models de presentación del resumen (no calculan hidráulica). |

`sistema-visual.css` se importa una vez desde `MotorDemandaPantalla`;
`navegacionUI.css`, `demandaM1.css` y (transitivamente) el resto también.

---

## 1. Dirección visual

Aplicación técnica moderna, no "dashboard comercial":

- Fondo general suave, superficies claras.
- **Verde profundo** como identidad (navegación activa, acciones
  principales, estados positivos, detalles de énfasis) — **no** toda la
  interfaz en verde.
- Fondos y superficies neutros. Errores rojos, advertencias ámbar.
- Tipografía sobria del sistema (sin serif de impresión, sin encabezados
  gigantes, sin exceso de bold).
- Bordes suaves, radius moderado, sombras discretas.
- Alta densidad informativa; números técnicos fáciles de escanear.
- Separación visual clara entre **configuración** (lo que controla el
  proyectista) y **resultado derivado** (lo que calcula IUAS) —
  **UI-CRIT-02**.

Cuando la referencia estética contradice la densidad necesaria, las
tablas reales, los controles reales, la accesibilidad o el flujo 1→5,
manda el producto real.

---

## 2. Tokens (`:root`)

Sistema pequeño y reutilizable. No hardcodear valores fuera de estos
tokens.

### Color

| Token | Uso |
| --- | --- |
| `--color-fondo-app` | Fondo de la aplicación. |
| `--color-superficie` | Superficie principal (cards de resultado, sidebar). |
| `--color-superficie-2` | Superficie secundaria (configuración, header de tabla, zonas de input). |
| `--color-superficie-sel` | Superficie seleccionada / positiva (verde muy suave). |
| `--color-borde` / `--color-borde-fuerte` | Bordes suaves / bordes de control. |
| `--color-texto` / `--color-texto-2` / `--color-texto-3` | Texto principal / secundario / metadata. |
| `--color-primario` / `--color-primario-fuerte` | Identidad verde / hover-active. |
| `--color-primario-suave` / `--color-primario-borde` | Relleno verde suave / borde verde. |
| `--color-exito` `--color-advertencia` `--color-error` `--color-neutro` (+ `-suave` / `-borde`) | Estados. |
| `--color-foco` | Anillo de foco (verde algo más claro que el primario). |

### Espaciado, radius, sombra

- Espaciado (ritmo base 4 px): `--esp-xs` `--esp-sm` `--esp-md` `--esp-lg` `--esp-xl`.
- Radius: `--radio-control` (6px) · `--radio-card` (10px) · `--radio-panel` (14px) · `--radio-pastilla`.
- Sombras: `--sombra-1` (muy discreta) · `--sombra-2`.

### Tipografía

- `--fuente-sistema` (stack del sistema) · `--fuente-mono`.
- Tamaños: `--fs-metrica` (número protagonista) · `--fs-titulo-app` · `--fs-titulo-etapa` · `--fs-titulo-card` · `--fs-body` (14 px) · `--fs-ayuda` · `--fs-meta`.
- Pesos: `--peso-regular` (400) · `--peso-medio` (500) · `--peso-semibold` (600). Evitar 700+.

---

## 3. Jerarquía tipográfica

| Nivel | Elemento |
| --- | --- |
| Título de aplicación / proyecto | `.app-header h1` |
| Título de etapa | `.etapa-cabecera__titulo` (`<h2>`) |
| Título de card | `.ui-card__titulo` / `<h3>` |
| Body | `<p>`, texto general |
| Ayuda | `<small>`, `.ui-empty__texto` |
| Metadata | `.ui-metrica__etiqueta`, `.app-nav-num`, header de `.tabla-tecnica` |
| Número técnico | `.ui-metrica__valor` (+ `font-variant-numeric: tabular-nums` global en tablas) |

Nomenclatura técnica intacta: `Qc`, `DN`, `Di`, `V`, `m.c.a.`, `Pmin`,
`Presidual`, `RTD`/`VRTD`, `Qconexión`. Las ayudas pueden **agregar**
explicación, nunca reemplazar el término.

---

## 4. Superficies y cards

`.ui-card` — superficie con borde, radius de card y sombra-1.

| Variante | Uso |
| --- | --- |
| `.ui-card--config` | Configuración / decisión del proyectista (superficie secundaria, sin sombra). |
| `.ui-card--resultado` | Resultado derivado por IUAS (borde verde). |
| `.ui-card--ok` | Resultado **positivo** (CUMPLE): verde suave + acento izquierdo. |
| `.ui-card--error` | Resultado **negativo** (NO CUMPLE): rojo suave + acento izquierdo. |

`.ui-card--ok` / `.ui-card--error` (UI-01C §17-18) se combinan con
`.ui-card--resultado` y su variante **se deriva del resultado ya
calculado**, nunca de recalcular cumplimiento. El color refuerza; el
badge dentro de la card sigue con símbolo + texto.

Las cards agrupan **conceptos**, no inputs sueltos. Ritmo interno con
`.ui-stack` / `.ui-stack--sm` (margen entre hijos) y `.ui-cluster` (fila
flexible con gap).

---

## 5. Métrica (número protagonista)

`.ui-metrica` — columna con:

- `.ui-metrica__etiqueta` — rótulo en mayúsculas, metadata.
- `.ui-metrica__valor` — número grande, `tabular-nums`.
- `.ui-metrica__unidad` / `.ui-metrica__nota` — unidad y apoyo.

Usos: Qc en M1, Reserva requerida en M4, margen / terminal crítico en la
verificación. El resultado principal se lee **a simple vista**, nunca
perdido dentro de una frase larga.

---

## 6. Estados y badges

`.ui-badge` (+ `--ok` / `--warn` / `--error` / `--muted`). Pastilla con
icono + texto: **nunca sólo color, nunca sólo icono**.

Respeta la semántica: `evaluado` ≠ `cumple`. No se usa el mismo `✓` para
conceptos distintos sin label. Conceptos preferidos: **No iniciado ·
Pendiente · Evaluado · Atención · Suficiente · Insuficiente**. En M4 la
adopción es "Suficiente" / "Insuficiente", nunca "Cumple norma".

`.ui-callout` (+ `--info` / `--warn` / `--error`) — bloque compacto
icono + título + texto para advertencias humanizadas. No cajas rojas
grandes para información no crítica (p. ej. presión fuera de Tabla N°1 es
`warn`/incompleto, no error de `Proyecto`).

---

## 7. Empty states

`.ui-empty` — lenguaje visual común para los estados vacíos; el
**mecanismo** de cada uno se conserva distinto (**UI-CRIT-04**):

| Módulo | Acción de inicio |
| --- | --- |
| M3 `noIniciado` | Botón **"Iniciar Módulo 3"** → `conModulo3Iniciado` → `CONFIGURACION_MEDIDORES_INICIAL`. No es un checkbox de PH visible desde el principio; no se auto-inicia al entrar a la sección. |
| M4 `noIniciado` | Elegir esquema (Alimentación directa / Tanque elevado / Cisterna + bombeo + tanque elevado). Sin botón "Iniciar Módulo 4". |
| Presión incompleta | Explicación de qué falta, agrupada; nunca una lista de N terminales repitiendo el mismo motivo. |

---

## 8. Controles

Base unificada para `input` / `select` / `textarea` / `button` / `radio`
/ `checkbox`: altura ~2rem, padding, borde `--color-borde-fuerte`, radius
`--radio-control`, foco **siempre visible** (`:focus-visible` con anillo
`--color-foco`; nunca se quita `outline` sin reemplazo).

Jerarquías de botón (sección 19 del brief) — **no** todo verde:

| Clase | Uso |
| --- | --- |
| _(base)_ | Acción habitual (secondary): "+ Agregar artefacto". |
| `.ui-btn--primario` | Acción principal: "Iniciar Módulo 3", primera opción de esquema de M4. |
| `.ui-btn--peligro` | Eliminar. |
| `.ui-btn--fantasma` | Acciones menores. |

`.ui-segmented` / `.ui-segmented__opcion` — segmented control para
selectores de vista/modo (Rápido / Profesional en M2). El modo activo es
`aria-pressed="true"` y se distingue con superficie + peso + sombra.

`.control-dn*` (UI-01C §31-32) — control de DN adoptado de un Tramo:
`[↓] DN [↑]` en fila + "Auto" / "Manual · Auto" debajo. Conserva el
comportamiento exacto (`Tramo.dnComercialAdoptado`), el `disabled` en los
extremos del catálogo comercial, y añade `aria-label` explícitos en cada
botón ("Adoptar el DN comercial inmediato inferior/superior", "Volver al
DN recomendado automáticamente"). Sin `CSSProperties` inline.

`.config-hidraulica` / `.config-hidraulica__grupo` (UI-01C §34) — la
configuración avanzada de M2 se agrupa por conceptos **ya existentes**
(Método de cálculo · Geometría de relevamiento · Tubería) con
`fieldset`/`legend`, en vez de una sucesión plana de `<select>`. No se
inventan categorías de dominio.

No se agrega validación, parser ni máscara sólo por estética: los helpers
existentes mandan. El styling no debe romper la edición natural de
números, el signo negativo de desnivel, el input vacío, los `↑`/`↓`, los
`<select>` de DN ni los `<details>`.

---

## 9. Tablas

`.tabla-tecnica` (dentro de `.tabla-scroll` para scroll horizontal
**local**, nunca overflow global):

- Header suave en mayúsculas, color metadata, un solo borde inferior
  marcado.
- Filas claras con borders horizontales; hover sutil; **sin** gridlines
  pesadas tipo planilla, **sin** zebra.
- `.col-num` — números alineados a la derecha, `tabular-nums`.
- `.col-dn` — DN destacado (es resultado **y** control editable `↑`/`↓`).
- `.col-estado` — estado al final, sin wrap.

Distinguir **editable** de **calculado** (sección 77): en M2, Longitud es
input; DN es resultado + controles; V y Pérdida son resultado; Estado es
badge/texto. Que se vea de inmediato qué puede modificarse.

Tablas clave/valor (`th` en la primera columna): el header de columna no
lleva fondo (`tbody th` es transparente).

---

## 10. Cabecera de etapa

`EncabezadoDeEtapa` renderiza, como hijos directos de un
`<summary className="etapa-cabecera">` (M1–M4) o de un contenedor
`.etapa-cabecera` (etapa 5, no colapsable):

```
[02]  Tuberías
      Dimensionamiento hidráulico de la red        [ estado? ]
```

- El número (`01`..`05`) es metadata tabular en verde.
- El `<h2>` real se conserva (accesibilidad + tests de estructura del
  flujo 1→5).
- Se elimina la redundancia "Módulo N — …" / "Módulo N · …". La traza
  "Módulo N" sigue disponible en las ayudas técnicas de cada panel.
- El chevron de disclosure es propio (`::after`) y sólo aparece cuando la
  cabecera es un `<summary>` dentro de `<details>`.

---

## 11. Shell y sidebar

- `.app-shell` centra el contenido con un ancho máximo razonable
  (~1240px); las tablas e inputs no se estiran a 1900 px.
- `.app-layout` — grid `sidebar | contenido`.
- `.app-nav` — superficie tipo card, **sticky** en desktop.
  - Grupos `.app-nav-grupo`: **PROYECTO** (etapas 1–4) y **VERIFICACIÓN**
    (etapa 5).
  - `.app-nav-num` — número `01`..`05`.
  - Sección activa (`a[aria-current="true"]`): fondo verde suave + acento
    lateral + peso. No depende sólo del color.
  - Sigue siendo `IntersectionObserver` + anchors nativos, **no un
    router**.
- `.resumen-proyecto` (UI-01C §23) — resumen compacto bajo la navegación:
  **Qc · Reserva · Margen crítico**. Lo alimenta `resolverResumenDeProyecto`,
  un view-model de presentación que compone `calcularSimultaneidad` +
  `resolverEstadoModulo2` + `resolverEstadoModulo4`; **no** hay
  `EstadoGlobalProyecto`, no persiste nada, no recalcula hidráulica.
  Reglas: "Pendiente" / "No aplica" **nunca** se muestran como 0 (§24);
  esquema `directa` → Reserva "No aplica" (contrato de M4, §25); el
  margen se colorea `--positivo` / `--negativo` según `cumpleMinimo`. Se
  oculta en la barra horizontal (≤ 900 px). Sólo se arma con un
  `Proyecto` válido.

---

## 11b. Etapa 01 — estructura de M1 (`demandaM1.css`)

El encabezado "01 Demanda" abre la etapa, **antes** de "Datos del
proyecto" (UI-01C §6-7): toda la configuración que determina la Demanda y
su Resultado viven dentro de la sección `#demanda`.

Jerarquía visible **UF → Local → Artefacto**:

| Nivel | Clase | Notas |
| --- | --- | --- |
| Datos del proyecto | `.m1-config` (`.ui-card--config`) | Tipología + total UF. |
| Unidad funcional | `.m1-uf` / `.m1-uf--colapsada` | Cabecera **colapsable** (Duplicar / Eliminar UF), campos Nombre/Nivel/Cota agrupados, lista de Locales. |
| Local | `.m1-local` | **Card por Local** (no por artefacto). Tipo/Régimen + lista de artefactos. |
| Artefacto | `.m1-artefacto` | Fila compacta `select · Cantidad · Eliminar`; apila en ≤ 560 px. |

Acciones destructivas (`.m1-btn-eliminar`): visibles, con nombre
accesible, **sin depender de hover**, jerarquía secundaria (nunca el peso
de una acción constructiva). "+ Agregar": **UF** es de nivel superior
(`.ui-btn--primario`); **Local** y **Artefacto** son contextuales
(`.m1-agregar-contextual`, alineadas a la izquierda).

**Unidad funcional colapsable (UX-01 / UI-01D, D-δ.76).** La cabecera de
cada `.m1-uf` es un botón de disclosure real (`.m1-uf__toggle`, patrón
APG: `<button aria-expanded aria-controls>` dentro del `<h3>`), no un
`<div>` clicable. Colapsar es **sólo presentación**: oculta el detalle,
nunca saca la UF del cálculo.

| Elemento | Clase | Notas |
| --- | --- | --- |
| Toggle de cabecera | `.m1-uf__toggle` | Fila de ancho completo, chevron `▼/▶` (`aria-hidden`) + nombre + `· nivel`; con la UF colapsada añade `N locales · M artefactos`. Foco visible propio. |
| UF colapsada | `.m1-uf--colapsada` | Card de una sola franja (padding reducido, `gap:0`). **No** es estado de error: sin colores de warning. |
| Contenido | `.m1-uf__contenido` | Wrapper con `id` estable (destino de `aria-controls`); sus hijos no se renderizan colapsada. `[hidden]` le gana al `display` local. |
| Control inferior | `.m1-uf__pie` / `.m1-uf__contraer-pie` | "↑ Contraer unidad funcional" tras "+ Agregar local"; sólo con la UF abierta. Alterna el mismo estado que la cabecera. |

Reglas: UF ya presente al montar → **expandida**; UF agregada o duplicada
→ **colapsada**; estados **independientes** por UF (sin acordeón
exclusivo); estado por `uf.id`, **no persistido**. En ≤ 560 px la cabecera
colapsada apila nombre y resumen sin overflow horizontal.

---

## 12. Responsive

Prioridad **desktop** (se ve especialmente bien en 1280–1600 px).

| Breakpoint | Comportamiento |
| --- | --- |
| `> 900px` | Shell de dos columnas, sidebar lateral sticky. |
| `≤ 900px` (tablet) | Sidebar → barra superior desplazable; grupos ocultos; tablas con scroll local sólo si hace falta. |
| `≤ 560px` (mobile) | Cards apiladas, sin overflow global, navegación usable, sticky sin tapar contenido. |

---

## 13. Accesibilidad y motion

- `label`/`input`, `fieldset`/`legend` para opciones, `aria-label` en la
  nav, `aria-pressed` en el segmented control, botones y links reales,
  `details` semántico.
- Contraste suficiente; nunca depender sólo de color, icono o posición.
- Motion muy discreto (hover, foco, nav activa, chevron). Respeta
  `prefers-reduced-motion: reduce`.
- Print: la UI no se diseña para imprimir el DOM; el PDF va por `pdfMake`,
  aparte.

---

## 13b. Precisión de presentación (UI-CRIT-06)

El core conserva la precisión completa (m³, `m.c.a.` con sus decimales);
la UI **humaniza** los resultados según unidad y contexto:

- **Reserva (litros).** Modo Rápido: `formatearVolumen_L_rapido` redondea
  al litro entero **sólo para mostrar** (reserva requerida, tabla de
  adopción, resumen de la sidebar). Modo Profesional:
  `formatearVolumen_L` (hasta 3 decimales) + m³ equivalente. El valor de
  cálculo y de **persistencia sigue siendo el m³ exacto**; los `<input>`
  de capacidad adoptada aceptan decimales (`litrosParaInput` no cambia).
- **Presión (`m.c.a.`).** NO se le aplica la simplificación de litros
  (§42): se mantiene el formateo de `formatearNumero(_, 'm')` (3
  decimales). El resumen de la sidebar usa ese mismo formateo para el
  margen crítico.

**UI-CRIT-05 — Estado del cálculo ≠ resultado de cumplimiento.**
"Completo" / "Evaluado" describen la disponibilidad del cálculo; "CUMPLE
/ NO CUMPLE" el resultado técnico. La línea de estado de la verificación
se llama "Estado del cálculo: cálculo disponible" (no "Estado de Módulo
2: Completo") para no leerse como un veredicto. `resolverEstadoModulo2`
(estado `completo`) no cambia.

---

## 14. Reglas de uso

- Preferir clases semánticas de presentación (`.ui-*`, `.tabla-tecnica`),
  **no** clases acopladas a nombres internos del motor.
- No inline styles masivos; construir sobre este CSS. Quedan
  `CSSProperties` triviales y estables en componentes de detalle
  Profesional (`AccesoriosDeTramoEditor`, `TarjetaDeTerminal`,
  `CalculoDelCriticoDetalle`, `TablaDeTerminales`, `TeeDeNodoEditor`,
  parte de `DimensionamientoDeTramo`): deuda cosmética no bloqueante.
- No introducir framework CSS nuevo (Tailwind, styled-components, etc.)
  ni librería de iconos pesada.
- Crear componentes de presentación reutilizables sólo ante repetición
  real; no montar un design system abstracto de 40 componentes.
- El resumen de proyecto y cualquier vista transversal **componen**
  primitivas de dominio ya productivas en el punto de composición; nunca
  se crea un `EstadoGlobalProyecto` ni se persiste un resultado.
- El test más importante sigue siendo
  `src/auditoriaTransversalM1M4.baseline.test.ts` (12/12, snapshot
  numérico idéntico). Si el rediseño cambia un resultado hidráulico: bug.

## Criterios de UI registrados (en `PENDIENTES-DE-ARQUITECTURA.md`)

| Criterio | Resumen |
| --- | --- |
| **UI-CRIT-01** | Flujo: Demanda → Tuberías → Medidores → Abastecimiento → Verificación. |
| **UI-CRIT-02** | Decisión persistida ≠ resultado derivado (superficies distintas). |
| **UI-CRIT-03** | Litros como unidad comercial principal de reserva en la UI; m³ interno. |
| **UI-CRIT-04** | El mecanismo de inicio de `noIniciado` puede variar por módulo. |
| **UI-CRIT-05** | Estado del cálculo ≠ resultado de cumplimiento. |
| **UI-CRIT-06** | Precisión de presentación ≠ precisión de cálculo. |
