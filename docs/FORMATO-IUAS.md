# Formato de archivo `.iuas` (PERSIST-01, D-δ.119)

## Propósito

IUAS es una aplicación 100% client-side, sin backend, sin cuentas y sin
sincronización en la nube: el proyecto del usuario existe únicamente en
su navegador. `.iuas` es el formato de archivo que le permite a ese
proyecto **salir de la aplicación como un archivo portable** — para
respaldarlo, llevarlo a otra computadora, o compartirlo — y volver a
entrar exactamente igual.

El mismo formato se usa para dos cosas distintas:

- **exportación/importación manual** (botones "Exportar proyecto" /
  "Importar proyecto" del header);
- **autosave local** (recuperación automática al reabrir la app).

No hay un segundo formato paralelo para el autosave: ambos caminos usan
el mismo serializador y el mismo parser/validador
(`src/persistencia/serializarProyecto.ts`,
`src/persistencia/parsearArchivoIuas.ts`).

## `.iuas` es JSON

Un archivo `.iuas` es JSON UTF-8 plano, indentado con 2 espacios, sin
compresión ni formato binario: puede inspeccionarse a simple vista en
cualquier editor de texto.

## El envelope

```ts
type ArchivoIuas = {
  format: 'IUAS'
  schemaVersion: number
  appVersion: string
  exportedAt: string // ISO-8601
  proyecto: Proyecto
}
```

- **`format`**: marca fija `'IUAS'`. Distingue un archivo IUAS de
  cualquier otro JSON que el usuario pueda seleccionar por error.
- **`schemaVersion`**: versiona la forma de ESTE ENVELOPE (no la del
  `Proyecto` que contiene — ver más abajo). Empieza en `1`
  (`SCHEMA_VERSION_ARCHIVO_ACTUAL`, `src/persistencia/formatoIuas.ts`).
  Sólo sube por cambios estructurales del envelope mismo; nunca por
  cambios puramente visuales de la aplicación.
- **`appVersion`**: versión de la aplicación que exportó el archivo
  (`src/version.ts`, `VERSION_APP`). Informativa: no participa de
  ninguna validación de compatibilidad. Es la misma fuente que ya
  usaban los metadatos de cálculo del informe PDF (`versionApp`).
- **`exportedAt`**: fecha ISO-8601 del momento de exportación/guardado.
  Deseable, no validado estrictamente al importar (un archivo sin este
  campo, o con un valor no-string, igual se acepta con `exportedAt: ''`).
- **`proyecto`**: el `Proyecto` completo (`src/modelo/proyecto/index.ts`).

## Dos versiones distintas, a propósito

`schemaVersion` del envelope y `proyecto.metadatos.schemaVersion` son
conceptos **independientes**, y esto es deliberado:

| Campo | Versiona | Vive en |
|---|---|---|
| `ArchivoIuas.schemaVersion` | la forma del ENVELOPE (`format`/`schemaVersion`/`appVersion`/`exportedAt`/`proyecto`) | `src/persistencia/formatoIuas.ts` |
| `Proyecto.metadatos.schemaVersion` | la forma del `Proyecto` en sí (UF/Niveles/Locales/Artefactos/redHidraulica/configuraciones) | `src/modelo/proyecto/index.ts` |

El `Proyecto` ya tenía, desde antes de PERSIST-01, su propia
infraestructura de lectura/migración por versión
(`src/modelo/proyecto/migraciones/index.ts`, función `leerProyecto`):
compara `proyecto.metadatos.schemaVersion` contra
`SCHEMA_VERSION_ACTUAL`, aplica la cadena de migraciones registradas si
hace falta, y rechaza con un error tipado si la versión es futura o no
reconocida. PERSIST-01 **reutiliza esa función tal cual** para validar
el `proyecto` embebido — no duplica esa lógica ni introduce un segundo
mecanismo de migración del dominio.

## Compatibilidad y schema futuro/anterior

Al importar (manual o autosave), el archivo pasa por capas de
validación, de la más externa a la más interna:

1. **JSON sintácticamente válido.** Si no, error humano ("El archivo
   seleccionado no es un proyecto IUAS válido.").
2. **`format === 'IUAS'`.** Cualquier otro JSON (aunque sea válido) se
   rechaza con el mismo mensaje humano.
3. **`schemaVersion` del envelope:**
   - `== SCHEMA_VERSION_ARCHIVO_ACTUAL` → se acepta.
   - `> actual` → se **rechaza siempre**: "Este archivo fue creado con
     una versión más nueva de IUAS y no puede abrirse con esta versión."
     Nunca se intenta adivinar ni leer parcialmente.
   - `< actual` → hoy (schemaVersion=1, el primer formato oficial) esto
     es imposible por definición; si en el futuro existiera una v2, acá
     iría la misma clase de tabla de migraciones que ya usa
     `modelo/proyecto/migraciones` (`desde -> aplicar`), no una reescritura
     del parser.
4. **Estructura mínima del envelope** (`appVersion` string, `proyecto`
   objeto presente).
5. **`proyecto.metadatos.schemaVersion`**, vía `leerProyecto` (ver
   arriba): mismo criterio de futuro/rechazo, migración si corresponde.
6. **Estructura mínima del `Proyecto`** (`metadatos`, `parametros`,
   `unidadesFuncionales` array, `configuracionHidraulica` presentes).

Un archivo que falla cualquiera de estas capas se rechaza con un mensaje
humano (nunca un stack trace) y **nunca reemplaza el proyecto actual**
(ver "Import atómico" más abajo).

## Qué se persiste

Únicamente **estado de proyecto** — lo que el usuario declaró o
decidió. Concretamente, la totalidad del tipo `Proyecto`:

- metadatos y parámetros del proyecto;
- unidades funcionales → niveles → locales → artefactos, con sus
  overrides explícitos (cota de piso, altura hidráulica sobre piso,
  conectividad elegida) tal como estén — **ausentes si son ausentes**;
- la topología de `redHidraulica` (nodos, tramos, tees, accesorios, DN
  manual adoptado, `montanteId`) y las identidades de `montantes`;
- `configuracionHidraulica` (método de pérdida, granularidad, material,
  sistema de tuberías);
- `configuracionMedidores` (Módulo 3): decisiones del usuario (propiedad
  horizontal, provisión de ACS, DN adoptados manualmente);
- `configuracionAbastecimiento` (Módulo 4): esquema, `Tc`, volúmenes de
  tanque ADOPTADOS por el proyectista;
- `modoTrabajo` y `ultimaConfiguracionProfesional` (snapshot de
  restauración de modo, no de cálculo).

## Qué NO se persiste

Ningún resultado derivado — porque el modelo de dominio de IUAS ya los
mantiene fuera de `Proyecto` por diseño, mucho antes de PERSIST-01
(ver comentarios de `modelo/proyecto/index.ts` y `modelo/redHidraulica/index.ts`).
Serializar `Proyecto` tal cual, sin ninguna limpieza adicional, ya
excluye: `Qc`, velocidades, `hf` (distribuida/localizada/de medidor),
presión residual, terminal crítico, resultados de M2/M3/M4, Ks de tees,
caches, coordenadas, geometría gráfica, y cualquier estado transitorio
de UI (acordeones abiertos, scroll, foco, sección activa). Al cargar un
`.iuas`, todos esos resultados se recalculan desde cero por el motor —
nunca se leen del archivo.

## Herencia: la ausencia se conserva

Cuando un campo es un override opcional (`cotaPiso_m`,
`alturaHidraulicaSobrePiso_m`, `dnComercialAdoptado`, etc.) y el
proyectista nunca lo fijó explícitamente, el campo queda `undefined` en
el `Proyecto` en memoria — y por lo tanto **ausente** en el JSON
serializado (`JSON.stringify` omite las claves `undefined`). Importar
ese archivo de vuelta produce el mismo `undefined`, nunca un valor
materializado igual al que hoy se deriva por herencia. Export → import
→ export produce el mismo `Proyecto`, ignorando sólo `exportedAt`.

## Autosave

- **Storage:** `localStorage`, clave `iuas:project:autosave:v1`
  (`src/persistencia/autosave.ts`, `CLAVE_AUTOSAVE`). Versionada para
  poder introducir una clave `...v2` en el futuro sin heredar autosaves
  incompatibles a ciegas.
- **Formato:** el mismo envelope `.iuas` (ver arriba) — no hay un
  segundo formato de autosave.
- **Debounce:** ~500 ms tras el último cambio de proyecto
  (`useAutosaveDeProyecto`), para no escribir en cada tecla.
- **Bootstrap:** si hay un autosave válido, gana sobre el proyecto de
  ejemplo. Si `localStorage` está vacío o el autosave es corrupto, se
  cae al comportamiento histórico (proyecto de ejemplo). Un autosave
  corrupto **no se borra en silencio** — se ignora al cargar pero queda
  en `localStorage` para poder diagnosticarlo.
- **Errores de storage** (cuota agotada, modo privado, storage
  deshabilitado): se capturan y se avisan de forma humana; la edición
  del proyecto sigue funcionando y la exportación manual sigue
  disponible como respaldo.

## Import atómico

Importar sigue siempre esta secuencia: leer archivo → parsear JSON →
validar envelope → validar `Proyecto` → recién ENTONCES reemplazar el
proyecto activo (con confirmación previa del usuario, porque reemplaza
lo que está en pantalla). Si cualquier paso falla, el proyecto actual
queda exactamente igual — nunca se reemplaza parcialmente, nunca se
mezcla con el archivo inválido. Un import exitoso sí actualiza el
autosave (con el proyecto importado, no con el que había antes).

## Privacidad

Todo el archivo `.iuas`, y todo el autosave, queda en el navegador o en
el disco del usuario. IUAS no envía el proyecto a ningún servidor, no
agrega telemetría nueva, y no requiere red para nada de esto.

## Política futura de migraciones

Este documento describe `schemaVersion = 1`, el primer formato oficial.
No existen migraciones reales todavía porque no hay una versión anterior
que migrar. El punto de extensión ya existe en el código
(`src/persistencia/parsearArchivoIuas.ts`, y separadamente
`src/modelo/proyecto/migraciones/index.ts` para el `Proyecto` embebido):
una futura v2 del envelope, o una futura versión del `Proyecto`, se
resuelve agregando una migración a esas tablas, nunca reescribiendo el
parser desde cero.
