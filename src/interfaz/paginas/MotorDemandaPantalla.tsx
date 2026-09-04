// Primera pantalla técnica editable del Motor de Demanda (integración,
// Fase 1). Proyecto inicial = vivienda unifamiliar de ejemplo (no un caso
// Golden -- G1 y G2 siguen existiendo exclusivamente en CASOS-GOLDEN.md y
// sus tests), pensado para que se reconozca de un vistazo. Todos los
// campos son editables: coeficiente a, unidades funcionales, locales y
// artefactos. Gate de validación antes de calcular, y visualización
// completa del ResultadoDeCalculo. No recalcula: solo llama a
// validarProyecto y calcularSimultaneidad y muestra lo que devuelven.
import { useState } from 'react'
import type { Proyecto, UnidadFuncional, Local, TipoDeLocal, RegimenLocal, Artefacto } from '../../modelo/proyecto'
import type { ResultadoDeCalculo, Paso, ValorCalculado } from '../../modelo/resultado'
import type { ProblemaValidacion, CodigoValidacion } from '../../validacion'
import { validarProyecto } from '../../validacion'
import { calcularSimultaneidad } from '../../motor/demanda/simultaneidad/calcularSimultaneidad'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion, type TipoDeProyecto } from '../../normativa/eras-2023/coeficientes-mayoracion'
import { catalogoSistemasDeTuberia } from '../../motor/tuberias/sistemaDeTuberia'
import { formatearNumero } from '../../exportadores/pdf/formatearNumero'
import { generarDocumentoPdf } from '../../exportadores/pdf/generarDocumentoPdf'
import {
  formulaSimbolica,
  sustitucionNumerica,
  textoValorCalculado,
} from '../../presentacion/desarrolloDelCalculoDemanda'
import { duplicarUnidadFuncionalEnProyecto, generarId } from './duplicarUnidadFuncional'
import { ResultadoHidraulicoDeTramo } from './ResultadoHidraulicoDeTramo'
import { MetodologiaYFuentesTecnicas } from './MetodologiaYFuentesTecnicas'

const TIPOS_DE_LOCAL: readonly TipoDeLocal[] = [
  'bano',
  'toilette',
  'cocina',
  'lavadero',
  'cochera',
  'jardin',
  'otros',
]

const REGIMENES_DE_LOCAL: readonly RegimenLocal[] = ['domiciliario', 'noDomiciliario']

// Solo texto visible: los valores internos (value de cada <option>,
// local.tipo, local.regimen) siguen siendo los literales del modelo.
const ETIQUETA_TIPO_DE_LOCAL: Readonly<Record<TipoDeLocal, string>> = {
  bano: 'Baño',
  toilette: 'Toilette',
  cocina: 'Cocina',
  lavadero: 'Lavadero',
  cochera: 'Cochera',
  jardin: 'Jardín',
  otros: 'Otros',
}

const ETIQUETA_REGIMEN: Readonly<Record<RegimenLocal, string>> = {
  domiciliario: 'Domiciliario',
  noDomiciliario: 'No domiciliario',
}

// Etiqueta de presentación por local: derivada del orden y del tipo, nunca
// del id interno. No se guarda en ningún lado -- se recalcula en cada
// render a partir de `locales`.
function etiquetasDeLocales(locales: readonly Local[]): readonly string[] {
  const totalPorTipo: Partial<Record<TipoDeLocal, number>> = {}
  for (const local of locales) {
    totalPorTipo[local.tipo] = (totalPorTipo[local.tipo] ?? 0) + 1
  }

  const contadorPorTipo: Partial<Record<TipoDeLocal, number>> = {}
  return locales.map((local) => {
    const etiquetaBase = ETIQUETA_TIPO_DE_LOCAL[local.tipo]
    const total = totalPorTipo[local.tipo] ?? 0
    if (total <= 1) {
      return `Local: ${etiquetaBase}`
    }
    const siguiente = (contadorPorTipo[local.tipo] ?? 0) + 1
    contadorPorTipo[local.tipo] = siguiente
    return `Local: ${etiquetaBase} ${siguiente}`
  })
}

function conTipoDeProyecto(proyecto: Proyecto, tipoDeProyecto: TipoDeProyecto): Proyecto {
  return { ...proyecto, parametros: { ...proyecto.parametros, tipoDeProyecto } }
}


function ArtefactoFormulario({
  artefacto,
  onCambiar,
  onEliminar,
}: {
  artefacto: Artefacto
  onCambiar: (artefacto: Artefacto) => void
  onEliminar: () => void
}) {
  return (
    <div>
      <label>
        Artefacto:{' '}
        <select
          value={artefacto.artefactoId}
          onChange={(evento) => onCambiar({ ...artefacto, artefactoId: evento.target.value })}
        >
          {catalogoArtefactos.map((catalogoItem) => (
            <option key={catalogoItem.id} value={catalogoItem.id}>
              {catalogoItem.nombre} (qu={formatearNumero(catalogoItem.quTotal_lps, 'l/s')} l/s)
            </option>
          ))}
        </select>
      </label>{' '}
      <label>
        Cantidad:{' '}
        <input
          type="number"
          value={artefacto.cantidad}
          onChange={(evento) => {
            const cantidad = Number(evento.target.value)
            if (!Number.isNaN(cantidad)) {
              onCambiar({ ...artefacto, cantidad })
            }
          }}
        />
      </label>{' '}
      <button type="button" onClick={onEliminar}>
        Eliminar artefacto
      </button>
    </div>
  )
}

function LocalFormulario({
  local,
  etiqueta,
  onCambiar,
  onEliminar,
}: {
  local: Local
  etiqueta: string
  onCambiar: (local: Local) => void
  onEliminar: () => void
}) {
  function agregarArtefacto() {
    const primerArtefacto = catalogoArtefactos[0]
    if (!primerArtefacto) {
      return
    }
    const nuevoArtefacto: Artefacto = {
      id: generarId('artefacto'),
      artefactoId: primerArtefacto.id,
      cantidad: 1,
      origen: 'normativo',
    }
    onCambiar({ ...local, artefactos: [...local.artefactos, nuevoArtefacto] })
  }

  return (
    <article>
      <h5>{etiqueta}</h5>
      <label>
        Tipo:{' '}
        <select
          value={local.tipo}
          onChange={(evento) => onCambiar({ ...local, tipo: evento.target.value as TipoDeLocal })}
        >
          {TIPOS_DE_LOCAL.map((tipo) => (
            <option key={tipo} value={tipo}>
              {ETIQUETA_TIPO_DE_LOCAL[tipo]}
            </option>
          ))}
        </select>
      </label>{' '}
      <label>
        Régimen:{' '}
        <select
          value={local.regimen ?? ''}
          onChange={(evento) => {
            if (evento.target.value === '') {
              const { regimen: _regimen, ...localSinRegimen } = local
              onCambiar(localSinRegimen)
              return
            }
            onCambiar({ ...local, regimen: evento.target.value as RegimenLocal })
          }}
        >
          <option value="">— sin definir —</option>
          {REGIMENES_DE_LOCAL.map((regimen) => (
            <option key={regimen} value={regimen}>
              {ETIQUETA_REGIMEN[regimen]}
            </option>
          ))}
        </select>
      </label>{' '}
      <button type="button" onClick={onEliminar}>
        Eliminar local
      </button>

      <h6>Artefactos</h6>
      {local.artefactos.map((artefacto) => (
        <ArtefactoFormulario
          key={artefacto.id}
          artefacto={artefacto}
          onCambiar={(artefactoActualizado) =>
            onCambiar({
              ...local,
              artefactos: local.artefactos.map((a) => (a.id === artefacto.id ? artefactoActualizado : a)),
            })
          }
          onEliminar={() => onCambiar({ ...local, artefactos: local.artefactos.filter((a) => a.id !== artefacto.id) })}
        />
      ))}
      <button type="button" onClick={agregarArtefacto}>
        + Agregar artefacto
      </button>
    </article>
  )
}

function UnidadFuncionalFormulario({
  uf,
  onCambiar,
  onEliminar,
  onDuplicar,
  mostrarEliminar,
}: {
  uf: UnidadFuncional
  onCambiar: (uf: UnidadFuncional) => void
  onEliminar: () => void
  onDuplicar: () => void
  mostrarEliminar: boolean
}) {
  const locales = uf.locales

  function cambiarLocales(locales: readonly Local[]) {
    onCambiar({ ...uf, locales })
  }

  function agregarLocal() {
    const nuevoLocal: Local = {
      id: generarId('local'),
      tipo: 'bano',
      artefactos: [],
    }
    cambiarLocales([...locales, nuevoLocal])
  }

  const etiquetas = etiquetasDeLocales(locales)

  return (
    <section>
      <h3>
        Unidad funcional:{' '}
        <input
          type="text"
          value={uf.nombre}
          onChange={(evento) => onCambiar({ ...uf, nombre: evento.target.value })}
        />
      </h3>
      <button type="button" onClick={onDuplicar}>
        Duplicar unidad funcional
      </button>{' '}
      {mostrarEliminar ? (
        <button type="button" onClick={onEliminar}>
          Eliminar unidad funcional
        </button>
      ) : null}

      <h4>Locales</h4>
      {locales.map((local, indice) => (
        <LocalFormulario
          key={local.id}
          local={local}
          etiqueta={etiquetas[indice] ?? `Local: ${ETIQUETA_TIPO_DE_LOCAL[local.tipo]}`}
          onCambiar={(localActualizado) =>
            cambiarLocales(locales.map((l) => (l.id === local.id ? localActualizado : l)))
          }
          onEliminar={() => cambiarLocales(locales.filter((l) => l.id !== local.id))}
        />
      ))}
      <button type="button" onClick={agregarLocal}>
        + Agregar local
      </button>
    </section>
  )
}

function ProyectoFormulario({
  proyecto,
  onCambiar,
}: {
  proyecto: Proyecto
  onCambiar: (proyecto: Proyecto) => void
}) {
  const unidadesFuncionales = proyecto.unidadesFuncionales

  function cambiarUnidadesFuncionales(unidadesFuncionales: readonly UnidadFuncional[]) {
    onCambiar({ ...proyecto, unidadesFuncionales })
  }

  function agregarUnidadFuncional() {
    const nuevaUf: UnidadFuncional = {
      id: generarId('uf'),
      nombre: `Unidad funcional ${unidadesFuncionales.length + 1}`,
      locales: [],
    }
    cambiarUnidadesFuncionales([...unidadesFuncionales, nuevaUf])
  }

  function duplicarUnidadFuncional(unidadFuncionalId: string) {
    onCambiar(duplicarUnidadFuncionalEnProyecto(proyecto, unidadFuncionalId))
  }

  return (
    <section>
      <h2>Datos del proyecto</h2>
      <label>
        Tipología de proyecto:{' '}
        <select
          style={{ maxWidth: '100%' }}
          value={proyecto.parametros.tipoDeProyecto}
          onChange={(evento) => onCambiar(conTipoDeProyecto(proyecto, evento.target.value as TipoDeProyecto))}
        >
          {coeficientesMayoracion.map((entrada) => (
            <option key={entrada.id} value={entrada.id}>
              {entrada.nombre} — a = {entrada.a}
            </option>
          ))}
        </select>
      </label>

      <p>Total de unidades funcionales: {unidadesFuncionales.length}</p>

      {unidadesFuncionales.map((uf) => (
        <UnidadFuncionalFormulario
          key={uf.id}
          uf={uf}
          mostrarEliminar={unidadesFuncionales.length > 1}
          onCambiar={(ufActualizada) =>
            cambiarUnidadesFuncionales(
              unidadesFuncionales.map((u) => (u.id === uf.id ? ufActualizada : u)),
            )
          }
          onEliminar={() =>
            cambiarUnidadesFuncionales(unidadesFuncionales.filter((u) => u.id !== uf.id))
          }
          onDuplicar={() => duplicarUnidadFuncional(uf.id)}
        />
      ))}
      <button type="button" onClick={agregarUnidadFuncional}>
        + Agregar unidad funcional
      </button>
    </section>
  )
}

const proyectoInicial: Proyecto = {
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
    materialTuberiaId: 'ppr',
    sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
  },
}

function extraerN(pasos: readonly Paso[]): number | null {
  const pasoKc = pasos.find((paso) => paso.id === 'kc')
  const entradaN = pasoKc?.entradas.find((entrada) => entrada.simbolo === 'n')
  return entradaN?.valor ?? null
}

function ValorCalculadoTexto({ valor }: { valor: ValorCalculado }) {
  return <span>{textoValorCalculado(valor)}</span>
}

const MENSAJES_DE_VALIDACION: Readonly<Record<CodigoValidacion, string>> = {
  proyectoRegimenLocalAusente: 'Debe seleccionar el régimen del local.',
  proyectoCantidadNoPositiva: 'La cantidad de artefactos debe ser mayor que cero.',
  proyectoUnidadFuncionalSinLocales: 'La unidad funcional no contiene locales.',
  proyectoLocalSinArtefactos: 'El local no contiene artefactos y no participa del cálculo.',
  proyectoSinArtefactosComputables: 'El proyecto debe contener al menos un artefacto para poder calcular.',
  catalogoArtefactoIdInexistente: 'El artefacto seleccionado no existe en el catálogo normativo vigente.',
  catalogoTipoDeProyectoInexistente:
    'La tipología de proyecto seleccionada no existe en el catálogo normativo vigente.',
  redHidraulicaNodoIdDuplicado: 'Nodo de red hidráulica con identificador duplicado.',
  redHidraulicaTramoIdDuplicado: 'Tramo de red hidráulica con identificador duplicado.',
  redHidraulicaTramoNodoInexistente: 'Un tramo de red hidráulica referencia un nodo inexistente.',
  redHidraulicaTramoOrigenIgualDestino:
    'Un tramo de red hidráulica no puede tener el mismo nodo como origen y destino.',
  redHidraulicaReferenciaArtefactoInvalida:
    'Una referencia de red hidráulica apunta a un artefacto inexistente o fuera de la ubicación indicada.',
  redHidraulicaTramoLongitudNoPositiva: 'Un tramo de red hidráulica tiene una longitud menor o igual a cero.',
  redHidraulicaTramoLongitudIncompatibleConCota:
    'Un tramo de red hidráulica tiene una longitud menor a la diferencia de cota entre sus nodos.',
  redHidraulicaTramoAccesorioTipoNoSoportado:
    'Un accesorio de tramo tiene un tipo todavía no soportado para el cálculo de pérdida localizada.',
  redHidraulicaTramoAccesorioCantidadNoPositiva: 'La cantidad de un accesorio de tramo debe ser mayor que cero.',
  configuracionHidraulicaSistemaDeTuberiaIdInexistente:
    'El sistema de tubería seleccionado no existe en el catálogo de sistemas comerciales vigente.',
  configuracionHidraulicaSistemaMaterialIncompatible:
    'El sistema de tubería seleccionado pertenece a un material distinto del material configurado en el proyecto.',
}

function ProblemasValidacion({ problemas }: { problemas: readonly ProblemaValidacion[] }) {
  return (
    <section>
      <h2>Problemas de validación</h2>
      <p>El Proyecto no es válido. El Motor de Demanda no se ejecuta.</p>
      <ul>
        {problemas.map((problema, indice) => (
          <li key={indice}>
            [{problema.severidad}] {MENSAJES_DE_VALIDACION[problema.codigo]} ({problema.codigo})
          </li>
        ))}
      </ul>
    </section>
  )
}

function Advertencias({ advertencias }: { advertencias: ResultadoDeCalculo['advertencias'] }) {
  if (advertencias.length === 0) {
    return null
  }
  return (
    <section>
      <h2>Advertencias</h2>
      <ul>
        {advertencias.map((advertencia) => (
          <li key={advertencia.id}>
            {advertencia.mensaje}
            {advertencia.referenciaNormativa ? ` (${advertencia.referenciaNormativa})` : ''}
          </li>
        ))}
      </ul>
    </section>
  )
}

function Resultados({ resultado }: { resultado: ResultadoDeCalculo }) {
  const n = extraerN(resultado.pasos)
  const { qmax, kc, k, qc } = resultado.resultados
  if (!qmax || !kc || !k || !qc) {
    // No es un estado previsible del dominio: el motor siempre devuelve
    // estas cuatro claves (contrato de calcularSimultaneidad). Si faltan,
    // es un defecto de programación, no un caso a manejar en la interfaz.
    throw new Error('El motor no devolvió los resultados esperados (qmax/kc/k/qc)')
  }

  return (
    <section>
      <h2>Resultados</h2>

      <h3>Caudal de cálculo (Qc)</h3>
      <p>
        <strong>
          <ValorCalculadoTexto valor={qc} />
        </strong>
      </p>

      <table>
        <tbody>
          <tr>
            <th>n</th>
            <td>{n !== null ? formatearNumero(n, 'conteo') : '—'}</td>
          </tr>
          <tr>
            <th>Qmax</th>
            <td>
              <ValorCalculadoTexto valor={qmax} />
            </td>
          </tr>
        </tbody>
      </table>

      <details>
        <summary>Parámetros intermedios</summary>
        <table>
          <tbody>
            <tr>
              <th>Kc</th>
              <td>
                <ValorCalculadoTexto valor={kc} />
              </td>
            </tr>
            <tr>
              <th>K</th>
              <td>
                <ValorCalculadoTexto valor={k} />
              </td>
            </tr>
          </tbody>
        </table>
      </details>
    </section>
  )
}

function Pasos({ pasos }: { pasos: readonly Paso[] }) {
  return (
    <section>
      <details>
        {/* Sin "▶" propio: el navegador ya antepone su propio triángulo
            de disclosure a <summary>; duplicarlo se vería redundante. */}
        <summary>🔍 Desarrollo del cálculo ({pasos.length} pasos)</summary>
        {pasos.map((paso) => {
          const sustitucion = sustitucionNumerica(paso)
          return (
            <article key={paso.id}>
              <h3>{paso.titulo}</h3>
              <p>Fórmula: {formulaSimbolica(paso)}</p>
              {paso.criterioId ? <p>Criterio: {paso.criterioId}</p> : null}
              {sustitucion ? <p>Sustitución: {sustitucion}</p> : null}
              <p>
                {paso.salida.simbolo} = <ValorCalculadoTexto valor={paso.salida.resultado} />
              </p>
              <div style={{ overflowX: 'auto' }}>
                <table>
                  <thead>
                    <tr>
                      <th>Símbolo</th>
                      <th>Valor</th>
                      <th>Unidad</th>
                      <th>Procedencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paso.entradas.map((entrada, indice) => (
                      // entrada.simbolo puede repetirse (ej. qu(lavatorio) en
                      // más de un local); se agrega el índice solo para que la
                      // key de React sea única -- no altera ningún dato visible.
                      <tr key={`${entrada.simbolo}-${indice}`}>
                        <td>{entrada.simbolo}</td>
                        <td>{formatearNumero(entrada.valor, entrada.unidad)}</td>
                        <td>{entrada.unidad}</td>
                        <td>{entrada.procedencia}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p>Referencias: {paso.referencias.join(', ')}</p>
              {paso.nota ? <p>Nota: {paso.nota}</p> : null}
            </article>
          )
        })}
      </details>
    </section>
  )
}

function ResultadoDemanda({
  proyecto,
  onCambiar,
}: {
  proyecto: Proyecto
  onCambiar: (proyecto: Proyecto) => void
}) {
  const resultado = calcularSimultaneidad({
    proyecto,
    normativa: { catalogoArtefactos, coeficientesMayoracion },
  })

  return (
    <>
      <details open>
        <summary>
          <h2>Módulo 1 — Demanda</h2>
        </summary>
        <Advertencias advertencias={resultado.advertencias} />
        <Resultados resultado={resultado} />
        <button type="button" onClick={() => generarDocumentoPdf({ proyecto, resultado })}>
          Generar memoria PDF
        </button>
        <Pasos pasos={resultado.pasos} />
      </details>

      <ResultadoHidraulicoDeTramo proyecto={proyecto} catalogoArtefactos={catalogoArtefactos} onCambiar={onCambiar} />
    </>
  )
}

export function MotorDemandaPantalla() {
  const [proyecto, setProyecto] = useState<Proyecto>(proyectoInicial)
  const validacion = validarProyecto(proyecto, catalogoArtefactos, coeficientesMayoracion, catalogoSistemasDeTuberia)

  return (
    <div>
      <h1>IUAS — Motor de Demanda</h1>
      <h2>Proyecto de ejemplo — Vivienda unifamiliar</h2>
      <p>
        Se carga una instalación doméstica típica para facilitar la exploración del Motor de
        Demanda. Todos los datos pueden modificarse.
      </p>
      <ProyectoFormulario proyecto={proyecto} onCambiar={setProyecto} />
      {validacion.valido ? (
        <ResultadoDemanda proyecto={proyecto} onCambiar={setProyecto} />
      ) : (
        <ProblemasValidacion problemas={validacion.problemas} />
      )}
      <MetodologiaYFuentesTecnicas />
    </div>
  )
}
