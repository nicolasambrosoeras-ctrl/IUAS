import { describe, it, expect } from 'vitest'
import type { UnidadFuncional } from '../../modelo/proyecto'
import { resumenDeUnidadFuncional } from './resumenDeUnidadFuncional'

const uf = (parcial: Partial<UnidadFuncional['niveles'][number]>): UnidadFuncional => ({
  id: 'uf-x',
  nombre: 'Unidad funcional 1',
  niveles: [
    {
      id: 'uf-x-nivel-1',
      nombre: 'Nivel 1',
      nivel: 0,
      cotaHidraulicaReferencia_m: 1,
      locales: [],
      ...parcial,
    },
  ],
})

describe('resumenDeUnidadFuncional (UX-01 / UI-01D)', () => {
  it('UF vacía: 0 locales · 0 artefactos, nivel PB', () => {
    const r = resumenDeUnidadFuncional(uf({ locales: [] }))
    expect(r).toEqual({
      nombre: 'Unidad funcional 1',
      nivelTexto: 'PB',
      cantidadLocales: 0,
      cantidadArtefactos: 0,
      localesTexto: '0 locales',
      artefactosTexto: '0 artefactos',
    })
  })

  it('cuenta locales y SUMA las cantidades de artefactos (no filas)', () => {
    const r = resumenDeUnidadFuncional(
      uf({
        nivel: 3,
        locales: [
          {
            id: 'l1',
            tipo: 'bano',
            artefactos: [
              { id: 'a1', artefactoId: 'lavatorio', cantidad: 2, origen: 'normativo' },
              { id: 'a2', artefactoId: 'inodoroDeposito', cantidad: 1, origen: 'normativo' },
            ],
          },
          {
            id: 'l2',
            tipo: 'cocina',
            artefactos: [{ id: 'a3', artefactoId: 'piletaDeCocina', cantidad: 1, origen: 'normativo' }],
          },
        ],
      }),
    )
    expect(r.cantidadLocales).toBe(2)
    expect(r.cantidadArtefactos).toBe(4) // 2 + 1 + 1, no 3 filas
    expect(r.localesTexto).toBe('2 locales')
    expect(r.artefactosTexto).toBe('4 artefactos')
    expect(r.nivelTexto).toBe('Piso 3')
  })

  it('singular correcto: 1 local · 1 artefacto', () => {
    const r = resumenDeUnidadFuncional(
      uf({
        locales: [
          { id: 'l1', tipo: 'bano', artefactos: [{ id: 'a1', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }] },
        ],
      }),
    )
    expect(r.localesTexto).toBe('1 local')
    expect(r.artefactosTexto).toBe('1 artefacto')
  })

  it('nivel ausente ⇒ "Sin clasificar"; el nombre se lee siempre de la UF actual', () => {
    const sinNivel: UnidadFuncional = {
      id: 'uf-x',
      nombre: 'Departamento A',
      niveles: [
        {
          id: 'uf-x-nivel-1',
          nombre: 'Nivel 1',
          cotaHidraulicaReferencia_m: 1,
          locales: [],
        },
      ],
    }
    const r = resumenDeUnidadFuncional(sinNivel)
    expect(r.nivelTexto).toBe('Sin clasificar')
    expect(r.nombre).toBe('Departamento A')
  })
})
