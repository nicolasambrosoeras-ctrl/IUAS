// Factory de un Proyecto VACÍO válido (GEOM-UX-01 §13-§16). Separado de
// `proyectoDeEjemplo` (proyectoInicial) a propósito: el proyecto de
// ejemplo es sólo el estado de bienvenida al abrir la app; "Reiniciar
// cálculo" NO vuelve a él, deja todo a cero. Nunca comparte referencias
// mutables -- cada llamada devuelve objetos y arrays nuevos.
//
// "Vacío válido" significa (§14):
//   - 0 unidades funcionales / locales / artefactos;
//   - sin `redHidraulica`  -> Módulo 2 'noIniciado';
//   - sin `configuracionMedidores`  -> Módulo 3 'noIniciado';
//   - sin `configuracionAbastecimiento`  -> Módulo 4 'noIniciado';
//   - sin longitudes / cotas / DN / resultados provenientes del ejemplo;
//   - sin referencias a IDs de entidades del ejemplo.
// Conserva únicamente lo que hace al Proyecto estructuralmente válido y
// es del PRODUCTO, no del proyecto físico anterior:
//   - schemaVersion / versión normativa;
//   - `modoTrabajo: 'rapido'` EXPLÍCITO (MODE-UX-01 / D-δ.89): "Reiniciar
//     cálculo" vuelve siempre a Rápido, sin arrastrar la memoria
//     Profesional de la sesión anterior (`ultimaConfiguracionProfesional`
//     queda ausente);
//   - `configuracionHidraulica` (obligatoria en el modelo) con el preset
//     inicial -- Hazen-Williams + Estimadas + Simplificada, mismo default
//     que un proyecto nuevo;
//   - parámetros obligatorios en su valor neutro "todavía sin declarar"
//     (0), nunca los valores físicos del ejemplo.
import type { Proyecto } from '../../modelo/proyecto'
import { SCHEMA_VERSION_ACTUAL } from '../../modelo/proyecto'

export function crearProyectoVacio(): Proyecto {
  return {
    metadatos: {
      nombre: '',
      obra: '',
      comitente: '',
      fecha: '',
      schemaVersion: SCHEMA_VERSION_ACTUAL,
      versionNormativa: 'eras-2023',
    },
    parametros: {
      tipoDeProyecto: 'viviendaIndividual',
      // Valores obligatorios del modelo, en su estado neutro "todavía sin
      // declarar" -- NO los del proyecto de ejemplo. No participan de
      // ningún cálculo hasta que se inicien los módulos que los consumen.
      presionSobreAcera_m: 0,
      alturaArtefactoMasDesfavorable_m: 0,
    },
    unidadesFuncionales: [],
    // MODE-UX-01 (D-δ.89): modo de trabajo EXPLÍCITO. "Reiniciar cálculo"
    // deja siempre Rápido y SIN `ultimaConfiguracionProfesional` (no se
    // arrastra la memoria Profesional de la sesión anterior).
    modoTrabajo: 'rapido',
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'estimado',
      granularidadHidraulica: 'simplificada',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}
