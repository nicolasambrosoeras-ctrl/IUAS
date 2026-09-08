# CASOS-GOLDEN.md — Paquete eras-2023

Registro de casos de aceptación (ejemplos oficiales resueltos de la Guía
ERAS), usados para validar la cadena completa del Motor de Demanda.
Fuente: IF-2023-141050544-APN-DNAPYS#MOP, Cap. 2 (Normas y Gráficos,
Instalaciones de Agua). Ningún test ni comentario de código puede citar
un caso Golden que no esté documentado aquí primero.

## G1 — Tabla N°4 (caso con CRIT-A8 / válvula automática)

**Origen normativo:** ERAS-2023, §2.10.2, Tabla N°4 (Cap. 2, pág. 26/182).
**Clase:** Semi-normativo. El conjunto de artefactos computado y todos los
resultados numéricos están publicados. Su interpretación como conjunto
resultante de aplicar CRIT-A8 es una inferencia fuerte sustentada por el
texto normativo y el contexto del ejemplo; la Guía no documenta el
conjunto completo de artefactos instalados antes de la supresión.
**Régimen:** Vivienda unifamiliar, vivienda única, 1 unidad funcional, con
baño principal y baño de servicio (inodoros con limpieza por válvula
automática).
**Coeficiente a:** 1 (inferido de K/Kc = 1; celda vacía en la planilla).

### Conjunto computado (publicado, normativo)

| Artefacto (artefactoId del catálogo) | Cantidad |
|---|--:|
| inodoroValvula (Inodoro c/válvula) | 2 |
| piletaDeCocina (Pileta de cocina) | 1 |
| maquinaLavavajillas (Lavavajilla) | 1 |

Este conjunto produce directamente n=4 y Qmax=3,40 l/s — validable como
resultado normativo de la cadena Qmax → Kc → K → Qc.

### Entrada instalada (para un test específico de CRIT-A8)

No determinable de forma inequívoca a partir de esta fuente. En la planilla
original, las filas de Lavatorio, Bañera, Bidet y Receptáculo de ducha
tienen la celda de cantidad vacía: la Guía no permite establecer si
corresponden a artefactos instalados y suprimidos por CRIT-A8, o
simplemente no instalados. Este documento no declara cantidades para esos
artefactos. Cualquier fixture que quiera ejercitar el mecanismo de
supresión de CRIT-A8 sobre el conjunto completo deberá declarar su propio
conjunto instalado como una hipótesis de test explícita, no como un dato
de la Guía.

(La fila "Máquina Lavarropa" también tiene celda vacía, pero no pertenece
a un recinto sanitario — INFERENCIA: la vivienda no tiene lavarropas; esta
ausencia no se explica por CRIT-A8.)

**n:** 4
**Qmax:** 3,40 l/s
**Kc:** 0,5773502692 (exacto) — impreso 0,58
**K:** 0,5773502692 (exacto) — impreso 0,58
**Qc:** 1,9629909153 l/s (exacto) — impreso 1,96

**Criterios aplicados:** CRIT-A1 (raíz cuadrada); CRIT-A3 (n cuenta
unidades); CRIT-A8 (su aplicación está evidenciada por el texto normativo
y por el resultado publicado, pero la reconstrucción exacta de la entrada
suprimida no es un dato de la Guía).

**Observaciones imprescindibles:**
- El valor publicado de Qc solo se reproduce operando con Kc sin
  redondear (redondeo es de presentación, no de cálculo).
- Este caso valida la salida normativa del conjunto computado; no
  constituye por sí solo una prueba end-to-end del mecanismo de
  supresión de CRIT-A8 sobre una entrada completa.

## G2 — Tabla N°2 (caso base normativo sin supresión)

**Origen normativo:** ERAS-2023, §2.10.2, Tabla N°2 (Cap. 2, pág. 25/182).
**Clase:** Normativo. Las cantidades de artefactos están íntegramente
declaradas en la planilla; el coeficiente `a` es la única excepción (ver
más abajo).
**Régimen:** Vivienda unifamiliar, vivienda única, 1 unidad funcional.
**Coeficiente a:** 1 — inferido aritméticamente de K/Kc = 1; la celda de
`a` está vacía en la planilla, no fue impresa directamente.

**Artefactos y cantidades:**
| Artefacto (artefactoId del catálogo) | Cantidad |
|---|--:|
| lavatorio (Lavatorio) | 2 |
| banera (Bañera) | 1 |
| inodoroDeposito (Inodoro c/depósito) | 2 |
| bidet (bidet) | 1 |
| piletaDeCocina (Pileta de cocina) | 1 |
| piletaDeLavar (Pileta de lavar) | 1 |
| receptaculoDucha (Receptáculo ducha) | 1 |

**n:** 9
**Qmax:** 2,00 l/s
**Kc:** 0,3535533906 (exacto) — impreso 0,35
**K:** 0,3535533906 (exacto) — impreso 0,35
**Qc:** 0,7071067812 l/s (exacto) — impreso 0,71

**Criterios aplicados:** CRIT-A1 (raíz cuadrada); CRIT-A3 (n cuenta
unidades). CRIT-A8 no interviene (sin inodoros de válvula automática).

**Observaciones imprescindibles:**
- El ítem "Lavavajilla" tiene cantidad vacía en la planilla: se
  interpreta como artefacto no instalado, no como supresión normativa.
- El valor publicado de Qc solo se reproduce operando con Kc sin
  redondear.
- El coeficiente `a` no está impreso; es una inferencia aritmética, no
  un dato leído directamente de la planilla.

## G3 — Tabla N°3 (Reserva Total Diaria de Diseño, continúa la secuencia de Tabla N°2)

**Origen normativo:** ERAS-2023, §2.10.2, Tabla N°3 (Cap. 2, pág. 25/182).
**Clase:** Semi-normativo. La planilla se publica como imagen; los valores
de entrada/salida transcriptos abajo se leyeron de esa lámina. El conjunto
de artefactos y el `Qc` son los de G2 (Tabla N°2): Tabla N°3 continúa la
misma secuencia de cálculo hasta el volumen de reserva.
**Régimen:** el de G2 (vivienda unifamiliar, 1 unidad funcional, `a = 1`).

**Cadena de demanda:** idéntica a G2 → `Qc = 0,7071067812 l/s` (exacto;
impreso 0,71).

**Datos de reserva (leídos de la planilla):**

| Magnitud | Valor publicado |
|---|---|
| Caudal de conexión `Qconexión` | 0,60 l/s |
| Déficit `Dc` | 0,11 l/s ≈ 0,39 m³/h |
| Período de consumo máximo `Tc` | 2 h |
| Reserva Total Diaria de **Diseño** | 0,77 m³ |
| Reserva Total Diaria **a Ejecutar** | 1,00 m³ |

**Reconstrucción exacta** (CRIT-A35, sin redondear `Qc`):
`Dc = 0,7071067812 − 0,60 = 0,1071067812 l/s`;
`Dc·3,6 = 0,3855844124 m³/h`; `× 2 h = 0,7711688248 m³` ≈ **0,77 m³**
publicado. (Redondeando `Qc` a 0,71 daría 0,792 m³: la planilla usó `Qc`
sin redondear.)

**Criterios aplicados:** CRIT-A35 (fórmula de reserva por déficit).

**Observaciones imprescindibles:**
- El paso "Diseño → a Ejecutar" (0,77 → 1,00 m³) es un redondeo comercial
  que la Guía **no** formaliza como regla general. El motor de M4-B
  produce sólo el volumen de **diseño/requerido**; el volumen adoptado es
  de un slice posterior.
- `Qconexión = 0,60 l/s` es un dato de la planilla; su derivación desde la
  Tabla N°1 (§2.7) no está modelada todavía (ver CRIT-A35).

## G4 — Tabla N°4 (porción de Reserva Total Diaria de Diseño)

**Origen normativo:** ERAS-2023, §2.10.2, Tabla N°4 (Cap. 2, pág. 26/182).
**Clase:** Semi-normativo. Misma lámina que G1 (el conjunto de artefactos y
la cadena `n → Qmax → Kc → K → Qc` son los de G1, con CRIT-A8); Tabla N°4
incluye además su propia porción de reserva, transcripta abajo.
**Régimen:** el de G1 (vivienda unifamiliar, 1 unidad funcional, `a = 1`).

**Cadena de demanda:** idéntica a G1 → `Qc = 1,9629909153 l/s` (exacto;
impreso 1,96).

**Datos de reserva (leídos de la planilla):**

| Magnitud | Valor publicado |
|---|---|
| Caudal de conexión `Qconexión` | ≈ 1,18 l/s |
| Déficit `Dc` | ≈ 2,82 m³/h |
| Período de consumo máximo `Tc` | 1 h |
| Reserva Total Diaria de Diseño | ≈ 3 m³ |

**Reconstrucción exacta** (CRIT-A35): `Dc = 1,9629909153 − 1,18 =
0,7829909153 l/s`; `Dc·3,6 = 2,8187672951 m³/h`; `× 1 h = 2,8187672951 m³`.
La planilla presenta la reserva redondeada a **≈ 3 m³**.

**Criterios aplicados:** CRIT-A35 (fórmula de reserva por déficit).

**Observaciones imprescindibles:**
- Con `Tc = 1 h`, el volumen en m³ coincide numéricamente con `Dc` en
  m³/h; no es una coincidencia de la fórmula sino de ese `Tc` particular.
- Tolerancia de test: el golden verifica `≈ 2,8187672951 m³` (valor
  reconstruido) y `Math.round(...) === 3` (valor presentado por la
  planilla).

## G5 — Tabla N°1: gasto de conexión usado por Tabla N°3

**Origen normativo:** ERAS-2023, §2.7, Tabla N°1. **Clase:** Semi-normativo
(la tabla es una imagen; el valor de salida está publicado y se reproduce
exactamente desde el dataset del repo).

**Input → salida:**

| `diametroNominal_m` | `presionCalculo_m` | `qConexion_lps` |
|---|---|---|
| 0,019 m (DN19) | 5 m (valor tabulado exacto) | **0,60 l/s** |

Presión exactamente tabulada → sin interpolación. Es el `Qconexión` que la
planilla Tabla N°3 (G3) usa como aporte de la conexión en el balance de
§2.10.2.

**Criterios aplicados:** CRIT-A36 (búsqueda tabular de Tabla N°1).

## G6 — Tabla N°1: gasto de conexión usado por Tabla N°4

**Origen normativo:** ERAS-2023, §2.7, Tabla N°1. **Clase:** Semi-normativo.

**Input → salida:**

| `diametroNominal_m` | `presionCalculo_m` | `qConexion_lps` |
|---|---|---|
| 0,025 m (DN25) | 5 m (valor tabulado exacto) | **1,18 l/s** |

Es el `Qconexión` que la planilla Tabla N°4 (G4) usa en el balance de
§2.10.2.

**Criterios aplicados:** CRIT-A36.

**Observación (G5/G6):** la cadena pura `Tabla N°1 → Qconexión →
calcularReservaDiaria` se prueba en
`motor/reserva/calcularReservaDiaria.golden.test.ts`. Desde M4-D2 (D-δ.65)
la cadena **completa** `Proyecto → M1 → presión de cálculo (§2.7) → Tabla
N°1 → Qconexión → reserva` se prueba end-to-end en
`motor/modulo4/resolverEstadoModulo4.golden.test.ts`: G3 y G4 se
reconstruyen desde un `Proyecto` real con
`parametros.diametroNominalConexion_m` = 0,019 / 0,025 m,
`presionSobreAcera_m` = 5 m y `desnivelConexion_m` = 0 (→ presión de
cálculo 5 m, tabulada exacta), **sin inyectar** ningún `Qconexión`. La
relación entre la presión sobre acera y el punto físico de cálculo de
cada esquema (§2.7 la ajusta por desnivel firmado) se declara vía
`desnivelConexion_m`; la auto-derivación geométrica es deuda futura — ver
CRIT-A37 y D-δ.65.
