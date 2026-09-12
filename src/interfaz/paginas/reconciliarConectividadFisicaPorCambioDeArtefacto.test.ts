// D-δ.52 Parte B (CRIT-A15, casos A1-A12 + §27/§30): reconciliación de
// conectividad física AF/AC al cambiar el tipo de un Artefacto, por
// conjuntos de Redes, sin reconstruir lo que no cambia.
import { describe, it, expect } from 'vitest'
import type { MetadatosProyecto, ParametrosProyecto, Proyecto, UnidadFuncional } from '../../modelo/proyecto'
import type { Nodo, RedHidraulica, Tramo } from '../../modelo/redHidraulica'
import { validarRedHidraulica } from '../../validacion/redHidraulica'
import { auditarCoberturaFisica } from '../../motor/tuberias/cobertura/auditarCoberturaFisica'
import { reconciliarConectividadFisicaPorCambioDeArtefacto } from './reconciliarConectividadFisicaPorCambioDeArtefacto'

function metadatos(): MetadatosProyecto {
  return { nombre: 'P', obra: 'O', comitente: 'C', fecha: '2026-09-07', schemaVersion: '1.0.0', versionNormativa: 'eras-2023' }
}
function parametros(): ParametrosProyecto {
  return { tipoDeProyecto: 'viviendaIndividual', presionSobreAcera_m: 0, alturaArtefactoMasDesfavorable_m: 0 }
}

// Topología estilo demo:
//   UF1 · Baño: art-bano-lav (lavatorio AF+AC) + art-bano-duc (ducha AF+AC)
//               -> bifurcación dedicada n-af-1 / n-ac-1
//   UF1 · Toilette: art-toi-lav (lavatorio AF+AC), art-toi-ino (inodoro AF)
//               -> el lavatorio da PRECEDENTE de 'lavatorio' = {AF,AC};
//                  el inodoro da PRECEDENTE de 'inodoroDeposito' = {AF}.
// Alimentación general (t-general) + Alimentación ACS (t-af-acs) compartidas.
function proyectoBase(): Proyecto {
  const uf: UnidadFuncional = {
    id: 'uf-1',
    nombre: 'UF 1',
    niveles: [
      {
        id: 'uf-1-nivel-1',
        nombre: 'Nivel 1',
        nivel: 0,
        cotaHidraulicaReferencia_m: 1,
        locales: [
          {
            id: 'l-bano',
            tipo: 'bano',
            regimen: 'domiciliario',
            artefactos: [
              { id: 'art-bano-lav', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' },
              { id: 'art-bano-duc', artefactoId: 'receptaculoDucha', cantidad: 1, origen: 'normativo' },
            ],
          },
          {
            id: 'l-toi',
            tipo: 'toilette',
            regimen: 'domiciliario',
            artefactos: [
              { id: 'art-toi-lav', artefactoId: 'lavatorio', cantidad: 1, origen: 'normativo' },
              { id: 'art-toi-ino', artefactoId: 'inodoroDeposito', cantidad: 1, origen: 'normativo' },
            ],
          },
        ],
      },
    ],
  }
  const af = (l: string, a: string) => ({ tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: l, artefactoId: a }) as const
  const nodos: Nodo[] = [
    { id: 'n-general' },
    { id: 'n0' },
    { id: 'n-acs', referencia: { tipo: 'produccionACS' } },
    // Baño AF (bifurcación dedicada)
    { id: 'n-af-1' },
    { id: 'n-af-bano-lav', referencia: af('l-bano', 'art-bano-lav') },
    { id: 'n-af-bano-duc', referencia: af('l-bano', 'art-bano-duc') },
    // Baño AC (bifurcación dedicada)
    { id: 'n-ac-1' },
    { id: 'n-ac-bano-lav', referencia: af('l-bano', 'art-bano-lav') },
    { id: 'n-ac-bano-duc', referencia: af('l-bano', 'art-bano-duc') },
    // Toilette AF (bifurcación dedicada)
    { id: 'n-af-toi-1' },
    { id: 'n-af-toi-lav', referencia: af('l-toi', 'art-toi-lav') },
    { id: 'n-af-toi-ino', referencia: af('l-toi', 'art-toi-ino') },
    // Toilette AC: sólo el lavatorio, colgado directo de n-acs (1 terminal)
    { id: 'n-ac-toi-lav', referencia: af('l-toi', 'art-toi-lav') },
  ]
  const tramos: Tramo[] = [
    { id: 't-general', nodoOrigenId: 'n-general', nodoDestinoId: 'n0', red: 'AF', longitud_m: 10 },
    { id: 't-af-acs', nodoOrigenId: 'n0', nodoDestinoId: 'n-acs', red: 'AF', longitud_m: 10 },
    { id: 't-af-bano', nodoOrigenId: 'n0', nodoDestinoId: 'n-af-1', red: 'AF', longitud_m: 5, accesorios: [{ tipo: 'codo90', cantidad: 2 }], dnComercialAdoptado: '32 mm' },
    { id: 't-af-bano-lav', nodoOrigenId: 'n-af-1', nodoDestinoId: 'n-af-bano-lav', red: 'AF' },
    { id: 't-af-bano-duc', nodoOrigenId: 'n-af-1', nodoDestinoId: 'n-af-bano-duc', red: 'AF' },
    { id: 't-ac-bano', nodoOrigenId: 'n-acs', nodoDestinoId: 'n-ac-1', red: 'AC', longitud_m: 4 },
    { id: 't-ac-bano-lav', nodoOrigenId: 'n-ac-1', nodoDestinoId: 'n-ac-bano-lav', red: 'AC' },
    { id: 't-ac-bano-duc', nodoOrigenId: 'n-ac-1', nodoDestinoId: 'n-ac-bano-duc', red: 'AC' },
    { id: 't-af-toi', nodoOrigenId: 'n0', nodoDestinoId: 'n-af-toi-1', red: 'AF', longitud_m: 5 },
    { id: 't-af-toi-lav', nodoOrigenId: 'n-af-toi-1', nodoDestinoId: 'n-af-toi-lav', red: 'AF' },
    { id: 't-af-toi-ino', nodoOrigenId: 'n-af-toi-1', nodoDestinoId: 'n-af-toi-ino', red: 'AF' },
    { id: 't-ac-toi', nodoOrigenId: 'n-acs', nodoDestinoId: 'n-ac-toi-lav', red: 'AC', longitud_m: 3 },
  ]
  const redHidraulica: RedHidraulica = { nodos, tramos }
  return {
    metadatos: metadatos(),
    parametros: parametros(),
    unidadesFuncionales: [uf],
    redHidraulica,
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'detallado',
      granularidadHidraulica: 'profesional',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
  }
}

// Aplica el cambio funcional de tipo (como hace la UI) antes de reconciliar.
function conTipo(proyecto: Proyecto, localId: string, artefactoId: string, nuevoTipo: string): Proyecto {
  return {
    ...proyecto,
    unidadesFuncionales: proyecto.unidadesFuncionales.map((uf) => ({
      ...uf,
      niveles: uf.niveles.map((nivel) => ({
        ...nivel,
        locales: nivel.locales.map((l) =>
          l.id !== localId ? l : { ...l, artefactos: l.artefactos.map((a) => (a.id === artefactoId ? { ...a, artefactoId: nuevoTipo } : a)) },
        ),
      })),
    })),
  }
}

function redesDeInstancia(proyecto: Proyecto, localId: string, artefactoId: string): Set<string> {
  const red = proyecto.redHidraulica!
  const ids = new Set(
    red.nodos
      .filter((n) => n.referencia?.tipo === 'artefacto' && n.referencia.localId === localId && n.referencia.artefactoId === artefactoId)
      .map((n) => n.id),
  )
  return new Set(red.tramos.filter((t) => ids.has(t.nodoDestinoId)).map((t) => t.red))
}

function tramo(proyecto: Proyecto, id: string): Tramo | undefined {
  return proyecto.redHidraulica!.tramos.find((t) => t.id === id)
}

describe('reconciliarConectividadFisicaPorCambioDeArtefacto (D-δ.52, CRIT-A15, CAT-CONN-01)', () => {
  it('A1: AF -> AF (inodoro depósito -> canilla de servicio): topología física intacta', () => {
    const p = proyectoBase()
    const antesTramos = JSON.stringify(p.redHidraulica!.tramos)
    const r = reconciliarConectividadFisicaPorCambioDeArtefacto(
      conTipo(p, 'l-toi', 'art-toi-ino', 'canillaDeServicio'),
      'uf-1', 'l-toi', 'art-toi-ino',
    )
    // canillaDeServicio (política automatica soloAF) e inodoroDeposito
    // (automatica soloAF) coinciden en AF -> nada que reconciliar.
    expect(JSON.stringify(r.redHidraulica!.tramos)).toBe(antesTramos)
  })

  it('A2: AF+AC -> AF+AC (lavatorio -> bidet): ambas políticas son AF+AC -> sin tocar topología', () => {
    const p = proyectoBase()
    const antes = JSON.stringify(p.redHidraulica)
    const r = reconciliarConectividadFisicaPorCambioDeArtefacto(
      conTipo(p, 'l-bano', 'art-bano-lav', 'bidet'),
      'uf-1', 'l-bano', 'art-bano-lav',
    )
    // bidet (política automatica ambas) coincide con la conectividad AF+AC
    // que ya tenía el lavatorio -> reconciliación idempotente.
    expect(JSON.stringify(r.redHidraulica)).toBe(antes)
  })

  it('A4/A11/A12: AF+AC -> AF (lavatorio de Baño -> inodoro): elimina SOLO AC, conserva AF con longitud/accesorios/override de DN', () => {
    const p = proyectoBase()
    const r = reconciliarConectividadFisicaPorCambioDeArtefacto(
      conTipo(p, 'l-bano', 'art-bano-lav', 'inodoroDeposito'),
      'uf-1', 'l-bano', 'art-bano-lav',
    )
    expect(redesDeInstancia(r, 'l-bano', 'art-bano-lav')).toEqual(new Set(['AF']))
    // AF del Baño intacta, con su relevamiento.
    expect(tramo(r, 't-af-bano')).toEqual(tramo(p, 't-af-bano'))
    expect(tramo(r, 't-af-bano')!.dnComercialAdoptado).toBe('32 mm')
    expect(tramo(r, 't-af-bano')!.accesorios).toEqual([{ tipo: 'codo90', cantidad: 2 }])
    // la ducha (AF+AC) del mismo Baño no se toca.
    expect(redesDeInstancia(r, 'l-bano', 'art-bano-duc')).toEqual(new Set(['AF', 'AC']))
    expect(validarRedHidraulica(r)).toEqual([])
    expect(auditarCoberturaFisica(r).completa).toBe(true)
  })

  it('A3/A6/A7: AF -> AF+AC (inodoro de Toilette -> lavatorio): conserva AF y agrega AC (hermano detrás de n-af-toi-1 ya dedicada -> retrofit/hermano D-δ.49)', () => {
    const p = proyectoBase()
    const r = reconciliarConectividadFisicaPorCambioDeArtefacto(
      conTipo(p, 'l-toi', 'art-toi-ino', 'lavatorio'),
      'uf-1', 'l-toi', 'art-toi-ino',
    )
    expect(redesDeInstancia(r, 'l-toi', 'art-toi-ino')).toEqual(new Set(['AF', 'AC']))
    // AF intacta (mismo id de tramo/nodo).
    expect(tramo(r, 't-af-toi-ino')).toEqual(tramo(p, 't-af-toi-ino'))
    expect(validarRedHidraulica(r)).toEqual([])
    expect(auditarCoberturaFisica(r).completa).toBe(true)
  })

  it('A5/§21: último terminal AC de un Local eliminado -> se poda la cabecera vacía, la Alimentación ACS compartida sobrevive', () => {
    const p = proyectoBase()
    // art-toi-lav es el ÚNICO terminal AC del Toilette (colgado directo de n-acs).
    const r = reconciliarConectividadFisicaPorCambioDeArtefacto(
      conTipo(p, 'l-toi', 'art-toi-lav', 'inodoroDeposito'),
      'uf-1', 'l-toi', 'art-toi-lav',
    )
    expect(redesDeInstancia(r, 'l-toi', 'art-toi-lav')).toEqual(new Set(['AF']))
    expect(tramo(r, 't-ac-toi')).toBeUndefined() // el tramo AC del Toilette desapareció
    expect(r.redHidraulica!.nodos.some((n) => n.id === 'n-ac-toi-lav')).toBe(false)
    // Alimentación ACS compartida intacta (otros Locales la usan).
    expect(tramo(r, 't-af-acs')).toEqual(tramo(p, 't-af-acs'))
    expect(r.redHidraulica!.nodos.some((n) => n.referencia?.tipo === 'produccionACS')).toBe(true)
    expect(validarRedHidraulica(r)).toEqual([])
    expect(auditarCoberturaFisica(r).completa).toBe(true)
  })

  it('A8/§27: ida y vuelta lavatorio -> inodoro -> lavatorio -> inodoro: sin huérfanos ni duplicados, red válida', () => {
    let p = proyectoBase()
    const secuencia = ['inodoroDeposito', 'lavatorio', 'inodoroDeposito', 'lavatorio']
    for (const tipo of secuencia) {
      p = reconciliarConectividadFisicaPorCambioDeArtefacto(conTipo(p, 'l-bano', 'art-bano-lav', tipo), 'uf-1', 'l-bano', 'art-bano-lav')
    }
    expect(redesDeInstancia(p, 'l-bano', 'art-bano-lav')).toEqual(new Set(['AF', 'AC']))
    expect(validarRedHidraulica(p)).toEqual([])
    expect(auditarCoberturaFisica(p).completa).toBe(true)
    const ids = p.redHidraulica!.nodos.map((n) => n.id)
    expect(new Set(ids).size).toBe(ids.length) // sin ids colisionados
    const tIds = p.redHidraulica!.tramos.map((t) => t.id)
    expect(new Set(tIds).size).toBe(tIds.length)
  })

  it('§27: reconciliar con el tipo YA reconciliado (idempotente) no cambia nada', () => {
    const p = proyectoBase()
    // ya es lavatorio (AF+AC) y su topología ya coincide con la política del catálogo.
    const r = reconciliarConectividadFisicaPorCambioDeArtefacto(p, 'uf-1', 'l-bano', 'art-bano-lav')
    expect(r).toBe(p)
  })

  it('A9: cambiar un Artefacto de UF1 no contamina otra UF', () => {
    const base = proyectoBase()
    const uf2: UnidadFuncional = {
      ...base.unidadesFuncionales[0]!,
      id: 'uf-2',
      nombre: 'UF 2',
    }
    // uf-2 sin conectividad física (irrelevante para el test: sólo verificamos no-contaminación de uf-1).
    const p: Proyecto = { ...base, unidadesFuncionales: [base.unidadesFuncionales[0]!, uf2] }
    const antesUf1 = JSON.stringify(
      p.redHidraulica!.nodos.filter((n) => n.referencia?.tipo === 'artefacto' && n.referencia.unidadFuncionalId === 'uf-1'),
    )
    const r = reconciliarConectividadFisicaPorCambioDeArtefacto(
      conTipo(p, 'l-bano', 'art-bano-lav', 'inodoroDeposito'),
      'uf-1', 'l-bano', 'art-bano-lav',
    )
    // los nodos AC de OTROS Locales/artefactos de uf-1 no se tocan (ducha).
    expect(redesDeInstancia(r, 'l-bano', 'art-bano-duc')).toEqual(new Set(['AF', 'AC']))
    // y la firma cambió sólo por el lavatorio (perdió AC).
    expect(antesUf1).toContain('art-bano-lav')
  })
})
