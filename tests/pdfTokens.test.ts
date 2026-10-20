import { describe, it, expect, vi } from 'vitest';
import { createElement } from 'react';
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

vi.mock('@tauri-apps/api/core', () => ({ invoke: vi.fn() }));
vi.mock('@tauri-apps/plugin-dialog', () => ({ save: vi.fn(), open: vi.fn() }));

import type { Project } from '@/lib/types';

const fontDir = path.resolve(__dirname, '../public/fonts/inter');

describe('PDF — design tokens', () => {
  it('contient la page Design tokens avec polices, thèmes, styles et couleurs', async () => {
    const { Font, renderToBuffer } = await import('@react-pdf/renderer');
    const { ProjectPDFDocument } = await import('@/components/pdf/ProjectPDFDocument');
    Font.register({
      family: 'Inter',
      fonts: [
        { src: path.join(fontDir, 'Inter-VariableFont_opsz,wght.ttf') },
        { src: path.join(fontDir, 'Inter-VariableFont_opsz,wght.ttf'), fontWeight: 700 },
        { src: path.join(fontDir, 'Inter-Italic-VariableFont_opsz,wght.ttf'), fontStyle: 'italic' },
      ],
    });
    const project = {
      id: 'p', name: 'La Vilaine', createdAt: '2026-10-20T00:00:00.000Z', components: [],
      tokens: {
        fileName: 'La Vilaine 2025', syncedAt: '2026-10-20T10:00:00.000Z',
        fonts: [{ id: 'f1', name: 'font-type-1', family: 'Erica One', sources: [{ kind: 'google' }] }],
        collections: [{
          name: 'Couleurs', defaultMode: 'La Vilaine', modes: ['La Vilaine', 'Roazhör'], manualModes: ['Roazhör'],
          variables: [
            { name: 'base', type: 'COLOR', values: { 'La Vilaine': '#ffffff', 'Roazhör': '#ecf4f8' } },
            { name: 'fond', type: 'COLOR', origin: 'manual', values: { 'La Vilaine': { alias: 'base', collection: 'Couleurs' }, 'Roazhör': '#000000' } },
          ],
        }],
        textStyles: [
          { name: 'Corps', fontFamily: 'Raleway', fontStyle: 'Regular', fontSize: 16, lineHeight: { unit: 'PIXELS', value: 24 }, letterSpacing: { unit: 'PIXELS', value: 0 } },
          { name: 'Titre 1', fontFamily: 'Erica One', fontStyle: 'Regular', fontSize: 96, lineHeight: { unit: 'AUTO' }, letterSpacing: { unit: 'PIXELS', value: 0 } },
        ],
        colorStyles: [{ name: 'Accent', paints: [{ type: 'SOLID', color: '#b694b5' }] }],
        effectStyles: [{ name: 'Ombre 1', effects: [{ type: 'DROP_SHADOW', color: '#00000040', x: 0, y: 4, blur: 12, spread: 0 }] }],
      },
    } as unknown as Project;

    const buffer = await renderToBuffer(createElement(ProjectPDFDocument, { project }) as never);
    const file = process.env.PDF_OUT ?? path.join(process.env.TMPDIR ?? '.', 'scope-tokens-test.pdf');
    writeFileSync(file, buffer);
    expect(buffer.subarray(0, 4).toString()).toBe('%PDF');

    const text = execFileSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8' });
    expect(text).toContain('DESIGN TOKENS'); // titres de page en capitales
    expect(text).toContain('font-type-1');
    expect(text).toContain("Variables et styles du fichier « La Vilaine 2025 »");
    expect(text).toContain('Erica One');
    expect(text).toContain('Modes (thèmes) : La Vilaine (par défaut), Roazhör');
    expect(text).toContain('--base');
    expect(text).toContain('→ base');
    expect(text).toContain('#ecf4f8');
    expect(text.indexOf('Titre 1')).toBeLessThan(text.indexOf('Corps'));
    expect(text).toContain('Accent');
    expect(text).toContain('ombre 0 4 12 0 #00000040');
  }, 60000);
});
