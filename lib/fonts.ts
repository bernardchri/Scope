import { DesignTokens, FontSource, FontToken, TextStyleToken } from './types';

const BASES = ['monospace', 'serif', 'sans-serif'];

/**
 * La police est-elle utilisable par l'aperçu (installée sur la machine, fournie avec l'app ou déjà chargée) ?
 * Mesure un texte avec et sans elle : si la largeur ne change dans aucune des polices de repli, c'est qu'elle manque.
 * (`document.fonts.check` répond « oui » pour une police inconnue, il ne sert pas ici.)
 */
export function isFontAvailable(family: string): boolean {
  if (typeof document === 'undefined' || !family.trim()) return false;
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return false;
  const width = (font: string) => {
    ctx.font = `72px ${font}`;
    return ctx.measureText('mmmmmmmmmmlli WwQq').width;
  };
  const quoted = JSON.stringify(family);
  return BASES.some(base => width(`${quoted}, ${base}`) !== width(base));
}

/** Lien Google Fonts de la famille, toutes graisses (100 à 900) et italiques. */
export function googleFontsUrl(family: string): string {
  return `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family.trim()).replace(/%20/g, '+')}:ital,wght@0,100..900;1,100..900&display=swap`;
}

/** Lien Google Fonts réduit au strict minimum (graisse normale) : certaines familles n'ont ni italique ni graisses variables. */
export const googleFontsBasicUrl = (family: string) =>
  `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family.trim()).replace(/%20/g, '+')}&display=swap`;

/**
 * URL d'une feuille Google Fonts dans un texte collé : l'adresse seule, un `<link href="…">` ou un
 * `@import url(…)` tels que les donne le site. Renvoie aussi la famille lue dans l'adresse.
 */
export function parseGoogleFontsUrl(text: string): { url: string; family?: string } | null {
  const match = text.match(/https?:\/\/fonts\.googleapis\.com\/css2?\?[^\s'"<>)]+/i);
  if (!match) return null;
  const url = match[0].replace(/&amp;/g, '&');
  const family = new URL(url).searchParams.get('family')?.split(':')[0].replace(/\+/g, ' ');
  return { url, family: family || undefined };
}

const WEIGHT_WORDS: [RegExp, number][] = [
  [/thin|hairline/i, 100], [/extra-?light|ultra-?light/i, 200], [/light/i, 300], [/medium/i, 500],
  [/semi-?bold|demi-?bold/i, 600], [/extra-?bold|ultra-?bold/i, 800], [/black|heavy/i, 900], [/bold/i, 700],
];

/** Graisse et italique d'un fichier de police, d'après son nom (« Inter-SemiBoldItalic.ttf », « Inter-VariableFont_wght.ttf »). */
export function describeFontFile(filename: string): { weight: number | 'variable'; italic: boolean } {
  const italic = /italic|oblique/i.test(filename);
  if (/variable|\[.*wght.*\]/i.test(filename)) return { weight: 'variable', italic };
  return { weight: WEIGHT_WORDS.find(([pattern]) => pattern.test(filename))?.[1] ?? 400, italic };
}

/** Descripteur CSS (`font-weight`) d'un fichier de police : une graisse, ou la plage d'une police variable. */
export const fontFileWeight = (source: Extract<FontSource, { kind: 'file' }>): string =>
  source.weight === 'variable' ? '100 900' : String(source.weight);

const slug = (value: string) =>
  value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/** Propriété CSS d'une police déclarée : « font-type-1 » → `--font-type-1`, « Titres » → `--font-titres`. */
export const fontCssName = (font: FontToken): string => `--font-${slug(font.name).replace(/^font-/, '') || 'police'}`;

/** Valeur CSS `font-family` : famille entre guillemets puis repli générique. */
export const fontCssValue = (font: Pick<FontToken, 'family' | 'fallback'>): string =>
  `${JSON.stringify(font.family)}, ${font.fallback ?? 'sans-serif'}`;

/** Police déclarée qu'un style utilise : celle qu'il référence, sinon celle de même famille (cas d'un style venu de Figma). */
export function fontForStyle(tokens: Pick<DesignTokens, 'fonts'>, style: Pick<TextStyleToken, 'fontRef' | 'fontFamily'>): FontToken | undefined {
  const fonts = tokens.fonts ?? [];
  return fonts.find(f => f.id === style.fontRef) ?? fonts.find(f => f.family.toLowerCase() === style.fontFamily.toLowerCase());
}

/** Famille réellement utilisée par un style : celle de sa police déclarée, sinon sa propre famille. */
export const effectiveFamily = (tokens: Pick<DesignTokens, 'fonts'>, style: Pick<TextStyleToken, 'fontRef' | 'fontFamily'>): string =>
  fontForStyle(tokens, style)?.family ?? style.fontFamily;

/** Nom libre pour un nouveau rôle de police : font-type-1, font-type-2… */
export function nextFontName(fonts: FontToken[] = []): string {
  for (let n = 1; ; n++) if (!fonts.some(f => f.name === `font-type-${n}`)) return `font-type-${n}`;
}

/**
 * Ancien format (une entrée par source : `{ id, family, kind, … }`) → polices déclarées regroupées par famille,
 * nommées d'après la famille. Les entrées déjà au nouveau format passent telles quelles.
 */
export function migrateFonts(tokens: DesignTokens): DesignTokens {
  if (!tokens.fonts) return tokens;
  const current: FontToken[] = [];
  const legacy = new Map<string, FontToken>();
  for (const entry of tokens.fonts as unknown as Record<string, unknown>[]) {
    if (Array.isArray(entry.sources)) {
      current.push(entry as unknown as FontToken);
      continue;
    }
    const family = String(entry.family ?? '');
    const group = legacy.get(family) ?? { id: String(entry.id), name: family, family, sources: [] };
    group.sources.push(entry.kind === 'google'
      ? { kind: 'google', url: entry.url as string | undefined }
      : { kind: 'file', filename: String(entry.filename), weight: (entry.weight as number | 'variable') ?? 400, italic: entry.italic === true });
    legacy.set(family, group);
  }
  return { ...tokens, fonts: [...current, ...legacy.values()] };
}
