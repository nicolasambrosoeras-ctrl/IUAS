// Modelo de proyecto: lo que el usuario declara y referencia del catálogo.
// Esta capa no calcula; solo define la estructura del dominio persistible.

import type { RedHidraulica } from '../redHidraulica';

export const SCHEMA_VERSION_ACTUAL = '1.0.0' as const;

export type TipoDeProyecto =
  | 'oficinaPrivada'
  | 'viviendaIndividual'
  | 'viviendaMultifamiliar'
  | 'oficinaPublica'
  | 'centroEducativo'
  | 'edificioPublico'
  | 'aeropuerto'
  | 'centroDeSalud'
  | 'centroDeDetencion'
  | 'centroDeportivo'
  | 'centroComercial'
  | 'terminalDePasajeros';

export type RegimenLocal = 'domiciliario' | 'noDomiciliario';

export type TipoDeLocal =
  | 'bano'
  | 'toilette'
  | 'cocina'
  | 'lavadero'
  | 'cochera'
  | 'jardin'
  | 'otros';

export type Artefacto = {
  id: string;
  artefactoId: string;
  cantidad: number;
  origen: 'normativo' | 'usuario';
};

export type Local = {
  id: string;
  tipo: TipoDeLocal;
  regimen?: RegimenLocal;
  artefactos: readonly Artefacto[];
};

export type UnidadFuncional = {
  id: string;
  nombre: string;
  locales: readonly Local[];
};

export type ParametrosProyecto = {
  tipoDeProyecto: TipoDeProyecto;
  presionSobreAcera_m: number;
  alturaArtefactoMasDesfavorable_m: number;
};

export type MetadatosProyecto = {
  nombre: string;
  obra: string;
  comitente: string;
  fecha: string;
  schemaVersion: typeof SCHEMA_VERSION_ACTUAL;
  versionNormativa: string;
};

// Método de cálculo de pérdida de carga distribuida (CRIT-A17/CRIT-A18):
// selección única y global del Proyecto, no por Tramo.
export type MetodoPerdidaDistribuida = 'hazenWilliams' | 'darcyWeisbach';

// Metodología de pérdida de carga localizada (D-δ.40): selección única y
// global del Proyecto, no por Tramo/Local/red -- mismo patrón que
// MetodoPerdidaDistribuida. Los dos modos son ALTERNATIVOS, nunca
// aditivos: nunca deben sumarse pérdidas 'detallado' + 'estimado' para
// las mismas singularidades.
// 'detallado': el usuario declara cada accesorio (Tramo.accesorios) y
// cada tee (Nodo.tee) -- comportamiento ya existente, sin cambios
// (CRIT-A26/A28/A30/A31, D-δ.33).
// 'estimado': el usuario no releva singularidades físicas -- IUAS estima
// únicamente las tees por Local+red (D-δ.40); el resto de Tabla N°7 no
// se estima (sin base normativa/topológica para inferir cantidades de
// codos/llaves/etc.).
export type MetodoPerdidaLocalizada = 'detallado' | 'estimado';

// Material de tubería: selección única y global del Proyecto, no por Tramo.
// Solo el ID vive en modelo -- las propiedades hidráulicas (C, epsilon) y
// sus fuentes viven en el catálogo (motor/tuberias/materialTuberia), que
// importa este tipo; modelo no conoce el catálogo.
export type MaterialTuberiaId =
  | 'ppr'
  | 'pvc'
  | 'pead'
  | 'cobre'
  | 'aceroGalvanizado'
  | 'aceroCarbono';

export type ConfiguracionHidraulica = {
  metodoPerdidaDistribuida: MetodoPerdidaDistribuida;
  // Obligatorio, mismo criterio que metodoPerdidaDistribuida: una vez que
  // el concepto de metodología de pérdida localizada existe en el
  // modelo, no hay estado intermedio válido de "Proyecto sin
  // metodología todavía".
  metodoPerdidaLocalizada: MetodoPerdidaLocalizada;
  materialTuberiaId: MaterialTuberiaId;
  // Sistema comercial real adoptado (id contra catalogoSistemasDeTuberia,
  // motor/tuberias/sistemaDeTuberia) -- distinto de materialTuberiaId
  // (propiedad hidráulica del material, C/epsilon). Obligatorio: sin esto
  // resolverDiametroComercialDeTramo no puede resolver Di comercial
  // adoptado, así que un Proyecto válido siempre debe declararlo. No es
  // una unión cerrada (a diferencia de MaterialTuberiaId): el catálogo de
  // sistemas está pensado para crecer (más series/fabricantes) sin volver
  // a tocar este tipo.
  sistemaDeTuberiaId: string;
};

export type Proyecto = {
  metadatos: MetadatosProyecto;
  parametros: ParametrosProyecto;
  unidadesFuncionales: readonly UnidadFuncional[];
  // Ausente = proyecto sin red topológica modelada todavía (D-δ).
  redHidraulica?: RedHidraulica;
  // Obligatoria: a diferencia de redHidraulica, el método de pérdida
  // distribuida es una configuración que el Proyecto siempre debe declarar
  // explícitamente una vez que este concepto existe en el modelo -- no hay
  // un estado intermedio válido de "Proyecto sin método todavía".
  configuracionHidraulica: ConfiguracionHidraulica;
};
