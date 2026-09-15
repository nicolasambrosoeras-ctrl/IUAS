# UX-HIERARCHY-POLISH-01

Compacta la jerarquía UF → Nivel → Local → Artefactos (+ Montantes de M2)
para que un proyecto mediano/grande se pueda inspeccionar sin kilómetros
de scroll, y agrega un nombre humano editable a cada Local. No cambia
ninguna fórmula hidráulica.

## Problema de escala

Antes de este slice, sólo la Unidad Funcional (UF) era colapsable (UX-01
/ UI-01D, D-δ.76). Nivel y Local siempre renderizaban su contenido
completo, sin importar cuántos hubiera. Un proyecto con varios Niveles y
varios Locales por Nivel se volvía una página larga y difícil de barrer
visualmente, y el label automático de cada Local ("Baño 1", "Cocina 1")
no podía personalizarse para reflejar su uso real ("Baño de invitados",
"Cocina principal").

## Jerarquía

```
UF
└─ Nivel
   └─ Local
      └─ Artefactos
```

Los tres primeros niveles de la jerarquía son colapsables, con el mismo
lenguaje visual: triángulo (▶/▼) + título humano + resumen compacto en la
cabecera. Los Artefactos NO son colapsables individualmente (brief §39):
el detalle de dimensionamiento no gana nada ocultándose a un cuarto
nivel, y agregar un quinto nivel de plegado degradaría la navegabilidad
en vez de mejorarla.

## Estados default

- **UF**: sin cambios respecto de UX-01 (colapsable, comportamiento
  preexistente).
- **Nivel**: con un único Nivel (`esUnico`, el caso histórico e
  inmensamente mayoritario) no se agrega ningún chrome de colapso —
  se ve exactamente igual que antes de este slice. Con 2+ Niveles, el
  nivel BASE (`niveles[0]`) arranca abierto y el resto arranca
  colapsado.
- **Local**: con un único Local en su Nivel no hay nada que colapsar. Con
  2+ Locales, el primero arranca abierto y el resto colapsado. Un Local
  recién creado o duplicado nace siempre abierto, sin importar cuántos
  Locales existan ya en el Nivel.

Todos estos estados se calculan una única vez al montar el componente
correspondiente (`useState` con inicializador perezoso) — un Nivel o
Local agregado después no entra retroactivamente al conjunto de
colapsados.

## Niveles colapsables

Cabecera compacta con nombre real + cota real (con signo, o "sin cota" si
está indeterminada — nunca `NaN`) + cantidad de Locales, singular/plural
correcto: `PB · +0,00 m · 5 locales`. "Eliminar nivel" sólo se ofrece con
el Nivel expandido, nunca en la cabecera colapsada. El nivel base
(`niveles[0]`) sigue sin poder eliminarse, sin cambios respecto de
FIX-M1-MULTINIVEL-BASE-LEVEL-01.

## Locales colapsables

Cabecera: nombre visible (personalizado o automático) + tipo + cantidad
de artefactos: `Baño principal · Baño · 4 artefactos`. Las acciones
"Duplicar local" / "Eliminar local" sólo se muestran con el Local
expandido.

## Nombre humano de Local

`Local` gana un campo opcional `nombre?: string` (ver Compatibilidad). Un
helper único (`src/modelo/proyecto/nombreVisibleDeLocal.ts`) decide el
nombre visible: si `local.nombre` está presente y no es sólo espacios,
gana sobre cualquier etiqueta automática; si no, se usa la etiqueta
automática que cada consumidor ya calculaba (tipo + ordinal — la lógica
de numeración en sí **no se tocó ni se unificó**: M1 sigue numerando
dentro del Nivel y omitiendo el número si el Local es único de su tipo;
M2/PDF siguen numerando siempre dentro de toda la UF).

- **Editar**: campo "Nombre:" en el Local expandido, con el nombre
  visible actual como valor.
- **Borrar**: vaciar completamente el campo vuelve al nombre automático.
  Nunca se persiste un string vacío en `Proyecto` (mismo criterio que
  `Nivel.cotaHidraulicaReferencia_m` o `Montante.nombre`).
- **Cambiar Tipo**: un nombre personalizado nunca se pisa al cambiar el
  Tipo del Local (el cambio de Tipo sólo toca `local.tipo`). Sin nombre
  personalizado, la etiqueta automática se sigue derivando sola.
- **Duplicar**: si el original no tenía nombre personalizado, el
  duplicado tampoco lo tiene (la numeración automática se resuelve sola
  en el siguiente render). Si el original SÍ tenía nombre personalizado,
  el duplicado sugiere `"{nombre} copia"` en vez de heredar el mismo
  nombre literal (dos Locales visualmente idénticos serían confusos).

Consumidores actualizados para usar el nombre visible consolidado (sin
tocar la lógica de numeración de cada uno): M1 (título del Local), M2
(`ResultadoHidraulicoDeTramo.tsx` — tabla de dimensionamiento y auditoría
de cobertura S2 —, `montantesDelProyecto.ts` — Montantes y tablas
derivadas —, `resolverFilaDeTerminalParaTabla.ts` — terminal crítico) y
el exportador PDF (`generarDocumentoPdf.ts`).

## Compatibilidad

`Local.nombre?: string` es un campo opcional retrocompatible, sin
migración — sigue exactamente el mismo precedente que `Local.cotaPiso_m`,
`Artefacto.alturaHidraulicaSobrePiso_m` o `Montante.nombre`:
`SCHEMA_VERSION_ACTUAL` (`1.0.0`) no cambió y no se agregó entrada a
`migraciones/index.ts`. Un proyecto antiguo sin este campo sigue
mostrando exactamente el label automático que mostraba antes.

## Montantes compactas

La card colapsada de Montante (`ConstructorDeMontantes.tsx`,
`UI-M2-MONTANTE-COMPACT-01`) ya cumplía el objetivo de densidad de este
slice (header ~2.5rem de alto, un único montante activo a la vez, unmount
real del cuerpo al colapsar) — no requirió cambios adicionales.

## Ayudas/copy

La explicación larga de "Cota del piso terminado…" se repetía una vez
por cada Nivel renderizado. Ahora se muestra una única vez por UF, antes
de la lista de Niveles.

## Persistencia

El estado de expansión/colapso de Nivel y Local es exclusivamente de
presentación (useState de componente), igual que el de UF desde UX-01:
nunca se persiste en `Proyecto`, `.iuas`, `localStorage` ni autosave, y
no participa de export/import.

## Accesibilidad

Cada cabecera colapsable de Nivel y Local usa el mismo patrón APG que ya
regía UF: un `<button>` real con `aria-expanded` y `aria-controls`
apuntando a un contenedor con id estable, foco visible
(`:focus-visible`), y funciona con teclado de forma nativa (sin
`div onClick`).

## Fuera de alcance

- No se tocó ninguna fórmula hidráulica (M1/M2/M3/M4, `hfEquipoACS`,
  Montante `5 m + |Δz|`, `Pmin`, reserva, Tee, HYD-EST).
- No se tocaron IDs, topología física ni referencias de conectividad.
- No se rediseñó el layout del REPORT PDF (sólo el texto del nombre
  puede cambiar si está personalizado).
- No se unificaron los distintos criterios de numeración automática de
  Locales entre M1/M2/PDF (quedan tan duplicados como antes de este
  slice; el helper nuevo sólo decide "personalizado vs. automático", no
  reemplaza la derivación del automático).
- No se hicieron los Artefactos colapsables individualmente.
