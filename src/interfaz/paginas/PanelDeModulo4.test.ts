// Tests de integración UI↔dominio del Panel de Módulo 4. Mismo patrón
// renderToStaticMarkup que el resto de este directorio (no hay jsdom /
// testing-library en el repo): se verifica el render inicial para cada
// estado, no interacción real de onChange. El smoke end-to-end en
// navegador (Playwright, vite dev) se hizo aparte -- ver D-δ.67.
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, it, expect } from 'vitest'
import type {
  Artefacto,
  ConfiguracionDeAbastecimiento,
  ParametrosProyecto,
  Proyecto,
} from '../../modelo/proyecto'
import { PanelDeModulo4 } from './PanelDeModulo4'

// Conjunto de Tabla N°2 (Golden G2): Qc exacto ≈ 0,707 l/s -> con un DN19
// de conexión hay déficit real y positivo.
const ARTEFACTOS_G2: readonly Artefacto[] = [
  { id: 'a-1', artefactoId: 'lavatorio', cantidad: 2, origen: 'normativo' },
  { id: 'a-2', artefactoId: 'banera', cantidad: 1, origen: 'normativo' },
  { id: 'a-3', artefactoId: 'inodoroDeposito', cantidad: 2, origen: 'normativo' },
  { id: 'a-4', artefactoId: 'bidet', cantidad: 1, origen: 'normativo' },
  { id: 'a-5', artefactoId: 'piletaDeCocina', cantidad: 1, origen: 'normativo' },
  { id: 'a-6', artefactoId: 'piletaDeLavar', cantidad: 1, origen: 'normativo' },
  { id: 'a-7', artefactoId: 'receptaculoDucha', cantidad: 1, origen: 'normativo' },
]

function construir(opciones: {
  configuracionAbastecimiento?: ConfiguracionDeAbastecimiento
  parametros?: Partial<ParametrosProyecto>
  rapido?: boolean
}): Proyecto {
  const { configuracionAbastecimiento, parametros = {}, rapido = false } = opciones
  return {
    metadatos: {
      nombre: 'Proyecto de prueba',
      obra: 'Obra',
      comitente: 'Comitente',
      fecha: '2026-01-01',
      schemaVersion: '1.0.0',
      versionNormativa: 'eras-2023',
    },
    parametros: {
      tipoDeProyecto: 'viviendaIndividual',
      presionSobreAcera_m: 5,
      alturaArtefactoMasDesfavorable_m: 3,
      ...parametros,
    },
    unidadesFuncionales: [
      {
        id: 'uf-1',
        nombre: 'UF 1',
        locales: [{ id: 'local-1', tipo: 'bano', regimen: 'domiciliario', artefactos: ARTEFACTOS_G2 }],
      },
    ],
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: rapido ? 'estimado' : 'detallado',
      granularidadHidraulica: rapido ? 'simplificada' : 'profesional',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
    ...(configuracionAbastecimiento !== undefined ? { configuracionAbastecimiento } : {}),
  }
}

function render(proyecto: Proyecto): string {
  return renderToStaticMarkup(
    createElement(PanelDeModulo4, { proyecto, onCambiar: () => {} }),
  )
}

const CONEXION_G3 = { diametroNominalConexion_m: 0.019, desnivelConexion_m: 0, presionSobreAcera_m: 5 }

describe('PanelDeModulo4 (UI)', () => {
  it('siempre muestra el encabezado del módulo', () => {
    const html = render(construir({}))
    expect(html).toContain('Módulo 4 — Abastecimiento y reserva')
  })

  it('S1: sin configuración -> invita a elegir esquema, con las tres opciones', () => {
    const html = render(construir({}))
    expect(html).toContain('Elegí cómo se abastece el proyecto')
    expect(html).toContain('Alimentación directa')
    expect(html).toContain('Tanque elevado')
    expect(html).toContain('Cisterna + bombeo + tanque elevado')
    // No debe mostrar todavía inputs de reserva
    expect(html).not.toContain('Período de consumo máximo')
  })

  it('S6: directa -> "no aplica", sin V=0 y sin campos de tanque', () => {
    const html = render(construir({ configuracionAbastecimiento: { esquema: 'directa' } }))
    expect(html).toContain('no aplica a este esquema')
    expect(html).toContain('§2.8')
    expect(html).not.toContain('Reserva calculada por déficit: 0')
    expect(html).not.toContain('no necesita tanque')
    expect(html).not.toContain('Cumple')
    // El selector de esquema sí está; los inputs de Tc/DN/desnivel no.
    expect(html).toContain('Esquema de abastecimiento')
    expect(html).not.toContain('Período de consumo máximo')
    expect(html).not.toContain('DN de conexión')
  })

  it('tanque sin Tc/DN/desnivel -> Incompleto, con los tres motivos humanizados y sin enums crudos', () => {
    const html = render(
      construir({ configuracionAbastecimiento: { esquema: 'tanqueElevado' } }),
    )
    expect(html).toContain('<strong>Incompleto</strong>')
    expect(html).toContain('Ingresá el período de consumo máximo')
    expect(html).toContain('Seleccioná el DN de conexión')
    expect(html).toContain('Ingresá el desnivel')
    expect(html).not.toContain('faltaPeriodoConsumoMaximo')
    expect(html).not.toContain('faltaDiametroConexion')
    // Los inputs de configuración están presentes
    expect(html).toContain('Presión sobre acera')
  })

  it('S4: presión de cálculo fuera de la Tabla N°1 -> Incompleto con mensaje específico, sin "proyecto inválido"', () => {
    const html = render(
      construir({
        configuracionAbastecimiento: { esquema: 'tanqueElevado', periodoConsumoMaximo_h: 2 },
        parametros: { presionSobreAcera_m: 2, diametroNominalConexion_m: 0.019, desnivelConexion_m: 0 },
      }),
    )
    expect(html).toContain('<strong>Incompleto</strong>')
    expect(html).toContain('fuera del rango de la')
    expect(html).toContain('4–35 m')
    expect(html).toContain('2,00 m') // la presión de cálculo
    expect(html).not.toContain('inválido')
  })

  it('S2: tanque elevado + G3 completo -> Evaluado, con Qconexión 0,60 y reserva ≈ 0,771 m³', () => {
    const html = render(
      construir({
        configuracionAbastecimiento: { esquema: 'tanqueElevado', periodoConsumoMaximo_h: 2 },
        parametros: CONEXION_G3,
      }),
    )
    expect(html).toContain('<strong>Evaluado</strong>')
    expect(html).toContain('0,60 L/s')
    expect(html).toContain('0,771 m³')
    expect(html).toContain('771 L')
    // sin capacidad adoptada: cálculo completo, adopción pendiente
    expect(html).toContain('adopción pendiente')
    expect(html).toContain('Falta adoptar el volumen del tanque elevado')
  })

  it('adopción de tanque elevado suficiente -> ✓ Suficiente + diferencia positiva', () => {
    const html = render(
      construir({
        configuracionAbastecimiento: {
          esquema: 'tanqueElevado',
          periodoConsumoMaximo_h: 2,
          volumenTanqueElevadoAdoptado_m3: 1,
        },
        parametros: CONEXION_G3,
      }),
    )
    expect(html).toContain('<strong>Evaluado</strong>')
    expect(html).toContain('✓ Suficiente')
    expect(html).toContain('+0,229 m³') // 1 − 0,771 ≈ 0,229 (3 decimales -> 0,229)
    expect(html).not.toContain('Cumple norma')
  })

  it('adopción de tanque elevado insuficiente -> ⚠ Insuficiente, pero el estado del cálculo sigue Evaluado', () => {
    const html = render(
      construir({
        configuracionAbastecimiento: {
          esquema: 'tanqueElevado',
          periodoConsumoMaximo_h: 2,
          volumenTanqueElevadoAdoptado_m3: 0.5,
        },
        parametros: CONEXION_G3,
      }),
    )
    expect(html).toContain('Estado del cálculo: <strong>Evaluado</strong>')
    expect(html).toContain('⚠ Insuficiente')
  })

  it('S5: cisterna + bombeo + elevado con reparto insuficiente -> tres criterios visibles + §2.11.3', () => {
    const html = render(
      construir({
        configuracionAbastecimiento: {
          esquema: 'cisternaBombeoElevado',
          periodoConsumoMaximo_h: 2,
          volumenTanqueBombeoAdoptado_m3: 0.01,
          volumenTanqueElevadoAdoptado_m3: 5,
        },
        parametros: CONEXION_G3,
      }),
    )
    expect(html).toContain('Mínimo por tanque (1/3)')
    expect(html).toContain('Tanque de bombeo / cisterna')
    expect(html).toContain('Tanque elevado / reserva')
    expect(html).toContain('Total adoptado')
    expect(html).toContain('§2.11.3')
    expect(html).toContain('no alcanza el mínimo') // el inferior
    expect(html).toContain('⚠ Insuficiente')
    // input del tanque de bombeo presente
    expect(html).toContain('Tanque de bombeo / cisterna [m³]')
  })

  it('cisterna con capacidades ausentes -> adopción incompleta, estado Evaluado', () => {
    const html = render(
      construir({
        configuracionAbastecimiento: { esquema: 'cisternaBombeoElevado', periodoConsumoMaximo_h: 2 },
        parametros: CONEXION_G3,
      }),
    )
    expect(html).toContain('Estado del cálculo: <strong>Evaluado</strong>')
    expect(html).toContain('Falta adoptar el volumen del tanque de bombeo')
    expect(html).toContain('Falta adoptar el volumen del tanque elevado')
  })

  it('DN de conexión inválido persistido (DN13) -> Error, mensaje humano, sin throw', () => {
    const html = render(
      construir({
        configuracionAbastecimiento: { esquema: 'tanqueElevado', periodoConsumoMaximo_h: 2 },
        parametros: { diametroNominalConexion_m: 0.013, desnivelConexion_m: 0 },
      }),
    )
    expect(html).toContain('<strong>Error</strong>')
    expect(html).toContain('Configuración con errores')
    expect(html).toContain('Tabla N°1')
  })

  it('Qconexión >= Qc -> "Reserva calculada por déficit: 0 m³", NO "no hace falta tanque"', () => {
    const html = render(
      construir({
        configuracionAbastecimiento: { esquema: 'tanqueElevado', periodoConsumoMaximo_h: 2 },
        parametros: { presionSobreAcera_m: 35, diametroNominalConexion_m: 0.075, desnivelConexion_m: 0 },
      }),
    )
    expect(html).toContain('Reserva calculada por déficit: 0 m³')
    expect(html).toContain('no determina por sí solo la obligatoriedad')
    expect(html).not.toContain('No hace falta tanque')
  })

  it('el selector de DN sólo ofrece diámetros admisibles como conexión (sin DN13)', () => {
    const html = render(
      construir({ configuracionAbastecimiento: { esquema: 'tanqueElevado', periodoConsumoMaximo_h: 2 } }),
    )
    expect(html).toContain('>19 mm<')
    expect(html).toContain('>75 mm<')
    expect(html).not.toContain('>13 mm<')
  })

  it('modo Rápido: oculta la traza de conexión detallada; modo Profesional la muestra', () => {
    const config: ConfiguracionDeAbastecimiento = { esquema: 'tanqueElevado', periodoConsumoMaximo_h: 2 }
    const htmlRapido = render(construir({ configuracionAbastecimiento: config, parametros: CONEXION_G3, rapido: true }))
    const htmlProfesional = render(construir({ configuracionAbastecimiento: config, parametros: CONEXION_G3 }))

    expect(htmlRapido).toContain('Caudal de conexión:')
    expect(htmlRapido).not.toContain('Presión de cálculo')
    expect(htmlProfesional).toContain('Presión de cálculo')
    expect(htmlProfesional).toContain('Déficit de caudal')
  })
})
