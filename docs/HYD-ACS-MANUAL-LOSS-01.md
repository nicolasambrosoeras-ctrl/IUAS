# HYD-ACS-MANUAL-LOSS-01

Pérdida de carga propia del equipo de producción de ACS, integrada al
balance de presión mediante adopción manual del proyectista. Paso
siguiente de `HYD-ACS-DISCLOSURE-01` (D-δ.128), que ya había hecho
visible en el panel interactivo la exclusión de `hfEquipoACS` del
balance (D-δ.15).

## Problema

`HYD-CLOSE-00` (D-δ.127) confirmó que `hfEquipoACS` sigue sin una
fórmula normativa automática -- ERAS-2023 no publica una, y resolverla
requiere investigación bibliográfica externa. `HYD-ACS-DISCLOSURE-01`
cerró la brecha de UX (el panel interactivo advertía la exclusión igual
que el PDF), pero un proyectista que SÍ dispone del dato de fabricante
para su equipo seguía sin forma de hacerlo participar del cálculo.

## Decisión

Permitir la adopción MANUAL de `hfEquipoACS`, sin adoptar ninguna
fórmula automática:

- fuente del dato: manual, a criterio del proyectista, con proveniencia
  conceptual "dato del fabricante / proyecto";
- no se calcula a partir de tipo de calefón, termotanque, potencia,
  capacidad, caudal, marca ni diámetro;
- se aplica exactamente una vez a cada camino hidráulico de Agua
  Caliente que atraviesa la producción ACS del proyecto;
- nunca se aplica a caminos de Agua Fría;
- ausencia del dato NUNCA equivale a 0 -- significa "desconocido / no
  informado", y el cálculo puede seguir dentro del alcance actual sin
  él (el campo sigue siendo opcional, nunca bloquea "Completo").

## Fuente del dato

Manual: el proyectista escribe la pérdida de carga en m.c.a. indicada
por el fabricante del equipo para el caudal de cálculo. IUAS no la
deriva de ningún catálogo ni curva.

## Ubicación UI

`M2 → Tuberías → Distribución general`, en una línea secundaria
compacta inmediatamente debajo de la tabla, visible sólo cuando el
proyecto ya tiene una fila "Alimentación ACS" (es decir, ya existe una
producción ACS topológica -- `asegurarRaizAC`). Visible en Rápido y en
Profesional: es un dato físico del equipo, no una configuración
avanzada del método de cálculo.

Label: *"Pérdida de carga del equipo ACS [m.c.a.]"*, con texto
secundario *"Dato manual del fabricante."* y ayuda ampliada explicando
que, si no se informa, no se incluye automáticamente en el balance.

## Semántica hidráulica

La ubicación visual junto a "Alimentación ACS" es deliberada (es el
lugar donde el proyectista espera encontrar el dato), pero el valor NO
se persiste como una pérdida distribuida/localizada más del Tramo de
Alimentación ACS -- sigue siendo, semánticamente, la pérdida PROPIA del
equipo de producción, no una propiedad de la cañería.

### Arqueología: por qué es seguro aplicarlo por "red AC" sin ambigüedad

`RedHidraulica` modela una **única** producción ACS por proyecto
(`Nodo.referencia.tipo === 'produccionACS'`, ver
`modelo/redHidraulica/index.ts`). `asegurarRaizAC`
(`interfaz/paginas/asegurarRaizAC.ts`) encuentra o crea esa raíz una
sola vez, y todo Tramo de red `'AC'` cuelga, por construcción, de esa
misma producción. Por eso, determinar si un camino "atraviesa la
producción ACS" se reduce exactamente a preguntar si su último Tramo
(el que efectivamente alimenta al terminal) es de red `'AC'` -- no hace
falta resolver una asociación camino↔equipo más fina, porque sólo existe
un equipo. Esto descarta los escenarios de "decisión roja" previstos
(múltiples producciones ACS simultáneas, un camino que atraviese más de
una, asociación ambigua): el modelo actual no los permite.

## Ausente vs. cero

- **Ausente** (`Proyecto.hfEquipoACS_mca === undefined`): "desconocido /
  no informado". El balance de caminos AC se comporta EXACTAMENTE como
  antes de este slice (sin ese término). El disclosure de
  `HYD-ACS-DISCLOSURE-01` sigue visible.
- **Cero explícito** (`Proyecto.hfEquipoACS_mca === 0`): el proyectista
  adoptó 0 m.c.a. para este equipo. Participa del balance igual que
  cualquier otro valor (resta 0, numéricamente neutro), pero UI/REPORT
  lo muestran como INFORMADO -- el disclosure de exclusión desaparece y
  se reemplaza por la constancia de que el término fue adoptado.

La distinción se preserva en TODA la cadena: modelo (`hfEquipoACS_mca?:
number`, nunca defaulteado a 0), persistencia (JSON serializa la clave
sólo si está presente), UI (`value={proyecto.hfEquipoACS_mca ?? ''}` +
updater que hace `delete` explícito al vaciar el input) y REPORT.
Únicamente dentro de la aritmética interna de `resolverBalanceDePresion`
se usa `?? 0` -- ahí es matemáticamente equivalente ("no participa" y
"participa con valor 0" dan el mismo `Presidual"), y ese uso está
aislado y documentado en el propio archivo.

## Aplicación AF/AC

- `resolverPresionResidualDeCamino.ts` resuelve `redDelTerminal` (red
  del último Tramo del camino) una sola vez, y deriva
  `hfEquipoACSAplicado_mca = redDelTerminal === 'AC' ? proyecto.hfEquipoACS_mca : undefined`.
  Ambos campos se exponen en la traza (`ResultadoPresionResidualDeCamino`)
  para que UI y REPORT puedan distinguir "no aplica (AF)" de "aplica
  pero no informado (AC)" sin recalcular nada.
- Ese valor ya resuelto se pasa a `resolverBalanceDePresion` como
  `hfEquipoACS_mca` (opcional) en `TerminosDePerdidaDeBalance`.
- Un camino AF nunca recibe el término, sea cual sea el valor global
  del proyecto.
- Varios terminales AC del mismo proyecto reciben la pérdida cada uno
  UNA vez (evaluación independiente por camino) -- nunca se acumula
  entre terminales ni se sube al balance global del sistema.

## Balance

Con valor informado (aplicable, AC):

```
Presidual = Pdisponible − Δz − hfDistribuida − hfLocalizada − hfMedidor − hfEquipoACS
```

Con valor ausente, o camino AF:

```
Presidual = Pdisponible − Δz − hfDistribuida − hfLocalizada − hfMedidor
```

(comportamiento hidráulico idéntico al vigente antes de este slice).
`hfEquipoACS_mca` es OPCIONAL en `TerminosDePerdidaDeBalance` -- a
diferencia de `hfLocalizada`/`hfMedidor`, su ausencia nunca agrega
`'hfEquipoACS'` a `terminosFaltantes` ni vuelve el balance
`'incompleto'`.

El terminal crítico puede cambiar por la introducción del dato (un
camino AC puede volverse más o menos desfavorable) -- comportamiento
esperado, no se preserva artificialmente el crítico anterior.

## Persistencia

- Campo top-level opcional en `Proyecto` (`hfEquipoACS_mca?: number`),
  mismo patrón backward-compatible que `configuracionMedidores`/
  `montantes`/`configuracionAbastecimiento`: **sin bump de
  `SCHEMA_VERSION_ACTUAL`, sin migración**.
- `conHfEquipoACS(proyecto, valor)` (`interfaz/paginas/actualizarHfEquipoACS.ts`):
  updater puro; `undefined` hace `delete` de la clave sobre una copia
  fresca (nunca dejar `hfEquipoACS_mca: undefined` como valor de
  propiedad, para que la ausencia sea real en el JSON exportado).
- Autosave (`localStorage`) y export/import (`.iuas`) preservan los tres
  casos (ausente, 0, valor real) sin alteración.

## REPORT

`resolverDatosDeInforme.ts` ya reservaba el campo
`DesarrolloTerminalCritico.hfEquipoACS_mca` (antes fijo en `undefined`
con un comentario explicando por qué); ahora lee
`resultado.hfEquipoACSAplicado_mca` real. `generarDocumentoPdf.ts`
muestra, condicionalmente:

- la fórmula CON el término (y la fila `hfEquipoACS (dato manual del
  fabricante)` en la tabla de desarrollo) cuando el crítico es de red AC
  y el valor está informado;
- la fórmula base + nota de "no informado" cuando el crítico es de red
  AC pero el valor está ausente;
- ninguna mención a `hfEquipoACS` cuando el crítico es de red AF.

El panel general de Verificación también muestra la nota condicional
(exclusión vs. valor incluido), replicando exactamente el criterio de
la UI interactiva.

## Compatibilidad con proyectos anteriores

Cualquier `.iuas` anterior a este slice (sin la clave `hfEquipoACS_mca`
en absoluto) importa sin error, con el campo ausente -- ningún resultado
hidráulico de un proyecto existente cambia al importarlo, salvo que el
usuario ingrese el dato manualmente después.

## Fuera de alcance

- Fórmula automática por tipo de equipo (calefón, termotanque, caldera);
- catálogo de equipos ACS o curvas de fabricante;
- coeficientes K del equipo, caudal dependiente;
- presets o valores sugeridos;
- múltiples producciones ACS por proyecto (el modelo actual no las
  soporta; ver "Arqueología" arriba).

## Investigación futura

Post-beta, sin decidir en este slice: si en algún momento se investiga
la fórmula normativa/bibliográfica de `hfEquipoACS` (D-δ.15 sigue
abierto para eso), este slice no la anticipa ni la bloquea -- la
adopción manual seguiría siendo válida como fallback cuando la fórmula
automática no aplique o el proyectista prefiera el dato real del
fabricante.

## Hallazgo colateral (no específico de este slice)

El E2E de este slice expuso un bug real y preexistente, ajeno a
`hfEquipoACS`: `sonPropsDeDimensionamientoEquivalentes.ts` (comparador
de `React.memo` del árbol de Tuberías, PERF-SCALE-01D) no comparaba
`hfEquipoACS_mca` -- corregido acá. El mecanismo de fondo (closures de
`onChange` en Tuberías cerradas sobre el `proyecto` de su último render
real, potencialmente obsoleto si el usuario edita Módulo 3/4/Verificación
justo antes sin que Tuberías se re-renderice de verdad en el medio)
sigue sin resolverse de raíz -- documentado en `ROADMAP.md`, sección
"Deuda técnica conocida", para un slice dedicado futuro.
