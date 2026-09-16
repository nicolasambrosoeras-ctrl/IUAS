// BETA-WEB-METADATA-01 — el callout de autoguardado debe anunciar "Versión
// beta" (release público real) y no dejar rastro del copy "Versión piloto"
// usado durante el desarrollo interno.
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import { MotorDemandaPantalla } from './MotorDemandaPantalla'

describe('MotorDemandaPantalla — copy de versión (BETA-WEB-METADATA-01)', () => {
  const html = renderToStaticMarkup(createElement(MotorDemandaPantalla))

  it('muestra "Versión beta" en el callout de autoguardado', () => {
    expect(html).toContain('Versión beta ·')
  })

  it('no queda ningún rastro de "Versión piloto"', () => {
    expect(html).not.toContain('Versión piloto')
  })
})
