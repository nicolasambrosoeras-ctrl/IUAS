// PERF-SCALE-01E -- el comparador de memo de SeccionDeUnidadFuncional debe
// declarar "props equivalentes" (React se salta el re-render de ESA tarjeta
// de UF) cuando otra UF del proyecto cambia (agregar/duplicar/eliminar), y
// "distintas" en cualquier caso que sí afecte lo que esta tarjeta lee
// (ver sonPropsDeSeccionDeUnidadFuncionalEquivalentes.ts para el argumento
// de por qué es seguro, con la misma disciplina de auditoría recíproca que
// exigió FIX-MONTANTE-ADD-01).
import { describe, it, expect, vi } from 'vitest'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { proyectoInicial } from './proyectoDeEjemplo'
import { conCotaDeNodo, conTeeDeNodo, conLongitudDeTramo } from './actualizarRedHidraulica'
import { conGranularidadHidraulica } from './actualizarConfiguracionHidraulica'
import { duplicarUnidadFuncionalEnProyecto } from './duplicarUnidadFuncional'
import { agregarUnidadFuncionalVaciaEnProyecto } from './agregarUnidadFuncional'
import { conMontanteNuevo } from './montantesDelProyecto'
import { identificarFilasPrincipalesDeLocales } from './identificarFilasDeModulo2'
import { crearContextoDeCalculoM2 } from '../../motor/tuberias/contextoDeCalculoM2'
import {
  sonPropsDeSeccionDeUnidadFuncionalEquivalentes,
  type PropsDeSeccionDeUnidadFuncional,
} from './sonPropsDeSeccionDeUnidadFuncionalEquivalentes'
import type { Proyecto } from '../../modelo/proyecto'

function propsDe(
  proyecto: Proyecto,
  ufId: string,
  onCambiar: () => void,
): PropsDeSeccionDeUnidadFuncional {
  const uf = proyecto.unidadesFuncionales.find((u) => u.id === ufId)!
  return {
    proyecto,
    uf,
    catalogoArtefactos,
    filasPrincipalesDeLocales: identificarFilasPrincipalesDeLocales(proyecto),
    onCambiar,
    contextoDeCalculo: crearContextoDeCalculoM2(),
  }
}

describe('sonPropsDeSeccionDeUnidadFuncionalEquivalentes (PERF-SCALE-01E)', () => {
  const ufOriginalId = proyectoInicial.unidadesFuncionales[0]!.id

  it('mismas props exactas (misma referencia) -> equivalentes', () => {
    const onCambiar = vi.fn()
    const props = propsDe(proyectoInicial, ufOriginalId, onCambiar)
    expect(sonPropsDeSeccionDeUnidadFuncionalEquivalentes(props, props)).toBe(true)
  })

  it('agregar una UF vacía nueva -> la tarjeta de una UF EXISTENTE queda equivalente (no debe re-renderizar)', () => {
    const onCambiar = vi.fn()
    const { proyecto: conUfNueva } = agregarUnidadFuncionalVaciaEnProyecto(proyectoInicial)
    expect(
      sonPropsDeSeccionDeUnidadFuncionalEquivalentes(
        propsDe(proyectoInicial, ufOriginalId, onCambiar),
        propsDe(conUfNueva, ufOriginalId, onCambiar),
      ),
    ).toBe(true)
  })

  it('agregar un montante nuevo (Proyecto.montantes) -> la tarjeta de UF sigue equivalente (este árbol no lee montantes)', () => {
    const onCambiar = vi.fn()
    const { proyecto: editado } = conMontanteNuevo(proyectoInicial, 'AF')
    expect(
      sonPropsDeSeccionDeUnidadFuncionalEquivalentes(
        propsDe(proyectoInicial, ufOriginalId, onCambiar),
        propsDe(editado, ufOriginalId, onCambiar),
      ),
    ).toBe(true)
  })

  it('editar el pelo de agua de un nodo raíz (Nodo.cota_m) -> equivalentes (no debe re-renderizar)', () => {
    const onCambiar = vi.fn()
    const raizId = proyectoInicial.redHidraulica!.nodos.find((n) => n.referencia === undefined)!.id
    const editado = conCotaDeNodo(proyectoInicial, raizId, 12.5)
    expect(
      sonPropsDeSeccionDeUnidadFuncionalEquivalentes(
        propsDe(proyectoInicial, ufOriginalId, onCambiar),
        propsDe(editado, ufOriginalId, onCambiar),
      ),
    ).toBe(true)
  })

  it('duplicar OTRA UF -> DISTINTAS (redHidraulica.tramos cambia de referencia para todo el árbol)', () => {
    const onCambiar = vi.fn()
    const editado = duplicarUnidadFuncionalEnProyecto(proyectoInicial, ufOriginalId)
    // La propia UF original (ufOriginalId) sigue con la misma referencia,
    // pero `redHidraulica.tramos` sí cambió (se agregaron los tramos de la
    // copia) -- el comparador es conservador acá a propósito: no filtra
    // qué tramos pertenecen a qué UF.
    expect(
      sonPropsDeSeccionDeUnidadFuncionalEquivalentes(
        propsDe(proyectoInicial, ufOriginalId, onCambiar),
        propsDe(editado, ufOriginalId, onCambiar),
      ),
    ).toBe(false)
  })

  it('editar la longitud de un Tramo (redHidraulica.tramos) -> DISTINTAS (debe re-renderizar)', () => {
    const onCambiar = vi.fn()
    const tramoId = proyectoInicial.redHidraulica!.tramos[0]!.id
    const editado = conLongitudDeTramo(proyectoInicial, tramoId, 99)
    expect(
      sonPropsDeSeccionDeUnidadFuncionalEquivalentes(
        propsDe(proyectoInicial, ufOriginalId, onCambiar),
        propsDe(editado, ufOriginalId, onCambiar),
      ),
    ).toBe(false)
  })

  it('cambiar granularidadHidraulica (configuracionHidraulica) -> DISTINTAS (debe re-renderizar)', () => {
    const onCambiar = vi.fn()
    const editado = conGranularidadHidraulica(proyectoInicial, 'profesional')
    expect(
      sonPropsDeSeccionDeUnidadFuncionalEquivalentes(
        propsDe(proyectoInicial, ufOriginalId, onCambiar),
        propsDe(editado, ufOriginalId, onCambiar),
      ),
    ).toBe(false)
  })

  // FIX-MONTANTE-ADD-01 (guardia extendida a este comparador): configurar la
  // tee de un nodo reconstruye únicamente `redHidraulica.nodos` -- TeeDeNodoEditor
  // (dentro de LocalYRedCard, dentro de SeccionDeUnidadFuncional) lee `Nodo.tee`
  // y no debe quedarse con el checkbox sin marcar tras elegirlo.
  it('configurar la tee de un nodo (Nodo.tee) -> DISTINTAS (debe re-renderizar)', () => {
    const onCambiar = vi.fn()
    const nodoId = proyectoInicial.redHidraulica!.nodos[0]!.id
    const editado = conTeeDeNodo(proyectoInicial, nodoId, { tipo: 'entradaCentral' })
    expect(
      sonPropsDeSeccionDeUnidadFuncionalEquivalentes(
        propsDe(proyectoInicial, ufOriginalId, onCambiar),
        propsDe(editado, ufOriginalId, onCambiar),
      ),
    ).toBe(false)
  })

  it('esta misma UF pasa a ser OTRA (uf) -> DISTINTAS', () => {
    const onCambiar = vi.fn()
    const otraUfId = proyectoInicial.unidadesFuncionales[0]!.id
    const props1 = propsDe(proyectoInicial, otraUfId, onCambiar)
    const props2: PropsDeSeccionDeUnidadFuncional = { ...props1, uf: { ...props1.uf } }
    expect(sonPropsDeSeccionDeUnidadFuncionalEquivalentes(props1, props2)).toBe(false)
  })

  it('distinto catalogoArtefactos u onCambiar -> DISTINTAS', () => {
    const onCambiarA = vi.fn()
    const onCambiarB = vi.fn()
    expect(
      sonPropsDeSeccionDeUnidadFuncionalEquivalentes(
        propsDe(proyectoInicial, ufOriginalId, onCambiarA),
        propsDe(proyectoInicial, ufOriginalId, onCambiarB),
      ),
    ).toBe(false)
    expect(
      sonPropsDeSeccionDeUnidadFuncionalEquivalentes(propsDe(proyectoInicial, ufOriginalId, onCambiarA), {
        ...propsDe(proyectoInicial, ufOriginalId, onCambiarA),
        catalogoArtefactos: [...catalogoArtefactos],
      }),
    ).toBe(false)
  })
})
