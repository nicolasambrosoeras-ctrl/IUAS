// M3-E (D-δ.58): qué pérdidas de medidores de M3 pertenecen al camino
// hidráulico de UN terminal concreto, dado el origen hidráulico.
//
// Frontera: M3 sabe de medidores y ya calculó su `hf` (adoptada); M2 sabe
// de caminos y balance. Esta función es el puente: consume el
// EstadoModulo3 + la identidad del terminal (UF + red) + el origen, y
// produce el escalar `hfMedidor` aplicable (o 'indeterminado'). M2 sigue
// recibiendo `number | undefined` -- no aprende nada de Tabla N°6,
// selección, override ni normativa de medidores.
//
// Reglas físicas (cerradas en handoffs previos, ver D-δ.38/D-δ.54/D-δ.58):
//
//  - Medidor GENERAL: pertenece al camino sólo con origen
//    'alimentacionDirecta' (red → medidor general → instalación →
//    terminal). Con 'tanqueElevado' el medidor general está aguas arriba
//    del almacenamiento -- NO pertenece al balance tanque → terminal.
//  - Medidor INDIVIDUAL: siempre pertenece al camino de los terminales de
//    su UF (en ambos orígenes), con esta salvedad crítica:
//      · ACS 'individual': la UF tiene un único medidor individual de
//        AGUA FRÍA de entrada, aguas arriba de la producción de ACS
//        interna. Su `hf` aplica a los terminales de agua fría Y de agua
//        caliente de esa UF.
//      · ACS 'central': medidor de agua fría → sólo terminales AF; medidor
//        de agua caliente → sólo terminales AC. Nunca ambos en un mismo
//        terminal.
//  - Aislamiento: el medidor de una UF nunca afecta a otra UF.
//
// 'determinadas' con `componentes: []` y `hfTotal_mca: 0` es un resultado
// VÁLIDO cuando se determinó físicamente que ningún medidor pertenece al
// camino (p. ej. tanque elevado + sin propiedad horizontal). Es distinto
// de 'indeterminado' (falta información necesaria): eso NUNCA se convierte
// en 0 -- el balance de M2 queda incompleto por `hfMedidor` faltante.
import type { ConfiguracionDeMedidores } from '../../modelo/proyecto'
import type { RedDeTramo } from '../../modelo/redHidraulica'
import type { ServicioMedido } from '../medidores/seleccionarMedidorIndividual'
import { tipoProvisionACSEfectivo } from './tipoProvisionACSEfectivo'
import type {
  EstadoModulo3,
  MedidorIndividualEvaluado,
  ResultadoMedidorGeneral,
} from './resolverEstadoModulo3'

export type OrigenHidraulicoDeMedidores = 'alimentacionDirecta' | 'tanqueElevado'

export type ComponentePerdidaDeMedidor = {
  readonly ambito: 'general' | 'individual'
  readonly hf_mca: number
  // Sólo en 'individual':
  readonly unidadFuncionalId?: string
  readonly servicioMedido?: ServicioMedido
  // true cuando este componente es el medidor de agua fría de una UF con
  // ACS individual y el terminal evaluado es de agua caliente (el agua
  // caliente atravesó ese medidor antes de calentarse).
  readonly aplicaPorProvisionACSIndividual?: boolean
}

export type PerdidaDeMedidorIndeterminada =
  | { readonly tipo: 'modulo3NoIniciado' }
  | { readonly tipo: 'modulo3ConError' }
  | { readonly tipo: 'medidorGeneralNoDisponible' }
  | {
      readonly tipo: 'medidorIndividualNoDisponible'
      readonly unidadFuncionalId: string
      readonly servicioMedido: ServicioMedido
    }

export type PerdidasDeMedidoresParaTerminal =
  | {
      readonly estado: 'determinadas'
      readonly componentes: readonly ComponentePerdidaDeMedidor[]
      readonly hfTotal_mca: number
    }
  | {
      readonly estado: 'indeterminado'
      readonly motivos: readonly PerdidaDeMedidorIndeterminada[]
    }

export type EntradaPerdidasDeMedidoresParaTerminal = {
  readonly estadoModulo3: EstadoModulo3
  readonly configuracionMedidores: ConfiguracionDeMedidores | undefined
  readonly unidadFuncionalIdDelTerminal: string
  readonly redDelTerminal: RedDeTramo
  readonly origenHidraulico: OrigenHidraulicoDeMedidores
}

function medidoresDisponibles(estadoModulo3: EstadoModulo3): {
  readonly general?: ResultadoMedidorGeneral
  readonly individuales: readonly MedidorIndividualEvaluado[]
} {
  if (estadoModulo3.estado === 'evaluado') {
    return { general: estadoModulo3.resultado.medidorGeneral, individuales: estadoModulo3.resultado.medidoresIndividuales }
  }
  if (estadoModulo3.estado === 'incompleto') {
    return {
      ...(estadoModulo3.parcial.medidorGeneral !== undefined ? { general: estadoModulo3.parcial.medidorGeneral } : {}),
      individuales: estadoModulo3.parcial.medidoresIndividuales,
    }
  }
  return { individuales: [] }
}

export function resolverPerdidasDeMedidoresParaTerminal(
  entrada: EntradaPerdidasDeMedidoresParaTerminal,
): PerdidasDeMedidoresParaTerminal {
  const { estadoModulo3, configuracionMedidores, unidadFuncionalIdDelTerminal, redDelTerminal, origenHidraulico } = entrada

  if (estadoModulo3.estado === 'noIniciado' || configuracionMedidores === undefined) {
    // Sin configuración no se sabe siquiera si hay propiedad horizontal:
    // no se puede afirmar que ningún medidor pertenezca al camino.
    return { estado: 'indeterminado', motivos: [{ tipo: 'modulo3NoIniciado' }] }
  }
  if (estadoModulo3.estado === 'error') {
    return { estado: 'indeterminado', motivos: [{ tipo: 'modulo3ConError' }] }
  }

  const disponibles = medidoresDisponibles(estadoModulo3)
  const componentes: ComponentePerdidaDeMedidor[] = []
  const motivosIndeterminado: PerdidaDeMedidorIndeterminada[] = []

  // --- medidor general ---
  if (origenHidraulico === 'alimentacionDirecta') {
    if (disponibles.general === undefined) {
      motivosIndeterminado.push({ tipo: 'medidorGeneralNoDisponible' })
    } else {
      componentes.push({ ambito: 'general', hf_mca: disponibles.general.adoptado.hfMedidor_mca })
    }
  }
  // origen 'tanqueElevado': el medidor general NO pertenece a este camino.
  // No es un componente ausente ni indeterminado -- físicamente no aplica.

  // --- medidor individual ---
  if (configuracionMedidores.esPropiedadHorizontal) {
    const acsEfectivo = tipoProvisionACSEfectivo(configuracionMedidores, unidadFuncionalIdDelTerminal)
    const servicioRequerido: ServicioMedido =
      acsEfectivo === 'individual' ? 'aguaFria' : redDelTerminal === 'AF' ? 'aguaFria' : 'aguaCaliente'

    const individual = disponibles.individuales.find(
      (medidor) =>
        medidor.resultado.unidadFuncionalId === unidadFuncionalIdDelTerminal &&
        medidor.resultado.servicioMedido === servicioRequerido,
    )

    if (individual === undefined) {
      motivosIndeterminado.push({
        tipo: 'medidorIndividualNoDisponible',
        unidadFuncionalId: unidadFuncionalIdDelTerminal,
        servicioMedido: servicioRequerido,
      })
    } else {
      componentes.push({
        ambito: 'individual',
        hf_mca: individual.resultado.adoptado.hfMedidor_mca,
        unidadFuncionalId: unidadFuncionalIdDelTerminal,
        servicioMedido: servicioRequerido,
        ...(acsEfectivo === 'individual' && redDelTerminal === 'AC'
          ? { aplicaPorProvisionACSIndividual: true }
          : {}),
      })
    }
  }

  if (motivosIndeterminado.length > 0) {
    return { estado: 'indeterminado', motivos: motivosIndeterminado }
  }

  // Suma sin redondeo (el redondeo es de presentación). `componentes` puede
  // ser [] -> hfTotal_mca = 0, y eso es una determinación física válida.
  const hfTotal_mca = componentes.reduce((total, componente) => total + componente.hf_mca, 0)
  return { estado: 'determinadas', componentes, hfTotal_mca }
}
