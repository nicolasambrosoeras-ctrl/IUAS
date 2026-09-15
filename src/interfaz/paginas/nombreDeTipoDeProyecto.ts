// BETA-UI-POLISH-01: subtítulo del header general. Antes decía "Proyecto
// de ejemplo — vivienda unifamiliar" con una condición puramente
// heurística (`unidadesFuncionales.length === 0`) que no identificaba al
// proyecto demo real -- un "Nuevo proyecto" con UFs agregadas, o un
// proyecto arbitrario recién importado, también caían en esa rama y
// mostraban una afirmación falsa.
//
// En vez de agregar un booleano `esDemo` persistido (o compararlo por
// referencia contra `proyectoInicial`, que se rompe apenas se edita un
// campo), se reutiliza `parametros.tipoDeProyecto`: un campo YA existente,
// siempre presente y editable por el usuario en "Datos del proyecto"
// (`coeficientesMayoracion`, la misma tabla normativa que alimenta el
// selector de Tipología). Es una fuente 100% confiable para cualquier
// proyecto -- demo, nuevo o importado -- porque describe el proyecto que
// hay en pantalla, no intenta adivinar su procedencia.
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import type { TipoDeProyecto } from '../../modelo/proyecto'

export function nombreDeTipoDeProyecto(tipoDeProyecto: TipoDeProyecto): string {
  return coeficientesMayoracion.find((entrada) => entrada.id === tipoDeProyecto)?.nombre ?? 'Instalaciones internas de agua'
}
