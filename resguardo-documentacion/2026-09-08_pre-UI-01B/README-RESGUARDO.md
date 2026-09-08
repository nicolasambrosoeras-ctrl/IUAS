# Resguardo documental — pre UI-01B

**Fecha:** 2026-09-08
**Branch:** `main`
**HEAD fuente:** `4d789f9063e4778b6b39c5377e1ae54fb63becf3`
(commit `docs: registrar D-delta.72 -- UI-01A (arquitectura de navegacion) + UI-CRIT-01`)

## Finalidad

Snapshot documental histórico previo al rediseño visual transversal
(UI-01B). Preserva una copia íntegra, auditable y congelada de toda la
documentación del proyecto correspondiente al estado:

- Módulo 1 (Demanda) — cerrado / verificado
- Módulo 2 (Tuberías) — cerrado / verificado
- Módulo 3 (Medidores) — cerrado / verificado
- Módulo 4 (Reserva / Tanques) — cerrado / verificado
- Auditoría integral M1–M4 (D-δ.70) — cerrada; core funcional **congelado**
- UI-01A (arquitectura de navegación, D-δ.72) — cerrada
- UI-01B (sistema visual transversal) — **todavía NO iniciada**

## Contenido

```
resguardo-documentacion/2026-09-08_pre-UI-01B/
├── README-RESGUARDO.md      (este archivo — NUEVO, no es copia)
├── MANIFEST-SHA256.txt      (NUEVO — SHA-256 de cada archivo bajo origen/)
└── origen/                  (copias byte-idénticas, con la ruta relativa original)
    ├── BASELINE-FUNCIONAL-M1-M4.md
    ├── HANDOFF-MODULO-1-A-MODULO-2.md
    ├── PENDIENTES-DE-ARQUITECTURA.md
    ├── README.md
    ├── RESUMEN-CONTINUIDAD-M2.md
    ├── ROADMAP.md
    └── src/normativa/eras-2023/
        ├── CASOS-GOLDEN.md
        └── CRITERIOS.md
```

- `origen/` conserva las **rutas relativas originales** de cada documento
  (no se aplanaron): un documento que en el repo vive en
  `src/normativa/eras-2023/CRITERIOS.md` aparece acá en
  `origen/src/normativa/eras-2023/CRITERIOS.md`.
- Las copias son **físicas y byte-idénticas** a los originales al momento
  del snapshot (sin symlinks, sin hardlinks, sin reformateo, sin
  conversión de fin de línea). El repo usa `core.autocrlf=true` sin
  `.gitattributes`; los archivos fuente están en LF y las copias
  conservan esos mismos bytes.
- El commit que crea este snapshot añade además, **después** de
  fotografiar, un párrafo a `PENDIENTES-DE-ARQUITECTURA.md` activo (la
  regla de inmutabilidad de más abajo). Por eso
  `origen/PENDIENTES-DE-ARQUITECTURA.md` NO contiene ese párrafo: es el
  documento tal como estaba en el HEAD fuente, y un `diff` contra el
  `PENDIENTES-DE-ARQUITECTURA.md` activo mostrará exactamente esa
  diferencia (una sección agregada al final). Es el comportamiento
  esperado: un resguardo no contiene su propio registro de creación.
- `MANIFEST-SHA256.txt` lista el SHA-256 de cada archivo bajo `origen/`,
  en orden lexicográfico por ruta, en formato `<sha256>  <ruta>`. No se
  incluye a sí mismo. Se puede verificar con
  `sha256sum -c MANIFEST-SHA256.txt` desde este directorio.

## Inventario

La fuente de verdad del inventario fue `git ls-files` sobre el HEAD
fuente. Se incluyeron **todos los archivos versionados con función
documental**: 8 documentos Markdown.

No se incluyeron (no son documentación de proyecto): código fuente
(`src/**` salvo los dos `.md` normativos), configuración
(`package.json`, `tsconfig*`, `eslint.config.js`, `vite.config.ts`,
`.gitignore`, `.github/workflows/`), `index.html`, ni `node_modules` /
`dist` / cachés (no versionados). Tampoco se copió `.git/` — el historial
ya vive en Git.

Los directorios `docs/adr/` y `docs/arquitectura/` existían al momento
del snapshot como **carpetas vacías** con sólo un `.gitkeep` (0 bytes);
no contenían ningún ADR ni documento de arquitectura, así que no hay nada
que resguardar de ahí. (Ver `origen/ROADMAP.md`, sección "Deuda técnica
conocida".)

## Regla — ESTE DIRECTORIO ES INMUTABLE

**No editar, actualizar, corregir ni sincronizar con la documentación
activa.** Es historia. Aunque en el futuro haya typos, cambie el
`ROADMAP`, cambie la arquitectura, cambien los criterios, cambie la UI o
se descubra que un documento quedó obsoleto: **este snapshot no se
toca.**

Si en el futuro se necesita otra fotografía documental, crear una **nueva
carpeta de snapshot**:

```
resguardo-documentacion/<AAAA-MM-DD>_<hito>/
```

Nunca sincronizar hacia atrás los snapshots anteriores.

Los documentos activos (los que sí se siguen editando) viven fuera de
`resguardo-documentacion/`, en sus rutas originales.
