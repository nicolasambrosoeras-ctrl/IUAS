// Modelo de proyecto: lo que el usuario declara y referencia del catálogo.
// Esta capa no calcula; solo define la estructura del dominio persistible.

export const SCHEMA_VERSION_ACTUAL = '1.0.0' as const;

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
  coeficienteA: 1 | 2 | 3 | 4;
  presionSobreAcera_m: number;
  alturaArtefactoMasDesfavorable_m: number;
  material: string;
};

export type MetadatosProyecto = {
  nombre: string;
  obra: string;
  comitente: string;
  fecha: string;
  schemaVersion: typeof SCHEMA_VERSION_ACTUAL;
  versionNormativa: string;
};

export type Proyecto = {
  metadatos: MetadatosProyecto;
  parametros: ParametrosProyecto;
  unidadesFuncionales: readonly UnidadFuncional[];
};
