# Handoff — Módulo 1 (Demanda) → Módulo 2 (Tuberías)

Documento de transición para un chat nuevo de Claude Code. Pensado para
entenderse sin depender del historial del chat anterior.

## 1. Estado Git

- **Branch**: `main`
- **HEAD**: `3b056330bdea9782dc501f0e645f88d38bba7e50`
- **Tags relevantes**: `v0.1.0` (MVP del motor), `v0.2.0-dev` (interfaz
  funcional madura, desactualizado respecto a HEAD), `v0.3.0-dev`
  (**Módulo 1 funcionalmente cerrado**, apunta exactamente a HEAD).
- **Build**: verde (`npm run build`). Advertencia conocida y aceptada:
  el bundle creció a ~2MB al conectar `pdfmake` de verdad a la app real;
  no es un error, es optimización pendiente sin urgencia.
- **Tests**: `npx vitest run` → 23/23 verdes (3 archivos).
- **Working tree**: limpio.

## 2. Estado del Módulo 1 — funcionalmente TERMINADO

- Proyecto editable: metadatos base, coeficiente de mayoración `a`.
- Múltiples Unidades Funcionales: alta/baja (mínimo 1, no se puede llegar
  a 0 desde la interfaz), nombre editable.
- Locales: alta/baja, tipo, régimen.
- Artefactos: alta/baja, catálogo, cantidad.
- Canilla de Servicio: incorporada al catálogo y al proyecto inicial.
- Validación semántica completa: invariantes, referencias de catálogo,
  mensajes amigables, y la regla `proyectoSinArtefactosComputables`
  (bloquea el cálculo si no hay ningún artefacto computable en todo el
  proyecto — evita que el motor reciba `n=0` y lance una excepción no
  capturada).
- Motor de Demanda: Qmax, n, Kc, K, Qc. Criterios CRIT-A2, CRIT-A3,
  CRIT-A4, CRIT-A5, CRIT-A8 implementados y firmes. Casos Golden G1
  (Tabla N°4) y G2 (Tabla N°2) verdes.
- Interfaz: pantalla única, edición completa, jerarquía de resultados
  (Qc destacado), Desarrollo del cálculo auditable (fórmula, criterio,
  sustitución, resultado, entradas, referencias, nota).
- PDF real, conectado a un botón en la interfaz (ya no hay prototipo de
  Fase 0), con el mismo contenido que la pantalla.

## 3. Arquitectura actual

- `modelo/`: formas puras de datos (Proyecto, Local, Artefacto,
  ResultadoDeCalculo, etc.), sin lógica.
- `motor/demanda/simultaneidad/`: cálculo de Demanda. Estable, no se
  toca salvo bug real confirmado.
- `normativa/eras-2023/`: catálogo de artefactos, coeficientes de
  mayoración, `CRITERIOS.md` (interpretaciones normativas firmes),
  `CASOS-GOLDEN.md`.
- `validacion/`: validación semántica del Proyecto, previa al motor.
- `interfaz/`: pantalla React del Módulo 1.
- `exportadores/pdf/`: generador de PDF, recibe `{proyecto, resultado}`
  ya calculados, nunca recalcula.
- `presentacion/desarrolloDelCalculoDemanda.ts`: fuente única compartida
  entre interfaz y PDF para fórmula simbólica, sustitución numérica y
  texto de resultado determinado/indeterminado. Específico de Demanda a
  propósito, no es una capa genérica.
- `modelo/memoria/index.ts`: tipo `MemoriaDeProyecto` ya definido, sin
  ningún consumidor todavía. Reservado para cuando exista composición
  real entre Proyecto y resultados de múltiples módulos.

## 4. Decisiones firmes — no reabrir sin evidencia nueva

- No mover `coeficienteA` de `Proyecto.parametros` todavía.
- CRIT-A5 aplica únicamente al Qc global de proyecto.
- No extender CRIT-A5 por analogía a Qunit, Qcaux ni caudales de tramo.
- No ampliar `EntradaDePaso` de forma anticipada (solo cuando exista un
  segundo módulo real que lo necesite).
- No crear infraestructura compartida genérica sin un segundo caso real
  ya en construcción (regla aplicada dos veces en este proyecto: con
  fórmulas/sustitución y con la ubicación de `coeficienteA`).
- Canilla de Servicio queda como inferencia de diseño aceptada,
  `qu = 0,20 l/s`, sin nota normativa especial adicional.
- La referencia normativa de Kc usa `§`, no `Sec.` (corregido).

## 5. Pendientes arquitectónicos abiertos (`PENDIENTES-DE-ARQUITECTURA.md`)

- **Multiplicidad/procedencia de `EntradaDePaso`**: la traza no expone
  `cantidad`, por lo que la sustitución numérica de Qmax no puede
  reconstruirse fielmente. Sigue abierta; se resuelve con el primer
  módulo adicional real.
- **`coeficienteA`**: D-α ya investigada (ver sección 6). D-β y D-γ
  **siguen abiertas**.
- **Error dimensional de `Ae` §2.12.1**: abierto, **bloqueante para
  Módulo 2** (ver sección 7).
- **Contradicción Qunit / §2.6**: abierta, afecta al futuro módulo de
  Medidores y a la pregunta de caudal por tramo de Módulo 2.
- No hay otros pendientes vigentes fuera de estos.

## 6. Resultado de D-α (solo lo relevante para Módulo 2)

- `a` forma parte inseparable del modelo de §2.9.2 (no tiene ámbito
  propio, independiente de `Kc`).
- Parece anclado a la tipología del proyecto, no derivarlo localmente
  según el subconjunto de artefactos de un tramo.
- Existe evidencia fuerte de que el modelo de §2.9.2 se aplica más allá
  del Qc global: tramo (§2.10.2), cañerías (§2.12.1), agua caliente
  (§2.19.3/§2.19.9), tanques (§2.11.2).
- Medidores individuales tienen una contradicción/excepción específica
  en §2.6 respecto de Qunit.
- Qcaux y distribución interna siguen ambiguos.
- Posición provisional (no definitiva): `a` sigue siendo atributo del
  proyecto; se aplica donde §2.9.2 sea efectivamente invocado; no se
  deriva localmente.

## 7. Bloqueos antes de Módulo 2

- **P1 — Fórmula de `Ae` §2.12.1**: la fórmula impresa tiene un error
  dimensional/de factor (~100). Verificación dimensional propia (sin
  fuente): con `Qc` en l/s, `Ve` en m/s, `Ae` en cm², corresponde
  `Ae = 10 · Qc / Ve`. **No implementar ni transcribir la fórmula
  impresa tal cual hasta resolver formalmente el error** contra la
  fuente normativa.
- **P2 — Qué caudal corresponde a cada tramo y cómo se aplica §2.9.2**:
  pregunta madre que engloba D-β, D-γ y la contradicción Qunit/§2.6 —
  no son preguntas independientes. Requiere investigación normativa
  profunda (fuera del alcance de este repo, que no contiene el texto
  fuente de la Guía).

## 8. Metodología de trabajo (sin excepción)

```
analizar
→ proponer alcance mínimo
→ aprobación explícita
→ implementar
→ build/tests/verificación (navegador cuando aplique)
→ mostrar diff/status
→ aprobación explícita
→ commit
```

Nunca commitear sin aprobación explícita. Distinguir siempre incremento
funcional vs. documental antes de empezar.

## 9. Hitos recientes

- `bb935e0` — múltiples Unidades Funcionales.
- `74cbc7b` — PDF: Proyecto real + resumen jerarquizado (Incremento A1).
- `cd04392` — PDF: Unidades Funcionales/Locales/Artefactos (Incremento A2).
- `7da22ef` — presentación compartida entre interfaz y PDF (Incremento B).
- `1d55930` — fix: referencia normativa de Kc, `Sec.` → `§`.
- `ebee2a9` — botón real de generación de PDF conectado a la interfaz.
- `3b05633` — fix: bloquear cálculo sin artefactos computables.
- `v0.3.0-dev` — tag de cierre formal del Módulo 1, sobre `3b05633`.

## 10. Primer paso recomendado en el chat nuevo

No diseñar ni implementar Módulo 2 todavía. Orden:

1. Investigación normativa de **P1** (fórmula de `Ae`).
2. Documentar el resultado (`PENDIENTES-DE-ARQUITECTURA.md`, y si
   corresponde, un criterio nuevo en `CRITERIOS.md`).
3. Investigación normativa de **P2** (caudal por tramo / alcance de
   §2.9.2).
4. Documentar el resultado.
5. Recién entonces, proponer la arquitectura mínima del Módulo 2.
