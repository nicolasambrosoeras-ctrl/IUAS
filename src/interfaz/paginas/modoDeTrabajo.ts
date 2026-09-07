// D-δ.51: "Modo de trabajo" de Módulo 2 -- concepto de PRODUCTO, NO una
// entidad nueva del dominio. Se DERIVA de dos ejes ortogonales que ya
// existen en ConfiguracionHidraulica (granularidad + metodoPerdidaLocalizada);
// no se persiste ningún campo nuevo, no hay migración de esquema.
//
//   RÁPIDO       -- simplificada + estimadas: IUAS asume por el usuario
//                   (longitudes típicas, pérdidas localizadas estimadas
//                   D-δ.45, longitud vertical automática D-δ.50).
//   PROFESIONAL  -- profesional + detalladas: el proyectista declara la
//                   geometría física real (longitudes por Tramo, accesorios
//                   relevados, tees CRIT-A31, sin +3 m/piso automático).
//   AVANZADO     -- cualquier otra combinación de los ejes (p. ej.
//                   simplificada + detalladas): combinación técnica menos
//                   habitual, sigue soportada por el motor (D-δ.47), se
//                   controla desde "Configuración avanzada".
//
// Aplicar un modo NO resetea datos (brief §17): solo fija los dos ejes que
// definen el modo y precarga longitudes todavía `undefined`
// (backfillLongitudesDePredimensionamiento). Longitudes ya cargadas,
// accesorios y tees relevados se conservan; al volver a Rápido las
// pérdidas detalladas simplemente dejan de participar del cálculo activo
// (D-δ.40), sin contaminación ni doble conteo.
import type { ConfiguracionHidraulica, Proyecto } from '../../modelo/proyecto'
import { catalogoSistemasDeTuberia } from '../../motor/tuberias/sistemaDeTuberia'
import {
  conGranularidadHidraulica,
  conMetodoPerdidaDistribuida,
  conMetodoPerdidaLocalizada,
} from './actualizarConfiguracionHidraulica'
import { backfillLongitudesDePredimensionamiento } from './backfillLongitudesDePredimensionamiento'

export type ModoDeTrabajo = 'rapido' | 'profesional' | 'avanzado'

export function resolverModoDeTrabajo(configuracion: ConfiguracionHidraulica): ModoDeTrabajo {
  const { granularidadHidraulica, metodoPerdidaLocalizada } = configuracion
  if (granularidadHidraulica === 'simplificada' && metodoPerdidaLocalizada === 'estimado') {
    return 'rapido'
  }
  if (granularidadHidraulica === 'profesional' && metodoPerdidaLocalizada === 'detallado') {
    return 'profesional'
  }
  return 'avanzado'
}

export const ETIQUETA_MODO_DE_TRABAJO: Readonly<Record<ModoDeTrabajo, string>> = {
  rapido: 'Rápido',
  profesional: 'Profesional',
  avanzado: 'Avanzado',
}

// Sistema PPR por defecto: el catálogo comercial tiene hoy un único
// sistema (Acqua System Magnum PN20, PPR). Se resuelve por material, no
// por id literal, para no romper si el catálogo crece.
function sistemaPprPorDefecto(): string | undefined {
  return catalogoSistemasDeTuberia.find((sistema) => sistema.materialTuberiaId === 'ppr')?.id
}

// Rápido: fija los ejes del modo + Hazen-Williams ("cálculo habitual").
// Material/sistema se dejan como estén salvo que no haya ninguno PPR
// coherente todavía (proyecto viejo). No toca longitudes ya cargadas.
export function aplicarModoRapido(proyecto: Proyecto): Proyecto {
  let resultado = conGranularidadHidraulica(proyecto, 'simplificada')
  resultado = conMetodoPerdidaLocalizada(resultado, 'estimado')
  resultado = conMetodoPerdidaDistribuida(resultado, 'hazenWilliams')
  return backfillLongitudesDePredimensionamiento(resultado)
}

// Profesional: fija los ejes del modo. NO fuerza Hazen (un proyectista que
// venía trabajando con Darcy lo conserva, brief §41); NO precarga
// accesorios (decisión roja D-δ.51 -> alternativa A). Sí precarga
// longitudes `undefined` (todas las que el motor profesional itera).
export function aplicarModoProfesional(proyecto: Proyecto): Proyecto {
  let resultado = conGranularidadHidraulica(proyecto, 'profesional')
  resultado = conMetodoPerdidaLocalizada(resultado, 'detallado')
  return backfillLongitudesDePredimensionamiento(resultado)
}

// Se exporta para el punto de creación del proyecto (proyectoInicial) y
// para tests: qué sistema PPR adoptar si hiciera falta.
export { sistemaPprPorDefecto }
