import { describe, it, expect } from 'vitest';
import { describeFontFile, effectiveFamily, fontCssName, fontForStyle, googleFontsBasicUrl, googleFontsUrl, migrateFonts, nextFontName, parseGoogleFontsUrl } from '@/lib/fonts';
import { mergeSyncedTokens, tokensToCss, tokensToJson, tokensToMarkdown } from '@/lib/designTokens';
import type { DesignTokens } from '@/lib/types';

describe('polices', () => {
  it('déduit graisse et italique du nom de fichier', () => {
    expect(describeFontFile('Inter-SemiBold.ttf')).toEqual({ weight: 600, italic: false });
    expect(describeFontFile('Inter-BoldItalic.woff2')).toEqual({ weight: 700, italic: true });
    expect(describeFontFile('Inter-VariableFont_opsz,wght.ttf')).toEqual({ weight: 'variable', italic: false });
    expect(describeFontFile('Inter-Italic-VariableFont_wght.ttf')).toEqual({ weight: 'variable', italic: true });
    expect(describeFontFile('Roboto-Regular.otf')).toEqual({ weight: 400, italic: false });
    expect(describeFontFile('Roboto-ExtraLight.ttf').weight).toBe(200);
  });

  it('construit le lien Google Fonts', () => {
    expect(googleFontsUrl('Playfair Display')).toBe('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,100..900;1,100..900&display=swap');
  });

  it('retrouve l\'adresse Google Fonts dans ce qu\'on colle', () => {
    const url = 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap';
    expect(parseGoogleFontsUrl(url)).toEqual({ url, family: 'Bebas Neue' });
    expect(parseGoogleFontsUrl(`<link href="${url.replace('&', '&amp;')}" rel="stylesheet">`)?.url).toBe(url);
    expect(parseGoogleFontsUrl(`@import url('${url}');`)?.url).toBe(url);
    expect(parseGoogleFontsUrl('https://fonts.googleapis.com/css2?family=Inter:ital,wght@0,100..900&display=swap')?.family).toBe('Inter');
    expect(parseGoogleFontsUrl('https://example.com/police.css')).toBeNull();
    expect(googleFontsBasicUrl('Bebas Neue')).toBe(url);
  });

  const title = { id: 'f1', name: 'font-type-1', family: 'Playfair Display', fallback: 'serif' as const, sources: [{ kind: 'google' as const }] };
  const body = {
    id: 'f2', name: 'font-type-2', family: 'Maison', sources: [
      { kind: 'file' as const, filename: 'Maison-Bold.woff2', weight: 700, italic: false },
      { kind: 'google' as const, url: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap' },
    ],
  };
  const style = (name: string, fontFamily: string, fontRef?: string) => ({
    name, fontFamily, fontRef, fontStyle: 'Bold', fontSize: 32, lineHeight: { unit: 'AUTO' as const }, letterSpacing: { unit: 'PIXELS' as const, value: 0 },
  });
  const tokens: DesignTokens = {
    syncedAt: '2026-10-20T00:00:00.000Z', fileName: 'F', collections: [], colorStyles: [], effectStyles: [],
    fonts: [title, body],
    // « Titre » référence font-type-1 ; « Chapô » est venu de Figma avec la même famille que font-type-2 (lien automatique) ; « Libre » n'a pas de police déclarée.
    textStyles: [style('Titre', 'Inter', 'f1'), style('Chapô', 'Maison'), style('Libre', 'Georgia')],
  };

  it('retrouve la police déclarée d\'un style : référence, sinon même famille', () => {
    expect(fontForStyle(tokens, tokens.textStyles[0])?.name).toBe('font-type-1');
    expect(effectiveFamily(tokens, tokens.textStyles[0])).toBe('Playfair Display');
    expect(fontForStyle(tokens, tokens.textStyles[1])?.name).toBe('font-type-2');
    expect(fontForStyle(tokens, tokens.textStyles[2])).toBeUndefined();
    expect(effectiveFamily(tokens, tokens.textStyles[2])).toBe('Georgia');
  });

  it('nomme les rôles de police', () => {
    expect(nextFontName([])).toBe('font-type-1');
    expect(nextFontName([title])).toBe('font-type-2');
    expect(fontCssName(title)).toBe('--font-type-1');
    expect(fontCssName({ ...title, name: 'Titres' })).toBe('--font-titres');
  });

  it('déclare les polices une fois en CSS et les styles y renvoient', () => {
    const css = tokensToCss(tokens);
    expect(css.startsWith("@import url('https://fonts.googleapis.com/css2?family=Playfair+Display")).toBe(true);
    expect(css).toContain("@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');");
    expect(css).toContain('--font-type-1: "Playfair Display", serif;');
    expect(css).toContain('--font-type-2: "Maison", sans-serif;');
    expect(css).toMatch(/\.text-titre \{\n  font-family: var\(--font-type-1\);/);
    expect(css).toMatch(/\.text-chapo \{\n  font-family: var\(--font-type-2\);/);
    expect(css).toMatch(/\.text-libre \{\n  font-family: "Georgia", sans-serif;/);
    expect(css).toContain('fonts/Maison-Bold.woff2');
  });

  it('exporte les polices en JSON et en Markdown', () => {
    const json = tokensToJson(tokens);
    expect(json.fonts).toMatchObject({ 'font-type-1': { $type: 'fontFamily', $value: ['Playfair Display', 'serif'] } });
    expect(json.textStyles).toMatchObject({ Titre: { $value: { fontFamily: '{fonts.font-type-1}' } }, Libre: { $value: { fontFamily: 'Georgia' } } });
    const md = tokensToMarkdown(tokens);
    expect(md).toContain('### Polices');
    expect(md).toContain('| font-type-1 | `--font-type-1` | Playfair Display, serif | Google Fonts');
    expect(md).toContain('fichier `fonts/Maison-Bold.woff2`');
    expect(md).toContain('| Titre | `.text-titre` | `--font-type-1` (Playfair Display) |');
  });

  it('regroupe l\'ancien format (une entrée par source) par famille', () => {
    const legacy = {
      ...tokens,
      fonts: [
        { id: 'a', family: 'Maison', kind: 'file', filename: 'Maison-Regular.woff2', weight: 400, italic: false },
        { id: 'b', family: 'Maison', kind: 'file', filename: 'Maison-Bold.woff2', weight: 700, italic: false },
        { id: 'c', family: 'Inter', kind: 'google' },
        title,
      ],
    } as unknown as DesignTokens;
    const migrated = migrateFonts(legacy).fonts!;
    expect(migrated.map(f => f.name)).toEqual(['font-type-1', 'Maison', 'Inter']);
    expect(migrated.find(f => f.name === 'Maison')!.sources).toHaveLength(2);
    expect(migrated.find(f => f.name === 'Inter')!.sources).toEqual([{ kind: 'google', url: undefined }]);
  });

  it('une synchronisation garde les polices et la police choisie par un style', () => {
    const incoming: DesignTokens = { ...tokens, fonts: undefined, textStyles: [style('Titre', 'Inter')] };
    const next = mergeSyncedTokens(tokens, incoming);
    expect(next.fonts).toHaveLength(2);
    expect(next.textStyles.find(s => s.name === 'Titre')?.fontRef).toBe('f1');
  });
});

describe('chargement d\'un projet', () => {
  it('migre les anciennes polices à l\'ouverture', async () => {
    const { parseProject } = await import('@/lib/projectSchema');
    const { project } = parseProject({
      id: 'p', name: 'P', components: [],
      tokens: {
        collections: [], textStyles: [], colorStyles: [], effectStyles: [],
        fonts: [{ id: 'a', family: 'Maison', kind: 'file', filename: 'Maison-Bold.woff2', weight: 700, italic: false }, { id: 'b', family: 'Maison', kind: 'google' }],
      },
    });
    expect(project?.tokens?.fonts).toEqual([
      { id: 'a', name: 'Maison', family: 'Maison', sources: [{ kind: 'file', filename: 'Maison-Bold.woff2', weight: 700, italic: false }, { kind: 'google', url: undefined }] },
    ]);
  });
});

describe('ordre des styles de texte', () => {
  it('du plus grand au plus petit, à taille égale dans l\'ordre d\'origine', async () => {
    const { bySizeDesc, tokensToCss: css, tokensToMarkdown: md } = await import('@/lib/designTokens');
    const mk = (name: string, fontSize: number) => ({
      name, fontFamily: 'Inter', fontStyle: 'Regular', fontSize, lineHeight: { unit: 'AUTO' as const }, letterSpacing: { unit: 'PIXELS' as const, value: 0 },
    });
    const styles = [mk('Corps', 16), mk('H1', 48), mk('Légende', 12), mk('H2', 32), mk('Autre 16', 16)];
    expect(bySizeDesc(styles).map(s => s.name)).toEqual(['H1', 'H2', 'Corps', 'Autre 16', 'Légende']);
    const tokens: DesignTokens = { syncedAt: '2026-10-20T00:00:00.000Z', collections: [], colorStyles: [], effectStyles: [], textStyles: styles };
    expect(css(tokens).indexOf('.text-h1')).toBeLessThan(css(tokens).indexOf('.text-corps'));
    expect(css(tokens).indexOf('.text-corps')).toBeLessThan(css(tokens).indexOf('.text-legende'));
    expect(md(tokens).indexOf('| H1 |')).toBeLessThan(md(tokens).indexOf('| Légende |'));
    expect(styles[0].name).toBe('Corps'); // les données ne sont pas réordonnées
  });
});
