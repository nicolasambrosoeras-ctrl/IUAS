// QA-FUZZ-01 · detector de pantalla blanca (brief §14, §53). "DOM
// simulado" = objeto plano; sin jsdom, sin tocar la app.
import { describe, it, expect } from 'vitest'
import { evaluarPantalla, type MuestraDePantalla } from './deteccionBlanco'

const sana: MuestraDePantalla = {
  rootPresente: true,
  nodosEnRoot: 240,
  textoUtilEnRoot: 1800,
  marcadorIuas: true,
  navegacionReconocible: true,
  altoContenidoPx: 3200,
}

describe('evaluarPantalla', () => {
  it('una app montada normal NO es pantalla blanca', () => {
    expect(evaluarPantalla(sana)).toEqual({ blanca: false })
  })

  it('root ausente => WHITE_SCREEN', () => {
    const v = evaluarPantalla({ ...sana, rootPresente: false })
    expect(v.blanca).toBe(true)
    if (v.blanca) expect(v.codigo).toBe('WHITE_SCREEN')
  })

  it('root vacío (app desmontada) => WHITE_SCREEN', () => {
    expect(evaluarPantalla({ ...sana, nodosEnRoot: 1, textoUtilEnRoot: 0 }).blanca).toBe(true)
  })

  it('texto insuficiente => WHITE_SCREEN (no basta innerText del cromo)', () => {
    expect(evaluarPantalla({ ...sana, textoUtilEnRoot: 12 }).blanca).toBe(true)
  })

  it('desaparece el marcador IUAS => WHITE_SCREEN', () => {
    expect(evaluarPantalla({ ...sana, marcadorIuas: false }).blanca).toBe(true)
  })

  it('sin navegación reconocible => WHITE_SCREEN', () => {
    expect(evaluarPantalla({ ...sana, navegacionReconocible: false }).blanca).toBe(true)
  })

  it('área de contenido colapsada (caso móvil) => WHITE_SCREEN', () => {
    expect(evaluarPantalla({ ...sana, altoContenidoPx: 10 }).blanca).toBe(true)
  })

  it('el motivo describe la causa concreta', () => {
    const v = evaluarPantalla({ ...sana, marcadorIuas: false })
    if (v.blanca) expect(v.motivo).toMatch(/IUAS/)
  })
})
