import { describe, expect, it } from 'vitest';
import { crearProyectoVacio } from '../interfaz/paginas/crearProyectoVacio';
import { nombreDeArchivoIuas } from './exportarProyectoIuas';

describe('nombreDeArchivoIuas', () => {
  it('usa proyecto-iuas-YYYYMMDD-HHMM.iuas cuando el proyecto no tiene nombre', () => {
    const proyecto = crearProyectoVacio();
    const nombre = nombreDeArchivoIuas(proyecto, () => new Date('2026-09-13T09:05:00.000Z'));
    expect(nombre).toMatch(/^proyecto-iuas-\d{8}-\d{4}\.iuas$/);
  });

  it('usa el nombre del proyecto cuando existe', () => {
    const proyecto = { ...crearProyectoVacio(), metadatos: { ...crearProyectoVacio().metadatos, nombre: 'Casa Pérez' } };
    expect(nombreDeArchivoIuas(proyecto)).toBe('Casa Pérez.iuas');
  });

  it('sanitiza caracteres ilegales de nombre de archivo', () => {
    const proyecto = {
      ...crearProyectoVacio(),
      metadatos: { ...crearProyectoVacio().metadatos, nombre: 'Proyecto: A/B\\C*D?E"F<G>H|I' },
    };
    const nombre = nombreDeArchivoIuas(proyecto);
    expect(nombre).not.toMatch(/[\\/:*?"<>|]/);
    expect(nombre.endsWith('.iuas')).toBe(true);
  });

  it('cae al nombre por fecha si el nombre sanitizado queda vacío', () => {
    const proyecto = { ...crearProyectoVacio(), metadatos: { ...crearProyectoVacio().metadatos, nombre: '   ' } };
    const nombre = nombreDeArchivoIuas(proyecto, () => new Date('2026-09-13T09:05:00.000Z'));
    expect(nombre).toMatch(/^proyecto-iuas-\d{8}-\d{4}\.iuas$/);
  });
});
