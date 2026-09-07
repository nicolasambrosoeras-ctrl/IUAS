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
  // Nivel/planta de la UF (D-δ.46): convención IUAS, PB=0, Piso 1=1,
  // Piso 2=2... Representación numérica para no limitar la cantidad de
  // pisos con una unión cerrada. Opcional: proyectos existentes o UFs
  // todavía sin clasificar no tienen nivel -- ausencia nunca equivale a
  // PB (0), es "sin clasificar todavía". Ver
  // interfaz/paginas/nivelUnidadFuncional.ts (nombreDeNivel,
  // calcularCotaHidraulicaDefaultDeNivel).
  nivel?: number;
  // Cota hidráulica de referencia de la UF, en metros respecto del datum
  // del Proyecto (misma convención que Nodo.cota_m). Bajo
  // GranularidadHidraulica='simplificada' (D-δ.46), esta es la ÚNICA
  // cota que participa del cálculo de presión para TODOS los terminales
  // AF/AC de esta UF -- reemplaza la cota individual por Artefacto que
  // 'profesional' sigue exigiendo (ver
  // motor/tuberias/geometria/resolverCotaTerminalEfectiva.ts). Ausente
  // != 0 (CRIT-A20, mismo criterio que Nodo.cota_m): dato físico no
  // provisto todavía, nunca se asume 0. Se propone automáticamente al
  // asignar/cambiar `nivel`, pero el usuario puede editarla libremente
  // -- el valor guardado acá es el que efectivamente participa del
  // cálculo, nunca la fórmula del default recalculada en cada uso. Esta
  // es una aproximación deliberada del modo rápido (no redefine CRIT-A29:
  // el punto físico de verificación de presión sigue siendo la conexión
  // del Artefacto -- simplificada solo deja de exigir conocer su altura
  // exacta, adoptando una cota representativa común a toda la UF).
  cotaHidraulicaReferencia_m?: number;
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

// Granularidad de relevamiento físico de Módulo 2 (D-δ.44, corrección de
// granularidad de D-δ.43): selección única y global del Proyecto,
// ORTOGONAL a MetodoPerdidaLocalizada -- responden preguntas distintas.
// MetodoPerdidaLocalizada decide CÓMO se calcula la pérdida localizada
// (relevamiento real de accesorios/tees vs. una fórmula agregada
// estimada, D-δ.40); GranularidadHidraulica decide QUÉ Tramos físicos
// del camino participan de la acumulación de pérdida (distribuida Y
// localizada) -- nunca cambia la regla hf=Σ J·L en sí misma, solo el
// conjunto de Tramos que la componen. Las 4 combinaciones son coherentes
// y ninguna está prohibida (ver PENDIENTES-DE-ARQUITECTURA.md D-δ.44).
//
// 'profesional': comportamiento ya existente sin cambios -- cada Tramo
// físico real del camino (incluidos los ramales internos hacia cada
// Artefacto) requiere su propia longitud_m/accesorios; permite modelar
// recorridos internos distintos hasta cada Artefacto de un mismo Local.
//
// 'simplificada': la unidad de relevamiento físico es el (Local, Red)
// -- una única longitud_m/lista de accesorios sobre el Tramo
// representativo de cada (Local, Red) (ver
// motor/tuberias/topologia/identificarTramoRepresentativoDeLocal.ts).
// Los Tramos más profundos de ese mismo Local (ramales hacia cada
// Artefacto, incluidos los que salen de una tee anidada) NO requieren
// longitud/accesorios propios -- contribuyen 0 a hfDistribuida/
// hfLocalizada por definición del modelo simplificado, nunca "dato
// faltante". La tee (CRIT-A31) se sigue configurando y su Ks sigue
// aportando por rama real (usa la velocidad propia de esa rama) en
// ambas granularidades -- lo que cambia es solo si, además del Ks de la
// tee, esa rama exige tener sus PROPIOS accesorios en línea relevados.
export type GranularidadHidraulica = 'simplificada' | 'profesional';

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
  // Obligatoria, mismo criterio que metodoPerdidaLocalizada: ver
  // GranularidadHidraulica más arriba.
  granularidadHidraulica: GranularidadHidraulica;
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

// Provisión de agua caliente sanitaria de una unidad funcional (D-δ.54):
// 'individual' = la producción de ACS ocurre dentro de la UF, aguas abajo
// del suministro de AF medido (el medidor de entrada ve todo el caudal);
// 'central' = AF y AC llegan a la UF por ramales comunes distintos, cada
// uno con su medidor. Es una configuración física DECLARADA -- no se
// infiere de la posición de produccionACS en RedHidraulica (D-δ.54).
export type TipoProvisionACS = 'individual' | 'central';

// Configuración persistida de Módulo 3 (Medidores), D-δ.55. Guarda
// únicamente decisiones físicas del usuario -- nunca resultados
// derivados (alcances, Qunit, DN, C, hf, EstadoModulo3: todo eso se
// recalcula). Ausente = Módulo 3 todavía no iniciado (EstadoModulo3
// 'noIniciado'); NO es un default. `esPropiedadHorizontal: false` es una
// decisión válida y explícita del usuario, NO equivale a ausencia.
export type ConfiguracionDeMedidores = {
  // §2.6: sólo con propiedad horizontal / más de un propietario hay
  // obligación de medición individual por unidad.
  readonly esPropiedadHorizontal: boolean;
  // Provisión de ACS por defecto del Proyecto -- la mayoría de los
  // proyectos es homogénea.
  readonly tipoProvisionACS: TipoProvisionACS;
  // Override opcional por unidad funcional, para proyectos mixtos.
  // Ausencia de entrada para una UF = usar el default del Proyecto.
  readonly tipoProvisionACSPorUnidadFuncional?: Readonly<Record<string, TipoProvisionACS>>;
  // M3-D parte 2 (D-δ.57): diámetro nominal (mm) de la fila de Tabla N°6
  // adoptado manualmente para el medidor GENERAL, sobrescribiendo el DN
  // recomendado automáticamente. Ausente = usar el recomendado (control
  // "Auto"). Sólo se persiste esta decisión -- C, hf y Q se recalculan
  // (el DN adoptado es hidráulicamente efectivo, análogo a
  // Tramo.dnComercialAdoptado de D-δ.52). Un DN que no exista en Tabla N°6
  // se ignora (se vuelve a automático), nunca hace fallar el cálculo.
  readonly medidorGeneralAdoptadoDN?: number;
  // Ídem por alcance de medidor individual. Clave:
  // `${unidadFuncionalId}|${servicioMedido}` (ver claveDeAlcanceDeMedidor).
  // Entradas cuyo alcance ya no existe (p. ej. tras cambiar ACS
  // central↔individual) se ignoran al resolver -- no afectan ningún otro
  // medidor.
  readonly medidoresIndividualesAdoptadosDN?: Readonly<Record<string, number>>;
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
  // Ausente = Módulo 3 no iniciado (D-δ.55). Optativo a propósito: un
  // Proyecto creado antes de que M3 existiera sigue siendo válido y
  // resuelve EstadoModulo3 'noIniciado' sin migración destructiva.
  configuracionMedidores?: ConfiguracionDeMedidores;
};
