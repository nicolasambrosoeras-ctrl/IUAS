// HYD-OVERPASS-01 §11: el proyecto de referencia (Vivienda unifamiliar de
// ejemplo) debe conservar sus 11 sobrepasos base -- ya no como una fila
// genérica sin red/DN, sino como "Sobrepaso fusión" trazable por
// (Local, red, DN real). Este archivo es deliberadamente independiente de
// resolverDatosDeListadoDeMateriales.test.ts (fixtures sintéticos) y de
// generarDocumentoPdfMateriales.test.ts (totales agregados del PDF): su
// único propósito es fijar, con el proyecto real de referencia, que la
// cantidad base total de piezas físicas de Sobrepaso no cambió al
// resolver este defecto -- sólo cambió CÓMO se presentan (antes: 1 fila
// "Sobrepaso" por Local, sin red/DN; ahora: 1 fila "Sobrepaso fusión" por
// (Local, red) con su DN real).
import { describe, it, expect } from 'vitest'
import { proyectoInicial } from '../../interfaz/paginas/proyectoDeEjemplo'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import { resolverDatosDeListadoDeMateriales } from './resolverDatosDeListadoDeMateriales'

describe('HYD-OVERPASS-01 -- proyecto de referencia (Vivienda unifamiliar de ejemplo)', () => {
  it('conserva 11 sobrepasos base en total, ahora como "Sobrepaso fusión" con red y DN reales (nunca "DN a definir" ni red "—")', () => {
    const computo = resolverDatosDeListadoDeMateriales(proyectoInicial, catalogoArtefactos, coeficientesMayoracion)
    const sobrepasos = computo.accesorios.filter((a) => a.etiqueta === 'Sobrepaso fusión')

    expect(sobrepasos.length).toBeGreaterThan(0)
    for (const item of sobrepasos) {
      expect(item.red).toBeDefined()
      expect(item.dnComercial).toBeDefined()
      expect(item.dnComercial).not.toBe('DN a definir')
    }
    const totalBase = sobrepasos.reduce((suma, item) => suma + item.cantidadComputada, 0)
    expect(totalBase).toBe(11)

    // Ningún "Sobrepaso" genérico (etiqueta previa a este slice) debe sobrevivir.
    expect(computo.accesorios.some((a) => a.etiqueta === 'Sobrepaso')).toBe(false)
    expect(computo.pendientes.some((p) => p.toLowerCase().includes('sobrepaso'))).toBe(false)
  })
})
