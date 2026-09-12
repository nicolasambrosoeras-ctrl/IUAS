# ADR-0002 — Nivel físico como entidad dentro de la Unidad Funcional

- **Estado:** Aceptada (UI-M1-MULTINIVEL-01, D-δ.106).
- **Fecha:** 2026-09-12.
- **Serie que la origina:** UI-M1-MULTINIVEL-01 (slice único). El detalle
  incremental vive en `ROADMAP.md` y `PENDIENTES-DE-ARQUITECTURA.md`; este
  ADR consolida la decisión arquitectónica de fondo.

---

## 1. Contexto

Antes de este slice, `UnidadFuncional` mezclaba dos conceptos de dominio
distintos en una sola entidad:

- la **identidad de uso/consumo** (un departamento, una casa, un local
  comercial) — `nombre`;
- el **plano físico vertical** que esa unidad ocupa — `nivel?: number`,
  `cotaHidraulicaReferencia_m?: number`, y el array `locales: readonly
  Local[]` embebido directamente en la UF.

Esa mezcla asumía implícitamente **1 UF = 1 nivel físico**. Es correcto
para la enorme mayoría de los casos (departamento, local comercial, oficina
en un único piso), pero es estructuralmente falso para:

- una **casa** con Planta Baja + Planta Alta;
- un **dúplex** con Piso 11 + Piso 12;
- un local con **entrepiso**.

En esos casos, antes de este slice, la única forma de representarlos era
declarar la casa/dúplex como **dos UF separadas** (una por planta) — lo que
rompe la semántica de "Unidad Funcional" como unidad de uso/consumo: una
casa de dos plantas es UNA sola unidad, no dos, y ese modelado indirecto
contaminaba cualquier conteo de UF y cualquier reporte futuro por unidad.

## 2. Decisión

### 2.1 Nueva entidad `Nivel`, dueña de los Locales

```ts
export type Nivel = {
  id: string;
  nombre: string;
  nivel?: number;
  cotaHidraulicaReferencia_m?: number;
  locales: readonly Local[];
};

export type UnidadFuncional = {
  id: string;
  nombre: string;
  niveles: readonly Nivel[]; // siempre >= 1
};
```

`nivel`, `cotaHidraulicaReferencia_m` y `locales` se **mueven** de
`UnidadFuncional` a `Nivel`. `UnidadFuncional.nombre` queda como la
identidad de uso (antes conflacionada con el nombre del plano físico).
Toda UF tiene **siempre** al menos un Nivel — una UF simple es,
estructuralmente, una UF con `niveles.length === 1`; no hay ningún
concepto ni entidad adicional para ese caso, ni un flag "modo simple".

### 2.2 Alternativas evaluadas

**Opción A — niveles anidados, Nivel posee Locales (ELEGIDA).**
`UnidadFuncional.niveles: Nivel[]`, cada `Nivel.locales: Local[]`.

**Opción B — niveles identificados, Local referencia nivel por id.**
`UnidadFuncional.niveles: Nivel[]` + `UnidadFuncional.locales: Local[]`
(sin mover), con `Local.nivelId: string`.

**Opción C.** No surgió ninguna representación adicional genuinamente
distinta durante la arqueología del código existente.

### 2.3 Por qué A y no B

La arqueología previa a la implementación (lectura de
`src/modelo/proyecto/index.ts`, `duplicarUnidadFuncional.ts`,
`resolverCotaHidraulicaDeArtefacto.ts`, `resolverPresionResidualDeCamino.ts`,
`reconciliarMontante.ts`) mostró que:

1. Los Locales **ya** vivían embebidos directamente dentro de la UF (un
   array, no una colección paralela referenciada por id) — Opción A
   extiende ese mismo patrón un nivel más adentro; Opción B lo habría roto
   introduciendo el único caso de "colección referenciada por id" del
   modelo.
2. La jerarquía de cotas (GEOM-COTA-01,
   `resolverCotaHidraulicaEfectivaDeArtefacto`) ya es una cadena de
   propiedad UF → Local → Artefacto; Opción A la extiende naturalmente a
   Nivel → Local → Artefacto sin cambiar su forma (sigue siendo "el padre
   directo aporta la cota heredable").
3. **Estados imposibles.** Bajo Opción B, un `Local.nivelId` puede apuntar
   a un Nivel que ya no existe (borrado sin reconciliar `nivelId`) — un
   Local "huérfano" sin nivel válido, categoría de bug que no existía antes
   de este slice. Bajo Opción A, borrar un Nivel borra sus Locales con él
   por construcción: no hay una segunda referencia que pueda quedar
   colgada.
4. **Reconciliación de "eliminar nivel" (sección 27 del brief).** Bajo
   Opción A es trivial: filtrar `niveles` por id. Bajo Opción B habría
   exigido una pasada adicional de limpieza de Locales huérfanos cada vez
   que se borra un Nivel — lógica extra que Opción A no necesita.
5. Ningún call site relevado durante la arqueología asumía "Local
   referenciado por id fuera de su padre" — todo el código existente
   (M1, M2, duplicación) ya recorre `UF → sus Locales` como propiedad
   directa, nunca como join.

La superficie de migración (~170 call sites de producción y tests que
construían `UF.locales`/`UF.nivel`/`UF.cotaHidraulicaReferencia_m`
directamente) es la misma bajo ambas opciones — no fue el criterio de
decisión (sección 6 del brief: "no usar 'menos líneas cambiadas' como
único criterio").

## 3. Consecuencias

- **GEOM-COTA-01** se reencuadra de `UF → Local → Artefacto` a
  `Nivel → Local → Artefacto`. La fórmula (`z_terminal = z_piso_local_efectivo
  + h_artefacto_efectiva`) no cambia; sólo cambia de dónde sale la cota de
  piso heredable. `resolverCotaHidraulicaEfectivaDeArtefacto` y
  `resolverCotaPisoDeLocal` ahora reciben un `Nivel` (o
  `Pick<Nivel, 'cotaHidraulicaReferencia_m'>`) en el lugar donde antes
  recibían la `UnidadFuncional`.
- **M2** (`resolverPresionResidualDeCamino`, `resolverIncrementoVerticalPorNivel`,
  `reconciliarMontante`, `resolverInfoCotaDeTerminal`) resuelve primero el
  `Nivel` que posee el `Local` de cada terminal (`resolverNivelDeLocal`,
  nuevo helper en `resolverCotaHidraulicaDeArtefacto.ts`) y de ahí deriva la
  cota — nunca infiere cota directamente de la UF.
- **Montantes / topología** no se redefinen: `Tramo.montanteId` sigue siendo
  la única fuente de pertenencia física; Nivel es organización/geometría,
  nunca topología hidráulica.
- **Duplicar UF** ahora copia TODOS los niveles (antes copiaba el único
  nivel implícito) — cada Nivel recibe un id nuevo, sus Locales/Artefactos
  se clonan igual que antes, y las reglas ya cerradas (D-δ.50/D-δ.51: no
  copiar topología M2 física, no copiar DN manual/longitudes relevadas) se
  preservan sin cambios.
- **UX (M1):** una UF de un único nivel se ve y se edita igual que antes
  (mismos 3 campos Nombre/Nivel/Cota, sin acordeón ni card extra). Con 2+
  niveles, cada uno se muestra como su propia sección agrupada con su
  propio nombre editable y su acción "Eliminar nivel"; "+ Agregar nivel"
  vive junto a "Duplicar" en la cabecera de la UF.
- **Fuente única de verdad:** no queda ningún campo `UF.cota`/`UF.nivel`
  legacy conviviendo con `Nivel.cota`/`Nivel.nivel` — el cambio de schema
  es completo, sin estado híbrido permanente (sección 47 del brief). No
  hace falta migración de persistencia porque `PERSIST` todavía no existe;
  el `schemaVersion` del modelo no cambia (mismo criterio que otros
  cambios de forma sin persistencia real, p. ej. CAT-CONN-01).

## 4. Pendiente explícito, no resuelto por este ADR

- **Mover un Local de un Nivel a otro** (brief sección 18): no se
  implementó un selector "Mover a nivel" — sigue como
  eliminar/recrear manual si el usuario se equivocó de nivel. Documentado
  como limitación conocida, no como decisión de que no hace falta.
- **Reordenar niveles** (drag & drop): fuera de alcance; el orden de
  creación es el orden visual.
