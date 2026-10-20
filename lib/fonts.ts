import { TokenFont } from './types';

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
export const fontFileWeight = (font: Extract<TokenFont, { kind: 'file' }>): string =>
  font.weight === 'variable' ? '100 900' : String(font.weight);
