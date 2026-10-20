import { describe, it, expect } from 'vitest';
import { emptyTokens, fontStyleName, fontWeight, mergeSyncedTokens, tokenSource, tokensFromPayload, tokensToCss, tokensToJson, tokensToMarkdown, variableCssNames } from '@/lib/designTokens';
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
    expect(md).toContain('### Variables — Primitives (modes : Light — par défaut, Dark)');
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

describe('tokens saisis dans SCOPE', () => {
  const synced = tokens;
  const edited: DesignTokens = {
    ...synced,
    collections: [
      {
        ...synced.collections[0],
        variables: [
          // modifiée dans SCOPE : protégée
          { name: 'color/primary', type: 'COLOR', origin: 'manual', values: { Light: '#abcdef', Dark: '#abcdef' } },
          // créée dans SCOPE : conservée
          { name: 'color/accent', type: 'COLOR', origin: 'manual', values: { Light: '#00ff00', Dark: '#00ff00' } },
          // reçue de la source, absente du prochain envoi : disparaît
          { name: 'old/token', type: 'FLOAT', values: { Light: 1, Dark: 1 } },
        ],
      },
      { name: 'Perso', origin: 'manual', defaultMode: 'Mode 1', modes: ['Mode 1'], variables: [{ name: 'x', type: 'FLOAT', origin: 'manual', values: { 'Mode 1': 4 } }] },
    ],
    textStyles: [{ ...synced.textStyles[0], origin: 'manual', fontSize: 99 }, { ...synced.textStyles[0], name: 'Corps', origin: 'manual' }],
    colorStyles: [], effectStyles: [],
  };

  it('la synchronisation remplace la source mais garde ce qui est à SCOPE', () => {
    const next = mergeSyncedTokens(edited, { ...synced, syncedAt: '2026-11-01T00:00:00.000Z' });
    const primitives = next.collections.find(c => c.name === 'Primitives')!;
    expect(primitives.variables.find(v => v.name === 'color/primary')?.values.Light).toBe('#abcdef');
    expect(primitives.variables.map(v => v.name)).toContain('color/accent');
    expect(primitives.variables.map(v => v.name)).not.toContain('old/token');
    expect(primitives.variables.map(v => v.name)).toContain('spacing/4');
    expect(next.collections.map(c => c.name)).toEqual(['Primitives', 'Marque', 'Perso']);
    expect(next.textStyles.find(s => s.name === 'Heading/H1')?.fontSize).toBe(99);
    expect(next.textStyles.map(s => s.name)).toContain('Corps');
    expect(next.syncedAt).toBe('2026-11-01T00:00:00.000Z');
  });

  it('le premier envoi sur un projet sans tokens les reprend tels quels', () => {
    expect(mergeSyncedTokens(undefined, synced)).toEqual(synced);
  });

  it('décrit la provenance des tokens', () => {
    expect(tokenSource(synced)).toContain('synchronisés le 2026-10-20');
    expect(tokenSource(edited)).toContain('complétés dans SCOPE');
    expect(tokenSource({ ...emptyTokens(), colorStyles: [{ name: 'a', origin: 'manual', paints: [] }] })).toBe('saisis dans SCOPE');
  });

  it('exporte des tokens sans fichier source', () => {
    const own: DesignTokens = { ...emptyTokens(), colorStyles: [{ name: 'Marque', origin: 'manual', paints: [{ type: 'SOLID', color: '#123456' }] }] };
    expect(tokensToCss(own)).toContain('--color-style-marque: #123456;');
    expect(tokensToMarkdown({ ...own, collections: [{ name: 'C', defaultMode: 'M', modes: ['M'], variables: [{ name: 'v', type: 'FLOAT', values: { M: 1 } }] }] })).toContain('saisis dans SCOPE');
  });

  it('nomme le style de police d\'après la graisse', () => {
    expect(fontStyleName(600, false)).toBe('Semi Bold');
    expect(fontStyleName(700, true)).toBe('Bold Italic');
    expect(fontWeight(fontStyleName(300, true))).toBe(300);
  });
});

describe('collections de variables : modes et renommages', () => {
  const synced = tokens.collections[0]; // collection de la source (Light / Dark)
  const own: DesignTokens = {
    ...tokens,
    collections: [{ name: 'Thème', origin: 'manual', defaultMode: 'La Vilaine', modes: ['La Vilaine'], variables: [
      { name: 'fond', type: 'COLOR', origin: 'manual', values: { 'La Vilaine': { alias: 'color/primary', collection: 'Primitives' } } },
    ] }, ...tokens.collections],
  };

  it('ajoute un mode à une collection de la source, copié du mode par défaut', async () => {
    const { addMode, isManualMode } = await import('@/lib/designTokens');
    const next = addMode(synced, 'Sombre');
    expect(next.modes).toEqual(['Light', 'Dark', 'Sombre']);
    expect(next.manualModes).toEqual(['Sombre']);
    expect(next.variables[0].values.Sombre).toBe('#1a2b3c');
    expect(isManualMode(next, 'Sombre')).toBe(true);
    expect(isManualMode(next, 'Dark')).toBe(false);
    expect(addMode(next, 'Sombre')).toBe(next);
  });

  it('une synchronisation garde les modes ajoutés et leurs valeurs', async () => {
    const { addMode } = await import('@/lib/designTokens');
    const withMode = { ...tokens, collections: [addMode(synced, 'Sombre'), ...tokens.collections.slice(1)] };
    withMode.collections[0].variables[0].values.Sombre = '#123456';
    const next = mergeSyncedTokens(withMode, tokens);
    const primitives = next.collections[0];
    expect(primitives.modes).toEqual(['Light', 'Dark', 'Sombre']);
    expect(primitives.manualModes).toEqual(['Sombre']);
    expect(primitives.variables[0].values.Sombre).toBe('#123456');
    expect(primitives.variables[0].values.Light).toBe('#1a2b3c');
  });

  it('renomme et supprime un mode créé dans SCOPE, pas ceux de la source', async () => {
    const { addMode, renameMode, removeMode } = await import('@/lib/designTokens');
    const withMode = addMode(synced, 'Sombre');
    const renamed = renameMode(withMode, 'Sombre', 'Nuit');
    expect(renamed.modes).toContain('Nuit');
    expect(renamed.manualModes).toEqual(['Nuit']);
    expect(renamed.variables[0].values.Nuit).toBe('#1a2b3c');
    expect(renamed.variables[0].values.Sombre).toBeUndefined();
    expect(renameMode(withMode, 'Light', 'Clair')).toBe(withMode);
    const removed = removeMode(renamed, 'Nuit');
    expect(removed.modes).toEqual(['Light', 'Dark']);
    expect(removed.manualModes).toBeUndefined();
    expect(removeMode(withMode, 'Dark')).toBe(withMode);
  });

  it('ne supprime pas le dernier mode et déplace le mode par défaut', async () => {
    const { addMode, removeMode } = await import('@/lib/designTokens');
    const solo = own.collections[0];
    expect(removeMode(solo, 'La Vilaine')).toBe(solo);
    const two = addMode(solo, 'Roazhör');
    expect(removeMode(two, 'La Vilaine').defaultMode).toBe('Roazhör');
  });

  it('renomme une collection ou une variable en suivant les alias', async () => {
    const { renameInTokens, aliasTargets } = await import('@/lib/designTokens');
    const renamedVar = renameInTokens(own, 'Primitives', { variable: 'color/primary' }, { variable: 'color/brand' });
    expect(renamedVar.collections[1].variables.map(v => v.name)).toContain('color/brand');
    expect(renamedVar.collections[0].variables[0].values['La Vilaine']).toEqual({ alias: 'color/brand', collection: 'Primitives' });
    const renamedCollection = renameInTokens(own, 'Primitives', {}, { collection: 'Base' });
    expect(renamedCollection.collections[1].name).toBe('Base');
    expect(renamedCollection.collections[0].variables[0].values['La Vilaine']).toEqual({ alias: 'color/primary', collection: 'Base' });
    // les alias possibles : même type, sauf soi-même
    const targets = aliasTargets(own, 'Thème', own.collections[0].variables[0]);
    expect(targets.map(t => t.name)).toEqual(expect.arrayContaining(['color/primary', 'color/surface']));
    expect(targets.some(t => t.name === 'spacing/4')).toBe(false);
    expect(targets.some(t => t.collection === 'Thème')).toBe(false);
  });
});

describe('documentation des modes (thèmes)', () => {
  it('explique comment activer un mode et marque le mode par défaut', () => {
    const themed: DesignTokens = {
      ...tokens,
      collections: [{
        name: 'Couleurs', defaultMode: 'La Vilaine', modes: ['La Vilaine', 'Roazhör'],
        variables: [{ name: 'base', type: 'COLOR', values: { 'La Vilaine': '#ffffff', 'Roazhör': '#ecf4f8' } }],
      }],
    };
    const md = tokensToMarkdown(themed);
    expect(md).toContain('(modes : La Vilaine — par défaut, Roazhör)');
    expect(md).toContain('`data-mode="roazhor"`');
    expect(md).toContain('s\'applique par défaut (`:root`)');
    expect(tokensToCss(themed)).toContain('[data-mode="roazhor"]');
  });
});
