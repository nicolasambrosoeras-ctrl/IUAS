import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { crearProyectoVacio } from '../interfaz/paginas/crearProyectoVacio';
import { proyectoInicial } from '../interfaz/paginas/proyectoDeEjemplo';
import { CLAVE_AUTOSAVE, borrarAutosaveDeProyecto, guardarAutosaveDeProyecto, leerAutosaveDeProyecto } from './autosave';

function crearLocalStorageDePrueba(): Storage {
  const almacen = new Map<string, string>();
  return {
    getItem: (clave: string) => almacen.get(clave) ?? null,
    setItem: (clave: string, valor: string) => {
      almacen.set(clave, valor);
    },
    removeItem: (clave: string) => {
      almacen.delete(clave);
    },
    clear: () => almacen.clear(),
    key: (indice: number) => Array.from(almacen.keys())[indice] ?? null,
    get length() {
      return almacen.size;
    },
  } as Storage;
}

describe('autosave de proyecto', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', crearLocalStorageDePrueba());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('leerAutosaveDeProyecto devuelve "vacio" cuando no hay nada guardado', () => {
    expect(leerAutosaveDeProyecto()).toEqual({ tipo: 'vacio' });
  });

  it('guarda y recupera un proyecto válido', () => {
    const proyecto = proyectoInicial;
    const resultadoGuardado = guardarAutosaveDeProyecto(proyecto);
    expect(resultadoGuardado.ok).toBe(true);

    const resultadoLectura = leerAutosaveDeProyecto();
    expect(resultadoLectura.tipo).toBe('valido');
    if (resultadoLectura.tipo === 'valido') {
      expect(resultadoLectura.proyecto).toEqual(proyecto);
    }
  });

  it('un autosave corrupto no rompe la lectura: se ignora sin borrarlo', () => {
    localStorage.setItem(CLAVE_AUTOSAVE, '{not json');
    const resultado = leerAutosaveDeProyecto();
    expect(resultado.tipo).toBe('corrupto');
    // No se borra en silencio (§31): sigue en storage para diagnosticar.
    expect(localStorage.getItem(CLAVE_AUTOSAVE)).toBe('{not json');
  });

  it('un JSON válido que no es un archivo IUAS también se trata como corrupto', () => {
    localStorage.setItem(CLAVE_AUTOSAVE, JSON.stringify({ hello: 'world' }));
    expect(leerAutosaveDeProyecto().tipo).toBe('corrupto');
  });

  it('borrarAutosaveDeProyecto limpia la clave', () => {
    guardarAutosaveDeProyecto(crearProyectoVacio());
    borrarAutosaveDeProyecto();
    expect(leerAutosaveDeProyecto()).toEqual({ tipo: 'vacio' });
  });

  it('si localStorage.setItem lanza, guardarAutosaveDeProyecto no propaga la excepción', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => {},
    } as unknown as Storage);

    const resultado = guardarAutosaveDeProyecto(crearProyectoVacio());
    expect(resultado.ok).toBe(false);
    if (!resultado.ok) expect(resultado.detalle).toContain('QuotaExceededError');
  });

  it('si localStorage.getItem lanza, leerAutosaveDeProyecto cae a "vacio" sin romper', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => {},
      removeItem: () => {},
    } as unknown as Storage);

    expect(leerAutosaveDeProyecto()).toEqual({ tipo: 'vacio' });
  });
});
