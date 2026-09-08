// CRIT-A39 (D-δ.79): frontera M4→M2 del pelo de agua mínimo efectivo.
// Cubre la composición (descriptor + proyectoParaVerificacion) y las
// invariantes de "no persistir el derivado" y "conservar el manual al
// cambiar de modo". El resto de `resolverEntradasDeVerificacion`
// (origen/Pdisponible/medidores) ya está cubierto vía PanelDePresionDeModulo2
// y resolverResumenDeProyecto.
import { describe, it, expect } from 'vitest'
import type { Proyecto } from '../../modelo/proyecto'
import { catalogoArtefactos } from '../../normativa/eras-2023/catalogo-artefactos'
import { coeficientesMayoracion } from '../../normativa/eras-2023/coeficientes-mayoracion'
import { proyectoInicial } from './proyectoDeEjemplo'
import { backfillLongitudesDePredimensionamiento } from './backfillLongitudesDePredimensionamiento'
import { conCotaDeNodo } from './actualizarRedHidraulica'
import { conEsquemaDeAbastecimiento } from './actualizarConfiguracionAbastecimiento'
import { conDesnivelConexion } from './actualizarParametrosDeConexion'
import {
  aplicarPeloDeAguaMinimoEfectivo,
  resolverEntradasDeVerificacion,
} from './resolverEntradasDeVerificacion'

const entradas = (p: Proyecto) => resolverEntradasDeVerificacion(p, catalogoArtefactos, coeficientesMayoracion)

// proyectoInicial es modo Rápido ('simplificada'). Se le fija el esquema
// de tanque, un pelo de agua manual (raíz 'n-general') y el desnivel de
// alimentación del tanque.
function base(): Proyecto {
  let p = backfillLongitudesDePredimensionamiento(proyectoInicial)
  p = conCotaDeNodo(p, 'n-general', 20) // pelo de agua mínimo manual (Profesional)
  p = conEsquemaDeAbastecimiento(p, 'tanqueElevado')
  p = conDesnivelConexion(p, 10) // punto de alimentación del tanque a +10 m
  return p
}

const conModo = (p: Proyecto, granularidadHidraulica: 'simplificada' | 'profesional'): Proyecto => ({
  ...p,
  configuracionHidraulica: { ...p.configuracionHidraulica, granularidadHidraulica },
})

function cotaRaiz(p: Proyecto): number | undefined {
  return p.redHidraulica?.nodos.find((n) => n.id === 'n-general')?.cota_m
}

describe('resolverEntradasDeVerificacion — pelo de agua mínimo efectivo (CRIT-A39)', () => {
  it('Rápido + tanque elevado: el balance usa la cota estimada (10 − 0,50 = 9,5), no el valor manual', () => {
    const { peloDeAguaMinimoEfectivo, proyectoParaVerificacion } = entradas(conModo(base(), 'simplificada'))

    expect(peloDeAguaMinimoEfectivo).toEqual({
      tipo: 'derivadoRapido',
      cota_m: 9.5,
      desnivelAlimentacionTanque_m: 10,
    })
    expect(cotaRaiz(proyectoParaVerificacion)).toBe(9.5)
  })

  it('el derivado NO se persiste: el Proyecto original conserva el pelo de agua manual (20)', () => {
    const original = conModo(base(), 'simplificada')
    entradas(original)
    expect(cotaRaiz(original)).toBe(20)
  })

  it('Profesional: usa el valor manual (20), sin derivar', () => {
    const { peloDeAguaMinimoEfectivo, proyectoParaVerificacion } = entradas(conModo(base(), 'profesional'))
    expect(peloDeAguaMinimoEfectivo).toEqual({ tipo: 'manual' })
    expect(cotaRaiz(proyectoParaVerificacion)).toBe(20)
  })

  it('round-trip de modo: Profesional (8,7) → Rápido (9,5 derivado) → Profesional (recupera 8,7)', () => {
    let p = conModo(base(), 'profesional')
    p = conCotaDeNodo(p, 'n-general', 8.7)

    expect(cotaRaiz(entradas(p).proyectoParaVerificacion)).toBe(8.7)

    const enRapido = conModo(p, 'simplificada')
    expect(cotaRaiz(entradas(enRapido).proyectoParaVerificacion)).toBe(9.5)
    // el dato manual sigue guardado en el Proyecto, intacto
    expect(cotaRaiz(enRapido)).toBe(8.7)

    const devuelta = conModo(enRapido, 'profesional')
    expect(cotaRaiz(entradas(devuelta).proyectoParaVerificacion)).toBe(8.7)
  })

  it('Rápido + tanque elevado sin desnivel de alimentación: incompletoRapido y raíz sin cota (no cae al manual)', () => {
    const conDesnivel = conModo(base(), 'simplificada')
    const parametrosSinDesnivel = { ...conDesnivel.parametros }
    delete (parametrosSinDesnivel as { desnivelConexion_m?: number }).desnivelConexion_m
    const p: Proyecto = { ...conDesnivel, parametros: parametrosSinDesnivel }

    const { peloDeAguaMinimoEfectivo, proyectoParaVerificacion } = entradas(p)
    expect(peloDeAguaMinimoEfectivo).toEqual({ tipo: 'incompletoRapido' })
    expect(cotaRaiz(proyectoParaVerificacion)).toBeUndefined()
  })

  it('esquema "cisternaBombeoElevado": no deriva, el balance conserva el valor manual', () => {
    const p = conEsquemaDeAbastecimiento(conModo(base(), 'simplificada'), 'cisternaBombeoElevado')
    const { peloDeAguaMinimoEfectivo, proyectoParaVerificacion } = entradas(p)
    expect(peloDeAguaMinimoEfectivo).toEqual({ tipo: 'noAplica' })
    expect(cotaRaiz(proyectoParaVerificacion)).toBe(20)
  })

  it('esquema "directa": no deriva', () => {
    const p = conEsquemaDeAbastecimiento(conModo(base(), 'simplificada'), 'directa')
    expect(entradas(p).peloDeAguaMinimoEfectivo).toEqual({ tipo: 'noAplica' })
  })

  it('aplicarPeloDeAguaMinimoEfectivo("manual" | "noAplica") devuelve el mismo Proyecto sin copiar', () => {
    const p = base()
    expect(aplicarPeloDeAguaMinimoEfectivo(p, { tipo: 'manual' })).toBe(p)
    expect(aplicarPeloDeAguaMinimoEfectivo(p, { tipo: 'noAplica' })).toBe(p)
  })
})
