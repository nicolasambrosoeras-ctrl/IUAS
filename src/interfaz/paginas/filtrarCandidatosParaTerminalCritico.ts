// Candidatos para el RANKING de terminal más desfavorable (D-δ.47, bug
// corregido): excluye 'terminalSinPresionMinima' -- es una limitación
// normativa PERMANENTE (D-δ.41), nunca "dato pendiente" como
// 'balanceIncompleto'. Antes de este fix, resolverTerminalMasDesfavorable
// (invocado desde PanelDePresionDeModulo2.tsx) recibía estos terminales
// igual que cualquier otro no-balanceCompleto, contaminando el terminal
// crítico con un falso "candidatoProvisional" (sugería que faltaba más
// información, cuando ese terminal nunca va a resolver por diseño).
// resolverEstadoModulo2 ya excluye estos casos de su propio ranking
// (terminalesFueraDeAlcance) -- esta función replica el mismo criterio
// para la UI. Se le pasan TODOS los demás candidatos (no solo los
// balanceCompleto): la distinción 'determinado' vs. 'candidatoProvisional'
// depende exclusivamente de que existan o no candidatos legítimamente
// pendientes -- prefiltrar por balanceCompleto forzaría siempre a
// 'determinado', perdiendo esa distinción (M2-B). La tarjeta del
// terminal sin Pmin sigue mostrándose igual (candidatos sin filtrar) --
// solo se excluye del ranking de criticidad.
//
// Extraída a su propio archivo (en vez de vivir en PanelDePresionDeModulo2.tsx)
// para que ese .tsx exporte únicamente el componente -- evita el lint
// react-refresh/only-export-components, mismo criterio que
// resolverInfoCotaDeTerminal.ts (D-δ.46).
import type { CandidatoTerminal } from '../../motor/tuberias/presion/resolverTerminalMasDesfavorable'

export function filtrarCandidatosParaTerminalCritico(
  candidatos: readonly CandidatoTerminal[],
): readonly CandidatoTerminal[] {
  return candidatos.filter((candidato) => candidato.resultado.tipo !== 'terminalSinPresionMinima')
}
