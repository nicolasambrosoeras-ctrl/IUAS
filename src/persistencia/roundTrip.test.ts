import { describe, expect, it } from 'vitest';
import type { Proyecto } from '../modelo/proyecto';
import { SCHEMA_VERSION_ACTUAL } from '../modelo/proyecto';
import { serializarProyecto } from './serializarProyecto';
import { parsearArchivoIuas } from './parsearArchivoIuas';

// Proyecto complejo a propósito (§25 del brief PERSIST-01): multinivel,
// varios Locales, artefactos con y sin overrides, topología M2 con
// montante/tee/DN manual, M3 y M4 con inputs reales. Cubre en un solo
// fixture los casos de herencia/override/topología/IDs que exige el
// round-trip.
function proyectoComplejoDeFixture(): Proyecto {
  return {
    metadatos: {
      nombre: 'Edificio de prueba',
      obra: 'Obra X',
      comitente: 'Comitente Y',
      fecha: '2026-01-01',
      schemaVersion: SCHEMA_VERSION_ACTUAL,
      versionNormativa: 'eras-2023',
    },
    parametros: {
      tipoDeProyecto: 'viviendaMultifamiliar',
      presionSobreAcera_m: 15,
      alturaArtefactoMasDesfavorable_m: 6,
      diametroNominalConexion_m: 0.025,
      desnivelConexion_m: -1.2,
    },
    unidadesFuncionales: [
      {
        id: 'uf-1',
        nombre: 'Depto 1',
        niveles: [
          {
            id: 'nivel-pb',
            nombre: 'Planta Baja',
            nivel: 0,
            cotaHidraulicaReferencia_m: 0,
            locales: [
              {
                id: 'local-bano-pb',
                tipo: 'bano',
                regimen: 'domiciliario',
                // Sin cotaPiso_m: hereda del Nivel (§9 -- no materializar).
                artefactos: [
                  {
                    id: 'artefacto-inodoro-pb',
                    artefactoId: 'inodoroConMochila',
                    cantidad: 1,
                    origen: 'normativo',
                    conectividadElegida: 'soloAF',
                    // Sin alturaHidraulicaSobrePiso_m: hereda de la Tabla IUAS.
                  },
                  {
                    id: 'artefacto-ducha-pb',
                    artefactoId: 'ducha',
                    cantidad: 1,
                    origen: 'normativo',
                    // Override explícito de altura.
                    alturaHidraulicaSobrePiso_m: 2.2,
                  },
                ],
              },
            ],
          },
          {
            id: 'nivel-pa',
            nombre: 'Planta Alta',
            nivel: 1,
            cotaHidraulicaReferencia_m: 3,
            locales: [
              {
                id: 'local-bano-pa',
                tipo: 'bano',
                regimen: 'domiciliario',
                // Override explícito de cota de piso (deja de heredar del Nivel).
                cotaPiso_m: 3.5,
                artefactos: [
                  {
                    id: 'artefacto-lavatorio-pa',
                    artefactoId: 'lavatorio',
                    cantidad: 1,
                    origen: 'normativo',
                  },
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'uf-2',
        nombre: 'Depto 2',
        niveles: [
          {
            id: 'nivel-unico-uf2',
            nombre: 'Único',
            locales: [
              {
                id: 'local-cocina-uf2',
                tipo: 'cocina',
                regimen: 'domiciliario',
                artefactos: [
                  {
                    id: 'artefacto-pileta-uf2',
                    artefactoId: 'piletaDeCocina',
                    cantidad: 1,
                    origen: 'usuario',
                    conectividadElegida: 'ambas',
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
    redHidraulica: {
      nodos: [
        { id: 'nodo-raiz', cota_m: 0 },
        {
          id: 'nodo-tee-1',
          cota_m: 3,
          tee: { tipo: 'entradaPorExtremo', tramoSalidaRectaId: 'tramo-recto-1' },
        },
        {
          id: 'nodo-artefacto-inodoro-pb',
          referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano-pb', artefactoId: 'artefacto-inodoro-pb' },
        },
        {
          id: 'nodo-artefacto-ducha-pb',
          referencia: { tipo: 'artefacto', unidadFuncionalId: 'uf-1', localId: 'local-bano-pb', artefactoId: 'artefacto-ducha-pb' },
        },
      ],
      tramos: [
        {
          id: 'tramo-montante',
          nodoOrigenId: 'nodo-raiz',
          nodoDestinoId: 'nodo-tee-1',
          red: 'AF',
          longitud_m: 3,
          longitudEsSugerida: false,
          montanteId: 'montante-af-1',
        },
        {
          id: 'tramo-recto-1',
          nodoOrigenId: 'nodo-tee-1',
          nodoDestinoId: 'nodo-artefacto-inodoro-pb',
          red: 'AF',
          longitud_m: 1.5,
          accesorios: [
            { tipo: 'codo90', cantidad: 2 },
            { tipo: 'llaveDePaso', cantidad: 1 },
          ],
          // DN manual adoptado por el proyectista (§9 -- override).
          dnComercialAdoptado: '25 mm',
        },
        {
          id: 'tramo-lateral-1',
          nodoOrigenId: 'nodo-tee-1',
          nodoDestinoId: 'nodo-artefacto-ducha-pb',
          red: 'AF',
          longitud_m: 1,
          accesorios: [],
        },
      ],
    },
    montantes: [{ id: 'montante-af-1', red: 'AF', nombre: 'Montante AF dormitorios' }],
    configuracionHidraulica: {
      metodoPerdidaDistribuida: 'hazenWilliams',
      metodoPerdidaLocalizada: 'detallado',
      granularidadHidraulica: 'profesional',
      materialTuberiaId: 'ppr',
      sistemaDeTuberiaId: 'acquaSystemMagnumPn20',
    },
    configuracionMedidores: {
      esPropiedadHorizontal: true,
      tipoProvisionACS: 'individual',
      medidorGeneralAdoptadoDN: 20,
      medidoresIndividualesAdoptadosDN: { 'uf-1|AF': 15 },
    },
    configuracionAbastecimiento: {
      esquema: 'tanqueElevado',
      periodoConsumoMaximo_h: 2,
      volumenTanqueElevadoAdoptado_m3: 5,
    },
    modoTrabajo: 'profesional',
  };
}

describe('round-trip export -> import de un proyecto complejo', () => {
  const proyectoA = proyectoComplejoDeFixture();
  const archivo = serializarProyecto(proyectoA, { ahora: () => new Date('2026-09-13T10:00:00.000Z') });
  const textoExportado = JSON.stringify(archivo, null, 2);
  const resultado = parsearArchivoIuas(textoExportado);

  it('el import tiene éxito', () => {
    expect(resultado.exito).toBe(true);
  });

  it('el proyecto importado es semánticamente equivalente al original', () => {
    if (!resultado.exito) throw new Error('import falló');
    expect(resultado.proyecto).toEqual(proyectoA);
  });

  it('conserva los IDs de UF, niveles, locales, artefactos, nodos, tramos y montantes', () => {
    if (!resultado.exito) throw new Error('import falló');
    const b = resultado.proyecto;
    expect(b.unidadesFuncionales.map((uf) => uf.id)).toEqual(['uf-1', 'uf-2']);
    expect(b.unidadesFuncionales[0]!.niveles.map((n) => n.id)).toEqual(['nivel-pb', 'nivel-pa']);
    expect(b.unidadesFuncionales[0]!.niveles[0]!.locales[0]!.id).toBe('local-bano-pb');
    expect(b.unidadesFuncionales[0]!.niveles[0]!.locales[0]!.artefactos.map((a) => a.id)).toEqual([
      'artefacto-inodoro-pb',
      'artefacto-ducha-pb',
    ]);
    expect(b.redHidraulica?.nodos.map((n) => n.id)).toEqual([
      'nodo-raiz',
      'nodo-tee-1',
      'nodo-artefacto-inodoro-pb',
      'nodo-artefacto-ducha-pb',
    ]);
    expect(b.montantes?.[0]!.id).toBe('montante-af-1');
  });

  it('preserva la AUSENCIA de override de cota heredada (no la materializa)', () => {
    if (!resultado.exito) throw new Error('import falló');
    const localHeredado = resultado.proyecto.unidadesFuncionales[0]!.niveles[0]!.locales[0]!;
    expect('cotaPiso_m' in localHeredado).toBe(false);
    expect(localHeredado.cotaPiso_m).toBeUndefined();
  });

  it('preserva el override explícito de cota cuando existe', () => {
    if (!resultado.exito) throw new Error('import falló');
    const localConOverride = resultado.proyecto.unidadesFuncionales[0]!.niveles[1]!.locales[0]!;
    expect(localConOverride.cotaPiso_m).toBe(3.5);
  });

  it('preserva la ausencia de override de altura de artefacto heredada', () => {
    if (!resultado.exito) throw new Error('import falló');
    const artefactoHeredado = resultado.proyecto.unidadesFuncionales[0]!.niveles[0]!.locales[0]!.artefactos[0]!;
    expect('alturaHidraulicaSobrePiso_m' in artefactoHeredado).toBe(false);
  });

  it('preserva el override explícito de altura de artefacto', () => {
    if (!resultado.exito) throw new Error('import falló');
    const artefactoConOverride = resultado.proyecto.unidadesFuncionales[0]!.niveles[0]!.locales[0]!.artefactos[1]!;
    expect(artefactoConOverride.alturaHidraulicaSobrePiso_m).toBe(2.2);
  });

  it('preserva la topología M2: tee, DN manual, montanteId y accesorios', () => {
    if (!resultado.exito) throw new Error('import falló');
    const tramos = resultado.proyecto.redHidraulica?.tramos ?? [];
    const tramoMontante = tramos.find((t) => t.id === 'tramo-montante');
    const tramoConDnManual = tramos.find((t) => t.id === 'tramo-recto-1');
    expect(tramoMontante?.montanteId).toBe('montante-af-1');
    expect(tramoConDnManual?.dnComercialAdoptado).toBe('25 mm');
    expect(tramoConDnManual?.accesorios).toEqual([
      { tipo: 'codo90', cantidad: 2 },
      { tipo: 'llaveDePaso', cantidad: 1 },
    ]);
    const nodoTee = resultado.proyecto.redHidraulica?.nodos.find((n) => n.id === 'nodo-tee-1');
    expect(nodoTee?.tee).toEqual({ tipo: 'entradaPorExtremo', tramoSalidaRectaId: 'tramo-recto-1' });
  });

  it('preserva los inputs de M3 y M4', () => {
    if (!resultado.exito) throw new Error('import falló');
    expect(resultado.proyecto.configuracionMedidores).toEqual(proyectoA.configuracionMedidores);
    expect(resultado.proyecto.configuracionAbastecimiento).toEqual(proyectoA.configuracionAbastecimiento);
  });

  it('exportar dos veces seguidas produce el mismo proyecto (ignorando exportedAt)', () => {
    if (!resultado.exito) throw new Error('import falló');
    const segundoArchivo = serializarProyecto(resultado.proyecto, { ahora: () => new Date('2026-09-14T00:00:00.000Z') });
    expect(segundoArchivo.proyecto).toEqual(proyectoA);
  });

  it('el JSON exportado no contiene resultados derivados conocidos', () => {
    const clavesProhibidas = [
      'presidual',
      'presionresidual',
      'hfdistribuida',
      'hflocalizada',
      'hfmedidor',
      'terminalcritico',
      'qconn',
      'pcalc',
      'vreserva',
      'velocidadcalculada',
    ];
    function recolectarClaves(valor: unknown, acumulador: Set<string>): void {
      if (Array.isArray(valor)) {
        valor.forEach((item) => recolectarClaves(item, acumulador));
        return;
      }
      if (typeof valor === 'object' && valor !== null) {
        for (const [clave, hijo] of Object.entries(valor)) {
          acumulador.add(clave.toLowerCase());
          recolectarClaves(hijo, acumulador);
        }
      }
    }
    const claves = new Set<string>();
    recolectarClaves(JSON.parse(textoExportado), claves);
    for (const prohibida of clavesProhibidas) {
      expect(claves.has(prohibida)).toBe(false);
    }
  });
});
