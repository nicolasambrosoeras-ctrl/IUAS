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
