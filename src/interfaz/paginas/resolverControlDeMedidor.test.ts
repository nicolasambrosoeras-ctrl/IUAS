import { describe, it, expect } from 'vitest'
import { seleccionarMedidorGeneral } from '../../motor/medidores/seleccionarMedidorGeneral'
import { resolverMedidorAdoptado } from '../../motor/medidores/resolverMedidorAdoptado'
import { resolverControlDeMedidor } from './resolverControlDeMedidor'

const nucleo = (() => {
  const r = seleccionarMedidorGeneral(2.5 / 3.6) // DN19
  if (r.tipo !== 'seleccionado') throw new Error('fixture')
  return r
})()

describe('resolverControlDeMedidor (D-δ.57)', () => {
  it('D2-2. ↑ y ↓ apuntan a las filas inmediatas de Tabla N°6 (15/19/25/32/38/50/60/75)', () => {
    const c = resolverControlDeMedidor(resolverMedidorAdoptado(nucleo, undefined)) // DN19
    expect(c.dnAdoptado_mm).toBe(19)
    expect(c.dnAnterior_mm).toBe(15)
    expect(c.dnSiguiente_mm).toBe(25)
    expect(c.origen).toBe('automatico')
  })

  it('D2-8. extremos: DN15 no tiene anterior; DN75 no tiene siguiente', () => {
    const c15 = resolverControlDeMedidor(resolverMedidorAdoptado(nucleo, 15))
    expect(c15.dnAnterior_mm).toBeNull()
    expect(c15.dnSiguiente_mm).toBe(19)

    const c75 = resolverControlDeMedidor(resolverMedidorAdoptado(nucleo, 75))
    expect(c75.dnSiguiente_mm).toBeNull()
    expect(c75.dnAnterior_mm).toBe(60)
  })

  it('expone origen, recomendado y criterio para la UI', () => {
    const cManual = resolverControlDeMedidor(resolverMedidorAdoptado(nucleo, 15))
    expect(cManual.origen).toBe('manual')
    expect(cManual.dnRecomendado_mm).toBe(19)
    expect(cManual.criterioSeleccion).toBe('inferiorAlRecomendado')
  })
})
