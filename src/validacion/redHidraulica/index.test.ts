import { describe, it, expect } from 'vitest'
import type { Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { AccesorioDeTramo, Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { validarRedHidraulica } from './index'
import { proyectoInicial } from '../../interfaz/paginas/proyectoDeEjemplo'

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
    configuracionHidraulica: { metodoPerdidaDistribuida: 'hazenWilliams', metodoPerdidaLocalizada: 'detallado', granularidadHidraulica: 'profesional', materialTuberiaId: 'ppr', sistemaDeTuberiaId: 'acquaSystemMagnumPn20' },
    ...(redHidraulica !== undefined ? { redHidraulica } : {}),
  }
}

const unidadesFuncionalesDeEjemplo: readonly UnidadFuncional[] = [
  {
    id: 'uf-1',
    nombre: 'UF 1',
    niveles: [
      {
        id: 'uf-1-nivel-1',
        nombre: 'Nivel 1',
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

  it('accesorios ausente (undefined) no genera ningún problema -- relevamiento no realizado, no es error', () => {
    const red: RedHidraulica = {
      nodos: [{ id: 'n0' }, { id: 'n1' }],
      tramos: [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' }],
    }
    const proyecto = proyectoBase(unidadesFuncionalesDeEjemplo, red)
    expect(validarRedHidraulica(proyecto)).toEqual([])
  })

  it('accesorios=[] (relevado, sin accesorios) no genera ningún problema', () => {
    const red: RedHidraulica = {
      nodos: [{ id: 'n0' }, { id: 'n1' }],
      tramos: [{ id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF', accesorios: [] }],
    }
    const proyecto = proyectoBase(unidadesFuncionalesDeEjemplo, red)
    expect(validarRedHidraulica(proyecto)).toEqual([])
  })

  it('accesorios del subconjunto soportado, con cantidad válida, no generan problema', () => {
    const red: RedHidraulica = {
      nodos: [{ id: 'n0' }, { id: 'n1' }],
      tramos: [
        {
          id: 't0',
          nodoOrigenId: 'n0',
          nodoDestinoId: 'n1',
          red: 'AF',
          accesorios: [
            { tipo: 'codo90', cantidad: 2 },
            { tipo: 'llaveDePaso', cantidad: 1 },
          ],
        },
      ],
    }
    const proyecto = proyectoBase(unidadesFuncionalesDeEjemplo, red)
    expect(validarRedHidraulica(proyecto)).toEqual([])
  })

  it('reducciones (CRIT-A30) es un tipo soportado, con cantidad válida no genera problema', () => {
    const red: RedHidraulica = {
      nodos: [{ id: 'n0' }, { id: 'n1' }],
      tramos: [
        { id: 't0', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF', accesorios: [{ tipo: 'reducciones', cantidad: 1 }] },
      ],
    }
    const proyecto = proyectoBase(unidadesFuncionalesDeEjemplo, red)
    expect(validarRedHidraulica(proyecto)).toEqual([])
  })

  it('accesorio con tipo no soportado (fuera del subconjunto, p. ej. dato persistido de una tee) falla explícitamente', () => {
    const red: RedHidraulica = {
      nodos: [{ id: 'n0' }, { id: 'n1' }],
      tramos: [
        {
          id: 't0',
          nodoOrigenId: 'n0',
          nodoDestinoId: 'n1',
          red: 'AF',
          // Cast deliberado: simula un dato persistido/externo que viola
          // el subconjunto soportado por TypeScript en tiempo de
          // ejecución (p. ej. una tee, todavía sin representación).
          accesorios: [{ tipo: 'teePasoRecto', cantidad: 1 }] as unknown as readonly AccesorioDeTramo[],
        },
      ],
    }
    const proyecto = proyectoBase(unidadesFuncionalesDeEjemplo, red)
    const problemas = validarRedHidraulica(proyecto).filter(
      (p) => p.codigo === 'redHidraulicaTramoAccesorioTipoNoSoportado',
    )
    expect(problemas).toHaveLength(1)
    expect(problemas[0]?.valorRecibido).toBe('teePasoRecto')
  })

  it('accesorio con cantidad <= 0 falla (cero y negativa)', () => {
    const red: RedHidraulica = {
      nodos: [{ id: 'n0' }, { id: 'n1' }],
      tramos: [
        {
          id: 't0',
          nodoOrigenId: 'n0',
          nodoDestinoId: 'n1',
          red: 'AF',
          accesorios: [
            { tipo: 'codo90', cantidad: 0 },
            { tipo: 'curva90', cantidad: -1 },
          ],
        },
      ],
    }
    const proyecto = proyectoBase(unidadesFuncionalesDeEjemplo, red)
    const problemas = validarRedHidraulica(proyecto).filter(
      (p) => p.codigo === 'redHidraulicaTramoAccesorioCantidadNoPositiva',
    )
    expect(problemas).toHaveLength(2)
  })

  it('Nodo.tee ausente en una bifurcación real (1 entrante + 2 salientes) no falla -- "no relevado todavía", mismo criterio que accesorios/longitud_m', () => {
    const red: RedHidraulica = {
      nodos: [{ id: 'n0' }, { id: 'n-tee' }, { id: 'n1' }, { id: 'n2' }],
      tramos: [
        { id: 't-entrada', nodoOrigenId: 'n0', nodoDestinoId: 'n-tee', red: 'AF' },
        { id: 't-recta', nodoOrigenId: 'n-tee', nodoDestinoId: 'n1', red: 'AF' },
        { id: 't-lateral', nodoOrigenId: 'n-tee', nodoDestinoId: 'n2', red: 'AF' },
      ],
    }
    expect(validarRedHidraulica(proyectoBase(unidadesFuncionalesDeEjemplo, red))).toEqual([])
  })

  it('tee entradaPorExtremo válida (estructura 1→2, tramoSalidaRectaId es uno de los dos salientes) no falla', () => {
    const red: RedHidraulica = {
      nodos: [{ id: 'n0' }, { id: 'n-tee', tee: { tipo: 'entradaPorExtremo', tramoSalidaRectaId: 't-recta' } }, { id: 'n1' }, { id: 'n2' }],
      tramos: [
        { id: 't-entrada', nodoOrigenId: 'n0', nodoDestinoId: 'n-tee', red: 'AF' },
        { id: 't-recta', nodoOrigenId: 'n-tee', nodoDestinoId: 'n1', red: 'AF' },
        { id: 't-lateral', nodoOrigenId: 'n-tee', nodoDestinoId: 'n2', red: 'AF' },
      ],
    }
    expect(validarRedHidraulica(proyectoBase(unidadesFuncionalesDeEjemplo, red))).toEqual([])
  })

  it('tee entradaCentral válida (estructura 1→2) no falla', () => {
    const red: RedHidraulica = {
      nodos: [{ id: 'n0' }, { id: 'n-tee', tee: { tipo: 'entradaCentral' } }, { id: 'n1' }, { id: 'n2' }],
      tramos: [
        { id: 't-entrada', nodoOrigenId: 'n0', nodoDestinoId: 'n-tee', red: 'AF' },
        { id: 't-a', nodoOrigenId: 'n-tee', nodoDestinoId: 'n1', red: 'AF' },
        { id: 't-b', nodoOrigenId: 'n-tee', nodoDestinoId: 'n2', red: 'AF' },
      ],
    }
    expect(validarRedHidraulica(proyectoBase(unidadesFuncionalesDeEjemplo, red))).toEqual([])
  })

  it('tee declarada sobre un Nodo sin exactamente 1 entrante+2 salientes falla explícitamente (nunca elige otra estructura silenciosamente)', () => {
    // Solo 1 saliente (no es bifurcación) -- estructura no soportada.
    const redUnSaliente: RedHidraulica = {
      nodos: [{ id: 'n0' }, { id: 'n-tee', tee: { tipo: 'entradaCentral' } }, { id: 'n1' }],
      tramos: [
        { id: 't-entrada', nodoOrigenId: 'n0', nodoDestinoId: 'n-tee', red: 'AF' },
        { id: 't-a', nodoOrigenId: 'n-tee', nodoDestinoId: 'n1', red: 'AF' },
      ],
    }
    const problemasUnSaliente = validarRedHidraulica(proyectoBase(unidadesFuncionalesDeEjemplo, redUnSaliente))
    expect(problemasUnSaliente).toHaveLength(1)
    expect(problemasUnSaliente[0]?.codigo).toBe('redHidraulicaNodoTeeEstructuraNoSoportada')

    // 3 salientes (fuera del alcance 1→2 de este incremento) -- misma falla.
    const redTresSalientes: RedHidraulica = {
      nodos: [{ id: 'n0' }, { id: 'n-tee', tee: { tipo: 'entradaCentral' } }, { id: 'n1' }, { id: 'n2' }, { id: 'n3' }],
      tramos: [
        { id: 't-entrada', nodoOrigenId: 'n0', nodoDestinoId: 'n-tee', red: 'AF' },
        { id: 't-a', nodoOrigenId: 'n-tee', nodoDestinoId: 'n1', red: 'AF' },
        { id: 't-b', nodoOrigenId: 'n-tee', nodoDestinoId: 'n2', red: 'AF' },
        { id: 't-c', nodoOrigenId: 'n-tee', nodoDestinoId: 'n3', red: 'AF' },
      ],
    }
    const problemasTresSalientes = validarRedHidraulica(proyectoBase(unidadesFuncionalesDeEjemplo, redTresSalientes))
    expect(problemasTresSalientes).toHaveLength(1)
    expect(problemasTresSalientes[0]?.codigo).toBe('redHidraulicaNodoTeeEstructuraNoSoportada')
  })

  it('tee entradaPorExtremo con tramoSalidaRectaId que no es ninguno de los dos salientes reales falla explícitamente', () => {
    const red: RedHidraulica = {
      nodos: [
        { id: 'n0' },
        { id: 'n-tee', tee: { tipo: 'entradaPorExtremo', tramoSalidaRectaId: 'tramo-inexistente' } },
        { id: 'n1' },
        { id: 'n2' },
      ],
      tramos: [
        { id: 't-entrada', nodoOrigenId: 'n0', nodoDestinoId: 'n-tee', red: 'AF' },
        { id: 't-recta', nodoOrigenId: 'n-tee', nodoDestinoId: 'n1', red: 'AF' },
        { id: 't-lateral', nodoOrigenId: 'n-tee', nodoDestinoId: 'n2', red: 'AF' },
      ],
    }
    const problemas = validarRedHidraulica(proyectoBase(unidadesFuncionalesDeEjemplo, red))
    expect(problemas).toEqual([
      {
        codigo: 'redHidraulicaNodoTeeTramoSalidaRectaInvalido',
        severidad: 'error',
        alcance: 'tuberias',
        campo: 'redHidraulica.nodos[1].tee.tramoSalidaRectaId',
        valorRecibido: 'tramo-inexistente',
      },
    ])
  })

  // --- M2-TOPO-A: invariantes de arborescencia (CRIT-A27 / D-δ.37) ---

  it('red vacía ({nodos:[], tramos:[]}) es válida -- Módulo 2 recién iniciado, nunca "raíz ausente"', () => {
    const proyecto = proyectoBase(unidadesFuncionalesDeEjemplo, { nodos: [], tramos: [] })
    expect(validarRedHidraulica(proyecto)).toEqual([])
  })

  it('el proyecto de ejemplo (topología plana actual) no dispara ninguna invariante nueva', () => {
    // Backward compatibility: la red del demo sigue siendo válida byte a byte.
    expect(validarRedHidraulica(proyectoInicial)).toEqual([])
  })

  it('árbol profundo válido (raíz -> A -> B -> C -> terminal, con ramas laterales) no falla', () => {
    const red: RedHidraulica = {
      nodos: [
        { id: 'raiz' },
        { id: 'a' },
        { id: 'b' },
        { id: 'c' },
        { id: 't-1', referencia: referenciaDucha() },
        { id: 't-2', referencia: referenciaDucha() },
      ],
      tramos: [
        { id: 'r-a', nodoOrigenId: 'raiz', nodoDestinoId: 'a', red: 'AF' },
        { id: 'a-b', nodoOrigenId: 'a', nodoDestinoId: 'b', red: 'AF' },
        { id: 'a-t1', nodoOrigenId: 'a', nodoDestinoId: 't-1', red: 'AF' },
        { id: 'b-c', nodoOrigenId: 'b', nodoDestinoId: 'c', red: 'AF' },
        { id: 'c-t2', nodoOrigenId: 'c', nodoDestinoId: 't-2', red: 'AF' },
      ],
    }
    expect(validarRedHidraulica(proyectoBase(unidadesFuncionalesDeEjemplo, red))).toEqual([])
  })

  it('un nodo con 3 tramos salientes (fan-out 1→3) NO es un problema estructural: la invariante mira los entrantes', () => {
    const red: RedHidraulica = {
      nodos: [
        { id: 'n0' },
        { id: 'manifold' },
        { id: 't-1', referencia: referenciaDucha() },
        { id: 't-2', referencia: referenciaDucha() },
        { id: 't-3', referencia: referenciaDucha() },
      ],
      tramos: [
        { id: 't-in', nodoOrigenId: 'n0', nodoDestinoId: 'manifold', red: 'AF' },
        { id: 't-a', nodoOrigenId: 'manifold', nodoDestinoId: 't-1', red: 'AF' },
        { id: 't-b', nodoOrigenId: 'manifold', nodoDestinoId: 't-2', red: 'AF' },
        { id: 't-c', nodoOrigenId: 'manifold', nodoDestinoId: 't-3', red: 'AF' },
      ],
    }
    expect(validarRedHidraulica(proyectoBase(unidadesFuncionalesDeEjemplo, red))).toEqual([])
  })

  it('un nodo con dos tramos entrantes falla (convergencia 2→1)', () => {
    const red: RedHidraulica = {
      nodos: [{ id: 'raiz-a' }, { id: 'raiz-b' }, { id: 'union' }, { id: 'term', referencia: referenciaDucha() }],
      tramos: [
        { id: 'a-u', nodoOrigenId: 'raiz-a', nodoDestinoId: 'union', red: 'AF' },
        { id: 'b-u', nodoOrigenId: 'raiz-b', nodoDestinoId: 'union', red: 'AF' },
        { id: 'u-t', nodoOrigenId: 'union', nodoDestinoId: 'term', red: 'AF' },
      ],
    }
    const problemas = validarRedHidraulica(proyectoBase(unidadesFuncionalesDeEjemplo, red))
    expect(
      problemas.some(
        (p) => p.codigo === 'redHidraulicaNodoMultiplesTramosEntrantes' && p.campo === 'redHidraulica.nodos[2]',
      ),
    ).toBe(true)
    const problema = problemas.find((p) => p.codigo === 'redHidraulicaNodoMultiplesTramosEntrantes')
    expect(problema?.severidad).toBe('error')
    expect(problema?.alcance).toBe('tuberias')
    expect(problema?.valorRecibido).toBe('union')
    expect(problema?.limite).toBe(2)
  })

  it('tramos paralelos (dos tramos distintos entre los mismos nodos) también fallan como múltiples entrantes', () => {
    const red: RedHidraulica = {
      nodos: [{ id: 'n0' }, { id: 'n1' }, { id: 'term', referencia: referenciaDucha() }],
      tramos: [
        { id: 'p1', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
        { id: 'p2', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
        { id: 'n1-t', nodoOrigenId: 'n1', nodoDestinoId: 'term', red: 'AF' },
      ],
    }
    const codigos = validarRedHidraulica(proyectoBase(unidadesFuncionalesDeEjemplo, red)).map((p) => p.codigo)
    expect(codigos).toContain('redHidraulicaNodoMultiplesTramosEntrantes')
  })

  it('un ciclo dirigido (A → B → C → A) falla sin loop infinito', () => {
    const red: RedHidraulica = {
      nodos: [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      tramos: [
        { id: 'a-b', nodoOrigenId: 'a', nodoDestinoId: 'b', red: 'AF' },
        { id: 'b-c', nodoOrigenId: 'b', nodoDestinoId: 'c', red: 'AF' },
        { id: 'c-a', nodoOrigenId: 'c', nodoDestinoId: 'a', red: 'AF' },
      ],
    }
    const problemas = validarRedHidraulica(proyectoBase(unidadesFuncionalesDeEjemplo, red))
    const ciclo = problemas.filter((p) => p.codigo === 'redHidraulicaCicloDirigido')
    expect(ciclo.length).toBeGreaterThan(0)
    expect(ciclo[0]?.severidad).toBe('error')
    expect(ciclo[0]?.alcance).toBe('tuberias')
  })

  it('un DAG con reconvergencia (diamante A→B, A→C, B→D, C→D) NO se marca como ciclo -- sí como múltiples entrantes en D', () => {
    const red: RedHidraulica = {
      nodos: [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }],
      tramos: [
        { id: 'a-b', nodoOrigenId: 'a', nodoDestinoId: 'b', red: 'AF' },
        { id: 'a-c', nodoOrigenId: 'a', nodoDestinoId: 'c', red: 'AF' },
        { id: 'b-d', nodoOrigenId: 'b', nodoDestinoId: 'd', red: 'AF' },
        { id: 'c-d', nodoOrigenId: 'c', nodoDestinoId: 'd', red: 'AF' },
      ],
    }
    const codigos = validarRedHidraulica(proyectoBase(unidadesFuncionalesDeEjemplo, red)).map((p) => p.codigo)
    expect(codigos).toContain('redHidraulicaNodoMultiplesTramosEntrantes')
    expect(codigos).not.toContain('redHidraulicaCicloDirigido')
  })

  it('un ciclo aislado no impide reportar el resto de la red (no corta el pipeline)', () => {
    const red: RedHidraulica = {
      nodos: [{ id: 'x' }, { id: 'y' }, { id: 'n0' }, { id: 'term', referencia: referenciaDucha() }],
      tramos: [
        { id: 'x-y', nodoOrigenId: 'x', nodoDestinoId: 'y', red: 'AF' },
        { id: 'y-x', nodoOrigenId: 'y', nodoDestinoId: 'x', red: 'AF' },
        // Otra parte de la red, con longitud inválida: debe seguir reportándose.
        { id: 'n0-term', nodoOrigenId: 'n0', nodoDestinoId: 'term', red: 'AF', longitud_m: 0 },
      ],
    }
    const codigos = validarRedHidraulica(proyectoBase(unidadesFuncionalesDeEjemplo, red)).map((p) => p.codigo)
    expect(codigos).toContain('redHidraulicaCicloDirigido')
    expect(codigos).toContain('redHidraulicaTramoLongitudNoPositiva')
  })

  it('tramo con nodo inexistente: no lanza en la detección de ciclo / múltiples entrantes (arista ignorada)', () => {
    const red: RedHidraulica = {
      nodos: [{ id: 'n0' }],
      tramos: [
        { id: 't-a', nodoOrigenId: 'n0', nodoDestinoId: 'fantasma', red: 'AF' },
        { id: 't-b', nodoOrigenId: 'fantasma', nodoDestinoId: 'n0', red: 'AF' },
      ],
    }
    const problemas = validarRedHidraulica(proyectoBase(unidadesFuncionalesDeEjemplo, red))
    const codigos = problemas.map((p) => p.codigo)
    // Se reporta la referencia rota, y NO se inventa un ciclo/múltiple-entrante
    // sobre el nodo inexistente.
    expect(codigos).toContain('redHidraulicaTramoNodoInexistente')
    expect(codigos).not.toContain('redHidraulicaCicloDirigido')
    expect(codigos).not.toContain('redHidraulicaNodoMultiplesTramosEntrantes')
  })
})

// M2-TOPO-C: integridad referencial de la identidad semántica de montantes
// (Proyecto.montantes) y de las referencias Tramo.montanteId.
describe('validarRedHidraulica · identidad de montantes (M2-TOPO-C)', () => {
  function conMontantes(
    montantes: NonNullable<Proyecto['montantes']>,
    tramos?: readonly Tramo[],
  ): Proyecto {
    const red = redMinimaValida()
    const base = proyectoBase(
      unidadesFuncionalesDeEjemplo,
      tramos === undefined ? red : { ...red, tramos },
    )
    return { ...base, montantes }
  }

  it('proyecto sin campo `montantes`: backward-compatible, sin problemas nuevos', () => {
    const codigos = validarRedHidraulica(proyectoBase(unidadesFuncionalesDeEjemplo, redMinimaValida())).map(
      (p) => p.codigo,
    )
    expect(codigos).not.toContain('redHidraulicaMontanteIdDuplicado')
    expect(codigos).not.toContain('redHidraulicaTramoMontanteInexistente')
    expect(proyectoInicial.montantes).toBeUndefined()
  })

  it('montante explícito bien formado (0 segmentos): válido', () => {
    const problemas = validarRedHidraulica(conMontantes([{ id: 'm-af-1', red: 'AF' }]))
    expect(problemas).toEqual([])
  })

  it('montante con nombre personalizado y montante AC: ambos válidos', () => {
    const problemas = validarRedHidraulica(
      conMontantes([
        { id: 'm-af-1', red: 'AF', nombre: 'Montante AF dormitorios' },
        { id: 'm-ac-1', red: 'AC' },
      ]),
    )
    expect(problemas).toEqual([])
  })

  it('dos montantes con el mismo id: redHidraulicaMontanteIdDuplicado', () => {
    const codigos = validarRedHidraulica(
      conMontantes([
        { id: 'm-1', red: 'AF' },
        { id: 'm-1', red: 'AC' },
      ]),
    ).map((p) => p.codigo)
    expect(codigos).toContain('redHidraulicaMontanteIdDuplicado')
  })

  it('montante con red que no es AF ni AC: redHidraulicaMontanteRedInvalida', () => {
    const codigos = validarRedHidraulica(
      conMontantes([{ id: 'm-1', red: 'caliente' as never }]),
    ).map((p) => p.codigo)
    expect(codigos).toContain('redHidraulicaMontanteRedInvalida')
  })

  it('Tramo.montanteId que no corresponde a ningún montante: redHidraulicaTramoMontanteInexistente', () => {
    const red = redMinimaValida()
    const tramos = red.tramos.map((t) => (t.id === 't1' ? { ...t, montanteId: 'm-inexistente' } : t))
    const codigos = validarRedHidraulica(conMontantes([{ id: 'm-otro', red: 'AF' }], tramos)).map((p) => p.codigo)
    expect(codigos).toContain('redHidraulicaTramoMontanteInexistente')
  })

  it('Tramo AF apuntando a un montante AC: redHidraulicaTramoMontanteRedIncoherente', () => {
    const red = redMinimaValida()
    const tramos = red.tramos.map((t) => (t.id === 't2' ? { ...t, montanteId: 'm-ac' } : t))
    const problemas = validarRedHidraulica(conMontantes([{ id: 'm-ac', red: 'AC' }], tramos))
    const codigos = problemas.map((p) => p.codigo)
    expect(codigos).toContain('redHidraulicaTramoMontanteRedIncoherente')
    expect(codigos).not.toContain('redHidraulicaTramoMontanteInexistente')
  })

  it('Tramo AC apuntando a un montante AC coherente: válido', () => {
    const red = redMinimaValida()
    const tramos = red.tramos.map((t) => (t.id === 't4' ? { ...t, montanteId: 'm-ac' } : t))
    expect(validarRedHidraulica(conMontantes([{ id: 'm-ac', red: 'AC' }], tramos))).toEqual([])
  })

  it('montante con red inválida referenciado por un Tramo: un solo reporte (sobre el montante)', () => {
    const red = redMinimaValida()
    const tramos = red.tramos.map((t) => (t.id === 't1' ? { ...t, montanteId: 'm-roto' } : t))
    const codigos = validarRedHidraulica(
      conMontantes([{ id: 'm-roto', red: 'tibia' as never }], tramos),
    ).map((p) => p.codigo)
    expect(codigos).toContain('redHidraulicaMontanteRedInvalida')
    expect(codigos).not.toContain('redHidraulicaTramoMontanteInexistente')
    expect(codigos).not.toContain('redHidraulicaTramoMontanteRedIncoherente')
  })

  it('montantes sin redHidraulica: se validan igual las identidades', () => {
    const base = proyectoBase(unidadesFuncionalesDeEjemplo)
    const proyecto: Proyecto = {
      ...base,
      montantes: [
        { id: 'm-1', red: 'AF' },
        { id: 'm-1', red: 'AF' },
      ],
    }
    const codigos = validarRedHidraulica(proyecto).map((p) => p.codigo)
    expect(codigos).toContain('redHidraulicaMontanteIdDuplicado')
  })
})
