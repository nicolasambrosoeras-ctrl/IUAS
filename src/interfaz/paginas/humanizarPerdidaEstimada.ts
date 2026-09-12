import type { MotivoTramoSinPerdidaLocalizadaEstimada } from '../../motor/tuberias/presion/resolverPerdidaLocalizadaEstimadaDeCamino'

export function humanizarPerdidaEstimada(motivos: readonly MotivoTramoSinPerdidaLocalizadaEstimada[]): string {
  const textos: Record<MotivoTramoSinPerdidaLocalizadaEstimada, string> = {
    derivacionMultipleNoModelada: 'La disposición física de una derivación con más de dos salidas todavía no está modelada.',
    entradaLocalNoIdentificable: 'No se puede identificar una entrada común exclusiva para la llave de paso de este local y red.',
    caminoNoResoluble: 'No se puede determinar un recorrido único hasta la alimentación.',
    sinDemanda: 'Un tramo del recorrido no tiene demanda resoluble.',
    sinCandidatoAdmisible: 'Falta una velocidad comercial resoluble en un tramo del recorrido.',
  }
  return [...new Set(motivos)].map(motivo => textos[motivo]).join(' ')
}
