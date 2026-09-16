// BETA-WEB-METADATA-01 — cubre la metadata pública mínima de `index.html`
// (title, description, Open Graph, favicon, lang/viewport). No parsea HTML:
// alcanza con buscar los fragmentos exactos, igual que hace el resto de la
// suite con archivos de texto. El E2E (`tests/e2e/metadataBeta.spec.ts`)
// cubre el comportamiento real en el navegador (título de pestaña, favicon
// resuelto contra `base`, etc.).
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const raiz = path.dirname(fileURLToPath(import.meta.url));
const html = readFileSync(path.join(raiz, '..', 'index.html'), 'utf-8');

describe('index.html — metadata pública (BETA-WEB-METADATA-01)', () => {
  it('declara lang="es" y viewport estándar sin restringir zoom', () => {
    expect(html).toContain('lang="es"');
    expect(html).toContain('width=device-width, initial-scale=1.0');
    expect(html).not.toContain('user-scalable=no');
  });

  it('tiene un title público descriptivo (no el placeholder de Vite)', () => {
    expect(html).toContain('<title>IUAS — Instalaciones internas de agua</title>');
    expect(html).not.toMatch(/<title>\s*Vite/i);
  });

  it('tiene meta description en español, sin superar un largo razonable', () => {
    const match = html.match(/name="description"\s+content="([^"]+)"/);
    expect(match).not.toBeNull();
    const descripcion = match?.[1] ?? '';
    expect(descripcion.length).toBeGreaterThan(80);
    expect(descripcion.length).toBeLessThan(200);
  });

  it('tiene Open Graph básico (title, description, type, site_name)', () => {
    expect(html).toContain('property="og:title" content="IUAS — Instalaciones internas de agua"');
    expect(html).toContain('property="og:type" content="website"');
    expect(html).toContain('property="og:site_name" content="IUAS"');
    expect(html).toMatch(/property="og:description"\s+content="[^"]+"/);
  });

  it('no incluye og:url ni canonical apuntando a GitHub Pages (dominio propio pendiente)', () => {
    expect(html).not.toContain('og:url');
    expect(html).not.toContain('rel="canonical"');
  });

  it('referencia el favicon respetando el base path de Vite (no hardcodea /IUAS/)', () => {
    expect(html).toContain('href="%BASE_URL%favicon.svg"');
  });

  it('no agrega analytics, trackers ni scripts externos', () => {
    expect(html).not.toContain('googletagmanager');
    expect(html).not.toContain('google-analytics');
    expect(html).not.toContain('fonts.googleapis.com');
  });
});
