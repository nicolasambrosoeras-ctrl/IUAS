# BETA-WEB-METADATA-01

## Problema

`BETA-READY-00` (D-δ.135) cerró la auditoría final pre-beta con veredicto
"LISTO PARA BETA CON 5 AJUSTES" y 0 P0. Dos de los cinco P1 quedaban dentro
del alcance de este slice:

- **P1-1** — `index.html` sin metadata pública real: sin favicon (404 en
  producción), sin `<meta name="description">`, sin Open Graph. El `<title>`
  era sólo `IUAS`, sin valor para pestaña/buscador/enlace compartido.
- **P1-2 (parte versión/copy)** — `package.json` y `src/version.ts` seguían
  en `0.1.0` mientras el repo ya tenía tags reales `v0.4.0-beta.1` a
  `v0.4.0-beta.5`; y el callout visible de autoguardado decía "Versión
  piloto", copy de desarrollo interno inapropiado para una beta pública.

Los otros tres P1 (LICENSE, README de usuario final, manejo de errores
estructural) quedan fuera de este slice: son `BETA-LICENSE-01`,
`BETA-DOCS-USUARIO-01` y `BETA-ERROR-HANDLING-01` respectivamente.

## Metadata

Se agregó a `index.html`:

- `<title>IUAS — Instalaciones internas de agua</title>` (antes: `IUAS`
  a secas).
- `<meta name="description">` en español, sin tono publicitario ni
  afirmaciones no verificables (132 caracteres, dentro del rango
  120–170 recomendado).
- Open Graph básico: `og:title`, `og:description`, `og:type=website`,
  `og:site_name=IUAS`.
- `<meta name="twitter:card" content="summary">` (trivial, sin imagen).
- `<meta name="theme-color" content="#1a6b53">`, usando exactamente el
  verde `--color-primario` ya definido en `sistema-visual.css` -- no se
  inventó un color nuevo.

Deliberadamente **no** se agregó:

- `og:image` -- no existe ningún asset de marca apropiado; no se generó
  ninguno para no inventar un logo institucional.
- `og:url` / `<link rel="canonical">` -- el usuario planea comprar un
  dominio `.com.ar` propio; hardcodear la URL actual de GitHub Pages como
  identidad permanente obligaría a tocarlo de nuevo apenas exista el
  dominio. Queda diferido a `BETA-RELEASE`/adopción de dominio.
- `robots.txt` / meta `robots` -- no existían antes; la beta es pública e
  indexable por default, así que no hacía falta agregar nada (mucho menos
  `noindex`).
- manifest de PWA -- fuera de alcance, no es deuda.

`lang="es"` y el `<meta name="viewport">` estándar (sin
`user-scalable=no`) ya existían y se dejaron sin tocar.

## Favicon

Auditoría previa: no existía ningún asset de marca (`favicon`, `logo`,
`iuas.svg`) en el repo, ni carpeta `public/`. Confirmado también en
producción: la request de favicon devolvía 404.

Sin identidad gráfica oficial disponible, se creó únicamente un ícono
funcional mínimo -- no un logotipo institucional nuevo -- en
`public/favicon.svg`: un cuadrado redondeado en el verde
`--color-primario` (`#1a6b53`) con una "I" blanca centrada, legible a
16/32px. Vector puro, sin fuentes externas ni imágenes generadas.

Se referencia en `index.html` como:

```html
<link rel="icon" type="image/svg+xml" href="%BASE_URL%favicon.svg" />
```

`%BASE_URL%` es el placeholder de Vite que Vite reemplaza en build por el
`base` configurado (`/IUAS/` en producción, `/` en dev) -- confirmado
inspeccionando `dist/index.html` tras `npm run build`, donde queda
`href="/IUAS/favicon.svg"`. `public/favicon.svg` se copia sin transformar
a la raíz de `dist/`. Esto evita hardcodear `/IUAS/` y sigue funcionando
sin cambios el día que la app pase a servirse en la raíz de un dominio
propio.

## Versión

Se auditaron las fuentes de versión existentes:

- `package.json.version` y `src/version.ts` (`VERSION_APP`) estaban ambos
  en `0.1.0`, desincronizados de los tags reales del repo
  (`v0.4.0-beta.1` .. `v0.4.0-beta.5`).
- `VERSION_APP` ya era la única fuente de verdad de la APLICACIÓN dentro
  del código (comentario de PERSIST-01 en `src/version.ts`): la consumen
  `calcularSimultaneidad.ts` (metadatos de cálculo, de ahí llega a la
  memoria PDF vía `resolverDatosDeInforme`/`generarDocumentoPdf`) y
  `serializarProyecto.ts` (envelope `.iuas`, campo `appVersion`).
  `package.json.version` no lo consume ningún código de la app -- sólo
  tooling (`npm`).

A partir del último tag real (`v0.4.0-beta.5`, sin `beta.6` existente) la
versión objetivo de este slice es **`0.4.0-beta.6`**. Se actualizó:

- `package.json` vía `npm version 0.4.0-beta.6 --no-git-tag-version`
  (sincroniza `package-lock.json` automáticamente; no crea tag ni commit).
- `src/version.ts` (`VERSION_APP`) al mismo valor, a mano -- no existe
  tooling que derive uno del otro, y no se justificaba introducirlo sólo
  para este slice (una constante duplicada, ahora cubierta por test).

**Este slice NO crea el tag `v0.4.0-beta.6`.** El tag se crea recién en
`BETA-RELEASE-01`, cuando la app efectivamente se publica con este
código.

Se agregó `src/version.test.ts`, que fija la invariante hacia adelante:
`VERSION_APP` debe coincidir siempre con `package.json.version` y no puede
volver a quedar en el placeholder `0.1.0`. Se agregó también un test en
`generarDocumentoPdf.test.ts` que confirma que la memoria de cálculo
informa la versión sincronizada (`Versión de la aplicación: ${VERSION_APP}.`)
en vez de un valor hardcodeado.

## Copy beta

El callout de autoguardado en `MotorDemandaPantalla.tsx` decía "Versión
piloto" (copy de desarrollo interno). Se cambió a:

> Versión beta · El proyecto se guarda automáticamente en este navegador.
> Para llevarlo a otra computadora o guardarlo aparte, usá "Exportar
> proyecto".

Sin agregar párrafos ni disclaimers nuevos -- "Versión beta" alcanza en la
UI principal; una explicación más extensa de qué implica la beta queda
para `BETA-DOCS-USUARIO-01` (README/documentación de usuario). El resto
del layout del callout no cambió.

## Compatibilidad GitHub Pages

`vite.config.ts` ya usaba `base: '/IUAS/'` en build de producción. Se
verificó explícitamente que nada de lo agregado rompe ese esquema:

- El favicon usa `%BASE_URL%favicon.svg`, no una ruta absoluta
  hardcodeada -- confirmado en `dist/index.html` (`/IUAS/favicon.svg`).
- No se agregó `og:url` ni `canonical` apuntando a
  `https://nicolasambrosoeras-ctrl.github.io/IUAS/`.
- No se agregó ningún asset con ruta absoluta `/IUAS/...` fuera del
  mecanismo de Vite.

## Preparación dominio propio

El usuario planea comprar un dominio `.com.ar`. Nada de este slice queda
atado a la URL actual de GitHub Pages:

- Sin `og:url` hardcoded.
- Sin `canonical` hardcoded.
- El favicon se resuelve vía `base` de Vite, no vía ruta absoluta del
  dominio actual.

El día que exista el dominio definitivo, agregar `og:url`/`canonical` es
un cambio de una línea, sin tocar nada de lo hecho acá.

## Fuera de alcance

Explícitamente no tocados en este slice (quedan para incrementos
posteriores ya identificados en `BETA-READY-00`):

- `LICENSE` / política de licencia (`BETA-LICENSE-01`). `package.json`
  sigue con `"license": "UNLICENSED"` y `"private": true` -- `npm
  version` no los tocó.
- README orientado a usuario final (`BETA-DOCS-USUARIO-01`).
- Manejo de errores estructural / `ErrorBoundary` (`BETA-ERROR-HANDLING-01`).
- Analytics, trackers, Google Fonts, cualquier script externo -- la app
  sigue 100% client-side, sin backend, sin analytics.
- Cambios de UX estructurales, hidráulica, motor, PERSIST, layout de
  REPORT.
- Creación del tag `v0.4.0-beta.6` (se crea en `BETA-RELEASE-01`).
