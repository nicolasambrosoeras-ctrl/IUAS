import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import type { Artefacto, MetadatosProyecto, ParametrosProyecto, Local, Proyecto, TipoDeProyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, ReferenciaDeArtefacto, Tramo } from '../../modelo/redHidraulica'
import type { ArtefactoNormativo } from '../../normativa/eras-2023/catalogo-artefactos'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import type { ResultadoPerdidaDistribuidaDeTramo } from '../../motor/tuberias/resolverPerdidaDistribuidaDeTramo'
import {
  describirReferenciaPendiente,
  textosDePerdidaDistribuidaDeTramo,
  resolverCambioDeLongitud,
  FilaResultado,
  TablaDeFilas,
} from './ResultadoHidraulicoDeTramo'

function proyectoCon(unidadesFuncionales: readonly UnidadFuncional[]): Proyecto {
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
    configuracionHidraulica: { metodoPerdidaDistribuida: 'hazenWilliams', metodoPerdidaLocalizada: 'detallado', materialTuberiaId: 'ppr', sistemaDeTuberiaId: 'acquaSystemMagnumPn20' },
  }
}

function referenciaA(unidadFuncionalId: string, localId: string, artefactoId: string): ReferenciaDeArtefacto {
  return { tipo: 'artefacto', unidadFuncionalId, localId, artefactoId }
}

describe('describirReferenciaPendiente', () => {
  it('resuelve UF, Local y nombre de catálogo en el formato "UF → Local → Artefacto"', () => {
    const artefacto: Artefacto = { id: 'a1', artefactoId: 'bidet', cantidad: 1, origen: 'normativo' }
    const local: Local = { id: 'local-bano', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto] }
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'Unidad funcional 1', locales: [local] }
    const proyecto = proyectoCon([uf])
    const catalogoArtefactos: readonly ArtefactoNormativo[] = [
      { id: 'bidet', nombre: 'Bidet' } as ArtefactoNormativo,
    ]

    const resultado = describirReferenciaPendiente(proyecto, catalogoArtefactos, referenciaA('uf-1', 'local-bano', 'a1'))

    expect(resultado).toBe('Unidad funcional 1 → Baño → Bidet')
  })

  it('usa ETIQUETA_TIPO_DE_LOCAL para traducir el tipo de Local, no el id técnico', () => {
    const artefacto: Artefacto = { id: 'a1', artefactoId: 'piletaDeCocina', cantidad: 1, origen: 'normativo' }
    const local: Local = { id: 'local-cocina-1', tipo: 'cocina', regimen: 'domiciliario', artefactos: [artefacto] }
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'Unidad funcional 1', locales: [local] }
    const proyecto = proyectoCon([uf])
    const catalogoArtefactos: readonly ArtefactoNormativo[] = [
      { id: 'piletaDeCocina', nombre: 'Pileta de cocina' } as ArtefactoNormativo,
    ]

    const resultado = describirReferenciaPendiente(proyecto, catalogoArtefactos, referenciaA('uf-1', 'local-cocina-1', 'a1'))

    expect(resultado).toContain('Cocina')
    expect(resultado).not.toContain('local-cocina-1')
  })

  it('nombre de artefacto obtenido del catálogo, no del artefactoId técnico', () => {
    const artefacto: Artefacto = { id: 'a1', artefactoId: 'receptaculoDucha', cantidad: 1, origen: 'normativo' }
    const local: Local = { id: 'local-bano', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto] }
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'Unidad funcional 1', locales: [local] }
    const proyecto = proyectoCon([uf])
    const catalogoArtefactos: readonly ArtefactoNormativo[] = [
      { id: 'receptaculoDucha', nombre: 'Receptáculo de ducha' } as ArtefactoNormativo,
    ]

    const resultado = describirReferenciaPendiente(proyecto, catalogoArtefactos, referenciaA('uf-1', 'local-bano', 'a1'))

    expect(resultado).toContain('Receptáculo de ducha')
    expect(resultado).not.toContain('receptaculoDucha')
  })

  it('fallback: artefactoId técnico del catálogo si no se encuentra en catalogoArtefactos (caso borde, sin inventar nombre)', () => {
    const artefacto: Artefacto = { id: 'a1', artefactoId: 'artefactoInexistente', cantidad: 1, origen: 'normativo' }
    const local: Local = { id: 'local-bano', tipo: 'bano', regimen: 'domiciliario', artefactos: [artefacto] }
    const uf: UnidadFuncional = { id: 'uf-1', nombre: 'Unidad funcional 1', locales: [local] }
    const proyecto = proyectoCon([uf])

    const resultado = describirReferenciaPendiente(proyecto, [], referenciaA('uf-1', 'local-bano', 'a1'))

    expect(resultado).toBe('Unidad funcional 1 → Baño → artefactoInexistente')
  })
})

describe('textosDePerdidaDistribuidaDeTramo', () => {
  it('L2-A: sinDemanda -- Qc="0,00", el resto en "—"', () => {
    const resultado: ResultadoPerdidaDistribuidaDeTramo = { tipo: 'sinDemanda', qc_lps: 0 }

    expect(textosDePerdidaDistribuidaDeTramo(resultado)).toEqual({
      qcTexto: '0,00',
      diReferenciaTexto: '—',
      diComercialTexto: '—',
      diEfectivoTexto: '—',
      vTexto: '—',
      limiteVelocidadTexto: '—',
      verificacionVelocidadTexto: '—',
      velocidadPorDebajoDelMinimo: false,
      hfTexto: '—',
    })
  })

  it('L2-B: sinCandidatoAdmisible -- Qc y Di de referencia disponibles, comercial/efectivo/V/hf en "—"', () => {
    const resultado: ResultadoPerdidaDistribuidaDeTramo = {
      tipo: 'sinCandidatoAdmisible',
      qc_lps: 0.15,
      n: 1,
      diReferenciaPredimensionamiento_mm: 9.772,
    }

    expect(textosDePerdidaDistribuidaDeTramo(resultado)).toEqual({
      qcTexto: '0,15',
      diReferenciaTexto: '9,77',
      diComercialTexto: '—',
      diEfectivoTexto: '—',
      vTexto: '—',
      limiteVelocidadTexto: '—',
      verificacionVelocidadTexto: '—',
      velocidadPorDebajoDelMinimo: false,
      hfTexto: '—',
    })
  })

  it('L2-C: sinLongitud -- diámetro/velocidad disponibles, hf="—"', () => {
    const resultado: ResultadoPerdidaDistribuidaDeTramo = {
      tipo: 'sinLongitud',
      qc_lps: 0.2,
      n: 1,
      diReferenciaPredimensionamiento_mm: 11.28,
      candidato: { denominacionComercial: '20 mm', diametroInteriorEfectivo_mm: 14.4 },
      velocidadReal_mps: 1.228,
      verificacionVelocidad: { tipo: 'admisible', limiteMinimo_mps: 1, limiteMaximo_mps: 3 },
      velocidadPorDebajoDelMinimo: false,
    }

    expect(textosDePerdidaDistribuidaDeTramo(resultado)).toEqual({
      qcTexto: '0,20',
      diReferenciaTexto: '11,28',
      diComercialTexto: '20 mm',
      diEfectivoTexto: '14,40',
      vTexto: '1,2',
      limiteVelocidadTexto: '1,0 – 3,0',
      verificacionVelocidadTexto: 'Admisible',
      velocidadPorDebajoDelMinimo: false,
      hfTexto: '—',
    })
  })

  it('L2-D: conPerdidaDistribuida -- Di comercial, Di efectivo, V, hf todos presentes', () => {
    const resultado: ResultadoPerdidaDistribuidaDeTramo = {
      tipo: 'conPerdidaDistribuida',
      qc_lps: 0.2,
      n: 1,
      diReferenciaPredimensionamiento_mm: 11.28,
      candidato: { denominacionComercial: '20 mm', diametroInteriorEfectivo_mm: 14.4 },
      velocidadReal_mps: 1.228,
      verificacionVelocidad: { tipo: 'admisible', limiteMinimo_mps: 1, limiteMaximo_mps: 3 },
      velocidadPorDebajoDelMinimo: false,
      longitud_m: 10,
      hf_m: 0.4567,
      detalle: { metodo: 'hazenWilliams', coeficienteC: 150, perdidaUnitaria_J_m_m: 0.04567 },
    }

    expect(textosDePerdidaDistribuidaDeTramo(resultado)).toEqual({
      qcTexto: '0,20',
      diReferenciaTexto: '11,28',
      diComercialTexto: '20 mm',
      diEfectivoTexto: '14,40',
      vTexto: '1,2',
      limiteVelocidadTexto: '1,0 – 3,0',
      verificacionVelocidadTexto: 'Admisible',
      velocidadPorDebajoDelMinimo: false,
      hfTexto: '0,457',
    })
  })

  it('L2-E (D-delta.27): conPerdidaDistribuida con velocidadPorDebajoDelMinimo=true -- se propaga tal cual, sin reinterpretar', () => {
    const resultado: ResultadoPerdidaDistribuidaDeTramo = {
      tipo: 'conPerdidaDistribuida',
      qc_lps: 0.08,
      n: 1,
      diReferenciaPredimensionamiento_mm: 7.14,
      candidato: { denominacionComercial: '20 mm', diametroInteriorEfectivo_mm: 14.4 },
      velocidadReal_mps: 0.4912189601601709,
      verificacionVelocidad: { tipo: 'noAdmisible', limiteMinimo_mps: 1, limiteMaximo_mps: 3 },
      velocidadPorDebajoDelMinimo: true,
      longitud_m: 3,
      hf_m: 0.123,
      detalle: { metodo: 'hazenWilliams', coeficienteC: 150, perdidaUnitaria_J_m_m: 0.041 },
    }

    expect(textosDePerdidaDistribuidaDeTramo(resultado)).toEqual({
      qcTexto: '0,08',
      diReferenciaTexto: '7,14',
      diComercialTexto: '20 mm',
      diEfectivoTexto: '14,40',
      vTexto: '0,5',
      limiteVelocidadTexto: '1,0 – 3,0',
      verificacionVelocidadTexto: 'Aceptada en el menor diámetro comercial (CRIT-A24)',
      velocidadPorDebajoDelMinimo: true,
      hfTexto: '0,123',
    })
    // La verificación real del motor sigue siendo 'noAdmisible' (evidencia
    // auditable conservada) -- pero el texto de UX nunca usa esa palabra
    // ni lenguaje de advertencia mientras velocidadPorDebajoDelMinimo sea
    // true (D-delta.27): no hay ninguna acción de dimensionamiento posible.
    expect(textosDePerdidaDistribuidaDeTramo(resultado).verificacionVelocidadTexto).not.toContain('No admisible')
  })
})

describe('resolverCambioDeLongitud', () => {
  it('campo vacío -> omitir (longitud no informada, nunca 0)', () => {
    expect(resolverCambioDeLongitud('')).toEqual({ tipo: 'omitir' })
  })

  it('0 -> establecer con longitud_m=0 (mecánicamente ingresable; CRIT-A20 sigue siendo la única defensa de dominio)', () => {
    expect(resolverCambioDeLongitud('0')).toEqual({ tipo: 'establecer', longitud_m: 0 })
  })

  it('valor positivo -> establecer', () => {
    expect(resolverCambioDeLongitud('3.5')).toEqual({ tipo: 'establecer', longitud_m: 3.5 })
  })

  it('valor negativo tipeado directamente -> ignorar, nunca establecer con longitud_m<0', () => {
    expect(resolverCambioDeLongitud('-1')).toEqual({ tipo: 'ignorar' })
    expect(resolverCambioDeLongitud('-0.1')).toEqual({ tipo: 'ignorar' })
  })

  it('bajar con la flecha desde 0 dispara onChange con texto "-1" (comportamiento nativo del input numérico) -> ignorar, nunca -1', () => {
    // Mismo caso que el anterior, documentado explícitamente porque es el
    // escenario real que reprodujo el bug: la flecha descendente del
    // <input type="number"> en 0 produce el string "-1" en el evento.
    expect(resolverCambioDeLongitud('-1')).toEqual({ tipo: 'ignorar' })
  })

  it('texto no numérico -> ignorar (NaN, mismo criterio que antes de este incremento)', () => {
    expect(resolverCambioDeLongitud('abc')).toEqual({ tipo: 'ignorar' })
  })
})

// Fixture de un Tramo real (catálogo y sistema comercial productivos, no
// ficticios) que activa el fallback de D-delta.27/CRIT-A24: valvulaMingitorio
// es el único artefacto conectado (soloAF, CRIT-A4 -> n=1 -> Qc=quTotal_lps
// del catálogo real), y el menor Di comercial evaluable del sistema real
// (Acqua System Magnum PN20, 20mm/14,4mm efectivo) ya da V<Vmin -- mismo
// caso, mismos valores, que 'D-delta.27: valvulaMingitorio...' en
// resolverDiametroComercialDeTramo.test.ts (no se reinventa el fixture).
function proyectoConFallbackDeVelocidadPorVmin(): { proyecto: Proyecto; tramoId: string } {
  const metadatos: MetadatosProyecto = {
    nombre: 'Proyecto de prueba',
    obra: 'Obra de prueba',
    comitente: 'Comitente de prueba',
    fecha: '2026-01-01',
    schemaVersion: '1.0.0',
    versionNormativa: 'eras-2023',
  }
  const parametros: ParametrosProyecto = {
    tipoDeProyecto: 'oficinaPrivada' as TipoDeProyecto,
    presionSobreAcera_m: 0,
    alturaArtefactoMasDesfavorable_m: 0,
  }
  const mingitorio: Artefacto = { id: 'inst-mingitorio', artefactoId: 'valvulaMingitorio', cantidad: 1, origen: 'normativo' }
  const uf: UnidadFuncional = {
    id: 'uf-1',
    nombre: 'UF 1',
    locales: [{ id: 'local-1', tipo: 'otros', regimen: 'noDomiciliario', artefactos: [mingitorio] }],
  }
  const referencia: ReferenciaDeArtefacto = { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-1', artefactoId: 'inst-mingitorio' }
  const nodos: Nodo[] = [
    { id: 'n0' },
    { id: 'n1' },
    { id: 'n2', referencia },
    { id: 'n3', referencia: { tipo: 'produccionACS' } },
    { id: 'n4', referencia },
  ]
  const tramos: Tramo[] = [
    { id: 't1', nodoOrigenId: 'n0', nodoDestinoId: 'n1', red: 'AF' },
    { id: 't2', nodoOrigenId: 'n1', nodoDestinoId: 'n2', red: 'AF' },
    { id: 't3', nodoOrigenId: 'n1', nodoDestinoId: 'n3', red: 'AF' },
    { id: 't4', nodoOrigenId: 'n3', nodoDestinoId: 'n4', red: 'AC' },
  ]
  const proyecto: Proyecto = {
    metadatos,
    parametros,
    unidadesFuncionales: [uf],
    redHidraulica: { nodos, tramos },
    configuracionHidraulica: { metodoPerdidaDistribuida: 'hazenWilliams', metodoPerdidaLocalizada: 'detallado', materialTuberiaId: 'ppr', sistemaDeTuberiaId: 'acquaSystemMagnumPn20' },
  }
  return { proyecto, tramoId: 't1' }
}

describe('FilaResultado (UI): advertencia de velocidadPorDebajoDelMinimo', () => {
  it('D-delta.27/CRIT-A24: muestra diámetro, Di efectivo y velocidad, pero NO renderiza "Velocidad inferior al rango recomendado"', () => {
    const { proyecto, tramoId } = proyectoConFallbackDeVelocidadPorVmin()

    const html = renderToStaticMarkup(
      createElement(
        'table',
        null,
        createElement(
          'tbody',
          null,
          createElement(FilaResultado, {
            proyecto,
            catalogoArtefactos,
            fila: { etiqueta: 'Local de prueba', red: 'AF', tramoId },
            onCambiar: () => {},
          }),
        ),
      ),
    )

    // Confirma la premisa (mismo caso que el test de motor): el candidato
    // elegido es el fallback de Vmin (velocidadReal_mps≈0,921), no un
    // resultado admisible cualquiera.
    expect(html).toContain('20 mm') // diámetro comercial
    expect(html).toContain('14,40') // Di efectivo (mm)
    expect(html).toContain('0,9') // velocidad real, formateada a 1 decimal
    expect(html).not.toContain('Velocidad inferior al rango recomendado')
    expect(html).not.toContain('No admisible')
    // Sí se muestra Vmin/Vmax y una aceptación explícita no alarmante.
    expect(html).toContain('1,0 – 3,0')
    expect(html).toContain('Aceptada en el menor diámetro comercial (CRIT-A24)')
  })

  it('el input de Longitud [m] se renderiza con min={0} (ayuda de UI; la defensa real es resolverCambioDeLongitud)', () => {
    const { proyecto, tramoId } = proyectoConFallbackDeVelocidadPorVmin()

    const html = renderToStaticMarkup(
      createElement(
        'table',
        null,
        createElement(
          'tbody',
          null,
          createElement(FilaResultado, {
            proyecto,
            catalogoArtefactos,
            fila: { etiqueta: 'Local de prueba', red: 'AF', tramoId },
            onCambiar: () => {},
          }),
        ),
      ),
    )

    expect(html).toContain('<input')
    expect(html).toMatch(/<input[^>]*\bmin="0"/)
  })
})

describe('TablaDeFilas (UI): nomenclatura visible de columnas de diámetro', () => {
  it('encabezados usan Di teórico / DN / Di real -- no la nomenclatura anterior (Di de referencia / Di comercial / Di efectivo)', () => {
    const { proyecto, tramoId } = proyectoConFallbackDeVelocidadPorVmin()

    const html = renderToStaticMarkup(
      createElement(TablaDeFilas, {
        proyecto,
        catalogoArtefactos,
        encabezadoPrimeraColumna: 'Cañería',
        filas: [{ etiqueta: 'Local de prueba', red: 'AF', tramoId }],
        onCambiar: () => {},
      }),
    )

    expect(html).toContain('Di teórico [mm]')
    expect(html).toContain('DN [mm]')
    expect(html).toContain('Di real [mm]')
    expect(html).not.toContain('Di de referencia')
    expect(html).not.toContain('Di comercial')
    expect(html).not.toContain('Di efectivo')
  })

  it('encabezados incluyen V admisible [m/s] y Verificación (CRIT-A19/A24 visibles en UI)', () => {
    const { proyecto, tramoId } = proyectoConFallbackDeVelocidadPorVmin()

    const html = renderToStaticMarkup(
      createElement(TablaDeFilas, {
        proyecto,
        catalogoArtefactos,
        encabezadoPrimeraColumna: 'Cañería',
        filas: [{ etiqueta: 'Local de prueba', red: 'AF', tramoId }],
        onCambiar: () => {},
      }),
    )

    expect(html).toContain('V admisible [m/s]')
    expect(html).toContain('Verificación')
  })
})
