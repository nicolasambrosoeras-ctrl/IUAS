import { describe, it, expect } from 'vitest'
import type { Artefacto, Local, Nivel, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { duplicarUnidadFuncional, duplicarUnidadFuncionalEnProyecto } from './duplicarUnidadFuncional'
import { validarRedHidraulica } from '../../validacion/redHidraulica'
import { auditarCoberturaFisica } from '../../motor/tuberias/cobertura/auditarCoberturaFisica'

function artefactoDePrueba(overrides: Partial<Artefacto> = {}): Artefacto {
  return { id: 'artefacto-1', artefactoId: 'lavatorio', cantidad: 2, origen: 'normativo', ...overrides }
}

function localDePrueba(overrides: Partial<Local> = {}): Local {
  return {
    id: 'local-1',
    tipo: 'bano',
    regimen: 'domiciliario',
    artefactos: [artefactoDePrueba()],
    ...overrides,
  }
}

// UI-M1-MULTINIVEL-01: shim de compatibilidad SOLO de este archivo de test
// -- acepta los mismos atajos que antes (`locales`, `nivel`,
// `cotaHidraulicaReferencia_m`) y los envuelve en un único Nivel, para no
// tener que reescribir cada call site existente. `niveles` explícito pisa
// todo lo demás (para los tests que arman una UF multinivel a mano).
function ufDePrueba(
  overrides: Partial<Omit<UnidadFuncional, 'niveles'>> & {
    locales?: readonly Local[]
    nivel?: number
    cotaHidraulicaReferencia_m?: number
    niveles?: readonly Nivel[]
  } = {},
): UnidadFuncional {
  const { locales, nivel, cotaHidraulicaReferencia_m, niveles, ...resto } = overrides
  return {
    id: 'uf-1',
    nombre: 'Departamento 1º A',
    niveles: niveles ?? [
      {
        id: 'uf-1-nivel-1',
        nombre: 'Nivel 1',
        ...(nivel !== undefined ? { nivel } : {}),
        ...(cotaHidraulicaReferencia_m !== undefined ? { cotaHidraulicaReferencia_m } : {}),
        locales: locales ?? [localDePrueba()],
      },
    ],
    ...resto,
  }
}

describe('duplicarUnidadFuncional', () => {
  it('copia la configuracion completa de la UF', () => {
    const original = ufDePrueba()

    const copia = duplicarUnidadFuncional(original)

    expect(copia.niveles[0]!.locales).toHaveLength(1)
    expect(copia.niveles[0]!.locales[0]?.tipo).toBe('bano')
    expect(copia.niveles[0]!.locales[0]?.regimen).toBe('domiciliario')
    expect(copia.niveles[0]!.locales[0]?.artefactos).toHaveLength(1)
    expect(copia.niveles[0]!.locales[0]?.artefactos[0]?.artefactoId).toBe('lavatorio')
    expect(copia.niveles[0]!.locales[0]?.artefactos[0]?.cantidad).toBe(2)
    expect(copia.niveles[0]!.locales[0]?.artefactos[0]?.origen).toBe('normativo')
  })

  it('genera UnidadFuncional.id nuevo', () => {
    const original = ufDePrueba()

    const copia = duplicarUnidadFuncional(original)

    expect(copia.id).not.toBe(original.id)
  })

  it('genera ids nuevos para todos los Locales', () => {
    const original = ufDePrueba({
      locales: [localDePrueba({ id: 'local-a' }), localDePrueba({ id: 'local-b' })],
    })

    const copia = duplicarUnidadFuncional(original)

    expect(copia.niveles[0]!.locales[0]?.id).not.toBe('local-a')
    expect(copia.niveles[0]!.locales[1]?.id).not.toBe('local-b')
    expect(copia.niveles[0]!.locales[0]?.id).not.toBe(copia.niveles[0]!.locales[1]?.id)
  })

  it('genera ids nuevos para todos los Artefactos', () => {
    const original = ufDePrueba({
      locales: [
        localDePrueba({
          artefactos: [artefactoDePrueba({ id: 'artefacto-a' }), artefactoDePrueba({ id: 'artefacto-b' })],
        }),
      ],
    })

    const copia = duplicarUnidadFuncional(original)
    const [artefactoCopiaA, artefactoCopiaB] = copia.niveles[0]!.locales[0]?.artefactos ?? []

    expect(artefactoCopiaA?.id).not.toBe('artefacto-a')
    expect(artefactoCopiaB?.id).not.toBe('artefacto-b')
    expect(artefactoCopiaA?.id).not.toBe(artefactoCopiaB?.id)
  })

  it('preserva tipo, regimen, artefactoId, cantidad y origen', () => {
    const original = ufDePrueba({
      locales: [
        localDePrueba({
          tipo: 'cocina',
          regimen: 'noDomiciliario',
          artefactos: [artefactoDePrueba({ artefactoId: 'piletaDeCocina', cantidad: 3, origen: 'usuario' })],
        }),
      ],
    })

    const copia = duplicarUnidadFuncional(original)

    expect(copia.niveles[0]!.locales[0]?.tipo).toBe('cocina')
    expect(copia.niveles[0]!.locales[0]?.regimen).toBe('noDomiciliario')
    expect(copia.niveles[0]!.locales[0]?.artefactos[0]?.artefactoId).toBe('piletaDeCocina')
    expect(copia.niveles[0]!.locales[0]?.artefactos[0]?.cantidad).toBe(3)
    expect(copia.niveles[0]!.locales[0]?.artefactos[0]?.origen).toBe('usuario')
  })

  it('preserva la ausencia de regimen cuando corresponde', () => {
    const { regimen: _regimen, ...localSinRegimen } = localDePrueba()
    const original = ufDePrueba({ locales: [localSinRegimen] })

    const copia = duplicarUnidadFuncional(original)

    expect('regimen' in (copia.niveles[0]!.locales[0] ?? {})).toBe(false)
  })

  it('los arrays de Locales y Artefactos son objetos nuevos', () => {
    const original = ufDePrueba()

    const copia = duplicarUnidadFuncional(original)

    expect(copia.niveles[0]!.locales).not.toBe(original.niveles[0]!.locales)
    expect(copia.niveles[0]!.locales[0]?.artefactos).not.toBe(original.niveles[0]!.locales[0]?.artefactos)
  })

  it('UF, Locales y Artefactos clonados no son las mismas instancias que los originales', () => {
    const original = ufDePrueba()

    const copia = duplicarUnidadFuncional(original)

    expect(copia).not.toBe(original)
    expect(copia.niveles[0]!.locales[0]).not.toBe(original.niveles[0]!.locales[0])
    expect(copia.niveles[0]!.locales[0]?.artefactos[0]).not.toBe(original.niveles[0]!.locales[0]?.artefactos[0])
  })

  it('modificar posteriormente el clon no muta el original', () => {
    const original = ufDePrueba()

    const copia = duplicarUnidadFuncional(original)
    const copiaMutada: UnidadFuncional = {
      ...copia,
      niveles: copia.niveles.map((nivel) => ({
        ...nivel,
        locales: nivel.locales.map((local) => ({
          ...local,
          artefactos: local.artefactos.map((artefacto) => ({ ...artefacto, cantidad: 99 })),
        })),
      })),
    }

    expect(copiaMutada.niveles[0]!.locales[0]?.artefactos[0]?.cantidad).toBe(99)
    expect(original.niveles[0]!.locales[0]?.artefactos[0]?.cantidad).toBe(2)
  })

  it('el nombre pasa de X a X (copia)', () => {
    const original = ufDePrueba({ nombre: 'Departamento 1º A' })

    const copia = duplicarUnidadFuncional(original)

    expect(copia.nombre).toBe('Departamento 1º A (copia)')
  })

  // GEOM-UX-01 §8 — duplicar conserva el DISEÑO EXPLÍCITO de cotas: los
  // overrides se duplican, lo heredado sigue heredado, y los defaults
  // NUNCA se materializan como overrides durante la copia.
  it('§8: duplica el override de cota de piso del Local y el override de altura del artefacto', () => {
    const original = ufDePrueba({
      cotaHidraulicaReferencia_m: 9,
      locales: [
        {
          id: 'local-bano',
          tipo: 'bano',
          regimen: 'domiciliario',
          cotaPiso_m: 9.5,
          artefactos: [
            { id: 'a-lavatorio', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' },
            { id: 'a-ducha', artefactoId: 'receptaculoDucha', cantidad: 1, origen: 'normativo', alturaHidraulicaSobrePiso_m: 2.15 },
          ],
        },
      ],
    })

    const copia = duplicarUnidadFuncional(original)

    expect(copia.niveles[0]!.cotaHidraulicaReferencia_m).toBe(9)
    expect(copia.niveles[0]!.locales[0]?.cotaPiso_m).toBe(9.5)
    // Lavatorio sin override: sigue sin override (default IUAS, no materializado).
    expect(copia.niveles[0]!.locales[0]?.artefactos[0]?.alturaHidraulicaSobrePiso_m).toBeUndefined()
    // Ducha con override explícito: se conserva tal cual.
    expect(copia.niveles[0]!.locales[0]?.artefactos[1]?.alturaHidraulicaSobrePiso_m).toBe(2.15)
  })

  it('§8: los valores HEREDADOS siguen heredados en la copia -- no se materializa ningún default', () => {
    const original = ufDePrueba({
      cotaHidraulicaReferencia_m: 6,
      locales: [
        {
          id: 'local-bano',
          tipo: 'bano',
          regimen: 'domiciliario',
          // sin cotaPiso_m: hereda la UF
          artefactos: [{ id: 'a-lavatorio', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' }],
        },
      ],
    })

    const copia = duplicarUnidadFuncional(original)

    // El Local de la copia sigue SIN override -> sigue heredando la UF.
    expect(copia.niveles[0]!.locales[0]).not.toHaveProperty('cotaPiso_m')
    expect(copia.niveles[0]!.locales[0]?.artefactos[0]).not.toHaveProperty('alturaHidraulicaSobrePiso_m')
  })

  // UI-M1-MULTINIVEL-01 sección 25: duplicar una UF multinivel copia TODOS
  // sus niveles, cada uno con nuevos ids, y conserva la estructura (nivel/
  // cota/locales) de cada uno tal cual -- una UF dúplex se duplica como
  // otra UF dúplex, nunca colapsada a un único nivel.
  it('UI-M1-MULTINIVEL-01: duplica TODOS los niveles de una UF multinivel, con ids nuevos por nivel', () => {
    const original = ufDePrueba({
      niveles: [
        {
          id: 'nivel-pb',
          nombre: 'Planta Baja',
          nivel: 0,
          cotaHidraulicaReferencia_m: 0,
          locales: [localDePrueba({ id: 'local-cocina', tipo: 'cocina' })],
        },
        {
          id: 'nivel-pa',
          nombre: 'Planta Alta',
          nivel: 1,
          cotaHidraulicaReferencia_m: 3,
          locales: [localDePrueba({ id: 'local-bano', cotaPiso_m: 3.15 })],
        },
      ],
    })

    const copia = duplicarUnidadFuncional(original)

    expect(copia.niveles).toHaveLength(2)
    // ids nuevos por nivel, nunca los del original.
    expect(copia.niveles[0]!.id).not.toBe('nivel-pb')
    expect(copia.niveles[1]!.id).not.toBe('nivel-pa')
    expect(copia.niveles[0]!.id).not.toBe(copia.niveles[1]!.id)
    // nombre/nivel/cota de cada Nivel se preservan tal cual (mismo criterio
    // que antes para la UF de un único nivel).
    expect(copia.niveles[0]!.nombre).toBe('Planta Baja')
    expect(copia.niveles[0]!.nivel).toBe(0)
    expect(copia.niveles[0]!.cotaHidraulicaReferencia_m).toBe(0)
    expect(copia.niveles[1]!.nombre).toBe('Planta Alta')
    expect(copia.niveles[1]!.nivel).toBe(1)
    expect(copia.niveles[1]!.cotaHidraulicaReferencia_m).toBe(3)
    // Locales de cada nivel, con override conservado y id nuevo.
    expect(copia.niveles[0]!.locales[0]!.tipo).toBe('cocina')
    expect(copia.niveles[1]!.locales[0]!.cotaPiso_m).toBe(3.15)
    expect(copia.niveles[1]!.locales[0]!.id).not.toBe('local-bano')
  })
})

describe('duplicarUnidadFuncionalEnProyecto', () => {
  function proyectoDePrueba(unidadesFuncionales: readonly UnidadFuncional[]): Proyecto {
    return {
      metadatos: {
        nombre: 'Proyecto de prueba',
        obra: 'Obra',
        comitente: 'Comitente',
        fecha: '2026-08-09',
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
    }
  }

  it('la UF clonada queda inmediatamente despues de la original', () => {
    const ufA = ufDePrueba({ id: 'uf-a', nombre: 'UF A' })
    const ufB = ufDePrueba({ id: 'uf-b', nombre: 'UF B' })
    const ufC = ufDePrueba({ id: 'uf-c', nombre: 'UF C' })
    const proyecto = proyectoDePrueba([ufA, ufB, ufC])

    const resultado = duplicarUnidadFuncionalEnProyecto(proyecto, 'uf-b')

    expect(resultado.unidadesFuncionales.map((uf) => uf.nombre)).toEqual([
      'UF A',
      'UF B',
      'UF B (copia)',
      'UF C',
    ])
  })

  it('sin redHidraulica en el proyecto, solo reconstruye el array de UFs', () => {
    const uf = ufDePrueba()
    const proyecto = proyectoDePrueba([uf])

    const resultado = duplicarUnidadFuncionalEnProyecto(proyecto, uf.id)

    expect(resultado.redHidraulica).toBeUndefined()
    expect(resultado.unidadesFuncionales).toHaveLength(2)
  })

  it('UF inexistente: devuelve el proyecto sin cambios', () => {
    const uf = ufDePrueba()
    const proyecto = proyectoDePrueba([uf])

    const resultado = duplicarUnidadFuncionalEnProyecto(proyecto, 'uf-que-no-existe')

    expect(resultado).toBe(proyecto)
  })
})

// D-δ.50 (brief seccion 3-5, T1/T2): duplicar una UF debe dejar la copia
// con conectividad fisica valida -- nunca "artefactos normativos sin
// conexion fisica" como resultado normal. Reutiliza la sincronizacion
// M2-D (D-δ.49), no una segunda implementacion topologica.
describe('duplicarUnidadFuncionalEnProyecto -- conectividad fisica de la copia (D-δ.50)', () => {
  // Miniatura del patron del demo: una UF (PB) con un Bano de 2 terminales
  // AF+AC (lavatorio + ducha, colgados de una bifurcacion dedicada n-af-1/
  // n-ac-1) y un Patio de 1 terminal AF-only (canilla directa desde n0).
  // Cubre los tres casos de la sincronizacion al reconstruir la copia:
  // bootstrap (primer terminal del Local clonado), retrofit (segundo) y el
  // Local de un unico Artefacto (directo, sin bifurcacion).
  function metadatos() {
    return {
      nombre: 'Proyecto D-δ.50',
      obra: 'Obra',
      comitente: 'Comitente',
      fecha: '2026-09-07',
      schemaVersion: '1.0.0' as const,
      versionNormativa: 'eras-2023' as const,
    }
  }

  function proyectoConUnaUf(): Proyecto {
    const uf: UnidadFuncional = {
      id: 'uf-1',
      nombre: 'Unidad funcional 1',
      niveles: [
        {
          id: 'uf-1-nivel-1',
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
            {
              id: 'local-patio',
              tipo: 'jardin',
              regimen: 'domiciliario',
              artefactos: [{ id: 'art-canilla', artefactoId: 'canillaDeServicio', cantidad: 1, origen: 'normativo' }],
            },
          ],
        },
      ],
    }
    const ref = (localId: string, artefactoId: string) =>
      ({ tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId, artefactoId }) as const
    const nodos: Nodo[] = [
      { id: 'n-general' },
      { id: 'n0' },
      { id: 'n-af-1' },
      { id: 'n-af-lavatorio', referencia: ref('local-bano', 'art-lavatorio') },
      { id: 'n-af-ducha', referencia: ref('local-bano', 'art-ducha') },
      { id: 'n-acs', referencia: { tipo: 'produccionACS' } },
      { id: 'n-ac-1' },
      { id: 'n-ac-lavatorio', referencia: ref('local-bano', 'art-lavatorio') },
      { id: 'n-ac-ducha', referencia: ref('local-bano', 'art-ducha') },
      { id: 'n-af-canilla', referencia: ref('local-patio', 'art-canilla') },
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
      { id: 't-af-canilla', nodoOrigenId: 'n0', nodoDestinoId: 'n-af-canilla', red: 'AF' },
    ]
    const redHidraulica: RedHidraulica = { nodos, tramos }
    return {
      metadatos: metadatos(),
      parametros: { tipoDeProyecto: 'viviendaIndividual', presionSobreAcera_m: 2, alturaArtefactoMasDesfavorable_m: 3 },
      unidadesFuncionales: [uf],
      redHidraulica,
      configuracionHidraulica: {
        metodoPerdidaDistribuida: 'hazenWilliams',
        metodoPerdidaLocalizada: 'estimado',
        granularidadHidraulica: 'simplificada',
        materialTuberiaId: 'ppr',
        sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
      },
    }
  }

  it('T1: la copia no deja ningun Artefacto normativo sin conexion fisica', () => {
    const proyecto = proyectoConUnaUf()

    const resultado = duplicarUnidadFuncionalEnProyecto(proyecto, 'uf-1')

    const cobertura = auditarCoberturaFisica(resultado)
    expect(cobertura.artefactosSinReferencia).toEqual([])
    expect(cobertura.completa).toBe(true)
  })

  it('T1: la red resultante es estructuralmente valida', () => {
    const proyecto = proyectoConUnaUf()

    const resultado = duplicarUnidadFuncionalEnProyecto(proyecto, 'uf-1')

    expect(validarRedHidraulica(resultado)).toEqual([])
  })

  it('T2: los nodos/tramos de la copia tienen ids propios y referencian a los clones, nunca a la UF original', () => {
    const proyecto = proyectoConUnaUf()

    const resultado = duplicarUnidadFuncionalEnProyecto(proyecto, 'uf-1')
    const copia = resultado.unidadesFuncionales[1]!
    const idsOriginales = new Set(proyecto.redHidraulica!.nodos.map((n) => n.id))
    const idsTramosOriginales = new Set(proyecto.redHidraulica!.tramos.map((t) => t.id))

    const nodosDeLaCopia = resultado.redHidraulica!.nodos.filter(
      (n) => n.referencia?.tipo === 'artefacto' && n.referencia.unidadFuncionalId === copia.id,
    )
    // Un terminal por Red de cada Artefacto clonado: lavatorio (AF+AC),
    // ducha (AF+AC), canilla (AF) => 5 terminales.
    expect(nodosDeLaCopia).toHaveLength(5)
    for (const nodo of nodosDeLaCopia) {
      expect(idsOriginales.has(nodo.id)).toBe(false)
    }

    // Ningun tramo nuevo (los que no estaban en el proyecto original)
    // referencia por origen/destino un nodo terminal de la UF original.
    const idsTerminalesOriginales = new Set(
      proyecto.redHidraulica!.nodos
        .filter((n) => n.referencia?.tipo === 'artefacto' && n.referencia.unidadFuncionalId === 'uf-1')
        .map((n) => n.id),
    )
    for (const tramo of resultado.redHidraulica!.tramos) {
      if (idsTramosOriginales.has(tramo.id)) continue
      expect(idsTerminalesOriginales.has(tramo.nodoDestinoId)).toBe(false)
    }
  })

  it('T2: mutar un Artefacto de la copia no altera el original', () => {
    const proyecto = proyectoConUnaUf()

    const resultado = duplicarUnidadFuncionalEnProyecto(proyecto, 'uf-1')
    const copia = resultado.unidadesFuncionales[1]!
    copia.niveles[0]!.locales[0]!.artefactos[0]!.cantidad = 99

    expect(proyecto.unidadesFuncionales[0]!.niveles[0]!.locales[0]!.artefactos[0]!.cantidad).toBe(1)
  })

  it('T3: duplicar dos veces deja la red valida y sin artefactos desconectados', () => {
    let proyecto = proyectoConUnaUf()

    proyecto = duplicarUnidadFuncionalEnProyecto(proyecto, 'uf-1')
    const idSegundaUf = proyecto.unidadesFuncionales[1]!.id
    proyecto = duplicarUnidadFuncionalEnProyecto(proyecto, idSegundaUf)

    expect(proyecto.unidadesFuncionales).toHaveLength(3)
    expect(validarRedHidraulica(proyecto)).toEqual([])
    expect(auditarCoberturaFisica(proyecto).completa).toBe(true)
    const ids = proyecto.redHidraulica!.nodos.map((n) => n.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('R5 (D-δ.51): en Rápido, los Tramos representativos de los Local+Red de la copia reciben 5 m si estaban undefined -- nunca copian el relevamiento de la original', () => {
    // La original trae un relevamiento real distinto del default (7,35 m)
    // en su Tramo representativo de Baño AF.
    const base = proyectoConUnaUf()
    const conRelevamiento: Proyecto = {
      ...base,
      redHidraulica: {
        ...base.redHidraulica!,
        tramos: base.redHidraulica!.tramos.map((t) => (t.id === 't-af-bano' ? { ...t, longitud_m: 7.35 } : t)),
      },
    }

    const resultado = duplicarUnidadFuncionalEnProyecto(conRelevamiento, 'uf-1')
    const copia = resultado.unidadesFuncionales[1]!

    // Tramos representativos de la copia: los que van de la raíz compartida
    // (n0 / n-acs) a una bifurcación/terminal de un Local de la copia.
    const idsTerminalesCopia = new Set(
      resultado.redHidraulica!.nodos
        .filter((n) => n.referencia?.tipo === 'artefacto' && n.referencia.unidadFuncionalId === copia.id)
        .map((n) => n.id),
    )
    const tramosRepresentativosCopia = resultado.redHidraulica!.tramos.filter(
      (t) => (t.nodoOrigenId === 'n0' || t.nodoOrigenId === 'n-acs'),
    ).filter((t) => {
      // llega (directa o vía una bifurcación) a un terminal de la copia
      const destino = t.nodoDestinoId
      if (idsTerminalesCopia.has(destino)) return true
      return resultado.redHidraulica!.tramos.some((h) => h.nodoOrigenId === destino && idsTerminalesCopia.has(h.nodoDestinoId))
    })

    expect(tramosRepresentativosCopia.length).toBeGreaterThan(0)
    for (const t of tramosRepresentativosCopia) {
      expect(t.longitud_m).toBe(5) // default IUAS, nunca 7,35 de la original
    }
    // La original conserva su relevamiento intacto.
    expect(resultado.redHidraulica!.tramos.find((t) => t.id === 't-af-bano')!.longitud_m).toBe(7.35)
  })
})
