import { describe, it, expect } from 'vitest';
import { fontWeight, tokensFromPayload, tokensToCss, tokensToJson, tokensToMarkdown, variableCssNames } from '@/lib/designTokens';
import type { DesignTokens } from '@/lib/types';

const tokens: DesignTokens = {
  fileName: 'La Vilaine',
  syncedAt: '2026-10-20T10:00:00.000Z',
  collections: [
    {
      name: 'Primitives', defaultMode: 'Light', modes: ['Light', 'Dark'],
      variables: [
        { name: 'color/primary', type: 'COLOR', values: { Light: '#1a2b3c', Dark: '#ffffff' } },
        { name: 'color/surface', type: 'COLOR', values: { Light: { alias: 'color/primary', collection: 'Primitives' }, Dark: '#000000' } },
        { name: 'spacing/4', type: 'FLOAT', values: { Light: 16, Dark: 16 } },
        { name: 'font/family', type: 'STRING', values: { Light: 'Inter', Dark: 'Inter' } },
        { name: 'flag/new', type: 'BOOLEAN', values: { Light: true, Dark: true } },
      ],
    },
    { name: 'Marque', defaultMode: 'Mode 1', modes: ['Mode 1'], variables: [{ name: 'color/primary', type: 'COLOR', values: { 'Mode 1': '#ff0000' } }] },
  ],
  textStyles: [{
    name: 'Heading/H1', fontFamily: 'Inter', fontStyle: 'Semi Bold Italic', fontSize: 40,
    lineHeight: { unit: 'PIXELS', value: 48 }, letterSpacing: { unit: 'PERCENT', value: -2 }, textCase: 'UPPER',
  }],
  colorStyles: [
    { name: 'Brand/Primary', paints: [{ type: 'SOLID', color: '#1a2b3c' }] },
    { name: 'Hero', paints: [{ type: 'GRADIENT_LINEAR', stops: [{ position: 0, color: '#000000' }, { position: 1, color: '#ffffff' }] }] },
  ],
  effectStyles: [{ name: 'Elevation/1', effects: [{ type: 'DROP_SHADOW', color: '#00000040', x: 0, y: 4, blur: 12, spread: 0 }] }],
};

describe('designTokens', () => {
  it('déduit la graisse CSS du style de police', () => {
    expect(fontWeight('Regular')).toBe(400);
    expect(fontWeight('Semi Bold Italic')).toBe(600);
    expect(fontWeight('Extra Bold')).toBe(800);
    expect(fontWeight('Bold')).toBe(700);
    expect(fontWeight('Light')).toBe(300);
  });

  it('préfixe par la collection les variables de même nom', () => {
    const names = variableCssNames(tokens.collections);
    expect(names.get('Primitives/color/primary')).toBe('--primitives-color-primary');
    expect(names.get('Marque/color/primary')).toBe('--marque-color-primary');
    expect(names.get('Primitives/spacing/4')).toBe('--spacing-4');
  });

  it('génère le CSS : mode par défaut, autres modes, alias, unités, styles', () => {
    const css = tokensToCss(tokens);
    expect(css).toContain('--primitives-color-primary: #1a2b3c;');
    expect(css).toContain('--color-surface: var(--primitives-color-primary);');
    expect(css).toContain('--spacing-4: 16px;');
    expect(css).toContain('--font-family: "Inter";');
    expect(css).not.toContain('flag-new');
    expect(css).toMatch(/\[data-mode="dark"\] \{[^}]*--primitives-color-primary: #ffffff;[^}]*--color-surface: #000000;/);
    expect(css).not.toMatch(/\[data-mode="dark"\] \{[^}]*--spacing-4/);
    expect(css).toContain('--color-style-brand-primary: #1a2b3c;');
    expect(css).toContain('--color-style-hero: linear-gradient(to right, #000000 0%, #ffffff 100%);');
    expect(css).toContain('--shadow-elevation-1: 0px 4px 12px 0px #00000040;');
    expect(css).toContain('.text-heading-h1 {');
    expect(css).toContain('font-weight: 600;');
    expect(css).toContain('font-style: italic;');
    expect(css).toContain('line-height: 48px;');
    expect(css).toContain('letter-spacing: -0.02em;');
    expect(css).toContain('text-transform: uppercase;');
  });

  it('génère le JSON au format Design Tokens, par collection et par mode', () => {
    const json = tokensToJson(tokens);
    expect(json.variables.Primitives.Light).toMatchObject({
      color: { primary: { $type: 'color', $value: '#1a2b3c' }, surface: { $value: '{color.primary}' } },
      spacing: { '4': { $type: 'number', $value: 16 } },
    });
    expect(json.variables.Primitives.Dark).toMatchObject({ color: { surface: { $value: '#000000' } } });
    expect(json.textStyles).toMatchObject({ Heading: { H1: { $type: 'typography', $value: { fontWeight: 600, fontSize: '40px', lineHeight: '48px', letterSpacing: '-0.02em' } } } });
  });

  it('écrit les tableaux Markdown', () => {
    const md = tokensToMarkdown(tokens);
    expect(md).toContain('## Design tokens');
    expect(md).toContain('### Variables — Primitives (modes : Light, Dark)');
    expect(md).toContain('| color/primary | `--primitives-color-primary` | `#1a2b3c` | `#ffffff` |');
    expect(md).toContain('| color/surface | `--color-surface` | → `color/primary` | `#000000` |');
    expect(md).toContain('| Heading/H1 | `.text-heading-h1` | Inter | 40 px | 600 italique | 48px | -0.02em |');
    expect(tokensToMarkdown(undefined)).toBe('');
    expect(tokensToMarkdown({ ...tokens, collections: [], textStyles: [], colorStyles: [], effectStyles: [] })).toBe('');
  });

  it('normalise un payload incomplet', () => {
    const fromPlugin = tokensFromPayload({ kind: 'tokens', fileName: 'F', collections: [], textStyles: 'oops' as never }, '2026-01-01T00:00:00.000Z');
    expect(fromPlugin).toMatchObject({ fileName: 'F', syncedAt: '2026-01-01T00:00:00.000Z', collections: [], textStyles: [], colorStyles: [], effectStyles: [] });
  });
});
