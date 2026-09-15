# HYD-ACS-DISCLOSURE-01

Fix de divulgación/UX derivado del único hallazgo H0 de
`docs/HYD-CLOSE-00-AUDITORIA.md` (D-δ.127). No cambia motor, schema,
PERSIST ni semántica de completitud.

## Problema

`hfEquipoACS` está correctamente excluido del balance de presión
implementado (`resolverBalanceDePresion.ts`, D-δ.15 — ERAS-2023 no
publica una fórmula normativa para la pérdida de carga del equipo de
agua caliente). Esa exclusión ya se declaraba en el PDF de memoria de
cálculo (`NOTA_HF_EQUIPO_ACS` en `generarDocumentoPdf.ts`), pero **no**
en el panel interactivo de Verificación hidráulica de Módulo 2
(`PanelDePresionDeModulo2.tsx`). Un usuario que trabaja únicamente en la
pantalla y nunca exporta el PDF veía "Completo"/"Cumple" sin ninguna
señal de que ese término no está contado.

## Decisión

Extender la misma advertencia ya usada en REPORT al panel interactivo,
en el mismo contexto donde se muestra el veredicto CUMPLE/NO CUMPLE, sin
tocar ninguna fórmula ni el significado de "Completo".

## Comportamiento UI

- **Panel general** (`PanelDePresionDeModulo2.tsx`): un callout
  informativo (`ui-callout ui-callout--info`, `role="note"`) inmediatamente
  debajo del resumen de cumplimiento ("TODOS LOS PUNTOS VERIFICABLES
  CUMPLEN" / "N DE M PUNTOS NO CUMPLEN"), visible siempre que el panel
  llega a mostrar el veredicto (mismo criterio incondicional que usa
  REPORT: no se condiciona a que existan terminales en red AC, para no
  inventar una detección física que el modelo no sostiene con certeza).
  Texto: *"El balance de presión no incluye automáticamente la pérdida de
  carga propia del equipo de agua caliente (hfEquipoACS). Verificá este
  término según el equipo seleccionado y la información del fabricante."*
- **Detalle del crítico** (`CalculoDelCriticoDetalle.tsx`, "Ver cálculo
  del crítico"): referencia breve, una línea, al final del desglose
  numérico -- *"hfEquipoACS no incluido automáticamente en este
  balance."* -- mismo criterio incondicional que el desarrollo del
  crítico en el PDF.
- **No se repite** por terminal en `TarjetaDeTerminal.tsx` (listas "Ver
  todos los terminales" / "Ver detalle de terminales"): repetirla ahí
  generaría ruido (una nota idéntica por cada fila) sin aportar
  información nueva frente a la nota general del panel.
- **Rápido / Profesional**: el panel no distingue modo de trabajo hoy
  (no lee `proyecto.modoTrabajo`) y la limitación es la misma
  independientemente del modo -- se usa un único texto que funciona en
  ambos, sin ocultarla en Rápido.

## Alcance de "Completo"

Sin cambios. `estado: 'completo'` sigue significando "el cálculo puede
completarse con la metodología implementada" -- nunca se convirtió a
`'incompleto'` por la ausencia de `hfEquipoACS`, porque esa exclusión ya
estaba correctamente fuera del alcance del balance implementado
(`resolverEstadoModulo2.ts`: *"completitud se mide contra el alcance YA
implementado, nunca contra features explícitamente diferidas"*). Lo
mismo aplica a `Cumple`/margen/terminal crítico: ningún resultado
hidráulico cambia, sólo se agrega texto informativo adyacente.

## Consistencia con REPORT

La UI y el PDF cuentan la misma verdad técnica: `hfEquipoACS` no
participa del balance, no vale 0, no se estima, no se considera
despreciable -- el usuario debe verificarlo aparte según el equipo real.
Los textos no son literalmente idénticos (la UI usa lenguaje más directo
orientado a la pantalla; el PDF cita explícitamente D-δ.15), pero
afirman exactamente lo mismo. No se modificó ningún texto de REPORT: no
se encontró contradicción entre ambos.

## Qué NO se implementó

- Fórmula, curva de fabricante o pérdida manual de `hfEquipoACS`.
- Ningún cambio en `resolverBalanceDePresion.ts`,
  `resolverPresionResidualDeCamino.ts` ni `resolverEstadoModulo2.ts`.
- Ningún cambio de schema ni de PERSIST.
- Ninguna detección automática de "existe producción ACS" en el
  Proyecto -- la nota es incondicional (mismo criterio que REPORT), no
  se intentó inferir esa condición del modelo.
- No se tocaron los dos comentarios obsoletos de `hfMedidor` detectados
  por HYD-CLOSE-00 (`resolverTerminalMasDesfavorable.ts`,
  `resolverPresionResidualDeCamino.ts`): no están en el diff de este
  slice y no es obligatorio corregirlos acá.

## Investigación futura de hfEquipoACS

Post-beta, sin decidir en este slice (ver
`docs/HYD-CLOSE-00-AUDITORIA.md` §12/§22): evaluar si conviene una
pérdida automática por tipo de equipo, una pérdida manual ingresada por
el usuario, una curva de fabricante, o declararlo permanentemente fuera
de alcance con verificación profesional aparte. Requiere investigación
bibliográfica externa -- ERAS-2023 no da metodología.
