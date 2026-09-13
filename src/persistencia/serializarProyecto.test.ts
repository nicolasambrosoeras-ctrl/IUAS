import { describe, expect, it } from 'vitest';
import { crearProyectoVacio } from '../interfaz/paginas/crearProyectoVacio';
import { serializarProyecto } from './serializarProyecto';
import { SCHEMA_VERSION_ARCHIVO_ACTUAL } from './formatoIuas';
import { VERSION_APP } from '../version';

describe('serializarProyecto', () => {
  it('produce un envelope con format, schemaVersion, appVersion, exportedAt y proyecto', () => {
    const proyecto = crearProyectoVacio();
    const archivo = serializarProyecto(proyecto, { ahora: () => new Date('2026-09-13T12:00:00.000Z') });

    expect(archivo.format).toBe('IUAS');
    expect(archivo.schemaVersion).toBe(SCHEMA_VERSION_ARCHIVO_ACTUAL);
    expect(archivo.appVersion).toBe(VERSION_APP);
    expect(archivo.exportedAt).toBe('2026-09-13T12:00:00.000Z');
    expect(archivo.proyecto).toBe(proyecto);
  });

  it('no muta el proyecto recibido', () => {
    const proyecto = crearProyectoVacio();
    const copia = JSON.parse(JSON.stringify(proyecto));
    serializarProyecto(proyecto);
    expect(proyecto).toEqual(copia);
  });

  it('usa la fecha real por defecto (formato ISO válido)', () => {
    const archivo = serializarProyecto(crearProyectoVacio());
    expect(() => new Date(archivo.exportedAt).toISOString()).not.toThrow();
    expect(new Date(archivo.exportedAt).toISOString()).toBe(archivo.exportedAt);
  });
});
