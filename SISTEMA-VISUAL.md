# Sistema visual (UI-01B, D-δ.73)

Referencia del sistema visual transversal de IUAS. Es **presentación**:
no cambia cálculo, dominio, `Proyecto`, motores ni semántica. Se construye
sobre la arquitectura de navegación de UI-01A (`navegacionUI.css`,
`NavegacionDeSecciones`).

Archivos:

| Archivo | Rol |
| --- | --- |
| `src/interfaz/paginas/sistema-visual.css` | Tokens + estilos base de elementos + utilidades `.ui-*` / `.tabla-tecnica`. |
| `src/interfaz/paginas/navegacionUI.css` | Estructura del shell y la sidebar (grid, sticky, breakpoints), sobre los tokens. |
| `src/interfaz/paginas/EncabezadoDeEtapa.tsx` + `encabezadoDeEtapa.css` | Patrón único de cabecera de etapa. |

`sistema-visual.css` se importa una vez desde `MotorDemandaPantalla`.

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

## 14. Reglas de uso

- Preferir clases semánticas de presentación (`.ui-*`, `.tabla-tecnica`),
  **no** clases acopladas a nombres internos del motor.
- No inline styles masivos; construir sobre este CSS.
- No introducir framework CSS nuevo (Tailwind, styled-components, etc.)
  ni librería de iconos pesada.
- Crear componentes de presentación reutilizables sólo ante repetición
  real; no montar un design system abstracto de 40 componentes.
- El test más importante sigue siendo
  `src/auditoriaTransversalM1M4.baseline.test.ts` (12/12, snapshot
  numérico idéntico). Si el rediseño cambia un resultado hidráulico: bug.
