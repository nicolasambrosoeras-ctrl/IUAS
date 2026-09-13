import { describe, expect, it } from 'vitest';
import { crearProyectoVacio } from '../interfaz/paginas/crearProyectoVacio';
import { serializarProyecto } from './serializarProyecto';
import { mensajeHumanoDeErrorIuas, parsearArchivoIuas } from './parsearArchivoIuas';
import { SCHEMA_VERSION_ARCHIVO_ACTUAL } from './formatoIuas';

function archivoValidoTexto(): string {
  return JSON.stringify(serializarProyecto(crearProyectoVacio()));
}

describe('parsearArchivoIuas', () => {
  it('acepta un archivo válido y devuelve el Proyecto', () => {
    const resultado = parsearArchivoIuas(archivoValidoTexto());
    expect(resultado.exito).toBe(true);
    if (resultado.exito) {
      expect(resultado.proyecto.metadatos.nombre).toBe('');
      expect(resultado.archivo.schemaVersion).toBe(SCHEMA_VERSION_ARCHIVO_ACTUAL);
    }
  });

  it('rechaza JSON sintácticamente inválido sin lanzar', () => {
    const resultado = parsearArchivoIuas('{not json');
    expect(resultado.exito).toBe(false);
    if (!resultado.exito) {
      expect(resultado.error.codigo).toBe('jsonInvalido');
      expect(mensajeHumanoDeErrorIuas(resultado.error)).not.toMatch(/at position|SyntaxError/i);
    }
  });

  it('rechaza JSON válido que no es un archivo IUAS', () => {
    const resultado = parsearArchivoIuas(JSON.stringify({ hello: 'world' }));
    expect(resultado.exito).toBe(false);
    if (!resultado.exito) {
      expect(resultado.error.codigo).toBe('formatoNoIuas');
    }
  });

  it('rechaza un array o un primitivo en la raíz', () => {
    expect(parsearArchivoIuas(JSON.stringify([1, 2, 3])).exito).toBe(false);
    expect(parsearArchivoIuas(JSON.stringify('texto')).exito).toBe(false);
    expect(parsearArchivoIuas(JSON.stringify(42)).exito).toBe(false);
  });

  it('rechaza un schemaVersion de archivo futuro con mensaje humano específico', () => {
    const archivo = JSON.parse(archivoValidoTexto());
    archivo.schemaVersion = 999;
    const resultado = parsearArchivoIuas(JSON.stringify(archivo));
    expect(resultado.exito).toBe(false);
    if (!resultado.exito) {
      expect(resultado.error.codigo).toBe('schemaArchivoFuturo');
      expect(mensajeHumanoDeErrorIuas(resultado.error)).toBe(
        'Este archivo fue creado con una versión más nueva de IUAS y no puede abrirse con esta versión.',
      );
    }
  });

  it('rechaza un schemaVersion de archivo anterior a 1 (no reconocido)', () => {
    const archivo = JSON.parse(archivoValidoTexto());
    archivo.schemaVersion = 0;
    const resultado = parsearArchivoIuas(JSON.stringify(archivo));
    expect(resultado.exito).toBe(false);
    if (!resultado.exito) {
      expect(resultado.error.codigo).toBe('schemaArchivoNoReconocido');
    }
  });

  it('rechaza un archivo sin schemaVersion', () => {
    const archivo = JSON.parse(archivoValidoTexto());
    delete archivo.schemaVersion;
    const resultado = parsearArchivoIuas(JSON.stringify(archivo));
    expect(resultado.exito).toBe(false);
    if (!resultado.exito) expect(resultado.error.codigo).toBe('schemaArchivoAusente');
  });

  it('rechaza un archivo sin campo proyecto o sin appVersion', () => {
    const archivo = JSON.parse(archivoValidoTexto());
    delete archivo.proyecto;
    expect(parsearArchivoIuas(JSON.stringify(archivo)).exito).toBe(false);

    const archivo2 = JSON.parse(archivoValidoTexto());
    delete archivo2.appVersion;
    expect(parsearArchivoIuas(JSON.stringify(archivo2)).exito).toBe(false);
  });

  it('rechaza un proyecto embebido con schemaVersion futuro (esquema de dominio, no de archivo)', () => {
    const archivo = JSON.parse(archivoValidoTexto());
    archivo.proyecto.metadatos.schemaVersion = '999.0.0';
    const resultado = parsearArchivoIuas(JSON.stringify(archivo));
    expect(resultado.exito).toBe(false);
    if (!resultado.exito) {
      expect(resultado.error.codigo).toBe('proyectoInvalido');
    }
  });

  it('rechaza un proyecto embebido sin schemaVersion de dominio', () => {
    const archivo = JSON.parse(archivoValidoTexto());
    delete archivo.proyecto.metadatos.schemaVersion;
    const resultado = parsearArchivoIuas(JSON.stringify(archivo));
    expect(resultado.exito).toBe(false);
  });

  it('rechaza estructura inválida cuando faltan arrays/objetos obligatorios del proyecto', () => {
    const archivo = JSON.parse(archivoValidoTexto());
    delete archivo.proyecto.unidadesFuncionales;
    const resultado = parsearArchivoIuas(JSON.stringify(archivo));
    expect(resultado.exito).toBe(false);
    if (!resultado.exito) expect(resultado.error.codigo).toBe('estructuraInvalida');
  });

  it('conserva exportedAt cuando está presente y lo deja vacío cuando no', () => {
    const archivo = JSON.parse(archivoValidoTexto());
    const resultado = parsearArchivoIuas(JSON.stringify(archivo));
    expect(resultado.exito).toBe(true);
    if (resultado.exito) expect(resultado.archivo.exportedAt).toBe(archivo.exportedAt);

    delete archivo.exportedAt;
    const resultadoSinFecha = parsearArchivoIuas(JSON.stringify(archivo));
    expect(resultadoSinFecha.exito).toBe(true);
    if (resultadoSinFecha.exito) expect(resultadoSinFecha.archivo.exportedAt).toBe('');
  });

  it('todos los mensajes humanos son texto simple sin trazas de stack', () => {
    const casos = [
      '{not json',
      JSON.stringify({ hello: 'world' }),
      JSON.stringify({ ...JSON.parse(archivoValidoTexto()), schemaVersion: 999 }),
    ];
    for (const caso of casos) {
      const resultado = parsearArchivoIuas(caso);
      if (!resultado.exito) {
        const mensaje = mensajeHumanoDeErrorIuas(resultado.error);
        expect(mensaje).not.toMatch(/\bat\s+\S+:\d+:\d+/);
        expect(mensaje.length).toBeGreaterThan(0);
      }
    }
  });
});
