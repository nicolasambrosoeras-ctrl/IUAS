// Mismo criterio que PanelDePresionDeModulo2.test.ts: no hay
// jsdom/testing-library en este repo, así que no se simula onChange
// real. TarjetaDeTerminal se renderiza directamente acá con props
// sintéticas en vez de a través del panel completo --
// PanelDePresionDeModulo2 nunca puebla Pdisponible en un render
// estático (arranca en '' por useState), así que esta tarjeta nunca
// sería alcanzable desde ahí sin simular eventos.
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import type { ResultadoPresionResidualDeCamino } from '../../motor/tuberias/presion/resolverPresionResidualDeCamino'
import { TarjetaDeTerminal } from './TarjetaDeTerminal'

describe('TarjetaDeTerminal (D-δ.46)', () => {
  const resultadoBalanceIncompleto: ResultadoPresionResidualDeCamino = {
    tipo: 'balanceIncompleto',
    terminosFaltantes: ['hfMedidor'],
    raizId: 'raiz',
    terminalId: 'terminal-1',
    desnivel_m: 3,
    hfDistribuida_mca: 0.5,
    hfDistribuidaPorTramo: [],
    hfLocalizada: { metodologia: 'detallado', hf_mca: 0, porTramo: [] },
  }

  it("infoCota 'individual': muestra el input editable 'Cota de conexión [m]'", () => {
    const html = renderToStaticMarkup(
      createElement(TarjetaDeTerminal, {
        etiqueta: 'Baño → Lavatorio',
        infoCota: { tipo: 'individual', cota_m: 3, onCambiarCota: () => {} },
        presionDisponible_mca: 20,
        hfMedidor_mca: undefined,
        resultado: resultadoBalanceIncompleto,
      }),
    )

    expect(html).toContain('Cota de conexión [m]')
  })

  it("infoCota 'deUF': NUNCA muestra el input 'Cota de conexión [m]', muestra la cota de referencia de solo lectura", () => {
    const html = renderToStaticMarkup(
      createElement(TarjetaDeTerminal, {
        etiqueta: 'Baño → Lavatorio',
        infoCota: { tipo: 'deUF', nombreUF: 'Unidad funcional 1', cota_m: 7 },
        presionDisponible_mca: 20,
        hfMedidor_mca: undefined,
        resultado: resultadoBalanceIncompleto,
      }),
    )

    expect(html).not.toContain('Cota de conexión [m]')
    expect(html).toContain('Cota de referencia')
    expect(html).toContain('Unidad funcional 1')
  })
})
