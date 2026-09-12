import type { Proyecto } from '../../../modelo/proyecto'
import type { Nodo, Tramo } from '../../../modelo/redHidraulica'

export function fixture(n = 2): Proyecto {
  const terminales: Nodo[] = Array.from({ length: n }, (_, i) => ({ id: `terminal-${i}`, cota_m: 1,
    referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf', localId: 'bano', artefactoId: `a-${i}` } }))
  const nodos: Nodo[] = [{ id: 'origen', cota_m: 10 }, { id: 'entrada', ...(n === 2 || n === 4 ? { tee: { tipo: 'entradaCentral' as const } } : {}) }, ...terminales]
  const tramos: Tramo[] = [{ id: 'comun', nodoOrigenId: 'origen', nodoDestinoId: 'entrada', red: 'AF', longitud_m: 8, dnComercialAdoptado: '25 mm', accesorios: [] }]
  if (n === 4) {
    nodos.push({ id: 'bif-a', tee: { tipo: 'entradaCentral' } }, { id: 'bif-b', tee: { tipo: 'entradaCentral' } })
    for (const id of ['a', 'b']) tramos.push({ id: `intermedio-${id}`, nodoOrigenId: 'entrada', nodoDestinoId: `bif-${id}`, red: 'AF', longitud_m: 2, dnComercialAdoptado: '25 mm', accesorios: [] })
  }
  for (let i = 0; i < n; i++) tramos.push({ id: `ramal-${i}`, nodoOrigenId: n === 4 ? `bif-${i < 2 ? 'a' : 'b'}` : 'entrada', nodoDestinoId: `terminal-${i}`, red: 'AF', longitud_m: 3, dnComercialAdoptado: i === 0 ? '20 mm' : '25 mm', accesorios: [] })
  return {
    metadatos: { nombre: 'Baño HYD-EST', obra: '', comitente: '', fecha: '2026-09-12', schemaVersion: '1.0.0', versionNormativa: 'eras-2023' },
    parametros: { tipoDeProyecto: 'viviendaIndividual', presionSobreAcera_m: 0, alturaArtefactoMasDesfavorable_m: 0 },
    unidadesFuncionales: [{ id: 'uf', nombre: 'UF', niveles: [{ id: 'nivel', nombre: 'PB', cotaHidraulicaReferencia_m: 0, locales: [{ id: 'bano', tipo: 'bano', regimen: 'domiciliario', artefactos: terminales.map((_, i) => ({ id: `a-${i}`, artefactoId: i % 2 ? 'receptaculoDucha' : 'lavatorio', cantidad: 1, origen: 'normativo' })) }] }] }],
    configuracionHidraulica: { metodoPerdidaDistribuida: 'hazenWilliams', metodoPerdidaLocalizada: 'estimado', granularidadHidraulica: 'profesional', materialTuberiaId: 'ppr', sistemaDeTuberiaId: 'acquaSystemMagnumPn20' },
    redHidraulica: { nodos, tramos },
  }
}
