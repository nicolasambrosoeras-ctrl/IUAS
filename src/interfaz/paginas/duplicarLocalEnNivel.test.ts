// UI-M1-DUPLICAR-LOCAL-01: duplicar un Local suelto dentro de su mismo
// Nivel. Cubre: clonado independiente, herencia/overrides no
// materializados, multinivel, conectividad física NO heredada (CAT-CONN),
// y no-ops defensivos.
import { describe, it, expect } from 'vitest'
import type { Artefacto, Local, Nivel, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { duplicarLocalEnNivelDeUnidadFuncionalEnProyecto } from './duplicarLocalEnNivel'
import { validarRedHidraulica } from '../../validacion/redHidraulica'
import { auditarCoberturaFisica } from '../../motor/tuberias/cobertura/auditarCoberturaFisica'
import { calcularSimultaneidad } from '../../motor/demanda/simultaneidad/calcularSimultaneidad'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'

function artefacto(overrides: Partial<Artefacto> = {}): Artefacto {
  return { id: 'artefacto-1', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo', ...overrides }
}

function local(overrides: Partial<Local> = {}): Local {
  return { id: 'local-1', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto()], ...overrides }
}

function nivel(overrides: Partial<Nivel> = {}): Nivel {
  return { id: 'nivel-1', nombre: 'Nivel 1', locales: [local()], ...overrides }
}

function uf(overrides: Partial<UnidadFuncional> = {}): UnidadFuncional {
  return { id: 'uf-1', nombre: 'Unidad funcional 1', niveles: [nivel()], ...overrides }
}

function proyectoCon(unidadesFuncionales: readonly UnidadFuncional[], redHidraulica?: RedHidraulica): Proyecto {
  return {
    metadatos: {
      nombre: 'Proyecto de prueba',
      obra: 'Obra',
      comitente: 'Comitente',
      fecha: '2026-09-13',
      schemaVersion: '1.0.0',
      versionNormativa: 'eras-2023',
    },
    parametros: { tipoDeProyecto: 'viviendaIndividual', presionSobreAcera_m: 2, alturaArtefactoMasDesfavorable_m: 3 },
    unidadesFuncionales,
    ...(redHidraulica !== undefined ? { redHidraulica } : {}),
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'estimado',
      granularidadHidraulica: 'simplificada',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

describe('duplicarLocalEnNivelDeUnidadFuncionalEnProyecto -- duplicación simple', () => {
  it('crea una copia inmediatamente después del original, con id nuevo, dentro del mismo Nivel', () => {
    const original = local({
      id: 'local-bano',
      artefactos: [artefacto({ id: 'a1', artefactoId: 'lavatorio' }), artefacto({ id: 'a2', artefactoId: 'bidet' })],
    })
    const proyecto = proyectoCon([uf({ niveles: [nivel({ locales: [original] })] })])

    const resultado = duplicarLocalEnNivelDeUnidadFuncionalEnProyecto(proyecto, 'uf-1', 'nivel-1', 'local-bano')

    const locales = resultado.unidadesFuncionales[0]!.niveles[0]!.locales
    expect(locales).toHaveLength(2)
    expect(locales[0]!.id).toBe('local-bano')
    expect(locales[1]!.id).not.toBe('local-bano')
    expect(locales[1]!.tipo).toBe('bano')
    expect(locales[1]!.artefactos).toHaveLength(2)
    expect(locales[1]!.artefactos[0]!.artefactoId).toBe('lavatorio')
    expect(locales[1]!.artefactos[1]!.artefactoId).toBe('bidet')
    // Ids de artefactos también nuevos.
    expect(locales[1]!.artefactos[0]!.id).not.toBe('a1')
    expect(locales[1]!.artefactos[1]!.id).not.toBe('a2')
    expect(locales[1]!.artefactos[0]!.id).not.toBe(locales[1]!.artefactos[1]!.id)
  })

  it('inserta la copia inmediatamente después del original aunque haya otros Locales alrededor', () => {
    const a = local({ id: 'local-a', tipo: 'bano' })
    const b = local({ id: 'local-b', tipo: 'cocina' })
    const c = local({ id: 'local-c', tipo: 'lavadero' })
    const proyecto = proyectoCon([uf({ niveles: [nivel({ locales: [a, b, c] })] })])

    const resultado = duplicarLocalEnNivelDeUnidadFuncionalEnProyecto(proyecto, 'uf-1', 'nivel-1', 'local-b')

    const ids = resultado.unidadesFuncionales[0]!.niveles[0]!.locales.map((l) => l.id)
    expect(ids[0]).toBe('local-a')
    expect(ids[1]).toBe('local-b')
    expect(ids[3]).toBe('local-c')
    expect(ids).toHaveLength(4)
  })

  it('duplicar repetidamente sigue funcionando, sin límite artificial', () => {
    let proyecto = proyectoCon([uf({ niveles: [nivel({ locales: [local({ id: 'local-bano' })] })] })])

    proyecto = duplicarLocalEnNivelDeUnidadFuncionalEnProyecto(proyecto, 'uf-1', 'nivel-1', 'local-bano')
    expect(proyecto.unidadesFuncionales[0]!.niveles[0]!.locales).toHaveLength(2)

    proyecto = duplicarLocalEnNivelDeUnidadFuncionalEnProyecto(proyecto, 'uf-1', 'nivel-1', 'local-bano')
    expect(proyecto.unidadesFuncionales[0]!.niveles[0]!.locales).toHaveLength(3)

    const ids = proyecto.unidadesFuncionales[0]!.niveles[0]!.locales.map((l) => l.id)
    expect(new Set(ids).size).toBe(3)
  })

  it('modificar la copia no muta el original (arrays/objetos no compartidos)', () => {
    const original = local({ id: 'local-bano', artefactos: [artefacto({ id: 'a1', cantidad: 1 })] })
    const proyecto = proyectoCon([uf({ niveles: [nivel({ locales: [original] })] })])

    const resultado = duplicarLocalEnNivelDeUnidadFuncionalEnProyecto(proyecto, 'uf-1', 'nivel-1', 'local-bano')
    const copia = resultado.unidadesFuncionales[0]!.niveles[0]!.locales[1]!
    const copiaMutada: Local = { ...copia, artefactos: copia.artefactos.map((a) => ({ ...a, cantidad: 99 })) }

    expect(copiaMutada.artefactos[0]!.cantidad).toBe(99)
    expect(original.artefactos[0]!.cantidad).toBe(1)
    expect(resultado.unidadesFuncionales[0]!.niveles[0]!.locales[0]).toBe(original)
  })

  it('UF/Nivel/Local inexistente: devuelve el proyecto sin cambios', () => {
    const proyecto = proyectoCon([uf()])

    expect(duplicarLocalEnNivelDeUnidadFuncionalEnProyecto(proyecto, 'uf-x', 'nivel-1', 'local-1')).toBe(proyecto)
    expect(duplicarLocalEnNivelDeUnidadFuncionalEnProyecto(proyecto, 'uf-1', 'nivel-x', 'local-1')).toBe(proyecto)
    expect(duplicarLocalEnNivelDeUnidadFuncionalEnProyecto(proyecto, 'uf-1', 'nivel-1', 'local-x')).toBe(proyecto)
  })
})

describe('duplicarLocalEnNivelDeUnidadFuncionalEnProyecto -- herencia y overrides (GEOM-COTA-01)', () => {
  it('Local sin override de cota: la copia tampoco tiene override -- sigue heredando el Nivel', () => {
    const original = local({ id: 'local-bano' }) // sin cotaPiso_m
    const proyecto = proyectoCon([
      uf({ niveles: [nivel({ cotaHidraulicaReferencia_m: 3, locales: [original] })] }),
    ])

    const resultado = duplicarLocalEnNivelDeUnidadFuncionalEnProyecto(proyecto, 'uf-1', 'nivel-1', 'local-bano')
    const copia = resultado.unidadesFuncionales[0]!.niveles[0]!.locales[1]!

    expect(copia).not.toHaveProperty('cotaPiso_m')

    // Cambiar la cota del Nivel afecta a AMBOS por igual -- prueba de que
    // el default no se materializó como override en la copia.
    const conNivelEditado: Proyecto = {
      ...resultado,
      unidadesFuncionales: resultado.unidadesFuncionales.map((u) => ({
        ...u,
        niveles: u.niveles.map((n) => ({ ...n, cotaHidraulicaReferencia_m: 3.2 })),
      })),
    }
    const [originalEditado, copiaEditada] = conNivelEditado.unidadesFuncionales[0]!.niveles[0]!.locales
    expect(originalEditado).not.toHaveProperty('cotaPiso_m')
    expect(copiaEditada).not.toHaveProperty('cotaPiso_m')
  })

  it('override explícito de cota del Local y de altura de un artefacto se copian tal cual', () => {
    const original = local({
      id: 'local-bano',
      cotaPiso_m: 3.1,
      artefactos: [
        artefacto({ id: 'a-lavatorio', artefactoId: 'lavatorio', alturaHidraulicaSobrePiso_m: 1.0 }),
        artefacto({ id: 'a-ducha', artefactoId: 'receptaculoDucha' }), // sin override: sugerida
      ],
    })
    const proyecto = proyectoCon([uf({ niveles: [nivel({ cotaHidraulicaReferencia_m: 3, locales: [original] })] })])

    const resultado = duplicarLocalEnNivelDeUnidadFuncionalEnProyecto(proyecto, 'uf-1', 'nivel-1', 'local-bano')
    const copia = resultado.unidadesFuncionales[0]!.niveles[0]!.locales[1]!

    expect(copia.cotaPiso_m).toBe(3.1)
    expect(copia.artefactos[0]!.alturaHidraulicaSobrePiso_m).toBe(1.0)
    expect(copia.artefactos[1]!).not.toHaveProperty('alturaHidraulicaSobrePiso_m')

    // Editar la copia no afecta al original.
    const copiaConOverrideDistinto: Local = { ...copia, cotaPiso_m: 5 }
    expect(copiaConOverrideDistinto.cotaPiso_m).toBe(5)
    expect(original.cotaPiso_m).toBe(3.1)
  })
})

describe('duplicarLocalEnNivelDeUnidadFuncionalEnProyecto -- multinivel', () => {
  it('la copia aparece SÓLO en el Nivel del Local original, nunca en otro Nivel de la misma UF', () => {
    const localPB = local({ id: 'local-pb', tipo: 'cocina' })
    const localPA = local({ id: 'local-pa', tipo: 'bano' })
    const proyecto = proyectoCon([
      uf({
        niveles: [
          nivel({ id: 'nivel-pb', nombre: 'PB', locales: [localPB] }),
          nivel({ id: 'nivel-pa', nombre: 'PA', locales: [localPA] }),
        ],
      }),
    ])

    const resultado = duplicarLocalEnNivelDeUnidadFuncionalEnProyecto(proyecto, 'uf-1', 'nivel-pa', 'local-pa')

    const [nivelPb, nivelPa] = resultado.unidadesFuncionales[0]!.niveles
    expect(nivelPb!.locales).toHaveLength(1)
    expect(nivelPb!.locales[0]!.id).toBe('local-pb')
    expect(nivelPa!.locales).toHaveLength(2)
    expect(nivelPa!.locales.map((l) => l.id)).toContain('local-pa')
  })
})

// CAT-CONN-01 / M2 (sección 7-8, 17 y 25 del brief): la copia debe quedar
// hidráulicamente válida (mismo criterio que duplicarUnidadFuncional,
// D-δ.50) pero SIN heredar ningún dato físico del original.
describe('duplicarLocalEnNivelDeUnidadFuncionalEnProyecto -- conectividad física de la copia', () => {
  function proyectoConLocalConectado(): Proyecto {
    const uf1: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'Unidad funcional 1',
      niveles: [
        {
          id: 'nivel-1',
          nombre: 'Nivel 1',
          nivel: 0,
          cotaHidraulicaReferencia_m: 1,
          locales: [
            {
              id: 'local-bano',
              tipo: 'bano',
              regimen: 'domiciliario',
              artefactos: [
                { id: 'art-lavatorio', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' },
                { id: 'art-ducha', artefactoId: 'receptaculoDucha', cantidad: 1, origen: 'normativo' },
              ],
            },
          ],
        },
      ],
    }
    const ref = (artefactoId: string) =>
      ({ tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId }) as const
    const nodos: Nodo[] = [
      { id: 'n-general' },
      { id: 'n0' },
      { id: 'n-af-1' },
      { id: 'n-af-lavatorio', referencia: ref('art-lavatorio') },
      { id: 'n-af-ducha', referencia: ref('art-ducha') },
      { id: 'n-acs', referencia: { tipo: 'produccionACS' } },
      { id: 'n-ac-1' },
      { id: 'n-ac-lavatorio', referencia: ref('art-lavatorio') },
      { id: 'n-ac-ducha', referencia: ref('art-ducha') },
    ]
    const tramos: Tramo[] = [
      { id: 't-general', nodoOrigenId: 'n-general', nodoDestinoId: 'n0', red: 'AF', longitud_m: 5 },
      { id: 't-af-bano', nodoOrigenId: 'n0', nodoDestinoId: 'n-af-1', red: 'AF', longitud_m: 4 },
      { id: 't-af-acs', nodoOrigenId: 'n0', nodoDestinoId: 'n-acs', red: 'AF', longitud_m: 2 },
      { id: 't-af-lavatorio', nodoOrigenId: 'n-af-1', nodoDestinoId: 'n-af-lavatorio', red: 'AF' },
      { id: 't-af-ducha', nodoOrigenId: 'n-af-1', nodoDestinoId: 'n-af-ducha', red: 'AF' },
      { id: 't-ac-bano', nodoOrigenId: 'n-acs', nodoDestinoId: 'n-ac-1', red: 'AC', longitud_m: 4 },
      { id: 't-ac-lavatorio', nodoOrigenId: 'n-ac-1', nodoDestinoId: 'n-ac-lavatorio', red: 'AC' },
      { id: 't-ac-ducha', nodoOrigenId: 'n-ac-1', nodoDestinoId: 'n-ac-ducha', red: 'AC' },
    ]
    return proyectoCon([uf1], { nodos, tramos })
  }

  it('la copia no deja ningún Artefacto normativo sin conexión física (queda hidráulicamente válida)', () => {
    const proyecto = proyectoConLocalConectado()

    const resultado = duplicarLocalEnNivelDeUnidadFuncionalEnProyecto(proyecto, 'uf-1', 'nivel-1', 'local-bano')

    expect(validarRedHidraulica(resultado)).toEqual([])
    expect(auditarCoberturaFisica(resultado).completa).toBe(true)
  })

  it('la copia NO reutiliza ningún nodo/tramo del original -- todos sus ids son nuevos', () => {
    const proyecto = proyectoConLocalConectado()
    const idsOriginales = new Set(proyecto.redHidraulica!.nodos.map((n) => n.id))
    const idsTramosOriginales = new Set(proyecto.redHidraulica!.tramos.map((t) => t.id))

    const resultado = duplicarLocalEnNivelDeUnidadFuncionalEnProyecto(proyecto, 'uf-1', 'nivel-1', 'local-bano')
    const localCopia = resultado.unidadesFuncionales[0]!.niveles[0]!.locales[1]!

    const nodosDeLaCopia = resultado.redHidraulica!.nodos.filter(
      (n) => n.referencia?.tipo === 'artefacto' && n.referencia.localId === localCopia.id,
    )
    // lavatorio (AF+AC) + ducha (AF+AC) => 4 terminales nuevos.
    expect(nodosDeLaCopia).toHaveLength(4)
    for (const nodo of nodosDeLaCopia) {
      expect(idsOriginales.has(nodo.id)).toBe(false)
    }

    // Ningún tramo nuevo apunta a un terminal del Local ORIGINAL.
    const idsTerminalesOriginales = new Set(
      proyecto.redHidraulica!.nodos
        .filter((n) => n.referencia?.tipo === 'artefacto' && n.referencia.localId === 'local-bano')
        .map((n) => n.id),
    )
    for (const tramo of resultado.redHidraulica!.tramos) {
      if (idsTramosOriginales.has(tramo.id)) continue
      expect(idsTerminalesOriginales.has(tramo.nodoDestinoId)).toBe(false)
    }
  })

  it('la copia NO hereda montanteId, DN manual ni longitud relevada de los Tramos del original', () => {
    const base = proyectoConLocalConectado()
    // El original tiene relevamiento real + montante + DN manual en su
    // Tramo representativo.
    const proyecto: Proyecto = {
      ...base,
      montantes: [{ id: 'montante-1', red: 'AF' }],
      redHidraulica: {
        ...base.redHidraulica!,
        tramos: base.redHidraulica!.tramos.map((t) =>
          t.id === 't-af-bano'
            ? { ...t, longitud_m: 7.35, montanteId: 'montante-1', dnComercialAdoptado: '32' }
            : t,
        ),
      },
    }

    const resultado = duplicarLocalEnNivelDeUnidadFuncionalEnProyecto(proyecto, 'uf-1', 'nivel-1', 'local-bano')
    const localCopia = resultado.unidadesFuncionales[0]!.niveles[0]!.locales[1]!

    const idsTerminalesCopia = new Set(
      resultado.redHidraulica!.nodos
        .filter((n) => n.referencia?.tipo === 'artefacto' && n.referencia.localId === localCopia.id)
        .map((n) => n.id),
    )
    const tramosNuevosDeLaCopia = resultado.redHidraulica!.tramos.filter((t) => {
      if (base.redHidraulica!.tramos.some((original) => original.id === t.id)) return false
      const destino = t.nodoDestinoId
      if (idsTerminalesCopia.has(destino)) return true
      return resultado.redHidraulica!.tramos.some(
        (h) => h.nodoOrigenId === destino && idsTerminalesCopia.has(h.nodoDestinoId),
      )
    })

    expect(tramosNuevosDeLaCopia.length).toBeGreaterThan(0)
    for (const t of tramosNuevosDeLaCopia) {
      expect(t.montanteId).toBeUndefined()
      expect(t.dnComercialAdoptado).toBeUndefined()
      // Backfill de predimensionamiento (D-δ.51): default típico, nunca 7,35.
      expect(t.longitud_m).not.toBe(7.35)
    }
    // El original conserva su relevamiento intacto.
    expect(resultado.redHidraulica!.tramos.find((t) => t.id === 't-af-bano')!.longitud_m).toBe(7.35)
    expect(resultado.redHidraulica!.tramos.find((t) => t.id === 't-af-bano')!.montanteId).toBe('montante-1')
  })

  it('sin redHidraulica en el proyecto: sólo duplica el Local, sin tocar topología', () => {
    const proyecto = proyectoCon([uf({ niveles: [nivel({ locales: [local({ id: 'local-bano' })] })] })])

    const resultado = duplicarLocalEnNivelDeUnidadFuncionalEnProyecto(proyecto, 'uf-1', 'nivel-1', 'local-bano')

    expect(resultado.redHidraulica).toBeUndefined()
    expect(resultado.unidadesFuncionales[0]!.niveles[0]!.locales).toHaveLength(2)
  })
})

// Sección 16/26 del brief: duplicar un Local con artefactos computables
// debe incrementar la demanda de M1 naturalmente (más artefactos físicos
// en el proyecto) -- sin copiar ningún resultado calculado ni tocar la
// fórmula del motor. Con n=1 (noDomiciliario) Kc queda indeterminado
// (CRIT-A3 exige n>=2); duplicar el único Local lleva a n=2 y Kc se
// resuelve -- evidencia de que el segundo artefacto participa realmente
// del cálculo, sin hardcodear ningún valor de la fórmula.
describe('duplicarLocalEnNivelDeUnidadFuncionalEnProyecto -- recálculo de demanda (M1)', () => {
  it('con n=1 Kc queda indeterminado; tras duplicar el Local, n=2 y Kc se resuelve', () => {
    const proyecto = proyectoCon([
      {
        id: 'uf-1',
        nombre: 'Unidad funcional 1',
        niveles: [
          {
            id: 'nivel-1',
            nombre: 'Nivel 1',
            locales: [
              {
                id: 'local-1',
                tipo: 'otros',
                regimen: 'noDomiciliario',
                artefactos: [{ id: 'artefacto-1', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }],
              },
            ],
          },
        ],
      },
    ])
    const entrada = { normativa: { catalogoArtefactos, coeficientesMayoracion } }

    const kcAntes = calcularSimultaneidad({ proyecto, ...entrada }).resultados.kc
    if (!kcAntes || !('estado' in kcAntes)) throw new Error('se esperaba Kc indeterminado con n=1')
    expect(kcAntes.estado).toBe('indeterminado')

    const resultado = duplicarLocalEnNivelDeUnidadFuncionalEnProyecto(proyecto, 'uf-1', 'nivel-1', 'local-1')

    const kcDespues = calcularSimultaneidad({ proyecto: resultado, ...entrada }).resultados.kc
    if (!kcDespues || !('valor' in kcDespues)) throw new Error('se esperaba Kc resuelto con n=2 tras duplicar')
    expect(typeof kcDespues.valor).toBe('number')
  })
})
