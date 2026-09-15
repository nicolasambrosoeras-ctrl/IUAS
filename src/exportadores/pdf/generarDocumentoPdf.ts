// Renderizador de PDF (ADR-012, exportadores/pdf). Recibe un DatosDeInforme
// (snapshot DERIVADO y puro, ver resolverDatosDeInforme.ts) y produce el
// documento -- nunca recalcula (C-05). REPORT-01A agregó Tuberías (M2) y
// Verificación hidráulica; REPORT-01B convirtió M2/Verificación en memoria
// de cálculo trazable; REPORT-01C agrega Medidores (M3) y Alimentación y
// reserva (M4), cerrando conceptualmente REPORT-01.
import pdfMake from 'pdfmake/build/pdfmake'
import pdfFonts from 'pdfmake/build/vfs_fonts'
import type { Content, TDocumentDefinitions } from 'pdfmake/interfaces'
import type { Local, Proyecto, RegimenLocal, TipoDeLocal } from '../../modelo/proyecto'
import { nombreVisibleDeLocal } from '../../modelo/proyecto/nombreVisibleDeLocal'
import type { Paso, ResultadoDeCalculo, Verificacion } from '../../modelo/resultado'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import {
  formulaSimbolica,
  sustitucionNumerica,
  textoValorCalculado,
} from '../../presentacion/desarrolloDelCalculoDemanda'
import { ETIQUETA_SERVICIO_MEDIDO } from '../../interfaz/paginas/humanizarModulo3'
import { ETIQUETA_ESQUEMA_ABASTECIMIENTO, etiquetaDesnivelConexion } from '../../interfaz/paginas/humanizarModulo4'
import { formatearNumero } from './formatearNumero'
import {
  resolverDatosDeInforme,
  type CasoPerdidaLocalizadaEstimada,
  type CasoVelocidadYPerdidaDistribuida,
  type DatosDeInforme,
  type DesarrolloTerminalCritico,
  type FilaDeTuberiaDeInforme,
  type FilaDeVerificacionDeInforme,
  type SeccionM3DeInforme,
  type SeccionM4DeInforme,
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
  return texto.replace(/ m\.c\.a\.$/, '').replace(/ m\/s$/, '').replace(/ mm$/, '').replace(/ m$/, '')
}

// Notación científica ASCII-segura (FIX-REPORT-01B-VISUAL-01, P6): pdfMake
// ya renderiza bien `1,6286e-4` como texto (no hay glifo roto), pero es
// poco legible en una Memoria profesional. Es manipulación de PRESENTACIÓN
// sobre un número ya calculado -- no cambia ningún valor.
function formatearNotacionCientifica(valor: number, decimales: number): string {
  if (valor === 0) {
    return '0'
  }
  const exponente = Math.floor(Math.log10(Math.abs(valor)))
  const mantisa = valor / Math.pow(10, exponente)
  return `${mantisa.toFixed(decimales).replace('.', ',')} × 10^${exponente}`
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
        text: `Local: ${nombreVisibleDeLocal(local, ETIQUETA_TIPO_DE_LOCAL[local.tipo])} — Régimen: ${etiquetaRegimen(local.regimen)}`,
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

const ANCHOS_TABLA_TUBERIA = ['*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto']
const ENCABEZADO_TABLA_TUBERIA = ['Tramo / Local', 'Red', 'Long. [m]', 'DN [mm]', 'Di [mm]', 'V [m/s]', 'Pérdida [m.c.a.]', 'Estado']

// Badge compacto PROPIO del PDF (REPORT-01B §19, corregido en
// FIX-REPORT-01B-VISUAL-01 P2): la etiqueta larga "○ DN mínimo comercial"
// que ya usa la UI interactiva (ETIQUETA_ESTADO en
// resolverFilaDeDimensionamiento.ts) se parte letra por letra en la columna
// angosta de una tabla impresa. Los símbolos ✓/⚠ del primer intento se
// veían como glifos rotos con la fuente vfs de pdfMake -- se reemplazan
// por texto ASCII robusto. Se arma a partir del mismo `estado` crudo
// ('ok'|'controlar'|'incompleto') que ya expone el dominio -- no
// reinterpreta el estado, sólo cambia cuántas palabras/símbolos usa.
const ETIQUETA_ESTADO_PDF: Readonly<Record<FilaDeTuberiaDeInforme['estado'], string>> = {
  ok: 'OK',
  controlar: 'DN mín.',
  incompleto: 'Incompleto',
}

function filaDeTablaTuberia(fila: FilaDeTuberiaDeInforme): (string | Content)[] {
  return [
    fila.etiqueta,
    fila.red === 'AF' ? 'AF' : 'AC',
    soloValor(fila.longitudTexto),
    soloValor(fila.dnTexto),
    fila.diTexto,
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
// P1 (FIX-REPORT-01B-VISUAL-01): la fórmula de Hazen-Williams se veía rota
// -- combinaba superíndices Unicode apilados (dígito + punto + dígitos,
// "¹∙⁸⁵²"/"⁴∙⁸⁷") que la fuente vfs de pdfMake no representa bien, y
// además mostraba "Q³" (incorrecto: el exponente real es 1,852, no 3).
// ASCII técnico estable (`^1,852`, `^4,87`) en vez de superíndice --
// mismos exponentes que ya usa correctamente la sustitución numérica de
// abajo (CRIT-A17), sólo se corrige el texto de la fórmula general.
const FORMULA_PERDIDA_DISTRIBUIDA: Readonly<Record<'hazenWilliams' | 'darcyWeisbach', readonly string[]>> = {
  hazenWilliams: ['J = 10,67 · Q^1,852 / (C^1,852 · Di^4,87)  [Q en m³/s, Di en m -- CRIT-A17]', 'hf = J · L'],
  darcyWeisbach: ['hf = f · (L / Di) · (V² / (2·g))  [g = 9,81 m/s² -- CRIT-A18]'],
}

// Sustitución numérica del caso representativo de velocidad + pérdida
// distribuida (brief REPORT-01B §8/§9): interpola los datos CRUDOS que
// resolverPerdidaDistribuidaDeTramo ya resolvió -- ninguna aritmética nueva.
function renderizarCasoVelocidadYPerdidaDistribuida(caso: CasoVelocidadYPerdidaDistribuida): Content[] {
  const q_m3s = caso.qc_lps / 1000
  const di_m = caso.diametroInteriorEfectivo_mm / 1000
  const a_m2 = (Math.PI * di_m ** 2) / 4
  const a_m2Texto = formatearNotacionCientifica(a_m2, 4)
  const sustitucionV =
    `A = π·Di²/4 = π·(${formatearNumero(caso.diametroInteriorEfectivo_mm, 'mm')}mm)²/4 = ${a_m2Texto} m²` +
    `  →  V = Q/A = ${formatearNumero(caso.qc_lps, 'l/s')} l/s / ${a_m2Texto} m² = ${formatearNumero(caso.velocidad_mps, 'm/s')} m/s`

  const detalleTexto: string[] =
    caso.detalle.metodo === 'hazenWilliams'
      ? [
          `J = 10,67 · (${formatearNotacionCientifica(q_m3s, 4)})^1,852 / (${formatearNumero(caso.detalle.coeficienteC, 'adimensional')}^1,852 · ${di_m.toFixed(4)}^4,87) = ${formatearNotacionCientifica(caso.detalle.perdidaUnitaria_J_m_m, 4)} m/m`,
          `hf = J · L = ${formatearNotacionCientifica(caso.detalle.perdidaUnitaria_J_m_m, 4)} × ${formatearNumero(caso.longitud_m, 'm')} m = ${formatearNumero(caso.hfDistribuida_m, 'm')} m.c.a.`,
        ]
      : [
          `Re = ${caso.detalle.reynolds.toFixed(0)} (ν = ${formatearNotacionCientifica(caso.detalle.viscosidadCinematica_m2s, 4)} m²/s @ ${formatearNumero(caso.detalle.temperaturaReferencia_C, 'adimensional')}°C)`,
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

  // P3 (FIX-REPORT-01C-VISUAL-01): orden hidráulico aguas arriba -> aguas
  // abajo -- alimentaciones generales -> Montantes -> redes de los
  // Locales -- en vez del orden anterior (Locales antes que Montantes),
  // que no reflejaba la lectura real de la instalación. Sólo reordena
  // bloques del renderer; ningún dato, cálculo ni resolver cambia.
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

  if (m2.locales.length > 0) {
    contenido.push({ text: 'Unidades funcionales — Locales', style: 'subseccion' })
    for (const grupo of m2.locales) {
      contenido.push({ text: grupo.nombre, style: 'subseccionNivel' })
      contenido.push(tablaDeTuberia(grupo.filas))
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
// (ver comentario de archivo de ese resolver).
//
// HYD-ACS-MANUAL-LOSS-01 (D-δ.129): hfEquipoACS sigue sin fórmula
// normativa AUTOMÁTICA (D-δ.15) -- pero ahora el proyectista puede
// adoptarla manualmente. `FORMULA_BALANCE_DE_PRESION` es la base SIN ese
// término (camino AF, o AC sin dato informado); `formulaBalanceDePresion`
// agrega el término cuando corresponde mostrarlo.
const FORMULA_BALANCE_DE_PRESION = 'Presidual = Pdisponible − Δz − hfDistribuida − hfLocalizada − hfMedidor'
const FORMULA_BALANCE_DE_PRESION_CON_ACS =
  'Presidual = Pdisponible − Δz − hfDistribuida − hfLocalizada − hfMedidor − hfEquipoACS'
const NOTA_HF_EQUIPO_ACS_AUSENTE =
  'hfEquipoACS no participa de este balance: todavía no fue informado (dato manual del fabricante, D-δ.129).'
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

// P1 (FIX-REPORT-01C-VISUAL-01): antes este desarrollo se devolvía como un
// array de nodos SUELTOS de pdfMake -- sin ningún nodo que los agrupara,
// pdfMake podía partir la página entre cualquier par de ellos (típicamente
// entre "Margen" y "Conclusión"), dejando la Conclusión sola en una página
// casi vacía justo antes del pageBreak explícito de la tabla de detalle.
// Se agrupan en un ÚNICO `stack` con `unbreakable: true`: pdfMake mueve el
// bloque COMPLETO (fórmula, tabla, sustitución, margen, conclusión) a la
// página siguiente como una unidad si no entra entero en la actual, en vez
// de partirlo -- sin medir alturas ni calcular posiciones a mano.
function renderizarDesarrolloCritico(d: DesarrolloTerminalCritico): Content {
  const cotaTexto = d.cotaTerminal_m === undefined ? '—' : `${formatearNumero(d.cotaTerminal_m, 'm')} m`
  const desnivelTexto = `${formatearConSigno(d.desnivel_m, 'm')} m`

  // HYD-ACS-MANUAL-LOSS-01 (D-δ.129): el término sólo tiene sentido cuando
  // este camino ES de red AC (nunca AF) Y el proyectista ya lo informó --
  // mismo criterio condicional que la UI (CalculoDelCriticoDetalle.tsx).
  const hfEquipoACSAplicable = d.red === 'AC' && d.hfEquipoACS_mca !== undefined

  const sustitucion = hfEquipoACSAplicable
    ? `Presidual = ${formatearNumero(d.presionDisponible_mca, 'm')} − (${formatearConSigno(d.desnivel_m, 'm')}) − ${formatearNumero(d.hfDistribuida_mca, 'm')} ` +
      `− ${formatearNumero(d.hfLocalizada_mca, 'm')} − ${formatearNumero(d.hfMedidor_mca, 'm')} − ${formatearNumero(d.hfEquipoACS_mca!, 'm')} = ${formatearNumero(d.presionResidual_mca, 'm')} m.c.a.`
    : `Presidual = ${formatearNumero(d.presionDisponible_mca, 'm')} − (${formatearConSigno(d.desnivel_m, 'm')}) − ${formatearNumero(d.hfDistribuida_mca, 'm')} ` +
      `− ${formatearNumero(d.hfLocalizada_mca, 'm')} − ${formatearNumero(d.hfMedidor_mca, 'm')} = ${formatearNumero(d.presionResidual_mca, 'm')} m.c.a.`

  return {
    unbreakable: true,
    stack: [
      { text: 'Desarrollo de cálculo del terminal crítico', style: 'subseccion' },
      {
        // P4 (FIX-REPORT-01B-VISUAL-01): `d.localEtiqueta` ya incluye el
        // nombre de la UF (etiquetaHumanaDeLocal, "Baño 1 · Unidad
        // funcional 1") -- anteponer `d.ufNombre` la duplicaba
        // ("Unidad funcional 1 — Baño 1 · Unidad funcional 1 — ...").
        text: `${d.localEtiqueta} — ${d.artefactoNombre}${d.red !== undefined ? ` (${d.red})` : ''}`,
        style: 'subseccionNivel',
      },
      { text: `Cota terminal: ${cotaTexto} · Origen: ${d.origenTexto}`, style: 'metadatos' },
      { text: hfEquipoACSAplicable ? FORMULA_BALANCE_DE_PRESION_CON_ACS : FORMULA_BALANCE_DE_PRESION, style: 'formula' },
      {
        table: {
          widths: ['auto', '*'],
          body: [
            ['Pdisponible', `${formatearNumero(d.presionDisponible_mca, 'm')} m.c.a.`],
            ['Δz (desnivel)', desnivelTexto],
            ['hfDistribuida', `${formatearNumero(d.hfDistribuida_mca, 'm')} m.c.a.`],
            [`hfLocalizada (${d.metodologiaHfLocalizada === 'estimado' ? 'estimada' : 'detallada'})`, `${formatearNumero(d.hfLocalizada_mca, 'm')} m.c.a.`],
            ['hfMedidor', `${formatearNumero(d.hfMedidor_mca, 'm')} m.c.a.`],
            ...(hfEquipoACSAplicable ? [['hfEquipoACS (dato manual del fabricante)', `${formatearNumero(d.hfEquipoACS_mca!, 'm')} m.c.a.`]] : []),
          ],
        },
        margin: [0, 2, 0, 4],
      },
      ...(d.red === 'AC' && !hfEquipoACSAplicable ? [{ text: NOTA_HF_EQUIPO_ACS_AUSENTE, style: 'metadatos' } as Content] : []),
      { text: sustitucion, style: 'formula' },
      { text: `Margen = Presidual − Pmin = ${formatearNumero(d.presionResidual_mca, 'm')} − ${formatearNumero(d.presionMinimaRequerida_mca, 'm')} = ${formatearMca(d.margen_mca)}`, style: 'formula' },
      { text: `Conclusión: ${d.cumpleMinimo ? 'CUMPLE' : 'NO CUMPLE'}`, style: d.cumpleMinimo ? 'conforme' : 'noConforme' },
    ],
  }
}

function renderizarSeccionVerificacion(datos: DatosDeInforme): Content[] {
  const { verificacion, origenM4Texto } = datos
  const contenido: Content[] = [
    { text: 'Verificación hidráulica', style: 'seccion', pageOrientation: 'landscape' },
    // P4 (FIX-REPORT-01B-VISUAL-01): origenM4Texto ya es una descripción
    // completa ("Alimentación directa (sin tanque de reserva)", "Tanque
    // elevado", "Cisterna + bombeo + tanque elevado") -- envolverla junto
    // a verificacion.origenTexto duplicaba el mismo label ("Alimentación
    // directa (Alimentación directa (sin tanque de reserva))").
    { text: `Origen hidráulico: ${origenM4Texto}`, style: 'metadatos' },
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
  contenido.push({
    text:
      datos.proyecto.hfEquipoACS_mca === undefined
        ? NOTA_HF_EQUIPO_ACS_AUSENTE
        : `Pérdida del equipo ACS adoptada manualmente: ${formatearNumero(datos.proyecto.hfEquipoACS_mca, 'm')} m.c.a. (se aplica a los caminos de Agua caliente que atraviesan la producción ACS).`,
    style: 'metadatos',
  })
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
      contenido.push(renderizarDesarrolloCritico(verificacion.desarrolloCritico))
    }
  } else {
    contenido.push({ text: 'Todavía no se puede determinar un terminal crítico.', style: 'advertencia' })
  }

  if (verificacion.motivosDeIncompletitud.length > 0) {
    contenido.push({ text: 'Verificación incompleta', style: 'subseccion' })
    contenido.push(...verificacion.motivosDeIncompletitud.map((linea): Content => ({ text: `- ${linea}`, style: 'advertencia' })))
  }

  if (verificacion.filas.length > 0) {
    // P5 (FIX-REPORT-01B-VISUAL-01): sin este salto, la tabla arrancaba
    // apretada contra el desarrollo del crítico y terminaba desbordando a
    // una página final casi vacía con sólo las últimas filas -- pdfMake
    // no mide alturas por nosotros (no se calculan posiciones en JS), sólo
    // se le da un punto de corte explícito para que la tabla empiece
    // limpia al tope de una página nueva y fluya de forma natural desde
    // ahí (headerRows:1 ya repite el encabezado en cada página que la
    // tabla ocupe, sin configuración adicional).
    contenido.push({ text: 'Detalle de verificación por terminal', style: 'subseccion', pageBreak: 'before' })
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
// Medidores (REPORT-01C)
// ---------------------------------------------------------------------

type ResultadoModulo3NoUndefined = NonNullable<SeccionM3DeInforme['resultado']>
type MedidorGeneralDeInforme = ResultadoModulo3NoUndefined['medidorGeneral']
type MedidorIndividualDeInforme = ResultadoModulo3NoUndefined['medidoresIndividuales'][number]

const ANCHOS_TABLA_MEDIDORES = ['*', 'auto', 'auto', 'auto', 'auto', 'auto', 'auto']
const ENCABEZADO_TABLA_MEDIDORES = ['Medidor', 'Ámbito', 'Q [l/min]', 'DN [mm]', 'C [m³/h]', 'Adopción', 'hf [m.c.a.]']

const FORMULA_MEDIDOR = 'hfMedidor = 0,036 · (Qcl / C)^2   [Qcl en l/min, C en m³/h -- ERAS-2023 fórmula 6]'

function filaDeTablaMedidorGeneral(medidor: MedidorGeneralDeInforme): (string | Content)[] {
  return [
    'Medidor general',
    'General',
    formatearNumero(medidor.qcl_lpm, 'adimensional'),
    String(medidor.adoptado.dnMedidor_mm),
    formatearNumero(medidor.adoptado.capacidadMaxima_m3h, 'adimensional'),
    medidor.adoptado.origen === 'manual' ? 'Manual' : 'Automático',
    formatearNumero(medidor.adoptado.hfMedidor_mca, 'm'),
  ]
}

function filaDeTablaMedidorIndividual(proyecto: Proyecto, medidor: MedidorIndividualDeInforme): (string | Content)[] {
  const uf = proyecto.unidadesFuncionales.find((candidata) => candidata.id === medidor.resultado.unidadFuncionalId)
  const etiqueta = `${uf?.nombre ?? medidor.resultado.unidadFuncionalId} · ${ETIQUETA_SERVICIO_MEDIDO[medidor.resultado.servicioMedido]}`
  return [
    etiqueta,
    'Individual',
    formatearNumero(medidor.resultado.qcl_lpm, 'adimensional'),
    String(medidor.resultado.adoptado.dnMedidor_mm),
    formatearNumero(medidor.resultado.adoptado.capacidadMaxima_m3h, 'adimensional'),
    medidor.resultado.adoptado.origen === 'manual' ? 'Manual' : 'Automático',
    formatearNumero(medidor.resultado.adoptado.hfMedidor_mca, 'm'),
  ]
}

function renderizarSeccionM3(datos: DatosDeInforme): Content[] {
  const { m3, proyecto } = datos
  const contenido: Content[] = [{ text: 'Medidores', style: 'seccion', pageBreak: 'before' }]

  if (m3.estado === 'noIniciado') {
    contenido.push({ text: 'Módulo 3 todavía no fue iniciado.', style: 'advertencia' })
    return contenido
  }
  if (m3.estado === 'error') {
    contenido.push({ text: 'El proyecto tiene errores estructurales que impiden resolver los medidores.', style: 'advertencia' })
    contenido.push(...m3.motivosDeIncompletitud.map((t): Content => ({ text: `- ${t}`, style: 'advertencia' })))
    return contenido
  }

  // P11 (brief REPORT-01C §11): "No corresponde" en vez de C=0/hf=0 cuando
  // el criterio vigente (CRIT-A34) directamente no exige medidor individual.
  if (m3.esPropiedadHorizontal === false) {
    contenido.push({
      text: 'El proyecto no es de propiedad horizontal: no corresponde medidor individual (CRIT-A34).',
      style: 'metadatos',
    })
  }

  const medidorGeneral = m3.resultado?.medidorGeneral ?? m3.parcial?.medidorGeneral
  const individuales = m3.resultado?.medidoresIndividuales ?? m3.parcial?.medidoresIndividuales ?? []

  if (medidorGeneral === undefined && individuales.length === 0) {
    contenido.push({ text: 'Todavía no se pudo determinar ningún medidor.', style: 'advertencia' })
  } else {
    const filas: (string | Content)[][] = [
      ...(medidorGeneral !== undefined ? [filaDeTablaMedidorGeneral(medidorGeneral)] : []),
      ...individuales.map((m) => filaDeTablaMedidorIndividual(proyecto, m)),
    ]
    contenido.push({
      table: { headerRows: 1, widths: ANCHOS_TABLA_MEDIDORES, body: [ENCABEZADO_TABLA_MEDIDORES, ...filas] },
      fontSize: 8,
      margin: [0, 2, 0, 8],
    })
  }

  // P2 (FIX-REPORT-01C-VISUAL-01): el medidor general puede estar resuelto
  // por M3 (Tabla N°6) y a la vez NO participar del balance de presión de
  // la Verificación -- son preguntas distintas ("¿existe el medidor?" vs.
  // "¿su hf entra en ESTE camino?"). La señal de aplicabilidad NO se
  // infiere en el renderer: es la MISMA que ya usa el puente M3→M2
  // (resolverPerdidasDeMedidoresParaTerminal -- "el medidor general
  // pertenece al camino sólo con origen 'alimentacionDirecta'; con
  // 'tanqueElevado' queda aguas arriba del almacenamiento, nunca entra al
  // balance tanque→terminal"), ya expuesta en el snapshot como
  // `verificacion.origenTexto` (derivado de resolverOrigenHidraulicoEfectivo,
  // que mapea 'tanqueElevado' Y 'cisternaBombeoElevado' al mismo origen
  // efectivo). Nunca se muestra esta nota con origen 'directa' (ahí el
  // medidor general SÍ participa).
  if (medidorGeneral !== undefined && datos.verificacion.origenTexto === 'Tanque elevado') {
    contenido.push({
      text:
        'En el esquema hidráulico actual (tanque elevado), este medidor general no participa del balance de ' +
        'presión de los terminales: queda aguas arriba del tanque de almacenamiento. Su hf informado arriba es ' +
        'el del medidor en sí, no un término de la Verificación hidráulica.',
      style: 'metadatos',
    })
  }

  if (m3.hayACSIndividual) {
    contenido.push({
      text:
        'El medidor de agua fría de una unidad funcional con provisión de ACS individual también alcanza el ' +
        'recorrido de agua caliente de esa unidad (no existe un medidor de agua caliente adicional para ese caso).',
      style: 'metadatos',
    })
  }

  if (m3.estado === 'incompleto' && m3.motivosDeIncompletitud.length > 0) {
    contenido.push({ text: 'Medidores incompletos', style: 'subseccion' })
    contenido.push(...m3.motivosDeIncompletitud.map((t): Content => ({ text: `- ${t}`, style: 'advertencia' })))
  }

  const casoDesarrollo =
    medidorGeneral !== undefined
      ? { etiqueta: 'Medidor general', qcl_lpm: medidorGeneral.qcl_lpm, adoptado: medidorGeneral.adoptado }
      : individuales.length > 0
        ? {
            etiqueta: `${proyecto.unidadesFuncionales.find((u) => u.id === individuales[0]!.resultado.unidadFuncionalId)?.nombre ?? individuales[0]!.resultado.unidadFuncionalId} · ${ETIQUETA_SERVICIO_MEDIDO[individuales[0]!.resultado.servicioMedido]}`,
            qcl_lpm: individuales[0]!.resultado.qcl_lpm,
            adoptado: individuales[0]!.resultado.adoptado,
          }
        : undefined

  contenido.push({ text: 'Desarrollo de cálculo — Medidores', style: 'subseccion' })
  contenido.push({ text: FORMULA_MEDIDOR, style: 'formula' })
  if (casoDesarrollo !== undefined) {
    const sustitucion =
      `hfMedidor = 0,036 · (${formatearNumero(casoDesarrollo.qcl_lpm, 'adimensional')} / ${formatearNumero(casoDesarrollo.adoptado.capacidadMaxima_m3h, 'adimensional')})^2` +
      ` = ${formatearNumero(casoDesarrollo.adoptado.hfMedidor_mca, 'm')} m.c.a.`
    contenido.push({ text: `Caso representativo: ${casoDesarrollo.etiqueta}`, style: 'subseccionNivel' })
    contenido.push({ text: sustitucion, style: 'formula' })
    contenido.push({
      text: `Capacidad adoptada según Tabla N°6 (CRIT-A32) -- DN ${casoDesarrollo.adoptado.dnMedidor_mm} mm, C ${formatearNumero(casoDesarrollo.adoptado.capacidadMaxima_m3h, 'adimensional')} m³/h.`,
      style: 'metadatos',
    })
  } else {
    contenido.push({ text: 'Todavía no hay ningún medidor resuelto para mostrar un caso.', style: 'advertencia' })
  }

  return contenido
}

// ---------------------------------------------------------------------
// Alimentación y reserva (REPORT-01C)
// ---------------------------------------------------------------------

type ResultadoModulo4NoUndefined = NonNullable<SeccionM4DeInforme['resultado']>
type ResultadoAdopcionDeReservaDeInforme = Extract<ResultadoModulo4NoUndefined, { tipo: 'reservaCalculada' }>['adopcion']

const FORMULA_PRESION_CONEXION = 'Pcalc = Pacera − desnivelConexion'
const FORMULA_RESERVA = ['Dc = máx(0, Qc − Qconn)', 'VReserva = Dc[m³/h] · Tc[h]   (Dc[m³/h] = Dc[l/s] · 3,6)']

function renderizarSeccionM4(datos: DatosDeInforme): Content[] {
  const { m4 } = datos
  const contenido: Content[] = [{ text: 'Alimentación y reserva', style: 'seccion', pageBreak: 'before' }]

  if (m4.estado === 'noIniciado') {
    contenido.push({ text: 'Módulo 4 todavía no fue iniciado.', style: 'advertencia' })
    return contenido
  }
  if (m4.estado === 'error') {
    contenido.push({ text: 'El proyecto tiene errores estructurales que impiden resolver la alimentación y reserva.', style: 'advertencia' })
    contenido.push(...m4.motivosDeIncompletitud.map((t): Content => ({ text: `- ${t}`, style: 'advertencia' })))
    return contenido
  }

  contenido.push({
    text: `Esquema de abastecimiento: ${m4.esquema !== undefined ? ETIQUETA_ESQUEMA_ABASTECIMIENTO[m4.esquema] : 'No determinado'}`,
    style: 'metadatos',
  })

  if (m4.estado === 'incompleto') {
    contenido.push({ text: 'Alimentación y reserva incompleta', style: 'subseccion' })
    contenido.push(...m4.motivosDeIncompletitud.map((t): Content => ({ text: `- ${t}`, style: 'advertencia' })))
    return contenido
  }

  const resultado = m4.resultado
  if (resultado === undefined) {
    return contenido
  }

  if (resultado.tipo === 'sinReservaPorTanque') {
    // P20 (brief §20): esquema directo -- no generar un bloque de reserva
    // irrelevante que el motor no utiliza.
    contenido.push({
      text: 'Esquema de alimentación directa: la reserva por tanque no aplica (§2.10.2 no interviene en este esquema).',
      style: 'metadatos',
    })
    return contenido
  }

  const { conexion, reserva, adopcion } = resultado

  contenido.push({ text: 'Conexión', style: 'subseccion' })
  contenido.push({
    table: {
      widths: ['auto', '*'],
      body: [
        ['Qc (Módulo 1)', `${formatearNumero(reserva.qc_lps, 'l/s')} l/s`],
        ['DN de conexión', `${formatearNumero(conexion.diametroNominal_m * 1000, 'mm')} mm`],
        ['Presión sobre acera', `${formatearNumero(conexion.presionSobreAcera_m, 'm')} m.c.a.`],
        [etiquetaDesnivelConexion(resultado.esquema), formatearConSigno(conexion.desnivelConexion_m, 'm') + ' m'],
        ['Presión de cálculo (Pcalc)', `${formatearNumero(conexion.presionCalculo_m, 'm')} m.c.a.`],
        ['Caudal de conexión (Qconn, Tabla N°1)', `${formatearNumero(conexion.qConexion_lps, 'l/s')} l/s`],
      ],
    },
    margin: [0, 2, 0, 4],
  })

  contenido.push({ text: 'Desarrollo de cálculo — Presión de conexión', style: 'subseccionNivel' })
  contenido.push({ text: FORMULA_PRESION_CONEXION, style: 'formula' })
  contenido.push({
    text:
      `Pcalc = ${formatearNumero(conexion.presionSobreAcera_m, 'm')} − (${formatearConSigno(conexion.desnivelConexion_m, 'm')}) ` +
      `= ${formatearNumero(conexion.presionCalculo_m, 'm')} m.c.a.`,
    style: 'formula',
  })
  contenido.push({
    text: `Qconn resuelto por Tabla N°1 (§2.7): ${conexion.interpolacion.aplicada ? `interpolado entre ${formatearNumero(conexion.interpolacion.presionInferior_m, 'm')} m y ${formatearNumero(conexion.interpolacion.presionSuperior_m, 'm')} m` : `presión tabulada exacta (${formatearNumero(conexion.interpolacion.presionTabulada_m, 'm')} m)`}.`,
    style: 'metadatos',
  })

  if (m4.peloDeAguaMinimoEfectivo.tipo === 'derivadoRapido') {
    contenido.push({
      text: `Cota mínima de agua considerada (modo Rápido, CRIT-A39): ${formatearNumero(m4.peloDeAguaMinimoEfectivo.cota_m, 'm')} m.`,
      style: 'metadatos',
    })
  }

  contenido.push({ text: 'Reserva', style: 'subseccion' })
  contenido.push({
    table: {
      widths: ['auto', '*'],
      body: [
        ['Qc', `${formatearNumero(reserva.qc_lps, 'l/s')} l/s`],
        ['Qconn', `${formatearNumero(reserva.qConexion_lps, 'l/s')} l/s`],
        ['Déficit de caudal (Dc)', `${formatearNumero(reserva.deficit_lps, 'l/s')} l/s`],
        ['Período de consumo máximo (Tc)', `${formatearNumero(reserva.tc_h, 'adimensional')} h`],
        ['Volumen de reserva calculado', `${formatearNumero(reserva.volumenReservaDiseno_m3, 'adimensional')} m³`],
      ],
    },
    margin: [0, 2, 0, 4],
  })

  contenido.push({ text: 'Desarrollo de cálculo — Reserva', style: 'subseccionNivel' })
  contenido.push(...FORMULA_RESERVA.map((f): Content => ({ text: f, style: 'formula' })))
  contenido.push({
    text: `Dc = máx(0, ${formatearNumero(reserva.qc_lps, 'l/s')} − ${formatearNumero(reserva.qConexion_lps, 'l/s')}) = ${formatearNumero(reserva.deficit_lps, 'l/s')} l/s`,
    style: 'formula',
  })
  contenido.push({
    text: `VReserva = ${formatearNumero(reserva.deficit_m3h, 'adimensional')} m³/h × ${formatearNumero(reserva.tc_h, 'adimensional')} h = ${formatearNumero(reserva.volumenReservaDiseno_m3, 'adimensional')} m³`,
    style: 'formula',
  })

  contenido.push({ text: 'Adopción de reserva', style: 'subseccionNivel' })
  contenido.push(...renderizarAdopcionDeReserva(adopcion))

  return contenido
}

function renderizarAdopcionDeReserva(adopcion: ResultadoAdopcionDeReservaDeInforme): Content[] {
  switch (adopcion.tipo) {
    case 'sinAdopcion':
      return [
        {
          text: `Volumen calculado: ${formatearNumero(adopcion.volumenRequerido_m3, 'adimensional')} m³. Volumen adoptado: todavía no declarado.`,
          style: 'metadatos',
        },
      ]
    case 'verificada':
      return [
        {
          text:
            `Volumen calculado: ${formatearNumero(adopcion.volumenRequerido_m3, 'adimensional')} m³. ` +
            `Volumen adoptado: ${formatearNumero(adopcion.volumenAdoptado_m3, 'adimensional')} m³.`,
          style: 'metadatos',
        },
        {
          text: `Conclusión: ${adopcion.estado === 'suficiente' ? 'SUFICIENTE' : 'INSUFICIENTE'} (diferencia ${formatearConSigno(adopcion.diferencia_m3, 'adimensional')} m³).`,
          style: adopcion.estado === 'suficiente' ? 'conforme' : 'noConforme',
        },
      ]
    case 'adopcionIncompleta':
      return [
        {
          text:
            `Volumen calculado: ${formatearNumero(adopcion.volumenRequerido_m3, 'adimensional')} m³. Falta declarar: ` +
            `${[adopcion.faltaTanqueBombeo ? 'tanque de bombeo/cisterna' : null, adopcion.faltaTanqueElevado ? 'tanque elevado' : null].filter((s) => s !== null).join(' y ')}.`,
          style: 'metadatos',
        },
      ]
    case 'verificadaDistribuida':
      return [
        {
          text:
            `Volumen calculado: ${formatearNumero(adopcion.volumenRequerido_m3, 'adimensional')} m³ (mínimo por tanque, §2.11.3: ` +
            `${formatearNumero(adopcion.minimoPorTanque_m3, 'adimensional')} m³).`,
          style: 'metadatos',
        },
        {
          text:
            `Adoptado -- tanque de bombeo/cisterna: ${formatearNumero(adopcion.volumenTanqueBombeoAdoptado_m3, 'adimensional')} m³ ` +
            `(${adopcion.tanqueBombeoCumpleMinimo ? 'cumple' : 'no cumple'} el mínimo); tanque elevado: ` +
            `${formatearNumero(adopcion.volumenTanqueElevadoAdoptado_m3, 'adimensional')} m³ (${adopcion.tanqueElevadoCumpleMinimo ? 'cumple' : 'no cumple'} el mínimo); ` +
            `total ${formatearNumero(adopcion.totalAdoptado_m3, 'adimensional')} m³.`,
          style: 'metadatos',
        },
        {
          text: `Conclusión: ${adopcion.estado === 'suficiente' ? 'SUFICIENTE' : 'INSUFICIENTE'}.`,
          style: adopcion.estado === 'suficiente' ? 'conforme' : 'noConforme',
        },
      ]
    case 'noAplica':
      return []
  }
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
      ...renderizarSeccionM3(datos),
      ...renderizarSeccionM4(datos),
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
