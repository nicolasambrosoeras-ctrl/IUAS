// Deteccion de "basura" filtrada a la UI (brief §13-F/G/H). Funciones
// PURAS sobre texto ya visible en pantalla, con guardas explicitas contra
// falsos positivos en contenido tecnico legitimo.
//
// Se prueban en Vitest (tokensProhibidos.test.ts). El harness Playwright
// les pasa `page.locator('#root').innerText()`.

export type HallazgoDeToken = {
  readonly clase: 'valor-roto' | 'id-interno' | 'codigo-validacion'
  readonly token: string
  readonly contexto: string
}

// Recorta una ventana de contexto alrededor de la primera aparicion.
function contextoDe(texto: string, indice: number, largo: number): string {
  const desde = Math.max(0, indice - 40)
  const hasta = Math.min(texto.length, indice + largo + 40)
  return texto.slice(desde, hasta).replace(/\s+/g, ' ').trim()
}

// A. Valores rotos: NaN / Infinity / undefined / null / [object Object].
// Guardas:
//  - "null" y "undefined" aparecen legitimamente en prosa tecnica muy rara
//    vez; aca solo se marcan como TOKEN AISLADO (delimitado por no-letras),
//    nunca como subcadena de otra palabra.
//  - se exige que el valor roto este pegado a un signo de asignacion,
//    unidad o borde de celda tipico ("= NaN", "NaN m", ": undefined"),
//    salvo "[object Object]" que ya es inequivoco.
const PATRONES_VALOR_ROTO: readonly { token: string; re: RegExp }[] = [
  { token: '[object Object]', re: /\[object (?:Object|Array|Error|Promise)\]/ },
  { token: 'NaN', re: /(?:^|[\s=:(>])NaN(?=[\s)<,;.]|$| ?(?:m|mm|L\/s|l\/s|m\/s|m³|mca|m\.c\.a\.|kg))/ },
  { token: 'Infinity', re: /(?:^|[\s=:(>])-?Infinity(?=[\s)<,;.]|$)/ },
  { token: 'undefined', re: /(?:^|[\s=:(>])undefined(?=[\s)<,;.]|$)/ },
  { token: 'null', re: /(?:^|[\s=:(>])null(?=[\s)<,;.]|$)/ },
]

export function buscarValoresRotos(texto: string): HallazgoDeToken[] {
  const hallazgos: HallazgoDeToken[] = []
  for (const { token, re } of PATRONES_VALOR_ROTO) {
    const m = re.exec(texto)
    if (m && m.index >= 0) {
      hallazgos.push({ clase: 'valor-roto', token, contexto: contextoDe(texto, m.index, m[0].length) })
    }
  }
  return hallazgos
}

// B. IDs internos: el patron real que genera `generarId('uf')` =
// `uf-<uuid v4>`; idem `local-<uuid>` y `artefacto-<uuid>`. El proyecto de
// ejemplo trae ids legibles (`local-bano`, `artefacto-1`) que NO son UUID
// y no deben marcarse. Solo se marca el prefijo + UUID completo.
// M2-TOPO-C sumó `montante-<uuid>` (identidad semántica) y los segmentos
// `nodo-montante-<uuid>` / `tramo-montante-<uuid>` del constructor: ninguno
// debe filtrarse a la UI.
const RE_ID_INTERNO =
  /\b(uf|local|artefacto|nodo|tramo|montante)-(?:montante-)?[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/i

export function buscarIdsInternos(texto: string): HallazgoDeToken[] {
  const m = RE_ID_INTERNO.exec(texto)
  if (!m) {
    return []
  }
  return [{ clase: 'id-interno', token: m[0], contexto: contextoDe(texto, m.index, m[0].length) }]
}

// C. Codigos internos de validacion / motor que nunca deberian ser copy de
// usuario: `configuracion...Invalido`, `redHidraulicaTramo...`,
// `proyecto...Ausente`, `catalogo...Inexistente`, etc. Son camelCase largos
// sin espacios. Se listan por prefijo real observado en el codigo.
const RE_CODIGO_VALIDACION =
  /\b(?:configuracion(?:Hidraulica|Medidores|Abastecimiento)?[A-Z][A-Za-z]{6,}|redHidraulica[A-Z][A-Za-z]{6,}|proyecto[A-Z][A-Za-z]{6,}(?:Ausente|Invalido|NoPositiva|Inexistente|Duplicado)|catalogo[A-Z][A-Za-z]{6,}Inexistente|parametros[A-Z][A-Za-z]{6,})\b/

export function buscarCodigosDeValidacion(texto: string): HallazgoDeToken[] {
  const m = RE_CODIGO_VALIDACION.exec(texto)
  if (!m) {
    return []
  }
  return [{ clase: 'codigo-validacion', token: m[0], contexto: contextoDe(texto, m.index, m[0].length) }]
}

export function buscarTokensProhibidos(texto: string): HallazgoDeToken[] {
  return [...buscarValoresRotos(texto), ...buscarIdsInternos(texto), ...buscarCodigosDeValidacion(texto)]
}
