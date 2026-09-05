// Decisión pura de qué cota usar/mostrar para un terminal, según
// GranularidadHidraulica (D-δ.46) -- separada de TarjetaDeTerminal.tsx
// (que solo la consume) para que ese archivo exporte únicamente el
// componente (evita el lint react-refresh/only-export-components de
// mezclar un componente con lógica no-componente en el mismo .tsx).
import type { Proyecto } from '../../modelo/proyecto'
import type { Nodo, ReferenciaDeArtefacto } from '../../modelo/redHidraulica'
import { conCotaDeNodo } from './actualizarRedHidraulica'

// Discriminada por GranularidadHidraulica: 'individual' es el contrato
// previo sin cambios (profesional -- Nodo.cota_m editable en la
// tarjeta). 'deUF' es de solo lectura: el valor viene de
// UnidadFuncional.cotaHidraulicaReferencia_m (simplificada), que se
// edita en "Datos del proyecto", nunca en el panel de presión --
// mostrarlo editable ahí sugeriría falsamente que hay una cota propia
// de este terminal participando del cálculo.
export type InfoCotaDeTerminal =
  | { readonly tipo: 'individual'; readonly cota_m: number | undefined; readonly onCambiarCota: (cota_m: number | undefined) => void }
  | { readonly tipo: 'deUF'; readonly nombreUF: string; readonly cota_m: number | undefined }

// Espejo de la excepción documentada en resolverPresionResidualDeCamino.ts
// (D-δ.46): un terminal que ADEMÁS es la raíz del camino (sin ningún
// tramo entrante) conserva su cota individual en ambas granularidades --
// funciona como punto de alimentación, no como "conexión de Artefacto
// dentro de una UF". Fuera de ese caso degenerado, 'simplificada' usa la
// cota de la UF (solo lectura en la tarjeta, se edita en "Datos del
// proyecto").
export function resolverInfoCotaDeTerminal(
  proyecto: Proyecto,
  nodoId: string,
  nodoDelTerminal: (Nodo & { referencia: ReferenciaDeArtefacto }) | undefined,
  esRaizDelCamino: boolean,
  onCambiar: (proyecto: Proyecto) => void,
): InfoCotaDeTerminal {
  if (
    nodoDelTerminal !== undefined &&
    !esRaizDelCamino &&
    proyecto.configuracionHidraulica.granularidadHidraulica === 'simplificada'
  ) {
    const unidadFuncional = proyecto.unidadesFuncionales.find(
      (uf) => uf.id === nodoDelTerminal.referencia.unidadFuncionalId,
    )
    return {
      tipo: 'deUF',
      nombreUF: unidadFuncional?.nombre ?? nodoDelTerminal.referencia.unidadFuncionalId,
      cota_m: unidadFuncional?.cotaHidraulicaReferencia_m,
    }
  }

  return {
    tipo: 'individual',
    cota_m: nodoDelTerminal?.cota_m,
    onCambiarCota: (cota_m) => onCambiar(conCotaDeNodo(proyecto, nodoId, cota_m)),
  }
}
