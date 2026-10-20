import { describe, it, expect } from 'vitest';
import { describeFontFile, googleFontsBasicUrl, googleFontsUrl, parseGoogleFontsUrl } from '@/lib/fonts';
import { mergeSyncedTokens, tokensToCss, tokensToMarkdown } from '@/lib/designTokens';
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

  const tokens: DesignTokens = {
    syncedAt: '2026-10-20T00:00:00.000Z', fileName: 'F', collections: [], colorStyles: [], effectStyles: [],
    textStyles: [{ name: 'Titre', fontFamily: 'Playfair Display', fontStyle: 'Bold', fontSize: 32, lineHeight: { unit: 'AUTO' }, letterSpacing: { unit: 'PIXELS', value: 0 } }],
    fonts: [
      { id: 'g', family: 'Playfair Display', kind: 'google' },
      { id: 'u', family: 'Bebas Neue', kind: 'google', url: 'https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap' },
      { id: 'f', family: 'Maison', kind: 'file', filename: 'Maison-Bold.woff2', weight: 700, italic: false },
    ],
  };

  it('exporte les polices : @import Google en tête, fichier signalé, tableau Markdown', () => {
    const css = tokensToCss(tokens);
    expect(css.startsWith("@import url('https://fonts.googleapis.com/css2?family=Playfair+Display")).toBe(true);
    expect(css).toContain("@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&display=swap');");
    expect(css).toContain('fonts/Maison-Bold.woff2');
    const md = tokensToMarkdown(tokens);
    expect(md).toContain('### Polices');
    expect(md).toContain('| Playfair Display | Google Fonts');
    expect(md).toContain('| Maison | fichier `fonts/Maison-Bold.woff2`');
  });

  it('une synchronisation garde les polices du projet', () => {
    const next = mergeSyncedTokens(tokens, { ...tokens, fonts: undefined });
    expect(next.fonts).toHaveLength(3);
  });
});
