// Validación semántica de los datos físicos de la conexión de agua
// (ParametrosProyecto.diametroNominalConexion_m / .desnivelConexion_m,
// M4-D2 / D-δ.65). Ambos son optativos: su AUSENCIA no es un problema de
// validación (Módulo 4 quedará 'incompleto' cuando los necesite). Lo que
// se valida es que, si están PRESENTES, sean datos físicos coherentes:
//
//  - `diametroNominalConexion_m`: debe ser uno de los diámetros de Tabla
//    N°1 y >= 0,019 m (CRIT-A36). La fila DN13 sirve al resolver genérico
//    de la tabla pero NO es admisible como conexión persistida.
//  - `desnivelConexion_m`: número finito. Es un desnivel FIRMADO -> no se
//    restringe a >= 0 (una cisterna en sótano tiene desnivel negativo).
//
// `presionSobreAcera_m` NO se valida acá: su rango [4, 35] m pertenece a
// la PRESIÓN DE CÁLCULO de Tabla N°1, no a la presión de acera (que puede
// estar fuera de ese rango -- el demo del repo usa 2 m). Una presión de
// cálculo fuera de tabla se resuelve como 'incompleto' en
// resolverEstadoModulo4, nunca como proyecto inválido.
import type { Proyecto } from '../../modelo/proyecto';
import { esDiametroAdmisibleComoConexion } from '../../normativa/eras-2023/tabla-01-gastos-conexion';
import { crearProblema, type ProblemaValidacion } from '../codigos';

export function validarParametrosDeConexion(proyecto: Proyecto): readonly ProblemaValidacion[] {
  const problemas: ProblemaValidacion[] = [];
  const { diametroNominalConexion_m, desnivelConexion_m } = proyecto.parametros;

  if (diametroNominalConexion_m !== undefined && !esDiametroAdmisibleComoConexion(diametroNominalConexion_m)) {
    problemas.push(
      crearProblema(
        'parametrosDiametroNominalConexionNoAdmisible',
        'parametros.diametroNominalConexion_m',
        diametroNominalConexion_m,
      ),
    );
  }

  if (desnivelConexion_m !== undefined && !Number.isFinite(desnivelConexion_m)) {
    problemas.push(
      crearProblema('parametrosDesnivelConexionNoFinito', 'parametros.desnivelConexion_m', desnivelConexion_m),
    );
  }

  return problemas;
}
