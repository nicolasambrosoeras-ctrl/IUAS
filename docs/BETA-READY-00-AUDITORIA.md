# BETA-READY-00 — Auditoría final

Auditoría de cierre pre-beta pública: sin implementar features, sin
tocar criterios hidráulicos, sin tocar el motor (`src/motor/`, `src/motor`
salvo lectura). Alcance: inspección, pruebas dirigidas y clasificación.
Base: `HEAD = 9091abd` (== `origin/main`, árbol limpio al iniciar).

## 1. Veredicto ejecutivo

**LISTO PARA BETA CON 5 AJUSTES**

No se encontró ningún P0 (cálculo incorrecto, pérdida de datos, crash
reproducible en flujo normal, secreto filtrado, o afirmación técnica
engañosa). Los 5 P1 identificados son todos de alcance documental/copy/
config — ninguno requiere tocar el motor hidráulico ni el modelo de
dominio.

## 2. P0 — Bloqueantes

Ninguno.

## 3. P1 — Antes de publicar

| ID | Hallazgo | Acción mínima sugerida |
|---|---|---|
| P1-1 | **Web metadata incompleta.** `index.html` no tiene `<link rel="icon">` (usa el ícono default del navegador — no hay ningún favicon, ni en `public/` ni referenciado), ni `<meta name="description">`, ni Open Graph. `<title>IUAS</title>` y `lang="es"`/viewport sí están bien. Confirmado también en producción (`https://nicolasambrosoeras-ctrl.github.io/IUAS/favicon.ico` → 404). | Agregar favicon real de IUAS + meta description antes de compartir el link ampliamente. |
| P1-2 | **Versión desincronizada.** `package.json` (`"version": "0.1.0"`) y `src/version.ts` (`VERSION_APP = '0.1.0'`, usado tanto en el envelope `.iuas` como en el PDF de memoria) no reflejan el avance real del proyecto: existen tags `v0.4.0-beta.1` … `v0.4.0-beta.5`. Además la UI muestra el aviso "Versión piloto" (`MotorDemandaPantalla.tsx`), copy que el propio propietario ya identificó como candidata a cambiar. | Definir versión real de release (ver §34/§28) y sincronizar `package.json`/`version.ts`; cambiar copy "Versión piloto" → "Versión beta" en el release. |
| P1-3 | **Sin archivo `LICENSE` en un repo público.** `package.json` declara `"license": "UNLICENSED"` + `"private": true`, pero el repo es público en GitHub y sirve su código fuente completo vía Pages. No hay footer con copyright ni el README menciona licencia. Esto no es un bug técnico: es una decisión de producto pendiente del propietario (código abierto vs. todos los derechos reservados explícito). | Decisión del propietario: elegir licencia (o declarar explícitamente "todos los derechos reservados, código visible por transparencia") antes de publicitar la beta ampliamente. |
| P1-4 | **README sin sección para usuario final.** El README explica bien cómo desarrollar/testear IUAS, pero no dice (para quien sólo va a *usar* la app) qué guarda localmente (`localStorage` del navegador), cómo exportar/llevar el proyecto a otra máquina, ni el alcance/limitaciones técnicas — información que hoy sólo vive dentro de la propia UI (aviso "Versión piloto") o en el código. | Agregar una sección corta orientada a usuario final en el README (qué es, qué guarda, cómo exportar, alcance). |
| P1-5 | **"Generar memoria técnica" no tiene defensa propia contra `n=0`, y no existe manejo de errores en ninguna parte de la app.** Ver §13 para el detalle completo de la investigación. En el **flujo de UI actual** esto **no es reproducible**: se verificó con test dirigido que (a) un proyecto enteramente vacío ya bloquea el botón (`demandaValida=false` por el error `proyectoSinArtefactosComputables`), y (b) agregar un Local vacío a un proyecto que ya tiene otros artefactos **no** crashea (`n` se calcula sobre el total del proyecto, no por Local — confirmado empíricamente). El riesgo real es estructural: `resolverDatosDeInforme`/`generarDocumentoPdf` no tienen ningún `try/catch` propio y confían 100% en que el único llamador actual (el botón) ya filtró el estado inválido; y no existe ningún `ErrorBoundary` en toda la aplicación, así que cualquier excepción futura en cualquier flujo (no sólo REPORT) queda como excepción no manejada visible sólo en la consola del navegador, indistinguible de "no pasa nada" para el usuario. | No arreglar en este slice (según brief). Evaluar en un slice dedicado (`BETA-ERROR-HANDLING-01`, ver §12) un patrón mínimo de manejo de errores visible (toast/callout) reutilizable, empezando por blindar el botón de memoria. |

## 4. P2 — Post-beta

- **Mecanismo de migración de schema (`.iuas`) nunca ejercitado con un caso real.** El array `migraciones: Migracion[]` en `modelo/proyecto/migraciones/index.ts` está vacío hoy porque todo campo nuevo (incl. `hfEquipoACS_mca`) se diseñó opcional/backward-compatible sin necesitar bump de versión. El camino de código para aplicar una migración real existe pero no tiene ningún test end-to-end que lo ejercite con un cambio no trivial (ej. renombrar un campo obligatorio). No es un problema hoy; es una advertencia para el día en que haga falta una migración de verdad.
- **Test `PERF-SCALE-01C` (`resolucionesDeDimensionamientoPorEdicion.regresion.test.ts`) hace timeout intermitente a 5s bajo la suite completa.** Investigado a fondo: NO es flakiness aleatoria — es margen insuficiente. Aislado, el test corre consistentemente en 2.7–3.6s (nunca cerca del límite); en la suite completa, la contención de CPU entre workers de Vitest lo empuja sistemáticamente por encima de 5000ms (falló 2/2 veces en la corrida completa). La app real no es lenta: el test mide deliberadamente una comparación cara (recorrido completo dos veces, sin memoización, sobre 14 UF) para verificar reducción relativa de cálculos, no tiempo absoluto de uso real. Clasificado P2 técnico (no señal de lentitud real de producto) — recomendación: subir el `testTimeout` de ese test puntual (15–20s) en un slice de QA, sin tocar el motor.
- **ESLint: 11 errores** (0 warnings) — variables no usadas prefijadas con `_` en `actualizarRedHidraulica.ts`/`MotorDemandaPantalla.tsx`/un test, 2 de `react-refresh/only-export-components`, 1 `no-loss-of-precision` en un literal de test golden. Bajo riesgo, cosmético.
- **`npm audit`: 3 vulnerabilidades (2 moderate, 1 high)**, todas en devDependencies de testing (`vitest`/`@vitest/mocker`/`nanoid` transitivo) — no llegan al bundle de producción. No urgente.
- **Bundle ~2.3 MB / ~951 kB gzip en un único chunk**, dominado por `pdfmake` cargado de entrada (Vite advierte por chunk >500kB). Ya documentado como deuda no bloqueante en ROADMAP; candidato a lazy-load futuro.
- **`manifest.json`/`robots.txt` ausentes.** No críticos para una SPA de herramienta profesional sin necesidad de instalación PWA ni SEO agresivo.
- **Cobertura de test de integración UI real (montar/desmontar componente simulando refresh) para autosave/Nuevo proyecto/Cargar ejemplo es indirecta** — sólida a nivel de funciones puras de storage (~60 tests unitarios en el dominio de persistencia), pero sin un test que ejercite el ciclo completo UI→autosave→remount. El comportamiento correcto se infiere de que todos pasan por el mismo hook ya testeado, no se verifica de punta a punta.
- **No hay specs E2E dedicados a M3/M4** (cubiertos indirectamente por el fuzz genérico y por `hallazgos.spec.ts`), a diferencia de M2 que sí tiene specs deterministas propios.
- **`ANALYTICS-01`** (analytics anónimo, sin login) — registrado explícitamente como post-beta/lanzamiento opcional, según brief §20/§50.

## 5. Descartado / no hacer

- VIS-TOPO (ya descartado en `2dbe36e`).
- Login/usuarios: confirmado que no bloquean la beta; sólo se reconsideran ante proyectos cloud/sincronización/licencias.
- Repo privado / Cloudflare Pages / backend: mantener arquitectura actual (repo público + GitHub Pages) hasta que exista una razón de producto real para cambiarla.
- Configurar dominio propio ahora: no bloquea la beta técnica; `vite.config.ts` ya parametriza `base` correctamente y no hay URLs absolutas hardcodeadas que rompan una migración futura a `.com.ar`.
- Perfección editorial adicional del PDF: REPORT-POLISH-01/02 quedan cerrados; revalidados sin nuevos hallazgos (ejemplo, proyecto incompleto, `hfEquipoACS`).
- Actualización masiva de dependencias: `npm outdated` no muestra nada crítico en runtime; no se justifica antes de la beta.
- Auditoría WCAG completa / infraestructura multi-browser nueva: fuera del alcance de este slice; sólo Chromium está soportado/documentado hoy.
- Criterios hidráulicos alternativos, VIS-TOPO, biblioteca multi-proyecto: no son requisitos de beta pública.

## 6–9. Estado M1 / M2 / M3 / M4

Sin evidencia nueva que reabra estos módulos. Se toman como cerrados según el estado documentado (M1/M2/M3/M4, Tee Detailed, HYD-EST, fan-out como incompletitud explícita, hfEquipoACS manual, Montantes 5m+|Δz|). No se re-auditó su arquitectura de cálculo en este slice (fuera de alcance: "no tocar motor salvo regresión grave").

## 10. Verificación hidráulica

Sin evidencia nueva. Se mantiene cerrado según HYD-CLOSE-00-AUDITORIA y los criterios ya fijados (CRIT-A2, A4, A8, etc.), confirmados indirectamente durante esta auditoría al leer `calcularSimultaneidad.ts`/`calcularSimultaneidadDeTramo.ts` (comentarios de criterio consistentes con la documentación).

## 11. PERSIST

**Sin P0.** Cobertura fuerte a nivel unitario (~60 tests) en autosave, export/import `.iuas`, Nuevo proyecto, Cargar ejemplo y compatibilidad de schema:

- **Import atómico**: el archivo se lee/parsea/valida completo antes de tocar el estado (`AccionesDeProyecto.tsx`); un import inválido dejar el proyecto actual intacto. 13 tests de import inválido (JSON roto, formato no-IUAS, schema futuro/viejo/ausente, estructura inválida) con mensajes humanos sin stack traces.
- **Nuevo proyecto / Cargar ejemplo**: ambos requieren confirmación, ambos usan factories puras (`crearProyectoVacio()`, `proyectoInicial` + `backfillLongitudesDePredimensionamiento`) sin arrastre de IDs cruzados. Verificado con tests que confirman estructura vacía real y no-arrastre.
- **Compatibilidad hacia atrás**: `hfEquipoACS_mca` es opcional y se probó explícitamente con un archivo simulando ausencia del campo (`roundTrip.test.ts`) — importa sin error, campo queda `undefined` (valor de dominio válido, distinto de `0`).
- **Schema futuro**: rechazado limpiamente en dos niveles (envelope y dominio) con mensajes claros, sin crashear ni intentar procesar.

**Único hueco real (P2, no P1):** no hay un test de integración de UI real (montar componente → editar → desmontar/remontar simulando refresh) para estos 4 flujos; la garantía de "refresh preserva estado" se apoya en que la UI usa las mismas funciones de storage ya testeadas por separado, no en un test end-to-end del ciclo completo.

## 12. REPORT

Cerrado editorialmente (REPORT-POLISH-01/02). No se hizo polish adicional en este slice. Ver §13 para el hallazgo de `n=0`, que es el único pendiente activo de este dominio.

## 13. n=0 / error de generación de memoria

**Reproducción exacta** (siguiendo brief §5, pasos 1-4): confirmado con test dirigido que en el estado actual del código **el botón "Generar memoria técnica" ya está bloqueado** cuando el total de artefactos computables del proyecto es 0 (`demandaValida = false` por el error `proyectoSinArtefactosComputables`, severidad `error`, agregado en `3b05633 fix: bloquear cálculo sin artefactos computables`, previo a este slice). Esto contradice la premisa exacta de la deuda documentada en `PENDIENTES-DE-ARQUITECTURA.md`/`ROADMAP.md` de que el botón sería alcanzable en ese estado — esa deuda parece haberse verificado en su momento llamando directo a `resolverDatosDeInforme` (aislado del árbol de render real), no contra la UI real.

**Escenario más realista del brief** ("crear Local, dejarlo sin artefactos, en un proyecto que ya tiene otros artefactos") también se probó empíricamente: agregar un Local con `artefactos: []` a un proyecto que ya tiene otro Local con artefactos **no** crashea, porque `calcularSimultaneidad` suma `n` sobre **todo el proyecto**, no por Local — el Local vacío sólo dispara un problema de severidad `advertencia` (`proyectoLocalSinArtefactos`), que no bloquea el botón, pero tampoco hace que `n` llegue a 0 globalmente.

**Causa raíz cuando SÍ ocurre** (proyecto entero con n=0, si se lo fuerza saltando el guard, ej. por un bug futuro en la validación): `Error: n debe ser un entero mayor o igual a 1; se recibio 0`, lanzado de forma síncrona en `calcularCoeficienteDeSimultaneidad.ts:13-18` (a propósito — el comentario del código dice explícitamente que `n=0` es "un defecto de programación, no un estado previsible del dominio"), alcanzado desde `resolverDatosDeInforme.ts` → `calcularSimultaneidad.ts:43-45`, sin ningún `try/catch` en el camino, y sin ningún `ErrorBoundary` en la app — quedaría como excepción no manejada en el `onClick`, visible sólo en consola.

**Alcance:** M3 (`resolverEstadoModulo3.ts`) y M4 (`resolverEstadoModulo4.ts`) sí guardan explícitamente `nComputable === 0` antes de llamar al motor de simultaneidad, devolviendo un estado de dominio (`incompleto`) en vez de crashear. **`resolverDatosDeInforme` es el único punto que no tiene guard propio** — hoy está protegido indirectamente porque su único llamador (el botón) ya filtra por `demandaValida`, pero es un punto único de fragilidad transversal (no específico de REPORT) si algún día cambia el llamador o el guard.

**Clasificación: P1** (registrado como P1-5 en §3). No P0 porque no es reproducible hoy en el flujo normal de UI verificado; P1 porque la ausencia total de manejo de errores en la app (ni try/catch puntual, ni ErrorBoundary) es un patrón de riesgo transversal, y la documentación previa de esta deuda estaba desactualizada respecto al estado real del código.

## 14. Responsive

Sin evidencia nueva que reabra BETA-UI-POLISH-01/UX-HIERARCHY-POLISH-01 (ya cerrados). No se re-ejecutó el barrido completo de viewports en este slice (no se detectó ninguna señal en código que lo justifique); se toma como vigente el estado ya validado.

## 15. Proyecto grande

Existe generador programático de escala (`src/pruebas/escala/generarProyectoDeEscala.ts`) con presets **M (14 UF)**, **L (40 UF)**, **XL (100 UF)**, usado extensivamente en tests de regresión de motor — cubre y excede el objetivo de ~30 UF a nivel de cálculo. **Hueco (ya reflejado como P2 en §4):** no hay un spec E2E que ejercite esa escala contra la UI real (los E2E existentes usan pocas UF) — es un hueco de cobertura, no un hallazgo de fallo.

## 16. Web / metadata

Ver P1-1 (§3): falta favicon real, meta description, Open Graph. `title`/`lang`/`viewport` correctos. `manifest.json`/`robots.txt` ausentes (P2, no crítico).

## 17. Deploy / dominio

Producción verificada en vivo: `https://nicolasambrosoeras-ctrl.github.io/IUAS/` → HTTP 200, JS/CSS del build actual → HTTP 200 (sin bundle viejo servido), sin `.map` publicados (sourcemaps deshabilitados por default en Vite, no se activaron). Workflow de deploy (`deploy.yml`) es el oficial de Vite para GitHub Pages, sin secretos hardcodeados, con Actions ancladas por hash. `vite.config.ts` parametriza `base` en `/IUAS/` sólo en build; no hay URLs absolutas hardcodeadas que compliquen pasar a dominio propio (`.com.ar`) más adelante — bien resuelto de antemano.

## 18. Privacidad

Confirmado: frontend 100% cliente. `dependencies` de runtime son sólo `react`, `react-dom`, `pdfmake` — ninguna es un SDK de analytics/backend. Sin `fetch`/`axios`/`XMLHttpRequest` a servicios externos en `src/`. Proyectos se guardan en `localStorage` del navegador; `.iuas` se exporta/importa localmente. Sin backend propio, sin analytics actual. Punto positivo real para comunicar en README/beta (ver P1-4).

## 19. Seguridad / secretos

Sin hallazgos. Búsqueda de `API_KEY|SECRET|TOKEN|PASSWORD|PRIVATE_KEY` en el repo (excluyendo `node_modules`) no encontró ningún secreto real — sólo nombres de test/documentación no relacionados (tokens de diseño UI). Sin `.env` trackeado. Workflow de deploy usa sólo permisos OIDC estándar, sin secretos literales.

## 20. Repo público / código

Decisión de producto ya tomada (beta inicial con repo público): no se marca P0/P1 por eso en sí mismo. Ver P1-3 para la ausencia de `LICENSE`, que sí es una decisión pendiente distinta (declarar intención de licencia, no privatizar el repo).

## 21. Licencia

Ver P1-3 (§3). `package.json` dice `"license": "UNLICENSED"` + `"private": true`, inconsistente con la exposición real (repo público + código servido vía Pages). No existe `LICENSE`/`LICENSE.md`. Requiere una decisión del propietario, no una implementación técnica.

## 22. Analytics

Confirmado no bloqueante. Registrado como `ANALYTICS-01`, post-beta, sin necesidad de login (ver §4).

## 23. Login / usuarios

Confirmado no bloqueante (ver §5 de "Descartado / no hacer").

## 24. Accesibilidad básica

No se hizo auditoría WCAG completa (fuera de alcance). Verificación superficial: hay uso de `aria-expanded`/`aria-label` en 13 archivos de `src/interfaz/` — hay una base de accesibilidad, no una ausencia total. Sin hallazgos graves detectados en esta pasada superficial.

## 25. QA

- `npx tsc -b` → **limpio**.
- `npm run build` → **limpio**, 850ms, bundle 2.3MB (951KB gzip) en un chunk (warning de Vite por tamaño, ya documentado como deuda no bloqueante).
- `npx vitest run` → **1981 passed, 1 failed** de 1982 (el fallo es el timeout intermitente de `PERF-SCALE-01C` bajo contención de suite completa — ver §4, P2 técnico, no señal de lentitud real).
- `npx eslint .` → **11 errores, 0 warnings** (variables no usadas y organización de exports, bajo riesgo).
- E2E: no se re-ejecutó la suite completa en este slice (auditoría, no gate de regresión); se revisó el catálogo de 22 specs existentes (ver §26).
- Fuzz: no se re-ejecutó un gate de fuzz completo en este slice (no hubo cambio de motor que lo justifique); se documentó el comando para reproducir seed 424242 desktop+mobile si se necesita antes del release (`IUAS_FUZZ_SEED=424242 IUAS_FUZZ_RUNS=20 IUAS_FUZZ_STEPS=30 npm run e2e:fuzz`).
- Producción real: verificada por HTTP (ver §17).

## 26. Matriz de flujos

| Flujo | Desktop | Mobile | Persistencia | Error visible | Estado |
|---|---|---|---|---|---|
| Nuevo proyecto | Spec dedicado (`nuevo-proyecto.spec.ts`) | Cubierto (proyecto `mobile` de Playwright) | Testeado (factory pura + confirmación) | Confirmación previa, sin hallazgos | Cerrado |
| Cargar ejemplo | Spec dedicado (`cargar-proyecto-de-ejemplo.spec.ts`) | Cubierto | Testeado | Confirmación previa, sin hallazgos | Cerrado |
| M1 | Cubierto (`multi-uf`, `multinivel`, `cotas-heredadas`, etc.) | Cubierto | N/A directo (vía autosave) | Guard `proyectoSinArtefactosComputables` ya bloquea estado inválido | Cerrado |
| M2 | Specs propios (`escala-verificacion`, `montantes`, `m2-resp-polish`) | Cubierto | N/A directo | — | Cerrado |
| M3 | Sin spec dedicado; cubierto por fuzz genérico | Vía fuzz | N/A directo | Guard `nComputable===0` en el motor | P2: falta spec determinista propio |
| M4 | Sin spec dedicado; cubierto por fuzz genérico | Vía fuzz | N/A directo | Guard `nComputable===0` en el motor | P2: falta spec determinista propio |
| Verificación | `hydEst.spec.ts`, `hydAcsDisclosure.spec.ts` | Vía fuzz | N/A directo | — | Cerrado |
| Autosave | Sin spec de integración UI dedicado; unit tests fuertes de storage | — | ~60 tests unitarios en dominio persistencia | — | P2: falta test de integración UI (montar/refresh) |
| Export | `persistencia.spec.ts` | Cubierto | Testeado (roundtrip) | — | Cerrado |
| Import | `persistencia.spec.ts` | Cubierto | Testeado (13 casos de import inválido, atómico) | Mensajes humanos claros, sin stack traces | Cerrado |
| Memoria (REPORT) | `reportPolish.spec.ts` | Vía fuzz | N/A | **Sin manejo de errores propio** (ver §13, P1-5) | P1 |
| Proyecto grande | Sólo a nivel motor (presets M/L/XL) | — | N/A | — | P2: falta spec E2E de escala real |

## 27. Matriz de hallazgos

| ID | Hallazgo | Evidencia | Impacto | Clasificación | Acción mínima |
|---|---|---|---|---|---|
| P1-1 | Sin favicon/meta description/OG | `index.html`, prod HTTP 404 en favicon | Profesionalismo al compartir el link | P1 | Agregar favicon + description |
| P1-2 | Versión/tags/copy piloto desincronizados | `package.json`, `version.ts`, `git tag` | Confianza/coherencia de versión mostrada | P1 | Sincronizar versión + copy "beta" en release |
| P1-3 | Sin LICENSE en repo público | raíz del repo, `package.json` | Decisión legal pendiente | P1 | Decisión del propietario |
| P1-4 | README sin sección usuario final | `README.md` | Comprensión de usuarios no-dev | P1 | Agregar sección corta |
| P1-5 | REPORT/n=0 sin guard propio + sin manejo de errores transversal | `resolverDatosDeInforme.ts`, `calcularCoeficienteDeSimultaneidad.ts`, ausencia de `ErrorBoundary` | Riesgo latente transversal (no reproducible hoy) | P1 | Slice dedicado `BETA-ERROR-HANDLING-01` |
| P2-1 | Migraciones de schema nunca ejercitadas con caso real | `migraciones/index.ts` (array vacío) | Riesgo latente futuro | P2 | Ninguna ahora |
| P2-2 | Test `PERF-SCALE-01C` timeout intermitente bajo contención de CI | corrida completa vs. aislada | Ninguno en producto real | P2 técnico | Subir `testTimeout` puntual |
| P2-3 | ESLint 11 errores (unused vars, exports) | `eslint .` | Cosmético | P2 | Limpieza menor |
| P2-4 | `npm audit`: 3 vulns en devDependencies | `npm audit` | No llega a producción | P2 | `npm audit fix` cuando sea cómodo |
| P2-5 | Bundle 2.3MB monolítico (pdfmake) | `npm run build` | Carga inicial | P2 | Lazy-load futuro (ya documentado) |
| P2-6 | Sin specs E2E dedicados M3/M4 y sin spec de escala real | catálogo de 22 specs | Cobertura | P2 | Specs futuros si se justifica |
| P2-7 | ANALYTICS-01 | — | — | P2 | Post-beta, sin login |

## 28. Roadmap mínimo hasta beta

1. **`BETA-WEB-METADATA-01`** — favicon real + meta description + sincronizar versión (`package.json`/`version.ts`) + copy "Versión piloto" → "Versión beta". (P1-1, P1-2)
2. **`BETA-LICENSE-01`** — decisión del propietario sobre licencia del código IUAS (repo público sin `LICENSE` hoy). (P1-3)
3. **`BETA-DOCS-USUARIO-01`** — sección de README orientada a usuario final (qué guarda, cómo exportar, alcance). (P1-4)
4. **`BETA-ERROR-HANDLING-01`** (opcional, puede diferirse post-beta.1 si se prioriza velocidad) — patrón mínimo de manejo de errores visible, empezando por blindar "Generar memoria técnica" con su propio guard/try-catch. (P1-5)
5. **`BETA-RELEASE-01`** — tag/versión real, checklist final, confirmar producción tras el merge de los slices anteriores.

Máximo 4-5 slices antes de la beta, dentro del rango esperado por el brief (§47).

## 29. Checklist de release

- [ ] Favicon + meta description + versión sincronizada + copy "beta" (BETA-WEB-METADATA-01)
- [ ] Decisión de licencia tomada y reflejada en el repo (BETA-LICENSE-01)
- [ ] README con sección de usuario final (BETA-DOCS-USUARIO-01)
- [ ] (Opcional pre-beta.1, si se prioriza) Guard propio + manejo de errores mínimo en Generar memoria (BETA-ERROR-HANDLING-01)
- [ ] Tag de versión real elegido según historial (`v0.4.0-beta.6` o el siguiente que corresponda — ver tags existentes hasta `v0.4.0-beta.5`)
- [ ] Confirmar producción HTTP 200 tras el último merge
- [ ] Mantener Remote Control activo durante push/deploy final
