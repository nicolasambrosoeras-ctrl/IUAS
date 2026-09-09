// Invariantes que se comprueban DESPUES DE CADA ACCION (brief §13, §14).
// Esta capa habla con Playwright: toma una MUESTRA del DOM en vivo y le
// aplica los predicados puros (deteccionBlanco, tokensProhibidos) mas los
// errores acumulados por el RecolectorDeErrores.
import type { Page } from '@playwright/test'
import type { ResultadoInvariante } from './tipos'
import { evaluarPantalla, type MuestraDePantalla } from './deteccionBlanco'
import {
  buscarValoresRotos,
  buscarIdsInternos,
  buscarCodigosDeValidacion,
} from './tokensProhibidos'
import type { RecolectorDeErrores } from './errores'

export type MuestraDom = MuestraDePantalla & {
  readonly textoRoot: string
  readonly scrollWidth: number
  readonly clientWidth: number
  readonly tieneQc: boolean
  readonly tieneBloqueoDemanda: boolean
  readonly seccionDemandaPresente: boolean
}

// Se ejecuta DENTRO del navegador. Sin dependencias del bundle de la app:
// solo DOM. El marcador "IUAS" se busca en el texto del root; la
// navegacion reconocible = existe <nav> o headings de etapa.
export async function tomarMuestraDom(page: Page): Promise<MuestraDom> {
  return page.evaluate(() => {
    const root =
      document.querySelector('#root') ??
      document.querySelector('main.app-contenido') ??
      document.querySelector('main')
    const texto = (root instanceof HTMLElement ? root.innerText : document.body.innerText) ?? ''
    const textoUtil = texto.replace(/\s+/g, ' ').trim()
    const nodos = root ? root.querySelectorAll('*').length : 0
    const rect = root instanceof HTMLElement ? root.getBoundingClientRect() : null
    const nav = document.querySelector('nav')
    const headingsEtapa = document.querySelectorAll('.etapa-cabecera, .seccion-de-trabajo, [class*="etapa"]')
    const de = document.documentElement

    return {
      rootPresente: root !== null,
      nodosEnRoot: nodos,
      textoUtilEnRoot: textoUtil.length,
      marcadorIuas: /IUAS/.test(textoUtil),
      navegacionReconocible: nav !== null || headingsEtapa.length > 0,
      altoContenidoPx: rect ? Math.round(rect.height) : 0,
      textoRoot: textoUtil.slice(0, 20000),
      scrollWidth: de.scrollWidth,
      clientWidth: de.clientWidth,
      tieneQc: /Caudal de c[aá]lculo\s*·\s*Qc/i.test(textoUtil),
      tieneBloqueoDemanda: /No se puede calcular la demanda todav[ií]a/i.test(textoUtil),
      seccionDemandaPresente: document.querySelector('#demanda') !== null,
    }
  })
}

export type OpcionesInvariantes = {
  /** Comprobar la invariante condicional J (M1/Qc no debe desaparecer). */
  readonly exigirDemandaViva?: boolean
}

// HALLAZGOS YA CONOCIDOS (brief §39/§48/§61). NO es supresión: son bugs de
// app YA reproducidos y documentados, con su deuda abierta. Se excluyen de
// las invariantes SÓLO para que el fuzzer siga avanzando y encuentre bugs
// NUEVOS en vez de detenerse siempre en el mismo. Cada hallazgo nuevo (que
// no matchee estos patrones) sigue rompiendo el run.
export const HALLAZGOS_CONOCIDOS: readonly { patron: RegExp; deuda: string; nota: string }[] = [
  {
    patron: /redHidraulicaTramoLongitudNoPositiva/,
    deuda: 'FIX-LEAK-01',
    nota:
      'PanelDeMedidoresDeModulo3, rama estado "error": pinta problema.problema.codigo crudo ' +
      'en vez de un mensaje humano. Repro: iniciar M3 + PH + ACS central + tramo con longitud 0.',
  },
]

function esHallazgoConocido(texto: string): { deuda: string; nota: string } | null {
  for (const h of HALLAZGOS_CONOCIDOS) {
    if (h.patron.test(texto)) return { deuda: h.deuda, nota: h.nota }
  }
  return null
}

export async function verificarInvariantes(
  page: Page,
  errores: RecolectorDeErrores,
  opciones: OpcionesInvariantes = {},
): Promise<ResultadoInvariante[]> {
  const resultados: ResultadoInvariante[] = []
  let muestra: MuestraDom
  try {
    muestra = await tomarMuestraDom(page)
  } catch (e) {
    // Si ni siquiera se puede evaluar en la pagina, la mayoria de las
    // veces es que el contexto se cerro / navego: eso es un fallo de APP
    // (la pagina se rompio) salvo que el test ya haya terminado.
    return [
      {
        nombre: 'muestra-dom',
        ok: false,
        clase: 'APP',
        detalle: `No se pudo inspeccionar la pagina: ${(e as Error).message}`,
      },
    ]
  }

  // B + E + identidad (brief §13-A/B/E, §14).
  const pantalla = evaluarPantalla(muestra)
  resultados.push({
    nombre: 'pantalla-no-blanca',
    ok: !pantalla.blanca,
    clase: 'APP',
    detalle: pantalla.blanca ? pantalla.motivo : undefined,
  })

  // C: sin pageerror nuevo.
  // D: sin console.error nuevo.
  // NETWORK: sin pedido esencial fallido nuevo.
  const nuevos = errores.nuevos()
  resultados.push({
    nombre: 'sin-pageerror',
    ok: nuevos.pageerror.length === 0,
    clase: 'APP',
    detalle:
      nuevos.pageerror.length === 0
        ? undefined
        : nuevos.pageerror.map((p) => p.mensaje).join(' | '),
  })
  resultados.push({
    nombre: 'sin-console-error',
    ok: nuevos.consola.length === 0,
    clase: 'APP',
    detalle:
      nuevos.consola.length === 0 ? undefined : nuevos.consola.map((c) => c.texto).join(' | '),
  })
  resultados.push({
    nombre: 'sin-request-esencial-fallido',
    ok: nuevos.pedidosEsenciales.length === 0,
    clase: 'NETWORK',
    detalle:
      nuevos.pedidosEsenciales.length === 0
        ? undefined
        : nuevos.pedidosEsenciales.map((p) => `${p.falla} ${p.url}`).join(' | '),
  })

  // Helper: separa hallazgos NUEVOS de los YA CONOCIDOS (deuda abierta).
  const evaluarTokens = (
    nombre: string,
    hallazgos: readonly { token: string; contexto: string }[],
  ): void => {
    const nuevos = hallazgos.filter((h) => !esHallazgoConocido(`${h.token} ${h.contexto}`))
    const conocidos = hallazgos.filter((h) => esHallazgoConocido(`${h.token} ${h.contexto}`))
    resultados.push({
      nombre,
      ok: nuevos.length === 0,
      clase: 'APP',
      detalle: nuevos.length === 0 ? undefined : nuevos.map((h) => `${h.token} « ${h.contexto} »`).join(' | '),
    })
    if (conocidos.length > 0) {
      const deudas = [...new Set(conocidos.map((h) => esHallazgoConocido(`${h.token} ${h.contexto}`)?.deuda))].join(', ')
      resultados.push({
        nombre: `${nombre}·hallazgo-conocido`,
        ok: true,
        clase: 'APP',
        detalle: `hallazgo ya documentado (${deudas}); no detiene el fuzz`,
      })
    }
  }

  // F: valores rotos visibles.
  evaluarTokens('sin-valores-rotos', buscarValoresRotos(muestra.textoRoot))
  // G: ids internos (uf-<uuid>) visibles fuera de superficie de diagnostico.
  evaluarTokens('sin-ids-internos-visibles', buscarIdsInternos(muestra.textoRoot))
  // H: codigos internos de validacion visibles.
  evaluarTokens('sin-codigos-de-validacion-visibles', buscarCodigosDeValidacion(muestra.textoRoot))

  // I: sin overflow horizontal global en el viewport actual (tolerancia 2px).
  const overflow = muestra.scrollWidth - muestra.clientWidth
  resultados.push({
    nombre: 'sin-overflow-horizontal',
    ok: overflow <= 2,
    clase: 'APP',
    detalle: overflow <= 2 ? undefined : `scrollWidth ${muestra.scrollWidth} > clientWidth ${muestra.clientWidth} (+${overflow}px)`,
  })

  // J (condicional): un error downstream no debe borrar M1/Qc mientras la
  // seccion Demanda sigue estructuralmente presente.
  if (opciones.exigirDemandaViva) {
    const demandaViva = muestra.seccionDemandaPresente && (muestra.tieneQc || muestra.tieneBloqueoDemanda)
    resultados.push({
      nombre: 'demanda-sigue-viva',
      ok: demandaViva,
      clase: 'APP',
      detalle: demandaViva
        ? undefined
        : 'La seccion Demanda perdio a la vez el resultado Qc y el bloque de bloqueo de validacion.',
    })
  }

  return resultados
}

export function primerFallo(resultados: readonly ResultadoInvariante[]): ResultadoInvariante | null {
  return resultados.find((r) => !r.ok) ?? null
}
