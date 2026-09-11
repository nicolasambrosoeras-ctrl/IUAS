// PERF-SCALE-01D -- el comparador de memo de ResultadoHidraulicoDeTramo debe
// declarar "props equivalentes" (React se salta el re-render) SOLO cuando
// ningún dato de dimensionamiento cambió, y "distintas" en cualquier otro
// caso. Ver sonPropsDeDimensionamientoEquivalentes.ts para el argumento de
// por qué esto es seguro (ningún consumidor de este árbol lee cota_m /
// desnivelConexion_m / presionSobreAcera_m).
import { describe, it, expect, vi } from 'vitest'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { proyectoInicial } from './proyectoDeEjemplo'
import { conCotaDeNodo, conTeeDeNodo } from './actualizarRedHidraulica'
import { conDesnivelConexion, conPresionSobreAcera } from './actualizarParametrosDeConexion'
import { duplicarUnidadFuncionalEnProyecto } from './duplicarUnidadFuncional'
import { conMontanteNuevo } from './montantesDelProyecto'
import { sonPropsDeDimensionamientoEquivalentes, type PropsDeDimensionamiento } from './sonPropsDeDimensionamientoEquivalentes'

function propsDe(proyecto: typeof proyectoInicial, onCambiar: () => void): PropsDeDimensionamiento {
  return { proyecto, catalogoArtefactos, onCambiar }
}

describe('sonPropsDeDimensionamientoEquivalentes (PERF-SCALE-01D)', () => {
  it('mismas props exactas (misma referencia) -> equivalentes', () => {
    const onCambiar = vi.fn()
    const props = propsDe(proyectoInicial, onCambiar)
    expect(sonPropsDeDimensionamientoEquivalentes(props, props)).toBe(true)
  })

  it('editar el pelo de agua de un nodo raíz (Nodo.cota_m) -> equivalentes (no debe re-renderizar)', () => {
    const onCambiar = vi.fn()
    const raizId = proyectoInicial.redHidraulica!.nodos.find((n) => n.referencia === undefined)!.id
    const editado = conCotaDeNodo(proyectoInicial, raizId, 12.5)
    expect(sonPropsDeDimensionamientoEquivalentes(propsDe(proyectoInicial, onCambiar), propsDe(editado, onCambiar))).toBe(
      true,
    )
  })

  it('editar el desnivel de conexión -> equivalentes (no debe re-renderizar)', () => {
    const onCambiar = vi.fn()
    const editado = conDesnivelConexion(proyectoInicial, 6.5)
    expect(sonPropsDeDimensionamientoEquivalentes(propsDe(proyectoInicial, onCambiar), propsDe(editado, onCambiar))).toBe(
      true,
    )
  })

  it('editar la presión sobre acera -> equivalentes (no debe re-renderizar)', () => {
    const onCambiar = vi.fn()
    const editado = conPresionSobreAcera(proyectoInicial, 25)
    expect(sonPropsDeDimensionamientoEquivalentes(propsDe(proyectoInicial, onCambiar), propsDe(editado, onCambiar))).toBe(
      true,
    )
  })

  it('duplicar una Unidad Funcional -> DISTINTAS (debe re-renderizar)', () => {
    const onCambiar = vi.fn()
    const ufId = proyectoInicial.unidadesFuncionales[0]!.id
    const editado = duplicarUnidadFuncionalEnProyecto(proyectoInicial, ufId)
    expect(sonPropsDeDimensionamientoEquivalentes(propsDe(proyectoInicial, onCambiar), propsDe(editado, onCambiar))).toBe(
      false,
    )
  })

  it('editar la longitud de un Tramo (redHidraulica.tramos) -> DISTINTAS (debe re-renderizar)', () => {
    const onCambiar = vi.fn()
    const red = proyectoInicial.redHidraulica!
    const tramoEditado = { ...red.tramos[0]!, longitud_m: (red.tramos[0]!.longitud_m ?? 0) + 1 }
    const editado = {
      ...proyectoInicial,
      redHidraulica: { ...red, tramos: red.tramos.map((t, i) => (i === 0 ? tramoEditado : t)) },
    }
    expect(sonPropsDeDimensionamientoEquivalentes(propsDe(proyectoInicial, onCambiar), propsDe(editado, onCambiar))).toBe(
      false,
    )
  })

  it('cambiar granularidadHidraulica (configuracionHidraulica) -> DISTINTAS (debe re-renderizar)', () => {
    const onCambiar = vi.fn()
    const editado = {
      ...proyectoInicial,
      configuracionHidraulica: { ...proyectoInicial.configuracionHidraulica, granularidadHidraulica: 'profesional' as const },
    }
    expect(sonPropsDeDimensionamientoEquivalentes(propsDe(proyectoInicial, onCambiar), propsDe(editado, onCambiar))).toBe(
      false,
    )
  })

  // FIX-MONTANTE-ADD-01: agregar un montante nuevo reconstruye únicamente
  // `Proyecto.montantes` -- ConstructorDeMontantes (dentro de este árbol) no
  // debe quedarse con el render viejo.
  it('agregar un montante nuevo (Proyecto.montantes) -> DISTINTAS (debe re-renderizar)', () => {
    const onCambiar = vi.fn()
    const { proyecto: editado } = conMontanteNuevo(proyectoInicial, 'AF')
    expect(sonPropsDeDimensionamientoEquivalentes(propsDe(proyectoInicial, onCambiar), propsDe(editado, onCambiar))).toBe(
      false,
    )
  })

  // FIX-MONTANTE-ADD-01: configurar la tee de un nodo reconstruye únicamente
  // `redHidraulica.nodos` (nunca `.tramos`) -- TeeDeNodoEditor (dentro de
  // DerivacionesDeMontante, dentro de este árbol) lee `Nodo.tee` y no debe
  // quedarse con el checkbox sin marcar tras elegirlo.
  it('configurar la tee de un nodo (Nodo.tee) -> DISTINTAS (debe re-renderizar)', () => {
    const onCambiar = vi.fn()
    const nodoId = proyectoInicial.redHidraulica!.nodos[0]!.id
    const editado = conTeeDeNodo(proyectoInicial, nodoId, { tipo: 'entradaCentral' })
    expect(sonPropsDeDimensionamientoEquivalentes(propsDe(proyectoInicial, onCambiar), propsDe(editado, onCambiar))).toBe(
      false,
    )
  })

  // FIX-M2-A-PROP-01: cambiar el tipo de proyecto (coeficiente de
  // simultaneidad `a`) reconstruye únicamente `proyecto.parametros` -- el
  // motor de M2 lee `tipoDeProyecto` para Qc/DN/V de cada tramo, así que
  // Tuberías/Montantes (dentro de este árbol) no deben quedarse con el
  // dimensionamiento de antes.
  it('cambiar tipoDeProyecto (coeficiente de simultaneidad a) -> DISTINTAS (debe re-renderizar)', () => {
    const onCambiar = vi.fn()
    const editado = {
      ...proyectoInicial,
      parametros: { ...proyectoInicial.parametros, tipoDeProyecto: 'centroComercial' as const },
    }
    expect(sonPropsDeDimensionamientoEquivalentes(propsDe(proyectoInicial, onCambiar), propsDe(editado, onCambiar))).toBe(
      false,
    )
  })

  it('distinto catalogoArtefactos u onCambiar -> DISTINTAS', () => {
    const onCambiarA = vi.fn()
    const onCambiarB = vi.fn()
    expect(
      sonPropsDeDimensionamientoEquivalentes(propsDe(proyectoInicial, onCambiarA), propsDe(proyectoInicial, onCambiarB)),
    ).toBe(false)
    expect(
      sonPropsDeDimensionamientoEquivalentes(
        propsDe(proyectoInicial, onCambiarA),
        { proyecto: proyectoInicial, catalogoArtefactos: [...catalogoArtefactos], onCambiar: onCambiarA },
      ),
    ).toBe(false)
  })
})
