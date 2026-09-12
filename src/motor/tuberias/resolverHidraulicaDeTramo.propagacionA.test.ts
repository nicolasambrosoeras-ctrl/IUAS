// FIX-M2-A-PROP-01: cambiar el coeficiente de mayoracion `a` (via
// `tipoDeProyecto`, unico origen normativo de `a` -- ver coeficientes-
// mayoracion/index.ts) debe propagarse al Qc/velocidad de CADA tramo cuyo
// n>1, tanto en la alimentacion general (t-general, aguas arriba de toda la
// topologia) como en una rama aguas abajo (t-af-bano, analoga a un
// montante). Este test cubre el MOTOR (resolverHidraulicaDeTramo /
// resolverPerdidaDistribuidaDeTramo) de forma independiente del render de
// React -- la regresion real (memo de ResultadoHidraulicoDeTramo que no
// invalidaba con `tipoDeProyecto`) esta cubierta en
// sonPropsDeDimensionamientoEquivalentes.test.ts /
// sonPropsDeSeccionDeUnidadFuncionalEquivalentes.test.ts; este archivo
// prueba que, si el arbol SI vuelve a renderizar, el motor produce Q/V
// correctos y consistentes con V = Q / A.
//
// Fixture duplicada localmente a proposito (mismo criterio que
// resolverHidraulicaDeTramo.integracionM1.test.ts): reproduce los 11
// artefactos y la redHidraulica completa de proyectoInicial en
// MotorDemandaPantalla.tsx, sin importar nada de interfaz/paginas.
import { describe, it, expect } from 'vitest'
import type {
  Artefacto,
  MetadatosProyecto,
  ParametrosProyecto,
  Proyecto,
  TipoDeProyecto,
  UnidadFuncional,
} from '../../modelo/proyecto'
import type { RedHidraulica } from '../../modelo/redHidraulica'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import { calcularSimultaneidad } from '../demanda/simultaneidad/calcularSimultaneidad'
import { resolverHidraulicaDeTramo } from './resolverHidraulicaDeTramo'
import { resolverPerdidaDistribuidaDeTramo } from './resolverPerdidaDistribuidaDeTramo'
import { catalogoSistemasDeTuberia } from './sistemaDeTuberia'
import { catalogoMaterialesTuberia } from './materialTuberia'

function metadatos(): MetadatosProyecto {
  return {
    nombre: 'Proyecto de propagacion de a',
    obra: 'Obra de propagacion',
    comitente: 'Comitente de propagacion',
    fecha: '2026-01-01',
    schemaVersion: '1.0.0',
    versionNormativa: 'eras-2023',
  }
}

function parametros(tipoDeProyecto: TipoDeProyecto): ParametrosProyecto {
  return {
    tipoDeProyecto,
    presionSobreAcera_m: 2,
    alturaArtefactoMasDesfavorable_m: 3,
  }
}

function artefacto(idInstancia: string, artefactoIdCatalogo: string): Artefacto {
  return { id: idInstancia, artefactoId: artefactoIdCatalogo, cantidad: 1, origen: 'normativo' }
}

const unidadesFuncionales: readonly UnidadFuncional[] = [
  {
    id: 'uf-1',
    nombre: 'Unidad funcional 1',
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
          artefacto('artefacto-bano-1', 'lavatorio'),
          artefacto('artefacto-bano-2', 'receptaculoDucha'),
          artefacto('artefacto-bano-3', 'bidet'),
          artefacto('artefacto-bano-4', 'inodoroDeposito'),
        ],
      },
      {
        id: 'local-cocina',
        tipo: 'cocina',
        regimen: 'domiciliario',
        artefactos: [artefacto('artefacto-cocina-1', 'piletaDeCocina'), artefacto('artefacto-cocina-2', 'maquinaLavavajillas')],
      },
      {
        id: 'local-lavadero',
        tipo: 'lavadero',
        regimen: 'domiciliario',
        artefactos: [artefacto('artefacto-lavadero-1', 'piletaDeLavar'), artefacto('artefacto-lavadero-2', 'maquinaLavarropas')],
      },
      {
        id: 'local-toilette',
        tipo: 'toilette',
        regimen: 'domiciliario',
        artefactos: [artefacto('artefacto-toilette-1', 'lavatorio'), artefacto('artefacto-toilette-2', 'inodoroDeposito')],
      },
      {
        id: 'local-patio',
        tipo: 'jardin',
        regimen: 'domiciliario',
        artefactos: [artefacto('artefacto-patio-1', 'canillaDeServicio')],
      },
        ],
      },
    ],
  },
]

const redHidraulica: RedHidraulica = {
  nodos: [
    { id: 'n-general' },
    { id: 'n-0' },
    { id: 'n-af-1' },
    { id: 'n-af-lavatorio', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'artefacto-bano-1' } },
    { id: 'n-af-ducha', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'artefacto-bano-2' } },
    { id: 'n-af-bidet', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'artefacto-bano-3' } },
    { id: 'n-af-inodoro', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'artefacto-bano-4' } },
    { id: 'n-acs', referencia: { tipo: 'produccionACS' } },
    { id: 'n-ac-1' },
    { id: 'n-ac-lavatorio', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'artefacto-bano-1' } },
    { id: 'n-ac-ducha', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'artefacto-bano-2' } },
    { id: 'n-ac-bidet', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'artefacto-bano-3' } },

    { id: 'n-af-toilette-1' },
    { id: 'n-af-toilette-lavatorio', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-toilette', artefactoId: 'artefacto-toilette-1' } },
    { id: 'n-af-toilette-inodoro', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-toilette', artefactoId: 'artefacto-toilette-2' } },
    { id: 'n-ac-toilette-lavatorio', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-toilette', artefactoId: 'artefacto-toilette-1' } },

    { id: 'n-af-cocina-1' },
    { id: 'n-af-cocina-pileta', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-cocina', artefactoId: 'artefacto-cocina-1' } },
    { id: 'n-af-cocina-lavavajillas', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-cocina', artefactoId: 'artefacto-cocina-2' } },
    { id: 'n-ac-cocina-pileta', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-cocina', artefactoId: 'artefacto-cocina-1' } },

    { id: 'n-af-lavadero-1' },
    { id: 'n-af-lavadero-pileta', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-lavadero', artefactoId: 'artefacto-lavadero-1' } },
    { id: 'n-af-lavadero-lavarropas', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-lavadero', artefactoId: 'artefacto-lavadero-2' } },
    { id: 'n-ac-lavadero-pileta', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-lavadero', artefactoId: 'artefacto-lavadero-1' } },

    { id: 'n-af-patio-canilla', referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-patio', artefactoId: 'artefacto-patio-1' } },
  ],
  tramos: [
    { id: 't-general', nodoOrigenId: 'n-general', nodoDestinoId: 'n-0', red: 'AF' },
    { id: 't-af-bano', nodoOrigenId: 'n-0', nodoDestinoId: 'n-af-1', red: 'AF' },
    { id: 't-af-acs', nodoOrigenId: 'n-0', nodoDestinoId: 'n-acs', red: 'AF' },
    { id: 't-af-lavatorio', nodoOrigenId: 'n-af-1', nodoDestinoId: 'n-af-lavatorio', red: 'AF' },
    { id: 't-af-ducha', nodoOrigenId: 'n-af-1', nodoDestinoId: 'n-af-ducha', red: 'AF' },
    { id: 't-af-bidet', nodoOrigenId: 'n-af-1', nodoDestinoId: 'n-af-bidet', red: 'AF' },
    { id: 't-af-inodoro', nodoOrigenId: 'n-af-1', nodoDestinoId: 'n-af-inodoro', red: 'AF' },
    { id: 't-ac-bano', nodoOrigenId: 'n-acs', nodoDestinoId: 'n-ac-1', red: 'AC' },
    { id: 't-ac-lavatorio', nodoOrigenId: 'n-ac-1', nodoDestinoId: 'n-ac-lavatorio', red: 'AC' },
    { id: 't-ac-ducha', nodoOrigenId: 'n-ac-1', nodoDestinoId: 'n-ac-ducha', red: 'AC' },
    { id: 't-ac-bidet', nodoOrigenId: 'n-ac-1', nodoDestinoId: 'n-ac-bidet', red: 'AC' },

    { id: 't-af-toilette', nodoOrigenId: 'n-0', nodoDestinoId: 'n-af-toilette-1', red: 'AF' },
    { id: 't-af-toilette-lavatorio', nodoOrigenId: 'n-af-toilette-1', nodoDestinoId: 'n-af-toilette-lavatorio', red: 'AF' },
    { id: 't-af-toilette-inodoro', nodoOrigenId: 'n-af-toilette-1', nodoDestinoId: 'n-af-toilette-inodoro', red: 'AF' },
    { id: 't-ac-toilette', nodoOrigenId: 'n-acs', nodoDestinoId: 'n-ac-toilette-lavatorio', red: 'AC' },

    { id: 't-af-cocina', nodoOrigenId: 'n-0', nodoDestinoId: 'n-af-cocina-1', red: 'AF' },
    { id: 't-af-cocina-pileta', nodoOrigenId: 'n-af-cocina-1', nodoDestinoId: 'n-af-cocina-pileta', red: 'AF' },
    { id: 't-af-cocina-lavavajillas', nodoOrigenId: 'n-af-cocina-1', nodoDestinoId: 'n-af-cocina-lavavajillas', red: 'AF' },
    { id: 't-ac-cocina', nodoOrigenId: 'n-acs', nodoDestinoId: 'n-ac-cocina-pileta', red: 'AC' },

    { id: 't-af-lavadero', nodoOrigenId: 'n-0', nodoDestinoId: 'n-af-lavadero-1', red: 'AF' },
    { id: 't-af-lavadero-pileta', nodoOrigenId: 'n-af-lavadero-1', nodoDestinoId: 'n-af-lavadero-pileta', red: 'AF' },
    { id: 't-af-lavadero-lavarropas', nodoOrigenId: 'n-af-lavadero-1', nodoDestinoId: 'n-af-lavadero-lavarropas', red: 'AF' },
    { id: 't-ac-lavadero', nodoOrigenId: 'n-acs', nodoDestinoId: 'n-ac-lavadero-pileta', red: 'AC' },

    { id: 't-af-patio', nodoOrigenId: 'n-0', nodoDestinoId: 'n-af-patio-canilla', red: 'AF' },
  ],
}

function proyectoCon(tipoDeProyecto: TipoDeProyecto): Proyecto {
  return {
    metadatos: metadatos(),
    parametros: parametros(tipoDeProyecto),
    unidadesFuncionales,
    redHidraulica,
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'detallado',
      granularidadHidraulica: 'simplificada',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

// viviendaIndividual -> a=1, oficinaPublica -> a=2 (coeficientes-mayoracion/
// index.ts) -- ambos con la MISMA topologia/artefactos/cantidades, unica
// variable es `tipoDeProyecto`. Deliberadamente NO se usa
// 'viviendaMultifamiliar': determinarAEfectivo.ts (CRIT-A14) le da a ese
// tipo una regla especial (aEfectivo depende de cuantas UF distintas
// participan en el tramo, no solo del coeficiente base de la tabla) -- con
// una sola UF en este fixture, aEfectivo para viviendaMultifamiliar da 1,
// igual que viviendaIndividual, y el test daria un falso negativo sin que
// haya ningun bug. No corresponde reabrir ese criterio en este fix.
const proyectoA1 = proyectoCon('viviendaIndividual')
const proyectoA2 = proyectoCon('oficinaPublica')

function areaInteriorCm2(di_mm: number): number {
  const radio_cm = di_mm / 10 / 2
  return Math.PI * radio_cm * radio_cm
}

describe('propagacion de `a` (tipoDeProyecto) al motor de M2 -- FIX-M2-A-PROP-01', () => {
  it('M1: Qc global duplica exactamente al pasar de a=1 a a=2 (mismo n, mismo Kc)', () => {
    const qcA1 = calcularSimultaneidad({ proyecto: proyectoA1, normativa: { catalogoArtefactos, coeficientesMayoracion } })
      .resultados.qc
    const qcA2 = calcularSimultaneidad({ proyecto: proyectoA2, normativa: { catalogoArtefactos, coeficientesMayoracion } })
      .resultados.qc

    if (qcA1 === undefined || 'estado' in qcA1 || qcA2 === undefined || 'estado' in qcA2) {
      throw new Error('se esperaba Qc numerico de M1 para ambos proyectos')
    }
    expect(qcA1.valor).toBeGreaterThan(0)
    expect(qcA2.valor).toBeCloseTo(qcA1.valor * 2, 9)
  })

  it('alimentacion general (t-general): Q del tramo cambia con `a`, motor de M2 no queda stale', () => {
    const resultadoA1 = resolverHidraulicaDeTramo(proyectoA1, 't-general', catalogoArtefactos)
    const resultadoA2 = resolverHidraulicaDeTramo(proyectoA2, 't-general', catalogoArtefactos)

    if (resultadoA1.tipo !== 'conDemanda' || resultadoA2.tipo !== 'conDemanda') {
      throw new Error('se esperaba conDemanda para t-general en ambos proyectos')
    }
    expect(resultadoA2.qc_lps).not.toBe(resultadoA1.qc_lps)
    expect(resultadoA2.qc_lps).toBeCloseTo(resultadoA1.qc_lps * 2, 9)
  })

  it('rama tipo montante (t-af-bano): Q del tramo tambien cambia con `a`', () => {
    const resultadoA1 = resolverHidraulicaDeTramo(proyectoA1, 't-af-bano', catalogoArtefactos)
    const resultadoA2 = resolverHidraulicaDeTramo(proyectoA2, 't-af-bano', catalogoArtefactos)

    if (resultadoA1.tipo !== 'conDemanda' || resultadoA2.tipo !== 'conDemanda') {
      throw new Error('se esperaba conDemanda para t-af-bano en ambos proyectos')
    }
    expect(resultadoA2.qc_lps).not.toBe(resultadoA1.qc_lps)
    expect(resultadoA2.qc_lps).toBeCloseTo(resultadoA1.qc_lps * 2, 9)
  })

  it('DN/V de t-general: si el DN elegido coincide, la velocidad V=Q/A varia proporcionalmente; si el DN cruza umbral, la verificacion sigue siendo consistente', () => {
    const resultadoA1 = resolverPerdidaDistribuidaDeTramo(
      { ...proyectoA1, redHidraulica: { ...redHidraulica, tramos: redHidraulica.tramos.map((t) => (t.id === 't-general' ? { ...t, longitud_m: 5 } : t)) } },
      't-general',
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )
    const resultadoA2 = resolverPerdidaDistribuidaDeTramo(
      { ...proyectoA2, redHidraulica: { ...redHidraulica, tramos: redHidraulica.tramos.map((t) => (t.id === 't-general' ? { ...t, longitud_m: 5 } : t)) } },
      't-general',
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    if (resultadoA1.tipo !== 'conPerdidaDistribuida' || resultadoA2.tipo !== 'conPerdidaDistribuida') {
      throw new Error('se esperaba conPerdidaDistribuida para t-general en ambos proyectos')
    }

    // Propiedad central del bug: Qc cambio (motor no stale) y por tanto la
    // velocidad NO puede quedar identica salvo coincidencia matematica
    // imposible con Q duplicado.
    expect(resultadoA2.qc_lps).toBeCloseTo(resultadoA1.qc_lps * 2, 9)
    expect(resultadoA2.velocidadReal_mps).not.toBeCloseTo(resultadoA1.velocidadReal_mps, 3)

    // V = Q / A con el Di real de cada candidato, con la tolerancia numerica
    // ya usada en el resto del proyecto (misma formula que
    // seccion-escurrimiento, no reimplementada: ve_mps = qc_lps*1000 / (100*ae_cm2)
    // -- qc en L/s -> cm3/s, area en cm2 -> cm/s -> /100 -> m/s).
    const vCalculadaA1 = (resultadoA1.qc_lps * 1000) / (100 * areaInteriorCm2(resultadoA1.candidato.diametroInteriorEfectivo_mm))
    const vCalculadaA2 = (resultadoA2.qc_lps * 1000) / (100 * areaInteriorCm2(resultadoA2.candidato.diametroInteriorEfectivo_mm))
    expect(resultadoA1.velocidadReal_mps).toBeCloseTo(vCalculadaA1, 9)
    expect(resultadoA2.velocidadReal_mps).toBeCloseTo(vCalculadaA2, 9)

    if (resultadoA1.candidato.diametroInteriorEfectivo_mm === resultadoA2.candidato.diametroInteriorEfectivo_mm) {
      // Fixture 1 (§14): mismo DN -> V debe duplicarse exactamente junto con Q.
      expect(resultadoA2.velocidadReal_mps).toBeCloseTo(resultadoA1.velocidadReal_mps * 2, 6)
    } else {
      // Fixture 2 (§14): Qc duplicado empuja a un DN comercial mayor o igual
      // -- nunca menor, ya que el caudal solo crecio.
      expect(resultadoA2.candidato.diametroInteriorEfectivo_mm).toBeGreaterThan(resultadoA1.candidato.diametroInteriorEfectivo_mm)
    }
  })
})
