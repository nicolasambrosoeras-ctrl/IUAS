// Validación semántica de configuracionHidraulica: garantiza que el
// sistemaDeTuberiaId seleccionado exista en el catálogo y pertenezca al
// mismo materialTuberiaId configurado en el Proyecto -- sin esto,
// resolverDiametroComercialDeTramo podría intentar resolver un sistema
// inexistente o semánticamente incoherente (p.ej. material=cobre con un
// sistema de PPR). Resolución propia por .find() (no usa
// obtenerSistemaDeTuberia, que hace throw): un validador nunca lanza para
// un estado inválido de datos de usuario, solo reporta ProblemaValidacion.
import type { Proyecto } from '../../modelo/proyecto';
import type { SistemaDeTuberiaCatalogado } from '../../motor/tuberias/sistemaDeTuberia';
import { crearProblema, type ProblemaValidacion } from '../codigos';

export function validarConfiguracionHidraulica(
  proyecto: Proyecto,
  catalogoSistemasDeTuberia: readonly SistemaDeTuberiaCatalogado[],
): readonly ProblemaValidacion[] {
  const problemas: ProblemaValidacion[] = [];
  const { sistemaDeTuberiaId, materialTuberiaId } = proyecto.configuracionHidraulica;

  const sistema = catalogoSistemasDeTuberia.find((candidato) => candidato.id === sistemaDeTuberiaId);

  if (sistema === undefined) {
    problemas.push(
      crearProblema(
        'configuracionHidraulicaSistemaDeTuberiaIdInexistente',
        'configuracionHidraulica.sistemaDeTuberiaId',
        sistemaDeTuberiaId,
      ),
    );
    return problemas;
  }

  if (sistema.materialTuberiaId !== materialTuberiaId) {
    problemas.push(
      crearProblema(
        'configuracionHidraulicaSistemaMaterialIncompatible',
        'configuracionHidraulica.sistemaDeTuberiaId',
        sistemaDeTuberiaId,
        materialTuberiaId,
      ),
    );
  }

  return problemas;
}
