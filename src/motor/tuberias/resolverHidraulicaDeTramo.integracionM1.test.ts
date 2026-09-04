// Verificacion de consistencia entre Modulo 1 (calcularSimultaneidad, sobre
// unidadesFuncionales) y Modulo 2 (resolverHidraulicaDeTramo, sobre
// redHidraulica) para un tramo general aguas arriba de toda la topologia:
// ambos caminos deben producir el mismo Qc de forma independiente, sin que
// uno copie o reutilice el resultado del otro. No es un golden (no hay
// valor calculado a mano): la aserción principal es la igualdad entre dos
// resultados obtenidos por caminos de codigo distintos. Fixture duplicada
// localmente a proposito, igual que el resto de los tests de este paquete
// -- reproduce exactamente los 11 artefactos y la redHidraulica completa de
// proyectoInicial en MotorDemandaPantalla.tsx (incluido t-general), sin
// importar nada de la UI.
import { describe, it, expect } from 'vitest'
import type {
  Artefacto,
  MetadatosProyecto,
  ParametrosProyecto,
  Proyecto,
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
import { obtenerArtefactosAguasAbajo } from './topologia/obtenerArtefactosAguasAbajo'

function metadatos(): MetadatosProyecto {
  return {
    nombre: 'Proyecto de integración M1↔M2',
    obra: 'Obra de integración',
    comitente: 'Comitente de integración',
    fecha: '2026-01-01',
    schemaVersion: '1.0.0',
    versionNormativa: 'eras-2023',
  }
}

function parametros(): ParametrosProyecto {
  return {
    tipoDeProyecto: 'viviendaIndividual',
    presionSobreAcera_m: 2,
    alturaArtefactoMasDesfavorable_m: 3,
  }
}

function artefacto(idInstancia: string, artefactoIdCatalogo: string): Artefacto {
  return { id: idInstancia, artefactoId: artefactoIdCatalogo, cantidad: 1, origen: 'normativo' }
}

// Mismos 11 artefactos, mismas 5 Locales, misma UF-1 que proyectoInicial en
// MotorDemandaPantalla.tsx -- reproducidos aquí porque los tests de este
// paquete no importan datos de interfaz/paginas.
const unidadesFuncionales: readonly UnidadFuncional[] = [
  {
    id: 'uf-1',
    nombre: 'Unidad funcional 1',
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
]

// Misma redHidraulica completa que proyectoInicial (incluido t-general
// aguas arriba de n-0), reproducida aquí por el mismo motivo.
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

const proyecto: Proyecto = {
  metadatos: metadatos(),
  parametros: parametros(),
  unidadesFuncionales,
  redHidraulica,
  configuracionHidraulica: { metodoPerdidaDistribuida: 'hazenWilliams', metodoPerdidaLocalizada: 'detallado', materialTuberiaId: 'ppr', sistemaDeTuberiaId: 'acquaSystemMagnumPn20' },
}

describe('resolverHidraulicaDeTramo — consistencia M1 ↔ M2 sobre t-general', () => {
  it('deduplica correctamente los 11 artefactos aguas abajo de t-general', () => {
    const referencias = obtenerArtefactosAguasAbajo(proyecto, 't-general')

    expect(referencias).toHaveLength(11)
    const claves = new Set(referencias.map((r) => `${r.unidadFuncionalId}::${r.localId}::${r.artefactoId}`))
    expect(claves.size).toBe(11) // ninguna referencia duplicada tras la deduplicación
  })

  it('Qc de t-general (M2) coincide exactamente con Qc global de M1, calculados por caminos independientes', () => {
    const resultadoM2 = resolverHidraulicaDeTramo(proyecto, 't-general', catalogoArtefactos)
    const resultadoM1 = calcularSimultaneidad({ proyecto, normativa: { catalogoArtefactos, coeficientesMayoracion } })

    if (resultadoM2.tipo !== 'conDemanda') {
      throw new Error('se esperaba conDemanda para t-general')
    }
    const qcM1 = resultadoM1.resultados.qc
    if (qcM1 === undefined || 'estado' in qcM1) {
      throw new Error('se esperaba Qc numérico de M1')
    }

    // Propiedad principal: igualdad entre dos resultados obtenidos por
    // caminos de código independientes -- ninguno copia al otro.
    expect(resultadoM2.qc_lps).toBe(qcM1.valor)
    expect(resultadoM2.simultaneidad.qc_lps).toBe(qcM1.valor)

    // Valor conocido, solo como referencia adicional de claridad -- la
    // aserción de arriba es la que sostiene la propiedad real.
    expect(resultadoM2.qc_lps).toBe(0.7273238618387272)

    // Predimensionamiento (CRIT-A10 + CRIT-A16) sobre el Qc real de
    // t-general: valores derivados por las primitivas normativas, no
    // copiados -- ver seccion-escurrimiento/index.test.ts y
    // calcularPredimensionamientoDeTramo.test.ts para la verificación
    // matemática de estos mismos números.
    expect(resultadoM2.predimensionamiento.ve_mps).toBe(2.0)
    expect(resultadoM2.predimensionamiento.ae_cm2).toBeCloseTo(3.636619309193636, 9)
    expect(resultadoM2.predimensionamiento.diReferenciaPredimensionamiento_mm).toBeCloseTo(21.518102875515787, 9)
  })
})

// G1: golden end-to-end del vertical slice hidraulico completo -- demanda
// (M1/M2) -> seleccion de diametro comercial -> velocidad real -> perdida
// distribuida hf, sobre el mismo t-general y los mismos 11 artefactos ya
// usados arriba para el golden M1<->M2. Unica variacion: un Tramo local con
// longitud_m=5 (el fixture de arriba no muta -- se reconstruye el Tramo
// afectado sin tocar `redHidraulica`), replicando el caso ya verificado
// manualmente en navegador real (Correctivo L2). Valida exclusivamente
// outputs publicos de resolverPerdidaDistribuidaDeTramo -- no reimplementa
// Hazen-Williams ni ninguna formula del motor.
describe('resolverPerdidaDistribuidaDeTramo — golden end-to-end (G1) sobre t-general con longitud_m=5', () => {
  const tramoGeneralConLongitud = { ...redHidraulica.tramos[0]!, longitud_m: 5 }
  const proyectoConLongitud: Proyecto = {
    ...proyecto,
    redHidraulica: {
      ...redHidraulica,
      tramos: redHidraulica.tramos.map((tramo) => (tramo.id === 't-general' ? tramoGeneralConLongitud : tramo)),
    },
  }

  it('vertical slice completo: Qc -> diametro comercial -> velocidad -> hf, valores reales del motor', () => {
    const resultado = resolverPerdidaDistribuidaDeTramo(
      proyectoConLongitud,
      't-general',
      catalogoArtefactos,
      catalogoSistemasDeTuberia,
      catalogoMaterialesTuberia,
    )

    if (resultado.tipo !== 'conPerdidaDistribuida') {
      throw new Error(`se esperaba conPerdidaDistribuida, se obtuvo "${resultado.tipo}"`)
    }

    // 1. Qc: mismo valor exacto que el golden M1<->M2 de arriba -- la
    // longitud_m agregada no participa en el calculo de demanda/Qc.
    expect(resultado.qc_lps).toBe(0.7273238618387272)

    // n hidraulico efectivo (D-delta.34): mismo valor que los 11
    // artefactos deduplicados aguas abajo de t-general (cantidad=1 en
    // todos, sin CRIT-A22 activo en este golden).
    expect(resultado.n).toBe(11)

    // 2-4. Seleccion de diametro comercial (CRIT-A23) sobre el catalogo real
    // Acqua System Magnum PN20 -- primer candidato admisible.
    expect(resultado.candidato.denominacionComercial).toBe('25 mm')
    expect(resultado.candidato.diametroInteriorEfectivo_mm).toBe(18)
    expect(resultado.verificacionVelocidad).toEqual({ tipo: 'admisible', limiteMinimo_mps: 1, limiteMaximo_mps: 3 })

    // 5. Velocidad real (CRIT-A19), calculada por el motor, no derivada acá.
    expect(resultado.velocidadReal_mps).toBeCloseTo(2.8582021688967947, 9)

    // 6. Longitud: la cargada en el Tramo local, sin derivar de Δz ni cotas.
    expect(resultado.longitud_m).toBe(5)

    // 7-9. Perdida distribuida Hazen-Williams (CRIT-A17), metodo del demo.
    expect(resultado.detalle.metodo).toBe('hazenWilliams')
    expect(resultado.hf_m).toBeCloseTo(2.4085533165200532, 9)

    // 10. Coherencia interna hf_m = J * longitud_m, sin reimplementar la
    // formula de Hazen-Williams -- solo multiplica los dos outputs publicos
    // que el motor ya devuelve.
    if (resultado.detalle.metodo === 'hazenWilliams') {
      expect(resultado.detalle.perdidaUnitaria_J_m_m * resultado.longitud_m).toBeCloseTo(resultado.hf_m, 9)
    }
  })
})
