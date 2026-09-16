// BETA-WEB-METADATA-01 — antes de este slice `package.json` y
// `src/version.ts` divergían (ambos en "0.1.0" mientras ya existían tags
// reales `v0.4.0-beta.1..5`). Este test fija la invariante: la única
// fuente de verdad de la versión de la app (`VERSION_APP`) debe coincidir
// siempre con `package.json.version`, y no puede quedar en el valor viejo.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { VERSION_APP } from './version';

describe('VERSION_APP', () => {
  it('coincide con package.json.version', () => {
    const raiz = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
    const pkg = JSON.parse(readFileSync(path.join(raiz, 'package.json'), 'utf-8')) as { version: string };
    expect(VERSION_APP).toBe(pkg.version);
  });

  it('ya no es el placeholder de desarrollo "0.1.0"', () => {
    expect(VERSION_APP).not.toBe('0.1.0');
  });
});
