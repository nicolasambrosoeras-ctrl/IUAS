# Backups del proyecto IUAS

Registro técnico de copias de seguridad físicas completas del repositorio,
realizadas fuera del control de versiones como salvaguarda adicional a Git/GitHub.

---

## BACKUP-01 — Pre PERSIST-01

### Fecha

2026-09-13, 09:23:34 (hora local).

### Motivo

Checkpoint físico completo antes de incorporar persistencia, autosave y el
formato de archivo `.iuas` (PERSIST-01).

### Estado funcional en el momento del backup

- REPORT-01 cerrado.
- REPORT-01A / REPORT-01B / REPORT-01C cerrados.
- FIX-REPORT-01C-VISUAL-01 cerrado.
- Memoria de cálculo completa (M1–M4) validada visualmente.
- Suite de tests: Vitest 1837/1837.

### Git

- Branch: `main`
- HEAD completo: `ae06b6d6710d228e803670d7b9a9963712fb11e1`
- origin/main completo: `ae06b6d6710d228e803670d7b9a9963712fb11e1`
- HEAD corto: `ae06b6d`
- Árbol de trabajo: limpio (sin cambios pendientes)

### Fuente

`C:\Users\ambroso\Desktop\Proyectos\iuas-1`

### Archivo de backup

`C:\Users\ambroso\Desktop\Proyectos\_backups\iuas-1_FULL_20260913-092334_ae06b6d.tar.gz`

### Alcance

Backup físico completo del directorio `iuas-1`, incluido `.git` y todo archivo
presente físicamente en el directorio (trackeado o no por Git), generado con
`tar.exe` desde el directorio padre del repositorio.

### Tamaño

- 54.260.237 bytes
- 51,75 MiB (≈ 0,051 GiB)

### SHA-256

```
2D701DADACB236155DF21EA80AD67F97B33D7DA80709F2355FF18912EAD33D35
```

### Verificación de contenido

Se listó el contenido completo del tarball (`tar.exe -tzf`, 9.519 entradas) y
se confirmó expresamente la presencia de:

- `iuas-1/.git/HEAD`
- `iuas-1/.git/config`
- `iuas-1/package.json`
- `iuas-1/src/`
- `iuas-1/docs/`
- `iuas-1/node_modules/` (8.440 entradas — existía en el source)
- `iuas-1/dist/` (5 entradas — existía en el source)
- Archivos representativos recientes: `iuas-1/ROADMAP.md`,
  `iuas-1/src/normativa/eras-2023/CRITERIOS.md`

Test de integridad mínimo: `tar.exe -tzf` sobre el archivo completo terminó
con exit code 0.

Tras generar el backup se verificó que el repositorio de origen no fue
alterado: `git status --short` vacío y `git rev-parse HEAD` sigue en
`ae06b6d6710d228e803670d7b9a9963712fb11e1`.

### Git bundle

Salvaguarda adicional del historial Git (no sustituye al backup físico completo):

- Ruta: `C:\Users\ambroso\Desktop\Proyectos\_backups\iuas-1_GIT_20260913-092334_ae06b6d.bundle`
- Tamaño: 2.364.736 bytes (≈ 2,25 MiB)
- Verificación: `git bundle verify` → OK. Contiene 14 refs (`main`,
  `origin/HEAD`, `origin/main` y 11 tags), historial completo, HEAD en
  `ae06b6d6710d228e803670d7b9a9963712fb11e1`.

### Restauración

Procedimiento resumido (no ejecutado como parte de este checkpoint):

1. Mover o renombrar cualquier directorio `iuas-1` existente en
   `C:\Users\ambroso\Desktop\Proyectos`.
2. Ubicarse en `C:\Users\ambroso\Desktop\Proyectos`.
3. Extraer el archivo `iuas-1_FULL_20260913-092334_ae06b6d.tar.gz`
   (por ejemplo, con `tar.exe -xzf`).
4. Comprobar `git status` y `git rev-parse HEAD` dentro del `iuas-1`
   restaurado; debe coincidir con `ae06b6d6710d228e803670d7b9a9963712fb11e1`.
5. Reinstalar/reconstruir dependencias (`node_modules`, `dist`) sólo si fuera
   necesario — el tarball ya las incluye tal como estaban en el momento del
   backup.

Como vía alternativa de recuperación del historial Git (sin los archivos de
trabajo, `node_modules` ni `dist`), puede usarse el bundle:
`git clone iuas-1_GIT_20260913-092334_ae06b6d.bundle iuas-1`.

### Nota sobre el HEAD del checkpoint

El backup físico y el bundle corresponden al HEAD previo a este mismo commit
documental (`ae06b6d`). El commit que registra esta entrada en
`docs/BACKUPS.md` tendrá, naturalmente, un HEAD posterior distinto.
