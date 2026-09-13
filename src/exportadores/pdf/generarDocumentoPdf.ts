// Renderizador de PDF (ADR-012, exportadores/pdf). Recibe un DatosDeInforme
// (snapshot DERIVADO y puro, ver resolverDatosDeInforme.ts) y produce el
// documento -- nunca recalcula (C-05). REPORT-01A: el informe deja de estar
// centrado únicamente en M1 (Demanda) y agrega Tuberías (M2) y Verificación
// hidráulica; M3 (medidores) y M4 (alimentación/reserva) completos quedan
// para REPORT-01B (ver ROADMAP.md).
import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces'
import type { Local, Proyecto, RegimenLocal, TipoDeLocal } from '../../modelo/proyecto'
import type { Paso, ResultadoDeCalculo, Verificacion } from '../../modelo/resultado'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import {
  formulaSimbolica,
  sustitucionNumerica,
  textoValorCalculado,
} from '../../presentacion/desarrolloDelCalculoDemanda'
import { formatearNumero } from './formatearNumero'
import {
  resolverDatosDeInforme,
  type CasoPerdidaLocalizadaEstimada,
  type CasoVelocidadYPerdidaDistribuida,
  type DatosDeInforme,
  type DesarrolloTerminalCritico,
  type FilaDeTuberiaDeInforme,
  type FilaDeVerificacionDeInforme,
  type UnidadFuncionalDeInforme,
} from './resolverDatosDeInforme'

pdfMake.addVirtualFileSystem(pdfFonts)

// Copiados literalmente de MotorDemandaPantalla.tsx (A2): son mapas de
// presentación chicos, no infraestructura. Quedaron fuera del Incremento B
// a propósito -- B compartió fórmula/sustitución/resultado, no estas
// etiquetas; se revisan en un incremento aparte si hace falta.
const ETIQUETA_TIPO_DE_LOCAL: Readonly<Record<TipoDeLocal, string>> = {
  bano: 'Baño',
  toilette: 'Toilette',
  cocina: 'Cocina',
  lavadero: 'Lavadero',
  cochera: 'Cochera',
  jardin: 'Jardín',
  otros: 'Otros',
}

const ETIQUETA_REGIMEN: Readonly<Record<RegimenLocal, string>> = {
  domiciliario: 'Domiciliario',
  noDomiciliario: 'No domiciliario',
}

function etiquetaRegimen(regimen: RegimenLocal | undefined): string {
  return regimen ? ETIQUETA_REGIMEN[regimen] : 'Sin definir'
}

// Las tablas densas (M2 REPORT-01B §18/§19) llevan la unidad SÓLO en el
// header -- los textos de resolverDatosDeInforme.ts vienen con la unidad
// ya concatenada (útil para el desarrollo de cálculo en prosa), así que acá
// se recorta el sufijo conocido para la celda de una tabla compacta. Es
// manipulación de string sobre un valor ya formateado, nunca un recálculo.
function soloValor(texto: string): string {
  return texto.replace(/ m\.c\.a\.$/, '').replace(/ m\/s$/, '').replace(/ m$/, '')
}

export interface EntradaGeneracionPdf {
  readonly proyecto: Proyecto
}

function renderizarDatosDelProyecto(proyecto: Proyecto): Content {
  const coeficiente = coeficientesMayoracion.find((c) => c.id === proyecto.parametros.tipoDeProyecto)
  const textoCoeficiente = coeficiente
    ? `${coeficiente.a} — ${coeficiente.nombre}`
    : proyecto.parametros.tipoDeProyecto

  return {
    stack: [
      { text: 'Datos del proyecto', style: 'seccion' },
      { text: `Coeficiente de mayoración (a): ${textoCoeficiente}` },
    ],
    margin: [0, 0, 0, 4],
  }
}

// ---------------------------------------------------------------------
// M1 -- Demanda (multinivel-aware, GEOM-UX-01)
// ---------------------------------------------------------------------

// extraerN replica exactamente la misma lógica que ya usa la interfaz
// (MotorDemandaPantalla.tsx): n no vive en resultado.resultados, solo en
// la traza del paso 'kc'. Quedó fuera del Incremento B a propósito -- B
// compartió fórmula, sustitución y texto de resultado; esta duplicación
// puntual se revisa en otro momento, si hace falta.
function extraerN(pasos: readonly Paso[]): number | null {
  const pasoKc = pasos.find((paso) => paso.id === 'kc')
  const entradaN = pasoKc?.entradas.find((entrada) => entrada.simbolo === 'n')
  return entradaN?.valor ?? null
}

function renderizarResumenResultados(resultado: ResultadoDeCalculo): Content[] {
  const n = extraerN(resultado.pasos)
  const { qmax, kc, k, qc } = resultado.resultados
  if (!qmax || !kc || !k || !qc) {
    // Mismo defecto de programación que ya reconoce MotorDemandaPantalla.tsx
    // en su propio guard: el motor siempre devuelve estas cuatro claves.
    throw new Error('El motor no devolvió los resultados esperados (qmax/kc/k/qc)')
  }

  return [
    { text: 'Resultados', style: 'seccion' },
    { text: 'Caudal de cálculo (Qc)', style: 'subseccion' },
    { text: textoValorCalculado(qc), style: 'qcDestacado' },
    {
      table: {
        widths: ['auto', '*'],
        body: [
          ['n', n !== null ? formatearNumero(n, 'conteo') : '—'],
          ['Qmax', textoValorCalculado(qmax)],
        ],
      },
      margin: [0, 4, 0, 4],
    },
    {
      table: {
        widths: ['auto', '*'],
        body: [
          ['Kc', textoValorCalculado(kc)],
          ['K', textoValorCalculado(k)],
        ],
      },
      margin: [0, 0, 0, 8],
    },
  ]
}

function renderizarLocal(local: Local): Content {
  const filasArtefactos = local.artefactos.map((artefacto) => {
    const catalogoItem = catalogoArtefactos.find((c) => c.id === artefacto.artefactoId)
    if (!catalogoItem) {
      // Estructuralmente inalcanzable en el flujo real: validarReferenciasDeCatalogo
      // ya lo marca error, y sin un Proyecto válido no existe ResultadoDeCalculo
      // para llegar hasta acá. Si ocurre, es un defecto de programación (el
      // exportador recibió un proyecto que nunca debió llegar sin validar).
      throw new Error(
        `El artefacto "${artefacto.artefactoId}" no existe en el catálogo normativo vigente (proyecto no validado antes de exportar)`,
      )
    }
    return [catalogoItem.nombre, String(artefacto.cantidad), `${formatearNumero(catalogoItem.quTotal_lps, 'l/s')} l/s`]
  })

  return {
    stack: [
      {
        text: `Local: ${ETIQUETA_TIPO_DE_LOCAL[local.tipo]} — Régimen: ${etiquetaRegimen(local.regimen)}`,
      },
      {
        table: {
          headerRows: 1,
          widths: ['*', 'auto', 'auto'],
          body: [['Artefacto', 'Cantidad', 'qu'], ...filasArtefactos],
        },
        margin: [0, 2, 0, 6],
      },
    ],
    margin: [0, 0, 0, 4],
  }
}

function renderizarUnidadFuncionalM1(uf: UnidadFuncionalDeInforme): Content {
  const cuerpo: Content[] = uf.mostrarNiveles
    ? uf.niveles.flatMap((nivel): Content[] => [
        { text: `Nivel: ${nivel.nombre}`, style: 'subseccionNivel' },
        ...nivel.locales.map(renderizarLocal),
      ])
    : uf.niveles.flatMap((nivel) => nivel.locales.map(renderizarLocal))

  return {
    stack: [{ text: `Unidad funcional: ${uf.nombre}`, style: 'subseccion' }, ...cuerpo],
    margin: [0, 0, 0, 8],
  }
}

function renderizarUnidadesFuncionalesM1(unidadesFuncionales: readonly UnidadFuncionalDeInforme[]): Content[] {
  return [{ text: 'Unidades funcionales', style: 'seccion' }, ...unidadesFuncionales.map(renderizarUnidadFuncionalM1)]
}

function renderizarPaso(paso: Paso): Content {
  const filasEntradas = paso.entradas.map((e) => [
    e.simbolo,
    formatearNumero(e.valor, e.unidad),
    e.unidad,
    e.procedencia,
  ])
  const sustitucion = sustitucionNumerica(paso)
  const textoSalida = `${paso.salida.simbolo} = ${textoValorCalculado(paso.salida.resultado)}`

  return {
    stack: [
      { text: paso.titulo, style: 'tituloPaso' },
      { text: `Fórmula: ${formulaSimbolica(paso)}`, style: 'formula' },
      ...(paso.criterioId ? [{ text: `Criterio: ${paso.criterioId}` } as Content] : []),
      ...(sustitucion ? [{ text: `Sustitución: ${sustitucion}` } as Content] : []),
      { text: textoSalida, style: 'resultadoPaso' },
      {
        table: {
          headerRows: 1,
          widths: ['auto', 'auto', 'auto', '*'],
          body: [['Símbolo', 'Valor', 'Unidad', 'Procedencia'], ...filasEntradas],
        },
        margin: [0, 4, 0, 4],
      },
      { text: `Ref.: ${paso.referencias.join(', ')}`, style: 'referencia' },
      ...(paso.nota ? [{ text: `Nota: ${paso.nota}` } as Content] : []),
    ],
    margin: [0, 0, 0, 12],
  }
}

function renderizarVerificacionM1(v: Verificacion): Content {
  const noConforme = v.estado === 'no_conforme'
  const texto =
    `${v.concepto}: ${formatearNumero(v.valorObtenido.valor, v.valorObtenido.unidad)} ${v.valorObtenido.unidad}` +
    ` (límite ${formatearNumero(v.valorLimite.valor, v.valorLimite.unidad)} ${v.valorLimite.unidad}) - ` +
    `${noConforme ? 'NO CONFORME' : 'CONFORME'} - Ref. ${v.referenciaNormativa}`
  return { text: texto, style: noConforme ? 'noConforme' : 'conforme', margin: [0, 2, 0, 2] }
}

// ---------------------------------------------------------------------
// M2 -- Tuberías / Montantes
// ---------------------------------------------------------------------

const ANCHOS_TABLA_TUBERIA = ['*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto']
const ENCABEZADO_TABLA_TUBERIA = ['Tramo / Local', 'Red', 'Long. [m]', 'DN / Di', 'V [m/s]', 'Pérdida [m.c.a.]', 'Estado']

// Badge compacto PROPIO del PDF (REPORT-01B §19): la etiqueta larga
// "○ DN mínimo comercial" que ya usa la UI interactiva (ETIQUETA_ESTADO en
// resolverFilaDeDimensionamiento.ts) se parte letra por letra en la columna
// angosta de una tabla impresa. Se arma acá, a partir del mismo `estado`
// crudo ('ok'|'controlar'|'incompleto') que ya expone el dominio -- no
// reinterpreta el estado, sólo cambia cuántas palabras usa para mostrarlo.
const ETIQUETA_ESTADO_PDF: Readonly<Record<FilaDeTuberiaDeInforme['estado'], string>> = {
  ok: '✓',
  controlar: 'DN mín.',
  incompleto: '⚠ Incompl.',
}

function filaDeTablaTuberia(fila: FilaDeTuberiaDeInforme): (string | Content)[] {
  return [
    fila.etiqueta,
    fila.red === 'AF' ? 'AF' : 'AC',
    soloValor(fila.longitudTexto),
    fila.dnTexto,
    soloValor(fila.vTexto),
    soloValor(fila.perdidaTotalTexto),
    ETIQUETA_ESTADO_PDF[fila.estado],
  ]
}

function tablaDeTuberia(filas: readonly FilaDeTuberiaDeInforme[]): Content {
  return {
    table: {
      headerRows: 1,
      widths: ANCHOS_TABLA_TUBERIA,
      body: [ENCABEZADO_TABLA_TUBERIA, ...filas.map(filaDeTablaTuberia)],
    },
    fontSize: 8,
    margin: [0, 2, 0, 8],
  }
}

const FORMULA_VELOCIDAD = ['A = π · Di² / 4', 'V = Q / A']
const FORMULA_PERDIDA_DISTRIBUIDA: Readonly<Record<'hazenWilliams' | 'darcyWeisbach', readonly string[]>> = {
  hazenWilliams: ['J = 10,67 · Q³ / (C¹∙⁸⁵² · Di⁴∙⁸⁷)  [Q en m³/s, Di en m -- CRIT-A17]', 'hf = J · L'],
  darcyWeisbach: ['hf = f · (L / Di) · (V² / (2·g))  [g = 9,81 m/s² -- CRIT-A18]'],
}

// Sustitución numérica del caso representativo de velocidad + pérdida
// distribuida (brief REPORT-01B §8/§9): interpola los datos CRUDOS que
// resolverPerdidaDistribuidaDeTramo ya resolvió -- ninguna aritmética nueva.
function renderizarCasoVelocidadYPerdidaDistribuida(caso: CasoVelocidadYPerdidaDistribuida): Content[] {
  const q_m3s = caso.qc_lps / 1000
  const di_m = caso.diametroInteriorEfectivo_mm / 1000
  const a_m2 = (Math.PI * di_m ** 2) / 4
  const sustitucionV =
    `A = π·Di²/4 = π·(${formatearNumero(caso.diametroInteriorEfectivo_mm, 'mm')}mm)²/4 = ${a_m2.toExponential(4)} m²` +
    `  →  V = Q/A = ${formatearNumero(caso.qc_lps, 'l/s')} l/s / ${a_m2.toExponential(4)} m² = ${formatearNumero(caso.velocidad_mps, 'm/s')} m/s`

  const detalleTexto: string[] =
    caso.detalle.metodo === 'hazenWilliams'
      ? [
          `J = 10,67 · (${q_m3s.toExponential(3)})^1,852 / (${formatearNumero(caso.detalle.coeficienteC, 'adimensional')}^1,852 · ${di_m.toFixed(4)}^4,87) = ${caso.detalle.perdidaUnitaria_J_m_m.toExponential(4)} m/m`,
          `hf = J · L = ${caso.detalle.perdidaUnitaria_J_m_m.toExponential(4)} × ${formatearNumero(caso.longitud_m, 'm')} m = ${formatearNumero(caso.hfDistribuida_m, 'm')} m.c.a.`,
        ]
      : [
          `Re = ${caso.detalle.reynolds.toFixed(0)} (ν = ${caso.detalle.viscosidadCinematica_m2s.toExponential(3)} m²/s @ ${formatearNumero(caso.detalle.temperaturaReferencia_C, 'adimensional')}°C)`,
          `f = ${formatearNumero(caso.detalle.factorFriccion, 'adimensional')} (rugosidad = ${formatearNumero(caso.detalle.rugosidadAbsoluta_mm, 'mm')} mm)`,
          `hf = f · (L/Di) · (V²/2g) = ${formatearNumero(caso.detalle.factorFriccion, 'adimensional')} × (${formatearNumero(caso.longitud_m, 'm')}/${di_m.toFixed(4)}) × (${formatearNumero(caso.velocidad_mps, 'm/s')}²/19,62) = ${formatearNumero(caso.hfDistribuida_m, 'm')} m.c.a.`,
        ]

  return [
    { text: `Caso representativo: ${caso.etiqueta}`, style: 'subseccionNivel' },
    { text: `Q = ${formatearNumero(caso.qc_lps, 'l/s')} l/s · Di = ${formatearNumero(caso.diametroInteriorEfectivo_mm, 'mm')} mm · L = ${formatearNumero(caso.longitud_m, 'm')} m`, style: 'metadatos' },
    { text: sustitucionV, style: 'formula' },
    ...detalleTexto.map((t): Content => ({ text: t, style: 'formula' })),
  ]
}

function renderizarCasoPerdidaLocalizadaEstimada(caso: CasoPerdidaLocalizadaEstimada): Content[] {
  return [
    { text: `Caso representativo: ${caso.localEtiqueta} (${caso.red === 'AF' ? 'Agua fría' : 'Agua caliente'})`, style: 'subseccionNivel' },
    {
      text:
        `Terminales: ${formatearNumero(caso.nTerminalesLocal, 'conteo')} · Tees estimadas: ${formatearNumero(caso.nTeesEstimadas, 'conteo')} ` +
        `· Singularidad terminal: ${formatearNumero(caso.nSingularidadTerminal, 'conteo')} · Llave de paso: ${formatearNumero(caso.nLlaveDePaso, 'conteo')}`,
      style: 'metadatos',
    },
    {
      text:
        `K total = ${caso.nTeesEstimadas}×${formatearNumero(caso.ksTee, 'adimensional')} + ${caso.nSingularidadTerminal}×${formatearNumero(caso.ksSingularidadTerminal, 'adimensional')} + ${caso.nLlaveDePaso}×${formatearNumero(caso.ksLlaveDePaso, 'adimensional')} = ${formatearNumero(caso.kTotal, 'adimensional')}`,
      style: 'formula',
    },
    {
      text:
        `hf localizada = K · Vref² / (2·g) = ${formatearNumero(caso.kTotal, 'adimensional')} × ${formatearNumero(caso.velocidadReferencia_mps, 'm/s')}² / 19,62 = ${formatearNumero(caso.hf_m, 'm')} m.c.a.`,
      style: 'formula',
    },
  ]
}

function renderizarDesarrolloM2(desarrollo: DatosDeInforme['m2']['desarrollo']): Content[] {
  if (desarrollo === undefined) {
    return []
  }
  const contenido: Content[] = [{ text: 'Desarrollo de cálculo', style: 'subseccion' }]

  contenido.push({ text: 'Velocidad y pérdida distribuida', style: 'subseccionNivel' })
  contenido.push(...FORMULA_VELOCIDAD.map((f): Content => ({ text: f, style: 'formula' })))
  contenido.push(...FORMULA_PERDIDA_DISTRIBUIDA[desarrollo.metodoPerdidaDistribuida].map((f): Content => ({ text: f, style: 'formula' })))
  if (desarrollo.casoVelocidadYPerdidaDistribuida !== undefined) {
    contenido.push(...renderizarCasoVelocidadYPerdidaDistribuida(desarrollo.casoVelocidadYPerdidaDistribuida))
  } else {
    contenido.push({ text: 'Todavía no hay ningún Tramo con pérdida distribuida resoluble para mostrar un caso.', style: 'advertencia' })
  }

  contenido.push({ text: 'Pérdida localizada', style: 'subseccionNivel' })
  if (desarrollo.metodoPerdidaLocalizada === 'estimado') {
    contenido.push({
      text:
        'Criterio vigente por (Local, Red): tees estimadas = máx(0, n−1) con Ks=3,00; una singularidad terminal ' +
        'Ks=1,35; una llave de paso Ks=9,18 (Tabla N°7 ERAS-2023, D-δ.40/D-δ.45). Vref = velocidad del Tramo ' +
        'representativo de ese Local+Red.',
      style: 'metadatos',
    })
    if (desarrollo.casoPerdidaLocalizadaEstimada !== undefined) {
      contenido.push(...renderizarCasoPerdidaLocalizadaEstimada(desarrollo.casoPerdidaLocalizadaEstimada))
    } else {
      contenido.push({ text: 'Todavía no hay ningún Local+Red con pérdida localizada estimable para mostrar un caso.', style: 'advertencia' })
    }
  } else {
    contenido.push({
      text:
        'Modo Detalladas: la pérdida localizada se acumula por Tramo según los accesorios y tees configurados en la ' +
        'topología (Ks de Tabla N°7 ERAS-2023, Js = Ks·V²/2g por accesorio). El detalle por accesorio individual se ' +
        'edita en Módulo 2; este informe refleja el resultado acumulado por camino en la Verificación hidráulica.',
      style: 'metadatos',
    })
  }

  return contenido
}

function renderizarSeccionM2(m2: DatosDeInforme['m2']): Content[] {
  if (!m2.hayRedHidraulica) {
    return [
      { text: 'Tuberías', style: 'seccion' },
      { text: 'El proyecto todavía no tiene una red hidráulica modelada (Módulo 2).', style: 'advertencia' },
    ]
  }

  const contenido: Content[] = [
    { text: 'Tuberías', style: 'seccion' },
    {
      text: `Método de pérdida localizada: ${m2.metodoPerdidaLocalizada === 'estimado' ? 'Estimadas' : 'Detalladas'}`,
      style: 'metadatos',
    },
    {
      text:
        'La columna "Pérdida" es hf distribuida + hf localizada del Tramo/Local. No incluye la pérdida del medidor ' +
        '(hfMedidor), que sólo participa del balance de la Verificación hidráulica.',
      style: 'metadatos',
    },
  ]

  if (m2.distribucionGeneral.length > 0) {
    contenido.push({ text: 'Distribución general / secundaria', style: 'subseccion' })
    contenido.push(tablaDeTuberia(m2.distribucionGeneral))
  }
  if (m2.distribucionSecundaria.length > 0) {
    contenido.push(tablaDeTuberia(m2.distribucionSecundaria))
  }

  if (m2.locales.length > 0) {
    contenido.push({ text: 'Unidades funcionales — Locales', style: 'subseccion' })
    for (const grupo of m2.locales) {
      contenido.push({ text: grupo.nombre, style: 'subseccionNivel' })
      contenido.push(tablaDeTuberia(grupo.filas))
    }
  }

  if (m2.montantes.length > 0) {
    contenido.push({ text: 'Montantes', style: 'subseccion' })
    for (const montante of m2.montantes) {
      contenido.push({
        text: `${montante.nombre} (${montante.red === 'AF' ? 'Agua fría' : 'Agua caliente'})`,
        style: 'subseccionNivel',
      })
      contenido.push({
        text:
          montante.localesServidos.length > 0
            ? `Locales alimentados: ${montante.localesServidos.join(', ')}`
            : 'Sin locales alimentados todavía.',
        style: 'metadatos',
      })
      if (montante.segmentos.length > 0) {
        contenido.push(tablaDeTuberia(montante.segmentos))
      }
    }
  }

  contenido.push(...renderizarDesarrolloM2(m2.desarrollo))

  return contenido
}

// ---------------------------------------------------------------------
// Verificación hidráulica
// ---------------------------------------------------------------------

const ANCHOS_TABLA_VERIFICACION = ['*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto']
const ENCABEZADO_TABLA_VERIFICACION = [
  'Local / Artefacto',
  'Red',
  'Δz [m]',
  'hf dist. [m.c.a.]',
  'hf loc. [m.c.a.]',
  'hf med. [m.c.a.]',
  'P.resid. [m.c.a.]',
  'Pmin [m.c.a.]',
  'Margen [m.c.a.]',
]

// Fórmula central de la verificación (brief REPORT-01B §14): estática,
// nunca recalculada -- es la MISMA que resolverBalanceDePresion aplica
// (ver comentario de archivo de ese resolver). hfEquipoACS queda
// deliberadamente fuera de la fórmula: D-δ.15 todavía no tiene fórmula
// normativa vigente, así que no participa del balance ni se muestra como
// término (nunca un 0 inventado).
const FORMULA_BALANCE_DE_PRESION = 'Presidual = Pdisponible − Δz − hfDistribuida − hfLocalizada − hfMedidor'
const NOTA_HF_EQUIPO_ACS =
  'hfEquipoACS no participa de este balance: todavía no tiene fórmula normativa vigente (D-δ.15).'
const NOTA_CRITERIO_CRITICO = 'Selección del terminal crítico: menor margen respecto de Pmin (nunca menor Presidual bruto).'

function estiloDeFilaVerificacion(fila: FilaDeVerificacionDeInforme): string {
  if (fila.esCritico) {
    return 'filaCritica'
  }
  if (fila.estado === 'completo' && fila.cumple === false) {
    return 'filaNoConforme'
  }
  return 'filaNormal'
}

function filaDeTablaVerificacion(fila: FilaDeVerificacionDeInforme): Content[] {
  const etiqueta = `${fila.localEtiqueta} — ${fila.artefactoNombre}${fila.esCritico ? ' (crítico)' : ''}`
  const estadoTexto =
    fila.estado === 'completo'
      ? fila.cumple
        ? 'Cumple'
        : 'No cumple'
      : fila.estado === 'fueraDeAlcance'
        ? (fila.notaTexto ?? 'Fuera de alcance')
        : (fila.notaTexto ?? 'Incompleto')
  const estilo = estiloDeFilaVerificacion(fila)
  const celda = (texto: string): Content => ({ text: texto, style: estilo })
  return [
    celda(etiqueta),
    celda(fila.red ?? '—'),
    celda(soloValor(fila.desnivelTexto)),
    celda(soloValor(fila.hfDistribuidaTexto)),
    celda(soloValor(fila.hfLocalizadaTexto)),
    celda(soloValor(fila.hfMedidorTexto)),
    celda(soloValor(fila.presionResidualTexto)),
    celda(soloValor(fila.presionMinimaTexto)),
    celda(fila.estado === 'completo' ? soloValor(fila.margenTexto) : estadoTexto),
  ]
}

// Desarrollo de cálculo del terminal crítico (brief REPORT-01B §14/§15/
// §16): identificación completa + fórmula + sustitución numérica fiel,
// con Δz mostrado con su signo propio y entre paréntesis en la resta para
// que un descenso (Δz<0, "gana presión estática") no se lea como una doble
// negación confusa. Todos los números son los que ya resolvió
// resolverPresionResidualDeCamino -- ninguna aritmética se repite acá.
// Signo explícito ("+"/"−") sobre un valor ya formateado -- para Δz, cuyo
// signo es dato hidráulico real (ascenso consume carga, descenso la aporta,
// ver resolverBalanceDePresion) y no debe perderse ni leerse ambiguo dentro
// de una resta (brief §15).
function formatearConSigno(valor: number, unidad: string): string {
  const signo = valor >= 0 ? '+' : '−'
  return `${signo}${formatearNumero(Math.abs(valor), unidad)}`
}

function formatearMca(valor: number): string {
  return `${formatearConSigno(valor, 'm')} m.c.a.`
}

function renderizarDesarrolloCritico(d: DesarrolloTerminalCritico): Content[] {
  const cotaTexto = d.cotaTerminal_m === undefined ? '—' : `${formatearNumero(d.cotaTerminal_m, 'm')} m`
  const desnivelTexto = `${formatearConSigno(d.desnivel_m, 'm')} m`

  const sustitucion =
    `Presidual = ${formatearNumero(d.presionDisponible_mca, 'm')} − (${formatearConSigno(d.desnivel_m, 'm')}) − ${formatearNumero(d.hfDistribuida_mca, 'm')} ` +
    `− ${formatearNumero(d.hfLocalizada_mca, 'm')} − ${formatearNumero(d.hfMedidor_mca, 'm')} = ${formatearNumero(d.presionResidual_mca, 'm')} m.c.a.`

  return [
    { text: 'Desarrollo de cálculo del terminal crítico', style: 'subseccion' },
    {
      text: `${d.ufNombre} — ${d.localEtiqueta} — ${d.artefactoNombre}${d.red !== undefined ? ` (${d.red})` : ''}`,
      style: 'subseccionNivel',
    },
    { text: `Cota terminal: ${cotaTexto} · Origen: ${d.origenTexto}`, style: 'metadatos' },
    { text: FORMULA_BALANCE_DE_PRESION, style: 'formula' },
    {
      table: {
        widths: ['auto', '*'],
        body: [
          ['Pdisponible', `${formatearNumero(d.presionDisponible_mca, 'm')} m.c.a.`],
          ['Δz (desnivel)', desnivelTexto],
          ['hfDistribuida', `${formatearNumero(d.hfDistribuida_mca, 'm')} m.c.a.`],
          [`hfLocalizada (${d.metodologiaHfLocalizada === 'estimado' ? 'estimada' : 'detallada'})`, `${formatearNumero(d.hfLocalizada_mca, 'm')} m.c.a.`],
          ['hfMedidor', `${formatearNumero(d.hfMedidor_mca, 'm')} m.c.a.`],
        ],
      },
      margin: [0, 2, 0, 4],
    },
    { text: NOTA_HF_EQUIPO_ACS, style: 'metadatos' },
    { text: sustitucion, style: 'formula' },
    { text: `Margen = Presidual − Pmin = ${formatearNumero(d.presionResidual_mca, 'm')} − ${formatearNumero(d.presionMinimaRequerida_mca, 'm')} = ${formatearMca(d.margen_mca)}`, style: 'formula' },
    { text: `Conclusión: ${d.cumpleMinimo ? 'CUMPLE' : 'NO CUMPLE'}`, style: d.cumpleMinimo ? 'conforme' : 'noConforme' },
  ]
}

function renderizarSeccionVerificacion(datos: DatosDeInforme): Content[] {
  const { verificacion, origenM4Texto } = datos
  const contenido: Content[] = [
    { text: 'Verificación hidráulica', style: 'seccion', pageOrientation: 'landscape' },
    { text: `Origen hidráulico: ${verificacion.origenTexto} (${origenM4Texto})`, style: 'metadatos' },
    {
      text: `Presión disponible: ${verificacion.presionDisponibleTexto ?? 'No provista todavía'}`,
      style: 'metadatos',
    },
  ]

  if (verificacion.estadoGlobal === 'noIniciado') {
    contenido.push({ text: 'Módulo 2 todavía no fue iniciado.', style: 'advertencia' })
    return contenido
  }
  if (verificacion.estadoGlobal === 'error') {
    contenido.push({ text: 'El proyecto tiene errores estructurales que impiden verificar la presión.', style: 'advertencia' })
    return contenido
  }

  contenido.push({ text: FORMULA_BALANCE_DE_PRESION, style: 'formula' })
  contenido.push({ text: NOTA_HF_EQUIPO_ACS, style: 'metadatos' })
  contenido.push({ text: NOTA_CRITERIO_CRITICO, style: 'metadatos' })

  if (verificacion.terminalCriticoNodoId !== undefined) {
    const critico = verificacion.filas.find((f) => f.nodoId === verificacion.terminalCriticoNodoId)
    if (critico !== undefined) {
      contenido.push({
        table: {
          widths: ['auto', '*'],
          body: [
            ['Terminal crítico', `${critico.localEtiqueta} — ${critico.artefactoNombre}`],
            ['Presión residual', critico.presionResidualTexto],
            ['Presión mínima', critico.presionMinimaTexto],
            ['Margen', critico.margenTexto],
            ['Estado', critico.cumple ? 'Cumple' : 'No cumple'],
          ],
        },
        style: 'filaCritica',
        margin: [0, 4, 0, 8],
      })
    }
    if (verificacion.desarrolloCritico !== undefined) {
      contenido.push(...renderizarDesarrolloCritico(verificacion.desarrolloCritico))
    }
  } else {
    contenido.push({ text: 'Todavía no se puede determinar un terminal crítico.', style: 'advertencia' })
  }

  if (verificacion.motivosDeIncompletitud.length > 0) {
    contenido.push({ text: 'Verificación incompleta', style: 'subseccion' })
    contenido.push(...verificacion.motivosDeIncompletitud.map((linea): Content => ({ text: `- ${linea}`, style: 'advertencia' })))
  }

  if (verificacion.filas.length > 0) {
    contenido.push({
      table: {
        headerRows: 1,
        widths: ANCHOS_TABLA_VERIFICACION,
        body: [ENCABEZADO_TABLA_VERIFICACION, ...verificacion.filas.map(filaDeTablaVerificacion)],
      },
      fontSize: 7,
      margin: [0, 4, 0, 4],
    })
  }

  return contenido
}

// ---------------------------------------------------------------------
// Documento
// ---------------------------------------------------------------------

// Puramente sintáctico (arma el docDefinition de pdfMake) -- sin efectos ni
// llamada al motor. Separado de generarDocumentoPdf para poder testear la
// ESTRUCTURA del informe (secciones, paginación, contenido de tablas) sin
// depender de la apertura real del PDF en el navegador (brief §26/§33).
export function construirDocDefinition(datos: DatosDeInforme): TDocumentDefinitions {
  const { proyecto, resultadoM1 } = datos
  return {
    content: [
      { text: 'IUAS — Memoria de cálculo', style: 'encabezado' },
      {
        text: `App v${resultadoM1.metadatos.versionApp} · Normativa ${resultadoM1.metadatos.versionNormativa}`,
        style: 'metadatos',
      },
      renderizarDatosDelProyecto(proyecto),
      ...renderizarUnidadesFuncionalesM1(datos.unidadesFuncionalesM1),
      ...renderizarResumenResultados(resultadoM1),
      ...(resultadoM1.advertencias.length > 0
        ? [
            { text: 'Advertencias', style: 'seccion' } as Content,
            ...resultadoM1.advertencias.map((a): Content => ({ text: `- ${a.mensaje}`, style: 'advertencia' })),
          ]
        : []),
      { text: 'Desarrollo del cálculo (Demanda)', style: 'seccion' },
      ...resultadoM1.pasos.map(renderizarPaso),
      ...(resultadoM1.verificaciones.length > 0
        ? [
            { text: 'Verificaciones normativas (Demanda)', style: 'seccion' } as Content,
            ...resultadoM1.verificaciones.map(renderizarVerificacionM1),
          ]
        : []),
      { text: '', pageBreak: 'before' },
      ...renderizarSeccionM2(datos.m2),
      ...renderizarSeccionVerificacion(datos),
    ],
    styles: {
      encabezado: { fontSize: 16, bold: true, margin: [0, 0, 0, 4] },
      metadatos: { fontSize: 8, color: '#555555', margin: [0, 0, 0, 12] },
      seccion: { fontSize: 12, bold: true, margin: [0, 8, 0, 4] },
      subseccion: { fontSize: 10, bold: true, margin: [0, 6, 0, 2] },
      subseccionNivel: { fontSize: 9, bold: true, italics: true, margin: [0, 4, 0, 2] },
      qcDestacado: { fontSize: 13, bold: true, margin: [0, 0, 0, 4] },
      tituloPaso: { fontSize: 10, bold: true },
      formula: { fontSize: 10, italics: true, margin: [0, 2, 0, 2] },
      resultadoPaso: { fontSize: 10, bold: true, margin: [0, 2, 0, 0] },
      referencia: { fontSize: 8, color: '#555555' },
      advertencia: { fontSize: 9, color: '#8a6d00' },
      conforme: { fontSize: 9, color: '#1a7a1a' },
      noConforme: { fontSize: 9, bold: true, color: '#b00020', fillColor: '#fdecea' },
      filaNormal: { fontSize: 7 },
      filaNoConforme: { fontSize: 7, color: '#b00020' },
      filaCritica: { fontSize: 8, bold: true, color: '#b00020' },
    },
    defaultStyle: { fontSize: 10 },
  }
}

export function generarDocumentoPdf(entrada: EntradaGeneracionPdf): void {
  const datos = resolverDatosDeInforme(entrada.proyecto, catalogoArtefactos, coeficientesMayoracion)
  pdfMake.createPdf(construirDocDefinition(datos)).open()
}
