// Proyecto de ejemplo canónico de IUAS -- la instalación doméstica típica
// que se carga al abrir la app (estado inicial de `MotorDemandaPantalla`) y
// que la baseline funcional transversal M1–M4 (D-δ.70) usa como fixture.
// Datos puros: 1 UF, 5 Locales, 11 artefactos, red AF+AC con producción de
// ACS y configuración hidráulica en modo Rápido (simplificada + estimadas).
//
// Extraído de MotorDemandaPantalla.tsx sin cambios de contenido: se movió a
// su propio módulo para poder compartirlo con los tests sin arrastrar el
// árbol de React ni romper la regla react-refresh/only-export-components.
import type { Proyecto } from '../../modelo/proyecto'

export const proyectoInicial: Proyecto = {
  metadatos: {
    nombre: 'Vivienda unifamiliar de ejemplo',
    obra: 'Proyecto de ejemplo',
    comitente: 'IUAS',
    fecha: '2026-08-07',
    schemaVersion: '1.0.0',
    versionNormativa: 'eras-2023',
  },
  parametros: {
    tipoDeProyecto: 'viviendaIndividual',
    presionSobreAcera_m: 2,
    alturaArtefactoMasDesfavorable_m: 3,
  },
  unidadesFuncionales: [
    {
      id: 'uf-1',
      nombre: 'Unidad funcional 1',
      // D-δ.46: PB, cota hidráulica de referencia por defecto de ese
      // nivel (1,00 m) -- participa del cálculo de presión de todos los
      // terminales de esta UF mientras el proyecto esté en granularidad
      // 'simplificada' (default de este proyecto de ejemplo).
      nivel: 0,
      cotaHidraulicaReferencia_m: 1,
      locales: [
        {
          id: 'local-bano',
          tipo: 'bano',
          regimen: 'domiciliario',
          artefactos: [
            { id: 'artefacto-bano-1', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' },
            { id: 'artefacto-bano-2', artefactoId: 'receptaculoDucha', cantidad: 1, origen: 'normativo' },
            { id: 'artefacto-bano-3', artefactoId: 'bidet', cantidad: 1, origen: 'normativo' },
            { id: 'artefacto-bano-4', artefactoId: 'inodoroDeposito', cantidad: 1, origen: 'normativo' },
          ],
        },
        {
          id: 'local-cocina',
          tipo: 'cocina',
          regimen: 'domiciliario',
          artefactos: [
            { id: 'artefacto-cocina-1', artefactoId: 'piletaDeCocina', cantidad: 1, origen: 'normativo' },
            { id: 'artefacto-cocina-2', artefactoId: 'maquinaLavavajillas', cantidad: 1, origen: 'normativo' },
          ],
        },
        {
          id: 'local-lavadero',
          tipo: 'lavadero',
          regimen: 'domiciliario',
          artefactos: [
            { id: 'artefacto-lavadero-1', artefactoId: 'piletaDeLavar', cantidad: 1, origen: 'normativo' },
            { id: 'artefacto-lavadero-2', artefactoId: 'maquinaLavarropas', cantidad: 1, origen: 'normativo' },
          ],
        },
        {
          id: 'local-toilette',
          tipo: 'toilette',
          regimen: 'domiciliario',
          artefactos: [
            { id: 'artefacto-toilette-1', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' },
            { id: 'artefacto-toilette-2', artefactoId: 'inodoroDeposito', cantidad: 1, origen: 'normativo' },
          ],
        },
        {
          id: 'local-patio',
          tipo: 'jardin',
          regimen: 'domiciliario',
          artefactos: [
            { id: 'artefacto-patio-1', artefactoId: 'canillaDeServicio', cantidad: 1, origen: 'normativo' },
          ],
        },
      ],
    },
  ],
  // Red hidraulica de ejemplo (Modulo 2). Unica incorporacion de datos de
  // este incremento: no agrega ninguna UF/Local/Artefacto -- reutiliza
  // exclusivamente los 11 artefactos ya existentes del proyecto, asi que
  // Modulo 1 (demanda) no cambia.
  //
  // Raiz unica n-0 (AF) y produccionACS unico n-acs (D-delta.7),
  // compartidos por todo el proyecto: cada Local aporta una rama AF
  // hermana desde n-0 y, si corresponde, una rama AC hermana desde n-acs
  // (Conservacion de masa AF->ACS, D-delta.13). Topologia plana y
  // explicita, sin colector/montante/sectores todavia. Cada rama AF con
  // mas de un Artefacto usa un nodo de bifurcacion intermedio (un nodo con
  // referencia es terminal en el traversal, ver obtenerArtefactosAguasAbajo);
  // las ramas de un solo Artefacto van directas, sin bifurcacion artificial.
  //
  // Decision fisica por artefacto (D-delta.5, CRIT-A15): los artefactos
  // declarados AF+AC tienen terminal AF y terminal AC reales (fracciones de
  // mezcla via CRIT-A15). Los declarados AF-only NO tienen ningun terminal
  // AC en esta red -- fisicamente exclusivos de agua fria en este proyecto
  // de ejemplo, aunque el catalogo conserve su quCaliente_lps normativo
  // (CRIT-A7/A13 sin tocar); bajo CRIT-A15 su unica rama AF aporta
  // quTotal_lps, no quFria_lps.
  //   Baño:     lavatorio/ducha/bidet AF+AC; inodoroDeposito AF-only.
  //   Toilette: lavatorio AF+AC; inodoroDeposito AF-only.
  //   Cocina:   piletaDeCocina AF+AC; maquinaLavavajillas AF-only.
  //   Lavadero: piletaDeLavar AF+AC; maquinaLavarropas AF-only.
  //   Patio:    canillaDeServicio AF-only (terminal directo, sin bifurcacion).
  // Los nodos AF y los nodos AC referencian la misma cadena UF/Local/
  // Artefacto por diseño (terminal fria y terminal caliente del mismo
  // artefacto mixto, D-delta.3); validarRedHidraulica lo admite
  // explicitamente.
  //
  // t-general (AF): alimentacion general del proyecto, aguas arriba de
  // n-0 -- distribuidor ya existente, sin tocar nada aguas abajo de el.
  // Red 'AF' porque, igual que t-af-acs un nivel mas abajo, es agua
  // fria de ingreso antes de cualquier separacion AF/ACS (no existe una
  // tercera red para "tramo comun previo al split": el propio t-af-acs ya
  // establecio ese mismo principio). Al evaluarlo, todos los artefactos
  // AF+AC resuelven 'total' (alcanzables via ambas ramas desde n-0) y los
  // AF-only resuelven 'aguaFria' + CRIT-A15 (unica conexion) -> quTotal_lps
  // en ambos casos, sin excepcion por tipo de artefacto.
  redHidraulica: {
    nodos: [
      { id: 'n-general' },
      { id: 'n-0' },
      { id: 'n-af-1' },
      {
        id: 'n-af-lavatorio',
        referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'artefacto-bano-1' },
      },
      {
        id: 'n-af-ducha',
        referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'artefacto-bano-2' },
      },
      {
        id: 'n-af-bidet',
        referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'artefacto-bano-3' },
      },
      {
        id: 'n-af-inodoro',
        referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'artefacto-bano-4' },
      },
      { id: 'n-acs', referencia: { tipo: 'produccionACS' } },
      { id: 'n-ac-1' },
      {
        id: 'n-ac-lavatorio',
        referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'artefacto-bano-1' },
      },
      {
        id: 'n-ac-ducha',
        referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'artefacto-bano-2' },
      },
      {
        id: 'n-ac-bidet',
        referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano', artefactoId: 'artefacto-bano-3' },
      },
      // Sin terminal AC para artefacto-bano-4 (inodoro a depósito) a propósito:
      // en este proyecto de ejemplo el inodoro a depósito tiene alimentación
      // exclusivamente fría (t-af-inodoro). El catálogo conserva su
      // quCaliente_lps normativo (CRIT-A7/A13 no se tocan); simplemente no se
      // materializa una conexión física AC para este artefacto en esta red.

      { id: 'n-af-toilette-1' },
      {
        id: 'n-af-toilette-lavatorio',
        referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-toilette', artefactoId: 'artefacto-toilette-1' },
      },
      {
        id: 'n-af-toilette-inodoro',
        referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-toilette', artefactoId: 'artefacto-toilette-2' },
      },
      {
        id: 'n-ac-toilette-lavatorio',
        referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-toilette', artefactoId: 'artefacto-toilette-1' },
      },
      // Sin terminal AC para artefacto-toilette-2 (inodoro a depósito):
      // misma decisión física que en local-bano.

      { id: 'n-af-cocina-1' },
      {
        id: 'n-af-cocina-pileta',
        referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-cocina', artefactoId: 'artefacto-cocina-1' },
      },
      {
        id: 'n-af-cocina-lavavajillas',
        referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-cocina', artefactoId: 'artefacto-cocina-2' },
      },
      {
        id: 'n-ac-cocina-pileta',
        referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-cocina', artefactoId: 'artefacto-cocina-1' },
      },
      // Sin terminal AC para artefacto-cocina-2 (lavavajillas): quCaliente_lps=0
      // por CRIT-A7, sin conexión física AC en esta red.

      { id: 'n-af-lavadero-1' },
      {
        id: 'n-af-lavadero-pileta',
        referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-lavadero', artefactoId: 'artefacto-lavadero-1' },
      },
      {
        id: 'n-af-lavadero-lavarropas',
        referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-lavadero', artefactoId: 'artefacto-lavadero-2' },
      },
      {
        id: 'n-ac-lavadero-pileta',
        referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-lavadero', artefactoId: 'artefacto-lavadero-1' },
      },
      // Sin terminal AC para artefacto-lavadero-2 (lavarropas): quCaliente_lps=0
      // por CRIT-A7, sin conexión física AC en esta red.

      {
        id: 'n-af-patio-canilla',
        referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-patio', artefactoId: 'artefacto-patio-1' },
      },
      // Sin rama AC: canillaDeServicio es exclusivamente fría (quCaliente_lps=0,
      // no normativo). Terminal directo desde n-0, sin nodo de bifurcación:
      // un único Artefacto en todo el Local.
    ],
    tramos: [
      { id: 't-general', nodoOrigenId: 'n-general', nodoDestinoId: 'n-0', red: 'AF' },
      { id: 't-af-bano', nodoOrigenId: 'n-0', nodoDestinoId: 'n-af-1', red: 'AF' },
      { id: 't-af-acs', nodoOrigenId: 'n-0', nodoDestinoId: 'n-acs', red: 'AF' },
      { id: 't-af-lavatorio', nodoOrigenId: 'n-af-1', nodoDestinoId: 'n-af-lavatorio', red: 'AF' },
      { id: 't-af-ducha', nodoOrigenId: 'n-af-1', nodoDestinoId: 'n-af-ducha', red: 'AF' },
      { id: 't-af-bidet', nodoOrigenId: 'n-af-1', nodoDestinoId: 'n-af-bidet', red: 'AF' },
      { id: 't-af-inodoro', nodoOrigenId: 'n-af-1', nodoDestinoId: 'n-af-inodoro', red: 'AF' },
      { id: 't-ac-bano', nodoOrigenId: 'n-acs', nodoDestinoId: 'n-ac-1', red: 'AC' },
      { id: 't-ac-lavatorio', nodoOrigenId: 'n-ac-1', nodoDestinoId: 'n-ac-lavatorio', red: 'AC' },
      { id: 't-ac-ducha', nodoOrigenId: 'n-ac-1', nodoDestinoId: 'n-ac-ducha', red: 'AC' },
      { id: 't-ac-bidet', nodoOrigenId: 'n-ac-1', nodoDestinoId: 'n-ac-bidet', red: 'AC' },

      { id: 't-af-toilette', nodoOrigenId: 'n-0', nodoDestinoId: 'n-af-toilette-1', red: 'AF' },
      { id: 't-af-toilette-lavatorio', nodoOrigenId: 'n-af-toilette-1', nodoDestinoId: 'n-af-toilette-lavatorio', red: 'AF' },
      { id: 't-af-toilette-inodoro', nodoOrigenId: 'n-af-toilette-1', nodoDestinoId: 'n-af-toilette-inodoro', red: 'AF' },
      { id: 't-ac-toilette', nodoOrigenId: 'n-acs', nodoDestinoId: 'n-ac-toilette-lavatorio', red: 'AC' },

      { id: 't-af-cocina', nodoOrigenId: 'n-0', nodoDestinoId: 'n-af-cocina-1', red: 'AF' },
      { id: 't-af-cocina-pileta', nodoOrigenId: 'n-af-cocina-1', nodoDestinoId: 'n-af-cocina-pileta', red: 'AF' },
      { id: 't-af-cocina-lavavajillas', nodoOrigenId: 'n-af-cocina-1', nodoDestinoId: 'n-af-cocina-lavavajillas', red: 'AF' },
      { id: 't-ac-cocina', nodoOrigenId: 'n-acs', nodoDestinoId: 'n-ac-cocina-pileta', red: 'AC' },

      { id: 't-af-lavadero', nodoOrigenId: 'n-0', nodoDestinoId: 'n-af-lavadero-1', red: 'AF' },
      { id: 't-af-lavadero-pileta', nodoOrigenId: 'n-af-lavadero-1', nodoDestinoId: 'n-af-lavadero-pileta', red: 'AF' },
      { id: 't-af-lavadero-lavarropas', nodoOrigenId: 'n-af-lavadero-1', nodoDestinoId: 'n-af-lavadero-lavarropas', red: 'AF' },
      { id: 't-ac-lavadero', nodoOrigenId: 'n-acs', nodoDestinoId: 'n-ac-lavadero-pileta', red: 'AC' },

      { id: 't-af-patio', nodoOrigenId: 'n-0', nodoDestinoId: 'n-af-patio-canilla', red: 'AF' },
    ],
  },
  // Método, material y sistema comercial iniciales explícitos del proyecto
  // de ejemplo -- no un default oculto del motor: es la elección de
  // laboratorio de este punto de creación productiva concreto, tal como
  // exige el modelo (configuracionHidraulica es obligatoria en Proyecto,
  // sistemaDeTuberiaId incluido). acquaSystemMagnumPn20 es del material
  // ppr, coherente con materialTuberiaId.
  configuracionHidraulica: {
    metodoPerdidaDistribuida: 'hazenWilliams',
    // D-δ.51: el proyecto de ejemplo arranca en modo RÁPIDO
    // (simplificada + estimadas): predimensionamiento inmediato sin que
    // el usuario tenga que entender granularidad, tees ni accesorios. El
    // modo Profesional (profesional + detalladas) sigue a un clic, sin
    // perder ningún dato. Las longitudes iniciales 5/10/10 las precarga
    // backfillLongitudesDePredimensionamiento al montar (ver useState más
    // abajo), no se hardcodean tramo por tramo acá.
    metodoPerdidaLocalizada: 'estimado',
    granularidadHidraulica: 'simplificada',
    materialTuberiaId: 'ppr',
    sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
  },
}
