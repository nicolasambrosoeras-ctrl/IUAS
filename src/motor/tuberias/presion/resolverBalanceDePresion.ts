// Motor puro de balance de presion (D-delta.32/D-delta.36): compone
// Pdisponible - desnivel - perdidas -> Presidual, y lo compara contra
// Pmin del artefacto terminal. Pdisponible llega como parametro
// explicito -- esta funcion NO decide de donde sale (tanque elevado,
// conexion directa, bombeo siguen deliberadamente sin modelar, ver
// D-delta.36). No conoce Proyecto, Tramo ni RedHidraulica: recibe los
// terminos ya resueltos por otras primitivas (calcularDiferenciaDeCota,
// calcularPerdidaCargaUnitariaHazenWilliams/Darcy, resolverPresionMinimaDeArtefacto).
//
// Barrera de completitud (mismo principio ya aplicado por S1/S2 en
// cobertura fisica): si falta un termino de perdida obligatorio segun
// ERAS-2023 SS2.12.1 (perdida localizada, CRIT-A26; perdida del medidor,
// CRIT-A25), esta funcion NUNCA los trata como 0: devuelve 'incompleto'
// en vez de fabricar un 'Presidual' que parezca una verificacion
// terminada sin serlo. hf_equipos (ACS) queda deliberadamente fuera de
// esta firma -- D-delta.15 sigue sin fórmula normativa, no se inventa
// una acá.
//
// hfLocalizada distingue TRES ejes que un simple `number | undefined` no
// puede distinguir (auditoria M2-C, D-delta.33; ampliado D-delta.40):
// "hay un valor calculado" no es lo mismo que "ese valor representa TODA
// la perdida localizada normativamente exigible para el camino bajo el
// modo DETALLADO (Tabla N°7 completa)", que a su vez no es lo mismo que
// "ese valor es el resultado COMPLETO de la metodologia ESTIMADA
// (D-delta.40) para este camino". Desde CRIT-A31 (tees), el subconjunto
// representable en modo detallado sobre RedHidraulica cubre TODA Tabla
// N°7 -- curvas/codos/valvulas/uniones/tubo saliente/reducciones
// (CRIT-A28/A30) y las 3 variantes de tee (CRIT-A31); griferia queda
// deliberadamente excluida del balance (CRIT-A29), no es parte de lo que
// falta. 'completa' tiene como productor a resolverPresionResidualDeCamino
// cuando acumularPerdidaLocalizadaDeCamino resuelve el camino sin ningun
// tramo pendiente (accesorios y tees, ambos relevados) bajo
// metodoPerdidaLocalizada='detallado'.
//
// 'estimada' (D-delta.40) NO es una version inferior de 'completa' ni un
// sinonimo de 'parcial': es el resultado COMPLETO de una metodologia
// DISTINTA y deliberadamente mas simple (el usuario no releva cada
// singularidad -- IUAS estima tees por Local+red, unica magnitud
// implementada hasta ahora). Por eso cuenta igual que 'completa' para
// cerrar el balance -- "estimado" no significa "parcial", significa "otro
// metodo, tambien completo dentro de si mismo". Productor:
// resolverPresionResidualDeCamino cuando
// proyecto.configuracionHidraulica.metodoPerdidaLocalizada==='estimado'.
// Los dos modos son ALTERNATIVOS: un mismo camino nunca combina
// 'completa' + 'estimada' (resolverPresionResidualDeCamino elige uno solo
// segun la configuracion del Proyecto, nunca ambos a la vez).
//
// 'parcial' queda como variante del tipo para composiciones futuras que
// calculen un valor util pero sigan sin cubrir todo el dominio de NINGUNA
// de las dos metodologias completas.
export type CoberturaDePerdidaLocalizada =
  | {
      readonly tipo: 'completa'
      readonly hf_mca: number
    }
  | {
      readonly tipo: 'estimada'
      readonly hf_mca: number
    }
  | {
      // Valor calculado (p.ej. solo el subconjunto CRIT-A28) pero que NO
      // cubre todavia la totalidad de Tabla N°7 para este camino -- util
      // como dato, pero nunca cuenta como termino "presente" a efectos
      // de completar el balance.
      readonly tipo: 'parcial'
      readonly hf_mca: number
    }
  | {
      readonly tipo: 'ausente'
    }

export type TerminosDePerdidaDeBalance = {
  readonly hfDistribuida_mca: number
  readonly hfLocalizada: CoberturaDePerdidaLocalizada
  // undefined = medidor todavia no modelado en RedHidraulica (D-delta.35);
  // nunca se interpreta como 0.
  readonly hfMedidor_mca: number | undefined
}

export type ResultadoBalanceDePresion =
  | {
      readonly tipo: 'incompleto'
      readonly terminosFaltantes: readonly ('hfLocalizada' | 'hfMedidor')[]
    }
  | {
      readonly tipo: 'completo'
      readonly presionResidual_mca: number
      readonly presionMinimaRequerida_mca: number
      readonly cumpleMinimo: boolean
    }

// Equivalencia kgf/cm² <-> m.c.a. (fluidoestatica, agua): 1 kgf/cm² =
// 10000 kgf/m², 1 m.c.a. = 1000 kgf/m² (agua, rho=1000 kg/m³) -> 1
// kgf/cm² = 10 m.c.a. EXACTO bajo esta convencion (no es la equivalencia
// metrica bar->m.c.a., que lleva un factor ~1,0197). Es la misma
// convencion que usa la propia ERAS-2023: su Tabla SS2.9.1.4 rotula la
// columna "Presión [kg/cm² = bar]", tratando ambas unidades como
// intercambiables -- confirma el uso practico de ingenieria (kgf), no
// la unidad SI "bar" estricta.
const MCA_POR_KGF_CM2 = 10

export function resolverBalanceDePresion(
  presionDisponible_mca: number,
  desnivel_m: number,
  terminos: TerminosDePerdidaDeBalance,
  presionMinimaRequerida_kgcm2: number,
): ResultadoBalanceDePresion {
  if (presionMinimaRequerida_kgcm2 <= 0) {
    throw new Error(
      `resolverBalanceDePresion: presionMinimaRequerida_kgcm2 debe ser mayor a 0 (recibido: ${presionMinimaRequerida_kgcm2})`,
    )
  }
  if (terminos.hfDistribuida_mca < 0) {
    throw new Error(
      `resolverBalanceDePresion: hfDistribuida_mca no puede ser negativa (recibido: ${terminos.hfDistribuida_mca})`,
    )
  }

  const terminosFaltantes: ('hfLocalizada' | 'hfMedidor')[] = []
  // 'completa' (detallado) y 'estimada' (D-delta.40) cuentan igual como
  // termino "presente" -- dos metodologias alternativas, cada una
  // completa dentro de si misma (ver comentario de
  // CoberturaDePerdidaLocalizada). 'parcial' y 'ausente' cuentan como
  // faltante a proposito: un valor util pero que no cubre ninguna de las
  // dos metodologias completas nunca alcanza para completar el balance.
  if (terminos.hfLocalizada.tipo !== 'completa' && terminos.hfLocalizada.tipo !== 'estimada') {
    terminosFaltantes.push('hfLocalizada')
  }
  if (terminos.hfMedidor_mca === undefined) {
    terminosFaltantes.push('hfMedidor')
  }

  if (terminosFaltantes.length > 0) {
    return { tipo: 'incompleto', terminosFaltantes }
  }

  // Angostamiento de tipos: el chequeo de arriba ya garantiza
  // hfLocalizada.tipo==='completa'|'estimada' y hfMedidor_mca es number
  // en este punto, pero TypeScript no lo infiere solo desde el array de
  // faltantes.
  const hfLocalizada_mca = (terminos.hfLocalizada as { tipo: 'completa' | 'estimada'; hf_mca: number }).hf_mca
  const hfMedidor_mca = terminos.hfMedidor_mca as number

  // Δz>0 (ascenso) consume carga; Δz<0 (descenso) la aporta -- signo ya
  // conservado por calcularDiferenciaDeCota, se resta directamente sin
  // Math.abs().
  const presionResidual_mca =
    presionDisponible_mca - desnivel_m - terminos.hfDistribuida_mca - hfLocalizada_mca - hfMedidor_mca

  const presionMinimaRequerida_mca = presionMinimaRequerida_kgcm2 * MCA_POR_KGF_CM2

  return {
    tipo: 'completo',
    presionResidual_mca,
    presionMinimaRequerida_mca,
    cumpleMinimo: presionResidual_mca >= presionMinimaRequerida_mca,
  }
}
