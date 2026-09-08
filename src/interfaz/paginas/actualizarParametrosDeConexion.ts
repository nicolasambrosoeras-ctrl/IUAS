// Actualización inmutable de los datos físicos de la conexión de agua
// (ParametrosProyecto.diametroNominalConexion_m / .desnivelConexion_m,
// M4-D2 / D-δ.65). Funciones puras (sin React): preservan el resto del
// Proyecto y de `parametros`. NO aplican clamp ni validación de rango
// (eso es de validarParametrosDeConexion / resolverEstadoModulo4: nunca se
// corrige el dato del usuario en silencio). NO fijan default alguno --
// `undefined` limpia el campo y la ausencia sigue siendo ausencia.
import type { Proyecto } from '../../modelo/proyecto'

function conParametro(
  proyecto: Proyecto,
  campo: 'diametroNominalConexion_m' | 'desnivelConexion_m',
  valor: number | undefined,
): Proyecto {
  if (valor === undefined) {
    if (proyecto.parametros[campo] === undefined) {
      return proyecto
    }
    const { [campo]: _descartado, ...resto } = proyecto.parametros
    void _descartado
    return { ...proyecto, parametros: resto }
  }
  return { ...proyecto, parametros: { ...proyecto.parametros, [campo]: valor } }
}

// Diámetro nominal de la conexión, en metros (p. ej. 0.019). No valida que
// sea un diámetro de Tabla N°1 ni el mínimo de conexión -- eso lo reporta
// validarParametrosDeConexion.
export function conDiametroNominalConexion(proyecto: Proyecto, diametroNominal_m: number | undefined): Proyecto {
  return conParametro(proyecto, 'diametroNominalConexion_m', diametroNominal_m)
}

// Desnivel FIRMADO del punto de alimentación de cálculo respecto de la
// acera, en metros: > 0 por encima, < 0 por debajo. No se restringe el
// signo.
export function conDesnivelConexion(proyecto: Proyecto, desnivel_m: number | undefined): Proyecto {
  return conParametro(proyecto, 'desnivelConexion_m', desnivel_m)
}
