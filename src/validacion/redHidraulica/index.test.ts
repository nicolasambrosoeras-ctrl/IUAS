import { describe, it, expect } from 'vitest'
import type { Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { validarRedHidraulica } from './index'

function proyectoBase(
  unidadesFuncionales: readonly UnidadFuncional[],
  redHidraulica?: RedHidraulica,
): Proyecto {
  return {
    metadatos: {
      nombre: 'Proyecto de prueba',
      obra: 'Obra de prueba',
      comitente: 'Comitente de prueba',
      fecha: '2026-01-01',
      schemaVersion: '1.0.0',
      versionNormativa: 'eras-2023',
    },
    parametros: {
      tipoDeProyecto: 'oficinaPrivada',
      presionSobreAcera_m: 0,
      alturaArtefactoMasDesfavorable_m: 0,
    },
    unidadesFuncionales,
    configuracionHidraulica: { metodoPerdidaDistribuida: 'hazenWilliams', materialTuberiaId: 'ppr', sistemaDeTuberiaId: 'acquaSystemMagnumPn20' },
    ...(redHidraulica !== undefined ? { redHidraulica } : {}),
  }
}

const unidadesFuncionalesDeEjemplo: readonly UnidadFuncional[] = [
  {
    id: 'uf-1',
    nombre: 'UF 1',
    locales: [
      {
        id: 'local-bano',
        tipo: 'bano',
        regimen: 'domiciliario',
        artefactos: [
          { id: 'artefacto-ducha', artefactoId: 'receptaculoDucha', cantidad: 1, origen: 'normativo' },
        ],
      },
    ],
  },
]

function referenciaDucha(): { tipo: 'artefacto'; unidadFuncionalId: string; localId: string; artefactoId: string } {
  return { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'artefacto-ducha' }
}

function redMinimaValida(): RedHidraulica {
  const nodos: Nodo[] = [
    { id: 'n0' },
    { id: 'n1' },
    { id: 'n2', referencia: referenciaDucha() },
    { id: 'n3', referencia: { tipo: 'produccionACS' } },
    { id: 'n4', referencia: referenciaDucha() },
  ]

  const tramos: Tramo[] = [
    { id: 't1', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
    { id: 't2', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF' },
    { id: 't3', nodoOrigenId: 'n1', nodoDestinoId: 'n3', red: 'AF' },
    { id: 't4', nodoOrigenId: 'n3', nodoDestinoId: 'n4', red: 'AC' },
  ]

  return { nodos, tramos }
}

describe('validarRedHidraulica', () => {
  it('proyecto sin redHidraulica sigue siendo válido', () => {
    const proyecto = proyectoBase(unidadesFuncionalesDeEjemplo)
    expect(validarRedHidraulica(proyecto)).toEqual([])
  })

  it('red mínima válida: fuente, bifurcación, terminal AF, producción ACS, terminal AC', () => {
    const proyecto = proyectoBase(unidadesFuncionalesDeEjemplo, redMinimaValida())
    expect(validarRedHidraulica(proyecto)).toEqual([])
  })

  it('dos nodos distintos pueden referenciar la misma cadena UF/Local/Artefacto (terminal AF y AC de un mismo artefacto mixto)', () => {
    const proyecto = proyectoBase(unidadesFuncionalesDeEjemplo, redMinimaValida())
    const codigos = validarRedHidraulica(proyecto).map((p) => p.codigo)
    expect(codigos).not.toContain('redHidraulicaReferenciaArtefactoInvalida')
  })

  it('Nodo.id duplicado falla', () => {
    const red: RedHidraulica = { nodos: [{ id: 'n0' }, { id: 'n0' }], tramos: [] }
    const proyecto = proyectoBase(unidadesFuncionalesDeEjemplo, red)
    const codigos = validarRedHidraulica(proyecto).map((p) => p.codigo)
    expect(codigos).toContain('redHidraulicaNodoIdDuplicado')
  })

  it('Tramo.id duplicado falla', () => {
    const red: RedHidraulica = {
      nodos: [{ id: 'n0' }, { id: 'n1' }, { id: 'n2' }],
      tramos: [
        { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
        { id: 't0', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF' },
      ],
    }
    const proyecto = proyectoBase(unidadesFuncionalesDeEjemplo, red)
    const codigos = validarRedHidraulica(proyecto).map((p) => p.codigo)
    expect(codigos).toContain('redHidraulicaTramoIdDuplicado')
  })

  it('nodoOrigenId inexistente falla', () => {
    const red: RedHidraulica = {
      nodos: [{ id: 'n1' }],
      tramos: [{ id: 't0', nodoOrigenId: 'inexistente', nodoDestinoId: 'n1', red: 'AF' }],
    }
    const proyecto = proyectoBase(unidadesFuncionalesDeEjemplo, red)
    const problemas = validarRedHidraulica(proyecto)
    expect(
      problemas.some(
        (p) => p.codigo === 'redHidraulicaTramoNodoInexistente' && p.campo === 'redHidraulica.tramos[0].nodoOrigenId',
      ),
    ).toBe(true)
  })

  it('nodoDestinoId inexistente falla', () => {
    const red: RedHidraulica = {
      nodos: [{ id: 'n0' }],
      tramos: [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'inexistente', red: 'AF' }],
    }
    const proyecto = proyectoBase(unidadesFuncionalesDeEjemplo, red)
    const problemas = validarRedHidraulica(proyecto)
    expect(
      problemas.some(
        (p) => p.codigo === 'redHidraulicaTramoNodoInexistente' && p.campo === 'redHidraulica.tramos[0].nodoDestinoId',
      ),
    ).toBe(true)
  })

  it('nodoOrigenId === nodoDestinoId falla', () => {
    const red: RedHidraulica = {
      nodos: [{ id: 'n0' }],
      tramos: [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n0', red: 'AF' }],
    }
    const proyecto = proyectoBase(unidadesFuncionalesDeEjemplo, red)
    const codigos = validarRedHidraulica(proyecto).map((p) => p.codigo)
    expect(codigos).toContain('redHidraulicaTramoOrigenIgualDestino')
  })

  it('referencia con UF inexistente falla', () => {
    const red: RedHidraulica = {
      nodos: [
        {
          id: 'n0',
          referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-inexistente', localId: 'local-bano', artefactoId: 'artefacto-ducha' },
        },
      ],
      tramos: [],
    }
    const proyecto = proyectoBase(unidadesFuncionalesDeEjemplo, red)
    const codigos = validarRedHidraulica(proyecto).map((p) => p.codigo)
    expect(codigos).toContain('redHidraulicaReferenciaArtefactoInvalida')
  })

  it('referencia con Local inexistente dentro de una UF válida falla', () => {
    const red: RedHidraulica = {
      nodos: [
        {
          id: 'n0',
          referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-inexistente', artefactoId: 'artefacto-ducha' },
        },
      ],
      tramos: [],
    }
    const proyecto = proyectoBase(unidadesFuncionalesDeEjemplo, red)
    const codigos = validarRedHidraulica(proyecto).map((p) => p.codigo)
    expect(codigos).toContain('redHidraulicaReferenciaArtefactoInvalida')
  })

  it('referencia con Artefacto inexistente dentro de UF/Local válidos falla', () => {
    const red: RedHidraulica = {
      nodos: [
        {
          id: 'n0',
          referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'artefacto-inexistente' },
        },
      ],
      tramos: [],
    }
    const proyecto = proyectoBase(unidadesFuncionalesDeEjemplo, red)
    const codigos = validarRedHidraulica(proyecto).map((p) => p.codigo)
    expect(codigos).toContain('redHidraulicaReferenciaArtefactoInvalida')
  })

  it('longitud_m <= 0 falla (cero y negativa)', () => {
    const red: RedHidraulica = {
      nodos: [{ id: 'n0' }, { id: 'n1' }, { id: 'n2' }],
      tramos: [
        { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF', longitud_m: 0 },
        { id: 't1', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF', longitud_m: -1 },
      ],
    }
    const proyecto = proyectoBase(unidadesFuncionalesDeEjemplo, red)
    const problemas = validarRedHidraulica(proyecto).filter(
      (p) => p.codigo === 'redHidraulicaTramoLongitudNoPositiva',
    )
    expect(problemas).toHaveLength(2)
  })

  it('longitud_m incompatible con la diferencia de cota falla (z0=0, z1=3, L=2.9)', () => {
    const red: RedHidraulica = {
      nodos: [
        { id: 'n0', cota_m: 0 },
        { id: 'n1', cota_m: 3 },
      ],
      tramos: [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF', longitud_m: 2.9 }],
    }
    const proyecto = proyectoBase(unidadesFuncionalesDeEjemplo, red)
    const codigos = validarRedHidraulica(proyecto).map((p) => p.codigo)
    expect(codigos).toContain('redHidraulicaTramoLongitudIncompatibleConCota')
  })

  it('longitud_m compatible con la diferencia de cota no falla (z0=0, z1=3, L=5, diagonal)', () => {
    const red: RedHidraulica = {
      nodos: [
        { id: 'n0', cota_m: 0 },
        { id: 'n1', cota_m: 3 },
      ],
      tramos: [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF', longitud_m: 5 }],
    }
    const proyecto = proyectoBase(unidadesFuncionalesDeEjemplo, red)
    const codigos = validarRedHidraulica(proyecto).map((p) => p.codigo)
    expect(codigos).not.toContain('redHidraulicaTramoLongitudIncompatibleConCota')
  })

  it('longitud_m presente pero cotas ausentes: no valida compatibilidad geométrica', () => {
    const red: RedHidraulica = {
      nodos: [{ id: 'n0' }, { id: 'n1' }],
      tramos: [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF', longitud_m: 5 }],
    }
    const proyecto = proyectoBase(unidadesFuncionalesDeEjemplo, red)
    const codigos = validarRedHidraulica(proyecto).map((p) => p.codigo)
    expect(codigos).not.toContain('redHidraulicaTramoLongitudIncompatibleConCota')
  })
})
