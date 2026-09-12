// Modelo de proyecto: lo que el usuario declara y referencia del catálogo.
// Esta capa no calcula; solo define la estructura del dominio persistible.

import type { ConectividadFisica, RedDeTramo, RedHidraulica } from '../redHidraulica';

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
  // CAT-CONN-01 (D-δ.84): conectividad física elegida EXPLÍCITAMENTE para
  // esta instancia. Ausente = usar la política de conectividad del catálogo
  // (normativa/eras-2023/catalogo-artefactos/politicaConectividad). Presente
  // = decisión de instalación real de este artefacto concreto, tomada por
  // el usuario (selector obligatorio de los tipos `requiereSeleccion`, o
  // personalización de un tipo `defaultConfigurable`). NUNCA se infiere de
  // `quFria`/`quCaliente`, del label, ni de precedentes de otros artefactos
  // del proyecto. La topología de `Proyecto.redHidraulica` sigue siendo la
  // fuente EFECTIVA que consume Módulo 2 (CRIT-A15); este campo sólo fija
  // qué terminales se crean/reconcilian. Backward-compatible: un Proyecto
  // guardado antes de CAT-CONN-01 no lo tiene y resuelve por política de
  // catálogo, sin migración (SCHEMA_VERSION_ACTUAL no cambia).
  conectividadElegida?: ConectividadFisica;
  // GEOM-UX-01 (D-δ.86): "Altura hidráulica de referencia sobre piso
  // terminado del Local", en metros -- el punto hidráulico representativo
  // de este artefacto sobre el piso efectivo de su Local. NO es la altura
  // del borde del artefacto, ni la del caño embutido, ni una cota
  // absoluta. Es un OVERRIDE explícito del proyectista:
  //   presente  -> se usa este valor;
  //   ausente   -> se deriva de la altura hidráulica de referencia IUAS
  //                del tipo (normativa/eras-2023/catalogo-artefactos/
  //                alturasHidraulicasIuas, tabla NO normativa, siempre
  //                editable). El default NUNCA se materializa como override.
  // La cota hidráulica efectiva del terminal = cota de piso efectiva del
  // Local + esta altura efectiva (ver
  // motor/tuberias/geometria/resolverCotaHidraulicaDeArtefacto). Al
  // cambiar el tipo de catálogo del artefacto este override se LIMPIA
  // (§7): una ducha personalizada a 2,20 m no debe convertirse en un
  // bidet de 2,20 m por accidente. Backward-compatible sin migración.
  alturaHidraulicaSobrePiso_m?: number;
};

export type Local = {
  id: string;
  tipo: TipoDeLocal;
  regimen?: RegimenLocal;
  // GEOM-UX-01 (D-δ.86): cota de piso terminado del Local respecto del
  // datum del Proyecto, en metros. Es un OVERRIDE explícito:
  //   presente  -> el Local dejó de seguir a la UF y usa esta cota propia;
  //   ausente   -> hereda la cota de piso de la UnidadFuncional
  //                (UnidadFuncional.cotaHidraulicaReferencia_m).
  // "Restablecer" el Local = borrar este campo y volver a heredar. El
  // default heredado NUNCA se materializa como override (§4: guardar sólo
  // overrides explícitos y derivar lo demás). Ver
  // motor/tuberias/geometria/resolverCotaHidraulicaDeArtefacto
  // (resolverCotaPisoDeLocal). Backward-compatible sin migración.
  cotaPiso_m?: number;
  artefactos: readonly Artefacto[];
};

// UI-M1-MULTINIVEL-01: un nivel físico dentro de una Unidad Funcional (PB,
// PA, Piso 11, Piso 12, entrepiso, subsuelo...). Antes de este slice estos
// campos vivían directamente en `UnidadFuncional` (una UF = un único plano
// físico); ahora una UF puede tener 1..N niveles, cada uno con su propia
// identidad, etiqueta, cota y Locales. Los Locales SIEMPRE pertenecen a
// exactamente un Nivel (nunca directamente a la UF) -- evita el estado
// imposible de un Local "huérfano" sin nivel: borrar un Nivel borra sus
// Locales con él, no requiere reconciliación de una referencia suelta.
export type Nivel = {
  id: string;
  // Nombre humano del nivel físico ("Planta Baja", "Piso 12", "Entrepiso").
  // Distinto de la etiqueta/`nivel` numérica -- ver `nivel` más abajo. Para
  // una UF de un único nivel este campo no se expone en UI (sección 9 del
  // brief UI-M1-MULTINIVEL-01): sólo importa visualmente cuando hay 2+
  // niveles y hace falta distinguirlos.
  nombre: string;
  // Nivel/planta (D-δ.46, ahora del Nivel en vez de la UF): convención
  // IUAS, PB=0, Piso 1=1, Piso 2=2... Representación numérica para no
  // limitar la cantidad de pisos con una unión cerrada. Opcional: niveles
  // todavía sin clasificar no tienen nivel -- ausencia nunca equivale a PB
  // (0), es "sin clasificar todavía". Ver
  // interfaz/paginas/nivelUnidadFuncional.ts (nombreDeNivel,
  // calcularCotaHidraulicaDefaultDeNivel).
  nivel?: number;
  // Cota de PISO terminado de referencia del Nivel, en metros respecto del
  // datum del Proyecto (misma convención que Nodo.cota_m). GEOM-UX-01
  // (D-δ.86) reencuadró este campo: ya NO es "una cota representativa del
  // punto hidráulico" -- es la cota del PISO del Nivel. La cota hidráulica
  // efectiva de cada terminal se DERIVA sumando, sobre esta cota de piso
  // (o sobre el override de piso del Local, si lo hay), la altura
  // hidráulica sobre piso del artefacto (override explícito o Tabla IUAS
  // del tipo). Vale para AMBAS granularidades -- 'simplificada' ya no usa
  // una única cota uniforme por UF (ver
  // motor/tuberias/geometria/resolverCotaHidraulicaDeArtefacto y
  // resolverCotaTerminalEfectiva.ts). Ausente != 0 (CRIT-A20, mismo
  // criterio que Nodo.cota_m): dato físico no provisto todavía, nunca se
  // asume 0. Se propone automáticamente al asignar/cambiar `nivel`
  // (calcularCotaHidraulicaDefaultDeNivel = 3·nivel, sólo altura entre
  // plantas), pero el usuario la edita libremente -- el valor guardado
  // acá es el que participa del cálculo, nunca la fórmula recalculada. No
  // redefine CRIT-A29: el punto físico de verificación sigue siendo la
  // conexión del Artefacto; simplemente su altura sobre piso ahora la
  // aporta la Tabla IUAS por tipo en vez de exigirse relevada.
  cotaHidraulicaReferencia_m?: number;
  locales: readonly Local[];
};

export type UnidadFuncional = {
  id: string;
  // Identidad de USO/consumo de la UF (departamento, casa, local
  // comercial...) -- distinta del nombre de cada Nivel físico que contiene
  // (UI-M1-MULTINIVEL-01, sección 11: "no usar UF como sinónimo de piso").
  nombre: string;
  // 1..N niveles físicos. Toda UF tiene SIEMPRE al menos un Nivel -- una UF
  // "simple" (el caso histórico, la gran mayoría) es simplemente una UF con
  // `niveles.length === 1`, sin ninguna entidad ni concepto adicional; la
  // jerarquía visual de niveles sólo aparece en UI cuando hay 2+.
  niveles: readonly Nivel[];
};

export type ParametrosProyecto = {
  tipoDeProyecto: TipoDeProyecto;
  presionSobreAcera_m: number;
  alturaArtefactoMasDesfavorable_m: number;
  // Datos físicos de la conexión de agua (M4-D2, D-δ.65). Optativos y
  // backward-compatible: un Proyecto sin ellos sigue siendo válido; Módulo
  // 4 con un esquema de tanque queda 'incompleto' hasta que se declaren.
  // NO tienen default -- ausencia ≠ 0, ausencia ≠ DN mínimo.
  //
  // Diámetro nominal de la conexión, en metros. Debe ser uno de los
  // diámetros de la Tabla N°1 (§2.7) y >= 0,019 m (mínimo de conexión,
  // CRIT-A36). No se elige automáticamente: lo fija la Operadora / el
  // proyectista.
  diametroNominalConexion_m?: number;
  // Desnivel FIRMADO del punto de alimentación de cálculo respecto del
  // nivel de acera, en metros (no es una longitud):
  //   > 0  -> el punto está POR ENCIMA de la acera (alimentación hacia
  //           arriba: se resta de la presión de acera);
  //   = 0  -> misma cota;
  //   < 0  -> el punto está POR DEBAJO de la acera (p. ej. cisterna en
  //           sótano: sumar el descenso -> restar un negativo).
  // presionCalculo_m = presionSobreAcera_m - desnivelConexion_m
  // (ver resolverPresionDeCalculoDeConexion / CRIT-A37). Es un dato
  // DECLARADO: M4-D2 no lo deriva de la topología de M2 (el "pelo de agua
  // mínimo" de M2 NO es la cota de entrada del tanque -- conceptos
  // distintos).
  desnivelConexion_m?: number;
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

// MODE-UX-01 (D-δ.89): "Modo de trabajo" GLOBAL del proyecto. Es una
// decisión de PRODUCTO/UX explícita del usuario, NO una inferencia a partir
// de la combinación de parámetros hidráulicos (así lo hacía D-δ.51 hasta
// este slice):
//   'rapido'      -- menos decisiones, interfaz reducida, defaults seguros.
//   'profesional' -- controles avanzados de cálculo DISPONIBLES para
//                    personalizar. NO significa "máximo detalle obligatorio":
//                    Profesional arranca en el mismo preset de ejes que
//                    Rápido (Hazen + Estimadas + Simplificada) y una misma
//                    combinación hidráulica puede vivir en cualquiera de los
//                    dos modos.
// El modo NO decide el resultado hidráulico -- ese sale íntegro de
// `configuracionHidraulica`. El modo sólo decide la experiencia, qué
// controles se ofrecen y qué preset se aplica al CAMBIAR de modo.
export type ModoDeTrabajo = 'rapido' | 'profesional';

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

// Esquema físico de abastecimiento de agua del Proyecto (D-δ.61/D-δ.63).
// Decisión física GLOBAL del proyecto, no una entidad por sector. Describe
// CÓMO se abastece físicamente la instalación -- no desde dónde arranca
// cada balance de presión de M2 (esa frontera se DERIVA del esquema en un
// slice de integración posterior, no se persiste acá):
//  - 'directa': red pública → instalación → terminales. Sin tanque de
//    reserva modelado; el cálculo de reserva por déficit de caudal
//    (§2.10.2 / CRIT-A35) NO aplica -- eso es distinto de "hay tanque y su
//    reserva calculada da 0".
//  - 'tanqueElevado': red/conexión → tanque elevado → terminales.
//  - 'cisternaBombeoElevado': red/conexión → tanque inferior / bombeo →
//    tanque elevado → terminales. La cisterna y la bomba están aguas
//    arriba del almacenamiento: para M2 el origen sigue siendo el tanque
//    elevado, no es un tercer origen terminal. El reparto de la reserva
//    entre tanque de bombeo y de reserva (§2.11.3) no se modela todavía;
//    la Reserva Total Diaria de Diseño es la misma que para 'tanqueElevado'.
export type EsquemaDeAbastecimiento = 'directa' | 'tanqueElevado' | 'cisternaBombeoElevado';

// Lista en runtime de los esquemas válidos, para validar datos
// persistidos (TypeScript no protege un JSON cargado de disco).
export const ESQUEMAS_DE_ABASTECIMIENTO = [
  'directa',
  'tanqueElevado',
  'cisternaBombeoElevado',
] as const satisfies readonly EsquemaDeAbastecimiento[];

// Configuración persistida de Módulo 4 (Reserva), D-δ.63. Guarda
// únicamente decisiones físicas / de proyecto del usuario -- nunca
// resultados derivados (déficit, volumen de reserva, EstadoModulo4: todo
// se recalcula). Ausente = Módulo 4 todavía no iniciado (EstadoModulo4
// 'noIniciado'); NO es un default, y su ausencia NO equivale a 'directa'.
export type ConfiguracionDeAbastecimiento = {
  readonly esquema: EsquemaDeAbastecimiento;
  // Período estimado de consumo máximo `Tc`, en horas, con 1 ≤ Tc ≤ 4
  // (ERAS §2.10.2 / CRIT-A35). Es una DECISIÓN del proyectista según las
  // características de la instalación, no un valor derivado -- por eso se
  // persiste. Sólo interviene en el cálculo cuando el esquema tiene tanque
  // de reserva; con 'directa' nunca alimenta un cálculo de reserva.
  // Ausente con un esquema con tanque = dato faltante (EstadoModulo4
  // 'incompleto'), nunca se asume un valor.
  readonly periodoConsumoMaximo_h?: number;
  // Capacidades ADOPTADAS por el proyectista, en m³ (M4-E, D-δ.66). Son
  // decisiones de proyecto, NO derivados: nunca se persiste la Reserva
  // Total Diaria calculada, sus tercios, sumas ni estados de verificación.
  // Optativas, sin default y sin catálogo comercial (el usuario declara la
  // capacidad real). 0 es un valor estructuralmente válido; ausencia ≠ 0.
  //
  //   volumenTanqueElevadoAdoptado_m3 -> almacenamiento SUPERIOR
  //     (esquemas 'tanqueElevado' y 'cisternaBombeoElevado').
  //   volumenTanqueBombeoAdoptado_m3  -> almacenamiento INFERIOR / cisterna
  //     (sólo 'cisternaBombeoElevado').
  //
  // Un campo que no corresponde al esquema actual se IGNORA en el cálculo
  // (nunca lo invalida), y NO se poda de forma destructiva al cambiar de
  // esquema -- así una decisión previa del mismo componente físico puede
  // reaparecer si se vuelve a ese esquema.
  readonly volumenTanqueElevadoAdoptado_m3?: number;
  readonly volumenTanqueBombeoAdoptado_m3?: number;
};

// M2-TOPO-C: IDENTIDAD SEMÁNTICA de un montante explícito creado por el
// proyectista en Módulo 2. Es SÓLO identidad -- NO es una segunda topología
// ni una segunda fuente de verdad hidráulica (D-δ.23 sigue firme: un
// montante hidráulico es, y sigue siendo, una cadena real de Nodos/Tramos
// de `RedHidraulica`). La estructura física del montante (sus segmentos,
// sus nodos de derivación, sus feeds de Local, su Qc/DN/V/hf, su orden por
// cota, los Locales que sirve) se RECONSTRUYE siempre desde
// `RedHidraulica` -- nunca se persiste acá.
//
// Persiste deliberadamente lo MÍNIMO:
//   - `id`      estable: existe para el modelo y para el futuro grafo
//               (VIS-TOPO); nunca se muestra al usuario.
//   - `red`     'AF' | 'AC' (RedDeTramo): todos los Tramos con
//               `montanteId` apuntando a este Montante deben ser de esta
//               misma red (validarRedHidraulica lo exige). Un montante
//               NUNCA mezcla AF y AC.
//   - `nombre?` etiqueta HUMANA editable ("Montante AF dormitorios").
//               Ausente = usar el fallback derivado y numerado por red
//               ("Montante AF 1", ver interfaz/paginas/nombreDeMontante).
//
// NO persiste (a propósito, para no crear una segunda fuente de verdad):
// lista de Locales servidos, lista de Tramos/segmentos, caminos, Qc, DN,
// V, hf, geometría, coordenadas, grafo, longitud total. La pertenencia de
// un segmento físico al montante se expresa con `Tramo.montanteId` (una
// referencia semántica desde el Tramo hacia acá), nunca con un
// `tramosIds[]` acá. Un montante puede existir con 0, 1 o N Locales.
export type Montante = {
  readonly id: string;
  readonly red: RedDeTramo;
  readonly nombre?: string;
};

export type Proyecto = {
  metadatos: MetadatosProyecto;
  parametros: ParametrosProyecto;
  unidadesFuncionales: readonly UnidadFuncional[];
  // Ausente = proyecto sin red topológica modelada todavía (D-δ).
  redHidraulica?: RedHidraulica;
  // M2-TOPO-C: identidades semánticas de los montantes explícitos creados
  // por el proyectista en Módulo 2. Optativo y backward-compatible
  // (SCHEMA_VERSION_ACTUAL NO cambia, sin migración): un Proyecto guardado
  // antes de M2-TOPO-C no lo trae y se comporta EXACTAMENTE igual --
  // ausente y `[]` son equivalentes ("no hay montantes explícitos"). El
  // proyecto de ejemplo y el proyecto vacío no declaran montantes. Ver
  // `Montante` para por qué esta lista NO contiene topología física.
  montantes?: readonly Montante[];
  // Obligatoria: a diferencia de redHidraulica, el método de pérdida
  // distribuida es una configuración que el Proyecto siempre debe declarar
  // explícitamente una vez que este concepto existe en el modelo -- no hay
  // un estado intermedio válido de "Proyecto sin método todavía".
  configuracionHidraulica: ConfiguracionHidraulica;
  // Ausente = Módulo 3 no iniciado (D-δ.55). Optativo a propósito: un
  // Proyecto creado antes de que M3 existiera sigue siendo válido y
  // resuelve EstadoModulo3 'noIniciado' sin migración destructiva.
  configuracionMedidores?: ConfiguracionDeMedidores;
  // Ausente = Módulo 4 no iniciado (D-δ.63). Optativo a propósito, mismo
  // criterio que configuracionMedidores: un Proyecto creado antes de que
  // M4 existiera sigue siendo válido y resuelve EstadoModulo4 'noIniciado'
  // sin migración. La ausencia NO se interpreta como 'directa'.
  configuracionAbastecimiento?: ConfiguracionDeAbastecimiento;
  // MODE-UX-01 (D-δ.89): modo de trabajo EXPLÍCITO. Optativo y
  // backward-compatible (SCHEMA_VERSION_ACTUAL NO cambia, sin migración):
  // un Proyecto guardado antes de MODE-UX-01 no lo trae y su modo se
  // resuelve UNA vez por semántica histórica (interfaz/paginas/modoDeTrabajo
  // → inferirModoDeTrabajoLegacy). Un Proyecto nuevo SIEMPRE lo declara
  // explícitamente (crearProyectoVacio, proyectoInicial, aplicarModo*): la
  // inferencia legacy NO es la semántica normal.
  modoTrabajo?: ModoDeTrabajo;
  // MODE-UX-01 (D-δ.89): SNAPSHOT de la última `configuracionHidraulica`
  // usada mientras el modo era 'profesional'. Se escribe al SALIR de
  // Profesional y se lee al VOLVER, para no destruir las decisiones del
  // proyectista por probar Rápido un momento (§9 Caso E). Es SÓLO memoria
  // de restauración: NUNCA es fuente de cálculo -- el motor lee
  // exclusivamente `configuracionHidraulica`, que es la config ACTIVA.
  // Optativo/backward-compatible; "Reiniciar cálculo" lo deja ausente.
  ultimaConfiguracionProfesional?: ConfiguracionHidraulica;
};
