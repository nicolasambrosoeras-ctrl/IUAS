// Validación semántica de configuracionAbastecimiento (D-δ.63): lo que
// TypeScript no garantiza sobre datos persistidos es que `esquema` sea uno
// de los valores soportados y que `periodoConsumoMaximo_h`, si está
// presente, sea un número finito dentro de la ventana normativa [1, 4] h
// (ERAS §2.10.2 / CRIT-A35). Un valor fuera de rango es corrupción
// estructural del dato persistido -- se reporta como error, nunca se
// aplica clamp ni se corrige en silencio.
//
// El chequeo de `periodoConsumoMaximo_h` es independiente del esquema: si
// el campo existe, debe ser válido. Un esquema 'directa' con un
// `periodoConsumoMaximo_h` VÁLIDO simplemente no lo usa (resolverEstadoModulo4
// lo ignora); un esquema 'directa' con un `periodoConsumoMaximo_h`
// estructuralmente inválido sí es un error -- el dato persistido está roto.
//
// Ausencia de `configuracionAbastecimiento` NO es un problema de
// validación: es el estado 'noIniciado' de Módulo 4 (ver
// resolverEstadoModulo4).
import { ESQUEMAS_DE_ABASTECIMIENTO, type Proyecto } from '../../modelo/proyecto';
import { crearProblema, type ProblemaValidacion } from '../codigos';

const PERIODO_CONSUMO_MAXIMO_H = { min: 1, max: 4 } as const;

export function validarConfiguracionAbastecimiento(proyecto: Proyecto): readonly ProblemaValidacion[] {
  const { configuracionAbastecimiento } = proyecto;
  if (configuracionAbastecimiento === undefined) {
    return [];
  }

  const problemas: ProblemaValidacion[] = [];
  const { esquema, periodoConsumoMaximo_h } = configuracionAbastecimiento;

  if (!(ESQUEMAS_DE_ABASTECIMIENTO as readonly string[]).includes(esquema)) {
    problemas.push(
      crearProblema('configuracionAbastecimientoEsquemaInvalido', 'configuracionAbastecimiento.esquema', esquema),
    );
  }

  if (periodoConsumoMaximo_h !== undefined) {
    if (
      !Number.isFinite(periodoConsumoMaximo_h) ||
      periodoConsumoMaximo_h < PERIODO_CONSUMO_MAXIMO_H.min ||
      periodoConsumoMaximo_h > PERIODO_CONSUMO_MAXIMO_H.max
    ) {
      problemas.push(
        crearProblema(
          'configuracionAbastecimientoPeriodoConsumoMaximoInvalido',
          'configuracionAbastecimiento.periodoConsumoMaximo_h',
          periodoConsumoMaximo_h,
          PERIODO_CONSUMO_MAXIMO_H,
        ),
      );
    }
  }

  return problemas;
}
