import { describe, it, expect } from 'vitest'
import { obtenerKsDeAccesorio } from '../../../normativa/eras-2023/tabla-07-perdidas-localizadas'
import { resolverKsDeAccesorioDeTramo, SISTEMA_DE_TUBERIA_ACQUA_SYSTEM_ID } from './resolverKsDeAccesorioDeTramo'
import { obtenerKsAcquaSystem } from './catalogoKAccesoriosAcquaSystem'

const SISTEMA_NO_ACQUA = 'sistema-generico-no-acqua'

describe('resolverKsDeAccesorioDeTramo', () => {
  it('hierro/cualquier sistema no Acqua System: Tabla N°7 sin regresiones (comportamiento idéntico al de antes de HYD-OVERPASS-01)', () => {
    // `reducciones` queda deliberadamente fuera de esta lista: su K
    // depende de contexto topológico (resolverKsDeReduccion.ts), nunca de
    // resolverKsDeAccesorioDeTramo -- ver resolverKsDeReduccion.test.ts.
    for (const id of ['curva45', 'curva90', 'codo90', 'llaveDePaso', 'valvulaEsclusa', 'uniones', 'tuboSaliente'] as const) {
      const resultado = resolverKsDeAccesorioDeTramo(id, SISTEMA_NO_ACQUA)
      expect(resultado.ks).toBe(obtenerKsDeAccesorio(id))
      expect(resultado.catalogo).toBe('eras2023TablaN7')
    }
  })

  it('el mismo tipo geométrico puede resolver un K distinto según el sistema (codo90: ERAS 1,35 vs Acqua System 2,00)', () => {
    const eras = resolverKsDeAccesorioDeTramo('codo90', SISTEMA_NO_ACQUA)
    const acqua = resolverKsDeAccesorioDeTramo('codo90', SISTEMA_DE_TUBERIA_ACQUA_SYSTEM_ID)
    expect(eras.ks).toBeCloseTo(1.35, 6)
    expect(acqua.ks).toBeCloseTo(2.0, 6)
    expect(eras.ks).not.toBeCloseTo(acqua.ks, 6)
    expect(acqua.catalogo).toBe('acquaSystem')
  })

  it('PPR Acqua System: uniones/curva45/curva90/codo90 usan el catálogo del fabricante', () => {
    expect(resolverKsDeAccesorioDeTramo('uniones', SISTEMA_DE_TUBERIA_ACQUA_SYSTEM_ID)).toEqual({
      ks: 0.25,
      catalogo: 'acquaSystem',
      fuente: expect.any(String),
    })
    expect(resolverKsDeAccesorioDeTramo('curva45', SISTEMA_DE_TUBERIA_ACQUA_SYSTEM_ID).ks).toBeCloseTo(0.6, 6)
    expect(resolverKsDeAccesorioDeTramo('curva90', SISTEMA_DE_TUBERIA_ACQUA_SYSTEM_ID).ks).toBeCloseTo(2.0, 6)
  })

  it('PPR Acqua System: `reducciones` NUNCA se resuelve desde este resolver genérico (cae a Tabla N°7 porque no está en el catálogo por identidad) -- su K real depende de contexto topológico, ver resolverKsDeReduccion.test.ts', () => {
    const resultado = resolverKsDeAccesorioDeTramo('reducciones', SISTEMA_DE_TUBERIA_ACQUA_SYSTEM_ID)
    expect(resultado.catalogo).toBe('eras2023TablaN7')
    expect(resultado.ks).toBe(obtenerKsDeAccesorio('reducciones'))
  })

  it('PPR Acqua System: llaveDePaso/valvulaEsclusa/tuboSaliente no tienen coeficiente propio publicado -- conservan Tabla N°7 incluso bajo este sistema (nunca se inventa un valor)', () => {
    for (const id of ['llaveDePaso', 'valvulaEsclusa', 'tuboSaliente'] as const) {
      const resultado = resolverKsDeAccesorioDeTramo(id, SISTEMA_DE_TUBERIA_ACQUA_SYSTEM_ID)
      expect(resultado.ks).toBe(obtenerKsDeAccesorio(id))
      expect(resultado.catalogo).toBe('eras2023TablaN7')
    }
  })

  it('sobrepaso sólo existe en el catálogo Acqua System (K=1,20, adoptado por equivalencia a 2 codos a 45° del propio catálogo Acqua System)', () => {
    const fila = obtenerKsAcquaSystem('sobrepaso')
    expect(fila.ks).toBeCloseTo(1.2, 6)
    expect(fila.procedencia).toBe('equivalenciaDocumentada')
  })

  it('compatibilidad: hierro -> Acqua System modifica el K; Acqua System -> hierro restaura EXACTAMENTE Tabla N°7 (mismo id, ida y vuelta, sin resabios del catálogo anterior)', () => {
    const conHierro = resolverKsDeAccesorioDeTramo('codo90', 'hierro-generico')
    const conAcqua = resolverKsDeAccesorioDeTramo('codo90', SISTEMA_DE_TUBERIA_ACQUA_SYSTEM_ID)
    const devueltoAHierro = resolverKsDeAccesorioDeTramo('codo90', 'hierro-generico')

    expect(conHierro.ks).toBe(obtenerKsDeAccesorio('codo90'))
    expect(conAcqua.ks).not.toBe(conHierro.ks)
    expect(devueltoAHierro).toEqual(conHierro)
  })
})
