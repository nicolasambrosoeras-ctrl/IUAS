// Captura de errores de runtime (brief §15). Se engancha a `page.on(...)`
// al comienzo de cada run y acumula:
//   - console.error  -> siempre relevante
//   - pageerror      -> siempre relevante (excepcion no atrapada)
//   - requestfailed  -> se registra; falla solo si el recurso es ESENCIAL
//
// Los warnings normales de consola NO cuentan. `import type` mantiene el
// modulo libre de dependencia runtime de Playwright para Vitest.
import type { Page, ConsoleMessage, Request } from '@playwright/test'
import type { ErrorDeConsola, ErrorDePagina, PedidoFallido } from './tipos'

// Un pedido es "esencial" si es el documento, un script/módulo, hoja de
// estilo o el propio bundle de la app. Imágenes/favicon/analytics no
// tumban la app (brief §15: "404 de assets: fail" se aplica a assets del
// build, no a cualquier recurso opcional de terceros).
function esRecursoEsencial(req: Request): boolean {
  const tipo = req.resourceType()
  if (tipo === 'document' || tipo === 'script' || tipo === 'stylesheet') {
    return true
  }
  return /\/assets\/.*\.(?:js|css|mjs)(?:$|\?)/.test(req.url())
}

export class RecolectorDeErrores {
  private readonly consola: ErrorDeConsola[] = []
  private readonly paginaErrores: ErrorDePagina[] = []
  private readonly pedidosFallidos: PedidoFallido[] = []
  private cursorConsola = 0
  private cursorPagina = 0
  private cursorPedidos = 0

  constructor(page: Page) {
    page.on('console', (msg: ConsoleMessage) => {
      if (msg.type() !== 'error') {
        return
      }
      const texto = msg.text()
      // Ruido conocido e inocuo: 404 de favicon, extensiones del navegador,
      // avisos de React DevTools. No son fallos de la app.
      if (/favicon\.ico|React DevTools|Download the React DevTools/i.test(texto)) {
        return
      }
      const loc = msg.location()
      this.consola.push({
        texto,
        ubicacion: loc.url ? `${loc.url}:${loc.lineNumber}:${loc.columnNumber}` : undefined,
      })
    })

    page.on('pageerror', (err: Error) => {
      this.paginaErrores.push({ mensaje: err.message, stack: err.stack })
    })

    page.on('requestfailed', (req: Request) => {
      const falla = req.failure()?.errorText ?? 'desconocida'
      // `net::ERR_ABORTED` en navegación/prefetch no es un fallo real.
      if (falla.includes('ERR_ABORTED')) {
        return
      }
      this.pedidosFallidos.push({
        url: req.url(),
        metodo: req.method(),
        falla,
        esencial: esRecursoEsencial(req),
      })
    })

    page.on('response', (res) => {
      const status = res.status()
      if (status < 400) {
        return
      }
      const req = res.request()
      if (esRecursoEsencial(req)) {
        this.pedidosFallidos.push({
          url: res.url(),
          metodo: req.method(),
          falla: `HTTP ${status}`,
          esencial: true,
        })
      }
    })
  }

  /** Errores nuevos desde la última consulta (semántica de cursor). */
  nuevos(): {
    consola: ErrorDeConsola[]
    pageerror: ErrorDePagina[]
    pedidosEsenciales: PedidoFallido[]
  } {
    const consola = this.consola.slice(this.cursorConsola)
    const pageerror = this.paginaErrores.slice(this.cursorPagina)
    const pedidos = this.pedidosFallidos.slice(this.cursorPedidos)
    this.cursorConsola = this.consola.length
    this.cursorPagina = this.paginaErrores.length
    this.cursorPedidos = this.pedidosFallidos.length
    return { consola, pageerror, pedidosEsenciales: pedidos.filter((p) => p.esencial) }
  }

  /** Acumulado completo (para el artifact de fallo). */
  todo(): { consola: ErrorDeConsola[]; pageerror: ErrorDePagina[]; requestfailed: PedidoFallido[] } {
    return {
      consola: [...this.consola],
      pageerror: [...this.paginaErrores],
      requestfailed: [...this.pedidosFallidos],
    }
  }
}
